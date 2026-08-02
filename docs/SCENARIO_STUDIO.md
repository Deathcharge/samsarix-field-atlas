# Scenario Studio

Scenario Studio is the browser-only authoring path for a `samsarix-field-atlas/1` blueprint. It lets an evaluator adapt a bundled scenario to a real decision without hand-editing JSON, creating an account, choosing an agent runtime, or sending content to Samsarix.

## Why this exists

Repeatable evaluation products make user-owned examples a first-class workflow:

- [LangSmith](https://docs.langchain.com/langsmith/manage-datasets-in-application) supports creating examples from scratch, editing them in its UI, importing JSONL/CSV, and optionally validating them against a dataset schema.
- [Braintrust](https://www.braintrust.dev/docs/annotate/datasets) describes versioned test-case collections assembled through uploads, production traces, feedback, SDKs, or direct UI authoring.
- [Promptfoo](https://www.promptfoo.dev/docs/configuration/test-cases/) treats scenario variables and expected assertions as editable test-case data that can live inline or in portable CSV, JSON, JSONL, or YAML files.

Field Atlas deliberately does less: it authors one provider-neutral coordination contract locally. It does not collect production traces, generate test data with a model, run an evaluation, or become a hosted dataset system.

## Browser workflow

1. Choose the closest bundled scenario in the Field Lab.
2. Open **Scenario Studio** in the Blueprint workbench.
3. Edit the scenario identifier, risk, title, objective, and success criteria.
4. Add, remove, or reorder trace stages. Each stage selects one of the 13 bounded reference roles and names its action, boundary, and expected evidence.
5. Optionally adjust the illustrative baseline and outcome indicators. They remain explanatory values, not measurements.
6. Resolve live conformance errors. A high-risk scenario must include a human approval boundary; policy and memory omissions remain explicit review warnings.
7. Select **Use in workbench** to create a validated snapshot for review-packet, SARIF, and A2A handoff workflows, or select **Export blueprint JSON** to download the portable contract.

The editor preserves its in-memory draft if the Field Lab selection changes. Replacing the whole draft requires a second confirmation click when it has edits. A workbench handoff is a snapshot: later draft edits cannot silently change an A2A owner profile or acceptance workflow already in progress.

## Derived fields

The Studio owns only scenario-authoring decisions. It derives these contract fields so users cannot create contradictory bookkeeping through the form:

- `schemaVersion` is always `samsarix-field-atlas/1`;
- `mode` is always `illustrative-reference`;
- `agents` contains the reference-role declarations used by at least one stage;
- `trace[].order` is contiguous and one-based;
- `runtime.requiresHumanApprovalAt` exactly matches stages whose boundary is `human`;
- all runtime activity claims remain `false`.

The shared semantic validator remains authoritative. Browser authoring and imported or CLI-validated JSON therefore receive the same cross-field checks.

## Local state and proof boundary

Draft content exists only in React memory. It is not written to `localStorage`, cookies, a database, analytics, or a network request. Closing the page loses an unexported draft. The existing selected-scenario preference remains the only application value stored in `localStorage`.

An authored blueprint with status `ready` proves internal consistency only. Field Atlas does not prove that the scenario is complete, a role exists in a real organization, named evidence was produced, a person approved a gate, or an implementation behaved as described. Treat exports as untrusted text/data when another system imports or renders them.

## Intentional limits

- The Studio starts from a bundled scenario; it is not a free-form blank-canvas workflow.
- Stages use the 13 Samsarix reference roles. Custom role vocabularies can still be supplied as valid v1 JSON through the existing import/CLI path, but the guided editor does not define them.
- Draft history, collaboration, cloud persistence, production trace capture, synthetic generation, and runtime execution remain outside this reference product.
