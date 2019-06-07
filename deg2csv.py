#!/usr/bin/env python3
import sys
import pandas as pd

degdist = pd.read_csv(
    sys.argv[1], header=None, names=['vertex', 'degree'], usecols=['vertex', 'degree']
)

degfreq = degdist.groupby(['degree']).size().reset_index(name='freq')
degfreq.to_csv(sys.argv[1] + '.csv', index=False)
