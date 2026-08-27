"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  approveClaimEvidence,
  attachEvidence,
  candidateClaimsFromDraft,
  createEmptyWorkspace,
  createProofRailSelfDemoWorkspace,
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
  createSourceOnlyPublicationBrief,
  publicationStructureClaimTargets,
  type SourceOnlyPublicationStructure,
} from "../lib/publication-brief";
import {
  MAX_HERO_ASSET_BYTES,
  attachUploadedHeroAsset,
  extractPublicationText,
  validatePublicationUrl,
} from "../lib/publication-import";
import type {
  BrandDirection,
  PreviewProfile,
} from "./preview-profile";
import { EmptyStudio } from "./empty-studio";
import { ReleaseReadiness } from "./release-readiness";
import { ReviewStudio } from "./review-studio";

type ToolStatus = "checking" | "registered" | "unsupported" | "error";
type ImportSourceMode = "text" | "url" | "file";

type ImportedTextFile = {
  fileName: string;
  mediaType: string;
  sha256: string;
};

type ImportedHeroAsset = {
  fileName: string;
  mediaType: string;
  dataUrl: string;
  width: number;
  height: number;
  sha256: string;
};

type ImportStructureKey =
  | "deck"
  | "productName"
  | "positioning"
  | "featureTitle"
  | "featureBody"
  | "benefitTitle"
  | "benefitBody"
  | "useCaseAudience"
  | "useCaseOutcome"
  | "availability"
  | "pricingOrAccess"
  | "client"
  | "project"
  | "roles"
  | "scope"
  | "challenge"
  | "insight"
  | "approach"
  | "systemTitle"
  | "systemBody"
  | "implementationTitle"
  | "implementationBody"
  | "outcomes"
  | "credits"
  | "publication"
  | "category"
  | "thesis"
  | "pullQuote"
  | "pullQuoteAttribution"
  | "institution"
  | "edition"
  | "abstract"
  | "executiveSummary"
  | "findings"
  | "methodology"
  | "limitations";

type ImportStructureFields = Record<ImportStructureKey, string>;

const emptyImportStructure: ImportStructureFields = {
  deck: "",
  productName: "",
  positioning: "",
  featureTitle: "",
  featureBody: "",
  benefitTitle: "",
  benefitBody: "",
  useCaseAudience: "",
  useCaseOutcome: "",
  availability: "",
  pricingOrAccess: "",
  client: "",
  project: "",
  roles: "",
  scope: "",
  challenge: "",
  insight: "",
  approach: "",
  systemTitle: "",
  systemBody: "",
  implementationTitle: "",
  implementationBody: "",
  outcomes: "",
  credits: "",
  publication: "",
  category: "",
  thesis: "",
  pullQuote: "",
  pullQuoteAttribution: "",
  institution: "",
  edition: "",
  abstract: "",
  executiveSummary: "",
  findings: "",
  methodology: "",
  limitations: "",
};

function optionalImportValue(value: string): string | undefined {
  return value.trim() || undefined;
}

function importPublicationStructure(
  publicationType: PublicationType,
  fields: ImportStructureFields,
): SourceOnlyPublicationStructure {
  const common = { deck: optionalImportValue(fields.deck) };
  switch (publicationType) {
    case "launch-page":
      return {
        ...common,
        launch: {
          productName: optionalImportValue(fields.productName),
          positioning: optionalImportValue(fields.positioning),
          featureTitle: optionalImportValue(fields.featureTitle),
          featureBody: optionalImportValue(fields.featureBody),
          benefitTitle: optionalImportValue(fields.benefitTitle),
          benefitBody: optionalImportValue(fields.benefitBody),
          useCaseAudience: optionalImportValue(fields.useCaseAudience),
          useCaseOutcome: optionalImportValue(fields.useCaseOutcome),
          availability: optionalImportValue(fields.availability),
          pricingOrAccess: optionalImportValue(fields.pricingOrAccess),
        },
      };
    case "project-page":
      return {
        ...common,
        caseStudy: {
          client: optionalImportValue(fields.client),
          project: optionalImportValue(fields.project),
          roles: optionalImportValue(fields.roles),
          scope: optionalImportValue(fields.scope),
          challenge: optionalImportValue(fields.challenge),
          insight: optionalImportValue(fields.insight),
          approach: optionalImportValue(fields.approach),
          systemTitle: optionalImportValue(fields.systemTitle),
          systemBody: optionalImportValue(fields.systemBody),
          implementationTitle: optionalImportValue(fields.implementationTitle),
          implementationBody: optionalImportValue(fields.implementationBody),
          outcomes: optionalImportValue(fields.outcomes),
          credits: optionalImportValue(fields.credits),
        },
      };
    case "blog-post":
      return {
        ...common,
        article: {
          publication: optionalImportValue(fields.publication),
          category: optionalImportValue(fields.category),
          thesis: optionalImportValue(fields.thesis),
          pullQuote: optionalImportValue(fields.pullQuote),
          pullQuoteAttribution: optionalImportValue(fields.pullQuoteAttribution),
        },
      };
    case "report":
      return {
        ...common,
        report: {
          institution: optionalImportValue(fields.institution),
          edition: optionalImportValue(fields.edition),
          abstract: optionalImportValue(fields.abstract),
          executiveSummary: optionalImportValue(fields.executiveSummary),
          findings: optionalImportValue(fields.findings),
          methodology: optionalImportValue(fields.methodology),
          limitations: optionalImportValue(fields.limitations),
        },
      };
  }
}

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

