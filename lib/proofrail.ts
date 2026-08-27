export type ClaimState =
  | "supported"
  | "qualified"
  | "contradicted"
  | "outdated"
  | "unreviewed"
  | "resolved";

export type EvidenceRelation =
  | "supports"
  | "qualifies"
  | "contradicts"
  | "outdated";

export type ProposalStatus = "staged" | "approved" | "rejected";
export type HumanApproval = "pending" | "approved";
export type Actor = "agent" | "human" | "system";
export type ClaimLocation = "headline" | "body";
export type PublicationType =
  | "project-page"
  | "blog-post"
  | "launch-page"
  | "report";

// Keep imported publications bounded, but large enough for a substantive article or
// report. Every accepted body sentence remains its own exact, gated claim; callers
// must never make an oversized packet fit by truncating or merging source text.
export const MAX_REVIEW_BODY_CANDIDATES = 96;
export const MAX_REVIEW_PACKET_CLAIMS = MAX_REVIEW_BODY_CANDIDATES + 1;

export type ResolutionProposal = {
  id: string;
  before: string;
  after: string;
  rationale: string;
  baseClaimRevision: number;
  status: ProposalStatus;
};

export type ReviewClaim = {
  id: string;
  number: string;
  location: ClaimLocation;
  text: string;
  originalText: string;
  state: ClaimState;
  label: string;
  risk: "low" | "medium" | "high";
  revision: number;
  humanApproval: HumanApproval;
  previewTargetId?: string;
  proposal?: ResolutionProposal;
};

export type EvidenceRecord = {
  id: string;
  title: string;
  sourceType:
    | "internal-study"
    | "engineering-control"
    | "product-test"
    | "public-source"
    | "archive";
  publishedAt: string;
  excerpt: string;
  sourceUrl?: string;
};

export type EvidenceEdge = {
  id: string;
  claimId: string;
  evidenceId: string;
  relation: EvidenceRelation;
  rationale: string;
};

export type AuditEvent = {
  id: string;
  at: string;
  actor: Actor;
  action: string;
  detail: string;
  workspaceRevision: number;
};

export type GateBlocker = {
  claimId: string;
  code:
    | "UNREVIEWED"
    | "QUALIFIER_REQUIRED"
    | "CONTRADICTED"
    | "OUTDATED"
    | "HUMAN_REVIEW_PENDING"
    | "HUMAN_APPROVAL_REQUIRED"
    | "RESOLUTION_REJECTED"
    | "NO_SUPPORTING_EDGE"
    | "NO_RESOLUTION_EVIDENCE"
    | "BROKEN_EVIDENCE_EDGE"
    | "PUBLICATION_COVERAGE_INVALID";
  detail: string;
};

export type ReleaseGate = {
  status: "blocked" | "pass";
  checkedRevision: number;
  blockers: GateBlocker[];
  openHumanDecisions: number;
  releasableClaims: number;
};

export type ProofReceipt = {
  receiptId: string;
  generatedAt: string;
  sourceWorkspaceRevision: number;
  contentHash: string;
  publicationType: PublicationType;
  previewTemplateVersion: 3;
  publicationBrief: PublicationBrief;
  title: string;
  headline: string;
  finalText: string;
  matrix: Array<{
    claimId: string;
    claimLocation: ClaimLocation;
    claimText: string;
    decision: string;
    evidence: Array<{
      evidenceId: string;
      title: string;
      sourceType: EvidenceRecord["sourceType"];
      publishedAt: string;
      sourceUrl: string | null;
      relation: EvidenceRelation;
      excerpt: string;
      rationale: string;
    }>;
  }>;
  audit: AuditEvent[];
};

export type Workspace = {
  id: string;
  publicationType: PublicationType;
  title: string;
  headline: string;
  draftText: string;
  revision: number;
  claims: ReviewClaim[];
  evidence: EvidenceRecord[];
  edges: EvidenceEdge[];
  audit: AuditEvent[];
  /** Immutable imported source used by the Current Source view. */
  sourcePublicationBrief?: PublicationBrief;
  /** Human-accepted working candidate; never substitutes for the source snapshot. */
  publicationBrief?: PublicationBrief;
  receipt?: ProofReceipt;
  invalidatedReceipt?: ProofReceipt;
};

export type AttachEvidenceInput = {
  claimId: string;
  title: string;
  sourceType: EvidenceRecord["sourceType"];
  publishedAt: string;
  excerpt: string;
  sourceUrl?: string;
  relation: EvidenceRelation;
  rationale: string;
  expectedWorkspaceRevision: number;
};

export type ReplacePacketInput = {
  publicationType: PublicationType;
  title: string;
  headline: string;
  draftText: string;
  claims: Array<{
    location: ClaimLocation;
    text: string;
    risk: ReviewClaim["risk"];
    previewTargetId?: string;
  }>;
  expectedWorkspaceRevision: number;
  publicationBrief?: PublicationBrief;
};

export type StageResolutionInput = {
  claimId: string;
  revisedText: string;
  rationale: string;
  expectedClaimRevision: number;
};

export type DecideProposalInput = {
  claimId: string;
  decision: "approve" | "reject";
  expectedWorkspaceRevision: number;
  expectedClaimRevision: number;
  expectedProposalId: string;
};

export type ApproveClaimEvidenceInput = {
  claimId: string;
  expectedWorkspaceRevision: number;
  expectedClaimRevision: number;
};

const PARAGRAPH_BREAK_PATTERN = /\r?\n[\t ]*\r?\n|\u2029/;

const SELF_DEMO_NOW = "2026-08-27T08:00:00.000Z";

const initialClaims: ReviewClaim[] = [
  {
    id: "claim-01",
    number: "01",
    location: "headline",
    text: "ProofRail keeps public claims locked until a human approves the final wording.",
    originalText:
      "ProofRail keeps public claims locked until a human approves the final wording.",
    state: "supported",
    label: "Evidence linked",
    risk: "high",
    revision: 1,
    humanApproval: "pending",
    previewTargetId: "title",
  },
  {
    id: "claim-02",
    number: "02",
    location: "body",
    text: "Agents can attach typed evidence and stage narrower wording without approving it.",
    originalText:
      "Agents can attach typed evidence and stage narrower wording without approving it.",
    state: "supported",
    label: "Supported",
    risk: "high",
    revision: 1,
    humanApproval: "approved",
    previewTargetId: "section:self-demo-evidence",
  },
  {
    id: "claim-03",
    number: "03",
    location: "body",
    text: "Six WebMCP tools share the live review workspace.",
    originalText: "Six WebMCP tools share the live review workspace.",
    state: "supported",
    label: "Supported",
    risk: "medium",
    revision: 1,
    humanApproval: "approved",
    previewTargetId: "section:self-demo-evidence",
  },
  {
    id: "claim-04",
    number: "04",
    location: "body",
    text:
      "A passing receipt seals the publication text, evidence matrix, human decisions, revision, and SHA-256 content hash.",
    originalText:
      "A passing receipt seals the publication text, evidence matrix, human decisions, revision, and SHA-256 content hash.",
    state: "supported",
    label: "Evidence linked",
    risk: "high",
    revision: 1,
    humanApproval: "pending",
    previewTargetId: "release",
  },
];

