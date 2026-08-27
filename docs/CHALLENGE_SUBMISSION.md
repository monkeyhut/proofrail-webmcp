# OpenAI WebMCP Challenge submission kit

## Verified project links

- Public source: https://github.com/monkeyhut/proofrail-webmcp
- Deployment candidate: https://proofrail-webmcp.kingacht.chatgpt.site
  (the current site is owner-only; the verified PR head awaits explicit merge,
  production-deploy, and public-access approval)

## Title

ProofRail — The pre-publication claim gate

## Tagline

Before company content goes live, AI checks the proof, a human approves the
exact words, and ProofRail controls Publish.

## Short description

ProofRail is a pre-publication preview and release gate for claims in project
pages, blog posts, launch pages, and reports. It renders the exact current words
in a simulated public layout before they ship. An agent works directly with the
live page through six WebMCP tools: it reads the publication type, headline,
body, and revisions; maps atomic claims to dated source excerpts; marks each
relationship as support, qualification, contradiction, or outdated evidence;
and stages the smallest defensible language changes.

The agent cannot approve its own work. Its staged language appears only in an
explicit **AI proposal · not approved** preview beside the unchanged current
draft. A human accepts the linked evidence and exact final wording in the shared
interface, or rejects a proposed correction.
ProofRail then runs deterministic rules—not an opaque confidence score—to block
unsupported, contradicted, stale, unreviewed, or human-unapproved claims. A
passing revision produces a Proof Receipt containing complete evidence
provenance, the claim-evidence matrix, packet-scoped decision log, workspace
revision, and SHA-256 content hash.

The result is not an AI truth oracle. It is CI for public claims: a visible,
auditable boundary between agent assistance and human publishing authority.

## Recommended demo prompt

> Read this ProofRail workspace. Explain each release blocker using the linked
> evidence, then stage the narrowest defensible revisions for the blocked
> claims. Do not approve anything. After I make the human decisions, re-read
> the workspace, adapt any rejected proposal, verify the release gate, and
> export the proof receipt.

## Demo video — target 2:25

| Time | Picture | Narration |
| --- | --- | --- |
| 0:00–0:12 | Hero definition and launch-page preview, then “800 launch teams” beside the source proving only 800 waitlist sign-ups; the gate is visibly locked | “Before a launch page, project page, blog post, or report goes live, ProofRail previews it and checks every factual claim against its evidence.” |
| 0:12–0:28 | Open available site tools | “The page exposes six WebMCP tools over the same live state the human sees.” |
| 0:28–0:48 | Agent calls get_review_context | “The agent sees exact claim revisions and typed evidence—not a screenshot.” |
| 0:48–1:06 | Agent calls stage_resolution_batch; preview switches from current draft to clearly labelled unapproved AI wording | “It narrows two claims and shows how the page could read, but it cannot approve its own work.” |
| 1:06–1:25 | Human approves C-01 and rejects C-04; the live preview retains only the accepted wording | “The human accepts one and rejects one. The public preview follows that authority boundary immediately.” |
| 1:25–1:44 | Agent re-reads and stages a new C-04 proposal | “The agent adapts to the new revision instead of overwriting it.” |
| 1:44–1:58 | Human approves; the live publication header and dedicated publish-gate panel switch from locked to cleared | “Deterministic rules now pass all four claims.” |
| 1:58–2:12 | Agent exports receipt; publication type, headline, final body, hash, and matrix appear | “The exact approved preview, evidence matrix, decisions, and SHA-256 hash become one proof receipt.” |
| 2:12–2:25 | Load unseen Arbor draft | “And it is not hard-coded: an unseen draft becomes a fresh blocked claim rail through the same tools.” |

Use real screen capture with audible narration. Keep the final upload public and
under three minutes.

## Why it scores

### WebMCP leverage

The agent needs page-owned draft state, exact revisions, evidence edges, human
decisions, and release rules. The multi-step workflow is materially safer and
more reliable than pixel automation or detached chat suggestions.

### Execution

The full state change is visible in the publication itself: current draft,
unapproved agent proposal, human decision, recomputed gate, audit entry, and
receipt. Narrow schemas, exact headline/body spans, and revision locks fail
loudly.

### Potential impact

Marketing, policy, fundraising, research communication, and public reporting
all publish claims from fragmented source packets. ProofRail creates a reusable
release discipline without pretending to automate truth.

### Creativity and ambition

ProofRail treats language like deployable code: evidence edges are tests,
staged rewrites are patches, human approval is protected review, and the proof
receipt is the build artifact.

### Visual execution

The opening frame explains the product and shows the real launch-page output at
the same time. Each accepted input has its own publication grammar: project
case study, editorial blog, launch page, or formal report. The active interface
uses no video or interactive 3D runtime. A disclosed two-frame workflow study
can move only as far as the real gate allows, and a static Meshy dossier makes
the review layers tangible without entering any customer publication preview.
Its other cinematic motion comes from masked typography, ruled layouts, and the
actual draft → evidence → human → release-ready state change. Several
MotionSites member examples informed editorial scale, asymmetric composition,
workflow logic, and controlled transitions; none of their prompts, code, or
hosted assets is copied.

## Submission checklist

- [x] Functional WebMCP implementation
- [x] English product copy
- [x] Public-license file
- [x] Public repository with GitHub-detected MIT license
- [x] Reproducible local verification commands
- [x] Social preview artwork
- [x] Refreshed desktop and narrow-layout submission screenshots
- [x] Public GitHub repository URL
- [x] Source-level clarity heuristic at 100/100 in the local gauntlet
- [ ] Public live deployment URL and judge-equivalent WebMCP re-test
- [ ] Public YouTube demo with audio, under three minutes
- [ ] Devpost URLs and final submit

Do not mark the remaining items complete without checking the real public
targets. See `docs/CHALLENGE_COMPLIANCE.md` for the official requirement matrix.
