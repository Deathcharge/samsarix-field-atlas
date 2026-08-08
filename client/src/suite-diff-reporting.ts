import type { BlueprintSuiteDiff } from "./suite-diff";

const markdownMetacharacters = /([\\`*_[\]{}()<>#+!|])/g;

function singleLineText(value: string): string {
  return value.replaceAll(/\s+/g, " ").replaceAll(/\p{C}/gu, "?").trim();
}

function markdownText(value: string): string {
  return singleLineText(value).replace(markdownMetacharacters, "\\$1");
}

function xmlText(value: string): string {
  const validCharacters = Array.from(value, character => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint === 0x9 ||
      codePoint === 0xa ||
      codePoint === 0xd ||
      (codePoint >= 0x20 && codePoint <= 0xd7ff) ||
      (codePoint >= 0xe000 && codePoint <= 0xfffd) ||
      (codePoint >= 0x10000 && codePoint <= 0x10ffff)
      ? character
      : "?";
  }).join("");

  return validCharacters
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function xmlAttribute(value: string): string {
  return xmlText(singleLineText(value));
}

function caseTitle(entry: BlueprintSuiteDiff["cases"][number]): string {
  return (
    entry.candidate?.scenario?.title ??
    entry.baseline?.scenario?.title ??
    entry.id
  );
}

function caseStatus(
  snapshot: BlueprintSuiteDiff["cases"][number]["baseline"]
): string {
  return snapshot?.status ?? "not present";
}

function caseDifferences(entry: BlueprintSuiteDiff["cases"][number]): string {
  if (entry.differences.length > 0) return entry.differences.join(", ");
  if (entry.change === "added" || entry.change === "removed") {
    return `coverage ${entry.change}`;
  }
  return "none";
}

function caseFails(
  diff: BlueprintSuiteDiff,
  entry: BlueprintSuiteDiff["cases"][number]
): boolean {
  if (diff.policy.failOn === "change") return entry.change !== "unchanged";
  return entry.impact === "regression" || entry.impact === "mixed";
}

function suiteLevelFailures(diff: BlueprintSuiteDiff): string[] {
  const failures: string[] = [];
  if (diff.summary.reportImpact === "regression") {
    failures.push("report status regressed");
  } else if (
    diff.policy.failOn === "change" &&
    diff.summary.reportImpact === "improvement"
  ) {
    failures.push("report status improved under the any-change policy");
  }
  if (diff.policy.failOn === "change") {
    if (diff.summary.suiteMetadataChanged) {
      failures.push("suite metadata changed");
    }
    if (diff.summary.policyChanged) failures.push("suite policy changed");
    if (diff.summary.manifestChanged) failures.push("source manifest changed");
  }
  return failures;
}

function suiteLevelDetails(diff: BlueprintSuiteDiff): string {
  return [
    `outcome=${diff.summary.outcome}`,
    `gate=${diff.summary.gate}`,
    `report-impact=${diff.summary.reportImpact}`,
    `suite-metadata-changed=${diff.summary.suiteMetadataChanged}`,
    `policy-changed=${diff.summary.policyChanged}`,
    `manifest-changed=${diff.summary.manifestChanged}`,
  ].join("; ");
}

function caseDetails(entry: BlueprintSuiteDiff["cases"][number]): string {
  return [
    `title=${singleLineText(caseTitle(entry))}`,
    `change=${entry.change}`,
    `impact=${entry.impact}`,
    `baseline=${caseStatus(entry.baseline)}`,
    `candidate=${caseStatus(entry.candidate)}`,
    `differences=${caseDifferences(entry)}`,
  ].join("; ");
}

export function blueprintSuiteDiffToJUnit(diff: BlueprintSuiteDiff): string {
  const suiteFailures = suiteLevelFailures(diff);
  const failedCases = diff.cases.filter(entry => caseFails(diff, entry));
  const failureCount = suiteFailures.length > 0 ? 1 : 0;
  const totalFailures = failureCount + failedCases.length;
  const testCount = diff.cases.length + 1;
  const className = `samsarix.suite-diff.${diff.source.candidate.suite.id}`;
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuites name="Samsarix Field Atlas suite diff" tests="${testCount}" failures="${totalFailures}" errors="0">`,
    `  <testsuite name="${xmlAttribute(diff.source.candidate.suite.title)}" tests="${testCount}" failures="${totalFailures}" errors="0">`,
    "    <properties>",
    `      <property name="schema" value="${xmlAttribute(diff.schemaVersion)}" />`,
    `      <property name="policy.failOn" value="${xmlAttribute(diff.policy.failOn)}" />`,
    `      <property name="summary.outcome" value="${xmlAttribute(diff.summary.outcome)}" />`,
    `      <property name="summary.gate" value="${xmlAttribute(diff.summary.gate)}" />`,
    `      <property name="source.baseline.uri" value="${xmlAttribute(diff.source.baseline.uri)}" />`,
    `      <property name="source.baseline.sha256" value="${xmlAttribute(diff.source.baseline.sha256)}" />`,
    `      <property name="source.candidate.uri" value="${xmlAttribute(diff.source.candidate.uri)}" />`,
    `      <property name="source.candidate.sha256" value="${xmlAttribute(diff.source.candidate.sha256)}" />`,
    "    </properties>",
    `    <testcase classname="${xmlAttribute(className)}" name="suite-level">`,
  ];

  if (suiteFailures.length > 0) {
    lines.push(
      `      <failure message="Suite-level comparison gate failed">${xmlText(suiteFailures.join("; "))}</failure>`
    );
  }
  lines.push(
    `      <system-out>${xmlText(`${suiteLevelDetails(diff)}\n${diff.proofBoundary}`)}</system-out>`,
    "    </testcase>"
  );

  for (const entry of diff.cases) {
    const failed = caseFails(diff, entry);
    lines.push(
      `    <testcase classname="${xmlAttribute(className)}" name="${xmlAttribute(entry.id)}">`
    );
    if (failed) {
      lines.push(
        `      <failure message="Suite comparison gate failed">${xmlText(`${entry.change} case has ${entry.impact} impact`)}</failure>`
      );
    }
    lines.push(
      `      <system-out>${xmlText(caseDetails(entry))}</system-out>`,
      "    </testcase>"
    );
  }

  lines.push("  </testsuite>", "</testsuites>");
  return `${lines.join("\n")}\n`;
}

