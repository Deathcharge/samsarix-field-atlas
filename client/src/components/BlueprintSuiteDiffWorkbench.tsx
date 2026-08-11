import { useRef, useState, type ChangeEvent } from "react";

import { readBlueprintFile } from "../blueprint-file";
import { downloadText } from "../download";
import type { BlueprintSuiteReport } from "../suite";
import { blueprintSuiteDiffToMarkdown } from "../suite-diff-reporting";
import { blueprintSuiteChangeReviewToMarkdown } from "../suite-change-reporting";
import {
  createBlueprintSuiteChangeReview,
  maximumSuiteChangePlanBytes,
  validateBlueprintSuiteChangePlan,
  type BlueprintSuiteChangePlan,
  type BlueprintSuiteChangeReview,
} from "../suite-change";
import {
  createBlueprintSuiteDiff,
  maximumSuiteReportBytes,
  validateBlueprintSuiteReport,
  type BlueprintSuiteDiff,
} from "../suite-diff";

interface ImportedSuiteReport {
  filename: string;
  bytes: Uint8Array;
  report: BlueprintSuiteReport;
}

interface ImportedSuiteChangePlan {
  filename: string;
  bytes: Uint8Array;
  plan: BlueprintSuiteChangePlan;
}

type ReportSide = "baseline" | "candidate";

function sourceStatus(
  source: BlueprintSuiteDiff["cases"][number]["baseline"]
): string {
  return source?.status ?? "not present";
}

function caseTitle(entry: BlueprintSuiteDiff["cases"][number]): string {
  return (
    entry.candidate?.scenario?.title ??
    entry.baseline?.scenario?.title ??
    entry.id
  );
}

async function readSuiteReport(
  file: File
): Promise<
  { ok: true; value: ImportedSuiteReport } | { ok: false; message: string }
> {
  const result = await readBlueprintFile(file, maximumSuiteReportBytes);
  if (!result.ok) {
    if (result.reason === "too-large") {
      return {
        ok: false,
        message: `${file.name} exceeds the 8 MiB suite-report limit.`,
      };
    }
    if (result.reason === "read-failed") {
      return {
        ok: false,
        message: `The browser could not read ${file.name}.`,
      };
    }
    return {
      ok: false,
      message: `${file.name} is not valid UTF-8 JSON.`,
    };
  }
  const analysis = validateBlueprintSuiteReport(result.value);
  if (!analysis.report) {
    const first = analysis.findings[0];
    return {
      ok: false,
      message: first
        ? `${file.name} is not a valid suite report: ${first.code} at ${first.path}.`
        : `${file.name} is not a valid suite report.`,
    };
  }
  return {
    ok: true,
    value: {
      filename: file.name,
      bytes: result.bytes,
      report: analysis.report,
    },
  };
}

async function readSuiteChangePlan(
  file: File
): Promise<
  { ok: true; value: ImportedSuiteChangePlan } | { ok: false; message: string }
> {
  const result = await readBlueprintFile(file, maximumSuiteChangePlanBytes);
  if (!result.ok) {
    if (result.reason === "too-large") {
      return {
        ok: false,
        message: `${file.name} exceeds the 1 MiB change-plan limit.`,
      };
    }
    if (result.reason === "read-failed") {
      return {
        ok: false,
        message: `The browser could not read ${file.name}.`,
      };
    }
    return {
      ok: false,
      message: `${file.name} is not valid UTF-8 JSON.`,
    };
  }
  const analysis = validateBlueprintSuiteChangePlan(result.value);
  if (!analysis.plan) {
    const first = analysis.findings[0];
    return {
      ok: false,
      message: first
        ? `${file.name} is not a valid change plan: ${first.code} at ${first.path}.`
        : `${file.name} is not a valid change plan.`,
    };
  }
  return {
    ok: true,
    value: {
      filename: file.name,
      bytes: result.bytes,
      plan: analysis.plan,
    },
  };
}

