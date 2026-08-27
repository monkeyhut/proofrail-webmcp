"use client";

import type {
  ArticlePublicationBrief,
  PublicationSection,
} from "../../lib/publication-brief";
import {
  fieldProvenance,
  MissingSlot,
  ProofTarget,
  PublicationMedia,
  publicationBrandStyle,
} from "./renderer-primitives";
import type { RendererProps } from "./renderer-types";
import styles from "./article-renderer.module.css";

export type ArticleRendererProps = RendererProps<ArticlePublicationBrief>;

function ArticleSection({
  section,
  brief,
  proofOverlay,
  index,
}: {
  section: PublicationSection;
  brief: ArticlePublicationBrief;
  proofOverlay: ArticleRendererProps["proofOverlay"];
  index: number;
}) {
  const headingId = `article-section-${section.id}`;
  const hasHeading = section.heading.status === "provided";

  return (
    <section
      className={styles.bodySection}
      aria-labelledby={hasHeading ? headingId : undefined}
      aria-label={hasHeading ? undefined : `Article section ${index + 1}`}
    >
      <div className={styles.sectionMargin}>
        <span>{String(index + 1).padStart(2, "0")}</span>
        {section.eyebrow.status === "provided" ? (
          <p {...fieldProvenance(section.eyebrow)}>{section.eyebrow.value}</p>
        ) : (
          <MissingSlot label="Section eyebrow" field={section.eyebrow} />
        )}
      </div>
      <ProofTarget
        targetId={`section:${section.id}`}
        proofOverlay={proofOverlay}
        className={styles.sectionCopy}
      >
        {section.heading.status === "provided" ? (
          <h2
            id={headingId}
            {...fieldProvenance(section.heading)}
          >
            {section.heading.value}
          </h2>
        ) : (
          <MissingSlot label="Section heading" field={section.heading} />
        )}
        {section.body.status === "provided" ? (
          <p className={styles.prose} {...fieldProvenance(section.body)}>
            {section.body.value}
          </p>
        ) : (
          <MissingSlot label="Section body" field={section.body} />
        )}
      </ProofTarget>
      <div className={styles.sectionMedia}>
        {section.mediaAssetIds.map((assetId) => (
          <PublicationMedia
            key={assetId}
            assetId={assetId}
            assets={brief.mediaAssets}
            provenance={brief.provenance}
            proofOverlay={proofOverlay}
          />
        ))}
      </div>
    </section>
  );
}

