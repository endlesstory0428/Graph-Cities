# Python 3.7.0
# Author: Yi-Hsiang Lo (yl1256@scarletmail.rutgers.edu)
# ------
# Usage: 
# python3 bucketing.py -data cit-Patents -IP 8192

import json
import math
import pickle
import numpy as np 
import sys

def getopts(argv):
    opts = {}
    while argv:
        if argv[0][0] == '-':
            opts[argv[0]] = argv[1]
        argv = argv[1:]
    return opts

args = getopts(sys.argv)
# print(args)

g_components = {}

## Default 
IP = 2**15
data_name = 'cit-Patents'
# data_name = 'lesmis'
# data_name = 'yelp-k5d9'try:

try:
	IP = int(args['-IP'])
except Exception:
	None

try:
	data_name = args['-data']
except Exception:
	None

print('Dataset: ' + data_name)
print('IP: %d' % IP)

data = json.load(open('./' + data_name + '/' + data_name + '.json'))
max_id = data['vertices']

SAVE = False

preloadedData = False

# cmpt: {"nodes": [], "links": [], "peels": []}

try:
	pickled_filename = data_name + '.components.pickled.bin'
	print(f'loading {pickled_filename}')
	pickled_file = open(pickled_filename, 'rb')
	g_components = pickle.load(pickled_file)
	print(f'loaded {pickled_filename}')
	pickled_file.close()
	preloadedData = True
except FileNotFoundError:
	# None
	print(f'failed to load {pickled_filename}')

