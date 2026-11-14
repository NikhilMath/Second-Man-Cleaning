"""Build print-ready business cards (3.5x2in trim + 0.125in bleed) for each person.

Run from the repo root:  python3 business-cards/build.py
Outputs business-cards/<slug>.pdf (page 1 front, page 2 back) and <slug>-front.png / <slug>-back.png previews.
"""
import pathlib, subprocess

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
HERE = pathlib.Path(__file__).resolve().parent
LOGO = (HERE.parent / "assets" / "favicon.svg").as_uri()

PEOPLE = [
    ("nikhil-math", "Nikhil Math", "(435) 232-8058", "+14352328058"),
    ("grayson-nielsen", "Grayson Nielsen", "(435) 890-8583", "+14358908583"),
]

CSS = """
@page{size:3.75in 2.25in;margin:0}
*{margin:0;padding:0;box-sizing:border-box}
html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:Inter,system-ui,sans-serif}
.card{width:3.75in;height:2.25in;position:relative;overflow:hidden;page-break-after:always;break-after:page}
/* safe area: 0.125in bleed + 0.125in margin inside trim */
.safe{position:absolute;inset:.25in}
.serif{font-family:Fraunces,Georgia,serif;font-weight:600}

.front{background:#fffdf8;color:#1a1f2b}
.front::before{content:"";position:absolute;left:0;top:0;bottom:0;width:.32in;background:#13294b}
.front::after{content:"";position:absolute;left:.32in;top:0;bottom:0;width:.05in;background:#3fc1a5}
.front .safe{left:.6in}
.front .brand{display:flex;align-items:center;gap:.08in;font-size:9pt;color:#13294b}
.front .brand img{width:.26in;height:.26in}
.front .name{font-size:17pt;line-height:1.05;margin-top:.2in;color:#13294b}
.front .role{font-size:6.6pt;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#2a9c84;margin-top:.05in}
.front .lines{position:absolute;bottom:0;left:0;display:grid;gap:.035in;font-size:7.6pt;color:#1a1f2b}
.front .lines b{font-weight:600}
.front .lines span{display:flex;align-items:center;gap:.06in}
.front .lines svg{width:.1in;height:.1in;color:#2a9c84;flex:none}

.back{background:#13294b;color:#f6f1e7;display:grid;place-items:center;text-align:center}
.back::after{content:"";position:absolute;right:-.9in;top:-.9in;width:2.4in;height:2.4in;border-radius:50%;background:radial-gradient(circle,rgba(63,193,165,.3),transparent 65%)}
.back .inner{position:relative;z-index:1}
.back img{width:.62in;height:.62in;margin:0 auto .1in;display:block;border-radius:.14in;box-shadow:0 0 0 1.5px rgba(246,241,231,.25)}
.back .bname{font-size:13pt}
.back .tag{font-size:6.4pt;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:#3fc1a5;margin-top:.05in}
.back .vet{font-size:6.8pt;opacity:.8;margin-top:.12in}
.back .vet::before{content:"\\2713";color:#3fc1a5;font-weight:700;margin-right:.04in}
"""

PHONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.7a2 2 0 01-.5 2.1L8 9.8a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c.9.3 1.8.6 2.7.7a2 2 0 011.7 2z"/></svg>'
MAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>'
WEB = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/></svg>'

def page(name, phone, which):
    front = f"""
<div class="card front"><div class="safe">
  <div class="brand serif"><img src="{LOGO}" alt="">Second Man Cleaning</div>
  <div class="name serif">{name}</div>
  <div class="role">Commercial cleaning · Cache Valley</div>
  <div class="lines">
    <span>{PHONE}<b>{phone}</b></span>
    <span>{MAIL}office@secondmancleaning.com</span>
    <span>{WEB}secondmancleaning.com</span>
  </div>
</div></div>"""
    back = f"""
<div class="card back"><div class="inner">
  <img src="{LOGO}" alt="">
  <div class="bname serif">Second Man Cleaning</div>
  <div class="tag">Commercial cleaning · Cache Valley</div>
  <div class="vet">Veteran owned &amp; operated</div>
</div></div>"""
    body = {"both": front + back, "front": front, "back": back}[which]
    return f"""<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600&family=Inter:wght@400;600&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body>{body}</body></html>"""

def chrome(*args):
    subprocess.run([CHROME, "--headless", "--hide-scrollbars", "--virtual-time-budget=5000", *args],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

tmp = HERE / ".build"; tmp.mkdir(exist_ok=True)
for slug, name, phone, _ in PEOPLE:
    for which in ("both", "front", "back"):
        (tmp / f"{slug}-{which}.html").write_text(page(name, phone, which))
    chrome("--no-pdf-header-footer", f"--print-to-pdf={HERE / (slug + '.pdf')}", (tmp / f"{slug}-both.html").as_uri())
    for which in ("front", "back"):
        # 3.75x2.25in at 96px/in = 360x216 CSS px; scale 3 for a sharp preview
        chrome("--force-device-scale-factor=3", "--window-size=360,216",
               f"--screenshot={HERE / f'{slug}-{which}.png'}", (tmp / f"{slug}-{which}.html").as_uri())
    print("built", slug)
