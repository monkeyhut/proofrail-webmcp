"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  EvidenceEdge,
  EvidenceRecord,
  GateBlocker,
  ReleaseGate,
  ReviewClaim,
} from "../lib/proofrail";
import styles from "./release-readiness.module.css";

export type ReleaseReadinessClaim = Pick<
  ReviewClaim,
  "id" | "number" | "text" | "location"
>;

export type ReleaseReadinessEvidence = Pick<
  EvidenceRecord,
  "id" | "title" | "sourceType"
>;

export type ReleaseReadinessEdge = Pick<
  EvidenceEdge,
  "claimId" | "evidenceId" | "relation"
>;

export type ReleaseReadinessProps = {
  /** The live workspace revision. A result for any other revision is stale. */
  currentRevision: number;
  /** Must call the real deterministic release gate. No simulated result belongs here. */
  runReleaseCheck: () => ReleaseGate | Promise<ReleaseGate>;
  claims?: readonly ReleaseReadinessClaim[];
  evidence?: readonly ReleaseReadinessEvidence[];
  edges?: readonly ReleaseReadinessEdge[];
  /** Selects and reveals the claim in the surrounding publication canvas. */
  onSelectClaim?: (claimId: string) => void;
  /** Selects and reveals a linked source in the surrounding evidence rail. */
  onSelectSource?: (evidenceId: string, claimId: string) => void;
  className?: string;
  id?: string;
};

type CheckPhase = "idle" | "checking" | "complete" | "error";

const humanBoundaryCodes = new Set<GateBlocker["code"]>([
  "HUMAN_REVIEW_PENDING",
  "HUMAN_APPROVAL_REQUIRED",
]);

const blockerLabels: Record<GateBlocker["code"], string> = {
  UNREVIEWED: "Evidence decision missing",
  QUALIFIER_REQUIRED: "Narrower wording required",
  CONTRADICTED: "Current wording contradicted",
  OUTDATED: "Evidence is outdated",
  HUMAN_REVIEW_PENDING: "Human review pending",
  HUMAN_APPROVAL_REQUIRED: "Human approval required",
  RESOLUTION_REJECTED: "Replacement wording required",
  NO_SUPPORTING_EDGE: "Supporting source missing",
  NO_RESOLUTION_EVIDENCE: "Resolution evidence missing",
  BROKEN_EVIDENCE_EDGE: "Evidence link broken",
  PUBLICATION_COVERAGE_INVALID: "Publication coverage invalid",
};

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "The deterministic release check failed without an error message.";
}

