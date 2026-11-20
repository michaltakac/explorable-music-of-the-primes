import { figure } from "../lib/figure";
import { PRIMES, ZETA_ZEROS } from "../lib/math/numbers";
import { seriesPath, zeta } from "../lib/math/zeta";
import { page } from "../lib/page";
import { plot2d } from "../lib/plot2d";
import { hexRgb, labels3d } from "../lib/scene3d";
import { fmt, store } from "../lib/store";

const s = store({ s: 2, P: 5, sig: 0.7, tt: 12, T: 30, lineSigma: 0.5 });

const eulerProduct = (sv: number, count: number) => {
  let p = 1;
  for (let k = 0; k < count; k++) p /= 1 - Math.pow(PRIMES[k], -sv);
  return p;
};
const cx = (re: number, im: number, d = 2) => `${fmt(re, d)} ${im < 0 ? "−" : "+"} ${fmt(Math.abs(im), d)}i`;

function minDistance(sigma: number, T: number): number {
  let m = Infinity;
  const n = Math.max(50, Math.round(T * 40));
  for (let i = 0; i <= n; i++) {
    const [a, b] = zeta(sigma, (T * i) / n);
    m = Math.min(m, Math.hypot(a, b));
  }
  return m;
}

page(s, {
  zetaS: (s) => fmt(zeta(s.s, 0)[0], 4),
  lastP: (s) => String(PRIMES[s.P - 1]),
  prodP: (s) => fmt(eulerProduct(s.s, s.P), 4),
  gapP: (s) => fmt(zeta(s.s, 0)[0] - eulerProduct(s.s, s.P), 4),
  sComplex: (s) => cx(s.sig, s.tt),
  zComplex: (s) => cx(...zeta(s.sig, s.tt), 3),
  zAbs: (s) => fmt(Math.hypot(...zeta(s.sig, s.tt)), 3),
  regime: (s) =>
    s.sig > 1
      ? "Here σ is bigger than 1, so the path settles."
      : s.sig > 0
        ? "Here s is inside the critical strip, so the path spirals around ζ(s) without settling."
        : "Here σ is negative: the arrows grow, and only the continued function gives a value.",
  zeroCount: (s) => {
    const n = ZETA_ZEROS.filter((g) => g <= s.T).length;
    return n === 0 ? "no times" : n === 1 ? "once" : `${n} times`;
  },
  minDist: (s) => fmt(minDistance(s.lineSigma, s.T), 3),
});

// ---------- Euler product ----------
figure("fig-euler", (stage) => {
  const top = () => Math.max(1.2, zeta(s.s, 0)[0] * 1.06);
  const p = plot2d(stage, { x: [0, 41], y: [1, top()], xTitle: "number of primes used", yTitle: "product" });
  p.line(2, { color: p.pal.ink, width: 2 }, (xs, ys) => {
    xs[0] = 0;
    xs[1] = 41;
    ys[0] = ys[1] = zeta(s.s, 0)[0];
  });
  p.points(40, { color: p.pal.prime, size: 9 }, (xs, ys) => {
    for (let k = 1; k <= 40; k++) {
      xs[k - 1] = k;
      ys[k - 1] = eulerProduct(s.s, k);
    }
  });
  p.segments(1, { color: p.pal.ink2, width: 1.5 }, (a) => {
    a.set([s.P, 1, s.P, eulerProduct(s.s, s.P)], 0);
  });
  const lz = p.label("left");
  const lp = p.label("below warm");
  p.handle({
    get: () => [s.P, eulerProduct(s.s, s.P)],
    set: (x) => (s.P = Math.max(1, Math.min(40, Math.round(x)))),
    axis: "x",
    label: "Number of primes in the product",
    step: [1, 0],
  });
  const update = () => {
    p.setRange([0, 41], [1, top()]);
    lz.at(1, zeta(s.s, 0)[0] + (top() - 1) * 0.035, `ζ(${fmt(s.s, 2)}) = ${fmt(zeta(s.s, 0)[0], 4)}`);
    lp.at(Math.min(36, Math.max(4, s.P)), eulerProduct(s.s, s.P) - (top() - 1) * 0.04, `primes up to ${PRIMES[s.P - 1]}`);
    p.invalidate();
  };
  stage.onDispose(s.$on(update));
  update();
});

