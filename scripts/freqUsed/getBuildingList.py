import csv
import sys

graph = sys.argv[1]
buildingList = []
with open(f'{graph}/wavemapList.l-lcc-buck.csv') as f:
	reader = csv.reader(f)
	for row in reader:
		l, lcc, buckL, buckLcc = map(int, row)
		if buckL == 0:
			buildingList.append((l, lcc))

with open(f'{graph}/{graph}_layer,lcc.txt', 'w') as f:
	for l, lcc in buildingList:
		f.write(f'{l}_{lcc}\n')