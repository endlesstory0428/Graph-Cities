# Python 3.7.0
# Author: Yi-Hsiang Lo (yl1256@scarletmail.rutgers.edu)
# ------
# Usage:
# python3 convert.py -data cit-Patents

import json
import sys
import glob
import re
import math
import pandas as pd
import csv

IP = 32768

def list_exited_layer(layer_index,start,end):
    print('start is', start, ' end is ', end)
    ans = []
    for i in range(len(layer_index)):
        if layer_index[i] >= start and layer_index[i] <= end:
            ans.insert(0,layer_index[i])
    return ans

def edge_total(layer_map,edgelist):
    ans = 0
    for i in range(len(edgelist)):
        ans+=layer_map.get(edgelist[i])
    return ans

def createLink(line):
    # source, target, p = line.rstrip().split(',')
    source = line[0]
    target = line[1]
    p = line[2]

    link = {
        "source": int(source),
        "target": int(target),
        "p": int(p)
    }
    return link

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
                "edges": data[i]["edges"]
            }
            overview_data["layers"].append(layer_data)

    unique_a = pd.read_json(layer_file)
    layer_index = list(unique_a.columns)
    layer_map = {}
    large_layer_list = []
    for i in range(len(layer_index)):
        if layer_index[i] > 0:
            layer_map[layer_index[i]] = unique_a[layer_index[i]]['edges']
            if int(unique_a[layer_index[i]]['edges']) > IP:
                large_layer_list.append(layer_index[i])


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

        #add a check if file is too large
        #if num of edge > 2^15 we dont read
        print('haha, what is data file we doing now', filename[:-9]+"csv")
        print('list of layer num is', re.findall(r'[0-9]+', filename[:-9]))
        print('what is args['']', args['-data'] )
        testfile = filename[:-9]
        testfile = testfile.replace(args['-data'],'')
        testfile = testfile.replace('/_layers','')
        print('what is left ', testfile)
        #read the layer info file

        layer_num = re.findall(r'[0-9]+', testfile)
        layer_list = []
        edge_val = 0
        tmpflag = False #used to check if this file is good to proceed, bad is a file with single layer and edge_val > IP
        # or bad is a file with multi layer but all in large layer list
        if len(layer_num) > 1:
            #find the total exited layer index
            trueedge_list = list_exited_layer(layer_index,int(layer_num[0]),int(layer_num[1]))
            #total edge value
            edge_val = edge_total(layer_map,trueedge_list)
        else:
            #only one layer
            edge_val = layer_map.get(int(layer_num[0]))

        print('ans is', edge_val)

        if len(layer_num) == 1 and edge_val < IP:
            tmpflag = True
        elif len(layer_num) > 1:
            trueedge_list = list_exited_layer(layer_index,int(layer_num[0]),int(layer_num[1]))
            #check if one of item in trueedge_list not in large_list if true then set tmpflag to be true
            for pos in range(len(trueedge_list)):
                if trueedge_list[pos] not in large_layer_list:
                    tmpflag = True


        # layer_num = 0
        if tmpflag == True:

            with open(filename[:-9]+"csv") as json_file:
                reader = csv.reader(json_file, delimiter=',')
                for row in reader:
                    if int(row[2]) in large_layer_list:
                        # print('jump')
                        continue

                    result = createLink(row)
                    # print(len(list(result)))

                    # for link in result:
                    #     if link["source"] > link["target"]: continue
                    #     p = link["p"]
                    #     layers[p]["links"].append(link)
                    if result["source"] > result["target"]: continue
                    p = result["p"]
                    layers[p]["links"].append(result)
                    #lack of lengths   > - access Dan's
        else:
            print('this is large file skip to read it', filename[:-9]+"csv")
            #lack of lengths   > - access Dan's


        #populate the edge 

        # save for every layer
        for peel in layers:
            #todo access the lengh of edge here
            # cc_info_file = './' + data_name + '/' + data_name + '_layers/' +'layer-%d.cc-info.json' % (peel)


            filename = args['-data'] + '/' + args["-data"] + "_layers/" + args["-data"] + "-layer-" + str(peel) + ".json"
            print(f'Writing to {filename} ...')
            json.dump(layers[peel], open(filename, "w"))
