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

buckPeel2size = dict()
with open(f'{graph}/{graph}-lccWaves.vBuck.b.p.mm.json') as f:
	data = json.load(f)
	del data['layers']
	del data['buckets']
	for bucket, bucketInfo in data.items():
		bucket = int(bucket)
		if bucketInfo['count'] == 0:
			continue
		for peel, peelInfo in bucketInfo['peel'].items():
			peel = int(peel)
			lcc = peelInfo['lccList'][0]
			buckPeel2size[(bucket, peel)] = lcc['edges']

addedFlag = False
with open(f'{graph}/cityMesh/SPIRAL.txt') as fr:
	with open(f'{graph}/cityMesh/SPIRALDAG.txt', 'w') as fw:
		for line1, line2 in itertools.zip_longest(fr, fr, fillvalue = ''):
			line1 = line1.strip('\n')
			line2 = line2.strip('\n')
			if not addedFlag and (len(line1.split(' ')) > 15):
				print('W: already added dagType')
				addedFlag = True
			if addedFlag:
				line1 = ' '.join(line1.split(' ')[:15])

			buildingName = line1.split(' ')[0]
			_, fp, lcc, _ = buildingName.split('_')
			fp = int(fp)
			lcc = int(lcc)
			fw.write(f'{line1} {buckPeel2size[(building2bucket[fp, lcc], fp)]}\n')
			fw.write(f'{line2}\n')

os.rename(f'{graph}/cityMesh/SPIRAL.txt', f'{graph}/cityMesh/SPIRAL.txt.{str(time.time())}.save')
os.rename(f'{graph}/cityMesh/SPIRALDAG.txt', f'{graph}/cityMesh/SPIRAL.txt')