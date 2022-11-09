import csv
import sys
import json
from collections import defaultdict

graph = sys.argv[1]
layer = int(sys.argv[2])
buck = int(sys.argv[3])
TH = int(sys.argv[4]) if len(sys.argv) >= 5 else 4194304

# fileSuffix = f'wave-{wave}' if frag is None else f'wave-{wave}-frag-{frag}'

tempW = -1
tempF = -1
nameW = -1
nameF = -1
tempCnt = TH + 1
wfMap = defaultdict(dict)
largeWaveFlag = False
fw = None

with open(f'{graph}/{graph}_waves/lccBuck/layer-{layer}-waves-buck{buck}.csv') as fr:
	reader = csv.reader(fr)
	for row in reader:
		src, tgt, w, wcc, f = map(int, row)
		if tempW != w or tempF != f:
			tempF = f
			tempW = w
			if tempCnt > TH or (w != nameW and largeWaveFlag):
				largeWaveFlag = False
				if f != 0:
					# a large wave
					largeWaveFlag = True
				nameW = w
				nameF = f
				fileSuffix = f'wave-{nameW}-frag-{nameF}'
				tempCnt = 0
				if fw is not None:
					fw.close()
				fw = open(f'{graph}/{graph}_waves/lccBuck/layer-{layer}-waves-buck{buck}-{fileSuffix}.csv', 'w')
			wfMap[w][f] = (nameW, nameF)

		fw.write(f'{src},{tgt},{w},{wcc},{f}\n')
		tempCnt += 1
fw.close()

with open(f'{graph}/{graph}_waves/lccBuck/layer-{layer}-waves-buck{buck}-fragMap.json', 'w') as f:
	json.dump(wfMap, f)