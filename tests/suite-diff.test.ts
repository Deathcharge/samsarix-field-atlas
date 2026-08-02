import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

import type { BlueprintFinding } from "../client/src/blueprint";
import type { BlueprintSuiteReport } from "../client/src/suite";
import {
  createBlueprintSuiteDiff,
  validateBlueprintSuiteReport,
  type BlueprintSuiteDiffSource,
} from "../client/src/suite-diff";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function fixtureBytes(path: string): Uint8Array {
  return readFileSync(resolve(repositoryRoot, path));
}

function fixture<T>(path: string): T {
  return JSON.parse(new TextDecoder().decode(fixtureBytes(path))) as T;
}

function cloneReport(report: BlueprintSuiteReport): BlueprintSuiteReport {
  return structuredClone(report);
}

function source(
  uri: string,
  report: BlueprintSuiteReport,
  bytes?: Uint8Array
): BlueprintSuiteDiffSource {
  return {
    uri,
    report,
    bytes:
      bytes ?? new TextEncoder().encode(`${JSON.stringify(report, null, 2)}\n`),
  };
}

function recomputeSummary(report: BlueprintSuiteReport) {
  report.summary.cases = {
    total: report.cases.length,
    ready: report.cases.filter(entry => entry.status === "ready").length,
    review: report.cases.filter(entry => entry.status === "review").length,
    invalid: report.cases.filter(entry => entry.status === "invalid").length,
  };
  const statuses = report.cases.map(entry => entry.status);
  if (report.source.manifest) statuses.push(report.source.manifest.status);
  report.summary.status = statuses.includes("invalid")
    ? "invalid"
    : statuses.includes("review")
      ? "review"
      : "ready";
  report.summary.findings = report.cases.reduce(
    (counts, entry) => ({
      error: counts.error + entry.counts.error,
      warning: counts.warning + entry.counts.warning,
      pass: counts.pass + entry.counts.pass,
    }),
    report.source.manifest
      ? { ...report.source.manifest.counts }
      : { error: 0, warning: 0, pass: 0 }
  );
}

