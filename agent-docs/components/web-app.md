# Web application brief

Last updated: 2026-07-20

The application uses the Next.js App Router. `/` is the public landing/discovery surface, `/auth` owns authentication, `/auth/callback` exchanges magic-link PKCE codes for a session, and `/dashboard` is the authenticated workspace. API routes live under `src/app/api/`.

`src/components/landing-experience.tsx` owns the editorial AIDA page and GSAP motion. `creator-search.tsx` owns filters, the 1K–100K range, live results, result sorting, saved creator writes, and CSV export. `outreach-studio.tsx` owns the de-identified brief, draft review, Gmail confirmation, and manual Instagram profile handoff.

Sorting supports engagement rate, followers, and evidence strength. Null metrics always sort last instead of coercing to zero, so an unverified creator is never ranked beneath a genuinely low-performing one. The active sort is what the CSV export writes.

`/dashboard` reports creators found (summed `discovery_runs.result_count`), creators saved, creators contacted (`outreach_events` with status `sent`), and mean verified engagement across saved rows. The saved list is ordered by engagement rate with nulls last.

The root page checks the Supabase session and passes an authentication boundary to client components. `src/proxy.ts` refreshes Supabase cookies. Missing public Supabase configuration leaves discovery available while authenticated controls explain setup requirements.

## See also

- [../01-project-overview.md](../01-project-overview.md)
- [data-auth.md](data-auth.md)
- [../workflows/local-verification.md](../workflows/local-verification.md)
- [../status/web-app-status.md](../status/web-app-status.md)
