import React, { useMemo, useRef, useState } from "react";
import { FaPlus, FaSearch } from "react-icons/fa";
import { taskKey } from "../../../shared/utils/helpers";
import { TASK_TYPE_LABELS } from "../../../shared/constants/taskMeta";

/**
 * Inline combobox to link a project task (requirement or defect).
 * `types` limits task types; `excludeIds` hides linked ones.
 */
export default function TaskPicker({ tasks, types, excludeIds = [], onPick, placeholder = "Link a task…", testId }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const exclude = useMemo(() => new Set(excludeIds.map(String)), [excludeIds]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks
      .filter((task) => (!types || types.includes(task.type)) && !exclude.has(String(task.id)))
      .filter((task) => !q || String(task.title || "").toLowerCase().includes(q) || taskKey(task.id).toLowerCase().includes(q))
      .slice(0, 8);
  }, [tasks, types, exclude, query]);

  const pick = (task) => {
    onPick(task);
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <FaSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-autocomplete="list"
        aria-controls={testId ? `${testId}-list` : undefined}
        value={query}
        placeholder={placeholder}
        data-testid={testId}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(0); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") { event.preventDefault(); setActive((value) => Math.min(results.length - 1, value + 1)); }
          if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(0, value - 1)); }
          if (event.key === "Enter" && results[active]) { event.preventDefault(); pick(results[active]); }
          if (event.key === "Escape" && open) { event.stopPropagation(); setOpen(false); }
        }}
        className="h-8 w-full rounded-md border border-slate-300/70 bg-white/80 pl-7 pr-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-[#2a3044] dark:bg-[#1c2030] dark:text-slate-200"
      />
      {open && results.length > 0 && (
        <ul id={testId ? `${testId}-list` : undefined} role="listbox" className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200/90 bg-white/100 py-1 shadow-lg dark:border-[#2a3044] dark:bg-[#1c2030]">
          {results.map((task, index) => (
            <li key={task.id} role="option" aria-selected={index === active}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(task)}
                className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs ${index === active ? "bg-blue-500/10" : "hover:bg-slate-500/10"}`}
              >
                <FaPlus className="h-2 w-2 flex-shrink-0 text-slate-400" />
                <span className="flex-shrink-0 font-mono text-[11px] text-slate-500">{taskKey(task.id)}</span>
                <span className="min-w-0 flex-1 truncate text-slate-800">{task.title}</span>
                <span className="flex-shrink-0 text-[10px] text-slate-500">{TASK_TYPE_LABELS?.[task.type] || task.type}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
