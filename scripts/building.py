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

num_waves = (len(data) + 1) // 2
# max_vertices = max(data.values(), key=lambda x: x['vertices'])['vertices']
# min_vertices = min(data.values(), key=lambda x: x['vertices'])['vertices']

# if max_vertices / min_vertices > 100:
for w, s in data.items():
    data[w]['vertices'] = log2(s['vertices'])

floor = 0
accum_height = 0
for i in range(1, num_waves + 1):
    Volume = log2(data[str(i)]['edges'])
    H = 0
    r_upper = 0
    r_middle = 0
    r_lower = 0
    if num_waves == 1:
        color = hslToRgb(0, 0.85, 0.5)
    else:
        color = hslToRgb((1 - (i - 1.01) / (num_waves - 1.01)) * 0.6, 0.85, 0.5)

    if i == 1:
        r_upper = data[str(i) + '_' + str(i + 1)]['vertices']
        r_middle = data[str(i)]['vertices']
        if r_upper == r_middle:
            r_upper -= 0.01
        H = 3 * (Volume) / (
            pi * ((r_upper * r_upper + r_upper * r_middle + r_middle * r_middle))
        )
        print(floor, accum_height, r_middle, file=floorfile)
        accum_height += H
        floor += 1
        print(floor - 1, floor, *color, file=colorfile)
    elif i == num_waves:
        r_middle = data[str(i)]['vertices']
        r_lower = data[str(i - 1) + '_' + str(i)]['vertices']
        if r_lower == r_middle:
            r_lower -= 0.01
        H = 3 * (Volume) / (
            pi * ((r_middle * r_middle + r_middle * r_lower + r_lower * r_lower))
        )
        print(floor, accum_height, r_lower, file=floorfile)
        accum_height += H
        floor += 1
        print(floor - 1, floor, *color, file=colorfile)
        print(floor, accum_height, r_middle, file=floorfile)
    else:
        r_upper = data[str(i) + '_' + str(i + 1)]['vertices']
        r_middle = data[str(i)]['vertices']
        r_lower = data[str(i - 1) + '_' + str(i)]['vertices']
        if r_upper == r_middle: r_middle -= 0.01
        if r_middle == r_lower: r_lower -= 0.01
        if r_lower == r_upper: r_lower -= 0.02
        H = 3 * (Volume) / (
            pi * (
                (r_upper * r_upper + r_upper * r_middle + r_middle * r_middle) +
                (r_middle * r_middle + r_middle * r_lower + r_lower * r_lower)
            )
        )

        print(floor, accum_height, r_lower, file=floorfile)
        accum_height += H
        floor += 1
        print(floor - 1, floor, *color, file=colorfile)
        print(floor, accum_height, r_middle, file=floorfile)
        accum_height += H
        floor += 1
        print(floor - 1, floor, *color, file=colorfile)

if floorfile is not sys.stdout:
    floorfile.close()
if colorfile is not sys.stdout:
    colorfile.close()
