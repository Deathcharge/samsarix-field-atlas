import {
  a2aAcceptanceSchemaVersion,
  type A2AAcceptanceCase,
  type A2AAcceptanceManifest,
} from "./acceptance";
import { a2aProtocolVersion, type A2AProtocolBinding } from "./a2a";
import type { BlueprintFinding, FindingSeverity } from "./blueprint";
import {
  a2aTckReceiptSchemaVersion,
  type A2ATckEvidenceReceipt,
} from "./evidence";

export const a2aReviewLedgerSchemaVersion =
  "samsarix-field-atlas/a2a-review-ledger/1" as const;
export const maximumReviewProfileBytes = 1_048_576;

export type A2AReviewOutcome = "pending" | "accepted" | "rejected" | "waived";
export type A2AReleaseDecision = "not-made" | "approved" | "rejected";
export type A2AAutomatedReadiness = "blocked" | "eligible-for-owner-decision";

export interface A2ACaseReviewInput {
  caseId: string;
  outcome: A2AReviewOutcome;
  reviewedAt: string | null;
  evidenceRefs: string[];
  rationale: string | null;
}

export interface A2AReviewProfile {
  reviewOwner: string;
  decisionOwner: string;
  implementationRevision: string;
  decision: A2AReleaseDecision;
  decidedAt: string | null;
  decisionRationale: string | null;
  caseReviews: A2ACaseReviewInput[];
}

export interface A2AReviewLedger {
  schemaVersion: typeof a2aReviewLedgerSchemaVersion;
  generatedAt: string;
  status: "owner-asserted-review";
  proofBoundary: {
    runtimeExecutionByFieldAtlas: "not-performed";
    sourceAuthenticationByFieldAtlas: "not-performed";
    ownerIdentityVerificationByFieldAtlas: "not-performed";
    decisionAuthority: "owner-asserted";
  };
  source: {
    acceptancePlan: {
      schemaVersion: typeof a2aAcceptanceSchemaVersion;
      canonicalSha256: string;
      generatedAt: string;
      scenarioId: string;
      agentName: string;
      agentVersion: string;
      interfaceUrl: string;
      binding: A2AProtocolBinding;
      protocolVersion: typeof a2aProtocolVersion;
      acceptanceOwner: string;
      environment: string;
    };
    tckReceipt: {
      schemaVersion: typeof a2aTckReceiptSchemaVersion;
      canonicalSha256: string;
      generatedAt: string;
      tckReportSha256: string;
      assertedTckRevision: string;
      implementationRevision: string;
    };
  };
  review: {
    reviewOwner: string;
    decisionOwner: string;
    decision: A2AReleaseDecision;
    decidedAt: string | null;
    decisionRationale: string | null;
    cases: {
      caseId: string;
      category: A2AAcceptanceCase["category"];
      title: string;
      blocking: boolean;
      source: A2AAcceptanceCase["source"];
      outcome: A2AReviewOutcome;
      reviewedBy: string | null;
      reviewedAt: string | null;
      evidenceRefs: string[];
      rationale: string | null;
    }[];
  };
  summary: {
    total: number;
    blocking: number;
    accepted: number;
    rejected: number;
    waived: number;
    pending: number;
    blockingAccepted: number;
    blockingRejected: number;
    blockingWaived: number;
    blockingPending: number;
    evidenceReferences: number;
  };
  conclusion: {
    automatedReadiness: A2AAutomatedReadiness;
    releaseDecision: A2AReleaseDecision;
  };
  reviewItems: { code: string; message: string }[];
}

export interface A2AReviewAnalysis {
  status: "invalid" | "review" | "ready";
  findings: BlueprintFinding[];
  counts: Record<FindingSeverity, number>;
  ledger?: A2AReviewLedger;
}

interface AcceptedPlan {
  manifest: A2AAcceptanceManifest;
  cases: A2AAcceptanceCase[];
}

interface AcceptedReceipt {
  receipt: A2ATckEvidenceReceipt;
}

interface AcceptedProfile {
  reviewOwner: string;
  decisionOwner: string;
  implementationRevision: string;
  decision: A2AReleaseDecision;
  decidedAt: string | null;
  decisionRationale: string | null;
  caseReviews: Map<string, A2ACaseReviewInput>;
}