const selfDemoPreviewProfile: PreviewProfile = {
  brandName: "ProofRail",
  direction: "precision",
  industry: "Publication governance",
  audience: "Marketing and PR teams",
  author: "ProofRail product team",
  publishedLabel: "August 27, 2026",
  ctaLabel: "Review the release",
  subjectName: "ProofRail",
  heroFocalPoint: "center",
};

const authorLabels: Record<PublicationType, string> = {
  "launch-page": "Launch owner / team",
  "project-page": "Studio / project author",
  "blog-post": "Article author",
  report: "Author / institution",
};

type StructureFieldDefinition = {
  key: ImportStructureKey;
  label: string;
  placeholder: string;
  multiline?: boolean;
};

const commonStructureField: StructureFieldDefinition = {
  key: "deck",
  label: "Deck / standfirst",
  placeholder: "Exact supporting line from the source publication",
};

const structureFieldsByType: Record<
  PublicationType,
  readonly StructureFieldDefinition[]
> = {
  "launch-page": [
    { key: "productName", label: "Product name", placeholder: "Real public product name" },
    { key: "positioning", label: "Positioning", placeholder: "Exact supplied positioning line" },
    { key: "featureTitle", label: "Feature chapter heading", placeholder: "Exact supplied heading" },
    { key: "featureBody", label: "Feature chapter body", placeholder: "Source-backed feature explanation", multiline: true },
    { key: "benefitTitle", label: "Benefit chapter heading", placeholder: "Exact supplied heading" },
    { key: "benefitBody", label: "Benefit chapter body", placeholder: "Only a benefit supported by the source", multiline: true },
    { key: "useCaseAudience", label: "Use-case audience", placeholder: "Real audience" },
    { key: "useCaseOutcome", label: "Use-case outcome", placeholder: "Source-backed outcome" },
    { key: "availability", label: "Availability", placeholder: "Verified availability statement" },
    { key: "pricingOrAccess", label: "Pricing / access", placeholder: "Verified pricing or access statement" },
  ],
  "project-page": [
    { key: "client", label: "Client", placeholder: "Real client name" },
    { key: "project", label: "Project", placeholder: "Real project name" },
    { key: "roles", label: "Roles", placeholder: "One documented role per line", multiline: true },
    { key: "scope", label: "Scope", placeholder: "One documented scope item per line", multiline: true },
    { key: "challenge", label: "Challenge", placeholder: "Exact source-backed challenge", multiline: true },
    { key: "insight", label: "Insight", placeholder: "Exact supplied insight", multiline: true },
    { key: "approach", label: "Approach", placeholder: "Exact supplied approach", multiline: true },
    { key: "systemTitle", label: "System-in-use heading", placeholder: "Exact supplied heading" },
    { key: "systemBody", label: "System in use", placeholder: "Evidence of the system in use", multiline: true },
    { key: "implementationTitle", label: "Implementation heading", placeholder: "Exact supplied heading" },
    { key: "implementationBody", label: "Implementation detail", placeholder: "Documented implementation detail", multiline: true },
    { key: "outcomes", label: "Outcomes", placeholder: "One sourced outcome per line", multiline: true },
    { key: "credits", label: "Credits", placeholder: "One real credit per line", multiline: true },
  ],
  "blog-post": [
    { key: "publication", label: "Publication / masthead", placeholder: "Real publication name" },
    { key: "category", label: "Editorial category", placeholder: "Real category" },
    { key: "thesis", label: "Thesis", placeholder: "Exact human-identified thesis", multiline: true },
    { key: "pullQuote", label: "Pull quote", placeholder: "Exact quote from supplied copy", multiline: true },
    { key: "pullQuoteAttribution", label: "Quote attribution", placeholder: "Real attribution" },
  ],
  report: [
    { key: "institution", label: "Issuing institution", placeholder: "Real institution" },
    { key: "edition", label: "Edition / version", placeholder: "Exact edition or version" },
    { key: "abstract", label: "Abstract", placeholder: "Supplied abstract", multiline: true },
    { key: "executiveSummary", label: "Executive summary", placeholder: "Supplied executive summary", multiline: true },
    { key: "findings", label: "Numbered findings", placeholder: "One per line: Finding title | Exact context", multiline: true },
    { key: "methodology", label: "Methodology", placeholder: "Documented methodology", multiline: true },
    { key: "limitations", label: "Limitations", placeholder: "Documented limitations and caveats", multiline: true },
  ],
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
    brandName: profile?.brandName?.trim() || "Not provided",
    direction: profile?.direction ?? "precision",
    industry: profile?.industry?.trim() || "Not provided",
    audience: profile?.audience?.trim() || "Not provided",
    author: profile?.author?.trim() || "Not provided",
    publishedLabel: profile?.publishedLabel?.trim() || "Not provided",
    ctaLabel: profile?.ctaLabel?.trim() || "Not provided",
    subjectName: profile?.subjectName?.trim() || undefined,
    heroFocalPoint: "center",
  };
}