// ---------- s-plane ----------
figure("fig-splane", (stage) => {
  const p = plot2d(stage, { x: [-0.5, 2.25], y: [0, 50], xTitle: "σ", yTitle: "t", xTicks: [0, 0.5, 1, 1.5, 2], xFmt: (v) => (v === 0.5 ? "½" : String(v)) });
  p.band(2, { color: p.pal.ink2, opacity: 0.14 }, (xs, lo, hi) => {
    xs[0] = 0;
    xs[1] = 1;
    lo[0] = lo[1] = 0;
    hi[0] = hi[1] = 50;
  });
  p.segments(1, { color: p.pal.zero, width: 1.5 }, (a) => a.set([0.5, 0, 0.5, 50], 0));
  const zs = ZETA_ZEROS.filter((g) => g < 50);
  p.points(zs.length, { color: p.pal.zero, size: 9 }, (xs, ys) => {
    zs.forEach((g, i) => {
      xs[i] = 0.5;
      ys[i] = g;
    });
  });
  p.points(1, { color: p.pal.ink, size: 8 }, (xs, ys) => {
    xs[0] = 1;
    ys[0] = 0;
  });
  p.label("left muted").at(1.06, 1.6, "pole at s = 1");
  p.label("left muted").at(1.08, 46, "the sum converges");
  p.label("left cool").at(0.56, zs[0] - 1.6, "14.13");
  p.label("left cool").at(0.56, zs[1] - 1.6, "21.02");
  p.handle({
    get: () => [s.sig, s.tt],
    set: (x, y) => {
      // snap gently onto zeros when close
      const near = zs.find((g) => Math.abs(g - y) < 0.35 && Math.abs(x - 0.5) < 0.06);
      s.sig = near ? 0.5 : Math.round(Math.max(-0.4, x) * 100) / 100;
      s.tt = near ?? Math.round(y * 100) / 100;
    },
    label: "The point s",
    step: [0.01, 0.1],
    valueText: () => `sigma ${s.sig}, t ${fmt(s.tt, 2)}`,
  });
  stage.onDispose(s.$on(() => p.invalidate()));
});

// ---------- partial sums ----------
figure("fig-sum", (stage) => {
  const N = 400;
  const p = plot2d(stage, { x: [-2, 3], y: [-2.5, 2.5], margin: { l: 34 } });
  let path = seriesPath(s.sig, s.tt, N);
  p.line(N + 1, { color: p.pal.ink2, width: 1.5 }, (xs, ys) => {
    xs[0] = 0;
    ys[0] = 0;
    for (let i = 0; i < N; i++) {
      xs[i + 1] = path[i][0];
      ys[i + 1] = path[i][1];
    }
  });
  p.line(13, { color: p.pal.prime, width: 3 }, (xs, ys) => {
    xs[0] = 0;
    ys[0] = 0;
    for (let i = 0; i < 12; i++) {
      xs[i + 1] = path[i][0];
      ys[i + 1] = path[i][1];
    }
  });
  p.points(1, { color: p.pal.zero, size: 13 }, (xs, ys) => {
    [xs[0], ys[0]] = zeta(s.sig, s.tt);
  });
  const lz = p.label("above cool");
  const l1 = p.label("below warm");
  const update = () => {
    path = seriesPath(s.sig, s.tt, N);
    const [zr, zi] = zeta(s.sig, s.tt);
    let r = Math.max(1.2, Math.hypot(zr, zi) * 1.25);
    // show the whole spiral while it is of moderate size
    let ext = 0;
    for (const [a, b] of path) ext = Math.max(ext, Math.abs(a - zr), Math.abs(b - zi));
    r = Math.max(r, Math.min(ext * 1.1, 9));
    p.setSquare(zr * 0.5, zi * 0.5, r);
    lz.at(zr, zi, "ζ(s)");
    l1.at(path[0][0], path[0][1], "first term");
    p.invalidate();
  };
  p.onResize(update);
  stage.onDispose(s.$on(update));
  update();
});

// ---------- critical line: curve and modulus ----------
const curveCache = { sigma: NaN, pts: [] as [number, number][] };
const TMAX = 60;
const CN = 2400;
function curve(sigma: number) {
  if (curveCache.sigma !== sigma) {
    curveCache.sigma = sigma;
    curveCache.pts = [];
    for (let i = 0; i <= CN; i++) curveCache.pts.push(zeta(sigma, (TMAX * i) / CN));
  }
  return curveCache.pts;
}

figure("fig-curve", (stage) => {
  const p = plot2d(stage, { x: [-2, 4], y: [-2.6, 2.6], margin: { l: 34 } });
  p.line(CN + 1, { color: p.pal.zero, width: 2.5 }, (xs, ys) => {
    const pts = curve(s.lineSigma);
    const c = Math.max(2, Math.round((s.T / TMAX) * CN) + 1);
    for (let i = 0; i < c; i++) {
      xs[i] = pts[i][0];
      ys[i] = pts[i][1];
    }
    return c;
  });
  p.points(1, { color: p.pal.touch, size: 12 }, (xs, ys) => {
    [xs[0], ys[0]] = zeta(s.lineSigma, s.T);
  });
  p.points(1, { color: p.pal.ink, size: 7 }, (xs, ys) => {
    xs[0] = 0;
    ys[0] = 0;
  });
  p.label("below muted").at(0, -0.12, "origin");
  const fit = () => p.setSquare(1, 0, 2.7);
  p.onResize(fit);
  fit();
  stage.onDispose(s.$on(() => p.invalidate()));
});

