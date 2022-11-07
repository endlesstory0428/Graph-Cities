import sys
import csv
import os
import json

graph = sys.argv[1]
layer = sys.argv[2]
bucket = sys.argv[3]
sample = (sys.argv[4] == 'true')

maxlabel = 0
lineCnt = 0

if sample:
	vicinityName = f'{graph}-l{layer}-b{bucket}smp'
	if not os.path.exists(vicinityName):
		os.mkdir(vicinityName)

	with open(f'{graph}/{graph}_waves/lccBuck/smp/layer-{layer}-waves-buck{bucket}-smp.csv') as fr:
		reader = csv.reader(fr)
		with open(f'{vicinityName}/{vicinityName}.txt', 'w', newline = '') as fw:
			for src, tgt in reader:
				lineCnt += 1
				maxlabel = max(maxlabel, int(src), int(tgt))
				fw.write(f'{src}\t{tgt}\n')

else:
	vicinityName = f'{graph}-l{layer}-b{bucket}'
	if not os.path.exists(vicinityName):
		os.mkdir(vicinityName)

	with open(f'{graph}/{graph}_waves/lccBuck/layer-{layer}-waves-buck{bucket}.csv') as fr:
		reader = csv.reader(fr)
		with open(f'{vicinityName}/{vicinityName}.txt', 'w', newline = '') as fw:
			for src, tgt, _, _, _ in reader:
				lineCnt += 1
				maxlabel = max(maxlabel, int(src), int(tgt))
				fw.write(f'{src}\t{tgt}\n')

with open(f'{vicinityName}/{vicinityName}-vicinity-info.json', 'w') as f:
	json.dump({'maxlabel': maxlabel, 'lineCnt': lineCnt}, f)