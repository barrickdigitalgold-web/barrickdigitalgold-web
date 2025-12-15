-- Add account_status column to profiles table
-- Values: 'active', 'deactivated', 'frozen', 'unfrozen'
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';

-- Update existing frozen accounts (is_hidden = true) to have 'frozen' status
UPDATE public.profiles SET account_status = 'frozen' WHERE is_hidden = true;

-- Add customer_status permission to the enum
ALTER TYPE public.user_permission ADD VALUE IF NOT EXISTS 'customer_status';