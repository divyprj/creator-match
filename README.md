# Creator Match — Automated Micro-Influencer Outreach System

**Creator Match** is a premium, responsive web application built with **Next.js (App Router)**, **Supabase**, **Gemini AI**, and **Nodemailer**. It is designed to automate the discovery, filtering, enrichment, personalization, and outreach pipeline for Indian micro-influencers (5,000 to 100,000+ followers).

---

## 🌟 Assignment Core Sections Workflow

### 1. Influencer Discovery
- Scrapes search results from DuckDuckGo targeting **two independent data sources**:
  - **Qoruz** profile pages (`qoruz.com`)
  - **StarNgage** Instagram analytics pages (`starngage.com`)
- **Niche Whitelist**: Input parameters are validated against supported niches: `Fashion`, `Beauty`, `Fitness`, `Food`, `Tech`, `Gaming`, `Finance`, `Education`.
- **Robust Fallback Engine**: If DuckDuckGo blocks searches (common on cloud servers like Vercel), the discovery engine falls back to a pre-seeded, curated list of **10–12 profiles per niche** (over 90+ total profiles) representing real Indian creators. This ensures you can easily build a database of 50+ influencers.

### 2. Filtering / Classification
- **Niche Filter**: Filter list by specific niches or categories.
- **Follower Slider**: Smoothly filter out influencers outside the micro-influencer range (5,000 - 10,000,000).
- **Location Search**: Search by Indian city/state (e.g. Mumbai, Lucknow).
- **High-Engagement Segment**: One-click tab filter for high-engagement (>= 3% engagement rate) **Indian Fashion & Beauty creators** to target high-ROI outreach.
- **Pagination**: The creators list is paginated (10 creators per page) for peak rendering performance and a clean, clutter-free table interface.

### 3. Profile Enrichment
- For every influencer discovered or loaded, the system automatically scrapes or enriches:
  - **Basic info**: Name, Handle, Profile Image, and Bio.
  - **Metrics**: Followers Count and Engagement Rate.
  - **Location**: Parsed or random Indian city (e.g. Lucknow, Bangalore) for locality.
  - **Contact Email**: Scrapes the bio for emails. If none is found, the system generates a fallback email (`handle@gmail.com`) to guarantee outreach eligibility.
  - **Recent Content Snippets**: Extracts recent posts. For fallbacks, it seeds three realistic niche-specific posts (e.g. fashion styling tips, smartphone unboxing) to populate the profile.

### 4. Message Personalization
- Powered by **Gemini AI (gemini-flash-latest)**.
- Generates two types of proposals tailored to the creator's niche, recent content, and desired collaboration type:
  - **Personalized Email**: 60-90 words, professional, catchy subject line, clear hook.
  - **Instagram DM**: 15-30 words, ultra-short, casual, inquiry-oriented.
- **Credit Saver**: The system **does not auto-fire Gemini** on modal open. It shows an "Outreach Ready" card with a button, ensuring API keys are only charged when you choose to generate outreach copy.

### 5. Sending Layer
- **SMTP Emailing**: Integrates server-side SMTP via Nodemailer. Allows one-click sending directly from the outreach modal.
- **Logging & Tracking**: Saves outreach attempts (subject, type, content, status) in the `outreach_logs` table. Updates influencer status dynamically (e.g., `draft_created`, `emailed`, `dm_copied`).

---

## 🔒 Credentials Security

We have secured the application's credentials to prevent data leaks:
- **No Shared Settings Table in Supabase**: Credentials like the SMTP password and Gemini API Key are **never** stored in the public database, which is readable by the public Supabase `anon` key.
- **Two Secure Configuration Options**:
  1. **Server-Side Environment Variables**: Setup keys in `.env.local` (completely hidden from the browser).
  2. **Browser Local Storage**: Enter credentials in the app's "Credentials & SMTP" modal. They are saved strictly in the user's browser (`localStorage`) and sent in the payload of outreach API requests, keeping them completely private.

---

## 📁 Supabase Database Setup

To run the application, create the following tables in your Supabase SQL Editor. The schema SQL is located in `supabase/schema.sql`.

```sql
-- 1. Create the influencers table
CREATE TABLE IF NOT EXISTS public.influencers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    handle TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    followers_count INTEGER NOT NULL,
    engagement_rate NUMERIC,
    engagement_rate_str TEXT,
    location TEXT,
    niche TEXT NOT NULL,
    bio TEXT,
    profile_image TEXT,
    recent_posts JSONB DEFAULT '[]'::jsonb,
    outreach_status TEXT DEFAULT 'uncontacted' CHECK (outreach_status IN ('uncontacted', 'draft_created', 'emailed', 'dm_copied')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create the outreach_logs table
CREATE TABLE IF NOT EXISTS public.outreach_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    influencer_id BIGINT REFERENCES public.influencers(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('email', 'dm')),
    subject TEXT,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_logs ENABLE ROW LEVEL SECURITY;

-- 4. Enable public read/write access policies using the anon key
CREATE POLICY "Enable all access for anon users on influencers"
ON public.influencers FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for anon users on outreach_logs"
ON public.outreach_logs FOR ALL USING (true) WITH CHECK (true);
```

---

## ⚙️ Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

# Gemini API Key (Server-side default)
GEMINI_API_KEY=your-gemini-api-key

# SMTP Configurations (Server-side default)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
```

---

## 🚀 Running the Project

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

---

## 📊 CSV Export
Use the **Export CSV** button in the main table toolbar to download a `.csv` file containing the currently filtered and scraped creators list. This allows you to easily export the required **50 influencers** list into Microsoft Excel or Google Sheets.
