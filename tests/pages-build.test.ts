import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const pagesRoot = resolve(repositoryRoot, "docs");
const pagesScript = resolve(pagesRoot, "assets/field-atlas.min.js");
const pagesStyles = resolve(pagesRoot, "assets/field-atlas.min.css");

describe("GitHub Pages publication", () => {
  it("commits a subpath-safe application build without replacing project records", () => {
    const index = readFileSync(resolve(pagesRoot, "index.html"), "utf8");

    expect(index).toContain(
      'src="/samsarix-field-atlas/assets/field-atlas.min.js"'
    );
    expect(index).toContain(
      'href="/samsarix-field-atlas/assets/field-atlas.min.css"'
    );
    expect(index).toContain('href="/samsarix-field-atlas/favicon.svg"');
    expect(index).not.toContain("/src/main.tsx");
    expect(existsSync(resolve(pagesRoot, ".nojekyll"))).toBe(true);
    expect(existsSync(resolve(pagesRoot, "PRODUCTIZATION.md"))).toBe(true);
    expect(statSync(pagesScript).size).toBeGreaterThan(100_000);
    expect(statSync(pagesStyles).size).toBeGreaterThan(10_000);
    expect(readFileSync(pagesScript, "utf8")).not.toContain(
      "sourceMappingURL="
    );
  });
});
