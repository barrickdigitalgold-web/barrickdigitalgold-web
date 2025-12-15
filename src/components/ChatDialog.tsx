import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, Paperclip, X } from "lucide-react";
import { format } from "date-fns";

const AttachmentDisplay = ({ attachmentPath }: { attachmentPath: string }) => {
  const [signedUrl, setSignedUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSignedUrl = async () => {
      try {
        // Normalize attachment path to an object path inside the chat-attachments bucket
        let objectPath = attachmentPath;

        if (attachmentPath.startsWith("http")) {
          try {
            const url = new URL(attachmentPath);
            const match = url.pathname.match(/\/chat-attachments\/(.+)$/);

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

        const { data, error } = await supabase.storage
          .from("chat-attachments")
          .createSignedUrl(objectPath, 3600); // 1 hour expiry

        if (error) throw error;
        setSignedUrl(data.signedUrl);
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
          className="max-w-xs rounded border cursor-pointer"
          onClick={() => window.open(signedUrl, "_blank")}
        />
      ) : (
        <a
          href={signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline block"
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

interface ChatConversation {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  blocked: boolean;
  created_at: string;
}

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChatDialog = ({ open, onOpenChange }: ChatDialogProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initializeChat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // Check for existing conversation
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
        // Create new conversation
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
    };

    if (open) {
      initializeChat();
    }
  }, [open, toast]);

  useEffect(() => {
    if (!conversationId) return;

    // Subscribe to new messages
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
          // If message is from staff/admin, increment unread count
          if (newMsg.sender_id !== currentUserId) {
            setUnreadCount(prev => prev + 1);
          }
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

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
    
    // Count unread messages from staff/admin
    const unread = (data || []).filter(msg => msg.sender_id !== currentUserId).length;
    setUnreadCount(unread);
    
    // Reset unread count when viewing messages
    if (open) {
      setUnreadCount(0);
    }
    
    setTimeout(scrollToBottom, 100);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
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
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }

    setIsUploading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Customer Support Chat
            {unreadCount > 0 && (
              <Badge variant="default" className="bg-green-500 text-white">
                {unreadCount}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4 mb-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.sender_id === currentUserId
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{msg.message}</p>
                  {msg.attachment_url && (
                    <AttachmentDisplay attachmentPath={msg.attachment_url} />
                  )}
                  <p className="text-xs opacity-70 mt-1">
                    {format(new Date(msg.created_at), 'HH:mm')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {!isBlocked ? (
          <div className="pt-4 space-y-2 border-t mt-auto">
            {uploadedFile && (
            <div className="flex items-center gap-2 bg-muted p-2 rounded">
              <Paperclip className="h-4 w-4" />
              <span className="text-sm flex-1 truncate">{uploadedFile.name}</span>
              <Button
                variant="ghost"
                size="sm"
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
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isUploading}
            />
            <Button onClick={handleSendMessage} disabled={isUploading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        ) : (
          <div className="pt-4 border-t mt-auto">
            <p className="text-center text-sm text-muted-foreground">
              This conversation is currently unavailable.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
