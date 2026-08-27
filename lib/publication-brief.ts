export const PUBLICATION_BRIEF_SCHEMA_VERSION = 1 as const;

export type PublicationBriefType =
  | "launch"
  | "case-study"
  | "article"
  | "report";

export type AuthorityState = "source" | "proposal" | "release-candidate";
export type WorkspaceActor = "agent" | "human" | "system";

export type MissingFieldReason =
  | "not-provided"
  | "not-applicable"
  | "awaiting-verification"
  | "awaiting-human-input";

export type ProvidedField<T> = {
  status: "provided";
  value: T;
  provenanceIds: readonly string[];
};

export type MissingField = {
  status: "missing";
  reason: MissingFieldReason;
  request: string;
};

/**
 * Public copy is never represented by an empty string or a decorative
 * placeholder. A field is either supplied with provenance or explicitly
 * missing with a human-readable request for the information.
 */
export type PublicationField<T> = ProvidedField<T> | MissingField;

export type ContentRights =
  | "project-authored"
  | "customer-supplied"
  | "licensed"
  | "unknown";

type ProvenanceBase = {
  id: string;
  label: string;
  recordedAt: string;
  rights: ContentRights;
  note?: string;
};

export type RepositoryFileProvenance = ProvenanceBase & {
  kind: "repository-file";
  path: string;
  commit?: string;
  sha256?: string;
};

export type PublicUrlProvenance = ProvenanceBase & {
  kind: "public-url";
  url: string;
  capturedAt: string;
};

export type HumanInputProvenance = ProvenanceBase & {
  kind: "human-input";
  inputMethod: "text" | "html" | "url-import" | "form";
};

export type AgentInputProvenance = ProvenanceBase & {
  kind: "agent-input";
  inputMethod: "webmcp";
};

export type UploadedFileProvenance = ProvenanceBase & {
  kind: "uploaded-file";
  fileName: string;
  mediaType: string;
  sha256: string;
};

export type GeneratedAssetProvenance = ProvenanceBase & {
  kind: "generated-asset";
  provider: "openai-imagegen" | "higgsfield" | "meshy" | "other";
  promptReference: string;
  generationId?: string;
  reviewStatus: "pending-human-review" | "approved-for-use" | "rejected";
};

export type ProvenanceRecord =
  | RepositoryFileProvenance
  | PublicUrlProvenance
  | HumanInputProvenance
  | AgentInputProvenance
  | UploadedFileProvenance
  | GeneratedAssetProvenance;

export type MediaRole =
  | "hero"
  | "product-ui"
  | "chapter"
  | "chart"
  | "gallery"
  | "source"
  | "decorative";

type PublicationMediaBase = {
  id: string;
  role: MediaRole;
  src: string;
  mimeType: string;
  provenanceIds: readonly string[];
  alt: PublicationField<string>;
  caption: PublicationField<string>;
  loading: "eager" | "lazy";
};

export type ImageMediaAsset = PublicationMediaBase & {
  kind: "image";
  width: number;
  height: number;
};

export type VideoMediaAsset = PublicationMediaBase & {
  kind: "video";
  width: number;
  height: number;
  durationSeconds: number;
  playback: "user-initiated";
  posterAssetId: string;
};

export type InteractiveMediaAsset = PublicationMediaBase & {
  kind: "interactive-3d";
  format: "glb";
  posterAssetId: string;
  keyboardInstructions: PublicationField<string>;
  loading: "lazy";
};

export type DocumentMediaAsset = PublicationMediaBase & {
  kind: "document";
  pageCount: PublicationField<number>;
};

export type PublicationMediaAsset =
  | ImageMediaAsset
  | VideoMediaAsset
  | InteractiveMediaAsset
  | DocumentMediaAsset;

export type BrandTokens = {
  background: string;
  foreground: string;
  accent: string;
  displayFont: string;
  bodyFont: string;
  logoAssetId: PublicationField<string>;
};

export type AccessibilityMetadata = {
  language: string;
  readingDirection: "ltr" | "rtl";
  motionAlternative: PublicationField<string>;
  editorialNotes: PublicationField<readonly string[]>;
};

export type PublicationSection = {
  id: string;
  eyebrow: PublicationField<string>;
  heading: PublicationField<string>;
  body: PublicationField<string>;
  mediaAssetIds: readonly string[];
};

export type ProductUiChapter = PublicationSection & {
  surface: "web" | "desktop" | "mobile" | "api";
};

export type UseCase = {
  id: string;
  audience: PublicationField<string>;
  outcome: PublicationField<string>;
};

export type ProofMetric = {
  id: string;
  value: string;
  label: string;
  context: string;
  sourceIds: readonly string[];
  caveat: PublicationField<string>;
};

export type Specification = {
  id: string;
  label: string;
  value: string;
  provenanceIds: readonly string[];
};

export type CallToAction = {
  label: string;
  destination: PublicationField<string>;
};

export type Outcome = {
  id: string;
  statement: string;
  provenanceIds: readonly string[];
};

export type PullQuote = {
  id: string;
  quote: string;
  attribution: PublicationField<string>;
  provenanceIds: readonly string[];
};

export type Finding = {
  id: string;
  number: string;
  title: string;
  context: string;
  metric: PublicationField<ProofMetric>;
  chartAssetId: PublicationField<string>;
  provenanceIds: readonly string[];
};

export type PublicationReference = {
  id: string;
  label: string;
  provenanceId: string;
};

type PublicationBriefBase<TType extends PublicationBriefType> = {
  schemaVersion: typeof PUBLICATION_BRIEF_SCHEMA_VERSION;
  publicationType: TType;
  organization: PublicationField<string>;
  title: PublicationField<string>;
  deck: PublicationField<string>;
  sections: PublicationField<readonly PublicationSection[]>;
  brandTokens: PublicationField<BrandTokens>;
  mediaAssets: readonly PublicationMediaAsset[];
  provenance: readonly ProvenanceRecord[];
  accessibilityMetadata: AccessibilityMetadata;
};

export type LaunchPublicationBrief = PublicationBriefBase<"launch"> & {
  productName: PublicationField<string>;
  positioning: PublicationField<string>;
  productUi: PublicationField<readonly ProductUiChapter[]>;
  featureChapters: PublicationField<readonly PublicationSection[]>;
  benefitChapters: PublicationField<readonly PublicationSection[]>;
  useCases: PublicationField<readonly UseCase[]>;
  releaseMetadata: PublicationField<string>;
  availability: PublicationField<string>;
  pricingOrAccess: PublicationField<string>;
  proofMetrics: PublicationField<readonly ProofMetric[]>;
  specifications: PublicationField<readonly Specification[]>;
  cta: PublicationField<CallToAction>;
  gallery: PublicationField<readonly string[]>;
};

export type CaseStudyPublicationBrief = PublicationBriefBase<"case-study"> & {
  client: PublicationField<string>;
  project: PublicationField<string>;
  roles: PublicationField<readonly string[]>;
  scope: PublicationField<readonly string[]>;
  challenge: PublicationField<string>;
  insight: PublicationField<string>;
  approach: PublicationField<string>;
  systemInUse: PublicationField<readonly PublicationSection[]>;
  implementation: PublicationField<readonly PublicationSection[]>;
  outcomes: PublicationField<readonly Outcome[]>;
  metrics: PublicationField<readonly ProofMetric[]>;
  testimonial: PublicationField<PullQuote>;
  gallery: PublicationField<readonly string[]>;
  credits: PublicationField<readonly string[]>;
};

export type ArticlePublicationBrief = PublicationBriefBase<"article"> & {
  publication: PublicationField<string>;
  category: PublicationField<string>;
  headline: PublicationField<string>;
  author: PublicationField<string>;
  publicationDate: PublicationField<string>;
  readingTime: PublicationField<string>;
  heroMediaAssetId: PublicationField<string>;
  thesis: PublicationField<string>;
  pullQuotes: PublicationField<readonly PullQuote[]>;
  captions: PublicationField<readonly string[]>;
  references: PublicationField<readonly PublicationReference[]>;
  relatedContent: PublicationField<readonly PublicationReference[]>;
};

export type ReportPublicationBrief = PublicationBriefBase<"report"> & {
  institution: PublicationField<string>;
  edition: PublicationField<string>;
  abstract: PublicationField<string>;
  executiveSummary: PublicationField<string>;
  findings: PublicationField<readonly Finding[]>;
  datasets: PublicationField<readonly PublicationReference[]>;
  charts: PublicationField<readonly string[]>;
  methodology: PublicationField<string>;
  limitations: PublicationField<string>;
  sources: PublicationField<readonly PublicationReference[]>;
  faq: PublicationField<readonly PublicationSection[]>;
  downloadMetadata: PublicationField<{
    label: string;
    mediaAssetId: string;
  }>;
};

export type PublicationBrief =
  | LaunchPublicationBrief
  | CaseStudyPublicationBrief
  | ArticlePublicationBrief
  | ReportPublicationBrief;

