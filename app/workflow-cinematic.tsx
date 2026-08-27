"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type WorkflowCinematicProps = {
  gateStatus: "pass" | "blocked";
  blockerCount: number;
  evidenceMapped: boolean;
};

export function WorkflowCinematic({
  gateStatus,
  blockerCount,
  evidenceMapped,
}: WorkflowCinematicProps) {
  const [runId, setRunId] = useState(0);
  const [phase, setPhase] = useState<"idle" | "running" | "settled">(
    "idle",
  );
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  useEffect(() => {
    if (runId === 0) return;
    if (reducedMotionRef.current) {
      setPhase("settled");
      return;
    }

    setPhase("running");
    const timer = window.setTimeout(() => setPhase("settled"), 4800);
    return () => window.clearTimeout(timer);
  }, [runId]);

  const gatePassed = gateStatus === "pass";
  const statusMessage =
    phase === "idle"
      ? "Ready to preview the workflow."
      : gatePassed
        ? phase === "running"
          ? "The release-ready demonstration is running."
          : "The demonstrated publication is release-ready."
        : phase === "running"
          ? "The demonstration is approaching the human gate."
          : `The demonstration stopped at the human gate with ${blockerCount} ${blockerCount === 1 ? "blocker" : "blockers"}.`;

  return (
    <article
      className="rail-cinematic"
      data-outcome={gatePassed ? "pass" : "blocked"}
      aria-labelledby="workflow-film-title"
    >
      <div className="rail-cinematic__copy">
        <span>Illustrative workflow / live gate bound</span>
        <h3 id="workflow-film-title">From draft to release-ready.</h3>
        <p>
          The visual can move only as far as the real workspace allows. When
          evidence or a human decision is missing, it stops at the gate instead
          of pretending publication succeeded.
        </p>
        <button
          type="button"
          onClick={() => setRunId((current) => current + 1)}
          aria-describedby="workflow-film-status"
        >
          {runId === 0 ? "Run the gate" : "Replay the gate"}
          <small>05 sec</small>
        </button>
        <p className="rail-cinematic__disclosure">
          Concept imagery generated for ProofRail. It never changes claims,
          approvals, the release gate, or the receipt.
        </p>
      </div>

      <div
        className={`rail-cinematic__motion is-${phase}`}
        key={runId}
        role="img"
        aria-label={
          gatePassed
            ? "An ivory publication sheet moves through an open cobalt review rail and becomes release-ready."
            : "An ivory publication sheet with unresolved red claim tabs stops at the closed human review gate."
        }
      >
        <Image
          src="/media/proofrail-workflow-start-v1.webp"
          alt=""
          aria-hidden="true"
          width="1600"
          height="900"
          sizes="(max-width: 980px) 100vw, 65vw"
        />
        <Image
          className="rail-cinematic__end"
          src="/media/proofrail-workflow-end-v1.webp"
          alt=""
          aria-hidden="true"
          width="1600"
          height="900"
          sizes="(max-width: 980px) 100vw, 65vw"
          loading="eager"
        />
        <div className="rail-cinematic__hud" aria-hidden="true">
          <span>Draft</span>
          <i><b /></i>
          <span>{gatePassed ? "Release-ready" : "Human gate"}</span>
        </div>
      </div>

      <ol className="rail-cinematic__steps" aria-label="ProofRail workflow states">
        <li data-state="complete"><span>01</span><strong>Draft entered</strong></li>
        <li data-state={evidenceMapped ? "complete" : "pending"}>
          <span>02</span>
          <strong>{evidenceMapped ? "Evidence mapped" : "Evidence incomplete"}</strong>
        </li>
        <li data-state={gatePassed ? "complete" : "blocked"}>
          <span>03</span><strong>{gatePassed ? "Human approved" : "Human pending"}</strong>
        </li>
        <li data-state={gatePassed ? "ready" : "locked"}>
          <span>04</span><strong>{gatePassed ? "Release-ready" : "Release locked"}</strong>
        </li>
      </ol>

      <section className="rail-artifact" aria-labelledby="artifact-title">
        <div className="rail-artifact__copy">
          <span>Meshy geometry study / 5,240 faces</span>
          <h4 id="artifact-title">The invisible review stack, made tangible.</h4>
          <p>
            One publication is still one object. ProofRail separates its hidden
            decision layers so a team can inspect what the audience sees, what
            the copy claims, which sources support it, and who released it.
          </p>
        </div>
        <figure className="rail-artifact__model">
          <div className="rail-artifact__model-stage">
            <Image
              src="/media/proofrail-evidence-dossier-meshy-poster-v1.webp"
              alt="A Meshy-generated three-dimensional stack of ivory publication layers with a dark evidence rail between them."
              width="720"
              height="400"
              sizes="(max-width: 720px) calc(100vw - 72px), (max-width: 980px) 57vw, 34vw"
            />
            <div className="rail-artifact__model-map" aria-hidden="true">
              <span><b>01</b>Page</span>
              <span><b>02</b>Claims</span>
              <span><b>03</b>Sources</span>
              <span><b>04</b>Gate</span>
              <span><b>05</b>Receipt</span>
            </div>
          </div>
          <figcaption>Meshy object · HTML-mapped review layers · static fallback</figcaption>
        </figure>
        <ol className="rail-artifact__layers" aria-label="Review stack layers">
          <li><span>01</span><strong>Public page</strong><small>The audience-facing design</small></li>
          <li><span>02</span><strong>Claim layer</strong><small>Exact factual sentences</small></li>
          <li><span>03</span><strong>Evidence layer</strong><small>Dated supporting sources</small></li>
          <li><span>04</span><strong>Human gate</strong><small>Visible final decision</small></li>
          <li><span>05</span><strong>Proof receipt</strong><small>Revision and SHA-256 seal</small></li>
        </ol>
      </section>
      <p className="sr-only" id="workflow-film-status" aria-live="polite">
        {statusMessage}
      </p>
    </article>
  );
}
