import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface PaymentMethod {
  id: string;
  method_name: string;
  account_details: string;
  is_active: boolean;
}

export const AdminPaymentMethods = () => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    method_name: "",
    account_details: "",
    is_active: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMethods(data || []);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editing) {
        const { error } = await supabase
          .from("payment_methods")
          .update(formData)
          .eq("id", editing);

        if (error) throw error;
        toast({ title: "Payment method updated successfully" });
      } else {
        const { error } = await supabase
          .from("payment_methods")
          .insert([formData]);

        if (error) throw error;
        toast({ title: "Payment method added successfully" });
      }

      setFormData({ method_name: "", account_details: "", is_active: true });
      setEditing(null);
      fetchMethods();
    } catch (error) {
      console.error("Error saving payment method:", error);
      toast({
        title: "Error",
        description: "Failed to save payment method",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (method: PaymentMethod) => {
    setFormData({
      method_name: method.method_name,
      account_details: method.account_details,
      is_active: method.is_active,
    });
    setEditing(method.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payment method?")) return;

    try {
      const { error } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Payment method deleted" });
      fetchMethods();
    } catch (error) {
      console.error("Error deleting payment method:", error);
      toast({
        title: "Error",
        description: "Failed to delete payment method",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <p className="text-center text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit" : "Add"} Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="method_name">Method Name</Label>
              <Input
                id="method_name"
                value={formData.method_name}
                onChange={(e) =>
                  setFormData({ ...formData, method_name: e.target.value })
                }
                placeholder="e.g., UPI, Bank Transfer, Cashapp"
                required
              />
            </div>

            <div>
              <Label htmlFor="account_details">Account Details</Label>
              <Textarea
                id="account_details"
                value={formData.account_details}
                onChange={(e) =>
                  setFormData({ ...formData, account_details: e.target.value })
                }
                placeholder="Enter account details, UPI ID, phone number, etc."
                rows={4}
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                <Plus className="w-4 h-4 mr-2" />
                {editing ? "Update" : "Add"} Method
              </Button>
              {editing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing(null);
                    setFormData({
                      method_name: "",
                      account_details: "",
                      is_active: true,
                    });
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {methods.map((method) => (
          <Card key={method.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{method.method_name}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(method)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(method.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap mb-2">
                {method.account_details}
              </p>
              <p className="text-sm text-muted-foreground">
                Status: {method.is_active ? "Active" : "Inactive"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
