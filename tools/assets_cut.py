"""Chroma-key removal and connected-component cutting (Pillow + numpy only)."""
from collections import deque

import numpy as np
from PIL import Image, ImageDraw

DOWN = 4  # component labeling runs on a 4x downsampled mask


def key_magenta(rgb: np.ndarray, tol: float = 70.0) -> np.ndarray:
    """Return RGBA float array with magenta removed and edges despilled."""
    f = rgb.astype(np.float32)
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    border = np.concatenate([f[:6].reshape(-1, 3), f[-6:].reshape(-1, 3)])
    bg = np.median(border[(border[:, 0] > 150) & (border[:, 2] > 150)], axis=0)
    dist = np.sqrt(((f - bg) ** 2).sum(-1))
    # "magenta-ness": both red and blue well above green
    k = np.minimum(r, b) - g
    alpha = 1.0 - np.clip((k - 55.0) / (190.0 - 55.0), 0, 1)
    alpha[dist < tol] = 0.0
    a = np.maximum(alpha, 1e-3)[..., None]
    col = np.clip((f - (1 - a) * bg) / a, 0, 255)
    # residual spill: pull red/blue down toward the other channels
    spill = np.clip(np.minimum(col[..., 0], col[..., 2]) - col[..., 1] - 40, 0, None)
    soft = (alpha < 0.98)
    col[..., 0] -= spill * soft
    col[..., 2] -= spill * soft
    alpha[alpha < 0.08] = 0.0
    return np.dstack([np.clip(col, 0, 255), alpha * 255])


def flood_bg(img: Image.Image, tol: int = 14) -> Image.Image:
    """Make the background transparent by flood fill from the 4 corners."""
    rgba = img.convert("RGBA")
    w, h = rgba.size
    for xy in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if rgba.getpixel(xy)[3] != 0:
            ImageDraw.floodfill(rgba, xy, (0, 0, 0, 0), thresh=tol)
    return rgba


def _dilate(m: np.ndarray, r: int) -> np.ndarray:
    out = m.copy()
    for _ in range(r):
        n = out.copy()
        n[1:] |= out[:-1]; n[:-1] |= out[1:]
        n[:, 1:] |= out[:, :-1]; n[:, :-1] |= out[:, 1:]
        out = n
    return out


def _label(m: np.ndarray) -> np.ndarray:
    lab = np.zeros(m.shape, np.int32)
    h, w = m.shape
    cur = 0
    for y0, x0 in zip(*np.nonzero(m)):
        if lab[y0, x0]:
            continue
        cur += 1
        lab[y0, x0] = cur
        q = deque([(y0, x0)])
        while q:
            y, x = q.popleft()
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and m[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = cur
                    q.append((ny, nx))
    return lab


def components(alpha: np.ndarray, radius: int, min_px: int = 300) -> list[dict]:
    """Group opaque pixels; pieces closer than ~2*radius px are fused."""
    mask = alpha > 128
    h, w = mask.shape
    H, W = -(-h // DOWN), -(-w // DOWN)
    pad = np.zeros((H * DOWN, W * DOWN), bool)
    pad[:h, :w] = mask
    small = pad.reshape(H, DOWN, W, DOWN).any(axis=(1, 3))
    lab_small = _label(_dilate(small, max(1, radius // DOWN)))
    lab = np.repeat(np.repeat(lab_small, DOWN, 0), DOWN, 1)[:h, :w] * (alpha > 0)
    comps = []
    for i in range(1, lab_small.max() + 1):
        ys, xs = np.nonzero(lab == i)
        if len(xs) < min_px:
            continue
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        if x0 <= 3 or y0 <= 3 or x1 >= w - 3 or y1 >= h - 3:
            continue  # sheet frame / edge garbage
        comps.append({"ids": [i], "box": [x0, y0, x1, y1], "px": len(xs)})
    return comps, lab


def _gap(a, b) -> float:
    dx = max(0, max(a[0], b[0]) - min(a[2], b[2]))
    dy = max(0, max(a[1], b[1]) - min(a[3], b[3]))
    return float(np.hypot(dx, dy))


def merge_to(comps: list[dict], n: int) -> list[dict]:
    """Fold the smallest pieces into their nearest neighbour until n remain."""
    comps = [dict(c) for c in comps]
    while len(comps) > n:
        s = min(range(len(comps)), key=lambda i: comps[i]["px"])
        c = comps.pop(s)
        t = min(comps, key=lambda o: _gap(o["box"], c["box"]))
        t["ids"] = t["ids"] + c["ids"]
        t["px"] += c["px"]
        t["box"] = [min(t["box"][0], c["box"][0]), min(t["box"][1], c["box"][1]),
                    max(t["box"][2], c["box"][2]), max(t["box"][3], c["box"][3])]
    return comps


def find_items(alpha: np.ndarray, expected: int, radius: int = 25):
    """Try the requested fuse radius; shrink it if items got glued together."""
    for r in (radius, 18, 12, 8, 4):
        comps, lab = components(alpha, r)
        if len(comps) >= expected:
            return merge_to(comps, expected), lab, r
    raise RuntimeError(f"found {len(comps)} items, expected {expected}")


def crop(rgba: np.ndarray, lab: np.ndarray, comp: dict, margin: int = 4, max_side: int = 1024) -> Image.Image:
    x0, y0, x1, y1 = comp["box"]
    keep = np.isin(lab[y0:y1, x0:x1], comp["ids"])
    part = rgba[y0:y1, x0:x1].copy()
    part[..., 3] *= keep
    h, w = part.shape[:2]
    out = np.zeros((h + 2 * margin, w + 2 * margin, 4), np.uint8)
    out[margin:margin + h, margin:margin + w] = part.round().astype(np.uint8)
    im = Image.fromarray(out, "RGBA")
    if max(im.size) > max_side:
        s = max_side / max(im.size)
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    return im
