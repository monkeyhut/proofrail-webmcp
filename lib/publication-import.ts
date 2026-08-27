import {
  missing,
  provided,
  validatePublicationBrief,
  type ArticlePublicationBrief,
  type CaseStudyPublicationBrief,
  type ContentRights,
  type ImageMediaAsset,
  type LaunchPublicationBrief,
  type PublicationBrief,
  type ReportPublicationBrief,
  type UploadedFileProvenance,
} from "./publication-brief.ts";

export const MAX_PUBLICATION_INPUT_CHARS = 1_000_000;
export const MAX_HERO_ASSET_BYTES = 1_500_000;

const HTML_MEDIA_TYPES = new Set(["text/html", "application/xhtml+xml"]);
const TEXT_MEDIA_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/x-markdown",
]);
const SUPPORTED_IMAGE_MEDIA_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const BLOCK_ELEMENTS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "dd",
  "details",
  "dialog",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
]);

const RAW_HIDDEN_ELEMENTS = new Set(["script", "style", "noscript"]);
const HIDDEN_CONTAINERS = new Set([
  "head",
  "template",
  "svg",
  "canvas",
  "title",
]);

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  apos: "'",
  gt: ">",
  hellip: "…",
  laquo: "«",
  ldquo: "“",
  lsquo: "‘",
  lt: "<",
  mdash: "—",
  nbsp: " ",
  ndash: "–",
  quot: '"',
  raquo: "»",
  rdquo: "”",
  rsquo: "’",
};

