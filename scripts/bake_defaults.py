"""Write the default value of every live number into the HTML source.

The pages compute these values in the browser. Baking them in means the text is complete for
readers without JavaScript, for crawlers, and for the Markdown versions built from the HTML.

scripts/defaults.json lists, per page and in document order, the text of every element that has
data-var or data-out, as captured from the running page. Re-capture it after changing a default:
in the browser console of each page run
  JSON.stringify([...document.querySelectorAll('[data-var],[data-out]')].map(e => e.textContent))
"""
import html, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
defaults = json.load(open(os.path.join(ROOT, "scripts/defaults.json"), encoding="utf-8"))
SPAN = re.compile(r'(<span\b[^>]*\bdata-(?:var|out)="[^"]+"[^>]*>)(.*?)(</span>)', re.S)

ok = True
for page, values in defaults.items():
    path = os.path.join(ROOT, page + ".html")
    text = open(path, encoding="utf-8").read()
    found = SPAN.findall(text)
    if len(found) != len(values):
        print(f"{page}: {len(found)} live elements in the HTML but {len(values)} values", file=sys.stderr)
        ok = False
        continue
    it = iter(values)
    text = SPAN.sub(lambda m: m.group(1) + html.escape(next(it), quote=False) + m.group(3), text)
    open(path, "w", encoding="utf-8").write(text)
    print(f"{page}: baked {len(values)} values")
sys.exit(0 if ok else 1)
