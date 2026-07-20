# Version 1 archive

This branch preserves the first implementation of Creator Match, kept for comparison against the
current version on `main`. It is a single squashed snapshot rather than the original commit history.

## Why this version was replaced

The prototype produced influencer records that could not be acted on. Its enrichment step
constructed a contact address by appending a domain to the creator handle whenever scraping failed:

```js
// src/app/api/discovery/enrich/route.ts
if (!email) {
  email = `${cleanHandle}@gmail.com`;
}
```

Its own audit flagged this as a high severity issue, noting that users would send real outreach to
nonexistent or wrong people. In the shipped dataset, 110 of 126 rows carried an address generated
this way, and 90 of 126 rows fell outside the 5,000 to 100,000 follower range that defines a
micro-influencer.

The accompanying `indian_influencers_list.csv` has been removed from this branch. It paired real,
named public figures with fabricated contact addresses, which is not something worth publishing even
as an archive. The code that generated it remains below, since that is the part with reference value.

Other issues recorded in the prototype's own `PROJECT_AUDIT.md`:

- Supabase row level security set to `USING (true) WITH CHECK (true)`, allowing anonymous read and
  delete of all data
- API keys and SMTP passwords stored in browser localStorage and sent in request bodies
- No authentication on any API route
- Creator-controlled bio text injected directly into model prompts without sanitisation

## What replaced it

`main` rejects fabricated data outright. Contact emails come only from what a creator published,
engagement is measured from real recent-video statistics with the sample size attached, and a search
that finds fewer creators than requested reports the shortfall instead of padding. Row level security
is enforced and verified, API routes require authentication, and creator-supplied text is treated as
untrusted input.

See the `main` branch README for the current architecture.
