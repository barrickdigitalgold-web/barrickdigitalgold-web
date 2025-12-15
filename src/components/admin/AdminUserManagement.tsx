import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, UserPlus, Eye, Filter, Pencil, Trash2, Download, Upload, FileDown, FileUp, ChevronUp, ChevronDown } from "lucide-react";
import { AdminUserTransactions } from "./AdminUserTransactions";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  country: string;
  created_at: string;
  kyc_status?: string | null;
  kyc_proof_url?: string | null;
  kyc_proof_type?: string | null;
  is_hidden?: boolean;
  account_status?: string;
  date_of_birth?: string | null;
  profile_picture?: string | null;
  account_number?: string | null;
  custom_user_id?: string | null;
  phone_number?: string | null;
}

interface UserRole {
  role: string;
}

interface UserWithRoles extends UserProfile {
  roles: string[];
  email?: string;
  permissions?: string[];
  first_name?: string;
  last_name?: string;
  phone_number?: string | null;
}

interface Transaction {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  payment_method_id: string;
}

interface GoldPurchase {
  id: string;
  gold_amount_grams: number;
  total_cost: number;
  created_at: string;
  maturity_date: string;
  status: string;
}

interface GoldSale {
  id: string;
  gold_amount_grams: number;
  total_amount: number;
  profit_amount: number;
  created_at: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  account_number: string | null;
}

interface Investment {
  id: string;
  amount_invested: number;
  status: string;
  created_at: string;
  plan_id: string;
  end_date: string;
}

type PermissionType = 
  | 'transactions'
  | 'withdrawals'
  | 'payment_methods'
  | 'investment_plans'
  | 'gold_settings'
  | 'users'
  | 'promotions'
  | 'support';

