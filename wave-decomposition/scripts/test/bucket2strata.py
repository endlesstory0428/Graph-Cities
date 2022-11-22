import csv
import sys
import os

graph = sys.argv[1]
layer = sys.argv[2]
bucket = sys.argv[3]
sample = (sys.argv[4] == 'true')

vSet = set()

if sample:
	vicinityName = f'{graph}-l{layer}-b{bucket}smp'
	if not os.path.exists(f'graph-strata/temp/{vicinityName}.csv'):
		with open(f'{graph}/{graph}_waves/lccBuck/smp/layer-{layer}-waves-buck{bucket}-smp.csv') as fr:
			reader = csv.reader(fr)
			with open(f'graph-strata/temp/{vicinityName}.csv', 'w', newline = '') as fw:
				for src, tgt in reader:
					fw.write(f'{src},{tgt}\n')
					vSet.add(src)

else:
	vicinityName = f'{graph}-l{layer}-b{bucket}'
	if not os.path.exists(f'graph-strata/temp/{vicinityName}.csv'):
		with open(f'{graph}/{graph}_waves/lccBuck/layer-{layer}-waves-buck{bucket}.csv') as fr:
			reader = csv.reader(fr)
			with open(f'graph-strata/temp/{vicinityName}.csv', 'w', newline = '') as fw:
				for src, tgt, _, _, _ in reader:
					fw.write(f'{src},{tgt}\n')
					vSet.add(src)


if not os.path.exists(f'graph-strata/temp/{vicinityName}_labels.csv'):
	if os.path.exists(f'{graph}/flag/SPLIT_LABEL.cfg'):
		if os.path.exists(f'{graph}/labels/layer-{layer}/buck-{bucket}-smp.csv'):
			with open(f'{graph}/labels/layer-{layer}/buck-{bucket}-smp.csv') as fr:
				reader = csv.reader(fr)
				with open(f'graph-strata/temp/{vicinityName}_labels.csv', 'w', newline = '') as fw:
					fw.write(f'new_id,name\n')
					for v, label in reader:
						if v in vSet:
							fw.write(f'{v},{label}\n')
		else:
			with open(f'{graph}/labels/layer-{layer}/buck-{bucket}.csv') as fr:
				reader = csv.reader(fr)
				with open(f'graph-strata/temp/{vicinityName}_labels.csv', 'w', newline = '') as fw:
					fw.write(f'new_id,name\n')
					for v, label in reader:
						if v in vSet:
							fw.write(f'{v},{label}\n')
	elif os.path.exists(f'{graph}/{graph}_label.csv'):
		with open(f'{graph}/{graph}_label.csv') as fr:
			reader = csv.reader(fr)
			with open(f'graph-strata/temp/{vicinityName}_labels.csv', 'w', newline = '') as fw:
				fw.write(f'new_id,name\n')
				for v, label in reader:
					if v in vSet:
						fw.write(f'{v},{label}\n')
