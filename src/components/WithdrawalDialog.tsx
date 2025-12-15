import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { sendChatNotification } from "@/lib/chatNotifications";

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  admin_message: string | null;
  created_at: string;
}

interface WithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  withdrawableBalance: number;
  onSuccess: () => void;
  isAccountFrozen?: boolean;
  accountStatus?: string;
}

export const WithdrawalDialog = ({ open, onOpenChange, withdrawableBalance, onSuccess, isAccountFrozen = false, accountStatus = 'active' }: WithdrawalDialogProps) => {
  const [withdrawalType, setWithdrawalType] = useState<"wallet" | "bank" | null>(null);
  const [amount, setAmount] = useState("");
  const [accountDetails, setAccountDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [minimumWithdrawal, setMinimumWithdrawal] = useState<number>(50);
  const { toast } = useToast();

  const getCustomerStatusBadge = () => {
    switch (accountStatus) {
      case 'frozen':
        return <Badge className="bg-blue-500 text-white">Frozen</Badge>;
      case 'deactivated':
        return <Badge variant="destructive">Deactivated</Badge>;
      case 'unfrozen':
        return <Badge className="bg-yellow-500 text-white">Unfrozen</Badge>;
      default:
        return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
    }
  };

  const fetchRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching withdrawal requests:", error);
      return;
    }

    setRequests(data || []);
  };

  const handleAddToWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount",
        variant: "destructive",
      });
      return;
    }

    if (withdrawalAmount > withdrawableBalance || withdrawableBalance < withdrawalAmount) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough withdrawable balance",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get current wallet balance
      const { data: walletData } = await supabase
        .from("wallet_balances")
        .select("balance, withdrawable_balance")
        .eq("user_id", user.id)
        .single();

      if (!walletData) throw new Error("Wallet not found");

      const newWithdrawableBalance = Number(walletData.withdrawable_balance) - withdrawalAmount;
      
      // Prevent negative balance
      if (newWithdrawableBalance < 0) {
        throw new Error("Insufficient withdrawable balance");
      }

      // Update wallet balances
      const { error } = await supabase
        .from("wallet_balances")
        .update({
          balance: Number(walletData.balance) + withdrawalAmount,
          withdrawable_balance: newWithdrawableBalance,
        })
        .eq("user_id", user.id);

      if (error) throw error;

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
              subject: "Wallet Transfer Confirmation",
              type: "wallet_transfer",
              status: "completed",
              amount: withdrawalAmount,
              username: profile.username,
            },
          });
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }

      // Send chat notification
      await sendChatNotification(
        user.id,
        `Wallet Transfer: You transferred ${withdrawalAmount.toFixed(2)} from withdrawable balance to your wallet.`
      );

      toast({
        title: "Success",
        description: `${withdrawalAmount.toFixed(2)} has been added to your wallet`,
      });

      setAmount("");
      setWithdrawalType(null);
      onSuccess();
    } catch (error: any) {
      console.error("Error adding to wallet:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBankWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount",
        variant: "destructive",
      });
      return;
    }

    if (withdrawalAmount < minimumWithdrawal) {
      toast({
        title: "Below Minimum Amount",
        description: `Minimum withdrawal amount is ${minimumWithdrawal.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    if (!accountDetails || accountDetails.trim() === "") {
      toast({
        title: "Account Details Required",
        description: "Please enter your bank account details",
        variant: "destructive",
      });
      return;
    }

    if (withdrawalAmount > withdrawableBalance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough withdrawable balance",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get current wallet balance
      const { data: walletData } = await supabase
        .from("wallet_balances")
        .select("withdrawable_balance")
        .eq("user_id", user.id)
        .single();

      if (!walletData) throw new Error("Wallet not found");

      const newWithdrawableBalance = Number(walletData.withdrawable_balance) - withdrawalAmount;
      
      // Prevent negative balance
      if (newWithdrawableBalance < 0) {
        throw new Error("Insufficient withdrawable balance");
      }

      // Reduce withdrawable balance immediately
      const { error: updateError } = await supabase
        .from("wallet_balances")
        .update({
          withdrawable_balance: newWithdrawableBalance,
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      // Create withdrawal request
      const { error } = await supabase
        .from("withdrawal_requests")
        .insert({
          user_id: user.id,
          amount: withdrawalAmount,
          account_number: accountDetails,
          status: "pending",
        });

      if (error) throw error;

      // Send email notification for withdrawal request
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
              subject: "Withdrawal Request Submitted",
              type: "withdrawal",
              status: "pending",
              amount: withdrawalAmount,
              username: profile.username,
              message: "Your withdrawal request has been submitted and is pending review.",
            },
          });
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }

      // Send chat notification
      await sendChatNotification(
        user.id,
        `Bank Withdrawal Request: You submitted a withdrawal request of ${withdrawalAmount.toFixed(2)} to your bank account. Pending admin approval.`
      );

      toast({
        title: "Withdrawal Request Received",
        description: "Your withdrawal request has been received and will be processed within 10 minutes to 12 hours.",
      });

      setAmount("");
      setAccountDetails("");
      setWithdrawalType(null);
      onSuccess();
      fetchRequests();
    } catch (error: any) {
      console.error("Error submitting withdrawal:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchRequests();
      // Fetch minimum withdrawal amount
      supabase
        .from("gold_settings")
        .select("minimum_withdrawal_amount")
        .single()
        .then(({ data }) => {
          if (data) {
            setMinimumWithdrawal(Number(data.minimum_withdrawal_amount));
          }
        });
    }
  }, [open]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500";
      case "declined":
        return "bg-red-500";
      default:
        return "bg-yellow-500";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) {
        setWithdrawalType(null);
        setAmount("");
        setAccountDetails("");
      }
    }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Withdrawal Options</DialogTitle>
          <DialogDescription>
            Choose how you want to withdraw your funds
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Withdrawable Balance</CardTitle>
                  <CardDescription>{withdrawableBalance.toFixed(2)}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Customer Status:</span>
                  {getCustomerStatusBadge()}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAccountFrozen && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md mb-4">
                  <p className="text-sm text-destructive font-medium">
                    Your account is frozen. Add to Wallet and Bank Withdrawal features are disabled. Please contact Customer Service.
                  </p>
                </div>
              )}
              {!withdrawalType ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    variant="default" 
                    onClick={() => setWithdrawalType("wallet")}
                    className="h-auto flex flex-col items-start p-4"
                    disabled={isAccountFrozen}
                  >
                    <span className="font-semibold mb-1">Add to Wallet</span>
                    <span className="text-xs opacity-80">Instant transfer to your wallet balance</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setWithdrawalType("bank")}
                    className="h-auto flex flex-col items-start p-4 w-full"
                    disabled={isAccountFrozen}
                  >
                    <span className="font-semibold mb-1">Withdraw to Bank</span>
                    <span className="text-xs opacity-80 whitespace-normal break-words text-left">Transfer to your bank account (10 mins - 12 hours)</span>
                  </Button>
                </div>
              ) : withdrawalType === "wallet" ? (
                <form onSubmit={handleAddToWallet} className="space-y-4">
                  <div>
                    <Label htmlFor="wallet-amount">Amount to Add to Wallet</Label>
                    <Input
                      id="wallet-amount"
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading} className="flex-1">
                      {loading ? "Processing..." : "Add to Wallet"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setWithdrawalType(null);
                        setAmount("");
                      }}
                    >
                      Back
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleBankWithdrawal} className="space-y-4">
                  <div>
                    <Label htmlFor="bank-amount">Withdrawal Amount</Label>
                    <Input
                      id="bank-amount"
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      min={minimumWithdrawal}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Minimum withdrawal amount: {minimumWithdrawal.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="accountDetails">Bank Account Details</Label>
                    <Textarea
                      id="accountDetails"
                      value={accountDetails}
                      onChange={(e) => setAccountDetails(e.target.value)}
                      placeholder="Enter your bank account details"
                      required
                      className="min-h-[100px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Please provide complete bank account information
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading} className="flex-1">
                      {loading ? "Submitting..." : "Submit Withdrawal Request"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setWithdrawalType(null);
                        setAmount("");
                        setAccountDetails("");
                      }}
                    >
                      Back
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h3 className="font-semibold">Bank Withdrawal History</h3>
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bank withdrawal requests found</p>
            ) : (
              requests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">{parseFloat(request.amount.toString()).toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(request.created_at), "PPpp")}
                        </p>
                      </div>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                    {request.admin_message && (
                      <div className="mt-2 p-2 bg-muted rounded-md">
                        <p className="text-sm font-medium">Admin Message:</p>
                        <p className="text-sm text-muted-foreground">{request.admin_message}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
