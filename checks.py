#!/usr/bin/env python
import sys
import json
import glob
# import pandas as pd

ERR = '\033[91m'
CLR = '\033[0m'

graph_name = sys.argv[1]
graph = graph_name + '/' + graph_name

# Check Peel Decomp

with open(graph + '-layer-info.json') as f:
    layerinfo = json.load(f)

with open(graph + '-metadata.json') as f:
    metainfo = json.load(f)

numedges = 0
for layer, val in layerinfo.items():
    if int(layer) > 0:
        numedges += val['edges']

if metainfo['edges'] == numedges:
    print(graph_name, 'Peel Edges: PASSED')
else:
    print(
        ERR, graph_name, 'Peel Edges: FAILED,', numedges, '!=', metainfo['edges'], CLR
    )

# Check CC

with open(graph + '.cc-info.json') as f:
    ccinfo = json.load(f)

numverts = 0
numedges = 0
for cc, val in ccinfo.items():
    if int(cc) >= 0:
        numverts += val['vertices']
        numedges += val['edges']

        if val['edges'] > val['vertices'] * (val['vertices'] - 1) / 2:
            print(ERR, graph_name, 'CC: FAILED, denser than clique', CLR)
        if val['vertices'] > 2 * val['edges']:
            print(ERR, graph_name, 'CC: FAILED, less dense than bundle', CLR)

if metainfo['edges'] == numedges:
    print(graph_name, 'CC Edges: PASSED')
else:
    print(ERR, graph_name, 'CC Edges: FAILED,', numedges, '!=', metainfo['edges'], CLR)

if metainfo['vertices'] == numverts:
    print(graph_name, 'CC Vertices: PASSED')
else:
    print(
        ERR, graph_name, 'CC Vertices: FAILED,', numverts, '!=', metainfo['vertices'],
        CLR
    )

# Check CC-Layers

files = glob.glob(graph + '_layers/layer*.cc-info.json')

cclayersinfo = {}
for fl in files:
    layer = fl.split('-')[-2].split('.')[0]
    with open(fl) as f:
        cclayersinfo[layer] = json.load(f)

totaledges = 0
for layer, val0 in cclayersinfo.items():
    if int(layer) > 0:
        if layer not in layerinfo:
            print(graph_name, 'Error: Ghost layer #', layer)

        numverts = 0
        numedges = 0
        for cc, val in cclayersinfo[layer].items():
            if int(cc) >= 0:
                numverts += val['vertices']
                numedges += val['edges']
                totaledges += val['edges']

                if val['edges'] > val['vertices'] * (val['vertices'] - 1) / 2:
                    print(ERR, graph_name, 'CC: FAILED, denser than clique', CLR)
                if val['vertices'] > 2 * val['edges']:
                    print(ERR, graph_name, 'CC: FAILED, less dense than bundle', CLR)

        if layerinfo[layer]['edges'] == numedges:
            print(graph_name, 'CC-Layer', layer, 'Edges: PASSED')
        else:
            print(
                ERR, graph_name, 'CC-Layer', layer, 'Edges: FAILED,', numedges, '!=',
                layerinfo[layer]['edges'], CLR
            )

        if layerinfo[layer]['vertices'] == numverts:
            print(graph_name, 'CC-Layer', layer, 'Vertices: PASSED')
        else:
            print(
                ERR, graph_name, 'CC-Layer', layer, 'Vertices: FAILED,', numedges, '!=',
                layerinfo[layer]['vertices'], CLR
            )

if metainfo['edges'] == totaledges:
    print(graph_name, 'CC-Layers Edges: PASSED')
else:
    print(
        ERR, graph_name, 'CC-Layers Edges: FAILED,', totaledges, '!=',
        metainfo['edges'], CLR
    )

# Waves

files = glob.glob(graph + '_waves/layer-*-waves-info.json')
wavesinfo = {}
for fl in files:
    layer = fl.split('-')[-3]
    with open(fl) as f:
        wavesinfo[layer] = json.load(f)

