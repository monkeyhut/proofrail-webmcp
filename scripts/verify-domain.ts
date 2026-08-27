import assert from "node:assert/strict";
import {
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
workspace = storeReceipt(workspace, receipt);
assert.equal(workspace.receipt?.receiptId, receipt.receiptId);
assert.equal(workspace.audit.at(-1)?.action, "PROOF_RECEIPT_CREATED");

const unknownDraft =
  "The Arbor pilot enrolled twelve teams. The first review cycle took nineteen minutes. Public exports remain available without an account.";
const candidates = candidateClaimsFromDraft(unknownDraft);
assert.equal(candidates.length, 3);

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
assert.equal(verifyReleaseGate(unknownWorkspace).blockers.length, 2);

console.log(
  JSON.stringify(
    {
      status: "pass",
      checks: 18,
      finalDemoRevision: workspace.revision,
      receiptId: receipt.receiptId,
      unknownInputClaims: candidates.length,
    },
    null,
    2,
  ),
);
