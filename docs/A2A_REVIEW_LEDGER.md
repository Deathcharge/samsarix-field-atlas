# A2A acceptance review ledger

Field Atlas turns a `samsarix-field-atlas/a2a-acceptance/1` plan, its `samsarix-field-atlas/a2a-tck-receipt/1` receipt, and a case-review profile into two local artifacts:

- a deterministic `samsarix-field-atlas/a2a-review-ledger/1` JSON ledger;
- a human-readable Markdown review packet.

The ledger closes every planned case as `accepted`, `rejected`, `waived`, or `pending`, computes readiness from the plan's original blocking flags, and optionally records an owner release decision. It does not run the service, fetch evidence, validate a signature, authenticate an artifact, verify a person's identity, or grant decision authority.

## Why this workflow exists

The [A2A project roadmap](https://a2a-protocol.org/latest/roadmap/) identifies validation tooling as critical as the ecosystem matures. The official Inspector and TCK cover live interaction and protocol compatibility, but they do not own a consumer's operational, privacy, governance, or release decisions.

The [NIST AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) calls for defined human oversight roles, organizational responsibility for deployment-risk decisions, and documentation sufficient for relevant actors to decide and act. Current evaluation products also emphasize structured human work: [LangSmith annotation queues](https://docs.langchain.com/langsmith/annotation-queues) track assigned reviewers and completion states, while [Braintrust human review](https://www.braintrust.dev/docs/annotate/human-review) combines structured review scores, assignments, comments, and completion.

Field Atlas provides a narrower, provider-neutral option for pre-release handoff: no account, API key, database, hosted trace, or runtime integration is required. Its ledger is portable and CI-checkable, but deliberately weaker than an authenticated review system.

## Browser path

1. Create a valid acceptance plan and TCK evidence receipt in the preceding workbench sections.
2. In **Record owner dispositions**, confirm the case review owner and implementation revision.
3. Expand each planned case and choose `accepted`, `rejected`, `waived`, or `pending`.
4. For any non-pending case, supply one to eight credential-free HTTPS or URN evidence references. HTTPS references cannot contain user information, a query, or a fragment.
5. Add required rationale to every rejection or waiver. Accepted-case rationale is optional.
6. Keep the decision `not-made`, or name the asserted decision owner and record `approved` or `rejected` with rationale. The browser supplies canonical UTC review and decision times.
7. Export the editable review profile for later continuation, the JSON ledger for automation, and the Markdown packet for human review.

The section remains mounted when an upstream plan or receipt becomes temporarily invalid, preserving entered values. Profile imports are limited to 1 MiB, require valid UTF-8 JSON, stay in memory, and are never uploaded or persisted by Field Atlas.

## CLI path

```bash
pnpm --silent blueprint:review \
  examples/incident.a2a-acceptance.json \
  --tck-receipt examples/incident.a2a-tck-receipt.json \
  --profile examples/incident.a2a-review-profile.json \
  --generated-at 2026-08-01T14:10:00.000Z
```

Check the complete deterministic fixture:

```bash
pnpm validate:review-example
```

The CLI writes the ledger to standard output and diagnostics to standard error. `--check <expected.json>` compares the whole generated artifact. `--strict` rejects review warnings such as TCK caveats, blocking waivers, non-blocking exceptions under approval, or a missing owner decision. All inputs use the shared 1 MiB bounded regular-file reader.

The public output shape is `schema/a2a-review-ledger.schema.json`. The semantic validator additionally enforces cross-document identity, exact case coverage, chronology, source-digest linkage, decision consistency, and TCK-report reference rules that JSON Schema alone cannot prove.

## Source binding

The ledger records:

- SHA-256 of the **Field Atlas canonical JSON** for the acceptance plan;
- SHA-256 of the Field Atlas canonical JSON for the TCK receipt;
- the receipt's SHA-256 of the exact original TCK report bytes;
- the implementation and asserted TCK revisions.

Field Atlas canonical JSON recursively sorts object keys, preserves array order, and serializes the result with `JSON.stringify`. This makes browser and CLI fingerprints independent of insignificant object-key order and whitespace. It is a documented Field Atlas v1 convention, not a claim of RFC 8785 conformance or a digital signature.

A digest can reveal later mutation; it cannot prove who created or approved an artifact. An owner-controlled release system should authenticate source artifacts and identities with its own signatures, access controls, and audit log.

## Disposition and decision rules

- Every planned case must appear exactly once. Missing, duplicate, or unknown rows invalidate generation.
- `pending` carries no review time, evidence, or rationale.
- `accepted`, `rejected`, and `waived` require a canonical UTC review time and at least one evidence reference.
- `rejected` and `waived` require rationale.
- The reviewed `a2a-official-tck` row must reference the exact report as `urn:sha256:<receipt report digest>`.
- `eligible-for-owner-decision` requires every blocking case to be accepted or waived.
- An `approved` decision is invalid while any blocking case is pending or rejected.
- Blocking waivers, approved non-blocking exceptions, and dispositioned TCK failures/skips/not-tested requirements remain visible review items.
- A rejected decision is valid evidence of a completed review even though automated readiness remains `blocked`.

The analysis status describes whether the **ledger artifact** is valid and reviewable; it is not the release outcome. Read `conclusion.automatedReadiness` and `conclusion.releaseDecision` separately.

## Committed incident example

The repository includes:

- `examples/incident.a2a-review-profile.json` — a complete synthetic profile with credential-free URNs;
- `examples/incident.a2a-review-ledger.json` — the exact expected ledger.

The fixture accepts 21 cases and rejects the blocking authentication case. The resulting readiness is `blocked` and the asserted release decision is `rejected`. Its TCK row references the exact synthetic report digest and retains the report's skipped/not-tested caveat. None of the synthetic URNs resolve to evidence, no service ran, and no Samsarix implementation was evaluated.

## Proof and authority boundary

Every ledger fixes these statements:

- `runtimeExecutionByFieldAtlas: not-performed`;
- `sourceAuthenticationByFieldAtlas: not-performed`;
- `ownerIdentityVerificationByFieldAtlas: not-performed`;
- `decisionAuthority: owner-asserted`.

Before acting on a ledger, an accountable organization still needs to inspect the evidence bodies, verify every digest and source revision, authenticate reviewers and decision owners, confirm their authority, preserve residual risks and rollback, and store the signed result in its system of record.

Research and workflow semantics were reviewed on August 1, 2026.
