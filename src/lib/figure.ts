// Figure lifecycle. Each figure owns one MathBox (WebGL) context, created when it scrolls near the
// viewport and destroyed when it is far away, so a long page never holds more than a few contexts.

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as MathBox from "mathbox";

export interface Palette {
  paper: string;
  paper2: string;
  ink: string;
  ink2: string;
  rule: string;
  grid: string;
  prime: string;
  zero: string;
  touch: string;
}

export function palette(): Palette {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string) => cs.getPropertyValue(n).trim();
  return {
    paper: v("--paper"),
    paper2: v("--paper-2"),
    ink: v("--ink"),
    ink2: v("--ink-2"),
    rule: v("--rule"),
    grid: v("--grid"),
    prime: v("--prime"),
    zero: v("--zero"),
    touch: v("--touch"),
  };
}

export interface Stage {
  el: HTMLElement;
  pal: Palette;
  mathbox: any;
  three: any;
  /** register cleanup to run when the figure unmounts */
  onDispose(fn: () => void): void;
  /** call every animation frame while mounted */
  onFrame(fn: (time: number) => void): void;
  reducedMotion: boolean;
}

type Builder = (stage: Stage) => void;

interface Entry {
  el: HTMLElement;
  build: Builder;
  threeD: boolean;
  dispose: (() => void) | null;
  near: boolean;
}

const entries: Entry[] = [];
let webglOk: boolean | null = null;

function hasWebGL(): boolean {
  if (webglOk !== null) return webglOk;
  try {
    const c = document.createElement("canvas");
    webglOk = !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webglOk = false;
  }
  return webglOk;
}

function setState(el: HTMLElement, text: string | null) {
  let s = el.querySelector<HTMLElement>(":scope > .fig-state");
  if (text === null) {
    s?.remove();
    return;
  }
  if (!s) {
    s = document.createElement("div");
    s.className = "fig-state";
    el.append(s);
  }
  s.textContent = text;
}

function mount(entry: Entry) {
  if (entry.dispose) return;
  const el = entry.el;
  if (!hasWebGL()) {
    setState(el, "This figure is drawn with WebGL, which this browser has switched off. The text around it still tells the whole story.");
    return;
  }
  const disposers: (() => void)[] = [];
  const frames: ((t: number) => void)[] = [];
  let mathbox: any;
  try {
    const pal = palette();
    mathbox = MathBox.mathBox({
      element: el,
      plugins: entry.threeD ? ["core", "controls"] : ["core"],
      controls: entry.threeD ? { klass: OrbitControls } : undefined,
      camera: { fov: 60 },
      mathbox: { inspect: false, splash: false },
    } as any);
    const three = mathbox.three;
    three.renderer.setClearColor(new THREE.Color(pal.paper), 1);
    mathbox.set({ focus: 3 });
    if (entry.threeD && three.controls) {
      three.controls.enableZoom = false;
      three.controls.enablePan = false;
      three.controls.rotateSpeed = 0.6;
    }
    const start = performance.now();
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      for (const f of frames) f(t);
    };
    three.on("update", tick);
    const stage: Stage = {
      el,
      pal,
      mathbox,
      three,
      onDispose: (fn) => disposers.push(fn),
      onFrame: (fn) => frames.push(fn),
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    };
    entry.build(stage);
    (el as any).__mathbox = mathbox; // handy when debugging a figure from the console
    // MathBox compiles shaders over the first frames; keep the loading note until it reports done.
    const ready = () => setState(el, null);
    const onProgress = (e: any) => {
      if (e.current >= e.total) ready();
    };
    three.on("mathbox/progress", onProgress);
    const fallback = window.setTimeout(ready, 6000);
    disposers.push(() => {
      clearTimeout(fallback);
      three.off("mathbox/progress", onProgress);
    });
    entry.dispose = () => {
      disposers.forEach((d) => d());
      try {
        three.off("update", tick);
        const gl = three.renderer.getContext();
        three.destroy();
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      } catch {}
      el.replaceChildren();
    };
  } catch (err) {
    console.error(err);
    try {
      mathbox?.three?.destroy();
    } catch {}
    el.replaceChildren();
    setState(el, "This figure failed to draw. Reloading the page usually fixes it.");
    entry.dispose = () => {};
  }
}

function unmount(entry: Entry) {
  if (!entry.dispose) return;
  entry.dispose();
  entry.dispose = null;
  setState(entry.el, "Drawing the figure…");
}

const nearObserver =
  typeof IntersectionObserver !== "undefined"
    ? new IntersectionObserver(
        (items) => {
          for (const it of items) {
            const entry = entries.find((e) => e.el === it.target);
            if (!entry) continue;
            entry.near = it.isIntersecting;
            if (it.isIntersecting) mount(entry);
            else unmount(entry);
          }
        },
        { rootMargin: "700px 0px 700px 0px" },
      )
    : null;

/** Register a figure. `id` is the id of the <figure>; the stage is its .fig-stage child. */
export function figure(id: string, build: Builder, opts: { threeD?: boolean } = {}) {
  const fig = document.getElementById(id);
  const el = fig?.classList.contains("fig-stage") ? fig : fig?.querySelector<HTMLElement>(".fig-stage");
  if (!el) {
    console.warn("figure not found:", id);
    return;
  }
  if (opts.threeD) el.classList.add("three-d");
  setState(el, "Drawing the figure…");
  const entry: Entry = { el, build, threeD: !!opts.threeD, dispose: null, near: false };
  entries.push(entry);
  if (nearObserver) nearObserver.observe(el);
  else mount(entry);
}

/** Rebuild every mounted figure, e.g. after a theme change. */
export function remountAll() {
  for (const e of entries) {
    if (e.dispose) {
      unmount(e);
      if (e.near) mount(e);
    }
  }
}
