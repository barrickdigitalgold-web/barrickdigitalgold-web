import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Transaction {
  id: string;
  type: 'topup' | 'withdrawal' | 'gold_buy' | 'gold_sell' | 'investment';
  amount: number;
  status?: string;
  created_at: string;
  description: string;
  gold_amount?: number;
  profit?: number;
}

export const TransactionHistory = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all transaction types
      const [
        { data: topups },
        { data: withdrawals },
        { data: goldPurchases },
        { data: goldSales },
        { data: investments }
      ] = await Promise.all([
        supabase.from("transactions").select("*").eq("user_id", user.id),
        supabase.from("withdrawal_requests").select("*").eq("user_id", user.id),
        supabase.from("gold_purchases").select("*").eq("user_id", user.id),
        supabase.from("gold_sales").select("*").eq("user_id", user.id),
        supabase.from("user_investments").select("*").eq("user_id", user.id)
      ]);

      // Format and combine all transactions
      const allTransactions: Transaction[] = [
        ...(topups || []).map(t => ({
          id: t.id,
          type: 'topup' as const,
          amount: Number(t.amount),
          status: t.status,
          created_at: t.created_at,
          description: `Wallet Top-up (${t.status})`,
        })),
        ...(withdrawals || []).map(w => ({
          id: w.id,
          type: 'withdrawal' as const,
          amount: Number(w.amount),
          status: w.status,
          created_at: w.created_at,
          description: `Withdrawal Request (${w.status})`,
        })),
        ...(goldPurchases || []).map(gp => ({
          id: gp.id,
          type: 'gold_buy' as const,
          amount: Number(gp.total_cost),
          created_at: gp.created_at,
          description: `Bought ${Number(gp.gold_amount_grams).toFixed(4)}g gold`,
          gold_amount: Number(gp.gold_amount_grams),
        })),
        ...(goldSales || []).map(gs => ({
          id: gs.id,
          type: 'gold_sell' as const,
          amount: Number(gs.total_amount),
          created_at: gs.created_at,
          description: `Sold ${Number(gs.gold_amount_grams).toFixed(4)}g gold`,
          gold_amount: Number(gs.gold_amount_grams),
          profit: Number(gs.profit_amount),
        })),
        ...(investments || []).map(inv => ({
          id: inv.id,
          type: 'investment' as const,
          amount: Number(inv.amount_invested),
          status: inv.status,
          created_at: inv.created_at,
          description: `Investment (${inv.status})`,
        })),
      ];

      // Sort by date (newest first)
      allTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setTransactions(allTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'topup':
        return <ArrowDownCircle className="w-5 h-5 text-success" />;
      case 'withdrawal':
        return <ArrowUpCircle className="w-5 h-5 text-destructive" />;
      case 'gold_buy':
        return <TrendingUp className="w-5 h-5 text-primary" />;
      case 'gold_sell':
        return <TrendingDown className="w-5 h-5 text-warning" />;
      case 'investment':
        return <ArrowUpCircle className="w-5 h-5 text-primary" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getAmountColor = (type: string) => {
    switch (type) {
      case 'topup':
      case 'gold_sell':
        return 'text-success';
      case 'withdrawal':
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
      case 'withdrawal':
      case 'gold_buy':
      case 'investment':
        return '-';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">Loading transactions...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>View all your transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="wallet">Wallet</TabsTrigger>
            <TabsTrigger value="gold">Gold</TabsTrigger>
            <TabsTrigger value="investment">Investment</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-3 mt-4">
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No transactions found</p>
            ) : (
              transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-muted">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
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
                    <p className={`font-bold ${getAmountColor(transaction.type)}`}>
                      {getAmountPrefix(transaction.type)}{transaction.amount.toLocaleString()}
                    </p>
                    {transaction.status && (
                      <p className="text-xs text-muted-foreground capitalize">{transaction.status}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="wallet" className="space-y-3 mt-4">
            {transactions.filter(t => ['topup', 'withdrawal'].includes(t.type)).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No wallet transactions found</p>
            ) : (
              transactions.filter(t => ['topup', 'withdrawal'].includes(t.type)).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-muted">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(transaction.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${getAmountColor(transaction.type)}`}>
                      {getAmountPrefix(transaction.type)}{transaction.amount.toLocaleString()}
                    </p>
                    {transaction.status && (
                      <p className="text-xs text-muted-foreground capitalize">{transaction.status}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="gold" className="space-y-3 mt-4">
            {transactions.filter(t => ['gold_buy', 'gold_sell'].includes(t.type)).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No gold transactions found</p>
            ) : (
              transactions.filter(t => ['gold_buy', 'gold_sell'].includes(t.type)).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-muted">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
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
                    <p className={`font-bold ${getAmountColor(transaction.type)}`}>
                      {getAmountPrefix(transaction.type)}{transaction.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="investment" className="space-y-3 mt-4">
            {transactions.filter(t => t.type === 'investment').length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No investment transactions found</p>
            ) : (
              transactions.filter(t => t.type === 'investment').map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-muted">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(transaction.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${getAmountColor(transaction.type)}`}>
                      {getAmountPrefix(transaction.type)}{transaction.amount.toLocaleString()}
                    </p>
                    {transaction.status && (
                      <p className="text-xs text-muted-foreground capitalize">{transaction.status}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
