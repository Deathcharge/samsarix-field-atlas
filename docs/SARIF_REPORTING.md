# Blueprint SARIF reporting

Field Atlas can render blueprint conformance findings as [SARIF 2.1.0](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html). This is a local result-interchange feature: it does not upload a report, enable GitHub Code Scanning, or recast governance findings as vulnerability claims.

The use case is a repository that already reviews `samsarix-field-atlas/1` blueprints and wants the same findings in a SARIF-capable CI or review surface. The [A2A roadmap](https://a2a-protocol.org/latest/roadmap/) identifies validation tooling as critical as the ecosystem matures. [GitHub supports SARIF 2.1.0 from third-party analysis tools](https://docs.github.com/en/code-security/concepts/code-scanning/sarif-files), while other SARIF consumers can use the same portable file.

## Browser workflow

1. In **Blueprint workbench / local conformance**, check the selected scenario or import a blueprint.
2. Review the ordinary Field Atlas decision and findings.
3. Select **Export SARIF**.

The browser creates an `application/sarif+json` download in memory. An invalid import can still be exported so a parse or file-limit failure is not lost. Nothing is transmitted by Field Atlas.

## Command-line workflow

Write SARIF to standard output:

```bash
pnpm --silent blueprint:validate path/to/blueprint.json --strict --sarif > field-atlas.sarif.json
```

Check deterministic generation against a committed fixture:

```bash
pnpm blueprint:validate examples/incident.blueprint.json \
  --strict \
  --sarif \
  --check examples/incident.blueprint.sarif.json
```

`--json` and `--sarif` are mutually exclusive. `--check` is available only with `--sarif`. Exit behavior remains the same as the ordinary validator: errors fail, and warnings fail under `--strict`.

## Mapping

- Field Atlas errors become SARIF `error` / `fail` results.
- Field Atlas warnings become SARIF `warning` / `review` results. Strict mode changes the validation status and process exit, not the original finding severity.
- Passing checks remain in invocation counts and are not emitted as alert-like results.
- Each distinct Field Atlas code becomes one SARIF rule.
- The JSONPath is preserved as a logical `field` location and in result properties.
- The source argument becomes a URI-encoded artifact location. Because the validator does not retain token offsets, the physical location is conservatively line 1, column 1 rather than a fabricated field line.
- `primaryLocationLineHash` is a deterministic SHA-256 of the finding code and JSONPath. It contains no imported value or message text and remains stable when only a filename or wording changes.
- `runAutomationDetails.id` is fixed to `samsarix-field-atlas/blueprint-conformance/` so a consumer can categorize repeated runs consistently.

The standard `$schema` URI identifies the public SARIF shape. Field Atlas does not define a competing SARIF dialect.

## Optional GitHub upload

GitHub documents an opt-in [`github/codeql-action/upload-sarif@v4`](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file) workflow. That action needs `security-events: write`, repository eligibility, and an owner-approved workflow change. Field Atlas deliberately does not request that permission or add an upload step here. A consumer may instead retain the report as an ordinary CI artifact or send it to another SARIF-compatible system.

If a repository owner chooses GitHub Code Scanning, use a distinct category such as `field-atlas-blueprint-conformance` and make clear that the results describe contract structure and governance—not source-code vulnerabilities or runtime security.

## Trust and proof boundary

SARIF is a transport for existing validator findings. It does not make a blueprint true, execute an A2A service, inspect evidence, or authenticate a person. Imported filenames, JSONPaths, and messages are treated as untrusted data and JSON-encoded. Downstream consumers must still render and store the report safely.

The committed [`incident.blueprint.sarif.json`](../examples/incident.blueprint.sarif.json) fixture has no results because the incident blueprint is strict-ready. Its invocation counts retain the four passing checks. Tests separately cover warning, error, strict-failure, encoding, fingerprint, and import-failure behavior.
