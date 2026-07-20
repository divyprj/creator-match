# Workflow: live search QA

Last updated: 2026-07-20

1. Select one supported niche and both platforms; keep the default 5K–100K range.
2. Run one public search and allow Tavily/YouTube time to respond.
3. Confirm candidate URLs are real supported-profile routes, not `/popular`, `/explore`, posts, reels, or editorial pages.
4. Confirm every metric has evidence or an explicit unverified reason.
5. Confirm out-of-range creators are marked ineligible rather than silently removed or accepted.
6. Confirm the displayed result count equals the live unique results and shortfalls are stated.
7. Check provider credit/quota usage after repeated tests; do not run broad loops for cosmetic fullness.

## See also

- [../components/discovery-ai.md](../components/discovery-ai.md)
- [../gotchas/live-data-integrity.md](../gotchas/live-data-integrity.md)
- [local-verification.md](local-verification.md)
