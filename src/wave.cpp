#include <algorithm>
#include <assert.h>
#include <boost/container_hash/hash.hpp>
#include <boost/graph/adjacency_list.hpp>
#include <boost/graph/connected_components.hpp>
#include <errno.h>
#include <fcntl.h>
#include <fstream>
#include <iostream>
#include <limits.h>
#include <netinet/in.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <sys/time.h>
#include <unistd.h>
#include <unordered_map>
#define DEBUG 1

#define BUFFER_NUM_EDGES ((unsigned int)1 << 25)
#define ENULL ((unsigned int)-1)

typedef boost::adjacency_list<boost::vecS, boost::vecS, boost::undirectedS, unsigned int>
	graph_t;

std::unordered_map<unsigned int, graph_t> G;

// A struct to represent an edge in the edge list
struct edge {
	unsigned int src;
	unsigned int tgt;
};

struct graph {
	unsigned int NODENUM;
	unsigned int EDGENUM;
	unsigned int *start_indices;
	unsigned int *end_indices;
	edge *edgeList;
} g;

// Utility function to print a given array
template <class T> void printArray(T *arr, unsigned int n)
{
	for (unsigned int i = 0; i < n; i++) {
		std::cout << arr[i] << " ";
	}
	std::cout << "\n";
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
	currentTimeMilliS = newTime;
	return timeElapsed;
}

// Memory maps input file
void createMemoryMap(char *fileName)
{
	unsigned int binFile = open(fileName, O_RDWR);
	long fileSizeInByte;
	struct stat sizeResults;
	assert(stat(fileName, &sizeResults) == 0);
	fileSizeInByte = sizeResults.st_size;
	g.edgeList = (edge *)mmap(NULL, fileSizeInByte, PROT_READ | PROT_WRITE, MAP_SHARED,
				  binFile, 0);
	close(binFile);
}

// In-memory edge list instead of memory mapped file
void createInMemoryEdgeList(const char *fileName)
{
	g.edgeList = new edge[g.EDGENUM];
	std::ifstream is;
	is.open(fileName, std::ios::in | std::ios::binary);
	unsigned int src, tgt;
	/* unsigned int updatedEdgeNum = g.EDGENUM; */
	for (unsigned int i = 0; i < g.EDGENUM; i++) {
		is.read((char *)(&src), sizeof(unsigned int));
		is.read((char *)(&tgt), sizeof(unsigned int));
		assert(src != ENULL && src <= g.NODENUM);
		assert(tgt != ENULL && tgt <= g.NODENUM);
		(g.edgeList + i)->src = src;
		(g.edgeList + i)->tgt = tgt;
	}
	is.close();
}

void readLayer(const std::string &inputFile, unsigned int *label2node, unsigned int *node2label,
	       unsigned int tlayer)
{
	g.edgeList = new edge[g.EDGENUM];
	std::ifstream is;
	is.open(inputFile);
	unsigned int src, tgt, layer;
	unsigned int edge = 0;
	unsigned int node = 0;
	std::string line;
	while (std::getline(is, line)) {
		if (line[0] == '#')
			continue;
		std::replace(line.begin(), line.end(), ',', ' ');
		std::istringstream iss(line);
		assert(iss >> src >> tgt >> layer);
		if (layer == tlayer) {
			/* std::cerr<<src<<", "<<tgt<<": "<<layer<<", "<<tlayer<<" |
			 * "<<label2node[src]<<", "<<label2node[tgt]<<"\n"; */
			assert(src != ENULL && node <= g.NODENUM);
			if (label2node[src] == ENULL) {
				node++;
				label2node[src] = node;
				node2label[node] = src;
			} else {
				node2label[label2node[src]] = src;
			}
			assert(tgt != ENULL && node <= g.NODENUM);
			if (label2node[tgt] == ENULL) {
				node++;
				label2node[tgt] = node;
				node2label[node] = tgt;
			} else {
				node2label[label2node[tgt]] = tgt;
			}
			(g.edgeList + edge)->src = label2node[src];
			(g.edgeList + edge)->tgt = label2node[tgt];
			edge++;
		}
	}
	/* std::cerr<<"NODE: "<<node<<", "<<g.NODENUM<<"\n"; */
	/* std::cerr<<"EDGE: "<<edge<<", "<<g.EDGENUM<<"\n"; */
	assert(node == g.NODENUM);
	assert(edge == g.EDGENUM);
	is.close();
}

