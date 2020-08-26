#!/usr/bin/env python3
import sys
import json
import glob
import pandas as pd
from disjoint_set import DisjointSet

# def getFPDagCover(g, l, lcc, just_dag=False):
#     """ Inputs:
#             g   = graph_name
#             l   = layer number
#             lcc = layer connected component id
#             just_dag = whether or not to return just the dag

#         Outputs: json
#             {
#                 "sets":
#                     {
#                         "0" : [vertex, #, ...],
#                         "1" : [#, #, ...],
#                         ...
#                     },
#                 "dag":
#                     {
#                         "0-1": "src,tgt\n#,#\n...",
#                         "1-2": "#,#\n#,#\n...",
#                         ...
#                         "(n-1)-n": "#,#\n#,#\n...",
#                         "n-n": "#,#\n#,#\n...",
#                     }
#             }
#     """

#     graph = g
#     graph += '/' + graph
#     layer = l

#     graph += '_waves/layer-' + str(layer)
#     wavecsvfile = graph + '-waves.csv'
#     wavesourcesfile = graph + '-wave-sources.csv'
#     wavedistfile = graph + '-waves-info.json'

#     print('reading', wavedistfile)
#     with open(wavedistfile) as infile:
#         wdist = json.load(infile)
#         del wdist['0']
#     print('read', wavedistfile)

#     wwccs = set()
#     for w, info in wdist.items():
#         del info['vertices']
#         del info['edges']
#         for wcc, winfo in info.items():
#             if winfo['layer-cc'] == lcc:
#                 wwccs.add((int(w), int(wcc)))

#     print('reading', wavecsvfile)
#     iter_csv = pd.read_csv(
#         wavecsvfile,
#         header=None,
#         names=['source', 'target', 'wave', 'wcc', 'fragment'],
#         usecols=['source', 'target', 'wave', 'wcc', 'fragment'],
#         iterator=True,
#     )
#     waves = pd.concat(
#         [
#             pd.concat([group if gind in wwccs else None
#                        for gind, group in chunk.groupby(['wave', 'wcc'])])
#             for chunk in iter_csv
#         ]
#     )
#     # waves.drop(['wcc'], axis=1, inplace=True)
#     print('read', wavecsvfile)

#     print('reading', wavesourcesfile)
#     iter_csv = pd.read_csv(
#         wavesourcesfile,
#         header=None,
#         names=['vertex', 'wave', 'fragment'],
#         usecols=['vertex', 'wave', 'fragment'],
#         iterator=True,
#     )
#     wavesets = pd.concat([chunk for chunk in iter_csv])
#     # wavesets.drop(['wave'], axis=1, inplace=True)
#     print('read', wavesourcesfile)

#     wfsets = {}
#     for wf, v in wavesets.groupby(['wave', 'fragment']):
#         wfsets[wf] = set(v['vertex'])

#     wavemat = {'sets': {}, 'dag': {}}
#     checkcount = 0
#     numset = 0
#     v2set = {}
#     cumset = set()
#     for wfrag, fg in waves.groupby(['wave', 'fragment']):
#         inter = set(fg['source']).intersection(wfsets[wfrag])
#         cumset.update(inter)
#         for x in inter:
#             v2set[x] = numset

#         setlen = len(inter)
#         assert (setlen > 0)
#         checkcount += setlen
#         wavemat['sets'][numset] = list(inter)
#         numset += 1
#     # lastset = set(waves['source']) - cumset
#     lastset = set(waves['source'].loc[waves['target'].isin(inter)]) - cumset
#     for x in lastset:
#         v2set[x] = len(wavemat['sets'])
#     # print(checkcount + len(lastset), len(set(waves['source'])))
#     # print(len(lastset))
#     assert (checkcount + len(lastset) <= len(set(waves['source'])))
#     if len(lastset) > 0:
#         wavemat['sets'][len(wavemat['sets'])] = list(lastset)

#     # print(v2f)
#     # print(wavemat['dag'])
#     maxset = max(v2set.values())
#     # print(maxset)
#     for s, t, w, wcc, f in waves.values:
#         if s in v2set and t in v2set:
#             if (v2set[s] + 1 == v2set[t]) or (v2set[s] == v2set[t] == maxset):
#                 key = '-'.join([str(v2set[s]), str(v2set[t])])
#                 wavemat['dag'][key] = wavemat['dag'].get(key, '') + str(s) + ',' + str(t) + '\n'

#     if just_dag:
#         return json.dumps(wavemat['dag'])

#     return json.dumps(wavemat)


