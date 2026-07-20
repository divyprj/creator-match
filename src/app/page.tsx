import { LandingExperience } from "@/components/landing-experience";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  return <LandingExperience isAuthenticated={Boolean(user)} />;
}
