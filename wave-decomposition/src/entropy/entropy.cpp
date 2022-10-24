#include <algorithm>
#include <assert.h>
// #include <boost/container_hash/hash.hpp>
// #include <boost/functional/hash.hpp>
// #include <boost/graph/adjacency_list.hpp>
// #include <boost/graph/connected_components.hpp>
#include <boost/dynamic_bitset.hpp>
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
#define LNULL ((uint32_t)-1)

typedef uint32_t vSize_t;
typedef uint32_t eSize_t;
typedef uint32_t labelSize_t;

typedef uint32_t layerSize_t;
typedef std::pair<layerSize_t, vSize_t> localDeg_t;

typedef double_t entropy_t;

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

void readClones(const std::string &fileName, std::vector<layerSize_t> &v2clone)
{
    std::ifstream is;
    labelSize_t v;
    layerSize_t clone;
    std::string line;

    is.open(fileName);
    while (std::getline(is, line))
    {
        // std::cout << line << "\n";
        std::replace(line.begin(), line.end(), ',', ' ');
        std::istringstream iss(line);
        assert(iss >> v >> clone);
        v2clone[v] = clone;
    }
    is.close();
}

void readSortedLayers(const std::string &fileName, std::vector<layerSize_t> &layer2idx, boost::dynamic_bitset<> &seen, std::vector<layerSize_t> &v2clone,
                      std::vector<std::vector<localDeg_t>> &localDeg, std::vector<vSize_t> &deg)
{
    std::ifstream is;
    labelSize_t src, tgt;
    layerSize_t layer;
    std::string line;

    is.open(fileName);
    labelSize_t prevSrc = LNULL;
    layerSize_t prevLayer = LNULL;
    while (std::getline(is, line))
    {
        // std::cout << line << "\n";
        std::replace(line.begin(), line.end(), ',', ' ');
        std::istringstream iss(line);
        assert(iss >> src >> tgt >> layer);
        if (seen[src] == 0)
        {
            localDeg[src].reserve(1 + v2clone[src]);
            seen[src] = 1;
        }

        ++deg[src];

        if (src != prevSrc || layer != prevLayer)
        {
            localDeg[src].push_back(std::make_pair(layer2idx[layer], (vSize_t)1));
            prevSrc = src;
            prevLayer = layer;
        }
        else
        {
            ++localDeg[src].back().second;
        }
    }
    is.close();
}

void writeJson(const std::string &fileName, std::vector<layerSize_t> &idx2layer, std::vector<entropy_t> &layer2aveEntropy, entropy_t maxEntropy)
{
    std::ofstream os(fileName);
    os << "{";
    bool firstFlag = true;
    for (layerSize_t i = 1; i < idx2layer.size(); ++i)
    {
        if (firstFlag)
        {
            firstFlag = false;
        }
        else
        {
            os << ",";
        }
        if (maxEntropy == (entropy_t)0.0)
        {
            os << "\"" << idx2layer[i] << "\":0.0";
        }
        else
        {
            os << "\"" << idx2layer[i] << "\":" << layer2aveEntropy[i] / maxEntropy;
        }
    }
    os << "}";
    os.close();
}

void writeLocalDeg(const std::string &fileName, std::vector<layerSize_t> &idx2layer, std::vector<std::vector<localDeg_t>> &localDegList, std::vector<vSize_t> &degList)
{
    std::ofstream os(fileName);
    vSize_t deg = 0;
    for (vSize_t v = 0; v < degList.size(); ++v)
    {
        if (degList[v] == 0)
        {
            continue;
        }
        deg = 0;
        for (auto &localDeg : localDegList[v])
        {
            assert(localDeg.second != 0);
            os << v << "," << idx2layer[localDeg.first] << "," << localDeg.second << "\n";
            deg += localDeg.second;
        }
        assert(deg == degList[v]);
    }
    os.close();
}

void writeMetaData(std::string prefix, std::vector<long long> &timeList, entropy_t maxEntropy)
{
    std::ofstream outputFile;
    outputFile.open(prefix + "-wavemaps-info.json");
    outputFile << "{\n";
    outputFile << "\"max-layer-ave-entropy\":" << maxEntropy << ",\n";
    outputFile << "\"read-clones-time\":" << timeList[0] << ",\n";
    outputFile << "\"read-layer-time\":" << timeList[1] << ",\n";
    outputFile << "\"compute-entropy-time\":" << timeList[2] << ",\n";
    outputFile << "\"write-time\":" << timeList[3] << "\n}";
    outputFile.close();
}

