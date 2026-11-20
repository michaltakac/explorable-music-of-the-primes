// Build-time rendering of everything a crawler or an AI agent should see without running the page:
// the navigation, meta tags, structured data, a sitemap, llms.txt and Markdown versions of each page.

import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import type { Plugin } from "vite";
import { footerHtml, headerHtml, PAGES, pageOf, pagerHtml, SITE, slugOf, tocHtml, urlOf, type PageInfo } from "../src/site";
import { htmlToMarkdown } from "./markdown";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const grab = (html: string, re: RegExp) => (html.match(re)?.[1] ?? "").trim();
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function jsonLd(page: PageInfo, description: string, modified: string) {
  const url = urlOf(page.file);
  const author = { "@type": "Person", name: SITE.author, url: SITE.repo.replace(/\/[^/]+$/, "") };
  const website = { "@type": "WebSite", "@id": SITE.url + "#website", url: SITE.url, name: SITE.name, description: SITE.summary, inLanguage: "en", author };
  const manuscript = {
    "@type": "ScholarlyArticle",
    name: SITE.manuscript.title,
    author: { "@type": "Person", name: SITE.manuscript.author },
    datePublished: SITE.manuscript.date,
    url: SITE.manuscript.pdf,
    creativeWorkStatus: "Draft",
  };
  const index = PAGES.indexOf(page);
  const isHome = page.file === "index.html";
  const doc = {
    "@type": isHome ? ["WebPage", "LearningResource"] : ["Article", "LearningResource"],
    "@id": url + "#page",
    url,
    name: cap(page.title),
    headline: cap(page.title),
    description,
    image: `${SITE.url}og/${slugOf(page.file)}.png`,
    inLanguage: "en",
    isPartOf: { "@id": SITE.url + "#website" },
    author,
    dateModified: modified,
    learningResourceType: "Explorable explanation",
    interactivityType: "active",
    about: page.about.map((name) => ({ "@type": "Thing", name })),
    isBasedOn: manuscript,
    ...(isHome ? {} : { position: index }),
  };
  const crumbs = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE.name, item: SITE.url },
      ...(isHome ? [] : [{ "@type": "ListItem", position: 2, name: cap(page.title), item: url }]),
    ],
  };
  return JSON.stringify({ "@context": "https://schema.org", "@graph": [website, doc, crumbs] });
}

function headTags(page: PageInfo, html: string, modified: string): string {
  const description = grab(html, /<meta name="description" content="([^"]*)"/);
  const url = urlOf(page.file);
  const slug = slugOf(page.file);
  const isHome = page.file === "index.html";
  const title = isHome ? SITE.name : `${cap(page.title)} · ${SITE.name}`;
  const image = `${SITE.url}og/${slug}.png`;
  const alt = `${cap(page.title)}. ${page.blurb}`;
  return [
    `<link rel="canonical" href="${url}">`,
    `<meta name="author" content="${esc(SITE.author)}">`,
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">`,
    `<meta name="theme-color" content="#f6f2e9" media="(prefers-color-scheme: light)">`,
    `<meta name="theme-color" content="#15171b" media="(prefers-color-scheme: dark)">`,
    `<meta property="og:type" content="${isHome ? "website" : "article"}">`,
    `<meta property="og:site_name" content="${esc(SITE.name)}">`,
    `<meta property="og:locale" content="en_US">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:image:type" content="image/png">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(alt)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    `<meta name="twitter:image" content="${image}">`,
    `<meta name="twitter:image:alt" content="${esc(alt)}">`,
    `<link rel="alternate" type="text/markdown" href="./${slug}.md" title="This page as Markdown">`,
    `<link rel="alternate" type="text/plain" href="./llms.txt" title="Guide to this site for AI agents">`,
    `<link rel="sitemap" type="application/xml" href="./sitemap.xml">`,
    `<script type="application/ld+json">${jsonLd(page, description, modified)}</script>`,
  ].join("\n");
}

const tocMarkdown = () => PAGES.slice(1).map((p) => `- [${cap(p.title)}](${SITE.url}${slugOf(p.file)}.md): ${p.blurb}`).join("\n");

function pageMarkdown(root: string, page: PageInfo): string {
  const html = readFileSync(resolve(root, page.file), "utf8");
  const body = htmlToMarkdown(html, SITE.url, tocMarkdown());
  const note =
    `> From [${SITE.name}](${SITE.url}). Web version with live figures: ${urlOf(page.file)}\n` +
    `> The manuscript discussed here is an unrefereed draft of a proposed proof. Numbers in the text are the page's default values.\n\n`;
  return note + body;
}

