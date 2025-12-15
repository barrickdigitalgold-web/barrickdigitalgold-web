-- Add multiple lock period support to gold settings
ALTER TABLE public.gold_settings
ADD COLUMN IF NOT EXISTS lock_period_30_days_rate numeric DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS lock_period_60_days_rate numeric DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS lock_period_90_days_rate numeric DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS lock_period_180_days_rate numeric DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS lock_period_365_days_rate numeric DEFAULT 0.00;

-- Add validation to prevent negative values in transactions
ALTER TABLE public.transactions
ADD CONSTRAINT transactions_amount_positive CHECK (amount >= 0);

-- Add validation to prevent negative values in wallet balances
ALTER TABLE public.wallet_balances
ADD CONSTRAINT wallet_balance_positive CHECK (balance >= 0),
ADD CONSTRAINT wallet_withdrawable_positive CHECK (withdrawable_balance >= 0);

-- Add validation to prevent negative values in gold purchases
ALTER TABLE public.gold_purchases
ADD CONSTRAINT gold_purchases_amount_positive CHECK (gold_amount_grams >= 0),
ADD CONSTRAINT gold_purchases_price_positive CHECK (price_per_gram >= 0),
ADD CONSTRAINT gold_purchases_cost_positive CHECK (total_cost >= 0);

-- Add validation to prevent negative values in gold sales
ALTER TABLE public.gold_sales
ADD CONSTRAINT gold_sales_amount_positive CHECK (gold_amount_grams >= 0),
ADD CONSTRAINT gold_sales_price_positive CHECK (price_per_gram >= 0),
ADD CONSTRAINT gold_sales_total_positive CHECK (total_amount >= 0),
ADD CONSTRAINT gold_sales_profit_positive CHECK (profit_amount >= 0);

-- Add validation to prevent negative values in withdrawal requests
ALTER TABLE public.withdrawal_requests
ADD CONSTRAINT withdrawal_amount_positive CHECK (amount >= 0);

-- Add validation to prevent negative values in user investments
ALTER TABLE public.user_investments
ADD CONSTRAINT investment_amount_positive CHECK (amount_invested >= 0);