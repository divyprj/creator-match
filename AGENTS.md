# Creator Match agent entry point

Last updated: 2026-07-20

Creator Match is a Next.js application for live, evidence-led discovery and outreach to Indian micro-influencers. This file is the mandatory starting point for a fresh agent. Read only the routed documents needed for the task; do not scan transcripts or all docs by default.

## Task router

| Task | Read first |
|---|---|
| Understand product scope or user boundaries | `agent-docs/01-project-overview.md`, `agent-docs/decisions.md` |
| Change UI, motion, search form, or dashboard | `agent-docs/components/web-app.md`, `agent-docs/status/web-app-status.md` |
| Change Tavily, YouTube, Gemini, validation, or downloads | `agent-docs/components/discovery-ai.md`, `agent-docs/gotchas/live-data-integrity.md` |
| Change Supabase schema, Auth, cookies, or RLS | `agent-docs/components/data-auth.md`, `agent-docs/status/data-services-status.md` |
| Change Gmail or Instagram outreach | `agent-docs/components/outreach-delivery.md`, `agent-docs/gotchas/platform-and-email-constraints.md` |
| Deploy, configure services, or prepare a handoff | `agent-docs/workflows/deploy-and-configure.md`, `agent-docs/status/deployment-status.md` |
| Run QA or diagnose a failed release | `agent-docs/workflows/local-verification.md`, `agent-docs/workflows/live-search-qa.md` |
| Build a clean distributable archive | `agent-docs/workflows/sanitized-release.md`, `agent-docs/gotchas/secrets-and-packaging.md` |
| See what is currently working or blocked | `agent-docs/status/global.md` |

## Standing rules

- Never add seeded, mocked, preselected, or fabricated creators. Missing live data must remain missing and shortfalls must be explicit.
- Supported platforms are Instagram and YouTube only. Supported niches are defined once in `src/lib/types.ts` and must remain the nine product niches unless the user changes scope.
- Anonymous visitors may search live but their data is not persisted. Saving, downloads, draft generation, and sending require authentication.
- Keep the follower product range at 1,000–100,000. Values under 5,000 are nano; the default minimum is 5,000.
- Gemini prompts carry public profile signals for genuine personalization, but never the creator's contact email, never credentials, and never confidential campaign information. Creator-supplied text (style, recent theme, bio) is untrusted input: it is passed as descriptive data and the system instruction forbids treating it as instructions.
- Instagram has no API integration and must not gain a scraped one without an explicit scope decision. Meta's Graph API cannot read arbitrary public creators, and scraping profiles breaches their terms. Unverified Instagram engagement stays reported, never estimated.
- Never automate cold Instagram DMs with browser bots. The supported flow is review, copy, and open the creator profile. Official API expansion must respect user-initiated conversation rules.
- Gmail sending requires explicit human confirmation and idempotency. Never log, commit, display, or package Gmail App Passwords or API keys.
- Use Supabase RLS for all user-owned rows. Do not bypass RLS from the browser or expose privileged keys to client code.
- Do not push, deploy, rotate credentials, send email, or delete external resources unless the user authorizes that action.
- Preserve existing user changes. Use `apply_patch` for hand edits and never commit `.env*`, `.vercel/`, build output, or credentials.

## Critical paths

- App routes: `src/app/`
- Public discovery UI: `src/components/creator-search.tsx`
- Authenticated workspace: `src/app/dashboard/page.tsx`, `src/components/outreach-studio.tsx`
- Live providers: `src/lib/tavily.ts`, `src/lib/youtube.ts`, `src/lib/gemini.ts`
- Supabase clients: `src/lib/supabase/`
- Database migration: `supabase/migrations/202607200001_initial.sql`
- Environment contract: `.env.example`
- Current state: `agent-docs/status/global.md`

## Quick verification

```bash
pnpm install
pnpm test
pnpm lint
pnpm typecheck
pnpm build
bash agent-docs/scripts/verify-links.sh
```

For a local browser smoke test, run `pnpm dev`, open `http://localhost:3000`, verify anonymous search does not write data, and confirm missing configuration produces a clear error rather than mock results.

## Update discipline

- Every turn: mentally note changed components, discovered gotchas, and decisions.
- Every 2–3 turns: update the relevant component/status file and `decisions.md` when applicable.
- Every session end: update `agent-docs/status/global.md` and bump dates on files that changed.
- Keep stable architecture out of status files and volatile deployment state out of component briefs.
- Every new network document ends with a `See also` section using portable relative links.

## See also

- [agent-docs/00-readme.md](agent-docs/00-readme.md)
- [agent-docs/02-infrastructure-map.md](agent-docs/02-infrastructure-map.md)
- [agent-docs/status/global.md](agent-docs/status/global.md)
- `agent-docs/scripts/verify-links.sh`
- [README.md](README.md)
