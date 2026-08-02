import { closeSync, fstatSync, openSync, readSync } from "node:fs";
import { resolve } from "node:path";

import { validateBlueprint, type Blueprint } from "../client/src/blueprint";

export const maximumJsonBytes = 1_048_576;

export function terminalText(value: string): string {
  return value.replaceAll(/\p{C}/gu, "?");
}

export function failUsage(message: string): never {
  throw new Error(`USAGE: ${message}`);
}

export function readJsonFile(path: string): unknown {
  const absolutePath = resolve(path);
  const descriptor = openSync(absolutePath, "r");
  try {
    const status = fstatSync(descriptor);
    if (!status.isFile()) {
      throw new Error(`${absolutePath} is not a regular file.`);
    }
    if (status.size > maximumJsonBytes) {
      throw new Error(`${absolutePath} exceeds the 1 MiB JSON input limit.`);
    }

    const buffer = Buffer.allocUnsafe(maximumJsonBytes + 1);
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const count = readSync(
        descriptor,
        buffer,
        bytesRead,
        buffer.length - bytesRead,
        null
      );
      if (count === 0) break;
      bytesRead += count;
    }
    if (bytesRead > maximumJsonBytes) {
      throw new Error(`${absolutePath} exceeds the 1 MiB JSON input limit.`);
    }
    return JSON.parse(buffer.toString("utf8", 0, bytesRead)) as unknown;
  } finally {
    closeSync(descriptor);
  }
}

export function readBlueprint(path: string): Blueprint {
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
