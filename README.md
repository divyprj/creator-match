# Creator Match

Live, evidence-led discovery and outreach for Indian micro-influencers. The app supports only Instagram and YouTube across Fashion, Beauty, Fitness, Food, Finance, Parenting, Tech, Gaming, and Education.

There is deliberately no seed dataset, mock creator, or synthetic fallback. A missing key produces an explicit setup error; a live shortfall is reported as a shortfall.

## Product behavior

- Anonymous visitors can run an ephemeral live preview for one niche and receive up to 8 candidates. Nothing is stored. They can search and sort but cannot save, export, generate outreach, or contact anyone.
- Signed-in users can request up to 50 live candidates per niche, save selected profiles, export the current result set as CSV, generate constrained outreach, and explicitly confirm Gmail sending.
- Results sort by engagement rate, followers, or evidence strength. Unverified metrics always sort last rather than counting as zero, so an unmeasured creator is never ranked below a genuinely low-performing one.
- Sign-in accepts either a six-digit email code or a one-click magic link; both create the account on first use. Email and password remains available.
- The dashboard reports creators found, saved, contacted, and mean verified engagement rate across the signed-in user's own rows.
- Tavily runs two sweeps: a platform-restricted sweep for profile URLs, and an open-web sweep over creator directories, UGC marketplaces and spotlight listicles that is mined for profile links plus the contact emails platform pages omit. The YouTube Data API verifies channel and recent-video metrics.
- Engagement is the mean of `(likes + comments) / views × 100` across usable recent videos; sample size and formula remain attached.
- Google Gemini drafts the outreach copy from the creator's public profile signals — name, niche, style and recent content theme — so messages address the creator directly and reference their actual work. The contact email is never sent to the model; it is applied only at send time. Structured output is requested via `responseSchema`, and word counts are validated server-side regardless.
- Instagram outreach is manual: generate, review, copy, and open the creator profile. Cold-DM browser automation is intentionally excluded.
- Email copy is enforced at 60–90 words; DM copy at 15–30 words. Gmail sends require an explicit confirmation and an idempotency key.

## Deliverables

| Assignment deliverable | Where it lives |
|---|---|
| Source code | This repository |
| CSV of 50 Indian influencers | Exported from the app — see below |
| Personalized email templates | [`deliverables/email-templates.md`](deliverables/email-templates.md) |
| Personalized Instagram DM templates | [`deliverables/instagram-dm-templates.md`](deliverables/instagram-dm-templates.md) |
| README explaining workflow | This file |

### Producing the influencer CSV

The dataset is generated live rather than committed, because a checked-in creator list goes stale
and cannot be re-verified. To produce it:

1. Sign in, so the limit rises to 50 and the directory sweep is enabled.
2. Pick a niche, keep the follower slider at 5K–100K, and search.
3. Sort by engagement rate, then choose **Export CSV**.

The export carries the assignment's required fields plus the evidence behind each one: name,
platform, handle, followers, engagement rate with its formula and sample size, niche, content
themes, contact email, profile URL, city, country, strict-match flag, outstanding evidence gaps,
and source URLs.

Rows are never padded to reach a target count. If a niche yields fewer than the requested number,
the app reports the shortfall rather than inventing rows.

### Measured yield

Live measurement on 2026-07-20, ten YouTube discovery queries per niche:

| Niche | Channels found | In 5K–100K band | With contact email | Deliverable |
|---|---|---|---|---|
| Fashion | 476 | 60 | 22 | 19 |
| Beauty | 450 | 69 | 21 | 19 |
| Food | 381 | 30 | 9 | 8 |
| Fitness | 440 | 40 | 12 | 11 |

Four niches produce **57 qualified creators**, clearing the assignment's target of 50. Fashion and
Beauty alone give a 38-creator *Indian Fashion & Beauty* segment.

This is deliberately not 50 per niche. About 4% of discovered channels have both a micro-sized
audience and a published contact email, so one niche yields 8–19. Reaching 50 within a single niche
is not achievable from public sources without inventing contact details, so the app spans niches
instead.