const initialEvidence: EvidenceRecord[] = [
  {
    id: "evidence-01",
    title: "Human approval boundary",
    sourceType: "engineering-control",
    publishedAt: "2026-08-27",
    excerpt:
      "The release gate rejects supported wording until humanApproval is explicitly recorded as approved.",
  },
  {
    id: "evidence-02",
    title: "WebMCP mutation contract",
    sourceType: "engineering-control",
    publishedAt: "2026-08-27",
    excerpt:
      "Agent tools can attach evidence and stage revisions; no registered tool can approve a human decision.",
  },
  {
    id: "evidence-03",
    title: "Registered tool manifest",
    sourceType: "product-test",
    publishedAt: "2026-08-27",
    excerpt:
      "The browser registers exactly six tools against the same in-memory workspace rendered by the interface.",
  },
  {
    id: "evidence-04",
    title: "Proof receipt implementation",
    sourceType: "engineering-control",
    publishedAt: "2026-08-27",
    excerpt:
      "Receipt creation serializes publication content, evidence relationships, the human audit trail, and the source revision before calculating SHA-256.",
  },
];

const initialEdges: EvidenceEdge[] = [
  {
    id: "edge-01",
    claimId: "claim-01",
    evidenceId: "evidence-01",
    relation: "supports",
    rationale: "The deterministic gate directly enforces the visible human approval boundary.",
  },
  {
    id: "edge-02",
    claimId: "claim-02",
    evidenceId: "evidence-02",
    relation: "supports",
    rationale: "The mutation surface deliberately excludes human approval actions.",
  },
  {
    id: "edge-03",
    claimId: "claim-03",
    evidenceId: "evidence-03",
    relation: "supports",
    rationale: "The registered manifest and browser test establish the six-tool boundary.",
  },
  {
    id: "edge-04",
    claimId: "claim-04",
    evidenceId: "evidence-04",
    relation: "supports",
    rationale:
      "The receipt implementation binds each named field before hashing the stable payload.",
  },
];

export const demoResolutions: Record<
  string,
  { revisedText: string; rationale: string }
> = {
  "claim-01": {
    revisedText:
      "ProofRail keeps public claims locked until a human approves the exact final wording.",
    rationale:
      "Make the human authority boundary explicit without expanding the product claim.",
  },
  "claim-04": {
    revisedText:
      "A passing ProofRail receipt seals the publication text, evidence matrix, human decisions, revision, and SHA-256 content hash.",
    rationale:
      "Name the receipt owner while preserving the exact fields covered by the implementation record.",
  },
};

export function createEmptyWorkspace(): Workspace {
  return {
    id: "workspace-empty",
    publicationType: "launch-page",
    title: "",
    headline: "",
    draftText: "",
    revision: 1,
    claims: [],
    evidence: [],
    edges: [],
    audit: [
      {
        id: "audit-01",
        at: SELF_DEMO_NOW,
        actor: "system",
        action: "WORKSPACE_OPENED",
        detail: "Empty review workspace opened. No publication has been imported.",
        workspaceRevision: 1,
      },
    ],
  };
}

export function createProofRailSelfDemoWorkspace(): Workspace {
  const publicationBrief = createProofRailSelfDemoBrief();
  return {
    id: "workspace-proofrail-self-demo",
    publicationType: "launch-page",
    title: "ProofRail self-demo · release contract",
    headline:
      "ProofRail keeps public claims locked until a human approves the final wording.",
    draftText: [
      "Agents can attach typed evidence and stage narrower wording without approving it. Six WebMCP tools share the live review workspace.",
      "A passing receipt seals the publication text, evidence matrix, human decisions, revision, and SHA-256 content hash.",
    ].join("\n\n"),
    revision: 7,
    claims: structuredClone(initialClaims),
    evidence: structuredClone(initialEvidence),
    edges: structuredClone(initialEdges),
    sourcePublicationBrief: structuredClone(publicationBrief),
    publicationBrief,
    audit: [
      {
        id: "audit-01",
        at: SELF_DEMO_NOW,
        actor: "system",
        action: "SELF_DEMO_LOADED",
        detail:
          "ProofRail's own release contract and repository-backed evidence were loaded as an explicitly labelled self-demo.",
        workspaceRevision: 6,
      },
      {
        id: "audit-02",
        at: "2026-08-27T08:01:00.000Z",
        actor: "agent",
        action: "EVIDENCE_GRAPH_BUILT",
        detail: "Four product-contract claims were linked to four implementation records.",
        workspaceRevision: 7,
      },
      {
        id: "audit-03",
        at: "2026-08-27T08:02:00.000Z",
        actor: "human",
        action: "SUPPORTED_CLAIMS_APPROVED",
        detail:
          "Human review approved claim-02 and claim-03; claim-01 and claim-04 remain pending for the demo.",
        workspaceRevision: 7,
      },
    ],
  };
}

export function createDemoWorkspace(): Workspace {
  return createProofRailSelfDemoWorkspace();
}

export function changePublicationType(
  workspace: Workspace,
  publicationType: PublicationType,
): Workspace {
  if (workspace.publicationType === publicationType) return workspace;

  const publicationBrief = createSourceOnlyPublicationBrief({
    publicationType,
    title: workspace.title,
    headline: workspace.headline,
    body: workspace.draftText,
  });

  return {
    ...workspace,
    id: `workspace-active-review-r${workspace.revision + 1}`,
    publicationType,
    sourcePublicationBrief: structuredClone(publicationBrief),
    publicationBrief,
    revision: workspace.revision + 1,
    claims: workspace.claims.map((claim) => ({
      ...claim,
      humanApproval: "pending" as const,
      revision: claim.revision + 1,
    })),
    invalidatedReceipt: workspace.receipt ?? workspace.invalidatedReceipt,
    receipt: undefined,
    audit: [
      ...workspace.audit,
      auditEvent(
        workspace,
        "human",
        "PUBLICATION_FORMAT_CHANGED",
        `Preview format changed from ${workspace.publicationType} to ${publicationType}. Any prior receipt was invalidated.`,
      ),
    ],
  };
}

