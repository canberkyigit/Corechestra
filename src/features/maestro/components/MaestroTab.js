import React, { useMemo, useRef, useState } from "react";
import {
  FaArrowUp,
  FaAt,
  FaBook,
  FaBullseye,
  FaBuilding,
  FaCheck,
  FaClipboardList,
  FaColumns,
  FaComments,
  FaFlask,
  FaHandPaper,
  FaInfoCircle,
  FaLock,
  FaPaperclip,
  FaPlus,
  FaRegLightbulb,
  FaShieldAlt,
  FaTag,
  FaUsers,
} from "react-icons/fa";
import { useAuth } from "../../../shared/context/AuthContext";
import { Avatar } from "../../dashboard/components/DashboardPrimitives";
import MaestroMark, { MAESTRO_GRADIENT, MAESTRO_TEXT_GRADIENT, PreviewBadge } from "./MaestroMark";
import { buildMaestroSuggestions, buildPreviewAnswer, firstName, greetingFor } from "../utils/maestroPrompts";

const SUGGESTION_ICONS = {
  sprint: FaClipboardList,
  blocked: FaHandPaper,
  people: FaUsers,
  release: FaTag,
  standup: FaComments,
  goals: FaBullseye,
};

const CAPABILITIES = [
  { icon: FaClipboardList, title: "Summarize", text: "Sprints, retros, releases and long doc threads in seconds." },
  { icon: FaShieldAlt, title: "Spot risks early", text: "Blockers, overloaded people and slipping releases across projects." },
  { icon: FaComments, title: "Draft for you", text: "Stand-ups, status updates, release notes and goal check-ins." },
  { icon: FaRegLightbulb, title: "Answer anything", text: "Ask in plain language — Maestro finds it across every module." },
];

const CONTEXT_SOURCES = [
  { icon: FaColumns, label: "Board & sprints" },
  { icon: FaBook, label: "Documentation" },
  { icon: FaTag, label: "Releases" },
  { icon: FaFlask, label: "Tests" },
  { icon: FaBullseye, label: "Goals & portfolio" },
  { icon: FaBuilding, label: "HR availability" },
];

