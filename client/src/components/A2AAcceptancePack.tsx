import { useMemo, useState } from "react";

import {
  a2aAcceptanceToMarkdown,
  defaultA2AAcceptanceProfile,
  validateA2AAcceptance,
  type A2AAcceptanceEnvironment,
  type A2AAcceptanceAnalysis,
  type A2AAcceptanceProfile,
  type A2ADataClassification,
  type A2ARetentionMode,
} from "../acceptance";
import type { A2AAgentCard } from "../a2a";
import type { Blueprint } from "../blueprint";
import { downloadText } from "../download";
import A2ATckEvidenceReceipt from "./A2ATckEvidenceReceipt";

interface A2AAcceptancePackProps {
  blueprint: Blueprint;
  agentCard: A2AAgentCard | undefined;
}

const environments: A2AAcceptanceEnvironment[] = [
  "local",
  "staging",
  "production",
];
const retentionModes: A2ARetentionMode[] = ["none", "transient", "retained"];
const dataClassifications: A2ADataClassification[] = [
  "public",
  "internal",
  "confidential",
  "restricted",
];
const unavailableAnalysis: A2AAcceptanceAnalysis = {
  status: "invalid",
  counts: { error: 1, warning: 0, pass: 0 },
  findings: [
    {
      severity: "error",
      code: "AGENT_CARD_REQUIRED",
      path: "$.agentCard",
      message:
        "Complete a valid draft Agent Card before defining implementation acceptance.",
    },
  ],
};

function numberInputValue(value: number): number {
  return Number.isNaN(value) ? 0 : value;
}

