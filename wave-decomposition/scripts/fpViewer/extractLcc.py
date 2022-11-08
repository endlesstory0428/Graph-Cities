import csv
import sys

graph = sys.argv[1]
layer = int(sys.argv[2])
lcc = int(sys.argv[3])
oName = sys.argv[4]

wccSet = set()
with open(f'{graph}/{graph}_waves/layer-{layer}-waves-info-lcc.csv') as f:
	reader = csv.reader(f)
	for row in reader:
		tempLcc, tempWcc = map(int, row[1: 3])
		if lcc == tempLcc:
			# print(tempWcc)
			wccSet.add(tempWcc)

with open(f'{graph}/{graph}_waves/layer-{layer}-waves.csv') as fr:
	with open(f'{oName}/{oName}.txt', 'w') as fw:
		reader = csv.reader(fr)
		for row in reader:
			src, tgt, w, wcc, frag = map(int, row)
			if wcc in wccSet:
				fw.write(f'{src}\t{tgt}\n')