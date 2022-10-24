import sys
import os
import json
import glob
import math
import csv

from collections import defaultdict

def logBucket(sizeDict, totalSize):
	maxSize = 0
	for waveSizeDict in sizeDict.values():
		if waveSizeDict['total'] > maxSize:
			maxSize = waveSizeDict['total']

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
		size = waveSizeDict['total']
		for bucketIdx in range(bucketLength):
			if thresholdList[bucketIdx] > size:
				bucketDict[idx] = bucketIdx - 1
				break
	return bucketDict, thresholdList

if __name__ == '__main__':
	path = sys.argv[1]
	graph = sys.argv[2]
	print(graph)

	with open(f'{path}{graph}/{graph}-metadata.json') as f:
		info = json.load(f)
		vSize = info['vertices']
		eSize = info['edges']

	with open(f'{path}{graph}/{graph}-layer-info.json') as f:
		info = json.load(f)
		layerList = list(map(int, info.keys()))
		# vSize = info['vertices']
		# eSize = info['edges']
	print(layerList)

	lccWaveVSizeDict = defaultdict(lambda :defaultdict(int))
	lccWaveESizeDict = defaultdict(lambda :defaultdict(int))
	lccWaveSourceDict = defaultdict(lambda :defaultdict(int))

	for layer in layerList:
		if layer == 0:
			continue
		print(f'processing layer info {layer}')
		with open(f'{path}{graph}/{graph}_layers/layer-{layer}.cc-info.json') as f:
			info = json.load(f)
			del info['-1']

			for lcc, lccInfo in info.items():
				lcc = int(lcc)
				lccWaveVSizeDict[(layer, lcc)]['total'] = lccInfo['vertices']
				lccWaveESizeDict[(layer, lcc)]['total'] = lccInfo['edges']

	# for layer in layerList:
	# 	# if layer == 1:
	# 	# 	continue
	# 	print(f'processing layer {layer}')
	# 	with open(f'{path}{graph}/{graph}_waves/layer-{layer}-waves-info.json') as f:
	# 		info = json.load(f)
	# 		del info['0']

	# 		for wave, waveInfo in info.items():
	# 			wave = int(wave)
	# 			del waveInfo['vertices']
	# 			del waveInfo['edges']

	# 			for wcc, wccInfo in waveInfo.items():
	# 				lcc = wccInfo['layer-cc']
	# 				lccWaveVSizeDict[(layer, lcc)][wave] += wccInfo['vertices']
	# 				# lccWaveVSizeDict[(layer, lcc)]['total'] += wccInfo['vertices']
	# 				lccWaveESizeDict[(layer, lcc)][wave] += wccInfo['edges']
	# 				# lccWaveESizeDict[(layer, lcc)]['total'] += wccInfo['edges']
	# 				lccWaveSourceDict[(layer, lcc)][wave] += wccInfo['fragments']['0']['sources']
	# # print(lccWaveESizeDict)

	lcc2Bucket, thresholdList = logBucket(lccWaveESizeDict, vSize)
	# print(lcc2Bucket)
	bucketSet = set()
	with open(f'{path}{graph}/{graph}-lccBuck.l-lcc-b-v-e.csv', 'w', newline = '') as f:
		csvWriter = csv.writer(f)
		for (l, lcc), bucket in lcc2Bucket.items():
			csvWriter.writerow((l, lcc, bucket, lccWaveVSizeDict[(l, lcc)]['total'], lccWaveESizeDict[(l, lcc)]['total']))
			bucketSet.add(bucket)

	# bucket2lcc = defaultdict(list)
	# for lcc, bucket in lcc2Bucket.items():
	# 	bucket2lcc[bucket].append(lcc)
	# for bucket in range(len(bucket2lcc)):
	# 	print(len(bucket2lcc[bucket]))

	# lccBucketInfo = defaultdict(dict)
	# for bucket, threshold in enumerate(thresholdList[:-1]):
	# 	# lccBucketInfo[bucket] = dict()
	# 	# lccBucketInfo[bucket]['bucket'] = bucket
	# 	lccBucketInfo[bucket]['threshold'] = threshold
	# 	lccBucketInfo[bucket]['count'] = 0
	# 	lccBucketInfo[bucket]['peel'] = defaultdict(dict)

	# for (l, lcc), bucket in lcc2Bucket.items():
	# 	tempVSizeDict = lccWaveVSizeDict[(l, lcc)]
	# 	tempESizeDict = lccWaveESizeDict[(l, lcc)]
	# 	tempSourceDict = lccWaveSourceDict[(l, lcc)]
	# 	lccInfo = dict()
	# 	# lccInfo['layer'] = l
	# 	lccInfo['lcc'] = lcc
	# 	lccInfo['vertices'] = tempVSizeDict['total']
	# 	lccInfo['edges'] = tempESizeDict['total']
	# 	# if l != 1:
	# 	# 	lccwaveInfo = dict()
	# 	# 	for wave in range(1, len(tempVSizeDict)):
	# 	# 		lccwaveInfo[wave] = {'vertices': tempVSizeDict[wave], 'edges': tempESizeDict[wave], 'source': tempSourceDict[wave]}
	# 	# 	lccInfo['waves'] = lccwaveInfo
	# 	if l not in lccBucketInfo[bucket]['peel']:
	# 		lccBucketInfo[bucket]['peel'][l]['lccList'] = list()
	# 		lccBucketInfo[bucket]['peel'][l]['maxSize'] = (0, 0)
	# 		lccBucketInfo[bucket]['peel'][l]['minSize'] = (float('inf'), float('inf'))
	# 	if (lccInfo['edges'], lccInfo['vertices']) > lccBucketInfo[bucket]['peel'][l]['maxSize']:
	# 		lccBucketInfo[bucket]['peel'][l]['maxSize'] = (lccInfo['edges'], lccInfo['vertices'])
	# 	if (lccInfo['edges'], lccInfo['vertices']) < lccBucketInfo[bucket]['peel'][l]['minSize']:
	# 		lccBucketInfo[bucket]['peel'][l]['minSize'] = (lccInfo['edges'], lccInfo['vertices'])
	# 	lccBucketInfo[bucket]['peel'][l]['lccList'].append(lccInfo)
	# 	lccBucketInfo[bucket]['count'] += 1

	# for bucket, bucketInfo in lccBucketInfo.items():
	# 	if 1 in bucketInfo['peel']:
	# 		lccList = bucketInfo['peel'][1]['lccList']
	# 		count = len(lccList)
	# 		if count > 1:
	# 			edgeCount = sum(lcc['edges'] for lcc in lccList)
	# 			bucketInfo['peel'][1]['lccList'] = [{'layer': 1, 'count': count, 'vertices': edgeCount + count, 'edges': edgeCount, 'single': False, 'lccList': [lcc['lcc'] for lcc in lccList]}]
	# 		else:
	# 			lccList[0]['single'] = True


	# for layer in layerList:
	# 	# if layer == 1:
	# 	# 	continue
	# 	print(f'processing wave of layer {layer}')
	# 	with open(f'{path}{graph}/{graph}_waves/layer-{layer}-waves-info.json') as f:
	# 		info = json.load(f)
	# 		del info['0']

	# 		for wave, waveInfo in info.items():
	# 			wave = int(wave)
	# 			del waveInfo['vertices']
	# 			del waveInfo['edges']

	# 			for wcc, wccInfo in waveInfo.items():
	# 				lcc = wccInfo['layer-cc']
	# 				lccWaveVSizeDict[(layer, lcc)][wave] += wccInfo['vertices']
	# 				# lccWaveVSizeDict[(layer, lcc)]['total'] += wccInfo['vertices']
	# 				lccWaveESizeDict[(layer, lcc)][wave] += wccInfo['edges']
	# 				# lccWaveESizeDict[(layer, lcc)]['total'] += wccInfo['edges']
	# 				lccWaveSourceDict[(layer, lcc)][wave] += wccInfo['fragments']['0']['sources']
	# # print(lccWaveESizeDict)

	# for bucket, bucketInfo in lccBucketInfo.items():
	# 	peelInfo = bucketInfo['peel']
	# 	for l, lccData in peelInfo.items():
	# 		lccList = lccData['lccList']
	# 		if l == 1:
	# 			if not lccList[0]['single']:
	# 				continue
	# 		for lccInfo in lccList:
	# 			lcc = lccInfo['lcc']

	# 			tempVSizeDict = lccWaveVSizeDict[(l, lcc)]
	# 			tempESizeDict = lccWaveESizeDict[(l, lcc)]
	# 			tempSourceDict = lccWaveSourceDict[(l, lcc)]
	# 			print(l, lcc, tempVSizeDict)
	# 			assert len(tempVSizeDict) > 1

	# 			lccwaveInfo = dict()
	# 			for wave in range(1, len(tempVSizeDict)):
	# 				lccwaveInfo[wave] = {'vertices': tempVSizeDict[wave], 'edges': tempESizeDict[wave], 'source': tempSourceDict[wave]}
	# 			lccInfo['waves'] = lccwaveInfo

	# # # print(lccBucketInfo)

	# # for bucket, lccInfo in lccBucketInfo.items():
	# # 	lccInfo['lcc'].sort(key = lambda x: (x['edges'], x['vertices']))

	# lccBucketInfo['layers'] = layerList
	# lccBucketInfo['buckets'] = thresholdList

	# # # print(lccBucketInfo)

	# with open(f'{path}{graph}/{graph}-lccWaves.vBuck.b.p.mm.json', 'w') as f:
	# 	json.dump(lccBucketInfo, f, indent = 2)

	with open(f'{path}{graph}/{graph}_info.txt', 'w') as f:
		f.write(f'|dataset:{graph}|vertices:{vSize}|edges:{eSize}|connected_fixpoints:{len(lccWaveVSizeDict)}|peel_values:{len(layerList)-1}|buckets:{len(bucketSet)}|')

