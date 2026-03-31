import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import { useHR } from "../context/HRContext";
import {
  FaHome, FaUserFriends, FaSitemap, FaUserCircle, FaFileAlt,
  FaClock, FaCalendarAlt, FaFolder, FaDollarSign,
  FaSearch, FaChevronDown,
  FaDownload, FaEye, FaCheckCircle,
  FaChevronLeft, FaChevronRight, FaBuilding, FaIdCard,
  FaBriefcase, FaPlus, FaExternalLinkAlt, FaInfoCircle,
  FaTimes, FaReceipt, FaUniversity, FaPen,
  FaSyncAlt, FaBolt, FaBell, FaClipboardList,
  FaUserTie, FaUserPlus, FaUserCheck, FaStar, FaRegStar,
  FaLink, FaThumbsDown, FaArrowRight,
} from "react-icons/fa";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const PUBLIC_HOLIDAYS = [
  { date: "Thu Apr 23rd 2026", name: "National Sovereignty and Children's Day" },
  { date: "Fri May 1st 2026",  name: "Labor and Solidarity Day" },
  { date: "Tue May 19th 2026", name: "Commemoration of Atatürk, Youth and Sports Day" },
  { date: "Thu Oct 29th 2026", name: "Republic Day" },
  { date: "Wed Dec 31st 2026", name: "New Year's Eve" },
];

const TIME_ENTRIES = [
  { date: "Sun Mar 1",  type: "weekend",   label: "Non-working day",  submittable: true },
  { date: "Mon Mar 2",  type: "work",      label: "No hours worked",  submittable: true },
  { date: "Tue Mar 3",  type: "work",      label: "No hours worked",  submittable: true },
  { date: "Wed Mar 4",  type: "work",      label: "No hours worked",  submittable: true },
  { date: "Thu Mar 5",  type: "work",      label: "No hours worked",  submittable: true },
  { date: "Fri Mar 6",  type: "work",      label: "No hours worked",  submittable: true },
  { date: "Sat Mar 7",  type: "weekend",   label: "Non-working day",  submittable: true },
  { date: "Sun Mar 8",  type: "weekend",   label: "Non-working day",  submittable: true },
  { date: "Mon Mar 9",  type: "sick",      label: "Sick leave",       submittable: false },
  { date: "Tue Mar 10", type: "sick",      label: "Sick leave",       submittable: false },
  { date: "Wed Mar 11", type: "work",      label: "No hours worked",  submittable: true },
  { date: "Thu Mar 12", type: "work",      label: "No hours worked",  submittable: true },
  { date: "Fri Mar 13", type: "work",      label: "No hours worked",  submittable: true },
  { date: "Sat Mar 14", type: "weekend",   label: "Non-working day",  submittable: true },
  { date: "Sun Mar 15", type: "weekend",   label: "Non-working day",  submittable: true },
  { date: "Mon Mar 16", type: "work",      label: "No hours worked",  submittable: true },
  { date: "Tue Mar 17", type: "work",      label: "No hours worked",  submittable: true },
  { date: "Wed Mar 18", type: "work",      label: "No hours worked",  submittable: true },
  { date: "Thu Mar 19", type: "work",      label: "No hours worked",  submittable: true },
  { date: "Fri Mar 20", type: "work",      label: "No hours worked",  submittable: true },
  { date: "Sat Mar 21", type: "weekend",   label: "Non-working day",  submittable: true },
  { date: "Sun Mar 22", type: "weekend",   label: "Non-working day",  submittable: true },
  { date: "Mon Mar 23", type: "vacation",  label: "Vacation",         submittable: false },
  { date: "Tue Mar 24", type: "vacation",  label: "Vacation",         submittable: false },
  { date: "Wed Mar 25", type: "vacation",  label: "Vacation",         submittable: false },
  { date: "Thu Mar 26", type: "vacation",  label: "Vacation",         submittable: false },
  { date: "Fri Mar 27", type: "vacation",  label: "Vacation",         submittable: false },
  { date: "Sat Mar 28", type: "weekend",   label: "Non-working day",  submittable: true },
  { date: "Sun Mar 29", type: "weekend",   label: "Non-working day",  submittable: true },
  { date: "Mon Mar 30", type: "work",      label: "No hours worked",  submittable: true },
  { date: "Tue Mar 31", type: "work",      label: "No hours worked",  submittable: true },
];

const WHO_IS_AWAY = [
  { id: 1, name: "Jasmine Fleming",  role: "Director Content Marketing",        until: "Mar 31st 2026", color: "#dc2626", long: false },
  { id: 2, name: "Ram Kanna",        role: "Senior Technical Product Manager",  until: "Mar 31st 2026", color: "#8b5cf6", long: false },
  { id: 3, name: "Jan Dubrawski",    role: "Project Manager",                   until: "Apr 1st 2026",  color: "#3b82f6", long: true  },
  { id: 4, name: "Lukasz Ostrowski", role: "Technical Lead",                    until: "Apr 1st 2026",  color: "#f59e0b", long: false },
];

const TIME_OFF_REQUESTS = [
  { id: 1, type: "vacation", label: "Vacation Turkey 20 days", period: "Mar 23rd - 27th 2026", duration: "5 days", status: "used" },
  { id: 2, type: "sick",     label: "Sick leave Turkey",       period: "Mar 9th - 10th 2026",  duration: "2 days", status: "used" },
  { id: 3, type: "vacation", label: "Vacation Turkey 20 days", period: "Jan 5th - 9th 2026",   duration: "5 days", status: "used" },
];

const DOCUMENTS = [
  { id: 1, name: "Company Handbook",           category: "company",   status: "not_submitted", icon: FaClipboardList,  actions: ["sign"]     },
  { id: 2, name: "Worker Verification Letter", category: "company",   status: null,            icon: FaFileAlt,        actions: ["preview"]  },
  { id: 3, name: "HR Administration",          category: "personal",  status: null,            icon: FaFolder,         actions: ["download"], subtitle: "1 file" },
];

// Org chart tree
const ORG_TREE = {
  name: "Kevin Chew", role: "CEO", dept: "Finance & Admin", color: "#7c3aed", reports: 97,
  children: [
    {
      name: "Brigid Ling", role: "Chief Marketing Officer", dept: "Marketing", color: "#dc2626", reports: 10,
      children: [],
    },
    {
      name: "Jim Franzel", role: "VP Product Management", dept: "Product Management", color: "#2563eb", reports: 8,
      children: [
        { name: "Bastien Vogt", role: "Product Manager", dept: "Product", color: "#7c3aed", reports: 0, children: [] },
        { name: "Eleni Katsiavou", role: "Head of Design", dept: "Design", color: "#db2777", reports: 4, children: [] },
      ],
    },
    {
      name: "Alek Lipski", role: "VP Engineering", dept: "Engineering", color: "#ec4899", reports: 14,
      children: [
        {
          name: "Murat Ezgi Bingol", role: "Leader of Technical Products", dept: "Engineering", color: "#ea580c", reports: 26,
          children: [
            { name: "Basrican Sen",    role: "Technical Lead",  dept: "Engineering", color: "#0891b2", reports: 3, children: [] },
            {
              name: "Haroon Rashid", role: "Technical Lead",  dept: "Engineering", color: "#6366f1", reports: 2,
              children: [
                { name: "Canberk Yigit", role: "Software Engineer", dept: "Engineering", color: "#3b82f6", reports: 0, children: [], isMe: true },
              ],
            },
            { name: "Lukasz Ostrowski", role: "Technical Lead", dept: "Engineering", color: "#f59e0b", reports: 5, children: [] },
          ],
        },
        { name: "Rinat Shaipov", role: "QA Lead", dept: "Engineering", color: "#10b981", reports: 9, children: [] },
      ],
    },
  ],
};

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function Avatar({ name, color, size = "md", img }) {
  const s = { sm: "w-7 h-7 text-[10px]", md: "w-9 h-9 text-sm", lg: "w-12 h-12 text-base" }[size];
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className={`${s} rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-white`}
      style={{ backgroundColor: color || "#6366f1" }}>
      {initials}
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] ${className}`}>
      {children}
    </div>
  );
}

function Badge({ children, color = "blue" }) {
  const styles = {
    blue:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    green:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    amber:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    red:    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    slate:  "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[color]}`}>
      {children}
    </span>
  );
}

