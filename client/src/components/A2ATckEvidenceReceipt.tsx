import { useMemo, useRef, useState, type ChangeEvent } from "react";

import type { A2AAcceptanceManifest } from "../acceptance";
import { downloadText } from "../download";
import {
  defaultA2ATckEvidenceProfile,
  interpretedA2ATckRevision,
  maximumTckReportBytes,
  sha256Hex,
  validateA2ATckEvidence,
  type A2ATckEvidenceAnalysis,
  type A2ATckEvidenceProfile,
} from "../evidence";
import A2AAcceptanceReviewLedger from "./A2AAcceptanceReviewLedger";

interface A2ATckEvidenceReceiptProps {
  acceptanceManifest: A2AAcceptanceManifest | undefined;
}

interface ImportedReport {
  filename: string;
  value: unknown;
  sha256: string;
}

const planUnavailable: A2ATckEvidenceAnalysis = {
  status: "invalid",
  counts: { error: 1, warning: 0, pass: 0 },
  findings: [
    {
      severity: "error",
      code: "ACCEPTANCE_PLAN_REQUIRED",
      path: "$.acceptancePlan",
      message:
        "Complete the acceptance owner contract before attaching implementation evidence.",
    },
  ],
};

const reportUnavailable: A2ATckEvidenceAnalysis = {
  status: "invalid",
  counts: { error: 1, warning: 0, pass: 0 },
  findings: [
    {
      severity: "error",
      code: "TCK_REPORT_REQUIRED",
      path: "$.tckReport",
      message:
        "Import the official reports/compatibility.json file after running the pinned A2A TCK.",
    },
  ],
};

