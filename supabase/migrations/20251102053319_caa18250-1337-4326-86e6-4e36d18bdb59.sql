-- Drop ALL existing storage policies for these buckets
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND (policyname LIKE '%profile%' OR policyname LIKE '%KYC%' OR policyname LIKE '%kyc%')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- Create simplified policies for profile pictures
CREATE POLICY "Allow authenticated users to upload profile pictures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-pictures');

CREATE POLICY "Allow authenticated users to update profile pictures"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-pictures');

CREATE POLICY "Allow public access to profile pictures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

-- Create simplified policies for KYC documents
CREATE POLICY "Allow authenticated users to upload KYC docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'kyc-documents');

CREATE POLICY "Allow authenticated users to update KYC docs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'kyc-documents');

CREATE POLICY "Allow authenticated users to view KYC docs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'kyc-documents');