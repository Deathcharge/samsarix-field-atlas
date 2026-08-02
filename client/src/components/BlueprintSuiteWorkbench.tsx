import { useState, type ChangeEvent } from "react";

import { readBlueprintFile } from "../blueprint-file";
import { downloadText } from "../download";
import {
  createBlueprintSuiteReport,
  type BlueprintSuiteReport,
  type BlueprintSuiteSource,
} from "../suite";

const maximumBrowserSuiteEntries = 16;

function entryId(filename: string, index: number): string {
  const basename = filename.replace(/\.json$/i, "");
  const slug = basename
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const safeSlug = /^[a-z]/.test(slug) ? slug : `case-${slug || index + 1}`;
  return `${safeSlug.slice(0, 112)}-${index + 1}`;
}

async function readSource(
  file: File,
  index: number
): Promise<BlueprintSuiteSource> {
  const base = {
    entryId: entryId(file.name, index),
    artifactUri: file.name,
    tags: [],
  };
  const result = await readBlueprintFile(file);
  if (!result.ok) {
    if (result.reason === "too-large") {
      return {
        ...base,
        importError: "Blueprint files must be 1 MiB or smaller.",
      };
    }
    if (result.reason === "read-failed") {
      return { ...base, importError: "The browser could not read this file." };
    }
    return {
      ...base,
      bytes: result.bytes,
      importError: "The suite entry must contain valid UTF-8 JSON.",
    };
  }
  return { ...base, bytes: result.bytes, value: result.value };
}

function BlueprintSuiteWorkbench() {
  const [strict, setStrict] = useState(true);
  const [sources, setSources] = useState<BlueprintSuiteSource[]>([]);
  const [report, setReport] = useState<BlueprintSuiteReport | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState(
    "Select up to 16 blueprint JSON files. They stay in this browser."
  );

  async function buildReport(
    nextSources: BlueprintSuiteSource[],
    nextStrict: boolean
  ) {
    setPending(true);
    try {
      const nextReport = await createBlueprintSuiteReport(
        {
          id: "local-review",
          title: "Local blueprint review",
          description:
            "An ad hoc browser review of user-selected Field Atlas blueprints.",
        },
        nextStrict,
        nextSources
      );
      setReport(nextReport);
      setNotice(
        `${nextReport.summary.cases.total} local ${nextReport.summary.cases.total === 1 ? "contract" : "contracts"} checked; suite status is ${nextReport.summary.status}.`
      );
    } catch {
      setReport(null);
      setNotice("The browser could not create the local suite report.");
    } finally {
      setPending(false);
    }
  }

  async function importSuite(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (files.length === 0) return;
    if (files.length > maximumBrowserSuiteEntries) {
      setSources([]);
      setReport(null);
      setNotice(
        `Choose no more than ${maximumBrowserSuiteEntries} blueprint files per browser review.`
      );
      return;
    }

    setPending(true);
    const nextSources = await Promise.all(files.map(readSource));
    setSources(nextSources);
    await buildReport(nextSources, strict);
  }

  async function changeStrict(event: ChangeEvent<HTMLInputElement>) {
    const nextStrict = event.currentTarget.checked;
    setStrict(nextStrict);
    if (sources.length > 0) await buildReport(sources, nextStrict);
  }

  function exportReport() {
    if (!report) return;
    try {
      downloadText(
        `${JSON.stringify(report, null, 2)}\n`,
        "samsarix-local-suite-report.json",
        "application/json"
      );
      setNotice(
        "Deterministic suite report exported locally. Nothing was uploaded."
      );
    } catch {
      setNotice("The browser could not export the suite report.");
    }
  }

  return (
    <section
      aria-labelledby="suite-workbench-title"
      className="suite-workbench"
    >
      <div className="suite-heading">
        <div>
          <p className="panel-label">03 / Review a collection</p>
          <h3 id="suite-workbench-title">
            Check a blueprint suite in one pass.
          </h3>
        </div>
        <p>
          Batch-review local contracts before committing a portable suite
          manifest. Each readable file is bound to the report by its exact-byte
          SHA-256 digest.
        </p>
      </div>

      <div className="suite-controls">
        <label className="button button-secondary file-button">
          Import blueprint suite
          <input
            accept="application/json,.json"
            aria-label="Import blueprint suite"
            className="file-input"
            disabled={pending}
            multiple
            onChange={importSuite}
            type="file"
          />
        </label>
        <label className="suite-strict-control">
          <input
            checked={strict}
            disabled={pending}
            onChange={changeStrict}
            type="checkbox"
          />
          <span>
            Strict policy
            <small>Warnings block the aggregate result.</small>
          </span>
        </label>
        <button
          className="button button-secondary"
          disabled={!report || pending}
          onClick={exportReport}
          type="button"
        >
          Export suite report
        </button>
      </div>

      {report ? (
        <div className={`suite-result is-${report.summary.status}`}>
          <div className="suite-summary">
            <div>
              <span>Suite status</span>
              <strong>{report.summary.status}</strong>
            </div>
            <div>
              <span>Ready</span>
              <strong>{report.summary.cases.ready}</strong>
            </div>
            <div>
              <span>Review</span>
              <strong>{report.summary.cases.review}</strong>
            </div>
            <div>
              <span>Invalid</span>
              <strong>{report.summary.cases.invalid}</strong>
            </div>
          </div>
          <div className="suite-table-wrap">
            <table className="suite-table">
              <caption>Local blueprint suite conformance results</caption>
              <thead>
                <tr>
                  <th scope="col">Contract</th>
                  <th scope="col">Status</th>
                  <th scope="col">Findings</th>
                  <th scope="col">SHA-256</th>
                </tr>
              </thead>
              <tbody>
                {report.cases.map(entry => (
                  <tr key={entry.id}>
                    <th scope="row">
                      <span>{entry.scenario?.title ?? entry.artifact.uri}</span>
                      <small>{entry.artifact.uri}</small>
                    </th>
                    <td>
                      <span className={`status-badge status-${entry.status}`}>
                        {entry.status}
                      </span>
                      {entry.status !== entry.validationStatus ? (
                        <small>strict warning policy</small>
                      ) : null}
                    </td>
                    <td>
                      {entry.counts.error}E / {entry.counts.warning}W /{" "}
                      {entry.counts.pass}P
                    </td>
                    <td>
                      <code>
                        {entry.artifact.sha256
                          ? `${entry.artifact.sha256.slice(0, 12)}…`
                          : "unavailable"}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="suite-proof-boundary">{report.proofBoundary}</p>
        </div>
      ) : (
        <div className="suite-empty">
          <p>
            No suite loaded. CI can check a committed manifest with{" "}
            <code>pnpm blueprint:suite examples/core.suite.json</code>.
          </p>
        </div>
      )}

      <p aria-live="polite" className="run-notice workbench-notice">
        {pending ? "Computing local suite conformance and digests…" : notice}
      </p>
    </section>
  );
}

export default BlueprintSuiteWorkbench;
