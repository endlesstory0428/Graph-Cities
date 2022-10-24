import sys
# import pandas as pd
import networkx as nx

MAX_EDGE = 3


def edeg(G, u, v):
    return G.degree[u] + G.degree[v] - 2


def sortedEdges(G):
    return sorted(G.edges, key=lambda x: edeg(G, *x))


def minEdge(G):
    return min(G.edges, key=lambda x: edeg(G, *x))


delim = ' '
if len(sys.argv) > 2:
    delim = sys.argv[2]

wave = lambda x:True
if len(sys.argv) > 3:
    wave = lambda x: int(x[2]) == int(sys.argv[3])

frag = lambda x:True
if len(sys.argv) > 4:
    frag = lambda x: int(x[4]) == int(sys.argv[4])

with open(sys.argv[1]) as f:
    # elist = [' '.join(x.strip().split(delim)[:2]) for x in f.readlines()]
    elist = []
    for x in f.readlines():
        xx = x.strip().split(delim)
        # print(xx)
        if wave(xx) and frag(xx):
            elist.append(' '.join(xx[:2]))


g = nx.parse_edgelist(elist, nodetype=int)

peels = {}


def peel():
    prev_deg = -1
    while g.number_of_edges() > 0:
        e = minEdge(g)
        deg = edeg(g, *e)
        if deg > prev_deg:
            prev_deg = deg
            peels[prev_deg] = nx.Graph()

        ean = set([tuple(sorted([e[0], x]))
            for x in g[e[0]]]).union([tuple(sorted([e[1], x])) for x in g[e[1]]])

        peels[prev_deg].add_edges_from(ean)
        g.remove_edges_from(ean)
