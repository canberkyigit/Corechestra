import React from "react";
import {
  FaBug,
  FaExclamationCircle,
  FaUser,
  FaSearch,
  FaCheckSquare,
  FaPlusSquare,
  FaRocket,
  FaFlag,
  FaPlay,
  FaRegDotCircle,
} from "react-icons/fa";

export const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "feature", label: "Feature" },
  { value: "task", label: "Task" },
  { value: "defect", label: "Defect" },
  { value: "test", label: "Test" },
  { value: "testset", label: "Test Set" },
  { value: "testexecution", label: "Test Execution" },
  { value: "precondition", label: "Precondition" },
];


export const COLUMNS_DATA = [
  { id: "todo", title: "To Do" },
  { id: "inprogress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "awaiting", title: "Awaiting Customer" },
  { id: "blocked", title: "Blocked" },
  { id: "done", title: "Done" },
];

export const STATUS_STYLES = {
  done: "bg-green-100 text-green-700 border-green-200",
  inprogress: "bg-blue-100 text-blue-700 border-blue-200",
  review: "bg-yellow-100 text-yellow-700 border-yellow-200",
  blocked: "bg-red-100 text-red-700 border-red-200",
  awaiting: "bg-purple-100 text-purple-700 border-purple-200",
  todo: "bg-gray-100 text-gray-600 border-gray-200",
};

export const TYPE_MAP = {
  bug: { label: "Bug", color: "bg-red-100 text-red-700", icon: React.createElement(FaBug) },
  defect: { label: "Defect", color: "bg-orange-100 text-orange-700", icon: React.createElement(FaExclamationCircle) },
  userstory: { label: "User Story", color: "bg-blue-100 text-blue-700", icon: React.createElement(FaUser) },
  investigation: { label: "Investigation", color: "bg-purple-100 text-purple-700", icon: React.createElement(FaSearch) },
  task: { label: "Task", color: "bg-green-100 text-green-700", icon: React.createElement(FaCheckSquare) },
  feature: { label: "Feature", color: "bg-cyan-100 text-cyan-700", icon: React.createElement(FaPlusSquare) },
  epic: { label: "Epic", color: "bg-violet-100 text-violet-700", icon: React.createElement(FaRocket) },
  test: { label: "Test", color: "bg-teal-100 text-teal-700", icon: React.createElement(FaSearch) },
  testset: { label: "Test Set", color: "bg-indigo-100 text-indigo-700", icon: React.createElement(FaFlag) },
  testexecution: { label: "Test Execution", color: "bg-lime-100 text-lime-700", icon: React.createElement(FaPlay) },
  precondition: { label: "Precondition", color: "bg-sky-100 text-sky-700", icon: React.createElement(FaRegDotCircle) },
};

export const PRIORITY_OPTIONS = ["critical", "high", "medium", "low"];

export const PRIORITY_STYLES = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-green-100 text-green-700 border-green-200",
};
