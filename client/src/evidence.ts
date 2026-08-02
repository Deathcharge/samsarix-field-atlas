import {
  a2aAcceptanceSchemaVersion,
  type A2AAcceptanceManifest,
} from "./acceptance";
import { a2aProtocolVersion, type A2AProtocolBinding } from "./a2a";
import type { BlueprintFinding, FindingSeverity } from "./blueprint";

export const a2aTckReceiptSchemaVersion =
  "samsarix-field-atlas/a2a-tck-receipt/1" as const;
export const a2aTckRepository =
  "https://github.com/a2aproject/a2a-tck" as const;
export const interpretedA2ATckRevision =
  "5996b79f9cefa6fc390980e383e358a66fb9e49e" as const;
export const maximumTckReportBytes = 5_242_880;

export interface A2ATckEvidenceProfile {
  evidenceOwner: string;
  tckRevision: string;
  implementationRevision: string;
  runCommand: string;
}

export interface A2ATckReceiptReviewItem {
  code: string;
  message: string;
}

export interface A2ATckEvidenceReceipt {
  schemaVersion: typeof a2aTckReceiptSchemaVersion;
  generatedAt: string;
  status: "owner-review-required";
  evidenceState: "attached-unreviewed";
  claims: {
    protocolConformance: "not-determined";
    releaseDecision: "not-made";
  };
  source: {
    acceptancePlan: {
      schemaVersion: typeof a2aAcceptanceSchemaVersion;
      generatedAt: string;
      scenarioId: string;
      agentName: string;
      agentVersion: string;
      interfaceUrl: string;
      binding: string;
      protocolVersion: typeof a2aProtocolVersion;
      acceptanceOwner: string;
      environment: string;
    };
    provenance: {
      evidenceOwner: string;
      tckRepository: typeof a2aTckRepository;
      assertedTckRevision: string;
      interpretedAgainstTckRevision: typeof interpretedA2ATckRevision;
      implementationRevision: string;
      runCommand: string;
    };
    tckReport: {
      sha256: string;
      timestamp: string;
      sutUrl: string;
      reportedSpecVersion: string | null;
      embeddedAgentCard: boolean;
    };
  };
  observations: {
    compatibility: {
      overall: string;
      must: string;
      should: string;
      may: string;
    };
    requirements: {
      total: number;
      passed: number;
      failed: number;
      skipped: number;
      notTested: number;
      requirementsWithErrors: number;
      errorMessages: number;
    };
    transports: {
      name: string;
      total: number;
      passed: number;
      failed: number;
      skipped: number;
    }[];
  };
  acceptanceCoverage: {
    evidenceAttachedCaseIds: ["a2a-official-tck"];
    unresolvedCaseIds: string[];
    unresolvedBlockingCaseIds: string[];
  };
  reviewItems: A2ATckReceiptReviewItem[];
}

export interface A2ATckEvidenceAnalysis {
  status: "invalid" | "review" | "ready";
  findings: BlueprintFinding[];
  counts: Record<FindingSeverity, number>;
  receipt?: A2ATckEvidenceReceipt;
}

interface AcceptedPlan {
  manifest: A2AAcceptanceManifest;
  unresolvedCaseIds: string[];
  unresolvedBlockingCaseIds: string[];
}

interface AcceptedProfile {
  evidenceOwner: string;
  tckRevision: string;
  implementationRevision: string;
  runCommand: string;
}

type RequirementLevel = "MUST" | "SHOULD" | "MAY";
type RequirementStatus = "PASS" | "FAIL" | "SKIPPED" | "NOT TESTED";
type TransportStatus = "PASS" | "FAIL" | "SKIPPED";

interface AcceptedReport {
  timestamp: string;
  sutUrl: string;
  sutOrigin: string;
  specVersion: string | null;
  compatibility: A2ATckEvidenceReceipt["observations"]["compatibility"];
  requirements: A2ATckEvidenceReceipt["observations"]["requirements"];
  transports: A2ATckEvidenceReceipt["observations"]["transports"];
  transportNames: Set<string>;
  embeddedAgentCard: boolean;
  embeddedAgentName?: string;
  embeddedAgentVersion?: string;
}

