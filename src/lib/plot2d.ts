// A small 2D plotting layer on MathBox. MathBox draws the marks (lines, points, bands);
// a DOM overlay carries tick labels, annotations and the draggable handles, so every handle
// is a real focusable control with keyboard support.

import type { Stage } from "./figure";
import { clamp } from "./store";

export interface Tick {
  v: number;
  label: string;
}
type TickSpec = number[] | Tick[] | ((lo: number, hi: number) => Tick[] | number[]) | false;

export interface PlotOpts {
  x: [number, number];
  y: [number, number];
  margin?: Partial<{ l: number; r: number; t: number; b: number }>;
  xTicks?: TickSpec;
  yTicks?: TickSpec;
  xFmt?: (v: number) => string;
  yFmt?: (v: number) => string;
  xTitle?: string;
  yTitle?: string;
  grid?: boolean;
  zeroLines?: boolean;
}

interface MarkOpts {
  color?: string;
  width?: number;
  size?: number;
  opacity?: number;
  dashed?: boolean;
}

export interface HandleOpts {
  get: () => [number, number];
  set: (x: number, y: number) => void;
  axis?: "x" | "y" | "xy";
  label: string;
  step?: [number, number];
  valueText?: () => string;
}

function niceStep(span: number, target: number): number {
  const raw = span / target;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

export function niceTicks(lo: number, hi: number, target = 6): number[] {
  const st = niceStep(hi - lo, target);
  const out: number[] = [];
  for (let v = Math.ceil(lo / st - 1e-9) * st; v <= hi + st * 1e-9; v += st) out.push(Math.abs(v) < st * 1e-9 ? 0 : v);
  return out;
}

function defaultFmt(v: number): string {
  const a = Math.abs(v);
  let s: string;
  if (a >= 10000) s = Math.round(v).toLocaleString("en-US");
  else if (a >= 100 || Number.isInteger(v)) s = String(Math.round(v * 100) / 100);
  else s = String(Number(v.toPrecision(3)));
  return s.replace("-", "−");
}

let uid = 0;

export type Plot = ReturnType<typeof plot2d>;

export function plot2d(stage: Stage, o: PlotOpts) {
  const { mathbox, el, pal } = stage;
  const M = { l: 46, r: 14, t: 14, b: 30, ...(o.margin ?? {}) };
  let [x0, x1] = o.x;
  let [y0, y1] = o.y;
  let W = 1;
  let H = 1;
  let dirty = true;
  let z = 1;

  mathbox.camera({ proxy: false, position: [0, 0, 3] });
  const view = mathbox.cartesian({ range: [[x0, x1], [y0, y1], [-1, 1]], scale: [1, 1, 1] });

  const overlay = document.createElement("div");
  overlay.className = "fig-overlay";
  el.append(overlay);
  const masks = ["l", "r", "t", "b"].map(() => {
    const m = document.createElement("div");
    m.style.cssText = "position:absolute;background:var(--paper)";
    overlay.append(m);
    return m;
  });
  const tickLayer = document.createElement("div");
  overlay.append(tickLayer);

  const toPx = (x: number, y: number): [number, number] => [
    M.l + ((x - x0) / (x1 - x0)) * (W - M.l - M.r),
    M.t + (1 - (y - y0) / (y1 - y0)) * (H - M.t - M.b),
  ];
  const fromPx = (px: number, py: number): [number, number] => [
    x0 + ((px - M.l) / (W - M.l - M.r)) * (x1 - x0),
    y0 + (1 - (py - M.t) / (H - M.t - M.b)) * (y1 - y0),
  ];

  // ---- grid and axes (MathBox segments) ----
  const GN = 48;
  const gridSeg = new Float64Array(GN * 4);
  const axisSeg = new Float64Array(4 * 4);
  let xt: Tick[] = [];
  let yt: Tick[] = [];
  const far = () => x0 - (x1 - x0) * 50;

  function resolveTicks(spec: TickSpec | undefined, lo: number, hi: number, f: (v: number) => string, target: number): Tick[] {
    if (spec === false) return [];
    const raw = typeof spec === "function" ? spec(lo, hi) : spec ?? niceTicks(lo, hi, target);
    return (raw as any[]).map((t) => (typeof t === "number" ? { v: t, label: f(t) } : t)).filter((t) => t.v >= lo - 1e-9 && t.v <= hi + 1e-9);
  }

  view
    .array({ width: GN, items: 2, channels: 2, expr: (emit: any, i: number) => {
      emit(gridSeg[4 * i], gridSeg[4 * i + 1]);
      emit(gridSeg[4 * i + 2], gridSeg[4 * i + 3]);
    } })
    .vector({ color: pal.grid, width: 1, end: false, zIndex: z++, opacity: o.grid === false ? 0 : 1 });
  view
    .array({ width: 4, items: 2, channels: 2, expr: (emit: any, i: number) => {
      emit(axisSeg[4 * i], axisSeg[4 * i + 1]);
      emit(axisSeg[4 * i + 2], axisSeg[4 * i + 3]);
    } })
    .vector({ color: pal.ink2, width: 1.5, end: false, zIndex: z++ });

  function rebuildTicks() {
    xt = resolveTicks(o.xTicks, x0, x1, o.xFmt ?? defaultFmt, Math.max(3, Math.round((W - M.l - M.r) / 95)));
    yt = resolveTicks(o.yTicks, y0, y1, o.yFmt ?? defaultFmt, Math.max(3, Math.round((H - M.t - M.b) / 60)));
    let k = 0;
    const f = far();
    for (const t of xt) if (k < GN) gridSeg.set([t.v, y0, t.v, y1], 4 * k++);
    for (const t of yt) if (k < GN) gridSeg.set([x0, t.v, x1, t.v], 4 * k++);
    for (; k < GN; k++) gridSeg.set([f, y0, f, y0], 4 * k);
    axisSeg.set([x0, y0, x1, y0], 0);
    axisSeg.set([x0, y0, x0, y1], 4);
    if (o.zeroLines !== false && y0 < 0 && y1 > 0) axisSeg.set([x0, 0, x1, 0], 8);
    else axisSeg.set([f, y0, f, y0], 8);
    if (o.zeroLines !== false && x0 < 0 && x1 > 0) axisSeg.set([0, y0, 0, y1], 12);
    else axisSeg.set([f, y0, f, y0], 12);

    tickLayer.textContent = "";
    for (const t of xt) {
      const s = document.createElement("span");
      s.className = "tick x";
      s.textContent = t.label;
      const [px] = toPx(t.v, y0);
      s.style.left = px + "px";
      s.style.top = H - M.b + "px";
      tickLayer.append(s);
    }
    for (const t of yt) {
      const s = document.createElement("span");
      s.className = "tick y";
      s.textContent = t.label;
      const [, py] = toPx(x0, t.v);
      s.style.left = M.l + "px";
      s.style.top = py + "px";
      tickLayer.append(s);
    }
    if (o.xTitle) {
      const s = document.createElement("span");
      s.className = "axis-title";
      s.textContent = o.xTitle;
      s.style.right = M.r + 2 + "px";
      s.style.top = H - M.b - 20 + "px";
      tickLayer.append(s);
    }
    if (o.yTitle) {
      const s = document.createElement("span");
      s.className = "axis-title";
      s.textContent = o.yTitle;
      s.style.left = M.l + 6 + "px";
      s.style.top = M.t + 2 + "px";
      tickLayer.append(s);
    }
  }

  // ---- labels and handles (DOM) ----
  const placed: (() => void)[] = [];

  function label(cls = "") {
    const s = document.createElement("span");
    s.className = "lbl " + cls;
    s.style.display = "none";
    overlay.append(s);
    let lx = 0;
    let ly = 0;
    let shown = false;
    const place = () => {
      if (!shown) return;
      const [px, py] = toPx(lx, ly);
      s.style.left = px + "px";
      s.style.top = py + "px";
    };
    placed.push(place);
    return {
      el: s,
      at(x: number, y: number, html?: string) {
        lx = x;
        ly = y;
        shown = true;
        if (html !== undefined && s.innerHTML !== html) s.innerHTML = html;
        s.style.display = "";
        place();
      },
      hide() {
        shown = false;
        s.style.display = "none";
      },
    };
  }

  function handle(h: HandleOpts) {
    const b = document.createElement("button");
    b.type = "button";
    const axis = h.axis ?? "xy";
    b.className = "handle ax-" + axis;
    b.setAttribute("role", "slider");
    b.setAttribute("aria-label", h.label);
    b.title = h.label + " (drag, or use the arrow keys)";
    overlay.append(b);
    const place = () => {
      const [x, y] = h.get();
      const [px, py] = toPx(x, y);
      b.style.left = px + "px";
      b.style.top = py + "px";
      b.style.display = px < M.l - 2 || px > W - M.r + 2 || py < M.t - 2 || py > H - M.b + 2 ? "none" : "";
      b.setAttribute("aria-valuenow", String(Number((axis === "y" ? y : x).toPrecision(5))));
      if (h.valueText) b.setAttribute("aria-valuetext", h.valueText());
    };
    placed.push(place);
    let off: [number, number] = [0, 0];
    b.addEventListener("pointerdown", (e) => {
      b.setPointerCapture(e.pointerId);
      b.classList.add("dragging");
      const r = el.getBoundingClientRect();
      const [x, y] = h.get();
      const [px, py] = toPx(x, y);
      off = [e.clientX - r.left - px, e.clientY - r.top - py];
      e.preventDefault();
    });
    b.addEventListener("pointermove", (e) => {
      if (!b.hasPointerCapture(e.pointerId)) return;
      const r = el.getBoundingClientRect();
      const [cx, cy] = h.get();
      let [x, y] = fromPx(e.clientX - r.left - off[0], e.clientY - r.top - off[1]);
      if (axis === "x") y = cy;
      if (axis === "y") x = cx;
      h.set(clamp(x, x0, x1), clamp(y, y0, y1));
    });
    const end = (e: PointerEvent) => {
      if (b.hasPointerCapture(e.pointerId)) b.releasePointerCapture(e.pointerId);
      b.classList.remove("dragging");
    };
    b.addEventListener("pointerup", end);
    b.addEventListener("pointercancel", end);
    b.addEventListener("keydown", (e) => {
      const [sx, sy] = h.step ?? [(x1 - x0) / 100, (y1 - y0) / 100];
      const k = e.shiftKey ? 10 : 1;
      let [x, y] = h.get();
      let used = true;
      if (e.key === "ArrowRight" && axis !== "y") x += sx * k;
      else if (e.key === "ArrowLeft" && axis !== "y") x -= sx * k;
      else if (e.key === "ArrowUp" && axis !== "x") y += sy * k;
      else if (e.key === "ArrowDown" && axis !== "x") y -= sy * k;
      else if (e.key === "ArrowUp" && axis === "x") x += sx * k;
      else if (e.key === "ArrowDown" && axis === "x") x -= sx * k;
      else if (e.key === "ArrowRight" && axis === "y") y += sy * k;
      else if (e.key === "ArrowLeft" && axis === "y") y -= sy * k;
      else used = false;
      if (used) {
        h.set(clamp(x, x0, x1), clamp(y, y0, y1));
        e.preventDefault();
      }
    });
    return b;
  }

  function readout() {
    const r = document.createElement("div");
    r.className = "fig-readout";
    el.append(r);
    return r;
  }

  // ---- data marks (MathBox) ----
  const refreshers: (() => void)[] = [];
  const pad = (xs: Float64Array, ys: Float64Array, c: number) => {
    const n = xs.length;
    if (c >= n) return;
    const lx = c > 0 ? xs[c - 1] : far();
    const ly = c > 0 ? ys[c - 1] : y0;
    for (let i = c; i < n; i++) {
      xs[i] = lx;
      ys[i] = ly;
    }
  };

  /** A polyline of up to n points. `fill` writes xs, ys and may return how many points it used. */
  function line(n: number, m: MarkOpts, fill: (xs: Float64Array, ys: Float64Array) => number | void) {
    const xs = new Float64Array(n);
    const ys = new Float64Array(n);
    refreshers.push(() => pad(xs, ys, fill(xs, ys) ?? n));
    view.array({ width: n, channels: 2, expr: (emit: any, i: number) => emit(xs[i], ys[i]) });
    view.line({ color: m.color ?? pal.ink, width: m.width ?? 2.5, opacity: m.opacity ?? 1, zIndex: z++, stroke: m.dashed ? "dashed" : "solid" });
  }

  /** Up to n dots. Unused dots are parked off-screen. */
  function points(n: number, m: MarkOpts, fill: (xs: Float64Array, ys: Float64Array) => number | void) {
    const xs = new Float64Array(n);
    const ys = new Float64Array(n);
    refreshers.push(() => {
      const c = fill(xs, ys) ?? n;
      for (let i = c; i < n; i++) {
        xs[i] = far();
        ys[i] = y0;
      }
    });
    view.array({ width: n, channels: 2, expr: (emit: any, i: number) => emit(xs[i], ys[i]) });
    const id = "mark" + uid++;
    view.point({ id, color: m.color ?? pal.ink, size: m.size ?? 8, opacity: m.opacity ?? 1, zIndex: z++ });
    return { set: (props: Record<string, any>) => mathbox.select("#" + id).set(props) };
  }

  /** Up to n separate segments; `fill` writes [x1, y1, x2, y2] per segment and returns the count. */
  function segments(n: number, m: MarkOpts, fill: (a: Float64Array) => number | void) {
    const a = new Float64Array(n * 4);
    refreshers.push(() => {
      const c = fill(a) ?? n;
      const f = far();
      for (let i = c; i < n; i++) a.set([f, y0, f, y0], 4 * i);
    });
    view.array({ width: n, items: 2, channels: 2, expr: (emit: any, i: number) => {
      emit(a[4 * i], a[4 * i + 1]);
      emit(a[4 * i + 2], a[4 * i + 3]);
    } });
    view.vector({ color: m.color ?? pal.ink, width: m.width ?? 2, opacity: m.opacity ?? 1, end: false, zIndex: z++ });
  }

  /** A filled band between lo(x) and hi(x). */
  function band(n: number, m: MarkOpts, fill: (xs: Float64Array, lo: Float64Array, hi: Float64Array) => void) {
    const xs = new Float64Array(n);
    const lo = new Float64Array(n);
    const hi = new Float64Array(n);
    refreshers.push(() => fill(xs, lo, hi));
    view.matrix({ width: n, height: 2, channels: 2, expr: (emit: any, i: number, j: number) => emit(xs[i], j ? hi[i] : lo[i]) });
    view.surface({ color: m.color ?? pal.ink, opacity: m.opacity ?? 0.15, shaded: false, zIndex: z++ });
  }

  // ---- layout ----
  function layout() {
    W = el.clientWidth || 1;
    H = el.clientHeight || 1;
    const H0 = 3 * Math.tan((30 * Math.PI) / 180);
    const u = (2 * H0) / H;
    const Wp = W - M.l - M.r;
    const Hp = H - M.t - M.b;
    view.set({
      scale: [(Wp / 2) * u, (Hp / 2) * u, 1],
      position: [(M.l + Wp / 2 - W / 2) * u, -(M.t + Hp / 2 - H / 2) * u, 0],
    });
    masks[0].style.cssText += `;left:0;top:0;width:${M.l - 1}px;height:100%`;
    masks[1].style.cssText += `;right:0;top:0;width:${M.r - 1}px;height:100%`;
    masks[2].style.cssText += `;left:0;top:0;width:100%;height:${M.t - 1}px`;
    masks[3].style.cssText += `;left:0;bottom:0;width:100%;height:${M.b - 1}px`;
    rebuildTicks();
    placed.forEach((p) => p());
    resizeCbs.forEach((cb) => cb());
  }
  const resizeCbs: (() => void)[] = [];
  const ro = new ResizeObserver(() => layout());
  ro.observe(el);
  stage.onDispose(() => ro.disconnect());

  stage.onFrame(() => {
    if (!dirty) return;
    dirty = false;
    refreshers.forEach((r) => r());
    placed.forEach((p) => p());
  });

  let hoverCb: ((x: number | null, y: number | null) => void) | null = null;
  const onMove = (e: PointerEvent) => {
    if (!hoverCb) return;
    const r = el.getBoundingClientRect();
    const [x, y] = fromPx(e.clientX - r.left, e.clientY - r.top);
    if (x < x0 || x > x1 || y < y0 || y > y1) hoverCb(null, null);
    else hoverCb(x, y);
  };
  const onLeave = () => hoverCb?.(null, null);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerleave", onLeave);
  stage.onDispose(() => {
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerleave", onLeave);
  });

  layout();

  return {
    view,
    pal,
    line,
    points,
    segments,
    band,
    label,
    handle,
    readout,
    toPx,
    fromPx,
    get range() {
      return { x0, x1, y0, y1 };
    },
    setRange(x: [number, number], y: [number, number]) {
      if (x[0] === x0 && x[1] === x1 && y[0] === y0 && y[1] === y1) return;
      [x0, x1] = x;
      [y0, y1] = y;
      view.set("range", [[x0, x1], [y0, y1], [-1, 1]]);
      rebuildTicks();
      dirty = true;
    },
    invalidate() {
      dirty = true;
    },
    /** recompute tick positions and labels (for tick functions that depend on outside state) */
    retick() {
      rebuildTicks();
    },
    /** width / height of the plotting rectangle in pixels */
    get aspect() {
      return (W - M.l - M.r) / Math.max(1, H - M.t - M.b);
    },
    /** centre the view on (cx, cy) with the given half-height and equal units on both axes */
    setSquare(cx: number, cy: number, halfH: number) {
      const halfW = halfH * ((W - M.l - M.r) / Math.max(1, H - M.t - M.b));
      this.setRange([cx - halfW, cx + halfW], [cy - halfH, cy + halfH]);
    },
    onResize(cb: () => void) {
      resizeCbs.push(cb);
    },
    hover(cb: (x: number | null, y: number | null) => void) {
      hoverCb = cb;
    },
  };
}
