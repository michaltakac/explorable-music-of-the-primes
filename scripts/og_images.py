"""Draw one 1200x630 OpenGraph image per page: title, short description and a figure from that page.

Run: python3 scripts/og_images.py        (needs Pillow, fontTools, brotli and mpmath)
Writes public/og/<page>.png. Titles and descriptions come from src/site.json.
"""
import json, math, os
from fontTools.ttLib import TTFont
from mpmath import mp, zeta as mpzeta, mpc
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = json.load(open(os.path.join(ROOT, "src/site.json"), encoding="utf-8"))
ZEROS = json.load(open(os.path.join(ROOT, "src/data/zeros.json")))["zeta"]
OUT = os.path.join(ROOT, "public/og")
CACHE = os.path.join(ROOT, "node_modules/.cache/og-fonts")
W, H, S = 1200, 630, 3  # S: supersampling factor

PAPER, PAPER2, INK, INK2, RULE = "#f6f2e9", "#ebe4d3", "#1d1b18", "#57524a", "#d6cdb9"
PRIME, ZERO, TOUCH = "#b3381c", "#1f4f99", "#c58300"

# ---------- fonts: the site's own faces, unpacked from the npm packages ----------
def ttf(pkg, name):
    os.makedirs(CACHE, exist_ok=True)
    out = os.path.join(CACHE, name + ".ttf")
    if not os.path.exists(out):
        f = TTFont(os.path.join(ROOT, "node_modules/@fontsource-variable", pkg, "files", name + ".woff2"))
        f.flavor = None
        f.save(out)
    return out

SERIF = ttf("source-serif-4", "source-serif-4-latin-opsz-normal")
SERIF_I = ttf("source-serif-4", "source-serif-4-latin-opsz-italic")
SANS = ttf("source-sans-3", "source-sans-3-latin-wght-normal")

def font(path, size, wght=400, opsz=None):
    f = ImageFont.truetype(path, int(size * S))
    try:
        axes = f.get_variation_axes()
        vals = []
        for a in axes:
            name = a["name"]
            name = name.decode() if isinstance(name, bytes) else name
            if "eight" in name:
                vals.append(wght)
            elif "ptical" in name:
                vals.append(min(a["maximum"], max(a["minimum"], opsz or size)))
            else:
                vals.append(a["default"])
        f.set_variation_by_axes(vals)
    except Exception:
        pass
    return f

def wrap_at(text, f, width):
    lines, cur = [], ""
    for word in text.split():
        t = (cur + " " + word).strip()
        if f.getlength(t) <= width * S or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = word
    return lines + [cur] if cur else lines

def wrap(text, f, width):
    """Greedy wrap, then narrow the measure as far as the line count allows, so lines come out even."""
    lines = wrap_at(text, f, width)
    w = width
    while w > width * 0.5:
        trial = wrap_at(text, f, w - 10)
        if len(trial) > len(lines):
            break
        lines, w = trial, w - 10
    return lines

# ---------- arithmetic ----------
LIMIT = 4000
sieve = [True] * (LIMIT + 1)
sieve[0] = sieve[1] = False
for i in range(2, LIMIT + 1):
    if sieve[i]:
        for j in range(i * i, LIMIT + 1, i):
            sieve[j] = False
PRIMES = [i for i in range(LIMIT + 1) if sieve[i]]
MANG = [0.0] * (LIMIT + 1)
for p in PRIMES:
    q = p
    while q <= LIMIT:
        MANG[q] = math.log(p)
        q *= p

def psi(x):
    return sum(MANG[2 : int(x) + 1])

def psi_zeros(x, n):
    lx, s = math.log(x), 0.0
    for g in ZEROS[:n]:
        s += (math.cos(g * lx) * 0.5 + math.sin(g * lx) * g) / (0.25 + g * g)
    return x - 2 * math.sqrt(x) * s - math.log(2 * math.pi) - 0.5 * math.log(1 - 1 / (x * x))

def Li(x, n=400):
    # midpoint rule for the integral of 1/log t from 2 to x
    h = (x - 2) / n
    return sum(h / math.log(2 + (i + 0.5) * h) for i in range(n))

