import sys
from litemapy import Schematic

s = Schematic.load(sys.argv[1])
print("loaded:", getattr(s, "name", "?"))
print("regions:", list(s.regions.keys()))
for name, reg in s.regions.items():
    w, h, l = abs(reg.width), abs(reg.height), abs(reg.length)
    print(f"  region '{name}': {w} x {h} x {l}")
    pal = {}
    nonair = 0
    for x in range(w):
        for y in range(h):
            for z in range(l):
                b = reg[x, y, z]
                bid = getattr(b, "id", None) or getattr(b, "blockid", None) or str(b)
                pal[bid] = pal.get(bid, 0) + 1
                if "air" not in bid:
                    nonair += 1
    print(f"  non-air: {nonair}, distinct ids: {len(pal)}")
    top = sorted(pal.items(), key=lambda kv: -kv[1])[:6]
    print("  top blocks:", top)
print("VALIDATION OK")
