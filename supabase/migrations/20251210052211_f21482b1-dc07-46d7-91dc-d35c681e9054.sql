-- Allow frozen account users to create conversations for support
-- Update the INSERT policy to allow users to create conversations even when frozen

DROP POLICY IF EXISTS "Users can create their own conversations" ON public.chat_conversations;

CREATE POLICY "Users can create their own conversations" 
ON public.chat_conversations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Also ensure the chat_messages INSERT policy works for frozen accounts
DROP POLICY IF EXISTS "Authenticated users can create messages" ON public.chat_messages;

CREATE POLICY "Authenticated users can create messages" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (
  (auth.uid() = sender_id) AND 
  (EXISTS (
    SELECT 1 FROM chat_conversations
    WHERE chat_conversations.id = chat_messages.conversation_id 
    AND (
      chat_conversations.user_id = auth.uid() 
      OR has_role(auth.uid(), 'staff'::app_role) 
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  ))
);