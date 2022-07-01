import sys
import json
from matplotlib import cm
from math import pi, log2, exp, log
import colorsys

def greyRed(x):
    h = 240 * (1 - x) / 360
    s = x
    l = 0.5
    return colorsys.hls_to_rgb(h, l, s)

def ToRgb(h, factor = 0.004517434295135004):
    # h = 1 / (1 + exp(-5 * (h - 0.25)))  # logisitic curve to bias towards blue
    # color = [int(round(255 * x)) for x in cm.rainbow(h)[:-1]]
    h = 1 - log(h * (1 - factor) + factor, factor)
    # h = h * 0.6 + 0.4
    if h > 0.4:
        color = cm.jet(h)[:-1]
    else:
        color = colorsys.hls_to_rgb((166 + (0.4 - h) * 100) / 360, 0.58 + (0.4 - h) * 0.5, h / 0.4)
    # color = greyRed(h)
    return color


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

colorFactor = float(sys.argv[4])

floor = 0
accum_height = 0
for w in range(1, len(data) + 1):
    info = data[str(w)]
    if w < len(data):
        last = False
    else:
        last = True
    # if not last and sum(data[str(w + 1)].values()) == 0:
    #     last = True

    # if not last:
    #     # print(data[str(w + 1)]['s'], info['t'], data[str(w + 1)]['s'] / info['t'], file=sys.stderr)
    #     print(data[str(w + 1)]['s'], info['t'], log2(data[str(w + 1)]['s'] + 1) / log2(info['t'] + 1), file=sys.stderr) # noqa

    # volume = log2(info[f'e->w{w+1}'] + 1) if not last else log2(info['ie'] + 1)
    volume = log2(info['ie'] + info['ee'] + 1)
    r_lower = log2(info['s'] + 1)
    r_upper = log2(info['t'] + 1)
    h = frustumHeight(volume, r_upper, r_lower)
    print(floor, accum_height, r_lower, 'ground', file=floorfile)

    v = info['ss']
    ie = info['ie']
    dense_ground = 2 * ie / float(v * (v - 1)) if ie > 0 else 0
    color_ground = ToRgb(dense_ground, colorFactor)
    print(floor, floor, 'ground', *color_ground, file=colorfile)

    we = 2 * info['ie'] + info['ee']
    vo = info['t']
    dense_inner = we / float(v * (vo + info['s'])) if we > 0 else 0
    color_inner = ToRgb(dense_inner, colorFactor)
    print(floor, floor + 1, 'inner', *color_inner, info['c'], file=colorfile)

    ee = info['ee']
    dense_ceil = ee / float(v * vo) if ee > 0 else 0
    color_ceil = ToRgb(dense_ceil, colorFactor)
    print(floor, floor, 'ceil', *color_ceil, file=colorfile)

    go = info['gt']
    ge = info['ge']
    dense_outer = ge / float(v * go) if ge > 0 else 0
    color_outer = ToRgb(dense_outer, colorFactor)
    print(floor, floor + 1, 'outer', *color_outer, file=colorfile)

    # dense_outer = 0
    # color_outer = ToRgb(dense_outer, colorFactor)
    # print(floor, floor + 1, 'outer', *color_outer, file=colorfile)

    if not last:
        e2n = info[f'e->w{w+1}']
        vn = data[str(w + 1)]['ss']
        dense_next = e2n / float(v * vn) if e2n > 0 else 0
        color_next = ToRgb(dense_next, colorFactor)
        print(floor, floor + 1, 'next', *color_next, file=colorfile)

    accum_height += h
    floor += 1
    print(floor, accum_height, r_upper, 'inner', file=floorfile)

    r_upper_outer = log2(info['gt'] + 1)
    print(floor, accum_height, r_upper_outer, 'outer', file=floorfile)

    # r_upper_outer = log2(info['t'] + 1)
    # print(floor, accum_height, r_upper_outer, 'outer', file=floorfile)

    # if last:
    #     break

if floorfile is not sys.stdout:
    floorfile.close()
if colorfile is not sys.stdout:
    colorfile.close()