const profileFields = new Set<keyof A2ATckEvidenceProfile>([
  "evidenceOwner",
  "tckRevision",
  "implementationRevision",
  "runCommand",
]);
const requirementLevels = new Set<RequirementLevel>(["MUST", "SHOULD", "MAY"]);
const requirementStatuses = new Set<RequirementStatus>([
  "PASS",
  "FAIL",
  "SKIPPED",
  "NOT TESTED",
]);
const transportStatuses = new Set<TransportStatus>(["PASS", "FAIL", "SKIPPED"]);
const protocolBindings = new Set<A2AProtocolBinding>([
  "JSONRPC",
  "GRPC",
  "HTTP+JSON",
]);
const acceptanceEnvironments = new Set(["local", "staging", "production"]);
const expectedTransportByBinding: Record<A2AProtocolBinding, string> = {
  JSONRPC: "jsonrpc",
  GRPC: "grpc",
  "HTTP+JSON": "http_json",
};
const immutableRevision = /^(?:[a-f\d]{40}|[a-f\d]{64})$/i;
const tckRevision = /^[a-f\d]{40}$/i;
const sha256Digest = /^[a-f\d]{64}$/i;
const percentage = /^(?:100\.0|\d{1,2}\.\d)%$/;
const protocolVersionText = /^[A-Za-z\d][A-Za-z\d._-]{0,31}$/;
const secretBearingCommand =
  /(?:--?(?:access[-_]?token|api[-_]?key|password|passwd|secret|token)\b|authorization\b)\s*(?:=|:|\s)\s*\S+|[?&](?:access[-_]?token|api[-_]?key|key|password|secret|signature|sig|token)=[^&\s]+|https?:\/\/[^/\s:@]+:[^@\s/]+@/i;

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

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalTimestamp(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    value.length > 64 ||
    !/(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  ) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}

