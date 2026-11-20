// Complex evaluation of zeta-type functions in double precision.
// Everything goes through the Hurwitz zeta function, summed by Euler-Maclaurin.

import { PRIMES, type Character } from "./numbers";

export type C = [number, number];

// B_{2k} / (2k)!  for k = 1..10
const BERN = [
  1 / 12, -1 / 720, 1 / 30240, -1 / 1209600, 1 / 47900160, -691 / 1307674368000, 1 / 74724249600,
  -3617 / 10670622842880000, 43867 / 5109094217170944000, -174611 / 802857662698291200000,
];

/** Hurwitz zeta(s, a) for s = sr + i*si (s != 1), 0 < a <= 1. */
export function hurwitz(sr: number, si: number, a: number): C {
  const N = Math.floor(Math.abs(si) / 2) + 26;
  let re = 0;
  let im = 0;
  for (let n = 0; n < N; n++) {
    const l = Math.log(n + a);
    const m = Math.exp(-sr * l);
    re += m * Math.cos(si * l);
    im -= m * Math.sin(si * l);
  }
  const w = N + a;
  const lw = Math.log(w);
  // w^{-s}
  const mw = Math.exp(-sr * lw);
  const wr = mw * Math.cos(si * lw);
  const wi = -mw * Math.sin(si * lw);
  // w^{1-s} / (s-1)
  const d = (sr - 1) * (sr - 1) + si * si;
  const ar = wr * w;
  const ai = wi * w;
  re += (ar * (sr - 1) + ai * si) / d;
  im += (ai * (sr - 1) - ar * si) / d;
  re += wr / 2;
  im += wi / 2;
  // Bernoulli tail: sum_k B2k/(2k)! * s(s+1)...(s+2k-2) * w^{-s-2k+1}
  let pr = sr; // running product s(s+1)...(s+2k-2)
  let pi = si;
  let pw = 1 / w; // w^{-2k+1}
  for (let k = 1; k <= BERN.length; k++) {
    const tr = (pr * wr - pi * wi) * pw * BERN[k - 1];
    const ti = (pr * wi + pi * wr) * pw * BERN[k - 1];
    re += tr;
    im += ti;
    // extend product by (s+2k-1)(s+2k)
    const a1r = sr + 2 * k - 1;
    const a2r = sr + 2 * k;
    let qr = pr * a1r - pi * si;
    let qi = pr * si + pi * a1r;
    pr = qr * a2r - qi * si;
    pi = qr * si + qi * a2r;
    pw /= w * w;
  }
  return [re, im];
}

export const zeta = (sr: number, si: number): C => hurwitz(sr, si, 1);

/** Dirichlet L(s, chi) = q^{-s} * sum_a chi(a) zeta(s, a/q). */
export function dirichletL(sr: number, si: number, chi: Character): C {
  if (chi.q === 1) return zeta(sr, si);
  const q = chi.q;
  let re = 0;
  let im = 0;
  for (let a = 1; a < q; a++) {
    const [cr, ci] = chi.values[a];
    if (cr === 0 && ci === 0) continue;
    const [hr, hi] = hurwitz(sr, si, a / q);
    re += cr * hr - ci * hi;
    im += cr * hi + ci * hr;
  }
  const lq = Math.log(q);
  const m = Math.exp(-sr * lq);
  const c = Math.cos(si * lq);
  const s = -Math.sin(si * lq);
  return [m * (re * c - im * s), m * (re * s + im * c)];
}

/** Running partial Euler products prod_{p <= P} (1 - chi(p) p^{-s})^{-1}; returns the path of values. */
export function eulerPath(sr: number, si: number, count: number, chi?: Character): C[] {
  const out: C[] = [];
  let re = 1;
  let im = 0;
  for (let k = 0; k < count; k++) {
    const p = PRIMES[k];
    const lp = Math.log(p);
    const m = Math.exp(-sr * lp);
    let tr = m * Math.cos(si * lp);
    let ti = -m * Math.sin(si * lp);
    if (chi && chi.q > 1) {
      const [cr, ci] = chi.values[p % chi.q];
      [tr, ti] = [tr * cr - ti * ci, tr * ci + ti * cr];
    }
    // multiply by 1 / (1 - t)
    const dr = 1 - tr;
    const di = -ti;
    const dd = dr * dr + di * di;
    const nr = (re * dr + im * di) / dd;
    const ni = (im * dr - re * di) / dd;
    re = nr;
    im = ni;
    out.push([re, im]);
  }
  return out;
}

/** Partial sums of the Dirichlet series sum n^{-s}, n = 1..count. */
export function seriesPath(sr: number, si: number, count: number): C[] {
  const out: C[] = [];
  let re = 0;
  let im = 0;
  for (let n = 1; n <= count; n++) {
    const l = Math.log(n);
    const m = Math.exp(-sr * l);
    re += m * Math.cos(si * l);
    im -= m * Math.sin(si * l);
    out.push([re, im]);
  }
  return out;
}

/** Map a complex phase to an RGB colour on a perceptually even-ish wheel (for domain colouring). */
export function phaseColor(re: number, im: number, light: number): [number, number, number] {
  const h = (Math.atan2(im, re) / (2 * Math.PI) + 1) % 1;
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = 0.55 * Math.min(light, 1 - light);
    return light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}
