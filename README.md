# The Music of the Primes, explorable

An explorable guide to Alessandro Maria Masullo's manuscript *The Music of the Primes* and to the
mathematics behind the generalized Riemann hypothesis. Seven chapters of prose with live figures:
drag the numbers in the text and the points in the figures, and everything recomputes.

The manuscript is an unrefereed draft. The guide explains its ideas and its claimed strategy; it does
not vouch for the proof. See `status.html` for what the current text contains.

## Run it

```bash
npm install
npm run dev
```

`npm run build` writes the static site to `dist/`. Pushing to `main` deploys it to GitHub Pages
through `.github/workflows/deploy.yml` (set Pages to "GitHub Actions" in the repository settings).

## How it is built

- One HTML file per chapter in the repository root. The prose is plain HTML with KaTeX math.
- `src/pages/*.ts` holds each chapter's state, live text and figures.
- `src/lib/figure.ts` mounts a [MathBox](https://github.com/unconed/mathbox) (WebGL) scene per figure
  when it scrolls into view and frees it when it scrolls away.
- `src/lib/plot2d.ts` is a small 2D plotting layer on MathBox. Curves and marks are MathBox
  primitives; tick labels and draggable handles are DOM elements, so every handle works with the keyboard.
- `src/lib/reactive.ts` binds scrubbable numbers (`data-var`), controls (`data-bind`) and computed
  text (`data-out`) to a page-wide store.
- `src/lib/math/` computes primes, zeta and Dirichlet L-functions (Hurwitz zeta by Euler-Maclaurin).
- `src/data/zeros.json` holds zeros of zeta and of five Dirichlet L-functions. Regenerate it with
  `npm run data` (needs Python with `mpmath`).

MathBox 2.3 is pinned together with three.js 0.139, the version it is tested against.
