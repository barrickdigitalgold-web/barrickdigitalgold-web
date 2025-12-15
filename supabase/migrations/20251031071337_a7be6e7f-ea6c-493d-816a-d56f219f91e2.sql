-- Add buy price, sell price, and platform fees to gold_settings
ALTER TABLE public.gold_settings 
ADD COLUMN IF NOT EXISTS buy_price_per_gram numeric NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS sell_price_per_gram numeric NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS buy_platform_fee_percentage numeric NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS sell_platform_fee_percentage numeric NOT NULL DEFAULT 0.00;

-- Update existing rows to have default values
UPDATE public.gold_settings
SET 
  buy_price_per_gram = current_price_per_gram,
  sell_price_per_gram = current_price_per_gram
WHERE buy_price_per_gram = 0.00;