export type SourceOnlyPublicationInput = {
  publicationType: "launch-page" | "project-page" | "blog-post" | "report";
  organization?: string;
  title: string;
  headline: string;
  body: string;
  author?: string;
  audience?: string;
  publishedLabel?: string;
  cta?: string;
  recordedAt?: string;
  provenanceId?: string;
  inputMethod?: HumanInputProvenance["inputMethod"];
  /** Internal trust boundary. This value is never accepted from a WebMCP schema. */
  sourceActor?: "human" | "agent";
  publicUrl?: string;
  uploadedFile?: {
    fileName: string;
    mediaType: string;
    sha256: string;
  };
  structure?: SourceOnlyPublicationStructure;
};

/**
 * Optional, explicitly human-supplied renderer structure. These fields are
 * never inferred from generic body copy: if a module is absent it remains a
 * visible request for input in the renderer.
 */
export type SourceOnlyPublicationStructure = {
  deck?: string;
  launch?: {
    productName?: string;
    positioning?: string;
    featureTitle?: string;
    featureBody?: string;
    benefitTitle?: string;
    benefitBody?: string;
    useCaseAudience?: string;
    useCaseOutcome?: string;
    availability?: string;
    pricingOrAccess?: string;
  };
  caseStudy?: {
    client?: string;
    project?: string;
    roles?: string;
    scope?: string;
    challenge?: string;
    insight?: string;
    approach?: string;
    systemTitle?: string;
    systemBody?: string;
    implementationTitle?: string;
    implementationBody?: string;
    outcomes?: string;
    credits?: string;
  };
  article?: {
    publication?: string;
    category?: string;
    thesis?: string;
    pullQuote?: string;
    pullQuoteAttribution?: string;
  };
  report?: {
    institution?: string;
    edition?: string;
    abstract?: string;
    executiveSummary?: string;
    findings?: string;
    methodology?: string;
    limitations?: string;
  };
};

function structureLines(value: string | undefined): string[] {
  return (value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Return every public, potentially factual text fragment added outside the
 * canonical body field. The import path feeds these exact fragments into the
 * same claim-coverage gate as body copy. Short identity metadata such as a
 * masthead, client name, role, or credit is intentionally excluded.
 */
export type PublicationStructureClaimTarget = {
  text: string;
  targetId: string;
};

export function publicationStructureClaimTargets(
  publicationType: SourceOnlyPublicationInput["publicationType"],
  structure: SourceOnlyPublicationStructure | undefined,
): PublicationStructureClaimTarget[] {
  if (!structure) return [];
  const targets: PublicationStructureClaimTarget[] = [];
  const add = (value: string | undefined, targetId: string) => {
    targets.push(...structureLines(value).map((text) => ({ text, targetId })));
  };
  add(structure.deck, "deck");
  switch (publicationType) {
    case "launch-page": {
      const launch = structure.launch;
      add(launch?.positioning, "positioning");
      add(launch?.featureTitle, "section:human-launch-feature-01");
      add(launch?.featureBody, "section:human-launch-feature-01");
      add(launch?.benefitTitle, "section:human-launch-benefit-01");
      add(launch?.benefitBody, "section:human-launch-benefit-01");
      add(launch?.useCaseOutcome, "use-case:human-use-case-01");
      add(launch?.availability, "availability");
      add(launch?.pricingOrAccess, "access");
      break;
    }
    case "project-page": {
      const caseStudy = structure.caseStudy;
      add(caseStudy?.challenge, "challenge");
      add(caseStudy?.insight, "insight");
      add(caseStudy?.approach, "approach");
      add(caseStudy?.systemTitle, "section:human-case-system-01");
      add(caseStudy?.systemBody, "section:human-case-system-01");
      add(
        caseStudy?.implementationTitle,
        "section:human-case-implementation-01",
      );
      add(
        caseStudy?.implementationBody,
        "section:human-case-implementation-01",
      );
      structureLines(caseStudy?.outcomes).forEach((text, index) =>
        targets.push({
          text,
          targetId: `outcome:human-outcome-${String(index + 1).padStart(2, "0")}`,
        }),
      );
      break;
    }
    case "blog-post": {
      const article = structure.article;
      add(article?.thesis, "thesis");
      add(article?.pullQuote, "quote:human-pull-quote-01");
      break;
    }
    case "report": {
      const report = structure.report;
      add(report?.abstract, "abstract");
      add(report?.executiveSummary, "executive-summary");
      add(report?.methodology, "methodology");
      add(report?.limitations, "limitations");
      for (const [index, finding] of structureLines(report?.findings).entries()) {
        const separator = finding.indexOf("|");
        const targetId = `finding:human-finding-${String(index + 1).padStart(2, "0")}`;
        if (separator < 1 || separator >= finding.length - 1) {
          targets.push({ text: finding, targetId });
        } else {
          targets.push(
            { text: finding.slice(0, separator).trim(), targetId },
            { text: finding.slice(separator + 1).trim(), targetId },
          );
        }
      }
      break;
    }
  }
  return targets.filter((target) => Boolean(target.text));
}

export function publicationStructureClaimFragments(
  publicationType: SourceOnlyPublicationInput["publicationType"],
  structure: SourceOnlyPublicationStructure | undefined,
): string[] {
  return publicationStructureClaimTargets(publicationType, structure).map(
    (target) => target.text,
  );
}

export type SourceOnlyImportMetadata = {
  sourcePublicationType: SourceOnlyPublicationInput["publicationType"];
  organization: PublicationField<string>;
  title: ProvidedField<string>;
  headline: ProvidedField<string>;
  body: ProvidedField<string>;
  author: PublicationField<string>;
  audience: PublicationField<string>;
  publishedLabel: PublicationField<string>;
  cta: PublicationField<string>;
};

export type SourceOnlyPublicationBrief =
  | (LaunchPublicationBrief & { sourceImport: SourceOnlyImportMetadata })
  | (CaseStudyPublicationBrief & { sourceImport: SourceOnlyImportMetadata })
  | (ArticlePublicationBrief & { sourceImport: SourceOnlyImportMetadata })
  | (ReportPublicationBrief & { sourceImport: SourceOnlyImportMetadata });

export type SourceAuthority<TBrief extends PublicationBrief = PublicationBrief> = {
  authority: "source";
  sourceId: string;
  revision: number;
  loadedAt: string;
  loadedBy: WorkspaceActor;
  provenanceIds: readonly string[];
  brief: TBrief;
};

export type ProposalAuthority<TBrief extends PublicationBrief = PublicationBrief> = {
  authority: "proposal";
  proposalId: string;
  revision: number;
  baseSourceRevision: number;
  proposedAt: string;
  proposedBy: "agent" | "human";
  rationale: string;
  status: "pending-human-review" | "approved" | "rejected";
  humanDecisionId: string | null;
  brief: TBrief;
};

export type HumanApprovalDecision = {
  id: string;
  actor: "human";
  decision: "approved" | "rejected";
  proposalId: string;
  proposalRevision: number;
  decidedAt: string;
  rationale: string;
};

export type ReleaseCandidateAuthority<
  TBrief extends PublicationBrief = PublicationBrief,
> = {
  authority: "release-candidate";
  candidateId: string;
  revision: number;
  sourceRevision: number;
  proposalId: string;
  approvedAt: string;
  approval: HumanApprovalDecision & { decision: "approved" };
  brief: TBrief;
};

export type PublicationAuditEvent = {
  id: string;
  at: string;
  actor: WorkspaceActor;
  action:
    | "SOURCE_LOADED"
    | "SOURCE_REPLACED"
    | "PROPOSAL_STAGED"
    | "PROPOSAL_APPROVED"
    | "PROPOSAL_REJECTED";
  detail: string;
  workspaceRevision: number;
};

export type ProofRailSelfDemoMetadata = {
  kind: "proofrail-self-demo";
  label: "Verified ProofRail self-demo";
  disclosure: string;
  provenanceIds: readonly string[];
};

export type EmptyPublicationWorkspace = {
  schemaVersion: typeof PUBLICATION_BRIEF_SCHEMA_VERSION;
  state: "empty";
  id: string;
  revision: 0;
  publicationType: null;
  releaseStatus: "blocked";
  authority: {
    source: null;
    proposal: null;
    releaseCandidate: null;
  };
  humanDecisions: readonly HumanApprovalDecision[];
  audit: readonly PublicationAuditEvent[];
  demo: null;
};

export type ActivePublicationWorkspace<
  TBrief extends PublicationBrief = PublicationBrief,
> = {
  schemaVersion: typeof PUBLICATION_BRIEF_SCHEMA_VERSION;
  state: "active";
  id: string;
  revision: number;
  publicationType: TBrief["publicationType"];
  releaseStatus:
    | "blocked"
    | "human-review-pending"
    | "candidate-approved-pending-gate";
  authority: {
    source: SourceAuthority<TBrief>;
    proposal: ProposalAuthority<TBrief> | null;
    releaseCandidate: ReleaseCandidateAuthority<TBrief> | null;
  };
  humanDecisions: readonly HumanApprovalDecision[];
  audit: readonly PublicationAuditEvent[];
  demo: ProofRailSelfDemoMetadata | null;
};

export type PublicationWorkspace =
  | EmptyPublicationWorkspace
  | ActivePublicationWorkspace;

const PUBLICATION_TYPES = new Set<PublicationBriefType>([
  "launch",
  "case-study",
  "article",
  "report",
]);

const MISSING_REASONS = new Set<MissingFieldReason>([
  "not-provided",
  "not-applicable",
  "awaiting-verification",
  "awaiting-human-input",
]);

const REQUIRED_TYPE_KEYS: Record<PublicationBriefType, readonly string[]> = {
  launch: [
    "productName",
    "positioning",
    "productUi",
    "featureChapters",
    "benefitChapters",
    "useCases",
    "releaseMetadata",
    "availability",
    "pricingOrAccess",
    "proofMetrics",
    "specifications",
    "cta",
    "gallery",
  ],
  "case-study": [
    "client",
    "project",
    "roles",
    "scope",
    "challenge",
    "insight",
    "approach",
    "systemInUse",
    "implementation",
    "outcomes",
    "metrics",
    "testimonial",
    "gallery",
    "credits",
  ],
  article: [
    "publication",
    "category",
    "headline",
    "author",
    "publicationDate",
    "readingTime",
    "heroMediaAssetId",
    "thesis",
    "pullQuotes",
    "captions",
    "references",
    "relatedContent",
  ],
  report: [
    "institution",
    "edition",
    "abstract",
    "executiveSummary",
    "findings",
    "datasets",
    "charts",
    "methodology",
    "limitations",
    "sources",
    "faq",
    "downloadMetadata",
  ],
};

function assertText(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`INVALID_TEXT: ${label} must be a non-empty string.`);
  }
}

