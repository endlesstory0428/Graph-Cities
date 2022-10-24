#include <algorithm>
#include <assert.h>
// #include <boost/container_hash/hash.hpp>
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
#include <vector>
// #include <unordered_map>
// #include <map>

#define DEBUG 1

typedef uint32_t vSize_t;
typedef uint32_t eSize_t;
typedef uint32_t labelSize_t;

typedef uint32_t layerSize_t;
typedef uint32_t waveSize_t;
typedef uint32_t fragSize_t;

typedef std::pair<vSize_t, eSize_t> wave_ve_size;

typedef struct wccInfo
{
    waveSize_t waveIdx;
    labelSize_t wccIdx;
    vSize_t wccVSize;
    eSize_t wccESize;
    eSize_t extEdgeNum;
    eSize_t nxtEdgeNum;
    vSize_t lccIdx;
    std::string fragInfo;
} wccInfo_t;

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

void readWaveSize(const std::string &waveSizeName, std::vector<wave_ve_size> &waveSizes)
{
    std::ifstream is;
    is.open(waveSizeName);
    waveSize_t waveIdx;
    vSize_t vSize;
    eSize_t eSize;
    std::string line;
    while (std::getline(is, line))
    {
        std::replace(line.begin(), line.end(), ',', ' ');
        std::istringstream iss(line);
        assert(iss >> waveIdx >> vSize >> eSize);
        waveSizes[waveIdx].first = vSize;
        waveSizes[waveIdx].second = eSize;
    }
    is.close();
}

void readLccMap(const std::string &cclayerName, std::vector<vSize_t> &v2lcc, layerSize_t fp)
{
    std::ifstream is;
    is.open(cclayerName);
    labelSize_t v;
    vSize_t cc;
    layerSize_t layer;
    vSize_t lcc;
    std::string line;
    while (std::getline(is, line))
    {
        // std::cout << line << "\n";
        std::replace(line.begin(), line.end(), ',', ' ');
        std::istringstream iss(line);
        assert(iss >> v >> cc >> layer >> lcc);
        if (layer != fp)
        {
            continue;
        }
        else
        {
            v2lcc[v] = lcc;
        }
        // std::cout << v << "\n";
    }
    is.close();
    // std::cout << "done";
}

