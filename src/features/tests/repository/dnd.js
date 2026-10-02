// Native HTML5 drag-and-drop payloads shared by the tree and the case table.
export const DND_CASES = "application/x-corechestra-test-cases";
export const DND_FOLDER = "application/x-corechestra-test-folder";

export function setDragData(event, type, payload) {
  try {
    event.dataTransfer.setData(type, JSON.stringify(payload));
    event.dataTransfer.setData("text/plain", Array.isArray(payload) ? payload.join(",") : String(payload));
    event.dataTransfer.effectAllowed = "move";
  } catch {
    // ignore (some test environments have no dataTransfer)
  }
}

export function hasDragType(event, type) {
  const types = event?.dataTransfer?.types;
  if (!types) return false;
  return Array.from(types).includes(type);
}

export function readDragData(event, type) {
  try {
    const raw = event.dataTransfer.getData(type);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** "before" | "inside" | "after" depending on the pointer's vertical position in the row. */
export function dropZone(event, element) {
  const rect = element.getBoundingClientRect();
  if (!rect.height) return "inside";
  const offset = (event.clientY - rect.top) / rect.height;
  if (offset < 0.28) return "before";
  if (offset > 0.72) return "after";
  return "inside";
}
