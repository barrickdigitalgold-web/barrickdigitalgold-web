-- Create promotional_offers table
CREATE TABLE public.promotional_offers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promotional_offers ENABLE ROW LEVEL SECURITY;

-- Everyone can view active promotional offers
CREATE POLICY "Active offers are viewable by everyone"
ON public.promotional_offers
FOR SELECT
USING (is_active = true);

-- Admins can manage promotional offers
CREATE POLICY "Admins can manage promotional offers"
ON public.promotional_offers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));