export type BrandDirection =
  | "precision"
  | "editorial"
  | "institutional"
  | "kinetic";

export type HeroFocalPoint = "left" | "center" | "right";

/**
 * Short, non-claim layout metadata exposed to the import form and WebMCP.
 * Binary media is deliberately omitted from agent snapshots.
 */
export type PreviewProfile = {
  brandName: string;
  direction: BrandDirection;
  industry: string;
  audience: string;
  author: string;
  publishedLabel: string;
  ctaLabel: string;
  subjectName?: string;
  heroAssetUrl?: string;
  heroAssetAlt?: string;
  heroFocalPoint?: HeroFocalPoint;
};
