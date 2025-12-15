-- Create withdrawal_requests table
CREATE TABLE public.withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on withdrawal_requests
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for withdrawal_requests
CREATE POLICY "Users can create their own withdrawal requests"
ON public.withdrawal_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own withdrawal requests"
ON public.withdrawal_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawal requests"
ON public.withdrawal_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update withdrawal requests"
ON public.withdrawal_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create gold_settings table for admin configuration
CREATE TABLE public.gold_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  minimum_sell_grams NUMERIC NOT NULL DEFAULT 4.00,
  current_price_per_gram NUMERIC NOT NULL DEFAULT 0.00,
  daily_profit_percentage NUMERIC NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.gold_settings (minimum_sell_grams, current_price_per_gram, daily_profit_percentage)
VALUES (4.00, 0.00, 0.00);

-- Enable RLS on gold_settings
ALTER TABLE public.gold_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for gold_settings
CREATE POLICY "Everyone can view gold settings"
ON public.gold_settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can update gold settings"
ON public.gold_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create gold_sales table to track gold selling transactions
CREATE TABLE public.gold_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  gold_amount_grams NUMERIC NOT NULL,
  price_per_gram NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on gold_sales
ALTER TABLE public.gold_sales ENABLE ROW LEVEL SECURITY;

-- RLS policies for gold_sales
CREATE POLICY "Users can create their own gold sales"
ON public.gold_sales
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own gold sales"
ON public.gold_sales
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all gold sales"
ON public.gold_sales
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow users to update their investments (for withdrawal)
CREATE POLICY "Users can update their own investments"
ON public.user_investments
FOR UPDATE
USING (auth.uid() = user_id);

-- Update trigger for withdrawal_requests
CREATE TRIGGER update_withdrawal_requests_updated_at
BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();