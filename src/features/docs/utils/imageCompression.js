// Docs pages (and their inline images) are persisted inside the single
// Firestore document `appData/docs`, which is capped at 1 MiB. Firebase
// Storage is not wired in this app, so uploaded images are downscaled and
// re-encoded on the client and rejected when they would still be too large.

export const DOC_IMAGE_MAX_DIMENSION = 1600;
export const DOC_IMAGE_QUALITY = 0.8;
/** Hard cap for one embedded image after compression (bytes). */
export const DOC_IMAGE_MAX_BYTES = 200 * 1024;
/** Raw input files above this size are rejected before decoding (bytes). */
export const DOC_IMAGE_MAX_INPUT_BYTES = 15 * 1024 * 1024;
/** Budget for the whole serialized docs domain (spaces + pages), in bytes. */
export const DOCS_STORAGE_BUDGET_BYTES = 900 * 1024;

const COMPRESSION_STEPS = [
  { maxDimension: DOC_IMAGE_MAX_DIMENSION, quality: DOC_IMAGE_QUALITY },
  { maxDimension: 1280, quality: 0.7 },
  { maxDimension: 1024, quality: 0.6 },
  { maxDimension: 800, quality: 0.5 },
];

export class DocImageError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "DocImageError";
    this.code = code;
  }
}

export function computeScaledDimensions(width, height, maxDimension = DOC_IMAGE_MAX_DIMENSION) {
  const w = Math.max(1, Math.round(Number(width) || 1));
  const h = Math.max(1, Math.round(Number(height) || 1));
  const longest = Math.max(w, h);
  if (longest <= maxDimension) return { width: w, height: h };
  const ratio = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(w * ratio)),
    height: Math.max(1, Math.round(h * ratio)),
  };
}

/** Decoded byte size of a base64 data URL. */
export function dataUrlByteSize(dataUrl) {
  if (typeof dataUrl !== "string") return 0;
  const commaIndex = dataUrl.indexOf(",");
  const base64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

/** Approximate serialized size (bytes) of a value as it would be persisted. */
export function estimateSerializedBytes(value) {
  try {
    const json = JSON.stringify(value ?? null);
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(json).length;
    return json.length;
  } catch {
    return 0;
  }
}

export function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new DocImageError("Could not read the image file.", "read"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new DocImageError("This file could not be decoded as an image.", "decode"));
    image.src = src;
  });
}

function encodeCanvas(canvas, quality) {
  const webp = canvas.toDataURL("image/webp", quality);
  if (typeof webp === "string" && webp.startsWith("data:image/webp")) return webp;
  return null;
}

function renderToDataUrl(image, { maxDimension, quality }) {
  const { width, height } = computeScaledDimensions(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    maxDimension
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new DocImageError("Image compression is not supported in this browser.", "canvas");
  ctx.drawImage(image, 0, 0, width, height);
  const webp = encodeCanvas(canvas, quality);
  if (webp) return webp;
  // Browsers without WebP encoding: flatten onto white so transparency does
  // not turn black, then encode as JPEG.
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Downscales (longest side ≤ 1600px) and re-encodes an image file as
 * WebP/JPEG (~0.8 quality), retrying with smaller settings until it fits
 * under `maxBytes`. Resolves with a data URL or rejects with DocImageError.
 */
/**
 * Error message when saving `updatedPage` would push the docs domain past the
 * Firestore document budget; `null` when the save fits.
 */
export function getDocsBudgetError(spaces, docPages, updatedPage) {
  const projectedPages = (docPages || []).map((page) => (page.id === updatedPage.id ? { ...page, ...updatedPage } : page));
  const projectedBytes = estimateSerializedBytes({ spaces, docPages: projectedPages });
  if (projectedBytes <= DOCS_STORAGE_BUDGET_BYTES) return null;
  return `Documentation storage limit reached (${formatBytes(projectedBytes)} of ${formatBytes(DOCS_STORAGE_BUDGET_BYTES)}). Remove embedded images or shorten the page before saving.`;
}

export async function compressImageFile(file, { maxBytes = DOC_IMAGE_MAX_BYTES } = {}) {
  if (!file || !String(file.type || "").startsWith("image/")) {
    throw new DocImageError("Only image files can be inserted.", "type");
  }
  if (file.size > DOC_IMAGE_MAX_INPUT_BYTES) {
    throw new DocImageError(`Image is too large (${formatBytes(file.size)}). Use a file under ${formatBytes(DOC_IMAGE_MAX_INPUT_BYTES)}.`, "input-size");
  }

  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);

  let smallest = null;
  for (const step of COMPRESSION_STEPS) {
    const dataUrl = renderToDataUrl(image, step);
    const size = dataUrlByteSize(dataUrl);
    if (!smallest || size < smallest.size) smallest = { dataUrl, size };
    if (size <= maxBytes) return dataUrl;
  }

  throw new DocImageError(
    `Image is still ${formatBytes(smallest?.size || 0)} after compression (limit ${formatBytes(maxBytes)}). Use a smaller image or link it by URL.`,
    "too-large"
  );
}
