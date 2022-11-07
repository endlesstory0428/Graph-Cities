import csv
import sys
import itertools
import os
import time

graph = sys.argv[1]
dagTH = 8192
edgeCutTH = 8192
if len(sys.argv) > 2:
	dagTH = int(sys.argv[2])
if len(sys.argv) > 3:
	edgeCutTH = int(sys.argv[3])

edgeCutSizeDict = dict()
with open(f'{graph}/dag/edgeCutSize') as f:
	reader = csv.reader(f, delimiter = ' ')
	for size, name in reader:
		dagName = name.split('/')[-1].split('.')[0]
		_, fp, lcc = dagName.split('_')
		edgeCutSizeDict[(fp, lcc)] = int(size)

dagSizeDict = dict()
with open(f'{graph}/dag/dagSize') as f:
	reader = csv.reader(f, delimiter = ' ')
	for size, name in reader:
		dagName = name.split('/')[-1].split('.')[0]
		_, fp, lcc = dagName.split('_')
		dagSizeDict[(fp, lcc)] = int(size)

addedFlag = False
with open(f'{graph}/cityMesh/SPIRAL.txt') as fr:
	with open(f'{graph}/cityMesh/SPIRALDAG.txt', 'w') as fw:
		for line1, line2 in itertools.zip_longest(fr, fr, fillvalue = ''):
			line1 = line1.strip('\n')
			line2 = line2.strip('\n')
			if not addedFlag and (len(line1.split(' ')) > 12):
				print('W: already added dagType')
				addedFlag = True
			if addedFlag:
				line1 = ' '.join(line1.split(' ')[:12])

			buildingName = line1.split(' ')[0]
			_, fp, lcc, _ = buildingName.split('_')
			if dagSizeDict[(fp, lcc)] < dagTH:
				fw.write(f'{line1} 0\n')
				fw.write(f'{line2}\n')
			elif edgeCutSizeDict[(fp, lcc)] < edgeCutTH:
				fw.write(f'{line1} 1\n')
				fw.write(f'{line2}\n')
			else:
				fw.write(f'{line1} 2\n')
				fw.write(f'{line2}\n')

# when not exit(-1)
os.rename(f'{graph}/cityMesh/SPIRAL.txt', f'{graph}/cityMesh/SPIRAL.txt.{str(time.time())}.save')
os.rename(f'{graph}/cityMesh/SPIRALDAG.txt', f'{graph}/cityMesh/SPIRAL.txt')