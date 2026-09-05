import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Results from "./Results";

afterEach(cleanup);

describe("ranked results", () => {
  it("highlights reward, league progress, and remaining games", () => {
    render(
      <Results
        result={{
          ranked: true,
          score: 16,
          total: 20,
          seconds: 72,
          gained: 12,
          bonus: 2,
          division: 1,
          divisionBefore: 1,
          points: 37,
          gamesToday: 3,
          dailyLimit: 5,
          dailyLimitReached: false,
          log: [],
        }}
        go={() => {}}
        replay={() => {}}
      />,
    );

    expect(screen.getByText("+12 FP")).toBeInTheDocument();
    expect(screen.getByText("🔥 Bonus de série : +2 FP")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Progression dans la ligue" }),
    ).toHaveAttribute("aria-valuenow", "37");
    expect(screen.getByText("2/5")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Rejouer en classé" }),
    ).toBeInTheDocument();
  });
});
