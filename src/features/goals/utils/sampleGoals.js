import { quarterKey } from "./goalModel";

/**
 * A small, realistic OKR tree built from the workspace's own projects, teams,
 * epics and people. Every record is flagged `sample: true` (ids `goal-sample-*`)
 * so it can be removed again in one click.
 */
export function buildSampleGoals({ projects = [], teams = [], epics = [], users = [], currentUser, now = new Date() }) {
  const period = quarterKey(now);
  const createdAt = now.toISOString();
  const people = users.filter((user) => user && user.username && user.status !== "inactive" && user.status !== "deleted");
  const owner = (index) => people[index % Math.max(1, people.length)]?.username || currentUser || null;
  let counter = 0;
  const kr = (data) => ({ id: `kr-sample-${(counter += 1)}`, ...data });
  const base = (id, data) => ({
    id: `goal-sample-${id}`,
    description: "",
    teamId: null,
    projectId: null,
    parentId: null,
    period,
    health: null,
    checkIns: [],
    createdBy: currentUser || null,
    createdAt,
    updatedAt: createdAt,
    sample: true,
    ...data,
  });

  const goals = [
    base("company-1", {
      title: "Become the platform teams love to plan in",
      description: "Grow weekly active teams and make planning feel effortless.",
      level: "company",
      ownerId: owner(0),
      keyResults: [
        kr({ title: "Weekly active teams", type: "metric", start: 40, target: 120, current: 86, unit: "teams" }),
        kr({ title: "Customer satisfaction (CSAT)", type: "metric", start: 72, target: 90, current: 81, unit: "%" }),
        kr({ title: "Launch the public roadmap", type: "milestone", done: false }),
      ],
      checkIns: [{ id: "chk-sample-1", at: createdAt, by: owner(0), health: null, note: "Adoption is ahead of plan after the onboarding revamp.", progress: null }],
    }),
    base("company-2", {
      title: "Ship with confidence on every release",
      description: "Fewer escaped defects, faster and safer releases.",
      level: "company",
      ownerId: owner(1),
      keyResults: [
        kr({ title: "Escaped defects per release", type: "metric", start: 12, target: 3, current: 7, unit: "bugs" }),
        kr({ title: "Automated regression coverage", type: "metric", start: 35, target: 80, current: 52, unit: "%" }),
      ],
      health: "at-risk",
      checkIns: [{ id: "chk-sample-2", at: createdAt, by: owner(1), health: "at-risk", note: "Regression coverage is behind plan — QA capacity is short this month.", progress: null }],
    }),
  ];

  teams.slice(0, 2).forEach((team, index) => {
    goals.push(base(`team-${index + 1}`, {
      title: index === 0 ? `${team.name}: cut cycle time in half` : `${team.name}: zero critical bugs in production`,
      level: "team",
      teamId: team.id,
      parentId: index === 0 ? "goal-sample-company-1" : "goal-sample-company-2",
      ownerId: (team.memberNames || [])[0] || owner(index + 2),
      keyResults: index === 0
        ? [
          kr({ title: "Median cycle time", type: "metric", start: 6, target: 3, current: 4.5, unit: "days" }),
          kr({ title: "Work in progress limit adopted", type: "milestone", done: true }),
        ]
        : [
          kr({ title: "Open critical bugs", type: "metric", start: 8, target: 0, current: 3, unit: "bugs" }),
          kr({ title: "On-call runbook published", type: "milestone", done: false }),
        ],
    }));
  });

  projects.slice(0, 3).forEach((project, index) => {
    const projectEpics = epics.filter((epic) => epic.projectId === project.id).slice(0, 2);
    const keyResults = [];
    if (projectEpics.length) {
      keyResults.push(kr({ title: `Deliver ${projectEpics.map((epic) => epic.title).join(" & ")}`, type: "work", epicIds: projectEpics.map((epic) => String(epic.id)) }));
    }
    keyResults.push(kr({ title: "Sprint predictability", type: "metric", start: 60, target: 90, current: 70 + index * 6, unit: "%" }));
    keyResults.push(kr({ title: index === 0 ? "Beta shipped to design partners" : "Release notes automated", type: "milestone", done: index === 1 }));
    const slipping = projects.length === 1 || index === 1;
    goals.push(base(`project-${index + 1}`, {
      title: index === 0 ? `${project.name}: deliver the next major release` : `${project.name}: raise delivery predictability`,
      level: "project",
      projectId: project.id,
      parentId: teams.length ? `goal-sample-team-${(index % Math.min(2, teams.length)) + 1}` : "goal-sample-company-1",
      ownerId: (project.memberUsernames || [])[0] || owner(index + 3),
      keyResults,
      ...(slipping ? {
        health: "off-track",
        checkIns: [{ id: `chk-sample-p${index + 1}`, at: createdAt, by: owner(index + 3), health: "off-track", note: "Two key epics slipped to next sprint; re-planning scope with the team.", progress: null }],
      } : {}),
    }));
  });

  return goals;
}
