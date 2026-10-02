import React, { memo, useMemo } from "react";
import {
  FaBolt, FaBug, FaCheckCircle, FaExternalLinkAlt, FaFlask, FaPlay, FaRandom, FaRobot,
} from "react-icons/fa";
import { requestNavigate } from "../../../shared/components/appNavigation";
import { BTN_GHOST, RESULT_META, RUN_STATUS_META } from "../constants/testingConstants";
import { Avatar, Chip, EmptyState, KpiCard, ResultBar, SectionCard } from "../components/ui";
import { ExecutionTrendChart, SequenceDots, StatusDonut } from "./charts";
import {
  automationCoverage, collectDefectLinks, collectExecutionEvents, countEventsSince, detectFlakyCases,
  executionTrend, latestPassRate, passRateBySuite, releaseQuality, statusDistribution, summarizeRun,
  testerWorkload, topFailingCases,
} from "../utils/testingMetrics";
import { DAY_MS, formatDueLabel, daysUntil, relativeTime, userLabel } from "../utils/testingFormat";
import { releaseVerdictLabel } from "../utils/testingReports";

const VERDICT_CHIP = {
  ready: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
  "in-progress": "bg-blue-500/10 text-blue-700 ring-blue-500/25 dark:text-blue-300",
  "at-risk": "bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300",
  "no-data": "bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300",
};

function CaseLink({ testCase, onOpen }) {
  if (!testCase) return <span className="text-sm text-slate-500">Deleted case</span>;
  return (
    <button type="button" onClick={() => onOpen(testCase.id)} className="flex min-w-0 items-baseline gap-2 text-left focus:outline-none focus-visible:underline">
      <span className="flex-shrink-0 font-mono text-[11px] text-slate-500">{testCase.key}</span>
      <span className="truncate text-sm text-slate-800 hover:text-blue-600 dark:hover:text-blue-400">{testCase.title}</span>
    </button>
  );
}

