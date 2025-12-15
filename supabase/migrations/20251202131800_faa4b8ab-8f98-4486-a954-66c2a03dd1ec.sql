-- Update the handle_new_user function to include phone_number from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_custom_id TEXT;
BEGIN
  -- Generate custom user ID
  SELECT public.generate_custom_user_id() INTO new_custom_id;
  
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
  );
  
  -- Create wallet balance for user
  INSERT INTO public.wallet_balances (user_id, balance, withdrawable_balance)
  VALUES (new.id, 0, 0);
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  RETURN new;
END;
$$;