# Gotcha: platform and email constraints

Last updated: 2026-07-20

Severity: high.

Instagram does not provide a general-purpose official cold-DM API. Do not use browser automation to mass-message profiles. Preserve the manual copy/open flow, or add an approved social inbox only when the user explicitly expands scope and the use case complies with platform rules.

Gmail SMTP requires 2-Step Verification plus an App Password. Google may stop automation at password/OTP re-verification. Treat that as a manual security boundary. Store the App Password only in the deployment secret store and never in source, docs, logs, screenshots, or archives.

## See also

- [../components/outreach-delivery.md](../components/outreach-delivery.md)
- [secrets-and-packaging.md](secrets-and-packaging.md)
- [../status/data-services-status.md](../status/data-services-status.md)
