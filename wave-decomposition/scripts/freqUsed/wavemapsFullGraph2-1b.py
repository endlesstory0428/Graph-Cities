import sys
import json
import glob
import pandas as pd
from collections import defaultdict
import os
from functools import lru_cache
import csv
import gzip
import pickle as pkl
import time

# this script is used to add the attributes ['ge'], ['gt'] to wavemaps, which contains the global (the whole graph) connection information

@lru_cache(maxsize = 1)
def getVertexProfile(g, layerBucket):
	graph = g
	graph += '/' + graph

	cclayerfile = f'{graph}_layers/{layerBucket}.cc-layers'

	vert2lcc = defaultdict(dict)
	print('reading', cclayerfile)
	cclayers = pd.read_csv(
		cclayerfile,
		header=None,
		names=['vertex', 'CC', 'layer', 'cc'],
		usecols=['vertex', 'layer', 'cc']
	)
	# cclayers.drop(['layer'], axis=1, inplace=True)
	print('read', cclayerfile)
	print('processing', cclayerfile)
	for v, l, cc in cclayers.values:
		vert2lcc[v][l] = cc
	print('processed', cclayerfile)
	del cclayers
	return vert2lcc


def sortBuildingList(buildingList):
	def getFileName(buildingFile):
		return os.path.splitext(os.path.split(buildingFile)[1])[0]
	def getLayer(fileName):
		return fileName.replace('-', '_').split('_')[1]
	buildingList.sort(key = lambda file: int(getLayer(getFileName(file))))
	return buildingList

def getBuildingList(g):
	# graph = g
	# graph += '/' + graph

	# wavemaps = glob.glob(f'{graph}_waves/wavemap_*.json')

	# buildingList = []
	# for wavemap in wavemaps:
	# 	_, name = os.path.split(wavemap)
	# 	if name.replace('-', '_').count('_') == 3:
	# 		buildingList.append(name)
	# return sortBuildingList(buildingList)
	buildingList = ['wavemap_10_144164_9.json', 'wavemap_10_93910617_37.json', 'wavemap_11_55219468_3.json', 'wavemap_11_9680736_1.json', 'wavemap_12_5372177_1.json', 'wavemap_12_70231190_60.json', 'wavemap_13_3021003_42.json', 'wavemap_13_3623767_2.json', 'wavemap_14_9604080_40.json', 'wavemap_15_102063163_8.json', 'wavemap_16_15590254_20.json', 'wavemap_17_66028390_1.json', 'wavemap_17_80152_13.json', 'wavemap_18_226712_1.json', 'wavemap_18_4991482_17.json', 'wavemap_19_46350580_2.json', 'wavemap_19_57201277_15.json', 'wavemap_20_54174676_2.json', 'wavemap_20_76810067_8.json', 'wavemap_21_29250937_3.json', 'wavemap_21_37568_1.json', 'wavemap_22_21269245_5.json', 'wavemap_22_30273184_2.json', 'wavemap_23_779879_6.json', 'wavemap_24_49855703_2.json', 'wavemap_24_93911725_1.json', 'wavemap_26_1975913_1.json', 'wavemap_26_21661813_3.json', 'wavemap_27_31806645_4.json', 'wavemap_28_21677375_2.json', 'wavemap_28_28168_2.json', 'wavemap_29_67206518_1.json', 'wavemap_2_2317628_2.json', 'wavemap_2_44699_9.json', 'wavemap_2_65849649_1.json', 'wavemap_2_76138520_89.json', 'wavemap_30_22435412_1.json', 'wavemap_30_78972708_1.json', 'wavemap_31_95394279_1.json', 'wavemap_32_20556195_2.json', 'wavemap_32_57877_2.json', 'wavemap_33_78786282_1.json', 'wavemap_33_78967183_1.json', 'wavemap_34_15047408_1.json', 'wavemap_35_8178149_1.json', 'wavemap_36_70150864_1.json', 'wavemap_37_49855555_4.json', 'wavemap_39_20449271_2.json', 'wavemap_3_47317_1.json', 'wavemap_3_55504710_1.json', 'wavemap_3_91244566_23.json', 'wavemap_40_12901469_1.json', 'wavemap_43_93901095_1.json', 'wavemap_44_40658289_1.json', 'wavemap_45_9044867_2.json', 'wavemap_46_56212432_1.json', 'wavemap_49_33568032_2.json', 'wavemap_4_21145287_169.json', 'wavemap_4_40510945_21.json', 'wavemap_51_49855703_1.json', 'wavemap_52_90655053_1.json', 'wavemap_59_111205804_1.json', 'wavemap_5_10030_53.json', 'wavemap_60_69348691_1.json', 'wavemap_68_49855703_1.json', 'wavemap_6_28671737_22.json', 'wavemap_6_48874534_115.json', 'wavemap_7_31989914_3.json', 'wavemap_7_36109958_94.json', 'wavemap_7_44044218_67.json', 'wavemap_8_12739645_38.json', 'wavemap_8_6424183_26.json', 'wavemap_93_69651741_1.json', 'wavemap_9_14333_1.json', 'wavemap_9_25816_107.json', 'wavemap_9_7916784_30.json']
	return buildingList[36:]



def getLayerBucket(g, layer):
	graph = g
	graph += '/' + graph

	cclayerfiles = glob.glob(graph + '_layers/*.cc-layers')
	layerBucketList = [os.path.splitext(os.path.split(file)[1])[0] for file in cclayerfiles]
	for layerBucket in layerBucketList:
		bucket = layerBucket.split('-')[1:]
		if len(bucket) == 1:
			if int(layer) == int(bucket[0]):
				return layerBucket
		elif len(bucket) == 2:
			if int(bucket[0]) <= int(layer) <= int(bucket[1]):
				return layerBucket
	else:
		print('E: cannot find layerBucket')
		return


