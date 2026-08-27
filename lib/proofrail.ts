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
export type Actor = "agent" | "human" | "system";

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
  text: string;
  originalText: string;
  state: ClaimState;
  label: string;
  risk: "low" | "medium" | "high";
  revision: number;
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
    | "RESOLUTION_REJECTED"
    | "NO_SUPPORTING_EDGE";
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
  title: string;
  finalText: string;
  matrix: Array<{
    claimId: string;
    claimText: string;
    decision: string;
    evidence: Array<{
      evidenceId: string;
      title: string;
      relation: EvidenceRelation;
      excerpt: string;
    }>;
  }>;
  audit: AuditEvent[];
};

export type Workspace = {
  id: string;
  title: string;
  headline: string;
  draftText: string;
  revision: number;
  claims: ReviewClaim[];
  evidence: EvidenceRecord[];
  edges: EvidenceEdge[];
  audit: AuditEvent[];
  receipt?: ProofReceipt;
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
  title: string;
  headline: string;
  draftText: string;
  claims: Array<{
    text: string;
    risk: ReviewClaim["risk"];
  }>;
  expectedWorkspaceRevision: number;
};

export type StageResolutionInput = {
  claimId: string;
  revisedText: string;
  rationale: string;
  expectedClaimRevision: number;
};

const DEMO_NOW = "2026-08-27T08:00:00.000Z";

const initialClaims: ReviewClaim[] = [
  {
    id: "claim-01",
    number: "01",
    text: "Northstar reduces launch handoff time by 42%.",
    originalText: "Northstar reduces launch handoff time by 42%.",
    state: "qualified",
    label: "Needs qualifier",
    risk: "high",
    revision: 1,
  },
  {
    id: "claim-02",
    number: "02",
    text: "Every workspace stays encrypted in transit.",
    originalText: "Every workspace stays encrypted in transit.",
    state: "supported",
    label: "Supported",
    risk: "high",
    revision: 1,
  },
  {
    id: "claim-03",
    number: "03",
    text: "Teams can export an evidence packet without an account.",
    originalText: "Teams can export an evidence packet without an account.",
    state: "supported",
    label: "Supported",
    risk: "medium",
    revision: 1,
  },
  {
    id: "claim-04",
    number: "04",
    text: "Trusted by 800 launch teams.",
    originalText: "Trusted by 800 launch teams.",
    state: "contradicted",
    label: "Contradicted + stale",
    risk: "high",
    revision: 1,
  },
];

const initialEvidence: EvidenceRecord[] = [
  {
    id: "evidence-01",
    title: "Pilot operations report",
    sourceType: "internal-study",
    publishedAt: "2026-08-18",
    excerpt:
      "Median handoff time fell from 31 to 18 minutes across eight participating launch teams.",
  },
  {
    id: "evidence-02",
    title: "Transport security architecture",
    sourceType: "engineering-control",
    publishedAt: "2026-08-21",
    excerpt:
      "All browser-to-service and service-to-service traffic is required to negotiate TLS 1.3.",
  },
  {
    id: "evidence-03",
    title: "Anonymous export acceptance test",
    sourceType: "product-test",
    publishedAt: "2026-08-24",
    excerpt:
      "A signed-out visitor exported the complete evidence packet from the public review route.",
  },
  {
    id: "evidence-04",
    title: "Waitlist snapshot",
    sourceType: "archive",
    publishedAt: "2024-11-03",
    excerpt:
      "The file records 800 individual waitlist sign-ups. It does not identify active teams or customers.",
  },
];

const initialEdges: EvidenceEdge[] = [
  {
    id: "edge-01",
    claimId: "claim-01",
    evidenceId: "evidence-01",
    relation: "qualifies",
    rationale: "The measured reduction is supported, but only for an eight-team pilot.",
  },
  {
    id: "edge-02",
    claimId: "claim-02",
    evidenceId: "evidence-02",
    relation: "supports",
    rationale: "The architecture control directly covers transport encryption.",
  },
  {
    id: "edge-03",
    claimId: "claim-03",
    evidenceId: "evidence-03",
    relation: "supports",
    rationale: "The signed-out acceptance path demonstrates anonymous export.",
  },
  {
    id: "edge-04",
    claimId: "claim-04",
    evidenceId: "evidence-04",
    relation: "outdated",
    rationale:
      "The source counts people on a 2024 waitlist, not current teams or customers.",
  },
];

