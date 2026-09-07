import { describe, expect, it } from "vitest";
import {
  clickFoundTarget,
  contentRect,
  distanceLabel,
  distanceToTarget,
  geometryRings,
  panTransform,
} from "./mapGame";

const square = {
  type: "Feature",
  properties: { iso_a2: "TS" },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ],
  },
};

describe("map game geography", () => {
  it("pans relative to the map's current position", () => {
    expect(
      panTransform(
        { pointerX: 100, pointerY: 80, mapX: 240, mapY: -30, k: 2 },
        { x: 120, y: 90 },
        { x: 2, y: 2 },
      ),
    ).toEqual({ x: 280, y: -10, k: 2 });
  });

  it("finds a polygon only when the click is inside it", () => {
    expect(clickFoundTarget(square, [0.5, 0.5])).toBe(true);
    expect(clickFoundTarget(square, [2, 2])).toBe(false);
  });

  it("accepts a direct click on a microstate marker", () => {
    const marker = {
      type: "Feature",
      properties: { iso_a2: "MC" },
      geometry: { type: "Point", coordinates: [7.42, 43.73] },
    };
    expect(clickFoundTarget(marker, [7.4, 43.7], "MC")).toBe(true);
    expect(clickFoundTarget(marker, [7.4, 43.7], "FR")).toBe(false);
  });

  it("measures misses to the nearest polygon border", () => {
    const distance = distanceToTarget(square, [2, 0.5]);
    expect(distance).toBeGreaterThan(110);
    expect(distance).toBeLessThan(112);
    expect(geometryRings(square.geometry)).toHaveLength(1);
  });

  it("formats readable French distances", () => {
    expect(distanceLabel(0.4)).toBe("À moins de 1 km");
    expect(distanceLabel(1234.4)).toContain("1");
    expect(distanceLabel(1234.4)).toContain("234 km");
  });

  it("returns the box unchanged when its ratio already matches the viewBox", () => {
    const bounds = { left: 10, top: 20, width: 900, height: 470 };
    expect(contentRect(bounds, 900, 470)).toEqual(bounds);
  });

  it("centers the map vertically when a taller box letterboxes it top/bottom", () => {
    // Mirrors the mobile case: a narrow phone forces the box taller than the
    // viewBox's own ratio (e.g. via a CSS min-height), so the rendered map
    // only fills the middle of the box.
    const bounds = { left: 0, top: 0, width: 375, height: 350 };
    const rect = contentRect(bounds, 900, 470);
    expect(rect.left).toBe(0);
    expect(rect.width).toBe(375);
    expect(rect.height).toBeCloseTo(195.83, 1);
    expect(rect.top).toBeCloseTo(77.08, 1);
  });

  it("centers the map horizontally when a wider box letterboxes it left/right", () => {
    const bounds = { left: 0, top: 0, width: 1200, height: 470 };
    const rect = contentRect(bounds, 900, 470);
    expect(rect.top).toBe(0);
    expect(rect.height).toBe(470);
    expect(rect.width).toBeCloseTo(900, 1);
    expect(rect.left).toBeCloseTo(150, 0);
  });
});
