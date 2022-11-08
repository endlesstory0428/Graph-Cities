import glob
import sys
import os

path = sys.argv[1]
graph = sys.argv[2]
color = sys.argv[3]

wavemaps = glob.glob(f'{path}{graph}/{graph}_waves/wavemap_*.json')

buildingList = []
bushList = []


for wavemap in wavemaps:
	wavemap = os.path.split(wavemap)[-1]
	if wavemap.count('_') == 3:
		buildingList.append(wavemap)
	else:
		bushList.append(wavemap)

print(f'python3 scripts/freqUsed/spiral_min.py {path} {graph} {" ".join(buildingList)} > {path}{graph}/cityMesh/SPIRAL.txt')
for building in buildingList:
	print(f'python3 scripts/freqUsed/building.py {path}{graph}/{graph}_waves/{building} {path}{graph}/cityMesh/{".".join(building.split(".")[:-1])}_floor.txt {path}{graph}/cityMesh/{".".join(building.split(".")[:-1])}_color.txt {color}')
for bush in bushList:
	print(f'python3 scripts/freqUsed/bush.py {path}{graph}/{graph}_waves/{bush} {path}{graph}/cityMesh/bushes.json')
if not bushList:
	# add fake result for post process
	with open(f'{path}/{graph}/cityMesh/bushes.json') as f:
		f.write('\n\n,')