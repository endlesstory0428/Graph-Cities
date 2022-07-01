import sys
import json
from time import time
from matplotlib import cm
from math import pi, log2, exp, sqrt


def ToRgb(h):
    h = 1 / (1 + exp(-5 * (h - 0.25)))
    return [int(round(255 * x)) for x in cm.rainbow(h)[:-1]]


def frustumHeight(volume, r_upper, r_lower):
    return 3 * volume / (pi * (r_upper**2 + r_upper * r_lower + r_lower**2))


if sys.argv[1].split('_')[-1][:-5] == "1":
    sys.exit()

with open(sys.argv[1]) as f:
    data = json.load(f)

try:
    bushfile = open(sys.argv[2], 'a')
    # index,
    # height,
    # stem angle,
    # inner branches,
    # inner branch length,
    # inner branch angle,
    # outer branches,
    # outer branch length,
    # outer branch angle,
    # percent flowers
except Exception:
    bushfile = sys.stdout

floor = 0
accum_height = 0
DATA = []
# print('[')
for w in range(1, len(data) + 1):
    info = data[str(w)]
    if w < len(data):
        last = False
    else:
        last = True

    volume = log2(info[f'e->w{w+1}'] + 1) if not last else log2(info['ie'] + 1)
    r_inner = log2(info['s'] + 1)
    r_outer = log2(info['t'] + 1)
    h = frustumHeight(volume, r_inner, r_outer) / 2
    accum_height += h

    v = info['ss']
    ie = info['ie']
    dense_inner = 2 * ie / float(v * (v - 1)) if ie > 0 else 0

    if not last:
        e2n = info[f'e->w{w+1}']
        vn = data[str(w + 1)]['ss']
        dense_stem = e2n / float(v * vn) if e2n > 0 else 0
    else:
        dense_stem = 0

    vo = info['t']
    ee = info['ee']
    dense_outer = ee / float(v * vo) if ee > 0 else 0

    print(
        # floor,
        '[',
        accum_height,
        ',',
        dense_stem * 45,
        ',',
        int(r_inner),
        ',',
        sqrt(r_inner),
        ',',
        dense_inner * 60,
        ',',
        int(r_outer),
        ',',
        sqrt(r_outer),
        ',',
        dense_outer * 60,
        ',',
        info['c'],
        '],',
    )
    DATA.append(
        [
            accum_height,
            dense_stem * 45,
            int(r_inner),
            sqrt(r_inner),
            dense_inner * 60,
            int(r_outer),
            sqrt(r_outer),
            dense_outer * 60,
            info['c'],
        ]
    )
    # index,
    # height,
    # stem angle,
    # inner branches,
    # inner branch length,
    # inner branch angle,
    # outer branches,
    # outer branch length,
    # outer branch angle,
    # flowers

    floor += 1

    # if last:
    #     print(floor, accum_height, file=bushfile)

# print(']')

# toprint = {
#     "id":
#     '_'.join(sys.argv[1].split('_')[-3:-1]),
#     "name":
#     '_'.join(sys.argv[1].split('_')[-3:-1]),
#     "data":
#     DATA,
#     "stepSize":
#     0.1,
#     "iterations":
#     2,
#     "rotationAngle":
#     18,
#     "baseAxiom":
#     "A",
#     "ruleList": [
#         {
#             "symbol": "A",
#             "rule": "I+[A+w]--//[--L]I[++L]"
#         }, {
#             "symbol": "I",
#             "rule": "FS[//&&L][//^^L]FS"
#         }, {
#             "symbol": "S",
#             "rule": "SFS"
#         }, {
#             "symbol": "w",
#             "rule": "[&&&p/W////W////W////W////W]"
#         }, {
#             "symbol": "p",
#             "rule": "FF"
#         }, {
#             "symbol": "W",
#             "rule": "[^F][&&&&P]"
#         }
#     ]
# }
print(len(sys.argv[1].split('_')))
toprint = '"{}":{},'.format('_'.join(sys.argv[1].split('_')[1:]).split('.')[0], json.dumps(DATA))

print(toprint, file=bushfile)
# json.dump(toprint, bushfile, indent='\t')
# print(',', file=bushfile)

if bushfile is not sys.stdout:
    bushfile.close()
