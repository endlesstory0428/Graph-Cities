import csv
import sys

graph = sys.argv[1]
layer = int(sys.argv[2])
buck = int(sys.argv[3])
wave = int(sys.argv[4])
frag = int(sys.argv[5]) if len(sys.argv) >= 6 else None

fileSuffix = f'wave-{wave}' if frag is None else f'wave-{wave}-frag-{frag}'

with open(f'{graph}/{graph}_waves/lccBuck/layer-{layer}-waves-buck{buck}.csv') as fr:
	with open(f'{graph}/{graph}_waves/lccBuck/layer-{layer}-waves-buck{buck}-{fileSuffix}.csv', 'w') as fw:
		reader = csv.reader(fr)
		# writer = csv.writer(fw)
		for row in reader:
			src, tgt, w, wcc, f = map(int, row)
			if w == wave and (frag is None or f == frag):
				fw.write(f'{src},{tgt},{w},{wcc},{f}\n')