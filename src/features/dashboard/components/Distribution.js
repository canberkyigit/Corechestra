import React, { memo, useState } from "react";
import { percent } from "../utils/dashboardMetrics";

/**
 * Part-to-whole: one stacked bar (2px surface gaps between segments) and a
 * legend table that carries the exact numbers. Rows drill into the tasks.
 */
function Distribution({ items, total, onSelect, emptyLabel = "No work items in this sprint", testId }) {
  const [hover, setHover] = useState(null);
  const visible = items.filter((item) => item.count > 0);

  return (
    <div data-testid={testId}>
      <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-slate-100 dark:bg-[#232838]" aria-hidden="true">
        {visible.map((item) => (
          <div
            key={item.key}
            className="h-full transition-opacity first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(item.count / Math.max(total, 1)) * 100}%`,
              backgroundColor: item.hex,
              opacity: hover === null || hover === item.key ? 1 : 0.35,
            }}
          />
        ))}
      </div>

      {total === 0 ? (
        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 space-y-0.5">
          {items.map((item) => {
            const Row = onSelect && item.count > 0 ? "button" : "div";
            return (
              <li key={item.key}>
                <Row
                  type={Row === "button" ? "button" : undefined}
                  onClick={Row === "button" ? () => onSelect(item) : undefined}
                  onMouseEnter={() => setHover(item.key)}
                  onMouseLeave={() => setHover(null)}
                  aria-label={Row === "button" ? `${item.label}: ${item.count}` : undefined}
                  className={`flex w-full items-center gap-2.5 rounded-md px-1.5 py-1 text-left text-[13px] ${
                    Row === "button" ? "hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:hover:bg-[#232838]" : ""
                  }`}
                >
                  <span className="h-2 w-2 flex-shrink-0 rounded-sm" style={{ backgroundColor: item.hex }} aria-hidden="true" />
                  <span className={`flex-1 truncate ${item.count ? "text-slate-700 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"}`}>{item.label}</span>
                  <span className="w-8 text-right font-medium tabular-nums text-slate-800 dark:text-slate-100">{item.count}</span>
                  <span className="w-10 text-right text-xs tabular-nums text-slate-400 dark:text-slate-500">{percent(item.count, total)}%</span>
                </Row>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default memo(Distribution);
