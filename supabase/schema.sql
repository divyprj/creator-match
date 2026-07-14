-- Create the influencers table
CREATE TABLE IF NOT EXISTS public.influencers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    handle TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    followers_count INTEGER NOT NULL,
    engagement_rate NUMERIC, -- stored as decimal e.g. 4.92
    engagement_rate_str TEXT, -- stored as string e.g. "4.92%"
    location TEXT,
    niche TEXT NOT NULL,
    bio TEXT,
    profile_image TEXT,
    recent_posts JSONB DEFAULT '[]'::jsonb,
    outreach_status TEXT DEFAULT 'uncontacted' CHECK (outreach_status IN ('uncontacted', 'draft_created', 'emailed', 'dm_copied')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create the outreach_logs table
CREATE TABLE IF NOT EXISTS public.outreach_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    influencer_id BIGINT REFERENCES public.influencers(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('email', 'dm')),
    subject TEXT, -- applicable for email
    content TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create the settings table (singleton row to store configs if needed)
CREATE TABLE IF NOT EXISTS public.settings (
    id INTEGER PRIMARY KEY CHECK (id = 1) DEFAULT 1,
    smtp_host TEXT,
    smtp_port INTEGER,
    smtp_user TEXT,
    smtp_pass TEXT,
    gemini_api_key TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert the default settings row
INSERT INTO public.settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_influencers_updated_at
    BEFORE UPDATE ON public.influencers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add simple indexes for performance
CREATE INDEX IF NOT EXISTS idx_influencers_niche ON public.influencers(niche);
CREATE INDEX IF NOT EXISTS idx_influencers_status ON public.influencers(outreach_status);
CREATE INDEX IF NOT EXISTS idx_influencers_followers ON public.influencers(followers_count);
