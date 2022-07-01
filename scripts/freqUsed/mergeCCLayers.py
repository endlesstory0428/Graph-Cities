import glob
import sys

path = sys.argv[1]
graph = sys.argv[2]

ccLayerList = glob.glob(f'{path}{graph}/{graph}_layers/layer-*.cc-layers')

with open(f'{path}{graph}/{graph}.cc-layers', 'w') as fw:
	for cclayerFile in ccLayerList:
		with open(cclayerFile) as fr:
			for row in fr:
				fw.write(row)
