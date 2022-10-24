#include <algorithm>
#include <assert.h>
// #include <boost/container_hash/hash.hpp>
#include <boost/functional/hash.hpp>
// #include <boost/graph/adjacency_list.hpp>
// #include <boost/graph/connected_components.hpp>
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
// #include <map>

#define DEBUG 1
#define LNULL ((uint32_t)-1)

typedef uint32_t vSize_t;
typedef uint32_t eSize_t;
typedef uint32_t labelSize_t;

typedef uint32_t layerSize_t;

typedef std::pair<layerSize_t, vSize_t> lcc_t;
typedef uint32_t lccIdx_t;
typedef std::pair<std::pair<labelSize_t, layerSize_t>, lccIdx_t> clone_t;

typedef std::unordered_map<lcc_t, lccIdx_t, boost::hash<lcc_t>> lcc2idx_t;
typedef std::unordered_map<lccIdx_t, vSize_t> lcc_w_t;
typedef std::vector<lcc_w_t> intersection_t;

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

inline lccIdx_t getLccIdx(lcc2idx_t &lcc2idx, const lcc_t &lcc)
{
    if (lcc2idx.find(lcc) == lcc2idx.end())
    {
        lccIdx_t retval = lcc2idx.size();
        lcc2idx[lcc] = retval;
        return retval;
    }
    else
    {
        return lcc2idx[lcc];
    }
}

bool compareClones(const clone_t &a, const clone_t &b)
{
    if (a.first.first < b.first.first)
    {
        return true;
    }
    else if (a.first.first == b.first.first)
    {
        return a.first.second < b.first.second;
    }
    else
    {
        return false;
    }
    // return a.first.first == b.first.first ? a.first.first < b.first.first : a.first.second < b.first.second;
}

void readCloneList(std::vector<std::string> &cclayerNames, std::vector<clone_t> &cloneList, lcc2idx_t &lcc2idx)
{
    std::ifstream is;
    labelSize_t v;
    vSize_t cc;
    layerSize_t layer;
    vSize_t lcc;
    lccIdx_t lccIdx;
    std::string line;
    for (auto &cclayerName : cclayerNames)
    {
        is.open(cclayerName);
        while (std::getline(is, line))
        {
            // std::cout << line << "\n";
            std::replace(line.begin(), line.end(), ',', ' ');
            std::istringstream iss(line);
            assert(iss >> v >> cc >> layer >> lcc);
            lccIdx = getLccIdx(lcc2idx, std::make_pair(layer, lcc));
            cloneList.push_back(std::make_pair(std::make_pair(v, layer), lccIdx));
        }
        is.close();
    }
}

void getIntersection(std::vector<clone_t> &cloneList, intersection_t &intersection, std::vector<layerSize_t> &cloneNum)
{
    labelSize_t tempV = LNULL;
    eSize_t startIdx = 0;
    clone_t cloneSrc, cloneTgt;
    bool startFlag = true;
    for (eSize_t i = 0; i < cloneList.size(); ++i)
    {
        cloneTgt = cloneList[i];
        if (tempV != cloneTgt.first.first)
        {
            if (startFlag)
            {
                startFlag = false;
            }
            else
            {
                cloneNum[tempV] = i - startIdx - 1;
            }
            tempV = cloneTgt.first.first;
            startIdx = i;
            // std::cout << startIdx << "\n";
        }
        for (eSize_t j = startIdx; j < i; ++j)
        {
            cloneSrc = cloneList[j];
            ++intersection[cloneSrc.second][cloneTgt.second];
        }
    }
    cloneNum[tempV] = cloneList.size() - startIdx - 1;
}

void writeLccMap(const std::string &mapName, lcc2idx_t &lcc2idx)
{
    std::ofstream os(mapName);
    for (auto kv : lcc2idx)
    {
        os << kv.second << "," << kv.first.first << "," << kv.first.second << "\n";
    }
}

void writeIntersection(const std::string &mapName, intersection_t &intersection, eSize_t &intersectionSize)
{
    std::ofstream os(mapName);
    for (eSize_t i = 0; i < intersection.size(); ++i)
    {
        for (auto &kv : intersection[i])
        {
            os << i << "," << kv.first << "," << kv.second << "\n";
            intersectionSize += kv.second;
        }
    }
}

