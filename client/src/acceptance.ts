import { a2aProtocolVersion, type A2AAgentCard } from "./a2a";
import {
  validateBlueprint,
  type Blueprint,
  type BlueprintFinding,
  type FindingSeverity,
} from "./blueprint";

export const a2aAcceptanceSchemaVersion =
  "samsarix-field-atlas/a2a-acceptance/1" as const;

export type A2AAcceptanceEnvironment = "local" | "staging" | "production";
export type A2ARetentionMode = "none" | "transient" | "retained";
export type A2ADataClassification =
  "public" | "internal" | "confidential" | "restricted";
export type A2AAcceptanceCategory =
  | "discovery"
  | "security"
  | "compatibility"
  | "reliability"
  | "governance"
  | "evidence"
  | "privacy";
export type A2AAcceptanceSource = "a2a-1.0" | "field-atlas" | "owner-profile";

export interface A2AAcceptanceProfile {
  owner: string;
  supportContact: string;
  environment: A2AAcceptanceEnvironment;
  maxRequestBytes: number;
  responseDeadlineMs: number;
  maxConcurrentTasks: number;
  retentionMode: A2ARetentionMode;
  retentionHours: number;
  dataClassification: A2ADataClassification;
  externalProcessors: boolean;
}

export interface A2AAcceptanceCase {
  id: string;
  category: A2AAcceptanceCategory;
  title: string;
  blocking: boolean;
  source: A2AAcceptanceSource;
  requirement: string;
  procedure: string[];
  expected: string;
  evidence: string[];
}

export interface A2AAcceptanceManifest {
  schemaVersion: typeof a2aAcceptanceSchemaVersion;
  generatedAt: string;
  status: "plan-not-run";
  source: {
    blueprint: {
      schemaVersion: Blueprint["schemaVersion"];
      scenarioId: string;
      title: string;
      risk: Blueprint["scenario"]["risk"];
    };
    agentCard: {
      name: string;
      version: string;
      interfaceUrl: string;
      binding: string;
      protocolVersion: typeof a2aProtocolVersion;
      inputModes: string[];
      outputModes: string[];
      authentication: "bearer" | "public";
    };
  };
  acceptance: A2AAcceptanceProfile;
  summary: {
    testCases: number;
    blockingCases: number;
    officialTckCases: number;
    humanApprovalCases: number;
    evidenceCases: number;
  };
  testCases: A2AAcceptanceCase[];
}

export interface A2AAcceptanceAnalysis {
  status: "invalid" | "review" | "ready";
  findings: BlueprintFinding[];
  counts: Record<FindingSeverity, number>;
  manifest?: A2AAcceptanceManifest;
}

