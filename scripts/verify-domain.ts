import assert from "node:assert/strict";
import {
  approveClaimEvidence,
  attachEvidence,
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
assert.match(workspace.draftText, /In an eight-team pilot/);
assert.equal(verifyReleaseGate(workspace).blockers.length, 1);

workspace = decideProposal(workspace, "claim-04", "reject");
gate = verifyReleaseGate(workspace);
assert.equal(gate.status, "blocked");
assert.equal(gate.blockers[0].code, "RESOLUTION_REJECTED");

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
assert.equal(receipt.matrix[0].evidence[0].sourceType, "internal-study");
assert.equal(receipt.matrix[0].evidence[0].publishedAt, "2026-08-18");
assert.match(receipt.matrix[0].evidence[0].rationale, /eight-team pilot/);
workspace = storeReceipt(workspace, receipt);
assert.equal(workspace.receipt?.receiptId, receipt.receiptId);
assert.equal(workspace.audit.at(-1)?.action, "PROOF_RECEIPT_CREATED");

const unknownDraft =
  "The Arbor pilot enrolled twelve teams. The first review cycle took nineteen minutes. Public exports remain available without an account.";
const candidates = candidateClaimsFromDraft(unknownDraft);
assert.equal(candidates.length, 3);

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
      title: "Incomplete packet",
      headline: "One sentence was deliberately omitted from claim coverage.",
      draftText: unknownDraft,
      claims: [{ text: candidates[0], risk: "medium" }],
      expectedWorkspaceRevision: 7,
    }),
  /INCOMPLETE_CLAIM_COVERAGE/,
);

let unknownWorkspace = createDemoWorkspace();
unknownWorkspace = replaceReviewPacket(unknownWorkspace, {
  title: "Arbor field note",
  headline: "A fresh packet with no prepared evidence.",
  draftText: unknownDraft,
  claims: candidates.map((text) => ({ text, risk: "medium" })),
  expectedWorkspaceRevision: unknownWorkspace.revision,
});
assert.equal(unknownWorkspace.claims.length, 3);
assert.equal(verifyReleaseGate(unknownWorkspace).blockers.length, 3);

assert.throws(
  () =>
    stageResolutionBatch(
      unknownWorkspace,
      [
        {
          claimId: "claim-01",
          revisedText: "The Arbor pilot included a limited group of participating teams.",
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
  draftText: `${duplicateClaimWorkspace.draftText}\n\n${duplicateClaimWorkspace.claims[0].text}`,
};
duplicateClaimWorkspace = stageResolutionBatch(
  duplicateClaimWorkspace,
  [
    {
      claimId: "claim-01",
      revisedText: demoResolutions["claim-01"].revisedText,
      rationale: demoResolutions["claim-01"].rationale,
      expectedClaimRevision: 1,
    },
  ],
  duplicateClaimWorkspace.revision,
);
const duplicateBeforeApproval = structuredClone(duplicateClaimWorkspace);
assert.throws(
  () => decideProposal(duplicateClaimWorkspace, "claim-01", "approve"),
  /AMBIGUOUS_CLAIM_TEXT/,
);
assert.equal(duplicateClaimWorkspace.revision, duplicateBeforeApproval.revision);
assert.equal(duplicateClaimWorkspace.draftText, duplicateBeforeApproval.draftText);
assert.equal(duplicateClaimWorkspace.claims[0].proposal?.status, "staged");

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
assert.equal(verifyReleaseGate(unknownWorkspace).blockers.length, 3);
assert.equal(
  verifyReleaseGate(unknownWorkspace).blockers[0].code,
  "HUMAN_APPROVAL_REQUIRED",
);

unknownWorkspace = approveClaimEvidence(unknownWorkspace, "claim-01");
assert.equal(unknownWorkspace.claims[0].humanApproval, "approved");
assert.equal(verifyReleaseGate(unknownWorkspace).blockers.length, 2);
assert.equal(unknownWorkspace.audit.at(-1)?.actor, "human");

let scopedAuditWorkspace = replaceReviewPacket(workspace, {
  title: "Public release note",
  headline: "Only the current packet may enter its receipt.",
  draftText: "The public release note passed its documented acceptance check.",
  claims: [
    {
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
const scopedReceipt = await createProofReceipt(scopedAuditWorkspace);
assert.equal(scopedReceipt.audit[0].action, "PACKET_REPLACED");
assert.equal(
  scopedReceipt.audit.some((event) => event.action === "PACKET_IMPORTED"),
  false,
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
