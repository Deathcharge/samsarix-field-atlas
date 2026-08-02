# A2A TCK evidence receipt

Field Atlas can bind an official A2A Technology Compatibility Kit `reports/compatibility.json` file to a `samsarix-field-atlas/a2a-acceptance/1` plan. It creates a deterministic `samsarix-field-atlas/a2a-tck-receipt/1` JSON receipt for an accountable owner.

The receipt always says:

- `status: owner-review-required`;
- `evidenceState: attached-unreviewed`;
- `protocolConformance: not-determined`;
- `releaseDecision: not-made`.

Attaching evidence is not the same as passing a test or approving a release. Field Atlas does not run the TCK, contact the system under test, verify a Git revision, validate a signature, or decide protocol conformance.

## Why percentage alone is insufficient

At the [official TCK revision interpreted by this receipt](https://github.com/a2aproject/a2a-tck/tree/5996b79f9cefa6fc390980e383e358a66fb9e49e):

- the [runner always requests compatibility JSON and HTML, pytest HTML, and JUnit XML reports](https://github.com/a2aproject/a2a-tck/blob/5996b79f9cefa6fc390980e383e358a66fb9e49e/run_tck.py);
- the [aggregator assigns `FAIL` if any tested transport fails, `SKIPPED` when every recorded transport is skipped, and `NOT TESTED` to registry requirements that never ran](https://github.com/a2aproject/a2a-tck/blob/5996b79f9cefa6fc390980e383e358a66fb9e49e/tck/reporting/aggregator.py);
- `SKIPPED` and `NOT TESTED` requirements are excluded from compatibility percentages, so `100.0%` does not by itself mean every requirement ran;
- the [JSON formatter defines a `spec_version` field](https://github.com/a2aproject/a2a-tck/blob/5996b79f9cefa6fc390980e383e358a66fb9e49e/tck/reporting/json_formatter.py), but the reviewed session hook currently constructs that formatter without supplying the version. A blank field is therefore accepted and surfaced as missing provenance rather than treated as A2A 1.0 proof.

Field Atlas recomputes every reported compatibility percentage from the per-requirement statuses using those semantics. It separately counts passed, failed, skipped, and not-tested requirements so omissions stay visible.

## Evidence contract

The workflow needs three inputs:

| Input                         | What Field Atlas uses                                                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acceptance manifest           | Plan timestamp, scenario and agent identity, A2A interface and binding, acceptance owner and environment, and case IDs                                                          |
| Official `compatibility.json` | Report timestamp and safe SUT URL, reported spec version, compatibility values, requirement statuses, transport summaries, error counts, and whether an Agent Card was embedded |
| Evidence profile              | Evidence owner, full official TCK Git revision, full implementation revision, and one redacted run command                                                                      |

The exact report bytes receive a SHA-256 digest before parsing. The receipt does **not** copy raw error strings, test IDs, or the embedded Agent Card. Keep the original JSON, HTML, JUnit, and relevant execution logs in the owner-controlled evidence store; the digest lets a reviewer detect whether the JSON file changed.

The TCK revision and implementation revision are assertions supplied by the evidence owner. Field Atlas validates immutable-looking formats but does not call GitHub or a source repository to prove them. The `interpretedAgainstTckRevision` field states which report implementation this parser was tested against; a different asserted TCK revision produces a review warning.

## Browser path

1. Validate a blueprint, create a valid draft Agent Card, and complete the acceptance-owner profile.
2. Run the official TCK outside Field Atlas against the intended implementation revision and preserve `reports/compatibility.json`.
3. In **Bind official TCK evidence**, name the evidence owner and supply the full TCK and implementation revisions.
4. Paste the redacted TCK command. Remove credentials, authorization headers, signed URLs, cookies, and sensitive task data.
5. Import `compatibility.json`. Files are limited to 5,242,880 bytes, parsed and hashed in memory, and never uploaded or persisted by Field Atlas.
6. Review failures, skips, not-tested requirements, version/origin/binding mismatches, and identity or ownership caveats.
7. Export the owner-review receipt and preserve it beside the exact source report.

Inputs remain mounted if an upstream Agent Card or acceptance field becomes temporarily invalid, so correcting the earlier contract does not erase completed provenance. No report is read until the user explicitly imports it.

## CLI path

```bash
pnpm --silent blueprint:tck-evidence \
  examples/incident.a2a-acceptance.json \
  --tck-report examples/incident.a2a-tck-compatibility.json \
  --profile examples/incident.a2a-tck-evidence-profile.json \
  --generated-at 2026-08-01T13:00:00.000Z
```

Check the complete deterministic fixture:

```bash
pnpm validate:tck-evidence-example
```

The CLI writes the receipt to standard output and diagnostics to standard error. `--check <expected.json>` compares the whole receipt. `--strict` rejects review warnings, including failures, skips, not-tested requirements, an empty or mismatched spec version, identity/provenance mismatches, or a report from a TCK revision whose shape has not been reviewed here.

Acceptance plans and profiles use the shared 1 MiB bounded regular-file reader. TCK reports use the same reader with a 5 MiB limit. Both browser and CLI reject invalid UTF-8 JSON. The public receipt shape is `schema/a2a-tck-receipt.schema.json`.

## Committed incident example

The repository includes:

- `examples/incident.a2a-tck-compatibility.json` — a **synthetic, official-format** report fixture; it is not evidence that a TCK run occurred;
- `examples/incident.a2a-tck-evidence-profile.json` — example asserted provenance with no credentials;
- `examples/incident.a2a-tck-receipt.json` — the exact expected owner-review receipt.

The synthetic report intentionally says `100.0%` while containing one skipped and one not-tested requirement. The expected receipt preserves the reported percentage and makes both exclusions visible. This exercises the proof boundary; it is not a compatibility claim about Samsarix software or the example endpoint.

## Validation and review rules

Receipt generation is blocked when:

- the acceptance artifact is not a coherent `plan-not-run` manifest with exactly one `a2a-official-tck` case;
- timestamps, digest, URLs, revision identifiers, profile fields, report sections, requirement results, or transport summaries are malformed;
- a requirement-level status contradicts its transport statuses;
- a compatibility percentage does not recompute from the eligible requirement statuses;
- a transport total differs from passed + failed + skipped;
- a requirement names a transport missing from the transport summary;
- the receipt timestamp predates the report;
- the redacted command appears to include a token, password, secret, API key, or authorization value.

Review warnings do not erase evidence. They remain in `reviewItems` and include report failures, skips, not-tested requirements, absent or mismatched spec metadata, unexpected TCK revision, SUT origin or planned transport mismatch, differing evidence and acceptance owners, report/plan chronology, absent or mismatched embedded card identity, and failures without diagnostic errors.

Only `a2a-official-tck` enters `evidenceAttachedCaseIds`. Every other acceptance case stays in `unresolvedCaseIds`, with blocking cases also listed separately. Even a clean report receipt includes an `UNRESOLVED_ACCEPTANCE_CASES` review item.

## Owner signoff

Before any release decision, the accountable owners still need to:

1. verify the asserted TCK and implementation revisions against source and build records;
2. inspect the original JSON, HTML, JUnit, and redacted runtime evidence;
3. disposition every TCK failure, skip, and not-tested requirement;
4. execute and review every remaining acceptance case, including authorization, privacy, operational limits, human gates, and stage evidence;
5. use the separate [Field Atlas acceptance review ledger](A2A_REVIEW_LEDGER.md) to preserve case dispositions and blocking readiness, then authenticate the decision, identities, evidence, exceptions, and rollback in an owner-controlled system.

Research and parser semantics were reviewed on August 1, 2026. Future TCK report changes require a new evidence review before this receipt can interpret them without a warning.
