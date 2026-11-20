// Site-wide data and the static page chrome. Pure string functions with no DOM access,
// so the Vite build can render the same markup that the browser later wires up.

import zeros from "./data/zeros.json" with { type: "json" };
import site from "./site.json" with { type: "json" };

export const SITE = site;
export type PageInfo = (typeof site.pages)[number];
export const PAGES: PageInfo[] = site.pages;

export const pageOf = (file: string): PageInfo => PAGES.find((p) => p.file === file) ?? PAGES[0];
export const slugOf = (file: string) => file.replace(/\.html$/, "");
export const urlOf = (file: string) => SITE.url + (file === "index.html" ? "" : file);

/** The rule line under the header is real data: the sum of the first 40 zero-waves, cos(gamma u)/gamma. */
export function motifPath(): string {
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

export function headerHtml(file: string): string {
  const nav = PAGES.map(
    (c) =>
      `<a href="./${c.file}" title="${c.title}"${c.file === file ? ' aria-current="page"' : ""}>${c.short}<span class="sr-only">: ${c.title}</span></a>`,
  ).join("");
  return (
    `<header class="site-head"><a class="home" href="./index.html">${SITE.name}</a>` +
    `<nav aria-label="Chapters">${nav}</nav>` +
    `<button class="theme-toggle" type="button" hidden>Dark page</button></header>` +
    `<svg class="motif" viewBox="0 0 1000 34" preserveAspectRatio="none" aria-hidden="true"><path d="${motifPath()}"/></svg>`
  );
}

export function pagerHtml(file: string): string {
  const i = PAGES.findIndex((p) => p.file === file);
  const prev = PAGES[i - 1];
  const next = PAGES[i + 1];
  return (
    `<nav class="pager" aria-label="Previous and next chapter">` +
    (prev ? `<a class="prev" rel="prev" href="./${prev.file}"><small>Previous</small><b>${prev.title}</b></a>` : "") +
    (next ? `<a class="next" rel="next" href="./${next.file}"><small>Next</small><b>${next.title}</b></a>` : "") +
    `</nav>`
  );
}

export function footerHtml(): string {
  return (
    `<footer class="site-foot">An unofficial reader's guide to <a href="${SITE.manuscript.announcement}"><i>${SITE.manuscript.title}</i></a> by ${SITE.manuscript.author}. ` +
    `The manuscript is an unrefereed draft; see <a href="./status.html">its status</a>. ` +
    `Figures are drawn live with <a href="https://github.com/unconed/mathbox">MathBox</a>. ` +
    `<a href="${SITE.repo}">Source on GitHub</a>. <a href="./llms.txt">Text version for AI agents</a>.</footer>`
  );
}

export function tocHtml(): string {
  return PAGES.slice(1)
    .map(
      (c) =>
        `<li><a href="./${c.file}"><span class="n">${c.short.length < 3 ? c.short : ""}</span><span class="t">${c.title}</span><span class="d">${c.blurb}</span></a></li>`,
    )
    .join("");
}
