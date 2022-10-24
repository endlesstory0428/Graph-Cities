import sys
import json
import glob
from math import log2, ceil

def split_list(alist, wanted_parts=1):
    length = len(alist)
    return [alist[i * length // wanted_parts:(i + 1) * length // wanted_parts] for i in range(wanted_parts)]


if __name__ == "__main__":
    graph = sys.argv[1]
    wavemapList = []

    # vertProfile = getVertexProfile(graph)
    buckfiles = glob.glob(graph + '/graph-*.json')

    # print(sorted(buckfiles))
    for fn in sorted(buckfiles, reverse=True):
        with open(fn) as f:
            data = sorted(json.load(f), key=lambda x: (x['links'], x['nodes']) if type(x['links']) == int else (len(x['links']), len(x['nodes'])))

        # print(len(data))
        # print(len(data[0]['links']), len(data[len(data) // 2]['links']), len(data[-1]['links']))
        # print(data[len(data) // 2]['id'])
        num_fp = len(data)
        # print(data[-1]['id'])
        peel, lcc = data[-1]['id'].split('_')
        # peel, lcc = data[len(data) // 2]['id'].split('_')
        # wavemap = getWaveMap(graph, int(peel), int(lcc), vertProfile)
        # with open(f'{graph}/{graph}_waves/wavemap_{peel}_{lcc}_{num_fp}.json', 'w') as f:
            # json.dump(wavemap, f, indent=2)
        wavemapList.append((int(peel), int(lcc), 0, int(num_fp)))
        if num_fp > 1:
            num_choose = min(log2(8 * (num_fp - 1)), num_fp - 1)
            # print(int(num_choose))
            # assert (len(split_list(list(range(len(data) - 1)), int(num_choose))) == int(num_choose))
            for inds in split_list(list(range(len(data) - 1)), int(num_choose)):
                i = inds[len(inds) // 2]
                # print(i, end=', ')
                # print(data[i]['id'], end=', ')
                subpeel, sublcc = data[i]['id'].split('_')
                # wavemap = getWaveMap(graph, int(subpeel), int(sublcc), vertProfile)
                # with open(f'{graph}/{graph}_waves/wavemap_{peel}_{lcc}_{subpeel}_{sublcc}.json', 'w') as f:
                    # json.dump(wavemap, f, indent=2)
                wavemapList.append((int(subpeel), int(sublcc), int(peel), int(lcc)))
            # print()
    wavemapList.sort()
    with open(f'{graph}/wavemapList.l-lcc-buck.csv', 'w') as f:
        for row in wavemapList:
            f.write(f'{",".join(map(str, row))}\n')