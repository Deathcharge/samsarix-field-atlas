export const blueprintSchemaVersion = "samsarix-field-atlas/1" as const;

export type BlueprintBoundary = "human" | "policy" | "tool" | "memory";
export type BlueprintLayer = "consciousness" | "operational" | "integration";
export type BlueprintRisk = "low" | "medium" | "high";

export interface BlueprintIndicators {
  harmony: number;
  resilience: number;
  prana: number;
  drishti: number;
  klesha: number;
}

export interface Blueprint {
  schemaVersion: typeof blueprintSchemaVersion;
  mode: "illustrative-reference";
  generatedAt: string;
  scenario: {
    id: string;
    title: string;
    risk: BlueprintRisk;
    objective: string;
    successCriteria: string[];
  };
  indicators: {
    note: string;
    baseline: BlueprintIndicators;
    outcome: BlueprintIndicators;
  };
  agents: Array<{
    id: string;
    name: string;
    layer: BlueprintLayer;
    role: string;
    responsibility: string;
  }>;
  trace: Array<{
    order: number;
    agentId: string;
    title: string;
    action: string;
    boundary: BlueprintBoundary | null;
    evidence: string;
  }>;
  runtime: {
    executesAgents: boolean;
    callsExternalServices: boolean;
    storesRemoteData: boolean;
    requiresHumanApprovalAt: number[];
  };
}

export type FindingSeverity = "error" | "warning" | "pass";

export interface BlueprintFinding {
  code: string;
  severity: FindingSeverity;
  path: string;
  message: string;
}

export interface BlueprintAnalysis {
  status: "invalid" | "review" | "ready";
  findings: BlueprintFinding[];
  counts: Record<FindingSeverity, number>;
  blueprint?: Blueprint;
  metrics?: {
    roles: number;
    stages: number;
    humanGates: number;
    evidenceArtifacts: number;
  };
}