if not preloadedData:
	visited_cmpts = {}
	for peel_id in range(1, max(data["peels"])+1):
	# for peel_id in range(10, 13):
		layer_file = './' + data_name + '/' + data_name + '_layers/' + 'layer-%d.cc-info.json' % (peel_id)
		print(layer_file)

		_data = None
		try:
			pickled_file = open(layer_file + '.bin', 'rb')
			_data = pickle.load(pickled_file)
			print('loaded pickled')
		except FileNotFoundError:
			# Keep preset values
			None

		try:
			if not _data:
				json_file = open(layer_file)
				_data = json.load(json_file)
				json_file.close()
				print('loaded')

				if False:
					binary_file = open(layer_file + '.bin', 'wb')
					pickle.dump(_data, binary_file)
					binary_file.close()
					print('pickled:', layer_file + '.bin')

			cmpt_ids = []
			for cmpt, cmptInfo in _data.items():
				# print(cmpt)
				if int(cmpt) == -1:
					print('ignore')
					continue

				g_components[f'{peel_id}_{cmpt}'] = {'nodes': cmptInfo['vertices'], 'links': cmptInfo['edges'], 'peels': []}
				cmpt_ids.append(f'{peel_id}_{cmpt}')
			# print(cmpt_ids)

			# nodes = _data["nodes"]
			# links = _data["links"]
			# print('_data["nodes"]:', len(_data["nodes"]))
			# print('_data["links"]:', len(_data["links"]))
			
			# ## bucketing nodes into components as well as the links
			# # component: {nodes: [], links: [], peels: []}

			# id_2_cmp_map = {}

			# cnt = 0
			# cmpt_ids = []

			# for node in nodes:
			# 	cmpt = "%d_%d" % (peel_id, node["cmpt"])
			# 	node["layer"] = peel_id
			# 	# if int(node['cmpt']) in [3191982, 3302294, 3390631, 3551760, 3749197, 3880819]:
			# 	# 	print(cmpt)
			# 	if not cmpt in g_components:
			# 		g_components[cmpt] = {"nodes": [], "links": [], "peels": []}
			# 		cmpt_ids.append(cmpt)
			# 	g_components[cmpt]["nodes"].append(node)
			# 	id_2_cmp_map[node["id"]] = cmpt
			# 	# max_id = max(max_id, node["id"])
			# 	cnt += 1
			# 	if cnt % 123 == 0:
			# 		print('\r%d\t%.2f%%' % (cnt, 100 * cnt / len(_data["nodes"])), end="")
			# print('\r%d\t%.2f%%' % (cnt, 100 * cnt / len(_data["nodes"])), end="")
			# print("\tnodes done")
			# print("# components: %d\n" % len(cmpt_ids))

			# cnt = 0
			# for link in links:
			# 	cmpt = id_2_cmp_map[link["source"]]
			# 	g_components[cmpt]["links"].append(link)
			# 	# links.remove(link)
			# 	cnt += 1
			# 	if cnt % 123 == 0:
			# 		print('\r%d\t%.2f%%' % (cnt, 100 * cnt / len(_data["links"])), end="")
			# print('\r%d\t%.2f%%' % (cnt, 100 * cnt / len(_data["links"])), end="")
			# print("\tlinks done")

			cmpt_codes = {}

			for cmpt_id in cmpt_ids:
				# degrees = {}
				# nodes = g_components[cmpt_id]["nodes"]
				# links = g_components[cmpt_id]["links"]
				# for node in nodes:
				# 	degrees[node['id']] = 0
				# for link in links:
				# 	s = link["source"]
				# 	t = link["target"]
				# 	degrees[s] += 1
				# 	degrees[t] += 1

				# # print(degrees)

				# cmpt_code = {}
				# for i in degrees.keys():
				# 	count = degrees[i]
				# 	if not count in cmpt_code:
				# 		cmpt_code[count] = 0
				# 	else:
				# 		cmpt_code[count] += 1

				cmpt_code = (g_components[cmpt_id]['nodes'], g_components[cmpt_id]['links'])

				# cmpt_code = sorted(cmpt_code.items())
				code_str = json.dumps(cmpt_code)

				if code_str in cmpt_codes and cmpt_codes[code_str]["layer"] == peel_id:
					cmpt_codes[code_str]["count"] += 1
					del g_components[cmpt_id]
					g_components[cmpt_codes[code_str]["owner"]]["duplicates"] += 1
					# add for print out duplicates
					g_components[cmpt_codes[code_str]["owner"]]["duplicateList"].append(cmpt_id)
				else:
					cmpt_codes[code_str] = {"owner":cmpt_id, "count":1, "layer": peel_id}
					g_components[cmpt_id]["code"] = code_str
					g_components[cmpt_id]["duplicates"] = 1
					# add for print out duplicates
					g_components[cmpt_id]["duplicateList"] = []

				# print('cmpt_code')
				# print(sorted(cmpt_code.items()))

			# set all peel id to peel_id
			for c in g_components:
				g_components[c]["peels"].append(peel_id)

			print("\t\tpeels done")

			print('g_components: %d' % (len(g_components.keys())))
			def component_key(x):
				# return (len(g_components[x]["nodes"]), len(g_components[x]["links"]), g_components[x]["duplicates"])
				return (g_components[x]["nodes"], g_components[x]["links"], g_components[x]["duplicates"])

			# out_tbl = []
			# for cmpt_id in sorted(g_components, key=component_key):
			# # for code in sorted(cmpt_codes, key=lambda x:cmpt_codes[x]["count"]):
			# 	# cmpt_id = cmpt_codes[code]["owner"]
			# 	cmpt = g_components[cmpt_id]
			# 	if not cmpt["peels"][0] == peel_id: continue
			# 	nNodes = len(cmpt["nodes"])
			# 	nLinks = len(cmpt["links"])
			# 	count = cmpt["duplicates"]
			# 	print(cmpt_id, nNodes, nLinks, count)
			# 	out_tbl.append([cmpt_id, nodes, nLinks, count])
			# 	# out_tbl.append([cmpt_id, nodes, nLinks, count, {"nodes": cmpt["nodes"], "links": cmpt["links"]}])

			# if False:
			# 	json.dump(out_tbl, open('./' + data_name + "/tbl-%d.json" % (peel_id), "w"))

		except FileNotFoundError:
			print('passed')
			pass

	# uncomment to pickle
	if False:
		binary_file = open(data_name + '.components.pickled.bin', 'wb')
		pickle.dump(g_components, binary_file)
		binary_file.close()

print('end loading data')
####################################################

with open(f'./{data_name}/lcc-duplicates.json', 'w', newline = '') as f:
	f.write('{')
	start = True
	for cmpt_id in g_components:
		if g_components[cmpt_id]['duplicates'] > 1:
			if start:
				f.write('\n')
				start = False
			else:
				f.write(',\n')
			f.write(f"\"{cmpt_id}\":{json.dumps(g_components[cmpt_id]['duplicateList'])}")
	f.write('\n}')


####################################################

cmpt_group_th = math.log(data['vertices']) / 2
# cmpt_group_th = math.log2(data['vertices'])
# cmpt_group_th = 3

thresholds = [0]
validTH = set() # used for dump graph-info.json with only non-empty buckets
# validTH.add(0)

cmpt_buckets = []

print('data.vertices:', data["vertices"])

