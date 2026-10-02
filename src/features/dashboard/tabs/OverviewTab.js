import React from "react";
import { FaChartLine, FaChartPie, FaTachometerAlt, FaUserAlt } from "react-icons/fa";
import { format } from "date-fns";
import KpiStrip from "../components/KpiStrip";
import SprintHealthCard from "../components/SprintHealthCard";
import BurndownChart from "../components/BurndownChart";
import Distribution from "../components/Distribution";
import AttentionPanel from "../components/AttentionPanel";
import WorkloadPanel from "../components/WorkloadPanel";
import VelocityChart from "../components/VelocityChart";
import DeliveryPanel from "../components/DeliveryPanel";
import EpicProgressList from "../components/EpicProgressList";
import ActivityFeed from "../components/ActivityFeed";
import { EmptyHint, Panel, PanelLink, TaskRow } from "../components/DashboardPrimitives";
import { parseValidDate } from "../utils/dashboardMetrics";

function MyWorkPanel({ tasks, currentUser, onOpenTask, limit = 7 }) {
  return (
    <Panel
      title="My work"
      icon={FaUserAlt}
      subtitle={tasks.length ? `${tasks.length} open item${tasks.length === 1 ? "" : "s"} assigned to you` : "Nothing assigned to you"}
      testId="my-work"
      className="h-full"
    >
      {tasks.length === 0 ? (
        <EmptyHint icon={FaUserAlt} title="You're all caught up">
          {currentUser ? "No open sprint tasks are assigned to you." : "Sign in to see your assignments."}
        </EmptyHint>
      ) : (
        <>
          <div className="-mx-2">
            {tasks.slice(0, limit).map((task) => {
              const due = parseValidDate(task.dueDate);
              return (
                <TaskRow
                  key={task.id}
                  task={task}
                  onOpen={onOpenTask}
                  showAssignee={false}
                  meta={due ? `Due ${format(due, "MMM d")}` : null}
                />
              );
            })}
          </div>
          {tasks.length > limit && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">+{tasks.length - limit} more</p>}
        </>
      )}
    </Panel>
  );
}

export default function OverviewTab({ data, actions }) {
  const { stats, health, sprint, burndownSnapshots, statusItems, workload, velocity, epicRows, release, testHealth, openDefects, access, currentUser } = data;
  const showDelivery = access.releases || access.tests;

  return (
    <div className="space-y-4">
      <KpiStrip stats={stats} onDrill={actions.drill} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SprintHealthCard sprint={sprint} health={health} stats={stats} onOpenBoard={actions.openBoard} />
        </div>
        <div className="lg:col-span-7">
          <Panel
            title="Sprint burndown"
            icon={FaChartLine}
            subtitle={`${stats.totalPoints - stats.donePoints} of ${stats.totalPoints} story points remaining`}
            action={<PanelLink onClick={() => actions.setTab("sprint")}>Sprint report</PanelLink>}
            className="h-full"
            testId="burndown-panel"
          >
            <BurndownChart tasks={stats.projectTasks} sprint={sprint} snapshots={burndownSnapshots} />
          </Panel>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <AttentionPanel stats={stats} onOpenTask={actions.openTask} />
        </div>
        <div className="lg:col-span-5">
          <Panel title="Status breakdown" icon={FaChartPie} subtitle={`${stats.total} work items · ${stats.backlogCount} in backlog`} className="h-full">
            <Distribution items={statusItems} total={stats.total} onSelect={(item) => actions.drill(`status:${item.key}`)} testId="status-distribution" />
          </Panel>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-4 ${showDelivery ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        <WorkloadPanel rows={workload} onSelectMember={(row) => actions.drill(`member:${row.key}`)} onViewAll={() => actions.setTab("team")} limit={5} />
        <Panel
          title="Velocity"
          icon={FaTachometerAlt}
          subtitle="Story points completed per sprint"
          action={<PanelLink onClick={() => actions.setTab("history")}>History</PanelLink>}
          className="h-full"
        >
          <VelocityChart velocity={velocity} compact />
        </Panel>
        {showDelivery && (
          <DeliveryPanel
            release={release}
            testHealth={testHealth}
            openDefects={openDefects}
            showReleases={access.releases}
            showTests={access.tests}
            onOpenReleases={access.releases ? actions.openReleases : null}
            onOpenTests={access.tests ? actions.openTests : null}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MyWorkPanel tasks={stats.myTasks} currentUser={currentUser} onOpenTask={actions.openTask} />
        <EpicProgressList rows={epicRows} limit={5} onViewAll={() => actions.setTab("epics")} onSelect={(epic) => actions.drill(`epic:${epic.id}`)} />
        <ActivityFeed entries={stats.recentActivity} onViewAll={access.activity ? actions.openActivity : null} />
      </div>
    </div>
  );
}
