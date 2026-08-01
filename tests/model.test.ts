import { describe, expect, it } from "vitest";

import {
  blueprintToMarkdown,
  validateBlueprint,
} from "../client/src/blueprint";
import {
  agents,
  createBlueprint,
  findScenario,
  indicatorDetails,
  indicatorsAtProgress,
  scenarios,
} from "../client/src/model";

describe("Samsarix reference model", () => {
  it("defines thirteen unique roles across all three layers", () => {
    expect(agents).toHaveLength(13);
    expect(new Set(agents.map(agent => agent.id)).size).toBe(13);
    expect(new Set(agents.map(agent => agent.layer))).toEqual(
      new Set(["consciousness", "operational", "integration"])
    );
  });

  it("keeps every trace reference valid and every role demonstrable", () => {
    const agentIds = new Set(agents.map(agent => agent.id));
    const demonstratedIds = new Set<string>();

    for (const scenario of scenarios) {
      expect(scenario.steps.length).toBeGreaterThanOrEqual(6);
      for (const step of scenario.steps) {
        expect(agentIds.has(step.agentId)).toBe(true);
        demonstratedIds.add(step.agentId);
      }
    }

    expect(demonstratedIds).toEqual(agentIds);
  });

  it("interpolates bounded indicators without mutating the scenario", () => {
    const scenario = findScenario(null);
    const before = structuredClone(scenario);
    const indicators = indicatorsAtProgress(scenario, 0.5);

    for (const { key } of indicatorDetails) {
      expect(indicators[key]).toBeGreaterThanOrEqual(0);
      expect(indicators[key]).toBeLessThanOrEqual(1);
    }
    expect(scenario).toEqual(before);
  });

  it("exports an honest, deterministic blueprint contract", () => {
    const completedAt = "2026-07-28T12:00:00.000Z";
    const blueprint = createBlueprint("breaking-change", completedAt);

    expect(blueprint).toMatchObject({
      schemaVersion: "samsarix-field-atlas/1",
      generatedAt: completedAt,
      mode: "illustrative-reference",
      runtime: {
        callsExternalServices: false,
        executesAgents: false,
        storesRemoteData: false,
      },
    });
    expect(createBlueprint("breaking-change", completedAt)).toEqual(blueprint);
  });

  it("accepts every bundled scenario as a governance-ready v1 contract", () => {
    for (const scenario of scenarios) {
      const analysis = validateBlueprint(
        createBlueprint(scenario.id, "2026-08-01T12:00:00.000Z")
      );

      expect(analysis.status).toBe("ready");
      expect(analysis.counts.error).toBe(0);
      expect(analysis.metrics).toMatchObject({
        roles: new Set(scenario.steps.map(step => step.agentId)).size,
        stages: scenario.steps.length,
        evidenceArtifacts: scenario.steps.length,
      });
    }
  });

  it("blocks contradictory runtime claims and misaligned human authority", () => {
    const blueprint = createBlueprint("incident", "2026-08-01T12:00:00.000Z");
    blueprint.runtime.executesAgents = true;
    blueprint.runtime.requiresHumanApprovalAt = [];

    const analysis = validateBlueprint(blueprint);

    expect(analysis.status).toBe("invalid");
    expect(analysis.findings.map(finding => finding.code)).toEqual(
      expect.arrayContaining(["RUNTIME_CONTRADICTION", "APPROVAL_MISMATCH"])
    );
    expect(analysis.blueprint).toBeUndefined();
  });

  it("rejects loose timestamps and identifiers that disagree with the schema", () => {
    const blueprint = createBlueprint("incident", "2026-08-01T12:00:00.000Z");
    blueprint.generatedAt = "August 1, 2026";
    blueprint.scenario.id = "Incident fixture";

    const analysis = validateBlueprint(blueprint);

    expect(analysis.status).toBe("invalid");
    expect(analysis.findings.map(finding => finding.code)).toEqual(
      expect.arrayContaining(["INVALID_TIMESTAMP", "INVALID_IDENTIFIER"])
    );
  });

  it("accepts RFC 3339 timestamps with extended fractional precision", () => {
    const blueprint = createBlueprint(
      "incident",
      "2026-08-01T12:00:00.123456Z"
    );

    expect(validateBlueprint(blueprint).status).toBe("ready");
  });

  it("compares declared human gates without imposing array order", () => {
    const blueprint = createBlueprint(
      "breaking-change",
      "2026-08-01T12:00:00.000Z"
    );
    blueprint.runtime.requiresHumanApprovalAt = [7, 5];

    expect(validateBlueprint(blueprint).status).toBe("ready");
  });

  it("preserves forward-compatible fields as explicit review warnings", () => {
    const blueprint = {
      ...createBlueprint("ambiguous-request", "2026-08-01T12:00:00.000Z"),
      extension: { owner: "example-team" },
    };

    const analysis = validateBlueprint(blueprint);

    expect(analysis.status).toBe("review");
    expect(analysis.findings).toContainEqual(
      expect.objectContaining({
        code: "UNRECOGNIZED_FIELD",
        path: "$.extension",
        severity: "warning",
      })
    );
  });

  it("renders a review packet with gates, evidence, and runtime disclosure", () => {
    const blueprint = createBlueprint(
      "breaking-change",
      "2026-08-01T12:00:00.000Z"
    );
    const review = blueprintToMarkdown(blueprint);

    expect(review).toContain("# Ship a breaking change");
    expect(review).toContain("## Ordered handoffs");
    expect(review).toContain("Human approval gates: 5, 7");
    expect(review).toContain("Executes agents: **no**");
    expect(review).toContain("Immutable decision record");
  });

  it("escapes imported Markdown syntax in a generated review packet", () => {
    const blueprint = createBlueprint(
      "breaking-change",
      "2026-08-01T12:00:00.000Z"
    );
    const firstAgent = blueprint.agents[0];
    expect(firstAgent).toBeDefined();
    if (firstAgent) {
      firstAgent.name = "![remote image](https://example.invalid/pixel)";
    }

    const review = blueprintToMarkdown(blueprint);

    expect(review).not.toContain("![remote image](");
    expect(review).toContain("\\!\\[remote image\\]\\(");
  });

  it("refuses to render a review packet for an invalid blueprint", () => {
    const blueprint = createBlueprint("incident", "2026-08-01T12:00:00.000Z");
    blueprint.generatedAt = "![remote](https://example.invalid/pixel)";

    expect(() => blueprintToMarkdown(blueprint)).toThrow(/invalid blueprint/i);
  });

  it("falls back safely when a scenario identifier is unsupported", () => {
    expect(findScenario("not-a-scenario")).toBe(findScenario(null));
  });
});
