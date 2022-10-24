import sys
import csv
import json
import ijson
from math import log2

# with open(sys.argv[2]) as f:
#     degdata = {int(v): int(d) for v, d in csv.reader(f)}
# print("Read Degree Dist")

entropy_layer_counts = {}
vertex_layer_counts = {}
with open(sys.argv[1], 'rb') as f:
    for vertex, profile in ijson.kvitems(f, ''):
        # if sum(profile.values()) != degdata[int(vertex)]:
        #     print(vertex, sum(profile.values()), degdata[int(vertex)])
        layers = set()
        entropy = 0
        deg = sum(profile.values())
        for lcc, li in profile.items():
            if li != 0:
                entropy -= (li / deg) * log2(li / deg)
                layers.add(int(lcc.split('_')[0]))
        for layer in layers:
            entropy_layer_counts[layer] = entropy_layer_counts.get(layer, 0) + entropy
            vertex_layer_counts[layer] = vertex_layer_counts.get(layer, 0) + 1
        # print(layers)
        # print(f'{vertex},{entropy}')
# print(entropy_layer_counts)
# print(vertex_layer_counts)
avg_entropy = {}
max_entropy = 0
for layer in entropy_layer_counts:
    avg_entropy[layer] = entropy_layer_counts[layer] / vertex_layer_counts[layer]
    if max_entropy < avg_entropy[layer]: max_entropy = avg_entropy[layer]
for layer in avg_entropy:
    avg_entropy[layer] /= max_entropy
print(json.dumps(avg_entropy, sort_keys=True))
