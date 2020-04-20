import sys
import json
from math import cos, sin, pi
# import matplotlib.pyplot as plt

datas = {}

for filename in sys.argv[1:]:
    with open(filename) as f:
        data = json.load(f)
        edges = sum([x.get('edges', 0) for x in data.values()])
        verts = max([x.get('vertices') for x in data.values()])
        datas[filename] = {'edges': edges, 'rad': verts}  # , 'data': data)

max_rad = 0
for data in datas.values():
    if data['rad'] > max_rad:
        max_rad = data['rad']

L = max_rad
W = L  # / 1.618  # the golden rectangle ratio
alpha = L
beta = L / 4

# buckets = []
# buckets = range(len(sys.argv)-1)

# plt.axes()

acc_theta = 0
for filename in sorted(datas, key=lambda x: datas[x]['edges'], reverse=True):
    radius = alpha + beta * acc_theta
    x = radius * cos(acc_theta)
    y = radius * sin(acc_theta)  # * 0.95
    box_theta = acc_theta * 180 / pi + 90
    d_theta = (L * 1.7) / radius
    acc_theta += d_theta

    # plt.gca().add_patch(plt.Rectangle((x, y), L, W, box_theta))
    print(filename, x, y, box_theta)

    # plt.axis('scaled')
    # plt.show()
