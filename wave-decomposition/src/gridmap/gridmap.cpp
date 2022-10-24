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
typedef uint32_t eSize_t;
typedef uint32_t labelSize_t;

typedef uint32_t layerSize_t;
typedef uint32_t waveSize_t;
typedef uint16_t bucketSize_t;

typedef uint32_t lccSize_t;

typedef std::pair<layerSize_t, labelSize_t> lcc_t;
typedef std::unordered_map<lcc_t, lccSize_t, boost::hash<lcc_t>> lcc2idx_t;

typedef std::pair<vSize_t, eSize_t> v_e_t;
typedef std::pair<vSize_t, v_e_t> src_v_e_t;
typedef std::vector<src_v_e_t> lcc_wave_t;

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

void readLccInfo(const std::string &prefix, const std::vector<layerSize_t> &layerList, const std::vector<eSize_t> &buckSizes,
                 lcc2idx_t &lcc2idx, std::vector<lcc_t> &idx2lcc, std::vector<layerSize_t> &layer2idx,
                 std::vector<bucketSize_t> &lccIdx2bucket, std::vector<v_e_t> &lccIdx2size, std::vector<lccSize_t> &buck2lccNum,
                 std::vector<std::vector<std::pair<v_e_t, v_e_t>>> &buckLayer2minmaxSize,
                 std::vector<lccSize_t> &buck2lcc1Num,
                 std::vector<std::vector<lccSize_t>> &buckLayer2lccNum)
{
    vSize_t vSize;
    eSize_t eSize;
    labelSize_t cc;
    labelSize_t layercc;

    lcc_t lcc;
    bucketSize_t buckIdx = SNULL;
    lccSize_t lccIdx = 1;
    layerSize_t layerIdx;

    std::ifstream is;
    std::string line;

    for (auto &layer : layerList)
    {
        std::cout << "layer" << layer << "\n";
        is.open(prefix + std::to_string(layer) + ".cc-info.cc-v-e");
        layerIdx = layer2idx[layer];
        while (std::getline(is, line))
        {
            // std::cout << line << "\n";
            std::replace(line.begin(), line.end(), ',', ' ');
            std::istringstream iss(line);
            assert(iss >> layercc >> cc >> vSize >> eSize);
            lcc = std::make_pair(layer, layercc);
            lcc2idx[lcc] = lccIdx;
            idx2lcc[lccIdx] = lcc;
            lccIdx2size[lccIdx] = std::make_pair(vSize, eSize);
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
            ++lccIdx;

            if (layer == 1)
            {
                ++buck2lcc1Num[buckIdx];
            }
            ++buckLayer2lccNum[buckIdx][layerIdx];

            if (eSize > buckLayer2minmaxSize[buckIdx][layerIdx].second.second || (eSize == buckLayer2minmaxSize[buckIdx][layerIdx].second.second && vSize > buckLayer2minmaxSize[buckIdx][layerIdx].second.first))
            {
                // std::cout << "update:" << buckIdx << "," << layercc << "\n";
                // std::cout << "prev max:" << buckLayer2minmaxSize[buckIdx][layerIdx].second.first << "," << buckLayer2minmaxSize[buckIdx][layerIdx].second.second << "\n";
                buckLayer2minmaxSize[buckIdx][layerIdx].second.first = vSize;
                buckLayer2minmaxSize[buckIdx][layerIdx].second.second = eSize;
                // std::cout << "temp max:" << buckLayer2minmaxSize[buckIdx][layerIdx].second.first << "," << buckLayer2minmaxSize[buckIdx][layerIdx].second.second << "\n";
            }
            if (eSize < buckLayer2minmaxSize[buckIdx][layerIdx].first.second || (eSize == buckLayer2minmaxSize[buckIdx][layerIdx].first.second && vSize < buckLayer2minmaxSize[buckIdx][layerIdx].first.first))
            {
                // std::cout << "update:" << buckIdx << "," << layercc << "\n";
                // std::cout << "prev min:" << buckLayer2minmaxSize[buckIdx][layerIdx].first.first << "," << buckLayer2minmaxSize[buckIdx][layerIdx].first.second << "\n";
                buckLayer2minmaxSize[buckIdx][layerIdx].first.first = vSize;
                buckLayer2minmaxSize[buckIdx][layerIdx].first.second = eSize;
                // std::cout << "temp min:" << buckLayer2minmaxSize[buckIdx][layerIdx].first.first << "," << buckLayer2minmaxSize[buckIdx][layerIdx].first.second << "\n";
            }
        }
        is.close();
    }
}

