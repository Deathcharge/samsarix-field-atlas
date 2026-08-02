import { describe, expect, it } from "vitest";

import {
  maximumBlueprintBytes,
  readBlueprintFile,
} from "../client/src/blueprint-file";

function fileWithBytes(bytes: Uint8Array, name = "blueprint.json"): File {
  const stableBytes = new Uint8Array(bytes.byteLength);
  stableBytes.set(bytes);
  const file = new File([stableBytes.buffer], name, {
    type: "application/json",
  });
  Object.defineProperty(file, "arrayBuffer", {
    configurable: true,
    value: async () => stableBytes.buffer.slice(0),
  });
  return file;
}

describe("blueprint file reading", () => {
  it("parses valid UTF-8 JSON and preserves exact bytes", async () => {
    const bytes = new TextEncoder().encode('{"value":1}\n');
    const result = await readBlueprintFile(fileWithBytes(bytes));

    expect(result).toEqual({
      ok: true,
      bytes,
      value: { value: 1 },
    });
  });

  it("rejects oversized, invalid, and unreadable files distinctly", async () => {
    const oversized = new File(
      [new ArrayBuffer(maximumBlueprintBytes + 1)],
      "large.json"
    );
    const invalidBytes = Uint8Array.from([0xff, 0xfe]);
    const unreadable = fileWithBytes(new Uint8Array(), "unreadable.json");
    Object.defineProperty(unreadable, "arrayBuffer", {
      configurable: true,
      value: async () => Promise.reject(new Error("read failed")),
    });

    await expect(readBlueprintFile(oversized)).resolves.toEqual({
      ok: false,
      reason: "too-large",
    });
    await expect(
      readBlueprintFile(fileWithBytes(invalidBytes))
    ).resolves.toEqual({
      ok: false,
      reason: "invalid-json",
      bytes: invalidBytes,
    });
    await expect(readBlueprintFile(unreadable)).resolves.toEqual({
      ok: false,
      reason: "read-failed",
    });
  });

  it("accepts an explicit bounded limit for larger JSON artifact types", async () => {
    const bytes = new TextEncoder().encode('{"artifact":"suite-report"}');
    const file = fileWithBytes(bytes, "suite-report.json");

    await expect(readBlueprintFile(file, bytes.byteLength)).resolves.toEqual({
      ok: true,
      bytes,
      value: { artifact: "suite-report" },
    });
    await expect(
      readBlueprintFile(file, bytes.byteLength - 1)
    ).resolves.toEqual({ ok: false, reason: "too-large" });
  });
});
