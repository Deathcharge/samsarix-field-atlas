# Productization record

Last updated: August 2, 2026

## Repository assessment

The repository began as a React/Vite promotional landing page for the wider Helix Collective. The tracked history confirms that the only implemented product was a static page; later documentation and tests described Python services, APIs, authentication, databases, CI, deployments, and integrations that did not exist here.

The worktree was clean on `main` at `440e555`, matching `origin/main`, before implementation began. Available remote branches contained an older dependency modernization and a Dependabot update; neither supplied a missing product journey.

### What worked at baseline

- A single React route rendered a dark landing page.
- The page described the 13-role pre-Samsarix vocabulary and displayed five fixed UCF values.
- Vite and an Express static-file server were present in source.

### What did not

- “System Online,” “13 Agents Active,” and “Real-time” labels were hard-coded.
- Dashboard and documentation actions were dead or generic external links.
- Only seven of the claimed 13 roles were actually listed in the main page.
- The separate `docs/index.html` fetched an unverified remote endpoint and inserted returned strings with `innerHTML`.
- Default analytics configuration sent browser traffic to an unrelated remote Umami endpoint.
- The README documented nonexistent Python requirements, pytest commands, docs, examples, and GitHub Actions while claiming “Production Ready.”
- Test files asserted local constants and mock functions rather than importing product code. The required Testing Library dependency and a `test` script were absent.
- The package manifest said MIT while repository legal files said BSL 1.1 and proprietary/confidential.
- More than 50 unused UI component files and hundreds of transitive dependencies burdened a one-page site.

## Chosen product

**Samsarix Field Atlas** is a zero-backend, local-first interactive reference simulator for the Samsarix 13-role coordination model.

### Target user

A developer, technical evaluator, or collaborator who wants to understand or discuss the Samsarix role model without installing a separate runtime, obtaining credentials, or trusting claims about unavailable infrastructure.

### Primary use case and journey

The user selects a realistic scenario, reviews its objective and acceptance criteria, runs a deterministic role-by-role trace, and inspects the exact human/policy/tool/memory boundaries. They can adapt that route in a guided local editor or export it directly as an implementation-neutral JSON blueprint. The user can then receive a semantic readiness decision, enforce a repository-owned suite in CI, compare a proposed suite with an exact baseline, bind intentional drift to a bounded expiring declaration, prepare an A2A deployment and acceptance handoff, bind an externally generated official TCK report to an owner-review receipt, and record one explicit disposition per planned case in an owner-asserted review ledger.

### Independent reason to exist

This repository is a lightweight design, conformance, and evaluation surface rather than a runtime ecosystem. It can be hosted statically, works offline after load, costs nothing in API usage, and has no undocumented Samsarix dependency. Its independent workflow is useful before a team commits to a provider or exposes production authority.

### Deliberate non-goals

- Running agents, LLMs, tools, or production actions
- Live telemetry, dashboards, authentication, or accounts
- Remote storage, analytics, or personal-data collection
- Reproducing the `helix-unified` application
- Claiming that the illustrative indicators are scientific or operational measurements

## Current ecosystem position

Bounded research used primary documentation current on August 1, 2026:

