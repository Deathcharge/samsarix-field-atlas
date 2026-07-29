import { describe, expect, it } from "vitest";

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

  it("falls back safely when a scenario identifier is unsupported", () => {
    expect(findScenario("not-a-scenario")).toBe(findScenario(null));
  });
});
