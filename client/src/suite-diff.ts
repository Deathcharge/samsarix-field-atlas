import type {
  BlueprintAnalysis,
  BlueprintFinding,
  FindingSeverity,
} from "./blueprint";
import { sha256Hex } from "./evidence";
import {
  blueprintSuiteReportSchemaVersion,
  maximumSuiteEntries,
  type BlueprintSuiteReport,
} from "./suite";

export const blueprintSuiteDiffSchemaVersion =
  "samsarix-field-atlas/suite-diff/1" as const;
export const maximumSuiteReportBytes = 8_388_608;

export type SuiteDiffImpact =
  "regression" | "improvement" | "review" | "mixed" | "none";

export type SuiteDiffDimension =
  | "artifact-uri"
  | "artifact-content"
  | "tags"
  | "status"
  | "validation-status"
  | "scenario"
  | "finding-counts"
  | "findings"
  | "metrics";

export interface BlueprintSuiteReportAnalysis {
  status: BlueprintAnalysis["status"];
  counts: Record<FindingSeverity, number>;
  findings: BlueprintFinding[];
  report?: BlueprintSuiteReport;
}

export interface BlueprintSuiteDiffSource {
  uri: string;
  bytes: Uint8Array;
  report: BlueprintSuiteReport;
}

interface SuiteDiffCaseSnapshot {
  artifact: BlueprintSuiteReport["cases"][number]["artifact"];
  tags: string[];
  status: BlueprintAnalysis["status"];
  validationStatus: BlueprintAnalysis["status"];
  scenario: BlueprintSuiteReport["cases"][number]["scenario"];
  counts: Record<FindingSeverity, number>;
  metrics: BlueprintSuiteReport["cases"][number]["metrics"];
  findingCodes: string[];
}

export interface BlueprintSuiteDiff {
  schemaVersion: typeof blueprintSuiteDiffSchemaVersion;
  mode: "contract-conformance-diff";
  policy: {
    failOn: "regression" | "change";
  };
  source: {
    baseline: {
      uri: string;
      sha256: string;
      suite: BlueprintSuiteReport["suite"];
      strict: boolean;
      status: BlueprintAnalysis["status"];
      manifestSha256: string | null;
    };
    candidate: {
      uri: string;
      sha256: string;
      suite: BlueprintSuiteReport["suite"];
      strict: boolean;
      status: BlueprintAnalysis["status"];
      manifestSha256: string | null;
    };
  };
  summary: {
    outcome: "regression" | "review" | "improvement" | "unchanged";
    gate: "pass" | "fail";
    reportImpact: "regression" | "improvement" | "none";
    suiteMetadataChanged: boolean;
    policyChanged: boolean;
    manifestChanged: boolean;
    cases: {
      baseline: number;
      candidate: number;
      total: number;
      added: number;
      removed: number;
      modified: number;
      unchanged: number;
    };
    impact: Record<SuiteDiffImpact, number>;
  };
  cases: Array<{
    id: string;
    change: "added" | "removed" | "modified" | "unchanged";
    impact: SuiteDiffImpact;
    differences: SuiteDiffDimension[];
    baseline: SuiteDiffCaseSnapshot | null;
    candidate: SuiteDiffCaseSnapshot | null;
  }>;
  proofBoundary: string;
}

const identifierPattern = /^[a-z][a-z0-9-]*$/;
const sha256Pattern = /^[a-f0-9]{64}$/;
const maximumValidationFindings = 256;
const statuses: BlueprintAnalysis["status"][] = ["invalid", "review", "ready"];
const severities: FindingSeverity[] = ["error", "warning", "pass"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedString(
  value: unknown,
  maximum: number,
  minimum = 1
): value is string {
  return (
    typeof value === "string" &&
    value.length >= minimum &&
    value.length <= maximum
  );
}

function boundedInteger(
  value: unknown,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function addValidationFinding(
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
  const allowedFields = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (allowedFields.has(key)) continue;
    const reportedKey = key.length > 128 ? `${key.slice(0, 128)}…` : key;
    addValidationFinding(
      findings,
      "UNRECOGNIZED_SUITE_REPORT_FIELD",
      `${path}.${reportedKey}`,
      "This field is not part of the Field Atlas suite report v1 contract."
    );
  }
}

function validateStatus(
  value: unknown,
  path: string,
  findings: BlueprintFinding[]
): value is BlueprintAnalysis["status"] {
  if (statuses.includes(value as BlueprintAnalysis["status"])) return true;
  addValidationFinding(
    findings,
    "INVALID_SUITE_REPORT_STATUS",
    path,
    "Expected invalid, review, or ready."
  );
  return false;
}

function validateCounts(
  value: unknown,
  path: string,
  findings: BlueprintFinding[]
): value is Record<FindingSeverity, number> {
  if (!isRecord(value)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_COUNTS",
      path,
      "Expected error, warning, and pass counts."
    );
    return false;
  }
  checkAllowedFields(value, severities, path, findings);
  let valid = true;
  for (const severity of severities) {
    if (!boundedInteger(value[severity], 0)) {
      addValidationFinding(
        findings,
        "INVALID_SUITE_REPORT_COUNT",
        `${path}.${severity}`,
        "Expected a non-negative integer finding count."
      );
      valid = false;
    }
  }
  return valid;
}

