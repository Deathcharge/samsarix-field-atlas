import type {
  BlueprintAnalysis,
  BlueprintFinding,
  FindingSeverity,
} from "./blueprint";
import { sha256Hex } from "./evidence";
import type {
  BlueprintSuiteDiff,
  SuiteDiffDimension,
  SuiteDiffImpact,
} from "./suite-diff";

export const blueprintSuiteChangePlanSchemaVersion =
  "samsarix-field-atlas/suite-change-plan/1" as const;
export const blueprintSuiteChangeReviewSchemaVersion =
  "samsarix-field-atlas/suite-change-review/1" as const;
export const maximumSuiteChangePlanBytes = 1_048_576;

type DeclaredChange = "added" | "removed" | "modified";
type DeclaredImpact = Exclude<SuiteDiffImpact, "none">;

export interface BlueprintSuiteChangeExpectation {
  caseId: string;
  change: DeclaredChange;
  impact: DeclaredImpact;
  dimensions: SuiteDiffDimension[];
  regressionAcknowledged: boolean;
  rationale: string;
}

export interface BlueprintSuiteChangeSignals {
  reportImpact: BlueprintSuiteDiff["summary"]["reportImpact"];
  suiteMetadataChanged: boolean;
  policyChanged: boolean;
  manifestChanged: boolean;
}

export interface BlueprintSuiteChangePlan {
  schemaVersion: typeof blueprintSuiteChangePlanSchemaVersion;
  mode: "declared-contract-change";
  suiteId: string;
  baselineSha256: string;
  owner: string;
  reference: string;
  expiresOn: string;
  rationale: string;
  expectations: BlueprintSuiteChangeExpectation[];
  suite: BlueprintSuiteChangeSignals;
  proofBoundary: string;
}

export interface BlueprintSuiteChangePlanAnalysis {
  status: BlueprintAnalysis["status"];
  counts: Record<FindingSeverity, number>;
  findings: BlueprintFinding[];
  plan?: BlueprintSuiteChangePlan;
}

export interface BlueprintSuiteChangePlanSource {
  uri: string;
  bytes: Uint8Array;
  plan: BlueprintSuiteChangePlan;
}

type ReviewMismatch =
  "change" | "impact" | "dimensions" | "regression-acknowledgement";

export interface BlueprintSuiteChangeReview {
  schemaVersion: typeof blueprintSuiteChangeReviewSchemaVersion;
  mode: "declared-change-review";
  asOf: string;
  source: {
    plan: {
      uri: string;
      sha256: string;
      owner: string;
      reference: string;
      expiresOn: string;
    };
    comparison: {
      baseline: { uri: string; sha256: string };
      candidate: { uri: string; sha256: string };
      outcome: BlueprintSuiteDiff["summary"]["outcome"];
      gate: BlueprintSuiteDiff["summary"]["gate"];
      failOn: BlueprintSuiteDiff["policy"]["failOn"];
    };
  };
  binding: {
    suiteId: {
      expected: string;
      baseline: string;
      candidate: string;
      matched: boolean;
    };
    baselineReportSha256: {
      expected: string;
      actual: string;
      matched: boolean;
    };
  };
  summary: {
    status: "matched" | "mismatch" | "expired";
    gate: "pass" | "fail";
    expired: boolean;
    cases: {
      expected: number;
      actualChanges: number;
      matched: number;
      mismatched: number;
      unexpected: number;
      missing: number;
    };
    suiteSignalsMatched: boolean;
    regressionAcknowledgements: {
      required: number;
      present: number;
    };
  };
  cases: Array<{
    id: string;
    disposition: "matched" | "mismatched" | "unexpected" | "missing";
    expected: BlueprintSuiteChangeExpectation | null;
    actual: {
      change: DeclaredChange;
      impact: DeclaredImpact;
      dimensions: SuiteDiffDimension[];
    } | null;
    mismatches: ReviewMismatch[];
  }>;
  suite: {
    matched: boolean;
    mismatches: Array<keyof BlueprintSuiteChangeSignals>;
    expected: BlueprintSuiteChangeSignals;
    actual: BlueprintSuiteChangeSignals;
  };
  proofBoundary: string;
}

