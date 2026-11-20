import { figure } from "../lib/figure";
import { gcd, PRIMES } from "../lib/math/numbers";
import { page } from "../lib/page";
import { plot2d } from "../lib/plot2d";
import { fmt, store } from "../lib/store";

const s = store({ a: 360, b: 7, p: 3, shells: 1, s: 1, t: 0.5 });

// ---------- sizes of a rational number ----------
function valuations(a: number, b: number): Map<number, number> {
  const g = gcd(a, b);
  a /= g;
  b /= g;
  const v = new Map<number, number>();
  for (const p of PRIMES) {
    if (p > Math.max(a, b)) break;
    let k = 0;
    while (a % p === 0) {
      a /= p;
      k++;
    }
    while (b % p === 0) {
      b /= p;
      k--;
    }
    if (k) v.set(p, k);
  }
  return v;
}
const sup = (k: number) => String(k).replace(/[-0-9]/g, (c) => "⁻⁰¹²³⁴⁵⁶⁷⁸⁹"["-0123456789".indexOf(c)]);
function sizeText(p: number, k: number): string {
  const n = Math.pow(p, Math.abs(k));
  return k > 0 ? `1/${n}` : String(n);
}
function places(a: number, b: number) {
  const v = valuations(a, b);
  const list = [2, 3, 5, 7, 11, 13];
  for (const p of v.keys()) if (!list.includes(p)) list.push(p);
  list.sort((x, y) => x - y);
  return { v, list };
}

// ---------- p-adic shells ----------
// Shell k (numbers divisible by p exactly k times) is drawn as a ring of radius RATIO^k.
// A number p^k * u sits on ring k at the angle given by the p-adic digits of its unit part u,
// read as a fraction 0.d0 d1 d2... in base p. The first digit of a unit is never 0, which leaves a gap.
const RINGS = 7;
const RATIO = 0.64;
const DIGITS: Record<number, number> = { 2: 6, 3: 4, 5: 3, 7: 3 };
function ringAngles(p: number): Float32Array {
  const M = DIGITS[p];
  const out: number[] = [];
  const total = Math.pow(p, M);
  for (let u = 1; u < total; u++) {
    if (u % p === 0) continue;
    let m = u;
    let frac = 0;
    let w = 1 / p;
    for (let j = 0; j < M; j++) {
      frac += (m % p) * w;
      m = Math.floor(m / p);
      w /= p;
    }
    out.push(2 * Math.PI * frac);
  }
  return Float32Array.from(out);
}
const angleCache = new Map<number, Float32Array>();
const anglesOf = (p: number) => {
  if (!angleCache.has(p)) angleCache.set(p, ringAngles(p));
  return angleCache.get(p)!;
};

// ---------- theta ----------
function theta(t: number): number {
  let sum = 0;
  for (let n = 1; n < 80; n++) {
    const e = Math.exp(-Math.PI * n * n * t * t);
    sum += 2 * e;
    if (e < 1e-17) break;
  }
  return sum;
}
const G = (t: number) => Math.sqrt(t) * (1 + theta(t));

page(s, {
  factored: (s) => {
    const { v } = places(s.a, s.b);
    if (v.size === 0) return "1";
    return [...v.entries()].sort((x, y) => x[0] - y[0]).map(([p, k]) => (k === 1 ? `${p}` : `${p}${sup(k)}`)).join(" · ");
  },
  sizes: (s) => {
    const { v } = places(s.a, s.b);
    const parts = [`${fmt(s.a / s.b, 3)} on the ordinary ruler`];
    for (const [p, k] of [...v.entries()].sort((x, y) => x[0] - y[0])) parts.push(`${sizeText(p, k)} on the ${p}-adic ruler`);
    return parts.join(", ") + (v.size ? ", and 1 on every other ruler" : ", and 1 on every prime ruler");
  },
  product: () => "1",
  pVal: (s) => String(s.p),
  shellsWord: (s) => {
    const k = Math.min(s.shells, RINGS);
    return k === 1 ? "shell" : `${k} shells`;
  },
  shellSum: (s) => {
    let sum = 0;
    for (let k = 0; k < Math.min(s.shells, RINGS); k++) sum += Math.pow(s.p, -k * s.s);
    return fmt(sum, 4);
  },
  eulerFactor: (s) => fmt(1 / (1 - Math.pow(s.p, -s.s)), 4),
  gT: (s) => fmt(G(s.t), 4),
  tInv: (s) => fmt(1 / s.t, 2),
  gInv: (s) => fmt(G(1 / s.t), 4),
});