function safeHttpUrl(value: unknown): URL | null {
  if (typeof value !== "string" || value.length > 2_048) return null;
  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function validCount(value: unknown): value is number {
  return (
    Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 1_000_000
  );
}

function summarize(
  findings: BlueprintFinding[]
): Pick<A2ATckEvidenceAnalysis, "status" | "counts" | "findings"> {
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

function validatePlan(
  value: unknown,
  findings: BlueprintFinding[]
): AcceptedPlan | null {
  const start = findings.length;
  if (!isRecord(value)) {
    addFinding(
      findings,
      "error",
      "INVALID_ACCEPTANCE_PLAN",
      "$.acceptancePlan",
      "Supply a Field Atlas A2A acceptance manifest object."
    );
    return null;
  }
  if (
    value.schemaVersion !== a2aAcceptanceSchemaVersion ||
    value.status !== "plan-not-run"
  ) {
    addFinding(
      findings,
      "error",
      "UNSUPPORTED_ACCEPTANCE_PLAN",
      "$.acceptancePlan.schemaVersion",
      `Supply a ${a2aAcceptanceSchemaVersion} artifact whose status remains plan-not-run.`
    );
  }
  const planTimestamp = canonicalTimestamp(value.generatedAt);
  if (!planTimestamp || planTimestamp !== value.generatedAt) {
    addFinding(
      findings,
      "error",
      "INVALID_PLAN_TIMESTAMP",
      "$.acceptancePlan.generatedAt",
      "The acceptance plan requires its canonical UTC generatedAt timestamp."
    );
  }

  const source = value.source;
  const blueprint = isRecord(source) ? source.blueprint : undefined;
  const agentCard = isRecord(source) ? source.agentCard : undefined;
  const acceptance = value.acceptance;
  if (
    !isRecord(blueprint) ||
    !nonEmptyString(blueprint.scenarioId, 240) ||
    !isRecord(agentCard) ||
    !nonEmptyString(agentCard.name, 240) ||
    !nonEmptyString(agentCard.version, 128) ||
    typeof agentCard.binding !== "string" ||
    !protocolBindings.has(agentCard.binding as A2AProtocolBinding) ||
    agentCard.protocolVersion !== a2aProtocolVersion ||
    !safeHttpUrl(agentCard.interfaceUrl) ||
    !isRecord(acceptance) ||
    !nonEmptyString(acceptance.owner, 240) ||
    typeof acceptance.environment !== "string" ||
    !acceptanceEnvironments.has(acceptance.environment)
  ) {
    addFinding(
      findings,
      "error",
      "INVALID_PLAN_SOURCE",
      "$.acceptancePlan.source",
      "The plan must retain a bounded scenario, A2A 1.0 interface, acceptance owner, and environment."
    );
  }

  const testCases = value.testCases;
  const summary = value.summary;
  const ids: string[] = [];
  const blockingIds: string[] = [];
  if (
    !Array.isArray(testCases) ||
    testCases.length === 0 ||
    testCases.length > 500
  ) {
    addFinding(
      findings,
      "error",
      "INVALID_PLAN_CASES",
      "$.acceptancePlan.testCases",
      "The acceptance plan must contain between 1 and 500 bounded test cases."
    );
  } else {
    const seen = new Set<string>();
    for (let index = 0; index < testCases.length; index += 1) {
      const testCase = testCases[index];
      if (
        !isRecord(testCase) ||
        !nonEmptyString(testCase.id, 240) ||
        typeof testCase.blocking !== "boolean" ||
        seen.has(String(testCase.id))
      ) {
        addFinding(
          findings,
          "error",
          "INVALID_PLAN_CASE",
          `$.acceptancePlan.testCases[${index}]`,
          "Every acceptance case requires a unique bounded ID and explicit blocking decision."
        );
        continue;
      }
      const id = testCase.id as string;
      seen.add(id);
      ids.push(id);
      if (testCase.blocking) blockingIds.push(id);
    }
  }
  const officialTckCount = ids.filter(id => id === "a2a-official-tck").length;
  if (
    officialTckCount !== 1 ||
    !isRecord(summary) ||
    summary.testCases !== (Array.isArray(testCases) ? testCases.length : -1) ||
    summary.blockingCases !== blockingIds.length ||
    summary.officialTckCases !== 1
  ) {
    addFinding(
      findings,
      "error",
      "INCONSISTENT_PLAN_SUMMARY",
      "$.acceptancePlan.summary",
      "The plan summary must match its cases and contain exactly one a2a-official-tck case."
    );
  }

  if (findings.slice(start).some(finding => finding.severity === "error")) {
    return null;
  }
  const manifest = value as unknown as A2AAcceptanceManifest;
  return {
    manifest,
    unresolvedCaseIds: ids.filter(id => id !== "a2a-official-tck"),
    unresolvedBlockingCaseIds: blockingIds.filter(
      id => id !== "a2a-official-tck"
    ),
  };
}

function validateProfile(
  value: unknown,
  findings: BlueprintFinding[]
): AcceptedProfile | null {
  const start = findings.length;
  if (!isRecord(value)) {
    addFinding(
      findings,
      "error",
      "INVALID_EVIDENCE_PROFILE",
      "$.profile",
      "Supply the evidence owner and owner-asserted revision provenance."
    );
    return null;
  }
  const unrecognizedFields = Object.keys(value).filter(
    field => !profileFields.has(field as keyof A2ATckEvidenceProfile)
  );
  if (unrecognizedFields.length > 0) {
    addFinding(
      findings,
      "warning",
      "UNRECOGNIZED_EVIDENCE_FIELD",
      "$.profile",
      `${unrecognizedFields.length} additive profile ${unrecognizedFields.length === 1 ? "field is" : "fields are"} not interpreted or copied into the v1 receipt.`
    );
  }
  if (!nonEmptyString(value.evidenceOwner, 240)) {
    addFinding(
      findings,
      "error",
      "MISSING_EVIDENCE_OWNER",
      "$.profile.evidenceOwner",
      "Name the person or team accountable for collecting and reviewing this evidence."
    );
  }
  if (
    typeof value.tckRevision !== "string" ||
    !tckRevision.test(value.tckRevision)
  ) {
    addFinding(
      findings,
      "error",
      "INVALID_TCK_REVISION",
      "$.profile.tckRevision",
      "Supply the full 40-character Git revision of the official A2A TCK run."
    );
  }
  if (
    typeof value.implementationRevision !== "string" ||
    !immutableRevision.test(value.implementationRevision)
  ) {
    addFinding(
      findings,
      "error",
      "INVALID_IMPLEMENTATION_REVISION",
      "$.profile.implementationRevision",
      "Supply a full 40- or 64-character immutable implementation revision."
    );
  }
  if (
    !nonEmptyString(value.runCommand, 2_000) ||
    /[\r\n\p{C}]/u.test(String(value.runCommand))
  ) {
    addFinding(
      findings,
      "error",
      "INVALID_RUN_COMMAND",
      "$.profile.runCommand",
      "Supply one bounded, redacted command line without control characters."
    );
  } else if (secretBearingCommand.test(value.runCommand)) {
    addFinding(
      findings,
      "error",
      "POTENTIAL_SECRET_IN_RUN_COMMAND",
      "$.profile.runCommand",
      "Remove token, password, secret, API-key, or authorization values before creating a receipt."
    );
  }

  if (findings.slice(start).some(finding => finding.severity === "error")) {
    return null;
  }
  return {
    evidenceOwner: (value.evidenceOwner as string).trim(),
    tckRevision: (value.tckRevision as string).toLowerCase(),
    implementationRevision: (
      value.implementationRevision as string
    ).toLowerCase(),
    runCommand: (value.runCommand as string).trim(),
  };
}

function readPercentage(
  value: unknown,
  path: string,
  findings: BlueprintFinding[]
): string | null {
  if (typeof value !== "string" || !percentage.test(value)) {
    addFinding(
      findings,
      "error",
      "INVALID_TCK_PERCENTAGE",
      path,
      "Official compatibility percentages use a bounded one-decimal string such as 100.0%."
    );
    return null;
  }
  return value;
}

function expectedRequirementStatus(
  transports: TransportStatus[]
): RequirementStatus {
  if (transports.length === 0) return "NOT TESTED";
  if (transports.includes("FAIL")) return "FAIL";
  if (transports.every(status => status === "SKIPPED")) return "SKIPPED";
  return "PASS";
}

function formatCompatibility(
  requirements: { level: RequirementLevel; status: RequirementStatus }[],
  level?: RequirementLevel
): string {
  const counted = requirements.filter(
    requirement =>
      (!level || requirement.level === level) &&
      !["SKIPPED", "NOT TESTED"].includes(requirement.status)
  );
  if (counted.length === 0) return "100.0%";
  const passed = counted.filter(
    requirement => requirement.status === "PASS"
  ).length;
  return `${((passed / counted.length) * 100).toFixed(1)}%`;
}

function validateReport(
  value: unknown,
  findings: BlueprintFinding[]
): AcceptedReport | null {
  const start = findings.length;
  if (!isRecord(value)) {
    addFinding(
      findings,
      "error",
      "INVALID_TCK_REPORT",
      "$.tckReport",
      "Supply the official TCK compatibility.json object."
    );
    return null;
  }
  const summary = value.summary;
  const perRequirement = value.per_requirement;
  const perTransport = value.per_transport;
  if (
    !isRecord(summary) ||
    !isRecord(perRequirement) ||
    !isRecord(perTransport)
  ) {
    addFinding(
      findings,
      "error",
      "INVALID_TCK_REPORT_SHAPE",
      "$.tckReport",
      "The report requires summary, per_requirement, and per_transport objects."
    );
    return null;
  }

  const reportTimestamp = canonicalTimestamp(summary.timestamp);
  if (!reportTimestamp) {
    addFinding(
      findings,
      "error",
      "INVALID_TCK_TIMESTAMP",
      "$.tckReport.summary.timestamp",
      "The report timestamp must be an ISO 8601 instant with a UTC offset."
    );
  }
  const sutUrl = safeHttpUrl(summary.sut_url);
  if (!sutUrl) {
    addFinding(
      findings,
      "error",
      "INVALID_TCK_SUT_URL",
      "$.tckReport.summary.sut_url",
      "The report SUT URL must be credential-free HTTP or HTTPS without query or fragment data."
    );
  }
  const rawSpecVersion = summary.spec_version;
  if (
    typeof rawSpecVersion !== "string" ||
    (rawSpecVersion.length > 0 && !protocolVersionText.test(rawSpecVersion))
  ) {
    addFinding(
      findings,
      "error",
      "INVALID_TCK_SPEC_VERSION",
      "$.tckReport.summary.spec_version",
      "The official report spec_version must be a bounded string; an empty current-runner value is accepted as missing provenance."
    );
  }

  const compatibility = {
    overall: readPercentage(
      summary.overall_compatibility,
      "$.tckReport.summary.overall_compatibility",
      findings
    ),
    must: readPercentage(
      summary.must_compatibility,
      "$.tckReport.summary.must_compatibility",
      findings
    ),
    should: readPercentage(
      summary.should_compatibility,
      "$.tckReport.summary.should_compatibility",
      findings
    ),
    may: readPercentage(
      summary.may_compatibility,
      "$.tckReport.summary.may_compatibility",
      findings
    ),
  };

  const requirementEntries = Object.entries(perRequirement);
  if (requirementEntries.length === 0 || requirementEntries.length > 5_000) {
    addFinding(
      findings,
      "error",
      "INVALID_TCK_REQUIREMENTS",
      "$.tckReport.per_requirement",
      "The report must contain between 1 and 5000 requirement results."
    );
  }
  const requirements: { level: RequirementLevel; status: RequirementStatus }[] =
    [];
  const requirementTransportNames = new Set<string>();
  let requirementsWithErrors = 0;
  let errorMessages = 0;
  for (const [requirementId, rawRequirement] of requirementEntries) {
    const path = `$.tckReport.per_requirement.${requirementId}`;
    if (!nonEmptyString(requirementId, 240) || !isRecord(rawRequirement)) {
      addFinding(
        findings,
        "error",
        "INVALID_TCK_REQUIREMENT",
        path,
        "Every TCK requirement needs a bounded ID and result object."
      );
      continue;
    }
    const rawLevel = rawRequirement.level;
    const rawStatus = rawRequirement.status;
    const rawTransports = rawRequirement.transports;
    if (
      typeof rawLevel !== "string" ||
      !requirementLevels.has(rawLevel as RequirementLevel) ||
      typeof rawStatus !== "string" ||
      !requirementStatuses.has(rawStatus as RequirementStatus) ||
      !isRecord(rawTransports)
    ) {
      addFinding(
        findings,
        "error",
        "INVALID_TCK_REQUIREMENT_RESULT",
        path,
        "Requirement results need a MUST/SHOULD/MAY level, official status, and transport map."
      );
      continue;
    }
    const statuses: TransportStatus[] = [];
    for (const [transport, rawTransportStatus] of Object.entries(
      rawTransports
    )) {
      if (
        !nonEmptyString(transport, 64) ||
        typeof rawTransportStatus !== "string" ||
        !transportStatuses.has(rawTransportStatus as TransportStatus)
      ) {
        addFinding(
          findings,
          "error",
          "INVALID_TCK_TRANSPORT_STATUS",
          `${path}.transports.${transport}`,
          "Transport results must use a bounded name and PASS, FAIL, or SKIPPED."
        );
        continue;
      }
      requirementTransportNames.add(transport);
      statuses.push(rawTransportStatus as TransportStatus);
    }
    const expected = expectedRequirementStatus(statuses);
    if (rawStatus !== expected) {
      addFinding(
        findings,
        "error",
        "INCONSISTENT_TCK_REQUIREMENT_STATUS",
        `${path}.status`,
        `The requirement status is ${rawStatus}; its transport results imply ${expected}.`
      );
    }
    if (
      !Array.isArray(rawRequirement.errors) ||
      !rawRequirement.errors.every(error => typeof error === "string") ||
      !Array.isArray(rawRequirement.test_ids) ||
      !rawRequirement.test_ids.every(testId => typeof testId === "string")
    ) {
      addFinding(
        findings,
        "error",
        "INVALID_TCK_REQUIREMENT_DETAILS",
        path,
        "Each requirement must retain the official errors and test_ids arrays."
      );
    } else {
      if (rawRequirement.errors.length > 0) requirementsWithErrors += 1;
      errorMessages += rawRequirement.errors.length;
    }
    requirements.push({
      level: rawLevel as RequirementLevel,
      status: rawStatus as RequirementStatus,
    });
  }

  const transports: A2ATckEvidenceReceipt["observations"]["transports"] = [];
  const transportNames = new Set<string>();
  const transportEntries = Object.entries(perTransport);
  if (transportEntries.length > 32) {
    addFinding(
      findings,
      "error",
      "TOO_MANY_TCK_TRANSPORTS",
      "$.tckReport.per_transport",
      "The v1 receipt accepts at most 32 transport summaries."
    );
  }
  for (const [name, rawTransport] of transportEntries) {
    const path = `$.tckReport.per_transport.${name}`;
    if (
      !nonEmptyString(name, 64) ||
      !isRecord(rawTransport) ||
      !validCount(rawTransport.total) ||
      !validCount(rawTransport.passed) ||
      !validCount(rawTransport.failed) ||
      !validCount(rawTransport.skipped) ||
      rawTransport.total !==
        Number(rawTransport.passed) +
          Number(rawTransport.failed) +
          Number(rawTransport.skipped)
    ) {
      addFinding(
        findings,
        "error",
        "INCONSISTENT_TCK_TRANSPORT_SUMMARY",
        path,
        "Transport totals must be bounded integers equal to passed + failed + skipped."
      );
      continue;
    }
    transportNames.add(name);
    transports.push({
      name,
      total: rawTransport.total,
      passed: rawTransport.passed,
      failed: rawTransport.failed,
      skipped: rawTransport.skipped,
    });
  }
  for (const name of requirementTransportNames) {
    if (!transportNames.has(name)) {
      addFinding(
        findings,
        "error",
        "MISSING_TCK_TRANSPORT_SUMMARY",
        `$.tckReport.per_transport.${name}`,
        "Every transport named by a requirement needs a per_transport summary."
      );
    }
  }

  const recomputed = {
    overall: formatCompatibility(requirements),
    must: formatCompatibility(requirements, "MUST"),
    should: formatCompatibility(requirements, "SHOULD"),
    may: formatCompatibility(requirements, "MAY"),
  };
  for (const key of ["overall", "must", "should", "may"] as const) {
    if (compatibility[key] && compatibility[key] !== recomputed[key]) {
      addFinding(
        findings,
        "error",
        "INCONSISTENT_TCK_COMPATIBILITY",
        `$.tckReport.summary.${key === "overall" ? "overall" : key}_compatibility`,
        `The reported ${key} percentage is ${compatibility[key]}; requirement statuses recompute to ${recomputed[key]}.`
      );
    }
  }

  let embeddedAgentName: string | undefined;
  let embeddedAgentVersion: string | undefined;
  if (value.agent_card !== undefined) {
    if (!isRecord(value.agent_card)) {
      addFinding(
        findings,
        "error",
        "INVALID_EMBEDDED_AGENT_CARD",
        "$.tckReport.agent_card",
        "An embedded Agent Card must be an object. Its raw content is never copied into the receipt."
      );
    } else {
      if (nonEmptyString(value.agent_card.name, 240)) {
        embeddedAgentName = value.agent_card.name;
      }
      if (nonEmptyString(value.agent_card.version, 128)) {
        embeddedAgentVersion = value.agent_card.version;
      }
    }
  }

  if (findings.slice(start).some(finding => finding.severity === "error")) {
    return null;
  }
  const statusCounts = {
    passed: requirements.filter(requirement => requirement.status === "PASS")
      .length,
    failed: requirements.filter(requirement => requirement.status === "FAIL")
      .length,
    skipped: requirements.filter(
      requirement => requirement.status === "SKIPPED"
    ).length,
    notTested: requirements.filter(
      requirement => requirement.status === "NOT TESTED"
    ).length,
  };
  return {
    timestamp: reportTimestamp!,
    sutUrl: sutUrl!.toString(),
    sutOrigin: sutUrl!.origin,
    specVersion: (rawSpecVersion as string).trim() || null,
    compatibility:
      compatibility as A2ATckEvidenceReceipt["observations"]["compatibility"],
    requirements: {
      total: requirements.length,
      ...statusCounts,
      requirementsWithErrors,
      errorMessages,
    },
    transports: transports.sort((left, right) =>
      compareText(left.name, right.name)
    ),
    transportNames,
    embeddedAgentCard: isRecord(value.agent_card),
    ...(embeddedAgentName === undefined ? {} : { embeddedAgentName }),
    ...(embeddedAgentVersion === undefined ? {} : { embeddedAgentVersion }),
  };
}

function addEvidenceReviewFindings(
  plan: AcceptedPlan,
  profile: AcceptedProfile,
  report: AcceptedReport,
  receiptTimestamp: string,
  findings: BlueprintFinding[]
) {
  if (profile.tckRevision !== interpretedA2ATckRevision) {
    addFinding(
      findings,
      "warning",
      "UNREVIEWED_TCK_REVISION",
      "$.profile.tckRevision",
      `This parser was evidence-tested against TCK revision ${interpretedA2ATckRevision}; review report-shape changes at the asserted revision.`
    );
  }
  if (!report.specVersion) {
    addFinding(
      findings,
      "warning",
      "MISSING_REPORT_SPEC_VERSION",
      "$.tckReport.summary.spec_version",
      "The current official runner can emit an empty spec_version; use the pinned TCK revision and plan target during owner review."
    );
  } else if (report.specVersion !== a2aProtocolVersion) {
    addFinding(
      findings,
      "warning",
      "REPORT_SPEC_VERSION_MISMATCH",
      "$.tckReport.summary.spec_version",
      `The report names A2A ${report.specVersion}, while the acceptance plan targets ${a2aProtocolVersion}.`
    );
  }

  const interfaceUrl = new URL(plan.manifest.source.agentCard.interfaceUrl);
  if (interfaceUrl.origin !== report.sutOrigin) {
    addFinding(
      findings,
      "warning",
      "TCK_SUT_ORIGIN_MISMATCH",
      "$.tckReport.summary.sut_url",
      "The report SUT origin differs from the acceptance plan interface origin; confirm routing and deployment identity."
    );
  }
  const binding = plan.manifest.source.agentCard.binding as A2AProtocolBinding;
  const expectedTransport = expectedTransportByBinding[binding];
  if (!expectedTransport || !report.transportNames.has(expectedTransport)) {
    addFinding(
      findings,
      "warning",
      "PLANNED_TRANSPORT_NOT_REPORTED",
      "$.tckReport.per_transport",
      `The report does not include the ${expectedTransport ?? binding} transport expected by the plan.`
    );
  }
  if (profile.evidenceOwner !== plan.manifest.acceptance.owner) {
    addFinding(
      findings,
      "warning",
      "EVIDENCE_OWNER_DIFFERS",
      "$.profile.evidenceOwner",
      "The evidence collector differs from the acceptance owner; both owners should review the handoff."
    );
  }
  if (new Date(report.timestamp) < new Date(plan.manifest.generatedAt)) {
    addFinding(
      findings,
      "warning",
      "TCK_REPORT_PREDATES_PLAN",
      "$.tckReport.summary.timestamp",
      "The TCK report predates the acceptance plan; confirm it tested the exact planned interface and revision."
    );
  }
  if (new Date(report.timestamp) > new Date(receiptTimestamp)) {
    addFinding(
      findings,
      "error",
      "TCK_REPORT_AFTER_RECEIPT",
      "$.generatedAt",
      "The receipt timestamp cannot precede the report timestamp."
    );
  }

  if (report.requirements.failed > 0) {
    addFinding(
      findings,
      "warning",
      "TCK_FAILURES_REQUIRE_DISPOSITION",
      "$.tckReport.per_requirement",
      `${report.requirements.failed} requirement ${report.requirements.failed === 1 ? "failure requires" : "failures require"} owner disposition.`
    );
  }
  if (report.requirements.skipped > 0) {
    addFinding(
      findings,
      "warning",
      "TCK_SKIPPED_REQUIREMENTS",
      "$.tckReport.per_requirement",
      `${report.requirements.skipped} skipped ${report.requirements.skipped === 1 ? "requirement is" : "requirements are"} excluded from compatibility percentages.`
    );
  }
  if (report.requirements.notTested > 0) {
    addFinding(
      findings,
      "warning",
      "TCK_NOT_TESTED_REQUIREMENTS",
      "$.tckReport.per_requirement",
      `${report.requirements.notTested} not-tested ${report.requirements.notTested === 1 ? "requirement is" : "requirements are"} excluded from compatibility percentages.`
    );
  }
  if (
    report.requirements.failed > 0 &&
    report.requirements.errorMessages === 0
  ) {
    addFinding(
      findings,
      "warning",
      "TCK_FAILURES_WITHOUT_ERRORS",
      "$.tckReport.per_requirement",
      "The report contains failures without error messages; retain the HTML or JUnit report for diagnosis."
    );
  }
  if (!report.embeddedAgentCard) {
    addFinding(
      findings,
      "warning",
      "TCK_AGENT_CARD_NOT_EMBEDDED",
      "$.tckReport.agent_card",
      "The report does not embed an Agent Card; attach and compare the served discovery document separately."
    );
  } else {
    if (
      report.embeddedAgentName === undefined ||
      report.embeddedAgentVersion === undefined
    ) {
      addFinding(
        findings,
        "warning",
        "TCK_AGENT_IDENTITY_INCOMPLETE",
        "$.tckReport.agent_card",
        "The embedded Agent Card lacks a bounded name or version; compare the served discovery document separately."
      );
    }
    if (
      report.embeddedAgentName !== undefined &&
      report.embeddedAgentName !== plan.manifest.source.agentCard.name
    ) {
      addFinding(
        findings,
        "warning",
        "TCK_AGENT_NAME_MISMATCH",
        "$.tckReport.agent_card.name",
        "The embedded Agent Card name differs from the acceptance plan."
      );
    }
    if (
      report.embeddedAgentVersion !== undefined &&
      report.embeddedAgentVersion !== plan.manifest.source.agentCard.version
    ) {
      addFinding(
        findings,
        "warning",
        "TCK_AGENT_VERSION_MISMATCH",
        "$.tckReport.agent_card.version",
        "The embedded Agent Card version differs from the acceptance plan."
      );
    }
  }
}

export function defaultA2ATckEvidenceProfile(): A2ATckEvidenceProfile {
  return {
    evidenceOwner: "",
    tckRevision: interpretedA2ATckRevision,
    implementationRevision: "",
    runCommand: "",
  };
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const stableBytes = Uint8Array.from(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", stableBytes);
  return Array.from(new Uint8Array(digest), byte =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

export function validateA2ATckEvidence(
  acceptancePlan: unknown,
  tckReport: unknown,
  profile: unknown,
  generatedAt: string,
  reportSha256: string
): A2ATckEvidenceAnalysis {
  const findings: BlueprintFinding[] = [];
  const receiptTimestamp = canonicalTimestamp(generatedAt);
  if (!receiptTimestamp || receiptTimestamp !== generatedAt) {
    addFinding(
      findings,
      "error",
      "INVALID_RECEIPT_TIMESTAMP",
      "$.generatedAt",
      "Supply a canonical UTC receipt timestamp such as 2026-08-01T13:00:00.000Z."
    );
  }
  if (!sha256Digest.test(reportSha256)) {
    addFinding(
      findings,
      "error",
      "INVALID_REPORT_DIGEST",
      "$.reportSha256",
      "Supply the lowercase or uppercase 64-character SHA-256 digest of the exact report bytes."
    );
  }

  const plan = validatePlan(acceptancePlan, findings);
  const acceptedProfile = validateProfile(profile, findings);
  const report = validateReport(tckReport, findings);
  if (plan && acceptedProfile && report && receiptTimestamp) {
    addEvidenceReviewFindings(
      plan,
      acceptedProfile,
      report,
      receiptTimestamp,
      findings
    );
  }

  if (
    !plan ||
    !acceptedProfile ||
    !report ||
    !receiptTimestamp ||
    findings.some(finding => finding.severity === "error")
  ) {
    return summarize(findings);
  }

  addFinding(
    findings,
    "pass",
    "TCK_REPORT_BYTES_BOUND",
    "$.source.tckReport.sha256",
    "The receipt binds the exact uploaded report bytes with SHA-256."
  );
  addFinding(
    findings,
    "pass",
    "TCK_REPORT_INTERNALLY_CONSISTENT",
    "$.observations",
    "Requirement statuses, compatibility percentages, and transport totals are internally consistent."
  );
  addFinding(
    findings,
    "pass",
    "OWNER_REVIEW_PRESERVED",
    "$.status",
    "The receipt attaches evidence without making a protocol-conformance or release claim."
  );

  const warningItems = findings
    .filter(finding => finding.severity === "warning")
    .map(finding => ({ code: finding.code, message: finding.message }));
  const receipt: A2ATckEvidenceReceipt = {
    schemaVersion: a2aTckReceiptSchemaVersion,
    generatedAt: receiptTimestamp,
    status: "owner-review-required",
    evidenceState: "attached-unreviewed",
    claims: {
      protocolConformance: "not-determined",
      releaseDecision: "not-made",
    },
    source: {
      acceptancePlan: {
        schemaVersion: plan.manifest.schemaVersion,
        generatedAt: plan.manifest.generatedAt,
        scenarioId: plan.manifest.source.blueprint.scenarioId,
        agentName: plan.manifest.source.agentCard.name,
        agentVersion: plan.manifest.source.agentCard.version,
        interfaceUrl: plan.manifest.source.agentCard.interfaceUrl,
        binding: plan.manifest.source.agentCard.binding,
        protocolVersion: plan.manifest.source.agentCard.protocolVersion,
        acceptanceOwner: plan.manifest.acceptance.owner,
        environment: plan.manifest.acceptance.environment,
      },
      provenance: {
        evidenceOwner: acceptedProfile.evidenceOwner,
        tckRepository: a2aTckRepository,
        assertedTckRevision: acceptedProfile.tckRevision,
        interpretedAgainstTckRevision: interpretedA2ATckRevision,
        implementationRevision: acceptedProfile.implementationRevision,
        runCommand: acceptedProfile.runCommand,
      },
      tckReport: {
        sha256: reportSha256.toLowerCase(),
        timestamp: report.timestamp,
        sutUrl: report.sutUrl,
        reportedSpecVersion: report.specVersion,
        embeddedAgentCard: report.embeddedAgentCard,
      },
    },
    observations: {
      compatibility: report.compatibility,
      requirements: report.requirements,
      transports: report.transports,
    },
    acceptanceCoverage: {
      evidenceAttachedCaseIds: ["a2a-official-tck"],
      unresolvedCaseIds: plan.unresolvedCaseIds,
      unresolvedBlockingCaseIds: plan.unresolvedBlockingCaseIds,
    },
    reviewItems: [
      ...warningItems,
      {
        code: "UNRESOLVED_ACCEPTANCE_CASES",
        message: `${plan.unresolvedCaseIds.length} non-TCK acceptance ${plan.unresolvedCaseIds.length === 1 ? "case remains" : "cases remain"} unresolved; this receipt is not a release decision.`,
      },
    ],
  };

  return { ...summarize(findings), receipt };
}
