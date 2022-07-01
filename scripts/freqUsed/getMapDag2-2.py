import sys
import os
import json
import glob
import math
import csv

import gzip
import pickle as pkl

from collections import defaultdict

# class lccFileName(object):
# 	"""docstring for lccFileName"""
# 	def __init__(self, path, graph):
# 		super(lccFileName, self).__init__()
# 		self.path = path
# 		self.graph = graph
# 		self.nameList = self.getLccFileList()
# 		return

# 	def __getitem__(self, index):
# 		return self.getName(int(index))

# 	def getLccFileList(self):
# 		lccNameList = glob.glob(f'{self.path}{self.graph}/{self.graph}_layers/*.cc-layers')
# 		lccFileNameList = []
# 		for lccName in lccNameList:
# 			name = os.path.splitext((os.path.split(lccName)[1]))[0].split('-')[1:]
# 			if len(name) == 1:
# 				suffix, = map(int, name)
# 				lccFileNameList.append((None, suffix))
# 			else:
# 				prefix, suffix = map(int, name)
# 				lccFileNameList.append((prefix, suffix))
# 		lccFileNameList.sort(key = lambda x: x[1])
# 		return lccFileNameList

# 	def getName(self, layer):
# 		for prefix, suffix in self.nameList:
# 			if suffix < layer:
# 				continue
# 			else:
# 				break
# 		else:
# 			print(f'E: wrong layer {layer}')
# 			exit(-1)

# 		if prefix is None:
# 			assert layer == suffix, f'E: wrong layer {layer}'
# 		else:
# 			assert layer >= prefix, f'E: wrong layer {layer}'

# 		name = f'{suffix}' if prefix is None else f'{prefix}-{suffix}'
# 		return f'{self.path}{self.graph}/{self.graph}_layers/layer-{name}.cc-layers'


def logBucket(sizeDict, totalSize):
	maxSize = 0
	for waveSizeDict in sizeDict.values():
		if waveSizeDict > maxSize:
			maxSize = waveSizeDict

	baseThreshold = math.log(totalSize) / 2
	thresholdList = [0]
	bucketLength = 1
	while True:
		tempThreshold = math.floor(math.pow(baseThreshold, bucketLength))
		thresholdList.append(tempThreshold)
		bucketLength += 1
		if tempThreshold > maxSize:
			break

	print(thresholdList)

	bucketDict = dict()
	for idx, waveSizeDict in sizeDict.items():
		size = waveSizeDict
		for bucketIdx in range(bucketLength):
			if thresholdList[bucketIdx] > size:
				bucketDict[idx] = bucketIdx - 1
				break
	return bucketDict, thresholdList

if __name__ == '__main__':
	path = sys.argv[1]
	graph = sys.argv[2]

	# lfn = lccFileName(path, graph)
	# # print(lfn[1])

	with open(f'{path}{graph}/{graph}-metadata.json') as f:
		info = json.load(f)
		vSize = info['vertices']
		eSize = info['edges']

	with open(f'{path}{graph}/{graph}-layer-info.json') as f:
		info = json.load(f)
		layerList = map(int, info.keys())
		# vSize = info['vertices']
		# eSize = info['edges']
	print(layerList)

	lccVSizeDict = defaultdict(int)
	lccESizeDict = defaultdict(int)


	print('getting bucket ...')
	for layer in layerList:
		if layer == 0:
			continue
		print(f'processing layer info {layer}')
		with open(f'{path}{graph}/{graph}_layers/layer-{layer}.cc-info.json') as f:
			info = json.load(f)
			del info['-1']

			for lcc, lccInfo in info.items():
				lcc = int(lcc)
				lccVSizeDict[(layer, lcc)] += lccInfo['vertices']
				lccESizeDict[(layer, lcc)] += lccInfo['edges']

	lcc2Bucket, thresholdList = logBucket(lccESizeDict, vSize)

	layerBucket2Lcc = defaultdict(set)
	layerBucket2VSize = defaultdict(int)
	for idx, ((layer, lcc), bucket) in enumerate(lcc2Bucket.items()):
		layerBucket2Lcc[(layer, bucket)].add(lcc)
		layerBucket2VSize[(layer, bucket)] += lccVSizeDict[(layer, lcc)]
	# print(layerBucket2Lcc)
	# print(layerBucket2VSize)

	# with gzip.open(f'./{graph}-layerBucket2-lcc-vSize.pkl.gz', 'wb') as f:
	# 	pkl.dump((layerBucket2Lcc, layerBucket2VSize), f)

	layerBucket2Idx = dict()
	idx2LayerBucket = []
	layer2Bucket = defaultdict(list)
	for idx, (layer, bucket) in enumerate(sorted(layerBucket2VSize.keys())):
		layerBucket2Idx[(layer, bucket)] = idx
		idx2LayerBucket.append((idx, layer, bucket))
		layer2Bucket[layer].append(bucket)
	# print(layerBucket2Idx)
	# print(idx2LayerBucket)
	# print(layer2Bucket)

	with open(f'{path}{graph}/{graph}-idx2LayerBucket.i-l-b.csv', 'w', newline = '') as f:
		csvWriter = csv.writer(f)
		for row in idx2LayerBucket:
			csvWriter.writerow(row)

	del lccVSizeDict
	del lccESizeDict

	# layerList.sort()

	# for tempLayerIdx in range(len(layerList) - 1):
	# 	tempLayer = layerList[tempLayerIdx]
	# 	tempLayerFileName = lfn[tempLayer]
	# 	with open(tempLayerFileName) as f
	# 	tempBucketSet = layer2Bucket[tempLayer]
	# 	for nextLayerIdx in range(tempLayerIdx + 1, len(layerList)):
	# 		nextLayer = layerList[nextLayerIdx]
	# 		nextLayerFileName = lfn[nextLayer]

	# 		nextBucketSet = layer2Bucket[nextLayer]
	# 		for tempBucket in tempBucketSet:
	# 			for nextBucket in nextBucketSet:
	# 				print((tempLayer, tempBucket), (nextLayer, nextBucket))


	print('getting layerBucket edges ...')
	print('processing indexing')
	idx2LayerBucket = dict()
	with open(f'{path}{graph}/{graph}-fpmeta.ids') as f:
		csvReader = csv.reader(f)
		for row in csvReader:
			idx, layer, lcc = map(int, row)
			idx2LayerBucket[idx] = (layer, lcc2Bucket[(layer, lcc)])
	# print(idx2LayerBucket)

	print('processing edges')
	layerBucketEdgeDict = defaultdict(int)
	with open(f'{path}{graph}/{graph}-fpmeta.csv') as f:
		csvReader = csv.reader(f)
		for row in csvReader:
			x, y, w = map(int, row)
			xl, xb = idx2LayerBucket[x]
			yl, yb = idx2LayerBucket[y]
			assert xl < yl, f'E: wrong edge'
			x = layerBucket2Idx[(xl, xb)]
			y = layerBucket2Idx[(yl, yb)]
			layerBucketEdgeDict[(x, y)] += w
	# print(layerBucketEdgeDict)

	print('writing edges')
	with open(f'{path}{graph}/{graph}-layerBucketEdge.s-t-w.csv', 'w', newline = '') as f:
		csvWriter = csv.writer(f)
		for (s, t), w in layerBucketEdgeDict.items():
			csvWriter.writerow((s, t, w))