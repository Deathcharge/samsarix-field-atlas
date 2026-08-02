import { isDeepStrictEqual } from "node:util";
import { resolve } from "node:path";

import { validateBlueprint } from "../client/src/blueprint";
import { createBlueprintSarif } from "../client/src/sarif";
import { readJsonFile, terminalText } from "./shared";

const argumentsList = process.argv.slice(2);
const jsonOutput = argumentsList.includes("--json");
const sarifOutput = argumentsList.includes("--sarif");
const strict = argumentsList.includes("--strict");
const checkIndex = argumentsList.indexOf("--check");
const checkFile = checkIndex >= 0 ? argumentsList[checkIndex + 1] : undefined;
const unknownFlags = argumentsList.filter(
  argument =>
    argument.startsWith("-") &&
    argument !== "--json" &&
    argument !== "--sarif" &&
    argument !== "--strict" &&
    argument !== "--check"
);
const inputFiles = argumentsList.filter(
  (argument, index) =>
    !argument.startsWith("-") && (checkIndex < 0 || index !== checkIndex + 1)
);

function failUsage(message: string): number {
  console.error(terminalText(message));
  console.error(
    "Usage: pnpm blueprint:validate <blueprint.json> [--strict] [--json|--sarif [--check <expected.sarif.json>]]"
  );
  return 2;
}

async function main(): Promise<number> {
  if (unknownFlags.length > 0) {
    return failUsage(`Unknown option: ${unknownFlags.join(", ")}`);
  }
  if (jsonOutput && sarifOutput) {
    return failUsage("--json and --sarif are mutually exclusive.");
  }
  if (
    checkIndex >= 0 &&
    (!sarifOutput || !checkFile || checkFile.startsWith("-"))
  ) {
    return failUsage("--check requires --sarif and one expected SARIF file.");
  }
  if (inputFiles.length !== 1) {
    return failUsage("Supply exactly one blueprint JSON file.");
  }

  const inputFile = inputFiles[0];
  if (!inputFile) {
    return failUsage("Supply a blueprint JSON file.");
  }

  const absolutePath = resolve(inputFile);
  let value: unknown;

  try {
    value = readJsonFile(absolutePath);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown read error";
    const failedAnalysis = {
      status: "invalid" as const,
      counts: { error: 1, warning: 0, pass: 0 },
      findings: [
        {
          severity: "error" as const,
          code: "IMPORT_FAILED",
          path: "$",
          message,
        },
      ],
    };
    if (sarifOutput) {
      console.log(
        JSON.stringify(
          await createBlueprintSarif(failedAnalysis, {
            artifactUri: inputFile,
            strict,
            executionSuccessful: false,
            commandLine: `blueprint:validate ${inputFile}${strict ? " --strict" : ""} --sarif`,
          }),
          null,
          2
        )
      );
    } else if (jsonOutput) {
      console.log(
        JSON.stringify(
          {
            status: "invalid",
            file: absolutePath,
            counts: failedAnalysis.counts,
            findings: failedAnalysis.findings,
          },
          null,
          2
        )
      );
    } else {
      console.error(`INVALID ${terminalText(absolutePath)}`);
      console.error(`ERROR IMPORT_FAILED $ ${terminalText(message)}`);
    }
    return 1;
  }

  const analysis = validateBlueprint(value);
  const strictFailure = strict && analysis.counts.warning > 0;

  if (sarifOutput) {
    const report = await createBlueprintSarif(analysis, {
      artifactUri: inputFile,
      strict,
      commandLine: `blueprint:validate ${inputFile}${strict ? " --strict" : ""} --sarif`,
    });
    if (checkFile) {
      try {
        const expected = readJsonFile(checkFile);
        if (!isDeepStrictEqual(report, expected)) {
          console.error(
            `MISMATCH ${terminalText(resolve(checkFile))} does not match the generated SARIF report.`
          );
          return 1;
        }
        console.error(
          `READY ${terminalText(resolve(checkFile))} matches the generated SARIF report.`
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`INVALID ${terminalText(message)}`);
        return 1;
      }
    } else {
      console.log(JSON.stringify(report, null, 2));
    }
  } else if (jsonOutput) {
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

  return analysis.status === "invalid" || strictFailure ? 1 : 0;
}

process.exitCode = await main();
