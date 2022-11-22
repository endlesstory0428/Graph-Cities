import csv
import sys
import os
import glob
from collections import defaultdict
import json

graph = sys.argv[1]
threshold = int(sys.argv[2])

print('read map')
# find large bucket
largeBuckSet = set()
with open(f'{graph}/{graph}-lccWaves.vBuck.b.p.mm.json') as f:
	mapData = json.load(f)
	del mapData['layers']
	del mapData['buckets']
	for bucket, bucketInfo in mapData.items():
		if bucketInfo['count'] == 0:
			continue
		for peel, peelInfo in bucketInfo['peel'].items():
			if peelInfo['lccList']:
				# print(peelInfo['lccList'][0])
				if peelInfo['lccList'][0]['edges'] > threshold and not peelInfo['lccList'][0]['single']:
					largeBuckSet.add((int(peel), int(bucket)))

print('read dup')
# get dup
dupSet = set()
smpReprNum = dict()
with open(f'{graph}/lcc-duplicates.json') as f:
	duplicateData = json.load(f)
	for smp, dupList in duplicateData.items():
		smpL, smpLcc = map(int, smp.split('_'))
		smpReprNum[(smpL, smpLcc)] = len(dupList)
		for dup in dupList:
			# smpL, smpLcc = map(int, smp.split('_'))
			dupL, dupLcc = map(int, dup.split('_'))
			dupSet.add((dupL, dupLcc))
		

print('read buck')
# find lcc in bucket
buck2lcc = defaultdict(list)
# lcc2buck = dict()
lccSet = set()
with open(f'{graph}/{graph}-lccBuck.l-lcc-b.csv') as f:
	reader = csv.reader(f)
	for row in reader:
		l, lcc, b = map(int, row)
		if (l, b) not in largeBuckSet:
			continue
		if (l,lcc) in dupSet:
			continue
		lccSet.add((l, lcc))
		buck2lcc[(l, b)].append(lcc)

for buck, lccList in buck2lcc.items():
	print(buck, lccList, len(lccList))


if not os.path.exists(f'{graph}/{graph}_waves/lccBuck/smp/'):
	os.mkdir(f'{graph}/{graph}_waves/lccBuck/smp/')

prevLayer = -1
wccSet = set()
lccSize = dict()
for layer, bucket in sorted(buck2lcc.keys()):
	if layer != prevLayer:
		wccSet.clear()
		lccSize.clear()
		prevLayer = layer

		with open(f'{graph}/{graph}_waves/lccBuck/layer-{layer}-buck.wcc-lcc') as f:
			reader = csv.reader(f)
			for row in reader:
				wcc, lcc = map(int, row)
				if (layer, lcc) not in lccSet:
					continue
				wccSet.add(wcc)
		# print(wccSet)
		
		with open(f'{graph}/{graph}_layers/layer-{layer}.cc-info.cc-v-e') as f:
			reader = csv.reader(f)
			for row in reader:
				lcc, _, vSize, eSize = map(int, row)
				if (layer, lcc) not in lccSet:
					continue
				lccSize[(layer, lcc)] = (vSize, eSize)
		# print(lccSize)

	sampleSize = 0

	with open(f'{graph}/{graph}_waves/lccBuck/layer-{layer}-waves-buck{bucket}.csv') as fr:
		reader = csv.reader(fr)
		with open(f'{graph}/{graph}_waves/lccBuck/smp/layer-{layer}-waves-buck{bucket}-smp.csv', 'w', newline = '') as fw:
			for src, tgt, _, wcc, _ in reader:
				if int(wcc) in wccSet:
					fw.write(f'{src},{tgt}\n')
					sampleSize += 1

	with open(f'{graph}/{graph}_waves/lccBuck/smp/layer-{layer}-waves-buck{bucket}-dup-info.csv', 'w', newline = '') as f:
		dupInfoList = []
		lccList = buck2lcc[(layer, bucket)]
		l = layer
		b = bucket
		for lcc in lccList:
			vSize, eSize = lccSize[(l, lcc)]
			dupInfoList.append((l, lcc, vSize, eSize, smpReprNum[(l, lcc)] + 1 if (l, lcc) in smpReprNum else 1))
		for l, lcc, vSize, eSize, reprNum in sorted(dupInfoList, key = lambda x: (x[2], x[3])):
			f.write(f'{l},{lcc},{vSize},{eSize},{smpReprNum[(l, lcc)] + 1 if (l, lcc) in smpReprNum else 1}\n')

	with open(f'{graph}/{graph}_waves/lccBuck/smp/layer-{layer}-waves-buck{bucket}-smp-info.json', 'w') as f:
		json.dump({'eSize': sampleSize // 2, 'lccNum': len(buck2lcc[(layer, bucket)])}, f)
