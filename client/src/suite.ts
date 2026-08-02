import {
  effectiveValidationStatus,
  validateBlueprint,
  type BlueprintAnalysis,
  type BlueprintFinding,
  type FindingSeverity,
} from "./blueprint";
import { sha256Hex } from "./evidence";

export const blueprintSuiteSchemaVersion =
  "samsarix-field-atlas/suite/1" as const;
export const blueprintSuiteReportSchemaVersion =
  "samsarix-field-atlas/suite-report/1" as const;
export const maximumSuiteEntries = 64;

export interface BlueprintSuiteManifest {
  schemaVersion: typeof blueprintSuiteSchemaVersion;
  mode: "contract-conformance-suite";
  suite: {
    id: string;
    title: string;
    description: string;
  };
  strict: boolean;
  entries: Array<{
    id: string;
    path: string;
    tags: string[];
  }>;
}

export interface BlueprintSuiteManifestAnalysis {
  status: BlueprintAnalysis["status"];
  counts: Record<FindingSeverity, number>;
  findings: BlueprintFinding[];
  manifest?: BlueprintSuiteManifest;
}

export interface BlueprintSuiteSource {
  entryId: string;
  artifactUri: string;
  tags: string[];
  bytes?: Uint8Array;
  value?: unknown;
  importError?: string;
}

export interface BlueprintSuiteReport {
  schemaVersion: typeof blueprintSuiteReportSchemaVersion;
  mode: "contract-conformance-report";
  suite: BlueprintSuiteManifest["suite"];
  policy: {
    strict: boolean;
  };
  source: {
    manifest: {
      uri: string;
      sha256: string;
      status: BlueprintAnalysis["status"];
      validationStatus: BlueprintAnalysis["status"];
      counts: Record<FindingSeverity, number>;
      findings: BlueprintFinding[];
    } | null;
  };
  summary: {
    status: BlueprintAnalysis["status"];
    cases: {
      total: number;
      ready: number;
      review: number;
      invalid: number;
    };
    findings: Record<FindingSeverity, number>;
  };
  cases: Array<{
    id: string;
    artifact: {
      uri: string;
      sha256: string | null;
      bytes: number | null;
    };
    tags: string[];
    status: BlueprintAnalysis["status"];
    validationStatus: BlueprintAnalysis["status"];
    scenario: {
      id: string;
      title: string;
      risk: string;
    } | null;
    counts: Record<FindingSeverity, number>;
    metrics: BlueprintAnalysis["metrics"] | null;
    findings: BlueprintFinding[];
  }>;
  proofBoundary: string;
}

const identifierPattern = /^[a-z][a-z0-9-]*$/;
const portablePathPattern = /^[a-zA-Z0-9._-]+(?:\/[a-zA-Z0-9._-]+)*\.json$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
        "UNRECOGNIZED_SUITE_FIELD",
        `${path}.${key}`,
        "This additive field is not interpreted by Field Atlas suite v1."
      );
    }
  }
}

function boundedString(value: unknown, maximum: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maximum
  );
}

function summarize(
  findings: BlueprintFinding[]
): BlueprintSuiteManifestAnalysis {
  const counts = {
    error: findings.filter(finding => finding.severity === "error").length,
    warning: findings.filter(finding => finding.severity === "warning").length,
    pass: findings.filter(finding => finding.severity === "pass").length,
  };
  return {
    status:
      counts.error > 0 ? "invalid" : counts.warning > 0 ? "review" : "ready",
    counts,
    findings,
  };
}

function validPortablePath(value: string): boolean {
  return (
    portablePathPattern.test(value) &&
    !value.split("/").some(segment => segment === "." || segment === "..") &&
    !value.includes(":") &&
    !value.includes("\\")
  );
}

