"""Generates the DEMO character sprite sheet (characters.png + characters.json atlas).

Original placeholder art. To swap in real art, replace characters.png/json with frames named
`<id>/<animation>/<n>` and keep characters.meta.json in sync; no code changes needed.
Run: python3 gen-characters.py
"""
import json, os
from PIL import Image, ImageDraw

OUT = os.path.dirname(__file__)
FW, FH, SS = 64, 80, 4  # frame size, supersampling

CHARS = {
    "nova": dict(body=(224, 136, 62), skin=(241, 194, 125), hair=(70, 45, 30), acc="hardhat"),
    "atlas": dict(body=(122, 90, 184), skin=(198, 134, 66), hair=(40, 28, 24), acc="glasses"),
    "pixel": dict(body=(217, 86, 143), skin=(255, 219, 172), hair=(120, 60, 40), acc="beret"),
    "echo": dict(body=(63, 168, 142), skin=(141, 85, 36), hair=(20, 20, 24), acc="headset"),
}

# pose: bob, legs (dy left, dy right), arms (hand dx,dy for left/right, relative to shoulder), tilt, mouth, prop
ANIMS = {
    "idle": dict(fps=3, frames=[dict(bob=0), dict(bob=1)]),
    "walk": dict(fps=8, frames=[
        dict(bob=0, legs=(-3, 3), arms=((-3, 8), (3, 10))),
        dict(bob=1, legs=(0, 0), arms=((0, 10), (0, 10))),
        dict(bob=0, legs=(3, -3), arms=((3, 10), (-3, 8))),
        dict(bob=1, legs=(0, 0), arms=((0, 10), (0, 10))),
    ]),
    "think": dict(fps=2, frames=[
        dict(bob=0, arms=((0, 10), (-8, -6)), tilt=2),
        dict(bob=1, arms=((0, 10), (-8, -7)), tilt=3),
    ]),
    "work": dict(fps=6, frames=[
        dict(bob=0, arms=((8, 4), (10, 3)), prop="laptop"),
        dict(bob=0, arms=((10, 3), (8, 4)), prop="laptop"),
    ]),
    "talk": dict(fps=4, frames=[
        dict(bob=0, arms=((0, 10), (11, -6)), mouth=1),
        dict(bob=1, arms=((0, 10), (12, -2)), mouth=0),
    ]),
    "tool": dict(fps=5, frames=[
        dict(bob=0, arms=((0, 10), (11, -8)), prop="wrench"),
        dict(bob=0, arms=((0, 10), (12, 0)), prop="wrench2"),
    ]),
    "success": dict(fps=4, frames=[
        dict(bob=-4, arms=((-9, -12), (9, -12)), mouth=1, legs=(0, 0)),
        dict(bob=0, arms=((-9, -9), (9, -9)), mouth=1),
    ]),
    "error": dict(fps=4, frames=[
        dict(bob=2, arms=((-5, -8), (5, -8)), tilt=-2, sad=1),
        dict(bob=2, arms=((-6, -7), (6, -7)), tilt=2, sad=1),
    ]),
}


