import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.PROOFRAIL_BASE_URL ?? "http://127.0.0.1:4176";
const screenshotDirectory = path.resolve("docs/submission-assets/renderers");
const outputPath = path.resolve("docs/qa/renderer-captures.json");

const fixtures = [
  {
    slug: "launch",
    format: "launch-page",
    authorLabel: "Launch owner / team",
    headline: "A human gate before public claims leave the room.",
    body: "ProofRail renders the publication under review. Every factual sentence stays connected to evidence and human authority.",
    fields: {
      "Deck / standfirst": "The publication compiler for marketing and PR teams.",
      "Product name": "ProofRail",
      Positioning: "Preview the final publication, trace claims, and keep release human.",
      "Feature chapter heading": "Trace every public claim",
      "Feature chapter body": "Select a factual sentence and inspect its exact source, relationship, and revision.",
      "Benefit chapter heading": "Keep authority visible",
      "Benefit chapter body": "Agent proposals remain separate until a person accepts the exact wording.",
      "Use-case audience": "Marketing and PR teams",
      "Use-case outcome": "A reviewable release candidate with a content-bound receipt.",
      Availability: "Available as a local WebMCP challenge prototype.",
      "Pricing / access": "No commercial access claim is made in this prototype.",
    },
  },
  {
    slug: "case-study",
    format: "project-page",
    authorLabel: "Studio / project author",
    headline: "Rebuilding ProofRail around the publication itself.",
    body: "The rebuild replaced a fictional demo with an honest import-first review studio. The result separates source, proposal, human decision, release candidate, and receipt.",
    fields: {
      "Deck / standfirst": "An internal product case study about making release state legible.",
      Client: "ProofRail",
      Project: "Publication Compiler rebuild",
      Roles: "Product direction\nEditorial design\nDesign engineering\nWebMCP safety",
      Scope: "Import model\nFour publication renderers\nHuman release gate\nReceipt integrity",
      Challenge: "The previous experience obscured what the product did and relied on an invented customer demo.",
      Insight: "The publication under review must be the dominant visual object, while authority stays explicit beside it.",
      Approach: "Start empty, retain source provenance, render type-specific output, and stop every release at a visible human boundary.",
      "System-in-use heading": "One state, two readers",
      "System in use": "The human interface and six WebMCP tools operate on the same revisioned workspace.",
      "Implementation heading": "Fail loudly at revision conflicts",
      "Implementation detail": "Every mutation binds an expected workspace revision; stale writes leave the current state unchanged.",
      Outcomes: "Four structurally separate renderers\nDeterministic release checks\nContent-bound receipt invalidation",
      Credits: "ProofRail product team",
    },
  },
  {
    slug: "article",
    format: "blog-post",
    authorLabel: "Article author",
    headline: "Why public claims need a release boundary, not another writing assistant.",
    body: "Publishing risk begins after copy looks finished. ProofRail makes the source, claim, evidence, proposal, and human decision inspectable before release.",
    fields: {
      "Deck / standfirst": "A product note on evidence, authority, and the moment before publication.",
      "Publication / masthead": "ProofRail Product Notes",
      "Editorial category": "Release governance",
      Thesis: "A useful agent may prepare evidence and wording, but the final public decision must remain visibly human.",
      "Pull quote": "A proposal is not a release candidate.",
      "Quote attribution": "ProofRail product contract",
    },
  },
  {
    slug: "report",
    format: "report",
    authorLabel: "Author / institution",
    headline: "Publication readiness: local prototype validation.",
    body: "This report records the ProofRail prototype contract and its local verification boundaries. It does not claim a public deployment, customer adoption, or legal approval.",
    fields: {
      "Deck / standfirst": "A bounded evidence report for the WebMCP challenge prototype.",
      "Issuing institution": "ProofRail",
      "Edition / version": "Local validation · August 2026",
      Abstract: "ProofRail compiles source material into a typed publication review and protects the human release boundary.",
      "Executive summary": "Local tests cover the domain model, browser workflow, accessibility, responsive behavior, and representative performance.",
      "Numbered findings": "Human authority | Agent tools cannot approve or publish\nRevision integrity | Stale writes fail loudly\nReceipt validity | Later source changes invalidate the prior receipt",
      Methodology: "Deterministic domain tests, reduced-motion browser E2E, a three-engine viewport matrix, axe, and Lighthouse.",
      Limitations: "No public deployment, field INP, authentication, shared database, or multi-user production validation is claimed.",
    },
  },
];

const viewports = [
  { name: "desktop", width: 1280, height: 800, canvasMode: "Desktop" },
  { name: "mobile", width: 390, height: 844, canvasMode: "Mobile" },
];

await mkdir(screenshotDirectory, { recursive: true });
await mkdir(path.dirname(outputPath), { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const fixture of fixtures) {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        reducedMotion: "reduce",
        colorScheme: "light",
      });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => consoleErrors.push(error.message));

      await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
      await page
        .getByRole("button", { name: "Import the publication you are preparing" })
        .click();
      const importDialog = page.getByRole("dialog", { name: "Load a fresh draft" });
      await importDialog.waitFor();
      await page.getByLabel("Publication format").selectOption(fixture.format);
      await page.getByLabel("Publishing organization").fill("ProofRail");
      await page.getByLabel("Primary audience").fill("Marketing and PR teams");
      await page.getByLabel(fixture.authorLabel, { exact: true }).fill("ProofRail product team");
      await page.getByLabel("Publication date / version").fill("August 2026");
      if (fixture.format !== "report") {
        await page.getByLabel("Primary CTA").fill("Review the release");
      }
      await page.getByLabel("Internal packet title").fill(`ProofRail ${fixture.slug} renderer QA`);
      await page.getByLabel("Public headline").fill(fixture.headline);
      await page.getByLabel("Public body copy").fill(fixture.body);
      for (const [label, value] of Object.entries(fixture.fields)) {
        await page.getByLabel(label, { exact: true }).fill(value);
      }
      await page.getByRole("button", { name: "Load unreviewed packet" }).click();
      await importDialog.waitFor({ state: "hidden" });
      await page.getByRole("region", { name: "Publication review workspace" }).waitFor();
      const mainText = await page.locator("main").innerText();
      assert.match(mainText, new RegExp(fixture.headline.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.doesNotMatch(mainText, /ProofRail self-demo/i);

      await page.getByRole("button", { name: viewport.canvasMode, exact: true }).click();
      await page.getByRole("button", { name: "Open canvas" }).click();
      const canvasDialog = page.getByRole("dialog", {
        name: "Expanded publication canvas",
      });
      await canvasDialog.waitFor();
      const overflow = await canvasDialog.evaluate(
        (element) => element.scrollWidth > element.clientWidth + 1,
      );
      assert.equal(overflow, false, `${fixture.slug} ${viewport.name} canvas overflowed`);

      const fileName = `proofrail-${fixture.slug}-${viewport.name}.png`;
      const filePath = path.join(screenshotDirectory, fileName);
      await page.screenshot({ path: filePath, fullPage: false });
      const bytes = await readFile(filePath);
      assert.deepEqual(consoleErrors, [], `${fixture.slug} ${viewport.name} emitted console errors`);
      results.push({
        renderer: fixture.slug,
        viewport: `${viewport.width}x${viewport.height}`,
        file: `docs/submission-assets/renderers/${fileName}`,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex").toUpperCase(),
        overflow: false,
        consoleErrors: 0,
      });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const report = {
  status: "pass",
  baseUrl,
  generatedAt: new Date().toISOString(),
  renderers: fixtures.map((fixture) => fixture.slug),
  results,
};
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