function assertIsoTimestamp(value: string, label: string): void {
  assertText(value, label);
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`INVALID_TIMESTAMP: ${label} must be an ISO timestamp.`);
  }
}

function assertMeaningfulValue(value: unknown, label: string): void {
  if (typeof value === "string") {
    assertText(value, label);
    return;
  }
  if (Array.isArray(value) && value.length === 0) {
    throw new Error(
      `EMPTY_PROVIDED_VALUE: ${label} must use an explicit missing field instead of an empty array.`,
    );
  }
  if (value === null || value === undefined) {
    throw new Error(
      `EMPTY_PROVIDED_VALUE: ${label} must use an explicit missing field.`,
    );
  }
}

export function provided<T>(
  value: T,
  provenanceIds: readonly string[],
): ProvidedField<T> {
  assertMeaningfulValue(value, "provided value");
  if (provenanceIds.length === 0 || provenanceIds.some((id) => !id.trim())) {
    throw new Error(
      "MISSING_PROVENANCE: every provided publication field needs at least one provenance id.",
    );
  }
  return { status: "provided", value, provenanceIds: [...provenanceIds] };
}

export function missing(
  reason: MissingFieldReason,
  request: string,
): MissingField {
  if (!MISSING_REASONS.has(reason)) {
    throw new Error(`INVALID_MISSING_REASON: ${String(reason)}`);
  }
  assertText(request, "missing-field request");
  return { status: "missing", reason, request };
}

export function isProvided<T>(
  field: PublicationField<T>,
): field is ProvidedField<T> {
  return field.status === "provided";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalJson(value: unknown): string {
  const normalize = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(normalize);
    if (!isRecord(input)) return input;
    return Object.fromEntries(
      Object.keys(input)
        .sort()
        .map((key) => [key, normalize(input[key])]),
    );
  };
  return JSON.stringify(normalize(value));
}

function visitPublicationFields(
  value: unknown,
  path: string,
  provenanceIds: ReadonlySet<string>,
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      visitPublicationFields(item, `${path}[${index}]`, provenanceIds),
    );
    return;
  }
  if (!isRecord(value)) return;

  if (value.status === "provided") {
    assertMeaningfulValue(value.value, `${path}.value`);
    if (!Array.isArray(value.provenanceIds) || value.provenanceIds.length === 0) {
      throw new Error(`MISSING_PROVENANCE: ${path} has no provenance ids.`);
    }
    for (const id of value.provenanceIds) {
      assertText(id, `${path}.provenanceIds`);
      if (!provenanceIds.has(id)) {
        throw new Error(`UNKNOWN_PROVENANCE: ${path} references ${id}.`);
      }
    }
    visitPublicationFields(value.value, `${path}.value`, provenanceIds);
    return;
  }

  if (value.status === "missing") {
    if (!MISSING_REASONS.has(value.reason as MissingFieldReason)) {
      throw new Error(`INVALID_MISSING_REASON: ${path}.reason`);
    }
    assertText(value.request, `${path}.request`);
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    visitPublicationFields(child, `${path}.${key}`, provenanceIds);
  }
}

function assertUniqueIds(
  records: readonly { id: string }[],
  label: string,
): void {
  const seen = new Set<string>();
  for (const record of records) {
    assertText(record.id, `${label}.id`);
    if (seen.has(record.id)) {
      throw new Error(`DUPLICATE_ID: ${label} contains ${record.id}.`);
    }
    seen.add(record.id);
  }
}

function assertHttpUrl(value: string, label: string): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`INVALID_URL: ${label} must be an HTTP(S) URL.`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`INVALID_URL: ${label} must be an HTTP(S) URL.`);
  }
}

function validateProvenance(record: ProvenanceRecord): void {
  assertText(record.id, "provenance.id");
  assertText(record.label, `${record.id}.label`);
  assertIsoTimestamp(record.recordedAt, `${record.id}.recordedAt`);

  switch (record.kind) {
    case "repository-file":
      assertText(record.path, `${record.id}.path`);
      break;
    case "public-url":
      assertHttpUrl(record.url, `${record.id}.url`);
      assertIsoTimestamp(record.capturedAt, `${record.id}.capturedAt`);
      break;
    case "human-input":
    case "agent-input":
      break;
    case "uploaded-file":
      assertText(record.fileName, `${record.id}.fileName`);
      assertText(record.mediaType, `${record.id}.mediaType`);
      if (!/^[a-f0-9]{64}$/i.test(record.sha256)) {
        throw new Error(`INVALID_SHA256: ${record.id}.sha256`);
      }
      break;
    case "generated-asset":
      assertText(record.promptReference, `${record.id}.promptReference`);
      break;
    default: {
      const unreachable: never = record;
      throw new Error(`INVALID_PROVENANCE: ${String(unreachable)}`);
    }
  }
}

function validateMedia(
  media: readonly PublicationMediaAsset[],
  provenanceIds: ReadonlySet<string>,
): void {
  assertUniqueIds(media, "mediaAssets");
  const byId = new Map(media.map((asset) => [asset.id, asset]));

  for (const asset of media) {
    assertText(asset.src, `${asset.id}.src`);
    assertText(asset.mimeType, `${asset.id}.mimeType`);
    if (asset.provenanceIds.length === 0) {
      throw new Error(`MISSING_PROVENANCE: media ${asset.id}.`);
    }
    for (const id of asset.provenanceIds) {
      if (!provenanceIds.has(id)) {
        throw new Error(`UNKNOWN_PROVENANCE: media ${asset.id} references ${id}.`);
      }
    }
    if (asset.role !== "decorative" && asset.alt.status !== "provided") {
      throw new Error(`MISSING_ALT_TEXT: media ${asset.id}.`);
    }
    if (asset.kind === "image" || asset.kind === "video") {
      if (asset.width <= 0 || asset.height <= 0) {
        throw new Error(`INVALID_MEDIA_DIMENSIONS: ${asset.id}.`);
      }
    }
    if (asset.kind === "video" || asset.kind === "interactive-3d") {
      const poster = byId.get(asset.posterAssetId);
      if (!poster || poster.kind !== "image") {
        throw new Error(`INVALID_MEDIA_POSTER: ${asset.id}.`);
      }
    }
    if (asset.kind === "interactive-3d") {
      if ((asset as { loading: string }).loading !== "lazy") {
        throw new Error(`THREE_D_MUST_LAZY_LOAD: ${asset.id}.`);
      }
      if (asset.keyboardInstructions.status !== "provided") {
        throw new Error(`MISSING_3D_KEYBOARD_INSTRUCTIONS: ${asset.id}.`);
      }
    }
  }
}

function collectSectionMediaIds(brief: PublicationBrief): readonly string[] {
  const references: string[] = [];
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!isRecord(value)) return;
    if (Array.isArray(value.mediaAssetIds)) {
      for (const id of value.mediaAssetIds) {
        if (typeof id === "string") references.push(id);
      }
    }
    for (const child of Object.values(value)) walk(child);
  };
  walk(brief);
  return references;
}

function validateEmbeddedProvenanceReferences(
  value: unknown,
  path: string,
  provenanceIds: ReadonlySet<string>,
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      validateEmbeddedProvenanceReferences(
        item,
        `${path}[${index}]`,
        provenanceIds,
      ),
    );
    return;
  }
  if (!isRecord(value)) return;

  for (const [key, child] of Object.entries(value)) {
    if (key === "provenanceId" && typeof child === "string") {
      if (!provenanceIds.has(child)) {
        throw new Error(`UNKNOWN_PROVENANCE: ${path}.${key} references ${child}.`);
      }
    }
    if ((key === "provenanceIds" || key === "sourceIds") && Array.isArray(child)) {
      for (const id of child) {
        if (typeof id !== "string" || !provenanceIds.has(id)) {
          throw new Error(
            `UNKNOWN_PROVENANCE: ${path}.${key} references ${String(id)}.`,
          );
        }
      }
    }
    validateEmbeddedProvenanceReferences(child, `${path}.${key}`, provenanceIds);
  }
}

