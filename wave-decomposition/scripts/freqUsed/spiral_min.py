import sys
import json
from math import cos, sin, pi, log2, sqrt
import matplotlib.pyplot as plt
import numpy as np
import os
from collections import defaultdict

path = sys.argv[1]
graph = sys.argv[2]

datas = defaultdict(dict)

with open(f'{path}{graph}/{graph}-info.json') as f:
    data = json.load(f)
    thresholdList = np.array(data['thresholds'])


########

with open(f'{path}{graph}/{graph}.json') as f:
    data = json.load(f)
    layerList = data['peels']


lccVSizeDict = dict()
for layer in layerList:
    with open(f'{path}{graph}/{graph}_layers/layer-{layer}.cc-info.json') as f:
        info = json.load(f)
        del info['-1']

        for lcc, lccInfo in info.items():
            lcc = int(lcc)
            lccVSizeDict[(layer, lcc)] = lccInfo['vertices']

########
duplicateSizeDict = defaultdict(int)
with open(f'{path}{graph}/lcc-duplicates.json') as f:
    duplicateInfo = json.load(f)
    for masterId, duplicateIdList in duplicateInfo.items():
        masterPeel, masterLcc = map(int, masterId.split('_'))
        duplicateSizeDict[(masterPeel, masterLcc)] = len(duplicateIdList)


########

buckSizeDict = {}
with open(f'{path}{graph}/{graph}-lccWaves.vBuck.b.p.mm.json') as f:
    data = json.load(f)
    del data['layers']
    del data['buckets']
    for bucket, bucketInfo in data.items():
        bucket = int(bucket)
        if bucketInfo['count'] == 0:
            continue
        for peel, peelInfo in bucketInfo['peel'].items():
            peel = int(peel)
            lcc = peelInfo['lccList'][0]
            if lcc['single']:
                buckSizeDict[(bucket, peel)] = 1
            else:
                buckSizeDict[(bucket, peel)] = lcc['count']


########

for filename in sys.argv[3:]:
    with open(f'{path}{graph}/{graph}_waves/{filename}') as f:
        data = json.load(f)
        splitName = os.path.splitext(os.path.split(filename)[-1])[0].split('_')
        peel = int(splitName[1])
        lcc = int(splitName[2])
        # edges = sum([x.get('edges', 0) for x in data.values()])
        # verts = max([x.get('vertices') for x in data.values()])
        edges = sum([x.get('ee') + x.get('ie') for x in data.values()])
        verts = max([x.get('ss') + x.get('t') for x in data.values()])
        base = log2(data['1']['s'] + 1)
        bucketIdx = np.searchsorted(thresholdList, edges, side = 'right')
        fragSizeList = np.array([size for wave in data.values() for size in wave['f']], dtype = np.float64)
        fragSizeList = np.log(fragSizeList)
        fragNum = np.sum([len(wave['f']) for wave in data.values()], dtype = np.int64)
        fragSum = np.sum(fragSizeList)
        fragStd = np.std(fragSizeList)
        if fragStd == 0:
            fragSpread = (0, 0)
            fragBucket = (1, )
        else:
            fragAve = np.mean(fragSizeList)
            fragMin = np.min(fragSizeList)
            fragMax = np.max(fragSizeList)
            fragSpread = (np.ceil((fragAve - fragMin) / fragStd), np.ceil((fragMax - fragAve) / fragStd))
            bins = (np.arange(fragSpread[0] + fragSpread[1] + 1) - fragSpread[0]) * fragStd + fragAve
            fragBucket, _ = np.histogram(fragSizeList, bins, density = False)
            fragBucket = np.cumsum(fragBucket)


        datas[bucketIdx][filename] = {
                                        'peel': peel,
                                        'verts': lccVSizeDict[(peel, lcc)],
                                        'edges': edges,
                                        'rad': verts,
                                        'base': base,
                                        'fragNum': int(fragNum),
                                        'fragNeg': int(fragSpread[0]),
                                        'fragPos': int(fragSpread[1]),
                                        'fragBucket': fragBucket,
                                        'buckSize': buckSizeDict[(bucketIdx-1, peel)],
                                        'duplicate': 1 + duplicateSizeDict[(peel, lcc)]}  # , 'data': data)

max_rad = 0
for bucketDatas in datas.values():
    for data in bucketDatas.values():
        if data['rad'] > max_rad:
            max_rad = data['rad']

R = log2(max_rad)
L = 2 * R
W = L  # / 1.618  # the golden rectangle ratio
alpha = L
beta = L / 4
S = 1.7

# buckets = []
# buckets = range(len(sys.argv)-1)

# plt.axes()

acc_theta = 0
for bucket in sorted(datas, reverse = True):
    for filename in sorted(datas[bucket], key=lambda x: datas[bucket][x]['peel'], reverse=True):
        # print(filename)
        radius = alpha + beta * acc_theta
        x = radius * cos(acc_theta)
        y = radius * sin(acc_theta)  # * 0.95
        box_theta = acc_theta * 180 / pi + 90
        d_theta = (L * S) / radius
        acc_theta += d_theta

        B = log2(datas[bucket][filename]['edges'] + 1)
        F = int(filename.split('_')[-1].split('.')[0])
        r = datas[bucket][filename]['base']
        rad = sqrt(r**2 + F * B * (R**2) - R**2) / sqrt(F * B)

        if acc_theta == d_theta:
            acc_theta = 1.5 * pi / 2
            # x = 0
            # y = 0

        plt.gca().add_patch(plt.Rectangle((x, y - W / 2), L, W, angle = box_theta))
        print('.'.join(filename.split('.')[:-1]), x - L / 2, y, box_theta, rad, datas[bucket][filename]['verts'], datas[bucket][filename]['edges'], datas[bucket][filename]['fragNum'], datas[bucket][filename]['fragNeg'], datas[bucket][filename]['fragPos'], datas[bucket][filename]['buckSize'], datas[bucket][filename]['duplicate'])
        print(*datas[bucket][filename]['fragBucket'])
        # print(B * F)

# plt.axis('scaled')
# plt.show()
