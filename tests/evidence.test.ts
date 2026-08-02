import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import type { A2AAcceptanceManifest } from "../client/src/acceptance";
import {
  sha256Hex,
  validateA2ATckEvidence,
  type A2ATckEvidenceProfile,
  type A2ATckEvidenceReceipt,
} from "../client/src/evidence";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const generatedAt = "2026-08-01T13:00:00.000Z";

interface TckRequirementFixture {
  level: "MUST" | "SHOULD" | "MAY";
  status: "PASS" | "FAIL" | "SKIPPED" | "NOT TESTED";
  transports: Record<string, "PASS" | "FAIL" | "SKIPPED">;
  errors: string[];
  test_ids: string[];
}

interface TckReportFixture {
  summary: {
    timestamp: string;
    sut_url: string;
    spec_version: string;
    overall_compatibility: string;
    must_compatibility: string;
    should_compatibility: string;
    may_compatibility: string;
  };
  per_requirement: Record<string, TckRequirementFixture>;
  per_transport: Record<
    string,
    { total: number; passed: number; failed: number; skipped: number }
  >;
  agent_card?: { name?: string; version?: string };
}

function readFixture<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(repositoryRoot, path), "utf8")) as T;
}

function fixtures(): {
  plan: A2AAcceptanceManifest;
  report: TckReportFixture;
  profile: A2ATckEvidenceProfile;
  expected: A2ATckEvidenceReceipt;
} {
  return {
    plan: readFixture<A2AAcceptanceManifest>(
      "examples/incident.a2a-acceptance.json"
    ),
    report: readFixture<TckReportFixture>(
      "examples/incident.a2a-tck-compatibility.json"
    ),
    profile: readFixture<A2ATckEvidenceProfile>(
      "examples/incident.a2a-tck-evidence-profile.json"
    ),
    expected: readFixture<A2ATckEvidenceReceipt>(
      "examples/incident.a2a-tck-receipt.json"
    ),
  };
}

