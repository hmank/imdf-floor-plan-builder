export const CANVAS_W = 800;
export const CANVAS_H = 600;
export const METERS_PER_PX = 0.1;
export const GRID_SIZE = 20;
export const MIN_ITEM_SIZE = 20;
export const TRACE_CELL_SIZE = 6;
export const TRACE_DARKNESS_THRESHOLD = 140;
export const TRACE_MIN_ROOM_AREA_CELLS = 8;
export const TRACE_MAX_ROOM_SUGGESTIONS = 60;
export const TRACE_WALL_DILATION_PASSES = 2;
export const DEFAULT_LAT = "45.3476";
export const DEFAULT_LNG = "-75.7629";

export const ROOM_TYPES = [
  { cat: "office", icon: "🏢", label: "Office", w: 100, h: 80, color: "#3b82f6" },
  { cat: "room", icon: "🚪", label: "Room", w: 90, h: 70, color: "#6366f1" },
  { cat: "workspace", icon: "💻", label: "Workspace", w: 60, h: 50, color: "#8b5cf6" },
  { cat: "restroom", icon: "🚻", label: "Restroom", w: 60, h: 50, color: "#ec4899" },
  { cat: "kitchen", icon: "🍳", label: "Kitchen", w: 80, h: 60, color: "#f59e0b" },
  { cat: "walkway", icon: "🚶", label: "Walkway", w: 140, h: 30, color: "#94a3b8" },
  { cat: "stairs", icon: "🪜", label: "Stairs", w: 50, h: 50, color: "#10b981" },
  { cat: "elevator", icon: "🛗", label: "Elevator", w: 45, h: 45, color: "#14b8a6" },
  { cat: "nonpublic", icon: "🔒", label: "Non-Public", w: 80, h: 60, color: "#ef4444" },
  { cat: "unspecified", icon: "▫️", label: "Other", w: 80, h: 60, color: "#6b7280" },
];

export const CAT_MAP = Object.fromEntries(ROOM_TYPES.map((room) => [room.cat, room]));