totalverts = 0
for layer, val0 in wavesinfo.items():
    if int(layer) > 0:
        if layer not in layerinfo:
            print(graph_name, 'Error: Ghost layer #', layer)

        numverts = 0
        numedges = 0
        for wave, val in wavesinfo[layer].items():
            if int(wave) > 0:
                numverts += val['vertices']
                numedges += val['edges']
                totalverts += val['vertices']

                if val['edges'] > val['vertices'] * (val['vertices'] - 1) / 2:
                    print(ERR, graph_name, 'CC: FAILED, denser than clique', CLR)
                if val['vertices'] > 2 * val['edges']:
                    print(ERR, graph_name, 'CC: FAILED, less dense than bundle', CLR)

                ccverts = 0
                ccedges = 0
                for cc, ccval in val.items():
                    if cc not in ('vertices', 'edges'):
                        ccverts += ccval['vertices']
                        ccedges += ccval['edges']

                        if ccval['edges'] > ccval['vertices'] * (ccval['vertices'] -
                                                                 1) / 2:
                            print(
                                ERR, graph_name, 'CC: FAILED, denser than clique', CLR
                            )
                        if ccval['vertices'] > 2 * ccval['edges']:
                            print(
                                ERR, graph_name, 'CC: FAILED, less dense than bundle',
                                CLR
                            )

                        levedges = 0
                        for level, leval in ccval['levels'].items():
                            levedges += leval['edges']
                            if leval['edges'] > leval['vertices'] * (leval['vertices'] -
                                                                     1) / 2:
                                print(
                                    ERR, graph_name,
                                    'Level: FAILED, denser than clique', CLR
                                )
                            if leval['vertices'] > 2 * leval['edges']:
                                print(
                                    ERR, graph_name,
                                    'Level: FAILED, less dense than bundle', CLR
                                )

                        if levedges == ccval['edges']:
                            print(
                                graph_name, 'Wave-CC', wave, '-', cc, 'of Layer', layer,
                                'Edges: PASSED'
                            )
                        else:
                            print(
                                ERR, graph_name, 'Wave-CC', wave, '-', cc,
                                'CCs of Layer', layer, 'Edges: FAILED', levedges, '!=',
                                ccval['edges'], CLR
                            )

                if ccverts == val['vertices']:
                    print(
                        graph_name, 'Wave', wave, 'CCs of Layer', layer,
                        'Vertices: PASSED'
                    )
                else:
                    print(
                        ERR, graph_name, 'Wave', wave, 'CCs of Layer', layer,
                        'Vertices: FAILED', ccverts, '!=', val['vertices'], CLR
                    )

                if ccedges == val['edges']:
                    print(
                        graph_name, 'Wave', wave, 'CCs of Layer', layer, 'Edges: PASSED'
                    )
                else:
                    print(
                        ERR, graph_name, 'Wave', wave, 'CCs of Layer', layer,
                        'Edges: FAILED', ccedges, '!=', val['edges'], CLR
                    )

#       if layerinfo[layer]['vertices'] == numverts:
#           print(graph_name, 'Waves of Layer', layer, 'Vertices: PASSED')
#       else:
#           print(
#               ERR, graph_name, 'Waves of Layer', layer, 'Vertices: FAILED,', numverts,
#               '!=', layerinfo[layer]['vertices'], CLR
#           )

if metainfo['edges'] == totaledges:
    print(graph_name, 'CC-Layers Edges: PASSED')
else:
    print(
        ERR, graph_name, 'CC-Layers Edges: FAILED,', totaledges, '!=',
        metainfo['edges'], CLR
    )

# cclayers = pd.read_csv(
#     sys.argv[1],
#     header=None,
#     names=['vertex', 'CC', 'Layer', 'cc'],
#     usecols=['vertex', 'Layer', 'cc']
# ).query('Layer==' + sys.argv[2].split('-')[-2]).sort_values(by='vertex'
#                                                             ).reset_index(drop=True)

# waves = pd.read_csv(
#     sys.argv[2],
#     header=None,
#     names=['vertex', 'Level', 'Wave', 'wcc', 'meta_node'],
#     usecols=['vertex', 'Level', 'Wave']
# ).sort_values(by='vertex').reset_index(drop=True)
