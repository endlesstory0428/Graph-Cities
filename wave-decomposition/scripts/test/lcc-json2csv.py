import ijson
import sys
import glob

graph = sys.argv[1]

fileList = glob.glob(f'{graph}/{graph}_layers/layer-*.cc-info.json')

for file in fileList:
	lccNum = 0
	with open(file) as fr:
		with open(file[:-4] + 'cc-v-e', 'w') as fw:
			parser = ijson.parse(fr)
			for prefix, event, value in parser:
				if prefix == '' and event == 'map_key':
					lcc = int(value)
					if lcc == -1:
						break
					cc = -1
					vSize = -1
					eSize = -1
					lccNum += 1
					if lccNum % 1_000_000 == 0:
						print(file, lccNum)
				if prefix.endswith('.cc'):
					cc = int(value)
				if prefix.endswith('.vertices'):
					vSize = int(value)
				if prefix.endswith('.edges'):
					eSize = int(value)
					assert cc != -1 and vSize != -1 and eSize != -1
					fw.write(f'{lcc},{cc},{vSize},{eSize}\n')
	print(file, lccNum)