#include <assert.h>
// #include <boost/graph/adjacency_list.hpp>
// #include <boost/graph/connected_components.hpp>
#include <boost/dynamic_bitset.hpp>
#include <boost/pending/disjoint_sets.hpp>
#include <fstream>
#include <iostream>
#include <sys/time.h>
#define DEBUG (1)

#define BUFFER_NUM_EDGES ((unsigned int)1 << 25)
#define ENULL ((unsigned int)-1)

// using namespace boost;

// typedef adjacency_list<vecS, vecS, undirectedS, unsigned int> graph_t;
// typedef graph_traits<graph_t>::vertex_descriptor Vertex;
// typedef graph_traits<graph_t>::edge_descriptor Edge;

// std::unordered_map<unsigned int, graph_t> G;

struct edge {
	unsigned long long src;
	unsigned long long tgt;
};

struct graph {
	unsigned long long NODENUM;
	unsigned long long EDGENUM;
	// unsigned long long *start_indices;
	// unsigned long long *end_indices;
	edge *edgeList;

	// graph(): NODENUM(0), EDGENUM(0), edgeList(nullptr) {};
};

std::vector<unsigned int> ccs;

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
	currentTimeMilliS = newTime;
	return timeElapsed;
}

void readGraph(const std::string &inputFile, const std::string &ccfile, unsigned int layerCnt, graph *G, std::vector<unsigned int> &layer2idx, unsigned int &maxlabel)
{
	std::ifstream is;
	is.open(inputFile);
	unsigned int src, tgt, layer, layerIdx;
	/* graph_t g; */
	std::string line;
	// unsigned int maxlabel = 0;
	std::vector<unsigned int> layer2edges(layerCnt, 0);

	while (std::getline(is, line)) {
		if (line[0] == '#')
			continue;
		std::replace(line.begin(), line.end(), ',', ' ');
		std::istringstream iss(line);
		assert(iss >> src >> tgt >> layer);
		/* if (G.count(layer) == 1) { */
		/* 	g = G.find(layer)->second; */
		/* } else { */
		/* 	g = graph_t(); */
		/* 	G[layer] = g; */
		/* } */
		// assert(add_edge(src, tgt, G[layer]).second)
		layerIdx = layer2idx[layer];
		// std::cout << layerIdx << "," << layer2edges[layerIdx] << "," << src << "," << tgt << "\n";
		((G + layerIdx) -> edgeList + layer2edges[layerIdx]) -> src = src;
		((G + layerIdx) -> edgeList + layer2edges[layerIdx]) -> tgt = tgt;
		++ layer2edges[layerIdx];
		
		if (src > maxlabel)
			maxlabel = src;
		if (tgt > maxlabel)
			maxlabel = tgt;
	}
	is.close();
	is.open(ccfile, std::ios::in | std::ios::binary);
	is.seekg(0, is.end);
	unsigned int length = is.tellg() / sizeof(unsigned int);
	is.seekg(0, is.beg);
	unsigned int vert, cc;
	ccs = std::vector<unsigned int>(maxlabel + 1);
	for (unsigned int i = 0; i < length / 2; i++) {
		is.read((char *)(&vert), sizeof(unsigned int));
		is.read((char *)(&cc), sizeof(unsigned int));
		// if (vert > ccs.size())
		//     ccs.resize(vert+1);
		// std::cerr<<"vert: "<<vert<<", max: "<<maxlabel<<", size: "<<ccs.size()<<"\n";
		if (vert > maxlabel)
			break;
		ccs[vert] = cc;
	}
	is.close();
}

void writeToFile(std::ofstream &outputFile, unsigned int layer, std::vector<unsigned int> &idx2label,
                 boost::disjoint_sets<unsigned int*, unsigned int*> &ds)
{
	for (unsigned int i = 0; i < idx2label.size(); i++) {
		outputFile << idx2label[i] << "," << ccs[idx2label[i]] << "," << layer << "," << idx2label[ds.find_set(i)]
				   << "\n";
	}
}

void writeMetaData(const std::string &prefix, long long preprocessingTime,
                   long long algorithmTime, long long writeTime)
{
	std::ofstream outputFile;
	outputFile.open(prefix + "-info.json");
	outputFile << "{\n";
	outputFile << "\"preprocessing-time\":" << preprocessingTime << ",\n";
	outputFile << "\"write-time\":" << writeTime << ",\n";
	outputFile << "\"algorithm-time\":" << algorithmTime << "\n}";
	outputFile.close();
}

