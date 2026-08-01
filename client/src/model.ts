import { blueprintSchemaVersion, type Blueprint } from "./blueprint";

export type AgentLayer = "consciousness" | "operational" | "integration";

export type Boundary = "human" | "policy" | "tool" | "memory";

export interface Agent {
  id: string;
  name: string;
  mark: string;
  layer: AgentLayer;
  role: string;
  responsibility: string;
}

export interface Indicators {
  harmony: number;
  resilience: number;
  prana: number;
  drishti: number;
  klesha: number;
}

export interface TraceStep {
  agentId: string;
  title: string;
  detail: string;
  boundary?: Boundary;
  evidence: string;
}

export interface Scenario {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  risk: "low" | "medium" | "high";
  objective: string;
  successCriteria: string[];
  baseline: Indicators;
  outcome: Indicators;
  steps: TraceStep[];
}

export const layerOrder: AgentLayer[] = [
  "consciousness",
  "operational",
  "integration",
];

export const layerDetails: Record<
  AgentLayer,
  { label: string; purpose: string }
> = {
  consciousness: {
    label: "Consciousness layer",
    purpose: "Frames intent, impact, safety, and the decision invariant.",
  },
  operational: {
    label: "Operational layer",
    purpose: "Collects evidence, plans work, and controls execution.",
  },
  integration: {
    label: "Integration layer",
    purpose: "Coordinates handoffs, records evidence, and closes the loop.",
  },
};

export const agents: Agent[] = [
  {
    id: "kael",
    name: "Kael",
    mark: "K",
    layer: "consciousness",
    role: "Ethical reasoning",
    responsibility:
      "Turns owner intent and human impact into decision constraints.",
  },
  {
    id: "lumina",
    name: "Lumina",
    mark: "L",
    layer: "consciousness",
    role: "Empathic resonance",
    responsibility:
      "Represents affected people, communication needs, and care.",
  },
  {
    id: "aether",
    name: "Aether",
    mark: "Ae",
    layer: "consciousness",
    role: "Flow dynamics",
    responsibility: "Shapes an ordered flow and spots coordination friction.",
  },
  {
    id: "vega",
    name: "Vega",
    mark: "V",
    layer: "consciousness",
    role: "Safety integration",
    responsibility:
      "Checks stop conditions, reversibility, and safe release gates.",
  },
  {
    id: "grok",
    name: "Grok",
    mark: "G",
    layer: "operational",
    role: "Pattern recognition",
    responsibility: "Connects evidence, anomalies, and likely failure modes.",
  },
  {
    id: "manus",
    name: "Manus",
    mark: "M",
    layer: "operational",
    role: "Operational core",
    responsibility: "Turns an approved plan into bounded, reversible actions.",
  },
  {
    id: "kavach",
    name: "Kavach",
    mark: "Kv",
    layer: "operational",
    role: "Security shield",
    responsibility:
      "Traces trust boundaries and rejects unsafe execution paths.",
  },
  {
    id: "gemini",
    name: "Gemini",
    mark: "Ge",
    layer: "operational",
    role: "Scout",
    responsibility:
      "Collects external context and labels the quality of evidence.",
  },
  {
    id: "agni",
    name: "Agni",
    mark: "Ag",
    layer: "operational",
    role: "Transformation",
    responsibility:
      "Converts a settled direction into a concrete change proposal.",
  },
  {
    id: "sangha",
    name: "SanghaCore",
    mark: "Sa",
    layer: "integration",
    role: "Collective unity",
    responsibility:
      "Reconciles specialist outputs into one accountable decision.",
  },
  {
    id: "shadow",
    name: "Shadow",
    mark: "Sh",
    layer: "integration",
    role: "Memory archive",
    responsibility: "Preserves context, deferred work, and reusable lessons.",
  },
  {
    id: "blackbox",
    name: "Blackbox",
    mark: "Bb",
    layer: "integration",
    role: "Data integrity",
    responsibility:
      "Records the decision, evidence, gates, and observed outcome.",
  },
  {
    id: "entityx",
    name: "EntityX",
    mark: "Ex",
    layer: "integration",
    role: "Introspective companion",
    responsibility:
      "Surfaces assumptions and asks what the system may have missed.",
  },
];