function A2ATckEvidenceReceipt({
  acceptanceManifest,
}: A2ATckEvidenceReceiptProps) {
  const [profile, setProfile] = useState<A2ATckEvidenceProfile>(
    defaultA2ATckEvidenceProfile
  );
  const [report, setReport] = useState<ImportedReport>();
  const [generatedAt, setGeneratedAt] = useState(() =>
    new Date().toISOString()
  );
  const [notice, setNotice] = useState(
    "Run the official TCK outside this browser, then attach its compatibility.json report."
  );
  const importSequence = useRef(0);

  const analysis = useMemo(() => {
    if (!acceptanceManifest) return planUnavailable;
    if (!report) return reportUnavailable;
    return validateA2ATckEvidence(
      acceptanceManifest,
      report.value,
      profile,
      generatedAt,
      report.sha256
    );
  }, [acceptanceManifest, generatedAt, profile, report]);

  function updateProfile<Key extends keyof A2ATckEvidenceProfile>(
    key: Key,
    value: A2ATckEvidenceProfile[Key]
  ) {
    setProfile(current => ({ ...current, [key]: value }));
  }

  async function importReport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    const sequence = importSequence.current + 1;
    importSequence.current = sequence;
    if (file.size > maximumTckReportBytes) {
      setReport(undefined);
      setNotice(
        `${file.name} exceeds the ${maximumTckReportBytes} byte local import limit.`
      );
      return;
    }

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const [text, digest] = await Promise.all([
        Promise.resolve(
          new TextDecoder("utf-8", { fatal: true }).decode(bytes)
        ),
        sha256Hex(bytes),
      ]);
      const value = JSON.parse(text) as unknown;
      if (sequence !== importSequence.current) return;
      setReport({ filename: file.name, value, sha256: digest });
      setGeneratedAt(new Date().toISOString());
      setProfile(current => ({
        ...current,
        evidenceOwner:
          current.evidenceOwner || acceptanceManifest?.acceptance.owner || "",
      }));
      setNotice(
        `${file.name} parsed and hashed locally. Raw errors and the embedded Agent Card will not be copied into the receipt.`
      );
    } catch {
      if (sequence !== importSequence.current) return;
      setReport(undefined);
      setNotice(`${file.name} is not a valid UTF-8 JSON report.`);
    }
  }

  function exportReceipt() {
    if (!analysis.receipt) return;
    try {
      downloadText(
        `${JSON.stringify(analysis.receipt, null, 2)}\n`,
        `samsarix-${analysis.receipt.source.acceptancePlan.scenarioId}-a2a-tck-receipt.json`,
        "application/json"
      );
      setNotice(
        "Evidence receipt exported locally with owner-review-required status."
      );
    } catch {
      setNotice("The browser could not create the TCK evidence receipt.");
    }
  }

  return (
    <section className="tck-evidence" aria-labelledby="tck-evidence-title">
      <div className="a2a-heading acceptance-heading">
        <div>
          <p className="panel-label">05 / Bind official TCK evidence</p>
          <h3 id="tck-evidence-title">
            Make the report traceable without turning it into a verdict.
          </h3>
        </div>
        <span className="protocol-chip">Owner review</span>
      </div>

      <p className="a2a-disclosure">
        Field Atlas validates the current official compatibility report shape,
        hashes its exact bytes, and records provenance. It does not run the TCK,
        verify an asserted revision, inspect the endpoint, or decide protocol
        conformance or release readiness.
      </p>

      <div className="acceptance-grid tck-evidence-grid">
        <form
          aria-disabled={!acceptanceManifest}
          className={`a2a-profile acceptance-profile${acceptanceManifest ? "" : " is-disabled"}`}
          onSubmit={event => event.preventDefault()}
        >
          <fieldset disabled={!acceptanceManifest}>
            <legend>Evidence provenance</legend>
            <p>
              Use immutable revisions and a redacted command. Never paste a
              credential, authorization header, or sensitive task payload.
            </p>

            <div className="a2a-fields evidence-fields">
              <label>
                <span>Evidence owner</span>
                <input
                  autoComplete="organization"
                  maxLength={240}
                  onChange={event =>
                    updateProfile("evidenceOwner", event.currentTarget.value)
                  }
                  placeholder="Incident Platform Team"
                  type="text"
                  value={profile.evidenceOwner}
                />
              </label>

              <label>
                <span>TCK Git revision</span>
                <input
                  autoCapitalize="none"
                  maxLength={40}
                  onChange={event =>
                    updateProfile("tckRevision", event.currentTarget.value)
                  }
                  spellCheck={false}
                  type="text"
                  value={profile.tckRevision}
                />
                <small>
                  Interpreted against {interpretedA2ATckRevision.slice(0, 12)}…
                </small>
              </label>

              <label>
                <span>Implementation revision</span>
                <input
                  autoCapitalize="none"
                  maxLength={64}
                  onChange={event =>
                    updateProfile(
                      "implementationRevision",
                      event.currentTarget.value
                    )
                  }
                  placeholder="Full 40- or 64-character revision"
                  spellCheck={false}
                  type="text"
                  value={profile.implementationRevision}
                />
              </label>

              <label className="evidence-command-field">
                <span>Redacted run command</span>
                <textarea
                  maxLength={2_000}
                  onChange={event =>
                    updateProfile("runCommand", event.currentTarget.value)
                  }
                  placeholder="./run_tck.py --sut-host https://agent.example.com --transport jsonrpc"
                  rows={3}
                  spellCheck={false}
                  value={profile.runCommand}
                />
              </label>
            </div>

            <div className="evidence-upload">
              <label className="button button-secondary file-button">
                Import compatibility.json
                <input
                  accept="application/json,.json"
                  className="file-input"
                  onChange={importReport}
                  type="file"
                />
              </label>
              <small>
                Maximum {maximumTckReportBytes} bytes. Parsing and SHA-256 stay
                in this browser.
              </small>
              {report ? (
                <p className="evidence-file">
                  <strong>{report.filename}</strong>
                  <code>{report.sha256.slice(0, 16)}…</code>
                </p>
              ) : null}
            </div>
          </fieldset>
        </form>

        <div className={`a2a-decision is-${analysis.status}`}>
          <div className="a2a-decision-heading">
            <div>
              <p className="panel-label">Receipt readiness</p>
              <h4>
                {!acceptanceManifest
                  ? "Complete the acceptance plan first"
                  : !report
                    ? "Attach the official JSON report"
                    : analysis.status === "invalid"
                      ? "Evidence cannot be bound"
                      : analysis.status === "review"
                        ? "Receipt ready with review items"
                        : "Receipt ready for owner review"}
              </h4>
            </div>
            <span className={`status-badge status-${analysis.status}`}>
              {analysis.status}
            </span>
          </div>

          {analysis.receipt ? (
            <dl className="acceptance-metrics evidence-metrics">
              <div>
                <dt>TCK overall</dt>
                <dd>{analysis.receipt.observations.compatibility.overall}</dd>
              </div>
              <div>
                <dt>Failed</dt>
                <dd>{analysis.receipt.observations.requirements.failed}</dd>
              </div>
              <div>
                <dt>Skipped / untested</dt>
                <dd>
                  {analysis.receipt.observations.requirements.skipped} /{" "}
                  {analysis.receipt.observations.requirements.notTested}
                </dd>
              </div>
              <div>
                <dt>Unresolved blocking</dt>
                <dd>
                  {
                    analysis.receipt.acceptanceCoverage
                      .unresolvedBlockingCaseIds.length
                  }
                </dd>
              </div>
            </dl>
          ) : null}

          <ol className="finding-list a2a-findings">
            {analysis.findings.map((finding, index) => (
              <li
                className={`finding finding-${finding.severity}`}
                key={`${finding.code}-${finding.path}-${index}`}
              >
                <span>{finding.severity}</span>
                <div>
                  <strong>{finding.code.replaceAll("_", " ")}</strong>
                  <p>{finding.message}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="a2a-actions">
            <button
              className="button button-primary"
              disabled={!analysis.receipt}
              onClick={exportReceipt}
              type="button"
            >
              Export evidence receipt
            </button>
          </div>
        </div>
      </div>

      <p aria-live="polite" className="run-notice a2a-notice">
        {acceptanceManifest
          ? notice
          : "Evidence inputs are paused until the acceptance plan is valid; imported values remain in this browser."}
      </p>

      <A2AAcceptanceReviewLedger
        acceptanceManifest={acceptanceManifest}
        tckReceipt={analysis.receipt}
      />
    </section>
  );
}

export default A2ATckEvidenceReceipt;
