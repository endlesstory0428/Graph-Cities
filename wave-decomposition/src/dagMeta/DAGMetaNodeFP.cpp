#include <algorithm>
#include <assert.h>
#include <boost/lambda/lambda.hpp>
#include <boost/pending/disjoint_sets.hpp>
#include <ctype.h>
#include <fstream>
#include <iostream>
#include <iterator>
#include <map>
#include <nlohmann/json.hpp>
#include <sstream>
#include <string>
#include <thread>
#include <unordered_map>
#include <boost/functional/hash.hpp>
#include <boost/range/algorithm/count.hpp>
#include <chrono>
#include <atomic>

#include <sys/time.h>

#define SPANONLY 0    // 0: full, 1: span
#define FRAGDAGONLY 0 // 0: wave and frag, 1: frag
#define DEBUG 1

#define TH_LARGENODE ((unsigned int)1 << 20)

using namespace std;
using json = nlohmann::json;

typedef uint32_t e_size_type;
typedef uint32_t v_size_type;
typedef uint32_t label_size_type;

typedef vector<vector<bool>> wwcc_check_type;
typedef vector<vector<v_size_type>> wf2level_type;
typedef pair<v_size_type, v_size_type> wf_type;

typedef boost::disjoint_sets<v_size_type *, v_size_type *> ds_type;
typedef pair<v_size_type, v_size_type> edge_type;
typedef vector<edge_type> edge_list_type;

typedef vector<bool> v_check_type;

typedef unordered_map<edge_type, e_size_type, boost::hash<edge_type>> edge_weight_map_type;

// e_size_type edgeProcessed = 0;
// vector<long long> times(10, 0);

long long currentTimeMilliS = 0;

