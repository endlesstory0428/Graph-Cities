#include <algorithm>
#include <assert.h>
#include <boost/dynamic_bitset.hpp>
#include <boost/pending/disjoint_sets.hpp>
// #include <boost/container_hash/hash.hpp>
#include <boost/functional/hash.hpp>
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
typedef std::pair<vSize_t, vSize_t> edge_t;
typedef std::pair<edge_t, weight_t> w_edge_t;
typedef std::vector<w_edge_t> w_edgeList_t;
// typedef std::vector<edge_t> edgeList_t;
// typedef std::pair<vSize_t, weight_t> tgt_t;
// typedef std::vector<std::vector<tgt_t>> adjList_t;
// typedef std::pair<vSize_t, vSize_t> deg_t; // iDeg, oDeg
// typedef std::vector<deg_t> degList_t;

typedef std::vector<vSize_t> parent_t;
typedef std::vector<vSize_t> rank_t;
typedef boost::disjoint_sets<vSize_t *, vSize_t *> ds_t;

// typedef std::unordered_map<vSize_t, weight_t> tgt_map_t;
// typedef std::vector<tgt_map_t> adjList_map_t;
typedef std::unordered_map<edge_t, weight_t, boost::hash<edge_t>> adjList_map_t;

class nodeInfo
{
public:
    nodeInfo(void);
    void updateSize(vSize_t v, eSize_t e, vSize_t lv, eSize_t le);
    void updateSize(nodeInfo nodeA, nodeInfo nodeB, weight_t weight);
    void setInfo(vSize_t w, vSize_t f, vSize_t s, vSize_t v, eSize_t e, vSize_t lv, eSize_t le);
    vSize_t wave;
    vSize_t frag;
    vSize_t set;
    vSize_t vSize;
    eSize_t eSize;
    vSize_t localVSize;
    eSize_t localESize;
};

nodeInfo::nodeInfo(void)
{
    wave = 0;
    frag = 0;
    set = 0;
    vSize = 0;
    eSize = 0;
    localVSize = 0;
    localESize = 0;
}

void nodeInfo::setInfo(vSize_t w, vSize_t f, vSize_t s, vSize_t v, eSize_t e, vSize_t lv, eSize_t le)
{
    wave = w;
    frag = f;
    set = s;
    vSize = v;
    eSize = e;
    localVSize = lv;
    localESize = le;
}

void nodeInfo::updateSize(vSize_t v, eSize_t e, vSize_t lv, eSize_t le)
{
    vSize += v;
    eSize += e;
    localVSize += lv;
    localESize += le;
}

void nodeInfo::updateSize(nodeInfo nodeA, nodeInfo nodeB, weight_t weight)
{
    vSize = nodeA.vSize + nodeB.vSize;
    eSize = nodeA.eSize + nodeB.eSize + weight;
    localVSize = nodeA.localVSize + nodeB.localVSize;
    localESize = nodeA.localESize + nodeB.localESize + 1;
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

void readNode(const std::string &fileName,
              std::vector<vSize_t> &label2idx, std::vector<labelSize_t> &idx2label,
              std::vector<nodeInfo> &nodeInfoList, ds_t &ds)
{
    std::ifstream is;
    std::string line;

    labelSize_t v;
    // vSize_t vIdx, vRootIdx;
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
        label2idx[v] = vNum;
        idx2label[vNum] = v;
        nodeInfoList[vNum].setInfo(wave, frag, set, vSize, eSize, 1, 0);
        ds.make_set(vNum);
        ++vNum;
    }
    is.close();
}

