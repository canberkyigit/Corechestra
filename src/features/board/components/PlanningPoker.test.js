import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import PlanningPoker, { getPokerConsensus } from "./PlanningPoker";

describe("PlanningPoker", () => {
  it("preserves vote value types when calculating consensus", () => {
    expect(getPokerConsensus({ alice: 8, bob: 8 })).toBe(8);
    expect(getPokerConsensus({ alice: "M", bob: "M" })).toBe("M");
    expect(getPokerConsensus({ alice: 5, bob: 8 })).toBeNull();
    expect(getPokerConsensus({})).toBeNull();
  });

  it("records the signed-in player and allows a zero-point estimate", () => {
    const onEstimationComplete = jest.fn();
    render(
      <PlanningPoker
        isOpen
        currentTask={{ id: "task-1", title: "Estimate me" }}
        currentPlayer="Canberk"
        teamMembers={["Canberk", "Bob"]}
        onClose={jest.fn()}
        onEstimationComplete={onEstimationComplete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /start voting/i }));
    fireEvent.click(screen.getByRole("button", { name: /^0$/ }));
    fireEvent.click(screen.getByRole("button", { name: /reveal votes/i }));

    expect(screen.getByText("Consensus: 0")).toBeInTheDocument();
    expect(screen.getByTestId("poker-vote-Canberk")).toHaveTextContent("0");

    fireEvent.click(screen.getByRole("button", { name: /complete estimation/i }));
    expect(onEstimationComplete).toHaveBeenCalledWith(expect.objectContaining({
      taskId: "task-1",
      estimation: 0,
      votes: { Canberk: 0 },
    }));
  });
  it("closes on Escape and falls back to the signed-in player instead of a placeholder team", () => {
    const onClose = jest.fn();
    render(
      <PlanningPoker
        isOpen
        currentTask={{ id: "task-1", title: "Estimate me" }}
        currentPlayer="Canberk"
        onClose={onClose}
        onEstimationComplete={jest.fn()}
      />
    );

    expect(screen.getByText("0/1 votes cast")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
