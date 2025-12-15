-- Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_custom_id TEXT;
  profile_exists BOOLEAN;
  wallet_exists BOOLEAN;
  role_exists BOOLEAN;
BEGIN
  -- Check if profile already exists for this user
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = new.id) INTO profile_exists;
  
  -- Only create profile if it doesn't exist
  IF NOT profile_exists THEN
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
  END IF;
  
  -- Check if wallet already exists for this user
  SELECT EXISTS(SELECT 1 FROM public.wallet_balances WHERE user_id = new.id) INTO wallet_exists;
  
  -- Only create wallet if it doesn't exist
  IF NOT wallet_exists THEN
    INSERT INTO public.wallet_balances (user_id, balance, withdrawable_balance)
    VALUES (new.id, 0, 0);
  END IF;
  
  -- Check if role already exists for this user
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = new.id AND role = 'user') INTO role_exists;
  
  -- Only assign role if it doesn't exist
  IF NOT role_exists THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'user');
  END IF;
  
  RETURN new;
END;
$function$;