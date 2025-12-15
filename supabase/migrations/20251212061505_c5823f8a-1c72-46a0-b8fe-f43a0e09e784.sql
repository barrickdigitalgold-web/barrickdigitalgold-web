-- Drop the redundant trigger on auth.users table first
DROP TRIGGER IF EXISTS on_user_created_initialize_wallet ON auth.users;

-- Drop the redundant initialize_wallet_balance function
DROP FUNCTION IF EXISTS public.initialize_wallet_balance();

-- Update handle_new_user to use ON CONFLICT for safety to prevent duplicate key errors
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_custom_id TEXT;
  new_conversation_id UUID;
  user_first_name TEXT;
BEGIN
  -- Generate custom user ID
  SELECT public.generate_custom_user_id() INTO new_custom_id;
  
  -- Get first name for welcome message
  user_first_name := COALESCE(new.raw_user_meta_data ->> 'firstName', split_part(new.email, '@', 1));
  
  -- Insert profile with ON CONFLICT to handle duplicates safely
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
  
  -- Insert wallet balance with ON CONFLICT to handle duplicates safely
  INSERT INTO public.wallet_balances (user_id, balance, withdrawable_balance)
  VALUES (new.id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Insert user role with ON CONFLICT to handle duplicates safely
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Create welcome chat conversation and message for new users (only if none exists)
  IF NOT EXISTS (SELECT 1 FROM public.chat_conversations WHERE user_id = new.id) THEN
    INSERT INTO public.chat_conversations (user_id, subject, status)
    VALUES (new.id, 'Welcome to Barrick Digital Gold', 'open')
    RETURNING id INTO new_conversation_id;
    
    -- Insert welcome message
    INSERT INTO public.chat_messages (conversation_id, sender_id, message)
    VALUES (
      new_conversation_id, 
      new.id,
      'Hello ' || user_first_name || '! Welcome to your digital gold journey. We are here to provide you with a seamless experience, advanced features, complete support, and top-level security. If you need any help, our customer support team is always ready to assist you. Wishing you a successful and bright future in the world of digital gold!'
    );
  END IF;
  
  RETURN new;
END;
$function$;