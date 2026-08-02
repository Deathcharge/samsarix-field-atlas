import { useState, type ChangeEvent } from "react";

import {
  blueprintToMarkdown,
  validateBlueprint,
  type Blueprint,
  type BlueprintAnalysis,
} from "../blueprint";
import { readBlueprintFile } from "../blueprint-file";
import { downloadText } from "../download";
import { createBlueprint } from "../model";
import { createBlueprintSarif } from "../sarif";
import A2AHandoff from "./A2AHandoff";
import BlueprintSuiteWorkbench from "./BlueprintSuiteWorkbench";
import BlueprintSuiteDiffWorkbench from "./BlueprintSuiteDiffWorkbench";
import ScenarioEditor from "./ScenarioEditor";

function failedImport(message: string): BlueprintAnalysis {
  return {
    status: "invalid",
    counts: { error: 1, warning: 0, pass: 0 },
    findings: [
      {
        code: "IMPORT_FAILED",
        severity: "error",
        path: "$",
        message,
      },
    ],
  };
}

function statusCopy(status: BlueprintAnalysis["status"]) {
  return {
    invalid: {
      eyebrow: "Blocked",
      title: "The contract is not safe to rely on yet.",
      detail: "Fix the structural errors, then run the same file again.",
    },
    review: {
      eyebrow: "Review needed",
      title: "The contract is valid with explicit caveats.",
      detail:
        "Resolve or consciously accept each warning before implementation.",
    },
    ready: {
      eyebrow: "Ready for review",
      title: "The blueprint is internally consistent.",
      detail: "Field Atlas checked the contract—not the truth of its evidence.",
    },
  }[status];
}

function a2aHandoffKey(blueprint: Blueprint): string {
  return JSON.stringify({
    scenario: blueprint.scenario,
    agents: blueprint.agents,
    trace: blueprint.trace,
    runtime: blueprint.runtime,
  });
}

interface BlueprintWorkbenchProps {
  scenarioId: string;
}

