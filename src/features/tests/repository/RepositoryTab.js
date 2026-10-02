import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { FaDatabase, FaFolderPlus, FaPlus, FaSitemap, FaStream } from "react-icons/fa";
import { useSavedViews } from "../../../shared/context/hooks/useSavedViews";
import { BTN_PRIMARY, BTN_SECONDARY, BTN_SM, BTN_SM_PRIMARY, CARD, DEFAULT_VISIBLE_COLUMNS } from "../constants/testingConstants";
import { EmptyState } from "../components/ui";
import SuiteTree from "./SuiteTree";
import CaseToolbar from "./CaseToolbar";
import CaseTable from "./CaseTable";
import BulkActionBar from "./BulkActionBar";
import FolderDialog from "./FolderDialog";
import { EMPTY_CASE_FILTERS, buildFacetCounts, filterCases, sortCases } from "../utils/caseFilters";
import { flattenTree, getDescendantIds, getSuitePath } from "../utils/testingTree";

const COLUMNS_KEY = "corechestra_tests_columns_v2";

function loadColumns() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(COLUMNS_KEY) || "null");
    if (Array.isArray(stored) && stored.includes("title")) return stored;
  } catch {
    // ignore
  }
  return DEFAULT_VISIBLE_COLUMNS;
}

function RepositoryTab({ ws, onNewCase, onNewCycle, onLoadSamples }) {
  const { data, users, perms, actions, nav, currentProjectId } = ws;
  const { tree, cases, latestMap, suiteById } = data;
  const canEdit = perms.canEdit;
  const folderId = nav.folderId && suiteById.has(nav.folderId) ? nav.folderId : null;

  const [expanded, setExpanded] = useState(() => new Set(tree.roots.map((suite) => suite.id)));
  const [filters, setFilters] = useState(EMPTY_CASE_FILTERS);
  const [sort, setSort] = useState({ by: "order", dir: "asc" });
  const [includeSubfolders, setIncludeSubfolders] = useState(true);
  const [columns, setColumnsState] = useState(loadColumns);
  const [selected, setSelected] = useState(() => new Set());
  const [folderDialog, setFolderDialog] = useState(null); // { parent }
  const [showTree, setShowTree] = useState(false);

  const setColumns = useCallback((next) => {
    setColumnsState(next);
    try { window.localStorage.setItem(COLUMNS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  // Keep the selected folder's ancestors expanded (deep links, new folders).
  useEffect(() => {
    if (!folderId) return;
    const path = getSuitePath(folderId, suiteById);
    setExpanded((prev) => {
      const missing = path.slice(0, -1).filter((suite) => !prev.has(suite.id));
      if (!missing.length) return prev;
      const next = new Set(prev);
      missing.forEach((suite) => next.add(suite.id));
      return next;
    });
  }, [folderId, suiteById]);

  // Expand new roots by default (e.g. after loading samples).
  useEffect(() => {
    setExpanded((prev) => {
      const missing = tree.roots.filter((suite) => !prev.has(suite.id) && !prev.has(`!${suite.id}`));
      if (!missing.length) return prev;
      const next = new Set(prev);
      missing.forEach((suite) => next.add(suite.id));
      return next;
    });
  }, [tree.roots]);

  const visibleExpanded = useMemo(() => new Set([...expanded].filter((id) => !id.startsWith("!"))), [expanded]);

  const toggle = useCallback((id) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) {
      next.delete(id);
      next.add(`!${id}`); // remember explicit collapse
    } else {
      next.add(id);
      next.delete(`!${id}`);
    }
    return next;
  }), []);

  const expandAll = useCallback(() => setExpanded((prev) => {
    if ([...prev].some((id) => !id.startsWith("!"))) return new Set(tree.roots.map((suite) => `!${suite.id}`));
    return new Set(data.suites.map((suite) => suite.id));
  }), [tree.roots, data.suites]);

  const counts = useMemo(() => {
    const direct = new Map();
    cases.forEach((testCase) => direct.set(testCase.suiteId, (direct.get(testCase.suiteId) || 0) + 1));
    const totals = new Map();
    const total = (suite) => {
      if (totals.has(suite.id)) return totals.get(suite.id);
      const sum = (direct.get(suite.id) || 0) + (tree.childrenById.get(suite.id) || []).reduce((acc, child) => acc + total(child), 0);
      totals.set(suite.id, sum);
      return sum;
    };
    data.suites.forEach((suite) => total(suite));
    return totals;
  }, [cases, tree, data.suites]);

  const folderRank = useMemo(() => {
    const all = new Set(data.suites.map((suite) => suite.id));
    return new Map(flattenTree(tree, all).map((row, index) => [row.suite.id, index]));
  }, [tree, data.suites]);

  const folderIds = useMemo(() => {
    if (!folderId) return null;
    return includeSubfolders ? getDescendantIds(folderId, tree.childrenById) : new Set([folderId]);
  }, [folderId, includeSubfolders, tree.childrenById]);

  const scoped = useMemo(() => (folderIds ? cases.filter((testCase) => folderIds.has(testCase.suiteId)) : cases), [cases, folderIds]);
  const facets = useMemo(() => buildFacetCounts(scoped, latestMap), [scoped, latestMap]);
  const visible = useMemo(
    () => sortCases(filterCases(scoped, filters, { latestMap }), sort, { latestMap, folderRank }),
    [scoped, filters, sort, latestMap, folderRank]
  );
  const visibleIds = useMemo(() => visible.map((testCase) => testCase.id), [visible]);

  const pathById = useMemo(() => {
    const map = new Map();
    data.suites.forEach((suite) => {
      const path = getSuitePath(suite.id, suiteById);
      const relative = folderId ? path.slice(path.findIndex((node) => node.id === folderId) + 1) : path;
      map.set(suite.id, relative.map((node) => node.name).join(" › "));
    });
    return map;
  }, [data.suites, suiteById, folderId]);
  const showPath = !folderId || includeSubfolders;

  // Drop selections that are no longer visible.
  useEffect(() => {
    setSelected((prev) => {
      if (!prev.size) return prev;
      const allowed = new Set(visibleIds);
      const next = new Set([...prev].filter((id) => allowed.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleIds]);

  const reportVisibleCases = ws.reportVisibleCases;
  useEffect(() => {
    reportVisibleCases?.(visibleIds);
  }, [visibleIds, reportVisibleCases]);

  const viewState = useMemo(() => ({ filters, sort, folderId, includeSubfolders }), [filters, sort, folderId, includeSubfolders]);
  const saved = useSavedViews("tests", `${currentProjectId || "project"}:repository`, viewState);
  const savedViews = {
    views: saved.views,
    activeViewId: saved.activeViewId,
    onApply: (view) => {
      const state = view.state || {};
      setFilters({ ...EMPTY_CASE_FILTERS, ...(state.filters || {}) });
      setSort(state.sort || { by: "order", dir: "asc" });
      setIncludeSubfolders(state.includeSubfolders !== false);
      nav.setFolder(state.folderId || null);
    },
    onSave: saved.saveCurrentView,
    onDelete: saved.deleteView,
  };

  const toggleSelect = useCallback((id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }), []);
  const selectRange = useCallback((ids) => setSelected(new Set(ids)), []);
  const selectAll = useCallback((checked) => setSelected(checked ? new Set(visibleIds) : new Set()), [visibleIds]);
  const selectedIds = useMemo(() => visibleIds.filter((id) => selected.has(id)), [visibleIds, selected]);
  const openRuns = useMemo(() => data.runs.filter((run) => run.status === "in-progress"), [data.runs]);

  const onSort = useCallback((column) => setSort((prev) => (prev.by === column ? { by: column, dir: prev.dir === "asc" ? "desc" : "asc" } : { by: column, dir: "asc" })), []);
  const handleReorder = useCallback((ids, target) => actions.moveCases(ids, target.suiteId, target.id, { silent: true }), [actions]);
  const handleDropCases = useCallback((ids, suiteId) => {
    actions.moveCases(ids, suiteId);
    setSelected(new Set());
  }, [actions]);

  const selectedFolder = folderId ? suiteById.get(folderId) : null;
  const breadcrumb = selectedFolder ? getSuitePath(folderId, suiteById) : [];

  if (!data.suites.length) {
    return (
      <div className="mx-auto max-w-[1680px] px-4 py-5 md:px-6 xl:px-8">
        <div className={`${CARD} border-dashed`} data-testid="tests-repository-empty">
          <EmptyState icon={FaSitemap} title="Build your test repository" description="Organize test cases in suites and nested folders, reuse shared steps, and link them to requirements — like TestRail or Xray.">
            {canEdit && (
              <>
                <button type="button" onClick={onLoadSamples} className={BTN_PRIMARY} data-testid="tests-load-samples"><FaDatabase className="h-3 w-3" /> Load sample data</button>
                <button type="button" onClick={() => setFolderDialog({ parent: null })} className={BTN_SECONDARY}><FaPlus className="h-3 w-3" /> New suite</button>
              </>
            )}
          </EmptyState>
        </div>
        {folderDialog && (
          <FolderDialog parent={folderDialog.parent} onClose={() => setFolderDialog(null)} onSubmit={(form) => { const record = actions.createFolder(form); setFolderDialog(null); if (record) nav.setFolder(record.id); }} />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-[1680px] flex-col gap-3 px-4 py-4 md:px-6 lg:flex-row xl:px-8" data-testid="tests-repository">
      <div className="lg:hidden">
        <button type="button" onClick={() => setShowTree((value) => !value)} className={`${BTN_SM} w-full justify-between`} aria-expanded={showTree}>
          <span className="inline-flex items-center gap-1.5"><FaStream className="h-3 w-3" /> {selectedFolder ? selectedFolder.name : "All test cases"}</span>
          <span className="text-slate-500">{showTree ? "Hide folders" : "Folders"}</span>
        </button>
      </div>
      <aside className={`${CARD} ${showTree ? "block" : "hidden"} max-h-[50vh] flex-shrink-0 overflow-hidden lg:block lg:max-h-none lg:w-64 xl:w-72`}>
        <SuiteTree
          tree={tree}
          counts={counts}
          totalCount={cases.length}
          selectedId={folderId}
          expanded={visibleExpanded}
          onToggle={toggle}
          onExpandAll={expandAll}
          onSelect={(id) => { nav.setFolder(id); setShowTree(false); }}
          canEdit={canEdit}
          onCreateFolder={(parentId) => setFolderDialog({ parent: parentId ? suiteById.get(parentId) : null })}
          onRename={actions.renameFolder}
          onDelete={actions.deleteFolder}
          onMoveFolder={actions.moveFolder}
          onDropCases={handleDropCases}
        />
      </aside>

      <section className={`${CARD} flex min-h-[420px] min-w-0 flex-1 flex-col overflow-hidden`} aria-label="Test cases">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 px-3 py-2.5 dark:border-[#252b3b]">
          <div className="min-w-0">
            <nav aria-label="Folder path" className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
              <button type="button" onClick={() => nav.setFolder(null)} className={`font-semibold ${selectedFolder ? "text-slate-500 hover:text-slate-900 dark:hover:text-white" : "text-slate-900"}`}>All cases</button>
              {breadcrumb.map((suite, index) => (
                <React.Fragment key={suite.id}>
                  <span className="text-slate-400" aria-hidden="true">/</span>
                  <button type="button" onClick={() => nav.setFolder(suite.id)} className={`truncate font-semibold ${index === breadcrumb.length - 1 ? "text-slate-900" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}>{suite.name}</button>
                </React.Fragment>
              ))}
            </nav>
            {selectedFolder?.description && <p className="mt-0.5 truncate text-xs text-slate-500">{selectedFolder.description}</p>}
          </div>
          {canEdit && (
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setFolderDialog({ parent: selectedFolder })} className={BTN_SM} data-testid="tests-new-folder">
                <FaFolderPlus className="h-3 w-3" /> {selectedFolder ? "Sub-folder" : "Suite"}
              </button>
              <button type="button" onClick={() => onNewCase({ suiteId: folderId || undefined })} className={BTN_SM_PRIMARY} data-testid="tests-new-case-here">
                <FaPlus className="h-2.5 w-2.5" /> Case
              </button>
            </div>
          )}
        </div>
        <CaseToolbar
          filters={filters}
          onFiltersChange={setFilters}
          facets={facets}
          users={users}
          sort={sort}
          onSortChange={setSort}
          columns={columns}
          onColumnsChange={setColumns}
          includeSubfolders={includeSubfolders}
          onIncludeSubfoldersChange={setIncludeSubfolders}
          savedViews={savedViews}
          resultCount={visible.length}
          totalCount={scoped.length}
        />
        {selectedIds.length > 0 && (
          <BulkActionBar
            count={selectedIds.length}
            tree={tree}
            users={users}
            openRuns={openRuns}
            canEdit={canEdit}
            onMove={(suiteId) => { actions.moveCases(selectedIds, suiteId); setSelected(new Set()); }}
            onPatch={(patch, label) => actions.bulkUpdate(selectedIds, patch, label)}
            onAddToCycle={(run) => actions.addCasesToCycle(selectedIds, run)}
            onNewCycle={() => onNewCycle({ caseIds: selectedIds })}
            onClone={() => { actions.cloneCases(selectedIds); setSelected(new Set()); }}
            onDelete={() => actions.deleteCases(selectedIds, { onDone: () => setSelected(new Set()) })}
            onExport={() => actions.exportCsv(visible.filter((testCase) => selected.has(testCase.id)))}
            onClear={() => setSelected(new Set())}
          />
        )}
        {visible.length === 0 ? (
          <EmptyState
            title={scoped.length ? "No cases match these filters" : "This folder is empty"}
            description={scoped.length ? "Clear filters or search for something else." : "Create a test case here or drag cases onto this folder."}
          >
            {scoped.length > 0 && <button type="button" onClick={() => setFilters(EMPTY_CASE_FILTERS)} className={BTN_SECONDARY}>Clear filters</button>}
            {!scoped.length && canEdit && <button type="button" onClick={() => onNewCase({ suiteId: folderId || undefined })} className={BTN_PRIMARY}><FaPlus className="h-3 w-3" /> New test case</button>}
          </EmptyState>
        ) : (
          <CaseTable
            cases={visible}
            columns={columns}
            users={users}
            latestMap={latestMap}
            pathById={pathById}
            showPath={showPath}
            selectedIds={selected}
            onToggleSelect={toggleSelect}
            onSelectRange={selectRange}
            onSelectAll={selectAll}
            onOpen={nav.openCase}
            openId={nav.caseId}
            sort={sort}
            onSort={onSort}
            canEdit={canEdit}
            canReorder={canEdit && sort.by === "order"}
            onReorder={handleReorder}
          />
        )}
        <div className="hidden flex-shrink-0 items-center gap-3 border-t border-slate-200/70 px-3 py-1.5 text-[11px] text-slate-500 dark:border-[#252b3b] md:flex">
          <span><b>↑↓</b> navigate</span><span><b>Enter</b> open</span><span><b>Space</b> select</span><span><b>Shift+↑↓</b> extend</span>
          {canEdit && <span>Drag rows onto a folder to move · drag within “Manual order” to reorder</span>}
        </div>
      </section>

      {folderDialog && (
        <FolderDialog
          parent={folderDialog.parent}
          onClose={() => setFolderDialog(null)}
          onSubmit={(form) => {
            const record = actions.createFolder(form);
            setFolderDialog(null);
            if (record) {
              if (form.parentId) setExpanded((prev) => new Set([...prev, form.parentId]));
              nav.setFolder(record.id);
            }
          }}
        />
      )}
    </div>
  );
}

export default memo(RepositoryTab);
