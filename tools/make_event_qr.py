"""Print the QR codes: the event trophy (changes every day) and the partner places (fixed).

Usage:
    py tools/make_event_qr.py 2026-10-07 --base https://seu-site.vercel.app

Writes public/qr/evento-<data>.png, public/qr/parceiro-<id>.png, public/qr-evento.html (full screen,
for the event screen) and public/qr.html (the 4 partner signs, ready to print).

The token formula is the same as src/core/qr.ts: sha256("<EVENT_SECRET>:<texto>")[:8].
DEMO: the secret is public in the bundle. A real launch must validate on a server.
"""
import argparse
import hashlib
import json
import re
from datetime import date
from pathlib import Path

import qrcode
from qrcode.constants import ERROR_CORRECT_M

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"


def read_config(name: str, default: str = "") -> str:
    text = (ROOT / "src" / "config.ts").read_text(encoding="utf-8")
    m = re.search(rf"export const {name}\s*=\s*'([^']*)'", text)
    return m.group(1) if m else default


def token(secret: str, text: str) -> str:
    return hashlib.sha256(f"{secret}:{text}".encode("utf-8")).hexdigest()[:8]


def make_png(url: str, path: Path) -> None:
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_M, box_size=16, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    path.parent.mkdir(parents=True, exist_ok=True)
    qr.make_image(fill_color="#1c1730", back_color="white").save(path)


STYLE = """
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #1c1730; color: #f1ddb0; font-family: 'Fredoka', sans-serif; text-align: center; }
  h1 { color: #ffc36b; margin: 0; }
  img.qr { background: #fff; padding: 14px; border-radius: 16px; border: 6px solid #4a3322; }
  @media print { body { background: #fff; color: #222; } h1 { color: #4a3322; } img.qr { border-color: #4a3322; } .sign { break-inside: avoid; } }
</style>
<style>@font-face { font-family: "Fredoka"; font-weight: 400 700; src: url(fonts/Fredoka-latin.woff2) format("woff2"); }</style>
"""


def event_page(day: str, tk: str, url: str, event_name: str) -> str:
    return f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Troféu Coruja · QR do evento</title>{STYLE}
<style>body {{ min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2vh; }}
h1 {{ font-size: clamp(28px, 6vw, 72px); }} img.qr {{ width: min(70vh, 80vw); height: auto; image-rendering: pixelated; }} p {{ font-size: clamp(16px, 2.4vw, 28px); margin: 0; }}</style></head>
<body>
  <h1>Escaneie e ganhe o Troféu Coruja</h1>
  <img class="qr" src="qr/evento-{day}.png" alt="QR do evento, válido em {day}">
  <p>{event_name} · válido hoje ({day})</p>
  <p style="opacity:.6;font-size:clamp(12px,1.6vw,18px)">{url}</p>
</body></html>
"""


def partners_page(partners: list[dict], base: str, secret: str) -> str:
    signs = []
    for p in partners:
        tk = token(secret, f"parceiro:{p['id']}")
        signs.append(
            f'<section class="sign"><h2>{p["name"]}</h2><img class="qr" src="qr/parceiro-{p["id"]}.png" alt="QR do {p["name"]}">'
            f'<p>Escaneie para começar a visita<br><small>{base}/?qr={tk}</small></p></section>'
        )
    return f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>QR dos parceiros · Passport</title>{STYLE}
<style>main {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; padding: 24px; }}
.sign {{ border: 4px dashed #4a3322; border-radius: 16px; padding: 18px; }} h2 {{ margin: 0 0 10px; color: #ffc36b; }}
img.qr {{ width: 240px; height: 240px; image-rendering: pixelated; }} small {{ opacity: .7; word-break: break-all; }}</style></head>
<body><h1 style="padding-top:24px">QR dos parceiros</h1><p>Imprima e cole na entrada de cada lugar. Fotografe o lugar, sem pessoas.</p><main>{''.join(signs)}</main></body></html>
"""


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("day", nargs="?", default=date.today().isoformat(), help="data do QR do evento, AAAA-MM-DD (padrão: hoje)")
    ap.add_argument("--base", default="", help="URL do site publicado (padrão: QR_BASE_URL de src/config.ts ou http://localhost:5173)")
    args = ap.parse_args()

    secret = read_config("EVENT_SECRET")
    if not secret:
        raise SystemExit("EVENT_SECRET not found in src/config.ts")
    event_name = read_config("EVENT_NAME", "Evento")
    base = (args.base or read_config("QR_BASE_URL") or "http://localhost:5173").rstrip("/")

    ev_token = token(secret, f"evento:{args.day}")
    ev_url = f"{base}/?qr={ev_token}"
    make_png(ev_url, PUBLIC / "qr" / f"evento-{args.day}.png")
    (PUBLIC / "qr-evento.html").write_text(event_page(args.day, ev_token, ev_url, event_name), encoding="utf-8")

    partners = [p for p in json.loads((ROOT / "src/data/partners.json").read_text(encoding="utf-8"))["partners"] if not p.get("event")]
    for p in partners:
        make_png(f"{base}/?qr={token(secret, 'parceiro:' + p['id'])}", PUBLIC / "qr" / f"parceiro-{p['id']}.png")
    (PUBLIC / "qr.html").write_text(partners_page(partners, base, secret), encoding="utf-8")

    print(f"evento {args.day}: {ev_url}")
    for p in partners:
        print(f"{p['id']}: {base}/?qr={token(secret, 'parceiro:' + p['id'])}")
    print("O QR do evento vale no dia e no dia seguinte. Gere um novo a cada evento.")


if __name__ == "__main__":
    main()
