import React, { memo, useState } from "react";
import { FaBookmark, FaColumns, FaSearch, FaTimes, FaTrashAlt } from "react-icons/fa";
import {
  AUTOMATION_OPTIONS, CASE_COLUMNS, CASE_SORTS, CASE_STATUS_OPTIONS, CASE_TYPE_OPTIONS, CONTROL_SM,
  PRIORITY_OPTIONS, RESULT_META, RESULT_ORDER,
} from "../constants/testingConstants";
import { FacetMenu, Popover } from "../components/Popover";
import { countActiveFilters } from "../utils/caseFilters";
import { userLabel } from "../utils/testingFormat";

const withCounts = (options, counts) => options.map((option) => ({ ...option, count: counts?.[option.value] || 0 }));

function SavedViewsMenu({ views, activeViewId, onApply, onSave, onDelete }) {
  const [name, setName] = useState("");
  const active = views.find((view) => view.id === activeViewId);
  return (
    <Popover
      align="right"
      ariaLabel="Saved views"
      testId="tests-saved-views"
      trigger={{
        className: `inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${active ? "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300" : "border-slate-300/70 bg-white/80 text-slate-700 hover:bg-slate-500/[0.06] dark:border-[#2a3044] dark:bg-[#1c2030] dark:text-slate-200"}`,
        content: (<><FaBookmark className="h-2.5 w-2.5" />{active ? active.name : "Views"}</>),
      }}
      panelClassName="w-64"
    >
      {({ close }) => (
        <div>
          <div className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Saved views</div>
          {views.length === 0 && <p className="px-2 py-1.5 text-xs text-slate-500">Save filters, sort and folder as a reusable view.</p>}
          {views.map((view) => (
            <div key={view.id} className="group flex items-center gap-1">
              <button type="button" onClick={() => { onApply(view); close(); }} className={`min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-500/10 ${view.id === activeViewId ? "font-semibold text-blue-700 dark:text-blue-300" : "text-slate-700 dark:text-slate-200"}`}>
                {view.name}
              </button>
              <button type="button" onClick={() => onDelete(view.id)} aria-label={`Delete view ${view.name}`} className="rounded p-1.5 text-slate-400 opacity-0 hover:text-red-500 group-hover:opacity-100 focus:opacity-100">
                <FaTrashAlt className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
          <form
            className="mt-1 flex gap-1 border-t border-slate-200/70 pt-2 dark:border-[#2a3044]"
            onSubmit={(event) => {
              event.preventDefault();
              if (!name.trim()) return;
              onSave(name.trim());
              setName("");
              close();
            }}
          >
            <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="View name" aria-label="New view name" className={`${CONTROL_SM} min-w-0 flex-1`} />
            <button type="submit" disabled={!name.trim()} className="h-8 rounded-md bg-blue-600 px-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50">Save</button>
          </form>
        </div>
      )}
    </Popover>
  );
}

function CaseToolbar({
  filters, onFiltersChange, facets, users, sort, onSortChange, columns, onColumnsChange,
  includeSubfolders, onIncludeSubfoldersChange, savedViews, resultCount, totalCount,
}) {
  const setFacet = (key) => (value) => onFiltersChange({ ...filters, [key]: value });
  const active = countActiveFilters(filters) + (filters.query ? 1 : 0);
  const ownerOptions = Object.keys(facets.owner || {}).map((owner) => ({
    value: owner, label: owner === "__none__" ? "Unassigned" : userLabel(users, owner), count: facets.owner[owner],
  })).sort((a, b) => a.label.localeCompare(b.label));
  const tagOptions = Object.keys(facets.tags || {}).sort().map((tag) => ({ value: tag, label: tag, count: facets.tags[tag] }));

  return (
    <div className="flex flex-col gap-2 border-b border-slate-200/80 px-3 py-2.5 dark:border-[#252b3b]">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative block w-full min-w-[180px] sm:w-auto sm:flex-1 sm:max-w-xs">
          <span className="sr-only">Search test cases</span>
          <FaSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={filters.query}
            onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })}
            placeholder="Search title, TC-123, tag, step…"
            data-testid="tests-case-search"
            className={`${CONTROL_SM} w-full pl-7`}
          />
        </label>
        <FacetMenu label="Priority" options={withCounts(PRIORITY_OPTIONS, facets.priority)} selected={filters.priority} onChange={setFacet("priority")} testId="tests-filter-priority" />
        <FacetMenu label="Type" options={withCounts(CASE_TYPE_OPTIONS, facets.type).filter((option) => option.count || filters.type.includes(option.value))} selected={filters.type} onChange={setFacet("type")} />
        <FacetMenu label="Automation" options={withCounts(AUTOMATION_OPTIONS, facets.automation)} selected={filters.automation} onChange={setFacet("automation")} />
        <FacetMenu label="Status" options={withCounts(CASE_STATUS_OPTIONS, facets.status)} selected={filters.status} onChange={setFacet("status")} />
        <FacetMenu label="Last result" options={RESULT_ORDER.map((status) => ({ value: status, label: RESULT_META[status].label, count: facets.lastResult?.[status] || 0 }))} selected={filters.lastResult} onChange={setFacet("lastResult")} testId="tests-filter-result" />
        <FacetMenu label="Owner" options={ownerOptions} selected={filters.owner} onChange={setFacet("owner")} />
        {tagOptions.length > 0 && <FacetMenu label="Tags" options={tagOptions} selected={filters.tags} onChange={setFacet("tags")} />}
        {active > 0 && (
          <button type="button" onClick={() => onFiltersChange({ query: "", priority: [], type: [], automation: [], status: [], lastResult: [], owner: [], tags: [] })} className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-blue-600 hover:bg-blue-500/10 dark:text-blue-400" data-testid="tests-clear-filters">
            <FaTimes className="h-2.5 w-2.5" /> Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs tabular-nums text-slate-500" aria-live="polite">
          {resultCount === totalCount ? `${totalCount} cases` : `${resultCount} of ${totalCount} cases`}
        </span>
        <label className="inline-flex cursor-pointer select-none items-center gap-1.5 text-xs text-slate-600">
          <input type="checkbox" checked={includeSubfolders} onChange={(event) => onIncludeSubfoldersChange(event.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          Include sub-folders
        </label>
        <div className="flex-1" />
        <label className="sr-only" htmlFor="tests-case-sort">Sort cases</label>
        <select
          id="tests-case-sort"
          value={`${sort.by}:${sort.dir}`}
          onChange={(event) => {
            const [by, dir] = event.target.value.split(":");
            onSortChange({ by, dir });
          }}
          className={CONTROL_SM}
        >
          {CASE_SORTS.map((option) => (
            <React.Fragment key={option.id}>
              <option value={`${option.id}:asc`}>Sort: {option.label}{option.id === "order" ? "" : " ↑"}</option>
              {option.id !== "order" && <option value={`${option.id}:desc`}>Sort: {option.label} ↓</option>}
            </React.Fragment>
          ))}
        </select>
        <Popover
          align="right"
          ariaLabel="Columns"
          trigger={{
            className: "inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300/70 bg-white/80 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-500/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:border-[#2a3044] dark:bg-[#1c2030] dark:text-slate-200",
            content: (<><FaColumns className="h-2.5 w-2.5" /> Columns</>),
          }}
        >
          <div className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Visible columns</div>
          {CASE_COLUMNS.map((column) => (
            <label key={column.id} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${column.locked ? "text-slate-500" : "cursor-pointer text-slate-700 hover:bg-slate-500/10 dark:text-slate-200"}`}>
              <input
                type="checkbox"
                disabled={column.locked}
                checked={columns.includes(column.id)}
                onChange={(event) => onColumnsChange(event.target.checked
                  ? CASE_COLUMNS.map((item) => item.id).filter((id) => id === column.id || columns.includes(id))
                  : columns.filter((id) => id !== column.id))}
                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              {column.label}
            </label>
          ))}
        </Popover>
        <SavedViewsMenu {...savedViews} />
      </div>
    </div>
  );
}

export default memo(CaseToolbar);
