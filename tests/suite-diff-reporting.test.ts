import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  blueprintSuiteDiffToJUnit,
  blueprintSuiteDiffToMarkdown,
} from "../client/src/suite-diff-reporting";
import type { BlueprintSuiteDiff } from "../client/src/suite-diff";

function fixtureText(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function fixtureDiff(): BlueprintSuiteDiff {
  return JSON.parse(
    fixtureText("examples/core.suite-diff.json")
  ) as BlueprintSuiteDiff;
}

function parseXml(xml: string): Document {
  return new DOMParser().parseFromString(xml, "application/xml");
}

describe("suite diff CI reporting", () => {
  it("reproduces the committed JUnit and Markdown fixtures", () => {
    const diff = fixtureDiff();

    expect(blueprintSuiteDiffToJUnit(diff)).toBe(
      fixtureText("examples/core.suite-diff.junit.xml")
    );
    expect(blueprintSuiteDiffToMarkdown(diff)).toBe(
      fixtureText("examples/core.suite-diff.md")
    );
  });

  it("emits a well-formed compact JUnit subset with stable test identities", () => {
    const document = parseXml(blueprintSuiteDiffToJUnit(fixtureDiff()));
    const root = document.documentElement;

    expect(root.nodeName).toBe("testsuites");
    expect(root.getAttribute("tests")).toBe("4");
    expect(root.getAttribute("failures")).toBe("0");
    expect(document.querySelector("parsererror")).toBeNull();
    expect(
      Array.from(document.querySelectorAll("testcase"), testcase =>
        testcase.getAttribute("name")
      )
    ).toEqual([
      "suite-level",
      "ambiguous-request",
      "breaking-change",
      "incident",
    ]);
    expect(document.querySelectorAll("failure")).toHaveLength(0);
  });

  it("maps the selected comparison policy to case and suite failures", () => {
    const anyChange = fixtureDiff();
    anyChange.policy.failOn = "change";
    anyChange.summary.gate = "fail";
    const anyChangeDocument = parseXml(blueprintSuiteDiffToJUnit(anyChange));

    expect(anyChangeDocument.documentElement.getAttribute("failures")).toBe(
      "2"
    );
    expect(
      Array.from(
        anyChangeDocument.querySelectorAll("testcase:has(failure)"),
        testcase => testcase.getAttribute("name")
      )
    ).toEqual(["suite-level", "incident"]);

    const regression = fixtureDiff();
    regression.summary.gate = "fail";
    regression.summary.outcome = "regression";
    regression.cases[0]!.change = "removed";
    regression.cases[0]!.impact = "regression";
    regression.cases[0]!.candidate = null;
    const regressionDocument = parseXml(blueprintSuiteDiffToJUnit(regression));

    expect(regressionDocument.documentElement.getAttribute("failures")).toBe(
      "1"
    );
    expect(
      regressionDocument
        .querySelector("testcase:has(failure)")
        ?.getAttribute("name")
    ).toBe("ambiguous-request");
  });

  it("escapes imported XML and Markdown values without creating markup", () => {
    const diff = fixtureDiff();
    diff.source.baseline.uri = 'baseline"><script>alert(1)</script>.json';
    diff.source.candidate.suite.title =
      "# [remote](https://example.com) | <img src=x>";
    diff.cases[0]!.candidate!.scenario!.title =
      "Case | [remote](https://example.com)\u0000";

    const junit = blueprintSuiteDiffToJUnit(diff);
    const document = parseXml(junit);
    const markdown = blueprintSuiteDiffToMarkdown(diff);

    expect(document.querySelector("parsererror")).toBeNull();
    expect(document.querySelector("script")).toBeNull();
    expect(junit).not.toContain("<script>");
    expect(
      document
        .querySelector('property[name="source.baseline.uri"]')
        ?.getAttribute("value")
    ).toBe('baseline"><script>alert(1)</script>.json');
    expect(markdown).toContain(
      "\\# \\[remote\\]\\(https://example.com\\) \\| \\<img src=x\\>"
    );
    expect(markdown).toContain(
      "Case \\| \\[remote\\]\\(https://example.com\\)?"
    );
    expect(markdown).not.toContain("[remote](https://example.com)");
  });
});
