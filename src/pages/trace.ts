import { figure } from "../lib/figure";
import { PRIMES, primePowers } from "../lib/math/numbers";
import { page } from "../lib/page";
import { plot2d } from "../lib/plot2d";
import { labels3d } from "../lib/scene3d";
import { clamp, fmt, store } from "../lib/store";

const s = store({ gamma: 3, c: 1.0, w: 0.45, c2: 1.5, w2: 0.55 });

/** A smooth bump with peak 1 at u = c that vanishes outside (c - w, c + w). */
function bump(u: number, c: number, w: number): number {
  const r = (u - c) / w;
  if (Math.abs(r) >= 1) return 0;
  return Math.exp(1 - 1 / (1 - r * r));
}

// ---- the loop: both counts ----
const L = () => Math.log(s.gamma);
function geometric(): number {
  let sum = 0;
  const l = L();
  for (let k = Math.ceil((s.c - s.w) / l); k * l < s.c + s.w; k++) sum += bump(k * l, s.c, s.w);
  return l * sum;
}
/** multiplier of mode m: the integral of bump(u) * exp(-2 pi i m u / L) du (real and imaginary parts) */
function mode(m: number): [number, number] {
  const n = 400;
  const l = L();
  let re = 0;
  let im = 0;
  for (let i = 0; i <= n; i++) {
    const u = s.c - s.w + (2 * s.w * i) / n;
    const b = bump(u, s.c, s.w);
    const a = (-2 * Math.PI * m * u) / l;
    re += b * Math.cos(a);
    im += b * Math.sin(a);
  }
  const h = (2 * s.w) / n;
  return [re * h, im * h];
}
function spectral(): number {
  let sum = 0;
  for (let m = -80; m <= 80; m++) sum += mode(m)[0];
  return sum;
}
function closingsCovered(): number {
  const l = L();
  let n = 0;
  for (let k = Math.ceil((s.c - s.w) / l); k * l < s.c + s.w; k++) if (bump(k * l, s.c, s.w) > 0) n++;
  return n;
}

// ---- primes as loops ----
const UMAX = 4.2;
const powers = primePowers(Math.floor(Math.exp(UMAX)));
const contribution = (q: { n: number; p: number; k: number }) => (Math.log(q.p) * bump(Math.log(q.n), s.c2, s.w2)) / Math.sqrt(q.n);
const primeSide = () => powers.reduce((a, q) => a + contribution(q), 0);

page(s, {
  gamma: (s) => fmt(s.gamma, 1),
  L: () => fmt(L(), 3),
  geo: () => fmt(geometric(), 5),
  spec: () => fmt(spectral(), 5),
  covers: () => {
    const n = closingsCovered();
    return n === 0
      ? "It covers no closing point, so both counts are zero."
      : n === 1
        ? "It covers one closing point."
        : `It covers ${n} closing points.`;
  },
  u1: (s) => fmt(Math.max(0, s.c2 - s.w2), 2),
  u2: (s) => fmt(s.c2 + s.w2, 2),
  x1: (s) => fmt(Math.exp(Math.max(0, s.c2 - s.w2)), 1),
  x2: (s) => fmt(Math.exp(s.c2 + s.w2), 1),
  primeSide: () => fmt(primeSide(), 4),
  cutoff: (s) => fmt(Math.exp(s.c2 + s.w2), 1),
});

