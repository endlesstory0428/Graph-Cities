import numpy as np
import matplotlib.pyplot as plt
import csv
import sys
import itertools
import glob
from collections import defaultdict

def normalize(data):
	maxVal = np.max(data)
	minVal = np.min(data)
	return (data - minVal) / (maxVal - minVal)

def bucketData(data):
	mean, std = np.mean(data), np.std(data)
	maxVal, minVal = np.max(data), np.min(data)
	maxIdx = np.ceil((maxVal - mean) / std).astype(np.int32)
	minIdx = np.floor((minVal - mean) / std + np.finfo(np.float16).eps).astype(np.int32)
	hist, bins = np.histogram(data, bins = [idx * std + mean for idx in range(minIdx, maxIdx+1)])
	return hist, [idx * 1 + 0 for idx in range(minIdx, maxIdx+1)]

def plotDist(graph, data, name, nameN, title):
	normData = normalize(data)
	hist, bins = bucketData(normData)
	print(bins)
	print(hist)
	print(np.mean(data))
	print(np.max(data))
	print(np.min(data))
	print(np.sum(data == np.min(data)))
	plt.hist(np.array(bins[:-1]) + 0.5, bins = bins, weights = hist)

	plt.xticks(bins)
	plt.gca().get_xticklabels()[list(bins).index(0)].set_color("red")

	plt.xlabel(f'std({np.std(data):.2e}) deviation from mean({np.mean(data):.2e})')
	plt.ylabel('frequency')
	plt.title(f'{title}\nmin={np.min(data):.2e}, max={np.max(data):.2e}')
	plt.savefig(f'{graph}/{graph}_{name}_dist.png')
	# plt.show()

if __name__ == '__main__':
	graph = sys.argv[1]

	esize_data = []
	vsize_data = []
	with open(f'{graph}/cityMesh/SPIRAL.txt') as f:
		for line1, line2 in itertools.zip_longest(f, f, fillvalue = ''):
			line1 = line1.strip('\n')
			line2 = line2.strip('\n')
			info = line1.split(' ')
			esize_data.append(int(info[6]))
			vsize_data.append(int(info[5]))
	esize_data = np.array(esize_data)
	vsize_data = np.array(vsize_data)

	name = 'largest'
	nameN = 'size'
	title = 'Building edge size'
	print(esize_data)
	plotDist(graph, esize_data, name, nameN, title)
	plt.clf()


	floorInfoFileList = glob.glob(f'{graph}/cityMesh/wavemap_*_floor.txt')
	heigh_data = []
	floor_data = []
	for floorInfoFile in floorInfoFileList:
		with open(floorInfoFile) as f:
			lines = f.readlines()
			floor_data.append(len(lines) / 3)
			heigh_data.append(float(lines[-1].split(' ')[1]))
	heigh_data = np.array(heigh_data)
	floor_data = np.array(floor_data)

	name = 'tallest'
	nameN = 'height'
	title = 'Building height'
	plotDist(graph, heigh_data, name, nameN, title)
	plt.clf()

	name = 'floor'
	nameN = 'height'
	title = 'Building floors'
	plotDist(graph, floor_data, name, nameN, title)
	plt.clf()


	dense_data = esize_data.astype(np.float32) * 2 / vsize_data / (vsize_data - 1) 
	name = 'densest'
	nameN = 'density'
	title = 'Building density'
	plotDist(graph, dense_data, name, nameN, title)
	plt.clf()


	wDeg = defaultdict(float)
	with open(f'{graph}/metagraph_normalized.txt') as f:
		reader = csv.reader(f)
		for row in reader:
			srcLayer, srcLcc, tgtLayer, tgtLcc= map(int, row[:4])
			w = float(row[4])
			wDeg[(srcLayer, srcLcc)] += w
			wDeg[(tgtLayer, tgtLcc)] += w
	diverse_data = np.array(list(wDeg.values()))
	
	name = 'diverse'
	nameN = 'diversity'
	title = 'Weighted building degree in street network'
	if (len(diverse_data)):
		plotDist(graph, diverse_data, name, nameN, title)
		plt.clf()
	else:
		plt.plot([], [])
		plt.xlabel(f'std deviation from mean')
		plt.ylabel('frequency')
		plt.title(f'{title}')
		plt.savefig(f'{graph}/{graph}_{name}_dist.png')
		plt.clf()
