import {
  FaBook,
  FaCheckSquare,
  FaClipboardCheck,
  FaCodeBranch,
  FaFlask,
  FaRocket,
  FaTag,
} from "react-icons/fa";

export const ENTITY_TYPE_META = {
  task: {
    label: "Task",
    icon: FaCheckSquare,
    color: "text-blue-500",
    badgeClass: "app-badge app-badge--blue",
  },
  doc: {
    label: "Doc",
    icon: FaBook,
    color: "text-emerald-500",
    badgeClass: "app-badge app-badge--green",
  },
  release: {
    label: "Release",
    icon: FaRocket,
    color: "text-violet-500",
    badgeClass: "app-badge app-badge--purple",
  },
  "test-suite": {
    label: "Suite",
    icon: FaFlask,
    color: "text-amber-500",
    badgeClass: "app-badge app-badge--amber",
  },
  "test-case": {
    label: "Test Case",
    icon: FaClipboardCheck,
    color: "text-orange-500",
    badgeClass: "app-badge app-badge--orange",
  },
  "test-run": {
    label: "Test Run",
    icon: FaCodeBranch,
    color: "text-cyan-500",
    badgeClass: "app-badge app-badge--cyan",
  },
  label: {
    label: "Label",
    icon: FaTag,
    color: "text-slate-500",
    badgeClass: "app-badge app-badge--neutral",
  },
};

export function getEntityTypeMeta(type) {
  return ENTITY_TYPE_META[type] || ENTITY_TYPE_META.label;
}
