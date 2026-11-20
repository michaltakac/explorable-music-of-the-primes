import { figure } from "../lib/figure";
import { CHARACTERS, isPrime, Lambda, PRIMES, TRIVIAL, zeroWave, type Character } from "../lib/math/numbers";
import { dirichletL } from "../lib/math/zeta";
import { page, steps } from "../lib/page";
import { plot2d } from "../lib/plot2d";
import { fmt, fmtInt, store } from "../lib/store";

const s = store({ X: 500, race: "chi4", K: 8, chi: "chi4", R: 25 });

const byKey = (k: string): Character => (k === "zeta" ? TRIVIAL : CHARACTERS.find((c) => c.key === k)!);

// ---- the race: psi(x, chi) for the real characters mod 3 and mod 4 ----
const LIM = 5200;
const raceTable: Record<string, Float64Array> = {};
const raceConst: Record<string, number> = {};
for (const key of ["chi3", "chi4"]) {
  const c = byKey(key);
  const t = new Float64Array(LIM + 1);
  for (let n = 1; n <= LIM; n++) t[n] = t[n - 1] + c.values[n % c.q][0] * Lambda(n);
  raceTable[key] = t;
  // constant term of the explicit formula for an odd primitive character: -L'(0)/L(0)
  const h = 1e-4;
  const d = (dirichletL(h, 0, c)[0] - dirichletL(-h, 0, c)[0]) / (2 * h);
  raceConst[key] = -d / dirichletL(0, 0, c)[0];
}
const score = (key: string, x: number) => raceTable[key][Math.max(0, Math.min(LIM, Math.floor(x)))];
function scoreFromZeros(key: string, x: number, K: number): number {
  const zs = byKey(key).zeros.filter((t) => t > 0);
  let v = raceConst[key] + 0.5 * Math.log((x + 1) / (x - 1));
  for (let k = 0; k < K && k < zs.length; k++) v += zeroWave(x, 0.5, zs[k]);
  return v;
}
function teamCount(q: number, a: number, X: number): number {
  let c = 0;
  for (const p of PRIMES) {
    if (p > X) break;
    if (p % q === a) c++;
  }
  return c;
}

// ---- Gaussian primes ----
function gaussKind(a: number, b: number): 0 | 1 | 2 | 3 {
  a = Math.abs(a);
  b = Math.abs(b);
  if (a === 0 || b === 0) {
    const m = a + b;
    return m % 4 === 3 && isPrime(m) ? 2 : 0;
  }
  const n = a * a + b * b;
  if (n === 2) return 3;
  return isPrime(n) ? 1 : 0;
}
function gaussCount(R: number): number {
  let c = 0;
  for (let a = -R; a <= R; a++) for (let b = -R; b <= R; b++) if (a * a + b * b <= R * R && gaussKind(a, b)) c++;
  return c;
}

const describe: Record<string, string> = {
  zeta: "The trivial character sends every number to 1, and its L-function is zeta itself.",
  chi3: "The character mod 3 sends remainder 1 to +1 and remainder 2 to −1.",
  chi4: "The character mod 4 sends remainder 1 to +1 and remainder 3 to −1. It is the scorekeeper of the race above.",
  chi5q: "The real character mod 5 sends remainders 1 and 4 to +1, and 2 and 3 to −1.",
  chi5c: "This character mod 5 sends 2 to i, so 4 goes to −1 and 3 goes to −i. Its values are not all real.",
  chi7: "The real character mod 7 sends the squares 1, 2 and 4 to +1, and 3, 5 and 6 to −1.",
};

page(s, {
  team3: (s) => fmtInt(teamCount(4, 3, s.X)),
  team1: (s) => fmtInt(teamCount(4, 1, s.X)),
  chiDesc: (s) => describe[s.chi],
  firstZero: (s) => fmt(Math.min(...byKey(s.chi).zeros.filter((t) => t > 0)), 3),
  zeroCount: (s) => String(byKey(s.chi).zeros.filter((t) => Math.abs(t) <= 40).length),
  gaussCount: (s) => fmtInt(gaussCount(s.R)),
});

figure("fig-race", (stage) => {
  const yr = () => Math.max(6, Math.sqrt(s.X) * 1.7);
  const p = plot2d(stage, { x: [2, s.X], y: [-yr(), yr()], xTitle: "x", yTitle: "ψ(x, χ)" });
  p.line(2400, { color: p.pal.prime, width: 2.5 }, (xs, ys) => steps(xs, ys, (x) => score(s.race, x), 2, s.X, true));
  p.line(1500, { color: p.pal.zero, width: 2.5 }, (xs, ys) => {
    const n = xs.length;
    for (let i = 0; i < n; i++) {
      const x = 2 + ((s.X - 2) * i) / (n - 1);
      xs[i] = x;
      ys[i] = scoreFromZeros(s.race, x, s.K);
    }
  });
  const update = () => {
    p.setRange([2, s.X], [-yr(), yr()]);
    p.invalidate();
  };
  stage.onDispose(s.$on(update));
  update();
});

