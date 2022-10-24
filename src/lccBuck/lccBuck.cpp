#include <algorithm>
#include <assert.h>
// #include <boost/container_hash/hash.hpp>
#include <boost/functional/hash.hpp>
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

#define MINIMAL 3

#define DEBUG 1
#define LNULL ((uint32_t)-1)
#define SNULL ((uint16_t)-1)

typedef uint32_t vSize_t;
typedef uint64_t eSize_t;
typedef uint32_t labelSize_t;

typedef uint32_t layerSize_t;
typedef uint32_t waveSize_t;
typedef uint32_t fragSize_t;
typedef uint16_t bucketSize_t;

typedef uint32_t lccSize_t;

// typedef std::pair<layerSize_t, labelSize_t> lcc_t;
// typedef std::unordered_map<lcc_t, lccSize_t, boost::hash<lcc_t>> lcc2idx_t;
typedef labelSize_t lcc_t;
typedef std::vector<lccSize_t> lcc2idx_t;

typedef std::pair<vSize_t, eSize_t> v_e_t;
typedef std::pair<vSize_t, v_e_t> src_v_e_t;
typedef std::vector<src_v_e_t> lcc_wave_t;

typedef struct edges
{
    vSize_t src;
    vSize_t tgt;
    waveSize_t wave;
    labelSize_t wcc;
    fragSize_t frag;
} wave_edge_t;

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

lccSize_t readLccInfo(const std::string &fileName, const layerSize_t layer, const std::vector<eSize_t> &buckSizes,
                      lcc2idx_t &lcc2idx, std::vector<lcc_t> &idx2lcc,
                      std::vector<bucketSize_t> &lccIdx2bucket, std::vector<lccSize_t> &buck2lccNum, std::vector<eSize_t> &buck2ESize)
{
    vSize_t vSize;
    eSize_t eSize;
    labelSize_t cc;
    lcc_t lcc;

    bucketSize_t buckIdx = SNULL;
    lccSize_t lccIdx = 1;

    std::ifstream is;
    std::string line;

    std::cout << "LCC: layer" << layer << "\n";
    is.open(fileName);
    while (std::getline(is, line))
    {
        // std::cout << line << "\n";
        std::replace(line.begin(), line.end(), ',', ' ');
        std::istringstream iss(line);
        assert(iss >> lcc >> cc >> vSize >> eSize);

        lcc2idx[lcc] = lccIdx;
        idx2lcc[lccIdx] = lcc;
        buckIdx = SNULL;
        for (bucketSize_t i = 0; i < buckSizes.size(); ++i)
        {
            if (eSize < buckSizes[i])
            {
                buckIdx = i - 1;
                break;
            }
        }
        assert(buckIdx != SNULL);
        lccIdx2bucket[lccIdx] = buckIdx;
        ++buck2lccNum[buckIdx];
        buck2ESize[buckIdx] += eSize;
        ++lccIdx;

        ++buck2lccNum[buckIdx];
    }
    is.close();
    return lccIdx;
}

void readWccInfo(const std::string &fileName, const layerSize_t layer, lcc2idx_t &lcc2idx,
                 std::vector<lccSize_t> &wcc2lccIdx)
{
    waveSize_t waveIdx;
    lcc_t lcc;
    labelSize_t wcc;
    vSize_t wccVSize;
    eSize_t wccESize;
    eSize_t extEdgeNum;
    eSize_t nxtEdgeNum;
    std::string fragInfo;

    lccSize_t lccIdx;

    std::ifstream is;
    std::string line;

    std::cout << "WCC: layer" << layer << "\n";

    is.open(fileName);
    while (std::getline(is, line))
    {
        // std::cout << line << "\n";
        std::replace(line.begin(), line.end(), ',', ' ');
        std::istringstream iss(line);
        assert(iss >> waveIdx >> lcc >> wcc >> wccVSize >> wccESize >> extEdgeNum >> nxtEdgeNum >> fragInfo);
        lccIdx = lcc2idx[lcc];

        wcc2lccIdx[wcc] = lccIdx;
    }
    is.close();
}

