"use client";

import type {
  LaunchPublicationBrief,
  PublicationField,
  PublicationSection,
} from "../../lib/publication-brief";
import {
  fieldProvenance,
  MissingReference,
  MissingSlot,
  ProofTarget,
  PublicationMedia,
  publicationBrandStyle,
} from "./renderer-primitives";
import type { RendererProps } from "./renderer-types";
import styles from "./launch-renderer.module.css";

export type LaunchRendererProps = RendererProps<LaunchPublicationBrief>;

function LaunchChapter({
  section,
  brief,
  proofOverlay,
  index,
}: {
  section: PublicationSection;
  brief: LaunchPublicationBrief;
  proofOverlay: LaunchRendererProps["proofOverlay"];
  index: number;
}) {
  return (
    <ProofTarget
      targetId={`section:${section.id}`}
      proofOverlay={proofOverlay}
      className={styles.chapter}
    >
      <div className={styles.chapterCopy}>
        <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
        {section.eyebrow.status === "provided" ? (
          <p className={styles.eyebrow} {...fieldProvenance(section.eyebrow)}>
            {section.eyebrow.value}
          </p>
        ) : (
          <MissingSlot label="Chapter eyebrow" field={section.eyebrow} />
        )}
        {section.heading.status === "provided" ? (
          <h3 {...fieldProvenance(section.heading)}>{section.heading.value}</h3>
        ) : (
          <MissingSlot label="Chapter heading" field={section.heading} />
        )}
        {section.body.status === "provided" ? (
          <p className={styles.chapterBody} {...fieldProvenance(section.body)}>
            {section.body.value}
          </p>
        ) : (
          <MissingSlot label="Chapter body" field={section.body} />
        )}
      </div>
      <div className={styles.chapterMedia}>
        {section.mediaAssetIds.length ? (
          section.mediaAssetIds.map((assetId) => (
            <PublicationMedia
              key={assetId}
              assetId={assetId}
              assets={brief.mediaAssets}
              provenance={brief.provenance}
              proofOverlay={proofOverlay}
            />
          ))
        ) : (
          <MissingReference
            label="Chapter media"
            request="Add only a supplied product capture or approved explanatory asset for this chapter."
          />
        )}
      </div>
    </ProofTarget>
  );
}

function sectionIds(
  ...fields: Array<PublicationField<readonly PublicationSection[]>>
): Set<string> {
  return new Set(
    fields.flatMap((field) =>
      field.status === "provided" ? field.value.map((section) => section.id) : [],
    ),
  );
}

