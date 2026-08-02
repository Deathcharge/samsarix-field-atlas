import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import type { A2AAcceptanceManifest } from "../acceptance";
import { downloadText } from "../download";
import { sha256Hex, type A2ATckEvidenceReceipt } from "../evidence";
import {
  a2aReviewLedgerToMarkdown,
  canonicalJson,
  defaultA2AReviewProfile,
  maximumReviewProfileBytes,
  pendingA2ACaseReview,
  validateA2AReviewLedger,
  type A2ACaseReviewInput,
  type A2AReleaseDecision,
  type A2AReviewAnalysis,
  type A2AReviewOutcome,
  type A2AReviewProfile,
} from "../review";

interface A2AAcceptanceReviewLedgerProps {
  acceptanceManifest: A2AAcceptanceManifest | undefined;
  tckReceipt: A2ATckEvidenceReceipt | undefined;
}

interface SourceBindingBase {
  acceptanceManifest: A2AAcceptanceManifest;
  tckReceipt: A2ATckEvidenceReceipt;
}

interface SourceDigests extends SourceBindingBase {
  status: "ready";
  plan: string;
  receipt: string;
}

interface SourceDigestFailure extends SourceBindingBase {
  status: "error";
}

type SourceBinding = SourceDigests | SourceDigestFailure;