export function assertExpectedRevision(
  workspace: Workspace,
  expectedRevision: number,
): void {
  if (workspace.revision !== expectedRevision) {
    throw new Error(
      `STALE_WORKSPACE: expected revision ${expectedRevision}, current revision is ${workspace.revision}. Read the workspace again before mutating it.`,
    );
  }
}

export function getClaim(workspace: Workspace, claimId: string): ReviewClaim {
  const claim = workspace.claims.find((candidate) => candidate.id === claimId);
  if (!claim) {
    throw new Error(`UNKNOWN_CLAIM: ${claimId}`);
  }
  return claim;
}

function auditEvent(
  workspace: Workspace,
  actor: Actor,
  action: string,
  detail: string,
): AuditEvent {
  const nextRevision = workspace.revision + 1;
  return {
    id: `audit-${String(workspace.audit.length + 1).padStart(2, "0")}`,
    at: new Date().toISOString(),
    actor,
    action,
    detail,
    workspaceRevision: nextRevision,
  };
}

function replaceExactClaim(
  draftText: string,
  before: string,
  after: string,
): string {
  const index = draftText.indexOf(before);
  if (index < 0) {
    throw new Error(
      "CLAIM_TEXT_MISMATCH: the current claim text is no longer present in the draft.",
    );
  }
  if (draftText.indexOf(before, index + 1) >= 0) {
    throw new Error(
      "AMBIGUOUS_CLAIM_TEXT: the current claim text appears more than once in the draft.",
    );
  }
  return `${draftText.slice(0, index)}${after}${draftText.slice(index + before.length)}`;
}

function stateFromEdges(edges: EvidenceEdge[]): ClaimState {
  if (edges.some((edge) => edge.relation === "contradicts")) return "contradicted";
  if (edges.some((edge) => edge.relation === "outdated")) return "outdated";
  if (edges.some((edge) => edge.relation === "qualifies")) return "qualified";
  if (edges.some((edge) => edge.relation === "supports")) return "supported";
  return "unreviewed";
}

function labelForState(state: ClaimState): string {
  const labels: Record<ClaimState, string> = {
    supported: "Supported",
    qualified: "Needs qualifier",
    contradicted: "Contradicted",
    outdated: "Outdated",
    unreviewed: "Unreviewed",
    resolved: "Human approved",
  };
  return labels[state];
}

export function stageResolutionBatch(
  workspace: Workspace,
  resolutions: StageResolutionInput[],
  expectedWorkspaceRevision: number,
): Workspace {
  assertExpectedRevision(workspace, expectedWorkspaceRevision);
  if (resolutions.length < 1 || resolutions.length > 8) {
    throw new Error("INVALID_BATCH: provide between 1 and 8 resolutions.");
  }

  const duplicateIds = resolutions
    .map((resolution) => resolution.claimId)
    .filter((id, index, all) => all.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    throw new Error(`DUPLICATE_CLAIM: ${duplicateIds[0]}`);
  }

  for (const resolution of resolutions) {
    getClaim(workspace, resolution.claimId);
  }

  const nextClaims = workspace.claims.map((claim) => {
    const resolution = resolutions.find((item) => item.claimId === claim.id);
    if (!resolution) return claim;
    if (
      (claim.state === "supported" || claim.state === "resolved") &&
      claim.humanApproval === "approved"
    ) {
      throw new Error(
        `CLAIM_ALREADY_RELEASABLE: ${claim.id} cannot be put back into agent review.`,
      );
    }
    if (claim.revision !== resolution.expectedClaimRevision) {
      throw new Error(
        `STALE_CLAIM: ${claim.id} expected revision ${resolution.expectedClaimRevision}, current revision is ${claim.revision}.`,
      );
    }
    const revisedText = resolution.revisedText.trim();
    const rationale = resolution.rationale.trim();
    if (revisedText.length < 3 || revisedText.length > 500) {
      throw new Error(
        `INVALID_REVISION: ${claim.id} must be between 3 and 500 characters.`,
      );
    }
    if (PARAGRAPH_BREAK_PATTERN.test(revisedText)) {
      throw new Error(
        `CROSS_PARAGRAPH_REVISION: ${claim.id} must remain inside its current preview paragraph.`,
      );
    }
    const revisedSentences = candidateClaimsFromDraft(revisedText);
    if (revisedSentences.length !== 1 || revisedSentences[0] !== revisedText) {
      throw new Error(
        `NON_ATOMIC_REVISION: ${claim.id} must remain one exact public sentence.`,
      );
    }
    if (rationale.length < 10 || rationale.length > 500) {
      throw new Error(
        `INVALID_RATIONALE: ${claim.id} must include a concrete rationale.`,
      );
    }
    if (revisedText === claim.text) {
      throw new Error(`NO_CHANGE: ${claim.id} revision matches the current claim.`);
    }

    const claimEdges = workspace.edges.filter((edge) => edge.claimId === claim.id);
    if (claimEdges.length === 0) {
      throw new Error(
        `NO_LINKED_EVIDENCE: ${claim.id} needs at least one evidence edge before a resolution can be staged.`,
      );
    }
    const brokenEdge = claimEdges.find(
      (edge) => !workspace.evidence.some((record) => record.id === edge.evidenceId),
    );
    if (brokenEdge) {
      throw new Error(
        `BROKEN_EDGE: ${brokenEdge.id} references missing evidence.`,
      );
    }

    return {
      ...claim,
      revision: claim.revision + 1,
      proposal: {
        id: `proposal-${claim.id}-r${claim.revision}`,
        before: claim.text,
        after: revisedText,
        rationale,
        baseClaimRevision: claim.revision,
        status: "staged" as const,
      },
    };
  });

  const ids = resolutions.map((resolution) => resolution.claimId).join(", ");
  const event = auditEvent(
    workspace,
    "agent",
    "RESOLUTIONS_STAGED",
    `Staged ${resolutions.length} claim revision(s) for human review: ${ids}.`,
  );

  return {
    ...workspace,
    revision: workspace.revision + 1,
    claims: nextClaims,
    audit: [...workspace.audit, event],
    invalidatedReceipt: workspace.receipt ?? workspace.invalidatedReceipt,
    receipt: undefined,
  };
}

