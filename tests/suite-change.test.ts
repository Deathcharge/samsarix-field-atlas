import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

import type { BlueprintSuiteReport } from "../client/src/suite";
import { blueprintSuiteChangeReviewToMarkdown } from "../client/src/suite-change-reporting";
import {
  createBlueprintSuiteChangeReview,
  maximumSuiteChangePlanBytes,
  validateBlueprintSuiteChangePlan,
  type BlueprintSuiteChangePlan,
  type BlueprintSuiteChangePlanSource,
} from "../client/src/suite-change";
import {
  createBlueprintSuiteDiff,
  type BlueprintSuiteDiff,
} from "../client/src/suite-diff";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function fixtureBytes(path: string): Uint8Array {
  return readFileSync(resolve(repositoryRoot, path));
}

function fixture<T>(path: string): T {
  return JSON.parse(new TextDecoder().decode(fixtureBytes(path))) as T;
}

function planSource(
  plan: BlueprintSuiteChangePlan,
  uri = "change-plan.json"
): BlueprintSuiteChangePlanSource {
  return {
    uri,
    plan,
    bytes: new TextEncoder().encode(`${JSON.stringify(plan, null, 2)}\n`),
  };
}

async function comparison(): Promise<BlueprintSuiteDiff> {
  const baseline = fixture<BlueprintSuiteReport>(
    "examples/core.suite-report.json"
  );
  const candidate = fixture<BlueprintSuiteReport>(
    "examples/core-candidate.suite-report.json"
  );
  return createBlueprintSuiteDiff(
    {
      uri: "core.suite-report.json",
      bytes: fixtureBytes("examples/core.suite-report.json"),
      report: baseline,
    },
    {
      uri: "core-candidate.suite-report.json",
      bytes: fixtureBytes("examples/core-candidate.suite-report.json"),
      report: candidate,
    }
  );
}

