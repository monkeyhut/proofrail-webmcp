"use client";

import { useState } from "react";
import {
  createProofRailSelfDemoWorkspace,
  verifyReleaseGate,
} from "../lib/proofrail";
import { PublicationCanvas } from "./publication-renderers/publication-canvas";
import type {
  PublicationProofOverlay,
  PublicationViewport,
} from "./publication-renderers/renderer-types";
import styles from "./empty-studio.module.css";

type EmptyStudioProps = {
  toolStatus: "checking" | "registered" | "unsupported" | "error";
  onImport: () => void;
  onLoadSelfDemo: () => void;
};

type ExampleStage = "page" | "proof" | "human";

const inputMethods = ["URL", "Text / HTML", "File", "Brand assets"];
const viewportLabels: PublicationViewport[] = ["desktop", "tablet", "mobile"];

const exampleStages: Array<{
  id: ExampleStage;
  number: string;
  label: string;
  announcement: string;
}> = [
  {
    id: "page",
    number: "01",
    label: "Finished page",
    announcement: "Showing the finished ProofRail self-demo publication.",
  },
  {
    id: "proof",
    number: "02",
    label: "Claim + source",
    announcement:
      "The selected sentence is connected to its exact implementation source.",
  },
  {
    id: "human",
    number: "03",
    label: "Human gate",
    announcement:
      "The evidence supports the claim, but release remains blocked for a human decision.",
  },
];

const exampleWorkspace = createProofRailSelfDemoWorkspace();
function requireExampleValue<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new Error(`SELF_DEMO_INVALID: missing ${label}.`);
  }
  return value;
}

const exampleBrief = requireExampleValue(
  exampleWorkspace.publicationBrief,
  "publication brief",
);
const exampleClaim = requireExampleValue(
  exampleWorkspace.claims.find((claim) => claim.id === "claim-01"),
  "claim-01",
);
const exampleEdge = exampleWorkspace.edges.find(
  (edge) => edge.claimId === exampleClaim.id,
);
const exampleEvidence = requireExampleValue(
  exampleWorkspace.evidence.find(
    (evidence) => evidence.id === exampleEdge?.evidenceId,
  ),
  "claim-01 evidence",
);
const exampleGate = verifyReleaseGate(exampleWorkspace);
const exampleAnchors = exampleWorkspace.claims.flatMap((claim) =>
  claim.previewTargetId
    ? [
        {
          claimId: claim.id,
          targetId: claim.previewTargetId,
          label: `Claim ${claim.number}`,
        },
      ]
    : [],
);

