import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app/proofrail-app.tsx", import.meta.url), "utf8");
const heroStart = source.indexOf('<section className="inspection-hero"');
const heroEnd = source.indexOf("{notice &&", heroStart);

assert.ok(heroStart >= 0 && heroEnd > heroStart, "CLARITY_HERO_NOT_FOUND");

const hero = source.slice(heroStart, heroEnd).toLowerCase();

const criteria = [
  {
    name: "target audience",
    points: 20,
    needles: ["pre-publication", "marketing and pr teams"],
  },
  {
    name: "input types",
    points: 20,
    needles: ["company website", "launch page", "report"],
  },
  {
    name: "agent job",
    points: 20,
    needles: ["ai checks", "linked sources"],
  },
  {
    name: "human authority",
    points: 20,
    needles: ["human approves", "exact words", "evidence"],
  },
  {
    name: "release condition",
    points: 20,
    needles: ["publish stays locked", "unlocks only when every claim clears"],
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
const mobileActions = hero.indexOf('className="mobile-actions"'.toLowerCase());
const definition = hero.indexOf('className="hero-definition"'.toLowerCase());

assert.ok(
  mobileActions > definition,
  "CLARITY_MOBILE_ACTIONS_PRECEDE_PRODUCT_DEFINITION",
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
        "5-second comprehension contract: audience, input, AI role, human authority, publish condition",
    },
    null,
    2,
  ),
);