void readWccInfo(const std::string &prefix, const std::vector<layerSize_t> &layerList, lcc2idx_t &lcc2idx,
                 std::vector<bucketSize_t> &lccIdx2bucket, std::vector<lccSize_t> &buck2lcc1Num,
                 std::vector<layerSize_t> &layer2idx, std::vector<waveSize_t> &layerIdx2wave,
                 boost::dynamic_bitset<> &seen, std::vector<lcc_wave_t> &lccIdx2waveSize)
{
    waveSize_t waveIdx;
    labelSize_t layercc;
    labelSize_t wcc;
    vSize_t wccVSize;
    eSize_t wccESize;
    eSize_t extEdgeNum;
    eSize_t nxtEdgeNum;
    std::string fragInfo;

    lcc_t lcc;
    lccSize_t lccIdx;
    vSize_t wccSrcSize;
    layerSize_t layerIdx;

    std::ifstream is;
    std::string line;

    for (auto &layer : layerList)
    {
        std::cout << "layer" << layer << "\n";
        // if (layer == 1)
        // {
        //     continue;
        // }
        is.open(prefix + std::to_string(layer) + "-waves-info-lcc.csv");
        layerIdx = layer2idx[layer];
        while (std::getline(is, line))
        {
            // std::cout << line << "\n";
            std::replace(line.begin(), line.end(), ',', ' ');
            std::istringstream iss(line);
            assert(iss >> waveIdx >> layercc >> wcc >> wccVSize >> wccESize >> extEdgeNum >> nxtEdgeNum >> fragInfo);
            lcc = std::make_pair(layer, layercc);
            lccIdx = lcc2idx[lcc];

            if (layer == 1 && buck2lcc1Num[lccIdx2bucket[lccIdx]] > 1)
            {
                continue; // multiple layer1, use summary only
            }

            if (seen[lccIdx] == 0)
            {
                lccIdx2waveSize[lccIdx].resize(layerIdx2wave[layerIdx] + 1);
                seen[lccIdx] == 1;
            }
            // std::cout << layerIdx2wave[layer2idx[layer]] + 1 << "\n";
            // std::cout << lccIdx << "," << waveIdx << "," << lccIdx2waveSize.size() << "," << lccIdx2waveSize[lccIdx].size() << "\n";

            wccSrcSize = atol(fragInfo.substr(0, fragInfo.find_first_of('_')).c_str());
            lccIdx2waveSize[lccIdx][waveIdx].first += wccSrcSize;
            lccIdx2waveSize[lccIdx][waveIdx].second.first += wccVSize;
            lccIdx2waveSize[lccIdx][waveIdx].second.second += wccESize;
        }
        is.close();
    }
}

