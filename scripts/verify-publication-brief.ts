import assert from "node:assert/strict";
import {
  PUBLICATION_BRIEF_SCHEMA_VERSION,
  createEmptyPublicationWorkspace,
  createProofRailSelfDemoBrief,
  createProofRailSelfDemoWorkspace,
  createSourceOnlyPublicationBrief,
  decidePublicationProposal,
  loadPublicationSource,
  missing,
  publicationStructureClaimFragments,
  provided,
  replacePublicationBriefClaim,
  stagePublicationProposal,
  validatePublicationBrief,
  validatePublicationWorkspace,
  type ArticlePublicationBrief,
  type CaseStudyPublicationBrief,
  type PublicationBriefType,
  type ReportPublicationBrief,
} from "../lib/publication-brief.ts";

const FIXTURE_AT = "2026-08-27T10:00:00.000Z";
const FIXTURE_PROVENANCE_ID = "fixture-human-input";

function commonBriefFields<TType extends PublicationBriefType>(
  publicationType: TType,
) {
  return {
    schemaVersion: PUBLICATION_BRIEF_SCHEMA_VERSION,
    publicationType,
    organization: missing(
      "awaiting-human-input" as const,
      "Supply the publishing organization before public release.",
    ),
    title: provided("Publication review packet", [FIXTURE_PROVENANCE_ID]),
    deck: missing(
      "not-provided" as const,
      "Supply a deck only when the source publication contains one.",
    ),
    sections: missing(
      "not-provided" as const,
      "Supply source sections before rendering the publication.",
    ),
    brandTokens: missing(
      "not-provided" as const,
      "Supply approved brand tokens before applying customer styling.",
    ),
    mediaAssets: [],
    provenance: [
      {
        id: FIXTURE_PROVENANCE_ID,
        kind: "human-input" as const,
        label: "Deterministic verifier input",
        inputMethod: "text" as const,
        recordedAt: FIXTURE_AT,
        rights: "project-authored" as const,
      },
    ],
    accessibilityMetadata: {
      language: "en",
      readingDirection: "ltr" as const,
      motionAlternative: missing(
        "not-applicable" as const,
        "No motion is present in this domain fixture.",
      ),
      editorialNotes: missing(
        "not-provided" as const,
        "Add accessibility editorial notes when the source requires them.",
      ),
    },
  };
}

const caseStudyBrief: CaseStudyPublicationBrief = {
  ...commonBriefFields("case-study"),
  client: missing("awaiting-human-input", "Supply the real client name."),
  project: missing("awaiting-human-input", "Supply the real project name."),
  roles: missing("not-provided", "Supply the documented project roles."),
  scope: missing("not-provided", "Supply the documented project scope."),
  challenge: missing("not-provided", "Supply the source challenge statement."),
  insight: missing("not-provided", "Supply the source insight statement."),
  approach: missing("not-provided", "Supply the source approach statement."),
  systemInUse: missing(
    "not-provided",
    "Supply implementation evidence before showing the system in use.",
  ),
  implementation: missing(
    "not-provided",
    "Supply documented implementation chapters.",
  ),
  outcomes: missing(
    "awaiting-verification",
    "Supply sourced outcomes; do not infer them.",
  ),
  metrics: missing(
    "awaiting-verification",
    "Supply sourced metrics; do not invent decorative KPIs.",
  ),
  testimonial: missing(
    "not-provided",
    "Supply a real, approved quotation and attribution.",
  ),
  gallery: missing("not-provided", "Supply approved project media."),
  credits: missing("not-provided", "Supply the documented project credits."),
};

