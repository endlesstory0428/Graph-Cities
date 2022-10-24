import sys
import json
from math import pi, log2


def hue2rgb(p, q, t):
    if t < 0: t += 1
    if t > 1: t -= 1
    if t < 1 / 6: return p + (q - p) * 6 * t
    if t < 1 / 2: return q
    if t < 2 / 3: return p + (q - p) * (2 / 3 - t) * 6
    return p


def hslToRgb(h, s, l):
    r = g = b = l

    if s != 0:
        q = l * (1 + s) if l < 0.5 else l + s - l * s
        p = 2 * l - q
        r = hue2rgb(p, q, h + 1 / 3)
        g = hue2rgb(p, q, h)
        b = hue2rgb(p, q, h - 1 / 3)

    return [round(r * 255), round(g * 255), round(b * 255)]


def frustumHeight(volume, r_upper, r_lower):
    return 3 * volume / (pi * (r_upper**2 + r_upper * r_lower + r_lower**2))


with open(sys.argv[1]) as f:
    data = json.load(f)

try:
    floorfile = open(sys.argv[2], 'w')  # index, height, radius
except Exception:
    floorfile = sys.stdout

try:
    colorfile = open(sys.argv[3], 'w')  # index1, index2, red, green, blue
except Exception:
    colorfile = sys.stdout

floor = 0
accum_height = 0
for w in range(1, len(data) + 1):
    info = data[str(w)]
    if sum(info.values()) == 0:
        continue

    volume = log2(info[f'e->w{w+1}'] + 1) if w < len(data) else log2(info['ie'] + 1)
    r_lower = info['s']
    r_upper = info['t']
    h = frustumHeight(volume, r_upper, r_lower)
    print(floor, accum_height, r_lower, file=floorfile)

    v = info['ss']
    ie = info['ie']
    dense_disc = 2 * ie / float(v * (v - 1)) if ie > 0 else 0
    color_disc = hslToRgb(dense_disc, 0.85, 0.5)
    print(floor, floor, 'disc', *color_disc, file=colorfile)

    if w < len(data):
        e2n = info[f'e->w{w+1}']
        vn = data[str(w + 1)]['ss']
        dense_inner = 2 * e2n / float(v * vn) if e2n > 0 else 0
        color_inner = hslToRgb(dense_inner, 0.85, 0.5)
        print(floor, floor + 1, 'inner', *color_inner, file=colorfile)

    vo = info['t']
    ee = info['ee']
    dense_outer = 2 * ee / float(v * vo) if ee > 0 else 0
    color_outer = hslToRgb(dense_outer, 0.85, 0.5)
    print(floor, floor + 1, 'outer', *color_outer, file=colorfile)

    accum_height += h
    floor += 1
    print(floor, accum_height, r_upper, file=floorfile)

if floorfile is not sys.stdout:
    floorfile.close()
if colorfile is not sys.stdout:
    colorfile.close()
