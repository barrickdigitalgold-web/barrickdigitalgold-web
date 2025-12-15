import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Clock } from "lucide-react";
import { format } from "date-fns";

interface Profile {
  username: string;
}

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  admin_message: string | null;
  account_number: string | null;
  created_at: string;
}

export const AdminWithdrawals = () => {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminMessages, setAdminMessages] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    setLoading(true);
    const { data: withdrawalData, error } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching withdrawals:", error);
      toast({
        title: "Error",
        description: "Failed to load withdrawal requests",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Fetch user profiles separately
    const userIds = withdrawalData?.map(w => w.user_id) || [];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, username")
      .in("user_id", userIds);

    const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
    
    const enrichedData = withdrawalData?.map(w => ({
      ...w,
      profile: profilesMap.get(w.user_id) || { username: "Unknown" }
    })) || [];

    setRequests(enrichedData as any);
    setLoading(false);
  };

  const handleUpdateStatus = async (requestId: string, newStatus: string, userId: string, amount: number) => {
    const adminMessage = adminMessages[requestId] || "";

    try {
      // Get user email first
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", userId)
        .single();

      const { data: { user } } = await supabase.auth.admin.getUserById(userId);
      
      // Update withdrawal request status
      const { error: updateError } = await supabase
        .from("withdrawal_requests")
        .update({
          status: newStatus,
          admin_message: adminMessage || null,
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // If declined, refund the withdrawable balance
      if (newStatus === "declined") {
        const { data: walletData, error: walletFetchError } = await supabase
          .from("wallet_balances")
          .select("withdrawable_balance")
          .eq("user_id", userId)
          .single();

        if (walletFetchError) throw walletFetchError;

        const { error: walletUpdateError } = await supabase
          .from("wallet_balances")
          .update({ 
            withdrawable_balance: Number(walletData.withdrawable_balance) + amount 
          })
          .eq("user_id", userId);

        if (walletUpdateError) throw walletUpdateError;
      }

      // Send email notification
      if (user?.email) {
        try {
          await supabase.functions.invoke('send-notification-email', {
            body: {
              to: user.email,
              subject: `Withdrawal Request ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
              type: 'withdrawal',
              status: newStatus,
              amount: amount,
              message: adminMessage,
              username: profileData?.username || 'User'
            }
          });
        } catch (emailError) {
          console.error("Failed to send email:", emailError);
        }
      }

      // Create notification and send chat message
      const statusMessage = `Your withdrawal request of ${amount} has been ${newStatus}.${adminMessage ? ` Admin Message: ${adminMessage}` : ''}`;
      
      // Create notification for bell icon
      try {
        await supabase.rpc('create_notification', {
          p_user_id: userId,
          p_title: `Withdrawal ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
          p_message: statusMessage,
          p_type: 'withdrawal',
          p_related_id: requestId
        });
      } catch (notifError) {
        console.error("Failed to create notification:", notifError);
      }

      // Send message to user's chat
      try {
        const { data: conversation } = await supabase
          .from("chat_conversations")
          .select("id")
          .eq("user_id", userId)
          .eq("status", "open")
          .maybeSingle();

        let conversationId = conversation?.id;

        if (!conversationId) {
          const { data: newConv } = await supabase
            .from("chat_conversations")
            .insert({
              user_id: userId,
              subject: "Withdrawal Update",
              status: "open"
            })
            .select()
            .single();
          
          conversationId = newConv?.id;
        }

        if (conversationId) {
          const { data: { user: adminUser } } = await supabase.auth.getUser();
          await supabase
            .from("chat_messages")
            .insert({
              conversation_id: conversationId,
              sender_id: adminUser!.id,
              message: statusMessage
            });
        }
      } catch (chatError) {
        console.error("Failed to send chat message:", chatError);
      }

      toast({
        title: "Success",
        description: `Withdrawal request ${newStatus}`,
      });

      fetchWithdrawals();
      setAdminMessages((prev) => {
        const updated = { ...prev };
        delete updated[requestId];
        return updated;
      });
    } catch (error: any) {
      console.error("Error updating withdrawal:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500";
      case "declined":
        return "bg-red-500";
      default:
        return "bg-yellow-500";
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading withdrawal requests...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdrawal Requests</CardTitle>
        <CardDescription>Manage user withdrawal requests</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requests.length === 0 ? (
            <p className="text-muted-foreground">No withdrawal requests found</p>
          ) : (
            requests.map((request) => (
              <Card key={request.id}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="font-semibold">{(request as any).profile?.username}</p>
                        <p className="text-2xl font-bold text-primary">
                          ₹{parseFloat(request.amount.toString()).toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(request.created_at), "PPpp")}
                        </p>
                        {request.account_number && (
                          <div className="mt-2 p-2 bg-muted rounded">
                            <p className="text-sm font-medium">Bank Account:</p>
                            <p className="text-sm text-foreground font-mono">{request.account_number}</p>
                          </div>
                        )}
                      </div>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>

                    {request.status === "pending" && (
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Admin message (optional - for pending/declined status)"
                          value={adminMessages[request.id] || ""}
                          onChange={(e) =>
                            setAdminMessages((prev) => ({
                              ...prev,
                              [request.id]: e.target.value,
                            }))
                          }
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleUpdateStatus(request.id, "approved", request.user_id, parseFloat(request.amount.toString()))}
                            className="flex items-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(request.id, "pending", request.user_id, parseFloat(request.amount.toString()))}
                            className="flex items-center gap-2"
                          >
                            <Clock className="w-4 h-4" />
                            Keep Pending
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleUpdateStatus(request.id, "declined", request.user_id, parseFloat(request.amount.toString()))}
                            className="flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    )}

                    {request.admin_message && (
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm font-medium">Admin Message:</p>
                        <p className="text-sm text-muted-foreground">{request.admin_message}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
