-- Add phone_number column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number text;

-- Update existing profiles with phone numbers from auth.users metadata
-- This will be done manually or through a function since we can't directly access auth.users from here