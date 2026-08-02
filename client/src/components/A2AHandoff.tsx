import { useMemo, useState } from "react";

import {
  a2aHandoffToMarkdown,
  defaultA2ADeploymentProfile,
  validateA2ADeployment,
  type A2ADeploymentProfile,
  type A2AProtocolBinding,
  type A2ASecurityPosture,
} from "../a2a";
import type { Blueprint } from "../blueprint";
import { downloadText } from "../download";
import A2AAcceptancePack from "./A2AAcceptancePack";

interface A2AHandoffProps {
  blueprint: Blueprint;
}

const mediaModes = ["application/json", "text/plain"] as const;
const protocolBindings: A2AProtocolBinding[] = ["HTTP+JSON", "JSONRPC", "GRPC"];

function A2AHandoff({ blueprint }: A2AHandoffProps) {
  const [profile, setProfile] = useState<A2ADeploymentProfile>(() =>
    defaultA2ADeploymentProfile(blueprint)
  );
  const [notice, setNotice] = useState(
    "Complete the runtime-owner fields to create a draft Agent Card."
  );
  const analysis = useMemo(
    () => validateA2ADeployment(blueprint, profile),
    [blueprint, profile]
  );

  function updateProfile<Key extends keyof A2ADeploymentProfile>(
    key: Key,
    value: A2ADeploymentProfile[Key]
  ) {
    setProfile(current => ({ ...current, [key]: value }));
  }

  function exportAgentCard() {
    if (!analysis.agentCard) return;

    try {
      downloadText(
        `${JSON.stringify(analysis.agentCard, null, 2)}\n`,
        `samsarix-${blueprint.scenario.id}-draft-agent-card.json`,
        "application/json"
      );
      setNotice(
        "Draft Agent Card exported locally. Its endpoint and capabilities remain unverified."
      );
    } catch {
      setNotice("The browser could not create the draft Agent Card.");
    }
  }

  function exportHandoff() {
    if (!analysis.agentCard) return;

    try {
      downloadText(
        a2aHandoffToMarkdown(blueprint, profile, analysis),
        `samsarix-${blueprint.scenario.id}-a2a-handoff.md`,
        "text/markdown"
      );
      setNotice(
        "A2A implementation checklist exported locally with the source contract boundary intact."
      );
    } catch {
      setNotice("The browser could not create the A2A handoff checklist.");
    }
  }

  return (
    <section className="a2a-handoff" aria-labelledby="a2a-handoff-title">
      <div className="a2a-heading">
        <div>
          <p className="panel-label">03 / Prepare an implementation handoff</p>
          <h3 id="a2a-handoff-title">Draft an A2A 1.0 Agent Card.</h3>
        </div>
        <span className="protocol-chip">A2A 1.0</span>
      </div>

      <p className="a2a-disclosure">
        Field Atlas maps the validated scenario to one discoverable skill. A
        runtime owner must declare the endpoint and capabilities; this browser
        does not probe a server, acquire credentials, or certify conformance.
      </p>

      <div className="a2a-grid">
        <form
          className="a2a-profile"
          onSubmit={event => event.preventDefault()}
        >
          <fieldset>
            <legend>Runtime-owner profile</legend>
            <p>
              These values describe the intended deployment. Never paste a
              token, password, or API key into this form.
            </p>

            <div className="a2a-fields">
              <label>
                <span>Agent name</span>
                <input
                  maxLength={240}
                  onChange={event =>
                    updateProfile("agentName", event.currentTarget.value)
                  }
                  type="text"
                  value={profile.agentName}
                />
              </label>

              <label>
                <span>Service endpoint</span>
                <input
                  autoComplete="url"
                  inputMode="url"
                  onChange={event =>
                    updateProfile("endpoint", event.currentTarget.value)
                  }
                  placeholder="https://agent.example.com/a2a"
                  type="url"
                  value={profile.endpoint}
                />
                <small>
                  HTTPS in production; loopback HTTP for local work.
                </small>
              </label>

              <label>
                <span>Agent version</span>
                <input
                  onChange={event =>
                    updateProfile("agentVersion", event.currentTarget.value)
                  }
                  placeholder="0.1.0"
                  type="text"
                  value={profile.agentVersion}
                />
              </label>

              <label>
                <span>Protocol binding</span>
                <select
                  onChange={event =>
                    updateProfile(
                      "binding",
                      event.currentTarget.value as A2AProtocolBinding
                    )
                  }
                  value={profile.binding}
                >
                  {protocolBindings.map(binding => (
                    <option key={binding} value={binding}>
                      {binding}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Security posture</span>
                <select
                  onChange={event =>
                    updateProfile(
                      "securityPosture",
                      event.currentTarget.value as A2ASecurityPosture
                    )
                  }
                  value={profile.securityPosture}
                >
                  <option value="bearer">Bearer (out of band)</option>
                  <option value="public">Public / no authentication</option>
                </select>
              </label>

              <label>
                <span>Input mode</span>
                <select
                  onChange={event =>
                    updateProfile("inputMode", event.currentTarget.value)
                  }
                  value={profile.inputMode}
                >
                  {mediaModes.map(mode => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Output mode</span>
                <select
                  onChange={event =>
                    updateProfile("outputMode", event.currentTarget.value)
                  }
                  value={profile.outputMode}
                >
                  {mediaModes.map(mode => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Provider organization</span>
                <input
                  onChange={event =>
                    updateProfile(
                      "providerOrganization",
                      event.currentTarget.value
                    )
                  }
                  placeholder="Samsarix LLC"
                  type="text"
                  value={profile.providerOrganization}
                />
              </label>

              <label>
                <span>Provider URL</span>
                <input
                  autoComplete="url"
                  inputMode="url"
                  onChange={event =>
                    updateProfile("providerUrl", event.currentTarget.value)
                  }
                  placeholder="https://samsarix.com"
                  type="url"
                  value={profile.providerUrl}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="capability-options">
            <legend>Declared capabilities</legend>
            <label>
              <input
                checked={profile.streaming}
                onChange={event =>
                  updateProfile("streaming", event.currentTarget.checked)
                }
                type="checkbox"
              />
              Streaming
            </label>
            <label>
              <input
                checked={profile.pushNotifications}
                onChange={event =>
                  updateProfile(
                    "pushNotifications",
                    event.currentTarget.checked
                  )
                }
                type="checkbox"
              />
              Push notifications
            </label>
          </fieldset>
        </form>

        <div className={`a2a-decision is-${analysis.status}`}>
          <div className="a2a-decision-heading">
            <div>
              <p className="panel-label">Draft readiness</p>
              <h4>
                {analysis.status === "invalid"
                  ? "Owner input required"
                  : analysis.status === "review"
                    ? "Ready with caveats"
                    : "Ready to hand off"}
              </h4>
            </div>
            <span className={`status-badge status-${analysis.status}`}>
              {analysis.status}
            </span>
          </div>

          <div
            aria-label="A2A handoff summary"
            className="result-counts a2a-counts"
            role="group"
          >
            <div>
              <strong>{analysis.counts.error}</strong>
              <span>Errors</span>
            </div>
            <div>
              <strong>{analysis.counts.warning}</strong>
              <span>Warnings</span>
            </div>
            <div>
              <strong>{analysis.counts.pass}</strong>
              <span>Checks</span>
            </div>
          </div>

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
              disabled={!analysis.agentCard}
              onClick={exportAgentCard}
              type="button"
            >
              Export draft Agent Card
            </button>
            <button
              className="button button-secondary"
              disabled={!analysis.agentCard}
              onClick={exportHandoff}
              type="button"
            >
              Export implementation checklist
            </button>
          </div>
        </div>
      </div>

      <p aria-live="polite" className="run-notice a2a-notice">
        {notice}
      </p>

      <A2AAcceptancePack agentCard={analysis.agentCard} blueprint={blueprint} />
    </section>
  );
}

export default A2AHandoff;