function normalizedMediaType(mediaType: string): string {
  return mediaType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

function assertBoundedInput(input: string): void {
  if (typeof input !== "string") {
    throw new Error("INVALID_PUBLICATION_INPUT: source must be a string.");
  }
  if (input.length > MAX_PUBLICATION_INPUT_CHARS) {
    throw new Error(
      `PUBLICATION_INPUT_TOO_LARGE: source exceeds ${MAX_PUBLICATION_INPUT_CHARS} characters.`,
    );
  }
}

function normalizeParagraphWhitespace(input: string): string {
  const normalized = input
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .split("\n")
    .map((line) => line.replace(/[\t\f\v ]+/g, " ").trim())
    .join("\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) {
    throw new Error(
      "EMPTY_PUBLICATION_INPUT: the supplied source contains no reviewable text.",
    );
  }
  return normalized;
}

function decodeHtmlEntities(input: string): string {
  return input.replace(
    /&(#(?:x[0-9a-f]+|[0-9]+)|[a-z][a-z0-9]+);/gi,
    (entity, identifier: string) => {
      if (identifier[0] !== "#") {
        return NAMED_ENTITIES[identifier.toLowerCase()] ?? entity;
      }

      const hexadecimal = identifier[1]?.toLowerCase() === "x";
      const digits = identifier.slice(hexadecimal ? 2 : 1);
      const codePoint = Number.parseInt(digits, hexadecimal ? 16 : 10);
      if (
        !Number.isInteger(codePoint) ||
        codePoint <= 0 ||
        codePoint > 0x10ffff ||
        (codePoint >= 0xd800 && codePoint <= 0xdfff)
      ) {
        return "�";
      }
      return String.fromCodePoint(codePoint);
    },
  );
}

function findTagEnd(html: string, start: number): number {
  let quote: '"' | "'" | null = null;
  for (let index = start + 1; index < html.length; index += 1) {
    const character = html[index];
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === ">") return index;
  }
  return -1;
}

function isExplicitlyHidden(rawTag: string): boolean {
  return (
    /\shidden(?:\s|=|\/|$)/i.test(rawTag) ||
    /\saria-hidden\s*=\s*(?:["']\s*true\s*["']|true(?:\s|\/|$))/i.test(
      rawTag,
    ) ||
    /\sstyle\s*=\s*["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden|content-visibility\s*:\s*hidden)[^"']*["']/i.test(
      rawTag,
    )
  );
}

function extractVisibleHtmlText(html: string): string {
  const output: string[] = [];
  const stack: Array<{ name: string; hidden: boolean }> = [];
  let hiddenDepth = 0;
  let cursor = 0;

  const addBoundary = (paragraph = true): void => {
    if (hiddenDepth === 0) output.push(paragraph ? "\n\n" : "\n");
  };

  while (cursor < html.length) {
    if (html.startsWith("<!--", cursor)) {
      const end = html.indexOf("-->", cursor + 4);
      if (end === -1) {
        throw new Error("MALFORMED_HTML: an HTML comment is not closed.");
      }
      cursor = end + 3;
      continue;
    }

    if (html[cursor] !== "<") {
      const nextTag = html.indexOf("<", cursor);
      const end = nextTag === -1 ? html.length : nextTag;
      if (hiddenDepth === 0) {
        output.push(decodeHtmlEntities(html.slice(cursor, end)));
      }
      cursor = end;
      continue;
    }

    const tagEnd = findTagEnd(html, cursor);
    if (tagEnd === -1) {
      throw new Error("MALFORMED_HTML: an HTML tag is not closed.");
    }
    const rawTag = html.slice(cursor + 1, tagEnd);
    if (/^\s*[!?]/.test(rawTag)) {
      cursor = tagEnd + 1;
      continue;
    }

    const closingMatch = rawTag.match(/^\s*\/\s*([a-z][a-z0-9:-]*)/i);
    if (closingMatch) {
      const name = closingMatch[1].toLowerCase();
      const matchingIndex = stack.map((entry) => entry.name).lastIndexOf(name);
      if (matchingIndex !== -1) {
        const removed = stack.splice(matchingIndex);
        hiddenDepth -= removed.filter((entry) => entry.hidden).length;
      }
      if (BLOCK_ELEMENTS.has(name)) addBoundary();
      cursor = tagEnd + 1;
      continue;
    }

    const openingMatch = rawTag.match(/^\s*([a-z][a-z0-9:-]*)/i);
    if (!openingMatch) {
      cursor = tagEnd + 1;
      continue;
    }
    const name = openingMatch[1].toLowerCase();
    const selfClosing = /\/\s*$/.test(rawTag) || ["br", "hr", "img", "input", "meta", "link", "source", "wbr"].includes(name);

    if (RAW_HIDDEN_ELEMENTS.has(name)) {
      const closeExpression = new RegExp(`<\\/\\s*${name}\\s*>`, "gi");
      closeExpression.lastIndex = tagEnd + 1;
      const close = closeExpression.exec(html);
      if (!close) {
        throw new Error(`MALFORMED_HTML: <${name}> is not closed.`);
      }
      cursor = close.index + close[0].length;
      continue;
    }

    if (name === "br") addBoundary(false);
    else if (BLOCK_ELEMENTS.has(name)) addBoundary();

    if (!selfClosing) {
      const hidden = HIDDEN_CONTAINERS.has(name) || isExplicitlyHidden(rawTag);
      stack.push({ name, hidden });
      if (hidden) hiddenDepth += 1;
    }
    cursor = tagEnd + 1;
  }

  return normalizeParagraphWhitespace(output.join(""));
}

/**
 * Extract reviewable publication copy without executing or retaining markup.
 * Text and Markdown keep their supplied paragraph boundaries; HTML contributes
 * only text from visible containers. This helper deliberately does not fetch.
 */
export function extractPublicationText(input: string, mediaType: string): string {
  assertBoundedInput(input);
  const normalizedType = normalizedMediaType(mediaType);
  if (HTML_MEDIA_TYPES.has(normalizedType)) {
    return extractVisibleHtmlText(input);
  }
  if (TEXT_MEDIA_TYPES.has(normalizedType)) {
    return normalizeParagraphWhitespace(input);
  }
  throw new Error(
    `UNSUPPORTED_PUBLICATION_MEDIA_TYPE: ${normalizedType || "missing media type"}.`,
  );
}

export type ValidatedPublicationUrl = Readonly<{
  url: string;
  protocol: "http:" | "https:";
  hostname: string;
  isLocal: boolean;
}>;

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "localhost" || normalized.endsWith(".localhost")) {
    return true;
  }
  if (normalized === "::1") return true;
  const ipv4 = normalized.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  return Boolean(
    ipv4 &&
      ipv4.slice(1).every((part) => Number(part) <= 255) &&
      Number(ipv4[1]) === 127,
  );
}

