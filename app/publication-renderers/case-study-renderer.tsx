"use client";

import type {
  CaseStudyPublicationBrief,
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
import styles from "./case-study-renderer.module.css";

export type CaseStudyRendererProps = RendererProps<CaseStudyPublicationBrief>;

function StorySection({
  section,
  brief,
  proofOverlay,
  index,
}: {
  section: PublicationSection;
  brief: CaseStudyPublicationBrief;
  proofOverlay: CaseStudyRendererProps["proofOverlay"];
  index: number;
}) {
  return (
    <ProofTarget
      targetId={`section:${section.id}`}
      proofOverlay={proofOverlay}
      className={styles.storySection}
    >
      <div className={styles.storyNumber}>{String(index + 1).padStart(2, "0")}</div>
      <div className={styles.storyCopy}>
        {section.eyebrow.status === "provided" ? (
          <p className={styles.kicker} {...fieldProvenance(section.eyebrow)}>
            {section.eyebrow.value}
          </p>
        ) : (
          <MissingSlot label="Section eyebrow" field={section.eyebrow} />
        )}
        {section.heading.status === "provided" ? (
          <h3 {...fieldProvenance(section.heading)}>{section.heading.value}</h3>
        ) : (
          <MissingSlot label="Section heading" field={section.heading} />
        )}
        {section.body.status === "provided" ? (
          <p className={styles.storyBody} {...fieldProvenance(section.body)}>
            {section.body.value}
          </p>
        ) : (
          <MissingSlot label="Section body" field={section.body} />
        )}
      </div>
      <div className={styles.storyMedia}>
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
            label="Project evidence"
            request="Add supplied project imagery only when it documents this exact part of the work."
          />
        )}
      </div>
    </ProofTarget>
  );
}

