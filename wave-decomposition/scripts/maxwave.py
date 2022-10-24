#!/usr/bin/env python3
import sys
import metadata

graph = metadata.loadFiles(sys.argv[1])
maxwave = 0
for layer, data in graph['layers'].items():
    if 'waves' in data:
        mw = int(max(data['waves'], key=int))
        if mw > maxwave:
            maxwave = mw
print(maxwave)
