import json
import glob
import sys
# import os

graph = sys.argv[1]
infoFileList = glob.glob(f'{graph}/{graph}_waves/layer-*-wavedecomp-info.json')
layerList = map(lambda x: int(x.split('-')[-3]), infoFileList)

waveTimeSum = 0
timeData = dict()
for layer in layerList:
	with open(f'{graph}/{graph}_waves/layer-{layer}-wavedecomp-info.json') as f:
		data = json.load(f)
		# fp = int(infoFile.split('-')[-3])
		waveTime = data['wave-time']
		labelTime = data['label-time']
		algTime = data['wave-time'] + data['label-time']
		IOTime = data['preprocessing-time'] + data['write-time']
		with open(f'{graph}/{graph}_waves/layer-{layer}-waves-info.json') as fwave:
			waveData = json.load(fwave)

		waveTimeSum += waveTime

		timeData[layer] = {'edges': data['edges'], 'vertices': data['vertices'], 'waveTime': waveTime, 'labelTime': labelTime, 'IOTime': IOTime, 'algTime': algTime, 'waves': len(waveData) - 1}

with open(f'{graph}/{graph}-wave-time2.json', 'w') as f:
	json.dump(timeData, f, sort_keys = True)

print(waveTimeSum)