const articleBrief: ArticlePublicationBrief = {
  ...commonBriefFields("article"),
  publication: missing(
    "awaiting-human-input",
    "Supply the publication name.",
  ),
  category: missing("not-provided", "Supply the editorial category."),
  headline: provided("Publication review packet", [FIXTURE_PROVENANCE_ID]),
  author: missing("awaiting-human-input", "Supply the real author."),
  publicationDate: missing(
    "not-provided",
    "Supply a publication date only when scheduled.",
  ),
  readingTime: missing(
    "awaiting-verification",
    "Calculate reading time from the final human-approved text.",
  ),
  heroMediaAssetId: missing("not-provided", "Supply approved hero media."),
  thesis: missing("not-provided", "Supply the source thesis."),
  pullQuotes: missing("not-provided", "Supply sourced pull quotes."),
  captions: missing("not-provided", "Supply captions for approved media."),
  references: missing("not-provided", "Supply the article references."),
  relatedContent: missing(
    "not-provided",
    "Supply related content only when editorially selected.",
  ),
};

const reportBrief: ReportPublicationBrief = {
  ...commonBriefFields("report"),
  institution: missing(
    "awaiting-human-input",
    "Supply the issuing institution.",
  ),
  edition: missing("not-provided", "Supply the report edition or version."),
  abstract: missing("not-provided", "Supply the source abstract."),
  executiveSummary: missing(
    "not-provided",
    "Supply the source executive summary.",
  ),
  findings: missing(
    "awaiting-verification",
    "Supply numbered findings with their provenance.",
  ),
  datasets: missing("not-provided", "Supply referenced datasets."),
  charts: missing("not-provided", "Supply approved chart assets."),
  methodology: missing(
    "awaiting-verification",
    "Supply the documented methodology; never derive it from evidence labels.",
  ),
  limitations: missing(
    "awaiting-verification",
    "Supply the report limitations and caveats.",
  ),
  sources: missing("not-provided", "Supply the public report sources."),
  faq: missing("not-provided", "Supply editorially approved FAQ entries."),
  downloadMetadata: missing(
    "not-provided",
    "Supply an approved report file before showing a download.",
  ),
};

const empty = createEmptyPublicationWorkspace();
validatePublicationWorkspace(empty);
assert.equal(empty.state, "empty");
assert.equal(empty.revision, 0);
assert.equal(empty.publicationType, null);
assert.equal(empty.authority.source, null);
assert.equal(empty.authority.proposal, null);
assert.equal(empty.authority.releaseCandidate, null);
assert.equal(empty.humanDecisions.length, 0);
assert.equal(empty.audit.length, 0);

for (const brief of [
  createProofRailSelfDemoBrief(),
  caseStudyBrief,
  articleBrief,
  reportBrief,
]) {
  validatePublicationBrief(brief);
}

assert.deepEqual(
  [
    createProofRailSelfDemoBrief().publicationType,
    caseStudyBrief.publicationType,
    articleBrief.publicationType,
    reportBrief.publicationType,
  ],
  ["launch", "case-study", "article", "report"],
);

const sourceOnlyInputs = [
  ["launch-page", "launch"],
  ["project-page", "case-study"],
  ["blog-post", "article"],
  ["report", "report"],
] as const;
const exactImportedBody =
  "The first supplied sentence remains source material.\n\nThe second supplied sentence remains source material.";