function validateFinding(
  value: unknown,
  path: string,
  findings: BlueprintFinding[]
): value is BlueprintFinding {
  if (!isRecord(value)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_FINDING",
      path,
      "Expected a conformance finding object."
    );
    return false;
  }
  checkAllowedFields(
    value,
    ["code", "severity", "path", "message"],
    path,
    findings
  );
  let valid = true;
  if (!boundedString(value.code, 128)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_FINDING",
      `${path}.code`,
      "Expected a non-empty finding code no longer than 128 characters."
    );
    valid = false;
  }
  if (!severities.includes(value.severity as FindingSeverity)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_FINDING",
      `${path}.severity`,
      "Expected error, warning, or pass."
    );
    valid = false;
  }
  if (!boundedString(value.path, 1_024)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_FINDING",
      `${path}.path`,
      "Expected a non-empty finding path no longer than 1,024 characters."
    );
    valid = false;
  }
  if (!boundedString(value.message, 4_000)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_FINDING",
      `${path}.message`,
      "Expected a non-empty finding message no longer than 4,000 characters."
    );
    valid = false;
  }
  return valid;
}

function validateFindingArray(
  value: unknown,
  path: string,
  findings: BlueprintFinding[]
): value is BlueprintFinding[] {
  if (!Array.isArray(value)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_FINDINGS",
      path,
      "Expected an array of conformance findings."
    );
    return false;
  }
  let valid = true;
  value.forEach((finding, index) => {
    if (!validateFinding(finding, `${path}[${index}]`, findings)) valid = false;
  });
  return valid;
}

function validateSuiteMetadata(
  value: unknown,
  path: string,
  findings: BlueprintFinding[]
): value is BlueprintSuiteReport["suite"] {
  if (!isRecord(value)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_METADATA",
      path,
      "Expected suite id, title, and description metadata."
    );
    return false;
  }
  checkAllowedFields(value, ["id", "title", "description"], path, findings);
  let valid = true;
  if (!boundedString(value.id, 128) || !identifierPattern.test(value.id)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_METADATA",
      `${path}.id`,
      "Expected a lowercase suite identifier beginning with a letter."
    );
    valid = false;
  }
  if (!boundedString(value.title, 240)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_METADATA",
      `${path}.title`,
      "Expected a non-empty suite title no longer than 240 characters."
    );
    valid = false;
  }
  if (!boundedString(value.description, 2_000)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_METADATA",
      `${path}.description`,
      "Expected a non-empty suite description no longer than 2,000 characters."
    );
    valid = false;
  }
  return valid;
}

function validateManifestSource(
  value: unknown,
  path: string,
  findings: BlueprintFinding[]
): boolean {
  if (value === null) return true;
  if (!isRecord(value)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_SOURCE",
      path,
      "Expected null or a source-manifest binding."
    );
    return false;
  }
  checkAllowedFields(
    value,
    ["uri", "sha256", "status", "validationStatus", "counts", "findings"],
    path,
    findings
  );
  let valid = true;
  if (!boundedString(value.uri, 1_024)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_SOURCE",
      `${path}.uri`,
      "Expected a non-empty manifest URI no longer than 1,024 characters."
    );
    valid = false;
  }
  if (typeof value.sha256 !== "string" || !sha256Pattern.test(value.sha256)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_DIGEST",
      `${path}.sha256`,
      "Expected a lowercase SHA-256 digest."
    );
    valid = false;
  }
  if (!validateStatus(value.status, `${path}.status`, findings)) valid = false;
  if (
    !validateStatus(
      value.validationStatus,
      `${path}.validationStatus`,
      findings
    )
  ) {
    valid = false;
  }
  if (!validateCounts(value.counts, `${path}.counts`, findings)) valid = false;
  if (!validateFindingArray(value.findings, `${path}.findings`, findings)) {
    valid = false;
  }
  return valid;
}