def getFullGraphTarget(graph, wavemap, vertProfile, waveIdxDict, layer, lcc):
	def checkFullGraph(graph, sourcesDict):
		# print({wave: len(source) for wave, source in sourcesDict.items()})
		graphPath = f'{graph}/{graph}'
		gtDict = defaultdict(set)
		geDict = defaultdict(int)

		edgeCount = 0
		with gzip.open(f'hz333test/com-friendster.ungraph.txt.gz', 'rt') as file:
			print('checking graph')
			csvReader = csv.reader(file, delimiter = '\t')
			# for i in range(4):
			# 	print(next(csvReader))
			for row in csvReader:
				if row[0][0] == '#':
					continue
				edgeCount += 1
				if edgeCount % 10_000_000 == 0:
					print(edgeCount)
				s, t = map(int, row)
				for wave, sources in sourcesDict.items():
					if s in sources:
						gtDict[wave].add(t)
						geDict[wave] += 1
					if t in sources:
						gtDict[wave].add(s)
						geDict[wave] += 1

		for wave, gtSet in gtDict.items():
			gtDict[wave] = gtDict[wave] - sourcesDict[wave]
		gtSizeDict = {wave: len(targets) for wave, targets in gtDict.items()}
		# print(len(gtDict))
		# print(gtSizeDict)
		# print(geDict)
		del gtDict
		return gtSizeDict, geDict

	print(f'read {wavemap}')
	with open(f'com-friendster-wm/{wavemap}', 'r') as f:
		data = json.load(f)


	processedEdges = 0

	sourcesDict = dict()
	sourcesCount = 0
	for wave, waveData in data.items():
		wave = int(wave)
		sources = {v for v in waveIdxDict[wave] if vertProfile[v][layer] == lcc}
		sourcesDict[wave] = sources
		sourcesCount += len(sources)

		if len(sourcesDict) >= 5 and sourcesCount >= 10_000_000:
			print('chunk')
			gtDict, geDict = checkFullGraph(graph, sourcesDict)

			for wave in sourcesDict.keys():
				data[str(wave)]['gt'] = gtDict[wave]
				data[str(wave)]['ge'] = geDict[wave] - 2 * data[str(wave)]['ie']
				processedEdges += data[str(wave)]['ie']

			del sourcesDict
			sourcesDict = dict()
			sourcesCount = 0
			del gtDict
			del geDict

	if sourcesDict:
		gtDict, geDict = checkFullGraph(graph, sourcesDict)

		for wave in sourcesDict.keys():
			data[str(wave)]['gt'] = gtDict[wave]
			data[str(wave)]['ge'] = geDict[wave] - 2 * data[str(wave)]['ie']
			processedEdges += data[str(wave)]['ie']

		del sourcesDict
		sourcesDict = dict()
		sourcesCount = 0
		del gtDict
		del geDict

	print(f'save {wavemap}')
	with open(f'temp-wavemap/{wavemap}', 'w') as f:
		json.dump(data, f, indent='\t')

	return processedEdges


def getWaveIdx(graph, layer):
	print('read wave sources', layer)
	sourceFile = f'{graph}/{graph}_waves/layer-{layer}-wave-sources.csv'
	vert2WaveDict = pd.read_csv(sourceFile, header = None, names = ['vertex', 'wave', 'fragment'], usecols=['vertex', 'wave']).set_index('vertex').transpose().to_dict(orient='index')['wave']
	wave2VertDict = defaultdict(list)
	print('inverting')
	for v, w in vert2WaveDict.items():
		wave2VertDict[w].append(v)
	with gzip.open(f'./{graph}-{layer}-wave2VertDict.pkl.gz', 'wb') as file:
		pkl.dump(wave2VertDict, file)
	return wave2VertDict

# def getWaveIdx(graph, layer):
# 	print('read wave sources', layer)
# 	sourceFile = f'{graph}/{graph}_waves/layer-{layer}-wave-sources.csv'
# 	vert2WaveDict = pd.read_csv(sourceFile, header = None, names = ['vertex', 'wave', 'fragment'], usecols=['vertex', 'wave'])
# 	wave2VertDict = defaultdict(list)
# 	print('inverting')
# 	for v, w in vert2WaveDict.values:
# 		wave2VertDict[w].append(v)
# 	with gzip.open(f'./{graph}-{layer}-wave2VertDict.pkl.gz', 'wb') as file:
# 		pkl.dump(wave2VertDict, file)
# 	return wave2VertDict


if __name__ == '__main__':
	graph = sys.argv[1]
	buildingList = getBuildingList(graph)
	print(buildingList)
	print(len(buildingList))

	startTime = time.time()
	totalProcessed = 0

	tempLayer = -1
	for building in buildingList:

		_, layer, lcc, _ = building.replace('-', '_').split('_')
		if layer != tempLayer:
			waveIdxDict = getWaveIdx(graph, layer)
			layerBucket = getLayerBucket(graph, layer)
			vertProfile = getVertexProfile(graph, layerBucket)
			tempLayer = layer

		processedEdges = getFullGraphTarget(graph, building, vertProfile, waveIdxDict, int(layer), int(lcc))
		totalProcessed += processedEdges
		tempTime = time.time()
		print(f'#e: {totalProcessed}, t: {tempTime - startTime}, #e/sec: {totalProcessed / (tempTime - startTime)}')