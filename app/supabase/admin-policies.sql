-- Optional Admin Override Policies for Monica, Sylvia, and Veronica
-- These policies allow admin users to access all files regardless of ownership

-- 1. Admin policy for viewing all storage objects
CREATE POLICY "company_assets_admin_view_all"
ON storage.objects
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  bucket_id = 'company_assets' 
  AND (
    (auth.jwt() ->> 'role') = 'admin'
    OR 
    auth.email() IN ('monica@movearoundtms.com', 'sylvia@movearoundtms.com', 'veronica@movearoundtms.com')
  )
);

-- 2. Admin policy for uploading to any location
CREATE POLICY "company_assets_admin_upload_all"
ON storage.objects
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company_assets' 
  AND (
    (auth.jwt() ->> 'role') = 'admin'
    OR 
    auth.email() IN ('monica@movearoundtms.com', 'sylvia@movearoundtms.com', 'veronica@movearoundtms.com')
  )
);

-- 3. Admin policy for updating any file
CREATE POLICY "company_assets_admin_update_all"
ON storage.objects
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company_assets' 
  AND (
    (auth.jwt() ->> 'role') = 'admin'
    OR 
    auth.email() IN ('monica@movearoundtms.com', 'sylvia@movearoundtms.com', 'veronica@movearoundtms.com')
  )
)
WITH CHECK (
  bucket_id = 'company_assets' 
  AND (
    (auth.jwt() ->> 'role') = 'admin'
    OR 
    auth.email() IN ('monica@movearoundtms.com', 'sylvia@movearoundtms.com', 'veronica@movearoundtms.com')
  )
);

-- 4. Admin policy for deleting any file
CREATE POLICY "company_assets_admin_delete_all"
ON storage.objects
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  bucket_id = 'company_assets' 
  AND (
    (auth.jwt() ->> 'role') = 'admin'
    OR 
    auth.email() IN ('monica@movearoundtms.com', 'sylvia@movearoundtms.com', 'veronica@movearoundtms.com')
  )
);

-- 5. Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    (auth.jwt() ->> 'role') = 'admin'
    OR 
    auth.email() IN ('monica@movearoundtms.com', 'sylvia@movearoundtms.com', 'veronica@movearoundtms.com')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Alternative: Update company_assets_objects view to show all files for admins
CREATE OR REPLACE VIEW company_assets_objects AS
SELECT 
  o.id,
  o.name,
  o.created_at,
  o.updated_at,
  o.last_accessed_at,
  o.metadata,
  first_folder_segment(o.name) as user_folder,
  CASE 
    WHEN is_admin_user() THEN 'admin'
    ELSE auth.uid()::text
  END as access_level
FROM storage.objects o
WHERE 
  o.bucket_id = 'company_assets'
  AND (
    -- Regular users see only their files
    (NOT is_admin_user() AND first_folder_segment(o.name) = auth.uid()::text)
    OR
    -- Admins see all files
    is_admin_user()
  );

-- 7. Shared Folder Policies
-- Allow everyone to read shared files
CREATE POLICY "company_assets_read_shared"
ON storage.objects
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  bucket_id = 'company_assets'
  AND first_folder_segment(name) = 'shared'
);

-- Allow only admins to write/delete shared files
CREATE POLICY "company_assets_write_delete_shared_admins"
ON storage.objects
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  bucket_id = 'company_assets'
  AND first_folder_segment(name) = 'shared'
  AND (
    (auth.jwt() ->> 'role') = 'admin'
    OR 
    auth.email() IN ('monica@movearoundtms.com', 'sylvia@movearoundtms.com', 'veronica@movearoundtms.com')
  )
)
WITH CHECK (
  bucket_id = 'company_assets'
  AND first_folder_segment(name) = 'shared'
  AND (
    (auth.jwt() ->> 'role') = 'admin'
    OR 
    auth.email() IN ('monica@movearoundtms.com', 'sylvia@movearoundtms.com', 'veronica@movearoundtms.com')
  )
);

-- Usage Instructions:
-- 1. Run these policies to enable admin access
-- 2. Set admin role in JWT claims for Monica, Sylvia, Veronica
-- 3. Or rely on email-based checking (already included above)
-- 4. Test with /api/storage/list to verify admins see all files
-- 5. Shared folder accessible to all, editable by admins only