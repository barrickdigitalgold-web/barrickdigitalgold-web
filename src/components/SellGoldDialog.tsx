import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sendChatNotification } from "@/lib/chatNotifications";

interface SellGoldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalGold: number;
  onSuccess: () => void;
}

interface MatureGoldPurchase {
  id: string;
  gold_amount_grams: number;
  price_per_gram: number;
  created_at: string;
  maturity_date: string;
}

export const SellGoldDialog = ({ open, onOpenChange, totalGold, onSuccess }: SellGoldDialogProps) => {
  const [grams, setGrams] = useState("");
  const [loading, setLoading] = useState(false);
  const [minimumSellGrams, setMinimumSellGrams] = useState<number>(0);
  const [sellPricePerGram, setSellPricePerGram] = useState<number>(0);
  const [maturePurchases, setMaturePurchases] = useState<MatureGoldPurchase[]>([]);
  const [matureGoldAmount, setMatureGoldAmount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchGoldSettings();
      fetchMatureGold();
    }
  }, [open]);

  const fetchGoldSettings = async () => {
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

      // Fetch country-specific sell price
      const { data: countryPrice, error: priceError } = await supabase
        .from("country_gold_prices")
        .select("sell_price_per_gram")
        .eq("country", profile.country)
        .eq("is_active", true)
        .single();

      if (priceError) {
        console.error("Error fetching country gold price:", priceError);
        return;
      }

      // Fetch general settings for minimum sell amount
      const { data: settings, error: settingsError } = await supabase
        .from("gold_settings")
        .select("minimum_sell_grams")
        .single();

      if (settingsError) {
        console.error("Error fetching gold settings:", settingsError);
        return;
      }

      setMinimumSellGrams(Number(settings.minimum_sell_grams));
      setSellPricePerGram(Number(countryPrice.sell_price_per_gram));
    } catch (error) {
      console.error("Error in fetchGoldSettings:", error);
    }
  };

  const fetchMatureGold = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch mature gold purchases (maturity_date <= now)
    const { data: purchases, error: purchasesError } = await supabase
      .from("gold_purchases")
      .select("*")
      .eq("user_id", user.id)
      .lte("maturity_date", new Date().toISOString())
      .order("created_at", { ascending: true });

    if (purchasesError) {
      console.error("Error fetching mature gold:", purchasesError);
      return;
    }

    // Fetch total gold sold
    const { data: sales, error: salesError } = await supabase
      .from("gold_sales")
      .select("gold_amount_grams")
      .eq("user_id", user.id);

    if (salesError) {
      console.error("Error fetching gold sales:", salesError);
      return;
    }

    // Calculate total mature gold purchased
    const totalMaturePurchased = (purchases || []).reduce((sum, purchase) => sum + Number(purchase.gold_amount_grams), 0);
    
    // Calculate total gold sold
    const totalSold = (sales || []).reduce((sum, sale) => sum + Number(sale.gold_amount_grams), 0);
    
    // Mature gold available = mature purchased - total sold
    const availableMatureGold = Math.max(0, totalMaturePurchased - totalSold);

    setMaturePurchases(purchases || []);
    setMatureGoldAmount(availableMatureGold);
  };

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!minimumSellGrams || !sellPricePerGram) {
      toast({
        title: "Error",
        description: "Unable to load gold settings",
        variant: "destructive",
      });
      return;
    }

    const sellGrams = parseFloat(grams);
    if (isNaN(sellGrams) || sellGrams <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount of gold",
        variant: "destructive",
      });
      return;
    }

    if (sellGrams < minimumSellGrams) {
      toast({
        title: "Minimum Amount Required",
        description: `Minimum sell amount is ${minimumSellGrams} grams`,
        variant: "destructive",
      });
      return;
    }

    if (sellGrams > matureGoldAmount) {
      toast({
        title: "Insufficient Mature Gold",
        description: "You don't have enough mature gold to sell. Gold must pass its lock period before selling.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Calculate profit and allocate from mature purchases (FIFO)
      let remainingToSell = sellGrams;
      let totalProfit = 0;
      const purchasesToUpdate: string[] = [];

      for (const purchase of maturePurchases) {
        if (remainingToSell <= 0) break;
        
        const purchaseAmount = Number(purchase.gold_amount_grams);
        const amountToSellFromThis = Math.min(remainingToSell, purchaseAmount);
        
        // Calculate profit (current price - purchase price) * amount
        const profit = (sellPricePerGram - Number(purchase.price_per_gram)) * amountToSellFromThis;
        totalProfit += profit;
        
        purchasesToUpdate.push(purchase.id);
        remainingToSell -= amountToSellFromThis;
      }

      const totalAmount = sellGrams * sellPricePerGram;

      // Create gold sale record
      const { error: saleError } = await supabase
        .from("gold_sales")
        .insert({
          user_id: user.id,
          gold_amount_grams: sellGrams,
          price_per_gram: sellPricePerGram,
          total_amount: totalAmount,
          profit_amount: totalProfit,
        });

      if (saleError) throw saleError;

      // Update withdrawable balance instead of regular balance
      const { data: walletData, error: walletFetchError } = await supabase
        .from("wallet_balances")
        .select("withdrawable_balance")
        .eq("user_id", user.id)
        .single();

      if (walletFetchError) throw walletFetchError;

      const newWithdrawableBalance = Number(walletData.withdrawable_balance) + totalAmount;

      const { error: walletUpdateError } = await supabase
        .from("wallet_balances")
        .update({ withdrawable_balance: newWithdrawableBalance })
        .eq("user_id", user.id);

      if (walletUpdateError) throw walletUpdateError;

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
              subject: "Gold Sale Confirmation",
              type: "gold_sale",
              status: "completed",
              amount: totalAmount,
              username: profile.username,
              goldAmount: sellGrams,
            },
          });
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }

      const profitMessage = totalProfit > 0 
        ? ` with a profit of ${totalProfit.toFixed(2)}` 
        : totalProfit < 0 
        ? ` with a loss of ${Math.abs(totalProfit).toFixed(2)}`
        : '';

      // Send chat notification
      await sendChatNotification(
        user.id,
        `Gold Sale: You sold ${sellGrams}g of gold for ${totalAmount.toFixed(2)}${profitMessage}`
      );

      toast({
        title: "Success",
        description: `Successfully sold ${sellGrams}g of gold for ${totalAmount.toFixed(2)}${profitMessage}`,
      });

      setGrams("");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error selling gold:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const estimatedAmount = parseFloat(grams) * sellPricePerGram || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sell Gold</DialogTitle>
          <DialogDescription>
            Sell your gold holdings at current market price
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Price</CardTitle>
              <CardDescription>{sellPricePerGram.toFixed(2)} per gram</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Total Gold Holdings: {Math.max(0, totalGold).toFixed(4)}g
              </p>
              <p className="text-sm font-semibold text-primary">
                Mature Gold Available: {matureGoldAmount.toFixed(4)}g
              </p>
              <p className="text-sm text-muted-foreground">
                Locked Gold: {Math.max(0, totalGold - matureGoldAmount).toFixed(4)}g
              </p>
              <p className="text-sm text-muted-foreground">
                Minimum Sell Amount: {minimumSellGrams.toFixed(2)}g
              </p>
            </CardContent>
          </Card>

          <form onSubmit={handleSell} className="space-y-4">
            <div>
              <Label htmlFor="grams">Gold Amount (grams)</Label>
              <Input
                id="grams"
                type="number"
                step="0.01"
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
                placeholder="Enter amount in grams"
                required
              />
            </div>

            {estimatedAmount > 0 && (
              <Card className="bg-muted">
                <CardContent className="pt-6">
                  <p className="text-sm font-medium">Estimated Amount:</p>
                  <p className="text-2xl font-bold text-primary">{estimatedAmount.toFixed(2)}</p>
                </CardContent>
              </Card>
            )}

            <Button 
              type="submit" 
              disabled={loading || matureGoldAmount <= 0 || parseFloat(grams || "0") > matureGoldAmount || parseFloat(grams || "0") < minimumSellGrams} 
              className="w-full"
            >
              {loading ? "Processing..." : matureGoldAmount <= 0 ? "No Mature Gold Available" : "Sell Gold"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
