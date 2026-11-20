import { figure } from "../lib/figure";
import { Li, primePi, psi } from "../lib/math/numbers";
import { page, steps } from "../lib/page";
import { plot2d } from "../lib/plot2d";
import { fmt, fmtInt, store } from "../lib/store";

const s = store({ X: 100, showLi: true, showXlog: false, Y: 1000 });

function maxErr(Y: number): number {
  let m = 0;
  for (let n = 2; n <= Y; n++) {
    m = Math.max(m, Math.abs(psi(n) - n), Math.abs(psi(n - 1) - n));
  }
  return m;
}

page(s, {
  pi: (s) => fmtInt(primePi(s.X)),
  li: (s) => fmt(Li(s.X), 1),
  err: (s) => fmt(Math.abs(Li(s.X) - primePi(s.X)), 1),
  errpct: (s) => fmt((100 * Math.abs(Li(s.X) - primePi(s.X))) / primePi(s.X), 1) + "%",
  maxerr: (s) => fmt(maxErr(s.Y), 1),
  sqrtY: (s) => fmt(Math.sqrt(s.Y), 1),
});

figure("fig-staircase", (stage) => {
  const p = plot2d(stage, { x: [0, s.X], y: [0, primePi(s.X) * 1.12 + 1], xTitle: "x", yTitle: "primes up to x" });
  p.line(1400, { color: p.pal.ink2, width: 2, dashed: true }, (xs, ys) => {
    if (!s.showXlog) return 0;
    const n = xs.length;
    for (let i = 0; i < n; i++) {
      const x = 2 + ((s.X - 2) * i) / (n - 1);
      xs[i] = x;
      ys[i] = x / Math.log(x);
    }
  });
  p.line(400, { color: p.pal.ink, width: 2 }, (xs, ys) => {
    if (!s.showLi) return 0;
    const n = xs.length;
    for (let i = 0; i < n; i++) {
      const x = 2 + ((s.X - 2) * i) / (n - 1);
      xs[i] = x;
      ys[i] = Li(x);
    }
  });
  p.line(2600, { color: p.pal.prime, width: 2.5 }, (xs, ys) => steps(xs, ys, primePi, 0, s.X, true));
  const read = p.readout();
  let hx: number | null = null;
  const show = () => {
    const x = hx ?? s.X;
    read.innerHTML = `x = ${fmtInt(x)}<br>π(x) = ${fmtInt(primePi(x))}` + (s.showLi && x > 2 ? `<br>Li(x) = ${fmt(Li(x), 1)}` : "");
  };
  p.hover((x) => {
    hx = x === null ? null : Math.max(2, Math.round(x));
    show();
  });
  const update = () => {
    p.setRange([0, s.X], [0, primePi(s.X) * 1.12 + 1]);
    p.invalidate();
    show();
  };
  stage.onDispose(s.$on(update));
  update();
});

figure("fig-psi", (stage) => {
  const p = plot2d(stage, { x: [0, s.X], y: [0, s.X * 1.08], xTitle: "x", yTitle: "ψ(x)" });
  p.line(2, { color: p.pal.ink, width: 2 }, (xs, ys) => {
    xs[0] = 0;
    ys[0] = 0;
    xs[1] = s.X;
    ys[1] = s.X;
  });
  p.line(2600, { color: p.pal.prime, width: 2.5 }, (xs, ys) => steps(xs, ys, psi, 0, s.X, true));
  const read = p.readout();
  let hx: number | null = null;
  const show = () => {
    const x = hx ?? s.X;
    read.innerHTML = `x = ${fmtInt(x)}<br>ψ(x) = ${fmt(psi(x), 1)}`;
  };
  p.hover((x) => {
    hx = x === null ? null : Math.max(1, Math.round(x));
    show();
  });
  const update = () => {
    p.setRange([0, s.X], [0, s.X * 1.08]);
    p.invalidate();
    show();
  };
  stage.onDispose(s.$on(update));
  update();
});

figure("fig-error", (stage) => {
  const lim = () => Math.max(6, Math.sqrt(s.Y) * 1.6);
  const p = plot2d(stage, { x: [2, s.Y], y: [-lim(), lim()], xTitle: "x", yTitle: "ψ(x) − x" });
  p.band(200, { color: p.pal.ink2, opacity: 0.16 }, (xs, lo, hi) => {
    const n = xs.length;
    for (let i = 0; i < n; i++) {
      const x = 2 + ((s.Y - 2) * i) / (n - 1);
      xs[i] = x;
      hi[i] = Math.sqrt(x);
      lo[i] = -Math.sqrt(x);
    }
  });
  p.line(3200, { color: p.pal.prime, width: 2 }, (xs, ys) => {
    // sawtooth: between integers psi is constant, so psi(x) - x falls with slope -1 and jumps at prime powers
    const n = xs.length;
    const K = Math.floor(n / 2) - 1;
    const ints = Math.floor(s.Y) - 2;
    let c = 0;
    if (ints <= K) {
      for (let m = 2; m <= s.Y; m++) {
        xs[c] = m;
        ys[c++] = psi(m - 1) - m;
        xs[c] = m;
        ys[c++] = psi(m) - m;
      }
    } else {
      for (let i = 0; i <= K; i++) {
        const x = 2 + ((s.Y - 2) * i) / K;
        xs[c] = x;
        ys[c++] = psi(x) - x;
      }
    }
    return c;
  });
  const update = () => {
    p.setRange([2, s.Y], [-lim(), lim()]);
    p.invalidate();
  };
  stage.onDispose(s.$on(update));
  update();
});
