# Decisions

Last updated: 2026-07-20

## 2026-07-20 — engagement is evidence, not an eligibility gate

Contact email, India signal, and follower count gate strict eligibility. Missing engagement became a
note instead of an exclusion, because Instagram engagement cannot be derived without authorized API
access and the previous rule made every Instagram creator permanently ineligible. The assignment's
stated minimum is contact email plus profile metrics plus niche, which this matches exactly.

## 2026-07-20 — directory sweep as the contact-email source

Platform pages rarely expose contact emails, which capped qualified results far below the fifty the
assignment requires. An open-web sweep over creator directories, UGC marketplaces and spotlight
listicles is now mined for profile links plus adjacent emails. This is discovery breadth, not seeding:
every mined row still carries its source URL and is still subject to the same evidence rules.

## 2026-07-20 — passwordless first, password retained

Email OTP and magic link are the default sign-in path and create the account on first use. Password
sign-in stays available rather than being removed, so existing accounts keep working.

## 2026-07-20 — live evidence over dataset fullness

No creator seed data or fabricated fallback is permitted. Search shortfalls are a product truth, not an error to conceal.

## 2026-07-20 — anonymous preview, authenticated actions

Public discovery stays accessible and ephemeral. Persistence, download, generation, and outreach require an account.

## 2026-07-20 — Tavily discovery plus official YouTube verification

Search finds candidates; platform APIs verify what they can. Every field retains evidence or an unverified reason.

## 2026-07-20 — Gemini drafting with real personalization

Superseded the free MiMo endpoint. The de-identification rule it required had a cost: because names
were stripped from prompts, generated emails could not greet anyone, which failed the assignment's
personalization requirement. A keyed Gemini project changes that tradeoff. Public profile signals —
name, niche, style, recent theme — now reach the model; the contact email and all secrets do not.
Structured output is requested via `responseSchema`, and word counts are still validated server-side.

## 2026-07-20 — manual Instagram DM handoff

The safe supported option is generate/review/copy/open-profile. Cold-DM browser automation is excluded.

## 2026-07-20 — exactly-once Gmail intent

Email uses explicit confirmation plus a database idempotency reservation to reduce accidental duplicate sends.

## See also

- [01-project-overview.md](01-project-overview.md)
- [components/discovery-ai.md](components/discovery-ai.md)
- [components/outreach-delivery.md](components/outreach-delivery.md)
- [status/global.md](status/global.md)
