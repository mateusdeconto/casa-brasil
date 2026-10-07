"""Debug contact sheets: every cut item on a checkerboard with its name."""
from pathlib import Path

from PIL import Image, ImageDraw

TILE = 220


def _checker(w: int, h: int) -> Image.Image:
    im = Image.new("RGBA", (w, h), (200, 200, 200, 255))
    d = ImageDraw.Draw(im)
    for y in range(0, h, 16):
        for x in range(0, w, 16):
            if (x // 16 + y // 16) % 2:
                d.rectangle([x, y, x + 15, y + 15], fill=(150, 150, 150, 255))
    return im


def contact_sheet(tiles: list[tuple[str, Image.Image]], path: Path) -> None:
    cols = min(len(tiles), 5)
    rows = -(-len(tiles) // cols)
    sheet = Image.new("RGBA", (cols * TILE, rows * (TILE + 24)), (28, 23, 48, 255))
    d = ImageDraw.Draw(sheet)
    for i, (name, im) in enumerate(tiles):
        x, y = (i % cols) * TILE, (i // cols) * (TILE + 24)
        bg = _checker(TILE - 8, TILE - 8)
        th = im.copy()
        th.thumbnail((TILE - 16, TILE - 16))
        bg.alpha_composite(th, ((bg.width - th.width) // 2, (bg.height - th.height) // 2))
        sheet.paste(bg, (x + 4, y + 4))
        d.text((x + 6, y + TILE + 4), f"{name} {im.width}x{im.height}", fill=(241, 221, 176, 255))
    sheet.convert("RGB").save(path)