eSize_t generateInfoJson(const std::string &waveInfoName, std::vector<vSize_t> &v2lcc, std::vector<wave_ve_size> &waveSizes, eSize_t batchSize)
{
    std::ifstream is;
    is.open(waveInfoName);
    waveSize_t waveIdx;
    labelSize_t wccIdx;
    labelSize_t wccRepr;
    vSize_t wccVSize;
    eSize_t wccESize;
    eSize_t extEdgeNum;
    eSize_t nxtEdgeNum;
    std::string fragInfo;
    std::string line;

    std::ofstream os(waveInfoName.substr(0, waveInfoName.length() - 3) + "json");
    os << "{\n";

    wccInfo_t *buffer = new wccInfo_t[batchSize];
    eSize_t bufferCnt = 0;
    eSize_t totalCnt = 0;
    waveSize_t prevWaveIdx = 0;
    bool firstWave = true;
    while (!is.eof())
    {
        bufferCnt = 0;
        for (eSize_t i = 0; i < batchSize; ++i)
        {
            if (!std::getline(is, line))
            {
                break;
            }
            // std::cout << line << "\n";
            std::replace(line.begin(), line.end(), ',', ' ');
            // std::cout << line << "\n";
            // std::cout << line.length() << "\n";
            std::istringstream iss(line);
            assert(iss >> waveIdx >> wccIdx >> wccRepr >> wccVSize >> wccESize >> extEdgeNum >> nxtEdgeNum >> fragInfo);
            (buffer + bufferCnt)->waveIdx = waveIdx;
            (buffer + bufferCnt)->wccIdx = wccRepr;
            (buffer + bufferCnt)->wccVSize = wccVSize;
            (buffer + bufferCnt)->wccESize = wccESize;
            (buffer + bufferCnt)->extEdgeNum = extEdgeNum;
            (buffer + bufferCnt)->nxtEdgeNum = nxtEdgeNum;
            (buffer + bufferCnt)->lccIdx = v2lcc[wccRepr];
            (buffer + bufferCnt)->fragInfo = std::string(fragInfo);

            ++bufferCnt;
            if (is.eof())
            {
                break;
            }
        }

        totalCnt += bufferCnt;
        std::cout << "read wcc info" << totalCnt << "\n";

        for (eSize_t i = 0; i < bufferCnt; ++i)
        {
            wccInfo_t wccInfo = *(buffer + i);
            if (wccInfo.waveIdx != prevWaveIdx)
            {
                if (firstWave)
                {
                    os << "\"" << wccInfo.waveIdx << "\":{\n";
                    firstWave = false;
                }
                else
                {
                    os << "\t\"vertices\":" << waveSizes[prevWaveIdx].first << ","
                       << "\"edges\":" << waveSizes[prevWaveIdx].second << "},\n"
                       << "\"" << wccInfo.waveIdx << "\":{\n";
                }
                prevWaveIdx = wccInfo.waveIdx;
            }

            os << "\t\"" << wccInfo.wccIdx << "\":{\n"
               << "\t\t\"vertices\":" << wccInfo.wccVSize << ","
               << "\"edges\":" << wccInfo.wccESize << ",\n"
               << "\t\t\"extEdges\":" << wccInfo.extEdgeNum << ","
               << "\"nxtEdges\":" << wccInfo.nxtEdgeNum << ",\n"
               << "\t\t\"fragments\":{\n";

            fragSize_t fragInfoLen = (std::count(wccInfo.fragInfo.begin(), wccInfo.fragInfo.end(), '_') + 1);
            std::replace(wccInfo.fragInfo.begin(), wccInfo.fragInfo.end(), '_', ' ');
            std::vector<eSize_t> fragSizes;
            fragSizes.reserve(fragInfoLen);
            eSize_t fragSize;
            std::istringstream fragss(wccInfo.fragInfo);
            while (fragss >> fragSize)
            {
                fragSizes.push_back(fragSize);
            }
            for (fragSize_t j = 0; j < fragInfoLen / 3; ++j)
            {
                os << "\t\t\t\"" << j << "\":{"
                   << "\"sources\":" << fragSizes[j * 3] << ","
                   << "\"vertices\":" << fragSizes[j * 3 + 1] << ","
                   << "\"edges\":" << fragSizes[j * 3 + 2] << "}";
                if (j < fragInfoLen / 3 - 1)
                {
                    os << ",\n";
                }
                else
                {
                    os << "\n";
                }
            }
            os << "\t\t},\n"
               << "\t\t\"layer-cc\":" << wccInfo.lccIdx << "},\n";
        }
        std::cout << "write wcc info" << totalCnt << "\n";
    }
    os << "\t\"vertices\":" << waveSizes[prevWaveIdx].first << ","
       << "\"edges\":" << waveSizes[prevWaveIdx].second << "},\n"
       << "\"0\":{}\n}";
    is.close();
    os.close();
    delete[] buffer;

    return totalCnt;
}

eSize_t generateInfoCsv(const std::string &waveInfoName, std::vector<vSize_t> &v2lcc, std::vector<fragSize_t> &fragSizes, eSize_t batchSize)
{
    std::ifstream is;
    is.open(waveInfoName);
    waveSize_t waveIdx;
    labelSize_t wccIdx;
    labelSize_t wccRepr;
    vSize_t wccVSize;
    eSize_t wccESize;
    eSize_t extEdgeNum;
    eSize_t nxtEdgeNum;
    std::string fragInfo;
    std::string line;

    std::ofstream os(waveInfoName.substr(0, waveInfoName.length() - 4) + "-lcc.csv");

    wccInfo_t *buffer = new wccInfo_t[batchSize];
    eSize_t bufferCnt = 0;
    eSize_t totalCnt = 0;
    while (!is.eof())
    {
        bufferCnt = 0;
        for (eSize_t i = 0; i < batchSize; ++i)
        {
            if (!std::getline(is, line))
            {
                break;
            }
            // std::cout << line << "\n";
            std::replace(line.begin(), line.end(), ',', ' ');
            // std::cout << line << "\n";
            // std::cout << line.length() << "\n";
            std::istringstream iss(line);
            assert(iss >> waveIdx >> wccIdx >> wccRepr >> wccVSize >> wccESize >> extEdgeNum >> nxtEdgeNum >> fragInfo);
            (buffer + bufferCnt)->waveIdx = waveIdx;
            (buffer + bufferCnt)->wccIdx = wccRepr;
            (buffer + bufferCnt)->wccVSize = wccVSize;
            (buffer + bufferCnt)->wccESize = wccESize;
            (buffer + bufferCnt)->extEdgeNum = extEdgeNum;
            (buffer + bufferCnt)->nxtEdgeNum = nxtEdgeNum;
            (buffer + bufferCnt)->lccIdx = v2lcc[wccRepr];
            (buffer + bufferCnt)->fragInfo = std::string(fragInfo);

            fragSize_t fragSize = (std::count(fragInfo.begin(), fragInfo.end(), '_') + 1) / 3;
            if (fragSize > fragSizes[waveIdx])
            {
                fragSizes[waveIdx] = fragSize;
            }

            ++bufferCnt;
            if (is.eof())
            {
                break;
            }
        }

        totalCnt += bufferCnt;
        std::cout << "read wcc info" << totalCnt << "\n";

        for (eSize_t i = 0; i < bufferCnt; ++i)
        {
            wccInfo_t wccInfo = *(buffer + i);

            os << wccInfo.waveIdx << ","
               << wccInfo.lccIdx << ","
               << wccInfo.wccIdx << ","
               << wccInfo.wccVSize << ","
               << wccInfo.wccESize << ","
               << wccInfo.extEdgeNum << ","
               << wccInfo.nxtEdgeNum << ","
               << wccInfo.fragInfo << "\n";
        }
        std::cout << "write wcc info" << totalCnt << "\n";
    }
    is.close();
    os.close();
    delete[] buffer;

    return totalCnt;
}

