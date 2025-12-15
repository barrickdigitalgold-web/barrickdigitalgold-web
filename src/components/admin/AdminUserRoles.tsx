import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Trash2, Search, Settings, Check, X, ChevronUp, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface UserWithRole {
  user_id: string;
  username: string;
  email: string;
  country: string;
  roles: string[];
  permissions: string[];
}

const ALL_PERMISSIONS = [
  'transactions',
  'withdrawals',
  'payment_methods',
  'investment_plans',
  'gold_settings',
  'user_roles',
  'users',
  'promotions',
  'support'
] as const;

const PERMISSION_LABELS: Record<string, string> = {
  'transactions': 'Transactions',
  'withdrawals': 'Withdrawals',
  'payment_methods': 'Payment Methods',
  'investment_plans': 'Investment Plans',
  'gold_settings': 'Gold Settings',
  'user_roles': 'User Roles',
  'users': 'User Management',
  'promotions': 'Promotions',
  'support': 'Support'
};

export const AdminUserRoles = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<UserWithRole | null>(null);
  const { toast } = useToast();
  
  const permissionsScrollRef = useRef<HTMLDivElement>(null);
  const [permCanScrollUp, setPermCanScrollUp] = useState(false);
  const [permCanScrollDown, setPermCanScrollDown] = useState(false);

  const checkPermissionsScroll = () => {
    if (permissionsScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = permissionsScrollRef.current;
      setPermCanScrollUp(scrollTop > 0);
      setPermCanScrollDown(scrollTop + clientHeight < scrollHeight - 5);
    }
  };

  const scrollPermissionsUp = () => {
    permissionsScrollRef.current?.scrollBy({ top: -100, behavior: 'smooth' });
  };

  const scrollPermissionsDown = () => {
    permissionsScrollRef.current?.scrollBy({ top: 100, behavior: 'smooth' });
  };

  useEffect(() => {
    if (permissionDialogOpen) {
      setTimeout(checkPermissionsScroll, 100);
    }
  }, [permissionDialogOpen]);

  const openPermissionDialog = (user: UserWithRole) => {
    setSelectedUserForPermissions(user);
    setPermissionDialogOpen(true);
  };

  const closePermissionDialog = () => {
    setPermissionDialogOpen(false);
    setSelectedUserForPermissions(null);
  };

  useEffect(() => {
    fetchUsersWithRoles();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = users.filter(user => 
      user.username.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.user_id.toLowerCase().includes(searchLower) ||
      user.country.toLowerCase().includes(searchLower)
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const fetchUsersWithRoles = async () => {
    try {
      setLoading(true);
      
      // Fetch all user roles first to get all users with any role
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Get unique user IDs from roles
      const uniqueUserIds = [...new Set(rolesData?.map(r => r.user_id) || [])];

      // Fetch profiles for all users
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, username, country")
        .in("user_id", uniqueUserIds);

      if (profileError) throw profileError;

      // Fetch all permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .from("user_permissions")
        .select("user_id, permission")
        .in("user_id", uniqueUserIds);

      if (permissionsError) throw permissionsError;

      // Combine the data
      const usersWithRoles: UserWithRole[] = [];
      
      for (const userId of uniqueUserIds) {
        const profile = profiles?.find(p => p.user_id === userId);
        const userRoles = rolesData?.filter(r => r.user_id === userId).map(r => String(r.role)) || [];
        const userPermissions = permissionsData?.filter(p => p.user_id === userId).map(p => String(p.permission)) || [];
        
        // Fetch auth user data
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
        
        usersWithRoles.push({
          user_id: userId,
          username: profile?.username || "Unknown",
          email: authUser?.email || "N/A",
          country: profile?.country || "N/A",
          roles: userRoles,
          permissions: userPermissions,
        });
      }

      setUsers(usersWithRoles);
      setFilteredUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users with roles:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async (userId: string) => {
    const role = selectedRole[userId];
    if (!role) {
      toast({
        title: "Error",
        description: "Please select a role",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: role as "admin" | "staff" | "user" });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Error",
            description: "User already has this role",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Success",
        description: "Role assigned successfully",
      });
      
      await fetchUsersWithRoles();
      setSelectedRole(prev => ({ ...prev, [userId]: "" }));
    } catch (error) {
      console.error("Error assigning role:", error);
      toast({
        title: "Error",
        description: "Failed to assign role",
        variant: "destructive",
      });
    }
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role as "admin" | "staff" | "user");

      if (error) throw error;

      toast({
        title: "Success",
        description: "Role removed successfully",
      });
      
      await fetchUsersWithRoles();
    } catch (error) {
      console.error("Error removing role:", error);
      toast({
        title: "Error",
        description: "Failed to remove role",
        variant: "destructive",
      });
    }
  };

  const handlePermissionToggle = async (userId: string, permission: string, isChecked: boolean) => {
    try {
      if (isChecked) {
        // Add permission
        const { error } = await supabase
          .from("user_permissions")
          .insert({ 
            user_id: userId, 
            permission: permission as "transactions" | "withdrawals" | "payment_methods" | "investment_plans" | "gold_settings" | "user_roles" | "users" | "promotions" | "support"
          });

        if (error) {
          if (error.code === '23505') {
            toast({
              title: "Info",
              description: "User already has this permission",
            });
          } else {
            throw error;
          }
          return;
        }

        toast({
          title: "Success",
          description: "Permission granted",
        });

        // Update local state for dialog
        if (selectedUserForPermissions && selectedUserForPermissions.user_id === userId) {
          setSelectedUserForPermissions(prev => prev ? {
            ...prev,
            permissions: [...prev.permissions, permission]
          } : null);
        }
      } else {
        // Remove permission
        const { error } = await supabase
          .from("user_permissions")
          .delete()
          .eq("user_id", userId)
          .eq("permission", permission as "transactions" | "withdrawals" | "payment_methods" | "investment_plans" | "gold_settings" | "user_roles" | "users" | "promotions" | "support");

        if (error) throw error;

        toast({
          title: "Success",
          description: "Permission revoked",
        });

        // Update local state for dialog
        if (selectedUserForPermissions && selectedUserForPermissions.user_id === userId) {
          setSelectedUserForPermissions(prev => prev ? {
            ...prev,
            permissions: prev.permissions.filter(p => p !== permission)
          } : null);
        }
      }
      
      await fetchUsersWithRoles();
    } catch (error) {
      console.error("Error updating permission:", error);
      toast({
        title: "Error",
        description: "Failed to update permission",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Role Management</CardTitle>
        <CardDescription>
          Assign and manage roles for all users (Total Users: {users.length})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by User ID, Username, Email, or Country..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Current Roles</TableHead>
                <TableHead>Assign Role</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead>Permissions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {searchTerm ? "No users match your search" : "No users found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.country}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <div
                              key={role}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs"
                            >
                              {role}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 hover:bg-destructive/20"
                                onClick={() => handleRemoveRole(user.user_id, role)}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">No roles</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={selectedRole[user.user_id] || ""}
                        onValueChange={(value) =>
                          setSelectedRole((prev) => ({ ...prev, [user.user_id]: value }))
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleAssignRole(user.user_id)}
                        disabled={!selectedRole[user.user_id]}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Assign
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {user.permissions.length > 0 ? (
                            user.permissions.slice(0, 3).map((perm) => (
                              <span
                                key={perm}
                                className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                {PERMISSION_LABELS[perm] || perm}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-xs">No permissions</span>
                          )}
                          {user.permissions.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{user.permissions.length - 3} more
                            </span>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPermissionDialog(user)}
                          className="ml-2"
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Permissions Management Dialog */}
        <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Manage Permissions</DialogTitle>
              <DialogDescription>
                {selectedUserForPermissions && (
                  <span>
                    Managing permissions for <strong>{selectedUserForPermissions.username}</strong> ({selectedUserForPermissions.email})
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Select the permissions you want to grant to this user:
              </p>
              
              <div className="relative">
                {permCanScrollUp && (
                  <button
                    onClick={scrollPermissionsUp}
                    className="absolute top-0 right-2 z-10 p-1 bg-primary/80 hover:bg-primary rounded-full shadow-lg"
                  >
                    <ChevronUp className="h-4 w-4 text-primary-foreground" />
                  </button>
                )}
                
                <div 
                  ref={permissionsScrollRef}
                  onScroll={checkPermissionsScroll}
                  className="space-y-3 max-h-[280px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent"
                >
                  {ALL_PERMISSIONS.map((permission) => {
                  const isGranted = selectedUserForPermissions?.permissions.includes(permission) || false;
                  
                  return (
                    <div
                      key={permission}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isGranted 
                          ? 'bg-green-500/10 border-green-500/30' 
                          : 'bg-background border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`dialog-${permission}`}
                          checked={isGranted}
                          onCheckedChange={async (checked) => {
                            if (selectedUserForPermissions) {
                              await handlePermissionToggle(
                                selectedUserForPermissions.user_id,
                                permission,
                                checked as boolean
                              );
                            }
                          }}
                        />
                        <label
                          htmlFor={`dialog-${permission}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {PERMISSION_LABELS[permission] || permission}
                        </label>
                      </div>
                      
                      {isGranted ? (
                        <span className="flex items-center text-xs text-green-400">
                          <Check className="h-4 w-4 mr-1" />
                          Granted
                        </span>
                      ) : (
                        <span className="flex items-center text-xs text-muted-foreground">
                          <X className="h-4 w-4 mr-1" />
                          Not Granted
                        </span>
                      )}
                    </div>
                  );
                })}
                </div>
                
                {permCanScrollDown && (
                  <button
                    onClick={scrollPermissionsDown}
                    className="absolute bottom-0 right-2 z-10 p-1 bg-primary/80 hover:bg-primary rounded-full shadow-lg"
                  >
                    <ChevronDown className="h-4 w-4 text-primary-foreground" />
                  </button>
                )}
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={closePermissionDialog}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