figure("fig-product", (stage) => {
  const NB = 12;
  const p = plot2d(stage, { x: [0, 8], y: [-4, 4], xTicks: false, margin: { b: 34 } });
  const bars = new Float64Array(NB);
  let names: string[] = [];
  let texts: string[] = [];
  const compute = () => {
    const { v, list } = places(s.a, s.b);
    names = ["∞", ...list.map(String)];
    bars.fill(0);
    bars[0] = Math.log(s.a / s.b);
    texts = [fmt(s.a / s.b, s.a / s.b >= 100 ? 1 : 3)];
    list.forEach((q, i) => {
      const k = v.get(q) ?? 0;
      bars[i + 1] = -k * Math.log(q);
      texts.push(k ? sizeText(q, k) : "1");
    });
  };
  const mk = (color: string, from: number, to: number) =>
    p.segments(NB, { color, width: 18 }, (a) => {
      let c = 0;
      for (let i = from; i < Math.min(to, names.length); i++) a.set([i + 0.5, 0, i + 0.5, bars[i]], 4 * c++);
      return c;
    });
  mk(p.pal.ink, 0, 1);
  mk(p.pal.prime, 1, NB);
  const nameLabels = Array.from({ length: NB }, () => p.label("muted"));
  const valLabels = Array.from({ length: NB }, () => p.label(""));
  const update = () => {
    compute();
    const m = Math.max(2.5, ...Array.from(bars, Math.abs)) * 1.28;
    p.setRange([0, names.length], [-m, m]);
    nameLabels.forEach((l, i) => (i < names.length ? l.at(i + 0.5, -m * 0.93, names[i]) : l.hide()));
    valLabels.forEach((l, i) => (i < names.length ? l.at(i + 0.5, bars[i] + (bars[i] >= 0 ? 1 : -1) * m * 0.08, texts[i]) : l.hide()));
    p.invalidate();
  };
  stage.onDispose(s.$on(update));
  update();
});

figure("fig-shells", (stage) => {
  const p = plot2d(stage, { x: [-1.2, 1.2], y: [-1.2, 1.2], xTicks: false, yTicks: false, grid: false, zeroLines: false, margin: { l: 10, r: 10, t: 10, b: 10 } });
  const CAP = 2100;
  const fill = (lit: boolean) => (xs: Float64Array, ys: Float64Array) => {
    const ang = anglesOf(s.p);
    let c = 0;
    for (let k = 0; k < RINGS; k++) {
      if (k < s.shells !== lit) continue;
      const r = Math.pow(RATIO, k);
      for (let i = 0; i < ang.length && c < CAP; i++) {
        xs[c] = r * Math.sin(ang[i]);
        ys[c++] = r * Math.cos(ang[i]);
      }
    }
    return c;
  };
  const dim = p.points(CAP, { color: p.pal.ink2, size: 5, opacity: 0.6 }, fill(false));
  const lit = p.points(CAP, { color: p.pal.prime, size: 5 }, fill(true));
  p.points(1, { color: p.pal.ink, size: 6 }, (xs, ys) => {
    xs[0] = 0;
    ys[0] = 0;
  });
  const l0 = p.label("left warm");
  const l1 = p.label("left muted");
  const l2 = p.label("left muted");
  const update = () => {
    const size = s.p === 7 ? 4 : s.p === 5 ? 5.5 : 7;
    dim.set({ size });
    lit.set({ size });
    p.setSquare(0, 0, 1.16);
    const gap = Math.PI / s.p; // middle of the gap left by the missing first digit 0
    l0.at(1.04 * Math.sin(gap), 1.04 * Math.cos(gap), `outer shell: not divisible by ${s.p}`);
    l1.at(RATIO * 1.04 * Math.sin(gap), RATIO * 1.04 * Math.cos(gap), `divisible by ${s.p} once`);
    l2.at(0.04, -0.07, "0");
    p.invalidate();
  };
  p.onResize(update);
  stage.onDispose(s.$on(update));
  update();
});

figure("fig-theta", (stage) => {
  const U = 2;
  const tx = [0.15, 0.25, 0.5, 1, 2, 4, 6.5];
  const p = plot2d(stage, { x: [-U, U], y: [0, 4], xTicks: tx.map((v) => ({ v: Math.log(v), label: String(v) })), xTitle: "t (logarithmic)" });
  const n = 500;
  p.line(n, { color: p.pal.prime, width: 2 }, (xs, ys) => {
    for (let i = 0; i < n; i++) {
      const u = -U + (2 * U * i) / (n - 1);
      xs[i] = u;
      ys[i] = Math.min(4.3, 1 + theta(Math.exp(u)));
    }
  });
  p.line(n, { color: p.pal.zero, width: 3 }, (xs, ys) => {
    for (let i = 0; i < n; i++) {
      const u = -U + (2 * U * i) / (n - 1);
      xs[i] = u;
      ys[i] = G(Math.exp(u));
    }
  });
  p.segments(3, { color: p.pal.ink2, width: 1.5 }, (a) => {
    const u = Math.log(s.t);
    const g = G(s.t);
    a.set([-u, g, u, g], 0);
    a.set([0, 0, 0, 4], 4);
    a.set([-u, 0, -u, g], 8);
  });
  p.points(1, { color: p.pal.zero, size: 13 }, (xs, ys) => {
    xs[0] = -Math.log(s.t);
    ys[0] = G(s.t);
  });
  p.label("above muted").at(0, 0.32, "t = 1");
  p.handle({
    get: () => [Math.log(s.t), G(s.t)],
    set: (x) => (s.t = Math.round(Math.exp(Math.max(Math.log(0.15), Math.min(Math.log(6.5), x))) * 100) / 100),
    axis: "x",
    label: "Scale t",
    step: [0.02, 0],
    valueText: () => `t = ${fmt(s.t, 2)}`,
  });
  stage.onDispose(s.$on(() => p.invalidate()));
});