void writeCCInfo(const std::string &prefix, unsigned int layer, std::vector<unsigned int> &idx2label,
                 std::vector<unsigned int> &ccVSize, std::vector<unsigned int> &ccESize,
				 boost::disjoint_sets<unsigned int*, unsigned int*> &ds)
{
	std::string prefixx = prefix + "/layer-" + std::to_string(layer) + ".cc";
	// unsigned int *freq = new unsigned int[num];
	// std::fill_n(freq, num, 0);
	// for (unsigned int i = 0; i < num_verts; i++)
	// 	freq[components[i]]++;
	std::ofstream outputFile(prefixx + "-info.json");
	outputFile << "{\n";
	// unsigned int num2 = num;
	// for (size_t i = 0; i < num2; i++) {
	// 	/* subgraph_t sg = subgraph_t(g, */
	// 	/* 	[components,i](graph_t::edge_descriptor e) { */
	// 	/* 		return components.at(source(e,g))==i */
	// 	/* 			|| components.at(target(e,g))==i; */
	// 	/* 	}, */
	// 	/* 	[components,i](graph_t::vertex_descriptor v) { */
	// 	/* 		return components.at(v)==i; */
	// 	/* 	}); */

	// 	// if (freq[i] > 1) {
	// 	// 	outputFile << '"' << i << '"' << ": {\n";
	// 	// 	outputFile << "\t\"vertices\":" << freq[i] << ",\n";
	// 	// 	outputFile << "\t\"edges\":" << efreq[i] / 2 << "\n},\n";
	// 	// } else
	// 	// 	num--;
	// }
	for (unsigned int i = 0; i < idx2label.size(); i++) {
		if (i == ds.find_set(i)) {
			outputFile << '"' << idx2label[i] << '"' << ": {\n";
			outputFile << "\t\"cc\":" << ccs[idx2label[i]] << ",\n";
			outputFile << "\t\"vertices\":" << ccVSize[i] << ",\n";
			outputFile << "\t\"edges\":" << ccESize[i] / 2 << "\n},\n";
		}
	}
	outputFile << "\"-1\":{}\n}";
	outputFile.close();
}