export function decideProposal(
  workspace: Workspace,
  input: DecideProposalInput,
): Workspace {
  assertExpectedRevision(workspace, input.expectedWorkspaceRevision);
  const { claimId, decision } = input;
  const claim = getClaim(workspace, claimId);
  if (claim.revision !== input.expectedClaimRevision) {
    throw new Error(
      `STALE_CLAIM: ${claimId} expected revision ${input.expectedClaimRevision}, current revision is ${claim.revision}.`,
    );
  }
  if (!claim.proposal || claim.proposal.status !== "staged") {
    throw new Error(`NO_STAGED_PROPOSAL: ${claimId}`);
  }
  if (claim.proposal.id !== input.expectedProposalId) {
    throw new Error(
      `STALE_PROPOSAL: ${claimId} expected ${input.expectedProposalId}, current proposal is ${claim.proposal.id}.`,
    );
  }

  const approved = decision === "approve";
  const nextClaims = workspace.claims.map((candidate) => {
    if (candidate.id !== claimId || !candidate.proposal) return candidate;
    return {
      ...candidate,
      text: approved ? candidate.proposal.after : candidate.text,
      state: approved ? ("resolved" as const) : candidate.state,
      label: approved ? "Human approved" : candidate.label,
      revision: candidate.revision + 1,
      humanApproval: approved ? ("approved" as const) : candidate.humanApproval,
      proposal: {
        ...candidate.proposal,
        status: approved ? ("approved" as const) : ("rejected" as const),
      },
    };
  });

  const nextHeadline =
    approved && claim.location === "headline"
      ? replaceExactClaim(workspace.headline, claim.text, claim.proposal.after)
      : workspace.headline;
  const nextDraftText =
    approved && claim.location === "body"
      ? replaceExactClaim(workspace.draftText, claim.text, claim.proposal.after)
      : workspace.draftText;
  assertPublicationCoverage(nextHeadline, nextDraftText, nextClaims);

  let nextPublicationBrief = workspace.publicationBrief;
  if (approved && nextPublicationBrief) {
    if (!claim.previewTargetId) {
      throw new Error(
        `MISSING_PREVIEW_TARGET: ${claimId} cannot update the release candidate without an exact renderer target.`,
      );
    }
    nextPublicationBrief = replacePublicationBriefClaim(
      nextPublicationBrief,
      claim.previewTargetId,
      claim.text,
      claim.proposal.after,
    );
  }

  const event = auditEvent(
    workspace,
    "human",
    approved ? "RESOLUTION_APPROVED" : "RESOLUTION_REJECTED",
    approved
      ? `Approved ${claimId} and applied the staged language to the draft.`
      : `Rejected the staged language for ${claimId}; the release blocker remains.`,
  );

  return {
    ...workspace,
    revision: workspace.revision + 1,
    headline: nextHeadline,
    draftText: nextDraftText,
    publicationBrief: nextPublicationBrief,
    claims: nextClaims,
    audit: [...workspace.audit, event],
    invalidatedReceipt: workspace.receipt ?? workspace.invalidatedReceipt,
    receipt: undefined,
  };
}

export function approveClaimEvidence(
  workspace: Workspace,
  input: ApproveClaimEvidenceInput,
): Workspace {
  assertExpectedRevision(workspace, input.expectedWorkspaceRevision);
  const { claimId } = input;
  const claim = getClaim(workspace, claimId);
  if (claim.revision !== input.expectedClaimRevision) {
    throw new Error(
      `STALE_CLAIM: ${claimId} expected revision ${input.expectedClaimRevision}, current revision is ${claim.revision}.`,
    );
  }
  if (claim.proposal?.status === "staged") {
    throw new Error(`HUMAN_REVIEW_PENDING: ${claimId} has a staged language change.`);
  }
  if (claim.state !== "supported" && claim.state !== "resolved") {
    throw new Error(
      `EVIDENCE_NOT_SUPPORTING: ${claimId} is ${claim.state}, not supported or human-resolved.`,
    );
  }

  const supportEdges = workspace.edges.filter(
    (edge) =>
      edge.claimId === claimId &&
      (edge.relation === "supports" ||
        (claim.state === "resolved" && edge.relation === "qualifies")),
  );
  if (supportEdges.length === 0) {
    throw new Error(`NO_SUPPORTING_EDGE: ${claimId}`);
  }
  const brokenEdge = supportEdges.find(
    (edge) => !workspace.evidence.some((record) => record.id === edge.evidenceId),
  );
  if (brokenEdge) {
    throw new Error(`BROKEN_EDGE: ${brokenEdge.id} references missing evidence.`);
  }

  const event = auditEvent(
    workspace,
    "human",
    "EVIDENCE_APPROVED",
    `Approved the linked evidence and current wording for ${claimId}.`,
  );

  return {
    ...workspace,
    revision: workspace.revision + 1,
    claims: workspace.claims.map((candidate) =>
      candidate.id === claimId
        ? {
            ...candidate,
            humanApproval: "approved" as const,
            revision: candidate.revision + 1,
          }
        : candidate,
    ),
    audit: [...workspace.audit, event],
    invalidatedReceipt: workspace.receipt ?? workspace.invalidatedReceipt,
    receipt: undefined,
  };
}

export function attachEvidence(
  workspace: Workspace,
  input: AttachEvidenceInput,
): Workspace {
  assertExpectedRevision(workspace, input.expectedWorkspaceRevision);
  getClaim(workspace, input.claimId);

  const sourceTypes: EvidenceRecord["sourceType"][] = [
    "internal-study",
    "engineering-control",
    "product-test",
    "public-source",
    "archive",
  ];
  const relations: EvidenceRelation[] = [
    "supports",
    "qualifies",
    "contradicts",
    "outdated",
  ];
  if (!sourceTypes.includes(input.sourceType)) {
    throw new Error("INVALID_EVIDENCE_SOURCE_TYPE");
  }
  if (!relations.includes(input.relation)) {
    throw new Error("INVALID_EVIDENCE_RELATION");
  }

  const title = input.title.trim();
  const excerpt = input.excerpt.trim();
  const rationale = input.rationale.trim();
  if (title.length < 3 || title.length > 160) {
    throw new Error("INVALID_EVIDENCE_TITLE");
  }
  if (excerpt.length < 10 || excerpt.length > 700) {
    throw new Error("INVALID_EVIDENCE_EXCERPT");
  }
  if (rationale.length < 10 || rationale.length > 500) {
    throw new Error("INVALID_EVIDENCE_RATIONALE");
  }
  if (Number.isNaN(Date.parse(input.publishedAt))) {
    throw new Error("INVALID_EVIDENCE_DATE");
  }
  if (input.sourceUrl) {
    const parsed = new URL(input.sourceUrl);
    if (!["https:", "http:"].includes(parsed.protocol)) {
      throw new Error("INVALID_SOURCE_URL: only HTTP(S) URLs are accepted.");
    }
  }
  if (input.sourceType === "public-source" && !input.sourceUrl) {
    throw new Error("SOURCE_URL_REQUIRED: public sources need an HTTP(S) URL.");
  }

  const evidenceId = `evidence-${String(workspace.evidence.length + 1).padStart(2, "0")}`;
  const edgeId = `edge-${String(workspace.edges.length + 1).padStart(2, "0")}`;
  const record: EvidenceRecord = {
    id: evidenceId,
    title,
    sourceType: input.sourceType,
    publishedAt: input.publishedAt,
    excerpt,
    sourceUrl: input.sourceUrl,
  };
  const edge: EvidenceEdge = {
    id: edgeId,
    claimId: input.claimId,
    evidenceId,
    relation: input.relation,
    rationale,
  };
  const nextEdges = [...workspace.edges, edge];
  const claimEdges = nextEdges.filter((candidate) => candidate.claimId === input.claimId);
  const nextState = stateFromEdges(claimEdges);

  const nextClaims = workspace.claims.map((claim) =>
    claim.id === input.claimId
      ? {
          ...claim,
          state: nextState,
          label: labelForState(nextState),
          revision: claim.revision + 1,
          humanApproval: "pending" as const,
        }
      : claim,
  );
  const event = auditEvent(
    workspace,
    "agent",
    "EVIDENCE_ATTACHED",
    `${evidenceId} ${input.relation} ${input.claimId}; source date ${input.publishedAt}.`,
  );

  return {
    ...workspace,
    revision: workspace.revision + 1,
    evidence: [...workspace.evidence, record],
    edges: nextEdges,
    claims: nextClaims,
    audit: [...workspace.audit, event],
    invalidatedReceipt: workspace.receipt ?? workspace.invalidatedReceipt,
    receipt: undefined,
  };
}

