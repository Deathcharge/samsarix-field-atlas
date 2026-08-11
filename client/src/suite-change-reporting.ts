import type { BlueprintSuiteChangeReview } from "./suite-change";

const markdownMetacharacters = /([\\`*_[\]{}()<>#+!|])/g;

function singleLineText(value: string): string {
  return value.replaceAll(/\s+/g, " ").replaceAll(/\p{C}/gu, "?").trim();
}

function markdownText(value: string): string {
  return singleLineText(value).replace(markdownMetacharacters, "\\$1");
}

function tableText(value: string): string {
  return markdownText(value);
}

function yesNo(value: boolean): string {
  return value ? "yes" : "no";
}

export function blueprintSuiteChangeReviewToMarkdown(
  review: BlueprintSuiteChangeReview
): string {
  const lines = [
    "# Samsarix Field Atlas declared change review",
    "",
    `- Intent gate: **${review.summary.gate}**`,
    `- Status: **${review.summary.status}**`,
    `- Review date: \`${review.asOf}\``,
    `- Plan owner assertion: ${markdownText(review.source.plan.owner)}`,
    `- Plan reference: ${markdownText(review.source.plan.reference)}`,
    `- Plan expires: \`${review.source.plan.expiresOn}\``,
    `- Plan SHA-256: \`${review.source.plan.sha256}\``,
    `- Baseline SHA-256: \`${review.source.comparison.baseline.sha256}\``,
    `- Candidate SHA-256: \`${review.source.comparison.candidate.sha256}\``,
    `- Original comparison: ${review.source.comparison.outcome}; ${review.source.comparison.failOn} gate ${review.source.comparison.gate}`,
    `- Planned suite ID: ${markdownText(review.binding.suiteId.expected)}`,
    `- Baseline suite ID: ${markdownText(review.binding.suiteId.baseline)}`,
    `- Candidate suite ID: ${markdownText(review.binding.suiteId.candidate)}`,
    `- Suite identity bound: ${yesNo(review.binding.suiteId.matched)}`,
    `- Planned baseline SHA-256: \`${review.binding.baselineReportSha256.expected}\``,
    `- Baseline bytes bound: ${yesNo(review.binding.baselineReportSha256.matched)}`,
    `- Expired: ${yesNo(review.summary.expired)}`,
    "",
    "## Coverage",
    "",
    "| Expected | Actual | Matched | Mismatched | Unexpected | Missing |",
    "| ---: | ---: | ---: | ---: | ---: | ---: |",
    `| ${review.summary.cases.expected} | ${review.summary.cases.actualChanges} | ${review.summary.cases.matched} | ${review.summary.cases.mismatched} | ${review.summary.cases.unexpected} | ${review.summary.cases.missing} |`,
    "",
    `Regression acknowledgements: ${review.summary.regressionAcknowledgements.present}/${review.summary.regressionAcknowledgements.required}.`,
    "",
    "## Suite-level signals",
    "",
    "| Signal | Expected | Actual | Match |",
    "| --- | --- | --- | --- |",
    `| Report impact | ${review.suite.expected.reportImpact} | ${review.suite.actual.reportImpact} | ${yesNo(review.suite.expected.reportImpact === review.suite.actual.reportImpact)} |`,
    `| Suite metadata changed | ${yesNo(review.suite.expected.suiteMetadataChanged)} | ${yesNo(review.suite.actual.suiteMetadataChanged)} | ${yesNo(review.suite.expected.suiteMetadataChanged === review.suite.actual.suiteMetadataChanged)} |`,
    `| Policy changed | ${yesNo(review.suite.expected.policyChanged)} | ${yesNo(review.suite.actual.policyChanged)} | ${yesNo(review.suite.expected.policyChanged === review.suite.actual.policyChanged)} |`,
    `| Manifest changed | ${yesNo(review.suite.expected.manifestChanged)} | ${yesNo(review.suite.actual.manifestChanged)} | ${yesNo(review.suite.expected.manifestChanged === review.suite.actual.manifestChanged)} |`,
    "",
    "## Case declarations",
    "",
    "| Case | Disposition | Expected | Actual | Dimensions | Regression acknowledged | Mismatches |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];

  if (review.cases.length === 0) {
    lines.push("| — | — | — | — | — | — | — |");
  } else {
    for (const entry of review.cases) {
      const expected = entry.expected
        ? `${entry.expected.change}/${entry.expected.impact}`
        : "—";
      const actual = entry.actual
        ? `${entry.actual.change}/${entry.actual.impact}`
        : "—";
      const dimensions =
        entry.actual?.dimensions.length && entry.actual.dimensions.length > 0
          ? entry.actual.dimensions.join(", ")
          : entry.expected?.dimensions.length &&
              entry.expected.dimensions.length > 0
            ? entry.expected.dimensions.join(", ")
            : "none";
      lines.push(
        `| ${tableText(entry.id)} | ${entry.disposition} | ${expected} | ${actual} | ${dimensions} | ${entry.expected ? yesNo(entry.expected.regressionAcknowledged) : "—"} | ${entry.mismatches.length > 0 ? entry.mismatches.join(", ") : "none"} |`
      );
    }
  }

  lines.push(
    "",
    "## Proof boundary",
    "",
    markdownText(review.proofBoundary),
    ""
  );
  return lines.join("\n");
}
