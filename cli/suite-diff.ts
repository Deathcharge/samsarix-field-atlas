import { basename, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";

import {
  createBlueprintSuiteDiff,
  maximumSuiteReportBytes,
  validateBlueprintSuiteReport,
} from "../client/src/suite-diff";
import { readJsonFileWithBytes, terminalText } from "./shared";

const argumentsList = process.argv.slice(2);
const failOnChange = argumentsList.includes("--fail-on-change");
const checkIndex = argumentsList.indexOf("--check");
const checkFile = checkIndex >= 0 ? argumentsList[checkIndex + 1] : undefined;
const unknownFlags = argumentsList.filter(
  argument =>
    argument.startsWith("-") &&
    argument !== "--fail-on-change" &&
    argument !== "--check"
);
const inputFiles = argumentsList.filter(
  (argument, index) =>
    !argument.startsWith("-") && (checkIndex < 0 || index !== checkIndex + 1)
);

function failUsage(message: string): number {
  console.error(terminalText(message));
  console.error(
    "Usage: pnpm blueprint:suite-diff <baseline.report.json> <candidate.report.json> [--fail-on-change] [--check <expected.diff.json>]"
  );
  return 2;
}

function reportProblem(
  label: "baseline" | "candidate",
  path: string,
  value: unknown
): ReturnType<typeof validateBlueprintSuiteReport> {
  const analysis = validateBlueprintSuiteReport(value);
  if (!analysis.report) {
    console.error(`INVALID ${label} ${terminalText(path)}`);
    for (const finding of analysis.findings) {
      console.error(
        `${finding.severity.toUpperCase()} ${finding.code} ${terminalText(finding.path)} ${terminalText(finding.message)}`
      );
    }
  }
  return analysis;
}

async function main(): Promise<number> {
  if (unknownFlags.length > 0) {
    return failUsage(`Unknown option: ${unknownFlags.join(", ")}`);
  }
  if (checkIndex >= 0 && (!checkFile || checkFile.startsWith("-"))) {
    return failUsage("--check requires one expected suite diff file.");
  }
  if (inputFiles.length !== 2) {
    return failUsage("Supply exactly one baseline and one candidate report.");
  }
  const baselineInput = inputFiles[0];
  const candidateInput = inputFiles[1];
  if (!baselineInput || !candidateInput) {
    return failUsage("Supply one baseline and one candidate report.");
  }
  const baselinePath = resolve(baselineInput);
  const candidatePath = resolve(candidateInput);

  try {
    const baselineFile = readJsonFileWithBytes(
      baselinePath,
      maximumSuiteReportBytes
    );
    const candidateFile = readJsonFileWithBytes(
      candidatePath,
      maximumSuiteReportBytes
    );
    const baselineAnalysis = reportProblem(
      "baseline",
      baselinePath,
      baselineFile.value
    );
    const candidateAnalysis = reportProblem(
      "candidate",
      candidatePath,
      candidateFile.value
    );
    if (!baselineAnalysis.report || !candidateAnalysis.report) return 1;

    const diff = await createBlueprintSuiteDiff(
      {
        uri: basename(baselinePath),
        bytes: baselineFile.bytes,
        report: baselineAnalysis.report,
      },
      {
        uri: basename(candidatePath),
        bytes: candidateFile.bytes,
        report: candidateAnalysis.report,
      },
      failOnChange
    );

    if (checkFile) {
      const expected = readJsonFileWithBytes(
        checkFile,
        maximumSuiteReportBytes
      ).value;
      if (!isDeepStrictEqual(diff, expected)) {
        console.error(
          `MISMATCH ${terminalText(resolve(checkFile))} does not match the generated suite diff.`
        );
        return 1;
      }
      console.error(
        `MATCH ${terminalText(resolve(checkFile))} matches ${diff.summary.cases.total} compared cases; outcome is ${diff.summary.outcome} and gate is ${diff.summary.gate}.`
      );
    } else {
      console.log(JSON.stringify(diff, null, 2));
    }
    return diff.summary.gate === "fail" ? 1 : 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`INVALID ${terminalText(message)}`);
    return 1;
  }
}

process.exitCode = await main();