export const demoResolutions: Record<
  string,
  { revisedText: string; rationale: string }
> = {
  "claim-01": {
    revisedText:
      "In an eight-team pilot, Northstar reduced median launch handoff time by 42%.",
    rationale:
      "Preserve the measured result while adding the sample and pilot boundary.",
  },
  "claim-04": {
    revisedText: "Joined by 800 people on the 2024 Northstar waitlist.",
    rationale:
      "Replace the unsupported customer claim with the exact population and date in the source.",
  },
};

export function createDemoWorkspace(): Workspace {
  return {
    id: "workspace-northstar",
    title: "Northstar launch brief",
    headline: "Move launches forward without losing the proof.",
    draftText: [
      "Northstar brings decisions, source material, and release checks into one shared workspace.",
      "Northstar reduces launch handoff time by 42%. Teams keep a clear trail from source to approved language.",
      "Every workspace stays encrypted in transit. Teams can export an evidence packet without an account.",
      "Trusted by 800 launch teams.",
    ].join("\n\n"),
    revision: 7,
    claims: structuredClone(initialClaims),
    evidence: structuredClone(initialEvidence),
    edges: structuredClone(initialEdges),
    audit: [
      {
        id: "audit-01",
        at: DEMO_NOW,
        actor: "system",
        action: "PACKET_IMPORTED",
        detail: "Draft and four source records loaded into the review workspace.",
        workspaceRevision: 6,
      },
      {
        id: "audit-02",
        at: "2026-08-27T08:01:00.000Z",
        actor: "agent",
        action: "EVIDENCE_GRAPH_BUILT",
        detail: "Four atomic claims linked to four typed evidence relationships.",
        workspaceRevision: 7,
      },
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

  const nextClaims = workspace.claims.map((claim) => {
    const resolution = resolutions.find((item) => item.claimId === claim.id);
    if (!resolution) return claim;
    if (claim.revision !== resolution.expectedClaimRevision) {
      throw new Error(
        `STALE_CLAIM: ${claim.id} expected revision ${resolution.expectedClaimRevision}, current revision is ${claim.revision}.`,
      );
    }
    const revisedText = resolution.revisedText.trim();
    const rationale = resolution.rationale.trim();
    if (revisedText.length < 10 || revisedText.length > 500) {
      throw new Error(
        `INVALID_REVISION: ${claim.id} must be between 10 and 500 characters.`,
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
    receipt: undefined,
  };
}

export function decideProposal(
  workspace: Workspace,
  claimId: string,
  decision: "approve" | "reject",
): Workspace {
  const claim = getClaim(workspace, claimId);
  if (!claim.proposal || claim.proposal.status !== "staged") {
    throw new Error(`NO_STAGED_PROPOSAL: ${claimId}`);
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
      proposal: {
        ...candidate.proposal,
        status: approved ? ("approved" as const) : ("rejected" as const),
      },
    };
  });

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
    draftText: approved
      ? replaceExactClaim(workspace.draftText, claim.text, claim.proposal.after)
      : workspace.draftText,
    claims: nextClaims,
    audit: [...workspace.audit, event],
    receipt: undefined,
  };
}

export function attachEvidence(
  workspace: Workspace,
  input: AttachEvidenceInput,
): Workspace {
  assertExpectedRevision(workspace, input.expectedWorkspaceRevision);
  getClaim(workspace, input.claimId);

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
    receipt: undefined,
  };
}

export function replaceReviewPacket(
  workspace: Workspace,
  input: ReplacePacketInput,
): Workspace {
  assertExpectedRevision(workspace, input.expectedWorkspaceRevision);
  const title = input.title.trim();
  const headline = input.headline.trim();
  const draftText = input.draftText.trim();
  if (title.length < 3 || title.length > 120) throw new Error("INVALID_TITLE");
  if (headline.length < 3 || headline.length > 180) {
    throw new Error("INVALID_HEADLINE");
  }
  if (draftText.length < 40 || draftText.length > 8000) {
    throw new Error("INVALID_DRAFT_LENGTH");
  }
  if (input.claims.length < 1 || input.claims.length > 12) {
    throw new Error("INVALID_CLAIM_COUNT");
  }

  const seen = new Set<string>();
  const claims = input.claims.map((candidate, index): ReviewClaim => {
    const text = candidate.text.trim();
    if (text.length < 10 || text.length > 500) {
      throw new Error(`INVALID_CLAIM_TEXT: claim ${index + 1}`);
    }
    if (!draftText.includes(text)) {
      throw new Error(
        `CLAIM_NOT_IN_DRAFT: claim ${index + 1} must match an exact span in draftText.`,
      );
    }
    if (seen.has(text)) throw new Error(`DUPLICATE_CLAIM_TEXT: claim ${index + 1}`);
    seen.add(text);
    return {
      id: `claim-${String(index + 1).padStart(2, "0")}`,
      number: String(index + 1).padStart(2, "0"),
      text,
      originalText: text,
      state: "unreviewed",
      label: "Unreviewed",
      risk: candidate.risk,
      revision: 1,
    };
  });

  const event = auditEvent(
    workspace,
    "agent",
    "PACKET_REPLACED",
    `Replaced the workspace with “${title}” and ${claims.length} atomic claim(s).`,
  );

  return {
    ...workspace,
    title,
    headline,
    draftText,
    revision: workspace.revision + 1,
    claims,
    evidence: [],
    edges: [],
    audit: [...workspace.audit, event],
    receipt: undefined,
  };
}

export function candidateClaimsFromDraft(draftText: string): string[] {
  return draftText
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 10 && sentence.length <= 500)
    .slice(0, 8);
}