# ---------- a plotting box ----------
class Box:
    def __init__(self, d, x0, x1, y0, y1, box=(640, 96, 1128, 508), square=False):
        self.d = d
        bx0, by0, bx1, by1 = box
        if square:  # equal units on both axes, centred in the box
            sx, sy = (bx1 - bx0) / (x1 - x0), (by1 - by0) / (y1 - y0)
            s = min(sx, sy)
            cx, cy = (bx0 + bx1) / 2, (by0 + by1) / 2
            bx0, bx1 = cx - s * (x1 - x0) / 2, cx + s * (x1 - x0) / 2
            by0, by1 = cy - s * (y1 - y0) / 2, cy + s * (y1 - y0) / 2
        self.b = (bx0, by0, bx1, by1)
        self.r = (x0, x1, y0, y1)

    def pt(self, x, y):
        bx0, by0, bx1, by1 = self.b
        x0, x1, y0, y1 = self.r
        return ((bx0 + (x - x0) / (x1 - x0) * (bx1 - bx0)) * S, (by1 - (y - y0) / (y1 - y0) * (by1 - by0)) * S)

    def line(self, pts, color, width=2.5):
        self.d.line([self.pt(x, y) for x, y in pts], fill=color, width=int(round(width * S)), joint="curve")

    def dot(self, x, y, color, r=5, outline=None):
        px, py = self.pt(x, y)
        self.d.ellipse([px - r * S, py - r * S, px + r * S, py + r * S], fill=color, outline=outline, width=int(1.5 * S) if outline else 0)

    def rect(self, x0, y0, x1, y1, color):
        a, b = self.pt(x0, y0), self.pt(x1, y1)
        self.d.rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=color)

    def circle(self, x, y, r, color, width=1.5):
        (ax, ay), (bx, by) = self.pt(x - r, y + r), self.pt(x + r, y - r)
        self.d.ellipse([ax, ay, bx, by], outline=color, width=int(round(width * S)))

def stairs(f, a, b):
    pts, prev = [(a, f(a))], f(a)
    for n in range(int(math.ceil(a)), int(b) + 1):
        v = f(n)
        if v != prev:
            pts += [(n, prev), (n, v)]
            prev = v
    return pts + [(b, prev)]

# ---------- one figure per page ----------
def fig_index(d):
    b = Box(d, 2, 46, 0, 48)
    b.line([(2, 0), (46, 0)], RULE, 1.5)
    xs = [2 + 44 * i / 900 for i in range(901)]
    b.line([(x, psi_zeros(x, 3)) for x in xs], "#9fb3d4", 1.6)
    b.line([(x, psi_zeros(x, 60)) for x in xs], ZERO, 2.6)
    b.line(stairs(psi, 2, 46), PRIME, 2.8)

def fig_primes(d):
    b = Box(d, 0, 100, 0, 30)
    b.line([(0, 0), (100, 0)], RULE, 1.5)
    b.line([(x, Li(x)) for x in [2 + 98 * i / 200 for i in range(201)]], INK, 2)
    b.line(stairs(lambda x: sum(1 for p in PRIMES if p <= x), 0, 100), PRIME, 2.8)

def fig_zeta(d):
    mp.dps = 15
    b = Box(d, -2.1, 3.6, -2.2, 2.2, square=True)
    b.line([(-2.1, 0), (3.6, 0)], RULE, 1.5)
    b.line([(0, -2.2), (0, 2.2)], RULE, 1.5)
    pts = []
    for i in range(1300):
        z = mpzeta(mpc(0.5, 42 * i / 1299))
        pts.append((float(z.real), float(z.imag)))
    b.line(pts, ZERO, 2.4)
    b.dot(0, 0, INK, 5.5)

def fig_music(d):
    u0, u1 = math.log(1.6), math.log(21)
    b = Box(d, u0, u1, -0.3, 0.95)
    b.line([(u0, 0), (u1, 0)], RULE, 1.5)
    M, T = 300, ZEROS[299]
    us = [u0 + (u1 - u0) * i / 2200 for i in range(2201)]
    b.line([(u, -2 * math.pi * sum(math.cos(g * u) for g in ZEROS[:M]) / T) for u in us], ZERO, 1.6)
    for n in range(2, 21):
        if MANG[n] > 0:
            b.dot(math.log(n), MANG[n] / math.sqrt(n), PRIME, 5.5)

def fig_family(d):
    R = 21
    b = Box(d, -R - 1, R + 1, -R - 1, R + 1, square=True)
    for a in range(-R, R + 1):
        for c in range(-R, R + 1):
            n = a * a + c * c
            if n > R * R:
                continue
            if a == 0 or c == 0:
                m = abs(a) + abs(c)
                if m % 4 == 3 and sieve[m]:
                    b.dot(a, c, PRIME, 4)
            elif n == 2:
                b.dot(a, c, INK, 4)
            elif sieve[n]:
                b.dot(a, c, ZERO, 3.6)

