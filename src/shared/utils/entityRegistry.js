import { taskKey } from "./helpers";

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function makeEntityKey(type, id) {
  return `${type}:${String(id)}`;
}

function registerEntity(map, entity) {
  if (!entity?.type || entity.id === undefined || entity.id === null) return;
  map.set(makeEntityKey(entity.type, entity.id), entity);
}

export function normalizeLinkedItem(link) {
  if (!link) return null;
  return {
    ...link,
    targetType: link.targetType || "task",
  };
}

export function buildEntityRegistry({
  tasks = [],
  docPages = [],
  spaces = [],
  releases = [],
  testSuites = [],
  testCases = [],
  testRuns = [],
}) {
  const entityMap = new Map();
  const spaceById = new Map(spaces.map((space) => [space.id, space]));
  const suiteById = new Map(testSuites.map((suite) => [suite.id, suite]));

  tasks.forEach((task) => {
    registerEntity(entityMap, {
      type: "task",
      id: task.id,
      key: taskKey(task.id),
      title: task.title || "Untitled task",
      subtitle: task.status || "",
      owner: task.assignedTo || null,
      projectId: task.projectId || null,
      searchText: [
        taskKey(task.id),
        task.title,
        task.description,
        task.type,
        task.assignedTo,
      ].filter(Boolean).join(" "),
    });
  });

  docPages.forEach((page) => {
    const space = spaceById.get(page.spaceId);
    registerEntity(entityMap, {
      type: "doc",
      id: page.id,
      key: page.emoji || "DOC",
      title: page.title || "Untitled page",
      subtitle: space?.name || "Documentation",
      owner: page.owner || space?.owner || null,
      projectId: page.projectId || null,
      searchText: [
        page.title,
        page.content,
        page.emoji,
        space?.name,
      ].filter(Boolean).join(" "),
    });
  });

  releases.forEach((release) => {
    registerEntity(entityMap, {
      type: "release",
      id: release.id,
      key: release.version || "REL",
      title: release.name || release.version || "Release",
      subtitle: release.status || "planned",
      owner: release.owner || null,
      projectId: release.projectId || null,
      searchText: [
        release.version,
        release.name,
        release.description,
        release.status,
      ].filter(Boolean).join(" "),
    });
  });

  testSuites.forEach((suite) => {
    registerEntity(entityMap, {
      type: "test-suite",
      id: suite.id,
      key: "Suite",
      title: suite.name || "Untitled suite",
      subtitle: suite.description || "",
      owner: suite.owner || null,
      projectId: suite.projectId || null,
      searchText: [
        suite.name,
        suite.description,
      ].filter(Boolean).join(" "),
    });
  });

  testCases.forEach((testCase) => {
    const suite = suiteById.get(testCase.suiteId);
    registerEntity(entityMap, {
      type: "test-case",
      id: testCase.id,
      key: "Case",
      title: testCase.title || testCase.name || "Untitled test case",
      subtitle: suite?.name || testCase.status || "",
      owner: testCase.owner || suite?.owner || null,
      projectId: testCase.projectId || suite?.projectId || null,
      searchText: [
        testCase.title,
        testCase.name,
        testCase.description,
        testCase.expected,
        suite?.name,
        testCase.status,
      ].filter(Boolean).join(" "),
    });
  });

  testRuns.forEach((run) => {
    const suite = suiteById.get(run.suiteId);
    registerEntity(entityMap, {
      type: "test-run",
      id: run.id,
      key: "Run",
      title: run.name || `Run ${String(run.id).slice(-6)}`,
      subtitle: suite?.name || run.status || "",
      owner: run.owner || null,
      projectId: run.projectId || suite?.projectId || null,
      searchText: [
        run.name,
        run.status,
        suite?.name,
      ].filter(Boolean).join(" "),
    });
  });

  return {
    entityMap,
    entities: Array.from(entityMap.values()),
  };
}

export function getEntityByRef(entityMap, ref) {
  if (!ref?.type || ref.id === undefined || ref.id === null) return null;
  return entityMap.get(makeEntityKey(ref.type, ref.id)) || null;
}

export function findLinkableEntities(query, entities, { sourceRef = null, linkedItems = [], limit = 8 } = {}) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  const existingTargets = new Set(
    linkedItems
      .map(normalizeLinkedItem)
      .filter(Boolean)
      .map((link) => makeEntityKey(link.targetType, link.targetId))
  );

  return entities
    .filter((entity) => {
      if (sourceRef && entity.type === sourceRef.type && String(entity.id) === String(sourceRef.id)) {
        return false;
      }
      if (existingTargets.has(makeEntityKey(entity.type, entity.id))) {
        return false;
      }
      return normalizeText(entity.searchText).includes(normalizedQuery);
    })
    .slice(0, limit);
}

export function groupLinkedItemsByRelationship(linkedItems, entityMap) {
  const groups = {};
  linkedItems
    .map(normalizeLinkedItem)
    .filter(Boolean)
    .forEach((link) => {
      const entity = getEntityByRef(entityMap, { type: link.targetType, id: link.targetId });
      if (!entity) return;
      if (!groups[link.relationship]) groups[link.relationship] = [];
      groups[link.relationship].push({
        ...link,
        linkedEntity: entity,
      });
    });

  return groups;
}
