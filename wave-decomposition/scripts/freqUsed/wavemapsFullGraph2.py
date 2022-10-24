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
	graph = g
	graph += '/' + graph

	wavemaps = glob.glob(f'{graph}_waves/wavemap_*.json')

	buildingList = []
	for wavemap in wavemaps:
		_, name = os.path.split(wavemap)
		if name.replace('-', '_').count('_') == 3:
			buildingList.append(name)
	return sortBuildingList(buildingList)



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
		with open(f'{graphPath}.txt', 'r') as file:
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
	with open(f'{graph}/{graph}_waves/{wavemap}', 'r') as f:
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
	with open(f'{graph}/{graph}_waves/{wavemap}', 'w') as f:
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