function collectDirectMediaIds(brief: PublicationBrief): readonly string[] {
  const ids: string[] = [];
  const addStringField = (field: PublicationField<string>): void => {
    if (field.status === "provided") ids.push(field.value);
  };
  const addStringArrayField = (
    field: PublicationField<readonly string[]>,
  ): void => {
    if (field.status === "provided") ids.push(...field.value);
  };

  if (brief.brandTokens.status === "provided") {
    addStringField(brief.brandTokens.value.logoAssetId);
  }
  switch (brief.publicationType) {
    case "launch":
      addStringArrayField(brief.gallery);
      break;
    case "case-study":
      addStringArrayField(brief.gallery);
      break;
    case "article":
      addStringField(brief.heroMediaAssetId);
      break;
    case "report":
      addStringArrayField(brief.charts);
      if (brief.downloadMetadata.status === "provided") {
        ids.push(brief.downloadMetadata.value.mediaAssetId);
      }
      if (brief.findings.status === "provided") {
        for (const finding of brief.findings.value) {
          addStringField(finding.chartAssetId);
        }
      }
      break;
  }
  return ids;
}

export function validatePublicationBrief(brief: PublicationBrief): void {
  if (brief.schemaVersion !== PUBLICATION_BRIEF_SCHEMA_VERSION) {
    throw new Error(`UNSUPPORTED_BRIEF_SCHEMA: ${brief.schemaVersion}`);
  }
  if (!PUBLICATION_TYPES.has(brief.publicationType)) {
    throw new Error(`INVALID_PUBLICATION_TYPE: ${String(brief.publicationType)}`);
  }
  for (const key of REQUIRED_TYPE_KEYS[brief.publicationType]) {
    if (!(key in brief)) {
      throw new Error(
        `INCOMPLETE_${brief.publicationType.toUpperCase().replace("-", "_")}_BRIEF: missing ${key}.`,
      );
    }
  }

  assertUniqueIds(brief.provenance, "provenance");
  brief.provenance.forEach(validateProvenance);
  const provenanceIds = new Set(brief.provenance.map((record) => record.id));
  visitPublicationFields(brief, "brief", provenanceIds);
  validateEmbeddedProvenanceReferences(brief, "brief", provenanceIds);
  validateMedia(brief.mediaAssets, provenanceIds);

  const mediaIds = new Set(brief.mediaAssets.map((asset) => asset.id));
  for (const mediaId of [
    ...collectSectionMediaIds(brief),
    ...collectDirectMediaIds(brief),
  ]) {
    if (!mediaIds.has(mediaId)) {
      throw new Error(`UNKNOWN_MEDIA: publication brief references ${mediaId}.`);
    }
  }
}

function optionalHumanInputField(
  value: string | undefined,
  provenanceId: string,
  request: string,
): PublicationField<string> {
  const normalized = value?.trim();
  return normalized
    ? provided(normalized, [provenanceId])
    : missing("not-provided", request);
}

function optionalHumanListField(
  value: string | undefined,
  provenanceId: string,
  request: string,
): PublicationField<readonly string[]> {
  const items = value
    ?.split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  return items?.length
    ? provided(items, [provenanceId])
    : missing("not-provided", request);
}

function optionalHumanSectionField(
  id: string,
  title: string | undefined,
  body: string | undefined,
  provenanceId: string,
  request: string,
): PublicationField<readonly PublicationSection[]> {
  const normalizedTitle = title?.trim();
  const normalizedBody = body?.trim();
  if (!normalizedTitle && !normalizedBody) return missing("not-provided", request);
  if (!normalizedTitle || !normalizedBody) {
    throw new Error(
      `INCOMPLETE_PUBLICATION_MODULE: ${id} needs both a heading and body.`,
    );
  }
  return provided(
    [
      {
        id,
        eyebrow: missing(
          "not-provided",
          "Add an eyebrow only when the supplied source contains one.",
        ),
        heading: provided(normalizedTitle, [provenanceId]),
        body: provided(normalizedBody, [provenanceId]),
        mediaAssetIds: [],
      },
    ],
    [provenanceId],
  );
}

function optionalHumanUseCases(
  audience: string | undefined,
  outcome: string | undefined,
  provenanceId: string,
): PublicationField<readonly UseCase[]> {
  const normalizedAudience = audience?.trim();
  const normalizedOutcome = outcome?.trim();
  if (!normalizedAudience && !normalizedOutcome) {
    return missing(
      "not-provided",
      "Add a use case only when both its audience and outcome are supplied.",
    );
  }
  if (!normalizedAudience || !normalizedOutcome) {
    throw new Error(
      "INCOMPLETE_PUBLICATION_MODULE: a use case needs both an audience and outcome.",
    );
  }
  return provided(
    [
      {
        id: "human-use-case-01",
        audience: provided(normalizedAudience, [provenanceId]),
        outcome: provided(normalizedOutcome, [provenanceId]),
      },
    ],
    [provenanceId],
  );
}

function optionalHumanOutcomes(
  value: string | undefined,
  provenanceId: string,
): PublicationField<readonly Outcome[]> {
  const statements = value
    ?.split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  return statements?.length
    ? provided(
        statements.map((statement, index) => ({
          id: `human-outcome-${String(index + 1).padStart(2, "0")}`,
          statement,
          provenanceIds: [provenanceId],
        })),
        [provenanceId],
      )
    : missing("awaiting-verification", "Supply sourced project outcomes.");
}

function optionalHumanFindings(
  value: string | undefined,
  provenanceId: string,
): PublicationField<readonly Finding[]> {
  const lines = value
    ?.split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!lines?.length) {
    return missing(
      "awaiting-verification",
      "Supply findings as one source-backed ‘Title | Context’ row per line.",
    );
  }
  const findings = lines.map((line, index) => {
    const separator = line.indexOf("|");
    if (separator < 1 || separator >= line.length - 1) {
      throw new Error(
        `INVALID_REPORT_FINDING: row ${index + 1} must use “Title | Context”.`,
      );
    }
    const title = line.slice(0, separator).trim();
    const context = line.slice(separator + 1).trim();
    if (!title || !context) {
      throw new Error(
        `INVALID_REPORT_FINDING: row ${index + 1} needs a title and context.`,
      );
    }
    return {
      id: `human-finding-${String(index + 1).padStart(2, "0")}`,
      number: String(index + 1).padStart(2, "0"),
      title,
      context,
      metric: missing(
        "awaiting-verification" as const,
        "Attach a verified metric and source only when one exists.",
      ),
      chartAssetId: missing(
        "not-provided" as const,
        "Attach an approved chart only when the finding requires one.",
      ),
      provenanceIds: [provenanceId],
    };
  });
  return provided(findings, [provenanceId]);
}

/**
 * Bridge the current import form into the new publication union without
 * inferring customer claims or renderer content. The original import fields
 * remain available in sourceImport; only structurally safe direct mappings are
 * copied into a renderer field. Callers may supply recordedAt for deterministic
 * replays, otherwise the provenance record captures the actual import time.
 */