bool compareEdges(const edge &a, const edge &b)
{
	if (a.src < b.src)
		return true;
	if (a.src == b.src) {
		if (a.tgt < b.tgt)
			return true;
	}
	return false;
}

// Compares indices according to their corresponding edges
int compareByEdges(const void *a, const void *b)
{
	if ((g.edgeList + *(unsigned int *)a)->src < (g.edgeList + *(unsigned int *)b)->src)
		return -1;
	if ((g.edgeList + *(unsigned int *)a)->src == (g.edgeList + *(unsigned int *)b)->src) {
		if ((g.edgeList + *(unsigned int *)a)->tgt <
		    (g.edgeList + *(unsigned int *)b)->tgt)
			return -1;
		if ((g.edgeList + *(unsigned int *)a)->tgt ==
		    (g.edgeList + *(unsigned int *)b)->tgt)
			return 0;
		if ((g.edgeList + *(unsigned int *)a)->tgt >
		    (g.edgeList + *(unsigned int *)b)->tgt)
			return 1;
	}
	if ((g.edgeList + *(unsigned int *)a)->src > (g.edgeList + *(unsigned int *)b)->src)
		return 1;
	return 0;
}

// Formats the graph by sorting it and tracing original indices in the graph
void formatGraph(unsigned int *originalIndices)
{
	unsigned int *indices = new unsigned int[g.EDGENUM];
	for (unsigned int i = 0; i < g.EDGENUM; i++) {
		indices[i] = i;
	}
	qsort(indices, g.EDGENUM, sizeof(unsigned int), compareByEdges);
	for (unsigned int i = 0; i < g.EDGENUM; i++) {
		originalIndices[indices[i]] = i;
	}
	std::sort(g.edgeList, g.edgeList + g.EDGENUM, compareEdges);
	// qsort(g.edgeList, g.EDGENUM, sizeof(edge), compareByEdges);
	delete[] indices;
}

// Finds the start and end indices	of each node in the graph
void findStartAndEndIndices()
{
	g.start_indices = new unsigned int[g.NODENUM + 1];
	g.end_indices = new unsigned int[g.NODENUM + 1];
	std::fill_n(g.start_indices, g.NODENUM + 1, 0);
	std::fill_n(g.end_indices, g.NODENUM + 1, 0);
	unsigned int i;
	unsigned int old = g.edgeList->src;
	g.start_indices[old] = 0;
	for (i = 0; i < g.EDGENUM; i++) {
		if ((g.edgeList + i)->src != old) {
			g.end_indices[old] = i - 1;
			old = (g.edgeList + i)->src;
			g.start_indices[old] = i;
		}
	}
	g.end_indices[old] = i - 1;
}

// Computes the degree of each node in the graph
unsigned int findDegree(unsigned int *degree)
{
	std::fill_n(degree, g.NODENUM + 1, 0);
	unsigned int max = 0;
	for (unsigned int i = 0; i < g.EDGENUM; i++) {
		degree[(g.edgeList + i)->src]++;
		degree[(g.edgeList + i)->tgt]++;
	}
	for (unsigned int i = 0; i < g.NODENUM + 1; i++) {
		degree[i] /= 2;
		if (degree[i] > max)
			max = degree[i];
	}
	return max;
}