function validateScenario(
  value: unknown,
  path: string,
  findings: BlueprintFinding[]
): boolean {
  if (value === null) return true;
  if (!isRecord(value)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_SCENARIO",
      path,
      "Expected null or scenario id, title, and risk metadata."
    );
    return false;
  }
  checkAllowedFields(value, ["id", "title", "risk"], path, findings);
  let valid = true;
  if (!boundedString(value.id, 128)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_SCENARIO",
      `${path}.id`,
      "Expected a non-empty scenario id no longer than 128 characters."
    );
    valid = false;
  }
  if (!boundedString(value.title, 240)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_SCENARIO",
      `${path}.title`,
      "Expected a non-empty scenario title no longer than 240 characters."
    );
    valid = false;
  }
  if (!(["low", "medium", "high"] as unknown[]).includes(value.risk)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_SCENARIO",
      `${path}.risk`,
      "Expected low, medium, or high risk."
    );
    valid = false;
  }
  return valid;
}

function validateMetrics(
  value: unknown,
  path: string,
  findings: BlueprintFinding[]
): boolean {
  if (value === null) return true;
  if (!isRecord(value)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_METRICS",
      path,
      "Expected null or bounded blueprint metrics."
    );
    return false;
  }
  const keys = ["roles", "stages", "humanGates", "evidenceArtifacts"];
  checkAllowedFields(value, keys, path, findings);
  let valid = true;
  const maximums: Record<string, number> = {
    roles: 64,
    stages: 128,
    humanGates: 128,
    evidenceArtifacts: 128,
  };
  for (const key of keys) {
    if (!boundedInteger(value[key], 0, maximums[key])) {
      addValidationFinding(
        findings,
        "INVALID_SUITE_REPORT_METRICS",
        `${path}.${key}`,
        "Expected a bounded non-negative integer metric."
      );
      valid = false;
    }
  }
  return valid;
}

function validateCase(
  value: unknown,
  path: string,
  findings: BlueprintFinding[]
): value is BlueprintSuiteReport["cases"][number] {
  if (!isRecord(value)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_CASE",
      path,
      "Expected a suite case result."
    );
    return false;
  }
  checkAllowedFields(
    value,
    [
      "id",
      "artifact",
      "tags",
      "status",
      "validationStatus",
      "scenario",
      "counts",
      "metrics",
      "findings",
    ],
    path,
    findings
  );
  let valid = true;
  if (!boundedString(value.id, 128) || !identifierPattern.test(value.id)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_CASE",
      `${path}.id`,
      "Expected a lowercase case identifier beginning with a letter."
    );
    valid = false;
  }
  if (!isRecord(value.artifact)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_ARTIFACT",
      `${path}.artifact`,
      "Expected an artifact URI, digest, and byte count."
    );
    valid = false;
  } else {
    checkAllowedFields(
      value.artifact,
      ["uri", "sha256", "bytes"],
      `${path}.artifact`,
      findings
    );
    if (!boundedString(value.artifact.uri, 1_024)) {
      addValidationFinding(
        findings,
        "INVALID_SUITE_REPORT_ARTIFACT",
        `${path}.artifact.uri`,
        "Expected a non-empty artifact URI no longer than 1,024 characters."
      );
      valid = false;
    }
    if (
      value.artifact.sha256 !== null &&
      (typeof value.artifact.sha256 !== "string" ||
        !sha256Pattern.test(value.artifact.sha256))
    ) {
      addValidationFinding(
        findings,
        "INVALID_SUITE_REPORT_DIGEST",
        `${path}.artifact.sha256`,
        "Expected null or a lowercase SHA-256 digest."
      );
      valid = false;
    }
    if (
      value.artifact.bytes !== null &&
      !boundedInteger(value.artifact.bytes, 0, 1_048_576)
    ) {
      addValidationFinding(
        findings,
        "INVALID_SUITE_REPORT_ARTIFACT",
        `${path}.artifact.bytes`,
        "Expected null or a byte count no greater than 1 MiB."
      );
      valid = false;
    }
    if ((value.artifact.sha256 === null) !== (value.artifact.bytes === null)) {
      addValidationFinding(
        findings,
        "INCONSISTENT_SUITE_REPORT_ARTIFACT",
        `${path}.artifact`,
        "Artifact digest and byte count must either both be present or both be null."
      );
      valid = false;
    }
  }
  if (!Array.isArray(value.tags) || value.tags.length > 16) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_TAGS",
      `${path}.tags`,
      "Expected no more than 16 unique lowercase identifier tags."
    );
    valid = false;
  } else {
    const tags = new Set<string>();
    value.tags.forEach((tag, index) => {
      if (
        !boundedString(tag, 64) ||
        !identifierPattern.test(tag) ||
        tags.has(tag)
      ) {
        addValidationFinding(
          findings,
          "INVALID_SUITE_REPORT_TAG",
          `${path}.tags[${index}]`,
          "Expected a unique lowercase identifier tag no longer than 64 characters."
        );
        valid = false;
      }
      if (typeof tag === "string") tags.add(tag);
    });
  }
  if (!validateStatus(value.status, `${path}.status`, findings)) valid = false;
  if (
    !validateStatus(
      value.validationStatus,
      `${path}.validationStatus`,
      findings
    )
  ) {
    valid = false;
  }
  if (!validateScenario(value.scenario, `${path}.scenario`, findings)) {
    valid = false;
  }
  if (!validateCounts(value.counts, `${path}.counts`, findings)) valid = false;
  if (!validateMetrics(value.metrics, `${path}.metrics`, findings))
    valid = false;
  if (!validateFindingArray(value.findings, `${path}.findings`, findings)) {
    valid = false;
  }
  return valid;
}

