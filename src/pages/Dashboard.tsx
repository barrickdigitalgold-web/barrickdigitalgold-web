import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Wallet, TrendingUp, Package, MessageSquare, LogOut, User as UserIcon, Menu, TrendingDown, DollarSign, ChevronUp, ChevronDown, AlertTriangle } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TopUpDialog } from "@/components/TopUpDialog";
import { BuyGoldDialog } from "@/components/BuyGoldDialog";
import { InvestmentPlansDialog } from "@/components/InvestmentPlansDialog";
import { ActiveInvestmentsDialog } from "@/components/ActiveInvestmentsDialog";
import { TransactionHistoryDialog } from "@/components/TransactionHistoryDialog";
import { FilteredTransactionDialog } from "@/components/FilteredTransactionDialog";
import { GoldHoldingsDialog } from "@/components/GoldHoldingsDialog";
import { WithdrawalDialog } from "@/components/WithdrawalDialog";
import { SellGoldDialog } from "@/components/SellGoldDialog";
import { TransactionHistory } from "@/components/TransactionHistory";
import { FloatingChatSupport } from "@/components/FloatingChatSupport";
import { ManualGoldPrice } from "@/components/ManualGoldPrice";
import { PromotionalBanner } from "@/components/PromotionalBanner";
import { getCurrencySymbol } from "@/lib/currencyUtils";
import { UserProfileDialog } from "@/components/UserProfileDialog";
import { KYCPromptDialog } from "@/components/KYCPromptDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import barrickLogo from "@/assets/barrick-logo.png";

interface Profile {
  username: string;
  country: string;
  profile_picture: string | null;
  custom_user_id?: string | null;
  user_id?: string;
  date_of_birth: string | null;
  kyc_proof_type: string | null;
  kyc_proof_url: string | null;
  account_number: string | null;
  kyc_status: string | null;
  is_hidden?: boolean;
  account_status?: string;
}

interface WalletBalance {
  balance: number;
  withdrawable_balance: number;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [withdrawableBalance, setWithdrawableBalance] = useState<number>(0);
  const [goldHoldings, setGoldHoldings] = useState<number>(0);
  const [goldTotalReturn, setGoldTotalReturn] = useState<number>(0);
  const [activeInvestments, setActiveInvestments] = useState<number>(0);
  const [investmentsTotalReturn, setInvestmentsTotalReturn] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [buyGoldOpen, setBuyGoldOpen] = useState(false);
  const [investmentPlansOpen, setInvestmentPlansOpen] = useState(false);
  const [activeInvestmentsOpen, setActiveInvestmentsOpen] = useState(false);
  const [showOnlyMaturedInvestments, setShowOnlyMaturedInvestments] = useState(false);
  const [transactionHistoryOpen, setTransactionHistoryOpen] = useState(false);
  const [topUpHistoryOpen, setTopUpHistoryOpen] = useState(false);
  const [buyGoldHistoryOpen, setBuyGoldHistoryOpen] = useState(false);
  const [sellGoldHistoryOpen, setSellGoldHistoryOpen] = useState(false);
  const [investmentHistoryOpen, setInvestmentHistoryOpen] = useState(false);
  const [menuUnreadCount, setMenuUnreadCount] = useState(0);
  const [topUpUnreadCount, setTopUpUnreadCount] = useState(0);
  const [buyGoldUnreadCount, setBuyGoldUnreadCount] = useState(0);
  const [sellGoldUnreadCount, setSellGoldUnreadCount] = useState(0);
  const [investmentUnreadCount, setInvestmentUnreadCount] = useState(0);
  const [investmentsUnreadCount, setInvestmentsUnreadCount] = useState(0);
  const [goldHoldingsUnreadCount, setGoldHoldingsUnreadCount] = useState(0);
  const [withdrawalUnreadCount, setWithdrawalUnreadCount] = useState(0);
  const [walletBalanceUnreadCount, setWalletBalanceUnreadCount] = useState(0);
  const [goldHoldingsOpen, setGoldHoldingsOpen] = useState(false);
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [sellGoldOpen, setSellGoldOpen] = useState(false);
  const [investmentsHistoryOpen, setInvestmentsHistoryOpen] = useState(false);
  const [goldHoldingsHistoryOpen, setGoldHoldingsHistoryOpen] = useState(false);
  const [withdrawalHistoryOpen, setWithdrawalHistoryOpen] = useState(false);
  const [walletBalanceHistoryOpen, setWalletBalanceHistoryOpen] = useState(false);
  const [lastTopUp, setLastTopUp] = useState<{ amount: number; status: string } | null>(null);
  const [investmentStatus, setInvestmentStatus] = useState<{ matured: boolean; countdown: string | null }>({ matured: false, countdown: null });
  const [matureInvestmentAmount, setMatureInvestmentAmount] = useState<number>(0);
  
