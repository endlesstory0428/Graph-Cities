import sys
import csv
import json
import glob
# import queries
import pandas as pd


def getWaveMap(g, l, lcc):
    """ Inputs:
            g   = graph_name
            l   = layer number
            lcc = layer connected component id

        Outputs: json
            "wave #": {
              "s": <# sources of frag 0>,
              "ss": <sum of frag sources>,
              "t": <# boundary vertices>,
              "ie": <# internal edges>,
              "ee": <# external edges>,
              "e->w2": <# number edges to next wave>
            }
    """

    graph = g
    graph += '/' + graph
    layer = l

    graph += '_waves/layer-' + str(layer)
    wavecsvfile = graph + '-waves.csv'
    wavesourcesfile = graph + '-wave-sources.csv'
    wavedistfile = graph + '-waves-info.json'

    print('reading', wavedistfile)
    with open(wavedistfile) as infile:
        wdist = json.load(infile)
        del wdist['0']
    print('read', wavedistfile)

    # mwave = max(int(x) for x in wdist)
    # maxfrag = 0
    # lastset = 0
    wsizes = {}
    wccs = set()
    for w, wccdist in wdist.items():
        del wccdist['vertices']
        del wccdist['edges']
        wsizes[int(w)] = {'ss': 0, 's': 0, 'v': 0, 'e': 0}
        for wcc, info in wccdist.items():
            if info['layer-cc'] == lcc:
                wccs.add((int(w), int(wcc)))
                wsizes[int(w)]['v'] += info['vertices']
                wsizes[int(w)]['e'] += info['edges']
                wsizes[int(w)]['s'] += info['fragments']['0']['sources']
                wsizes[int(w)]['ss'] += sum([x['sources'] for x in info['fragments'].values()])
                # for f, finfo in info['fragments'].items():
                #     wsizes[int(w)]['s'] += finfo['sources']
                #     if int(w) == mwave:
                #         if int(f) > maxfrag:
                #             maxfrag = int(f)
                #             lastset = 0
                #         if int(f) == maxfrag:
                #             lastset += finfo['vertices']

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
    counts = {}
    for chunk in iter_csv:
        for s, t, w, wcc in chunk.values:
            if (w, wcc) in wccs:
                if s in v2ws and t in v2ws:
                    key = tuple(sorted([v2ws[s], v2ws[t]]))
                    counts[key] = counts.get(key, 0) + 1
    print('read', wavecsvfile)

    data = {}
    for w, sizes in wsizes.items():
        data[w] = {}
        data[w]['s'] = sizes['s']
        data[w]['ss'] = sizes['ss']
        # if w == max(wsizes):
        #     data[w]['s'] -= lastset
        data[w]['t'] = sizes['v'] - data[w]['s']
        data[w]['ie'] = counts.get((w, w), 0) / 2
        data[w]['ee'] = sizes['e'] - data[w]['ie']
        if w < max(wsizes):
            data[w][f'e->w{w+1}'] = counts.get((w, w + 1), 0) / 2

    return data


if __name__ == "__main__":
    graph = sys.argv[1]

    buckfiles = glob.glob(graph + '/graph-*.json')

    peelsInBucket = {}
    # print(buckfiles)
    for fn in buckfiles:
        with open(fn) as f:
            data = sorted(json.load(f), key=lambda x: len(x['links']))

        # print(len(data[0]['links']), len(data[len(data) // 2]['links']), len(data[-1]['links']))
        # print(data[len(data) // 2]['id'])
        peel, lcc = data[len(data) // 2]['id'].split('_')
        print(data[-1]['id'], list({int(x['id'].split("_")[0]) for x in data}))
        peelsInBucket[data[-1]['id']] = list({int(x['id'].split("_")[0]) for x in data})
        # wavemap = getWaveMap(graph, int(peel), int(lcc))
        # with open(f'{graph}/{graph}_waves/wavemap_{peel}_{lcc}.json', 'w') as f:
        #     json.dump(wavemap, f, indent=2)
        print("Total size: ", sum([len(x['links']) for x in data]))

    graph_info = json.load(open(f'{graph}/{graph}-info.json'))

    for k in graph_info['counts']:
        # print(k)
        if k != "total":
            for box in graph_info['counts'][k]:
                if len(box['ids']) > 0:
                    _id = box['ids'][0].split("_")
                    peel = int(_id[0])
                    lcc = int(_id[1])
                    print(box['ids'][0], peel)
                    peelsInBucket[box['ids'][0]] = [peel]
                    # wavemap = getWaveMap(graph, int(peel), int(lcc))
                    # with open(f'{graph}/{graph}_waves/wavemap_{peel}_{lcc}.json', 'w') as f:
                    #     json.dump(wavemap, f, indent=2)

    print(peelsInBucket)
    # with open(f'{graph}/{graph}-bucket2peels.json', 'w') as f:
    #     json.dump(peelsInBucket, f, indent='\t')
