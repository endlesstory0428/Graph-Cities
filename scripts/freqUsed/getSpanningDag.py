import networkx as nx
import sys
import csv

def topological_sort_grouped(G):
    indegree_map = {v: d for v, d in G.in_degree() if d > 0}
    zero_indegree = [v for v, d in G.in_degree() if d == 0]
    while zero_indegree:
        yield zero_indegree
        new_zero_indegree = []
        for v in zero_indegree:
            for _, child in G.edges(v):
                indegree_map[child] -= 1
                if not indegree_map[child]:
                    new_zero_indegree.append(child)
        zero_indegree = new_zero_indegree

if __name__ == '__main__':
	graph = sys.argv[1]
	print('here')
	# G = nx.read_weighted_edgelist(f'{graph}-layerBucketEdge.s-t-w.csv', create_using = nx.DiGraph, delimiter = ',', nodetype = int)
	G = nx.read_weighted_edgelist(f'{graph}.csv', create_using = nx.DiGraph, delimiter = ',', nodetype = int)
	
	# print(G.edges)
	
	idx2Level = dict()
	levelGroup = topological_sort_grouped(G)
	levelSizeList = []
	for level, idxList in enumerate(levelGroup):
		levelSizeList.append(len(idxList))
		for idx in idxList:
			idx2Level[idx] = level
	print(levelSizeList)

	with open(f'{graph}.span.csv', 'w', newline = '') as f:
		csvWriter = csv.writer(f)

		for s, tDict in G.adj.items():
			sLevel = idx2Level[s]
			for t, tInfo in tDict.items():
				if idx2Level[t] != sLevel + 1:
					continue
				w = tInfo['weight']
				csvWriter.writerow((s, t, w))