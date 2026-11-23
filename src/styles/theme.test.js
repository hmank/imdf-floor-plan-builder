import { afterEach, describe, expect, it, vi } from "vitest";
import { getInitialTheme, saveTheme } from "./theme";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("theme preference", () => {
  it("uses the saved theme and defaults to dark for unknown values", () => {
    const getItem = vi.fn().mockReturnValueOnce("high-contrast").mockReturnValueOnce("unknown");
    vi.stubGlobal("window", { localStorage: { getItem } });

    expect(getInitialTheme()).toBe("high-contrast");
    expect(getInitialTheme()).toBe("dark");
  });

  it("saves the selected theme", () => {
    const setItem = vi.fn();
    vi.stubGlobal("window", { localStorage: { setItem } });

    saveTheme("light");
    expect(setItem).toHaveBeenCalledWith("imdf-builder-theme", "light");
  });

  it("reports unavailable storage and keeps the app usable", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("window", {
      get localStorage() {
        throw new Error("Storage blocked");
      },
    });

    expect(getInitialTheme()).toBe("dark");
    expect(() => saveTheme("light")).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
