# Contributing

Samsarix Field Atlas favors a small, auditable product surface over platform expansion.

## Before opening a change

1. Keep the product local-first and deterministic.
2. Do not add authentication, analytics, remote APIs, LLM calls, or persistence without an evidence-backed product decision recorded in `docs/PRODUCTIZATION.md`.
3. Keep scenario claims illustrative and label human approval boundaries explicitly.
4. Add or update tests for every behavior change.

## Local checks

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm verify
```

Use focused commits and explain any change to the export contract. A schema-breaking change requires a new `schemaVersion` and migration notes.

By participating, you agree to follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Contributions are submitted under [AGPL-3.0-only](LICENSE).

Samsarix LLC may offer separately licensed releases. To preserve that option, external contributions that would require separate relicensing will need a written contributor agreement before merge. Opening a pull request does not by itself assign your copyright or grant Samsarix LLC rights beyond AGPL-3.0-only. Contact [contact@samsarix.com](mailto:contact@samsarix.com) before investing in a substantial contribution.
