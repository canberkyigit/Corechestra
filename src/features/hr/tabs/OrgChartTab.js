import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { FaChevronDown, FaDownload, FaExternalLinkAlt, FaSearch, FaSitemap, FaTimes } from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { Avatar } from "../components/HRSharedUI";

const ORG_NODE_W = 164;
const ORG_NODE_H = 94;
const ORG_H_GAP = 52;
const ORG_V_GAP = 80;

function buildTreeFromUsers(users, currentUserId) {
  if (!users || users.length === 0) return null;
  const userMap = {};
  users.forEach((user) => { userMap[user.id] = user; });
  const hasAnyHierarchy = users.some((user) => user.managerId && userMap[user.managerId]);
  if (!hasAnyHierarchy) return null;

  function buildNode(user) {
    const children = users.filter((candidate) => candidate.managerId === user.id);
    return {
      name: user.name || user.email?.split("@")[0] || "Unknown",
      role: user.role || user.title || "Team Member",
      dept: user.department || "",
      color: user.color || "#6366f1",
      reports: children.length,
      isMe: user.id === currentUserId,
      _userId: user.id,
      children: children.map(buildNode),
    };
  }

  const roots = users.filter((user) => !user.managerId || !userMap[user.managerId]);
  if (roots.length === 1) {
    return buildNode(roots[0]);
  }

  return {
    name: "Organization",
    role: "",
    dept: "",
    color: "#6366f1",
    reports: roots.length,
    isMe: false,
    _userId: null,
    children: roots.map(buildNode),
  };
}

function buildOrgLayout(root) {
  function clone(node) {
    return { ...node, children: (node.children ?? []).map(clone) };
  }

  const tree = clone(root);

  function measure(node) {
    if (!node.children.length) {
      node._sw = ORG_NODE_W;
      return;
    }

    node.children.forEach(measure);
    const totalWidth = node.children.reduce((sum, child) => sum + child._sw, 0) + ORG_H_GAP * (node.children.length - 1);
    node._sw = Math.max(ORG_NODE_W, totalWidth);
  }

  function place(node, centerX, depth) {
    node._cx = centerX;
    node._depth = depth;
    if (!node.children.length) return;

    const totalWidth = node.children.reduce((sum, child) => sum + child._sw, 0) + ORG_H_GAP * (node.children.length - 1);
    let left = centerX - totalWidth / 2;
    for (const child of node.children) {
      place(child, left + child._sw / 2, depth + 1);
      left += child._sw + ORG_H_GAP;
    }
  }

  function flatten(node) {
    const y = node._depth * (ORG_NODE_H + ORG_V_GAP);
    const x = node._cx - ORG_NODE_W / 2;
    const output = { nodes: [{ ...node, x, y, cx: node._cx }], edges: [] };

    for (const child of (node.children ?? [])) {
      const childY = child._depth * (ORG_NODE_H + ORG_V_GAP);
      output.edges.push({ x1: node._cx, y1: y + ORG_NODE_H, x2: child._cx, y2: childY });
      const sub = flatten(child);
      output.nodes.push(...sub.nodes);
      output.edges.push(...sub.edges);
    }

    return output;
  }

  measure(tree);
  place(tree, tree._sw / 2, 0);
  const { nodes, edges } = flatten(tree);
  const xs = nodes.flatMap((node) => [node.x, node.x + ORG_NODE_W]);
  const ys = nodes.flatMap((node) => [node.y, node.y + ORG_NODE_H]);

  return {
    nodes,
    edges,
    bounds: {
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
      ox: Math.min(...xs),
      oy: Math.min(...ys),
    },
  };
}

function findInTree(node, name) {
  if (node.name === name) return node;
  for (const child of (node.children ?? [])) {
    const found = findInTree(child, name);
    if (found) return found;
  }
  return null;
}

function findParent(node, name) {
  for (const child of (node.children ?? [])) {
    if (child.name === name) return node;
    const found = findParent(child, name);
    if (found) return found;
  }
  return null;
}

