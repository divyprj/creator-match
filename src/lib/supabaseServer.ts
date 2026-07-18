import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Server-side Supabase ADMIN client using the service_role key.
 * Bypasses Row Level Security — use ONLY in server-side API routes for writes.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!serviceRoleKey) {
  console.warn(
    'SUPABASE_SERVICE_ROLE_KEY is not set. Server-side write operations will fail. ' +
    'Add it to your .env.local from your Supabase dashboard (Settings → API → service_role key).'
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Create a server-side Supabase client that reads the user's auth session
 * from cookies. Use this in API routes to get the authenticated user_id.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can fail in Server Components (read-only context) — safe to ignore
          }
        },
      },
    }
  );
}

/**
 * Helper: Extract the authenticated user's ID from cookies.
 * Returns null if not authenticated.
 */
export async function getAuthUserId(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}