export function validateBlueprintSuiteManifest(
  value: unknown
): BlueprintSuiteManifestAnalysis {
  const findings: BlueprintFinding[] = [];
  if (!isRecord(value)) {
    addFinding(
      findings,
      "error",
      "EXPECTED_SUITE_OBJECT",
      "$",
      "Expected a suite manifest object."
    );
    return summarize(findings);
  }

  checkAllowedFields(
    value,
    ["schemaVersion", "mode", "suite", "strict", "entries"],
    "$",
    findings
  );
  if (value.schemaVersion !== blueprintSuiteSchemaVersion) {
    addFinding(
      findings,
      "error",
      "UNSUPPORTED_SUITE_SCHEMA",
      "$.schemaVersion",
      `Expected ${blueprintSuiteSchemaVersion}.`
    );
  }
  if (value.mode !== "contract-conformance-suite") {
    addFinding(
      findings,
      "error",
      "UNSUPPORTED_SUITE_MODE",
      "$.mode",
      "Expected contract-conformance-suite."
    );
  }
  if (typeof value.strict !== "boolean") {
    addFinding(
      findings,
      "error",
      "INVALID_SUITE_POLICY",
      "$.strict",
      "Expected a boolean strict-mode policy."
    );
  }

  if (!isRecord(value.suite)) {
    addFinding(
      findings,
      "error",
      "INVALID_SUITE_METADATA",
      "$.suite",
      "Expected suite id, title, and description metadata."
    );
  } else {
    checkAllowedFields(
      value.suite,
      ["id", "title", "description"],
      "$.suite",
      findings
    );
    if (
      !boundedString(value.suite.id, 128) ||
      !identifierPattern.test(value.suite.id)
    ) {
      addFinding(
        findings,
        "error",
        "INVALID_SUITE_IDENTIFIER",
        "$.suite.id",
        "Expected a lowercase identifier beginning with a letter and containing only letters, numbers, or hyphens."
      );
    }
    if (!boundedString(value.suite.title, 240)) {
      addFinding(
        findings,
        "error",
        "INVALID_SUITE_TITLE",
        "$.suite.title",
        "Expected a non-empty title no longer than 240 characters."
      );
    }
    if (!boundedString(value.suite.description, 2_000)) {
      addFinding(
        findings,
        "error",
        "INVALID_SUITE_DESCRIPTION",
        "$.suite.description",
        "Expected a non-empty description no longer than 2,000 characters."
      );
    }
  }

  const entryIds = new Set<string>();
  const entryPaths = new Set<string>();
  if (
    !Array.isArray(value.entries) ||
    value.entries.length === 0 ||
    value.entries.length > maximumSuiteEntries
  ) {
    addFinding(
      findings,
      "error",
      "INVALID_SUITE_ENTRIES",
      "$.entries",
      `Expected between 1 and ${maximumSuiteEntries} suite entries.`
    );
  } else {
    value.entries.forEach((entry, index) => {
      const path = `$.entries[${index}]`;
      if (!isRecord(entry)) {
        addFinding(
          findings,
          "error",
          "INVALID_SUITE_ENTRY",
          path,
          "Expected an entry object."
        );
        return;
      }
      checkAllowedFields(entry, ["id", "path", "tags"], path, findings);

      if (!boundedString(entry.id, 128) || !identifierPattern.test(entry.id)) {
        addFinding(
          findings,
          "error",
          "INVALID_ENTRY_IDENTIFIER",
          `${path}.id`,
          "Expected a lowercase identifier beginning with a letter and containing only letters, numbers, or hyphens."
        );
      } else if (entryIds.has(entry.id)) {
        addFinding(
          findings,
          "error",
          "DUPLICATE_SUITE_ENTRY",
          `${path}.id`,
          `Entry identifier ${entry.id} is declared more than once.`
        );
      } else {
        entryIds.add(entry.id);
      }

      if (!boundedString(entry.path, 512) || !validPortablePath(entry.path)) {
        addFinding(
          findings,
          "error",
          "INVALID_ENTRY_PATH",
          `${path}.path`,
          "Expected a forward-slash relative JSON path without traversal, URL, drive, query, or fragment syntax."
        );
      } else if (entryPaths.has(entry.path)) {
        addFinding(
          findings,
          "error",
          "DUPLICATE_ENTRY_PATH",
          `${path}.path`,
          `Blueprint path ${entry.path} is declared more than once.`
        );
      } else {
        entryPaths.add(entry.path);
      }

      if (!Array.isArray(entry.tags) || entry.tags.length > 16) {
        addFinding(
          findings,
          "error",
          "INVALID_ENTRY_TAGS",
          `${path}.tags`,
          "Expected no more than 16 lowercase identifier tags."
        );
      } else {
        const tags = new Set<string>();
        entry.tags.forEach((tag, tagIndex) => {
          if (
            !boundedString(tag, 64) ||
            !identifierPattern.test(tag) ||
            tags.has(tag)
          ) {
            addFinding(
              findings,
              "error",
              "INVALID_ENTRY_TAG",
              `${path}.tags[${tagIndex}]`,
              "Expected a unique lowercase identifier tag no longer than 64 characters."
            );
          }
          if (typeof tag === "string") tags.add(tag);
        });
      }
    });
  }

  if (!findings.some(finding => finding.severity === "error")) {
    const entryCount = Array.isArray(value.entries) ? value.entries.length : 0;
    addFinding(
      findings,
      "pass",
      "SUITE_MANIFEST_CONFORMANT",
      "$",
      `${entryCount} bounded blueprint ${entryCount === 1 ? "entry is" : "entries are"} declared.`
    );
    addFinding(
      findings,
      "pass",
      "SUITE_PATHS_PORTABLE",
      "$.entries",
      "All blueprint paths are portable, relative JSON paths without traversal syntax."
    );
  }

  const analysis = summarize(findings);
  if (analysis.status !== "invalid") {
    analysis.manifest = value as unknown as BlueprintSuiteManifest;
  }
  return analysis;
}

