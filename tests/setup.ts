import "@testing-library/jest-dom/vitest";

import { Buffer } from "node:buffer";
import { webcrypto } from "node:crypto";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

function nativeBuffer(data: BufferSource): Buffer {
  const view = ArrayBuffer.isView(data)
    ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    : new Uint8Array(data);
  return Buffer.from(Array.from(view));
}

const testCrypto = {
  subtle: {
    digest: (algorithm: AlgorithmIdentifier, data: BufferSource) =>
      webcrypto.subtle.digest(algorithm, nativeBuffer(data)),
  },
} as unknown as Crypto;

Object.defineProperty(globalThis, "crypto", {
  configurable: true,
  value: testCrypto,
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();

  if (typeof window !== "undefined") {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/");
  }
});

if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation(query => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
    writable: true,
  });
}
