// Convert a chapter's HTML into plain Markdown for text-only readers and AI agents.
// The converter understands the handful of block types the chapters use.

import { HTMLElement, type Node, NodeType, parse } from "node-html-parser";

const tidy = (s: string) =>
  s
    .replace(/\s+/g, " ")
    .replace(/ ([.,;:!?)])/g, "$1")
    .replace(/\( /g, "(")
    .trim();

function inline(node: Node, base: string): string {
  if (node.nodeType === NodeType.TEXT_NODE) return node.text;
  if (!(node instanceof HTMLElement)) return "";
  const tag = node.tagName?.toLowerCase();
  const kids = () => node.childNodes.map((c) => inline(c, base)).join("");
  switch (tag) {
    case "a": {
      const href = node.getAttribute("href") ?? "";
      const abs = href.startsWith("./") ? base + href.slice(2).replace(/^index\.html$/, "") : href;
      return `[${tidy(kids())}](${abs})`;
    }
    case "b":
    case "strong":
      return `**${tidy(kids())}**`;
    case "i":
    case "em":
      return `*${tidy(kids())}*`;
    case "sup":
      return `^${kids()}`;
    case "br":
      return " ";
    case "input":
    case "button":
    case "output":
    case "select":
    case "label":
    case "script":
      return "";
    default:
      return kids();
  }
}

function table(el: HTMLElement, base: string): string {
  const rows = el.querySelectorAll("tr").map((tr) => tr.querySelectorAll("th,td").map((c) => tidy(inline(c, base)).replace(/\|/g, "\\|")));
  const body = rows.filter((r) => r.length > 0);
  if (body.length < 2) return "";
  const head = body[0];
  return [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...body.slice(1).map((r) => `| ${r.join(" | ")} |`)].join("\n");
}

function block(node: Node, base: string, out: string[]) {
  if (node.nodeType === NodeType.TEXT_NODE) {
    const t = node.text.trim();
    if (t.startsWith("$$")) out.push(t);
    else if (t) out.push(tidy(t));
    return;
  }
  if (!(node instanceof HTMLElement)) return;
  const tag = node.tagName?.toLowerCase();
  const cls = node.getAttribute("class") ?? "";
  if (/^h[1-4]$/.test(tag)) {
    out.push("#".repeat(Number(tag[1])) + " " + tidy(inline(node, base)));
  } else if (tag === "p") {
    const t = tidy(inline(node, base));
    if (t) out.push(cls.includes("chapter-no") ? `*${t}*` : t);
  } else if (tag === "ul" || tag === "ol") {
    out.push(
      node
        .querySelectorAll(":scope > li")
        .map((li, i) => `${tag === "ol" ? i + 1 + "." : "-"} ${tidy(inline(li, base))}`)
        .join("\n"),
    );
  } else if (tag === "figure") {
    const labels = node
      .querySelectorAll(".fig-stage")
      .map((s) => s.getAttribute("aria-label") ?? "")
      .filter(Boolean)
      .join(" ");
    const cap = node.querySelector("figcaption");
    out.push(`> **Interactive figure.** ${labels}` + (cap ? ` Caption: ${tidy(inline(cap, base))}` : ""));
  } else if (tag === "aside") {
    const text = node
      .querySelectorAll("p")
      .map((p) => tidy(inline(p, base)))
      .join(" ");
    out.push(`> **In plain words.** ${text}`);
  } else if (tag === "div" && cls.includes("status")) {
    const lines: string[] = [];
    for (const c of node.childNodes) {
      if (!(c instanceof HTMLElement)) continue;
      const ct = c.tagName.toLowerCase();
      if (ct === "h3") lines.push(`**${tidy(inline(c, base))}**`);
      else if (ct === "ul") c.querySelectorAll("li").forEach((li) => lines.push(`- ${tidy(inline(li, base))}`));
      else lines.push(tidy(inline(c, base)));
    }
    out.push(lines.map((l) => `> ${l}`).join("\n>\n"));
  } else if (tag === "table") {
    const t = table(node, base);
    if (t) out.push(t);
  } else if (tag === "dl") {
    const dts = node.querySelectorAll("dt");
    const dds = node.querySelectorAll("dd");
    out.push(dts.map((dt, i) => `- **${tidy(inline(dt, base))}**: ${tidy(inline(dds[i], base))}`).join("\n"));
  } else if (tag === "div" || tag === "article" || tag === "section") {
    node.childNodes.forEach((c) => block(c, base, out));
  }
}

/** Markdown for the <main> of a page. `toc` replaces the chapter list placeholder on the landing page. */
export function htmlToMarkdown(html: string, base: string, toc: string): string {
  const root = parse(html);
  const main = root.querySelector("main");
  if (!main) return "";
  const out: string[] = [];
  for (const c of main.childNodes) {
    if (c instanceof HTMLElement && c.getAttribute("id") === "toc") out.push(toc);
    else block(c, base, out);
  }
  return out.filter(Boolean).join("\n\n") + "\n";
}
