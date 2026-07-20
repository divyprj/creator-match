# Workflow: deploy and configure

Last updated: 2026-07-20

1. Create a Supabase project and apply `supabase/migrations/202607200001_initial.sql`.
2. Set Supabase Site URL to the production origin and allow production/local `/dashboard` redirects.
3. Add Vercel variables from `.env.example`. Mark secrets sensitive. Never add a privileged Supabase key to client variables.
4. Restrict the Google API key to YouTube Data API v3. Vercel dynamic egress generally prevents a fixed IP application restriction.
5. Set `GEMINI_API_KEY`. Keep the creator contact email and all secrets out of model prompts.
6. Connect the intended source repository, deploy production, then smoke-test `/`, `/auth`, and one live search.
7. Add the Gmail App Password only after interactive Google verification, then redeploy and send only a controlled test after explicit approval.

## See also

- [../components/data-auth.md](../components/data-auth.md)
- [../components/outreach-delivery.md](../components/outreach-delivery.md)
- [../status/deployment-status.md](../status/deployment-status.md)
- [sanitized-release.md](sanitized-release.md)
