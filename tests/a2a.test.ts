import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  a2aHandoffToMarkdown,
  defaultA2ADeploymentProfile,
  validateA2ADeployment,
  type A2ADeploymentProfile,
} from "../client/src/a2a";
import type { Blueprint } from "../client/src/blueprint";

function readFixture<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(path), "utf8")) as T;
}

function incidentBlueprint(): Blueprint {
  return readFixture<Blueprint>("examples/incident.blueprint.json");
}

function validProfile(blueprint = incidentBlueprint()): A2ADeploymentProfile {
  return {
    ...defaultA2ADeploymentProfile(blueprint),
    agentName: "Incident Coordination Agent",
    endpoint: "https://agent.example.com/a2a",
    providerOrganization: "Samsarix LLC",
    providerUrl: "https://samsarix.com",
  };
}

describe("A2A deployment handoff", () => {
  it("maps the incident blueprint to the committed A2A 1.0 draft", () => {
    const blueprint = incidentBlueprint();
    const analysis = validateA2ADeployment(blueprint, validProfile(blueprint));
    const expected = readFixture<unknown>(
      "examples/incident.a2a-agent-card.json"
    );

    expect(analysis.status).toBe("ready");
    expect(analysis.agentCard).toEqual(expected);
    expect(analysis.metrics).toEqual({
      mappedSkills: 1,
      sourceStages: 8,
      humanGates: 1,
      evidenceArtifacts: 8,
    });
    expect(JSON.stringify(analysis.agentCard)).not.toMatch(
      /password|api.?key|access.?token/i
    );
  });

  it("does not infer provider ownership or bearer token format", () => {
    const blueprint = incidentBlueprint();
    const analysis = validateA2ADeployment(blueprint, {
      ...defaultA2ADeploymentProfile(blueprint),
      endpoint: "https://agent.example.com/a2a",
    });

    expect(analysis.status).toBe("ready");
    expect(analysis.agentCard?.provider).toBeUndefined();
    expect(
      analysis.agentCard?.securitySchemes?.bearerAuth.httpAuthSecurityScheme
    ).toEqual({
      description:
        "Bearer credentials are obtained out of band; no secret is embedded in this Agent Card.",
      scheme: "Bearer",
    });
  });

  it.each([
    ["http://agent.example.com/a2a", "INSECURE_A2A_ENDPOINT"],
    ["https://user:secret@agent.example.com/a2a", "CREDENTIALS_IN_ENDPOINT"],
    ["https://agent.example.com/a2a#task", "ENDPOINT_FRAGMENT"],
  ])("blocks an unsafe endpoint %s", (endpoint, code) => {
    const blueprint = incidentBlueprint();
    const analysis = validateA2ADeployment(blueprint, {
      ...validProfile(blueprint),
      endpoint,
    });

    expect(analysis.status).toBe("invalid");
    expect(analysis.agentCard).toBeUndefined();
    expect(analysis.findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code })])
    );
  });

  it("keeps local HTTP and public high-risk access visible as review decisions", () => {
    const blueprint = incidentBlueprint();
    const analysis = validateA2ADeployment(blueprint, {
      ...validProfile(blueprint),
      endpoint: "http://localhost:8080/a2a?profile=dev",
      securityPosture: "public",
    });

    expect(analysis.status).toBe("review");
    expect(analysis.agentCard?.securitySchemes).toBeUndefined();
    expect(analysis.findings.map(finding => finding.code)).toEqual(
      expect.arrayContaining([
        "LOOPBACK_ENDPOINT",
        "ENDPOINT_QUERY",
        "PUBLIC_SECURITY_POSTURE",
      ])
    );
  });

  it("validates versions, media modes, and provider identity together", () => {
    const blueprint = incidentBlueprint();
    const analysis = validateA2ADeployment(blueprint, {
      ...validProfile(blueprint),
      agentVersion: "version one",
      inputMode: "json",
      outputMode: "application/json; charset=utf-8",
      providerUrl: "",
    });

    expect(analysis.status).toBe("invalid");
    expect(analysis.findings.map(finding => finding.code)).toEqual(
      expect.arrayContaining([
        "INVALID_AGENT_VERSION",
        "INVALID_INPUT_MODE",
        "INVALID_OUTPUT_MODE",
        "INCOMPLETE_PROVIDER",
      ])
    );
  });

  it("accepts a semantic prerelease/build version and rejects unsafe provider URLs", () => {
    const blueprint = incidentBlueprint();
    const valid = validateA2ADeployment(blueprint, {
      ...validProfile(blueprint),
      agentVersion: "1.2.3-rc.1+build.9",
    });
    const unsafeProvider = validateA2ADeployment(blueprint, {
      ...validProfile(blueprint),
      providerUrl: "https://user:secret@samsarix.com/#profile",
    });

    expect(valid.status).toBe("ready");
    expect(unsafeProvider.status).toBe("invalid");
    expect(unsafeProvider.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_PROVIDER_URL" }),
      ])
    );
  });

  it("refuses to map a structurally invalid source blueprint", () => {
    const blueprint = incidentBlueprint();
    blueprint.scenario.title = "";
    const analysis = validateA2ADeployment(blueprint, validProfile(blueprint));

    expect(analysis.status).toBe("invalid");
    expect(analysis.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_SOURCE_BLUEPRINT" }),
      ])
    );
  });

  it("produces an escaped checklist with explicit proof boundaries", () => {
    const blueprint = incidentBlueprint();
    blueprint.scenario.title =
      "Incident\n# injected [link](https://bad.invalid)";
    const profile = {
      ...validProfile(blueprint),
      agentName: "Owner <draft>",
    };
    const analysis = validateA2ADeployment(blueprint, profile);
    const markdown = a2aHandoffToMarkdown(
      blueprint,
      profile,
      analysis,
      "2026-08-01T12:00:00.000Z"
    );

    expect(markdown).toContain("not proof of a deployed");
    expect(markdown).toContain("official A2A Inspector or Technology");
    expect(markdown).toContain("remain authoritative in the source blueprint");
    expect(markdown).toContain("Owner \\<draft\\>");
    expect(markdown).not.toContain("\n# injected");
  });

  it("does not create a checklist for an invalid profile", () => {
    const blueprint = incidentBlueprint();
    const profile = defaultA2ADeploymentProfile(blueprint);

    expect(() => a2aHandoffToMarkdown(blueprint, profile)).toThrow(
      /invalid deployment profile/i
    );
  });
});
