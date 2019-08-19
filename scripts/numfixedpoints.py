#!/usr/bin/env python3
import sys
import json
import glob

graph = sys.argv[1]
graph += '/' + graph

with open(graph + '-layer-info.json') as f:
    data = json.load(f)
cclayerfiles = glob.glob(graph + '_layers/*.cc-info.json')
wavefiles = glob.glob(graph + '_waves/*-waves-info.json')

for fl in cclayerfiles:
    layer = int(fl.split('-')[-2][:-3])
    with open(fl) as f:
        ccs = len(json.load(f).keys()) - 1
    data[str(layer)]['num_fixedpoints'] = ccs

for fw in wavefiles:
    layer = int(fw.split('-')[-3])
    with open(fw) as f:
        wdata = json.load(f)
    frags = 0
    del wdata['0']
    for w, wd in wdata.items():
        del wd['vertices']
        del wd['edges']
        numf = 0
        for wcc, wccd in wd.items():
            numf = max(numf, len(wccd['fragments']))
        frags += numf
    waves = len(wdata.keys())
    data[str(layer)]['num_waves'] = waves
    data[str(layer)]['num_frags'] = frags

with open(graph + '-layer-info.json', 'w') as f:
    json.dump(data, f, indent='\t')
