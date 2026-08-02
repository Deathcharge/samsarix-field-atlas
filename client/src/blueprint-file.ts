export const maximumBlueprintBytes = 1_048_576;

export type BlueprintFileReadResult =
  | {
      ok: true;
      bytes: Uint8Array;
      value: unknown;
    }
  | {
      ok: false;
      reason: "too-large";
    }
  | {
      ok: false;
      reason: "read-failed";
    }
  | {
      ok: false;
      reason: "invalid-json";
      bytes: Uint8Array;
    };

export async function readBlueprintFile(
  file: File
): Promise<BlueprintFileReadResult> {
  if (file.size > maximumBlueprintBytes) {
    return { ok: false, reason: "too-large" };
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return { ok: false, reason: "read-failed" };
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, bytes, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, reason: "invalid-json", bytes };
  }
}
