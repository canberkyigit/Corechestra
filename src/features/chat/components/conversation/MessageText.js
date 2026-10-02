import React, { memo, useMemo } from "react";
import { FaBook, FaTag } from "react-icons/fa";
import { getUserDisplayName } from "../../../../shared/services/chat/chatModel";
import { parseMessage } from "../../utils/chatMarkdown";
import { isJumboEmoji } from "../../utils/emoji";
import EmojiGlyph from "../common/EmojiGlyph";

function safeHref(href) {
  return /^https?:\/\//i.test(href) ? href : null;
}

const chipBase = "inline-flex items-center gap-1 px-1 rounded font-medium hover:underline align-baseline";

function InlineNodes({ nodes, ctx }) {
  return nodes.map((node, index) => {
    const key = `${node.type}-${index}`;
    switch (node.type) {
      case "text":
        return <React.Fragment key={key}>{node.value}</React.Fragment>;
      case "shortcode":
        return ctx.customEmoji?.[node.name]
          ? <EmojiGlyph key={key} value={node.raw} customEmoji={ctx.customEmoji} />
          : <React.Fragment key={key}>{node.raw}</React.Fragment>;
      case "code":
        return (
          <code key={key} className="px-1 py-0.5 rounded bg-slate-100 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] text-[0.85em] font-mono text-rose-600 dark:text-rose-300">
            {node.value}
          </code>
        );
      case "bold":
        return <strong key={key} className="font-semibold"><InlineNodes nodes={node.children} ctx={ctx} /></strong>;
      case "italic":
        return <em key={key}><InlineNodes nodes={node.children} ctx={ctx} /></em>;
      case "strike":
        return <del key={key} className="opacity-80"><InlineNodes nodes={node.children} ctx={ctx} /></del>;
      case "link": {
        const href = safeHref(node.href);
        if (!href) return <InlineNodes key={key} nodes={node.children} ctx={ctx} />;
        return (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline break-all">
            <InlineNodes nodes={node.children} ctx={ctx} />
          </a>
        );
      }
      case "mention": {
        const user = ctx.usersById?.[node.id];
        const isMe = node.id === ctx.uid;
        return (
          <button
            key={key}
            type="button"
            onClick={(event) => { event.stopPropagation(); ctx.onOpenProfile?.(node.id); }}
            className={`px-0.5 rounded font-medium ${isMe ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200" : "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"} hover:underline`}
          >
            @{getUserDisplayName(user, "unknown")}
          </button>
        );
      }
      case "special":
        return (
          <span key={key} className="px-0.5 rounded font-medium bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
            @{node.name}
          </span>
        );
      case "channel": {
        const channel = ctx.channelsById?.[node.id];
        return (
          <button
            key={key}
            type="button"
            onClick={(event) => { event.stopPropagation(); if (channel) ctx.onOpenChannel?.(channel.id); }}
            className="px-0.5 rounded font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 hover:underline"
          >
            #{channel?.name || "private-channel"}
          </button>
        );
      }
      case "task":
        return (
          <button
            key={key}
            type="button"
            onClick={(event) => { event.stopPropagation(); ctx.onOpenTaskKey?.(node.key); }}
            className={`${chipBase} font-mono text-[0.85em] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300`}
            title={ctx.resolveTask?.(node.key)?.title || "Open task"}
          >
            {node.key}
          </button>
        );
      case "doc": {
        const page = ctx.resolveDoc?.(node.id);
        return (
          <button
            key={key}
            type="button"
            onClick={(event) => { event.stopPropagation(); ctx.onOpenDoc?.(node.id); }}
            className={`${chipBase} bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300`}
          >
            {page?.emoji ? <span>{page.emoji}</span> : <FaBook className="w-2.5 h-2.5" />}
            {page?.title || "Doc page"}
          </button>
        );
      }
      case "release": {
        const release = ctx.resolveRelease?.(node.id);
        return (
          <button
            key={key}
            type="button"
            onClick={(event) => { event.stopPropagation(); ctx.onOpenRelease?.(node.id); }}
            className={`${chipBase} bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300`}
          >
            <FaTag className="w-2.5 h-2.5" />
            {release ? [release.version, release.name].filter(Boolean).join(" ") : "Release"}
          </button>
        );
      }
      default:
        return null;
    }
  });
}

const CUSTOM_ONLY = /^(\s*:[a-z0-9_+-]{2,32}:\s*){1,3}$/;

function MessageText({ text, ctx, className = "" }) {
  const blocks = useMemo(() => parseMessage(text), [text]);
  const value = String(text || "").trim();

  if (CUSTOM_ONLY.test(value)) {
    const names = value.match(/:[a-z0-9_+-]{2,32}:/g) || [];
    if (names.every((raw) => ctx.customEmoji?.[raw.slice(1, -1)])) {
      return (
        <div className={`flex gap-1 py-0.5 ${className}`}>
          {names.map((raw, index) => <EmojiGlyph key={`${raw}-${index}`} value={raw} customEmoji={ctx.customEmoji} size="2.5rem" />)}
        </div>
      );
    }
  }
  if (isJumboEmoji(text)) {
    return <div className={`text-4xl leading-tight py-0.5 ${className}`}>{text}</div>;
  }

  return (
    <div className={`text-[14.5px] leading-relaxed text-slate-800 dark:text-slate-200 break-words [overflow-wrap:anywhere] ${className}`}>
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === "codeblock") {
          return (
            <pre key={key} className="my-1 max-w-full overflow-x-auto rounded-lg bg-slate-50 dark:bg-[#11141d] border border-slate-200 dark:border-[#2a3044] p-3 text-[13px] leading-snug font-mono text-slate-800 dark:text-slate-200 whitespace-pre">
              {block.value}
            </pre>
          );
        }
        if (block.type === "quote") {
          return (
            <blockquote key={key} className="my-0.5 border-l-4 border-slate-300 dark:border-slate-600 pl-3 text-slate-600 dark:text-slate-300">
              {block.lines.map((line, lineIndex) => (
                <div key={lineIndex}><InlineNodes nodes={line} ctx={ctx} /></div>
              ))}
            </blockquote>
          );
        }
        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag key={key} start={block.ordered ? block.start : undefined} className={`my-0.5 pl-6 ${block.ordered ? "list-decimal" : "list-disc"}`}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}><InlineNodes nodes={item} ctx={ctx} /></li>
              ))}
            </ListTag>
          );
        }
        return (
          <div key={key}>
            {block.lines.map((line, lineIndex) => (
              <div key={lineIndex} className="min-h-[1.4em] whitespace-pre-wrap"><InlineNodes nodes={line} ctx={ctx} /></div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default memo(MessageText);
