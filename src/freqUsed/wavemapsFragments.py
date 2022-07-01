import sys
import json
import glob
import os
from collections import defaultdict

# this script is used to add attribute ['f'] to wavemap, which contains the fragment info

def getBuildingList(g):
	graph = g
	graph += '/' + graph

	wavemaps = glob.glob(graph + '_waves/wavemap_*.json')

	buildingList = []
	for wavemap in wavemaps:
		_, name = os.path.split(wavemap)
		if name.replace('-', '_').count('_') == 3:
			buildingList.append(name)
	return buildingList


def getFragments(graph, wavemap, layer, lcc, wdist):
	print(f'read {wavemap}')
	with open(f'{graph}/{graph}_waves/{wavemap}', 'r') as f:
		data = json.load(f)

	

	wsizes = {}
	for w, wccdist in wdist.items():
		if 'vertices' in wccdist:
			del wccdist['vertices']
		if 'edges' in wccdist:
			del wccdist['edges']

		wsizes[int(w)] = {'f': defaultdict(int)}

		for wcc, info in wccdist.items():
			if info['layer-cc'] == lcc:
				for frag, fragData in info['fragments'].items():
					wsizes[int(w)]['f'][int(frag)] += fragData['edges']

	for wave, waveData in data.items():
		data[wave]['f'] = list(wsizes[int(wave)]['f'].values())

	print(f'save {wavemap}')
	with open(f'{graph}/{graph}_waves/{wavemap}', 'w') as f:
		json.dump(data, f, indent='\t')

def readWaveInfo(graph, layer):
	wavedistfile = f'{graph}/{graph}_waves/layer-{layer}-waves-info.json'
	with open(wavedistfile) as infile:
		wdist = json.load(infile)
		del wdist['0']
	return wdist

if __name__ == '__main__':
	graph = sys.argv[1]
	buildingList = getBuildingList(graph)

	tempLayer = -1
	for building in sorted(buildingList):
		_, layer, lcc, _ = building.replace('-', '_').split('_')
		if layer != tempLayer:
			wdist = readWaveInfo(graph, layer)
			tempLayer = layer

		getFragments(graph, building, int(layer), int(lcc), wdist)