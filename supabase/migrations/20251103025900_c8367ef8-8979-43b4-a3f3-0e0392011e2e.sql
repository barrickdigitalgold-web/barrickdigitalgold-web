-- Allow users to update their own wallet balance
DROP POLICY IF EXISTS "Users can update their own wallet balance" ON wallet_balances;

CREATE POLICY "Users can update their own wallet balance" 
ON wallet_balances 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);