"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  approveClaimEvidence,
  attachEvidence,
  candidateClaimsFromDraft,
  changePublicationType,
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
  type PublicationPreviewVariant,
  type PublicationType,
  type ProofReceipt,
  type ReplacePacketInput,
  type ReviewClaim,
  type StageResolutionInput,
  type Workspace,
} from "../lib/proofrail";
import {
  PublicationPreview,
  type BrandDirection,
  type HeroFocalPoint,
  type PreviewProfile,
} from "./publication-preview";

type ToolStatus = "checking" | "registered" | "unsupported" | "error";

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

const demoPreviewProfile: PreviewProfile = {
  brandName: "Northstar",
  direction: "precision",
  industry: "Launch operations",
  audience: "Marketing and product teams",
  author: "Northstar launch team",
  publishedLabel: "August 27, 2026",
  ctaLabel: "Request access",
  subjectName: "Northstar",
  heroFocalPoint: "center",
};

const subjectLabels: Record<PublicationType, string> = {
  "launch-page": "Product / release name",
  "project-page": "Client / project subject",
  "blog-post": "Series / article subject",
  report: "Study / programme name",
};

const authorLabels: Record<PublicationType, string> = {
  "launch-page": "Launch owner / team",
  "project-page": "Studio / project author",
  "blog-post": "Article author",
  report: "Author / institution",
};

type ReplacePacketToolInput = ReplacePacketInput & {
  presentationProfile?: {
    brandName?: string;
    direction?: BrandDirection;
    industry?: string;
    audience?: string;
    author?: string;
    publishedLabel?: string;
    ctaLabel?: string;
    subjectName?: string;
  };
};

function toolPreviewProfile(input: ReplacePacketToolInput): PreviewProfile {
  const profile = input.presentationProfile;
  return {
    brandName: profile?.brandName?.trim() || "Your company",
    direction: profile?.direction ?? "precision",
    industry: profile?.industry?.trim() || "General",
    audience: profile?.audience?.trim() || "Public audience",
    author: profile?.author?.trim() || "Editorial team",
    publishedLabel: profile?.publishedLabel?.trim() || "Draft",
    ctaLabel: profile?.ctaLabel?.trim() || "Learn more",
    subjectName: profile?.subjectName?.trim() || undefined,
    heroFocalPoint: "center",
  };
}

