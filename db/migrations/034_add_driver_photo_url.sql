-- Migration: Add photo_url column to drivers table for profile photo uploads
-- 034_add_driver_photo_url.sql (auto-detect, auto-fix, idempotent)
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_name = 'drivers'
		  AND column_name = 'photo_url'
	) THEN
		ALTER TABLE public.drivers
		ADD COLUMN photo_url text;
	END IF;
END $$;

-- Ensure driver-photos bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-photos', 'driver-photos', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for driver-photos
-- Driver can upload own photo
CREATE POLICY IF NOT EXISTS "drivers upload own photo"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
	bucket_id = 'driver-photos'
	AND auth.uid() = (SELECT auth_user_id FROM drivers WHERE drivers.id = uuid(split_part(name, '/', 2)))
);

-- Driver can read own photo
CREATE POLICY IF NOT EXISTS "drivers read own photo"
ON storage.objects
FOR SELECT TO authenticated
USING (
	bucket_id = 'driver-photos'
	AND auth.uid() = (SELECT auth_user_id FROM drivers WHERE drivers.id = uuid(split_part(name, '/', 2)))
);

-- Admins can read all
CREATE POLICY IF NOT EXISTS "admins read all driver photos"
ON storage.objects
FOR SELECT TO authenticated
USING (
	bucket_id = 'driver-photos'
	AND (auth.jwt() ->> 'user_role') = 'admin'
);

-- Admins can write all
CREATE POLICY IF NOT EXISTS "admins write all driver photos"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
	bucket_id = 'driver-photos'
	AND (auth.jwt() ->> 'user_role') = 'admin'
);