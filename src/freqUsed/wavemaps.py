import sys
import csv
import json
import glob
# import queries
import pandas as pd
from math import log2, ceil

prevLayer = dict()
wdist = None
v2ws = None


def getWaveMap(g, l, lcc, vprofile):
    """ Inputs:
            g   = graph_name
            l   = layer number
            lcc = layer connected component id

        Outputs: json
            "wave #": {
              "s": <# sources of frag 0>,
              "ss": <sum of frag sources>,
              "t": <# boundary vertices>,
              "c": <# vertex clones in other fixed points>
              "ie": <# internal edges>,
              "ee": <# external edges>,
              "e->w2": <# number edges to next wave>
            }
    """
    global prevLayer
    global wdist
    global v2ws

    graph = g
    graph += '/' + graph
    layer = l

    graph += '_waves/layer-' + str(layer)
    wavecsvfile = graph + '-waves.csv'
    wavesourcesfile = graph + '-wave-sources.csv'
    wavedistfile = graph + '-waves-info.json'

    if layer not in prevLayer:
        prevLayer[layer] = dict()
        prevLayer[layer]['wdist'] = None
        prevLayer[layer]['v2ws'] = None

    if prevLayer[layer]['wdist'] is None:
        print('reading', wavedistfile)
        with open(wavedistfile) as infile:
            wdist = json.load(infile)
            del wdist['0']
        print('read', wavedistfile)
        prevLayer[layer]['wdist'] = wdist
    else:
        print('using cached', wavedistfile)
        wdist = prevLayer[layer]['wdist']
        v2ws = prevLayer[layer]['v2ws']

    # mwave = max(int(x) for x in wdist)
    # maxfrag = 0
    # lastset = 0
    wsizes = {}
    wccs = set()
    for w, wccdist in wdist.items():
        if 'vertices' in wccdist:
            del wccdist['vertices']
        if 'edges' in wccdist:
            del wccdist['edges']
        wsizes[int(w)] = {'ss': 0, 's': 0, 'v': 0, 'e': 0, 'f': 0}
        for wcc, info in wccdist.items():
            if info['layer-cc'] == lcc:
                wccs.add((int(w), int(wcc)))
                wsizes[int(w)]['v'] += info['vertices']
                wsizes[int(w)]['e'] += info['edges']
                wsizes[int(w)]['s'] += info['fragments']['0']['sources']
                wsizes[int(w)]['ss'] += sum([x['sources'] for x in info['fragments'].values()])
                # wsizes[int(w)]['f'] += len(info['fragments'])

                # for f, finfo in info['fragments'].items():
                #     wsizes[int(w)]['s'] += finfo['sources']
                #     if int(w) == mwave:
                #         if int(f) > maxfrag:
                #             maxfrag = int(f)
                #             lastset = 0
                #         if int(f) == maxfrag:
                #             lastset += finfo['vertices']

    if prevLayer[layer]['v2ws'] is None:
        print('reading', wavesourcesfile)
        v2ws = pd.read_csv(
            wavesourcesfile,
            header=None,
            names=['vertex', 'wave', 'fragment'],
            usecols=['vertex', 'wave', 'fragment'],
            # iterator=True
        ).set_index('vertex').transpose().to_dict(orient='index')['wave']
        # wsgps = {}
        # for chunk in iter_csv:
        #     for w, v in chunk.groupby(['wave']):
        #         wsgps[w] = wsgps.get(w, set()).union(v['vertex'])
        print('read', wavesourcesfile)
        prevLayer[layer]['v2ws'] = v2ws
    else:
        print('using cached', wavesourcesfile)

    print('reading', wavecsvfile)
    iter_csv = pd.read_csv(
        wavecsvfile,
        header=None,
        names=['source', 'target', 'wave', 'wcc', 'fragment'],
        usecols=['source', 'target', 'wave', 'wcc'],
        iterator=True
    )
    # waves = pd.concat(
    #     [chunk.loc[chunk[['wave', 'wcc']].apply(lambda x: tuple(x) in wccs, axis=1)] for chunk in iter_csv]
    # )
    # waves.drop(['wcc', 'fragment'], axis=1, inplace=True)
    verts = set()
    counts = {}
    for chunk in iter_csv:
        for s, t, w, wcc in chunk.values:
            if (w, wcc) in wccs:
                if s in v2ws and t in v2ws:
                    verts.add((s, v2ws[s]))
                    key = tuple(sorted([v2ws[s], v2ws[t]]))
                    counts[key] = counts.get(key, 0) + 1
    print('read', wavecsvfile)

    ocounts = {}
    for v, ws in verts:
        ocounts[ws] = ocounts.get(ws, 0) + vprofile[v] - 1

    # print(ocounts)
    # print(wsizes)

    data = {}
    for w, sizes in wsizes.items():
        if w not in ocounts:
            continue
        data[w] = {}
        data[w]['s'] = sizes['s']
        data[w]['ss'] = sizes['ss']
        # if w == max(wsizes):
        #     data[w]['s'] -= lastset
        data[w]['t'] = sizes['v'] - data[w]['s']
        data[w]['c'] = ocounts[w]
        data[w]['ie'] = counts.get((w, w), 0) / 2
        data[w]['ee'] = sizes['e'] - data[w]['ie']
        data[w]['f'] = sizes['f']
        if w < max(wsizes):
            data[w][f'e->w{w+1}'] = counts.get((w, w + 1), 0) / 2

    return data


