import csv
import json
import sys
import glob
from collections import defaultdict

# this script is used to normalize the fpmetagraph.py

def readIds(graph):
	idDict = dict()
	with open(f'./{graph}/{graph}-fpmeta.ids', 'r') as csvFile:
		reader = csv.DictReader(csvFile, fieldnames = ['id', 'layer', 'lcc'])
		for row in reader:
			idDict[row['id']] = (row['layer'], row['lcc'])
	return idDict

def replaceID(graph, idDict, lcc2buck):
	weightDict = defaultdict(int)
	
	with open(f'./{graph}/{graph}-fpmeta.csv', 'r') as rCsvFile:
		reader = csv.DictReader(rCsvFile, fieldnames = ['source', 'target', 'weight'])
		for row in reader:
			src = lcc2buck[idDict[row['source']]]
			tgt = lcc2buck[idDict[row['target']]]
			weightDict[(src, tgt)] += int(row['weight'])

	with open(f'./{graph}/metagraph.txt', 'w', newline='') as wCsvFile:
		writer = csv.writer(wCsvFile)
		for (src, tgt), weight in weightDict.items(): 
			writer.writerow([*src, *tgt, weight])
	return

def getLCCSize(graph, lcc2buck):
	lccSizeDict = defaultdict(int)
	with open(f'./{graph}/{graph}-layer-info.json') as f:
		for layer in json.load(f).keys():
			if layer == '0':
				continue
			with open(f'./{graph}/{graph}_layers/layer-{layer}.cc-info.json') as layerFile:
				for lcc, size in json.load(layerFile).items():
					if lcc == '-1':
						continue
					buck = lcc2buck[(layer, lcc)]
					lccSizeDict[buck] += int(size['vertices'])
	return lccSizeDict

def normalize(graph, lccSizeDict):
	with open(f'./{graph}/metagraph_normalized.txt', 'w', newline='') as wCsvFile:
		with open(f'./{graph}/metagraph.txt', 'r') as rCsvFile:
			reader = csv.DictReader(rCsvFile, fieldnames = ['sourceLayer', 'sourceLCC', 'targetLayer', 'targetLCC', 'weight'])
			writer = csv.writer(wCsvFile, delimiter = ',')

			for row in reader:
				normalizedWeight = float(row['weight']) / (lccSizeDict[(row['sourceLayer'], row['sourceLCC'])] + lccSizeDict[(row['targetLayer'], row['targetLCC'])] - int(row['weight']))
				assert normalizedWeight <= 1
				writer.writerow([row['sourceLayer'], row['sourceLCC'], row['targetLayer'], row['targetLCC'], normalizedWeight])
	return


def getBucket(graph):
	buckfiles = glob.glob(graph + '/graph-*.json')
	lcc2buck = dict()
	for fn in buckfiles:
		with open(fn) as f:
			buckInfo = sorted(json.load(f), key = lambda x: len(x['links']))

			buckPeel, buckLcc = buckInfo[-1]['id'].split('_')
			for data in buckInfo:
				peel, lcc = data['id'].split('_')
				lcc2buck[(peel, lcc)] = (buckPeel, buckLcc)

	with open(f'{graph}/{graph}-info.json') as f:
		graphInfo = json.load(f)
		for k in graphInfo['counts']:
			if k == 'total':
				continue
			for box in graphInfo['counts'][k]:
				if len(box['ids']) > 0:
					peel, lcc = box['ids'][0].split('_')
					lcc2buck[(peel, lcc)] = (peel, lcc)
	with open(f'{graph}/lcc-duplicates.json') as f:
		duplicateInfo = json.load(f)
		for masterId, duplicateIdList in duplicateInfo.items():
			masterPeel, masterLcc = masterId.split('_')
			buckPeel, buckLcc = lcc2buck[(masterPeel, masterLcc)]
			for duplicateId in duplicateIdList:
				duplicatePeel, duplicateLcc = duplicateId.split('_')
				lcc2buck[(duplicatePeel, duplicateLcc)] = (buckPeel, buckLcc)
	print(len(lcc2buck))
	return lcc2buck

if __name__ == '__main__':
	graph = sys.argv[1]
	lcc2buck = getBucket(graph)
	idDict = readIds(graph)
	replaceID(graph, idDict, lcc2buck)
	lccSizeDict = getLCCSize(graph, lcc2buck)
	normalize(graph, lccSizeDict)