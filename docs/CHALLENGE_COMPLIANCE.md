# WebMCP Challenge compliance matrix

Checked against live Devpost data on 2026-08-27 for **The WebMCP Challenge**
(`webmcp`). Submission closes **2026-09-03 13:00 PT / 22:00 CEST**. The
[official rules](https://webmcp.devpost.com/rules) and Devpost form prevail over
this working checklist.

## Judging criteria

| Criterion | ProofRail evidence |
| --- | --- |
| WebMCP Leverage | Six narrow page-owned tools cover live draft inspection, evidence attachment, revision-locked proposals, gate verification, and receipt export. Human approval is deliberately not exposed as a tool. |
| Execution | The working UI shows the complete publication in a live simulated layout, plus the full blocked → agent proposal → human decision → deterministic release → receipt path. Domain, clarity, lint, type, build, mobile, and browser checks are repeatable. |
| Potential Impact | Marketing and PR teams can preview and control factual claims in project pages, blog posts, launch pages, and reports before those words reach the public. |
| Creativity & Ambition | ProofRail applies CI concepts—tests, patches, protected review, and build receipts—to public language without pretending that an agent is a truth oracle. |

## Required deliverables

| Requirement | Current evidence | Gate |
| --- | --- | --- |
| Working live URL | ChatGPT Sites project exists; final public deployment and WebMCP re-test are still required. | OPEN |
| Public repository | `https://github.com/monkeyhut/proofrail-webmcp` is public. GitHub detects the MIT license. Final challenge commit must land on the default branch. | IN REVIEW |
| Complete source, assets, and instructions | Source, generated media, local setup, six-tool manifest, tests, threat model, and asset provenance are versioned. | PASS |
| Text description | `docs/CHALLENGE_SUBMISSION.md` covers WebMCP fit, human-agent benefit, implementation, impact, and limitations. | PASS |
| Public YouTube demo under 3 minutes | A 2:25 shot-by-shot script exists. Final recording must show the live WebMCP flow and include English audio. | OPEN |
| Browser-accessible WebMCP | Six tools were discovered and exercised locally in the Codex in-app browser. Repeat against the public URL before submission. | IN REVIEW |
| Public open-source license | Root `LICENSE` is MIT and detected by GitHub. Generated media are explicitly outside the MIT grant. | PASS |
| Third-party rights | Paid-plan output terms and generated-asset provenance are recorded in `docs/ASSET_PROVENANCE.md`; C2PA metadata is retained. | PASS WITH DISCLOSURE |
| English materials | UI, README, testing instructions, and submission kit are in English. | PASS |

## Required Devpost form answers still owned by the participant

- Submitter type and country of residence.
- App status (`New` or `Existing`) and, if existing, exact work added after
  2026-08-25 11:00 PT.
- Public live URL and public repository URL.
- Browser/client used to test the WebMCP tools.
- AI tools used and self-reported learning/value answers.
- Public YouTube demo URL.

Do not mark a gate as passed without opening the public target in a logged-out or
judge-equivalent session. After the deadline, do not modify the submitted repo,
site, or Devpost entry until winners are announced.
