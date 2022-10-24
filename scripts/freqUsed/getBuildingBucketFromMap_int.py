import json
import glob
import sys
from collections import defaultdict

if __name__ == '__main__':
	path = sys.argv[1]
	graph = sys.argv[2]

	buildingNameDict = defaultdict(dict)
	bucketNameList = []
	# buildingNameSet = set()
	with open(f'{path}{graph}/{graph}-lccWaves.vBuck.b.p.mm.json') as f:
		info = json.load(f)
		del info['buckets']
		del info['layers']

		for bucket, bucketInfo in info.items():
			if bucketInfo['count'] != 0:
				bucketNameList.append(int(bucket))

			# for peel, peelInfo in bucketInfo['peel'].items():
			# 	if 
			# 	lccList = peelInfo['lccList']
			# 	lccList.sort(key = lambda x: (x['edges'], ))
			# 	lcc = lccList[-1]['lcc']
			# 	buildingNameDict[bucket][peel] = f'{peel}_{lcc}'

	bucketNameList.sort()
	print(bucketNameList)

	with open(f'{path}{graph}/{graph}-info.json') as f:
		info = json.load(f)
		bucketList = info['counts']
		del bucketList['total']
		for bucketIdx, bucketInfo in bucketList.items():
			bucketIdx = int(bucketIdx)
			for subIdx, subInfo in enumerate(bucketInfo):
				ids = subInfo['ids']
				if ids:
					assert len(ids) == 1
					# print(bucketIdx, subIdx, ids)
					buildingNameDict[bucketNameList[bucketIdx]][subIdx] = ids[0]
					# buildingNameSet.add(ids[0])
				else:
					with open(f'{path}{graph}/graph-{bucketIdx}-{subIdx}.json') as localF:
						localInfo = json.load(localF)
						localBuilding = sorted(localInfo, key = lambda x: (x['links'], x['nodes']) if type(x['links']) == int else (len(x['links']), len(x['nodes'])))[-1]
						print(bucketNameList)
						print(bucketNameList[bucketIdx])
						buildingNameDict[bucketNameList[bucketIdx]][subIdx] = localBuilding['id']
						# buildingNameSet.add(localBuilding['id'])

	print(buildingNameDict)



	# with open(f'D:/Users/endlesstory/Desktop/graph city/graphcity-webview/data/{graph}/SPIRAL.txt') as f:
	# 	for idx, row in enumerate(f):
	# 		if idx % 2 == 0:
	# 			name = row.split(' ')[0]
	# 			l, lcc = name.split('_')[1:3]
	# 			# print(name)
	# 			print(f'{l}_{lcc}')
	# 			assert f'{l}_{lcc}' in buildingNameSet

	with open(f'{path}{graph}/building2bucket-{graph}.json', 'w') as f:
		json.dump(buildingNameDict, f, indent = 2)
