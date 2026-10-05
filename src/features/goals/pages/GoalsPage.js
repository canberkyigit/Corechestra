import React, { useCallback, useMemo, useState } from "react";
import { FaBullseye, FaList, FaMagic, FaPlus, FaSearch, FaSitemap } from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { usePermissions } from "../../../shared/context/hooks/usePermissions";
import { useToast } from "../../../shared/context/ToastContext";
import { DashboardSkeleton } from "../../../shared/components/Skeleton";
import GoalCard from "../components/GoalCard";
import GoalTree from "../components/GoalTree";
import GoalDrawer from "../components/GoalDrawer";
import GoalEditor from "../components/GoalEditor";
import { useGoalsData } from "../hooks/useGoalsData";
import {
  GOAL_LEVELS,
  GOAL_LEVEL_META,
  HEALTH_META,
  buildGoalTree,
  daysLeftInPeriod,
  matchesGoalQuery,
  periodLabel,
  periodOptions,
  quarterKey,
  summarizeGoals,
} from "../utils/goalModel";
import { buildSampleGoals } from "../utils/sampleGoals";
import {
  FIELD_CLS,
  GHOST_BTN,
  PageHeader,
  PRIMARY_BTN,
  ScoreRing,
  SECONDARY_BTN,
  Segmented,
  StatTile,
} from "../components/StrategyPrimitives";

const ALL = "all";

function EmptyGoals({ canEdit, onCreate, onSample }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white px-6 py-14 text-center dark:border-[#252b3b] dark:bg-[#1a1f2e]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.08),transparent_60%)]" aria-hidden="true" />
      <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20">
        <FaBullseye className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 className="relative mt-4 text-lg font-semibold text-slate-900 dark:text-white">Point every team at the same horizon</h2>
      <p className="relative mx-auto mt-1.5 max-w-md text-sm text-slate-500 dark:text-slate-400">
        Set company objectives, let teams and projects align under them, and track key results that update straight from the work on your boards.
      </p>
      {canEdit ? (
        <div className="relative mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" className={PRIMARY_BTN} onClick={onCreate}><FaPlus className="h-3 w-3" /> New goal</button>
          <button type="button" className={SECONDARY_BTN} onClick={onSample}><FaMagic className="h-3 w-3" /> Add sample OKRs</button>
        </div>
      ) : (
        <p className="relative mt-6 text-xs text-slate-500 dark:text-slate-400">No goals have been set for this period yet.</p>
      )}
    </div>
  );
}

