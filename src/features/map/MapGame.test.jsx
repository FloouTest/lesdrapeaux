import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MapGame, { mapFeatureFor, WorldMap } from "./MapGame";

afterEach(cleanup);

function dispatchPointer(target, type, values) {
  const event = new Event(type, { bubbles: true });
  Object.defineProperties(event, {
    button: { value: values.button ?? 0 },
    pointerId: { value: values.pointerId ?? 1 },
    clientX: { value: values.clientX },
    clientY: { value: values.clientY },
  });
  target.dispatchEvent(event);
}

describe("find-on-map game", () => {
  it("offers country and capital prompts", () => {
    render(<MapGame back={() => {}} />);

    expect(
      screen.getByRole("heading", { name: "Trouve sur la carte" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Nom du pays/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Nom de la capitale/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Europe/ })).toBeInTheDocument();
    expect(screen.getByText(/Sélection personnalisée/)).toBeInTheDocument();
  });

  it("lets the player choose the number of countries", () => {
    render(<MapGame back={() => {}} />);

    fireEvent.change(screen.getByLabelText("Nombre de pays"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Nom du pays/ }));

    expect(screen.getByText("Pays 1 sur 5")).toBeInTheDocument();
  });

  it("starts an Endless expedition without a fixed total", () => {
    render(<MapGame back={() => {}} pseudo="Alice" />);
    fireEvent.change(screen.getByLabelText("Nombre de pays"), {
      target: { value: "endless" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Nom du pays/ }));

    expect(screen.getByText("Pays 1 · Mode Endless")).toBeInTheDocument();
    expect(screen.queryByText(/Pays 1 sur/)).not.toBeInTheDocument();
  });

  it("uses the selected continent as the country pool", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    render(<MapGame back={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /Europe/ }));
    fireEvent.click(screen.getByRole("button", { name: /Nom du pays/ }));

    expect(screen.getByText("Albanie")).toBeInTheDocument();
  });

  it("does not reveal the country flag for a capital prompt", () => {
    render(<MapGame back={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /Nom de la capitale/ }));

    expect(
      screen.queryByRole("img", { name: "Drapeau du pays à situer" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Pays 1 sur 10")).toBeInTheDocument();
  });

  it("starts a ten-country round with enlarged microstate targets", () => {
    const { container } = render(<MapGame back={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Nom du pays/ }));

    expect(screen.getByText("Pays 1 sur 10")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Carte interactive du monde/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoomer" })).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Drapeau du pays à situer" }),
    ).toHaveAttribute("src", expect.stringMatching(/^https:\/\/flagcdn\.com/));
    expect(
      container.querySelector('[data-country="PW"] .map-marker-hitbox'),
    ).toHaveAttribute("r", "16");
  });

  it("keeps a microstate identity through pointer capture", () => {
    const guess = vi.fn();
    const { container } = render(
      <WorldMap
        target={mapFeatureFor("PW")}
        guesses={[]}
        outcome={null}
        onGuess={guess}
      />,
    );
    const map = screen.getByRole("img", { name: /Carte interactive du monde/ });
    map.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 900,
      height: 470,
    });
    const marker = container.querySelector(
      '[data-country="PW"] .map-marker-hitbox',
    );

    dispatchPointer(marker, "pointerdown", { clientX: 670, clientY: 220 });
    dispatchPointer(map, "pointerup", { clientX: 670, clientY: 220 });

    expect(guess).toHaveBeenCalledWith(expect.any(Array), "PW");
  });

  it("pinches to zoom without submitting a map guess", async () => {
    const guess = vi.fn();
    render(
      <WorldMap
        target={mapFeatureFor("FR")}
        guesses={[]}
        outcome={null}
        onGuess={guess}
      />,
    );
    const map = screen.getByRole("img", { name: /Carte interactive du monde/ });
    map.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 900,
      height: 470,
    });

    dispatchPointer(map, "pointerdown", {
      pointerId: 1,
      clientX: 300,
      clientY: 235,
    });
    dispatchPointer(map, "pointerdown", {
      pointerId: 2,
      clientX: 600,
      clientY: 235,
    });
    dispatchPointer(map, "pointermove", {
      pointerId: 2,
      clientX: 750,
      clientY: 235,
    });
    dispatchPointer(map, "pointerup", {
      pointerId: 2,
      clientX: 750,
      clientY: 235,
    });
    dispatchPointer(map, "pointerup", {
      pointerId: 1,
      clientX: 300,
      clientY: 235,
    });

    await waitFor(() =>
      expect(screen.getByLabelText("Niveau de zoom")).toHaveTextContent(
        "150 %",
      ),
    );
    expect(guess).not.toHaveBeenCalled();
  });

  it("captures the wheel and does not turn a drag into a guess", () => {
    render(<MapGame back={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Nom du pays/ }));
    const map = screen.getByRole("img", { name: /Carte interactive du monde/ });
    map.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 900,
      height: 470,
    });

    const wheel = new WheelEvent("wheel", { deltaY: -100, cancelable: true });
    map.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(true);

    dispatchPointer(map, "pointerdown", { clientX: 100, clientY: 100 });
    dispatchPointer(map, "pointermove", { clientX: 140, clientY: 120 });
    dispatchPointer(map, "pointerup", { clientX: 140, clientY: 120 });
    expect(screen.getByText("0/6 essais")).toBeInTheDocument();
  });
});