for (const [sourceType, expectedType] of sourceOnlyInputs) {
  const sourceOnly = createSourceOnlyPublicationBrief({
    publicationType: sourceType,
    organization: "ProofRail",
    title: "Human-supplied packet title",
    headline: "Human-supplied public headline",
    body: exactImportedBody,
    author: "Release review team",
    audience: "Marketing and PR teams",
    publishedLabel: "Human review draft",
    cta: "Inspect release blockers",
    recordedAt: FIXTURE_AT,
    provenanceId: `source-import-${sourceType}`,
    inputMethod: "form",
  });
  validatePublicationBrief(sourceOnly);
  assert.equal(sourceOnly.publicationType, expectedType);
  assert.equal(sourceOnly.provenance.length, 1);
  assert.equal(sourceOnly.provenance[0].kind, "human-input");
  assert.equal(sourceOnly.mediaAssets.length, 0);
  assert.equal(sourceOnly.sourceImport.body.value, exactImportedBody);
  assert.equal(sourceOnly.sourceImport.title.value, "Human-supplied packet title");
  assert.equal(
    sourceOnly.title.status === "provided" ? sourceOnly.title.value : "",
    "Human-supplied public headline",
  );
  assert.equal(sourceOnly.sourceImport.organization.status, "provided");
  assert.equal(sourceOnly.sourceImport.author.status, "provided");
  assert.equal(sourceOnly.sourceImport.audience.status, "provided");
  assert.equal(sourceOnly.sourceImport.publishedLabel.status, "provided");
  assert.equal(sourceOnly.sourceImport.cta.status, "provided");
  for (const field of [
    sourceOnly.sourceImport.title,
    sourceOnly.sourceImport.headline,
    sourceOnly.sourceImport.body,
  ]) {
    assert.deepEqual(field.provenanceIds, [`source-import-${sourceType}`]);
  }
  assert.doesNotMatch(
    JSON.stringify(sourceOnly),
    /your company|public audience|editorial team|learn more|fake navigation/i,
  );

  switch (sourceOnly.publicationType) {
    case "launch":
      assert.equal(sourceOnly.proofMetrics.status, "missing");
      assert.equal(sourceOnly.gallery.status, "missing");
      assert.equal(sourceOnly.cta.status, "provided");
      assert.equal(
        sourceOnly.cta.status === "provided"
          ? sourceOnly.cta.value.destination.status
          : "provided",
        "missing",
      );
      break;
    case "case-study":
      assert.equal(sourceOnly.client.status, "missing");
      assert.equal(sourceOnly.metrics.status, "missing");
      assert.equal(sourceOnly.testimonial.status, "missing");
      break;
    case "article":
      assert.equal(sourceOnly.headline.status, "provided");
      assert.equal(
        sourceOnly.headline.status === "provided"
          ? sourceOnly.headline.value
          : "",
        "Human-supplied public headline",
      );
      assert.equal(sourceOnly.author.status, "provided");
      assert.equal(sourceOnly.heroMediaAssetId.status, "missing");
      break;
    case "report":
      assert.equal(sourceOnly.findings.status, "missing");
      assert.equal(sourceOnly.charts.status, "missing");
      assert.equal(sourceOnly.methodology.status, "missing");
      break;
  }
}

const agentSourceOnly = createSourceOnlyPublicationBrief({
  publicationType: "blog-post",
  title: "Agent packet",
  headline: "Agent-supplied wording remains pending human review",
  body: "This exact source was supplied by an agent through WebMCP.",
  recordedAt: FIXTURE_AT,
  provenanceId: "agent-webmcp-source",
  sourceActor: "agent",
});
assert.equal(agentSourceOnly.provenance[0].kind, "agent-input");
assert.equal(agentSourceOnly.provenance[0].label, "Agent-supplied publication source");
assert.doesNotMatch(agentSourceOnly.provenance[0].label, /human-supplied/i);

const structuredCase = createSourceOnlyPublicationBrief({
  publicationType: "project-page",
  title: "Structured case",
  headline: "A documented transformation",
  body: "The supplied case body remains exact.",
  recordedAt: FIXTURE_AT,
  provenanceId: "structured-case-source",
  structure: {
    deck: "A human-supplied case-study deck.",
    caseStudy: {
      client: "ProofRail",
      project: "Publication compiler",
      roles: "Editorial design\nRelease governance",
      challenge: "Factual copy was difficult to trace before release.",
      insight: "The publication and evidence must be reviewed together.",
      approach: "Keep proposals separate from human decisions.",
      systemTitle: "Review in context",
      systemBody: "The publication canvas and review rail share one revision.",
      outcomes: "Review blockers remain visible.\nRelease authority remains human.",
      credits: "ProofRail product team",
    },
  },
});
assert.equal(structuredCase.publicationType, "case-study");
if (structuredCase.publicationType !== "case-study") {
  throw new Error("Expected a case-study brief.");
}
assert.equal(structuredCase.deck.status, "provided");
assert.equal(structuredCase.client.status, "provided");
assert.equal(structuredCase.roles.status, "provided");
assert.equal(structuredCase.challenge.status, "provided");
assert.equal(structuredCase.systemInUse.status, "provided");
assert.equal(structuredCase.outcomes.status, "provided");

