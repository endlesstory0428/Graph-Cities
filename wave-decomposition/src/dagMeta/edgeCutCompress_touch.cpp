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
typedef std::pair<vSize_t, weight_t> tgt_t;
typedef std::vector<std::vector<tgt_t>> adjList_t;
typedef std::pair<vSize_t, vSize_t> deg_t; // iDeg, oDeg
typedef std::vector<deg_t> degList_t;

typedef std::vector<vSize_t> parent_t;
typedef std::vector<vSize_t> rank_t;
typedef boost::disjoint_sets<vSize_t *, vSize_t *> ds_t;

typedef std::unordered_map<vSize_t, std::pair<weight_t, vSize_t>> tgt_map_t;
typedef std::vector<tgt_map_t> adjList_map_t;

class nodeInfo
{
public:
    nodeInfo(void);
    void update(vSize_t w, vSize_t f, vSize_t s, vSize_t v, eSize_t e, vSize_t lv, eSize_t le);
    vSize_t wave;
    vSize_t waveMin; 
    vSize_t frag;
    vSize_t set;
    vSize_t vSize;
    eSize_t eSize;
    vSize_t localVSize;
    eSize_t localESize;
};

nodeInfo::nodeInfo(void)
{
    wave = 0; // max wave
    waveMin = 0; // min wave
    frag = 0;
    set = 0;
    vSize = 0;
    eSize = 0;
    localVSize = 0;
    localESize = 0;
}

