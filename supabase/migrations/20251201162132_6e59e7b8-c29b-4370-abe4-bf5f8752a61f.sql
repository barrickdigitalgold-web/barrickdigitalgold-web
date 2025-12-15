-- Add blocked column to chat_conversations table
ALTER TABLE public.chat_conversations 
ADD COLUMN IF NOT EXISTS blocked BOOLEAN NOT NULL DEFAULT false;