# Samsarix Field Atlas

Samsarix Field Atlas is a local-first coordination-design workbench for the Samsarix reference model. It lets developers, technical evaluators, and operational owners trace how 13 named roles hand work across intent, execution, safety, and memory boundaries—then validate that design as a portable contract in the browser or CI.

The site is deliberately honest about its limits: it does **not** run agents, call language models, connect to an external runtime, report live status, or store data remotely. Scenario runs are deterministic browser simulations that produce a portable JSON blueprint. Scenario Studio lets evaluators adapt those scenarios through a guided local editor. The workbench validates the resulting blueprint, exports a readable Markdown review packet, maps explicit runtime-owner facts to a draft A2A 1.0 Agent Card, creates a consumer-owned acceptance plan, binds an externally generated official A2A TCK report to a review receipt, and records case-by-case owner dispositions without authenticating them or inventing authority.

## Current status

This is the canonical `Deathcharge/samsarix-field-atlas` repository and a release candidate for independent evaluation. The scenario lab, schema-validated local authoring studio, blueprint workbench, shared browser/CLI validators, public schemas and examples, A2A 1.0 deployment, acceptance, TCK evidence, and owner-review handoffs, static production build, bounded Node server, automated tests, CI checks, public license, and commercial-licensing path are implemented. Public deployment, genuine runtime evidence, authenticated signoff, and adoption remain owner-controlled gates; see [Productization](docs/PRODUCTIZATION.md).

## Fastest successful path

Prerequisites:

- Node.js 22.13 or newer
- Corepack, included with supported Node.js 22 distributions

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://127.0.0.1:3000`.

No environment variables, API keys, accounts, databases, or companion repositories are required.

## Primary walkthrough

1. Choose **Ship a breaking change**, **Triage a production incident**, or **Clarify an ambiguous request**.
2. Review the objective, risk, and acceptance criteria.
3. Select **Run trace** to reveal each role, evidence artifact, and trust boundary in order.
4. Cancel and retry safely if you want to change scenarios.
5. After completion, select **Export JSON** to download an implementation-neutral blueprint.
6. In **Blueprint workbench**, check the current scenario, import any v1 blueprint, or open **Scenario Studio** to adapt the selected scenario locally.
7. In the Studio, edit success criteria and ordered handoffs, resolve live contract errors, then export JSON or create a validated workbench snapshot.
8. Resolve workbench governance warnings, then export the Markdown review packet or SARIF result for a decision owner.
9. Complete the runtime-owner profile to map a valid scenario to a draft A2A 1.0 Agent Card.
10. Export the draft card and implementation checklist for a server owner.
11. Complete the acceptance-owner profile with environment, limits, retention, classification, and processor decisions.
12. Export the `plan-not-run` JSON manifest and Markdown execution checklist.
13. Validate the eventual running service with the official A2A Inspector and Technology Compatibility Kit.
14. Import the TCK `compatibility.json`, supply owner-asserted full revision provenance, and export an `owner-review-required` evidence receipt.
15. In **Record owner dispositions**, review every planned case or import a bounded review profile.
16. Record accepted, rejected, waived, or pending outcomes with credential-free evidence references and required exception rationale.
17. Export the JSON review ledger and Markdown packet. Treat the named owners and decision as assertions until an external authority authenticates them.

The selected scenario is remembered in device-local browser storage. Scenario Studio drafts stay only in browser memory and must be exported before leaving the page. Neither leaves the device.

## What the export means

The `samsarix-field-atlas/1` JSON document records:

- the chosen scenario and success criteria;
- the active roles and their responsibilities;
- the ordered trace and expected evidence;
- human, policy, tool, and memory boundaries;
- explicit runtime claims showing that this reference executed no agents and called no external services.

The export is a design aid or test fixture. It is not an execution plan, authorization record, or production trace. Field Atlas validates the internal contract, not whether named evidence or approval exists in the real world. See [Blueprint conformance](docs/BLUEPRINT_CONFORMANCE.md) and [Reference Model](docs/REFERENCE_MODEL.md).

## Prepare an A2A 1.0 handoff

A valid blueprint can be mapped to a standards-shaped draft Agent Card after a runtime owner explicitly supplies the service URL, binding, agent version, media modes, security posture, provider identity, and optional streaming/push declarations. Field Atlas never invents or probes those facts and never accepts credentials.

```bash
pnpm --silent blueprint:a2a examples/incident.blueprint.json \
  --endpoint https://agent.example.com/a2a \
  --agent-version 0.1.0 \
  --security bearer \
  --name "Incident Coordination Agent" \
  --provider-organization "Samsarix LLC" \
  --provider-url https://samsarix.com

pnpm validate:a2a-example
```

