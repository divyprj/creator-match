export interface Creator {
  id: string;
  handle: string;
  name: string;
  email: string | null;
  followers_count: number;
  engagement_rate: number | null;
  engagement_rate_str: string | null;
  location: string | null;
  niche: string;
  bio: string | null;
  profile_image: string | null;
  recent_posts: RecentPost[] | null;
  outreach_status: string;
  created_at?: string;
  updated_at?: string;
}

export interface RecentPost {
  text?: string;
  url?: string;
  likes?: string | number;
  comments?: string | number;
  views?: string | number;
  type?: string;
}

export interface OutreachLog {
  id: string;
  influencer_id: string;
  type: 'email' | 'dm';
  subject: string | null;
  content: string;
  status: 'draft' | 'sent';
  created_at: string;
}

export interface AppSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  gemini_api_key: string;
}

export const VALID_NICHES = [
  'Fashion', 'Beauty', 'Fitness', 'Food', 'Tech',
  'Gaming', 'Finance', 'Education', 'Travel', 'Parenting',
] as const;

export type Niche = (typeof VALID_NICHES)[number];
