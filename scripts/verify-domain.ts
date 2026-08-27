import assert from "node:assert/strict";
import {
  approveClaimEvidence,
  attachEvidence,
  buildPublicationPreview,
  candidateClaimsFromDraft,
  changePublicationType,
  createDemoWorkspace,
  createProofReceipt,
  decideProposal,
  demoResolutions,
  replaceReviewPacket,
  stageResolutionBatch,
  storeReceipt,
  verifyReleaseGate,
} from "../lib/proofrail.ts";
import { extractPublicationMetric } from "../lib/publication-metrics.ts";

function decideCurrent(
  current: ReturnType<typeof createDemoWorkspace>,
  claimId: string,
  decision: "approve" | "reject",
) {
  const claim = current.claims.find((candidate) => candidate.id === claimId);
  if (!claim?.proposal) throw new Error(`NO_STAGED_PROPOSAL: ${claimId}`);
  return decideProposal(current, {
    claimId,
    decision,
    expectedWorkspaceRevision: current.revision,
    expectedClaimRevision: claim.revision,
    expectedProposalId: claim.proposal.id,
  });
}

function approveCurrentEvidence(
  current: ReturnType<typeof createDemoWorkspace>,
  claimId: string,
) {
  const claim = current.claims.find((candidate) => candidate.id === claimId);
  if (!claim) throw new Error(`UNKNOWN_CLAIM: ${claimId}`);
  return approveClaimEvidence(current, {
    claimId,
    expectedWorkspaceRevision: current.revision,
    expectedClaimRevision: claim.revision,
  });
}

let workspace = createDemoWorkspace();
let gate = verifyReleaseGate(workspace);

let heroPreservationWorkspace = createDemoWorkspace();
if (
  heroPreservationWorkspace.publicationBrief?.publicationType !== "launch" ||
  heroPreservationWorkspace.sourcePublicationBrief?.publicationType !== "launch"
) {
  throw new Error("Expected launch briefs for hero-preservation regression.");
}
const uploadedHeroProvenance = {
  id: "uploaded-hero-regression",
  kind: "uploaded-file" as const,
  label: "Uploaded hero regression fixture",
  fileName: "hero.png",
  mediaType: "image/png",
  sha256: "a".repeat(64),
  recordedAt: "2026-08-27T08:02:00.000Z",
  rights: "customer-supplied" as const,
};
const uploadedHero = {
  id: "uploaded-hero-regression",
  kind: "image" as const,
  role: "hero" as const,
  src: "/media/uploaded-hero-regression.png",
  mimeType: "image/png",
  width: 1600,
  height: 900,
  provenanceIds: [uploadedHeroProvenance.id],
  alt: {
    status: "provided" as const,
    value: "Uploaded hero regression fixture.",
    provenanceIds: [uploadedHeroProvenance.id],
  },
  caption: {
    status: "missing" as const,
    reason: "not-provided" as const,
    request: "No caption was supplied for this regression fixture.",
  },
  loading: "eager" as const,
};
for (const brief of [
  heroPreservationWorkspace.sourcePublicationBrief,
  heroPreservationWorkspace.publicationBrief,
]) {
  brief.provenance = [...brief.provenance, uploadedHeroProvenance];
  brief.mediaAssets = [...brief.mediaAssets, uploadedHero];
}
const immutableHeroSource = structuredClone(
  heroPreservationWorkspace.sourcePublicationBrief,
);
heroPreservationWorkspace = stageResolutionBatch(
  heroPreservationWorkspace,
  [
    {
      claimId: "claim-01",
      revisedText: demoResolutions["claim-01"].revisedText,
      rationale: demoResolutions["claim-01"].rationale,
      expectedClaimRevision: 1,
    },
  ],
  heroPreservationWorkspace.revision,
);
heroPreservationWorkspace = decideCurrent(
  heroPreservationWorkspace,
  "claim-01",
  "approve",
);
assert.deepEqual(
  heroPreservationWorkspace.sourcePublicationBrief,
  immutableHeroSource,
);
assert.deepEqual(heroPreservationWorkspace.publicationBrief?.mediaAssets, [uploadedHero]);

