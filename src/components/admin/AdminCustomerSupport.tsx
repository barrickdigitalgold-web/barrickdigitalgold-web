import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, Paperclip, MessageSquare, X, Trash2, Ban, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

const AttachmentDisplay = ({ attachmentPath }: { attachmentPath: string }) => {
  const [signedUrl, setSignedUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSignedUrl = async () => {
      try {
        let objectPath = attachmentPath;

        // If it's a full URL, extract just the path
        if (attachmentPath.startsWith("http")) {
          try {
            const url = new URL(attachmentPath);
            const match = url.pathname.match(/\/storage\/v1\/object\/[^/]+\/chat-attachments\/(.+)$/);

            if (match?.[1]) {
              objectPath = decodeURIComponent(match[1]);
            } else {
              console.error("Unable to extract object path from attachment URL", attachmentPath);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error("Invalid attachment URL", attachmentPath, e);
            setLoading(false);
            return;
          }
        }

        console.log("Fetching signed URL for path:", objectPath);

        const { data, error } = await supabase.storage
          .from("chat-attachments")
          .createSignedUrl(objectPath, 3600);

        if (error) {
          console.error("Supabase storage error:", error);
          throw error;
        }

        if (!data?.signedUrl) {
          console.error("No signed URL returned");
          setLoading(false);
          return;
        }
        
        // The signed URL from Supabase is already complete
        setSignedUrl(data.signedUrl);
        console.log("Successfully loaded signed URL");
      } catch (error) {
        console.error("Error getting signed URL:", error);
      } finally {
        setLoading(false);
      }
    };

    getSignedUrl();
  }, [attachmentPath]);

  if (loading) {
    return <div className="text-xs">Loading...</div>;
  }

  if (!signedUrl) {
    return <div className="text-xs text-red-500">Failed to load attachment</div>;
  }

  const isImage = attachmentPath.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  return (
    <div className="mt-2">
      {isImage ? (
        <img 
          src={signedUrl} 
          alt="Attachment" 
          className="max-w-xs rounded border cursor-pointer hover:opacity-80"
          onClick={() => window.open(signedUrl, '_blank')}
        />
      ) : (
        <a 
          href={signedUrl} 
          download
          className="text-xs text-blue-500 hover:underline flex items-center gap-1"
        >
          <Paperclip className="h-3 w-3" />
          Download Attachment
        </a>
      )}
    </div>
  );
};

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  attachment_url: string | null;
  created_at: string;
}

interface ChatConversation {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  blocked: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string;
  };
  lastMessage?: {
    message: string;
    sender_id: string;
    created_at: string;
  };
  unreadCount?: number;
}

