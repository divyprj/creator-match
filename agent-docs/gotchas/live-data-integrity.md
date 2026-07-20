# Gotcha: live data integrity

Last updated: 2026-07-20

Severity: high.

Search engines may return Instagram editorial/navigation URLs that resemble profiles, or creator metrics outside the selected range. Never treat a URL as a creator merely because it is on a supported domain. Keep the reserved-handle set in `src/lib/tavily.ts`, preserve evidence URLs, and make null/shortfall states visible.

Do not add fixtures to make demos look full. If live evidence yields two unique candidates, return two. Strict eligibility requires the evidence gates; it is not a ranking score.

## See also

- [../components/discovery-ai.md](../components/discovery-ai.md)
- [../workflows/live-search-qa.md](../workflows/live-search-qa.md)
- [../status/data-services-status.md](../status/data-services-status.md)
