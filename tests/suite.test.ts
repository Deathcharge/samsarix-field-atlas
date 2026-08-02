import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

import { createBlueprint } from "../client/src/model";
import {
  createBlueprintSuiteReport,
  validateBlueprintSuiteManifest,
  type BlueprintSuiteManifest,
} from "../client/src/suite";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function fixture(path: string): unknown {
  return JSON.parse(readFileSync(resolve(repositoryRoot, path), "utf8"));
}

function manifest(): BlueprintSuiteManifest {
  return fixture("examples/core.suite.json") as BlueprintSuiteManifest;
}

describe("blueprint suites", () => {
  it("accepts the portable core manifest and its public schema", () => {
    const value = manifest();
    const analysis = validateBlueprintSuiteManifest(value);
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    const validate = ajv.compile(
      fixture("schema/blueprint-suite.schema.json") as object
    );

    expect(validate(value), JSON.stringify(validate.errors)).toBe(true);
    expect(analysis.status).toBe("ready");
    expect(analysis.manifest?.entries).toHaveLength(3);
    expect(analysis.findings.map(finding => finding.code)).toContain(
      "SUITE_PATHS_PORTABLE"
    );
  });

  it("rejects traversal, duplicate identifiers, and invalid tags", () => {
    const value = manifest();
    value.entries[1] = {
      id: value.entries[0]!.id,
      path: "../outside.json",
      tags: ["high-risk", "high-risk"],
    };
    const analysis = validateBlueprintSuiteManifest(value);

    expect(analysis.status).toBe("invalid");
    expect(analysis.findings.map(finding => finding.code)).toEqual(
      expect.arrayContaining([
        "DUPLICATE_SUITE_ENTRY",
        "INVALID_ENTRY_PATH",
        "INVALID_ENTRY_TAG",
      ])
    );
  });

  it("reports additive manifest fields for explicit review", () => {
    const analysis = validateBlueprintSuiteManifest({
      ...manifest(),
      releaseChannel: "production",
    });

    expect(analysis.status).toBe("review");
    expect(analysis.manifest).toBeDefined();
    expect(analysis.findings).toContainEqual(
      expect.objectContaining({
        code: "UNRECOGNIZED_SUITE_FIELD",
        path: "$.releaseChannel",
      })
    );
  });

  it("promotes manifest warnings under the committed strict policy", async () => {
    const value = { ...manifest(), releaseChannel: "production" };
    const analysis = validateBlueprintSuiteManifest(value);
    const blueprint = createBlueprint("incident", "2026-08-01T12:00:00.000Z");
    const blueprintBytes = new TextEncoder().encode(JSON.stringify(blueprint));
    const report = await createBlueprintSuiteReport(
      manifest().suite,
      true,
      [
        {
          entryId: "incident",
          artifactUri: "incident.json",
          tags: [],
          bytes: blueprintBytes,
          value: blueprint,
        },
      ],
      {
        uri: "suite.json",
        bytes: new TextEncoder().encode(JSON.stringify(value)),
        analysis,
      }
    );

    expect(report.summary.status).toBe("invalid");
    expect(report.summary.cases).toMatchObject({ ready: 1, invalid: 0 });
    expect(report.source.manifest).toMatchObject({
      status: "invalid",
      validationStatus: "review",
    });
  });

  it("creates a deterministic strict report with exact-byte bindings", async () => {
    const readyBytes = new TextEncoder().encode(
      JSON.stringify(createBlueprint("incident", "2026-08-01T12:00:00.000Z"))
    );
    const reviewValue = {
      ...createBlueprint("ambiguous-request", "2026-08-01T12:00:00.000Z"),
      ownerNote: "Review this additive metadata.",
    };
    const reviewBytes = new TextEncoder().encode(JSON.stringify(reviewValue));
    const inputs = [
      {
        entryId: "incident",
        artifactUri: "incident.json",
        tags: ["operations"],
        bytes: readyBytes,
        value: JSON.parse(new TextDecoder().decode(readyBytes)) as unknown,
      },
      {
        entryId: "ambiguous-request",
        artifactUri: "ambiguous.json",
        tags: ["product"],
        bytes: reviewBytes,
        value: reviewValue,
      },
    ];

    const first = await createBlueprintSuiteReport(
      manifest().suite,
      true,
      inputs
    );
    const second = await createBlueprintSuiteReport(
      manifest().suite,
      true,
      inputs
    );
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    const validate = ajv.compile(
      fixture("schema/blueprint-suite-report.schema.json") as object
    );

    expect(first).toEqual(second);
    expect(validate(first), JSON.stringify(validate.errors)).toBe(true);
    expect(first.summary).toMatchObject({
      status: "invalid",
      cases: { total: 2, ready: 1, review: 0, invalid: 1 },
    });
    expect(first.cases[1]).toMatchObject({
      status: "invalid",
      validationStatus: "review",
    });
    expect(first.cases[0]!.artifact.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(first.proofBoundary).toMatch(/did not execute agents/i);
  });

  it("keeps unreadable entries visible without inventing a digest", async () => {
    const report = await createBlueprintSuiteReport(manifest().suite, false, [
      {
        entryId: "missing",
        artifactUri: "missing.json",
        tags: [],
        importError: "File not found.",
      },
    ]);

    expect(report.summary.status).toBe("invalid");
    expect(report.cases[0]).toMatchObject({
      artifact: { sha256: null, bytes: null },
      scenario: null,
      findings: [expect.objectContaining({ code: "IMPORT_FAILED" })],
    });
  });
});
