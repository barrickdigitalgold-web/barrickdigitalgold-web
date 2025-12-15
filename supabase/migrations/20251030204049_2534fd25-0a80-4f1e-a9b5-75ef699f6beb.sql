-- Add lock period and maturity tracking to gold purchases
ALTER TABLE gold_purchases
ADD COLUMN lock_period_days INTEGER NOT NULL DEFAULT 0,
ADD COLUMN maturity_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Add status column to track if gold is locked or mature
ALTER TABLE gold_purchases
ADD COLUMN status TEXT NOT NULL DEFAULT 'mature' CHECK (status IN ('locked', 'mature'));

-- Update existing records to be mature
UPDATE gold_purchases SET status = 'mature' WHERE maturity_date <= now();

-- Add profit column to gold_sales to track profit from price difference
ALTER TABLE gold_sales
ADD COLUMN profit_amount NUMERIC NOT NULL DEFAULT 0.00;

-- Add purchase_id reference to track which purchase the sale came from
ALTER TABLE gold_sales
ADD COLUMN purchase_id UUID REFERENCES gold_purchases(id);