import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoldPrice {
  country: string;
  currency: string;
  pricePerGram: string;
  pricePerOunce: string;
  pricePerTola: string;
}

export const LiveGoldPriceSelector = () => {
  const [prices, setPrices] = useState<GoldPrice[]>([]);
  const [filteredPrices, setFilteredPrices] = useState<GoldPrice[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<GoldPrice | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoldPrices();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPrices(prices);
    } else {
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
        // Default to India
        const india = data.prices.find((p: GoldPrice) => p.country === "India");
        setSelectedCountry(india || data.prices[0]);
        setFilteredPrices(data.prices);
      }
    } catch (error) {
      console.error("Error fetching gold prices:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCountrySelect = (price: GoldPrice) => {
    setSelectedCountry(price);
    setShowAll(false);
    setSearchQuery("");
  };

  if (loading) {
    return (
      <Card className="p-6 bg-black/40 backdrop-blur-sm border-[#D4AF37]/20">
        <p className="text-gray-400">Loading gold prices...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-6 bg-black/40 backdrop-blur-sm border-[#D4AF37]/30 hover:border-[#D4AF37]/50 transition-all">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowAll(true)}
              className="pl-10 bg-black/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-[#D4AF37]/50 text-sm sm:text-base"
            />
          </div>
          <Button
            onClick={() => setShowAll(!showAll)}
            className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white border border-gray-700 text-sm sm:text-base w-full sm:w-auto"
          >
            Show All
            <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform", showAll && "rotate-180")} />
          </Button>
        </div>

        {selectedCountry && !showAll && (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-white font-medium text-sm sm:text-base">{selectedCountry.country}</span>
              <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                {selectedCountry.currency}
              </span>
            </div>
            <div className="text-2xl sm:text-4xl font-bold text-[#D4AF37]">
              {selectedCountry.pricePerGram} g
            </div>
            <div className="text-xs sm:text-sm text-gray-400">24K Gold</div>
          </div>
        )}

        {showAll && (
          <div className="max-h-64 sm:max-h-96 overflow-y-auto space-y-2 mt-4">
            {filteredPrices.map((price, index) => (
              <button
                key={index}
                onClick={() => handleCountrySelect(price)}
                className="w-full p-3 sm:p-4 bg-black/30 hover:bg-black/50 border border-gray-700 hover:border-[#D4AF37]/50 rounded-lg transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium text-sm sm:text-base group-hover:text-[#D4AF37] transition-colors">
                    {price.country}
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                    {price.currency}
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-[#D4AF37]">
                  {price.pricePerGram} g
                </div>
                <div className="text-xs text-gray-400 mt-1">24K Gold</div>
              </button>
            ))}
            {filteredPrices.length === 0 && (
              <p className="text-center text-gray-400 py-4 text-sm">
                No countries found matching "{searchQuery}"
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
