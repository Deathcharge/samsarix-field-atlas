# Productization record

Last updated: August 1, 2026

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

The user selects a realistic scenario, reviews its objective and acceptance criteria, runs a deterministic role-by-role trace, inspects the exact human/policy/tool/memory boundaries, and exports an implementation-neutral JSON blueprint. The user can then import that contract, receive a semantic readiness decision, enforce it in CI, prepare an A2A deployment and acceptance handoff, bind an externally generated official TCK report to an owner-review receipt, and record one explicit disposition per planned case in an owner-asserted review ledger.

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

- [ ] Add user-authored scenarios through a schema-validated local editor.
- [x] Add import/conformance checks for `samsarix-field-atlas/1` blueprints.
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
- Added a shared semantic validator, strict/JSON CLI modes, versioned JSON Schema, and a complete incident fixture enforced by `pnpm verify`.
- Added a shared A2A 1.0 handoff validator, browser profile, draft Agent Card/checklist exports, deterministic CLI mapping, and committed incident card fixture.
- Added a shared A2A implementation acceptance validator, browser owner profile, JSON/Markdown plan exports, public schema, deterministic CLI, and committed incident fixtures.
- Added a shared A2A TCK evidence validator, bounded browser import, exact-byte SHA-256, owner-asserted provenance profile, public receipt schema, deterministic CLI, and synthetic omission-focused incident fixtures.
- Added a shared A2A acceptance review validator, per-case browser workflow, canonical source binding, credential-free evidence references, JSON/Markdown exports, public schema, deterministic CLI, and a complete synthetic blocked-decision fixture.
- Removed misleading status, deployment, authentication, analytics, and integration claims.
- Replaced the generated UI kit with purpose-built semantic React and CSS.
- Added the optional hardened release server and meaningful automated tests.
- Added CI, security guidance, contribution guidance, and accurate user documentation.

## Deferred work and rationale

- User-authored scenarios remain deferred until real evaluator demand justifies the additional editing and migration surface.
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
| `corepack pnpm verify`         | Passed lint, formatting, strict types, 80 tests, coverage thresholds, all five committed fixture checks, and client/server/five-CLI production builds.                         |
| Coverage                       | 81.58% statements, 79.71% branches, 82.84% functions, and 82.71% lines; `review.ts` reached 84.92% statements, 85.82% branches, and 100% functions.                            |
| `pnpm validate:review-example` | Bound all 22 planned cases, retained the synthetic TCK caveat, computed one blocking rejection, and exactly matched the committed rejected-decision ledger.                    |
| `pnpm build`                   | Passed; client JS was 335.54 kB / 98.72 kB gzip, CSS was 32.80 kB / 6.93 kB gzip, server was 4.2 kB, and review CLI was 36,131 bytes.                                          |
| Review CLI artifact            | `dist/atlas-review.js` SHA-256 was `d4ac03991aaa84ea8bb60afd4e26e081238571cb274f621542aa6ea22c5be159`.                                                                         |
| Review fixture artifacts       | Profile SHA-256 was `e4e28b2c7725e8d197fa1f4271c6e88b0e6a56c6e78a11a65153d8b4d0e986a2`; ledger SHA-256 was `d090ee5f14f698a1720969d800c68d6261e08e42115d88165e6149d81b6e3c9f`. |
| `corepack pnpm audit --prod`   | Passed with no known production vulnerabilities.                                                                                                                               |
| React best-practices review    | Passed applicable component-boundary, derived-state, controlled-input, async-race, stable-key, accessibility, rendering, and bundle-scope checks.                              |

This is local parser, assertion, fixture, test, and build evidence only. Canonical digests are integrity pointers, not signatures. A real release still requires evidence-body inspection, source and revision verification, authenticated reviewers, confirmed decision authority, an owner-controlled system of record, support commitment, and rollback. No deployment was performed.
