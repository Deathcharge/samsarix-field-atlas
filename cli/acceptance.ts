import { isDeepStrictEqual } from "node:util";
import { resolve } from "node:path";

import { validateA2AAcceptance } from "../client/src/acceptance";
import { failUsage, readBlueprint, readJsonFile, terminalText } from "./shared";

interface CliOptions {
  blueprintFile: string;
  agentCardFile: string;
  profileFile: string;
  generatedAt: string;
  strict: boolean;
  checkFile?: string;
}

const valueFlags = new Set([
  "--agent-card",
  "--profile",
  "--generated-at",
  "--check",
]);

function parseArguments(argumentsList: string[]): CliOptions {
  const values = new Map<string, string>();
  const positional: string[] = [];
  let strict = false;

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (!argument) continue;
    if (argument === "--strict") {
      strict = true;
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
  const agentCardFile = values.get("--agent-card");
  const profileFile = values.get("--profile");
  const generatedAt = values.get("--generated-at");
  if (!agentCardFile || !profileFile || !generatedAt) {
    failUsage("--agent-card, --profile, and --generated-at are required.");
  }

  return {
    blueprintFile: positional[0] ?? "",
    agentCardFile,
    profileFile,
    generatedAt,
    strict,
    ...(values.has("--check") ? { checkFile: values.get("--check") } : {}),
  };
}

function usage(): string {
  return [
    "Usage: pnpm blueprint:acceptance <blueprint.json> --agent-card <card.json> --profile <profile.json> --generated-at <ISO> [options]",
    "Options: --strict --check <expected.json>",
    "Output: deterministic JSON acceptance manifest on stdout; diagnostics on stderr.",
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
    const agentCard = readJsonFile(options.agentCardFile);
    const profile = readJsonFile(options.profileFile);
    const analysis = validateA2AAcceptance(
      blueprint,
      agentCard,
      profile,
      options.generatedAt
    );

    for (const finding of analysis.findings) {
      console.error(
        `${finding.severity.toUpperCase()} ${finding.code} ${terminalText(finding.path)} ${terminalText(finding.message)}`
      );
    }
    if (!analysis.manifest || analysis.status === "invalid") {
      return 1;
    }
    if (options.strict && analysis.status === "review") {
      console.error("INVALID Strict mode rejects acceptance-plan warnings.");
      return 1;
    }

    if (options.checkFile) {
      const expected = readJsonFile(options.checkFile);
      if (!isDeepStrictEqual(analysis.manifest, expected)) {
        console.error(
          `MISMATCH ${terminalText(resolve(options.checkFile))} does not match the generated acceptance plan.`
        );
        return 1;
      }
      console.error(
        `READY ${terminalText(resolve(options.checkFile))} matches the generated acceptance plan.`
      );
      return 0;
    }

    process.stdout.write(`${JSON.stringify(analysis.manifest, null, 2)}\n`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`INVALID ${terminalText(message)}`);
    return 1;
  }
}

process.exitCode = main();