/** Validate an absolute browser URL. No network request is made here. */
export function validatePublicationUrl(input: string): ValidatedPublicationUrl {
  const candidate = input.trim();
  if (!candidate || /[\u0000-\u001f\u007f]/.test(candidate)) {
    throw new Error("INVALID_PUBLICATION_URL: supply one absolute HTTP(S) URL.");
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("INVALID_PUBLICATION_URL: supply one absolute HTTP(S) URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `UNSUPPORTED_PUBLICATION_URL_PROTOCOL: ${parsed.protocol || "missing"}.`,
    );
  }
  if (!parsed.hostname) {
    throw new Error("INVALID_PUBLICATION_URL: URL hostname is required.");
  }
  if (parsed.username || parsed.password) {
    throw new Error(
      "PUBLICATION_URL_CREDENTIALS_FORBIDDEN: do not place credentials in an import URL.",
    );
  }

  return Object.freeze({
    url: parsed.href,
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    isLocal: isLocalHostname(parsed.hostname),
  });
}

export type UploadedHeroAssetMetadata = Readonly<{
  assetId: string;
  provenanceId: string;
  provenanceLabel: string;
  fileName: string;
  mediaType: string;
  dataUrl: string;
  width: number;
  height: number;
  altText: string;
  caption?: string;
  sha256: string;
  recordedAt: string;
  rights: ContentRights;
}>;

type HeroAttachableBrief =
  | LaunchPublicationBrief
  | CaseStudyPublicationBrief
  | ArticlePublicationBrief;

export type HeroAssetAttachResult<TBrief extends PublicationBrief> =
  TBrief extends ReportPublicationBrief ? never : TBrief;

function assertIdentifier(value: string, label: string): void {
  if (!/^[a-z0-9][a-z0-9._:-]{0,127}$/i.test(value)) {
    throw new Error(`INVALID_IDENTIFIER: ${label}.`);
  }
}

function assertHumanText(value: string, label: string, maxLength: number): void {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > maxLength ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  ) {
    throw new Error(`INVALID_UPLOAD_METADATA: ${label}.`);
  }
}

function dataUrlBytes(dataUrl: string, expectedMediaType: string): Uint8Array {
  const match = dataUrl.match(/^data:([^;,]+);base64,([a-z0-9+/]*={0,2})$/i);
  if (!match) {
    throw new Error(
      "INVALID_IMAGE_DATA_URL: use a canonical base64 image data URL.",
    );
  }
  const embeddedMediaType = normalizedMediaType(match[1]);
  if (embeddedMediaType !== expectedMediaType) {
    throw new Error(
      `IMAGE_MIME_MISMATCH: metadata is ${expectedMediaType}, data URL is ${embeddedMediaType}.`,
    );
  }
  if (match[2].length % 4 !== 0) {
    throw new Error("INVALID_IMAGE_DATA_URL: base64 padding is invalid.");
  }

  let decoded: string;
  try {
    decoded = atob(match[2]);
  } catch {
    throw new Error("INVALID_IMAGE_DATA_URL: image payload is not valid base64.");
  }
  if (!decoded.length) {
    throw new Error("EMPTY_IMAGE_ASSET: uploaded hero contains no bytes.");
  }
  if (decoded.length > MAX_HERO_ASSET_BYTES) {
    throw new Error(
      `IMAGE_ASSET_TOO_LARGE: hero exceeds ${MAX_HERO_ASSET_BYTES} bytes.`,
    );
  }
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function readUint32BigEndian(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] * 0x1000000 +
    bytes[offset + 1] * 0x10000 +
    bytes[offset + 2] * 0x100 +
    bytes[offset + 3]
  );
}

function parsePngDimensions(bytes: Uint8Array): { width: number; height: number } {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  const ihdr = [73, 72, 68, 82];
  if (
    bytes.length < 24 ||
    !signature.every((value, index) => bytes[index] === value) ||
    !ihdr.every((value, index) => bytes[index + 12] === value)
  ) {
    throw new Error("INVALID_IMAGE_BYTES: payload is not a PNG image.");
  }
  return {
    width: readUint32BigEndian(bytes, 16),
    height: readUint32BigEndian(bytes, 20),
  };
}

function parseJpegDimensions(bytes: Uint8Array): { width: number; height: number } {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error("INVALID_IMAGE_BYTES: payload is not a JPEG image.");
  }
  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
    0xcf,
  ]);
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }
    if (offset + 1 >= bytes.length) break;
    const segmentLength = bytes[offset] * 256 + bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.length) break;
    if (startOfFrameMarkers.has(marker) && segmentLength >= 7) {
      return {
        height: bytes[offset + 3] * 256 + bytes[offset + 4],
        width: bytes[offset + 5] * 256 + bytes[offset + 6],
      };
    }
    offset += segmentLength;
  }
  throw new Error("INVALID_IMAGE_BYTES: JPEG dimensions are unavailable.");
}

