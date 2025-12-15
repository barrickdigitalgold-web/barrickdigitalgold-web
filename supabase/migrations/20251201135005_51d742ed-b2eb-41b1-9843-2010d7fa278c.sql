-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view their chat attachments" ON storage.objects;

-- Create a new policy that allows all authenticated users to SELECT chat attachments
-- Security is enforced by:
-- 1. RLS policies on chat_messages/chat_conversations ensure users only see messages in their own conversations
-- 2. Signed URLs expire after 1 hour
-- 3. File paths (not URLs) are stored in the database
CREATE POLICY "Authenticated users can view chat attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'chat-attachments');