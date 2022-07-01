import json
import sys

graph = sys.argv[1]
layer = int(sys.argv[2])
bucket = int(sys.argv[3])

lccSet = set()
with open(f'{graph}/{graph}-lccWaves.vBuck.b.p.mm.json') as f:
	data = json.load(f)
	lccList = data[f'{bucket}']['peel'][f'{layer}']['lccList']
	if int(layer) == 1:
		lcc = lccList[0]
		if lcc['single']:
			for lcc in lccList:
				lccSet.add(lcc['lcc'])
		else:
			for lccIdx in lcc['lccList']:
				lccSet.add(lccIdx)
	else:
		for lcc in lccList:
			lccSet.add(lcc['lcc'])

# lccSet = set([126547,991235, 2054955, 2057707, 2144784, 2254468, 2443364, 2631830, 2741663, 3156442, 3610475, 3848220, 4421268])

edgeList = []
maxIdx = 0
v2cc = dict()
with open(f'{graph}/{graph}_layers/{graph}-layer-{layer}.json') as f:
	data = json.load(f)
	for node in data['nodes']:
		v2cc[int(node['id'])] = int(node['cmpt'])
	for edge in data['links']:
		src = int(edge['source'])
		tgt = int(edge['target'])
		cc = v2cc[src]
		if int(cc) in lccSet:
			edgeList.append((src, tgt))
			if src > maxIdx:
				maxIdx = src
			if tgt > maxIdx:
				maxIdx = tgt

with open(f'{graph}-{layer}-{bucket}.txt', 'w', newline = '') as f:
	for src, tgt in edgeList:
		f.write(f'{src}\t{tgt}\n')
print(maxIdx)
print(len(edgeList))