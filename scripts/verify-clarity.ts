import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app/proofrail-app.tsx", import.meta.url), "utf8");
const previewSource = readFileSync(
  new URL("../app/publication-preview.tsx", import.meta.url),
  "utf8",
);
const heroStart = source.indexOf('<section className="rail-hero"');
const heroEnd = source.indexOf("{notice &&", heroStart);

assert.ok(heroStart >= 0 && heroEnd > heroStart, "CLARITY_HERO_NOT_FOUND");

const hero = source.slice(heroStart, heroEnd).toLowerCase().replace(/\s+/g, " ");

const criteria = [
  {
    name: "target audience",
    points: 20,
    needles: ["pre-publication workspace", "marketing and pr", "not a news site"],
  },
  {
    name: "input types",
    points: 20,
    needles: ["launch page", "case study", "article", "report"],
  },
  {
    name: "agent job",
    points: 20,
    needles: ["ai checks", "source evidence", "stage a safer revision"],
  },
  {
    name: "human authority",
    points: 20,
    needles: ["human makes the final call", "one human gate"],
  },
  {
    name: "release condition",
    points: 20,
    needles: ["until then", "publishing stays locked"],
  },
] as const;

const results = criteria.map((criterion) => {
  const missing = criterion.needles.filter((needle) => !hero.includes(needle));
  return {
    name: criterion.name,
    score: missing.length === 0 ? criterion.points : 0,
    possible: criterion.points,
    missing,
  };
});

const score = results.reduce((sum, result) => sum + result.score, 0);
const mobileActions = hero.indexOf('className="rail-hero__actions"'.toLowerCase());
const definition = hero.indexOf('className="rail-definition"'.toLowerCase());

assert.ok(
  mobileActions > definition,
  "CLARITY_MOBILE_ACTIONS_PRECEDE_PRODUCT_DEFINITION",
);
assert.ok(
  hero.indexOf("<publicationpreview") >= 0 &&
    hero.indexOf('classname="rail-preview-stage__evidence"') >= 0,
  "CLARITY_PREVIEW_OR_SEPARATE_EVIDENCE_RAIL_MISSING",
);
assert.ok(
  hero.indexOf("<publicationpreview") >= 0 &&
    hero.indexOf("<publicationpreview") < hero.indexOf("</section>"),
  "CLARITY_PREVIEW_NOT_INSIDE_OPENING_PRODUCT_STAGE",
);
for (const requiredPreviewPhrase of [
  "Layout + art-direction simulation.",
  "Preview only · publish locked",
  "AI proposal",
  "Human approved",
]) {
  assert.ok(
    previewSource.includes(requiredPreviewPhrase),
    `CLARITY_PREVIEW_PHRASE_MISSING: ${requiredPreviewPhrase}`,
  );
}
assert.equal(
  previewSource.includes("dangerouslySetInnerHTML"),
  false,
  "CLARITY_PREVIEW_MUST_RENDER_TEXT_NODES",
);
for (const publicationType of [
  'projection.publicationType === "project-page"',
  'projection.publicationType === "blog-post"',
  'projection.publicationType === "launch-page"',
  'projection.publicationType === "report"',
]) {
  assert.ok(
    previewSource.includes(publicationType),
    `CLARITY_TYPE_AWARE_PREVIEW_MISSING: ${publicationType}`,
  );
}
assert.equal(source.includes("<CinematicVideo"), false, "CLARITY_UNRELATED_VIDEO_PRESENT");
assert.equal(source.includes("<DeferredProofArtifact"), false, "CLARITY_UNRELATED_3D_PRESENT");
assert.equal(
  previewSource.includes("paragraphs.slice(0,"),
  false,
  "CLARITY_COMPACT_PREVIEW_MUST_KEEP_COMPLETE_BODY_SCROLLABLE",
);
assert.equal(
  previewSource.includes("workspace.evidence"),
  false,
  "CLARITY_INTERNAL_EVIDENCE_MUST_NOT_LEAK_INTO_PUBLIC_PREVIEW",
);
assert.equal(
  previewSource.includes('"72%"'),
  false,
  "CLARITY_PREVIEW_MUST_NOT_INVENT_CHART_VALUES",
);
assert.equal(
  previewSource.includes("profile.methodology") ||
    previewSource.includes("heroAssetCaption"),
  false,
  "CLARITY_UNSCOPED_PUBLIC_PROSE_MUST_NOT_BYPASS_CLAIM_GATE",
);
assert.equal(
  previewSource.includes("<strong>{projection.title}</strong>"),
  false,
  "CLARITY_INTERNAL_PACKET_TITLE_MUST_NOT_APPEAR_AS_PUBLIC_COPY",
);
assert.ok(score >= 90, `CLARITY_SCORE_TOO_LOW: ${score}/100`);

console.log(
  JSON.stringify(
    {
      status: "pass",
      score,
      threshold: 90,
      results,
      rubric:
        "Source-level clarity heuristic: audience, publication inputs, live preview, AI role, human authority, publish condition",
    },
    null,
    2,
  ),
);
