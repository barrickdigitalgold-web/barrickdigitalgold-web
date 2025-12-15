-- Update the handle_new_user function to also create a welcome chat message
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_custom_id TEXT;
  profile_exists BOOLEAN;
  wallet_exists BOOLEAN;
  role_exists BOOLEAN;
  new_conversation_id UUID;
  user_first_name TEXT;
BEGIN
  -- Check if profile already exists for this user
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = new.id) INTO profile_exists;
  
  -- Only create profile if it doesn't exist
  IF NOT profile_exists THEN
    -- Generate custom user ID
    SELECT public.generate_custom_user_id() INTO new_custom_id;
    
    -- Get first name for welcome message
    user_first_name := COALESCE(new.raw_user_meta_data ->> 'firstName', split_part(new.email, '@', 1));
    
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
    
    -- Create welcome chat conversation and message for new users
    INSERT INTO public.chat_conversations (user_id, subject, status)
    VALUES (new.id, 'Welcome to Barrick Digital Gold', 'open')
    RETURNING id INTO new_conversation_id;
    
    -- Insert welcome message from system (using the new user's ID as sender temporarily, will be from support)
    INSERT INTO public.chat_messages (conversation_id, sender_id, message)
    VALUES (
      new_conversation_id, 
      new.id, -- Will show as system message
      'Hello ' || user_first_name || '! Welcome to your digital gold journey. We are here to provide you with a seamless experience, advanced features, complete support, and top-level security. If you need any help, our customer support team is always ready to assist you. Wishing you a successful and bright future in the world of digital gold!'
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
$$;