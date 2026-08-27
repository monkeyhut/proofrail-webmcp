"use client";

import {
  Fragment,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  attachEvidence,
  candidateClaimsFromDraft,
  createDemoWorkspace,
  createProofReceipt,
  decideProposal,
  demoResolutions,
  getClaim,
  replaceReviewPacket,
  stageResolutionBatch,
  storeReceipt,
  verifyReleaseGate,
  type AttachEvidenceInput,
  type EvidenceRecord,
  type EvidenceRelation,
  type ProofReceipt,
  type ReplacePacketInput,
  type ReviewClaim,
  type StageResolutionInput,
  type Workspace,
} from "../lib/proofrail";

type ToolStatus = "checking" | "registered" | "unsupported" | "error";

const relationLabel: Record<EvidenceRelation, string> = {
  supports: "supports",
  qualifies: "qualifies",
  contradicts: "contradicts",
  outdated: "outdated",
};

const sourceTypeLabel: Record<EvidenceRecord["sourceType"], string> = {
  "internal-study": "Internal study",
  "engineering-control": "Engineering control",
  "product-test": "Product test",
  "public-source": "Public source",
  archive: "Archive",
};

const toolManifest = [
  {
    name: "get_review_context",
    kind: "read",
    description: "Read the live draft, claims, evidence graph, revisions, and gate.",
  },
  {
    name: "replace_review_packet",
    kind: "write",
    description: "Load an arbitrary draft and its exact atomic claim spans.",
  },
  {
    name: "attach_evidence",
    kind: "write",
    description: "Attach a dated source excerpt through a typed evidence edge.",
  },
  {
    name: "stage_resolution_batch",
    kind: "write",
    description: "Stage narrow revisions. It cannot approve them.",
  },
  {
    name: "verify_release_gate",
    kind: "read",
    description: "Run deterministic release rules against the current revision.",
  },
  {
    name: "export_proof_receipt",
    kind: "write",
    description: "Seal a passing revision into a SHA-256 proof receipt.",
  },
] as const;

function reviewContextSnapshot(workspace: Workspace) {
  const gate = verifyReleaseGate(workspace);
  return {
    workspace: {
      id: workspace.id,
      title: workspace.title,
      headline: workspace.headline,
      draftText: workspace.draftText,
      revision: workspace.revision,
    },
    claims: workspace.claims.map((claim) => ({
      id: claim.id,
      text: claim.text,
      state: claim.state,
      risk: claim.risk,
      revision: claim.revision,
      proposal: claim.proposal ?? null,
      evidenceEdges: workspace.edges
        .filter((edge) => edge.claimId === claim.id)
        .map((edge) => ({
          ...edge,
          evidence:
            workspace.evidence.find((record) => record.id === edge.evidenceId) ??
            null,
        })),
    })),
    gate,
    receipt: workspace.receipt
      ? {
          receiptId: workspace.receipt.receiptId,
          sourceWorkspaceRevision: workspace.receipt.sourceWorkspaceRevision,
          contentHash: workspace.receipt.contentHash,
        }
      : null,
  };
}

function annotatedParagraph(
  paragraph: string,
  claims: ReviewClaim[],
  selectedClaimId: string,
  onSelect: (claimId: string) => void,
): ReactNode[] {
  const matches = claims
    .map((claim) => ({
      claim,
      start: paragraph.indexOf(claim.text),
    }))
    .filter((match) => match.start >= 0)
    .sort((a, b) => a.start - b.start);

  if (matches.length === 0) return [paragraph];

  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start < cursor) continue;
    if (match.start > cursor) {
      parts.push(paragraph.slice(cursor, match.start));
    }
    parts.push(
      <button
        key={match.claim.id}
        className={
          "claim-inline status-" +
          match.claim.state +
          (selectedClaimId === match.claim.id ? " selected" : "")
        }
        onClick={() => onSelect(match.claim.id)}
        aria-pressed={selectedClaimId === match.claim.id}
      >
        {match.claim.text}
        <span>{match.claim.number}</span>
      </button>,
    );
    cursor = match.start + match.claim.text.length;
  }
  if (cursor < paragraph.length) parts.push(paragraph.slice(cursor));
  return parts;
}