export function ArticleRenderer({ brief, proofOverlay }: ArticleRendererProps) {
  return (
    <article
      className={styles.article}
      style={publicationBrandStyle(brief.brandTokens)}
      lang={brief.accessibilityMetadata.language}
      dir={brief.accessibilityMetadata.readingDirection}
    >
      <header className={styles.masthead}>
        <div className={styles.publicationLine}>
          <ProofTarget targetId="publication" proofOverlay={proofOverlay}>
            {brief.publication.status === "provided" ? (
              <strong {...fieldProvenance(brief.publication)}>
                {brief.publication.value}
              </strong>
            ) : (
              <MissingSlot label="Publication" field={brief.publication} />
            )}
          </ProofTarget>
          <ProofTarget targetId="organization" proofOverlay={proofOverlay}>
            {brief.organization.status === "provided" ? (
              <span {...fieldProvenance(brief.organization)}>
                {brief.organization.value}
              </span>
            ) : (
              <MissingSlot label="Publishing organization" field={brief.organization} />
            )}
          </ProofTarget>
        </div>

        <div className={styles.headlineGrid}>
          <div className={styles.storyMeta}>
            <ProofTarget targetId="category" proofOverlay={proofOverlay}>
              {brief.category.status === "provided" ? (
                <p className={styles.category} {...fieldProvenance(brief.category)}>
                  {brief.category.value}
                </p>
              ) : (
                <MissingSlot label="Article category" field={brief.category} />
              )}
            </ProofTarget>
            <ProofTarget targetId="title" proofOverlay={proofOverlay}>
              {brief.title.status === "provided" &&
              (brief.headline.status !== "provided" ||
                brief.title.value !== brief.headline.value) ? (
                <p className={styles.seriesTitle} {...fieldProvenance(brief.title)}>
                  {brief.title.value}
                </p>
              ) : brief.title.status === "missing" ? (
                <MissingSlot label="Article series or working title" field={brief.title} />
              ) : null}
            </ProofTarget>
          </div>

          <div className={styles.headlineBlock}>
            <ProofTarget targetId="headline" proofOverlay={proofOverlay}>
              {brief.headline.status === "provided" ? (
                <h1 {...fieldProvenance(brief.headline)}>{brief.headline.value}</h1>
              ) : (
                <MissingSlot label="Article headline" field={brief.headline} />
              )}
            </ProofTarget>
            <ProofTarget targetId="deck" proofOverlay={proofOverlay}>
              {brief.deck.status === "provided" ? (
                <p className={styles.deck} {...fieldProvenance(brief.deck)}>
                  {brief.deck.value}
                </p>
              ) : (
                <MissingSlot label="Article deck" field={brief.deck} />
              )}
            </ProofTarget>
          </div>
        </div>

        <dl className={styles.byline}>
          <div>
            <dt>Written by</dt>
            <dd>
              {brief.author.status === "provided" ? (
                <span {...fieldProvenance(brief.author)}>{brief.author.value}</span>
              ) : (
                <MissingSlot label="Author" field={brief.author} />
              )}
            </dd>
          </div>
          <div>
            <dt>Published</dt>
            <dd>
              {brief.publicationDate.status === "provided" ? (
                <span {...fieldProvenance(brief.publicationDate)}>
                  {brief.publicationDate.value}
                </span>
              ) : (
                <MissingSlot label="Publication date" field={brief.publicationDate} />
              )}
            </dd>
          </div>
          <div>
            <dt>Reading time</dt>
            <dd>
              {brief.readingTime.status === "provided" ? (
                <span {...fieldProvenance(brief.readingTime)}>
                  {brief.readingTime.value}
                </span>
              ) : (
                <MissingSlot label="Reading time" field={brief.readingTime} />
              )}
            </dd>
          </div>
        </dl>
      </header>

      <section className={styles.heroMedia} aria-label="Article lead media">
        {brief.heroMediaAssetId.status === "provided" ? (
          <PublicationMedia
            assetId={brief.heroMediaAssetId.value}
            assets={brief.mediaAssets}
            provenance={brief.provenance}
            proofOverlay={proofOverlay}
          />
        ) : (
          <MissingSlot label="Article hero media" field={brief.heroMediaAssetId} />
        )}
      </section>

      <ProofTarget
        targetId="thesis"
        proofOverlay={proofOverlay}
        className={styles.thesis}
      >
        <span>Thesis</span>
        {brief.thesis.status === "provided" ? (
          <p {...fieldProvenance(brief.thesis)}>{brief.thesis.value}</p>
        ) : (
          <MissingSlot label="Article thesis" field={brief.thesis} />
        )}
      </ProofTarget>

      <div className={styles.body}>
        {brief.sections.status === "provided" ? (
          brief.sections.value.map((section, index) => (
            <ArticleSection
              key={section.id}
              section={section}
              brief={brief}
              proofOverlay={proofOverlay}
              index={index}
            />
          ))
        ) : (
          <MissingSlot label="Article chapters" field={brief.sections} />
        )}
      </div>

      <section className={styles.quotes} aria-labelledby="article-quotes-title">
        <header>
          <span>Selected passages</span>
          <h2 id="article-quotes-title">In their words</h2>
        </header>
        {brief.pullQuotes.status === "provided" ? (
          <div>
            {brief.pullQuotes.value.map((quote) => (
              <ProofTarget
                key={quote.id}
                targetId={`quote:${quote.id}`}
                proofOverlay={proofOverlay}
              >
                <blockquote data-provenance-ids={quote.provenanceIds.join(" ")}>
                  <p>“{quote.quote}”</p>
                  {quote.attribution.status === "provided" ? (
                    <cite {...fieldProvenance(quote.attribution)}>
                      {quote.attribution.value}
                    </cite>
                  ) : (
                    <MissingSlot label="Quote attribution" field={quote.attribution} />
                  )}
                </blockquote>
              </ProofTarget>
            ))}
          </div>
        ) : (
          <MissingSlot label="Pull quotes" field={brief.pullQuotes} />
        )}
      </section>

      <section className={styles.captionRegister} aria-label="Editorial captions">
        <span>Caption register</span>
        {brief.captions.status === "provided" ? (
          <ol {...fieldProvenance(brief.captions)}>
            {brief.captions.value.map((caption, index) => (
              <li key={`${index}-${caption}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{caption}</p>
              </li>
            ))}
          </ol>
        ) : (
          <MissingSlot label="Editorial captions" field={brief.captions} />
        )}
      </section>

      <section className={styles.referenceGrid}>
        <div>
          <h2>References</h2>
          {brief.references.status === "provided" ? (
            <ol {...fieldProvenance(brief.references)}>
              {brief.references.value.map((reference) => (
                <li key={reference.id} data-provenance-id={reference.provenanceId}>
                  <span>{reference.label}</span>
                  <small>{reference.provenanceId}</small>
                </li>
              ))}
            </ol>
          ) : (
            <MissingSlot label="Article references" field={brief.references} />
          )}
        </div>
        <div>
          <h2>Related content</h2>
          {brief.relatedContent.status === "provided" ? (
            <ol {...fieldProvenance(brief.relatedContent)}>
              {brief.relatedContent.value.map((reference) => (
                <li key={reference.id} data-provenance-id={reference.provenanceId}>
                  <span>{reference.label}</span>
                  <small>{reference.provenanceId}</small>
                </li>
              ))}
            </ol>
          ) : (
            <MissingSlot label="Related content" field={brief.relatedContent} />
          )}
        </div>
      </section>

      <footer className={styles.editorialFooter}>
        {brief.brandTokens.status === "missing" ? (
          <MissingSlot label="Publication brand tokens" field={brief.brandTokens} />
        ) : null}
        {brief.accessibilityMetadata.editorialNotes.status === "provided" ? (
          <ul {...fieldProvenance(brief.accessibilityMetadata.editorialNotes)}>
            {brief.accessibilityMetadata.editorialNotes.value.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : (
          <MissingSlot
            label="Editorial accessibility notes"
            field={brief.accessibilityMetadata.editorialNotes}
          />
        )}
      </footer>
    </article>
  );
}
