# Python 3.7.0
# Author: Yi-Hsiang Lo (yl1256@scarletmail.rutgers.edu)
# ------
# Usage:
# python3 convert.py -data cit-Patents

import json
import sys
import glob

def getopts(argv):
    opts = {}
    while argv:
        if argv[0][0] == '-':
            opts[argv[0]] = argv[1]
        argv = argv[1:]
    return opts

if __name__ == '__main__':

    args = getopts(sys.argv)
    # print(args)
    print('Dataset: ' + args['-data'])

    decomposition_file = args['-data'] + '/' + args['-data'] + '-decomposition-info.json'
    layer_file = args['-data'] + '/' + args['-data'] + '-layer-info.json'
    overview_data = {}

    # overview
    with open(decomposition_file) as json_file:
        data = json.load(json_file)
        overview_data["name"] = args['-data']
        overview_data["description"] = ""
        overview_data["vertices"] = data["vertices"]
        overview_data["edges"] = data["edges"]

        overview_data["preprocessing-time"] = data["preprocessing-time"]
        overview_data["algorithm-time"] = data["algorithm-time"]
        overview_data["maxdeg"] = data["maxdeg"]
        overview_data["io-time"] = data["io-time"]

        overview_data["peels"] = []
        overview_data["layers"] = []

    print(f'Reading {layer_file} ...')
    with open(layer_file) as json_file:
        data = json.load(json_file)
        for i in data:
            if i == "0": continue
            overview_data["peels"].append(int(i))
            # print(i, data[i])
            layer_data = {
                "peel": int(i),
                "vertices": data[i]["vertices"],
                "edges": data[i]["edges"],
                "num_fixedpoints":data[i]["num_fixedpoints"],
		"num_waves":data[i]["num_waves"],
		"num_frags":data[i]["num_frags"]
            }
            overview_data["layers"].append(layer_data)

    json.dump(overview_data, open(args["-data"] + '/' + args["-data"] + ".json", "w"), indent=2)
    # json.dump(overview_data, open(args["-data"] + ".json", "w"))
    # print(json.dumps(overview_data, indent=2))

    for filename in glob.glob(args["-data"] + '/' + args["-data"] + "_layers/*.cc-layers"):
        print(f'Reading {filename} ...')
        layers = {}
        with open(filename) as json_file:
            lines = json_file.readlines()

            def createNode(line):
                id, _, peel, cmpt = line.rstrip().split(',')
                node = {
                    "id": int(id),
                    "peels": [int(peel)],
                    "cmpt": int(cmpt)
                }
                return node

            result = map(createNode, lines)
            # print(len(list(result)))

            for node in result:
                peel = node["peels"][0]
                if not peel in layers:
                    layers[peel] = {"nodes": [], "links": []}
                layers[peel]["nodes"].append(node)

        # with open(filename[:-9]+"csv.trim") as json_file:
        with open(filename[:-9]+"csv") as json_file:
            lines = json_file.readlines()

            def createLink(line):
                source, target, p = line.rstrip().split(',')
                link = {
                    "source": int(source),
                    "target": int(target),
                    "p": int(p)
                }
                return link

            result = map(createLink, lines)
            # print(len(list(result)))

            for link in result:
                if link["source"] > link["target"]: continue
                p = link["p"]
                layers[p]["links"].append(link)


        for peel in layers:
            filename = args['-data'] + '/' + args["-data"] + "_layers/" + args["-data"] + "-layer-" + str(peel) + ".json"
            print(f'Writing to {filename} ...')
            json.dump(layers[peel], open(filename, "w"))