function BlueprintSuiteDiffWorkbench() {
  const [baseline, setBaseline] = useState<ImportedSuiteReport | null>(null);
  const [candidate, setCandidate] = useState<ImportedSuiteReport | null>(null);
  const [failOnChange, setFailOnChange] = useState(false);
  const [diff, setDiff] = useState<BlueprintSuiteDiff | null>(null);
  const [changePlan, setChangePlan] = useState<ImportedSuiteChangePlan | null>(
    null
  );
  const [reviewDate, setReviewDate] = useState("");
  const [changeReview, setChangeReview] =
    useState<BlueprintSuiteChangeReview | null>(null);
  const [planReadPending, setPlanReadPending] = useState(false);
  const [reviewPending, setReviewPending] = useState(false);
  const reviewGeneration = useRef(0);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState(
    "Import a baseline and candidate suite report. Both stay in this browser."
  );
  const [reviewNotice, setReviewNotice] = useState(
    "Import a bounded change plan and set an explicit review date."
  );
  const busy = pending || planReadPending || reviewPending;

  async function reviewDeclaredChange(
    nextDiff: BlueprintSuiteDiff | null,
    nextPlan: ImportedSuiteChangePlan | null,
    nextReviewDate: string
  ) {
    const generation = reviewGeneration.current + 1;
    reviewGeneration.current = generation;
    if (!nextDiff || !nextPlan || nextReviewDate === "") {
      setChangeReview(null);
      setReviewPending(false);
      if (!nextDiff) {
        setReviewNotice("Compare two suite reports before reviewing a plan.");
      } else if (!nextPlan) {
        setReviewNotice(
          "Import a bounded change plan to review declared intent."
        );
      } else {
        setReviewNotice("Set an explicit review date to evaluate this plan.");
      }
      return;
    }
    setReviewPending(true);
    try {
      const review = await createBlueprintSuiteChangeReview(
        {
          uri: nextPlan.filename,
          bytes: nextPlan.bytes,
          plan: nextPlan.plan,
        },
        nextDiff,
        nextReviewDate
      );
      if (generation !== reviewGeneration.current) return;
      setChangeReview(review);
      setReviewNotice(
        `Declared intent is ${review.summary.status}; the intent gate ${review.summary.gate === "pass" ? "passes" : "fails"}. The original ${review.source.comparison.failOn} gate ${review.source.comparison.gate === "pass" ? "passes" : "fails"}.`
      );
    } catch (error) {
      if (generation !== reviewGeneration.current) return;
      setChangeReview(null);
      setReviewNotice(
        error instanceof Error
          ? error.message
          : "The browser could not review this change plan."
      );
    } finally {
      if (generation === reviewGeneration.current) setReviewPending(false);
    }
  }

  async function compare(
    nextBaseline: ImportedSuiteReport | null,
    nextCandidate: ImportedSuiteReport | null,
    nextFailOnChange: boolean
  ) {
    if (!nextBaseline || !nextCandidate) {
      setDiff(null);
      setNotice(
        "Import both a baseline and candidate suite report to compare them."
      );
      setPending(false);
      await reviewDeclaredChange(null, changePlan, reviewDate);
      return;
    }
    setPending(true);
    try {
      const nextDiff = await createBlueprintSuiteDiff(
        {
          uri: nextBaseline.filename,
          bytes: nextBaseline.bytes,
          report: nextBaseline.report,
        },
        {
          uri: nextCandidate.filename,
          bytes: nextCandidate.bytes,
          report: nextCandidate.report,
        },
        nextFailOnChange
      );
      setDiff(nextDiff);
      setNotice(
        `${nextDiff.summary.cases.total} stable case ${nextDiff.summary.cases.total === 1 ? "identity" : "identities"} compared; outcome is ${nextDiff.summary.outcome} and the ${nextDiff.policy.failOn} gate ${nextDiff.summary.gate === "pass" ? "passes" : "fails"}.`
      );
      await reviewDeclaredChange(nextDiff, changePlan, reviewDate);
    } catch (error) {
      setDiff(null);
      await reviewDeclaredChange(null, changePlan, reviewDate);
      setNotice(
        error instanceof Error
          ? error.message
          : "The browser could not compare these suite reports."
      );
    } finally {
      setPending(false);
    }
  }

  async function importReport(
    side: ReportSide,
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setPending(true);
    try {
      const result = await readSuiteReport(file);
      if (!result.ok) {
        if (side === "baseline") setBaseline(null);
        else setCandidate(null);
        setDiff(null);
        await reviewDeclaredChange(null, changePlan, reviewDate);
        setNotice(result.message);
        return;
      }

      const nextBaseline = side === "baseline" ? result.value : baseline;
      const nextCandidate = side === "candidate" ? result.value : candidate;
      if (side === "baseline") setBaseline(result.value);
      else setCandidate(result.value);
      await compare(nextBaseline, nextCandidate, failOnChange);
    } catch (error) {
      setDiff(null);
      await reviewDeclaredChange(null, changePlan, reviewDate);
      setNotice(
        error instanceof Error
          ? error.message
          : "The browser could not import this suite report."
      );
    } finally {
      setPending(false);
    }
  }

  async function changePolicy(event: ChangeEvent<HTMLInputElement>) {
    const nextFailOnChange = event.currentTarget.checked;
    setFailOnChange(nextFailOnChange);
    await compare(baseline, candidate, nextFailOnChange);
  }

  async function importChangePlan(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setPlanReadPending(true);
    try {
      const result = await readSuiteChangePlan(file);
      if (!result.ok) {
        setChangePlan(null);
        setChangeReview(null);
        setReviewNotice(result.message);
        reviewGeneration.current += 1;
        setReviewPending(false);
        return;
      }
      setChangePlan(result.value);
      await reviewDeclaredChange(diff, result.value, reviewDate);
    } catch (error) {
      setChangePlan(null);
      setChangeReview(null);
      reviewGeneration.current += 1;
      setReviewNotice(
        error instanceof Error
          ? error.message
          : "The browser could not import this change plan."
      );
    } finally {
      setPlanReadPending(false);
    }
  }

  async function changeReviewDate(event: ChangeEvent<HTMLInputElement>) {
    const nextReviewDate = event.currentTarget.value;
    setReviewDate(nextReviewDate);
    await reviewDeclaredChange(diff, changePlan, nextReviewDate);
  }

  function exportDiff() {
    if (!diff || busy) return;
    try {
      downloadText(
        `${JSON.stringify(diff, null, 2)}\n`,
        "samsarix-suite-diff.json",
        "application/json"
      );
      setNotice(
        "Deterministic suite comparison exported locally. Nothing was uploaded."
      );
    } catch {
      setNotice("The browser could not export the suite comparison.");
    }
  }

  function exportSummary() {
    if (!diff || busy) return;
    try {
      downloadText(
        blueprintSuiteDiffToMarkdown(diff),
        "samsarix-suite-diff.md",
        "text/markdown"
      );
      setNotice(
        "Readable suite comparison summary exported locally. Nothing was uploaded."
      );
    } catch {
      setNotice("The browser could not export the comparison summary.");
    }
  }

  function exportChangeReview() {
    if (!changeReview || busy) return;
    try {
      downloadText(
        `${JSON.stringify(changeReview, null, 2)}\n`,
        "samsarix-suite-change-review.json",
        "application/json"
      );
      setReviewNotice(
        "Declared change review exported locally. Nothing was uploaded."
      );
    } catch {
      setReviewNotice("The browser could not export the change review.");
    }
  }

  function exportChangeReviewSummary() {
    if (!changeReview || busy) return;
    try {
      downloadText(
        blueprintSuiteChangeReviewToMarkdown(changeReview),
        "samsarix-suite-change-review.md",
        "text/markdown"
      );
      setReviewNotice(
        "Readable declared change review exported locally. Nothing was uploaded."
      );
    } catch {
      setReviewNotice(
        "The browser could not export the change review summary."
      );
    }
  }

  return (
    <section
      aria-labelledby="suite-diff-workbench-title"
      className="suite-workbench suite-diff-workbench"
    >
      <div className="suite-heading">
        <div>
          <p className="panel-label">04 / Compare baselines</p>
          <h3 id="suite-diff-workbench-title">
            Find contract regressions before release.
          </h3>
        </div>
        <p>
          Align two deterministic suite reports by stable case ID. Removed
          coverage and worse conformance regress; content-only changes stay
          visible for review.
        </p>
      </div>

      <div aria-label="Suite report sources" className="suite-diff-sources">
        <div>
          <span>Baseline report</span>
          <strong>{baseline?.filename ?? "Not imported"}</strong>
          <small>
            {baseline
              ? `${baseline.report.summary.cases.total} cases · ${baseline.report.summary.status}`
              : "Known-good comparison source"}
          </small>
        </div>
        <div>
          <span>Candidate report</span>
          <strong>{candidate?.filename ?? "Not imported"}</strong>
          <small>
            {candidate
              ? `${candidate.report.summary.cases.total} cases · ${candidate.report.summary.status}`
              : "Proposed contract state"}
          </small>
        </div>
      </div>

      <div className="suite-controls">
        <label className="button button-secondary file-button">
          Import baseline report
          <input
            accept="application/json,.json"
            aria-label="Import baseline suite report"
            className="file-input"
            disabled={busy}
            onChange={event => importReport("baseline", event)}
            type="file"
          />
        </label>
        <label className="button button-secondary file-button">
          Import candidate report
          <input
            accept="application/json,.json"
            aria-label="Import candidate suite report"
            className="file-input"
            disabled={busy}
            onChange={event => importReport("candidate", event)}
            type="file"
          />
        </label>
        <label className="suite-strict-control">
          <input
            checked={failOnChange}
            disabled={busy}
            onChange={changePolicy}
            type="checkbox"
          />
          <span>
            Fail on any change
            <small>Default blocks regressions only.</small>
          </span>
        </label>
        <button
          className="button button-secondary"
          disabled={!diff || busy}
          onClick={exportDiff}
          type="button"
        >
          Export suite comparison
        </button>
        <button
          className="button button-secondary"
          disabled={!diff || busy}
          onClick={exportSummary}
          type="button"
        >
          Export comparison summary
        </button>
      </div>

      {diff ? (
        <div
          className={`suite-result suite-diff-result is-${diff.summary.gate}`}
        >
          <div className="suite-summary suite-diff-summary">
            <div>
              <span>Gate</span>
              <strong>{diff.summary.gate}</strong>
            </div>
            <div>
              <span>Outcome</span>
              <strong>{diff.summary.outcome}</strong>
            </div>
            <div>
              <span>Regressions</span>
              <strong>
                {diff.summary.impact.regression + diff.summary.impact.mixed}
              </strong>
            </div>
            <div>
              <span>Review</span>
              <strong>{diff.summary.impact.review}</strong>
            </div>
            <div>
              <span>Improvements</span>
              <strong>{diff.summary.impact.improvement}</strong>
            </div>
            <div>
              <span>Added / removed</span>
              <strong>
                {diff.summary.cases.added} / {diff.summary.cases.removed}
              </strong>
            </div>
          </div>
          <div className="suite-table-wrap">
            <table className="suite-table suite-diff-table">
              <caption>Baseline and candidate suite report comparison</caption>
              <thead>
                <tr>
                  <th scope="col">Contract</th>
                  <th scope="col">Change</th>
                  <th scope="col">Impact</th>
                  <th scope="col">Baseline</th>
                  <th scope="col">Candidate</th>
                  <th scope="col">Differences</th>
                </tr>
              </thead>
              <tbody>
                {diff.cases.map(entry => (
                  <tr key={entry.id}>
                    <th scope="row">
                      <span>{caseTitle(entry)}</span>
                      <small>{entry.id}</small>
                    </th>
                    <td>{entry.change}</td>
                    <td>
                      <span className={`impact-badge impact-${entry.impact}`}>
                        {entry.impact}
                      </span>
                    </td>
                    <td>{sourceStatus(entry.baseline)}</td>
                    <td>{sourceStatus(entry.candidate)}</td>
                    <td>
                      {entry.differences.length > 0
                        ? entry.differences.join(", ")
                        : entry.change === "added" || entry.change === "removed"
                          ? `coverage ${entry.change}`
                          : "none"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <section
            aria-labelledby="suite-change-review-title"
            className="suite-change-panel"
          >
            <div className="suite-change-heading">
              <div>
                <p className="panel-label">Declared change intent</p>
                <h4 id="suite-change-review-title">
                  Match planned drift without hiding it.
                </h4>
              </div>
              <p>
                Bind a repository-owned plan to these exact baseline bytes, then
                fail on undeclared, missing, mismatched, or expired intent.
                Owner assertions are not authenticated approval.
              </p>
            </div>
            <div className="suite-change-controls">
              <label className="button button-secondary file-button">
                Import change plan
                <input
                  accept="application/json,.json"
                  aria-label="Import suite change plan"
                  className="file-input"
                  disabled={busy}
                  onChange={importChangePlan}
                  type="file"
                />
              </label>
              <label className="suite-change-date">
                <span>Review date</span>
                <input
                  aria-label="Declared change review date"
                  disabled={busy}
                  onChange={changeReviewDate}
                  type="date"
                  value={reviewDate}
                />
                <small>Recorded explicitly; no hidden clock lookup.</small>
              </label>
              <button
                className="button button-secondary"
                disabled={!changeReview || busy}
                onClick={exportChangeReview}
                type="button"
              >
                Export change review
              </button>
              <button
                className="button button-secondary"
                disabled={!changeReview || busy}
                onClick={exportChangeReviewSummary}
                type="button"
              >
                Export change summary
              </button>
            </div>
            <div className="suite-change-source">
              <span>Plan</span>
              <strong>{changePlan?.filename ?? "Not imported"}</strong>
              <small>
                {changePlan
                  ? `${changePlan.plan.owner} · expires ${changePlan.plan.expiresOn}`
                  : "Exact expected changes, owner assertion, reference, and expiry"}
              </small>
            </div>
            {changeReview ? (
              <div
                className={`suite-change-result is-${changeReview.summary.gate}`}
              >
                <div className="suite-summary suite-change-summary">
                  <div>
                    <span>Intent gate</span>
                    <strong>{changeReview.summary.gate}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong>{changeReview.summary.status}</strong>
                  </div>
                  <div>
                    <span>Comparison gate</span>
                    <strong>{changeReview.source.comparison.gate}</strong>
                  </div>
                  <div>
                    <span>Matched</span>
                    <strong>{changeReview.summary.cases.matched}</strong>
                  </div>
                  <div>
                    <span>Unexpected / missing</span>
                    <strong>
                      {changeReview.summary.cases.unexpected} /{" "}
                      {changeReview.summary.cases.missing}
                    </strong>
                  </div>
                  <div>
                    <span>Baseline bound</span>
                    <strong>
                      {changeReview.binding.baselineReportSha256.matched
                        ? "yes"
                        : "no"}
                    </strong>
                  </div>
                </div>
                <div className="suite-table-wrap">
                  <table className="suite-table suite-change-table">
                    <caption>Declared and actual suite changes</caption>
                    <thead>
                      <tr>
                        <th scope="col">Case</th>
                        <th scope="col">Disposition</th>
                        <th scope="col">Expected</th>
                        <th scope="col">Actual</th>
                        <th scope="col">Dimensions</th>
                        <th scope="col">Mismatches</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changeReview.cases.map(entry => (
                        <tr key={entry.id}>
                          <th scope="row">{entry.id}</th>
                          <td>{entry.disposition}</td>
                          <td>
                            {entry.expected
                              ? `${entry.expected.change} / ${entry.expected.impact}`
                              : "not declared"}
                          </td>
                          <td>
                            {entry.actual
                              ? `${entry.actual.change} / ${entry.actual.impact}`
                              : "not observed"}
                          </td>
                          <td>
                            {entry.actual?.dimensions.join(", ") ||
                              entry.expected?.dimensions.join(", ") ||
                              "none"}
                          </td>
                          <td>
                            {entry.mismatches.length > 0
                              ? entry.mismatches.join(", ")
                              : "none"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="suite-proof-boundary">
                  {changeReview.proofBoundary}
                </p>
              </div>
            ) : (
              <p className="suite-change-empty">
                No declared change review yet. CI can use{" "}
                <code>pnpm blueprint:suite-change … --plan … --as-of …</code>.
              </p>
            )}
            <p aria-live="polite" className="run-notice workbench-notice">
              {reviewPending ? "Reviewing declared intent…" : reviewNotice}
            </p>
          </section>
          <p className="suite-proof-boundary">{diff.proofBoundary}</p>
        </div>
      ) : (
        <div className="suite-empty">
          <p>
            No comparison yet. CI can compare committed reports with{" "}
            <code>pnpm blueprint:suite-diff baseline.json candidate.json</code>.
          </p>
        </div>
      )}

      <p aria-live="polite" className="run-notice workbench-notice">
        {pending ? "Validating and comparing exact report bytes…" : notice}
      </p>
    </section>
  );
}

export default BlueprintSuiteDiffWorkbench;
