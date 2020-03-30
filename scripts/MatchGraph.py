import networkx as nx


def maximal_matching(G):
    return nx.maximal_matching(G)


class MatchGraph(nx.Graph):
    def __init__(self):
        super().__init__()
        self.ds = nx.utils.UnionFind()

    def add_node(self, node_for_adding, **attr):
        super().add_node(node_for_adding, **attr)
        self.ds.union(node_for_adding)

    def add_nodes_from(self, nodes_for_adding, **attr):
        super().add_nodes_from(nodes_for_adding, **attr)
        for node in nodes_for_adding:
            self.ds.union(node)

    def add_edge(self, u_of_edge, v_of_edge, **attr):
        super().add_edge(u_of_edge, v_of_edge, **attr)
        self.ds.union(u_of_edge)
        self.ds.union(v_of_edge)

    def add_edges_from(self, ebunch_to_add, **attr):
        super().add_edges_from(ebunch_to_add, **attr)
        for u in self.nodes:
            self.ds.union(u)

    def add_weighted_edges_from(self, ebunch_to_add, weight='w', **attr):
        super().add_weighted_edges_from(ebunch_to_add, weight, **attr)
        for u in self.nodes:
            self.ds.union(u)

    def add_weighted_edge(self, u_of_edge, v_of_edge, w_of_edge, weight='w'):
        u, v = u_of_edge, v_of_edge
        # add nodes
        if u not in self._node:
            self._adj[u] = self.adjlist_inner_dict_factory()
            self._node[u] = self.node_attr_dict_factory()
        if v not in self._node:
            self._adj[v] = self.adjlist_inner_dict_factory()
            self._node[v] = self.node_attr_dict_factory()
        # add the edge
        datadict = self._adj[u].get(v, self.edge_attr_dict_factory())
        datadict[weight] = datadict.get(weight, 0) + w_of_edge
        self._adj[u][v] = datadict
        self._adj[v][u] = datadict

    def relabel(self, lbl, weight='w'):
        for u, v in self.edges:
            if u == lbl[u] and v == lbl[v]:
                continue
            self.add_weighted_edge(lbl[u], lbl[v], self.edges[(u, v)][weight])
            self.remove_edge(u, v)

    def matchAndMerge(self):
        for x in maximal_matching(self):
            self.ds.union(*x)
        self.relabel(self.ds.parents)

    def merge(self, nodes_to_merge):
        self.ds.union(*nodes_to_merge)
        self.relabel(self.ds.parents)
        return self.ds.parents[nodes_to_merge[0]]


# G = MatchGraph()

# G.add_edges_from(
#     [
#         (0, 0), (0, 4), (0, 5), (0, 2), (0, 6), (4, 4), (4, 9), (4, 2), (4, 6), (5, 5), (5, 6),
#         (5, 2), (5, 9), (6, 6), (6, 9)
#     ],
#     w=1
# )
