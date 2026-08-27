import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { chromium } from "playwright";

const baseUrl = process.env.PROOFRAIL_BASE_URL ?? "http://127.0.0.1:4176";
const outputPath = path.resolve("docs/qa/workflow-e2e.json");
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
    colorScheme: "light",
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto(`${baseUrl}/qa/self-demo`, { waitUntil: "domcontentloaded" });
  await page.getByRole("region", { name: "Publication review workspace" }).waitFor();

  const firstGateStart = performance.now();
  await page.getByRole("button", { name: "Check release readiness" }).first().click();
  await page.getByText("Release blocked", { exact: true }).first().waitFor();
  const firstGateMs = performance.now() - firstGateStart;
  assert.ok(firstGateMs <= 150, `Initial gate feedback ${firstGateMs}ms > 150ms`);
  assert.match(await page.locator("main").innerText(), /Selected sentence \/ C-01/i);

  await page.getByRole("button", { name: "Approve evidence + wording" }).click();
  await page.getByRole("button", { name: /^C-04 / }).click();
  await page.getByRole("button", { name: "Approve evidence + wording" }).click();

  const passingGateStart = performance.now();
  await page.getByRole("button", { name: "Check release readiness" }).first().click();
  await page.getByText("Ready for release", { exact: true }).first().waitFor();
  const passingGateMs = performance.now() - passingGateStart;
  assert.ok(passingGateMs <= 150, `Passing gate feedback ${passingGateMs}ms > 150ms`);

  await page.getByRole("button", { name: "Create release receipt" }).click();
  const receiptDialog = page.getByRole("dialog", { name: /^proof-/i });
  await receiptDialog.waitFor();
  const receiptText = await receiptDialog.innerText();
  assert.match(receiptText, /Receipt state\s+Current/i);
  assert.match(receiptText, /Content hash\s+[a-f0-9]{64}/i);

  await page.keyboard.press("Escape");
  await receiptDialog.waitFor({ state: "hidden" });
  await page.waitForTimeout(50);
  assert.equal(
    await page.evaluate(
      () =>
        document.activeElement?.getAttribute("data-receipt-trigger") === "true" &&
        document.activeElement?.textContent?.trim() === "Open receipt",
    ),
    true,
    "Receipt dialog did not return focus to the current receipt trigger",
  );

  await page.getByRole("button", { name: "Import", exact: true }).click();
  const importDialog = page.getByRole("dialog", { name: "Load a fresh draft" });
  await importDialog.waitFor();
  await page.getByLabel("Publishing organization").fill("ProofRail QA");
  await page.getByLabel("Primary audience").fill("Marketing teams");
  await page.getByLabel("Pasted source format").selectOption("text/html");
  await page.getByLabel("Internal packet title").fill("Replacement packet");
  await page
    .getByLabel("Public headline")
    .fill("A revised publication requires a fresh review.");
  const importedHtmlSentences = Array.from(
    { length: 75 },
    (_, index) =>
      `Imported HTML sentence ${String(index + 1).padStart(2, "0")} remains exact and reviewable.`,
  );
  await page
    .getByLabel("Public body copy")
    .fill(`<main>${importedHtmlSentences.map((sentence) => `<p>${sentence}</p>`).join("")}</main>`);
  await page.getByRole("button", { name: "Load unreviewed packet" }).click();
  await importDialog.waitFor({ state: "hidden" });

  const replacedText = await page.locator("main").innerText();
  assert.match(replacedText, /Receipt invalidated by a later revision/i);
  assert.match(replacedText, /A revised publication requires a fresh review\./i);
  assert.match(replacedText, /Imported HTML sentence 01 remains exact and reviewable\./i);
  assert.match(replacedText, /Imported HTML sentence 75 remains exact and reviewable\./i);
  assert.doesNotMatch(replacedText, /TOO_MANY_CANDIDATES|<p>/i);
  assert.equal(
    await page.getByRole("button", { name: /^C-[0-9]{2} / }).count(),
    76,
    "75 imported HTML body sentences plus the headline did not remain exact claims",
  );
  assert.doesNotMatch(replacedText, /ProofRail self-demo/i);

  const invalidatedGateStart = performance.now();
  await page.getByRole("button", { name: "Check release readiness" }).first().click();
  await page.getByText("Release blocked", { exact: true }).first().waitFor();
  const invalidatedGateMs = performance.now() - invalidatedGateStart;
  assert.ok(
    invalidatedGateMs <= 150,
    `Invalidated gate feedback ${invalidatedGateMs}ms > 150ms`,
  );
  assert.deepEqual(consoleErrors, [], "Workflow emitted console errors");

  const report = {
    status: "pass",
    baseUrl,
    generatedAt: new Date().toISOString(),
    reducedMotion: "reduce",
    gateFeedbackMs: {
      initialBlocked: Math.round(firstGateMs * 10) / 10,
      humanApproved: Math.round(passingGateMs * 10) / 10,
      receiptInvalidated: Math.round(invalidatedGateMs * 10) / 10,
    },
    assertions: [
      "initial-release-blocked",
      "first-blocker-focused",
      "two-visible-human-decisions",
      "release-ready-after-human-review",
      "separate-content-bound-receipt",
      "receipt-dialog-focus-return",
      "source-replacement-removes-self-demo",
      "seventy-five-html-sentences-imported-exactly",
      "later-revision-invalidates-receipt",
      "later-revision-blocks-release-again",
      "console-errors-zero",
    ],
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
