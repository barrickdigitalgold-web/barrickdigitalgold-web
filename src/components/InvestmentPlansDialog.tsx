import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp } from "lucide-react";
import { sendChatNotification } from "@/lib/chatNotifications";

interface InvestmentPlan {
  id: string;
  plan_name: string;
  description: string;
  price: number;
  duration_days: number;
  returns_percentage: number;
}

interface InvestmentPlansDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletBalance: number;
  onSuccess: () => void;
}

export const InvestmentPlansDialog = ({ open, onOpenChange, walletBalance, onSuccess }: InvestmentPlansDialogProps) => {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchPlans();
    }
  }, [open]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("investment_plans")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast({
        title: "Error",
        description: "Failed to load investment plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (plan: InvestmentPlan) => {
    if (plan.price > walletBalance) {
      toast({
        title: "Insufficient balance",
        description: "Please top up your wallet first",
        variant: "destructive",
      });
      return;
    }

    setPurchasing(plan.id);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.duration_days);

      // Create investment record
      const { error: investmentError } = await supabase
        .from("user_investments")
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          amount_invested: plan.price,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          status: "active",
        });

      if (investmentError) throw investmentError;

      // Update wallet balance
      const newBalance = walletBalance - plan.price;
      
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

        const expectedReturns = (plan.price * plan.returns_percentage) / 100;
        const totalReturns = plan.price + expectedReturns;

        if (profile?.email) {
          await supabase.functions.invoke("send-notification-email", {
            body: {
              to: profile.email,
              subject: "Investment Plan Activated",
              type: "investment",
              status: "active",
              amount: plan.price,
              username: profile.username,
              planName: plan.plan_name,
              lockPeriod: plan.duration_days,
              totalReturns: totalReturns,
            },
          });
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }

      // Send chat notification
      await sendChatNotification(
        user.id,
        `Investment Plan Activated: You invested ${plan.price.toLocaleString()} in ${plan.plan_name} for ${plan.duration_days} days with ${plan.returns_percentage}% returns.`
      );

      toast({
        title: "Success!",
        description: `You've successfully invested in ${plan.plan_name}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error purchasing plan:", error);
      toast({
        title: "Error",
        description: "Failed to purchase investment plan",
        variant: "destructive",
      });
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Investment Plans</DialogTitle>
          <DialogDescription>
            Choose an investment plan that suits your goals
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-center text-muted-foreground">Loading plans...</p>
        ) : (
          <div className="space-y-4">
            {plans.length === 0 ? (
              <p className="text-center text-muted-foreground">No investment plans available</p>
            ) : (
              plans.map((plan) => {
                const expectedReturns = (plan.price * plan.returns_percentage) / 100;
                const totalReturns = plan.price + expectedReturns;

                return (
                  <Card key={plan.id} className="shadow-elegant">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-success" />
                        {plan.plan_name}
                      </CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-2 bg-muted rounded">
                          <p className="text-muted-foreground">Investment</p>
                          <p className="font-bold text-lg">{plan.price.toLocaleString()}</p>
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <p className="text-muted-foreground">Duration</p>
                          <p className="font-bold text-lg">{plan.duration_days} days</p>
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <p className="text-muted-foreground">Returns</p>
                          <p className="font-bold text-lg text-success">{plan.returns_percentage}%</p>
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <p className="text-muted-foreground">Total Returns</p>
                          <p className="font-bold text-lg text-primary">{totalReturns.toLocaleString()}</p>
                        </div>
                      </div>

                      <Button
                        onClick={() => handlePurchase(plan)}
                        disabled={purchasing === plan.id || plan.price > walletBalance}
                        className="w-full"
                      >
                        {purchasing === plan.id
                          ? "Processing..."
                          : plan.price > walletBalance
                          ? "Insufficient Balance"
                          : "Invest Now"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
