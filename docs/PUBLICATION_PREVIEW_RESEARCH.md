# Publication renderer research and design contract

Research record: 2026-08-27

This note records the structural ideas behind ProofRail's four publication
renderers. It is not a claim that ProofRail copies another site's code, assets,
motion, prompts, or brand identity.

## Core finding

There is no universal premium publication template. A page becomes credible
when its hierarchy follows the communication job and uses only material the
publisher actually supplied.

| Publication type | Primary reader question | Required composition |
| --- | --- | --- |
| Product launch | What changed, why does it matter, and how can I access it? | Outcome-led hero, real product/UI if supplied, differentiator, benefits, demonstrations, use cases, sourced proof, availability, focused CTA |
| Case study | What changed, how was it achieved, and what proves the outcome? | Transformation cover, client/project facts, challenge, insight, approach, system in use, process, sourced outcomes, quote, credits |
| Editorial article | What is the thesis, who wrote it, and how can I follow the argument? | Category, headline, deck, byline/date, hero media, readable chapters, pull quotes, captions, references, related material |
| Report | What are the findings, how were they derived, and what are the limits? | Formal cover, executive summary, numbered findings, navigation, metrics/charts with context, methodology, caveats, sources, archive/download material |

The clean publication canvas and the proof overlay are separate surfaces. Claim
markers, evidence state, proposals, blockers, and decisions belong to the review
layer, not permanently inside the audience-facing design.

## Reference set

References are studied for information structure, rhythm, media function, and
interaction only.

### Product launch

- [Apple MacBook Pro](https://www.apple.com/macbook-pro/)
- [Linear Loops](https://linear.app/now/introducing-loops)
- [Figma Make](https://www.figma.com/blog/introducing-figma-make/)
- [Vercel Agent](https://vercel.com/blog/vercel-agent)

### Case study

- [BASIC/DEPT® Cowboy](https://basicagency.com/case-studies/cowboy)
- [Instrument Levi's](https://www.instrument.com/work/levis)
- [Stripe customer story: Anthropic](https://stripe.com/customers/anthropic)

### Editorial

- [Spotify newsroom](https://newsroom.spotify.com/)
- [Google Design](https://design.google/library/)

### Report

- [Spotify Loud & Clear](https://loudandclear.byspotify.com/)
- [GitHub Octoverse](https://github.blog/news-insights/octoverse/)
- [Stripe annual updates](https://stripe.com/annual-updates/2025)
- [World Economic Forum: Future of Jobs](https://www.weforum.org/publications/the-future-of-jobs-report-2025/)
- [Microsoft Annual Report](https://www.microsoft.com/investor/reports/)

### Product workspace and motion

- [Linear](https://linear.app/)
- [Stripe](https://stripe.com/)
- [Raycast](https://www.raycast.com/)
- [Apple Human Interface Guidelines: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [W3C: Animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)

MotionSites was consulted only as a read-only reference library for dramaturgy
and transition ideas. No proprietary prompt, source code, hosted medium,
complete template, or third-party identity may be copied or hotlinked.

## `PublicationBrief` contract

The model is discriminated by `launch`, `case-study`, `article`, or `report`.
Every public field is either:

- `provided`, with one or more provenance identifiers; or
- `missing`, with a reason and an explicit request for human input.

An empty string, empty array, decorative placeholder, generated customer fact,
or inferred KPI is not a valid substitute for missing data.

Shared concerns include organization, title, deck, sections, brand tokens,
media, claims, sources, revisions, human decisions, release status, provenance,
and accessibility metadata. Type-specific fields then determine each
renderer’s hierarchy.

Generated media has its own provenance and review state. A release candidate
must reject generated assets that are still awaiting human review or were
rejected.

## Four independent composition systems

### Launch

- Product/outcome thesis opens the page.
- Supplied product UI or media receives primary scale.
- Benefits, feature demonstrations, use cases, sourced metrics,
  specifications, access, and CTA follow in a decision-oriented sequence.
- Missing product media remains an explicit media request, not generated fake
  UI.

### Case study

- Transformation and project identity lead.
- Client, scope, and roles form an editorial fact system.
- Challenge, insight, approach, implementation, system in use, outcomes,
  sourced metrics, testimony, gallery, and credits build the narrative.
- Missing outcomes or testimony do not become anonymous praise.

### Article

- Publication identity, category, headline, deck, byline, and date establish
  editorial context.
- A readable long-form column, media captions, quotes, interview/timeline
  modules, references, and related content support the argument.
- Reading time, author, and date remain missing when not supplied.

### Report

- Institution, edition, thesis, and executive summary establish authority.
- Numbered findings pair metrics and charts with context.
- Contents, explorer/comparison, methodology, limitations, sources, FAQ, and
  download/archive metadata support verification and reuse.
- A chart is never generated merely because a number exists in nearby prose.

## Media and motion decision

The renderer system must work without new generated media. The active product
uses no cinematic video or 3D runtime. Higgsfield and Meshy were retired because
their explored directions did not communicate the product state faster or more
accurately than the live 2D interface.

Motion is reserved for causal transitions:

- selected sentence → extracted claim;
- claim → linked source passage;
- current source → proposed direction;
- blocker focus;
- explicit human decision;
- blocked → ready after the real gate changes state.

Motion must never simulate analysis, approval, publishing, or receipt creation.
Reduced-motion mode preserves the complete workflow through immediate state
changes.

## Acceptance evidence

The renderer contract is not accepted by documentation alone. The current local
record includes separate desktop/mobile expanded-canvas captures for all four
types, separate DOM/CSS implementations, missing-field domain cases,
proof-overlay and gate behavior, keyboard/focus checks, reduced-motion E2E,
three-engine/eight-viewport accessibility checks, and representative loaded
performance evidence. See `docs/qa/` and `docs/submission-assets/renderers/`.

This remains local evidence. A final public submission should repeat critical
checks against the exact deployed revision and judge-equivalent browser.