function downloadReceipt(receipt: ProofReceipt) {
  const blob = new Blob([JSON.stringify(receipt, null, 2)], {
    type: "application/json",
  });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = receipt.receiptId + ".json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

export function ProofRailApp() {
  const [workspace, setWorkspace] = useState<Workspace>(() =>
    createDemoWorkspace(),
  );
  const workspaceRef = useRef(workspace);
  const [selectedClaimId, setSelectedClaimId] = useState("claim-04");
  const [toolStatus, setToolStatus] = useState<ToolStatus>("checking");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [importTitle, setImportTitle] = useState("Untitled review packet");
  const [importHeadline, setImportHeadline] = useState(
    "A draft waiting for evidence.",
  );
  const [importDraft, setImportDraft] = useState(
    "Paste a short draft here. ProofRail will turn complete sentences into claim candidates for evidence review.",
  );

  const commit = useCallback((transition: (current: Workspace) => Workspace) => {
    const next = transition(workspaceRef.current);
    workspaceRef.current = next;
    setWorkspace(next);
    return next;
  }, []);

  const gate = useMemo(() => verifyReleaseGate(workspace), [workspace]);
  const selectedClaim =
    workspace.claims.find((claim) => claim.id === selectedClaimId) ??
    workspace.claims[0];
  const selectedEdges = selectedClaim
    ? workspace.edges.filter((edge) => edge.claimId === selectedClaim.id)
    : [];

  useEffect(() => {
    const context = document.modelContext;
    if (!context || typeof context.registerTool !== "function") {
      queueMicrotask(() => setToolStatus("unsupported"));
      return;
    }
    const modelContext = context;

    const registration = new AbortController();
    let mounted = true;

    const tools: WebMcpTool[] = [
      {
        name: "get_review_context",
        title: "Read review context",
        description:
          "Read the current ProofRail draft, atomic claims, typed evidence edges, exact revision numbers, human proposals, and deterministic release gate. This does not change the page.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: async () => reviewContextSnapshot(workspaceRef.current),
      },
      {
        name: "replace_review_packet",
        title: "Load review packet",
        description:
          "Replace the local ProofRail workspace with an arbitrary draft and exact atomic claim spans. This clears the current evidence graph and receipt. Use the current workspace revision to prevent overwriting newer human work.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", minLength: 3, maxLength: 120 },
            headline: { type: "string", minLength: 3, maxLength: 180 },
            draftText: { type: "string", minLength: 40, maxLength: 8000 },
            claims: {
              type: "array",
              minItems: 1,
              maxItems: 12,
              items: {
                type: "object",
                properties: {
                  text: { type: "string", minLength: 10, maxLength: 500 },
                  risk: {
                    type: "string",
                    enum: ["low", "medium", "high"],
                  },
                },
                required: ["text", "risk"],
                additionalProperties: false,
              },
            },
            expectedWorkspaceRevision: { type: "integer", minimum: 1 },
          },
          required: [
            "title",
            "headline",
            "draftText",
            "claims",
            "expectedWorkspaceRevision",
          ],
          additionalProperties: false,
        },
        annotations: { untrustedContentHint: true },
        execute: async (input) => {
          const next = commit((current) =>
            replaceReviewPacket(
              current,
              input as unknown as ReplacePacketInput,
            ),
          );
          setSelectedClaimId(next.claims[0].id);
          setReceiptOpen(false);
          setNotice(
            "Agent loaded " +
              next.claims.length +
              " claim candidates at revision " +
              next.revision +
              ".",
          );
          return {
            changed: true,
            workspaceRevision: next.revision,
            claimIds: next.claims.map((claim) => claim.id),
            gate: verifyReleaseGate(next),
          };
        },
      },
      {
        name: "attach_evidence",
        title: "Attach typed evidence",
        description:
          "Add one dated source excerpt and connect it to one claim as supports, qualifies, contradicts, or outdated. This changes the live local workspace and invalidates any previous receipt.",
        inputSchema: {
          type: "object",
          properties: {
            claimId: { type: "string", pattern: "^claim-[0-9]{2}$" },
            title: { type: "string", minLength: 3, maxLength: 160 },
            sourceType: {
              type: "string",
              enum: [
                "internal-study",
                "engineering-control",
                "product-test",
                "public-source",
                "archive",
              ],
            },
            publishedAt: {
              type: "string",
              description: "ISO 8601 date, for example 2026-08-27.",
              maxLength: 30,
            },
            excerpt: { type: "string", minLength: 10, maxLength: 700 },
            sourceUrl: {
              type: "string",
              format: "uri",
              maxLength: 500,
            },
            relation: {
              type: "string",
              enum: ["supports", "qualifies", "contradicts", "outdated"],
            },
            rationale: { type: "string", minLength: 10, maxLength: 500 },
            expectedWorkspaceRevision: { type: "integer", minimum: 1 },
          },
          required: [
            "claimId",
            "title",
            "sourceType",
            "publishedAt",
            "excerpt",
            "relation",
            "rationale",
            "expectedWorkspaceRevision",
          ],
          additionalProperties: false,
        },
        annotations: { untrustedContentHint: true },
        execute: async (input) => {
          const next = commit((current) =>
            attachEvidence(current, input as unknown as AttachEvidenceInput),
          );
          const typed = input as unknown as AttachEvidenceInput;
          setSelectedClaimId(typed.claimId);
          setNotice(
            "Agent attached " +
              next.evidence[next.evidence.length - 1].id +
              " at revision " +
              next.revision +
              ".",
          );
          return {
            changed: true,
            workspaceRevision: next.revision,
            claim: getClaim(next, typed.claimId),
            evidence: next.evidence[next.evidence.length - 1],
            edge: next.edges[next.edges.length - 1],
            gate: verifyReleaseGate(next),
          };
        },
      },
      {
        name: "stage_resolution_batch",
        title: "Stage claim resolutions",
        description:
          "Stage one to eight narrow claim revisions for visible human review. This never approves or publishes a change. Each claim and the workspace must match the supplied revision numbers.",
        inputSchema: {
          type: "object",
          properties: {
            resolutions: {
              type: "array",
              minItems: 1,
              maxItems: 8,
              items: {
                type: "object",
                properties: {
                  claimId: { type: "string", pattern: "^claim-[0-9]{2}$" },
                  revisedText: {
                    type: "string",
                    minLength: 10,
                    maxLength: 500,
                  },
                  rationale: {
                    type: "string",
                    minLength: 10,
                    maxLength: 500,
                  },
                  expectedClaimRevision: {
                    type: "integer",
                    minimum: 1,
                  },
                },
                required: [
                  "claimId",
                  "revisedText",
                  "rationale",
                  "expectedClaimRevision",
                ],
                additionalProperties: false,
              },
            },
            expectedWorkspaceRevision: { type: "integer", minimum: 1 },
          },
          required: ["resolutions", "expectedWorkspaceRevision"],
          additionalProperties: false,
        },
        annotations: { untrustedContentHint: true },
        execute: async (input) => {
          const resolutions = input.resolutions as StageResolutionInput[];
          const expectedWorkspaceRevision =
            input.expectedWorkspaceRevision as number;
          const next = commit((current) =>
            stageResolutionBatch(
              current,
              resolutions,
              expectedWorkspaceRevision,
            ),
          );
          setSelectedClaimId(resolutions[0].claimId);
          setNotice(
            "Agent staged " +
              resolutions.length +
              " resolution(s). Human approval is still required.",
          );
          return {
            changed: true,
            approved: false,
            workspaceRevision: next.revision,
            staged: resolutions.map((resolution) => {
              const claim = getClaim(next, resolution.claimId);
              return {
                claimId: claim.id,
                claimRevision: claim.revision,
                proposal: claim.proposal,
              };
            }),
            gate: verifyReleaseGate(next),
          };
        },
      },
      {
        name: "verify_release_gate",
        title: "Verify release gate",
        description:
          "Run ProofRail's deterministic release rules against the current live revision. Returns every blocker and open human decision. This does not change the page.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: async () => {
          const current = workspaceRef.current;
          return {
            workspaceId: current.id,
            title: current.title,
            gate: verifyReleaseGate(current),
          };
        },
      },
      {
        name: "export_proof_receipt",
        title: "Create proof receipt",
        description:
          "Create and display an immutable JSON proof receipt only when the deterministic release gate passes. The receipt includes final text, claim-evidence matrix, human audit log, and SHA-256 content hash.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { untrustedContentHint: true },
        execute: async () => {
          const source = workspaceRef.current;
          const receipt = await createProofReceipt(source);
          const next = commit((current) => {
            if (current.revision !== source.revision) {
              throw new Error(
                "STALE_RECEIPT: workspace changed while the receipt was generated.",
              );
            }
            return storeReceipt(current, receipt);
          });
          setReceiptOpen(true);
          setNotice("Proof receipt " + receipt.receiptId + " created.");
          return {
            created: true,
            storedWorkspaceRevision: next.revision,
            receipt,
          };
        },
      },
    ];

    async function register() {
      try {
        for (const tool of tools) {
          await modelContext.registerTool(tool, { signal: registration.signal });
        }
        if (mounted) setToolStatus("registered");
      } catch (error) {
        if (!registration.signal.aborted && mounted) {
          console.error("ProofRail WebMCP registration failed", error);
          setToolStatus("error");
        }
      }
    }

    void register();
    return () => {
      mounted = false;
      registration.abort();
    };
  }, [commit]);

  function resetDemo() {
    const next = createDemoWorkspace();
    workspaceRef.current = next;
    setWorkspace(next);
    setSelectedClaimId("claim-04");
    setReceiptOpen(false);
    setNotice("Demo workspace reset to revision 7.");
  }

  function stageDemoResolution(claim: ReviewClaim) {
    const resolution = demoResolutions[claim.id];
    if (!resolution) return;
    try {
      const next = commit((current) =>
        stageResolutionBatch(
          current,
          [
            {
              claimId: claim.id,
              revisedText: resolution.revisedText,
              rationale: resolution.rationale,
              expectedClaimRevision: getClaim(current, claim.id).revision,
            },
          ],
          current.revision,
        ),
      );
      setNotice(
        "Agent proposal staged at revision " +
          next.revision +
          ". A human must decide.",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to stage.");
    }
  }

  function decideSelected(decision: "approve" | "reject") {
    if (!selectedClaim) return;
    try {
      const next = commit((current) =>
        decideProposal(current, selectedClaim.id, decision),
      );
      setNotice(
        decision === "approve"
          ? "Human approval recorded. The draft and gate were recomputed."
          : "Human rejection recorded. The blocker remains visible.",
      );
      if (next.receipt) setReceiptOpen(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to decide.");
    }
  }

  function loadImportedPacket() {
    const normalizedDraft = importDraft
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const candidates = candidateClaimsFromDraft(normalizedDraft);
    if (candidates.length === 0) {
      setNotice("Add at least one complete sentence of 10 characters or more.");
      return;
    }
    try {
      const next = commit((current) =>
        replaceReviewPacket(current, {
          title: importTitle,
          headline: importHeadline,
          draftText: normalizedDraft,
          claims: candidates.map((text) => ({ text, risk: "medium" as const })),
          expectedWorkspaceRevision: current.revision,
        }),
      );
      setSelectedClaimId(next.claims[0].id);
      setImportOpen(false);
      setReceiptOpen(false);
      setNotice(
        "New packet loaded with " +
          next.claims.length +
          " unreviewed sentence candidates.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to load the packet.",
      );
    }
  }

  async function generateReceipt() {
    try {
      const source = workspaceRef.current;
      const receipt = await createProofReceipt(source);
      commit((current) => {
        if (current.revision !== source.revision) {
          throw new Error(
            "STALE_RECEIPT: workspace changed while the receipt was generated.",
          );
        }
        return storeReceipt(current, receipt);
      });
      setReceiptOpen(true);
      setNotice("Proof receipt " + receipt.receiptId + " created.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to create receipt.",
      );
    }
  }

  const statusText: Record<ToolStatus, string> = {
    checking: "Registering tools",
    registered: "6 live site tools",
    unsupported: "WebMCP unavailable",
    error: "Tool registration error",
  };

  return (
    <main className="proofrail-shell">
      <header className="topbar">
        <a className="wordmark" href="#workspace" aria-label="ProofRail home">
          <span className="wordmark-mark" aria-hidden="true">
            PR
          </span>
          <span>ProofRail</span>
        </a>

        <div className="topbar-context" aria-label="Current project">
          <span className="eyebrow">Evidence compiler</span>
          <span className="context-name">{workspace.title}</span>
        </div>

        <div className="top-actions">
          <button className="quiet-action" onClick={() => setImportOpen(true)}>
            New packet
          </button>
          <button className="quiet-action" onClick={resetDemo}>
            Reset demo
          </button>
          <button
            className={"session-strip tool-status-" + toolStatus}
            onClick={() => setToolsOpen((current) => !current)}
            aria-expanded={toolsOpen}
          >
            <span className="live-dot" aria-hidden="true" />
            <span>{statusText[toolStatus]}</span>
            <span className="session-divider" aria-hidden="true" />
            <strong>{gate.blockers.length} blockers</strong>
          </button>
        </div>
      </header>

      {toolsOpen && (
        <section className="tool-drawer" aria-label="ProofRail site tools">
          <div className="tool-drawer-heading">
            <div>
              <p className="kicker">WebMCP surface</p>
              <h2>Six tools. One authority boundary.</h2>
            </div>
            <button onClick={() => setToolsOpen(false)} aria-label="Close tools">
              Close
            </button>
          </div>
          <div className="tool-grid">
            {toolManifest.map((tool, index) => (
              <article key={tool.name}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <code>{tool.name}</code>
                  <p>{tool.description}</p>
                </div>
                <em>{tool.kind}</em>
              </article>
            ))}
          </div>
          <p className="authority-note">
            Agent boundary: inspect, connect, and stage. Only a visible human action
            can approve claim language.
          </p>
        </section>
      )}

      <section className="intro" aria-labelledby="page-title">
        <div>
          <p className="kicker">Pre-publication evidence control</p>
          <h1 id="page-title">
            Make every public claim
            <span> earn its release.</span>
          </h1>
        </div>
        <div className="intro-copy">
          <p>
            An agent can inspect, link evidence, and stage the smallest defensible
            revision. A human owns the final word.
          </p>
          <div
            className="progress-line"
            aria-label={
              gate.releasableClaims +
              " of " +
              workspace.claims.length +
              " claims releasable"
            }
          >
            <span
              style={{
                width:
                  (workspace.claims.length
                    ? (gate.releasableClaims / workspace.claims.length) * 100
                    : 0) + "%",
              }}
            />
          </div>
          <span className="progress-caption">
            {gate.releasableClaims} / {workspace.claims.length} claims releasable ·
            workspace rev. {workspace.revision}
          </span>
        </div>
      </section>

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}

      <section className="workspace" id="workspace">
        <article className="draft-panel" aria-labelledby="draft-heading">
          <div className="panel-heading">
            <div>
              <span className="panel-index">A</span>
              <p className="eyebrow">Draft under review</p>
            </div>
            <span className="revision-chip">rev. {workspace.revision}</span>
          </div>

          <div className="draft-copy">
            <p className="document-label">{workspace.title}</p>
            <h2 id="draft-heading">{workspace.headline}</h2>
            {workspace.draftText.split(/\n\n+/).map((paragraph, index) => (
              <p key={index}>
                {annotatedParagraph(
                  paragraph,
                  workspace.claims,
                  selectedClaimId,
                  setSelectedClaimId,
                ).map((part, partIndex) => (
                  <Fragment key={partIndex}>{part}</Fragment>
                ))}
              </p>
            ))}
          </div>

          <footer className="draft-footer">
            <span>{workspace.draftText.split(/\s+/).length} words</span>
            <span>{workspace.claims.length} atomic claims</span>
            <span>{workspace.edges.length} evidence edges</span>
          </footer>
        </article>

        <section className="rail-panel" aria-labelledby="rail-heading">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">B</span>
              <p className="eyebrow" id="rail-heading">
                Claim rail
              </p>
            </div>
            <span className="rail-key">Live graph</span>
          </div>

          <div className="claim-rail">
            {workspace.claims.map((claim, index) => (
              <button
                key={claim.id}
                className={
                  "rail-node " +
                  claim.state +
                  (selectedClaimId === claim.id ? " active" : "")
                }
                onClick={() => setSelectedClaimId(claim.id)}
                aria-pressed={selectedClaimId === claim.id}
              >
                <span className="node-path" aria-hidden="true">
                  <span className="node-dot" />
                  {index < workspace.claims.length - 1 && (
                    <span className="node-line" />
                  )}
                </span>
                <span className="node-content">
                  <span className="node-meta">
                    <strong>C-{claim.number}</strong>
                    <span>
                      {claim.proposal?.status === "staged"
                        ? "Human decision pending"
                        : claim.label}
                    </span>
                  </span>
                  <span className="node-text">{claim.text}</span>
                  <span className="node-link">
                    {
                      workspace.edges.filter((edge) => edge.claimId === claim.id)
                        .length
                    }{" "}
                    evidence edge
                    {workspace.edges.filter((edge) => edge.claimId === claim.id)
                      .length === 1
                      ? ""
                      : "s"}{" "}
                    · claim rev. {claim.revision}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <aside className="evidence-panel" aria-labelledby="evidence-heading">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">C</span>
              <p className="eyebrow" id="evidence-heading">
                Evidence decision
              </p>
            </div>
            {selectedClaim && (
              <span className={"decision-badge " + selectedClaim.state}>
                {selectedClaim.label}
              </span>
            )}
          </div>

          {selectedClaim ? (
            <div className="decision-body">
              <div className="claim-focus">
                <span className="focus-id">
                  Claim C-{selectedClaim.number} · {selectedClaim.risk} risk
                </span>
                <blockquote>{selectedClaim.text}</blockquote>
              </div>

              {selectedEdges.length > 0 ? (
                selectedEdges.map((edge) => {
                  const item = workspace.evidence.find(
                    (record) => record.id === edge.evidenceId,
                  );
                  if (!item) return null;
                  return (
                    <article className="evidence-card" key={edge.id}>
                      <div className="evidence-topline">
                        <span className={"relation relation-" + edge.relation}>
                          {relationLabel[edge.relation]}
                        </span>
                        <span>{item.id.toUpperCase()}</span>
                      </div>
                      <h3>{item.title}</h3>
                      <p>{item.excerpt}</p>
                      <p className="edge-rationale">{edge.rationale}</p>
                      <footer>
                        <span>{sourceTypeLabel[item.sourceType]}</span>
                        <time>{item.publishedAt}</time>
                      </footer>
                    </article>
                  );
                })
              ) : (
                <section className="empty-evidence">
                  <strong>No evidence edge yet</strong>
                  <p>
                    Ask the agent to attach a dated excerpt as support, qualifier,
                    contradiction, or stale evidence.
                  </p>
                </section>
              )}

              {selectedClaim.proposal?.status === "staged" ? (
                <section className="proposal-card is-staged">
                  <div className="proposal-heading">
                    <span>Agent proposal</span>
                    <span>Human decision required</span>
                  </div>
                  <p>{selectedClaim.proposal.after}</p>
                  <small>{selectedClaim.proposal.rationale}</small>
                  <div className="human-actions">
                    <button onClick={() => decideSelected("reject")}>
                      Reject
                    </button>
                    <button
                      className="approve"
                      onClick={() => decideSelected("approve")}
                    >
                      Approve revision
                    </button>
                  </div>
                </section>
              ) : selectedClaim.proposal?.status === "approved" ? (
                <section className="clean-card">
                  <span className="clean-check" aria-hidden="true">
                    ✓
                  </span>
                  <div>
                    <strong>Human decision recorded</strong>
                    <p>
                      The approved scoped language is now in the draft and audit
                      trail.
                    </p>
                  </div>
                </section>
              ) : selectedClaim.state === "supported" ? (
                <section className="clean-card">
                  <span className="clean-check" aria-hidden="true">
                    ✓
                  </span>
                  <div>
                    <strong>No language change required</strong>
                    <p>
                      A linked record directly supports this claim in its current
                      scope.
                    </p>
                  </div>
                </section>
              ) : demoResolutions[selectedClaim.id] ? (
                <section className="proposal-card">
                  <div className="proposal-heading">
                    <span>Safe revision available</span>
                    <span>Not applied</span>
                  </div>
                  <p>{demoResolutions[selectedClaim.id].revisedText}</p>
                  <small>{demoResolutions[selectedClaim.id].rationale}</small>
                  <button onClick={() => stageDemoResolution(selectedClaim)}>
                    {selectedClaim.proposal?.status === "rejected"
                      ? "Restage agent proposal"
                      : "Stage agent proposal"}
                    <span aria-hidden="true">→</span>
                  </button>
                </section>
              ) : (
                <section className="empty-evidence">
                  <strong>Agent action required</strong>
                  <p>
                    The agent can attach evidence or stage a narrower claim through
                    the page&apos;s WebMCP tools.
                  </p>
                </section>
              )}
            </div>
          ) : (
            <div className="decision-body">
              <section className="empty-evidence">
                <strong>No claim selected</strong>
              </section>
            </div>
          )}
        </aside>
      </section>

      <section className="release-band" aria-labelledby="release-title">
        <div className="gate-signal" aria-hidden="true">
          <span className={gate.status === "pass" ? "open" : ""} />
        </div>
        <div className="gate-copy">
          <p className="eyebrow">Deterministic release gate</p>
          <h2 id="release-title">
            {gate.status === "pass"
              ? "Evidence clear. Ready to seal."
              : "Release blocked by evidence."}
          </h2>
        </div>
        <div className="gate-rules">
          <span>Claim blockers</span>
          <strong>{gate.blockers.length}</strong>
          <span>Human decisions open</span>
          <strong>{gate.openHumanDecisions}</strong>
          <span>Checked revision</span>
          <strong>{gate.checkedRevision}</strong>
        </div>
        <button
          className="receipt-button"
          disabled={gate.status !== "pass"}
          onClick={() => void generateReceipt()}
        >
          {gate.status !== "pass"
            ? "Proof receipt locked"
            : "Generate proof receipt"}
          <span aria-hidden="true">↗</span>
        </button>
      </section>

      <section className="audit-band" aria-labelledby="audit-heading">
        <div className="audit-heading">
          <div>
            <span className="panel-index">D</span>
            <div>
              <p className="eyebrow">Immutable decision trail</p>
              <h2 id="audit-heading">What changed, who decided, which revision.</h2>
            </div>
          </div>
          <span>{workspace.audit.length} events</span>
        </div>
        <ol className="audit-list">
          {workspace.audit
            .slice()
            .reverse()
            .slice(0, 6)
            .map((event) => (
              <li key={event.id}>
                <span className={"actor actor-" + event.actor}>{event.actor}</span>
                <div>
                  <strong>{event.action.replaceAll("_", " ")}</strong>
                  <p>{event.detail}</p>
                </div>
                <span>rev. {event.workspaceRevision}</span>
              </li>
            ))}
        </ol>
      </section>

      <footer className="site-footer">
        <p>
          ProofRail does not decide truth. It makes evidence gaps, revisions, and
          human decisions explicit before publication.
        </p>
        <span>Local-first prototype · no account · no API key</span>
      </footer>

      {importOpen && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="import-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-title"
          >
            <div className="modal-heading">
              <div>
                <p className="kicker">Unknown-input test</p>
                <h2 id="import-title">Load a fresh draft</h2>
              </div>
              <button onClick={() => setImportOpen(false)} aria-label="Close import">
                ×
              </button>
            </div>
            <label>
              Packet title
              <input
                value={importTitle}
                maxLength={120}
                onChange={(event) => setImportTitle(event.target.value)}
              />
            </label>
            <label>
              Headline
              <input
                value={importHeadline}
                maxLength={180}
                onChange={(event) => setImportHeadline(event.target.value)}
              />
            </label>
            <label>
              Draft text
              <textarea
                value={importDraft}
                maxLength={8000}
                rows={10}
                onChange={(event) => setImportDraft(event.target.value)}
              />
            </label>
            <p className="import-note">
              The manual import marks complete sentences as unreviewed candidates.
              A WebMCP agent can instead submit deliberate atomic spans and risk
              levels through <code>replace_review_packet</code>.
            </p>
            <button className="modal-primary" onClick={loadImportedPacket}>
              Load unreviewed packet
              <span>→</span>
            </button>
          </section>
        </div>
      )}

      {receiptOpen && workspace.receipt && (
        <div className="modal-backdrop receipt-backdrop" role="presentation">
          <section
            className="receipt-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-title"
          >
            <div className="receipt-seal">
              <span>PASS</span>
              <small>SHA-256</small>
            </div>
            <div className="modal-heading">
              <div>
                <p className="kicker">Proof receipt</p>
                <h2 id="receipt-title">{workspace.receipt.receiptId}</h2>
              </div>
              <button
                onClick={() => setReceiptOpen(false)}
                aria-label="Close receipt"
              >
                ×
              </button>
            </div>
            <dl className="receipt-facts">
              <div>
                <dt>Sealed workspace revision</dt>
                <dd>{workspace.receipt.sourceWorkspaceRevision}</dd>
              </div>
              <div>
                <dt>Claims</dt>
                <dd>{workspace.receipt.matrix.length}</dd>
              </div>
              <div className="hash-row">
                <dt>Content hash</dt>
                <dd>{workspace.receipt.contentHash}</dd>
              </div>
            </dl>
            <div className="receipt-matrix">
              {workspace.receipt.matrix.map((row) => (
                <article key={row.claimId}>
                  <span>{row.claimId.toUpperCase()}</span>
                  <p>{row.claimText}</p>
                  <strong>{row.decision}</strong>
                  <small>{row.evidence.length} evidence record(s)</small>
                </article>
              ))}
            </div>
            <button
              className="modal-primary"
              onClick={() => downloadReceipt(workspace.receipt as ProofReceipt)}
            >
              Download receipt JSON
              <span>↓</span>
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
