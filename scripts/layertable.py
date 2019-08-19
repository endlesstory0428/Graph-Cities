#!/usr/bin/env python3
import sys
import json
import pandas as pd

data = pd.read_json(
    sys.argv[1] + '/' + sys.argv[1] + '-layer-info.json', orient='index'
).dropna().astype(int).sort_index().drop(
    'file_suffix', axis=1
)

data['read_time'] = 0.0
data['time'] = 0.0
for layer in data.index:
    with open(sys.argv[1] + '/' + sys.argv[1] + '_waves/layer-' + str(layer) +
              '-wavedecomp-info.json') as f:
        tdata = json.load(f)
    time = tdata['algorithm-time'] / 1000
    ptime = tdata['preprocessing-time'] / 1000
    data['read_time'].at[layer] = ptime
    data['time'].at[layer] = time

print(
    data.to_csv(
        columns=[
            'vertices', 'edges', 'num_fixedpoints', 'num_waves', 'num_frags', 'time',
            'read_time'
        ],
        index_label='layer',
        sep='&'
    )
)
