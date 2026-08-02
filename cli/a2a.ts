import { isDeepStrictEqual } from "node:util";
import { resolve } from "node:path";

import {
  defaultA2ADeploymentProfile,
  validateA2ADeployment,
  type A2ADeploymentProfile,
  type A2AProtocolBinding,
  type A2ASecurityPosture,
} from "../client/src/a2a";
import { validateBlueprint, type Blueprint } from "../client/src/blueprint";
import { readJsonFile, terminalText } from "./shared";

interface CliOptions {
  blueprintFile: string;
  endpoint: string;
  agentVersion: string;
  securityPosture: A2ASecurityPosture;
  binding: A2AProtocolBinding;
  agentName?: string;
  inputMode: string;
  outputMode: string;
  providerOrganization: string;
  providerUrl: string;
  streaming: boolean;
  pushNotifications: boolean;
  strict: boolean;
  checkFile?: string;
}

const valueFlags = new Set([
  "--endpoint",
  "--agent-version",
  "--security",
  "--binding",
  "--name",
  "--input-mode",
  "--output-mode",
  "--provider-organization",
  "--provider-url",
  "--check",
]);
const booleanFlags = new Set([
  "--streaming",
  "--push-notifications",
  "--strict",
]);

function failUsage(message: string): never {
  throw new Error(`USAGE: ${message}`);
}

function parseArguments(argumentsList: string[]): CliOptions {
  const values = new Map<string, string>();
  const enabled = new Set<string>();
  const positional: string[] = [];

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (!argument) continue;

    if (booleanFlags.has(argument)) {
      enabled.add(argument);
      continue;
    }
    if (valueFlags.has(argument)) {
      const value = argumentsList[index + 1];
      if (!value || value.startsWith("--")) {
        failUsage(`${argument} requires a value.`);
      }
      values.set(argument, value);
      index += 1;
      continue;
    }
    if (argument.startsWith("-")) {
      failUsage(`Unknown option: ${argument}`);
    }
    positional.push(argument);
  }

  if (positional.length !== 1) {
    failUsage("Supply exactly one blueprint JSON file.");
  }

  const endpoint = values.get("--endpoint");
  const agentVersion = values.get("--agent-version");
  const security = values.get("--security");
  if (!endpoint || !agentVersion || !security) {
    failUsage("--endpoint, --agent-version, and --security are required.");
  }
  if (security !== "bearer" && security !== "public") {
    failUsage("--security must be bearer or public.");
  }

  const binding = values.get("--binding") ?? "HTTP+JSON";
  if (binding !== "JSONRPC" && binding !== "GRPC" && binding !== "HTTP+JSON") {
    failUsage("--binding must be JSONRPC, GRPC, or HTTP+JSON.");
  }

  return {
    blueprintFile: positional[0] ?? "",
    endpoint,
    agentVersion,
    securityPosture: security,
    binding,
    ...(values.has("--name") ? { agentName: values.get("--name") } : {}),
    inputMode: values.get("--input-mode") ?? "application/json",
    outputMode: values.get("--output-mode") ?? "application/json",
    providerOrganization: values.get("--provider-organization") ?? "",
    providerUrl: values.get("--provider-url") ?? "",
    streaming: enabled.has("--streaming"),
    pushNotifications: enabled.has("--push-notifications"),
    strict: enabled.has("--strict"),
    ...(values.has("--check") ? { checkFile: values.get("--check") } : {}),
  };
}

function readBlueprint(path: string): Blueprint {
  const analysis = validateBlueprint(readJsonFile(path));
  if (!analysis.blueprint || analysis.status === "invalid") {
    const detail = analysis.findings
      .filter(finding => finding.severity === "error")
      .map(finding => `${finding.code} ${finding.path} ${finding.message}`)
      .join("; ");
    throw new Error(`Source blueprint is invalid. ${detail}`);
  }
  return analysis.blueprint;
}

function usage(): string {
  return [
    "Usage: pnpm blueprint:a2a <blueprint.json> --endpoint <https-url> --agent-version <semver> --security <bearer|public> [options]",
    "Options: --binding <HTTP+JSON|JSONRPC|GRPC> --name <name> --input-mode <mime> --output-mode <mime>",
    "         --provider-organization <name> --provider-url <https-url> --streaming --push-notifications --strict --check <expected.json>",
  ].join("\n");
}

function main(): number {
  let options: CliOptions;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid usage.";
    console.error(terminalText(message.replace(/^USAGE: /, "")));
    console.error(usage());
    return 2;
  }

  try {
    const blueprint = readBlueprint(options.blueprintFile);
    const defaults = defaultA2ADeploymentProfile(blueprint);
    const profile: A2ADeploymentProfile = {
      ...defaults,
      endpoint: options.endpoint,
      agentVersion: options.agentVersion,
      securityPosture: options.securityPosture,
      binding: options.binding,
      agentName: options.agentName ?? defaults.agentName,
      inputMode: options.inputMode,
      outputMode: options.outputMode,
      providerOrganization: options.providerOrganization,
      providerUrl: options.providerUrl,
      streaming: options.streaming,
      pushNotifications: options.pushNotifications,
    };
    const analysis = validateA2ADeployment(blueprint, profile);

    for (const finding of analysis.findings) {
      console.error(
        `${finding.severity.toUpperCase()} ${finding.code} ${terminalText(finding.path)} ${terminalText(finding.message)}`
      );
    }
    if (!analysis.agentCard || analysis.status === "invalid") {
      return 1;
    }
    if (options.strict && analysis.status === "review") {
      console.error("INVALID Strict mode rejects deployment-profile warnings.");
      return 1;
    }

    if (options.checkFile) {
      const expected = readJsonFile(options.checkFile);
      if (!isDeepStrictEqual(analysis.agentCard, expected)) {
        console.error(
          `MISMATCH ${terminalText(resolve(options.checkFile))} does not match the generated draft Agent Card.`
        );
        return 1;
      }
      console.error(
        `READY ${terminalText(resolve(options.checkFile))} matches the generated draft Agent Card.`
      );
      return 0;
    }

    process.stdout.write(`${JSON.stringify(analysis.agentCard, null, 2)}\n`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`INVALID ${terminalText(message)}`);
    return 1;
  }
}

process.exitCode = main();
