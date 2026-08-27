"use client";

import { Fragment, type CSSProperties, type ReactNode } from "react";
import {
  buildPublicationPreview,
  type PublicationPreviewVariant,
  type PublicationType,
  type ReviewClaim,
  type Workspace,
} from "../lib/proofrail";
import {
  extractPublicationMetric,
  type PublicationMetric,
} from "../lib/publication-metrics";
import styles from "./publication-preview.module.css";

export type BrandDirection =
  | "precision"
  | "editorial"
  | "institutional"
  | "kinetic";

export type HeroFocalPoint = "left" | "center" | "right";

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

const publicationLabels: Record<PublicationType, string> = {
  "project-page": "Case study",
  "blog-post": "Journal article",
  "launch-page": "Product launch",
  report: "Research report",
};

const publicationTabs: Array<{ type: PublicationType; label: string }> = [
  { type: "launch-page", label: "Launch" },
  { type: "project-page", label: "Project" },
  { type: "blog-post", label: "Blog" },
  { type: "report", label: "Report" },
];

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
  proofMode: boolean,
  onSelectClaim: (claimId: string) => void,
): ReactNode[] {
  if (!proofMode) return [text];

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
        className={`${styles.claim} ${selectedClaimId === match.claim.id ? styles.selected : ""}`}
        data-preview-state={previewState}
        data-selected={selectedClaimId === match.claim.id ? "true" : "false"}
        onClick={() => onSelectClaim(match.claim.id)}
        aria-label={`Claim ${match.claim.number}, ${statusLabel}: ${match.claim.text}`}
        aria-pressed={selectedClaimId === match.claim.id}
        aria-controls="inspection-bay"
      >
        {match.claim.text}
        <span aria-hidden="true">{match.claim.number}</span>
      </button>,
    );
    cursor = match.start + match.claim.text.length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

function initials(name: string) {
  const value = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return value || "PR";
}

function HeroAsset({
  profile,
  metric,
  label,
}: {
  profile: PreviewProfile;
  metric: PublicationMetric | null;
  label: string;
}) {
  const style = profile.heroAssetUrl
    ? ({
        "--preview-hero": `url(${profile.heroAssetUrl})`,
        backgroundPosition: profile.heroFocalPoint ?? "center",
      } as CSSProperties)
    : undefined;

  return (
    <div
      className={`${styles.heroAsset} ${profile.heroAssetUrl ? styles.heroAssetProvided : styles.heroAssetGenerated}`}
      style={style}
      role="img"
      aria-label={
        profile.heroAssetUrl
          ? profile.heroAssetAlt?.trim() ||
            `${profile.brandName} supplied publication artwork`
          : metric
            ? `${profile.brandName} typographic art direction using the supplied metric ${metric.value}`
            : `${profile.brandName} typographic art direction`
      }
    >
      {!profile.heroAssetUrl && (
        <>
          <div className={styles.assetMonogram}>{initials(profile.brandName)}</div>
          {metric && <div className={styles.assetMetric}>{metric.value}</div>}
          <div className={styles.assetRail} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <small>{label}</small>
        </>
      )}
    </div>
  );
}

