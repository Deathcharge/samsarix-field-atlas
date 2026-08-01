import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { validateBlueprint } from "../client/src/blueprint";

const maximumBlueprintBytes = 1_048_576;
const argumentsList = process.argv.slice(2);
const jsonOutput = argumentsList.includes("--json");
const strict = argumentsList.includes("--strict");
const unknownFlags = argumentsList.filter(
  argument =>
    argument.startsWith("-") && argument !== "--json" && argument !== "--strict"
);
const inputFiles = argumentsList.filter(argument => !argument.startsWith("-"));

function terminalText(value: string): string {
  return Array.from(value, character => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || (codePoint >= 127 && codePoint <= 159)
      ? "?"
      : character;
  }).join("");
}

function failUsage(message: string): never {
  console.error(terminalText(message));
  console.error(
    "Usage: pnpm blueprint:validate <blueprint.json> [--strict] [--json]"
  );
  process.exit(2);
}

if (unknownFlags.length > 0) {
  failUsage(`Unknown option: ${unknownFlags.join(", ")}`);
}
if (inputFiles.length !== 1) {
  failUsage("Supply exactly one blueprint JSON file.");
}

const inputFile = inputFiles[0];
if (!inputFile) {
  failUsage("Supply a blueprint JSON file.");
}

const absolutePath = resolve(inputFile);
let value: unknown;

try {
  if (statSync(absolutePath).size > maximumBlueprintBytes) {
    throw new Error("Blueprint files must be 1 MiB or smaller.");
  }
  value = JSON.parse(readFileSync(absolutePath, "utf8")) as unknown;
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown read error";
  if (jsonOutput) {
    console.log(
      JSON.stringify(
        {
          status: "invalid",
          file: absolutePath,
          counts: { error: 1, warning: 0, pass: 0 },
          findings: [
            {
              severity: "error",
              code: "IMPORT_FAILED",
              path: "$",
              message,
            },
          ],
        },
        null,
        2
      )
    );
  } else {
    console.error(`INVALID ${terminalText(absolutePath)}`);
    console.error(`ERROR IMPORT_FAILED $ ${message}`);
  }
  process.exit(1);
}

const analysis = validateBlueprint(value);
const strictFailure = strict && analysis.counts.warning > 0;

if (jsonOutput) {
  console.log(
    JSON.stringify(
      {
        status:
          strictFailure && analysis.status === "review"
            ? "invalid"
            : analysis.status,
        file: absolutePath,
        strict,
        counts: analysis.counts,
        metrics: analysis.metrics,
        findings: analysis.findings,
      },
      null,
      2
    )
  );
} else {
  const displayStatus = strictFailure
    ? "INVALID (strict warnings)"
    : analysis.status.toUpperCase();
  console.log(`${displayStatus} ${terminalText(absolutePath)}`);
  console.log(
    `${analysis.counts.error} errors · ${analysis.counts.warning} warnings · ${analysis.counts.pass} passed checks`
  );
  for (const finding of analysis.findings) {
    console.log(
      `${finding.severity.toUpperCase()} ${finding.code} ${terminalText(finding.path)} ${terminalText(finding.message)}`
    );
  }
}

if (analysis.status === "invalid" || strictFailure) {
  process.exitCode = 1;
}
