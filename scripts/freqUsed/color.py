import glob
import json
import sys
import numpy as np
import os

# this scrpit is used to find a proper color map factor used in 'building.py' by mapping the average density to average color 

if __name__ == '__main__':
	graph = sys.argv[1]

	wavemaps = glob.glob(f'{graph}/{graph}_waves/wavemap_*.json')

	buildingList = []
	for wavemap in wavemaps:
		_, name = os.path.split(wavemap)
		if name.count('_') == 3:
			buildingList.append(wavemap)

	densityArray = []
	for waveFile in buildingList:
		with open(waveFile, 'r') as f:
			data = json.load(f)
		for wave, waveData in data.items():
			if int(wave) > 0:
				v = waveData['ss']
				vo = waveData['t'] + waveData['s']
				e = 2 * waveData['ie'] + waveData['ee']
				densityArray.append((e / (v * vo)) if e > 0 else 0)
			else:
				continue

	aveDensity = np.mean(densityArray)
	factor = np.square(aveDensity / (aveDensity - 1))
	print(factor)