import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";

/*
 * WYSIWYG composer input (TipTap). Exposes the same small adapter API as the
 * plain textarea in MessageComposer, so autocomplete, formatting, drafts and
 * sending work identically in both modes. Content is exchanged as markdown —
 * the stored message format does not change.
 */

/** prosemirror-markdown escapes punctuation; our renderer reads it literally. */
export function cleanSerializedMarkdown(markdown) {
  return String(markdown || "")
    .replace(/\\([\\`*_{}[\]()#+\-.!~>|])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+$/, "");
}

const RichComposerInput = forwardRef(function RichComposerInput({
  initialText = "",
  placeholder,
  disabled = false,
  testId = "chat-composer-input",
  onChange,
  onKeyDown,
  onSelectionChange,
  onPasteFiles,
  onBlur,
  autoFocus = false,
}, ref) {
  const handlersRef = useRef({ onChange, onKeyDown, onSelectionChange, onPasteFiles, onBlur });
  handlersRef.current = { onChange, onKeyDown, onSelectionChange, onPasteFiles, onBlur };
  const [empty, setEmpty] = useState(!initialText.trim());

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        horizontalRule: false,
        underline: false,
        link: { openOnClick: false, autolink: true, linkOnPaste: true, HTMLAttributes: { class: "text-blue-600 dark:text-blue-400 underline" } },
      }),
      Markdown.configure({ html: false, breaks: true, tightLists: true, bulletListMarker: "-", transformPastedText: true, linkify: true }),
    ],
    content: initialText,
    editable: !disabled,
    editorProps: {
      attributes: {
        "data-testid": testId,
        "aria-label": placeholder || "Message",
        role: "textbox",
        "aria-multiline": "true",
        class: "chat-rich-input prose-none min-h-[24px] max-h-[260px] overflow-y-auto px-3.5 py-2.5 text-[14.5px] leading-relaxed text-slate-900 dark:text-slate-100 focus:outline-none",
      },
      handleKeyDown: (view, event) => {
        const result = handlersRef.current.onKeyDown?.(event);
        return result === true || event.defaultPrevented;
      },
      handlePaste: (view, event) => {
        const files = Array.from(event.clipboardData?.files || []);
        if (files.length && handlersRef.current.onPasteFiles) {
          handlersRef.current.onPasteFiles(files);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: instance }) => {
      setEmpty(instance.isEmpty);
      handlersRef.current.onChange?.(cleanSerializedMarkdown(instance.storage.markdown.getMarkdown()));
      handlersRef.current.onSelectionChange?.();
    },
    onSelectionUpdate: () => handlersRef.current.onSelectionChange?.(),
    onBlur: () => handlersRef.current.onBlur?.(),
  });

  useEffect(() => {
    if (editor && autoFocus) editor.commands.focus("end");
  }, [autoFocus, editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  useImperativeHandle(ref, () => ({
    kind: "rich",
    focus: () => editor?.commands.focus(),
    getMarkdown: () => (editor ? cleanSerializedMarkdown(editor.storage.markdown.getMarkdown()) : ""),
    clear: () => { editor?.commands.clearContent(true); setEmpty(true); },
    setMarkdown: (value) => { editor?.commands.setContent(value || ""); setEmpty(!String(value || "").trim()); },
    /** Plain text of the current block up to the caret (for autocomplete triggers). */
    textBeforeCaret: () => {
      if (!editor) return "";
      const { $from } = editor.state.selection;
      return $from.parent.textBetween(0, $from.parentOffset, "\n", "￼");
    },
    inCodeBlock: () => Boolean(editor?.isActive("codeBlock")),
    replaceBeforeCaret: (count, replacement) => {
      if (!editor) return;
      const { from } = editor.state.selection;
      editor.chain().focus().deleteRange({ from: Math.max(0, from - count), to: from }).insertContent(replacement).run();
    },
    insertText: (value) => editor?.chain().focus().insertContent(value).run(),
    insertLink: (label, href) => editor?.chain().focus()
      .insertContent([{ type: "text", text: label, marks: [{ type: "link", attrs: { href } }] }, { type: "text", text: " " }])
      .run(),
    applyFormat: (kind) => {
      if (!editor) return;
      const chain = editor.chain().focus();
      switch (kind) {
        case "bold": chain.toggleBold().run(); break;
        case "italic": chain.toggleItalic().run(); break;
        case "strike": chain.toggleStrike().run(); break;
        case "code": chain.toggleCode().run(); break;
        case "codeblock": chain.toggleCodeBlock().run(); break;
        case "bullet": chain.toggleBulletList().run(); break;
        case "ordered": chain.toggleOrderedList().run(); break;
        case "quote": chain.toggleBlockquote().run(); break;
        case "link": {
          const previous = editor.getAttributes("link").href || "https://";
          // eslint-disable-next-line no-alert
          const href = window.prompt("Link URL", previous);
          if (href === null) return;
          if (!href.trim()) chain.extendMarkRange("link").unsetLink().run();
          else chain.extendMarkRange("link").setLink({ href: href.trim() }).run();
          break;
        }
        default:
      }
    },
    isActive: (kind) => {
      if (!editor) return false;
      const map = { bold: "bold", italic: "italic", strike: "strike", code: "code", codeblock: "codeBlock", bullet: "bulletList", ordered: "orderedList", quote: "blockquote", link: "link" };
      return Boolean(map[kind] && editor.isActive(map[kind]));
    },
  }), [editor]);

  return (
    <div className="relative">
      {empty && placeholder && (
        <span className="pointer-events-none absolute left-3.5 top-2.5 select-none text-[14.5px] text-slate-400 dark:text-slate-500" aria-hidden="true">
          {placeholder}
        </span>
      )}
      <EditorContent editor={editor} />
    </div>
  );
});

export default RichComposerInput;
