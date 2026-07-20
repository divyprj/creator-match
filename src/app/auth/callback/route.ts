import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Landing route for magic links and email confirmations. Supabase redirects here with a PKCE
 * `code`, which must be exchanged for a session cookie before the dashboard can be reached.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirectTo = url.searchParams.get("next") ?? "/dashboard";

  // Only same-origin relative paths are honoured, so a crafted link cannot bounce a freshly
  // authenticated visitor to an external site.
  const safeRedirect = redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/auth?error=missing-code", url.origin));
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/auth?error=not-configured", url.origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/auth?error=link-expired", url.origin));
  }

  return NextResponse.redirect(new URL(safeRedirect, url.origin));
}