assert.equal(workspace.revision, 7);
assert.equal(workspace.publicationType, "launch-page");
assert.equal(workspace.claims[0].location, "headline");
assert.equal(workspace.claims.slice(1).every((claim) => claim.location === "body"), true);
assert.equal(gate.status, "blocked");
assert.deepEqual(
  gate.blockers.map((blocker) => blocker.claimId),
  ["claim-01", "claim-04"],
);

const unknownClaimBefore = structuredClone(workspace);
assert.throws(
  () =>
    stageResolutionBatch(
      workspace,
      [
        {
          claimId: "claim-99",
          revisedText: "This unknown claim must never mutate the workspace.",
          rationale: "The identifier is intentionally absent from the packet.",
          expectedClaimRevision: 1,
        },
      ],
      workspace.revision,
    ),
  /UNKNOWN_CLAIM/,
);
assert.equal(workspace.revision, unknownClaimBefore.revision);
assert.equal(workspace.audit.length, unknownClaimBefore.audit.length);
assert.equal(
  workspace.claims.filter((claim) => claim.proposal?.status === "staged").length,
  0,
);

const canonicalBeforeStaging = structuredClone(workspace);
const sourceBriefBeforeStaging = structuredClone(workspace.sourcePublicationBrief);
workspace = stageResolutionBatch(
  workspace,
  ["claim-01", "claim-04"].map((claimId) => ({
    claimId,
    revisedText: demoResolutions[claimId].revisedText,
    rationale: demoResolutions[claimId].rationale,
    expectedClaimRevision: 1,
  })),
  7,
);
assert.equal(workspace.revision, 8);
assert.equal(verifyReleaseGate(workspace).openHumanDecisions, 2);
const currentProjection = buildPublicationPreview(workspace, "current");
const proposedProjection = buildPublicationPreview(workspace, "proposed");
assert.equal(currentProjection.headline, canonicalBeforeStaging.headline);
assert.equal(currentProjection.body, canonicalBeforeStaging.draftText);
assert.match(proposedProjection.headline, /exact final wording/);
assert.match(proposedProjection.body, /passing ProofRail receipt/);
assert.deepEqual(proposedProjection.stagedClaimIds, ["claim-01", "claim-04"]);
assert.equal(workspace.headline, canonicalBeforeStaging.headline);
assert.equal(workspace.draftText, canonicalBeforeStaging.draftText);
assert.deepEqual(workspace.sourcePublicationBrief, sourceBriefBeforeStaging);
assert.deepEqual(workspace.publicationBrief, canonicalBeforeStaging.publicationBrief);

assert.throws(
  () =>
    stageResolutionBatch(
      workspace,
      [
        {
          claimId: "claim-01",
          revisedText: "A stale change that should never be applied.",
          rationale: "This intentionally uses an obsolete workspace revision.",
          expectedClaimRevision: 1,
        },
      ],
      7,
    ),
  /STALE_WORKSPACE/,
);

workspace = decideCurrent(workspace, "claim-01", "approve");
assert.match(workspace.headline, /exact final wording/);
assert.doesNotMatch(workspace.draftText, /exact final wording/);
assert.equal(buildPublicationPreview(workspace, "current").headline, workspace.headline);
assert.equal(verifyReleaseGate(workspace).blockers.length, 1);
assert.deepEqual(workspace.sourcePublicationBrief, sourceBriefBeforeStaging);
assert.equal(workspace.publicationBrief?.publicationType, "launch");
if (workspace.publicationBrief?.publicationType !== "launch") {
  throw new Error("Expected preserved launch release candidate.");
}
assert.equal(workspace.publicationBrief.featureChapters.status, "provided");
assert.match(
  workspace.publicationBrief.title.status === "provided"
    ? workspace.publicationBrief.title.value
    : "",
  /exact final wording/,
);

workspace = decideCurrent(workspace, "claim-04", "reject");
gate = verifyReleaseGate(workspace);
assert.equal(gate.status, "blocked");
assert.equal(gate.blockers[0].code, "RESOLUTION_REJECTED");
assert.doesNotMatch(
  buildPublicationPreview(workspace, "proposed").body,
  /passing ProofRail receipt/,
);

