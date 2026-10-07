"""Build public/assets/* and src/data/manifest.json from assets/raw. Run: npm run assets."""
import json
import re
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from assets_cut import crop, find_items, flood_bg, key_magenta  # noqa: E402
from contact import contact_sheet  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "assets" / "raw"
OUT = ROOT / "public" / "assets"
DEBUG = ROOT / "debug"
MANIFEST = ROOT / "src" / "data" / "manifest.json"

# order: "x" = left to right; "rows" = split by y into rows of the given sizes, each left to right
SHEETS = {
    6: dict(order="x", names=["avatar_front_right", None, "avatar_back", None]),
    7: dict(order="x", names=["pose_idle", "pose_walk1", "pose_walk2", "pose_walk3", "pose_collect", "pose_celebrate"]),
    8: dict(order="rows", rows=[4, 4], names=[f"avatar_{i}" for i in range(1, 9)]),
    9: dict(order="rows", rows=[2, 2], names=["bed", "sofa", "table", "bookshelf"]),
    10: dict(order="rows", rows=[3, 2], names=["plant", "lamp", "rug", "dresser", "armchair"]),
    11: dict(order="x", names=["hammock", "cobogo", "guitar", "vitrine", "palm"]),
    12: dict(order="rows", rows=[4, 2], names=["wall_frame_a", "wall_clock", "wall_window", "wall_door", "wall_frame_b", "wall_shelf"]),
    13: dict(order="rows", rows=[3, 3, 3], names=[f"{a}_{p}" for a in ("capybara", "toucan", "tamarin") for p in ("idle1", "idle2", "sleep")]),
    14: dict(order="rows", rows=[2, 3], names=["jaguar", None, "fossil", "vase", "meteorite"]),
    19: dict(order="rows", rows=[3, 5, 6], names=["panel_a", "panel_b", "coin", "nav_home", "nav_garden", "nav_shop", "nav_edit", "nav_avatar",
                                                 "arrow_left", "arrow_right", "star", "trophy", "lock", "coin_bubble"]),
}
BASES = {3: "room", 5: "garden"}
OPENING = 20


def raw_file(n: int) -> Path:
    """'N.png', 'N (1).png', 'N (2).png'... -> largest image, then newest."""
    pat = re.compile(rf"^{n}( \(\d+\))?\.png$", re.I)
    files = [p for p in RAW.iterdir() if pat.match(p.name)]
    if not files:
        raise FileNotFoundError(f"assets/raw: missing image {n}")

    def rank(p: Path):
        with Image.open(p) as im:
            return (im.width * im.height, p.stat().st_mtime)
    return max(files, key=rank)


def ordered(comps: list[dict], rule: dict) -> list[dict]:
    cx = lambda c: (c["box"][0] + c["box"][2]) / 2  # noqa: E731
    cy = lambda c: (c["box"][1] + c["box"][3]) / 2  # noqa: E731
    if rule["order"] == "x":
        return sorted(comps, key=cx)
    out, rest = [], sorted(comps, key=cy)
    for size in rule["rows"]:
        out += sorted(rest[:size], key=cx)
        rest = rest[size:]
    return out


def silhouette(im: Image.Image) -> Image.Image:
    """Opaque pixels -> #2A2233 with a soft lighter outline."""
    a = np.array(im)[..., 3]
    solid = a > 100
    ring = solid.copy()
    for _ in range(3):
        n = ring.copy()
        n[1:] |= ring[:-1]; n[:-1] |= ring[1:]; n[:, 1:] |= ring[:, :-1]; n[:, :-1] |= ring[:, 1:]
        ring = n
    out = np.zeros(a.shape + (4,), np.uint8)
    out[ring & ~solid] = (0x6B, 0x5C, 0x86, 170)
    out[solid] = (0x2A, 0x22, 0x33, 255)
    return Image.fromarray(out, "RGBA")


def save(im: Image.Image, name: str, sheet: int, items: dict, sub: str = "items") -> None:
    rel = f"assets/{sub}/{name}.png"
    (OUT / sub).mkdir(parents=True, exist_ok=True)
    im.save(OUT / sub / f"{name}.png", optimize=True)
    items[name] = {"file": rel, "w": im.width, "h": im.height, "sheet": sheet}


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    DEBUG.mkdir(exist_ok=True)
    items, bases, report = {}, {}, []

    for n, name in BASES.items():
        src = raw_file(n)
        im = flood_bg(Image.open(src))
        sw, sh = im.size
        if max(im.size) > 1024:
            s = 1024 / max(im.size)
            im = im.resize((round(sw * s), round(sh * s)), Image.LANCZOS)
        im.save(OUT / f"{name}.png", optimize=True)
        bases[name] = {"file": f"assets/{name}.png", "w": im.width, "h": im.height, "srcW": sw, "srcH": sh}
        report.append(f"{n}: {src.name} -> {name}")

    for n, rule in SHEETS.items():
        src = raw_file(n)
        rgba = key_magenta(np.array(Image.open(src).convert("RGB")))
        comps, lab, r = find_items(rgba[..., 3], len(rule["names"]))
        tiles = []
        for comp, name in zip(ordered(comps, rule), rule["names"]):
            if name is None:
                continue
            im = crop(rgba, lab, comp)
            save(im, name, n, items)
            tiles.append((name, im))
            if name == "jaguar":
                sil = silhouette(im)
                save(sil, "jaguar_silhouette", n, items)
                tiles.append(("jaguar_silhouette", sil))
        contact_sheet(tiles, DEBUG / f"contact_{n}.png")
        report.append(f"{n}: {src.name} -> {len(tiles)} itens (raio {r})")

    shutil.copy(raw_file(OPENING), OUT / "abertura.png")
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps({"bases": bases, "items": items, "opening": "assets/abertura.png"}, indent=1))
    total = sum(p.stat().st_size for p in OUT.rglob("*.png")) / 1e6
    print("\n".join(report))
    print(f"total public/assets: {total:.1f} MB")
    if total > 20:
        raise SystemExit("assets above 20 MB")


if __name__ == "__main__":
    main()