- [AutoGen Studio](https://microsoft.github.io/autogen/stable/user-guide/autogenstudio-user-guide/usage.html) provides a visual team builder, playground, and JSON export for actual agent components and model-backed runs.
- [LangSmith Studio](https://docs.langchain.com/oss/python/langgraph/studio) connects to locally running LangGraph agents for interactive debugging and inspection.
- [OpenAI Agents SDK tracing](https://openai.github.io/openai-agents-js/guides/tracing/) records real generations, tool calls, handoffs, and guardrails, with explicit sensitive-data controls.
- [Agent2Agent Protocol 1.0](https://github.com/a2aproject/A2A/blob/main/docs/specification.md) standardizes discovery, messages, tasks, and artifacts across independent agent systems.
- The official [A2A Technology Compatibility Kit](https://github.com/a2aproject/a2a-tck) runs protocol tests across JSON-RPC, HTTP+JSON, and gRPC implementations and emits machine-readable compatibility reports.
- [A2A extension and binding governance](https://a2a-protocol.org/latest/topics/extension-and-binding-governance/) separates official extensions from vendor-specific additions, supporting a separate Field Atlas acceptance artifact instead of nonstandard Agent Card fields.
- [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework) provides a governance frame for managing AI risks, with a Generative AI Profile and continuing work on human oversight in critical infrastructure.
- [NIST TEVV](https://www.nist.gov/ai-test-evaluation-validation-and-verification-tevv) and the [AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) call for documented, repeatable evaluation under deployment-like conditions with defined human oversight.
- [LangSmith annotation queues](https://docs.langchain.com/langsmith/annotation-queues) organize human review with rubrics, assigned reviewers, and explicit completion states.
- [Braintrust human review](https://www.braintrust.dev/docs/annotate/human-review) combines structured case scores, assignments, comments, and completed-review tracking with automated evaluation.
- [LangSmith dataset management](https://docs.langchain.com/langsmith/manage-datasets-in-application) makes from-scratch examples, inline editing, file import, and optional schema validation part of the evaluation workflow.
- [Braintrust datasets](https://www.braintrust.dev/docs/annotate/datasets) make user-owned test cases versioned, editable, importable, and reusable across evaluations.
- [Promptfoo test cases](https://www.promptfoo.dev/docs/configuration/test-cases/) support portable, user-authored scenario variables and assertions across inline and external test-set formats.
- [Buf breaking-change detection](https://buf.build/docs/breaking/) and [Buf Schema Registry review](https://buf.build/docs/bsr/checks/breaking/) combine baseline comparison with explicit review of noncompliant schema changes.
- [Pact pending and WIP contracts](https://docs.pact.io/pact_broker/advanced_topics/pending_pacts) distinguish newly introduced expectations from contracts a provider has already demonstrated it supports; [WIP selection](https://docs.pact.io/pact_broker/advanced_topics/wip_pacts) is time-bounded.
- [HCP Terraform policy enforcement](https://developer.hashicorp.com/terraform/enterprise/workspaces/policy-enforcement) distinguishes advisory, mandatory, and permissioned override behavior rather than collapsing every exception into an ignore.
- [GitHub repository rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets) keep active controls visible and attach bypass/approval authority to authenticated repository identities.

The execution products build or inspect running agent systems; the emerging standards make portable declarations and governance evidence increasingly relevant across runtimes. Field Atlas occupies the pre-runtime wedge: an account-free, provider-neutral coordination designer, semantic contract checker, and review-artifact generator. It does not compete as a model runner or observability service.

## Architecture decisions

1. Keep a static React/Vite product because it matches the original repository and requires no infrastructure.
2. Put roles, scenarios, indicators, and export behavior in one typed canonical model.
3. Use native browser controls and CSS instead of a full generated component library.
4. Persist only a scenario identifier locally; export through a browser-created file.
5. Retain an optional Express release server for local/container evaluation, but keep static hosting as the simplest distribution path.
6. Remove analytics, remote fonts, remote runtime calls, placeholder authentication, and unused UI code.
7. Make scope truth part of the interface, export contract, README, and tests.
8. Keep one semantic validator shared by browser and CLI so interactive and CI decisions cannot drift.
9. Keep A2A deployment facts in a separate owner-completed profile so provider-neutral design data cannot silently become a false runtime claim.
10. Keep consumer acceptance semantics in a separate `plan-not-run` artifact: the official A2A TCK owns core compatibility, while Field Atlas preserves owner limits, privacy choices, human gates, and evidence requirements without extending the Agent Card.
11. Treat external TCK JSON as untrusted evidence: hash exact bytes, recompute report semantics, omit raw diagnostics, bind asserted provenance, and keep conformance and release decisions explicitly undetermined.
12. Keep final dispositions in a separate owner-asserted ledger: bind canonical source artifacts, require complete case coverage and explicit exceptions, compute blocking readiness, reject contradictory approvals, and state that identities and authority were not authenticated.
13. Keep guided scenario authoring local and bounded: start from a known route, select only reference-catalog roles, derive bookkeeping fields, validate live with the shared semantic checker, and snapshot before downstream handoff.
14. Represent repeated evaluation work as a portable suite of relative blueprint files: hash exact bytes, preserve strict-policy effects separately from structural status, and keep collection conformance distinct from runtime evaluation.
15. Represent intentional suite drift as a separate repository-owned artifact: bind one exact baseline, prohibit wildcards, require precise expected signals and regression acknowledgement, expire the intent, preserve the original comparison gate, and leave authorization to authenticated repository controls.

## Assumptions

- The existing 13 role names and three-layer organization are intentional product vocabulary.
- The historical UCF terms are useful when translated into plain-language illustrative indicators.
- No live Samsarix service is a release dependency for this repository.
- Samsarix LLC is the current company and brand; historical Helix references remain only where needed for provenance.
- The supplied `contact@samsarix.com` and `support@samsarix.com` addresses are the public licensing and support channels.

## Baseline command results

Executed before implementation on Windows with Node `v24.12.0` and ambient pnpm `11.9.0`:

| Command                                   | Actual result                                                                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile`          | Failed: lockfile/config mismatch because pnpm 11 no longer read `pnpm.overrides` and `pnpm.patchedDependencies` from `package.json`.             |
| `corepack prepare pnpm@10.4.1 --activate` | Did not complete in the bounded attempt; the pinned manager was not available locally.                                                           |
| `pnpm check`                              | Failed before the script ran: pnpm attempted to repair `node_modules` and aborted its purge in a non-TTY session.                                |
| `pnpm test`                               | Failed before script dispatch for the same install state; the manifest also had no `test` script.                                                |
| `pnpm build`                              | Failed before script dispatch for the same install state.                                                                                        |
| `pnpm start`                              | Failed before script dispatch for the same install state; its POSIX-only `NODE_ENV=production` assignment was also incompatible with PowerShell. |

Final command evidence is appended after implementation verification.

## Findings

### P0 — release blockers

- [x] Replace false live-system status and dead primary actions with a complete local journey.
- [x] Replace the inaccurate README and remove claims about nonexistent Python/API/CI surfaces.
- [x] Restore deterministic frozen installation and a valid lockfile.
- [x] Make lint, format, type-check, test, build, and start pass from documented commands.
- [x] Remove the obsolete remote `docs/index.html` implementation.

### P1 — serious quality, security, or maintainability issues

- [x] Remove default third-party analytics and remote fonts.
- [x] Remove the unused authentication/OAuth template surface.
- [x] Replace assertion-only tests with model, primary-journey, and server behavior tests.
- [x] Add CI for all meaningful checks on Windows and Linux.
- [x] Add server security headers, bounded timeouts, readiness, error handling, and graceful shutdown.
- [x] Reduce the runtime dependency surface to React, React DOM, and Express.
- [x] Replace conflicting legacy legal files with AGPL-3.0-only, a commercial-licensing path, notices, and a trademark policy.
- [x] Generate and validate the product-specific social preview asset.
- [x] Complete browser accessibility, responsive, and interaction verification.

### P2 — valuable follow-up

- [x] Add user-authored scenarios through a schema-validated local editor.
- [x] Add import/conformance checks for `samsarix-field-atlas/1` blueprints.
- [x] Add deterministic browser and CLI SARIF 2.1.0 reporting for blueprint conformance findings.
- [x] Add portable multi-blueprint manifests, exact-byte bindings, and deterministic browser/CLI suite reports for repeatable collection-level review.
- [x] Add deterministic suite-report baseline comparison with stable case alignment, explicit regression/review/improvement impact, and regression-only or any-change CI gates.
- [x] Add exact-baseline-bound, expiring declared-change plans and deterministic reviews that fail on missing, unexpected, mismatched, stale, or unbound intent without claiming authenticated approval.
- [x] Map a validated blueprint to an owner-completed draft A2A 1.0 Agent Card and implementation checklist.
- [x] Generate a consumer-owned A2A acceptance manifest and execution checklist with deterministic fixtures and an official-TCK evidence requirement.
- [x] Bind official-format A2A TCK JSON to an exact-byte, owner-review receipt that keeps failures, skips, not-tested requirements, and all non-TCK acceptance work visible.
- [x] Record every planned case as accepted, rejected, waived, or pending in a canonical-source-bound review ledger with deterministic blocking readiness and an optional owner decision.
- [ ] Add translations after the English information architecture stabilizes.
- [ ] Add a printer-friendly trace view if evaluators request it.

## Release acceptance criteria

- [x] Product identity, target user, independent wedge, and non-goals are explicit.
- [x] The complete 13-role inventory is implemented.
- [x] Empty, running, cancellation, success, retry, and export-failure states are handled.
- [x] The UI is responsive, keyboard-operable, and reduced-motion aware by construction.
- [x] A frozen install succeeds with the declared package manager.
- [x] Lint, format check, strict types, tests, coverage, and build pass.
- [x] The production server starts, reports ready, serves the product, returns 404 for unknown paths, and shuts down cleanly.
- [x] Browser verification confirms desktop/mobile layout, keyboard focus, scenario run, cancellation, and JSON download.
- [x] Dependency audit has no known production vulnerability.
- [x] Documentation matches the verified commands and built behavior.
- [x] No locally actionable P0 remains.

## Completed implementation

- Reframed the product as Samsarix Field Atlas.
- Added three complete deterministic scenarios and a typed JSON export contract.
- Added an accessible interactive trace with explicit evidence and authority boundaries.
- Added the complete 13-role, three-layer reference inventory.
- Added honest local-only runtime disclosure in product copy and exports.
- Added a local blueprint workbench with file import, readiness states, governance findings, metrics, and Markdown review-packet export.
- Added Scenario Studio with guided local scenario, criteria, trace, boundary, evidence, and indicator authoring; derived role/order/approval/runtime fields; live shared validation; deliberate draft replacement; and immutable workbench snapshots.
- Added a shared semantic validator, strict/JSON CLI modes, versioned JSON Schema, and a complete incident fixture enforced by `pnpm verify`.
- Added portable scenario-suite manifests, bounded canonical path resolution, multi-file browser review, exact-byte SHA-256 bindings, deterministic aggregate reports, public schemas, and strict-ready fixtures covering all three built-in scenarios.
- Added suite baseline comparison plus repository-owned declared-change plans with exact case/suite signal matching, explicit regression acknowledgement, expiry, dual comparison/intent gates, browser/CLI review, public schemas, and deterministic JSON/Markdown fixtures.
- Added a shared A2A 1.0 handoff validator, browser profile, draft Agent Card/checklist exports, deterministic CLI mapping, and committed incident card fixture.
- Added a shared A2A implementation acceptance validator, browser owner profile, JSON/Markdown plan exports, public schema, deterministic CLI, and committed incident fixtures.
- Added a shared A2A TCK evidence validator, bounded browser import, exact-byte SHA-256, owner-asserted provenance profile, public receipt schema, deterministic CLI, and synthetic omission-focused incident fixtures.
- Added a shared A2A acceptance review validator, per-case browser workflow, canonical source binding, credential-free evidence references, JSON/Markdown exports, public schema, deterministic CLI, and a complete synthetic blocked-decision fixture.
- Removed misleading status, deployment, authentication, analytics, and integration claims.
- Replaced the generated UI kit with purpose-built semantic React and CSS.
- Added the optional hardened release server and meaningful automated tests.
- Added CI, security guidance, contribution guidance, and accurate user documentation.

## Deferred work and rationale

- Persistent draft history, blank-canvas authoring, and custom-role editing remain deferred until consumer evidence justifies a storage/migration model beyond the bounded reference workflow.
- Live runtime integration remains owner-controlled because it requires a real endpoint, authentication boundary, genuine compatibility evidence, authenticated signoff, and ongoing support commitment. The A2A handoff, acceptance plan, evidence receipt, and owner-asserted review ledger make those next steps explicit without taking the dependency or claiming the synthetic fixture ran.
- Internationalization is deferred until product language is validated.

## Owner-, legal-, and production-blocked work

1. **Public hosting:** choose a hosting account/domain, set the correct `BASE_PATH`, and authorize deployment.
2. **Rights paperwork:** keep a signed assignment or license from Andrew John Ward to Samsarix LLC for pre-company work, and adopt a lawyer-reviewed contributor agreement before commercial relicensing of outside contributions.
3. **Brand review:** confirm that all named-role presentation and Samsarix marks are cleared for public distribution.

## Known risks

- The role model is conceptual and may be mistaken for a claim about sentient or live agents; repeated UI and documentation disclosures mitigate this.
- Static scenario fixtures may drift from a future flagship implementation; the atlas avoids a runtime dependency and versions its export contract.
- Commercial relicensing depends on complete copyright ownership or written authorization from every relevant contributor.

## Distribution and sustainability

The recommended first distribution is a static build on GitHub Pages or another owner-controlled static host. There are no API, database, analytics, or model costs. The optional Node server can support a container or local package where health checks are useful.

Sustainability should begin as a portfolio and developer-education surface that leads users to owner-approved Samsarix services or support. Advertising, user tracking, subscriptions, and paid runtime features are not justified by current evidence. AGPL-3.0-only preserves a public network-copyleft path, while separately signed commercial licenses can serve organizations that need incompatible terms.

## Final verification record

Verified locally on Windows on July 28, 2026. The declared toolchain was Node `v24.12.0` (within the supported `>=22.13.0` range) and pnpm `11.17.0` through Corepack.

| Command or check                               | Result                                                                                                                                                |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `corepack pnpm install --frozen-lockfile`      | Passed with pnpm `11.17.0`; the lockfile was current and the approved `esbuild` lifecycle policy remained narrow.                                     |
| `pnpm lint`                                    | Passed with no lint errors or warnings from repository code.                                                                                          |
| `pnpm format:check`                            | Passed across source, tests, configuration, and documentation.                                                                                        |
| `pnpm check`                                   | Passed strict TypeScript, including unchecked-index, exact-optional, and unused-code checks.                                                          |
| `pnpm test`                                    | Passed all 15 model, primary-journey, failure-state, export, and release-server tests.                                                                |
| `pnpm test:coverage`                           | Passed: 85.71% statements, 76.34% branches, 84.48% functions, and 85.71% lines.                                                                       |
| `pnpm build`                                   | Passed; client was 216.81 kB / 68.10 kB gzip JS plus 18.70 kB / 4.54 kB gzip CSS, and the server bundle was 4.2 kB.                                   |
| Production runtime                             | Bound to `127.0.0.1:3401`; `/healthz` returned 200, unknown paths returned 404, restrictive headers were present, and SIGINT reached graceful stop.   |
| `pnpm audit --prod`                            | Passed with no known vulnerabilities.                                                                                                                 |
| `pnpm licenses list --prod`                    | Production dependency licenses were MIT, ISC, or BSD-3-Clause; the repository is AGPL-3.0-only with separate commercial terms available by agreement. |
| Targeted unsafe-pattern and stale-claim search | No application secrets, HTML injection, dynamic evaluation, placeholder status, analytics, or live-runtime claims remained in shipped code.           |

Real-browser verification used the production build in Chromium at `1440×900` and `390×844`. It confirmed:

- accurate initial scope and empty-state disclosure;
- native keyboard radio navigation with scenario state reflected in the URL;
- deterministic completion, cancellation, retry, and export enablement;
- a downloaded `samsarix-field-atlas/1` incident blueprint with eight steps, one human gate, and all runtime execution/remote-data flags set to false;
- same-origin network activity only: document, bundled JS, bundled CSS, and favicon, all returning 200;
- legible desktop and mobile composition, visible focus behavior, semantic headings/landmarks, and reduced-motion support.

The generated `1731×909` social preview and the product favicon were inspected in the built application. Temporary browser artifacts were removed after verification. No deployment was performed.

## Samsarix rebrand and licensing update

On July 28, 2026, the current product and company surfaces were renamed from Helix to Samsarix at the owner's request. Runtime identifiers, export filenames, the JSON schema namespace, metadata, tests, health output, documentation, support channels, favicon, and social preview were updated together. Historical Helix text remains isolated in `CONTEXT.md` and provenance notes.

The conflicting BSL/proprietary files were replaced with the canonical AGPL-3.0-only text, a clear separately negotiated commercial path, preserved authorship notices, and a standalone trademark policy. This is a repository implementation decision, not legal advice; rights paperwork and final counsel review remain company governance work.

## Blueprint conformance increment

On August 1, 2026, the product expanded from a one-way simulator/exporter into a provider-neutral blueprint workbench. Browser import, semantic readiness analysis, CI validation, a public JSON Schema, a complete incident fixture, and Markdown review-packet export now form one end-to-end workflow. The browser and CLI deliberately share the same validation code.

Local release evidence on Windows with Node `v24.12.0` and the declared pnpm `11.17.0` available through Corepack:

This is local verification only, not completion of the release milestone. Release status remains pending until an exact commit, artifact digest, consumer or deployment confirmation, and rollback path are recorded together.

| Command or check        | Result                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`             | Passed; a non-blocking freshness notice came from `baseline-browser-mapping`.                                             |
| `pnpm format:check`     | Passed across the repository.                                                                                             |
| `pnpm check`            | Passed strict TypeScript.                                                                                                 |
| `pnpm test:coverage`    | Passed all 25 tests; 81.97% statements, 73.96% branches, 88.65% functions, and 82.56% lines.                              |
| `pnpm validate:example` | Passed the eight-stage incident fixture in strict mode with zero errors, zero warnings, and four semantic checks.         |
| `pnpm build`            | Passed; client JS was 232.62 kB / 72.91 kB gzip, CSS was 24.10 kB / 5.56 kB gzip, server was 4.2 kB, and CLI was 17.6 kB. |
| `pnpm audit --prod`     | Passed with no known production vulnerabilities.                                                                          |

No deployment was performed. Publication remains an explicit owner action.

## A2A deployment-handoff increment

On August 1, 2026, Field Atlas added a concrete interoperability path from a validated provider-neutral blueprint to an owner-completed draft A2A 1.0 Agent Card. The browser and CLI share the same profile validator and mapping. A committed incident card makes drift visible in CI, while an exported Markdown checklist hands the remaining deployment, authentication, discovery, Inspector, and TCK work to the runtime owner.

The product does not infer deployment facts, accept credentials, probe an endpoint, publish a card, or claim protocol compatibility. Human approvals, policy gates, memory boundaries, and evidence requirements remain authoritative in the source blueprint rather than being hidden in nonstandard Agent Card fields.

Local release evidence on Windows with Node `v24.12.0` and pnpm `11.17.0`:

| Command or check            | Result                                                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm verify`               | Passed lint, formatting, strict types, 42 tests, coverage thresholds, both committed fixture checks, and every production build.                                   |
| Coverage                    | 83.23% statements, 77.26% branches, 83.94% functions, and 83.95% lines.                                                                                            |
| `pnpm validate:a2a-example` | Passed with four mapping/boundary checks; the generated incident card exactly matched the committed A2A fixture.                                                   |
| `pnpm build`                | Passed; client JS was 247.72 kB / 76.95 kB gzip, CSS was 27.62 kB / 6.15 kB gzip, server was 4.2 kB, blueprint CLI was 18,005 bytes, and A2A CLI was 31,405 bytes. |
| A2A CLI artifact            | `dist/atlas-a2a.js` SHA-256 was `bc280b909d664e186746554f6c272cd108076b194ba59d7791e5bc59dac6cc74`.                                                                |
| `pnpm audit --prod`         | Passed with no known production vulnerabilities.                                                                                                                   |

This remains local transformation and build evidence, not a live consumer or deployment record. No deployment was performed. A future release claim still requires an exact commit, published artifact, consumer-owned live endpoint, compatibility report, support owner, and rollback path.

## A2A acceptance-contract increment

On August 1, 2026, Field Atlas added a consumer-owned bridge from design and discovery declarations to repeatable implementation evaluation. A validated blueprint, its draft Agent Card, and an explicit acceptance-owner profile now produce a deterministic JSON manifest plus a Markdown execution checklist. The browser and CLI share the same semantic validator.

The manifest covers A2A discovery, version, media, authentication, authorization, validation, and retry behavior; owner-defined request, deadline, concurrency, retention, classification, and processor boundaries; every source human gate and evidence stage; and one required official TCK run. Its status is always `plan-not-run`. It adds no nonstandard fields to the Agent Card and is not an official A2A extension, runtime result, TCK report, deployment probe, or conformance claim.

Local release evidence on Windows with Node `v24.12.0` and pnpm `11.17.0`:

| Command or check                   | Result                                                                                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm verify`                      | Passed lint, formatting, strict types, 51 tests, coverage thresholds, all three committed fixture checks, and client/server/three-CLI production builds. |
| Coverage                           | 83.08% statements, 77.96% branches, 81.77% functions, and 83.94% lines.                                                                                  |
| `pnpm validate:acceptance-example` | Passed three truth/profile checks; the generated 22-case incident plan exactly matched the committed fixture in strict mode.                             |
| `pnpm build`                       | Passed; client JS was 278.06 kB / 84.72 kB gzip, CSS was 28.63 kB / 6.32 kB gzip, server was 4.2 kB, and acceptance CLI was 49,518 bytes.                |
| Acceptance CLI artifact            | `dist/atlas-acceptance.js` SHA-256 was `774d4c6e52ef45574968d5b0186143083da7258a7433067b3cded966b7e1dcbf`.                                               |
| `pnpm audit --prod`                | Passed with no known production vulnerabilities.                                                                                                         |
| React best-practices review        | Passed the applicable local-state, derived-state, component-boundary, controlled-input, accessibility, and rendering checklist.                          |

This is local plan-generation and build evidence only. No endpoint was contacted, no TCK or runtime test was run, no acceptance result was recorded, and no deployment was performed. Live implementation evidence, signoff, publication, and rollback remain runtime-owner responsibilities.

## A2A TCK evidence-receipt increment

On August 1, 2026, Field Atlas added a bounded intake path for the official A2A TCK `compatibility.json` report. The browser and CLI hash the exact report bytes, validate current report semantics, bind owner-asserted full revisions and a redacted run command, and emit the same deterministic `owner-review-required` receipt.

The receipt preserves the official summary but recomputes it from requirement statuses, separately counts failures, skips, and not-tested requirements, validates transport arithmetic, and maps only `a2a-official-tck` to evidence-attached. Raw errors, test IDs, and embedded Agent Card contents do not enter the receipt. Protocol conformance stays `not-determined`, the release decision stays `not-made`, and all non-TCK acceptance cases remain unresolved.

The committed `compatibility.json` is synthetic official-format input. It deliberately reports `100.0%` while one requirement is skipped and another is not tested, demonstrating why the percentage is not a completeness claim. It is not evidence that the example endpoint or any Samsarix service ran.

Local release evidence on Windows with Node `v24.12.0` and Corepack pnpm `11.17.0`:

| Command or check                          | Result                                                                                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `corepack pnpm install --frozen-lockfile` | Passed from the committed lockfile with pnpm 11.17.0.                                                                                                        |
| `corepack pnpm verify`                    | Passed lint, formatting, strict types, 65 tests, coverage thresholds, all four committed fixture checks, and client/server/four-CLI production builds.       |
| Coverage                                  | 83.08% statements, 78.56% branches, 84.21% functions, and 83.82% lines.                                                                                      |
| `pnpm validate:tck-evidence-example`      | Recomputed the synthetic report, surfaced its blank spec version plus one skipped and one not-tested requirement, and exactly matched the committed receipt. |
| `pnpm build`                              | Passed; client JS was 302.40 kB / 91.20 kB gzip, CSS was 29.93 kB / 6.55 kB gzip, server was 4.2 kB, and TCK evidence CLI was 35,129 bytes.                  |
| TCK evidence CLI artifact                 | `dist/atlas-tck-evidence.js` SHA-256 was `fc648627c0d73b2486423a03805bc30a0d82fcc93432064d185db6d8b672b8d0`.                                                 |
| Synthetic report fixture                  | Exact-byte SHA-256 was `efb0998b9bb08646f4013d1f01058a2fa66e5c2757d953539d83c27abf3417ab`, matching the receipt.                                             |
| `pnpm audit --prod`                       | Passed with no known production vulnerabilities.                                                                                                             |
| React best-practices review               | Passed the applicable component-boundary, local/derived-state, async race, controlled-input, accessibility, rendering, and bundle-scope checklist.           |

This is parser, fixture, test, and build evidence only. No endpoint was contacted, no TCK process was executed, no source-revision assertion was remotely verified, no conformance or release decision was made, and no deployment was performed. Genuine runtime evidence, owner signoff, publication, support, and rollback remain external gates.

## A2A acceptance-review ledger increment

Field Atlas now turns the acceptance plan, its TCK receipt, and one explicit disposition per planned case into a deterministic `samsarix-field-atlas/a2a-review-ledger/1` JSON artifact plus a Markdown packet. Browser and CLI share the validator. The workflow binds Field Atlas canonical JSON digests for both source artifacts, retains the exact TCK-report digest, constrains evidence references, validates chronology, computes readiness from the original blocking flags, requires rationale for rejections and waivers, and rejects an approval that contradicts blocking results.

The committed incident fixture is intentionally negative: 21 cases are synthetically accepted, the blocking authentication case is rejected, automated readiness is `blocked`, and the owner-asserted release decision is `rejected`. The official-TCK row references the exact synthetic report digest and preserves the report's skipped/not-tested warning. None of the synthetic URNs resolve to evidence, no runtime was exercised, and no identity or decision authority was authenticated.

Local release evidence on Windows with Node `v24.12.0` and Corepack pnpm `11.17.0`:

| Command or check               | Result                                                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `corepack pnpm verify`         | Passed lint, formatting, strict types, 81 tests, coverage thresholds, all five committed fixture checks, and client/server/five-CLI production builds.                         |
| Coverage                       | 81.55% statements, 79.92% branches, 82.89% functions, and 82.62% lines; `review.ts` reached 85.03% statements, 86.51% branches, and 100% functions.                            |
| `pnpm validate:review-example` | Bound all 22 planned cases, retained the synthetic TCK caveat, computed one blocking rejection, and exactly matched the committed rejected-decision ledger.                    |
| `pnpm build`                   | Passed; client JS was 335.56 kB / 98.75 kB gzip, CSS was 32.80 kB / 6.93 kB gzip, server was 4.2 kB, and review CLI was 36,213 bytes.                                          |
| Review CLI artifact            | `dist/atlas-review.js` SHA-256 was `e7c0a0ee01a57bdcb6ca7ed9b9ef27f7be1c5538bda3b20a46eeb510b7955599`.                                                                         |
| Review fixture artifacts       | Profile SHA-256 was `e4e28b2c7725e8d197fa1f4271c6e88b0e6a56c6e78a11a65153d8b4d0e986a2`; ledger SHA-256 was `d090ee5f14f698a1720969d800c68d6261e08e42115d88165e6149d81b6e3c9f`. |
| `corepack pnpm audit --prod`   | Passed with no known production vulnerabilities.                                                                                                                               |
| React best-practices review    | Passed applicable component-boundary, derived-state, controlled-input, async-race, stable-key, accessibility, rendering, and bundle-scope checks.                              |

This is local parser, assertion, fixture, test, and build evidence only. Canonical digests are integrity pointers, not signatures. A real release still requires evidence-body inspection, source and revision verification, authenticated reviewers, confirmed decision authority, an owner-controlled system of record, support commitment, and rollback. No deployment was performed.

## Blueprint SARIF reporting increment

Field Atlas now renders the existing blueprint conformance decision as standard SARIF 2.1.0 in both the browser and CLI. Errors become `error` / `fail` results, warnings remain `warning` / `review` results even when strict mode fails the command, passing checks remain counts rather than alert noise, and each result retains its JSONPath plus a stable SHA-256 fingerprint. The source argument is URI-encoded, while physical locations conservatively remain line 1 because the semantic validator does not retain JSON token offsets.

This closes a CI-interchange gap without adding a hosted control plane. The [A2A roadmap](https://a2a-protocol.org/latest/roadmap/) calls validation tooling critical as adoption grows. GitHub documents [SARIF 2.1.0 ingestion for third-party tools](https://docs.github.com/en/code-security/concepts/code-scanning/sarif-files), but Field Atlas neither requests `security-events: write` nor uploads a report. Repository owners retain the choice to store an ordinary artifact or opt into a compatible analysis surface.

Local release evidence on Windows with Node `v24.12.0` and Corepack pnpm `11.17.0`:

| Command or check                  | Result                                                                                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `corepack pnpm verify`            | Passed lint, formatting, strict types, 86 tests, coverage thresholds, six committed fixture checks, and client/server/five-CLI production builds.        |
| `corepack pnpm run test:coverage` | Passed 10 files / 86 tests and all coverage thresholds.                                                                                                  |
| Coverage                          | 81.87% statements, 79.88% branches, 83.61% functions, and 83.03% lines; `sarif.ts` reached 97.14% statements, 81.81% branches, and 100% functions/lines. |
| Published SARIF schema validation | The 1,001-byte committed fixture validated against `https://json.schemastore.org/sarif-2.1.0.json`.                                                      |
| `pnpm validate:sarif-example`     | Exactly matched the strict-ready incident report; invalid `--json --sarif` usage exited `2`.                                                             |
| `pnpm build`                      | Passed; client JS was 338.45 kB / 99.83 kB gzip, CSS was 32.89 kB / 6.95 kB gzip, server was 4.2 kB, and the validator CLI was 25,593 bytes.             |
| Validator CLI artifact            | `dist/atlas-validate.js` SHA-256 was `ca213cf6208049ba8702f9f804ad2cfa2e725562081412cedd9bd5f2dc8289af`.                                                 |
| Committed SARIF fixture           | `examples/incident.blueprint.sarif.json` SHA-256 was `fb37e8ebc88462f20cc36a833d45703aed7480606fed43f3cb1c573a0c11715c`.                                 |
| `corepack pnpm audit --prod`      | Passed with no known production vulnerabilities and no new runtime dependency.                                                                           |

This is formatter, fixture, test, and build evidence—not proof that any external SARIF consumer accepted an upload. The report describes blueprint structure and governance findings, not source-code vulnerabilities, runtime behavior, evidence truth, or authenticated approval. No upload permission, code-scanning configuration, deployment, or external write was added.

## Scenario Studio increment

Field Atlas now supports user-owned scenarios without requiring hand-edited JSON or a hosted dataset service. Scenario Studio clones a bundled route, exposes the scenario contract, success criteria, ordered handoffs, boundaries, evidence declarations, and illustrative indicators, and keeps every draft in browser memory. It derives active role declarations, contiguous stage order, exact human-approval positions, and the reference product's no-runtime claims before using the shared semantic validator.

Current evaluation-product workflows support this authoring need: LangSmith exposes from-scratch and inline dataset examples with optional schema validation, Braintrust treats editable/importable versioned test cases as the input to repeatable evaluations, and Promptfoo makes portable scenario variables and expectations first-class test data. Field Atlas retains a smaller wedge: one account-free provider-neutral coordination contract, with no production trace capture, model generation, cloud persistence, or runtime execution.

The editor preserves a dirty draft when the Field Lab selection changes, requires a deliberate second click before replacing the entire draft, and sends an immutable validated snapshot into the existing workbench/A2A chain. Stable draft-only row identifiers preserve keyboard focus when criteria or stages are reordered. Blueprint imports also now use fatal UTF-8 decoding, aligning browser behavior with the documented trust boundary.

Local evidence on Windows with Node `v24.12.0` and Corepack pnpm `11.17.0`:

| Command or check             | Result                                                                                                                                                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `corepack pnpm run verify`   | Passed lint, formatting, strict types, 12 test files / 93 tests, coverage thresholds, all six fixture checks, and client/server/five-CLI production builds.                                                 |
| Coverage                     | 81.93% statements, 80.06% branches, 81.27% functions, and 83.57% lines; `scenario-editor.ts` reached 95.65% statements, 90% branches, and 100% functions/lines.                                             |
| Focused editor/browser tests | Passed six model and browser tests plus the existing app suite, including live per-field validation, immutable handoff, identical-content state retention, draft preservation, export, and UTF-8 rejection. |
| Production build             | Client JS was 352.37 kB / 103.05 kB gzip, CSS was 41.10 kB / 8.18 kB gzip, server was 4.2 kB, and all five CLI artifacts built successfully.                                                                |
| Client artifact digests      | JS SHA-256 was `5e8c4374c56d33c7e82c905b043ab91d33b94649ede2c03f33c9cb6af09ef042`; CSS SHA-256 was `10b6d6a114af02e4275d042ec54c75c0c7c3f602260562e1427b292a19398eed`.                                      |
| `corepack pnpm audit --prod` | Passed with no known production vulnerabilities and no new runtime dependency.                                                                                                                              |
| React best-practices review  | Passed applicable component-boundary, derived-state, functional-update, controlled-input, stable-key, accessibility, long-list rendering, and bundle-scope checks.                                          |

This is local authoring, validation, test, and build evidence. It does not establish evaluator adoption, hosted availability, collaborative persistence, custom-role migration, or the truth of any authored evidence or approval. No deployment, account system, database, analytics, model call, or external write was added.

## Blueprint suite increment

Field Atlas now turns repeated contract review into a portable, repository-owned workflow. A `samsarix-field-atlas/suite/1` manifest groups up to 64 relative blueprint files under one committed strict policy. The CLI resolves each target inside the manifest directory, rejects traversal and canonical-path escapes, applies the shared semantic validator, binds exact imported bytes with SHA-256, and emits a timestamp-free `samsarix-field-atlas/suite-report/1` artifact. The workbench offers the same report model for ad hoc batches of up to 16 local files.

This direction follows the collection pattern in current evaluation products without importing their hosted-runtime scope: [LangSmith datasets](https://docs.langchain.com/langsmith/manage-datasets) are versioned and support filtered/split evaluation views, [Braintrust datasets](https://www.braintrust.dev/docs/guides/datasets) version every mutation, and [Promptfoo test cases](https://www.promptfoo.dev/docs/configuration/test-cases/) can be organized in portable external files. Field Atlas remains a pre-runtime conformance surface: it does not invoke a target, score output quality, store a dataset, or claim that a test ran.

Local evidence on Windows with Node `v24.12.0` and Corepack pnpm `11.17.0`:

| Command or check            | Result                                                                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Static gates                | `pnpm lint`, `pnpm format:check`, and `pnpm check` passed. The only lint output was an informational stale-data notice from `baseline-browser-mapping`.                                                |
| `pnpm run test:coverage`    | Passed 14 test files / 103 tests and all thresholds: 81.4% statements, 79.53% branches, 82.08% functions, and 82.95% lines. `suite.ts` reached 84.15% statements, 82.35% branches, and 100% functions. |
| Seven fixture gates         | Blueprint, SARIF, suite, A2A card, acceptance plan, TCK receipt, and review ledger checks all passed. The strict suite exactly matched three ready cases with 14 total manifest/case pass findings.    |
| `pnpm build`                | Passed; client JS was 359.71 kB / 104.97 kB gzip, CSS was 43.62 kB / 8.60 kB gzip, server was 4.2 kB, and all six dependency-free CLI artifacts built.                                                 |
| Suite CLI artifact          | `dist/atlas-suite.js` was 32,242 bytes; SHA-256 was `b832ee2323cb79cd521e00ef7b574ccccadbb5bea03e7d10908a47177ab5b30b`.                                                                                |
| Committed suite artifacts   | Manifest SHA-256 was `49d2649b86ae6d067d24e6aaa95bba98914e735288423e17cf743a99cff9d089`; report SHA-256 was `52994c82ddadbde841ebf5abfd7ef6b1a057dfea67186b26d7827fd680728f87`.                        |
| `pnpm audit --prod`         | Passed with no known production vulnerabilities and no new dependency.                                                                                                                                 |
| React best-practices review | Passed applicable event-driven async, derived-state, stable-key, accessible control/table, disabled-pending-state, rendering, and bundle-scope checks.                                                 |

The local `pnpm verify` wrapper was decomposed into its exact constituent commands after a 10-minute wrapper timeout caused by unrelated concurrent host test jobs; every constituent gate passed. This is local structure, fixture, integrity, test, and build evidence—not runtime evaluation evidence. Digests are not signatures, unreadable inputs do not receive invented hashes, and strict promotion remains distinct from underlying structural status. No deployment, upload permission, hosted storage, account system, agent execution, model call, or external write was added.

## Suite baseline comparison increment

Field Atlas now compares a known `suite-report/1` baseline with a candidate report as a deterministic `samsarix-field-atlas/suite-diff/1` artifact. Both inputs are validated as bounded, internally consistent reports and bound by exact-byte SHA-256. Stable case IDs align independent of report ordering; tag order is treated as non-semantic. The result classifies additions, removals, modifications, unchanged cases, regressions, improvements, mixed signals, and review-only drift. Removed coverage, worse effective status, and increased error/warning findings fail the default gate. An optional any-change policy also blocks otherwise non-regressing drift.

This addresses a current evaluation workflow without importing hosted experiment scope: [LangSmith comparison](https://docs.langchain.com/langsmith/compare-experiment-results) highlights per-example regressions and improvements against a source experiment; [Braintrust comparison](https://www.braintrust.dev/docs/evaluate/compare-experiments) supports persistent baselines and CI regression failure; and [Promptfoo outputs](https://www.promptfoo.dev/docs/configuration/outputs/) provide portable JSON and JUnit artifacts for downstream analysis. Field Atlas applies the pattern only to pre-runtime coordination-contract conformance reports. It does not run a model, score output quality, validate the original blueprint bytes again, authenticate a reviewer, or approve a release.

The committed example compares the core suite with a candidate manifest that adds one `release-critical` tag. It is intentionally classified as one review-only modification with two unchanged cases: the default regression gate passes, while `--fail-on-change` fails. A browser reviewer can import the same two reports, switch policies, inspect the aligned table, and export the deterministic comparison without uploading either source.

Local evidence on Windows with Node `v24.12.0` and pnpm `11.17.0`:

| Command or check            | Result                                                                                                                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Static gates                | `pnpm lint`, `pnpm format:check`, and `pnpm check` passed; lint emitted only the informational `baseline-browser-mapping` stale-data notice.                                                                                                                                   |
| `pnpm run test:coverage`    | Passed 15 test files / 117 tests and all thresholds: 82.13% statements, 80.18% branches, 84.23% functions, and 83.55% lines. The new `suite-diff.ts` reached 88.82% statements, 87.09% branches, 100% functions, and 89.42% lines.                                             |
| Suite-diff fixture gate     | Reproduced the candidate suite report, then exactly matched three aligned cases: one review-only tag modification, two unchanged, no regression, and a passing default gate.                                                                                                   |
| `pnpm build`                | Passed; client JS was 382.75 kB / 110.69 kB gzip, CSS was 44.96 kB / 8.81 kB gzip, server was 4.2 kB, and all seven dependency-free CLI artifacts built.                                                                                                                       |
| Suite-diff CLI artifact     | `dist/atlas-suite-diff.js` was 36,772 bytes; SHA-256 was `4e27e83c477d01ada77b25220677aaeb60fbc3d228b0702c7a04b7aa0f629c77`.                                                                                                                                                   |
| Committed diff artifacts    | Candidate manifest SHA-256 was `1475d087adb86087692ddeed3a21aaa35ede7f8880170ec7de3f5f0ae20b4690`; candidate report was `3a8f7be1558ea8f5ef215f5f841e1ad49fd3d41f37cc4dfc7c1fe1061ef1786e`; suite diff was `552a765d0b583794a2e846405d8f280e71a78739e2c868b6af58f1767aa9c6e7`. |
| `pnpm audit --prod`         | Passed with no known production vulnerabilities and no new dependency.                                                                                                                                                                                                         |
| React best-practices review | Passed applicable event-driven async, effect avoidance, direct imports, stable keys, accessible labels/table captions, disabled pending states, long-table rendering containment, and bundle-scope checks.                                                                     |

This evidence covers local parsing, consistency validation, deterministic comparison, fixture reproduction, browser interaction, and build integrity. It is not runtime evaluation, deployment, adoption, authenticated review, signature verification, or release approval evidence.

## Suite CI reporting increment

Field Atlas now projects one validated `suite-diff/1` artifact into two additional deterministic views. The compact JUnit XML view gives existing CI report consumers one stable testcase per contract plus one synthetic suite-level testcase; failures follow the selected regression or any-change policy. The escaped Markdown view gives reviewers the source digests, gate, aggregate signals, aligned case table, and proof boundary without requiring them to inspect raw JSON. The original JSON remains the complete machine-readable comparison artifact.

The command-line interface accepts `--format json|junit|markdown`, writes the selected view to standard output, preserves the comparison gate as its process exit code, and exact-checks committed text fixtures for JUnit and Markdown. The browser adds a local Markdown-summary download beside the JSON export. Imported values are normalized and escaped for their XML or Markdown context; no upload permission, hosted service, test runner, timestamp, invented duration, runtime execution, or release-approval claim was added.

This solves a current integration job using official platform contracts: [GitHub Actions job summaries](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands#adding-a-job-summary) render Markdown written to `GITHUB_STEP_SUMMARY`; [GitLab unit test reports](https://docs.gitlab.com/ci/testing/unit_test_reports/) ingest a JUnit subset but explicitly leave job status to the script exit code; and [Promptfoo JUnit output](https://www.promptfoo.dev/docs/configuration/outputs/#junit-xml-format) demonstrates the same compact CI-viewer pattern for evaluation results. Field Atlas applies that pattern only to pre-runtime coordination-contract comparisons. Its own Ubuntu CI job now dogfoods the Markdown projection in the workflow summary without adding write permissions or an artifact-upload action.

Local evidence on Windows with Node `v24.12.0` and pnpm `11.17.0` on August 8, 2026:

| Command or check              | Result                                                                                                                                                                                                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static gates                  | `pnpm lint`, `pnpm format:check`, `pnpm check`, and `git diff --check` passed. Lint emitted only the informational `baseline-browser-mapping` stale-data notice.                                                                                                                          |
| `pnpm run test:coverage`      | Passed 16 test files / 121 tests and all thresholds: 82.34% statements, 79.97% branches, 84.71% functions, and 83.78% lines. `suite-diff-reporting.ts` reached 92.72% statements, 72.22% branches, 100% functions, and 94% lines.                                                         |
| Suite-diff fixture gate       | Reproduced the candidate suite report and exactly matched the JSON, JUnit XML, and Markdown outputs for three aligned cases with a passing regression gate.                                                                                                                               |
| `pnpm build`                  | Passed; client JS was 385.10 kB / 111.24 kB gzip, CSS was 44.96 kB / 8.81 kB gzip, server was 4.2 kB, and all seven dependency-free CLI artifacts built.                                                                                                                                  |
| Suite-diff CLI artifact       | `dist/atlas-suite-diff.js` was 45,790 bytes; SHA-256 was `93cf9d595c4f922183793ffa61aa9de48d77189c3d68041296a431cf6ff049fd`.                                                                                                                                                              |
| Committed reporting artifacts | JSON was 7,512 bytes / `552a765d0b583794a2e846405d8f280e71a78739e2c868b6af58f1767aa9c6e7`; JUnit XML was 2,178 bytes / `f9cb27bba5d61a5b75813bff8e7bfd4bb11603ffc3bd4a7cd194a65ab0ea2070`; Markdown was 1,446 bytes / `6a08917cd5ddb964391e53dfb3bdd797177d326f1fb2b32cb42f90ab23d271d5`. |
| `pnpm audit --prod`           | Passed with no known production vulnerabilities and no new dependency.                                                                                                                                                                                                                    |
| React best-practices review   | Passed applicable event-driven behavior, effect avoidance, shared-renderer reuse, accessible buttons, disabled pending states, local-only download handling, and bundle-scope checks.                                                                                                     |

The first full local coverage attempt under severe host contention reached 120 of 121 passing tests before a pre-existing review-ledger test exhausted Testing Library's one-second wait for asynchronous canonical digests. Both digest waits were raised to 15 seconds, the affected file then passed 3 of 3 tests, and the complete coverage run passed 121 of 121. This is structure, serialization, fixture, UI-interaction, and build evidence—not proof that a contract, agent, model, endpoint, or release process executed.

## Declared suite change increment

Field Atlas now closes the control gap between detecting contract drift and documenting that drift as intentional. A repository-owned `samsarix-field-atlas/suite-change-plan/1` binds one exact baseline report and stable suite identity, declares every expected case change and suite-level signal, requires explicit acknowledgement for regression or mixed impact, carries a bounded owner assertion and credential-free reference, and expires on a date. There are no wildcard cases, wildcard dimensions, open-ended exceptions, or implicit wall-clock reads.

The shared evaluator verifies that the parsed plan matches its exact imported bytes, recomputes the suite comparison from validated baseline and candidate reports, and emits deterministic `suite-change-review/1` JSON plus escaped Markdown. It fails on wrong suite/baseline bindings, expired intent, missing declarations, unexpected drift, change/impact/dimension mismatch, acknowledgement mismatch, or suite-level signal mismatch. The original comparison outcome and gate remain visible beside the separate declared-intent gate. A passing intent gate means only that actual drift equals the declaration; it does not authenticate the owner, authorize an override, or approve a release.

This is an evidence-backed portable control rather than a hosted approval system. [Buf breaking checks](https://buf.build/docs/breaking/) and [BSR review](https://buf.build/docs/bsr/checks/breaking/) combine baseline comparison with explicit owner review; [Pact pending/WIP contracts](https://docs.pact.io/pact_broker/advanced_topics/pending_pacts) distinguish new expectations and bound work-in-progress selection by time; [HCP Terraform policy enforcement](https://developer.hashicorp.com/terraform/enterprise/workspaces/policy-enforcement) separates advisory, mandatory, and permissioned override behavior; and [GitHub rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets) keep actual bypass and review authority attached to authenticated repository controls. Field Atlas implements only exact declaration, expiry, binding, and mismatch evidence.

The browser imports all three files locally, requires a visible review date, shows both gates and exact dispositions, ignores stale async results, and exports JSON/Markdown without persistence or upload. The CLI requires `--plan` and `--as-of`, supports JSON or Markdown plus exact fixture checks, and uses exit code `0` for a matching current plan, `1` for a failed intent gate/invalid input/mismatch, and `2` for usage errors. Ubuntu CI publishes the deterministic fixture summary to the existing job summary without adding write permissions or artifact upload.

Local evidence on Windows with Node `v24.12.0` and pnpm `11.16.0` on August 10, 2026:

| Command or check             | Result                                                                                                                                                                                                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm verify`                | Passed lint, formatting, strict types, 17 test files / 131 tests, all blueprint/SARIF/suite/diff/change/A2A fixture gates, and client/server/eight-CLI production builds. Lint emitted only the informational `baseline-browser-mapping` freshness notice.                                  |
| Coverage                     | Passed all thresholds at 82.76% statements, 80.21% branches, 85.76% functions, and 84.28% lines. `suite-change.ts` reached 95.73% statements, 94.44% branches, 100% functions, and 97.46% lines.                                                                                            |
| Declared-change fixture gate | Exactly reproduced the matching JSON and Markdown reviews for one declared tag change and one declared manifest signal, with exact suite/baseline binding and a passing intent gate.                                                                                                        |
| CLI exit probe               | Matching fixture exited `0`; the same plan after expiry exited `1`; omitted `--as-of` usage exited `2`.                                                                                                                                                                                     |
| `pnpm build`                 | Passed; client JS was 406.19 kB / 116.72 kB gzip, CSS was 46.74 kB / 9.07 kB gzip, server was 4.2 kB, and all eight dependency-free CLI artifacts built.                                                                                                                                    |
| Declared-change CLI artifact | `dist/atlas-suite-change.js` was 62,501 bytes; SHA-256 was `c5068631fe3744829b61df8bb5902b4e0f27283d590f5bc0144a099dd2b036e3`.                                                                                                                                                              |
| Committed change artifacts   | Plan was 1,125 bytes / `a988a71fcf60ce7a830fcb64a26dca0775c9662b41f34648dc5cb3f0f1898dac`; review JSON was 2,887 bytes / `4cfb0ebfa48f12862d0bc7d6ee0128ff27d3a3d5c64a434e187dd2a6053148de`; Markdown was 1,878 bytes / `5c00513179589dd5a17cb02969f70076b0dea0035e77db2cdbe32cc4e709fc0e`. |
| `pnpm audit --prod`          | Passed with no known production vulnerabilities and no new dependency.                                                                                                                                                                                                                      |
| React best-practices review  | Passed applicable event-driven async work, stale-result generation guards, cross-operation busy ownership, direct imports, stable keys, accessible labels/captions, local-only downloads, responsive overflow, and bundle-scope checks.                                                     |

This evidence proves bounded local parsing, exact-byte integrity, deterministic matching, fixture reproduction, browser interaction, CLI gate behavior, and build integrity. It is not evidence of authenticated intent, a real exception decision, runtime execution, deployment, adoption, or release approval. No account system, database, hosted broker, model call, network probe, upload permission, or manual deployment was added.