void findWaves(unsigned int *deg, unsigned int *waves, unsigned int *levels)
{
	/* unsigned int * lodeg = new unsigned int[g.NODENUM + 1]; */
	/* lodeg[0] = 0; */

	unsigned int *vert = new unsigned int[g.NODENUM + 1];
	unsigned int *pos = new unsigned int[g.NODENUM + 1];
	unsigned int md = *std::max_element(deg, deg + g.NODENUM + 1);
	unsigned int *bins = new unsigned int[md + 1];
	/* for(unsigned int v = 1; v <= g.NODENUM; v++) { */
	/* 	freq[deg[v]]++; */
	/* 	lodeg[v] = deg[v]; */
	/* } */

	auto reSort = [vert, pos, bins, md, deg]() {
		std::fill_n(vert, g.NODENUM + 1, 0);
		std::fill_n(pos, g.NODENUM + 1, 0);
		std::fill_n(bins, md + 1, 0);
		for (unsigned int v = 1; v <= g.NODENUM; v++) {
			if (deg[v] != ENULL)
				bins[deg[v]]++;
		}
		unsigned int start = 1;
		for (unsigned int d = 0; d <= md; d++) {
			unsigned int num = bins[d];
			bins[d] = start;
			start += num;
		}
		for (unsigned int v = 1; v <= g.NODENUM; v++) {
			if (deg[v] != ENULL) {
				pos[v] = bins[deg[v]];
				vert[pos[v]] = v;
				bins[deg[v]]++;
			}
		}
		for (unsigned int d = md; d > 0; d--) {
			bins[d] = bins[d - 1];
		}
		bins[0] = 1;
	};
	reSort();
	// unsigned int old_src = -1, old_tgt = -1;

	unsigned int mindeg = deg[vert[1]];
	unsigned int wave = 0;
	unsigned int level = 0;
	unsigned int till = ENULL;

	do {
		// std::cerr<<"till: "<<till<<"\n";
		if (deg[vert[1]] == mindeg) {
			wave++;
			level = 0;
			if (mindeg + 1 <= md)
				till = bins[mindeg + 1] - 1;
		} else {
			till = bins[mindeg] - 1;
		}
		level++;
		till = till > g.NODENUM ? g.NODENUM : till;

		// printArray(deg, g.NODENUM+1);
		// printArray(vert, g.NODENUM+1);
		// printArray(bins, md+1);
		// std::cerr<<"till: "<<till<<"\n";
		// std::cerr<<"ENULL: "<<ENULL<<"\n";
		// std::cerr<<"mindeg: "<<mindeg<<"\n";
		// std::cerr<<"wave: "<<wave<<"\n";
		// if (till == 1) {
		//     unsigned int v = vert[1];
		//     waves[v] = wave;
		//     levels[v] = level;
		//     deg[v] = ENULL;
		//     break;
		// }
		for (unsigned int i = 1; i <= till; i++) {
			/* std::cerr<<"i: "<<i<<"\n"; */
			unsigned int v = vert[i];
			// std::cerr<<"i2: "<<i<<", "<<deg[v]<<"\n";
			// Do nothing if node doesn't exist in the graph
			if (false && g.start_indices[v] == 0 && g.end_indices[v] == 0) {
				;
				std::cerr << "Test\n";
			} else {
				/* std::cerr<<"i3: "<<i<<"\n"; */
				// std::cerr<<v<<": "<<deg[v]<<", "<<waves[v]<<"\n";
				waves[v] = wave;
				levels[v] = level;
				deg[v] = ENULL;
				// std::cerr<<v<<": "<<deg[v]<<", "<<waves[v]<<"\n";
				/* std::cerr<<"i4: "<<i<<"\n"; */

				for (unsigned int j = g.start_indices[v]; j <= g.end_indices[v];
				     j++) {
					/* std::cerr<<"i5j: "<<j<<"\n"; */
					unsigned int u = (g.edgeList + j)->tgt;
					/* std::cerr<<v<<"->"<<u<<": "<<deg[u]<<", "<<waves[u]<<"\n"; */

					if (deg[u] != ENULL) {
						// if((edgeList + j)->src != old_src || (edgeList + j)->tgt !=
						// old_tgt) {
						/* if(deg[u] > deg[v]) { */
						/* 	unsigned int du = deg[u]; */
						/* 	unsigned int pu = pos[u]; */
						/* 	unsigned int pw = bins[du]; */
						/* 	unsigned int w = vert[pw]; */
						/* 	if(u != w) { */
						/* 		pos[u] = pw; */
						/* 		pos[w] = pu; */
						/* 		vert[pu] = w; */
						/* 		vert[pw] = u; */
						/* 	} */
						/* 	bins[du]++; */
						/* 	deg[u]--; */
						/* } */
						//}
						deg[u]--;
					}
					/* std::cerr<<v<<"->"<<u<<": "<<deg[u]<<", "<<waves[u]<<"\n"; */
					// old_src = (edgeList + j)->src;
					// old_tgt = (edgeList + j)->tgt;
				}
			}
			/* std::cerr<<"i: "<<i<<"\n"; */
		}
		/* std::cerr<<"HERE 0\n"; */

		// printArray(deg, g.NODENUM+1);
		if (*std::min_element(deg + 1, deg + g.NODENUM + 1) == ENULL)
			break;

		reSort();
	} while (true);

	delete[] vert;
	delete[] pos;
	delete[] bins;
}

