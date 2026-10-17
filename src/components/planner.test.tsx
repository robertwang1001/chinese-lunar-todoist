import { render, screen } from "@testing-library/react";
import { it, expect } from "vitest";
import { Planner } from "./planner";
it("previews dates without OAuth and disables task creation", async () => {
  render(<Planner configured={false} connected={false} />);
  expect(await screen.findByText("Gregorian preview")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Create / update Todoist tasks" }),
  ).toBeDisabled();
  expect(screen.getByLabelText("Event title")).toHaveValue("Birthday");
});