workspace = stageResolutionBatch(
  workspace,
  [
    {
      claimId: "claim-04",
      revisedText: demoResolutions["claim-04"].revisedText,
      rationale: demoResolutions["claim-04"].rationale,
      expectedClaimRevision: 3,
    },
  ],
  workspace.revision,
);
workspace = decideCurrent(workspace, "claim-04", "approve");
gate = verifyReleaseGate(workspace);
assert.equal(gate.status, "pass");
assert.equal(gate.blockers.length, 0);

const adverseResolutionWorkspace = structuredClone(workspace);
adverseResolutionWorkspace.edges = adverseResolutionWorkspace.edges.map((edge) =>
  edge.claimId === "claim-04"
    ? { ...edge, relation: "contradicts" as const }
    : edge,
);
assert.equal(
  verifyReleaseGate(adverseResolutionWorkspace).blockers.find(
    (blocker) => blocker.claimId === "claim-04",
  )?.code,
  "CONTRADICTED",
);
await assert.rejects(
  () => createProofReceipt(adverseResolutionWorkspace),
  /RELEASE_BLOCKED.*claim-04:CONTRADICTED/,
);

const staleApprovalSource = createDemoWorkspace();
const staleApprovalClaim = staleApprovalSource.claims[0];
const staleApprovalInput = {
  claimId: staleApprovalClaim.id,
  expectedWorkspaceRevision: staleApprovalSource.revision,
  expectedClaimRevision: staleApprovalClaim.revision,
};
const changedBeforeApproval = changePublicationType(
  staleApprovalSource,
  "report",
);
assert.throws(
  () => approveClaimEvidence(changedBeforeApproval, staleApprovalInput),
  /STALE_WORKSPACE/,
);

const stagedForStaleDecision = stageResolutionBatch(
  createDemoWorkspace(),
  [
    {
      claimId: "claim-01",
      revisedText: demoResolutions["claim-01"].revisedText,
      rationale: demoResolutions["claim-01"].rationale,
      expectedClaimRevision: 1,
    },
  ],
  7,
);
const stagedClaimForStaleDecision = stagedForStaleDecision.claims[0];
const staleDecisionInput = {
  claimId: stagedClaimForStaleDecision.id,
  decision: "approve" as const,
  expectedWorkspaceRevision: stagedForStaleDecision.revision,
  expectedClaimRevision: stagedClaimForStaleDecision.revision,
  expectedProposalId: stagedClaimForStaleDecision.proposal!.id,
};
assert.throws(
  () =>
    decideProposal(stagedForStaleDecision, {
      ...staleDecisionInput,
      expectedClaimRevision: stagedClaimForStaleDecision.revision - 1,
    }),
  /STALE_CLAIM/,
);
assert.throws(
  () =>
    decideProposal(stagedForStaleDecision, {
      ...staleDecisionInput,
      expectedProposalId: "proposal-obsolete",
    }),
  /STALE_PROPOSAL/,
);
const changedBeforeDecision = changePublicationType(
  stagedForStaleDecision,
  "report",
);
assert.throws(
  () => decideProposal(changedBeforeDecision, staleDecisionInput),
  /STALE_WORKSPACE/,
);

