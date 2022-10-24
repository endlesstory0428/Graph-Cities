#!/usr/bin/env python3
import sys
import metadata
import pandas as pd
import plotly_express as px
import numpy as np
from plotly.offline import plot

graph = metadata.loadFiles(sys.argv[1])
data = metadata.makeDataFrame(graph, sys.argv[2], *[int(x) for x in sys.argv[3:]])
freq_data = data.groupby(['edges']).size().reset_index(name='freq').reset_index()
# print(toplot.sort_values(by=data.columns[0]))
freq_data['edges'] = np.log2(freq_data['edges'])
# freq_data['freq'] = np.log2(freq_data['freq'])

plot(
    px.bar(
        freq_data,
        y='index',
        x='edges',
        text='freq',
        orientation='h',
        height=1000,
        labels={'edges': 'log(edges)'}
    )
)
