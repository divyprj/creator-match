"""
Generates the Creator Match icon set from a single geometric definition.

The mark is an open ring with a node resting on its upper terminal: the ring is the field being
searched, the node is the one creator resolved out of it. It evolves the existing nav brand mark
(a ring containing a glowing violet dot) rather than replacing it.

Everything is drawn at 1024px and downsampled with LANCZOS, because PIL has no anti-aliased
primitives. Round line caps do not exist either, so terminals are drawn as explicit circles.

Outputs:
  public/icon.ico            favicon and app icon
  public/icon.png            512px raster for docs and social cards
  launchers/icons/<name>.ico one per launcher action, ring plus a centred action glyph

Run with: python scripts/generate-icons.py
"""

import math
from pathlib import Path

from PIL import Image, ImageDraw

S = 1024                      # working resolution
CENTER = (S // 2, S // 2)
RING_R = 272                  # ring radius
RING_W = 96                   # ring stroke width
NODE_R = 88                   # node radius
GLOW_R = 176
ARC_START, ARC_END = 55, 305  # degrees, clockwise from 3 o'clock, leaving a gap on the right

TILE_TOP = (23, 27, 36)
TILE_BOTTOM = (11, 14, 19)
ARC_FROM = (108, 92, 231)
ARC_TO = (157, 140, 255)
NODE_FILL = (195, 184, 255)

ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]

ROOT = Path(__file__).resolve().parent.parent


def polar(angle_deg, radius):
    a = math.radians(angle_deg)
    return CENTER[0] + radius * math.cos(a), CENTER[1] + radius * math.sin(a)


def linear_gradient(size, top, bottom, diagonal=True):
    """Vertical or diagonal two-stop gradient."""
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = ((x + y) / (2 * size)) if diagonal else (y / size)
            px[x, y] = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
    return img


def rounded_mask(size, radius):
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def ring_mask():
    """
    Open ring with circular terminals standing in for round line caps.

    PIL grows arc thickness inward from the bounding box, so the box radius is offset by half the
    stroke to put the centreline on RING_R. Without this the caps, which are centred on RING_R,
    protrude past the stroke and read as stray dots.
    """
    mask = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(mask)
    outer = RING_R + RING_W / 2
    d.arc(
        (CENTER[0] - outer, CENTER[1] - outer, CENTER[0] + outer, CENTER[1] + outer),
        ARC_START, ARC_END, fill=255, width=RING_W,
    )
    for angle in (ARC_START, ARC_END):
        cx, cy = polar(angle, RING_R)
        r = RING_W / 2
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
    return mask


def radial_glow(radius, colour):
    """Soft falloff drawn as concentric rings, since PIL has no radial gradient."""
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = polar(ARC_END, RING_R)
    steps = 48
    for i in range(steps, 0, -1):
        r = radius * i / steps
        alpha = int(150 * (1 - i / steps) ** 2)
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=colour + (alpha,))
    return layer


def base_tile():
    tile = linear_gradient(S, TILE_TOP, TILE_BOTTOM).convert("RGBA")
    tile.putalpha(rounded_mask(S, 224))

    # Hairline edge, the same one the app uses on panels.
    edge = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(edge).rounded_rectangle(
        (4, 4, S - 5, S - 5), radius=220, outline=(255, 255, 255, 26), width=6
    )
    return Image.alpha_composite(tile, edge)


def draw_mark(canvas, node_colour=NODE_FILL, glow_colour=(114, 92, 255)):
    arc_layer = linear_gradient(S, ARC_FROM, ARC_TO).convert("RGBA")
    arc_layer.putalpha(ring_mask())
    canvas = Image.alpha_composite(canvas, arc_layer)
    canvas = Image.alpha_composite(canvas, radial_glow(GLOW_R, glow_colour))

    node = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    cx, cy = polar(ARC_END, RING_R)
    ImageDraw.Draw(node).ellipse(
        (cx - NODE_R, cy - NODE_R, cx + NODE_R, cy + NODE_R), fill=node_colour + (255,)
    )
    return Image.alpha_composite(canvas, node)


def glyph_layer(action, colour):
    """Action glyph centred inside the ring. Kept to primitives so every shape stays crisp."""
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = CENTER
    c = colour + (255,)
    u = 74  # glyph unit

    if action == "run":
        d.polygon([(cx - u * 0.7, cy - u), (cx - u * 0.7, cy + u), (cx + u, cy)], fill=c)
    elif action in ("install", "update"):
        direction = 1 if action == "install" else -1
        d.rounded_rectangle(
            (cx - u * 0.26, cy - u * 0.95, cx + u * 0.26, cy + u * 0.35), radius=u * 0.26, fill=c
        )
        tip = cy + direction * u * 1.0
        d.polygon(
            [(cx - u * 0.78, cy + direction * u * 0.18), (cx + u * 0.78, cy + direction * u * 0.18), (cx, tip)],
            fill=c,
        )
        if action == "install":
            d.rounded_rectangle((cx - u, cy + u * 1.2, cx + u, cy + u * 1.45), radius=u * 0.12, fill=c)
    elif action == "stop":
        d.rounded_rectangle((cx - u * 0.8, cy - u * 0.8, cx + u * 0.8, cy + u * 0.8), radius=u * 0.22, fill=c)
    elif action == "repair":
        # Restore arc with an arrowhead: rolling back to a known good point.
        r = u * 0.85
        d.arc((cx - r, cy - r, cx + r, cy + r), 130, 40, fill=c, width=int(u * 0.34))
        d.polygon(
            [(cx + r * 0.28, cy - r * 1.30), (cx + r * 1.34, cy - r * 1.02), (cx + r * 0.62, cy - r * 0.30)],
            fill=c,
        )
    elif action == "uninstall":
        w = int(u * 0.32)
        for dx, dy in ((1, 1), (1, -1)):
            d.line((cx - u * 0.75 * dx, cy - u * 0.75 * dy, cx + u * 0.75 * dx, cy + u * 0.75 * dy), fill=c, width=w)
        r = w / 2
        for sx, sy in ((-1, -1), (-1, 1), (1, -1), (1, 1)):
            px, py = cx + u * 0.75 * sx, cy + u * 0.75 * sy
            d.ellipse((px - r, py - r, px + r, py + r), fill=c)
    return layer


def save_ico(canvas, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    frames = [canvas.resize((n, n), Image.LANCZOS) for n in ICO_SIZES]
    frames[-1].save(path, format="ICO", sizes=[(n, n) for n in ICO_SIZES], append_images=frames[:-1])


ACTIONS = {
    "run": (61, 220, 151),
    "install": (157, 140, 255),
    "update": (90, 200, 250),
    "stop": (255, 107, 94),
    "repair": (255, 182, 92),
    "uninstall": (255, 77, 77),
}


def main():
    brand = draw_mark(base_tile())
    save_ico(brand, ROOT / "public" / "icon.ico")
    brand.resize((512, 512), Image.LANCZOS).save(ROOT / "public" / "icon.png")
    print("wrote public/icon.ico and public/icon.png")

    for action, colour in ACTIONS.items():
        canvas = draw_mark(base_tile(), node_colour=colour, glow_colour=colour)
        canvas = Image.alpha_composite(canvas, glyph_layer(action, colour))
        save_ico(canvas, ROOT / "launchers" / "icons" / f"{action}.ico")
        print(f"wrote launchers/icons/{action}.ico")


if __name__ == "__main__":
    main()
