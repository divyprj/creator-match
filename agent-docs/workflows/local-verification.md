# Workflow: local verification

Last updated: 2026-07-20

1. Install with `pnpm install`.
2. Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`.
3. Copy `.env.example` to `.env.local` and add operator-owned values.
4. Run `pnpm dev`; inspect desktop and 390px mobile layouts.
5. Verify missing provider keys return explicit errors and never fixture data.
6. With live keys, run one anonymous search and confirm no Supabase rows are created.
7. Test authenticated save/download/draft behavior with a disposable account. Do not send real outreach during QA.

## See also

- [../components/web-app.md](../components/web-app.md)
- [live-search-qa.md](live-search-qa.md)
- [../status/web-app-status.md](../status/web-app-status.md)
