import { figure } from "../lib/figure";
import { ZETA_ZEROS } from "../lib/math/numbers";
import { eulerPath, zeta, type C } from "../lib/math/zeta";
import { page } from "../lib/page";
import { plot2d } from "../lib/plot2d";
import { clamp, fmt, store } from "../lib/store";

const s = store({ a: 0.2, b0: 0.8, g0: 27, sig: 1.3, tt: 6, world: "number", W: 40 });

const NP = 1500;
let pathKey = "";
let path: C[] = [];
function ePath(): C[] {
  const key = s.sig + "," + s.tt;
  if (key !== pathKey) {
    pathKey = key;
    path = eulerPath(s.sig, s.tt, NP);
  }
  return path;
}

const worlds: Record<string, number[]> = { number: [2, 3, 5, 7, 11, 13], function: [2, 4, 8, 16, 32, 64] };
function teeth(W: number, world: string) {
  const rows = worlds[world].map((q) => {
    const st = (2 * Math.PI) / Math.log(q);
    const out: number[] = [];
    for (let m = -Math.floor(W / st); m * st <= W; m++) out.push(m * st);
    return out;
  });
  const count = new Map<string, number>();
  rows.forEach((r) => r.forEach((t) => count.set(t.toFixed(6), (count.get(t.toFixed(6)) ?? 0) + 1)));
  const shared = [...count.entries()].filter(([, c]) => c > 1).map(([k]) => Number(k));
  return { rows, shared };
}

const heard = () => Math.abs(s.b0 - 0.5) < s.a;

page(s, {
  imag: (s) => `${fmt(s.b0, 2)} + ${fmt(s.g0, 1)}i`,
  aVal: (s) => fmt(s.a, 2),
  aVal2: (s) => fmt(s.a, 2),
  heard: () => (heard() ? "Counted: it is inside the strip" : "Not counted: it is outside the strip"),
  mS: (s) => `${fmt(s.sig, 2)} + ${fmt(s.tt, 1)}i`,
  mVerdict: (s) => (s.sig > 1 ? "the product settles on ζ(s)." : "the product does not settle."),
  mDrift: () => {
    const p = ePath();
    return fmt(Math.hypot(p[NP - 1][0] - p[NP - 501][0], p[NP - 1][1] - p[NP - 501][1]), 4);
  },
  Wout: (s) => String(s.W),
  shared: (s) => {
    const n = teeth(s.W, s.world).shared.length;
    return n === 1 ? "one tooth, the one at 0" : `${n} teeth`;
  },
});

