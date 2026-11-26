"""Build print-ready business cards (3.5x2in trim + BLEED on every side): one per person plus a general business card.

Run from the repo root:  python3 business-cards/build.py [slug ...]   (no slugs = build them all)
Outputs business-cards/<slug>.pdf (single-sided) and a <slug>.png preview.
"""
import sys
import pathlib, subprocess

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
HERE = pathlib.Path(__file__).resolve().parent
LOGO = (HERE.parent / "assets" / "favicon.svg").as_uri()

# Standard 3.5x2in card. BLEED is extra background on every side that the printer
# trims off; MARGIN keeps all text at least this far inside the cut line.
TRIM_W, TRIM_H = 3.5, 2.0
BLEED = 0.25
MARGIN = 0.125
PAGE_W, PAGE_H = TRIM_W + 2 * BLEED, TRIM_H + 2 * BLEED

ROLE = "Commercial cleaning · Cache Valley"

# slug, big line, phone, tel, small line under it
CARDS = [
    ("nikhil-math", "Nikhil Math", "(435) 232-8058", "+14352328058", ROLE),
    ("grayson-nielsen", "Grayson Nielsen", "(435) 890-8583", "+14358908583", ROLE),
    # General card: no person, the business line rings both owners.
    ("second-man-cleaning", "Commercial Cleaning", "(435) 919-4041", "+14359194041", "After hours · Logan &amp; Cache Valley"),
]

CSS = """
@page{size:@PAGE_W@in @PAGE_H@in;margin:0}
*{margin:0;padding:0;box-sizing:border-box}
html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:Inter,system-ui,sans-serif}
.card{width:@PAGE_W@in;height:@PAGE_H@in;position:relative;overflow:hidden;page-break-after:always;break-after:page}
/* safe area: bleed + margin inside trim */
.safe{position:absolute;inset:@SAFE@in}
.serif{font-family:Fraunces,Georgia,serif;font-weight:600}

.front{background:#fffdf8;color:#1a1f2b}
.front::before{content:"";position:absolute;left:0;top:0;bottom:0;width:@NAVY_W@in;background:#13294b}
.front::after{content:"";position:absolute;left:@NAVY_W@in;top:0;bottom:0;width:.05in;background:#3fc1a5}
.front .safe{left:@TEXT_LEFT@in}
.front .brand{display:flex;align-items:center;gap:.08in;font-size:9pt;color:#13294b}
.front .brand img{width:.26in;height:.26in}
.front .name{font-size:17pt;line-height:1.05;margin-top:.2in;color:#13294b}
.front .vet{font-size:7pt;color:#5b6475;margin-top:.04in}
.front .vet+.vet{margin-top:.02in}
.front .vet::before{content:"\\2713";color:#2a9c84;font-weight:700;margin-right:.04in}
.front .role{font-size:6.6pt;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#2a9c84;margin-top:.05in}
.front .lines{position:absolute;bottom:0;left:0;display:grid;gap:.035in;font-size:7.6pt;color:#1a1f2b}
.front .lines b{font-weight:600}
.front .lines span{display:flex;align-items:center;gap:.06in}
.front .lines svg{width:.1in;height:.1in;color:#2a9c84;flex:none}

"""

# Fill in the sizes (all in inches). Visible parts inside the trim: navy stripe .195in,
# text starts .475in from the cut line.
for key, val in {"PAGE_W": PAGE_W, "PAGE_H": PAGE_H, "SAFE": BLEED + MARGIN,
                 "NAVY_W": BLEED + 0.195, "TEXT_LEFT": BLEED + 0.475}.items():
    CSS = CSS.replace(f"@{key}@", f"{val:g}")

PHONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.7a2 2 0 01-.5 2.1L8 9.8a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c.9.3 1.8.6 2.7.7a2 2 0 011.7 2z"/></svg>'
MAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>'
WEB = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/></svg>'

def page(name, phone, role):
    front = f"""
<div class="card front"><div class="safe">
  <div class="brand serif"><img src="{LOGO}" alt="">Second Man Cleaning</div>
  <div class="name serif">{name}</div>
  <div class="role">{role}</div>
  <div class="vet">Veteran owned &amp; operated</div>
  <div class="vet">Licensed &amp; insured</div>
  <div class="lines">
    <span>{PHONE}<b>{phone}</b></span>
    <span>{MAIL}office@secondmancleaning.com</span>
    <span>{WEB}secondmancleaning.com</span>
  </div>
</div></div>"""
    return f"""<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600&family=Inter:wght@400;600&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body>{front}</body></html>"""

def chrome(*args):
    subprocess.run([CHROME, "--headless", "--hide-scrollbars", "--virtual-time-budget=5000", *args],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

tmp = HERE / ".build"; tmp.mkdir(exist_ok=True)
only = set(sys.argv[1:])
for slug, name, phone, _, role in CARDS:
    if only and slug not in only:
        continue
    html = tmp / f"{slug}.html"
    html.write_text(page(name, phone, role))
    chrome("--no-pdf-header-footer", f"--print-to-pdf={HERE / (slug + '.pdf')}", html.as_uri())
    # Preview shows the whole page, bleed included: inches x 96 CSS px, scale 3 for sharpness
    size = f"{round(PAGE_W * 96)},{round(PAGE_H * 96)}"
    chrome("--force-device-scale-factor=3", f"--window-size={size}", f"--screenshot={HERE / (slug + '.png')}", html.as_uri())
    print("built", slug)