export const AdminUserManagement = () => {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRoles[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionsDialogOpen, setTransactionsDialogOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goldPurchases, setGoldPurchases] = useState<GoldPurchase[]>([]);
  const [goldSales, setGoldSales] = useState<GoldSale[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState({ username: "", country: "" });
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [withdrawableBalance, setWithdrawableBalance] = useState<number>(0);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Scroll ref for user details dialog
  const detailsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkDetailsScroll = () => {
    if (detailsScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = detailsScrollRef.current;
      setCanScrollUp(scrollTop > 0);
      setCanScrollDown(scrollTop + clientHeight < scrollHeight - 5);
    }
  };

  const scrollDetailsUp = () => {
    detailsScrollRef.current?.scrollBy({ top: -150, behavior: 'smooth' });
  };

  const scrollDetailsDown = () => {
    detailsScrollRef.current?.scrollBy({ top: 150, behavior: 'smooth' });
  };

  useEffect(() => {
    if (userDetailsOpen) {
      setTimeout(checkDetailsScroll, 100);
    }
  }, [userDetailsOpen]);

  const availablePermissions: { value: PermissionType; label: string }[] = [
    { value: "transactions", label: "Transactions" },
    { value: "withdrawals", label: "Withdrawals" },
    { value: "payment_methods", label: "Payment Methods" },
    { value: "investment_plans", label: "Investment Plans" },
    { value: "gold_settings", label: "Gold Settings" },
    { value: "users", label: "Users" },
    { value: "promotions", label: "Promotions" },
    { value: "support", label: "Support" },
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = users;

    // Apply search filter
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter(
        (user) =>
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply role filter
    if (roleFilter.length > 0) {
      filtered = filtered.filter((user) =>
        roleFilter.some((role) => user.roles.includes(role))
      );
    }

    setFilteredUsers(filtered);
  }, [searchTerm, users, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Fetch all user roles first to get ALL users with roles
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Get unique user IDs from roles
      const uniqueUserIds = [...new Set(userRoles?.map(r => r.user_id) || [])];

      // Fetch profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", uniqueUserIds);

      if (profilesError) throw profilesError;

      // Fetch all user permissions
      const { data: userPermissions, error: permissionsError } = await supabase
        .from("user_permissions")
        .select("user_id, permission");

      if (permissionsError) throw permissionsError;

      // Combine data for all users with roles - now reading from profiles directly
      const usersWithRoles: UserWithRoles[] = uniqueUserIds.map((userId) => {
        const profile = profiles?.find(p => p.user_id === userId);
        
        // Use profile username, or fall back to email username, or user ID
        let displayName = profile?.username || "Unknown";
        if (displayName === "Unknown" && profile?.email) {
          displayName = profile.email.split('@')[0];
        }
        
        return {
          id: profile?.id || userId,
          user_id: userId,
          username: displayName,
          country: profile?.country || "N/A",
          created_at: profile?.created_at || new Date().toISOString(),
          kyc_status: profile?.kyc_status,
          kyc_proof_url: profile?.kyc_proof_url,
          kyc_proof_type: profile?.kyc_proof_type,
          is_hidden: profile?.is_hidden || false,
          date_of_birth: profile?.date_of_birth,
          profile_picture: profile?.profile_picture,
          account_number: profile?.account_number,
          custom_user_id: profile?.custom_user_id,
          email: profile?.email || "N/A",
          first_name: profile?.first_name && profile.first_name.trim() !== '' ? profile.first_name : "N/A",
          last_name: profile?.last_name && profile.last_name.trim() !== '' ? profile.last_name : "N/A",
          phone_number: (profile as any)?.phone_number || null,
          roles: userRoles
            ?.filter((ur) => ur.user_id === userId)
            .map((ur) => ur.role) || [],
          permissions: userPermissions
            ?.filter((up) => up.user_id === userId)
            .map((up) => up.permission) || [],
        };
      });

      setUsers(usersWithRoles);
      setFilteredUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: "admin" | "staff" | "user") => {
    try {
      // Check if user already has this role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", userId)
        .eq("role", newRole)
        .single();

      if (existingRole) {
        toast({
          title: "Info",
          description: "User already has this role",
        });
        return;
      }

      // Add the new role
      const { error } = await supabase
        .from("user_roles")
        .insert([{ role: newRole, user_id: userId }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Role assigned successfully",
      });

      fetchUsers();
    } catch (error) {
      console.error("Error assigning role:", error);
      toast({
        title: "Error",
        description: "Failed to assign role",
        variant: "destructive",
      });
    }
  };

  const handleRemoveRole = async (userId: string, role: "admin" | "staff" | "user") => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Role removed successfully",
      });

      fetchUsers();
    } catch (error) {
      console.error("Error removing role:", error);
      toast({
        title: "Error",
        description: "Failed to remove role",
        variant: "destructive",
      });
    }
  };

  const viewUserDetails = async (user: UserWithRoles) => {
    setSelectedUser(user);
    setUserDetailsOpen(true);

    // Fetch user's wallet balance
    const { data: walletData } = await supabase
      .from("wallet_balances")
      .select("balance, withdrawable_balance")
      .eq("user_id", user.user_id)
      .single();

    setWalletBalance(walletData?.balance || 0);
    setWithdrawableBalance(walletData?.withdrawable_balance || 0);

    // Fetch phone number from profiles table
    const { data: profileData } = await supabase
      .from("profiles")
      .select("phone_number")
      .eq("user_id", user.user_id)
      .single();
    
    setPhoneNumber((profileData as any)?.phone_number || user.phone_number || null);

    // Fetch user's transactions (Top Up Wallet)
    const { data: transData } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.user_id)
      .order("created_at", { ascending: false });

    setTransactions(transData || []);

    // Fetch user's gold purchases (Buy Gold)
    const { data: goldData } = await supabase
      .from("gold_purchases")
      .select("*")
      .eq("user_id", user.user_id)
      .order("created_at", { ascending: false });

    setGoldPurchases(goldData || []);

    // Fetch user's gold sales (Sell Gold)
    const { data: goldSalesData } = await supabase
      .from("gold_sales")
      .select("*")
      .eq("user_id", user.user_id)
      .order("created_at", { ascending: false });

    setGoldSales(goldSalesData || []);

    // Fetch user's withdrawals
    const { data: withdrawalData } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("user_id", user.user_id)
      .order("created_at", { ascending: false });

    setWithdrawals(withdrawalData || []);

    // Fetch user's investments
    const { data: investData } = await supabase
      .from("user_investments")
      .select("*")
      .eq("user_id", user.user_id)
      .order("created_at", { ascending: false });

    setInvestments(investData || []);
  };

  const handleOpenPermissionsDialog = (user: UserWithRoles) => {
    setSelectedUser(user);
    setPermissionsDialogOpen(true);
  };

  const handlePermissionToggle = async (userId: string, permission: PermissionType, currentPermissions: string[]) => {
    try {
      const hasPermission = currentPermissions.includes(permission);

      if (hasPermission) {
        // Remove permission
        const { error } = await supabase
          .from("user_permissions")
          .delete()
          .eq("user_id", userId)
          .eq("permission", permission);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Permission removed successfully",
        });
      } else {
        // Add permission
        const { error } = await supabase
          .from("user_permissions")
          .insert([{ user_id: userId, permission }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Permission granted successfully",
        });
      }

      fetchUsers();
    } catch (error) {
      console.error("Error toggling permission:", error);
      toast({
        title: "Error",
        description: "Failed to update permission",
        variant: "destructive",
      });
    }
  };

  const toggleRoleFilter = (role: string) => {
    setRoleFilter((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const isHidden = newStatus === 'frozen' || newStatus === 'deactivated';
      const { error } = await supabase
        .from("profiles")
        .update({ 
          is_hidden: isHidden,
          account_status: newStatus 
        })
        .eq("user_id", userId);

      if (error) throw error;

      // If freezing account, send notification and chat message
      if (newStatus === 'frozen') {
        // Create notification for the user
        await supabase.rpc('create_notification', {
          p_user_id: userId,
          p_title: 'Account Frozen',
          p_message: 'Your account is frozen. If you want to unfreeze your account, please contact Customer Service.',
          p_type: 'account_freeze',
          p_related_id: null
        });

        // Create or get existing chat conversation
        const { data: existingConv } = await supabase
          .from('chat_conversations')
          .select('id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const frozenMessage = '⚠️ Your account is frozen. If you want to unfreeze your account, please contact Customer Service. Customer Service will guide you on how to resolve this issue and explain why your account is in this status.';

        if (existingConv) {
          const { data: { user: currentAdmin } } = await supabase.auth.getUser();
          if (currentAdmin) {
            await supabase.from('chat_messages').insert({
              conversation_id: existingConv.id,
              sender_id: currentAdmin.id,
              message: frozenMessage
            });
          }
        } else {
          const { data: newConv } = await supabase
            .from('chat_conversations')
            .insert({
              user_id: userId,
              subject: 'Account Frozen Notice',
              status: 'open'
            })
            .select('id')
            .single();
          
          if (newConv) {
            const { data: { user: currentAdmin } } = await supabase.auth.getUser();
            if (currentAdmin) {
              await supabase.from('chat_messages').insert({
                conversation_id: newConv.id,
                sender_id: currentAdmin.id,
                message: frozenMessage
              });
            }
          }
        }
      }

      toast({
        title: "Success",
        description: `Account status changed to ${newStatus}`,
      });

      fetchUsers();
    } catch (error) {
      console.error("Error changing account status:", error);
      toast({
        title: "Error",
        description: "Failed to update account status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (status) {
      case 'frozen': return 'destructive';
      case 'deactivated': return 'secondary';
      case 'unfrozen': return 'outline';
      default: return 'default';
    }
  };

  const handleOpenEditDialog = (user: UserWithRoles) => {
    setSelectedUser(user);
    setEditForm({ username: user.username, country: user.country });
    setEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser || !editForm.username || !editForm.country) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: editForm.username,
          country: editForm.country,
        })
        .eq("user_id", selectedUser.user_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User updated successfully",
      });

      setEditDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const handleOpenDeleteDialog = (user: UserWithRoles) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      // Delete user's profile (cascade will handle related data)
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("user_id", selectedUser.user_id);

      if (profileError) throw profileError;

      // Delete from auth.users using admin API
      const { error: authError } = await supabase.auth.admin.deleteUser(
        selectedUser.user_id
      );

      if (authError) throw authError;

      toast({
        title: "Success",
        description: "User deleted successfully",
      });

      setDeleteDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "Failed to delete user. The user may have associated data that prevents deletion.",
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = () => {
    const exportData = filteredUsers.map(user => ({
      user_id: user.user_id,
      username: user.username,
      email: user.email || "N/A",
      country: user.country,
      roles: user.roles.join(", "),
      permissions: user.permissions?.join(", ") || "",
      kyc_status: user.kyc_status || "pending",
      is_frozen: user.is_hidden ? "Yes" : "No",
      created_at: new Date(user.created_at).toLocaleDateString(),
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `users_export_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast({
      title: "Success",
      description: "Users exported to CSV successfully",
    });
  };

  const handleExportExcel = () => {
    const exportData = filteredUsers.map(user => ({
      "User ID": user.user_id,
      "Username": user.username,
      "Email": user.email || "N/A",
      "Country": user.country,
      "Roles": user.roles.join(", "),
      "Permissions": user.permissions?.join(", ") || "",
      "KYC Status": user.kyc_status || "pending",
      "Frozen": user.is_hidden ? "Yes" : "No",
      "Created At": new Date(user.created_at).toLocaleDateString(),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    XLSX.writeFile(wb, `users_export_${new Date().toISOString().split("T")[0]}.xlsx`);

    toast({
      title: "Success",
      description: "Users exported to Excel successfully",
    });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (fileExtension === "csv") {
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          await processImportedData(results.data as any[]);
        },
        error: (error) => {
          toast({
            title: "Error",
            description: `Failed to parse CSV: ${error.message}`,
            variant: "destructive",
          });
        },
      });
    } else if (fileExtension === "xlsx" || fileExtension === "xls") {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          await processImportedData(jsonData as any[]);
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to parse Excel file",
            variant: "destructive",
          });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast({
        title: "Error",
        description: "Please upload a CSV or Excel file",
        variant: "destructive",
      });
    }

    // Reset file input
    event.target.value = "";
  };

  const processImportedData = async (data: any[]) => {
    let successCount = 0;
    let errorCount = 0;

    for (const row of data) {
      try {
        const userId = row.user_id || row["User ID"];
        const username = row.username || row["Username"];
        const country = row.country || row["Country"];

        if (!userId || !username || !country) {
          errorCount++;
          continue;
        }

        // Update profile
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ username, country })
          .eq("user_id", userId);

        if (profileError) {
          errorCount++;
          continue;
        }

        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    toast({
      title: successCount > 0 ? "Import Complete" : "Import Failed",
      description: `Successfully updated ${successCount} users. ${errorCount} errors.`,
      variant: errorCount > 0 ? "destructive" : "default",
    });

    fetchUsers();
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              User Management
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                Total Users: {users.length}
              </Badge>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="gap-2"
                >
                  <FileDown className="w-4 h-4" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  className="gap-2"
                >
                  <FileDown className="w-4 h-4" />
                  Export Excel
                </Button>
                <label htmlFor="import-file">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 cursor-pointer"
                    asChild
                  >
                    <span>
                      <FileUp className="w-4 h-4" />
                      Import
                    </span>
                  </Button>
                </label>
                <input
                  id="import-file"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleImport}
                  className="hidden"
                />
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by username, email, or user ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Role Filter */}
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-4">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filter by Role:</span>
                  <div className="flex gap-4">
                    {["user", "admin", "staff"].map((role) => (
                      <div key={role} className="flex items-center gap-2">
                        <Checkbox
                          id={`filter-${role}`}
                          checked={roleFilter.includes(role)}
                          onCheckedChange={() => toggleRoleFilter(role)}
                        />
                        <label
                          htmlFor={`filter-${role}`}
                          className="text-sm capitalize cursor-pointer"
                        >
                          {role}
                        </label>
                      </div>
                    ))}
                  </div>
                  {roleFilter.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRoleFilter([])}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <p className="text-muted-foreground text-center py-8">
              Loading users...
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Actions</TableHead>
                    <TableHead>Manage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.username}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email || "N/A"}
                      </TableCell>
                      <TableCell>{user.country}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <Badge
                              key={role}
                              variant={
                                role === "admin"
                                  ? "default"
                                  : role === "staff"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {role}
                            </Badge>
                          ))}
                          {user.roles.length === 0 && (
                            <span className="text-sm text-muted-foreground">
                              No roles
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.account_status || 'active'}
                          onValueChange={(value) => handleStatusChange(user.user_id, value)}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue>
                              <Badge variant={getStatusBadgeVariant(user.account_status || 'active')}>
                                {(user.account_status || 'active').charAt(0).toUpperCase() + (user.account_status || 'active').slice(1)}
                              </Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-background border z-50">
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="deactivated">Deactivate</SelectItem>
                            <SelectItem value="frozen">Freeze</SelectItem>
                            <SelectItem value="unfrozen">Unfreeze</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                       <TableCell>
                         <div className="flex gap-2">
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => viewUserDetails(user)}
                           >
                             <Eye className="w-4 h-4 mr-1" />
                             View
                           </Button>
                           <Button
                             variant="secondary"
                             size="sm"
                             onClick={() => {
                               setSelectedUser(user);
                               setTransactionsDialogOpen(true);
                             }}
                           >
                             Transactions
                           </Button>
                         </div>
                       </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenEditDialog(user)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleOpenDeleteDialog(user)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-8"
                      >
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissions Dialog */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Permissions: {selectedUser?.username}</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Select which features this user can access in the admin dashboard:
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {availablePermissions.map(({ value, label }) => (
                  <div 
                    key={value} 
                    className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => 
                      handlePermissionToggle(
                        selectedUser.user_id, 
                        value,
                        selectedUser.permissions || []
                      )
                    }
                  >
                    <Checkbox
                      id={`permission-${value}`}
                      checked={selectedUser.permissions?.includes(value) || false}
                      className="pointer-events-none"
                    />
                    <label
                      htmlFor={`permission-${value}`}
                      className="text-sm font-medium leading-none cursor-pointer flex-1"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                <p className="text-sm font-semibold mb-3">Currently Assigned:</p>
                {selectedUser.permissions && selectedUser.permissions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.permissions.map((perm) => (
                      <Badge key={perm} variant="secondary" className="text-xs px-2 py-1">
                        {availablePermissions.find(p => p.value === perm)?.label || perm}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No permissions assigned</span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User: {selectedUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                placeholder="Enter username"
              />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={editForm.country}
                onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                placeholder="Enter country"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateUser}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete user <strong>{selectedUser?.username}</strong>? 
              This action cannot be undone and will delete all associated data including:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>User profile</li>
              <li>Gold purchases and sales</li>
              <li>Investments</li>
              <li>Transactions</li>
              <li>Wallet balance</li>
            </ul>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteUser}>
                Delete User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>User Details: {selectedUser?.username}</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="relative">
              {/* Scroll Up Button */}
              {canScrollUp && (
                <button
                  onClick={scrollDetailsUp}
                  className="absolute top-0 right-4 z-10 p-2 bg-primary/80 hover:bg-primary rounded-full shadow-lg"
                >
                  <ChevronUp className="h-5 w-5 text-primary-foreground" />
                </button>
              )}

              <div 
                ref={detailsScrollRef}
                onScroll={checkDetailsScroll}
                className="px-6 pb-6 space-y-4 max-h-[calc(90vh-100px)] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent"
              >
                {/* Profile Picture */}
                {selectedUser.profile_picture && (
                  <div className="flex justify-center">
                    <img
                      src={selectedUser.profile_picture}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover border-2 border-primary"
                    />
                  </div>
                )}

                {/* Basic Info Section */}
                <Card className="bg-primary/10 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Basic Info</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">User ID</p>
                      <p className="font-mono font-semibold">{selectedUser.custom_user_id || selectedUser.user_id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Username</p>
                      <p className="font-medium">{selectedUser.username}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">First Name</p>
                      <p>{selectedUser.first_name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Last Name</p>
                      <p>{selectedUser.last_name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Country</p>
                      <p>{selectedUser.country}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date of Birth</p>
                      <p>{selectedUser.date_of_birth ? new Date(selectedUser.date_of_birth).toLocaleDateString() : "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Joined</p>
                      <p>{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Info Section */}
                <Card className="bg-secondary/10 border-secondary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Contact Info</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="break-all">{selectedUser.email || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone Number</p>
                      <p>{phoneNumber || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Account Number</p>
                      <p className="font-mono">{selectedUser.account_number || "N/A"}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* KYC Info Section */}
                <Card className="bg-accent/10 border-accent/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">KYC Info</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge
                        variant={selectedUser.kyc_status === "verified" ? "default" : selectedUser.kyc_status === "submitted" ? "secondary" : "outline"}
                        className="mt-1"
                      >
                        {selectedUser.kyc_status || "Not Submitted"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Proof Type</p>
                      <p>{selectedUser.kyc_proof_type || "N/A"}</p>
                    </div>
                    {selectedUser.kyc_proof_url && (
                      <div className="col-span-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const pathParts = selectedUser.kyc_proof_url!.split('/');
                            const filePath = pathParts.slice(pathParts.indexOf('proofs')).join('/');
                            const { data } = await supabase.storage.from('kyc-documents').createSignedUrl(filePath, 60);
                            if (data?.signedUrl) {
                              const link = document.createElement('a');
                              link.href = data.signedUrl;
                              link.download = 'kyc-document';
                              link.click();
                            }
                          }}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download KYC Document
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Wallet Balance Section */}
                <Card className="bg-muted/10 border-muted/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Wallet Balance</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Balance</p>
                      <p className="text-xl font-bold">{Number(walletBalance).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Withdrawable Balance</p>
                      <p className="text-xl font-bold">{Number(withdrawableBalance).toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions Section */}
                <Card className="bg-card/50 border-border/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Account Status:</span>
                      <Badge variant={selectedUser.is_hidden ? "destructive" : "default"} className={selectedUser.is_hidden ? "" : "bg-green-600"}>
                        {selectedUser.is_hidden ? "Frozen" : "Active"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(selectedUser)}>
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit User
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStatusChange(selectedUser.user_id, 'frozen')}
                        disabled={selectedUser.account_status === 'frozen'}
                      >
                        Account Freeze
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleStatusChange(selectedUser.user_id, 'unfrozen')}
                        disabled={selectedUser.account_status !== 'frozen'}
                      >
                        Unfreeze
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Up Wallet (Transactions) */}
                <Card className="relative">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Top Up Wallet ({transactions.length})</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => document.getElementById('topup-scroll')?.scrollBy({ top: -100, behavior: 'smooth' })}>
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => document.getElementById('topup-scroll')?.scrollBy({ top: 100, behavior: 'smooth' })}>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div id="topup-scroll" className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">Amount</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions.map((trans) => (
                            <TableRow key={trans.id}>
                              <TableCell className="text-xs">{new Date(trans.created_at).toLocaleDateString()}</TableCell>
                              <TableCell className="text-xs">{Number(trans.amount).toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge variant={trans.status === "approved" ? "default" : trans.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                                  {trans.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          {transactions.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground text-xs">No transactions</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Buy Gold (Gold Purchases) */}
                <Card className="relative">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Buy Gold ({goldPurchases.length})</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => document.getElementById('buygold-scroll')?.scrollBy({ top: -100, behavior: 'smooth' })}>
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => document.getElementById('buygold-scroll')?.scrollBy({ top: 100, behavior: 'smooth' })}>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div id="buygold-scroll" className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">Grams</TableHead>
                            <TableHead className="text-xs">Cost</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {goldPurchases.map((purchase) => (
                            <TableRow key={purchase.id}>
                              <TableCell className="text-xs">{new Date(purchase.created_at).toLocaleDateString()}</TableCell>
                              <TableCell className="text-xs">{Number(purchase.gold_amount_grams).toFixed(4)}g</TableCell>
                              <TableCell className="text-xs">{Number(purchase.total_cost).toLocaleString()}</TableCell>
                              <TableCell>
                                {purchase.status === 'locked' ? (
                                  <span className="text-xs">🔒 {new Date(purchase.maturity_date).toLocaleDateString()}</span>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">Mature</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                          {goldPurchases.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground text-xs">No gold purchases</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Gold Holdings Summary */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Gold Holdings Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Gold</p>
                      <p className="text-lg font-bold">{goldPurchases.reduce((sum, p) => sum + Number(p.gold_amount_grams), 0).toFixed(4)}g</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Mature Gold</p>
                      <p className="text-lg font-bold text-green-500">{goldPurchases.filter(p => p.status !== 'locked').reduce((sum, p) => sum + Number(p.gold_amount_grams), 0).toFixed(4)}g</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Locked Gold</p>
                      <p className="text-lg font-bold text-yellow-500">{goldPurchases.filter(p => p.status === 'locked').reduce((sum, p) => sum + Number(p.gold_amount_grams), 0).toFixed(4)}g</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Cost</p>
                      <p className="text-lg font-bold">{goldPurchases.reduce((sum, p) => sum + Number(p.total_cost), 0).toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Sell Gold (Gold Sales) */}
                <Card className="relative">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Sell Gold ({goldSales.length})</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => document.getElementById('sellgold-scroll')?.scrollBy({ top: -100, behavior: 'smooth' })}>
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => document.getElementById('sellgold-scroll')?.scrollBy({ top: 100, behavior: 'smooth' })}>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div id="sellgold-scroll" className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">Grams</TableHead>
                            <TableHead className="text-xs">Amount</TableHead>
                            <TableHead className="text-xs">Profit</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {goldSales.map((sale) => (
                            <TableRow key={sale.id}>
                              <TableCell className="text-xs">{new Date(sale.created_at).toLocaleDateString()}</TableCell>
                              <TableCell className="text-xs">{Number(sale.gold_amount_grams).toFixed(4)}g</TableCell>
                              <TableCell className="text-xs">{Number(sale.total_amount).toLocaleString()}</TableCell>
                              <TableCell className="text-xs text-green-500">+{Number(sale.profit_amount).toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                          {goldSales.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground text-xs">No gold sales</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Investment Plans */}
                <Card className="relative">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Investments ({investments.length})</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => document.getElementById('investments-scroll')?.scrollBy({ top: -100, behavior: 'smooth' })}>
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => document.getElementById('investments-scroll')?.scrollBy({ top: 100, behavior: 'smooth' })}>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div id="investments-scroll" className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">Amount</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs">Withdraw Available</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {investments.map((investment) => (
                            <TableRow key={investment.id}>
                              <TableCell className="text-xs">{new Date(investment.created_at).toLocaleDateString()}</TableCell>
                              <TableCell className="text-xs">{Number(investment.amount_invested).toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge variant={investment.status === "active" ? "default" : investment.status === "matured" ? "secondary" : "outline"} className="text-xs">
                                  {investment.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">{new Date(investment.end_date).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))}
                          {investments.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground text-xs">No investments</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Withdrawal Wallet */}
                <Card className="relative">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Withdrawal Wallet ({withdrawals.length})</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => document.getElementById('withdrawal-scroll')?.scrollBy({ top: -100, behavior: 'smooth' })}>
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => document.getElementById('withdrawal-scroll')?.scrollBy({ top: 100, behavior: 'smooth' })}>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div id="withdrawal-scroll" className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">Amount</TableHead>
                            <TableHead className="text-xs">Account</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {withdrawals.map((withdrawal) => (
                            <TableRow key={withdrawal.id}>
                              <TableCell className="text-xs">{new Date(withdrawal.created_at).toLocaleDateString()}</TableCell>
                              <TableCell className="text-xs">{Number(withdrawal.amount).toLocaleString()}</TableCell>
                              <TableCell className="text-xs font-mono">{withdrawal.account_number || "N/A"}</TableCell>
                              <TableCell>
                                <Badge variant={withdrawal.status === "approved" ? "default" : withdrawal.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                                  {withdrawal.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          {withdrawals.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground text-xs">No withdrawals</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Scroll Down Button */}
              {canScrollDown && (
                <button
                  onClick={scrollDetailsDown}
                  className="absolute bottom-2 right-4 z-10 p-2 bg-primary/80 hover:bg-primary rounded-full shadow-lg"
                >
                  <ChevronDown className="h-5 w-5 text-primary-foreground" />
                </button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* User Transactions Dialog */}
      <Dialog open={transactionsDialogOpen} onOpenChange={setTransactionsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-auto">
          {selectedUser && (
            <AdminUserTransactions
              userId={selectedUser.user_id}
              username={selectedUser.username}
              isHidden={selectedUser.is_hidden}
              accountStatus={selectedUser.account_status || 'active'}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
