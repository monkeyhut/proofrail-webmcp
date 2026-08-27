# Publication preview research

Research date: 2026-08-27

This note records the visual and information-architecture research behind
ProofRail's type-aware publication preview. It is a design reference, not a
claim that ProofRail copies any source implementation.

## Core finding

There is no universal "premium company page." The appropriate layout depends
on the publication's job and the assets the company actually owns:

| Communication job | What strong companies foreground | ProofRail renderer |
| --- | --- | --- |
| Product launch | Product or interface, one thesis, availability, CTA, supported performance | Split product hero, supplied asset or typographic fallback, factual benefit modules |
| Project / case study | Client, outcome, real work, early facts or KPIs, scope, narrative | Full-bleed case cover, fact strip, outcome and story sections |
| Blog / journal | Publication identity, category, headline/deck, author, date, readable article | Editorial masthead, lead composition, byline, 60-72ch reading column |
| Research report | Institution, date/version, abstract, key findings, contents, exhibits, method | Formal cover, contents, finding module, source register |

The public preview must be a clean audience-facing page. Claim markers and
review actions belong to a separate proof layer, never permanently inside the
published design.

## Primary-source reference set

### Launch and product storytelling

- [Apple MacBook Pro](https://www.apple.com/macbook-pro/): the real product and
  a short claim dominate; 3D/film is justified because the product itself is
  physical.
- [Figma Make launch](https://www.figma.com/blog/introducing-figma-make/):
  editorial launch structure followed immediately by real product UI.
- [Linear Next](https://linear.app/next): sparse, thesis-led campaign
  storytelling and restrained typographic motion.
- [Vercel Agent launch](https://vercel.com/blog/introducing-vercel-agent):
  technical launch with concise metadata, audience, availability and real
  workflows.
- [Anthropic product news](https://www.anthropic.com/news/claude-design-anthropic-labs):
  warm corporate editorial design with owned artwork and concrete examples.

### Project and case-study storytelling

- [Stripe x Anthropic](https://stripe.com/customers/anthropic): outcome-led
  title, early KPI rail, product facts and quotes.
- [Linear x OpenAI](https://linear.app/customers/openai): outcome headline,
  branded lead visual and an early context/facts row.
- [Webflow x Purpose Brands](https://webflow.com/customers/purpose-brands):
  split hero, real site medium, results and executive quote.
- [Pentagram Scenario](https://www.pentagram.com/work/scenario): minimal
  metadata followed by the actual creative work at large scale.

### Editorial, newsroom and research

- [Linear Now](https://linear.app/now), [Notion Blog](https://www.notion.com/en-us/blog),
  [Stripe Newsroom](https://stripe.com/newsroom), [Apple Newsroom](https://www.apple.com/newsroom/),
  [Patagonia Stories](https://www.patagonia.com/stories/all/) and
  [Airbnb Newsroom](https://news.airbnb.com/) informed category, author,
  date, press-utility and long-form reading patterns.
- [WEF Future of Jobs](https://www.weforum.org/publications/the-future-of-jobs-report-2025/),
  [McKinsey State of AI](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai?lang=en),
  [GitHub Octoverse](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/),
  [Microsoft Annual Report](https://www.microsoft.com/investor/reports/ar25/index.html)
  and [Spotify Loud & Clear](https://loudandclear.byspotify.com/) informed
  report covers, key findings, exhibits, navigation, methodology and caveats.

## MotionSites member-library review

The signed-in MotionSites member library was inspected read-only. No prompt,
source code or media was copied or hotlinked.

- Blog Showcase informed the large editorial lead and publication masthead.
- LaunchEx About and Submissions informed asymmetric project/report layouts.
- NexaCore Control and Process informed the real claim-to-source system logic.
- Email Landing Page informed the controlled draft-to-publication match cut.
- Urban Jungle informed the project renderer's image-first editorial scale.

MotionSites Systema is no longer used as a universal visual template. A single
black card skeleton made all publication types look like the same internal
tool. The outer ProofRail shell may carry a consistent product language, while
each public renderer keeps its own information architecture.

## Implemented design contract

- The publication occupies roughly 60 percent of the desktop opening view and
  remains readable rather than appearing as a miniature browser card.
- Format switching changes DOM structure, typography and media logic, not only
  color.
- Four art directions are available: precision tech, editorial human,
  institutional and bold consumer.
- Import captures brand, industry, audience, author/institution, date/version,
  CTA, type-specific subject or client, and—where the renderer uses it—an
  optional real hero image with descriptive alt text and focal point.
- If no real asset is supplied, ProofRail uses an explicitly disclosed
  typographic art-direction fallback. It does not invent a product photo,
  customer logo, quote or KPI.
- Quantitative presentation is fail-closed: a value appears only when it is
  present verbatim with its unit in the public copy. A chart appears only for a
  bounded percentage; missing metrics produce narrative composition, not a
  fabricated number or bar.
- Internal evidence records never render in the clean public report. Longer
  public prose such as methodology or image captions is deliberately not a
  profile field in this challenge build: it must enter the headline/body claim
  map before ProofRail may render and seal it.
- Public page and proof overlay are separate modes. Switching to proof uses a
  controlled rail wipe and exposes exact claim states.
- Motion represents real state changes: hero reveal, format match cut and
  proof-layer reveal. It never suggests that approval or publishing happened.
- Reduced-motion users receive the same information without those animations.
- Generated workflow frames and the Meshy dossier study live only in the
  ProofRail method section. They never enter a simulated customer publication,
  because doing so would imply that the customer supplied or approved assets
  they do not own.

## Rejected patterns

- Generic orb, chrome ring, particle field, glassmorphism or unrelated 3D
  "evidence core."
- Fake KPI cards, invented customer marks, invented product imagery or charts
  based on numbers that are not present in the draft/evidence.
- Permanent audit badges embedded in the clean public page.
- One beige/black document card relabeled as launch, project, blog and report.
- Cinematic video inside a report or newsroom when it is not an authentic
  publication asset.