void writeFragSizes(const std::string &waveSizeName, std::vector<wave_ve_size> &waveSizes, std::vector<fragSize_t> &fragSizes)
{
    std::ofstream os(waveSizeName.substr(0, waveSizeName.length() - 4) + "-frag.csv");
    for (waveSize_t i = 1; i < waveSizes.size(); ++ i) {
        os << i << "," << waveSizes[i].first << "," << waveSizes[i].second << "," << fragSizes[i] << "\n";
    }
}

void writeMetaData(const std::string &prefix, std::vector<long long> &timeList, eSize_t wccNum)
{
    std::ofstream outputFile;
    outputFile.open(prefix + "-lcc-info.json");
    outputFile << "{\n";
    outputFile << "\"wcc\":" << wccNum << ",\n";
    outputFile << "\"read-wave-size-time\":" << timeList[0] << ",\n";
    outputFile << "\"read-lcc-map-time\":" << timeList[1] << ",\n";
    outputFile << "\"write-json-time\":" << timeList[2] << ",\n";
    outputFile << "\"write-csv-time\":" << timeList[3] << "\n}";
    outputFile.close();
}

int main(int argc, char *argv[])
{
    if (argc < 7)
    {
        std::cerr
            << argv[0]
            << ": usage: ./wavelayercc "
            << "<path to cc-layers> <path to waves-info.csv> <path to waves-sizes-info.csv> "
            << "<layer> <#waves> <largest node label>\n";
        exit(1);
    }
    std::string cclayerName = argv[1];
    std::string waveInfoName = argv[2];
    std::string waveSizeName = argv[3];
    layerSize_t layer = atol(argv[4]);
    waveSize_t waveNum = atol(argv[5]);
    labelSize_t maxLabel = atol(argv[6]);
    eSize_t batchSize = argc > 7 ? atol(argv[7]) : 65536;

    std::cout << cclayerName << "\n"
              << waveInfoName << "\n"
              << waveSizeName << "\n";
    std::cout << layer << "," << waveNum << "," << maxLabel << "," << batchSize << "\n";

    std::vector<long long> timeList;
    reset();

    std::vector<wave_ve_size> waveSizes(waveNum + 1);
    readWaveSize(waveSizeName, waveSizes);
    std::cout << "READ SIZE\n";
    timeList.push_back(getTimeElapsed());
    reset();

    std::vector<vSize_t> v2lcc(maxLabel + 1);
    readLccMap(cclayerName, v2lcc, layer);
    std::cout << "READ LCC MAP\n";
    timeList.push_back(getTimeElapsed());
    reset();

    eSize_t wccNum1 = generateInfoJson(waveInfoName, v2lcc, waveSizes, batchSize);
    std::cout << "WRITE JSON\n";
    timeList.push_back(getTimeElapsed());
    reset();

    std::vector<fragSize_t> fragSizes(waveNum + 1);
    eSize_t wccNum2 = generateInfoCsv(waveInfoName, v2lcc, fragSizes, batchSize);
    assert(wccNum1 == wccNum2);
    std::cout << "WRITE WCC CSV\n";
    writeFragSizes(waveSizeName, waveSizes, fragSizes);
    std::cout << "WRITE SIZE CSV\n";
    timeList.push_back(getTimeElapsed());
    reset();

    writeMetaData(waveInfoName.substr(0, waveInfoName.length() - 4), timeList, wccNum1);
}
