-- Create table for country-specific gold rates
CREATE TABLE public.gold_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country TEXT NOT NULL,
  rate_24k_per_10g NUMERIC NOT NULL DEFAULT 0.00,
  rate_22k_per_10g NUMERIC NOT NULL DEFAULT 0.00,
  change_24k NUMERIC NOT NULL DEFAULT 0.00,
  change_22k NUMERIC NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(country)
);

-- Enable RLS
ALTER TABLE public.gold_rates ENABLE ROW LEVEL SECURITY;

-- Everyone can view gold rates
CREATE POLICY "Everyone can view gold rates"
  ON public.gold_rates
  FOR SELECT
  USING (true);

-- Admins can manage gold rates
CREATE POLICY "Admins can manage gold rates"
  ON public.gold_rates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default rates for India
INSERT INTO public.gold_rates (country, rate_24k_per_10g, rate_22k_per_10g, change_24k, change_22k)
VALUES ('India', 121740.00, 111610.00, -920.00, -850.00)
ON CONFLICT (country) DO NOTHING;