// live ledger of contributing prime powers
const tbody = document.querySelector("#ledger-primes tbody")!;
function renderLedger() {
  const rows = powers.filter((q) => contribution(q) > 0);
  tbody.innerHTML = rows.length
    ? rows
        .map(
          (q) =>
            `<tr><td>${q.k === 1 ? q.p : `${q.p}<sup>${q.k}</sup> = ${q.n}`}</td><td>${fmt(Math.log(q.n), 3)}</td><td class="num">${fmt(Math.log(q.p), 3)}</td><td class="num">${fmt(bump(Math.log(q.n), s.c2, s.w2), 3)}</td><td class="num">${fmt(contribution(q), 4)}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="5">No loop closes while this window is open, so the prime side is zero.</td></tr>`;
}
s.$on(renderLedger);
renderLedger();

figure("fig-bump", (stage) => {
  const p = plot2d(stage, {
    x: [-1.5, 4.5],
    y: [0, 1.3],
    xTitle: "u = log x",
    xTicks: () => {
      const l = L();
      const out = [];
      const names: Record<number, string> = { [-1]: "1/γ", 0: "1", 1: "γ", 2: "γ²", 3: "γ³", 4: "γ⁴", 5: "γ⁵", 6: "γ⁶" };
      for (let k = -1; k * l <= 4.5 && k <= 6; k++) if (k * l >= -1.5) out.push({ v: k * l, label: "x = " + (names[k] ?? "") });
      return out;
    },
    yTicks: [0, 0.5, 1],
  });
  p.segments(16, { color: p.pal.prime, width: 2 }, (a) => {
    const l = L();
    let c = 0;
    for (let k = Math.ceil(-1.5 / l); k * l <= 4.5 && c < 16; k++) a.set([k * l, 0, k * l, 1.3], 4 * c++);
    return c;
  });
  p.band(300, { color: p.pal.touch, opacity: 0.22 }, (xs, lo, hi) => {
    for (let i = 0; i < xs.length; i++) {
      const u = -1.5 + (6 * i) / (xs.length - 1);
      xs[i] = u;
      lo[i] = 0;
      hi[i] = bump(u, s.c, s.w);
    }
  });
  p.line(500, { color: p.pal.ink, width: 2.5 }, (xs, ys) => {
    for (let i = 0; i < xs.length; i++) {
      const u = -1.5 + (6 * i) / (xs.length - 1);
      xs[i] = u;
      ys[i] = bump(u, s.c, s.w);
    }
  });
  p.points(16, { color: p.pal.prime, size: 11 }, (xs, ys) => {
    const l = L();
    let c = 0;
    for (let k = Math.ceil(-1.5 / l); k * l <= 4.5 && c < 16; k++) {
      const b = bump(k * l, s.c, s.w);
      if (b > 0) {
        xs[c] = k * l;
        ys[c++] = b;
      }
    }
    return c;
  });
  p.handle({
    get: () => [s.c, 1],
    set: (x) => (s.c = Math.round(clamp(x, -1, 4) * 100) / 100),
    axis: "x",
    label: "Centre of the bump",
    step: [0.01, 0],
  });
  p.handle({
    get: () => [s.c + s.w, 0.04],
    set: (x) => (s.w = Math.round(clamp(x - s.c, 0.1, 1.5) * 100) / 100),
    axis: "x",
    label: "Half-width of the bump",
    step: [0.01, 0],
  });
  const update = () => {
    p.retick();
    p.invalidate();
  };
  stage.onDispose(s.$on(update));
  update();
});

figure("fig-modes", (stage) => {
  const MM = 20;
  const p = plot2d(stage, { x: [-MM - 1, MM + 1], y: [-0.5, 0.5], xTitle: "mode number m", margin: { l: 40 } });
  const vals = new Float64Array(2 * MM + 1);
  p.segments(2 * MM + 1, { color: p.pal.zero, width: 5 }, (a) => {
    for (let m = -MM; m <= MM; m++) a.set([m, 0, m, vals[m + MM]], 4 * (m + MM));
  });
  const update = () => {
    let top = 0.05;
    for (let m = -MM; m <= MM; m++) {
      vals[m + MM] = mode(m)[0];
      top = Math.max(top, Math.abs(vals[m + MM]));
    }
    p.setRange([-MM - 1, MM + 1], [-top * 1.15, top * 1.15]);
    p.invalidate();
  };
  stage.onDispose(s.$on(update));
  update();
});

// ---- 3D: orbits unrolled in time ----
const flowBtn = document.getElementById("btn-flow")!;
let flowing = false;
let tau = 0.6;
flowBtn.addEventListener("click", () => {
  flowing = !flowing;
  flowBtn.setAttribute("aria-pressed", String(flowing));
  flowBtn.textContent = flowing ? "Pause the flow" : "Run the flow";
});

figure(
  "fig-orbits",
  (stage) => {
    const { mathbox, pal } = stage;
    const ps = PRIMES.filter((p) => p < Math.exp(UMAX));
    const NP = ps.length;
    const NH = 420;
    const R = (p: number) => Math.log(p) / (2 * Math.PI);
    mathbox.camera({ proxy: true, position: [2.3, 1.1, 2.5] });
    const view = mathbox.cartesian({ range: [[-0.7, 0.7], [0, UMAX], [-0.7, 0.7]], scale: [1.15, 1.45, 1.15] });

    // spirals: row j is the worldline of the particle on the loop of ps[j]
    view.matrix({ width: NH, height: NP, channels: 3, live: false, expr: (emit: any, i: number, j: number) => {
      const u = (UMAX * i) / (NH - 1);
      const th = (2 * Math.PI * u) / Math.log(ps[j]);
      emit(R(ps[j]) * Math.cos(th), u, R(ps[j]) * Math.sin(th));
    } });
    view.line({ color: pal.ink2, width: 1.5, opacity: 0.7 });

    // the "home" half-plane and the closing points on it
    view.array({ data: [[0, 0, 0], [0.68, 0, 0]], channels: 3, live: false });
    view.line({ color: pal.ink2, width: 1 });
    const N = powers.length;
    view.array({ width: N, channels: 3, expr: (emit: any, i: number) => {
      const q = powers[i];
      const inside = bump(Math.log(q.n), s.c2, s.w2) > 0;
      emit(inside ? 99 : R(q.p), Math.log(q.n), 0);
    } });
    view.point({ color: pal.ink2, size: 7 });
    view.array({ width: N, channels: 3, expr: (emit: any, i: number) => {
      const q = powers[i];
      const inside = bump(Math.log(q.n), s.c2, s.w2) > 0;
      emit(inside ? R(q.p) : 99, Math.log(q.n), 0);
    } });
    view.point({ color: pal.prime, size: 13 });

    // the window: two translucent planes
    for (const side of [-1, 1]) {
      view.matrix({ width: 2, height: 2, channels: 3, expr: (emit: any, i: number, j: number) => {
        emit(i ? 0.7 : -0.7, clamp(s.c2 + side * s.w2, 0, UMAX), j ? 0.7 : -0.7);
      } });
      view.surface({ color: pal.touch, opacity: 0.16, shaded: false, zBias: -1 });
    }

    // the particles at the current time
    view.array({ width: NP, channels: 3, expr: (emit: any, i: number) => {
      const th = (2 * Math.PI * tau) / Math.log(ps[i]);
      emit(R(ps[i]) * Math.cos(th), tau, R(ps[i]) * Math.sin(th));
    } });
    view.point({ color: pal.touch, size: 9 });

    const shown = [2, 3, 5, 7, 13, 29, 61].filter((p) => ps.includes(p));
    labels3d(view, shown.map((p) => [R(p), -0.12, 0]), shown.map(String), pal.ink, 13, [0, 0]);
    labels3d(view, [[-0.7, UMAX, -0.7]], ["time u"], pal.ink2, 13, [0, 12]);

    let last = 0;
    stage.onFrame((t) => {
      const dt = Math.min(0.05, t - last);
      last = t;
      if (flowing && !stage.reducedMotion) tau = (tau + dt * 0.35) % UMAX;
      else if (flowing && stage.reducedMotion) tau = (tau + dt * 0.08) % UMAX;
    });
  },
  { threeD: true },
);

figure("fig-returns", (stage) => {
  const p = plot2d(stage, { x: [0, UMAX], y: [0, 4.6], yTitle: "log p", xFmt: (v) => "u = " + v });
  p.band(300, { color: p.pal.touch, opacity: 0.22 }, (xs, lo, hi) => {
    for (let i = 0; i < xs.length; i++) {
      const u = (UMAX * i) / (xs.length - 1);
      xs[i] = u;
      lo[i] = 0;
      hi[i] = 4.2 * bump(u, s.c2, s.w2);
    }
  });
  p.segments(powers.length, { color: p.pal.ink2, width: 2 }, (a) => {
    let c = 0;
    for (const q of powers) if (contribution(q) === 0) a.set([Math.log(q.n), 0, Math.log(q.n), Math.log(q.p)], 4 * c++);
    return c;
  });
  p.segments(powers.length, { color: p.pal.prime, width: 3 }, (a) => {
    let c = 0;
    for (const q of powers) if (contribution(q) > 0) a.set([Math.log(q.n), 0, Math.log(q.n), Math.log(q.p)], 4 * c++);
    return c;
  });
  const labelled = powers.filter((q) => q.n <= 13 || [16, 19, 25, 32, 41, 53, 64].includes(q.n));
  labelled.forEach((q) => p.label("above muted").at(Math.log(q.n), Math.log(q.p), String(q.n)));
  p.handle({
    get: () => [s.c2, 4.2],
    set: (x) => (s.c2 = Math.round(clamp(x, 0.2, UMAX) * 100) / 100),
    axis: "x",
    label: "Centre of the window",
    step: [0.01, 0],
  });
  p.handle({
    get: () => [Math.min(UMAX, s.c2 + s.w2), 0.15],
    set: (x) => (s.w2 = Math.round(clamp(x - s.c2, 0.1, 2) * 100) / 100),
    axis: "x",
    label: "Half-width of the window",
    step: [0.01, 0],
  });
  stage.onDispose(s.$on(() => p.invalidate()));
});
