-- Add foreign key relationship between withdrawal_requests and profiles
ALTER TABLE public.withdrawal_requests
ADD CONSTRAINT withdrawal_requests_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key relationship between gold_sales and profiles
ALTER TABLE public.gold_sales
ADD CONSTRAINT gold_sales_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;