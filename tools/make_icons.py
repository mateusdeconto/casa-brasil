"""App icons, favicon and the share image (og.jpg), made from the game's own art. Run: npm run icons"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "public" / "assets"
OUT = ROOT / "public" / "icons"
BG = (28, 23, 48)  # #1C1730, the theme color
WOOD = (74, 51, 34)
CREAM = (241, 221, 176)


def find(name: str) -> Path:
    for ext in ("png", "webp"):
        p = ASSETS / "items" / f"{name}.{ext}"
        if p.exists():
            return p
    raise SystemExit(f"missing {name}: run npm run assets first")


def icon(size: int, art_ratio: float, rounded: bool) -> Image.Image:
    im = Image.new("RGBA", (size, size), BG + (255,))
    d = ImageDraw.Draw(im)
    pad = round(size * 0.06)
    d.rounded_rectangle([pad, pad, size - pad, size - pad], radius=round(size * 0.18), outline=WOOD, width=max(2, size // 40))
    art = Image.open(find("badge_primeira_visita")).convert("RGBA")
    k = size * art_ratio / max(art.size)
    art = art.resize((round(art.width * k), round(art.height * k)), Image.LANCZOS)
    im.alpha_composite(art, ((size - art.width) // 2, (size - art.height) // 2))
    if rounded:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, size, size], radius=round(size * 0.22), fill=255)
        im.putalpha(mask)
    return im


def font(size: int) -> ImageFont.ImageFont:
    for path in ("C:/Windows/Fonts/arialbd.ttf", "/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"):
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default(size)


def share_image() -> Image.Image:
    art = Image.open(ASSETS / "abertura.webp").convert("RGB")
    w, h = 1200, 630
    k = w / art.width
    art = art.resize((w, round(art.height * k)), Image.LANCZOS)
    top = max(0, round((art.height - h) * 0.62))
    im = art.crop((0, top, w, top + h)).convert("RGBA")
    shade = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shade)
    for x in range(w):
        sd.line([(x, 0), (x, h)], fill=(28, 23, 48, int(230 * max(0, 1 - x / 760))))
    im.alpha_composite(shade)
    d = ImageDraw.Draw(im)
    d.text((64, 190), "Casa Brasil", font=font(104), fill=(255, 195, 107, 255), stroke_width=5, stroke_fill=(51, 35, 26, 255))
    d.text((68, 330), "Sua casa, seu jardim, nossos bichos.", font=font(38), fill=CREAM + (255,))
    d.text((68, 392), "Um jogo que leva a família para fora de casa.", font=font(30), fill=CREAM + (255,))
    return im.convert("RGB")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    icon(192, 0.74, True).save(OUT / "icon-192.png", optimize=True)
    icon(512, 0.74, True).save(OUT / "icon-512.png", optimize=True)
    icon(512, 0.58, False).save(OUT / "maskable-512.png", optimize=True)  # full bleed, art inside the safe zone
    icon(180, 0.74, False).save(OUT / "apple-touch-icon.png", optimize=True)
    icon(32, 0.9, True).save(OUT / "favicon-32.png", optimize=True)
    share_image().save(ROOT / "public" / "og.jpg", quality=88, optimize=True)
    print("icons and og.jpg written")


if __name__ == "__main__":
    main()