eSize_t readLink(const std::string &fileName, const std::vector<vSize_t> &label2idx,
                 std::vector<nodeInfo> &nodeInfoList, ds_t &ds, w_edgeList_t &edgeList)
{
    std::ifstream is;
    std::string line;

    labelSize_t src, tgt;
    vSize_t srcIdx, tgtIdx;
    vSize_t srcRoot, tgtRoot;
    vSize_t newRoot;
    eSize_t weight;

    eSize_t eNum = 1;

    is.open(fileName);
    while (std::getline(is, line))
    {
        // std::cout << line << "\n";
        std::replace(line.begin(), line.end(), ',', ' ');
        std::istringstream iss(line);
        assert(iss >> src >> tgt >> weight);
        srcIdx = label2idx[src];
        tgtIdx = label2idx[tgt];
        if (nodeInfoList[srcIdx].wave == nodeInfoList[tgtIdx].wave)
        {
            srcRoot = ds.find_set(srcIdx);
            tgtRoot = ds.find_set(tgtIdx);
            if (srcRoot != tgtRoot)
            {
                ds.link(srcRoot, tgtRoot);
                newRoot = ds.find_set(srcRoot);
                nodeInfoList[newRoot].updateSize(nodeInfoList[srcRoot], nodeInfoList[tgtRoot], weight);
            }
            else
            {
                nodeInfoList[srcRoot].updateSize(0, weight, 0, 1);
            }
        }
        else
        {
            edgeList[eNum] = {{srcIdx, tgtIdx}, weight};
            ++eNum;
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
        if (nodeInfoList[srcIdx].wave == nodeInfoList[tgtIdx].wave)
        {
            srcRoot = ds.find_set(srcIdx);
            tgtRoot = ds.find_set(tgtIdx);
            if (srcRoot != tgtRoot)
            {
                ds.link(srcRoot, tgtRoot);
                newRoot = ds.find_set(srcRoot);
                nodeInfoList[newRoot].updateSize(nodeInfoList[srcRoot], nodeInfoList[tgtRoot], weight);
            }
            else
            {
                nodeInfoList[srcRoot].updateSize(0, weight, 0, 1);
            }
        }
        else
        {
            edgeList[eNum] = {{srcIdx, tgtIdx}, weight};
            ++eNum;
        }
    }
    is.close();

    return eNum;
}

void updateLink(ds_t &ds, const w_edgeList_t &edgeList, const eSize_t &eNum, adjList_map_t &finalLinks)
{
    vSize_t srcIdx, tgtIdx;
    vSize_t srcRoot, tgtRoot;
    w_edge_t link;
    for (eSize_t eIdx = 1; eIdx < eNum; ++eIdx)
    {
        link = edgeList[eIdx];
        srcIdx = link.first.first;
        tgtIdx = link.first.second;
        srcRoot = ds.find_set(srcIdx);
        tgtRoot = ds.find_set(tgtIdx);
        assert(srcRoot != tgtRoot);
        finalLinks[{srcRoot, tgtRoot}] += link.second;
    }
}

void writeCompression(const std::string &fileNamePrefix, const std::vector<labelSize_t> &idx2label,
                      ds_t &finalDs, const adjList_map_t &finalLinks, const std::vector<nodeInfo> &nodeInfoList,
                      vSize_t &finalNodeNum, eSize_t &finalLinkNum)
{
    std::ofstream os;
    os.open(fileNamePrefix + ".vmap");
    for (vSize_t i = 1; i < idx2label.size(); ++i)
    {
        os << idx2label[finalDs.find_set(i)] << "," << idx2label[i] << "\n";
    }
    os.close();

    os.open(fileNamePrefix + ".node");
    for (vSize_t i = 1; i < idx2label.size(); ++i)
    {
        if (finalDs.find_set(i) != i)
        {
            continue;
        }
        os << idx2label[i] << ","
           << nodeInfoList[i].set << ","
           << nodeInfoList[i].vSize << ","
           << nodeInfoList[i].eSize << ","
           << nodeInfoList[i].localVSize << ","
           << nodeInfoList[i].localESize << ","
           << nodeInfoList[i].wave << "\n";
        ++finalNodeNum;
    }
    os.close();

    os.open(fileNamePrefix + ".link");
    for (auto &kv : finalLinks)
    {
        os << idx2label[kv.first.first] << "," << idx2label[kv.first.second] << "," << kv.second << "\n";
        ++finalLinkNum;
    }
    os.close();
}

void writeMetaData(std::string prefix, std::vector<long long> &timeList,
                   const vSize_t &nodeNum, const eSize_t &linkNum,
                   const vSize_t &finalNodeNum, const eSize_t &finalLinkNum)
{
    std::ofstream outputFile;
    outputFile.open(prefix + "-info.json");
    outputFile << "{\n";
    outputFile << "\"input-nodes\":" << nodeNum << ",\n";
    outputFile << "\"input-links\":" << linkNum << ",\n";
    outputFile << "\"output-nodes\":" << finalNodeNum << ",\n";
    outputFile << "\"output-links\":" << finalLinkNum << ",\n";
    outputFile << "\"read-nodes-time\":" << timeList[0] << ",\n";
    outputFile << "\"read-links-time\":" << timeList[1] << ",\n";
    outputFile << "\"update-wcc-time\":" << timeList[2] << ",\n";
    outputFile << "\"write-time\":" << timeList[3] << "\n}";
    outputFile.close();
}

int main(int argc, char *argv[])
{
    if (argc < 8)
    {
        std::cerr
            << argv[0]
            << ": usage: ./waveCC "
            << "<graph name> <path to graph folder> <path to graph_dag folder> <dag name prefix>"
            << "<max label> <number of nodes> <number of links> <threshold>";
        exit(1);
    }

    std::string graphName = argv[1];
    std::string graphPath = argv[2];
    std::string dagPath = argv[3];
    std::string dagNamePrefix = argv[4];

    labelSize_t maxLabel = atol(argv[5]);
    vSize_t nodeNum = atol(argv[6]);
    eSize_t linkNum = atol(argv[7]);

    std::cout << dagPath << dagNamePrefix << "\n";
    std::cout << maxLabel << "," << nodeNum << "," << linkNum << "\n";

    std::vector<long long> timeList;
    reset();

    std::vector<labelSize_t> idx2label(nodeNum + 1);
    std::vector<vSize_t> label2idx(maxLabel + 1);
    rank_t rank(nodeNum + 1);
    parent_t parent(nodeNum + 1);
    ds_t finalDs(&rank[0], &parent[0]);
    std::vector<nodeInfo> nodeInfoList(nodeNum + 1);
    readNode(dagPath + dagNamePrefix + ".node", label2idx, idx2label, nodeInfoList, finalDs);
    std::cout << "READ NODE\n";
    timeList.push_back(getTimeElapsed());
    reset();

    w_edgeList_t edgeList(linkNum + 1);
    eSize_t waveLinkNum = readLink(dagPath + dagNamePrefix + ".link", label2idx, nodeInfoList, finalDs, edgeList);
    std::cout << "READ LINK" << waveLinkNum << "\n";
    timeList.push_back(getTimeElapsed());
    reset();

    adjList_map_t finalLinks;
    updateLink(finalDs, edgeList, waveLinkNum, finalLinks);
    std::cout << "UPDATE LINK\n";
    timeList.push_back(getTimeElapsed());
    reset();

    vSize_t finalNodeNum = 0;
    eSize_t finalLinkNum = 0;
    writeCompression(dagPath + dagNamePrefix + ".wcc", idx2label, finalDs, finalLinks, nodeInfoList, finalNodeNum, finalLinkNum);
    std::cout << "WRITE DAG\n";
    timeList.push_back(getTimeElapsed());
    reset();

    writeMetaData(dagPath + dagNamePrefix + ".wcc", timeList, nodeNum, linkNum, finalNodeNum, finalLinkNum);

    return 0;
}