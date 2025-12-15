-- Add custom_user_id column to profiles table
ALTER TABLE public.profiles ADD COLUMN custom_user_id TEXT UNIQUE;

-- Create a function to generate the next custom user ID
CREATE OR REPLACE FUNCTION public.generate_custom_user_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
  new_id TEXT;
BEGIN
  -- Get the highest number from existing custom_user_ids
  SELECT COALESCE(MAX(CAST(SUBSTRING(custom_user_id FROM 4) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.profiles
  WHERE custom_user_id ~ '^CHR[0-9]+$';
  
  -- Generate new ID with leading zeros (e.g., CHR001, CHR002, etc.)
  new_id := 'CHR' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN new_id;
END;
$$;

-- Update the handle_new_user function to generate custom user ID
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile with custom user ID
  INSERT INTO public.profiles (user_id, username, country, custom_user_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', 'User'),
    COALESCE(new.raw_user_meta_data->>'country', 'India'),
    public.generate_custom_user_id()
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  RETURN new;
END;
$$;

-- Generate custom user IDs for existing users who don't have one
DO $$
DECLARE
  profile_record RECORD;
  counter INTEGER := 1;
BEGIN
  FOR profile_record IN 
    SELECT id FROM public.profiles WHERE custom_user_id IS NULL ORDER BY created_at
  LOOP
    UPDATE public.profiles 
    SET custom_user_id = 'CHR' || LPAD(counter::TEXT, 3, '0')
    WHERE id = profile_record.id;
    counter := counter + 1;
  END LOOP;
END $$;