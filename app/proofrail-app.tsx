"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  approveClaimEvidence,
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
  type EvidenceRelation,
  type PublicationPreviewVariant,
  type PublicationType,
  type ProofReceipt,
  type ReplacePacketInput,
  type ReviewClaim,
  type StageResolutionInput,
  type Workspace,
} from "../lib/proofrail";
import { PublicationPreview } from "./publication-preview";

const ProofArtifact = lazy(async () => {
  const artifactModule = await import("./proof-artifact");
  return { default: artifactModule.ProofArtifact };
});

function ArtifactFallback() {
  return (
    <div className="artifact-stage artifact-stage-loading" aria-hidden="true">
      <div className="artifact-loading-mark" />
      <span>Loading realtime object</span>
    </div>
  );
}

function DeferredProofArtifact({
  releaseState,
}: {
  releaseState: "blocked" | "cleared";
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || ready) return;
    if (typeof IntersectionObserver === "undefined") {
      const fallbackTimer = globalThis.setTimeout(() => setReady(true), 0);
      return () => globalThis.clearTimeout(fallbackTimer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setReady(true);
        observer.disconnect();
      },
      { rootMargin: "320px" },
    );
    observer.observe(mount);
    return () => observer.disconnect();
  }, [ready]);

  return (
    <div className="artifact-deferred" ref={mountRef}>
      {ready ? (
        <Suspense fallback={<ArtifactFallback />}>
          <ProofArtifact releaseState={releaseState} />
        </Suspense>
      ) : (
        <ArtifactFallback />
      )}
    </div>
  );
}

type ToolStatus = "checking" | "registered" | "unsupported" | "error";

const relationLabel: Record<EvidenceRelation, string> = {
  supports: "supports",
  qualifies: "qualifies",
  contradicts: "contradicts",
  outdated: "outdated",
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
    description: "Load a draft with complete, exact sentence coverage.",
  },
  {
    name: "attach_evidence",
    kind: "write",
    description: "Attach a dated source; human release approval still remains.",
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

function CinematicVideo({
  src,
  className = "",
  eager = false,
}: {
  src: string;
  className?: string;
  eager?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sourceEnabled, setSourceEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopViewport = window.matchMedia("(min-width: 781px)");
    let activationTimer: number | undefined;

    const enableSource = () => {
      if (reduceMotion.matches || !desktopViewport.matches) return;
      setSourceEnabled(true);
    };

    if (eager) {
      const scheduleActivation = () => {
        activationTimer = window.setTimeout(enableSource, 1200);
      };
      if (document.readyState === "complete") scheduleActivation();
      else window.addEventListener("load", scheduleActivation, { once: true });

      return () => {
        window.removeEventListener("load", scheduleActivation);
        if (activationTimer) window.clearTimeout(activationTimer);
      };
    }

    const activationObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || entry.intersectionRatio <= 0) return;
        enableSource();
        activationObserver.disconnect();
      },
      { threshold: 0.02 },
    );
    activationObserver.observe(video);

    return () => {
      activationObserver.disconnect();
      if (activationTimer) window.clearTimeout(activationTimer);
    };
  }, [eager]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !sourceEnabled) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !reduceMotion.matches) {
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    });

    const syncMotionPreference = () => {
      if (reduceMotion.matches) video.pause();
    };

    reduceMotion.addEventListener("change", syncMotionPreference);
    observer.observe(video);

    return () => {
      reduceMotion.removeEventListener("change", syncMotionPreference);
      observer.disconnect();
    };
  }, [sourceEnabled]);

  return (
    <video
      ref={videoRef}
      className={className}
      src={sourceEnabled ? src : undefined}
      data-film-ready={ready ? "true" : "false"}
      onCanPlay={() => setReady(true)}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
    />
  );
}

