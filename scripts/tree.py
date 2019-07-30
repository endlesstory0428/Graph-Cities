#!/usr/bin/env python3
import sys
import glob
import json
import pandas as pd
from metadata import loadFiles, getBuckets

IP = eval(sys.argv[2])
graph_name = sys.argv[1]
graph_path = graph_name + '/' + graph_name
layer_path = graph_path + '_layers/'
waves_path = graph_path + '_waves/'
data = loadFiles(graph_name)


# Layers
def lcc2CC(layer, cclayerfile):
    cclayers = pd.read_csv(
        cclayerfile,
        header=None,
        names=['vertex', 'CC', 'Layer', 'cc'],
        usecols=['CC', 'Layer', 'cc']
    )
    cclayers.query('Layer==@layer', inplace=True)
    cclayers.drop_duplicates(inplace=True)
    cclayers.set_index('cc', inplace=True)
    cclayers = cclayers.transpose()
    cclayers.drop('Layer', inplace=True)
    # print(cclayers)
    return cclayers


del data['layers']['0']
del data['ccs']['-1']
data['ccbinfile'] = graph_path + '.cc'
for layer, linfo in data['layers'].items():
    if 'waves' in linfo:
        if linfo['edges'] < IP:
            del linfo['waves']
        else:
            del linfo['waves']['0']
            linfo['wavefile'] = glob.glob(waves_path + '*-' + layer + '-waves.csv')[0]
            for wave, winfo in linfo['waves'].items():
                if winfo['edges'] < IP:
                    for x in list(winfo.keys()):
                        if x.isdigit():
                            del winfo[x]
                else:
                    for wcc, wcinfo in winfo.items():
                        if not wcc.isdigit():
                            continue
                        if wcinfo['edges'] < IP:
                            del wcinfo['fragments']

    linfo['ccfile'] = glob.glob(layer_path + '*-' + str(linfo['file_suffix']) + '.cc-layers')[0]
    cc2CC = lcc2CC(int(layer), linfo['ccfile'])
    # linfo['lcc2CC'] = {x: cc2CC[x].CC for x in cc2CC}
    del linfo['ccs']['-1']
    for lcc, cinfo in linfo['ccs'].items():
        # print(lcc)
        # print(cinfo)
        cinfo['CC'] = int(cc2CC[int(lcc)].CC)
    del cc2CC
    del linfo['ccs']

    linfo['file'] = glob.glob(layer_path + '*-' + str(linfo['file_suffix']) + '.csv')[0]
    del linfo['file_suffix']

with open(graph_path + '-tree.json', 'w') as out:
    json.dump(data, out, indent='\t')
