import { ProofRailApp } from "../../proofrail-app";

/**
 * Deterministic representative route for Lighthouse, axe, and browser-matrix
 * QA. It loads only ProofRail's explicitly labelled, repository-backed
 * self-demo; the public root remains honest and empty-first.
 */
export default function ProofRailSelfDemoQaPage() {
  return <ProofRailApp initialDemo />;
}
