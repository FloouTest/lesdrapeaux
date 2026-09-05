import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Versus, {
  INCORRECT_FEEDBACK_DURATION_MS,
  PlayerRoster,
  shouldHoldIncorrectFeedback,
} from "./Versus";

it("holds an incorrect answer on screen for 2.5 seconds", () => {
  const answeredAt = 10_000;
  const feedbackUntil = answeredAt + INCORRECT_FEEDBACK_DURATION_MS;

  expect(shouldHoldIncorrectFeedback(feedbackUntil, answeredAt + 2499)).toBe(
    true,
  );
  expect(shouldHoldIncorrectFeedback(feedbackUntil, answeredAt + 2500)).toBe(
    false,
  );
});

describe("Versus lobby", () => {
  it("separates room creation from joining and labels every setting", () => {
    history.replaceState(null, "", "/");
    render(<Versus pseudo="Alice" go={() => {}} />);

    expect(
      screen.getByRole("heading", { name: /Mode Versus multijoueur/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Créer un salon" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Rejoindre un salon" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("À deviner")).toBeInTheDocument();
    expect(screen.getByLabelText("Réponses")).toBeInTheDocument();
    expect(screen.getByLabelText("Région")).toBeInTheDocument();
    expect(screen.getByLabelText("Capacité")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rejoindre" })).toBeDisabled();
  });

  it("renders a compact, complete roster for eight players", () => {
    const players = Array.from({ length: 8 }, (_, index) => ({
      playerId: index + 1,
      pseudo: `Joueur ${index + 1}`,
      hp: 1000 - index * 100,
      index,
      self: index === 0,
    }));
    const { container } = render(<PlayerRoster players={players} />);

    expect(screen.getAllByRole("progressbar")).toHaveLength(8);
    expect(container.querySelector(".versus-roster")).toHaveClass("is-crowded");
    expect(container.querySelector(".versus-roster")).toHaveAttribute(
      "data-player-count",
      "8",
    );
    expect(screen.getByText("Joueur 8")).toBeInTheDocument();
  });
});
