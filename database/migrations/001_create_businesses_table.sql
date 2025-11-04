-- Create businesses table for BizTrack
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS businesses_user_id_idx ON public.businesses(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS businesses_created_at_idx ON public.businesses(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own businesses
CREATE POLICY "Users can view own businesses" ON public.businesses
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own businesses
CREATE POLICY "Users can insert own businesses" ON public.businesses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own businesses
CREATE POLICY "Users can update own businesses" ON public.businesses
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own businesses
CREATE POLICY "Users can delete own businesses" ON public.businesses
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER handle_businesses_updated_at
    BEFORE UPDATE ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();