const environments = new Set<A2AAcceptanceEnvironment>([
  "local",
  "staging",
  "production",
]);
const retentionModes = new Set<A2ARetentionMode>([
  "none",
  "transient",
  "retained",
]);
const classifications = new Set<A2ADataClassification>([
  "public",
  "internal",
  "confidential",
  "restricted",
]);
const protocolBindings = new Set(["JSONRPC", "GRPC", "HTTP+JSON"]);
const profileFields = new Set<keyof A2AAcceptanceProfile>([
  "owner",
  "supportContact",
  "environment",
  "maxRequestBytes",
  "responseDeadlineMs",
  "maxConcurrentTasks",
  "retentionMode",
  "retentionHours",
  "dataClassification",
  "externalProcessors",
]);
const markdownMetacharacters = /([\\`*_[\]{}()<>#+!|])/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown, maximum: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maximum
  );
}

function addFinding(
  findings: BlueprintFinding[],
  severity: FindingSeverity,
  code: string,
  path: string,
  message: string
) {
  findings.push({ severity, code, path, message });
}

function validInteger(value: unknown, minimum: number, maximum: number) {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

function validSupportContact(value: string): boolean {
  const trimmed = value.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return true;
  try {
    const url = new URL(trimmed);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

function validateTimestamp(value: string, findings: BlueprintFinding[]) {
  const parsed = new Date(value);
  if (
    value.length > 64 ||
    Number.isNaN(parsed.valueOf()) ||
    parsed.toISOString() !== value
  ) {
    addFinding(
      findings,
      "error",
      "INVALID_GENERATED_AT",
      "$.generatedAt",
      "Supply a canonical UTC ISO timestamp such as 2026-08-01T12:00:00.000Z."
    );
  }
}

function validateAgentCard(
  value: unknown,
  blueprint: Blueprint,
  findings: BlueprintFinding[]
): A2AAgentCard | null {
  const findingsStart = findings.length;
  if (!isRecord(value)) {
    addFinding(
      findings,
      "error",
      "INVALID_AGENT_CARD",
      "$.agentCard",
      "Supply a Field Atlas-generated A2A 1.0 draft Agent Card object."
    );
    return null;
  }

  if (
    !nonEmptyString(value.name, 240) ||
    !nonEmptyString(value.description, 2_000) ||
    !nonEmptyString(value.version, 128)
  ) {
    addFinding(
      findings,
      "error",
      "INVALID_AGENT_CARD_IDENTITY",
      "$.agentCard",
      "The Agent Card requires a bounded name, description, and version."
    );
  }

  const interfaces = value.supportedInterfaces;
  const primary = Array.isArray(interfaces) ? interfaces[0] : undefined;
  if (!isRecord(primary)) {
    addFinding(
      findings,
      "error",
      "MISSING_A2A_INTERFACE",
      "$.agentCard.supportedInterfaces[0]",
      "The Agent Card requires a primary supported interface."
    );
  } else {
    if (primary.protocolVersion !== a2aProtocolVersion) {
      addFinding(
        findings,
        "error",
        "UNSUPPORTED_A2A_VERSION",
        "$.agentCard.supportedInterfaces[0].protocolVersion",
        `This acceptance schema targets A2A ${a2aProtocolVersion}.`
      );
    }
    if (
      typeof primary.protocolBinding !== "string" ||
      !protocolBindings.has(primary.protocolBinding)
    ) {
      addFinding(
        findings,
        "error",
        "UNSUPPORTED_A2A_BINDING",
        "$.agentCard.supportedInterfaces[0].protocolBinding",
        "Choose an A2A 1.0 JSONRPC, GRPC, or HTTP+JSON interface."
      );
    }
    try {
      const endpoint = new URL(String(primary.url));
      if (
        (endpoint.protocol !== "https:" &&
          !(
            endpoint.protocol === "http:" &&
            ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname)
          )) ||
        endpoint.username ||
        endpoint.password ||
        endpoint.search ||
        endpoint.hash
      ) {
        throw new Error("unsafe endpoint");
      }
    } catch {
      addFinding(
        findings,
        "error",
        "INVALID_A2A_INTERFACE",
        "$.agentCard.supportedInterfaces[0].url",
        "The primary interface must be credential-free HTTPS, or loopback HTTP for local work."
      );
    }
  }

  const inputModes = value.defaultInputModes;
  const outputModes = value.defaultOutputModes;
  if (
    !Array.isArray(inputModes) ||
    inputModes.length === 0 ||
    !inputModes.every(mode => nonEmptyString(mode, 512)) ||
    !Array.isArray(outputModes) ||
    outputModes.length === 0 ||
    !outputModes.every(mode => nonEmptyString(mode, 512))
  ) {
    addFinding(
      findings,
      "error",
      "INVALID_AGENT_CARD_MODES",
      "$.agentCard.defaultInputModes",
      "The Agent Card requires at least one bounded input and output media mode."
    );
  }

  const skills = value.skills;
  const sourceSkill = Array.isArray(skills)
    ? skills.find(
        skill => isRecord(skill) && skill.id === blueprint.scenario.id
      )
    : undefined;
  if (!Array.isArray(skills) || !sourceSkill) {
    addFinding(
      findings,
      "error",
      "SOURCE_SKILL_MISMATCH",
      "$.agentCard.skills",
      `The Agent Card must retain source scenario skill ${blueprint.scenario.id}.`
    );
  } else if (
    sourceSkill.name !== blueprint.scenario.title ||
    sourceSkill.description !== blueprint.scenario.objective ||
    !Array.isArray(sourceSkill.inputModes) ||
    !Array.isArray(sourceSkill.outputModes)
  ) {
    addFinding(
      findings,
      "error",
      "SOURCE_SKILL_CONTENT_MISMATCH",
      "$.agentCard.skills",
      "The matching skill must retain the blueprint title, objective, and explicit media modes."
    );
  }

  const capabilities = value.capabilities;
  if (
    !isRecord(capabilities) ||
    typeof capabilities.streaming !== "boolean" ||
    typeof capabilities.pushNotifications !== "boolean"
  ) {
    addFinding(
      findings,
      "error",
      "INVALID_AGENT_CAPABILITIES",
      "$.agentCard.capabilities",
      "The draft requires explicit streaming and push-notification declarations."
    );
  }

  const hasSecuritySchemes = value.securitySchemes !== undefined;
  const hasSecurityRequirements = value.securityRequirements !== undefined;
  if (hasSecuritySchemes !== hasSecurityRequirements) {
    addFinding(
      findings,
      "error",
      "INCOMPLETE_AGENT_SECURITY",
      "$.agentCard.securitySchemes",
      "Supply both bearer security schemes and requirements, or omit both for an explicitly public card."
    );
  } else if (hasSecuritySchemes) {
    const securitySchemes = value.securitySchemes;
    const requirements = value.securityRequirements;
    const bearer = isRecord(securitySchemes)
      ? securitySchemes.bearerAuth
      : undefined;
    const httpScheme = isRecord(bearer)
      ? bearer.httpAuthSecurityScheme
      : undefined;
    const firstRequirement = Array.isArray(requirements)
      ? requirements[0]
      : undefined;
    const schemes = isRecord(firstRequirement)
      ? firstRequirement.schemes
      : undefined;
    const bearerRequirement = isRecord(schemes)
      ? schemes.bearerAuth
      : undefined;
    if (
      !isRecord(httpScheme) ||
      httpScheme.scheme !== "Bearer" ||
      !nonEmptyString(httpScheme.description, 1_000) ||
      !isRecord(bearerRequirement) ||
      !Array.isArray(bearerRequirement.list) ||
      !bearerRequirement.list.every(scope => typeof scope === "string")
    ) {
      addFinding(
        findings,
        "error",
        "INVALID_AGENT_SECURITY",
        "$.agentCard.securitySchemes",
        "The Field Atlas acceptance profile supports a complete bearer declaration or an explicitly public card."
      );
    }
  }

  return findings
    .slice(findingsStart)
    .some(finding => finding.severity === "error")
    ? null
    : (value as unknown as A2AAgentCard);
}

function validateProfile(
  value: unknown,
  findings: BlueprintFinding[]
): A2AAcceptanceProfile | null {
  const findingsStart = findings.length;
  if (!isRecord(value)) {
    addFinding(
      findings,
      "error",
      "INVALID_ACCEPTANCE_PROFILE",
      "$.acceptance",
      "Supply an acceptance owner profile object."
    );
    return null;
  }

  for (const field of Object.keys(value)) {
    if (!profileFields.has(field as keyof A2AAcceptanceProfile)) {
      addFinding(
        findings,
        "warning",
        "UNRECOGNIZED_PROFILE_FIELD",
        `$.acceptance.${field}`,
        "This additive field is not interpreted by the v1 acceptance planner."
      );
    }
  }

  if (!nonEmptyString(value.owner, 240)) {
    addFinding(
      findings,
      "error",
      "MISSING_ACCEPTANCE_OWNER",
      "$.acceptance.owner",
      "Name the person or team accountable for executing and signing off this plan."
    );
  }
  if (
    !nonEmptyString(value.supportContact, 320) ||
    !validSupportContact(value.supportContact)
  ) {
    addFinding(
      findings,
      "error",
      "INVALID_SUPPORT_CONTACT",
      "$.acceptance.supportContact",
      "Supply a support email address or credential-free HTTPS URL."
    );
  }
  if (
    typeof value.environment !== "string" ||
    !environments.has(value.environment as A2AAcceptanceEnvironment)
  ) {
    addFinding(
      findings,
      "error",
      "INVALID_ENVIRONMENT",
      "$.acceptance.environment",
      "Choose local, staging, or production."
    );
  }
  if (!validInteger(value.maxRequestBytes, 1, 10_485_760)) {
    addFinding(
      findings,
      "error",
      "INVALID_REQUEST_LIMIT",
      "$.acceptance.maxRequestBytes",
      "Set a whole-byte request limit from 1 through 10485760."
    );
  }
  if (!validInteger(value.responseDeadlineMs, 100, 300_000)) {
    addFinding(
      findings,
      "error",
      "INVALID_RESPONSE_DEADLINE",
      "$.acceptance.responseDeadlineMs",
      "Set a whole-millisecond deadline from 100 through 300000."
    );
  }
  if (!validInteger(value.maxConcurrentTasks, 1, 10_000)) {
    addFinding(
      findings,
      "error",
      "INVALID_CONCURRENCY_LIMIT",
      "$.acceptance.maxConcurrentTasks",
      "Set a whole-task concurrency limit from 1 through 10000."
    );
  }
  if (
    typeof value.retentionMode !== "string" ||
    !retentionModes.has(value.retentionMode as A2ARetentionMode)
  ) {
    addFinding(
      findings,
      "error",
      "INVALID_RETENTION_MODE",
      "$.acceptance.retentionMode",
      "Choose none, transient, or retained."
    );
  }
  if (
    (value.retentionMode === "none" && value.retentionHours !== 0) ||
    (value.retentionMode !== "none" &&
      !validInteger(value.retentionHours, 1, 8_760))
  ) {
    addFinding(
      findings,
      "error",
      "INVALID_RETENTION_WINDOW",
      "$.acceptance.retentionHours",
      "Use 0 hours for none, or a whole-hour window from 1 through 8760."
    );
  }
  if (
    typeof value.dataClassification !== "string" ||
    !classifications.has(value.dataClassification as A2ADataClassification)
  ) {
    addFinding(
      findings,
      "error",
      "INVALID_DATA_CLASSIFICATION",
      "$.acceptance.dataClassification",
      "Choose public, internal, confidential, or restricted."
    );
  }
  if (typeof value.externalProcessors !== "boolean") {
    addFinding(
      findings,
      "error",
      "INVALID_EXTERNAL_PROCESSORS",
      "$.acceptance.externalProcessors",
      "State explicitly whether external processors receive task data."
    );
  }

  if (
    findings.slice(findingsStart).some(finding => finding.severity === "error")
  ) {
    return null;
  }

  return {
    owner: value.owner as string,
    supportContact: value.supportContact as string,
    environment: value.environment as A2AAcceptanceEnvironment,
    maxRequestBytes: value.maxRequestBytes as number,
    responseDeadlineMs: value.responseDeadlineMs as number,
    maxConcurrentTasks: value.maxConcurrentTasks as number,
    retentionMode: value.retentionMode as A2ARetentionMode,
    retentionHours: value.retentionHours as number,
    dataClassification: value.dataClassification as A2ADataClassification,
    externalProcessors: value.externalProcessors as boolean,
  };
}

function acceptanceCases(
  blueprint: Blueprint,
  card: A2AAgentCard,
  profile: A2AAcceptanceProfile
): A2AAcceptanceCase[] {
  const primary = card.supportedInterfaces[0];
  const authenticated = Boolean(card.securitySchemes);
  const cases: A2AAcceptanceCase[] = [
    {
      id: "a2a-discovery-card",
      category: "discovery",
      title: "Discover the declared Agent Card",
      blocking: true,
      source: "a2a-1.0",
      requirement:
        "The discovery document and implementation-owned card must match the reviewed draft.",
      procedure: [
        "Fetch /.well-known/agent-card.json from the intended discovery domain over its production transport.",
        "Compare identity, version, interface, binding, modes, skills, capabilities, and security declarations with the reviewed draft.",
        "Record TLS, cache, ETag, and response metadata without recording credentials.",
      ],
      expected:
        "Discovery succeeds and the served card matches the approved draft or an explicitly reviewed revision.",
      evidence: ["served Agent Card", "comparison result", "response metadata"],
    },
    {
      id: "a2a-version-negotiation",
      category: "compatibility",
      title: "Enforce A2A version negotiation",
      blocking: true,
      source: "a2a-1.0",
      requirement: `The service accepts A2A ${a2aProtocolVersion} and returns the specified unsupported-version error for an incompatible version.`,
      procedure: [
        `Send a valid request with A2A-Version ${a2aProtocolVersion}.`,
        "Repeat with a deliberately unsupported version.",
      ],
      expected:
        "The supported request is processed and the unsupported request fails with an actionable version error.",
      evidence: [
        "redacted requests",
        "redacted responses",
        "version error assertion",
      ],
    },
    {
      id: "a2a-media-validation",
      category: "compatibility",
      title: "Accept declared media and reject unsupported content",
      blocking: true,
      source: "a2a-1.0",
      requirement: `The implementation accepts ${card.defaultInputModes.join(", ")} and emits ${card.defaultOutputModes.join(", ")} as declared.`,
      procedure: [
        "Send representative valid content for every declared input mode.",
        "Send a safe unsupported media type and malformed content.",
      ],
      expected:
        "Declared content succeeds; unsupported or malformed content receives a bounded, actionable validation error.",
      evidence: ["media matrix", "redacted responses", "validation assertions"],
    },
    {
      id: "a2a-authentication",
      category: "security",
      title: authenticated
        ? "Reject missing and invalid authentication"
        : "Confirm the public-access decision",
      blocking: true,
      source: "a2a-1.0",
      requirement: authenticated
        ? "Protected operations reject absent, invalid, and expired credentials without disclosing sensitive details."
        : "The runtime owner explicitly approves unauthenticated access and its abuse controls.",
      procedure: authenticated
        ? [
            "Call a protected operation without credentials.",
            "Repeat with invalid and expired test credentials supplied through the runtime's approved secret channel.",
          ]
        : [
            "Review the public-access threat model, abuse limits, and information exposure.",
            "Record named owner approval before release.",
          ],
      expected: authenticated
        ? "Each request is rejected with an appropriate authentication error and no credential material is logged."
        : "The public posture has an accountable approval and testable abuse controls.",
      evidence: authenticated
        ? ["authentication assertions", "redacted audit event"]
        : ["owner approval", "abuse-control test results"],
    },
    {
      id: "a2a-resource-authorization",
      category: "security",
      title: "Prevent unauthorized task disclosure",
      blocking: true,
      source: "a2a-1.0",
      requirement:
        "A caller cannot distinguish or retrieve tasks it is not authorized to access.",
      procedure: [
        "Create a task under an isolated test principal.",
        "Attempt retrieval or mutation with a different or unauthorized principal.",
        "Repeat with a nonexistent task identifier and compare disclosure behavior.",
      ],
      expected:
        "Unauthorized and nonexistent resources do not leak task existence or content beyond the approved error contract.",
      evidence: [
        "authorization matrix",
        "redacted responses",
        "non-disclosure assertion",
      ],
    },
    {
      id: "a2a-validation-errors",
      category: "reliability",
      title: "Return bounded, actionable validation errors",
      blocking: true,
      source: "a2a-1.0",
      requirement:
        "Invalid requests fail predictably without stack traces, secrets, or unbounded reflection.",
      procedure: [
        "Submit missing, malformed, and oversized-safe test fields across the primary operation.",
        "Verify error codes, messages, correlation metadata, and retry guidance.",
      ],
      expected:
        "Each invalid request receives an actionable protocol error without sensitive implementation detail.",
      evidence: ["negative-test matrix", "redacted error samples"],
    },
    {
      id: "owner-request-limit",
      category: "reliability",
      title: "Enforce the request-size boundary",
      blocking: true,
      source: "owner-profile",
      requirement: `Requests larger than ${profile.maxRequestBytes} bytes are rejected before expensive processing.`,
      procedure: [
        "Send a valid request at the configured boundary.",
        "Send a request one byte above the boundary using non-sensitive test data.",
      ],
      expected:
        "The boundary request follows the normal path and the oversized request is rejected predictably.",
      evidence: ["request-size assertions", "resource-use observation"],
    },
    {
      id: "owner-response-deadline",
      category: "reliability",
      title: "Meet the response deadline",
      blocking: true,
      source: "owner-profile",
      requirement: `The service responds or returns an intentional asynchronous/task state within ${profile.responseDeadlineMs} ms.`,
      procedure: [
        "Exercise representative success and controlled slow-path requests under deployment-like conditions.",
        "Measure time to response or durable task acknowledgement.",
      ],
      expected:
        "Every tested request meets the deadline or follows a documented timeout and retry contract.",
      evidence: [
        "latency distribution",
        "timeout assertion",
        "test conditions",
      ],
    },
    {
      id: "owner-concurrency-limit",
      category: "reliability",
      title: "Enforce bounded concurrency",
      blocking: true,
      source: "owner-profile",
      requirement: `The runtime admits no more than ${profile.maxConcurrentTasks} concurrent tasks per the owner-defined scope.`,
      procedure: [
        "Drive the configured concurrency with bounded synthetic tasks.",
        "Submit one additional task and observe queueing or rejection behavior.",
      ],
      expected:
        "The runtime preserves availability and applies the documented queue, backpressure, or rejection behavior.",
      evidence: [
        "load-test configuration",
        "admission results",
        "resource metrics",
      ],
    },
    {
      id: "a2a-transient-failure",
      category: "reliability",
      title: "Make transient failures safely retryable",
      blocking: true,
      source: "a2a-1.0",
      requirement:
        "Retryable failures provide actionable guidance without duplicating non-idempotent work.",
      procedure: [
        "Introduce an approved transient dependency failure in an isolated environment.",
        "Retry according to the documented guidance and inspect task identity and side effects.",
      ],
      expected:
        "The caller can recover without duplicate task effects or ambiguous final state.",
      evidence: [
        "failure-injection record",
        "retry trace",
        "side-effect assertion",
      ],
    },
    {
      id: "a2a-official-tck",
      category: "compatibility",
      title: "Run the official A2A Technology Compatibility Kit",
      blocking: true,
      source: "a2a-1.0",
      requirement:
        "Core protocol compatibility is evaluated with the official A2A TCK against the reviewed implementation revision.",
      procedure: [
        `Run the official TCK for the declared ${primary?.protocolBinding ?? "unknown"} binding and A2A ${a2aProtocolVersion}.`,
        "Preserve the command, TCK revision, implementation revision, environment, and machine-readable report.",
        "Triage every skipped, failed, or inapplicable case with an accountable owner.",
      ],
      expected:
        "The official report satisfies the release policy and is traceable to the tested implementation revision.",
      evidence: [
        "TCK JSON or JUnit report",
        "TCK revision",
        "implementation revision",
      ],
    },
    {
      id: "privacy-secret-handling",
      category: "privacy",
      title: "Exclude secrets from artifacts and logs",
      blocking: true,
      source: "field-atlas",
      requirement: `No credential or unnecessary ${profile.dataClassification} task data is stored in test artifacts, cards, or operational logs.`,
      procedure: [
        "Exercise authenticated and failing requests with approved synthetic data.",
        "Inspect the Agent Card, application logs, traces, reports, and exported evidence for credential or payload leakage.",
      ],
      expected:
        "Artifacts contain only the minimum redacted metadata required by the evidence policy.",
      evidence: [
        "redaction review",
        "logging configuration",
        "sample sanitized artifact",
      ],
    },
    {
      id: "privacy-retention",
      category: "privacy",
      title: "Enforce the declared retention window",
      blocking: true,
      source: "owner-profile",
      requirement:
        profile.retentionMode === "none"
          ? "Task payloads are not retained after request processing."
          : `Task data is deleted or irreversibly de-identified after ${profile.retentionHours} hours.`,
      procedure: [
        "Create an isolated task containing uniquely identifiable synthetic data.",
        "Inspect every declared store before and after the retention boundary.",
      ],
      expected:
        profile.retentionMode === "none"
          ? "No task payload remains in declared stores after processing."
          : "The synthetic record is unavailable after the retention boundary and deletion is auditable.",
      evidence: [
        "data-flow inventory",
        "retention assertion",
        "deletion audit event",
      ],
    },
  ];

  if (profile.externalProcessors) {
    cases.push({
      id: "privacy-external-processors",
      category: "privacy",
      title: "Verify external processor disclosure",
      blocking: true,
      source: "owner-profile",
      requirement:
        "Every external processor receiving task data is approved, disclosed, and constrained to the declared data class and retention policy.",
      procedure: [
        "Trace a synthetic task through network, storage, and observability integrations.",
        "Compare observed recipients with the approved processor inventory and contractual controls.",
      ],
      expected:
        "No undeclared processor receives task data and every declared processor follows the approved purpose and retention boundary.",
      evidence: ["processor inventory", "data-flow trace", "owner approval"],
    });
  }

  for (const order of blueprint.runtime.requiresHumanApprovalAt) {
    const stage = blueprint.trace.find(candidate => candidate.order === order);
    cases.push({
      id: `governance-human-approval-${order}`,
      category: "governance",
      title: `Preserve human approval at stage ${order}`,
      blocking: true,
      source: "field-atlas",
      requirement: `Runtime execution must stop for accountable human approval before “${stage?.title ?? `stage ${order}`}.”`,
      procedure: [
        "Run the workflow to the approval boundary with a reversible test task.",
        "Verify that no gated action occurs before an authenticated, attributable decision.",
        "Exercise approve, reject, timeout, and revoked-approval paths.",
      ],
      expected:
        "The gate blocks by default and records the decision, owner, time, scope, and resulting transition.",
      evidence: [stage?.evidence ?? "approval record", "gate transition trace"],
    });
  }

  for (const stage of blueprint.trace) {
    cases.push({
      id: `evidence-stage-${stage.order}`,
      category: "evidence",
      title: `Capture stage ${stage.order} evidence`,
      blocking: false,
      source: "field-atlas",
      requirement: `The runtime produces “${stage.evidence}” for the ${stage.title} stage without claiming evidence before it exists.`,
      procedure: [
        "Exercise the stage with synthetic or approved test data.",
        "Verify artifact ownership, timestamp, source revision, integrity metadata, and redaction.",
      ],
      expected:
        "The named artifact is attributable, reviewable, bounded, and linked to the tested task and implementation revision.",
      evidence: [stage.evidence],
    });
  }

  return cases;
}

function summarize(
  findings: BlueprintFinding[]
): Pick<A2AAcceptanceAnalysis, "status" | "counts" | "findings"> {
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

export function defaultA2AAcceptanceProfile(): A2AAcceptanceProfile {
  return {
    owner: "",
    supportContact: "",
    environment: "staging",
    maxRequestBytes: 1_048_576,
    responseDeadlineMs: 30_000,
    maxConcurrentTasks: 10,
    retentionMode: "transient",
    retentionHours: 24,
    dataClassification: "internal",
    externalProcessors: false,
  };
}

export function validateA2AAcceptance(
  blueprint: Blueprint,
  agentCard: unknown,
  profile: unknown,
  generatedAt: string
): A2AAcceptanceAnalysis {
  const findings: BlueprintFinding[] = [];
  const source = validateBlueprint(blueprint);
  if (source.status === "invalid") {
    addFinding(
      findings,
      "error",
      "INVALID_SOURCE_BLUEPRINT",
      "$.blueprint",
      `The source blueprint has ${source.counts.error} structural errors.`
    );
  } else if (source.counts.warning > 0) {
    addFinding(
      findings,
      "warning",
      "SOURCE_BLUEPRINT_REVIEW",
      "$.blueprint",
      `The source blueprint still has ${source.counts.warning} review ${source.counts.warning === 1 ? "warning" : "warnings"}.`
    );
  }

  validateTimestamp(generatedAt, findings);
  const card = validateAgentCard(agentCard, blueprint, findings);
  const acceptedProfile = validateProfile(profile, findings);

  if (
    acceptedProfile?.dataClassification === "restricted" &&
    acceptedProfile.externalProcessors
  ) {
    addFinding(
      findings,
      "warning",
      "RESTRICTED_EXTERNAL_PROCESSING",
      "$.acceptance.externalProcessors",
      "Restricted data and external processing require an explicit processor, transfer, and redaction review."
    );
  }
  if (
    acceptedProfile?.environment === "production" &&
    blueprint.scenario.risk === "high"
  ) {
    addFinding(
      findings,
      "warning",
      "HIGH_RISK_PRODUCTION_SIGNOFF",
      "$.acceptance.environment",
      "Require independent release signoff for this high-risk production acceptance run."
    );
  }

  if (!findings.some(finding => finding.severity === "error")) {
    addFinding(
      findings,
      "pass",
      "ACCEPTANCE_PROFILE_COMPLETE",
      "$.acceptance",
      "The owner, environment, limits, retention, data class, and processor decision are explicit."
    );
    addFinding(
      findings,
      "pass",
      "OFFICIAL_TCK_RETAINED",
      "$.testCases",
      "The plan requires the official A2A TCK for core protocol compatibility."
    );
    addFinding(
      findings,
      "pass",
      "PLAN_NOT_EXECUTED",
      "$.status",
      "The artifact truthfully records a plan and makes no runtime pass or conformance claim."
    );
  }

  const analysis: A2AAcceptanceAnalysis = summarize(findings);
  if (analysis.status !== "invalid" && card && acceptedProfile) {
    const primary = card.supportedInterfaces[0];
    if (!primary) return analysis;
    const testCases = acceptanceCases(blueprint, card, acceptedProfile);
    analysis.manifest = {
      schemaVersion: a2aAcceptanceSchemaVersion,
      generatedAt,
      status: "plan-not-run",
      source: {
        blueprint: {
          schemaVersion: blueprint.schemaVersion,
          scenarioId: blueprint.scenario.id,
          title: blueprint.scenario.title,
          risk: blueprint.scenario.risk,
        },
        agentCard: {
          name: card.name,
          version: card.version,
          interfaceUrl: primary.url,
          binding: primary.protocolBinding,
          protocolVersion: primary.protocolVersion,
          inputModes: [...card.defaultInputModes],
          outputModes: [...card.defaultOutputModes],
          authentication: card.securitySchemes ? "bearer" : "public",
        },
      },
      acceptance: {
        owner: acceptedProfile.owner,
        supportContact: acceptedProfile.supportContact,
        environment: acceptedProfile.environment,
        maxRequestBytes: acceptedProfile.maxRequestBytes,
        responseDeadlineMs: acceptedProfile.responseDeadlineMs,
        maxConcurrentTasks: acceptedProfile.maxConcurrentTasks,
        retentionMode: acceptedProfile.retentionMode,
        retentionHours: acceptedProfile.retentionHours,
        dataClassification: acceptedProfile.dataClassification,
        externalProcessors: acceptedProfile.externalProcessors,
      },
      summary: {
        testCases: testCases.length,
        blockingCases: testCases.filter(testCase => testCase.blocking).length,
        officialTckCases: testCases.filter(
          testCase => testCase.id === "a2a-official-tck"
        ).length,
        humanApprovalCases: testCases.filter(testCase =>
          testCase.id.startsWith("governance-human-approval-")
        ).length,
        evidenceCases: testCases.filter(testCase =>
          testCase.id.startsWith("evidence-stage-")
        ).length,
      },
      testCases,
    };
  }
  return analysis;
}

function markdownText(value: string): string {
  return value
    .replaceAll(/\s+/g, " ")
    .trim()
    .replace(markdownMetacharacters, "\\$1");
}

export function a2aAcceptanceToMarkdown(
  manifest: A2AAcceptanceManifest
): string {
  const lines = [
    `# A2A acceptance plan: ${markdownText(manifest.source.agentCard.name)}`,
    "",
    "> Consumer-owned execution plan generated locally by Samsarix Field Atlas. Status: plan-not-run. This is not an official A2A extension, TCK report, deployment probe, pass result, or conformance claim.",
    "",
    "## Run contract",
    "",
    `- Schema: \`${manifest.schemaVersion}\``,
    `- Generated: ${markdownText(manifest.generatedAt)}`,
    `- Owner: ${markdownText(manifest.acceptance.owner)}`,
    `- Support: ${markdownText(manifest.acceptance.supportContact)}`,
    `- Environment: **${manifest.acceptance.environment}**`,
    `- Source scenario: ${markdownText(manifest.source.blueprint.title)} (${manifest.source.blueprint.risk} risk)`,
    `- A2A interface: ${markdownText(manifest.source.agentCard.binding)} at ${markdownText(manifest.source.agentCard.interfaceUrl)}`,
    `- Status: **${manifest.status}**`,
    "",
    "## Owner limits and privacy decisions",
    "",
    `- Request limit: ${manifest.acceptance.maxRequestBytes} bytes`,
    `- Response deadline: ${manifest.acceptance.responseDeadlineMs} ms`,
    `- Concurrent tasks: ${manifest.acceptance.maxConcurrentTasks}`,
    `- Retention: ${manifest.acceptance.retentionMode} / ${manifest.acceptance.retentionHours} hours`,
    `- Data classification: ${manifest.acceptance.dataClassification}`,
    `- External processors: ${manifest.acceptance.externalProcessors ? "yes" : "no"}`,
    "",
    "## Execution rules",
    "",
    "- Run against the named implementation revision under deployment-like conditions.",
    "- Use synthetic or explicitly approved data. Never place credentials in this plan or its evidence.",
    "- Attach observed evidence after execution; do not edit plan-not-run into a pass claim.",
    "- Use the official A2A TCK for core compatibility and preserve its machine-readable report separately.",
    "- Treat every blocking case as unresolved until the named owner reviews its evidence.",
    "",
    `## Test cases (${manifest.summary.testCases})`,
    "",
  ];

  for (const testCase of manifest.testCases) {
    lines.push(
      `### ${markdownText(testCase.id)} — ${markdownText(testCase.title)}`,
      "",
      `- Category / source: ${testCase.category} / ${testCase.source}`,
      `- Blocking: ${testCase.blocking ? "yes" : "no"}`,
      `- Requirement: ${markdownText(testCase.requirement)}`,
      `- Expected: ${markdownText(testCase.expected)}`,
      "- Procedure:",
      ...testCase.procedure.map(step => `  - [ ] ${markdownText(step)}`),
      "- Evidence to attach:",
      ...testCase.evidence.map(item => `  - [ ] ${markdownText(item)}`),
      ""
    );
  }

  lines.push(
    "## Signoff",
    "",
    "- [ ] All blocking cases have traceable evidence.",
    "- [ ] Official TCK results are attached and failures or skips are dispositioned.",
    "- [ ] Human approval gates and privacy boundaries match the source blueprint and owner profile.",
    "- [ ] The acceptance owner records the tested revision, decision, date, and unresolved risk.",
    ""
  );
  return lines.join("\n");
}
