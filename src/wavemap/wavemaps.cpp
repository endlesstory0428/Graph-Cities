#include <algorithm>
#include <assert.h>
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
#define LNULL ((uint32_t)-1)

typedef uint32_t vSize_t;
typedef uint32_t eSize_t;
typedef uint32_t labelSize_t;

typedef uint32_t layerSize_t;
typedef uint32_t waveSize_t;
typedef uint32_t fragSize_t;

typedef uint32_t wavemapSize_t;

typedef struct wavemapIdx
{
    layerSize_t layer;
    labelSize_t lcc;
    layerSize_t buckLayer;
    labelSize_t buckLcc;
} wavemapIdx_t;

class lcc_info
{
public:
    lcc_info(void);
    // ~lcc_info();
    void resizeFragVec(fragSize_t fragSize);
    void addWaveInfo(vSize_t v, eSize_t e, eSize_t ext, eSize_t nxt);
    void addFragInfo(vSize_t src, fragSize_t fragIdx);
    void addFragInfo(vSize_t src, fragSize_t fragIdx, eSize_t frag);
    vSize_t vSize;
    eSize_t eSize;
    vSize_t srcSize;
    vSize_t sumSrcSize;
    layerSize_t cloneSize;
    eSize_t extEdgeSize;
    eSize_t nxtEdgeSize;
    std::vector<eSize_t> fragEdgeSize;
};

lcc_info::lcc_info(void)
{
    vSize = 0;
    eSize = 0;
    srcSize = 0;
    sumSrcSize = 0;
    cloneSize = 0;
    extEdgeSize = 0;
    nxtEdgeSize = 0;
}

// lcc_info::~lcc_info()
// {
//     std::cout << "destruct\n";
// }

void lcc_info::resizeFragVec(fragSize_t fragSize)
{
    if (fragEdgeSize.size() < fragSize)
    {
        fragEdgeSize.resize(fragSize);
    }
}

void lcc_info::addWaveInfo(vSize_t v, eSize_t e, eSize_t ext, eSize_t nxt)
{
    vSize += v;
    eSize += e;
    // srcSize += src;
    extEdgeSize += ext;
    nxtEdgeSize += nxt;
    // std::cout << "add to" << vSize << "," << eSize << "," << extEdgeSize << "," << nxtEdgeSize << "\n";
}

