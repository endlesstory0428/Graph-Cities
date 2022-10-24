import csv
import networkx as nx
import sys
from collections import defaultdict

graph = sys.argv[1]


prevWave = 0
prevFrag = 0
level = 0
wf2level = dict()
v2wf = dict()

with open(f'{graph}-wave-sources.csv') as f:
	reader = csv.reader(f)
	for row in reader:
		v, wave, frag = map(int, row)
		if wave != prevWave or frag != prevFrag:
			wf2level[(wave, frag)] = level
			level += 1
			prevWave = wave
			prevFrag = frag
		v2wf[v] = (wave, frag)

jumpEdgeList = []
spanEdgeList = []
layerEdgeList = []
with open(f'{graph}-waves.csv') as f:
	reader = csv.reader(f)
	for row in reader:
		src, tgt, wave, wcc, frag = map(int, row)
		srcLevel = wf2level[v2wf[src]]
		tgtLevel = wf2level[v2wf[tgt]]
		if srcLevel > tgtLevel:
			continue
		if srcLevel == tgtLevel and src > tgt:
			continue

		# if (tgtLevel == srcLevel) or (tgtLevel == srcLevel + 1):
		# 	spanEdgeList.append((src, tgt))
		# else:
		# 	jumpEdgeList.append((src, tgt))

		# if src == 2330:
		# 	print(srcLevel, tgtLevel)

		if tgtLevel == srcLevel:
			layerEdgeList.append((src, tgt))
		elif tgtLevel == srcLevel + 1:
			spanEdgeList.append((src, tgt))
		else:
			jumpEdgeList.append((src, tgt))


G = nx.Graph()
G.add_edges_from(layerEdgeList)

crossEdgeList = [*spanEdgeList, *jumpEdgeList]


dagPath = []
with open(f'{graph}-dagLongPath.csv') as f:
	reader = csv.reader(f)
	for row in reader:
		src, tgt = map(int, row)
		dagPath.append((src, tgt))

cc2vDict = dict()
v2ccDict = dict()
with open(f'{graph}-layerCC-idx.csv') as f:
	reader = csv.reader(f)
	for row in reader:
		v, ccIdx = map(int, row)
		cc2vDict[ccIdx] = v
		v2ccDict[v] = ccIdx

crossCCDict = dict()
for src, tgt in crossEdgeList:
	crossCCDict[(v2ccDict[src], v2ccDict[tgt])] = (src, tgt)

longList = []
longListVSet = set()
prevTgt = -1
for (srcCC, tgtCC) in dagPath:
	src, tgt = crossCCDict[(srcCC, tgtCC)]
	longListVSet.add(src)
	if (prevTgt != -1 and prevTgt != src):
		layerPath = nx.shortest_path(G, source = prevTgt, target = src)
		for layerEdge in zip(layerPath, layerPath[1:]):
			longList.append(layerEdge)
			longListVSet.add(layerEdge[0])
	longList.append((src, tgt))
	longListVSet.add(tgt)
	prevTgt = tgt

with open(f'{graph}-longPath.edge.csv', 'w', newline = '') as f:
	writer = csv.writer(f)
	for edge in longList:
		writer.writerow(edge)

with open(f'{graph}-longPath.vertex.csv', 'w', newline = '') as f:
	writer = csv.writer(f)
	for vertex in longListVSet:
		writer.writerow((vertex, ))