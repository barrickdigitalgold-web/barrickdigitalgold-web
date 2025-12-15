import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";

interface PromotionalOffer {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export const AdminPromotionalOffers = () => {
  const [offers, setOffers] = useState<PromotionalOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newOffer, setNewOffer] = useState({
    title: "",
    description: "",
    image_url: "",
    is_active: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase
        .from("promotional_offers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error("Error fetching offers:", error);
      toast({
        title: "Error",
        description: "Failed to load promotional offers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `promotions/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("promotional-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("promotional-images")
        .getPublicUrl(filePath);

      setNewOffer({ ...newOffer, image_url: publicUrl });

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCreateOffer = async () => {
    if (!newOffer.image_url && !newOffer.title && !newOffer.description) {
      toast({
        title: "Error",
        description: "Please provide at least an image or text content",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("promotional_offers").insert([
        {
          title: newOffer.title,
          description: newOffer.description,
          image_url: newOffer.image_url || null,
          is_active: newOffer.is_active,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Promotional offer created successfully",
      });

      setNewOffer({ title: "", description: "", image_url: "", is_active: true });
      fetchOffers();
    } catch (error) {
      console.error("Error creating offer:", error);
      toast({
        title: "Error",
        description: "Failed to create promotional offer",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("promotional_offers")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Offer status updated",
      });

      fetchOffers();
    } catch (error) {
      console.error("Error updating offer:", error);
      toast({
        title: "Error",
        description: "Failed to update offer status",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("promotional_offers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Offer deleted successfully",
      });

      fetchOffers();
    } catch (error) {
      console.error("Error deleting offer:", error);
      toast({
        title: "Error",
        description: "Failed to delete offer",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Promotional Offer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={newOffer.title}
              onChange={(e) =>
                setNewOffer({ ...newOffer, title: e.target.value })
              }
              placeholder="Enter offer title"
            />
          </div>
          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={newOffer.description}
              onChange={(e) =>
                setNewOffer({ ...newOffer, description: e.target.value })
              }
              placeholder="Enter offer description"
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="image_upload">Promotional Image</Label>
            <Input
              id="image_upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
            />
            {uploading && <p className="text-sm text-muted-foreground mt-1">Uploading...</p>}
            {newOffer.image_url && (
              <div className="mt-2">
                <img src={newOffer.image_url} alt="Preview" className="h-32 w-auto rounded-md border" />
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={newOffer.is_active}
              onCheckedChange={(checked) =>
                setNewOffer({ ...newOffer, is_active: checked })
              }
            />
            <Label htmlFor="is_active">Active</Label>
          </div>
          <Button onClick={handleCreateOffer}>
            <Plus className="w-4 h-4 mr-2" />
            Create Offer
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Promotional Offers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {offers.length === 0 ? (
              <p className="text-muted-foreground">No promotional offers yet</p>
            ) : (
              offers.map((offer) => (
                <div
                  key={offer.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold">{offer.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {offer.description}
                      </p>
                      {offer.image_url && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Image: {offer.image_url}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={offer.is_active}
                          onCheckedChange={() =>
                            handleToggleActive(offer.id, offer.is_active)
                          }
                        />
                        <Label className="text-xs">
                          {offer.is_active ? "Active" : "Inactive"}
                        </Label>
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(offer.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
