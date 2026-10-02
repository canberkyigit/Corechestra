// CSV export and browser download helpers.
import { STATUS_META } from "../constants/releaseMeta";
import { userDisplayName } from "./releaseUtils";

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const CSV_COLUMNS = [
  "Version", "Name", "Status", "Owner", "Start date", "Code freeze", "Target date", "Released at",
  "Tasks done", "Tasks total", "Story points done", "Story points total", "Readiness %", "Risk", "Production",
];

export function releasesToCsv(releases, metricsById, users = []) {
  const rows = [CSV_COLUMNS];
  (releases || []).forEach((release) => {
    const metrics = metricsById?.get(release.id);
    const prod = (release.environments || []).find((env) => env.key === "production");
    rows.push([
      release.version,
      release.name,
      STATUS_META[release.status]?.label || release.status,
      release.owner ? userDisplayName(users, release.owner) : "",
      release.startDate,
      release.freezeDate,
      release.releaseDate,
      release.releasedAt ? String(release.releasedAt).slice(0, 10) : "",
      metrics?.work.done ?? 0,
      metrics?.work.total ?? 0,
      metrics?.work.pointsDone ?? 0,
      metrics?.work.points ?? 0,
      metrics?.readiness.score ?? 0,
      metrics?.riskLevel && metrics.riskLevel !== "none" ? metrics.riskLevel : "",
      prod?.status || "",
    ]);
  });
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

/** Triggers a client-side file download. No-op outside a browser. */
export function downloadTextFile(fileName, content, mime = "text/plain") {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  try {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = window.URL?.createObjectURL ? window.URL.createObjectURL(blob) : null;
    if (!url) return false;
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL?.(url), 0);
    return true;
  } catch {
    return false;
  }
}

export async function copyToClipboard(text) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand?.("copy");
    area.remove();
    return Boolean(ok);
  } catch {
    return false;
  }
}
