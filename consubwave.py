#!/usr/bin/env python
import sys
import pandas as pd
from pprint import pprint


class DisjointSet(object):
    def __init__(self):
        self.leader = {}  # maps a member to the group's leader
        self.group = {}  # maps a group leader to the group (which is a set)

    def add(self, a, b):
        leadera = self.leader.get(a)
        leaderb = self.leader.get(b)
        if leadera is not None:
            if leaderb is not None:
                if leadera == leaderb: return  # nothing to do
                groupa = self.group[leadera]
                groupb = self.group[leaderb]
                if len(groupa) < len(groupb):
                    a, leadera, groupa, b, leaderb, groupb = b, leaderb, groupb, a, leadera, groupa  # noqa
                groupa |= groupb
                del self.group[leaderb]
                for k in groupb:
                    self.leader[k] = leadera
            else:
                self.group[leadera].add(b)
                self.leader[b] = leadera
        else:
            if leaderb is not None:
                self.group[leaderb].add(a)
                self.leader[a] = leaderb
            else:
                self.leader[a] = self.leader[b] = a
                self.group[a] = set([a, b])


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

ds = DisjointSet()


def w_union(df):
    cwwccs = df.get_values()
    for i in range(1, len(cwwccs)):
        ds.add(tuple(cwwccs[0][1:]), tuple(cwwccs[i][1:]))
    return len(cwwccs)


print('union-find')
clones = waves.groupby(['source']).apply(w_union).reset_index(name='num')
print('done')

print('writing')
with open(graph + '-subwave-map.dict', 'w') as f:
    pprint(ds.leader, stream=f)

with open(graph + '-subwave-groups.dict', 'w') as f:
    pprint(ds.group, stream=f)
print('wrote')
