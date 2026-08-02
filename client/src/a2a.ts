import {
  validateBlueprint,
  type Blueprint,
  type BlueprintFinding,
  type FindingSeverity,
} from "./blueprint";

export const a2aProtocolVersion = "1.0" as const;

export type A2AProtocolBinding = "JSONRPC" | "GRPC" | "HTTP+JSON";
export type A2ASecurityPosture = "bearer" | "public";

export interface A2ADeploymentProfile {
  agentName: string;
  endpoint: string;
  agentVersion: string;
  binding: A2AProtocolBinding;
  securityPosture: A2ASecurityPosture;
  inputMode: string;
  outputMode: string;
  providerOrganization: string;
  providerUrl: string;
  streaming: boolean;
  pushNotifications: boolean;
}

export interface A2AAgentCard {
  name: string;
  description: string;
  supportedInterfaces: Array<{
    url: string;
    protocolBinding: A2AProtocolBinding;
    protocolVersion: typeof a2aProtocolVersion;
  }>;
  provider?: {
    url: string;
    organization: string;
  };
  version: string;
  capabilities: {
    streaming: boolean;
    pushNotifications: boolean;
  };
  securitySchemes?: {
    bearerAuth: {
      httpAuthSecurityScheme: {
        description: string;
        scheme: "Bearer";
      };
    };
  };
  securityRequirements?: Array<{
    schemes: {
      bearerAuth: {
        list: string[];
      };
    };
  }>;
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: Array<{
    id: string;
    name: string;
    description: string;
    tags: string[];
    inputModes: string[];
    outputModes: string[];
  }>;
}

export interface A2AHandoffAnalysis {
  status: "invalid" | "review" | "ready";
  findings: BlueprintFinding[];
  counts: Record<FindingSeverity, number>;
  agentCard?: A2AAgentCard;
  metrics?: {
    mappedSkills: number;
    sourceStages: number;
    humanGates: number;
    evidenceArtifacts: number;
  };
}

