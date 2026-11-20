import { playChord, stopChord } from "../lib/audio";
import { figure } from "../lib/figure";
import { Lambda, primePowers, psi, psiFromZeros, ZETA_ZEROS, zeroWave } from "../lib/math/numbers";
import { page, steps } from "../lib/page";
import { plot2d } from "../lib/plot2d";
import { fmt, fmtInt, store } from "../lib/store";

const s = store({ N: 10, X: 60, k: 1, trueSize: false, beta: 0.5, M: 100 });

page(s, {
  nDesc: (s) => (s.N === 0 ? "the straight line y = x with two small corrections" : s.N === 1 ? "the line plus a single wave" : `the line plus ${s.N} waves`),
  psiN: (s) => fmt(psiFromZeros(s.X + 0.5, s.N), 2),
  psiTrue: (s) => fmt(psi(s.X), 2),
  gammaK: (s) => fmt(ZETA_ZEROS[s.k - 1], 3),
  ratioK: (s) => fmt(Math.exp((2 * Math.PI) / ZETA_ZEROS[s.k - 1]), 3),
  mirror: (s) => fmt(1 - s.beta, 2),
  swing: (s) => fmtInt((2 * (Math.pow(1e5, s.beta) + Math.pow(1e5, 1 - s.beta))) / 10),
});

// ---------- explicit formula ----------
figure("fig-explicit", (stage) => {
  const p = plot2d(stage, { x: [2, s.X], y: [0, s.X * 1.06], xTitle: "x", yTitle: "ψ(x)" });
  p.line(1400, { color: p.pal.prime, width: 2.5 }, (xs, ys) => steps(xs, ys, psi, 2, s.X, true));
  p.line(1500, { color: p.pal.zero, width: 2.5 }, (xs, ys) => {
    const n = xs.length;
    for (let i = 0; i < n; i++) {
      const x = 2 + ((s.X - 2) * i) / (n - 1);
      xs[i] = x;
      ys[i] = psiFromZeros(x, s.N);
    }
  });
  const update = () => {
    p.setRange([2, s.X], [0, s.X * 1.06]);
    p.invalidate();
  };
  stage.onDispose(s.$on(update));
  update();
});

const addBtn = document.getElementById("btn-add")!;
let adding = 0;
addBtn.addEventListener("click", () => {
  cancelAnimationFrame(adding);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    s.N = 300;
    return;
  }
  const t0 = performance.now();
  const step = (now: number) => {
    const t = (now - t0) / 1000;
    // slow at first so the first few waves can be seen arriving
    const n = Math.min(300, Math.floor(t < 4 ? t * 2.5 : 10 + (t - 4) * (t - 4) * 9));
    s.N = n;
    if (n < 300) adding = requestAnimationFrame(step);
  };
  adding = requestAnimationFrame(step);
});

const playBtn = document.getElementById("btn-play")!;
let playing = false;
playBtn.addEventListener("click", () => {
  if (playing) {
    stopChord();
    return;
  }
  const n = Math.max(1, Math.min(s.N, 60));
  const freqs = ZETA_ZEROS.slice(0, n).map((g) => g * 16);
  const amps = ZETA_ZEROS.slice(0, n).map((g) => 14 / g);
  const ok = playChord(freqs, amps, 3.5, () => {
    playing = false;
    playBtn.textContent = "Play these zeros";
    playBtn.setAttribute("aria-pressed", "false");
  });
  if (ok) {
    playing = true;
    playBtn.textContent = "Stop the sound";
    playBtn.setAttribute("aria-pressed", "true");
  } else {
    playBtn.textContent = "Sound is unavailable in this browser";
  }
});

