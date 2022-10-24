#!/usr/bin/env python3
import sys
import pandas as pd

try:
    graph_name = sys.argv[1]
    graph_pre = graph_name + '/' + graph_name
    with open(sys.argv[2]) as f:
        inputs = sorted(
            [
                (
                    int(x.split(',')[0]), int(x.split(',')[1]), int(x.split(',')[2]),
                    int(x.split(',')[3])
                ) for x in f.read().strip().split('\n')
            ]
        )
except ValueError:
    print("Input file contains non number id!", file=sys.stderr)
    sys.exit(1)
except (FileNotFoundError, IndexError):
    try:
        inputs = [(int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]))]
    except (ValueError, IndexError):
        print(
            """wavequery: query waves and fragments

    Usage:
        wavequery.py <data-set> <inputs file>
        wavequery.py <data-set> <layer> <wave> <connected_component> <fragment>
""",
            file=sys.stderr
        )
        sys.exit(1)

scans = {}
for x in inputs:
    suffix = graph_pre + '_waves/layer-' + str(x[0]) + '-waves.csv'
    scans[suffix] = scans.get(suffix, set()).union([x])


def outfile(x):
    return '_'.join(
        [
            graph_name, 'nodes', 'l' + str(x[0]), 'w' + str(x[1]),
            'cc' + str(x[2]) if x[2] > 0 else 'cc_all', 'f' + str(x[3]) if x[3] > 0 else 'f_all'
        ]
    ) + '.csv'


for f, s in scans.items():
    verts = pd.read_csv(
        f,
        header=None,
        names=['vertex', 'target', 'wave', 'cc', 'level'],
        usecols=['vertex', 'wave', 'cc', 'level']
    )
    verts.drop_duplicates(inplace=True)
    ccgroups = verts.groupby(['wave', 'cc', 'level'])
    wlgroups = verts.groupby(['wave', 'level'])
    wcgroups = verts.groupby(['wave', 'cc'])
    wvgroups = verts.groupby(['wave'])
    for frag in s:
        if frag[2] < 1 and frag[3] < 1:
            wvgroups.get_group(frag[1]).drop_duplicates(subset='vertex').to_csv(
                outfile(frag), columns=['vertex'], index=False, header=False
            )
        elif frag[2] < 1:
            wlgroups.get_group((frag[1], frag[3])).to_csv(
                outfile(frag), columns=['vertex'], index=False, header=False
            )
        elif frag[3] < 1:
            wcgroups.get_group((frag[1], frag[2])).drop_duplicates(subset='vertex').to_csv(
                outfile(frag), columns=['vertex'], index=False, header=False
            )
        else:
            ccgroups.get_group(frag[1:]).to_csv(
                outfile(frag), columns=['vertex'], index=False, header=False
            )
