# Creator Match - Automated Micro-Influencer Discovery and Outreach Dashboard

Creator Match is a premium web dashboard designed for discovering, organizing, and executing outreach campaigns for social media influencers. Built with Next.js (App Router), Supabase, Google Gemini AI, and Resend, the application automates the entire creator-sourcing and message-personalization lifecycle.

---

## Screenshots

### Main Dashboard Loading Creator List
![Main Dashboard](public/screenshots/dashboard.png)

### Personalized Outreach Modal Powered by Gemini AI
![Personalized Outreach Modal](public/screenshots/outreach.png)

---

## Core Features

### 1. Influencer Discovery Engine
* Whitelisted Niche Filtering: Validates input niches against accepted categories: Fashion, Beauty, Fitness, Food, Tech, Gaming, Finance, and Education.
* Independent Scraper Sources: Scrapes creator profile pages and analytics across Qoruz and StarNgage to build a comprehensive data set.
* Resilient Fallback System: Integrates a pre-seeded, curated registry of 10 to 15 real Indian creator profiles per niche (over 90 total profiles) to guarantee dashboard populates even when scraping engines encounter network/security blocks.

### 2. Live Filtering and Segmenting
* Followers Slider: Filters creator list in real-time across micro-influencer ranges from 5k up to 10M followers.
* Location Matching: Queries profiles dynamically by Indian city or state (e.g. Mumbai, Pune, Lucknow) to localize campaigns.
* High-Engagement Segment: Includes a single-click quick-filter for identifying high-performing Indian Fashion and Beauty creators with an engagement rate equal to or greater than 3.00 percent.
* Responsive Pagination: Implements clean pagination rendering 10 influencers per page to guarantee peak client performance.

### 3. Automatic Profile Enrichment
* Comprehensive Metrics: Pulls names, handles, profile images, follower totals, and engagement rates.
* Email Sourcing: Automatically extracts contact emails from creator bios. If a bio lacks an email, it constructs a clean handler fallback to keep the profile outreach-eligible.
* Content Snippets: Seeds and renders the three most recent posts for each creator to establish a baseline for content context.

### 4. Gemini AI Personalization
* Multi-Channel Output: Leverages gemini-flash-latest to dynamically generate a personalized 60-90 word collaboration email and a casual 15-30 word Instagram DM pitch.
* Context-Aware Copywriting: Analyzes the creator's specific niche, handle, bio keywords, and recent posts to ensure highly custom hooks.
* Credit Saver Configuration: Restricts automated API execution. The dashboard presents an explicit outreach generation trigger button, ensuring you only consume Gemini tokens when you decide to.

### 5. Sending Layer
* Native Resend REST API Client: Automatically detects Resend API keys (passwords starting with re_). Sends emails over direct HTTPS REST endpoints, eliminating datacenter IP blocks and SMTP connection timeouts.
* Nodemailer SMTP Client: Falls back to a standard SMTP transporter for personal mail hosting or custom mail servers.
* Sandbox Redirection Fallback: Detects Resend sandbox restrictions and automatically redirects emails to your verified account owner address (surajdivyansh104@gmail.com) with a Sandbox Redirect tag, preventing runtime crashes and ensuring full demo verification.
* Outreach Tracking: Commits attempts (subject, type, body, status) to the outreach_logs database table and updates the creator's status in real-time.

### 6. CSV Data Export
* Renders and compiles the currently filtered or searched influencer table into a downloadable CSV file.

---

## Technology Stack

* Frontend Core: Next.js 16 (App Router), React 19, TypeScript
* Styling: Vanilla CSS, Tailwind CSS
* Database Layer: Supabase (PostgreSQL)
* AI Personalization: Google Generative AI SDK (gemini-flash-latest)
* Mail Delivery: Nodemailer SMTP, Resend HTTPS API

---

## Database Architecture

Create the following tables and Row-Level Security (RLS) policies in your Supabase SQL editor. The schema SQL is located in `supabase/schema.sql`.

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

-- 3. Enable Row-Level Security
ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_logs ENABLE ROW LEVEL SECURITY;

-- 4. Set access control policies
CREATE POLICY "Enable all access for anon users on influencers"
ON public.influencers FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for anon users on outreach_logs"
ON public.outreach_logs FOR ALL USING (true) WITH CHECK (true);
```

---

## Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-public-key

# Gemini API Configuration
GEMINI_API_KEY=your-google-gemini-api-key

# Email Sending Configuration (SMTP or Resend API Key)
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=your-resend-api-key-starting-with-re_
```

---

## Local Setup and Running

1. Install project dependencies:
   ```bash
   npm install
   ```
2. Launch the local development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## API Routes

### 1. Discover Search
* Endpoint: `POST /api/discovery/search`
* Description: Searches and imports creators into Supabase based on niche and location.
* Payload:
  ```json
  {
    "niche": "Fashion",
    "location": "Mumbai"
  }
  ```

### 2. Discover Enrich
* Endpoint: `POST /api/discovery/enrich`
* Description: Enriches profiles with contact details, statistics, and recent content.
* Payload:
  ```json
  {
    "handle": "aarohirawat2270"
  }
  ```

### 3. Generate Outreach
* Endpoint: `POST /api/outreach/generate`
* Description: Generates personalized DM and Email proposals via Gemini API.
* Payload:
  ```json
  {
    "creatorId": "123",
    "collabType": "Sponsored Post"
  }
  ```

### 4. Send Email
* Endpoint: `POST /api/outreach/send-email`
* Description: Sends outreach proposals via SMTP or Resend API.
* Payload:
  ```json
  {
    "creatorId": "123",
    "subject": "Collaboration Offer",
    "body": "Email body content"
  }
  ```
