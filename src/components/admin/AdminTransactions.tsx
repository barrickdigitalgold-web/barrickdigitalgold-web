import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Download } from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  status: string;
  screenshot_url: string;
  admin_notes: string | null;
  created_at: string;
  user_id: string;
  payment_methods: {
    method_name: string;
  };
  profiles: {
    username: string;
  };
}

export const AdminTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          payment_methods (method_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Batch fetch usernames to avoid per-row queries
      const userIds = Array.from(new Set((data || []).map((tx) => tx.user_id)));
      let profileMap: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, username")
          .in("user_id", userIds);

        if (profilesData) {
          profileMap = profilesData.reduce((acc: Record<string, string>, cur: { user_id: string; username: string }) => {
            acc[cur.user_id] = cur.username;
            return acc;
          }, {});
        }
      }

      const transactionsWithProfiles = (data || []).map((tx) => ({
        ...tx,
        profiles: { username: profileMap[tx.user_id] || "Unknown" },
      }));

      setTransactions(transactionsWithProfiles as Transaction[]);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (transaction: Transaction) => {
    setProcessingId(transaction.id);
    try {
      // Get user email
      const { data: { user } } = await supabase.auth.admin.getUserById(transaction.user_id);

      // Update transaction status
      const { error: txError } = await supabase
        .from("transactions")
        .update({ 
          status: "approved",
          admin_notes: adminNotes[transaction.id] || null
        })
        .eq("id", transaction.id);

      if (txError) throw txError;

      // Get current wallet balance or create if doesn't exist
      let { data: walletData, error: walletFetchError } = await supabase
        .from("wallet_balances")
        .select("balance")
        .eq("user_id", transaction.user_id)
        .maybeSingle();

      // If wallet doesn't exist, create it
      if (!walletData) {
        const { error: createError } = await supabase
          .from("wallet_balances")
          .insert({ user_id: transaction.user_id, balance: 0 });
        
        if (createError) throw createError;
        walletData = { balance: 0 };
      }

      // Update wallet balance (adding funds, so no negative check needed)
      const newBalance = Number(walletData?.balance || 0) + Number(transaction.amount);
      const { error: walletUpdateError } = await supabase
        .from("wallet_balances")
        .update({ balance: newBalance })
        .eq("user_id", transaction.user_id);

      if (walletUpdateError) throw walletUpdateError;

      // Send email notification
      if (user?.email) {
        try {
          await supabase.functions.invoke('send-notification-email', {
            body: {
              to: user.email,
              subject: 'Transaction Approved',
              type: 'transaction',
              status: 'approved',
              amount: transaction.amount,
              message: adminNotes[transaction.id],
              username: transaction.profiles?.username || 'User'
            }
          });
        } catch (emailError) {
          console.error("Failed to send email:", emailError);
        }
      }

      // Create notification and send chat message for admin notes
      const noteMessage = adminNotes[transaction.id];
      const statusMessage = `Your top-up transaction of ${transaction.amount} has been approved.${noteMessage ? ` Admin Note: ${noteMessage}` : ''}`;
      
      // Create notification for bell icon
      try {
        await supabase.rpc('create_notification', {
          p_user_id: transaction.user_id,
          p_title: 'Transaction Approved',
          p_message: statusMessage,
          p_type: 'transaction',
          p_related_id: transaction.id
        });
      } catch (notifError) {
        console.error("Failed to create notification:", notifError);
      }

      // Send message to user's chat
      try {
        const { data: conversation } = await supabase
          .from("chat_conversations")
          .select("id")
          .eq("user_id", transaction.user_id)
          .eq("status", "open")
          .maybeSingle();

        let conversationId = conversation?.id;

        if (!conversationId) {
          const { data: newConv } = await supabase
            .from("chat_conversations")
            .insert({
              user_id: transaction.user_id,
              subject: "Transaction Update",
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
        description: "Transaction approved and wallet updated",
      });

      fetchTransactions();
    } catch (error) {
      console.error("Error approving transaction:", error);
      toast({
        title: "Error",
        description: "Failed to approve transaction",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      // Get transaction and user details
      const transaction = transactions.find(t => t.id === id);
      if (!transaction) return;

      const { data: { user } } = await supabase.auth.admin.getUserById(transaction.user_id);

      const { error } = await supabase
        .from("transactions")
        .update({ 
          status: "rejected",
          admin_notes: adminNotes[id] || null
        })
        .eq("id", id);

      if (error) throw error;

      // Send email notification
      if (user?.email) {
        try {
          await supabase.functions.invoke('send-notification-email', {
            body: {
              to: user.email,
              subject: 'Transaction Rejected',
              type: 'transaction',
              status: 'rejected',
              amount: transaction.amount,
              message: adminNotes[id],
              username: transaction.profiles?.username || 'User'
            }
          });
        } catch (emailError) {
          console.error("Failed to send email:", emailError);
        }
      }

      // Create notification and send chat message for admin notes
      const noteMessage = adminNotes[id];
      const statusMessage = `Your top-up transaction of ${transaction.amount} has been rejected.${noteMessage ? ` Admin Note: ${noteMessage}` : ''}`;
      
      // Create notification for bell icon
      try {
        await supabase.rpc('create_notification', {
          p_user_id: transaction.user_id,
          p_title: 'Transaction Rejected',
          p_message: statusMessage,
          p_type: 'transaction',
          p_related_id: transaction.id
        });
      } catch (notifError) {
        console.error("Failed to create notification:", notifError);
      }

      // Send message to user's chat
      try {
        const { data: conversation } = await supabase
          .from("chat_conversations")
          .select("id")
          .eq("user_id", transaction.user_id)
          .eq("status", "open")
          .maybeSingle();

        let conversationId = conversation?.id;

        if (!conversationId) {
          const { data: newConv } = await supabase
            .from("chat_conversations")
            .insert({
              user_id: transaction.user_id,
              subject: "Transaction Update",
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
        description: "Transaction rejected",
      });

      fetchTransactions();
    } catch (error) {
      console.error("Error rejecting transaction:", error);
      toast({
        title: "Error",
        description: "Failed to reject transaction",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <p className="text-center text-muted-foreground">Loading transactions...</p>;
  }

  return (
    <div className="space-y-4">
      {transactions.length === 0 ? (
        <p className="text-center text-muted-foreground">No transactions found</p>
      ) : (
        transactions.map((tx) => (
          <Card key={tx.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    {tx.profiles?.username || "Unknown User"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {new Date(tx.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge
                  variant={
                    tx.status === "approved"
                      ? "default"
                      : tx.status === "rejected"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {tx.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <p className="font-bold">₹{tx.amount.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment Method:</span>
                  <p className="font-semibold">{tx.payment_methods?.method_name}</p>
                </div>
              </div>

              <div>
                <button
                  onClick={async () => {
                    const pathParts = tx.screenshot_url.split('/');
                    const filePath = pathParts.slice(pathParts.indexOf(tx.user_id)).join('/');
                    const { data } = await supabase.storage.from('transaction-screenshots').createSignedUrl(filePath, 60);
                    if (data?.signedUrl) {
                      const link = document.createElement('a');
                      link.href = data.signedUrl;
                      link.download = 'payment-screenshot';
                      link.click();
                    }
                  }}
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Download className="w-4 h-4" />
                  Download Payment Screenshot
                </button>
              </div>

              {tx.status === "pending" && (
                <>
                  <Textarea
                    placeholder="Admin notes (optional)"
                    value={adminNotes[tx.id] || ""}
                    onChange={(e) =>
                      setAdminNotes({ ...adminNotes, [tx.id]: e.target.value })
                    }
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(tx)}
                      disabled={processingId === tx.id}
                      className="flex-1"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(tx.id)}
                      disabled={processingId === tx.id}
                      variant="destructive"
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </>
              )}

              {tx.admin_notes && (
                <div className="p-2 bg-muted rounded text-sm">
                  <p className="font-semibold">Admin Notes:</p>
                  <p>{tx.admin_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};