export function replaceReviewPacket(
  workspace: Workspace,
  input: ReplacePacketInput,
  actor: Extract<Actor, "agent" | "human"> = "agent",
): Workspace {
  assertExpectedRevision(workspace, input.expectedWorkspaceRevision);
  const title = input.title.trim();
  const headline = input.headline.trim();
  const draftText = input.draftText.trim();
  const publicationTypes = new Set<PublicationType>([
    "launch-page",
    "project-page",
    "blog-post",
    "report",
  ]);
  if (!publicationTypes.has(input.publicationType)) {
    throw new Error("INVALID_PUBLICATION_TYPE");
  }
  if (title.length < 3 || title.length > 120) throw new Error("INVALID_TITLE");
  if (headline.length < 3 || headline.length > 180) {
    throw new Error("INVALID_HEADLINE");
  }
  if (draftText.length < 40 || draftText.length > 8000) {
    throw new Error("INVALID_DRAFT_LENGTH");
  }
  if (
    input.claims.length < 1 ||
    input.claims.length > MAX_REVIEW_PACKET_CLAIMS
  ) {
    throw new Error("INVALID_CLAIM_COUNT");
  }

  const seen = new Set<string>();
  const claims = input.claims.map((candidate, index): ReviewClaim => {
    const text = candidate.text.trim();
    if (!(["headline", "body"] as const).includes(candidate.location)) {
      throw new Error(`INVALID_CLAIM_LOCATION: claim ${index + 1}`);
    }
    if (text.length < 3 || text.length > 500) {
      throw new Error(`INVALID_CLAIM_TEXT: claim ${index + 1}`);
    }
    if (!(["low", "medium", "high"] as const).includes(candidate.risk)) {
      throw new Error(`INVALID_CLAIM_RISK: claim ${index + 1}`);
    }
    if (
      candidate.previewTargetId &&
      !/^[a-z0-9][a-z0-9:-]{0,119}$/i.test(candidate.previewTargetId)
    ) {
      throw new Error(`INVALID_PREVIEW_TARGET: claim ${index + 1}`);
    }
    const publicationField = candidate.location === "headline" ? headline : draftText;
    const firstOccurrence = publicationField.indexOf(text);
    if (firstOccurrence < 0) {
      throw new Error(
        `CLAIM_NOT_IN_PUBLICATION: claim ${index + 1} must match its exact ${candidate.location} span.`,
      );
    }
    if (publicationField.indexOf(text, firstOccurrence + 1) >= 0) {
      throw new Error(
        `AMBIGUOUS_CLAIM_TEXT: claim ${index + 1} appears more than once in its ${candidate.location} field.`,
      );
    }
    const claimKey = `${candidate.location}:${text}`;
    if (seen.has(claimKey)) {
      throw new Error(`DUPLICATE_CLAIM_TEXT: claim ${index + 1}`);
    }
    seen.add(claimKey);
    return {
      id: `claim-${String(index + 1).padStart(2, "0")}`,
      number: String(index + 1).padStart(2, "0"),
      location: candidate.location,
      text,
      originalText: text,
      state: "unreviewed",
      label: "Unreviewed",
      risk: candidate.risk,
      revision: 1,
      humanApproval: "pending",
      previewTargetId:
        candidate.previewTargetId ??
        (candidate.location === "headline"
          ? input.publicationType === "blog-post"
            ? "headline"
            : "title"
          : "section:source-publication-body"),
    };
  });

  assertPublicationCoverage(headline, draftText, claims);

  const publicationBrief =
    input.publicationBrief ??
    createSourceOnlyPublicationBrief({
      publicationType: input.publicationType,
      title,
      headline,
      body: draftText,
      sourceActor: actor,
    });
  validatePublicationBrief(publicationBrief);
  const expectedBriefType: PublicationBrief["publicationType"] =
    input.publicationType === "launch-page"
      ? "launch"
      : input.publicationType === "project-page"
        ? "case-study"
        : input.publicationType === "blog-post"
          ? "article"
          : "report";
  if (publicationBrief.publicationType !== expectedBriefType) {
    throw new Error(
      `PUBLICATION_BRIEF_TYPE_MISMATCH: ${input.publicationType} requires ${expectedBriefType}.`,
    );
  }

  const event = auditEvent(
    workspace,
    actor,
    "PACKET_REPLACED",
    `Replaced the workspace with “${title}” and ${claims.length} atomic claim(s).`,
  );

  return {
    ...workspace,
    id: `workspace-active-review-r${workspace.revision + 1}`,
    publicationType: input.publicationType,
    title,
    headline,
    draftText,
    revision: workspace.revision + 1,
    claims,
    evidence: [],
    edges: [],
    sourcePublicationBrief: structuredClone(publicationBrief),
    publicationBrief,
    audit: [...workspace.audit, event],
    invalidatedReceipt: workspace.receipt ?? workspace.invalidatedReceipt,
    receipt: undefined,
  };
}

export type PublicationPreviewVariant = "current" | "proposed";

export type PublicationPreviewProjection = {
  publicationType: PublicationType;
  title: string;
  headline: string;
  body: string;
  claims: ReviewClaim[];
  sourceWorkspaceRevision: number;
  sealedContentRevision?: number;
  gateStatus: ReleaseGate["status"];
  variant: PublicationPreviewVariant;
  stagedClaimIds: string[];
  errorCode?: "PROPOSAL_PREVIEW_UNAVAILABLE";
};

