import {
  buildEntityRegistry,
  findLinkableEntities,
  groupLinkedItemsByRelationship,
} from "./entityRegistry";

describe("entityRegistry", () => {
  const registry = buildEntityRegistry({
    tasks: [{ id: 12, title: "Fix login bug", type: "bug", assignedTo: "alice", status: "blocked" }],
    spaces: [{ id: "space-1", name: "Engineering" }],
    docPages: [{ id: "page-1", title: "Auth RFC", spaceId: "space-1", content: "SSO plan" }],
    releases: [{ id: "rel-1", version: "v2.0.0", name: "Auth Release", status: "planned" }],
    testSuites: [{ id: "suite-1", name: "Auth Regression" }],
    testCases: [{ id: "case-1", title: "Login succeeds", suiteId: "suite-1" }],
    testRuns: [{ id: "run-1", name: "Nightly Auth", suiteId: "suite-1", status: "completed" }],
  });

  it("registers entities across task, docs, releases and testing domains", () => {
    expect(registry.entities).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "task", id: 12, key: "CY-12" }),
      expect.objectContaining({ type: "doc", id: "page-1", title: "Auth RFC" }),
      expect.objectContaining({ type: "release", id: "rel-1", key: "v2.0.0" }),
      expect.objectContaining({ type: "test-case", id: "case-1", title: "Login succeeds" }),
    ]));
  });

  it("finds linkable entities while excluding the source entity and existing links", () => {
    const results = findLinkableEntities("auth", registry.entities, {
      sourceRef: { type: "task", id: 12 },
      linkedItems: [{ targetType: "doc", targetId: "page-1", relationship: "relates to" }],
    });

    expect(results).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "release", id: "rel-1" }),
      expect.objectContaining({ type: "test-suite", id: "suite-1" }),
    ]));
    expect(results).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "task", id: 12 }),
      expect.objectContaining({ type: "doc", id: "page-1" }),
    ]));
  });

  it("groups linked items by relationship with resolved entity data", () => {
    const grouped = groupLinkedItemsByRelationship([
      { id: "1", targetType: "release", targetId: "rel-1", relationship: "relates to" },
      { id: "2", targetType: "test-case", targetId: "case-1", relationship: "validates" },
    ], registry.entityMap);

    expect(grouped["relates to"][0]).toMatchObject({
      linkedEntity: expect.objectContaining({ type: "release", id: "rel-1" }),
    });
    expect(grouped.validates[0]).toMatchObject({
      linkedEntity: expect.objectContaining({ type: "test-case", id: "case-1" }),
    });
  });
});
