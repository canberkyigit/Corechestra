/** Triggers a browser download for in-memory content. */
export function downloadBlob(filename, blob) {
  if (typeof window === "undefined" || !window.URL?.createObjectURL) return false;
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 0);
  return true;
}

export function downloadTextFile(filename, content, mimeType = "text/plain;charset=utf-8") {
  return downloadBlob(filename, new Blob([content], { type: mimeType }));
}

function escapeCsvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** `rows` is an array of arrays; the first row is the header. */
export function toCsv(rows) {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function slugify(value) {
  return String(value || "file").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "file";
}

/** Only http(s) links are opened/linked, to avoid javascript: URLs stored in shared data. */
export function isSafeHttpUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
