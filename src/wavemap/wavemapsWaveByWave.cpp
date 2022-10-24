#include <algorithm>
#include <assert.h>
#include <boost/dynamic_bitset.hpp>
#include <errno.h>
#include <fcntl.h>
#include <fstream>
#include <iostream>
#include <limits.h>
#include <netinet/in.h>
#include <omp.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <sys/time.h>
#include <thread>
#include <unistd.h>
#include <sstream>
#include <vector>
#include <unordered_set>
#include <unordered_map>
#include <cstdio>
#include <set>
#include <map>

#define ENULL ((unsigned long long)-1)

typedef unsigned int ui;
typedef unsigned long ul;
typedef unsigned long long ull;

using namespace std;

long long currentTimeMilliS = 0;

long long currentTimeStamp()
{
    struct timeval te;
    gettimeofday(&te, NULL); // get current time
    long long milliseconds =
            te.tv_sec * 1000LL + te.tv_usec / 1000; // calculate milliseconds
    // long long milliseconds = 0;
    return milliseconds;
}

void reset()
{
    currentTimeMilliS = currentTimeStamp();
}

long long getTimeElapsed()
{
    long long newTime = currentTimeStamp();
    long long timeElapsed = newTime - currentTimeMilliS;
    // currentTimeMilliS = newTime;
    return timeElapsed;
}

struct edge {
    ui src;
    ui tgt;
};

struct graph {
    ui NODENUM;
    ull EDGENUM;
    ull* start_indices;
    ull* end_indices;
    edge* edgeList;
} g;

vector<ui> v2idx(1);
vector<vector<bool>> input;
vector<pair<ui, ui>> inputList;
// Ordered set
//set<pair<ui, ui>> inputSet;
map<pair<ui, ui>, ui> layerLcc2Idx;

vector<ui> layer2local;
vector<ui> local2layer(1);
// vector<vector<ui>> layerLcc2Idx;
//vector<vector<ui>> layerLcc2Idx;
vector<ui> idx2layer;
vector<ui> idx2lcc;
vector<vector<ui>> v2lcc;
vector<unordered_map<ui, ui>> v2lccMap;
ui numLayers;
ui numLayerLcc;
vector<ui> degree;
vector<ui> globalEdgesCnt;
vector<boost::dynamic_bitset<>> globalVertices;
vector<ui> globalVerticesCnt;

void createMemoryMap(const char* binFileName) {
    int binFile = open(binFileName, O_RDWR);
    long fileSizeInByte;
    struct stat sizeResults;
    assert(stat(binFileName, &sizeResults) == 0);
    fileSizeInByte = sizeResults.st_size;
    g.edgeList = (edge*) mmap(NULL, fileSizeInByte, PROT_READ | PROT_WRITE, MAP_SHARED, binFile, 0);
    close(binFile);
}

void initNodeMap(const string &ccFile) {
    ifstream is(ccFile, ios::in | ios::binary);
    ui label, cc;
    for (ui i = 1; i <= g.NODENUM; i++) {
        is.read((char *) (&label), sizeof(ui));
        is.read((char *) (&cc), sizeof(ui));
        while (v2idx.size() <= label) v2idx.resize(2*label);
        v2idx[label] = i;
    }
}

void readInput(const string &inputFile) {
    ifstream is(inputFile);
    string line;

    ui idx = 0;
    ui layerIdx = 1;
    ui layer, lcc;
    while (getline(is, line)) {
        replace(line.begin(), line.end(), '_', ' ');
        stringstream line_stream(line);
        line_stream >> layer >> lcc;
        inputList.push_back({layer, lcc});
    }
}

void prepareInput(ui &minLayerPos, const ui maxLayer, ui &lccIdx) {
    ui idx = 0;
    ui layerIdx = 1;
    ui layer, lcc;
    ui localLayer, localLcc;

    for (; minLayerPos < inputList.size(); ++ minLayerPos) {
        layer = inputList[minLayerPos].first;
        lcc = inputList[minLayerPos].second;
        if (layer > maxLayer) {
            // // end of current cc-layers file
            break;
        }
        if (layer2local.size() <= layer) layer2local.resize(layer*2);
        if (layer2local[layer] == 0) {
            layer2local[layer] = layerIdx;
            local2layer.push_back(layer);
            layerIdx++;
        }
        
        localLayer = layer2local[layer];

        /*if (layerLcc2Idx.size() <= localLayer) {
            //input.resize(localLayer*2);
            layerLcc2Idx.resize(localLayer*2);
        }
        if (layerLcc2Idx[localLayer].size() <= lcc) {
            layerLcc2Idx[localLayer].resize(lcc*2);
        }*/
        // input[localLayer][lcc] = true;
        layerLcc2Idx[{localLayer, lcc}] = idx;
        //inputSet.insert({localLayer, lcc});
        //layerLcc2Idx[localLayer][lcc] = idx;
        idx2layer.push_back(layer);
        idx2lcc.push_back(lcc);
        idx++; 
    }

    numLayerLcc = idx;
}

