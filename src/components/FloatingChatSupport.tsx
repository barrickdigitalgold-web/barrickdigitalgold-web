import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, Paperclip } from "lucide-react";
import { format } from "date-fns";
import chatIcon from "@/assets/chat-icon.png";

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
          className="max-w-xs rounded border border-[#D4AF37]/30 cursor-pointer"
          onClick={() => window.open(signedUrl, "_blank")}
        />
      ) : (
        <a
          href={signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline block text-[#D4AF37]"
        >
          View Attachment
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

export const FloatingChatSupport = () => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const initializeChat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      const { data: existingConversation } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existingConversation) {
        setConversationId(existingConversation.id);
        setIsBlocked(existingConversation.blocked || false);
        fetchMessages(existingConversation.id);
      } else {
        const { data: newConversation, error } = await supabase
          .from("chat_conversations")
          .insert({
            user_id: user.id,
            subject: "Support Request",
            status: "open"
          })
          .select()
          .single();

        if (error) {
          toast({
            title: "Error",
            description: "Failed to create conversation",
            variant: "destructive",
          });
          return;
        }

        setConversationId(newConversation.id);
      }
      
      // Fetch initial unread count
      const { data: unreadNotifications } = await supabase
        .from("notifications")
        .select("id", { count: 'exact' })
        .eq("user_id", user.id)
        .eq("type", "chat")
        .eq("is_read", false);
      
      setUnreadCount(unreadNotifications?.length || 0);
    };

    initializeChat();
  }, [toast]);

  // Listen for custom event to open chat from other components
  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true);
      if (conversationId) {
        fetchMessages(conversationId);
      }
    };

    window.addEventListener('openChatSupport', handleOpenChat);
    return () => {
      window.removeEventListener('openChatSupport', handleOpenChat);
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const channel = supabase
      .channel(`chat_messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages(prev => [newMsg, ...prev]);
          
          // If message is from someone else and chat is not open, fetch updated unread count
          if (newMsg.sender_id !== currentUserId && !isOpen) {
            fetchUnreadCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, isOpen]);

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
    
    // Fetch unread count from notifications table
    await fetchUnreadCount();
  };

  const fetchUnreadCount = async () => {
    if (!currentUserId) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("id", { count: 'exact' })
      .eq("user_id", currentUserId)
      .eq("type", "chat")
      .eq("is_read", false);

    if (!error) {
      setUnreadCount(data?.length || 0);
    }
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

    return fileName;
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !uploadedFile) || !conversationId || !currentUserId || isBlocked) return;

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
        conversation_id: conversationId,
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
    }

    setIsUploading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleChat = async () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Mark all chat notifications as read when opening chat
      if (currentUserId) {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("user_id", currentUserId)
          .eq("type", "chat")
          .eq("is_read", false);
        
        setUnreadCount(0);
      }
    }
  };

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        <span className="text-white font-medium text-sm bg-black/80 px-3 py-2 rounded-lg border border-[#D4AF37]/30">
          Hello
        </span>
        <Button
          onClick={toggleChat}
          className="relative h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform duration-200 bg-white hover:bg-white/90 p-0"
        >
          <img src={chatIcon} alt="Chat Support" className="h-10 w-10" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0 bg-red-500 text-white rounded-full">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[500px] bg-black border-2 border-red-500 rounded-2xl shadow-2xl flex flex-col animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b-2 border-red-500 bg-black">
            <h3 className="font-semibold text-lg text-white">Customer Support Chat</h3>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleChat}
              className="text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4 bg-black">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl p-3 ${
                      msg.sender_id === currentUserId
                        ? 'bg-[#D4AF37] text-black'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                    {msg.attachment_url && (
                      <AttachmentDisplay attachmentPath={msg.attachment_url} />
                    )}
                    <p className="text-xs opacity-70 mt-1">
                      {format(new Date(msg.created_at), 'dd-MM')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input Area */}
          {!isBlocked ? (
            <div className="p-4 border-t-2 border-red-500 bg-black space-y-2">
            {uploadedFile && (
              <div className="flex items-center gap-2 bg-white/10 p-2 rounded text-white">
                <Paperclip className="h-4 w-4" />
                <span className="text-sm flex-1 truncate">{uploadedFile.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUploadedFile(null)}
                  className="text-white hover:bg-white/10"
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
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-transparent border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isUploading}
                className="bg-transparent border border-[#D4AF37]/30 text-white placeholder:text-white/50 focus-visible:ring-[#D4AF37]"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={isUploading}
                className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          ) : (
            <div className="p-4 border-t-2 border-red-500 bg-black">
              <p className="text-center text-sm text-white/70">
                This conversation is currently unavailable.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
};
