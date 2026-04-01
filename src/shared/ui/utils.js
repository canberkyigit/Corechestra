import { twMerge } from "tailwind-merge";

function flatten(values) {
  return values.flatMap((value) => {
    if (!value) return [];
    if (Array.isArray(value)) return flatten(value);
    if (typeof value === "object") {
      return Object.entries(value)
        .filter(([, enabled]) => Boolean(enabled))
        .map(([className]) => className);
    }
    return [value];
  });
}

export function cn(...values) {
  return twMerge(flatten(values).join(" "));
}