def getVertexProfile(g):
    graph = g
    graph += '/' + graph

    cclayerfiles = glob.glob(graph + '_layers/*.cc-layers')

    vert2nfp = {}
    for cclayerfile in cclayerfiles:
        print('reading', cclayerfile)
        cclayers = pd.read_csv(
            cclayerfile, header=None, names=['vertex', 'CC', 'layer', 'cc'], usecols=['vertex', 'layer', 'cc']
        )
        # cclayers.drop(['layer'], axis=1, inplace=True)
        print('read', cclayerfile)
        print('processing', cclayerfile)
        for v, l, cc in cclayers.values:
            vert2nfp[v] = vert2nfp.get(v, 0) + 1
        print('processed', cclayerfile)
        del cclayers
    return vert2nfp


def split_list(alist, wanted_parts=1):
    length = len(alist)
    return [alist[i * length // wanted_parts:(i + 1) * length // wanted_parts] for i in range(wanted_parts)]


if __name__ == "__main__":
    graph = sys.argv[1]

    vertProfile = getVertexProfile(graph)
    buckfiles = glob.glob(graph + '/graph-*.json')

    print(sorted(buckfiles))
    for fn in sorted(buckfiles, reverse=True):
        with open(fn) as f:
            data = sorted(json.load(f), key=lambda x: len(x['links']))

        print(len(data))
        # print(len(data[0]['links']), len(data[len(data) // 2]['links']), len(data[-1]['links']))
        # print(data[len(data) // 2]['id'])
        num_fp = len(data)
        print(data[-1]['id'])
        peel, lcc = data[-1]['id'].split('_')
        # peel, lcc = data[len(data) // 2]['id'].split('_')
        wavemap = getWaveMap(graph, int(peel), int(lcc), vertProfile)
        with open(f'{graph}/{graph}_waves/wavemap_{peel}_{lcc}_{num_fp}.json', 'w') as f:
            json.dump(wavemap, f, indent=2)
        if num_fp > 1:
            num_choose = min(log2(8 * (num_fp - 1)), num_fp - 1)
            print(int(num_choose))
            # assert (len(split_list(list(range(len(data) - 1)), int(num_choose))) == int(num_choose))
            for inds in split_list(list(range(len(data) - 1)), int(num_choose)):
                i = inds[len(inds) // 2]
                # print(i, end=', ')
                print(data[i]['id'], end=', ')
                subpeel, sublcc = data[i]['id'].split('_')
                wavemap = getWaveMap(graph, int(subpeel), int(sublcc), vertProfile)
                with open(f'{graph}/{graph}_waves/wavemap_{peel}_{lcc}_{subpeel}_{sublcc}.json', 'w') as f:
                    json.dump(wavemap, f, indent=2)
            print()

    # sys.exit(0)
    graph_info = json.load(open(f'{graph}/{graph}-info.json'))

    for k in graph_info['counts']:
        # print(k)
        if k != "total":
            for box in graph_info['counts'][k]:
                if len(box['ids']) > 0:
                    _id = box['ids'][0].split("_")
                    peel = int(_id[0])
                    lcc = int(_id[1])
                    print(peel, lcc)
                    wavemap = getWaveMap(graph, int(peel), int(lcc), vertProfile)
                    with open(f'{graph}/{graph}_waves/wavemap_{peel}_{lcc}_1.json', 'w') as f:
                        json.dump(wavemap, f, indent=2)
