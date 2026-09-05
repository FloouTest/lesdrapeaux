import { describe, expect, it } from "vitest";
import {
  clickFoundTarget,
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
});