function reviewContextSnapshot(
  workspace: Workspace,
  presentationProfile: PreviewProfile,
) {
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
    presentationProfile,
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
  const [previewMode, setPreviewMode] = useState<"public" | "proof">("public");
  const [previewProfile, setPreviewProfile] =
    useState<PreviewProfile>(demoPreviewProfile);
  const previewProfileRef = useRef(previewProfile);
  const [importBrandName, setImportBrandName] = useState("Your company");
  const [importDirection, setImportDirection] =
    useState<BrandDirection>("precision");
  const [importIndustry, setImportIndustry] = useState("Technology");
  const [importAudience, setImportAudience] = useState("Customers and press");
  const [importAuthor, setImportAuthor] = useState("Editorial team");
  const [importPublishedLabel, setImportPublishedLabel] = useState(
    "August 27, 2026",
  );
  const [importCtaLabel, setImportCtaLabel] = useState("Learn more");
  const [importSubjectName, setImportSubjectName] = useState("Not specified");
  const [importHeroAssetUrl, setImportHeroAssetUrl] = useState<string>();
  const [importHeroAssetAlt, setImportHeroAssetAlt] = useState("");
  const [importHeroFocalPoint, setImportHeroFocalPoint] =
    useState<HeroFocalPoint>("center");

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
          "Read the current ProofRail publication type, short presentation profile, exact headline and body, atomic claim locations, typed evidence edges, revision numbers, human proposals, and deterministic release gate. This does not change the page.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: async () =>
          reviewContextSnapshot(
            workspaceRef.current,
            previewProfileRef.current,
          ),
      },
      {
        name: "replace_review_packet",
        title: "Load review packet",
        description:
          "Replace the local ProofRail workspace with a launch page, project page, blog post, or report plus exact claim spans covering the complete headline and every complete body sentence. An optional presentationProfile supplies short layout metadata such as brand, audience, art direction, and subject without adding unchecked public prose or invented media. This clears the current evidence graph and receipt. Use the current workspace revision to prevent overwriting newer human work.",
        inputSchema: {
          type: "object",
          properties: {
            publicationType: {
              type: "string",
              enum: ["launch-page", "project-page", "blog-post", "report"],
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
            presentationProfile: {
              type: "object",
              properties: {
                brandName: { type: "string", minLength: 1, maxLength: 80 },
                direction: {
                  type: "string",
                  enum: ["precision", "editorial", "institutional", "kinetic"],
                },
                industry: { type: "string", minLength: 1, maxLength: 80 },
                audience: { type: "string", minLength: 1, maxLength: 100 },
                author: { type: "string", minLength: 1, maxLength: 100 },
                publishedLabel: { type: "string", minLength: 1, maxLength: 80 },
                ctaLabel: { type: "string", minLength: 1, maxLength: 60 },
                subjectName: { type: "string", minLength: 1, maxLength: 100 },
              },
              additionalProperties: false,
            },
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
          const toolInput = input as unknown as ReplacePacketToolInput;
          const packetInput: ReplacePacketInput = {
            publicationType: toolInput.publicationType,
            title: toolInput.title,
            headline: toolInput.headline,
            draftText: toolInput.draftText,
            claims: toolInput.claims,
            expectedWorkspaceRevision: toolInput.expectedWorkspaceRevision,
          };
          const next = commit((current) =>
            replaceReviewPacket(current, packetInput),
          );
          const nextPreviewProfile = toolPreviewProfile(toolInput);
          previewProfileRef.current = nextPreviewProfile;
          setPreviewProfile(nextPreviewProfile);
          setSelectedClaimId(next.claims[0].id);
          setPreviewVariant("current");
          setPreviewMode("public");
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
            presentationProfile: nextPreviewProfile,
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
          "Stage one to eight narrow, single-sentence revisions inside the claim's current preview paragraph for blocked claims and visible human review. This never approves, publishes, or reopens an already releasable claim. Each claim and the workspace must match the supplied revision numbers.",
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
                    description:
                      "One exact public sentence without a paragraph break.",
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
    setPreviewMode("public");
    previewProfileRef.current = demoPreviewProfile;
    setPreviewProfile(demoPreviewProfile);
    setReceiptOpen(false);
    setNotice("Demo workspace reset to revision 7.");
  }

  function inspectClaim(claimId: string) {
    setPreviewMode("proof");
    setSelectedClaimId(claimId);
    requestAnimationFrame(() => {
      const inspectionBay = document.getElementById("inspection-bay");
      inspectionBay?.scrollIntoView({ block: "start" });
      inspectionBay?.focus({ preventScroll: true });
    });
  }

  function switchPublicationType(publicationType: PublicationType) {
    const next = commit((current) =>
      changePublicationType(current, publicationType),
    );
    setPreviewVariant("current");
    setReceiptOpen(false);
    setNotice(
      `Preview rebuilt as ${publicationType.replaceAll("-", " ")} at revision ${next.revision}. Any sealed receipt was invalidated.`,
    );
  }

  function loadHeroAsset(file?: File) {
    if (!file) {
      setImportHeroAssetUrl(undefined);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setImportError("Hero asset must be an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setImportError("Hero asset must be 8 MB or smaller for this local preview.");
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        setImportHeroAssetUrl(reader.result);
        setImportError(null);
      }
    });
    reader.addEventListener("error", () => {
      setImportError("The hero asset could not be read locally.");
    });
    reader.readAsDataURL(file);
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
      setPreviewMode("public");
      const nextPreviewProfile: PreviewProfile = {
        brandName: importBrandName.trim() || "Your company",
        direction: importDirection,
        industry: importIndustry.trim() || "General",
        audience: importAudience.trim() || "Public audience",
        author: importAuthor.trim() || "Editorial team",
        publishedLabel: importPublishedLabel.trim() || "Draft",
        ctaLabel: importCtaLabel.trim() || "Learn more",
        subjectName: importSubjectName.trim() || undefined,
        heroAssetUrl:
          importPublicationType === "report" ? undefined : importHeroAssetUrl,
        heroAssetAlt:
          importPublicationType === "report"
            ? undefined
            : importHeroAssetAlt.trim() || undefined,
        heroFocalPoint: importHeroFocalPoint,
      };
      previewProfileRef.current = nextPreviewProfile;
      setPreviewProfile(nextPreviewProfile);
      setImportError(null);
      setImportOpen(false);
      setReceiptOpen(false);
      setNotice(
        "New packet loaded with " +
          next.claims.length +
          " unreviewed sentence candidates.",
      );
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const inspectionBay = document.getElementById("inspection-bay");
          inspectionBay?.scrollIntoView({ block: "start" });
          inspectionBay?.focus({ preventScroll: true });
        });
      });
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
        <header className="rail-nav">
          <a className="rail-wordmark" href="#page-top" aria-label="ProofRail, back to top">
            <span aria-hidden="true">PR:</span>
            <strong>ProofRail</strong>
          </a>
          <div className="rail-nav__context" aria-label="Product definition">
            <span>Pre-publication review</span>
            <strong>Marketing + PR</strong>
          </div>
          <div className="rail-nav__actions">
            <button
              className="rail-nav__import"
              onClick={() => {
                setImportError(null);
                setImportOpen(true);
              }}
            >
              Import a draft
            </button>
            <button className="rail-nav__reset" onClick={resetDemo}>
              Reset
            </button>
            <button
              className={`rail-nav__tools tool-status-${toolStatus}`}
              onClick={() => setToolsOpen((current) => !current)}
              aria-expanded={toolsOpen}
              aria-controls="webmcp-tool-drawer"
              aria-label={`${toolsOpen ? "Close" : "Open"} WebMCP tools. ${statusText[toolStatus]}. ${gate.blockers.length} blockers.`}
            >
              <span className="rail-status-dot" aria-hidden="true" />
              <span>{statusText[toolStatus]}</span>
              <strong>{gate.blockers.length}</strong>
            </button>
          </div>
        </header>

        {toolsOpen && (
          <section
            className="rail-tool-drawer"
            id="webmcp-tool-drawer"
            aria-label="ProofRail WebMCP tools"
          >
            <header>
              <div>
                <p>Agent protocol / six tools</p>
                <h2>The agent may prepare. It may never approve.</h2>
              </div>
              <button onClick={() => setToolsOpen(false)} aria-label="Close tools">
                Close ×
              </button>
            </header>
            <div className="rail-tool-index">
              {toolManifest.map((tool, index) => (
                <article key={tool.name}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <code>{tool.name}</code>
                  <p>{tool.description}</p>
                  <em>{tool.kind}</em>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="rail-hero" aria-labelledby="page-title">
          <div className="rail-hero__copy">
            <p className="rail-kicker">
              <span aria-hidden="true" />
              The pre-publication workspace for marketing and PR
            </p>
            <h1 id="page-title">
              <span><span>Your page.</span></span>
              <span><span>Every claim.</span></span>
              <span className="rail-hero__accent"><span>One human gate.</span></span>
            </h1>
            <p className="rail-definition">
              Before your company publishes a launch page, case study, article, or
              report, ProofRail renders the actual audience-facing page. AI checks
              every factual sentence against source evidence and may stage a safer
              revision. A human makes the final call. Until then, publishing stays
              locked.
            </p>
            <div className="rail-hero__definition" aria-label="ProofRail in one line">
              <span>Draft in</span>
              <i aria-hidden="true">→</i>
              <span>Real page preview</span>
              <i aria-hidden="true">→</i>
              <span>Evidence + human approval</span>
              <i aria-hidden="true">→</i>
              <strong>Publish</strong>
            </div>
            <div className="rail-hero__actions">
              <button
                className="rail-button rail-button--light"
                onClick={() => {
                  setImportError(null);
                  setImportOpen(true);
                }}
              >
                Import your draft <span aria-hidden="true">↗</span>
              </button>
              <button
                className="rail-button rail-button--text"
                onClick={() => inspectClaim("claim-04")}
              >
                Turn on proof view <span aria-hidden="true">↗</span>
              </button>
            </div>
            <p className="rail-hero__clarifier">
              This is not a news site and not a CMS. It is the review room used
              immediately before public release.
            </p>
          </div>

          {selectedClaim && (
            <article
              id="inspection-bay"
              className={`rail-preview-stage ${selectedClaimCleared ? "is-cleared" : "is-blocked"}`}
              aria-labelledby="inspection-title"
              tabIndex={-1}
            >
              <header className="rail-preview-stage__head">
                <div>
                  <span>The page your audience would see</span>
                  <strong id="inspection-title">{workspace.title} · live layout</strong>
                </div>
                <div className="rail-preview-stage__gate">
                  <span aria-hidden="true">{gate.status === "pass" ? "✓" : "×"}</span>
                  <div>
                    <strong>{gate.status === "pass" ? "Ready to publish" : "Publish locked"}</strong>
                    <small>
                      {gate.blockers.length}{" "}
                      {gate.blockers.length === 1 ? "blocker" : "blockers"} remain
                    </small>
                  </div>
                </div>
              </header>

              {previewMode === "proof" && (
                <aside className="rail-preview-stage__evidence" aria-live="polite">
                  <div className="rail-preview-stage__claim">
                    <span>C-{selectedClaim.number} · the page says</span>
                    <strong>“{selectedClaim.text}”</strong>
                  </div>
                  <div className="rail-preview-stage__source">
                    <span>{selectedEvidence ? "The attached source says" : "Attached source"}</span>
                    <strong>
                      {selectedEvidence
                        ? `“${selectedEvidence.excerpt}”`
                        : "No usable source is attached."}
                    </strong>
                  </div>
                  <div className="rail-preview-stage__decision">
                    {selectedClaim.proposal?.status === "staged" ? (
                      <>
                        <span>AI proposal · human decision required</span>
                        <div>
                          <button onClick={() => decideSelected("reject")}>Reject</button>
                          <button onClick={() => decideSelected("approve")}>Approve wording</button>
                        </div>
                      </>
                    ) : selectedClaimCleared ? (
                      <strong className="rail-approved">Human approved · claim cleared</strong>
                    ) : selectedClaim.state === "supported" && selectedEvidence ? (
                      <button onClick={approveSelectedEvidence}>Approve evidence + wording</button>
                    ) : selectedResolution ? (
                      <button onClick={() => stageDemoResolution(selectedClaim)}>
                        Prepare evidence-safe wording <span aria-hidden="true">→</span>
                      </button>
                    ) : (
                      <strong>Proof must be attached before approval.</strong>
                    )}
                  </div>
                </aside>
              )}

              <PublicationPreview
                workspace={workspace}
                profile={previewProfile}
                selectedClaimId={selectedClaimId}
                variant={previewVariant}
                mode={previewMode}
                size="hero"
                onVariantChange={setPreviewVariant}
                onModeChange={setPreviewMode}
                onTypeChange={switchPublicationType}
                onDirectionChange={(direction) =>
                  setPreviewProfile((current) => {
                    const next = { ...current, direction };
                    previewProfileRef.current = next;
                    return next;
                  })
                }
                onSelectClaim={inspectClaim}
              />
            </article>
          )}
        </section>

        {notice && (
          <div className="rail-notice" role="status">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} aria-label="Dismiss message">×</button>
          </div>
        )}

        <section className="rail-method" aria-labelledby="method-title">
          <header className="rail-section-head">
            <p>One source in. A defensible publication out.</p>
            <h2 id="method-title">The logic, without the AI theatre.</h2>
          </header>
          <div className="rail-method__grid">
            <article tabIndex={0}>
              <span className="rail-method__index">01 / Import</span>
              <h3>One draft. Four real layouts.</h3>
              <p>Paste the copy once. ProofRail renders it as the publication you selected.</p>
              <div className="rail-diagram rail-diagram--formats" aria-hidden="true">
                <span className="rail-source-sheet">TXT</span>
                <i />
                <div>
                  <span>LAUNCH</span><span>PROJECT</span><span>BLOG</span><span>REPORT</span>
                </div>
              </div>
            </article>
            <article tabIndex={0}>
              <span className="rail-method__index">02 / AI check</span>
              <h3>Evidence lines. Not confidence scores.</h3>
              <p>Each factual sentence must lead to a dated source that actually supports it.</p>
              <div className="rail-diagram rail-diagram--evidence" aria-hidden="true">
                <span>CLAIM C-04</span><i /><b>×</b><i /><span>SOURCE</span>
              </div>
            </article>
            <article tabIndex={0}>
              <span className="rail-method__index">03 / Human gate</span>
              <h3>AI proposes. People approve.</h3>
              <p>The model can narrow wording. Only a visible human action can release it.</p>
              <div className="rail-diagram rail-diagram--gate" aria-hidden="true">
                <span>DRAFT</span><i /><span>AI</span><i /><b>HUMAN</b><i /><span>PUBLISH</span>
              </div>
            </article>
          </div>
        </section>

        <section className="rail-workspace" id="workspace" aria-labelledby="workspace-title">
          <header className="rail-section-head rail-section-head--workspace">
            <p>Live review workspace</p>
            <h2 id="workspace-title">Select a sentence. See the proof. Make the call.</h2>
            <span>
              This is the actual app: the preview above and every control below share
              the same live draft state.
            </span>
          </header>

          <div className="rail-workspace__grid">
            <nav className="rail-claims" aria-label="Claims in this publication">
              <header>
                <span>Claim index</span>
                <strong>{workspace.claims.length} sentences</strong>
              </header>
              <div>
                {workspace.claims.map((claim) => {
                  const blocker = gate.blockers.find((item) => item.claimId === claim.id);
                  const cleared = !blocker;
                  return (
                    <button
                      key={claim.id}
                      className={`${cleared ? "is-clear" : "is-blocked"}${selectedClaimId === claim.id ? " is-active" : ""}`}
                      onClick={() => inspectClaim(claim.id)}
                      aria-pressed={selectedClaimId === claim.id}
                      aria-controls="inspection-bay"
                    >
                      <span>C-{claim.number}</span>
                      <strong>{claim.text}</strong>
                      <small>
                        {claim.proposal?.status === "staged"
                          ? "AI wording staged · human decision open"
                          : blocker?.code === "HUMAN_APPROVAL_REQUIRED"
                            ? "Source attached · human approval open"
                            : cleared
                              ? "Cleared"
                              : blocker?.detail ?? claim.label}
                      </small>
                    </button>
                  );
                })}
              </div>
            </nav>

            {selectedClaim && (
              <article className="rail-dossier" aria-live="polite">
                <header>
                  <div>
                    <span>Evidence dossier / C-{selectedClaim.number}</span>
                    <strong>{selectedClaim.risk} risk · {selectedClaim.location}</strong>
                  </div>
                  <em>{selectedClaimCleared ? "CLEARED" : "BLOCKED"}</em>
                </header>
                <div className="rail-dossier__claim">
                  <span>Public wording</span>
                  <blockquote>“{selectedClaim.text}”</blockquote>
                </div>
                <div className="rail-dossier__proof">
                  <span>Attached proof</span>
                  {selectedEvidence ? (
                    <>
                      <strong>{selectedEvidence.title}</strong>
                      <blockquote>“{selectedEvidence.excerpt}”</blockquote>
                      <small>
                        {selectedEdge?.relation.toUpperCase() ?? "UNLINKED"} · {selectedEvidence.sourceType.replaceAll("-", " ")} · {selectedEvidence.publishedAt}
                      </small>
                    </>
                  ) : (
                    <strong>No source attached. The release gate fails closed.</strong>
                  )}
                </div>
                {selectedClaim.proposal && (
                  <div className="rail-dossier__proposal">
                    <span>AI proposal · not approved</span>
                    <p>{selectedClaim.proposal.after}</p>
                    <small>{selectedClaim.proposal.rationale}</small>
                  </div>
                )}
                <div className="rail-dossier__actions">
                  {selectedClaim.proposal?.status === "staged" ? (
                    <>
                      <button onClick={() => decideSelected("reject")}>Reject proposal</button>
                      <button className="is-primary" onClick={() => decideSelected("approve")}>
                        Approve exact wording
                      </button>
                    </>
                  ) : selectedClaimCleared ? (
                    <strong className="rail-approved">Human approved · audit event recorded</strong>
                  ) : selectedClaim.state === "supported" && selectedEvidence ? (
                    <button className="is-primary" onClick={approveSelectedEvidence}>
                      Approve evidence + wording
                    </button>
                  ) : selectedResolution ? (
                    <button className="is-primary" onClick={() => stageDemoResolution(selectedClaim)}>
                      Stage evidence-safe wording
                    </button>
                  ) : (
                    <strong>Agent action required: attach qualifying proof.</strong>
                  )}
                </div>
              </article>
            )}

            <aside
              className={`rail-gate ${gate.status === "pass" ? "is-pass" : "is-blocked"}`}
              aria-labelledby="release-title"
            >
              <header>
                <p>04 / Publish gate</p>
                <h3 id="release-title">
                  {gate.status === "pass" ? "Release cleared." : "Publication locked."}
                </h3>
              </header>
              <dl>
                <div><dt>Cleared</dt><dd>{gate.releasableClaims}</dd></div>
                <div><dt>Blocked</dt><dd>{gate.blockers.length}</dd></div>
                <div><dt>Human calls</dt><dd>{gate.openHumanDecisions}</dd></div>
              </dl>
              {gate.blockers.length > 0 ? (
                <ol>
                  {gate.blockers.slice(0, 4).map((blocker) => {
                    const claim = workspace.claims.find((candidate) => candidate.id === blocker.claimId);
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
                <div className="rail-gate__ready">
                  <strong>All claims cleared.</strong>
                  <p>Final wording, sources, decisions, revision, and hash can be sealed.</p>
                </div>
              )}
              <button
                className="rail-gate__seal"
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

        <section className="rail-ledger" aria-label="Decision log">
          <details>
            <summary>
              <span>Audit ledger / current workspace</span>
              <strong>{workspace.audit.length} recorded events</strong>
              <em>Open ledger +</em>
            </summary>
            <ol>
              {workspace.audit
                .slice()
                .reverse()
                .slice(0, 8)
                .map((event) => (
                  <li key={event.id}>
                    <span>{event.actor}</span>
                    <div>
                      <strong>{event.action.replaceAll("_", " ")}</strong>
                      <p>{event.detail}</p>
                    </div>
                    <span>R{event.workspaceRevision}</span>
                  </li>
                ))}
            </ol>
          </details>
        </section>

        <footer className="rail-footer">
          <strong>ProofRail does not decide truth.</strong>
          <p>
            It makes the page, evidence gaps, revisions, and human decisions visible
            before anything becomes public.
          </p>
          <span>Local-first challenge prototype · no account · no API key · no hidden approval</span>
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
            <section className="import-section" aria-labelledby="import-format-title">
              <div className="import-section__head">
                <span>01</span>
                <div>
                  <h3 id="import-format-title">What should the public page feel like?</h3>
                  <p>Format changes the information architecture. Direction changes the brand tone.</p>
                </div>
              </div>
              <div className="import-grid">
                <label>
                  Publication format
                  <select
                    value={importPublicationType}
                    onChange={(event) =>
                      setImportPublicationType(event.target.value as PublicationType)
                    }
                  >
                    <option value="launch-page">Product launch</option>
                    <option value="project-page">Project / case study</option>
                    <option value="blog-post">Blog / journal article</option>
                    <option value="report">Research report</option>
                  </select>
                </label>
                <label>
                  Art direction
                  <select
                    value={importDirection}
                    onChange={(event) =>
                      setImportDirection(event.target.value as BrandDirection)
                    }
                  >
                    <option value="precision">Precision tech</option>
                    <option value="editorial">Editorial human</option>
                    <option value="institutional">Institutional</option>
                    <option value="kinetic">Bold consumer</option>
                  </select>
                </label>
                <label>
                  Brand / company
                  <input
                    value={importBrandName}
                    maxLength={80}
                    onChange={(event) => setImportBrandName(event.target.value)}
                  />
                </label>
                <label>
                  {subjectLabels[importPublicationType]}
                  <input
                    value={importSubjectName}
                    maxLength={100}
                    onChange={(event) => setImportSubjectName(event.target.value)}
                  />
                </label>
                <label>
                  Industry / subject
                  <input
                    value={importIndustry}
                    maxLength={80}
                    onChange={(event) => setImportIndustry(event.target.value)}
                  />
                </label>
                <label>
                  Primary audience
                  <input
                    value={importAudience}
                    maxLength={100}
                    onChange={(event) => setImportAudience(event.target.value)}
                  />
                </label>
                <label>
                  {authorLabels[importPublicationType]}
                  <input
                    value={importAuthor}
                    maxLength={100}
                    onChange={(event) => setImportAuthor(event.target.value)}
                  />
                </label>
                <label>
                  Publication date / version
                  <input
                    value={importPublishedLabel}
                    maxLength={80}
                    onChange={(event) => setImportPublishedLabel(event.target.value)}
                  />
                </label>
                {importPublicationType !== "report" && (
                  <label>
                    Primary CTA
                    <input
                      value={importCtaLabel}
                      maxLength={60}
                      onChange={(event) => setImportCtaLabel(event.target.value)}
                    />
                  </label>
                )}
                {importPublicationType !== "report" && (
                  <>
                    <label className="import-file">
                      Real hero / product asset (optional)
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
                        onChange={(event) => loadHeroAsset(event.target.files?.[0])}
                      />
                      <small>
                        {importHeroAssetUrl
                          ? "Image loaded locally for this preview."
                          : "No stock image is invented. Without an asset, ProofRail uses a typographic direction."}
                      </small>
                    </label>
                    <label>
                      Hero image description (alt text)
                      <input
                        value={importHeroAssetAlt}
                        maxLength={180}
                        onChange={(event) => setImportHeroAssetAlt(event.target.value)}
                        placeholder="Describe the image only; do not add a new claim"
                      />
                    </label>
                    <label>
                      Image focus
                      <select
                        value={importHeroFocalPoint}
                        onChange={(event) =>
                          setImportHeroFocalPoint(event.target.value as HeroFocalPoint)
                        }
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </label>
                  </>
                )}
              </div>
            </section>

            <section className="import-section" aria-labelledby="import-copy-title">
              <div className="import-section__head">
                <span>02</span>
                <div>
                  <h3 id="import-copy-title">What exactly are you claiming?</h3>
                  <p>Every complete public sentence becomes an exact review span.</p>
                </div>
              </div>
              <div className="import-grid import-grid--copy">
                <label>
                  Internal packet title
                  <input
                    value={importTitle}
                    maxLength={120}
                    onChange={(event) => setImportTitle(event.target.value)}
                  />
                </label>
                <label>
                  Public headline
                  <input
                    value={importHeadline}
                    maxLength={180}
                    onChange={(event) => setImportHeadline(event.target.value)}
                  />
                </label>
                <label className="import-copy-field">
                  Public body copy
                  <textarea
                    value={importDraft}
                    maxLength={8000}
                    rows={9}
                    onChange={(event) => setImportDraft(event.target.value)}
                  />
                </label>
              </div>
            </section>
            {importError && (
              <p className="import-error" id="import-error" role="alert">
                {importError}
              </p>
            )}
            <p className="import-note">
              The public view stays clean. The proof overlay exposes exact claims,
              evidence, staged wording and the human decision boundary. A WebMCP
              agent can submit deliberate risk levels through
              <code> replace_review_packet</code> but cannot approve them.
              Put every factual statement in the public headline or body; profile
              fields are short layout metadata, not a path around the proof gate.
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
