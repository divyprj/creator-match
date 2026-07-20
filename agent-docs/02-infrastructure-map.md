# Infrastructure map

Last updated: 2026-07-20

| Component | Technology | Responsibility | Status |
|---|---|---|---|
| Web application | Next.js 16, React 19, TypeScript, Tailwind 4, GSAP | Public discovery and authenticated workspace | See `status/web-app-status.md` |
| Discovery | Tavily Search | Find live public creator/profile evidence | See `components/discovery-ai.md` |
| YouTube verification | YouTube Data API v3 | Channel, subscriber, and recent-video metrics | See `components/discovery-ai.md` |
| AI drafting | Google Gemini (`gemini-flash-latest`) | Personalized outreach generation | See `gotchas/model-data-handling.md` |
| Data and auth | Supabase Postgres/Auth/RLS | Accounts, saved creators, drafts, send events | See `components/data-auth.md` |
| Email | Gmail SMTP via Nodemailer | Explicitly confirmed email delivery | See `components/outreach-delivery.md` |
| Instagram DM | Manual profile handoff | Review, copy DM, open public profile | See `gotchas/platform-and-email-constraints.md` |
| Hosting and source | Vercel and GitHub | Production hosting and automated builds | See `status/deployment-status.md` |

Data flow: browser → Next.js route → live provider → normalized evidence → anonymous response or authenticated Supabase row. Outreach flow: authenticated brief → Gemini prompt of public profile signals → human review → Gmail idempotent send or manual Instagram handoff.

## See also

- [components/web-app.md](components/web-app.md)
- [components/discovery-ai.md](components/discovery-ai.md)
- [components/data-auth.md](components/data-auth.md)
- [components/outreach-delivery.md](components/outreach-delivery.md)
- [status/global.md](status/global.md)