function llmsTxt(): string {
  const m = SITE.manuscript;
  return `# ${SITE.name}

> ${SITE.summary}

Key facts for anyone summarising this site:

- The manuscript is "${m.title}" by ${m.author}, 940 pages, released as a draft on ${m.date} through a blog post by Ravi Vakil.
- It is a proposed proof of the generalized Riemann hypothesis for the L-functions of unitary Hecke characters of number fields. It has not been refereed, and the generalized Riemann hypothesis should still be described as open.
- Chapters 1 to 6 of the guide cover established mathematics. Chapter 7 describes the manuscript's strategy as its author presents it. The status page lists unfinished parts of the text.
- Each page exists as HTML with interactive figures and as plain Markdown at the same address ending in .md. Math is written in LaTeX between dollar signs.

## Chapters

${PAGES.slice(1, -1).map((p) => `- [${p.kicker}: ${cap(p.title)}](${SITE.url}${slugOf(p.file)}.md): ${p.blurb}`).join("\n")}

## Reference

- [Status, sources, glossary](${SITE.url}status.md): Established results, the manuscript's claims, and a page-referenced list of unfinished parts of the text.
- [Overview](${SITE.url}index.md): The landing page.
- [Full text](${SITE.url}llms-full.txt): Every page above in one Markdown file.

## Data

- [Zero tables](${SITE.url}data/zeros.json): JSON. "zeta" holds the imaginary parts of the first 300 zeros of the Riemann zeta function. Each of chi3, chi4, chi5q, chi5c, chi7 holds a Dirichlet character (modulus q, values on 0..q-1 as [re, im]) and the zeros of its L-function on the critical line with |t| <= 60. Computed with mpmath at 25 digits.

## Sources

- [The manuscript (PDF)](${m.pdf})
- [The announcement](${m.announcement}): "Hurried Announcement: Alessandro Masullo GRH", Ravi Vakil, ${m.date}.
- [Source code](${SITE.repo})
`;
}

function sitemap(modified: string): string {
  const urls = PAGES.map(
    (p, i) => `  <url><loc>${urlOf(p.file)}</loc><lastmod>${modified}</lastmod><priority>${i === 0 ? "1.0" : "0.8"}</priority></url>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function sitePlugin(root: string): Plugin {
  const modified = new Date().toISOString().slice(0, 10);
  return {
    name: "explorable-site",
    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        const file = basename(ctx.filename);
        const page = pageOf(file);
        let out = html.replace("</head>", headTags(page, html, modified) + "\n</head>");
        out = out.replace("<main>", headerHtml(file) + '\n<noscript><p class="noscript">The figures on this page need JavaScript. The text is complete without them.</p></noscript>\n<main>');
        out = out.replace("</main>", pagerHtml(file) + "\n</main>\n" + footerHtml());
        out = out.replace('<ol class="toc" id="toc"></ol>', `<ol class="toc" id="toc">${tocHtml()}</ol>`);
        return out;
      },
    },
    generateBundle() {
      const pages = PAGES.map((p) => ({ p, md: pageMarkdown(root, p) }));
      for (const { p, md } of pages) this.emitFile({ type: "asset", fileName: `${slugOf(p.file)}.md`, source: md });
      this.emitFile({ type: "asset", fileName: "llms.txt", source: llmsTxt() });
      this.emitFile({
        type: "asset",
        fileName: "llms-full.txt",
        source: `# ${SITE.name}\n\n> ${SITE.summary}\n\n` + pages.map(({ md }) => md).join("\n\n---\n\n"),
      });
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemap(modified) });
      this.emitFile({ type: "asset", fileName: "data/zeros.json", source: readFileSync(resolve(root, "src/data/zeros.json"), "utf8") });
    },
  };
}