const structuredArticle = createSourceOnlyPublicationBrief({
  publicationType: "blog-post",
  title: "Structured article",
  headline: "Human authority stays visible",
  body: "The supplied article body remains exact.",
  author: "ProofRail product team",
  publishedLabel: "2026-08-27",
  recordedAt: FIXTURE_AT,
  provenanceId: "structured-article-source",
  structure: {
    article: {
      publication: "ProofRail Journal",
      category: "Release governance",
      thesis: "Publication quality and factual assurance belong in one review.",
      pullQuote: "The human gate is a product boundary.",
      pullQuoteAttribution: "ProofRail product team",
    },
  },
});
assert.equal(structuredArticle.publicationType, "article");
if (structuredArticle.publicationType !== "article") {
  throw new Error("Expected an article brief.");
}
assert.equal(structuredArticle.publication.status, "provided");
assert.equal(structuredArticle.category.status, "provided");
assert.equal(structuredArticle.publicationDate.status, "provided");
assert.equal(structuredArticle.thesis.status, "provided");
assert.equal(structuredArticle.pullQuotes.status, "provided");
assert.deepEqual(
  publicationStructureClaimFragments("blog-post", {
    deck: "A supplied deck sentence.",
    article: {
      publication: "Identity metadata, not a sentence claim",
      category: "Release governance",
      thesis: "The supplied thesis enters the claim gate.",
      pullQuote: "The supplied quotation enters the claim gate.",
    },
  }),
  [
    "A supplied deck sentence.",
    "The supplied thesis enters the claim gate.",
    "The supplied quotation enters the claim gate.",
  ],
);

const structuredReport = createSourceOnlyPublicationBrief({
  publicationType: "report",
  title: "Structured report",
  headline: "Evidence before release",
  body: "The supplied report body remains exact.",
  recordedAt: FIXTURE_AT,
  provenanceId: "structured-report-source",
  structure: {
    report: {
      institution: "ProofRail",
      edition: "Challenge prototype",
      abstract: "A supplied abstract.",
      executiveSummary: "A supplied executive summary.",
      findings:
        "Unsupported claims block release | The deterministic gate fails closed.\nHuman decisions remain explicit | Agents cannot approve or publish.",
      methodology: "Deterministic domain and browser checks.",
      limitations: "No production deployment was tested.",
    },
  },
});
assert.equal(structuredReport.publicationType, "report");
if (structuredReport.publicationType !== "report") {
  throw new Error("Expected a report brief.");
}
assert.equal(structuredReport.institution.status, "provided");
assert.equal(structuredReport.findings.status, "provided");
assert.equal(
  structuredReport.findings.status === "provided"
    ? structuredReport.findings.value.length
    : 0,
  2,
);
assert.equal(structuredReport.methodology.status, "provided");
assert.equal(structuredReport.limitations.status, "provided");

const sourceReportSnapshot = structuredClone(structuredReport);
const proposedReport = replacePublicationBriefClaim(
  structuredReport,
  "finding:human-finding-01",
  "The deterministic gate fails closed.",
  "The deterministic gate blocks release when a required decision is missing.",
);
if (proposedReport.publicationType !== "report") {
  throw new Error("Expected report claim replacement to preserve publication type.");
}
assert.deepEqual(structuredReport, sourceReportSnapshot);
assert.deepEqual(proposedReport.mediaAssets, structuredReport.mediaAssets);
assert.deepEqual(proposedReport.provenance, structuredReport.provenance);
assert.deepEqual(proposedReport.brandTokens, structuredReport.brandTokens);
assert.equal(
  proposedReport.findings.status === "provided"
    ? proposedReport.findings.value[0].context
    : "",
  "The deterministic gate blocks release when a required decision is missing.",
);
assert.equal(
  structuredReport.findings.status === "provided"
    ? structuredReport.findings.value[0].context
    : "",
  "The deterministic gate fails closed.",
);
assert.deepEqual(
  publicationStructureClaimFragments("report", {
    report: {
      findings: "Finding title | Finding context is claim-covered.",
      methodology: "The methodology enters the claim gate.",
    },
  }),
  [
    "The methodology enters the claim gate.",
    "Finding title",
    "Finding context is claim-covered.",
  ],
);
assert.throws(
  () =>
    createSourceOnlyPublicationBrief({
      publicationType: "report",
      title: "Malformed findings",
      headline: "Malformed findings stay blocked",
      body: "The report contains one malformed structured finding.",
      recordedAt: FIXTURE_AT,
      structure: { report: { findings: "Missing the required separator" } },
    }),
  /INVALID_REPORT_FINDING/,
);

