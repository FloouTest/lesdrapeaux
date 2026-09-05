import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { buildQuestions } from "./features/versus/Versus";

describe("React application", () => {
  beforeEach(() => {
    localStorage.clear();
    history.replaceState(null, "", "/");
  });

  it("restores legacy player storage and opens a worldwide quiz setup", () => {
    localStorage.setItem("local:pseudo", "Alice");
    render(<App />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /changer de pseudo/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Monde entier/ }),
    ).toBeInTheDocument();
  });

  it("opens and automatically joins an invited room", async () => {
    localStorage.setItem("local:pseudo", "Alice");
    history.replaceState(null, "", "/?room=Q4PVF");
    const fetchMock = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(
      screen.getByRole("heading", { name: /Mode Versus multijoueur/ }),
    ).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/versus/join");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      code: "Q4PVF",
      pseudo: "Alice",
    });
    vi.unstubAllGlobals();
  });

  it("builds valid, unique versus MCQ choices", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.42);
    const questions = buildQuestions({
      category: "capitals",
      answerMode: "mcq",
      continent: "Europe",
    });
    expect(questions).toHaveLength(40);
    for (const question of questions) {
      expect(question.choices).toHaveLength(4);
      expect(new Set(question.choices).size).toBe(4);
      expect(question.choices).toContain(question.answer);
      expect(question.prompt).toBeTruthy();
      expect(question.image).toMatch(/^https:\/\/flagcdn\.com/);
    }
    vi.restoreAllMocks();
  });
});
