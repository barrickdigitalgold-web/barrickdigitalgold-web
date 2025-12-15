-- Create wallet balances table
CREATE TABLE public.wallet_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create payment methods table (admin managed)
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  method_name TEXT NOT NULL,
  account_details TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table for top-ups
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method_id UUID NOT NULL REFERENCES public.payment_methods(id),
  screenshot_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create investment plans table (admin managed)
CREATE TABLE public.investment_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  duration_days INTEGER NOT NULL,
  returns_percentage DECIMAL(5, 2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user investments table
CREATE TABLE public.user_investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.investment_plans(id),
  amount_invested DECIMAL(10, 2) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create gold purchases table
CREATE TABLE public.gold_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gold_amount_grams DECIMAL(10, 4) NOT NULL,
  price_per_gram DECIMAL(10, 2) NOT NULL,
  total_cost DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gold_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wallet_balances
CREATE POLICY "Users can view their own wallet balance"
ON public.wallet_balances FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallet balances"
ON public.wallet_balances FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for payment_methods
CREATE POLICY "Active payment methods are viewable by authenticated users"
ON public.payment_methods FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage payment methods"
ON public.payment_methods FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions"
ON public.transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions"
ON public.transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
ON public.transactions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all transactions"
ON public.transactions FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for investment_plans
CREATE POLICY "Active investment plans are viewable by authenticated users"
ON public.investment_plans FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage investment plans"
ON public.investment_plans FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_investments
CREATE POLICY "Users can view their own investments"
ON public.user_investments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own investments"
ON public.user_investments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all investments"
ON public.user_investments FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for gold_purchases
CREATE POLICY "Users can view their own gold purchases"
ON public.gold_purchases FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own gold purchases"
ON public.gold_purchases FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all gold purchases"
ON public.gold_purchases FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for transaction screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('transaction-screenshots', 'transaction-screenshots', false);

-- Storage policies for transaction screenshots
CREATE POLICY "Users can upload their own transaction screenshots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'transaction-screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own transaction screenshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'transaction-screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all transaction screenshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'transaction-screenshots' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Triggers for updated_at
CREATE TRIGGER update_wallet_balances_updated_at
BEFORE UPDATE ON public.wallet_balances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at
BEFORE UPDATE ON public.payment_methods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_investment_plans_updated_at
BEFORE UPDATE ON public.investment_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to initialize wallet balance for new users
CREATE OR REPLACE FUNCTION public.initialize_wallet_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallet_balances (user_id, balance)
  VALUES (NEW.id, 0.00);
  RETURN NEW;
END;
$$;

-- Trigger to initialize wallet on user creation
CREATE TRIGGER on_user_created_initialize_wallet
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.initialize_wallet_balance();