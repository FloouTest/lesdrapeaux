import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import nearestPointOnLine from "@turf/nearest-point-on-line";
import distance from "@turf/distance";
import { lineString, point } from "@turf/helpers";
import { feature } from "topojson-client";
import topology from "./_map-data.js";

const features = Object.values(topology.objects).flatMap((object) => {
  const converted = feature(topology, object);
  return converted.features || [converted];
});
const byCode = new Map(features.map((item) => [item.properties.iso_a2, item]));

function rings(geometry) {
  if (geometry.type === "Polygon") return geometry.coordinates;
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat();
  return [];
}

export function evaluateMapGuess(code, longitude, latitude, clickedCode) {
  const target = byCode.get(code);
  if (!target || !Number.isFinite(longitude) || !Number.isFinite(latitude))
    return null;
  const coordinate = [longitude, latitude];
  const correct =
    clickedCode === code ||
    (target.geometry.type !== "Point" &&
      booleanPointInPolygon(point(coordinate), target));
  let kilometers = 0;
  if (!correct && target.geometry.type === "Point") {
    kilometers = distance(
      point(coordinate),
      point(target.geometry.coordinates),
      {
        units: "kilometers",
      },
    );
  } else if (!correct) {
    kilometers = Math.min(
      ...rings(target.geometry).map(
        (ring) =>
          nearestPointOnLine(lineString(ring), point(coordinate), {
            units: "kilometers",
          }).properties.dist,
      ),
    );
  }
  return { correct, distance: Math.round(kilometers) };
}

export function mapDamage(elapsedMs) {
  return Math.round(250 - Math.min(20_000, Math.max(0, elapsedMs)) * 0.0075);
}
