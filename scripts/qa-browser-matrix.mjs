import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox, webkit } from "playwright";

const baseUrl = process.env.PROOFRAIL_BASE_URL ?? "http://127.0.0.1:4176";
const writeScreenshots = process.env.PROOFRAIL_QA_SCREENSHOTS !== "0";
const outputDirectory = path.resolve("docs/qa");
const screenshotDirectory = path.resolve("docs/submission-assets");
const requiredViewports = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 1000 },
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
  { width: 320, height: 568 },
];
const engines = { chromium, firefox, webkit };
const results = [];

await mkdir(outputDirectory, { recursive: true });
if (writeScreenshots) await mkdir(screenshotDirectory, { recursive: true });

function viewportName(viewport) {
  return `${viewport.width}x${viewport.height}`;
}

async function pageDiagnostics(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const undersizedTargets = Array.from(
      document.querySelectorAll("button, a, input, textarea, select, summary"),
    )
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label:
            element.getAttribute("aria-label") ??
            element.textContent?.trim().slice(0, 80) ??
            element.tagName,
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
        };
      })
      .filter((target) => target.width < 44 || target.height < 44);
    const smallBodyText = Array.from(document.querySelectorAll("p, blockquote"))
      .filter(visible)
      .map((element) => ({
        text: element.textContent?.trim().slice(0, 80) ?? "",
        size: Number.parseFloat(getComputedStyle(element).fontSize),
      }))
      .filter((item) => item.size < 16);
    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      undersizedTargets,
      smallBodyText,
    };
  });
}

