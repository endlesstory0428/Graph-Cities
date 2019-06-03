#!/usr/bin/env python
import json
import glob
import pandas as pd

ERR = '\033[91m'
CLR = '\033[0m'


def loadFiles(graph_name):
    graph = graph_name + '/' + graph_name
    GRAPH = {}

    # Load Peel Decomp

    with open(graph + '-layer-info.json') as f:
        GRAPH['layers'] = json.load(f)

    with open(graph + '-metadata.json') as f:
        GRAPH.update(json.load(f))

    # Load CC

    with open(graph + '.cc-info.json') as f:
        GRAPH['ccs'] = json.load(f)

    # Load CC-Layers

    files = glob.glob(graph + '_layers/layer*.cc-info.json')

    for fl in files:
        layer = fl.split('-')[-2].split('.')[0]
        with open(fl) as f:
            GRAPH['layers'][layer]['ccs'] = json.load(f)

    # Load Waves

    files = glob.glob(graph + '_waves/layer-*-waves-info.json')
    for fl in files:
        layer = fl.split('-')[-3]
        with open(fl) as f:
            GRAPH['layers'][layer]['waves'] = json.load(f)

    return GRAPH


def makeDataFrame(GRAPH, unit, layer_num=-1, wave_num=-1, wavecc_num=-1):
    df = pd.DataFrame(columns=[unit, 'edges', 'vertices'])
    if layer_num < 1 and wave_num < 1 and wavecc_num < 0:
        items = GRAPH[unit].items()
    elif layer_num > 0 and wave_num < 1 and wavecc_num < 0:
        items = GRAPH['layers'][str(layer_num)][unit].items()
    elif layer_num > 0 and wave_num > 0 and wavecc_num < 0:
        stuff = list(
            filter(
                lambda x: x[0].isdigit(),
                GRAPH['layers'][str(layer_num)]['waves'][str(wave_num)].items()
            )
        )
        if unit == 'levels':
            items = []
            maxlevel = len(max(stuff, key=lambda x: len(x[1]['levels']))[1]['levels'])
            print(stuff)
            for x in range(1, maxlevel + 1):
                items.append(
                    (
                        x, {
                            'edges':
                            sum(
                                [
                                    lcc[1]['levels'].get(str(x), {'edges': 0})['edges']
                                    for lcc in stuff
                                ]
                            ),
                            'vertices':
                            sum(
                                [
                                    lcc[1]['levels'].get(str(x),
                                                         {'vertices': 0})['vertices']
                                    for lcc in stuff
                                ]
                            )
                        }
                    )
                )
        else:
            items = stuff
    elif layer_num > 0 and wave_num > 0 and wavecc_num > 0:
        items = GRAPH['layers'][str(layer_num)]['waves'][str(wave_num)][
            str(wavecc_num)]['levels'].items()

    ind = 0
    for u, dic in items:
        if len(dic) == 0: continue
        e, v = dic['edges'], dic['vertices']
        df.loc[ind] = [u, e, v]
        ind += 1

    return df
