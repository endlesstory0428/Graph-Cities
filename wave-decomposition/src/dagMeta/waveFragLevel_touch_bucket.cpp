#include <algorithm>
#include <assert.h>
#include <boost/dynamic_bitset.hpp>
#include <boost/pending/disjoint_sets.hpp>
// #include <boost/container_hash/hash.hpp>
// #include <boost/functional/hash.hpp>
// #include <boost/graph/adjacency_list.hpp>
// #include <boost/graph/connected_components.hpp>
#include <cmath>
#include <cstring>
#include <errno.h>
#include <fcntl.h>
#include <fstream>
#include <iostream>
#include <limits.h>
#include <netinet/in.h>
#include <numeric>
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

typedef double_t buckTH_t;
typedef int32_t signed_vSize_t;

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

class nodeInfoBuck
{
public:
    nodeInfoBuck(void);
    void update(vSize_t v, eSize_t e, eSize_t oe);
    // vSize_t wave;
    // vSize_t frag;
    // vSize_t set;
    vSize_t vSize;
    eSize_t eSize;
    eSize_t outESize;
};

nodeInfoBuck::nodeInfoBuck(void)
{
    // wave = 0;
    // frag = 0;
    // set = 0;
    vSize = 0;
    eSize = 0;
    outESize = 0;
}

void nodeInfoBuck::update(vSize_t v, eSize_t e, eSize_t oe)
{
    vSize += v;
    eSize += e;
    outESize += oe;
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

void readNode(const std::string &fileName, std::vector<labelSize_t> &idx2label, std::vector<vSize_t> &label2idx,
              std::vector<wf_t> &set2wf, std::vector<vSize_t> &idx2set,
              std::vector<vSize_t> &separaterList, std::vector<nodeInfoBuck> &nodeInfoList,
              std::vector<eSize_t> &waveSize)
{
    std::ifstream is;
    std::string line;

    labelSize_t v;
    vSize_t vIdx = 0;
    vSize_t wave, frag, set;
    vSize_t vSize;
    eSize_t eSize;
    eSize_t outESize;

    vSize_t vNum = 1;

    vSize_t prevSet = LNULL;

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
            idx2label[vNum] = v;
            ++vNum;
        }
        vIdx = label2idx[v];
        // fragNodeInfoList[set].update(vSize, eSize, 1, 0);
        // waveNodeInfoList[wave].update(vSize, eSize, 1, 0);
        nodeInfoList[vIdx].update(vSize, eSize, outESize);
        set2wf[set] = {wave, frag};
        idx2set[vIdx] = set;

        waveSize[wave] += eSize + outESize;

        if (set != prevSet)
        { // record the begining nodeIdx of each set
            prevSet = set;
            separaterList[set] = vIdx;
        }
    }
    separaterList[prevSet + 1] = vNum;
    is.close();
}

eSize_t addNodeESize(const eSize_t &temp, const nodeInfoBuck &node)
{
    return temp + node.eSize;
}

buckTH_t addNodeESizeSquare(const buckTH_t &temp, const nodeInfoBuck &node)
{
    return temp + (double)node.eSize * (double)node.eSize;
}

eSize_t addNodeVSize(const vSize_t &temp, const nodeInfoBuck &node)
{
    return temp + node.vSize;
}

eSize_t addNodeOutESize(const eSize_t &temp, const nodeInfoBuck &node)
{
    return temp + node.outESize;
}

bool compareNodeESize(const nodeInfoBuck &a, const nodeInfoBuck &b)
{
    return a.eSize < b.eSize;
}

bool compareNodeTotalESize(const nodeInfoBuck &a, const nodeInfoBuck &b)
{
    return (a.eSize + a.outESize) < (b.eSize + b.outESize);
}

