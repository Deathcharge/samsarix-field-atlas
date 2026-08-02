import { realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { isDeepStrictEqual } from "node:util";

import {
  createBlueprintSuiteReport,
  validateBlueprintSuiteManifest,
  type BlueprintSuiteSource,
} from "../client/src/suite";
import {
  readFileWithLimit,
  readJsonFile,
  readJsonFileWithBytes,
  terminalText,
} from "./shared";

const argumentsList = process.argv.slice(2);
const strictOverride = argumentsList.includes("--strict");
const checkIndex = argumentsList.indexOf("--check");
const checkFile = checkIndex >= 0 ? argumentsList[checkIndex + 1] : undefined;
const unknownFlags = argumentsList.filter(
  argument =>
    argument.startsWith("-") &&
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
    "Usage: pnpm blueprint:suite <suite.json> [--strict] [--check <expected.report.json>]"
  );
  return 2;
}

function containedEntryPath(manifestPath: string, entryPath: string): string {
  const root = realpathSync.native(dirname(manifestPath));
  const target = realpathSync.native(resolve(root, entryPath));
  const relation = relative(root, target);
  if (
    relation === ".." ||
    relation.startsWith(`..${sep}`) ||
    isAbsolute(relation)
  ) {
    throw new Error(`${entryPath} resolves outside the suite directory.`);
  }
  return target;
}

async function main(): Promise<number> {
  if (unknownFlags.length > 0) {
    return failUsage(`Unknown option: ${unknownFlags.join(", ")}`);
  }
  if (checkIndex >= 0 && (!checkFile || checkFile.startsWith("-"))) {
    return failUsage("--check requires one expected suite report file.");
  }
  if (inputFiles.length !== 1) {
    return failUsage("Supply exactly one suite manifest JSON file.");
  }

  const inputFile = inputFiles[0];
  if (!inputFile) return failUsage("Supply a suite manifest JSON file.");
  const manifestPath = resolve(inputFile);

  try {
    const manifestFile = readJsonFileWithBytes(manifestPath);
    const manifestAnalysis = validateBlueprintSuiteManifest(manifestFile.value);
    if (!manifestAnalysis.manifest || manifestAnalysis.status === "invalid") {
      console.error(`INVALID ${terminalText(manifestPath)}`);
      for (const finding of manifestAnalysis.findings) {
        console.error(
          `${finding.severity.toUpperCase()} ${finding.code} ${terminalText(finding.path)} ${terminalText(finding.message)}`
        );
      }
      return 1;
    }
    const strict = strictOverride || manifestAnalysis.manifest.strict;
    const sources: BlueprintSuiteSource[] =
      manifestAnalysis.manifest.entries.map(entry => {
        try {
          const target = containedEntryPath(manifestPath, entry.path);
          const bytes = readFileWithLimit(target);
          try {
            const text = new TextDecoder("utf-8", { fatal: true }).decode(
              bytes
            );
            return {
              entryId: entry.id,
              artifactUri: entry.path,
              tags: entry.tags,
              bytes,
              value: JSON.parse(text) as unknown,
            };
          } catch {
            return {
              entryId: entry.id,
              artifactUri: entry.path,
              tags: entry.tags,
              bytes,
              importError: "The suite entry must contain valid UTF-8 JSON.",
            };
          }
        } catch {
          return {
            entryId: entry.id,
            artifactUri: entry.path,
            tags: entry.tags,
            importError:
              "The suite entry could not be read as a bounded regular file inside the manifest directory.",
          };
        }
      });
    const report = await createBlueprintSuiteReport(
      manifestAnalysis.manifest.suite,
      strict,
      sources,
      {
        uri: inputFile,
        bytes: manifestFile.bytes,
        analysis: manifestAnalysis,
      }
    );

    if (checkFile) {
      const expected = readJsonFile(checkFile);
      if (!isDeepStrictEqual(report, expected)) {
        console.error(
          `MISMATCH ${terminalText(resolve(checkFile))} does not match the generated suite report.`
        );
        return 1;
      }
      console.error(
        `MATCH ${terminalText(resolve(checkFile))} matches ${report.summary.cases.total} suite cases; status is ${report.summary.status}.`
      );
    } else {
      console.log(JSON.stringify(report, null, 2));
    }
    return report.summary.status === "invalid" ? 1 : 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`INVALID ${terminalText(message)}`);
    return 1;
  }
}

process.exitCode = await main();
