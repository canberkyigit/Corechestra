import React from "react";
import { act, render, renderHook } from "@testing-library/react";
import { AppProvider, useApp } from "./AppContext";
import { resetAppStore, useAppStore } from "../store/useAppStore";

jest.mock("./hooks/useAppStoreSync", () => ({
  useAppStoreSync: () => {},
}));

jest.mock("../services/storage", () => ({
  clearAllDomains: jest.fn(() => Promise.resolve(true)),
}));

function mountCounter(useValue) {
  const renders = { count: 0, last: null };
  function Probe() {
    renders.count += 1;
    renders.last = useValue();
    return null;
  }
  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
  return renders;
}

describe("AppProvider facade + tracked useApp()", () => {
  beforeEach(() => {
    resetAppStore();
    act(() => {
      useAppStore.setState({ currentProjectId: "proj-1", currentUser: "alice" });
    });
  });

  it("does not re-render a consumer that only reads projects when activeTasks changes", () => {
    const projectsProbe = mountCounter(() => {
      const { projects } = useApp();
      return projects;
    });
    const tasksProbe = mountCounter(() => {
      const { activeTasks } = useApp();
      return activeTasks;
    });
    const projectsBefore = projectsProbe.count;
    const tasksBefore = tasksProbe.count;

    act(() => {
      useAppStore.setState({
        activeTasks: [{ id: "CY-1", projectId: "proj-1", title: "A", status: "todo" }],
      });
    });

    expect(projectsProbe.count).toBe(projectsBefore);
    expect(tasksProbe.count).toBeGreaterThan(tasksBefore);
    expect(tasksProbe.last).toHaveLength(1);

    act(() => {
      useAppStore.setState({ projects: [{ id: "proj-1", name: "One" }] });
    });

    expect(projectsProbe.count).toBe(projectsBefore + 1);
    expect(projectsProbe.last).toEqual([{ id: "proj-1", name: "One" }]);
  });

  it("re-renders when a derived value the component reads changes", () => {
    const probe = mountCounter(() => useApp().allTasks);
    const before = probe.count;

    act(() => {
      useAppStore.setState({
        activeTasks: [{ id: "CY-2", projectId: "proj-1", title: "B", status: "todo" }],
      });
    });

    expect(probe.count).toBeGreaterThan(before);
    expect(probe.last.map((t) => t.id)).toEqual(["CY-2"]);
  });

  it("keeps action identity stable across store updates and dispatches to the latest implementation", () => {
    const probe = mountCounter(() => {
      const { createTask, updateTask, darkMode } = useApp();
      return { createTask, updateTask, darkMode };
    });
    const first = probe.last;

    act(() => {
      useAppStore.setState({
        activeTasks: [{ id: "CY-3", projectId: "proj-1", title: "C", status: "todo" }],
        projects: [{ id: "proj-1", name: "One" }],
      });
    });
    act(() => {
      useAppStore.setState({ darkMode: !first.darkMode });
    });

    expect(probe.last.createTask).toBe(first.createTask);
    expect(probe.last.updateTask).toBe(first.updateTask);

    act(() => {
      first.createTask({ title: "Ship login", type: "task" }, "active");
    });

    const tasks = useAppStore.getState().activeTasks;
    expect(tasks).toHaveLength(2);
    expect(tasks.map((t) => t.title)).toEqual(expect.arrayContaining(["C", "Ship login"]));
  });

  it("does not re-render a consumer that only reads actions", () => {
    const probe = mountCounter(() => useApp().createTask);
    const before = probe.count;

    act(() => {
      useAppStore.setState({ projects: [{ id: "p" }], activeTasks: [{ id: "x", projectId: "proj-1" }] });
    });

    expect(probe.count).toBe(before);
  });

  it("supports object spread and keeps proxy identity until a tracked key changes", () => {
    const probe = mountCounter(() => useApp());
    const firstProxy = probe.last;
    const spread = { ...firstProxy };
    expect(spread).toHaveProperty("projects");
    expect(typeof spread.createTask).toBe("function");

    act(() => {
      useAppStore.setState({ projects: [{ id: "proj-9" }] });
    });

    expect(probe.last).not.toBe(firstProxy);
    expect(probe.last.projects).toEqual([{ id: "proj-9" }]);
  });

  it("falls back to computing the facade locally outside the provider", () => {
    const { result } = renderHook(() => useApp());

    act(() => {
      result.current.createTask({ title: "Standalone", type: "task" }, "active");
    });

    expect(useAppStore.getState().activeTasks[0]).toMatchObject({
      title: "Standalone",
      projectId: "proj-1",
    });
    expect(result.current.activeTasks).toHaveLength(1);
  });
});
