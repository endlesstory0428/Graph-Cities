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
).query('Layer==@layer').reset_index(drop=True)

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
    if int(wave) <= 0: continue
    for wcc, dic in data.items():
        # for v, _, wcc in waves.query('Wave==' + str(wave)).drop_duplicates(subset='wcc').get_values():
        if type(dic) != 'dict':
            continue
        v = waves.query("Wave==@wave").query("wcc==@wcc").get_values()[0][0]
        ccwaves[wave][wcc]['layer-cc'] = int(cclayers.query('vertex==@v')['cc'].get_values()[0])
print('done making map')

print('writing', waveinfofile)
with open(waveinfofile, 'w') as outfile:
    json.dump(ccwaves, outfile, indent='\t')
print('wrote', waveinfofile)