void buildWavesAndLabel(std::ofstream &outputFile, unsigned int *waves, unsigned int *levels,
			unsigned int *ccs, unsigned int *metanodes)
{
	for (unsigned int i = 0; i < g.EDGENUM; i++) {
		unsigned int src = (g.edgeList + i)->src;
		unsigned int tgt = (g.edgeList + i)->tgt;
		unsigned int wave = waves[src];
		/* std::cerr<<src<<"-->"<<tgt<<" : "<<degree[src]<<"-->"<<degree[tgt]<<"\n"; */
		if (wave == waves[tgt]) {
			boost::add_edge(src, tgt, G[wave]);
		} else {
			boost::add_edge(src, 0, G[wave]);
			boost::remove_edge(src, 0, G[wave]);
			/* boost::remove_vertex(0, G[wave]); */
		}
	}

	unsigned int mnode = 0;
	for (auto gr = G.begin(); gr != G.end(); gr++) {
		unsigned int wave = gr->first;
		unsigned int NODENUM = boost::num_vertices(gr->second);

		std::vector<unsigned int> components(NODENUM);
		unsigned int num = boost::connected_components(gr->second, &components[0]);
		unsigned int *compVerts = new unsigned int[num];
		unsigned int *compEdges = new unsigned int[num];
		unsigned int *compLevel = new unsigned int[num];
		std::fill_n(compVerts, num, 0);
		std::fill_n(compEdges, num, 0);
		std::fill_n(compLevel, num, 0);
		for (unsigned int i = 1; i <= NODENUM; i++) {
			if (waves[i] == gr->first) {
				ccs[i] = components[i];
				metanodes[i] = mnode + components[i];
				compVerts[components[i]]++;
				if (levels[i] > compLevel[components[i]])
					compLevel[components[i]]++;
			}
		}
		mnode += num;

		boost::graph_traits<graph_t>::edge_iterator ei, ei_end;
		for (boost::tie(ei, ei_end) = boost::edges(gr->second); ei != ei_end; ++ei) {
			assert(components[source(*ei, gr->second)] ==
			       components[target(*ei, gr->second)]);
			compEdges[components[source(*ei, gr->second)]]++;
		}

		unsigned int num_verts = std::count(waves, waves + g.NODENUM + 1, gr->first);
		unsigned int num_edges = boost::num_edges(gr->second);

		outputFile << '"' << wave << '"' << ": {\n";
		for (unsigned int i = 0; i < num; i++) {
			if (compVerts[i] < 1)
				continue;
			outputFile << "\t\"" << i << "\": {\n";
			outputFile << "\t\t\"vertices\":" << compVerts[i] << ",\n";
			outputFile << "\t\t\"edges\":" << compEdges[i] / 2 << ",\n";
			outputFile << "\t\t\"levels\":" << compLevel[i] << "\n\t},\n";
		}
		outputFile << "\t\"vertices\":" << num_verts << ",\n";
		outputFile << "\t\"edges\":" << num_edges / 2 << "\n},\n";
	}
}

void writeToFile(const std::string &prefix, unsigned int *edgeIndices, unsigned int *node2label,
		 unsigned int *waves, unsigned int *levels, unsigned int *ccs,
		 unsigned int *metanodes)
{
	std::ofstream outputFile;
	outputFile.open(prefix + "-metaedges.csv");
	/* outputFile<<"# source_metanode,target_metanode\n"; */
	std::unordered_map<std::pair<unsigned int, unsigned int>, bool,
			   boost::hash<std::pair<unsigned int, unsigned int> > >
		map;
	for (unsigned int i = 0; i < g.EDGENUM; i++) {
		unsigned int src = metanodes[(g.edgeList + edgeIndices[i])->src];
		unsigned int tgt = metanodes[(g.edgeList + edgeIndices[i])->tgt];
		if (src == tgt) {
			continue;
		}
		std::pair<unsigned int, unsigned int> key =
			std::make_pair(std::min(src, tgt), std::max(src, tgt));
		auto m = map.find(key);
		if (m == map.end()) {
			outputFile << src << "," << tgt << "\n";
			map[key] = true;
		}
	}
	outputFile.close();
	outputFile.open(prefix + "-waves.csv");
	/* outputFile<<"# vertex,level,wave,wave_connected_component,meta_node\n"; */
	for (unsigned int i = 1; i <= g.NODENUM; i++) {
		outputFile << node2label[i] << "," << levels[i] << "," << waves[i] << ","
			   << ccs[i] << "," << metanodes[i] << "\n";
	}
	outputFile.close();
}

