# Personalized Instagram DM templates

Six reviewed reference DMs matching the six email templates. Every message sits inside the 15–30
word range the app enforces at `/api/ai/generate`.

`{{creator_name}}` marks where the creator's name belongs. As with the email set, these are
reference templates rather than merge templates — Gemini writes the name into generated drafts.

Instagram delivery is deliberately manual. The app generates the DM, you review it, copy it, and
open the creator's profile yourself. There is no cold-DM browser automation, because sending
unsolicited automated DMs breaches Instagram's platform terms.

There is no Instagram API integration. Meta's Graph API only exposes accounts you already manage,
so it cannot discover creators or read their public metrics. Instagram rows therefore carry
follower and contact evidence but no verified engagement rate, and this is reported rather than
estimated. YouTube is fully integrated via the Data API, where engagement is measured from real
recent-video statistics.

Run `pnpm verify:templates` to re-check every word count in this file.

---

## 1. Sponsored post · Fashion

```text
Hi {{creator_name}}, loved your festive draping series. We are a Bengaluru label and would like to commission one paid sponsored post. May I send details?
```

## 2. Affiliate campaign · Beauty

```text
Hi {{creator_name}}, your ingredient breakdowns are refreshingly careful. We run an affiliate programme on a barrier-repair range and would love to send samples first.
```

## 3. UGC creation · Food

```text
Hi {{creator_name}}, your thirty-minute weeknight reels are excellent. We are commissioning paid UGC for our own channels, nothing posted to your feed. Interested?
```

## 4. Brand ambassador · Fitness

```text
Hi {{creator_name}}, your honest strength progressions stood out. We are building a six-month ambassador programme with a monthly retainer. Would a longer commitment interest you?
```

## 5. Paid promotion · Tech

```text
Hi {{creator_name}}, you actually say when gear is not worth buying. We have a paid promotion slot, full editorial control, fee regardless of verdict.
```

## 6. Barter collaboration · Parenting

```text
Hi {{creator_name}}, your screen-free toddler ideas are genuinely practical. We would send a quarter of activity kits as barter, with no obligation to post.
```