void nodeInfo::update(vSize_t w, vSize_t f, vSize_t s, vSize_t v, eSize_t e, vSize_t lv, eSize_t le)
{
    if (s > set)
    {
        wave = w;
        frag = f;
        set = s;
    }
    waveMin = std::min(w, waveMin);
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

vSize_t readLink(const std::string &fileName, std::vector<vSize_t> &label2idx, std::vector<labelSize_t> &idx2label,
                 adjList_t &adjList, adjList_t &revAdjList,
                 degList_t &degList)
{
    std::ifstream is;
    std::string line;

    labelSize_t src, tgt;
    vSize_t srcIdx, tgtIdx;
    eSize_t weight;

    vSize_t vNum = 1;

    is.open(fileName);
    while (std::getline(is, line))
    {
        // std::cout << line << "\n";
        std::replace(line.begin(), line.end(), ',', ' ');
        std::istringstream iss(line);
        assert(iss >> src >> tgt >> weight);
        if (label2idx[src] == 0)
        {
            label2idx[src] = vNum;
            idx2label[vNum] = src;
            ++vNum;
        }
        if (label2idx[tgt] == 0)
        {
            label2idx[tgt] = vNum;
            idx2label[vNum] = tgt;
            ++vNum;
        }
        srcIdx = label2idx[src];
        tgtIdx = label2idx[tgt];
        adjList[srcIdx].push_back({tgtIdx, weight});
        revAdjList[tgtIdx].push_back({srcIdx, weight});
        ++degList[srcIdx].second;
        ++degList[tgtIdx].first;
    }
    is.close();

    is.open(fileName + ".jump");
    while (std::getline(is, line))
    {
        // std::cout << line << "\n";
        std::replace(line.begin(), line.end(), ',', ' ');
        std::istringstream iss(line);
        assert(iss >> src >> tgt >> weight);
        if (label2idx[src] == 0)
        {
            label2idx[src] = vNum;
            idx2label[vNum] = src;
            ++vNum;
        }
        if (label2idx[tgt] == 0)
        {
            label2idx[tgt] = vNum;
            idx2label[vNum] = tgt;
            ++vNum;
        }
        srcIdx = label2idx[src];
        tgtIdx = label2idx[tgt];
        adjList[srcIdx].push_back({tgtIdx, weight});
        revAdjList[tgtIdx].push_back({srcIdx, weight});
        ++degList[srcIdx].second;
        ++degList[tgtIdx].first;
    }
    is.close();

    return vNum;
}

void checkDeg(const degList_t &degList, const eSize_t &threshold,
              vSize_t &maxDeg, vSize_t &highDegNum)
{
    for (auto &deg : degList)
    {
        // std::cout << deg.first << "," << deg.second << "\n";
        if (deg.second > threshold)
        {
            ++highDegNum;
        }
        if (deg.second > maxDeg)
        {
            maxDeg = deg.second;
        }
    }
}

void topoSortUpdate(const vSize_t &vIdx, adjList_t &revAdjList, boost::dynamic_bitset<> &visited, std::vector<vSize_t> &srcLevel)
{
    // std::cout << "visit" << vIdx << "\n";
    visited[vIdx] = 1;
    for (auto &neighbor : revAdjList[vIdx])
    {
        if (visited[neighbor.first] == 0)
        {
            topoSortUpdate(neighbor.first, revAdjList, visited, srcLevel);
        }
        if (srcLevel[vIdx] < srcLevel[neighbor.first] + 1)
        {
            srcLevel[vIdx] = srcLevel[neighbor.first] + 1;
        }
    }
}

// NOTE: revAdjList.size() == nodeNum; srcLevel.size() == linkedNodeNum; nodeNum <= linkedNodeNum
void topoSort(adjList_t &revAdjList, std::vector<vSize_t> &srcLevel)
{
    boost::dynamic_bitset<> visited(srcLevel.size());
    for (vSize_t i = 1; i < srcLevel.size(); ++i)
    {
        if (visited[i] == 0)
        {
            topoSortUpdate(i, revAdjList, visited, srcLevel);
        }
    }
}

void getLevel2nodes(const vSize_t &maxLevel, std::vector<vSize_t> &srcLevel,
                    std::vector<vSize_t> &levelStartPos, std::vector<vSize_t> &sortedVList)
{
    for (vSize_t i = 1; i < srcLevel.size(); ++i)
    {
        ++levelStartPos[srcLevel[i]];
    }
    vSize_t start = 1;
    vSize_t levelSize = 0;
    for (vSize_t level = 0; level <= maxLevel; ++level)
    {
        levelSize = levelStartPos[level];
        levelStartPos[level] = start;
        start += levelSize;
    }
    for (vSize_t i = 1; i < srcLevel.size(); ++i)
    {
        sortedVList[levelStartPos[srcLevel[i]]] = i;
        ++levelStartPos[srcLevel[i]];
    }
    for (vSize_t level = maxLevel; level >= 1; --level)
    {
        levelStartPos[level] = levelStartPos[level - 1];
    }
    levelStartPos[0] = 1;
}

void getLevel2nodesWithCutSize(const vSize_t &maxLevel, std::vector<vSize_t> &srcLevel,
                               std::vector<vSize_t> &levelStartPos, std::vector<vSize_t> &sortedVList,
                               std::vector<vSize_t> &cutSize, degList_t &degList)
{
    for (vSize_t i = 1; i < srcLevel.size(); ++i)
    {
        ++levelStartPos[srcLevel[i]];
        cutSize[srcLevel[i]] += degList[i].second;
    }
    vSize_t start = 1;
    vSize_t levelSize = 0;
    for (vSize_t level = 0; level <= maxLevel; ++level)
    {
        levelSize = levelStartPos[level];
        levelStartPos[level] = start;
        start += levelSize;
    }
    for (vSize_t i = 1; i < srcLevel.size(); ++i)
    {
        sortedVList[levelStartPos[srcLevel[i]]] = i;
        ++levelStartPos[srcLevel[i]];
    }
    for (vSize_t level = maxLevel; level >= 1; --level)
    {
        levelStartPos[level] = levelStartPos[level - 1];
    }
    levelStartPos[0] = 1;
}

vSize_t compressInDeg(const eSize_t &thresholdLB, const eSize_t &thresholdUB, const vSize_t &maxLevel,
                      std::vector<vSize_t> &levelStartPos, std::vector<vSize_t> &sortedVList,
                      adjList_t &revAdjList,
                      ds_t &finalDs, rank_t &rank, parent_t &parent)
{
    boost::dynamic_bitset<> done(rank.size());
    boost::dynamic_bitset<> finalDone(rank.size());
    rank_t tempRank(rank.size());
    parent_t tempParent(rank.size());
    ds_t tempDs(&tempRank[0], &tempParent[0]);
    std::vector<eSize_t> tempNodeSize(rank.size());
    std::vector<eSize_t> finalNodeSize(rank.size());

    vSize_t src, tgt;
    vSize_t srcRoot, tgtRoot, newRoot, finalRoot;
    vSize_t ccDiffNum = 0;

    for (vSize_t level = 0; level <= maxLevel; ++level)
    {
        // reset temp to final
        done = finalDone;
        memcpy(&tempRank[0], &rank[0], rank.size() * sizeof(rank[0]));
        memcpy(&tempParent[0], &parent[0], parent.size() * sizeof(parent[0]));
        memcpy(&tempNodeSize[0], &finalNodeSize[0], finalNodeSize.size() * sizeof(finalNodeSize[0]));

        // update temp to check size
        for (vSize_t pos = levelStartPos[level]; pos < levelStartPos[level + 1]; ++pos)
        {
            tgt = sortedVList[pos];
            for (const auto &sw : revAdjList[tgt])
            {
                srcRoot = tempDs.find_set(sw.first);
                if (done[srcRoot] == 1)
                {
                    continue;
                }
                tgtRoot = tempDs.find_set(tgt);
                if (srcRoot != tgtRoot)
                {
                    tempDs.link(srcRoot, tgtRoot);
                    newRoot = tempDs.find_set(tgt);
                    tempNodeSize[newRoot] = tempNodeSize[srcRoot] + tempNodeSize[tgtRoot] + 1; // +1 for the new link
                }
                else
                {
                    ++tempNodeSize[srcRoot];
                }
            }
        }

        // use temp to update final
        for (vSize_t pos = levelStartPos[level]; pos < levelStartPos[level + 1]; ++pos)
        {
            tgt = sortedVList[pos];
            finalRoot = tempDs.find_set(tgt);
            if (tempNodeSize[finalRoot] > thresholdUB)
            {
                for (const auto &sw : revAdjList[tgt])
                {
                    srcRoot = finalDs.find_set(sw.first);
                    finalDone[srcRoot] = 1;
                }
            }
            else if (tempNodeSize[finalRoot >= thresholdLB])
            {
                for (const auto &sw : revAdjList[tgt])
                {
                    srcRoot = finalDs.find_set(sw.first);
                    if (done[srcRoot] == 1)
                    {
                        continue;
                    }
                    tgtRoot = finalDs.find_set(tgt);
                    if (srcRoot != tgtRoot)
                    {
                        finalDs.link(srcRoot, tgtRoot);
                        newRoot = finalDs.find_set(tgt);
                        finalNodeSize[newRoot] = finalNodeSize[srcRoot] + finalNodeSize[tgtRoot] + 1; // +1 for the new link
                        finalDone[newRoot] = 1;
                        ++ccDiffNum;
                    }
                    else
                    {
                        ++finalNodeSize[srcRoot];
                        finalDone[srcRoot] = 1;
                    }
                }
            }
            else
            {
                for (const auto &sw : revAdjList[tgt])
                {
                    srcRoot = finalDs.find_set(sw.first);
                    if (done[srcRoot] == 1)
                    {
                        continue;
                    }
                    tgtRoot = finalDs.find_set(tgt);
                    if (srcRoot != tgtRoot)
                    {
                        finalDs.link(srcRoot, tgtRoot);
                        newRoot = finalDs.find_set(tgt);
                        finalNodeSize[newRoot] = finalNodeSize[srcRoot] + finalNodeSize[tgtRoot] + 1; // +1 for the new link
                        ++ccDiffNum;
                    }
                    else
                    {
                        ++finalNodeSize[srcRoot];
                    }
                }
            }
        }
    }
    return ccDiffNum;
}

void compress(const eSize_t &thresholdLB, const eSize_t &thresholdUB, const vSize_t &maxLevel,
              std::vector<vSize_t> &levelStartPos, std::vector<vSize_t> &sortedVList)
{
}

vSize_t compressFast(const eSize_t &thresholdLB, const eSize_t &thresholdUB, const vSize_t &maxLevel,
                     std::vector<vSize_t> &levelStartPos, std::vector<vSize_t> &sortedVList,
                     adjList_t adjList,
                     ds_t &finalDs,
                     std::vector<vSize_t> &cutSize)
{
    eSize_t cumCutSize = 0;
    vSize_t src;
    vSize_t srcRoot, tgtRoot;
    vSize_t ccDiffNum = 0;
    for (vSize_t level = 0; level <= maxLevel; ++level)
    {
        // if (cumCutSize > thresholdLB) {
        //     continue;
        // }
        if (cumCutSize + cutSize[level] > thresholdUB)
        {
            cumCutSize = 0;
            continue;
        }
        cumCutSize += cutSize[level];
        for (vSize_t pos = levelStartPos[level]; pos < levelStartPos[level + 1]; ++pos)
        {
            src = sortedVList[pos];
            for (auto &tw : adjList[src])
            {
                srcRoot = finalDs.find_set(src); // srcRoot may change after ds.link, so it need to be inside for loop
                tgtRoot = finalDs.find_set(tw.first);
                if (srcRoot != tgtRoot)
                {
                    finalDs.link(srcRoot, tgtRoot);
                    ++ccDiffNum;
                }
            }
        }
    }
    return ccDiffNum;
}

vSize_t compressFastBidirection(const eSize_t &thresholdLB, const eSize_t &thresholdUB, const vSize_t &maxLevel,
                                std::vector<vSize_t> &levelStartPos, std::vector<vSize_t> &sortedVList,
                                adjList_t adjList,
                                ds_t &finalDs,
                                std::vector<vSize_t> &cutSize)
{
    eSize_t cumCutSizeSrc = 0;
    eSize_t cumCutSizeTgt = 0;
    vSize_t src;
    vSize_t srcRoot, tgtRoot;
    vSize_t ccDiffNum = 0;
    vSize_t srcLevel = 0;
    vSize_t tgtLevel = maxLevel;
    while (srcLevel + 1 < tgtLevel)
    {
        // // srcLevel side merge
        if (cumCutSizeSrc + cutSize[srcLevel] > thresholdUB)
        {
            cumCutSizeSrc = 0;
        }
        else
        {
            cumCutSizeSrc += cutSize[srcLevel];
            for (vSize_t pos = levelStartPos[srcLevel]; pos < levelStartPos[srcLevel + 1]; ++pos)
            {
                src = sortedVList[pos];
                for (auto &tw : adjList[src])
                {
                    srcRoot = finalDs.find_set(src); // srcRoot may change after ds.link, so it need to be inside for loop
                    tgtRoot = finalDs.find_set(tw.first);
                    if (srcRoot != tgtRoot)
                    {
                        finalDs.link(srcRoot, tgtRoot);
                        ++ccDiffNum;
                    }
                }
            }
        }
        ++srcLevel;

        // check
        if (srcLevel + 1 == tgtLevel)
        {
            break;
        }

        // // tgtLevel side merge
        if (cumCutSizeTgt + cutSize[tgtLevel - 1] > thresholdUB)
        {
            cumCutSizeTgt = 0;
        }
        else
        {
            cumCutSizeTgt += cutSize[tgtLevel - 1];
            for (vSize_t pos = levelStartPos[tgtLevel - 1]; pos < levelStartPos[tgtLevel]; ++pos)
            {
                src = sortedVList[pos];
                for (auto &tw : adjList[src])
                {
                    srcRoot = finalDs.find_set(src); // srcRoot may change after ds.link, so it need to be inside for loop
                    tgtRoot = finalDs.find_set(tw.first);
                    if (srcRoot != tgtRoot)
                    {
                        finalDs.link(srcRoot, tgtRoot);
                        ++ccDiffNum;
                    }
                }
            }
        }
        --tgtLevel;
    }
    return ccDiffNum;
}

void readNode(const std::string &fileName, const vSize_t &linkedNodeNum, ds_t &finalDs,
              std::vector<vSize_t> &label2idx, std::vector<labelSize_t> &idx2label,
              std::vector<nodeInfo> &nodeInfoList)
{
    std::ifstream is;
    std::string line;

    labelSize_t v;
    vSize_t vIdx, vRootIdx;
    vSize_t wave, frag, set;
    vSize_t vSize;
    eSize_t eSize;
    eSize_t outESize;

    vSize_t vNum = linkedNodeNum;

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
        vRootIdx = vIdx >= linkedNodeNum ? vIdx : finalDs.find_set(vIdx);
        nodeInfoList[vRootIdx].update(wave, frag, set, vSize, eSize, 1, 0);
    }
    is.close();
}