const identifierPattern = /^[a-z][a-z0-9-]*$/;
const sha256Pattern = /^[a-f0-9]{64}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const httpsReferencePattern = /^https:\/\/(?![^/]*@)[^/?#\s]+(?:\/[^?#\s]*)?$/;
const urnPattern =
  /^urn:[a-z0-9][a-z0-9-]{0,31}:[a-zA-Z0-9][a-zA-Z0-9._:-]{0,511}$/;
const maximumValidationFindings = 256;
const changes: DeclaredChange[] = ["added", "removed", "modified"];
const impacts: DeclaredImpact[] = [
  "regression",
  "improvement",
  "review",
  "mixed",
];
const dimensions: SuiteDiffDimension[] = [
  "artifact-uri",
  "artifact-content",
  "tags",
  "status",
  "validation-status",
  "scenario",
  "finding-counts",
  "findings",
  "metrics",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedTrimmedString(
  value: unknown,
  minimum: number,
  maximum: number
): value is string {
  return (
    typeof value === "string" &&
    value.length >= minimum &&
    value.length <= maximum &&
    value.trim() === value
  );
}

function boundedSingleLineString(
  value: unknown,
  minimum: number,
  maximum: number
): value is string {
  return (
    boundedTrimmedString(value, minimum, maximum) && !/[\r\n\p{C}]/u.test(value)
  );
}

function addFinding(
  findings: BlueprintFinding[],
  code: string,
  path: string,
  message: string
) {
  if (findings.length >= maximumValidationFindings) return;
  findings.push({ severity: "error", code, path, message });
}

function checkAllowedFields(
  value: Record<string, unknown>,
  allowed: string[],
  path: string,
  findings: BlueprintFinding[]
) {
  const accepted = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (accepted.has(key)) continue;
    addFinding(
      findings,
      "UNRECOGNIZED_SUITE_CHANGE_FIELD",
      `${path}.${key.slice(0, 128)}`,
      "This field is not part of the Field Atlas suite change-plan v1 contract."
    );
  }
}

export function isCanonicalSuiteChangeDate(value: unknown): value is string {
  if (typeof value !== "string" || !datePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function isCredentialFreeReference(value: unknown): value is string {
  if (!boundedSingleLineString(value, 5, 1_024)) return false;
  if (urnPattern.test(value)) return true;
  if (!httpsReferencePattern.test(value)) return false;
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      parsed.username === "" &&
      parsed.password === "" &&
      parsed.search === "" &&
      parsed.hash === "" &&
      parsed.hostname.length > 0
    );
  } catch {
    return false;
  }
}

function validateExpectation(
  value: unknown,
  path: string,
  findings: BlueprintFinding[]
): value is BlueprintSuiteChangeExpectation {
  if (!isRecord(value)) {
    addFinding(
      findings,
      "INVALID_SUITE_CHANGE_EXPECTATION",
      path,
      "Expected one bounded case-level change declaration."
    );
    return false;
  }
  checkAllowedFields(
    value,
    [
      "caseId",
      "change",
      "impact",
      "dimensions",
      "regressionAcknowledged",
      "rationale",
    ],
    path,
    findings
  );
  let valid = true;
  if (
    !boundedTrimmedString(value.caseId, 1, 128) ||
    !identifierPattern.test(value.caseId)
  ) {
    addFinding(
      findings,
      "INVALID_SUITE_CHANGE_CASE_ID",
      `${path}.caseId`,
      "Expected a lowercase stable case identifier beginning with a letter."
    );
    valid = false;
  }
  if (!changes.includes(value.change as DeclaredChange)) {
    addFinding(
      findings,
      "INVALID_SUITE_CHANGE_KIND",
      `${path}.change`,
      "Expected added, removed, or modified."
    );
    valid = false;
  }
  if (!impacts.includes(value.impact as DeclaredImpact)) {
    addFinding(
      findings,
      "INVALID_SUITE_CHANGE_IMPACT",
      `${path}.impact`,
      "Expected regression, improvement, review, or mixed."
    );
    valid = false;
  }
  if (!Array.isArray(value.dimensions) || value.dimensions.length > 9) {
    addFinding(
      findings,
      "INVALID_SUITE_CHANGE_DIMENSIONS",
      `${path}.dimensions`,
      "Expected at most nine unique suite-diff dimensions."
    );
    valid = false;
  } else {
    const accepted = value.dimensions.filter(dimension =>
      dimensions.includes(dimension as SuiteDiffDimension)
    );
    if (
      accepted.length !== value.dimensions.length ||
      new Set(value.dimensions).size !== value.dimensions.length
    ) {
      addFinding(
        findings,
        "INVALID_SUITE_CHANGE_DIMENSIONS",
        `${path}.dimensions`,
        "Expected unique dimensions from the suite-diff v1 contract."
      );
      valid = false;
    }
    if (
      (value.change === "modified" && value.dimensions.length === 0) ||
      ((value.change === "added" || value.change === "removed") &&
        value.dimensions.length !== 0)
    ) {
      addFinding(
        findings,
        "INCONSISTENT_SUITE_CHANGE_DIMENSIONS",
        `${path}.dimensions`,
        "Modified cases require dimensions; added and removed cases use an empty list."
      );
      valid = false;
    }
  }
  if (typeof value.regressionAcknowledged !== "boolean") {
    addFinding(
      findings,
      "INVALID_SUITE_CHANGE_ACKNOWLEDGEMENT",
      `${path}.regressionAcknowledged`,
      "Expected an explicit boolean regression acknowledgement."
    );
    valid = false;
  } else if (
    impacts.includes(value.impact as DeclaredImpact) &&
    value.regressionAcknowledged !==
      (value.impact === "regression" || value.impact === "mixed")
  ) {
    addFinding(
      findings,
      "INCONSISTENT_SUITE_CHANGE_ACKNOWLEDGEMENT",
      `${path}.regressionAcknowledged`,
      "Regression and mixed impacts require true; other impacts require false."
    );
    valid = false;
  }
  if (!boundedTrimmedString(value.rationale, 20, 1_000)) {
    addFinding(
      findings,
      "INVALID_SUITE_CHANGE_RATIONALE",
      `${path}.rationale`,
      "Expected a trimmed rationale between 20 and 1,000 characters."
    );
    valid = false;
  }
  if (value.change === "removed" && value.impact !== "regression") {
    addFinding(
      findings,
      "INCONSISTENT_SUITE_CHANGE_IMPACT",
      `${path}.impact`,
      "Removed coverage is always a regression."
    );
    valid = false;
  }
  if (
    value.change === "added" &&
    value.impact !== "review" &&
    value.impact !== "regression"
  ) {
    addFinding(
      findings,
      "INCONSISTENT_SUITE_CHANGE_IMPACT",
      `${path}.impact`,
      "Added coverage can be review or regression in suite-diff v1."
    );
    valid = false;
  }
  return valid;
}

function validateSuiteSignals(
  value: unknown,
  findings: BlueprintFinding[]
): value is BlueprintSuiteChangeSignals {
  if (!isRecord(value)) {
    addFinding(
      findings,
      "INVALID_SUITE_CHANGE_SIGNALS",
      "$.suite",
      "Expected exact report, metadata, policy, and manifest change signals."
    );
    return false;
  }
  const keys = [
    "reportImpact",
    "suiteMetadataChanged",
    "policyChanged",
    "manifestChanged",
  ];
  checkAllowedFields(value, keys, "$.suite", findings);
  let valid = true;
  if (
    !(["regression", "improvement", "none"] as unknown[]).includes(
      value.reportImpact
    )
  ) {
    addFinding(
      findings,
      "INVALID_SUITE_CHANGE_SIGNALS",
      "$.suite.reportImpact",
      "Expected regression, improvement, or none."
    );
    valid = false;
  }
  for (const key of keys.slice(1)) {
    if (typeof value[key] !== "boolean") {
      addFinding(
        findings,
        "INVALID_SUITE_CHANGE_SIGNALS",
        `$.suite.${key}`,
        "Expected a boolean suite-level change signal."
      );
      valid = false;
    }
  }
  return valid;
}

function summarizePlanValidation(
  findings: BlueprintFinding[],
  plan?: BlueprintSuiteChangePlan
): BlueprintSuiteChangePlanAnalysis {
  const counts = findings.reduce<Record<FindingSeverity, number>>(
    (summary, finding) => {
      summary[finding.severity] += 1;
      return summary;
    },
    { error: 0, warning: 0, pass: 0 }
  );
  return {
    status: counts.error > 0 ? "invalid" : "ready",
    counts,
    findings,
    ...(counts.error === 0 && plan ? { plan } : {}),
  };
}

export function validateBlueprintSuiteChangePlan(
  value: unknown
): BlueprintSuiteChangePlanAnalysis {
  const findings: BlueprintFinding[] = [];
  if (!isRecord(value)) {
    addFinding(
      findings,
      "EXPECTED_SUITE_CHANGE_PLAN_OBJECT",
      "$",
      "Expected a suite change-plan object."
    );
    return summarizePlanValidation(findings);
  }
  checkAllowedFields(
    value,
    [
      "schemaVersion",
      "mode",
      "suiteId",
      "baselineSha256",
      "owner",
      "reference",
      "expiresOn",
      "rationale",
      "expectations",
      "suite",
      "proofBoundary",
    ],
    "$",
    findings
  );
  if (value.schemaVersion !== blueprintSuiteChangePlanSchemaVersion) {
    addFinding(
      findings,
      "UNSUPPORTED_SUITE_CHANGE_PLAN_SCHEMA",
      "$.schemaVersion",
      `Expected ${blueprintSuiteChangePlanSchemaVersion}.`
    );
  }
  if (value.mode !== "declared-contract-change") {
    addFinding(
      findings,
      "UNSUPPORTED_SUITE_CHANGE_PLAN_MODE",
      "$.mode",
      "Expected declared-contract-change."
    );
  }
  if (
    !boundedTrimmedString(value.suiteId, 1, 128) ||
    !identifierPattern.test(value.suiteId)
  ) {
    addFinding(
      findings,
      "INVALID_SUITE_CHANGE_SUITE_ID",
      "$.suiteId",
      "Expected a lowercase suite identifier beginning with a letter."
    );
  }
  if (
    typeof value.baselineSha256 !== "string" ||
    !sha256Pattern.test(value.baselineSha256)
  ) {
    addFinding(
      findings,
      "INVALID_SUITE_CHANGE_BASELINE",
      "$.baselineSha256",
      "Expected the lowercase SHA-256 of the exact baseline report bytes."
    );
  }
  if (!boundedSingleLineString(value.owner, 2, 160)) {
    addFinding(
      findings,
      "INVALID_SUITE_CHANGE_OWNER",
      "$.owner",
      "Expected a trimmed owner assertion between 2 and 160 characters."
    );
  }
  if (!isCredentialFreeReference(value.reference)) {
    addFinding(
      findings,
      "INVALID_SUITE_CHANGE_REFERENCE",
      "$.reference",
      "Expected a credential-free HTTPS URL without query/fragment, or a bounded URN."
    );
  }
  if (!isCanonicalSuiteChangeDate(value.expiresOn)) {
    addFinding(
      findings,
      "INVALID_SUITE_CHANGE_EXPIRY",
      "$.expiresOn",
      "Expected a real calendar date in YYYY-MM-DD form."
    );
  }
  if (!boundedTrimmedString(value.rationale, 20, 2_000)) {
    addFinding(
      findings,
      "INVALID_SUITE_CHANGE_RATIONALE",
      "$.rationale",
      "Expected a trimmed rationale between 20 and 2,000 characters."
    );
  }

  if (!Array.isArray(value.expectations) || value.expectations.length > 128) {
    addFinding(
      findings,
      "INVALID_SUITE_CHANGE_EXPECTATIONS",
      "$.expectations",
      "Expected at most 128 case-level change declarations."
    );
  } else {
    value.expectations.forEach((expectation, index) =>
      validateExpectation(expectation, `$.expectations[${index}]`, findings)
    );
    const caseIds = value.expectations
      .filter(isRecord)
      .map(expectation => expectation.caseId)
      .filter((caseId): caseId is string => typeof caseId === "string");
    if (new Set(caseIds).size !== caseIds.length) {
      addFinding(
        findings,
        "DUPLICATE_SUITE_CHANGE_CASE",
        "$.expectations",
        "Each stable case ID can be declared at most once."
      );
    }
  }

  const suiteValue = value.suite;
  const suiteValid = validateSuiteSignals(suiteValue, findings);
  if (
    suiteValid &&
    Array.isArray(value.expectations) &&
    value.expectations.length === 0 &&
    suiteValue.reportImpact === "none" &&
    !suiteValue.suiteMetadataChanged &&
    !suiteValue.policyChanged &&
    !suiteValue.manifestChanged
  ) {
    addFinding(
      findings,
      "EMPTY_SUITE_CHANGE_PLAN",
      "$",
      "Declare at least one case-level or suite-level change."
    );
  }
  if (!boundedTrimmedString(value.proofBoundary, 20, 1_000)) {
    addFinding(
      findings,
      "INVALID_SUITE_CHANGE_PROOF_BOUNDARY",
      "$.proofBoundary",
      "Expected a trimmed proof-boundary statement between 20 and 1,000 characters."
    );
  }

  if (findings.every(finding => finding.severity !== "error")) {
    findings.push({
      severity: "pass",
      code: "SUITE_CHANGE_PLAN_CONFORMANT",
      path: "$",
      message:
        "The suite change plan is bounded, explicit, and structurally consistent.",
    });
  }
  return summarizePlanValidation(
    findings,
    value as unknown as BlueprintSuiteChangePlan
  );
}

function lexicalCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sameDimensions(
  expected: SuiteDiffDimension[],
  actual: SuiteDiffDimension[]
): boolean {
  const expectedSorted = [...expected].sort(lexicalCompare);
  const actualSorted = [...actual].sort(lexicalCompare);
  return (
    expectedSorted.length === actualSorted.length &&
    expectedSorted.every(
      (dimension, index) => dimension === actualSorted[index]
    )
  );
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort(lexicalCompare)
      .map(key => [key, canonicalValue(value[key])])
  );
}

