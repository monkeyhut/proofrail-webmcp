"use client";

import { Fragment, type ReactNode } from "react";
import {
  buildPublicationPreview,
  type PublicationPreviewVariant,
  type PublicationType,
  type ReviewClaim,
  type Workspace,
} from "../lib/proofrail";

const publicationLabels: Record<PublicationType, string> = {
  "project-page": "Project page",
  "blog-post": "Blog post",
  "launch-page": "Launch page",
  report: "Report",
};

const publicationKickers: Record<PublicationType, string> = {
  "project-page": "Project preview",
  "blog-post": "Article preview",
  "launch-page": "Launch preview",
  report: "Report preview",
};

function claimPreviewState(
  claim: ReviewClaim,
  variant: PublicationPreviewVariant,
): "draft" | "staged" | "approved" {
  if (variant === "proposed" && claim.proposal?.status === "staged") {
    return "staged";
  }
  if (claim.humanApproval === "approved") return "approved";
  return "draft";
}

function annotatedPreviewText(
  text: string,
  claims: ReviewClaim[],
  selectedClaimId: string,
  variant: PublicationPreviewVariant,
  onSelectClaim: (claimId: string) => void,
): ReactNode[] {
  const matches = claims
    .map((claim) => ({ claim, start: text.indexOf(claim.text) }))
    .filter((match) => match.start >= 0)
    .sort((a, b) => a.start - b.start);

  if (matches.length === 0) return [text];

  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start < cursor) continue;
    if (match.start > cursor) parts.push(text.slice(cursor, match.start));
    const previewState = claimPreviewState(match.claim, variant);
    const statusLabel =
      previewState === "staged"
        ? "AI staged, preview only"
        : previewState === "approved"
          ? "Human approved"
          : "Draft, not approved";
    parts.push(
      <button
        key={match.claim.id}
        className="preview-claim"
        data-preview-state={previewState}
        onClick={() => onSelectClaim(match.claim.id)}
        aria-label={`Claim ${match.claim.number}, ${statusLabel}: ${match.claim.text}`}
        aria-pressed={selectedClaimId === match.claim.id}
        aria-controls="inspection-bay"
      >
        {match.claim.text}
        <span aria-hidden="true">C-{match.claim.number}</span>
      </button>,
    );
    cursor = match.start + match.claim.text.length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

export function PublicationPreview({
  workspace,
  selectedClaimId,
  variant,
  size,
  onVariantChange,
  onSelectClaim,
}: {
  workspace: Workspace;
  selectedClaimId: string;
  variant: PublicationPreviewVariant;
  size: "compact" | "full";
  onVariantChange: (variant: PublicationPreviewVariant) => void;
  onSelectClaim: (claimId: string) => void;
}) {
  const projection = buildPublicationPreview(workspace, variant);
  const renderedVariant = projection.errorCode ? "current" : variant;
  const stagedCount = projection.stagedClaimIds.length;
  const paragraphs = projection.body.split(/\n\n+/);
  const bodyClaims = projection.claims.filter((claim) => claim.location === "body");
  const headlineClaims = projection.claims.filter(
    (claim) => claim.location === "headline",
  );
  const wordCount = `${projection.headline} ${projection.body}`
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <article
      className={`publication-preview publication-preview-${size} publication-type-${projection.publicationType}`}
      aria-label={`${publicationLabels[projection.publicationType]} publication preview`}
    >
      <header className="publication-preview__chrome">
        <div className="preview-window-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="preview-address">
          preview.proofrail.local/{projection.publicationType}
        </div>
        <strong
          className={
            projection.gateStatus === "pass"
              ? "preview-gate is-ready"
              : "preview-gate is-locked"
          }
        >
          {projection.gateStatus === "pass"
            ? "Human approved · ready to publish"
            : "Preview only · publish locked"}
        </strong>
      </header>

      <div className="publication-preview__controls">
        <div>
          <span className="publication-preview__type">
            {publicationLabels[projection.publicationType]}
          </span>
          <small>Layout preview · exact words, simulated presentation</small>
        </div>
        <div className="preview-variant-switch" role="group" aria-label="Preview version">
          <button
            type="button"
            className={renderedVariant === "current" ? "is-active" : ""}
            onClick={() => onVariantChange("current")}
            aria-pressed={renderedVariant === "current"}
          >
            Current draft
          </button>
          <button
            type="button"
            className={renderedVariant === "proposed" ? "is-active" : ""}
            onClick={() => onVariantChange("proposed")}
            aria-pressed={renderedVariant === "proposed"}
            disabled={stagedCount === 0}
          >
            {stagedCount > 0
              ? `AI proposal · ${stagedCount} not approved`
              : "No AI proposal yet"}
          </button>
        </div>
      </div>

      {projection.errorCode && (
        <p className="preview-error" role="alert">
          Proposal preview unavailable: the staged wording does not produce one
          complete, unambiguous claim map for this revision. The unchanged draft
          is shown.
        </p>
      )}

      <div className="publication-preview__canvas">
        <div className="publication-preview__masthead" aria-label="Simulated publication header">
          <strong>Publication preview</strong>
          <span>{publicationLabels[projection.publicationType]}</span>
        </div>
        <div className="publication-preview__body">
          <div className="preview-document-meta">
            <span>{publicationKickers[projection.publicationType]}</span>
            <span>{wordCount} words</span>
            <span>
              {projection.sealedContentRevision
                ? `Content sealed · R${projection.sealedContentRevision}`
                : `Revision ${projection.sourceWorkspaceRevision}`}
            </span>
          </div>
          <h2>
            {annotatedPreviewText(
              projection.headline,
              headlineClaims,
              selectedClaimId,
              renderedVariant,
              onSelectClaim,
            ).map((part, index) => (
              <Fragment key={index}>{part}</Fragment>
            ))}
          </h2>
          <div className="preview-publication-copy">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>
                {annotatedPreviewText(
                  paragraph,
                  bodyClaims,
                  selectedClaimId,
                  renderedVariant,
                  onSelectClaim,
                ).map((part, partIndex) => (
                  <Fragment key={partIndex}>{part}</Fragment>
                ))}
              </p>
            ))}
          </div>
        </div>
        <footer className="publication-preview__legend">
          <span data-preview-state="draft">Draft · not approved</span>
          <span data-preview-state="staged">AI staged · preview only</span>
          <span data-preview-state="approved">Human approved</span>
        </footer>
      </div>
    </article>
  );
}
