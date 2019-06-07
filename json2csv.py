#!/usr/bin/env python3
import sys
import pandas as pd

data = pd.read_json(sys.argv[1], orient='index').dropna().astype(int)

if ('layer-info' in sys.argv[1]):
    data = data['vertices'].reset_index()
    data.columns = ['layer', 'vertices']
    data.to_csv(sys.argv[1][:sys.argv[1].rindex('.')] + '.csv', index=False)
else:
    freq = data.groupby(['vertices']).size().reset_index(name='freq')
    freq.to_csv(sys.argv[1][:sys.argv[1].rindex('.')] + '.csv', index=False)
