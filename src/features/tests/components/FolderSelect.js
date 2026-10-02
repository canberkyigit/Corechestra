import React, { useMemo } from "react";
import { flattenTree } from "../utils/testingTree";

/** All folders depth-first with indentation (for selects). */
export function folderOptions(tree) {
  const all = new Set();
  const collect = (nodes) => nodes.forEach((node) => {
    all.add(node.id);
    collect(tree.childrenById.get(node.id) || []);
  });
  collect(tree.roots);
  return flattenTree(tree, all).map(({ suite, depth }) => ({
    value: suite.id,
    label: `${"   ".repeat(depth)}${depth ? "└ " : ""}${suite.name}`,
    depth,
  }));
}

/** Native select of suites/folders (accessible, works on mobile). */
export default function FolderSelect({ tree, value, onChange, id, className, placeholder, allowEmpty = false, ariaLabel, testId }) {
  const options = useMemo(() => folderOptions(tree), [tree]);
  return (
    <select id={id} value={value || ""} onChange={(event) => onChange(event.target.value || null)} className={className} aria-label={ariaLabel} data-testid={testId}>
      {(allowEmpty || !value) && <option value="">{placeholder || "Select a folder"}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}
