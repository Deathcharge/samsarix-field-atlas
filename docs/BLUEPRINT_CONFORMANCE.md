# Blueprint conformance

Samsarix Field Atlas treats a coordination design as a reviewable data contract before any runtime is selected. The browser workbench and command-line validator use the same implementation in `client/src/blueprint.ts`.

## Jobs this supports

- A platform team can challenge role, evidence, and authority handoffs before binding them to an agent framework.
- An incident or change owner can receive a readable review packet without needing access to an agent runtime.
- A repository can reject broken or governance-incomplete fixtures in CI.
- An implementer can consume one provider-neutral example while retaining explicit responsibility for authentication, execution, observability, and proof.

## Browser workflow

1. Choose a bundled scenario and select **Check current scenario**, or select **Import JSON** for a local v1 file.
2. Review the result:
   - **ready** means the known v1 contract is internally consistent;
   - **review** means the structure is valid but one or more governance warnings need an explicit decision;
   - **invalid** means the blueprint cannot be treated as a v1 contract.
3. Export the Markdown review packet when the contract is structurally valid, or export SARIF 2.1.0 for any result.

Files are limited to 1 MiB. Parsing, validation, and Markdown generation happen in browser memory. Field Atlas does not upload or persist imported content.

## Command-line workflow

From a frozen install:

```bash
pnpm blueprint:validate examples/incident.blueprint.json
pnpm blueprint:validate examples/incident.blueprint.json --strict
pnpm blueprint:validate examples/incident.blueprint.json --json
pnpm --silent blueprint:validate examples/incident.blueprint.json --strict --sarif
```

`--json` emits a Field Atlas machine result. `--sarif` emits standard SARIF 2.1.0 with errors and warnings, stable fingerprints, the source artifact URI, and JSONPath logical locations. The two output modes are mutually exclusive. `--check <expected.sarif.json>` can enforce exact SARIF fixture stability. See [Blueprint SARIF reporting](SARIF_REPORTING.md).

| Exit | Meaning                                                                    |
| ---: | -------------------------------------------------------------------------- |
|  `0` | The contract is ready, or has warnings and strict mode was not requested.  |
|  `1` | The contract is invalid, cannot be read, or has warnings under `--strict`. |
|  `2` | The command usage or option set is invalid.                                |

A repository gate can use:

```yaml
- run: corepack pnpm install --frozen-lockfile
- run: pnpm blueprint:validate path/to/blueprint.json --strict
```

This repository runs the included incident fixture in strict mode as part of `pnpm verify`.

## What the validator checks

Structural checks include:

- exact `samsarix-field-atlas/1` version and `illustrative-reference` mode;
- required fields, primitive types, bounded strings, bounded collection sizes, identifier forms, and timestamp format;
- a contiguous one-based trace order;
- unique declared role identifiers and valid trace references;
- non-empty evidence declarations for every stage;
- valid human, policy, tool, memory, or null boundary values;
- exact alignment between human-boundary stages and `requiresHumanApprovalAt`;
- at least one human gate for high-risk scenarios;
- truthful reference-mode claims of no execution, external calls, or remote storage.

The validator warns when a policy or memory boundary is absent and when it encounters additive fields it does not interpret. Unknown major versions are errors.

## What conformance does not prove

A ready result does not prove that evidence exists, a person approved an action, an implementation is secure, or a runtime behaved as described. Imported strings remain untrusted data and must never be evaluated as code or commands. Review-packet generation escapes Markdown metacharacters, but a downstream consumer must still treat the file as untrusted text. A real implementation still needs its own identity, authorization, privacy, secret-handling, observability, failure, and rollback controls.

## Versioned artifacts

- [`schema/samsarix-field-atlas.v1.schema.json`](../schema/samsarix-field-atlas.v1.schema.json) is the portable JSON Schema shape.
- [`examples/incident.blueprint.json`](../examples/incident.blueprint.json) is a complete strict-mode fixture.
- [`examples/incident.blueprint.sarif.json`](../examples/incident.blueprint.sarif.json) is its exact strict-ready SARIF 2.1.0 result.
- [`client/src/blueprint.ts`](../client/src/blueprint.ts) is the normative semantic checker for this repository.

JSON Schema captures the portable shape. The shared validator adds cross-field semantics such as reference integrity, ordered stages, approval alignment, and high-risk human oversight.
