import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import nearestPointOnLine from "@turf/nearest-point-on-line";
import distance from "@turf/distance";
import { lineString, point } from "@turf/helpers";

export const MAP_GAME_LENGTH = 10;
export const MAP_MAX_ATTEMPTS = 6;

export function panTransform(dragStart, pointer, viewportScale) {
  return {
    k: dragStart.k,
    x: dragStart.mapX + (pointer.x - dragStart.pointerX) * viewportScale.x,
    y: dragStart.mapY + (pointer.y - dragStart.pointerY) * viewportScale.y,
  };
}

export function geometryRings(geometry) {
  if (geometry.type === "Polygon") return geometry.coordinates;
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat();
  return [];
}

export function clickFoundTarget(target, coordinate, clickedCode) {
  if (clickedCode === target.properties.iso_a2) return true;
  if (target.geometry.type === "Point") return false;
  return booleanPointInPolygon(point(coordinate), target);
}

export function distanceToTarget(target, coordinate) {
  if (target.geometry.type === "Point") {
    return distance(point(coordinate), point(target.geometry.coordinates), {
      units: "kilometers",
    });
  }

  return Math.min(
    ...geometryRings(target.geometry).map(
      (ring) =>
        nearestPointOnLine(lineString(ring), point(coordinate), {
          units: "kilometers",
        }).properties.dist,
    ),
  );
}

export function distanceLabel(kilometers) {
  if (kilometers < 1) return "À moins de 1 km";
  return `${Math.round(kilometers).toLocaleString("fr-FR")} km`;
}
