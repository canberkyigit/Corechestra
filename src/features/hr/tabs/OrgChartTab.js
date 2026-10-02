import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { FaChevronDown, FaDownload, FaExternalLinkAlt, FaSearch, FaSitemap, FaTimes } from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { useHR } from "../../../shared/context/HRContext";
import { useToast } from "../../../shared/context/ToastContext";
import { Avatar } from "../components/HRSharedUI";
import { PersonProfileModal } from "../components/PersonProfileModal";
import {
  ORG_NODE_H,
  ORG_NODE_W,
  buildOrgCsvRows,
  buildOrgLayout,
  buildTreeFromUsers,
  filterUsersForView,
  findNodeByKey,
  findParentByKey,
  renderOrgChartPng,
} from "../utils/orgChart";
import { downloadBlob, downloadTextFile, toCsv } from "../utils/download";
import { toLocalIsoDate } from "../utils/dates";

const VIEW_OPTIONS = [
  { id: "all", label: "Entire organization" },
  { id: "mine", label: "My manager and reports" },
  { id: "focus", label: "Selected person's team" },
];

function useOutsideClose(ref, open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onClose();
    };
    const keyHandler = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handler);
    window.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("keydown", keyHandler);
    };
  }, [onClose, open, ref]);
}

export function OrgChartTab({ users, currentUserId }) {
  const { darkMode, projects } = useApp();
  const { projectAllocations, allAbsences } = useHR();
  const { addToast } = useToast();
  const canvasRef = useRef(null);
  const viewMenuRef = useRef(null);
  const downloadMenuRef = useRef(null);
  const [zoom, setZoom] = useState(0.55);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [drag, setDrag] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [search, setSearch] = useState("");
  const [fitted, setFitted] = useState(false);
  const [viewMode, setViewMode] = useState("all");
  const [focusUserId, setFocusUserId] = useState(null);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [profilePerson, setProfilePerson] = useState(null);

  useOutsideClose(viewMenuRef, viewMenuOpen, () => setViewMenuOpen(false));
  useOutsideClose(downloadMenuRef, downloadMenuOpen, () => setDownloadMenuOpen(false));

  const visibleUsers = useMemo(
    () => filterUsersForView(users, viewMode, { currentUserId, focusUserId }),
    [currentUserId, focusUserId, users, viewMode],
  );
  const fullTree = useMemo(() => buildTreeFromUsers(users, currentUserId), [users, currentUserId]);
  const tree = useMemo(
    () => buildTreeFromUsers(visibleUsers, currentUserId, { allowFlat: viewMode !== "all" }),
    [visibleUsers, currentUserId, viewMode],
  );
  const layout = useMemo(() => (tree ? buildOrgLayout(tree) : null), [tree]);
  const { nodes, edges, bounds } = layout || { nodes: [], edges: [], bounds: { width: 0, height: 0, ox: 0, oy: 0 } };
  const selected = useMemo(() => (selectedKey ? nodes.find((node) => node.key === selectedKey) || null : null), [nodes, selectedKey]);
  const hasMe = (users || []).some((user) => user.id === currentUserId);

  // Re-fit whenever the visible tree changes (view mode, people added/removed).
  const treeSignature = nodes.map((node) => node.key).join("|");
  useEffect(() => { setFitted(false); }, [treeSignature]);

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return undefined;

    const onWheel = (event) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      const factor = event.deltaY < 0 ? 1.13 : 1 / 1.13;
      setZoom((previousZoom) => {
        const nextZoom = Math.max(0.12, Math.min(3, previousZoom * factor));
        setPan((previousPan) => ({
          x: mouseX - (mouseX - previousPan.x) * (nextZoom / previousZoom),
          y: mouseY - (mouseY - previousPan.y) * (nextZoom / previousZoom),
        }));
        return nextZoom;
      });
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    if (fitted) return undefined;
    const element = canvasRef.current;
    if (!element) return undefined;

    const timer = setTimeout(() => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !bounds.width) return;
      const pad = 64;
      const nextZoom = Math.min((rect.width - pad * 2) / bounds.width, (rect.height - pad * 2) / bounds.height, 1);
      setZoom(nextZoom);
      setPan({ x: (rect.width - bounds.width * nextZoom) / 2, y: pad });
      setFitted(true);
    }, 80);

    return () => clearTimeout(timer);
  }, [bounds, fitted]);

  const onMouseDown = useCallback((event) => {
    if (event.button !== 0 || event.target.closest("[data-node]")) return;
    setDrag({ ox: event.clientX - pan.x, oy: event.clientY - pan.y });
  }, [pan]);

  const onMouseMove = useCallback((event) => {
    if (!drag) return;
    setPan({ x: event.clientX - drag.ox, y: event.clientY - drag.oy });
  }, [drag]);

  const onMouseUp = useCallback(() => setDrag(null), []);

  const fitScreen = useCallback(() => {
    const element = canvasRef.current;
    if (!element || !bounds.width) return;
    const rect = element.getBoundingClientRect();
    const pad = 64;
    const nextZoom = Math.min((rect.width - pad * 2) / bounds.width, (rect.height - pad * 2) / bounds.height, 1);
    setZoom(nextZoom);
    setPan({ x: (rect.width - bounds.width * nextZoom) / 2, y: pad });
  }, [bounds]);

  const goToMe = useCallback(() => {
    const element = canvasRef.current;
    if (!element) return;
    const currentUserNode = nodes.find((node) => node.isMe);
    if (!currentUserNode) return;
    const rect = element.getBoundingClientRect();
    const nextZoom = 1.1;
    setZoom(nextZoom);
    setPan({ x: rect.width / 2 - currentUserNode.cx * nextZoom, y: rect.height / 2 - (currentUserNode.y + ORG_NODE_H / 2) * nextZoom });
  }, [nodes]);

  const matches = useMemo(() => {
    if (!search.trim()) return null;
    const query = search.toLowerCase();
    return new Set(
      nodes
        .filter((node) => node.name.toLowerCase().includes(query) || String(node.role || "").toLowerCase().includes(query))
        .map((node) => node.key),
    );
  }, [search, nodes]);

  const highlightedEdgeIndexes = useMemo(() => {
    if (!selectedKey) return new Set();
    const edgeIndexes = new Set();
    edges.forEach((edge, index) => {
      if (edge.fromKey === selectedKey || edge.toKey === selectedKey) edgeIndexes.add(index);
    });
    return edgeIndexes;
  }, [selectedKey, edges]);

  const relatedKeys = useMemo(() => {
    if (!selectedKey) return new Set();
    const keys = new Set();
    edges.forEach((edge) => {
      if (edge.fromKey === selectedKey) keys.add(edge.toKey);
      if (edge.toKey === selectedKey) keys.add(edge.fromKey);
    });
    return keys;
  }, [selectedKey, edges]);

  const selectNode = (node) => setSelectedKey(node ? node.key : null);

  const changeView = (mode) => {
    if (mode === "focus") {
      if (!selected?._userId) {
        addToast("Select a person on the chart first", "info");
        return;
      }
      setFocusUserId(selected._userId);
    }
    if (mode === "mine" && !hasMe) {
      addToast("You are not linked to a People record yet", "info");
      return;
    }
    setViewMode(mode);
    setViewMenuOpen(false);
  };

  const exportCsv = () => {
    downloadTextFile(`org-chart-${toLocalIsoDate()}.csv`, toCsv(buildOrgCsvRows(visibleUsers)), "text/csv;charset=utf-8");
    setDownloadMenuOpen(false);
  };

  const exportPng = async () => {
    setDownloadMenuOpen(false);
    const blob = await renderOrgChartPng(layout, { dark: !!darkMode });
    if (!blob) {
      addToast("Image export is not supported in this browser — exported CSV instead", "info");
      exportCsv();
      return;
    }
    downloadBlob(`org-chart-${toLocalIsoDate()}.png`, blob);
  };

  const openFullProfile = () => {
    const person = (users || []).find((user) => user.id === selected?._userId);
    if (person) setProfilePerson(person);
  };

  const dotColor = darkMode ? "%231e293b" : "%23e2e8f0";
  const edgeColor = darkMode ? "#2a3044" : "#cbd5e1";

  if (!fullTree) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <FaSitemap className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">No org chart configured</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          Ask an admin to set manager relationships in the People tab to build the org chart hierarchy.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 230px)", minHeight: 520 }}>
      <PersonProfileModal
        person={profilePerson}
        users={users}
        projects={projects}
        projectAllocations={projectAllocations}
        absences={allAbsences}
        onClose={() => setProfilePerson(null)}
        onSelectPerson={setProfilePerson}
      />
      <div className="flex items-center gap-2 mb-3 flex-wrap flex-shrink-0">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name"
            className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 w-44"
          />
        </div>
        <div className="relative" ref={viewMenuRef}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={viewMenuOpen}
            onClick={() => setViewMenuOpen((value) => !value)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg bg-white dark:bg-[#1c2030] hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors"
          >
            {VIEW_OPTIONS.find((option) => option.id === viewMode)?.label} <FaChevronDown className="w-2.5 h-2.5" />
          </button>
          {viewMenuOpen && (
            <div role="menu" className="absolute left-0 top-full mt-1 z-30 w-56 py-1 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1a1f2e] shadow-xl">
              {VIEW_OPTIONS.map((option) => {
                const disabled = (option.id === "focus" && !selected?._userId) || (option.id === "mine" && !hasMe);
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={viewMode === option.id}
                    disabled={disabled}
                    onClick={() => changeView(option.id)}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${viewMode === option.id ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20" : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#232838]"}`}
                  >
                    {option.label}
                    {option.id === "focus" && selected && !disabled && <span className="block text-[10px] text-slate-400">{selected.name}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <button onClick={goToMe} disabled={!nodes.some((node) => node.isMe)} className="disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-[#1c2030] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
          👤 Find me
        </button>

        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setZoom((value) => Math.max(0.12, parseFloat((value - 0.1).toFixed(2))))} className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#232838] text-lg leading-none select-none">−</button>
          <span className="text-xs text-slate-500 dark:text-slate-400 w-10 text-center select-none tabular-nums">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((value) => Math.min(3, parseFloat((value + 0.1).toFixed(2))))} className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#232838] text-lg leading-none select-none">+</button>
          <button onClick={fitScreen} title="Fit to screen" className="w-7 h-7 ml-1 flex items-center justify-center rounded border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
          <div className="relative" ref={downloadMenuRef}>
            <button
              type="button"
              title="Download"
              aria-label="Download org chart"
              aria-haspopup="menu"
              aria-expanded={downloadMenuOpen}
              onClick={() => setDownloadMenuOpen((value) => !value)}
              className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors"
            >
              <FaDownload className="w-3 h-3" />
            </button>
            {downloadMenuOpen && (
              <div role="menu" className="absolute right-0 top-full mt-1 z-30 w-44 py-1 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1a1f2e] shadow-xl">
                <button type="button" role="menuitem" onClick={exportPng} className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#232838]">PNG image</button>
                <button type="button" role="menuitem" onClick={exportCsv} className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#232838]">CSV (people & managers)</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        <div
          ref={canvasRef}
          className="flex-1 rounded-xl border border-slate-200 dark:border-[#2a3044] overflow-hidden relative"
          style={{
            cursor: drag ? "grabbing" : "grab",
            backgroundColor: darkMode ? "#0d1117" : "#f8fafc",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22'%3E%3Ccircle cx='1' cy='1' r='1' fill='${dotColor}'/%3E%3C/svg%3E")`,
            backgroundSize: `${22 * zoom}px ${22 * zoom}px`,
            backgroundPosition: `${pan.x % (22 * zoom)}px ${pan.y % (22 * zoom)}px`,
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <div
            style={{
              transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              position: "absolute",
              top: 0,
              left: 0,
              width: bounds.width + 200,
              height: bounds.height + 200,
            }}
          >
            <svg
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: bounds.width + 200,
                height: bounds.height + 200,
                overflow: "visible",
                pointerEvents: "none",
              }}
            >
              {edges.map((edge, index) => {
                const midY = (edge.y1 + edge.y2) / 2;
                const highlighted = highlightedEdgeIndexes.has(index);
                return (
                  <path
                    key={`${edge.fromKey}-${edge.toKey}`}
                    d={`M ${edge.x1} ${edge.y1} C ${edge.x1} ${midY}, ${edge.x2} ${midY}, ${edge.x2} ${edge.y2}`}
                    strokeWidth={highlighted ? 2.5 : 1.5}
                    stroke={highlighted ? "#3b82f6" : edgeColor}
                    fill="none"
                    strokeOpacity={matches && !matches.has(edge.fromKey) ? 0.2 : (highlighted ? 1 : 0.8)}
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>

            {nodes.map((node) => {
              const isSelected = selectedKey === node.key;
              const isHit = matches?.has(node.key);
              const isDim = !!matches && !isHit;
              const isRelated = !isSelected && relatedKeys.has(node.key);

              return (
                <div
                  key={node.key}
                  data-node="1"
                  data-testid={`org-node-${node.key}`}
                  onClick={() => selectNode(isSelected ? null : node)}
                  style={{
                    position: "absolute",
                    left: node.x,
                    top: node.y,
                    width: ORG_NODE_W,
                    minHeight: ORG_NODE_H,
                    opacity: isDim ? 0.25 : 1,
                    transition: "opacity 0.15s, box-shadow 0.15s",
                    willChange: "transform",
                  }}
                  className={`rounded-2xl border-2 cursor-pointer select-none ${
                    isSelected
                      ? "border-blue-500 shadow-2xl shadow-blue-500/30 bg-blue-50 dark:bg-[#1a2744]"
                      : isHit
                      ? "border-amber-400 shadow-xl shadow-amber-400/25 bg-amber-50/80 dark:bg-[#1f1a08]"
                      : isRelated
                      ? "border-blue-400/50 shadow-lg bg-white dark:bg-[#1c2030]"
                      : node.isMe
                      ? "border-emerald-500 shadow-lg shadow-emerald-500/20 bg-white dark:bg-[#1c2030]"
                      : "border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] hover:border-blue-400/60 hover:shadow-md dark:hover:border-blue-500/50"
                  }`}
                >
                  <div className="px-3 pt-3 pb-2.5 flex flex-col items-center gap-1.5">
                    <div className="relative">
                      <Avatar name={node.name} color={node.color} size="sm" />
                      {node.isMe && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#1c2030]" />
                      )}
                    </div>
                    <div className="text-center w-full">
                      <p className={`text-[11px] font-semibold leading-tight truncate ${
                        node.isMe ? "text-emerald-600 dark:text-emerald-400" :
                        isSelected ? "text-blue-600 dark:text-blue-300" :
                        "text-slate-800 dark:text-slate-100"
                      }`}>
                        {node.name}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5 line-clamp-2 px-1">{node.role}</p>
                    </div>
                    {node.reports > 0 && (
                      <span className={`text-[9px] font-medium border rounded-full px-1.5 py-0.5 ${
                        isSelected
                          ? "border-blue-300 text-blue-500 dark:border-blue-700 dark:text-blue-400"
                          : "border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400"
                      }`}>
                        ▼ {node.reports}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="text-[10px] text-slate-400 dark:text-slate-600 select-none bg-white/70 dark:bg-black/30 px-2 py-1 rounded-full backdrop-blur-sm">
              Scroll to zoom · Drag to pan · Click node to inspect
            </span>
          </div>
        </div>

        {selected && (
          <div className="w-64 flex-shrink-0 rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] overflow-y-auto flex flex-col">
            <div className="p-4 flex-1">
              <div className="flex items-start gap-2.5 mb-4">
                <Avatar name={selected.name} color={selected.color} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">{selected.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{selected.role}</p>
                  {selected.isMe && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Your position
                    </span>
                  )}
                </div>
                <button onClick={() => selectNode(null)} aria-label="Close details" className="flex-shrink-0 p-1 -mt-0.5 -mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded">
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              </div>

              {selected._userId && (
                <button type="button" onClick={openFullProfile} className="w-full mb-4 py-2 text-xs font-medium text-blue-500 border border-blue-300 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-1.5">
                  View full profile <FaExternalLinkAlt className="w-2.5 h-2.5" />
                </button>
              )}
              {selected.inCycle && (
                <p className="mb-4 text-[11px] text-amber-600 dark:text-amber-400">Manager relationships for this person form a loop. Fix it in the People tab.</p>
              )}

              <div className="space-y-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500 mb-1.5">Department</p>
                  <span className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#232838] text-slate-700 dark:text-slate-300">{selected.dept || "Not set"}</span>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500 mb-1.5">Direct Reports</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {selected.reports}
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">report{selected.reports !== 1 ? "s" : ""}</span>
                  </p>
                </div>

                {(() => {
                  const manager = findParentByKey(tree, selected.key);
                  if (!manager) return null;
                  return (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500 mb-1.5">Reports To</p>
                      <button onClick={() => setSelectedKey(manager.key)} className="flex items-center gap-2.5 w-full p-2 rounded-lg bg-slate-50 dark:bg-[#232838] hover:bg-slate-100 dark:hover:bg-[#2a3044] transition-colors text-left group">
                        <Avatar name={manager.name} color={manager.color} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-blue-500 dark:text-blue-400 group-hover:underline truncate">{manager.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{manager.role}</p>
                        </div>
                      </button>
                    </div>
                  );
                })()}

                {(() => {
                  const current = findNodeByKey(tree, selected.key);
                  const children = current?.children ?? [];
                  if (!children.length) return null;
                  return (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500 mb-1.5">Direct Reports ({children.length})</p>
                      <div className="space-y-1">
                        {children.map((child) => (
                          <button key={child.key} onClick={() => setSelectedKey(child.key)} className="flex items-center gap-2 w-full p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors text-left group">
                            <Avatar name={child.name} color={child.color} size="sm" />
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200 group-hover:text-blue-500 truncate">{child.name}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{child.role}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
