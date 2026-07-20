# Data services status

Last updated: 2026-07-20

State: `yellow`.

Tavily, YouTube Data API v3, Supabase Auth/Postgres/RLS, and Gemini drafting are configured and operational. Supabase redirect allowlists include the production dashboard and local dashboard. Gmail SMTP is the only pending service because Google requires interactive account re-verification before generating an App Password.

Live QA returned fewer than the requested preview size and correctly displayed the shortfall. YouTube metrics were enriched from official data. A false Instagram editorial route was discovered and added to the reserved-handle filter with tests.

## See also

- [../components/discovery-ai.md](../components/discovery-ai.md)
- [../components/data-auth.md](../components/data-auth.md)
- [../components/outreach-delivery.md](../components/outreach-delivery.md)
- [global.md](global.md)
