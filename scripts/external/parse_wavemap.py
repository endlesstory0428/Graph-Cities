# Python 3.7.0
# Author: Yi-Hsiang Lo (yl1256@scarletmail.rutgers.edu)
# ------
# Usage: 
# python3 

# 16_3316405
import json
import sys
import csv

def getopts(argv):
    opts = {}
    while argv:
        if argv[0][0] == '-':
            opts[argv[0]] = argv[1]
        argv = argv[1:]
    return opts

def parseWaveMap3d(peel, layer_cc):
    waves = json.load(open(f'./{data_name}/{data_name}_waves/layer-{peel}-waves-info.json'))
    # print(waves)
    num_waves = 0
    wave_ccs = {}
    for i in range(1, len(waves)):
        wave = waves[str(i)]
        for wave_cc in wave:
            if wave_cc != "vertices" and wave_cc != "edges":
                if wave[wave_cc]["layer-cc"] == layer_cc:
                    print(i, wave_cc, wave[wave_cc])
                    wave_ccs[wave_cc] = 1
                    num_waves = i

    print(f'num_waves: {num_waves}')
    print(f'{peel}_{layer_cc}')

    csvfilename = f'./{data_name}/{data_name}_waves/layer-{peel}-waves.csv'
    print(f'loading {csvfilename}')
    csvfile = open(csvfilename)
    reader = csv.reader(csvfile, delimiter=',')
    wave_vertices = {}
    for i in range(1, num_waves+1):
        wave_vertices[str(i)] = {}

    lines_read = 0
    for row in reader:
        # print(row)
        lines_read += 1
        print("\rlines_read:", lines_read, end='')
        source, target, wave_number, wave_cc, level = row
        if wave_cc in wave_ccs:
            # print(wave_number, source, target)
            if source in wave_vertices[wave_number]:
                wave_vertices[wave_number][source] += 1
            else:
                wave_vertices[wave_number][source] = 1

            if target in wave_vertices[wave_number]:
                wave_vertices[wave_number][target] += 1
            else:
                wave_vertices[wave_number][target] = 1

    print(f'loaded {csvfilename}')

    shared_vertices = {}
    # print('wave_vertices', wave_vertices)
    for i in wave_vertices:
        wave_id = int(i)
        pre_wave_id = str(wave_id-1)
        vertices = len(wave_vertices[i])
        shared_count = 0
        if wave_id > 1:
            for j in wave_vertices[i]:
                if j in wave_vertices[pre_wave_id]:
                    shared_count += 1
            print('shared_count', shared_count)
        print(i, vertices, shared_count)
        shared_vertices[f'{pre_wave_id}_{i}'] = shared_count

    # min_degree_vertices = 0
    # for i in wave_vertices["1"]:
    #     print(i, wave_vertices["1"][i])
    #     if wave_vertices["1"][i] == peel:
    #         min_degree_vertices += 1
    # print('min_degree_vertices', min_degree_vertices)
    print("=====")
    export_data = {}
    for i in range(1, num_waves+1):
        wave = waves[str(i)]
        vertices = 0
        edges = 0
        for wave_cc in wave:
            if wave_cc != "vertices" and wave_cc != "edges":
                if wave[wave_cc]["layer-cc"] == layer_cc:
                    # print(i, wave_cc, wave[wave_cc])
                    vertices += wave[wave_cc]["vertices"]
                    edges += wave[wave_cc]["edges"]
                    wave_ccs[wave_cc] = 1
                    num_waves = i
        if i > 1:
            print(f"{i-1}_{i}", shared_vertices[f"{i-1}_{i}"])
            export_data[f"{i-1}_{i}"] = {'vertices': shared_vertices[f"{i-1}_{i}"]}
        print(i, vertices, edges)
        export_data[str(i)] = {'vertices': vertices, 'edges': edges}
    print(json.dumps(export_data, indent=2))
    export_wavemap_name = f'./{data_name}/{data_name}_waves/wavemap-{peel}_{layer_cc}-waves.json'
    json.dump(export_data, open(export_wavemap_name, "w"), indent=2)

args = getopts(sys.argv)
# print(args)

## Default 
data_name = 'cit-Patents'
# data_name = 'lesmis'
# data_name = 'yelp-k5d9'try:

try:
    data_name = args['-data']
except Exception:
    None

print('Dataset: ' + data_name)

data = json.load(open('./' + data_name + '/' + data_name + '-info.json'))

for k in data['counts']:
    # print(k)
    if k != "total":
        for box in data['counts'][k]:
            if len(box['ids']) > 0:
                _id = box['ids'][0].split("_");
                peel = int(_id[0])
                layer_cc = int(_id[1])
                print(peel, layer_cc)

                if True or peel == 19:
                    parseWaveMap3d(peel, layer_cc)
                    # exit()
