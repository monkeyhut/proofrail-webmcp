"use client";

import type { CSSProperties, ReactNode } from "react";
import type {
  AuthorityState,
  BrandTokens,
  MissingField,
  PublicationField,
  PublicationMediaAsset,
  ProvenanceRecord,
} from "../../lib/publication-brief";
import type { PublicationProofOverlay } from "./renderer-types";
import styles from "./renderer-primitives.module.css";

export function fieldProvenance<T>(field: PublicationField<T>) {
  return field.status === "provided"
    ? { "data-provenance-ids": field.provenanceIds.join(" ") }
    : {};
}

export function publicationBrandStyle(
  brandTokens: PublicationField<BrandTokens>,
): CSSProperties {
  if (brandTokens.status === "missing") return {};

  return {
    "--publication-background": brandTokens.value.background,
    "--publication-foreground": brandTokens.value.foreground,
    "--publication-accent": brandTokens.value.accent,
    "--publication-display-font": brandTokens.value.displayFont,
    "--publication-body-font": brandTokens.value.bodyFont,
  } as CSSProperties;
}

export function MissingSlot({
  label,
  field,
  className,
}: {
  label: string;
  field: MissingField;
  className?: string;
}) {
  return (
    <aside className={[styles.missing, className].filter(Boolean).join(" ")}>
      <span>{label} / missing</span>
      <strong>{field.reason.replaceAll("-", " ")}</strong>
      <p>{field.request}</p>
    </aside>
  );
}

export function MissingReference({
  label,
  request,
  className,
}: {
  label: string;
  request: string;
  className?: string;
}) {
  return (
    <aside className={[styles.missing, className].filter(Boolean).join(" ")}>
      <span>{label} / unavailable</span>
      <strong>Referenced material is unavailable</strong>
      <p>{request}</p>
    </aside>
  );
}