for (const [engineName, engine] of Object.entries(engines)) {
  const browser = await engine.launch({ headless: true });
  try {
    const viewports = requiredViewports;

    for (const viewport of viewports) {
      console.log(`[qa] ${engineName} ${viewportName(viewport)}`);
      const context = await browser.newContext({
        viewport,
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
      await page.locator("main h1").filter({ hasText: "See the page." }).waitFor();
      const emptyText = await page.locator("main").innerText();
      assert.match(emptyText, /For marketing \+ PR/i);
      assert.match(emptyText, /Import the publication you are preparing/i);
      assert.match(emptyText, /finished launch, case study, article, or report/i);
      assert.match(emptyText, /Only the visible human review can clear a release/i);
      assert.doesNotMatch(
        emptyText,
        /northstar|northern|arbor|trusted by 800|acme/i,
      );
      const emptyDiagnostics = await pageDiagnostics(page);
      let mobileImportDialog = "not-applicable";
      assert.ok(
        emptyDiagnostics.scrollWidth <= emptyDiagnostics.clientWidth + 1,
        `${engineName} ${viewportName(viewport)} empty state has horizontal overflow`,
      );
      assert.deepEqual(
        emptyDiagnostics.undersizedTargets,
        [],
        `${engineName} ${viewportName(viewport)} empty state has undersized targets`,
      );
      if (viewport.width <= 390) {
        assert.deepEqual(
          emptyDiagnostics.smallBodyText,
          [],
          `${engineName} ${viewportName(viewport)} empty state has body text below 16px`,
        );
      }

      if (
        writeScreenshots &&
        engineName === "chromium" &&
        (viewport.width === 1280 || viewport.width === 390)
      ) {
        await page.screenshot({
          path: path.join(
            screenshotDirectory,
            `proofrail-empty-${viewportName(viewport)}.png`,
          ),
          fullPage: false,
        });
      }

      if (engineName === "chromium" && viewport.width === 320) {
        const importTrigger = page
          .getByRole("button", { name: "Import the publication you are preparing" })
          .first();
        await importTrigger.click();
        const importDialog = page.getByRole("dialog", { name: "Load a fresh draft" });
        await importDialog.waitFor();
        await page.getByRole("button", { name: "Close import" }).waitFor();
        assert.equal(
          await page.evaluate(() => document.activeElement?.getAttribute("aria-label")),
          "Close import",
          "320x568 import dialog did not receive deterministic initial focus",
        );
        const dialogReadingSizes = await importDialog
          .locator("label, input, textarea, select")
          .evaluateAll((elements) =>
            elements
              .filter((element) => {
                const style = getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                return style.display !== "none" && rect.width > 0 && rect.height > 0;
              })
              .map((element) => ({
                label: element.textContent?.trim().slice(0, 60) || element.tagName,
                size: Number.parseFloat(getComputedStyle(element).fontSize),
              }))
              .filter((item) => item.size < 16),
          );
        assert.deepEqual(
          dialogReadingSizes,
          [],
          "320x568 import dialog has labels or field text below 16px",
        );
        assert.deepEqual(
          (await pageDiagnostics(page)).undersizedTargets,
          [],
          "320x568 import dialog has undersized targets",
        );
        await page.keyboard.press("Escape");
        await importDialog.waitFor({ state: "hidden" });
        assert.equal(
          await importTrigger.evaluate((element) => element === document.activeElement),
          true,
          "Import dialog did not return focus to its trigger",
        );
        mobileImportDialog = {
          labelsOrFieldsBelow16: 0,
          undersizedTargets: 0,
          focusTrapAndReturn: "pass",
        };
      }

      await page.goto(`${baseUrl}/qa/self-demo`, {
        waitUntil: "domcontentloaded",
      });
      await page.getByRole("region", { name: "Publication review workspace" }).waitFor();
      const loadedText = await page.locator("main").innerText();
      assert.match(loadedText, /ProofRail self-demo/i);
      assert.match(
        loadedText,
        /ProofRail keeps public claims locked until a human approves the final wording/i,
      );
      assert.match(loadedText, /Current source/i);
      assert.match(loadedText, /Release candidate\s+Locked/i);
      assert.doesNotMatch(loadedText, /Published/i);

      const loadedDiagnostics = await pageDiagnostics(page);
      assert.ok(
        loadedDiagnostics.scrollWidth <= loadedDiagnostics.clientWidth + 1,
        `${engineName} ${viewportName(viewport)} loaded state has horizontal overflow`,
      );
      assert.deepEqual(
        loadedDiagnostics.undersizedTargets,
        [],
        `${engineName} ${viewportName(viewport)} loaded state has undersized targets`,
      );
      if (viewport.width <= 390) {
        assert.deepEqual(
          loadedDiagnostics.smallBodyText,
          [],
          `${engineName} ${viewportName(viewport)} loaded state has body text below 16px`,
        );
      }

      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const severeAxeViolations = axe.violations.filter((violation) =>
        ["critical", "serious"].includes(violation.impact ?? ""),
      );
      assert.deepEqual(
        severeAxeViolations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          nodes: violation.nodes.length,
          details: violation.nodes.map((node) => ({
            target: node.target,
            html: node.html,
            failureSummary: node.failureSummary,
          })),
        })),
        [],
        `${engineName} ${viewportName(viewport)} has critical/serious axe violations`,
      );

      if (
        writeScreenshots &&
        engineName === "chromium" &&
        (viewport.width === 1280 || viewport.width === 390)
      ) {
        await page.evaluate(() =>
          document.documentElement.scrollTo({ top: 0, left: 0, behavior: "instant" }),
        );
        await page.screenshot({
          path: path.join(
            screenshotDirectory,
            `proofrail-self-demo-${viewportName(viewport)}.png`,
          ),
          fullPage: false,
        });
      }

      const gateButton = page
        .getByRole("button", { name: "Check release readiness" })
        .first();
      await gateButton.click();
      await page.getByText("Release blocked", { exact: true }).first().waitFor();
      assert.match(await page.locator("main").innerText(), /LIVE RULE RESULT/i);

      if (viewport.width <= 390) {
        const claimFour = page.getByRole("button", { name: /^C-04 / });
        await claimFour.click();
        await page.getByText("Selected sentence / C-04", { exact: true }).waitFor();
      }

      assert.deepEqual(
        consoleErrors,
        [],
        `${engineName} ${viewportName(viewport)} emitted console errors`,
      );
      results.push({
        engine: engineName,
        viewport: viewportName(viewport),
        empty: {
          overflow: false,
          undersizedTargets: 0,
          mobileBodyBelow16: viewport.width <= 390 ? 0 : "not-applicable",
          mobileImportDialog,
        },
        loaded: {
          overflow: false,
          undersizedTargets: 0,
          mobileBodyBelow16: viewport.width <= 390 ? 0 : "not-applicable",
          axeCriticalSerious: 0,
          releaseCheck: "blocked-as-expected",
        },
        consoleErrors: 0,
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

const report = {
  status: "pass",
  baseUrl,
  generatedAt: new Date().toISOString(),
  engines: Object.keys(engines),
  requiredViewports: requiredViewports.map(viewportName),
  results,
};
await writeFile(
  path.join(outputDirectory, "browser-matrix.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify(report, null, 2));
