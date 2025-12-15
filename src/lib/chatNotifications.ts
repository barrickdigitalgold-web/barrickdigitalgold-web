import { supabase } from "@/integrations/supabase/client";

export const sendChatNotification = async (userId: string, message: string) => {
  try {
    // Get or create conversation
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
          subject: "Activity Notification",
          status: "open"
        })
        .select()
        .single();
      
      conversationId = newConv?.id;
    }

    if (conversationId) {
      // Use the user's own ID as sender (system message from user's perspective)
      await supabase
        .from("chat_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          message: `📢 ${message}`
        });
    }
  } catch (error) {
    console.error("Failed to send chat notification:", error);
  }
};