The second command compares the generated card with the committed incident fixture in strict mode for CI drift detection. Neither command proves that a server is deployed, reachable, authenticated, signed, or A2A-compatible. See [A2A deployment handoff](docs/A2A_HANDOFF.md).

## Define A2A implementation acceptance

A valid blueprint and its draft Agent Card can be combined with consumer-owned operational decisions to create a repeatable acceptance plan. The plan covers authentication, authorization, validation errors, version negotiation, request/deadline/concurrency limits, retention, external processors, every human gate, every expected evidence artifact, and an official A2A TCK run.

```bash
pnpm --silent blueprint:acceptance examples/incident.blueprint.json \
  --agent-card examples/incident.a2a-agent-card.json \
  --profile examples/incident.a2a-acceptance-profile.json \
  --generated-at 2026-08-01T12:00:00.000Z

pnpm validate:acceptance-example
```

The artifact status is always `plan-not-run`. Field Atlas performs no network request, test execution, credential acquisition, or compatibility judgment. The acceptance manifest is a Samsarix Field Atlas artifact, not an A2A extension or TCK report. See [A2A implementation acceptance](docs/A2A_ACCEPTANCE.md).

## Bind an official A2A TCK report

After a runtime owner executes the official TCK elsewhere, Field Atlas can hash the exact `compatibility.json` bytes, validate the report's internal status/percentage/transport semantics, bind asserted TCK and implementation revisions, and produce a deterministic owner-review receipt:

```bash
pnpm --silent blueprint:tck-evidence \
  examples/incident.a2a-acceptance.json \
  --tck-report examples/incident.a2a-tck-compatibility.json \
  --profile examples/incident.a2a-tck-evidence-profile.json \
  --generated-at 2026-08-01T13:00:00.000Z

pnpm validate:tck-evidence-example
```

The receipt never becomes a pass result: `protocolConformance` remains `not-determined`, `releaseDecision` remains `not-made`, and all non-TCK acceptance cases remain unresolved. It explicitly counts failures, skips, and not-tested requirements even when the official summary says `100.0%`. The committed TCK report is a synthetic official-format fixture, not evidence that any service ran. See [A2A TCK evidence receipt](docs/A2A_TCK_EVIDENCE.md).

## Record acceptance dispositions

The review ledger closes the plan's bookkeeping gap without becoming a runtime or identity system. It binds the Field Atlas canonical JSON for the acceptance plan and TCK receipt, requires exactly one row for every planned case, constrains evidence references to credential-free HTTPS or URN identifiers, computes blocking readiness, and records an optional owner release decision:

```bash
pnpm --silent blueprint:review \
  examples/incident.a2a-acceptance.json \
  --tck-receipt examples/incident.a2a-tck-receipt.json \
  --profile examples/incident.a2a-review-profile.json \
  --generated-at 2026-08-01T14:10:00.000Z

pnpm validate:review-example
```

An approval is rejected when a blocking case is pending or rejected. Blocking waivers, non-blocking exceptions, and TCK failures/skips/not-tested requirements remain visible review items. The committed example is deliberately synthetic and rejected because its blocking authentication case is rejected. `owner-asserted-review` means Field Atlas did not authenticate the source artifacts, named owners, or decision authority. See [A2A acceptance review ledger](docs/A2A_REVIEW_LEDGER.md).

## Validate a blueprint in CI

The CLI uses the same semantic validator as the browser workbench:

```bash
pnpm blueprint:validate examples/incident.blueprint.json
pnpm blueprint:validate examples/incident.blueprint.json --strict
pnpm blueprint:validate examples/incident.blueprint.json --json
pnpm --silent blueprint:validate examples/incident.blueprint.json --strict --sarif
```

Normal mode exits successfully for a valid contract with review warnings. `--strict` turns warnings into a non-zero CI result. Invalid JSON, unsupported versions, broken role references, contradictory runtime claims, and misaligned approval gates always fail. `--sarif` emits portable SARIF 2.1.0 without uploading it; see [Blueprint SARIF reporting](docs/SARIF_REPORTING.md).

## Validate a scenario suite

Commit a bounded manifest when a review or release gate needs several blueprints to remain conformant together:

```bash
pnpm blueprint:suite examples/core.suite.json
pnpm blueprint:suite examples/core.suite.json --check examples/core.suite-report.json
```

The suite CLI resolves portable relative paths, rejects traversal (including symlink escapes), checks up to 64 files with the shared semantic validator, hashes exact imported bytes, and emits one deterministic aggregate report. The browser workbench can batch-review up to 16 selected files without uploading them. See [Blueprint suites](docs/BLUEPRINT_SUITES.md).

## Development commands

