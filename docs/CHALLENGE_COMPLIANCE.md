# WebMCP Challenge compliance matrix — DRAFT

Status: **local build evidence complete; public submission gates remain open**

The official challenge rules and current Devpost form are authoritative. Dates,
eligibility, required fields, and public-access requirements must be checked
again immediately before submission.

## Judging fit

| Criterion | ProofRail implementation contract | Verification state |
| --- | --- | --- |
| WebMCP leverage | Six page-owned tools operate on the same live publication, claim, evidence, proposal, revision, gate, and receipt state shown to the human. No tool has human approval or publishing authority. | Local six-tool contract, stale-revision, authority, domain, and workflow checks pass; public WebMCP discovery remains open |
| Execution | Honest empty-first import with a read-only real-renderer example, provenance-aware `PublicationBrief`, four structurally distinct renderers, visible authority states, deterministic release readiness, and a separate receipt action. | Local verify, 75-sentence HTML import E2E, reduced-motion workflow, 24-case browser matrix, axe, and representative Lighthouse pass |
| Potential impact | Marketing and PR teams can review launch pages, case studies, articles, and reports before release while retaining human control over the final wording. | Product proposition; user-validation evidence not claimed |
| Creativity and ambition | ProofRail treats factual publication work as a compiler pipeline: source, typed brief, rendered candidate, evidence checks, protected human decision, deterministic gate, and content-bound receipt. | Product contract implemented; three independent gauntlet reviews pass locally, lowest score 94/100 |

## Product-integrity requirements

| Requirement | Expected evidence | Gate |
| --- | --- | --- |
| Fresh visit is honest | Empty workspace plus a clearly labelled, read-only ProofRail-owned example; no customer, campaign, adoption metric, testimonial, or KPI appears | PASS — desktop/mobile captures, inert preview actions, and kill scan |
| Product is understandable | Input, output, audience, differentiator, first action, and human boundary visible in the first viewport | PASS — all three independent reviewers passed the five-second test |
| Four real renderers | Launch, case study, article, and report use different DOM composition, hierarchy, media logic, and mobile rhythm | PASS — separate TSX/CSS compositions and type-specific import/domain tests; final submission may still add per-renderer captures |
| Missing values stay missing | Intentional missing modules request input and never invent public copy or metrics | PASS — brief/import/domain tests |
| Release check is real | CTA calls deterministic domain logic, reports concrete blockers, and focuses the first blocker | PASS — browser E2E measured 35.5–41.0 ms across blocked, human-cleared, and invalidated paths |
| Human boundary is protected | Agent can inspect, attach evidence, stage proposals, explain blockers, run the gate, and export a passing receipt; it cannot approve or publish | PASS — exact-six WebMCP and authority contract tests |
| Revision conflicts fail loudly | Stale workspace, claim, proposal, and source revisions do not overwrite current state | PASS — domain and WebMCP contract tests |
| Receipt is state-bound | Exact publication, claims, evidence, human decisions, revision, timestamp, and hash are bound; mutation invalidates readiness and the prior receipt | PASS — domain tests plus reduced-motion browser E2E |
| Media is purposeful | Only the reviewed Open Graph card is retained; no cinematic video or 3D runtime is used | PASS — asset manifest, runtime scan, and browser transfer inspection |

## Challenge deliverables

| Requirement | Current draft status | Gate |
| --- | --- | --- |
| Working public URL | No public deployment is authorized by this rebuild. | OPEN — separate human approval required |
| Public repository | Candidate repository: `https://github.com/monkeyhut/proofrail-webmcp`. Confirm current visibility, license detection, default-branch contents, and final commit. | OPEN |
| Complete source and setup instructions | Repository contains local setup, product-contract documentation, repeatable QA commands, and machine-readable local reports. | LOCAL PASS — public commit still pending |
| Text description | Draft lives in `docs/CHALLENGE_SUBMISSION.md`. | DRAFT ONLY |
| Public demo video | No final public demo video is claimed. | OPEN |
| Browser-accessible WebMCP | Six-tool contract is documented and locally tested; repeat discovery and all tool paths against the final public URL. | LOCAL PASS / PUBLIC OPEN |
| Open-source license | Root `LICENSE` is MIT. Confirm license detection on the final public commit and repository page. | LOCAL PASS / PUBLIC CHECK OPEN |
| Generated-media rights | Active generated medium, real application captures, purposes, dimensions, and hashes are recorded in `docs/ASSET_PROVENANCE.md`. | LOCAL PASS |
| English materials | Product and submission copy are authored in English. Perform final proofread on the exact submitted revision. | PENDING FINAL REVIEW |

## Required verification set

Current local evidence status:

1. PASS — domain, `PublicationBrief`, import, WebMCP, and clarity contracts.
2. PASS — production build, lint, typecheck, dependency audit, and console.
3. PASS — blocked, human pending, ready, receipt, and invalidated paths.
4. PASS — four renderer contracts plus desktop/mobile expanded-canvas captures
   generated from explicitly authored ProofRail QA material.
5. PASS — focus management, live status, contrast/axe, touch targets, and
   mobile reading floor; automated Tab/Shift-Tab wrap is not separately logged.
6. PASS — Chromium, Firefox, and WebKit at all eight viewports (24/24).
7. PASS — full E2E with reduced motion enabled.
8. PASS WITH LIMIT — Lighthouse 98/100/100/100, LCP 2.101 s, CLS 0,
   TBT 0 ms, 186 KiB; a field INP value is unavailable locally.
9. PASS — rejected-language, retired-media, and secret heuristics returned no
   matches in the stated runtime paths.
10. PASS — three independent reviewers scored 96, 95, and 94; lowest 94/100,
    every category minimum met, and no kill criterion observed.

## Human-controlled release boundaries

This rebuild does **not** authorize merging, public deployment, or Devpost
submission. Those actions require a separate explicit human decision after the
evidence above is reviewed.

Do not mark a public gate complete without opening the exact target in a
logged-out or judge-equivalent session. After submission, follow the official
rules on whether repository, site, or entry changes are permitted.