const outcomes: A2AReviewOutcome[] = [
  "pending",
  "accepted",
  "rejected",
  "waived",
];
const decisions: A2AReleaseDecision[] = ["not-made", "approved", "rejected"];
const planUnavailable: A2AReviewAnalysis = {
  status: "invalid",
  counts: { error: 1, warning: 0, pass: 0 },
  findings: [
    {
      severity: "error",
      code: "ACCEPTANCE_PLAN_REQUIRED",
      path: "$.acceptancePlan",
      message: "Complete the acceptance plan before reviewing its cases.",
    },
  ],
};
const receiptUnavailable: A2AReviewAnalysis = {
  status: "invalid",
  counts: { error: 1, warning: 0, pass: 0 },
  findings: [
    {
      severity: "error",
      code: "TCK_RECEIPT_REQUIRED",
      path: "$.tckReceipt",
      message:
        "Create a valid TCK evidence receipt before recording acceptance dispositions.",
    },
  ],
};
const digestPending: A2AReviewAnalysis = {
  status: "review",
  counts: { error: 0, warning: 1, pass: 0 },
  findings: [
    {
      severity: "warning",
      code: "SOURCE_BINDING_IN_PROGRESS",
      path: "$.source",
      message: "Computing canonical source digests locally.",
    },
  ],
};
const digestFailed: A2AReviewAnalysis = {
  status: "invalid",
  counts: { error: 1, warning: 0, pass: 0 },
  findings: [
    {
      severity: "error",
      code: "SOURCE_BINDING_FAILED",
      path: "$.source",
      message:
        "The browser could not compute canonical SHA-256 source bindings.",
    },
  ],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function importedProfile(value: unknown): A2AReviewProfile | null {
  if (
    !isRecord(value) ||
    typeof value.reviewOwner !== "string" ||
    typeof value.decisionOwner !== "string" ||
    typeof value.implementationRevision !== "string" ||
    typeof value.decision !== "string" ||
    !decisions.includes(value.decision as A2AReleaseDecision) ||
    !(value.decidedAt === null || typeof value.decidedAt === "string") ||
    !(
      value.decisionRationale === null ||
      typeof value.decisionRationale === "string"
    ) ||
    !Array.isArray(value.caseReviews)
  ) {
    return null;
  }
  const caseReviews: A2ACaseReviewInput[] = [];
  for (const row of value.caseReviews) {
    if (
      !isRecord(row) ||
      typeof row.caseId !== "string" ||
      typeof row.outcome !== "string" ||
      !outcomes.includes(row.outcome as A2AReviewOutcome) ||
      !(row.reviewedAt === null || typeof row.reviewedAt === "string") ||
      !Array.isArray(row.evidenceRefs) ||
      !row.evidenceRefs.every(reference => typeof reference === "string") ||
      !(row.rationale === null || typeof row.rationale === "string")
    ) {
      return null;
    }
    caseReviews.push({
      caseId: row.caseId,
      outcome: row.outcome as A2AReviewOutcome,
      reviewedAt: row.reviewedAt,
      evidenceRefs: row.evidenceRefs as string[],
      rationale: row.rationale,
    });
  }
  return {
    reviewOwner: value.reviewOwner,
    decisionOwner: value.decisionOwner,
    implementationRevision: value.implementationRevision,
    decision: value.decision as A2AReleaseDecision,
    decidedAt: value.decidedAt,
    decisionRationale: value.decisionRationale,
    caseReviews,
  };
}

function A2AAcceptanceReviewLedger({
  acceptanceManifest,
  tckReceipt,
}: A2AAcceptanceReviewLedgerProps) {
  const [profile, setProfile] = useState<A2AReviewProfile>(
    defaultA2AReviewProfile
  );
  const [caseReviews, setCaseReviews] = useState<
    Record<string, A2ACaseReviewInput>
  >({});
  const [generatedAt, setGeneratedAt] = useState(() =>
    new Date().toISOString()
  );
  const [sourceBinding, setSourceBinding] = useState<SourceBinding>();
  const [notice, setNotice] = useState(
    "Review every planned case or import a bounded profile. Nothing is uploaded."
  );
  const importSequence = useRef(0);

  useEffect(() => {
    let active = true;
    if (!acceptanceManifest || !tckReceipt) return () => undefined;
    const manifestSource = acceptanceManifest;
    const receiptSource = tckReceipt;
    async function bindSources() {
      const encoder = new TextEncoder();
      const [plan, receipt] = await Promise.all([
        sha256Hex(encoder.encode(canonicalJson(manifestSource))),
        sha256Hex(encoder.encode(canonicalJson(receiptSource))),
      ]);
      if (active) {
        setSourceBinding({
          acceptanceManifest: manifestSource,
          tckReceipt: receiptSource,
          status: "ready",
          plan,
          receipt,
        });
      }
    }
    void bindSources().catch(() => {
      if (active) {
        setSourceBinding({
          acceptanceManifest: manifestSource,
          tckReceipt: receiptSource,
          status: "error",
        });
      }
    });
    return () => {
      active = false;
    };
  }, [acceptanceManifest, tckReceipt]);

  const resolvedReviewOwner =
    profile.reviewOwner ||
    tckReceipt?.source.acceptancePlan.acceptanceOwner ||
    "";
  const resolvedImplementationRevision =
    profile.implementationRevision ||
    tckReceipt?.source.provenance.implementationRevision ||
    "";
  const effectiveProfile = useMemo<A2AReviewProfile>(
    () => ({
      ...profile,
      reviewOwner: resolvedReviewOwner,
      implementationRevision: resolvedImplementationRevision,
      caseReviews:
        acceptanceManifest?.testCases.map(
          testCase =>
            caseReviews[testCase.id] ?? pendingA2ACaseReview(testCase.id)
        ) ?? [],
    }),
    [
      acceptanceManifest,
      caseReviews,
      profile,
      resolvedImplementationRevision,
      resolvedReviewOwner,
    ]
  );
  const activeSourceBinding =
    sourceBinding !== undefined &&
    sourceBinding.acceptanceManifest === acceptanceManifest &&
    sourceBinding.tckReceipt === tckReceipt
      ? sourceBinding
      : undefined;
  const analysis = useMemo(() => {
    if (!acceptanceManifest) return planUnavailable;
    if (!tckReceipt) return receiptUnavailable;
    if (!activeSourceBinding) return digestPending;
    if (activeSourceBinding.status === "error") return digestFailed;
    return validateA2AReviewLedger(
      acceptanceManifest,
      tckReceipt,
      effectiveProfile,
      generatedAt,
      activeSourceBinding.plan,
      activeSourceBinding.receipt
    );
  }, [
    acceptanceManifest,
    effectiveProfile,
    generatedAt,
    activeSourceBinding,
    tckReceipt,
  ]);

  function touchLedger() {
    setGeneratedAt(new Date().toISOString());
  }

  function updateProfile<Key extends keyof A2AReviewProfile>(
    key: Key,
    value: A2AReviewProfile[Key]
  ) {
    setProfile(current => ({ ...current, [key]: value }));
    touchLedger();
  }

  function updateDecision(decision: A2AReleaseDecision) {
    const now = new Date().toISOString();
    setProfile(current =>
      decision === "not-made"
        ? {
            ...current,
            decision,
            decisionOwner: "",
            decidedAt: null,
            decisionRationale: null,
          }
        : {
            ...current,
            decision,
            decisionOwner:
              current.decisionOwner ||
              tckReceipt?.source.acceptancePlan.acceptanceOwner ||
              "",
            decidedAt: now,
            decisionRationale: current.decisionRationale ?? "",
          }
    );
    setGeneratedAt(now);
  }

  function updateCase(
    caseId: string,
    update: (current: A2ACaseReviewInput) => A2ACaseReviewInput
  ) {
    setCaseReviews(current => ({
      ...current,
      [caseId]: update(current[caseId] ?? pendingA2ACaseReview(caseId)),
    }));
    touchLedger();
  }

  function updateOutcome(caseId: string, outcome: A2AReviewOutcome) {
    const now = new Date().toISOString();
    updateCase(caseId, current =>
      outcome === "pending"
        ? pendingA2ACaseReview(caseId)
        : {
            ...current,
            outcome,
            reviewedAt: current.reviewedAt ?? now,
          }
    );
    setGeneratedAt(now);
  }

  async function importReviewProfile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const sequence = importSequence.current + 1;
    importSequence.current = sequence;
    if (file.size > maximumReviewProfileBytes) {
      setNotice(
        `${file.name} exceeds the ${maximumReviewProfileBytes} byte local import limit.`
      );
      return;
    }
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(
        await file.arrayBuffer()
      );
      const parsed = JSON.parse(text) as unknown;
      const candidate = importedProfile(parsed);
      if (!candidate) throw new Error("invalid profile");
      if (sequence !== importSequence.current) return;
      const now = new Date().toISOString();
      if (
        !acceptanceManifest ||
        !tckReceipt ||
        activeSourceBinding?.status !== "ready"
      ) {
        setNotice(
          "Wait for a valid plan, receipt, and local source binding before importing a review profile."
        );
        return;
      }
      const importedAnalysis = validateA2AReviewLedger(
        acceptanceManifest,
        tckReceipt,
        parsed,
        now,
        activeSourceBinding.plan,
        activeSourceBinding.receipt
      );
      if (importedAnalysis.status === "invalid") {
        const codes = importedAnalysis.findings
          .filter(finding => finding.severity === "error")
          .map(finding => finding.code)
          .join(", ");
        setNotice(`${file.name} was rejected: ${codes}.`);
        return;
      }
      setProfile({ ...candidate, caseReviews: [] });
      setCaseReviews(
        Object.fromEntries(
          candidate.caseReviews.map(review => [review.caseId, review])
        )
      );
      setGeneratedAt(now);
      setNotice(
        `${file.name} imported locally${importedAnalysis.status === "review" ? " with review items" : ""}. Unknown additive fields were not copied.`
      );
    } catch {
      if (sequence !== importSequence.current) return;
      setNotice(`${file.name} is not a valid UTF-8 review profile.`);
    }
  }

  function exportProfile() {
    if (!acceptanceManifest) return;
    try {
      downloadText(
        `${JSON.stringify(effectiveProfile, null, 2)}\n`,
        `samsarix-${acceptanceManifest.source.blueprint.scenarioId}-a2a-review-profile.json`,
        "application/json"
      );
      setNotice(
        "Review profile exported locally. It is an editable input, not a decision record."
      );
    } catch {
      setNotice("The browser could not create the review profile.");
    }
  }

  function exportLedger() {
    if (!analysis.ledger) return;
    try {
      downloadText(
        `${JSON.stringify(analysis.ledger, null, 2)}\n`,
        `samsarix-${analysis.ledger.source.acceptancePlan.scenarioId}-a2a-review-ledger.json`,
        "application/json"
      );
      setNotice(
        "Owner-asserted review ledger exported locally with its proof boundary intact."
      );
    } catch {
      setNotice("The browser could not create the review ledger.");
    }
  }

  function exportMarkdown() {
    if (!analysis.ledger) return;
    try {
      downloadText(
        a2aReviewLedgerToMarkdown(analysis.ledger),
        `samsarix-${analysis.ledger.source.acceptancePlan.scenarioId}-a2a-review-ledger.md`,
        "text/markdown"
      );
      setNotice(
        "Human-readable review packet exported locally without authenticating its assertions."
      );
    } catch {
      setNotice("The browser could not create the review packet.");
    }
  }

  return (
    <section
      className="acceptance-review"
      aria-labelledby="review-ledger-title"
    >
      <div className="a2a-heading acceptance-heading">
        <div>
          <p className="panel-label">06 / Record owner dispositions</p>
          <h3 id="review-ledger-title">
            Close every planned case without hiding exceptions.
          </h3>
        </div>
        <span className="protocol-chip">Owner asserted</span>
      </div>

      <p className="a2a-disclosure">
        The ledger binds the canonical plan and TCK receipt, records one
        disposition per planned case, and computes blocking readiness. Field
        Atlas does not authenticate artifacts, verify owner identity, execute a
        service, or grant release authority.
      </p>

      <div className="acceptance-grid review-ledger-grid">
        <form
          aria-disabled={!tckReceipt}
          className={`a2a-profile acceptance-profile review-profile${tckReceipt ? "" : " is-disabled"}`}
          onSubmit={event => event.preventDefault()}
        >
          <fieldset disabled={!tckReceipt}>
            <legend>Review authority</legend>
            <p>
              Use the full implementation revision and credential-free evidence
              references. Review and decision owners are assertions, not
              authenticated identities.
            </p>

            <div className="a2a-fields review-owner-fields">
              <label>
                <span>Case review owner</span>
                <input
                  autoComplete="organization"
                  maxLength={240}
                  onChange={event =>
                    updateProfile("reviewOwner", event.currentTarget.value)
                  }
                  placeholder="Implementation Review Team"
                  type="text"
                  value={resolvedReviewOwner}
                />
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
                  spellCheck={false}
                  type="text"
                  value={resolvedImplementationRevision}
                />
              </label>

              <label>
                <span>Owner release decision</span>
                <select
                  onChange={event =>
                    updateDecision(
                      event.currentTarget.value as A2AReleaseDecision
                    )
                  }
                  value={profile.decision}
                >
                  {decisions.map(decision => (
                    <option key={decision} value={decision}>
                      {decision}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Decision owner</span>
                <input
                  autoComplete="organization"
                  disabled={profile.decision === "not-made"}
                  maxLength={240}
                  onChange={event =>
                    updateProfile("decisionOwner", event.currentTarget.value)
                  }
                  placeholder="Release Authority"
                  type="text"
                  value={profile.decisionOwner}
                />
              </label>

              <label className="review-rationale-field">
                <span>Decision rationale</span>
                <textarea
                  disabled={profile.decision === "not-made"}
                  maxLength={2_000}
                  onChange={event =>
                    updateProfile(
                      "decisionRationale",
                      event.currentTarget.value || null
                    )
                  }
                  placeholder="State why the owner approved or rejected this implementation."
                  rows={3}
                  value={profile.decisionRationale ?? ""}
                />
                {profile.decidedAt ? (
                  <small>Decision time: {profile.decidedAt}</small>
                ) : null}
              </label>
            </div>

            <div className="review-profile-transfer">
              <label className="button button-secondary file-button">
                Import review profile
                <input
                  accept="application/json,.json"
                  className="file-input"
                  onChange={importReviewProfile}
                  type="file"
                />
              </label>
              <button
                className="button button-secondary"
                onClick={exportProfile}
                type="button"
              >
                Export review profile
              </button>
              <small>
                Maximum {maximumReviewProfileBytes} bytes. Editable profiles are
                inputs, not signed evidence.
              </small>
            </div>
          </fieldset>

          <fieldset disabled={!tckReceipt}>
            <legend>Planned case review</legend>
            <p>
              Accepted, rejected, and waived cases require a canonical review
              time plus at least one HTTPS or URN evidence reference. Waivers
              and rejections also require rationale.
            </p>
            <ol className="review-case-list">
              {acceptanceManifest?.testCases.map((testCase, index) => {
                const review =
                  caseReviews[testCase.id] ?? pendingA2ACaseReview(testCase.id);
                return (
                  <li key={testCase.id}>
                    <details open={index === 0}>
                      <summary>
                        <span>{testCase.title}</span>
                        <span
                          className={`review-outcome outcome-${review.outcome}`}
                        >
                          {testCase.blocking ? "blocking · " : ""}
                          {review.outcome}
                        </span>
                      </summary>
                      <div className="review-case-fields">
                        <p>
                          <code>{testCase.id}</code>
                          <span>{testCase.expected}</span>
                        </p>
                        <label>
                          <span>Disposition</span>
                          <select
                            aria-label={`${testCase.title} disposition`}
                            onChange={event =>
                              updateOutcome(
                                testCase.id,
                                event.currentTarget.value as A2AReviewOutcome
                              )
                            }
                            value={review.outcome}
                          >
                            {outcomes.map(outcome => (
                              <option key={outcome} value={outcome}>
                                {outcome}
                              </option>
                            ))}
                          </select>
                        </label>
                        {review.outcome === "pending" ? null : (
                          <>
                            <label>
                              <span>Evidence references</span>
                              <textarea
                                aria-label={`${testCase.title} evidence references`}
                                maxLength={4_096}
                                onChange={event =>
                                  updateCase(testCase.id, current => ({
                                    ...current,
                                    evidenceRefs: event.currentTarget.value
                                      .split(/\r?\n/)
                                      .map(reference => reference.trim())
                                      .filter(Boolean),
                                  }))
                                }
                                placeholder="https://evidence.example.com/run/artifact.json\nurn:sha256:..."
                                rows={3}
                                spellCheck={false}
                                value={review.evidenceRefs.join("\n")}
                              />
                            </label>
                            <label>
                              <span>
                                Rationale
                                {review.outcome === "accepted"
                                  ? " (optional)"
                                  : ""}
                              </span>
                              <textarea
                                aria-label={`${testCase.title} rationale`}
                                maxLength={2_000}
                                onChange={event =>
                                  updateCase(testCase.id, current => ({
                                    ...current,
                                    rationale:
                                      event.currentTarget.value || null,
                                  }))
                                }
                                rows={2}
                                value={review.rationale ?? ""}
                              />
                            </label>
                            <small>Reviewed at {review.reviewedAt}</small>
                          </>
                        )}
                      </div>
                    </details>
                  </li>
                );
              })}
            </ol>
          </fieldset>
        </form>

        <div className={`a2a-decision is-${analysis.status}`}>
          <div className="a2a-decision-heading">
            <div>
              <p className="panel-label">Ledger readiness</p>
              <h4>
                {!acceptanceManifest
                  ? "Complete the acceptance plan first"
                  : !tckReceipt
                    ? "Bind the TCK evidence receipt first"
                    : !analysis.ledger
                      ? "Resolve review ledger inputs"
                      : analysis.ledger.conclusion.automatedReadiness ===
                          "blocked"
                        ? "Ledger records a blocked release"
                        : analysis.ledger.conclusion.releaseDecision ===
                            "approved"
                          ? "Owner approval recorded"
                          : analysis.ledger.conclusion.releaseDecision ===
                              "rejected"
                            ? "Owner rejection recorded"
                            : "Ready for an owner decision"}
              </h4>
            </div>
            <span className={`status-badge status-${analysis.status}`}>
              {analysis.status}
            </span>
          </div>

          {analysis.ledger ? (
            <dl className="acceptance-metrics review-metrics">
              <div>
                <dt>Accepted</dt>
                <dd>{analysis.ledger.summary.accepted}</dd>
              </div>
              <div>
                <dt>Rejected</dt>
                <dd>{analysis.ledger.summary.rejected}</dd>
              </div>
              <div>
                <dt>Waived</dt>
                <dd>{analysis.ledger.summary.waived}</dd>
              </div>
              <div>
                <dt>Pending</dt>
                <dd>{analysis.ledger.summary.pending}</dd>
              </div>
              <div>
                <dt>Blocking rejected</dt>
                <dd>{analysis.ledger.summary.blockingRejected}</dd>
              </div>
              <div>
                <dt>Blocking pending</dt>
                <dd>{analysis.ledger.summary.blockingPending}</dd>
              </div>
            </dl>
          ) : null}

          <ol className="finding-list a2a-findings review-findings">
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
              disabled={!analysis.ledger}
              onClick={exportLedger}
              type="button"
            >
              Export review ledger
            </button>
            <button
              className="button button-secondary"
              disabled={!analysis.ledger}
              onClick={exportMarkdown}
              type="button"
            >
              Export ledger packet
            </button>
          </div>
        </div>
      </div>

      <p aria-live="polite" className="run-notice a2a-notice">
        {tckReceipt
          ? notice
          : "Review inputs are paused until the TCK receipt is valid; completed values remain in this browser."}
      </p>
    </section>
  );
}

export default A2AAcceptanceReviewLedger;
