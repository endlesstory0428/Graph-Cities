#!/usr/bin/env python
import sys
import json
import glob
import pandas as pd

graph = sys.argv[1]
graph += '/' + graph
layer = sys.argv[2]

with open(graph + '-layer-info.json') as f:
    file_suffix = json.load(f)[str(layer)]['file_suffix']
cclayerfile = glob.glob(graph + '_layers/*-' + str(file_suffix) + '.cc-layers')[0]
graph += '_waves/layer-' + str(layer)
wavecsvfile = graph + '-waves.csv'
waveinfofile = graph + '-waves-info.json'

cclayers = pd.read_csv(
    cclayerfile,
    header=None,
    names=['vertex', 'CC', 'Layer', 'cc'],
    usecols=['vertex', 'Layer', 'cc']
).query('Layer==@layer').sort_values(by='vertex').reset_index(drop=True)

layercc = list(range(cclayers.get_values()[-1][0] + 1))
for v, _, cc in cclayers.get_values():
    layercc[v] = int(cc)

waves = pd.read_csv(
    wavecsvfile,
    header=None,
    names=['source', 'target', 'Wave', 'wcc', 'Level'],
    usecols=['source', 'Wave', 'wcc']
).drop_duplicates().reset_index(drop=True)

with open(waveinfofile) as f:
    ccwaves = json.load(f)

print('making map')
for wave, data in ccwaves.items():
    for v, _, wcc in waves.query('Wave==@wave').drop_duplicates(subset='wcc'
                                                                ).get_values():
        data[str(wcc)]['layer-cc'] = layercc[v]
print('done making map')

print('writing', waveinfofile)
with open(waveinfofile, 'w') as outfile:
    json.dump(ccwaves, outfile, indent='\t')
print('wrote', waveinfofile)
