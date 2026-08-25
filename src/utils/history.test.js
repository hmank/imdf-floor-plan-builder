import { describe, expect, it } from "vitest";
import {
  createHistoryState,
  redoHistory,
  undoHistory,
  updateHistoryPresent,
} from "./history";

describe("history utilities", () => {
  it("tracks recorded updates in past/future stacks", () => {
    const initial = [{ id: "a" }];
    const state = createHistoryState(initial);
    const updated = updateHistoryPresent(state, [{ id: "a" }, { id: "b" }], {
      label: "Add",
    });

    expect(updated.past).toEqual([initial]);
    expect(updated.present).toEqual([{ id: "a" }, { id: "b" }]);
    expect(updated.future).toEqual([]);
    expect(updated.actions.at(-1)?.label).toBe("Add");
  });

  it("supports non-recorded updates for drag/resize previews", () => {
    const initial = [{ id: "a", x: 0 }];
    const state = createHistoryState(initial);
    const preview = updateHistoryPresent(state, [{ id: "a", x: 10 }], {
      record: false,
      label: "Preview move",
    });

    expect(preview.past).toEqual([]);
    expect(preview.present).toEqual([{ id: "a", x: 10 }]);
    expect(preview.actions).toEqual([]);
  });

  it("undoes and redoes updates", () => {
    const initial = createHistoryState([{ id: "a" }]);
    const next = updateHistoryPresent(initial, [{ id: "a" }, { id: "b" }], {
      label: "Add room",
    });

    const undone = undoHistory(next);
    expect(undone.present).toEqual([{ id: "a" }]);
    expect(undone.future).toEqual([[{ id: "a" }, { id: "b" }]]);

    const redone = redoHistory(undone);
    expect(redone.present).toEqual([{ id: "a" }, { id: "b" }]);
  });
});