const layers = new Set<BlueprintLayer>([
  "consciousness",
  "operational",
  "integration",
]);
const risks = new Set<BlueprintRisk>(["low", "medium", "high"]);
const boundaries = new Set<BlueprintBoundary>([
  "human",
  "policy",
  "tool",
  "memory",
]);
const indicatorKeys: Array<keyof BlueprintIndicators> = [
  "harmony",
  "resilience",
  "prana",
  "drishti",
  "klesha",
];
const identifierPattern = /^[a-z][a-z0-9-]*$/;
const isoTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const markdownMetacharacters = /([\\`*_[\]{}()<>#+!|])/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown, maximum = 2_000): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maximum
  );
}

function sameNumbers(left: number[], right: number[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function addFinding(
  findings: BlueprintFinding[],
  severity: FindingSeverity,
  code: string,
  path: string,
  message: string
) {
  findings.push({ code, severity, path, message });
}

function checkAllowedFields(
  value: Record<string, unknown>,
  allowed: string[],
  path: string,
  findings: BlueprintFinding[]
) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      addFinding(
        findings,
        "warning",
        "UNRECOGNIZED_FIELD",
        `${path}.${key}`,
        "This additive field is not interpreted by Field Atlas v1."
      );
    }
  }
}

function requireRecord(
  value: unknown,
  path: string,
  findings: BlueprintFinding[]
): Record<string, unknown> | null {
  if (!isRecord(value)) {
    addFinding(
      findings,
      "error",
      "EXPECTED_OBJECT",
      path,
      "Expected an object."
    );
    return null;
  }
  return value;
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  findings: BlueprintFinding[],
  maximum = 2_000
): string | null {
  const value = record[key];
  if (!isNonEmptyString(value, maximum)) {
    addFinding(
      findings,
      "error",
      "EXPECTED_STRING",
      `${path}.${key}`,
      `Expected a non-empty string no longer than ${maximum} characters.`
    );
    return null;
  }
  return value;
}

function requireBoolean(
  record: Record<string, unknown>,
  key: string,
  path: string,
  findings: BlueprintFinding[]
): boolean | null {
  const value = record[key];
  if (typeof value !== "boolean") {
    addFinding(
      findings,
      "error",
      "EXPECTED_BOOLEAN",
      `${path}.${key}`,
      "Expected a boolean."
    );
    return null;
  }
  return value;
}

function validateIndicators(
  value: unknown,
  path: string,
  findings: BlueprintFinding[]
) {
  const record = requireRecord(value, path, findings);
  if (!record) return;

  checkAllowedFields(record, indicatorKeys, path, findings);
  for (const key of indicatorKeys) {
    const indicator = record[key];
    if (
      typeof indicator !== "number" ||
      !Number.isFinite(indicator) ||
      indicator < 0 ||
      indicator > 1
    ) {
      addFinding(
        findings,
        "error",
        "INVALID_INDICATOR",
        `${path}.${key}`,
        "Expected a finite number from 0 through 1."
      );
    }
  }
}

export function validateBlueprint(value: unknown): BlueprintAnalysis {
  const findings: BlueprintFinding[] = [];
  const root = requireRecord(value, "$", findings);

  if (!root) {
    return summarize(findings);
  }

  checkAllowedFields(
    root,
    [
      "schemaVersion",
      "mode",
      "generatedAt",
      "scenario",
      "indicators",
      "agents",
      "trace",
      "runtime",
    ],
    "$",
    findings
  );

  if (root.schemaVersion !== blueprintSchemaVersion) {
    addFinding(
      findings,
      "error",
      "UNSUPPORTED_SCHEMA",
      "$.schemaVersion",
      `Expected ${blueprintSchemaVersion}; unknown major versions are rejected.`
    );
  }
  if (root.mode !== "illustrative-reference") {
    addFinding(
      findings,
      "error",
      "UNSUPPORTED_MODE",
      "$.mode",
      "Field Atlas v1 accepts only illustrative-reference blueprints."
    );
  }
  if (
    !isNonEmptyString(root.generatedAt, 64) ||
    !isoTimestampPattern.test(root.generatedAt) ||
    Number.isNaN(Date.parse(root.generatedAt))
  ) {
    addFinding(
      findings,
      "error",
      "INVALID_TIMESTAMP",
      "$.generatedAt",
      "Expected an ISO-compatible generation timestamp."
    );
  }

  const scenario = requireRecord(root.scenario, "$.scenario", findings);
  let scenarioRisk: BlueprintRisk | null = null;
  if (scenario) {
    checkAllowedFields(
      scenario,
      ["id", "title", "risk", "objective", "successCriteria"],
      "$.scenario",
      findings
    );
    const scenarioId = requireString(
      scenario,
      "id",
      "$.scenario",
      findings,
      128
    );
    if (scenarioId && !identifierPattern.test(scenarioId)) {
      addFinding(
        findings,
        "error",
        "INVALID_IDENTIFIER",
        "$.scenario.id",
        "Expected a lowercase identifier beginning with a letter and containing only letters, numbers, or hyphens."
      );
    }
    requireString(scenario, "title", "$.scenario", findings, 240);
    requireString(scenario, "objective", "$.scenario", findings, 2_000);
    if (
      typeof scenario.risk !== "string" ||
      !risks.has(scenario.risk as BlueprintRisk)
    ) {
      addFinding(
        findings,
        "error",
        "INVALID_RISK",
        "$.scenario.risk",
        "Expected low, medium, or high."
      );
    } else {
      scenarioRisk = scenario.risk as BlueprintRisk;
    }

    if (
      !Array.isArray(scenario.successCriteria) ||
      scenario.successCriteria.length === 0 ||
      scenario.successCriteria.length > 32
    ) {
      addFinding(
        findings,
        "error",
        "INVALID_SUCCESS_CRITERIA",
        "$.scenario.successCriteria",
        "Expected between 1 and 32 success criteria."
      );
    } else {
      scenario.successCriteria.forEach((criterion, index) => {
        if (!isNonEmptyString(criterion, 500)) {
          addFinding(
            findings,
            "error",
            "INVALID_SUCCESS_CRITERION",
            `$.scenario.successCriteria[${index}]`,
            "Expected a non-empty string no longer than 500 characters."
          );
        }
      });
    }
  }

  const indicators = requireRecord(root.indicators, "$.indicators", findings);
  if (indicators) {
    checkAllowedFields(
      indicators,
      ["note", "baseline", "outcome"],
      "$.indicators",
      findings
    );
    requireString(indicators, "note", "$.indicators", findings, 500);
    validateIndicators(indicators.baseline, "$.indicators.baseline", findings);
    validateIndicators(indicators.outcome, "$.indicators.outcome", findings);
  }

  const agentIds = new Set<string>();
  if (
    !Array.isArray(root.agents) ||
    root.agents.length === 0 ||
    root.agents.length > 64
  ) {
    addFinding(
      findings,
      "error",
      "INVALID_AGENTS",
      "$.agents",
      "Expected between 1 and 64 role declarations."
    );
  } else {
    root.agents.forEach((entry, index) => {
      const path = `$.agents[${index}]`;
      const agent = requireRecord(entry, path, findings);
      if (!agent) return;

      checkAllowedFields(
        agent,
        ["id", "name", "layer", "role", "responsibility"],
        path,
        findings
      );
      const id = requireString(agent, "id", path, findings, 128);
      requireString(agent, "name", path, findings, 240);
      requireString(agent, "role", path, findings, 500);
      requireString(agent, "responsibility", path, findings, 2_000);
      if (
        typeof agent.layer !== "string" ||
        !layers.has(agent.layer as BlueprintLayer)
      ) {
        addFinding(
          findings,
          "error",
          "INVALID_LAYER",
          `${path}.layer`,
          "Expected consciousness, operational, or integration."
        );
      }
      if (id) {
        if (!identifierPattern.test(id)) {
          addFinding(
            findings,
            "error",
            "INVALID_IDENTIFIER",
            `${path}.id`,
            "Expected a lowercase identifier beginning with a letter and containing only letters, numbers, or hyphens."
          );
        }
        if (agentIds.has(id)) {
          addFinding(
            findings,
            "error",
            "DUPLICATE_AGENT",
            `${path}.id`,
            `Role identifier ${id} is declared more than once.`
          );
        }
        agentIds.add(id);
      }
    });
  }

  const observedHumanGates: number[] = [];
  const observedBoundaries = new Set<BlueprintBoundary>();
  let evidenceArtifacts = 0;
  if (
    !Array.isArray(root.trace) ||
    root.trace.length === 0 ||
    root.trace.length > 128
  ) {
    addFinding(
      findings,
      "error",
      "INVALID_TRACE",
      "$.trace",
      "Expected between 1 and 128 ordered stages."
    );
  } else {
    root.trace.forEach((entry, index) => {
      const path = `$.trace[${index}]`;
      const step = requireRecord(entry, path, findings);
      if (!step) return;

      checkAllowedFields(
        step,
        ["order", "agentId", "title", "action", "boundary", "evidence"],
        path,
        findings
      );
      if (!Number.isInteger(step.order) || step.order !== index + 1) {
        addFinding(
          findings,
          "error",
          "INVALID_ORDER",
          `${path}.order`,
          `Expected the contiguous one-based order ${index + 1}.`
        );
      }
      const agentId = requireString(step, "agentId", path, findings, 128);
      requireString(step, "title", path, findings, 500);
      requireString(step, "action", path, findings, 4_000);
      const evidence = requireString(step, "evidence", path, findings, 2_000);
      if (evidence) evidenceArtifacts += 1;
      if (agentId && !agentIds.has(agentId)) {
        addFinding(
          findings,
          "error",
          "UNKNOWN_AGENT",
          `${path}.agentId`,
          `Trace stage references undeclared role ${agentId}.`
        );
      }

      if (step.boundary !== null) {
        if (
          typeof step.boundary !== "string" ||
          !boundaries.has(step.boundary as BlueprintBoundary)
        ) {
          addFinding(
            findings,
            "error",
            "INVALID_BOUNDARY",
            `${path}.boundary`,
            "Expected human, policy, tool, memory, or null."
          );
        } else {
          const boundary = step.boundary as BlueprintBoundary;
          observedBoundaries.add(boundary);
          if (boundary === "human" && typeof step.order === "number") {
            observedHumanGates.push(step.order);
          }
        }
      }
    });
  }

  const runtime = requireRecord(root.runtime, "$.runtime", findings);
  let declaredHumanGates: number[] | null = null;
  if (runtime) {
    checkAllowedFields(
      runtime,
      [
        "executesAgents",
        "callsExternalServices",
        "storesRemoteData",
        "requiresHumanApprovalAt",
      ],
      "$.runtime",
      findings
    );
    const executesAgents = requireBoolean(
      runtime,
      "executesAgents",
      "$.runtime",
      findings
    );
    const callsExternalServices = requireBoolean(
      runtime,
      "callsExternalServices",
      "$.runtime",
      findings
    );
    const storesRemoteData = requireBoolean(
      runtime,
      "storesRemoteData",
      "$.runtime",
      findings
    );
    if (
      [executesAgents, callsExternalServices, storesRemoteData].some(
        value => value === true
      )
    ) {
      addFinding(
        findings,
        "error",
        "RUNTIME_CONTRADICTION",
        "$.runtime",
        "An illustrative-reference blueprint cannot claim agent execution, external calls, or remote storage."
      );
    }

    if (!Array.isArray(runtime.requiresHumanApprovalAt)) {
      addFinding(
        findings,
        "error",
        "INVALID_APPROVALS",
        "$.runtime.requiresHumanApprovalAt",
        "Expected an array of unique trace order numbers."
      );
    } else {
      const values = runtime.requiresHumanApprovalAt;
      if (
        values.some(value => !Number.isInteger(value) || value < 1) ||
        new Set(values).size !== values.length
      ) {
        addFinding(
          findings,
          "error",
          "INVALID_APPROVALS",
          "$.runtime.requiresHumanApprovalAt",
          "Approval positions must be unique positive integers."
        );
      } else {
        declaredHumanGates = values as number[];
      }
    }
  }

  if (
    declaredHumanGates &&
    !sameNumbers(declaredHumanGates, observedHumanGates)
  ) {
    addFinding(
      findings,
      "error",
      "APPROVAL_MISMATCH",
      "$.runtime.requiresHumanApprovalAt",
      "Declared approval positions must exactly match trace stages with a human boundary."
    );
  }

  if (scenarioRisk === "high" && observedHumanGates.length === 0) {
    addFinding(
      findings,
      "error",
      "MISSING_HUMAN_GATE",
      "$.trace",
      "A high-risk scenario requires at least one explicit human boundary."
    );
  }
  for (const boundary of ["policy", "memory"] as const) {
    if (!observedBoundaries.has(boundary)) {
      addFinding(
        findings,
        "warning",
        `MISSING_${boundary.toUpperCase()}_BOUNDARY`,
        "$.trace",
        `No ${boundary} boundary is declared; confirm that this omission is intentional.`
      );
    }
  }

  if (!findings.some(finding => finding.severity === "error")) {
    addFinding(
      findings,
      "pass",
      "SCHEMA_CONFORMANT",
      "$",
      "Required v1 fields, types, limits, and references are internally consistent."
    );
    addFinding(
      findings,
      "pass",
      "EVIDENCE_NAMED",
      "$.trace",
      `All ${evidenceArtifacts} stages name an expected evidence artifact.`
    );
    addFinding(
      findings,
      "pass",
      "AUTHORITY_ALIGNED",
      "$.runtime.requiresHumanApprovalAt",
      `${observedHumanGates.length} human approval ${observedHumanGates.length === 1 ? "gate is" : "gates are"} aligned with the trace.`
    );
    addFinding(
      findings,
      "pass",
      "RUNTIME_DISCLOSED",
      "$.runtime",
      "The reference truthfully disclaims execution, external calls, and remote storage."
    );
  }

  const analysis = summarize(findings);
  if (analysis.status !== "invalid") {
    analysis.blueprint = value as Blueprint;
    analysis.metrics = {
      roles: Array.isArray(root.agents) ? root.agents.length : 0,
      stages: Array.isArray(root.trace) ? root.trace.length : 0,
      humanGates: observedHumanGates.length,
      evidenceArtifacts,
    };
  }
  return analysis;
}

function summarize(findings: BlueprintFinding[]): BlueprintAnalysis {
  const counts: Record<FindingSeverity, number> = {
    error: findings.filter(finding => finding.severity === "error").length,
    warning: findings.filter(finding => finding.severity === "warning").length,
    pass: findings.filter(finding => finding.severity === "pass").length,
  };
  return {
    status:
      counts.error > 0 ? "invalid" : counts.warning > 0 ? "review" : "ready",
    findings,
    counts,
  };
}

function markdownText(value: string): string {
  return value
    .replaceAll(/\s+/g, " ")
    .trim()
    .replace(markdownMetacharacters, "\\$1");
}

export function blueprintToMarkdown(
  blueprint: Blueprint,
  analysis = validateBlueprint(blueprint)
): string {
  const humanGates = blueprint.runtime.requiresHumanApprovalAt;
  const agentsById = new Map(
    blueprint.agents.map(agent => [agent.id, agent] as const)
  );
  const lines = [
    `# ${markdownText(blueprint.scenario.title)}`,
    "",
    "> Samsarix Field Atlas review packet. This document describes an illustrative coordination design; it is not proof that any action or approval occurred.",
    "",
    "## Contract",
    "",
    `- Schema: \`${blueprint.schemaVersion}\``,
    `- Generated: ${blueprint.generatedAt}`,
    `- Risk: **${blueprint.scenario.risk}**`,
    `- Conformance: **${analysis.status}** (${analysis.counts.error} errors, ${analysis.counts.warning} warnings)`,
    `- Human approval gates: ${humanGates.length > 0 ? humanGates.join(", ") : "none declared"}`,
    "",
    "## Objective",
    "",
    markdownText(blueprint.scenario.objective),
    "",
    "## Success criteria",
    "",
    ...blueprint.scenario.successCriteria.map(
      criterion => `- [ ] ${markdownText(criterion)}`
    ),
    "",
    "## Ordered handoffs",
    "",
    "| Stage | Role | Boundary | Intended action | Expected evidence |",
    "| ---: | --- | --- | --- | --- |",
    ...blueprint.trace.map(step => {
      const agent = agentsById.get(step.agentId);
      return `| ${step.order} | ${markdownText(agent?.name ?? step.agentId)} | ${step.boundary ?? "none"} | ${markdownText(step.action)} | ${markdownText(step.evidence)} |`;
    }),
    "",
    "## Runtime disclosure",
    "",
    `- Executes agents: **${blueprint.runtime.executesAgents ? "yes" : "no"}**`,
    `- Calls external services: **${blueprint.runtime.callsExternalServices ? "yes" : "no"}**`,
    `- Stores remote data: **${blueprint.runtime.storesRemoteData ? "yes" : "no"}**`,
    "",
    "## Conformance findings",
    "",
    ...analysis.findings.map(
      finding =>
        `- **${finding.severity.toUpperCase()} · ${finding.code}** at ${markdownText(finding.path)}: ${markdownText(finding.message)}`
    ),
    "",
    "---",
    "Generated locally by Samsarix Field Atlas. Validate evidence and authority in the real implementation before acting.",
    "",
  ];

  return lines.join("\n");
}