function findingCounts(findings: BlueprintFinding[]) {
  return {
    error: findings.filter(finding => finding.severity === "error").length,
    warning: findings.filter(finding => finding.severity === "warning").length,
    pass: findings.filter(finding => finding.severity === "pass").length,
  };
}

function sameCounts(
  left: Record<FindingSeverity, number>,
  right: Record<FindingSeverity, number>
) {
  return severities.every(severity => left[severity] === right[severity]);
}

function aggregateStatus(
  values: BlueprintAnalysis["status"][]
): BlueprintAnalysis["status"] {
  if (values.includes("invalid")) return "invalid";
  if (values.includes("review")) return "review";
  return "ready";
}

function statusFromCounts(
  counts: Record<FindingSeverity, number>
): BlueprintAnalysis["status"] {
  if (counts.error > 0) return "invalid";
  if (counts.warning > 0) return "review";
  return "ready";
}

function addConsistencyFinding(
  findings: BlueprintFinding[],
  code: string,
  path: string,
  message: string
) {
  addValidationFinding(findings, code, path, message);
}

function validateReportConsistency(
  report: BlueprintSuiteReport,
  findings: BlueprintFinding[]
) {
  const ids = new Set<string>();
  for (const [index, entry] of report.cases.entries()) {
    if (ids.has(entry.id)) {
      addConsistencyFinding(
        findings,
        "DUPLICATE_SUITE_REPORT_CASE",
        `$.cases[${index}].id`,
        `Case identifier ${entry.id} is reported more than once.`
      );
    }
    ids.add(entry.id);
    const actualCounts = findingCounts(entry.findings);
    if (!sameCounts(entry.counts, actualCounts)) {
      addConsistencyFinding(
        findings,
        "INCONSISTENT_SUITE_REPORT_COUNTS",
        `$.cases[${index}].counts`,
        "Case counts do not match the attached findings."
      );
    }
    const expectedValidationStatus = statusFromCounts(entry.counts);
    if (entry.validationStatus !== expectedValidationStatus) {
      addConsistencyFinding(
        findings,
        "INCONSISTENT_SUITE_REPORT_STATUS",
        `$.cases[${index}].validationStatus`,
        "Case validation status does not match its error and warning finding counts."
      );
    }
    const expectedStatus =
      report.policy.strict && expectedValidationStatus === "review"
        ? "invalid"
        : expectedValidationStatus;
    if (entry.status !== expectedStatus) {
      addConsistencyFinding(
        findings,
        "INCONSISTENT_SUITE_REPORT_STATUS",
        `$.cases[${index}].status`,
        "Effective case status does not match validation status and the reported strict policy."
      );
    }
  }

  const statusesInReport = report.cases.map(entry => entry.status);
  if (report.source.manifest) {
    statusesInReport.push(report.source.manifest.status);
    const actualManifestCounts = findingCounts(report.source.manifest.findings);
    if (!sameCounts(report.source.manifest.counts, actualManifestCounts)) {
      addConsistencyFinding(
        findings,
        "INCONSISTENT_SUITE_REPORT_COUNTS",
        "$.source.manifest.counts",
        "Manifest counts do not match the attached findings."
      );
    }
    const expectedManifestValidationStatus = statusFromCounts(
      report.source.manifest.counts
    );
    if (
      report.source.manifest.validationStatus !==
      expectedManifestValidationStatus
    ) {
      addConsistencyFinding(
        findings,
        "INCONSISTENT_SUITE_REPORT_STATUS",
        "$.source.manifest.validationStatus",
        "Manifest validation status does not match its error and warning finding counts."
      );
    }
    const expectedManifestStatus =
      report.policy.strict && expectedManifestValidationStatus === "review"
        ? "invalid"
        : expectedManifestValidationStatus;
    if (report.source.manifest.status !== expectedManifestStatus) {
      addConsistencyFinding(
        findings,
        "INCONSISTENT_SUITE_REPORT_STATUS",
        "$.source.manifest.status",
        "Effective manifest status does not match validation status and the reported strict policy."
      );
    }
  }

  const actualCaseCounts = {
    total: report.cases.length,
    ready: report.cases.filter(entry => entry.status === "ready").length,
    review: report.cases.filter(entry => entry.status === "review").length,
    invalid: report.cases.filter(entry => entry.status === "invalid").length,
  };
  if (
    Object.entries(actualCaseCounts).some(
      ([key, value]) =>
        report.summary.cases[key as keyof typeof actualCaseCounts] !== value
    )
  ) {
    addConsistencyFinding(
      findings,
      "INCONSISTENT_SUITE_REPORT_SUMMARY",
      "$.summary.cases",
      "Summary case counts do not match the attached case results."
    );
  }
  if (report.summary.status !== aggregateStatus(statusesInReport)) {
    addConsistencyFinding(
      findings,
      "INCONSISTENT_SUITE_REPORT_SUMMARY",
      "$.summary.status",
      "Summary status does not match the effective manifest and case statuses."
    );
  }

  const actualFindingCounts = report.cases.reduce(
    (totals, entry) => ({
      error: totals.error + entry.counts.error,
      warning: totals.warning + entry.counts.warning,
      pass: totals.pass + entry.counts.pass,
    }),
    { error: 0, warning: 0, pass: 0 }
  );
  if (report.source.manifest) {
    actualFindingCounts.error += report.source.manifest.counts.error;
    actualFindingCounts.warning += report.source.manifest.counts.warning;
    actualFindingCounts.pass += report.source.manifest.counts.pass;
  }
  if (!sameCounts(report.summary.findings, actualFindingCounts)) {
    addConsistencyFinding(
      findings,
      "INCONSISTENT_SUITE_REPORT_SUMMARY",
      "$.summary.findings",
      "Summary finding counts do not match the manifest and case findings."
    );
  }
}

