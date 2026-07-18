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

-- 1. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 2. Create role-scoped policies
-- Anon users (browser client) can only READ data
DROP POLICY IF EXISTS "Enable all access for anon users on influencers" ON public.influencers;
DROP POLICY IF EXISTS "Anon read-only on influencers" ON public.influencers;
CREATE POLICY "Anon read-only on influencers"
ON public.influencers FOR SELECT
TO anon
USING (true);

-- Service role (server-side API routes) can do everything
DROP POLICY IF EXISTS "Service role full access on influencers" ON public.influencers;
CREATE POLICY "Service role full access on influencers"
ON public.influencers FOR ALL
TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for anon users on outreach_logs" ON public.outreach_logs;
DROP POLICY IF EXISTS "Anon read-only on outreach_logs" ON public.outreach_logs;
CREATE POLICY "Anon read-only on outreach_logs"
ON public.outreach_logs FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Service role full access on outreach_logs" ON public.outreach_logs;
CREATE POLICY "Service role full access on outreach_logs"
ON public.outreach_logs FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- For security, the settings table contains sensitive API keys and SMTP credentials.
-- RLS is enabled, and NO public read/write access policies are created for this table.
-- App credentials should be configured using server-side environment variables (.env.local).
DROP POLICY IF EXISTS "Enable all access for anon users on settings" ON public.settings;