const profileFields = new Set<keyof A2AReviewProfile>([
  "reviewOwner",
  "decisionOwner",
  "implementationRevision",
  "decision",
  "decidedAt",
  "decisionRationale",
  "caseReviews",
]);
const outcomes = new Set<A2AReviewOutcome>([
  "pending",
  "accepted",
  "rejected",
  "waived",
]);
const decisions = new Set<A2AReleaseDecision>([
  "not-made",
  "approved",
  "rejected",
]);
const categories = new Set<A2AAcceptanceCase["category"]>([
  "discovery",
  "security",
  "compatibility",
  "reliability",
  "privacy",
  "governance",
  "evidence",
]);
const sources = new Set<A2AAcceptanceCase["source"]>([
  "a2a-1.0",
  "field-atlas",
  "owner-profile",
]);
const protocolBindings = new Set<A2AProtocolBinding>([
  "JSONRPC",
  "GRPC",
  "HTTP+JSON",
]);
const acceptanceEnvironments = new Set(["local", "staging", "production"]);
const revisionPattern = /^(?:[a-f\d]{40}|[a-f\d]{64})$/i;
const sha256Pattern = /^[a-f\d]{64}$/i;
const tckRevisionPattern = /^[a-f\d]{40}$/i;
const percentagePattern = /^(?:100\.0|\d{1,2}\.\d)%$/;
const controlCharacters = /\p{C}/u;
const markdownMetacharacters = /([\\`*_[\]{}()<>#+!|])/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown, maximum: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maximum &&
    !controlCharacters.test(value)
  );
}

function nullableString(
  value: unknown,
  maximum: number
): value is string | null {
  return value === null || nonEmptyString(value, maximum);
}

function canonicalTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) {
    return null;
  }
  return value;
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
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

function addFinding(
  findings: BlueprintFinding[],
  severity: FindingSeverity,
  code: string,
  path: string,
  message: string
) {
  findings.push({ severity, code, path, message });
}

function summarize(
  findings: BlueprintFinding[]
): Pick<A2AReviewAnalysis, "status" | "counts" | "findings"> {
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

function sameStringArray(left: unknown, right: string[]): boolean {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function safeEvidenceReference(value: unknown): value is string {
  if (!nonEmptyString(value, 512)) return false;
  if (value.startsWith("urn:")) {
    return /^urn:[a-z\d][a-z\d.-]{0,31}:[A-Za-z\d][A-Za-z\d:._~/-]{0,470}$/i.test(
      value
    );
  }
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      url.search === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
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
  const source = value.source;
  const blueprint = isRecord(source) ? source.blueprint : undefined;
  const agentCard = isRecord(source) ? source.agentCard : undefined;
  const acceptance = value.acceptance;
  if (
    value.schemaVersion !== a2aAcceptanceSchemaVersion ||
    value.status !== "plan-not-run" ||
    !canonicalTimestamp(value.generatedAt) ||
    !isRecord(blueprint) ||
    !nonEmptyString(blueprint.scenarioId, 240) ||
    !isRecord(agentCard) ||
    !nonEmptyString(agentCard.name, 240) ||
    !nonEmptyString(agentCard.version, 128) ||
    !safeHttpUrl(agentCard.interfaceUrl) ||
    typeof agentCard.binding !== "string" ||
    !protocolBindings.has(agentCard.binding as A2AProtocolBinding) ||
    agentCard.protocolVersion !== a2aProtocolVersion ||
    !isRecord(acceptance) ||
    !nonEmptyString(acceptance.owner, 240) ||
    typeof acceptance.environment !== "string" ||
    !acceptanceEnvironments.has(acceptance.environment)
  ) {
    addFinding(
      findings,
      "error",
      "INVALID_ACCEPTANCE_PLAN",
      "$.acceptancePlan",
      `Supply a structurally complete ${a2aAcceptanceSchemaVersion} plan-not-run manifest.`
    );
  }

  const testCases = value.testCases;
  const acceptedCases: A2AAcceptanceCase[] = [];
  const seen = new Set<string>();
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
      "The acceptance plan must contain between 1 and 500 cases."
    );
  } else {
    for (let index = 0; index < testCases.length; index += 1) {
      const testCase = testCases[index];
      if (
        !isRecord(testCase) ||
        !nonEmptyString(testCase.id, 240) ||
        seen.has(String(testCase.id)) ||
        typeof testCase.category !== "string" ||
        !categories.has(testCase.category as A2AAcceptanceCase["category"]) ||
        !nonEmptyString(testCase.title, 240) ||
        typeof testCase.blocking !== "boolean" ||
        typeof testCase.source !== "string" ||
        !sources.has(testCase.source as A2AAcceptanceCase["source"]) ||
        !nonEmptyString(testCase.requirement, 2_000) ||
        !Array.isArray(testCase.procedure) ||
        testCase.procedure.length === 0 ||
        testCase.procedure.length > 24 ||
        !testCase.procedure.every(step => nonEmptyString(step, 1_000)) ||
        !nonEmptyString(testCase.expected, 2_000) ||
        !Array.isArray(testCase.evidence) ||
        testCase.evidence.length === 0 ||
        testCase.evidence.length > 24 ||
        !testCase.evidence.every(item => nonEmptyString(item, 1_000))
      ) {
        addFinding(
          findings,
          "error",
          "INVALID_PLAN_CASE",
          `$.acceptancePlan.testCases[${index}]`,
          "Each acceptance case requires a unique bounded identity, procedure, expectation, and evidence list."
        );
        continue;
      }
      seen.add(testCase.id as string);
      acceptedCases.push(testCase as unknown as A2AAcceptanceCase);
    }
  }

  const summary = value.summary;
  const blocking = acceptedCases.filter(testCase => testCase.blocking).length;
  const officialTck = acceptedCases.filter(
    testCase => testCase.id === "a2a-official-tck"
  ).length;
  const humanApprovals = acceptedCases.filter(testCase =>
    testCase.id.startsWith("governance-human-approval-")
  ).length;
  const evidenceCases = acceptedCases.filter(testCase =>
    testCase.id.startsWith("evidence-stage-")
  ).length;
  if (
    !isRecord(summary) ||
    summary.testCases !== acceptedCases.length ||
    summary.blockingCases !== blocking ||
    summary.officialTckCases !== officialTck ||
    summary.humanApprovalCases !== humanApprovals ||
    summary.evidenceCases !== evidenceCases ||
    officialTck !== 1
  ) {
    addFinding(
      findings,
      "error",
      "INCONSISTENT_PLAN_SUMMARY",
      "$.acceptancePlan.summary",
      "The plan summary must exactly match its cases and contain one official TCK case."
    );
  }

  if (findings.slice(start).some(finding => finding.severity === "error")) {
    return null;
  }
  return {
    manifest: value as unknown as A2AAcceptanceManifest,
    cases: acceptedCases,
  };
}

function validateReceipt(
  value: unknown,
  plan: AcceptedPlan | null,
  findings: BlueprintFinding[]
): AcceptedReceipt | null {
  const start = findings.length;
  if (!isRecord(value)) {
    addFinding(
      findings,
      "error",
      "INVALID_TCK_RECEIPT",
      "$.tckReceipt",
      "Supply a Field Atlas A2A TCK evidence receipt object."
    );
    return null;
  }
  const claims = value.claims;
  const source = value.source;
  const receiptPlan = isRecord(source) ? source.acceptancePlan : undefined;
  const provenance = isRecord(source) ? source.provenance : undefined;
  const tckReport = isRecord(source) ? source.tckReport : undefined;
  const coverage = value.acceptanceCoverage;
  const observations = value.observations;
  const compatibility = isRecord(observations)
    ? observations.compatibility
    : undefined;
  const requirements = isRecord(observations)
    ? observations.requirements
    : undefined;
  const transports = isRecord(observations)
    ? observations.transports
    : undefined;
  const transportNames = new Set<string>();
  const validTransports =
    Array.isArray(transports) &&
    transports.length > 0 &&
    transports.length <= 16 &&
    transports.every(transport => {
      if (
        !isRecord(transport) ||
        !nonEmptyString(transport.name, 128) ||
        transportNames.has(transport.name) ||
        !nonNegativeInteger(transport.total) ||
        !nonNegativeInteger(transport.passed) ||
        !nonNegativeInteger(transport.failed) ||
        !nonNegativeInteger(transport.skipped) ||
        transport.total !==
          transport.passed + transport.failed + transport.skipped
      ) {
        return false;
      }
      transportNames.add(transport.name);
      return true;
    });
  if (
    value.schemaVersion !== a2aTckReceiptSchemaVersion ||
    value.status !== "owner-review-required" ||
    value.evidenceState !== "attached-unreviewed" ||
    !canonicalTimestamp(value.generatedAt) ||
    !isRecord(claims) ||
    claims.protocolConformance !== "not-determined" ||
    claims.releaseDecision !== "not-made" ||
    !isRecord(receiptPlan) ||
    !isRecord(provenance) ||
    !nonEmptyString(provenance.evidenceOwner, 240) ||
    provenance.tckRepository !== "https://github.com/a2aproject/a2a-tck" ||
    !tckRevisionPattern.test(String(provenance.assertedTckRevision)) ||
    !tckRevisionPattern.test(
      String(provenance.interpretedAgainstTckRevision)
    ) ||
    !revisionPattern.test(String(provenance.implementationRevision)) ||
    !nonEmptyString(provenance.runCommand, 2_000) ||
    !isRecord(tckReport) ||
    !sha256Pattern.test(String(tckReport.sha256)) ||
    !canonicalTimestamp(tckReport.timestamp) ||
    !safeHttpUrl(tckReport.sutUrl) ||
    !(
      tckReport.reportedSpecVersion === null ||
      nonEmptyString(tckReport.reportedSpecVersion, 32)
    ) ||
    typeof tckReport.embeddedAgentCard !== "boolean" ||
    !isRecord(coverage) ||
    !isRecord(compatibility) ||
    !percentagePattern.test(String(compatibility.overall)) ||
    !percentagePattern.test(String(compatibility.must)) ||
    !percentagePattern.test(String(compatibility.should)) ||
    !percentagePattern.test(String(compatibility.may)) ||
    !isRecord(requirements) ||
    !nonNegativeInteger(requirements.total) ||
    !nonNegativeInteger(requirements.passed) ||
    !nonNegativeInteger(requirements.failed) ||
    !nonNegativeInteger(requirements.skipped) ||
    !nonNegativeInteger(requirements.notTested) ||
    !nonNegativeInteger(requirements.requirementsWithErrors) ||
    !nonNegativeInteger(requirements.errorMessages) ||
    requirements.total !==
      requirements.passed +
        requirements.failed +
        requirements.skipped +
        requirements.notTested ||
    !validTransports ||
    !Array.isArray(value.reviewItems) ||
    value.reviewItems.length > 500 ||
    !value.reviewItems.every(
      item =>
        isRecord(item) &&
        nonEmptyString(item.code, 128) &&
        nonEmptyString(item.message, 2_000)
    )
  ) {
    addFinding(
      findings,
      "error",
      "INVALID_TCK_RECEIPT",
      "$.tckReceipt",
      `Supply a structurally complete ${a2aTckReceiptSchemaVersion} owner-review-required receipt.`
    );
  }

  if (plan && isRecord(receiptPlan) && isRecord(coverage)) {
    const expectedUnresolved = plan.cases
      .filter(testCase => testCase.id !== "a2a-official-tck")
      .map(testCase => testCase.id);
    const expectedBlocking = plan.cases
      .filter(
        testCase => testCase.blocking && testCase.id !== "a2a-official-tck"
      )
      .map(testCase => testCase.id);
    if (
      receiptPlan.schemaVersion !== plan.manifest.schemaVersion ||
      receiptPlan.generatedAt !== plan.manifest.generatedAt ||
      receiptPlan.scenarioId !== plan.manifest.source.blueprint.scenarioId ||
      receiptPlan.agentName !== plan.manifest.source.agentCard.name ||
      receiptPlan.agentVersion !== plan.manifest.source.agentCard.version ||
      receiptPlan.interfaceUrl !==
        plan.manifest.source.agentCard.interfaceUrl ||
      receiptPlan.binding !== plan.manifest.source.agentCard.binding ||
      receiptPlan.protocolVersion !==
        plan.manifest.source.agentCard.protocolVersion ||
      receiptPlan.acceptanceOwner !== plan.manifest.acceptance.owner ||
      receiptPlan.environment !== plan.manifest.acceptance.environment ||
      !sameStringArray(coverage.evidenceAttachedCaseIds, [
        "a2a-official-tck",
      ]) ||
      !sameStringArray(coverage.unresolvedCaseIds, expectedUnresolved) ||
      !sameStringArray(coverage.unresolvedBlockingCaseIds, expectedBlocking)
    ) {
      addFinding(
        findings,
        "error",
        "TCK_RECEIPT_PLAN_MISMATCH",
        "$.tckReceipt.source.acceptancePlan",
        "The TCK receipt must reference this exact acceptance-plan identity and case coverage."
      );
    }
  }

  const receiptTimestamp = canonicalTimestamp(value.generatedAt);
  const reportTimestamp = isRecord(tckReport)
    ? canonicalTimestamp(tckReport.timestamp)
    : null;
  if (
    receiptTimestamp &&
    ((plan && receiptTimestamp < plan.manifest.generatedAt) ||
      (reportTimestamp && receiptTimestamp < reportTimestamp))
  ) {
    addFinding(
      findings,
      "error",
      "INVALID_TCK_RECEIPT_CHRONOLOGY",
      "$.tckReceipt.generatedAt",
      "The TCK receipt cannot predate its acceptance plan or source report."
    );
  }

  if (findings.slice(start).some(finding => finding.severity === "error")) {
    return null;
  }
  return { receipt: value as unknown as A2ATckEvidenceReceipt };
}

function validateProfile(
  value: unknown,
  plan: AcceptedPlan | null,
  receipt: AcceptedReceipt | null,
  generatedAt: string | null,
  findings: BlueprintFinding[]
): AcceptedProfile | null {
  const start = findings.length;
  if (!isRecord(value)) {
    addFinding(
      findings,
      "error",
      "INVALID_REVIEW_PROFILE",
      "$.profile",
      "Supply an acceptance review profile object."
    );
    return null;
  }
  for (const key of Object.keys(value)) {
    if (!profileFields.has(key as keyof A2AReviewProfile)) {
      addFinding(
        findings,
        "warning",
        "UNRECOGNIZED_REVIEW_PROFILE_FIELD",
        `$.profile.${key}`,
        "This additive review-profile field is not interpreted or copied into the v1 ledger."
      );
    }
  }
  if (!nonEmptyString(value.reviewOwner, 240)) {
    addFinding(
      findings,
      "error",
      "MISSING_REVIEW_OWNER",
      "$.profile.reviewOwner",
      "Name the accountable owner of the case-review assertions."
    );
  }
  if (!revisionPattern.test(String(value.implementationRevision))) {
    addFinding(
      findings,
      "error",
      "INVALID_IMPLEMENTATION_REVISION",
      "$.profile.implementationRevision",
      "Use a full immutable 40- or 64-character implementation revision."
    );
  } else if (
    receipt &&
    String(value.implementationRevision).toLowerCase() !==
      receipt.receipt.source.provenance.implementationRevision.toLowerCase()
  ) {
    addFinding(
      findings,
      "error",
      "IMPLEMENTATION_REVISION_MISMATCH",
      "$.profile.implementationRevision",
      "The review must bind the implementation revision asserted by the TCK receipt."
    );
  }
  if (
    typeof value.decision !== "string" ||
    !decisions.has(value.decision as A2AReleaseDecision)
  ) {
    addFinding(
      findings,
      "error",
      "INVALID_RELEASE_DECISION",
      "$.profile.decision",
      "Use not-made, approved, or rejected as the owner decision."
    );
  }
  const decision = decisions.has(value.decision as A2AReleaseDecision)
    ? (value.decision as A2AReleaseDecision)
    : "not-made";
  const decidedAt =
    value.decidedAt === null ? null : canonicalTimestamp(value.decidedAt);
  if (decision === "not-made") {
    if (
      value.decisionOwner !== "" ||
      value.decidedAt !== null ||
      value.decisionRationale !== null
    ) {
      addFinding(
        findings,
        "error",
        "UNMADE_DECISION_HAS_ASSERTIONS",
        "$.profile.decision",
        "A not-made decision must not name an authority, timestamp, or rationale."
      );
    }
  } else if (
    !nonEmptyString(value.decisionOwner, 240) ||
    !decidedAt ||
    !nonEmptyString(value.decisionRationale, 2_000)
  ) {
    addFinding(
      findings,
      "error",
      "INCOMPLETE_RELEASE_DECISION",
      "$.profile.decision",
      "An approved or rejected decision requires a bounded owner, canonical timestamp, and rationale."
    );
  }

  const caseReviews = value.caseReviews;
  const acceptedReviews = new Map<string, A2ACaseReviewInput>();
  const plannedIds = new Set(plan?.cases.map(testCase => testCase.id) ?? []);
  if (!Array.isArray(caseReviews) || caseReviews.length > 500) {
    addFinding(
      findings,
      "error",
      "INVALID_CASE_REVIEWS",
      "$.profile.caseReviews",
      "Supply one bounded case-review row for every planned case."
    );
  } else {
    for (let index = 0; index < caseReviews.length; index += 1) {
      const review = caseReviews[index];
      const path = `$.profile.caseReviews[${index}]`;
      if (
        !isRecord(review) ||
        !nonEmptyString(review.caseId, 240) ||
        !plannedIds.has(String(review.caseId)) ||
        acceptedReviews.has(String(review.caseId)) ||
        typeof review.outcome !== "string" ||
        !outcomes.has(review.outcome as A2AReviewOutcome) ||
        !Array.isArray(review.evidenceRefs) ||
        review.evidenceRefs.length > 8 ||
        !review.evidenceRefs.every(safeEvidenceReference) ||
        new Set(review.evidenceRefs).size !== review.evidenceRefs.length ||
        !nullableString(review.rationale, 2_000)
      ) {
        addFinding(
          findings,
          "error",
          "INVALID_CASE_REVIEW",
          path,
          "Each planned case requires one valid outcome, canonical review metadata, and credential-free evidence references."
        );
        continue;
      }
      const outcome = review.outcome as A2AReviewOutcome;
      const reviewedAt =
        review.reviewedAt === null
          ? null
          : canonicalTimestamp(review.reviewedAt);
      if (
        outcome === "pending" &&
        (review.reviewedAt !== null ||
          review.evidenceRefs.length !== 0 ||
          review.rationale !== null)
      ) {
        addFinding(
          findings,
          "error",
          "PENDING_CASE_HAS_ASSERTIONS",
          path,
          "A pending case must not contain review time, evidence, or rationale assertions."
        );
        continue;
      }
      if (
        outcome !== "pending" &&
        (!reviewedAt || review.evidenceRefs.length === 0)
      ) {
        addFinding(
          findings,
          "error",
          "INCOMPLETE_CASE_REVIEW",
          path,
          "An accepted, rejected, or waived case requires a canonical review time and at least one evidence reference."
        );
        continue;
      }
      if (
        (outcome === "rejected" || outcome === "waived") &&
        !nonEmptyString(review.rationale, 2_000)
      ) {
        addFinding(
          findings,
          "error",
          "CASE_RATIONALE_REQUIRED",
          `${path}.rationale`,
          "Rejected and waived cases require a bounded rationale."
        );
        continue;
      }
      if (
        reviewedAt &&
        generatedAt &&
        new Date(reviewedAt).getTime() > new Date(generatedAt).getTime()
      ) {
        addFinding(
          findings,
          "error",
          "CASE_REVIEW_AFTER_LEDGER",
          `${path}.reviewedAt`,
          "A case review cannot occur after the generated ledger timestamp."
        );
        continue;
      }
      acceptedReviews.set(review.caseId as string, {
        caseId: review.caseId as string,
        outcome,
        reviewedAt,
        evidenceRefs: (review.evidenceRefs as string[]).map(reference =>
          reference.trim()
        ),
        rationale:
          review.rationale === null
            ? null
            : (review.rationale as string).trim(),
      });
    }
  }
  if (plan) {
    const missing = plan.cases.filter(
      testCase => !acceptedReviews.has(testCase.id)
    );
    if (missing.length > 0) {
      addFinding(
        findings,
        "error",
        "MISSING_CASE_REVIEWS",
        "$.profile.caseReviews",
        `${missing.length} planned ${missing.length === 1 ? "case is" : "cases are"} missing a review row.`
      );
    }
  }

  const tckReview = acceptedReviews.get("a2a-official-tck");
  if (tckReview && receipt && tckReview.outcome !== "pending") {
    const requiredReference = `urn:sha256:${receipt.receipt.source.tckReport.sha256.toLowerCase()}`;
    if (
      !tckReview.evidenceRefs.some(
        reference => reference.toLowerCase() === requiredReference
      )
    ) {
      addFinding(
        findings,
        "error",
        "TCK_CASE_NOT_BOUND_TO_REPORT",
        "$.profile.caseReviews",
        "The reviewed official-TCK case must reference the exact TCK report as urn:sha256:<digest>."
      );
    }
  }

  if (decidedAt && generatedAt && decidedAt > generatedAt) {
    addFinding(
      findings,
      "error",
      "DECISION_AFTER_LEDGER",
      "$.profile.decidedAt",
      "The owner decision cannot occur after the generated ledger timestamp."
    );
  }
  const latestReviewTimestamp = Array.from(acceptedReviews.values())
    .map(review => review.reviewedAt)
    .filter((timestamp): timestamp is string => timestamp !== null)
    .sort()
    .at(-1);
  if (decidedAt && latestReviewTimestamp && decidedAt < latestReviewTimestamp) {
    addFinding(
      findings,
      "error",
      "DECISION_PRECEDES_CASE_REVIEW",
      "$.profile.decidedAt",
      "The owner decision cannot predate a case review included in the ledger."
    );
  }
  if (
    findings.slice(start).some(finding => finding.severity === "error") ||
    typeof value.reviewOwner !== "string" ||
    typeof value.implementationRevision !== "string"
  ) {
    return null;
  }
  return {
    reviewOwner: value.reviewOwner.trim(),
    decisionOwner:
      decision === "not-made" ? "" : String(value.decisionOwner).trim(),
    implementationRevision: value.implementationRevision.toLowerCase(),
    decision,
    decidedAt,
    decisionRationale:
      decision === "not-made" ? null : String(value.decisionRationale).trim(),
    caseReviews: acceptedReviews,
  };
}

function reviewSummary(
  cases: A2AAcceptanceCase[],
  caseReviews: Map<string, A2ACaseReviewInput>
): A2AReviewLedger["summary"] {
  const count = (outcome: A2AReviewOutcome, blocking?: boolean) =>
    cases.filter(
      testCase =>
        caseReviews.get(testCase.id)?.outcome === outcome &&
        (blocking === undefined || testCase.blocking === blocking)
    ).length;
  return {
    total: cases.length,
    blocking: cases.filter(testCase => testCase.blocking).length,
    accepted: count("accepted"),
    rejected: count("rejected"),
    waived: count("waived"),
    pending: count("pending"),
    blockingAccepted: count("accepted", true),
    blockingRejected: count("rejected", true),
    blockingWaived: count("waived", true),
    blockingPending: count("pending", true),
    evidenceReferences: Array.from(caseReviews.values()).reduce(
      (total, review) => total + review.evidenceRefs.length,
      0
    ),
  };
}

export function defaultA2AReviewProfile(): A2AReviewProfile {
  return {
    reviewOwner: "",
    decisionOwner: "",
    implementationRevision: "",
    decision: "not-made",
    decidedAt: null,
    decisionRationale: null,
    caseReviews: [],
  };
}

export function pendingA2ACaseReview(caseId: string): A2ACaseReviewInput {
  return {
    caseId,
    outcome: "pending",
    reviewedAt: null,
    evidenceRefs: [],
    rationale: null,
  };
}

export function canonicalJson(value: unknown): string {
  function normalize(item: unknown): unknown {
    if (Array.isArray(item)) return item.map(normalize);
    if (isRecord(item)) {
      return Object.fromEntries(
        Object.keys(item)
          .sort()
          .map(key => [key, normalize(item[key])])
      );
    }
    return item;
  }
  return JSON.stringify(normalize(value));
}

export function validateA2AReviewLedger(
  acceptancePlan: unknown,
  tckReceipt: unknown,
  profile: unknown,
  generatedAt: string,
  acceptancePlanCanonicalSha256: string,
  tckReceiptCanonicalSha256: string
): A2AReviewAnalysis {
  const findings: BlueprintFinding[] = [];
  const ledgerTimestamp = canonicalTimestamp(generatedAt);
  if (!ledgerTimestamp || ledgerTimestamp !== generatedAt) {
    addFinding(
      findings,
      "error",
      "INVALID_LEDGER_TIMESTAMP",
      "$.generatedAt",
      "Supply a canonical UTC ledger timestamp such as 2026-08-01T14:10:00.000Z."
    );
  }
  if (!sha256Pattern.test(acceptancePlanCanonicalSha256)) {
    addFinding(
      findings,
      "error",
      "INVALID_PLAN_DIGEST",
      "$.acceptancePlanCanonicalSha256",
      "Supply the 64-character SHA-256 of the Field Atlas canonical acceptance-plan JSON."
    );
  }
  if (!sha256Pattern.test(tckReceiptCanonicalSha256)) {
    addFinding(
      findings,
      "error",
      "INVALID_TCK_RECEIPT_DIGEST",
      "$.tckReceiptCanonicalSha256",
      "Supply the 64-character SHA-256 of the Field Atlas canonical TCK-receipt JSON."
    );
  }

  const plan = validatePlan(acceptancePlan, findings);
  const receipt = validateReceipt(tckReceipt, plan, findings);
  const acceptedProfile = validateProfile(
    profile,
    plan,
    receipt,
    ledgerTimestamp,
    findings
  );
  if (!plan || !receipt || !acceptedProfile || !ledgerTimestamp) {
    return summarize(findings);
  }
  if (ledgerTimestamp < receipt.receipt.generatedAt) {
    addFinding(
      findings,
      "error",
      "LEDGER_PREDATES_TCK_RECEIPT",
      "$.generatedAt",
      "The review ledger cannot predate its bound TCK receipt."
    );
    return summarize(findings);
  }

  const summary = reviewSummary(plan.cases, acceptedProfile.caseReviews);
  const automatedReadiness: A2AAutomatedReadiness =
    summary.blockingRejected > 0 || summary.blockingPending > 0
      ? "blocked"
      : "eligible-for-owner-decision";
  if (
    acceptedProfile.decision === "approved" &&
    automatedReadiness === "blocked"
  ) {
    addFinding(
      findings,
      "error",
      "APPROVAL_CONTRADICTS_BLOCKING_RESULTS",
      "$.profile.decision",
      "An owner approval is invalid while any blocking case is rejected or pending."
    );
    return summarize(findings);
  }
  if (acceptedProfile.decision === "not-made") {
    addFinding(
      findings,
      "warning",
      "OWNER_DECISION_PENDING",
      "$.profile.decision",
      "The case ledger is preserved, but an accountable release decision has not been recorded."
    );
  }
  if (summary.blockingWaived > 0) {
    addFinding(
      findings,
      "warning",
      "BLOCKING_WAIVERS_RECORDED",
      "$.summary.blockingWaived",
      `${summary.blockingWaived} blocking ${summary.blockingWaived === 1 ? "case has" : "cases have"} an explicit owner waiver.`
    );
  }
  if (
    acceptedProfile.decision === "approved" &&
    (summary.pending > summary.blockingPending ||
      summary.rejected > summary.blockingRejected)
  ) {
    addFinding(
      findings,
      "warning",
      "NON_BLOCKING_EXCEPTIONS_ACCEPTED",
      "$.conclusion.releaseDecision",
      "The approval retains pending or rejected non-blocking cases for follow-up."
    );
  }
  const tckReview = acceptedProfile.caseReviews.get("a2a-official-tck")!;
  const requirements = receipt.receipt.observations.requirements;
  if (
    (tckReview.outcome === "accepted" || tckReview.outcome === "waived") &&
    (requirements.failed > 0 ||
      requirements.skipped > 0 ||
      requirements.notTested > 0)
  ) {
    addFinding(
      findings,
      "warning",
      "TCK_CAVEATS_DISPOSITIONED",
      "$.review.cases",
      "The owner disposition retains official-report failures, skips, or not-tested requirements for accountable review."
    );
  }

  addFinding(
    findings,
    "pass",
    "PLAN_AND_TCK_RECEIPT_BOUND",
    "$.source",
    "The ledger binds the canonical plan and receipt plus the receipt's exact TCK report digest."
  );
  addFinding(
    findings,
    "pass",
    "PLANNED_CASE_COVERAGE_COMPLETE",
    "$.review.cases",
    "Every planned case has exactly one explicit accepted, rejected, waived, or pending row."
  );
  addFinding(
    findings,
    "pass",
    "BLOCKING_READINESS_COMPUTED",
    "$.conclusion.automatedReadiness",
    "Readiness is derived from the plan's blocking decisions without silently promoting non-blocking results."
  );
  addFinding(
    findings,
    "pass",
    "OWNER_ASSERTION_BOUNDARY_EXPLICIT",
    "$.proofBoundary",
    "The ledger states that Field Atlas did not run the service, authenticate sources, or verify owner identity."
  );
  if (acceptedProfile.decision !== "not-made") {
    addFinding(
      findings,
      "pass",
      "OWNER_DECISION_RECORDED",
      "$.conclusion.releaseDecision",
      "An accountable owner decision and rationale are recorded as assertions."
    );
  }

  const reviewItems = findings
    .filter(finding => finding.severity === "warning")
    .map(finding => ({ code: finding.code, message: finding.message }));
  const ledger: A2AReviewLedger = {
    schemaVersion: a2aReviewLedgerSchemaVersion,
    generatedAt: ledgerTimestamp,
    status: "owner-asserted-review",
    proofBoundary: {
      runtimeExecutionByFieldAtlas: "not-performed",
      sourceAuthenticationByFieldAtlas: "not-performed",
      ownerIdentityVerificationByFieldAtlas: "not-performed",
      decisionAuthority: "owner-asserted",
    },
    source: {
      acceptancePlan: {
        schemaVersion: plan.manifest.schemaVersion,
        canonicalSha256: acceptancePlanCanonicalSha256.toLowerCase(),
        generatedAt: plan.manifest.generatedAt,
        scenarioId: plan.manifest.source.blueprint.scenarioId,
        agentName: plan.manifest.source.agentCard.name,
        agentVersion: plan.manifest.source.agentCard.version,
        interfaceUrl: plan.manifest.source.agentCard.interfaceUrl,
        binding: plan.manifest.source.agentCard.binding as A2AProtocolBinding,
        protocolVersion: plan.manifest.source.agentCard.protocolVersion,
        acceptanceOwner: plan.manifest.acceptance.owner,
        environment: plan.manifest.acceptance.environment,
      },
      tckReceipt: {
        schemaVersion: receipt.receipt.schemaVersion,
        canonicalSha256: tckReceiptCanonicalSha256.toLowerCase(),
        generatedAt: receipt.receipt.generatedAt,
        tckReportSha256: receipt.receipt.source.tckReport.sha256,
        assertedTckRevision:
          receipt.receipt.source.provenance.assertedTckRevision,
        implementationRevision: acceptedProfile.implementationRevision,
      },
    },
    review: {
      reviewOwner: acceptedProfile.reviewOwner,
      decisionOwner: acceptedProfile.decisionOwner,
      decision: acceptedProfile.decision,
      decidedAt: acceptedProfile.decidedAt,
      decisionRationale: acceptedProfile.decisionRationale,
      cases: plan.cases.map(testCase => {
        const review = acceptedProfile.caseReviews.get(testCase.id)!;
        return {
          caseId: testCase.id,
          category: testCase.category,
          title: testCase.title,
          blocking: testCase.blocking,
          source: testCase.source,
          outcome: review.outcome,
          reviewedBy:
            review.outcome === "pending" ? null : acceptedProfile.reviewOwner,
          reviewedAt: review.reviewedAt,
          evidenceRefs: review.evidenceRefs,
          rationale: review.rationale,
        };
      }),
    },
    summary,
    conclusion: {
      automatedReadiness,
      releaseDecision: acceptedProfile.decision,
    },
    reviewItems,
  };

  return { ...summarize(findings), ledger };
}

function markdownText(value: string): string {
  return value
    .replaceAll(/\s+/g, " ")
    .trim()
    .replace(markdownMetacharacters, "\\$1");
}

export function a2aReviewLedgerToMarkdown(ledger: A2AReviewLedger): string {
  const lines = [
    "# A2A acceptance review ledger",
    "",
    `- Schema: \`${ledger.schemaVersion}\``,
    `- Generated: ${ledger.generatedAt}`,
    `- Status: ${ledger.status}`,
    `- Scenario: ${markdownText(ledger.source.acceptancePlan.scenarioId)}`,
    `- Agent: ${markdownText(ledger.source.acceptancePlan.agentName)} ${markdownText(ledger.source.acceptancePlan.agentVersion)}`,
    `- Review owner: ${markdownText(ledger.review.reviewOwner)}`,
    `- Automated readiness: **${ledger.conclusion.automatedReadiness}**`,
    `- Owner release decision: **${ledger.conclusion.releaseDecision}**`,
    "",
    "> This is an owner-asserted Field Atlas review record. Field Atlas did not run the service, authenticate the source artifacts, or verify the named owners' identities.",
    "",
    "## Source binding",
    "",
    `- Acceptance plan canonical SHA-256: \`${ledger.source.acceptancePlan.canonicalSha256}\``,
    `- TCK receipt canonical SHA-256: \`${ledger.source.tckReceipt.canonicalSha256}\``,
    `- TCK report exact-byte SHA-256: \`${ledger.source.tckReceipt.tckReportSha256}\``,
    `- Implementation revision: \`${ledger.source.tckReceipt.implementationRevision}\``,
    "",
    "## Summary",
    "",
    `- Total / blocking: ${ledger.summary.total} / ${ledger.summary.blocking}`,
    `- Accepted / rejected / waived / pending: ${ledger.summary.accepted} / ${ledger.summary.rejected} / ${ledger.summary.waived} / ${ledger.summary.pending}`,
    `- Blocking accepted / rejected / waived / pending: ${ledger.summary.blockingAccepted} / ${ledger.summary.blockingRejected} / ${ledger.summary.blockingWaived} / ${ledger.summary.blockingPending}`,
    `- Evidence references: ${ledger.summary.evidenceReferences}`,
    "",
    "## Case dispositions",
    "",
  ];
  for (const review of ledger.review.cases) {
    lines.push(
      `### ${markdownText(review.title)}`,
      "",
      `- ID: \`${markdownText(review.caseId)}\``,
      `- Blocking: ${review.blocking ? "yes" : "no"}`,
      `- Outcome: **${review.outcome}**`,
      `- Reviewed by: ${review.reviewedBy ? markdownText(review.reviewedBy) : "pending"}`,
      `- Reviewed at: ${review.reviewedAt ?? "pending"}`,
      `- Evidence: ${review.evidenceRefs.length > 0 ? review.evidenceRefs.map(reference => `\`${markdownText(reference)}\``).join(", ") : "pending"}`,
      `- Rationale: ${review.rationale ? markdownText(review.rationale) : "none recorded"}`,
      ""
    );
  }
  if (ledger.reviewItems.length > 0) {
    lines.push("## Review items", "");
    for (const item of ledger.reviewItems) {
      lines.push(
        `- **${markdownText(item.code)}:** ${markdownText(item.message)}`
      );
    }
    lines.push("");
  }
  if (ledger.review.decision !== "not-made") {
    lines.push(
      "## Owner decision",
      "",
      `- Decision: **${ledger.review.decision}**`,
      `- Owner: ${markdownText(ledger.review.decisionOwner)}`,
      `- At: ${ledger.review.decidedAt}`,
      `- Rationale: ${markdownText(ledger.review.decisionRationale ?? "")}`,
      ""
    );
  }
  return `${lines.join("\n")}\n`;
}