vSize_t bucketNodeInSetUsingLog(const std::vector<nodeInfoBuck> &nodeInfoList, const vSize_t beginIdx, const vSize_t endIdx, const vSize_t setIdx,
                                std::vector<nodeInfoBuck> &buckNodeInfoList, vSize_t &buckNodeIdxBase, std::vector<vSize_t> &buckNodeCCNum, std::vector<vSize_t> &buck2set,
                                std::vector<vSize_t> &node2buck,
                                const eSize_t totalESize)
{

    vSize_t maxBuck = 0; // store the max buckIdx in this set, so next set should start at (buckNodeIdxBase + maxbuckIdx + 1)
    vSize_t buckNodeIdx, localBuckIdx;
    nodeInfoBuck node;
    if (totalESize >= 4)
    { // THBase is at least 2
        buckTH_t buckTHBase = std::log2(totalESize);
        for (vSize_t nodeIdx = beginIdx; nodeIdx < endIdx; ++nodeIdx)
        {
            // map node into localBuckIdx, then offset localBuckIdx from buckNodeIdxBase
            node = nodeInfoList[nodeIdx];
            localBuckIdx = std::floor(std::log2(1 + node.eSize + node.outESize) / std::log2(1 + buckTHBase));
            maxBuck = std::max(maxBuck, localBuckIdx);
            buckNodeIdx = buckNodeIdxBase + localBuckIdx;

            // update bucket info
            buckNodeInfoList[buckNodeIdx].update(node.vSize, node.eSize, node.outESize);
            ++buckNodeCCNum[buckNodeIdx];
            node2buck[nodeIdx] = buckNodeIdx;
        }
        // update for next set
        std::fill(buck2set.begin() + buckNodeIdxBase, buck2set.begin() + buckNodeIdxBase + maxBuck + 1, setIdx);
        buckNodeIdxBase += maxBuck + 1;
    }
    // else
    // { // small, so put everything into one bucket at buckNodeIdxBase
    //     eSize_t sumESize = std::accumulate(nodeInfoList.begin() + beginIdx, nodeInfoList.begin() + endIdx, 0, addNodeESize);
    //     eSize_t sumOutESize = std::accumulate(nodeInfoList.begin() + beginIdx, nodeInfoList.begin() + endIdx, 0, addNodeOutESize);
    //     vSize_t sumVSize = std::accumulate(nodeInfoList.begin() + beginIdx, nodeInfoList.begin() + endIdx, 0, addNodeVSize);
    //     buckNodeIdx = buckNodeIdxBase;

    //     // update bucket info
    //     buckNodeInfoList[buckNodeIdx].update(sumVSize, sumESize, sumOutESize);
    //     buckNodeCCNum[buckNodeIdx] += endIdx - beginIdx;
    //     std::fill(node2buck.begin() + beginIdx, node2buck.begin() + endIdx, buckNodeIdx);

    //     // update for next set
    //     buck2set[buckNodeIdxBase] = setIdx;
    //     ++buckNodeIdxBase;
    //     maxBuck = 1;
    // }
    else
    { // small, bucket by eSize+outESize one by one
        const auto min_max = std::minmax_element(nodeInfoList.begin() + beginIdx, nodeInfoList.begin() + endIdx, compareNodeTotalESize);
        eSize_t minVal = min_max.first->eSize;
        eSize_t maxVal = min_max.second->eSize;

        maxBuck = maxVal - minVal;
        for (vSize_t nodeIdx = beginIdx; nodeIdx < endIdx; ++nodeIdx)
        {
            // map node into localBuckIdx, then offset localBuckIdx from buckNodeIdxBase
            node = nodeInfoList[nodeIdx];
            localBuckIdx = node.eSize - minVal;
            buckNodeIdx = buckNodeIdxBase + localBuckIdx;

            // update bucket info
            buckNodeInfoList[buckNodeIdx].update(node.vSize, node.eSize, node.outESize);
            ++buckNodeCCNum[buckNodeIdx];
            node2buck[nodeIdx] = buckNodeIdx;
        }
        // update for next set
        std::fill(buck2set.begin() + buckNodeIdxBase, buck2set.begin() + buckNodeIdxBase + maxBuck + 1, setIdx);
        buckNodeIdxBase += maxBuck + 1;
    }
    return maxBuck;
}

