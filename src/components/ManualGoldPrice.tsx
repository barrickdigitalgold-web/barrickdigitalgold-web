import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { getCurrencySymbol } from "@/lib/currencyUtils";

interface CountryGoldPrice {
  buy_price_per_gram: number;
  sell_price_per_gram: number;
  updated_at: string;
  country: string;
}

export const ManualGoldPrice = () => {
  const [goldPrice, setGoldPrice] = useState<CountryGoldPrice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCountryGoldPrice();
  }, []);

  const fetchCountryGoldPrice = async () => {
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

      // Fetch country-specific gold price
      const { data, error } = await supabase
        .from("country_gold_prices")
        .select("buy_price_per_gram, sell_price_per_gram, updated_at, country")
        .eq("country", profile.country)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      setGoldPrice(data);
    } catch (error) {
      console.error("Error fetching country gold price:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Card className="shadow-elegant">
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Loading gold prices...</p>
        </CardContent>
      </Card>
    );
  }

  if (!goldPrice) {
    return (
      <Card className="shadow-elegant">
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Gold prices not available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Current Gold Prices ({goldPrice.country})
        </CardTitle>
        <CardDescription>
          Last updated: {formatDate(goldPrice.updated_at)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Buy Price</p>
              <p className="text-xl font-bold text-foreground">
                {goldPrice.buy_price_per_gram.toFixed(2)}/gram
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Price to purchase gold</p>
            </div>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Sell Price</p>
              <p className="text-xl font-bold text-foreground">
                {goldPrice.sell_price_per_gram.toFixed(2)}/gram
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Price to sell gold</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
