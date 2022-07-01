import sys
import json
import pandas as pd
from collections import defaultdict
from disjoint_set import DisjointSet

def getFPMetaDagCover(g, l, lcc):
    layer = int(l)
    lcc = int(lcc)

    graph = f'{g}/{g}_waves/layer-{layer}'
    waveCsvFile = f'{graph}-waves.csv'
    waveSourcesFile = f'{graph}-wave-sources.csv'
    waveDistFile = f'{graph}-waves-info.json'


    print(f'reading {waveDistFile}', file = sys.stderr)
    with open(waveDistFile) as distFile:
        wDist = json.load(distFile)
        del wDist['0']
    print(f'read {waveDistFile}', file = sys.stderr)

    waveWaveCCSet = set()
    for w, wInfo in wDist.items():
        del wInfo['vertices']
        del wInfo['edges']
        for wcc, wccInfo in wInfo.items():
            if wccInfo['layer-cc'] == lcc:
                waveWaveCCSet.add((int(w), int(wcc)))
    # print(waveWaveCCSet)


    print(f'reading {waveCsvFile}', file = sys.stderr)
    csvIter = pd.read_csv(
        waveCsvFile,
        header = None,
        names = ['source', 'target', 'wave', 'wcc', 'fragment'],
        usecols = ['source', 'target', 'wave', 'wcc', 'fragment'],
        iterator = True)

    waves = pd.concat(
        [
            pd.concat([group if groupIdx in waveWaveCCSet else None
                        for groupIdx, group in chunk.groupby(['wave', 'wcc'])])
            for chunk in csvIter
        ]
    )
    print(f'read {waveCsvFile}', file = sys.stderr)


    print(f'reading {waveSourcesFile}', file = sys.stderr)
    csvIter = pd.read_csv(
        waveSourcesFile,
        header=None,
        names=['vertex', 'wave', 'fragment'],
        usecols=['vertex', 'wave', 'fragment'],
        iterator=True,
    )
    waveSets = pd.concat([chunk for chunk in csvIter])
    print(f'read {waveSourcesFile}', file = sys.stderr)

    wf2VDict = dict()
    v2WFDict = dict()
    for wf, row in waveSets.groupby(['wave', 'fragment']):
        wf2VDict[wf] = set(row['vertex'])
        for v in row['vertex']:
            v2WFDict[v] = wf


    meta = {'sets': defaultdict(list), 'dag': defaultdict(list), 'nodes': defaultdict(dict), 'edges': defaultdict(int)}
    setIdx = 0
    v2SetDict = dict()
    cumSet = set()

    checkCount = 0

    for wf, row in waves.groupby(['wave', 'fragment']):
        intersection = set(row['source']).intersection(wf2VDict[wf])
        cumSet.update(intersection)
        for v in intersection:
            v2SetDict[v] = setIdx

        setLen = len(intersection)
        assert(setLen > 0)
        checkCount += setLen

        meta['sets'][setIdx] = list(intersection)
        setIdx += 1
    lastSet = set(waves['source'].loc[waves['target'].isin(intersection)]) - cumSet

    assert(checkCount + len(lastSet) <= len(set(waves['source'])))

    if lastSet:
        for v in lastSet:
            v2SetDict[v] = setIdx
        meta['sets'][setIdx] = list(lastSet)


    lastSetIdx = setIdx if lastSet else setIdx - 1

    ds = DisjointSet()
    print(f'Len Waves: {len(waves.values)}', file = sys.stderr)
    for s, t, w, wcc, f in waves.values:
        if s in v2SetDict and t in v2SetDict:
            if (v2SetDict[s] + 1 == v2SetDict[t]) or (v2SetDict[s] == v2SetDict[t] == lastSetIdx):
                key = f'{v2SetDict[s]}-{v2SetDict[t]}'
                meta['dag'][key].append((int(s), int(t)))
            if (v2SetDict[s] == v2SetDict[t]):
                ds.union(s, t)

    print('union-find done.', file = sys.stderr)


    innerESizes = defaultdict(int)
    for s, t, w, wcc, f in waves.values:
        if s in v2SetDict and t in v2SetDict:
            if (v2SetDict[s] + 1 == v2SetDict[t]):
                key = f'{ds.find(s)}-{ds.find(t)}'
                meta['edges'][key] += 1
            elif (v2SetDict[s] == v2SetDict[t]):
                innerESizes[ds.find(s)] += 1

    print('eSize done.', file = sys.stderr)


    for node in ds.itersets():
        verts = [int(v) for v in node]
        nodeId = ds.find(verts[0])

        meta['nodes'][str(nodeId)] = {
            'num_vertices': len(verts),
            'num_edges': innerESizes[nodeId],
            'set': v2SetDict[nodeId],
            'wave': int(v2WFDict[nodeId][0]),
            'frag': int(v2WFDict[nodeId][1]),
            'vertices': verts
        }

    return meta




if __name__ == '__main__':
    graph = sys.argv[1]
    layer = sys.argv[2]
    lcc = sys.argv[3]

    print(graph, layer, lcc, file = sys.stderr)

    output = getFPMetaDagCover(graph, layer, lcc)
    print(json.dumps(output, indent = 2))