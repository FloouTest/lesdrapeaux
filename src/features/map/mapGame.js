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

// The <svg> keeps its viewBox's aspect ratio (preserveAspectRatio defaults to
// "xMidYMid meet"), so whenever the element's own box has a different ratio
// than the viewBox — e.g. a CSS min-height on a narrow phone — the browser
// letterboxes it: the map is centered and only fills part of the box, with
// empty space on one axis. Screen-to-viewBox math must map against that
// actual centered rectangle, not the raw bounding box, or every computed
// coordinate drifts off in the direction of the letterboxed axis.
export function contentRect(bounds, viewBoxWidth, viewBoxHeight) {
  const boxRatio = bounds.width / bounds.height;
  const viewRatio = viewBoxWidth / viewBoxHeight;
  if (boxRatio > viewRatio) {
    const width = bounds.height * viewRatio;
    return {
      left: bounds.left + (bounds.width - width) / 2,
      top: bounds.top,
      width,
      height: bounds.height,
    };
  }
  const height = bounds.width / viewRatio;
  return {
    left: bounds.left,
    top: bounds.top + (bounds.height - height) / 2,
    width: bounds.width,
    height,
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
