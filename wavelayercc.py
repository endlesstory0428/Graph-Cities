#!/usr/bin/env python3
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
).query('Layer==@layer').transpose()
# cclayers.sort_values(by='vertex', inplace=True)
cclayers.columns = cclayers.loc['vertex'].get_values()

waves = pd.read_csv(
    wavecsvfile,
    header=None,
    names=['source', 'target', 'Wave', 'wcc', 'Level'],
    usecols=['source', 'Wave', 'wcc']
)
waves.drop_duplicates(subset=['Wave', 'wcc'], inplace=True)

with open(waveinfofile) as f:
    ccwaves = json.load(f)

print('making map')
for s, w, c in waves.get_values():
    ccwaves[str(w)][str(c)]['layer-cc'] = int(cclayers[s].cc)
print('done making map')

print('writing', waveinfofile)
with open(waveinfofile, 'w') as outfile:
    json.dump(ccwaves, outfile, indent='\t')
print('wrote', waveinfofile)
