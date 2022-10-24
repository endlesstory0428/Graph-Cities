#!/usr/bin/env python3
import sys
import json
import glob
import csv
import subprocess

graph = sys.argv[1]
graph += '/' + graph

with open(graph + '-layer-info.json') as f:
    data = json.load(f)
cclayerfiles = glob.glob(graph + '_layers/*.cc-info.json')
# wavefiles = glob.glob(graph + '_waves/*-waves-info.json')
wavefiles = glob.glob(graph + '_waves/*-waves-info.csv')
waveSizefiles = glob.glob(graph + '_waves/*-waves-size-info.csv')

for idx, fl in enumerate(cclayerfiles):
    layer = int(fl.split('-')[-2][:-3])
    print(f'process layer {layer}, {idx}/{len(waveSizefiles)}')
    with open(fl) as f:
        ccs = len(json.load(f).keys()) - 1
    data[str(layer)]['num_fixedpoints'] = ccs
print('lcc done.')

# for fw in wavefiles:
#     layer = int(fw.split('-')[-3])
#     with open(fw) as f:
#         wdata = json.load(f)
#     frags = 0
#     del wdata['0']
#     for w, wd in wdata.items():
#         del wd['vertices']
#         del wd['edges']
#         numf = 0
#         for wcc, wccd in wd.items():
#             numf = max(numf, len(wccd['fragments']))
#         frags += numf
#     waves = len(wdata.keys())
#     data[str(layer)]['num_waves'] = waves
#     data[str(layer)]['num_frags'] = frags

for idx, fws in enumerate(waveSizefiles):
    layer = int(fws.split('-')[-4])
    print(f'process layer {layer}, {idx}/{len(waveSizefiles)}')
    res = subprocess.run(['wc', '-l', f'{fws}'], capture_output = True)
    waveSize = int(res.stdout.decode().split(' ')[0])
    data[str(layer)]['num_waves'] = waveSize
    if layer == 1:
        data[str(layer)]['num_frags'] = waveSize
        print('..frag == wave')
        continue

    fragSizeList = [0 for i in range(waveSize + 1)]
    with open(f'{graph}_waves/layer-{layer}-waves-info.csv') as f:
        reader = csv.reader(f)
        for row in reader:
            waveIdx = int(row[0])
            fragSize = (row[7].count('_') + 1) // 3
            fragSizeList[waveIdx] = max(fragSizeList[waveIdx], fragSize)
    data[str(layer)]['num_frags'] = sum(fragSizeList)
print(f'wave fragment fp done')


with open(graph + '-layer-info.json', 'w') as f:
    json.dump(data, f, indent='\t')
