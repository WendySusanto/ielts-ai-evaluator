// Applies the stored theme before first paint so dark-mode users don't get a
// flash of the light palette while React boots. Must stay in sync with
// ThemeContext (storageKey "ui-theme", default "system").
// A separate file rather than an inline script: CSP here is script-src 'self'.
(function () {
  try {
    var theme = localStorage.getItem("ui-theme") || "system";
    if (theme === "system") {
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    document.documentElement.classList.add(theme);
  } catch (e) {
    /* private mode / storage blocked — React applies the theme on mount */
  }
})();
