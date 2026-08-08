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

## Proof boundary

Suite conformance proves only that local blueprint bytes parsed and satisfied the declared Field Atlas contract policy. A suite diff proves only how two structurally bounded reports compare under deterministic rules. Neither runs an agent, calls an endpoint, evaluates model quality, authenticates an owner, re-verifies the original blueprint bytes, proves that an approval occurred, or makes a release decision. A digest is an integrity pointer, not a signature.
