import { useMemo, useRef, useState } from "react";

import { validateBlueprint, type Blueprint } from "../blueprint";
import { downloadText } from "../download";
import { agents, layerDetails, layerOrder } from "../model";
import {
  createScenarioDraft,
  moveScenarioItem,
  scenarioDraftToBlueprint,
  type ScenarioDraft,
} from "../scenario-editor";

const indicatorFields = [
  ["harmony", "Harmony"],
  ["resilience", "Resilience"],
  ["prana", "Prana"],
  ["drishti", "Drishti"],
  ["klesha", "Klesha"],
] as const;

const boundaryOptions: Array<{
  value: Blueprint["trace"][number]["boundary"];
  label: string;
}> = [
  { value: null, label: "No explicit boundary" },
  { value: "human", label: "Human approval" },
  { value: "policy", label: "Policy" },
  { value: "tool", label: "Tool" },
  { value: "memory", label: "Memory" },
];

interface ScenarioEditorProps {
  scenarioId: string;
  onUseBlueprint: (blueprint: Blueprint) => void;
}

function ScenarioEditor({ scenarioId, onUseBlueprint }: ScenarioEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<ScenarioDraft>(() =>
    createScenarioDraft(scenarioId)
  );
  const [sourceScenarioId, setSourceScenarioId] = useState(scenarioId);
  const [dirty, setDirty] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [notice, setNotice] = useState(
    "Drafts stay in memory until you export or hand off a snapshot."
  );
  const nextDraftKey = useRef(1);

  const previewBlueprint = useMemo(
    () => scenarioDraftToBlueprint(draft, "2000-01-01T00:00:00.000Z"),
    [draft]
  );
  const analysis = useMemo(
    () => validateBlueprint(previewBlueprint),
    [previewBlueprint]
  );
  const actionableFindings = analysis.findings.filter(
    finding => finding.severity !== "pass"
  );
  const invalidPaths = useMemo(
    () =>
      new Set(
        analysis.findings
          .filter(finding => finding.severity === "error")
          .map(finding => finding.path)
      ),
    [analysis.findings]
  );
  const selectedScenarioChanged = sourceScenarioId !== scenarioId;

  function changeDraft(update: (current: ScenarioDraft) => ScenarioDraft) {
    setResetArmed(false);
    setDirty(true);
    setDraft(current => update(current));
  }

  function replaceWithSelectedScenario() {
    if (dirty && !resetArmed) {
      setResetArmed(true);
      setNotice(
        "This replaces the in-memory draft. Select the replace button again to confirm."
      );
      return;
    }

    setDraft(createScenarioDraft(scenarioId));
    setSourceScenarioId(scenarioId);
    setDirty(false);
    setResetArmed(false);
    setNotice("The selected bundled scenario is now the editable draft.");
  }

  function freshValidBlueprint(): Blueprint | null {
    const candidate = scenarioDraftToBlueprint(draft, new Date().toISOString());
    return validateBlueprint(candidate).blueprint ?? null;
  }

  function useInWorkbench() {
    const blueprint = freshValidBlueprint();
    if (!blueprint) {
      setNotice(
        "Resolve the blocking contract errors before creating a snapshot."
      );
      return;
    }

    onUseBlueprint(blueprint);
    setNotice(
      "A validated snapshot is now in the workbench. Later draft edits do not change that snapshot."
    );
  }

  function exportBlueprint() {
    const blueprint = freshValidBlueprint();
    if (!blueprint) {
      setNotice("Resolve the blocking contract errors before exporting JSON.");
      return;
    }

    try {
      downloadText(
        `${JSON.stringify(blueprint, null, 2)}\n`,
        `samsarix-${blueprint.scenario.id}-blueprint.json`,
        "application/json"
      );
      setNotice("Scenario blueprint exported locally. Nothing was uploaded.");
    } catch {
      setNotice("The browser could not create the scenario export.");
    }
  }

  function updateCriterion(index: number, value: string) {
    changeDraft(current => ({
      ...current,
      successCriteria: current.successCriteria.map((criterion, position) =>
        position === index ? { ...criterion, value } : criterion
      ),
    }));
  }

  function addCriterion() {
    if (draft.successCriteria.length >= 32) return;
    const draftKey = `criterion-new-${nextDraftKey.current++}`;
    changeDraft(current => ({
      ...current,
      successCriteria: [...current.successCriteria, { draftKey, value: "" }],
    }));
  }

  function removeCriterion(index: number) {
    if (draft.successCriteria.length === 1) return;
    changeDraft(current => ({
      ...current,
      successCriteria: current.successCriteria.filter(
        (_, position) => position !== index
      ),
    }));
  }

  function updateStep(
    index: number,
    update: Partial<ScenarioDraft["steps"][number]>
  ) {
    changeDraft(current => ({
      ...current,
      steps: current.steps.map((step, position) =>
        position === index ? { ...step, ...update } : step
      ),
    }));
  }

  function addStep() {
    if (draft.steps.length >= 128) return;
    const defaultAgent = agents.at(0);
    if (!defaultAgent) return;
    const draftKey = `step-new-${nextDraftKey.current++}`;
    changeDraft(current => ({
      ...current,
      steps: [
        ...current.steps,
        {
          draftKey,
          agentId: defaultAgent.id,
          title: "",
          action: "",
          boundary: null,
          evidence: "",
        },
      ],
    }));
  }

  function removeStep(index: number) {
    if (draft.steps.length === 1) return;
    changeDraft(current => ({
      ...current,
      steps: current.steps.filter((_, position) => position !== index),
    }));
  }

  function moveStep(index: number, direction: -1 | 1) {
    changeDraft(current => ({
      ...current,
      steps: moveScenarioItem(current.steps, index, direction),
    }));
  }

  if (!isOpen) {
    return (
      <section className="scenario-studio scenario-studio-closed">
        <div>
          <p className="panel-label">Scenario Studio / local authoring</p>
          <h3>Adapt the model to a real decision.</h3>
          <p>
            Clone a bundled route, edit its success conditions and handoffs,
            then validate the same portable contract used by the workbench and
            CLI.
          </p>
        </div>
        <button
          className="button button-primary"
          onClick={() => setIsOpen(true)}
          type="button"
        >
          Open Scenario Studio
        </button>
      </section>
    );
  }

  return (
    <section
      className="scenario-studio"
      aria-labelledby="scenario-studio-title"
    >
      <div className="studio-heading">
        <div>
          <p className="panel-label">Scenario Studio / local authoring</p>
          <h3 id="scenario-studio-title">Build a challengeable scenario.</h3>
          <p>
            The Studio derives role declarations, stage order, human approval
            positions, and honest no-runtime claims. Your job is to name the
            decision, route, evidence, and boundaries.
          </p>
        </div>
        <div className="studio-heading-actions">
          <span className={`status-badge status-${analysis.status}`}>
            {analysis.status}
          </span>
          <button
            className="button button-secondary"
            onClick={() => setIsOpen(false)}
            type="button"
          >
            Close editor
          </button>
        </div>
      </div>

      <div className="studio-source-bar">
        <div>
          <strong>Draft source: {sourceScenarioId.replaceAll("-", " ")}</strong>
          <span>
            {selectedScenarioChanged
              ? "The Field Lab selection changed. Your draft was preserved."
              : "Based on the selected Field Lab scenario."}
          </span>
        </div>
        <button
          className={`button ${resetArmed ? "button-danger" : "button-secondary"}`}
          onClick={replaceWithSelectedScenario}
          type="button"
        >
          {resetArmed
            ? "Confirm replace draft"
            : "Replace with selected scenario"}
        </button>
      </div>

      <form className="studio-form" onSubmit={event => event.preventDefault()}>
        <fieldset className="studio-section">
          <legend>01 / Decision contract</legend>
          <p>
            Use an implementation-neutral identifier and observable success
            conditions. High-risk scenarios require at least one human boundary.
          </p>
          <div className="studio-fields studio-fields-contract">
            <label>
              <span>Scenario ID</span>
              <input
                aria-invalid={invalidPaths.has("$.scenario.id")}
                maxLength={128}
                onChange={event =>
                  changeDraft(current => ({
                    ...current,
                    id: event.target.value,
                  }))
                }
                pattern="[a-z][a-z0-9-]*"
                required
                value={draft.id}
              />
              <small>
                Lowercase letters, numbers, and hyphens; begin with a letter.
              </small>
            </label>
            <label>
              <span>Risk</span>
              <select
                onChange={event =>
                  changeDraft(current => ({
                    ...current,
                    risk: event.target.value as ScenarioDraft["risk"],
                  }))
                }
                value={draft.risk}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label>
              <span>Title</span>
              <input
                aria-invalid={invalidPaths.has("$.scenario.title")}
                maxLength={240}
                onChange={event =>
                  changeDraft(current => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                required
                value={draft.title}
              />
            </label>
            <label>
              <span>Objective</span>
              <textarea
                aria-invalid={invalidPaths.has("$.scenario.objective")}
                maxLength={2000}
                onChange={event =>
                  changeDraft(current => ({
                    ...current,
                    objective: event.target.value,
                  }))
                }
                required
                rows={3}
                value={draft.objective}
              />
            </label>
          </div>

          <div className="studio-list-heading">
            <div>
              <strong>Success criteria</strong>
              <span>{draft.successCriteria.length} of 32</span>
            </div>
            <button
              className="button button-secondary button-compact"
              disabled={draft.successCriteria.length >= 32}
              onClick={addCriterion}
              type="button"
            >
              Add criterion
            </button>
          </div>
          <ol className="studio-criteria-list">
            {draft.successCriteria.map((criterion, index) => (
              <li key={criterion.draftKey}>
                <label>
                  <span className="sr-only">Success criterion {index + 1}</span>
                  <input
                    aria-invalid={invalidPaths.has(
                      `$.scenario.successCriteria[${index}]`
                    )}
                    maxLength={500}
                    onChange={event =>
                      updateCriterion(index, event.target.value)
                    }
                    placeholder="Name an observable condition"
                    required
                    value={criterion.value}
                  />
                </label>
                <button
                  aria-label={`Remove success criterion ${index + 1}`}
                  className="studio-icon-button"
                  disabled={draft.successCriteria.length === 1}
                  onClick={() => removeCriterion(index)}
                  type="button"
                >
                  Remove
                </button>
              </li>
            ))}
          </ol>
        </fieldset>

        <fieldset className="studio-section">
          <legend>02 / Ordered handoffs</legend>
          <p>
            Select from the bounded Samsarix role catalog. Each stage must name
            what happens and the evidence a real implementation would retain.
          </p>
          <div className="studio-list-heading">
            <div>
              <strong>Trace stages</strong>
              <span>{draft.steps.length} of 128</span>
            </div>
            <button
              className="button button-secondary button-compact"
              disabled={draft.steps.length >= 128}
              onClick={addStep}
              type="button"
            >
              Add stage
            </button>
          </div>

          <ol className="studio-step-list">
            {draft.steps.map((step, index) => (
              <li className="studio-step" key={step.draftKey}>
                <div className="studio-step-heading">
                  <strong>Stage {index + 1}</strong>
                  <div>
                    <button
                      aria-label={`Move stage ${index + 1} earlier`}
                      className="studio-icon-button"
                      disabled={index === 0}
                      onClick={() => moveStep(index, -1)}
                      type="button"
                    >
                      ↑ Earlier
                    </button>
                    <button
                      aria-label={`Move stage ${index + 1} later`}
                      className="studio-icon-button"
                      disabled={index === draft.steps.length - 1}
                      onClick={() => moveStep(index, 1)}
                      type="button"
                    >
                      ↓ Later
                    </button>
                    <button
                      aria-label={`Remove stage ${index + 1}`}
                      className="studio-icon-button studio-remove-button"
                      disabled={draft.steps.length === 1}
                      onClick={() => removeStep(index)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="studio-fields studio-step-fields">
                  <label>
                    <span>Role</span>
                    <select
                      aria-invalid={invalidPaths.has(
                        `$.trace[${index}].agentId`
                      )}
                      onChange={event =>
                        updateStep(index, { agentId: event.target.value })
                      }
                      value={step.agentId}
                    >
                      {layerOrder.map(layer => (
                        <optgroup label={layerDetails[layer].label} key={layer}>
                          {agents
                            .filter(agent => agent.layer === layer)
                            .map(agent => (
                              <option key={agent.id} value={agent.id}>
                                {agent.name} — {agent.role}
                              </option>
                            ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Boundary</span>
                    <select
                      aria-invalid={invalidPaths.has(
                        `$.trace[${index}].boundary`
                      )}
                      onChange={event =>
                        updateStep(index, {
                          boundary: (event.target.value ||
                            null) as ScenarioDraft["steps"][number]["boundary"],
                        })
                      }
                      value={step.boundary ?? ""}
                    >
                      {boundaryOptions.map(option => (
                        <option
                          key={option.value ?? "none"}
                          value={option.value ?? ""}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Stage title</span>
                    <input
                      aria-invalid={invalidPaths.has(`$.trace[${index}].title`)}
                      maxLength={500}
                      onChange={event =>
                        updateStep(index, { title: event.target.value })
                      }
                      required
                      value={step.title}
                    />
                  </label>
                  <label>
                    <span>Action</span>
                    <textarea
                      aria-invalid={invalidPaths.has(
                        `$.trace[${index}].action`
                      )}
                      maxLength={4000}
                      onChange={event =>
                        updateStep(index, { action: event.target.value })
                      }
                      required
                      rows={3}
                      value={step.action}
                    />
                  </label>
                  <label>
                    <span>Expected evidence</span>
                    <textarea
                      aria-invalid={invalidPaths.has(
                        `$.trace[${index}].evidence`
                      )}
                      maxLength={2000}
                      onChange={event =>
                        updateStep(index, { evidence: event.target.value })
                      }
                      required
                      rows={2}
                      value={step.evidence}
                    />
                  </label>
                </div>
              </li>
            ))}
          </ol>
        </fieldset>

        <details className="studio-indicators">
          <summary>03 / Illustrative indicator direction</summary>
          <p>
            These values explain the intended direction of the reference model.
            They are never presented as measurements or live telemetry.
          </p>
          <div className="studio-indicator-grid">
            {indicatorFields.map(([key, label]) => (
              <div key={key}>
                <strong>{label}</strong>
                <div className="studio-indicator-row">
                  <label>
                    <span>Baseline</span>
                    <input
                      max="1"
                      min="0"
                      onChange={event =>
                        changeDraft(current => ({
                          ...current,
                          indicators: {
                            ...current.indicators,
                            baseline: {
                              ...current.indicators.baseline,
                              [key]: Number(event.target.value),
                            },
                          },
                        }))
                      }
                      step="0.01"
                      type="range"
                      value={draft.indicators.baseline[key]}
                    />
                  </label>
                  <output>{draft.indicators.baseline[key].toFixed(2)}</output>
                </div>
                <div className="studio-indicator-row">
                  <label>
                    <span>Outcome</span>
                    <input
                      max="1"
                      min="0"
                      onChange={event =>
                        changeDraft(current => ({
                          ...current,
                          indicators: {
                            ...current.indicators,
                            outcome: {
                              ...current.indicators.outcome,
                              [key]: Number(event.target.value),
                            },
                          },
                        }))
                      }
                      step="0.01"
                      type="range"
                      value={draft.indicators.outcome[key]}
                    />
                  </label>
                  <output>{draft.indicators.outcome[key].toFixed(2)}</output>
                </div>
              </div>
            ))}
          </div>
        </details>
      </form>

      <div className={`studio-validation is-${analysis.status}`}>
        <div>
          <p className="panel-label">Live contract check</p>
          <h4>
            {analysis.status === "ready" && "Ready to snapshot"}
            {analysis.status === "review" && "Valid with review items"}
            {analysis.status === "invalid" && "Blocked by contract errors"}
          </h4>
          <p aria-live="polite">
            {analysis.counts.error} errors · {analysis.counts.warning} warnings
            · {analysis.counts.pass} passed checks
          </p>
        </div>
        {actionableFindings.length > 0 ? (
          <ul>
            {actionableFindings.slice(0, 6).map(finding => (
              <li key={`${finding.code}-${finding.path}`}>
                <strong>{finding.code.replaceAll("_", " ")}</strong>
                <span>{finding.message}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            Stage order, role references, evidence declarations, and human
            approval positions are internally consistent.
          </p>
        )}
        <div className="studio-export-actions">
          <button
            className="button button-primary"
            disabled={!analysis.blueprint}
            onClick={useInWorkbench}
            type="button"
          >
            Use in workbench
          </button>
          <button
            className="button button-secondary"
            disabled={!analysis.blueprint}
            onClick={exportBlueprint}
            type="button"
          >
            Export blueprint JSON
          </button>
        </div>
      </div>

      <p aria-live="polite" className="run-notice studio-notice">
        {notice}
      </p>
    </section>
  );
}

export default ScenarioEditor;
