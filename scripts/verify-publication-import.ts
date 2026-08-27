import assert from "node:assert/strict";
import {
  MAX_PUBLICATION_INPUT_CHARS,
  attachUploadedHeroAsset,
  extractPublicationText,
  validatePublicationUrl,
  type UploadedHeroAssetMetadata,
} from "../lib/publication-import.ts";
import {
  createSourceOnlyPublicationBrief,
  validatePublicationBrief,
} from "../lib/publication-brief.ts";

const FIXTURE_AT = "2026-08-27T12:00:00.000Z";

const adversarialHtml = `<!doctype html>
<html>
  <head><title>Hidden document title</title><style>.leak { display:block }</style></head>
  <body>
    <main>
      <h1>Release &amp; evidence</h1>
      <script>window.evil = "leaked script text";</script>
      <style>.also-leaked { color: red }</style>
      <noscript>Noscript fallback must not enter publication copy.</noscript>
      <p>First&nbsp;visible claim.</p>
      <div hidden>Hidden attribute claim.</div>
      <div aria-hidden="true">ARIA-hidden claim.</div>
      <div style="display: none">CSS-hidden claim.</div>
      <p>Second <strong>visible</strong> claim.</p>
    </main>
  </body>
</html>`;

const extractedHtml = extractPublicationText(adversarialHtml, "text/html; charset=utf-8");
assert.equal(
  extractedHtml,
  "Release & evidence\n\nFirst visible claim.\n\nSecond visible claim.",
);
assert.doesNotMatch(
  extractedHtml,
  /script|style|noscript|hidden attribute|aria-hidden|css-hidden/i,
);
const longHtmlSentences = Array.from(
  { length: 75 },
  (_, index) => `Imported paragraph ${index + 1} remains exact and reviewable.`,
);
const extractedLongHtml = extractPublicationText(
  `<main>${longHtmlSentences.map((sentence) => `<p>${sentence}</p>`).join("")}</main>`,
  "text/html",
);
assert.equal(extractedLongHtml, longHtmlSentences.join("\n\n"));
assert.equal(
  extractPublicationText(
    "  First   paragraph. \r\n\r\n\r\n Second\tparagraph.  ",
    "text/markdown",
  ),
  "First paragraph.\n\nSecond paragraph.",
);
assert.equal(
  extractPublicationText("Line one.\nLine two.\n\nParagraph two.", "text/plain"),
  "Line one.\nLine two.\n\nParagraph two.",
);
assert.throws(
  () => extractPublicationText("  \n\t", "text/plain"),
  /EMPTY_PUBLICATION_INPUT/,
);
assert.throws(
  () => extractPublicationText("<script>only hidden content</script>", "text/html"),
  /EMPTY_PUBLICATION_INPUT/,
);
assert.throws(
  () => extractPublicationText("x".repeat(MAX_PUBLICATION_INPUT_CHARS + 1), "text/plain"),
  /PUBLICATION_INPUT_TOO_LARGE/,
);
assert.throws(
  () => extractPublicationText("copy", "application/pdf"),
  /UNSUPPORTED_PUBLICATION_MEDIA_TYPE/,
);
assert.throws(
  () => extractPublicationText("<script>unterminated", "text/html"),
  /MALFORMED_HTML/,
);

assert.deepEqual(validatePublicationUrl("https://example.com/release?draft=1"), {
  url: "https://example.com/release?draft=1",
  protocol: "https:",
  hostname: "example.com",
  isLocal: false,
});
assert.equal(validatePublicationUrl("http://localhost:4174/review").isLocal, true);
assert.equal(validatePublicationUrl("http://127.0.0.1:4174/review").isLocal, true);
assert.equal(validatePublicationUrl("http://[::1]:4174/review").isLocal, true);
for (const url of [
  "javascript:alert(1)",
  "data:text/html,copy",
  "file:///tmp/publication.html",
  "ftp://example.com/publication.txt",
]) {
  assert.throws(
    () => validatePublicationUrl(url),
    /UNSUPPORTED_PUBLICATION_URL_PROTOCOL/,
  );
}
assert.throws(
  () => validatePublicationUrl("example.com/no-protocol"),
  /INVALID_PUBLICATION_URL/,
);
assert.throws(
  () => validatePublicationUrl("https://user:secret@example.com/review"),
  /PUBLICATION_URL_CREDENTIALS_FORBIDDEN/,
);

function createPngHeader(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  bytes.set([0, 0, 0, 13, 73, 72, 68, 82], 8);
  bytes[16] = (width >>> 24) & 0xff;
  bytes[17] = (width >>> 16) & 0xff;
  bytes[18] = (width >>> 8) & 0xff;
  bytes[19] = width & 0xff;
  bytes[20] = (height >>> 24) & 0xff;
  bytes[21] = (height >>> 16) & 0xff;
  bytes[22] = (height >>> 8) & 0xff;
  bytes[23] = height & 0xff;
  bytes.set([8, 6, 0, 0, 0], 24);
  return bytes;
}

function base64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

async function digestHex(bytes: Uint8Array): Promise<string> {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}

const pngBytes = createPngHeader(1200, 800);
const pngDataUrl = `data:image/png;base64,${base64(pngBytes)}`;
const pngSha256 = await digestHex(pngBytes);

