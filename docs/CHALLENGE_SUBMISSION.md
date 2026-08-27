# OpenAI WebMCP Challenge submission kit — DRAFT ONLY

This document is working copy. It has not been submitted. Local build, browser,
workflow, accessibility, and Lighthouse evidence is recorded under `docs/qa/`;
that evidence does not prove a public URL, final video, or Devpost entry.

## Candidate links

- Source candidate: `https://github.com/monkeyhut/proofrail-webmcp`
- Deployment candidate: `https://proofrail-webmcp.kingacht.chatgpt.site`

Both targets require final current-revision verification. Public deployment,
merge, and Devpost submission need separate explicit human approval.

## Title

ProofRail — Publication Compiler

## Tagline

See the finished page, prove every factual claim, and keep release locked until
a human approves.

## Short description

ProofRail is the review and approval workspace marketing and PR teams use before
publishing a launch page, case study, article, or report.

It begins with the actual source material, converts it into a typed
`PublicationBrief`, and renders a credible publication canvas for the selected
format. Every supplied field retains provenance; missing fields remain visible
requests for input instead of becoming invented copy, customer data, imagery,
quotes, or metrics.

An agent works against the same live state through six narrow WebMCP tools. It
can inspect the publication, connect claims to evidence, stage safer wording,
explain blockers, run the deterministic release-readiness check, and export a
receipt after the gate passes. It cannot approve or reject as a human, create a
human decision, publish, release, bypass the gate, or overwrite a stale
revision.

ProofRail separates **Current source**, **Proposed direction**, and **Release
candidate**. Proposed wording remains visibly unapproved. Only an explicit
human decision can create a release candidate, and that candidate must still
pass deterministic checks for evidence, adverse or stale relationships, pending
human review, and revision integrity.

A passing result says **Ready for release**, never **Published**. Receipt
creation is separate. The receipt binds the exact publication type, text,
claims, evidence, human decisions, revision, timestamp, and SHA-256 hash. Any
later mutation invalidates readiness and the previous receipt.

The result is not an AI truth oracle or autonomous publishing system. It is a
visible compiler and protected review boundary for public claims.

## WebMCP tools

| Tool | Agent authority |
| --- | --- |
| `get_review_context` | Read the current publication and review state |
| `replace_review_packet` | Import exact source material at an expected workspace revision |
| `attach_evidence` | Attach a dated excerpt with a typed relationship |
| `stage_resolution_batch` | Stage revision-locked wording proposals |
| `verify_release_gate` | Run deterministic release-readiness checks |
| `export_proof_receipt` | Export a receipt only for a passing revision |

No WebMCP tool can provide human approval or publish content.

## Recommended demo prompt

> Read the current ProofRail workspace. Explain each release blocker using the
> linked evidence, then stage the narrowest defensible wording changes. Do not
> approve, reject, publish, or represent any proposal as a human decision. After
> I make the decisions in the visible interface, re-read the current revision,
> run the release-readiness check, and export a receipt only if the gate passes.

## Demo video storyboard — target under three minutes

This is a recording plan, not evidence that a final video exists.

| Time | Picture | Narration intent |
| --- | --- | --- |
| 0:00–0:15 | Fresh empty state, product explanation, import action, and locked gate in the first viewport | Identify the user, input, output, differentiator, and first action without a demo customer |
| 0:15–0:30 | Load the clearly labelled ProofRail self-demo | Explain that the optional demo uses only ProofRail's repository-authored material |
| 0:30–0:50 | Show the publication canvas and switch among launch, case study, article, and report | Demonstrate four structurally different publication compositions and honest missing-field modules |
| 0:50–1:10 | Open the six WebMCP tools and call `get_review_context` | Show that the agent reads exact live state rather than pixels |
| 1:10–1:30 | Select a factual sentence and open its linked source passage | Trace sentence → claim → evidence → support or conflict |
| 1:30–1:50 | Stage a wording proposal through WebMCP | Show Proposed direction as unapproved and keep the release gate blocked |
| 1:50–2:10 | Human accepts or rejects the exact proposal in the visible UI | Make the protected human boundary explicit |
| 2:10–2:28 | Run **Check release readiness** | Show real blockers or a real pass immediately; no timer or simulated progress |
| 2:28–2:42 | If and only if the gate passes, create and inspect the receipt | Distinguish readiness and receipt creation from publishing |
| 2:42–2:55 | Mutate the source and show readiness/receipt invalidation | Demonstrate revision binding and fail-loudly behavior |

Use real screen capture with audible English narration. Do not splice together
states that did not occur in the recorded run.

## Why it fits

### WebMCP leverage

The agent needs page-owned source text, claim spans, evidence relationships,
human decisions, revisions, and gate output. WebMCP makes those explicit and
typed while the human sees the same state and retains sole decision authority.

### Execution

The intended experience is tool-first: honest import, a large publication
canvas, a contextual review rail, four format-specific renderers, real blocker
focus, visible proposal authority, protected human decisions, and a separately
created receipt. The current local production run passed the evidence gates in
`docs/qa/`; public-host and judge-equivalent checks remain separate.

### Potential impact

Marketing, PR, research communication, policy, and public reporting all move
factual language from fragmented sources toward release. ProofRail creates one
review boundary without claiming to automate truth or editorial accountability.

### Creativity and ambition

ProofRail treats language like a compiled release: source material becomes a
typed brief, claims are checked against evidence, proposals are staged changes,
human approval is protected review, the gate is deterministic verification, and
the receipt is a state-bound artifact.

### Visual execution

The product shell is an editorial review tool, not a marketing showreel. The
public canvas changes composition for launch, case study, article, and report.
Motion is reserved for real focus and state transitions. No cinematic video or
3D runtime is used because neither earned a product role. The only retained
generated medium is a reviewed social card documented in
`docs/ASSET_PROVENANCE.md`.

## Submission checklist

- [x] Final domain and `PublicationBrief` tests recorded
- [x] Final WebMCP contract and all six tool paths recorded locally
- [x] Production build, lint, typecheck, dependency audit, and console review recorded
- [x] Complete blocked → human decision → ready → receipt → invalidated E2E path recorded
- [x] All four renderers captured on desktop and mobile with ProofRail-owned QA copy
- [x] Required responsive viewports verified without overflow
- [x] Keyboard, focus, reduced motion, live regions, and axe verification recorded
- [x] Chromium, Firefox, and WebKit verified at all eight required viewports
- [x] Representative Lighthouse evidence recorded; field INP remains unavailable
- [x] Three independent gauntlet reviews meet every minimum (lowest 94/100)
- [x] Current screenshots generated only by the passing QA runner
- [ ] Public repository, exact commit, license, and CI verified
- [ ] Public URL deployed and tested in a judge-equivalent session
- [ ] Public demo video with audible English narration uploaded
- [ ] Devpost form reviewed by the participant
- [ ] Explicit human approval to merge, deploy, and submit received
- [ ] Devpost submission verified after that approval

See `docs/CHALLENGE_COMPLIANCE.md` for the working requirement matrix.
