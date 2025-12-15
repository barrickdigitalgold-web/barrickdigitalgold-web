import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Menu } from "lucide-react";
import { AdminTransactions } from "@/components/admin/AdminTransactions";
import { AdminPaymentMethods } from "@/components/admin/AdminPaymentMethods";
import { AdminInvestmentPlans } from "@/components/admin/AdminInvestmentPlans";
import { AdminWithdrawals } from "@/components/admin/AdminWithdrawals";
import { AdminGoldSettings } from "@/components/admin/AdminGoldSettings";
import { AdminCustomerSupport } from "@/components/admin/AdminCustomerSupport";
import { AdminUserManagement } from "@/components/admin/AdminUserManagement";
import { AdminPromotionalOffers } from "@/components/admin/AdminPromotionalOffers";
import { AdminUserRoles } from "@/components/admin/AdminUserRoles";
import { AdminCustomerStatus } from "@/components/admin/AdminCustomerStatus";

const AdminDashboard = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCounts, setPendingCounts] = useState({
    transactions: 0,
    withdrawals: 0,
    users: 0,
    support: 0
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
    fetchPendingCounts();

    // Set up real-time subscriptions for pending counts
    const transactionsChannel = supabase
      .channel('transactions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchPendingCounts)
      .subscribe();

    const withdrawalsChannel = supabase
      .channel('withdrawals_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests' }, fetchPendingCounts)
      .subscribe();

    const profilesChannel = supabase
      .channel('profiles_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchPendingCounts)
      .subscribe();

    const messagesChannel = supabase
      .channel('messages_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, fetchPendingCounts)
      .subscribe();

    return () => {
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(withdrawalsChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user has admin or staff role
      const { data: isAdminRole, error: adminError } = await supabase
        .rpc("has_role", { _user_id: user.id, _role: "admin" });
      
      const { data: isStaffRole, error: staffError } = await supabase
        .rpc("has_role", { _user_id: user.id, _role: "staff" });

      if (adminError || staffError) throw adminError || staffError;

      if (!isAdminRole && !isStaffRole) {
        toast({
          title: "Access Denied",
          description: "You don't have admin or staff privileges",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);

      // Fetch user permissions
      const { data: permissions, error: permError } = await supabase
        .from("user_permissions")
        .select("permission")
        .eq("user_id", user.id);

      if (permError) throw permError;

      const userPerms = permissions?.map(p => p.permission) || [];
      setUserPermissions(userPerms);

      // Set default active section based on first available permission
      if (userPerms.length > 0) {
        const menuItems = [
          { id: 'transactions', permission: 'transactions' as const },
          { id: 'withdrawals', permission: 'withdrawals' as const },
          { id: 'payment-methods', permission: 'payment_methods' as const },
          { id: 'investment-plans', permission: 'investment_plans' as const },
          { id: 'gold-settings', permission: 'gold_settings' as const },
          { id: 'user-roles', permission: 'user_roles' as const },
          { id: 'users', permission: 'users' as const },
          { id: 'customer-status', permission: 'customer_status' as const },
          { id: 'promotional', permission: 'promotions' as const },
          { id: 'support', permission: 'support' as const },
        ];
        
        const firstAvailable = menuItems.find(item => userPerms.includes(item.permission));
        if (firstAvailable) {
          setActiveSection(firstAvailable.id);
        }
      }

    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch last viewed timestamps for all sections
      const { data: viewData } = await supabase
        .from("admin_section_views")
        .select("section_name, last_viewed_at")
        .eq("admin_user_id", user.id);

      const lastViewed: Record<string, string> = {};
      viewData?.forEach(v => {
        lastViewed[v.section_name] = v.last_viewed_at;
      });

      // Fetch unread transactions (created after last viewed or never viewed)
      const txQuery = supabase
        .from("transactions")
        .select("*", { count: 'exact', head: true })
        .eq("status", "pending");
      
      if (lastViewed['transactions']) {
        txQuery.gt("created_at", lastViewed['transactions']);
      }
      const { count: txCount } = await txQuery;

      // Fetch unread withdrawals
      const wdQuery = supabase
        .from("withdrawal_requests")
        .select("*", { count: 'exact', head: true })
        .eq("status", "pending");
      
      if (lastViewed['withdrawals']) {
        wdQuery.gt("created_at", lastViewed['withdrawals']);
      }
      const { count: wdCount } = await wdQuery;

      // Fetch unread KYC (pending users)
      const kycQuery = supabase
        .from("profiles")
        .select("*", { count: 'exact', head: true })
        .eq("kyc_status", "pending");
      
      if (lastViewed['users']) {
        kycQuery.gt("updated_at", lastViewed['users']);
      }
      const { count: kycCount } = await kycQuery;

      // Get staff/admin user IDs
      const { data: staffRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "staff"]);

      const staffUserIds = staffRoles?.map(r => r.user_id) || [];

      // Fetch unread messages (messages from users created after last viewed)
      const { data: conversations } = await supabase
        .from("chat_conversations")
        .select("id");

      let unreadCount = 0;
      if (conversations) {
        for (const conv of conversations) {
          const messageQuery = supabase
            .from("chat_messages")
            .select("sender_id, created_at")
            .eq("conversation_id", conv.id)
            .not("sender_id", "in", `(${staffUserIds.join(",")})`);
          
          if (lastViewed['support']) {
            messageQuery.gt("created_at", lastViewed['support']);
          }

          const { data: messages } = await messageQuery;
          
          if (messages) {
            unreadCount += messages.length;
          }
        }
      }

      setPendingCounts({
        transactions: txCount || 0,
        withdrawals: wdCount || 0,
        users: kycCount || 0,
        support: unreadCount
      });
    } catch (error) {
      console.error("Error fetching pending counts:", error);
    }
  };

  const markSectionAsViewed = async (sectionName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upsert the last viewed timestamp
      await supabase
        .from("admin_section_views")
        .upsert({
          admin_user_id: user.id,
          section_name: sectionName,
          last_viewed_at: new Date().toISOString()
        }, {
          onConflict: 'admin_user_id,section_name'
        });

      // Refresh counts after marking as viewed
      await fetchPendingCounts();
    } catch (error) {
      console.error("Error marking section as viewed:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const menuItems = [
    { id: 'transactions', label: 'Transactions', permission: 'transactions', count: pendingCounts.transactions },
    { id: 'withdrawals', label: 'Withdrawals', permission: 'withdrawals', count: pendingCounts.withdrawals },
    { id: 'payment-methods', label: 'Payments', permission: 'payment_methods', count: 0 },
    { id: 'investment-plans', label: 'Investments', permission: 'investment_plans', count: 0 },
    { id: 'gold-settings', label: 'Gold Settings', permission: 'gold_settings', count: 0 },
    { id: 'user-roles', label: 'User Roles', permission: 'user_roles', count: 0 },
    { id: 'users', label: 'User Management', permission: 'users', count: pendingCounts.users },
    { id: 'customer-status', label: 'Customer Status', permission: 'customer_status', count: 0 },
    { id: 'promotional', label: 'Promotions', permission: 'promotions', count: 0 },
    { id: 'support', label: 'Support', permission: 'support', count: pendingCounts.support },
  ];

  const visibleMenuItems = menuItems.filter(item => userPermissions.includes(item.permission));

  const renderContent = () => {
    switch (activeSection) {
      case 'transactions':
        return userPermissions.includes('transactions') ? <AdminTransactions /> : null;
      case 'withdrawals':
        return userPermissions.includes('withdrawals') ? <AdminWithdrawals /> : null;
      case 'payment-methods':
        return userPermissions.includes('payment_methods') ? <AdminPaymentMethods /> : null;
      case 'investment-plans':
        return userPermissions.includes('investment_plans') ? <AdminInvestmentPlans /> : null;
      case 'gold-settings':
        return userPermissions.includes('gold_settings') ? <AdminGoldSettings /> : null;
      case 'user-roles':
        return userPermissions.includes('user_roles') ? <AdminUserRoles /> : null;
      case 'users':
        return userPermissions.includes('users') ? <AdminUserManagement /> : null;
      case 'customer-status':
        return userPermissions.includes('customer_status') ? <AdminCustomerStatus /> : null;
      case 'promotional':
        return userPermissions.includes('promotions') ? <AdminPromotionalOffers /> : null;
      case 'support':
        return userPermissions.includes('support') ? <AdminCustomerSupport /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-card border-r border-border flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="p-6 border-b border-border flex-shrink-0">
          <h1 className="text-xl font-display text-primary">Admin Dashboard</h1>
        </div>

        {/* Navigation - Scrollable */}
        <ScrollArea className="flex-1 px-4">
          <nav className="py-4 space-y-2">
            {visibleMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setSidebarOpen(false);
                  // Mark section as viewed to decrease unread count
                  markSectionAsViewed(item.id);
                }}
                className={`
                  w-full text-left px-4 py-3 rounded-lg
                  transition-colors duration-200
                  flex items-center justify-between
                  ${activeSection === item.id 
                    ? 'bg-primary/20 text-primary font-medium' 
                    : 'text-foreground hover:bg-accent'
                  }
                `}
              >
                <span>{item.label}</span>
                {item.count > 0 && (
                  <Badge variant="default" className="bg-red-500 text-white hover:bg-red-600">
                    {item.count}
                  </Badge>
                )}
              </button>
            ))}
          </nav>
        </ScrollArea>

        {/* Logout Button */}
        <div className="p-4 border-t border-border flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="w-full"
          >
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar for Mobile */}
        <div className="lg:hidden border-b border-border bg-card p-4 flex justify-between items-center flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-display text-primary">Admin Dashboard</h1>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            size="sm"
          >
            Logout
          </Button>
        </div>

        {/* Content Area - Scrollable */}
        <ScrollArea className="flex-1">
          <main className="p-6">
            {renderContent()}
          </main>
        </ScrollArea>
      </div>
    </div>
  );
};

export default AdminDashboard;