export function buildPublicationPreview(
  workspace: Workspace,
  variant: PublicationPreviewVariant,
): PublicationPreviewProjection {
  const stagedClaims = workspace.claims.filter(
    (claim) => claim.proposal?.status === "staged",
  );
  const base = {
    publicationType: workspace.publicationType,
    title: workspace.title,
    headline: workspace.headline,
    body: workspace.draftText,
    claims: structuredClone(workspace.claims),
    sourceWorkspaceRevision: workspace.revision,
    sealedContentRevision: workspace.receipt?.sourceWorkspaceRevision,
    gateStatus: verifyReleaseGate(workspace).status,
    variant,
    stagedClaimIds: stagedClaims.map((claim) => claim.id),
  };

  if (variant === "current" || stagedClaims.length === 0) return base;

  const replacements = stagedClaims.map((claim) => {
    const proposal = claim.proposal;
    if (!proposal || proposal.before !== claim.text) return null;
    const source = claim.location === "headline" ? workspace.headline : workspace.draftText;
    const start = source.indexOf(proposal.before);
    if (start < 0 || source.indexOf(proposal.before, start + 1) >= 0) return null;
    return {
      claim,
      start,
      end: start + proposal.before.length,
      replacement: proposal.after,
    };
  });

  if (replacements.some((replacement) => replacement === null)) {
    return { ...base, errorCode: "PROPOSAL_PREVIEW_UNAVAILABLE" };
  }

  const typedReplacements = replacements.filter(
    (replacement): replacement is NonNullable<typeof replacement> =>
      replacement !== null,
  );
  for (const location of ["headline", "body"] as const) {
    const spans = typedReplacements
      .filter((replacement) => replacement.claim.location === location)
      .sort((a, b) => a.start - b.start);
    if (spans.some((span, index) => index > 0 && span.start < spans[index - 1].end)) {
      return { ...base, errorCode: "PROPOSAL_PREVIEW_UNAVAILABLE" };
    }
  }

  const applyReplacements = (source: string, location: ClaimLocation) =>
    typedReplacements
      .filter((replacement) => replacement.claim.location === location)
      .sort((a, b) => b.start - a.start)
      .reduce(
        (result, replacement) =>
          `${result.slice(0, replacement.start)}${replacement.replacement}${result.slice(replacement.end)}`,
        source,
      );

  const projectedHeadline = applyReplacements(workspace.headline, "headline");
  const projectedBody = applyReplacements(workspace.draftText, "body");
  const projectedClaims = workspace.claims.map((claim) =>
      claim.proposal?.status === "staged"
        ? { ...claim, text: claim.proposal.after }
        : claim,
  );
  if (publicationCoverageIssue(projectedHeadline, projectedBody, projectedClaims)) {
    return { ...base, errorCode: "PROPOSAL_PREVIEW_UNAVAILABLE" };
  }

  return {
    ...base,
    headline: projectedHeadline,
    body: projectedBody,
    claims: projectedClaims,
  };
}

const TITLE_ABBREVIATIONS = new Set([
  "dr.",
  "mr.",
  "mrs.",
  "ms.",
  "prof.",
  "sr.",
  "jr.",
  "st.",
]);

const INLINE_ABBREVIATIONS = new Set(["a.k.a.", "e.g.", "i.e."]);

const LOWERCASE_CONTINUATION_ABBREVIATIONS = new Set([
  "approx.",
  "co.",
  "corp.",
  "dept.",
  "etc.",
  "fig.",
  "inc.",
  "ltd.",
  "no.",
  "vs.",
]);

const INITIALISM_SENTENCE_STARTERS = new Set([
  "a",
  "an",
  "after",
  "before",
  "however",
  "it",
  "our",
  "results",
  "that",
  "the",
  "these",
  "they",
  "this",
  "those",
  "we",
]);