export function EmptyStudio({
  toolStatus,
  onImport,
  onLoadSelfDemo,
}: EmptyStudioProps) {
  const [viewport, setViewport] = useState<PublicationViewport>("tablet");
  const [exampleStage, setExampleStage] = useState<ExampleStage>("page");

  const toolStatusLabel =
    toolStatus === "registered"
      ? "6 agent tools ready"
      : toolStatus === "error"
        ? "Agent tools unavailable"
        : toolStatus === "unsupported"
          ? "Browser preview mode"
          : "Checking agent tools";
  const activeStage =
    exampleStages.find((stage) => stage.id === exampleStage) ?? exampleStages[0];
  const proofOverlay: PublicationProofOverlay | undefined =
    exampleStage === "page"
      ? undefined
      : {
          anchors: exampleAnchors,
          selectedClaimId: exampleClaim.id,
        };
  const nextStage: ExampleStage =
    exampleStage === "page" ? "proof" : exampleStage === "proof" ? "human" : "proof";
  const nextStageLabel =
    exampleStage === "page"
      ? "Trace this example"
      : exampleStage === "proof"
        ? "Show the human boundary"
        : "Trace the source again";

  return (
    <div className={styles.root} data-example-stage={exampleStage}>
      <header className={styles.topbar}>
        <a href="#page-top" className={styles.wordmark} aria-label="ProofRail, top">
          <span aria-hidden="true">PR</span>
          <strong>ProofRail</strong>
        </a>
        <p>
          <span>Publication compiler</span>
          <strong>Marketing + PR</strong>
        </p>
        <div className={styles.status} data-status={toolStatus}>
          <i aria-hidden="true" />
          <span>{toolStatusLabel}</span>
        </div>
      </header>

      <section className={styles.hero} aria-labelledby="empty-studio-title">
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Marketing + PR · before publication</p>
          <h1 id="empty-studio-title">
            Preview the page.
            <span>Trace every claim.</span>
            <em>Release stays human.</em>
          </h1>
          <p className={styles.definition}>
            Import a launch, case study, article or report. ProofRail renders it,
            links claims to evidence and blocks release until a person approves.
          </p>

          <div className={styles.workflow} aria-label="ProofRail workflow">
            <span>Import</span>
            <i aria-hidden="true">→</i>
            <span>Finished preview</span>
            <i aria-hidden="true">→</i>
            <span>Claim + source</span>
            <i aria-hidden="true">→</i>
            <strong>Human gate</strong>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={onImport}>
              <span>Import the publication you are preparing</span>
              <b aria-hidden="true">↗</b>
            </button>
            <button type="button" className={styles.secondary} onClick={onLoadSelfDemo}>
              Open this verified example in the workspace
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

        <section
          className={styles.product}
          aria-labelledby="example-preview-title"
          data-stage={exampleStage}
        >
          <header className={styles.productHeader}>
            <div>
              <span>Example preview · ProofRail self-demo</span>
              <strong id="example-preview-title">Your workspace is empty. This example is read-only.</strong>
            </div>
            <button type="button" onClick={onLoadSelfDemo}>
              Open self-demo <span aria-hidden="true">↗</span>
            </button>
          </header>

          <div className={styles.exampleControls}>
            <div className={styles.chapterControl} role="group" aria-label="Example chapter">
              {exampleStages.map((stage) => (
                <button
                  key={stage.id}
                  type="button"
                  aria-pressed={exampleStage === stage.id}
                  onClick={() => setExampleStage(stage.id)}
                >
                  <span>{stage.number}</span>
                  {stage.label}
                </button>
              ))}
            </div>
            <div className={styles.viewportControl} role="group" aria-label="Example viewport">
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
          </div>

          <div className={styles.workspace}>
            <section className={styles.canvasArea} aria-label="Read-only publication example">
              <div className={styles.canvasMeta}>
                <span>Real launch renderer</span>
                <strong>{activeStage.label}</strong>
                <small>ProofRail-owned copy · not customer data</small>
              </div>
              <div className={styles.canvasViewport} data-viewport={viewport}>
                <div className={styles.canvasMount} inert aria-hidden="true">
                  <PublicationCanvas
                    id="empty-example-publication-canvas"
                    className={styles.actualCanvas}
                    brief={exampleBrief}
                    authority="source"
                    revision={exampleWorkspace.revision}
                    viewport={viewport}
                    proofOverlay={proofOverlay}
                  />
                </div>
                <div className={styles.traceConnector} aria-hidden="true">
                  <i />
                  <span>C-01</span>
                </div>
              </div>
            </section>

            <aside className={styles.reviewRail} aria-label="Read-only example review rail">
              <header>
                <span>Live proof · read-only example</span>
                <strong>{activeStage.label}</strong>
              </header>

              <div className={styles.stagePanel} key={exampleStage}>
                {exampleStage === "page" ? (
                  <div className={styles.publicationSummary}>
                    <span>Finished publication preview</span>
                    <strong>{exampleWorkspace.headline}</strong>
                    <p>
                      ProofRail&apos;s own launch page is rendered with the same canvas
                      used after a real import.
                    </p>
                    <dl>
                      <div><dt>Type</dt><dd>Product launch</dd></div>
                      <div><dt>Claims</dt><dd>{exampleWorkspace.claims.length}</dd></div>
                      <div><dt>Sources</dt><dd>{exampleWorkspace.evidence.length}</dd></div>
                    </dl>
                  </div>
                ) : null}

                {exampleStage === "proof" ? (
                  <div className={styles.proofTrace}>
                    <span>Selected sentence · C-01</span>
                    <blockquote>{exampleClaim.text}</blockquote>
                    <div className={styles.relationship}>
                      <i aria-hidden="true">↳</i>
                      <div>
                        <span>Supports · engineering control</span>
                        <strong>{exampleEvidence.title}</strong>
                        <p>{exampleEvidence.excerpt}</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {exampleStage === "human" ? (
                  <div className={styles.humanDecision}>
                    <span>Human decision · pending</span>
                    <strong>Evidence can support the sentence. It cannot approve it.</strong>
                    <p>
                      ProofRail stops here until a person accepts the exact wording
                      shown in the current revision.
                    </p>
                    <div>
                      <button type="button" disabled>Approve as human</button>
                      <small>Disabled in this read-only example</small>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className={styles.locked} data-emphasis={exampleStage === "human"}>
                <span aria-hidden="true">×</span>
                <div>
                  <strong>Release blocked</strong>
                  <small>{exampleGate.openHumanDecisions} human decisions remain</small>
                </div>
              </div>
              <button
                type="button"
                className={styles.traceAction}
                onClick={() => setExampleStage(nextStage)}
              >
                {nextStageLabel}
                <span aria-hidden="true">→</span>
              </button>
            </aside>
          </div>

          <p className={styles.srOnly} aria-live="polite">
            {activeStage.announcement}
          </p>
        </section>
      </section>
    </div>
  );
}
