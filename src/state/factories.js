import { CAT_MAP, DEFAULT_LAT, DEFAULT_LNG } from "../constants/editor";
import { uid } from "../utils/uid";

export function createLevel(levelNumber = 1, ordinal = 0) {
  return {
    id: uid(),
    name: `${levelNumber}`,
    ordinal,
    directoryId: "",
    items: [],
  };
}

export function createBuilding() {
  return {
    id: uid(),
    name: "",
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
    category: "office",
    directoryId: "",
    levels: [createLevel(1, 0)],
  };
}

export function createItemFromCategory(cat, x, y) {
  const roomType = CAT_MAP[cat] || CAT_MAP.unspecified;
  return {
    id: uid(),
    cat: roomType.cat,
    name: "",
    accessibility: null,
    directoryId: "",
    x: Math.max(0, x),
    y: Math.max(0, y),
    w: roomType.w,
    h: roomType.h,
  };
}

export function createPastedItem(baseItem, x, y) {
  return {
    ...baseItem,
    id: uid(),
    x,
    y,
  };
}