void writeMapJson(const std::string &fileName, const std::vector<eSize_t> &buckSizes,
                  const std::vector<lccSize_t> &buck2lccNum, const std::vector<lccSize_t> &buck2lcc1Num,
                  std::vector<lcc_t> &idx2lcc,
                  std::vector<bucketSize_t> &lccIdx2bucket, std::vector<v_e_t> &lccIdx2size,
                  std::vector<std::vector<std::pair<v_e_t, v_e_t>>> &buckLayer2minmaxSize,
                  std::vector<lcc_wave_t> &lccIdx2waveSize,
                  std::vector<layerSize_t> &idx2layer,
                  std::vector<std::vector<lccSize_t>> &buckLayer2lccNum, std::vector<layerSize_t> &layer2idx)
{
    lcc_t lcc;
    layerSize_t layer, prevLayer;
    lcc_wave_t lccWaveInfo;
    lccSize_t layer1Num = 0;
    vSize_t layer1VSize = 0;
    eSize_t layer1ESize = 0;

    std::ofstream os(fileName);
    os << "{\n";
    bool firstFlag = true;
    bool peelFirstFlag = true;
    // bool lccFirstFlag = true;
    bool waveFirstFlag = true;
    assert(buck2lccNum[buckSizes.size() - 1] == 0);
    for (bucketSize_t buck = 0; buck < buckSizes.size() - 1; ++buck)
    {
        if (firstFlag)
        {
            firstFlag = false;
        }
        else
        {
            os << ",\n"; // append to prev
        }
        peelFirstFlag = true;
        prevLayer = LNULL;
        if (buck2lccNum[buck] == 0)
        {
            os << "\"" << buck << "\":{"
               << "\"threshold\":" << buckSizes[buck] << ","
               << "\"count\":" << buck2lccNum[buck];
            // // end of bucket
            os << "}";
            continue;
        }
        os << "\"" << buck << "\":{\"peel\":{\n";
        for (lccSize_t lccIdx = 1; lccIdx < lccIdx2bucket.size(); ++lccIdx)
        {
            if (lccIdx2bucket[lccIdx] != buck)
            {
                continue;
            }
            lcc = idx2lcc[lccIdx];
            layer = lcc.first;
            if (layer != prevLayer)
            {
                // lccFirstFlag = true;
                if (peelFirstFlag)
                {
                    peelFirstFlag = false;
                }
                else
                {
                    if (prevLayer == 1)
                    {
                        if (buck2lcc1Num[buck] > 1)
                        {
                            assert(layer1Num == buck2lcc1Num[buck]);
                            os << "],\n" // end of lccList.lccList
                               << "\t\t\t\"vertices\":" << layer1VSize << ",\"edges\":" << layer1ESize << ","
                               << "\"layer\":1,\"count\":" << layer1Num << ",\"single\": false";
                            os << "\t\t}]\n"; // end of lccList
                            os << "\t},\n";   // end of peel.entry, append to prev
                        }
                        else
                        {
                            os << "\t\t]\n"; // end of lccList
                            os << "\t},\n";  // end of peel.entry, append to prev
                        }
                    }
                    else
                    {
                        os << "\t\t]\n"; // end of lccList
                        os << "\t},\n";  // end of peel.entry, append to prev
                    }
                }
                prevLayer = layer;
                // // minmaxSize, then lccList
                os << "\t\"" << layer << "\":{\n"
                   << "\t\t\"maxSize\":[" << buckLayer2minmaxSize[buck][layer2idx[layer]].second.second << "," << buckLayer2minmaxSize[buck][layer2idx[layer]].second.first << "],"
                   << "\"minSize\":[" << buckLayer2minmaxSize[buck][layer2idx[layer]].first.second << "," << buckLayer2minmaxSize[buck][layer2idx[layer]].first.first << "],\n"
                   << "\t\t\"lccList\":[\n";

                if (layer == 1 && buck2lcc1Num[buck] != 1)
                {
                    assert(buck2lcc1Num[buck] > 1);
                    layer1Num = 0;
                    layer1ESize = 0;
                    layer1VSize = 0;
                    os << "\t\t\t{\"lccList\":[";
                }
            }
            else
            {
                if (layer == 1)
                {
                    os << ","; // append to prev
                }
                else
                {
                    os << ",\n"; // append to prev
                }
            }

            // // lccList.entry
            if (layer == 1)
            {
                if (buck2lcc1Num[buck] > 1)
                {
                    os << lcc.second;
                    ++layer1Num;
                    layer1VSize += lccIdx2size[lccIdx].first;
                    layer1ESize += lccIdx2size[lccIdx].second;
                }
                else
                {
                    waveFirstFlag = true;
                    os << "\t\t\t{\"lcc\":" << lcc.second << ",\n"
                       << "\t\t\t\"vertices\":" << lccIdx2size[lccIdx].first << ",\"edges\":" << lccIdx2size[lccIdx].second << ",\n"
                       //    << "\t\t\t\"layer\":1,\"count\":1,\"single\":true,\n"
                       << "\t\t\t\"single\":true,\n"
                       << "\t\t\t\"waves\":{\n";

                    // // waves
                    lccWaveInfo = lccIdx2waveSize[lccIdx];
                    for (waveSize_t waveIdx = 1; waveIdx < lccWaveInfo.size(); ++waveIdx)
                    {
                        if (lccWaveInfo[waveIdx].first == 0)
                        {
                            break; // end of lcc
                        }
                        if (waveFirstFlag)
                        {
                            waveFirstFlag = false;
                        }
                        else
                        {
                            os << ",\n"; // append to prev wave
                        }
                        os << "\t\t\t\t\"" << waveIdx << "\":{"
                           << "\"vertices\":" << lccWaveInfo[waveIdx].second.first << ","
                           << "\"edges\":" << lccWaveInfo[waveIdx].second.second << ","
                           << "\"source\":" << lccWaveInfo[waveIdx].first << "}";
                    }
                    // // end of waves
                    os << "}\n";

                    // // end of lccList.entry
                    os << "\t\t\t}\n";
                }
            }
            else
            {
                waveFirstFlag = true;
                os << "\t\t\t{\"lcc\":" << lcc.second << ",\n"
                   << "\t\t\t\"vertices\":" << lccIdx2size[lccIdx].first << ",\"edges\":" << lccIdx2size[lccIdx].second << ",\n"
                   << "\t\t\t\"waves\":{\n";

                if (MINIMAL == 1 && buckLayer2lccNum[buck][layer2idx[layer]] > 1)
                {
                    // // skip wave details
                }
                else
                {
                    // // waves
                    lccWaveInfo = lccIdx2waveSize[lccIdx];
                    // std::cout << lccWaveInfo.size() << "," << lcc.first << "," << lcc.second << "\n";
                    // if (lcc.second == 18764) {
                    //     std::cout << lcc.first << "," << lccWaveInfo.size();
                    // }
                    for (waveSize_t waveIdx = 1; waveIdx < lccWaveInfo.size(); ++waveIdx)
                    {
                        if (lccWaveInfo[waveIdx].first == 0)
                        {
                            break; // end of lcc
                        }
                        if (waveFirstFlag)
                        {
                            waveFirstFlag = false;
                        }
                        else
                        {
                            os << ",\n"; // append to prev wave
                        }
                        os << "\t\t\t\t\"" << waveIdx << "\":{"
                           << "\"vertices\":" << lccWaveInfo[waveIdx].second.first << ","
                           << "\"edges\":" << lccWaveInfo[waveIdx].second.second << ","
                           << "\"source\":" << lccWaveInfo[waveIdx].first << "}";
                    }
                }
                // // end of waves
                os << "}\n";

                // // end of lccList.entry
                os << "\t\t\t}\n";
            }
        }
        if (prevLayer == 1)
        {
            if (buck2lcc1Num[buck] > 1)
            {
                assert(layer1Num == buck2lcc1Num[buck]);
                os << "],\n" // end of lccList.lccList
                   << "\t\t\t\"vertices\":" << layer1VSize << ",\"edges\":" << layer1ESize << ","
                   << "\"layer\":1,\"count\":" << layer1Num << ",\"single\": false";
                os << "}]}\n";
            }
            else
            {
                os << "\t\t]\n"; // end of lccList
                os << "\t}\n";   // end of peel.entry
            }
        }
        else
        {
            os << "\t\t]\n"; // end of lccList
            os << "\t}\n";   // end of peel.entry
        }

        os << "\t},\n"; // end of peel

        // // threshold, count
        os << "\t\"threshold\":" << buckSizes[buck] << ","
           << "\"count\":" << buck2lccNum[buck];
        // // end of bucket
        os << "}";
    }

    os << ",\n";
    os << "\"layers\":[";
    for (layerSize_t layerIdx = idx2layer.size() - 1; layerIdx > 0; --layerIdx)
    {
        os << idx2layer[layerIdx];
        if (layerIdx > 1)
        {
            os << ",";
        }
    }
    os << "],\n";

    os << "\"buckets\":[";
    for (layerSize_t buck = 0; buck < buckSizes.size(); ++buck)
    {
        os << buckSizes[buck];
        if (buck < buckSizes.size() - 1)
        {
            os << ",";
        }
    }
    os << "]\n";
    // end of gridmap
    os << "}";
    os.close();
}

