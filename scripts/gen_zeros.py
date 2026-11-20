"""Generate zero tables used by the site (run: python3 scripts/gen_zeros.py).

- First 300 nontrivial zeros of the Riemann zeta function (mpmath.zetazero).
- Zeros on the critical line, |t| <= 60, of a few Dirichlet L-functions,
  located as sign changes of a Hardy-type real function and refined.
"""
import json, sys
from mpmath import mp, mpf, mpc, zetazero, dirichlet, loggamma, log, pi, exp, arg, findroot, re, im

mp.dps = 25
out = {}

out["zeta"] = [float(zetazero(n).imag) for n in range(1, 301)]
print("zeta done", file=sys.stderr)

I = mpc(0, 1)
chars = {
    "chi3": {"q": 3, "label": "mod 3", "values": [0, 1, -1]},
    "chi4": {"q": 4, "label": "mod 4", "values": [0, 1, 0, -1]},
    "chi5q": {"q": 5, "label": "mod 5, real", "values": [0, 1, -1, -1, 1]},
    "chi5c": {"q": 5, "label": "mod 5, complex", "values": [0, 1, I, -I, -1]},
    "chi7": {"q": 7, "label": "mod 7, real", "values": [0, 1, 1, -1, 1, -1, -1]},
}

def make_Z(q, chi):
    a = 0 if chi[q - 1] == 1 else 1
    def raw(t):
        s = mpf(1) / 2 + I * t
        theta = im(loggamma((s + a) / 2)) + (t / 2) * log(mpf(q) / pi)
        return exp(I * theta) * dirichlet(s, chi)
    phi0 = arg(raw(mpf("1.2345")))
    rot = exp(-I * phi0)
    return lambda t: re(raw(mpf(t)) * rot)

T = 60
for key, c in chars.items():
    Z = make_Z(c["q"], c["values"])
    zeros = []
    step = mpf(1) / 20
    t = mpf(-T)
    prev = Z(t)
    while t < T:
        t2 = t + step
        cur = Z(t2)
        if prev == 0 or prev * cur < 0:
            root = findroot(Z, (t, t2), solver="anderson", tol=1e-18, maxsteps=100)
            zeros.append(float(root))
        prev, t = cur, t2
    vals = [[float(re(mpc(v))), float(im(mpc(v)))] for v in c["values"]]
    out[key] = {"q": c["q"], "label": c["label"], "values": vals, "zeros": zeros}
    print(key, len(zeros), zeros[:4], file=sys.stderr)

with open("src/data/zeros.json", "w") as f:
    json.dump(out, f)
print("wrote src/data/zeros.json", file=sys.stderr)
