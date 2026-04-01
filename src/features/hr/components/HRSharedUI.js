import React from "react";

export function Avatar({ name, color, size = "md" }) {
  const sizeClass = { sm: "w-7 h-7 text-[10px]", md: "w-9 h-9 text-sm", lg: "w-12 h-12 text-base" }[size];
  const initials = name.split(" ").map((word) => word[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div
      className={`${sizeClass} rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-white`}
      style={{ backgroundColor: color || "#6366f1" }}
    >
      {initials}
    </div>
  );
}

export function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function Badge({ children, color = "blue" }) {
  const styles = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[color]}`}>
      {children}
    </span>
  );
}

export function InfoRow({ label, value, valueClass = "" }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-slate-100 dark:border-[#2a3044] last:border-0">
      <span className="text-sm text-slate-500 dark:text-slate-400 flex-shrink-0 mr-4">{label}</span>
      <span className={`text-sm text-slate-700 dark:text-slate-200 text-right ${valueClass}`}>{value}</span>
    </div>
  );
}