biggest_cmpt = 0
num_components = 0
for cmpt in g_components:
	num_components += 1
	# biggest_cmpt = max(biggest_cmpt, len(g_components[cmpt]["links"]))
	biggest_cmpt = max(biggest_cmpt, g_components[cmpt]["links"])

i = 1
th = 1
while True:
	cmpt_buckets.append({"size":0, "nodes":[], "links":[], "cmpts":[], "peels":[], "hist": {}})
	# th = math.floor(math.pow(cmpt_group_th, i))
	# th = math.floor(cmpt_group_th * i)
	thresholds.append(th)
	if th > biggest_cmpt:
		break
	i = i + 1
	th += 1

print('len(thresholds) = %d' % len(thresholds))
print('thresholds')
print(thresholds)

vBoxes = [None] * len(thresholds)
for i in range(len(vBoxes)):
	vBoxes[i] = []
print('vBoxes length:', len(vBoxes))
for cmpt_id in g_components:
	cmpt = g_components[cmpt_id]
	cmpt["id"] = cmpt_id;
	for i in range(len(thresholds)):
		th = thresholds[i]
		# if th > len(cmpt["links"]):
		if th > cmpt["links"]:
			vBoxes[i-1].append(cmpt)
			validTH.add(thresholds[i-1])
			# print("put %s with %d vertices in box %d" % (cmpt_id, len(cmpt["nodes"]), i-1))
			break

print('g_components: %d' %(len(g_components.keys())))
for i in range(len(vBoxes)):
	print('vBoxes[%d]: %d' %(i, len(vBoxes[i])))
	# for item in box:
	# 	print('code: ' + item["code"])

for i in range(len(vBoxes)):
	vBox = vBoxes[i]
	eBoxes = []

	print(i, [x['peels'][0] for x in vBox])
	tempPeel = -1
	# for cmpt in sorted(vBox, key=lambda x: (x['peels'][0], -len(x['links']), -len(x['nodes']))):
	for cmpt in sorted(vBox, key=lambda x: (x['peels'][0], -x['links'], -x['nodes'])):
		# print(tempPeel, cmpt['peels'][0])
		if tempPeel != cmpt['peels'][0]:
			eBox = []
			eBoxes.append(eBox)
			tempPeel = cmpt['peels'][0]
		eBox.append(cmpt)
	print(i, [len(eBox) for eBox in eBoxes])

	# eBox = []
	# eBox_capacity = IP
	# # for cmpt in sorted(vBox, key=lambda x:len(x["links"]), reverse=False):
	# for cmpt in sorted(vBox, key=lambda x: (len(x["links"]), 1/len(x["peels"]), len(x["nodes"])), reverse=False):
	# 	size = len(cmpt["links"])
	# 	if (not eBox_capacity == IP) and (eBox_capacity - size < 0):
	# 		eBox_capacity = IP
	# 		eBoxes.append(eBox)
	# 		eBox = []

	# 	# print("%d - %d = %d" % (eBox_capacity, size, eBox_capacity - size))
	# 	eBox.append(cmpt)
	# 	eBox_capacity -= size


	# if len(eBox) > 0:
	# 	eBoxes.append(eBox)
	vBoxes[i] = eBoxes

for i in range(len(vBoxes)-1, 0-1, -1):
	if len(vBoxes[i]) == 0:
		del vBoxes[i]

