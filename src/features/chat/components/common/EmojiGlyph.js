import React from "react";
import { customShortcodeName } from "../../utils/emoji";

/** Renders a unicode emoji or a workspace custom emoji (`:name:`). */
export default function EmojiGlyph({ value, customEmoji = {}, size = "1.15em", className = "" }) {
  const name = customShortcodeName(value);
  const custom = name ? customEmoji?.[name] : null;
  if (custom?.dataUrl) {
    return (
      <img
        src={custom.dataUrl}
        alt={value}
        title={value}
        className={`inline-block align-[-0.2em] object-contain ${className}`}
        style={{ width: size, height: size }}
        draggable={false}
      />
    );
  }
  return <span className={className}>{value}</span>;
}