function reviewContextSnapshot(
  workspace: Workspace,
  presentationProfile: PreviewProfile,
) {
  const gate = verifyReleaseGate(workspace);
  const safePresentationProfile = {
    brandName: presentationProfile.brandName,
    direction: presentationProfile.direction,
    industry: presentationProfile.industry,
    audience: presentationProfile.audience,
    author: presentationProfile.author,
    publishedLabel: presentationProfile.publishedLabel,
    ctaLabel: presentationProfile.ctaLabel,
    subjectName: presentationProfile.subjectName,
    heroAsset: {
      present: Boolean(presentationProfile.heroAssetUrl),
      alt: presentationProfile.heroAssetAlt,
      focalPoint: presentationProfile.heroFocalPoint,
    },
  };
  return {
    workspace: {
      id: workspace.id,
      publicationType: workspace.publicationType,
      title: workspace.title,
      headline: workspace.headline,
      draftText: workspace.draftText,
      revision: workspace.revision,
    },
    presentationProfile: safePresentationProfile,
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
    receipt: (workspace.receipt ?? workspace.invalidatedReceipt)
      ? {
          status: workspace.receipt ? "current" : "invalidated",
          receiptId: (workspace.receipt ?? workspace.invalidatedReceipt)!.receiptId,
          sourceWorkspaceRevision: (workspace.receipt ?? workspace.invalidatedReceipt)!
            .sourceWorkspaceRevision,
          contentHash: (workspace.receipt ?? workspace.invalidatedReceipt)!.contentHash,
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

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("FILE_READ_FAILED: image did not produce a data URL."));
    });
    reader.addEventListener("error", () =>
      reject(new Error("FILE_READ_FAILED: image bytes could not be read.")),
    );
    reader.readAsDataURL(file);
  });
}

function imageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () =>
      resolve({ width: image.naturalWidth, height: image.naturalHeight }),
    );
    image.addEventListener("error", () =>
      reject(new Error("INVALID_IMAGE_BYTES: the selected image cannot be decoded.")),
    );
    image.src = dataUrl;
  });
}

function publicationFileMediaType(file: File): string {
  const declared = file.type.split(";", 1)[0]?.toLowerCase();
  if (["text/plain", "text/markdown", "text/x-markdown", "text/html", "application/xhtml+xml"].includes(declared)) {
    return declared;
  }
  const name = file.name.toLowerCase();
  if (name.endsWith(".html") || name.endsWith(".htm")) return "text/html";
  if (name.endsWith(".md") || name.endsWith(".markdown")) return "text/markdown";
  if (name.endsWith(".txt")) return "text/plain";
  throw new Error("UNSUPPORTED_PUBLICATION_FILE: use TXT, Markdown, or HTML.");
}