// ---------- one wave ----------
figure("fig-wave", (stage) => {
  const U0 = Math.log(2);
  const U1 = Math.log(1000);
  const tickX = [2, 5, 10, 20, 50, 100, 200, 500, 1000];
  const p = plot2d(stage, {
    x: [U0, U1],
    y: [-0.16, 0.16],
    xTicks: tickX.map((v) => ({ v: Math.log(v), label: String(v) })),
    xTitle: "x (logarithmic)",
  });
  p.line(1600, { color: p.pal.zero, width: 2.5 }, (xs, ys) => {
    const n = xs.length;
    const g = ZETA_ZEROS[s.k - 1];
    for (let i = 0; i < n; i++) {
      const u = U0 + ((U1 - U0) * i) / (n - 1);
      const x = Math.exp(u);
      xs[i] = u;
      ys[i] = zeroWave(x, 0.5, g) / (s.trueSize ? 1 : Math.sqrt(x));
    }
  });
  const update = () => {
    const a = s.trueSize ? (2 / ZETA_ZEROS[s.k - 1]) * Math.sqrt(1000) * 1.1 : 0.16;
    p.setRange([U0, U1], [-a, a]);
    p.invalidate();
  };
  stage.onDispose(s.$on(update));
  update();
});

// ---------- an off-line zero ----------
figure("fig-offline", (stage) => {
  const XM = 100000;
  const G = 10;
  const p = plot2d(stage, { x: [2, XM], y: [-420, 420], xTitle: "x", yTitle: "ψ(x) − x" });
  const n = 1800;
  const base = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = 2 + ((XM - 2) * i) / (n - 1);
    base[i] = psi(x) - x;
  }
  p.band(160, { color: p.pal.ink2, opacity: 0.16 }, (xs, lo, hi) => {
    for (let i = 0; i < xs.length; i++) {
      const x = 2 + ((XM - 2) * i) / (xs.length - 1);
      xs[i] = x;
      hi[i] = Math.sqrt(x);
      lo[i] = -Math.sqrt(x);
    }
  });
  p.line(n, { color: p.pal.prime, width: 2 }, (xs, ys) => {
    for (let i = 0; i < n; i++) {
      const x = 2 + ((XM - 2) * i) / (n - 1);
      xs[i] = x;
      ys[i] = base[i] + zeroWave(x, s.beta, G) + zeroWave(x, 1 - s.beta, G);
    }
  });
  p.line(n, { color: p.pal.ink2, width: 1.5 }, (xs, ys) => {
    for (let i = 0; i < n; i++) {
      xs[i] = 2 + ((XM - 2) * i) / (n - 1);
      ys[i] = base[i];
    }
  });
  const update = () => {
    const a = Math.max(420, ((2 * Math.pow(XM, s.beta)) / G) * 1.15);
    p.setRange([2, XM], [-a, a]);
    p.invalidate();
  };
  stage.onDispose(s.$on(update));
  update();
});

// ---------- zeros to primes ----------
figure("fig-spikes", (stage) => {
  const U0 = Math.log(1.5);
  const U1 = Math.log(34);
  const pp = primePowers(32);
  const labelled = [2, 3, 4, 5, 7, 8, 9, 11, 13, 16, 19, 23, 27, 32];
  const p = plot2d(stage, {
    x: [U0, U1],
    y: [-0.35, 1],
    xTicks: labelled.map((v) => ({ v: Math.log(v), label: String(v) })),
    xTitle: "x = e^u",
  });
  p.line(1800, { color: p.pal.zero, width: 2 }, (xs, ys) => {
    const n = xs.length;
    const T = ZETA_ZEROS[s.M - 1];
    for (let i = 0; i < n; i++) {
      const u = U0 + ((U1 - U0) * i) / (n - 1);
      let sum = 0;
      for (let k = 0; k < s.M; k++) sum += Math.cos(ZETA_ZEROS[k] * u);
      xs[i] = u;
      ys[i] = (-2 * Math.PI * sum) / T;
    }
  });
  p.points(pp.length, { color: p.pal.prime, size: 9 }, (xs, ys) => {
    pp.forEach((q, i) => {
      xs[i] = Math.log(q.n);
      ys[i] = Lambda(q.n) / Math.sqrt(q.n);
    });
  });
  stage.onDispose(s.$on(() => p.invalidate()));
});
