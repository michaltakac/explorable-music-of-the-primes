// Shared page chrome: header with chapter navigation, theme toggle, pager, footer, math typesetting.

import "../styles/main.css";
import renderMathInElement from "katex/contrib/auto-render";
import zeros from "../data/zeros.json";
import { remountAll } from "./figure";

export const CHAPTERS = [
  { file: "index.html", short: "Start", title: "The music of the primes", blurb: "" },
  { file: "primes.html", short: "1", title: "Counting primes", blurb: "The primes look scattered. Count them and a shape appears, with a tremor on top." },
  { file: "zeta.html", short: "2", title: "A function that knows every prime", blurb: "Euler's product, the complex plane, and the points where zeta vanishes." },
  { file: "music.html", short: "3", title: "Zeros as notes", blurb: "Each zero is a wave. Add them up and the primes come out. The Riemann hypothesis fixes the volume." },
  { file: "family.html", short: "4", title: "The whole family of L-functions", blurb: "Characters sort primes into classes. The generalized hypothesis covers all of them." },
  { file: "adeles.html", short: "5", title: "Every prime's point of view", blurb: "Sizes measured prime by prime, shells inside p-adic balls, and functions folded over the rationals." },
  { file: "trace.html", short: "6", title: "Two ways to count the same thing", blurb: "A loop, a smear, and a number computed twice. Each prime is a loop of length log p." },
  { file: "proof.html", short: "7", title: "The strategy of the manuscript", blurb: "One prime at a time, in a room where only nearby zeros can be heard." },
  { file: "status.html", short: "Status", title: "Status, sources, glossary", blurb: "What the manuscript contains today, what is unfinished, and where to read more." },
];

function currentFile(): string {
  const f = location.pathname.split("/").pop() || "index.html";
  return f === "" ? "index.html" : f;
}

function motifPath(): string {
  // The site's rule line is real data: the sum of the first 40 zero-waves, cos(gamma*u)/gamma, for u in [0.3, 4].
  const g = (zeros as any).zeta as number[];
  const n = 420;
  let d = "";
  for (let i = 0; i <= n; i++) {
    const u = 0.3 + (3.7 * i) / n;
    let y = 0;
    for (let k = 0; k < 40; k++) y += Math.cos(g[k] * u) / g[k];
    d += (i ? "L" : "M") + ((1000 * i) / n).toFixed(1) + " " + (17 - y * 46).toFixed(2);
  }
  return d;
}

function applyTheme(theme: string) {
  document.documentElement.dataset.theme = theme;
  const btn = document.querySelector<HTMLButtonElement>(".theme-toggle");
  if (btn) {
    btn.textContent = theme === "dark" ? "Light page" : "Dark page";
    btn.setAttribute("aria-label", theme === "dark" ? "Switch to the light page" : "Switch to the dark page");
  }
}

export function initLayout() {
  const here = currentFile();
  const idx = Math.max(0, CHAPTERS.findIndex((c) => c.file === here));

  const stored = (() => {
    try {
      return localStorage.getItem("theme");
    } catch {
      return null;
    }
  })();
  const theme = stored ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  const head = document.createElement("header");
  head.className = "site-head";
  head.innerHTML =
    `<a class="home" href="./index.html">The Music of the Primes, explorable</a>` +
    `<nav aria-label="Chapters">` +
    CHAPTERS.map(
      (c, i) =>
        `<a href="./${c.file}" title="${c.title}"${i === idx ? ' aria-current="page"' : ""}>${c.short}<span class="sr-only">: ${c.title}</span></a>`,
    ).join("") +
    `</nav><button class="theme-toggle" type="button"></button>`;
  document.body.prepend(head);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "motif");
  svg.setAttribute("viewBox", "0 0 1000 34");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `<path d="${motifPath()}"/>`;
  head.after(svg);

  applyTheme(theme);
  head.querySelector(".theme-toggle")!.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("theme", next);
    } catch {}
    applyTheme(next);
    remountAll();
  });

  const main = document.querySelector("main")!;
  const prev = CHAPTERS[idx - 1];
  const next = CHAPTERS[idx + 1];
  const pager = document.createElement("nav");
  pager.className = "pager";
  pager.setAttribute("aria-label", "Previous and next chapter");
  pager.innerHTML =
    (prev ? `<a class="prev" href="./${prev.file}"><small>Previous</small><b>${prev.title}</b></a>` : "") +
    (next ? `<a class="next" href="./${next.file}"><small>Next</small><b>${next.title}</b></a>` : "");
  main.append(pager);

  const foot = document.createElement("footer");
  foot.className = "site-foot";
  foot.innerHTML =
    `An unofficial reader's guide to <i>The Music of the Primes</i> by Alessandro Maria Masullo. ` +
    `The manuscript is an unrefereed draft; see <a href="./status.html">its status</a>. ` +
    `Figures are drawn live with <a href="https://github.com/unconed/mathbox">MathBox</a>. ` +
    `<a href="https://github.com/michaltakac/explorable-music-of-the-primes">Source on GitHub</a>.`;
  document.body.append(foot);

  renderMathInElement(document.body, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
    ],
    throwOnError: false,
    ignoredClasses: ["scrub", "out", "no-math"],
  });
}

export function tocHtml(): string {
  return CHAPTERS.slice(1)
    .map(
      (c) =>
        `<li><a href="./${c.file}"><span class="n">${c.short.length < 3 ? c.short : ""}</span><span class="t">${c.title}</span><span class="d">${c.blurb}</span></a></li>`,
    )
    .join("");
}
