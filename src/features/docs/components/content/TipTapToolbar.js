import React from "react";
import {
  FaAt, FaBold, FaCode, FaImage, FaItalic, FaListOl, FaListUl, FaMinus, FaQuoteLeft, FaStrikethrough,
} from "react-icons/fa";

// Hoisted out of the toolbar render so buttons are not remounted on every keystroke.
function ToolbarButton({ active, onClick, title, children }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(event) => { event.preventDefault(); onClick(); }}
      className={`px-2 py-1.5 rounded text-xs transition-colors ${
        active
          ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="w-px h-4 bg-slate-200 dark:bg-[#2a3044] mx-1 flex-shrink-0" />;
}

export default function TipTapToolbar({ editor, onImageClick, onAtClick }) {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-0.5 flex-wrap px-3 py-2 border-b border-slate-200 dark:border-[#2a3044] bg-slate-50/80 dark:bg-[#1a1f2e]/80 rounded-t-xl overflow-x-auto">
      <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><FaBold className="w-3 h-3" /></ToolbarButton>
      <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><FaItalic className="w-3 h-3" /></ToolbarButton>
      <ToolbarButton active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"><FaStrikethrough className="w-3 h-3" /></ToolbarButton>
      <ToolbarButton active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline code"><FaCode className="w-3 h-3" /></ToolbarButton>
      <Sep />
      <ToolbarButton active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1"><span className="font-bold text-[11px]">H1</span></ToolbarButton>
      <ToolbarButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2"><span className="font-bold text-[11px]">H2</span></ToolbarButton>
      <ToolbarButton active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3"><span className="font-bold text-[11px]">H3</span></ToolbarButton>
      <Sep />
      <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list"><FaListUl className="w-3 h-3" /></ToolbarButton>
      <ToolbarButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered list"><FaListOl className="w-3 h-3" /></ToolbarButton>
      <ToolbarButton active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote"><FaQuoteLeft className="w-3 h-3" /></ToolbarButton>
      <ToolbarButton active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code block"><span className="font-mono text-[11px]">```</span></ToolbarButton>
      <Sep />
      <ToolbarButton active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule"><FaMinus className="w-3 h-3" /></ToolbarButton>
      <Sep />
      <ToolbarButton active={false} onClick={onImageClick} title="Insert image"><FaImage className="w-3 h-3" /></ToolbarButton>
      <ToolbarButton active={false} onClick={onAtClick} title="Mention someone (@)"><FaAt className="w-3 h-3" /></ToolbarButton>
    </div>
  );
}
