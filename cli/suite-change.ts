import { basename, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";

import { blueprintSuiteChangeReviewToMarkdown } from "../client/src/suite-change-reporting";
import {
  createBlueprintSuiteChangeReview,
  maximumSuiteChangePlanBytes,
  validateBlueprintSuiteChangePlan,
  type BlueprintSuiteChangeReview,
} from "../client/src/suite-change";
import {
  createBlueprintSuiteDiff,
  maximumSuiteReportBytes,
  validateBlueprintSuiteReport,
  type BlueprintSuiteReportAnalysis,
} from "../client/src/suite-diff";
import {
  readFileWithLimit,
  readJsonFileWithBytes,
  terminalText,
} from "./shared";

type OutputFormat = "json" | "markdown";

interface ParsedArguments {
  asOf?: string;
  planFile?: string;
  checkFile?: string;
  format: OutputFormat;
  inputFiles: string[];
  error?: string;
}

function parseArguments(argumentsToParse: string[]): ParsedArguments {
  const parsed: ParsedArguments = { format: "json", inputFiles: [] };
  const seen = new Set<string>();
  for (let index = 0; index < argumentsToParse.length; index += 1) {
    const argument = argumentsToParse[index]!;
    if (["--as-of", "--plan", "--check", "--format"].includes(argument)) {
      const value = argumentsToParse[index + 1];
      if (seen.has(argument)) parsed.error = `Duplicate ${argument} option.`;
      seen.add(argument);
      if (!value || value.startsWith("-")) {
        parsed.error = `${argument} requires a value.`;
        continue;
      }
      index += 1;
      if (argument === "--as-of") parsed.asOf = value;
      if (argument === "--plan") parsed.planFile = value;
      if (argument === "--check") parsed.checkFile = value;
      if (argument === "--format") {
        if (value !== "json" && value !== "markdown") {
          parsed.error = `Unsupported output format: ${value}`;
        } else {
          parsed.format = value;
        }
      }
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

function failUsage(message: string): number {
  console.error(terminalText(message));
  console.error(
    "Usage: pnpm blueprint:suite-change <baseline.report.json> <candidate.report.json> --plan <change-plan.json> --as-of <YYYY-MM-DD> [--format json|markdown] [--check <expected-output>]"
  );
  return 2;
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

function renderReview(
  review: BlueprintSuiteChangeReview,
  format: OutputFormat
): string {
  return format === "markdown"
    ? blueprintSuiteChangeReviewToMarkdown(review)
    : `${JSON.stringify(review, null, 2)}\n`;
}

async function main(): Promise<number> {
  const parsed = parseArguments(process.argv.slice(2));
  if (parsed.error) return failUsage(parsed.error);
  if (parsed.inputFiles.length !== 2) {
    return failUsage("Supply exactly one baseline and one candidate report.");
  }
  if (!parsed.planFile) return failUsage("Supply --plan <change-plan.json>.");
  if (!parsed.asOf) return failUsage("Supply --as-of <YYYY-MM-DD>.");
  const baselineInput = parsed.inputFiles[0]!;
  const candidateInput = parsed.inputFiles[1]!;
  const baselinePath = resolve(baselineInput);
  const candidatePath = resolve(candidateInput);
  const planPath = resolve(parsed.planFile);

  try {
    const baselineFile = readJsonFileWithBytes(
      baselinePath,
      maximumSuiteReportBytes
    );
    const candidateFile = readJsonFileWithBytes(
      candidatePath,
      maximumSuiteReportBytes
    );
    const planFile = readJsonFileWithBytes(
      planPath,
      maximumSuiteChangePlanBytes
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
    const planAnalysis = validateBlueprintSuiteChangePlan(planFile.value);
    if (!planAnalysis.plan) {
      console.error(`INVALID plan ${terminalText(planPath)}`);
      for (const finding of planAnalysis.findings) {
        console.error(
          `${finding.severity.toUpperCase()} ${finding.code} ${terminalText(finding.path)} ${terminalText(finding.message)}`
        );
      }
      return 1;
    }

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
      }
    );
    const review = await createBlueprintSuiteChangeReview(
      {
        uri: basename(planPath),
        bytes: planFile.bytes,
        plan: planAnalysis.plan,
      },
      diff,
      parsed.asOf
    );
    const rendered = renderReview(review, parsed.format);

    if (parsed.checkFile) {
      const checkPath = resolve(parsed.checkFile);
      const matches =
        parsed.format === "json"
          ? isDeepStrictEqual(
              review,
              readJsonFileWithBytes(checkPath, maximumSuiteReportBytes).value
            )
          : rendered ===
            new TextDecoder("utf-8", { fatal: true }).decode(
              readFileWithLimit(checkPath, maximumSuiteReportBytes)
            );
      if (!matches) {
        console.error(
          `MISMATCH ${terminalText(checkPath)} does not match the generated ${parsed.format} declared change review.`
        );
        return 1;
      }
      console.error(
        `MATCH ${terminalText(checkPath)} matches the ${parsed.format} declared change review; status is ${review.summary.status} and intent gate is ${review.summary.gate}.`
      );
    } else {
      process.stdout.write(rendered);
    }
    return review.summary.gate === "pass" ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`INVALID ${terminalText(message)}`);
    return 1;
  }
}

process.exitCode = await main();
