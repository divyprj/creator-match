export const serverConfig = {
  tavilyApiKey: process.env.TAVILY_API_KEY,
  youtubeApiKey: process.env.YOUTUBE_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL,
  gmailUser: process.env.GMAIL_USER,
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD,
};

export const publicConfig = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

export function missingSearchConfiguration() {
  return [
    !serverConfig.tavilyApiKey && "TAVILY_API_KEY",
    !serverConfig.youtubeApiKey && "YOUTUBE_API_KEY",
  ].filter(Boolean) as string[];
}
