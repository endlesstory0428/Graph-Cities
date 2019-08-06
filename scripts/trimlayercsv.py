#!/usr/bin/env python3
import sys
import json
import glob
import pandas as pd

graph = sys.argv[1]
graph += '/' + graph
IP = int(eval(sys.argv[2]))

with open(graph + '-layer-info.json') as f:
    layersinfo = json.load(f)
del layersinfo['0']

files = set()
large_layers = set()
for layer, info in layersinfo.items():
    if info['edges'] > IP:
        layerfile = glob.glob(graph + '_layers/*-' + str(info['file_suffix']) + '.csv')[0]
        cclayerfile = glob.glob(graph + '_layers/*-' + str(info['file_suffix']) +
                                '.cc-layers')[0]
        files.add((layerfile, cclayerfile))
        large_layers.add(int(layer))

for layerfile, cclayerfile in files:

    print('reading', cclayerfile)
    cclayers = pd.read_csv(
        cclayerfile,
        header=None,
        names=['vertex', 'CC', 'layer', 'cc'],
        usecols=['vertex', 'layer', 'cc']
    )
    print('read', cclayerfile)
    fpsizes = {}
    for layer in set(cclayers['layer']):
        if layer in large_layers:
            fpsizes[layer] = set()
            with open(graph + '_layers/layer-' + str(layer) + '.cc-info.json') as f:
                small_ccs = set()
                for cc, v in json.load(f).items():
                    if int(cc) >= 0:
                        if v['edges'] <= IP:
                            small_ccs.add(int(cc))
                for x in cclayers['vertex'][(cclayers['layer'] == layer)
                                            & (cclayers['cc'].isin(small_ccs))]:
                    fpsizes[layer].update([x])
        else:
            fpsizes[layer] = 'all'

    layertrimmed = layerfile + '.trim'
    print('trimming', layerfile)
    with open(layertrimmed, 'w') as fwrite:
        iter_csv = pd.read_csv(
            layerfile,
            header=None,
            names=['source', 'target', 'layer'],
            iterator=True,
            # chunksize=1000
        )
        for chunk in iter_csv:
            lgroups = chunk.groupby(['layer'])
            for layer, verts in fpsizes.items():
                data = lgroups.get_group(layer)
                if verts != 'all':
                    data = data[data['source'].isin(verts)]
                data.to_csv(layertrimmed, header=False, index=False, mode='a')
    print('trimmed', layerfile)
