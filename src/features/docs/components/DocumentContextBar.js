import React from "react";

/** Owner / freshness / hierarchy summary shown above the selected page. */
export default function DocumentContextBar({ page, space, owner, childCount }) {
  return (
    <div className="px-6 pt-5">
      <div className="app-surface px-5 py-4">
        <div className="app-kicker mb-3">Document Context</div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="app-meta-pill">
          Owner: {owner?.name || page?.owner || "Unassigned"}
          </span>
          <span className="app-meta-pill">
          Space owner: {space?.owner || "Unassigned"}
          </span>
          {page?.updatedAt && (
            <span className="app-meta-pill">
              Updated {new Date(page.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            </span>
          )}
          <span className="app-meta-pill">
            {childCount} child page{childCount !== 1 ? "s" : ""}
          </span>
          <span className="app-meta-pill">
            {(page?.comments || []).length} comment{(page?.comments || []).length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
