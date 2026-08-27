# ProofRail trust model

ProofRail is an evidence workflow, not an oracle. The draft, source excerpts,
URLs, tool metadata, tool inputs, and tool outputs are all treated as untrusted
content.

## Security boundaries

### The agent cannot approve

WebMCP exposes inspection, evidence attachment, proposal staging, gate
verification, and receipt export. No tool can approve a proposal or newly
attached supporting evidence. Those release decisions exist only as visible
human interface actions.

### Writes are revision-locked

All agent mutations require the exact current workspace revision. Claim
revisions are additionally required when staging language. A mismatch throws a
STALE_WORKSPACE or STALE_CLAIM error instead of applying a best-effort merge.

### Inputs are narrow

JSON Schemas cap strings and arrays, use enums for relationships and source
types, reject extra properties, and require exact claim identifiers. Domain
validation repeats material checks before changing state.

Imported packets must represent the complete headline as one exact headline
claim and every complete body sentence as an exact body claim. More than eleven
body sentences plus the headline, a sentence longer than 500 characters, an
unknown claim ID, or an ambiguous repeated span fails before state changes.
Extra partial claims, duplicate sentence text, overlapping spans, unknown risk,
source-type, or relationship enums, and staged rewrites containing multiple
sentences also fail in the domain layer rather than relying only on JSON Schema.

### Preview output cannot execute publisher content

The publication preview renders the packet as React text nodes inside one of
four fixed presentation templates. It does not render arbitrary HTML, embed a
publisher URL, execute scripts, invent a CTA, or claim CMS pixel parity.

The proposed preview is a derived copy: staged agent wording never mutates the
canonical headline or body. Every staged span must map exactly once and staged
spans may not overlap. The complete projected headline/body claim map is then
validated again. If any mapping fails, ProofRail refuses the entire proposal
projection and shows the unchanged draft with a visible error instead of
displaying a partial or misleading mix. The internal packet title is kept out of
the simulated public canvas, so it cannot bypass claim review as masthead copy.

### Sources are not fetched

An attached URL is stored as provenance text. ProofRail does not request it,
follow redirects, render it, or send page data to it. Only HTTP(S) URLs are
accepted.

Public-source records require an HTTP(S) URL. Internal records may omit a URL,
but the interface says so explicitly before approval. An agent-provided excerpt
remains untrusted until a human approves the linked evidence and current wording.

### Receipts prove integrity, not truth

The receipt contains the publication type, preview template version, headline,
final body; source type, date, URL, excerpt, edge rationale, and relationship;
the current packet's audit segment; source workspace revision; and a SHA-256
hash over that content. This detects a changed payload without leaking audit
titles from an earlier replaced packet. It does not authenticate the author,
certify a source, guarantee a publisher's final CMS layout, or replace legal or
editorial review.

## Data handling

- State lives only in the current browser page.
- No cookies, accounts, API keys, analytics, or remote database are used.
- Reloading the page restores the fictional demo packet.
- Downloading a receipt is an explicit local human action.

## Known production gaps

A real deployment would still need authenticated identities, server-side
append-only audit storage, signed receipts, source retention rules, access
control, abuse monitoring, rate limits, and multi-user conflict handling. Those
controls are deliberately outside this challenge prototype and are not claimed
as implemented. Internal attachments also need content hashes and durable object
references before this model is suitable for production evidence custody.