def getFPMetaDagCover(g, l, lcc):
    """ Inputs:
            g   = graph_name
            l   = layer number
            lcc = layer connected component id

        Outputs: json
            {
                "nodes":
                    {
                        "id" : {"size": #, "density": #, "set": #, "wave": #, "frag": #, "vertices": [vertex, #, ...]},
                        ...
                    },
                "edges":
                    {
                        "src_id-tgt_id": weight,
                        "#-#": #,
                        ...
                    },
                "sets":
                    {
                        "0" : [vertex, #, ...],
                        "1" : [#, #, ...],
                        ...
                    },
                "dag":
                    {
                        "0-1": "src,tgt\n#,#\n...",
                        "1-2": "#,#\n#,#\n...",
                        ...
                        "(n-1)-n": "#,#\n#,#\n...",
                        "n-n": "#,#\n#,#\n...",
                    }
            }
    """

    graph = g
    graph += '/' + graph
    layer = int(l)

    graph += '_waves/layer-' + str(layer)
    wavecsvfile = graph + '-waves.csv'
    wavesourcesfile = graph + '-wave-sources.csv'
    wavedistfile = graph + '-waves-info.json'

    print('reading', wavedistfile, file=sys.stderr)
    with open(wavedistfile) as infile:
        wdist = json.load(infile)
        del wdist['0']
    print('read', wavedistfile, file=sys.stderr)

    wwccs = set()
    for w, info in wdist.items():
        del info['vertices']
        del info['edges']
        for wcc, winfo in info.items():
            if winfo['layer-cc'] == int(lcc):
                wwccs.add((int(w), int(wcc)))

    print('reading', wavecsvfile, file=sys.stderr)
    iter_csv = pd.read_csv(
        wavecsvfile,
        header=None,
        names=['source', 'target', 'wave', 'wcc', 'fragment'],
        usecols=['source', 'target', 'wave', 'wcc', 'fragment'],
        iterator=True,
    )
    waves = pd.concat(
        [
            pd.concat([group if gind in wwccs else None
                       for gind, group in chunk.groupby(['wave', 'wcc'])])
            for chunk in iter_csv
        ]
    )
    # waves.drop(['wcc'], axis=1, inplace=True)
    print('read', wavecsvfile, file=sys.stderr)

    print('reading', wavesourcesfile, file=sys.stderr)
    iter_csv = pd.read_csv(
        wavesourcesfile,
        header=None,
        names=['vertex', 'wave', 'fragment'],
        usecols=['vertex', 'wave', 'fragment'],
        iterator=True,
    )
    wavesets = pd.concat([chunk for chunk in iter_csv])
    # wavesets.drop(['wave'], axis=1, inplace=True)
    print('read', wavesourcesfile, file=sys.stderr)

    wfsets = {}
    iwfsets = {}
    for wf, v in wavesets.groupby(['wave', 'fragment']):
        wfsets[wf] = set(v['vertex'])
        for x in v['vertex']:
            iwfsets[x] = wf
    # print(iwfsets)

    wavemat = {'sets': {}, 'dag': {}, 'nodes': {}, 'edges': {}}
    checkcount = 0
    numset = 0
    v2set = {}
    cumset = set()
    for wfrag, fg in waves.groupby(['wave', 'fragment']):
        inter = set(fg['source']).intersection(wfsets[wfrag])
        cumset.update(inter)
        for x in inter:
            v2set[x] = numset

        setlen = len(inter)
        assert (setlen > 0)
        checkcount += setlen
        wavemat['sets'][numset] = list(inter)
        numset += 1
    # lastset = set(waves['source']) - cumset
    lastset = set(waves['source'].loc[waves['target'].isin(inter)]) - cumset
    for x in lastset:
        v2set[x] = len(wavemat['sets'])
    # print(checkcount + len(lastset), len(set(waves['source'])))
    # print(len(lastset))
    assert (checkcount + len(lastset) <= len(set(waves['source'])))
    if len(lastset) > 0:
        wavemat['sets'][len(wavemat['sets'])] = list(lastset)

    # print(v2f)
    # print(wavemat['dag'])
    maxset = max(v2set.values())
    # print(maxset)
    ds = DisjointSet()
    for s, t, w, wcc, f in waves.values:
        if s in v2set and t in v2set:
            if (v2set[s] + 1 == v2set[t]) or (v2set[s] == v2set[t] == maxset):
                key = '-'.join([str(v2set[s]), str(v2set[t])])
                wavemat['dag'][key] = wavemat['dag'].get(key, []) + [(int(s), int(t))]  #+ str(s) + ',' + str(t) + '\n'
            if (v2set[s] == v2set[t]):
                ds.union(s, t)

    iesizes = {}
    for s, t, w, wcc, f in waves.values:
        if s in v2set and t in v2set:
            if (v2set[s] + 1 == v2set[t]):
                key = '-'.join([str(ds.find(s)), str(ds.find(t))])
                wavemat['edges'][key] = wavemat['edges'].get(key, 0) + 1
            if (v2set[s] == v2set[t]):
                iesizes[ds.find(s)] = iesizes.get(ds.find(s), 0) + 1

    for node in ds.itersets():
        verts = [int(x) for x in node]
        nid = ds.find(verts[0])
        print(verts, file=sys.stderr)
        wavemat['nodes'][str(nid)] = {
            "num_vertices": len(verts),
            "num_edges": iesizes.get(nid, 0),
            "set": v2set[nid],
            "wave": int(iwfsets[nid][0]),
            "frag": int(iwfsets[nid][1]),
            "vertices": verts
        }

    # return json.dumps(wavemat)
    return wavemat


if __name__ == "__main__":
    graph = sys.argv[1]
    layer = sys.argv[2]
    lcc = sys.argv[3]

    print(graph, layer, lcc, file=sys.stderr)

    output = getFPMetaDagCover(graph, layer, lcc)
    print(json.dumps(output, indent=2))
