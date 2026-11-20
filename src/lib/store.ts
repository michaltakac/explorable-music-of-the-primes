// A page-wide reactive state: plain object, listeners run once per animation frame after any change.

type Listener = () => void;

export interface StoreApi {
  $on(fn: Listener): () => void;
  $flush(): void;
}

export function store<T extends Record<string, any>>(initial: T): T & StoreApi {
  const listeners = new Set<Listener>();
  let pending = false;
  const flush = () => {
    pending = false;
    listeners.forEach((fn) => fn());
  };
  const api: StoreApi = {
    $on(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    $flush: flush,
  };
  return new Proxy({ ...initial } as T & StoreApi, {
    get(target, key) {
      if (key in api) return (api as any)[key];
      return (target as any)[key];
    },
    set(target, key, value) {
      if ((target as any)[key] === value) return true;
      (target as any)[key] = value;
      if (!pending) {
        pending = true;
        requestAnimationFrame(flush);
      }
      return true;
    },
  });
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function fmt(v: number, digits = 2): string {
  if (!isFinite(v)) return "∞";
  const s = v.toFixed(digits);
  if (Number(s) === 0) return s.replace("-", ""); // no "minus zero"
  return s.replace("-", "\u2212");
}

export function fmtInt(v: number): string {
  return Math.round(v).toLocaleString("en-US").replace("-", "−");
}
