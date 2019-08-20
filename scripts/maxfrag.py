#!/usr/bin/env python3
import sys
import json
import glob

graph = sys.argv[1]
graph += '/' + graph

with open(graph + '-layer-info.json') as f:
    data = json.load(f)
wavefiles = glob.glob(graph + '_waves/*-waves-info.json')

frags = 0
l = 0
lcc = 0
wave = 0
iwcc = 0
fg = 0
for fw in wavefiles:
    layer = int(fw.split('-')[-3])
    # print(layer, fw)
    with open(fw) as f:
        wdata = json.load(f)

    del wdata['0']
    for w, wd in wdata.items():
        del wd['vertices']
        del wd['edges']
        for wcc, wccd in wd.items():
            for frag, finfo in wccd['fragments'].items():
                if frags < finfo['edges']:
                    l = layer
                    lcc = wccd['layer-cc']
                    wave = w
                    iwcc = wcc
                    fg = frag
                    frags = finfo['edges']
                    # print(finfo)

print(l, lcc, wave, wcc, fg, 'size: ', frags)