vSize_t bucketNodeInSetUsingStd(const std::vector<nodeInfoBuck> &nodeInfoList, const vSize_t beginIdx, const vSize_t endIdx, const vSize_t setIdx,
                                std::vector<nodeInfoBuck> &buckNodeInfoList, vSize_t &buckNodeIdxBase, std::vector<vSize_t> &buckNodeCCNum, std::vector<vSize_t> &buck2set,
                                std::vector<vSize_t> &node2buck)
{
    eSize_t sumESize = std::accumulate(nodeInfoList.begin() + beginIdx, nodeInfoList.begin() + endIdx, 0, addNodeESize);
    buckTH_t aveVal = (double)sumESize / (endIdx - beginIdx);
    buckTH_t sumESizeSquare = std::accumulate(nodeInfoList.begin() + beginIdx, nodeInfoList.begin() + endIdx, 0.0, addNodeESizeSquare);
    buckTH_t stdVal = std::sqrt(sumESizeSquare / (endIdx - beginIdx) - aveVal * aveVal);

    const auto min_max = std::minmax_element(nodeInfoList.begin() + beginIdx, nodeInfoList.begin() + endIdx, compareNodeESize);
    eSize_t minVal = min_max.first->eSize;
    eSize_t maxVal = min_max.second->eSize;
    // std::cout << aveVal << "," << stdVal << "," << minVal << "," << maxVal << "\n";

    vSize_t maxBuck = 0; // store the max buckIdx in this set, so next set should start at (buckNodeIdxBase + maxbuckIdx + 1)
    vSize_t buckNodeIdx, localBuckIdx;
    nodeInfoBuck node;
    if (stdVal >= 1)
    {
        signed_vSize_t minBuckIdx = std::floor((minVal - aveVal) / stdVal);
        signed_vSize_t maxBuckIdx = std::floor((maxVal - aveVal) / stdVal);
        maxBuck = maxBuckIdx - minBuckIdx;
        for (vSize_t nodeIdx = beginIdx; nodeIdx < endIdx; ++nodeIdx)
        {
            // map node into localBuckIdx, then offset localBuckIdx from buckNodeIdxBase
            node = nodeInfoList[nodeIdx];
            localBuckIdx = std::floor((node.eSize - aveVal) / stdVal) - minBuckIdx;
            buckNodeIdx = buckNodeIdxBase + localBuckIdx;

            // update bucket info
            buckNodeInfoList[buckNodeIdx].update(node.vSize, node.eSize, node.outESize);
            ++buckNodeCCNum[buckNodeIdx];
            node2buck[nodeIdx] = buckNodeIdx;
        }
        // update for next set
        std::fill(buck2set.begin() + buckNodeIdxBase, buck2set.begin() + buckNodeIdxBase + maxBuck + 1, setIdx);
        buckNodeIdxBase += maxBuck + 1;
    }
    else
    { // small, bucket by eSize one by one
        maxBuck = maxVal - minVal;
        for (vSize_t nodeIdx = beginIdx; nodeIdx < endIdx; ++nodeIdx)
        {
            // map node into localBuckIdx, then offset localBuckIdx from buckNodeIdxBase
            node = nodeInfoList[nodeIdx];
            localBuckIdx = node.eSize - minVal;
            buckNodeIdx = buckNodeIdxBase + localBuckIdx;

            // update bucket info
            buckNodeInfoList[buckNodeIdx].update(node.vSize, node.eSize, node.outESize);
            ++buckNodeCCNum[buckNodeIdx];
            node2buck[nodeIdx] = buckNodeIdx;
        }
        // update for next set
        std::fill(buck2set.begin() + buckNodeIdxBase, buck2set.begin() + buckNodeIdxBase + maxBuck + 1, setIdx);
        buckNodeIdxBase += maxBuck + 1;
    }
    return maxBuck;
}

vSize_t bucketNode(const std::vector<nodeInfoBuck> &nodeInfoList, const std::vector<vSize_t> &separaterList,
                   std::vector<nodeInfoBuck> &buckNodeInfoList, std::vector<vSize_t> &buckNodeCCNum, std::vector<vSize_t> &buck2set,
                   std::vector<vSize_t> &node2buck,
                   vSize_t &maxSetBuck,
                   const std::vector<wf_t> &set2wf, const std::vector<eSize_t> &waveSize)
{
    vSize_t buckNodeIdx = 1;
    vSize_t prevSeparater = 1; // previous set begining
    vSize_t tempSeparater;
    vSize_t tempSetBuck;
    eSize_t totalESize;
    for (vSize_t setIdx = 1; setIdx < separaterList.size(); ++setIdx)
    {
        totalESize = waveSize[set2wf[setIdx].first];
        tempSeparater = separaterList[setIdx];
        if (tempSeparater == prevSeparater)
        {
            continue;
        }
        // std::cout << prevSeparater << "," << tempSeparater << "\n";
        tempSetBuck = bucketNodeInSetUsingLog(nodeInfoList, prevSeparater, tempSeparater, setIdx - 1, buckNodeInfoList, buckNodeIdx, buckNodeCCNum, buck2set, node2buck, totalESize);
        prevSeparater = tempSeparater;
        maxSetBuck = std::max(maxSetBuck, tempSetBuck);
    }
    return buckNodeIdx;
}

