// @vitest-environment node

import { mkdir, rm, writeFile } from "node:fs/promises";
import { type Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { parsePort, startServer } from "../../server/index";

let fixtureDirectory: string;
let server: Server;
let baseUrl: string;

beforeEach(async () => {
  fixtureDirectory = path.join(
    tmpdir(),
    `samsarix-field-atlas-test-${process.pid}-${Date.now()}`
  );
  await mkdir(fixtureDirectory, { recursive: true });
  await writeFile(
    path.join(fixtureDirectory, "index.html"),
    "<!doctype html><title>Samsarix Field Atlas</title>",
    "utf8"
  );
  await mkdir(path.join(fixtureDirectory, "assets"));
  await writeFile(
    path.join(fixtureDirectory, "assets", "app.js"),
    "console.log('fixture')",
    "utf8"
  );

  server = await startServer({
    host: "127.0.0.1",
    port: 0,
    staticPath: fixtureDirectory,
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected a TCP test server address");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close(error => (error ? reject(error) : resolve()));
  });
  await rm(fixtureDirectory, { recursive: true, force: true });
});

describe("release server", () => {
  it("serves a no-cache readiness contract", async () => {
    const response = await fetch(`${baseUrl}/healthz`);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      service: "samsarix-field-atlas",
      status: "ok",
    });
  });

  it("serves the static product with restrictive browser headers", async () => {
    const response = await fetch(baseUrl);
    const assetResponse = await fetch(`${baseUrl}/assets/app.js`);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("content-security-policy")).toContain(
      "default-src 'self'"
    );
    expect(assetResponse.headers.get("cache-control")).toBe(
      "public, max-age=31536000, immutable"
    );
    await expect(response.text()).resolves.toContain("Samsarix Field Atlas");
  });

  it("returns a bounded 404 instead of a misleading SPA success", async () => {
    const response = await fetch(`${baseUrl}/missing`);

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("Not found");
  });

  it("validates configured ports", () => {
    expect(parsePort(undefined)).toBe(3000);
    expect(parsePort("4173")).toBe(4173);
    expect(() => parsePort("0")).toThrow(/between 1 and 65535/);
    expect(() => parsePort("not-a-port")).toThrow(/between 1 and 65535/);
  });

  it("fails closed when the static build is missing", async () => {
    await expect(
      startServer({
        host: "127.0.0.1",
        port: 0,
        staticPath: path.join(fixtureDirectory, "missing"),
      })
    ).rejects.toThrow();
  });
});
