# ProofRail local QA record

Recorded 2026-08-28 against the local precompressed production build at
`http://127.0.0.1:4183`. This is build evidence for the current branch, not a
claim that a public deployment or Devpost submission exists.

## Commands

```bash
npm run verify
npm run start -- --port 4183
$env:PROOFRAIL_BASE_URL="http://127.0.0.1:4183"
npm run qa:browsers
npm run qa:workflow
$env:PROOFRAIL_LIGHTHOUSE_URL="http://127.0.0.1:4183/qa/self-demo"
npm run qa:lighthouse
npm audit --audit-level=high
```

## Recorded results

| Gate | Result | Artifact |
| --- | --- | --- |
| Domain, import, brief, WebMCP, clarity, typecheck, lint, build | PASS | Console output; deterministic scripts under `scripts/` |
| Browser and responsive matrix | PASS — 24/24 | `browser-matrix.json` |
| Browser engines | Chromium, Firefox, WebKit | All eight required viewports in each engine |
| Accessibility | axe critical/serious 0 | Loaded self-demo in every matrix case |
| Layout and input | Overflow 0; undersized targets 0 | Empty and loaded states |
| Mobile reading floor | PASS | 320×568 import labels/fields ≥16 px |
| Full release workflow | PASS | `workflow-e2e.json` |
| Four renderer captures | PASS — desktop/mobile for each type | `renderer-captures.json` |
| Long HTML import | PASS — 75/75 exact body claims plus headline | `workflow-e2e.json` and domain/import tests |
| Visible gate response | 35.5–41.0 ms | Blocked, human-cleared, and invalidated paths |
| Lighthouse | 98 / 100 / 100 / 100 | `lighthouse-self-demo.json` |
| LCP / CLS / TBT | 2.101 s / 0 / 0 ms | Loaded `/qa/self-demo`, mobile emulation |
| Initial transfer | 186 KiB | Brotli-precompressed production assets |

Required matrix viewports: 1920×1080, 1440×1000, 1280×800,
1024×768, 768×1024, 390×844, 360×800, and 320×568.

Renderer captures live under `docs/submission-assets/renderers/` and use only
explicitly authored ProofRail QA material; they are not fictional customer
examples.

## Scope and limits

- `/qa/self-demo` is an explicitly labelled, repository-backed ProofRail
  self-demo used so Lighthouse and automation do not score an artificially
  empty page.
- `/` keeps the real workspace empty but includes a read-only preview of that
  self-demo. Its page, claim/source, and human-gate stages are manual and never
  create approval or release state.
- The browser E2E runs with `prefers-reduced-motion: reduce` and demonstrates
  functional parity without motion dependence.
- Lighthouse does not produce a field INP value for this local navigation.
  TBT is 0 ms and explicit input-to-visible-gate timings are below 150 ms, but
  neither is relabelled as field INP.
- Public URL, public WebMCP discovery, judge-equivalent browser behavior,
  authentication, multi-user storage, merge, deployment, demo video, and
  Devpost submission remain outside this local evidence set.