function importFailure(message: string): BlueprintAnalysis {
  return {
    status: "invalid",
    counts: { error: 1, warning: 0, pass: 0 },
    findings: [
      {
        severity: "error",
        code: "IMPORT_FAILED",
        path: "$",
        message,
      },
    ],
  };
}

function aggregateStatus(
  statuses: BlueprintAnalysis["status"][]
): BlueprintAnalysis["status"] {
  if (statuses.includes("invalid")) return "invalid";
  if (statuses.includes("review")) return "review";
  return "ready";
}

export async function createBlueprintSuiteReport(
  suite: BlueprintSuiteManifest["suite"],
  strict: boolean,
  sources: BlueprintSuiteSource[],
  manifestSource?: {
    uri: string;
    bytes: Uint8Array;
    analysis: BlueprintSuiteManifestAnalysis;
  }
): Promise<BlueprintSuiteReport> {
  const cases = await Promise.all(
    sources.map(async source => {
      const analysis = source.importError
        ? importFailure(source.importError)
        : validateBlueprint(source.value);
      const strictFailure = strict && analysis.counts.warning > 0;
      const status = effectiveValidationStatus(analysis.status, strictFailure);
      return {
        id: source.entryId,
        artifact: {
          uri: source.artifactUri.replaceAll("\\", "/"),
          sha256: source.bytes ? await sha256Hex(source.bytes) : null,
          bytes: source.bytes?.byteLength ?? null,
        },
        tags: source.tags,
        status,
        validationStatus: analysis.status,
        scenario: analysis.blueprint
          ? {
              id: analysis.blueprint.scenario.id,
              title: analysis.blueprint.scenario.title,
              risk: analysis.blueprint.scenario.risk,
            }
          : null,
        counts: analysis.counts,
        metrics: analysis.metrics ?? null,
        findings: analysis.findings,
      };
    })
  );
  const manifestStatus = manifestSource
    ? effectiveValidationStatus(
        manifestSource.analysis.status,
        strict && manifestSource.analysis.counts.warning > 0
      )
    : null;
  const caseStatuses = cases.map(entry => entry.status);
  const statuses = [
    ...caseStatuses,
    ...(manifestStatus ? [manifestStatus] : []),
  ];
  const caseCounts = {
    total: cases.length,
    ready: caseStatuses.filter(status => status === "ready").length,
    review: caseStatuses.filter(status => status === "review").length,
    invalid: caseStatuses.filter(status => status === "invalid").length,
  };
  const findingCounts = cases.reduce(
    (totals, entry) => ({
      error: totals.error + entry.counts.error,
      warning: totals.warning + entry.counts.warning,
      pass: totals.pass + entry.counts.pass,
    }),
    { error: 0, warning: 0, pass: 0 }
  );
  if (manifestSource) {
    findingCounts.error += manifestSource.analysis.counts.error;
    findingCounts.warning += manifestSource.analysis.counts.warning;
    findingCounts.pass += manifestSource.analysis.counts.pass;
  }

  return {
    schemaVersion: blueprintSuiteReportSchemaVersion,
    mode: "contract-conformance-report",
    suite,
    policy: { strict },
    source: {
      manifest: manifestSource
        ? {
            uri: manifestSource.uri.replaceAll("\\", "/"),
            sha256: await sha256Hex(manifestSource.bytes),
            status: manifestStatus ?? manifestSource.analysis.status,
            validationStatus: manifestSource.analysis.status,
            counts: manifestSource.analysis.counts,
            findings: manifestSource.analysis.findings,
          }
        : null,
    },
    summary: {
      status: aggregateStatus(statuses),
      cases: caseCounts,
      findings: findingCounts,
    },
    cases,
    proofBoundary:
      "Field Atlas checked local contract structure and exact imported bytes; it did not execute agents, call services, authenticate owners, verify evidence, or approve a release.",
  };
}
