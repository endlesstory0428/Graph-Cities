#!/usr/bin/env python3
import sys
import pandas as pd

graph = sys.argv[1]
graph += '/' + graph
layer = sys.argv[2]

graph += '_waves/layer-' + str(layer)
wavecsvfile = graph + '-waves.csv'

print('reading')
waves = pd.read_csv(
    wavecsvfile,
    header=None,
    names=['source', 'target', 'Wave', 'wcc', 'Level'],
    usecols=['source', 'Wave', 'wcc']
).drop_duplicates().reset_index(drop=True)
print('read')

print('counting')
waves.sort_values(by='Wave', inplace=True)
waves.sort_values(by='source', kind='mergesort', inplace=True)
# clones = waves.groupby(['source']).size().reset_index(name='num').query('num>1')
mg = {}
prevsrc = -1
srcwwcc = None
# chkcnt = 1
for s, w, c in waves.get_values():
    if s == prevsrc:
        mg[(*srcwwcc, w, c)] = mg.get((*srcwwcc, w, c), 0) + 1
        # chkcnt += 1
        assert (srcwwcc[0] < w)
    else:
        # chk = clones.query('source==@prevsrc')['num'].get_values()
        # if chk:
        #     if chkcnt != chk[0]:
        #         print(chkcnt, chk)
        #         assert (False)
        srcwwcc = (w, c)
        prevsrc = s
        # chkcnt = 1
print('done')

print('writing')
with open(graph + '-metaedges.csv', 'w') as f:
    for x in mg.items():
        print(*x[0], x[1], sep=',', file=f)
print('wrote')
