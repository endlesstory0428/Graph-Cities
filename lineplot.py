#!/usr/bin/env python
import sys
import metadata
import pandas as pd
import plotly_express as px
from plotly.offline import plot

graph = metadata.loadFiles(sys.argv[1])
data = metadata.makeDataFrame(graph, sys.argv[2], *[int(x) for x in sys.argv[3:]])
# freq_data = data.groupby([data.columns[0], 'edges']).size().reset_index(name='freq')
x = data.loc[:, data.columns[0]:data.columns[2]:2]
x.columns = [data.columns[0], 'size']
y = data.loc[:, data.columns[0]:data.columns[1]]
y.columns = [data.columns[0], 'size']
toplot = pd.concat([y, x], keys=data.columns[1:3]).reset_index(level=0)
toplot.columns = ['# of', toplot.columns[1], toplot.columns[2]]

# print(toplot.sort_values(by=data.columns[0]))

plot(
    px.line(
        toplot.sort_values(by=data.columns[0]),
        x=data.columns[0],
        y='size',
        color=toplot.columns[0],
        # log_x=True,
        log_y=True,
        # line_group=,
        # line_shape="spline",
        # trendline='lowess',
        title=f'{sys.argv[1]} {sys.argv[2]}; ' +
        (len(sys.argv) > 3) * f'layer-{sys.argv[3-len(sys.argv)]} ' +
        (len(sys.argv) > 4) * f'wave-{sys.argv[4-len(sys.argv)]} ' +
        (len(sys.argv) > 5) * f'wave_cc-{sys.argv[5-len(sys.argv)]}'
    )
)