  const [userProfileOpen, setUserProfileOpen] = useState(false);
  const [kycPromptOpen, setKycPromptOpen] = useState(false);
  
  // Menu scroll states
  const menuScrollRef = useRef<HTMLDivElement>(null);
  const [menuCanScrollUp, setMenuCanScrollUp] = useState(false);
  const [menuCanScrollDown, setMenuCanScrollDown] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check menu scroll position
  const checkMenuScrollPosition = () => {
    if (menuScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = menuScrollRef.current;
      setMenuCanScrollUp(scrollTop > 0);
      setMenuCanScrollDown(scrollTop < scrollHeight - clientHeight - 10);
    }
  };

  const scrollMenuUp = () => {
    if (menuScrollRef.current) {
      menuScrollRef.current.scrollBy({ top: -150, behavior: 'smooth' });
    }
  };

  const scrollMenuDown = () => {
    if (menuScrollRef.current) {
      menuScrollRef.current.scrollBy({ top: 150, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      } else {
        // Fetch profile data
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      } else {
        fetchProfile(session.user.id);
        fetchDashboardData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);


  // Listen for custom event to open user profile
  useEffect(() => {
    const handleOpenProfile = () => setUserProfileOpen(true);
    
    window.addEventListener('openUserProfile', handleOpenProfile);
    
    return () => {
      window.removeEventListener('openUserProfile', handleOpenProfile);
    };
  }, []);

  // Subscribe to profile changes for real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('profile_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Profile updated:', payload);
          // Refetch profile when it changes
          fetchProfile(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Fetch menu unread count by type
  const fetchMenuUnreadCount = async () => {
    if (!user) return;
    
    // Fetch all unread notifications
    const { data, error } = await supabase
      .from("notifications")
      .select("id, type")
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (!error && data) {
      setMenuUnreadCount(data.length || 0);
      
      // Count by type
      setTopUpUnreadCount(data.filter(n => n.type === 'transaction').length);
      setBuyGoldUnreadCount(data.filter(n => n.type === 'gold_purchase').length);
      setSellGoldUnreadCount(data.filter(n => n.type === 'gold_sale').length);
      setInvestmentUnreadCount(data.filter(n => n.type === 'investment').length);
      setInvestmentsUnreadCount(data.filter(n => n.type === 'investment').length);
      setGoldHoldingsUnreadCount(data.filter(n => n.type === 'gold_purchase' || n.type === 'gold_sale').length);
      setWithdrawalUnreadCount(data.filter(n => n.type === 'withdrawal').length);
      setWalletBalanceUnreadCount(data.filter(n => n.type === 'transaction').length);
    }
  };

  // Mark notifications as read for specific types
  const markNotificationsAsRead = async (types: string[]) => {
    if (!user) return;
    
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .in("type", types)
      .eq("is_read", false);
    
    // Refetch unread counts after marking as read
    fetchMenuUnreadCount();
  };

  // Subscribe to notifications for menu badge
  useEffect(() => {
    if (!user) return;

    fetchMenuUnreadCount();

    const channel = supabase
      .channel("menu_notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchMenuUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, country, profile_picture, custom_user_id, user_id, date_of_birth, kyc_proof_type, kyc_proof_url, account_number, kyc_status, is_hidden, account_status")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async (userId: string) => {
    try {
      // Fetch wallet balance
      const { data: walletData } = await supabase
        .from("wallet_balances")
        .select("balance, withdrawable_balance")
        .eq("user_id", userId)
        .single();

      setWalletBalance(Number(walletData?.balance) || 0);
      setWithdrawableBalance(Number(walletData?.withdrawable_balance) || 0);

      // Fetch total gold holdings
      const { data: goldData } = await supabase
        .from("gold_purchases")
        .select("gold_amount_grams")
        .eq("user_id", userId);

      const totalPurchased = goldData?.reduce((sum, item) => sum + Number(item.gold_amount_grams), 0) || 0;

      // Fetch total gold sold
      const { data: soldData } = await supabase
        .from("gold_sales")
        .select("gold_amount_grams")
        .eq("user_id", userId);

      const totalSold = soldData?.reduce((sum, item) => sum + Number(item.gold_amount_grams), 0) || 0;

      const totalGold = Math.max(0, totalPurchased - totalSold);
      setGoldHoldings(totalGold);
      
      console.log("Gold Holdings Calculation:", { totalPurchased, totalSold, totalGold });

      // Fetch user's country from profile for gold pricing
      const { data: profileData } = await supabase
        .from("profiles")
        .select("country")
        .eq("user_id", userId)
        .single();

      const userCountry = profileData?.country || 'India';

      // Get sell price per gram (country-specific or fallback)
      let sellPrice = 0;
      const { data: countryPriceData } = await supabase
        .from("country_gold_prices")
        .select("sell_price_per_gram")
        .eq("country", userCountry)
        .eq("is_active", true)
        .single();

      if (countryPriceData) {
        sellPrice = countryPriceData.sell_price_per_gram;
      } else {
        const { data: goldSettingsData } = await supabase
          .from("gold_settings")
          .select("sell_price_per_gram")
          .single();
        
        if (goldSettingsData) {
          sellPrice = goldSettingsData.sell_price_per_gram;
        }
      }

      // Calculate total return (never negative)
      setGoldTotalReturn(Math.max(0, totalGold * sellPrice));

      // Fetch all investments (active and mature) for total return calculation
      const { data: investmentData } = await supabase
        .from("user_investments")
        .select("id, amount_invested, plan_id, status, end_date")
        .eq("user_id", userId);

      const activeInvestmentsCount = investmentData?.filter(inv => inv.status === "active")?.length || 0;
      setActiveInvestments(activeInvestmentsCount);

      // Calculate investments total return and check maturity status
      if (investmentData && investmentData.length > 0) {
        const planIds = investmentData.map(inv => inv.plan_id);
        const { data: plansData } = await supabase
          .from("investment_plans")
          .select("id, returns_percentage")
          .in("id", planIds);

        const plansMap = new Map(plansData?.map(p => [p.id, p.returns_percentage]) || []);
        
        // Calculate total return ONLY for active investments
        const activeInvestmentsForReturn = investmentData.filter(inv => inv.status === "active");
        const totalReturn = activeInvestmentsForReturn.reduce((sum, inv) => {
          const returnPercentage = plansMap.get(inv.plan_id) || 0;
          return sum + (inv.amount_invested * (1 + returnPercentage / 100));
        }, 0);
        
        setInvestmentsTotalReturn(totalReturn);

        // Check if any ACTIVE investment has matured (ready to withdraw)
        const now = new Date();
        const activeInvestments = investmentData.filter(inv => inv.status === "active" && inv.end_date);
        
        // Find active investments that have passed their end_date (ready to withdraw)
        const readyToWithdrawInvestments = activeInvestments.filter(inv => 
          new Date(inv.end_date).getTime() <= now.getTime()
        );
        
        // Calculate mature amount only for active investments ready to withdraw
        const matureAmount = readyToWithdrawInvestments.reduce((sum, inv) => {
          const returnPercentage = plansMap.get(inv.plan_id) || 0;
          return sum + (inv.amount_invested * (1 + returnPercentage / 100));
        }, 0);
        setMatureInvestmentAmount(Math.max(0, matureAmount));
        
        // Find active investments that haven't matured yet for countdown
        const pendingInvestments = activeInvestments.filter(inv => 
          new Date(inv.end_date).getTime() > now.getTime()
        );
        
        if (pendingInvestments.length > 0) {
          const sortedByEndDate = pendingInvestments.sort((a, b) => 
            new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
          );
          const nextMature = sortedByEndDate[0];
          const endDate = new Date(nextMature.end_date);
          const diffMs = endDate.getTime() - now.getTime();
          
          const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const countdown = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
          setInvestmentStatus({ matured: readyToWithdrawInvestments.length > 0, countdown });
        } else if (readyToWithdrawInvestments.length > 0) {
          setInvestmentStatus({ matured: true, countdown: null });
        } else {
          setInvestmentStatus({ matured: false, countdown: null });
        }
      } else {
        setInvestmentsTotalReturn(0);
        setInvestmentStatus({ matured: false, countdown: null });
        setMatureInvestmentAmount(0);
      }

      // Fetch last top-up transaction
      const { data: lastTopUpData } = await supabase
        .from("transactions")
        .select("amount, status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (lastTopUpData) {
        setLastTopUp({
          amount: Number(lastTopUpData.amount),
          status: lastTopUpData.status
        });
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  const refreshData = async () => {
    if (user) {
      await fetchDashboardData(user.id);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out successfully",
    });
    navigate("/");
  };

  // Check if account is frozen or restricted
  const accountStatus = profile?.account_status || 'active';
  const isAccountFrozen = accountStatus === 'frozen' || profile?.is_hidden === true;
  const isAccountRestricted = accountStatus === 'frozen' || accountStatus === 'deactivated';

  // Handle frozen account feature click
  const handleFrozenFeatureClick = () => {
    toast({
      title: "Feature Disabled",
      description: "Please contact Customer Support.",
      variant: "destructive",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Hamburger Menu with Transaction Histories and Logout - Amazon-style slide-out */}
            <Sheet>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative border border-primary/20 hover:bg-primary/10"
                >
                  <Menu className="h-5 w-5 text-primary" />
                  {menuUnreadCount > 0 && (
                    <Badge
                      variant="default"
                      className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white border-0"
                    >
                      {menuUnreadCount > 9 ? "9+" : menuUnreadCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 overflow-hidden">
                <SheetHeader className="px-4 py-4 border-b border-border bg-card">
                  <SheetTitle className="flex items-center gap-3 text-foreground">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.profile_picture || undefined} />
                      <AvatarFallback>
                        <UserIcon className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <span>Hello, {profile?.username || "User"}</span>
                  </SheetTitle>
                </SheetHeader>
                
                <div 
                  ref={menuScrollRef}
                  className="h-[calc(100vh-80px)] overflow-y-auto"
                  onScroll={checkMenuScrollPosition}
                >
                  <div className="py-2">
                    <button 
                      onClick={() => setUserProfileOpen(true)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left"
                    >
                      <UserIcon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium">My Profile Details</span>
                    </button>
                    
                    <button 
                      onClick={async () => {
                        await markNotificationsAsRead(['transaction']);
                        setTopUpHistoryOpen(true);
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left"
                    >
                      <Wallet className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium flex-1">Top Up Wallet Details</span>
                      {topUpUnreadCount > 0 && (
                        <Badge className="h-5 px-2 text-xs bg-red-500 text-white border-0">
                          {topUpUnreadCount > 9 ? "9+" : topUpUnreadCount}
                        </Badge>
                      )}
                    </button>
                    
                    <button 
                      onClick={async () => {
                        if (isAccountFrozen) {
                          handleFrozenFeatureClick();
                          return;
                        }
                        await markNotificationsAsRead(['gold_purchase']);
                        setBuyGoldHistoryOpen(true);
                      }}
                      className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left ${isAccountFrozen ? 'opacity-50' : ''}`}
                    >
                      <TrendingUp className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium flex-1">Buy Gold Details</span>
                      {buyGoldUnreadCount > 0 && (
                        <Badge className="h-5 px-2 text-xs bg-red-500 text-white border-0">
                          {buyGoldUnreadCount > 9 ? "9+" : buyGoldUnreadCount}
                        </Badge>
                      )}
                    </button>
                    
                    <button 
                      onClick={async () => {
                        if (isAccountFrozen) {
                          handleFrozenFeatureClick();
                          return;
                        }
                        await markNotificationsAsRead(['investment']);
                        setInvestmentHistoryOpen(true);
                      }}
                      className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left ${isAccountFrozen ? 'opacity-50' : ''}`}
                    >
                      <DollarSign className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium flex-1">Investment Plan Details</span>
                      {investmentUnreadCount > 0 && (
                        <Badge className="h-5 px-2 text-xs bg-red-500 text-white border-0">
                          {investmentUnreadCount > 9 ? "9+" : investmentUnreadCount}
                        </Badge>
                      )}
                    </button>
                    
                    <button 
                      onClick={async () => {
                        if (isAccountFrozen) {
                          handleFrozenFeatureClick();
                          return;
                        }
                        await markNotificationsAsRead(['gold_sale']);
                        setSellGoldHistoryOpen(true);
                      }}
                      className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left ${isAccountFrozen ? 'opacity-50' : ''}`}
                    >
                      <TrendingDown className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium flex-1">Sell Gold Details</span>
                      {sellGoldUnreadCount > 0 && (
                        <Badge className="h-5 px-2 text-xs bg-red-500 text-white border-0">
                          {sellGoldUnreadCount > 9 ? "9+" : sellGoldUnreadCount}
                        </Badge>
                      )}
                    </button>
                    
                    <button 
                      onClick={async () => {
                        if (isAccountFrozen) {
                          handleFrozenFeatureClick();
                          return;
                        }
                        await markNotificationsAsRead(['investment']);
                        setInvestmentsHistoryOpen(true);
                      }}
                      className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left ${isAccountFrozen ? 'opacity-50' : ''}`}
                    >
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium flex-1">Investments Details</span>
                      {investmentsUnreadCount > 0 && (
                        <Badge className="h-5 px-2 text-xs bg-red-500 text-white border-0">
                          {investmentsUnreadCount > 9 ? "9+" : investmentsUnreadCount}
                        </Badge>
                      )}
                    </button>
                    
                    <button 
                      onClick={async () => {
                        if (isAccountFrozen) {
                          handleFrozenFeatureClick();
                          return;
                        }
                        await markNotificationsAsRead(['gold_purchase', 'gold_sale']);
                        setGoldHoldingsHistoryOpen(true);
                      }}
                      className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left ${isAccountFrozen ? 'opacity-50' : ''}`}
                    >
                      <TrendingUp className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium flex-1">Gold Holdings Details</span>
                      {goldHoldingsUnreadCount > 0 && (
                        <Badge className="h-5 px-2 text-xs bg-red-500 text-white border-0">
                          {goldHoldingsUnreadCount > 9 ? "9+" : goldHoldingsUnreadCount}
                        </Badge>
                      )}
                    </button>
                    
                    <button 
                      onClick={async () => {
                        if (isAccountFrozen) {
                          handleFrozenFeatureClick();
                          return;
                        }
                        await markNotificationsAsRead(['withdrawal']);
                        setWithdrawalHistoryOpen(true);
                      }}
                      className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left ${isAccountFrozen ? 'opacity-50' : ''}`}
                    >
                      <Wallet className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium flex-1">Withdraw Wallet Details</span>
                      {withdrawalUnreadCount > 0 && (
                        <Badge className="h-5 px-2 text-xs bg-red-500 text-white border-0">
                          {withdrawalUnreadCount > 9 ? "9+" : withdrawalUnreadCount}
                        </Badge>
                      )}
                    </button>
                    
                    <button 
                      onClick={async () => {
                        await markNotificationsAsRead(['transaction']);
                        setWalletBalanceHistoryOpen(true);
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left"
                    >
                      <Wallet className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium flex-1">Wallet Balance Details</span>
                      {walletBalanceUnreadCount > 0 && (
                        <Badge className="h-5 px-2 text-xs bg-red-500 text-white border-0">
                          {walletBalanceUnreadCount > 9 ? "9+" : walletBalanceUnreadCount}
                        </Badge>
                      )}
                    </button>
                    
                    <div className="border-t border-border my-2" />
                    
                    <button 
                      onClick={handleLogout}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left text-red-500"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="text-sm font-semibold">Logout</span>
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setUserProfileOpen(true)}>
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarImage src={profile?.profile_picture || undefined} />
                <AvatarFallback>
                  <UserIcon className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-medium text-foreground">{profile?.username || "User"}</span>
                {isAccountFrozen ? (
                  <Badge variant="destructive">
                    Account Frozen
                  </Badge>
                ) : (
                  <Badge 
                    variant={
                      profile?.username &&
                      profile?.profile_picture &&
                      profile?.date_of_birth &&
                      profile?.kyc_proof_type &&
                      profile?.kyc_proof_url &&
                      profile?.account_number
                        ? "default"
                        : "outline"
                    }
                    className={
                      profile?.username &&
                      profile?.profile_picture &&
                      profile?.date_of_birth &&
                      profile?.kyc_proof_type &&
                      profile?.kyc_proof_url &&
                      profile?.account_number
                        ? "bg-emerald-500/20 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/30"
                        : "text-muted-foreground"
                    }
                  >
                    {profile?.username &&
                    profile?.profile_picture &&
                    profile?.date_of_birth &&
                    profile?.kyc_proof_type &&
                    profile?.kyc_proof_url &&
                    profile?.account_number
                      ? "Verified"
                      : "Unverified"}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <img src={barrickLogo} alt="Barrick Digital Gold" className="h-8 w-8 object-contain hidden sm:block" />
              <h1 className="text-xl sm:text-2xl font-display text-primary drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]">Barrick Digital Gold</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {user && <NotificationBell userId={user.id} />}
          </div>
        </div>
      </nav>

      {/* Frozen Account Alert Banner */}
      {isAccountFrozen && (
        <Alert variant="destructive" className="mx-4 mt-4 border-2 border-red-500 bg-red-500/10">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-lg font-semibold">Account Frozen</AlertTitle>
          <AlertDescription className="text-sm">
            Your account is frozen. Please contact Customer Service.
          </AlertDescription>
        </Alert>
      )}

      <div className="container mx-auto px-4 py-4 sm:py-8">
        <Card className="mb-6 sm:mb-8 bg-secondary/10 border-secondary/20 shadow-elegant">
          <CardContent className="pt-6 pb-6 px-6">
            <h2 className="text-2xl sm:text-3xl font-display text-foreground mb-3">
              Welcome, {profile?.username || "User"}!
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              Country: {profile?.country || "Not set"}
            </p>
            {profile && (
              <p className="text-xs sm:text-sm text-muted-foreground font-mono">
                User ID: {profile.custom_user_id || profile.user_id}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Right Column - Wallet Balance Section (order-first on mobile) */}
          <Card className="shadow-elegant bg-card border border-border order-first lg:order-last">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-lg sm:text-xl italic text-primary">
                <span>Wallet Balance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-3xl sm:text-4xl font-bold text-primary">
                  {walletBalance.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Available for trading</p>
              </div>
              
              {lastTopUp && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Last Top-Up</p>
                    <p className="text-lg font-semibold text-foreground">{lastTopUp.amount.toLocaleString()}</p>
                  </div>
                  <Badge 
                    variant={lastTopUp.status === 'approved' ? 'default' : 'secondary'}
                    className={lastTopUp.status === 'approved' ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'}
                  >
                    {lastTopUp.status === 'approved' ? 'Approved' : 'Pending'}
                  </Badge>
                </div>
              )}
              
              <Button 
                onClick={() => setTopUpOpen(true)}
                className="w-full h-12 text-base bg-[#D4AF37] hover:bg-[#C19B2B] text-black font-semibold"
              >
                Top Up Wallet
              </Button>
            </CardContent>
          </Card>

          {/* Left Column - Gold Wallet Section */}
          <Card className="shadow-elegant bg-card border border-border order-2 lg:order-first">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg sm:text-xl italic text-primary">Gold Wallet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Buy/Sell Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => {
                    if (isAccountFrozen) {
                      handleFrozenFeatureClick();
                      return;
                    }
                    const isProfileComplete = profile?.username &&
                      profile?.profile_picture &&
                      profile?.date_of_birth &&
                      profile?.kyc_proof_type &&
                      profile?.kyc_proof_url &&
                      profile?.account_number;
                    
                    if (!isProfileComplete) {
                      setKycPromptOpen(true);
                    } else {
                      setBuyGoldOpen(true);
                    }
                  }}
                  disabled={isAccountFrozen}
                  className={`h-12 text-base bg-[#D4AF37] hover:bg-[#C19B2B] text-black font-semibold ${isAccountFrozen ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                  Buy Gold
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => {
                    if (isAccountFrozen) {
                      handleFrozenFeatureClick();
                      return;
                    }
                    setSellGoldOpen(true);
                  }}
                  disabled={isAccountFrozen}
                  className={`h-12 text-base border-2 border-border text-foreground hover:bg-muted ${isAccountFrozen ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <TrendingDown className="h-5 w-5 mr-2 text-primary" />
                  Sell Gold
                </Button>
              </div>
              
              {/* Gold Price Display */}
              <ManualGoldPrice />
            </CardContent>
          </Card>
        </div>

        {/* Gold Holdings - shows 3rd on mobile */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 mb-6 sm:mb-8 lg:hidden">
          <Card 
            className={`shadow-elegant cursor-pointer hover:shadow-lg transition-shadow ${isAccountFrozen ? 'opacity-50' : ''}`}
            onClick={() => {
              if (isAccountFrozen) {
                handleFrozenFeatureClick();
                return;
              }
              setGoldHoldingsOpen(true);
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                Gold Holdings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-foreground">{Math.max(0, goldHoldings).toFixed(4)}g</p>
                <div className="text-right">
                  <p className="text-xl sm:text-2xl font-bold text-success">{Math.max(0, goldTotalReturn).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Return</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">Total gold owned</p>
              <p className="text-xs text-success mt-3 font-medium">
                Click here to view purchase history →
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Promotional Banner & Investment Plans Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Investment Plans - shows first on this row for mobile (5th overall) */}
          <Card className="shadow-elegant order-2 lg:order-last">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg sm:text-xl">Investment Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Explore our investment options for better returns
              </p>
              <div 
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border mb-3 cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => {
                  if (isAccountFrozen) {
                    handleFrozenFeatureClick();
                    return;
                  }
                  setActiveInvestmentsOpen(true);
                }}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-muted-foreground">Status</span>
                </div>
                {investmentStatus.matured ? (
                  <Badge className="bg-green-600 text-white">Matured</Badge>
                ) : investmentStatus.countdown ? (
                  <Badge variant="secondary" className="bg-yellow-600 text-white">
                    {investmentStatus.countdown} remaining
                  </Badge>
                ) : (
                  <Badge variant="secondary">No active plans</Badge>
                )}
              </div>
              <div 
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border mb-4 cursor-pointer hover:bg-muted transition-colors"
                onClick={() => {
                  if (isAccountFrozen) {
                    handleFrozenFeatureClick();
                    return;
                  }
                  setShowOnlyMaturedInvestments(true);
                  setActiveInvestmentsOpen(true);
                }}
              >
                <span className="text-sm text-muted-foreground">Mature Amount</span>
                <span className="text-lg font-bold text-primary">{matureInvestmentAmount.toFixed(2)}</span>
              </div>
              <Button 
                variant="secondary"
                onClick={() => {
                  if (isAccountFrozen) {
                    handleFrozenFeatureClick();
                    return;
                  }
                  setInvestmentPlansOpen(true);
                }}
                disabled={isAccountFrozen}
                className={`w-full h-12 text-base ${isAccountFrozen ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                View Investment Plans
              </Button>
            </CardContent>
          </Card>
          
          {/* Promotional Banner - shows first on mobile (4th overall) */}
          <div className="order-1 lg:order-first">
            <PromotionalBanner />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Investments - order 1 on mobile (6th position based on requirements) */}
          <Card 
            className={`shadow-elegant cursor-pointer hover:shadow-lg transition-shadow order-1 lg:order-4 ${isAccountFrozen ? 'opacity-50' : ''}`}
            onClick={() => {
              if (isAccountFrozen) {
                handleFrozenFeatureClick();
                return;
              }
              setActiveInvestmentsOpen(true);
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                Investments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-foreground">{activeInvestments}</p>
                <div className="text-right">
                  <p className="text-xl sm:text-2xl font-bold text-success">{investmentsTotalReturn.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Return</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">Active plans</p>
              <p className="text-xs text-accent mt-3 font-medium">
                Click here to view all active plans →
              </p>
            </CardContent>
          </Card>

          {/* Wallet Balance - order 2 on mobile (7th position based on requirements) */}
          <Card 
            className="shadow-elegant cursor-pointer hover:shadow-lg transition-shadow order-2 lg:order-1"
            onClick={() => setTransactionHistoryOpen(true)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Wallet Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl sm:text-3xl font-bold text-foreground break-all">
                {walletBalance.toLocaleString()}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">Available to trade</p>
              <p className="text-xs text-primary mt-3 font-medium">
                Click here to view transactions →
              </p>
            </CardContent>
          </Card>

          {/* Withdraw Wallet - order 3 on mobile (8th position based on requirements) */}
          <Card 
            className={`shadow-elegant cursor-pointer hover:shadow-lg transition-shadow order-3 lg:order-2 ${isAccountFrozen ? 'opacity-50' : ''}`}
            onClick={() => {
              if (isAccountFrozen) {
                handleFrozenFeatureClick();
                return;
              }
              setWithdrawalOpen(true);
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                Withdraw Wallet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl sm:text-3xl font-bold text-foreground break-all">
                {withdrawableBalance.toLocaleString()}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">Withdrawable amount</p>
              <p className="text-xs text-success mt-3 font-medium">
                Click here to withdraw →
              </p>
            </CardContent>
          </Card>

          {/* Gold Holdings - hidden on mobile (already shown above), visible on desktop */}
          <Card 
            className={`shadow-elegant cursor-pointer hover:shadow-lg transition-shadow hidden lg:block order-4 lg:order-3 ${isAccountFrozen ? 'opacity-50' : ''}`}
            onClick={() => {
              if (isAccountFrozen) {
                handleFrozenFeatureClick();
                return;
              }
              setGoldHoldingsOpen(true);
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                Gold Holdings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-foreground">{Math.max(0, goldHoldings).toFixed(4)}g</p>
                <div className="text-right">
                  <p className="text-xl sm:text-2xl font-bold text-success">{Math.max(0, goldTotalReturn).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Return</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">Total gold owned</p>
              <p className="text-xs text-success mt-3 font-medium">
                Click here to view purchase history →
              </p>
            </CardContent>
          </Card>
        </div>

      </div>

      <TopUpDialog
        open={topUpOpen} 
        onOpenChange={setTopUpOpen}
        onSuccess={refreshData}
      />
      <BuyGoldDialog 
        open={buyGoldOpen} 
        onOpenChange={setBuyGoldOpen}
        walletBalance={walletBalance}
        onSuccess={refreshData}
      />
      <InvestmentPlansDialog 
        open={investmentPlansOpen} 
        onOpenChange={setInvestmentPlansOpen}
        walletBalance={walletBalance}
        onSuccess={refreshData}
      />
      <ActiveInvestmentsDialog 
        open={activeInvestmentsOpen} 
        onOpenChange={(open) => {
          setActiveInvestmentsOpen(open);
          if (!open) setShowOnlyMaturedInvestments(false);
        }}
        onSuccess={refreshData}
        showOnlyMatured={showOnlyMaturedInvestments}
      />
      <TransactionHistoryDialog 
        open={transactionHistoryOpen}
        onOpenChange={setTransactionHistoryOpen}
      />

      <FilteredTransactionDialog
        open={topUpHistoryOpen}
        onOpenChange={setTopUpHistoryOpen}
        type="topup"
        title="Top Up Wallet History"
      />

      <FilteredTransactionDialog
        open={buyGoldHistoryOpen}
        onOpenChange={setBuyGoldHistoryOpen}
        type="gold_buy"
        title="Buy Gold History"
      />

      <FilteredTransactionDialog
        open={sellGoldHistoryOpen}
        onOpenChange={setSellGoldHistoryOpen}
        type="gold_sell"
        title="Sell Gold History"
      />

      <FilteredTransactionDialog
        open={investmentHistoryOpen}
        onOpenChange={setInvestmentHistoryOpen}
        type="investment"
        title="Investment Plans History"
      />
      <ActiveInvestmentsDialog 
        open={investmentsHistoryOpen} 
        onOpenChange={setInvestmentsHistoryOpen}
        onSuccess={refreshData}
      />
      <GoldHoldingsDialog 
        open={goldHoldingsHistoryOpen} 
        onOpenChange={setGoldHoldingsHistoryOpen}
      />
      <FilteredTransactionDialog
        open={withdrawalHistoryOpen}
        onOpenChange={setWithdrawalHistoryOpen}
        type="withdrawal"
        title="Withdrawal History"
      />
      <TransactionHistoryDialog 
        open={walletBalanceHistoryOpen}
        onOpenChange={setWalletBalanceHistoryOpen}
      />
      <GoldHoldingsDialog 
        open={goldHoldingsOpen} 
        onOpenChange={setGoldHoldingsOpen}
      />
      <WithdrawalDialog 
        open={withdrawalOpen} 
        onOpenChange={setWithdrawalOpen}
        withdrawableBalance={withdrawableBalance}
        onSuccess={refreshData}
        isAccountFrozen={isAccountFrozen}
        accountStatus={accountStatus}
      />
      <SellGoldDialog 
        open={sellGoldOpen} 
        onOpenChange={setSellGoldOpen}
        totalGold={goldHoldings}
        onSuccess={refreshData}
      />
      <FloatingChatSupport />
      {user && (
        <>
          <UserProfileDialog 
            open={userProfileOpen} 
            onOpenChange={setUserProfileOpen}
            userId={user.id}
          />
          <KYCPromptDialog
            open={kycPromptOpen}
            onOpenChange={setKycPromptOpen}
            onComplete={() => {
              setKycPromptOpen(false);
              setUserProfileOpen(true);
            }}
            onSkip={() => setKycPromptOpen(false)}
          />
        </>
      )}
    </div>
  );
};

export default Dashboard;