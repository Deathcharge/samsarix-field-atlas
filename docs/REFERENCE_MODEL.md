# Samsarix Field Atlas reference model

## Status

This document describes the `samsarix-field-atlas/1` illustrative blueprint. It is a stable evaluation contract for this repository, not a universal multi-agent standard and not an execution protocol.

The complete machine-readable shape is [`schema/samsarix-field-atlas.v1.schema.json`](../schema/samsarix-field-atlas.v1.schema.json). Cross-field semantics and CLI behavior are documented in [Blueprint conformance](BLUEPRINT_CONFORMANCE.md).

## Roles and layers

The model groups 13 responsibilities into three layers:

- **Consciousness:** Kael, Lumina, Aether, and Vega frame intent, impact, flow, and safety.
- **Operational:** Grok, Manus, Kavach, Gemini, and Agni gather evidence and shape bounded action.
- **Integration:** SanghaCore, Shadow, Blackbox, and EntityX reconcile, record, remember, and challenge closure.

A role is a responsibility label. A real implementation may assign several roles to one person or process, or split one role among several components.

## Trace contract

Every stage contains:

- `order`: one-based stage order;
- `agentId`: stable role identifier;
- `title`: concise intended outcome;
- `action`: the bounded responsibility;
- `boundary`: `human`, `policy`, `tool`, `memory`, or `null`;
- `evidence`: the artifact a real implementation must produce before relying on the stage.

Human boundaries are intentionally outside the simulated role loop. The presence of a human marker is not evidence that approval occurred.

## Indicators

The bundled scenarios use five values from 0 to 1 to make the intended direction legible:

| Indicator  | Plain-language meaning | Desired direction |
| ---------- | ---------------------- | ----------------- |
| Harmony    | Decision coherence     | Higher            |
| Resilience | Guardrail coverage     | Higher            |
| Prana      | Execution capacity     | Higher            |
| Drishti    | Focus and clarity      | Higher            |
| Klesha     | Unresolved friction    | Lower             |

These are fixture values. They are not scientific measurements, runtime observations, performance claims, or a scoring system for people.

## Contract shape

The following excerpt is intentionally abridged. Use the complete, strict-valid [`examples/incident.blueprint.json`](../examples/incident.blueprint.json) as an implementation fixture.

```json
{
  "schemaVersion": "samsarix-field-atlas/1",
  "mode": "illustrative-reference",
  "generatedAt": "2026-07-28T12:00:00.000Z",
  "scenario": {
    "id": "breaking-change",
    "title": "Ship a breaking change",
    "risk": "high"
  },
  "trace": [
    {
      "order": 1,
      "agentId": "gemini",
      "boundary": "tool",
      "evidence": "Interface inventory + compatibility evidence"
    }
  ],
  "runtime": {
    "executesAgents": false,
    "callsExternalServices": false,
    "storesRemoteData": false,
    "requiresHumanApprovalAt": [5, 7]
  }
}
```

## Compatibility

Consumers should reject unknown major schema versions and tolerate unknown additive fields within version 1. The reference validator reports additive fields as warnings so an owner can confirm their meaning. Consumers must treat every string as untrusted data, validate array sizes, and never evaluate or execute exported content.

The canonical serializer lives in `client/src/model.ts`; the shared TypeScript definitions, semantic validator, and review-packet generator live in `client/src/blueprint.ts`. They are protected by the model and application test suites.

When several blueprints must remain conformant under one policy, use the separate [`samsarix-field-atlas/suite/1`](BLUEPRINT_SUITES.md) manifest. A suite groups blueprint artifacts but does not change, extend, or execute the v1 blueprint contract.

When a candidate collection must be reviewed against a known report baseline, use the separate [`samsarix-field-atlas/suite-diff/1`](BLUEPRINT_SUITES.md#baseline-comparison) artifact. It aligns report cases by stable entry ID and classifies conformance drift without changing either blueprint, re-running a target, or making a release decision.