void updateLink(ds_t &finalDs, adjList_t &adjList, adjList_map_t &finalLinks, std::vector<nodeInfo> &nodeInfoList)
{
    vSize_t srcRoot, tgtRoot;
    for (vSize_t src = 1; src < adjList.size(); ++src)
    {
        srcRoot = finalDs.find_set(src);
        for (auto &tw : adjList[src])
        {
            tgtRoot = finalDs.find_set(tw.first);
            // std::cout << srcRoot << "," << tgtRoot << "\n";
            if (srcRoot == tgtRoot)
            {
                // std::cout << "inner\n";
                nodeInfoList[srcRoot].eSize += tw.second;
                ++nodeInfoList[srcRoot].localESize;
            }
            else
            {
                // std::cout << "meta\n";
                finalLinks[srcRoot][tgtRoot].first += tw.second;
                ++finalLinks[srcRoot][tgtRoot].second;
            }
        }
    }
}

eSize_t writeCompression(const std::string &fileNamePrefix, const vSize_t &linkedNodeNum, std::vector<labelSize_t> &idx2label,
                         ds_t &finalDs, adjList_map_t &finalLinks, std::vector<nodeInfo> &nodeInfoList)
{
    eSize_t finalLinkNum = 0;
    std::ofstream os;
    os.open(fileNamePrefix + ".vmap");
    for (vSize_t i = 1; i < idx2label.size(); ++i)
    {
        if (i <= linkedNodeNum)
        {
            os << idx2label[finalDs.find_set(i)] << "," << idx2label[i] << "\n";
        }
        else
        {
            os << idx2label[i] << "," << idx2label[i] << "\n";
        }
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
           << nodeInfoList[i].waveMin << ","
           << nodeInfoList[i].wave << "\n";
    }
    os.close();

    os.open(fileNamePrefix + ".link");
    for (vSize_t i = 1; i < idx2label.size(); ++i)
    {
        if (finalLinks[i].size() == 0)
        {
            continue;
        }
        assert(finalDs.find_set(i) == i);
        for (auto &kv : finalLinks[i])
        {
            os << idx2label[i] << "," << idx2label[kv.first] << "," << kv.second.first << "," << kv.second.second << "\n";
            ++finalLinkNum;
        }
    }
    os.close();

    return finalLinkNum;
}