counts = {}
layers = {}
for i in range(len(vBoxes)):
	eBoxes = vBoxes[i]
	counts[i] = []
	layers[i] = []
	print('vBox[%d]: %d' % (i, len(vBoxes[i])))
	for j in range(len(eBoxes)):
		vCount = 0
		eCount = 0
		average_density = 0
		num_of_cmpts = 0;
		peels = []
		for cmpt in eBoxes[j]:
			# vCount += len(cmpt["nodes"])
			# eCount += len(cmpt["links"])
			vCount += cmpt["nodes"]
			eCount += cmpt["links"]
			density = eCount * 2 / (vCount * (vCount-1))
			# print(f'density = {eCount}*2 / ({vCount} * ({vCount}-1)) = {density}')
			num_of_cmpts += cmpt["duplicates"]
			# print(f'duplicates = {cmpt["duplicates"]}')
			average_density += density * cmpt["duplicates"]
			# for node in cmpt['nodes']:
			# 	if not node['layer'] in peels:
			# 		peels.append(node['layer'])
			if cmpt['peels'][0] not in peels:
				peels.append(cmpt['peels'][0])

		if num_of_cmpts > 0:
			# print(f"{average_density} /= {num_of_cmpts}")
			average_density /= num_of_cmpts
		print('\teBox[%d]: components: %d, vertices: %d, edges: %d, average_density: %.9f' % (j, len(eBoxes[j]), vCount, eCount, average_density))

		# if eCount <= IP:
		if True:
			dump_filename = './' + data_name + "/graph-%d-%d.json" % (i, j);
			print(f'\texporting to {dump_filename}')
			json.dump(eBoxes[j], open(dump_filename, "w"))

		statistics = {}
		# key: size (number of vertices)
		# val: count (number of duplicates)
		for cmpt in eBoxes[j]:
			# nodes = len(cmpt["nodes"])
			nodes = cmpt["nodes"]
			# edges = len(cmpt["links"])
			duplicates = cmpt["duplicates"]
			if not nodes in statistics:
				statistics[nodes] = duplicates
			else:
				statistics[nodes] += duplicates

		# component IDs
		CCIDs = []
		# # if len(eBoxes[j]) == 1 and not eCount <= IP:
		# # 	for cmpt in eBoxes[j]:
		# # 		CCIDs.append(cmpt["id"])
		# if not eCount <= IP:
		# 	CCIDs.append(eBoxes[j][0]['id'])

		info = {
			"cmpts": len(eBoxes[j]), 
			"vertices": vCount, 
			"edges": eCount, 
			"average_density": average_density,
			"fp": len(eBoxes[j]), # assuming all cmpts are fix points
			"statistics": statistics,
			"ids": CCIDs
		}
		counts[i].append(info)
		layers[i].append(peels)

print("...")
counts["total"] = {}
layers["total"] = {}
for i in range(len(vBoxes)):
	count_cmpts = 0
	count_vertices = 0
	count_edges = 0
	average_density = 0
	for count in counts[i]:
		count_cmpts += count["cmpts"]
		count_vertices += count["vertices"]
		count_edges += count["edges"]
	counts["total"][i] = {
		"cmpts": count_cmpts,
		"vertices": count_vertices,
		"edges": count_edges,
	}

	peels = []
	for layer in layers[i]:
		for l in layer:
			peels.append(l)
	layers["total"][i] = np.unique(peels).tolist()

###################
density_stat = {"layer":{}, "edges":{}}
for cmpt_id in g_components:
	layer, _id = cmpt_id.split("_")
	cmpt = g_components[cmpt_id]
	# nodes = len(cmpt["nodes"])
	# links = len(cmpt["links"])
	nodes = cmpt["nodes"]
	links = cmpt["links"]
	density = 2 * links/((nodes) * (nodes-1))
	if not layer in density_stat["layer"]:
		density_stat["layer"][layer] = {"max": density, "avg": [density], "min": density}
	else:
		density_stat["layer"][layer]["min"] = min(density_stat["layer"][layer]["min"], density)
		density_stat["layer"][layer]["max"] = max(density_stat["layer"][layer]["min"], density)
		density_stat["layer"][layer]["avg"].append(density)

for layer in density_stat["layer"]:
	density_stat["layer"][layer]["avg"] = np.mean(density_stat["layer"][layer]["avg"])

for i in range(len(vBoxes)):
	eBoxes = vBoxes[i]
	for j in range(len(eBoxes)):
		for cmpt in eBoxes[j]:
			# nodes = len(cmpt["nodes"])
			# links = len(cmpt["links"])
			nodes = cmpt["nodes"]
			links = cmpt["links"]
			density = 2 * links/((nodes) * (nodes-1))
			if not i in density_stat["edges"]:
				density_stat["edges"][i] = {"max": density, "avg": [density], "min": density}
			else:
				density_stat["edges"][i]["min"] = min(density_stat["edges"][i]["min"], density)
				density_stat["edges"][i]["max"] = max(density_stat["edges"][i]["max"], density)
				density_stat["edges"][i]["avg"].append(density)

	if len(eBoxes) == 0:
		density_stat["edges"][i] = {"max": 0, "avg": 0, "min": 0}
	else:
		density_stat["edges"][i]["avg"] = np.mean(density_stat["edges"][i]["avg"])

print(density_stat)

###################
validTHList = sorted(list(validTH))
validTHList.append(validTHList[-1]+1)

infoObject = {
	"counts": counts, 
	"layers": layers,
	"thresholds": validTHList,
	"density_stat": density_stat,
	"IP": IP
	}
# if SAVE:
filename = './' + data_name + "/" + data_name + "-info.json"
print("Saving to \"" + filename + "\"")
json.dump(infoObject, open(filename, "w"))