| Command                              | Purpose                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| `pnpm dev`                           | Start the local Vite development server on `127.0.0.1:3000`                           |
| `pnpm lint`                          | Run ESLint across TypeScript and React code                                           |
| `pnpm format:check`                  | Check repository formatting with Prettier                                             |
| `pnpm check`                         | Run the strict TypeScript compiler check                                              |
| `pnpm test`                          | Run model, component, and server tests once                                           |
| `pnpm test:coverage`                 | Run tests with enforced coverage thresholds                                           |
| `pnpm build`                         | Build static assets, the optional Node release server, and all six CLIs               |
| `pnpm blueprint:validate <file>`     | Validate a v1 blueprint with optional strict, JSON, or SARIF output                   |
| `pnpm blueprint:suite <manifest>`    | Batch-check a bounded suite and optionally compare its deterministic report           |
| `pnpm validate:sarif-example`        | Check the deterministic strict-ready SARIF report against its committed fixture       |
| `pnpm validate:suite-example`        | Check all three core scenarios against the committed strict-ready suite report        |
| `pnpm blueprint:a2a <file> ...`      | Generate a draft A2A 1.0 Agent Card from a valid blueprint and explicit owner profile |
| `pnpm validate:a2a-example`          | Check the deterministic incident Agent Card mapping against its committed fixture     |
| `pnpm blueprint:acceptance ...`      | Generate a deterministic, not-yet-run A2A implementation acceptance manifest          |
| `pnpm validate:acceptance-example`   | Check the incident acceptance plan against its complete committed fixture             |
| `pnpm blueprint:tck-evidence ...`    | Bind an official-format TCK JSON report to a deterministic owner-review receipt       |
| `pnpm validate:tck-evidence-example` | Check the incident TCK receipt against its complete committed fixture                 |
| `pnpm blueprint:review ...`          | Bind plan, receipt, case dispositions, and owner decision into a review ledger        |
| `pnpm validate:review-example`       | Check the synthetic blocked review ledger against its complete committed fixture      |
| `pnpm start`                         | Serve the completed build on `127.0.0.1:3000`                                         |
| `pnpm verify`                        | Run lint, formatting, types, coverage, all fixture validations, and build in CI order |

## Production build and distribution

```bash
pnpm build
pnpm start
```

The build produces:

- `dist/public/`: the standalone static site, suitable for a static host;
- `dist/index.js`: a small Express server with `/healthz`, strict browser security headers, bounded timeouts, and graceful shutdown.
- `dist/atlas-validate.js`: the bundled, dependency-free blueprint validation CLI.
- `dist/atlas-suite.js`: the bundled, dependency-free blueprint suite and report CLI.
- `dist/atlas-a2a.js`: the bundled, dependency-free A2A draft generation and fixture-check CLI.
- `dist/atlas-acceptance.js`: the bundled, dependency-free A2A acceptance-plan and fixture-check CLI.
- `dist/atlas-tck-evidence.js`: the bundled, dependency-free A2A TCK evidence receipt and fixture-check CLI.
- `dist/atlas-review.js`: the bundled, dependency-free A2A acceptance review and fixture-check CLI.

The server accepts optional `HOST` and `PORT` process variables. It defaults to `127.0.0.1:3000`; set `HOST=0.0.0.0` only when an external deployment boundary is intentional and protected.

For a static host mounted under a path, set `BASE_PATH` at build time. Example:

```bash
BASE_PATH=/samsarix-field-atlas/ pnpm build
```

On PowerShell:

```powershell
$env:BASE_PATH = "/samsarix-field-atlas/"
pnpm build
```

No production deployment is performed by this repository. Hosting configuration, domain ownership, and publishing remain owner actions.

## Architecture

```text
client/src/model.ts           Canonical roles, scenarios, indicators, and serializer
             ↓
client/src/scenario-editor.ts Guided draft conversion + derived contract fields
             ↓
client/src/blueprint.ts       Shared semantic validator + Markdown review packet
             ↘
client/src/suite.ts           Bounded manifests + exact-byte batch reports
              ↓
client/src/a2a.ts           Owner profile checks + draft card/checklist mapping
              ↓
client/src/acceptance.ts    Owner limits + deterministic plan/checklist mapping
              ↓
client/src/evidence.ts      TCK report semantics + exact-byte evidence receipt
              ↓
client/src/review.ts        Case dispositions + blocking readiness + owner decision
       ↙             ↘
React workbench       CLI tools ───────────→ six bundled CLI artifacts
       ↓                    ↑
Vite static build     schemas/ + examples/
       ↓
dist/public ──────────→ optional Express server + /healthz
```

The product intentionally has no authentication, database, analytics, remote API, or LLM dependency.

