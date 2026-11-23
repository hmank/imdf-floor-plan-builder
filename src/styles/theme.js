const STORAGE_KEY = "imdf-builder-theme";
const THEMES = ["dark", "light", "high-contrast"];

export function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(saved) ? saved : "dark";
  } catch (error) {
    console.warn("Could not read the saved theme preference.", error);
    return "dark";
  }
}

export function saveTheme(theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch (error) {
    console.warn("Could not save the theme preference.", error);
  }
}
