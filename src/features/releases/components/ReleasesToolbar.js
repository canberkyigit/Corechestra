import React, { memo } from "react";
import { FaColumns, FaList, FaSearch, FaStream } from "react-icons/fa";
import { RELEASE_SORTS, RELEASE_VIEWS, STATUS_FILTERS } from "../constants/releaseMeta";

const VIEW_ICONS = { list: FaList, timeline: FaStream, board: FaColumns };

const CONTROL = "h-9 rounded-lg border border-slate-300/70 bg-white/80 px-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:bg-[#1c2030] dark:border-[#2a3044] dark:text-slate-200";

/** Search, status chips, owner/sort filters and the List | Timeline | Board switcher. */
function ReleasesToolbar({
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
  statusCounts,
  ownerFilter,
  onOwnerFilterChange,
  ownerOptions,
  sort,
  onSortChange,
  view,
  onViewChange,
  groupByStatus,
  onGroupByStatusChange,
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative block w-full sm:w-72">
          <span className="sr-only">Search releases</span>
          <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search version, name, description"
            className={`${CONTROL} w-full pl-8`}
          />
        </label>
        <label className="sr-only" htmlFor="release-owner-filter">Owner</label>
        <select id="release-owner-filter" value={ownerFilter} onChange={(event) => onOwnerFilterChange(event.target.value)} className={CONTROL}>
          <option value="">All owners</option>
          {ownerOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="release-sort">Sort by</label>
        <select id="release-sort" value={sort} onChange={(event) => onSortChange(event.target.value)} className={CONTROL}>
          {RELEASE_SORTS.map((option) => (
            <option key={option.id} value={option.id}>Sort: {option.label}</option>
          ))}
        </select>
        {view === "list" && (
          <label className="inline-flex h-9 items-center gap-2 rounded-lg px-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={groupByStatus}
              onChange={(event) => onGroupByStatusChange(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Group by status
          </label>
        )}
        <div className="hidden flex-1 sm:block" />
        <div role="tablist" aria-label="Releases view" className="inline-flex h-9 items-center rounded-lg bg-slate-900/[0.05] p-0.5 dark:bg-white/[0.06]">
          {RELEASE_VIEWS.map((option) => {
            const Icon = VIEW_ICONS[option.id];
            const active = view === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onViewChange(option.id)}
                className={`h-8 inline-flex items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
                  active
                    ? "bg-white/100 text-slate-900 shadow-sm dark:bg-[#2a3044] dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <Icon className="w-3 h-3" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div role="group" aria-label="Filter by status" className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 scrollbar-none sm:flex-wrap sm:overflow-visible">
        {STATUS_FILTERS.map((filter) => {
          const active = statusFilter === filter.id;
          const count = statusCounts[filter.id] || 0;
          if (count === 0 && !active && !["all", "active"].includes(filter.id)) return null;
          return (
            <button
              key={filter.id}
              type="button"
              aria-pressed={active}
              onClick={() => onStatusFilterChange(filter.id)}
              className={`h-8 inline-flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
                active
                  ? "bg-slate-900 text-white dark:bg-blue-600"
                  : "text-slate-600 ring-1 ring-inset ring-slate-300/70 hover:bg-slate-500/10 dark:ring-[#2a3044] dark:text-slate-300"
              }`}
            >
              {filter.label}
              <span className={`tabular-nums ${active ? "opacity-80" : "opacity-60"}`}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default memo(ReleasesToolbar);