function summarizeValidation(
  findings: BlueprintFinding[]
): BlueprintSuiteReportAnalysis {
  const counts = findingCounts(findings);
  return {
    status: counts.error > 0 ? "invalid" : "ready",
    counts,
    findings,
  };
}

export function validateBlueprintSuiteReport(
  value: unknown
): BlueprintSuiteReportAnalysis {
  const findings: BlueprintFinding[] = [];
  if (!isRecord(value)) {
    addValidationFinding(
      findings,
      "EXPECTED_SUITE_REPORT_OBJECT",
      "$",
      "Expected a suite report object."
    );
    return summarizeValidation(findings);
  }
  checkAllowedFields(
    value,
    [
      "schemaVersion",
      "mode",
      "suite",
      "policy",
      "source",
      "summary",
      "cases",
      "proofBoundary",
    ],
    "$",
    findings
  );
  if (value.schemaVersion !== blueprintSuiteReportSchemaVersion) {
    addValidationFinding(
      findings,
      "UNSUPPORTED_SUITE_REPORT_SCHEMA",
      "$.schemaVersion",
      `Expected ${blueprintSuiteReportSchemaVersion}.`
    );
  }
  if (value.mode !== "contract-conformance-report") {
    addValidationFinding(
      findings,
      "UNSUPPORTED_SUITE_REPORT_MODE",
      "$.mode",
      "Expected contract-conformance-report."
    );
  }
  validateSuiteMetadata(value.suite, "$.suite", findings);

  if (!isRecord(value.policy)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_POLICY",
      "$.policy",
      "Expected a strict-policy object."
    );
  } else {
    checkAllowedFields(value.policy, ["strict"], "$.policy", findings);
    if (typeof value.policy.strict !== "boolean") {
      addValidationFinding(
        findings,
        "INVALID_SUITE_REPORT_POLICY",
        "$.policy.strict",
        "Expected a boolean strict policy."
      );
    }
  }

  if (!isRecord(value.source)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_SOURCE",
      "$.source",
      "Expected a source object with a manifest binding."
    );
  } else {
    checkAllowedFields(value.source, ["manifest"], "$.source", findings);
    validateManifestSource(
      value.source.manifest,
      "$.source.manifest",
      findings
    );
  }

  if (!isRecord(value.summary)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_SUMMARY",
      "$.summary",
      "Expected a suite summary object."
    );
  } else {
    checkAllowedFields(
      value.summary,
      ["status", "cases", "findings"],
      "$.summary",
      findings
    );
    validateStatus(value.summary.status, "$.summary.status", findings);
    if (!isRecord(value.summary.cases)) {
      addValidationFinding(
        findings,
        "INVALID_SUITE_REPORT_SUMMARY",
        "$.summary.cases",
        "Expected total, ready, review, and invalid case counts."
      );
    } else {
      const keys = ["total", "ready", "review", "invalid"];
      checkAllowedFields(
        value.summary.cases,
        keys,
        "$.summary.cases",
        findings
      );
      for (const key of keys) {
        const minimum = key === "total" ? 1 : 0;
        if (
          !boundedInteger(
            value.summary.cases[key],
            minimum,
            maximumSuiteEntries
          )
        ) {
          addValidationFinding(
            findings,
            "INVALID_SUITE_REPORT_SUMMARY",
            `$.summary.cases.${key}`,
            `Expected an integer between ${minimum} and ${maximumSuiteEntries}.`
          );
        }
      }
    }
    validateCounts(value.summary.findings, "$.summary.findings", findings);
  }

  if (
    !Array.isArray(value.cases) ||
    value.cases.length === 0 ||
    value.cases.length > maximumSuiteEntries
  ) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_CASES",
      "$.cases",
      `Expected between 1 and ${maximumSuiteEntries} suite case results.`
    );
  } else {
    value.cases.forEach((entry, index) =>
      validateCase(entry, `$.cases[${index}]`, findings)
    );
  }
  if (!boundedString(value.proofBoundary, 1_000)) {
    addValidationFinding(
      findings,
      "INVALID_SUITE_REPORT_PROOF_BOUNDARY",
      "$.proofBoundary",
      "Expected a non-empty proof-boundary statement no longer than 1,000 characters."
    );
  }

  if (!findings.some(finding => finding.severity === "error")) {
    validateReportConsistency(
      value as unknown as BlueprintSuiteReport,
      findings
    );
  }
  if (!findings.some(finding => finding.severity === "error")) {
    findings.push({
      severity: "pass",
      code: "SUITE_REPORT_CONFORMANT",
      path: "$",
      message:
        "The suite report is structurally bounded and internally consistent.",
    });
  }
  const analysis = summarizeValidation(findings);
  if (analysis.status === "ready") {
    analysis.report = value as unknown as BlueprintSuiteReport;
  }
  return analysis;
}

function lexicalCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortedStrings(values: string[]): string[] {
  return [...values].sort(lexicalCompare);
}

function findingFingerprints(findings: BlueprintFinding[]): string[] {
  return findings
    .map(finding =>
      JSON.stringify([
        finding.severity,
        finding.code,
        finding.path,
        finding.message,
      ])
    )
    .sort(lexicalCompare);
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!isRecord(value)) return value;
  const canonical: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort(lexicalCompare)) {
    canonical[key] = canonicalValue(value[key]);
  }
  return canonical;
}

function sameValue(left: unknown, right: unknown): boolean {
  return (
    JSON.stringify(canonicalValue(left)) ===
    JSON.stringify(canonicalValue(right))
  );
}

function snapshot(
  entry: BlueprintSuiteReport["cases"][number]
): SuiteDiffCaseSnapshot {
  return {
    artifact: {
      uri: entry.artifact.uri,
      sha256: entry.artifact.sha256,
      bytes: entry.artifact.bytes,
    },
    tags: sortedStrings(entry.tags),
    status: entry.status,
    validationStatus: entry.validationStatus,
    scenario: entry.scenario
      ? {
          id: entry.scenario.id,
          title: entry.scenario.title,
          risk: entry.scenario.risk,
        }
      : null,
    counts: {
      error: entry.counts.error,
      warning: entry.counts.warning,
      pass: entry.counts.pass,
    },
    metrics: entry.metrics
      ? {
          roles: entry.metrics.roles,
          stages: entry.metrics.stages,
          humanGates: entry.metrics.humanGates,
          evidenceArtifacts: entry.metrics.evidenceArtifacts,
        }
      : null,
    findingCodes: sortedStrings([
      ...new Set(entry.findings.map(finding => finding.code)),
    ]),
  };
}