const receipt = await createProofReceipt(workspace);
assert.equal(receipt.publicationBrief.publicationType, "launch");
if (receipt.publicationBrief.publicationType !== "launch") {
  throw new Error("Expected a launch brief in the receipt.");
}
assert.equal(receipt.publicationBrief.featureChapters.status, "provided");
assert.deepEqual(workspace.sourcePublicationBrief, sourceBriefBeforeStaging);
assert.equal(receipt.contentHash.length, 64);
assert.equal(Number.isNaN(Date.parse(receipt.generatedAt)), false);
assert.equal(receipt.matrix.length, 4);
assert.equal(receipt.sourceWorkspaceRevision, workspace.revision);
assert.equal(receipt.publicationType, "launch-page");
assert.equal(receipt.previewTemplateVersion, 3);
assert.equal(receipt.publicationBrief.publicationType, "launch");
assert.equal(receipt.headline, workspace.headline);
assert.equal(receipt.matrix[0].claimLocation, "headline");
assert.equal(receipt.matrix[0].evidence[0].sourceType, "engineering-control");
assert.equal(receipt.matrix[0].evidence[0].publishedAt, "2026-08-27");
assert.match(receipt.matrix[0].evidence[0].rationale, /human approval boundary/);
const changedHeadline = workspace.headline.replace(
  "exact final wording.",
  "final wording in the reviewed revision.",
);
const changedHeadlineReceipt = await createProofReceipt({
  ...workspace,
  headline: changedHeadline,
  claims: workspace.claims.map((claim) =>
    claim.location === "headline" ? { ...claim, text: changedHeadline } : claim,
  ),
});
const changedTypeWorkspace = changePublicationType(workspace, "report");
await assert.rejects(
  () => createProofReceipt(changedTypeWorkspace),
  /RELEASE_BLOCKED.*HUMAN_APPROVAL_REQUIRED/,
);
const changedBriefWorkspace = structuredClone(workspace);
if (
  !changedBriefWorkspace.publicationBrief ||
  changedBriefWorkspace.publicationBrief.title.status !== "provided"
) {
  throw new Error("EXPECTED_PROVIDED_PUBLICATION_TITLE");
}
changedBriefWorkspace.publicationBrief.title.value += " · alternate presentation";
const changedBriefReceipt = await createProofReceipt(changedBriefWorkspace);
assert.notEqual(changedHeadlineReceipt.contentHash, receipt.contentHash);
assert.notEqual(changedBriefReceipt.contentHash, receipt.contentHash);
await assert.rejects(
  () =>
    createProofReceipt({
      ...workspace,
      headline: `${workspace.headline} Unreviewed addition.`,
    }),
  /PUBLICATION_COVERAGE_INVALID/,
);
workspace = storeReceipt(workspace, receipt);
assert.equal(workspace.receipt?.receiptId, receipt.receiptId);
assert.equal(workspace.audit.at(-1)?.action, "PROOF_RECEIPT_CREATED");
assert.equal(
  buildPublicationPreview(workspace, "current").sealedContentRevision,
  receipt.sourceWorkspaceRevision,
);
const reportLayoutWorkspace = changePublicationType(workspace, "report");
assert.equal(reportLayoutWorkspace.publicationType, "report");
assert.equal(reportLayoutWorkspace.revision, workspace.revision + 1);
assert.equal(reportLayoutWorkspace.receipt, undefined);
assert.equal(
  reportLayoutWorkspace.invalidatedReceipt?.receiptId,
  receipt.receiptId,
);
assert.equal(
  reportLayoutWorkspace.audit.at(-1)?.action,
  "PUBLICATION_FORMAT_CHANGED",
);
assert.equal(verifyReleaseGate(reportLayoutWorkspace).status, "blocked");
assert.equal(verifyReleaseGate(reportLayoutWorkspace).openHumanDecisions, 4);

const unknownDraft =
  "The verification exercise included twelve internal review runs. The first review cycle took nineteen minutes. Public exports remain available without an account.";
const unknownHeadline =
  "The verification exercise included twelve internal review runs.";
const candidates = candidateClaimsFromDraft(unknownDraft);
assert.equal(candidates.length, 3);
const wrappedDraft =
  "A field note spans\none intentionally wrapped line.  A second sentence keeps exact spacing.";
const wrappedCandidates = candidateClaimsFromDraft(wrappedDraft);
assert.equal(
  wrappedCandidates[0],
  "A field note spans\none intentionally wrapped line.",
);
assert.equal(wrappedCandidates[1], "A second sentence keeps exact spacing.");
assert.deepEqual(candidateClaimsFromDraft("We won. It is documented in the report."), [
  "We won.",
  "It is documented in the report.",
]);
assert.deepEqual(
  candidateClaimsFromDraft(
    "A source-backed structured heading\n\nA source-backed structured module without terminal punctuation",
  ),
  [
    "A source-backed structured heading",
    "A source-backed structured module without terminal punctuation",
  ],
);
assert.deepEqual(
  candidateClaimsFromDraft(
    "A U.S. launch is ready. Dr. Rivera approved the evidence package.",
  ),
  ["A U.S. launch is ready.", "Dr. Rivera approved the evidence package."],
);
assert.deepEqual(
  candidateClaimsFromDraft(
    "The packet includes, e.g. a dated report excerpt. Research Corp. published the result.",
  ),
  [
    "The packet includes, e.g. a dated report excerpt.",
    "Research Corp. published the result.",
  ],
);
assert.throws(
  () =>
    candidateClaimsFromDraft(
      "We launched in the U.S. Canada followed one week later.",
    ),
  /AMBIGUOUS_SENTENCE_BOUNDARY/,
);
const shortSentenceDraft =
  "Free. This release completed the documented acceptance review.";
