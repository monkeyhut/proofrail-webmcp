# ProofRail trust model

ProofRail is an evidence workflow, not an oracle. Imported text and HTML,
document contents, URLs, media references, source excerpts, tool metadata, tool
inputs, and tool outputs are all untrusted.

## Authority boundaries

### Empty first

A fresh workspace contains no company, campaign, claim, evidence, proposal,
decision, metric, or receipt. The optional ProofRail self-demo uses only
repository-authored ProofRail material and is identified as a self-demo.

### Source, proposal, and release candidate are different objects

- **Current source** is the exact imported state.
- **Proposed direction** is revision-bound and remains pending until a human
  decides it.
- **Release candidate** can exist only for the exact proposal a visible human
  approved against the current source revision.

Changing the source invalidates proposal authority, release readiness, and any
previous receipt. A proposal must never overwrite or masquerade as current
source material.

### The agent cannot approve or publish

WebMCP exposes inspection, packet replacement, evidence attachment, proposal
staging, gate verification, and receipt export. It exposes no tool for human
approval, human rejection, publishing, releasing, decision fabrication, or gate
bypass.

Receipt export is not approval. It is available only after the current state
passes the deterministic gate and does not publish content.

### Writes are revision-locked

Agent mutations require the exact current workspace revision. Proposal staging
also binds the exact claim revision. Human proposal and evidence decisions bind
the displayed workspace, claim, and proposal identifiers. A mismatch must fail
with a clear stale-state error rather than applying a best-effort merge.

## Input and rendering boundaries

### Inputs are narrow

WebMCP JSON Schemas constrain string lengths, array sizes, enums, claim IDs, and
allowed properties. Domain validation repeats material checks before state
changes.

Imported packets must preserve the complete headline and body sentence map.
Duplicate or overlapping spans, partial claims, unknown identifiers, excessive
sentence counts, unsupported enums, and ambiguous sentence boundaries must
fail before mutation.

### Missing data is explicit

Every `PublicationBrief` field is either provided with provenance or missing
with a reason and request for input. The system must not transform an absent
field into public copy, a logo, quote, metric, chart, screenshot, or customer
asset.

### Publisher content does not become executable application code

Imported text and HTML are treated as content, not mounted as arbitrary React
markup or executable script. The four renderers control structure and
semantics. URL and media handling still require final security verification for
scheme allowlists, remote requests, file limits, MIME checks, and object-URL
lifecycle; production safety is not claimed until those checks are evidenced.

### Evidence remains untrusted until human review

An attached URL and excerpt are provenance inputs, not proof that a source is
authentic or the excerpt is complete. Public-source records require an HTTP(S)
URL. An agent-provided relationship cannot become human approval.

`supports` and `qualifies` relationships may contribute to release readiness;
`contradicts` and `outdated` relationships remain adverse. A resolved claim
must not pass merely because any edge exists.

## Gate and receipt boundaries

### Release readiness is deterministic

The gate evaluates the current revision, claim states, evidence graph, pending
human decisions, human approval, broken links, and full publication coverage.
It returns concrete blockers. There is no confidence score, timer, simulated
progress, automatic pass, automatic approval, or automatic publish action.

`Ready for release` is not `Published`.

### Receipts prove integrity, not truth

The receipt contract records the publication type and brief, final text, claim
and evidence matrix, human decisions/audit, source revision, timestamp, and a
SHA-256 content hash. The final verification suite must demonstrate that the
hash binds the exact required fields and that later mutation visibly
invalidates both readiness and the previous receipt.

Even a verified receipt does not authenticate the author, certify a source,
prove legal compliance, guarantee a publisher's final CMS rendering, or replace
editorial review. A bare SHA-256 hash is not a digital signature.

## Generated-media boundary

The active product uses no generated cinematic video or 3D runtime. The one
reviewed social card is metadata artwork only and cannot act as source,
publication media, evidence, application state, or approval. Future generated
publication media must retain provenance and cannot enter a release candidate
until human review marks it approved for that exact use.

## Data handling in the challenge prototype

- State lives only in the current browser page.
- A fresh reload returns to the empty workspace.
- No account, authentication layer, remote database, shared collaboration
  store, analytics pipeline, or production retention policy is claimed.
- Downloading a receipt is an explicit local human action.
- Public deployment is outside the rebuild's current authorization.

## Known production gaps

A production system would still need authenticated identities, role-based
access, server-side append-only audit storage, signed receipts, source and file
retention rules, content-security policy review, media scanning, rate limits,
abuse monitoring, durable object storage, privacy controls, and multi-user
conflict handling.

The current local branch has current-run domain, WebMCP contract, reduced-motion
E2E, three-engine/eight-viewport browser-matrix, focus, axe, console,
dependency-audit, and representative Lighthouse evidence under `docs/qa/`.
Those artifacts do not establish a secure public deployment. Public WebMCP
discovery, judge-equivalent behavior, authenticated identities, durable audit
storage, signed receipts, retention, abuse controls, and multi-user conflict
handling remain unverified production gates.
