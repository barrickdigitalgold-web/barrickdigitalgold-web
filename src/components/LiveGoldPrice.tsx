import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface CountryGoldPrice {
  buy_price_per_gram: number;
  country: string;
}

export const LiveGoldPrice = () => {
  const [price, setPrice] = useState<number | null>(null);
  const [country, setCountry] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCountryPrice();
    
    // Refresh price every 60 seconds
    const interval = setInterval(fetchCountryPrice, 60000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const fetchCountryPrice = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch user's country from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('country')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      
      const userCountry = profile?.country || 'India';
      setCountry(userCountry);

      // Fetch country-specific gold price
      const { data: countryPrice, error: priceError } = await supabase
        .from('country_gold_prices')
        .select('buy_price_per_gram')
        .eq('country', userCountry)
        .eq('is_active', true)
        .single();

      if (priceError) throw priceError;
      
      if (countryPrice) {
        setPrice(countryPrice.buy_price_per_gram);
      }
    } catch (error) {
      console.error("Error fetching country price:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20 shadow-gold">
        <p className="text-muted-foreground">Loading live price...</p>
      </Card>
    );
  }

  if (!price || price === 0) {
    return (
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20 shadow-gold">
        <p className="text-muted-foreground">Unable to fetch price for {country}</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20 shadow-gold">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">LIVE GOLD PRICE - {country.toUpperCase()}</h3>
          <div className="flex items-center gap-1 text-success">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
            <span className="text-xs font-medium">LIVE RATE</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-muted-foreground">24K • 999.0</span>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase">Buying Price</p>
            <p className="text-3xl font-display font-bold text-primary">
              ₹{price.toLocaleString("en-IN", { 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2 
              })}/gm
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
