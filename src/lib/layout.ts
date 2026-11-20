// Runtime side of the page chrome. The header, pager and footer are rendered into the HTML at
// build time (see build/site-plugin.ts); this file wires the theme toggle and typesets the math.

import "../styles/main.css";
import renderMathInElement from "katex/contrib/auto-render";
import { remountAll } from "./figure";

function applyTheme(theme: string) {
  document.documentElement.dataset.theme = theme;
  const btn = document.querySelector<HTMLButtonElement>(".theme-toggle");
  if (btn) {
    btn.hidden = false;
    btn.textContent = theme === "dark" ? "Light page" : "Dark page";
    btn.setAttribute("aria-label", theme === "dark" ? "Switch to the light page" : "Switch to the dark page");
  }
}

export function initLayout() {
  const stored = (() => {
    try {
      return localStorage.getItem("theme");
    } catch {
      return null;
    }
  })();
  applyTheme(stored ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

  document.querySelector(".theme-toggle")?.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("theme", next);
    } catch {}
    applyTheme(next);
    remountAll();
  });

  renderMathInElement(document.body, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
    ],
    throwOnError: false,
    ignoredClasses: ["scrub", "out", "no-math"],
  });
}