export function createSourceOnlyPublicationBrief(
  input: SourceOnlyPublicationInput,
): SourceOnlyPublicationBrief {
  const sourceActor = input.sourceActor ?? "human";
  const provenanceId =
    input.provenanceId ?? `${sourceActor}-input-${input.publicationType}`;
  const recordedAt = input.recordedAt ?? new Date().toISOString();
  assertText(provenanceId, "source-only provenance id");
  assertIsoTimestamp(recordedAt, "source-only recordedAt");

  if (input.publicUrl && input.uploadedFile) {
    throw new Error(
      "AMBIGUOUS_SOURCE_PROVENANCE: a source cannot be both a URL and an uploaded file.",
    );
  }
  const sourceProvenance: ProvenanceRecord = input.publicUrl
    ? {
        id: provenanceId,
        kind: "public-url",
        label: "Imported publication URL",
        url: input.publicUrl,
        capturedAt: recordedAt,
        recordedAt,
        rights: "unknown",
        note: "The browser imported this public URL; publication authority still requires human confirmation.",
      }
    : input.uploadedFile
      ? {
          id: provenanceId,
          kind: "uploaded-file",
          label: "Uploaded publication file",
          fileName: input.uploadedFile.fileName,
          mediaType: input.uploadedFile.mediaType,
          sha256: input.uploadedFile.sha256,
          recordedAt,
          rights: "unknown",
          note: "The file supplied the exact publication copy; rights still require human confirmation.",
        }
      : sourceActor === "agent"
        ? {
            id: provenanceId,
            kind: "agent-input",
            label: "Agent-supplied publication source",
            inputMethod: "webmcp",
            recordedAt,
            rights: "unknown",
            note: "An agent supplied this source through WebMCP. Rights, wording, and publication authority require human confirmation.",
          }
        : {
            id: provenanceId,
            kind: "human-input",
            label: "Human-supplied publication source",
            inputMethod: input.inputMethod ?? "form",
            recordedAt,
            rights: "unknown",
            note: "Rights and publication authority must be confirmed by the human reviewer.",
          };
  const organization = optionalHumanInputField(
    input.organization,
    provenanceId,
    "Supply the real publishing organization if it should appear publicly.",
  );
  const packetTitle = provided(input.title, [provenanceId]);
  const headline = provided(input.headline, [provenanceId]);
  const title = headline;
  const body = provided(input.body, [provenanceId]);
  const author = optionalHumanInputField(
    input.author,
    provenanceId,
    "Supply the real author or byline if it should appear publicly.",
  );
  const audience = optionalHumanInputField(
    input.audience,
    provenanceId,
    "Supply the intended audience when it is part of the publication brief.",
  );
  const publishedLabel = optionalHumanInputField(
    input.publishedLabel,
    provenanceId,
    "Supply an approved publication or draft label.",
  );
  const ctaLabel = optionalHumanInputField(
    input.cta,
    provenanceId,
    "Supply a call-to-action label only when the source contains one.",
  );
  const structure = input.structure ?? {};
  const sourceImport: SourceOnlyImportMetadata = {
    sourcePublicationType: input.publicationType,
    organization,
    title: packetTitle,
    headline,
    body,
    author,
    audience,
    publishedLabel,
    cta: ctaLabel,
  };
  const sourceSection: PublicationSection = {
    id: "source-publication-body",
    eyebrow: missing(
      "not-provided",
      "Add an eyebrow only when the source publication contains one.",
    ),
    heading: headline,
    body,
    mediaAssetIds: [],
  };
  const common = {
    schemaVersion: PUBLICATION_BRIEF_SCHEMA_VERSION,
    organization,
    title,
    deck: optionalHumanInputField(
      structure.deck,
      provenanceId,
      "Supply a separate deck only when the source publication contains one.",
    ),
    sections: provided([sourceSection], [provenanceId]),
    brandTokens: missing(
      "not-provided" as const,
      "Supply approved brand tokens; do not infer a brand system from copy.",
    ),
    mediaAssets: [],
    provenance: [sourceProvenance],
    accessibilityMetadata: {
      language: "und",
      readingDirection: "ltr" as const,
      motionAlternative: missing(
        "not-applicable" as const,
        "The source-only brief contains no motion media.",
      ),
      editorialNotes: missing(
        "not-provided" as const,
        "Add accessibility notes during human editorial review.",
      ),
    },
    sourceImport,
  };
  const noMetric = () =>
    missing(
      "awaiting-verification" as const,
      "Add metrics only when the exact value, context, and source are verified.",
    );
  const noMedia = (request: string) => missing("not-provided" as const, request);
  const validateAndReturn = <TBrief extends SourceOnlyPublicationBrief>(
    brief: TBrief,
  ): TBrief => {
    validatePublicationBrief(brief);
    return brief;
  };

  switch (input.publicationType) {
    case "launch-page": {
      const launch = structure.launch;
      const cta: PublicationField<CallToAction> =
        ctaLabel.status === "provided"
          ? provided(
              {
                label: ctaLabel.value,
                destination: missing(
                  "not-provided",
                  "Supply the real CTA destination before enabling this action.",
                ),
              },
              [provenanceId],
            )
          : missing(
              "not-provided",
              "Supply both the CTA label and destination before showing an action.",
            );
      return validateAndReturn({
        ...common,
        publicationType: "launch",
        productName: optionalHumanInputField(
          launch?.productName,
          provenanceId,
          "Supply the real product name; the internal packet title is never published.",
        ),
        positioning: optionalHumanInputField(
          launch?.positioning,
          provenanceId,
          "Supply positioning only when it is present in the source publication.",
        ),
        productUi: noMedia(
          "Supply current product UI captures; do not generate or simulate them.",
        ),
        featureChapters: optionalHumanSectionField(
          "human-launch-feature-01",
          launch?.featureTitle,
          launch?.featureBody,
          provenanceId,
          "Structure feature chapters from human-supplied source material.",
        ),
        benefitChapters: optionalHumanSectionField(
          "human-launch-benefit-01",
          launch?.benefitTitle,
          launch?.benefitBody,
          provenanceId,
          "Add benefit chapters only when their claims have evidence.",
        ),
        useCases: optionalHumanUseCases(
          launch?.useCaseAudience,
          launch?.useCaseOutcome,
          provenanceId,
        ),
        releaseMetadata: publishedLabel,
        availability: optionalHumanInputField(
          launch?.availability,
          provenanceId,
          "Supply verified availability information.",
        ),
        pricingOrAccess: optionalHumanInputField(
          launch?.pricingOrAccess,
          provenanceId,
          "Supply verified pricing or access information.",
        ),
        proofMetrics: noMetric(),
        specifications: missing(
          "not-provided",
          "Supply verified product specifications.",
        ),
        cta,
        gallery: noMedia("Supply approved launch media."),
      });
    }
    case "project-page": {
      const caseStudy = structure.caseStudy;
      return validateAndReturn({
        ...common,
        publicationType: "case-study",
        client: optionalHumanInputField(
          caseStudy?.client,
          provenanceId,
          "Supply the real client; the publishing organization is not assumed to be the client.",
        ),
        project: optionalHumanInputField(
          caseStudy?.project,
          provenanceId,
          "Supply the real project name; the packet title is preserved separately.",
        ),
        roles: optionalHumanListField(
          caseStudy?.roles,
          provenanceId,
          "Supply documented project roles, one per line.",
        ),
        scope: optionalHumanListField(
          caseStudy?.scope,
          provenanceId,
          "Supply documented project scope, one item per line.",
        ),
        challenge: optionalHumanInputField(
          caseStudy?.challenge,
          provenanceId,
          "Identify the challenge from supplied case-study material.",
        ),
        insight: optionalHumanInputField(
          caseStudy?.insight,
          provenanceId,
          "Identify the insight from supplied case-study material.",
        ),
        approach: optionalHumanInputField(
          caseStudy?.approach,
          provenanceId,
          "Identify the approach from supplied case-study material.",
        ),
        systemInUse: optionalHumanSectionField(
          "human-case-system-01",
          caseStudy?.systemTitle,
          caseStudy?.systemBody,
          provenanceId,
          "Supply evidence of the system in use.",
        ),
        implementation: optionalHumanSectionField(
          "human-case-implementation-01",
          caseStudy?.implementationTitle,
          caseStudy?.implementationBody,
          provenanceId,
          "Supply implementation chapters.",
        ),
        outcomes: optionalHumanOutcomes(caseStudy?.outcomes, provenanceId),
        metrics: noMetric(),
        testimonial: missing(
          "not-provided",
          "Supply a real, approved quotation and attribution.",
        ),
        gallery: noMedia("Supply approved project media."),
        credits: optionalHumanListField(
          caseStudy?.credits,
          provenanceId,
          "Supply documented project credits, one per line.",
        ),
      });
    }
    case "blog-post": {
      const article = structure.article;
      return validateAndReturn({
        ...common,
        publicationType: "article",
        publication: optionalHumanInputField(
          article?.publication,
          provenanceId,
          "Supply the publication or masthead name.",
        ),
        category: optionalHumanInputField(
          article?.category,
          provenanceId,
          "Supply the editorial category.",
        ),
        headline,
        author,
        publicationDate: publishedLabel,
        readingTime: missing(
          "awaiting-verification",
          "Calculate reading time from the final human-approved copy.",
        ),
        heroMediaAssetId: noMedia("Supply approved article hero media."),
        thesis: optionalHumanInputField(
          article?.thesis,
          provenanceId,
          "Identify the thesis during human editorial structuring.",
        ),
        pullQuotes: article?.pullQuote?.trim()
          ? provided(
              [
                {
                  id: "human-pull-quote-01",
                  quote: article.pullQuote.trim(),
                  attribution: optionalHumanInputField(
                    article.pullQuoteAttribution,
                    provenanceId,
                    "Supply the real attribution for this quotation.",
                  ),
                  provenanceIds: [provenanceId],
                },
              ],
              [provenanceId],
            )
          : missing(
              "not-provided",
              "Select pull quotes from approved source copy.",
            ),
        captions: missing(
          "not-provided",
          "Supply factual captions for approved media.",
        ),
        references: missing(
          "not-provided",
          "Supply the article's public references.",
        ),
        relatedContent: missing(
          "not-provided",
          "Select related content editorially; do not generate navigation filler.",
        ),
      });
    }
    case "report": {
      const report = structure.report;
      return validateAndReturn({
        ...common,
        publicationType: "report",
        institution: optionalHumanInputField(
          report?.institution,
          provenanceId,
          "Supply the issuing institution; the organization field is preserved without inference.",
        ),
        edition: optionalHumanInputField(
          report?.edition,
          provenanceId,
          "Supply the report edition or version.",
        ),
        abstract: optionalHumanInputField(
          report?.abstract,
          provenanceId,
          "Identify an abstract only from supplied report structure.",
        ),
        executiveSummary: optionalHumanInputField(
          report?.executiveSummary,
          provenanceId,
          "Identify an executive summary only from supplied report structure.",
        ),
        findings: optionalHumanFindings(report?.findings, provenanceId),
        datasets: missing("not-provided", "Supply referenced datasets."),
        charts: noMedia("Supply approved report charts."),
        methodology: optionalHumanInputField(
          report?.methodology,
          provenanceId,
          "Supply the documented methodology; do not infer it from internal evidence.",
        ),
        limitations: optionalHumanInputField(
          report?.limitations,
          provenanceId,
          "Supply documented limitations and caveats.",
        ),
        sources: missing("not-provided", "Supply public report sources."),
        faq: missing(
          "not-provided",
          "Supply editorially approved FAQ entries.",
        ),
        downloadMetadata: noMedia(
          "Supply an approved report file before showing a download.",
        ),
      });
    }
    default: {
      const unreachable: never = input.publicationType;
      throw new Error(`INVALID_PUBLICATION_TYPE: ${String(unreachable)}`);
    }
  }
}