void readLink(const std::string &fileName, const std::vector<vSize_t> &label2idx,
              const std::vector<wf_t> &set2wf, const std::vector<vSize_t> &idx2set,
              const std::vector<vSize_t> &node2buck, adjList_t &buckLink)
{
    std::ifstream is;
    std::string line;

    labelSize_t src, tgt;
    vSize_t srcIdx, tgtIdx;
    vSize_t srcBuck, tgtBuck;
    // vSize_t srcSet, tgtSet;
    // vSize_t srcWave, tgtWave;
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
        // if (srcIdx > node2buck.size()) {
        //     std::cout << "srcIdx:" << srcIdx << "," << tgtIdx << "," << node2buck.size() << "\n";
        // }
        // if (srcIdx > node2buck.size()) {
        //     std::cout << "tgtIdx:" << srcIdx << "," << tgtIdx << "," << node2buck.size() << "\n";
        // }
        srcBuck = node2buck[srcIdx];
        tgtBuck = node2buck[tgtIdx];
        // if (srcBuck > buckLink.size()) {
        //     std::cout << "srcBuck" << srcBuck << "," << tgtBuck << "," << buckLink.size() << "\n";
        // }
        buckLink[srcBuck][tgtBuck] += weight;

        // srcSet = idx2set[srcIdx];
        // tgtSet = idx2set[tgtIdx];
        // srcWave = set2wf[srcSet].first;
        // tgtWave = set2wf[tgtSet].first;

        // if (srcWave == tgtWave)
        // {
        //     waveNodeInfoList[srcWave].update(0, weight, 0, 1);
        //     assert(srcSet != tgtSet);
        //     // ++ fragLink[srcSet][tgtSet];
        //     fragLink[srcSet][tgtSet] += weight;
        // }
        // else
        // {
        //     // ++ waveLink[srcWave][tgtWave];
        //     waveLink[srcWave][tgtWave] += weight;
        // }
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
        // if (srcIdx > node2buck.size()) {
        //     std::cout << "srcIdx:" << srcIdx << "," << tgtIdx << "," << node2buck.size() << "\n";
        // }
        // if (srcIdx > node2buck.size()) {
        //     std::cout << "tgtIdx:" << srcIdx << "," << tgtIdx << "," << node2buck.size() << "\n";
        // }
        srcBuck = node2buck[srcIdx];
        tgtBuck = node2buck[tgtIdx];
        // if (srcBuck > buckLink.size()) {
        //     std::cout << "srcBuck" << srcBuck << "," << tgtBuck << "," << buckLink.size() << "\n";
        // }
        buckLink[srcBuck][tgtBuck] += weight;
        // srcSet = idx2set[srcIdx];
        // tgtSet = idx2set[tgtIdx];
        // srcWave = set2wf[srcSet].first;
        // tgtWave = set2wf[tgtSet].first;

        // if (srcWave == tgtWave)
        // {
        //     waveNodeInfoList[srcWave].update(0, weight, 0, 1);
        //     assert(srcSet != tgtSet);
        //     // ++ fragLink[srcSet][tgtSet];
        //     fragLink[srcSet][tgtSet] += weight;
        // }
        // else
        // {
        //     // ++ waveLink[srcWave][tgtWave];
        //     waveLink[srcWave][tgtWave] += weight;
        // }
    }
    is.close();
}

void writeCompression(const std::string &fileNamePrefix, const std::vector<labelSize_t> &idx2label,
                      std::vector<vSize_t> node2buck, const std::vector<wf_t> &set2wf,
                      const std::vector<nodeInfoBuck> &buckNodeInfoList, const std::vector<vSize_t> buckNodeCCNum, const std::vector<vSize_t> buck2set,
                      const adjList_t &buckLink, vSize_t &buckNodeNum, eSize_t &buckLinkNum)
{
    std::ofstream os;
    os.open(fileNamePrefix + ".vmap");
    for (vSize_t i = 1; i < node2buck.size(); ++i)
    {
        os << node2buck[i] << ","
           << idx2label[i] << "\n";
    }
    os.close();

    os.open(fileNamePrefix + ".node");
    for (vSize_t i = 1; i < buckNodeInfoList.size(); ++i)
    {
        if (buckNodeInfoList[i].vSize == 0)
        {
            continue;
        }
        os << i << ","
           << set2wf[buck2set[i]].first << ","
           << set2wf[buck2set[i]].second << ","
           << buck2set[i] << ","
           << buckNodeInfoList[i].vSize << ","
           << buckNodeInfoList[i].eSize << ","
           << buckNodeCCNum[i] << ","
           << buckNodeInfoList[i].outESize << "\n";

        ++buckNodeNum;
    }
    os.close();

    // vSize_t waveLinkNum = 0;
    // std::vector<vSize_t> fragLinkNum(waveLink.size());

    os.open(fileNamePrefix + ".link");
    for (vSize_t i = 1; i < buckLink.size(); ++i)
    {
        for (const auto &kv : buckLink[i])
        {
            os << i << "," << kv.first << "," << kv.second << "\n";
            ++buckLinkNum;
        }
    }
    os.close();
}

