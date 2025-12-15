import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Wallet, TrendingUp, TrendingDown, DollarSign, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Transaction {
  id: string;
  amount: number;
  status?: string;
  created_at: string;
  description: string;
  gold_amount?: number;
}

interface QuickActionHistoryProps {
  type: 'topup' | 'gold_buy' | 'gold_sell' | 'investment';
  onBuyClick?: () => void;
}

export const QuickActionHistory = ({ type, onBuyClick }: QuickActionHistoryProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, [type]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let transactions: Transaction[] = [];

      switch (type) {
        case 'topup':
          const { data: topups } = await supabase
            .from("transactions")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(3);
          
          transactions = (topups || []).map(t => ({
            id: t.id,
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
            .order("created_at", { ascending: false })
            .limit(3);
          
          transactions = (goldPurchases || []).map(gp => ({
            id: gp.id,
            amount: Number(gp.total_cost),
            created_at: gp.created_at,
            description: `${Number(gp.gold_amount_grams).toFixed(4)}g`,
            gold_amount: Number(gp.gold_amount_grams),
            status: gp.status,
          }));
          break;

        case 'gold_sell':
          const { data: goldSales } = await supabase
            .from("gold_sales")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(3);
          
          transactions = (goldSales || []).map(gs => ({
            id: gs.id,
            amount: Number(gs.total_amount),
            created_at: gs.created_at,
            description: `${Number(gs.gold_amount_grams).toFixed(4)}g`,
            gold_amount: Number(gs.gold_amount_grams),
          }));
          break;

        case 'investment':
          const { data: investments } = await supabase
            .from("user_investments")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(3);
          
          transactions = (investments || []).map(inv => ({
            id: inv.id,
            amount: Number(inv.amount_invested),
            status: inv.status,
            created_at: inv.created_at,
            description: `Investment`,
          }));
          break;
      }

      setTransactions(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getConfig = () => {
    switch (type) {
      case 'topup':
        return {
          title: 'Top Up Wallet',
          icon: <Wallet className="h-4 w-4" />,
          buttonAction: () => {
            const event = new CustomEvent('openTopUp');
            window.dispatchEvent(event);
          },
        };
      case 'gold_buy':
        return {
          title: 'Buy Gold',
          icon: <TrendingUp className="h-4 w-4" />,
          buttonAction: onBuyClick || (() => {}),
        };
      case 'gold_sell':
        return {
          title: 'Sell Gold',
          icon: <TrendingDown className="h-4 w-4" />,
          buttonAction: () => {
            const event = new CustomEvent('openSellGold');
            window.dispatchEvent(event);
          },
        };
      case 'investment':
        return {
          title: 'Investment Plans',
          icon: <DollarSign className="h-4 w-4" />,
          buttonAction: () => {
            const event = new CustomEvent('openInvestmentPlans');
            window.dispatchEvent(event);
          },
        };
    }
  };

  const config = getConfig();

  return (
    <div className="space-y-2">
      <Button 
        variant="premium" 
        onClick={config.buttonAction}
        className="w-full justify-start text-sm sm:text-base"
      >
        {config.icon}
        <span className="ml-2">{config.title}</span>
      </Button>
      
      <div className="bg-muted/30 rounded-lg p-3 space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase">Recent History</h4>
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-2">Loading...</p>
        ) : transactions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">No history yet</p>
        ) : (
          <ScrollArea className="max-h-[120px]">
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between text-xs bg-background/50 rounded p-2">
                  <div className="flex-1">
                    <p className="font-medium truncate">{transaction.description}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right ml-2">
                    <p className="font-semibold">{transaction.amount.toFixed(2)}</p>
                    {transaction.status && (
                      <p className={`text-[10px] capitalize ${
                        transaction.status === 'approved' || transaction.status === 'mature' || transaction.status === 'active'
                          ? 'text-success'
                          : transaction.status === 'pending' || transaction.status === 'locked'
                          ? 'text-warning'
                          : 'text-destructive'
                      }`}>
                        {transaction.status}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};