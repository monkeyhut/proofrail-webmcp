"use client";

import type { ReportPublicationBrief } from "../../lib/publication-brief";
import {
  fieldProvenance,
  MissingReference,
  MissingSlot,
  ProofTarget,
  PublicationMedia,
  publicationBrandStyle,
} from "./renderer-primitives";
import type { RendererProps } from "./renderer-types";
import styles from "./report-renderer.module.css";

export type ReportRendererProps = RendererProps<ReportPublicationBrief>;

export function ReportRenderer({ brief, proofOverlay }: ReportRendererProps) {
  const downloadAssetId =
    brief.downloadMetadata.status === "provided"
      ? brief.downloadMetadata.value.mediaAssetId
      : null;
  const downloadAsset = downloadAssetId
    ? brief.mediaAssets.find((asset) => asset.id === downloadAssetId)
    : undefined;

  return (
    <article
      className={styles.report}
      style={publicationBrandStyle(brief.brandTokens)}
      lang={brief.accessibilityMetadata.language}
      dir={brief.accessibilityMetadata.readingDirection}
    >
      <header className={styles.cover}>
        <div className={styles.coverMeta}>
          <ProofTarget targetId="institution" proofOverlay={proofOverlay}>
            {brief.institution.status === "provided" ? (
              <strong {...fieldProvenance(brief.institution)}>
                {brief.institution.value}
              </strong>
            ) : (
              <MissingSlot label="Institution" field={brief.institution} />
            )}
          </ProofTarget>
          <ProofTarget targetId="edition" proofOverlay={proofOverlay}>
            {brief.edition.status === "provided" ? (
              <span {...fieldProvenance(brief.edition)}>{brief.edition.value}</span>
            ) : (
              <MissingSlot label="Report edition" field={brief.edition} />
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

        <div className={styles.coverTitle}>
          <span className={styles.reportLabel}>Research report</span>
          <ProofTarget targetId="title" proofOverlay={proofOverlay}>
            {brief.title.status === "provided" ? (
              <h1 {...fieldProvenance(brief.title)}>{brief.title.value}</h1>
            ) : (
              <MissingSlot label="Report title" field={brief.title} />
            )}
          </ProofTarget>
          <ProofTarget targetId="deck" proofOverlay={proofOverlay}>
            {brief.deck.status === "provided" ? (
              <p className={styles.deck} {...fieldProvenance(brief.deck)}>
                {brief.deck.value}
              </p>
            ) : (
              <MissingSlot label="Report deck" field={brief.deck} />
            )}
          </ProofTarget>
        </div>

        <ProofTarget
          targetId="abstract"
          proofOverlay={proofOverlay}
          className={styles.abstract}
        >
          <span>Abstract</span>
          {brief.abstract.status === "provided" ? (
            <p {...fieldProvenance(brief.abstract)}>{brief.abstract.value}</p>
          ) : (
            <MissingSlot label="Report abstract" field={brief.abstract} />
          )}
        </ProofTarget>
      </header>

      <section className={styles.summary} aria-labelledby="report-summary-title">
        <div className={styles.summaryIndex}>
          <span>00</span>
          <p>Executive summary</p>
        </div>
        <ProofTarget targetId="executive-summary" proofOverlay={proofOverlay}>
          {brief.executiveSummary.status === "provided" ? (
            <div>
              <h2 id="report-summary-title">What this report establishes</h2>
              <p {...fieldProvenance(brief.executiveSummary)}>
                {brief.executiveSummary.value}
              </p>
            </div>
          ) : (
            <MissingSlot label="Executive summary" field={brief.executiveSummary} />
          )}
        </ProofTarget>
      </section>

      <section className={styles.sourceNarrative} aria-labelledby="report-source-title">
        <header>
          <span>Imported narrative</span>
          <h2 id="report-source-title">Source publication body</h2>
        </header>
        {brief.sections.status === "provided" ? (
          <div>
            {brief.sections.value.map((section) => (
              <ProofTarget
                key={section.id}
                targetId={`section:${section.id}`}
                proofOverlay={proofOverlay}
                className={styles.sourceChapter}
              >
                {section.heading.status === "provided" &&
                (brief.title.status !== "provided" ||
                  section.heading.value !== brief.title.value) ? (
                  <h3 {...fieldProvenance(section.heading)}>{section.heading.value}</h3>
                ) : null}
                {section.body.status === "provided" ? (
                  <p {...fieldProvenance(section.body)}>{section.body.value}</p>
                ) : (
                  <MissingSlot label="Imported report body" field={section.body} />
                )}
              </ProofTarget>
            ))}
          </div>
        ) : (
          <MissingSlot label="Imported report narrative" field={brief.sections} />
        )}
      </section>

      <section className={styles.findings} aria-labelledby="report-findings-title">
        <header>
          <span>Findings</span>
          <h2 id="report-findings-title">Evidence, context, and limits</h2>
        </header>

        {brief.findings.status === "provided" ? (
          <ol>
            {brief.findings.value.map((finding) => (
              <li key={finding.id}>
                <ProofTarget
                  targetId={`finding:${finding.id}`}
                  proofOverlay={proofOverlay}
                  className={styles.finding}
                >
                  <div className={styles.findingNumber}>{finding.number}</div>
                  <div className={styles.findingCopy}>
                    <h3>{finding.title}</h3>
                    <p>{finding.context}</p>
                    <small>Provenance: {finding.provenanceIds.join(" · ")}</small>
                  </div>
                  <div className={styles.findingMetric}>
                    {finding.metric.status === "provided" ? (
                      <div {...fieldProvenance(finding.metric)}>
                        <strong>{finding.metric.value.value}</strong>
                        <span>{finding.metric.value.label}</span>
                        <p>{finding.metric.value.context}</p>
                        <small>
                          Sources: {finding.metric.value.sourceIds.join(" · ")}
                        </small>
                        {finding.metric.value.caveat.status === "provided" ? (
                          <em {...fieldProvenance(finding.metric.value.caveat)}>
                            {finding.metric.value.caveat.value}
                          </em>
                        ) : (
                          <MissingSlot
                            label="Finding caveat"
                            field={finding.metric.value.caveat}
                          />
                        )}
                      </div>
                    ) : (
                      <MissingSlot label="Finding metric" field={finding.metric} />
                    )}
                  </div>
                  <div className={styles.findingChart}>
                    {finding.chartAssetId.status === "provided" ? (
                      <PublicationMedia
                        assetId={finding.chartAssetId.value}
                        assets={brief.mediaAssets}
                        provenance={brief.provenance}
                        proofOverlay={proofOverlay}
                      />
                    ) : (
                      <MissingSlot label="Finding chart" field={finding.chartAssetId} />
                    )}
                  </div>
                </ProofTarget>
              </li>
            ))}
          </ol>
        ) : (
          <MissingSlot label="Numbered findings" field={brief.findings} />
        )}
      </section>

      <section className={styles.chartArchive} aria-labelledby="report-charts-title">
        <header>
          <span>Figure archive</span>
          <h2 id="report-charts-title">Supplied charts</h2>
        </header>
        {brief.charts.status === "provided" ? (
          <div>
            {brief.charts.value.map((assetId) => (
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
          <MissingSlot label="Report chart archive" field={brief.charts} />
        )}
      </section>

      <section className={styles.method} aria-label="Methodology and limitations">
        <ProofTarget targetId="methodology" proofOverlay={proofOverlay}>
          <div>
            <span>Methodology</span>
            {brief.methodology.status === "provided" ? (
              <p {...fieldProvenance(brief.methodology)}>{brief.methodology.value}</p>
            ) : (
              <MissingSlot label="Methodology" field={brief.methodology} />
            )}
          </div>
        </ProofTarget>
        <ProofTarget targetId="limitations" proofOverlay={proofOverlay}>
          <div>
            <span>Limitations</span>
            {brief.limitations.status === "provided" ? (
              <p {...fieldProvenance(brief.limitations)}>{brief.limitations.value}</p>
            ) : (
              <MissingSlot label="Report limitations" field={brief.limitations} />
            )}
          </div>
        </ProofTarget>
      </section>

      <section className={styles.dataSources}>
        <div>
          <h2>Datasets</h2>
          {brief.datasets.status === "provided" ? (
            <ol {...fieldProvenance(brief.datasets)}>
              {brief.datasets.value.map((dataset) => (
                <li key={dataset.id} data-provenance-id={dataset.provenanceId}>
                  <span>{dataset.label}</span>
                  <small>{dataset.provenanceId}</small>
                </li>
              ))}
            </ol>
          ) : (
            <MissingSlot label="Report datasets" field={brief.datasets} />
          )}
        </div>
        <div>
          <h2>Sources</h2>
          {brief.sources.status === "provided" ? (
            <ol {...fieldProvenance(brief.sources)}>
              {brief.sources.value.map((source) => (
                <li key={source.id} data-provenance-id={source.provenanceId}>
                  <span>{source.label}</span>
                  <small>{source.provenanceId}</small>
                </li>
              ))}
            </ol>
          ) : (
            <MissingSlot label="Report sources" field={brief.sources} />
          )}
        </div>
      </section>

      <section className={styles.faq} aria-labelledby="report-faq-title">
        <header>
          <span>Appendix</span>
          <h2 id="report-faq-title">Questions and definitions</h2>
        </header>
        {brief.faq.status === "provided" ? (
          <div>
            {brief.faq.value.map((item) => (
              <ProofTarget
                key={item.id}
                targetId={`faq:${item.id}`}
                proofOverlay={proofOverlay}
              >
                <article>
                  {item.eyebrow.status === "provided" ? (
                    <span {...fieldProvenance(item.eyebrow)}>{item.eyebrow.value}</span>
                  ) : null}
                  {item.heading.status === "provided" ? (
                    <h3 {...fieldProvenance(item.heading)}>{item.heading.value}</h3>
                  ) : (
                    <MissingSlot label="FAQ question" field={item.heading} />
                  )}
                  {item.body.status === "provided" ? (
                    <p {...fieldProvenance(item.body)}>{item.body.value}</p>
                  ) : (
                    <MissingSlot label="FAQ answer" field={item.body} />
                  )}
                </article>
              </ProofTarget>
            ))}
          </div>
        ) : (
          <MissingSlot label="Report FAQ" field={brief.faq} />
        )}
      </section>

      <footer className={styles.download}>
        <div>
          <span>Report file</span>
          {brief.downloadMetadata.status === "provided" ? (
            downloadAsset ? (
              <a
                href={downloadAsset.src}
                data-provenance-ids={downloadAsset.provenanceIds.join(" ")}
              >
                <strong>{brief.downloadMetadata.value.label}</strong>
                <span aria-hidden="true">↓</span>
              </a>
            ) : (
              <MissingReference
                label="Report download"
                request={`Download metadata references ${brief.downloadMetadata.value.mediaAssetId}, but the asset is absent.`}
              />
            )
          ) : (
            <MissingSlot label="Report download" field={brief.downloadMetadata} />
          )}
        </div>
        {brief.brandTokens.status === "missing" ? (
          <MissingSlot label="Publication brand tokens" field={brief.brandTokens} />
        ) : null}
      </footer>
    </article>
  );
}
