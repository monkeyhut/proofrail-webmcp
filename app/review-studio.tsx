"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  buildPublicationPreview,
  verifyReleaseGate,
  type PublicationPreviewVariant,
  type ReleaseGate,
  type ReviewClaim,
  type Workspace,
} from "../lib/proofrail";
import {
  createSourceOnlyPublicationBrief,
  replacePublicationBriefClaim,
  type AuthorityState,
  type PublicationBrief,
} from "../lib/publication-brief";
import {
  PublicationCanvas,
  type PublicationProofAnchor,
  type PublicationViewport,
} from "./publication-renderers";
import styles from "./review-studio.module.css";

type ToolStatus = "checking" | "registered" | "unsupported" | "error";

type ToolManifestItem = {
  name: string;
  kind: string;
  description: string;
};

type ReviewStudioProps = {
  workspace: Workspace;
  selectedClaimId: string;
  previewVariant: PublicationPreviewVariant;
  proofVisible: boolean;
  toolStatus: ToolStatus;
  toolsOpen: boolean;
  toolManifest: readonly ToolManifestItem[];
  notice: string | null;
  receiptPending: boolean;
  releaseReadiness: ReactNode;
  onImport: () => void;
  onStartNew: () => void;
  onToggleTools: () => void;
  onDismissNotice: () => void;
  onVariantChange: (variant: PublicationPreviewVariant) => void;
  onProofVisibleChange: (visible: boolean) => void;
  onSelectClaim: (claimId: string) => void;
  onSelectSource: (evidenceId: string, claimId: string) => void;
  canStageProposal: (claim: ReviewClaim) => boolean;
  onStageProposal: (claim: ReviewClaim) => void;
  onDecideProposal: (decision: "approve" | "reject") => void;
  onApproveEvidence: () => void;
  onRunReleaseCheck: () => ReleaseGate;
  onCreateReceipt: () => void;
  onOpenReceipt: () => void;
};

type AuthorityView = "current" | "proposed" | "release-candidate";

const authorityLabels: Record<AuthorityView, string> = {
  current: "Current source",
  proposed: "Proposed direction",
  "release-candidate": "Release candidate",
};

const viewportLabels: Record<PublicationViewport, string> = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
};

const toolStatusLabels: Record<ToolStatus, string> = {
  checking: "Checking agent tools",
  registered: "Agent tools ready",
  unsupported: "Browser preview mode",
  error: "Agent tools unavailable",
};

function publicationBriefForView(
  workspace: Workspace,
  authority: AuthorityView,
): PublicationBrief {
  const source =
    workspace.sourcePublicationBrief ??
    workspace.publicationBrief ??
    createSourceOnlyPublicationBrief({
      publicationType: workspace.publicationType,
      title: workspace.title,
      headline: workspace.headline,
      body: workspace.draftText,
      inputMethod: "form",
    });

  const candidate = workspace.publicationBrief ?? source;
  if (authority === "current") return source;
  if (authority === "release-candidate") return candidate;

  const projection = buildPublicationPreview(workspace, "proposed");
  if (projection.errorCode || projection.stagedClaimIds.length === 0) return candidate;

  return workspace.claims
    .filter((claim) => claim.proposal?.status === "staged")
    .reduce((brief, claim) => {
      if (!claim.proposal || !claim.previewTargetId) {
        throw new Error(`MISSING_PREVIEW_TARGET: ${claim.id}`);
      }
      return replacePublicationBriefClaim(
        brief,
        claim.previewTargetId,
        claim.text,
        claim.proposal.after,
      );
    }, candidate);
}

function proofAnchors(workspace: Workspace): PublicationProofAnchor[] {
  const bodyTargets =
    workspace.publicationBrief?.sections.status === "provided"
      ? workspace.publicationBrief.sections.value.map(
          (section) => `section:${section.id}`,
        )
      : ["section:source-publication-body"];

  return workspace.claims.map((claim, index) => ({
    claimId: claim.id,
    targetId:
      claim.previewTargetId ??
      (claim.location === "headline"
        ? "title"
        : bodyTargets[Math.min(Math.max(index - 1, 0), bodyTargets.length - 1)] ??
          "section:source-publication-body"),
    label: `C-${String(claim.number).padStart(2, "0")}`,
  }));
}

function blockerLabel(gate: ReleaseGate, claimId: string): string {
  const blocker = gate.blockers.find((candidate) => candidate.claimId === claimId);
  if (!blocker) return "Cleared by the current deterministic rules";
  return blocker.detail;
}

