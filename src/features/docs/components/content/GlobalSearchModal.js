import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";

export default function GlobalSearchModal({ spaces, docPages, onSelectPage, onClose }) {
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
