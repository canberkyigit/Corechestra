import React, { memo, useState } from "react";
import { FaChevronDown, FaChevronRight } from "react-icons/fa";
import { Avatar } from "../../dashboard/components/DashboardPrimitives";
import { HEALTH_META } from "../utils/goalModel";
import { LevelBadge, goalScopeLabel } from "./GoalCard";
import { HealthPill } from "./StrategyPrimitives";

function TreeNode({ node, depth, ctx, isLast }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  const health = HEALTH_META[node.healthKey] || HEALTH_META["no-data"];
  return (
    <li className="relative">
      {depth > 0 && (
        <>
          <span className={`absolute -left-4 top-0 w-px bg-slate-200 dark:bg-[#2a3044] ${isLast ? "h-6" : "h-full"}`} aria-hidden="true" />
          <span className="absolute -left-4 top-6 h-px w-4 bg-slate-200 dark:bg-[#2a3044]" aria-hidden="true" />
        </>
      )}
      <div className="group flex items-center gap-2 py-1">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          disabled={!hasChildren}
          aria-label={open ? "Collapse" : "Expand"}
          aria-expanded={hasChildren ? open : undefined}
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:invisible dark:hover:bg-[#232838] dark:hover:text-slate-200"
        >
          {open ? <FaChevronDown className="h-2.5 w-2.5" /> : <FaChevronRight className="h-2.5 w-2.5" />}
        </button>
        <button
          type="button"
          onClick={() => ctx.onOpen(node.id)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:border-[#252b3b] dark:bg-[#1a1f2e] dark:hover:border-[#3a4054]"
        >
          <span className="h-8 w-1 flex-shrink-0 rounded-full" style={{ backgroundColor: health.hex }} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <LevelBadge level={node.level} />
              <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">{goalScopeLabel(node, ctx)}</span>
            </span>
            <span className="mt-0.5 block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{node.title}</span>
          </span>
          <span className="hidden w-40 flex-shrink-0 items-center gap-2 md:flex">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-[#232838]">
              <span className="block h-full rounded-full" style={{ width: `${node.progress}%`, backgroundColor: health.hex }} />
            </span>
            <span className="w-9 text-right text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">{node.progress}%</span>
          </span>
          <span className="hidden sm:inline-flex"><HealthPill health={node.healthKey} /></span>
          {node.ownerId && <span title={ctx.ownerName(node.ownerId)}><Avatar name={ctx.ownerName(node.ownerId)} size={22} /></span>}
        </button>
      </div>
      {hasChildren && open && (
        <ul className="ml-[2.6rem] pl-4">
          {node.children.map((child, index) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} ctx={ctx} isLast={index === node.children.length - 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Company → team → project alignment tree. */
function GoalTree({ tree, teams, projects, ownerName, onOpen }) {
  const ctx = { teams, projects, ownerName, onOpen };
  return (
    <ul className="space-y-1" data-testid="goal-tree">
      {tree.map((node, index) => (
        <TreeNode key={node.id} node={node} depth={0} ctx={ctx} isLast={index === tree.length - 1} />
      ))}
    </ul>
  );
}

export default memo(GoalTree);
