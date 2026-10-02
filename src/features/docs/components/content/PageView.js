import React, { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import Image from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { useApp } from "../../../../shared/context/AppContext";
import { useToast } from "../../../../shared/context/ToastContext";
import { buildMentionItems } from "../../utils/mentionUtils";
import {
  DOCS_STORAGE_BUDGET_BYTES,
  DocImageError,
  compressImageFile,
  dataUrlByteSize,
  estimateSerializedBytes,
  formatBytes,
} from "../../utils/imageCompression";
import DocComments from "./DocComments";
import TipTapToolbar from "./TipTapToolbar";
import PageHeaderCard from "./PageHeaderCard";
import MentionDropdown from "./MentionDropdown";
import InsertImageModal from "./InsertImageModal";
import ChildPagesList from "./ChildPagesList";
import UnsavedChangesBar from "./UnsavedChangesBar";

export default function PageView(props) {
  if (!props.page) {
    return (
      <div className="w-full px-6 py-10 text-center text-sm text-slate-400 dark:text-slate-500">
        This page is no longer available.
      </div>
    );
  }
  return <PageViewEditor {...props} />;
}

function isPaletteShortcut(event) {
  return (event.metaKey || event.ctrlKey) && String(event.key).toLowerCase() === "k";
}

function PageViewEditor({
  page,
  breadcrumb,
  selectedSpace,
  childPages,
  onSave,
  onDelete,
  onAddChild,
  onSelectPage,
  onDirtyChange,
  readOnly = false,
}) {
  const { users, docPages, spaces } = useApp();
  const { addToast } = useToast();
  const [draftContent, setDraftContent] = useState(page.content || "");
  const [draftTitle, setDraftTitle] = useState(page.title || "");
  const [editingTitle, setEditingTitle] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [remoteChanged, setRemoteChanged] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [mentionDropdown, setMentionDropdown] = useState({ open: false, items: [], rect: null, selectedIndex: 0 });
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const titleInputRef = useRef(null);
  const mentionCommandRef = useRef(null);
  const mentionItemsRef = useRef([]);
  const mentionIndexRef = useRef(0);
  const usersRef = useRef(users);
  const unsavedRef = useRef(unsaved);
  const insertImageFileRef = useRef(null);
  const commitSaveRef = useRef(null);
  const lastPageIdRef = useRef(page.id);
  unsavedRef.current = unsaved;

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
          items: ({ query }) => buildMentionItems(usersRef.current, query),
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
                  mentionCommandRef.current?.({ id: item.id, label: item.label });
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
    editorProps: {
      // Pasted / dropped image files go through the same compression path as
      // the "Upload from device" button instead of being embedded raw.
      handlePaste: (view, event) => {
        if (!view.editable) return false;
        const files = Array.from(event.clipboardData?.files || []).filter((file) => file.type?.startsWith("image/"));
        if (files.length === 0) return false;
        event.preventDefault();
        files.forEach((file) => insertImageFileRef.current?.(file));
        return true;
      },
      handleDrop: (view, event) => {
        if (!view.editable) return false;
        const files = Array.from(event.dataTransfer?.files || []).filter((file) => file.type?.startsWith("image/"));
        if (files.length === 0) return false;
        event.preventDefault();
        files.forEach((file) => insertImageFileRef.current?.(file));
        return true;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (!currentEditor.isEditable) return;
      const markdown = currentEditor.storage.markdown.getMarkdown();
      setDraftContent(markdown);
      setUnsaved(true);
    },
  });

  const handleInsertImage = (src) => {
    if (readOnly || !src) return;
    editor?.chain().focus().setImage({ src }).run();
    setShowImageModal(false);
    setImageUrl("");
    setUnsaved(true);
  };

  const insertImageFile = async (file) => {
    if (readOnly || !file) return;
    setImageBusy(true);
    try {
      const dataUrl = await compressImageFile(file);
      const currentBytes = estimateSerializedBytes({ spaces, docPages });
      const pageBytes = estimateSerializedBytes(page.content || "");
      const draftBytes = estimateSerializedBytes(draftContent || "");
      const projected = currentBytes - pageBytes + draftBytes + dataUrl.length;
      if (projected > DOCS_STORAGE_BUDGET_BYTES) {
        addToast(
          `Not enough documentation storage for this image (${formatBytes(dataUrlByteSize(dataUrl))}). Link it by URL instead.`,
          "error",
          5000
        );
        return;
      }
      handleInsertImage(dataUrl);
      addToast(`Image inserted (${formatBytes(dataUrlByteSize(dataUrl))} after compression)`, "success");
    } catch (error) {
      const message = error instanceof DocImageError ? error.message : "Could not insert the image.";
      addToast(message, "error", 5000);
    } finally {
      setImageBusy(false);
    }
  };
  insertImageFileRef.current = insertImageFile;

  const handleImageFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    insertImageFile(file);
  };

  // Switching to another page resets local editing state. DocsPage asks the
  // user to confirm before switching while there are unsaved edits.
  useEffect(() => {
    if (lastPageIdRef.current === page.id) return;
    lastPageIdRef.current = page.id;
    unsavedRef.current = false;
    setDraftContent(page.content || "");
    setDraftTitle(page.title || "");
    setIsEditing(false);
    setEditingTitle(false);
    setUnsaved(false);
    setRemoteChanged(false);
    editor?.commands.setContent(page.content || "", { emitUpdate: false });
  }, [editor, page.id, page.content, page.title]);

  // Same page changed in the store (own save or remote sync). Never wipe
  // local unsaved edits: flag the conflict instead.
  useEffect(() => {
    if (lastPageIdRef.current !== page.id) return;
    if (unsavedRef.current) {
      if ((page.content || "") !== draftContent) setRemoteChanged(true);
      return;
    }
    setDraftContent(page.content || "");
    if (!editingTitle) setDraftTitle(page.title || "");
    if (editor && editor.storage?.markdown?.getMarkdown?.() !== (page.content || "")) {
      editor.commands.setContent(page.content || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, page.content, page.title]);

  // Losing edit permission mid-session (role change / remote matrix update)
  // drops back to view mode; the draft is discarded rather than saved.
  useEffect(() => {
    if (!readOnly) return;
    setIsEditing(false);
    setEditingTitle(false);
    setShowImageModal(false);
    if (unsavedRef.current) {
      unsavedRef.current = false;
      setUnsaved(false);
      setRemoteChanged(false);
      setDraftContent(page.content || "");
      setDraftTitle(page.title || "");
      editor?.commands.setContent(page.content || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly]);

  const canEditNow = isEditing && !readOnly;
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(canEditNow, false);
    if (canEditNow) setTimeout(() => editor.commands.focus("end"), 50);
  }, [editor, canEditNow]);

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  useEffect(() => {
    onDirtyChange?.(unsaved);
  }, [onDirtyChange, unsaved]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  useEffect(() => {
    if (!unsaved) return undefined;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [unsaved]);

  const commitSave = () => {
    if (readOnly) return;
    const result = onSave({ ...page, title: draftTitle.trim() || page.title, content: draftContent, updatedAt: new Date().toISOString() });
    if (result === false) return;
    setIsEditing(false);
    setUnsaved(false);
    setRemoteChanged(false);
  };
  commitSaveRef.current = commitSave;

  useEffect(() => {
    if (!unsaved || readOnly) return undefined;
    const handler = (event) => {
      if ((event.metaKey || event.ctrlKey) && String(event.key).toLowerCase() === "s") {
        event.preventDefault();
        commitSaveRef.current?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [unsaved, readOnly]);

  const handleDiscard = () => {
    const original = page.content || "";
    setDraftContent(original);
    setDraftTitle(page.title || "");
    editor?.commands.setContent(original, { emitUpdate: false });
    setIsEditing(false);
    setUnsaved(false);
    setRemoteChanged(false);
  };

  const handleTitleBlur = () => {
    if (readOnly) {
      setDraftTitle(page.title);
      setEditingTitle(false);
      return;
    }
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

  // Keep ⌘K / Ctrl+K inside the editor from toggling the global command
  // palette (which would steal focus mid-edit). React stops propagation at the
  // root, so the window-level shortcut listener never sees the event.
  const handleEditorKeyDown = (event) => {
    if (canEditNow && isPaletteShortcut(event)) event.stopPropagation();
  };


  const handleToggleEdit = () => {
    if (isEditing) handleDiscard();
    else setIsEditing(true);
  };

  const handleTitleCancel = () => {
    setDraftTitle(page.title);
    setEditingTitle(false);
  };

  const handlePickMention = (item) => {
    mentionCommandRef.current?.({ id: item.id, label: item.label });
    setMentionDropdown((dropdown) => ({ ...dropdown, open: false }));
  };

  return (
    <div className="w-full px-6 py-6 pb-24">
      <PageHeaderCard
        page={page}
        breadcrumb={breadcrumb}
        selectedSpace={selectedSpace}
        readOnly={readOnly}
        isEditing={isEditing}
        editingTitle={editingTitle}
        draftTitle={draftTitle}
        titleInputRef={titleInputRef}
        onDraftTitleChange={setDraftTitle}
        onStartTitleEdit={() => setEditingTitle(true)}
        onTitleCommit={handleTitleBlur}
        onTitleCancel={handleTitleCancel}
        onToggleEdit={handleToggleEdit}
        onAddChild={onAddChild}
        onDelete={onDelete}
        onSelectPage={onSelectPage}
      />

      <div
        className={`docs-tiptap app-surface transition-all relative w-full ${canEditNow ? "ring-1 ring-blue-400/30" : ""}`}
        onKeyDown={handleEditorKeyDown}
      >
        {canEditNow && <TipTapToolbar editor={editor} onImageClick={() => setShowImageModal(true)} onAtClick={() => editor?.chain().focus().insertContent("@").run()} />}
        <div className={canEditNow ? "p-5" : "p-6"}>
          <EditorContent editor={editor} />
        </div>
        <MentionDropdown dropdown={mentionDropdown} onPick={handlePickMention} />
      </div>

      {showImageModal && !readOnly && (
        <InsertImageModal
          imageUrl={imageUrl}
          imageBusy={imageBusy}
          onImageUrlChange={setImageUrl}
          onInsertUrl={handleInsertImage}
          onFileChange={handleImageFile}
          onCancel={() => { setShowImageModal(false); setImageUrl(""); }}
        />
      )}

      <ChildPagesList childPages={childPages} onSelectPage={onSelectPage} />

      <DocComments pageId={page.id} readOnly={readOnly} />

      {unsaved && !readOnly && (
        <UnsavedChangesBar remoteChanged={remoteChanged} onDiscard={handleDiscard} onSave={commitSave} />
      )}
    </div>
  );
}
