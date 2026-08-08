import { basename, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";

import {
  blueprintSuiteDiffToJUnit,
  blueprintSuiteDiffToMarkdown,
} from "../client/src/suite-diff-reporting";
import {
  createBlueprintSuiteDiff,
  maximumSuiteReportBytes,
  validateBlueprintSuiteReport,
  type BlueprintSuiteReportAnalysis,
  type BlueprintSuiteDiff,
} from "../client/src/suite-diff";
import {
  readFileWithLimit,
  readJsonFileWithBytes,
  terminalText,
} from "./shared";

const argumentsList = process.argv.slice(2);
type OutputFormat = "json" | "junit" | "markdown";

interface ParsedArguments {
  failOnChange: boolean;
  format: OutputFormat;
  checkFile?: string;
  inputFiles: string[];
  error?: string;
}

function parseArguments(argumentsToParse: string[]): ParsedArguments {
  const parsed: ParsedArguments = {
    failOnChange: false,
    format: "json",
    inputFiles: [],
  };
  let formatSeen = false;
  let checkSeen = false;

  for (let index = 0; index < argumentsToParse.length; index += 1) {
    const argument = argumentsToParse[index]!;
    if (argument === "--fail-on-change") {
      if (parsed.failOnChange)
        parsed.error = "Duplicate --fail-on-change option.";
      parsed.failOnChange = true;
      continue;
    }
    if (argument === "--format") {
      const value = argumentsToParse[index + 1];
      if (formatSeen) parsed.error = "Duplicate --format option.";
      if (!value || value.startsWith("-")) {
        parsed.error = "--format requires json, junit, or markdown.";
        continue;
      }
      index += 1;
      formatSeen = true;
      if (!(value === "json" || value === "junit" || value === "markdown")) {
        parsed.error = `Unsupported output format: ${value}`;
        continue;
      }
      parsed.format = value;
      continue;
    }
    if (argument === "--check") {
      const value = argumentsToParse[index + 1];
      if (checkSeen) parsed.error = "Duplicate --check option.";
      if (!value || value.startsWith("-")) {
        parsed.error = "--check requires one expected output file.";
        continue;
      }
      index += 1;
      checkSeen = true;
      parsed.checkFile = value;
      continue;
    }
    if (argument.startsWith("-")) {
      parsed.error = `Unknown option: ${argument}`;
      continue;
    }
    parsed.inputFiles.push(argument);
  }

  return parsed;
}

const parsedArguments = parseArguments(argumentsList);

function failUsage(message: string): number {
  console.error(terminalText(message));
  console.error(
    "Usage: pnpm blueprint:suite-diff <baseline.report.json> <candidate.report.json> [--fail-on-change] [--format json|junit|markdown] [--check <expected-output>]"
  );
  return 2;
}

function renderDiff(diff: BlueprintSuiteDiff, format: OutputFormat): string {
  if (format === "junit") return blueprintSuiteDiffToJUnit(diff);
  if (format === "markdown") return blueprintSuiteDiffToMarkdown(diff);
  return `${JSON.stringify(diff, null, 2)}\n`;
}

function analyzeReport(
  label: "baseline" | "candidate",
  path: string,
  value: unknown
): BlueprintSuiteReportAnalysis {
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
  if (parsedArguments.error) return failUsage(parsedArguments.error);
  if (parsedArguments.inputFiles.length !== 2) {
    return failUsage("Supply exactly one baseline and one candidate report.");
  }
  const baselineInput = parsedArguments.inputFiles[0];
  const candidateInput = parsedArguments.inputFiles[1];
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
    const baselineAnalysis = analyzeReport(
      "baseline",
      baselinePath,
      baselineFile.value
    );
    const candidateAnalysis = analyzeReport(
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
      parsedArguments.failOnChange
    );
    const rendered = renderDiff(diff, parsedArguments.format);

    if (parsedArguments.checkFile) {
      const checkPath = resolve(parsedArguments.checkFile);
      const matches =
        parsedArguments.format === "json"
          ? isDeepStrictEqual(
              diff,
              readJsonFileWithBytes(checkPath, maximumSuiteReportBytes).value
            )
          : rendered ===
            new TextDecoder("utf-8", { fatal: true }).decode(
              readFileWithLimit(checkPath, maximumSuiteReportBytes)
            );
      if (!matches) {
        console.error(
          `MISMATCH ${terminalText(checkPath)} does not match the generated ${parsedArguments.format} suite diff.`
        );
        return 1;
      }
      console.error(
        `MATCH ${terminalText(checkPath)} matches the ${parsedArguments.format} output for ${diff.summary.cases.total} compared cases; outcome is ${diff.summary.outcome} and gate is ${diff.summary.gate}.`
      );
    } else {
      process.stdout.write(rendered);
    }
    return diff.summary.gate === "fail" ? 1 : 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`INVALID ${terminalText(message)}`);
    return 1;
  }
}

process.exitCode = await main();
