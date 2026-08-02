import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { validateBlueprint } from "../client/src/blueprint";
import { createBlueprint } from "../client/src/model";
import { createBlueprintSarif } from "../client/src/sarif";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("blueprint SARIF reporting", () => {
  it("emits a deterministic empty result set for a ready blueprint", async () => {
    const analysis = validateBlueprint(
      createBlueprint("incident", "2026-08-01T12:00:00.000Z")
    );
    const first = await createBlueprintSarif(analysis, {
      artifactUri: "examples/incident.blueprint.json",
      strict: true,
      commandLine:
        "blueprint:validate examples/incident.blueprint.json --strict --sarif",
    });
    const second = await createBlueprintSarif(analysis, {
      artifactUri: "examples/incident.blueprint.json",
      strict: true,
      commandLine:
        "blueprint:validate examples/incident.blueprint.json --strict --sarif",
    });

    expect(first).toEqual(second);
    expect(first).toEqual(
      JSON.parse(
        readFileSync(
          resolve(repositoryRoot, "examples/incident.blueprint.sarif.json"),
          "utf8"
        )
      )
    );
    expect(first).toMatchObject({
      $schema: "https://json.schemastore.org/sarif-2.1.0.json",
      version: "2.1.0",
      runs: [
        {
          tool: {
            driver: {
              name: "Samsarix Field Atlas",
              organization: "Samsarix LLC",
              semanticVersion: "1.0.0",
              rules: [],
            },
          },
          invocations: [
            {
              executionSuccessful: true,
              properties: {
                validationStatus: "ready",
                strict: true,
                strictFailure: false,
                counts: { error: 0, warning: 0, pass: 4 },
              },
            },
          ],
          results: [],
        },
      ],
    });
  });

  it("maps warnings to review results with stable fingerprints", async () => {
    const blueprint = {
      ...createBlueprint("incident", "2026-08-01T12:00:00.000Z"),
      vendorNote: "An additive field that Field Atlas does not interpret.",
    };
    const analysis = validateBlueprint(blueprint);
    const first = await createBlueprintSarif(analysis, {
      artifactUri: ".\\fixtures\\review #1.json",
      strict: true,
    });
    const second = await createBlueprintSarif(analysis, {
      artifactUri: "a-different-file.json",
      strict: true,
    });
    const result = first.runs[0]!.results[0]!;

    expect(analysis.status).toBe("review");
    expect(result).toMatchObject({
      ruleId: "UNRECOGNIZED_FIELD",
      ruleIndex: 0,
      level: "warning",
      kind: "review",
      message: {
        text: "$.vendorNote: This additive field is not interpreted by Field Atlas v1.",
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: "fixtures/review%20%231.json" },
            region: { startLine: 1, startColumn: 1 },
          },
          logicalLocations: [{ name: "$.vendorNote", kind: "field" }],
        },
      ],
      properties: {
        jsonPath: "$.vendorNote",
        fieldAtlasSeverity: "warning",
      },
    });
    expect(result.partialFingerprints.primaryLocationLineHash).toMatch(
      /^[a-f0-9]{64}$/
    );
    expect(result.partialFingerprints).toEqual(
      second.runs[0]!.results[0]!.partialFingerprints
    );
    expect(first.runs[0]!.invocations[0]!.properties).toMatchObject({
      validationStatus: "invalid",
      strictFailure: true,
    });
  });

  it("maps validation errors without reporting passing checks as alerts", async () => {
    const blueprint = createBlueprint("incident", "2026-08-01T12:00:00.000Z");
    blueprint.runtime.executesAgents = true;
    const analysis = validateBlueprint(blueprint);
    const report = await createBlueprintSarif(analysis, {
      artifactUri: "examples/incident.blueprint.json",
    });
    const run = report.runs[0]!;

    expect(run.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "RUNTIME_CONTRADICTION",
          level: "error",
          kind: "fail",
        }),
      ])
    );
    expect(run.results.map(result => result.ruleId)).not.toContain(
      "SCHEMA_CONFORMANT"
    );
    expect(run.invocations[0]!.properties.validationStatus).toBe("invalid");
  });

  it("marks input failures as unsuccessful tool invocations", async () => {
    const report = await createBlueprintSarif(
      {
        status: "invalid",
        counts: { error: 1, warning: 0, pass: 0 },
        findings: [
          {
            code: "IMPORT_FAILED",
            severity: "error",
            path: "$",
            message: "The file is not valid JSON.",
          },
        ],
      },
      {
        artifactUri: "broken.json",
        executionSuccessful: false,
      }
    );

    expect(report.runs[0]!.invocations[0]!.executionSuccessful).toBe(false);
    expect(report.runs[0]!.results[0]!.ruleId).toBe("IMPORT_FAILED");
  });
});
