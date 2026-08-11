# Blueprint suites

## Purpose

A `samsarix-field-atlas/suite/1` manifest turns a set of blueprint files into one repeatable local conformance job. It is useful for pull-request gates, release fixture packs, implementation handoffs, and design reviews that need to answer “do all of these contracts still satisfy the same policy?” without adopting a hosted evaluation service.

Evaluation platforms increasingly make reusable collections and baseline comparison first-class workflows: LangSmith versions datasets and highlights experiment regressions and improvements, Braintrust aligns cases against persistent baselines for local or CI comparison, and Promptfoo exports portable results for analysis and CI viewers. Field Atlas implements the smaller pre-runtime counterpart: it checks coordination-contract structure as a batch and compares two bounded conformance reports, but does not execute an evaluation target.

Primary workflow references:

- [LangSmith dataset management](https://docs.langchain.com/langsmith/manage-datasets)
- [LangSmith experiment comparison](https://docs.langchain.com/langsmith/compare-experiment-results)
- [Braintrust experiment comparison and CI baselines](https://www.braintrust.dev/docs/evaluate/compare-experiments)
- [Promptfoo result exports](https://www.promptfoo.dev/docs/configuration/outputs/)

## Manifest

The complete public shape is [`schema/blueprint-suite.schema.json`](../schema/blueprint-suite.schema.json). The strict-ready [`examples/core.suite.json`](../examples/core.suite.json) covers all three bundled Field Atlas scenarios.

```json
{
  "schemaVersion": "samsarix-field-atlas/suite/1",
  "mode": "contract-conformance-suite",
  "suite": {
    "id": "core-reference-scenarios",
    "title": "Core reference scenarios",
    "description": "Strict conformance coverage for the built-in scenarios."
  },
  "strict": true,
  "entries": [
    {
      "id": "incident",
      "path": "incident.blueprint.json",
      "tags": ["operations", "high-risk"]
    }
  ]
}
```

Entry paths are resolved relative to the manifest directory. Version 1 accepts 1–64 unique entries, forward-slash relative `.json` paths, and up to 16 unique tags per entry. Absolute paths, URLs, Windows drive syntax, backslashes, `.` / `..` traversal segments, duplicate paths, and targets whose canonical path escapes through a symlink are rejected. Each manifest and blueprint file is limited to 1 MiB.

## CLI and CI

```bash
pnpm blueprint:suite examples/core.suite.json
pnpm blueprint:suite examples/core.suite.json --strict
pnpm blueprint:suite examples/core.suite.json \
  --check examples/core.suite-report.json
```

The manifest’s `strict` value is the committed policy; `--strict` can tighten a non-strict manifest but cannot loosen a strict one. In strict mode, a structurally valid blueprint or manifest with warnings becomes invalid. `--check` deep-compares the deterministic result against a committed report and fails on drift.

Exit codes are `0` for an effective ready/review result, `1` for invalid input, a blocking strict result, unreadable entries, or fixture mismatch, and `2` for CLI usage errors.

## Report integrity

The complete report shape is [`schema/blueprint-suite-report.schema.json`](../schema/blueprint-suite-report.schema.json). Each readable file and the source manifest are bound by the SHA-256 of their exact imported bytes. The report preserves both `validationStatus` and the effective `status`, so strict warning promotion is visible instead of being rewritten as a structural error. Unreadable or oversized entries remain explicit invalid cases with a `null` digest rather than receiving an invented binding.

Reports omit timestamps, environment details, machine paths, and network state so the same bytes and command produce the same artifact across supported operating systems. Tags are carried through for downstream filtering, but Field Atlas does not assign meaning to them.

## Browser review

The workbench can review up to 16 selected blueprints in one pass, toggle strict warning policy, display case-level status/counts/digest prefixes, and export the same suite-report format. Browser batches are ad hoc and therefore set `source.manifest` to `null`; committed CI jobs should use a manifest.

## Baseline comparison

Use `samsarix-field-atlas/suite-diff/1` to compare a known baseline report with a candidate report before merging or releasing a coordination-contract change:

```bash
pnpm blueprint:suite-diff \
  examples/core.suite-report.json \
  examples/core-candidate.suite-report.json

pnpm blueprint:suite-diff \
  examples/core.suite-report.json \
  examples/core-candidate.suite-report.json \
  --check examples/core.suite-diff.json

pnpm blueprint:suite-diff \
  examples/core.suite-report.json \
  examples/core-candidate.suite-report.json \
  --fail-on-change

pnpm blueprint:suite-diff \
  examples/core.suite-report.json \
  examples/core-candidate.suite-report.json \
  --format junit > suite-diff.junit.xml

pnpm blueprint:suite-diff \
  examples/core.suite-report.json \
  examples/core-candidate.suite-report.json \
  --format markdown > suite-diff.md
```

Both inputs must be internally consistent `suite-report/1` artifacts with the same `suite.id`. Each is limited to 8 MiB. The comparator rejects malformed digests, unexpected fields, duplicate case IDs, inconsistent case/finding totals, fabricated summary status, and effective statuses that do not follow the report's strict policy. It hashes the exact imported report bytes, aligns cases by stable case ID, sorts the union deterministically, and treats tag order as non-semantic.

The complete output contract is [`schema/blueprint-suite-diff.schema.json`](../schema/blueprint-suite-diff.schema.json). It records source digests, suite and policy changes, report-level status impact, aggregate counts, and compact baseline/candidate snapshots for every case.

| Candidate change                                                            | Impact        | Default regression gate |
| --------------------------------------------------------------------------- | ------------- | ----------------------- |
| A baseline case is removed                                                  | Regression    | Fail                    |
| A case or report moves to a worse effective conformance status              | Regression    | Fail                    |
| Error or warning findings increase, even inside the same effective status   | Regression    | Fail                    |
| A new invalid case appears                                                  | Regression    | Fail                    |
| A case or report improves and no regression dimension is present            | Improvement   | Pass                    |
| Ready/review coverage is added, or content, tags, metadata, or policy drift | Owner review  | Pass                    |
| The same stable cases and interpreted fields remain                         | No difference | Pass                    |

When a modified case contains both improving and regressing signals, its impact is `mixed` and the regression gate fails. `--fail-on-change` tightens the policy so additions, improvements, and review-only drift also fail; it never loosens regression handling.

`--format` accepts `json` (the default complete artifact), `junit` (a compact CI test-report projection), or `markdown` (a readable summary). All three outputs are deterministic and timestamp-free. JSON `--check` uses structural deep comparison; JUnit and Markdown `--check` require an exact UTF-8 text match. The committed fixtures are [`core.suite-diff.json`](../examples/core.suite-diff.json), [`core.suite-diff.junit.xml`](../examples/core.suite-diff.junit.xml), and [`core.suite-diff.md`](../examples/core.suite-diff.md).

The JUnit projection contains one testcase for each stable case ID and one synthetic `suite-level` testcase for report, metadata, policy, and manifest signals. A testcase fails only when that signal violates the selected `regression` or `change` policy. It deliberately omits timestamps and execution durations because Field Atlas did not execute these contracts. The JSON artifact remains the source for complete snapshots and comparison counts.

### CI integration

GitHub Actions displays Markdown appended to the per-step `GITHUB_STEP_SUMMARY` file on the workflow summary page. A Bash step can preserve the CLI gate and publish its readable result with:

```bash
pnpm blueprint:suite-diff baseline.report.json candidate.report.json \
  --format markdown >> "$GITHUB_STEP_SUMMARY"
```

The PowerShell equivalent is:

```powershell
pnpm blueprint:suite-diff baseline.report.json candidate.report.json `
  --format markdown >> $env:GITHUB_STEP_SUMMARY
```

GitLab can ingest the compact projection as a unit-test report while retaining the command's non-zero gate result:

```yaml
script:
  - pnpm blueprint:suite-diff baseline.report.json candidate.report.json --format junit > suite-diff.junit.xml
artifacts:
  when: always
  reports:
    junit: suite-diff.junit.xml
```

This follows [GitHub's job-summary environment-file contract](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands#adding-a-job-summary) and [GitLab's JUnit report contract](https://docs.gitlab.com/ci/testing/unit_test_reports/). GitLab explicitly separates uploaded test reports from job status, so the CLI's exit code remains authoritative. Promptfoo similarly uses compact [JUnit output for existing CI report viewers](https://www.promptfoo.dev/docs/configuration/outputs/#junit-xml-format). Treat generated XML and Markdown as untrusted text when another system stores or renders them.

The diff CLI exits `0` when its selected gate passes, `1` for a failed gate, invalid input, mismatched suite identity, or fixture mismatch, and `2` for usage errors. Producing or uploading a JUnit report does not override that result. The browser workbench exposes the same two gate policies, comparison table, and local JSON/Markdown exports without uploading either report.

## Declared change plans

A comparison answers “what changed?” but cannot distinguish planned drift from a surprise. `samsarix-field-atlas/suite-change-plan/1` adds a bounded repository-owned intent artifact without turning Field Atlas into an identity, approval, or policy-administration service.

The design follows a recurring control pattern in current contract and infrastructure tooling:

- [Buf breaking-change detection](https://buf.build/docs/breaking/) compares a current schema against a prior input, while [Buf configuration](https://buf.build/docs/configuration/v2/buf-yaml/) supports scoped rules and explicit ignores but warns against broad exclusions.
- [Buf Schema Registry breaking-change review](https://buf.build/docs/bsr/checks/breaking/) sends noncompliant changes through an owner review flow instead of silently treating them as compatible.
- [Pact pending pacts](https://docs.pact.io/pact_broker/advanced_topics/pending_pacts) and [work-in-progress pacts](https://docs.pact.io/pact_broker/advanced_topics/wip_pacts) distinguish new expectations from previously supported contracts and bound WIP selection by time.
- [HCP Terraform policy enforcement](https://developer.hashicorp.com/terraform/enterprise/workspaces/policy-enforcement) separates advisory, mandatory, and permissioned override behavior.
- [GitHub repository rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets) make active rules visible, while [required review rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) keep authorization in authenticated repository controls.

Field Atlas implements only the portable local portion: exact declarations, integrity bindings, expiry, and deterministic mismatch evidence. It does not copy a hosted broker's dynamic pending state or claim the permission model of a repository or policy service.

### Plan contract

The complete public shape is [`schema/blueprint-suite-change-plan.schema.json`](../schema/blueprint-suite-change-plan.schema.json). The committed [`examples/core.suite-change-plan.json`](../examples/core.suite-change-plan.json) declares the example candidate's tag and manifest changes:

```json
{
  "schemaVersion": "samsarix-field-atlas/suite-change-plan/1",
  "mode": "declared-contract-change",
  "suiteId": "core-reference-scenarios",
  "baselineSha256": "52994c82ddadbde841ebf5abfd7ef6b1a057dfea67186b26d7827fd680728f87",
  "owner": "Samsarix Platform Contracts",
  "reference": "urn:samsarix:field-atlas:example:tag-rollout",
  "expiresOn": "2026-09-01",
  "rationale": "Exercise the bounded change-intent workflow with one planned tag addition and the resulting manifest binding change.",
  "expectations": [
    {
      "caseId": "incident",
      "change": "modified",
      "impact": "review",
      "dimensions": ["tags"],
      "regressionAcknowledged": false,
      "rationale": "Mark the incident scenario as release-critical without changing its executable or conformance claims."
    }
  ],
  "suite": {
    "reportImpact": "none",
    "suiteMetadataChanged": false,
    "policyChanged": false,
    "manifestChanged": true
  },
  "proofBoundary": "This repository-owned example records declared intent only. Its owner and reference are assertions, not authenticated approval or permission to release."
}
```

Version 1 intentionally has no wildcard case IDs, wildcard dimensions, severity ranges, open-ended expiry, or “ignore everything else” switch. Every changed case must name the exact `added`, `removed`, or `modified` result, exact impact, and exact dimension set. Added and removed cases use an empty dimension list; modified cases require at least one dimension. Regression and mixed expectations require `regressionAcknowledged: true`; improvement and review expectations require `false`. A plan may omit case expectations only when it declares at least one suite-level signal.

The plan accepts one bounded owner string and one credential-free HTTPS URL without user information/query/fragment, or one bounded URN. These are references and assertions only. The plan binds the exact baseline report SHA-256 and stable suite ID, is limited to 1 MiB, and is valid through `expiresOn` inclusively.

### Review CLI and evidence

```bash
pnpm blueprint:suite-change \
  examples/core.suite-report.json \
  examples/core-candidate.suite-report.json \
  --plan examples/core.suite-change-plan.json \
  --as-of 2026-08-08

pnpm blueprint:suite-change \
  examples/core.suite-report.json \
  examples/core-candidate.suite-report.json \
  --plan examples/core.suite-change-plan.json \
  --as-of 2026-08-08 \
  --check examples/core.suite-change-review.json

pnpm blueprint:suite-change \
  examples/core.suite-report.json \
  examples/core-candidate.suite-report.json \
  --plan examples/core.suite-change-plan.json \
  --as-of 2026-08-08 \
  --format markdown \
  --check examples/core.suite-change-review.md
```

The CLI validates both source reports, recomputes `suite-diff/1`, validates that the parsed plan object matches the exact imported plan bytes, and emits `samsarix-field-atlas/suite-change-review/1`. The complete result shape is [`schema/blueprint-suite-change-review.schema.json`](../schema/blueprint-suite-change-review.schema.json). It records:

- exact plan, baseline-report, and candidate-report SHA-256 values;
- plan owner/reference/expiry and the explicit `asOf` review date;
- planned, baseline, and candidate suite IDs plus planned/actual baseline digests and their binding results;
- the original comparison outcome, policy, and gate;
- matched, mismatched, unexpected, and missing case declarations;
- exact suite-level signal mismatches;
- required and present regression acknowledgements; and
- a separate declared-intent gate and proof boundary.

| Condition                                                                                                                                          | Intent gate          |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Every observed change exactly matches one declaration, all declarations are observed, suite signals match, bindings match, and the plan is current | Pass                 |
| An observed changed case has no declaration                                                                                                        | Fail as `unexpected` |
| A declared case is not changed                                                                                                                     | Fail as `missing`    |
| Change type, impact, dimensions, or required regression acknowledgement differs                                                                    | Fail as `mismatched` |
| Report impact, suite metadata, strict policy, or manifest signal differs                                                                           | Fail                 |
| Suite ID or exact baseline digest differs                                                                                                          | Fail                 |
| `asOf` is later than `expiresOn`                                                                                                                   | Fail as `expired`    |

`--as-of` is mandatory rather than silently reading the wall clock. The selected date is visible in the artifact, makes fixture reproduction deterministic, and must come from an accountable CI/review context. Field Atlas validates the calendar form but cannot prove when a reviewer or machine actually ran the command.

The intent gate is deliberately independent from the original suite-diff gate. A repository can require both, or can adopt a matching expiring plan as its explicit exception policy. In the latter case, the review still carries the failing regression gate and every acknowledged regression. Field Atlas does not decide who may adopt that policy; authenticated branch rules, code ownership, and accountable review remain authoritative.

JSON is the complete evidence artifact. Markdown is a context-normalized readable projection. JSON `--check` uses structural deep comparison; Markdown `--check` requires an exact UTF-8 text match. The CLI exits `0` only when the declared-intent gate passes, `1` for a failed gate, invalid input, or fixture mismatch, and `2` for usage errors.

The browser workbench uses the same validator and evaluator. It imports the plan locally, requires a visible review date, displays both gates and binding/mismatch counts, and exports JSON or Markdown without uploading the reports or plan.

## Proof boundary

Suite conformance proves only that local blueprint bytes parsed and satisfied the declared Field Atlas contract policy. A suite diff proves only how two structurally bounded reports compare under deterministic rules. A declared change review proves only that the observed diff exactly matches one bounded plan as of a supplied date. None runs an agent, calls an endpoint, evaluates model quality, authenticates an owner, verifies the supplied date or reference, re-verifies the original blueprint bytes, authorizes an exception, proves that approval occurred, or makes a release decision. A digest is an integrity pointer, not a signature.
