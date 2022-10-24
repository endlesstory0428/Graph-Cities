#!/usr/bin/env python3
import sys
import metadata
import pandas as pd
import plotly_express as px
from plotly.offline import plot

STAT=sys.argv[1]
GRAPH=sys.argv[2]

data = pd.read_json(
    GRAPH + '/' + GRAPH + '-layer-info.json', orient='index'
).dropna().astype(int).sort_index().drop(
    'file_suffix', axis=1
)
# print(toplot.sort_values(by=data.columns[0]))
x = data['vertices'].reset_index()
x.columns = ['layers', 'size']
y = data['edges'].reset_index()
y.columns = ['layers', 'size']
z = data[STAT].reset_index()
z.columns = ['layers', 'size']
toplot = pd.concat([x, y, z], keys=['vertices', 'edges', STAT]).reset_index(level=0)
toplot.columns = ['# of', 'layers', 'size']

plot(
    px.bar(
        toplot,
        x='layers',
        y='size',
        color='# of',
        # log_x=True,
        log_y=True,
        # line_group=,
        # line_shape="spline",
        # trendline='ols',
        # range_x=[0, 305],
        barmode='group',
        title=f'{GRAPH} Layers'
    )
)
