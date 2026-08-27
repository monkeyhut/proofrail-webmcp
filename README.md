# ProofRail

**CI for public claims.**

ProofRail is not a news site or an AI writer. It is the release gate between a
draft and the publish button. An agent inspects each public claim against its
attached evidence and prepares the smallest defensible correction. A human is
the only actor allowed to approve the final wording and its linked evidence.
Until every claim clears the fixed rules, publication stays locked; a passing
revision can be sealed into a JSON Proof Receipt with a SHA-256 content hash.

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
| get_review_context | read | Return draft, claims, evidence graph, revisions, proposals, and gate |
| replace_review_packet | write | Load any draft plus exact atomic claim spans |
| attach_evidence | write | Add a dated excerpt with a typed evidence relationship |
| stage_resolution_batch | write | Stage narrow revisions for human review; never approve |
| verify_release_gate | read | Return every deterministic blocker at the current revision |
| export_proof_receipt | write | Seal a passing revision into a visible, hashed receipt |

Every write uses an expectedWorkspaceRevision; staged edits also require an
expectedClaimRevision. Stale agent writes fail loudly.

## Three-minute demo path

1. Ask the agent to read the review context and explain why release is blocked.
2. Let it stage narrow revisions for claims C-01 and C-04.
3. Approve one proposal and reject the other in the page.
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
    npm run lint
    npm run build

## Verified in the current build

- TypeScript typecheck passes.
- The domain suite passes, including stale/unknown-write rejection, mandatory
  human evidence approval, ambiguous-span rejection, full sentence coverage,
  scoped audit export, receipt provenance, and unseen input packets.
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
- A receipt seals source type, date, URL when supplied, excerpt, relationship,
  and rationale. Its hash proves internal consistency; it is not a digital
  signature and does not prove source authenticity.
- This challenge build has no authentication, database, collaboration server,
  or production retention policy.

See [the trust model](docs/THREAT_MODEL.md) and
[the submission kit](docs/CHALLENGE_SUBMISSION.md). Generated media provenance
and licensing caveats are recorded in [the asset manifest](docs/ASSET_PROVENANCE.md).

## License

MIT for source code and authored text — see [LICENSE](LICENSE). Generated media
listed in the asset manifest is excluded from any unverified sublicensing claim.
