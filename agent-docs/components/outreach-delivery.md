# Outreach delivery brief

Last updated: 2026-07-20

The outreach studio separates generation from identity and delivery. Gemini receives the creator name plus public style/theme/collaboration signals so copy can address them directly, while the recipient email and any secrets remain outside the model prompt and are applied only at send time.

`src/app/api/outreach/email/route.ts` requires a signed-in user, a 60–90 word email, a literal confirmation flag, and a UUID idempotency key. It reserves an `outreach_events` row before SMTP delivery, records sent/failed state, and rejects duplicate submissions.

Gmail uses `smtp.gmail.com:465` with `GMAIL_USER` and a Google App Password. Never use an account password. Instagram remains a human-reviewed copy/open flow; no cold-DM automation is implemented.

## See also

- [../gotchas/platform-and-email-constraints.md](../gotchas/platform-and-email-constraints.md)
- [../gotchas/model-data-handling.md](../gotchas/model-data-handling.md)
- [data-auth.md](data-auth.md)
- [../status/data-services-status.md](../status/data-services-status.md)
