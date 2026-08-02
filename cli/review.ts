import { resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";

import { sha256Hex } from "../client/src/evidence";
import { canonicalJson, validateA2AReviewLedger } from "../client/src/review";
import { failUsage, readJsonFile, terminalText } from "./shared";

interface CliOptions {
  acceptancePlanFile: string;
  tckReceiptFile: string;
  profileFile: string;
  generatedAt: string;
  strict: boolean;
  checkFile?: string;
}

const valueFlags = new Set([
  "--tck-receipt",
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
    failUsage("Supply exactly one A2A acceptance manifest JSON file.");
  }
  const tckReceiptFile = values.get("--tck-receipt");
  const profileFile = values.get("--profile");
  const generatedAt = values.get("--generated-at");
  if (!tckReceiptFile || !profileFile || !generatedAt) {
    failUsage("--tck-receipt, --profile, and --generated-at are required.");
  }

  return {
    acceptancePlanFile: positional[0] ?? "",
    tckReceiptFile,
    profileFile,
    generatedAt,
    strict,
    ...(values.has("--check") ? { checkFile: values.get("--check") } : {}),
  };
}

function usage(): string {
  return [
    "Usage: pnpm blueprint:review <acceptance.json> --tck-receipt <receipt.json> --profile <profile.json> --generated-at <ISO> [options]",
    "Options: --strict --check <expected.json>",
    "Output: deterministic owner-asserted review ledger on stdout; diagnostics on stderr.",
  ].join("\n");
}

async function main(): Promise<number> {
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
    const acceptancePlan = readJsonFile(options.acceptancePlanFile);
    const tckReceipt = readJsonFile(options.tckReceiptFile);
    const profile = readJsonFile(options.profileFile);
    const encoder = new TextEncoder();
    const [planDigest, receiptDigest] = await Promise.all([
      sha256Hex(encoder.encode(canonicalJson(acceptancePlan))),
      sha256Hex(encoder.encode(canonicalJson(tckReceipt))),
    ]);
    const analysis = validateA2AReviewLedger(
      acceptancePlan,
      tckReceipt,
      profile,
      options.generatedAt,
      planDigest,
      receiptDigest
    );

    for (const finding of analysis.findings) {
      console.error(
        `${finding.severity.toUpperCase()} ${finding.code} ${terminalText(finding.path)} ${terminalText(finding.message)}`
      );
    }
    if (!analysis.ledger || analysis.status === "invalid") {
      return 1;
    }
    if (options.strict && analysis.status === "review") {
      console.error("INVALID Strict mode rejects review-ledger warnings.");
      return 1;
    }

    if (options.checkFile) {
      const expected = readJsonFile(options.checkFile);
      if (!isDeepStrictEqual(analysis.ledger, expected)) {
        console.error(
          `MISMATCH ${terminalText(resolve(options.checkFile))} does not match the generated A2A review ledger.`
        );
        return 1;
      }
      console.error(
        `READY ${terminalText(resolve(options.checkFile))} matches the generated A2A review ledger.`
      );
      return 0;
    }

    process.stdout.write(`${JSON.stringify(analysis.ledger, null, 2)}\n`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`INVALID ${terminalText(message)}`);
    return 1;
  }
}

process.exitCode = await main();
