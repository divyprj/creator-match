# Discovery and AI brief

Last updated: 2026-07-20

`src/lib/tavily.ts` runs two complementary sweeps. `searchTavily` is platform-restricted: it fans out up to eight niche-specific query variants per platform (hashtags, sub-niches, Indian cities, business-enquiry phrasing) and the result URL is itself the profile. `searchDirectories` is an open-web sweep over creator directories, UGC marketplaces and spotlight listicles; `mineProfilesFromPage` then extracts every Instagram/YouTube link from the page and attributes the nearest email and follower figure within a 400-character window. Both accept only Instagram/YouTube URLs, reject reserved navigation/editorial routes, normalize handles, and attach timestamped evidence. Neither ever fills missing data.

Generic site-level addresses (`info@`, `support@`, `contact@` and similar) are rejected so a directory's own contact address is never attributed to a creator. Failed query variants degrade the sweep rather than aborting it.

`creatorEligibility` is the single source of truth for whether a candidate qualifies. Contact email, India signal, and a known follower count gate `strictEligible`; engagement is reported as a non-blocking note. This is deliberate — Instagram engagement is not derivable without authorized API access, and treating that as an exclusion made every Instagram creator permanently ineligible.

`src/lib/youtube.ts` provides both discovery and verification. `discoverYouTubeChannels` searches YouTube directly (`search.list`, `type=channel`, `regionCode=IN`) using the plain-language query bank in `youtubeDiscoveryQueries` — phrases like "small creator" and "daily vlog" surface the long tail, where brand-style keywords return the same large channels every time. `describeYouTubeChannels` then resolves ids in batches of 50 through `channels.list`, reading verified subscriber counts, country, and the contact email creators publish in their channel description.

This is the only discovery path that returns verified follower counts at discovery time, and in live measurement it produced essentially every qualifying row. Quota shapes the design: `search.list` costs 100 units per call so variants scale with the requested limit and the path is authenticated-only, while `channels.list` costs one unit per 50 ids and does the bulk work. `enrichYouTubeCreator` adds engagement by sampling recent uploads and calculating mean per-video `(likes + comments) / views × 100`; because it costs two further calls per channel, the search route ranks candidates by micro-band membership, contact email and India signal before spending quota on it. Hidden subscriber counts and unusable samples remain null with explicit reasons.

`src/lib/gemini.ts` calls the Gemini `generateContent` REST endpoint with `gemini-flash-latest` (override via `GEMINI_MODEL`) and requests structured output through `responseSchema`. The prompt carries the creator name, niche, platform, style, and recent theme so drafts are genuinely personalized; the contact email is withheld. `src/app/api/ai/generate/route.ts` requires authentication, strict JSON, a 60–90 word email, and a 15–30 word DM, with one repair attempt.

The search route caps anonymous requests at eight and allows authenticated requests up to fifty. The directory sweep runs for authenticated requests only, because it costs extra Tavily calls and is the expensive half of discovery. Duplicate candidates are merged rather than dropped, so a directory-sourced email can complete a platform-sourced profile. YouTube enrichment runs under a concurrency cap of six and treats a single channel lookup failure as non-fatal. Candidates are ordered by strict eligibility before truncation, so trimming to the limit drops the weakest evidence first. Authenticated searches log a `discovery_runs` row for dashboard metrics. All responses use `Cache-Control: no-store`.

## See also

- [../gotchas/live-data-integrity.md](../gotchas/live-data-integrity.md)
- [../gotchas/model-data-handling.md](../gotchas/model-data-handling.md)
- [../workflows/live-search-qa.md](../workflows/live-search-qa.md)
- [../status/data-services-status.md](../status/data-services-status.md)
