#!/usr/bin/env python3
import sys
import glob
import pandas as pd
from itertools import islice

try:
    graph_name = sys.argv[1]
    graph_pre = graph_name + '/' + graph_name
except IndexError:
    print(
        """fpquery: query fixed points

    Usage:
        fpquery.py <data-set> <inputs file>
        fpquery.py <data-set> <layer> <connected component>
""",
        file=sys.stderr
    )
    sys.exit(1)

suffixs = glob.glob(graph_pre + '_layers/*.cc-layers')

df = pd.DataFrame()
for cclfile in suffixs:
    print('Reading: ', cclfile)
    with open(cclfile) as f:
        verts = pd.read_csv(
            f, header=None, names=['vertex', 'CC', 'l', 'cc'], usecols=['vertex', 'l', 'cc']
        )
    print('Read: ', cclfile)
    df = df.append(verts, ignore_index=True)
    print('Appended: ', cclfile)

print("Sorting")
df.sort_values(by=['vertex', 'l', 'cc'], inplace=True)
print("Sorted")

print('Indexing metanodes')
id2lcc = df.drop(
    'vertex', axis=1
).drop_duplicates().sort_values(by=['l', 'cc']).reset_index(drop=True)
lcc2id = id2lcc.groupby(['l', 'cc']).groups
print('Indexed metanodes')


def mid(lcc):
    return lcc2id[lcc][0]


print('Collecting metaedges')
dfv = df.values
pv = -1
cpi = 0
medges = {}
for i in range(len(dfv)):
    v, l, cc = dfv[i]
    if v != pv:
        pv = v
        cpi = i
    for j in range(cpi, i):
        edge = (mid(tuple(dfv[j][1:])), mid((l, cc)))
        medges[edge] = medges.get(edge, 0) + 1
print('Collected metaedges')

# print('Building LUT')
# vertlut = {}
# for grp, verts in lccgroups:
#     vertlut[grp] = set(verts['vertex'])
# print('Built LUT')
# lgroups = df.drop('vertex', axis=1).drop_duplicates().sort_values(by=['l', 'cc']).groupby(['l'])
# print('Collecting metaedges')
# medges = {}
# for ll, ccl in lgroups:
#     if ll == 1:
#         continue
#     for lh, cch in filter(lambda x: x[0] > ll, lgroups):
#         # print(ll, lh)
#         # print(ccl, '\n', cch)
#         for s in ccl.values:
#             for t in cch.values:
#                 src, tgt = tuple(s), tuple(t)
#                 # svs = lccgroups.get_group(src)['vertex']
#                 # svs = df.loc[lccgroups.groups[src]]['vertex']
#                 svs = vertlut[src]
#                 # tvs = lccgroups.get_group(tgt)['vertex']
#                 # tvs = df.loc[lccgroups.groups[tgt]]['vertex']
#                 tvs = vertlut[tgt]
#                 # w = svs.isin(tvs).sum()
#                 w = len(svs & tvs)
#                 # w = 0
#                 if w > 0:
#                     edge = (mid(src), mid(tgt))
#                     medges[edge] = w
# print('Collected metaedges')

# print('Collecting metaedges')
# medges = {}
# for v in df.groupby(['vertex']):
#     print(v)
#     mn = v[1].groupby(['l', 'cc']).groups
#     for i, s in zip(range(len(mn)), mn):
#         for t in islice(mn, i, len(mn)):
#             edge = (mid(s), mid(t))
#             medges[edge] = medges.get(edge, 0) + 1
#             medges.append(edge)
# print('Collected metaedges')

print('Preparing metaedges')
metaedges = pd.DataFrame.from_dict(medges, orient='index').sort_index()
metaedges.index = pd.MultiIndex.from_tuples(metaedges.index, names=['s', 't'])
print('Prepared metaedges')

print('Writing metaedges')
metaedges.to_csv(graph_pre + '-fpmeta.csv', header=None)
print('Writing metanodes')
id2lcc.to_csv(graph_pre + '-fpmeta.ids', header=None)
print('Done')