void writeCloneNum(const std::string &mapName, std::vector<layerSize_t> &cloneNum)
{
    std::ofstream os(mapName);
    for (eSize_t i = 0; i < cloneNum.size(); ++i)
    {
        if (cloneNum[i] > 0)
        {
            os << i << "," << cloneNum[i] << "\n";
        }
    }
}

void writeMetaData(std::string prefix, std::vector<long long> &timeList, eSize_t cloneListSize, eSize_t intersectionSize)
{
    std::ofstream outputFile;
    outputFile.open(prefix + "-fpmeta-info.json");
    outputFile << "{\n";
    outputFile << "\"clones\":" << cloneListSize << ",\n";
    outputFile << "\"intersection-weights\":" << intersectionSize << ",\n";
    outputFile << "\"preprocess-time\":" << timeList[0] << ",\n";
    outputFile << "\"write-ids-time\":" << timeList[1] << ",\n";
    outputFile << "\"sort-time\":" << timeList[2] << ",\n";
    outputFile << "\"intersection-time\":" << timeList[3] << ",\n";
    outputFile << "\"write-intersection-time\":" << timeList[4] << ",\n";
    outputFile << "\"write-clone-count-time\":" << timeList[5] << "\n}";
    outputFile.close();
}

int main(int argc, char *argv[])
{
    if (argc < 6)
    {
        std::cerr
            << argv[0]
            << ": usage: ./fpmetagraph "
            << "<graph name> <path to graph folder> <path to graph_layer folder>"
            << "<intersection size>"
            << "<list of cc-layer file name>\n";
        exit(1);
    }
    std::string graphName = argv[1];
    std::string graphPath = argv[2];
    std::string layerPath = argv[3];
    eSize_t cloneListSize = atol(argv[4]);
    std::vector<std::string> cclayerNames;
    cclayerNames.reserve(argc - 6);
    for (uint32_t i = 4; i < argc; ++i)
    {
        cclayerNames.push_back(layerPath + argv[i]);
        std::cout << layerPath + argv[i] << "\n";
    }
    std::cout << graphPath << "\n";
    std::cout << cloneListSize << "\n";

    std::vector<clone_t> cloneList;
    cloneList.reserve(cloneListSize);

    lccIdx_t lccNum = 0;

    std::vector<long long> timeList;
    reset();
    do
    {
        lcc2idx_t lcc2idx;
        readCloneList(cclayerNames, cloneList, lcc2idx);
        std::cout << "READ CC-LAYERS\n";
        timeList.push_back(getTimeElapsed());
        reset();

        lccNum = lcc2idx.size();
        writeLccMap(graphPath + "fpmeta.ids", lcc2idx);
        timeList.push_back(getTimeElapsed());
        reset();
    } while (0);

    // for (auto &clone : cloneList) {
    //     std::cout << clone.first.first << "," << clone.first.second << "," << clone.second << "\n";
    // }
    std::sort(cloneList.begin(), cloneList.end(), compareClones);
    std::cout << "SORT CLONES\n";
    timeList.push_back(getTimeElapsed());
    reset();
    // for (auto &clone : cloneList) {
    //     std::cout << clone.first.first << "," << clone.first.second << "," << clone.second << "\n";
    // }

    labelSize_t maxLabel = cloneList.back().first.first;

    intersection_t intersection(lccNum + 1);
    std::vector<layerSize_t> cloneNum(maxLabel + 1);
    getIntersection(cloneList, intersection, cloneNum);
    std::cout << "COLLECTED INTERSECTION\n";
    timeList.push_back(getTimeElapsed());
    reset();

    eSize_t intersectionSize = 0;
    writeIntersection(graphPath + "fpmeta.csv", intersection, intersectionSize);
    std::cout << "WRITE INTERSECTION\n";
    timeList.push_back(getTimeElapsed());
    reset();

    writeCloneNum(graphPath + "cloneCnt.csv", cloneNum);
    std::cout << "WRITE CLONE COUNT\n";
    timeList.push_back(getTimeElapsed());
    reset();

    writeMetaData(graphPath + graphName, timeList, cloneListSize, intersectionSize);

    return 0;
}