type MutableStringSlot = {
  container: Record<string, unknown>;
  key: string;
  path: string;
};

function mutableRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function addProvidedStringSlot(
  slots: MutableStringSlot[],
  field: unknown,
  path: string,
): void {
  const record = mutableRecord(field);
  if (record?.status === "provided" && typeof record.value === "string") {
    slots.push({ container: record, key: "value", path });
  }
}

function providedArray(field: unknown): unknown[] {
  const record = mutableRecord(field);
  return record?.status === "provided" && Array.isArray(record.value)
    ? record.value
    : [];
}

function addSectionSlots(
  slots: MutableStringSlot[],
  brief: Record<string, unknown>,
  sectionId: string,
): void {
  const sectionFields = [
    "sections",
    "productUi",
    "featureChapters",
    "benefitChapters",
    "systemInUse",
    "implementation",
    "faq",
  ];
  for (const fieldName of sectionFields) {
    for (const item of providedArray(brief[fieldName])) {
      const section = mutableRecord(item);
      if (section?.id !== sectionId) continue;
      addProvidedStringSlot(slots, section.heading, `${fieldName}.${sectionId}.heading`);
      addProvidedStringSlot(slots, section.body, `${fieldName}.${sectionId}.body`);
      addProvidedStringSlot(slots, section.eyebrow, `${fieldName}.${sectionId}.eyebrow`);
    }
  }
}

function stringOccurrences(source: string, value: string): number {
  if (!value) return 0;
  let count = 0;
  let offset = 0;
  while (offset <= source.length - value.length) {
    const index = source.indexOf(value, offset);
    if (index < 0) break;
    count += 1;
    offset = index + value.length;
  }
  return count;
}

/**
 * Apply one approved or staged claim to the exact renderer target while
 * preserving the imported brief, media, brand tokens, and provenance. The
 * function fails closed when the target is unknown or the source text is not
 * unique inside that target.
 */
export function replacePublicationBriefClaim(
  brief: PublicationBrief,
  targetId: string,
  before: string,
  after: string,
): PublicationBrief {
  assertText(targetId, "claim targetId");
  assertText(before, "claim before text");
  assertText(after, "claim after text");

  const next = structuredClone(brief) as PublicationBrief;
  const record = next as unknown as Record<string, unknown>;
  const slots: MutableStringSlot[] = [];
  const commonFieldByTarget: Record<string, string> = {
    organization: "organization",
    title: "title",
    deck: "deck",
  };
  const typedFieldByTarget: Record<PublicationBriefType, Record<string, string>> = {
    launch: {
      "product-name": "productName",
      positioning: "positioning",
      availability: "availability",
      access: "pricingOrAccess",
      release: "releaseMetadata",
    },
    "case-study": {
      client: "client",
      project: "project",
      challenge: "challenge",
      insight: "insight",
      approach: "approach",
    },
    article: {
      publication: "publication",
      category: "category",
      headline: "headline",
      thesis: "thesis",
    },
    report: {
      institution: "institution",
      edition: "edition",
      abstract: "abstract",
      "executive-summary": "executiveSummary",
      methodology: "methodology",
      limitations: "limitations",
    },
  };

  const directField =
    commonFieldByTarget[targetId] ?? typedFieldByTarget[next.publicationType][targetId];
  if (directField) {
    addProvidedStringSlot(slots, record[directField], directField);
  } else if (targetId.startsWith("section:")) {
    addSectionSlots(slots, record, targetId.slice("section:".length));
  } else if (targetId.startsWith("use-case:")) {
    const id = targetId.slice("use-case:".length);
    for (const item of providedArray(record.useCases)) {
      const useCase = mutableRecord(item);
      if (useCase?.id !== id) continue;
      addProvidedStringSlot(slots, useCase.audience, `useCases.${id}.audience`);
      addProvidedStringSlot(slots, useCase.outcome, `useCases.${id}.outcome`);
    }
  } else if (targetId.startsWith("outcome:")) {
    const id = targetId.slice("outcome:".length);
    for (const item of providedArray(record.outcomes)) {
      const outcome = mutableRecord(item);
      if (outcome?.id === id && typeof outcome.statement === "string") {
        slots.push({ container: outcome, key: "statement", path: `outcomes.${id}` });
      }
    }
  } else if (targetId.startsWith("quote:")) {
    const id = targetId.slice("quote:".length);
    const quoteFields = [record.pullQuotes, record.testimonial];
    for (const field of quoteFields) {
      const candidates = providedArray(field);
      const single = mutableRecord(field)?.status === "provided"
        ? [mutableRecord(mutableRecord(field)?.value)]
        : [];
      for (const quote of [...candidates.map(mutableRecord), ...single]) {
        if (quote?.id === id && typeof quote.quote === "string") {
          slots.push({ container: quote, key: "quote", path: `quotes.${id}` });
        }
      }
    }
  } else if (targetId.startsWith("finding:")) {
    const id = targetId.slice("finding:".length);
    for (const item of providedArray(record.findings)) {
      const finding = mutableRecord(item);
      if (finding?.id !== id) continue;
      if (typeof finding.title === "string") {
        slots.push({ container: finding, key: "title", path: `findings.${id}.title` });
      }
      if (typeof finding.context === "string") {
        slots.push({ container: finding, key: "context", path: `findings.${id}.context` });
      }
    }
  }

  const matches = slots.flatMap((slot) => {
    const value = slot.container[slot.key];
    if (typeof value !== "string") return [];
    const count = stringOccurrences(value, before);
    return count === 0 ? [] : [{ slot, value, count }];
  });
  const totalMatches = matches.reduce((sum, match) => sum + match.count, 0);
  if (totalMatches !== 1 || matches.length !== 1) {
    throw new Error(
      `PUBLICATION_TARGET_MISMATCH: ${targetId} contains ${totalMatches} exact occurrence(s) of the claim; expected 1.`,
    );
  }
  const [{ slot, value }] = matches;
  slot.container[slot.key] = value.replace(before, after);
  validatePublicationBrief(next);
  return next;
}

export function createEmptyPublicationWorkspace(
  id = "workspace-empty",
): EmptyPublicationWorkspace {
  assertText(id, "workspace id");
  return {
    schemaVersion: PUBLICATION_BRIEF_SCHEMA_VERSION,
    state: "empty",
    id,
    revision: 0,
    publicationType: null,
    releaseStatus: "blocked",
    authority: {
      source: null,
      proposal: null,
      releaseCandidate: null,
    },
    humanDecisions: [],
    audit: [],
    demo: null,
  };
}

function nextAuditEvent(
  workspace: PublicationWorkspace,
  input: Omit<PublicationAuditEvent, "id" | "workspaceRevision">,
): PublicationAuditEvent {
  const nextRevision = workspace.revision + 1;
  return {
    ...input,
    id: `publication-audit-${String(workspace.audit.length + 1).padStart(3, "0")}`,
    workspaceRevision: nextRevision,
  };
}

function assertExpectedWorkspaceRevision(
  workspace: PublicationWorkspace,
  expectedWorkspaceRevision: number,
): void {
  if (workspace.revision !== expectedWorkspaceRevision) {
    throw new Error(
      `STALE_WORKSPACE: expected revision ${expectedWorkspaceRevision}, current revision is ${workspace.revision}.`,
    );
  }
}