def draw_frame(c, pose):
    im = Image.new("RGBA", (FW * SS, FH * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    s = lambda v: int(v * SS)

    def ell(x0, y0, x1, y1, fill, outline=None):
        d.ellipse([s(x0), s(y0), s(x1), s(y1)], fill=fill, outline=outline, width=s(0.8) if outline else 0)

    def rr(x0, y0, x1, y1, r, fill):
        d.rounded_rectangle([s(x0), s(y0), s(x1), s(y1)], radius=s(r), fill=fill)

    def limb(x0, y0, x1, y1, w, fill):
        d.line([s(x0), s(y0), s(x1), s(y1)], fill=fill, width=s(w))
        ell(x1 - w / 2, y1 - w / 2, x1 + w / 2, y1 + w / 2, fill)
        ell(x0 - w / 2, y0 - w / 2, x0 + w / 2, y0 + w / 2, fill)

    body, skin, hair = c["body"], c["skin"], c["hair"]
    dark = tuple(int(v * 0.72) for v in body)
    bob = pose.get("bob", 0)
    legs = pose.get("legs", (0, 0))
    arms = pose.get("arms", ((0, 10), (0, 10)))
    tilt = pose.get("tilt", 0)
    cx, ground = 32, 74

    ell(14, 68, 50, 78, (0, 0, 0, 55))  # soft contact shadow
    for i, off in enumerate(legs):  # legs
        x = cx - 8 + i * 12
        limb(x + 2, 58 + bob / 2, x + 2, ground - 4 + (off if off < 0 else 0), 6, (60, 66, 84))
        ell(x - 1, ground - 6 + (off if off < 0 else 0), x + 6, ground + 0 + (off if off < 0 else 0), (40, 44, 56))
    rr(cx - 12, 36 + bob, cx + 12, 62 + bob, 8, body)  # torso
    rr(cx - 12, 54 + bob, cx + 12, 62 + bob, 4, dark)
    # back arm then front arm
    for i, (dx, dy) in enumerate(arms):
        sx = cx - 12 + i * 24
        limb(sx, 42 + bob, sx + dx, 42 + bob + dy, 6, body if i == 0 else dark)
        ell(sx + dx - 3, 42 + bob + dy - 3, sx + dx + 3, 42 + bob + dy + 3, skin)

    prop = pose.get("prop")
    hx, hy = cx + arms[1][0], 42 + bob + arms[1][1]
    if prop == "laptop":
        rr(cx - 3, 50 + bob, cx + 20, 58 + bob, 2, (90, 98, 120))
        rr(cx + 4, 40 + bob, cx + 19, 52 + bob, 2, (200, 215, 235))
    if prop in ("wrench", "wrench2"):
        ex, ey = (hx + 6, hy - 10) if prop == "wrench" else (hx + 10, hy - 2)
        d.line([s(hx), s(hy), s(ex), s(ey)], fill=(170, 175, 185), width=s(2.4))
        ell(ex - 3, ey - 3, ex + 3, ey + 3, (170, 175, 185))

    # head
    hx0, hy0 = cx + tilt, 24 + bob
    ell(hx0 - 13, hy0 - 13, hx0 + 13, hy0 + 13, skin)
    ell(hx0 - 14, hy0 - 15, hx0 + 14, hy0 + 2, hair)  # hair cap
    ell(hx0 - 12, hy0 - 6, hx0 + 12, hy0 + 12, skin)  # face over hair
    eye = (35, 35, 45)
    ey = hy0 + 1
    ell(hx0 - 6, ey - 1.5, hx0 - 2.5, ey + 2.5, eye)
    ell(hx0 + 2.5, ey - 1.5, hx0 + 6, ey + 2.5, eye)
    if pose.get("sad"):
        d.line([s(hx0 - 4), s(hy0 + 8), s(hx0 + 4), s(hy0 + 8)], fill=eye, width=s(1))
    elif pose.get("mouth"):
        ell(hx0 - 2.5, hy0 + 6, hx0 + 2.5, hy0 + 10.5, (150, 50, 60))
    else:
        d.arc([s(hx0 - 4), s(hy0 + 3), s(hx0 + 4), s(hy0 + 10)], 20, 160, fill=eye, width=s(1))
    ell(hx0 - 9, hy0 + 4, hx0 - 5, hy0 + 7, (255, 150, 140, 110))
    ell(hx0 + 5, hy0 + 4, hx0 + 9, hy0 + 7, (255, 150, 140, 110))

    acc = c["acc"]
    if acc == "hardhat":
        ell(hx0 - 14, hy0 - 17, hx0 + 14, hy0 - 1, (245, 190, 40))
        rr(hx0 - 16, hy0 - 6, hx0 + 16, hy0 - 2, 2, (225, 165, 20))
    elif acc == "glasses":
        for ox in (-5, 5):
            d.ellipse([s(hx0 + ox - 4.5), s(ey - 3), s(hx0 + ox + 4.5), s(ey + 4.5)], outline=(40, 40, 60), width=s(1.1))
        d.line([s(hx0 - 1), s(ey), s(hx0 + 1), s(ey)], fill=(40, 40, 60), width=s(1))
    elif acc == "beret":
        ell(hx0 - 15, hy0 - 19, hx0 + 13, hy0 - 4, (240, 110, 165))
        ell(hx0 - 1, hy0 - 21, hx0 + 3, hy0 - 17, (240, 110, 165))
    elif acc == "headset":
        d.arc([s(hx0 - 15), s(hy0 - 17), s(hx0 + 15), s(hy0 + 11)], 180, 360, fill=(40, 48, 60), width=s(2.2))
        rr(hx0 - 16, hy0 - 3, hx0 - 11, hy0 + 6, 2, (40, 48, 60))
        rr(hx0 + 11, hy0 - 3, hx0 + 16, hy0 + 6, 2, (40, 48, 60))
        d.line([s(hx0 - 14), s(hy0 + 5), s(hx0 - 8), s(hy0 + 11)], fill=(40, 48, 60), width=s(1.2))
    return im.resize((FW, FH), Image.LANCZOS)


frames_out, meta_anims = {}, {}
sheet_w = FW * 8
rows = []
for cid, c in CHARS.items():
    for an, spec in ANIMS.items():
        for i, pose in enumerate(spec["frames"]):
            rows.append((f"{cid}/{an}/{i}", draw_frame(c, pose)))
        meta_anims[an] = dict(frames=len(spec["frames"]), fps=spec["fps"], loop=an not in ("success",))
per_row = sheet_w // FW
sheet = Image.new("RGBA", (sheet_w, ((len(rows) + per_row - 1) // per_row) * FH))
for i, (name, im) in enumerate(rows):
    x, y = (i % per_row) * FW, (i // per_row) * FH
    sheet.paste(im, (x, y))
    frames_out[name] = {"frame": {"x": x, "y": y, "w": FW, "h": FH}, "sourceSize": {"w": FW, "h": FH},
                        "spriteSourceSize": {"x": 0, "y": 0, "w": FW, "h": FH}}
sheet.save(os.path.join(OUT, "characters.png"), optimize=True)
json.dump({"frames": frames_out, "meta": {"image": "characters.png", "size": {"w": sheet.width, "h": sheet.height}}},
          open(os.path.join(OUT, "characters.json"), "w"), separators=(",", ":"))
print(len(rows), "frames", sheet.size)

ROLES = {"nova": ("Nova", "Engineering agent", "#e0883e"), "atlas": ("Atlas", "Research agent", "#7a5ab8"),
         "pixel": ("Pixel", "Creative agent", "#d9568f"), "echo": ("Echo", "Testing agent", "#3fa88e")}
json.dump({"characters": [dict(id=k, name=v[0], role=v[1], color=v[2]) for k, v in ROLES.items()],
           "animations": meta_anims, "frame": {"w": FW, "h": FH, "feetY": 74}},
          open(os.path.join(OUT, "characters.meta.json"), "w"), indent=1)
