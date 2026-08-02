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
- [x] Publish a v1 JSON Schema, complete example, governance findings, and Markdown review packet.
- Add a schema-validated local scenario editor only after an evaluator proves the authoring need.
- [x] Map the portable contract to A2A 1.0 discovery without making A2A or any runtime canonical.
- Add a consumer-owned live A2A service fixture only when a runtime owner can provide endpoint, authentication, error, and compatibility evidence.

## Samsarix adoption

- Define a public API, event, schema, artifact, or deployment contract before connecting to Samsarix Unified.
- [x] Add a consumer-owned plan fixture covering authentication, privacy, limits, errors, and version compatibility; live execution evidence remains owner-controlled and pending.
- Make one implementation canonical; remove or freeze duplicate behavior only after parity and rollback are proven.
- Record an owner, support level, compatibility window, and measurable adoption signal.

## Completion evidence

A milestone is complete only when its exact commit, commands and results, artifact digest, consumer or deployment, and rollback path are recorded in a pull request or release record. README claims must not exceed that evidence.
