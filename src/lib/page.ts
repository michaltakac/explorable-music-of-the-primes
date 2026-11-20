import { initLayout } from "./layout";
import { bindControls, bindOutputs, bindScrubs } from "./reactive";
import type { StoreApi } from "./store";

/** Wire up a chapter page: chrome, math typesetting, scrubbable numbers, controls, computed text. */
export function page<T extends Record<string, any> & StoreApi>(state: T, outputs: Record<string, (s: T) => string> = {}) {
  initLayout();
  bindScrubs(state);
  bindControls(state);
  bindOutputs(state, outputs);
}

/** Fill xs, ys with a staircase of f sampled on [a, b]; returns the number of points written. */
export function steps(xs: Float64Array, ys: Float64Array, f: (x: number) => number, a: number, b: number, exactInts: boolean): number {
  const K = Math.floor(xs.length / 2) - 1;
  const ints = Math.floor(b) - Math.ceil(a) + 1;
  let c = 0;
  let prev = f(a);
  xs[c] = a;
  ys[c++] = prev;
  if (exactInts && ints <= K) {
    for (let n = Math.ceil(a); n <= b; n++) {
      const v = f(n);
      if (v !== prev) {
        xs[c] = n;
        ys[c++] = prev;
        xs[c] = n;
        ys[c++] = v;
        prev = v;
      }
    }
  } else {
    for (let i = 1; i <= K; i++) {
      const x = a + ((b - a) * i) / K;
      const v = f(x);
      if (v !== prev) {
        xs[c] = x;
        ys[c++] = prev;
        xs[c] = x;
        ys[c++] = v;
        prev = v;
      }
    }
  }
  xs[c] = b;
  ys[c++] = prev;
  return c;
}
