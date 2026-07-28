# Samsarix Field Atlas

Samsarix Field Atlas is a local-first interactive reference for the Samsarix coordination model. It lets developers, technical evaluators, and collaborators inspect how 13 named roles can hand work across intent, execution, safety, and memory boundaries.

The site is deliberately honest about its limits: it does **not** run agents, call language models, connect to an external runtime, report live status, or store data remotely. Its scenario runs are deterministic browser simulations that produce a portable JSON blueprint.

## Current status

This repository is a release candidate for independent evaluation. The core scenario journey, static production build, bounded Node server, automated tests, CI checks, public license, and commercial-licensing path are implemented. Public deployment and any GitHub repository rename remain owner-controlled gates; see [Productization](docs/PRODUCTIZATION.md).

## Fastest successful path

Prerequisites:

- Node.js 22.12 or newer
- Corepack, included with supported Node.js 22 distributions

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://127.0.0.1:3000`.

No environment variables, API keys, accounts, databases, or companion repositories are required.

## Primary walkthrough

1. Choose **Ship a breaking change**, **Triage a production incident**, or **Clarify an ambiguous request**.
2. Review the objective, risk, and acceptance criteria.
3. Select **Run trace** to reveal each role, evidence artifact, and trust boundary in order.
4. Cancel and retry safely if you want to change scenarios.
5. After completion, select **Export JSON** to download an implementation-neutral blueprint.

The selected scenario is remembered in device-local browser storage. It contains no personal content and never leaves the device.

## What the export means

The `samsarix-field-atlas/1` JSON document records:

- the chosen scenario and success criteria;
- the active roles and their responsibilities;
- the ordered trace and expected evidence;
- human, policy, tool, and memory boundaries;
- explicit runtime claims showing that this reference executed no agents and called no external services.

The export is a design aid or test fixture. It is not an execution plan, authorization record, or production trace. The complete contract is documented in [Reference Model](docs/REFERENCE_MODEL.md).

## Development commands

| Command              | Purpose                                                      |
| -------------------- | ------------------------------------------------------------ |
| `pnpm dev`           | Start the local Vite development server on `127.0.0.1:3000`  |
| `pnpm lint`          | Run ESLint across TypeScript and React code                  |
| `pnpm format:check`  | Check repository formatting with Prettier                    |
| `pnpm check`         | Run the strict TypeScript compiler check                     |
| `pnpm test`          | Run model, component, and server tests once                  |
| `pnpm test:coverage` | Run tests with enforced coverage thresholds                  |
| `pnpm build`         | Build static assets and the optional Node release server     |
| `pnpm start`         | Serve the completed build on `127.0.0.1:3000`                |
| `pnpm verify`        | Run lint, formatting, types, coverage, and build in CI order |

## Production build and distribution

```bash
pnpm build
pnpm start
```

The build produces:

- `dist/public/`: the standalone static site, suitable for a static host;
- `dist/index.js`: a small Express server with `/healthz`, strict browser security headers, bounded timeouts, and graceful shutdown.

The server accepts optional `HOST` and `PORT` process variables. It defaults to `127.0.0.1:3000`; set `HOST=0.0.0.0` only when an external deployment boundary is intentional and protected.

For a static host mounted under a path, set `BASE_PATH` at build time. Example:

```bash
BASE_PATH=/Helix-Collective-Web/ pnpm build
```

On PowerShell:

```powershell
$env:BASE_PATH = "/Helix-Collective-Web/"
pnpm build
```

No production deployment is performed by this repository. Hosting configuration, domain ownership, and publishing remain owner actions.

## Architecture

```text
client/src/model.ts     Canonical roles, scenarios, indicators, and export contract
        ↓
client/src/pages/Home.tsx
        ↓               Accessible local simulator and empty/running/cancelled/success states
client/src/index.css    Responsive product presentation with reduced-motion support
        ↓
Vite static build ─────→ dist/public
        ↓ (optional)
Express release server → security headers + /healthz + bounded static serving
```

The product intentionally has no authentication, database, analytics, remote API, or LLM dependency.

## Security and privacy

- Scenario runs are deterministic and entirely local.
- No analytics, cookies, remote fonts, or external data requests ship in the application.
- Only the selected scenario ID is saved to `localStorage`.
- The JSON export is created in the browser and downloaded directly.
- The release server disables framework disclosure, denies framing, restricts browser capabilities, and serves a narrow health contract.
- Public links open with `rel="noreferrer"`.

See [Security](SECURITY.md) for trust boundaries, reporting, and operational guidance.

## Limitations

- Indicator values are explanatory values defined by each fixture, not telemetry or scientific measurements.
- The model is a reference vocabulary, not a normative multi-agent standard.
- The atlas does not validate whether a real implementation generated the evidence named in a trace.
- The three bundled scenarios are representative rather than exhaustive.
- No hosted URL is guaranteed by this repository.

## Project records

- [Productization assessment and release gates](docs/PRODUCTIZATION.md)
- [Reference model and JSON contract](docs/REFERENCE_MODEL.md)
- [Historical pre-Samsarix context](CONTEXT.md) — preserved as non-normative source material
- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Licensing guide](LICENSING.md)
- [Trademark policy](TRADEMARKS.md)

## Licensing

Samsarix Field Atlas is publicly available under [GNU AGPL-3.0-only](LICENSE). If you modify it and let users interact with the modified version over a network, the AGPL requires you to offer those users the corresponding source. Copyright and license notices must remain intact.

Organizations that need terms incompatible with the AGPL can request a separate commercial license from Samsarix LLC at [contact@samsarix.com](mailto:contact@samsarix.com). The Samsarix name and brand assets are not licensed under the AGPL; see [LICENSING.md](LICENSING.md), [NOTICE.md](NOTICE.md), and [TRADEMARKS.md](TRADEMARKS.md). Support and private security coordination are available at [support@samsarix.com](mailto:support@samsarix.com).

This summary is practical guidance, not a substitute for the license text or legal advice.