function parseWebpDimensions(bytes: Uint8Array): { width: number; height: number } {
  const ascii = (offset: number, length: number) =>
    String.fromCharCode(...bytes.slice(offset, offset + length));
  if (
    bytes.length < 30 ||
    ascii(0, 4) !== "RIFF" ||
    ascii(8, 4) !== "WEBP"
  ) {
    throw new Error("INVALID_IMAGE_BYTES: payload is not a WebP image.");
  }
  const chunk = ascii(12, 4);
  if (chunk === "VP8X") {
    return {
      width: 1 + bytes[24] + bytes[25] * 256 + bytes[26] * 65536,
      height: 1 + bytes[27] + bytes[28] * 256 + bytes[29] * 65536,
    };
  }
  if (chunk === "VP8 " && bytes.length >= 30) {
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) {
      throw new Error("INVALID_IMAGE_BYTES: WebP frame header is invalid.");
    }
    return {
      width: (bytes[26] | (bytes[27] << 8)) & 0x3fff,
      height: (bytes[28] | (bytes[29] << 8)) & 0x3fff,
    };
  }
  if (chunk === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
    const bits =
      bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1,
    };
  }
  throw new Error("INVALID_IMAGE_BYTES: WebP dimensions are unavailable.");
}

function imageDimensions(
  bytes: Uint8Array,
  mediaType: string,
): { width: number; height: number } {
  switch (mediaType) {
    case "image/png":
      return parsePngDimensions(bytes);
    case "image/jpeg":
      return parseJpegDimensions(bytes);
    case "image/webp":
      return parseWebpDimensions(bytes);
    default:
      throw new Error(`UNSUPPORTED_IMAGE_MEDIA_TYPE: ${mediaType}.`);
  }
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      "CRYPTO_UNAVAILABLE: SHA-256 verification requires Web Crypto.",
    );
  }
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}

function appendGallery(
  brief: LaunchPublicationBrief | CaseStudyPublicationBrief,
  assetId: string,
  provenanceId: string,
) {
  if (brief.gallery.status === "missing") {
    return provided([assetId], [provenanceId]);
  }
  if (brief.gallery.value.includes(assetId)) {
    throw new Error(`DUPLICATE_MEDIA_REFERENCE: ${assetId}.`);
  }
  return provided(
    [...brief.gallery.value, assetId],
    [...new Set([...brief.gallery.provenanceIds, provenanceId])],
  );
}

/**
 * Bind an uploaded image to its actual bytes and provenance before attaching it
 * to a publication. Reports reject this helper because report visuals require
 * a chart/data contract rather than a decorative hero substitution.
 */
