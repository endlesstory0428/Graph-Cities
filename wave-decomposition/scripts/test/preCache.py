import numpy as np
import csv
import sys
import itertools
import glob
from collections import defaultdict
import json

if __name__ == '__main__':
	graph = sys.argv[1]

	bestBuildingSet = set()

	lcc2buck = dict()
	lcc2suffix = dict()
	with open(f'{graph}/{graph}-lccBuck.l-lcc-b.csv') as f:
		reader = csv.reader(f)
		for row in reader:
			l, lcc, buck = map(int, row)
			lcc2buck[(l, lcc)] = buck

	with open(f'{graph}/{graph}-summary.json') as f:
		data = json.load(f)
		buckNum = data['buckets']


	esize_data = []
	vsize_data = []
	name_data = []
	with open(f'{graph}/cityMesh/SPIRAL.txt') as f:
		for line1, line2 in itertools.zip_longest(f, f, fillvalue = ''):
			line1 = line1.strip('\n')
			line2 = line2.strip('\n')
			info = line1.split(' ')
			buildingName = info[0]
			_, layer, lcc, suffix = buildingName.split('_')
			lcc2suffix[(int(layer), int(lcc))] = int(suffix)
			name_data.append((int(layer), int(lcc)))
			esize_data.append(int(info[6]))
			vsize_data.append(int(info[5]))
	esize_data = np.array(esize_data)
	vsize_data = np.array(vsize_data)
	buildingNum = int(np.ceil(np.log2(len(esize_data) + 1)))
	largestIdx = np.argsort(esize_data)[- buildingNum:]

	for idx in largestIdx:
		layer, lcc = name_data[idx]
		bestBuildingSet.add((layer, lcc))


	dense_data = esize_data.astype(np.float32) * 2 / vsize_data / (vsize_data - 1) 

	mask = list(map(lambda x: lcc2buck[x] >= (buckNum / 2), name_data))
	masked_dense_data = dense_data[mask]
	if len(masked_dense_data) > buildingNum:
		densestIdx = np.argsort(masked_dense_data)[- buildingNum:]

		for idx in densestIdx:
			layer, lcc = name_data[idx]
			bestBuildingSet.add((layer, lcc))
	else:
		densestIdx = np.argsort(masked_dense_data)[- len(masked_dense_data):]

		for idx in densestIdx:
			layer, lcc = name_data[idx]
			bestBuildingSet.add((layer, lcc))


	floorInfoFileList = glob.glob(f'{graph}/cityMesh/wavemap_*_floor.txt')
	heigh_data = []
	floor_data = []
	name_data = []
	for floorInfoFile in floorInfoFileList:
		name_data.append(floorInfoFile.split('/')[-1])
		with open(floorInfoFile) as f:
			lines = f.readlines()
			floor_data.append(len(lines) / 3)
			heigh_data.append(float(lines[-1].split(' ')[1]))
	heigh_data = np.array(heigh_data)
	floor_data = np.array(floor_data)

	highestIdx = np.argsort(heigh_data)[- buildingNum:]

	for idx in highestIdx:
		buildingName = name_data[idx]
		_, layer, lcc, _, _ = buildingName.split('_')
		bestBuildingSet.add((int(layer), int(lcc)))

	tallestIdx = np.argsort(floor_data)[- buildingNum:]

	for idx in tallestIdx:
		buildingName = name_data[idx]
		_, layer, lcc, _, _ = buildingName.split('_')
		bestBuildingSet.add((int(layer), int(lcc)))


	wDeg = defaultdict(float)
	with open(f'{graph}/metagraph_normalized.txt') as f:
		reader = csv.reader(f)
		for row in reader:
			srcLayer, srcLcc, tgtLayer, tgtLcc= map(int, row[:4])
			w = float(row[4])
			wDeg[(srcLayer, srcLcc)] += w
			wDeg[(tgtLayer, tgtLcc)] += w
	
	name_data = []
	wDeg_data = []
	for key, val in wDeg.items():
		name_data.append(key)
		wDeg_data.append(val)

	diverse_data = np.array(wDeg_data)
	if len(diverse_data):
		diversestIdx = np.argsort(diverse_data)[- buildingNum:]

		for idx in diversestIdx:
			layer, lcc = name_data[idx]
			bestBuildingSet.add((layer, lcc))
	

	# bestBuildingList = list(bestBuildingSet)
	# for layer, lcc in sorted(bestBuildingSet):
	# 	print(layer, lcc)

	bestBuildingList = []
	for layer, lcc in bestBuildingSet:
		bestBuildingList.append({'layer': layer, 'lcc': lcc, 'buck': lcc2buck[(layer, lcc)], 'suf': lcc2suffix[(layer, lcc)]})
	with open(f'{graph}/{graph}-bestBuilding.json', 'w') as f:
		json.dump(bestBuildingList, f)