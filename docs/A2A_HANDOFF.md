# A2A 1.0 deployment handoff

Field Atlas can turn a valid `samsarix-field-atlas/1` blueprint plus a runtime owner's declared deployment profile into a draft [A2A 1.0 Agent Card](https://github.com/a2aproject/A2A/blob/main/docs/specification.md). The result bridges pre-runtime coordination design to an implementation team without pretending that a server already exists.

## What this workflow does

1. Validate the source blueprint with the same semantic checker used by the browser and CI.
2. Ask the runtime owner for facts that the blueprint cannot know: service URL, protocol binding, version, media modes, security posture, provider identity, streaming, and push support.
3. Map the scenario objective to one A2A skill and create a standards-shaped draft Agent Card.
4. Export an implementation checklist that keeps human approvals, policy gates, and evidence requirements visible.
5. Hand the draft to the server owner for live implementation and official validation.

The browser performs all of this locally. It does not contact the declared endpoint.

## Why the owner profile is separate

The blueprint can truthfully provide a skill name, description, risk context, and evidence-aware coordination intent. It cannot infer whether a runtime is deployed, which binding it implements, how callers authenticate, or whether streaming and push notifications work.

| Source                | Draft Agent Card data                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Validated blueprint   | Skill ID, name, description, risk/evidence/human-governance tags                                                          |
| Runtime-owner profile | Agent name and version, interface URL and binding, media modes, declared capabilities, security scheme, provider identity |
| Not generated         | Credentials, proof of reachability, protocol responses, signatures, compatibility results                                 |

Field Atlas human, policy, memory, and evidence semantics are richer than the core discovery card. They remain authoritative in the source blueprint unless an implementation adopts a separately specified extension.

## A2A 1.0 alignment

The generated shape follows the 1.0 Agent Card structure:

- each entry in `supportedInterfaces` contains `url`, `protocolBinding`, and `protocolVersion`;
- the first interface is the preferred interface;
- the card declares identity, capabilities, version, default media modes, and at least one skill;
- a bearer profile declares the scheme and requirement but never includes a credential;
- a public profile omits authentication declarations and produces a review warning.

A2A recommends discovery through `https://{domain}/.well-known/agent-card.json`. Production HTTP-based bindings require HTTPS, and clients obtain credentials out of band. See the official [A2A 1.0 changes](https://a2a-protocol.org/latest/whats-new-v1/), [agent-discovery guidance](https://a2a-protocol.org/latest/topics/agent-discovery/), and [protocol specification](https://github.com/a2aproject/A2A/blob/main/docs/specification.md).

Field Atlas is not an official A2A schema validator, protocol client, Inspector, or Technology Compatibility Kit.

## Browser path

1. Open **Blueprint workbench**.
2. Check the current scenario or import a valid v1 blueprint.
3. Complete the **Runtime-owner profile** that appears below the readiness result.
4. Resolve errors and consciously review warnings.
5. Export **Draft Agent Card** and **Implementation checklist**.

The draft filename contains `draft` to prevent the local transformation from being mistaken for a deployed card.

## CLI path

Generate JSON on standard output while diagnostics go to standard error:

```bash
pnpm --silent blueprint:a2a examples/incident.blueprint.json \
  --endpoint https://agent.example.com/a2a \
  --agent-version 0.1.0 \
  --security bearer \
  --name "Incident Coordination Agent" \
  --provider-organization "Samsarix LLC" \
  --provider-url https://samsarix.com
```

Supported owner options are:

- `--binding HTTP+JSON|JSONRPC|GRPC`;
- `--input-mode` and `--output-mode` with media types;
- `--provider-organization` and `--provider-url`, which must be supplied together when provider identity should appear;
- `--streaming` and `--push-notifications`;
- `--check <expected.json>` for exact fixture comparison.

`--endpoint`, `--agent-version`, and `--security bearer|public` are required. JSON inputs are limited to 1 MiB. Diagnostics are sanitized before terminal output.

The committed incident mapping is checked in CI:

```bash
pnpm validate:a2a-example
```

This compares a deterministic transformation of `examples/incident.blueprint.json` with `examples/incident.a2a-agent-card.json`. It proves repository mapping stability, not live A2A compatibility.

## Required implementation evidence

Before removing the word “draft” or publishing a claim of compatibility, the runtime owner should:

- deploy the declared A2A 1.0 interface over TLS;
- serve the intended public card at `/.well-known/agent-card.json` or document the private discovery mechanism;
- implement the declared binding, media modes, streaming, and push behavior;
- acquire and transmit credentials out of band and enforce authorization server-side;
- decide whether public details need access controls, an authenticated extended card, signatures, caching, or an ETag;
- verify the running service with the official [A2A Inspector](https://github.com/a2aproject/a2a-inspector);
- run the official [A2A Technology Compatibility Kit](https://github.com/a2aproject/a2a-tck) against every declared interface;
- retain Field Atlas approval gates and evidence requirements in runtime policy and tests.

The Inspector can fetch a live card and perform basic card checks and interaction debugging. The TCK exercises a running system across declared transports and produces compatibility reports. Only those live results can support runtime compatibility claims.

## Security boundary

- Never place tokens, passwords, cookies, API keys, or authorization headers in a profile or Agent Card.
- Treat imported blueprints and all card strings as untrusted display data.
- HTTPS is required for production endpoints; plain HTTP is accepted only for explicit loopback development and produces a warning.
- URLs containing user information or fragments are blocked; query strings produce a review warning because they may accidentally carry secrets.
- Provider identity is all-or-nothing and requires an absolute HTTPS URL.
- A public security posture is never silently inferred and produces a warning, with stronger copy for high-risk scenarios.

No deployment, endpoint probe, credential acquisition, card signature, or conformance run is performed by Field Atlas.
