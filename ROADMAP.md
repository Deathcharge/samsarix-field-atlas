# Samsarix Field Atlas roadmap

This roadmap separates four gates: merge, release, publication, and flagship adoption. Passing one does not imply the next.

## Product boundary

Portfolio role: **reference implementation**. Keep this as a bounded reference implementation unless a real consumer proves a stronger role. Avoid turning it into a second canonical backend or user-facing platform.
Repository identity: `Deathcharge/samsarix-field-atlas` (complete).

Current disposition: Grow the provider-neutral conformance workflow through evidence-backed consumer use cases; release, publication, and flagship adoption remain separate decisions.

## Stabilize the productized default

- Keep the default branch buildable from a clean checkout and preserve exact-head CI evidence.
- Keep Samsarix LLC branding, package identity, license metadata, and compatibility aliases internally consistent.
- Preserve the pre-productization default under a rollback ref before merging; do not delete legacy history.
- Review priority: approve taxonomy AGPL commercial terms and schema v1 before a static demo.

## Release candidate

- Tag a reproducible reference snapshot with truthful support status.
- [x] Add one end-to-end strict-valid incident example checked by the distributed CLI artifact.
- Freeze feature growth unless a named consumer adopts the contract.

## Blueprint workbench

- [x] Share semantic validation across browser import and the CI-capable CLI.
- [x] Export the same conformance errors and warnings as deterministic SARIF 2.1.0 without adding an automatic upload or security claim.
- [x] Publish a v1 JSON Schema, complete example, governance findings, and Markdown review packet.
- [x] Add a schema-validated local scenario editor after evaluator and market workflow evidence established that adapting user-owned cases is a core evaluation job; retain local-only state and the bounded reference-role vocabulary.
- [x] Add portable multi-blueprint manifests and deterministic batch conformance reports with exact-byte bindings for repeatable browser and CI review.
- [x] Map the portable contract to A2A 1.0 discovery without making A2A or any runtime canonical.
- [x] Bind an externally generated official-format TCK JSON report to owner-asserted provenance metadata and an exact-byte owner-review receipt without turning it into a pass claim.
- [x] Bind the plan and TCK receipt to one explicit disposition per planned case, deterministic blocking readiness, and an owner-asserted decision ledger without claiming authenticated authority.
- Add a consumer-owned live A2A service fixture only when a runtime owner can provide endpoint, authentication, error, and compatibility evidence.

## Samsarix adoption

- Define a public API, event, schema, artifact, or deployment contract before connecting to Samsarix Unified.
- [x] Add a consumer-owned plan fixture covering authentication, privacy, limits, errors, and version compatibility; live execution evidence remains owner-controlled and pending.
- [x] Add a consumer-owned TCK evidence fixture that exposes skipped/not-tested requirements even when the reported compatibility percentage is 100%; the fixture remains synthetic and is not live-run evidence.
- [x] Add a complete synthetic review fixture whose rejected authentication case blocks readiness and produces an explicit rejected owner decision.
- Make one implementation canonical; remove or freeze duplicate behavior only after parity and rollback are proven.
- Record an owner, support level, compatibility window, and measurable adoption signal.

## Completion evidence

A milestone is complete only when its exact commit, commands and results, artifact digest, consumer or deployment, and rollback path are recorded in a pull request or release record. README claims must not exceed that evidence.
