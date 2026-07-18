<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Creator Match Developer Guidelines

## 1. Dynamic Niche System
* **Fully Open-Ended**: Both the sidebar niche filter and the discovery panel use **free-text inputs** — not dropdowns. Users can type *any* niche keyword (Fashion, Parenting, K-Pop, Automotive, etc.) and get live filtered results or discover new creators.
* **No UI Restrictions**: Do not add dropdown selects or whitelist checks for niches anywhere in the frontend or backend. The system is designed to accept any keyword.
* **Sidebar Filter**: The sidebar niche text input uses debounced `ilike` matching with wildcards (`%keyword%`), so partial matches work (e.g. typing "fash" matches "Fashion & Beauty"). An empty input shows all niches.
* **Search API**: The search API (`api/discovery/search`) accepts any niche keyword via DuckDuckGo. If DuckDuckGo returns no results and no pre-seeded fallback exists for that niche, the API returns **0 results with a message** — it does NOT fall back to unrelated niches.
* **Fallback Content**: Pre-seeded fallback profiles have been completely removed from the codebase. If live search yields no results, the system returns 0 results instead of falling back to static profiles.
* **Segment Filter**: The sidebar "High Engagement (>3% ER)" segment filters by engagement rate across *all* niches. Do not hardcode it to specific niches.
* **`VALID_NICHES` in `types.ts`**: This array still exists but is only used as reference data. It is NOT imported by any UI component. Do not add it back to dropdowns.

## 2. Local Windows Launchers (`launchers/`)
* **Relative Paths**: All batch scripts in `launchers/` must start with `cd /d "%~dp0.."` so they execute from the project root rather than the subdirectory.
* **Executables**: Pre-compiled `.exe` wrappers exist to launch the `.bat` scripts with the custom Creator Match icon. If you update the launchers or add new ones, re-run `scripts/compile_launchers.ps1` to sync the `.exe` files.

## 3. AI Outreach & Security Patterns
* **Credentials — Server-Side Only**: All sensitive credentials (Gemini API key, SMTP host/user/pass) are read exclusively from server-side environment variables (`process.env`). They are **never** stored in `localStorage`, sent in request bodies, or exposed to the browser. Configure them in `.env.local` locally or via the Vercel dashboard for deployments.
* **Supabase Dual-Client Architecture**: The app uses two Supabase clients:
  - `supabaseClient.ts` (anon key) — used in client components and for read-only queries. RLS restricts anon to `SELECT` only.
  - `supabaseServer.ts` (service_role key) — used in server-side API routes for all write operations (upserts, inserts, updates). This key bypasses RLS and must never be imported in client components.
* **Server-Side Write Endpoints**: All database mutations go through dedicated API routes (`/api/creators/status`, `/api/outreach/log`, `/api/outreach/send-email`). Client components must not write directly to Supabase.
* **Outreach Status Priority**: The status hierarchy is `uncontacted → draft_created → dm_copied → emailed`. Lower-priority statuses must **never** overwrite higher ones. Use the `onlyIf` parameter in `/api/creators/status` to guard transitions (e.g. only set `dm_copied` if current is `uncontacted` or `draft_created`, never if already `emailed`).
* **Enrichment Upsert Safety**: The `enrich/route.ts` upsert intentionally **excludes** `outreach_status` from the payload. New records get `'uncontacted'` via the database column default; existing records keep their current status. Do not re-add `outreach_status` to the upsert.
* **No Fabricated Emails**: If a profile scrape is blocked (captcha, 403, etc.), set `email` to `null`. Do **not** fabricate `handle@gmail.com` addresses — it causes outreach to nonexistent people.
* **Prompt Injection Defense**: All creator-controlled data (bio, name, posts) is sanitized before injection into Gemini prompts: control characters stripped, length capped, XML-fenced with `<creator_data>` delimiters, and an explicit anti-injection instruction in the system prompt. Never inject raw user data into LLM prompts.
* **Gemini Output Format**: Always configure the Gemini client for structured JSON responses using `responseMimeType: 'application/json'` and direct schema definitions to guarantee stable parsing.

## 4. UI & Layout Conventions
* **Mobile Blurs**: The mobile menu uses a custom drawer layout. The `.main-content-blur` class blurs out the dashboard content behind the drawer. Do not restructure the layout grid wrapper, as it breaks the positioning and z-indexing of the toasts and drawer.
* **Toast Notifications**: Use the custom `showToast` utility state instead of standard window alert boxes. Toasts are responsive and automatically center-align at the bottom on mobile viewports.

## 5. Performance Patterns
* **Filter Debouncing**: Text inputs (`searchQuery`, `locationSearch`, `selectedNiche`) and range sliders (`minFollowers`, `maxFollowers`) in `page.tsx` use debounced state variables with a 300ms delay. The raw state provides instant UI feedback; the debounced values trigger the actual Supabase fetch. Discrete selects (`statusFilter`, `showSegment`) fire immediately without debouncing. Do not remove the debounce or add raw state vars to the fetch `useEffect` dependency array.

## 6. User Authentication
* **Supabase Auth**: Uses `@supabase/ssr` for cookie-based session management. Login/signup is email + password via `/login`.
* **Middleware**: `src/middleware.ts` protects all routes except `/login`, `/api/*`, and static assets. Unauthenticated users are redirected to `/login`.
* **User Isolation**: Every row in `influencers` and `outreach_logs` has a `user_id` column (UUID FK to `auth.users`). RLS policies ensure users can only `SELECT` their own data.
* **API Auth Guard**: All write API routes call `getAuthUserId()` from `supabaseServer.ts` to extract the authenticated user from cookies. Unauthenticated requests get HTTP 401.
* **Unique Constraint**: The `influencers` table uses a composite unique constraint `(handle, user_id)` so different users can independently discover the same creator.
* **Logout**: The sidebar has a "Sign Out" button that calls `supabase.auth.signOut()` and redirects to `/login`.

## 7. Search Cascade
* **3-Tier Live Search**: The discovery search API (`api/discovery/search`) cascades through Google Custom Search → Serper.dev → DuckDuckGo Lite. The first provider to return results wins.
* **Env Keys**: `GOOGLE_SEARCH_API_KEY` + `GOOGLE_SEARCH_CX` for Google, `SERPER_API_KEY` for Serper. Missing keys cause that tier to be skipped (not an error).
* **Fallback Profiles**: Pre-seeded fallbacks are not supported. If all 3 search tiers return 0, the API returns 0 results with a warning message.
