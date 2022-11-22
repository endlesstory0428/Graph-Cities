import sys
import csv
import itertools
import os

if __name__ == '__main__':
	graph = sys.argv[1]

	if not os.path.exists(f'{graph}/{graph}_waves/lccBuck/flt/'):
		os.mkdir(f'{graph}/{graph}_waves/lccBuck/flt/')

	lcc2buck = dict()
	with open(f'{graph}/{graph}-lccBuck.l-lcc-b.csv') as f:
		reader = csv.reader(f)
		for row in reader:
			l, lcc, buck = map(int, row)
			lcc2buck[(l, lcc)] = buck


	smallNameList = []
	with open(f'{graph}/cityMesh/SPIRAL.txt') as f:
		for line1, line2 in itertools.zip_longest(f, f, fillvalue = ''):
			line1 = line1.strip('\n')
			line2 = line2.strip('\n')
			info = line1.split(' ')
			buildingName = info[0]
			_, layer, lcc, suffix = buildingName.split('_')
			if int(info[12]) == 0 or int(info[12]) == 1:
				# smallNameList.append((layer, lcc, lcc2buck[(int(layer), int(lcc))]))
				pass
			else:
				# print('gorilla')
				# pass #gorilla case
				smallNameList.append((layer, lcc, lcc2buck[(int(layer), int(lcc))]))
	
	with open(f'{graph}/filter.sh', 'w', newline = '') as f:
		for l, lcc, buck in smallNameList:
			f.write(f'make GRAPH={graph} DAGNAME=dagmeta_{l}_{lcc} LAYER={l} LCC={lcc} BUCKET={buck} filterLarge\n')