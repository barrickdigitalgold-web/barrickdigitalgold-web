import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown, Clock } from "lucide-react";

interface Transaction {
  id: string;
  type: 'topup' | 'gold_buy' | 'gold_sell' | 'investment' | 'withdrawal';
  amount: number;
  status?: string;
  created_at: string;
  description: string;
  gold_amount?: number;
  profit?: number;
  account_number?: string;
  admin_message?: string;
}

interface FilteredTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'topup' | 'gold_buy' | 'gold_sell' | 'investment' | 'withdrawal';
  title: string;
}

export const FilteredTransactionDialog = ({ 
  open, 
  onOpenChange, 
  type,
  title 
}: FilteredTransactionDialogProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchTransactions();
    }
  }, [open, type]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let transactions: Transaction[] = [];

      switch (type) {
        case 'topup':
          const { data: topups } = await supabase
            .from("transactions")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
          
          transactions = (topups || []).map(t => ({
            id: t.id,
            type: 'topup' as const,
            amount: Number(t.amount),
            status: t.status,
            created_at: t.created_at,
            description: `Wallet Top-up`,
          }));
          break;

        case 'gold_buy':
          const { data: goldPurchases } = await supabase
            .from("gold_purchases")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
          
          transactions = (goldPurchases || []).map(gp => ({
            id: gp.id,
            type: 'gold_buy' as const,
            amount: Number(gp.total_cost),
            created_at: gp.created_at,
            description: `Bought ${Number(gp.gold_amount_grams).toFixed(4)}g gold`,
            gold_amount: Number(gp.gold_amount_grams),
            status: gp.status,
          }));
          break;

        case 'gold_sell':
          const { data: goldSales } = await supabase
            .from("gold_sales")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
          
          transactions = (goldSales || []).map(gs => ({
            id: gs.id,
            type: 'gold_sell' as const,
            amount: Number(gs.total_amount),
            created_at: gs.created_at,
            description: `Sold ${Number(gs.gold_amount_grams).toFixed(4)}g gold`,
            gold_amount: Number(gs.gold_amount_grams),
            profit: Number(gs.profit_amount),
          }));
          break;

        case 'investment':
          const { data: investments } = await supabase
            .from("user_investments")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
          
          transactions = (investments || []).map(inv => ({
            id: inv.id,
            type: 'investment' as const,
            amount: Number(inv.amount_invested),
            status: inv.status,
            created_at: inv.created_at,
            description: `Investment`,
          }));
          break;

        case 'withdrawal':
          const { data: withdrawals } = await supabase
            .from("withdrawal_requests")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
          
          transactions = (withdrawals || []).map(w => ({
            id: w.id,
            type: 'withdrawal' as const,
            amount: Number(w.amount),
            status: w.status,
            created_at: w.created_at,
            description: `Withdrawal Request`,
            account_number: w.account_number || undefined,
            admin_message: w.admin_message || undefined,
          }));
          break;
      }

      setTransactions(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast({
        title: "Error",
        description: "Failed to load transaction history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'topup':
        return <ArrowDownCircle className="w-5 h-5 text-success" />;
      case 'gold_buy':
        return <TrendingUp className="w-5 h-5 text-primary" />;
      case 'gold_sell':
        return <TrendingDown className="w-5 h-5 text-warning" />;
      case 'investment':
        return <ArrowUpCircle className="w-5 h-5 text-primary" />;
      case 'withdrawal':
        return <ArrowUpCircle className="w-5 h-5 text-warning" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getAmountColor = (type: string) => {
    switch (type) {
      case 'topup':
      case 'gold_sell':
        return 'text-success';
      case 'gold_buy':
      case 'investment':
        return 'text-destructive';
      default:
        return 'text-foreground';
    }
  };

  const getAmountPrefix = (type: string) => {
    switch (type) {
      case 'topup':
      case 'gold_sell':
        return '+';
      case 'gold_buy':
      case 'investment':
        return '-';
      default:
        return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
      case "mature":
      case "active":
        return "bg-success/10 text-success border-success/20";
      case "pending":
      case "locked":
        return "bg-warning/10 text-warning border-warning/20";
      case "rejected":
      case "completed":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            View your {title.toLowerCase()} history
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-center text-muted-foreground">Loading transactions...</p>
        ) : (
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No transactions found</p>
            ) : (
              transactions.map((transaction) => (
                <Card key={transaction.id} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-muted">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div>
                          <p className="font-semibold">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {new Date(transaction.created_at).toLocaleString()}
                          </p>
                          {transaction.profit !== undefined && transaction.profit !== 0 && (
                            <p className={`text-xs font-semibold ${transaction.profit > 0 ? 'text-success' : 'text-destructive'}`}>
                              Profit: {transaction.profit > 0 ? '+' : ''}{transaction.profit.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-lg ${getAmountColor(transaction.type)}`}>
                          {getAmountPrefix(transaction.type)}{transaction.amount.toLocaleString()}
                        </p>
                        {transaction.status && (
                          <Badge className={getStatusColor(transaction.status)}>
                            {transaction.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