void writeMinMapJson(const std::string &fileName, const std::vector<eSize_t> &buckSizes,
                     const std::vector<lccSize_t> &buck2lccNum, const std::vector<lccSize_t> &buck2lcc1Num,
                     std::vector<lcc_t> &idx2lcc,
                     std::vector<bucketSize_t> &lccIdx2bucket, std::vector<v_e_t> &lccIdx2size,
                     std::vector<std::vector<std::pair<v_e_t, v_e_t>>> &buckLayer2minmaxSize,
                     std::vector<lcc_wave_t> &lccIdx2waveSize,
                     std::vector<layerSize_t> &idx2layer,
                     std::vector<std::vector<lccSize_t>> &buckLayer2lccNum, std::vector<layerSize_t> &layer2idx)
{
    lcc_t lcc;
    layerSize_t layer, prevLayer;
    lcc_wave_t lccWaveInfo;
    lccSize_t layer1Num = 0;
    vSize_t layer1VSize = 0;
    eSize_t layer1ESize = 0;

    std::ofstream os(fileName);
    os << "{\n";
    bool firstFlag = true;
    bool peelFirstFlag = true;
    // bool lccFirstFlag = true;
    bool waveFirstFlag = true;
    assert(buck2lccNum[buckSizes.size() - 1] == 0);
    for (bucketSize_t buck = 0; buck < buckSizes.size() - 1; ++buck)
    {
        if (firstFlag)
        {
            firstFlag = false;
        }
        else
        {
            os << ",\n"; // append to prev
        }
        peelFirstFlag = true;
        prevLayer = LNULL;
        if (buck2lccNum[buck] == 0)
        {
            os << "\"" << buck << "\":{"
               << "\"threshold\":" << buckSizes[buck] << ","
               << "\"count\":" << buck2lccNum[buck];
            // // end of bucket
            os << "}";
            continue;
        }
        os << "\"" << buck << "\":{\"peel\":{\n";
        for (lccSize_t lccIdx = 1; lccIdx < lccIdx2bucket.size(); ++lccIdx)
        {
            if (lccIdx2bucket[lccIdx] != buck)
            {
                continue;
            }
            lcc = idx2lcc[lccIdx];
            layer = lcc.first;
            if (layer != prevLayer)
            {
                // lccFirstFlag = true;
                if (peelFirstFlag)
                {
                    peelFirstFlag = false;
                }
                else
                {
                    if (true)
                    {
                        if (buckLayer2lccNum[buck][layer2idx[prevLayer]] > 1)
                        {
                            // std::cout << prevLayer << "," << layer1Num << "," << buckLayer2lccNum[buck][layer2idx[prevLayer]] << "\n";
                            assert(layer1Num == buckLayer2lccNum[buck][layer2idx[prevLayer]]);
                            os << "],\n" // end of lccList.lccList
                               << "\t\t\t\"vertices\":" << layer1VSize << ",\"edges\":" << layer1ESize << ","
                               << "\"layer\":" << prevLayer << ",\"count\":" << layer1Num << ",\"single\": false";
                            os << "\t\t}]\n"; // end of lccList
                            os << "\t},\n";   // end of peel.entry, append to prev
                        }
                        else
                        {
                            os << "\t\t]\n"; // end of lccList
                            os << "\t},\n";  // end of peel.entry, append to prev
                        }
                    }
                    // else
                    // {
                    //     os << "\t\t]\n"; // end of lccList
                    //     os << "\t},\n";  // end of peel.entry, append to prev
                    // }
                }
                prevLayer = layer;
                // // minmaxSize, then lccList
                os << "\t\"" << layer << "\":{\n"
                   << "\t\t\"maxSize\":[" << buckLayer2minmaxSize[buck][layer2idx[layer]].second.second << "," << buckLayer2minmaxSize[buck][layer2idx[layer]].second.first << "],"
                   << "\"minSize\":[" << buckLayer2minmaxSize[buck][layer2idx[layer]].first.second << "," << buckLayer2minmaxSize[buck][layer2idx[layer]].first.first << "],\n"
                   << "\t\t\"lccList\":[\n";

                if (buckLayer2lccNum[buck][layer2idx[layer]] != 1)
                {
                    // std::cout << "reset\n";
                    assert(buckLayer2lccNum[buck][layer2idx[layer]] > 1);
                    layer1Num = 0;
                    layer1ESize = 0;
                    layer1VSize = 0;
                    os << "\t\t\t{\"lccList\":[";
                }
            }
            else
            {
                if (true)
                {
                    if (MINIMAL >= 3) {
                        // skip lccIdx
                    } else {
                        os << ","; // append to prev
                    }
                }
                // else
                // {
                //     os << ",\n"; // append to prev
                // }
            }

            // // lccList.entry
            if (true)
            {
                if (buckLayer2lccNum[buck][layer2idx[layer]] > 1)
                {
                    if(MINIMAL >= 3) {
                        // skip lccIdx
                    } else {
                        os << lcc.second;
                    }
                    ++layer1Num;
                    layer1VSize += lccIdx2size[lccIdx].first;
                    layer1ESize += lccIdx2size[lccIdx].second;
                }
                else
                {
                    waveFirstFlag = true;
                    os << "\t\t\t{\"lcc\":" << lcc.second << ",\n"
                       << "\t\t\t\"vertices\":" << lccIdx2size[lccIdx].first << ",\"edges\":" << lccIdx2size[lccIdx].second << ",\n"
                       //    << "\t\t\t\"layer\":1,\"count\":1,\"single\":true,\n"
                       << "\t\t\t\"single\":true,\n"
                       << "\t\t\t\"waves\":{\n";

                    // // waves
                    lccWaveInfo = lccIdx2waveSize[lccIdx];
                    for (waveSize_t waveIdx = 1; waveIdx < lccWaveInfo.size(); ++waveIdx)
                    {
                        if (lccWaveInfo[waveIdx].first == 0)
                        {
                            break; // end of lcc
                        }
                        if (waveFirstFlag)
                        {
                            waveFirstFlag = false;
                        }
                        else
                        {
                            os << ",\n"; // append to prev wave
                        }
                        os << "\t\t\t\t\"" << waveIdx << "\":{"
                           << "\"vertices\":" << lccWaveInfo[waveIdx].second.first << ","
                           << "\"edges\":" << lccWaveInfo[waveIdx].second.second << ","
                           << "\"source\":" << lccWaveInfo[waveIdx].first << "}";
                    }
                    // // end of waves
                    os << "}\n";

                    // // end of lccList.entry
                    os << "\t\t\t}\n";
                }
            }
            // else
            // {
            //     waveFirstFlag = true;
            //     os << "\t\t\t{\"lcc\":" << lcc.second << ",\n"
            //        << "\t\t\t\"vertices\":" << lccIdx2size[lccIdx].first << ",\"edges\":" << lccIdx2size[lccIdx].second << ",\n"
            //        << "\t\t\t\"waves\":{\n";

            //     if (MINIMAL == 1 && buckLayer2lccNum[buck][layer2idx[layer]] > 1)
            //     {
            //         // // skip wave details
            //     }
            //     else
            //     {
            //         // // waves
            //         lccWaveInfo = lccIdx2waveSize[lccIdx];
            //         // std::cout << lccWaveInfo.size() << "," << lcc.first << "," << lcc.second << "\n";
            //         // if (lcc.second == 18764) {
            //         //     std::cout << lcc.first << "," << lccWaveInfo.size();
            //         // }
            //         for (waveSize_t waveIdx = 1; waveIdx < lccWaveInfo.size(); ++waveIdx)
            //         {
            //             if (lccWaveInfo[waveIdx].first == 0)
            //             {
            //                 break; // end of lcc
            //             }
            //             if (waveFirstFlag)
            //             {
            //                 waveFirstFlag = false;
            //             }
            //             else
            //             {
            //                 os << ",\n"; // append to prev wave
            //             }
            //             os << "\t\t\t\t\"" << waveIdx << "\":{"
            //                << "\"vertices\":" << lccWaveInfo[waveIdx].second.first << ","
            //                << "\"edges\":" << lccWaveInfo[waveIdx].second.second << ","
            //                << "\"source\":" << lccWaveInfo[waveIdx].first << "}";
            //         }
            //     }
            //     // // end of waves
            //     os << "}\n";

            //     // // end of lccList.entry
            //     os << "\t\t\t}\n";
            // }
        }
        if (true)
        {
            if (buckLayer2lccNum[buck][layer2idx[prevLayer]] > 1)
            {
                assert(layer1Num == buckLayer2lccNum[buck][layer2idx[prevLayer]]);
                os << "],\n" // end of lccList.lccList
                   << "\t\t\t\"vertices\":" << layer1VSize << ",\"edges\":" << layer1ESize << ","
                   << "\"layer\":" << prevLayer << ",\"count\":" << layer1Num << ",\"single\": false";
                os << "}]}\n";
            }
            else
            {
                os << "\t\t]\n"; // end of lccList
                os << "\t}\n";   // end of peel.entry
            }
        }
        // else
        // {
        //     os << "\t\t]\n"; // end of lccList
        //     os << "\t}\n";   // end of peel.entry
        // }

        os << "\t},\n"; // end of peel

        // // threshold, count
        os << "\t\"threshold\":" << buckSizes[buck] << ","
           << "\"count\":" << buck2lccNum[buck];
        // // end of bucket
        os << "}";
    }

    os << ",\n";
    os << "\"layers\":[";
    for (layerSize_t layerIdx = idx2layer.size() - 1; layerIdx > 0; --layerIdx)
    {
        os << idx2layer[layerIdx];
        if (layerIdx > 1)
        {
            os << ",";
        }
    }
    os << "],\n";

    os << "\"buckets\":[";
    for (layerSize_t buck = 0; buck < buckSizes.size(); ++buck)
    {
        os << buckSizes[buck];
        if (buck < buckSizes.size() - 1)
        {
            os << ",";
        }
    }
    os << "]\n";
    // end of gridmap
    os << "}";
    os.close();
}