function OverviewTab({ ws }) {
  const { data, users, now, nav } = ws;
  const { cases, runs, caseById, latestMap, suiteById, rootIdOf, projectReleases, plans, planById } = data;

  const events = useMemo(() => collectExecutionEvents(runs), [runs]);
  const trend = useMemo(() => executionTrend(runs, { days: 30, now, events }), [runs, now, events]);
  const flaky = useMemo(() => detectFlakyCases(runs, { events }), [runs, events]);
  const failing = useMemo(() => topFailingCases(runs, { limit: 6, events }), [runs, events]);
  const workload = useMemo(() => testerWorkload(runs, { now, events }).slice(0, 6), [runs, now, events]);
  const distribution = useMemo(() => statusDistribution(cases.filter((testCase) => testCase.status !== "deprecated"), latestMap), [cases, latestMap]);
  const suites = useMemo(() => passRateBySuite(cases, latestMap, rootIdOf, suiteById), [cases, latestMap, rootIdOf, suiteById]);
  const automation = useMemo(() => automationCoverage(cases), [cases]);
  const passRate = useMemo(() => latestPassRate(latestMap), [latestMap]);
  const openDefects = useMemo(() => {
    const links = collectDefectLinks(cases, runs);
    let open = 0;
    links.forEach((_link, taskId) => {
      const task = data.taskById.get(String(taskId));
      if (task && task.status !== "done") open += 1;
    });
    return open;
  }, [cases, runs, data.taskById]);
  const weekStart = now.getTime() - 7 * DAY_MS;
  const thisWeek = countEventsSince(events, weekStart);
  const lastWeek = events.filter((event) => event.at >= weekStart - 7 * DAY_MS && event.at < weekStart).length;
  const activeCycles = useMemo(() => runs.filter((run) => run.status === "in-progress").map((run) => ({ run, summary: summarizeRun(run) })), [runs]);
  const readiness = useMemo(() => projectReleases
    .filter((release) => ["planned", "in-progress", "code-freeze"].includes(release.status) || plans.some((plan) => plan.releaseId === release.id))
    .map((release) => ({ release, quality: releaseQuality(release.id, { runs, plans, caseById }) }))
    .filter((item) => item.quality.runs.length || ["in-progress", "code-freeze"].includes(item.release.status))
    .slice(0, 5), [projectReleases, runs, plans, caseById]);

  const ready = cases.filter((testCase) => testCase.status === "ready").length;
  const drafts = cases.filter((testCase) => testCase.status === "draft").length;
  const activeTotal = distribution.reduce((sum, item) => sum + item.count, 0);
  const delta = thisWeek - lastWeek;

  return (
    <div className="space-y-5" data-testid="tests-overview">
      <section aria-label="Test metrics" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard icon={FaFlask} label="Test cases" value={cases.length} sub={`${ready} ready · ${drafts} draft`} tone="blue" onClick={() => nav.setTab("repository")} testId="kpi-total-cases" />
        <KpiCard icon={FaRobot} label="Automation" value={`${automation.percent}%`} sub={`${automation.automated} automated · ${automation.planned} planned`} tone="cyan" />
        <KpiCard icon={FaCheckCircle} label="Pass rate" value={passRate === null ? "—" : `${passRate}%`} sub="Latest result per case" tone={passRate === null ? "slate" : passRate >= 90 ? "green" : passRate >= 75 ? "amber" : "red"} testId="kpi-pass-rate" />
        <KpiCard icon={FaBolt} label="Executions (7d)" value={thisWeek} sub={lastWeek || thisWeek ? `${delta >= 0 ? "+" : ""}${delta} vs previous 7d` : "No executions yet"} tone="violet" />
        <KpiCard icon={FaBug} label="Open defects" value={openDefects} sub="Linked from tests" tone={openDefects ? "red" : "slate"} onClick={() => nav.setTab("defects")} />
        <KpiCard icon={FaRandom} label="Flaky cases" value={flaky.length} sub="Pass/fail flips in last 6 runs" tone={flaky.length ? "amber" : "slate"} />
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Execution trend" subtitle="Executions per day · last 30 days" className="xl:col-span-2" id="trend">
          {events.length ? <ExecutionTrendChart data={trend} /> : <EmptyState compact title="No executions yet" description="Run a cycle to see daily results here." />}
        </SectionCard>
        <SectionCard title="Latest results" subtitle="Most recent verdict per active case" id="donut">
          <StatusDonut distribution={distribution.filter((item) => item.count > 0 || ["passed", "failed", "untested"].includes(item.status))} centerValue={passRate === null ? "—" : `${passRate}%`} centerLabel={`pass rate · ${activeTotal} cases`} />
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <SectionCard title="Active cycles" subtitle={`${activeCycles.length} open`} id="cycles" bodyClassName="p-0">
          {activeCycles.length === 0 ? (
            <EmptyState compact title="No open cycles" description="Create a cycle from Plans & Cycles." />
          ) : (
            <ul className="divide-y divide-slate-200/70 dark:divide-[#252b3b]">
              {activeCycles.map(({ run, summary }) => {
                const days = daysUntil(run.dueDate, now);
                return (
                  <li key={run.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <button type="button" onClick={() => nav.openRunner(run.id)} className="min-w-0 truncate text-left text-sm font-medium text-slate-900 hover:text-blue-600 focus:outline-none focus-visible:underline dark:hover:text-blue-400">
                        {run.name}
                      </button>
                      <span className={`flex-shrink-0 text-[11px] font-medium tabular-nums ${days !== null && days < 0 ? "text-red-600 dark:text-red-400" : "text-slate-500"}`}>{formatDueLabel(run.dueDate, now)}</span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-slate-500">
                      {run.planId ? planById.get(run.planId)?.name || "Plan" : "Unplanned"} · {run.environment || "—"}{run.build ? ` · ${run.build}` : ""}
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <ResultBar counts={summary} total={summary.total} className="flex-1" />
                      <span className="w-10 text-right text-xs font-semibold tabular-nums text-slate-700">{summary.progress}%</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Pass rate by suite" subtitle="Latest result per case" id="suites">
          {suites.length === 0 ? <EmptyState compact title="No suites yet" /> : (
            <ul className="space-y-3">
              {suites.map((suite) => (
                <li key={suite.suiteId}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <button type="button" onClick={() => { nav.setFolder(suite.suiteId); nav.setTab("repository"); }} className="truncate font-medium text-slate-800 hover:text-blue-600 focus:outline-none focus-visible:underline dark:hover:text-blue-400">{suite.name}</button>
                    <span className="flex-shrink-0 tabular-nums text-xs text-slate-500">
                      <b className="text-slate-900">{suite.passRate === null ? "—" : `${suite.passRate}%`}</b> · {suite.total} cases
                    </span>
                  </div>
                  <ResultBar counts={suite} total={suite.total} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Release readiness" subtitle="Quality of releases under test" id="readiness" bodyClassName="p-0">
          {readiness.length === 0 ? (
            <EmptyState compact title="No releases under test" description="Link a test plan or cycle to a release to track its quality here." />
          ) : (
            <ul className="divide-y divide-slate-200/70 dark:divide-[#252b3b]">
              {readiness.map(({ release, quality }) => (
                <li key={release.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold text-slate-900">
                      {release.version}
                      {release.name && <span className="ml-1.5 font-normal text-slate-500">{release.name}</span>}
                    </span>
                    <Chip className={VERDICT_CHIP[quality.verdict]}>{releaseVerdictLabel(quality.verdict)}</Chip>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <ResultBar counts={quality} total={quality.total} className="flex-1" />
                    <span className="w-24 text-right text-xs tabular-nums text-slate-500">
                      {quality.passRate === null ? "—" : `${quality.passRate}% pass`}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="tabular-nums">{quality.executed}/{quality.total} executed · {quality.runs.length} cycle{quality.runs.length !== 1 ? "s" : ""}</span>
                    <button type="button" onClick={() => requestNavigate(`releases?release=${encodeURIComponent(release.id)}`)} className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline dark:text-blue-400">
                      Open release <FaExternalLinkAlt className="h-2 w-2" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Top failing cases" subtitle="Most failures across all executions" id="failing" bodyClassName="p-0">
          {failing.length === 0 ? <EmptyState compact title="No failures recorded" /> : (
            <ul className="divide-y divide-slate-200/70 dark:divide-[#252b3b]">
              {failing.map((item) => (
                <li key={item.caseId} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <CaseLink testCase={caseById.get(item.caseId)} onOpen={nav.openCase} />
                    <div className="text-[11px] text-slate-500">Last failed {relativeTime(item.lastFailedAt, now)}</div>
                  </div>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${RESULT_META.failed.chip} ring-1 ring-inset`}>{item.failures}×</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Flaky cases" subtitle="Results flip between pass and fail" id="flaky" bodyClassName="p-0">
          {flaky.length === 0 ? <EmptyState compact title="No flaky cases" description="Cases whose recent results flip pass ↔ fail show up here." /> : (
            <ul className="divide-y divide-slate-200/70 dark:divide-[#252b3b]">
              {flaky.slice(0, 6).map((item) => (
                <li key={item.caseId} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <CaseLink testCase={caseById.get(item.caseId)} onOpen={nav.openCase} />
                    <div className="text-[11px] text-slate-500">{item.flips} flips · flakiness {item.score}%</div>
                  </div>
                  <SequenceDots sequence={item.sequence} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Tester workload" subtitle="Open assignments · executed in last 7 days" id="workload">
          {workload.length === 0 ? <EmptyState compact title="No assignments" /> : (
            <ul className="space-y-3">
              {workload.map((item) => {
                const maxValue = Math.max(...workload.map((row) => row.open + row.executed), 1);
                return (
                  <li key={item.user} className="flex items-center gap-3">
                    <Avatar users={users} username={item.user} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate font-medium text-slate-800">{userLabel(users, item.user)}</span>
                        <span className="flex-shrink-0 tabular-nums text-slate-500"><b className="text-slate-900">{item.open}</b> open · {item.executed} done</span>
                      </div>
                      <div className="mt-1 flex h-1.5 gap-[2px] overflow-hidden rounded-full bg-slate-500/10">
                        <span className="rounded-l-full bg-blue-500" style={{ width: `${(item.open / maxValue) * 100}%` }} title={`${item.open} open`} />
                        <span className="rounded-r-full bg-emerald-500" style={{ width: `${(item.executed / maxValue) * 100}%` }} title={`${item.executed} executed`} />
                      </div>
                    </div>
                  </li>
                );
              })}
              <li className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-blue-500" />Open</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" />Executed (7d)</span>
              </li>
            </ul>
          )}
        </SectionCard>
      </div>

      {runs.length > 0 && (
        <SectionCard title="Recent cycles" subtitle="Latest activity across plans" id="recent" bodyClassName="p-0">
          <ul className="divide-y divide-slate-200/70 dark:divide-[#252b3b]">
            {runs.slice(0, 5).map((run) => {
              const summary = summarizeRun(run);
              return (
                <li key={run.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <Chip className={RUN_STATUS_META[run.status]?.chip}>{RUN_STATUS_META[run.status]?.label}</Chip>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{run.name}</span>
                  <span className="hidden text-xs text-slate-500 md:inline">{relativeTime(run.updatedAt || run.createdAt, now)}</span>
                  <ResultBar counts={summary} total={summary.total} className="w-32" />
                  <button type="button" onClick={() => nav.openRunner(run.id)} className={BTN_GHOST}>
                    <FaPlay className="h-2.5 w-2.5" /> {run.status === "in-progress" ? "Run" : "View"}
                  </button>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}

export default memo(OverviewTab);
