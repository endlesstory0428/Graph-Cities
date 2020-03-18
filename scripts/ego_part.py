import sys
import networkx as nx
# from MatchGraph import MatchGraph

cache = {}


def egonet(G, nodes):
    # return G.subgraph([u for nbrs in [list(G[x]) for x in nodes] for u in nbrs])
    key = tuple(sorted(nodes))
    if key in cache:
        return cache[key]
    cache[key] = G.subgraph([u for nbrs in [list(G[x]) for x in nodes] for u in nbrs])
    return cache[key]


def edeg(G, e):
    # return len([u for nbrs in [list(G[x]) for x in e] for u in nbrs])
    return G.degree[e[0]] + G.degree[e[1]] - 2
    # return egonet(G, e).number_of_edges()


def sortedEdges(G):
    return sorted(G.edges, key=lambda edge: edeg(G, edge))


def maxEdge(G):
    return max(G.edges, key=lambda edge: edeg(G, edge))


delim = ' '
if len(sys.argv) > 2:
    delim = sys.argv[2]

wave = lambda x: True
if len(sys.argv) > 3:
    wave = lambda x: int(x[2]) == int(sys.argv[3])

frag = lambda x: True
if len(sys.argv) > 4:
    frag = lambda x: int(x[4]) == int(sys.argv[4])

with open(sys.argv[1]) as f:
    elist = []
    for x in f.readlines():
        xx = x.strip().split(delim)
        # print(xx)
        if wave(xx) and frag(xx):
            elist.append(' '.join(xx[:2]))

g = nx.parse_edgelist(elist, nodetype=int)
elist = [x + " {'w':1}" for x in elist]
mg = nx.parse_edgelist(elist, nodetype=int)  #, create_using=MatchGraph)


def egomatch():
    while g.number_of_edges() > 0:
        e = maxEdge(g)
        ego = egonet(g, e)
        deg = ego.number_of_edges()
        print("Edge: ", e, "edeg: ", edeg(g, e), "egonet edges: ", deg)

        mg.remove_edges_from(list(ego.edges))
        for u, v in list(mg.edges):
            newe = None
            if u in ego:
                newe = (e[0], v)
            if v in ego:
                newe = (e[0], u)

            if newe is None: continue

            if newe in mg.edges:
                mg.edges[newe]['w'] += mg.edges[(u, v)]['w']
            else:
                mg.add_edge(*newe, w=mg.edges[(u, v)]['w'])
            mg.remove_edge(u, v)

        mg.add_edge(e[0], e[0], w=deg)

        nodes = list(ego.nodes)
        penum = g.number_of_edges()
        g.remove_nodes_from(nodes)
        aenum = g.number_of_edges()
        print("num edges removed: ", penum - aenum)

    mg.remove_nodes_from([x[0] for x in filter(lambda x: x[1] == 0, mg.degree)])