function A2AAcceptancePack({ blueprint, agentCard }: A2AAcceptancePackProps) {
  const [profile, setProfile] = useState<A2AAcceptanceProfile>(
    defaultA2AAcceptanceProfile
  );
  const [generatedAt] = useState(() => new Date().toISOString());
  const [notice, setNotice] = useState(
    "Name the acceptance owner and support contact to create a plan. No tests will run in this browser."
  );
  const analysis = useMemo(
    () =>
      agentCard
        ? validateA2AAcceptance(blueprint, agentCard, profile, generatedAt)
        : unavailableAnalysis,
    [agentCard, blueprint, generatedAt, profile]
  );

  function updateProfile<Key extends keyof A2AAcceptanceProfile>(
    key: Key,
    value: A2AAcceptanceProfile[Key]
  ) {
    setProfile(current => ({ ...current, [key]: value }));
  }

  function updateRetentionMode(value: A2ARetentionMode) {
    setProfile(current => ({
      ...current,
      retentionMode: value,
      retentionHours:
        value === "none"
          ? 0
          : current.retentionHours === 0
            ? 24
            : current.retentionHours,
    }));
  }

  function exportManifest() {
    if (!analysis.manifest) return;
    try {
      downloadText(
        `${JSON.stringify(analysis.manifest, null, 2)}\n`,
        `samsarix-${blueprint.scenario.id}-a2a-acceptance-plan.json`,
        "application/json"
      );
      setNotice(
        "Acceptance manifest exported locally with status plan-not-run."
      );
    } catch {
      setNotice("The browser could not create the acceptance manifest.");
    }
  }

  function exportMarkdown() {
    if (!analysis.manifest) return;
    try {
      downloadText(
        a2aAcceptanceToMarkdown(analysis.manifest),
        `samsarix-${blueprint.scenario.id}-a2a-acceptance-plan.md`,
        "text/markdown"
      );
      setNotice(
        "Execution checklist exported locally. Tests and owner signoff remain outstanding."
      );
    } catch {
      setNotice("The browser could not create the acceptance checklist.");
    }
  }

  return (
    <section
      className="acceptance-pack"
      aria-labelledby="acceptance-pack-title"
    >
      <div className="a2a-heading acceptance-heading">
        <div>
          <p className="panel-label">04 / Define implementation acceptance</p>
          <h3 id="acceptance-pack-title">
            Turn the handoff into a testable owner contract.
          </h3>
        </div>
        <span className="protocol-chip">Plan, not run</span>
      </div>

      <p className="a2a-disclosure">
        This separate Field Atlas artifact complements the official A2A TCK. It
        does not extend the Agent Card, contact the endpoint, run a test, or
        claim that the implementation conforms.
      </p>

      <div className="acceptance-grid">
        <form
          aria-disabled={!agentCard}
          className={`a2a-profile acceptance-profile${agentCard ? "" : " is-disabled"}`}
          onSubmit={event => event.preventDefault()}
        >
          <fieldset disabled={!agentCard}>
            <legend>Acceptance owner profile</legend>
            <p>
              Declare the environment, operational limits, and data decisions
              that the implementation must prove. Do not paste secrets or task
              payloads.
            </p>

            <div className="a2a-fields acceptance-fields">
              <label>
                <span>Acceptance owner</span>
                <input
                  autoComplete="organization"
                  maxLength={240}
                  onChange={event =>
                    updateProfile("owner", event.currentTarget.value)
                  }
                  placeholder="Incident Platform Team"
                  type="text"
                  value={profile.owner}
                />
              </label>

              <label>
                <span>Support contact</span>
                <input
                  autoComplete="email"
                  maxLength={320}
                  onChange={event =>
                    updateProfile("supportContact", event.currentTarget.value)
                  }
                  placeholder="support@samsarix.com"
                  type="text"
                  value={profile.supportContact}
                />
                <small>Email or credential-free HTTPS URL.</small>
              </label>

              <label>
                <span>Environment</span>
                <select
                  onChange={event =>
                    updateProfile(
                      "environment",
                      event.currentTarget.value as A2AAcceptanceEnvironment
                    )
                  }
                  value={profile.environment}
                >
                  {environments.map(environment => (
                    <option key={environment} value={environment}>
                      {environment}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Maximum request bytes</span>
                <input
                  max={10_485_760}
                  min={1}
                  onChange={event =>
                    updateProfile(
                      "maxRequestBytes",
                      numberInputValue(event.currentTarget.valueAsNumber)
                    )
                  }
                  step={1}
                  type="number"
                  value={profile.maxRequestBytes}
                />
              </label>

              <label>
                <span>Response deadline (ms)</span>
                <input
                  max={300_000}
                  min={100}
                  onChange={event =>
                    updateProfile(
                      "responseDeadlineMs",
                      numberInputValue(event.currentTarget.valueAsNumber)
                    )
                  }
                  step={1}
                  type="number"
                  value={profile.responseDeadlineMs}
                />
              </label>

              <label>
                <span>Maximum concurrent tasks</span>
                <input
                  max={10_000}
                  min={1}
                  onChange={event =>
                    updateProfile(
                      "maxConcurrentTasks",
                      numberInputValue(event.currentTarget.valueAsNumber)
                    )
                  }
                  step={1}
                  type="number"
                  value={profile.maxConcurrentTasks}
                />
              </label>

              <label>
                <span>Retention mode</span>
                <select
                  onChange={event =>
                    updateRetentionMode(
                      event.currentTarget.value as A2ARetentionMode
                    )
                  }
                  value={profile.retentionMode}
                >
                  {retentionModes.map(mode => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Retention hours</span>
                <input
                  disabled={profile.retentionMode === "none"}
                  max={8_760}
                  min={profile.retentionMode === "none" ? 0 : 1}
                  onChange={event =>
                    updateProfile(
                      "retentionHours",
                      numberInputValue(event.currentTarget.valueAsNumber)
                    )
                  }
                  step={1}
                  type="number"
                  value={profile.retentionHours}
                />
              </label>

              <label>
                <span>Data classification</span>
                <select
                  onChange={event =>
                    updateProfile(
                      "dataClassification",
                      event.currentTarget.value as A2ADataClassification
                    )
                  }
                  value={profile.dataClassification}
                >
                  {dataClassifications.map(classification => (
                    <option key={classification} value={classification}>
                      {classification}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset className="capability-options" disabled={!agentCard}>
            <legend>Data path</legend>
            <label>
              <input
                checked={profile.externalProcessors}
                onChange={event =>
                  updateProfile(
                    "externalProcessors",
                    event.currentTarget.checked
                  )
                }
                type="checkbox"
              />
              External processors receive task data
            </label>
          </fieldset>
        </form>

        <div className={`a2a-decision is-${analysis.status}`}>
          <div className="a2a-decision-heading">
            <div>
              <p className="panel-label">Plan readiness</p>
              <h4>
                {!agentCard
                  ? "Complete the draft Agent Card first"
                  : analysis.status === "invalid"
                    ? "Owner decisions required"
                    : analysis.status === "review"
                      ? "Plan ready with caveats"
                      : "Plan ready to execute elsewhere"}
              </h4>
            </div>
            <span className={`status-badge status-${analysis.status}`}>
              {analysis.status}
            </span>
          </div>

          {analysis.manifest ? (
            <dl className="acceptance-metrics">
              <div>
                <dt>Planned cases</dt>
                <dd>{analysis.manifest.summary.testCases}</dd>
              </div>
              <div>
                <dt>Blocking</dt>
                <dd>{analysis.manifest.summary.blockingCases}</dd>
              </div>
              <div>
                <dt>Human gates</dt>
                <dd>{analysis.manifest.summary.humanApprovalCases}</dd>
              </div>
              <div>
                <dt>Official TCK</dt>
                <dd>{analysis.manifest.summary.officialTckCases}</dd>
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
              disabled={!analysis.manifest}
              onClick={exportManifest}
              type="button"
            >
              Export acceptance manifest
            </button>
            <button
              className="button button-secondary"
              disabled={!analysis.manifest}
              onClick={exportMarkdown}
              type="button"
            >
              Export execution checklist
            </button>
          </div>
        </div>
      </div>

      <p aria-live="polite" className="run-notice a2a-notice">
        {agentCard
          ? notice
          : "Acceptance inputs are paused until the draft Agent Card is valid; completed values remain in this browser."}
      </p>

      <A2ATckEvidenceReceipt acceptanceManifest={analysis.manifest} />
    </section>
  );
}

export default A2AAcceptancePack;