const sparseSourceOnly = createSourceOnlyPublicationBrief({
  publicationType: "blog-post",
  title: "Only supplied title",
  headline: "Only supplied headline",
  body: "Only supplied body.",
  recordedAt: FIXTURE_AT,
  provenanceId: "sparse-human-input",
});
assert.equal(sparseSourceOnly.sourceImport.organization.status, "missing");
assert.equal(sparseSourceOnly.sourceImport.author.status, "missing");
assert.equal(sparseSourceOnly.sourceImport.audience.status, "missing");
assert.equal(sparseSourceOnly.sourceImport.publishedLabel.status, "missing");
assert.equal(sparseSourceOnly.sourceImport.cta.status, "missing");

const urlSourceOnly = createSourceOnlyPublicationBrief({
  publicationType: "blog-post",
  title: "URL import",
  headline: "Exact URL headline",
  body: "Exact body extracted from the supplied URL.",
  recordedAt: FIXTURE_AT,
  provenanceId: "url-source",
  publicUrl: "https://example.com/publication",
  inputMethod: "url-import",
});
assert.equal(urlSourceOnly.provenance[0].kind, "public-url");

const fileSourceOnly = createSourceOnlyPublicationBrief({
  publicationType: "report",
  title: "File import",
  headline: "Exact file headline",
  body: "Exact body extracted from the supplied file.",
  recordedAt: FIXTURE_AT,
  provenanceId: "file-source",
  uploadedFile: {
    fileName: "publication.md",
    mediaType: "text/markdown",
    sha256: "a".repeat(64),
  },
  inputMethod: "text",
});
assert.equal(fileSourceOnly.provenance[0].kind, "uploaded-file");
assert.throws(
  () =>
    createSourceOnlyPublicationBrief({
      publicationType: "report",
      title: "Ambiguous source",
      headline: "Ambiguous source headline",
      body: "This source declares two incompatible provenance paths.",
      recordedAt: FIXTURE_AT,
      publicUrl: "https://example.com/publication",
      uploadedFile: {
        fileName: "publication.md",
        mediaType: "text/markdown",
        sha256: "b".repeat(64),
      },
    }),
  /AMBIGUOUS_SOURCE_PROVENANCE/,
);

assert.throws(
  () => provided("", [FIXTURE_PROVENANCE_ID]),
  /INVALID_TEXT/,
);
assert.throws(
  () => provided([], [FIXTURE_PROVENANCE_ID]),
  /EMPTY_PROVIDED_VALUE/,
);
assert.throws(
  () => provided("Public copy", []),
  /MISSING_PROVENANCE/,
);
assert.throws(
  () => missing("not-provided", ""),
  /INVALID_TEXT/,
);

assert.throws(
  () =>
    validatePublicationBrief({
      ...articleBrief,
      title: provided("Unknown source", ["missing-provenance"]),
    }),
  /UNKNOWN_PROVENANCE/,
);
assert.throws(
  () =>
    validatePublicationBrief({
      ...caseStudyBrief,
      publicationType: "report",
    } as unknown as ReportPublicationBrief),
  /INCOMPLETE_REPORT_BRIEF/,
);

