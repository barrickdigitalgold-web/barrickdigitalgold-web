import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp } from "lucide-react";

interface GoldPrice {
  country: string;
  currency: string;
  pricePerGram: string;
  pricePerOunce: string;
  pricePerTola: string;
}

export const GlobalGoldPrices = () => {
  const [prices, setPrices] = useState<GoldPrice[]>([]);
  const [filteredPrices, setFilteredPrices] = useState<GoldPrice[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoldPrices();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      // Show only India by default
      setFilteredPrices(prices.filter(p => p.country === "India"));
    } else {
      // Filter based on search query
      const query = searchQuery.toLowerCase();
      setFilteredPrices(
        prices.filter(p => 
          p.country.toLowerCase().includes(query) || 
          p.currency.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, prices]);

  const fetchGoldPrices = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-live-gold-prices');
      
      if (error) throw error;
      
      if (data?.prices) {
        setPrices(data.prices);
        // Default to showing only India
        setFilteredPrices(data.prices.filter((p: GoldPrice) => p.country === "India"));
      }
    } catch (error) {
      console.error("Error fetching gold prices:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
        <p className="text-muted-foreground">Loading gold prices...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2 sm:gap-4">
        <h2 className="text-lg sm:text-xl md:text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          24K Gold Prices Worldwide
        </h2>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by country or currency..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 text-sm sm:text-base"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredPrices.map((price, index) => (
          <Card 
            key={index} 
            className="p-3 sm:p-4 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors"
          >
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-semibold text-foreground">{price.country}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  {price.currency}
                </span>
              </div>
              
              <div className="space-y-1 sm:space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs sm:text-sm text-muted-foreground">Per Gram:</span>
                  <span className="text-base sm:text-lg font-bold text-primary">{price.pricePerGram}</span>
                </div>
                
                <div className="flex justify-between items-baseline">
                  <span className="text-xs sm:text-sm text-muted-foreground">Per Ounce:</span>
                  <span className="text-xs sm:text-sm font-medium text-foreground">{price.pricePerOunce}</span>
                </div>
                
                <div className="flex justify-between items-baseline">
                  <span className="text-xs sm:text-sm text-muted-foreground">Per Tola:</span>
                  <span className="text-xs sm:text-sm font-medium text-foreground">{price.pricePerTola}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredPrices.length === 0 && (
        <Card className="p-6 sm:p-8 bg-card/50 backdrop-blur-sm border-primary/20">
          <p className="text-center text-sm sm:text-base text-muted-foreground">
            No countries found matching "{searchQuery}"
          </p>
        </Card>
      )}
    </div>
  );
};