void lcc_info::addFragInfo(vSize_t src, fragSize_t fragIdx)
{
    sumSrcSize += src;
    if (fragIdx == 0)
    {
        srcSize += src;
    }
}
void lcc_info::addFragInfo(vSize_t src, fragSize_t fragIdx, eSize_t frag)
{
    sumSrcSize += src;
    if (fragIdx == 0)
    {
        srcSize += src;
    }
    fragEdgeSize[fragIdx] += frag;
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

void readWavemapList(const std::string &fileName, std::vector<wavemapIdx_t> &wavemapList, std::vector<wavemapSize_t> &stopIdx)
{
    std::ifstream is;

    layerSize_t layer, buckLayer;
    labelSize_t lcc, buckLcc;
    layerSize_t prevLayer = 0;
    wavemapSize_t lineIdx = 0;
    std::string line;

    is.open(fileName);
    while (std::getline(is, line))
    {
        // std::cout << line << "\n";
        std::replace(line.begin(), line.end(), ',', ' ');
        std::istringstream iss(line);
        assert(iss >> layer >> lcc >> buckLayer >> buckLcc);
        if (prevLayer != layer)
        {
            prevLayer = layer;
            stopIdx.push_back(lineIdx);
        }
        wavemapList.push_back({layer, lcc, buckLayer, buckLcc});
        ++lineIdx;
    }
    stopIdx.push_back(lineIdx);
    is.close();
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

void readFragSize(const std::string &fileName, std::vector<fragSize_t> &w2fSize)
{
    std::ifstream is;
    waveSize_t waveIdx;
    vSize_t vSize;
    eSize_t eSize;
    fragSize_t fragSize;
    std::string line;

    w2fSize.push_back(0);

    is.open(fileName);
    while (std::getline(is, line))
    {
        // std::cout << line << "\n";
        std::replace(line.begin(), line.end(), ',', ' ');
        std::istringstream iss(line);
        assert(iss >> waveIdx >> vSize >> eSize >> fragSize);
        w2fSize.push_back(fragSize);
    }
    is.close();
}

void readWccInfo(const std::string &fileName, std::vector<wavemapSize_t> &lcc2idx, std::vector<fragSize_t> &w2fSize,
                 std::vector<wavemapSize_t> &wcc2lccIdx, std::vector<std::vector<lcc_info>> &info)
{
    std::ifstream is;
    is.open(fileName);
    waveSize_t waveIdx;
    labelSize_t lcc;
    labelSize_t wcc;
    vSize_t wccVSize;
    eSize_t wccESize;
    eSize_t extEdgeNum;
    eSize_t nxtEdgeNum;
    std::string fragInfo;
    std::string line;

    eSize_t totalCnt = 0;
    wavemapSize_t lccIdx;
    lcc_info* lccInfo;
    while (std::getline(is, line))
    {
        std::replace(line.begin(), line.end(), ',', ' ');
        std::istringstream iss(line);
        assert(iss >> waveIdx >> lcc >> wcc >> wccVSize >> wccESize >> extEdgeNum >> nxtEdgeNum >> fragInfo);
        lccIdx = lcc2idx[lcc];
        if (lccIdx == LNULL)
        {
            continue;
        }
        wcc2lccIdx[wcc] = lccIdx;
        lccInfo = &info[lccIdx][waveIdx];
        // std::cout << lccIdx << "lcc\n";
        lccInfo -> resizeFragVec(w2fSize[waveIdx]);
        lccInfo -> addWaveInfo(wccVSize, wccESize, extEdgeNum, nxtEdgeNum);

        fragSize_t fragInfoLen = (std::count(fragInfo.begin(), fragInfo.end(), '_') + 1);
        std::replace(fragInfo.begin(), fragInfo.end(), '_', ' ');
        std::vector<eSize_t> fragSizes;
        fragSizes.reserve(fragInfoLen);
        eSize_t fragSize;
        std::istringstream fragss(fragInfo);
        while (fragss >> fragSize)
        {
            fragSizes.push_back(fragSize);
        }
        for (fragSize_t j = 0; j < fragInfoLen / 3; ++j)
        {
            lccInfo -> addFragInfo(fragSizes[j * 3], j, fragSizes[j * 3 + 2]);
        }
    }
    is.close();
}

void readWaveEdges(const std::string &fileName, std::vector<wavemapSize_t> &wcc2lccIdx, std::vector<wavemapSize_t> &v2lccIdx)
{
    std::ifstream is;
    labelSize_t src;
    labelSize_t tgt;
    waveSize_t waveIdx;
    labelSize_t wcc;
    fragSize_t fragIdx;
    std::string line;

    wavemapSize_t lccIdx;

    is.open(fileName);
    while (std::getline(is, line))
    {
        // std::cout << line << "\n";
        std::replace(line.begin(), line.end(), ',', ' ');
        std::istringstream iss(line);
        assert(iss >> src >> tgt >> waveIdx >> wcc >> fragIdx);
        lccIdx = wcc2lccIdx[wcc];
        if (lccIdx == LNULL)
        {
            continue;
        }
        // std::cout << "set v2lcc";
        v2lccIdx[src] = lccIdx;
        // v2lccIdx[tgt] = lccIdx; // no need to assign because of bi-directional edges. tgt will become src.
    }
    is.close();
}

void readWaveSrc(const std::string &fileName, std::vector<wavemapSize_t> &v2lccIdx, std::vector<layerSize_t> &v2clone, std::vector<std::vector<lcc_info>> &info)
{
    std::ifstream is;
    labelSize_t v;
    waveSize_t waveIdx;
    fragSize_t fragIdx;
    std::string line;

    wavemapSize_t lccIdx;

    is.open(fileName);
    while (std::getline(is, line))
    {
        // std::cout << line << "\n";
        std::replace(line.begin(), line.end(), ',', ' ');
        std::istringstream iss(line);
        assert(iss >> v >> waveIdx >> fragIdx);
        lccIdx = v2lccIdx[v];
        if (lccIdx == LNULL)
        {
            continue;
        }
        // std::cout << "add clone\n";
        info[lccIdx][waveIdx].cloneSize += v2clone[v];
    }
    is.close();
}

void writeWavemap(const std::string &fileName, std::vector<lcc_info> &info)
{
    lcc_info lccInfo;
    bool firstFlag = true;
    bool fragFirstFlag = true;
    std::ofstream os(fileName);
    os << "{\n";
    for (waveSize_t waveIdx = 1; waveIdx < info.size(); ++waveIdx)
    {
        lccInfo = info[waveIdx];
        if (lccInfo.eSize == 0) {
            break;
        }
        if (firstFlag) {
            firstFlag = false;
        }
        else {
            os << "},\n";
        }
        fragFirstFlag = true;
        os << "\"" << waveIdx << "\":{\n";
        os << "\t\"s\":" << lccInfo.srcSize << ",\n"
           << "\t\"ss\":" << lccInfo.sumSrcSize << ",\n"
           << "\t\"t\":" << lccInfo.vSize - lccInfo.srcSize << ",\n"
           << "\t\"c\":" << lccInfo.cloneSize << ",\n"
           << "\t\"ie\":" << lccInfo.eSize - lccInfo.extEdgeSize << ",\n"
           << "\t\"ee\":" << lccInfo.extEdgeSize << ",\n"
           << "\t\"f\":[\n\t\t";
        for (auto &fragESize : lccInfo.fragEdgeSize) {
            if (fragESize == 0) {
                break;
            }
            if (fragFirstFlag) {
                fragFirstFlag = false;
            }
            else {
                os << ",";
            }
            os << fragESize;
        }
        os << "],\n";
        os << "\t\"e->w" << waveIdx + 1 << "\":" << lccInfo.nxtEdgeSize << "\n";
    }
    os << "}}";
    os.close();
}

void writeMetaData(std::string prefix, std::vector<long long> &timeList, wavemapSize_t wavemapNum)
{
    std::ofstream outputFile;
    outputFile.open(prefix + "-wavemaps-info.json");
    outputFile << "{\n";
    outputFile << "\"wavemaps\":" << wavemapNum << ",\n";
    outputFile << "\"read-clones-time\":" << timeList[0] << ",\n";
    outputFile << "\"init-wavemap-time\":" << timeList[1] << ",\n";
    outputFile << "\"read-wavemap-time\":" << timeList[2] << ",\n";
    outputFile << "\"map-clones-time\":" << timeList[3] << ",\n";
    outputFile << "\"write-wavemap-time\":" << timeList[4] << "\n}";
    outputFile.close();
}

int main(int argc, char *argv[])
{
    if (argc < 7)
    {
        std::cerr
            << argv[0]
            << ": usage: ./wavemaps "
            << "<graph name> <path to graph folder> <path to graph_waves folder>"
            << "<max label> <wavemap numbers> <number of fp>";
        exit(1);
    }

    std::string graphName = argv[1];
    std::string graphPath = argv[2];
    std::string wavePath = argv[3];

    labelSize_t maxLabel = atol(argv[4]);
    wavemapSize_t wavemapNum = atol(argv[5]);
    layerSize_t layerNum = atol(argv[6]);

    std::cout << maxLabel << "," << wavemapNum << "," << layerNum << "\n";

    std::vector<wavemapIdx_t> wavemapList;
    wavemapList.reserve(wavemapNum);
    std::vector<wavemapSize_t> stopIdx;
    stopIdx.reserve(layerNum + 1); // +1 for the first 0

    readWavemapList(graphPath + "wavemapList.l-lcc-buck.csv", wavemapList, stopIdx);
    reset();

    std::vector<long long> timeList(5);

    std::vector<layerSize_t> v2clone(maxLabel + 1);
    readClones(graphPath + "cloneCnt.csv", v2clone);
    std::cout << "READ CLONES\n";
    timeList[0] += getTimeElapsed();
    reset();

    std::vector<wavemapSize_t> lcc2idx(maxLabel + 1, LNULL);
    wavemapSize_t lccIdx = 1;
    std::vector<fragSize_t> w2fSize;
    std::vector<wavemapSize_t> wcc2lccIdx(maxLabel + 1, LNULL);
    std::vector<wavemapSize_t> v2lccIdx(maxLabel + 1, LNULL);

    wavemapSize_t lineIdx = 0;
    wavemapSize_t startIdx = 0;
    layerSize_t tempLayer = 0;
    bool firstFlag = true;
    for (auto &tempLayerStop : stopIdx)
    {
        if (firstFlag) {
            firstFlag = false;
            continue;
        }
        tempLayer = wavemapList[lineIdx].layer;
        std::cout << "start layer" << tempLayer << "\n";
        memset(&lcc2idx[0], LNULL, lcc2idx.size() * sizeof(lcc2idx[0]));
        lccIdx = 1;
        w2fSize.clear();
        memset(&wcc2lccIdx[0], LNULL, wcc2lccIdx.size() * sizeof(wcc2lccIdx[0]));
        memset(&v2lccIdx[0], LNULL, v2lccIdx.size() * sizeof(v2lccIdx[0]));

        startIdx = lineIdx;
        std::cout << "start layer" << tempLayer << "\n";
        for (; lineIdx < tempLayerStop; ++lineIdx)
        {
            wavemapIdx_t wavemapIdx = wavemapList[lineIdx];
            // std::cout << wavemapIdx.layer << "," << wavemapIdx.lcc << "," << wavemapIdx.buckLayer << "," << wavemapIdx.buckLcc << "\n";
            lcc2idx[wavemapIdx.lcc] = lccIdx;
            lccIdx++;
        }

        readFragSize(wavePath + "layer-" + std::to_string(tempLayer) + "-waves-size-info-frag.csv", w2fSize);
        std::vector<std::vector<lcc_info>> info(lccIdx, std::vector<lcc_info>(w2fSize.size()));
        std::cout << "INIT SIZES\n";
        timeList[1] += getTimeElapsed();
        reset();

        readWccInfo(wavePath + "layer-" + std::to_string(tempLayer) + "-waves-info-lcc.csv", lcc2idx, w2fSize, wcc2lccIdx, info);
        std::cout << "READ INFO\n";
        timeList[2] += getTimeElapsed();
        reset();

        //only for clone numbers
        readWaveEdges(wavePath + "layer-" + std::to_string(tempLayer) + "-waves.csv", wcc2lccIdx, v2lccIdx);
        std::cout << "MAP VERTICES\n";
        readWaveSrc(wavePath + "layer-" + std::to_string(tempLayer) + "-wave-sources.csv", v2lccIdx, v2clone, info);
        std::cout << "ADD CLONES\n";
        timeList[3] += getTimeElapsed();
        reset();

        for (wavemapSize_t i = startIdx; i < tempLayerStop; ++ i) {
            std::string wavemapName;
            if (wavemapList[i].buckLayer == 0) {
                wavemapName = "wavemap_" + std::to_string(wavemapList[i].layer) + "_" + std::to_string(wavemapList[i].lcc) + "_" + std::to_string(wavemapList[i].buckLcc) + ".json";
            } else {
                wavemapName = "wavemap_" + std::to_string(wavemapList[i].buckLayer) + "_" + std::to_string(wavemapList[i].buckLcc) + "_" + std::to_string(wavemapList[i].layer) + "_" + std::to_string(wavemapList[i].lcc) + ".json";
            }
            // std::cout << lcc2idx[wavemapList[i].lcc] << "\n";
            writeWavemap(wavePath + wavemapName, info[lcc2idx[wavemapList[i].lcc]]);
        }
        timeList[4] += getTimeElapsed();
        reset();

        std::cout << "finish layer" << tempLayer << "\n";
    }

    writeMetaData(graphPath + graphName, timeList, wavemapNum);

    return 0;
}