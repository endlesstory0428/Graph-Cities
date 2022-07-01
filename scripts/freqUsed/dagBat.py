import json
import sys
import glob
import os

# this scrpit is used to generate a script to process all the metaDAG of buildings


# def getLCCList(graph):
# 	lccList = []
# 	with open(f'./{graph}/{graph}-layer-info.json') as f:
# 		for layer in json.load(f).keys():
# 			if layer == '0':
# 				continue
# 			with open(f'./{graph}/{graph}_layers/layer-{layer}.cc-info.json') as layerFile:
# 				for lcc, size in json.load(layerFile).items():
# 					if lcc == '-1':
# 						continue
# 					lccList.append((layer, lcc))
# 	return lccList

def getLCCList(graph):

	# wavemaps = glob.glob(f'{graph}/{graph}_waves/wavemap_*.json')
	wavemaps = glob.glob(f'{graph}/{graph}_waves/wavemap_*.json')

	lccList = []
	lccSingleList = []


	for wavemap in wavemaps:
		_, name = os.path.split(wavemap)
		if name.count('_') == 3:
			_, layer, lcc, buckSize = name.split('_')
			lccList.append((layer, lcc))
			# if buckSize == '1.json':
			# 	with open(wavemap) as f:
			# 		info = json.load(f)
			# 		for wave in info.keys():
			# 			lccSingleList.append((layer, lcc, wave))
	return lccList, lccSingleList

if __name__ == '__main__':
	graph = sys.argv[1]
	# path = sys.argv[1]
	# threshold = sys.argv[2]
	lccList, lccSingleList = getLCCList(graph)
	# print(lccSingleList)
	for layer, lcc in lccList:
		# print(f'python dagMetaGraph2.py {graph} {layer} {lcc} > ./dag/dagmeta_{layer}_{lcc}.json')
		# print(f'python3 ./scripts/freqUsed/dagMetaGraph2.py {graph} {layer} {lcc} > ./{graph}/dag/dagmeta_{layer}_{lcc}.json')
		print(f'python3 ./scripts/freqUsed/dagmetagraph.py {graph} {layer} {lcc} > ./{graph}/dag/dagmeta_{layer}_{lcc}.json')
		# print(f'python3 ./hz333test/dagMetaGraph2.py {graph} {layer} {lcc} > ./hz333test/dag/dagmeta_{layer}_{lcc}.json')
		# print(f'python3 ./hz333test/splitBuilding.py {graph} {layer} {lcc}')
		# print(f'python3 ./hz333test/getDagTree.py {graph} {layer} {lcc}')
		# print(f'python dagmetagraph3.py {graph} {layer} {lcc} {threshold} > ./dag/dagmeta_{layer}_{lcc}.json')
		# print(f'python dagmetagraph4.py {graph} {layer} {lcc} > ./dag/dagmeta_{layer}_{lcc}.json')
		# print(f'python3 ./hz333test/dagmetagraph4.py {graph} {layer} {lcc} > ./hz333test/dag/dagmeta_{layer}_{lcc}.json')

	# for layer, lcc, wave in lccSingleList:
	# 	print(f'python dagmetagraphWave.py {graph} {layer} {lcc} {wave} > ./dag/dagmeta_{layer}_{lcc}w{wave}.json')