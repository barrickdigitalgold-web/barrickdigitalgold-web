import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, Edit2, Save, X } from "lucide-react";

interface LockPeriod {
  id: string;
  period_days: number;
  profit_percentage: number;
  is_active: boolean;
}

interface CountryPrice {
  id: string;
  country: string;
  sell_price_per_gram: number;
  buy_price_per_gram: number;
  is_active: boolean;
}

export const AdminGoldSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string>("");
  const [formData, setFormData] = useState({
    minimum_sell_grams: "",
    buy_platform_fee_percentage: "",
    sell_platform_fee_percentage: "",
    minimum_topup_amount: "",
    minimum_withdrawal_amount: "",
  });
  
  // Lock Periods State
  const [lockPeriods, setLockPeriods] = useState<LockPeriod[]>([]);
  const [newPeriod, setNewPeriod] = useState({ days: "", percentage: "" });
  
  // Country Prices State
  const [countryPrices, setCountryPrices] = useState<CountryPrice[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ sell_price: "", buy_price: "" });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchAllSettings();
  }, []);

  const fetchAllSettings = async () => {
    setLoading(true);
    await Promise.all([
      fetchSettings(),
      fetchLockPeriods(),
      fetchCountryPrices()
    ]);
    setLoading(false);
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("gold_settings")
      .select("*")
      .single();

    if (error) {
      console.error("Error fetching gold settings:", error);
      toast({
        title: "Error",
        description: "Failed to load gold settings",
        variant: "destructive",
      });
    } else if (data) {
      setSettingsId(data.id);
      setFormData({
        minimum_sell_grams: data.minimum_sell_grams.toString(),
        buy_platform_fee_percentage: data.buy_platform_fee_percentage.toString(),
        sell_platform_fee_percentage: data.sell_platform_fee_percentage.toString(),
        minimum_topup_amount: data.minimum_topup_amount.toString(),
        minimum_withdrawal_amount: data.minimum_withdrawal_amount.toString(),
      });
    }
  };

  const fetchLockPeriods = async () => {
    const { data, error } = await supabase
      .from("lock_periods")
      .select("*")
      .order("period_days", { ascending: true });

    if (error) {
      console.error("Error fetching lock periods:", error);
      toast({
        title: "Error",
        description: "Failed to load lock periods",
        variant: "destructive",
      });
    } else {
      setLockPeriods(data || []);
    }
  };

  const fetchCountryPrices = async () => {
    const { data, error } = await supabase
      .from("country_gold_prices")
      .select("*")
      .order("country", { ascending: true });

    if (error) {
      console.error("Error fetching country prices:", error);
      toast({
        title: "Error",
        description: "Failed to load country prices",
        variant: "destructive",
      });
    } else {
      setCountryPrices(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from("gold_settings")
        .update({
          minimum_sell_grams: parseFloat(formData.minimum_sell_grams),
          buy_platform_fee_percentage: parseFloat(formData.buy_platform_fee_percentage),
          sell_platform_fee_percentage: parseFloat(formData.sell_platform_fee_percentage),
          minimum_topup_amount: parseFloat(formData.minimum_topup_amount),
          minimum_withdrawal_amount: parseFloat(formData.minimum_withdrawal_amount),
        })
        .eq("id", settingsId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Gold settings updated successfully",
      });

      fetchSettings();
    } catch (error: any) {
      console.error("Error updating gold settings:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Lock Period Handlers
  const handleAddLockPeriod = async () => {
    if (!newPeriod.days || !newPeriod.percentage) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("lock_periods")
      .insert({
        period_days: parseInt(newPeriod.days),
        profit_percentage: parseFloat(newPeriod.percentage),
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add lock period",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Lock period added successfully",
      });
      setNewPeriod({ days: "", percentage: "" });
      fetchLockPeriods();
    }
  };

  const handleDeleteLockPeriod = async (id: string) => {
    const { error } = await supabase
      .from("lock_periods")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete lock period",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Lock period deleted successfully",
      });
      fetchLockPeriods();
    }
  };

  const handleToggleLockPeriodActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("lock_periods")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update lock period",
        variant: "destructive",
      });
    } else {
      fetchLockPeriods();
    }
  };

  // Country Price Handlers
  const handleEditCountryPrice = (price: CountryPrice) => {
    setEditingId(price.id);
    setEditData({
      sell_price: price.sell_price_per_gram.toString(),
      buy_price: price.buy_price_per_gram.toString(),
    });
  };

  const handleSaveCountryPrice = async (id: string) => {
    const { error } = await supabase
      .from("country_gold_prices")
      .update({
        sell_price_per_gram: parseFloat(editData.sell_price),
        buy_price_per_gram: parseFloat(editData.buy_price),
      })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update country price",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Country price updated successfully",
      });
      setEditingId(null);
      fetchCountryPrices();
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({ sell_price: "", buy_price: "" });
  };

  const handleToggleCountryActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("country_gold_prices")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update country status",
        variant: "destructive",
      });
    } else {
      fetchCountryPrices();
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading gold settings...</div>;
  }

  return (
    <Card className="gradient-card border-primary/20">
      <CardHeader>
        <CardTitle className="text-primary">Gold Settings</CardTitle>
        <CardDescription>Manage all gold-related configurations including pricing, lock periods, and country-specific rates</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="general">General Settings</TabsTrigger>
            <TabsTrigger value="lockperiods">Lock Periods</TabsTrigger>
            <TabsTrigger value="countries">Country Prices</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="minimum_sell_grams">Minimum Sell Amount (grams)</Label>
                <Input
                  id="minimum_sell_grams"
                  type="number"
                  step="0.01"
                  value={formData.minimum_sell_grams}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, minimum_sell_grams: e.target.value }))
                  }
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Minimum amount of gold (in grams) required for a sale transaction
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="buy_platform_fee_percentage">Buy Platform Fee (%)</Label>
                <Input
                  id="buy_platform_fee_percentage"
                  type="number"
                  step="0.01"
                  value={formData.buy_platform_fee_percentage}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, buy_platform_fee_percentage: e.target.value }))
                  }
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Platform fee charged on gold purchases
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sell_platform_fee_percentage">Sell Platform Fee (%)</Label>
                <Input
                  id="sell_platform_fee_percentage"
                  type="number"
                  step="0.01"
                  value={formData.sell_platform_fee_percentage}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, sell_platform_fee_percentage: e.target.value }))
                  }
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Platform fee charged on gold sales
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minimum_topup_amount">Minimum Top-Up Amount</Label>
                <Input
                  id="minimum_topup_amount"
                  type="number"
                  step="0.01"
                  value={formData.minimum_topup_amount}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, minimum_topup_amount: e.target.value }))
                  }
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Minimum amount users can top-up to their wallet
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minimum_withdrawal_amount">Minimum Withdrawal Amount</Label>
                <Input
                  id="minimum_withdrawal_amount"
                  type="number"
                  step="0.01"
                  value={formData.minimum_withdrawal_amount}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, minimum_withdrawal_amount: e.target.value }))
                  }
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Minimum amount users can withdraw from their account
                </p>
              </div>

              <Button type="submit" disabled={saving} className="shadow-gold">
                {saving ? "Saving..." : "Save General Settings"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="lockperiods">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg border border-primary/20 bg-muted/50">
                <div className="space-y-2">
                  <Label htmlFor="days">Lock Period (Days)</Label>
                  <Input
                    id="days"
                    type="number"
                    value={newPeriod.days}
                    onChange={(e) => setNewPeriod({ ...newPeriod, days: e.target.value })}
                    placeholder="e.g., 30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="percentage">Profit Percentage</Label>
                  <Input
                    id="percentage"
                    type="number"
                    step="0.01"
                    value={newPeriod.percentage}
                    onChange={(e) => setNewPeriod({ ...newPeriod, percentage: e.target.value })}
                    placeholder="e.g., 5.00"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddLockPeriod} className="w-full shadow-gold">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Lock Period
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lock Period (Days)</TableHead>
                    <TableHead>Profit Percentage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lockPeriods.map((period) => (
                    <TableRow key={period.id}>
                      <TableCell className="font-medium">{period.period_days} days</TableCell>
                      <TableCell>{period.profit_percentage}%</TableCell>
                      <TableCell>
                        <Button
                          variant={period.is_active ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleToggleLockPeriodActive(period.id, period.is_active)}
                        >
                          {period.is_active ? "Active" : "Inactive"}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteLockPeriod(period.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="countries">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Country</TableHead>
                  <TableHead>Buy Price (per gram)</TableHead>
                  <TableHead>Sell Price (per gram)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {countryPrices.map((price) => (
                  <TableRow key={price.id}>
                    <TableCell className="font-medium">{price.country}</TableCell>
                    <TableCell>
                      {editingId === price.id ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editData.buy_price}
                          onChange={(e) => setEditData({ ...editData, buy_price: e.target.value })}
                          className="w-32"
                        />
                      ) : (
                        price.buy_price_per_gram.toFixed(2)
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === price.id ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editData.sell_price}
                          onChange={(e) => setEditData({ ...editData, sell_price: e.target.value })}
                          className="w-32"
                        />
                      ) : (
                        price.sell_price_per_gram.toFixed(2)
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant={price.is_active ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleToggleCountryActive(price.id, price.is_active)}
                      >
                        {price.is_active ? "Active" : "Inactive"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      {editingId === price.id ? (
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleSaveCountryPrice(price.id)}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditCountryPrice(price)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
