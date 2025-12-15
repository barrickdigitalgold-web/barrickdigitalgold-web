-- Add minimum top-up and withdrawal amount columns to gold_settings table
ALTER TABLE public.gold_settings 
ADD COLUMN minimum_topup_amount numeric NOT NULL DEFAULT 100.00,
ADD COLUMN minimum_withdrawal_amount numeric NOT NULL DEFAULT 50.00;