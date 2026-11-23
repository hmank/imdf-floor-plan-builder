import { describe, expect, it } from "vitest";
import { generateImdfFiles } from "./imdfExport";

describe("IMDF export", () => {
  it("generates all required geojson files", () => {
    const building = {
      id: "b1",
      name: "HQ",
      lat: "45.3476",
      lng: "-75.7629",
      category: "office",
      directoryId: "",
      levels: [
        {
          id: "l1",
          name: "1",
          ordinal: 0,
          directoryId: "",
          items: [
            {
              id: "u1",
              cat: "office",
              name: "Office 101",
              accessibility: null,
              directoryId: "",
              x: 100,
              y: 100,
              w: 80,
              h: 60,
            },
            { id: "d1", featureType: "fixture", cat: "desk", name: "Desk 1", x: 110, y: 110, w: 18, h: 9 },
          ],
        },
      ],
    };

    const files = generateImdfFiles(building);
    expect(files.map((file) => file.name)).toEqual([
      "building.geojson",
      "footprint.geojson",
      "level.geojson",
      "unit.geojson",
      "fixture.geojson",
      "section.geojson",
    ]);

    const unitGeojson = JSON.parse(
      files.find((file) => file.name === "unit.geojson")?.content ?? "{}"
    );
    expect(unitGeojson.features).toHaveLength(1);
    expect(unitGeojson.features[0].properties.category).toBe("office");
    expect(unitGeojson.features[0].properties.level_id).toBe("l1");
    const fixtures = JSON.parse(files.find((file) => file.name === "fixture.geojson").content);
    expect(fixtures.features).toHaveLength(1);
    expect(fixtures.features[0]).toMatchObject({
      id: "d1",
      feature_type: "fixture",
      geometry: { type: "Polygon" },
      properties: { category: "desk", name: { en: "Desk 1" }, level_id: "l1", anchor_id: null },
    });
    const section = JSON.parse(files.find((file) => file.name === "section.geojson").content);
    expect(section.features).toEqual([]);
  });
});