function sourceBrief(publicationType: "launch-page" | "project-page" | "blog-post" | "report") {
  return createSourceOnlyPublicationBrief({
    publicationType,
    organization: "ProofRail",
    title: "Imported publication",
    headline: "Exact imported headline",
    body: "Exact imported body.",
    recordedAt: FIXTURE_AT,
    provenanceId: `source-${publicationType}`,
    inputMethod: "form",
  });
}

function uploadMetadata(suffix: string): UploadedHeroAssetMetadata {
  return {
    assetId: `uploaded-hero-${suffix}`,
    provenanceId: `uploaded-file-${suffix}`,
    provenanceLabel: "Human-uploaded publication hero",
    fileName: `publication-hero-${suffix}.png`,
    mediaType: "image/png",
    dataUrl: pngDataUrl,
    width: 1200,
    height: 800,
    altText: "A human-supplied publication hero image.",
    sha256: pngSha256,
    recordedAt: FIXTURE_AT,
    rights: "customer-supplied",
  };
}

const launchSource = sourceBrief("launch-page");
assert.equal(launchSource.publicationType, "launch");
if (launchSource.publicationType !== "launch") {
  throw new Error("Fixture publication type mismatch.");
}
const launch = await attachUploadedHeroAsset(launchSource, uploadMetadata("launch"));
validatePublicationBrief(launch);
assert.equal(launch.mediaAssets[0]?.role, "hero");
assert.deepEqual(
  launch.gallery.status === "provided" ? launch.gallery.value : [],
  ["uploaded-hero-launch"],
);

const caseStudySource = sourceBrief("project-page");
assert.equal(caseStudySource.publicationType, "case-study");
if (caseStudySource.publicationType !== "case-study") {
  throw new Error("Fixture publication type mismatch.");
}
const caseStudy = await attachUploadedHeroAsset(
  caseStudySource,
  uploadMetadata("case-study"),
);
validatePublicationBrief(caseStudy);
assert.deepEqual(
  caseStudy.gallery.status === "provided" ? caseStudy.gallery.value : [],
  ["uploaded-hero-case-study"],
);

const articleSource = sourceBrief("blog-post");
assert.equal(articleSource.publicationType, "article");
if (articleSource.publicationType !== "article") {
  throw new Error("Fixture publication type mismatch.");
}
const article = await attachUploadedHeroAsset(
  articleSource,
  uploadMetadata("article"),
);
validatePublicationBrief(article);
assert.equal(
  article.heroMediaAssetId.status === "provided"
    ? article.heroMediaAssetId.value
    : "",
  "uploaded-hero-article",
);
assert.equal(article.mediaAssets[0]?.src, pngDataUrl);
assert.equal(article.provenance.at(-1)?.kind, "uploaded-file");
const articleUploadProvenance = article.provenance.at(-1);
assert.equal(
  articleUploadProvenance?.kind === "uploaded-file"
    ? articleUploadProvenance.sha256
    : "",
  pngSha256,
);

await assert.rejects(
  attachUploadedHeroAsset(sourceBrief("report"), uploadMetadata("report")),
  /REPORT_HERO_REJECTED/,
);
await assert.rejects(
  attachUploadedHeroAsset(sourceBrief("blog-post"), {
    ...uploadMetadata("bad-sha"),
    sha256: "0".repeat(64),
  }),
  /IMAGE_SHA256_MISMATCH/,
);
await assert.rejects(
  attachUploadedHeroAsset(sourceBrief("blog-post"), {
    ...uploadMetadata("bad-sha-shape"),
    sha256: "not-a-hash",
  }),
  /INVALID_SHA256/,
);
await assert.rejects(
  attachUploadedHeroAsset(sourceBrief("blog-post"), {
    ...uploadMetadata("bad-mime"),
    mediaType: "image/jpeg",
  }),
  /IMAGE_MIME_MISMATCH/,
);
await assert.rejects(
  attachUploadedHeroAsset(sourceBrief("blog-post"), {
    ...uploadMetadata("unsupported-mime"),
    mediaType: "image/svg+xml",
    dataUrl: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
  }),
  /UNSUPPORTED_IMAGE_MEDIA_TYPE/,
);
await assert.rejects(
  attachUploadedHeroAsset(sourceBrief("blog-post"), {
    ...uploadMetadata("bad-width"),
    width: 1199,
  }),
  /IMAGE_DIMENSION_MISMATCH/,
);
await assert.rejects(
  attachUploadedHeroAsset(sourceBrief("blog-post"), {
    ...uploadMetadata("invalid-width"),
    width: 0,
  }),
  /INVALID_IMAGE_DIMENSIONS/,
);
await assert.rejects(
  attachUploadedHeroAsset(sourceBrief("blog-post"), {
    ...uploadMetadata("spoofed-png"),
    dataUrl: `data:image/png;base64,${base64(new Uint8Array([1, 2, 3, 4]))}`,
    sha256: await digestHex(new Uint8Array([1, 2, 3, 4])),
  }),
  /INVALID_IMAGE_BYTES/,
);

console.log(
  JSON.stringify(
    {
      status: "pass",
      visibleHtml: extractedHtml,
      urlProtocols: ["https:", "http:"],
      attachedPublicationTypes: ["launch", "case-study", "article"],
      reportHeroBoundary: "pass",
      sha256Binding: "pass",
      encodedDimensionBinding: "pass",
    },
    null,
    2,
  ),
);
