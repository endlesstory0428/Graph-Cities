import fileinput
import json
import math

jstr = ''.join([line for line in fileinput.input()])
din = json.loads(jstr)


def numedges(x):
    return int(din[x].get('edges', 0))


ordered = sorted(din.keys(), key=numedges)
size = sum([numedges(x) for x in din])
logsize = math.ceil(math.log2(size))
# print(size)
b = 1
buckets = {}
for x in ordered:
    if int(x) < 0:
        continue
    while numedges(x) > logsize:
        logsize *= logsize
        b += 1
    buckets[b] = buckets.get(b, []) + [int(x)]
    # print(logsize)
print(json.dumps(buckets, indent=4))