## Security and privacy

- Scenario runs are deterministic and entirely local.
- No analytics, cookies, remote fonts, or external data requests ship in the application.
- Only the selected scenario ID is saved to `localStorage`.
- Scenario Studio drafts remain in memory; valid snapshots derive role declarations, stage order, approval positions, and no-runtime claims before local export or handoff.
- The JSON export is created in the browser and downloaded directly.
- Imported blueprints are limited to 1 MiB, require valid UTF-8 JSON, are parsed in memory, rendered as text, and never uploaded or persisted.
- Browser suite review accepts at most 16 blueprints; CLI manifests accept at most 64 relative 1 MiB files, reject traversal and canonical-path escapes, and bind readable files by exact-byte SHA-256.
- A2A owner-profile values are local-only, rendered as text, and never used to probe an endpoint; no credential field exists.
- Acceptance profiles and manifests remain local-only, are bounded in the CLI, and make no test-result claim.
- TCK JSON imports are limited to 5 MiB and hashed locally; receipts omit raw errors, test IDs, and embedded Agent Card contents, reject likely secret-bearing commands, and never claim conformance or release approval.
- Review profiles are limited to 1 MiB, stay local, require one bounded row per planned case, and reject credential-bearing URLs. Ledgers store evidence references rather than evidence bodies and identify every owner and decision as unauthenticated assertions.
- The validator rejects oversized collections, malformed references, unsupported major versions, and reference-mode runtime contradictions.
- The release server disables framework disclosure, denies framing, restricts browser capabilities, and serves a narrow health contract.
- Public links open with `rel="noreferrer"`.

See [Security](SECURITY.md) for trust boundaries, reporting, and operational guidance.

## Limitations

- Indicator values are explanatory values defined by each fixture, not telemetry or scientific measurements.
- The model is a reference vocabulary, not a normative multi-agent standard.
- Conformance proves internal consistency only; it cannot prove that a real implementation generated the evidence or received the approval named in a trace.
- A generated A2A Agent Card is a draft declaration, not proof of endpoint reachability, authentication, signature validity, or protocol compatibility.
- A generated acceptance manifest is a not-yet-run consumer plan, not an official extension, TCK report, pass result, or accountable release signoff.
- A generated TCK evidence receipt validates report structure and binds asserted provenance; it does not prove that the run occurred, authenticate the source revisions, make a conformance decision, complete non-TCK cases, or approve a release.
- A generated review ledger can reject contradictory approvals and make missing/waived work visible, but it does not verify evidence contents, signatures, identities, authority, or the truth of an owner disposition.
- The three bundled scenarios are representative rather than exhaustive; Scenario Studio can adapt them through the bounded 13-role reference vocabulary but does not persist drafts or define custom roles.
- Suite reports establish repeatable contract conformance and byte integrity only; they do not execute evaluations, verify named evidence, authenticate owners, or approve releases.
- No hosted URL is guaranteed by this repository.

## Project records

- [Productization assessment and release gates](docs/PRODUCTIZATION.md)
- [Reference model and JSON contract](docs/REFERENCE_MODEL.md)
- [Scenario Studio authoring workflow and proof boundary](docs/SCENARIO_STUDIO.md)
- [Blueprint suites and deterministic batch conformance](docs/BLUEPRINT_SUITES.md)
- [A2A 1.0 deployment handoff and proof boundary](docs/A2A_HANDOFF.md)
- [A2A implementation acceptance contract](docs/A2A_ACCEPTANCE.md)
- [A2A TCK evidence receipt and owner-review boundary](docs/A2A_TCK_EVIDENCE.md)
- [A2A acceptance review ledger and assertion boundary](docs/A2A_REVIEW_LEDGER.md)
- [Historical pre-Samsarix context](CONTEXT.md) — preserved as non-normative source material
- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Licensing guide](LICENSING.md)
- [Trademark policy](TRADEMARKS.md)

## Licensing

Samsarix Field Atlas is publicly available under [GNU AGPL-3.0-only](LICENSE). If you modify it and let users interact with the modified version over a network, the AGPL requires you to offer those users the corresponding source. Copyright and license notices must remain intact.

Organizations that need terms incompatible with the AGPL can request a separate commercial license from Samsarix LLC at [contact@samsarix.com](mailto:contact@samsarix.com). The Samsarix name and brand assets are not licensed under the AGPL; see [LICENSING.md](LICENSING.md), [NOTICE.md](NOTICE.md), and [TRADEMARKS.md](TRADEMARKS.md). Support and private security coordination are available at [support@samsarix.com](mailto:support@samsarix.com).

This summary is practical guidance, not a substitute for the license text or legal advice.
