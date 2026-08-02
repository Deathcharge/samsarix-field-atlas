import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import type { A2AAcceptanceManifest } from "../client/src/acceptance";
import { sha256Hex, type A2ATckEvidenceReceipt } from "../client/src/evidence";
import {
  a2aReviewLedgerToMarkdown,
  canonicalJson,
  validateA2AReviewLedger,
  type A2AReviewLedger,
  type A2AReviewProfile,
} from "../client/src/review";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const generatedAt = "2026-08-01T14:10:00.000Z";

function readFixture<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(repositoryRoot, path), "utf8")) as T;
}

function fixtures(): {
  plan: A2AAcceptanceManifest;
  receipt: A2ATckEvidenceReceipt;
  profile: A2AReviewProfile;
  expected: A2AReviewLedger;
} {
  return {
    plan: readFixture<A2AAcceptanceManifest>(
      "examples/incident.a2a-acceptance.json"
    ),
    receipt: readFixture<A2ATckEvidenceReceipt>(
      "examples/incident.a2a-tck-receipt.json"
    ),
    profile: readFixture<A2AReviewProfile>(
      "examples/incident.a2a-review-profile.json"
    ),
    expected: readFixture<A2AReviewLedger>(
      "examples/incident.a2a-review-ledger.json"
    ),
  };
}

async function digests(plan: unknown, receipt: unknown) {
  const encoder = new TextEncoder();
  return Promise.all([
    sha256Hex(encoder.encode(canonicalJson(plan))),
    sha256Hex(encoder.encode(canonicalJson(receipt))),
  ]);
}

async function analyze(
  plan: unknown,
  receipt: unknown,
  profile: unknown,
  timestamp = generatedAt
) {
  const [planDigest, receiptDigest] = await digests(plan, receipt);
  return validateA2AReviewLedger(
    plan,
    receipt,
    profile,
    timestamp,
    planDigest,
    receiptDigest
  );
}