describe("A2A TCK evidence receipt", () => {
  it("binds exact report bytes while keeping 100% omissions visible", async () => {
    const { plan, report, profile, expected } = fixtures();
    const reportBytes = readFileSync(
      resolve(repositoryRoot, "examples/incident.a2a-tck-compatibility.json")
    );
    const digest = await sha256Hex(reportBytes);
    const first = validateA2ATckEvidence(
      plan,
      report,
      profile,
      generatedAt,
      digest
    );
    const second = validateA2ATckEvidence(
      plan,
      report,
      profile,
      generatedAt,
      digest
    );

    expect(first.status).toBe("review");
    expect(first.receipt).toEqual(second.receipt);
    expect(first.receipt).toEqual(expected);
    expect(first.receipt).toMatchObject({
      status: "owner-review-required",
      evidenceState: "attached-unreviewed",
      claims: {
        protocolConformance: "not-determined",
        releaseDecision: "not-made",
      },
      observations: {
        compatibility: { overall: "100.0%" },
        requirements: { passed: 2, skipped: 1, notTested: 1 },
      },
    });
    expect(first.receipt?.acceptanceCoverage.evidenceAttachedCaseIds).toEqual([
      "a2a-official-tck",
    ]);
    expect(first.receipt?.acceptanceCoverage.unresolvedCaseIds).not.toContain(
      "a2a-official-tck"
    );
    expect(first.receipt?.acceptanceCoverage.unresolvedCaseIds).toHaveLength(
      21
    );
    expect(first.findings.map(finding => finding.code)).toEqual(
      expect.arrayContaining([
        "MISSING_REPORT_SPEC_VERSION",
        "TCK_SKIPPED_REQUIREMENTS",
        "TCK_NOT_TESTED_REQUIREMENTS",
        "OWNER_REVIEW_PRESERVED",
      ])
    );
  });

  it("emits a receipt that conforms to the published JSON Schema", async () => {
    const { plan, report, profile, expected } = fixtures();
    const schema = readFixture<object>("schema/a2a-tck-receipt.schema.json");
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const conforms = ajv.compile(schema);
    const digest = await sha256Hex(
      readFileSync(
        resolve(repositoryRoot, "examples/incident.a2a-tck-compatibility.json")
      )
    );
    const analysis = validateA2ATckEvidence(
      plan,
      report,
      profile,
      generatedAt,
      digest
    );

    expect(analysis.receipt).toEqual(expected);
    expect(conforms(analysis.receipt), JSON.stringify(conforms.errors)).toBe(
      true
    );
  });

  it("rejects percentages and requirement statuses that do not recompute", () => {
    const { plan, report, profile } = fixtures();
    report.summary.overall_compatibility = "75.0%";
    report.per_requirement["CORE-GET-001"]!.status = "FAIL";
    const analysis = validateA2ATckEvidence(
      plan,
      report,
      profile,
      generatedAt,
      "a".repeat(64)
    );

    expect(analysis.status).toBe("invalid");
    expect(analysis.receipt).toBeUndefined();
    expect(analysis.findings.map(finding => finding.code)).toEqual(
      expect.arrayContaining([
        "INCONSISTENT_TCK_REQUIREMENT_STATUS",
        "INCONSISTENT_TCK_COMPATIBILITY",
      ])
    );
  });

  it("rejects inconsistent per-transport totals", () => {
    const { plan, report, profile } = fixtures();
    report.per_transport.http_json!.total = 4;
    const analysis = validateA2ATckEvidence(
      plan,
      report,
      profile,
      generatedAt,
      "b".repeat(64)
    );

    expect(analysis.status).toBe("invalid");
    expect(analysis.receipt).toBeUndefined();
    expect(analysis.findings.map(finding => finding.code)).toEqual(
      expect.arrayContaining([
        "INCONSISTENT_TCK_TRANSPORT_SUMMARY",
        "MISSING_TCK_TRANSPORT_SUMMARY",
      ])
    );
  });

  it("rejects a receipt timestamp that predates the report", () => {
    const { plan, report, profile } = fixtures();
    report.summary.timestamp = "2026-08-01T14:00:00+00:00";
    const analysis = validateA2ATckEvidence(
      plan,
      report,
      profile,
      generatedAt,
      "b".repeat(64)
    );

    expect(analysis.status).toBe("invalid");
    expect(analysis.receipt).toBeUndefined();
    expect(analysis.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "TCK_REPORT_AFTER_RECEIPT" }),
      ])
    );
  });

  it("surfaces provenance, identity, transport, and failure caveats without copying raw errors", () => {
    const { plan, report, profile } = fixtures();
    profile.evidenceOwner = "Independent Release Review";
    profile.tckRevision = "1".repeat(40);
    report.summary.sut_url = "https://other.example.com";
    report.summary.spec_version = "0.3";
    report.summary.overall_compatibility = "50.0%";
    report.summary.should_compatibility = "0.0%";
    const failed = report.per_requirement["CORE-ERR-002"]!;
    failed.status = "FAIL";
    failed.transports.http_json = "FAIL";
    failed.errors = ["Authorization: Bearer raw-secret-value"];
    report.per_transport.http_json = {
      total: 3,
      passed: 1,
      failed: 1,
      skipped: 1,
    };
    report.agent_card!.name = "Different Agent";

    const analysis = validateA2ATckEvidence(
      plan,
      report,
      profile,
      generatedAt,
      "c".repeat(64)
    );

    expect(analysis.status).toBe("review");
    expect(analysis.receipt).toBeDefined();
    expect(analysis.findings.map(finding => finding.code)).toEqual(
      expect.arrayContaining([
        "UNREVIEWED_TCK_REVISION",
        "REPORT_SPEC_VERSION_MISMATCH",
        "TCK_SUT_ORIGIN_MISMATCH",
        "EVIDENCE_OWNER_DIFFERS",
        "TCK_FAILURES_REQUIRE_DISPOSITION",
        "TCK_AGENT_NAME_MISMATCH",
      ])
    );
    expect(JSON.stringify(analysis.receipt)).not.toContain("raw-secret-value");
    expect(analysis.receipt).not.toHaveProperty("source.tckReport.agent_card");
  });

  it("rejects mutable provenance and likely secret-bearing commands", () => {
    const { plan, report, profile } = fixtures();
    profile.tckRevision = "main";
    profile.implementationRevision = "latest";
    profile.runCommand =
      "./run_tck.py --sut-host https://agent.example.com --token super-secret";
    const analysis = validateA2ATckEvidence(
      plan,
      report,
      profile,
      generatedAt,
      "d".repeat(64)
    );

    expect(analysis.status).toBe("invalid");
    expect(analysis.receipt).toBeUndefined();
    expect(analysis.findings.map(finding => finding.code)).toEqual(
      expect.arrayContaining([
        "INVALID_TCK_REVISION",
        "INVALID_IMPLEMENTATION_REVISION",
        "POTENTIAL_SECRET_IN_RUN_COMMAND",
      ])
    );
  });

  it("flags an embedded card whose bounded identity is incomplete", () => {
    const { plan, report, profile } = fixtures();
    delete report.agent_card!.version;
    const analysis = validateA2ATckEvidence(
      plan,
      report,
      profile,
      generatedAt,
      "e".repeat(64)
    );

    expect(analysis.status).toBe("review");
    expect(analysis.receipt?.source.tckReport.embeddedAgentCard).toBe(true);
    expect(analysis.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "TCK_AGENT_IDENTITY_INCOMPLETE" }),
      ])
    );
  });

  it("hashes exact bytes rather than parsed JSON values", async () => {
    const compact = new TextEncoder().encode('{"value":1}');
    const spaced = new TextEncoder().encode('{ "value": 1 }\n');

    expect(await sha256Hex(compact)).toMatch(/^[a-f\d]{64}$/);
    expect(await sha256Hex(compact)).not.toBe(await sha256Hex(spaced));
  });
});