void readWaveEdges(const std::string &fileName, const layerSize_t layer, std::vector<lccSize_t> &wcc2lccIdx, std::vector<bucketSize_t> &lccIdx2bucket,
                   std::vector<std::vector<wave_edge_t>> &buckEdges)
{
    std::ifstream is;
    labelSize_t src;
    labelSize_t tgt;
    waveSize_t waveIdx;
    labelSize_t wcc;
    fragSize_t fragIdx;
    std::string line;

    std::cout << "WAVE: layer" << layer << "\n";

    bucketSize_t buck;

    is.open(fileName);
    while (std::getline(is, line))
    {
        // std::cout << line << "\n";
        std::replace(line.begin(), line.end(), ',', ' ');
        std::istringstream iss(line);
        assert(iss >> src >> tgt >> waveIdx >> wcc >> fragIdx);
        buck = lccIdx2bucket[wcc2lccIdx[wcc]];
        buckEdges[buck].push_back({src, tgt, waveIdx, wcc, fragIdx});
    }
    is.close();
}

void writeWaveEdges(const std::string &fileName, const std::vector<wave_edge_t> edges) {
    std::ofstream os(fileName);
    for (auto &wave_edge : edges) {
        os << wave_edge.src << "," << wave_edge.tgt << "," << wave_edge.wave << "," << wave_edge.wcc << "," << wave_edge.frag << "\n";
    }
    os.close();
}

void writeWcc2Lcc(const std::string &fileName, const std::vector<lccSize_t> &wcc2lccIdx, const std::vector<lcc_t> &idx2lcc) {
    std::ofstream os(fileName);
    for (labelSize_t wcc = 0; wcc < wcc2lccIdx.size(); ++ wcc) {
        if (wcc2lccIdx[wcc] != 0) {
            os << wcc << "," << idx2lcc[wcc2lccIdx[wcc]] << "\n";
        }
    }
    os.close();
}

void writeMetaData(std::string prefix, std::vector<long long> &timeList, lccSize_t layerLccSize, eSize_t edgeNum)
{
    std::ofstream outputFile;
    outputFile.open(prefix + "-lccBuck-info.json");
    outputFile << "{\n";
    outputFile << "\"edges\":" << edgeNum << ",\n";
    outputFile << "\"lcc-numbers\":" << layerLccSize << ",\n";
    outputFile << "\"read-lcc-time\":" << timeList[0] << ",\n";
    outputFile << "\"read-wcc-time\":" << timeList[1] << ",\n";
    outputFile << "\"read-wave-time\":" << timeList[2] << ",\n";
    outputFile << "\"write-wcc2lcc-time\":" << timeList[3] << ",\n";
    outputFile << "\"write-wave-time\":" << timeList[4] << "\n}";
    outputFile.close();
}