function BlueprintWorkbench({ scenarioId }: BlueprintWorkbenchProps) {
  const [analysis, setAnalysis] = useState<BlueprintAnalysis | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [notice, setNotice] = useState(
    "Choose the current scenario or import a v1 JSON file. Validation stays in this browser."
  );

  function analyze(value: unknown, source: string) {
    const nextAnalysis = validateBlueprint(value);
    setAnalysis(nextAnalysis);
    setSourceName(source);
    setNotice(
      nextAnalysis.status === "invalid"
        ? `${source} is blocked by ${nextAnalysis.counts.error} contract ${nextAnalysis.counts.error === 1 ? "error" : "errors"}.`
        : `${source} checked locally. No data left this browser.`
    );
  }

  function checkCurrentScenario() {
    analyze(
      createBlueprint(scenarioId, new Date().toISOString()),
      "Current scenario"
    );
  }

  async function importBlueprint(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    const result = await readBlueprintFile(file);
    if (!result.ok && result.reason === "too-large") {
      const failure = failedImport("Blueprint files must be 1 MiB or smaller.");
      setAnalysis(failure);
      setSourceName(file.name);
      setNotice(`${file.name} exceeds the local import limit.`);
      return;
    }

    if (!result.ok) {
      const failure = failedImport(
        "The selected file must contain valid UTF-8 JSON."
      );
      setAnalysis(failure);
      setSourceName(file.name);
      setNotice(`${file.name} could not be parsed as UTF-8 JSON.`);
      return;
    }
    analyze(result.value, file.name);
  }

  function exportReviewPacket(blueprint: Blueprint) {
    try {
      downloadText(
        blueprintToMarkdown(blueprint, analysis ?? undefined),
        `samsarix-${blueprint.scenario.id}-review.md`,
        "text/markdown"
      );
      setNotice(
        "Review packet exported as Markdown. No data left this browser."
      );
    } catch {
      setNotice("The browser could not create the review packet.");
    }
  }

  function exportAnalyzedReviewPacket() {
    if (analysis?.blueprint) {
      exportReviewPacket(analysis.blueprint);
    }
  }

  async function exportSarifReport() {
    if (!analysis) return;
    try {
      const report = await createBlueprintSarif(analysis, {
        artifactUri: sourceName || "blueprint.json",
      });
      downloadText(
        `${JSON.stringify(report, null, 2)}\n`,
        `samsarix-${analysis.blueprint?.scenario.id ?? "blueprint"}-conformance.sarif.json`,
        "application/sarif+json"
      );
      setNotice("SARIF 2.1.0 report exported locally. Nothing was uploaded.");
    } catch {
      setNotice("The browser could not create the SARIF report.");
    }
  }

  const resultCopy = analysis ? statusCopy(analysis.status) : null;

  return (
    <section className="section workbench" id="workbench">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Blueprint workbench / local conformance</p>
          <h2>
            Turn a coordination idea into a contract your team can challenge.
          </h2>
        </div>
        <p>
          Import a <code>samsarix-field-atlas/1</code> blueprint or check the
          selected scenario. The workbench validates structure, role references,
          evidence declarations, authority gates, and honest runtime boundaries.
        </p>
      </div>

      <ScenarioEditor
        onUseBlueprint={blueprint =>
          analyze(blueprint, "Scenario Studio snapshot")
        }
        scenarioId={scenarioId}
      />

      <div className="workbench-shell">
        <div className="workbench-intake">
          <div>
            <p className="panel-label">01 / Supply a contract</p>
            <h3>Review before runtime.</h3>
            <p>
              Use the browser for design review, or run the same validator in CI
              before a blueprint becomes an implementation fixture.
            </p>
          </div>

          <div className="workbench-actions">
            <button
              className="button button-primary"
              onClick={checkCurrentScenario}
              type="button"
            >
              Check current scenario
            </button>
            <label className="button button-secondary file-button">
              Import JSON
              <input
                accept="application/json,.json"
                className="file-input"
                onChange={importBlueprint}
                type="file"
              />
            </label>
          </div>

          <div className="cli-card">
            <span>CI contract</span>
            <code>
              pnpm blueprint:validate examples/incident.blueprint.json
            </code>
            <small>Add --strict to fail on governance warnings.</small>
          </div>

          <ul className="workbench-uses" aria-label="Blueprint use cases">
            <li>Review a handoff design before choosing a runtime</li>
            <li>Catch missing authority and evidence declarations in CI</li>
            <li>Share a readable decision packet with non-runtime owners</li>
          </ul>
        </div>

        <div
          className={`workbench-result${analysis ? ` is-${analysis.status}` : ""}`}
        >
          {!analysis || !resultCopy ? (
            <div className="workbench-empty">
              <span aria-hidden="true">{"{ }"}</span>
              <p className="panel-label">02 / Read the decision</p>
              <h3>No contract loaded.</h3>
              <p>
                Your file is parsed in memory, checked locally, and never
                uploaded or stored by Field Atlas.
              </p>
            </div>
          ) : (
            <>
              <div className="result-heading">
                <div>
                  <p className="panel-label">02 / {resultCopy.eyebrow}</p>
                  <h3>{resultCopy.title}</h3>
                  <p>{resultCopy.detail}</p>
                </div>
                <span className={`status-badge status-${analysis.status}`}>
                  {analysis.status}
                </span>
              </div>

              <div
                aria-label="Conformance summary"
                className="result-counts"
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
                  <span>Passed checks</span>
                </div>
              </div>

              {analysis.metrics ? (
                <dl className="blueprint-metrics">
                  <div>
                    <dt>Roles</dt>
                    <dd>{analysis.metrics.roles}</dd>
                  </div>
                  <div>
                    <dt>Stages</dt>
                    <dd>{analysis.metrics.stages}</dd>
                  </div>
                  <div>
                    <dt>Human gates</dt>
                    <dd>{analysis.metrics.humanGates}</dd>
                  </div>
                  <div>
                    <dt>Evidence artifacts</dt>
                    <dd>{analysis.metrics.evidenceArtifacts}</dd>
                  </div>
                </dl>
              ) : null}

              <ol className="finding-list">
                {analysis.findings.map((finding, index) => (
                  <li
                    className={`finding finding-${finding.severity}`}
                    key={`${finding.code}-${finding.path}-${index}`}
                  >
                    <span>{finding.severity}</span>
                    <div>
                      <strong>{finding.code.replaceAll("_", " ")}</strong>
                      <code>{finding.path}</code>
                      <p>{finding.message}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="result-footer">
                <span>Source: {sourceName}</span>
                <div className="result-actions">
                  <button
                    className="button button-secondary"
                    onClick={exportSarifReport}
                    type="button"
                  >
                    Export SARIF
                  </button>
                  <button
                    className="button button-secondary"
                    disabled={!analysis.blueprint}
                    onClick={exportAnalyzedReviewPacket}
                    type="button"
                  >
                    Export review packet
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <BlueprintSuiteWorkbench />

      <BlueprintSuiteDiffWorkbench />

      <p aria-live="polite" className="run-notice workbench-notice">
        {notice}
      </p>

      {analysis?.blueprint ? (
        <A2AHandoff
          blueprint={analysis.blueprint}
          key={a2aHandoffKey(analysis.blueprint)}
        />
      ) : null}
    </section>
  );
}

export default BlueprintWorkbench;
