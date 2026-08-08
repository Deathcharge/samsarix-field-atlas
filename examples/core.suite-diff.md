# Suite baseline comparison: Core reference scenarios

- Gate: **pass**
- Outcome: **review**
- Policy: fail on **regression**
- Baseline: core.suite-report.json (52994c82ddadbde841ebf5abfd7ef6b1a057dfea67186b26d7827fd680728f87)
- Candidate: core-candidate.suite-report.json (3a8f7be1558ea8f5ef215f5f841e1ad49fd3d41f37cc4dfc7c1fe1061ef1786e)

## Summary

| Signal | Value |
| --- | --- |
| Report impact | none |
| Suite metadata changed | no |
| Suite policy changed | no |
| Source manifest changed | yes |
| Cases | 3 compared; 0 added; 0 removed; 1 modified; 2 unchanged |
| Impact | 0 regression; 0 mixed; 1 review; 0 improvement; 2 none |

## Cases

| Contract | ID | Change | Impact | Baseline | Candidate | Differences |
| --- | --- | --- | --- | --- | --- | --- |
| Clarify an ambiguous request | ambiguous-request | unchanged | none | ready | ready | none |
| Ship a breaking change | breaking-change | unchanged | none | ready | ready | none |
| Triage a production incident | incident | modified | review | ready | ready | tags |

## Proof boundary

Field Atlas compared two local conformance reports and their exact imported bytes; it did not execute agents, evaluate runtime quality, verify source artifacts beyond report consistency, authenticate owners, or approve a release.

This deterministic, timestamp-free summary reports the selected local comparison gate. It does not assert that tests ran or that a release was approved.
