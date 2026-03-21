const STORAGE_KEY = "corechestra_v1";

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage quota exceeded - silently ignore
  }
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}
