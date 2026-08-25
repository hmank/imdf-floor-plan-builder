import { CANVAS_H, CANVAS_W, METERS_PER_PX } from "../constants/editor";

export function pxToGeo(pxX, pxY, centerLat, centerLng) {
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos((centerLat * Math.PI) / 180);
  const dxMeters = (pxX - CANVAS_W / 2) * METERS_PER_PX;
  const dyMeters = (CANVAS_H / 2 - pxY) * METERS_PER_PX;
  return [centerLng + dxMeters / metersPerDegreeLng, centerLat + dyMeters / metersPerDegreeLat];
}
