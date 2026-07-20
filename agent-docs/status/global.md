# Global status

Last updated: 2026-07-20

Overall state: `green` — every functional path is verified live, including discovery, Gemini drafting, Supabase auth with RLS, CSV export and confirmed Gmail delivery.

| Area | State | Current note |
|---|---|---|
| Web app | green | Production build, auth boundary, sorting, dashboard metrics and live search verified. Responsive verified at 375×812 on landing, search and `/auth` |
| Discovery providers | green | Three-path discovery verified live. 2,207 channels discovered across six niches yielded 86 qualified micro creators |
| Supabase | green | Project `vilthkfdhiovaxdcgwoy` live. Schema applied, RLS verified rejecting anonymous writes, magic-link sign-in confirmed working |
| Gemini drafting | green | Verified live: 83-word email and 24-word DM, both in range, creator addressed by name and recent theme referenced |
| Gmail SMTP | green | Verified end to end: SMTP auth, confirmed send, `outreach_events` row, and the Contacted metric advancing |
| Instagram DM | green | Manual copy/open workflow implemented intentionally |
| Source and hosting | green | Private GitHub repo with `main` as default; deployed to Vercel project `creator-match-app` |

Recently completed: YouTube-native channel discovery, engagement view-count floor, strict-first result ranking, Supabase provisioning with verified RLS, confirmed Gmail delivery, the 86-row CSV deliverable, and a full production QA pass.

## Measured discovery yield

Live measurement, 2026-07-20, eight YouTube discovery queries per niche. Every qualified row carries a verified subscriber count inside 5,000–100,000, a creator-published contact email, and an engagement rate measured from real recent-video statistics.

| Niche | Channels discovered | Qualified |
|---|---|---|
| Fashion | 389 | 15 |
| Beauty | 387 | 16 |
| Food | 314 | 6 |
| Fitness | 364 | 12 |
| Tech | 374 | 25 |
| Education | 379 | 15 |
| **Total (deduplicated)** | **2,207** | **86** |

The assignment requires 50 Indian influencers in total, which six niches clear at 86. Engagement across the set has a median of 2.35% and a maximum of 9.54%.

It is **not** 50 per niche: roughly 4% of discovered channels carry both a micro-sized audience and a published contact email, so a single niche yields 6–25. Reaching 50 in one niche is not achievable honestly through public sources, and padding it was rejected.

YouTube-native discovery produces essentially all deliverable rows. The Tavily sweeps contribute breadth and the only available Instagram coverage but, in the same measurement, produced one qualifying row from 342 results — general web search surfaces large accounts, and micro creators rarely publish contact details on pages that rank.

## Outstanding before submission

- Delete the QA artifact rows in `saved_creators`. Five creators were saved during testing, three of them before the engagement fix, so the dashboard still reports a stale 20.75% mean.
- Rotate the Tavily, YouTube and Gemini API keys, and revoke the Gmail App Password, before sharing the repository or transcript.
- Decide whether to delete the `prototype-archive` branch, which still contains the earlier fabricated-email CSV.
- Optional: configure custom SMTP in Supabase to unlock the six-digit sign-in code and lift the built-in email service's low hourly cap.
- Optional: measure the dashboard at mobile width, the one surface not covered by the responsive pass.

## See also

- [qa-2026-07-20.md](qa-2026-07-20.md)
- [web-app-status.md](web-app-status.md)
- [data-services-status.md](data-services-status.md)
- [deployment-status.md](deployment-status.md)
- [../decisions.md](../decisions.md)
