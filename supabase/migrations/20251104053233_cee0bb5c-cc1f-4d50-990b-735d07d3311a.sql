-- Add lock period days field to gold_settings table
ALTER TABLE public.gold_settings 
ADD COLUMN IF NOT EXISTS lock_period_days integer NOT NULL DEFAULT 30;