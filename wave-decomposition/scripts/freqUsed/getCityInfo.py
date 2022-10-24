import json
import sys

graph = sys.argv[1]

info = dict()
info['dataset'] = graph

with open(f'{graph}/{graph}-metadata.json') as f:
	data = json.load(f)
	info['vertices'] = data['vertices']
	info['edges'] = data['edges']
	info['buckets'] = 0
	info['con_comp'] = data['connected-components']

with open(f'{graph}/{graph}-layer-info.json') as f:
	data = json.load(f)
	del data['0']

	info['peel_values'] = len(data)
	cfCnt = 0
	for fp, fpData in data.items():
		cfCnt += fpData['num_fixedpoints']
	info['con_fixpoints'] = cfCnt

with open(f'{graph}/{graph}-lccWaves.vBuck.b.p.mm.json') as f:
	data = json.load(f)
	del data['layers']
	del data['buckets']

	info['buckets'] = len(data)
	buildingCnt = 0
	for buck, buckData in data.items():
		if buckData['count'] == 0:
			continue
		buildingCnt += len(buckData['peel'])
	info['displayed_con_fixpoints(buildings)'] = buildingCnt

with open(f'{graph}/{graph}-summary.json', 'w') as f:
	json.dump(info, f)