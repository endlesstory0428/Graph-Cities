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

v2layerCC = dict()
layerCC2size = dict()
layerCC2wf = dict()
ccIdx = 0
for cc in nx.connected_components(G):
	vSize = len(cc)
	eSize = G.subgraph(cc).size()
	layerCC2size[ccIdx] = (vSize, eSize)
	for v in cc:
		v2layerCC[v] = ccIdx
		layerCC2wf[ccIdx] = v2wf[v]
	ccIdx += 1

spanCCEdgeList = defaultdict(int)
for src, tgt in spanEdgeList:
	if src not in v2layerCC:
		v2layerCC[src] = ccIdx
		layerCC2size[ccIdx] = (1, 0)
		layerCC2wf[ccIdx] = v2wf[src]
		ccIdx += 1
	if tgt not in v2layerCC:
		v2layerCC[tgt] = ccIdx
		layerCC2size[ccIdx] = (1, 0)
		layerCC2wf[ccIdx] = v2wf[tgt]
		ccIdx += 1
	spanCCEdgeList[(v2layerCC[src], v2layerCC[tgt])] += 1

jumpCCEdgeList = defaultdict(int)
for src, tgt in jumpEdgeList:
	if src not in v2layerCC:
		v2layerCC[src] = ccIdx
		layerCC2size[ccIdx] = (1, 0)
		layerCC2wf[ccIdx] = v2wf[src]
		ccIdx += 1
	if tgt not in v2layerCC:
		v2layerCC[tgt] = ccIdx
		layerCC2size[ccIdx] = (1, 0)
		layerCC2wf[ccIdx] = v2wf[tgt]
		ccIdx += 1
	jumpCCEdgeList[(v2layerCC[src], v2layerCC[tgt])] += 1


with open(f'{graph}-layerCC-idx.csv', 'w', newline = '') as f:
	writer = csv.writer(f)
	for v, idx in v2layerCC.items():
		writer.writerow((v, idx))

with open(f'{graph}-layerCC-size.csv', 'w', newline = '') as f:
	writer = csv.writer(f)
	for idx, (vSize, eSize) in layerCC2size.items():
		writer.writerow((idx, vSize, eSize))

with open(f'{graph}-layerCC-wf.csv', 'w', newline = '') as f:
	writer = csv.writer(f)
	for idx, (wave, frag) in layerCC2wf.items():
		writer.writerow((idx, wave, frag))

with open(f'{graph}-spanCC-edge.csv', 'w', newline = '') as f:
	writer = csv.writer(f)
	for (src, tgt), weight in spanCCEdgeList.items():
		writer.writerow((src, tgt, weight))

with open(f'{graph}-jumpCC-edge.csv', 'w', newline = '') as f:
	writer = csv.writer(f)
	for (src, tgt), weight in jumpCCEdgeList.items():
		writer.writerow((src, tgt, weight))