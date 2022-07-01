import numpy as np
from collections import defaultdict
import json
import sys

# import pickle as pkl

# def load(path, name):
# 	loadFile = open(path + name, 'rb')
# 	arg = pkl.load(loadFile)
# 	loadFile.close()
# 	return arg



if __name__ == '__main__':
	# meanStdDict, maxDegDict = load('', 'got')
	graph = sys.argv[1]

	aveDegDict = dict()
	with open(f'{graph}/{graph}.json') as file:
		info = json.load(file)
		for layer in info['layers']:
			aveDeg = 2 * layer['edges'] / layer['vertices']
			peel = layer['peel']
			assert((2 * layer['peel']) > aveDeg >= layer['peel'])
			aveDegDict[peel] = aveDeg


	with open(f'{graph}/{graph}-layers-dists.json', 'r') as file:
		info = json.load(file)
		for layer, dist in info.items():
			info[layer] = {'meanDegree': aveDegDict[int(layer)], 'dist': dist}
	
	with open(f'{graph}/{graph}-layers-dists.json', 'w') as file:
		json.dump(info, file, indent = 2)