export function loadPublicationSource<TBrief extends PublicationBrief>(
  workspace: PublicationWorkspace,
  brief: TBrief,
  input: {
    sourceId: string;
    loadedAt: string;
    loadedBy: WorkspaceActor;
    provenanceIds: readonly string[];
    expectedWorkspaceRevision: number;
  },
): ActivePublicationWorkspace<TBrief> {
  validatePublicationWorkspace(workspace);
  assertExpectedWorkspaceRevision(workspace, input.expectedWorkspaceRevision);
  validatePublicationBrief(brief);
  assertText(input.sourceId, "sourceId");
  assertIsoTimestamp(input.loadedAt, "loadedAt");
  if (input.provenanceIds.length === 0) {
    throw new Error("MISSING_PROVENANCE: a publication source needs provenance.");
  }
  const knownProvenance = new Set(brief.provenance.map((record) => record.id));
  for (const provenanceId of input.provenanceIds) {
    if (!knownProvenance.has(provenanceId)) {
      throw new Error(`UNKNOWN_PROVENANCE: source references ${provenanceId}.`);
    }
  }

  const sourceRevision =
    workspace.state === "active" ? workspace.authority.source.revision + 1 : 1;
  const event = nextAuditEvent(workspace, {
    at: input.loadedAt,
    actor: input.loadedBy,
    action: workspace.state === "empty" ? "SOURCE_LOADED" : "SOURCE_REPLACED",
    detail:
      workspace.state === "empty"
        ? "A publication source was loaded. Release remains blocked."
        : "The publication source changed. Any proposal and release candidate were invalidated.",
  });

  return {
    schemaVersion: PUBLICATION_BRIEF_SCHEMA_VERSION,
    state: "active",
    id: workspace.id,
    revision: workspace.revision + 1,
    publicationType: brief.publicationType,
    releaseStatus: "blocked",
    authority: {
      source: {
        authority: "source",
        sourceId: input.sourceId,
        revision: sourceRevision,
        loadedAt: input.loadedAt,
        loadedBy: input.loadedBy,
        provenanceIds: [...input.provenanceIds],
        brief: structuredClone(brief),
      },
      proposal: null,
      releaseCandidate: null,
    },
    humanDecisions: workspace.humanDecisions,
    audit: [...workspace.audit, event],
    demo: null,
  };
}

export function stagePublicationProposal<TBrief extends PublicationBrief>(
  workspace: ActivePublicationWorkspace<TBrief>,
  proposedBrief: TBrief,
  input: {
    proposalId: string;
    proposedAt: string;
    proposedBy: "agent" | "human";
    rationale: string;
    expectedWorkspaceRevision: number;
    expectedSourceRevision: number;
  },
): ActivePublicationWorkspace<TBrief> {
  validatePublicationWorkspace(workspace);
  assertExpectedWorkspaceRevision(workspace, input.expectedWorkspaceRevision);
  if (workspace.authority.source.revision !== input.expectedSourceRevision) {
    throw new Error(
      `STALE_SOURCE: expected revision ${input.expectedSourceRevision}, current revision is ${workspace.authority.source.revision}.`,
    );
  }
  if (proposedBrief.publicationType !== workspace.publicationType) {
    throw new Error(
      `PUBLICATION_TYPE_MISMATCH: source is ${workspace.publicationType}, proposal is ${proposedBrief.publicationType}.`,
    );
  }
  validatePublicationBrief(proposedBrief);
  assertText(input.proposalId, "proposalId");
  assertIsoTimestamp(input.proposedAt, "proposedAt");
  assertText(input.rationale, "proposal rationale");

  const proposal: ProposalAuthority<TBrief> = {
    authority: "proposal",
    proposalId: input.proposalId,
    revision: (workspace.authority.proposal?.revision ?? 0) + 1,
    baseSourceRevision: workspace.authority.source.revision,
    proposedAt: input.proposedAt,
    proposedBy: input.proposedBy,
    rationale: input.rationale,
    status: "pending-human-review",
    humanDecisionId: null,
    brief: structuredClone(proposedBrief),
  };
  const event = nextAuditEvent(workspace, {
    at: input.proposedAt,
    actor: input.proposedBy,
    action: "PROPOSAL_STAGED",
    detail:
      "A proposed publication direction was staged. It is not approved and cannot become a release candidate without a human decision.",
  });

  return {
    ...workspace,
    revision: workspace.revision + 1,
    releaseStatus: "human-review-pending",
    authority: {
      ...workspace.authority,
      proposal,
      releaseCandidate: null,
    },
    audit: [...workspace.audit, event],
  };
}

export function decidePublicationProposal<TBrief extends PublicationBrief>(
  workspace: ActivePublicationWorkspace<TBrief>,
  input: {
    id: string;
    actor: "human";
    decision: "approved" | "rejected";
    proposalId: string;
    expectedProposalRevision: number;
    expectedWorkspaceRevision: number;
    decidedAt: string;
    rationale: string;
  },
): ActivePublicationWorkspace<TBrief> {
  validatePublicationWorkspace(workspace);
  assertExpectedWorkspaceRevision(workspace, input.expectedWorkspaceRevision);
  if ((input as { actor: string }).actor !== "human") {
    throw new Error(
      "HUMAN_APPROVAL_REQUIRED: only a visible human action may decide a publication proposal.",
    );
  }
  const proposal = workspace.authority.proposal;
  if (!proposal || proposal.status !== "pending-human-review") {
    throw new Error("NO_PENDING_PROPOSAL: there is no proposal awaiting review.");
  }
  if (proposal.proposalId !== input.proposalId) {
    throw new Error(`UNKNOWN_PROPOSAL: ${input.proposalId}`);
  }
  if (proposal.revision !== input.expectedProposalRevision) {
    throw new Error(
      `STALE_PROPOSAL: expected revision ${input.expectedProposalRevision}, current revision is ${proposal.revision}.`,
    );
  }
  assertText(input.id, "human decision id");
  assertIsoTimestamp(input.decidedAt, "decidedAt");
  assertText(input.rationale, "human decision rationale");

  const decision: HumanApprovalDecision = {
    id: input.id,
    actor: "human",
    decision: input.decision,
    proposalId: proposal.proposalId,
    proposalRevision: proposal.revision,
    decidedAt: input.decidedAt,
    rationale: input.rationale,
  };
  const approved = decision.decision === "approved";
  if (approved) {
    assertGeneratedMediaHumanApproved(proposal.brief);
  }
  const decidedProposal: ProposalAuthority<TBrief> = {
    ...proposal,
    status: approved ? "approved" : "rejected",
    humanDecisionId: decision.id,
  };
  const releaseCandidate: ReleaseCandidateAuthority<TBrief> | null = approved
    ? {
        authority: "release-candidate",
        candidateId: `candidate-${proposal.proposalId}`,
        revision: 1,
        sourceRevision: workspace.authority.source.revision,
        proposalId: proposal.proposalId,
        approvedAt: decision.decidedAt,
        approval: { ...decision, decision: "approved" },
        brief: structuredClone(proposal.brief),
      }
    : null;
  const event = nextAuditEvent(workspace, {
    at: input.decidedAt,
    actor: "human",
    action: approved ? "PROPOSAL_APPROVED" : "PROPOSAL_REJECTED",
    detail: approved
      ? "A human approved the exact proposed direction. The candidate still requires the deterministic release gate."
      : "A human rejected the proposed direction. Release remains blocked.",
  });

  return {
    ...workspace,
    revision: workspace.revision + 1,
    releaseStatus: approved ? "candidate-approved-pending-gate" : "blocked",
    authority: {
      ...workspace.authority,
      proposal: decidedProposal,
      releaseCandidate,
    },
    humanDecisions: [...workspace.humanDecisions, decision],
    audit: [...workspace.audit, event],
  };
}

function assertGeneratedMediaHumanApproved(brief: PublicationBrief): void {
  const generatedById = new Map(
    brief.provenance
      .filter(
        (record): record is GeneratedAssetProvenance =>
          record.kind === "generated-asset",
      )
      .map((record) => [record.id, record]),
  );
  for (const asset of brief.mediaAssets) {
    for (const provenanceId of asset.provenanceIds) {
      const generated = generatedById.get(provenanceId);
      if (generated && generated.reviewStatus !== "approved-for-use") {
        throw new Error(
          `GENERATED_MEDIA_NOT_APPROVED: ${asset.id} references ${generated.id}.`,
        );
      }
    }
  }
}

