import { pxToGeo } from "./geo";
import { uid } from "./uid";

export function generateImdfFiles(building) {
  const lat = parseFloat(building.lat) || 45.3476;
  const lng = parseFloat(building.lng) || -75.7629;
  const allUnits = [];

  building.levels.forEach((level, levelIndex) => {
    level.items.forEach((item) => {
      const tl = pxToGeo(item.x, item.y, lat, lng);
      const tr = pxToGeo(item.x + item.w, item.y, lat, lng);
      const br = pxToGeo(item.x + item.w, item.y + item.h, lat, lng);
      const bl = pxToGeo(item.x, item.y + item.h, lat, lng);
      const centerPoint = pxToGeo(item.x + item.w / 2, item.y + item.h / 2, lat, lng);
      allUnits.push({
        id: item.id,
        cat: item.cat,
        name: item.name,
        accessibility: item.accessibility || null,
        directoryId: item.directoryId || null,
        displayPoint: { type: "Point", coordinates: centerPoint },
        levelIndex,
        coords: [[tl, tr, br, bl, tl]],
      });
    });
  });

  const buildingGeojson = {
    type: "FeatureCollection",
    features: [
      {
        id: building.id,
        type: "Feature",
        feature_type: "building",
        geometry: null,
        properties: {
          name: { en: building.name || "Building" },
          alt_name: null,
          category: building.category,
          restriction: null,
          display_point: { type: "Point", coordinates: [lng, lat] },
          address_id: null,
          directory_id: building.directoryId || null,
        },
      },
    ],
  };

  let footprintCoords;
  if (allUnits.length > 0) {
    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    allUnits
      .flatMap((unit) => unit.coords[0])
      .forEach(([unitLng, unitLat]) => {
        minLng = Math.min(minLng, unitLng);
        maxLng = Math.max(maxLng, unitLng);
        minLat = Math.min(minLat, unitLat);
        maxLat = Math.max(maxLat, unitLat);
      });
    const pad = 0.00002;
    footprintCoords = [
      [
        [minLng - pad, minLat - pad],
        [maxLng + pad, minLat - pad],
        [maxLng + pad, maxLat + pad],
        [minLng - pad, maxLat + pad],
        [minLng - pad, minLat - pad],
      ],
    ];
  } else {
    const delta = 0.0003;
    footprintCoords = [
      [
        [lng - delta, lat - delta],
        [lng + delta, lat - delta],
        [lng + delta, lat + delta],
        [lng - delta, lat + delta],
        [lng - delta, lat - delta],
      ],
    ];
  }

  const footprintGeojson = {
    type: "FeatureCollection",
    features: [
      {
        id: uid(),
        type: "Feature",
        feature_type: "footprint",
        geometry: { type: "Polygon", coordinates: footprintCoords },
        properties: { category: "ground", name: null, building_ids: [building.id] },
      },
    ],
  };

  const levelGeojson = {
    type: "FeatureCollection",
    features: building.levels.map((level, index) => {
      const levelUnits = allUnits.filter((unit) => unit.levelIndex === index);
      let levelPolygon = footprintCoords;
      if (levelUnits.length > 0) {
        let minLng = Infinity;
        let maxLng = -Infinity;
        let minLat = Infinity;
        let maxLat = -Infinity;
        levelUnits
          .flatMap((unit) => unit.coords[0])
          .forEach(([unitLng, unitLat]) => {
            minLng = Math.min(minLng, unitLng);
            maxLng = Math.max(maxLng, unitLng);
            minLat = Math.min(minLat, unitLat);
            maxLat = Math.max(maxLat, unitLat);
          });
        const pad = 0.00001;
        levelPolygon = [
          [
            [minLng - pad, minLat - pad],
            [maxLng + pad, minLat - pad],
            [maxLng + pad, maxLat + pad],
            [minLng - pad, maxLat + pad],
            [minLng - pad, minLat - pad],
          ],
        ];
      }
      return {
        id: level.id,
        type: "Feature",
        feature_type: "level",
        geometry: { type: "Polygon", coordinates: levelPolygon },
        properties: {
          category: "unspecified",
          restriction: null,
          outdoor: false,
          ordinal: level.ordinal,
          name: { en: level.name },
          short_name: { en: level.name },
          display_point: { type: "Point", coordinates: [lng, lat] },
          address_id: null,
          building_ids: [building.id],
          directory_id: level.directoryId || null,
        },
      };
    }),
  };

  const unitGeojson = {
    type: "FeatureCollection",
    features: allUnits.map((unit) => ({
      id: unit.id,
      type: "Feature",
      feature_type: "unit",
      geometry: { type: "Polygon", coordinates: unit.coords },
      properties: {
        name: unit.name ? { en: unit.name } : null,
        alt_name: null,
        category: unit.cat,
        restriction: null,
        accessibility: unit.accessibility,
        level_id: building.levels[unit.levelIndex]?.id,
        building_ids: [building.id],
        address_id: null,
        display_point: unit.displayPoint,
        directory_id: unit.directoryId,
      },
    })),
  };

  const fixtureGeojson = { type: "FeatureCollection", features: [] };

  return [
    { name: "building.geojson", content: JSON.stringify(buildingGeojson, null, 2) },
    { name: "footprint.geojson", content: JSON.stringify(footprintGeojson, null, 2) },
    { name: "level.geojson", content: JSON.stringify(levelGeojson, null, 2) },
    { name: "unit.geojson", content: JSON.stringify(unitGeojson, null, 2) },
    { name: "fixture.geojson", content: JSON.stringify(fixtureGeojson, null, 2) },
  ];
}
