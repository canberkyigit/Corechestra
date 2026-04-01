import React, { useState } from "react";
import { act, renderHook } from "@testing-library/react";
import { useProjectScopedState } from "./useProjectScopedState";

function useProjectScopedStateHarness(currentProjectId = "proj-1") {
  const [stateMap, setStateMap] = useState({
    "proj-1": ["task-a"],
    "proj-2": ["task-b"],
  });

  const [value, setValue] = useProjectScopedState({
    currentProjectId,
    stateMap,
    setStateMap,
    fallback: [],
  });

  return { stateMap, value, setValue };
}

describe("useProjectScopedState", () => {
  it("returns the scoped project value and updates only that project", () => {
    const { result } = renderHook(() => useProjectScopedStateHarness());

    expect(result.current.value).toEqual(["task-a"]);

    act(() => {
      result.current.setValue((prev) => [...prev, "task-c"]);
    });

    expect(result.current.value).toEqual(["task-a", "task-c"]);
    expect(result.current.stateMap["proj-2"]).toEqual(["task-b"]);
  });

  it("uses the fallback and ignores writes when there is no active project", () => {
    const { result } = renderHook(() => useProjectScopedStateHarness(""));

    expect(result.current.value).toEqual([]);

    act(() => {
      result.current.setValue(["new-value"]);
    });

    expect(result.current.stateMap).toEqual({
      "proj-1": ["task-a"],
      "proj-2": ["task-b"],
    });
  });
});
