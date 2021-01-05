import sys
import csv
import ijson
from math import log2

# with open(sys.argv[2]) as f:
#     degdata = {int(v): int(d) for v, d in csv.reader(f)}
# print("Read Degree Dist")

with open(sys.argv[1], 'rb') as f:
    for vertex, profile in ijson.kvitems(f, ''):
        # if sum(profile.values()) != degdata[int(vertex)]:
        #     print(vertex, sum(profile.values()), degdata[int(vertex)])
        entropy = 0
        deg = sum(profile.values())
        for lcc, li in profile.items():
            if li != 0:
                entropy -= (li / deg) * log2(li / deg)
        print(f'{vertex},{entropy}')
