-- Add phone number and email columns to drivers table for SMS and auth matching
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index on phone for fast SMS webhook lookups
CREATE INDEX IF NOT EXISTS idx_drivers_phone ON public.drivers(phone) WHERE phone IS NOT NULL;

-- Create index on email for auth user matching
CREATE INDEX IF NOT EXISTS idx_drivers_email ON public.drivers(email) WHERE email IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.drivers.phone IS 'Driver phone number in E.164 format (e.g., +15551234567) for SMS ticket uploads';
COMMENT ON COLUMN public.drivers.email IS 'Driver email matching Supabase auth user for profile access';