YouTube-native discovery contributes essentially every deliverable row, because it is the only path
that returns verified subscriber counts at discovery time. The Tavily sweeps add breadth and the
only available Instagram coverage.

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS 4, GSAP, Supabase Auth/Postgres/RLS, Tavily Search, YouTube Data API v3, Google Gemini, Nodemailer Gmail SMTP, Vercel.

### Platform integrations

| Platform | Integration | What is verified |
|---|---|---|
| YouTube | Data API v3 | Channel identity, subscriber count, country, and engagement measured from real recent-video statistics |
| Instagram | None — deliberate | Follower and contact evidence from public sources only. Engagement is reported as unverified, never estimated |

Instagram has no usable integration: Meta's Graph API exposes only accounts you already manage, so it
cannot discover creators or read their public metrics. Rather than guessing, Instagram rows carry an
explicit note saying engagement needs authorized access. Outreach to Instagram creators is manual by
the same logic — generate, review, copy, open profile.

## Local setup

1. Copy `.env.example` to `.env.local` and fill the keys.
2. Create a new Supabase project and run `supabase/migrations/202607200001_initial.sql` in its SQL editor.
3. In Supabase Auth URL Configuration, set the local site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to the redirect allowlist. Add the deployed Vercel URL and its `/auth/callback` path after deployment.
4. Optional, requires custom SMTP: add `{{ .Token }}` to the Magic Link email template. Supabase ships that template with only `{{ .ConfirmationURL }}` and **locks template editing unless custom SMTP is configured**, so on the built-in email service the magic link is the working path and the six-digit code is never sent. The app handles this: the link signs the user in through `/auth/callback`, and the code field is an optional fallback. Configuring Gmail SMTP here also raises the built-in service's low hourly email cap.
5. Enable the YouTube Data API v3 in your Google Cloud project and create a server API key restricted to that API.
6. Create a Tavily API key and a Google App Password for the Gmail sender you control. Store the App Password only as `GMAIL_APP_PASSWORD`.
7. Run `pnpm dev`.

```bash
pnpm install
pnpm test
pnpm lint
pnpm typecheck
pnpm verify:templates
pnpm build
```

## Environment variables

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Browser-safe Supabase key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Reserved for future server administration; never expose it |
| `TAVILY_API_KEY` | Server only | Live public-web discovery |
| `YOUTUBE_API_KEY` | Server only | Channel and recent-video verification |
| `GEMINI_API_KEY` | Server only | Outreach copy generation |
| `GEMINI_MODEL` | Server only | Optional; defaults to `gemini-flash-latest` |
| `GMAIL_USER` | Server only | Gmail address used as the reviewed outreach sender |
| `GMAIL_APP_PASSWORD` | Server only | Google App Password, never the account password |

## Data model and privacy

The migration creates user-owned `saved_creators`, `discovery_runs`, `outreach_drafts`, `outreach_events`, and `suppression_entries`. RLS policies restrict every row to `auth.uid()`. Anonymous search requests use `Cache-Control: no-store` and never write to Supabase. Contact emails and message bodies are stored only for signed-in owners.

## Deployment

Push the repository to GitHub, import it into Vercel, add the environment variables to Production and Preview, and deploy. Add the final Vercel domain to Supabase Auth redirects. Restrict the YouTube key to the YouTube Data API and the server environment wherever Google permits.

## Quality gates

`pnpm test` validates engagement math, range constraints, download formula-injection protection, and directory mining — including that navigation routes and site-level contact addresses never become creator rows. `pnpm verify:templates` re-checks every reference email and DM against the 60–90 and 15–30 word bounds. `pnpm lint`, `pnpm typecheck`, and `pnpm build` are required before deployment.

## Manual setup checklist

- Create/confirm the new Supabase organization and project, apply the migration, and copy the project URL plus anon key.
- Create a Tavily key.
- Enable YouTube Data API v3 and create a key restricted to that API.
- Enable Google 2-Step Verification and create a Gmail App Password for the sender account.
- Add all secrets to Vercel; never commit `.env.local`.
- Add the final Vercel URL to Supabase Auth redirects.
- Run a live search and inspect evidence before any real outreach; comply with platform rules and applicable Indian privacy/anti-spam obligations.
