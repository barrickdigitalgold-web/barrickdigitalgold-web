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

interface InvestmentPlan {
  id: string;
  plan_name: string;
  description: string;
  price: number;
  duration_days: number;
  returns_percentage: number;
  is_active: boolean;
}

export const AdminInvestmentPlans = () => {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    plan_name: "",
    description: "",
    price: "",
    duration_days: "",
    returns_percentage: "",
    is_active: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("investment_plans")
        .select("*")
        .order("price", { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const planData = {
      plan_name: formData.plan_name,
      description: formData.description,
      price: parseFloat(formData.price),
      duration_days: parseInt(formData.duration_days),
      returns_percentage: parseFloat(formData.returns_percentage),
      is_active: formData.is_active,
    };

    try {
      if (editing) {
        const { error } = await supabase
          .from("investment_plans")
          .update(planData)
          .eq("id", editing);

        if (error) throw error;
        toast({ title: "Investment plan updated successfully" });
      } else {
        const { error } = await supabase
          .from("investment_plans")
          .insert([planData]);

        if (error) throw error;
        toast({ title: "Investment plan added successfully" });
      }

      setFormData({
        plan_name: "",
        description: "",
        price: "",
        duration_days: "",
        returns_percentage: "",
        is_active: true,
      });
      setEditing(null);
      fetchPlans();
    } catch (error) {
      console.error("Error saving plan:", error);
      toast({
        title: "Error",
        description: "Failed to save investment plan",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (plan: InvestmentPlan) => {
    setFormData({
      plan_name: plan.plan_name,
      description: plan.description,
      price: plan.price.toString(),
      duration_days: plan.duration_days.toString(),
      returns_percentage: plan.returns_percentage.toString(),
      is_active: plan.is_active,
    });
    setEditing(plan.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;

    try {
      const { error } = await supabase
        .from("investment_plans")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Investment plan deleted" });
      fetchPlans();
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast({
        title: "Error",
        description: "Failed to delete investment plan",
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
          <CardTitle>{editing ? "Edit" : "Add"} Investment Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="plan_name">Plan Name</Label>
              <Input
                id="plan_name"
                value={formData.plan_name}
                onChange={(e) =>
                  setFormData({ ...formData, plan_name: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="price">Price (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="duration_days">Duration (days)</Label>
                <Input
                  id="duration_days"
                  type="number"
                  value={formData.duration_days}
                  onChange={(e) =>
                    setFormData({ ...formData, duration_days: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="returns_percentage">Returns (%)</Label>
                <Input
                  id="returns_percentage"
                  type="number"
                  step="0.01"
                  value={formData.returns_percentage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      returns_percentage: e.target.value,
                    })
                  }
                  required
                />
              </div>
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
                {editing ? "Update" : "Add"} Plan
              </Button>
              {editing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing(null);
                    setFormData({
                      plan_name: "",
                      description: "",
                      price: "",
                      duration_days: "",
                      returns_percentage: "",
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
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{plan.plan_name}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(plan)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(plan.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">{plan.description}</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Price:</span>
                  <p className="font-bold">₹{plan.price.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <p className="font-bold">{plan.duration_days} days</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Returns:</span>
                  <p className="font-bold text-success">
                    {plan.returns_percentage}%
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Status: {plan.is_active ? "Active" : "Inactive"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