pair<ui, ui> readCcLayers(string layerFile) {
    ifstream is(layerFile);
    string line;

    ui minLayer = INT_MAX, maxLayer = 0;
    
    while (getline(is, line)) {
        replace(line.begin(), line.end(), ',', ' ');
        stringstream line_stream(line);
        ui v, cc, layer, lcc;
        line_stream >> v >> cc >> layer >> lcc;
        if (layer2local.size() <= layer || layer2local[layer] == 0) continue;
        layer = layer2local[layer];
        minLayer = min(minLayer, layer);
        maxLayer = max(maxLayer, layer);
        //if (input.size() <= layer || input[layer].size() <= lcc || !input[layer][lcc]) continue;
        if (layerLcc2Idx.find({layer, lcc}) == layerLcc2Idx.end()) continue;
        //v2lcc[v2idx[v]][layer] = lcc;
        if (v2lccMap.size() <= layer) v2lccMap.resize(layer*2);
        v2lccMap[layer][v2idx[v]] = lcc;
    }

    return {minLayer, maxLayer};
}

void findStartAndEndIndices() {
    g.start_indices = new ull[g.NODENUM + 1];
    g.end_indices = new ull[g.NODENUM + 1];
    std::fill_n(g.start_indices, g.NODENUM + 1, ENULL);
    std::fill_n(g.end_indices, g.NODENUM + 1, ENULL);
    ui old = g.edgeList[0].src;
    g.start_indices[old] = 0;
    for (ull i = 0; i < g.EDGENUM; i++) {
        if (g.edgeList[i].src != old) {
            g.end_indices[old] = i - 1;
            old = g.edgeList[i].src;
            g.start_indices[old] = i;
        }
        g.end_indices[old] = i - 1;
    }
}

void findDegree() {
    degree.resize(g.NODENUM+1);
    ui max = 0;
    for (ull i = 0; i < g.EDGENUM; i++) {
        degree[g.edgeList[i].src]++;
    }
}

void waveOutputFile(ofstream &out, ui wave) {
    for (int i = 0; i < numLayerLcc; i++) {
        if (globalVerticesCnt[i] == 0) continue;
        out << idx2layer[i] << "_" << idx2lcc[i] << "_" << wave << "_";
        out << globalVerticesCnt[i] << "_" << globalEdgesCnt[i] << endl;
    }
}

void updateCounts(const string &folder, pair<ui, ui> layerRange, ofstream &out) {
    globalEdgesCnt.resize(numLayerLcc);
    globalVertices.resize(numLayerLcc, boost::dynamic_bitset<>(g.NODENUM+1));
    globalVerticesCnt.resize(numLayerLcc);

    for (int layer = layerRange.first; layer <= layerRange.second; layer++) {
        const string wsFile = folder + "/layer-" + to_string(local2layer[layer]) + "-wave-sources.csv";
        ifstream is(wsFile);
        string line;
        ui currentWave = INT_MAX;
        ui passedVert = 0;
        ui processedVert = 0;

        while (getline(is, line)) {
            replace(line.begin(), line.end(), ',', ' ');
            stringstream line_stream(line);
            ui v, wave, frag;
            line_stream >> v >> wave >> frag;

            if (passedVert % 10000000 == 0) {
                cout << "..passed verts " << passedVert;
                cout << ", processed verts " << processedVert;
                cout << " after " << getTimeElapsed() / 1000 << " sec.\n";
            }

            ++ passedVert;

            if (layer >= v2lccMap.size()) continue;
            if (v2lccMap[layer].find(v2idx[v]) == v2lccMap[layer].end()) continue;
            ui lcc = v2lccMap[layer][v2idx[v]];
            //if (input[layer].size() <= lcc || !input[layer][lcc]) continue;
            if (layerLcc2Idx.find({layer, lcc}) == layerLcc2Idx.end()) continue;
            ui layerLccIdx = layerLcc2Idx[{layer, lcc}];

            ++processedVert;

            if (currentWave != INT_MAX && wave != currentWave) {
                waveOutputFile(out, currentWave);
                fill(globalEdgesCnt.begin(), globalEdgesCnt.end(), 0);
                fill(globalVerticesCnt.begin(), globalVerticesCnt.end(), 0);
                fill(globalVertices.begin(), globalVertices.end(), boost::dynamic_bitset<>(g.NODENUM+1));
            }
            
            currentWave = wave;

            globalEdgesCnt[layerLccIdx] += degree[v2idx[v]];
            
            if (g.start_indices[v2idx[v]] == ENULL) continue;
            for (ull i = g.start_indices[v2idx[v]]; i <= g.end_indices[v2idx[v]]; i++) {
                ui tgt = g.edgeList[i].tgt;
                if (globalVertices[layerLccIdx][tgt] == 0) {
                    globalVerticesCnt[layerLccIdx]++;
                    globalVertices[layerLccIdx][tgt] = 1;
                }
            }
        }
        
        waveOutputFile(out, currentWave);
    }
}


