# Security policy

## Supported surface

Security reports are accepted for the current `main` branch. The product is a static local-first simulator and blueprint conformance workbench plus an optional Node.js static server.

## Reporting

Use GitHub's private security advisory flow for this repository. If private advisories are unavailable, email [support@samsarix.com](mailto:support@samsarix.com) with the subject `Security report: Samsarix Field Atlas`. Do not include live credentials, unnecessary personal data, or exploit data from systems you do not own. Do not publish exploit details in an issue.

Samsarix LLC will acknowledge a report within five business days and coordinate disclosure after a fix or mitigation is available.

## Trust boundaries

- Scenario definitions are repository-authored fixtures, not untrusted runtime input.
- Imported JSON is untrusted local input. The browser limits blueprints to 1 MiB and TCK reports to 5 MiB, requires valid UTF-8 JSON, validates bounded structures, and renders strings through React text nodes without persistence or execution.
- Markdown review packets escape imported metacharacters so blueprint strings cannot directly create links or remote images in the generated artifact.
- A2A deployment-profile values and generated Agent Card strings are untrusted local data. React renders them as text, Markdown output escapes metacharacters, and the browser never probes a declared endpoint.
- A2A profiles have no credential field. Endpoint URLs containing user information, query strings, or fragments are blocked, production endpoints require HTTPS, and bearer credentials remain out of band.
- A2A acceptance profiles, Agent Cards, and generated manifests are untrusted local data. Each CLI input is limited to a 1 MiB regular file, browser strings render as text, and Markdown exports escape imported metacharacters.
- Acceptance artifacts always remain `plan-not-run`; named evidence is a future requirement rather than proof that a test, approval, or TCK run occurred.
- TCK evidence receipts hash exact report bytes, omit raw errors/test IDs/embedded card contents, and reject likely secret-bearing run commands. Asserted revisions are not remotely verified, and receipt claims remain `not-determined` / `not-made` until accountable owner review.
- A2A review profiles are limited to 1 MiB and remain local. Evidence references accept bounded credential-free HTTPS URLs or URNs; HTTPS user information, queries, and fragments are rejected to reduce accidental credential and signed-URL capture.
- Review ledgers bind canonical plan/receipt JSON and the receipt's exact TCK-report digest, but they are not signatures. Named reviewers, decision owners, case outcomes, waivers, evidence references, and release decisions remain unauthenticated owner assertions.
- The browser stores only a scenario identifier in `localStorage`.
- JSON exports are produced locally and are not uploaded.
- External GitHub links are user-initiated navigation only.
- The optional Express server serves build artifacts and a fixed `/healthz` response; it has no write API or authentication surface.
- Human approval markers in a blueprint are descriptive. They do not grant authority or execute an action.

## Secure operating guidance

- Keep the default loopback bind for local evaluation.
- If binding `HOST=0.0.0.0`, place the server behind an owner-approved TLS and network boundary.
- Run `pnpm install --frozen-lockfile`, `pnpm audit --prod`, and `pnpm verify` before release.
- Treat every blueprint as user-controlled data when another system imports it; enforce a size limit, validate the schema and cross-field semantics, and never execute its strings as code or shell commands.
- Treat every Agent Card as untrusted input in downstream systems. Do not interpolate card strings into prompts, HTML, logs, shell commands, or network policy without context-appropriate validation and escaping.
- Treat acceptance manifests and attached runtime evidence as untrusted. Keep credentials and live payloads out of fixtures, redact reports, and bind any eventual signoff to exact implementation and test-tool revisions.
- Treat review profiles, ledgers, and Markdown packets as untrusted assertions. Verify referenced evidence, artifact digests, identities, decision authority, and signatures in an owner-controlled system before acting on a release decision.
- Never place a token, password, cookie, API key, authorization header, or signed URL in a Field Atlas A2A profile or generated card.
- Do not add secrets to `VITE_*` variables: Vite exposes those values to every browser.

## Data and cost posture

The shipped application performs no remote data collection and no paid API calls. Its steady-state operating cost is only the chosen static hosting or small Node process. Static hosting is the recommended path.
