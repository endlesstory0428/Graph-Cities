import numpy as np
import matplotlib.pyplot as plt
import json
import sys
from collections import defaultdict

graph = sys.argv[1]

fp2lccNum = defaultdict(int)
with open(f'{graph}/{graph}-lccWaves.vBuck.b.p.mm.json') as f:
	info = json.load(f)
	del info['layers']
	del info['buckets']
	for buck, buckInfo in info.items():
		if buckInfo['count'] == 0:
			continue
		for peel, peelInfo in buckInfo['peel'].items():
			assert len(peelInfo['lccList']) == 1
			# print(peelInfo['lccList'][0])
			if (peelInfo['lccList'][0]['single']):
				fp2lccNum[int(peel)] += 1
			else:
				fp2lccNum[int(peel)] += peelInfo['lccList'][0]['count']

data = np.array(list(fp2lccNum.items()))
if np.max(data[:, 1]) > np.min(data[:, 1]) * 100:
	plt.yscale('log')

plt.scatter(data[:, 0], data[:, 1])
plt.xlabel(f'peel value')
plt.ylabel('frequency')
plt.title(f'connected fixed point peel value distribution')
plt.savefig(f'{graph}/{graph}_lcc_dist.png')