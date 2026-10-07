"""Build public/assets/* and src/data/manifest.json from assets/raw. Run: npm run assets."""
import json
import re
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from assets_cut import crop, find_items, flood_bg, key_flat, key_magenta  # noqa: E402
from contact import contact_sheet  # noqa: E402
from grow_room import grow  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "assets" / "raw"
OUT = ROOT / "public" / "assets"
DEBUG = ROOT / "debug"
MANIFEST = ROOT / "src" / "data" / "manifest.json"
CALIBRATION = ROOT / "src" / "data" / "calibration.json"

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
    30: dict(order="rows", rows=[6, 6], names=[f"stamp_{k}{suf}" for suf in ("", "_locked") for k in ("zoo", "museu", "parque", "ciencia", "evento", "historico")]),
    31: dict(order="rows", rows=[3, 3], names=[f"badge_{k}" for k in ("biodiversidade", "arte", "parque", "ciencia", "primeira_visita", "familia")]),
    32: dict(order="rows", rows=[4, 4, 4, 4], names=["camera", "mappin", "calendar", "family", "school", "shield_parent", "qr", "check",
                                                    "clipboard", "notebook", "bell", "gear", "ribbon_demo", "ribbon_limited", "polaroid", "signboard"]),
    33: dict(order="rows", rows=[2, 3], names=["trophy_owl", "star_award", "vitrine_mapa", "vaso_planta", "lantern"]),
    34: dict(order="rows", rows=[3, 3, 3], names=[f"{a}_{p}" for a in ("arara", "jabuti", "lobo") for p in ("idle1", "idle2", "sleep")]),
    # 2026-10-07 batch: these replace guitar/vitrine (sheet 11) and the old single jaguar picture
    35: dict(order="x", names=["guitar", "vitrine"]),
    36: dict(order="rows", rows=[3, 3], names=["tamarin_sleep", "tamarin_idle1", "tamarin_idle2", "jaguar_idle1", "jaguar_idle2", "jaguar_sleep"]),
    # museum pieces for the gallery (flat taupe/beige background instead of magenta)
    37: dict(order="x", key="flat", names=["dino_raptor", "dino_trice", "dino_trex"]),
    42: dict(order="rows", rows=[2, 2], key="flat", names=["painting_dama", "painting_noite", "painting_perola", "painting_onda"]),
}
# number -> (name, how the background goes away)
BASES = {3: ("room", "flood"), 5: ("garden", "magenta"), 38: ("gallery", "flood")}
# whole pictures shown in <img> tags: number -> (item name, max side)
PICTURES = {39: ("logo", 512), 40: ("place_zoo", 720), 41: ("place_parque", 720)}
OPENING = RAW / "capa.png"  # portrait cover with the game title painted into it


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


def write_both(im: Image.Image, path_no_ext: Path) -> None:
    """WebP (what browsers load) plus a small 256-colour PNG fallback for browsers without WebP."""
    path_no_ext.parent.mkdir(parents=True, exist_ok=True)
    rgba = im.convert("RGBA")
    rgba.save(path_no_ext.with_suffix(".webp"), "WEBP", quality=92, method=4)
    rgba.quantize(256, method=Image.Quantize.FASTOCTREE).save(path_no_ext.with_suffix(".png"), optimize=True)


def add_base(im: Image.Image, name: str, bases: dict) -> None:
    """A whole-scene picture (house, garden...): kept at full size in the manifest, shipped at most 1024 px on the long side."""
    sw, sh = im.size
    if max(im.size) > 1024:
        s = 1024 / max(im.size)
        im = im.resize((round(sw * s), round(sh * s)), Image.LANCZOS)
    write_both(im, OUT / name)
    bases[name] = {"file": f"assets/{name}.webp", "w": im.width, "h": im.height, "srcW": sw, "srcH": sh}


def save(im: Image.Image, name: str, sheet: int, items: dict, sub: str = "items") -> None:
    write_both(im, OUT / sub / name)
    items[name] = {"file": f"assets/{sub}/{name}.webp", "w": im.width, "h": im.height, "sheet": sheet}


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    DEBUG.mkdir(exist_ok=True)
    items, bases, report = {}, {}, []

    for n, (name, mode) in BASES.items():
        src = raw_file(n)
        if mode == "magenta":
            im = Image.fromarray(key_magenta(np.array(Image.open(src).convert("RGB"))).round().astype(np.uint8), "RGBA")
        else:
            im = flood_bg(Image.open(src))
        if name == "room":
            room_full = im
        add_base(im, name, bases)
        report.append(f"{n}: {src.name} -> {name}")

    # the house can grow to 5x5 and 6x6 cells: the same floor and walls, repeated (tools/grow_room.py)
    calibration = json.loads(CALIBRATION.read_text())
    for extra in (1, 2):
        grown, cal = grow(room_full, calibration["room"], extra)
        name = f"room{calibration['room']['cells'] + extra}"
        calibration[name] = {**cal, "image": name}
        add_base(grown, name, bases)
        report.append(f"grow: room + {extra} -> {name} {grown.size}")
    CALIBRATION.write_text(json.dumps(calibration, indent=2))

    for n, rule in SHEETS.items():
        src = raw_file(n)
        keyer = key_flat if rule.get("key") == "flat" else key_magenta
        rgba = keyer(np.array(Image.open(src).convert("RGB")))
        comps, lab, r = find_items(rgba[..., 3], len(rule["names"]))
        tiles = []
        for comp, name in zip(ordered(comps, rule), rule["names"]):
            if name is None:
                continue
            im = crop(rgba, lab, comp)
            save(im, name, n, items)
            tiles.append((name, im))
            if name in ("jaguar", "jaguar_idle1"):
                sil = silhouette(im)
                save(sil, "jaguar_silhouette", n, items)
                tiles.append(("jaguar_silhouette", sil))
        contact_sheet(tiles, DEBUG / f"contact_{n}.png")
        report.append(f"{n}: {src.name} -> {len(tiles)} itens (raio {r})")

    for n, (name, side) in PICTURES.items():
        pic = Image.open(raw_file(n)).convert("RGBA")
        if name == "logo":
            pic = flood_bg(pic, 40)  # sticker on a dark plate: drop the plate
        k = side / max(pic.size)
        pic = pic.resize((round(pic.width * k), round(pic.height * k)), Image.LANCZOS)
        save(pic, name, n, items)
        report.append(f"{n}: -> {name}")
    write_both(Image.open(OPENING), OUT / "abertura")
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps({"bases": bases, "items": items, "opening": "assets/abertura.webp"}, indent=1))
    total = sum(p.stat().st_size for p in OUT.rglob("*") if p.is_file()) / 1e6
    webp = sum(p.stat().st_size for p in OUT.rglob("*.webp")) / 1e6
    print("\n".join(report))
    print(f"total public/assets: {total:.1f} MB (webp {webp:.1f} MB + png fallback {total - webp:.1f} MB)")
    if total > 24:
        raise SystemExit("assets above 24 MB")


if __name__ == "__main__":
    main()
