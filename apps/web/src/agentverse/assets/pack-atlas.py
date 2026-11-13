"""Packs the Kenney sprites Agentverse uses into one atlas (atlas.png + atlas.json).

Raw packs stay in assets/3d-assets (not committed); only the packed output is.
Run: python3 pack-atlas.py [raw_dir]
"""
import json, os, sys
from PIL import Image

RAW = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "../../../../../assets/3d-assets")
OUT = os.path.dirname(__file__)

land = ["waterNE", "waterES", "waterNW", "waterSW", "grass", "grassWhole", "dirt", "water", "road", "roadEW", "roadNS", "roadES", "roadNE", "roadNW", "roadSW",
        "crossroad", "crossroadESW", "crossroadNES", "crossroadNEW", "crossroadNSW", "endE", "endN", "endS", "endW",
        "treeTall", "treeShort", "treeAltTall", "treeAltShort", "coniferTall", "coniferShort", "coniferAltTall", "coniferAltShort"]
city = [66, 72, 74, 67, 43, 59, 76, 51, 53, 61, 62, 68, 69, 75, 83, 44, 36, 54]
build = [1, 2, 3, 4, 9, 10, 14, 18, 20, 21, 22, 25, 26, 30, 34, 36, 40, 41, 46, 92, 93, 99, 100, 101, 106, 107, 108, 113, 114, 115, 116, 117, 122, 123, 124, 125]
roof = [62, 65, 69, 74, 76, 81, 82, 88, 90, 96]
detail = [0, 5, 6, 10]

items = [(n, f"png/{n}.png") for n in land]
items += [(f"c{i:03d}", f"PNG/cityTiles_{i:03d}.png") for i in city]
items += [(f"b{i:03d}", f"PNG/buildingTiles_{i:03d}.png") for i in build]
items += [(f"b{i:03d}", f"PNG/buildingTiles_{i:03d}.png") for i in roof]
items += [(f"d{i:03d}", f"Details/cityDetails_{i:03d}.png") for i in detail]

imgs = [(n, Image.open(os.path.join(RAW, p)).convert("RGBA")) for n, p in items]
imgs.sort(key=lambda t: -t[1].height)
W = 1024
x = y = row_h = 0
placed = []
for n, im in imgs:
    if x + im.width + 2 > W:
        x, y, row_h = 0, y + row_h + 2, 0
    placed.append((n, im, x, y))
    x += im.width + 2
    row_h = max(row_h, im.height)
H = y + row_h
sheet = Image.new("RGBA", (W, H))
frames = {}
for n, im, px, py in placed:
    sheet.paste(im, (px, py))
    w, h = im.size
    frames[n] = {"frame": {"x": px, "y": py, "w": w, "h": h}, "sourceSize": {"w": w, "h": h},
                 "spriteSourceSize": {"x": 0, "y": 0, "w": w, "h": h}}
sheet.save(os.path.join(OUT, "atlas.png"), optimize=True)
json.dump({"frames": frames, "meta": {"image": "atlas.png", "size": {"w": W, "h": H}}},
          open(os.path.join(OUT, "atlas.json"), "w"), separators=(",", ":"))
print(len(frames), "sprites", W, "x", H)
