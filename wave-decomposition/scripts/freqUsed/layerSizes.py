import json
import sys

layerName = sys.argv[1]
infoName = sys.argv[2]
suffix = int(layerName.split('-')[-1].split('.')[0])
# print(suffix)
with open(infoName) as f:
	info = json.load(f)
	del info['0']
	infoList = [(layer, layerInfo['vertices'], layerInfo['edges']) for layer, layerInfo in info.items() if layerInfo['file_suffix'] == suffix]
print(' '.join([' '.join(map(str, layerInfo)) for layerInfo in infoList]))