/*void makeOutputFile(ofstream &out, pair<ui, ui> layerRange) {
    for (int i = 0; i < numLayerLcc; i++) {
        if (layer2local[idx2layer[i]] < layerRange.first) continue;
        if (layer2local[idx2layer[i]] > layerRange.second) break;
        for (int wave = 0; wave < globalVerticesCnt[i].size(); wave++) {
            if (globalVerticesCnt[i][wave] != 0) {
                out << idx2layer[i] << "_" << idx2lcc[i] << "_" << wave << "_";
                out << globalVerticesCnt[i][wave] << "_" << globalEdgesCnt[i][wave] << endl;
            }
        }
    }
}*/

void writeMetaData(const string &prefix, vector<long long> &timeList) {
    ofstream out(prefix + "info.json");
    vector<string> methodNames = {
        "createMemoryMap",
        "initNodeMap",
        "fillInput",
        "findStartAndEndIndices",
        "findDegree",
        "readCcLayers",
        "updateCounts",
        "makeOutput"
    };

    out << "{\n";
    
    for (int i = 0; i < methodNames.size(); i++) {
        out << "\t\"" << methodNames[i] << "\": " << timeList[i];
        if (i != methodNames.size()-1) {
            out << ",";
        }
        out << "\n";
    }

    out << "}";
}

int main(int argc, char *argv[]) {
    string graphName = argv[1];
    string graphPath = argv[2];
    string graphLayerPath = argv[3];
    string graphWavePath = argv[4];
    string pathToLayerLccTxt = argv[5];
    g.NODENUM = stoi(argv[6]);
    g.EDGENUM = stol(argv[7]);

    vector<string> ccLayerFiles;
    for (int i = 8; i < argc; i++) ccLayerFiles.push_back(argv[i]);

    vector<long long> timeList(8);

    reset();

    createMemoryMap((graphPath + graphName + ".bin").c_str());
    timeList[0] = getTimeElapsed();
    cout << "CREATE MMAP\n";
    reset();

    initNodeMap(graphPath + graphName + ".cc");
    timeList[1] = getTimeElapsed();
    cout << "INIT NODEMAP\n";
    // getchar();
    reset();

    readInput(pathToLayerLccTxt);
    timeList[2] = getTimeElapsed();
    cout << "READ INPUT\n";
    // getchar();
    reset();

    findStartAndEndIndices();
    timeList[3] = getTimeElapsed();
    cout << "INIT IDX\n";
    // getchar();
    reset();

    findDegree();
    timeList[4] = getTimeElapsed();
    cout << "INIT DEG\n";
    // getchar();
    reset();


    ui minLayerPos = 0;
    ui lccIdx = 1;
    ui maxLayer;
    ofstream out(graphPath + "layer,lcc,w,gt,ge.txt");
    // ofstream out("layer,lcc,w,gt,ge.txt");

    for (const string &ccLayerFile : ccLayerFiles) {
        local2layer.clear();
        local2layer.resize(1);
        idx2layer.clear();
        idx2lcc.clear();
        layerLcc2Idx.clear();

        v2lccMap.clear();
        globalEdgesCnt.clear();
        globalVerticesCnt.clear();
        globalVertices.clear();

        const string layerRangeStr = ccLayerFile.substr(6, ccLayerFile.length() - 10 - 6);
        const auto splitPos = layerRangeStr.find_first_of("-");
        if (splitPos == string::npos) {
            maxLayer = stoi(layerRangeStr);
        } else {
            maxLayer = stoi(layerRangeStr.substr(splitPos + 1));
        }
        // cout << maxLayer << "\n";
        prepareInput(minLayerPos, maxLayer, lccIdx);
        timeList[2] += getTimeElapsed();
        cout << "PREPARE INPUT\n";
        // getchar();
        reset();

        if(numLayerLcc == 0) {
            continue;
        }

        pair<ui, ui> range = readCcLayers(graphLayerPath + ccLayerFile);
        timeList[5] += getTimeElapsed();
        cout << "READ CC LAYER FILE " << graphLayerPath + ccLayerFile << endl;
        reset();

        updateCounts(graphWavePath, range, out);
        timeList[6] += getTimeElapsed();
        cout << "UPDATED COUNTS FOR (" << local2layer[range.first] << ", " << local2layer[range.second] << ")\n";
        reset();

        /*makeOutputFile(out, range);
        timeList[7] += getTimeElapsed();
        cout << "UPDATED OUTPUT FOR (" << local2layer[range.first] << ", " << local2layer[range.second] << ")\n";
        reset();*/
    }

    writeMetaData(graphPath + "globalNeigbhor-", timeList);
}