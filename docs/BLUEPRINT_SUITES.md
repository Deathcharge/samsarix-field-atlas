# Blueprint suites

## Purpose

A `samsarix-field-atlas/suite/1` manifest turns a set of blueprint files into one repeatable local conformance job. It is useful for pull-request gates, release fixture packs, implementation handoffs, and design reviews that need to answer “do all of these contracts still satisfy the same policy?” without adopting a hosted evaluation service.

Evaluation platforms increasingly make reusable collections a first-class workflow: LangSmith versions datasets and supports filtered or split evaluation views, Braintrust versions every dataset mutation, and Promptfoo loads test cases and scenarios from portable external files. Field Atlas implements the smaller pre-runtime counterpart: it checks coordination-contract structure as a batch but does not execute an evaluation target.

Primary workflow references:

- [LangSmith dataset management](https://docs.langchain.com/langsmith/manage-datasets)
- [Braintrust datasets](https://www.braintrust.dev/docs/guides/datasets)
- [Promptfoo external test files](https://www.promptfoo.dev/docs/configuration/test-cases/)

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

## Proof boundary

Suite conformance proves only that local bytes parsed and satisfied the declared Field Atlas contract policy. It does not run an agent, call an endpoint, evaluate model quality, authenticate an owner, inspect named evidence, prove that an approval occurred, or make a release decision. A digest is an integrity pointer, not a signature.
