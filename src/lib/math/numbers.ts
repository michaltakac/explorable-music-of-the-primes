// Primes, prime-counting functions, and the zero tables.

import data from "../../data/zeros.json";

export const ZETA_ZEROS: number[] = (data as any).zeta;

export interface Character {
  key: string;
  q: number;
  label: string;
  /** chi(0..q-1) as [re, im] */
  values: [number, number][];
  /** ordinates t of zeros L(1/2 + it) = 0 with |t| <= 60 */
  zeros: number[];
}

export const CHARACTERS: Character[] = ["chi3", "chi4", "chi5q", "chi5c", "chi7"].map((key) => ({ key, ...(data as any)[key] }));
export const TRIVIAL: Character = { key: "zeta", q: 1, label: "trivial (Riemann zeta)", values: [[1, 0]], zeros: [...ZETA_ZEROS.filter((t) => t <= 60).map((t) => -t).reverse(), ...ZETA_ZEROS.filter((t) => t <= 60)] };

const LIMIT = 200000;
const sieve = new Uint8Array(LIMIT + 1);
export const PRIMES: number[] = [];
for (let i = 2; i <= LIMIT; i++) {
  if (!sieve[i]) {
    PRIMES.push(i);
    for (let j = i * 2; j <= LIMIT; j += i) sieve[j] = 1;
  }
}
export const isPrime = (n: number) => n >= 2 && n <= LIMIT && !sieve[n];

/** von Mangoldt: log p if n is a power of the prime p, else 0 */
const mangoldt = new Float64Array(LIMIT + 1);
for (const p of PRIMES) {
  const lp = Math.log(p);
  for (let q = p; q <= LIMIT; q *= p) mangoldt[q] = lp;
}
export const Lambda = (n: number) => (n >= 1 && n <= LIMIT ? mangoldt[n] : 0);

const piTable = new Int32Array(LIMIT + 1);
const psiTable = new Float64Array(LIMIT + 1);
for (let n = 1; n <= LIMIT; n++) {
  piTable[n] = piTable[n - 1] + (sieve[n] || n < 2 ? 0 : 1);
  psiTable[n] = psiTable[n - 1] + mangoldt[n];
}
/** number of primes <= x */
export const primePi = (x: number) => piTable[Math.max(0, Math.min(LIMIT, Math.floor(x)))];
/** Chebyshev psi(x): sum of log p over prime powers p^k <= x */
export const psi = (x: number) => psiTable[Math.max(0, Math.min(LIMIT, Math.floor(x)))];

/** prime powers p^k <= limit, sorted, with their prime */
export function primePowers(limit: number): { n: number; p: number; k: number }[] {
  const out: { n: number; p: number; k: number }[] = [];
  for (const p of PRIMES) {
    if (p > limit) break;
    for (let q = p, k = 1; q <= limit; q *= p, k++) out.push({ n: q, p, k });
  }
  return out.sort((a, b) => a.n - b.n);
}

const EULER = 0.5772156649015329;
/** logarithmic integral li(x) = Ei(ln x), by the convergent series */
export function li(x: number): number {
  if (x <= 1) return NaN;
  const u = Math.log(x);
  let sum = 0;
  let term = 1;
  for (let k = 1; k < 200; k++) {
    term *= u / k;
    sum += term / k;
    if (term / k < 1e-16 * Math.abs(sum)) break;
  }
  return EULER + Math.log(u) + sum;
}
export const Li = (x: number) => li(x) - 1.045163780117493;

/** The explicit formula for psi(x) truncated to the first N zero pairs (x > 1). */
export function psiFromZeros(x: number, N: number): number {
  const lx = Math.log(x);
  const sq = Math.sqrt(x);
  let s = 0;
  for (let k = 0; k < N; k++) {
    const g = ZETA_ZEROS[k];
    s += (Math.cos(g * lx) * 0.5 + Math.sin(g * lx) * g) / (0.25 + g * g);
  }
  return x - 2 * sq * s - Math.log(2 * Math.PI) - 0.5 * Math.log(1 - 1 / (x * x));
}

/** The pair of waves a zero beta + i*gamma (and its conjugate) adds to psi(x): -2 Re(x^rho / rho). */
export function zeroWave(x: number, beta: number, gamma: number): number {
  const lx = Math.log(x);
  return (-2 * Math.pow(x, beta) * (Math.cos(gamma * lx) * beta + Math.sin(gamma * lx) * gamma)) / (beta * beta + gamma * gamma);
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}
