import csv
import sys

graph = sys.argv[1]
fp = sys.argv[2]
lcc = sys.argv[3]
suffix = sys.argv[4] if len(sys.argv) >= 5 else ''

eCount = 0

if len(sys.argv) < 5:
	with open(f'{graph}/dag/dagmeta_{fp}_{lcc}.node') as f:
		reader = csv.reader(f)
		for row in reader:
			v, wave, frag, level, vSize, eSize = map(int, row)
			eCount += eSize
	with open(f'{graph}/dag/dagmeta_{fp}_{lcc}.link') as f:
		reader = csv.reader(f)
		for row in reader:
			src, tgt, eSize = map(int, row)
			eCount += eSize
	with open(f'{graph}/dag/dagmeta_{fp}_{lcc}.link.jump') as f:
		reader = csv.reader(f)
		for row in reader:
			src, tgt, eSize = map(int, row)
			eCount += eSize
elif suffix == '.wf.wave' or suffix == '.wf.frag':
	with open(f'{graph}/dag/dagmeta_{fp}_{lcc}{suffix}.node') as f:
		reader = csv.reader(f)
		for row in reader:
			v, vSize, eSize, metaV, metaE = map(int, row)
			eCount += eSize
	with open(f'{graph}/dag/dagmeta_{fp}_{lcc}{suffix}.link') as f:
		reader = csv.reader(f)
		for row in reader:
			src, tgt, eSize = map(int, row)
			eCount += eSize
elif suffix == '.edgeCut':
	with open(f'{graph}/dag/dagmeta_{fp}_{lcc}{suffix}.node') as f:
		reader = csv.reader(f)
		for row in reader:
			v, level, vSize, eSize, metaV, metaE = map(int, row)
			eCount += eSize
	with open(f'{graph}/dag/dagmeta_{fp}_{lcc}{suffix}.link') as f:
		reader = csv.reader(f)
		for row in reader:
			src, tgt, eSize, metaE = map(int, row)
			eCount += eSize
print(eCount)