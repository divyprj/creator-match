# Deployment status

Last updated: 2026-07-20

State: `green`.

The private source repository is connected to a Vercel project and production is ready. Exact account names, repository URLs, project IDs, deployment URLs, and secret values are intentionally excluded from the portable knowledge network. Resolve them from the authenticated Git/Vercel/Supabase tools when authorized.

Configured production/preview variables include Supabase public client configuration, Tavily, YouTube, and the Gmail sender address. The Gmail App Password is intentionally absent. `GEMINI_API_KEY` is required for drafting; `GEMINI_MODEL` is optional and defaults to `gemini-flash-latest`. A new Supabase project and Vercel project are being provisioned, so all values must be re-entered rather than carried over.

## See also

- [../workflows/deploy-and-configure.md](../workflows/deploy-and-configure.md)
- [../workflows/sanitized-release.md](../workflows/sanitized-release.md)
- [../access/services.md](../access/services.md)
- [global.md](global.md)