int main(int argc, char *argv[])
{
    if (argc < 7)
    {
        std::cerr
            << argv[0]
            << ": usage: ./wavemaps "
            << "<graph name> <path to graph folder> <path to graph_layer folder>"
            << "<max label> <number of fp> <fp list>";
        exit(1);
    }

    std::string graphName = argv[1];
    std::string graphPath = argv[2];
    std::string layerPath = argv[3];

    labelSize_t maxLabel = atol(argv[4]);
    layerSize_t layerNum = atol(argv[5]);
    layerSize_t maxLayer = atol(argv[5 + layerNum]);

    std::cout << maxLabel << "," << layerNum << "," << maxLayer << "\n";

    std::vector<layerSize_t> idx2layer(layerNum + 1);
    std::vector<layerSize_t> layer2idx(maxLayer + 1);

    for (layerSize_t i = 1; i <= layerNum; ++i)
    {
        layerSize_t tempLayer = atol(argv[5 + i]);
        std::cout << tempLayer << "\n";
        idx2layer[i] = tempLayer;
        layer2idx[tempLayer] = i;
    }
    std::vector<std::string> layerBuckNames;
    for (layerSize_t i = 5 + layerNum + 1; i < argc; ++i)
    {
        std::cout << argv[i] << "\n";
        layerBuckNames.push_back(argv[i]);
    }

    std::vector<long long> timeList;
    reset();
    
    std::vector<layerSize_t> v2clone(maxLabel + 1);
    readClones(graphPath + "cloneCnt.csv", v2clone);
    std::cout << "READ CLONES\n";
    timeList.push_back(getTimeElapsed());
    reset();

    boost::dynamic_bitset<> seen((maxLabel + 1));
    std::vector<vSize_t> degList(maxLabel + 1);
    std::vector<std::vector<localDeg_t>> localDegList(maxLabel + 1);
    for (auto &layerBuck : layerBuckNames)
    {
        readSortedLayers(layerPath + layerBuck, layer2idx, seen, v2clone, localDegList, degList);
        std::cout << "READ LAYER " << layerBuck << "\n";
    }
    timeList.push_back(getTimeElapsed());
    reset();

    std::vector<entropy_t> v2entropy(maxLabel + 1, 0.0);
    std::vector<entropy_t> layer2entropy(layerNum + 1, 0.0);
    std::vector<vSize_t> layer2vSize(layerNum + 1);
    for (vSize_t v = 0; v <= maxLabel; ++v)
    {
        if (!seen[v])
        {
            continue;
        }
        assert(degList[v] != 0);
        for (auto &localDeg : localDegList[v])
        {
            entropy_t prob = (entropy_t)localDeg.second / (entropy_t)degList[v];
            entropy_t entropy = prob * log2(prob);
            v2entropy[v] -= entropy;
        }

        for (auto &localDeg : localDegList[v]) {
            layer2entropy[localDeg.first] += v2entropy[v];
            ++layer2vSize[localDeg.first];
        }
    }

    std::vector<entropy_t> layer2aveEntropy(layerNum + 1, 0.0);
    entropy_t maxEntropy = 0;
    for (layerSize_t i = 1; i <= layerNum; ++i)
    {
        assert(layer2vSize[i] != 0);
        layer2aveEntropy[i] = layer2entropy[i] / layer2vSize[i];
        if (layer2aveEntropy[i] > maxEntropy)
        {
            maxEntropy = layer2aveEntropy[i];
        }
        std::cout << idx2layer[i] << "," << layer2entropy[i] << "," << layer2vSize[i] << "\n";
    }
    std::cout << "COMPUTE ENTROPY\n";
    timeList.push_back(getTimeElapsed());
    reset();

    writeJson(graphPath + graphName + "_entropy.json", idx2layer, layer2aveEntropy, maxEntropy);
    writeLocalDeg(graphPath + "localDeg.csv", idx2layer, localDegList, degList);
    std::cout << "WRITE ENTROPY\n";

    writeMetaData(graphPath + "localDeg-info.json", timeList, maxEntropy);
    return 0;
}