export const AdminCustomerSupport = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<ChatConversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showChatView, setShowChatView] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        fetchConversations();
      }
    };
    init();

    // Subscribe to all new messages for unread count updates
    const allMessagesChannel = supabase
      .channel('all_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          // Increment unread count if message is not from current user and not in selected conversation
          if (newMsg.sender_id !== currentUserId && newMsg.conversation_id !== selectedConversation) {
            // Refresh unread counts by re-fetching conversations
            fetchConversations();
          }
          // Refresh conversations to update order
          if (newMsg.conversation_id !== selectedConversation) {
            fetchConversations();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(allMessagesChannel);
    };
  }, [selectedConversation, currentUserId]);

  useEffect(() => {
    if (!selectedConversation) return;

    fetchMessages(selectedConversation);

    // Subscribe to new messages
    const channel = supabase
      .channel(`staff_chat:${selectedConversation}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${selectedConversation}`
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages(prev => [newMsg, ...prev]);
          
          // Reset unread count for selected conversation when viewing
          setUnreadCounts(prev => ({
            ...prev,
            [selectedConversation]: 0
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  const fetchConversations = async () => {
    const { data: convData, error } = await supabase
      .from("chat_conversations")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
      return;
    }

    // Get staff/admin user IDs
    const { data: staffRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "staff"]);

    const staffUserIds = staffRoles?.map(r => r.user_id) || [];

    // Fetch profiles, last message, and unread count for each conversation
    const conversationsWithDetails = await Promise.all(
      (convData || []).map(async (conv) => {
        // Get profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("username")
          .eq("user_id", conv.user_id)
          .single();

        // Get last message
        const { data: lastMsgData } = await supabase
          .from("chat_messages")
          .select("message, sender_id, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // Count unread messages from the user (not from admin/staff)
        // These are messages we haven't "read" - we track this using a simple approach:
        // Count messages from non-staff users that are newer than the last staff reply
        const { data: lastStaffMsg } = await supabase
          .from("chat_messages")
          .select("created_at")
          .eq("conversation_id", conv.id)
          .in("sender_id", staffUserIds.length > 0 ? staffUserIds : ['00000000-0000-0000-0000-000000000000'])
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const lastReadAt = lastStaffMsg?.created_at || '1970-01-01T00:00:00.000Z';

        const { count } = await supabase
          .from("chat_messages")
          .select("id", { count: 'exact', head: true })
          .eq("conversation_id", conv.id)
          .not("sender_id", "in", `(${staffUserIds.length > 0 ? staffUserIds.join(",") : '00000000-0000-0000-0000-000000000000'})`)
          .gt("created_at", lastReadAt);

        return {
          ...conv,
          profiles: profileData || { username: "Unknown User" },
          lastMessage: lastMsgData || null,
          unreadCount: count || 0
        };
      })
    );

    // Initialize unread counts object
    const counts: Record<string, number> = {};
    conversationsWithDetails.forEach((conv) => {
      counts[conv.id] = conv.unreadCount || 0;
    });
    
    setUnreadCounts(counts);
    setConversations(conversationsWithDetails);
    setFilteredConversations(conversationsWithDetails);
  };

  useEffect(() => {
    const filtered = conversations.filter(conv => 
      conv.profiles?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.status.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredConversations(filtered);
  }, [searchQuery, conversations]);

  const fetchMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
      return;
    }

    setMessages(data || []);
    
    // Mark chat notifications as read for this user
    const conv = conversations.find(c => c.id === convId);
    if (conv) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", conv.user_id)
        .eq("type", "chat")
        .eq("is_read", false);
    }
    
    // Reset unread count for this conversation
    setUnreadCounts(prev => ({ ...prev, [convId]: 0 }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 5MB",
          variant: "destructive",
        });
        return;
      }
      setUploadedFile(file);
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!currentUserId) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${currentUserId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(fileName, file);

    if (uploadError) {
      toast({
        title: "Upload failed",
        description: uploadError.message,
        variant: "destructive",
      });
      return null;
    }

    // Store just the file path, not the full URL
    return fileName;
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !uploadedFile) || !selectedConversation || !currentUserId) return;

    setIsUploading(true);

    let attachmentUrl = null;
    if (uploadedFile) {
      attachmentUrl = await uploadFile(uploadedFile);
      if (!attachmentUrl) {
        setIsUploading(false);
        return;
      }
    }

    const { error } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: selectedConversation,
        sender_id: currentUserId,
        message: newMessage.trim() || "Sent an attachment",
        attachment_url: attachmentUrl
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } else {
      setNewMessage("");
      setUploadedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }

    setIsUploading(false);
  };

  const handleClearChat = async () => {
    if (!selectedConversation) return;

    if (!confirm("Are you sure you want to clear this chat? All messages will be deleted.")) {
      return;
    }

    try {
      // Delete all messages
      const { error: messagesError } = await supabase
        .from("chat_messages")
        .delete()
        .eq("conversation_id", selectedConversation);

      if (messagesError) throw messagesError;

      toast({
        title: "Success",
        description: "Chat cleared successfully",
      });
      
      setMessages([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear chat",
        variant: "destructive",
      });
    }
  };

  const handleBlockUser = async () => {
    if (!selectedConversation) return;

    const currentConv = conversations.find(c => c.id === selectedConversation);
    const isBlocked = currentConv?.blocked || false;

    const action = isBlocked ? "unblock" : "block";
    
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }

    const { error } = await supabase
      .from("chat_conversations")
      .update({ blocked: !isBlocked })
      .eq("id", selectedConversation);

    if (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} user`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `User ${isBlocked ? "unblocked" : "blocked"} successfully`,
      });
      fetchConversations();
    }
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the conversation

    if (!confirm("Are you sure you want to delete this conversation? This will also delete all messages.")) {
      return;
    }

    try {
      // Delete all messages first
      const { error: messagesError } = await supabase
        .from("chat_messages")
        .delete()
        .eq("conversation_id", conversationId);

      if (messagesError) throw messagesError;

      // Delete the conversation
      const { error: convError } = await supabase
        .from("chat_conversations")
        .delete()
        .eq("id", conversationId);

      if (convError) throw convError;

      toast({
        title: "Success",
        description: "Conversation deleted successfully",
      });

      if (selectedConversation === conversationId) {
        setSelectedConversation(null);
      }

      fetchConversations();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    }
  };

  const isImageFile = (path: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(path);
  };

  const handleSelectConversation = (convId: string) => {
    setSelectedConversation(convId);
    if (isMobile) {
      setShowChatView(true);
    }
  };

  const handleBackToList = () => {
    setShowChatView(false);
    setSelectedConversation(null);
  };

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  // Render conversations list inline instead of as a component
  const renderConversationsList = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex-shrink-0">
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-3">
          {filteredConversations.map((conv) => (
            <div
              key={conv.id}
              className={`p-3 rounded-xl cursor-pointer transition-all relative group ${
                selectedConversation === conv.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted/50 hover:bg-muted'
              }`}
              onClick={() => handleSelectConversation(conv.id)}
            >
              {/* Row 1: Username, Time, Unread Badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm truncate flex-1">
                  {conv.profiles?.username || 'User'}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] opacity-60">
                    {conv.lastMessage 
                      ? format(new Date(conv.lastMessage.created_at), 'MMM d, HH:mm')
                      : format(new Date(conv.created_at), 'MMM d, HH:mm')
                    }
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
              
              {/* Row 2: Subject */}
              <div className="text-xs opacity-70 truncate mt-1">{conv.subject}</div>
              
              {/* Row 3: Last Message Preview & Unread Count */}
              <div className="flex items-center justify-between mt-2 gap-2">
                <p className={`text-xs truncate flex-1 ${
                  selectedConversation === conv.id ? 'opacity-80' : 'text-muted-foreground'
                }`}>
                  {conv.lastMessage 
                    ? conv.lastMessage.message.length > 35 
                      ? conv.lastMessage.message.substring(0, 35) + '...'
                      : conv.lastMessage.message
                    : 'No messages yet'
                  }
                </p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {unreadCounts[conv.id] > 0 && (
                    <Badge 
                      variant="default" 
                      className="bg-green-500 hover:bg-green-600 text-white text-[10px] h-5 min-w-[20px] flex items-center justify-center rounded-full"
                    >
                      {unreadCounts[conv.id]}
                    </Badge>
                  )}
                  <Badge 
                    variant={conv.status === 'open' ? 'default' : 'secondary'} 
                    className="text-[10px] h-4 px-1.5"
                  >
                    {conv.status}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
          {filteredConversations.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">No conversations found</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  // Render chat view inline instead of as a component
  const renderChatView = () => (
    <div className="flex flex-col h-full bg-background">
      {selectedConversation ? (
        <>
          {/* Header */}
          <div className="flex items-center gap-3 p-3 border-b flex-shrink-0 bg-card">
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={handleBackToList} className="flex-shrink-0 -ml-1">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">
                {selectedConv?.profiles?.username || 'User'}
              </h3>
              <p className="text-xs text-muted-foreground truncate">{selectedConv?.subject}</p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={handleClearChat} className="text-xs h-8 px-2">
                Clear
              </Button>
              <Button 
                variant={selectedConv?.blocked ? "default" : "destructive"}
                size="sm"
                onClick={handleBlockUser}
                className="text-xs h-8 px-2"
              >
                <Ban className="h-3 w-3 mr-1" />
                {selectedConv?.blocked ? "Unblock" : "Block"}
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1">
            <div className="space-y-3 p-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ${
                      msg.sender_id === currentUserId
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm break-words whitespace-pre-wrap">{msg.message}</p>
                    {msg.attachment_url && (
                      <AttachmentDisplay attachmentPath={msg.attachment_url} />
                    )}
                    <p className="text-[10px] opacity-60 mt-1 text-right">
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input Area */}
          {!selectedConv?.blocked && (
            <div className="border-t p-3 flex-shrink-0 bg-card">
              {uploadedFile && (
                <div className="flex items-center gap-2 bg-muted p-2 rounded-lg mb-2">
                  <Paperclip className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="text-sm flex-1 truncate">{uploadedFile.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setUploadedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex-shrink-0 h-10 w-10"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  placeholder="Type your reply..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={isUploading}
                  className="flex-1 h-10"
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={isUploading} 
                  className="flex-shrink-0 h-10 w-10"
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
          <MessageSquare className="h-12 w-12 opacity-30" />
          <p className="text-sm">Select a conversation to view messages</p>
        </div>
      )}
    </div>
  );

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="py-3 px-4 flex-shrink-0 border-b">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-5 w-5" />
          Customer Support
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-[calc(100vh-220px)] md:h-[600px]">
        {isMobile ? (
          // Mobile: Show either list or chat view (WhatsApp-style)
          <div className="h-full overflow-hidden">
            {showChatView ? renderChatView() : renderConversationsList()}
          </div>
        ) : (
          // Desktop: Side-by-side layout
          <div className="grid grid-cols-3 gap-0 h-full">
            <div className="border-r h-full overflow-hidden">
              {renderConversationsList()}
            </div>
            <div className="col-span-2 h-full overflow-hidden">
              {renderChatView()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminCustomerSupport;