export function blueprintSuiteDiffToMarkdown(diff: BlueprintSuiteDiff): string {
  const lines = [
    `# Suite baseline comparison: ${markdownText(diff.source.candidate.suite.title)}`,
    "",
    `- Gate: **${diff.summary.gate}**`,
    `- Outcome: **${diff.summary.outcome}**`,
    `- Policy: fail on **${diff.policy.failOn}**`,
    `- Baseline: ${markdownText(diff.source.baseline.uri)} (${diff.source.baseline.sha256})`,
    `- Candidate: ${markdownText(diff.source.candidate.uri)} (${diff.source.candidate.sha256})`,
    "",
    "## Summary",
    "",
    "| Signal | Value |",
    "| --- | --- |",
    `| Report impact | ${diff.summary.reportImpact} |`,
    `| Suite metadata changed | ${diff.summary.suiteMetadataChanged ? "yes" : "no"} |`,
    `| Suite policy changed | ${diff.summary.policyChanged ? "yes" : "no"} |`,
    `| Source manifest changed | ${diff.summary.manifestChanged ? "yes" : "no"} |`,
    `| Cases | ${diff.summary.cases.total} compared; ${diff.summary.cases.added} added; ${diff.summary.cases.removed} removed; ${diff.summary.cases.modified} modified; ${diff.summary.cases.unchanged} unchanged |`,
    `| Impact | ${diff.summary.impact.regression} regression; ${diff.summary.impact.mixed} mixed; ${diff.summary.impact.review} review; ${diff.summary.impact.improvement} improvement; ${diff.summary.impact.none} none |`,
    "",
    "## Cases",
    "",
    "| Contract | ID | Change | Impact | Baseline | Candidate | Differences |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...diff.cases.map(
      entry =>
        `| ${markdownText(caseTitle(entry))} | ${markdownText(entry.id)} | ${entry.change} | ${entry.impact} | ${caseStatus(entry.baseline)} | ${caseStatus(entry.candidate)} | ${caseDifferences(entry)} |`
    ),
    "",
    "## Proof boundary",
    "",
    markdownText(diff.proofBoundary),
    "",
    "This deterministic, timestamp-free summary reports the selected local comparison gate. It does not assert that tests ran or that a release was approved.",
  ];

  return `${lines.join("\n")}\n`;
}
