import assert from "node:assert/strict";
import {
  approveClaimEvidence,
  attachEvidence,
  buildPublicationPreview,
  candidateClaimsFromDraft,
  createDemoWorkspace,
  createProofReceipt,
  decideProposal,
  demoResolutions,
  replaceReviewPacket,
  stageResolutionBatch,
  storeReceipt,
  verifyReleaseGate,
} from "../lib/proofrail.ts";

let workspace = createDemoWorkspace();
let gate = verifyReleaseGate(workspace);

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
assert.match(proposedProjection.headline, /In an eight-team pilot/);
assert.match(proposedProjection.body, /Joined by 800 people/);
assert.deepEqual(proposedProjection.stagedClaimIds, ["claim-01", "claim-04"]);
assert.equal(workspace.headline, canonicalBeforeStaging.headline);
assert.equal(workspace.draftText, canonicalBeforeStaging.draftText);

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

workspace = decideProposal(workspace, "claim-01", "approve");
assert.match(workspace.headline, /In an eight-team pilot/);
assert.doesNotMatch(workspace.draftText, /In an eight-team pilot/);
assert.equal(buildPublicationPreview(workspace, "current").headline, workspace.headline);
assert.equal(verifyReleaseGate(workspace).blockers.length, 1);

workspace = decideProposal(workspace, "claim-04", "reject");
gate = verifyReleaseGate(workspace);
assert.equal(gate.status, "blocked");
assert.equal(gate.blockers[0].code, "RESOLUTION_REJECTED");
assert.doesNotMatch(
  buildPublicationPreview(workspace, "proposed").body,
  /Joined by 800 people/,
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
workspace = decideProposal(workspace, "claim-04", "approve");
gate = verifyReleaseGate(workspace);
assert.equal(gate.status, "pass");
assert.equal(gate.blockers.length, 0);

const receipt = await createProofReceipt(workspace);
assert.equal(receipt.contentHash.length, 64);
assert.equal(receipt.matrix.length, 4);
assert.equal(receipt.sourceWorkspaceRevision, workspace.revision);
assert.equal(receipt.publicationType, "launch-page");
assert.equal(receipt.previewTemplateVersion, 1);
assert.equal(receipt.headline, workspace.headline);
assert.equal(receipt.matrix[0].claimLocation, "headline");
assert.equal(receipt.matrix[0].evidence[0].sourceType, "internal-study");
assert.equal(receipt.matrix[0].evidence[0].publishedAt, "2026-08-18");
assert.match(receipt.matrix[0].evidence[0].rationale, /eight-team pilot/);
const changedHeadline = workspace.headline.replace("42%.", "42% today.");
const changedHeadlineReceipt = await createProofReceipt({
  ...workspace,
  headline: changedHeadline,
  claims: workspace.claims.map((claim) =>
    claim.location === "headline" ? { ...claim, text: changedHeadline } : claim,
  ),
});
const changedTypeReceipt = await createProofReceipt({
  ...workspace,
  publicationType: "report",
});
assert.notEqual(changedHeadlineReceipt.contentHash, receipt.contentHash);
assert.notEqual(changedTypeReceipt.contentHash, receipt.contentHash);
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

const unknownDraft =
  "The Arbor pilot enrolled twelve teams. The first review cycle took nineteen minutes. Public exports remain available without an account.";
const unknownHeadline = "The Arbor pilot enrolled twelve teams.";
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
        { length: 12 },
        (_, index) => `Body sentence ${index + 1} contains enough reviewable text.`,
      ).join(" "),
    ),
  /TOO_MANY_CANDIDATES/,
);

const oversizedDraft = Array.from(
  { length: 13 },
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
          text: "twelve teams",
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
  title: "Arbor field note",
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
          revisedText: "A fresh Arbor packet awaiting documented evidence.",
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
  () => decideProposal(duplicateClaimWorkspace, "claim-04", "approve"),
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
            "Joined by 800 people on the 2024 waitlist. Trusted by 999 global enterprises.",
          rationale: "This deliberately tries to introduce a second public claim.",
          expectedClaimRevision: 1,
        },
      ],
      7,
    ),
  /NON_ATOMIC_REVISION/,
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
  () => decideProposal(duplicateProposalWorkspace, "claim-04", "approve"),
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

unknownWorkspace = approveClaimEvidence(unknownWorkspace, "claim-01");
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
scopedAuditWorkspace = approveClaimEvidence(scopedAuditWorkspace, "claim-01");
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
scopedAuditWorkspace = approveClaimEvidence(scopedAuditWorkspace, "claim-02");
const scopedReceipt = await createProofReceipt(scopedAuditWorkspace);
assert.equal(scopedReceipt.publicationType, "report");
assert.equal(scopedReceipt.audit[0].action, "PACKET_REPLACED");
assert.equal(
  scopedReceipt.audit.some((event) => event.action === "PACKET_IMPORTED"),
  false,
);

for (const publicationType of [
  "project-page",
  "blog-post",
  "launch-page",
  "report",
] as const) {
  const typedWorkspace = { ...createDemoWorkspace(), publicationType };
  const projection = buildPublicationPreview(typedWorkspace, "current");
  assert.equal(projection.publicationType, publicationType);
  assert.equal(projection.headline, typedWorkspace.headline);
  assert.equal(projection.body, typedWorkspace.draftText);
}

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
