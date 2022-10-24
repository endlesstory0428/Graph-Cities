import csv
import networkx as nx
import sys

graph = sys.argv[1]

G = nx.DiGraph()
with open(f'{graph}-spanCC-edge.csv') as f:
	reader = csv.reader(f)
	for row in reader:
		src, tgt, weight = map(int, row)
		G.add_edge(src, tgt)

with open(f'{graph}-jumpCC-edge.csv') as f:
	reader = csv.reader(f)
	for row in reader:
		src, tgt, weight = map(int, row)
		G.add_edge(src, tgt)

path = nx.dag_longest_path(G)

with open(f'{graph}-dagLongPath.csv', 'w', newline = '') as f:
	writer = csv.writer(f)
	for edge in zip(path, path[1:]):
		writer.writerow(edge)