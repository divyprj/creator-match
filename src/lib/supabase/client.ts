import { createBrowserClient } from "@supabase/ssr";
import { publicConfig } from "@/lib/config";

export function createClient() {
  if (!publicConfig.supabaseUrl || !publicConfig.supabaseAnonKey) {
    throw new Error("Supabase browser configuration is missing.");
  }
  return createBrowserClient(publicConfig.supabaseUrl, publicConfig.supabaseAnonKey);
}