export function verifyReleaseGate(workspace: Workspace): ReleaseGate {
  const blockers: GateBlocker[] = [];

  for (const claim of workspace.claims) {
    if (claim.proposal?.status === "staged") {
      blockers.push({
        claimId: claim.id,
        code: "HUMAN_REVIEW_PENDING",
        detail: "A staged agent revision still requires a human decision.",
      });
      continue;
    }
    if (claim.state === "resolved") continue;
    if (claim.proposal?.status === "rejected") {
      blockers.push({
        claimId: claim.id,
        code: "RESOLUTION_REJECTED",
        detail: "The proposed fix was rejected and no replacement has been approved.",
      });
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
      const supportEdges = workspace.edges.filter(
        (edge) => edge.claimId === claim.id && edge.relation === "supports",
      );
      if (supportEdges.length === 0) {
        blockers.push({
          claimId: claim.id,
          code: "NO_SUPPORTING_EDGE",
          detail: "The claim is marked supported but has no supporting evidence edge.",
        });
      }
    }
  }

  return {
    status: blockers.length === 0 ? "pass" : "blocked",
    checkedRevision: workspace.revision,
    blockers,
    openHumanDecisions: workspace.claims.filter(
      (claim) => claim.proposal?.status === "staged",
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
      claimText: claim.text,
      decision:
        claim.state === "resolved" ? "human-approved resolution" : "supported",
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
          relation: edge.relation,
          excerpt: record.excerpt,
        };
      }),
    };
  });

  const proofContent = {
    sourceWorkspaceRevision: workspace.revision,
    title: workspace.title,
    finalText: workspace.draftText,
    matrix,
    audit: workspace.audit,
  };
  const contentHash = await sha256Hex(stableStringify(proofContent));

  return {
    receiptId: `proof-${contentHash.slice(0, 12)}`,
    generatedAt: new Date().toISOString(),
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
    audit: [...workspace.audit, event],
  };
}
