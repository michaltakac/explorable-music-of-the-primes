"""Draw the README figures as SVG from the same data the site uses.

Run: python3 scripts/readme_figures.py
Writes docs/readme/{hero,spikes,combs}-{light,dark}.svg
"""
import json, math, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZEROS = json.load(open(os.path.join(ROOT, "src/data/zeros.json")))["zeta"]
OUT = os.path.join(ROOT, "docs/readme")

THEMES = {
    "light": dict(ink="#1d1b18", ink2="#57524a", rule="#d6cdb9", prime="#b3381c", zero="#1f4f99", touch="#c58300"),
    "dark": dict(ink="#ece7db", ink2="#aaa498", rule="#3b404b", prime="#ff8d6e", zero="#8fbaff", touch="#f0b445"),
}
SANS = "system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
SERIF = "'Source Serif 4', 'Iowan Old Style', Georgia, serif"

# ---- arithmetic ----
LIMIT = 200
sieve = [True] * (LIMIT + 1)
sieve[0] = sieve[1] = False
for i in range(2, LIMIT + 1):
    if sieve[i]:
        for j in range(i * i, LIMIT + 1, i):
            sieve[j] = False
PRIMES = [i for i in range(LIMIT + 1) if sieve[i]]
MANGOLDT = [0.0] * (LIMIT + 1)
for p in PRIMES:
    q = p
    while q <= LIMIT:
        MANGOLDT[q] = math.log(p)
        q *= p


def psi(x):
    return sum(MANGOLDT[2 : int(math.floor(x)) + 1])


def psi_from_zeros(x, n):
    lx, sq, s = math.log(x), math.sqrt(x), 0.0
    for g in ZEROS[:n]:
        s += (math.cos(g * lx) * 0.5 + math.sin(g * lx) * g) / (0.25 + g * g)
    return x - 2 * sq * s - math.log(2 * math.pi) - 0.5 * math.log(1 - 1 / (x * x))


# ---- svg helpers ----
def path(points):
    return "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in points)


def svg(w, h, body):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img">\n{body}\n</svg>\n'
    )


def write(name, theme, content):
    with open(os.path.join(OUT, f"{name}-{theme}.svg"), "w") as f:
        f.write(content)


# ---- figure 1: the staircase and the explicit formula ----
def hero(c):
    W, H = 1280, 470
    L, R, T, B = 28, 28, 40, 54
    x0, x1, y0, y1 = 1.6, 64.6, 0.0, 66.0
    X = lambda x: L + (x - x0) / (x1 - x0) * (W - L - R)
    Y = lambda y: H - B - (y - y0) / (y1 - y0) * (H - T - B)
    out = []
    out.append(f'<line x1="{L}" y1="{Y(0):.1f}" x2="{W-R}" y2="{Y(0):.1f}" stroke="{c["rule"]}" stroke-width="1.5"/>')
    # prime powers on the axis
    for n in range(2, 65):
        if MANGOLDT[n] > 0:
            is_prime = sieve[n]
            out.append(f'<line x1="{X(n):.1f}" y1="{Y(0):.1f}" x2="{X(n):.1f}" y2="{Y(0)+ (9 if is_prime else 5):.1f}" stroke="{c["ink2"]}" stroke-width="1.2"/>')
            if is_prime:
                out.append(f'<text x="{X(n):.1f}" y="{Y(0)+27:.1f}" text-anchor="middle" font-family="{SANS}" font-size="15" fill="{c["ink2"]}">{n}</text>')
    # formula with 1, 6 and 60 zeros
    for n, op, sw in ((1, 0.28, 1.6), (6, 0.5, 1.8), (60, 1.0, 2.6)):
        pts = []
        steps = 1500
        for i in range(steps + 1):
            x = 2 + (64 - 2) * i / steps
            pts.append((X(x), Y(psi_from_zeros(x, n))))
        out.append(f'<path d="{path(pts)}" fill="none" stroke="{c["zero"]}" stroke-opacity="{op}" stroke-width="{sw}" stroke-linejoin="round"/>')
    # the staircase
    pts = [(X(2), Y(0))]
    prev = 0.0
    for n in range(2, 65):
        v = psi(n)
        if v != prev:
            pts.append((X(n), Y(prev)))
            pts.append((X(n), Y(v)))
            prev = v
    pts.append((X(64.6), Y(prev)))
    out.append(f'<path d="{path(pts)}" fill="none" stroke="{c["prime"]}" stroke-width="2.6" stroke-linejoin="miter"/>')
    # legend
    out.append(f'<text x="{L+6}" y="{T+2}" font-family="{SERIF}" font-size="23" font-style="italic" fill="{c["prime"]}">ψ(x), the weighted count of primes</text>')
    out.append(f'<text x="{L+6}" y="{T+34}" font-family="{SERIF}" font-size="23" font-style="italic" fill="{c["zero"]}">Riemann\'s formula with 1, 6 and 60 zeros of zeta</text>')
    return svg(W, H, "\n".join(out))