const shortSentenceCandidates = candidateClaimsFromDraft(shortSentenceDraft);
assert.deepEqual(shortSentenceCandidates, [
  "Free.",
  "This release completed the documented acceptance review.",
]);
const shortSentenceWorkspace = replaceReviewPacket(createDemoWorkspace(), {
  publicationType: "project-page",
  title: "Short sentence coverage",
  headline: "Every public sentence enters the claim gate.",
  draftText: shortSentenceDraft,
  claims: [
    {
      location: "headline",
      text: "Every public sentence enters the claim gate.",
      risk: "medium",
    },
    ...shortSentenceCandidates.map((text) => ({
      location: "body" as const,
      text,
      risk: "medium" as const,
    })),
  ],
  expectedWorkspaceRevision: 7,
});
assert.equal(shortSentenceWorkspace.claims[1].text, "Free.");
assert.throws(
  () =>
    candidateClaimsFromDraft(
      Array.from(
        { length: 49 },
        (_, index) => `Body sentence ${index + 1} contains enough reviewable text.`,
      ).join(" "),
    ),
  /TOO_MANY_CANDIDATES/,
);

const oversizedDraft = Array.from(
  { length: 49 },
  (_, index) => `Documented release sentence number ${index + 1} has a complete review scope.`,
).join(" ");
assert.throws(() => candidateClaimsFromDraft(oversizedDraft), /TOO_MANY_CANDIDATES/);
assert.throws(
  () => candidateClaimsFromDraft(`A normal review sentence. ${"x".repeat(500)}.`),
  /CLAIM_TOO_LONG/,
);

assert.throws(
  () =>
    replaceReviewPacket(createDemoWorkspace(), {
      publicationType: "blog-post",
      title: "Incomplete packet",
      headline: unknownHeadline,
      draftText: unknownDraft,
      claims: [
        { location: "headline", text: unknownHeadline, risk: "medium" },
        { location: "body", text: candidates[0], risk: "medium" },
      ],
      expectedWorkspaceRevision: 7,
    }),
  /INCOMPLETE_CLAIM_COVERAGE/,
);
assert.throws(
  () =>
    replaceReviewPacket(createDemoWorkspace(), {
      publicationType: "blog-post",
      title: "Overlapping packet",
      headline: unknownHeadline,
      draftText: unknownDraft,
      claims: [
        { location: "headline", text: unknownHeadline, risk: "medium" },
        ...candidates.map((text) => ({
          location: "body" as const,
          text,
          risk: "medium" as const,
        })),
        {
          location: "body",
          text: "twelve internal review runs",
          risk: "medium",
        },
      ],
      expectedWorkspaceRevision: 7,
    }),
  /NON_ATOMIC_BODY_CLAIM/,
);
assert.throws(
  () =>
    replaceReviewPacket(createDemoWorkspace(), {
      publicationType: "blog-post",
      title: "Invalid risk packet",
      headline: unknownHeadline,
      draftText: unknownDraft,
      claims: [
        { location: "headline", text: unknownHeadline, risk: "critical" as never },
        ...candidates.map((text) => ({
          location: "body" as const,
          text,
          risk: "medium" as const,
        })),
      ],
      expectedWorkspaceRevision: 7,
    }),
  /INVALID_CLAIM_RISK/,
);

