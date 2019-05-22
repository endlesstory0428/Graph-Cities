#!/usr/bin/env python
import sys
import pandas as pd
# import plotly_express as px
# from plotly.offline import plot

# cclayers = pd.read_csv(
#     sys.argv[1],
#     header=None,
#     names=['vertex', 'CC', 'Layer', 'cc'],
#     usecols=['vertex', 'Layer', 'cc']
# ).query('Layer==' + sys.argv[2].split('-')[-2]).sort_values(by='vertex'
#                                                             ).reset_index(drop=True)

waves = pd.read_csv(
    sys.argv[2],
    header=None,
    names=['vertex', 'Level', 'Wave', 'wcc', 'meta_node'],
    usecols=['vertex', 'Level', 'Wave', 'wcc']
).sort_values(by='vertex').reset_index(drop=True)

# waves['cc'] = cclayers['cc']
waveMap = waves.groupby(['Wave', 'Level', 'wcc']).size().reset_index(name='size')
waveMap.to_csv(sys.argv[2][:-4] + '.cc-waves', index=False)
