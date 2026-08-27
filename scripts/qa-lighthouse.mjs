import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import { chromium } from "playwright";

const targetUrl =
  process.env.PROOFRAIL_LIGHTHOUSE_URL ??
  "http://127.0.0.1:4176/qa/self-demo";
const outputPath = path.resolve("docs/qa/lighthouse-self-demo.json");
const profilePath = path.resolve(
  "node_modules/.cache",
  `proofrail-lighthouse-${process.pid}`,
);

await mkdir(path.dirname(outputPath), { recursive: true });
await mkdir(profilePath, { recursive: true });

const preflight = await fetch(targetUrl, { redirect: "manual" });
assert.ok(
  preflight.ok,
  `Lighthouse target was not ready: ${preflight.status} ${preflight.statusText}`,
);

const chrome = await launch({
  chromePath: chromium.executablePath(),
  // Use the same pinned Chromium binary as the cross-browser QA. The machine's
  // system Chrome produced terminal-only white filmstrips on Windows headless.
  chromeFlags: ["--headless=new", "--no-sandbox"],
  userDataDir: profilePath,
});

try {
  const result = await lighthouse(targetUrl, {
    port: chrome.port,
    output: "json",
    logLevel: "error",
    onlyCategories: [
      "performance",
      "accessibility",
      "best-practices",
      "seo",
    ],
  });
  assert.ok(result, "Lighthouse did not return a report");

  const report = result.lhr;
  const frames =
    report.audits["screenshot-thumbnails"].details?.items ?? [];
  const observed = report.audits.metrics.details?.items?.[0];
  const terminalOnlyPaint =
    frames.length >= 3 &&
    frames.slice(0, -1).every((frame) => frame.data === frames[0].data) &&
    frames.at(-1)?.data !== frames[0].data;
  const suspiciousFilmstrip =
    terminalOnlyPaint &&
    Number(observed?.observedFirstContentfulPaint) > 5000 &&
    Math.abs(
      Number(observed?.observedFirstContentfulPaint) -
        Number(observed?.observedLargestContentfulPaint),
    ) < 1;

  assert.equal(
    suspiciousFilmstrip,
    false,
    "INVALID_LIGHTHOUSE_FILMSTRIP: content appeared only in the terminal frame; the score was not recorded.",
  );

  const scores = Object.fromEntries(
    Object.entries(report.categories).map(([key, category]) => [
      key,
      Math.round((category.score ?? 0) * 100),
    ]),
  );
  const metrics = {
    lcpMs: report.audits["largest-contentful-paint"].numericValue,
    cls: report.audits["cumulative-layout-shift"].numericValue,
    tbtMs: report.audits["total-blocking-time"].numericValue,
    speedIndexMs: report.audits["speed-index"].numericValue,
    transfer: report.audits["total-byte-weight"].displayValue,
  };

  assert.ok(scores.performance >= 90, `Performance ${scores.performance} < 90`);
  assert.ok(scores.accessibility >= 95, `Accessibility ${scores.accessibility} < 95`);
  assert.ok(scores["best-practices"] >= 95, `Best Practices ${scores["best-practices"]} < 95`);
  assert.ok(scores.seo >= 90, `SEO ${scores.seo} < 90`);
  assert.ok(metrics.lcpMs <= 2500, `LCP ${metrics.lcpMs}ms > 2500ms`);
  assert.ok(metrics.cls <= 0.1, `CLS ${metrics.cls} > 0.1`);
  assert.equal(report.runtimeError, undefined, "Lighthouse reported a runtime error");

  // Only a valid, passing run may replace the canonical QA artifact.
  await writeFile(outputPath, JSON.stringify(report, null, 2), "utf8");

  console.log(
    JSON.stringify(
      {
        status: "pass",
        targetUrl,
        generatedAt: report.fetchTime,
        scores,
        metrics,
        runWarnings: report.runWarnings,
      },
      null,
      2,
    ),
  );
} finally {
  await chrome.kill();
}