export function CaseStudyRenderer({
  brief,
  proofOverlay,
}: CaseStudyRendererProps) {
  const coverAssetId =
    brief.gallery.status === "provided"
      ? brief.gallery.value[0]
      : brief.systemInUse.status === "provided"
        ? brief.systemInUse.value.flatMap((section) => section.mediaAssetIds)[0]
        : undefined;
  const specializedSectionIds = new Set(
    [brief.systemInUse, brief.implementation].flatMap((field) =>
      field.status === "provided" ? field.value.map((section) => section.id) : [],
    ),
  );
  const supplementalSections =
    brief.sections.status === "provided"
      ? brief.sections.value.filter(
          (section) => !specializedSectionIds.has(section.id),
        )
      : [];
  const narrativeSections = [
    ...(brief.systemInUse.status === "provided" ? brief.systemInUse.value : []),
    ...(brief.implementation.status === "provided" ? brief.implementation.value : []),
    ...supplementalSections,
  ];

  return (
    <article
      className={styles.caseStudy}
      style={publicationBrandStyle(brief.brandTokens)}
      lang={brief.accessibilityMetadata.language}
      dir={brief.accessibilityMetadata.readingDirection}
    >
      <header className={styles.cover}>
        <div className={styles.coverTopline}>
          <ProofTarget targetId="organization" proofOverlay={proofOverlay}>
            {brief.organization.status === "provided" ? (
              <span {...fieldProvenance(brief.organization)}>
                {brief.organization.value}
              </span>
            ) : (
              <MissingSlot label="Publishing organization" field={brief.organization} />
            )}
          </ProofTarget>
          <span>Case study</span>
        </div>

        <div className={styles.coverTitle}>
          <div>
            <ProofTarget targetId="client" proofOverlay={proofOverlay}>
              {brief.client.status === "provided" ? (
                <p className={styles.client} {...fieldProvenance(brief.client)}>
                  {brief.client.value}
                </p>
              ) : (
                <MissingSlot label="Client" field={brief.client} />
              )}
            </ProofTarget>
            <ProofTarget targetId="project" proofOverlay={proofOverlay}>
              {brief.project.status === "provided" ? (
                <p className={styles.project} {...fieldProvenance(brief.project)}>
                  {brief.project.value}
                </p>
              ) : (
                <MissingSlot label="Project" field={brief.project} />
              )}
            </ProofTarget>
          </div>

          <ProofTarget targetId="title" proofOverlay={proofOverlay}>
            {brief.title.status === "provided" ? (
              <h1 {...fieldProvenance(brief.title)}>{brief.title.value}</h1>
            ) : (
              <MissingSlot label="Case-study title" field={brief.title} />
            )}
          </ProofTarget>

          <ProofTarget targetId="deck" proofOverlay={proofOverlay}>
            {brief.deck.status === "provided" ? (
              <p className={styles.deck} {...fieldProvenance(brief.deck)}>
                {brief.deck.value}
              </p>
            ) : (
              <MissingSlot label="Case-study deck" field={brief.deck} />
            )}
          </ProofTarget>
        </div>

        <div className={styles.coverMedia}>
          {coverAssetId ? (
            <PublicationMedia
              assetId={coverAssetId}
              assets={brief.mediaAssets}
              provenance={brief.provenance}
              proofOverlay={proofOverlay}
            />
          ) : brief.gallery.status === "missing" ? (
            <MissingSlot label="Case-study cover" field={brief.gallery} />
          ) : (
            <MissingReference
              label="Case-study cover"
              request="No supplied project image is assigned to the cover."
            />
          )}
        </div>
      </header>

      <section className={styles.metadata} aria-label="Project scope and roles">
        <div>
          <span>Roles</span>
          {brief.roles.status === "provided" ? (
            <ul {...fieldProvenance(brief.roles)}>
              {brief.roles.value.map((role) => <li key={role}>{role}</li>)}
            </ul>
          ) : (
            <MissingSlot label="Project roles" field={brief.roles} />
          )}
        </div>
        <div>
          <span>Scope</span>
          {brief.scope.status === "provided" ? (
            <ul {...fieldProvenance(brief.scope)}>
              {brief.scope.value.map((scopeItem) => <li key={scopeItem}>{scopeItem}</li>)}
            </ul>
          ) : (
            <MissingSlot label="Project scope" field={brief.scope} />
          )}
        </div>
      </section>

      <section className={styles.problemFrame} aria-label="Challenge and insight">
        <ProofTarget targetId="challenge" proofOverlay={proofOverlay}>
          <div className={styles.challenge}>
            <span>01 / Challenge</span>
            {brief.challenge.status === "provided" ? (
              <h2 {...fieldProvenance(brief.challenge)}>{brief.challenge.value}</h2>
            ) : (
              <MissingSlot label="Challenge" field={brief.challenge} />
            )}
          </div>
        </ProofTarget>
        <ProofTarget targetId="insight" proofOverlay={proofOverlay}>
          <div className={styles.insight}>
            <span>02 / Insight</span>
            {brief.insight.status === "provided" ? (
              <blockquote {...fieldProvenance(brief.insight)}>
                {brief.insight.value}
              </blockquote>
            ) : (
              <MissingSlot label="Insight" field={brief.insight} />
            )}
          </div>
        </ProofTarget>
      </section>

      <ProofTarget
        targetId="approach"
        proofOverlay={proofOverlay}
        className={styles.approach}
      >
        <span>03 / Approach</span>
        {brief.approach.status === "provided" ? (
          <p {...fieldProvenance(brief.approach)}>{brief.approach.value}</p>
        ) : (
          <MissingSlot label="Approach" field={brief.approach} />
        )}
      </ProofTarget>

      <section className={styles.narrative} aria-labelledby="case-system-title">
        <header>
          <span>04 / System in use</span>
          <h2 id="case-system-title">From rationale to real application</h2>
        </header>
        {narrativeSections.length ? (
          narrativeSections.map((section, index) => (
            <StorySection
              key={section.id}
              section={section}
              brief={brief}
              proofOverlay={proofOverlay}
              index={index}
            />
          ))
        ) : (
          <div className={styles.missingNarrative}>
            {brief.systemInUse.status === "missing" ? (
              <MissingSlot label="System in use" field={brief.systemInUse} />
            ) : null}
            {brief.implementation.status === "missing" ? (
              <MissingSlot label="Implementation" field={brief.implementation} />
            ) : null}
            {brief.sections.status === "missing" ? (
              <MissingSlot label="Case-study sections" field={brief.sections} />
            ) : null}
          </div>
        )}
      </section>

      <section className={styles.outcomes} aria-labelledby="case-outcomes-title">
        <header>
          <span>05 / Outcomes</span>
          <h2 id="case-outcomes-title">What the evidence supports</h2>
        </header>
        {brief.outcomes.status === "provided" ? (
          <ol>
            {brief.outcomes.value.map((outcome, index) => (
              <li
                key={outcome.id}
                data-provenance-ids={outcome.provenanceIds.join(" ")}
              >
                <ProofTarget
                  targetId={`outcome:${outcome.id}`}
                  proofOverlay={proofOverlay}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{outcome.statement}</p>
                </ProofTarget>
              </li>
            ))}
          </ol>
        ) : (
          <MissingSlot label="Verified outcomes" field={brief.outcomes} />
        )}

        {brief.metrics.status === "provided" ? (
          <div className={styles.metrics}>
            {brief.metrics.value.map((metric) => (
              <ProofTarget
                key={metric.id}
                targetId={`metric:${metric.id}`}
                proofOverlay={proofOverlay}
              >
                <article>
                  <strong>{metric.value}</strong>
                  <h3>{metric.label}</h3>
                  <p>{metric.context}</p>
                  <small>Sources: {metric.sourceIds.join(" · ")}</small>
                  {metric.caveat.status === "provided" ? (
                    <em {...fieldProvenance(metric.caveat)}>{metric.caveat.value}</em>
                  ) : (
                    <MissingSlot label="Metric caveat" field={metric.caveat} />
                  )}
                </article>
              </ProofTarget>
            ))}
          </div>
        ) : (
          <MissingSlot label="Case-study metrics" field={brief.metrics} />
        )}
      </section>

      <section className={styles.testimonial} aria-label="Testimonial">
        {brief.testimonial.status === "provided" ? (
          <ProofTarget targetId={`quote:${brief.testimonial.value.id}`} proofOverlay={proofOverlay}>
            <blockquote data-provenance-ids={brief.testimonial.value.provenanceIds.join(" ")}>
              <p>“{brief.testimonial.value.quote}”</p>
              {brief.testimonial.value.attribution.status === "provided" ? (
                <cite {...fieldProvenance(brief.testimonial.value.attribution)}>
                  {brief.testimonial.value.attribution.value}
                </cite>
              ) : (
                <MissingSlot
                  label="Quote attribution"
                  field={brief.testimonial.value.attribution}
                />
              )}
            </blockquote>
          </ProofTarget>
        ) : (
          <MissingSlot label="Verified testimonial" field={brief.testimonial} />
        )}
      </section>

      <section className={styles.gallery} aria-labelledby="case-gallery-title">
        <header>
          <span>06 / Project record</span>
          <h2 id="case-gallery-title">Supplied work, in context</h2>
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
          <MissingSlot label="Project gallery" field={brief.gallery} />
        )}
      </section>

      <footer className={styles.credits}>
        <span>Credits</span>
        {brief.credits.status === "provided" ? (
          <ul {...fieldProvenance(brief.credits)}>
            {brief.credits.value.map((credit) => <li key={credit}>{credit}</li>)}
          </ul>
        ) : (
          <MissingSlot label="Project credits" field={brief.credits} />
        )}
        {brief.brandTokens.status === "missing" ? (
          <MissingSlot label="Publication brand tokens" field={brief.brandTokens} />
        ) : null}
      </footer>
    </article>
  );
}
