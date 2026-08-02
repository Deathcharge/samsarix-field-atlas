import { useState, type ChangeEvent } from "react";

import { readBlueprintFile } from "../blueprint-file";
import { downloadText } from "../download";
import type { BlueprintSuiteReport } from "../suite";
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

function BlueprintSuiteDiffWorkbench() {
  const [baseline, setBaseline] = useState<ImportedSuiteReport | null>(null);
  const [candidate, setCandidate] = useState<ImportedSuiteReport | null>(null);
  const [failOnChange, setFailOnChange] = useState(false);
  const [diff, setDiff] = useState<BlueprintSuiteDiff | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState(
    "Import a baseline and candidate suite report. Both stay in this browser."
  );

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
    } catch (error) {
      setDiff(null);
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

  function exportDiff() {
    if (!diff) return;
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
            disabled={pending}
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
            disabled={pending}
            onChange={event => importReport("candidate", event)}
            type="file"
          />
        </label>
        <label className="suite-strict-control">
          <input
            checked={failOnChange}
            disabled={pending}
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
          disabled={!diff || pending}
          onClick={exportDiff}
          type="button"
        >
          Export suite comparison
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
