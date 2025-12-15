-- Add first_name, last_name, and email columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Update the handle_new_user function to save first_name, last_name, and email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile with custom user ID and all user data
  INSERT INTO public.profiles (user_id, username, country, custom_user_id, first_name, last_name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', 'User'),
    COALESCE(new.raw_user_meta_data->>'country', 'India'),
    public.generate_custom_user_id(),
    COALESCE(new.raw_user_meta_data->>'firstName', new.raw_user_meta_data->>'first_name'),
    COALESCE(new.raw_user_meta_data->>'lastName', new.raw_user_meta_data->>'last_name'),
    new.email
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  RETURN new;
END;
$$;