export function ProofRailApp({ initialDemo = false }: { initialDemo?: boolean }) {
  const [workspace, setWorkspace] = useState<Workspace>(() =>
    initialDemo ? createProofRailSelfDemoWorkspace() : createEmptyWorkspace(),
  );
  const workspaceRef = useRef(workspace);
  const [selectedClaimId, setSelectedClaimId] = useState("");
  const [toolStatus, setToolStatus] = useState<ToolStatus>("checking");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptPending, setReceiptPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSourceMode, setImportSourceMode] =
    useState<ImportSourceMode>("text");
  const [importSourceUrl, setImportSourceUrl] = useState("");
  const [importTextMediaType, setImportTextMediaType] =
    useState<"text/plain" | "text/markdown" | "text/html">("text/plain");
  const [importedTextFile, setImportedTextFile] =
    useState<ImportedTextFile | null>(null);
  const importDialogRef = useRef<HTMLElement>(null);
  const receiptDialogRef = useRef<HTMLElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const [importTitle, setImportTitle] = useState("");
  const [importHeadline, setImportHeadline] = useState("");
  const [importPublicationType, setImportPublicationType] =
    useState<PublicationType>("project-page");
  const [importDraft, setImportDraft] = useState("");
  const [previewVariant, setPreviewVariant] =
    useState<PublicationPreviewVariant>("current");
  const [previewMode, setPreviewMode] = useState<"public" | "proof">("public");
  const [previewProfile, setPreviewProfile] =
    useState<PreviewProfile>(selfDemoPreviewProfile);
  const previewProfileRef = useRef(previewProfile);
  const [importBrandName, setImportBrandName] = useState("");
  const [importAudience, setImportAudience] = useState("");
  const [importAuthor, setImportAuthor] = useState("");
  const [importPublishedLabel, setImportPublishedLabel] = useState("");
  const [importCtaLabel, setImportCtaLabel] = useState("");
  const [importHeroAsset, setImportHeroAsset] =
    useState<ImportedHeroAsset | null>(null);
  const [importHeroAssetAlt, setImportHeroAssetAlt] = useState("");
  const [importStructure, setImportStructure] =
    useState<ImportStructureFields>(emptyImportStructure);

  function updateImportStructure(key: ImportStructureKey, value: string) {
    setImportStructure((current) => ({ ...current, [key]: value }));
  }

  const commit = useCallback((transition: (current: Workspace) => Workspace) => {
    const next = transition(workspaceRef.current);
    workspaceRef.current = next;
    setWorkspace(next);
    return next;
  }, []);

  const selectedClaim =
    workspace.claims.find((claim) => claim.id === selectedClaimId) ??
    workspace.claims[0];
  const displayedReceipt = workspace.receipt ?? workspace.invalidatedReceipt;
  const receiptModalOpen = receiptOpen && Boolean(displayedReceipt);
  const importModalOpen = importOpen && !receiptModalOpen;

  useEffect(() => {
    if (!importModalOpen && !receiptModalOpen) return;

    const dialog = receiptModalOpen
      ? receiptDialogRef.current
      : importDialogRef.current;
    if (!dialog) return;
    const activeDialog = dialog;

    const activeElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lastFocusedRef.current =
      receiptModalOpen && (!activeElement || activeElement === document.body)
        ? document.querySelector<HTMLElement>('[data-receipt-trigger="true"]')
        : activeElement;
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
      queueMicrotask(() => {
        const returnTarget = lastFocusedRef.current?.isConnected
          ? lastFocusedRef.current
          : document.querySelector<HTMLElement>('[data-receipt-trigger="true"]');
        returnTarget?.focus();
      });
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
            publicationBrief: createSourceOnlyPublicationBrief({
              publicationType: toolInput.publicationType,
              organization: toolInput.presentationProfile?.brandName,
              title: toolInput.title,
              headline: toolInput.headline,
              body: toolInput.draftText,
              author: toolInput.presentationProfile?.author,
              audience: toolInput.presentationProfile?.audience,
              publishedLabel: toolInput.presentationProfile?.publishedLabel,
              cta: toolInput.presentationProfile?.ctaLabel,
              inputMethod: "form",
              sourceActor: "agent",
            }),
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
    const next = createProofRailSelfDemoWorkspace();
    workspaceRef.current = next;
    setWorkspace(next);
    setSelectedClaimId("claim-01");
    setPreviewVariant("current");
    setPreviewMode("public");
    previewProfileRef.current = selfDemoPreviewProfile;
    setPreviewProfile(selfDemoPreviewProfile);
    setReceiptOpen(false);
    setNotice("Verified ProofRail self-demo loaded at revision 7.");
  }

  function startNewReview() {
    const next = createEmptyWorkspace();
    workspaceRef.current = next;
    setWorkspace(next);
    setSelectedClaimId("");
    setPreviewVariant("current");
    setPreviewMode("public");
    setReceiptOpen(false);
    setNotice(null);
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

  async function loadHeroAsset(file?: File) {
    if (!file) {
      setImportHeroAsset(null);
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setImportError("Hero asset must be PNG, JPEG, or WebP.");
      return;
    }
    if (file.size > MAX_HERO_ASSET_BYTES) {
      setImportError(
        `Hero asset must be ${Math.floor(MAX_HERO_ASSET_BYTES / 1_000_000)}.5 MB or smaller.`,
      );
      return;
    }
    try {
      const bytes = await file.arrayBuffer();
      const dataUrl = await readFileAsDataUrl(file);
      const dimensions = await imageDimensions(dataUrl);
      setImportHeroAsset({
        fileName: file.name,
        mediaType: file.type,
        dataUrl,
        ...dimensions,
        sha256: await sha256Hex(bytes),
      });
      setImportError(null);
    } catch (error) {
      setImportHeroAsset(null);
      setImportError(
        error instanceof Error ? error.message : "The image could not be inspected.",
      );
    }
  }

  async function loadPublicationFile(file?: File) {
    if (!file) {
      setImportedTextFile(null);
      return;
    }
    try {
      const mediaType = publicationFileMediaType(file);
      const bytes = await file.arrayBuffer();
      const text = new TextDecoder().decode(bytes);
      const extracted = extractPublicationText(text, mediaType);
      setImportDraft(extracted);
      setImportedTextFile({
        fileName: file.name,
        mediaType,
        sha256: await sha256Hex(bytes),
      });
      setImportError(null);
    } catch (error) {
      setImportedTextFile(null);
      setImportError(
        error instanceof Error ? error.message : "The publication file could not be read.",
      );
    }
  }

  function stageDemoResolution(claim: ReviewClaim) {
    if (workspaceRef.current.id !== "workspace-proofrail-self-demo") {
      setNotice(
        "SELF_DEMO_ONLY: no ProofRail example wording may be staged in an imported publication.",
      );
      return;
    }
    const resolution = demoResolutions[claim.id];
    if (!resolution) return;
    try {
      const next = commit((current) => {
        if (current.id !== "workspace-proofrail-self-demo") {
          throw new Error(
            "SELF_DEMO_ONLY: imported publications cannot receive ProofRail example wording.",
          );
        }
        return stageResolutionBatch(
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
        );
      });
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
    if (!selectedClaim?.proposal || selectedClaim.proposal.status !== "staged") return;
    const expectedWorkspaceRevision = workspace.revision;
    const expectedClaimRevision = selectedClaim.revision;
    const expectedProposalId = selectedClaim.proposal.id;
    try {
      const next = commit((current) =>
        decideProposal(current, {
          claimId: selectedClaim.id,
          decision,
          expectedWorkspaceRevision,
          expectedClaimRevision,
          expectedProposalId,
        }),
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
    const expectedWorkspaceRevision = workspace.revision;
    const expectedClaimRevision = selectedClaim.revision;
    try {
      commit((current) =>
        approveClaimEvidence(current, {
          claimId: selectedClaim.id,
          expectedWorkspaceRevision,
          expectedClaimRevision,
        }),
      );
      setNotice(
        "Human approval recorded for the linked evidence and current wording.",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to approve evidence.");
    }
  }

  async function loadImportedPacket() {
    setImportError(null);
    const expectedWorkspaceRevision = workspaceRef.current.revision;
    let normalizedDraft: string;
    let sourcePublicUrl: string | undefined;

    try {
      if (importSourceMode === "url") {
        const validated = validatePublicationUrl(importSourceUrl);
        let response: Response;
        try {
          response = await fetch(validated.url, {
            headers: {
              Accept: "text/html, text/plain, text/markdown;q=0.9",
            },
            credentials: "omit",
            redirect: "follow",
          });
        } catch {
          throw new Error(
            "URL_IMPORT_BLOCKED: the source could not be fetched in this browser, usually because the site blocks cross-origin reads. Paste the HTML or upload a file instead.",
          );
        }
        if (!response.ok) {
          throw new Error(`URL_IMPORT_FAILED: source returned HTTP ${response.status}.`);
        }
        const mediaType =
          response.headers.get("content-type")?.split(";", 1)[0]?.toLowerCase() ||
          "text/html";
        normalizedDraft = extractPublicationText(await response.text(), mediaType);
        sourcePublicUrl = validatePublicationUrl(response.url || validated.url).url;
      } else {
        if (importSourceMode === "file" && !importedTextFile) {
          throw new Error("PUBLICATION_FILE_REQUIRED: choose a TXT, Markdown, or HTML file.");
        }
        normalizedDraft = extractPublicationText(
          importDraft,
          importSourceMode === "file"
            ? importedTextFile!.mediaType
            : importTextMediaType,
        );
      }
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Unable to read the publication source.",
      );
      return;
    }

    const structuredPublication = importPublicationStructure(
      importPublicationType,
      importStructure,
    );
    let candidates: string[];
    let reviewDraftText: string;
    const structuredClaimTargets = new Map<string, string>();
    try {
      const sourceCandidates = candidateClaimsFromDraft(normalizedDraft);
      const seenCandidates = new Set(sourceCandidates);
      const structuredCandidates = publicationStructureClaimTargets(
        importPublicationType,
        structuredPublication,
      )
        .flatMap(({ text, targetId }) =>
          candidateClaimsFromDraft(text).map((candidate) => ({
            text: candidate,
            targetId,
          })),
        )
        .filter((candidate) => {
          if (seenCandidates.has(candidate.text)) return false;
          seenCandidates.add(candidate.text);
          return true;
        });
      reviewDraftText = [
        normalizedDraft,
        ...structuredCandidates.map((candidate) => candidate.text),
      ]
        .filter(Boolean)
        .join("\n\n");
      candidates = candidateClaimsFromDraft(reviewDraftText);
      for (const candidate of structuredCandidates) {
        structuredClaimTargets.set(candidate.text, candidate.targetId);
      }
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
      const recordedAt = new Date().toISOString();
      const provenanceId = `source-${importSourceMode}-r${expectedWorkspaceRevision + 1}`;
      let publicationBrief = createSourceOnlyPublicationBrief({
        publicationType: importPublicationType,
        organization: importBrandName.trim() || undefined,
        title: importTitle,
        headline: importHeadline,
        body: normalizedDraft,
        author: importAuthor.trim() || undefined,
        audience: importAudience.trim() || undefined,
        publishedLabel: importPublishedLabel.trim() || undefined,
        cta:
          importPublicationType === "report"
            ? undefined
            : importCtaLabel.trim() || undefined,
        recordedAt,
        provenanceId,
        inputMethod:
          importSourceMode === "url"
            ? "url-import"
            : importTextMediaType === "text/html"
              ? "html"
              : "text",
        publicUrl: sourcePublicUrl,
        uploadedFile:
          importSourceMode === "file" && importedTextFile
            ? {
                fileName: importedTextFile.fileName,
                mediaType: importedTextFile.mediaType,
                sha256: importedTextFile.sha256,
              }
            : undefined,
        structure: structuredPublication,
      });

      if (importHeroAsset) {
        if (!importHeroAssetAlt.trim()) {
          throw new Error(
            "HERO_ALT_REQUIRED: describe the uploaded image before adding it to the publication.",
          );
        }
        publicationBrief = await attachUploadedHeroAsset(publicationBrief, {
          assetId: `uploaded-hero-r${expectedWorkspaceRevision + 1}`,
          provenanceId: `uploaded-hero-source-r${expectedWorkspaceRevision + 1}`,
          provenanceLabel: "Human-uploaded publication hero",
          fileName: importHeroAsset.fileName,
          mediaType: importHeroAsset.mediaType,
          dataUrl: importHeroAsset.dataUrl,
          width: importHeroAsset.width,
          height: importHeroAsset.height,
          altText: importHeroAssetAlt.trim(),
          sha256: importHeroAsset.sha256,
          recordedAt,
          rights: "customer-supplied",
        });
      }

      const next = commit((current) =>
          replaceReviewPacket(current, {
          publicationType: importPublicationType,
          title: importTitle,
          headline: importHeadline,
          draftText: reviewDraftText,
          claims: [
            {
              location: "headline" as const,
              text: importHeadline.trim(),
              risk: "medium" as const,
              previewTargetId:
                importPublicationType === "blog-post" ? "headline" : "title",
            },
            ...candidates.map((text) => ({
              location: "body" as const,
              text,
              risk: "medium" as const,
              previewTargetId: structuredClaimTargets.get(text),
            })),
          ],
          expectedWorkspaceRevision,
          publicationBrief,
        }, "human"),
      );
      setSelectedClaimId(next.claims[0].id);
      setPreviewVariant("current");
      setPreviewMode("public");
      const nextPreviewProfile: PreviewProfile = {
        brandName: importBrandName.trim() || "Not provided",
        direction: "precision",
        industry: "Not provided",
        audience: importAudience.trim() || "Not provided",
        author: importAuthor.trim() || "Not provided",
        publishedLabel: importPublishedLabel.trim() || "Not provided",
        ctaLabel: importCtaLabel.trim() || "Not provided",
        subjectName: undefined,
        heroAssetUrl:
          importPublicationType === "report" ? undefined : importHeroAsset?.dataUrl,
        heroAssetAlt:
          importPublicationType === "report"
            ? undefined
            : importHeroAssetAlt.trim() || undefined,
        heroFocalPoint: "center",
      };
      previewProfileRef.current = nextPreviewProfile;
      setPreviewProfile(nextPreviewProfile);
      setImportError(null);
      setImportOpen(false);
      setReceiptOpen(false);
      setNotice(
        `New ${importSourceMode} source loaded with ${next.claims.length} unreviewed sentence candidates.`,
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

  return (
    <main className="proofrail-shell" id="page-top">
      <div
        className="app-surface"
        inert={importModalOpen || receiptModalOpen ? true : undefined}
        aria-hidden={importModalOpen || receiptModalOpen ? true : undefined}
      >
        {workspace.claims.length === 0 ? (
          <EmptyStudio
            toolStatus={toolStatus}
            onImport={() => {
              setImportError(null);
              setImportOpen(true);
            }}
            onLoadSelfDemo={resetDemo}
          />
        ) : (
          <ReviewStudio
            workspace={workspace}
            selectedClaimId={selectedClaim?.id ?? ""}
            previewVariant={previewVariant}
            proofVisible={previewMode === "proof"}
            toolStatus={toolStatus}
            toolsOpen={toolsOpen}
            toolManifest={toolManifest}
            notice={notice}
            receiptPending={receiptPending}
            onImport={() => {
              setImportError(null);
              setImportOpen(true);
            }}
            onStartNew={startNewReview}
            onToggleTools={() => setToolsOpen((current) => !current)}
            onDismissNotice={() => setNotice(null)}
            onVariantChange={setPreviewVariant}
            onProofVisibleChange={(visible) =>
              setPreviewMode(visible ? "proof" : "public")
            }
            onSelectClaim={inspectClaim}
            onSelectSource={(_evidenceId, claimId) => inspectClaim(claimId)}
            canStageProposal={(claim) =>
              workspace.id === "workspace-proofrail-self-demo" &&
              Boolean(demoResolutions[claim.id])
            }
            onStageProposal={stageDemoResolution}
            onDecideProposal={decideSelected}
            onApproveEvidence={approveSelectedEvidence}
            onRunReleaseCheck={() => verifyReleaseGate(workspaceRef.current)}
            onCreateReceipt={() => void generateReceipt()}
            onOpenReceipt={() => setReceiptOpen(true)}
            releaseReadiness={
              <ReleaseReadiness
                currentRevision={workspace.revision}
                runReleaseCheck={() => verifyReleaseGate(workspaceRef.current)}
                claims={workspace.claims}
                evidence={workspace.evidence}
                edges={workspace.edges}
                onSelectClaim={inspectClaim}
                onSelectSource={(_evidenceId, claimId) => inspectClaim(claimId)}
              />
            }
          />
        )}
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
            <section className="import-section" aria-labelledby="import-source-title">
              <div className="import-section__head">
                <span>01</span>
                <div>
                  <h3 id="import-source-title">Bring the source you are actually preparing</h3>
                  <p>ProofRail keeps the imported bytes and provenance separate from any later proposal.</p>
                </div>
              </div>
              <div className="import-source-tabs" role="group" aria-label="Publication source type">
                {(["text", "url", "file"] as const).map((mode) => (
                  <button
                    type="button"
                    key={mode}
                    aria-pressed={importSourceMode === mode}
                    onClick={() => {
                      setImportSourceMode(mode);
                      setImportError(null);
                      if (mode !== "file") setImportedTextFile(null);
                    }}
                  >
                    {mode === "text" ? "Text / HTML" : mode === "url" ? "Public or local URL" : "Document file"}
                  </button>
                ))}
              </div>
              <div className="import-grid import-source-controls">
                {importSourceMode === "text" ? (
                  <label>
                    Pasted source format
                    <select
                      value={importTextMediaType}
                      onChange={(event) =>
                        setImportTextMediaType(
                          event.target.value as "text/plain" | "text/markdown" | "text/html",
                        )
                      }
                    >
                      <option value="text/plain">Plain text</option>
                      <option value="text/markdown">Markdown</option>
                      <option value="text/html">HTML</option>
                    </select>
                  </label>
                ) : null}
                {importSourceMode === "url" ? (
                  <label className="import-source-wide">
                    Source URL
                    <input
                      type="url"
                      value={importSourceUrl}
                      placeholder="https://example.com/release-draft"
                      onChange={(event) => setImportSourceUrl(event.target.value)}
                    />
                    <small>
                      Browser-side HTTP(S) import only. If the site blocks cross-origin reads, paste its HTML or upload a file.
                    </small>
                  </label>
                ) : null}
                {importSourceMode === "file" ? (
                  <label className="import-source-wide import-file">
                    TXT, Markdown, or HTML document
                    <input
                      type="file"
                      accept=".txt,.md,.markdown,.html,.htm,text/plain,text/markdown,text/html"
                      onChange={(event) => void loadPublicationFile(event.target.files?.[0])}
                    />
                    <small>
                      {importedTextFile
                        ? `${importedTextFile.fileName} · SHA-256 recorded`
                        : "The file is read locally. Its exact bytes are hashed and kept in provenance."}
                    </small>
                  </label>
                ) : null}
              </div>
            </section>

            <section className="import-section" aria-labelledby="import-format-title">
              <div className="import-section__head">
                <span>02</span>
                <div>
                  <h3 id="import-format-title">Choose the real publication type</h3>
                  <p>Each type uses its own composition system. Missing source fields stay visibly missing.</p>
                </div>
              </div>
              <div className="import-grid">
                <label>
                  Publication format
                  <select
                    value={importPublicationType}
                    onChange={(event) => {
                      const nextType = event.target.value as PublicationType;
                      setImportPublicationType(nextType);
                      setImportStructure(emptyImportStructure);
                      if (nextType === "report") setImportHeroAsset(null);
                    }}
                  >
                    <option value="launch-page">Product launch</option>
                    <option value="project-page">Project / case study</option>
                    <option value="blog-post">Editorial article</option>
                    <option value="report">Research report</option>
                  </select>
                </label>
                <label>
                  Publishing organization
                  <input
                    value={importBrandName}
                    maxLength={80}
                    placeholder="Only the real organization"
                    onChange={(event) => setImportBrandName(event.target.value)}
                  />
                </label>
                <label>
                  Primary audience
                  <input
                    value={importAudience}
                    maxLength={100}
                    placeholder="Who will read this publication?"
                    onChange={(event) => setImportAudience(event.target.value)}
                  />
                </label>
                <label>
                  {authorLabels[importPublicationType]}
                  <input
                    value={importAuthor}
                    maxLength={100}
                    placeholder="Real author or responsible team"
                    onChange={(event) => setImportAuthor(event.target.value)}
                  />
                </label>
                <label>
                  Publication date / version
                  <input
                    value={importPublishedLabel}
                    maxLength={80}
                    placeholder="Approved date, edition, or draft label"
                    onChange={(event) => setImportPublishedLabel(event.target.value)}
                  />
                </label>
                {importPublicationType !== "report" ? (
                  <label>
                    Primary CTA
                    <input
                      value={importCtaLabel}
                      maxLength={60}
                      placeholder="Only when the source contains a CTA"
                      onChange={(event) => setImportCtaLabel(event.target.value)}
                    />
                  </label>
                ) : null}
                {importPublicationType !== "report" ? (
                  <>
                    <label className="import-file">
                      Supplied hero / product image (optional)
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => void loadHeroAsset(event.target.files?.[0])}
                      />
                      <small>
                        {importHeroAsset
                          ? `${importHeroAsset.fileName} · ${importHeroAsset.width}×${importHeroAsset.height} · SHA-256 recorded`
                          : "No stock image or fake UI is generated when media is missing."}
                      </small>
                    </label>
                    <label>
                      Image description (required with image)
                      <input
                        value={importHeroAssetAlt}
                        maxLength={180}
                        onChange={(event) => setImportHeroAssetAlt(event.target.value)}
                        placeholder="Describe only what the supplied image shows"
                      />
                    </label>
                  </>
                ) : null}
              </div>
            </section>

            <section className="import-section" aria-labelledby="import-structure-title">
              <div className="import-section__head">
                <span>03</span>
                <div>
                  <h3 id="import-structure-title">Structure this publication</h3>
                  <p>
                    Fill only modules present in the source. These fields shape the
                    selected renderer; blanks remain explicit requests for input.
                  </p>
                </div>
              </div>
              <div className="import-grid import-structure-grid">
                {[commonStructureField, ...structureFieldsByType[importPublicationType]].map(
                  (field) => (
                    <label
                      key={field.key}
                      className={field.multiline ? "import-structure-wide" : undefined}
                    >
                      {field.label}
                      {field.multiline ? (
                        <textarea
                          value={importStructure[field.key]}
                          maxLength={2400}
                          rows={4}
                          placeholder={field.placeholder}
                          onChange={(event) =>
                            updateImportStructure(field.key, event.target.value)
                          }
                        />
                      ) : (
                        <input
                          value={importStructure[field.key]}
                          maxLength={400}
                          placeholder={field.placeholder}
                          onChange={(event) =>
                            updateImportStructure(field.key, event.target.value)
                          }
                        />
                      )}
                    </label>
                  ),
                )}
              </div>
            </section>

            <section className="import-section" aria-labelledby="import-copy-title">
              <div className="import-section__head">
                <span>04</span>
                <div>
                  <h3 id="import-copy-title">Confirm the exact public wording</h3>
                  <p>The headline and every complete body sentence become exact, reviewable claim spans.</p>
                </div>
              </div>
              <div className="import-grid import-grid--copy">
                <label>
                  Internal packet title
                  <input
                    value={importTitle}
                    maxLength={120}
                    placeholder="Internal review packet title"
                    onChange={(event) => setImportTitle(event.target.value)}
                  />
                </label>
                <label>
                  Public headline
                  <input
                    value={importHeadline}
                    maxLength={180}
                    placeholder="Exact public headline"
                    onChange={(event) => setImportHeadline(event.target.value)}
                  />
                </label>
                {importSourceMode === "url" ? (
                  <div className="import-copy-field import-source-message">
                    <strong>Body copy will be extracted from the URL at import.</strong>
                    <p>The browser removes scripts, styles, hidden containers, and markup before claim extraction.</p>
                  </div>
                ) : (
                  <label className="import-copy-field">
                    Public body copy
                    <textarea
                      value={importDraft}
                      maxLength={8000}
                      rows={9}
                      readOnly={importSourceMode === "file"}
                      placeholder="Paste the exact public body copy. No content is invented when a field is missing."
                      onChange={(event) => setImportDraft(event.target.value)}
                    />
                    {importSourceMode === "file" ? (
                      <small>Read-only extraction from the hashed file selected in step 01.</small>
                    ) : null}
                  </label>
                )}
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
            <button className="modal-primary" onClick={() => void loadImportedPacket()}>
              Load unreviewed packet
              <span>→</span>
            </button>
          </section>
        </div>
      )}

      {receiptModalOpen && displayedReceipt && (
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
              <span>{workspace.receipt ? "PASS" : "VOID"}</span>
              <small>SHA-256</small>
            </div>
            <div className="modal-heading">
              <div>
                <p className="kicker">Proof receipt</p>
                <h2 id="receipt-title">{displayedReceipt.receiptId}</h2>
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
                <dt>Receipt state</dt>
                <dd>{workspace.receipt ? "Current" : "Invalidated by later revision"}</dd>
              </div>
              <div>
                <dt>Generated at</dt>
                <dd>{displayedReceipt.generatedAt}</dd>
              </div>
              <div>
                <dt>Sealed workspace revision</dt>
                <dd>{displayedReceipt.sourceWorkspaceRevision}</dd>
              </div>
              <div>
                <dt>Claims</dt>
                <dd>{displayedReceipt.matrix.length}</dd>
              </div>
              <div>
                <dt>Publication</dt>
                <dd>{displayedReceipt.publicationType.replaceAll("-", " ")}</dd>
              </div>
              <div className="hash-row">
                <dt>Content hash</dt>
                <dd>{displayedReceipt.contentHash}</dd>
              </div>
            </dl>
            <div className="receipt-matrix">
              {displayedReceipt.matrix.map((row) => (
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
              onClick={() => downloadReceipt(displayedReceipt)}
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
