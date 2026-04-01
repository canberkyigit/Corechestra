import { useEffect } from "react";

function canScrollHorizontally(element) {
  return element && element.scrollWidth > element.clientWidth;
}

export function useHorizontalWheelScroll(ref, deps = []) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const onWheel = (event) => {
      if (!canScrollHorizontally(element)) return;

      const primaryDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;

      if (!primaryDelta) return;

      const maxScrollLeft = element.scrollWidth - element.clientWidth;
      if (maxScrollLeft <= 0) return;

      const nextScrollLeft = Math.min(
        maxScrollLeft,
        Math.max(0, element.scrollLeft + primaryDelta)
      );

      if (nextScrollLeft === element.scrollLeft) return;

      event.preventDefault();
      element.scrollLeft = nextScrollLeft;
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...deps]);
}
