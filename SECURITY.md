# Security policy

## Supported surface

Security reports are accepted for the current `main` branch. The product is a static local-first simulator plus an optional Node.js static server.

## Reporting

Use GitHub's private security advisory flow for this repository. If private advisories are unavailable, email [support@samsarix.com](mailto:support@samsarix.com) with the subject `Security report: Samsarix Field Atlas`. Do not include live credentials, unnecessary personal data, or exploit data from systems you do not own. Do not publish exploit details in an issue.

Samsarix LLC will acknowledge a report within five business days and coordinate disclosure after a fix or mitigation is available.

## Trust boundaries

- Scenario definitions are repository-authored fixtures, not untrusted runtime input.
- The browser stores only a scenario identifier in `localStorage`.
- JSON exports are produced locally and are not uploaded.
- External GitHub links are user-initiated navigation only.
- The optional Express server serves build artifacts and a fixed `/healthz` response; it has no write API or authentication surface.
- Human approval markers in a blueprint are descriptive. They do not grant authority or execute an action.

## Secure operating guidance

- Keep the default loopback bind for local evaluation.
- If binding `HOST=0.0.0.0`, place the server behind an owner-approved TLS and network boundary.
- Run `pnpm install --frozen-lockfile`, `pnpm audit --prod`, and `pnpm verify` before release.
- Treat exported blueprints as user-controlled files when another system imports them; validate the schema and never execute their strings as code or shell commands.
- Do not add secrets to `VITE_*` variables: Vite exposes those values to every browser.

## Data and cost posture

The shipped application performs no remote data collection and no paid API calls. Its steady-state operating cost is only the chosen static hosting or small Node process. Static hosting is the recommended path.
