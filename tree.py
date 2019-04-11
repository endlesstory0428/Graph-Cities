import fileinput
import json
import math

IP = 2**16


def getBuckets(strjson):
    def numverts(x):
        return int(strjson[x].get('vertices', 0))

    ordered = sorted(strjson.keys(), key=numverts)
    size = sum([numverts(x) for x in strjson])
    logsize = math.ceil(math.log2(size))
    # print(size)
    b = 1
    p = 1
    e = 0
    buckets = {}
    for x in ordered:
        if int(x) < 0:
            continue

        e += strjson[x]['edges']

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

        buckets[b][p] += [
            {
                int(x): {
                    'v': strjson[x]['vertices'],
                    'e': strjson[x]['edges']
                }
            }
        ]
        # print(logsize)
    return buckets


jstr = ''.join([line for line in fileinput.input()])
din = json.loads(jstr)

print(json.dumps(getBuckets(din), indent=4))
