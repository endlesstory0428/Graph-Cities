#include <algorithm>
#include <assert.h>
#include <boost/dynamic_bitset.hpp>
#include <boost/pending/disjoint_sets.hpp>
// #include <boost/container_hash/hash.hpp>
// #include <boost/functional/hash.hpp>
// #include <boost/graph/adjacency_list.hpp>
// #include <boost/graph/connected_components.hpp>
#include <cstring>
#include <errno.h>
#include <fcntl.h>
#include <fstream>
#include <iostream>
#include <limits.h>
#include <netinet/in.h>
#include <stdio.h>
#include <stdlib.h>
#include <string>
#include <sstream>
#include <sys/mman.h>
#include <sys/stat.h>
#include <sys/time.h>
#include <unistd.h>
#include <utility>
#include <vector>
#include <unordered_map>

#define DEBUG 1
#define FAST 0
#define LNULL ((uint32_t)-1)

typedef uint32_t vSize_t;
typedef uint32_t eSize_t;
typedef uint32_t labelSize_t;

typedef uint32_t weight_t;
// typedef std::pair<vSize_t, vSize_t> edge_t;
// typedef std::vector<edge_t> edgeList_t;
// typedef std::pair<vSize_t, weight_t> tgt_t;
// typedef std::vector<std::vector<tgt_t>> adjList_t;
typedef std::pair<vSize_t, vSize_t> deg_t; // iDeg, oDeg
// typedef std::vector<deg_t> degList_t;

// typedef std::vector<vSize_t> parent_t;
// typedef std::vector<vSize_t> rank_t;
// typedef boost::disjoint_sets<vSize_t *, vSize_t *> ds_t;

typedef std::pair<vSize_t, vSize_t> wf_t;

// typedef std::unordered_map<vSize_t, std::pair<weight_t, vSize_t>> tgt_map_t;
// typedef std::vector<tgt_map_t> adjList_map_t;

typedef std::unordered_map<vSize_t, weight_t> tgt_t;
typedef std::vector<tgt_t> adjList_t;

class nodeInfo
{
public:
    nodeInfo(void);
    void update(vSize_t v, eSize_t e, vSize_t lv, eSize_t le);
    // vSize_t wave;
    // vSize_t frag;
    // vSize_t set;
    vSize_t vSize;
    eSize_t eSize;
    vSize_t localVSize;
    eSize_t localESize;
};

nodeInfo::nodeInfo(void)
{
    // wave = 0;
    // frag = 0;
    // set = 0;
    vSize = 0;
    eSize = 0;
    localVSize = 0;
    localESize = 0;
}

void nodeInfo::update(vSize_t v, eSize_t e, vSize_t lv, eSize_t le)
{
    // if (s > set)
    // {
    //     wave = w;
    //     frag = f;
    //     set = s;
    // }
    vSize += v;
    eSize += e;
    localVSize += lv;
    localESize += le;
}

long long currentTimeMilliS = 0;

