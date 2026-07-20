# Data and authentication brief

Last updated: 2026-07-20

Supabase provides Postgres, Auth, browser/server clients, cookie refresh, and row-level security. The canonical schema is `../../supabase/migrations/202607200001_initial.sql`.

Three sign-in paths are supported: a six-digit email OTP (`signInWithOtp` then `verifyOtp`), a magic link landing on `/auth/callback`, and email/password. The OTP and magic-link paths both use `shouldCreateUser: true`, so signup and sign-in are one step. The six-digit code requires `{{ .Token }}` in the Magic Link email template, but Supabase locks template editing unless custom SMTP is configured, and its default template contains only `{{ .ConfirmationURL }}`. On the built-in email service the link is therefore the only working path; the code input degrades to an unused fallback and the sign-in copy leads with the link. Configuring custom SMTP (the same Gmail credentials used for outreach) unlocks the template and lifts the built-in service's low hourly send cap. Both `/auth/callback` and the site URL must be on the Auth redirect allowlist. The callback route accepts only same-origin relative redirect targets.

User-owned tables are `profiles`, `saved_creators`, `discovery_runs`, `outreach_drafts`, `outreach_events`, and `suppression_entries`. Policies compare `auth.uid()` with the owner column. A new-user trigger creates a profile. Unique constraints prevent duplicate saved source keys and duplicate send idempotency keys.

Browser code receives only the project URL and publishable/anon key. Privileged keys are not required by the current application and must never be exposed as `NEXT_PUBLIC_*`. Anonymous searches do not write to Supabase.

## See also

- [web-app.md](web-app.md)
- [../workflows/deploy-and-configure.md](../workflows/deploy-and-configure.md)
- [../gotchas/secrets-and-packaging.md](../gotchas/secrets-and-packaging.md)
- [../status/data-services-status.md](../status/data-services-status.md)
