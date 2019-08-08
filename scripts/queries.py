#!/usr/bin/env python3
import json
import glob
import pandas as pd

# def loadGraph(g):
# graph = g
# graph += '/' + graph
# pass


def getWaveMatrix(g, l, w, wcc):
    """ Inputs:
            g   = graph_name
            l   = layer number
            w   = wave number
            wcc = wave connected component id

        Outputs: json
            {
                "sets":
                    [
                        "0" : [vertex, #, ...],
                        "1" : [#, #, ...],
                        ...
                    ],
                "adj":
                    {
                        "0" : {{"0":weight}, {"1":#}, ...},
                        "1" : {{"0":#}, {"1":#}, ...},
                        ...
                    }
            }
    """

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
        wavemat['sets'][frag] = list(inter)
    # lastset = set(waves.query('wave>@w')['source']).intersection(set(waves['source']))
    lastset = set(wavesets.query('wave>@w')['vertex']).intersection(set(waves['source']))
    for x in lastset:
        v2f[x] = len(wavemat['sets'])
    # assert(lastset == lastset2)
    # print(checkcount + len(lastset), len(wcg))
    # print(len(lastset))
    assert (checkcount + len(lastset) <= len(waves))
    if len(lastset) > 0:
        wavemat['sets'][len(wavemat['sets'])] = list(lastset)

    # print(v2f)
    wavemat['adj'] = {x: {} for x in range(len(wavemat['sets']))}
    # print(wavemat['adj'])
    for s, t, f in waves.values:
        if s in v2f and t in v2f:
            wavemat['adj'][v2f[s]][v2f[t]] = wavemat['adj'][v2f[s]].get(v2f[t], 0) + 1

    return json.dumps(wavemat)


def getDCFragmentDist(g, l, w, size_type='edges'):
    """ Inputs:
            g   = graph_name
            l   = layer number
            w   = wave number

        Outputs: json
            {
                "0": size,
                "1": #,
                ...
            }
    """

    graph = g
    graph += '/' + graph
    layer = l

    graph += '_waves/layer-' + str(layer)
    wavecsvfile = graph + '-waves.csv'

    print('reading', wavecsvfile)
    iter_csv = pd.read_csv(
        wavecsvfile,
        header=None,
        names=['source', 'target', 'wave', 'wcc', 'fragment'],
        usecols=['source', 'target', 'wave', 'fragment'],
        iterator=True
    )
    waves = pd.concat([chunk[chunk['wave'] == w] for chunk in iter_csv])
    waves.drop(['wave'], axis=1, inplace=True)
    print('read', wavecsvfile)

    frags = waves.groupby(['fragment'])
    sizes = frags.size() // 2
    return sizes.to_json()


def getDCFragments(g, l, w):
    """ Inputs:
            g   = graph_name
            l   = layer number
            w   = wave number

        Outputs: json
            {
                "0": "src,tgt\n#,#\n...",
                "1": "#,#\n#,#\n...",
                ...
            }
    """

    graph = g
    graph += '/' + graph
    layer = l

    graph += '_waves/layer-' + str(layer)
    wavecsvfile = graph + '-waves.csv'

    print('reading', wavecsvfile)
    iter_csv = pd.read_csv(
        wavecsvfile,
        header=None,
        names=['source', 'target', 'wave', 'wcc', 'fragment'],
        usecols=['source', 'target', 'wave', 'fragment'],
        iterator=True
    )
    waves = pd.concat([chunk[chunk['wave'] == w] for chunk in iter_csv])
    waves.drop(['wave'], axis=1, inplace=True)
    print('read', wavecsvfile)

    frags = waves.groupby(['fragment'])
    jfrags = {}
    for frag, edges in frags:
        jfrags[frag] = edges.drop('fragment', axis=1).to_csv(header=False, index=False)
    return json.dumps(jfrags)


def getDCFragment(g, l, w, f):
    """ Inputs:
            g   = graph_name
            l   = layer number
            w   = wave number
            f   = fragment number

        Outputs: csv
            src,tgt
            #,#
            ...
    """

    graph = g
    graph += '/' + graph
    layer = l

    graph += '_waves/layer-' + str(layer)
    wavecsvfile = graph + '-waves.csv'

    print('reading', wavecsvfile)
    iter_csv = pd.read_csv(
        wavecsvfile,
        header=None,
        names=['source', 'target', 'wave', 'wcc', 'fragment'],
        usecols=['source', 'target', 'wave', 'fragment'],
        iterator=True
    )
    frag = pd.concat(
        [chunk[(chunk['wave'] == w) & (chunk['fragment'] == f)] for chunk in iter_csv]
    )
    frag.drop(['wave', 'fragment'], axis=1, inplace=True)
    print('read', wavecsvfile)

    return frag.to_csv(header=False, index=False)