void writeMetaData(std::string prefix, std::vector<long long> &timeList,
                   const labelSize_t &maxLabel, const vSize_t &nodeNum, const eSize_t &linkNum, const eSize_t threshold,
                   const vSize_t &linkedNodeNum, const eSize_t &finalLinkNum, const vSize_t &ccDiffNum,
                   const vSize_t &maxDeg, const vSize_t &highDegNum)
{
    std::ofstream outputFile;
    outputFile.open(prefix + "-info.json");
    outputFile << "{\n";
    outputFile << "\"maxLabel\":" << maxLabel << ",\n";
    outputFile << "\"threshold\":" << threshold << ",\n";
    outputFile << "\"max-deg\":" << maxDeg << ",\n";
    outputFile << "\"hi-deg-nodes\":" << highDegNum << ",\n";
    outputFile << "\"input-isolated-nodes\":" << nodeNum - linkedNodeNum << ",\n";
    outputFile << "\"input-nodes\":" << nodeNum << ",\n";
    outputFile << "\"input-links\":" << linkNum << ",\n";
    std::cout << nodeNum << "," << ccDiffNum << "\n";
    outputFile << "\"output-nodes\":" << nodeNum - ccDiffNum << ",\n";
    outputFile << "\"output-links\":" << finalLinkNum << ",\n";
    outputFile << "\"read-links-time\":" << timeList[0] << ",\n";
    outputFile << "\"check-deg-time\":" << timeList[1] << ",\n";
    outputFile << "\"topo-sort-time\":" << timeList[2] << ",\n";
    outputFile << "\"map-level-time\":" << timeList[3] << ",\n";
    outputFile << "\"union-find-time\":" << timeList[4] << ",\n";
    outputFile << "\"read-nodes-time\":" << timeList[5] << ",\n";
    outputFile << "\"update-links-time\":" << timeList[6] << ",\n";
    outputFile << "\"write-dag-time\":" << timeList[7] << "\n}";
    outputFile.close();
}

