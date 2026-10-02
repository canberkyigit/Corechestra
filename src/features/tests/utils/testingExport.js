// Browser download / clipboard helpers (side effects isolated here).

export function downloadTextFile(fileName, content, mime = "text/plain") {
  try {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

export async function copyText(textValue) {
  try {
    await navigator.clipboard.writeText(textValue);
    return true;
  } catch {
    return false;
  }
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Could not read file"));
    reader.readAsText(file);
  });
}

export function fileStamp(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