function sameValue(left: unknown, right: unknown): boolean {
  return (
    JSON.stringify(canonicalValue(left)) ===
    JSON.stringify(canonicalValue(right))
  );
}

function actualSignals(diff: BlueprintSuiteDiff): BlueprintSuiteChangeSignals {
  return {
    reportImpact: diff.summary.reportImpact,
    suiteMetadataChanged: diff.summary.suiteMetadataChanged,
    policyChanged: diff.summary.policyChanged,
    manifestChanged: diff.summary.manifestChanged,
  };
}

export async function createBlueprintSuiteChangeReview(
  source: BlueprintSuiteChangePlanSource,
  diff: BlueprintSuiteDiff,
  asOf: string
): Promise<BlueprintSuiteChangeReview> {
  if (!isCanonicalSuiteChangeDate(asOf)) {
    throw new Error(
      "Review date must be a real calendar date in YYYY-MM-DD form."
    );
  }
  if (source.bytes.byteLength > maximumSuiteChangePlanBytes) {
    throw new Error("Suite change plan exceeds the 1 MiB input limit.");
  }
  if (!boundedSingleLineString(source.uri, 1, 1_024)) {
    throw new Error(
      "Suite change-plan URI must be a bounded single-line value."
    );
  }
  let importedPlan: unknown;
  try {
    importedPlan = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(source.bytes)
    ) as unknown;
  } catch {
    throw new Error("Suite change-plan bytes must contain valid UTF-8 JSON.");
  }
  if (!sameValue(importedPlan, source.plan)) {
    throw new Error(
      "Suite change-plan bytes do not match the supplied plan object."
    );
  }
  const analysis = validateBlueprintSuiteChangePlan(source.plan);
  if (!analysis.plan) {
    const first = analysis.findings[0];
    throw new Error(
      first
        ? `Suite change plan is invalid: ${first.code} at ${first.path}.`
        : "Suite change plan is invalid."
    );
  }
  const plan = analysis.plan;
  const actualCases = diff.cases.filter(
    (
      entry
    ): entry is typeof entry & {
      change: DeclaredChange;
      impact: DeclaredImpact;
    } => entry.change !== "unchanged" && entry.impact !== "none"
  );
  const expectedById = new Map(
    plan.expectations.map(expectation => [expectation.caseId, expectation])
  );
  const actualById = new Map(actualCases.map(entry => [entry.id, entry]));
  const ids = [...new Set([...expectedById.keys(), ...actualById.keys()])].sort(
    lexicalCompare
  );
  const cases: BlueprintSuiteChangeReview["cases"] = ids.map(id => {
    const expected = expectedById.get(id) ?? null;
    const actualEntry = actualById.get(id);
    const actual = actualEntry
      ? {
          change: actualEntry.change,
          impact: actualEntry.impact,
          dimensions: [...actualEntry.differences],
        }
      : null;
    const mismatches: ReviewMismatch[] = [];
    if (expected && actual) {
      if (expected.change !== actual.change) mismatches.push("change");
      if (expected.impact !== actual.impact) mismatches.push("impact");
      if (!sameDimensions(expected.dimensions, actual.dimensions)) {
        mismatches.push("dimensions");
      }
      if (
        (actual.impact === "regression" || actual.impact === "mixed") &&
        !expected.regressionAcknowledged
      ) {
        mismatches.push("regression-acknowledgement");
      }
    }
    const disposition = !expected
      ? "unexpected"
      : !actual
        ? "missing"
        : mismatches.length > 0
          ? "mismatched"
          : "matched";
    return { id, disposition, expected, actual, mismatches };
  });

  const expectedSuite = { ...plan.suite };
  const actualSuite = actualSignals(diff);
  const suiteKeys: Array<keyof BlueprintSuiteChangeSignals> = [
    "reportImpact",
    "suiteMetadataChanged",
    "policyChanged",
    "manifestChanged",
  ];
  const suiteMismatches = suiteKeys.filter(
    key => expectedSuite[key] !== actualSuite[key]
  );
  const suiteIdMatched =
    plan.suiteId === diff.source.baseline.suite.id &&
    plan.suiteId === diff.source.candidate.suite.id;
  const baselineSha256Matched =
    plan.baselineSha256 === diff.source.baseline.sha256;
  const expired = asOf > plan.expiresOn;
  const matched = cases.filter(entry => entry.disposition === "matched").length;
  const mismatched = cases.filter(
    entry => entry.disposition === "mismatched"
  ).length;
  const unexpected = cases.filter(
    entry => entry.disposition === "unexpected"
  ).length;
  const missing = cases.filter(entry => entry.disposition === "missing").length;
  const requiredAcknowledgements = actualCases.filter(
    entry => entry.impact === "regression" || entry.impact === "mixed"
  ).length;
  const presentAcknowledgements = cases.filter(
    entry =>
      entry.actual &&
      (entry.actual.impact === "regression" ||
        entry.actual.impact === "mixed") &&
      entry.expected?.regressionAcknowledged === true
  ).length;
  const gatePasses =
    !expired &&
    suiteIdMatched &&
    baselineSha256Matched &&
    mismatched === 0 &&
    unexpected === 0 &&
    missing === 0 &&
    suiteMismatches.length === 0;
  const planSha256 = await sha256Hex(source.bytes);

  return {
    schemaVersion: blueprintSuiteChangeReviewSchemaVersion,
    mode: "declared-change-review",
    asOf,
    source: {
      plan: {
        uri: source.uri.replaceAll("\\", "/"),
        sha256: planSha256,
        owner: plan.owner,
        reference: plan.reference,
        expiresOn: plan.expiresOn,
      },
      comparison: {
        baseline: {
          uri: diff.source.baseline.uri,
          sha256: diff.source.baseline.sha256,
        },
        candidate: {
          uri: diff.source.candidate.uri,
          sha256: diff.source.candidate.sha256,
        },
        outcome: diff.summary.outcome,
        gate: diff.summary.gate,
        failOn: diff.policy.failOn,
      },
    },
    binding: {
      suiteId: {
        expected: plan.suiteId,
        baseline: diff.source.baseline.suite.id,
        candidate: diff.source.candidate.suite.id,
        matched: suiteIdMatched,
      },
      baselineReportSha256: {
        expected: plan.baselineSha256,
        actual: diff.source.baseline.sha256,
        matched: baselineSha256Matched,
      },
    },
    summary: {
      status: expired ? "expired" : gatePasses ? "matched" : "mismatch",
      gate: gatePasses ? "pass" : "fail",
      expired,
      cases: {
        expected: plan.expectations.length,
        actualChanges: actualCases.length,
        matched,
        mismatched,
        unexpected,
        missing,
      },
      suiteSignalsMatched: suiteMismatches.length === 0,
      regressionAcknowledgements: {
        required: requiredAcknowledgements,
        present: presentAcknowledgements,
      },
    },
    cases,
    suite: {
      matched: suiteMismatches.length === 0,
      mismatches: suiteMismatches,
      expected: expectedSuite,
      actual: actualSuite,
    },
    proofBoundary:
      "Field Atlas matched one bounded owner-asserted change plan against a deterministic local suite comparison as of the supplied date. It did not verify the date, authenticate the owner, authorize an exception, execute contracts, or approve a release; repository review and access controls remain authoritative.",
  };
}
