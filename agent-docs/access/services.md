# Service access index

Last updated: 2026-07-20

This file points to credential locations; it never contains credentials or personal account identifiers.

| Service | Where configuration belongs | Notes |
|---|---|---|
| Supabase | Deployment environment and operator console | Browser receives project URL plus publishable key only |
| Tavily | `TAVILY_API_KEY` in deployment secrets | Monitor free-credit usage |
| YouTube | `YOUTUBE_API_KEY` in deployment secrets | Restrict to YouTube Data API v3 |
| Google Gemini | `GEMINI_API_KEY`, optional `GEMINI_MODEL` | Required for drafting; data-handling rule still applies |
| Gmail | `GMAIL_USER`, `GMAIL_APP_PASSWORD` in deployment secrets | App Password requires interactive Google verification |
| Vercel/GitHub | Authenticated CLI/browser session | Resolve owner/project dynamically; do not hardcode in docs |

Local secrets belong in ignored `.env.local`. Do not create `keys/`, `creds/`, or `env-files/` inside a distributable package.

## See also

- [../gotchas/secrets-and-packaging.md](../gotchas/secrets-and-packaging.md)
- [../workflows/deploy-and-configure.md](../workflows/deploy-and-configure.md)
- [../status/deployment-status.md](../status/deployment-status.md)
