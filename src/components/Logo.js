import React from "react";

/**
 * Corechestra logo icon — 5 figures in an arch, like an orchestra ensemble.
 * Center figure (conductor) is tallest; outer figures step down symmetrically.
 * Metaphor: diverse roles (dev, PM, QA, design, ops) performing in harmony.
 */
export default function Logo({ size = 24, color = "#4F46E5", className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Corechestra"
    >
      {/* Far left — shortest */}
      <rect x="1"  y="26" width="6" height="12" rx="3" fill={color} />
      {/* Mid left */}
      <rect x="10" y="18" width="6" height="20" rx="3" fill={color} />
      {/* Center — conductor, tallest */}
      <rect x="19" y="10" width="6" height="28" rx="3" fill={color} />
      {/* Mid right */}
      <rect x="28" y="18" width="6" height="20" rx="3" fill={color} />
      {/* Far right — shortest */}
      <rect x="37" y="26" width="6" height="12" rx="3" fill={color} />
    </svg>
  );
}
