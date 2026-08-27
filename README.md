# ProofRail

**The publication compiler and human release gate for marketing and PR teams.**

Paste the page your company is about to publish. ProofRail previews the
finished publication, checks every factual sentence against its sources, and
keeps release locked until a human approves.

ProofRail is not a news site, a blog builder, an autonomous publisher, or an AI
truth oracle. It is the review workspace immediately before a launch page, case
study, article, or report is released.

> ProofRail shows the real publication, connects claims to evidence, separates
> proposed wording from approved wording, and makes the human release boundary
> visible.

## The workflow

```text
source material
→ publication brief
→ finished publication preview
→ factual claims
→ linked evidence
→ safer wording proposals
→ human decision
→ release-readiness check
→ immutable receipt
```

A fresh visit begins in an honest empty state. The primary action imports the
publication being prepared. The optional **ProofRail self-demo** uses only
ProofRail's own repository-authored product contract and is always identified
as a self-demo.

## Three authority states

ProofRail keeps three forms of the publication separate in its domain model and
interface:

- **Current source** — the exact material that was imported.
- **Proposed direction** — a staged change that has not been approved.
- **Release candidate** — only the exact version accepted through a visible
  human action.

An agent can inspect content, attach evidence, stage wording, explain blockers,
and run the deterministic release check. It cannot approve, reject as a human,
publish, release, fabricate a human decision, or overwrite a stale revision.

## Four publication renderers

`PublicationBrief` is a discriminated, provenance-aware model with four
publication types:

- Product launch
- Case study
- Editorial article
- Report

Each renderer has its own composition, hierarchy, typography, spacing, media
logic, and missing-field treatment. A missing value becomes an explicit request
for input; it is never replaced with invented copy, imagery, metrics, quotes,
or customer data.

The publication canvas and proof overlay are separate views. The canvas is the
audience-facing result; claim state, evidence, proposals, human decisions,
blockers, revisions, and receipts belong to the review rail.

## Why this needs WebMCP

The useful state already lives in the page: the current publication, exact
workspace and claim revisions, evidence relationships, pending human decisions,
and release blockers. Six narrow WebMCP tools operate on that same state:

| Tool | Mode | Purpose |
| --- | --- | --- |
| `get_review_context` | read | Return the current publication, claims, evidence, revisions, proposals, and gate state |
| `replace_review_packet` | write | Load an exact publication packet and reset prior release authority |
| `attach_evidence` | write | Attach a dated excerpt with a typed evidence relationship |
| `stage_resolution_batch` | write | Stage revision-locked wording proposals for human review |
| `verify_release_gate` | read | Run the deterministic release-readiness rules and return every blocker |
| `export_proof_receipt` | write | Seal a passing, human-approved revision into a visible hashed receipt |

There is intentionally no WebMCP approval or publishing tool. Mutating calls
require the exact expected workspace revision; proposal writes also bind the
claim revision. Conflicts fail loudly instead of being merged optimistically.

## Release readiness

**Check release readiness** runs the real domain gate. It evaluates current
claims, evidence relationships, pending human decisions, and revision locks,
then returns concrete blockers. The first blocker can be focused in the
publication and its linked evidence shown beside it.

`Ready for release` means only that the current candidate passes those rules.
It does not mean published. Receipt creation is a separate action, and any later
mutation invalidates readiness and the previous receipt.

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by the development server in a WebMCP-capable
browser.

The repository exposes individual domain and build checks through `package.json`.
Run the aggregate suite with:

```bash
npm run verify
```

For browser QA, start the production build on port `4176` in one terminal and
run the three evidence commands in another:

```bash
npm run start -- --host 127.0.0.1 --port 4176
npm run qa:browsers
npm run qa:workflow
npm run qa:lighthouse
```

## Current local QA evidence

The 2026-08-28 local production run recorded:

- `npm run verify`: typecheck, domain, import, `PublicationBrief`, WebMCP,
  clarity, lint, and precompressed production build passed.
- Browser matrix: Chromium, Firefox, and WebKit at all eight required
  viewports — 24/24 cases passed with no horizontal overflow, no visible
  target below 44 px, no console error, and zero axe critical/serious issues.
- Mobile import at 320×568: visible form labels and field text are at least
  16 px; initial focus, Escape, and focus return passed.
- Reduced-motion E2E: blocked gate → two visible human decisions → ready →
  separate receipt → source mutation → invalidated receipt → blocked again.
  Visible gate feedback measured 29.9–36.0 ms in that local run.
- Lighthouse on the loaded `/qa/self-demo` experience: Performance 98,
  Accessibility 100, Best Practices 100, SEO 100; LCP 2.160 s, CLS 0,
  TBT 0 ms, and 185 KiB transferred.

The machine-readable reports live in [`docs/qa`](docs/qa). Lighthouse does not
provide a field INP value for this local navigation run; TBT and the explicit
interaction timings are recorded without presenting them as field INP.

## Media decision

The working product uses no cinematic video or 3D runtime. ImageGen, Higgsfield,
and Meshy were evaluated against a strict test: a medium must explain the live
claim-to-source-to-human-to-release state faster than the interface itself.
Only a reviewed ImageGen social card is retained; video and 3D were not used
because they added no justified product value. See
[the asset manifest](docs/ASSET_PROVENANCE.md).

## Honest limits

- Workspace state is local and resets on reload.
- Source excerpts are evidence inputs, not a certification that a source is
  true.
- The four renderers provide credible publication compositions, not a
  pixel-perfect prediction of a company's CMS.
- A receipt binds the publication type, text, claims, evidence, human decisions,
  revision, timestamp, and SHA-256 hash. It proves internal consistency, not
  source authenticity or legal approval.
- This challenge prototype has no authentication, shared database,
  collaboration server, signed receipts, or production retention policy.
- The rebuild is not merged, publicly deployed, or submitted to Devpost without
  separate human approval.

See [the trust model](docs/THREAT_MODEL.md),
[publication renderer research](docs/PUBLICATION_PREVIEW_RESEARCH.md),
[challenge compliance draft](docs/CHALLENGE_COMPLIANCE.md), and
[submission draft](docs/CHALLENGE_SUBMISSION.md).

## License

MIT for source code and authored text — see [LICENSE](LICENSE). Generated media
has the separate provenance and rights boundary recorded in the asset manifest.
