# Gotcha: model data handling

Last updated: 2026-07-20

Severity: high.

Outreach copy is drafted by Google Gemini through `src/lib/gemini.ts`. The prompt deliberately carries the creator's name, niche, platform, style, and recent public content theme, because a message that cannot name its recipient or reference their work is not personalized and does not satisfy the assignment.

Never place in the prompt: the creator's contact email (it does not improve the copy and is the most sensitive field on the row), credentials or API keys, or confidential campaign terms the operator has not agreed to share with a model provider.

Creator-supplied text is untrusted input. Style, recent theme, and any bio-derived text originate from public pages the creator controls, so a crafted bio could attempt to steer the draft. The system instruction states these fields are descriptive data and never instructions. Treat any future field sourced from scraped page content the same way.

`responseSchema` constrains the JSON shape at decode time but not word counts, so the 60–90 and 15–30 bounds are validated in `src/app/api/ai/generate/route.ts` after generation and again in the send route before delivery. One repair attempt is made with the validation failure fed back verbatim.

An earlier build used the free OpenCode Zen MiMo endpoint and stripped all identity from prompts, because a free tier may retain submissions for training. That constraint produced drafts that could not address anyone by name. Moving to a keyed Gemini project changed the tradeoff, not the rule: public profile signals are in scope, contact details and secrets are not.

Keep model output untrusted: parse strict JSON, enforce word counts, never allow generated recipients, and require human review before delivery.

## See also

- [../components/discovery-ai.md](../components/discovery-ai.md)
- [../components/outreach-delivery.md](../components/outreach-delivery.md)
- [platform-and-email-constraints.md](platform-and-email-constraints.md)
- [../decisions.md](../decisions.md)
