import React, { memo, useEffect, useRef, useState } from "react";
import { FaEdit, FaEllipsisH, FaTrash } from "react-icons/fa";

// Memoized: `onSelect(spaceId)`, `onEdit(space)`, `onDelete(space)` must be stable.
const SpaceRow = memo(function SpaceRow({ space, isSelected, onSelect, onEdit, onDelete, readOnly = false }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!showMenu) return;
    const onMouseDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowMenu(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [showMenu]);

  return (
    <div
      className={`group w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
        isSelected
          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200/70 dark:border-blue-500/20 shadow-sm"
          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent"
      }`}
    >
      <button
        onClick={() => onSelect(space.id)}
        onDoubleClick={readOnly ? undefined : () => onEdit(space)}
        className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
        title={space.description || space.name}
      >
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: space.color }}
        />
        <span className="truncate">{space.icon} {space.name}</span>
      </button>
      {!readOnly && (
      <div className="relative flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" ref={menuRef}>
        <button
          onClick={(event) => {
            event.stopPropagation();
            setShowMenu((value) => !value);
          }}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
          title="Space actions"
        >
          <FaEllipsisH className="w-2.5 h-2.5" />
        </button>
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-lg shadow-lg z-50 overflow-hidden">
            <button
              onClick={() => {
                setShowMenu(false);
                onEdit(space);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <FaEdit className="w-3 h-3" /> Edit space
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                onDelete(space);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
            >
              <FaTrash className="w-3 h-3" /> Delete space
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  );
});

export default SpaceRow;