let unknownWorkspace = createDemoWorkspace();
unknownWorkspace = replaceReviewPacket(unknownWorkspace, {
  publicationType: "blog-post",
  title: "Imported field note",
  headline: unknownHeadline,
  draftText: unknownDraft,
  claims: [
    { location: "headline", text: unknownHeadline, risk: "medium" },
    ...candidates.map((text) => ({
      location: "body" as const,
      text,
      risk: "medium" as const,
    })),
  ],
  expectedWorkspaceRevision: unknownWorkspace.revision,
});
assert.equal(unknownWorkspace.claims.length, 4);
assert.equal(unknownWorkspace.publicationType, "blog-post");
assert.equal(verifyReleaseGate(unknownWorkspace).blockers.length, 4);

assert.throws(
  () =>
    stageResolutionBatch(
      createDemoWorkspace(),
      [
        {
          claimId: "claim-02",
          revisedText: "Every workspace uses encrypted transport.",
          rationale: "This unnecessary rewrite targets an already releasable claim.",
          expectedClaimRevision: 1,
        },
      ],
      7,
    ),
  /CLAIM_ALREADY_RELEASABLE/,
);

assert.throws(
  () =>
    stageResolutionBatch(
      unknownWorkspace,
      [
        {
          claimId: "claim-01",
          revisedText: "A fresh review packet awaiting documented evidence.",
          rationale: "The language is narrower, but no source has been linked yet.",
          expectedClaimRevision: 1,
        },
      ],
      unknownWorkspace.revision,
    ),
  /NO_LINKED_EVIDENCE/,
);

const forgedResolvedWorkspace = structuredClone(unknownWorkspace);
forgedResolvedWorkspace.claims[0] = {
  ...forgedResolvedWorkspace.claims[0],
  state: "resolved",
  label: "Human approved",
};
assert.equal(
  verifyReleaseGate(forgedResolvedWorkspace).blockers[0].code,
  "NO_RESOLUTION_EVIDENCE",
);
await assert.rejects(
  () => createProofReceipt(forgedResolvedWorkspace),
  /RELEASE_BLOCKED: claim-01:NO_RESOLUTION_EVIDENCE/,
);

let duplicateClaimWorkspace = createDemoWorkspace();
duplicateClaimWorkspace = {
  ...duplicateClaimWorkspace,
  draftText: `${duplicateClaimWorkspace.draftText}\n\n${duplicateClaimWorkspace.claims[3].text}`,
};
duplicateClaimWorkspace = stageResolutionBatch(
  duplicateClaimWorkspace,
  [
    {
      claimId: "claim-04",
      revisedText: demoResolutions["claim-04"].revisedText,
      rationale: demoResolutions["claim-04"].rationale,
      expectedClaimRevision: 1,
    },
  ],
  duplicateClaimWorkspace.revision,
);
const duplicateBeforeApproval = structuredClone(duplicateClaimWorkspace);
assert.throws(
  () => decideCurrent(duplicateClaimWorkspace, "claim-04", "approve"),
  /AMBIGUOUS_CLAIM_TEXT/,
);
assert.equal(duplicateClaimWorkspace.revision, duplicateBeforeApproval.revision);
assert.equal(duplicateClaimWorkspace.draftText, duplicateBeforeApproval.draftText);
assert.equal(duplicateClaimWorkspace.claims[3].proposal?.status, "staged");

const unavailableProjection = buildPublicationPreview(
  duplicateClaimWorkspace,
  "proposed",
);
assert.equal(unavailableProjection.errorCode, "PROPOSAL_PREVIEW_UNAVAILABLE");
assert.equal(unavailableProjection.body, duplicateClaimWorkspace.draftText);

assert.throws(
  () =>
    stageResolutionBatch(
      createDemoWorkspace(),
      [
        {
          claimId: "claim-04",
          revisedText:
            "The receipt seals the documented revision. It also proves universal adoption.",
          rationale: "This deliberately tries to introduce a second public claim.",
          expectedClaimRevision: 1,
        },
      ],
      7,
    ),
  /NON_ATOMIC_REVISION/,
);
assert.throws(
  () =>
    stageResolutionBatch(
      createDemoWorkspace(),
      [
        {
          claimId: "claim-04",
          revisedText:
            "The receipt seals the current revision\n\nand its documented evidence.",
          rationale: "This deliberately attempts to cross a visible preview paragraph.",
          expectedClaimRevision: 1,
        },
      ],
      7,
    ),
  /CROSS_PARAGRAPH_REVISION/,
);