def getFragmentDist(g, l, w, wcc, size_type='edges'):
    """ Inputs:
            g   = graph_name
            l   = layer number
            w   = wave number
            wcc = wave connected component id

        Outputs: json
            {
                "0": size,
                "1": #,
                ...
            }
    """

    graph = g
    graph += '/' + graph
    layer = l

    graph += '_waves/layer-' + str(layer)
    wavecsvfile = graph + '-waves.csv'

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

    frags = waves.groupby(['fragment'])
    sizes = frags.size() // 2
    return sizes.to_json()


def getFragments(g, l, w, wcc):
    """ Inputs:
            g   = graph_name
            l   = layer number
            w   = wave number
            wcc = wave connected component id

        Outputs: json
            {
                "0": "src,tgt\n#,#\n...",
                "1": "#,#\n#,#\n...",
                ...
            }
    """

    graph = g
    graph += '/' + graph
    layer = l

    graph += '_waves/layer-' + str(layer)
    wavecsvfile = graph + '-waves.csv'

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

    frags = waves.groupby(['fragment'])
    jfrags = {}
    for frag, edges in frags:
        jfrags[frag] = edges.drop('fragment', axis=1).to_csv(header=False, index=False)
    return json.dumps(jfrags)


def getFragment(g, l, w, wcc, f):
    """ Inputs:
            g   = graph_name
            l   = layer number
            w   = wave number
            wcc = wave connected component id
            f   = fragment number

        Outputs: csv
            src,tgt
            #,#
            ...
    """

    graph = g
    graph += '/' + graph
    layer = l

    graph += '_waves/layer-' + str(layer)
    wavecsvfile = graph + '-waves.csv'

    print('reading', wavecsvfile)
    iter_csv = pd.read_csv(
        wavecsvfile,
        header=None,
        names=['source', 'target', 'wave', 'wcc', 'fragment'],
        usecols=['source', 'target', 'wave', 'wcc', 'fragment'],
        iterator=True
    )
    frag = pd.concat(
        [
            chunk[(chunk['wave'] == w) & (chunk['wcc'] == wcc) & (chunk['fragment'] == f)]
            for chunk in iter_csv
        ]
    )
    frag.drop(['wave', 'wcc', 'fragment'], axis=1, inplace=True)
    print('read', wavecsvfile)

    return frag.to_csv(header=False, index=False)


def getWaveCCDist(g, l, lcc, w, size_type='edges'):
    """ Inputs:
            g   = graph_name
            l   = layer number
            lcc = layer connected component id
            w   = wave number

        Outputs: json
            {
                "wave_cc_id": size,
                "#": #,
                ...
            }
    """

    graph = g
    graph += '/' + graph
    layer = l

    with open(graph + '-layer-info.json') as f:
        file_suffix = json.load(f)[str(layer)]['file_suffix']
    cclayerfile = glob.glob(graph + '_layers/*-' + str(file_suffix) + '.cc-layers')[0]
    wavecsvfile = graph + '_waves/layer-' + str(layer) + '-waves.csv'

    print('reading', cclayerfile)
    verts = set(
        pd.read_csv(
            cclayerfile,
            header=None,
            names=['vertex', 'CC', 'layer', 'cc'],
            usecols=['vertex', 'layer', 'cc']
        ).query('(layer==@layer) & (cc==@lcc)')['vertex']
    )
    print('read', cclayerfile)

    print('reading', wavecsvfile)
    iter_csv = pd.read_csv(
        wavecsvfile,
        header=None,
        names=['source', 'target', 'wave', 'wcc', 'fragment'],
        usecols=['source', 'target', 'wave', 'wcc'],
        iterator=True
    )
    waves = pd.concat(
        [chunk[chunk['source'].isin(verts) & (chunk['wave'] == w)] for chunk in iter_csv]
    )
    waves.drop(['wave'], axis=1, inplace=True)
    print('read', wavecsvfile)

    wgps = waves.groupby(['wcc'])
    sizes = wgps.size() // 2
    return sizes.to_json()