export default function GoalsPage() {
  const {
    dbReady, goals, users, teams, projects, epics, activeTasks, currentUser, currentProjectId,
    createGoal, updateGoal, deleteGoal, updateKeyResult, addGoalCheckIn, importGoals, removeSampleGoals,
  } = useApp();
  const { canPerform } = usePermissions();
  const { addToast } = useToast();
  const canEdit = canPerform("goals:manage");
  const [now] = useState(() => new Date());

  const [period, setPeriod] = useState(() => quarterKey(now));
  const [level, setLevel] = useState(ALL);
  const [healthFilter, setHealthFilter] = useState(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState("list");
  const [mineOnly, setMineOnly] = useState(false);
  const [openGoalId, setOpenGoalId] = useState(null);
  const [editor, setEditor] = useState(null); // { goal?: Goal }

  const { derived, workIndex } = useGoalsData({ goals, activeTasks, now });

  const activeUsers = useMemo(
    () => (users || []).filter((user) => user && user.username && user.status !== "inactive" && user.status !== "deleted"),
    [users]
  );
  const ownerName = useCallback((username) => {
    if (!username) return "";
    const user = (users || []).find((item) => item.username === username || item.id === username);
    return user?.name || username;
  }, [users]);
  const epicsById = useMemo(() => new Map((epics || []).map((epic) => [String(epic.id), epic])), [epics]);

  const inPeriod = useMemo(() => derived.filter((goal) => period === ALL || goal.period === period), [derived, period]);
  const summary = useMemo(() => summarizeGoals(inPeriod), [inPeriod]);
  const visible = useMemo(() => inPeriod.filter((goal) => (
    (level === ALL || goal.level === level)
    && (!healthFilter || goal.healthKey === healthFilter)
    && (!mineOnly || String(goal.ownerId || "").toLowerCase() === String(currentUser || "").toLowerCase())
    && matchesGoalQuery(goal, query)
  )), [inPeriod, level, healthFilter, mineOnly, currentUser, query]);
  const tree = useMemo(() => buildGoalTree(visible), [visible]);
  const titleById = useMemo(() => new Map(derived.map((goal) => [goal.id, goal.title])), [derived]);
  const hasSamples = (goals || []).some((goal) => goal.sample);
  const openGoal = openGoalId ? derived.find((goal) => goal.id === openGoalId) : null;

  const periods = useMemo(() => {
    const list = new Set(periodOptions(now));
    (goals || []).forEach((goal) => goal.period && list.add(goal.period));
    return [...list].sort();
  }, [goals, now]);

  const daysLeft = period !== ALL ? daysLeftInPeriod(period, now) : null;

  const handleSave = (draft) => {
    if (editor?.goal) {
      updateGoal(editor.goal.id, draft);
      addToast("Goal updated", "success");
    } else {
      const created = createGoal(draft);
      addToast("Goal created", "success");
      if (created?.period && period !== ALL && created.period !== period) setPeriod(created.period);
    }
    setEditor(null);
  };

  const handleDelete = (goal) => {
    if (!window.confirm(`Delete "${goal.title}"? Aligned goals move up one level.`)) return;
    deleteGoal(goal.id);
    setOpenGoalId(null);
    addToast("Goal deleted", "success");
  };

  const handleSample = () => {
    importGoals(buildSampleGoals({ projects, teams, epics, users: activeUsers, currentUser, now }));
    setPeriod(quarterKey(now));
    addToast("Sample OKRs added. Remove them any time from this page.", "success");
  };

  if (!dbReady) return <DashboardSkeleton />;

  const levelCounts = Object.fromEntries(GOAL_LEVELS.map((key) => [key, inPeriod.filter((goal) => goal.level === key).length]));
  const avgColor = summary.avgProgress >= 70 ? HEALTH_META["on-track"].hex : summary.avgProgress >= 40 ? "#2563eb" : HEALTH_META["at-risk"].hex;
  const toggleHealth = (key) => setHealthFilter((current) => (current === key ? null : key));

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-4 md:p-6">
      <PageHeader
        kicker="Strategy"
        title="Goals"
        subtitle={(
          <>
            Objectives & key results · {period === ALL ? "All periods" : periodLabel(period)}
            {daysLeft !== null && daysLeft > 0 && <> · <span className="text-slate-600 dark:text-slate-300">{daysLeft} days left</span></>}
          </>
        )}
        actions={(
          <>
            <select aria-label="Period" className={`${FIELD_CLS} py-1.5 pr-8`} value={period} onChange={(event) => setPeriod(event.target.value)}>
              {periods.map((key) => <option key={key} value={key}>{periodLabel(key)}</option>)}
              <option value={ALL}>All periods</option>
            </select>
            {hasSamples && canEdit && (
              <button type="button" className={SECONDARY_BTN} onClick={() => { removeSampleGoals(); addToast("Sample OKRs removed", "success"); }}>
                Remove samples
              </button>
            )}
            {canEdit && (
              <button type="button" className={PRIMARY_BTN} onClick={() => setEditor({})}>
                <FaPlus className="h-3 w-3" /> New goal
              </button>
            )}
          </>
        )}
      />

      {(goals || []).length === 0 ? (
        <EmptyGoals canEdit={canEdit} onCreate={() => setEditor({})} onSample={handleSample} />
      ) : (
        <>
          <section aria-label="Goal summary" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <StatTile label="Objectives" value={summary.total} sub={`${summary.keyResults} key results`} />
            <StatTile label="Average progress" value={`${summary.avgProgress}%`} sub={period !== ALL ? `Across ${periodLabel(period)}` : "Across all periods"}>
              <span className="absolute right-4 top-4">
                <ScoreRing value={summary.avgProgress} size={40} stroke={4} color={avgColor} label="Average progress"><span /></ScoreRing>
              </span>
            </StatTile>
            {["on-track", "at-risk", "off-track"].map((key) => (
              <StatTile
                key={key}
                label={HEALTH_META[key].label}
                value={summary.counts[key] || 0}
                accent={HEALTH_META[key].hex}
                sub={summary.total ? `${Math.round(((summary.counts[key] || 0) / summary.total) * 100)}% of objectives` : "—"}
                onClick={() => toggleHealth(key)}
                active={healthFilter === key}
              />
            ))}
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              ariaLabel="Goal level"
              value={level}
              onChange={setLevel}
              options={[
                { id: ALL, label: "All", count: inPeriod.length },
                ...GOAL_LEVELS.map((key) => ({ id: key, label: GOAL_LEVEL_META[key].label, count: levelCounts[key] })),
              ]}
            />
            <button
              type="button"
              aria-pressed={mineOnly}
              onClick={() => setMineOnly((value) => !value)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                mineOnly
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500/60 dark:bg-blue-500/10 dark:text-blue-300"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-[#2a3044] dark:bg-[#1a1f2e] dark:text-slate-300"
              }`}
            >
              Owned by me
            </button>
            {healthFilter && (
              <button type="button" className={GHOST_BTN} onClick={() => setHealthFilter(null)}>
                Clear “{HEALTH_META[healthFilter].label}” filter ×
              </button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <label className="relative">
                <FaSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="search"
                  aria-label="Search goals"
                  placeholder="Search goals…"
                  className={`${FIELD_CLS} w-48 py-1.5 pl-7 sm:w-60`}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <Segmented
                ariaLabel="View"
                value={view}
                onChange={setView}
                options={[{ id: "list", label: "Cards", icon: FaList }, { id: "tree", label: "Alignment", icon: FaSitemap }]}
              />
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-12 text-center dark:border-[#2a3044]">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No goals match these filters</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Try another period, level or search term.</p>
            </div>
          ) : view === "tree" ? (
            <GoalTree tree={tree} teams={teams} projects={projects} ownerName={ownerName} onOpen={setOpenGoalId} />
          ) : (
            <div className="space-y-6">
              {GOAL_LEVELS.filter((key) => level === ALL || key === level).map((key) => {
                const list = visible.filter((goal) => goal.level === key);
                if (!list.length) return null;
                return (
                  <section key={key} aria-label={`${GOAL_LEVEL_META[key].label} goals`}>
                    <h2 className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                      {GOAL_LEVEL_META[key].label} goals
                      <span className="rounded bg-slate-100 px-1.5 text-[10px] tabular-nums text-slate-500 dark:bg-[#232838] dark:text-slate-400">{list.length}</span>
                    </h2>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {list.map((goal) => (
                        <GoalCard
                          key={goal.id}
                          goal={goal}
                          teams={teams}
                          projects={projects}
                          ownerName={ownerName(goal.ownerId)}
                          parentTitle={goal.parentId ? titleById.get(goal.parentId) : null}
                          onOpen={setOpenGoalId}
                          now={now}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      {openGoal && (
        <GoalDrawer
          goal={openGoal}
          goals={derived}
          teams={teams}
          projects={projects}
          epicsById={epicsById}
          workIndex={workIndex}
          ownerName={ownerName}
          canEdit={canEdit}
          now={now}
          onClose={() => setOpenGoalId(null)}
          onEdit={() => setEditor({ goal: (goals || []).find((goal) => goal.id === openGoal.id) })}
          onDelete={() => handleDelete(openGoal)}
          onUpdateKeyResult={updateKeyResult}
          onCheckIn={(goalId, data) => { addGoalCheckIn(goalId, data); addToast("Check-in posted", "success"); }}
          onOpenGoal={setOpenGoalId}
        />
      )}

      {editor && (
        <GoalEditor
          open
          goal={editor.goal}
          goals={derived}
          defaults={{ period: period === ALL ? quarterKey(now) : period, ownerId: currentUser, projectId: currentProjectId, level: level === ALL ? "company" : level }}
          users={activeUsers}
          teams={teams}
          projects={projects}
          epics={epics}
          onSave={handleSave}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}