const crossParagraphDraft =
  "A review sentence crosses\n\na visible paragraph before it finishes.";
assert.throws(
  () =>
    replaceReviewPacket(createDemoWorkspace(), {
      publicationType: "blog-post",
      title: "Cross-paragraph coverage",
      headline: "Every visible claim must retain its state marker.",
      draftText: crossParagraphDraft,
      claims: [
        {
          location: "headline",
          text: "Every visible claim must retain its state marker.",
          risk: "medium",
        },
        { location: "body", text: crossParagraphDraft, risk: "medium" },
      ],
      expectedWorkspaceRevision: 7,
    }),
  /CROSS_PARAGRAPH_CLAIM/,
);

let duplicateProposalWorkspace = createDemoWorkspace();
duplicateProposalWorkspace = stageResolutionBatch(
  duplicateProposalWorkspace,
  [
    {
      claimId: "claim-04",
      revisedText: duplicateProposalWorkspace.claims[2].text,
      rationale: "This deliberately duplicates another public sentence.",
      expectedClaimRevision: 1,
    },
  ],
  duplicateProposalWorkspace.revision,
);
const duplicateProposalPreview = buildPublicationPreview(
  duplicateProposalWorkspace,
  "proposed",
);
assert.equal(
  duplicateProposalPreview.errorCode,
  "PROPOSAL_PREVIEW_UNAVAILABLE",
);
assert.equal(duplicateProposalPreview.body, duplicateProposalWorkspace.draftText);
assert.throws(
  () => decideCurrent(duplicateProposalWorkspace, "claim-04", "approve"),
  /AMBIGUOUS_PUBLICATION_CLAIM/,
);

const invalidEvidenceBase = {
  claimId: "claim-01",
  title: "Runtime enum test",
  publishedAt: "2026-08-27",
  excerpt: "A sufficiently long excerpt for runtime validation.",
  rationale: "A sufficiently concrete rationale for runtime validation.",
  expectedWorkspaceRevision: 7,
};
assert.throws(
  () =>
    attachEvidence(createDemoWorkspace(), {
      ...invalidEvidenceBase,
      sourceType: "database" as never,
      relation: "supports",
    }),
  /INVALID_EVIDENCE_SOURCE_TYPE/,
);
assert.throws(
  () =>
    attachEvidence(createDemoWorkspace(), {
      ...invalidEvidenceBase,
      sourceType: "internal-study",
      relation: "agrees" as never,
    }),
  /INVALID_EVIDENCE_RELATION/,
);

unknownWorkspace = attachEvidence(unknownWorkspace, {
  claimId: "claim-01",
  title: "Pilot roster",
  sourceType: "internal-study",
  publishedAt: "2026-08-26",
  excerpt: "The signed roster contains twelve distinct participating teams.",
  relation: "supports",
  rationale: "The roster directly supports the stated participant count.",
  expectedWorkspaceRevision: unknownWorkspace.revision,
});
assert.equal(unknownWorkspace.claims[0].state, "supported");
assert.equal(unknownWorkspace.claims[0].humanApproval, "pending");
assert.equal(verifyReleaseGate(unknownWorkspace).blockers.length, 4);
assert.equal(
  verifyReleaseGate(unknownWorkspace).blockers[0].code,
  "HUMAN_APPROVAL_REQUIRED",
);

unknownWorkspace = approveCurrentEvidence(unknownWorkspace, "claim-01");
assert.equal(unknownWorkspace.claims[0].humanApproval, "approved");
assert.equal(verifyReleaseGate(unknownWorkspace).blockers.length, 3);
assert.equal(unknownWorkspace.audit.at(-1)?.actor, "human");