function periodContinuesSentence(left: string, punctuation: string, right: string): boolean {
  if (punctuation !== ".") return false;
  const withoutClosers = left.replace(/[\"'’”\)\]]+$/, "").trimEnd();
  const token = withoutClosers.match(/\S+$/)?.[0] ?? "";
  const nextToken = right.trimStart().match(/^[\p{L}\p{N}]+/u)?.[0] ?? "";
  if (!nextToken) return false;
  if (TITLE_ABBREVIATIONS.has(token.toLowerCase())) return true;
  if (INLINE_ABBREVIATIONS.has(token.toLowerCase())) return true;
  if (
    LOWERCASE_CONTINUATION_ABBREVIATIONS.has(token.toLowerCase()) &&
    /^[a-z0-9]/.test(nextToken)
  ) {
    return true;
  }
  if (/^[A-Za-z]\.$/.test(token) && /^[A-Z]/.test(nextToken)) return true;
  if (/^(?:[A-Za-z]\.){2,}$/.test(token)) {
    if (/^[a-z0-9]/.test(nextToken)) return true;
    if (INITIALISM_SENTENCE_STARTERS.has(nextToken.toLowerCase())) return false;
    throw new Error(
      `AMBIGUOUS_SENTENCE_BOUNDARY: cannot safely classify “${token} ${nextToken}” as one sentence or two; rewrite the boundary explicitly.`,
    );
  }
  return false;
}

function splitPublicParagraphSentences(draftText: string): string[] {
  const sentences: string[] = [];
  const boundaryPattern = /([.!?]+(?:[\"'’”\)\]]+)?)(\s+)/g;
  let sentenceStart = 0;
  let boundary: RegExpExecArray | null;

  while ((boundary = boundaryPattern.exec(draftText)) !== null) {
    const punctuation = boundary[1].match(/[.!?]+/)?.[0] ?? "";
    const sentenceEnd = boundary.index + boundary[1].length;
    const left = draftText.slice(sentenceStart, sentenceEnd);
    const right = draftText.slice(boundaryPattern.lastIndex);
    if (periodContinuesSentence(left, punctuation, right)) continue;

    const sentence = left.trim();
    if (sentence) sentences.push(sentence);
    sentenceStart = boundaryPattern.lastIndex;
  }

  const remainder = draftText.slice(sentenceStart).trim();
  if (remainder) sentences.push(remainder);
  return sentences;
}

function splitPublicSentences(draftText: string): string[] {
  return draftText
    .split(PARAGRAPH_BREAK_PATTERN)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .flatMap(splitPublicParagraphSentences);
}

export function candidateClaimsFromDraft(draftText: string): string[] {
  const sentences = splitPublicSentences(draftText);
  const oversizedSentence = sentences.find((sentence) => sentence.length > 500);
  if (oversizedSentence) {
    throw new Error(
      `CLAIM_TOO_LONG: complete sentences may contain at most 500 characters; found ${oversizedSentence.length}.`,
    );
  }
  const candidates = sentences.filter((sentence) => sentence.length >= 3);
  if (candidates.length > MAX_REVIEW_BODY_CANDIDATES) {
    throw new Error(
      `TOO_MANY_CANDIDATES: found ${candidates.length}; a packet may contain at most ${MAX_REVIEW_BODY_CANDIDATES} body sentences plus its headline. Import a smaller publication or split it into separately reviewed releases; no source sentence was truncated or merged.`,
    );
  }
  return candidates;
}

type PublicationCoverageIssue = {
  code:
    | "INCOMPLETE_HEADLINE_COVERAGE"
    | "INCOMPLETE_CLAIM_COVERAGE"
    | "NON_ATOMIC_BODY_CLAIM"
    | "CROSS_PARAGRAPH_CLAIM"
    | "AMBIGUOUS_PUBLICATION_CLAIM"
    | "OVERLAPPING_PUBLICATION_CLAIMS";
  detail: string;
};

function publicationCoverageIssue(
  headline: string,
  draftText: string,
  claims: ReviewClaim[],
): PublicationCoverageIssue | null {
  const headlineClaims = claims.filter((claim) => claim.location === "headline");
  if (headlineClaims.length !== 1 || headlineClaims[0].text !== headline) {
    return {
      code: "INCOMPLETE_HEADLINE_COVERAGE",
      detail: "The complete public headline must be one exact claim.",
    };
  }

  const bodySentences = candidateClaimsFromDraft(draftText);
  const bodyClaims = claims.filter((claim) => claim.location === "body");
  const crossParagraphClaim = claims.find((claim) =>
    PARAGRAPH_BREAK_PATTERN.test(claim.text),
  );
  if (crossParagraphClaim) {
    return {
      code: "CROSS_PARAGRAPH_CLAIM",
      detail: `${crossParagraphClaim.id} crosses a preview paragraph boundary.`,
    };
  }
  const sentenceCounts = new Map<string, number>();
  const claimCounts = new Map<string, number>();
  for (const sentence of bodySentences) {
    sentenceCounts.set(sentence, (sentenceCounts.get(sentence) ?? 0) + 1);
  }
  for (const claim of bodyClaims) {
    claimCounts.set(claim.text, (claimCounts.get(claim.text) ?? 0) + 1);
  }

  const uncoveredSentence = bodySentences.find(
    (sentence) => (claimCounts.get(sentence) ?? 0) < (sentenceCounts.get(sentence) ?? 0),
  );
  if (uncoveredSentence) {
    return {
      code: "INCOMPLETE_CLAIM_COVERAGE",
      detail: `Every complete body sentence must be represented; missing “${uncoveredSentence}”`,
    };
  }

  const nonAtomicClaim = bodyClaims.find(
    (claim) => (sentenceCounts.get(claim.text) ?? 0) === 0,
  );
  if (nonAtomicClaim || bodyClaims.length !== bodySentences.length) {
    return {
      code: "NON_ATOMIC_BODY_CLAIM",
      detail: nonAtomicClaim
        ? `${nonAtomicClaim.id} must equal one complete body sentence.`
        : "Body claims must map one-to-one to complete public sentences.",
    };
  }

  const spans: Array<{ id: string; start: number; end: number }> = [];
  for (const claim of bodyClaims) {
    const start = draftText.indexOf(claim.text);
    if (start < 0 || draftText.indexOf(claim.text, start + 1) >= 0) {
      return {
        code: "AMBIGUOUS_PUBLICATION_CLAIM",
        detail: `${claim.id} must map exactly once in the public body.`,
      };
    }
    spans.push({ id: claim.id, start, end: start + claim.text.length });
  }
  spans.sort((left, right) => left.start - right.start);
  const overlapIndex = spans.findIndex(
    (span, index) => index > 0 && span.start < spans[index - 1].end,
  );
  if (overlapIndex >= 0) {
    return {
      code: "OVERLAPPING_PUBLICATION_CLAIMS",
      detail: `${spans[overlapIndex - 1].id} overlaps ${spans[overlapIndex].id}.`,
    };
  }

  return null;
}

function assertPublicationCoverage(
  headline: string,
  draftText: string,
  claims: ReviewClaim[],
): void {
  const issue = publicationCoverageIssue(headline, draftText, claims);
  if (issue) throw new Error(`${issue.code}: ${issue.detail}`);
}

export function verifyReleaseGate(workspace: Workspace): ReleaseGate {
  const blockers: GateBlocker[] = [];

  if (workspace.claims.length === 0) {
    return {
      status: "blocked",
      checkedRevision: workspace.revision,
      blockers: [
        {
          claimId: "publication",
          code: "PUBLICATION_COVERAGE_INVALID",
          detail: "No publication is loaded. Import a source before running release checks.",
        },
      ],
      openHumanDecisions: 0,
      releasableClaims: 0,
    };
  }

  const coverageIssue = publicationCoverageIssue(
    workspace.headline,
    workspace.draftText,
    workspace.claims,
  );
  if (coverageIssue) {
    blockers.push({
      claimId: "publication",
      code: "PUBLICATION_COVERAGE_INVALID",
      detail: `${coverageIssue.code}: ${coverageIssue.detail}`,
    });
  }

  for (const claim of workspace.claims) {
    if (claim.proposal?.status === "staged") {
      blockers.push({
        claimId: claim.id,
        code: "HUMAN_REVIEW_PENDING",
        detail: "A staged agent revision still requires a human decision.",
      });
      continue;
    }

    const claimEdges = workspace.edges.filter((edge) => edge.claimId === claim.id);
    const brokenEdge = claimEdges.find(
      (edge) => !workspace.evidence.some((record) => record.id === edge.evidenceId),
    );
    if (brokenEdge) {
      blockers.push({
        claimId: claim.id,
        code: "BROKEN_EVIDENCE_EDGE",
        detail: `Evidence edge ${brokenEdge.id} references a missing record.`,
      });
      continue;
    }
    if (claim.proposal?.status === "rejected") {
      blockers.push({
        claimId: claim.id,
        code: "RESOLUTION_REJECTED",
        detail: "The proposed fix was rejected and no replacement has been approved.",
      });
      continue;
    }
    if (claim.state === "resolved") {
      const adverseEdge = claimEdges.find(
        (edge) => edge.relation === "contradicts" || edge.relation === "outdated",
      );
      const resolutionEdges = claimEdges.filter(
        (edge) => edge.relation === "supports" || edge.relation === "qualifies",
      );
      if (adverseEdge) {
        blockers.push({
          claimId: claim.id,
          code:
            adverseEdge.relation === "outdated" ? "OUTDATED" : "CONTRADICTED",
          detail:
            "Human-approved wording still has an adverse evidence relation. Reclassify or replace the evidence before release.",
        });
      } else if (resolutionEdges.length === 0) {
        blockers.push({
          claimId: claim.id,
          code: "NO_RESOLUTION_EVIDENCE",
          detail:
            "Human-approved wording still needs at least one supporting or qualifying evidence record.",
        });
      } else if (claim.humanApproval !== "approved") {
        blockers.push({
          claimId: claim.id,
          code: "HUMAN_APPROVAL_REQUIRED",
          detail: "The final wording still requires explicit human approval.",
        });
      }
      continue;
    }
    if (claim.state === "unreviewed") {
      blockers.push({
        claimId: claim.id,
        code: "UNREVIEWED",
        detail: "The claim has no evidence decision.",
      });
      continue;
    }
    if (claim.state === "qualified") {
      blockers.push({
        claimId: claim.id,
        code: "QUALIFIER_REQUIRED",
        detail: "The evidence supports only a narrower version of this claim.",
      });
      continue;
    }
    if (claim.state === "contradicted") {
      blockers.push({
        claimId: claim.id,
        code: "CONTRADICTED",
        detail: "Linked evidence contradicts the current wording.",
      });
      continue;
    }
    if (claim.state === "outdated") {
      blockers.push({
        claimId: claim.id,
        code: "OUTDATED",
        detail: "The current wording relies on evidence marked outdated.",
      });
      continue;
    }
    if (claim.state === "supported") {
      const supportEdges = claimEdges.filter((edge) => edge.relation === "supports");
      if (supportEdges.length === 0) {
        blockers.push({
          claimId: claim.id,
          code: "NO_SUPPORTING_EDGE",
          detail: "The claim is marked supported but has no supporting evidence edge.",
        });
      } else if (claim.humanApproval !== "approved") {
        blockers.push({
          claimId: claim.id,
          code: "HUMAN_APPROVAL_REQUIRED",
          detail: "Linked evidence is present, but a human has not approved this wording for release.",
        });
      }
    }
  }

  return {
    status: blockers.length === 0 ? "pass" : "blocked",
    checkedRevision: workspace.revision,
    blockers,
    openHumanDecisions: blockers.filter(
      (blocker) =>
        blocker.code === "HUMAN_REVIEW_PENDING" ||
        blocker.code === "HUMAN_APPROVAL_REQUIRED",
    ).length,
    releasableClaims: workspace.claims.length - blockers.length,
  };
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const object = value as Record<string, unknown>;
  const keys = Object.keys(object).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
    .join(",")}}`;
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createProofReceipt(
  workspace: Workspace,
): Promise<ProofReceipt> {
  const gate = verifyReleaseGate(workspace);
  if (gate.status !== "pass") {
    throw new Error(
      `RELEASE_BLOCKED: ${gate.blockers
        .map((blocker) => `${blocker.claimId}:${blocker.code}`)
        .join(", ")}`,
    );
  }

  const matrix = workspace.claims.map((claim) => {
    const edges = workspace.edges.filter((edge) => edge.claimId === claim.id);
    return {
      claimId: claim.id,
      claimLocation: claim.location,
      claimText: claim.text,
      decision:
        claim.state === "resolved"
          ? "human-approved resolution"
          : "human-approved evidence",
      evidence: edges.map((edge) => {
        const record = workspace.evidence.find(
          (candidate) => candidate.id === edge.evidenceId,
        );
        if (!record) {
          throw new Error(`BROKEN_EDGE: ${edge.id} references missing evidence.`);
        }
        return {
          evidenceId: record.id,
          title: record.title,
          sourceType: record.sourceType,
          publishedAt: record.publishedAt,
          sourceUrl: record.sourceUrl ?? null,
          relation: edge.relation,
          excerpt: record.excerpt,
          rationale: edge.rationale,
        };
      }),
    };
  });

  const publicationBrief =
    workspace.publicationBrief ??
    createSourceOnlyPublicationBrief({
      publicationType: workspace.publicationType,
      title: workspace.title,
      headline: workspace.headline,
      body: workspace.draftText,
    });
  validatePublicationBrief(publicationBrief);
  const expectedReceiptBriefType: PublicationBrief["publicationType"] =
    workspace.publicationType === "launch-page"
      ? "launch"
      : workspace.publicationType === "project-page"
        ? "case-study"
        : workspace.publicationType === "blog-post"
          ? "article"
          : "report";
  if (publicationBrief.publicationType !== expectedReceiptBriefType) {
    throw new Error(
      `PUBLICATION_BRIEF_TYPE_MISMATCH: ${workspace.publicationType} requires ${expectedReceiptBriefType}.`,
    );
  }

  let packetAuditStart = 0;
  workspace.audit.forEach((event, index) => {
    if (event.action === "PACKET_IMPORTED" || event.action === "PACKET_REPLACED") {
      packetAuditStart = index;
    }
  });

  const generatedAt = new Date().toISOString();
  const proofContent = {
    generatedAt,
    sourceWorkspaceRevision: workspace.revision,
    publicationType: workspace.publicationType,
    previewTemplateVersion: 3 as const,
    publicationBrief,
    title: workspace.title,
    headline: workspace.headline,
    finalText: workspace.draftText,
    matrix,
    audit: workspace.audit.slice(packetAuditStart),
  };
  const contentHash = await sha256Hex(stableStringify(proofContent));

  return {
    receiptId: `proof-${contentHash.slice(0, 12)}`,
    contentHash,
    ...proofContent,
  };
}

export function storeReceipt(
  workspace: Workspace,
  receipt: ProofReceipt,
): Workspace {
  if (receipt.sourceWorkspaceRevision !== workspace.revision) {
    throw new Error("STALE_RECEIPT: workspace changed while receipt was generated.");
  }
  const event = auditEvent(
    workspace,
    "system",
    "PROOF_RECEIPT_CREATED",
    `${receipt.receiptId} sealed revision ${receipt.sourceWorkspaceRevision} with SHA-256 ${receipt.contentHash.slice(0, 16)}…`,
  );
  return {
    ...workspace,
    revision: workspace.revision + 1,
    receipt,
    invalidatedReceipt: undefined,
    audit: [...workspace.audit, event],
  };
}
import {
  createProofRailSelfDemoBrief,
  createSourceOnlyPublicationBrief,
  replacePublicationBriefClaim,
  validatePublicationBrief,
  type PublicationBrief,
} from "./publication-brief.ts";
