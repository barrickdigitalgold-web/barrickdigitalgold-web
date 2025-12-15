import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp } from "lucide-react";
import { getCurrencySymbol } from "@/lib/currencyUtils";

interface GoldRate {
  country: string;
  rate_24k_per_10g: number;
  rate_22k_per_10g: number;
  change_24k: number;
  change_22k: number;
  updated_at: string;
}

interface GoldRateTickerProps {
  country: string;
}

export const GoldRateTicker = ({ country }: GoldRateTickerProps) => {
  const [goldRate, setGoldRate] = useState<GoldRate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoldRate();
  }, [country]);

  const fetchGoldRate = async () => {
    try {
      const { data, error } = await supabase
        .from("gold_rates")
        .select("*")
        .eq("country", country)
        .single();

      if (error) throw error;
      setGoldRate(data);
    } catch (error) {
      console.error("Error fetching gold rate:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-elegant">
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Loading gold rates...</p>
        </CardContent>
      </Card>
    );
  }

  if (!goldRate) {
    return (
      <Card className="shadow-elegant">
        <CardContent className="pt-6">
          <p className="text-muted-foreground">
            Gold rates not available for {country}
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl font-display">
              Gold Rate Today{" "}
              <span className="text-muted-foreground text-base font-normal">
                (as on {formatDate(goldRate.updated_at)})
              </span>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Updated on {formatDate(goldRate.updated_at)}
            </p>
          </div>
          <div className="bg-muted px-4 py-2 rounded-md">
            <p className="text-sm font-medium">{goldRate.country}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-accent/10 p-6 rounded-lg">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-foreground">
              {(goldRate.rate_24k_per_10g / 10).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div className="flex items-center gap-1">
              <span
                className={`text-lg font-semibold ${
                  goldRate.change_24k >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {goldRate.change_24k >= 0 ? "+" : ""}
                {(goldRate.change_24k / 10).toFixed(2)}
              </span>
              {goldRate.change_24k >= 0 ? (
                <TrendingUp className="w-5 h-5 text-success" />
              ) : (
                <TrendingDown className="w-5 h-5 text-destructive" />
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            24 Carat Gold Rate (per gram)
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