int main(int argc, char *argv[])
{
    if (argc < 9)
    {
        std::cerr
            << argv[0]
            << ": usage: ./edgeCutCompress "
            << "<graph name> <path to graph folder> <path to graph_waves folder> <dag name prefix>"
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
    eSize_t threshold = atol(argv[8]);

    std::cout << dagPath << dagNamePrefix << "\n";
    std::cout << maxLabel << "," << nodeNum << "," << linkNum << "," << threshold << "\n";

    std::vector<long long> timeList;
    reset();

    std::vector<labelSize_t> idx2label(nodeNum + 1);
    std::vector<vSize_t> label2idx(maxLabel + 1);
    adjList_t adjList(nodeNum + 1);
    adjList_t revAdjList(nodeNum + 1);
    degList_t degList(nodeNum + 1);
    vSize_t linkedNodeNum = readLink(dagPath + dagNamePrefix + ".link", label2idx, idx2label, adjList, revAdjList, degList);
    --linkedNodeNum;
    std::cout << "READ LINK" << linkedNodeNum << "\n";
    timeList.push_back(getTimeElapsed());
    reset();

    vSize_t maxDeg = 0;
    vSize_t highDegNum = 0;
    checkDeg(degList, threshold, maxDeg, highDegNum);
    std::cout << "CHECK DEG\n";
    timeList.push_back(getTimeElapsed());
    reset();

    std::vector<vSize_t> srcLevel(linkedNodeNum + 1, 0);
    topoSort(revAdjList, srcLevel);
    vSize_t maxLevel = *std::max_element(srcLevel.begin(), srcLevel.end());
    std::cout << "TOPO SORT\n";
    timeList.push_back(getTimeElapsed());
    reset();

    std::vector<vSize_t> levelStartPos(maxLevel + 2);
    levelStartPos[maxLevel + 1] = linkedNodeNum + 1;
    std::vector<vSize_t> sortedVList(linkedNodeNum + 1);
    std::vector<vSize_t> cutSize;
    if (FAST == 0)
    {
        getLevel2nodes(maxLevel, srcLevel, levelStartPos, sortedVList);
    }
    else
    {
        cutSize.resize(maxLevel + 1);
        getLevel2nodesWithCutSize(maxLevel, srcLevel, levelStartPos, sortedVList, cutSize, degList);
    }
    std::cout << "MAP LEVEL\n";
    timeList.push_back(getTimeElapsed());
    reset();

    rank_t rank(nodeNum + 1);
    parent_t parent(nodeNum + 1);
    ds_t finalDs(&rank[0], &parent[0]);
    for (vSize_t i = 1; i <= nodeNum; ++i)
    {
        finalDs.make_set(i);
    }
    vSize_t ccDiffNum;
    if (FAST == 0)
    {
        ccDiffNum = compressInDeg(threshold - threshold / 16, threshold + threshold / 16, maxLevel, levelStartPos, sortedVList, revAdjList, finalDs, rank, parent);
    }
    else
    {
        // ccDiffNum = compressFast(threshold - threshold / 16, threshold + threshold / 16, maxLevel, levelStartPos, sortedVList, adjList, finalDs, cutSize);
        ccDiffNum = compressFastBidirection(threshold - threshold / 16, threshold + threshold / 16, maxLevel, levelStartPos, sortedVList, adjList, finalDs, cutSize);
    }
    std::cout << "UNION FIND\n";
    timeList.push_back(getTimeElapsed());
    reset();

    std::vector<nodeInfo> nodeInfoList(nodeNum + 1);
    readNode(dagPath + dagNamePrefix + ".node", linkedNodeNum, finalDs, label2idx, idx2label, nodeInfoList);
    std::cout << "READ NODE\n";
    timeList.push_back(getTimeElapsed());
    reset();

    adjList_map_t finalLinks(nodeNum + 1);
    updateLink(finalDs, adjList, finalLinks, nodeInfoList);
    std::cout << "UPDATE LINK\n";
    timeList.push_back(getTimeElapsed());
    reset();

    eSize_t finalLinkNum = writeCompression(dagPath + dagNamePrefix + ".edgeCut", linkedNodeNum, idx2label, finalDs, finalLinks, nodeInfoList);
    std::cout << "WRITE DAG\n";
    timeList.push_back(getTimeElapsed());
    reset();

    std::cout << ccDiffNum << "," << nodeNum << "\n";
    writeMetaData(dagPath + dagNamePrefix + ".edgeCut", timeList, maxLabel, nodeNum, linkNum, threshold, linkedNodeNum, finalLinkNum, ccDiffNum, maxDeg, highDegNum);

    return 0;
}