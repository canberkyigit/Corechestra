import React, { useEffect, useRef, useState } from "react";

export default function NewPageForm({ parentId, spaceId, onSave, onCancel, templateContent, templateEmoji }) {
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState(templateEmoji || "📄");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), emoji, parentId, spaceId, templateContent });
  };

  return (
    <div className="mx-2 mt-1 p-3 app-surface-muted shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          className="w-10 text-center text-lg bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-md py-1"
          maxLength={2}
        />
        <input
          ref={inputRef}
          type="text"
          placeholder="Page title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onCancel(); }}
          className="flex-1 text-sm bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-md px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1 text-xs rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">Cancel</button>
        <button
          onClick={handleSave}
          disabled={!title.trim()}
          className="px-3 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Create
        </button>
      </div>
    </div>
  );
}
