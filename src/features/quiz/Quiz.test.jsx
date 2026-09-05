import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Quiz from "./Quiz";

const config = {
  category: "flags",
  region: "Monde entier",
  mode: "free",
  count: 2,
  pool: [
    { name: "France", flag: "fr.svg", region: "Europe" },
    { name: "Japon", flag: "jp.svg", region: "Asie" },
  ],
  ranked: true,
};

describe("ranked quiz exits", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(cleanup);

  it("warns and records an abandoned ranked game", () => {
    const finish = vi.fn();
    const quit = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<Quiz config={config} finish={finish} quit={quit} />);

    fireEvent.click(
      screen.getByRole("button", { name: /changer de continent/i }),
    );

    expect(window.confirm).toHaveBeenCalledWith(
      "Quitter cette partie classée ? Elle sera comptabilisée.",
    );
    expect(finish).toHaveBeenCalledWith(
      expect.objectContaining({ score: 0, total: 2, config }),
    );
    expect(quit).not.toHaveBeenCalled();
  });

  it("stays in the ranked game when the warning is cancelled", () => {
    const finish = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Quiz config={config} finish={finish} quit={vi.fn()} />);

    fireEvent.click(
      screen.getByRole("button", { name: /changer de continent/i }),
    );

    expect(finish).not.toHaveBeenCalled();
    expect(screen.getByText("CLASSÉ")).toBeInTheDocument();
  });

  it("warns before the browser unloads and records the game on departure", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    render(
      <Quiz config={config} finish={vi.fn()} quit={vi.fn()} pseudo="Alice" />,
    );
    const event = new Event("beforeunload", { cancelable: true });

    window.dispatchEvent(event);
    window.dispatchEvent(new Event("pagehide"));

    expect(event.defaultPrevented).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ranked",
      expect.objectContaining({ method: "POST", keepalive: true }),
    );
  });
});