export function validatePublicationWorkspace(
  workspace: PublicationWorkspace,
): void {
  if (workspace.state === "empty") {
    if (
      workspace.revision !== 0 ||
      workspace.publicationType !== null ||
      workspace.authority.source !== null ||
      workspace.authority.proposal !== null ||
      workspace.authority.releaseCandidate !== null ||
      workspace.releaseStatus !== "blocked" ||
      workspace.humanDecisions.length !== 0 ||
      workspace.audit.length !== 0
    ) {
      throw new Error("INVALID_EMPTY_WORKSPACE: empty state contains publication data.");
    }
    return;
  }

  const { source, proposal, releaseCandidate } = workspace.authority;
  assertUniqueIds(workspace.humanDecisions, "humanDecisions");
  for (const decision of workspace.humanDecisions) {
    if (decision.actor !== "human") {
      throw new Error(
        `INVALID_HUMAN_DECISION: ${decision.id} was not recorded by a human.`,
      );
    }
    assertIsoTimestamp(decision.decidedAt, `${decision.id}.decidedAt`);
    assertText(decision.rationale, `${decision.id}.rationale`);
  }
  validatePublicationBrief(source.brief);
  if (
    source.authority !== "source" ||
    source.brief.publicationType !== workspace.publicationType
  ) {
    throw new Error("INVALID_SOURCE_AUTHORITY: source does not match workspace.");
  }
  if (proposal) {
    validatePublicationBrief(proposal.brief);
    if (
      proposal.authority !== "proposal" ||
      proposal.brief.publicationType !== workspace.publicationType ||
      proposal.baseSourceRevision !== source.revision
    ) {
      throw new Error("INVALID_PROPOSAL_AUTHORITY: proposal is not source-bound.");
    }
    const linkedDecision = proposal.humanDecisionId
      ? workspace.humanDecisions.find(
          (decision) => decision.id === proposal.humanDecisionId,
        )
      : null;
    if (
      (proposal.status === "pending-human-review" && proposal.humanDecisionId) ||
      (proposal.status !== "pending-human-review" &&
        (!linkedDecision ||
          linkedDecision.proposalId !== proposal.proposalId ||
          linkedDecision.proposalRevision !== proposal.revision ||
          linkedDecision.decision !== proposal.status))
    ) {
      throw new Error(
        "INVALID_PROPOSAL_DECISION: proposal status is not backed by its exact human decision.",
      );
    }
  }
  if (releaseCandidate) {
    validatePublicationBrief(releaseCandidate.brief);
    const storedApproval = workspace.humanDecisions.find(
      (decision) => decision.id === releaseCandidate.approval.id,
    );
    if (
      releaseCandidate.authority !== "release-candidate" ||
      releaseCandidate.brief.publicationType !== workspace.publicationType ||
      releaseCandidate.sourceRevision !== source.revision ||
      releaseCandidate.approval.actor !== "human" ||
      releaseCandidate.approval.decision !== "approved" ||
      releaseCandidate.approval.proposalId !== releaseCandidate.proposalId ||
      proposal?.status !== "approved" ||
      proposal.humanDecisionId !== releaseCandidate.approval.id ||
      canonicalJson(releaseCandidate.brief) !== canonicalJson(proposal.brief) ||
      !storedApproval ||
      canonicalJson(storedApproval) !== canonicalJson(releaseCandidate.approval)
    ) {
      throw new Error(
        "INVALID_RELEASE_CANDIDATE: a candidate must bind the current source, approved proposal, and exact human decision.",
      );
    }
    assertGeneratedMediaHumanApproved(releaseCandidate.brief);
  }
  if (proposal?.status === "approved" && !releaseCandidate) {
    throw new Error(
      "INVALID_RELEASE_CANDIDATE: an approved proposal must retain its exact human-approved candidate.",
    );
  }

  const expectedStatus = releaseCandidate
    ? "candidate-approved-pending-gate"
    : proposal?.status === "pending-human-review"
      ? "human-review-pending"
      : "blocked";
  if (workspace.releaseStatus !== expectedStatus) {
    throw new Error(
      `INVALID_RELEASE_STATUS: expected ${expectedStatus}, found ${workspace.releaseStatus}.`,
    );
  }
}

const SELF_DEMO_AT = "2026-08-27T00:00:00.000Z";
const SELF_DEMO_SOURCE_ID = "proofrail-repository";

const selfDemoProvenance: readonly ProvenanceRecord[] = [
  {
    id: "proofrail-readme",
    kind: "repository-file",
    label: "ProofRail product and authority contract",
    path: "README.md",
    recordedAt: SELF_DEMO_AT,
    rights: "project-authored",
  },
  {
    id: "proofrail-trust-model",
    kind: "repository-file",
    label: "ProofRail trust model",
    path: "docs/THREAT_MODEL.md",
    recordedAt: SELF_DEMO_AT,
    rights: "project-authored",
  },
];

const selfDemoSection = (
  id: string,
  heading: string,
  body: string,
): PublicationSection => ({
  id,
  eyebrow: missing("not-provided", "Add an eyebrow only when it improves orientation."),
  heading: provided(heading, ["proofrail-readme"]),
  body: provided(body, ["proofrail-readme"]),
  mediaAssetIds: [],
});

export function createProofRailSelfDemoBrief(): LaunchPublicationBrief {
  const sections = [
    selfDemoSection(
      "self-demo-import",
      "Bring the publication you are preparing",
      "ProofRail begins with the source material a marketing or PR team plans to publish.",
    ),
    selfDemoSection(
      "self-demo-evidence",
      "Connect factual claims to evidence",
      "Agents can attach typed evidence and stage narrower wording without approving it. Six WebMCP tools share the live review workspace.",
    ),
    selfDemoSection(
      "self-demo-human-gate",
      "Keep release under human control",
      "An agent may prepare a proposal, but only a human decision can create a release candidate.",
    ),
  ] as const;

  const brief: LaunchPublicationBrief = {
    schemaVersion: PUBLICATION_BRIEF_SCHEMA_VERSION,
    publicationType: "launch",
    organization: provided("ProofRail", ["proofrail-readme"]),
    title: provided(
      "ProofRail keeps public claims locked until a human approves the final wording.",
      ["proofrail-readme", "proofrail-trust-model"],
    ),
    deck: provided(
      "Preview the finished publication, connect factual language to evidence, and keep release locked until a human approves the exact candidate.",
      ["proofrail-readme", "proofrail-trust-model"],
    ),
    sections: provided(sections, ["proofrail-readme"]),
    brandTokens: missing(
      "not-provided",
      "Use the ProofRail application shell until approved publication brand tokens are supplied.",
    ),
    mediaAssets: [],
    provenance: selfDemoProvenance,
    accessibilityMetadata: {
      language: "en",
      readingDirection: "ltr",
      motionAlternative: missing(
        "not-applicable",
        "This source-only self-demo contains no cinematic or animated media.",
      ),
      editorialNotes: provided(
        [
          "This is ProofRail reviewing its own documented product contract.",
          "It contains no customer, testimonial, adoption metric, or invented KPI.",
        ],
        ["proofrail-readme", "proofrail-trust-model"],
      ),
    },
    productName: provided("ProofRail", ["proofrail-readme"]),
    positioning: provided(
      "A pre-publication claim review and human approval workspace for marketing and PR teams.",
      ["proofrail-readme"],
    ),
    productUi: missing(
      "not-provided",
      "Add only a current, human-approved screenshot of the real ProofRail interface.",
    ),
    featureChapters: provided(sections, ["proofrail-readme"]),
    benefitChapters: missing(
      "awaiting-verification",
      "Add benefits only after they are supported by observed user or workflow evidence.",
    ),
    useCases: provided(
      [
        {
          id: "use-case-publication-review",
          audience: provided("Marketing and PR teams", ["proofrail-readme"]),
          outcome: provided(
            "Review a launch, case study, article, or report before release.",
            ["proofrail-readme"],
          ),
        },
      ],
      ["proofrail-readme"],
    ),
    releaseMetadata: provided(
      "A passing receipt seals the publication text, evidence matrix, human decisions, revision, and SHA-256 content hash.",
      ["proofrail-readme", "proofrail-trust-model"],
    ),
    availability: provided(
      "Available as the ProofRail WebMCP challenge prototype.",
      ["proofrail-readme"],
    ),
    pricingOrAccess: missing(
      "not-applicable",
      "No pricing or commercial access claim is part of this self-demo.",
    ),
    proofMetrics: missing(
      "awaiting-verification",
      "No adoption, performance, or customer metric is shown without a verified source.",
    ),
    specifications: provided(
      [
        {
          id: "spec-authority-boundary",
          label: "Approval authority",
          value: "Human only",
          provenanceIds: ["proofrail-readme", "proofrail-trust-model"],
        },
        {
          id: "spec-agent-boundary",
          label: "Agent capability",
          value: "Inspect, attach evidence, and stage proposals",
          provenanceIds: ["proofrail-readme", "proofrail-trust-model"],
        },
      ],
      ["proofrail-readme", "proofrail-trust-model"],
    ),
    cta: provided(
      {
        label: "Import a publication",
        destination: provided("#import-publication", ["proofrail-readme"]),
      },
      ["proofrail-readme"],
    ),
    gallery: missing(
      "not-provided",
      "Add only current ProofRail product captures that pass human visual review.",
    ),
  };

  validatePublicationBrief(brief);
  return brief;
}

export function createProofRailSelfDemoWorkspace(): ActivePublicationWorkspace<LaunchPublicationBrief> {
  const workspace = loadPublicationSource(
    createEmptyPublicationWorkspace("workspace-proofrail-self-demo"),
    createProofRailSelfDemoBrief(),
    {
      sourceId: SELF_DEMO_SOURCE_ID,
      loadedAt: SELF_DEMO_AT,
      loadedBy: "system",
      provenanceIds: ["proofrail-readme", "proofrail-trust-model"],
      expectedWorkspaceRevision: 0,
    },
  );
  const selfDemo: ActivePublicationWorkspace<LaunchPublicationBrief> = {
    ...workspace,
    demo: {
      kind: "proofrail-self-demo",
      label: "Verified ProofRail self-demo",
      disclosure:
        "This optional demo uses only ProofRail's own repository-authored material. It is not customer data and contains no invented customer claim.",
      provenanceIds: ["proofrail-readme", "proofrail-trust-model"],
    },
  };
  validatePublicationWorkspace(selfDemo);
  return selfDemo;
}
