import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Send, Paperclip, AlertTriangle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
  attachment_url?: string | null;
}

interface FrozenAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
}

export const FrozenAccountDialog = ({ open, onOpenChange, userId }: FrozenAccountDialogProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && userId) {
      initializeChat();
    }
  }, [open, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`frozen-chat-${conversationId}`)
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
          setMessages(prev => {
            // Avoid duplicates
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const initializeChat = async () => {
    if (!userId) return;
    
    try {
      // Check for existing conversation
      const { data: existingConversation } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingConversation) {
        setConversationId(existingConversation.id);
        fetchMessages(existingConversation.id);
      } else {
        // Create new conversation
        const { data: newConversation, error } = await supabase
          .from('chat_conversations')
          .insert({
            user_id: userId,
            subject: 'Frozen Account Support',
            status: 'open'
          })
          .select('id')
          .single();

        if (error) throw error;
        if (newConversation) {
          setConversationId(newConversation.id);
          // Send initial message
          await supabase.from('chat_messages').insert({
            conversation_id: newConversation.id,
            sender_id: userId,
            message: "My account has been frozen. I need assistance to resolve this issue."
          });
          fetchMessages(newConversation.id);
        }
      }
    } catch (error) {
      console.error("Error initializing chat:", error);
    }
  };

  const fetchMessages = async (convId: string) => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !userId) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        sender_id: userId,
        message: newMessage.trim()
      });

      if (error) throw error;

      setNewMessage("");
      fetchMessages(conversationId);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !conversationId || !userId) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: messageError } = await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        sender_id: userId,
        message: `Attached: ${file.name}`,
        attachment_url: fileName
      });

      if (messageError) throw messageError;

      fetchMessages(conversationId);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to upload file"
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg h-[600px] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b border-destructive/30 bg-destructive/10">
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Account Frozen
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-4 bg-destructive/5 border-b">
          <p className="text-sm text-foreground font-medium">
            Your account is frozen. If you want to unfreeze your account, please contact Customer Service. Customer Service will guide you on how to resolve this issue and explain why your account is in this status.
          </p>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.sender_id === userId
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <p>{msg.message}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-card">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !conversationId}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={loading || !conversationId}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={loading || !newMessage.trim() || !conversationId}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
