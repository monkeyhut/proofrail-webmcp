import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function read(relativePath: string): string {
  const path = resolve(repoRoot, relativePath);
  assert.ok(existsSync(path), `CLARITY_SOURCE_MISSING: ${relativePath}`);
  return readFileSync(path, "utf8");
}

const emptyStudio = read("app/empty-studio.tsx");
const reviewStudio = read("app/review-studio.tsx");
const app = read("app/proofrail-app.tsx");
const gate = read("app/release-readiness.tsx");
const rendererFacade = read("app/publication-renderers/publication-canvas.tsx");

type Criterion = {
  name: string;
  points: number;
  pass: boolean;
  evidence: string;
};

const firstView = emptyStudio.toLowerCase();
const loadedView = reviewStudio.toLowerCase();

const criteria: Criterion[] = [
  {
    name: "audience and moment",
    points: 15,
    pass:
      firstView.includes("marketing + pr") &&
      firstView.includes("before publication"),
    evidence: "The first screen names marketing/PR and the pre-publication moment.",
  },
  {
    name: "input and first action",
    points: 15,
    pass:
      firstView.includes("import the publication you are preparing") &&
      ["url", "text / html", "file", "brand assets"].every((item) =>
        firstView.includes(item),
      ),
    evidence: "The primary action and accepted source categories are explicit.",
  },
  {
    name: "output",
    points: 15,
    pass:
      firstView.includes("renders") &&
      ["launch", "case study", "article", "report"].every((item) =>
        firstView.includes(item),
      ) &&
      loadedView.includes("publicationcanvas"),
    evidence: "The copy promises a rendered publication and the loaded state uses the real canvas.",
  },
  {
    name: "human authority difference",
    points: 15,
    pass:
      firstView.includes("only the visible human review") &&
      loadedView.includes("agent proposal / not approved") &&
      loadedView.includes("human decision required"),
    evidence: "Agent proposals and human decisions remain visibly different states.",
  },
  {
    name: "tool-first workspace",
    points: 15,
    pass:
      loadedView.includes("publication review workspace") &&
      loadedView.includes("contextual review rail") &&
      loadedView.includes("current source") &&
      loadedView.includes("release candidate"),
    evidence: "The loaded experience is a canvas/review-rail workspace with explicit authority tabs.",
  },
  {
    name: "four structural renderers",
    points: 10,
    pass:
      [
        "launch-renderer.tsx",
        "case-study-renderer.tsx",
        "article-renderer.tsx",
        "report-renderer.tsx",
      ].every((file) => existsSync(resolve(repoRoot, "app/publication-renderers", file))) &&
      ["LaunchRenderer", "CaseStudyRenderer", "ArticleRenderer", "ReportRenderer"].every(
        (name) => rendererFacade.includes(name),
      ),
    evidence: "Four separate renderer modules are selected by a discriminated facade.",
  },
  {
    name: "real release check",
    points: 10,
    pass:
      app.includes("verifyReleaseGate(workspaceRef.current)") &&
      gate.includes("await runReleaseCheck()") &&
      gate.includes("setGate(nextGate)") &&
      !/setTimeout|setInterval/.test(gate),
    evidence: "Both visible check surfaces call the deterministic live gate; the detailed check has no timer.",
  },
  {
    name: "no decorative media dependency",
    points: 5,
    pass:
      !app.includes("<video") &&
      !app.includes("model-viewer") &&
      !reviewStudio.includes("<video") &&
      !reviewStudio.includes("model-viewer"),
    evidence: "The primary experience does not depend on cinematic or 3D decoration.",
  },
];

const score = criteria.reduce(
  (total, criterion) => total + (criterion.pass ? criterion.points : 0),
  0,
);
const failed = criteria.filter((criterion) => !criterion.pass);

assert.equal(
  failed.length,
  0,
  `CLARITY_CRITERIA_FAILED: ${failed.map((item) => item.name).join(", ")}`,
);
assert.ok(score >= 90, `CLARITY_SCORE_TOO_LOW: ${score}/100`);

for (const obsoletePath of [
  "app/publication-preview.tsx",
  "app/workflow-cinematic.tsx",
  "public/media/proofrail-block.mp4",
  "public/media/proofrail-release.mp4",
  "public/media/proofrail-evidence-core.glb",
]) {
  assert.equal(
    existsSync(resolve(repoRoot, obsoletePath)),
    false,
    `OBSOLETE_RUNTIME_PRESENT: ${obsoletePath}`,
  );
}

console.log(
  JSON.stringify(
    {
      status: "pass",
      score,
      threshold: 90,
      criteria: criteria.map(({ name, points, pass, evidence }) => ({
        name,
        score: pass ? points : 0,
        possible: points,
        evidence,
      })),
      limitation:
        "This is a deterministic source-contract check. Independent people and browser evidence remain separate gauntlet gates.",
    },
    null,
    2,
  ),
);