int main(int argc, char *argv[])
{
	if (argc < 4) {
		std::cerr << argv[0]
		          << ": usage: ./cc-layers-mat <path to graph> <path to connected "
		             "components> <path to layers dir>\n";
		exit(1);
	}
	std::string prefix = argv[1];
	std::string prefixx = prefix.substr(0, prefix.length() - 4) + ".cc-layers";
	std::string prefixcc = argv[2];
	unsigned int logSize = atol(argv[4]);

	auto const pos = prefix.find_last_of('-', prefix.length() - 4);
	std::cout << prefix.substr(pos + 1, prefix.length() - 4) << "\n";
	unsigned int maxLayer = atol(prefix.substr(pos + 1, prefix.length() - 4).c_str());
	std::cout << maxLayer << "\n";

	std::vector<unsigned int> layer2index(maxLayer + 1, ENULL);
	std::vector<unsigned int> layerVSize((argc - 5) / 3, 0);
	std::vector<unsigned int> layerESize((argc - 5) / 3, 0);
	unsigned int layerCnt = 0;
	for (unsigned int i = 5; i < argc; ++ i) {
		layer2index[atol(argv[i])] = layerCnt;
		++ i;
		layerVSize[layerCnt] = atol(argv[i]);
		++ i;
		layerESize[layerCnt] = atol(argv[i]);
		std::cout << layerCnt << "," << layerVSize[layerCnt] << "," << layerESize[layerCnt] << "\n";
		layerCnt ++;
	}

	// G = std::unordered_map<unsigned int, graph_t>();
	struct graph *G = new struct graph[layerCnt];

	for (unsigned int i = 0; i <= maxLayer; ++ i) {
		if (layer2index[i] != ENULL) {
			// std::cout << i << "\n";
			(G + layer2index[i]) -> NODENUM = layerVSize[layer2index[i]];
			(G + layer2index[i]) -> EDGENUM = 2 * layerESize[layer2index[i]];
			(G + layer2index[i]) -> edgeList = new struct edge[(G + layer2index[i]) -> EDGENUM];
			// std::cout << (G + layer2index[i]) -> EDGENUM << "\n";
		}
	}

	reset();
	unsigned int maxLabel = 0;
	readGraph(prefix, prefixcc, layerCnt, G, layer2index, maxLabel);
	if (DEBUG)
		std::cout << "LOADED GRAPH\n";
	long long preprocessingTime = getTimeElapsed();

	long long algorithmTime = 0;
	long long writeTime = 0;
	reset();

	std::ofstream outputFile;
	outputFile.open(prefixx);
	/* outputFile<<"# vertex,connected_component,layer,connected_component_in_layer\n";
	 */
	/* outputFile<<"# #components: "<<num_components<<"\n"; */
	std::vector<unsigned int> label2idx(maxLabel + 1);
	for (unsigned int layer = 0; layer <= maxLayer; ++ layer) {
		if (layer2index[layer] == ENULL) {
			continue;
		}
		struct graph g = *(G + layer2index[layer]);
		boost::dynamic_bitset<> seen(maxLabel + 1);
		std::vector<unsigned int> idx2label(g.NODENUM);
		std::vector<unsigned int> parent(g.NODENUM);
		std::vector<unsigned int> rank(g.NODENUM);
		boost::disjoint_sets<unsigned int*, unsigned int*> ds(&rank[0], &parent[0]);

		std::vector<unsigned int> ccVSize(g.NODENUM);
		std::vector<unsigned int> ccESize(g.NODENUM);

		unsigned int src, tgt, srcRoot, tgtRoot;
		unsigned int vIdx = 0;
		for (unsigned int j = 0; j < g.EDGENUM; ++j) {
			src = (g.edgeList + j) -> src;
			tgt = (g.edgeList + j) -> tgt;
			if (seen[src] == 0) {
				idx2label[vIdx] = src;
				label2idx[src] = vIdx;
				ds.make_set(vIdx);
				++ ccVSize[vIdx];
				++ vIdx;
				seen[src] = 1;
			}
			if (seen[tgt] == 0) {
				idx2label[vIdx] = tgt;
				label2idx[tgt] = vIdx;
				ds.make_set(vIdx);
				++ ccVSize[vIdx];
				++ vIdx;
				seen[tgt] = 1;
			}
			srcRoot = ds.find_set(label2idx[src]);
			tgtRoot = ds.find_set(label2idx[tgt]);
			if (srcRoot != tgtRoot) {
				// std::cout << "union" << "\n";
				ds.link(srcRoot, tgtRoot);
				ccVSize[ds.find_set(srcRoot)] = ccVSize[srcRoot] + ccVSize[tgtRoot];
				ccESize[ds.find_set(srcRoot)] = ccESize[srcRoot] + ccESize[tgtRoot] + 1;
			}
			else {
				++ ccESize[srcRoot];
			}
		}
		algorithmTime += getTimeElapsed();
		std::cout << "union-find done" << layer << "\n";
		reset();

		writeToFile(outputFile, layer, idx2label, ds);
		std::cout << "cc-layers done" << layer << "\n";
		writeCCInfo(argv[3], layer, idx2label, ccVSize, ccESize, ds);
		std::cout << "info done" << layer << "\n";
		writeTime += getTimeElapsed();
		reset();
	}
	outputFile.close();
	writeMetaData(prefixx, preprocessingTime, algorithmTime, writeTime);

	// 	std::vector<unsigned int> components(num_vertices(g->second));
	// 	reset();
	// 	unsigned int num = connected_components(g->second, &components[0]);
	// 	algorithmTime += getTimeElapsed();
	// 	writeToFile(outputFile, g->first, g->second, components);
	// 	unsigned int *efreq = new unsigned int[num];
	// 	std::fill_n(efreq, num, 0);
	// 	graph_traits<graph_t>::edge_iterator ei, ei_end;
	// 	for (tie(ei, ei_end) = edges(g->second); ei != ei_end; ++ei)
	// 		efreq[components[source(*ei, g->second)]]++;
	// 	writeCCInfo(argv[3], components, num, num_vertices(g->second), g->first, efreq);
	// }
	// outputFile.close();
	// writeMetaData(prefixx, preprocessingTime, algorithmTime);
	return 0;
}
