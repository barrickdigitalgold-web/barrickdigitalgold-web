-- Create table to track when admins last viewed each section
CREATE TABLE IF NOT EXISTS public.admin_section_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  section_name TEXT NOT NULL,
  last_viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(admin_user_id, section_name)
);

-- Enable RLS
ALTER TABLE public.admin_section_views ENABLE ROW LEVEL SECURITY;

-- Admins can manage their own section views
CREATE POLICY "Admins can view their own section views"
ON public.admin_section_views
FOR SELECT
USING (auth.uid() = admin_user_id);

CREATE POLICY "Admins can insert their own section views"
ON public.admin_section_views
FOR INSERT
WITH CHECK (auth.uid() = admin_user_id);

CREATE POLICY "Admins can update their own section views"
ON public.admin_section_views
FOR UPDATE
USING (auth.uid() = admin_user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_admin_section_views_user_section 
ON public.admin_section_views(admin_user_id, section_name);