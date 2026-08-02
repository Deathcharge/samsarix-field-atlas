import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

import BlueprintWorkbench from "../components/BlueprintWorkbench";
import {
  agents,
  createBlueprint,
  findAgent,
  findScenario,
  indicatorDetails,
  indicatorsAtProgress,
  layerDetails,
  layerOrder,
  scenarios,
  type AgentLayer,
} from "../model";

type RunStatus = "idle" | "running" | "complete" | "cancelled";

const storageKey = "samsarix-field-atlas:v1:scenario";

function initialScenarioId(): string {
  if (typeof window === "undefined") {
    return findScenario(null).id;
  }

  const queryValue = new URLSearchParams(window.location.search).get(
    "scenario"
  );
  if (scenarios.some(scenario => scenario.id === queryValue)) {
    return queryValue as string;
  }

  try {
    const storedValue = window.localStorage.getItem(storageKey);
    if (scenarios.some(scenario => scenario.id === storedValue)) {
      return storedValue as string;
    }
  } catch {
    // Storage can be disabled; the atlas remains fully usable without it.
  }

  return findScenario(null).id;
}

function layerCode(layer: AgentLayer): string {
  return {
    consciousness: "01",
    operational: "02",
    integration: "03",
  }[layer];
}

function Home() {
  const [selectedId, setSelectedId] = useState(initialScenarioId);
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const scenario = findScenario(selectedId);
  const activeAgentIds = useMemo(
    () => new Set(scenario.steps.map(step => step.agentId)),
    [scenario]
  );
  const progress =
    runStatus === "complete"
      ? 1
      : visibleSteps / Math.max(1, scenario.steps.length);
  const indicators = indicatorsAtProgress(scenario, progress);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, selectedId);
    } catch {
      // A remembered selection is optional device-local convenience.
    }

    const url = new URL(window.location.href);
    url.searchParams.set("scenario", selectedId);
    window.history.replaceState(null, "", url);
  }, [selectedId]);

  useEffect(() => {
    if (runStatus !== "running") {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const timer = window.setTimeout(
      () => {
        const nextStep = Math.min(visibleSteps + 1, scenario.steps.length);
        setVisibleSteps(nextStep);

        if (nextStep === scenario.steps.length) {
          setRunStatus("complete");
          setCompletedAt(new Date().toISOString());
          setNotice("Trace complete. The blueprint is ready to export.");
        }
      },
      prefersReducedMotion ? 40 : 420
    );

    return () => window.clearTimeout(timer);
  }, [runStatus, scenario.steps.length, visibleSteps]);

  function selectScenario(scenarioId: string) {
    setSelectedId(scenarioId);
    setRunStatus("idle");
    setVisibleSteps(0);
    setCompletedAt(null);
    setNotice("");
  }

  function startRun() {
    setRunStatus("running");
    setVisibleSteps(0);
    setCompletedAt(null);
    setNotice("Running a deterministic local trace.");
  }

  function cancelRun() {
    setRunStatus("cancelled");
    setNotice(
      `Trace cancelled after ${visibleSteps} of ${scenario.steps.length} stages.`
    );
  }

  function exportBlueprint() {
    if (!completedAt) {
      return;
    }

    try {
      const payload = createBlueprint(scenario.id, completedAt);
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `samsarix-${scenario.id}-blueprint.json`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setNotice("Blueprint exported. No data left this browser.");
    } catch {
      setNotice(
        "The browser could not create the export. Re-run the trace and try again."
      );
    }
  }

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Skip to the atlas
      </a>

      <header className="site-header">
        <a
          className="wordmark"
          href="#top"
          aria-label="Samsarix Field Atlas home"
        >
          <span className="wordmark-mark" aria-hidden="true">
            S/
          </span>
          <span>
            Samsarix <strong>Field Atlas</strong>
          </span>
        </a>
        <nav className="primary-nav" aria-label="Primary navigation">
          <a href="#lab">Field lab</a>
          <a href="#workbench">Workbench</a>
          <a href="#model">Role model</a>
          <a href="#protocol">Protocol</a>
          <a
            className="nav-github"
            href="https://github.com/Deathcharge/samsarix-field-atlas"
            rel="noreferrer"
            target="_blank"
          >
            Source ↗
          </a>
        </nav>
      </header>

      <main id="main-content">
        <section className="hero" id="top">
          <div className="hero-copy">
            <p className="eyebrow">A local-first coordination reference</p>
            <h1>
              Trace the handoffs <span>before you trust the system.</span>
            </h1>
            <p className="hero-lede">
              Explore Samsarix&apos;s 13-role model through deterministic
              scenarios. See who acts, where approval is required, what evidence
              survives, and what never leaves your browser.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#lab">
                Run a scenario <span aria-hidden="true">↓</span>
              </a>
              <a className="button button-secondary" href="#protocol">
                Read the contract
              </a>
            </div>
            <ul className="proof-strip" aria-label="Runtime guarantees">
              <li>
                <span className="proof-dot" /> No API key
              </li>
              <li>
                <span className="proof-dot" /> No agent execution
              </li>
              <li>
                <span className="proof-dot" /> Exportable JSON
              </li>
            </ul>
          </div>

          <div className="hero-orbit" aria-label="Three-layer role model">
            <div className="orbit-grid" aria-hidden="true" />
            <div className="orbit-ring orbit-ring-outer" aria-hidden="true" />
            <div className="orbit-ring orbit-ring-middle" aria-hidden="true" />
            <div className="orbit-core">
              <span>13</span>
              <small>bounded roles</small>
            </div>
            <div className="orbit-node orbit-node-a">Intent</div>
            <div className="orbit-node orbit-node-b">Action</div>
            <div className="orbit-node orbit-node-c">Memory</div>
            <div className="orbit-caption">
              <span>illustrative model</span>
              <strong>Human authority remains outside the loop.</strong>
            </div>
          </div>
        </section>

        <section className="truth-band" aria-label="Product scope">
          <p>
            <strong>This is a reference simulator.</strong> It does not connect
            to an external runtime, run language models, report production
            status, or represent live telemetry.
          </p>
        </section>

        <section className="section field-lab" id="lab">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Field lab / deterministic</p>
              <h2>Follow one decision from ambiguity to evidence.</h2>
            </div>
            <p>
              Pick a scenario, run its trace, inspect the boundary at every
              handoff, then export the result as a portable blueprint.
            </p>
          </div>

          <div className="lab-grid">
            <aside className="scenario-panel" aria-label="Scenario selection">
              <p className="panel-label">01 / Choose the pressure</p>
              <div
                aria-label="Coordination scenarios"
                className="scenario-list"
                role="radiogroup"
              >
                {scenarios.map((candidate, index) => {
                  const selected = candidate.id === scenario.id;
                  return (
                    <label
                      className={`scenario-option${selected ? " is-selected" : ""}`}
                      key={candidate.id}
                    >
                      <input
                        checked={selected}
                        name="scenario"
                        onChange={() => selectScenario(candidate.id)}
                        type="radio"
                        value={candidate.id}
                      />
                      <span className="scenario-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>
                        <small>{candidate.eyebrow}</small>
                        <strong>{candidate.title}</strong>
                        <span>{candidate.summary}</span>
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="scenario-brief">
                <div>
                  <span>Risk</span>
                  <strong className={`risk risk-${scenario.risk}`}>
                    {scenario.risk}
                  </strong>
                </div>
                <p>{scenario.objective}</p>
                <details>
                  <summary>Acceptance criteria</summary>
                  <ul>
                    {scenario.successCriteria.map(criterion => (
                      <li key={criterion}>{criterion}</li>
                    ))}
                  </ul>
                </details>
              </div>
            </aside>

            <div className="trace-panel">
              <div className="trace-toolbar">
                <div>
                  <p className="panel-label">02 / Inspect the route</p>
                  <h3>{scenario.title}</h3>
                </div>
                <div className="trace-actions">
                  {runStatus === "running" ? (
                    <button
                      className="button button-danger"
                      onClick={cancelRun}
                      type="button"
                    >
                      Cancel trace
                    </button>
                  ) : (
                    <button
                      className="button button-primary"
                      onClick={startRun}
                      type="button"
                    >
                      {runStatus === "idle" ? "Run trace" : "Run again"}
                    </button>
                  )}
                  <button
                    className="button button-secondary"
                    disabled={runStatus !== "complete"}
                    onClick={exportBlueprint}
                    type="button"
                  >
                    Export JSON
                  </button>
                </div>
              </div>

              <div className="progress-shell">
                <div className="progress-label">
                  <span>
                    {runStatus === "idle" && "Ready to simulate"}
                    {runStatus === "running" &&
                      `Stage ${Math.min(visibleSteps + 1, scenario.steps.length)} of ${scenario.steps.length}`}
                    {runStatus === "complete" && "Trace complete"}
                    {runStatus === "cancelled" && "Trace cancelled"}
                  </span>
                  <span>{Math.round(progress * 100)}%</span>
                </div>
                <div
                  aria-label="Trace progress"
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={Math.round(progress * 100)}
                  className="progress-track"
                  role="progressbar"
                >
                  <span style={{ width: `${progress * 100}%` }} />
                </div>
              </div>

              <div className="trace-layout">
                <ol className="trace-list">
                  {scenario.steps.map((step, index) => {
                    const agent = findAgent(step.agentId);
                    const complete = index < visibleSteps;
                    const current =
                      runStatus === "running" && index === visibleSteps;
                    return (
                      <li
                        className={`trace-step${complete ? " is-complete" : ""}${current ? " is-current" : ""}`}
                        key={`${scenario.id}-${step.agentId}-${index}`}
                      >
                        <div className="trace-marker">
                          <span>{complete ? "✓" : index + 1}</span>
                        </div>
                        <div className="trace-copy">
                          <div className="trace-meta">
                            <span>{agent.name}</span>
                            <span>{layerDetails[agent.layer].label}</span>
                            {step.boundary && (
                              <span
                                className={`boundary boundary-${step.boundary}`}
                              >
                                {step.boundary} boundary
                              </span>
                            )}
                          </div>
                          <h4>{step.title}</h4>
                          <p>{step.detail}</p>
                          <small>Evidence: {step.evidence}</small>
                        </div>
                      </li>
                    );
                  })}
                </ol>

                <aside className="indicator-panel">
                  <p className="panel-label">Illustrative indicators</p>
                  <p className="indicator-note">
                    These values explain the model&apos;s intended direction.
                    They are not measurements or telemetry.
                  </p>
                  <div className="indicator-list">
                    {indicatorDetails.map(indicator => {
                      const value = indicators[indicator.key];
                      return (
                        <div className="indicator" key={indicator.key}>
                          <div>
                            <span>{indicator.label}</span>
                            <strong>{value.toFixed(2)}</strong>
                          </div>
                          <small>
                            {indicator.definition} ·{" "}
                            {indicator.direction === "up" ? "higher" : "lower"}{" "}
                            is better
                          </small>
                          <div className="indicator-track">
                            <span
                              style={
                                {
                                  "--indicator-value": `${value * 100}%`,
                                } as CSSProperties
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </aside>
              </div>

              <p aria-live="polite" className="run-notice">
                {notice ||
                  "Nothing runs until you choose Run trace. The simulation is local and deterministic."}
              </p>
            </div>
          </div>
        </section>

        <BlueprintWorkbench scenarioId={scenario.id} />

        <section className="section role-model" id="model">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Role model / complete inventory</p>
              <h2>Thirteen roles. Three layers. One accountable handoff.</h2>
            </div>
            <p>
              The selected scenario highlights only the roles it needs. A role
              describes a responsibility—not a claim of autonomy or
              consciousness.
            </p>
          </div>

          <div className="layer-stack">
            {layerOrder.map(layer => (
              <section className="layer-row" key={layer}>
                <div className="layer-heading">
                  <span>{layerCode(layer)}</span>
                  <div>
                    <h3>{layerDetails[layer].label}</h3>
                    <p>{layerDetails[layer].purpose}</p>
                  </div>
                </div>
                <div className="agent-grid">
                  {agents
                    .filter(agent => agent.layer === layer)
                    .map(agent => (
                      <article
                        className={`agent-card${activeAgentIds.has(agent.id) ? " is-active" : ""}`}
                        key={agent.id}
                      >
                        <div className="agent-topline">
                          <span className="agent-mark">{agent.mark}</span>
                          <span>
                            {activeAgentIds.has(agent.id)
                              ? "in this route"
                              : "available role"}
                          </span>
                        </div>
                        <h4>{agent.name}</h4>
                        <strong>{agent.role}</strong>
                        <p>{agent.responsibility}</p>
                      </article>
                    ))}
                </div>
              </section>
            ))}
          </div>
        </section>

        <section className="section protocol" id="protocol">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Reference contract / v1</p>
              <h2>A useful trace names its limits.</h2>
            </div>
            <p>
              The export is deliberately implementation-neutral: it can inform a
              human process, a test fixture, or an agent runtime without
              pretending those systems are present here.
            </p>
          </div>

          <div className="protocol-grid">
            <article>
              <span>01</span>
              <h3>Input is bounded</h3>
              <p>
                Every scenario states its objective, risk, acceptance criteria,
                and assumptions before a role acts.
              </p>
              <code>scenario.objective</code>
            </article>
            <article>
              <span>02</span>
              <h3>Authority is visible</h3>
              <p>
                Human, policy, tool, and memory boundaries stay attached to the
                exact handoff where they matter.
              </p>
              <code>trace[].boundary</code>
            </article>
            <article>
              <span>03</span>
              <h3>Evidence survives</h3>
              <p>
                Each stage names the artifact a real implementation would need
                to produce before advancing.
              </p>
              <code>trace[].evidence</code>
            </article>
            <article>
              <span>04</span>
              <h3>Runtime claims are explicit</h3>
              <p>
                The blueprint declares that this simulator executes no agents,
                calls no external service, and stores no remote data.
              </p>
              <code>runtime.executesAgents</code>
            </article>
          </div>

          <div className="scope-grid">
            <div>
              <p className="panel-label">What ships here</p>
              <ul>
                <li>Deterministic scenario traces</li>
                <li>Complete 13-role reference</li>
                <li>Local device preference only</li>
                <li>Portable JSON blueprint</li>
                <li>A2A handoff, acceptance, and evidence receipts</li>
                <li>Static deployment build</li>
              </ul>
            </div>
            <div>
              <p className="panel-label">Deliberately out of scope</p>
              <ul>
                <li>LLM or external API calls</li>
                <li>Live agent status or telemetry</li>
                <li>Authentication or user accounts</li>
                <li>Cloud persistence and analytics</li>
                <li>Production control actions</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="closing-callout">
          <p className="eyebrow">Neti neti / not this, not that</p>
          <h2>A map is useful because it admits it is not the territory.</h2>
          <p>
            Use the atlas to evaluate a coordination design, teach the role
            model, or draft a fixture. Use a real runtime—with authentication,
            guardrails, observability, and owner-approved infrastructure—to
            execute work.
          </p>
          <a
            className="button button-primary"
            href="https://github.com/Deathcharge/samsarix-field-atlas"
            rel="noreferrer"
            target="_blank"
          >
            Inspect the source ↗
          </a>
        </section>
      </main>

      <footer className="site-footer">
        <div>
          <span className="wordmark-mark" aria-hidden="true">
            S/
          </span>
          <p>
            Samsarix Field Atlas
            <small>Local-first coordination reference · Samsarix LLC</small>
          </p>
        </div>
        <p>
          No tracking. No remote storage. No live-system claims.
          <br />
          AGPL-3.0-only · Commercial licensing:{" "}
          <a href="mailto:contact@samsarix.com">contact@samsarix.com</a>
        </p>
      </footer>
    </div>
  );
}

export default Home;
