import { figure } from "../lib/figure";
import { tocHtml } from "../lib/layout";
import { psi, psiFromZeros } from "../lib/math/numbers";
import { page, steps } from "../lib/page";
import { plot2d } from "../lib/plot2d";
import { store } from "../lib/store";

const s = store({ N: 12 });
document.getElementById("toc")!.innerHTML = tocHtml();
page(s);

figure("fig-hero", (stage) => {
  const X = 64;
  const p = plot2d(stage, { x: [2, X], y: [0, X * 1.05], xTitle: "x", yTitle: "weighted count of primes up to x" });
  p.line(700, { color: p.pal.prime, width: 2.5 }, (xs, ys) => steps(xs, ys, psi, 2, X, true));
  p.line(1400, { color: p.pal.zero, width: 2.5 }, (xs, ys) => {
    const n = xs.length;
    for (let i = 0; i < n; i++) {
      const x = 2 + ((X - 2) * i) / (n - 1);
      xs[i] = x;
      ys[i] = psiFromZeros(x, s.N);
    }
  });
  stage.onDispose(s.$on(() => p.invalidate()));
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
    const n = Math.min(300, Math.floor(t < 4 ? t * 2.5 : 10 + (t - 4) * (t - 4) * 9));
    s.N = n;
    if (n < 300) adding = requestAnimationFrame(step);
  };
  adding = requestAnimationFrame(step);
});