def getWaveCCs(g, l, lcc, w):
    """ Inputs:
            g   = graph_name
            l   = layer number
            lcc = layer connected component id
            w   = wave number

        Outputs: json
            {
                "wave_cc_id": "src,tgt\n#,#\n...",
                "#": "#,#\n#,#\n...",
                ...
            }
    """

    graph = g
    graph += '/' + graph
    layer = l

    with open(graph + '-layer-info.json') as f:
        file_suffix = json.load(f)[str(layer)]['file_suffix']
    cclayerfile = glob.glob(graph + '_layers/*-' + str(file_suffix) + '.cc-layers')[0]
    wavecsvfile = graph + '_waves/layer-' + str(layer) + '-waves.csv'

    print('reading', cclayerfile)
    verts = set(
        pd.read_csv(
            cclayerfile,
            header=None,
            names=['vertex', 'CC', 'layer', 'cc'],
            usecols=['vertex', 'layer', 'cc']
        ).query('(layer==@layer) & (cc==@lcc)')['vertex']
    )
    print('read', cclayerfile)

    print('reading', wavecsvfile)
    iter_csv = pd.read_csv(
        wavecsvfile,
        header=None,
        names=['source', 'target', 'wave', 'wcc', 'fragment'],
        usecols=['source', 'target', 'wave', 'wcc'],
        iterator=True
    )
    waves = pd.concat(
        [chunk[chunk['source'].isin(verts) & (chunk['wave'] == w)] for chunk in iter_csv]
    )
    waves.drop(['wave'], axis=1, inplace=True)
    print('read', wavecsvfile)

    wgps = waves.groupby(['wcc'])
    jwccs = {}
    for wcc, edges in wgps:
        jwccs[wcc] = edges.drop('wcc', axis=1).to_csv(header=False, index=False)
    return json.dumps(jwccs)


def getWaveCC(g, l, w, wcc):
    """ Inputs:
            g   = graph_name
            l   = layer number
            w   = wave number
            wcc = wave connected component id

        Outputs: csv
            src,tgt
            #,#
            ...
    """

    graph = g
    graph += '/' + graph
    layer = l

    graph += '_waves/layer-' + str(layer)
    wavecsvfile = graph + '-waves.csv'

    print('reading', wavecsvfile)
    iter_csv = pd.read_csv(
        wavecsvfile,
        header=None,
        names=['source', 'target', 'wave', 'wcc', 'fragment'],
        usecols=['source', 'target', 'wave', 'wcc'],
        iterator=True
    )
    wcc = pd.concat([chunk[(chunk['wave'] == w) & (chunk['wcc'] == wcc)] for chunk in iter_csv])
    wcc.drop(['wave', 'wcc'], axis=1, inplace=True)
    print('read', wavecsvfile)

    return wcc.to_csv(header=False, index=False)


def getWaveDist(g, l, lcc, size_type='edges'):
    """ Inputs:
            g   = graph_name
            l   = layer number
            lcc = layer connected component id

        Outputs: json
            {
                "1": size,
                "2": #,
                ...
            }
    """

    graph = g
    graph += '/' + graph
    layer = l

    with open(graph + '-layer-info.json') as f:
        file_suffix = json.load(f)[str(layer)]['file_suffix']
    cclayerfile = glob.glob(graph + '_layers/*-' + str(file_suffix) + '.cc-layers')[0]
    wavecsvfile = graph + '_waves/layer-' + str(layer) + '-waves.csv'

    print('reading', cclayerfile)
    verts = set(
        pd.read_csv(
            cclayerfile,
            header=None,
            names=['vertex', 'CC', 'layer', 'cc'],
            usecols=['vertex', 'layer', 'cc']
        ).query('(layer==@layer) & (cc==@lcc)')['vertex']
    )
    print('read', cclayerfile)

    print('reading', wavecsvfile)
    iter_csv = pd.read_csv(
        wavecsvfile,
        header=None,
        names=['source', 'target', 'wave', 'wcc', 'fragment'],
        usecols=['source', 'target', 'wave'],
        iterator=True
    )
    waves = pd.concat([chunk[chunk['source'].isin(verts)] for chunk in iter_csv])
    print('read', wavecsvfile)

    wgps = waves.groupby(['wave'])
    sizes = wgps.size() // 2
    return sizes.to_json()


