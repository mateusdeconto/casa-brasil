"""Grow the house picture from 4x4 to 5x5 or 6x6 cells by repeating one cell of floor and wall.

The room art is flat and repetitive: planks run along grid x with a seam every third of a cell, the walls are plain
stucco with a rail and a baseboard. Cutting along a grid line and repeating a one-cell tile keeps all of that.
  * floor: tiles along x (across planks) and along y (between two plank seams exactly one cell apart)
  * right wall: tile along x in the plain stretch next to the corner (the window stays where it is)
  * left wall: tile along y in the plain stretch (the door stays where it is)
Everything after the tile moves down the room by the inserted cells. Used by tools/process_assets.py.
"""
import numpy as np
from PIL import Image

TILE = 1.0  # cells
WALL_R_TILE = 0.08  # plain right wall before the window
WALL_L_TILE = 0.45  # plain left wall before the door
FLOOR_X_TILE = 0.5  # planks are long: any cut across them works
FLOOR_Y_NEAR = 1.31  # a plank seam; the one a cell further must be a seam too


def _rows_seam(src: np.ndarray, back, ex, ey, near: float) -> float:
    """Exact grid y of the plank seam closest to `near` (seams are the darkest rows of the unwarped floor)."""
    gray = src[..., :3].mean(-1)
    ys = np.arange(near - 0.12, near + 0.12, 0.005)
    xs = np.arange(0.8, 3.2, 0.05)
    best, best_v = near, 1e9
    for gy in ys:
        v = np.median([gray[int(round(back[1] + gx * ex[1] + gy * ey[1])), int(round(back[0] + gx * ex[0] + gy * ey[0]))] for gx in xs])
        if v < best_v:
            best, best_v = gy, v
    return float(best)


def grow(src_img: Image.Image, cal: dict, extra: int) -> tuple[Image.Image, dict]:
    """`extra` more cells along x and along y (1 -> 5x5, 2 -> 6x6). Returns the bigger RGBA picture and its calibration."""
    src = np.array(src_img.convert("RGBA"))
    h, w = src.shape[:2]
    n0 = cal["cells"]
    back = np.array(cal["back"], float)
    u = (np.array(cal["right"], float) - back) / n0  # one cell along grid x (down-right)
    v = (np.array(cal["left"], float) - back) / n0  # one cell along grid y (down-left)
    ui, vi = np.rint(u).astype(int), np.rint(v).astype(int)
    seam = _rows_seam(src, back, u, v, FLOOR_Y_NEAR)

    ox = int(round(extra * -v[0]))  # the left corner moves left
    oy = 40
    W = w + ox + int(round(extra * u[0])) + 20
    H = h + oy + int(round(extra * (u[1] + v[1]))) + 20
    B = back + (ox, oy)

    dy, dx = np.mgrid[0:H, 0:W]
    px = dx - B[0]
    py = dy - B[1]
    det = u[0] * v[1] - u[1] * v[0]
    gx = (px * v[1] - py * v[0]) / det  # grid coordinates of the floor plane through each pixel
    gy = (u[0] * py - u[1] * px) / det
    slope_r = u[1] / u[0]
    slope_l = v[1] / -v[0]
    wall_r = (px > 0) & (py < px * slope_r)
    wall_l = (px <= 0) & (py < -px * slope_l)
    gwx = px / u[0]  # position along the right wall
    gwy = -px / -v[0] * 1.0  # position along the left wall (positive to the left)

    def count(g: np.ndarray, start: float) -> np.ndarray:
        """How many inserted tiles lie before each position (0..extra)."""
        return np.clip(np.floor(g - start), 0, extra).astype(int)

    nx = np.where(wall_r, count(gwx, WALL_R_TILE), np.where(wall_l, 0, count(gx, FLOOR_X_TILE)))
    ny = np.where(wall_l, count(gwy, WALL_L_TILE), np.where(wall_r, 0, count(gy, seam)))
    sx = dx - ox - nx * ui[0] - ny * vi[0]
    sy = dy - oy - nx * ui[1] - ny * vi[1]
    ok = (sx >= 0) & (sx < w) & (sy >= 0) & (sy < h)
    out = np.zeros((H, W, 4), np.uint8)
    out[ok] = src[sy[ok], sx[ok]]

    n = n0 + extra
    new_cal = {
        "image": cal["image"],
        "cells": n,
        "back": [int(B[0]), int(B[1])],
        "right": [int(round(B[0] + n * u[0])), int(round(B[1] + n * u[1]))],
        "left": [int(round(B[0] + n * v[0])), int(round(B[1] + n * v[1]))],
    }
    ys, xs = np.nonzero(out[..., 3] > 10)
    new_cal["view"] = [int(xs.min()) - 12, int(ys.min()) + 100, int(xs.max()) + 12, int(ys.max()) - 40]
    return Image.fromarray(out, "RGBA"), new_cal
