import fileinput
import json
import math

IP = 2**16

jstr = ''.join([line for line in fileinput.input()])
din = json.loads(jstr)


def numverts(x):
    return int(din[x].get('vertices', 0))


ordered = sorted(din.keys(), key=numverts)
size = sum([numverts(x) for x in din])
logsize = math.ceil(math.log2(size))
# print(size)
b = 1
p = 1
e = 0
buckets = {}
for x in ordered:
    if int(x) < 0:
        continue

    e += din[x]['edges']

    while numverts(x) > logsize:
        logsize *= logsize
        b += 1
        p = 1

    if b not in buckets:
        buckets[b] = {}

    if e > IP:
        # buckets[b]['edges'] = e
        p += 1
        e = 0

    if p not in buckets[b]:
        buckets[b][p] = []

    buckets[b][p] += [{int(x): {'v': din[x]['vertices'], 'e': din[x]['edges']}}]
    # print(logsize)
print(json.dumps(buckets, indent=4))
