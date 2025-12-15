import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Calendar, DollarSign } from "lucide-react";
import { sendChatNotification } from "@/lib/chatNotifications";

interface UserInvestment {
  id: string;
  amount_invested: number;
  start_date: string;
  end_date: string;
  status: string;
  plan_id: string;
  investment_plans: {
    plan_name: string;
    returns_percentage: number;
    duration_days: number;
  };
}

interface ActiveInvestmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  showOnlyMatured?: boolean;
}

export const ActiveInvestmentsDialog = ({ open, onOpenChange, onSuccess, showOnlyMatured = false }: ActiveInvestmentsDialogProps) => {
  const [investments, setInvestments] = useState<UserInvestment[]>([]);
  const [loading, setLoading] = useState(false);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchInvestments();
    }
  }, [open]);

  const fetchInvestments = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_investments")
        .select(`
          *,
          investment_plans (
            plan_name,
            returns_percentage,
            duration_days
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvestments(data || []);
    } catch (error) {
      console.error("Error fetching investments:", error);
      toast({
        title: "Error",
        description: "Failed to load investments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (investment: UserInvestment) => {
    setWithdrawing(investment.id);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const totalReturn = investment.amount_invested + 
        (investment.amount_invested * investment.investment_plans.returns_percentage / 100);

      // Update investment status
      const { error: investmentError } = await supabase
        .from("user_investments")
        .update({ status: "completed" })
        .eq("id", investment.id);

      if (investmentError) throw investmentError;

      // Get current withdrawable balance
      const { data: walletData, error: walletFetchError } = await supabase
        .from("wallet_balances")
        .select("withdrawable_balance")
        .eq("user_id", user.id)
        .single();

      if (walletFetchError) throw walletFetchError;

      // Update withdrawable balance (mature investments go to withdrawable)
      const { error: walletError } = await supabase
        .from("wallet_balances")
        .update({ withdrawable_balance: (walletData?.withdrawable_balance || 0) + totalReturn })
        .eq("user_id", user.id);

      if (walletError) throw walletError;

      // Send chat notification
      await sendChatNotification(
        user.id,
        `Investment Withdrawal: You withdrew ${totalReturn.toLocaleString()} from your matured ${investment.investment_plans.plan_name} investment to withdrawable wallet.`
      );

      toast({
        title: "Success!",
        description: `${totalReturn.toLocaleString()} has been added to your withdrawable wallet`,
      });

      onSuccess();
      fetchInvestments();
    } catch (error) {
      console.error("Error withdrawing investment:", error);
      toast({
        title: "Error",
        description: "Failed to withdraw investment",
        variant: "destructive",
      });
    } finally {
      setWithdrawing(null);
    }
  };

  const calculateDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateProfitToDate = (investment: UserInvestment) => {
    const start = new Date(investment.start_date);
    const end = new Date(investment.end_date);
    const now = new Date();
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsedDuration = Math.min(now.getTime() - start.getTime(), totalDuration);
    const progressRatio = elapsedDuration / totalDuration;
    
    const totalProfit = investment.amount_invested * investment.investment_plans.returns_percentage / 100;
    return totalProfit * progressRatio;
  };

  const isMatured = (endDate: string) => {
    return new Date(endDate) <= new Date();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{showOnlyMatured ? 'Matured Investments' : 'Active Investments'}</DialogTitle>
          <DialogDescription>
            {showOnlyMatured ? 'Investments ready for withdrawal' : 'Track your investment plans and maturity status'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-center text-muted-foreground">Loading investments...</p>
        ) : (
          <div className="space-y-4">
            {(() => {
              const filteredInvestments = showOnlyMatured 
                ? investments.filter(inv => new Date(inv.end_date) <= new Date())
                : investments;
              
              if (filteredInvestments.length === 0) {
                return <p className="text-center text-muted-foreground">{showOnlyMatured ? 'No matured investments' : 'No active investments'}</p>;
              }
              
              return filteredInvestments.map((investment) => {
                const daysRemaining = calculateDaysRemaining(investment.end_date);
                const profitToDate = calculateProfitToDate(investment);
                const totalReturn = investment.amount_invested + 
                  (investment.amount_invested * investment.investment_plans.returns_percentage / 100);
                const matured = isMatured(investment.end_date);

                return (
                  <Card key={investment.id} className={`shadow-elegant ${matured ? 'border-success' : ''}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-success" />
                        {investment.investment_plans.plan_name}
                      </CardTitle>
                      <CardDescription>
                        {matured ? (
                          <span className="text-success font-semibold">✓ Matured - Ready to Withdraw</span>
                        ) : (
                          <span>{daysRemaining} days remaining</span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div className="p-3 bg-muted rounded">
                          <p className="text-muted-foreground flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            Invested
                          </p>
                          <p className="font-bold text-lg">{investment.amount_invested.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-muted rounded">
                          <p className="text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Duration
                          </p>
                          <p className="font-bold text-lg">{investment.investment_plans.duration_days} days</p>
                        </div>
                        <div className="p-3 bg-muted rounded">
                          <p className="text-muted-foreground">Returns</p>
                          <p className="font-bold text-lg text-success">
                            {investment.investment_plans.returns_percentage}%
                          </p>
                        </div>
                        <div className="p-3 bg-muted rounded">
                          <p className="text-muted-foreground">Profit Till Date</p>
                          <p className="font-bold text-lg text-primary">
                            {profitToDate.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="p-3 bg-muted rounded">
                          <p className="text-muted-foreground">Total Return</p>
                          <p className="font-bold text-lg text-success">
                            {totalReturn.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-3 bg-muted rounded">
                          <p className="text-muted-foreground">Maturity Date</p>
                          <p className="font-bold text-sm">
                            {new Date(investment.end_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {matured && (
                        <Button
                          onClick={() => handleWithdraw(investment)}
                          disabled={withdrawing === investment.id}
                          className="w-full"
                          variant="default"
                        >
                          {withdrawing === investment.id
                            ? "Processing..."
                            : `Withdraw ₹${totalReturn.toLocaleString()}`}
                        </Button>
                      )}

                      {!matured && (
                        <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded">
                          <p>
                            Withdraw available in <span className="font-semibold">{daysRemaining} days</span> 
                            {" "}(after {new Date(investment.end_date).toLocaleDateString()})
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              });
            })()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
