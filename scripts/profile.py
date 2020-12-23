import sys
import json
import glob
import pandas as pd

graph = sys.argv[1]
graph += '/' + graph

profile = {}
for cclayerfile in glob.glob(graph + '_layers/*.cc-layers'):
    print('reading', cclayerfile, file=sys.stderr)
    cclayers = pd.read_csv(
        cclayerfile, header=None, names=['vertex', 'CC', 'layer', 'cc'], usecols=['vertex', 'layer', 'cc']
    )
    print('read', cclayerfile, file=sys.stderr)

    print('initializing profiles', file=sys.stderr)
    for vert, data in cclayers.groupby(['vertex']):
        if vert not in profile:
            profile[vert] = {}
        for v, l, cc in data.values:
            profile[v][f'{l}_{cc}'] = 0
    print('initialized', file=sys.stderr)

for layercsvfile in glob.glob(graph + '_layers/*.csv'):
    print('processing', layercsvfile, 'by chunks', file=sys.stderr)
    iter_csv = pd.read_csv(
        layercsvfile,
        header=None,
        names=['source', 'target', 'layer'],
        usecols=['source', 'target', 'layer'],
        iterator=True
    )
    c = 1
    for chunk in iter_csv:
        print('chunk:', c, file=sys.stderr)
        c += 1
        for s, t, l in chunk.values:
            lcc = set(profile[s]).intersection(profile[t])
            # if lcc:
            profile[s][lcc.pop()] += 1
            # else:
            #     print(s, t, l, profile[s], profile[t])
            #     print(set(profile[s]),set(profile[t]))

    print('processed all chunks of', cclayerfile, file=sys.stderr)

print(json.dumps(profile))
