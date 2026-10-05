import React from "react";
import { FaMagic } from "react-icons/fa";

/** Maestro's identity: a conductor's baton on the violet → blue gradient. */
export const MAESTRO_GRADIENT = "bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-500";
export const MAESTRO_TEXT_GRADIENT = "bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent dark:from-violet-400 dark:via-indigo-400 dark:to-blue-400";

export default function MaestroMark({ size = 32, halo = false, className = "" }) {
  const radius = Math.round(size * 0.3);
  return (
    <span className={`relative inline-flex flex-shrink-0 ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      {halo && (
        <>
          <span className={`absolute -inset-3 rounded-[36%] opacity-30 blur-xl ${MAESTRO_GRADIENT}`} />
          <span className="absolute -inset-1.5 animate-pulse rounded-[34%] ring-1 ring-indigo-400/40" />
        </>
      )}
      <span
        className={`relative inline-flex h-full w-full items-center justify-center text-white shadow-lg shadow-indigo-500/30 ${MAESTRO_GRADIENT}`}
        style={{ borderRadius: radius }}
      >
        <FaMagic style={{ width: size * 0.46, height: size * 0.46 }} />
      </span>
    </span>
  );
}

export function PreviewBadge({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 ring-1 ring-inset ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30 ${className}`}>
      Preview
    </span>
  );
}