long long currentTimeStamp()
{
    struct timeval te;
    gettimeofday(&te, NULL); // get current time
    long long milliseconds =
        te.tv_sec * 1000LL + te.tv_usec / 1000; // calculate milliseconds
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

void readNode(const std::string &fileName, std::vector<vSize_t> &label2idx,
              std::vector<nodeInfo> &fragNodeInfoList, std::vector<nodeInfo> &waveNodeInfoList,
              std::vector<wf_t> &set2wf, std::vector<vSize_t> &idx2set)
{
    std::ifstream is;
    std::string line;

    labelSize_t v;
    vSize_t vIdx;
    vSize_t wave, frag, set;
    vSize_t vSize;
    eSize_t eSize;
    eSize_t outESize;

    vSize_t vNum = 1;

    is.open(fileName);
    while (std::getline(is, line))
    {
        // std::cout << line << "\n";
        std::replace(line.begin(), line.end(), ',', ' ');
        std::istringstream iss(line);
        assert(iss >> v >> wave >> frag >> set >> vSize >> eSize >> outESize);
        if (label2idx[v] == 0)
        {
            label2idx[v] = vNum;
            ++vNum;
        }
        vIdx = label2idx[v];
        fragNodeInfoList[set].update(vSize, eSize, 1, 0);
        waveNodeInfoList[wave].update(vSize, eSize, 1, 0);
        set2wf[set] = {wave, frag};
        idx2set[vIdx] = set;
    }
    is.close();
}

void readLink(const std::string &fileName, const std::vector<vSize_t> &label2idx,
                 const std::vector<wf_t> &set2wf, const std::vector<vSize_t> &idx2set,
                 std::vector<nodeInfo> &fragNodeInfoList, std::vector<nodeInfo> &waveNodeInfoList,
                 adjList_t &fragLink, adjList_t &waveLink)
{
    std::ifstream is;
    std::string line;

    labelSize_t src, tgt;
    vSize_t srcIdx, tgtIdx;
    vSize_t srcSet, tgtSet;
    vSize_t srcWave, tgtWave;
    eSize_t weight;

    is.open(fileName);
    while (std::getline(is, line))
    {
        // std::cout << line << "\n";
        std::replace(line.begin(), line.end(), ',', ' ');
        std::istringstream iss(line);
        assert(iss >> src >> tgt >> weight);
        
        srcIdx = label2idx[src];
        tgtIdx = label2idx[tgt];
        srcSet = idx2set[srcIdx];
        tgtSet = idx2set[tgtIdx];
        srcWave = set2wf[srcSet].first;
        tgtWave = set2wf[tgtSet].first;

        if (srcWave == tgtWave) {
            waveNodeInfoList[srcWave].update(0, weight, 0, 1);
            assert(srcSet != tgtSet);
            // ++ fragLink[srcSet][tgtSet];
            fragLink[srcSet][tgtSet] += weight;
        } else {
            // ++ waveLink[srcWave][tgtWave];
            waveLink[srcWave][tgtWave] += weight;
        }
    }
    is.close();

    is.open(fileName + ".jump");
    while (std::getline(is, line))
    {
        // std::cout << line << "\n";
        std::replace(line.begin(), line.end(), ',', ' ');
        std::istringstream iss(line);
        assert(iss >> src >> tgt >> weight);
        
        srcIdx = label2idx[src];
        tgtIdx = label2idx[tgt];
        srcSet = idx2set[srcIdx];
        tgtSet = idx2set[tgtIdx];
        srcWave = set2wf[srcSet].first;
        tgtWave = set2wf[tgtSet].first;

        if (srcWave == tgtWave) {
            waveNodeInfoList[srcWave].update(0, weight, 0, 1);
            assert(srcSet != tgtSet);
            // ++ fragLink[srcSet][tgtSet];
            fragLink[srcSet][tgtSet] += weight;
        } else {
            // ++ waveLink[srcWave][tgtWave];
            waveLink[srcWave][tgtWave] += weight;
        }
    }
    is.close();
}

void writeCompression(const std::string &fileNamePrefix, const std::vector<wf_t> &set2wf,
                         const std::vector<nodeInfo> &fragNodeInfoList, const std::vector<nodeInfo> &waveNodeInfoList,
                         const adjList_t &fragLink, const adjList_t &waveLink,
                         std::vector<vSize_t> &fragLinkNum, vSize_t &waveLinkNum)
{
    std::ofstream os;
    os.open(fileNamePrefix + ".wave.node");
    for (vSize_t i = 1; i < waveNodeInfoList.size(); ++ i)
    {
        os << i << ","
           << waveNodeInfoList[i].vSize << ","
           << waveNodeInfoList[i].eSize << ","
           << waveNodeInfoList[i].localVSize << ","
           << waveNodeInfoList[i].localESize << "\n";
    }
    os.close();

    os.open(fileNamePrefix + ".frag.node");
    for (vSize_t i = 1; i < fragNodeInfoList.size(); ++ i)
    {
        os << i << ","
           << fragNodeInfoList[i].vSize << ","
           << fragNodeInfoList[i].eSize << ","
           << fragNodeInfoList[i].localVSize << ","
           << fragNodeInfoList[i].localESize << "\n";
    }
    os.close();


    // vSize_t waveLinkNum = 0;
    // std::vector<vSize_t> fragLinkNum(waveLink.size());

    os.open(fileNamePrefix + ".wave.link");
    for (vSize_t i = 1; i < waveLink.size(); ++ i)
    {
        for (const auto &kv : waveLink[i])
        {
            os << i << "," << kv.first << "," << kv.second << "\n";
            ++ waveLinkNum;
        }
    }
    os.close();

    os.open(fileNamePrefix + ".frag.link");
    for (vSize_t i = 1; i < fragLink.size(); ++ i)
    {
        for (const auto &kv : fragLink[i])
        {
            os << i << "," << kv.first << "," << kv.second << "\n";
            ++ fragLinkNum[set2wf[i].first];
        }
    }
    os.close();
}

// maxLabel, nodeNum, fragNum, waveNum, fragLinkNum, waveLinkNum
void writeMetaData(std::string prefix, std::vector<long long> &timeList,
                   const vSize_t &fragNum, const vSize_t &waveNum,
                   const std::vector<vSize_t> &fragLinkNum, const vSize_t &waveLinkNum)
{
    std::ofstream outputFile;
    outputFile.open(prefix + "-info.json");
    outputFile << "{\n";
    outputFile << "\"waveNum\":" << waveNum << ",\n";
    outputFile << "\"fragNum\":" << fragNum << ",\n";
    outputFile << "\"waveLinkNum\":" << waveLinkNum << ",\n";
    outputFile << "\"fragLinkNum\":[";
    bool firstFlag = true;
    for (vSize_t wave = 1; wave < fragLinkNum.size(); ++ wave) {
        if (firstFlag) {
            firstFlag = false;
        } else {
            outputFile << ",";
        }
        outputFile << fragLinkNum[wave];
    }
    outputFile << "],\n";

    outputFile << "\"read-nodes-time\":" << timeList[0] << ",\n";
    outputFile << "\"read-links-time\":" << timeList[1] << ",\n";
    outputFile << "\"write-time\":" << timeList[2] << "\n}";
    outputFile.close();
}

int main(int argc, char *argv[])
{
    if (argc < 9)
    {
        std::cerr
            << argv[0]
            << ": usage: ./waveFragLevel "
            << "<graph name> <path to graph folder> <path to graph_waves folder> <dag name prefix>"
            << "<max label> <number of nodes> <max set (sum of #frag)> <#wave>";
        exit(1);
    }

    std::string graphName = argv[1];
    std::string graphPath = argv[2];
    std::string dagPath = argv[3];
    std::string dagNamePrefix = argv[4];

    labelSize_t maxLabel = atol(argv[5]);
    vSize_t nodeNum = atol(argv[6]);
    vSize_t fragNum = atol(argv[7]);
    vSize_t waveNum = atol(argv[8]);

    std::cout << dagPath << dagNamePrefix << "\n";
    std::cout << maxLabel << "," << nodeNum << "," << fragNum << "," << waveNum << "\n";

    std::vector<long long> timeList;
    reset();

    std::vector<vSize_t> label2idx(maxLabel + 1);
    std::vector<nodeInfo> fragNodeInfoList(fragNum + 1);
    std::vector<nodeInfo> waveNodeInfoList(waveNum + 1);
    std::vector<wf_t> set2wf(fragNum + 1);
    std::vector<vSize_t> idx2set(nodeNum + 1);
    readNode(dagPath + dagNamePrefix + ".node", label2idx, fragNodeInfoList, waveNodeInfoList, set2wf, idx2set);
    timeList.push_back(getTimeElapsed());
    std::cout << "READ NODE\n";
    reset();

    adjList_t fragLink(fragNum + 1);
    adjList_t waveLink(waveNum + 1);
    readLink(dagPath + dagNamePrefix + ".link", label2idx, set2wf, idx2set, fragNodeInfoList, waveNodeInfoList, fragLink, waveLink);
    timeList.push_back(getTimeElapsed());
    std::cout << "READ LINK\n";
    reset();

    std::vector<vSize_t> fragLinkNum(waveNum + 1);
    vSize_t waveLinkNum = 0;
    writeCompression(dagPath + dagNamePrefix + ".wf", set2wf, fragNodeInfoList, waveNodeInfoList, fragLink, waveLink, fragLinkNum, waveLinkNum);
    timeList.push_back(getTimeElapsed());
    std::cout << "WRITE DAG\n";
    reset();

    writeMetaData(dagPath + dagNamePrefix + ".wf", timeList, fragNum, waveNum, fragLinkNum, waveLinkNum);

    return 0;
}