const selfDemo = createProofRailSelfDemoWorkspace();
validatePublicationWorkspace(selfDemo);
assert.equal(selfDemo.demo?.kind, "proofrail-self-demo");
assert.equal(selfDemo.demo?.label, "Verified ProofRail self-demo");
assert.equal(selfDemo.releaseStatus, "blocked");
assert.equal(selfDemo.authority.source.authority, "source");
assert.equal(selfDemo.authority.proposal, null);
assert.equal(selfDemo.authority.releaseCandidate, null);
assert.equal(selfDemo.authority.source.brief.mediaAssets.length, 0);
assert.equal(selfDemo.authority.source.brief.proofMetrics.status, "missing");

const serializedSelfDemo = JSON.stringify(selfDemo);
assert.doesNotMatch(
  serializedSelfDemo,
  /fictional customer|customer testimonial|unverified adoption/i,
);
assert.doesNotMatch(serializedSelfDemo, /\b\d+(?:[.,]\d+)?\s*%/);

const proposedBrief = structuredClone(selfDemo.authority.source.brief);
proposedBrief.title = provided(
  "Check every factual sentence before release",
  ["proofrail-readme", "proofrail-trust-model"],
);

const staged = stagePublicationProposal(selfDemo, proposedBrief, {
  proposalId: "proposal-self-demo-001",
  proposedAt: "2026-08-27T10:01:00.000Z",
  proposedBy: "agent",
  rationale:
    "Make the first action explicit while preserving the documented human approval boundary.",
  expectedWorkspaceRevision: selfDemo.revision,
  expectedSourceRevision: selfDemo.authority.source.revision,
});
validatePublicationWorkspace(staged);
assert.equal(staged.releaseStatus, "human-review-pending");
assert.equal(staged.authority.proposal?.authority, "proposal");
assert.equal(staged.authority.proposal?.status, "pending-human-review");
assert.equal(staged.authority.releaseCandidate, null);
assert.equal(
  staged.authority.source.brief.title.status === "provided"
    ? staged.authority.source.brief.title.value
    : "",
  "ProofRail keeps public claims locked until a human approves the final wording.",
);
assert.equal(
  staged.authority.proposal?.brief.title.status === "provided"
    ? staged.authority.proposal.brief.title.value
    : "",
  "Check every factual sentence before release",
);

assert.throws(
  () =>
    decidePublicationProposal(staged, {
      id: "forged-agent-decision",
      actor: "agent" as never,
      decision: "approved",
      proposalId: "proposal-self-demo-001",
      expectedProposalRevision: 1,
      expectedWorkspaceRevision: staged.revision,
      decidedAt: "2026-08-27T10:02:00.000Z",
      rationale: "An agent must never cross the human approval boundary.",
    }),
  /HUMAN_APPROVAL_REQUIRED/,
);
assert.equal(staged.authority.releaseCandidate, null);
assert.equal(staged.humanDecisions.length, 0);

const approved = decidePublicationProposal(staged, {
  id: "human-decision-001",
  actor: "human",
  decision: "approved",
  proposalId: "proposal-self-demo-001",
  expectedProposalRevision: 1,
  expectedWorkspaceRevision: staged.revision,
  decidedAt: "2026-08-27T10:03:00.000Z",
  rationale: "The exact proposed title is approved for the release candidate.",
});
validatePublicationWorkspace(approved);
assert.equal(approved.releaseStatus, "candidate-approved-pending-gate");
assert.equal(approved.authority.proposal?.status, "approved");
assert.equal(approved.authority.releaseCandidate?.authority, "release-candidate");
assert.equal(approved.authority.releaseCandidate?.approval.actor, "human");
assert.equal(approved.authority.releaseCandidate?.approval.decision, "approved");
assert.equal(approved.humanDecisions.length, 1);
assert.equal(approved.audit.at(-1)?.actor, "human");
assert.match(approved.audit.at(-1)?.detail ?? "", /still requires.*release gate/i);

const forgedCandidate = structuredClone(approved);
if (forgedCandidate.authority.releaseCandidate) {
  forgedCandidate.authority.releaseCandidate.approval.actor = "agent" as never;
}
assert.throws(
  () => validatePublicationWorkspace(forgedCandidate),
  /INVALID_RELEASE_CANDIDATE/,
);

