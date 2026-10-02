// Moved to shared so every overlay (board, docs, HR, palette…) shares one
// Escape stack. Kept as a re-export for existing imports.
export { useEscapeKey, hasOpenEscapeLayer } from "../../../shared/hooks/useEscapeKey";