describe("A2A acceptance review ledger", () => {
  it("creates a deterministic blocked decision without authenticating assertions", async () => {
    const { plan, receipt, profile, expected } = fixtures();
    const first = await analyze(plan, receipt, profile);
    const second = await analyze(plan, receipt, profile);

    expect(first.status).toBe("review");
    expect(first.ledger).toEqual(second.ledger);
    expect(first.ledger).toEqual(expected);
    expect(first.ledger).toMatchObject({
      status: "owner-asserted-review",
      proofBoundary: {
        runtimeExecutionByFieldAtlas: "not-performed",
        sourceAuthenticationByFieldAtlas: "not-performed",
        ownerIdentityVerificationByFieldAtlas: "not-performed",
        decisionAuthority: "owner-asserted",
      },
      summary: {
        total: 22,
        accepted: 21,
        rejected: 1,
        blockingRejected: 1,
        pending: 0,
      },
      conclusion: {
        automatedReadiness: "blocked",
        releaseDecision: "rejected",
      },
    });
    expect(first.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "TCK_CAVEATS_DISPOSITIONED" }),
        expect.objectContaining({ code: "PLAN_AND_TCK_RECEIPT_BOUND" }),
        expect.objectContaining({ code: "OWNER_DECISION_RECORDED" }),
      ])
    );
  });

  it("emits a ledger that conforms to the published JSON Schema", async () => {
    const { plan, receipt, profile, expected } = fixtures();
    const schema = readFixture<object>("schema/a2a-review-ledger.schema.json");
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const conforms = ajv.compile(schema);
    const analysis = await analyze(plan, receipt, profile);

    expect(analysis.ledger).toEqual(expected);
    expect(conforms(analysis.ledger), JSON.stringify(conforms.errors)).toBe(
      true
    );
  });

  it("canonicalizes object key order before hashing", async () => {
    const first = { zebra: 1, alpha: { two: 2, one: 1 } };
    const second = { alpha: { one: 1, two: 2 }, zebra: 1 };

    expect(canonicalJson(first)).toBe(canonicalJson(second));
    expect(
      await sha256Hex(new TextEncoder().encode(canonicalJson(first)))
    ).toBe(await sha256Hex(new TextEncoder().encode(canonicalJson(second))));
  });

  it("rejects a TCK receipt that references a different acceptance plan", async () => {
    const { plan, receipt, profile } = fixtures();
    receipt.source.acceptancePlan.scenarioId = "different-scenario";
    const analysis = await analyze(plan, receipt, profile);

    expect(analysis.status).toBe("invalid");
    expect(analysis.ledger).toBeUndefined();
    expect(analysis.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "TCK_RECEIPT_PLAN_MISMATCH" }),
      ])
    );
  });

  it("independently rejects unsafe matching plan and receipt URLs", async () => {
    const { plan, receipt, profile } = fixtures();
    const unsafe = "https://reviewer:secret@agent.example.com/a2a?token=secret";
    plan.source.agentCard.interfaceUrl = unsafe;
    receipt.source.acceptancePlan.interfaceUrl = unsafe;
    const analysis = await analyze(plan, receipt, profile);

    expect(analysis.status).toBe("invalid");
    expect(analysis.ledger).toBeUndefined();
    expect(analysis.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_ACCEPTANCE_PLAN" }),
      ])
    );
    expect(JSON.stringify(analysis)).not.toContain("reviewer:secret");
  });

  it("requires exactly one review row for every planned case", async () => {
    const { plan, receipt, profile } = fixtures();
    const duplicate = structuredClone(profile.caseReviews[0]!);
    profile.caseReviews.pop();
    profile.caseReviews.push(duplicate);
    const analysis = await analyze(plan, receipt, profile);

    expect(analysis.status).toBe("invalid");
    expect(analysis.ledger).toBeUndefined();
    expect(analysis.findings.map(finding => finding.code)).toEqual(
      expect.arrayContaining(["INVALID_CASE_REVIEW", "MISSING_CASE_REVIEWS"])
    );
  });

  it("rejects approval while a blocking case is rejected", async () => {
    const { plan, receipt, profile } = fixtures();
    profile.decision = "approved";
    profile.decisionRationale =
      "This assertion must be rejected because a blocking case remains rejected.";
    const analysis = await analyze(plan, receipt, profile);

    expect(analysis.status).toBe("invalid");
    expect(analysis.ledger).toBeUndefined();
    expect(analysis.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "APPROVAL_CONTRADICTS_BLOCKING_RESULTS",
        }),
      ])
    );
  });

  it("rejects secret-bearing evidence links and unexplained exceptions", async () => {
    const { plan, receipt, profile } = fixtures();
    const authentication = profile.caseReviews.find(
      review => review.caseId === "a2a-authentication"
    )!;
    authentication.evidenceRefs = [
      "https://reviewer:secret@evidence.example.com/run?token=secret",
    ];
    authentication.rationale = null;
    const analysis = await analyze(plan, receipt, profile);

    expect(analysis.status).toBe("invalid");
    expect(analysis.ledger).toBeUndefined();
    expect(analysis.findings.map(finding => finding.code)).toEqual(
      expect.arrayContaining(["INVALID_CASE_REVIEW", "MISSING_CASE_REVIEWS"])
    );
    expect(JSON.stringify(analysis)).not.toContain("reviewer:secret");
  });

  it("requires the official TCK row to reference the exact report digest", async () => {
    const { plan, receipt, profile } = fixtures();
    const tck = profile.caseReviews.find(
      review => review.caseId === "a2a-official-tck"
    )!;
    tck.evidenceRefs = ["urn:sha256:" + "0".repeat(64)];
    const analysis = await analyze(plan, receipt, profile);

    expect(analysis.status).toBe("invalid");
    expect(analysis.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "TCK_CASE_NOT_BOUND_TO_REPORT" }),
      ])
    );
  });

  it("rejects a decision or ledger that predates its evidence chain", async () => {
    const { plan, receipt, profile } = fixtures();
    profile.decidedAt = "2026-08-01T13:59:00.000Z";
    const earlyDecision = await analyze(plan, receipt, profile);
    const earlyLedgerProfile = fixtures().profile;
    for (const review of earlyLedgerProfile.caseReviews) {
      review.reviewedAt = "2026-08-01T12:30:00.000Z";
    }
    earlyLedgerProfile.decidedAt = "2026-08-01T12:45:00.000Z";
    const earlyLedger = await analyze(
      plan,
      receipt,
      earlyLedgerProfile,
      "2026-08-01T12:59:00.000Z"
    );

    expect(earlyDecision.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DECISION_PRECEDES_CASE_REVIEW" }),
      ])
    );
    expect(earlyLedger.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "LEDGER_PREDATES_TCK_RECEIPT" }),
      ])
    );
  });

  it("permits an explicit approval only after blocking readiness is eligible", async () => {
    const { plan, receipt, profile } = fixtures();
    const authentication = profile.caseReviews.find(
      review => review.caseId === "a2a-authentication"
    )!;
    authentication.outcome = "accepted";
    authentication.rationale = null;
    profile.decision = "approved";
    profile.decisionRationale =
      "All blocking synthetic fixture cases have an owner-asserted accepted disposition.";
    const analysis = await analyze(plan, receipt, profile);

    expect(analysis.ledger?.conclusion).toEqual({
      automatedReadiness: "eligible-for-owner-decision",
      releaseDecision: "approved",
    });
    expect(analysis.ledger?.summary.blockingAccepted).toBe(14);
    expect(analysis.findings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "APPROVAL_CONTRADICTS_BLOCKING_RESULTS",
        }),
      ])
    );
  });

  it("renders escaped Markdown with the authority boundary and source digests", async () => {
    const { plan, receipt, profile } = fixtures();
    profile.reviewOwner = "Owner # forged [link](https://bad.invalid)";
    const analysis = await analyze(plan, receipt, profile);
    const markdown = a2aReviewLedgerToMarkdown(analysis.ledger!);

    expect(markdown).toContain("owner-asserted Field Atlas review record");
    expect(markdown).toContain("Acceptance plan canonical SHA-256");
    expect(markdown).toContain(
      "Owner \\# forged \\[link\\]\\(https://bad.invalid\\)"
    );
    expect(markdown).not.toContain("Owner # forged");
    expect(markdown).toContain("Automated readiness: **blocked**");
  });
});