void writeMetaData(std::string prefix, unsigned int NODENUM, unsigned int EDGENUM,
		   unsigned int maxdeg, long long preprocessingTime, long long algorithmTime)
{
	std::ofstream outputFile;
	outputFile.open(prefix + "-wavedecomp-info.json");
	outputFile << "{\n";
	outputFile << "\"vertices\":" << NODENUM << ",\n";
	outputFile << "\"edges\":" << EDGENUM << ",\n";
	outputFile << "\"preprocessing-time\":" << preprocessingTime << ",\n";
	outputFile << "\"algorithm-time\":" << algorithmTime << ",\n";
	outputFile << "\"maxdeg\":" << maxdeg << "\n}";
	outputFile.close();
}

void initNodeMap(char *inputFile, unsigned int *node2label)
{ //, unsigned int *label2node) {
	std::ifstream is(inputFile, std::ios::in | std::ios::binary);
	unsigned int label, cc;
	for (unsigned int i = 1; i <= g.NODENUM; i++) {
		is.read((char *)(&label), sizeof(unsigned int));
		is.read((char *)(&cc), sizeof(unsigned int));
		node2label[i] = label;
		// label2node[label] = i;
	}
}

void writeWaveMetaData(std::ofstream &outputFile, unsigned int wave, unsigned int NODENUM,
		       unsigned int EDGENUM)
{
	outputFile << '"' << wave << '"' << ": {\n";
	outputFile << "\t\"vertices\":" << NODENUM << ",\n";
	outputFile << "\t\"edges\":" << EDGENUM / 2 << "\n},\n";
}

int main(int argc, char *argv[])
{
	if (argc < 9) {
		std::cerr
			<< argv[0]
			<< ": usage: ./wave <path to layers dir> <layer file> <layer> <# edges> <# "
			   "nodes> <path to graph.cc> <largest node label> <# nodes in nodemap>\n";
		exit(1);
	}
	std::string prefix = argv[1];
	std::string prefixx = prefix.substr(0, prefix.length() - 7) + "_waves/layer-" + argv[3];
	std::ofstream outputFile(prefixx + "-waves-info.json");
	outputFile << "{\n";
	g.EDGENUM = atol(argv[4]);
	g.NODENUM = atol(argv[5]);
	reset();
	unsigned int *node2label = new unsigned int[g.NODENUM + 1];
	unsigned int *label2node = new unsigned int[atol(argv[7]) + 1];
	std::fill_n(label2node, atol(argv[7]) + 1, ENULL);
	/* initNodeMap(argv[6], node2label, label2node, atol(argv[8])); */
	readLayer(argv[2], label2node, node2label, atol(argv[3]));
	if (DEBUG)
		std::cout << "LOADED GRAPH " << g.EDGENUM << ", " << g.NODENUM << "\n";
	unsigned int *originalIndices = new unsigned int[g.EDGENUM];
	formatGraph(originalIndices);
	long long preprocessingTime = getTimeElapsed();
	reset();
	if (DEBUG)
		std::cout << "FORMATTED GRAPH\n";
	findStartAndEndIndices();
	if (DEBUG)
		std::cout << "START AND END INDICES COMPUTED\n";
	unsigned int *degree = new unsigned int[g.NODENUM + 1];
	unsigned int *waves = new unsigned int[g.NODENUM + 1];
	unsigned int *levels = new unsigned int[g.NODENUM + 1];
	std::fill_n(waves, g.NODENUM + 1, 0);
	/* unsigned int *degree = waves; */
	unsigned int maxdeg = findDegree(degree);
	findWaves(degree, waves, levels);
	unsigned int *ccs = new unsigned int[g.NODENUM + 1];
	unsigned int *metanodes = new unsigned int[g.NODENUM + 1];
	buildWavesAndLabel(outputFile, waves, levels, ccs, metanodes);
	long long algorithmTime = getTimeElapsed();

	outputFile << "\"0\":{}\n}";
	outputFile.close();
	writeToFile(prefixx, originalIndices, node2label, waves, levels, ccs, metanodes);
	writeMetaData(prefixx, atol(argv[5]), atol(argv[4]) / 2, maxdeg, preprocessingTime,
		      algorithmTime);
	/* printArray(waves, g.NODENUM+1); */
	delete[] degree;
	delete[] waves;
	delete[] levels;
	delete[] ccs;
	delete[] metanodes;
	delete[] g.start_indices;
	delete[] g.end_indices;
	return 0;
}
