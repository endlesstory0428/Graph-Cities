#!/usr/bin/env python3
import sys
import json
import glob
import pandas as pd

try:
    graph_name = sys.argv[1]
    graph_pre = graph_name + '/' + graph_name
    with open(sys.argv[2]) as f:
        inputs = sorted(
            [
                (int(x.split(',')[0]), int(x.split(',')[1]))
                for x in f.read().strip().split('\n')
            ]
        )
except ValueError:
    print("Input file contains non number id!", file=sys.stderr)
    sys.exit(1)
except (FileNotFoundError, IndexError):
    try:
        inputs = [(int(sys.argv[2]), int(sys.argv[3]))]
    except (ValueError, IndexError):
        print(
            """fpquery: query fixed points

    Usage:
        fpquery.py <data-set> <inputs file>
        fpquery.py <data-set> <layer> <connected component>
""",
            file=sys.stderr
        )
        sys.exit(1)

try:
    with open(graph_pre + '-layer-info.json') as f:
        file_suffixes = {int(x): str(y.get('file_suffix', 0)) for x, y in json.load(f).items()}
except FileNotFoundError:
    print("Graph " + graph_name + " not processed.", file=sys.stderr)
    sys.exit(1)

scans = {}
for x in inputs:
    try:
        suffix = glob.glob(graph_pre + '_layers/*-' + file_suffixes[x[0]] + '.cc-layers')
        assert (len(suffix) == 1)
        suffix = suffix[0]
    except (KeyError, AssertionError, IndexError):
        print("Input contains invalid layer!", file=sys.stderr)
        sys.exit(1)
    scans[suffix] = scans.get(suffix, set()).union([x])


def outfile(x):
    return '_'.join([graph_name, 'fp_nodes', 'l' + str(x[0]), 'fp' + str(x[1])]) + '.csv'


for f, s in scans.items():
    verts = pd.read_csv(
        f,
        header=None,
        names=['vertex', 'CC', 'layer', 'cc'],
        usecols=['vertex', 'layer', 'cc']
    )
    groups = verts.groupby(['layer', 'cc'])
    for fp in s:
        groups.get_group(fp).to_csv(outfile(fp), columns=['vertex'], index=False, header=False)