export const scenarios: Scenario[] = [
  {
    id: "breaking-change",
    eyebrow: "Release decision",
    title: "Ship a breaking change",
    summary:
      "Map a risky release from evidence gathering through a human approval gate and durable record.",
    risk: "high",
    objective:
      "Decide whether a compatibility-breaking release is justified, reversible, and ready to ship.",
    successCriteria: [
      "Affected users and interfaces are named",
      "Security and rollback risks are explicit",
      "A human owner makes the release decision",
      "Evidence and rollback conditions are recorded",
    ],
    baseline: {
      harmony: 0.54,
      resilience: 0.48,
      prana: 0.62,
      drishti: 0.51,
      klesha: 0.34,
    },
    outcome: {
      harmony: 0.82,
      resilience: 0.88,
      prana: 0.64,
      drishti: 0.86,
      klesha: 0.12,
    },
    steps: [
      {
        agentId: "gemini",
        title: "Collect the change surface",
        detail:
          "Inventory affected interfaces, downstream users, compatibility promises, and current alternatives.",
        boundary: "tool",
        evidence: "Interface inventory + compatibility evidence",
      },
      {
        agentId: "grok",
        title: "Find coupling and failure patterns",
        detail:
          "Relate the proposed change to known breakpoints, migration cost, and likely regressions.",
        evidence: "Failure-mode map",
      },
      {
        agentId: "kavach",
        title: "Trace the attack and rollback surface",
        detail:
          "Check whether the change widens permissions, weakens validation, or creates an irreversible migration.",
        boundary: "policy",
        evidence: "Threat and rollback review",
      },
      {
        agentId: "kael",
        title: "Test the decision invariant",
        detail:
          "Balance user impact, owner intent, and the smallest change that can achieve the product outcome.",
        boundary: "policy",
        evidence: "Decision constraints",
      },
      {
        agentId: "sangha",
        title: "Compose a release decision",
        detail:
          "Reconcile the evidence into ship, revise, or stop—without hiding dissent or uncertainty.",
        boundary: "human",
        evidence: "Owner-ready decision brief",
      },
      {
        agentId: "manus",
        title: "Prepare the reversible execution",
        detail:
          "Produce the migration, verification, communication, and rollback sequence approved by the owner.",
        boundary: "tool",
        evidence: "Bounded implementation plan",
      },
      {
        agentId: "vega",
        title: "Enforce the release gate",
        detail:
          "Release only when acceptance checks pass and the named human approval is present.",
        boundary: "human",
        evidence: "Gate result + stop conditions",
      },
      {
        agentId: "blackbox",
        title: "Seal the decision record",
        detail:
          "Record the evidence, approval, expected outcome, and rollback trigger for later audit.",
        boundary: "memory",
        evidence: "Immutable decision record",
      },
    ],
  },
  {
    id: "incident",
    eyebrow: "Operational response",
    title: "Triage a production incident",
    summary:
      "Separate observation from action, contain harm, and carry verified learning into the next run.",
    risk: "high",
    objective:
      "Restore a degraded service without turning uncertainty into unsafe or unaudited action.",
    successCriteria: [
      "Symptoms and confirmed facts remain separate",
      "Containment is reversible",
      "Every production action has an owner",
      "The post-incident record captures proof gaps",
    ],
    baseline: {
      harmony: 0.42,
      resilience: 0.55,
      prana: 0.81,
      drishti: 0.38,
      klesha: 0.62,
    },
    outcome: {
      harmony: 0.78,
      resilience: 0.91,
      prana: 0.72,
      drishti: 0.89,
      klesha: 0.16,
    },
    steps: [
      {
        agentId: "aether",
        title: "Stabilize the response flow",
        detail:
          "Define incident roles, a shared clock, stop conditions, and the next evidence checkpoint.",
        boundary: "policy",
        evidence: "Response frame",
      },
      {
        agentId: "gemini",
        title: "Gather bounded observations",
        detail:
          "Collect symptoms, recent changes, health signals, and user impact without inferring a cause.",
        boundary: "tool",
        evidence: "Timestamped observations",
      },
      {
        agentId: "grok",
        title: "Rank plausible causes",
        detail:
          "Correlate signals into testable hypotheses and state what evidence would falsify each one.",
        evidence: "Hypothesis ledger",
      },
      {
        agentId: "manus",
        title: "Prepare the smallest containment",
        detail:
          "Choose a reversible action with a named owner, expected signal, and abort threshold.",
        boundary: "tool",
        evidence: "Containment proposal",
      },
      {
        agentId: "vega",
        title: "Hold the production gate",
        detail:
          "Require human approval before the containment action crosses into production.",
        boundary: "human",
        evidence: "Approval + stop conditions",
      },
      {
        agentId: "blackbox",
        title: "Record actions as they happen",
        detail:
          "Preserve timestamps, owners, commands, observations, and reversals without storing secrets.",
        boundary: "memory",
        evidence: "Incident action log",
      },
      {
        agentId: "shadow",
        title: "Archive verified learning",
        detail:
          "Carry forward only confirmed causes, effective controls, and explicitly unresolved questions.",
        boundary: "memory",
        evidence: "Reusable incident memory",
      },
      {
        agentId: "entityx",
        title: "Challenge the closure",
        detail:
          "Ask which assumptions survived untested and what would make the same incident recur.",
        evidence: "Post-incident proof gaps",
      },
    ],
  },
  {
    id: "ambiguous-request",
    eyebrow: "Discovery",
    title: "Clarify an ambiguous request",
    summary:
      "Turn a broad idea into a testable, humane, and deliberately bounded product direction.",
    risk: "medium",
    objective:
      "Reach a useful next step without fabricating user needs or inflating an uncertain request into a platform.",
    successCriteria: [
      "The affected person and desired outcome are concrete",
      "Assumptions are visible",
      "The smallest useful product slice is named",
      "Deferred ideas stay outside the committed scope",
    ],
    baseline: {
      harmony: 0.46,
      resilience: 0.61,
      prana: 0.58,
      drishti: 0.31,
      klesha: 0.53,
    },
    outcome: {
      harmony: 0.84,
      resilience: 0.69,
      prana: 0.58,
      drishti: 0.81,
      klesha: 0.18,
    },
    steps: [
      {
        agentId: "lumina",
        title: "Name the person and impact",
        detail:
          "Translate the request into a concrete user, situation, frustration, and desired change.",
        evidence: "Human-centered problem frame",
      },
      {
        agentId: "entityx",
        title: "Expose hidden assumptions",
        detail:
          "Separate supplied facts from guesses, preferences, and questions that still need an owner.",
        evidence: "Assumption ledger",
      },
      {
        agentId: "grok",
        title: "Recognize the product pattern",
        detail:
          "Match the problem to proven product shapes without copying a larger platform by default.",
        evidence: "Candidate product shapes",
      },
      {
        agentId: "kael",
        title: "Set the decision boundaries",
        detail:
          "Define what would be misleading, harmful, or unjustified given the available evidence.",
        boundary: "policy",
        evidence: "Product constraints",
      },
      {
        agentId: "aether",
        title: "Shape the smallest complete journey",
        detail:
          "Order onboarding, core action, output, failure handling, and the next user decision.",
        evidence: "Vertical-slice journey",
      },
      {
        agentId: "sangha",
        title: "Reconcile scope and tradeoffs",
        detail:
          "Compose one direction and preserve meaningful dissent as explicit acceptance risks.",
        boundary: "human",
        evidence: "Owner decision brief",
      },
      {
        agentId: "agni",
        title: "Transform direction into a test",
        detail:
          "Define a reversible implementation slice and the evidence that would justify expansion.",
        boundary: "tool",
        evidence: "Validation-ready slice",
      },
      {
        agentId: "shadow",
        title: "Preserve the learning boundary",
        detail:
          "Record chosen scope, deferred ideas, and the conditions that would reopen the decision.",
        boundary: "memory",
        evidence: "Decision memory",
      },
    ],
  },
];