figure("fig-chi", (stage) => {
  const p = plot2d(stage, { x: [-1.5, 1.5], y: [-1.5, 1.5], margin: { l: 30, b: 26 }, xTicks: [-1, 0, 1], yTicks: [-1, 0, 1] });
  p.line(181, { color: p.pal.ink2, width: 1.5 }, (xs, ys) => {
    for (let i = 0; i <= 180; i++) {
      xs[i] = Math.cos((i * Math.PI) / 90);
      ys[i] = Math.sin((i * Math.PI) / 90);
    }
  });
  p.points(8, { color: p.pal.touch, size: 14 }, (xs, ys) => {
    const c = byKey(s.chi);
    let k = 0;
    for (let a = 1; a < Math.max(2, c.q); a++) {
      const v = c.values[a % c.q];
      if (v[0] === 0 && v[1] === 0) continue;
      xs[k] = v[0];
      ys[k++] = v[1];
    }
    return k;
  });
  const labels = [p.label(""), p.label(""), p.label(""), p.label("")];
  const update = () => {
    const c = byKey(s.chi);
    const groups = new Map<string, { v: [number, number]; as: number[] }>();
    for (let a = 1; a < Math.max(2, c.q); a++) {
      const v = c.values[a % c.q];
      if (v[0] === 0 && v[1] === 0) continue;
      const key = v[0].toFixed(3) + "," + v[1].toFixed(3);
      if (!groups.has(key)) groups.set(key, { v, as: [] });
      groups.get(key)!.as.push(a);
    }
    labels.forEach((l) => l.hide());
    let i = 0;
    for (const g of groups.values()) {
      const text = c.q === 1 ? "every n" : (g.as.length > 1 ? "remainders " : "remainder ") + g.as.join(", ");
      labels[i++].at(g.v[0] * 0.62, g.v[1] * 1.22 + (g.v[1] === 0 ? 0.22 : 0), text);
    }
    p.setSquare(0, 0, 1.55);
    p.invalidate();
  };
  p.onResize(update);
  stage.onDispose(s.$on(update));
  update();
});

const lineCache = new Map<string, Float64Array>();
const LN = 1600;
function lineValues(key: string): Float64Array {
  let v = lineCache.get(key);
  if (!v) {
    v = new Float64Array(LN + 1);
    const c = byKey(key);
    for (let i = 0; i <= LN; i++) {
      const t = -40 + (80 * i) / LN;
      const [a, b] = dirichletL(0.5, t, c);
      v[i] = Math.hypot(a, b);
    }
    lineCache.set(key, v);
  }
  return v;
}

figure("fig-Lline", (stage) => {
  const p = plot2d(stage, { x: [-40, 40], y: [0, 4], xTitle: "t", yTitle: "|L(½ + it, χ)|" });
  p.line(LN + 1, { color: p.pal.zero, width: 2.5 }, (xs, ys) => {
    const v = lineValues(s.chi);
    for (let i = 0; i <= LN; i++) {
      xs[i] = -40 + (80 * i) / LN;
      ys[i] = Math.min(4.2, v[i]);
    }
  });
  p.points(40, { color: p.pal.zero, size: 8 }, (xs, ys) => {
    const zs = byKey(s.chi).zeros.filter((t) => Math.abs(t) <= 40);
    zs.forEach((t, i) => {
      xs[i] = t;
      ys[i] = 0;
    });
    return zs.length;
  });
  stage.onDispose(s.$on(() => p.invalidate()));
});

figure("fig-gauss", (stage) => {
  const p = plot2d(stage, { x: [-25, 25], y: [-25, 25], margin: { l: 34 } });
  const kinds: [1 | 2 | 3, string, number][] = [
    [1, p.pal.zero, 9000],
    [2, p.pal.prime, 200],
    [3, p.pal.ink, 4],
  ];
  const marks = kinds.map(([kind, color, cap]) =>
    p.points(cap, { color, size: 6 }, (xs, ys) => {
      let k = 0;
      const R = s.R;
      for (let a = -R; a <= R; a++)
        for (let b = -R; b <= R; b++)
          if (a * a + b * b <= R * R && gaussKind(a, b) === kind && k < cap) {
            xs[k] = a;
            ys[k++] = b;
          }
      return k;
    }),
  );
  const read = p.readout();
  read.textContent = "Point at a number";
  p.hover((x, y) => {
    if (x === null || y === null) {
      read.textContent = "Point at a number";
      return;
    }
    const a = Math.round(x);
    const b = Math.round(y);
    const n = a * a + b * b;
    const name = `${a} ${b < 0 ? "−" : "+"} ${Math.abs(b)}i`;
    const kind = gaussKind(a, b);
    read.innerHTML =
      `${name}, norm ${n}<br>` +
      (kind === 1 ? `prime: ${n} is a prime from team 1` : kind === 2 ? `prime: ${Math.abs(a) + Math.abs(b)} is a prime from team 3` : kind === 3 ? "prime: a factor of 2" : "not prime");
  });
  const update = () => {
    const sz = Math.max(3, Math.min(9, 180 / s.R));
    marks.forEach((m) => m.set({ size: sz }));
    p.setSquare(0, 0, s.R * 1.04);
    p.invalidate();
  };
  p.onResize(update);
  stage.onDispose(s.$on(update));
  update();
});
