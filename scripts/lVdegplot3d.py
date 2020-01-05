#!/usr/bin/env python3
import sys
import glob
import numpy as np
import pandas as pd
import plotly_express as px
import plotly.graph_objects as go
from plotly.offline import plot

cachepath = '.cache/' + '_'.join(sys.argv).replace('/', '-').replace('.', 'x')
print(cachepath)


def f2l(file_name):
    return int(file_name[:-13].split('-')[-1])


GRAPH = sys.argv[1]

lccss = []
files = glob.glob(GRAPH + '/' + GRAPH + '_layers/layer-*.cc-info.json')
for layerfile in sorted(files, key=f2l):
    lccs = pd.read_json(layerfile, orient='index').sort_index()
    # lccs.index = pd.MultiIndex.from_tuples([(f2l(layerfile), x) for x in lccs.index])
    layer = pd.DataFrame({'layer': f2l(layerfile)}, index=lccs.index)
    lccs = pd.concat([layer, lccs], axis=1)
    lccss.append(lccs)

fpdist = pd.concat(lccss)
fpdist['avg_deg'] = fpdist['edges'] * 2 / fpdist['vertices']
toplot = fpdist.groupby(['layer', 'avg_deg']).size().reset_index(name='freq')
toplot['logfreq'] = np.log2(toplot['freq'] + 1)
# toplot['nlogfreq'] = 14 * toplot['logfreq'] / max(toplot['logfreq']) + 2

colors = px.colors.sequential.Rainbow[1:]
colorscale = tuple(
    zip(np.concatenate([[0], 10**-np.linspace(len(colors) - 2, 0,
                                              len(colors) - 1)]), colors)
)

# fig = go.Figure()
# fig.add_trace(
#     go.Scatter3d(
#         x=toplot['layer'],
#         y=toplot['avg_deg'],
#         z=toplot['freq'],
#         mode='markers',
#         marker=dict(
#             # size=toplot['nlogfreq'],
#             size=5,
#             color=toplot['freq'],
#             colorscale=colorscale,
#             # opacity=0.9,
#             showscale=True
#         ),
#         text='',
#         name=''
#     )
# )

fig = px.scatter_3d(
    toplot,
    x='layer',
    y='avg_deg',
    z='freq',
    color='freq',
    size='logfreq',
    log_x=True,
    # log_y=True,
    log_z=True,
    # range_x=[0, 305],
    color_continuous_scale=px.colors.colorscale_to_colors(colorscale),
    hover_data=['layer', 'avg_deg', 'freq'],
    labels={
        'layer': 'Layer',
        'avg_deg': 'Avg. Degree',
        'freq': '# FPs'
    },
    title=f'{GRAPH} Avg Degree of Fixed Points'
)
fig.update_layout(
    scene_aspectmode='manual',
    scene_aspectratio=dict(x=3, y=2, z=1),
    # scene_xaxis=dict(zerolinecolor='rgba(0,0,0,1)'),
    # scene_yaxis=dict(zerolinecolor='rgba(0,0,0,1)'),
    # scene_zaxis=dict(zerolinecolor='rgba(0,0,0,1)'),
    coloraxis=dict(colorscale=colorscale)
)
fig.update_traces(marker=dict(line=dict(width=0.1, color='rgba(0,0,0,1)')))
fig.update(data=[dict(hovertemplate='<br>'.join(fig.data[0].hovertemplate.split('<br>')[:-1]))])
# fig.data[0].hovertemplate = '<br>'.join(fig.data[0].hovertemplate.split('<br>')[:-1])
# fig.layout['coloraxis']['colorscale'] = colorscale

ones = np.ones(max(toplot['layer']) + 2)
lineaxis = np.array(range(max(toplot['layer']) + 2))
lowerline = lineaxis
upperline = 2 * lineaxis
fig.add_trace(
    go.Scatter3d(
        x=lineaxis, y=lowerline, z=ones, mode='lines', line_color='rgba(0,0,0,1)', name=''
    )
)
fig.add_trace(
    go.Scatter3d(
        x=lineaxis, y=upperline, z=ones, mode='lines', line_color='rgba(0,0,0,1)', name=''
    )
)
fig.update(layout_showlegend=False)
fig.update_layout(margin=dict(l=0, r=0, b=0, t=0))
plot(fig)
