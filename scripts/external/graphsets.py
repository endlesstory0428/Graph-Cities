# Python 3.7.0
# Author: Daniel Nakhimovich (d.nak@rutgers.edu)
# ------
# Usage:
# python3 graphsets.py -data cit-Patents -layer1 <skip/only>

import sys
import glob
import json
import pandas as pd


def getopts(argv):
    opts = {}
    while argv:
        if argv[0][0] == '-':
            opts[argv[0]] = argv[1]
        argv = argv[1:]
    return opts


args = getopts(sys.argv)
# print(args)

## Default
IP = 2**15
# data_name = 'cit-Patents'
data_name = 'lesmis'
# data_name = 'yelp-k5d9'try:

try:
    data_name = args['-data']
except Exception:
    None

layer1 = 'neither'
try:
    layer1 = args['-layer1']
    print(layer1)
except Exception:
    None

print('Dataset: ' + data_name)
fileprefix = data_name + '/' + data_name + '_waves/layer-'

files = glob.glob('./' + data_name + "/graph-*-*.json")

prevlayer = 0
wdist = None
waveGps = None
wfsets = None

for filename in files:
    print("Processing: ", filename)
    with open(filename) as f:
        data = sorted(json.load(f), key=lambda x: int(x['id'].split('_')[0]))

    for g in data:
        layer = int(g['id'].split('_')[0])
        if (layer1 == 'skip' and layer == 1) or (layer1 == 'only' and layer != 1):
            continue

        if layer != prevlayer:
            graph = fileprefix + str(layer)
            wavecsvfile = graph + '-waves.csv'
            wavesourcesfile = graph + '-wave-sources.csv'
            wavedistfile = graph + '-waves-info.json'

            print('reading', wavedistfile)
            with open(wavedistfile) as infile:
                wdist = json.load(infile)
                del wdist['0']
            print('read', wavedistfile)
            for w, info in wdist.items():
                del info['vertices']
                del info['edges']

            print('reading', wavecsvfile)
            waveGps = pd.read_csv(
                wavecsvfile,
                header=None,
                names=['source', 'target', 'wave', 'wcc', 'fragment'],
                usecols=['source', 'target', 'wave', 'wcc', 'fragment']
            ).groupby(['wave', 'wcc'])
            print('read', wavecsvfile)

            print('reading', wavesourcesfile)
            wavesets = pd.read_csv(
                wavesourcesfile,
                header=None,
                names=['vertex', 'wave', 'fragment'],
                usecols=['vertex', 'wave', 'fragment']
            )
            print('read', wavesourcesfile)

            wfsets = {}
            for wf, v in wavesets.groupby(['wave', 'fragment']):
                wfsets[wf] = set(v['vertex'])

            prevlayer = layer

        lcc = int(g['id'].split('_')[1])

        wwccs = set()
        for w, info in wdist.items():
            for wcc, winfo in info.items():
                if winfo['layer-cc'] == lcc:
                    wwccs.add((int(w), int(wcc)))

        waves = pd.concat([waveGps.get_group(gind) for gind in wwccs])
        # wgps = waves.groupby(['wave', 'fragment'])

        # ssets = {}
        # checkcount = 0
        # numset = 0
        # v2set = {}
        # cumset = set()
        # for wfrag, fg in wgps:
        #     inter = set(fg['source']).intersection(wfsets[wfrag])
        #     cumset.update(inter)
        #     # for x in inter:
        #     #     v2set[x] = numset
        #     print(numset, inter)

        #     setlen = len(inter)
        #     assert (setlen > 0)
        #     checkcount += setlen
        #     ssets[numset] = list(inter)
        #     numset += 1

        # numset = 0
        # print(wgps.groups)
        # print(wfsets.keys())
        # for wfrag, fg in wgps:
        #     print("*", wfrag)
        #     if numset > 0:
        #         addset = wfsets[wfrag].intersection(
        #             set(waves['source'].loc[waves['target'].isin(ssets[numset - 1])]) - cumset
        #         )
        #         print(
        #             numset,
        #             set(waves['source'].loc[waves['target'].isin(ssets[numset - 1])]) - cumset
        #         )
        #         print(wfrag, 3862384 in wfsets[wfrag])
        #         print(numset, addset)
        #         # for x in addset:
        #         #     v2set[x] = numset
        #         checkcount += len(addset)
        #         ssets[numset] += list(addset)
        #     numset += 1

        # lastset = set(waves['source']) - cumset
        # print("L1", lastset)
        # lastset = set(waves['source'].loc[waves['target'].isin(inter)]) - cumset
        # print("L2", lastset)
        # # print(lastset)
        # # for x in lastset:
        # #     v2set[x] = len(ssets)
        # print(checkcount + len(lastset), len(set(waves['source'])))
        # if not (checkcount + len(lastset) == len(set(waves['source']))):
        #     print(waves)
        #     print(ssets)
        #     print(lastset)

        waveverts = set(waves['source'])
        ssets = {}
        checkcount = 0
        numset = 0
        for wf, vs in wfsets.items():
            tset = vs.intersection(waveverts)
            lentset = len(tset)
            if lentset > 0:
                ssets[numset] = list(tset)
                checkcount += lentset
                numset += 1

        assert (checkcount == len(waveverts))

        # if len(lastset) > 0:
        #     ssets[len(ssets)] = list(lastset)

        g['sets'] = ssets

    with open(filename, 'w') as f:
        json.dump(data, f)
