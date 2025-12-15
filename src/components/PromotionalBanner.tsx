import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Megaphone } from "lucide-react";

interface PromotionalOffer {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
}

export const PromotionalBanner = () => {
  const [activeOffer, setActiveOffer] = useState<PromotionalOffer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveOffer();
  }, []);

  const fetchActiveOffer = async () => {
    try {
      const { data, error } = await supabase
        .from("promotional_offers")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setActiveOffer(data);
    } catch (error) {
      console.error("Error fetching active offer:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !activeOffer) {
    return null;
  }

  return (
    <Card className="shadow-elegant bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col">
          {(activeOffer.title || activeOffer.description) && (
            <div className="p-4 space-y-2">
              {activeOffer.title && (
                <h3 className="text-xl font-display font-bold text-primary">
                  {activeOffer.title}
                </h3>
              )}
              {activeOffer.description && (
                <p className="text-sm text-muted-foreground">
                  {activeOffer.description}
                </p>
              )}
            </div>
          )}
          {activeOffer.image_url ? (
            <div className="w-full">
              <img
                src={activeOffer.image_url}
                alt={activeOffer.title || "Promotional offer"}
                className="w-full h-auto object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-48 bg-primary/20 flex flex-col items-center justify-center">
              <Megaphone className="w-16 h-16 text-primary mb-2" />
              <p className="text-sm text-muted-foreground">No image available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
