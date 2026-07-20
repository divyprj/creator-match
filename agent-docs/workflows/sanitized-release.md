# Workflow: sanitized release archive

Last updated: 2026-07-20

1. Run the full local verification gate.
2. Create a temporary staging directory outside the repository.
3. Copy tracked/product files while excluding `.git`, `.vercel`, `.next`, `node_modules`, coverage, logs, `.env.local`, and all previous archives.
4. Include only a placeholder `.env.example`; never include a populated env file.
5. Scan staged content for operator emails, usernames, remote URLs, deployment/project IDs, API key prefixes, JWTs, private-key markers, and non-empty secret assignments.
6. Zip the staging directory, list the archive, extract it to a second temporary directory, and repeat the scan.
7. Report the archive path, checksum, exclusions, and verification result.

## See also

- [../gotchas/secrets-and-packaging.md](../gotchas/secrets-and-packaging.md)
- [local-verification.md](local-verification.md)
- [../status/deployment-status.md](../status/deployment-status.md)
