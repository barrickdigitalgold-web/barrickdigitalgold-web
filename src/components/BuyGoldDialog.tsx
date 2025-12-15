import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KYCPromptDialog } from "./KYCPromptDialog";
import { UserProfileDialog } from "./UserProfileDialog";
import { sendChatNotification } from "@/lib/chatNotifications";

interface BuyGoldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletBalance: number;
  onSuccess: () => void;
}

export const BuyGoldDialog = ({ open, onOpenChange, walletBalance, onSuccess }: BuyGoldDialogProps) => {
  const [goldAmount, setGoldAmount] = useState("");
  const [lockPeriod, setLockPeriod] = useState<string>("30");
  const [loading, setLoading] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [platformFee, setPlatformFee] = useState<number>(0);
  const [lockPeriods, setLockPeriods] = useState<Array<{ period_days: number; profit_percentage: number }>>([]);
  const [kycStatus, setKycStatus] = useState<string>("pending");
  const [showKycPrompt, setShowKycPrompt] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [pendingPurchase, setPendingPurchase] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchCurrentPrice();
      fetchLockPeriods();
      checkKYCStatus();
      fetchUserId();
    }
  }, [open]);

  const fetchUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  // Re-check KYC status when user profile dialog closes
  useEffect(() => {
    if (!showUserProfile && pendingPurchase) {
      checkKYCStatus();
    }
  }, [showUserProfile]);

  const fetchCurrentPrice = async () => {
    try {
      // Get user's country
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("country")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      // Fetch country-specific buy price
      const { data: countryPrice, error: priceError } = await supabase
        .from("country_gold_prices")
        .select("buy_price_per_gram")
        .eq("country", profile.country)
        .eq("is_active", true)
        .single();

      if (priceError) {
        console.error("Error fetching country gold price:", priceError);
        return;
      }

      // Fetch platform fee
      const { data: settings, error: settingsError } = await supabase
        .from("gold_settings")
        .select("buy_platform_fee_percentage")
        .single();

      if (settingsError) {
        console.error("Error fetching gold settings:", settingsError);
        return;
      }

      setCurrentPrice(Number(countryPrice.buy_price_per_gram));
      setPlatformFee(Number(settings.buy_platform_fee_percentage));
    } catch (error) {
      console.error("Error in fetchCurrentPrice:", error);
    }
  };

  const fetchLockPeriods = async () => {
    const { data, error } = await supabase
      .from("lock_periods")
      .select("period_days, profit_percentage")
      .eq("is_active", true)
      .order("period_days", { ascending: true });

    if (error) {
      console.error("Error fetching lock periods:", error);
      return;
    }

    setLockPeriods(data || []);
  };

  const checkKYCStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("kyc_status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      const newStatus = data?.kyc_status || "pending";
      setKycStatus(newStatus);
      
      // If KYC is now submitted/verified and we have a pending purchase, proceed
      if (pendingPurchase && (newStatus === 'submitted' || newStatus === 'verified')) {
        setPendingPurchase(false);
        // Auto-proceed with purchase after a short delay
        setTimeout(() => {
          toast({
            title: "KYC Verified!",
            description: "You can now proceed with your gold purchase",
          });
        }, 500);
      }
    } catch (error) {
      console.error("Error checking KYC status:", error);
    }
  };

  const baseCost = goldAmount ? parseFloat(goldAmount) * currentPrice : 0;
  const feeAmount = baseCost * (platformFee / 100);
  const totalCost = baseCost + feeAmount;

  const handlePurchase = async () => {
    // Check KYC status first - must be submitted or verified
    if (kycStatus !== 'submitted' && kycStatus !== 'verified') {
      setShowKycPrompt(true);
      return;
    }

    if (!goldAmount || parseFloat(goldAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid gold amount",
        variant: "destructive",
      });
      return;
    }

    if (totalCost > walletBalance) {
      toast({
        title: "Insufficient balance",
        description: "Please top up your wallet first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Calculate maturity date
      const maturityDate = new Date();
      maturityDate.setDate(maturityDate.getDate() + parseInt(lockPeriod));

      // Create gold purchase record
      const { error: purchaseError } = await supabase
        .from("gold_purchases")
        .insert({
          user_id: user.id,
          gold_amount_grams: parseFloat(goldAmount),
          price_per_gram: currentPrice,
          total_cost: totalCost,
          lock_period_days: parseInt(lockPeriod),
          maturity_date: maturityDate.toISOString(),
          status: 'locked',
        });

      if (purchaseError) throw purchaseError;

      // Update wallet balance
      const newBalance = walletBalance - totalCost;
      
      // Prevent negative balance
      if (newBalance < 0) {
        throw new Error("Insufficient wallet balance");
      }

      const { error: walletError } = await supabase
        .from("wallet_balances")
        .update({ balance: newBalance })
        .eq("user_id", user.id);

      if (walletError) throw walletError;

      // Send email notification
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, email")
          .eq("user_id", user.id)
          .single();

        if (profile?.email) {
          await supabase.functions.invoke("send-notification-email", {
            body: {
              to: profile.email,
              subject: "Gold Purchase Confirmation",
              type: "gold_purchase",
              status: "completed",
              amount: totalCost,
              username: profile.username,
              goldAmount: parseFloat(goldAmount),
              lockPeriod: parseInt(lockPeriod),
            },
          });
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }

      // Send chat notification
      await sendChatNotification(
        user.id,
        `Gold Purchase: You purchased ${goldAmount}g of gold for ${totalCost.toLocaleString()} (locked for ${lockPeriod} days)`
      );

      toast({
        title: "Success!",
        description: `You've successfully purchased ${goldAmount}g of gold (locked for ${lockPeriod} days)`,
      });

      onSuccess();
      setGoldAmount("");
      setLockPeriod("30");
      onOpenChange(false);
    } catch (error) {
      console.error("Error purchasing gold:", error);
      toast({
        title: "Error",
        description: "Failed to purchase gold",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKYCComplete = async () => {
    setShowKycPrompt(false);
    setPendingPurchase(true);
    setShowUserProfile(true);
  };

  const handleUserProfileClose = () => {
    setShowUserProfile(false);
  };

  const handleKYCSkip = () => {
    setShowKycPrompt(false);
    toast({
      title: "KYC Required",
      description: "Please complete KYC verification to purchase gold",
      variant: "destructive",
    });
    onOpenChange(false);
  };

  return (
    <>
      <KYCPromptDialog
        open={showKycPrompt}
        onOpenChange={setShowKycPrompt}
        onComplete={handleKYCComplete}
        onSkip={handleKYCSkip}
      />
      
      <UserProfileDialog
        open={showUserProfile}
        onOpenChange={handleUserProfileClose}
        userId={currentUserId}
      />
      
      <Dialog open={open && !showKycPrompt && !showUserProfile} onOpenChange={onOpenChange}>
        <DialogContent>
        <DialogHeader>
          <DialogTitle>Buy Gold</DialogTitle>
          <DialogDescription>
            Current price: {currentPrice.toLocaleString()} per gram
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="gold-amount">Gold Amount (grams)</Label>
            <Input
              id="gold-amount"
              type="number"
              placeholder="Enter amount in grams"
              value={goldAmount}
              onChange={(e) => setGoldAmount(e.target.value)}
              min="0.001"
              step="0.001"
            />
          </div>

          <div>
            <Label htmlFor="lock-period">Lock Period</Label>
            <Select value={lockPeriod} onValueChange={setLockPeriod}>
              <SelectTrigger id="lock-period">
                <SelectValue placeholder="Select lock period" />
              </SelectTrigger>
              <SelectContent>
                {lockPeriods.map((lp) => (
                  <SelectItem key={lp.period_days} value={lp.period_days.toString()}>
                    {lp.period_days} Days ({lp.profit_percentage}% profit)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {goldAmount && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Gold Amount:</span>
                <span className="font-semibold">{goldAmount}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Price per gram:</span>
                <span className="font-semibold">{currentPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Base Cost:</span>
                <span className="font-semibold">{baseCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Platform Fee ({platformFee}%):</span>
                <span className="font-semibold">{feeAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Lock Period:</span>
                <span className="font-semibold">
                  {lockPeriod} Days
                  {lockPeriods.find(lp => lp.period_days === parseInt(lockPeriod)) && 
                    ` (${lockPeriods.find(lp => lp.period_days === parseInt(lockPeriod))?.profit_percentage}% profit)`
                  }
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-semibold">Total Cost:</span>
                <span className="font-bold text-primary">{totalCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Wallet Balance:</span>
                <span className={walletBalance >= totalCost ? "text-success" : "text-destructive"}>
                  {walletBalance.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <Button 
            onClick={handlePurchase} 
            className="w-full"
            disabled={loading || !goldAmount || totalCost > walletBalance}
          >
            {loading ? "Processing..." : "Purchase Gold"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