function joinClassNames(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function ReleaseReadiness({
  currentRevision,
  runReleaseCheck,
  claims = [],
  evidence = [],
  edges = [],
  onSelectClaim,
  onSelectSource,
  className,
  id = "release-readiness",
}: ReleaseReadinessProps) {
  const [phase, setPhase] = useState<CheckPhase>("idle");
  const [gate, setGate] = useState<ReleaseGate | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [completedRun, setCompletedRun] = useState(0);
  const liveRevisionRef = useRef(currentRevision);
  const firstBlockerRef = useRef<HTMLLIElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const claimsById = useMemo(
    () => new Map(claims.map((claim) => [claim.id, claim])),
    [claims],
  );
  const evidenceById = useMemo(
    () => new Map(evidence.map((record) => [record.id, record])),
    [evidence],
  );
  const evidenceForClaim = useMemo(() => {
    const records = new Map<string, ReleaseReadinessEvidence[]>();

    for (const edge of edges) {
      const record = evidenceById.get(edge.evidenceId);
      if (!record) continue;
      const current = records.get(edge.claimId) ?? [];
      if (!current.some((candidate) => candidate.id === record.id)) {
        current.push(record);
        records.set(edge.claimId, current);
      }
    }

    return records;
  }, [edges, evidenceById]);

  const isStale = gate !== null && gate.checkedRevision !== currentRevision;
  const isBlocked = gate?.status === "blocked" || isStale;
  const isPass = gate?.status === "pass" && !isStale;

  useEffect(() => {
    liveRevisionRef.current = currentRevision;
  }, [currentRevision]);

  useEffect(() => {
    if (completedRun === 0) return;

    if (phase === "error") {
      errorRef.current?.focus();
      return;
    }

    if (phase !== "complete") return;

    if (gate?.blockers.length) {
      firstBlockerRef.current?.focus();
      return;
    }

    resultHeadingRef.current?.focus();
  }, [completedRun, gate, phase]);

  async function checkReleaseReadiness() {
    if (phase === "checking") return;

    const revisionAtStart = currentRevision;
    setPhase("checking");
    setFailure(null);
    setGate(null);

    try {
      const nextGate = await runReleaseCheck();
      setGate(nextGate);
      setPhase("complete");
      setCompletedRun((run) => run + 1);

      const firstBlocker = nextGate.blockers[0];
      if (
        firstBlocker &&
        revisionAtStart === liveRevisionRef.current &&
        nextGate.checkedRevision === liveRevisionRef.current
      ) {
        onSelectClaim?.(firstBlocker.claimId);
      }
    } catch (error) {
      setFailure(errorMessage(error));
      setPhase("error");
      setCompletedRun((run) => run + 1);
    }
  }

  const statusLabel = isStale
    ? "Result stale"
    : isPass
      ? "Ready for release"
      : isBlocked
        ? "Release blocked"
        : phase === "checking"
          ? "Checking current revision"
          : phase === "error"
            ? "Release check failed"
            : "Not checked";

  return (
    <section
      id={id}
      className={joinClassNames(
        styles.root,
        isPass ? styles.pass : undefined,
        isBlocked ? styles.blocked : undefined,
        className,
      )}
      aria-labelledby={`${id}-title`}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Release readiness / revision {currentRevision}</p>
          <h2 id={`${id}-title`}>Check before anything leaves the room.</h2>
          <p className={styles.intro}>
            Runs the deterministic release rules against the current publication.
            The check can reveal blockers; it cannot approve, reject, or publish.
          </p>
        </div>

        <div className={styles.statusCard} aria-label={`Gate status: ${statusLabel}`}>
          <span className={styles.statusMark} aria-hidden="true" />
          <div>
            <small>Current state</small>
            <strong>{statusLabel}</strong>
          </div>
        </div>
      </header>

      <div className={styles.actionRow}>
        <button
          type="button"
          className={styles.checkButton}
          onClick={() => void checkReleaseReadiness()}
          disabled={phase === "checking"}
          aria-busy={phase === "checking"}
          aria-describedby={`${id}-check-note`}
        >
          <span>
            {phase === "checking"
              ? "Running deterministic checks"
              : "Check release readiness"}
          </span>
          <span aria-hidden="true">↗</span>
        </button>
        <p id={`${id}-check-note`}>
          No timer. No simulated progress. The result below is returned by the live gate.
        </p>
      </div>

      <div
        className={styles.liveSummary}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {phase === "checking"
          ? `Checking revision ${currentRevision}.`
          : gate
            ? isStale
              ? `The result was checked at revision ${gate.checkedRevision}, but revision ${currentRevision} is live. Run the check again.`
              : gate.status === "blocked"
                ? `Release blocked by ${gate.blockers.length} ${gate.blockers.length === 1 ? "issue" : "issues"}.`
                : `Revision ${gate.checkedRevision} passed the release check.`
            : "Release readiness has not been checked."}
      </div>

      {phase === "error" && failure ? (
        <div
          ref={errorRef}
          className={styles.error}
          role="alert"
          tabIndex={-1}
        >
          <span>Check failed</span>
          <strong>{failure}</strong>
          <p>No release status was inferred. Resolve the error and run the check again.</p>
        </div>
      ) : null}

      {gate ? (
        <div className={styles.result}>
          <div className={styles.resultHeader}>
            <div>
              <p>Deterministic result</p>
              <h3 ref={resultHeadingRef} tabIndex={-1}>
                {isStale
                  ? "This result no longer describes the live draft."
                  : gate.status === "pass"
                    ? "Ready for release."
                    : "Release blocked."}
              </h3>
            </div>
            <dl className={styles.metrics}>
              <div>
                <dt>Checked revision</dt>
                <dd>{gate.checkedRevision}</dd>
              </div>
              <div>
                <dt>Cleared claims</dt>
                <dd>{gate.releasableClaims}</dd>
              </div>
              <div>
                <dt>Blockers</dt>
                <dd>{gate.blockers.length}</dd>
              </div>
              <div>
                <dt>Human decisions</dt>
                <dd>{gate.openHumanDecisions}</dd>
              </div>
            </dl>
          </div>

          {isStale ? (
            <div className={styles.staleNotice} role="alert">
              <strong>Revision mismatch</strong>
              <p>
                The gate checked revision {gate.checkedRevision}; the live publication is
                revision {currentRevision}. This result cannot establish release readiness.
              </p>
            </div>
          ) : null}

          {gate.blockers.length > 0 ? (
            <ol className={styles.blockerList} aria-label="Release blockers">
              {gate.blockers.map((blocker, index) => {
                const claim = claimsById.get(blocker.claimId);
                const sources = evidenceForClaim.get(blocker.claimId) ?? [];
                const humanDecisionRequired = humanBoundaryCodes.has(blocker.code);

                return (
                  <li
                    key={`${blocker.claimId}-${blocker.code}-${index}`}
                    ref={index === 0 ? firstBlockerRef : undefined}
                    className={styles.blocker}
                    tabIndex={-1}
                  >
                    <div className={styles.blockerIndex} aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className={styles.blockerBody}>
                      <div className={styles.blockerHeading}>
                        <div>
                          <code>{blocker.code}</code>
                          <h4>{blockerLabels[blocker.code]}</h4>
                        </div>
                        {onSelectClaim ? (
                          <button
                            type="button"
                            className={styles.textButton}
                            onClick={() => onSelectClaim(blocker.claimId)}
                          >
                            {claim ? "Show claim" : "Show affected area"}
                            <span aria-hidden="true">↗</span>
                          </button>
                        ) : null}
                      </div>

                      <p className={styles.exactDetail}>{blocker.detail}</p>

                      <dl className={styles.blockerMeta}>
                        <div>
                          <dt>Affected claim</dt>
                          <dd>
                            {claim
                              ? `${claim.number} · ${claim.location}`
                              : blocker.claimId}
                          </dd>
                        </div>
                        {claim?.text ? (
                          <div>
                            <dt>Current wording</dt>
                            <dd>“{claim.text}”</dd>
                          </div>
                        ) : null}
                      </dl>

                      {sources.length > 0 ? (
                        <div className={styles.sources}>
                          <span>Linked sources</span>
                          <ul>
                            {sources.map((source) => (
                              <li key={source.id}>
                                {onSelectSource ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onSelectSource(source.id, blocker.claimId)
                                    }
                                  >
                                    <span>{source.title}</span>
                                    <small>{source.sourceType.replaceAll("-", " ")}</small>
                                  </button>
                                ) : (
                                  <div>
                                    <span>{source.title}</span>
                                    <small>{source.sourceType.replaceAll("-", " ")}</small>
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {humanDecisionRequired ? (
                        <div className={styles.humanBoundary}>
                          <span aria-hidden="true">H</span>
                          <p>
                            <strong>Human decision required.</strong> This release check stops
                            here. It cannot approve or reject this wording on your behalf.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : isPass ? (
            <div className={styles.passResult}>
              <span className={styles.passGlyph} aria-hidden="true">✓</span>
              <div>
                <strong>All deterministic release rules passed.</strong>
                <p>
                  The current revision is eligible for the separate receipt step. This
                  component did not publish content or create a receipt.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
