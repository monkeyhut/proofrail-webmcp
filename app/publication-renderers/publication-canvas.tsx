"use client";

import type {
  AuthorityState,
  PublicationBrief,
} from "../../lib/publication-brief";
import { ArticleRenderer } from "./article-renderer";
import { AuthorityBadge } from "./renderer-primitives";
import { CaseStudyRenderer } from "./case-study-renderer";
import { LaunchRenderer } from "./launch-renderer";
import { ReportRenderer } from "./report-renderer";
import type {
  PublicationProofOverlay,
  PublicationViewport,
} from "./renderer-types";
import styles from "./publication-canvas.module.css";

export type PublicationCanvasProps = {
  brief: PublicationBrief;
  authority: AuthorityState;
  revision: number;
  viewport?: PublicationViewport;
  proofOverlay?: PublicationProofOverlay;
  className?: string;
  id?: string;
};

export type PublicationRendererProps = PublicationCanvasProps;

const publicationLabels: Record<PublicationBrief["publicationType"], string> = {
  launch: "Product launch",
  "case-study": "Case study",
  article: "Editorial article",
  report: "Research report",
};

export function PublicationRenderer({
  brief,
  authority,
  revision,
  viewport = "desktop",
  proofOverlay,
  className,
  id = "publication-canvas",
}: PublicationCanvasProps) {
  const renderer = (() => {
    switch (brief.publicationType) {
      case "launch":
        return <LaunchRenderer brief={brief} proofOverlay={proofOverlay} />;
      case "case-study":
        return <CaseStudyRenderer brief={brief} proofOverlay={proofOverlay} />;
      case "article":
        return <ArticleRenderer brief={brief} proofOverlay={proofOverlay} />;
      case "report":
        return <ReportRenderer brief={brief} proofOverlay={proofOverlay} />;
    }
  })();

  return (
    <section
      id={id}
      className={[styles.canvas, className].filter(Boolean).join(" ")}
      aria-label={`${publicationLabels[brief.publicationType]} preview, ${authority}`}
      data-publication-type={brief.publicationType}
      data-authority={authority}
      data-viewport={viewport}
    >
      <header className={styles.canvasBar}>
        <AuthorityBadge authority={authority} revision={revision} />
        <div className={styles.canvasMeta}>
          <span>{publicationLabels[brief.publicationType]}</span>
          <span>{viewport} canvas</span>
          {proofOverlay?.anchors.length ? (
            <span>{proofOverlay.anchors.length} proof targets</span>
          ) : (
            <span>Proof overlay off</span>
          )}
        </div>
      </header>

      <div className={styles.viewportStage}>
        <div className={styles.viewport}>
          {renderer}
        </div>
      </div>
    </section>
  );
}

/** Product-language alias retained for callers that treat the facade as a canvas. */
export function PublicationCanvas(props: PublicationCanvasProps) {
  return <PublicationRenderer {...props} />;
}