function InfoRow({ label, value, valueClass = "" }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-slate-100 dark:border-[#2a3044] last:border-0">
      <span className="text-sm text-slate-500 dark:text-slate-400 flex-shrink-0 mr-4">{label}</span>
      <span className={`text-sm text-slate-700 dark:text-slate-200 text-right ${valueClass}`}>{value}</span>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ userName }) {
  const [timeOffTab, setTimeOffTab] = useState("upcoming");
  const quickActions = [
    { label: "Submit hours",      icon: FaClock,       bg: "bg-green-100 dark:bg-green-900/30",  ic: "text-green-600 dark:text-green-400" },
    { label: "Request time off",  icon: FaCalendarAlt, bg: "bg-blue-100 dark:bg-blue-900/30",    ic: "text-blue-600 dark:text-blue-400"  },
    { label: "Add expense",       icon: FaReceipt,     bg: "bg-amber-100 dark:bg-amber-900/30",  ic: "text-amber-600 dark:text-amber-400" },
    { label: "Update profile",    icon: FaUserCircle,  bg: "bg-indigo-100 dark:bg-indigo-900/30", ic: "text-indigo-600 dark:text-indigo-400" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column */}
      <div className="lg:col-span-2 space-y-5">
        {/* Quick actions */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <FaBolt className="text-amber-500 w-3.5 h-3.5" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Quick actions</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map(({ label, icon: Icon, bg, ic }) => (
              <button key={label}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-slate-200 dark:border-[#2a3044] hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${ic}`} />
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 text-center leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Time off and public holidays */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FaCalendarAlt className="text-slate-400 w-3.5 h-3.5" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Time off and public holidays</span>
            </div>
            <button className="text-xs text-blue-500 hover:text-blue-400 transition-colors">View all</button>
          </div>
          <div className="flex gap-4 mb-4 border-b border-slate-200 dark:border-[#2a3044]">
            {["upcoming", "balance"].map(t => (
              <button key={t} onClick={() => setTimeOffTab(t)}
                className={`pb-2.5 text-xs font-medium capitalize border-b-2 -mb-px transition-colors ${
                  timeOffTab === t
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}>
                {t === "upcoming" ? "Upcoming" : "Balance"}
              </button>
            ))}
          </div>
          {timeOffTab === "upcoming" ? (
            <div className="space-y-2">
              {PUBLIC_HOLIDAYS.slice(0, 3).map((h, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-[#2a3044] last:border-0">
                  <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-base">🇹🇷</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{h.date}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{h.name}</p>
                  </div>
                </div>
              ))}
              <button className="w-full mt-2 py-2 text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                Request time off
              </button>
            </div>
          ) : (
            <div className="py-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-[#232838]">
                <span className="text-sm text-slate-700 dark:text-slate-200">Vacation Turkey 20 days</span>
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">26.70 days available</span>
              </div>
            </div>
          )}
        </Card>

        {/* Who is away today */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FaCalendarAlt className="text-slate-400 w-3.5 h-3.5" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Who is away today</span>
            </div>
            <button className="text-xs text-blue-500 hover:text-blue-400 transition-colors">View all</button>
          </div>
          <div className="space-y-1">
            {WHO_IS_AWAY.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-[#2a3044] last:border-0">
                <Avatar name={p.name} color={p.color} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-blue-500 hover:text-blue-400 cursor-pointer truncate">{p.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{p.role}</p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                  p.long
                    ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                    : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                }`}>
                  {p.long ? "OOO (long) " : "OOO "}until {p.until}
                </span>
              </div>
            ))}
            <button className="w-full mt-2 py-2 text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors flex items-center justify-center gap-2">
              <FaCalendarAlt className="w-3 h-3" /> View calendar
            </button>
          </div>
        </Card>
      </div>

      {/* Right column */}
      <div className="space-y-5">
        {/* For you today */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <FaBell className="text-slate-400 w-3.5 h-3.5" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">For you today</span>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 flex items-start justify-between mb-3">
            <div className="flex items-start gap-2">
              <FaInfoCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">Boost your account security by setting up 2FA</p>
            </div>
            <FaTimes className="w-3 h-3 text-amber-400 flex-shrink-0 ml-2 mt-0.5 cursor-pointer" />
          </div>
          {[
            { icon: FaClipboardList, label: "Documents", count: 2, color: "bg-blue-100 dark:bg-blue-900/30 text-blue-500" },
            { icon: FaCheckCircle, label: "Tasks", count: 1, color: "bg-amber-100 dark:bg-amber-900/30 text-amber-500" },
          ].map(({ icon: Icon, label, count, color }) => (
            <div key={label} className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-[#2a3044] last:border-0">
              <div className="relative">
                <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {count}
                </span>
              </div>
              <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">{label}</span>
              <button className="text-xs text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-[#2a3044] px-2.5 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                View
              </button>
            </div>
          ))}
        </Card>

        {/* Contracts */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <FaPen className="text-slate-400 w-3.5 h-3.5" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Contracts</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-[#232838]">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">CY</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-500 truncate">{userName} - Software Engineer</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                <span className="text-[11px] text-green-600 dark:text-green-400">Active</span>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex-shrink-0">Fr99,999.00</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── People Tab ───────────────────────────────────────────────────────────────

function PeopleTab({ employees, currentUserId }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() =>
    employees.filter(e =>
      (e.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.role || "").toLowerCase().includes(search.toLowerCase())
    ), [search, employees]
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search people..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        {["Job title", "Country", "Manager"].map(f => (
          <button key={f} className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
            {f} <FaChevronDown className="w-2.5 h-2.5" />
          </button>
        ))}
        <button className="ml-auto p-2 text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-[#2a3044]">
          <span className="text-xs text-slate-500 dark:text-slate-400">Total {filtered.length} people</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#2a3044]">
                {["Person", "Country", "Manager", "Report"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <tr key={emp.id}
                  className={`border-b border-slate-100 dark:border-[#2a3044]/50 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors last:border-0 ${emp.id === currentUserId ? "bg-blue-50/30 dark:bg-blue-900/10" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={emp.name || "?"} color={emp.color} size="sm" />
                      <div>
                        <p className="text-xs font-medium text-blue-500 hover:text-blue-400 cursor-pointer">
                          {emp.name} {emp.id === currentUserId && <span className="text-[10px] text-slate-400 dark:text-slate-500">(You)</span>}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{emp.role || emp.status || "Team Member"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {emp.country ? (
                      <div className="flex items-center gap-1.5">
                        {emp.flag && <span className="text-base">{emp.flag}</span>}
                        <span className="text-xs text-slate-600 dark:text-slate-400">{emp.country}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {emp.manager ? (
                      <span className="text-xs text-blue-500 hover:text-blue-400 cursor-pointer">{emp.manager}</span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {emp.reports > 0 ? (
                      <span className="text-xs text-slate-600 dark:text-slate-300">{emp.reports} Reports</span>
                    ) : emp.reportTo ? (
                      <span className="text-xs text-blue-500">{emp.reportTo}</span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── Org Chart Tab ────────────────────────────────────────────────────────────

// ─── Org Chart Layout Engine ──────────────────────────────────────────────────

const ORG_NODE_W = 164;
const ORG_NODE_H = 94;
const ORG_H_GAP  = 52;
const ORG_V_GAP  = 80;

function buildOrgLayout(root) {
  function clone(n) { return { ...n, children: (n.children ?? []).map(clone) }; }
  const tree = clone(root);

  function measure(n) {
    if (!n.children.length) { n._sw = ORG_NODE_W; return; }
    n.children.forEach(measure);
    const tw = n.children.reduce((s, c) => s + c._sw, 0) + ORG_H_GAP * (n.children.length - 1);
    n._sw = Math.max(ORG_NODE_W, tw);
  }

  function place(n, cx, depth) {
    n._cx = cx; n._depth = depth;
    if (!n.children.length) return;
    const tw = n.children.reduce((s, c) => s + c._sw, 0) + ORG_H_GAP * (n.children.length - 1);
    let left = cx - tw / 2;
    for (const c of n.children) {
      place(c, left + c._sw / 2, depth + 1);
      left += c._sw + ORG_H_GAP;
    }
  }

  function flatten(n) {
    const y = n._depth * (ORG_NODE_H + ORG_V_GAP);
    const x = n._cx - ORG_NODE_W / 2;
    const out = { nodes: [{ ...n, x, y, cx: n._cx }], edges: [] };
    for (const c of (n.children ?? [])) {
      const cy = c._depth * (ORG_NODE_H + ORG_V_GAP);
      out.edges.push({ x1: n._cx, y1: y + ORG_NODE_H, x2: c._cx, y2: cy });
      const sub = flatten(c);
      out.nodes.push(...sub.nodes);
      out.edges.push(...sub.edges);
    }
    return out;
  }

  measure(tree);
  place(tree, tree._sw / 2, 0);
  const { nodes, edges } = flatten(tree);
  const xs = nodes.flatMap(n => [n.x, n.x + ORG_NODE_W]);
  const ys = nodes.flatMap(n => [n.y, n.y + ORG_NODE_H]);
  return {
    nodes, edges,
    bounds: {
      width:  Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
      ox: Math.min(...xs), oy: Math.min(...ys),
    },
  };
}

function findInTree(node, name) {
  if (node.name === name) return node;
  for (const c of (node.children ?? [])) {
    const f = findInTree(c, name);
    if (f) return f;
  }
  return null;
}

function findParent(node, name) {
  for (const c of (node.children ?? [])) {
    if (c.name === name) return node;
    const f = findParent(c, name);
    if (f) return f;
  }
  return null;
}

// ─── Org Chart Tab (Canvas) ───────────────────────────────────────────────────

function OrgChartTab() {
  const { darkMode } = useApp();
  const canvasRef = useRef(null);
  const [zoom, setZoom]       = useState(0.55);
  const [pan, setPan]         = useState({ x: 40, y: 40 });
  const [drag, setDrag]       = useState(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch]   = useState("");
  const [fitted, setFitted]   = useState(false);

  const { nodes, edges, bounds } = useMemo(() => buildOrgLayout(ORG_TREE), []);

  // Non-passive wheel → zoom toward cursor
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.13 : 1 / 1.13;
      setZoom(prevZ => {
        const nz = Math.max(0.12, Math.min(3, prevZ * factor));
        setPan(p => ({
          x: mx - (mx - p.x) * (nz / prevZ),
          y: my - (my - p.y) * (nz / prevZ),
        }));
        return nz;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Fit to screen on mount
  useEffect(() => {
    if (fitted) return;
    const el = canvasRef.current;
    if (!el) return;
    const t = setTimeout(() => {
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      const pad = 64;
      const z = Math.min((r.width - pad * 2) / bounds.width, (r.height - pad * 2) / bounds.height, 1);
      setZoom(z);
      setPan({ x: (r.width - bounds.width * z) / 2, y: pad });
      setFitted(true);
    }, 80);
    return () => clearTimeout(t);
  }, [bounds, fitted]);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0 || e.target.closest("[data-node]")) return;
    setDrag({ ox: e.clientX - pan.x, oy: e.clientY - pan.y });
  }, [pan]);

  const onMouseMove = useCallback((e) => {
    if (!drag) return;
    setPan({ x: e.clientX - drag.ox, y: e.clientY - drag.oy });
  }, [drag]);

  const onMouseUp = useCallback(() => setDrag(null), []);

  const fitScreen = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pad = 64;
    const z = Math.min((r.width - pad * 2) / bounds.width, (r.height - pad * 2) / bounds.height, 1);
    setZoom(z);
    setPan({ x: (r.width - bounds.width * z) / 2, y: pad });
  }, [bounds]);

  const goToMe = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    const me = nodes.find(n => n.isMe);
    if (!me) return;
    const r = el.getBoundingClientRect();
    const z = 1.1;
    setZoom(z);
    setPan({ x: r.width / 2 - me.cx * z, y: r.height / 2 - (me.y + ORG_NODE_H / 2) * z });
  }, [nodes]);

  const matches = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return new Set(nodes.filter(n =>
      n.name.toLowerCase().includes(q) || n.role.toLowerCase().includes(q)
    ).map(n => n.name));
  }, [search, nodes]);

  // Edge highlight: which edges connect to the selected node?
  const highlightedEdgeIdxs = useMemo(() => {
    if (!selected) return new Set();
    const s = new Set();
    edges.forEach((e, i) => {
      const fromNode = nodes.find(n => Math.abs(n.cx - e.x1) < 1);
      const toNode   = nodes.find(n => Math.abs(n.cx - e.x2) < 1 && Math.abs(n.y - e.y2) < 1);
      if (fromNode?.name === selected.name || toNode?.name === selected.name) s.add(i);
    });
    return s;
  }, [selected, edges, nodes]);

  const dotColor = darkMode ? "%231e293b" : "%23e2e8f0";
  const edgeColor = darkMode ? "#2a3044" : "#cbd5e1";

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 230px)", minHeight: 520 }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap flex-shrink-0">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name"
            className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 w-44"
          />
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg bg-white dark:bg-[#1c2030] hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
          Manager and report <FaChevronDown className="w-2.5 h-2.5" />
        </button>
        <button onClick={goToMe}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-[#1c2030] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
          👤 Find me
        </button>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setZoom(z => Math.max(0.12, parseFloat((z - 0.1).toFixed(2))))}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#232838] text-lg leading-none select-none">
            −
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400 w-10 text-center select-none tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(3, parseFloat((z + 0.1).toFixed(2))))}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#232838] text-lg leading-none select-none">
            +
          </button>
          <button onClick={fitScreen} title="Fit to screen"
            className="w-7 h-7 ml-1 flex items-center justify-center rounded border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
          <button title="Download"
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
            <FaDownload className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Canvas + side panel */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 rounded-xl border border-slate-200 dark:border-[#2a3044] overflow-hidden relative"
          style={{
            cursor: drag ? "grabbing" : "grab",
            backgroundColor: darkMode ? "#0d1117" : "#f8fafc",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22'%3E%3Ccircle cx='1' cy='1' r='1' fill='${dotColor}'/%3E%3C/svg%3E")`,
            backgroundSize:     `${22 * zoom}px ${22 * zoom}px`,
            backgroundPosition: `${pan.x % (22 * zoom)}px ${pan.y % (22 * zoom)}px`,
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {/* Transform layer */}
          <div style={{
            transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            position: "absolute",
            top: 0, left: 0,
            width: bounds.width + 200,
            height: bounds.height + 200,
          }}>
            {/* SVG connections */}
            <svg
              style={{
                position: "absolute", top: 0, left: 0,
                width: bounds.width + 200,
                height: bounds.height + 200,
                overflow: "visible",
                pointerEvents: "none",
              }}
            >
              {edges.map((e, i) => {
                const my = (e.y1 + e.y2) / 2;
                const hi = highlightedEdgeIdxs.has(i);
                return (
                  <path
                    key={i}
                    d={`M ${e.x1} ${e.y1} C ${e.x1} ${my}, ${e.x2} ${my}, ${e.x2} ${e.y2}`}
                    strokeWidth={hi ? 2.5 : 1.5}
                    stroke={hi ? "#3b82f6" : edgeColor}
                    fill="none"
                    strokeOpacity={matches && !matches.has(
                      nodes.find(n => Math.abs(n.cx - e.x1) < 1)?.name
                    ) ? 0.2 : (hi ? 1 : 0.8)}
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>

            {/* Node cards */}
            {nodes.map((n, i) => {
              const isSel     = selected?.name === n.name;
              const isHit     = matches?.has(n.name);
              const isDim     = !!matches && !isHit;
              const isRelated = !isSel && selected && (
                edges.some(e =>
                  (nodes.find(nd => Math.abs(nd.cx - e.x1) < 1)?.name === selected.name &&
                   nodes.find(nd => Math.abs(nd.cx - e.x2) < 1 && Math.abs(nd.y - e.y2) < 1)?.name === n.name) ||
                  (nodes.find(nd => Math.abs(nd.cx - e.x2) < 1 && Math.abs(nd.y - e.y2) < 1)?.name === selected.name &&
                   nodes.find(nd => Math.abs(nd.cx - e.x1) < 1)?.name === n.name)
                )
              );
              return (
                <div
                  key={i}
                  data-node="1"
                  onClick={() => setSelected(isSel ? null : n)}
                  style={{
                    position: "absolute",
                    left: n.x, top: n.y,
                    width: ORG_NODE_W,
                    minHeight: ORG_NODE_H,
                    opacity: isDim ? 0.25 : 1,
                    transition: "opacity 0.15s, box-shadow 0.15s",
                    willChange: "transform",
                  }}
                  className={`rounded-2xl border-2 cursor-pointer select-none ${
                    isSel
                      ? "border-blue-500 shadow-2xl shadow-blue-500/30 bg-blue-50 dark:bg-[#1a2744]"
                      : isHit
                      ? "border-amber-400 shadow-xl shadow-amber-400/25 bg-amber-50/80 dark:bg-[#1f1a08]"
                      : isRelated
                      ? "border-blue-400/50 shadow-lg bg-white dark:bg-[#1c2030]"
                      : n.isMe
                      ? "border-emerald-500 shadow-lg shadow-emerald-500/20 bg-white dark:bg-[#1c2030]"
                      : "border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] hover:border-blue-400/60 hover:shadow-md dark:hover:border-blue-500/50"
                  }`}
                >
                  <div className="px-3 pt-3 pb-2.5 flex flex-col items-center gap-1.5">
                    <div className="relative">
                      <Avatar name={n.name} color={n.color} size="sm" />
                      {n.isMe && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#1c2030]" />
                      )}
                    </div>
                    <div className="text-center w-full">
                      <p className={`text-[11px] font-semibold leading-tight truncate ${
                        n.isMe ? "text-emerald-600 dark:text-emerald-400"
                        : isSel ? "text-blue-600 dark:text-blue-300"
                        : "text-slate-800 dark:text-slate-100"
                      }`}>
                        {n.name}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5 line-clamp-2 px-1">
                        {n.role}
                      </p>
                    </div>
                    {n.reports > 0 && (
                      <span className={`text-[9px] font-medium border rounded-full px-1.5 py-0.5 ${
                        isSel
                          ? "border-blue-300 text-blue-500 dark:border-blue-700 dark:text-blue-400"
                          : "border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400"
                      }`}>
                        ▼ {n.reports}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom hint */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="text-[10px] text-slate-400 dark:text-slate-600 select-none bg-white/70 dark:bg-black/30 px-2 py-1 rounded-full backdrop-blur-sm">
              Scroll to zoom · Drag to pan · Click node to inspect
            </span>
          </div>
        </div>

        {/* Side panel */}
        {selected && (
          <div className="w-64 flex-shrink-0 rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] overflow-y-auto flex flex-col">
            <div className="p-4 flex-1">
              {/* Header */}
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
                <button onClick={() => setSelected(null)}
                  className="flex-shrink-0 p-1 -mt-0.5 -mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded">
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              </div>

              <button className="w-full mb-4 py-2 text-xs font-medium text-blue-500 border border-blue-300 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-1.5">
                View full profile <FaExternalLinkAlt className="w-2.5 h-2.5" />
              </button>

              <div className="space-y-4">
                {/* Department */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500 mb-1.5">Department</p>
                  <span className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#232838] text-slate-700 dark:text-slate-300">
                    {selected.dept}
                  </span>
                </div>

                {/* Reports count */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500 mb-1.5">Direct Reports</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {selected.reports}
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">
                      report{selected.reports !== 1 ? "s" : ""}
                    </span>
                  </p>
                </div>

                {/* Reports to */}
                {(() => {
                  const mgr = findParent(ORG_TREE, selected.name);
                  if (!mgr) return null;
                  return (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500 mb-1.5">Reports To</p>
                      <button
                        onClick={() => setSelected(nodes.find(n => n.name === mgr.name) ?? null)}
                        className="flex items-center gap-2.5 w-full p-2 rounded-lg bg-slate-50 dark:bg-[#232838] hover:bg-slate-100 dark:hover:bg-[#2a3044] transition-colors text-left group">
                        <Avatar name={mgr.name} color={mgr.color} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-blue-500 dark:text-blue-400 group-hover:underline truncate">{mgr.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{mgr.role}</p>
                        </div>
                      </button>
                    </div>
                  );
                })()}

                {/* Direct reports list */}
                {(() => {
                  const found = findInTree(ORG_TREE, selected.name);
                  const children = found?.children ?? [];
                  if (!children.length) return null;
                  return (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500 mb-1.5">
                        Direct Reports ({children.length})
                      </p>
                      <div className="space-y-1">
                        {children.map((c, i) => (
                          <button key={i}
                            onClick={() => setSelected(nodes.find(n => n.name === c.name) ?? null)}
                            className="flex items-center gap-2 w-full p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors text-left group">
                            <Avatar name={c.name} color={c.color} size="sm" />
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200 group-hover:text-blue-500 truncate">{c.name}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{c.role}</p>
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

// ─── My Profile Tab ───────────────────────────────────────────────────────────

function MyProfileTab({ userName, userEmail }) {
  const [subTab, setSubTab] = useState("overview");
  const subTabs = ["Overview", "Personal information", "Payslips", "History"];
  const nameParts = userName?.split(" ") || ["User", ""];
  const firstName = nameParts[0] || "User";
  const lastName = nameParts.slice(1).join(" ") || "";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
      <div className="lg:col-span-1">
        <Card className="p-3">
          <div className="relative mb-1">
            <input
              placeholder="Search"
              className="w-full pl-3 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#232838] text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
            />
          </div>
          {subTabs.map(t => (
            <button key={t} onClick={() => setSubTab(t.toLowerCase().replace(/ /g, "-"))}
              className={`w-full text-left px-3 py-2.5 text-xs rounded-lg transition-colors ${
                subTab === t.toLowerCase().replace(/ /g, "-")
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838]"
              }`}>
              {t}
            </button>
          ))}
        </Card>
      </div>

      <div className="lg:col-span-3 space-y-4">
        {/* Contract details */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FaBriefcase className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Contract details</h3>
          </div>
          <div className="mt-3">
            <InfoRow label="Job title" value="Software Engineer" />
            <InfoRow label="Employment type" value="Full-time" />
            <InfoRow label="Base compensation" value="Fr99,999.00" valueClass="font-semibold" />
            <InfoRow label="Contract" value={
              <span className="text-blue-500 cursor-pointer hover:underline">{userName} - Software Engineer</span>
            } />
          </div>
        </Card>

        {/* Worker relationship */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <FaUserFriends className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Worker relationship</h3>
            </div>
            <button className="text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] px-3 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">Edit</button>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Manager</p>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-[#232838]">
                <Avatar name="Haroon Rashid" color="#6366f1" size="sm" />
                <div>
                  <p className="text-xs font-medium text-blue-500">Haroon Rashid</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Technical Lead</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Report</p>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-[#232838]">
                <FaInfoCircle className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400">Not assigned</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Personal */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <FaUserCircle className="w-3.5 h-3.5 text-green-500" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Personal</h3>
            </div>
            <button className="text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] px-3 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">View</button>
          </div>
          <InfoRow label="First name" value={firstName} />
          <InfoRow label="Last name" value={lastName || "—"} />
          <InfoRow label="Personal email" value={userEmail || "user@company.com"} />
          <InfoRow label="Country" value={<span className="flex items-center gap-1.5 justify-end">🇹🇷 Turkey</span>} />
        </Card>

        {/* General */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <FaIdCard className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">General</h3>
          </div>
          <InfoRow label="Start date" value="Jun 14th 2021" />
          <InfoRow label="Work email" value={userEmail || "user@company.com"} />
          <InfoRow label="Seniority level" value="Mid (Individual Contributor Level 2)" />
          <InfoRow label="Work location" value="Not specified" valueClass="text-slate-400 dark:text-slate-500" />
        </Card>
      </div>
    </div>
  );
}

// ─── Contract Tab ─────────────────────────────────────────────────────────────

function ContractTab({ userName }) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{userName} - Software Engineer</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">Direct Employee</span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">Software Engineer</span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <Badge color="green"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Active</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Agreement details */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Agreement details</h3>
          <InfoRow label="Contract start date" value={<span className="flex items-center gap-1.5">Jun 14th 2021 <FaInfoCircle className="w-3 h-3 text-slate-400" /></span>} />
          <InfoRow label="Contract creation date" value={<span className="flex items-center gap-1.5">Oct 16th 2024 <FaInfoCircle className="w-3 h-3 text-slate-400" /></span>} />
          <InfoRow label="Worker type" value="Direct Employee" />
          <InfoRow label="Employment type" value="Full time" />
          <InfoRow label="Work schedule" value={<span className="text-slate-400 dark:text-slate-500">Not specified</span>} />
          <InfoRow label="Job title" value="Software Engineer" />
          <InfoRow label="Seniority level" value="Mid (Individual Contributor Level 2)" />
          <InfoRow label="Country" value={<span className="flex items-center gap-1.5 justify-end">🇹🇷 Turkey</span>} />
          <InfoRow label="Scope of work" value={<span className="text-slate-400 dark:text-slate-500">Not specified</span>} />
          <InfoRow label="Employee number" value={<span className="text-slate-400 dark:text-slate-500">Not specified</span>} />
        </Card>

        <div className="space-y-5">
          {/* Agreement & signatures */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Agreement and signatures</h3>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-[#232838]">
              <FaInfoCircle className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">No uploaded employment agreement</span>
            </div>
          </Card>

          {/* Compensation details */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Compensation details</h3>
            <InfoRow label="Compensation type" value="Annual" />
            <InfoRow label="Annual gross salary" value={<span className="font-semibold">Fr99,999.00</span>} />
          </Card>

          {/* Additional details */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Additional details</h3>
              <button className="text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] px-3 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">Edit</button>
            </div>
            <InfoRow label="ID Number" value="1" />
            <InfoRow label="National ID" value="—" />
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Time Tracking Tab ────────────────────────────────────────────────────────

function TimeTrackingTab() {
  const [filter] = useState("Mar 1st - Mar 31st 2026");

  const typeStyle = {
    weekend:  "text-slate-400 dark:text-slate-500",
    work:     "text-slate-600 dark:text-slate-300",
    sick:     "text-blue-500 dark:text-blue-400",
    vacation: "text-amber-500 dark:text-amber-400",
  };

  const typeIcon = {
    weekend:  "🚫",
    work:     "⏰",
    sick:     "💊",
    vacation: "🏖️",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Time tracking</h2>
        <button className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
          Submit hours <FaChevronDown className="w-3 h-3" />
        </button>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <button className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg bg-white dark:bg-[#1c2030] hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
          <FaCalendarAlt className="w-3 h-3" /> {filter} <FaChevronDown className="w-2.5 h-2.5" />
        </button>
        {["Type", "Approval Status"].map(f => (
          <button key={f} className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg bg-white dark:bg-[#1c2030] hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
            {f} <FaChevronDown className="w-2.5 h-2.5" />
          </button>
        ))}
        <button className="ml-auto p-2 text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
          <FaExternalLinkAlt className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        {[
          { label: "Approved hours", value: "0", icon: FaCheckCircle, color: "text-green-500" },
          { label: "Pending hours",  value: "0", icon: FaSyncAlt, color: "text-amber-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-4 flex items-center gap-4">
            <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">hours worked</span></p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-[#2a3044]">
          <span className="text-xs text-slate-500 dark:text-slate-400">Total {TIME_ENTRIES.length} items</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#2a3044]">
                {["Date", "Type", "Time period", "Total hours worked", "Break", "Status"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_ENTRIES.map((entry, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-[#2a3044]/50 last:border-0 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-medium ${entry.type === "weekend" ? "text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-200"}`}>
                      {entry.date}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`flex items-center gap-1.5 text-xs ${typeStyle[entry.type]}`}>
                      <span>{typeIcon[entry.type]}</span> {entry.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5"><span className="text-xs text-slate-400">—</span></td>
                  <td className="px-4 py-2.5"><span className="text-xs text-slate-400">—</span></td>
                  <td className="px-4 py-2.5"><span className="text-xs text-slate-400">—</span></td>
                  <td className="px-4 py-2.5">
                    {entry.submittable ? (
                      <button className="text-xs px-2.5 py-1 border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                        Submit
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── Time Off Tab ─────────────────────────────────────────────────────────────

const MARCH_DAYS = [
  // week 1
  [1,2,3,4,5,6,7],
  // week 2
  [8,9,10,11,12,13,14],
  // week 3
  [15,16,17,18,19,20,21],
  // week 4
  [22,23,24,25,26,27,28],
  // week 5
  [29,30,31,null,null,null,null],
];

// ─── Request Time Off Modal ───────────────────────────────────────────────────

const TIME_OFF_TYPES = [
  "Vacation Turkey 20 days",
  "Sick leave Turkey",
  "Unpaid leave",
  "Parental leave",
  "Bereavement leave",
];

function RequestTimeOffModal({ open, onClose }) {
  const [type, setType]           = useState(TIME_OFF_TYPES[0]);
  const [typeOpen, setTypeOpen]   = useState(false);
  const [fromDate, setFromDate]   = useState("");
  const [toDate, setToDate]       = useState("");
  const [desc, setDesc]           = useState("");
  const [dragOver, setDragOver]   = useState(false);
  const [file, setFile]           = useState(null);
  const fileRef = useRef(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setType(TIME_OFF_TYPES[0]);
      setTypeOpen(false);
      setFromDate("");
      setToDate("");
      setDesc("");
      setDragOver(false);
      setFile(null);
    }
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const canSubmit = fromDate && toDate && fromDate <= toDate;

  const handleFile = (f) => {
    if (!f) return;
    const allowed = ["image/jpeg","image/png","image/heic","application/pdf"];
    if (allowed.includes(f.type) && f.size <= 5 * 1024 * 1024) setFile(f);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-lg bg-white dark:bg-[#1a1f2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#2a3044] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2a3044]">
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Request time off</h2>
                <button
                  onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors"
                >
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                {/* Type dropdown */}
                <div className="relative">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Type</label>
                  <button
                    type="button"
                    onClick={() => setTypeOpen(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-sm text-slate-800 dark:text-slate-100 hover:border-blue-400 dark:hover:border-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <span>{type}</span>
                    <FaChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${typeOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {typeOpen && (
                      <motion.ul
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        className="absolute z-10 w-full mt-1 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl shadow-xl overflow-hidden"
                      >
                        {TIME_OFF_TYPES.map(t => (
                          <li key={t}>
                            <button
                              type="button"
                              onClick={() => { setType(t); setTypeOpen(false); }}
                              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                                t === type
                                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium"
                                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#232838]"
                              }`}
                            >
                              {t}
                            </button>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>

                {/* From / To */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                      From <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={e => setFromDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                      To <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={toDate}
                      min={fromDate}
                      onChange={e => setToDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Description (optional)</label>
                  <textarea
                    value={desc}
                    onChange={e => setDesc(e.target.value.slice(0, 280))}
                    rows={4}
                    placeholder="Add a note for your manager..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors"
                  />
                  <div className="flex justify-end mt-1">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">{desc.length} / 280</span>
                  </div>
                </div>

                {/* Attachment */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Attachment (optional)</label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                    className={`relative flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                      dragOver
                        ? "border-blue-400 bg-blue-50 dark:bg-blue-900/10"
                        : file
                        ? "border-green-400 bg-green-50 dark:bg-green-900/10"
                        : "border-slate-200 dark:border-[#2a3044] hover:border-blue-400/60 hover:bg-slate-50 dark:hover:bg-[#232838]/60"
                    }`}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.heic,.pdf"
                      className="hidden"
                      onChange={e => handleFile(e.target.files[0])}
                    />
                    {file ? (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <FaCheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium truncate max-w-xs">{file.name}</span>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setFile(null); }}
                          className="ml-1 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-blue-500 dark:text-blue-400 font-medium">Click here or drag file to upload</p>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                    Supported formats: JPEG, PNG, HEIC, PDF. Max file size: 5MB.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-200 dark:border-[#2a3044] flex justify-end">
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={() => { if (canSubmit) onClose(); }}
                  className={`px-8 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    canSubmit
                      ? "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 hover:shadow-blue-500/30"
                      : "bg-slate-200 dark:bg-[#232838] text-slate-400 dark:text-slate-500 cursor-not-allowed"
                  }`}
                >
                  Submit
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Time Off Tab ─────────────────────────────────────────────────────────────

function TimeOffTab() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div>
      <RequestTimeOffModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Time off</h2>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-2 text-xs border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
            <FaCalendarAlt className="w-3 h-3" /> Team calendar
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
            <FaPlus className="w-3 h-3" /> Request time off
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">Time off balances</h3>
            <div className="flex items-start justify-between p-3 rounded-lg bg-slate-50 dark:bg-[#232838] mb-2">
              <div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  Vacation Turkey 20 days <FaInfoCircle className="w-3 h-3 text-slate-400" />
                </p>
                <button className="text-[11px] text-blue-500 hover:underline mt-0.5">View details ▼</button>
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">26.70 days available</span>
            </div>
            <button className="w-full py-2 text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
              View all
            </button>
          </Card>

          <Card className="p-4">
            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">Time off requests</h3>
            <div className="space-y-2">
              {TIME_OFF_REQUESTS.map((req) => (
                <div key={req.id} className="flex items-start gap-2.5 py-2 border-b border-slate-100 dark:border-[#2a3044] last:border-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    req.type === "sick"
                      ? "bg-blue-100 dark:bg-blue-900/30"
                      : "bg-amber-100 dark:bg-amber-900/30"
                  }`}>
                    {req.type === "sick"
                      ? <span className="text-sm">💊</span>
                      : <span className="text-sm">🏖️</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-blue-500">{req.period}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{req.label} · {req.duration}</p>
                  </div>
                  <Badge color="purple">Used</Badge>
                </div>
              ))}
            </div>
            <button className="w-full mt-2 py-2 text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
              View all
            </button>
          </Card>

          <Card className="p-4">
            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">Public holidays</h3>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <span className="text-base">🇹🇷</span>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Turkey public holidays</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">14 holidays in 2026</p>
              </div>
              <button className="ml-auto text-xs text-slate-400 border border-slate-200 dark:border-[#2a3044] px-2.5 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                View
              </button>
            </div>
          </Card>
        </div>

        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-[#232838] text-slate-500 transition-colors"><FaChevronLeft className="w-3 h-3" /></button>
                <button className="px-3 py-1 text-xs border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors text-slate-600 dark:text-slate-400">Today</button>
                <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-[#232838] text-slate-500 transition-colors"><FaChevronRight className="w-3 h-3" /></button>
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">March 2026</span>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                <div key={d} className="text-center text-[11px] font-medium text-slate-500 dark:text-slate-400 py-1">{d}</div>
              ))}
            </div>

            {MARCH_DAYS.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1 mb-1 relative">
                {week.map((day, di) => {
                  if (!day) return <div key={di} />;
                  const isToday = day === 28;
                  const isSick = day === 9 || day === 10;
                  const isVacation = day >= 23 && day <= 27;
                  const isHoliday = day === 20 || day === 21 || day === 22;
                  return (
                    <div key={di}
                      className={`min-h-[52px] p-1 rounded-lg relative ${
                        isToday ? "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-[#1c2030]" : ""
                      } ${
                        isSick ? "bg-purple-50 dark:bg-purple-900/10" :
                        isVacation ? "bg-amber-50 dark:bg-amber-900/10" :
                        isHoliday ? "bg-purple-50/50 dark:bg-purple-900/5" : ""
                      }`}>
                      <span className={`text-xs font-medium block text-center ${
                        isToday ? "text-blue-600 dark:text-blue-400 font-bold" :
                        day === 1 || day === 7 || day === 8 || day === 14 || day === 15 || day === 21 || day === 22 || day === 28 || day === 29
                          ? "text-slate-400 dark:text-slate-500"
                          : "text-slate-700 dark:text-slate-300"
                      }`}>
                        {day === 1 ? "1 Mar" : day}
                      </span>
                      {isSick && <div className="mt-0.5 px-1 py-0.5 rounded text-[9px] bg-purple-200 dark:bg-purple-800/40 text-purple-700 dark:text-purple-300 truncate">Sick leave</div>}
                      {isVacation && <div className="mt-0.5 px-1 py-0.5 rounded text-[9px] bg-amber-200 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300 truncate">Vacation</div>}
                      {isHoliday && <div className="mt-0.5 px-1 py-0.5 rounded text-[9px] bg-purple-200 dark:bg-purple-800/40 text-purple-700 dark:text-purple-300 truncate">Public holiday</div>}
                    </div>
                  );
                })}
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Documents Tab ────────────────────────────────────────────────────────────

function DocumentsTab() {
  const [docType] = useState("all");
  const [reqStatus] = useState("all");
  const [docStatus] = useState("all");

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Documents</h2>
        <button className="flex items-center gap-2 px-4 py-2 text-xs border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
          Add <FaPlus className="w-3 h-3" />
        </button>
      </div>

      {/* Needs attention */}
      <Card className="p-5 mb-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #78350f 0%, #92400e 100%)" }}>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <FaInfoCircle className="w-4 h-4 text-amber-300" />
            <h3 className="text-sm font-semibold text-amber-100">Documents requiring attention</h3>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-3 bg-amber-700/40 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-amber-500/30 flex items-center justify-center mb-2">
                <FaClipboardList className="w-5 h-5 text-amber-200" />
              </div>
              <p className="text-xs font-medium text-amber-100">Company Handbook</p>
              <button className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-200 border border-amber-400/40 px-2 py-1 rounded-lg hover:bg-amber-600/20 transition-colors">
                <FaPen className="w-2.5 h-2.5" /> Sign
              </button>
            </div>
          </div>
        </div>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20">
          <FaFolder className="w-24 h-24 text-amber-300" />
        </div>
      </Card>

      {/* Summary counts */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: "Compliance documents", count: 0, icon: FaCheckCircle },
          { label: "From your company",    count: 2, icon: FaBuilding    },
          { label: "Personal documents",   count: 1, icon: FaUserCircle  },
        ].map(({ label, count, icon: Icon }) => (
          <Card key={label} className="p-4 flex items-center gap-3">
            <Icon className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{count}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters + table */}
      <div className="flex items-center gap-3 mb-4">
        <button className="p-2 text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
          <FaSearch className="w-3.5 h-3.5" />
        </button>
        {["Document Type", "Requirement", "Document Status"].map(f => (
          <button key={f} className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
            {f} <FaChevronDown className="w-2.5 h-2.5" />
          </button>
        ))}
        <button className="ml-auto flex items-center gap-1.5 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
          Bulk action <FaChevronDown className="w-2.5 h-2.5" />
        </button>
        <button className="p-2 text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
          <FaExternalLinkAlt className="w-3.5 h-3.5" />
        </button>
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-[#2a3044]">
          <span className="text-xs text-slate-500 dark:text-slate-400">Total {DOCUMENTS.length} items</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-[#2a3044]">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">Document</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {DOCUMENTS.map((doc) => (
              <tr key={doc.id} className="border-b border-slate-100 dark:border-[#2a3044]/50 last:border-0 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <doc.icon className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{doc.name}</p>
                      {doc.subtitle && <p className="text-[11px] text-slate-500 dark:text-slate-400">{doc.subtitle}</p>}
                      {doc.type === "mandatory" && <Badge color="red">Mandatory</Badge>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {doc.status === "not_submitted" && (
                    <Badge color="slate">Not Submitted</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    {doc.actions.includes("sign") && (
                      <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                        <FaPen className="w-2.5 h-2.5" /> Sign
                      </button>
                    )}
                    {doc.actions.includes("preview") && (
                      <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                        <FaEye className="w-2.5 h-2.5" /> Preview
                      </button>
                    )}
                    {doc.actions.includes("download") && (
                      <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                        <FaDownload className="w-2.5 h-2.5" /> Download
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── Finance Tab ──────────────────────────────────────────────────────────────

function FinanceTab() {
  const [subTab, setSubTab] = useState("payslips");
  const subTabs = [
    { id: "payslips",  label: "Payslips and payments", icon: FaReceipt    },
    { id: "expenses",  label: "Expenses",               icon: FaDollarSign },
    { id: "bank",      label: "Bank accounts",          icon: FaUniversity },
  ];

  return (
    <div>
      <div className="flex items-center border-b border-slate-200 dark:border-[#2a3044] mb-5 gap-1">
        {subTabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setSubTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              subTab === id
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {subTab === "payslips" && (
        <Card className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 mb-4 opacity-40">
            <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
              <circle cx="50" cy="45" r="30" stroke="#6366f1" strokeWidth="3" fill="none" />
              <path d="M35 55 Q50 30 65 55" stroke="#a78bfa" strokeWidth="2.5" fill="none" />
              <circle cx="50" cy="42" r="4" fill="#6366f1" />
              <path d="M40 75 Q50 68 60 75" stroke="#6366f1" strokeWidth="2" fill="none" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">No payslips or payments yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">Once you complete a cycle you'll find your payslip and payment information here</p>
        </Card>
      )}

      {subTab === "expenses" && (
        <Card className="flex flex-col items-center justify-center py-20 text-center">
          <FaReceipt className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">No expenses submitted</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">Submit expense reports for reimbursement</p>
          <button className="mt-4 flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
            <FaPlus className="w-3 h-3" /> Add expense
          </button>
        </Card>
      )}

      {subTab === "bank" && (
        <Card className="flex flex-col items-center justify-center py-20 text-center">
          <FaUniversity className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">No bank accounts added</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">Add your bank account to receive payments</p>
          <button className="mt-4 flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
            <FaPlus className="w-3 h-3" /> Add bank account
          </button>
        </Card>
      )}
    </div>
  );
}


// ─── Interview Pipeline Tab ───────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { id: "pool",       label: "Candidate Pool", tailwind: "bg-slate-400",  hex: "#94a3b8" },
  { id: "screening",  label: "Screening",      tailwind: "bg-blue-400",   hex: "#60a5fa" },
  { id: "interview1", label: "Interview I",    tailwind: "bg-indigo-500", hex: "#6366f1" },
  { id: "interview2", label: "Interview II",   tailwind: "bg-purple-500", hex: "#a855f7" },
  { id: "technical",  label: "Technical",      tailwind: "bg-amber-500",  hex: "#f59e0b" },
  { id: "offer",      label: "Offer",          tailwind: "bg-orange-500", hex: "#f97316" },
  { id: "hired",      label: "Hired",          tailwind: "bg-green-500",  hex: "#22c55e" },
];

const DEFAULT_CRITERIA = [
  "Technical skills",
  "Communication",
  "Culture fit",
  "Problem solving",
  "Leadership potential",
];

const JOB_TYPES = [
  { value: "fulltime",  label: "Full-time"  },
  { value: "parttime",  label: "Part-time"  },
  { value: "contract",  label: "Contract"   },
  { value: "intern",    label: "Internship" },
];

const JOB_PRIORITIES = [
  { value: "urgent", label: "Urgent" },
  { value: "high",   label: "High"   },
  { value: "normal", label: "Normal" },
];

const CANDIDATE_SOURCES = [
  { value: "linkedin",  label: "LinkedIn"  },
  { value: "referral",  label: "Referral"  },
  { value: "jobboard",  label: "Job Board" },
  { value: "direct",    label: "Direct"    },
  { value: "other",     label: "Other"     },
];

const JOB_STATUS_COLORS = { open: "green", paused: "amber", closed: "red", filled: "blue" };
const PRIORITY_DOT       = { urgent: "bg-red-500", high: "bg-amber-500", normal: "bg-slate-400" };
const EMPLOYEE_COLORS    = ["#6366f1","#8b5cf6","#ec4899","#14b8a6","#f59e0b","#22c55e","#3b82f6","#ef4444"];
const CAND_COLORS        = ["#6366f1","#8b5cf6","#ec4899","#14b8a6","#f59e0b","#22c55e","#3b82f6"];

function StarRating({ rating, size = "sm", onClick }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <button
          key={s}
          type="button"
          onClick={onClick ? () => onClick(s) : undefined}
          className={onClick ? "cursor-pointer" : "cursor-default"}
        >
          {s <= (rating || 0)
            ? <FaStar    className={`${size === "sm" ? "w-3 h-3" : "w-4 h-4"} text-amber-400`} />
            : <FaRegStar className={`${size === "sm" ? "w-3 h-3" : "w-4 h-4"} text-slate-300 dark:text-slate-600`} />}
        </button>
      ))}
    </div>
  );
}

function CandidateCard({ candidate, dragProvided, onClick, scorecards }) {
  const hasSC    = scorecards.some(s => s.candidateId === candidate.id);
  const source   = CANDIDATE_SOURCES.find(s => s.value === candidate.source)?.label || candidate.source;
  const initials = (candidate.name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const colorIdx = candidate.name ? candidate.name.charCodeAt(0) % CAND_COLORS.length : 0;
  return (
    <div
      ref={dragProvided.innerRef}
      {...dragProvided.draggableProps}
      {...dragProvided.dragHandleProps}
      onClick={() => onClick(candidate)}
      className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-4 mb-3 cursor-pointer hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 hover:-translate-y-0.5 transition-all select-none group"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white shadow-sm"
          style={{ backgroundColor: CAND_COLORS[colorIdx] }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">{candidate.name}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{source}</p>
        </div>
        {hasSC && (
          <span title="Has scorecard" className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity">
            <FaClipboardList className="w-2.5 h-2.5 text-indigo-500" />
          </span>
        )}
      </div>
      {candidate.rating > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#2a3044]">
          <StarRating rating={candidate.rating} />
        </div>
      )}
    </div>
  );
}

function PipelineColumn({ stage, candidates, onCandidateClick, onAddCandidate, scorecards }) {
  return (
    <div className="flex flex-col w-64 flex-shrink-0">
      {/* Column header with accent top-border */}
      <div className={`rounded-t-xl px-4 py-3 border-t-[3px] bg-white dark:bg-[#1a1f2e] border-x border-b border-slate-200 dark:border-[#2a3044] mb-0`}
        style={{ borderTopColor: stage.hex }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{stage.label}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: stage.hex + "cc" }}
          >
            {candidates.length}
          </span>
        </div>
      </div>
      {/* Droppable body */}
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 rounded-b-xl p-3 min-h-[240px] transition-colors border-x border-b ${
              snapshot.isDraggingOver
                ? "bg-blue-50 dark:bg-blue-900/10 border-blue-300 dark:border-blue-700"
                : "bg-slate-50/60 dark:bg-[#141720] border-slate-200 dark:border-[#2a3044]"
            }`}
          >
            {candidates.map((cand, idx) => (
              <Draggable key={cand.id} draggableId={cand.id} index={idx}>
                {(drag) => (
                  <CandidateCard
                    candidate={cand}
                    dragProvided={drag}
                    onClick={onCandidateClick}
                    scorecards={scorecards}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {stage.id === "pool" && onAddCandidate && (
              <button
                onClick={onAddCandidate}
                className="w-full mt-1 py-2.5 text-xs text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/10 border border-dashed border-slate-200 dark:border-[#2a3044] hover:border-blue-300 dark:hover:border-blue-700"
              >
                <FaPlus className="w-2.5 h-2.5" /> Add candidate
              </button>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

function NewJobReqModal({ open, onClose, activeTasks }) {
  const { createJobReq } = useHR();
  const [title,     setTitle]     = useState("");
  const [dept,      setDept]      = useState("");
  const [type,      setType]      = useState("fulltime");
  const [priority,  setPriority]  = useState("normal");
  const [headcount, setHeadcount] = useState(1);
  const [location,  setLocation]  = useState("");
  const [desc,      setDesc]      = useState("");
  const [taskSearch,    setTaskSearch]    = useState("");
  const [linkedTaskId,  setLinkedTaskId]  = useState(null);
  const [showTaskDrop,  setShowTaskDrop]  = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(""); setDept(""); setType("fulltime"); setPriority("normal");
      setHeadcount(1); setLocation(""); setDesc(""); setTaskSearch(""); setLinkedTaskId(null);
    }
  }, [open]);

  const filteredTasks = useMemo(() =>
    (activeTasks || [])
      .filter(t => t.title?.toLowerCase().includes(taskSearch.toLowerCase()) || t.id?.toLowerCase().includes(taskSearch.toLowerCase()))
      .slice(0, 8)
  , [activeTasks, taskSearch]);

  const linkedTask = linkedTaskId ? (activeTasks || []).find(t => t.id === linkedTaskId) : null;

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await createJobReq({ title: title.trim(), department: dept.trim(), type, priority, headcount: Number(headcount) || 1, location: location.trim(), description: desc.trim(), linkedTaskId: linkedTaskId || null, hiringManager: "" });
    onClose();
  };

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }}
            className="bg-white dark:bg-[#1c2030] rounded-2xl border border-slate-200 dark:border-[#2a3044] w-full max-w-xl shadow-2xl"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#2a3044]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <FaUserTie className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">New Job Requisition</h2>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#232838] text-slate-400"><FaTimes className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Job title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Senior Frontend Engineer" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Department</label>
                  <input value={dept} onChange={e => setDept(e.target.value)} placeholder="e.g. Engineering" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Type</label>
                  <select value={type} onChange={e => setType(e.target.value)} className={inputCls}>
                    {JOB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Priority</label>
                  <select value={priority} onChange={e => setPriority(e.target.value)} className={inputCls}>
                    {JOB_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Headcount</label>
                  <input type="number" min={1} value={headcount} onChange={e => setHeadcount(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Location</label>
                  <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Remote" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Description</label>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Role overview, requirements..." className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                  <FaLink className="w-3 h-3" /> Link to project task <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                {linkedTask ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                    <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{linkedTask.id}</span>
                    <span className="text-xs text-slate-600 dark:text-slate-300 flex-1 truncate">{linkedTask.title}</span>
                    <button onClick={() => { setLinkedTaskId(null); setTaskSearch(""); }} className="text-slate-400 hover:text-red-500"><FaTimes className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      value={taskSearch}
                      onChange={e => { setTaskSearch(e.target.value); setShowTaskDrop(true); }}
                      onFocus={() => setShowTaskDrop(true)}
                      placeholder="Search tasks by title or ID..."
                      className={inputCls}
                    />
                    {showTaskDrop && taskSearch && filteredTasks.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredTasks.map(t => (
                          <button key={t.id} type="button"
                            onClick={() => { setLinkedTaskId(t.id); setShowTaskDrop(false); setTaskSearch(""); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors"
                          >
                            <span className="text-xs font-mono text-indigo-500 flex-shrink-0">{t.id}</span>
                            <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{t.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-[#2a3044] flex items-center justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#232838] rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSubmit} disabled={!title.trim()} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Create Requisition</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CandidateDetailModal({ open, candidate, jobReq, onClose, onAddScorecard, onHire }) {
  const { createCandidate, updateCandidate, moveCandidate } = useHR();
  const isNew = candidate?._new === true;
  const [name,       setName]       = useState("");
  const [email,      setEmail]      = useState("");
  const [phone,      setPhone]      = useState("");
  const [source,     setSource]     = useState("linkedin");
  const [resumeNote, setResumeNote] = useState("");
  const [notes,      setNotes]      = useState("");
  const [rating,     setRating]     = useState(null);

  useEffect(() => {
    if (!open || !candidate) return;
    if (isNew) { setName(""); setEmail(""); setPhone(""); setSource("linkedin"); setResumeNote(""); setNotes(""); setRating(null); }
    else { setName(candidate.name || ""); setEmail(candidate.email || ""); setPhone(candidate.phone || ""); setSource(candidate.source || "linkedin"); setResumeNote(candidate.resumeNote || ""); setNotes(candidate.notes || ""); setRating(candidate.rating || null); }
  }, [open, candidate, isNew]);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (isNew) await createCandidate({ jobReqId: candidate.jobReqId || jobReq?.id || "", name: name.trim(), email: email.trim(), phone: phone.trim(), source, resumeNote: resumeNote.trim(), notes: notes.trim(), rating });
    else await updateCandidate({ ...candidate, name, email, phone, source, resumeNote, notes, rating });
    onClose();
  };

  const stageIdx = candidate ? PIPELINE_STAGES.findIndex(s => s.id === candidate.stage) : -1;
  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <AnimatePresence>
      {open && candidate && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }}
            className="bg-white dark:bg-[#1c2030] rounded-2xl border border-slate-200 dark:border-[#2a3044] w-full max-w-lg shadow-2xl"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#2a3044]">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{isNew ? "Add Candidate" : "Candidate Details"}</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#232838] text-slate-400"><FaTimes className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
              {!isNew && stageIdx >= 0 && (
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                  {PIPELINE_STAGES.map((s, i) => (
                    <React.Fragment key={s.id}>
                      <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${
                        i === stageIdx ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" :
                        i < stageIdx  ? "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400" :
                        "bg-slate-100 dark:bg-[#232838] text-slate-400"
                      }`}>{s.label}</div>
                      {i < PIPELINE_STAGES.length - 1 && <FaArrowRight className="w-2 h-2 text-slate-300 dark:text-slate-600 flex-shrink-0" />}
                    </React.Fragment>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Full name *</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Email</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" type="email" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Phone</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+90 555 000 00 00" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Source</label>
                  <select value={source} onChange={e => setSource(e.target.value)} className={inputCls}>
                    {CANDIDATE_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Rating</label>
                  <StarRating rating={rating} size="md" onClick={setRating} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Resume / Link</label>
                <input value={resumeNote} onChange={e => setResumeNote(e.target.value)} placeholder="https://linkedin.com/in/..." className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Interview notes, impressions..." className={`${inputCls} resize-none`} />
              </div>
            </div>
            <div className={`px-6 py-4 border-t border-slate-100 dark:border-[#2a3044] flex items-center ${isNew ? "justify-end gap-3" : "justify-between"}`}>
              {!isNew && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => onAddScorecard(candidate)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors">
                    <FaClipboardList className="w-3 h-3" /> Scorecard
                  </button>
                  {candidate.stage !== "hired" && candidate.stage !== "rejected" && (
                    <>
                      <button onClick={() => { onHire(candidate); onClose(); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                        <FaUserCheck className="w-3 h-3" /> Hire
                      </button>
                      <button onClick={async () => { await moveCandidate(candidate.id, "rejected"); onClose(); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                        <FaThumbsDown className="w-3 h-3" /> Reject
                      </button>
                    </>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#232838] rounded-lg transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={!name.trim()} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  {isNew ? "Add Candidate" : "Save Changes"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ScorecardModal({ open, candidate, onClose }) {
  const { saveScorecard } = useHR();
  const { user } = useAuth();
  const [criteria,       setCriteria]       = useState([]);
  const [recommendation, setRecommendation] = useState("yes");
  const [generalNotes,   setGeneralNotes]   = useState("");

  useEffect(() => {
    if (open) {
      setCriteria(DEFAULT_CRITERIA.map(label => ({ label, score: 0, notes: "" })));
      setRecommendation("yes");
      setGeneralNotes("");
    }
  }, [open]);

  const overallScore = useMemo(() => {
    const scored = criteria.filter(c => c.score > 0);
    if (!scored.length) return 0;
    return Math.round(scored.reduce((s, c) => s + c.score, 0) / scored.length * 10) / 10;
  }, [criteria]);

  const updateCriterion = (idx, field, val) =>
    setCriteria(prev => prev.map((c, i) => i === idx ? { ...c, [field]: val } : c));

  const handleSubmit = async () => {
    await saveScorecard({ candidateId: candidate.id, jobReqId: candidate.jobReqId, interviewedBy: user?.uid || "unknown", criteria, overallScore, recommendation, notes: generalNotes });
    onClose();
  };

  const REC_OPTIONS = [
    { value: "strong_yes", label: "Strong Yes", cls: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700" },
    { value: "yes",        label: "Yes",        cls: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700" },
    { value: "no",         label: "No",         cls: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700" },
    { value: "strong_no",  label: "Strong No",  cls: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700" },
  ];

  return (
    <AnimatePresence>
      {open && candidate && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }}
            className="bg-white dark:bg-[#1c2030] rounded-2xl border border-slate-200 dark:border-[#2a3044] w-full max-w-2xl shadow-2xl"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#2a3044]">
              <div>
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Scorecard</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{candidate.name}</p>
              </div>
              <div className="flex items-center gap-3">
                {overallScore > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <FaStar className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{overallScore}</span>
                    <span className="text-xs text-amber-500">/5</span>
                  </div>
                )}
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#232838] text-slate-400"><FaTimes className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
              <div className="space-y-3">
                {criteria.map((c, idx) => (
                  <div key={c.label} className="flex items-start gap-4 py-3 border-b border-slate-100 dark:border-[#2a3044] last:border-0">
                    <div className="w-36 flex-shrink-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{c.label}</p>
                      <StarRating rating={c.score} size="md" onClick={s => updateCriterion(idx, "score", s)} />
                    </div>
                    <input value={c.notes} onChange={e => updateCriterion(idx, "notes", e.target.value)} placeholder="Notes..."
                      className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Recommendation</label>
                <div className="grid grid-cols-4 gap-2">
                  {REC_OPTIONS.map(r => (
                    <button key={r.value} type="button" onClick={() => setRecommendation(r.value)}
                      className={`px-2 py-2 text-xs font-medium rounded-lg border-2 transition-all ${recommendation === r.value ? r.cls : "border-slate-200 dark:border-[#2a3044] text-slate-500 hover:border-slate-300"}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">General notes</label>
                <textarea value={generalNotes} onChange={e => setGeneralNotes(e.target.value)} rows={3} placeholder="Overall impression..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-[#2a3044] flex items-center justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#232838] rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSubmit} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Save Scorecard</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function HireConfirmationModal({ open, candidate, jobReq, onClose }) {
  const { hireCandidate } = useHR();
  const { createUser }    = useApp();
  const [empName,   setEmpName]   = useState("");
  const [empEmail,  setEmpEmail]  = useState("");
  const [empTitle,  setEmpTitle]  = useState("");
  const [empColor,  setEmpColor]  = useState(EMPLOYEE_COLORS[0]);
  const [startDate, setStartDate] = useState("");
  const [empRole,   setEmpRole]   = useState("editor");
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (open && candidate) {
      setEmpName(candidate.name || "");
      setEmpEmail(candidate.email || "");
      setEmpTitle(jobReq?.title || "");
      setEmpColor(EMPLOYEE_COLORS[Math.floor(Math.random() * EMPLOYEE_COLORS.length)]);
      setStartDate(new Date().toISOString().split("T")[0]);
      setEmpRole("editor");
    }
  }, [open, candidate, jobReq]);

  const handleHire = async () => {
    if (!empName.trim() || !empEmail.trim()) return;
    setSaving(true);
    await hireCandidate(candidate.id);
    await createUser({ name: empName.trim(), email: empEmail.trim(), username: empEmail.trim().split("@")[0], color: empColor, role: empRole, status: "active", title: empTitle.trim(), joinedAt: startDate || new Date().toISOString() });
    setSaving(false);
    onClose();
  };

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <AnimatePresence>
      {open && candidate && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }}
            className="bg-white dark:bg-[#1c2030] rounded-2xl border border-slate-200 dark:border-[#2a3044] w-full max-w-md shadow-2xl"
          >
            <div className="px-6 py-5 text-center border-b border-slate-100 dark:border-[#2a3044]">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                <FaUserCheck className="w-6 h-6 text-green-500" />
              </div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Hire {candidate.name}?</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">This will add them as a team member.</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Full name *</label>
                  <input value={empName} onChange={e => setEmpName(e.target.value)} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Email *</label>
                  <input value={empEmail} onChange={e => setEmpEmail(e.target.value)} type="email" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Job title</label>
                  <input value={empTitle} onChange={e => setEmpTitle(e.target.value)} placeholder="Role / title" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Start date</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Permission role</label>
                <select value={empRole} onChange={e => setEmpRole(e.target.value)} className={inputCls}>
                  <option value="editor">Editor</option>
                  <option value="owner">Owner</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Avatar color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {EMPLOYEE_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setEmpColor(c)}
                      className={`w-7 h-7 rounded-full transition-all ${empColor === c ? "ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-[#1c2030] scale-110" : ""}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-[#2a3044] flex items-center justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#232838] rounded-lg transition-colors">Cancel</button>
              <button onClick={handleHire} disabled={!empName.trim() || !empEmail.trim() || saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <FaUserCheck className="w-3.5 h-3.5" />
                {saving ? "Hiring..." : "Hire & Add to Team"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function InterviewTab() {
  const { pipeline, moveCandidate } = useHR();
  const { activeTasks }             = useApp();
  const [selectedJobId,   setSelectedJobId]   = useState(null);
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [candModal,       setCandModal]       = useState(null);
  const [scorecardModal,  setScorecardModal]  = useState(null);
  const [hireModal,       setHireModal]       = useState(null);
  const [jobSearch,       setJobSearch]       = useState("");
  const boardRef = useRef(null);

  // Convert vertical mouse wheel → horizontal scroll (mouse users can't natively scroll horizontal)
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const { jobRequisitions, candidates, scorecards } = pipeline;

  const selectedJob = jobRequisitions.find(j => j.id === selectedJobId) || null;

  const boardCandidates = useMemo(() =>
    candidates.filter(c => c.jobReqId === selectedJobId && c.stage !== "rejected")
  , [candidates, selectedJobId]);

  const filteredJobs = useMemo(() =>
    jobRequisitions.filter(j =>
      !jobSearch ||
      j.title?.toLowerCase().includes(jobSearch.toLowerCase()) ||
      j.department?.toLowerCase().includes(jobSearch.toLowerCase())
    )
  , [jobRequisitions, jobSearch]);

  const handleDragEnd = useCallback(({ draggableId, source, destination }) => {
    if (!destination || destination.droppableId === source.droppableId) return;
    moveCandidate(draggableId, destination.droppableId);
  }, [moveCandidate]);

  const getLinkedTask = (taskId) => taskId ? (activeTasks || []).find(t => t.id === taskId) : null;
  const getCandCount  = (jobId)  => candidates.filter(c => c.jobReqId === jobId && c.stage !== "rejected").length;

  return (
    <div className="flex gap-6" style={{ minHeight: "70vh" }}>

      {/* ── Left: Job requisitions ────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Job Requisitions</h3>
          <button onClick={() => setShowNewJobModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaPlus className="w-2.5 h-2.5" /> New
          </button>
        </div>

        <div className="relative">
          <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <input value={jobSearch} onChange={e => setJobSearch(e.target.value)} placeholder="Search roles..."
            className="w-full pl-7 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-1.5 overflow-y-auto flex-1">
          {filteredJobs.length === 0 && (
            <div className="text-center py-8">
              <FaUserTie className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-xs text-slate-400 dark:text-slate-500">No requisitions yet</p>
              <button onClick={() => setShowNewJobModal(true)} className="mt-2 text-xs text-blue-500 hover:underline">Create one</button>
            </div>
          )}
          {filteredJobs.map(job => {
            const task       = getLinkedTask(job.linkedTaskId);
            const count      = getCandCount(job.id);
            const isSelected = job.id === selectedJobId;
            return (
              <button key={job.id} onClick={() => setSelectedJobId(job.id === selectedJobId ? null : job.id)}
                className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm"
                    : "border-transparent bg-white dark:bg-[#1c2030] hover:bg-slate-50 dark:hover:bg-[#232838] hover:border-slate-200 dark:hover:border-[#2a3044]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[job.priority] || "bg-slate-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">{job.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                      {job.department || "No department"} · {count} candidate{count !== 1 ? "s" : ""}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge color={JOB_STATUS_COLORS[job.status] || "slate"}>{job.status}</Badge>
                      {task && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                          <FaLink className="w-2 h-2" />{task.id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right: Pipeline board ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {!selectedJob ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-[#1a1f2e] flex items-center justify-center mx-auto mb-4">
                <FaUserTie className="w-7 h-7 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Select a job requisition</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">to see the hiring pipeline</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between flex-shrink-0 pb-2 border-b border-slate-200 dark:border-[#2a3044]">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{selectedJob.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {[selectedJob.department, JOB_TYPES.find(t => t.value === selectedJob.type)?.label, selectedJob.location, selectedJob.headcount > 1 ? `${selectedJob.headcount} open seats` : null].filter(Boolean).join("  ·  ")}
                </p>
              </div>
              <button onClick={() => setCandModal({ _new: true, jobReqId: selectedJobId })}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <FaUserPlus className="w-3.5 h-3.5" /> Add Candidate
              </button>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <div ref={boardRef} className="flex gap-4 overflow-x-auto pb-6" style={{ minWidth: 0 }}>
                {PIPELINE_STAGES.map(stage => (
                  <PipelineColumn
                    key={stage.id}
                    stage={stage}
                    candidates={boardCandidates.filter(c => c.stage === stage.id)}
                    onCandidateClick={cand => setCandModal(cand)}
                    onAddCandidate={stage.id === "pool" ? () => setCandModal({ _new: true, jobReqId: selectedJobId }) : undefined}
                    scorecards={scorecards}
                  />
                ))}
              </div>
            </DragDropContext>
          </>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────── */}
      <NewJobReqModal
        open={showNewJobModal}
        onClose={() => setShowNewJobModal(false)}
        activeTasks={activeTasks}
      />
      <CandidateDetailModal
        open={!!candModal}
        candidate={candModal}
        jobReq={selectedJob}
        onClose={() => setCandModal(null)}
        onAddScorecard={cand => { setCandModal(null); setScorecardModal(cand); }}
        onHire={cand => { setCandModal(null); setHireModal(cand); }}
      />
      <ScorecardModal
        open={!!scorecardModal}
        candidate={scorecardModal}
        onClose={() => setScorecardModal(null)}
      />
      <HireConfirmationModal
        open={!!hireModal}
        candidate={hireModal}
        jobReq={selectedJob}
        onClose={() => setHireModal(null)}
      />
    </div>
  );
}

// ─── Main HR Page ─────────────────────────────────────────────────────────────

const TABS = [
  { id: "overview",     label: "Overview",       icon: FaHome          },
  { id: "people",       label: "People",         icon: FaUserFriends   },
  { id: "orgchart",     label: "Org chart",      icon: FaSitemap       },
  { id: "profile",      label: "My profile",     icon: FaUserCircle    },
  { id: "contract",     label: "Contract",       icon: FaFileAlt       },
  { id: "timetracking", label: "Time tracking",  icon: FaClock         },
  { id: "timeoff",      label: "Time off",       icon: FaCalendarAlt   },
  { id: "documents",    label: "Documents",      icon: FaFolder        },
  { id: "finance",      label: "Finance",        icon: FaDollarSign    },
  { id: "interview",    label: "Interview",      icon: FaUserTie       },
];

export default function HRPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const { user, profile } = useAuth();
  const { users: rawUsers } = useApp();

  // Deduplicate by id (Firestore sync can produce duplicate entries)
  const users = useMemo(() => {
    const seen = new Set();
    return (rawUsers || []).filter(u => {
      if (!u.id || seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
  }, [rawUsers]);

  const currentUser = users.find(u => u.id === user?.uid || u.email === user?.email);
  const userName = profile?.fullName || currentUser?.name || user?.email?.split("@")[0] || "User";
  const userEmail = user?.email || "";

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-[#080b14]">
      {/* Page header */}
      <div className="bg-white dark:bg-[#0e1117] border-b border-slate-200 dark:border-[#2a3044] flex-shrink-0">
        <div className="px-6 pt-5 pb-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <FaBriefcase className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800 dark:text-slate-100">Human Resources</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Employee self-service portal</p>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-3 md:px-4 py-3 text-xs md:text-sm font-medium border-b-2 -mb-px transition-all whitespace-nowrap flex-shrink-0 ${
                  activeTab === id
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="px-6 py-6 max-w-7xl mx-auto">
          {activeTab === "overview"     && <OverviewTab userName={userName} />}
          {activeTab === "people"       && <PeopleTab employees={users || []} currentUserId={user?.uid} />}
          {activeTab === "orgchart"     && <OrgChartTab />}
          {activeTab === "profile"      && <MyProfileTab userName={userName} userEmail={userEmail} />}
          {activeTab === "contract"     && <ContractTab userName={userName} />}
          {activeTab === "timetracking" && <TimeTrackingTab />}
          {activeTab === "timeoff"      && <TimeOffTab />}
          {activeTab === "documents"    && <DocumentsTab />}
          {activeTab === "finance"      && <FinanceTab />}
          {activeTab === "interview"    && <InterviewTab />}
        </div>
      </div>
    </div>
  );
}
