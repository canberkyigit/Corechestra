import React, { useMemo, useState } from "react";
import { useApp } from "../../../shared/context/AppContext";
import { usePermissions } from "../../../shared/context/hooks/usePermissions";
import { DashboardSkeleton } from "../../../shared/components/Skeleton";
import { useDashboardData } from "../../dashboard/hooks/useDashboardData";
import MaestroChat from "../components/MaestroChat";

/** Maestro, the workspace assistant (design preview — no AI model connected). */
export default function MaestroPage() {
  const app = useApp();
  const { dbReady, projects, currentProjectId } = app;
  const { canAccessModule } = usePermissions();
  const [now] = useState(() => new Date());

  const access = useMemo(() => ({
    releases: canAccessModule ? canAccessModule("releases") : true,
    tests: canAccessModule ? canAccessModule("tests") : true,
    activity: canAccessModule ? canAccessModule("activity") : true,
  }), [canAccessModule]);

  const data = useDashboardData(app, { now, access });
  const project = (projects || []).find((item) => item.id === currentProjectId);

  if (!dbReady) return <DashboardSkeleton />;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 lg:overflow-hidden">
      <div className="mx-auto max-w-[1400px] lg:h-full">
        <MaestroChat data={data} projectName={project?.name} />
      </div>
    </div>
  );
}