export function OrgChartTab({ users, currentUserId }) {
  const { darkMode } = useApp();
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(0.55);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [drag, setDrag] = useState(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [fitted, setFitted] = useState(false);

  const tree = useMemo(() => buildTreeFromUsers(users, currentUserId), [users, currentUserId]);
  const layout = useMemo(() => (tree ? buildOrgLayout(tree) : null), [tree]);
  const { nodes, edges, bounds } = layout || { nodes: [], edges: [], bounds: { width: 0, height: 0, ox: 0, oy: 0 } };

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
      if (!rect.width) return;
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
        .filter((node) => node.name.toLowerCase().includes(query) || node.role.toLowerCase().includes(query))
        .map((node) => node.name),
    );
  }, [search, nodes]);

  const highlightedEdgeIndexes = useMemo(() => {
    if (!selected) return new Set();
    const edgeIndexes = new Set();
    edges.forEach((edge, index) => {
      const fromNode = nodes.find((node) => Math.abs(node.cx - edge.x1) < 1);
      const toNode = nodes.find((node) => Math.abs(node.cx - edge.x2) < 1 && Math.abs(node.y - edge.y2) < 1);
      if (fromNode?.name === selected.name || toNode?.name === selected.name) {
        edgeIndexes.add(index);
      }
    });
    return edgeIndexes;
  }, [selected, edges, nodes]);

  const dotColor = darkMode ? "%231e293b" : "%23e2e8f0";
  const edgeColor = darkMode ? "#2a3044" : "#cbd5e1";

  if (!tree) {
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
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg bg-white dark:bg-[#1c2030] hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
          Manager and report <FaChevronDown className="w-2.5 h-2.5" />
        </button>
        <button onClick={goToMe} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-[#1c2030] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
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
          <button title="Download" className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
            <FaDownload className="w-3 h-3" />
          </button>
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
                    key={index}
                    d={`M ${edge.x1} ${edge.y1} C ${edge.x1} ${midY}, ${edge.x2} ${midY}, ${edge.x2} ${edge.y2}`}
                    strokeWidth={highlighted ? 2.5 : 1.5}
                    stroke={highlighted ? "#3b82f6" : edgeColor}
                    fill="none"
                    strokeOpacity={matches && !matches.has(nodes.find((node) => Math.abs(node.cx - edge.x1) < 1)?.name) ? 0.2 : (highlighted ? 1 : 0.8)}
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>

            {nodes.map((node, index) => {
              const isSelected = selected?.name === node.name;
              const isHit = matches?.has(node.name);
              const isDim = !!matches && !isHit;
              const isRelated = !isSelected && selected && (
                edges.some((edge) =>
                  (nodes.find((current) => Math.abs(current.cx - edge.x1) < 1)?.name === selected.name &&
                    nodes.find((current) => Math.abs(current.cx - edge.x2) < 1 && Math.abs(current.y - edge.y2) < 1)?.name === node.name) ||
                  (nodes.find((current) => Math.abs(current.cx - edge.x2) < 1 && Math.abs(current.y - edge.y2) < 1)?.name === selected.name &&
                    nodes.find((current) => Math.abs(current.cx - edge.x1) < 1)?.name === node.name)
                )
              );

              return (
                <div
                  key={index}
                  data-node="1"
                  onClick={() => setSelected(isSelected ? null : node)}
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
                <button onClick={() => setSelected(null)} className="flex-shrink-0 p-1 -mt-0.5 -mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded">
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              </div>

              <button className="w-full mb-4 py-2 text-xs font-medium text-blue-500 border border-blue-300 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-1.5">
                View full profile <FaExternalLinkAlt className="w-2.5 h-2.5" />
              </button>

              <div className="space-y-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500 mb-1.5">Department</p>
                  <span className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#232838] text-slate-700 dark:text-slate-300">{selected.dept}</span>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500 mb-1.5">Direct Reports</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {selected.reports}
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">report{selected.reports !== 1 ? "s" : ""}</span>
                  </p>
                </div>

                {(() => {
                  const manager = findParent(tree, selected.name);
                  if (!manager) return null;
                  return (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500 mb-1.5">Reports To</p>
                      <button onClick={() => setSelected(nodes.find((node) => node.name === manager.name) ?? null)} className="flex items-center gap-2.5 w-full p-2 rounded-lg bg-slate-50 dark:bg-[#232838] hover:bg-slate-100 dark:hover:bg-[#2a3044] transition-colors text-left group">
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
                  const current = findInTree(tree, selected.name);
                  const children = current?.children ?? [];
                  if (!children.length) return null;
                  return (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500 mb-1.5">Direct Reports ({children.length})</p>
                      <div className="space-y-1">
                        {children.map((child, index) => (
                          <button key={index} onClick={() => setSelected(nodes.find((node) => node.name === child.name) ?? null)} className="flex items-center gap-2 w-full p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors text-left group">
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
