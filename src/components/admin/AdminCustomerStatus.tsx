import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, User } from "lucide-react";

interface CustomerProfile {
  id: string;
  user_id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  custom_user_id: string | null;
  account_status: string;
  is_hidden: boolean;
}

const statusOptions = [
  { value: 'active', label: 'Active', color: 'bg-green-500' },
  { value: 'deactivated', label: 'Deactivated', color: 'bg-gray-500' },
  { value: 'frozen', label: 'Frozen', color: 'bg-blue-500' },
  { value: 'unfrozen', label: 'Unfrozen', color: 'bg-yellow-500' },
];

export const AdminCustomerStatus = () => {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = customers.filter(customer => 
        customer.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.custom_user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchTerm, customers]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, username, first_name, last_name, email, custom_user_id, account_status, is_hidden")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
      setFilteredCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      // Determine is_hidden based on status
      const isHidden = newStatus === 'frozen' || newStatus === 'deactivated';

      const { error } = await supabase
        .from("profiles")
        .update({ 
          account_status: newStatus,
          is_hidden: isHidden 
        })
        .eq("user_id", userId);

      if (error) throw error;

      // Update local state
      setCustomers(prev => prev.map(c => 
        c.user_id === userId 
          ? { ...c, account_status: newStatus, is_hidden: isHidden }
          : c
      ));

      toast({
        title: "Status Updated",
        description: `Customer status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update customer status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = statusOptions.find(s => s.value === status) || statusOptions[0];
    return (
      <Badge className={`${statusConfig.color} text-white`}>
        {statusConfig.label}
      </Badge>
    );
  };

  const getDisplayName = (customer: CustomerProfile) => {
    if (customer.first_name || customer.last_name) {
      return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    }
    return customer.username;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading customers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Status Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or user ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Customer List */}
          <div className="space-y-3">
            {filteredCustomers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {searchTerm ? "No customers found matching your search" : "No customers found"}
              </p>
            ) : (
              filteredCustomers.map((customer) => (
                <Card key={customer.id} className="border border-border">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Customer Info */}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Name</p>
                          <p className="font-medium">{getDisplayName(customer)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="font-medium truncate">{customer.email || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">User ID</p>
                          <p className="font-medium">{customer.custom_user_id || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Current Status</p>
                          {getStatusBadge(customer.account_status || 'active')}
                        </div>
                      </div>

                      {/* Status Change */}
                      <div className="flex items-center gap-2">
                        <Select
                          value={customer.account_status || 'active'}
                          onValueChange={(value) => handleStatusChange(customer.user_id, value)}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Change Status" />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Legend */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">Status Legend:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500 text-white">Active</Badge>
                <span className="text-muted-foreground">Normal access</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-gray-500 text-white">Deactivated</Badge>
                <span className="text-muted-foreground">Cannot log in</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-500 text-white">Frozen</Badge>
                <span className="text-muted-foreground">No wallet access</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-yellow-500 text-white">Unfrozen</Badge>
                <span className="text-muted-foreground">Restored access</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};