describe("declared suite changes", () => {
  it("reproduces the deterministic review and both public schemas", async () => {
    const plan = fixture<BlueprintSuiteChangePlan>(
      "examples/core.suite-change-plan.json"
    );
    const expected = fixture("examples/core.suite-change-review.json");
    const analysis = validateBlueprintSuiteChangePlan(plan);
    const review = await createBlueprintSuiteChangeReview(
      {
        uri: "core.suite-change-plan.json",
        bytes: fixtureBytes("examples/core.suite-change-plan.json"),
        plan,
      },
      await comparison(),
      "2026-08-08"
    );
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    const validatePlan = ajv.compile(
      fixture("schema/blueprint-suite-change-plan.schema.json") as object
    );
    const validateReview = ajv.compile(
      fixture("schema/blueprint-suite-change-review.schema.json") as object
    );

    expect(analysis).toMatchObject({ status: "ready", plan });
    expect(review).toEqual(expected);
    expect(validatePlan(plan), JSON.stringify(validatePlan.errors)).toBe(true);
    expect(validateReview(review), JSON.stringify(validateReview.errors)).toBe(
      true
    );

    const extraPlan = { ...structuredClone(plan), release: true };
    expect(validatePlan(extraPlan)).toBe(false);
    expect(validatePlan.errors).not.toBeNull();

    const emptyModifiedDimensions = structuredClone(plan);
    emptyModifiedDimensions.expectations[0]!.dimensions = [];
    expect(validatePlan(emptyModifiedDimensions)).toBe(false);
    expect(validatePlan.errors).not.toBeNull();

    const unacknowledgedRegression = structuredClone(plan);
    unacknowledgedRegression.expectations[0]!.impact = "regression";
    expect(validatePlan(unacknowledgedRegression)).toBe(false);
    expect(validatePlan.errors).not.toBeNull();

    const normalizedReference = structuredClone(plan);
    normalizedReference.reference = "HTTPS://example.com/change";
    expect(validatePlan(normalizedReference)).toBe(false);
    expect(validatePlan.errors).not.toBeNull();
    expect(validateBlueprintSuiteChangePlan(normalizedReference).status).toBe(
      "invalid"
    );

    for (const invalidDate of ["2026-13-01", "2026-12-32"]) {
      const invalidExpiry = structuredClone(plan);
      invalidExpiry.expiresOn = invalidDate;
      expect(validatePlan(invalidExpiry)).toBe(false);
      expect(validatePlan.errors).not.toBeNull();
    }

    const extraReview = { ...structuredClone(review), release: true };
    expect(validateReview(extraReview)).toBe(false);
    expect(validateReview.errors).not.toBeNull();

    const invalidReviewDimensions = structuredClone(review);
    invalidReviewDimensions.cases[0]!.expected!.dimensions = [];
    expect(validateReview(invalidReviewDimensions)).toBe(false);
    expect(validateReview.errors).not.toBeNull();

    const invalidReviewAcknowledgement = structuredClone(review);
    invalidReviewAcknowledgement.cases[0]!.expected!.impact = "regression";
    invalidReviewAcknowledgement.cases[0]!.expected!.regressionAcknowledged = false;
    expect(validateReview(invalidReviewAcknowledgement)).toBe(false);
    expect(validateReview.errors).not.toBeNull();

    expect(review).toMatchObject({
      binding: {
        suiteId: { matched: true },
        baselineReportSha256: { matched: true },
      },
      summary: {
        status: "matched",
        gate: "pass",
        cases: { matched: 1, unexpected: 0, missing: 0 },
      },
    });
  });

  it("rejects unbounded, ambiguous, duplicate, and no-op plans", () => {
    const malformed = fixture<BlueprintSuiteChangePlan>(
      "examples/core.suite-change-plan.json"
    ) as BlueprintSuiteChangePlan & { release: boolean };
    malformed.release = true;
    malformed.owner = " owner ";
    malformed.reference = "https://example.com/change?token=secret";
    malformed.expiresOn = "2026-02-30";
    malformed.expectations.push(structuredClone(malformed.expectations[0]!));
    malformed.expectations[0]!.change = "removed";
    malformed.expectations[0]!.impact = "review";
    malformed.expectations[0]!.dimensions = ["tags"];
    malformed.expectations[0]!.regressionAcknowledged = false;
    malformed.proofBoundary = "short";

    const analysis = validateBlueprintSuiteChangePlan(malformed);

    expect(analysis.status).toBe("invalid");
    expect(analysis.plan).toBeUndefined();
    expect(analysis.findings.map(finding => finding.code)).toEqual(
      expect.arrayContaining([
        "UNRECOGNIZED_SUITE_CHANGE_FIELD",
        "INVALID_SUITE_CHANGE_OWNER",
        "INVALID_SUITE_CHANGE_REFERENCE",
        "INVALID_SUITE_CHANGE_EXPIRY",
        "DUPLICATE_SUITE_CHANGE_CASE",
        "INCONSISTENT_SUITE_CHANGE_DIMENSIONS",
        "INCONSISTENT_SUITE_CHANGE_IMPACT",
        "INVALID_SUITE_CHANGE_PROOF_BOUNDARY",
      ])
    );

    const noOp = fixture<BlueprintSuiteChangePlan>(
      "examples/core.suite-change-plan.json"
    );
    noOp.expectations = [];
    noOp.suite.manifestChanged = false;
    expect(
      validateBlueprintSuiteChangePlan(noOp).findings.map(
        finding => finding.code
      )
    ).toContain("EMPTY_SUITE_CHANGE_PLAN");
  });

  it("bounds malformed nested plan shapes and unsupported values", () => {
    expect(validateBlueprintSuiteChangePlan(null)).toMatchObject({
      status: "invalid",
      findings: [
        expect.objectContaining({ code: "EXPECTED_SUITE_CHANGE_PLAN_OBJECT" }),
      ],
    });
    const malformed = {
      schemaVersion: "future",
      mode: "override-everything",
      suiteId: "1-Bad",
      baselineSha256: "bad",
      owner: "Unsafe\nOwner",
      reference: 42,
      expiresOn: "2026-02-30",
      rationale: "short",
      expectations: [
        null,
        {
          caseId: "Bad",
          change: "unchanged",
          impact: "none",
          dimensions: "tags",
          regressionAcknowledged: "yes",
          rationale: "short",
          release: true,
        },
        {
          caseId: "valid-case",
          change: "added",
          impact: "improvement",
          dimensions: ["tags", "tags"],
          regressionAcknowledged: false,
          rationale: "This rationale is long enough for bounded validation.",
        },
      ],
      suite: {
        reportImpact: "review",
        suiteMetadataChanged: "yes",
        policyChanged: 0,
        manifestChanged: null,
        release: true,
      },
      proofBoundary: "short",
      release: true,
    };

    const analysis = validateBlueprintSuiteChangePlan(malformed);

    expect(analysis.status).toBe("invalid");
    expect(analysis.findings.map(finding => finding.code)).toEqual(
      expect.arrayContaining([
        "UNRECOGNIZED_SUITE_CHANGE_FIELD",
        "UNSUPPORTED_SUITE_CHANGE_PLAN_SCHEMA",
        "UNSUPPORTED_SUITE_CHANGE_PLAN_MODE",
        "INVALID_SUITE_CHANGE_SUITE_ID",
        "INVALID_SUITE_CHANGE_BASELINE",
        "INVALID_SUITE_CHANGE_OWNER",
        "INVALID_SUITE_CHANGE_REFERENCE",
        "INVALID_SUITE_CHANGE_EXPIRY",
        "INVALID_SUITE_CHANGE_RATIONALE",
        "INVALID_SUITE_CHANGE_EXPECTATION",
        "INVALID_SUITE_CHANGE_CASE_ID",
        "INVALID_SUITE_CHANGE_KIND",
        "INVALID_SUITE_CHANGE_IMPACT",
        "INVALID_SUITE_CHANGE_DIMENSIONS",
        "INVALID_SUITE_CHANGE_ACKNOWLEDGEMENT",
        "INCONSISTENT_SUITE_CHANGE_DIMENSIONS",
        "INCONSISTENT_SUITE_CHANGE_IMPACT",
        "INVALID_SUITE_CHANGE_SIGNALS",
        "INVALID_SUITE_CHANGE_PROOF_BOUNDARY",
      ])
    );
  });

  it("fails closed for unexpected, missing, and mismatched changes", async () => {
    const plan = fixture<BlueprintSuiteChangePlan>(
      "examples/core.suite-change-plan.json"
    );
    const diff = await comparison();

    const missingPlan = structuredClone(plan);
    missingPlan.expectations[0]!.caseId = "breaking-change";
    const missing = await createBlueprintSuiteChangeReview(
      planSource(missingPlan),
      diff,
      "2026-08-08"
    );
    expect(missing.summary).toMatchObject({
      gate: "fail",
      cases: { unexpected: 1, missing: 1 },
    });
    expect(missing.cases.map(entry => entry.disposition)).toEqual([
      "missing",
      "unexpected",
    ]);

    const mismatchPlan = structuredClone(plan);
    mismatchPlan.expectations[0]!.dimensions = ["scenario"];
    const mismatch = await createBlueprintSuiteChangeReview(
      planSource(mismatchPlan),
      diff,
      "2026-08-08"
    );
    expect(mismatch.summary).toMatchObject({
      status: "mismatch",
      gate: "fail",
      cases: { mismatched: 1 },
    });
    expect(mismatch.cases[0]).toMatchObject({
      disposition: "mismatched",
      mismatches: ["dimensions"],
    });
  });

  it("fails when suite signals, suite identity, or baseline bytes drift", async () => {
    const plan = fixture<BlueprintSuiteChangePlan>(
      "examples/core.suite-change-plan.json"
    );
    plan.suite.manifestChanged = false;
    plan.suite.policyChanged = true;
    plan.suiteId = "another-suite";
    plan.baselineSha256 = "0".repeat(64);

    const review = await createBlueprintSuiteChangeReview(
      planSource(plan),
      await comparison(),
      "2026-08-08"
    );

    expect(review.summary).toMatchObject({
      status: "mismatch",
      gate: "fail",
      suiteSignalsMatched: false,
    });
    expect(review.binding).toMatchObject({
      suiteId: {
        expected: "another-suite",
        baseline: "core-reference-scenarios",
        candidate: "core-reference-scenarios",
        matched: false,
      },
      baselineReportSha256: {
        expected: "0".repeat(64),
        actual:
          "52994c82ddadbde841ebf5abfd7ef6b1a057dfea67186b26d7827fd680728f87",
        matched: false,
      },
    });
    expect(review.suite.mismatches).toEqual([
      "policyChanged",
      "manifestChanged",
    ]);
  });

  it("uses the explicit review date and fails an expired declaration", async () => {
    const plan = fixture<BlueprintSuiteChangePlan>(
      "examples/core.suite-change-plan.json"
    );
    const diff = await comparison();
    const validThroughExpiry = await createBlueprintSuiteChangeReview(
      planSource(plan),
      diff,
      "2026-09-01"
    );
    const expired = await createBlueprintSuiteChangeReview(
      planSource(plan),
      diff,
      "2026-09-02"
    );

    expect(validThroughExpiry.summary.gate).toBe("pass");
    expect(expired.summary).toMatchObject({
      status: "expired",
      gate: "fail",
      expired: true,
    });
    await expect(
      createBlueprintSuiteChangeReview(planSource(plan), diff, "2026-02-30")
    ).rejects.toThrow(/real calendar date/i);
  });

  it("requires explicit acknowledgement for declared regressions", () => {
    const plan = fixture<BlueprintSuiteChangePlan>(
      "examples/core.suite-change-plan.json"
    );
    plan.expectations[0]!.impact = "regression";

    expect(
      validateBlueprintSuiteChangePlan(plan).findings.map(
        finding => finding.code
      )
    ).toContain("INCONSISTENT_SUITE_CHANGE_ACKNOWLEDGEMENT");

    plan.expectations[0]!.regressionAcknowledged = true;
    expect(validateBlueprintSuiteChangePlan(plan).status).toBe("ready");
  });

  it("binds the digest to the exact imported plan bytes", async () => {
    const plan = fixture<BlueprintSuiteChangePlan>(
      "examples/core.suite-change-plan.json"
    );
    const source = planSource(plan);
    source.plan = structuredClone(plan);
    source.plan.owner = "Different asserted owner";

    await expect(
      createBlueprintSuiteChangeReview(source, await comparison(), "2026-08-08")
    ).rejects.toThrow(/bytes do not match/i);
  });

  it("fails closed for invalid source metadata, bytes, size, and plan content", async () => {
    const plan = fixture<BlueprintSuiteChangePlan>(
      "examples/core.suite-change-plan.json"
    );
    const diff = await comparison();

    await expect(
      createBlueprintSuiteChangeReview(
        planSource(plan, "unsafe\nplan.json"),
        diff,
        "2026-08-08"
      )
    ).rejects.toThrow(/bounded single-line/i);
    await expect(
      createBlueprintSuiteChangeReview(
        { ...planSource(plan), bytes: new Uint8Array([0xff]) },
        diff,
        "2026-08-08"
      )
    ).rejects.toThrow(/valid UTF-8 JSON/i);
    await expect(
      createBlueprintSuiteChangeReview(
        {
          ...planSource(plan),
          bytes: new Uint8Array(maximumSuiteChangePlanBytes + 1),
        },
        diff,
        "2026-08-08"
      )
    ).rejects.toThrow(/exceeds the 1 MiB/i);

    const invalid = structuredClone(plan);
    invalid.proofBoundary = "short";
    await expect(
      createBlueprintSuiteChangeReview(planSource(invalid), diff, "2026-08-08")
    ).rejects.toThrow(/plan is invalid/i);
  });

  it("renders the exact readable fixture without inventing approval", async () => {
    const plan = fixture<BlueprintSuiteChangePlan>(
      "examples/core.suite-change-plan.json"
    );
    const review = await createBlueprintSuiteChangeReview(
      {
        uri: "core.suite-change-plan.json",
        bytes: fixtureBytes("examples/core.suite-change-plan.json"),
        plan,
      },
      await comparison(),
      "2026-08-08"
    );

    expect(blueprintSuiteChangeReviewToMarkdown(review)).toBe(
      new TextDecoder().decode(
        fixtureBytes("examples/core.suite-change-review.md")
      )
    );
    expect(blueprintSuiteChangeReviewToMarkdown(review)).not.toMatch(
      /approved|release ready/i
    );

    const emptyReview = structuredClone(review);
    emptyReview.cases = [];
    const emptyMarkdown = blueprintSuiteChangeReviewToMarkdown(emptyReview);
    expect(emptyMarkdown).toContain("| — | — | — | — | — | — | — |");
    expect(emptyMarkdown).not.toContain("| None | matched |");

    const escapedPlan = structuredClone(plan);
    escapedPlan.owner = "**Ops** [team]";
    escapedPlan.reference = "https://example.com/change!(review)";
    const escaped = await createBlueprintSuiteChangeReview(
      planSource(escapedPlan),
      await comparison(),
      "2026-08-08"
    );
    expect(blueprintSuiteChangeReviewToMarkdown(escaped)).toContain(
      "\\*\\*Ops\\*\\* \\[team\\]"
    );
    expect(blueprintSuiteChangeReviewToMarkdown(escaped)).toContain(
      "https://example.com/change\\!\\(review\\)"
    );
  });
});