const droppedCandidate = structuredClone(approved);
droppedCandidate.authority.releaseCandidate = null;
droppedCandidate.releaseStatus = "blocked";
assert.throws(
  () => validatePublicationWorkspace(droppedCandidate),
  /approved proposal must retain/i,
);

const replacement = loadPublicationSource(approved, articleBrief, {
  sourceId: "article-source-001",
  loadedAt: "2026-08-27T10:04:00.000Z",
  loadedBy: "human",
  provenanceIds: [FIXTURE_PROVENANCE_ID],
  expectedWorkspaceRevision: approved.revision,
});
validatePublicationWorkspace(replacement);
assert.equal(replacement.publicationType, "article");
assert.equal(replacement.releaseStatus, "blocked");
assert.equal(replacement.authority.proposal, null);
assert.equal(replacement.authority.releaseCandidate, null);
assert.equal(replacement.audit.at(-1)?.action, "SOURCE_REPLACED");

assert.throws(
  () =>
    stagePublicationProposal(selfDemo, proposedBrief, {
      proposalId: "stale-proposal",
      proposedAt: "2026-08-27T10:05:00.000Z",
      proposedBy: "agent",
      rationale: "This write deliberately carries an obsolete source revision.",
      expectedWorkspaceRevision: selfDemo.revision,
      expectedSourceRevision: selfDemo.authority.source.revision + 1,
    }),
  /STALE_SOURCE/,
);

const generatedBrief = structuredClone(selfDemo.authority.source.brief);
generatedBrief.provenance = [
  ...generatedBrief.provenance,
  {
    id: "generated-pending-review",
    kind: "generated-asset",
    label: "Verifier-only generated media record",
    provider: "openai-imagegen",
    promptReference: "docs/fixture-prompt.md",
    reviewStatus: "pending-human-review",
    recordedAt: FIXTURE_AT,
    rights: "project-authored",
  },
];
generatedBrief.mediaAssets = [
  {
    id: "generated-hero",
    kind: "image",
    role: "hero",
    src: "/media/verifier-only.webp",
    mimeType: "image/webp",
    width: 1600,
    height: 1000,
    provenanceIds: ["generated-pending-review"],
    alt: provided("A verifier-only publication illustration.", [
      "generated-pending-review",
    ]),
    caption: missing(
      "not-provided",
      "Supply a factual caption only when it enters claim review.",
    ),
    loading: "eager",
  },
];
generatedBrief.gallery = provided(
  ["generated-hero"],
  ["generated-pending-review"],
);
validatePublicationBrief(generatedBrief);

const generatedStaged = stagePublicationProposal(selfDemo, generatedBrief, {
  proposalId: "proposal-generated-media",
  proposedAt: "2026-08-27T10:06:00.000Z",
  proposedBy: "agent",
  rationale:
    "Exercise the separate human review requirement for generated publication media.",
  expectedWorkspaceRevision: selfDemo.revision,
  expectedSourceRevision: selfDemo.authority.source.revision,
});
assert.throws(
  () =>
    decidePublicationProposal(generatedStaged, {
      id: "human-decision-generated-media",
      actor: "human",
      decision: "approved",
      proposalId: "proposal-generated-media",
      expectedProposalRevision: 1,
      expectedWorkspaceRevision: generatedStaged.revision,
      decidedAt: "2026-08-27T10:07:00.000Z",
      rationale:
        "The copy is acceptable, but the generated media has not been visually approved.",
    }),
  /GENERATED_MEDIA_NOT_APPROVED/,
);
assert.equal(generatedStaged.authority.releaseCandidate, null);

console.log(
  JSON.stringify(
    {
      status: "pass",
      schemaVersion: PUBLICATION_BRIEF_SCHEMA_VERSION,
      publicationTypes: ["launch", "case-study", "article", "report"],
      emptyState: empty.state,
      selfDemoLabel: selfDemo.demo?.label,
      humanBoundary: approved.authority.releaseCandidate?.approval.actor,
      releaseStatus: approved.releaseStatus,
      generatedMediaBoundary: "pass",
    },
    null,
    2,
  ),
);