def getWaves(g, l, lcc):
    """ Inputs:
            g   = graph_name
            l   = layer number
            lcc = layer connected component id

        Outputs: json
            {
                "1": "src,tgt\n#,#\n...",
                "2": "#,#\n#,#\n...",
                ...
            }
    """

    graph = g
    graph += '/' + graph
    layer = l

    with open(graph + '-layer-info.json') as f:
        file_suffix = json.load(f)[str(layer)]['file_suffix']
    cclayerfile = glob.glob(graph + '_layers/*-' + str(file_suffix) + '.cc-layers')[0]
    wavecsvfile = graph + '_waves/layer-' + str(layer) + '-waves.csv'

    print('reading', cclayerfile)
    verts = set(
        pd.read_csv(
            cclayerfile,
            header=None,
            names=['vertex', 'CC', 'layer', 'cc'],
            usecols=['vertex', 'layer', 'cc']
        ).query('(layer==@layer) & (cc==@lcc)')['vertex']
    )
    print('read', cclayerfile)

    print('reading', wavecsvfile)
    iter_csv = pd.read_csv(
        wavecsvfile,
        header=None,
        names=['source', 'target', 'wave', 'wcc', 'fragment'],
        usecols=['source', 'target', 'wave'],
        iterator=True
    )
    waves = pd.concat([chunk[chunk['source'].isin(verts)] for chunk in iter_csv])
    print('read', wavecsvfile)

    wgps = waves.groupby(['wave'])
    jwaves = {}
    for wave, edges in wgps:
        jwaves[wave] = edges.drop('wave', axis=1).to_csv(header=False, index=False)
    return json.dumps(jwaves)


def getWave(g, l, lcc, w):
    """ Inputs:
            g   = graph_name
            l   = layer number
            lcc = layer connected component id
            w   = wave number

        Outputs: csv
            src,tgt
            #,#
            ...
    """

    graph = g
    graph += '/' + graph
    layer = l

    with open(graph + '-layer-info.json') as f:
        file_suffix = json.load(f)[str(layer)]['file_suffix']
    cclayerfile = glob.glob(graph + '_layers/*-' + str(file_suffix) + '.cc-layers')[0]
    wavecsvfile = graph + '_waves/layer-' + str(layer) + '-waves.csv'

    print('reading', cclayerfile)
    verts = set(
        pd.read_csv(
            cclayerfile,
            header=None,
            names=['vertex', 'CC', 'layer', 'cc'],
            usecols=['vertex', 'layer', 'cc']
        ).query('(layer==@layer) & (cc==@lcc)')['vertex']
    )
    print('read', cclayerfile)

    print('reading', wavecsvfile)
    iter_csv = pd.read_csv(
        wavecsvfile,
        header=None,
        names=['source', 'target', 'wave', 'wcc', 'fragment'],
        usecols=['source', 'target', 'wave'],
        iterator=True
    )
    waves = pd.concat(
        [chunk[chunk['source'].isin(verts) & (chunk['wave'] == w)] for chunk in iter_csv]
    )
    waves.drop(['wave'], axis=1, inplace=True)
    print('read', wavecsvfile)

    return waves.to_csv(header=False, index=False)


def getLayerCCDist(g, l, size_type='edges'):
    """ Inputs:
            g   = graph_name
            l   = layer number

        Outputs: json
            {
                "layer_cc_id": size,
                "#": #,
                ...
            }
    """

    graph = g
    graph += '/' + graph
    layer = l

    with open(graph + '_layers/layer-' + str(l) + '.cc-info.json') as f:
        layerCCdist = json.load(f)

    del layerCCdist['-1']
    sizes = {}
    for layer, info in layerCCdist.items():
        sizes[int(layer)] = info['edges']

    return json.dumps(sizes)


def getLayerCCs(g, l, lcc):
    """ Inputs:
            g   = graph_name
            l   = layer number
            lcc = layer connected component id

        Outputs: json
            {
                "layer_cc_id": "src,tgt\n#,#\n...",
                "#": "#,#\n#,#\n...",
                ...
            }
    """

    graph = g
    graph += '/' + graph
    layer = l

    with open(graph + '-layer-info.json') as f:
        file_suffix = json.load(f)[str(layer)]['file_suffix']
    cclayerfile = glob.glob(graph + '_layers/*-' + str(file_suffix) + '.cc-layers')[0]
    layercsvfile = glob.glob(graph + '_layers/*-' + str(file_suffix) + '.csv')[0]

    print('reading', cclayerfile)
    cclayers = pd.read_csv(
        cclayerfile,
        header=None,
        names=['vertex', 'CC', 'layer', 'cc'],
        usecols=['vertex', 'layer', 'cc']
    ).query('layer==@layer')
    cclayers.drop(['layer'], axis=1, inplace=True)
    print('read', cclayerfile)

    print('reading', layercsvfile)
    iter_csv = pd.read_csv(
        layercsvfile,
        header=None,
        names=['source', 'target', 'layer'],
        usecols=['source', 'target', 'layer'],
        iterator=True
    )
    layers = pd.concat([chunk[chunk['layer'] == l] for chunk in iter_csv])
    layers.columns = ['source', 'target', 'lcc']
    layers['lcc'] = -1
    print('read', layercsvfile)

    for lcc, verts in cclayers.groupby(['cc']):
        layers['lcc'][layers['source'].isin(verts['vertex'])] = lcc

    lgps = layers.groupby(['lcc'])
    jlccs = {}
    for lcc, edges in lgps:
        jlccs[lcc] = edges.drop('lcc', axis=1).to_csv(header=False, index=False)
    return json.dumps(jlccs)


