-- Drop and recreate the handle_new_user function with proper conflict handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_custom_id TEXT;
BEGIN
  -- Generate custom user ID
  SELECT public.generate_custom_user_id() INTO new_custom_id;
  
  -- Insert profile with conflict handling
  INSERT INTO public.profiles (
    user_id, 
    username, 
    country, 
    email, 
    first_name, 
    last_name,
    phone_number,
    custom_user_id
  )
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data ->> 'country', 'Unknown'),
    new.email,
    new.raw_user_meta_data ->> 'firstName',
    new.raw_user_meta_data ->> 'lastName',
    new.raw_user_meta_data ->> 'phoneNumber',
    new_custom_id
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create wallet balance for user with conflict handling
  INSERT INTO public.wallet_balances (user_id, balance, withdrawable_balance)
  VALUES (new.id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Assign default 'user' role with conflict handling
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN new;
END;
$$;