let scopedAuditWorkspace = replaceReviewPacket(workspace, {
  publicationType: "report",
  title: "Public release note",
  headline: "Only the current packet may enter its receipt.",
  draftText: "The public release note passed its documented acceptance check.",
  claims: [
    {
      location: "headline",
      text: "Only the current packet may enter its receipt.",
      risk: "medium",
    },
    {
      location: "body",
      text: "The public release note passed its documented acceptance check.",
      risk: "medium",
    },
  ],
  expectedWorkspaceRevision: workspace.revision,
});
assert.equal(scopedAuditWorkspace.audit.at(-1)?.actor, "agent");
assert.equal(scopedAuditWorkspace.id, `workspace-active-review-r${workspace.revision + 1}`);
assert.notEqual(scopedAuditWorkspace.id, "workspace-proofrail-self-demo");
assert.equal(scopedAuditWorkspace.sourcePublicationBrief?.provenance[0].kind, "agent-input");
const humanImportedWorkspace = replaceReviewPacket(
  workspace,
  {
    publicationType: "report",
    title: "Human import packet",
    headline: "A human imported this exact public headline.",
    draftText: "A human imported this exact public body sentence for review.",
    claims: [
      {
        location: "headline",
        text: "A human imported this exact public headline.",
        risk: "medium",
      },
      {
        location: "body",
        text: "A human imported this exact public body sentence for review.",
        risk: "medium",
      },
    ],
    expectedWorkspaceRevision: workspace.revision,
  },
  "human",
);
assert.equal(humanImportedWorkspace.audit.at(-1)?.actor, "human");
assert.equal(
  humanImportedWorkspace.sourcePublicationBrief?.provenance[0].kind,
  "human-input",
);
scopedAuditWorkspace = attachEvidence(scopedAuditWorkspace, {
  claimId: "claim-01",
  title: "Acceptance record",
  sourceType: "product-test",
  publishedAt: "2026-08-27",
  excerpt: "The signed acceptance record marks the public release check as passed.",
  relation: "supports",
  rationale: "The record directly supports the current release-note wording.",
  expectedWorkspaceRevision: scopedAuditWorkspace.revision,
});
scopedAuditWorkspace = approveCurrentEvidence(scopedAuditWorkspace, "claim-01");
scopedAuditWorkspace = attachEvidence(scopedAuditWorkspace, {
  claimId: "claim-02",
  title: "Acceptance record body copy",
  sourceType: "product-test",
  publishedAt: "2026-08-27",
  excerpt: "The signed acceptance record marks the public release check as passed.",
  relation: "supports",
  rationale: "The record directly supports the current release-note body wording.",
  expectedWorkspaceRevision: scopedAuditWorkspace.revision,
});
scopedAuditWorkspace = approveCurrentEvidence(scopedAuditWorkspace, "claim-02");
const scopedReceipt = await createProofReceipt(scopedAuditWorkspace);
assert.equal(scopedReceipt.publicationType, "report");
assert.equal(scopedReceipt.audit[0].action, "PACKET_REPLACED");
assert.equal(
  scopedReceipt.audit.some((event) => event.action === "PACKET_IMPORTED"),
  false,
);

for (const publicationType of [
  "launch-page",
  "project-page",
  "blog-post",
  "report",
] as const) {
  const typedWorkspace = { ...createDemoWorkspace(), publicationType };
  const projection = buildPublicationPreview(typedWorkspace, "current");
  assert.equal(projection.publicationType, publicationType);
  assert.equal(projection.headline, typedWorkspace.headline);
  assert.equal(projection.body, typedWorkspace.draftText);
}

assert.deepEqual(
  extractPublicationMetric("Handoff time fell by 42%.", "No extra metric."),
  { value: "42%", visualPercent: 42 },
);
assert.deepEqual(
  extractPublicationMetric(
    "A field study across 12 buildings.",
    "The unit must remain attached.",
  ),
  { value: "12 buildings", visualPercent: null },
);
assert.equal(
  extractPublicationMetric(
    "A qualitative finding without a number.",
    "No decorative KPI should be invented.",
  ),
  null,
);

console.log(
  JSON.stringify(
    {
      status: "pass",
      finalDemoRevision: workspace.revision,
      receiptId: receipt.receiptId,
      unknownInputClaims: candidates.length,
    },
    null,
    2,
  ),
);
