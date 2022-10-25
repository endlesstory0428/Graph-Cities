import csv
import glob
import sys
from collections import defaultdict
import itertools
import os
import time
import json

graph = sys.argv[1]

building2bucket = dict()
with open(f'{graph}/{graph}-lccBuck.l-lcc-b.csv') as f:
	reader = csv.reader(f)
	for row in reader:
		layer, lcc, buck = map(int, row)
		building2bucket[(layer, lcc)] = buck

mallVicinityList = []
building2vicinityNum = defaultdict(int)
building2largeNum = defaultdict(int)
largeFiles = glob.glob(f'{graph}/dag/*.large')
for largeFile in largeFiles:
	dagName = largeFile.split('/')[-1].split('.')[0]
	_, layer, lcc = dagName.split('_')
	layer = int(layer)
	lcc = int(lcc)
	with open(largeFile) as f:
		reader = csv.reader(f)
		for row in reader:
			nodeId, wave, frag, level, vSize, eSize, touchESize = map(int, row)
			density = 2.0 * eSize / vSize / (vSize-1)
			building2largeNum[(layer, lcc)] += 1
			if density >= 0.95:
				continue
			mallVicinityList.append((layer, lcc, building2bucket[(layer, lcc)], wave, frag, level, nodeId))
			building2vicinityNum[(layer, lcc)] += 1


addedFlag = False
with open(f'{graph}/cityMesh/SPIRAL.txt') as fr:
	with open(f'{graph}/cityMesh/SPIRALDAG.txt', 'w') as fw:
		for line1, line2 in itertools.zip_longest(fr, fr, fillvalue = ''):
			line1 = line1.strip('\n')
			line2 = line2.strip('\n')
			if not addedFlag and (len(line1.split(' ')) > 13):
				print('W: already added dagType')
				addedFlag = True
			if addedFlag:
				line1 = ' '.join(line1.split(' ')[:13])

			buildingName = line1.split(' ')[0]
			_, fp, lcc, _ = buildingName.split('_')
			fw.write(f'{line1} {building2vicinityNum[(int(fp), int(lcc))]} {building2largeNum[(int(fp), int(lcc))]}\n')
			fw.write(f'{line2}\n')

os.rename(f'{graph}/cityMesh/SPIRAL.txt', f'{graph}/cityMesh/SPIRAL.txt.{str(time.time())}.save')
os.rename(f'{graph}/cityMesh/SPIRALDAG.txt', f'{graph}/cityMesh/SPIRAL.txt')

with open(f'{graph}/mallVicinityList.json', 'w') as f:
	json.dump(mallVicinityList, f)