def getLayerCC(g, l, lcc):
    """ Inputs:
            g   = graph_name
            l   = layer number
            lcc = layer connected component id

        Outputs: csv
            src,tgt
            #,#
            ...
    """

    graph = g
    graph += '/' + graph
    layer = l

    with open(graph + '-layer-info.json') as f:
        file_suffix = json.load(f)[str(layer)]['file_suffix']
    cclayerfile = glob.glob(graph + '_layers/*-' + str(file_suffix) + '.cc-layers')[0]
    layercsvfile = glob.glob(graph + '_layers/*-' + str(file_suffix) + '.csv')[0]

    print('reading', cclayerfile)
    verts = set(
        pd.read_csv(
            cclayerfile,
            header=None,
            names=['vertex', 'CC', 'layer', 'cc'],
            usecols=['vertex', 'layer', 'cc']
        ).query('(layer==@layer) & (cc==@lcc)')['vertex']
    )
    print('read', cclayerfile)

    print('reading', layercsvfile)
    iter_csv = pd.read_csv(
        layercsvfile,
        header=None,
        names=['source', 'target', 'layer'],
        usecols=['source', 'target', 'layer'],
        iterator=True
    )
    layers = pd.concat(
        [chunk[chunk['source'].isin(verts) & (chunk['layer'] == l)] for chunk in iter_csv]
    )
    layers.drop(['layer'], axis=1, inplace=True)
    print('read', layercsvfile)

    return layers.to_csv(header=False, index=False)


def getLayerDist(g, size_type='edges'):
    """ Inputs:
            g   = graph_name

        Outputs: json
            {
                "layer_number": size,
                "#": #,
                ...
            }
    """

    graph = g
    graph += '/' + graph

    with open(graph + '-layer-info.json') as f:
        layerdist = json.load(f)

    del layerdist['0']
    sizes = {}
    for layer, info in layerdist.items():
        sizes[int(layer)] = info['edges']

    return json.dumps(sizes)


def getLayers(g):
    """ Inputs:
            g   = graph_name

        Outputs: json
            {
                "1": "src,tgt\n#,#\n...",
                "2": "#,#\n#,#\n...",
                ...
            }
    """

    graph = g
    graph += '/' + graph

    layercsvfiles = glob.glob(graph + '_layers/layer-*.csv')

    layers = pd.DataFrame()
    for layercsvfile in layercsvfiles:
        print('reading', layercsvfile)
        iter_csv = pd.read_csv(
            layercsvfile,
            header=None,
            names=['source', 'target', 'layer'],
            usecols=['source', 'target', 'layer'],
            iterator=True
        )
        layers = pd.concat([layers, pd.concat(chunk for chunk in iter_csv)])
        print('read', layercsvfile)

    lgps = layers.groupby(['layer'])
    jlayer = {}
    for layer, edges in lgps:
        jlayer[layer] = edges.drop('layer', axis=1).to_csv(header=False, index=False)
    return json.dumps(jlayer)


def getLayer(g, l):
    """ Inputs:
            g   = graph_name
            l   = layer number

        Outputs: csv
            src,tgt
            #,#
            ...
    """

    graph = g
    graph += '/' + graph
    layer = l

    with open(graph + '-layer-info.json') as f:
        file_suffix = json.load(f)[str(layer)]['file_suffix']
    layercsvfile = glob.glob(graph + '_layers/*-' + str(file_suffix) + '.csv')[0]

    print('reading', layercsvfile)
    iter_csv = pd.read_csv(
        layercsvfile,
        header=None,
        names=['source', 'target', 'layer'],
        usecols=['source', 'target', 'layer'],
        iterator=True
    )
    layers = pd.concat([chunk[chunk['layer'] == l] for chunk in iter_csv])
    layers.drop(['layer'], axis=1, inplace=True)
    print('read', layercsvfile)

    return layers.to_csv(header=False, index=False)
