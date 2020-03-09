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

with open(sys.argv[1]) as f:
    elist = [' '.join(x.strip().split(delim)[:2]) for x in f.readlines()]

g = nx.parse_edgelist(elist, nodetype=int)

peels = {}


def peel():
    prev_deg = 1
    while g.number_of_edges() > 0:
        e = minEdge(g)
        deg = edeg(g, *e)
        if deg > prev_deg:
            prev_deg = deg
        ean = set([tuple(sorted([e[0], x]))
                   for x in g[e[0]]]).union([tuple(sorted([e[1], x])) for x in g[e[1]]])
        peels[prev_deg] = peels.get(prev_deg, []) + list(ean)
        g.remove_edges_from(ean)
