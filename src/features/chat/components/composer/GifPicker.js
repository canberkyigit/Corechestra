import React, { useEffect, useRef, useState } from "react";
import { FaSearch } from "react-icons/fa";
import { useDismiss } from "../../hooks/useChatUi";
import { searchGifs } from "../../utils/chatGifs";

export default function GifPicker({ apiKey, onSelect, onClose }) {
  const ref = useRef(null);
  const [query, setQuery] = useState("");
  const [state, setState] = useState({ loading: true, results: [], error: null });
  useDismiss(ref, onClose);

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const timer = window.setTimeout(() => {
      searchGifs(query, { key: apiKey, signal: controller.signal })
        .then((results) => setState({ loading: false, results, error: null }))
        .catch((error) => {
          if (error?.name === "AbortError") return;
          setState({ loading: false, results: [], error: error?.message || "GIF search failed." });
        });
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [apiKey, query]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-1.5 z-50 w-[320px] rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] shadow-xl"
      role="dialog"
      aria-label="GIF picker"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="p-2 border-b border-slate-100 dark:border-[#2a3044]">
        <div className="relative">
          <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Tenor"
            className="w-full h-8 pl-7 pr-2 rounded-lg text-sm bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
      </div>
      <div className="h-72 overflow-y-auto p-2">
        {state.error && <p className="p-4 text-center text-sm text-red-500">{state.error}</p>}
        {state.loading && !state.results.length && <p className="p-4 text-center text-sm text-slate-400">Loading…</p>}
        {!state.loading && !state.error && !state.results.length && <p className="p-4 text-center text-sm text-slate-400">No GIFs found</p>}
        <div className="columns-2 gap-1.5 [&>*]:mb-1.5">
          {state.results.map((gif) => (
            <button
              key={gif.id}
              type="button"
              onClick={() => onSelect(gif)}
              className="block w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-[#232838] hover:ring-2 hover:ring-blue-500"
              title={gif.title}
            >
              <img src={gif.preview} alt={gif.title} loading="lazy" className="w-full" />
            </button>
          ))}
        </div>
      </div>
      <p className="border-t border-slate-100 dark:border-[#2a3044] px-3 py-1.5 text-[10px] text-slate-400">Powered by Tenor</p>
    </div>
  );
}