long long currentTimeStamp()
{
    struct timeval te;
    gettimeofday(&te, NULL); // get current time
    long long milliseconds =
        te.tv_sec * 1000LL + te.tv_usec / 1000; // calculate milliseconds
    // long long milliseconds = 0;
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

int fill_wwccs(string csv_name, vector<bool> &wwccs, v_size_type lcc)
{
    ifstream csv_stream(csv_name);
    string line, frags;
    v_size_type wave_index, wcc, new_lcc, _;
    v_size_type max_wave = 0;

    while (getline(csv_stream, line))
    {
        replace(line.begin(), line.end(), ',', ' ');
        stringstream line_stream(line);
        line_stream >> wave_index >> new_lcc >> wcc >> _ >> _ >> _ >> _ >> frags;
        // if (new_lcc != lcc)
        //     continue;
        wwccs[wcc] = true;
        max_wave = wave_index;
    }

    return max_wave;
}

void fill_local2wave_frag(
    vector<v_size_type> &v2local,
    vector<label_size_type> &local2v,
    vector<wf_type> &local2wf,
    string wave_sources,
    vector<v_size_type> &local2wave,
    vector<v_size_type> &local2frag)
{
    ifstream ws_stream(wave_sources);
    // string line, v, wave, frag;
    string line;
    v_size_type v, wave, frag;

    while (getline(ws_stream, line))
    {
        replace(line.begin(), line.end(), ',', ' ');
        stringstream line_stream(line);
        line_stream >> v >> wave >> frag;

        // if (DEBUG >= 1)
        // {
        //     times[3] += getTimeElapsed();
        //     reset();
        // }

        if (v2local.size() <= v)
            v2local.resize(v * 2);

        /*
        Question (vector resize): is this faster and safer than
            if (v2local.size() <= v_idx) v2local.resize(v_idx * 2);
        */

        v2local[v] = local2v.size();
        local2v.push_back(v);
        // cout << wave << endl;
        // cout << level[wave].size() << " " << frag << endl;
        // local2level.push_back(level[wave][frag]);
        local2wave.push_back(wave);
        local2frag.push_back(frag);
        if (0 == FRAGDAGONLY)
        {
            local2wf.push_back({wave, frag});
        }

        // if (DEBUG >= 1)
        // {
        //     times[4] += getTimeElapsed();
        //     reset();
        // }
    }
}

void populate_ds(
    vector<bool> &wwccs,
    ds_type &ds,
    ds_type &waveDs,
    vector<v_size_type> &v2local,
    vector<label_size_type> &local2v,
    vector<wf_type> &local2wf,
    edge_list_type &edges,
    string wave_csv,
    vector<v_size_type> &wave2frags,
    e_size_type &edgeProcessed,
    label_size_type &maxLabel)
{
    v_check_type seen(local2v.size());

    ifstream w_stream(wave_csv);
    // string line, src_str, tgt_str, wave_str, wcc_str, frag_str;
    string line;
    v_size_type src, tgt, wave, wcc, frag;

    while (getline(w_stream, line))
    {
        replace(line.begin(), line.end(), ',', ' ');
        stringstream line_stream(line);

        /*getline(line_stream, src_str, ',');
        getline(line_stream, tgt_str, ',');
        getline(line_stream, wave_str, ',');
        getline(line_stream, wcc_str, ',');
        getline(line_stream, frag_str, ',');*/
        line_stream >> src >> tgt >> wave >> wcc >> frag;
        /*
        Question (parse lines): same as above
        */

        /*v_size_type src = stoi(src_str), tgt = stoi(tgt_str),
                    wave = stoi(wave_str), wcc = stoi(wcc_str);*/

        // if (DEBUG >= 1)
        // {
        //     times[5] += getTimeElapsed();
        //     reset();
        // }

        // if (!wwccs[wcc])
        //     continue;
        
        maxLabel = max(maxLabel, src);
        if (local2wf[v2local[src]].first == wave){
            wave2frags[wave] = max(wave2frags[wave], local2wf[v2local[src]].second);
        }
        // reversed edge, will double count, so skip
        if (local2wf[v2local[src]] > local2wf[v2local[tgt]] || (local2wf[v2local[src]] == local2wf[v2local[tgt]] && src > tgt))
            continue;

        edgeProcessed++;

        if (!seen[v2local[src]])
        {
            ds.make_set(v2local[src]);
            if (0 == FRAGDAGONLY)
            {
                waveDs.make_set(v2local[src]);
            }
        }
        if (!seen[v2local[tgt]])
        {
            ds.make_set(v2local[tgt]);
            if (0 == FRAGDAGONLY)
            {
                waveDs.make_set(v2local[tgt]);
            }
        }

        seen[v2local[src]] = true;
        seen[v2local[tgt]] = true;
        if (1 == SPANONLY)
        {
            if (1 == FRAGDAGONLY)
            {
                /*if (local2level[v2local[src]] + 1 == local2level[v2local[tgt]]
                    || local2level[v2local[src]] == local2level[v2local[tgt]]) {
                    edges.push_back({v2local[src], v2local[tgt]});
                }*/
                exit(-1);
            }
            else if (0 == FRAGDAGONLY)
            {
                if (local2wf[v2local[src]].first == local2wf[v2local[tgt]].first || (local2wf[v2local[src]].first + 1 == local2wf[v2local[tgt]].first && local2wf[v2local[tgt]].second == 0))
                {
                    edges.push_back({v2local[src], v2local[tgt]});
                }
            }
        }
        else if (0 == SPANONLY)
        {
            edges.push_back({v2local[src], v2local[tgt]});
        }

        if (0 == FRAGDAGONLY)
        {
            if (local2wf[v2local[src]].first != local2wf[v2local[tgt]].first)
                continue;
            v_size_type waveU = waveDs.find_set(v2local[src]), waveV = waveDs.find_set(v2local[tgt]);
            if (waveU != waveV)
                waveDs.link(waveU, waveV);
        }

        if (local2wf[v2local[src]] != local2wf[v2local[tgt]])
            continue;
        v_size_type u = ds.find_set(v2local[src]), v = ds.find_set(v2local[tgt]);
        if (u != v)
            ds.link(u, v);
        /*
        TODO (directly get number of cc):
            v_size_type num_cc = num_v;
            if (u != v) {
                ds.link(u, v)
                num_cc --;
            }
        then you can directly use num_cc in fill_set2node without set2node reallocate
        */

        // if (DEBUG >= 1)
        // {
        //     times[6] += getTimeElapsed();
        //     reset();
        // }
    }
}

void fill_level(wf2level_type &level, vector<v_size_type> &wave2frags, wf2level_type &wf2nodeNum, wf2level_type &wf2linkNum)
{
    int prev_level = 1;

    for (int wave = 1; wave < wave2frags.size(); wave++)
    {
        cout << wave << "," << prev_level << "," << wave2frags[wave] << "\n";
        level[wave].resize(wave2frags[wave] + 1);
        wf2nodeNum[wave].resize(wave2frags[wave] + 1);
        wf2linkNum[wave].resize(wave2frags[wave] + 1);

        for (int frag = 0; frag <= wave2frags[wave]; frag++)
        {
            level[wave][frag] = prev_level + frag;
            // cout << "level" << wave << "," << frag << "," << level[wave][frag] << "\n";
        }

        prev_level += wave2frags[wave] + 1;
    }
}

void fill_local2level(
    vector<v_size_type> &local2wave,
    vector<v_size_type> &local2frag,
    wf2level_type &level,
    vector<v_size_type> &local2level)
{
    for (int local = 0; local < local2wave.size(); local++)
    {
        if (local2wave[local] >= level.size())
            continue;
        if (local2frag[local] >= level[local2wave[local]].size())
            continue;
        local2level[local] = level[local2wave[local]][local2frag[local]];
        // cout << "local2level" << local << "," << local2wave[local] << "," << local2frag[local] << "," << local2level[local] << "\n";
    }
}

void fill_set2node(
    ds_type &ds,
    vector<v_size_type> &set2node,
    vector<v_size_type> &node2set,
    v_size_type num_v)
{
    v_check_type seen(num_v);

    for (v_size_type i = 0; i < num_v; i++)
    {
        if (seen[ds.find_set(i)])
            continue;
        else
        {
            set2node[ds.find_set(i)] = node2set.size();
            node2set.push_back(ds.find_set(i));
            /*
            TODO (directly get number of cc): see above
            */
        }
        seen[ds.find_set(i)] = true;
    }
}

void count_in_nodes(
    vector<v_size_type> &local2level,
    ds_type &ds,
    ds_type &waveDs,
    edge_list_type &edges,
    vector<v_size_type> &set2node,
    vector<v_size_type> &node2set,
    vector<std::atomic<v_size_type>> &node2num_v,
    vector<std::atomic<e_size_type>> &node2num_e,
    edge_weight_map_type &nodes2num_e,
    vector<v_size_type> &set2waveNode,
    vector<v_size_type> &waveNode2set,
    vector<std::atomic<v_size_type>> &waveNode2num_v,
    vector<std::atomic<e_size_type>> &waveNode2num_e,
    edge_weight_map_type &waveNodes2num_e,
    vector<std::atomic<char>> &seen,
    v_size_type num_v)
{
    for (edge_type edge : edges)
    {
        v_size_type src_local = edge.first, tgt_local = edge.second;
        v_size_type src_node = set2node[ds.find_set(src_local)], tgt_node = set2node[ds.find_set(tgt_local)];
        v_size_type src_waveNode = set2waveNode[waveDs.find_set(src_local)], tgt_waveNode = set2waveNode[waveDs.find_set(tgt_local)];

        if (!seen[src_local])
        {
            node2num_v[src_node]++;
            if (0 == FRAGDAGONLY)
            {
                waveNode2num_v[src_waveNode]++;
            }
            seen[src_local]++;
        }
        if (!seen[tgt_local])
        {
            node2num_v[tgt_node]++;
            if (0 == FRAGDAGONLY)
            {
                waveNode2num_v[tgt_waveNode]++;
            }
            seen[tgt_local]++;
        }

        if (1 == SPANONLY)
        {
            if (1 == FRAGDAGONLY)
            {
                if (src_node == tgt_node)
                    node2num_e[src_node]++;
                else
                    nodes2num_e[{src_node, tgt_node}]++;
            }
            else if (0 == FRAGDAGONLY)
            {
                // contains more edges than fragment spanning edges, need filter
                if (local2level[src_local] == local2level[tgt_local] || local2level[src_local] + 1 == local2level[tgt_local])
                {
                    if (src_node == tgt_node)
                        node2num_e[src_node]++;
                    else
                        nodes2num_e[{src_node, tgt_node}]++;
                }

                if (src_waveNode == tgt_waveNode)
                    waveNode2num_e[src_waveNode]++;
                else
                    waveNodes2num_e[{src_waveNode, tgt_waveNode}]++;
            }
        }
        else if (0 == SPANONLY)
        {
            if (src_node == tgt_node)
                node2num_e[src_node]++;
            else
                nodes2num_e[{src_node, tgt_node}]++;
            if (0 == FRAGDAGONLY)
            {
                if (src_waveNode == tgt_waveNode)
                    waveNode2num_e[src_waveNode]++;
                else
                    waveNodes2num_e[{src_waveNode, tgt_waveNode}]++;
            }
        }
    }
}

// void fill_node2verts(
//     json &nodes,
//     vector<vector<v_size_type>> &node2verts,
//     vector<std::atomic<v_size_type>> &node2num_v,
//     vector<std::atomic<v_size_type>> &node2num_e,
//     vector<v_size_type> &local2level,
//     vector<v_size_type> &local2wave,
//     vector<v_size_type> &local2frag,
//     ds_type &ds,
//     vector<v_size_type> &set2node,
//     vector<v_size_type> &node2set,
//     vector<v_size_type> &local2v,
//     edge_weight_map_type &nodes2num_e,
//     string output_file)
// {
//     for (int i = 0; i < local2v.size(); i++)
//     {
//         node2verts[set2node[ds.find_set(i)]].push_back(local2v[i]);
//     }

//     for (int i = 0; i < node2set.size(); i++)
//     {
//         if (node2num_v[i] == 0)
//             continue;
//         string v_str = to_string(local2v[node2set[i]]);
//         nodes["nodes"][v_str]["set"] = local2level[node2set[i]];
//         nodes["nodes"][v_str]["wave"] = local2wave[node2set[i]];
//         nodes["nodes"][v_str]["frag"] = local2frag[node2set[i]];
//         nodes["nodes"][v_str]["vertices"] = node2verts[i];
//         nodes["nodes"][v_str]["num_vertices"] = node2num_v[i].load();
//         nodes["nodes"][v_str]["num_edges"] = node2num_e[i].load() * 2;
//     }

//     for (const auto &kv : nodes2num_e)
//     {
//         nodes["edges"][to_string(local2v[node2set[kv.first.first]]) + "-" + to_string(local2v[node2set[kv.first.second]])] = kv.second;
//     }

//     ofstream o(output_file);

//     o << std::setw(4) << nodes << endl;
// }

void fill_node2verts(
    // json &nodes,
    vector<vector<v_size_type>> &node2verts,
    vector<std::atomic<v_size_type>> &node2num_v,
    vector<std::atomic<v_size_type>> &node2num_e,
    vector<v_size_type> &local2level,
    vector<v_size_type> &local2wave,
    vector<v_size_type> &local2frag,
    ds_type &ds,
    vector<v_size_type> &set2node,
    vector<v_size_type> &node2set,
    vector<v_size_type> &local2v,
    edge_weight_map_type &nodes2num_e,
    const string &output_file_prefix,
    wf2level_type &wf2nodeNum,
    wf2level_type &wf2linkNum,
    v_size_type &spanLinkNum,
    v_size_type &nodeNum,
    label_size_type &maxNodeLabel,
    v_size_type &verts)
{
    ofstream o;

    o.open(output_file_prefix + ".vmap");
    // std::cout << output_file_prefix + ".vmap" << "\n";
    for (int i = 0; i < local2v.size(); i++)
    {
        if (node2num_v[set2node[ds.find_set(i)]] == 0) {
            continue;
        }
        ++ verts;
        o << local2v[ds.find_set(i)] << "," << local2v[i] << "\n";
        // node2verts[set2node[ds.find_set(i)]].push_back(local2v[i]);
    }
    o.close();

    // v_size_type spanLinkNum = 0;
    v_size_type srcLocal, tgtLocal;
    o.open(output_file_prefix + ".link");
    for (const auto &kv : nodes2num_e)
    {
        srcLocal = node2set[kv.first.first];
        tgtLocal = node2set[kv.first.second];
        if (local2level[srcLocal] + 1 != local2level[tgtLocal]) {
            continue;
        }
        ++ spanLinkNum;
        ++ wf2linkNum[local2wave[srcLocal]][local2frag[srcLocal]];
        o << local2v[srcLocal] << "," << local2v[tgtLocal] << "," << kv.second << "\n";
        // nodes["edges"][to_string(local2v[node2set[kv.first.first]]) + "-" + to_string(local2v[node2set[kv.first.second]])] = kv.second;
    }
    o.close();

    o.open(output_file_prefix + ".link.jump");
    for (const auto &kv : nodes2num_e)
    {
        srcLocal = node2set[kv.first.first];
        tgtLocal = node2set[kv.first.second];
        if (local2level[srcLocal] + 1 == local2level[tgtLocal]) {
            continue;
        }
        // ++ wf2linkNum[local2wave[srcLocal]][local2frag[srcLocal]];
        o << local2v[srcLocal] << "," << local2v[tgtLocal] << "," << kv.second << "\n";
        // nodes["edges"][to_string(local2v[node2set[kv.first.first]]) + "-" + to_string(local2v[node2set[kv.first.second]])] = kv.second;
    }
    o.close();

    o.open(output_file_prefix + ".node");
    vector<v_size_type> largeNodes;
    // v_size_type nodeNum = 0;
    v_size_type vLocal;
    for (int i = 0; i < node2set.size(); i++)
    {
        if (node2num_v[i] == 0)
            continue;
        ++ nodeNum;
        vLocal = node2set[i];
        maxNodeLabel = max(maxNodeLabel, local2v[vLocal]);
        ++ wf2nodeNum[local2wave[vLocal]][local2frag[vLocal]];
        o << local2v[vLocal] << "," 
            << local2wave[vLocal] << "," 
            << local2frag[vLocal] << ","
            << local2level[vLocal] << ","
            << node2num_v[i].load() << ","
            << node2num_e[i].load() << "\n";
        if (node2num_e[i].load() > TH_LARGENODE) {
            largeNodes.push_back(vLocal);
        }
        // string v_str = to_string(local2v[node2set[i]]);
        // nodes["nodes"][v_str]["set"] = local2level[node2set[i]];
        // nodes["nodes"][v_str]["wave"] = local2wave[node2set[i]];
        // nodes["nodes"][v_str]["frag"] = local2frag[node2set[i]];
        // nodes["nodes"][v_str]["vertices"] = node2verts[i];
        // nodes["nodes"][v_str]["num_vertices"] = node2num_v[i].load();
        // nodes["nodes"][v_str]["num_edges"] = node2num_e[i].load() * 2;
    }
    o.close();

    o.open(output_file_prefix + ".wfsize");
    for (int i = 1; i < wf2nodeNum.size(); ++ i) {
        for (int j = 0; j < wf2nodeNum[i].size(); ++ j) {
            if (wf2nodeNum[i][j] == 0) {
                continue;
            }
            o << i << "," << j << "," << wf2nodeNum[i][j] << "," << wf2linkNum[i][j] << "\n";
        }
    }
    o.close();

    o.open(output_file_prefix + ".large");
    for (const auto &v: largeNodes) {
        o << local2v[vLocal] << "\n";
    }
    o.close();

    // o.open(output_file_prefix + ".size-info");
    // o << nodeNum << "\n"
    //   << nodes2num_e.size() << "\n"
    //   << spanLinkNum << "\n";
    // o.close();

    // o << std::setw(4) << nodes << endl;
}

void writeMetaData(std::string prefix, std::vector<long long> &timeList,
                   const label_size_type &maxNodeLabel, const v_size_type &nodeNum, const v_size_type &linkNum, const v_size_type &spanLinkNum,
                   const label_size_type &maxLabel, const v_size_type &verts, const e_size_type &edges,
                   const vector<v_size_type> &wave2frags)
{
    std::ofstream outputFile;
    outputFile.open(prefix + "-info.json");
    outputFile << "{\n";
    outputFile << "\"nodeNum\":" << nodeNum << ",\n";
    outputFile << "\"linkNum\":" << linkNum << ",\n";
    outputFile << "\"spanNum\":" << spanLinkNum << ",\n";
    outputFile << "\"maxNodeLabel\":" << maxNodeLabel << ",\n";
    outputFile << "\"vertices\":" << verts << ",\n";
    outputFile << "\"edges\":" << edges << ",\n";
    outputFile << "\"maxLabel\":" << maxLabel << ",\n";
    outputFile << "\"wave-frag-size\":[";
    bool firstFlag = true;
    for (v_size_type wave = 1; wave < wave2frags.size(); ++ wave) {
        if (firstFlag) {
            firstFlag = false;
        } else {
            outputFile << ",";
        }
        outputFile << wave2frags[wave] + 1;
    }
    outputFile << "],\n";

    outputFile << "\"fill-wwccs-time\":" << timeList[0] << ",\n";
    outputFile << "\"fill-local2wavefrag-time\":" << timeList[1] << ",\n";
    outputFile << "\"populate-ds-time\":" << timeList[2] << ",\n";
    outputFile << "\"fill-level-time\":" << timeList[3] << ",\n";
    outputFile << "\"fill-local2level-time\":" << timeList[4] << ",\n";
    outputFile << "\"fill-set2node-time\":" << timeList[5] << ",\n";
    outputFile << "\"count-in-nodes-time\":" << timeList[6] << ",\n";
    outputFile << "\"count-join-time\":" << timeList[7] << ",\n";
    outputFile << "\"write-time\":" << timeList[8] << "\n}";
    outputFile.close();
}

void newFPMetaDagCover(string g, string outPath, v_size_type l, v_size_type lcc, int nt, v_size_type max_v)
{
    string wave_csv = g + "layer-" + to_string(l) + "-waves.csv",
           wave_sources = g + "layer-" + to_string(l) + "-wave-sources.csv",
           wave_dist = g + "layer-" + to_string(l) + "-waves-info.json",
           csv_file = g + "layer-" + to_string(l) + "-waves-info-lcc.csv";

    if (DEBUG >= 1)
    {
        cout << wave_csv << "\n"
             << wave_sources << "\n"
             << wave_dist << "\n"
             << csv_file << "\n";
    }

    std::vector<long long> timeList;
    reset();

    vector<bool> wwccs(max_v + 1);
    int num_waves = fill_wwccs(csv_file, wwccs, lcc);
    timeList.push_back(getTimeElapsed());
    cout << "FILL WWCCS\n";
    reset();

    vector<v_size_type> v2local(1);
    vector<label_size_type> local2v;
    vector<wf_type> local2wf;
    vector<v_size_type> local2wave, local2frag;
    fill_local2wave_frag(v2local, local2v, local2wf, wave_sources, local2wave, local2frag);
    timeList.push_back(getTimeElapsed());
    cout << "FILL LOCAL2WAVEFRAG\n";
    reset();

    e_size_type edgeProcessed = 0;
    e_size_type nodeProcessed = 0;
    label_size_type maxLabel = 0;

    vector<v_size_type> rank(local2v.size()), parent(local2v.size());
    ds_type *ds;
    ds = new ds_type(&rank[0], &parent[0]);
    vector<v_size_type> waveRank(local2v.size()), waveParent(local2v.size());
    ds_type *waveDs;
    waveDs = new ds_type(&waveRank[0], &waveParent[0]);
    edge_list_type edges;
    vector<v_size_type> wave2frags(num_waves + 1);
    populate_ds(wwccs, *ds, *waveDs, v2local, local2v, local2wf, edges, wave_csv, wave2frags, edgeProcessed, maxLabel);
    timeList.push_back(getTimeElapsed());
    cout << "POPULATE DS\n";
    reset();
    

    wf2level_type level(num_waves + 1);
    wf2level_type wf2nodeNum(num_waves + 1);
    wf2level_type wf2linkNum(num_waves + 1);
    fill_level(level, wave2frags, wf2nodeNum, wf2linkNum);
    timeList.push_back(getTimeElapsed());
    cout << "FILL LEVEL\n";
    reset();

    vector<v_size_type> local2level(local2frag.size());
    fill_local2level(local2wave, local2frag, level, local2level);
    timeList.push_back(getTimeElapsed());
    cout << "FILL LOCAL2LEVEL\n";
    reset();

    vector<v_size_type> set2node(local2v.size()), node2set;
    fill_set2node(*ds, set2node, node2set, local2v.size());
    // timeList.push_back(getTimeElapsed());
    // cout << "FILL SET2NODE\n";
    // reset();

    vector<v_size_type> set2waveNode(local2v.size()), waveNode2set;
    if (0 == FRAGDAGONLY)
    {
        fill_set2node(*waveDs, set2waveNode, waveNode2set, local2v.size());
    }
    timeList.push_back(getTimeElapsed());
    cout << "FILL SET2NODE\n";
    reset();


    vector<thread> thread_vec;
    int num_threads = nt;
    thread_vec.reserve(num_threads);

    vector<std::atomic<v_size_type>> node2num_v(node2set.size());
    vector<std::atomic<e_size_type>> node2num_e(node2set.size());
    vector<edge_weight_map_type> all_nodes2num_e(num_threads);
    vector<std::atomic<v_size_type>> waveNode2num_v(waveNode2set.size());
    vector<std::atomic<e_size_type>> waveNode2num_e(waveNode2set.size());
    vector<edge_weight_map_type> all_waveNodes2num_e(num_threads);
    vector<std::atomic<char>> seen(local2v.size());

    vector<edge_list_type> e(num_threads);
    v_size_type base_len = edges.size() / num_threads, remainder = edges.size() % num_threads;
    v_size_type prev_end = 0;
    for (int i = 0; i < num_threads; i++)
    {
        auto begin = next(edges.begin(), prev_end);
        prev_end += base_len + (i < remainder);
        auto end = next(edges.begin(), prev_end);

        e[i].resize(end - begin);
        copy(begin, end, e[i].begin());

        thread_vec.emplace_back(
            thread{
                count_in_nodes,
                std::ref(local2level), std::ref(*ds), std::ref(*waveDs), std::ref(e[i]), std::ref(set2node),
                std::ref(node2set), std::ref(node2num_v), std::ref(node2num_e), std::ref(all_nodes2num_e[i]),
                std::ref(set2waveNode), std::ref(waveNode2set), std::ref(waveNode2num_v),
                std::ref(waveNode2num_e), std::ref(all_waveNodes2num_e[i]), std::ref(seen), local2v.size()});
    }

    for (int i = 0; i < num_threads; i++)
        thread_vec[i].join();

    timeList.push_back(getTimeElapsed());
    cout << "COUNT IN NODES\n";
    reset();

    

    edge_weight_map_type nodes2num_e, waveNodes2num_e;

    for (int i = 0; i < num_threads; i++)
    {
        for (auto weight : all_nodes2num_e[i])
        {
            nodes2num_e[weight.first] += weight.second;
        }
        for (auto weight : all_waveNodes2num_e[i])
        {
            waveNodes2num_e[weight.first] += weight.second;
        }
    }

    timeList.push_back(getTimeElapsed());
    cout << "COUNT JOIN\n";
    reset();

    // if (DEBUG >= 1)
    // {
    //     cout << edgeProcessed << ",";
    //     for (int i = 0; i <= 8; i++)
    //     {
    //         if (times[i] > 0)
    //         {
    //             cout << edgeProcessed / times[i] << ",";
    //         }
    //         else
    //         {
    //             cout << "too fast,";
    //         }
    //     }
    //     cout << "\n";
    // }

    if (DEBUG >= 2)
    {
        v_size_type vCnt = 0;
        e_size_type eCnt = 0;

        for (v_size_type thing : node2num_v)
        {
            cout << thing << " ";
            vCnt += thing;
        }
        cout << endl;

        for (e_size_type thing : node2num_e)
        {
            cout << thing << " ";
            eCnt += thing;
        }
        cout << endl
             << endl;

        // for (v_size_type i = 0; i < node2set.size(); i++) {
        //     for (v_size_type j = 0; j < node2set.size(); j++) {
        //         cout << nodes2num_e[i][j] << " ";
        //         eCnt += nodes2num_e[i][j];
        //     }
        //     cout << endl;
        // }

        for (const auto &kv : nodes2num_e)
        {
            cout << kv.first.first << "-" << kv.first.second << ":" << kv.second << "\n";
            eCnt += kv.second;
        }

        cout << "\n\n";

        for (v_size_type thing : waveNode2num_v)
        {
            cout << thing << " ";
            vCnt -= thing;
        }
        cout << endl;

        for (e_size_type thing : waveNode2num_e)
        {
            cout << thing << " ";
            eCnt -= thing;
        }
        cout << endl
             << endl;

        // for (v_size_type i = 0; i < waveNode2set.size(); i++) {
        //     for (v_size_type j = 0; j < waveNode2set.size(); j++) {
        //         cout << waveNodes2num_e[i][j] << " ";
        //         eCnt -= waveNodes2num_e[i][j];
        //     }
        //     cout << endl;
        // }

        for (const auto &kv : waveNodes2num_e)
        {
            cout << kv.first.first << "-" << kv.first.second << ":" << kv.second << "\n";
            eCnt -= kv.second;
        }

        cout << "\n\n";
        cout << vCnt << "," << eCnt << "\n";
    }

    // json nodes, waveNodes;
    vector<vector<v_size_type>> node2verts(local2v.size());
    vector<vector<v_size_type>> waveNode2verts(local2v.size());
    v_size_type nodeNum = 0;
    v_size_type spanLinkNum = 0;
    label_size_type maxNodeLabel = 0;
    fill_node2verts(node2verts, node2num_v, node2num_e, local2level, local2wave, local2frag, *ds, set2node, node2set, local2v, nodes2num_e, outPath + "dagmeta_" + to_string(l) + "_" + to_string(lcc), wf2nodeNum, wf2linkNum, spanLinkNum, nodeNum, maxNodeLabel, nodeProcessed);
    // if (FRAGDAGONLY == 0) {
    //     fill_node2verts(waveNode2verts, waveNode2num_v, waveNode2num_e, local2level, local2wave, local2frag, *waveDs, set2waveNode, waveNode2set, local2v, waveNodes2num_e, outPath + "dagmeta_wave_" + to_string(l) + "_" + to_string(lcc));
    // }

    timeList.push_back(getTimeElapsed());
    cout << "WRITE OUT\n";
    reset();

    writeMetaData(outPath + "dagmeta_" + to_string(l) + "_" + to_string(lcc), timeList, maxNodeLabel, nodeNum, nodes2num_e.size(), spanLinkNum, maxLabel, nodeProcessed, edgeProcessed, wave2frags);
    
    delete ds;
    delete waveDs;
}

int main(int argc, char *argv[])
{
    string graph = argv[1];
    v_size_type layer = stoi(argv[2]);
    v_size_type lcc = stoi(argv[3]);
    v_size_type max_v = stoi(argv[4]);
    string prefix = graph + "/" + graph + "_waves" + "/";
    newFPMetaDagCover("./" + prefix, "./" + graph + "/dag/", layer, lcc, 2, max_v);
}