function changedDimensions(
  baseline: BlueprintSuiteReport["cases"][number],
  candidate: BlueprintSuiteReport["cases"][number]
): SuiteDiffDimension[] {
  const differences: SuiteDiffDimension[] = [];
  if (baseline.artifact.uri !== candidate.artifact.uri) {
    differences.push("artifact-uri");
  }
  if (
    baseline.artifact.sha256 !== candidate.artifact.sha256 ||
    baseline.artifact.bytes !== candidate.artifact.bytes
  ) {
    differences.push("artifact-content");
  }
  if (!sameValue(sortedStrings(baseline.tags), sortedStrings(candidate.tags))) {
    differences.push("tags");
  }
  if (baseline.status !== candidate.status) differences.push("status");
  if (baseline.validationStatus !== candidate.validationStatus) {
    differences.push("validation-status");
  }
  if (!sameValue(baseline.scenario, candidate.scenario)) {
    differences.push("scenario");
  }
  if (!sameCounts(baseline.counts, candidate.counts)) {
    differences.push("finding-counts");
  }
  if (
    !sameValue(
      findingFingerprints(baseline.findings),
      findingFingerprints(candidate.findings)
    )
  ) {
    differences.push("findings");
  }
  if (!sameValue(baseline.metrics, candidate.metrics)) {
    differences.push("metrics");
  }
  return differences;
}

function statusRank(status: BlueprintAnalysis["status"]): number {
  return status === "ready" ? 2 : status === "review" ? 1 : 0;
}

function statusImpact(
  baseline: BlueprintAnalysis["status"],
  candidate: BlueprintAnalysis["status"]
): "regression" | "improvement" | "none" {
  const delta = statusRank(candidate) - statusRank(baseline);
  return delta < 0 ? "regression" : delta > 0 ? "improvement" : "none";
}

function modifiedImpact(
  baseline: BlueprintSuiteReport["cases"][number],
  candidate: BlueprintSuiteReport["cases"][number]
): SuiteDiffImpact {
  let regressed = statusRank(candidate.status) < statusRank(baseline.status);
  let improved = statusRank(candidate.status) > statusRank(baseline.status);
  if (
    candidate.counts.error > baseline.counts.error ||
    candidate.counts.warning > baseline.counts.warning
  ) {
    regressed = true;
  }
  if (
    candidate.counts.error < baseline.counts.error ||
    candidate.counts.warning < baseline.counts.warning
  ) {
    improved = true;
  }
  if (regressed && improved) return "mixed";
  if (regressed) return "regression";
  if (improved) return "improvement";
  return "review";
}

function sourceSummary(source: BlueprintSuiteDiffSource, sha256: string) {
  return {
    uri: source.uri.replaceAll("\\", "/"),
    sha256,
    suite: {
      id: source.report.suite.id,
      title: source.report.suite.title,
      description: source.report.suite.description,
    },
    strict: source.report.policy.strict,
    status: source.report.summary.status,
    manifestSha256: source.report.source.manifest?.sha256 ?? null,
  };
}

