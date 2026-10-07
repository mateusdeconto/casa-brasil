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
    art = Image.open(find("logo")).convert("RGBA")
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
    """Landscape card cut from the portrait cover (the title is painted into the art)."""
    art = Image.open(ASSETS / "abertura.webp").convert("RGB")
    w, h = 1200, 630
    k = w / art.width
    art = art.resize((w, round(art.height * k)), Image.LANCZOS)
    top = round(art.height * 0.125)  # the Passport sign
    return art.crop((0, top, w, top + h))


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