function receiptStatus(
  workspace: Workspace,
): "none" | "current" | "invalidated" {
  if (workspace.receipt) return "current";
  if (workspace.invalidatedReceipt) return "invalidated";
  return "none";
}

export function ReviewStudio({
  workspace,
  selectedClaimId,
  previewVariant,
  proofVisible,
  toolStatus,
  toolsOpen,
  toolManifest,
  notice,
  receiptPending,
  releaseReadiness,
  onImport,
  onStartNew,
  onToggleTools,
  onDismissNotice,
  onVariantChange,
  onProofVisibleChange,
  onSelectClaim,
  onSelectSource,
  canStageProposal,
  onStageProposal,
  onDecideProposal,
  onApproveEvidence,
  onRunReleaseCheck,
  onCreateReceipt,
  onOpenReceipt,
}: ReviewStudioProps) {
  const gate = useMemo(() => verifyReleaseGate(workspace), [workspace]);
  const [authoritySelection, setAuthoritySelection] = useState<{
    view: AuthorityView;
    workspaceId: string;
  }>({
    view: previewVariant === "proposed" ? "proposed" : "current",
    workspaceId: workspace.id,
  });
  const authority =
    authoritySelection.workspaceId === workspace.id
      ? authoritySelection.view
      : "current";
  const [viewport, setViewport] = useState<PublicationViewport>("desktop");
  const [canvasExpanded, setCanvasExpanded] = useState(false);
  const [quickGateRun, setQuickGateRun] = useState<{
    gate: ReleaseGate;
    duration: number;
  } | null>(null);
  const quickResultRef = useRef<HTMLDivElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const expandedCanvasRef = useRef<HTMLDivElement>(null);
  const canvasColumnRef = useRef<HTMLDivElement>(null);

  const hasProposal = workspace.claims.some(
    (claim) => claim.proposal?.status === "staged",
  );
  const selectedClaim =
    workspace.claims.find((claim) => claim.id === selectedClaimId) ??
    workspace.claims[0];
  const selectedEdges = selectedClaim
    ? workspace.edges.filter((edge) => edge.claimId === selectedClaim.id)
    : [];
  const selectedEvidence = selectedEdges
    .map((edge) => ({
      edge,
      record: workspace.evidence.find((record) => record.id === edge.evidenceId),
    }))
    .filter(
      (entry): entry is typeof entry & { record: NonNullable<typeof entry.record> } =>
        Boolean(entry.record),
    );
  const selectedBlocker = selectedClaim
    ? gate.blockers.find((blocker) => blocker.claimId === selectedClaim.id)
    : undefined;
  const activeAuthority: AuthorityView =
    authority === "release-candidate" && gate.status !== "pass"
      ? "current"
      : authority === "proposed" && !hasProposal
      ? "current"
      : previewVariant === "proposed" && hasProposal && authority === "current"
        ? "proposed"
        : authority;
  const brief = useMemo(
    () => publicationBriefForView(workspace, activeAuthority),
    [activeAuthority, workspace],
  );
  const anchors = useMemo(() => proofAnchors(workspace), [workspace]);
  const currentReceiptStatus = receiptStatus(workspace);
  const displayedReceipt = workspace.receipt ?? workspace.invalidatedReceipt;
  const rendererAuthority: AuthorityState =
    activeAuthority === "current"
      ? "source"
      : activeAuthority === "proposed"
        ? "proposal"
        : "release-candidate";
  const quickGate =
    quickGateRun?.gate.checkedRevision === workspace.revision
      ? quickGateRun
      : null;

  useEffect(() => {
    if (quickGate) quickResultRef.current?.focus();
  }, [quickGate]);

  useEffect(() => {
    if (!canvasExpanded) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = expandButtonRef.current;
    const dialog = expandedCanvasRef.current;
    if (!dialog) return;
    const getFocusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getAttribute("aria-hidden") !== "true");
    document.body.style.overflow = "hidden";
    queueMicrotask(() => (getFocusable()[0] ?? dialog).focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setCanvasExpanded(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [canvasExpanded]);

  function chooseAuthority(next: AuthorityView) {
    setAuthoritySelection({ view: next, workspaceId: workspace.id });
    onVariantChange(next === "proposed" ? "proposed" : "current");
  }

  function revealClaimInCanvas(claimId: string) {
    onSelectClaim(claimId);
    onProofVisibleChange(true);
    const targetId = anchors.find((anchor) => anchor.claimId === claimId)?.targetId;
    if (!targetId) return;
    requestAnimationFrame(() => {
      const scope = canvasExpanded
        ? expandedCanvasRef.current
        : canvasColumnRef.current;
      const target = scope?.querySelector<HTMLElement>(
        `[data-proof-target="${CSS.escape(targetId)}"]`,
      );
      target?.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    });
  }

  function runQuickGate() {
    const startedAt = performance.now();
    const result = onRunReleaseCheck();
    setQuickGateRun({ gate: result, duration: performance.now() - startedAt });
    if (result.blockers[0]?.claimId.startsWith("claim-")) {
      revealClaimInCanvas(result.blockers[0].claimId);
    }
  }

  const canvas = (
    <PublicationCanvas
      brief={brief}
      authority={rendererAuthority}
      revision={workspace.revision}
      viewport={viewport}
      proofOverlay={
        proofVisible
          ? {
              anchors,
              selectedClaimId: selectedClaim?.id,
              onSelectClaim: (claimId) => onSelectClaim(claimId),
            }
          : undefined
      }
    />
  );

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <a href="#page-top" className={styles.wordmark} aria-label="ProofRail, top">
          <span aria-hidden="true">PR</span>
          <strong>ProofRail</strong>
        </a>
        <div className={styles.workspaceIdentity}>
          <span>Publication compiler</span>
          <strong>{workspace.title}</strong>
          <small>Revision {workspace.revision}</small>
        </div>
        <div className={styles.topActions}>
          <button type="button" onClick={onImport}>Import</button>
          <button type="button" onClick={onStartNew}>New review</button>
          <button
            type="button"
            className={styles.toolsButton}
            data-status={toolStatus}
            onClick={onToggleTools}
            aria-expanded={toolsOpen}
            aria-controls="proofrail-tool-manifest"
            aria-label={`${toolStatusLabels[toolStatus]}; ${toolManifest.length} WebMCP tools`}
          >
            <i aria-hidden="true" />
            <span>{toolStatusLabels[toolStatus]}</span>
            <b>{toolManifest.length}</b>
          </button>
        </div>
      </header>

      {toolsOpen ? (
        <section
          className={styles.toolManifest}
          id="proofrail-tool-manifest"
          aria-label="ProofRail WebMCP tools"
        >
          <header>
            <div>
              <span>Agent boundary / exact manifest</span>
              <h2>Prepare the review. Never impersonate the reviewer.</h2>
            </div>
            <button type="button" onClick={onToggleTools}>Close</button>
          </header>
          <ol>
            {toolManifest.map((tool, index) => (
              <li key={tool.name}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><code>{tool.name}</code><p>{tool.description}</p></div>
                <em>{tool.kind}</em>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className={styles.definition} aria-labelledby="studio-title">
        <p>For marketing + PR, immediately before publication</p>
        <h1 id="studio-title">
          See the finished page. Trace every factual sentence. Keep release human.
        </h1>
        <div aria-label="ProofRail workflow">
          <span>Current source</span><i aria-hidden="true">→</i>
          <span>Publication preview</span><i aria-hidden="true">→</i>
          <span>Claims + evidence</span><i aria-hidden="true">→</i>
          <strong>Human gate</strong>
        </div>
      </section>

      {notice ? (
        <div className={styles.notice} role="status">
          <span>{notice}</span>
          <button type="button" onClick={onDismissNotice} aria-label="Dismiss message">×</button>
        </div>
      ) : null}

      <section className={styles.studio} aria-label="Publication review workspace">
        <div className={styles.canvasColumn} ref={canvasColumnRef}>
          <div className={styles.canvasToolbar}>
            <div className={styles.authorityTabs} role="group" aria-label="Publication authority">
              {(["current", "proposed", "release-candidate"] as const).map((item) => {
                const disabled =
                  (item === "proposed" && !hasProposal) ||
                  (item === "release-candidate" && gate.status !== "pass");
                return (
                  <button
                    type="button"
                    key={item}
                    aria-pressed={activeAuthority === item}
                    disabled={disabled}
                    onClick={() => chooseAuthority(item)}
                  >
                    <span>{authorityLabels[item]}</span>
                    <small>
                      {item === "current"
                        ? `R${workspace.revision}`
                        : item === "proposed"
                          ? hasProposal ? "Human decision open" : "No proposal"
                          : gate.status === "pass" ? "Human-cleared" : "Locked"}
                    </small>
                  </button>
                );
              })}
            </div>
            <div className={styles.viewTools}>
              <div role="group" aria-label="Preview viewport">
                {(Object.keys(viewportLabels) as PublicationViewport[]).map((item) => (
                  <button
                    type="button"
                    key={item}
                    aria-pressed={viewport === item}
                    onClick={() => setViewport(item)}
                  >
                    {viewportLabels[item]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-pressed={proofVisible}
                onClick={() => onProofVisibleChange(!proofVisible)}
              >
                {proofVisible ? "Hide proof" : "Show proof"}
              </button>
              <button
                type="button"
                ref={expandButtonRef}
                onClick={() => setCanvasExpanded(true)}
              >
                Open canvas
              </button>
            </div>
          </div>
          <div className={styles.canvasWrap}>{canvas}</div>
        </div>

        <aside className={styles.reviewRail} aria-label="Contextual review rail">
          <section className={styles.gateCard} data-status={gate.status}>
            <header>
              <div>
                <span>Release readiness</span>
                <strong>{gate.status === "pass" ? "Ready for release" : "Release locked"}</strong>
              </div>
              <b>{gate.blockers.length}</b>
            </header>
            <dl>
              <div><dt>Claims</dt><dd>{workspace.claims.length}</dd></div>
              <div><dt>Cleared</dt><dd>{gate.releasableClaims}</dd></div>
              <div><dt>Human calls</dt><dd>{gate.openHumanDecisions}</dd></div>
            </dl>
            <button type="button" onClick={runQuickGate}>
              Check release readiness <span aria-hidden="true">↗</span>
            </button>
            {quickGate ? (
              <div
                ref={quickResultRef}
                className={styles.quickResult}
                role="status"
                aria-live="polite"
                tabIndex={-1}
              >
                <strong>
                  {quickGate.gate.status === "pass" ? "Ready for release" : "Release blocked"}
                </strong>
                <p>
                  {quickGate.gate.status === "pass"
                    ? "Every deterministic rule passed for this revision."
                    : quickGate.gate.blockers[0]?.detail}
                </p>
                <small>{quickGate.duration.toFixed(1)} ms · live rule result</small>
              </div>
            ) : null}
          </section>

          <section className={styles.claimIndex} aria-labelledby="claim-index-title">
            <header>
              <span id="claim-index-title">Factual claims</span>
              <strong>{workspace.claims.length}</strong>
            </header>
            <ol>
              {workspace.claims.map((claim) => {
                const blocker = gate.blockers.find((item) => item.claimId === claim.id);
                return (
                  <li key={claim.id}>
                    <button
                      type="button"
                      aria-pressed={claim.id === selectedClaim?.id}
                      onClick={() => {
                        revealClaimInCanvas(claim.id);
                      }}
                    >
                      <span>C-{String(claim.number).padStart(2, "0")}</span>
                      <strong>{claim.text}</strong>
                      <small>
                        {claim.proposal?.status === "staged"
                          ? "Proposal awaiting human review"
                          : blocker?.code.replaceAll("_", " ") ?? "Cleared"}
                      </small>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>

          {selectedClaim ? (
            <section className={styles.inspector} id="inspection-bay" tabIndex={-1}>
              <header>
                <span>Selected sentence / C-{String(selectedClaim.number).padStart(2, "0")}</span>
                <em data-state={selectedBlocker ? "blocked" : "clear"}>
                  {selectedBlocker ? "Blocked" : "Clear"}
                </em>
              </header>
              <blockquote>“{selectedClaim.text}”</blockquote>
              <p className={styles.blockerReason}>{blockerLabel(gate, selectedClaim.id)}</p>

              <div className={styles.evidenceStack}>
                <span>Linked evidence</span>
                {selectedEvidence.length ? selectedEvidence.map(({ edge, record }) => (
                  <button
                    type="button"
                    key={record.id}
                    onClick={() => onSelectSource(record.id, selectedClaim.id)}
                  >
                    <strong>{record.title}</strong>
                    <p>“{record.excerpt}”</p>
                    <small>{edge.relation} · {record.publishedAt} · {record.sourceType.replaceAll("-", " ")}</small>
                  </button>
                )) : (
                  <div className={styles.missingEvidence}>
                    <strong>No source is linked.</strong>
                    <p>The check fails closed. An agent may attach evidence; it may not clear the claim.</p>
                  </div>
                )}
              </div>

              {selectedClaim.proposal?.status === "staged" ? (
                <div className={styles.proposal}>
                  <span>Agent proposal / not approved</span>
                  <p>“{selectedClaim.proposal.after}”</p>
                  <small>{selectedClaim.proposal.rationale}</small>
                  <div>
                    <button type="button" onClick={() => onDecideProposal("reject")}>Reject</button>
                    <button type="button" onClick={() => onDecideProposal("approve")}>Approve exact wording</button>
                  </div>
                </div>
              ) : (selectedClaim.state === "supported" || selectedClaim.state === "resolved") &&
                  selectedClaim.humanApproval !== "approved" ? (
                <div className={styles.humanAction}>
                  <span>Human decision required</span>
                  <p>The source is linked. A person must decide whether it supports this exact wording.</p>
                  <button type="button" onClick={onApproveEvidence}>Approve evidence + wording</button>
                </div>
              ) : selectedBlocker && canStageProposal(selectedClaim) ? (
                <div className={styles.humanAction}>
                  <span>Safer wording</span>
                  <p>An agent may stage a narrower sentence. It will remain visibly unapproved.</p>
                  <button type="button" onClick={() => onStageProposal(selectedClaim)}>Stage available proposal</button>
                </div>
              ) : !selectedBlocker && selectedClaim.humanApproval === "approved" ? (
                <div className={styles.clearedAction}>
                  <span aria-hidden="true">✓</span>
                  <p><strong>Human-reviewed state recorded.</strong> The audit ledger keeps the decision bound to this revision.</p>
                </div>
              ) : (
                <div className={styles.pendingAction}>
                  <span>Evidence required</span>
                  <p>No supporting source and no human release decision are recorded for this claim.</p>
                </div>
              )}
            </section>
          ) : null}

          <section className={styles.receiptCard} data-status={currentReceiptStatus}>
            <span>Immutable receipt</span>
            {displayedReceipt ? (
              <>
                <strong>
                  {currentReceiptStatus === "invalidated"
                    ? "Receipt invalidated by a later revision"
                    : displayedReceipt.receiptId}
                </strong>
                <small>{displayedReceipt.contentHash.slice(0, 18)}…</small>
                {currentReceiptStatus === "invalidated" ? (
                  <p>
                    {displayedReceipt.receiptId} sealed revision {displayedReceipt.sourceWorkspaceRevision};
                    the live workspace has changed and must pass human review again.
                  </p>
                ) : null}
                <button type="button" data-receipt-trigger="true" onClick={onOpenReceipt}>
                  {currentReceiptStatus === "invalidated" ? "Inspect invalidated receipt" : "Open receipt"}
                </button>
              </>
            ) : (
              <>
                <strong>{gate.status === "pass" ? "Eligible to seal" : "Locked until gate passes"}</strong>
                <p>Receipt creation is separate from release readiness and never publishes.</p>
                <button
                  type="button"
                  data-receipt-trigger="true"
                  disabled={gate.status !== "pass" || receiptPending}
                  onClick={onCreateReceipt}
                >
                  {receiptPending ? "Creating receipt" : "Create release receipt"}
                </button>
              </>
            )}
          </section>
        </aside>
      </section>

      <section className={styles.releaseSection} aria-label="Full release check">
        {releaseReadiness}
      </section>

      <section className={styles.ledger} aria-label="Workspace audit ledger">
        <header>
          <span>Immutable decision trail</span>
          <strong>{workspace.audit.length} events · current revision {workspace.revision}</strong>
        </header>
        <ol>
          {workspace.audit.slice().reverse().slice(0, 10).map((event) => (
            <li key={event.id}>
              <span>R{event.workspaceRevision}</span>
              <div><strong>{event.action.replaceAll("_", " ")}</strong><p>{event.detail}</p></div>
              <em>{event.actor}</em>
            </li>
          ))}
        </ol>
      </section>

      <footer className={styles.footer}>
        <strong>ProofRail makes release risk inspectable. It never decides truth for you.</strong>
        <span>Local challenge prototype · no autonomous approval · no autonomous publishing</span>
      </footer>

      {canvasExpanded ? (
        <div
          ref={expandedCanvasRef}
          className={styles.expandedCanvas}
          role="dialog"
          aria-modal="true"
          aria-label="Expanded publication canvas"
          tabIndex={-1}
        >
          <header>
            <div><span>{authorityLabels[activeAuthority]}</span><strong>{workspace.title}</strong></div>
            <button type="button" onClick={() => setCanvasExpanded(false)}>Close canvas</button>
          </header>
          {canvas}
        </div>
      ) : null}
    </div>
  );
}
