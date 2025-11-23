-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON public.profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- RLS Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- RLS Policy: Users can delete their own profile
CREATE POLICY "Users can delete own profile" ON public.profiles
    FOR DELETE USING (auth.uid() = id);

-- Insert or update profile function (upsert helper)
CREATE OR REPLACE FUNCTION public.upsert_profile(
    user_id UUID,
    full_name TEXT DEFAULT NULL,
    avatar_url TEXT DEFAULT NULL,
    phone TEXT DEFAULT NULL
)
RETURNS public.profiles AS $$
DECLARE
    result public.profiles;
BEGIN
    -- Try to insert, on conflict update
    INSERT INTO public.profiles (id, full_name, avatar_url, phone)
    VALUES (user_id, full_name, avatar_url, phone)
    ON CONFLICT (id) 
    DO UPDATE SET
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        phone = COALESCE(EXCLUDED.phone, profiles.phone),
        updated_at = NOW()
    RETURNING * INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;