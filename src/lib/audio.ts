// A small additive synthesiser: one sine oscillator per zero.

let ctx: AudioContext | null = null;
let live: { stop: () => void } | null = null;

export function stopChord() {
  live?.stop();
  live = null;
}

/** Play sine partials at the given frequencies (Hz) and relative amplitudes. Returns false if audio is unavailable. */
export function playChord(freqs: number[], amps: number[], seconds: number, onEnd: () => void): boolean {
  stopChord();
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return false;
  ctx = ctx ?? new AC();
  const c = ctx;
  if (c.state === "suspended") c.resume();
  const master = c.createGain();
  const total = amps.reduce((a, b) => a + b, 0) || 1;
  const now = c.currentTime;
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(0.5 / total, now + 0.08);
  master.gain.setValueAtTime(0.5 / total, now + seconds - 0.4);
  master.gain.linearRampToValueAtTime(0, now + seconds);
  master.connect(c.destination);
  const oscs = freqs.map((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.value = f;
    g.gain.value = amps[i];
    o.connect(g).connect(master);
    o.start(now);
    o.stop(now + seconds + 0.05);
    return o;
  });
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    oscs.forEach((o) => {
      try {
        o.stop();
      } catch {}
    });
    master.disconnect();
    onEnd();
  };
  const timer = window.setTimeout(finish, seconds * 1000 + 80);
  live = {
    stop: () => {
      clearTimeout(timer);
      finish();
    },
  };
  return true;
}