int main(int argc, char *argv[])
{
    if (argc < 8)
    {
        std::cerr
            << argv[0]
            << ": usage: ./wavemaps "
            << "<graph name> <path to graph folder> <path to graph_layers folder> <path to graph_waves folder>"
            << "<max label> <number of lcc> <number of fp>";
        exit(1);
    }

    std::string graphName = argv[1];
    std::string graphPath = argv[2];
    std::string layerPath = argv[3];
    std::string wavePath = argv[4];

    labelSize_t maxLabel = atol(argv[5]);
    lccSize_t lccNum = atol(argv[6]);
    layerSize_t layerNum = atol(argv[7]);

    layerSize_t maxLayer = atol(argv[7 + layerNum]);

    std::cout << maxLabel << "," << lccNum << "," << layerNum << "," << maxLayer << "\n";

    std::vector<layerSize_t> idx2layer(layerNum + 1);
    std::vector<layerSize_t> layer2idx(maxLayer + 1);
    std::vector<waveSize_t> layerIdx2wave(layerNum + 1);
    std::vector<eSize_t> buckSizes;
    for (layerSize_t i = 1; i <= layerNum; ++i)
    {
        layerSize_t tempLayer = atol(argv[7 + i]);
        std::cout << tempLayer << "\n";
        idx2layer[i] = tempLayer;
        layer2idx[tempLayer] = i;
    }
    for (layerSize_t i = 7 + layerNum + 1; i < argc; ++i)
    {
        buckSizes.push_back(atol(argv[i]));
    }
    for (auto buckSize : buckSizes)
    {
        std::cout << buckSize << "\n";
    }

    lcc2idx_t lcc2idx(maxLabel + 1);
    std::vector<lcc_t> idx2lcc(lccNum + 1);
    std::vector<bucketSize_t> lccIdx2bucket(lccNum + 1);
    std::vector<lccSize_t> buck2lccNum(buckSizes.size());
    std::vector<eSize_t> buck2ESize(buckSizes.size());
    std::vector<lccSize_t> wcc2lccIdx(maxLabel + 1);

    eSize_t totalEdgeNum = 0;

    for (auto &layer : idx2layer)
    {
        if (layer == 0) {
            continue;
        }
        memset(&buck2lccNum[0], 0, buck2lccNum.size() * sizeof(buck2lccNum[0]));
        memset(&buck2ESize[0], 0, buck2ESize.size() * sizeof(buck2ESize[0]));
        memset(&wcc2lccIdx[0], 0, wcc2lccIdx.size() * sizeof(wcc2lccIdx[0]));


        std::vector<long long> timeList;
        reset();

        lccSize_t layerLccSize = readLccInfo(layerPath + "layer-" + std::to_string(layer) + ".cc-info.cc-v-e", layer, buckSizes, lcc2idx, idx2lcc,
                                             lccIdx2bucket, buck2lccNum, buck2ESize);
        std::cout << "READ LCC\n";
        timeList.push_back(getTimeElapsed());
        reset();

        readWccInfo(wavePath + "layer-" + std::to_string(layer) + "-waves-info-lcc.csv", layer, lcc2idx, wcc2lccIdx);
        std::cout << "READ WCC\n";
        timeList.push_back(getTimeElapsed());
        reset();

        std::vector<std::vector<wave_edge_t>> buckEdges(buckSizes.size());
        for (bucketSize_t buck = 0; buck < buckSizes.size() - 1; ++buck)
        {
            buckEdges.reserve(2 * buck2ESize[buck] + 1);
        }

        readWaveEdges(wavePath + "layer-" + std::to_string(layer) + "-waves.csv", layer, wcc2lccIdx, lccIdx2bucket, buckEdges);
        std::cout << "READ WAVE\n";
        timeList.push_back(getTimeElapsed());
        reset();

        writeWcc2Lcc(wavePath + "/lccBuck/layer-" + std::to_string(layer) + "-buck" + ".wcc-lcc", wcc2lccIdx, idx2lcc);
        std::cout << "WRITE MAP\n";
        timeList.push_back(getTimeElapsed());
        reset();

        eSize_t edgeNum = 0;
        for (bucketSize_t buck = 0; buck < buckSizes.size() - 1; ++buck)
        {
            assert(buckEdges[buck].size() == 2 * buck2ESize[buck]);
            if (buck2ESize[buck] == 0) {
                continue;
            }
            edgeNum += buck2ESize[buck];
            writeWaveEdges(wavePath + "/lccBuck/layer-" + std::to_string(layer) + "-waves-buck" + std::to_string(buck) + ".csv", buckEdges[buck]);
        }
        totalEdgeNum += edgeNum;
        std::cout << "WRITE WAVE" << totalEdgeNum << "(+" << edgeNum << ")\n";
        timeList.push_back(getTimeElapsed());
        reset();

        writeMetaData(wavePath + "/lccBuck/layer-" + std::to_string(layer), timeList, layerLccSize, edgeNum);
    }

    return 0;
}