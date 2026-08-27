# ProofRail

**The pre-publication claim gate for marketing and PR teams.**

ProofRail is not a news site or an AI writer. Before a launch page, project page,
blog post, or report goes live, it renders a publication preview while an
agent inspects each factual claim against linked evidence and prepares the
smallest defensible correction. A human is the only actor allowed to approve
the final wording and evidence. Until every claim clears the fixed rules,
Publish stays locked; a passing revision can be sealed into a JSON Proof
Receipt with a SHA-256 content hash.

> ProofRail does not decide truth. It makes evidence gaps, revisions, and human
> decisions explicit before publication.

## Why this needs WebMCP

The useful state is already in the page: the current draft, exact claim and
workspace revisions, evidence relationships, pending human decisions, and the
release gate. WebMCP lets the agent work against that shared live state instead
of scraping pixels, inventing hidden state, or using a detached backend.

The page exposes six narrow tools:

| Tool | Mode | Purpose |
| --- | --- | --- |
| get_review_context | read | Return publication and presentation profile, headline, body, claims, evidence graph, revisions, proposals, and gate |
| replace_review_packet | write | Load a launch page, project page, blog post, or report with exact headline/body claim spans and an optional brand/presentation profile |
| attach_evidence | write | Add a dated excerpt with a typed evidence relationship |
| stage_resolution_batch | write | Stage narrow revisions for human review; never approve |
| verify_release_gate | read | Return every deterministic blocker at the current revision |
| export_proof_receipt | write | Seal a passing revision into a visible, hashed receipt |

Every write uses an expectedWorkspaceRevision; staged edits also require an
expectedClaimRevision. Stale agent writes fail loudly. A staged revision must
remain one atomic public sentence, and the projected publication must preserve a
one-to-one, non-overlapping claim map before it can be previewed or approved.

## Three-minute demo path

1. Ask the agent to read the review context and explain why release is blocked.
2. Let it stage narrow revisions for claims C-01 and C-04, then compare
   **Current draft** with **AI proposal · not approved** in the live preview.
3. Approve one proposal and reject the other in the page; watch the preview
   keep only the human-approved wording.
4. Ask the agent to re-read the new revision and adapt the rejected claim.
5. Approve the replacement, verify the gate, and export the Proof Receipt.
6. Load an unseen short draft through replace_review_packet to show that the
   system is not a hard-coded button demo.

## Authority boundary

- Agent: read, structure, attach evidence, and stage.
- Human: approve linked evidence and the exact claim language that may ship.
- System: compute blockers and seal a passing revision.

There is intentionally no WebMCP approval tool.

## Local development

Requirements: Node.js 22.13 or newer.

    npm install
    npm run dev

Open http://localhost:3000/ in the ChatGPT/Codex built-in browser with site
tools enabled.

Run the full verification suite:

    npm run verify

Individual checks:

    npm run typecheck
    npm run test:domain
    npm run test:clarity
    npm run lint
    npm run build

## Verified in the current build

- TypeScript typecheck passes.
- The domain suite passes, including stale/unknown-write rejection, mandatory
  human evidence approval, ambiguous-span rejection, full sentence coverage,
  fail-closed proposal previews, scoped audit export, receipt provenance, and
  unseen input packets across all four publication types.
- The source-level clarity heuristic passes at 100/100, including the early live
  publication preview and its draft, AI-staged, and human-approved states. It is
  a reproducible copy/structure check, not a substitute for testing comprehension
  with people.
- Launch pages, project pages, blog posts, and reports render as four genuinely
  different publication layouts while preserving the same exact claim text and
  review state.
- Quantitative preview modules are fail-closed: units remain attached, absent
  metrics do not become decorative KPIs, and public reports never expose the
  workspace's internal evidence titles.
- The rejected decorative 3D/video direction is not loaded by the active page.
  The replacement uses state-bound static workflow frames and a disclosed Meshy
  poster in ProofRail's method section; browser QA still reports zero video and
  zero canvas elements, and the Three.js runtime is no longer a dependency.
- ESLint passes.
- Production build passes.
- npm audit reports zero known vulnerabilities after pinned security overrides.
- The Codex built-in browser discovered all six page-defined WebMCP tools.
- The live chain read → stage → human approve → verify → export produced a
  four-row receipt with a 64-character SHA-256 hash.

## Honest limits

- Workspace state is local and intentionally resets on reload.
- ProofRail stores source excerpts; it does not fetch a URL or certify that a
  source is true.
- The preview renders the exact headline and body through one of four simulated
  publication systems and uses the supplied brand profile, art direction, and
  optional real hero asset. It is not a pixel-perfect prediction of a company's
  CMS or live website. The packet title remains internal review metadata and is
  not inserted as unchecked public copy.
- Brand, author, date, CTA, and similar short labels are layout metadata rather
  than claim-scoped prose. Any factual statement—including methodology or an
  image caption—must be placed in the headline/body to enter the evidence gate
  and receipt; the current build deliberately does not render separate long-form
  profile copy.
- Sentence extraction recognizes common titles and abbreviations. If an
  initialism followed by a capitalized word is genuinely ambiguous, import stops
  with `AMBIGUOUS_SENTENCE_BOUNDARY` instead of silently guessing; rewrite that
  boundary explicitly and retry.
- A receipt seals source type, date, URL when supplied, excerpt, relationship,
  rationale, publication type, headline, and final body. Its hash proves
  internal consistency; it is not a digital signature and does not prove source
  authenticity.
- This challenge build has no authentication, database, collaboration server,
  or production retention policy.

See [the trust model](docs/THREAT_MODEL.md) and
[the submission kit](docs/CHALLENGE_SUBMISSION.md). Generated media provenance
and licensing caveats are recorded in [the asset manifest](docs/ASSET_PROVENANCE.md).
The primary-source and MotionSites synthesis behind the four preview types is
recorded in [the publication preview research](docs/PUBLICATION_PREVIEW_RESEARCH.md).
The live challenge gates are tracked in
[the compliance matrix](docs/CHALLENGE_COMPLIANCE.md).

## License

MIT for source code and authored text — see [LICENSE](LICENSE). Generated media
listed in the asset manifest is excluded from any unverified sublicensing claim.