describe("blueprint suite baselines", () => {
  it("reproduces the deterministic comparison fixture and public schema", async () => {
    const baselineReport = fixture<BlueprintSuiteReport>(
      "examples/core.suite-report.json"
    );
    const candidateReport = fixture<BlueprintSuiteReport>(
      "examples/core-candidate.suite-report.json"
    );
    const expected = fixture("examples/core.suite-diff.json");
    const baselineAnalysis = validateBlueprintSuiteReport(baselineReport);
    const candidateAnalysis = validateBlueprintSuiteReport(candidateReport);
    const diff = await createBlueprintSuiteDiff(
      source(
        "core.suite-report.json",
        baselineReport,
        fixtureBytes("examples/core.suite-report.json")
      ),
      source(
        "core-candidate.suite-report.json",
        candidateReport,
        fixtureBytes("examples/core-candidate.suite-report.json")
      )
    );
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    const validate = ajv.compile(
      fixture("schema/blueprint-suite-diff.schema.json") as object
    );

    expect(baselineAnalysis.status).toBe("ready");
    expect(candidateAnalysis.status).toBe("ready");
    expect(diff).toEqual(expected);
    expect(validate(diff), JSON.stringify(validate.errors)).toBe(true);
    expect(diff.summary).toMatchObject({
      outcome: "review",
      gate: "pass",
      cases: { modified: 1, unchanged: 2 },
      impact: { review: 1 },
    });
    expect(diff.cases.find(entry => entry.id === "incident")).toMatchObject({
      change: "modified",
      impact: "review",
      differences: ["tags"],
    });
    const inconsistent = structuredClone(diff);
    inconsistent.cases[0]!.change = "added";
    expect(validate(inconsistent)).toBe(false);
  });

  it("rejects malformed and internally inconsistent imported reports", () => {
    const report = fixture<BlueprintSuiteReport>(
      "examples/core.suite-report.json"
    );
    report.summary.cases.ready = 2;
    report.summary.findings.pass += 1;
    report.cases[1]!.id = report.cases[0]!.id;
    report.cases[0]!.counts.pass += 1;
    report.cases[0]!.artifact.sha256 = "NOT-A-DIGEST";
    (report as BlueprintSuiteReport & { release: string }).release = "prod";

    const analysis = validateBlueprintSuiteReport(report);

    expect(analysis.status).toBe("invalid");
    expect(analysis.report).toBeUndefined();
    expect(analysis.findings.map(finding => finding.code)).toEqual(
      expect.arrayContaining([
        "UNRECOGNIZED_SUITE_REPORT_FIELD",
        "INVALID_SUITE_REPORT_DIGEST",
      ])
    );
  });

  it("detects semantic inconsistencies after structural validation", () => {
    const report = fixture<BlueprintSuiteReport>(
      "examples/core.suite-report.json"
    );
    report.summary.cases.ready = 2;
    report.summary.findings.pass += 1;
    report.cases[1]!.id = report.cases[0]!.id;
    report.cases[0]!.counts.pass += 1;
    report.cases[2]!.status = "invalid";
    report.cases[2]!.validationStatus = "review";

    const analysis = validateBlueprintSuiteReport(report);

    expect(analysis.findings.map(finding => finding.code)).toEqual(
      expect.arrayContaining([
        "DUPLICATE_SUITE_REPORT_CASE",
        "INCONSISTENT_SUITE_REPORT_COUNTS",
        "INCONSISTENT_SUITE_REPORT_STATUS",
        "INCONSISTENT_SUITE_REPORT_SUMMARY",
      ])
    );
  });

  it("bounds malformed nested report shapes without trusting summaries", () => {
    expect(validateBlueprintSuiteReport(null)).toMatchObject({
      status: "invalid",
      findings: [
        expect.objectContaining({ code: "EXPECTED_SUITE_REPORT_OBJECT" }),
      ],
    });
    const malformed = fixture<BlueprintSuiteReport>(
      "examples/core.suite-report.json"
    ) as unknown as Record<string, unknown>;
    malformed.release = "prod";
    malformed.policy = { strict: "yes", release: true };
    malformed.source = {
      manifest: {
        uri: "",
        sha256: "bad",
        status: "unknown",
        validationStatus: "unknown",
        counts: null,
        findings: null,
        release: true,
      },
      release: true,
    };
    malformed.summary = {
      status: "unknown",
      cases: {
        total: 0,
        ready: -1,
        review: "0",
        invalid: 65,
        release: true,
      },
      findings: null,
      release: true,
    };
    const cases = malformed.cases as unknown[];
    cases[0] = {
      id: "1-invalid",
      artifact: {
        uri: "",
        sha256: null,
        bytes: 1,
        release: true,
      },
      tags: Array.from({ length: 17 }, () => "duplicate"),
      status: "unknown",
      validationStatus: "unknown",
      scenario: { id: "", title: "", risk: "critical", release: true },
      counts: { error: -1, warning: "0", pass: 0, release: true },
      metrics: {
        roles: 65,
        stages: -1,
        humanGates: "0",
        evidenceArtifacts: 129,
        release: true,
      },
      findings: [
        null,
        {
          code: "",
          severity: "info",
          path: "",
          message: "",
          release: true,
        },
      ],
      release: true,
    };
    malformed.proofBoundary = "";

    const analysis = validateBlueprintSuiteReport(malformed);

    expect(analysis.status).toBe("invalid");
    expect(analysis.findings.map(finding => finding.code)).toEqual(
      expect.arrayContaining([
        "UNRECOGNIZED_SUITE_REPORT_FIELD",
        "INVALID_SUITE_REPORT_POLICY",
        "INVALID_SUITE_REPORT_SOURCE",
        "INVALID_SUITE_REPORT_SUMMARY",
        "INVALID_SUITE_REPORT_CASE",
        "INCONSISTENT_SUITE_REPORT_ARTIFACT",
        "INVALID_SUITE_REPORT_TAGS",
        "INVALID_SUITE_REPORT_SCENARIO",
        "INVALID_SUITE_REPORT_METRICS",
        "INVALID_SUITE_REPORT_FINDING",
        "INVALID_SUITE_REPORT_PROOF_BOUNDARY",
      ])
    );
  });

  it("accepts an internally consistent ad hoc browser report", () => {
    const report = fixture<BlueprintSuiteReport>(
      "examples/core.suite-report.json"
    );
    report.summary.findings.pass -= report.source.manifest?.counts.pass ?? 0;
    report.source.manifest = null;

    expect(validateBlueprintSuiteReport(report)).toMatchObject({
      status: "ready",
      report,
    });
  });

  it("treats removed coverage as a blocking regression", async () => {
    const baseline = fixture<BlueprintSuiteReport>(
      "examples/core.suite-report.json"
    );
    const candidate = cloneReport(baseline);
    candidate.cases.pop();
    recomputeSummary(candidate);
    expect(validateBlueprintSuiteReport(candidate).status).toBe("ready");

    const diff = await createBlueprintSuiteDiff(
      source("baseline.json", baseline),
      source("candidate.json", candidate)
    );

    expect(diff.summary).toMatchObject({
      outcome: "regression",
      gate: "fail",
      cases: { removed: 1 },
      impact: { regression: 1 },
    });
    expect(diff.cases.find(entry => entry.change === "removed")).toMatchObject({
      id: "ambiguous-request",
      impact: "regression",
      candidate: null,
    });
  });

  it("classifies worse conformance as regression and recovery as improvement", async () => {
    const ready = fixture<BlueprintSuiteReport>(
      "examples/core.suite-report.json"
    );
    const regressed = cloneReport(ready);
    const incident = regressed.cases.find(entry => entry.id === "incident")!;
    const warning: BlueprintFinding = {
      severity: "warning",
      code: "OWNER_REVIEW_REQUIRED",
      path: "$.scenario",
      message: "Review the candidate incident contract.",
    };
    incident.status = "invalid";
    incident.validationStatus = "review";
    incident.counts.warning += 1;
    incident.findings.push(warning);
    recomputeSummary(regressed);
    expect(validateBlueprintSuiteReport(regressed).status).toBe("ready");

    const regression = await createBlueprintSuiteDiff(
      source("ready.json", ready),
      source("regressed.json", regressed)
    );
    const improvement = await createBlueprintSuiteDiff(
      source("regressed.json", regressed),
      source("ready.json", ready)
    );

    expect(regression.summary).toMatchObject({
      outcome: "regression",
      gate: "fail",
      reportImpact: "regression",
    });
    expect(improvement.summary).toMatchObject({
      outcome: "improvement",
      gate: "pass",
      reportImpact: "improvement",
    });
  });

  it("blocks a newly added invalid case and mixed finding movement", async () => {
    const baseline = fixture<BlueprintSuiteReport>(
      "examples/core.suite-report.json"
    );
    const withInvalidAddition = cloneReport(baseline);
    const added = structuredClone(withInvalidAddition.cases[1]!);
    added.id = "new-invalid-case";
    added.artifact.uri = "new-invalid-case.json";
    added.status = "invalid";
    added.validationStatus = "invalid";
    added.counts.error += 1;
    added.findings.push({
      severity: "error",
      code: "INVALID_NEW_CASE",
      path: "$",
      message: "The newly covered case is invalid.",
    });
    withInvalidAddition.cases.push(added);
    recomputeSummary(withInvalidAddition);

    const addition = await createBlueprintSuiteDiff(
      source("baseline.json", baseline),
      source("candidate.json", withInvalidAddition)
    );
    expect(addition.cases.find(entry => entry.id === added.id)).toMatchObject({
      change: "added",
      impact: "regression",
      baseline: null,
    });

    const mixedBaseline = cloneReport(baseline);
    const mixedCandidate = cloneReport(baseline);
    const baselineIncident = mixedBaseline.cases[1]!;
    const candidateIncident = mixedCandidate.cases[1]!;
    baselineIncident.status = "invalid";
    baselineIncident.validationStatus = "invalid";
    baselineIncident.counts.error = 1;
    baselineIncident.findings = [
      {
        severity: "error",
        code: "BASELINE_ERROR",
        path: "$",
        message: "Baseline error.",
      },
    ];
    candidateIncident.status = "invalid";
    candidateIncident.validationStatus = "invalid";
    candidateIncident.counts.warning = 1;
    candidateIncident.findings = [
      {
        severity: "warning",
        code: "CANDIDATE_WARNING",
        path: "$",
        message: "Candidate warning.",
      },
    ];
    recomputeSummary(mixedBaseline);
    recomputeSummary(mixedCandidate);
    const mixed = await createBlueprintSuiteDiff(
      source("mixed-baseline.json", mixedBaseline),
      source("mixed-candidate.json", mixedCandidate)
    );
    expect(mixed.cases.find(entry => entry.id === "incident")).toMatchObject({
      change: "modified",
      impact: "mixed",
    });
    expect(mixed.summary.gate).toBe("fail");
  });

  it("can tighten a review-only comparison to fail on any change", async () => {
    const baseline = fixture<BlueprintSuiteReport>(
      "examples/core.suite-report.json"
    );
    const candidate = fixture<BlueprintSuiteReport>(
      "examples/core-candidate.suite-report.json"
    );

    const regressionOnly = await createBlueprintSuiteDiff(
      source("baseline.json", baseline),
      source("candidate.json", candidate)
    );
    const anyChange = await createBlueprintSuiteDiff(
      source("baseline.json", baseline),
      source("candidate.json", candidate),
      true
    );

    expect(regressionOnly.summary.gate).toBe("pass");
    expect(anyChange.summary.gate).toBe("fail");
    expect(anyChange.policy.failOn).toBe("change");
  });

  it("matches cases and tags independent of report ordering", async () => {
    const baseline = fixture<BlueprintSuiteReport>(
      "examples/core.suite-report.json"
    );
    const reordered = cloneReport(baseline);
    reordered.suite = {
      description: reordered.suite.description,
      title: reordered.suite.title,
      id: reordered.suite.id,
    };
    reordered.cases.reverse();
    for (const entry of reordered.cases) {
      entry.tags.reverse();
      entry.artifact = {
        bytes: entry.artifact.bytes,
        sha256: entry.artifact.sha256,
        uri: entry.artifact.uri,
      };
      entry.counts = {
        pass: entry.counts.pass,
        warning: entry.counts.warning,
        error: entry.counts.error,
      };
      if (entry.scenario) {
        entry.scenario = {
          risk: entry.scenario.risk,
          title: entry.scenario.title,
          id: entry.scenario.id,
        };
      }
      if (entry.metrics) {
        entry.metrics = {
          evidenceArtifacts: entry.metrics.evidenceArtifacts,
          humanGates: entry.metrics.humanGates,
          stages: entry.metrics.stages,
          roles: entry.metrics.roles,
        };
      }
    }
    expect(validateBlueprintSuiteReport(reordered).status).toBe("ready");

    const diff = await createBlueprintSuiteDiff(
      source("baseline.json", baseline),
      source("reordered.json", reordered)
    );

    expect(diff.summary.outcome).toBe("unchanged");
    expect(diff.summary.cases.unchanged).toBe(3);
    expect(diff.cases.map(entry => entry.id)).toEqual([
      "ambiguous-request",
      "breaking-change",
      "incident",
    ]);
  });

  it("refuses to align reports for different suite identities", async () => {
    const baseline = fixture<BlueprintSuiteReport>(
      "examples/core.suite-report.json"
    );
    const candidate = cloneReport(baseline);
    candidate.suite.id = "another-suite";

    await expect(
      createBlueprintSuiteDiff(
        source("baseline.json", baseline),
        source("candidate.json", candidate)
      )
    ).rejects.toThrow(/suite identifiers differ/i);
  });

  it("refuses direct comparisons with duplicate case identifiers", async () => {
    const baseline = fixture<BlueprintSuiteReport>(
      "examples/core.suite-report.json"
    );
    const candidate = cloneReport(baseline);
    candidate.cases[1]!.id = candidate.cases[0]!.id;

    await expect(
      createBlueprintSuiteDiff(
        source("baseline.json", baseline),
        source("candidate.json", candidate)
      )
    ).rejects.toThrow(/unique case identifiers/i);
  });
});
