import networkx as nx
import matplotlib.pyplot as plt
from itertools import combinations
import numpy as np
import json
from networkx.algorithms import tree
import sys

if __name__ == '__main__':
	graph = sys.argv[1]
	# graph = 'com-friendster'
	# graph = 'com-friendster-9-2'
	# with open(f'{graph}-bucketMap.json') as f:
	# 	bucketDict = json.load(f)

	G = nx.Graph()
	with open(f'../data/{graph}/SPIRAL.txt') as f:
		for l in f:
			if l[:4] != 'wave':
				continue
			line = l.split(' ')
			point = [float(line[1]), float(line[2])]
			original_name = line[0]
			point_name = "wavemap_"+original_name[8:]
			# G.add_node(point_name, pos = point, bucket = bucketDict['_'.join(original_name[8:].split('_')[:2])])
			G.add_node(point_name, pos = point)

	pos = nx.get_node_attributes(G, 'pos')
	# print(pos)
	# bucket = nx.get_node_attributes(G, 'bucket')
	
	with open(f'./{graph}/neighbors.txt') as fr:
		with open(f'./{graph}/neighbors_weighted.txt', 'w', newline = '') as fw:
			for l in fr:
				x, y = l.strip().split(' ')
				w = np.linalg.norm(np.array(pos[x]) - np.array(pos[y]))
				G.add_edge(x, y, weight = w)
				fw.write(f'{x} {y} {w}\n')

	# with open(f'./{graph}/neighbors.txt') as fr:
	# 	for l in fr:
	# 		x, y = l.strip().split(' ')
	# 		w = np.linalg.norm(np.array(pos[x]) - np.array(pos[y]))
	# 		G.add_edge(x, y, weight = w)

	
	# for x, y in combinations(G.nodes, 2):
	# 	# nx.draw(G, pos, with_labels = True, node_color = [bucket[v] for v in G.nodes()], cmap = plt.cm.Blues)
	# 	weight, path = nx.single_source_dijkstra(G, source = x, target = y)
	# 	# print(weight)
	# 	# print(path)
	# 	if len(path) == 2:
	# 		path_edges = (path, )
	# 	else:
	# 		path_edges = list(zip(path, path[1:]))
	# 	# print([bucket[vertex] for vertex in path])
	# 	temp = 0
	# 	upFlag = True
	# 	for buck in [bucket[vertex] for vertex in path]:
	# 		if buck < temp:
	# 			if upFlag:
	# 				upFlag = False
	# 			else:
	# 				print('W: not single peak', x, y)

	# 	# nx.draw_networkx_edges(G, pos, edgelist = path_edges, edge_color = 'r', width = 10)
	# 	# plt.axis('equal')
	# 	# plt.show()

	# # x = 'wavemap_2_13_1'
	# # y = 'wavemap_7_30601_1'
	# # nx.draw(G, pos, with_labels = True)
	# # weight, path = nx.single_source_dijkstra(G, source = x, target = y)
	# # print(weight)
	# # print(path)
	# # if len(path) == 2:
	# # 	path_edges = (path, )
	# # else:
	# # 	path_edges = list(zip(path, path[1:]))
	# # nx.draw_networkx_edges(G, pos, edgelist = path_edges, edge_color = 'r', width = 10)
	# # plt.axis('equal')
	# # plt.show()

	# mst = tree.minimum_spanning_edges(G, algorithm="prim", data=False)
	# edgelist = list(mst)
	# print(sorted(sorted(e) for e in edgelist))

	# # # # edgelist = [['wavemap_1_140109_1283', 'wavemap_1_62999_1884'],['wavemap_1_140109_1283', 'wavemap_22_919138_1'],['wavemap_1_140109_1283', 'wavemap_1_250725_1023'],['wavemap_18_2914315_48', 'wavemap_11_164183_1'],['wavemap_19_2571623_35', 'wavemap_10_196384_1'],['wavemap_11_164183_1', 'wavemap_5_2061_1'],['wavemap_15_3718944_45', 'wavemap_13_30471_1'],['wavemap_18_2914315_48', 'wavemap_19_2571623_35'],['wavemap_23_1433320_64', 'wavemap_18_2914315_48'],['wavemap_15_3718944_45', 'wavemap_23_1433320_64'],['wavemap_19_2571623_35', 'wavemap_21_3292172_25'],['wavemap_16_1362234_16', 'wavemap_4_1243_1'],['wavemap_13_3434164_105', 'wavemap_15_3718944_45'],['wavemap_21_3292172_25', 'wavemap_16_1362234_16'],['wavemap_16_1362234_16', 'wavemap_17_1851996_8'],['wavemap_25_3804978_8', 'wavemap_9_28722_1'],['wavemap_17_1851996_8', 'wavemap_25_3804978_8'],['wavemap_2_13_1', 'wavemap_3_42_1'],['wavemap_43_1965538_5', 'wavemap_2_13_1'],['wavemap_1_62999_1884', 'wavemap_3_3191982_27'],['wavemap_25_3804978_8', 'wavemap_43_1965538_5'],['wavemap_1_62999_1884', 'wavemap_19_239987_3'],['wavemap_1_250725_1023', 'wavemap_1_405063_798'],['wavemap_1_405063_798', 'wavemap_14_1037462_1'],['wavemap_22_919138_1', 'wavemap_8_27645_1'],['wavemap_17_389660_1', 'wavemap_7_30601_1'],['wavemap_1_405063_798', 'wavemap_8_4342010_162'],['wavemap_8_4342010_162', 'wavemap_11_2983724_385'],['wavemap_8_4342010_162', 'wavemap_17_389660_1'],['wavemap_11_2983724_385', 'wavemap_15_3515498_169'],['wavemap_11_2983724_385', 'wavemap_15_275340_1'],['wavemap_12_508033_1', 'wavemap_6_2182_1'],['wavemap_13_3434164_105', 'wavemap_12_508033_1'],['wavemap_15_3515498_169', 'wavemap_13_3434164_105']]

	# nx.draw(G, pos, with_labels = True)
	# nx.draw_networkx_edges(G, pos, edgelist = edgelist, edge_color = 'r', width = 10)
	# plt.axis('equal')
	# plt.show()