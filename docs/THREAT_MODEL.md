# ProofRail trust model

ProofRail is an evidence workflow, not an oracle. The draft, source excerpts,
URLs, tool metadata, tool inputs, and tool outputs are all treated as untrusted
content.

## Security boundaries

### The agent cannot approve

WebMCP exposes inspection, evidence attachment, proposal staging, gate
verification, and receipt export. No tool can approve a proposal. Approval and
rejection exist only as visible human interface actions.

### Writes are revision-locked

All agent mutations require the exact current workspace revision. Claim
revisions are additionally required when staging language. A mismatch throws a
STALE_WORKSPACE or STALE_CLAIM error instead of applying a best-effort merge.

### Inputs are narrow

JSON Schemas cap strings and arrays, use enums for relationships and source
types, reject extra properties, and require exact claim identifiers. Domain
validation repeats material checks before changing state.

### Sources are not fetched

An attached URL is stored as provenance text. ProofRail does not request it,
follow redirects, render it, or send page data to it. Only HTTP(S) URLs are
accepted.

### Receipts prove integrity, not truth

The receipt contains the final text, claim-evidence matrix, captured audit log,
source workspace revision, and a SHA-256 hash over that content. This detects a
changed payload. It does not authenticate the author, certify a source, or
replace legal or editorial review.

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
as implemented.
