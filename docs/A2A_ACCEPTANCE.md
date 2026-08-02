# A2A implementation acceptance contract

Field Atlas turns a validated blueprint, its draft A2A 1.0 Agent Card, and a consumer-owned acceptance profile into two local artifacts:

- a deterministic `samsarix-field-atlas/a2a-acceptance/1` JSON manifest for review and CI drift detection;
- a Markdown execution checklist for the named runtime owner.

Both artifacts have the fixed status `plan-not-run`. They are not an A2A extension, endpoint probe, official Technology Compatibility Kit report, test result, deployment record, or conformance claim.

## Why this is separate from the Agent Card

The [A2A 1.0 specification](https://github.com/a2aproject/A2A/blob/2cdf197805cf3eb780714f730cdfd24bce1c9998/docs/specification.md) defines discovery and interaction information such as interfaces, authentication declarations, capabilities, and skills. Field Atlas does not add private governance fields to that card.

The acceptance manifest instead records consumer decisions the core card does not own:

| Input               | Accepted decision                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| Validated blueprint | Scenario risk, human gates, ordered stages, and named evidence                                              |
| Draft Agent Card    | A2A version, interface, binding, modes, authentication declaration, and skill identity                      |
| Acceptance owner    | Environment, support path, size/deadline/concurrency limits, retention, data class, and external processors |

The [A2A extension governance process](https://a2a-protocol.org/latest/topics/extension-and-binding-governance/) distinguishes official and unofficial extensions. This contract deliberately remains a Field Atlas artifact rather than presenting its semantics as an official extension.

## Browser path

1. Validate a blueprint in **Blueprint workbench**.
2. Complete the runtime-owner profile and create a valid draft Agent Card.
3. In **Define implementation acceptance**, name the accountable owner and support contact.
4. Review the environment, limits, retention, data classification, and processor declaration.
5. Resolve errors and consciously accept any warnings.
6. Export the JSON acceptance manifest and Markdown execution checklist.

The browser generates the plan in memory. It does not contact the declared interface, acquire credentials, run tests, or persist the profile.

## CLI path

Generate a deterministic manifest by supplying the generation timestamp explicitly:

```bash
pnpm --silent blueprint:acceptance examples/incident.blueprint.json \
  --agent-card examples/incident.a2a-agent-card.json \
  --profile examples/incident.a2a-acceptance-profile.json \
  --generated-at 2026-08-01T12:00:00.000Z
```

Validate the committed example exactly in strict mode:

```bash
pnpm validate:acceptance-example
```

The CLI writes the manifest to standard output and diagnostics to standard error. `--strict` fails on review warnings. `--check <expected.json>` compares the entire generated artifact. All three JSON inputs are limited to 1 MiB, must be regular files, and are parsed through the shared bounded reader.

The committed fixtures are:

- `examples/incident.blueprint.json`;
- `examples/incident.a2a-agent-card.json`;
- `examples/incident.a2a-acceptance-profile.json`;
- `examples/incident.a2a-acceptance.json`.

The public artifact shape is documented by `schema/a2a-acceptance.schema.json`. The semantic validator also enforces cross-document rules that JSON Schema alone cannot prove, including scenario-skill identity, A2A 1.0 targeting, safe interface URLs, canonical generation time, retention-mode consistency, and truthful plan status.

## Planned evidence

The manifest creates cases for:

- discovery-card parity, version negotiation, media validation, authentication, authorization non-disclosure, validation errors, and transient failures;
- the owner-defined request-size, response-deadline, concurrency, retention, classification, and processor boundaries;
- every human approval gate and every named evidence stage in the source blueprint;
- credential/log redaction;
- one required run of the official [A2A TCK revision reviewed here](https://github.com/a2aproject/a2a-tck/tree/5996b79f9cefa6fc390980e383e358a66fb9e49e).

The official TCK owns core protocol compatibility. Field Atlas preserves its report as separate evidence and does not reproduce or reinterpret a passing result. The runtime owner should also use the [A2A Inspector revision reviewed here](https://github.com/a2aproject/a2a-inspector/tree/8098818f97c6b8554f1f83636508a9608842f5a0) for live discovery and interaction debugging.

This split follows NIST AI RMF guidance to make test, evaluation, validation, and verification objective, repeatable, documented, tied to deployment-like conditions, and subject to defined human oversight: [AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) and [NIST TEVV](https://www.nist.gov/ai-test-evaluation-validation-and-verification-tevv).

## Execution and signoff

The exported plan is ready for execution elsewhere only after the profile is structurally valid. It has not passed. The named acceptance owner must:

1. identify the implementation revision, TCK revision, environment, and test-data boundary;
2. run the cases under deployment-like conditions using synthetic or explicitly approved data;
3. attach redacted evidence without editing `plan-not-run` into a result claim;
4. disposition TCK failures, skips, and inapplicable cases;
5. record the release decision, date, unresolved risk, and rollback path in a separate accountable record.

High-risk production plans produce an independent-signoff warning. Restricted data combined with external processors produces a processor, transfer, and redaction review warning.

## Security and privacy boundary

- Never put tokens, authorization headers, cookies, passwords, API keys, signed URLs, or live task payloads in a profile, manifest, Markdown plan, or evidence fixture.
- Treat every imported JSON string as untrusted data. Do not interpolate it into shell commands, HTML, prompts, network policy, or logs without context-appropriate handling.
- The support contact accepts only an email address or credential-free HTTPS URL.
- A production interface must be credential-free HTTPS; loopback HTTP is limited to local work.
- Evidence labels describe what an owner must later produce. Their presence in a plan is not proof that an artifact exists.