export async function createBlueprintSuiteDiff(
  baseline: BlueprintSuiteDiffSource,
  candidate: BlueprintSuiteDiffSource,
  failOnChange = false
): Promise<BlueprintSuiteDiff> {
  if (baseline.report.suite.id !== candidate.report.suite.id) {
    throw new Error(
      `Suite identifiers differ: ${baseline.report.suite.id} and ${candidate.report.suite.id}.`
    );
  }
  const baselineCases = new Map(
    baseline.report.cases.map(entry => [entry.id, entry])
  );
  const candidateCases = new Map(
    candidate.report.cases.map(entry => [entry.id, entry])
  );
  if (
    baselineCases.size !== baseline.report.cases.length ||
    candidateCases.size !== candidate.report.cases.length
  ) {
    throw new Error("Suite reports must contain unique case identifiers.");
  }
  const ids = sortedStrings([
    ...new Set([...baselineCases.keys(), ...candidateCases.keys()]),
  ]);
  const cases: BlueprintSuiteDiff["cases"] = ids.map(id => {
    const baselineEntry = baselineCases.get(id);
    const candidateEntry = candidateCases.get(id);
    if (!baselineEntry && candidateEntry) {
      return {
        id,
        change: "added",
        impact: candidateEntry.status === "invalid" ? "regression" : "review",
        differences: [],
        baseline: null,
        candidate: snapshot(candidateEntry),
      };
    }
    if (baselineEntry && !candidateEntry) {
      return {
        id,
        change: "removed",
        impact: "regression",
        differences: [],
        baseline: snapshot(baselineEntry),
        candidate: null,
      };
    }
    const baselineCase = baselineEntry!;
    const candidateCase = candidateEntry!;
    const differences = changedDimensions(baselineCase, candidateCase);
    return {
      id,
      change: differences.length > 0 ? "modified" : "unchanged",
      impact:
        differences.length > 0
          ? modifiedImpact(baselineCase, candidateCase)
          : "none",
      differences,
      baseline: snapshot(baselineCase),
      candidate: snapshot(candidateCase),
    };
  });

  const reportImpact = statusImpact(
    baseline.report.summary.status,
    candidate.report.summary.status
  );
  const suiteMetadataChanged = !sameValue(
    baseline.report.suite,
    candidate.report.suite
  );
  const policyChanged =
    baseline.report.policy.strict !== candidate.report.policy.strict;
  const manifestChanged =
    baseline.report.source.manifest?.sha256 !==
    candidate.report.source.manifest?.sha256;
  const impact = cases.reduce<Record<SuiteDiffImpact, number>>(
    (counts, entry) => {
      counts[entry.impact] += 1;
      return counts;
    },
    { regression: 0, improvement: 0, review: 0, mixed: 0, none: 0 }
  );
  const caseCounts = {
    baseline: baseline.report.cases.length,
    candidate: candidate.report.cases.length,
    total: cases.length,
    added: cases.filter(entry => entry.change === "added").length,
    removed: cases.filter(entry => entry.change === "removed").length,
    modified: cases.filter(entry => entry.change === "modified").length,
    unchanged: cases.filter(entry => entry.change === "unchanged").length,
  };
  const hasRegression =
    reportImpact === "regression" || impact.regression > 0 || impact.mixed > 0;
  const hasReview =
    impact.review > 0 ||
    suiteMetadataChanged ||
    policyChanged ||
    manifestChanged;
  const hasImprovement =
    reportImpact === "improvement" ||
    impact.improvement > 0 ||
    impact.mixed > 0;
  const changeDetected =
    caseCounts.added > 0 ||
    caseCounts.removed > 0 ||
    caseCounts.modified > 0 ||
    suiteMetadataChanged ||
    policyChanged ||
    manifestChanged ||
    reportImpact !== "none";
  const outcome = hasRegression
    ? "regression"
    : hasReview
      ? "review"
      : hasImprovement
        ? "improvement"
        : "unchanged";
  const [baselineSha256, candidateSha256] = await Promise.all([
    sha256Hex(baseline.bytes),
    sha256Hex(candidate.bytes),
  ]);

  return {
    schemaVersion: blueprintSuiteDiffSchemaVersion,
    mode: "contract-conformance-diff",
    policy: { failOn: failOnChange ? "change" : "regression" },
    source: {
      baseline: sourceSummary(baseline, baselineSha256),
      candidate: sourceSummary(candidate, candidateSha256),
    },
    summary: {
      outcome,
      gate: hasRegression || (failOnChange && changeDetected) ? "fail" : "pass",
      reportImpact,
      suiteMetadataChanged,
      policyChanged,
      manifestChanged,
      cases: caseCounts,
      impact,
    },
    cases,
    proofBoundary:
      "Field Atlas compared two local conformance reports and their exact imported bytes; it did not execute agents, evaluate runtime quality, verify source artifacts beyond report consistency, authenticate owners, or approve a release.",
  };
}
