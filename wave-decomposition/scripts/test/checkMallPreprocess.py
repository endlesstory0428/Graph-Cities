import sys
import glob
import json
import os
import csv

graph = sys.argv[1]

missingList = []
largeFileList = glob.glob(f'{graph}/{graph}_waves/lccBuck/flt/' + '*large-info.json')
# print(largeFileList)
for largeFile in largeFileList:
	largeFileName = largeFile.split('/')[-1]
	buildingName = largeFileName[:-16]
	with open(largeFile) as f:
		info = json.load(f)
		del info['-1']
		for metaNode, (vSize, eSize, maxLabel) in info.items():
			density = 0
			if vSize == -1:
				print('I: gorilla miniCity')
			else:
				density = 2.0 * eSize / vSize / (vSize - 1)
				if density > 0.95:
					print(f'I: {buildingName}-{metaNode} is a large (quasi) clique')
					continue
			if not os.path.exists(f'{buildingName}-{metaNode}/{buildingName}-{metaNode}-summary.json'):
				print(f'W: {buildingName}-{metaNode} not preprocessed, density {density:6f}')
				missingList.append((buildingName, metaNode))
			elif not os.path.exists(f'../Graph_City_Web/index-{buildingName}-{metaNode}.html'):
				print(f'W: {buildingName}-{metaNode} not linked, density {density:6f}')
				missingList.append((buildingName, metaNode))

splitLabel = False
lcc2buck = dict()
if os.path.exists(f'{graph}/flag/SPLIT_LABEL.cfg'):
	splitLabel = True
	with open(f'{graph}/{graph}-lccBuck.l-lcc-b.csv') as f:
		reader = csv.reader(f)
		for row in reader:
			l, lcc, buck = map(int, row)
			lcc2buck[(l, lcc)] = buck
	

with open(f'{graph}/minicityRoomPreprocess.sh', 'w', newline = '') as f:
	for buildingName, metaNode in missingList:
		if splitLabel:
			prefix, layer, lcc = buildingName.split('-')
			bucket = lcc2buck[(int(layer), int(lcc))]
			labelFullPathName = os.path.realpath(f'{graph}/labels/layer-{layer}/buck-{bucket}.csv')
		else:
			labelFullPathName = os.path.realpath(f'{graph}/{graph}_label.csv')
		f.write(f'mkdir {buildingName}-{metaNode}\n')
		f.write(f'ln -s {labelFullPathName} $(pwd)/{buildingName}-{metaNode}/{buildingName}-{metaNode}_label.csv\n')
		f.write(f'ln -s $(pwd)/{graph}/{graph}_waves/lccBuck/flt/{buildingName}-{metaNode}.txt $(pwd)/{buildingName}-{metaNode}/{buildingName}-{metaNode}.txt\n')
		f.write(f'make GRAPH={buildingName}-{metaNode} PARENT={graph} prepareCity\n')

with open(f'{graph}/minicityRoomLink.sh', 'w', newline = '') as f:
	for buildingName, metaNode in missingList:
		f.write(f'make GRAPH={buildingName}-{metaNode} retrive-mall\n')
