#!/usr/bin/env python3
import sys
import json
import glob

graph = sys.argv[1]
graph += '/' + graph

with open(graph + '-layer-info.json') as f:
    data = json.load(f)
cclayerfiles = glob.glob(graph + '_layers/*.cc-info.json')

for fl in cclayerfiles:
    layer = int(fl.split('-')[-2][:-3])
    with open(fl) as f:
        ccs = len(json.load(f).keys()) - 1
    data[str(layer)]['num_fixedpoints'] = ccs

with open(graph + '-layer-info.json', 'w') as f:
    json.dump(data, f, indent='\t')
