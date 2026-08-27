"use client";

import { useState } from "react";
import styles from "./empty-studio.module.css";

type EmptyStudioProps = {
  toolStatus: "checking" | "registered" | "unsupported" | "error";
  onImport: () => void;
  onLoadSelfDemo: () => void;
};

const inputMethods = ["URL", "Text / HTML", "File", "Brand assets"];

const publicationTypes = [
  { label: "Launch", note: "Product, proof, access" },
  { label: "Case study", note: "Challenge, work, outcomes" },
  { label: "Article", note: "Narrative, quotes, sources" },
  { label: "Report", note: "Findings, data, method" },
];

const viewportLabels = ["desktop", "tablet", "mobile"] as const;

export function EmptyStudio({
  toolStatus,
  onImport,
  onLoadSelfDemo,
}: EmptyStudioProps) {
  const [viewport, setViewport] =
    useState<(typeof viewportLabels)[number]>("desktop");

  const toolStatusLabel =
    toolStatus === "registered"
      ? "Agent tools ready"
      : toolStatus === "error"
        ? "Agent tools unavailable"
        : toolStatus === "unsupported"
          ? "Browser preview mode"
          : "Checking agent tools";

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <a href="#page-top" className={styles.wordmark} aria-label="ProofRail, top">
          <span aria-hidden="true">PR</span>
          <strong>ProofRail</strong>
        </a>
        <p>
          <span>Pre-publication review</span>
          <strong>Marketing + PR</strong>
        </p>
        <div className={styles.status} data-status={toolStatus}>
          <i aria-hidden="true" />
          <span>{toolStatusLabel}</span>
          <b>6</b>
        </div>
      </header>

      <section className={styles.hero} aria-labelledby="empty-studio-title">
        <div className={styles.intro}>
          <p className={styles.eyebrow}>For marketing + PR · before anything becomes public</p>
          <h1 id="empty-studio-title">
            See the page.
            <span>Prove every claim.</span>
            <em>Keep a human in control.</em>
          </h1>
          <p className={styles.definition}>
            Paste the page your company is preparing to publish. ProofRail renders
            the finished launch, case study, article, or report; connects every
            factual sentence to evidence; and keeps release locked until a person
            approves the exact wording.
          </p>

          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={onImport}>
              <span>Import the publication you are preparing</span>
              <b aria-hidden="true">↗</b>
            </button>
            <button type="button" className={styles.secondary} onClick={onLoadSelfDemo}>
              Load the verified ProofRail self-demo
            </button>
          </div>

          <ul className={styles.inputMethods} aria-label="Supported source inputs">
            {inputMethods.map((method, index) => (
              <li key={method}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {method}
              </li>
            ))}
          </ul>

          <p className={styles.boundary}>
            AI may inspect and propose. Only the visible human review can clear a
            release.
          </p>
        </div>

        <div className={styles.product} aria-label="Empty ProofRail review studio">
          <header className={styles.productHeader}>
            <div>
              <span>Workspace / current source</span>
              <strong>No publication loaded</strong>
            </div>
            <div className={styles.viewportControl} role="group" aria-label="Preview viewport">
              {viewportLabels.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={viewport === item}
                  onClick={() => setViewport(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </header>

          <div className={styles.workspace}>
            <section className={styles.canvasArea} aria-label="Publication canvas">
              <div className={styles.canvasMeta}>
                <span>Proposed direction</span>
                <strong>Waiting for your source</strong>
                <small>Nothing here is invented or approved.</small>
              </div>
              <div className={styles.canvasFrame} data-viewport={viewport}>
                <article className={styles.emptyPage}>
                  <header>
                    <span>Your identity</span>
                    <i aria-hidden="true" />
                    <span>Publication navigation</span>
                  </header>
                  <div className={styles.pageLead}>
                    <p>PUBLICATION TITLE / SUPPLIED BY YOU</p>
                    <h2>Your real content becomes the design system.</h2>
                    <span>
                      Headline, structure, media and evidence slots are created from
                      the material you import — never from a fictional customer.
                    </span>
                  </div>
                  <div className={styles.pageModules} aria-label="Available publication structures">
                    {publicationTypes.map((type, index) => (
                      <div key={type.label}>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <strong>{type.label}</strong>
                        <small>{type.note}</small>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            </section>

            <aside className={styles.reviewRail} aria-label="Release readiness">
              <header>
                <span>Release readiness</span>
                <strong>Waiting for source</strong>
              </header>
              <ol>
                <li data-state="current">
                  <span>01</span>
                  <div><strong>Source</strong><small>Import required</small></div>
                </li>
                <li>
                  <span>02</span>
                  <div><strong>Claims</strong><small>Not inspected</small></div>
                </li>
                <li>
                  <span>03</span>
                  <div><strong>Evidence</strong><small>Not linked</small></div>
                </li>
                <li>
                  <span>04</span>
                  <div><strong>Human decision</strong><small>Required</small></div>
                </li>
              </ol>
              <div className={styles.locked}>
                <span aria-hidden="true">×</span>
                <div>
                  <strong>Release locked</strong>
                  <small>Import a source to begin the real check.</small>
                </div>
              </div>
              <button type="button" onClick={onImport}>
                Import source to continue
              </button>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