figure("fig-modulus", (stage) => {
  const p = plot2d(stage, { x: [0, TMAX], y: [0, 4], xTitle: "t", yTitle: "|ζ(σ + it)|" });
  p.line(CN + 1, { color: p.pal.zero, width: 2.5 }, (xs, ys) => {
    const pts = curve(s.lineSigma);
    for (let i = 0; i <= CN; i++) {
      xs[i] = (TMAX * i) / CN;
      ys[i] = Math.min(4.2, Math.hypot(pts[i][0], pts[i][1]));
    }
  });
  const zs = ZETA_ZEROS.filter((g) => g < TMAX);
  p.points(zs.length, { color: p.pal.zero, size: 8 }, (xs, ys) => {
    zs.forEach((g, i) => {
      xs[i] = g;
      ys[i] = 0;
    });
  });
  p.segments(1, { color: p.pal.ink2, width: 1.5 }, (a) => a.set([s.T, 0, s.T, 4], 0));
  p.handle({
    get: () => [s.T, Math.min(3.9, Math.hypot(...zeta(s.lineSigma, s.T)))],
    set: (x) => (s.T = Math.round(Math.max(1, Math.min(TMAX, x)) * 10) / 10),
    axis: "x",
    label: "Height t",
    step: [0.1, 0],
  });
  stage.onDispose(s.$on(() => p.invalidate()));
});

// climb animation
const climb = document.getElementById("btn-climb");
let climbing = 0;
climb?.addEventListener("click", () => {
  cancelAnimationFrame(climbing);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    s.T = TMAX;
    return;
  }
  const t0 = performance.now();
  const step = (now: number) => {
    const T = Math.min(TMAX, ((now - t0) / 1000) * 5);
    s.T = Math.round(Math.max(1, T) * 10) / 10;
    if (T < TMAX) climbing = requestAnimationFrame(step);
  };
  climbing = requestAnimationFrame(step);
});

// ---------- 3D landscape ----------
figure(
  "fig-landscape",
  (stage) => {
    const { mathbox, pal } = stage;
    const NS = 56;
    const NT = 360;
    const S0 = -0.5;
    const S1 = 1.5;
    const T1 = 50;
    const CAP = 3;
    const h = new Float32Array(NS * NT);
    const col = new Float32Array(NS * NT * 3);
    const lowC = hexRgb(pal.zero);
    const highC = hexRgb(pal.paper2);
    for (let j = 0; j < NT; j++) {
      for (let i = 0; i < NS; i++) {
        const sg = S0 + ((S1 - S0) * i) / (NS - 1);
        const t = (T1 * j) / (NT - 1);
        const m = Math.hypot(...zeta(sg, t));
        h[j * NS + i] = Math.min(CAP, m);
        // colour by height: the zero colour at the floor, fading to the page tone at the cap
        const u = Math.pow(Math.min(1, m / CAP), 0.6);
        for (let c = 0; c < 3; c++) col[3 * (j * NS + i) + c] = lowC[c] + (highC[c] - lowC[c]) * u;
      }
    }
    mathbox.camera({ proxy: true, position: [3.3, 1.9, 1.3] });
    const view = mathbox.cartesian({ range: [[S0, S1], [0, CAP], [0, T1]], scale: [0.75, 0.45, 2.3] });
    view.matrix({ id: "zcol", width: NS, height: NT, channels: 4, live: false, expr: (emit: any, i: number, j: number) => {
      const k = 3 * (j * NS + i);
      emit(col[k], col[k + 1], col[k + 2], 1);
    } });
    view.matrix({ id: "zsurf", width: NS, height: NT, channels: 3, live: false, expr: (emit: any, i: number, j: number) => {
      emit(S0 + ((S1 - S0) * i) / (NS - 1), h[j * NS + i], (T1 * j) / (NT - 1));
    } });
    view.surface({ points: "#zsurf", colors: "#zcol", color: 0xffffff, shaded: true, lineX: false, lineY: false });
    view.grid({ axes: [1, 3], divideX: 4, divideY: 10, color: pal.rule, width: 1, zBias: -2 });
    // floor line sigma = 1/2 and the zeros on it
    view.array({ data: [[0.5, 0, 0], [0.5, 0, T1]], channels: 3, live: false });
    view.line({ color: pal.ink, width: 2, zBias: 6 });
    const zs = ZETA_ZEROS.filter((g) => g < T1);
    view.array({ data: zs.map((g) => [0.5, 0.02, g]), channels: 3, live: false });
    view.point({ color: pal.ink, size: 9, zBias: 8 });
    labels3d(view, zs.slice(0, 5).map((g) => [1.62, 0, g]), zs.slice(0, 5).map((g) => g.toFixed(2)), pal.ink, 13, [0, 0]);
    labels3d(view, [[S0, 0, -2.5], [0.5, 0, -2.5], [S1, 0, -2.5]], ["-0.5", "0.5", "1.5"], pal.ink2, 13, [0, 0]);
  },
  { threeD: true },
);
