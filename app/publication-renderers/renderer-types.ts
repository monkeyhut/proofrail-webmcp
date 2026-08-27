import type { PublicationBrief } from "../../lib/publication-brief";

export type PublicationViewport = "desktop" | "tablet" | "mobile";

/**
 * `targetId` binds a real claim to a stable renderer slot. Renderers expose
 * targets such as `title`, `deck`, `section:<id>`, `media:<id>`,
 * `metric:<id>`, and `finding:<id>`.
 */
export type PublicationProofAnchor = {
  claimId: string;
  targetId: string;
  label?: string;
};

export type PublicationProofOverlay = {
  anchors: readonly PublicationProofAnchor[];
  selectedClaimId?: string | null;
  onSelectClaim?: (claimId: string, targetId: string) => void;
};

export type RendererProps<TBrief extends PublicationBrief> = {
  brief: TBrief;
  proofOverlay?: PublicationProofOverlay;
};