export function PublicationPreview({
  workspace,
  profile,
  selectedClaimId,
  variant,
  mode,
  size,
  onVariantChange,
  onModeChange,
  onTypeChange,
  onDirectionChange,
  onSelectClaim,
}: {
  workspace: Workspace;
  profile: PreviewProfile;
  selectedClaimId: string;
  variant: PublicationPreviewVariant;
  mode: "public" | "proof";
  size: "compact" | "full" | "hero";
  onVariantChange: (variant: PublicationPreviewVariant) => void;
  onModeChange: (mode: "public" | "proof") => void;
  onTypeChange: (type: PublicationType) => void;
  onDirectionChange: (direction: BrandDirection) => void;
  onSelectClaim: (claimId: string) => void;
}) {
  const projection = buildPublicationPreview(workspace, variant);
  const renderedVariant = projection.errorCode ? "current" : variant;
  const stagedCount = projection.stagedClaimIds.length;
  const paragraphs = projection.body
    .split(/\r?\n[\t ]*\r?\n+|\u2029+/)
    .filter(Boolean);
  const bodyClaims = projection.claims.filter((claim) => claim.location === "body");
  const headlineClaims = projection.claims.filter(
    (claim) => claim.location === "headline",
  );
  const wordCount = `${projection.headline} ${projection.body}`
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 220));
  const revision =
    projection.sealedContentRevision ?? projection.sourceWorkspaceRevision;
  const isReady = projection.gateStatus === "pass";
  const metric = extractPublicationMetric(
    projection.headline,
    projection.body,
  );

  const renderText = (text: string, claims: ReviewClaim[]) =>
    annotatedPreviewText(
      text,
      claims,
      selectedClaimId,
      renderedVariant,
      mode === "proof",
      onSelectClaim,
    ).map((part, index) => <Fragment key={index}>{part}</Fragment>);

  const renderedHeadline = renderText(projection.headline, headlineClaims);
  const renderedParagraphs = paragraphs.map((paragraph, index) => (
    <p key={index}>{renderText(paragraph, bodyClaims)}</p>
  ));
  const renderedBlogDeck = paragraphs[0] ? (
    <p className={styles.articleDeck} id="article-premise">
      {renderText(paragraphs[0], bodyClaims)}
    </p>
  ) : null;
  const renderedBlogBody = paragraphs.slice(1).map((paragraph, index) => (
    <p key={index} id={index === 0 ? "article-details" : undefined}>
      {renderText(paragraph, bodyClaims)}
    </p>
  ));
  const bodyClaimCards = bodyClaims.map((claim, index) => (
    <article key={claim.id}>
      <span>{String(index + 1).padStart(2, "0")}</span>
      <p>{renderText(claim.text, [claim])}</p>
    </article>
  ));

  return (
    <section
      className={`${styles.root} ${styles[size]} ${mode === "proof" ? styles.proofMode : styles.publicMode}`}
      data-publication-type={projection.publicationType}
      data-brand-direction={profile.direction}
      aria-label={`${publicationLabels[projection.publicationType]} publication preview`}
    >
      <header className={styles.previewToolbar}>
        <div className={styles.previewIdentity}>
          <span>Publication format</span>
          <strong>{publicationLabels[projection.publicationType]}</strong>
          <small>Changing format resets a sealed receipt.</small>
        </div>
        <nav className={styles.typeSwitch} aria-label="Preview publication format">
          {publicationTabs.map((item) => (
            <button
              key={item.type}
              type="button"
              className={projection.publicationType === item.type ? styles.active : ""}
              aria-pressed={projection.publicationType === item.type}
              onClick={() => onTypeChange(item.type)}
            >
              {item.label}
            </button>
          ))}
          <small className={styles.formatWarning}>
            Format change resets receipt
          </small>
        </nav>
        <label className={styles.directionControl}>
          <span>Art direction</span>
          <select
            value={profile.direction}
            onChange={(event) =>
              onDirectionChange(event.target.value as BrandDirection)
            }
          >
            <option value="precision">Precision tech</option>
            <option value="editorial">Editorial human</option>
            <option value="institutional">Institutional</option>
            <option value="kinetic">Bold consumer</option>
          </select>
        </label>
        <div className={styles.modeSwitch} role="group" aria-label="Preview layer">
          <button
            type="button"
            className={mode === "public" ? styles.active : ""}
            onClick={() => onModeChange("public")}
            aria-pressed={mode === "public"}
          >
            Public page
          </button>
          <button
            type="button"
            className={mode === "proof" ? styles.active : ""}
            onClick={() => onModeChange("proof")}
            aria-pressed={mode === "proof"}
          >
            Proof overlay
          </button>
        </div>
      </header>

      <div className={styles.statusRail}>
        <span>{profile.brandName} · {profile.industry}</span>
        <strong className={isReady ? styles.ready : styles.locked}>
          {isReady ? "Ready to publish" : "Preview only · publish locked"}
        </strong>
      </div>

      {projection.errorCode && (
        <p className={styles.error} role="alert">
          Proposal preview unavailable: staged wording no longer maps exactly to
          this revision. The unchanged public draft is shown.
        </p>
      )}

      <div
        className={styles.canvas}
        key={`${projection.publicationType}-${renderedVariant}-${mode}-${profile.direction}`}
      >
        {projection.publicationType === "launch-page" && (
          <article className={styles.launchPage} aria-label="Product launch page">
            <header className={styles.siteNav}>
              <strong>{profile.brandName}</strong>
              <nav aria-label="Simulated launch navigation">
                <span>Product</span><span>Security</span><span>Company</span>
              </nav>
              <span className={styles.navCta}>{profile.ctaLabel}</span>
            </header>
            <section className={styles.launchHero}>
              <div className={styles.launchCopy}>
                <span className={styles.eyebrow}>Introducing / {profile.publishedLabel}</span>
                <h2>{renderedHeadline}</h2>
                <div className={styles.launchDeck}>{renderedParagraphs}</div>
                <div className={styles.launchActions}>
                  <span>{profile.ctaLabel}</span>
                  <small>Explore the release ↓</small>
                </div>
              </div>
              <HeroAsset
                profile={profile}
                metric={metric}
                label={metric ? "Claimed measure" : "Art direction study"}
              />
            </section>
            <section className={styles.launchFeatures} aria-label="Launch proof points">
              {bodyClaimCards}
            </section>
          </article>
        )}

        {projection.publicationType === "project-page" && (
          <article className={styles.projectPage} aria-label="Project case study page">
            <header className={styles.projectNav}>
              <strong>{profile.brandName} / Work</strong>
              <span>Selected project · {profile.publishedLabel}</span>
            </header>
            <section className={styles.projectHero}>
              <div className={styles.projectTitle}>
                <span>Case study / outcome</span>
                <h2>{renderedHeadline}</h2>
              </div>
              <HeroAsset
                profile={profile}
                metric={metric}
                label={metric ? "Claimed outcome" : "Project art direction"}
              />
            </section>
            <dl className={styles.projectFacts}>
              <div><dt>Client / subject</dt><dd>{profile.subjectName?.trim() || "Not specified"}</dd></div>
              <div><dt>Field</dt><dd>{profile.industry}</dd></div>
              <div><dt>Audience</dt><dd>{profile.audience}</dd></div>
              <div><dt>Published</dt><dd>{profile.publishedLabel}</dd></div>
            </dl>
            <section className={styles.projectStory}>
              <div>
                <span>{metric ? "The stated outcome" : "Project focus"}</span>
                <strong className={metric ? "" : styles.projectFocus}>
                  {metric?.value ?? profile.industry}
                </strong>
              </div>
              <div>{renderedParagraphs}</div>
            </section>
          </article>
        )}

        {projection.publicationType === "blog-post" && (
          <article className={styles.blogPage} aria-label="Editorial blog article">
            <header className={styles.blogMasthead}>
              <strong>{profile.brandName} / Journal</strong>
              <nav aria-label="Simulated publication sections">
                <span>Ideas</span><span>Product</span><span>Practice</span>
              </nav>
            </header>
            <section className={styles.blogLead}>
              <div className={styles.blogLeadCopy}>
                <span className={styles.eyebrow}>Field note / {profile.industry}</span>
                <h2>{renderedHeadline}</h2>
                <div className={styles.byline}>
                  <span className={styles.avatar}>{initials(profile.author)}</span>
                  <p><strong>{profile.author}</strong><small>{profile.publishedLabel} · {readingMinutes} min read</small></p>
                </div>
              </div>
              <HeroAsset profile={profile} metric={null} label="Editorial lead" />
            </section>
            <section className={styles.articleBody}>
              <aside>
                <span>In this story</span>
                {renderedBlogDeck && <a href="#article-premise">Opening note</a>}
                {renderedBlogBody.length > 0 && <a href="#article-details">Details</a>}
              </aside>
              <div id="article-copy" className={styles.readingColumn}>
                {renderedBlogDeck}
                {renderedBlogBody}
              </div>
            </section>
          </article>
        )}

        {projection.publicationType === "report" && (
          <article className={styles.reportPage} aria-label="Research report page">
            <header className={styles.reportNav}>
              <strong>{profile.brandName} / Research</strong>
              <span>Report · R{revision}</span>
            </header>
            <section className={styles.reportCover}>
              <div>
                <span className={styles.eyebrow}>Research report / {profile.publishedLabel}</span>
                <h2>{renderedHeadline}</h2>
                <p>Prepared for {profile.audience}</p>
              </div>
              <div className={styles.reportMark} aria-hidden="true">
                <span>R</span>
                <strong>{metric?.value ?? initials(profile.subjectName || profile.brandName)}</strong>
                <small>{profile.publishedLabel}</small>
              </div>
            </section>
            <section className={styles.reportIntro}>
              <nav aria-label="Simulated report table of contents">
                <span>Contents</span>
                <a href="#report-summary">01 / Executive summary</a>
                <a href="#report-finding">02 / Key finding</a>
              </nav>
              <div id="report-summary">
                <span>Executive summary</span>
                {renderedParagraphs}
              </div>
            </section>
            <section
              className={`${styles.reportFinding} ${metric?.visualPercent == null ? styles.reportFindingNarrative : ""}`}
              id="report-finding"
            >
              <div>
                <span>Key finding 01</span>
                <strong className={metric ? "" : styles.findingWord}>
                  {metric?.value ?? "Finding"}
                </strong>
              </div>
              {metric?.visualPercent != null && (
                <div
                  className={styles.exhibit}
                  aria-label={`Visualization of the stated metric ${metric.value}`}
                >
                  <span style={{ width: `${metric.visualPercent}%` }} />
                </div>
              )}
              <p>{renderedHeadline}</p>
            </section>
          </article>
        )}

        {mode === "proof" && (
          <aside className={styles.proofLegend} aria-label="Proof overlay legend">
            <strong>Proof layer</strong>
            <span data-preview-state="draft">Open</span>
            <span data-preview-state="staged">AI proposal</span>
            <span data-preview-state="approved">Human approved</span>
          </aside>
        )}
      </div>

      <footer className={styles.previewFooter}>
        <div className={styles.variantSwitch} role="group" aria-label="Preview version">
          <button
            type="button"
            className={renderedVariant === "current" ? styles.active : ""}
            onClick={() => onVariantChange("current")}
            aria-pressed={renderedVariant === "current"}
          >
            Current draft
          </button>
          <button
            type="button"
            className={renderedVariant === "proposed" ? styles.active : ""}
            onClick={() => onVariantChange("proposed")}
            aria-pressed={renderedVariant === "proposed"}
            disabled={stagedCount === 0}
          >
            {stagedCount > 0 ? `AI proposal · ${stagedCount} open` : "No proposal staged"}
          </button>
        </div>
        <p>
          {profile.heroAssetUrl
            ? "Layout simulation using the supplied publication asset."
            : "Layout + art-direction simulation. Add a real hero asset in Import for an exact media preview."}{" "}
          Short layout labels are metadata; put every factual statement in the
          headline or body so it enters the proof gate and receipt.
        </p>
      </footer>
    </section>
  );
}
