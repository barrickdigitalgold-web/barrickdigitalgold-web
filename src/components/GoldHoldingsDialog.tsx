import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";

interface GoldPurchase {
  id: string;
  gold_amount_grams: number;
  total_cost: number;
  price_per_gram: number;
  created_at: string;
  maturity_date: string;
  lock_period_days: number;
  status: string;
}

interface GoldSale {
  id: string;
  gold_amount_grams: number;
  total_amount: number;
  price_per_gram: number;
  created_at: string;
}

interface GoldTransaction {
  id: string;
  type: 'buy' | 'sell';
  gold_amount_grams: number;
  amount: number;
  price_per_gram: number;
  created_at: string;
  maturity_date?: string;
  lock_period_days?: number;
  status?: string;
  profit?: number;
}

interface GoldHoldingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GoldHoldingsDialog = ({ open, onOpenChange }: GoldHoldingsDialogProps) => {
  const [transactions, setTransactions] = useState<GoldTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [sellPricePerGram, setSellPricePerGram] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchTransactions();
    }
  }, [open]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch user's country from profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("country")
        .eq("user_id", user.id)
        .single();

      const userCountry = profileData?.country || 'India';

      // Try to get country-specific sell price first
      let sellPrice = 0;
      const { data: countryPriceData } = await supabase
        .from("country_gold_prices")
        .select("sell_price_per_gram")
        .eq("country", userCountry)
        .eq("is_active", true)
        .single();

      if (countryPriceData) {
        sellPrice = countryPriceData.sell_price_per_gram;
      } else {
        // Fallback to general gold settings
        const { data: goldSettingsData } = await supabase
          .from("gold_settings")
          .select("sell_price_per_gram")
          .single();
        
        if (goldSettingsData) {
          sellPrice = goldSettingsData.sell_price_per_gram;
        }
      }
      
      setSellPricePerGram(sellPrice);

      // Fetch purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from("gold_purchases")
        .select("*")
        .eq("user_id", user.id);

      if (purchasesError) throw purchasesError;

      // Fetch sales
      const { data: salesData, error: salesError } = await supabase
        .from("gold_sales")
        .select("*")
        .eq("user_id", user.id);

      if (salesError) throw salesError;

      // Combine and format transactions
      const buyTransactions: GoldTransaction[] = (purchasesData || []).map(p => ({
        id: p.id,
        type: 'buy' as const,
        gold_amount_grams: p.gold_amount_grams,
        amount: p.total_cost,
        price_per_gram: p.price_per_gram,
        created_at: p.created_at,
        maturity_date: p.maturity_date,
        lock_period_days: p.lock_period_days,
        status: p.status,
      }));

      const sellTransactions: GoldTransaction[] = (salesData || []).map(s => ({
        id: s.id,
        type: 'sell' as const,
        gold_amount_grams: s.gold_amount_grams,
        amount: s.total_amount,
        price_per_gram: s.price_per_gram,
        created_at: s.created_at,
        profit: s.profit_amount,
      }));

      // Combine and sort by date
      const allTransactions = [...buyTransactions, ...sellTransactions]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setTransactions(allTransactions);
    } catch (error) {
      console.error("Error fetching gold transactions:", error);
      toast({
        title: "Error",
        description: "Failed to load gold transaction history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalBought = transactions
    .filter(t => t.type === 'buy')
    .reduce((sum, t) => sum + t.gold_amount_grams, 0);
  
  const totalSold = transactions
    .filter(t => t.type === 'sell')
    .reduce((sum, t) => sum + t.gold_amount_grams, 0);
  
  const currentHoldings = totalBought - totalSold;
  
  const totalInvested = transactions
    .filter(t => t.type === 'buy')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalRealized = transactions
    .filter(t => t.type === 'sell')
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate total return based on current sell price
  const totalReturn = currentHoldings * sellPricePerGram;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gold Holdings History</DialogTitle>
          <DialogDescription>
            View all your gold buy and sell transactions
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-center text-muted-foreground">Loading gold holdings...</p>
        ) : (
          <div className="space-y-4">
            {transactions.length > 0 && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Holdings</p>
                      <p className="text-2xl font-bold text-primary">
                        {currentHoldings.toFixed(4)}g
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Bought: {totalBought.toFixed(4)}g | Sold: {totalSold.toFixed(4)}g
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Net Value</p>
                      <p className="text-2xl font-bold text-foreground">
                        {(totalInvested - totalRealized).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Invested: {totalInvested.toLocaleString()} | Realized: {totalRealized.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Return</p>
                      <p className="text-2xl font-bold text-success">
                        {totalReturn.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sell Price: {sellPricePerGram.toLocaleString()}/g
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No gold transactions found</p>
              ) : (
                transactions.map((transaction) => (
                  <Card key={transaction.id} className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            transaction.type === 'buy' ? 'bg-success/10' : 'bg-destructive/10'
                          }`}>
                            {transaction.type === 'buy' ? (
                              <TrendingUp className="w-5 h-5 text-success" />
                            ) : (
                              <TrendingDown className="w-5 h-5 text-destructive" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold">
                              {transaction.type === 'buy' ? 'Gold Purchase' : 'Gold Sale'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {transaction.gold_amount_grams.toFixed(4)}g @ {transaction.price_per_gram.toLocaleString()}/g
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {new Date(transaction.created_at).toLocaleString()}
                            </p>
                            {transaction.type === 'buy' && transaction.maturity_date && (
                              <p className="text-xs mt-1">
                                {transaction.status === 'locked' ? (
                                  <span className="text-warning">
                                    🔒 Locked until {new Date(transaction.maturity_date).toLocaleDateString()} ({transaction.lock_period_days} days)
                                  </span>
                                ) : (
                                  <span className="text-success">
                                    ✓ Matured on {new Date(transaction.maturity_date).toLocaleDateString()}
                                  </span>
                                )}
                              </p>
                            )}
                            {transaction.type === 'sell' && transaction.profit !== undefined && transaction.profit !== 0 && (
                              <p className={`text-xs font-semibold mt-1 ${transaction.profit > 0 ? 'text-success' : 'text-destructive'}`}>
                                Profit: {transaction.profit > 0 ? '+' : ''}{transaction.profit.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold text-lg ${
                            transaction.type === 'buy' ? 'text-foreground' : 'text-success'
                          }`}>
                            {transaction.type === 'buy' ? '-' : '+'}{transaction.amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {transaction.type === 'buy' ? '-' : '+'}{transaction.gold_amount_grams.toFixed(4)}g
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
