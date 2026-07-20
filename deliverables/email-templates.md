# Personalized email templates

Six reviewed reference emails, one per supported collaboration type. Every body sits inside the
60–90 word range the app enforces at `/api/ai/generate` and again at `/api/outreach/email`.

`{{creator_name}}` marks where the creator's name belongs. These files are the human-authored
reference set that fixes tone and structure; the app does not merge-substitute them. At runtime
Gemini receives the creator's name, niche, style and recent content theme and writes the name
directly into the copy, which is why generated drafts read as specific rather than templated.

The creator's contact email is never sent to Gemini. It adds nothing to the copy and is the most
sensitive field on the row, so it is applied only at send time.

Run `pnpm verify:templates` to re-check every word count in this file.

---

## 1. Sponsored post · Fashion

**Subject:** Sponsored styling collaboration for your festive-wear audience

```text
Hi {{creator_name}}, your recent ethnic-wear styling series stood out for how practically you break down draping for everyday wear. We are a Bengaluru label making lightweight festive pieces for working women, and your audience overlaps closely with who we design for. We would like to commission one sponsored post, with creative direction left entirely to you, paid at your standard rate. If the fit feels right, I will share our lookbook and proposed timelines this week.
```

## 2. Affiliate campaign · Beauty

**Subject:** Affiliate partnership on our barrier-repair range

```text
Hi {{creator_name}}, your skincare explainers are unusually careful about ingredient claims, which is exactly why I am writing. We make a barrier-repair range formulated for Indian humidity, and we run an affiliate programme paying a flat commission on every tracked order. You would get a unique code, transparent monthly reporting, and no obligation to post on a fixed schedule. If you would like samples to test before deciding anything, I am happy to send them across.
```

## 3. UGC creation · Food

**Subject:** Paid UGC brief for our ready-to-cook range

```text
Hi {{creator_name}}, your weeknight cooking reels solve a real problem, which is getting a proper meal out in under thirty minutes. We are a ready-to-cook brand and we are commissioning paid user-generated content for our own channels, not your feed. The brief is three short videos, licensed for six months, at a fixed fee agreed upfront. Nothing gets posted to your profile unless you separately want it to. Would you like the full brief?
```

## 4. Brand ambassador · Fitness

**Subject:** Six-month ambassador role for home-training athletes

```text
Hi {{creator_name}}, your home-workout progressions are refreshingly honest about how slow real strength gains actually are. We are building a six-month ambassador programme for a resistance equipment brand, and we want people who train the way you do rather than people who only photograph well. It covers a monthly retainer, product, and early input on what we build next. If a longer commitment interests you, I can share the full scope and rates.
```

## 5. Paid promotion · Tech

**Subject:** Paid promotion slot for our budget audio launch

```text
Hi {{creator_name}}, your budget gadget reviews are consistently willing to say when something is not worth the money, which is rare and valuable. We are launching a mid-range audio product in India next month and we have a paid promotion slot open. You keep full editorial control, including the option to publish a negative verdict. The fee is fixed and paid regardless of your conclusion. May I send a review unit and the launch timeline?
```

## 6. Barter collaboration · Parenting

**Subject:** Barter collaboration on our toddler activity kits

```text
Hi {{creator_name}}, your toddler activity posts are genuinely useful to parents working with small budgets and smaller apartments. We make screen-free activity kits and we would like to propose a barter collaboration: we send a full quarter of kits, you post only if your child actually engages with them. There is no fee involved and no obligation to post, which we want to be upfront about. Would that be worth exploring?
```
