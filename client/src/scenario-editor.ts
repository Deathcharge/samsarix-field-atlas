import { blueprintSchemaVersion, type Blueprint } from "./blueprint";
import { agents, createBlueprint } from "./model";

export type ScenarioDraft = {
  id: string;
  title: string;
  risk: Blueprint["scenario"]["risk"];
  objective: string;
  successCriteria: Array<{
    draftKey: string;
    value: string;
  }>;
  indicators: Blueprint["indicators"];
  steps: Array<{
    draftKey: string;
    agentId: string;
    title: string;
    action: string;
    boundary: Blueprint["trace"][number]["boundary"];
    evidence: string;
  }>;
};

export function createScenarioDraft(scenarioId: string): ScenarioDraft {
  const blueprint = createBlueprint(scenarioId, "2000-01-01T00:00:00.000Z");

  return {
    id: blueprint.scenario.id,
    title: blueprint.scenario.title,
    risk: blueprint.scenario.risk,
    objective: blueprint.scenario.objective,
    successCriteria: blueprint.scenario.successCriteria.map((value, index) => ({
      draftKey: `criterion-${index + 1}`,
      value,
    })),
    indicators: structuredClone(blueprint.indicators),
    steps: blueprint.trace.map((step, index) => ({
      draftKey: `step-${index + 1}`,
      agentId: step.agentId,
      title: step.title,
      action: step.action,
      boundary: step.boundary,
      evidence: step.evidence,
    })),
  };
}

export function scenarioDraftToBlueprint(
  draft: ScenarioDraft,
  generatedAt: string
): Blueprint {
  const activeAgentIds = new Set(draft.steps.map(step => step.agentId));

  return {
    schemaVersion: blueprintSchemaVersion,
    mode: "illustrative-reference",
    generatedAt,
    scenario: {
      id: draft.id,
      title: draft.title,
      risk: draft.risk,
      objective: draft.objective,
      successCriteria: draft.successCriteria.map(criterion => criterion.value),
    },
    indicators: structuredClone(draft.indicators),
    agents: agents
      .filter(agent => activeAgentIds.has(agent.id))
      .map(({ id, name, layer, role, responsibility }) => ({
        id,
        name,
        layer,
        role,
        responsibility,
      })),
    trace: draft.steps.map((step, index) => ({
      order: index + 1,
      agentId: step.agentId,
      title: step.title,
      action: step.action,
      boundary: step.boundary,
      evidence: step.evidence,
    })),
    runtime: {
      executesAgents: false,
      callsExternalServices: false,
      storesRemoteData: false,
      requiresHumanApprovalAt: draft.steps.flatMap((step, index) =>
        step.boundary === "human" ? [index + 1] : []
      ),
    },
  };
}

export function moveScenarioItem<T>(
  items: T[],
  index: number,
  direction: -1 | 1
): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;

  const moved = [...items];
  const item = moved[index];
  const targetItem = moved[target];
  if (item === undefined || targetItem === undefined) return items;

  moved[index] = targetItem;
  moved[target] = item;
  return moved;
}
