-- Create lock_periods table for custom lock periods
CREATE TABLE public.lock_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_days integer NOT NULL,
  profit_percentage numeric NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT positive_days CHECK (period_days > 0),
  CONSTRAINT positive_profit CHECK (profit_percentage >= 0)
);

-- Enable RLS
ALTER TABLE public.lock_periods ENABLE ROW LEVEL SECURITY;

-- RLS policies for lock_periods
CREATE POLICY "Everyone can view active lock periods"
ON public.lock_periods
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage lock periods"
ON public.lock_periods
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create country_gold_prices table
CREATE TABLE public.country_gold_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL UNIQUE,
  sell_price_per_gram numeric NOT NULL,
  buy_price_per_gram numeric NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT positive_sell_price CHECK (sell_price_per_gram >= 0),
  CONSTRAINT positive_buy_price CHECK (buy_price_per_gram >= 0)
);

-- Enable RLS
ALTER TABLE public.country_gold_prices ENABLE ROW LEVEL SECURITY;

-- RLS policies for country_gold_prices
CREATE POLICY "Everyone can view active country prices"
ON public.country_gold_prices
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage country prices"
ON public.country_gold_prices
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add is_hidden column to profiles table
ALTER TABLE public.profiles
ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;

-- Insert default lock periods
INSERT INTO public.lock_periods (period_days, profit_percentage) VALUES
(30, 5.0),
(60, 8.0),
(90, 12.0);

-- Insert default country prices
INSERT INTO public.country_gold_prices (country, sell_price_per_gram, buy_price_per_gram) VALUES
('India', 6500.00, 6800.00),
('Bangladesh', 7000.00, 7300.00),
('UAE', 250.00, 260.00),
('USA', 75.00, 78.00),
('UK', 65.00, 68.00),
('Saudi Arabia', 280.00, 290.00),
('Kuwait', 24.00, 25.00),
('Qatar', 280.00, 290.00),
('Oman', 29.00, 30.00),
('Bahrain', 28.00, 29.00);

-- Create trigger for lock_periods updated_at
CREATE TRIGGER update_lock_periods_updated_at
BEFORE UPDATE ON public.lock_periods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for country_gold_prices updated_at
CREATE TRIGGER update_country_gold_prices_updated_at
BEFORE UPDATE ON public.country_gold_prices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();