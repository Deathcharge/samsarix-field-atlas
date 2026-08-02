import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import {
  a2aAcceptanceToMarkdown,
  defaultA2AAcceptanceProfile,
  validateA2AAcceptance,
  type A2AAcceptanceProfile,
} from "../client/src/acceptance";
import type { A2AAgentCard } from "../client/src/a2a";
import type { Blueprint } from "../client/src/blueprint";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const generatedAt = "2026-08-01T12:00:00.000Z";

function readFixture<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(repositoryRoot, path), "utf8")) as T;
}

function fixture(): {
  blueprint: Blueprint;
  card: A2AAgentCard;
  profile: A2AAcceptanceProfile;
} {
  return {
    blueprint: readFixture<Blueprint>("examples/incident.blueprint.json"),
    card: readFixture<A2AAgentCard>("examples/incident.a2a-agent-card.json"),
    profile: {
      ...defaultA2AAcceptanceProfile(),
      owner: "Incident Platform Team",
      supportContact: "support@samsarix.com",
    },
  };
}

describe("A2A acceptance contract", () => {
  it("creates a deterministic plan without claiming execution", () => {
    const { blueprint, card, profile } = fixture();
    const first = validateA2AAcceptance(blueprint, card, profile, generatedAt);
    const second = validateA2AAcceptance(blueprint, card, profile, generatedAt);

    expect(first.status).toBe("ready");
    expect(first.manifest).toEqual(second.manifest);
    expect(first.manifest).toMatchObject({
      schemaVersion: "samsarix-field-atlas/a2a-acceptance/1",
      generatedAt,
      status: "plan-not-run",
      summary: {
        testCases: 22,
        blockingCases: 14,
        officialTckCases: 1,
        humanApprovalCases: 1,
        evidenceCases: 8,
      },
    });
    expect(first.manifest?.testCases.map(testCase => testCase.id)).toEqual(
      expect.arrayContaining([
        "a2a-official-tck",
        "a2a-authentication",
        "owner-request-limit",
        "privacy-retention",
        "governance-human-approval-5",
        "evidence-stage-8",
      ])
    );
    expect(first.manifest).not.toHaveProperty("result");
    expect(JSON.stringify(first.manifest)).not.toMatch(
      /password|api.?key|access.?token/i
    );
  });

  it("keeps additive profile fields out of its schema-conformant manifest", () => {
    const { blueprint, card, profile } = fixture();
    const analysis = validateA2AAcceptance(
      blueprint,
      card,
      { ...profile, futureOwnerNote: "not interpreted by v1" },
      generatedAt
    );
    const schema = readFixture<object>("schema/a2a-acceptance.schema.json");
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const conforms = ajv.compile(schema);

    expect(analysis.status).toBe("review");
    expect(analysis.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "UNRECOGNIZED_PROFILE_FIELD" }),
      ])
    );
    expect(analysis.manifest?.acceptance).not.toHaveProperty("futureOwnerNote");
    expect(conforms(analysis.manifest), JSON.stringify(conforms.errors)).toBe(
      true
    );
  });

  it("requires the owner and validates operational boundaries together", () => {
    const { blueprint, card, profile } = fixture();
    const analysis = validateA2AAcceptance(
      blueprint,
      card,
      {
        ...profile,
        owner: "",
        supportContact: "javascript:alert(1)",
        maxRequestBytes: 0,
        responseDeadlineMs: 99,
        maxConcurrentTasks: 0,
        retentionMode: "none",
        retentionHours: 24,
      },
      generatedAt
    );

    expect(analysis.status).toBe("invalid");
    expect(analysis.manifest).toBeUndefined();
    expect(analysis.findings.map(finding => finding.code)).toEqual(
      expect.arrayContaining([
        "MISSING_ACCEPTANCE_OWNER",
        "INVALID_SUPPORT_CONTACT",
        "INVALID_REQUEST_LIMIT",
        "INVALID_RESPONSE_DEADLINE",
        "INVALID_CONCURRENCY_LIMIT",
        "INVALID_RETENTION_WINDOW",
      ])
    );
  });

  it("rejects a card that does not retain the blueprint skill or A2A version", () => {
    const { blueprint, card, profile } = fixture();
    card.skills[0]!.id = "different-skill";
    card.supportedInterfaces[0]!.protocolVersion = "0.3" as "1.0";
    const analysis = validateA2AAcceptance(
      blueprint,
      card,
      profile,
      generatedAt
    );

    expect(analysis.status).toBe("invalid");
    expect(analysis.findings.map(finding => finding.code)).toEqual(
      expect.arrayContaining([
        "SOURCE_SKILL_MISMATCH",
        "UNSUPPORTED_A2A_VERSION",
      ])
    );
  });

  it("rejects a noncanonical timestamp and unsafe card endpoint", () => {
    const { blueprint, card, profile } = fixture();
    card.supportedInterfaces[0]!.url =
      "https://user:secret@agent.example.com/a2a?token=secret";
    const analysis = validateA2AAcceptance(
      blueprint,
      card,
      profile,
      "2026-08-01T12:00:00Z"
    );

    expect(analysis.status).toBe("invalid");
    expect(analysis.findings.map(finding => finding.code)).toEqual(
      expect.arrayContaining(["INVALID_GENERATED_AT", "INVALID_A2A_INTERFACE"])
    );
  });

  it("rejects incomplete or malformed Agent Card security declarations", () => {
    const { blueprint, card, profile } = fixture();
    delete card.securityRequirements;
    const incomplete = validateA2AAcceptance(
      blueprint,
      card,
      profile,
      generatedAt
    );
    const malformedCard = fixture().card;
    malformedCard.securitySchemes!.bearerAuth.httpAuthSecurityScheme.scheme =
      "Basic" as "Bearer";
    const malformed = validateA2AAcceptance(
      blueprint,
      malformedCard,
      profile,
      generatedAt
    );

    expect(incomplete.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INCOMPLETE_AGENT_SECURITY" }),
      ])
    );
    expect(malformed.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_AGENT_SECURITY" }),
      ])
    );
  });

  it("makes high-risk production and restricted processing review decisions", () => {
    const { blueprint, card, profile } = fixture();
    const analysis = validateA2AAcceptance(
      blueprint,
      card,
      {
        ...profile,
        environment: "production",
        dataClassification: "restricted",
        externalProcessors: true,
      },
      generatedAt
    );

    expect(analysis.status).toBe("review");
    expect(analysis.manifest?.summary.testCases).toBe(23);
    expect(analysis.findings.map(finding => finding.code)).toEqual(
      expect.arrayContaining([
        "HIGH_RISK_PRODUCTION_SIGNOFF",
        "RESTRICTED_EXTERNAL_PROCESSING",
      ])
    );
    expect(analysis.manifest?.testCases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "privacy-external-processors" }),
      ])
    );
  });

  it("derives the public-access acceptance case from a public draft card", () => {
    const { blueprint, card, profile } = fixture();
    delete card.securitySchemes;
    delete card.securityRequirements;
    const analysis = validateA2AAcceptance(
      blueprint,
      card,
      profile,
      generatedAt
    );

    expect(analysis.manifest?.source.agentCard.authentication).toBe("public");
    expect(
      analysis.manifest?.testCases.find(
        testCase => testCase.id === "a2a-authentication"
      )
    ).toMatchObject({ title: "Confirm the public-access decision" });
  });

  it("renders escaped, checklist-oriented Markdown with the proof boundary", () => {
    const { blueprint, card, profile } = fixture();
    profile.owner = "Owner\n# forged [link](https://bad.invalid)";
    const analysis = validateA2AAcceptance(
      blueprint,
      card,
      profile,
      generatedAt
    );
    const markdown = a2aAcceptanceToMarkdown(analysis.manifest!);

    expect(markdown).toContain("Status: plan-not-run");
    expect(markdown).toContain("not an official A2A extension");
    expect(markdown).toContain("official A2A TCK");
    expect(markdown).toContain(
      "Owner \\# forged \\[link\\]\\(https://bad.invalid\\)"
    );
    expect(markdown).not.toContain("\n# forged");
    expect(markdown).toContain("- [ ] TCK JSON or JUnit report");
  });
});
