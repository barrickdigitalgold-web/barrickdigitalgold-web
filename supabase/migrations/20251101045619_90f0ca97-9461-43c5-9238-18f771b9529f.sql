-- Add withdrawable_balance to wallet_balances
ALTER TABLE public.wallet_balances
ADD COLUMN IF NOT EXISTS withdrawable_balance numeric NOT NULL DEFAULT 0.00;

-- Add account_number to profiles for withdrawal
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS account_number text;

-- Add account_number to withdrawal_requests
ALTER TABLE public.withdrawal_requests
ADD COLUMN IF NOT EXISTS account_number text;