// maxLabel, nodeNum, fragNum, waveNum, fragLinkNum, waveLinkNum
void writeMetaData(std::string prefix, std::vector<long long> &timeList,
                   const vSize_t &buckNodeNum, const eSize_t &buckLinkNum,
                   const vSize_t &maxSetBuck)
{
    std::ofstream outputFile;
    outputFile.open(prefix + "-info.json");
    outputFile << "{\n";
    outputFile << "\"nodeNum\":" << buckNodeNum << ",\n";
    outputFile << "\"linkNum\":" << buckLinkNum << ",\n";
    outputFile << "\"maxSetWidth\":" << maxSetBuck << ",\n";
    outputFile << "\"read-nodes-time\":" << timeList[0] << ",\n";
    outputFile << "\"buck-nodes-time\":" << timeList[1] << ",\n";
    outputFile << "\"read-links-time\":" << timeList[2] << ",\n";
    outputFile << "\"write-time\":" << timeList[3] << "\n}";
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

    std::vector<labelSize_t> idx2label(nodeNum + 1);
    std::vector<vSize_t> label2idx(maxLabel + 1);
    // std::vector<nodeInfo> fragNodeInfoList(fragNum + 1);
    // std::vector<nodeInfo> waveNodeInfoList(waveNum + 1);
    std::vector<wf_t> set2wf(fragNum + 1);
    std::vector<vSize_t> idx2set(nodeNum + 1);
    std::vector<vSize_t> separaterList(fragNum + 2); // record the begining node index of each set, 0 entry is reserved null, last entry records nodeNum
    std::vector<nodeInfoBuck> nodeInfoList(nodeNum + 1);
    std::vector<eSize_t> waveSize(waveNum + 1);
    readNode(dagPath + dagNamePrefix + ".node", idx2label, label2idx, set2wf, idx2set, separaterList, nodeInfoList, waveSize);
    timeList.push_back(getTimeElapsed());
    std::cout << "READ NODE\n";
    reset();

    std::vector<nodeInfoBuck> buckNodeInfoList(nodeNum + 1);
    std::vector<vSize_t> buckNodeCCNum(nodeNum + 1);
    std::vector<vSize_t> buck2set(nodeNum + 1);
    std::vector<vSize_t> node2buck(nodeNum + 1);
    // buckNum is total #buck + 1
    vSize_t maxSetBuck = 0;
    vSize_t buckNum = bucketNode(nodeInfoList, separaterList, buckNodeInfoList, buckNodeCCNum, buck2set, node2buck, maxSetBuck, set2wf, waveSize);
    buckNodeInfoList.resize(buckNum + 1);
    buckNodeCCNum.resize(buckNum + 1);
    buck2set.resize(buckNum + 1);
    timeList.push_back(getTimeElapsed());
    std::cout << "BUCK NODE\n";
    reset();

    // adjList_t fragLink(fragNum + 1);
    // adjList_t waveLink(waveNum + 1);
    adjList_t buckLink(buckNum + 1);
    readLink(dagPath + dagNamePrefix + ".link", label2idx, set2wf, idx2set, node2buck, buckLink);
    timeList.push_back(getTimeElapsed());
    std::cout << "READ LINK\n";
    reset();

    eSize_t buckLinkNum = 0;
    vSize_t bucknodeNum = 0;
    writeCompression(dagPath + dagNamePrefix + ".buck", idx2label, node2buck, set2wf, buckNodeInfoList, buckNodeCCNum, buck2set, buckLink, bucknodeNum, buckLinkNum);
    timeList.push_back(getTimeElapsed());
    std::cout << "WRITE DAG\n";
    reset();

    writeMetaData(dagPath + dagNamePrefix + ".buck", timeList, bucknodeNum, buckLinkNum, maxSetBuck);

    return 0;
}