def fig_adeles(d):
    p, digits, rings, ratio = 5, 3, 7, 0.64
    b = Box(d, -1.08, 1.08, -1.08, 1.08, square=True)
    for k in range(rings):
        r = ratio ** k
        for u in range(1, p ** digits):
            if u % p == 0:
                continue
            m, frac, w = u, 0.0, 1 / p
            for _ in range(digits):
                frac += (m % p) * w
                m //= p
                w /= p
            ang = 2 * math.pi * frac
            b.dot(r * math.sin(ang), r * math.cos(ang), PRIME if k == 0 else INK2, 3.4 if k < 3 else 2.4)
    b.dot(0, 0, INK, 3)

def fig_trace(d):
    b = Box(d, -0.72, 0.72, -0.72, 0.72, square=True)
    b.line([(0, 0), (0.7, 0)], RULE, 1.5)
    tau = 2.35
    for p in [q for q in PRIMES if q < 60]:
        r = math.log(p) / (2 * math.pi)
        b.circle(0, 0, r, INK2, 1.3)
    for p in [q for q in PRIMES if q < 60]:
        r = math.log(p) / (2 * math.pi)
        th = 2 * math.pi * tau / math.log(p)
        b.dot(r * math.cos(th), r * math.sin(th), TOUCH, 4.5)
        b.dot(r, 0, PRIME, 3)

def fig_proof(d):
    b = Box(d, -0.12, 1.12, 0, 50)
    b.rect(0, 0, 1, 50, PAPER2)
    b.rect(0.3, 0, 0.7, 50, "#ecd9a8")
    b.line([(0.5, 0), (0.5, 50)], ZERO, 1.6)
    b.line([(-0.12, 0), (1.12, 0)], INK2, 1.5)
    for g in ZEROS:
        if g < 50:
            b.dot(0.5, g, ZERO, 6)
    b.dot(0.84, 27, PAPER, 7.5, outline=TOUCH)
    b.dot(0.16, 27, PAPER, 5.5, outline=TOUCH)

def fig_status(d):
    b = Box(d, 0.3, 4.0, -3.6, 3.0)
    us = [0.3 + 3.7 * i / 1400 for i in range(1401)]
    for j, n in enumerate((3, 12, 60)):
        off = 2.0 - 1.9 * j
        b.line([(u, off + 6 * sum(math.cos(g * u) / g for g in ZEROS[:n])) for u in us], (INK2, ZERO, PRIME)[j], 1.8)

FIGS = dict(index=fig_index, primes=fig_primes, zeta=fig_zeta, music=fig_music, family=fig_family, adeles=fig_adeles, trace=fig_trace, proof=fig_proof, status=fig_status)

# ---------- the card ----------
def card(page):
    slug = page["file"].replace(".html", "")
    img = Image.new("RGB", (W * S, H * S), PAPER)
    d = ImageDraw.Draw(img)

    # the site's rule line: the first 40 zero-waves
    top = [(72 + (W - 144) * i / 600, 50 - 30 * sum(math.cos(g * (0.3 + 3.7 * i / 600)) / g for g in ZEROS[:40])) for i in range(601)]
    d.line([(x * S, y * S) for x, y in top], fill=INK2, width=int(1.2 * S), joint="curve")

    FIGS[slug](d)

    x = 72
    y = 118
    d.text((x * S, y * S), page["kicker"], font=font(SANS, 25, 600), fill=INK2)
    y += 50
    title = page["title"][0].upper() + page["title"][1:]
    size = 62
    f = font(SERIF, size, 620, 60)
    lines = wrap(title, f, 500)
    if len(lines) > 3:
        size = 52
        f = font(SERIF, size, 620, 60)
        lines = wrap(title, f, 500)
    for ln in lines:
        d.text((x * S, y * S), ln, font=f, fill=INK)
        y += size * 1.12
    y += 30
    f = font(SERIF, 27, 400, 20)
    for ln in wrap(page["blurb"], f, 500)[:5]:
        d.text((x * S, y * S), ln, font=f, fill=INK2)
        y += 38

    fy = 548
    if slug != "index":
        d.text((x * S, fy * S), SITE["name"], font=font(SERIF_I, 24, 400, 20), fill=INK)
    d.text((x * S, (fy + 34) * S), SITE["url"].replace("https://", "").rstrip("/"), font=font(SANS, 19, 400), fill=INK2)

    os.makedirs(OUT, exist_ok=True)
    img.resize((W, H), Image.LANCZOS).save(os.path.join(OUT, slug + ".png"), optimize=True)
    return slug

if __name__ == "__main__":
    for page in SITE["pages"]:
        print("drew", card(page))