function reviewContextSnapshot(workspace: Workspace) {
  const gate = verifyReleaseGate(workspace);
  return {
    workspace: {
      id: workspace.id,
      publicationType: workspace.publicationType,
      title: workspace.title,
      headline: workspace.headline,
      draftText: workspace.draftText,
      revision: workspace.revision,
    },
    claims: workspace.claims.map((claim) => ({
      id: claim.id,
      text: claim.text,
      location: claim.location,
      state: claim.state,
      risk: claim.risk,
      revision: claim.revision,
      humanApproval: claim.humanApproval,
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
  const [receiptPending, setReceiptPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const importDialogRef = useRef<HTMLElement>(null);
  const receiptDialogRef = useRef<HTMLElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const [importTitle, setImportTitle] = useState("Untitled review packet");
  const [importHeadline, setImportHeadline] = useState(
    "A draft waiting for evidence.",
  );
  const [importPublicationType, setImportPublicationType] =
    useState<PublicationType>("project-page");
  const [importDraft, setImportDraft] = useState(
    "Paste a short draft here. ProofRail will turn complete sentences into claim candidates for evidence review.",
  );
  const [previewVariant, setPreviewVariant] =
    useState<PublicationPreviewVariant>("current");

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
  const selectedEdge = selectedEdges[0];
  const selectedEvidence = selectedEdge
    ? workspace.evidence.find((record) => record.id === selectedEdge.evidenceId)
    : undefined;
  const selectedResolution = selectedClaim
    ? demoResolutions[selectedClaim.id]
    : undefined;
  const selectedBlocker = selectedClaim
    ? gate.blockers.find((blocker) => blocker.claimId === selectedClaim.id)
    : undefined;
  const selectedClaimCleared = Boolean(selectedClaim && !selectedBlocker);
  const receiptModalOpen = receiptOpen && Boolean(workspace.receipt);
  const importModalOpen = importOpen && !receiptModalOpen;

  useEffect(() => {
    if (!importModalOpen && !receiptModalOpen) return;

    const dialog = receiptModalOpen
      ? receiptDialogRef.current
      : importDialogRef.current;
    if (!dialog) return;
    const activeDialog = dialog;

    lastFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const getFocusable = () =>
      Array.from(
        activeDialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getAttribute("aria-hidden") !== "true");

    queueMicrotask(() => (getFocusable()[0] ?? activeDialog).focus());

    function handleDialogKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (receiptModalOpen) setReceiptOpen(false);
        else setImportOpen(false);
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        activeDialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleDialogKeydown);
    return () => {
      document.removeEventListener("keydown", handleDialogKeydown);
      document.body.style.overflow = previousOverflow;
      if (lastFocusedRef.current?.isConnected) {
        lastFocusedRef.current.focus();
      }
    };
  }, [importModalOpen, receiptModalOpen]);

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
          "Read the current ProofRail publication type, exact headline and body, atomic claim locations, typed evidence edges, revision numbers, human proposals, and deterministic release gate. This does not change the page.",
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
          "Replace the local ProofRail workspace with a project page, blog post, launch page, or report plus exact claim spans covering the complete headline and every complete body sentence. This clears the current evidence graph and receipt. Use the current workspace revision to prevent overwriting newer human work.",
        inputSchema: {
          type: "object",
          properties: {
            publicationType: {
              type: "string",
              enum: ["project-page", "blog-post", "launch-page", "report"],
            },
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
                  location: {
                    type: "string",
                    enum: ["headline", "body"],
                  },
                  text: { type: "string", minLength: 3, maxLength: 500 },
                  risk: {
                    type: "string",
                    enum: ["low", "medium", "high"],
                  },
                },
                required: ["location", "text", "risk"],
                additionalProperties: false,
              },
            },
            expectedWorkspaceRevision: { type: "integer", minimum: 1 },
          },
          required: [
            "publicationType",
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
          setPreviewVariant("current");
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
          "Add one dated source excerpt and connect it to one claim as supports, qualifies, contradicts, or outdated. Public sources require a URL. Agent attachment never grants release approval; a human must still approve the linked evidence and wording. This changes the live local workspace and invalidates any previous receipt.",
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
          "Stage one to eight narrow, single-sentence revisions for blocked claims and visible human review. This never approves, publishes, or reopens an already releasable claim. Each claim and the workspace must match the supplied revision numbers.",
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
                    minLength: 3,
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
          setPreviewVariant("proposed");
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
          "Create and display an immutable JSON proof receipt only when the deterministic release gate passes. The receipt seals the publication type, headline, final body, claim locations, evidence matrix, human audit log, and SHA-256 content hash.",
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
          setImportOpen(false);
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
    setPreviewVariant("current");
    setReceiptOpen(false);
    setNotice("Demo workspace reset to revision 7.");
  }

  function inspectClaim(claimId: string) {
    setSelectedClaimId(claimId);
    requestAnimationFrame(() => {
      const inspectionBay = document.getElementById("inspection-bay");
      inspectionBay?.scrollIntoView({ block: "start" });
      inspectionBay?.focus({ preventScroll: true });
    });
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
      setPreviewVariant("proposed");
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
      setPreviewVariant(
        next.claims.some((claim) => claim.proposal?.status === "staged")
          ? "proposed"
          : "current",
      );
      setNotice(
        decision === "approve"
          ? "Human approval recorded. The draft and gate were recomputed."
          : "Human rejection recorded. The blocker remains visible.",
      );
      if (next.receipt) {
        setImportOpen(false);
        setReceiptOpen(true);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to decide.");
    }
  }

  function approveSelectedEvidence() {
    if (!selectedClaim) return;
    try {
      commit((current) => approveClaimEvidence(current, selectedClaim.id));
      setNotice(
        "Human approval recorded for the linked evidence and current wording.",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to approve evidence.");
    }
  }

  function loadImportedPacket() {
    setImportError(null);
    const normalizedDraft = importDraft
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    let candidates: string[];
    try {
      candidates = candidateClaimsFromDraft(normalizedDraft);
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Unable to inspect draft.",
      );
      return;
    }
    if (candidates.length === 0) {
      setImportError("Add at least one complete sentence of 3 characters or more.");
      return;
    }
    try {
      const next = commit((current) =>
        replaceReviewPacket(current, {
          publicationType: importPublicationType,
          title: importTitle,
          headline: importHeadline,
          draftText: normalizedDraft,
          claims: [
            {
              location: "headline" as const,
              text: importHeadline.trim(),
              risk: "medium" as const,
            },
            ...candidates.map((text) => ({
              location: "body" as const,
              text,
              risk: "medium" as const,
            })),
          ],
          expectedWorkspaceRevision: current.revision,
        }),
      );
      setSelectedClaimId(next.claims[0].id);
      setPreviewVariant("current");
      setImportError(null);
      setImportOpen(false);
      setReceiptOpen(false);
      setNotice(
        "New packet loaded with " +
          next.claims.length +
          " unreviewed sentence candidates.",
      );
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Unable to load the packet.",
      );
    }
  }

  async function generateReceipt() {
    if (receiptPending) return;
    setReceiptPending(true);
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
      setImportOpen(false);
      setReceiptOpen(true);
      setNotice("Proof receipt " + receipt.receiptId + " created.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to create receipt.",
      );
    } finally {
      setReceiptPending(false);
    }
  }

  const statusText: Record<ToolStatus, string> = {
    checking: "WebMCP · connecting",
    registered: "WebMCP · agent ready",
    unsupported: "WebMCP · demo mode",
    error: "WebMCP · unavailable",
  };

  return (
    <main className="proofrail-shell" id="page-top">
      <div
        className="app-surface"
        inert={importModalOpen || receiptModalOpen ? true : undefined}
        aria-hidden={importModalOpen || receiptModalOpen ? true : undefined}
      >
        <header className="topbar">
          <a className="wordmark" href="#page-top">
            <span className="wordmark-mark" aria-hidden="true">
              PR
            </span>
            <span>ProofRail</span>
          </a>

        <div className="topbar-context" aria-label="Current release status">
          <span className="eyebrow">Pre-publish claim control</span>
          <span className="context-name">
            {gate.status === "pass" ? "Release cleared" : "Publication locked"}
          </span>
        </div>

        <div className="top-actions">
          <button
            className="quiet-action"
            onClick={() => {
              setImportError(null);
              setImportOpen(true);
            }}
          >
            Load draft
          </button>
          <button className="quiet-action" onClick={resetDemo}>
            Reset demo
          </button>
          <button
            className={"session-strip tool-status-" + toolStatus}
            onClick={() => setToolsOpen((current) => !current)}
            aria-expanded={toolsOpen}
            aria-controls="webmcp-tool-drawer"
            aria-label={`${toolsOpen ? "Close" : "Open"} WebMCP tools. ${statusText[toolStatus]}. ${gate.blockers.length} blockers.`}
          >
            <span className="live-dot" aria-hidden="true" />
            <span>{statusText[toolStatus]}</span>
            <span className="session-divider" aria-hidden="true" />
            <strong>{gate.blockers.length} blockers</strong>
          </button>
        </div>
        </header>

      {toolsOpen && (
        <section
          className="tool-drawer"
          id="webmcp-tool-drawer"
          aria-label="ProofRail site tools"
        >
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

      <section className="inspection-hero" aria-labelledby="page-title">
        <div className="hero-film-layer" aria-hidden="true">
          <CinematicVideo src="/media/proofrail-block.mp4" eager />
          <span className="hero-film-wash" />
        </div>
        <div className="hero-message">
          <p className="hero-eyebrow">
            Pre-publication release gate · for marketing &amp; PR
          </p>
          <h1 id="page-title">
            <span>No proof.</span>
            <span>No publish.</span>
          </h1>
          <p className="hero-definition">
            <strong>
              ProofRail is a pre-publication review app for marketing and PR teams.
            </strong>{" "}
            Before a project page, blog post, launch page, or report goes live,
            AI checks every public claim against linked sources. A human approves
            the exact words and evidence. Until both match, Publish stays locked.
          </p>
          <div className="mobile-publication-preview">
            <PublicationPreview
              workspace={workspace}
              selectedClaimId={selectedClaimId}
              variant={previewVariant}
              size="compact"
              onVariantChange={setPreviewVariant}
              onSelectClaim={inspectClaim}
            />
          </div>
          <ul className="hero-use-cases" aria-label="Content ProofRail reviews">
            <li>Project page</li>
            <li>Blog post</li>
            <li>Launch page</li>
            <li>Report</li>
          </ul>
          <ol className="authority-chain" aria-label="ProofRail release flow">
            <li>
              <span>01 · Draft</span>
              <strong>Project, blog, launch page, or report enters</strong>
            </li>
            <li>
              <span>02 · AI check</span>
              <strong>Claims are matched to linked sources</strong>
            </li>
            <li>
              <span>03 · Human</span>
              <strong>You approve the exact words and evidence</strong>
            </li>
            <li>
              <span>04 · Publish</span>
              <strong>The gate unlocks only when every claim clears</strong>
            </li>
          </ol>
          <div className="hero-tech-line" aria-label="Technical implementation">
            <span>Live app</span>
            <span>6 WebMCP tools</span>
            <span>SHA-256 proof receipt</span>
          </div>
          <div className="mobile-actions" aria-label="Workspace actions">
            <button
              className="quiet-action"
              onClick={() => {
                setImportError(null);
                setImportOpen(true);
              }}
            >
              Load a draft
            </button>
            <button className="quiet-action" onClick={resetDemo}>
              Reset demo
            </button>
          </div>
        </div>

        {selectedClaim && (
          <article
            id="inspection-bay"
            className={
              "inspection-bay " +
              (selectedClaimCleared ? "is-cleared" : "is-blocked")
            }
            aria-labelledby="inspection-title"
            tabIndex={-1}
          >
            <header className="bay-header">
              <div>
                <span>Publication claim before release</span>
                <strong id="inspection-title">
                  Claim {selectedClaim.number} · {selectedClaim.risk} risk
                </strong>
              </div>
              <span className="bay-case">{workspace.title}</span>
            </header>

            <PublicationPreview
              workspace={workspace}
              selectedClaimId={selectedClaimId}
              variant={previewVariant}
              size="compact"
              onVariantChange={setPreviewVariant}
              onSelectClaim={inspectClaim}
            />

            <div className="source-check">
              <div className="source-label">
                <span>What the source proves</span>
                {selectedEdge && <strong>{relationLabel[selectedEdge.relation]}</strong>}
              </div>
              {selectedEvidence ? (
                <>
                  <blockquote>“{selectedEvidence.excerpt}”</blockquote>
                  <footer>
                    <span>
                      {selectedEvidence.title} · {selectedEvidence.sourceType.replaceAll("-", " ")}
                    </span>
                    <span className="source-provenance">
                      <time dateTime={selectedEvidence.publishedAt}>
                        {selectedEvidence.publishedAt}
                      </time>
                      {selectedEvidence.sourceUrl && (
                        <a
                          href={selectedEvidence.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open source ↗
                        </a>
                      )}
                      {!selectedEvidence.sourceUrl && <em>No source URL supplied</em>}
                    </span>
                  </footer>
                </>
              ) : (
                <p className="missing-source">No source is attached to this claim.</p>
              )}
            </div>

            <div className="inspection-verdict" aria-live="polite">
              <span>
                {selectedClaimCleared ? "Why publish is clear" : "Why publish is blocked"}
              </span>
              <strong>
                {selectedClaimCleared
                  ? "The language matches the evidence."
                  : selectedEdge?.rationale ?? "This claim has no usable proof."}
              </strong>
            </div>

            {selectedClaim.proposal?.status === "staged" ? (
              <section className="bay-decision" aria-label="Human decision">
                <div>
                  <span>AI-prepared wording</span>
                  <p>“{selectedClaim.proposal.after}”</p>
                  <small>Nothing changes until you decide.</small>
                </div>
                <div className="bay-human-actions">
                  <button onClick={() => decideSelected("reject")}>Reject</button>
                  <button onClick={() => decideSelected("approve")}>
                    Approve this wording
                  </button>
                </div>
              </section>
            ) : selectedClaimCleared ? (
              <div className="bay-cleared-message">
                <span aria-hidden="true">✓</span>
                <strong>This claim may continue to the release gate.</strong>
              </div>
            ) : selectedClaim.state === "supported" && selectedEvidence ? (
              <section className="bay-decision" aria-label="Human evidence decision">
                <div>
                  <span>Evidence supports this wording</span>
                  <p>Human release approval is still required.</p>
                  <small>An agent can attach proof, but it cannot clear the gate.</small>
                </div>
                <div className="bay-human-actions">
                  <button onClick={approveSelectedEvidence}>
                    Approve evidence and wording
                  </button>
                </div>
              </section>
            ) : selectedResolution ? (
              <button
                className="prepare-button"
                onClick={() => stageDemoResolution(selectedClaim)}
              >
                <span className="prepare-copy">
                  <strong>Fix this blocked claim</strong>
                  <small>AI proposes. You approve.</small>
                </span>
                <span aria-hidden="true">→</span>
              </button>
            ) : (
              <div className="bay-cleared-message is-waiting">
                <span aria-hidden="true">!</span>
                <strong>The agent must attach proof or prepare safer wording.</strong>
              </div>
            )}

            <footer className="bay-gate">
              <div>
                <span className="gate-lock" aria-hidden="true" />
                <strong>
                  Release gate · {gate.status === "pass" ? "unlocked" : "locked"}
                </strong>
              </div>
              <div
                className="bay-progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={workspace.claims.length}
                aria-valuenow={gate.releasableClaims}
                aria-label={`${gate.releasableClaims} of ${workspace.claims.length} claims cleared`}
              >
                {workspace.claims.map((claim) => (
                  <span
                    key={claim.id}
                    className={
                      claim.state === "supported" || claim.state === "resolved"
                        ? "is-clear"
                        : ""
                    }
                  />
                ))}
              </div>
              <span>
                {gate.releasableClaims} of {workspace.claims.length} claims cleared
              </span>
            </footer>
          </article>
        )}
      </section>

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}

      <section
        id="block-film"
        className="cinematic-transition cinematic-block"
        aria-labelledby="block-film-title"
      >
        <CinematicVideo src="/media/proofrail-block.mp4" />
        <div className="cinematic-scrim" aria-hidden="true" />
        <div className="cinematic-frame" aria-hidden="true">
          <span>Scan / 01</span>
          <span>Evidence mismatch</span>
          <span>Gate locked</span>
        </div>
        <div className="cinematic-copy">
          <p>One sentence. One source. One hard stop.</p>
          <h2 id="block-film-title">
            A website claim enters. The source disagrees. Publish stays locked.
          </h2>
          <span>
            “800 launch teams” cannot pass when the source only proves 800
            waitlist sign-ups.
          </span>
        </div>
      </section>

      <section className="release-queue" id="workspace" aria-labelledby="queue-title">
        <header className="section-heading">
          <div>
            <p className="section-kicker">Inspection queue</p>
            <h2 id="queue-title">Every claim must clear the same rail.</h2>
          </div>
          <p>
            Pick a claim. ProofRail brings its exact source and release decision
            into the inspection bay above.
          </p>
        </header>

        <div className="queue-track">
          {workspace.claims.map((claim) => {
            const blocker = gate.blockers.find((item) => item.claimId === claim.id);
            const cleared = !blocker;
            return (
              <button
                key={claim.id}
                className={
                  "queue-claim " +
                  (cleared ? "is-clear" : "is-blocked") +
                  (selectedClaimId === claim.id ? " is-active" : "")
                }
                onClick={() => inspectClaim(claim.id)}
                aria-pressed={selectedClaimId === claim.id}
                aria-controls="inspection-bay"
              >
                <span className="queue-number">C-{claim.number}</span>
                <span className="queue-copy">
                  <strong>{claim.text}</strong>
                  <small>
                    {claim.proposal?.status === "staged"
                      ? "Waiting for your decision"
                      : blocker?.code === "HUMAN_APPROVAL_REQUIRED"
                        ? "Evidence attached · human approval needed"
                      : cleared
                        ? "Evidence matched"
                        : blocker?.detail ?? claim.label}
                  </small>
                </span>
                <span className="queue-verdict">
                  {cleared ? "Cleared" : "Blocked"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="authority-boundary" aria-labelledby="authority-title">
        <header className="section-heading inverse">
          <div>
            <p className="section-kicker">One hard boundary</p>
            <h2 id="authority-title">AI prepares. Humans decide. The gate enforces.</h2>
          </div>
          <p>
            ProofRail is not an AI truth oracle. It separates assistance,
            authority, and release into three visible jobs.
          </p>
        </header>

        <div className="role-lane">
          <article className="role-card role-agent">
            <span>01 · AI</span>
            <h3>Inspect and prepare</h3>
            <p>Read the live draft, attach dated proof, and propose narrower words.</p>
            <strong>Cannot approve</strong>
          </article>
          <article className="role-card role-human">
            <span>02 · Human</span>
            <h3>Own the wording</h3>
            <p>Approve the exact words and linked proof that would appear in public.</p>
            <strong>The protected decision</strong>
          </article>
          <article className="role-card role-system">
            <span>03 · Gate</span>
            <h3>Block or release</h3>
            <p>Apply fixed rules and issue a hashed receipt only after every claim clears.</p>
            <strong>No confidence theatre</strong>
          </article>
        </div>
      </section>

      <section id="evidence-core" className="evidence-core" aria-labelledby="core-title">
        <div className="core-copy">
          <p className="section-kicker">3D / The evidence core</p>
          <h2 id="core-title">The gate is the product.</h2>
          <p>
            ProofRail is not another feed, newsroom, or AI writer. It is the
            control layer between a draft and the publish button.
          </p>
          <dl>
            <div>
              <dt>AI</dt>
              <dd>Inspects and prepares</dd>
            </div>
            <div>
              <dt>Human</dt>
              <dd>Owns the final words</dd>
            </div>
            <div>
              <dt>System</dt>
              <dd>Blocks or releases</dd>
            </div>
          </dl>
        </div>
        <DeferredProofArtifact
          releaseState={gate.status === "pass" ? "cleared" : "blocked"}
        />
      </section>

      <section className="review-packet" aria-labelledby="packet-title">
        <header className="section-heading">
          <div>
            <p className="section-kicker">Live publication preview</p>
            <h2 id="packet-title">See the public page before it ships.</h2>
          </div>
          <p>
            Switch between the current draft and unapproved AI wording. Every
            highlighted phrase stays connected to its source and human decision.
          </p>
        </header>

        <div className="packet-layout">
          <PublicationPreview
            workspace={workspace}
            selectedClaimId={selectedClaimId}
            variant={previewVariant}
            size="full"
            onVariantChange={setPreviewVariant}
            onSelectClaim={inspectClaim}
          />

          <aside
            className={
              "release-console " +
              (gate.status === "pass" ? "is-pass" : "is-blocked")
            }
            aria-labelledby="release-title"
          >
            <header>
              <span className="console-signal" aria-hidden="true" />
              <div>
                <p>Release gate</p>
                <h3 id="release-title">
                  {gate.status === "pass" ? "Ready to seal." : "Publication locked."}
                </h3>
              </div>
            </header>

            <div className="console-counts">
              <div>
                <strong>{gate.releasableClaims}</strong>
                <span>Claims cleared</span>
              </div>
              <div>
                <strong>{gate.blockers.length}</strong>
                <span>Blockers left</span>
              </div>
              <div>
                <strong>{gate.openHumanDecisions}</strong>
                <span>Your decisions</span>
              </div>
            </div>

            {gate.blockers.length > 0 ? (
              <ol className="console-blockers">
                {gate.blockers.slice(0, 4).map((blocker) => {
                  const claim = workspace.claims.find(
                    (candidate) => candidate.id === blocker.claimId,
                  );
                  return (
                    <li key={`${blocker.claimId}-${blocker.code}`}>
                      <span>C-{claim?.number ?? "--"}</span>
                      <div>
                        <strong>{blocker.code.replaceAll("_", " ")}</strong>
                        <p>{blocker.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="receipt-ready">
                <span aria-hidden="true">✓</span>
                <div>
                  <strong>All claims cleared</strong>
                  <p>The final wording, decisions, sources, and hash can now be sealed.</p>
                </div>
              </div>
            )}

            <button
              className="seal-button"
              disabled={gate.status !== "pass" || receiptPending}
              aria-busy={receiptPending}
              onClick={() => void generateReceipt()}
            >
              <span>
                {receiptPending
                  ? "Sealing proof receipt…"
                  : gate.status === "pass"
                    ? "Seal proof receipt"
                    : "Receipt stays locked"}
              </span>
              <span aria-hidden="true">↗</span>
            </button>
          </aside>
        </div>
      </section>

      <section
        id="release-film"
        className="cinematic-transition cinematic-release"
        aria-labelledby="release-film-title"
      >
        <CinematicVideo src="/media/proofrail-release.mp4" />
        <div className="cinematic-scrim" aria-hidden="true" />
        <div className="cinematic-frame" aria-hidden="true">
          <span>Seal / 04</span>
          <span>Human approved</span>
          <span>Receipt issued</span>
        </div>
        <div className="cinematic-copy">
          <p>Only after the human says yes.</p>
          <h2 id="release-film-title">The rail clears. The receipt becomes proof.</h2>
          <span>
            Final wording, sources, decisions, revision, and hash travel together.
          </span>
        </div>
      </section>

      <section className="evidence-log" aria-label="Decision log">
        <details>
          <summary>
            <span>Immutable decision log</span>
            <strong>{workspace.audit.length} recorded events</strong>
            <em>Open log</em>
          </summary>
          <ol className="audit-list">
            {workspace.audit
              .slice()
              .reverse()
              .slice(0, 8)
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
        </details>
      </section>

        <footer className="site-footer">
        <p>
          ProofRail does not decide truth. It makes evidence gaps, revisions, and
          human decisions explicit before publication.
        </p>
        <span>
          Local-first prototype · no account · no API key · cinematic media
          AI-generated with Higgsfield · 3D artifact generated with Meshy
        </span>
        </footer>
      </div>

      {importModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <section
            ref={importDialogRef}
            className="import-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-title"
            aria-describedby={importError ? "import-error" : undefined}
            tabIndex={-1}
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
              What are you publishing?
              <select
                value={importPublicationType}
                onChange={(event) =>
                  setImportPublicationType(event.target.value as PublicationType)
                }
              >
                <option value="project-page">Project page</option>
                <option value="blog-post">Blog post</option>
                <option value="launch-page">Launch page</option>
                <option value="report">Report</option>
              </select>
            </label>
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
            {importError && (
              <p className="import-error" id="import-error" role="alert">
                {importError}
              </p>
            )}
            <p className="import-note">
              ProofRail immediately renders a simulated publication layout. The
              full headline and every complete body sentence enter review as exact
              claim spans. A WebMCP agent can submit deliberate risk levels through
              <code> replace_review_packet</code>.
            </p>
            <button className="modal-primary" onClick={loadImportedPacket}>
              Load unreviewed packet
              <span>→</span>
            </button>
          </section>
        </div>
      )}

      {receiptModalOpen && workspace.receipt && (
        <div className="modal-backdrop receipt-backdrop" role="presentation">
          <section
            ref={receiptDialogRef}
            className="receipt-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-title"
            tabIndex={-1}
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
              <div>
                <dt>Publication</dt>
                <dd>{workspace.receipt.publicationType.replaceAll("-", " ")}</dd>
              </div>
              <div className="hash-row">
                <dt>Content hash</dt>
                <dd>{workspace.receipt.contentHash}</dd>
              </div>
            </dl>
            <div className="receipt-matrix">
              {workspace.receipt.matrix.map((row) => (
                <article key={row.claimId}>
                  <span>
                    {row.claimId.toUpperCase()} · {row.claimLocation}
                  </span>
                  <p>{row.claimText}</p>
                  <strong>{row.decision}</strong>
                  {row.evidence.map((record) => (
                    <small key={record.evidenceId}>
                      {record.title} · {record.publishedAt} · {record.sourceType.replaceAll("-", " ")}
                    </small>
                  ))}
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
