import type {
  BlueprintAnalysis,
  BlueprintFinding,
  FindingSeverity,
} from "./blueprint";

export const sarifSchemaVersion = "2.1.0" as const;
export const fieldAtlasVersion = "1.0.0" as const;

export interface BlueprintSarifOptions {
  artifactUri: string;
  strict?: boolean;
  executionSuccessful?: boolean;
  commandLine?: string;
}

interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription: { text: string };
  helpUri: string;
  defaultConfiguration: { level: "error" | "warning" };
  properties: {
    tags: string[];
    precision: "very-high";
  };
}

interface SarifResult {
  ruleId: string;
  ruleIndex: number;
  level: "error" | "warning";
  kind: "fail" | "review";
  message: { text: string };
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region: { startLine: 1; startColumn: 1 };
    };
    logicalLocations: Array<{ name: string; kind: "field" }>;
  }>;
  partialFingerprints: { primaryLocationLineHash: string };
  properties: { jsonPath: string; fieldAtlasSeverity: FindingSeverity };
}

export interface BlueprintSarifLog {
  $schema: "https://json.schemastore.org/sarif-2.1.0.json";
  version: typeof sarifSchemaVersion;
  runs: Array<{
    tool: {
      driver: {
        name: "Samsarix Field Atlas";
        organization: "Samsarix LLC";
        semanticVersion: typeof fieldAtlasVersion;
        informationUri: string;
        rules: SarifRule[];
      };
    };
    automationDetails: { id: string };
    columnKind: "utf16CodeUnits";
    invocations: Array<{
      executionSuccessful: boolean;
      commandLine?: string;
      properties: {
        validationStatus: "invalid" | "review" | "ready";
        strict: boolean;
        strictFailure: boolean;
        counts: BlueprintAnalysis["counts"];
      };
    }>;
    results: SarifResult[];
  }>;
}

const conformanceHelpUri =
  "https://github.com/Deathcharge/samsarix-field-atlas/blob/main/docs/BLUEPRINT_CONFORMANCE.md";

function ruleName(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map(part => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join("");
}

function ruleTitle(code: string): string {
  return code.toLowerCase().replaceAll("_", " ");
}

function sarifLevel(severity: FindingSeverity): "error" | "warning" {
  return severity === "error" ? "error" : "warning";
}

function artifactUri(value: string): string {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  return normalized
    .split("/")
    .map((segment, index) =>
      index === 0 && /^[A-Za-z]:$/.test(segment)
        ? `${segment[0]}%3A`
        : encodeURIComponent(segment)
    )
    .join("/");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(digest), byte =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function reportableFindings(findings: BlueprintFinding[]): BlueprintFinding[] {
  return findings.filter(finding => finding.severity !== "pass");
}

export async function createBlueprintSarif(
  analysis: BlueprintAnalysis,
  options: BlueprintSarifOptions
): Promise<BlueprintSarifLog> {
  const strict = options.strict ?? false;
  const strictFailure = strict && analysis.counts.warning > 0;
  const findings = reportableFindings(analysis.findings);
  const rules: SarifRule[] = [];
  const ruleIndexes = new Map<string, number>();

  for (const finding of findings) {
    if (ruleIndexes.has(finding.code)) continue;
    ruleIndexes.set(finding.code, rules.length);
    rules.push({
      id: finding.code,
      name: ruleName(finding.code),
      shortDescription: { text: ruleTitle(finding.code) },
      fullDescription: { text: finding.message },
      helpUri: conformanceHelpUri,
      defaultConfiguration: { level: sarifLevel(finding.severity) },
      properties: {
        tags: ["conformance", "governance", "samsarix-field-atlas"],
        precision: "very-high",
      },
    });
  }

  const normalizedArtifactUri = artifactUri(options.artifactUri);
  const results = await Promise.all(
    findings.map(async finding => ({
      ruleId: finding.code,
      ruleIndex: ruleIndexes.get(finding.code) ?? 0,
      level: sarifLevel(finding.severity),
      kind:
        finding.severity === "error" ? ("fail" as const) : ("review" as const),
      message: { text: `${finding.path}: ${finding.message}` },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: normalizedArtifactUri },
            region: { startLine: 1 as const, startColumn: 1 as const },
          },
          logicalLocations: [{ name: finding.path, kind: "field" as const }],
        },
      ],
      partialFingerprints: {
        primaryLocationLineHash: await sha256Hex(
          `${finding.code}\u0000${finding.path}`
        ),
      },
      properties: {
        jsonPath: finding.path,
        fieldAtlasSeverity: finding.severity,
      },
    }))
  );

  return {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: sarifSchemaVersion,
    runs: [
      {
        tool: {
          driver: {
            name: "Samsarix Field Atlas",
            organization: "Samsarix LLC",
            semanticVersion: fieldAtlasVersion,
            informationUri:
              "https://github.com/Deathcharge/samsarix-field-atlas",
            rules,
          },
        },
        automationDetails: {
          id: "samsarix-field-atlas/blueprint-conformance/",
        },
        columnKind: "utf16CodeUnits",
        invocations: [
          {
            executionSuccessful: options.executionSuccessful ?? true,
            ...(options.commandLine
              ? { commandLine: options.commandLine }
              : {}),
            properties: {
              validationStatus:
                strictFailure && analysis.status === "review"
                  ? "invalid"
                  : analysis.status,
              strict,
              strictFailure,
              counts: analysis.counts,
            },
          },
        ],
        results,
      },
    ],
  };
}