export function LaunchRenderer({ brief, proofOverlay }: LaunchRendererProps) {
  const productMediaId =
    brief.productUi.status === "provided"
      ? brief.productUi.value.flatMap((chapter) => chapter.mediaAssetIds)[0]
      : undefined;
  const specializedIds = sectionIds(
    brief.productUi,
    brief.featureChapters,
    brief.benefitChapters,
  );
  const supplementalSections =
    brief.sections.status === "provided"
      ? brief.sections.value.filter((section) => !specializedIds.has(section.id))
      : [];

  return (
    <article
      className={styles.launch}
      style={publicationBrandStyle(brief.brandTokens)}
      lang={brief.accessibilityMetadata.language}
      dir={brief.accessibilityMetadata.readingDirection}
    >
      <header
        className={styles.hero}
        data-product-visual={productMediaId ? "provided" : "missing"}
      >
        <div className={styles.heroCopy}>
          <ProofTarget targetId="organization" proofOverlay={proofOverlay}>
            {brief.organization.status === "provided" ? (
              <p className={styles.organization} {...fieldProvenance(brief.organization)}>
                {brief.organization.value}
              </p>
            ) : (
              <MissingSlot label="Organization" field={brief.organization} />
            )}
          </ProofTarget>

          <ProofTarget targetId="product-name" proofOverlay={proofOverlay}>
            {brief.productName.status === "provided" ? (
              <p className={styles.productName} {...fieldProvenance(brief.productName)}>
                {brief.productName.value}
              </p>
            ) : (
              <MissingSlot label="Product name" field={brief.productName} />
            )}
          </ProofTarget>

          <ProofTarget targetId="title" proofOverlay={proofOverlay}>
            {brief.title.status === "provided" ? (
              <h1 {...fieldProvenance(brief.title)}>{brief.title.value}</h1>
            ) : (
              <MissingSlot label="Launch title" field={brief.title} />
            )}
          </ProofTarget>

          <ProofTarget targetId="positioning" proofOverlay={proofOverlay}>
            {brief.positioning.status === "provided" ? (
              <p className={styles.positioning} {...fieldProvenance(brief.positioning)}>
                {brief.positioning.value}
              </p>
            ) : (
              <MissingSlot label="Positioning" field={brief.positioning} />
            )}
          </ProofTarget>

          <ProofTarget targetId="deck" proofOverlay={proofOverlay}>
            {brief.deck.status === "provided" ? (
              <p className={styles.deck} {...fieldProvenance(brief.deck)}>
                {brief.deck.value}
              </p>
            ) : (
              <MissingSlot label="Launch deck" field={brief.deck} />
            )}
          </ProofTarget>

          <ProofTarget targetId="cta" proofOverlay={proofOverlay}>
            {brief.cta.status === "provided" ? (
              brief.cta.value.destination.status === "provided" ? (
                <a
                  className={styles.cta}
                  href={brief.cta.value.destination.value}
                  {...fieldProvenance(brief.cta)}
                >
                  <span>{brief.cta.value.label}</span>
                  <span aria-hidden="true">↗</span>
                </a>
              ) : (
                <div className={styles.ctaMissing}>
                  <strong>{brief.cta.value.label}</strong>
                  <MissingSlot
                    label="CTA destination"
                    field={brief.cta.value.destination}
                  />
                </div>
              )
            ) : (
              <MissingSlot label="Launch action" field={brief.cta} />
            )}
          </ProofTarget>
        </div>

        <div className={styles.heroProduct}>
          <p>Supplied product interface</p>
          {productMediaId ? (
            <PublicationMedia
              assetId={productMediaId}
              assets={brief.mediaAssets}
              provenance={brief.provenance}
              proofOverlay={proofOverlay}
            />
          ) : brief.productUi.status === "missing" ? (
            <MissingSlot label="Product interface" field={brief.productUi} />
          ) : (
            <MissingReference
              label="Product interface"
              request="The supplied product chapters contain no referenced interface media. Add an approved current capture."
            />
          )}
        </div>
      </header>

      <section className={styles.releaseStrip} aria-label="Release information">
        {([
          ["Release", brief.releaseMetadata],
          ["Availability", brief.availability],
          ["Access", brief.pricingOrAccess],
        ] as const).map(([label, field]) => (
          <ProofTarget key={label} targetId={label.toLowerCase()} proofOverlay={proofOverlay}>
            <div className={styles.releaseFact}>
              <span>{label}</span>
              {field.status === "provided" ? (
                <strong {...fieldProvenance(field)}>{field.value}</strong>
              ) : (
                <MissingSlot label={label} field={field} />
              )}
            </div>
          </ProofTarget>
        ))}
      </section>

      <section className={styles.productChapters} aria-labelledby="launch-interface-title">
        <header className={styles.sectionHeading}>
          <span>01</span>
          <h2 id="launch-interface-title">The product in use</h2>
        </header>
        {brief.productUi.status === "provided" ? (
          brief.productUi.value.map((chapter, index) => (
            <LaunchChapter
              key={chapter.id}
              section={chapter}
              brief={brief}
              proofOverlay={proofOverlay}
              index={index}
            />
          ))
        ) : (
          <MissingSlot label="Product interface chapters" field={brief.productUi} />
        )}
      </section>

      <section className={styles.featureGrid} aria-labelledby="launch-features-title">
        <header className={styles.sectionHeading}>
          <span>02</span>
          <h2 id="launch-features-title">Capabilities and benefits</h2>
        </header>
        <div>
          {brief.featureChapters.status === "provided" ? (
            brief.featureChapters.value.map((section, index) => (
              <LaunchChapter
                key={section.id}
                section={section}
                brief={brief}
                proofOverlay={proofOverlay}
                index={index}
              />
            ))
          ) : (
            <MissingSlot label="Feature chapters" field={brief.featureChapters} />
          )}
          {brief.benefitChapters.status === "provided" ? (
            brief.benefitChapters.value.map((section, index) => (
              <LaunchChapter
                key={section.id}
                section={section}
                brief={brief}
                proofOverlay={proofOverlay}
                index={
                  index +
                  (brief.featureChapters.status === "provided"
                    ? brief.featureChapters.value.length
                    : 0)
                }
              />
            ))
          ) : (
            <MissingSlot label="Benefit chapters" field={brief.benefitChapters} />
          )}
          {supplementalSections.map((section, index) => (
            <LaunchChapter
              key={section.id}
              section={section}
              brief={brief}
              proofOverlay={proofOverlay}
              index={index}
            />
          ))}
        </div>
      </section>

      <section className={styles.useCases} aria-labelledby="launch-use-cases-title">
        <header className={styles.sectionHeading}>
          <span>03</span>
          <h2 id="launch-use-cases-title">Who it is for</h2>
        </header>
        {brief.useCases.status === "provided" ? (
          <div className={styles.useCaseGrid}>
            {brief.useCases.value.map((useCase) => (
              <ProofTarget
                key={useCase.id}
                targetId={`use-case:${useCase.id}`}
                proofOverlay={proofOverlay}
                className={styles.useCase}
              >
                {useCase.audience.status === "provided" ? (
                  <h3 {...fieldProvenance(useCase.audience)}>{useCase.audience.value}</h3>
                ) : (
                  <MissingSlot label="Use-case audience" field={useCase.audience} />
                )}
                {useCase.outcome.status === "provided" ? (
                  <p {...fieldProvenance(useCase.outcome)}>{useCase.outcome.value}</p>
                ) : (
                  <MissingSlot label="Use-case outcome" field={useCase.outcome} />
                )}
              </ProofTarget>
            ))}
          </div>
        ) : (
          <MissingSlot label="Use cases" field={brief.useCases} />
        )}
      </section>

      <section className={styles.proof} aria-labelledby="launch-proof-title">
        <header className={styles.sectionHeading}>
          <span>04</span>
          <h2 id="launch-proof-title">Proof with context</h2>
        </header>
        {brief.proofMetrics.status === "provided" ? (
          <div className={styles.metricGrid}>
            {brief.proofMetrics.value.map((metric) => (
              <ProofTarget
                key={metric.id}
                targetId={`metric:${metric.id}`}
                proofOverlay={proofOverlay}
                className={styles.metric}
              >
                <strong>{metric.value}</strong>
                <h3>{metric.label}</h3>
                <p>{metric.context}</p>
                <small>Sources: {metric.sourceIds.join(" · ")}</small>
                {metric.caveat.status === "provided" ? (
                  <em {...fieldProvenance(metric.caveat)}>{metric.caveat.value}</em>
                ) : (
                  <MissingSlot label="Metric caveat" field={metric.caveat} />
                )}
              </ProofTarget>
            ))}
          </div>
        ) : (
          <MissingSlot label="Verified proof metrics" field={brief.proofMetrics} />
        )}
      </section>

      <section className={styles.specifications} aria-labelledby="launch-spec-title">
        <header className={styles.sectionHeading}>
          <span>05</span>
          <h2 id="launch-spec-title">Specifications</h2>
        </header>
        {brief.specifications.status === "provided" ? (
          <dl>
            {brief.specifications.value.map((specification) => (
              <div
                key={specification.id}
                data-provenance-ids={specification.provenanceIds.join(" ")}
              >
                <dt>{specification.label}</dt>
                <dd>{specification.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <MissingSlot label="Specifications" field={brief.specifications} />
        )}
      </section>

      <section className={styles.gallery} aria-labelledby="launch-gallery-title">
        <header className={styles.sectionHeading}>
          <span>06</span>
          <h2 id="launch-gallery-title">Supplied gallery</h2>
        </header>
        {brief.gallery.status === "provided" ? (
          <div>
            {brief.gallery.value.map((assetId) => (
              <PublicationMedia
                key={assetId}
                assetId={assetId}
                assets={brief.mediaAssets}
                provenance={brief.provenance}
                proofOverlay={proofOverlay}
              />
            ))}
          </div>
        ) : (
          <MissingSlot label="Launch gallery" field={brief.gallery} />
        )}
      </section>

      {brief.brandTokens.status === "missing" ? (
        <MissingSlot
          className={styles.brandMissing}
          label="Publication brand tokens"
          field={brief.brandTokens}
        />
      ) : null}
    </article>
  );
}
