# Gotcha: secrets and packaging

Last updated: 2026-07-20

Severity: critical.

The workspace may contain ignored `.env.local`, `.vercel/project.json`, Git remotes, build caches, logs, or generated archives even when source files are clean. A distributable zip must be built from an explicit allow/exclude staging process, not `zip -r .`.

Exclude `.git/`, `.vercel/`, `.next/`, `node_modules/`, coverage, logs, all `.env*` except a sanitized `.env.example`, and previous archives. Scan staged text for account emails, usernames, project references, key prefixes, JWTs, private-key markers, and non-empty secret assignments before compression. Inspect the zip listing and rescan extracted content.

## See also

- [../workflows/sanitized-release.md](../workflows/sanitized-release.md)
- [../access/services.md](../access/services.md)
- [../status/deployment-status.md](../status/deployment-status.md)