export const indicatorDetails: Array<{
  key: keyof Indicators;
  label: string;
  definition: string;
  direction: "up" | "down";
}> = [
  {
    key: "harmony",
    label: "Harmony",
    definition: "Decision coherence",
    direction: "up",
  },
  {
    key: "resilience",
    label: "Resilience",
    definition: "Guardrail coverage",
    direction: "up",
  },
  {
    key: "prana",
    label: "Prana",
    definition: "Execution capacity",
    direction: "up",
  },
  {
    key: "drishti",
    label: "Drishti",
    definition: "Focus and clarity",
    direction: "up",
  },
  {
    key: "klesha",
    label: "Klesha",
    definition: "Unresolved friction",
    direction: "down",
  },
];

export function findAgent(agentId: string): Agent {
  const agent = agents.find(candidate => candidate.id === agentId);
  if (!agent) {
    throw new Error(`Unknown agent: ${agentId}`);
  }
  return agent;
}

export function findScenario(scenarioId: string | null | undefined): Scenario {
  const fallbackScenario = scenarios.at(0);
  if (!fallbackScenario) {
    throw new Error("The reference model must define at least one scenario.");
  }

  return (
    scenarios.find(candidate => candidate.id === scenarioId) ?? fallbackScenario
  );
}

export function indicatorsAtProgress(
  scenario: Scenario,
  progress: number
): Indicators {
  const bounded = Math.min(1, Math.max(0, progress));
  return Object.fromEntries(
    indicatorDetails.map(({ key }) => [
      key,
      Number(
        (
          scenario.baseline[key] +
          (scenario.outcome[key] - scenario.baseline[key]) * bounded
        ).toFixed(2)
      ),
    ])
  ) as unknown as Indicators;
}

export function createBlueprint(
  scenarioId: string,
  completedAt: string
): Blueprint {
  const scenario = findScenario(scenarioId);
  const activeAgentIds = new Set(scenario.steps.map(step => step.agentId));

  return {
    schemaVersion: blueprintSchemaVersion,
    mode: "illustrative-reference",
    generatedAt: completedAt,
    scenario: {
      id: scenario.id,
      title: scenario.title,
      risk: scenario.risk,
      objective: scenario.objective,
      successCriteria: scenario.successCriteria,
    },
    indicators: {
      note: "Illustrative coordination indicators, not telemetry.",
      baseline: scenario.baseline,
      outcome: scenario.outcome,
    },
    agents: agents
      .filter(agent => activeAgentIds.has(agent.id))
      .map(({ id, name, layer, role, responsibility }) => ({
        id,
        name,
        layer,
        role,
        responsibility,
      })),
    trace: scenario.steps.map((step, index) => ({
      order: index + 1,
      agentId: step.agentId,
      title: step.title,
      action: step.detail,
      boundary: step.boundary ?? null,
      evidence: step.evidence,
    })),
    runtime: {
      executesAgents: false,
      callsExternalServices: false,
      storesRemoteData: false,
      requiresHumanApprovalAt: scenario.steps
        .map((step, index) => (step.boundary === "human" ? index + 1 : null))
        .filter((step): step is number => step !== null),
    },
  };
}
