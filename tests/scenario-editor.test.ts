import { describe, expect, it } from "vitest";

import { validateBlueprint } from "../client/src/blueprint";
import {
  createScenarioDraft,
  moveScenarioItem,
  scenarioDraftToBlueprint,
} from "../client/src/scenario-editor";

describe("scenario editor model", () => {
  it("creates a detached draft from a bundled scenario", () => {
    const first = createScenarioDraft("incident");
    const second = createScenarioDraft("incident");

    first.successCriteria[0]!.value = "Changed locally";
    first.steps[0]!.title = "Changed stage";
    first.indicators.baseline.harmony = 0;

    expect(second.successCriteria[0]!.value).not.toBe("Changed locally");
    expect(second.steps[0]!.title).not.toBe("Changed stage");
    expect(second.indicators.baseline.harmony).not.toBe(0);
  });

  it("derives a conformant blueprint, active roles, and human gates", () => {
    const draft = createScenarioDraft("incident");
    draft.id = "customer-incident-review";
    draft.title = "Review a customer-facing incident";
    draft.steps = [
      {
        draftKey: "facts",
        agentId: "gemini",
        title: "Collect facts",
        action: "Separate confirmed facts from symptoms and assumptions.",
        boundary: "tool",
        evidence: "Timestamped incident fact set",
      },
      {
        draftKey: "approval",
        agentId: "vega",
        title: "Approve containment",
        action: "Ask the incident owner to approve the bounded response.",
        boundary: "human",
        evidence: "Named owner decision",
      },
      {
        draftKey: "record",
        agentId: "blackbox",
        title: "Record the outcome",
        action: "Retain the decision, evidence, and follow-up conditions.",
        boundary: "memory",
        evidence: "Immutable incident record",
      },
      {
        draftKey: "policy",
        agentId: "kavach",
        title: "Check policy constraints",
        action: "Confirm the response stays inside declared access policy.",
        boundary: "policy",
        evidence: "Policy review note",
      },
    ];

    const blueprint = scenarioDraftToBlueprint(
      draft,
      "2026-08-02T12:00:00.000Z"
    );

    expect(blueprint.agents.map(agent => agent.id)).toEqual([
      "vega",
      "kavach",
      "gemini",
      "blackbox",
    ]);
    expect(blueprint.trace.map(step => step.order)).toEqual([1, 2, 3, 4]);
    expect(blueprint.runtime.requiresHumanApprovalAt).toEqual([2]);
    expect(blueprint.runtime).toMatchObject({
      executesAgents: false,
      callsExternalServices: false,
      storesRemoteData: false,
    });
    expect(validateBlueprint(blueprint).status).toBe("ready");
  });

  it("moves items without mutating the source or crossing list bounds", () => {
    const source = ["first", "second", "third"];

    expect(moveScenarioItem(source, 1, -1)).toEqual([
      "second",
      "first",
      "third",
    ]);
    expect(moveScenarioItem(source, 0, -1)).toBe(source);
    expect(moveScenarioItem(source, 2, 1)).toBe(source);
    expect(source).toEqual(["first", "second", "third"]);
  });
});