function SideCard({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-[#252b3b] dark:bg-[#1a1f2e]">
      <h2 className="mb-3 text-[13px] font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
      {children}
    </section>
  );
}

function SuggestionCard({ suggestion, onPick }) {
  const Icon = SUGGESTION_ICONS[suggestion.icon] || FaRegLightbulb;
  return (
    <button
      type="button"
      onClick={() => onPick(suggestion.title)}
      data-testid="maestro-suggestion"
      className="group flex min-w-0 items-start gap-3 rounded-xl border border-slate-200/80 bg-white/80 p-3.5 text-left backdrop-blur transition-all hover:-translate-y-px hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-500/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 dark:border-[#2a3044] dark:bg-[#141720]/80 dark:hover:border-indigo-500/40"
    >
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:group-hover:bg-indigo-500/20">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium leading-snug text-slate-800 dark:text-slate-100">{suggestion.title}</span>
        <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">{suggestion.context}</span>
      </span>
    </button>
  );
}

function PreviewExchange({ answer, userName }) {
  return (
    <div className="space-y-4" aria-label="Example of a Maestro answer">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200 dark:bg-[#2a3044]" />
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">How Maestro will answer</span>
        <span className="h-px flex-1 bg-slate-200 dark:bg-[#2a3044]" />
      </div>

      <div className="flex justify-end gap-2.5">
        <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-blue-600 px-3.5 py-2 text-sm text-white shadow-sm">{answer.question}</div>
        <Avatar name={userName || "You"} size={28} />
      </div>

      <div className="flex gap-2.5">
        <MaestroMark size={28} />
        <div className="min-w-0 max-w-[88%] rounded-2xl rounded-tl-md border border-slate-200/80 bg-white px-4 py-3 shadow-sm dark:border-[#2a3044] dark:bg-[#141720]">
          <div className="mb-1.5 flex items-center gap-2">
            <span className={`text-xs font-semibold ${MAESTRO_TEXT_GRADIENT}`}>Maestro</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:bg-[#232838] dark:text-slate-400">Example</span>
          </div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{answer.headline}</p>
          <ul className="mt-2 space-y-1.5">
            {answer.points.map((point) => (
              <li key={point} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-indigo-400" aria-hidden="true" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5 dark:border-[#232838]">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Sources</span>
            {answer.sources.map((source) => (
              <span key={source} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-[#232838] dark:text-slate-300">{source}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Maestro — the workspace assistant. This is a design preview: no AI model is
 * connected, so the composer never sends anything; it explains that instead.
 */
export default function MaestroTab({ data, projectName }) {
  const { profile, user } = useAuth();
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState(false);
  const inputRef = useRef(null);
  const [now] = useState(() => new Date());

  const displayName = profile?.fullName || profile?.displayName || data?.currentUser || user?.email || "";
  const name = firstName(displayName);
  const suggestions = useMemo(() => buildMaestroSuggestions({ data, projectName }), [data, projectName]);
  const answer = useMemo(() => buildPreviewAnswer({ data, projectName }), [data, projectName]);

  const pick = (text) => {
    setDraft(text);
    setNotice(false);
    inputRef.current?.focus();
  };
  const send = () => {
    if (!draft.trim()) return;
    setNotice(true);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]" data-testid="maestro-tab">
      <section className="relative flex min-h-[680px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-[#252b3b] dark:bg-[#1a1f2e]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(99,102,241,0.12),transparent)] dark:bg-[radial-gradient(60%_100%_at_50%_0%,rgba(99,102,241,0.18),transparent)]" aria-hidden="true" />

        <header className="relative flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-[#232838]">
          <div className="flex min-w-0 items-center gap-2.5">
            <MaestroMark size={30} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Maestro</h2>
                <PreviewBadge />
              </div>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">Your workspace conductor</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500 sm:inline-flex dark:border-[#2a3044] dark:bg-[#141720] dark:text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden="true" />
              No AI model connected
            </span>
            <button type="button" disabled className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-400 dark:border-[#2a3044] dark:text-slate-500" title="Available once Maestro is connected">
              <FaPlus className="h-2.5 w-2.5" /> New chat
            </button>
          </div>
        </header>

        <div className="relative flex-1 overflow-y-auto px-5 py-8 sm:px-8">
          <div className="mx-auto max-w-3xl space-y-8">
            <div className="flex flex-col items-center text-center">
              <MaestroMark size={60} halo />
              <h3 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {greetingFor(now)}{name ? `, ${name}` : ""}.
              </h3>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                I'm <span className={`font-semibold ${MAESTRO_TEXT_GRADIENT}`}>Maestro</span>. I keep every part of {projectName || "your workspace"} in tune — ask me about sprints, people, releases, tests and goals.
              </p>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {suggestions.map((suggestion) => <SuggestionCard key={suggestion.id} suggestion={suggestion} onPick={pick} />)}
            </div>

            <PreviewExchange answer={answer} userName={displayName} />
          </div>
        </div>

        <div className="relative border-t border-slate-100 bg-white/90 px-4 pb-4 pt-3 backdrop-blur dark:border-[#232838] dark:bg-[#1a1f2e]/90 sm:px-6">
          <div className="mx-auto max-w-3xl">
            {notice && (
              <div role="status" className="mb-2.5 flex items-start gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3.5 py-2.5 text-xs text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
                <FaInfoCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                <span>
                  <span className="font-semibold">Maestro isn't connected to an AI model yet.</span> Your message wasn't sent anywhere. Answers will appear here once a model is connected for this workspace.
                </span>
              </div>
            )}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:border-[#2a3044] dark:bg-[#141720] dark:focus-within:border-indigo-500/60">
              <textarea
                ref={inputRef}
                rows={2}
                value={draft}
                onChange={(event) => { setDraft(event.target.value); setNotice(false); }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    send();
                  }
                }}
                placeholder={`Ask Maestro anything about ${projectName || "your workspace"}…`}
                aria-label="Message Maestro"
                className="block w-full resize-none rounded-t-2xl bg-transparent px-4 pt-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder-slate-500"
              />
              <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
                <div className="flex items-center gap-1">
                  {[{ icon: FaAt, label: "Mention a person or item" }, { icon: FaPaperclip, label: "Attach a file" }].map(({ icon: Icon, label }) => (
                    <button key={label} type="button" disabled title={`${label} — available once Maestro is connected`} aria-label={label} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 disabled:cursor-not-allowed dark:text-slate-500">
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  ))}
                  <span className="ml-1 hidden items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 sm:inline-flex dark:bg-[#232838] dark:text-slate-300">
                    <FaColumns className="h-2.5 w-2.5" aria-hidden="true" />
                    {projectName || "Workspace"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden text-[11px] text-slate-400 sm:inline dark:text-slate-500">Enter to send · Shift+Enter for a new line</span>
                  <button
                    type="button"
                    onClick={send}
                    disabled={!draft.trim()}
                    aria-label="Send to Maestro"
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-40 ${MAESTRO_GRADIENT}`}
                  >
                    <FaArrowUp className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
              Maestro is in preview. It will only ever see what you have permission to see.
            </p>
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <section className={`relative overflow-hidden rounded-2xl p-4 text-white shadow-lg shadow-indigo-500/20 ${MAESTRO_GRADIENT}`}>
          <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70">Coming soon</p>
          <p className="mt-1 text-[15px] font-semibold leading-snug">One assistant that hears the whole orchestra.</p>
          <p className="mt-1.5 text-xs leading-relaxed text-white/80">
            Maestro will connect boards, docs, releases, tests, goals and HR — so the answer to “are we on track?” is one question away.
          </p>
        </section>

        <SideCard title="What Maestro will do">
          <ul className="space-y-3">
            {CAPABILITIES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                  <Icon className="h-3 w-3" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-slate-800 dark:text-slate-100">{title}</span>
                  <span className="block text-xs leading-relaxed text-slate-500 dark:text-slate-400">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </SideCard>

        <SideCard title="Context Maestro reads">
          <ul className="grid grid-cols-1 gap-1.5">
            {CONTEXT_SOURCES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-600 dark:bg-[#141720] dark:text-slate-300">
                <Icon className="h-3 w-3 text-slate-400" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                <FaCheck className="h-2.5 w-2.5 text-emerald-500" aria-hidden="true" />
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            <FaLock className="mt-0.5 h-2.5 w-2.5 flex-shrink-0" aria-hidden="true" />
            Permission-aware: Maestro answers only from modules and records you can already open.
          </p>
        </SideCard>
      </aside>
    </div>
  );
}

/** Compact entry point shown on top of the Overview tab. */
export function MaestroLauncher({ projectName, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid="maestro-launcher"
      className="no-print group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-indigo-200/70 bg-gradient-to-r from-violet-50 via-indigo-50/60 to-blue-50 px-4 py-3 text-left transition-all hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 dark:border-indigo-500/20 dark:from-violet-500/10 dark:via-indigo-500/10 dark:to-blue-500/10 dark:hover:border-indigo-500/40"
    >
      <MaestroMark size={32} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${MAESTRO_TEXT_GRADIENT}`}>Ask Maestro</span>
          <PreviewBadge />
        </span>
        <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
          “Summarize {projectName ? `${projectName}'s` : "this"} sprint”, “Who is overloaded?”, “Is the next release ready?”
        </span>
      </span>
      <span className="hidden flex-shrink-0 items-center gap-1.5 rounded-lg bg-white/80 px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm ring-1 ring-indigo-200/70 transition-colors group-hover:bg-white sm:inline-flex dark:bg-[#141720]/80 dark:text-indigo-300 dark:ring-indigo-500/30">
        Open Maestro <FaArrowUp className="h-2.5 w-2.5 rotate-45" aria-hidden="true" />
      </span>
    </button>
  );
}