void writeMap(const std::string &fileName, std::vector<lcc_t> idx2lcc, std::vector<bucketSize_t> lccIdx2bucket)
{
    std::ofstream os(fileName);
    for (lccSize_t i = 1; i < idx2lcc.size(); ++i)
    {
        os << idx2lcc[i].first << "," << idx2lcc[i].second << "," << lccIdx2bucket[i] << "\n";
    }
    os.close();
}

void writeMetaData(std::string prefix, std::vector<long long> &timeList, lccSize_t lccNum)
{
    std::ofstream outputFile;
    outputFile.open(prefix + "-gridmap-info.json");
    outputFile << "{\n";
    outputFile << "\"lcc-number\":" << lccNum << ",\n";
    outputFile << "\"read-lcc-time\":" << timeList[0] << ",\n";
    outputFile << "\"read-wcc-time\":" << timeList[1] << ",\n";
    outputFile << "\"write-json-time\":" << timeList[2] << ",\n";
    outputFile << "\"write-map-time\":" << timeList[3] << "\n}";
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
    for (layerSize_t i = 1; i <= layerNum; ++i)
    {
        layerIdx2wave[i] = atol(argv[7 + layerNum + i]);
    }
    for (layerSize_t i = 1; i <= layerNum; ++i)
    {
        std::cout << idx2layer[i] << "," << layerIdx2wave[i] << "\n";
    }
    for (layerSize_t i = 7 + 2 * layerNum + 1; i < argc; ++i)
    {
        buckSizes.push_back(atol(argv[i]));
    }
    for (auto buckSize : buckSizes)
    {
        std::cout << buckSize << "\n";
    }

    lcc2idx_t lcc2idx;
    lcc2idx.reserve(lccNum + 1);
    std::vector<lcc_t> idx2lcc(lccNum + 1);
    std::vector<bucketSize_t> lccIdx2bucket(lccNum + 1);
    std::vector<v_e_t> lccIdx2size(lccNum + 1, {0, 0});
    std::vector<lccSize_t> buck2lccNum(buckSizes.size());
    std::vector<lccSize_t> buck2lcc1Num(buckSizes.size());
    std::vector<std::vector<std::pair<v_e_t, v_e_t>>> buckLayer2minmaxSize(buckSizes.size(), std::vector<std::pair<v_e_t, v_e_t>>(layerNum + 1, std::make_pair(std::make_pair(LNULL, LNULL), std::make_pair(0, 0))));

    std::vector<std::vector<lccSize_t>> buckLayer2lccNum(buckSizes.size(), std::vector<lccSize_t>(layerNum + 1));

    std::vector<long long> timeList;
    reset();

    readLccInfo(layerPath + "layer-", idx2layer, buckSizes, lcc2idx, idx2lcc, layer2idx,
                lccIdx2bucket, lccIdx2size, buck2lccNum, buckLayer2minmaxSize, buck2lcc1Num,
                buckLayer2lccNum);
    std::cout << "READ LCC\n";
    timeList.push_back(getTimeElapsed());
    reset();

    boost::dynamic_bitset<> seen((lccNum + 1));
    std::vector<lcc_wave_t> lccIdx2waveSize(lccNum + 1);

    readWccInfo(wavePath + "layer-", idx2layer, lcc2idx, lccIdx2bucket, buck2lcc1Num,
                layer2idx, layerIdx2wave, seen, lccIdx2waveSize);
    std::cout << "READ WCC\n";
    timeList.push_back(getTimeElapsed());
    reset();

    if (MINIMAL < 2)
    {
        writeMapJson(graphPath + graphName + "-lccWaves.vBuck.b.p.mm.json", buckSizes, buck2lccNum, buck2lcc1Num, idx2lcc,
                     lccIdx2bucket, lccIdx2size, buckLayer2minmaxSize, lccIdx2waveSize,
                     idx2layer,
                     buckLayer2lccNum, layer2idx);
    }
    else
    {
        writeMinMapJson(graphPath + graphName + "-lccWaves.vBuck.b.p.mm.json", buckSizes, buck2lccNum, buck2lcc1Num, idx2lcc,
                        lccIdx2bucket, lccIdx2size, buckLayer2minmaxSize, lccIdx2waveSize,
                        idx2layer,
                        buckLayer2lccNum, layer2idx);
    }
    std::cout << "WRITE JSON\n";
    timeList.push_back(getTimeElapsed());
    reset();

    writeMap(graphPath + graphName + "-lccBuck.l-lcc-b.csv", idx2lcc, lccIdx2bucket);
    std::cout << "WRITE MAP\n";
    timeList.push_back(getTimeElapsed());
    reset();

    writeMetaData(graphPath + graphName, timeList, lccNum);

    return 0;
}