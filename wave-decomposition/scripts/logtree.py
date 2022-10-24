import sys
import glob
import pandas as pd
from metadata import loadFiles, getBuckets

graph_name = sys.argv[1]
graph_path = graph_name + '/' + graph_name
layers_path = graph_path + '_layers/'
waves_path = graph_path + '_waves/'
data = loadFiles(graph_name)

# Layers
newdata = getBuckets(data['layers'], 'l')


def lcc2CC(layer, suffix):
    cclayerfile = glob.glob(layers_path + '*-' + str(suffix) + '.cc-layers')[0]
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
    return cclayers


for logB, paramB in newdata.items():
    for pb, layers in paramB.items():
        if len(layers) > 1:
            for layer in layers:
                newdata[logB][pb][layer]['file'] = glob.glob(
                    layers_path + '*-' + str(data['layers'][layer[1:]]['file_suffix']) + '.csv'
                )[0]
                del data['layers'][layer[1:]]
        else:
            pass
