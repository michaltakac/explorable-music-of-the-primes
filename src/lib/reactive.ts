// Reactive prose: scrubbable numbers ([data-var]), computed text ([data-out]) and form controls ([data-bind]).

import { clamp, fmt, fmtInt, type StoreApi } from "./store";

type S = Record<string, any> & StoreApi;

function format(v: number, kind: string | undefined): string {
  if (!kind || kind === "int") return fmtInt(v);
  if (kind.startsWith("f")) return fmt(v, Number(kind.slice(1)));
  return String(v);
}

function snap(v: number, step: number, min: number): number {
  const r = Math.round((v - min) / step) * step + min;
  return Number(r.toFixed(8));
}

export function bindScrubs(state: S, root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("[data-var]").forEach((el) => {
    const key = el.dataset.var!;
    const min = Number(el.dataset.min ?? 0);
    const max = Number(el.dataset.max ?? 100);
    const step = Number(el.dataset.step ?? 1);
    const log = el.dataset.scale === "log";
    const kind = el.dataset.fmt;
    const pxPerStep = Number(el.dataset.px ?? 0);
    el.classList.add("scrub");
    el.tabIndex = 0;
    el.setAttribute("role", "slider");
    el.setAttribute("aria-valuemin", String(min));
    el.setAttribute("aria-valuemax", String(max));
    if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", el.dataset.label ?? key);
    el.title = "Drag sideways, or use the arrow keys";

    const render = () => {
      const v = state[key];
      el.textContent = format(v, kind) + (el.dataset.unit ?? "");
      el.setAttribute("aria-valuenow", String(v));
    };
    const set = (v: number) => {
      state[key] = clamp(snap(v, step, min), min, max);
    };

    let startX = 0;
    let startV = 0;
    el.addEventListener("pointerdown", (e) => {
      el.setPointerCapture(e.pointerId);
      startX = e.clientX;
      startV = state[key];
      el.classList.add("dragging");
      document.body.classList.add("scrubbing");
      e.preventDefault();
      el.focus({ preventScroll: true });
    });
    el.addEventListener("pointermove", (e) => {
      if (!el.hasPointerCapture(e.pointerId)) return;
      const dx = e.clientX - startX;
      if (log) {
        const span = Math.log(max / min);
        set(Math.exp(clamp(Math.log(startV) + (dx / 320) * span, Math.log(min), Math.log(max))));
      } else {
        const per = pxPerStep || Math.max(2, 280 / ((max - min) / step));
        set(startV + (dx / per) * step);
      }
    });
    const end = (e: PointerEvent) => {
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      el.classList.remove("dragging");
      document.body.classList.remove("scrubbing");
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("keydown", (e) => {
      const big = e.shiftKey ? 10 : 1;
      const v = state[key];
      let nv: number | null = null;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") nv = log ? v * Math.pow(1.05, big) : v + step * big;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") nv = log ? v / Math.pow(1.05, big) : v - step * big;
      if (e.key === "Home") nv = min;
      if (e.key === "End") nv = max;
      if (nv !== null) {
        if (log && Math.abs(nv - v) < step) nv = v + Math.sign(nv - v) * step;
        set(nv);
        e.preventDefault();
      }
    });
    state.$on(render);
    render();
  });
}

export function bindControls(state: S, root: ParentNode = document) {
  root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>("[data-bind]").forEach((el) => {
    const key = el.dataset.bind!;
    if (el instanceof HTMLInputElement && el.type === "range") {
      const out = el.parentElement?.querySelector("output");
      const kind = el.dataset.fmt;
      const log = el.dataset.scale === "log"; // slider position is log10 of the value
      const sync = () => {
        el.value = String(log ? Math.log10(state[key]) : state[key]);
        if (out) out.textContent = format(state[key], kind);
      };
      el.addEventListener("input", () => (state[key] = log ? Math.round(Math.pow(10, Number(el.value))) : Number(el.value)));
      state.$on(sync);
      sync();
    } else if (el instanceof HTMLInputElement && el.type === "checkbox") {
      const sync = () => (el.checked = !!state[key]);
      el.addEventListener("change", () => (state[key] = el.checked));
      state.$on(sync);
      sync();
    } else if (el instanceof HTMLSelectElement) {
      const sync = () => (el.value = String(state[key]));
      el.addEventListener("change", () => (state[key] = isNaN(Number(el.value)) ? el.value : Number(el.value)));
      state.$on(sync);
      sync();
    } else if (el instanceof HTMLButtonElement) {
      // a button that sets state[key] to data-value; pressed when equal. Without data-value it toggles a boolean.
      const raw = el.dataset.value;
      const val: any = raw === undefined ? undefined : isNaN(Number(raw)) ? raw : Number(raw);
      const sync = () => el.setAttribute("aria-pressed", String(val === undefined ? !!state[key] : state[key] === val));
      el.addEventListener("click", () => (state[key] = val === undefined ? !state[key] : val));
      state.$on(sync);
      sync();
    }
  });
}

export function bindOutputs(state: S, outputs: Record<string, (s: any) => string>, root: ParentNode = document) {
  const els = Array.from(root.querySelectorAll<HTMLElement>("[data-out]"));
  els.forEach((el) => el.classList.add("out"));
  const render = () => {
    for (const el of els) {
      const fn = outputs[el.dataset.out!];
      if (!fn) continue;
      const text = fn(state);
      if (el.textContent !== text) el.textContent = text;
    }
  };
  state.$on(render);
  render();
}
