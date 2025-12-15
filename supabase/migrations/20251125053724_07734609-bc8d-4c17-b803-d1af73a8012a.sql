-- Create storage bucket for promotional images
INSERT INTO storage.buckets (id, name, public)
VALUES ('promotional-images', 'promotional-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for promotional images bucket
CREATE POLICY "Anyone can view promotional images"
ON storage.objects FOR SELECT
USING (bucket_id = 'promotional-images');

CREATE POLICY "Admins can upload promotional images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'promotional-images' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'staff')
  )
);

CREATE POLICY "Admins can delete promotional images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'promotional-images' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'staff')
  )
);