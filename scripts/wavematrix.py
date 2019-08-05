#!/usr/bin/env python3
import sys
import json
import pandas as pd


def getWaveMatrix(g, l, w, wcc):
    graph = g
    graph += '/' + graph
    layer = l

    graph += '_waves/layer-' + str(layer)
    wavecsvfile = graph + '-waves.csv'
    wavesourcesfile = graph + '-wave-sources.csv'

    print('reading', wavecsvfile)
    iter_csv = pd.read_csv(
        wavecsvfile,
        header=None,
        names=['source', 'target', 'wave', 'wcc', 'fragment'],
        usecols=['source', 'target', 'wave', 'wcc', 'fragment'],
        iterator=True
    )
    waves = pd.concat(
        [chunk[(chunk['wave'] == w) & (chunk['wcc'] == wcc)] for chunk in iter_csv]
    )
    waves.drop(['wave', 'wcc'], axis=1, inplace=True)
    print('read', wavecsvfile)

    print('reading', wavesourcesfile)
    iter_csv = pd.read_csv(
        wavesourcesfile,
        header=None,
        names=['vertex', 'wave', 'fragment'],
        usecols=['vertex', 'wave', 'fragment'],
        iterator=True
    )
    wavesets = pd.concat([chunk[chunk['wave'] >= w] for chunk in iter_csv])
    # wavesets.drop(['wave'], axis=1, inplace=True)
    print('read', wavesourcesfile)

    wsgps = {x: set(y['vertex']) for x, y in wavesets.query('wave==@w').groupby(['fragment'])}

    wavemat = {'sets': {}, 'adj': {}}
    checkcount = 0
    v2f = {}
    for frag, fg in waves.groupby(['fragment']):
        inter = set(fg['source']).intersection(wsgps[frag])
        for x in inter:
            v2f[x] = frag

        setlen = len(inter)
        assert (setlen > 0)
        checkcount += setlen
        wavemat['sets'][frag] = inter
    # lastset = set(waves.query('wave>@w')['source']).intersection(set(waves['source']))
    lastset = set(wavesets.query('wave>@w')['vertex']).intersection(set(waves['source']))
    for x in lastset:
        v2f[x] = len(wavemat['sets'])
    # assert(lastset == lastset2)
    # print(checkcount + len(lastset), len(wcg))
    # print(len(lastset))
    assert (checkcount + len(lastset) <= len(waves))
    if len(lastset) > 0:
        wavemat['sets'][len(wavemat['sets'])] = lastset

    # print(v2f)
    wavemat['adj'] = {x: {} for x in range(len(wavemat['sets']))}
    # print(wavemat['adj'])
    for s, t, f in waves.values:
        if s in v2f and t in v2f:
            wavemat['adj'][v2f[s]][v2f[t]] = wavemat['adj'][v2f[s]].get(v2f[t], 0) + 1

    return wavemat
    # print('writing', waveinfofile)
    # with open(waveinfofile, 'w') as outfile:
    #     json.dump(ccwaves, outfile, indent='\t')
    # print('wrote', waveinfofile)