export async function attachUploadedHeroAsset<TBrief extends PublicationBrief>(
  brief: TBrief,
  metadata: UploadedHeroAssetMetadata,
): Promise<HeroAssetAttachResult<TBrief>> {
  validatePublicationBrief(brief);
  if (brief.publicationType === "report") {
    throw new Error(
      "REPORT_HERO_REJECTED: report media must be attached through an explicit chart, finding, or document contract.",
    );
  }

  assertIdentifier(metadata.assetId, "assetId");
  assertIdentifier(metadata.provenanceId, "provenanceId");
  assertHumanText(metadata.provenanceLabel, "provenanceLabel", 240);
  assertHumanText(metadata.fileName, "fileName", 255);
  if (/[\\/]/.test(metadata.fileName)) {
    throw new Error("INVALID_UPLOAD_METADATA: fileName must not contain a path.");
  }
  assertHumanText(metadata.altText, "altText", 1_000);
  if (metadata.caption !== undefined) {
    assertHumanText(metadata.caption, "caption", 2_000);
  }
  if (!Number.isInteger(metadata.width) || !Number.isInteger(metadata.height)) {
    throw new Error("INVALID_IMAGE_DIMENSIONS: width and height must be integers.");
  }
  if (
    metadata.width <= 0 ||
    metadata.height <= 0 ||
    metadata.width > 32_768 ||
    metadata.height > 32_768
  ) {
    throw new Error("INVALID_IMAGE_DIMENSIONS: width or height is out of range.");
  }
  if (Number.isNaN(Date.parse(metadata.recordedAt))) {
    throw new Error("INVALID_UPLOAD_METADATA: recordedAt must be an ISO timestamp.");
  }

  const mediaType = normalizedMediaType(metadata.mediaType);
  if (!SUPPORTED_IMAGE_MEDIA_TYPES.has(mediaType)) {
    throw new Error(`UNSUPPORTED_IMAGE_MEDIA_TYPE: ${mediaType || "missing"}.`);
  }
  if (!/^[a-f0-9]{64}$/i.test(metadata.sha256)) {
    throw new Error("INVALID_SHA256: uploaded hero sha256.");
  }
  if (brief.mediaAssets.some((asset) => asset.id === metadata.assetId)) {
    throw new Error(`DUPLICATE_ID: mediaAssets contains ${metadata.assetId}.`);
  }
  if (brief.provenance.some((record) => record.id === metadata.provenanceId)) {
    throw new Error(`DUPLICATE_ID: provenance contains ${metadata.provenanceId}.`);
  }
  if (brief.mediaAssets.some((asset) => asset.role === "hero")) {
    throw new Error(
      "HERO_ALREADY_PRESENT: replace an existing hero only through an explicit human-reviewed revision.",
    );
  }
  if (
    brief.publicationType === "article" &&
    brief.heroMediaAssetId.status === "provided"
  ) {
    throw new Error(
      "HERO_ALREADY_PRESENT: replace an existing article hero only through an explicit human-reviewed revision.",
    );
  }

  const bytes = dataUrlBytes(metadata.dataUrl, mediaType);
  const encodedDimensions = imageDimensions(bytes, mediaType);
  if (
    encodedDimensions.width !== metadata.width ||
    encodedDimensions.height !== metadata.height
  ) {
    throw new Error(
      `IMAGE_DIMENSION_MISMATCH: metadata is ${metadata.width}x${metadata.height}, bytes are ${encodedDimensions.width}x${encodedDimensions.height}.`,
    );
  }
  const actualSha256 = await sha256Hex(bytes);
  if (actualSha256 !== metadata.sha256.toLowerCase()) {
    throw new Error(
      `IMAGE_SHA256_MISMATCH: expected ${metadata.sha256.toLowerCase()}, actual ${actualSha256}.`,
    );
  }

  const provenance: UploadedFileProvenance = {
    id: metadata.provenanceId,
    kind: "uploaded-file",
    label: metadata.provenanceLabel.trim(),
    fileName: metadata.fileName.trim(),
    mediaType,
    sha256: actualSha256,
    recordedAt: metadata.recordedAt,
    rights: metadata.rights,
  };
  const asset: ImageMediaAsset = {
    id: metadata.assetId,
    kind: "image",
    role: "hero",
    src: metadata.dataUrl,
    mimeType: mediaType,
    width: metadata.width,
    height: metadata.height,
    provenanceIds: [metadata.provenanceId],
    alt: provided(metadata.altText.trim(), [metadata.provenanceId]),
    caption: metadata.caption
      ? provided(metadata.caption.trim(), [metadata.provenanceId])
      : missing(
          "not-provided",
          "Supply a factual caption only when the uploaded image requires one.",
        ),
    loading: "eager",
  };
  let attached: HeroAttachableBrief;
  switch (brief.publicationType) {
    case "launch":
      attached = {
        ...brief,
        provenance: [...brief.provenance, provenance],
        mediaAssets: [...brief.mediaAssets, asset],
        gallery: appendGallery(brief, metadata.assetId, metadata.provenanceId),
      };
      break;
    case "case-study":
      attached = {
        ...brief,
        provenance: [...brief.provenance, provenance],
        mediaAssets: [...brief.mediaAssets, asset],
        gallery: appendGallery(brief, metadata.assetId, metadata.provenanceId),
      };
      break;
    case "article":
      attached = {
        ...brief,
        provenance: [...brief.provenance, provenance],
        mediaAssets: [...brief.mediaAssets, asset],
        heroMediaAssetId: provided(metadata.assetId, [metadata.provenanceId]),
      };
      break;
  }

  validatePublicationBrief(attached);
  return attached as HeroAssetAttachResult<TBrief>;
}
