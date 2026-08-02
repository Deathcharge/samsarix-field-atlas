import "@testing-library/jest-dom/vitest";

import { webcrypto } from "node:crypto";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: webcrypto,
  });
}

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
