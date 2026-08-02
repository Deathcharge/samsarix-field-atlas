import { closeSync, fstatSync, openSync, readSync } from "node:fs";
import { resolve } from "node:path";

import { validateBlueprint, type Blueprint } from "../client/src/blueprint";

export const maximumJsonBytes = 1_048_576;

export interface JsonFileContents {
  value: unknown;
  bytes: Uint8Array;
}

export function terminalText(value: string): string {
  return value.replaceAll(/\p{C}/gu, "?");
}

export function failUsage(message: string): never {
  throw new Error(`USAGE: ${message}`);
}

export function readFileWithLimit(
  path: string,
  maximumBytes = maximumJsonBytes
): Uint8Array {
  const absolutePath = resolve(path);
  const descriptor = openSync(absolutePath, "r");
  try {
    const status = fstatSync(descriptor);
    if (!status.isFile()) {
      throw new Error(`${absolutePath} is not a regular file.`);
    }
    if (status.size > maximumBytes) {
      throw new Error(
        `${absolutePath} exceeds the ${maximumBytes} byte JSON input limit.`
      );
    }

    const buffer = Buffer.allocUnsafe(status.size + 1);
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
    if (bytesRead > status.size) {
      throw new Error(`${absolutePath} changed while it was being read.`);
    }
    if (bytesRead > maximumBytes) {
      throw new Error(
        `${absolutePath} exceeds the ${maximumBytes} byte JSON input limit.`
      );
    }
    return Uint8Array.from(buffer.subarray(0, bytesRead));
  } finally {
    closeSync(descriptor);
  }
}

export function readJsonFileWithBytes(
  path: string,
  maximumBytes = maximumJsonBytes
): JsonFileContents {
  const bytes = readFileWithLimit(path, maximumBytes);
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  return { value: JSON.parse(text) as unknown, bytes };
}

export function readJsonFile(path: string): unknown {
  return readJsonFileWithBytes(path).value;
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