# ---- figure 2: the zeros find the prime powers ----
def spikes(c):
    W, H = 1280, 380
    L, R, T, B = 28, 28, 26, 54
    u0, u1, y0, y1 = math.log(1.5), math.log(34), -0.28, 0.92
    X = lambda u: L + (u - u0) / (u1 - u0) * (W - L - R)
    Y = lambda y: H - B - (y - y0) / (y1 - y0) * (H - T - B)
    out = [f'<line x1="{L}" y1="{Y(0):.1f}" x2="{W-R}" y2="{Y(0):.1f}" stroke="{c["rule"]}" stroke-width="1.5"/>']
    M = 300
    Tt = ZEROS[M - 1]
    pts = []
    steps = 2600
    for i in range(steps + 1):
        u = u0 + (u1 - u0) * i / steps
        pts.append((X(u), Y(-2 * math.pi * sum(math.cos(g * u) for g in ZEROS[:M]) / Tt)))
    out.append(f'<path d="{path(pts)}" fill="none" stroke="{c["zero"]}" stroke-width="1.5" stroke-linejoin="round"/>')
    skip = {17, 25, 29, 31}
    for n in range(2, 33):
        if MANGOLDT[n] > 0:
            u = math.log(n)
            out.append(f'<circle cx="{X(u):.1f}" cy="{Y(MANGOLDT[n]/math.sqrt(n)):.1f}" r="5.5" fill="{c["prime"]}"/>')
            out.append(f'<line x1="{X(u):.1f}" y1="{H-B+4}" x2="{X(u):.1f}" y2="{H-B+11}" stroke="{c["ink2"]}" stroke-width="1.2"/>')
            if n not in skip:
                out.append(f'<text x="{X(u):.1f}" y="{H-B+30}" text-anchor="middle" font-family="{SANS}" font-size="15" fill="{c["ink2"]}">{n}</text>')
    out.append(f'<text x="{W-R-4}" y="{T+14}" text-anchor="end" font-family="{SERIF}" font-size="21" font-style="italic" fill="{c["zero"]}">a sum of cosines over 300 zeros</text>')
    out.append(f'<text x="{W-R-4}" y="{T+42}" text-anchor="end" font-family="{SERIF}" font-size="21" font-style="italic" fill="{c["prime"]}">the heights Landau\'s formula predicts</text>')
    return svg(W, H, "\n".join(out))


# ---- figure 3: the combs of different primes never line up ----
def combs(c):
    W, H = 1280, 300
    L, R, T, B = 86, 28, 18, 44
    t0, t1 = -40.0, 40.0
    primes = [2, 3, 5, 7, 11, 13]
    X = lambda t: L + (t - t0) / (t1 - t0) * (W - L - R)
    row_h = (H - T - B) / len(primes)
    out = []
    out.append(f'<line x1="{X(0):.1f}" y1="{T}" x2="{X(0):.1f}" y2="{H-B}" stroke="{c["ink"]}" stroke-width="1.6"/>')
    for i, p in enumerate(reversed(primes)):
        yc = T + row_h * (i + 0.5)
        out.append(f'<text x="{L-16}" y="{yc+5:.1f}" text-anchor="end" font-family="{SANS}" font-size="15" fill="{c["ink2"]}">p = {p}</text>')
        st = 2 * math.pi / math.log(p)
        m = -int(40 // st)
        while m * st <= 40:
            out.append(f'<line x1="{X(m*st):.1f}" y1="{yc-row_h*0.32:.1f}" x2="{X(m*st):.1f}" y2="{yc+row_h*0.32:.1f}" stroke="{c["prime"]}" stroke-width="2.4"/>')
            m += 1
    for t in (-40, -20, 0, 20, 40):
        out.append(f'<text x="{X(t):.1f}" y="{H-B+26}" text-anchor="middle" font-family="{SANS}" font-size="15" fill="{c["ink2"]}">{t}</text>')
    return svg(W, H, "\n".join(out))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for theme, colours in THEMES.items():
        write("hero", theme, hero(colours))
        write("spikes", theme, spikes(colours))
        write("combs", theme, combs(colours))
    print("wrote", sorted(os.listdir(OUT)))
