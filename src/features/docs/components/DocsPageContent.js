import React, { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import Image from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { formatDistanceToNow } from "date-fns";
import {
  FaAt,
  FaBold,
  FaChevronRight,
  FaChild,
  FaCode,
  FaComment,
  FaEdit,
  FaHome,
  FaImage,
  FaItalic,
  FaListOl,
  FaListUl,
  FaMinus,
  FaPlus,
  FaQuoteLeft,
  FaSearch,
  FaStrikethrough,
  FaTimes,
  FaTrash,
} from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";

function relativeTime(iso) {
  if (!iso) return "";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

export function SpaceOverview({ space, pages, onSelectPage, onNewPage }) {
  const rootPages = pages.filter((page) => !page.parentId);
  const recentPages = [...pages]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="app-surface p-6 mb-8">
        <div className="app-kicker mb-4">Space Overview</div>
        <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: `${space?.color}22`, border: `2px solid ${space?.color}44` }}
        >
          {space?.icon || "📘"}
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">{space?.name}</h1>
          {space?.description && (
            <p className="text-sm app-subtle-copy mt-1.5 max-w-2xl leading-6">{space.description}</p>
          )}
        </div>
      </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="app-surface p-5">
          <div className="app-kicker">Total Pages</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">{pages.length}</div>
        </div>
        <div className="app-surface p-5">
          <div className="app-kicker">Root Pages</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">{rootPages.length}</div>
        </div>
        <div className="app-surface p-5">
          <div className="app-kicker">Last Updated</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">
            {pages.length > 0 ? relativeTime([...pages].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0]?.updatedAt) : "—"}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="app-section-title">Pages</h2>
          <button onClick={onNewPage} className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 font-medium">
            <FaPlus className="w-2.5 h-2.5" /> New Page
          </button>
        </div>
        {rootPages.length === 0 ? (
          <div className="app-surface text-center py-10">
            <p className="text-sm text-slate-400 mb-3">No pages yet</p>
            <button onClick={onNewPage} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
              Create first page
            </button>
          </div>
        ) : (
          <div className="grid gap-2">
            {rootPages.map((page) => (
              <button
                key={page.id}
                onClick={() => onSelectPage(page.id)}
                className="app-surface flex items-center gap-3 p-5 hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-0.5 transition-all text-left group"
              >
                <span className="text-2xl">{page.emoji || "📄"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    {page.title}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Updated {relativeTime(page.updatedAt)}</div>
                </div>
                <FaChevronRight className="w-3 h-3 text-slate-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {recentPages.length > 0 && (
        <div>
          <h2 className="app-section-title mb-3">Recently Updated</h2>
          <div className="app-surface overflow-hidden">
            {recentPages.map((page, index) => (
              <button
                key={page.id}
                onClick={() => onSelectPage(page.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left ${
                  index < recentPages.length - 1 ? "border-b border-slate-100 dark:border-[#252b3b]" : ""
                }`}
              >
                <span className="text-base">{page.emoji || "📄"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-700 dark:text-slate-200 truncate">{page.title}</div>
                  <div className="text-xs text-slate-400">{relativeTime(page.updatedAt)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DocComments({ pageId }) {
  const { docPages, addDocComment, deleteDocComment, currentUser } = useApp();
  const [text, setText] = useState("");
  const page = docPages.find((entry) => entry.id === pageId);
  const comments = page?.comments || [];

  const handlePost = () => {
    if (!text.trim()) return;
    addDocComment(pageId, text.trim());
    setText("");
  };

  return (
      <div className="mt-12 pt-6 border-t border-slate-200 dark:border-[#252b3b]">
      <div className="flex items-center gap-2 mb-5">
        <FaComment className="w-4 h-4 text-slate-400" />
        <h3 className="app-section-title">
          Comments {comments.length > 0 && <span className="text-slate-400 font-normal">({comments.length})</span>}
        </h3>
      </div>

      {comments.length > 0 && (
        <div className="space-y-4 mb-6">
          {comments.map((comment) => (
            <div key={comment.id} className="app-surface-muted flex gap-3 group p-4">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mt-0.5">
                {comment.author?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 capitalize">{comment.author}</span>
                  <span className="text-xs text-slate-400">{relativeTime(comment.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{comment.text}</p>
              </div>
              {comment.author === currentUser && (
                <button onClick={() => deleteDocComment(pageId, comment.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-300 hover:text-red-500 transition-all flex-shrink-0">
                  <FaTrash className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {comments.length === 0 && <p className="text-sm text-slate-400 dark:text-slate-500 mb-5">No comments yet. Be the first to comment.</p>}

      <div className="app-surface p-4">
        <div className="flex gap-3">
        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mt-1">
          {currentUser?.[0]?.toUpperCase() || "U"}
        </div>
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) handlePost(); }}
            placeholder="Add a comment… (Ctrl+Enter to post)"
            rows={2}
            className="app-textarea w-full text-sm resize-none"
          />
          <div className="flex justify-end mt-2">
            <button onClick={handlePost} disabled={!text.trim()} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium">
              Post Comment
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export function GlobalSearchModal({ spaces, docPages, onSelectPage, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const normalizedQuery = query.toLowerCase();
    return docPages
      .filter((page) => page.title.toLowerCase().includes(normalizedQuery) || (page.content || "").toLowerCase().includes(normalizedQuery))
      .slice(0, 20)
      .map((page) => {
        const space = spaces.find((entry) => entry.id === page.spaceId);
        const index = (page.content || "").toLowerCase().indexOf(normalizedQuery);
        const snippet = index >= 0
          ? `…${page.content.slice(Math.max(0, index - 40), index + 80).replace(/[#*`]/g, "")}…`
          : "";
        return { ...page, spaceName: space?.name, spaceColor: space?.color, snippet };
      });
  }, [docPages, query, spaces]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50" onClick={onClose}>
      <div className="app-surface w-full max-w-2xl mx-4 overflow-hidden" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-[#2a3044]">
          <FaSearch className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search across all spaces…"
            className="flex-1 text-sm bg-transparent text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <FaTimes className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {!query.trim() && <p className="px-4 py-8 text-center text-sm text-slate-400">Start typing to search pages across all spaces</p>}
          {query.trim() && results.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">No results for "{query}"</p>}
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => { onSelectPage(result.spaceId, result.id); onClose(); }}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left border-b border-slate-100 dark:border-[#252b3b] last:border-0"
            >
              <span className="text-xl flex-shrink-0 mt-0.5">{result.emoji || "📄"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{result.title}</span>
                  {result.spaceName && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0" style={{ backgroundColor: `${result.spaceColor || "#2563eb"}22`, color: result.spaceColor || "#2563eb" }}>
                      {result.spaceName}
                    </span>
                  )}
                </div>
                {result.snippet && <p className="text-xs text-slate-400 truncate">{result.snippet}</p>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TipTapToolbar({ editor, onImageClick, onAtClick }) {
  if (!editor) return null;

  const Btn = ({ active, onClick, title, children }) => (
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

  const Sep = () => <span className="w-px h-4 bg-slate-200 dark:bg-[#2a3044] mx-1 flex-shrink-0" />;

  return (
    <div className="flex items-center gap-0.5 flex-wrap px-3 py-2 border-b border-slate-200 dark:border-[#2a3044] bg-slate-50/80 dark:bg-[#1a1f2e]/80 rounded-t-xl overflow-x-auto">
      <Btn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><FaBold className="w-3 h-3" /></Btn>
      <Btn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><FaItalic className="w-3 h-3" /></Btn>
      <Btn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"><FaStrikethrough className="w-3 h-3" /></Btn>
      <Btn active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline code"><FaCode className="w-3 h-3" /></Btn>
      <Sep />
      <Btn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1"><span className="font-bold text-[11px]">H1</span></Btn>
      <Btn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2"><span className="font-bold text-[11px]">H2</span></Btn>
      <Btn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3"><span className="font-bold text-[11px]">H3</span></Btn>
      <Sep />
      <Btn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list"><FaListUl className="w-3 h-3" /></Btn>
      <Btn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered list"><FaListOl className="w-3 h-3" /></Btn>
      <Btn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote"><FaQuoteLeft className="w-3 h-3" /></Btn>
      <Btn active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code block"><span className="font-mono text-[11px]">```</span></Btn>
      <Sep />
      <Btn active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule"><FaMinus className="w-3 h-3" /></Btn>
      <Sep />
      <Btn active={false} onClick={onImageClick} title="Insert image"><FaImage className="w-3 h-3" /></Btn>
      <Btn active={false} onClick={onAtClick} title="Mention someone (@)"><FaAt className="w-3 h-3" /></Btn>
    </div>
  );
}

export function PageView({
  page,
  breadcrumb,
  selectedSpace,
  childPages,
  onSave,
  onDelete,
  onAddChild,
  onSelectPage,
}) {
  const { users } = useApp();
  const [draftContent, setDraftContent] = useState(page.content || "");
  const [draftTitle, setDraftTitle] = useState(page.title || "");
  const [editingTitle, setEditingTitle] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [mentionDropdown, setMentionDropdown] = useState({ open: false, items: [], rect: null, selectedIndex: 0 });
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const imageFileRef = useRef(null);
  const titleInputRef = useRef(null);
  const mentionCommandRef = useRef(null);
  const mentionItemsRef = useRef([]);
  const mentionIndexRef = useRef(0);
  const usersRef = useRef(users);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({ html: false, transformPastedText: true }),
      Image.configure({ inline: false, allowBase64: true }),
      Mention.configure({
        HTMLAttributes: { class: "doc-mention" },
        suggestion: {
          items: ({ query }) => (usersRef.current || []).filter((user) => user.toLowerCase().includes(query.toLowerCase())).slice(0, 6),
          render: () => ({
            onStart: (props) => {
              mentionCommandRef.current = props.command;
              mentionItemsRef.current = props.items;
              mentionIndexRef.current = 0;
              setMentionDropdown({ open: true, items: props.items, rect: props.clientRect?.(), selectedIndex: 0 });
            },
            onUpdate: (props) => {
              mentionCommandRef.current = props.command;
              mentionItemsRef.current = props.items;
              setMentionDropdown((dropdown) => ({ ...dropdown, items: props.items, rect: props.clientRect?.() }));
            },
            onKeyDown: ({ event }) => {
              if (event.key === "Escape") {
                setMentionDropdown((dropdown) => ({ ...dropdown, open: false }));
                return true;
              }
              if (event.key === "ArrowDown") {
                mentionIndexRef.current = Math.min(mentionIndexRef.current + 1, mentionItemsRef.current.length - 1);
                setMentionDropdown((dropdown) => ({ ...dropdown, selectedIndex: mentionIndexRef.current }));
                return true;
              }
              if (event.key === "ArrowUp") {
                mentionIndexRef.current = Math.max(mentionIndexRef.current - 1, 0);
                setMentionDropdown((dropdown) => ({ ...dropdown, selectedIndex: mentionIndexRef.current }));
                return true;
              }
              if (event.key === "Enter" || event.key === "Tab") {
                const item = mentionItemsRef.current[mentionIndexRef.current];
                if (item) {
                  mentionCommandRef.current?.({ id: item, label: item });
                  setMentionDropdown((dropdown) => ({ ...dropdown, open: false }));
                }
                return true;
              }
              return false;
            },
            onExit: () => setMentionDropdown((dropdown) => ({ ...dropdown, open: false })),
          }),
        },
      }),
    ],
    content: draftContent,
    editable: false,
    onUpdate: ({ editor: currentEditor }) => {
      if (!currentEditor.isEditable) return;
      const markdown = currentEditor.storage.markdown.getMarkdown();
      setDraftContent(markdown);
      setUnsaved(true);
    },
  });

  const handleInsertImage = (src) => {
    if (!src) return;
    editor?.chain().focus().setImage({ src }).run();
    setShowImageModal(false);
    setImageUrl("");
    setUnsaved(true);
  };

  const handleImageFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => handleInsertImage(loadEvent.target.result);
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  useEffect(() => {
    setDraftContent(page.content || "");
    setDraftTitle(page.title || "");
    setIsEditing(false);
    setEditingTitle(false);
    setUnsaved(false);
    editor?.commands.setContent(page.content || "", false);
  }, [editor, page.id, page.content, page.title]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(isEditing, false);
    if (isEditing) setTimeout(() => editor.commands.focus("end"), 50);
  }, [editor, isEditing]);

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  const commitSave = () => {
    onSave({ ...page, title: draftTitle.trim() || page.title, content: draftContent, updatedAt: new Date().toISOString() });
    setIsEditing(false);
    setUnsaved(false);
  };

  useEffect(() => {
    if (!unsaved) return undefined;
    const handler = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault();
        commitSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDiscard = () => {
    const original = page.content || "";
    setDraftContent(original);
    setDraftTitle(page.title || "");
    editor?.commands.setContent(original, false);
    setIsEditing(false);
    setUnsaved(false);
  };

  const handleTitleBlur = () => {
    if (!draftTitle.trim()) {
      setDraftTitle(page.title);
      setEditingTitle(false);
      return;
    }
    if (draftTitle.trim() !== page.title) {
      onSave({ ...page, title: draftTitle.trim(), updatedAt: new Date().toISOString() });
    }
    setEditingTitle(false);
  };

  if (!page) return null;

  return (
    <div className="w-full px-6 py-6 pb-24">
      <div className="app-surface p-6 mb-6">
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-5 flex-wrap">
          <FaHome className="w-3 h-3" />
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="text-slate-500 dark:text-slate-400">{selectedSpace?.name}</span>
          {breadcrumb.map((crumb, index) => (
            <React.Fragment key={crumb.id}>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              {index < breadcrumb.length - 1 ? (
                <button onClick={() => onSelectPage(crumb.id)} className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                  {crumb.emoji} {crumb.title}
                </button>
              ) : (
                <span className="text-slate-700 dark:text-slate-300 font-medium">{crumb.emoji} {crumb.title}</span>
              )}
            </React.Fragment>
          ))}
        </nav>

      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-4xl leading-none select-none mt-1">{page.emoji || "📄"}</span>
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleTitleBlur();
                  if (event.key === "Escape") {
                    setDraftTitle(page.title);
                    setEditingTitle(false);
                  }
                }}
                className="w-full text-3xl font-bold bg-transparent border-b-2 border-blue-400 text-slate-800 dark:text-white focus:outline-none pb-1"
              />
            ) : (
              <h1 onClick={() => setEditingTitle(true)} className="text-3xl font-bold text-slate-800 dark:text-white cursor-text hover:opacity-80 transition-opacity leading-tight" title="Click to edit title">
                {page.title}
              </h1>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
          <button
            onClick={() => { if (isEditing) { handleDiscard(); } else { setIsEditing(true); } }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
              isEditing
                ? "border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
                : "border-slate-200 dark:border-[#2a3044] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
            }`}
          >
            {isEditing ? <><FaTimes className="w-3 h-3" /> Cancel</> : <><FaEdit className="w-3 h-3" /> Edit</>}
          </button>
          <button onClick={onAddChild} title="Add child page" className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
            <FaChild className="w-3 h-3" />
          </button>
          <button onClick={onDelete} title="Delete page" className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
            <FaTrash className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs mb-1 flex-wrap">
        <div className="app-meta-pill">
          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
            {page.author?.[0]?.toUpperCase() || "U"}
          </div>
          <span className="capitalize">{page.author}</span>
        </div>
        <span className="app-meta-pill">Updated {relativeTime(page.updatedAt)}</span>
        <span className="app-meta-pill">Created {relativeTime(page.createdAt)}</span>
        {page.labels?.length > 0 && page.labels.map((label) => (
          <span key={label} className="app-meta-pill">
            {label}
          </span>
        ))}
      </div>
      </div>

      <div className={`docs-tiptap app-surface transition-all relative w-full ${isEditing ? "ring-1 ring-blue-400/30" : ""}`}>
        {isEditing && <TipTapToolbar editor={editor} onImageClick={() => setShowImageModal(true)} onAtClick={() => editor?.chain().focus().insertContent("@").run()} />}
        <div className={isEditing ? "p-5" : "p-6"}>
          <EditorContent editor={editor} />
        </div>

        {mentionDropdown.open && mentionDropdown.items.length > 0 && mentionDropdown.rect && (
          <div className="fixed z-[100] bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl shadow-xl overflow-hidden min-w-[160px]" style={{ top: mentionDropdown.rect.bottom + 4, left: mentionDropdown.rect.left }}>
            {mentionDropdown.items.map((item, index) => (
              <button
                key={item}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  index === mentionDropdown.selectedIndex
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  mentionCommandRef.current?.({ id: item, label: item });
                  setMentionDropdown((dropdown) => ({ ...dropdown, open: false }));
                }}
              >
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                  {item[0]?.toUpperCase()}
                </div>
                <span className="capitalize">{item}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="app-surface w-full max-w-sm mx-4 p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Insert Image</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Image URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") handleInsertImage(imageUrl); }}
                  placeholder="https://example.com/image.png"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-slate-200 dark:bg-[#2a3044]" />
                <span className="text-xs text-slate-400">or</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-[#2a3044]" />
              </div>
              <input ref={imageFileRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
              <button onClick={() => imageFileRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-[#2a3044] rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                <FaImage className="w-3.5 h-3.5" /> Upload from device
              </button>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => { setShowImageModal(false); setImageUrl(""); }} className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">Cancel</button>
              <button onClick={() => handleInsertImage(imageUrl)} disabled={!imageUrl.trim()} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">Insert</button>
            </div>
          </div>
        </div>
      )}

      {childPages.length > 0 && (
        <div className="mt-12 pt-6 border-t border-slate-200 dark:border-[#252b3b]">
          <h3 className="app-section-title mb-3">Child Pages</h3>
          <div className="grid gap-2">
            {childPages.map((child) => (
              <button key={child.id} onClick={(event) => { event.stopPropagation(); onSelectPage(child.id); }} className="app-surface-muted flex items-center gap-3 p-4 hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-0.5 transition-all text-left group">
                <span className="text-xl">{child.emoji || "📄"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">{child.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Updated {relativeTime(child.updatedAt)}</div>
                </div>
                <FaChevronRight className="w-3 h-3 text-slate-400 group-hover:text-blue-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      <DocComments pageId={page.id} />

      {unsaved && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/60 animate-modal-enter">
          <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
          <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">Unsaved changes</span>
          <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">Ctrl+S</span>
          <div className="w-px h-4 bg-slate-200 dark:bg-[#2a3044]" />
          <button onClick={handleDiscard} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            Discard
          </button>
          <button onClick={commitSave} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors">
            Save
          </button>
        </div>
      )}
    </div>
  );
}
