-- Allow admins to insert wallet balances
CREATE POLICY "Admins can insert wallet balances"
ON public.wallet_balances FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update wallet balances
CREATE POLICY "Admins can update wallet balances"
ON public.wallet_balances FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));