// ---------- the audible strip ----------
figure("fig-strip", (stage) => {
  const p = plot2d(stage, { x: [-0.15, 1.15], y: [0, 50], xTitle: "σ", yTitle: "t", xTicks: [0, 0.25, 0.5, 0.75, 1], xFmt: (v) => (v === 0.5 ? "½" : String(v)) });
  p.band(2, { color: p.pal.ink2, opacity: 0.12 }, (xs, lo, hi) => {
    xs[0] = 0;
    xs[1] = 1;
    lo[0] = lo[1] = 0;
    hi[0] = hi[1] = 50;
  });
  p.band(2, { color: p.pal.touch, opacity: 0.32 }, (xs, lo, hi) => {
    xs[0] = 0.5 - s.a;
    xs[1] = 0.5 + s.a;
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
  p.points(1, { color: p.pal.touch, size: 10 }, (xs, ys) => {
    xs[0] = 1 - s.b0;
    ys[0] = s.g0;
  });
  const tag = p.label("below");
  const tagM = p.label("above muted");
  const edge = p.label("above muted");
  p.handle({
    get: () => [s.b0, s.g0],
    set: (x, y) => {
      s.b0 = Math.round(clamp(x, 0.51, 0.99) * 100) / 100;
      s.g0 = Math.round(clamp(y, 2, 48) * 10) / 10;
    },
    label: "The imagined zero",
    step: [0.01, 0.5],
    valueText: () => `real part ${fmt(s.b0, 2)}, ${heard() ? "heard" : "silent"}`,
  });
  const update = () => {
    tag.at(Math.min(0.9, s.b0), s.g0 - 1.4, heard() ? "imagined zero: heard" : "imagined zero: silent");
    tagM.at(Math.max(0.1, 1 - s.b0), s.g0 + 1.2, "its mirror");
    edge.at(0.5, 48.6, `audible: within ${fmt(s.a, 2)} of the line`);
    p.invalidate();
  };
  stage.onDispose(s.$on(update));
  update();
});

// ---------- Mertens' wall ----------
figure("fig-mplane", (stage) => {
  const p = plot2d(stage, { x: [0.2, 2.1], y: [0, 30], xTitle: "σ", yTitle: "t", xTicks: [0.5, 1, 1.5, 2], xFmt: (v) => (v === 0.5 ? "½" : String(v)) });
  p.band(2, { color: p.pal.ink2, opacity: 0.14 }, (xs, lo, hi) => {
    xs[0] = 0.2;
    xs[1] = 1;
    lo[0] = lo[1] = 0;
    hi[0] = hi[1] = 30;
  });
  p.segments(1, { color: p.pal.zero, width: 1.5 }, (a) => a.set([0.5, 0, 0.5, 30], 0));
  const zs = ZETA_ZEROS.filter((g) => g < 30);
  p.points(zs.length, { color: p.pal.zero, size: 9 }, (xs, ys) => {
    zs.forEach((g, i) => {
      xs[i] = 0.5;
      ys[i] = g;
    });
  });
  p.label("left muted").at(1.05, 28, "the product converges");
  p.label("left muted").at(0.56, 3, "critical strip");
  p.handle({
    get: () => [s.sig, s.tt],
    set: (x, y) => {
      s.sig = Math.round(clamp(x, 0.3, 2) * 100) / 100;
      s.tt = Math.round(clamp(y, 0, 30) * 10) / 10;
    },
    label: "The point s",
    step: [0.01, 0.1],
    valueText: () => `sigma ${fmt(s.sig, 2)}, t ${fmt(s.tt, 1)}`,
  });
  stage.onDispose(s.$on(() => p.invalidate()));
});

figure("fig-mpath", (stage) => {
  const p = plot2d(stage, { x: [-2, 2], y: [-2, 2], margin: { l: 38 } });
  p.line(NP + 1, { color: p.pal.prime, width: 2 }, (xs, ys) => {
    const e = ePath();
    xs[0] = 1;
    ys[0] = 0;
    for (let i = 0; i < NP; i++) {
      xs[i + 1] = e[i][0];
      ys[i + 1] = e[i][1];
    }
  });
  p.points(1, { color: p.pal.prime, size: 9 }, (xs, ys) => {
    [xs[0], ys[0]] = ePath()[NP - 1];
  });
  p.points(1, { color: p.pal.zero, size: 13 }, (xs, ys) => {
    [xs[0], ys[0]] = s.sig === 1 && s.tt === 0 ? [1e9, 0] : zeta(s.sig, s.tt);
  });
  const lz = p.label("above cool");
  const le = p.label("below warm");
  const update = () => {
    const e = ePath();
    const z = s.sig === 1 && s.tt === 0 ? e[NP - 1] : zeta(s.sig, s.tt);
    let x0 = Math.min(1, z[0]);
    let x1 = Math.max(1, z[0]);
    let y0 = Math.min(0, z[1]);
    let y1 = Math.max(0, z[1]);
    for (const [a, b] of e) {
      x0 = Math.min(x0, a);
      x1 = Math.max(x1, a);
      y0 = Math.min(y0, b);
      y1 = Math.max(y1, b);
    }
    const r = clamp(Math.max(x1 - x0, y1 - y0) * 0.62, 0.6, 40);
    p.setSquare((x0 + x1) / 2, (y0 + y1) / 2, r);
    lz.at(z[0], z[1], "ζ(s)");
    le.at(e[NP - 1][0], e[NP - 1][1], "1500 primes");
    p.invalidate();
  };
  p.onResize(update);
  stage.onDispose(s.$on(update));
  update();
});

// ---------- combs ----------
figure("fig-combs", (stage) => {
  const p = plot2d(stage, {
    x: [-s.W, s.W],
    y: [0.3, 6.7],
    xTitle: "height t",
    grid: false,
    margin: { l: 56 },
    yTicks: () => worlds[s.world].map((q, i) => ({ v: i + 1, label: (s.world === "number" ? "p = " : "q = ") + q })),
  });
  p.segments(260, { color: p.pal.ink, width: 1.5 }, (a) => {
    const { shared } = teeth(s.W, s.world);
    let c = 0;
    for (const t of shared) if (c < 260) a.set([t, 0.3, t, 6.7], 4 * c++);
    return c;
  });
  p.segments(900, { color: p.pal.prime, width: 3 }, (a) => {
    const { rows } = teeth(s.W, s.world);
    let c = 0;
    rows.forEach((r, i) => r.forEach((t) => {
      if (c < 900) a.set([t, i + 0.68, t, i + 1.32], 4 * c++);
    }));
    return c;
  });
  const update = () => {
    p.setRange([-s.W, s.W], [0.3, 6.7]);
    p.retick();
    p.invalidate();
  };
  stage.onDispose(s.$on(update));
  update();
});