const protocolBindings = new Set<A2AProtocolBinding>([
  "JSONRPC",
  "GRPC",
  "HTTP+JSON",
]);
const securityPostures = new Set<A2ASecurityPosture>(["bearer", "public"]);
const semanticVersionPattern =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const mediaTypePattern =
  /^(?:application|audio|font|image|message|model|multipart|text|video)\/[A-Za-z0-9!#$&^_.+-]+$/;
const markdownMetacharacters = /([\\`*_[\]{}()<>#+!|])/g;

function addFinding(
  findings: BlueprintFinding[],
  severity: FindingSeverity,
  code: string,
  path: string,
  message: string
) {
  findings.push({ code, severity, path, message });
}

function nonEmpty(value: string, maximum: number): boolean {
  return value.trim().length > 0 && value.length <= maximum;
}

function isLoopback(hostname: string): boolean {
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
  );
}

function parseEndpoint(
  endpoint: string,
  findings: BlueprintFinding[]
): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    addFinding(
      findings,
      "error",
      "INVALID_A2A_ENDPOINT",
      "$.profile.endpoint",
      "Supply an absolute A2A service URL."
    );
    return null;
  }

  if (parsed.username || parsed.password) {
    addFinding(
      findings,
      "error",
      "CREDENTIALS_IN_ENDPOINT",
      "$.profile.endpoint",
      "Do not embed credentials in an Agent Card URL; obtain them out of band."
    );
  }
  if (parsed.hash) {
    addFinding(
      findings,
      "error",
      "ENDPOINT_FRAGMENT",
      "$.profile.endpoint",
      "A service endpoint cannot rely on a URL fragment."
    );
  }
  if (parsed.search) {
    addFinding(
      findings,
      "warning",
      "ENDPOINT_QUERY",
      "$.profile.endpoint",
      "Confirm that query parameters are stable routing data and contain no secret."
    );
  }
  if (parsed.protocol === "https:") {
    return parsed;
  }
  if (parsed.protocol === "http:" && isLoopback(parsed.hostname)) {
    addFinding(
      findings,
      "warning",
      "LOOPBACK_ENDPOINT",
      "$.profile.endpoint",
      "Plain HTTP is acceptable only for local development; production A2A interfaces require HTTPS."
    );
    return parsed;
  }

  addFinding(
    findings,
    "error",
    "INSECURE_A2A_ENDPOINT",
    "$.profile.endpoint",
    "Use HTTPS for a production interface or HTTP only on an explicit loopback host."
  );
  return parsed;
}

function summarize(
  findings: BlueprintFinding[]
): Pick<A2AHandoffAnalysis, "status" | "counts" | "findings"> {
  const counts: Record<FindingSeverity, number> = {
    error: findings.filter(finding => finding.severity === "error").length,
    warning: findings.filter(finding => finding.severity === "warning").length,
    pass: findings.filter(finding => finding.severity === "pass").length,
  };
  return {
    status:
      counts.error > 0 ? "invalid" : counts.warning > 0 ? "review" : "ready",
    findings,
    counts,
  };
}

function createAgentCard(
  blueprint: Blueprint,
  profile: A2ADeploymentProfile
): A2AAgentCard {
  const humanGates = blueprint.runtime.requiresHumanApprovalAt.length;
  const tags = [
    "coordination",
    `${blueprint.scenario.risk}-risk`,
    "evidence-aware",
    ...(humanGates > 0 ? ["human-governed"] : []),
  ];
  const provider =
    profile.providerOrganization.trim() && profile.providerUrl.trim()
      ? {
          url: profile.providerUrl.trim(),
          organization: profile.providerOrganization.trim(),
        }
      : undefined;
  const security =
    profile.securityPosture === "bearer"
      ? {
          securitySchemes: {
            bearerAuth: {
              httpAuthSecurityScheme: {
                description:
                  "Bearer credentials are obtained out of band; no secret is embedded in this Agent Card.",
                scheme: "Bearer" as const,
              },
            },
          },
          securityRequirements: [
            {
              schemes: {
                bearerAuth: { list: [] },
              },
            },
          ],
        }
      : undefined;

  return {
    name: profile.agentName.trim(),
    description: blueprint.scenario.objective,
    supportedInterfaces: [
      {
        url: profile.endpoint.trim(),
        protocolBinding: profile.binding,
        protocolVersion: a2aProtocolVersion,
      },
    ],
    ...(provider ? { provider } : {}),
    version: profile.agentVersion.trim(),
    capabilities: {
      streaming: profile.streaming,
      pushNotifications: profile.pushNotifications,
    },
    ...(security ?? {}),
    defaultInputModes: [profile.inputMode],
    defaultOutputModes: [profile.outputMode],
    skills: [
      {
        id: blueprint.scenario.id,
        name: blueprint.scenario.title,
        description: blueprint.scenario.objective,
        tags,
        inputModes: [profile.inputMode],
        outputModes: [profile.outputMode],
      },
    ],
  };
}

export function defaultA2ADeploymentProfile(
  blueprint: Blueprint
): A2ADeploymentProfile {
  return {
    agentName: `${blueprint.scenario.title} Agent`,
    endpoint: "",
    agentVersion: "0.1.0",
    binding: "HTTP+JSON",
    securityPosture: "bearer",
    inputMode: "application/json",
    outputMode: "application/json",
    providerOrganization: "",
    providerUrl: "",
    streaming: false,
    pushNotifications: false,
  };
}

export function validateA2ADeployment(
  blueprint: Blueprint,
  profile: A2ADeploymentProfile
): A2AHandoffAnalysis {
  const findings: BlueprintFinding[] = [];
  const sourceAnalysis = validateBlueprint(blueprint);
  if (sourceAnalysis.status === "invalid") {
    addFinding(
      findings,
      "error",
      "INVALID_SOURCE_BLUEPRINT",
      "$.blueprint",
      `The source blueprint has ${sourceAnalysis.counts.error} structural errors.`
    );
  }

  if (!nonEmpty(profile.agentName, 240)) {
    addFinding(
      findings,
      "error",
      "INVALID_AGENT_NAME",
      "$.profile.agentName",
      "Supply a non-empty agent name no longer than 240 characters."
    );
  }
  parseEndpoint(profile.endpoint, findings);
  if (!semanticVersionPattern.test(profile.agentVersion)) {
    addFinding(
      findings,
      "error",
      "INVALID_AGENT_VERSION",
      "$.profile.agentVersion",
      "Use a semantic agent version such as 1.0.0 or 1.0.0-rc.1."
    );
  }
  if (!protocolBindings.has(profile.binding)) {
    addFinding(
      findings,
      "error",
      "INVALID_PROTOCOL_BINDING",
      "$.profile.binding",
      "Choose JSONRPC, GRPC, or HTTP+JSON for this A2A 1.0 profile."
    );
  }
  if (!securityPostures.has(profile.securityPosture)) {
    addFinding(
      findings,
      "error",
      "INVALID_SECURITY_POSTURE",
      "$.profile.securityPosture",
      "Choose an explicit bearer or public security posture."
    );
  }
  if (!mediaTypePattern.test(profile.inputMode)) {
    addFinding(
      findings,
      "error",
      "INVALID_INPUT_MODE",
      "$.profile.inputMode",
      "Input mode must be a media type such as application/json or text/plain."
    );
  }
  if (!mediaTypePattern.test(profile.outputMode)) {
    addFinding(
      findings,
      "error",
      "INVALID_OUTPUT_MODE",
      "$.profile.outputMode",
      "Output mode must be a media type such as application/json or text/plain."
    );
  }

  const hasProviderOrganization =
    profile.providerOrganization.trim().length > 0;
  const hasProviderUrl = profile.providerUrl.trim().length > 0;
  if (hasProviderOrganization !== hasProviderUrl) {
    addFinding(
      findings,
      "error",
      "INCOMPLETE_PROVIDER",
      "$.profile.provider",
      "Supply both provider organization and provider URL, or leave both empty."
    );
  } else if (hasProviderUrl) {
    try {
      const providerUrl = new URL(profile.providerUrl);
      if (
        providerUrl.protocol !== "https:" ||
        providerUrl.username ||
        providerUrl.password ||
        providerUrl.search ||
        providerUrl.hash
      ) {
        throw new Error("Provider URL must be a credential-free HTTPS URL.");
      }
    } catch {
      addFinding(
        findings,
        "error",
        "INVALID_PROVIDER_URL",
        "$.profile.providerUrl",
        "Provider URL must be an absolute HTTPS URL."
      );
    }
  }

  if (profile.securityPosture === "public") {
    addFinding(
      findings,
      "warning",
      "PUBLIC_SECURITY_POSTURE",
      "$.profile.securityPosture",
      sourceAnalysis.blueprint?.scenario.risk === "high"
        ? "This high-risk skill declares no authentication; require an owner decision before publication."
        : "This draft declares no authentication; confirm that public access is intentional."
    );
  }

  if (!findings.some(finding => finding.severity === "error")) {
    addFinding(
      findings,
      "pass",
      "A2A_REQUIRED_FIELDS",
      "$.agentCard",
      "The draft provides every required A2A 1.0 Agent Card field in the Field Atlas profile."
    );
    addFinding(
      findings,
      "pass",
      "SKILL_MAPPED",
      "$.agentCard.skills[0]",
      "The validated Field Atlas scenario maps to one discoverable A2A skill."
    );
    addFinding(
      findings,
      "pass",
      "NO_EMBEDDED_CREDENTIALS",
      "$.agentCard.securitySchemes",
      "The card declares a security posture without embedding a credential."
    );
    addFinding(
      findings,
      "pass",
      "RUNTIME_UNVERIFIED",
      "$.agentCard.supportedInterfaces[0]",
      "The endpoint is declared as owner input and remains explicitly unprobed."
    );
  }

  const analysis: A2AHandoffAnalysis = summarize(findings);
  if (analysis.status !== "invalid") {
    analysis.agentCard = createAgentCard(blueprint, profile);
    analysis.metrics = {
      mappedSkills: 1,
      sourceStages: blueprint.trace.length,
      humanGates: blueprint.runtime.requiresHumanApprovalAt.length,
      evidenceArtifacts: blueprint.trace.length,
    };
  }
  return analysis;
}

function markdownText(value: string): string {
  return value
    .replaceAll(/\s+/g, " ")
    .trim()
    .replace(markdownMetacharacters, "\\$1");
}

export function a2aHandoffToMarkdown(
  blueprint: Blueprint,
  profile: A2ADeploymentProfile,
  analysis = validateA2ADeployment(blueprint, profile),
  generatedAt = new Date().toISOString()
): string {
  if (!analysis.agentCard || analysis.status === "invalid") {
    throw new Error(
      "Cannot create an A2A handoff for an invalid deployment profile."
    );
  }

  const card = analysis.agentCard;
  const humanGates = blueprint.runtime.requiresHumanApprovalAt;
  return [
    `# A2A deployment handoff: ${markdownText(card.name)}`,
    "",
    "> Draft implementation handoff generated locally by Samsarix Field Atlas. This is not proof of a deployed, reachable, authenticated, signed, or A2A-conformant server.",
    "",
    "## Source contract",
    "",
    `- Blueprint: \`${blueprint.schemaVersion}\``,
    `- Scenario: ${markdownText(blueprint.scenario.title)}`,
    `- Generated: ${markdownText(generatedAt)}`,
    `- Field Atlas decision: **${analysis.status}**`,
    `- Human approval stages retained in source: ${humanGates.length > 0 ? humanGates.join(", ") : "none"}`,
    "",
    "## Draft Agent Card profile",
    "",
    `- A2A protocol: **${a2aProtocolVersion}**`,
    `- Agent version: ${markdownText(card.version)}`,
    `- Interface: ${markdownText(card.supportedInterfaces[0]?.protocolBinding ?? "unknown")} at ${markdownText(card.supportedInterfaces[0]?.url ?? "missing")}`,
    `- Security posture: ${profile.securityPosture === "bearer" ? "Bearer declaration; credentials obtained out of band" : "Public; no authentication declaration"}`,
    `- Input / output: ${markdownText(profile.inputMode)} → ${markdownText(profile.outputMode)}`,
    `- Streaming / push: ${profile.streaming ? "yes" : "no"} / ${profile.pushNotifications ? "yes" : "no"}`,
    "",
    "## Required owner evidence",
    "",
    "- [ ] Deploy an A2A 1.0 server at the declared interface URL.",
    "- [ ] Serve the public card at `/.well-known/agent-card.json` on the intended discovery domain.",
    "- [ ] Verify the declared protocol binding, media modes, streaming, and push behavior against the running service.",
    "- [ ] Implement and test the declared authentication posture without placing credentials in the card.",
    "- [ ] Validate the live implementation with the official A2A Inspector or Technology Compatibility Kit.",
    "- [ ] Preserve human approvals, policy checks, and evidence artifacts from the source blueprint in the runtime workflow.",
    "- [ ] Decide whether the card requires JWS signatures, key rotation, authenticated extended-card content, caching, and an ETag.",
    "",
    "## Core-protocol boundary",
    "",
    "A2A Agent Card fields describe discovery and interaction. Field Atlas human, policy, memory, and evidence semantics are not represented by the core Agent Card and remain authoritative in the source blueprint unless a separately specified extension is adopted.",
    "",
    "## Findings",
    "",
    ...analysis.findings.map(
      finding =>
        `- **${finding.severity.toUpperCase()} · ${finding.code}** at ${markdownText(finding.path)}: ${markdownText(finding.message)}`
    ),
    "",
  ].join("\n");
}