export function ProofTarget({
  targetId,
  proofOverlay,
  children,
  className,
}: {
  targetId: string;
  proofOverlay?: PublicationProofOverlay;
  children: ReactNode;
  className?: string;
}) {
  const anchors = proofOverlay?.anchors.filter(
    (anchor) => anchor.targetId === targetId,
  );
  const selected = anchors?.some(
    (anchor) => anchor.claimId === proofOverlay?.selectedClaimId,
  );

  return (
    <div
      className={[
        styles.proofTarget,
        selected ? styles.proofTargetSelected : undefined,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-proof-target={targetId}
      data-proof-selected={selected ? "true" : undefined}
    >
      {children}
      {anchors?.length ? (
        <div className={styles.proofMarkers} aria-label="Claims linked to this content">
          {anchors.map((anchor, index) => {
            const markerLabel = anchor.label ?? anchor.claimId;
            const isSelected = anchor.claimId === proofOverlay?.selectedClaimId;

            return proofOverlay?.onSelectClaim ? (
              <button
                type="button"
                key={`${anchor.claimId}-${index}`}
                className={isSelected ? styles.proofMarkerSelected : undefined}
                aria-pressed={isSelected}
                aria-label={`Select claim ${markerLabel}`}
                onClick={() =>
                  proofOverlay.onSelectClaim?.(anchor.claimId, targetId)
                }
              >
                C{index + 1}
              </button>
            ) : (
              <span
                key={`${anchor.claimId}-${index}`}
                className={isSelected ? styles.proofMarkerSelected : undefined}
                title={markerLabel}
              >
                C{index + 1}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function mediaAlt(asset: PublicationMediaAsset): string | null {
  if (asset.alt.status === "provided") return asset.alt.value;
  return asset.role === "decorative" ? "" : null;
}

function MediaCaption({ asset }: { asset: PublicationMediaAsset }) {
  if (asset.caption.status === "missing") {
    if (asset.role === "decorative") return null;
    return <MissingSlot label="Media caption" field={asset.caption} />;
  }

  return (
    <figcaption {...fieldProvenance(asset.caption)}>
      <span>{asset.caption.value}</span>
      <small>Provenance: {asset.caption.provenanceIds.join(" · ")}</small>
    </figcaption>
  );
}

export function PublicationMedia({
  assetId,
  assets,
  provenance,
  proofOverlay,
  className,
}: {
  assetId: string;
  assets: readonly PublicationMediaAsset[];
  provenance: readonly ProvenanceRecord[];
  proofOverlay?: PublicationProofOverlay;
  className?: string;
}) {
  const asset = assets.find((candidate) => candidate.id === assetId);

  if (!asset) {
    return (
      <MissingReference
        className={className}
        label="Publication media"
        request={`The publication references media asset ${assetId}, but that asset is not present in the brief.`}
      />
    );
  }

  const alt = mediaAlt(asset);
  if (alt === null) {
    return (
      <MissingSlot
        className={className}
        label="Accessible media alternative"
        field={asset.alt.status === "missing" ? asset.alt : {
          status: "missing",
          reason: "awaiting-human-input",
          request: "Provide an accessible text alternative before this media is shown.",
        }}
      />
    );
  }

  const provenanceRecords = asset.provenanceIds
    .map((id) => provenance.find((record) => record.id === id))
    .filter((record): record is ProvenanceRecord => Boolean(record));
  const poster =
    asset.kind === "video" || asset.kind === "interactive-3d"
      ? assets.find(
          (candidate) =>
            candidate.id === asset.posterAssetId && candidate.kind === "image",
        )
      : null;
  const posterSource = poster?.kind === "image" ? poster.src : undefined;

  return (
    <ProofTarget
      targetId={`media:${asset.id}`}
      proofOverlay={proofOverlay}
      className={className}
    >
      <figure
        className={styles.media}
        data-media-role={asset.role}
        data-provenance-ids={asset.provenanceIds.join(" ")}
      >
        {asset.kind === "image" ? (
          // The URL, dimensions, loading behavior, and alternative are all brief-owned.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.src}
            width={asset.width}
            height={asset.height}
            loading={asset.loading}
            alt={alt}
          />
        ) : asset.kind === "video" ? (
          <video
            controls
            preload="metadata"
            width={asset.width}
            height={asset.height}
            poster={posterSource}
            aria-label={alt}
          >
            <source src={asset.src} type={asset.mimeType} />
          </video>
        ) : asset.kind === "interactive-3d" ? (
          <div className={styles.interactiveMedia}>
            {poster?.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={poster.src}
                width={poster.width}
                height={poster.height}
                loading="lazy"
                alt={alt}
              />
            ) : (
              <MissingReference
                label="3D poster"
                request={`Interactive asset ${asset.id} requires its referenced poster before display.`}
              />
            )}
            <div>
              <strong>Interactive 3D asset</strong>
              {asset.keyboardInstructions.status === "provided" ? (
                <p {...fieldProvenance(asset.keyboardInstructions)}>
                  {asset.keyboardInstructions.value}
                </p>
              ) : (
                <MissingSlot
                  label="Keyboard instructions"
                  field={asset.keyboardInstructions}
                />
              )}
              <a href={asset.src}>Open supplied GLB asset</a>
            </div>
          </div>
        ) : (
          <div className={styles.documentMedia}>
            <strong>{alt}</strong>
            <span>
              {asset.pageCount.status === "provided"
                ? `${asset.pageCount.value} pages`
                : "Page count not provided"}
            </span>
            <a href={asset.src}>Open supplied document</a>
          </div>
        )}

        <MediaCaption asset={asset} />

        {provenanceRecords.length ? (
          <details className={styles.mediaProvenance}>
            <summary>Media provenance</summary>
            <ul>
              {provenanceRecords.map((record) => (
                <li key={record.id}>
                  <strong>{record.label}</strong>
                  <span>{record.kind} · {record.rights}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </figure>
    </ProofTarget>
  );
}

const authorityLabels: Record<AuthorityState, { title: string; detail: string }> = {
  source: {
    title: "Current source",
    detail: "Imported material · not a release decision",
  },
  proposal: {
    title: "Proposed direction",
    detail: "Awaiting an explicit human decision",
  },
  "release-candidate": {
    title: "Release candidate",
    detail: "Human-approved direction · release gate still applies",
  },
};

export function AuthorityBadge({
  authority,
  revision,
}: {
  authority: AuthorityState;
  revision: number;
}) {
  const copy = authorityLabels[authority];

  return (
    <div className={styles.authority} data-authority={authority}>
      <span aria-hidden="true" />
      <div>
        <strong>{copy.title}</strong>
        <small>{copy.detail} · revision {revision}</small>
      </div>
    </div>
  );
}
