import { useCallback, useEffect, useRef, useState } from "react";

const MIN_WIDTH = 360;
const MAX_WIDTH = 900;
const DEFAULT_WIDTH = 580;
const MOBILE_BREAKPOINT = 768;

/** Drag-to-resize width for the task side panel (full width on mobile). */
export function usePanelResize() {
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT);
  const isResizingRef = useRef(false);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!isResizingRef.current) return;
      setPanelWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, window.innerWidth - event.clientX)));
    };
    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    const handleResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const startResize = useCallback((event) => {
    event.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  return { width: isMobile ? "100vw" : panelWidth, isMobile, startResize };
}
