import json
import sys
from collections import defaultdict
import glob

if __name__ == '__main__':
	graph = sys.argv[1]

time = defaultdict(int)

edgeSize = 0

with open(f'{graph}/{graph}-metadata.json') as f:
	data = json.load(f)
	edgeSize = data['edges']
	time['preporc'] += data['read-time'] + data['sort-time'] + data['write-time']

	time['IO'] += data['read-time'] + data['write-time']
	time['alg'] += data['sort-time']

	time['total'] += data['read-time'] + data['sort-time'] + data['write-time']

with open(f'{graph}/{graph}-decomposition-info.json') as f:
	data = json.load(f)
	time['fixpoint'] += data['preprocessing-time'] + data['algorithm-time'] + data['io-time']

	time['IO'] += data['io-time']
	time['alg'] += data['algorithm-time']

	time['total'] += data['preprocessing-time'] + data['algorithm-time'] + data['io-time']

waveInfoFileList = glob.glob(f'{graph}/{graph}_waves/layer-*-wavedecomp-info.json')
for waveInfoFile in waveInfoFileList:
	with open(waveInfoFile) as f:
		data = json.load(f)
		time['wave'] += data['preprocessing-time'] + data['algorithm-time']

		time['alg'] += data['algorithm-time']

		time['total'] += data['preprocessing-time'] + data['algorithm-time']

lccInfoFileList = glob.glob(f'{graph}/{graph}_layers/layer-*.cc-layers-info.json')
for lccInfoFile in lccInfoFileList:
	with open(lccInfoFile) as f:
		data = json.load(f)
		time['lcc'] += data['preprocessing-time'] + data['algorithm-time']

		time['alg'] += data['algorithm-time']

		time['total'] += data['preprocessing-time'] + data['algorithm-time']


for key, val in time.items():
	print(f'{key}: {edgeSize / val / 1_000 :.2e} M Edges/sec')