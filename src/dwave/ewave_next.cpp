#include <algorithm>
#include <assert.h>
// #include <boost/container_hash/hash.hpp>
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
#include <map>

#include <boost/dynamic_bitset.hpp>
#include <queue>
#include <boost/pending/disjoint_sets.hpp>

#define DEBUG 1

#define BUFFER_NUM_EDGES ((uint32_t)1 << 25)
#define ENULL ((uint32_t)-1)

typedef boost::adjacency_list<boost::vecS, boost::vecS, boost::directedS, uint32_t, uint32_t>
        graph_t;

// std::map<uint32_t, graph_t, std::greater<uint32_t> > G;
// std::unordered_map<std::pair<uint32_t, uint32_t>, std::pair<uint32_t, uint32_t>,
//                    boost::hash<std::pair<uint32_t, uint32_t> > >
//         ews;

// A struct to represent an edge in the edge list
struct edge {
	uint32_t src;
	uint32_t tgt;
};

struct graph {
	uint32_t NODENUM;
	uint64_t EDGENUM;
	uint32_t *start_indices;
	uint32_t *end_indices;
	edge *edgeList;
} g;

// Utility function to print a given array
template <class T> void printArray(T *arr, uint32_t n)
{
	for (uint32_t i = 0; i < n; i++) {
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
	// currentTimeMilliS = newTime;
	return timeElapsed;
}

// // Memory maps input file
// void createMemoryMap(char *fileName)
// {
// 	uint32_t binFile = open(fileName, O_RDWR);
// 	long fileSizeInByte;
// 	struct stat sizeResults;
// 	assert(stat(fileName, &sizeResults) == 0);
// 	fileSizeInByte = sizeResults.st_size;
// 	g.edgeList = (edge *)mmap(NULL, fileSizeInByte, PROT_READ | PROT_WRITE, MAP_SHARED,
// 	                          binFile, 0);
// 	close(binFile);
// }

// // In-memory edge list instead of memory mapped file
// void createInMemoryEdgeList(const char *fileName)
// {
// 	g.edgeList = new edge[g.EDGENUM];
// 	std::ifstream is;
// 	is.open(fileName, std::ios::in | std::ios::binary);
// 	uint32_t src, tgt;
// 	/* uint32_t updatedEdgeNum = g.EDGENUM; */
// 	for (uint32_t i = 0; i < g.EDGENUM; i++) {
// 		is.read((char *)(&src), sizeof(uint32_t));
// 		is.read((char *)(&tgt), sizeof(uint32_t));
// 		assert(src != ENULL && src <= g.NODENUM);
// 		assert(tgt != ENULL && tgt <= g.NODENUM);
// 		(g.edgeList + i)->src = src;
// 		(g.edgeList + i)->tgt = tgt;
// 	}
// 	is.close();
// }

void readLayer(const std::string &inputFile, uint32_t *label2node, uint32_t *node2label,
               uint32_t tlayer, uint32_t logSize)
{
	g.edgeList = new edge[g.EDGENUM];
	std::ifstream is;
	is.open(inputFile);
	uint32_t src, tgt, layer;
	uint64_t edge = 0;
	uint32_t node = 0;
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
			if (edge % logSize == 0) {
				printf("ewave.read: #edges %llu, time %lld\n", edge, getTimeElapsed());
			}
		}
	}
	/* std::cerr<<"NODE: "<<node<<", "<<g.NODENUM<<"\n"; */
	/* std::cerr<<"EDGE: "<<edge<<", "<<g.EDGENUM<<"\n"; */
	assert(node == g.NODENUM);
	assert(edge == g.EDGENUM);
	is.close();
}

// bool compareEdges(const edge &a, const edge &b)
// {
// 	if (a.src < b.src)
// 		return true;
// 	if (a.src == b.src) {
// 		if (a.tgt < b.tgt)
// 			return true;
// 	}
// 	return false;
// }

// // Compares indices according to their corresponding edges
// int compareByEdges(const void *a, const void *b)
// {
// 	if ((g.edgeList + *(uint32_t *)a)->src < (g.edgeList + *(uint32_t *)b)->src)
// 		return -1;
// 	if ((g.edgeList + *(uint32_t *)a)->src == (g.edgeList + *(uint32_t *)b)->src) {
// 		if ((g.edgeList + *(uint32_t *)a)->tgt < (g.edgeList + *(uint32_t *)b)->tgt)
// 			return -1;
// 		if ((g.edgeList + *(uint32_t *)a)->tgt == (g.edgeList + *(uint32_t *)b)->tgt)
// 			return 0;
// 		if ((g.edgeList + *(uint32_t *)a)->tgt > (g.edgeList + *(uint32_t *)b)->tgt)
// 			return 1;
// 	}
// 	if ((g.edgeList + *(uint32_t *)a)->src > (g.edgeList + *(uint32_t *)b)->src)
// 		return 1;
// 	return 0;
// }

// // Formats the graph by sorting it and tracing original indices in the graph
// void formatGraph(uint32_t *originalIndices)
// {
// 	uint32_t *indices = new uint32_t[g.EDGENUM];
// 	for (uint32_t i = 0; i < g.EDGENUM; i++) {
// 		indices[i] = i;
// 	}
// 	qsort(indices, g.EDGENUM, sizeof(uint32_t), compareByEdges);
// 	for (uint32_t i = 0; i < g.EDGENUM; i++) {
// 		originalIndices[indices[i]] = i;
// 	}
// 	std::sort(g.edgeList, g.edgeList + g.EDGENUM, compareEdges);
// 	// qsort(g.edgeList, g.EDGENUM, sizeof(edge), compareByEdges);
// 	delete[] indices;
// }

// Finds the start and end indices	of each node in the graph
void findStartAndEndIndices()
{
	g.start_indices = new uint32_t[g.NODENUM + 1];
	g.end_indices = new uint32_t[g.NODENUM + 1];
	std::fill_n(g.start_indices, g.NODENUM + 1, 0);
	std::fill_n(g.end_indices, g.NODENUM + 1, 0);
	uint32_t i;
	uint32_t old = g.edgeList->src;
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
uint32_t findDegree(uint32_t *degree, uint32_t &min)
{
	std::fill_n(degree, g.NODENUM + 1, 0);
	uint32_t max = 0;
	for (uint32_t i = 0; i < g.EDGENUM; i++) {
		degree[(g.edgeList + i)->src]++;
		degree[(g.edgeList + i)->tgt]++;
	}
	for (uint32_t i = 1; i < g.NODENUM + 1; i++) { // index start from 1 according to readLayer
		degree[i] /= 2;
		if (degree[i] > max)
			max = degree[i];
		if (degree[i] < min)
			min = degree[i];
	}
	return max;
}

// void findWaves(uint32_t *deg, uint32_t *waves, uint32_t *levels)
// {
// 	/* uint32_t * lodeg = new uint32_t[g.NODENUM + 1]; */
// 	/* lodeg[0] = 0; */

// 	uint32_t *vert = new uint32_t[g.NODENUM + 1];
// 	uint32_t *pos = new uint32_t[g.NODENUM + 1];
// 	uint32_t md = *std::max_element(deg, deg + g.NODENUM + 1);
// 	uint32_t *bins = new uint32_t[md + 1];
// 	/* for(uint32_t v = 1; v <= g.NODENUM; v++) { */
// 	/* 	freq[deg[v]]++; */
// 	/* 	lodeg[v] = deg[v]; */
// 	/* } */

// 	auto reSort = [vert, pos, bins, md, deg]() {
// 		std::fill_n(vert, g.NODENUM + 1, 0);
// 		std::fill_n(pos, g.NODENUM + 1, 0);
// 		std::fill_n(bins, md + 1, 0);
// 		for (uint32_t v = 1; v <= g.NODENUM; v++) {
// 			if (deg[v] != ENULL)
// 				bins[deg[v]]++;
// 		}
// 		uint32_t start = 1;
// 		for (uint32_t d = 0; d <= md; d++) {
// 			uint32_t num = bins[d];
// 			bins[d] = start;
// 			start += num;
// 		}
// 		for (uint32_t v = 1; v <= g.NODENUM; v++) {
// 			if (deg[v] != ENULL) {
// 				pos[v] = bins[deg[v]];
// 				vert[pos[v]] = v;
// 				bins[deg[v]]++;
// 			}
// 		}
// 		for (uint32_t d = md; d > 0; d--) {
// 			bins[d] = bins[d - 1];
// 		}
// 		bins[0] = 1;
// 	};
// 	reSort();
// 	// uint32_t old_src = -1, old_tgt = -1;

// 	uint32_t mindeg = deg[vert[1]];
// 	uint32_t wave = 0;
// 	uint32_t level = 0;
// 	uint32_t till = ENULL;

// 	do {
// 		// std::cerr<<"till: "<<till<<"\n";
// 		if (deg[vert[1]] == mindeg) {
// 			wave++;
// 			level = 0;
// 			if (mindeg + 1 <= md)
// 				till = bins[mindeg + 1] - 1;
// 		} else {
// 			till = bins[mindeg] - 1;
// 		}
// 		level++;
// 		till = till > g.NODENUM ? g.NODENUM : till;

// 		// printArray(deg, g.NODENUM+1);
// 		// printArray(vert, g.NODENUM+1);
// 		// printArray(bins, md+1);
// 		// std::cerr<<"till: "<<till<<"\n";
// 		// std::cerr<<"ENULL: "<<ENULL<<"\n";
// 		// std::cerr<<"mindeg: "<<mindeg<<"\n";
// 		// std::cerr<<"wave: "<<wave<<"\n";
// 		// if (till == 1) {
// 		//     uint32_t v = vert[1];
// 		//     waves[v] = wave;
// 		//     levels[v] = level;
// 		//     deg[v] = ENULL;
// 		//     break;
// 		// }

// 		// Ignore 0 deg verts
// 		for (uint32_t i = 1; i <= till; i++) {
// 			/* std::cerr<<"i: "<<i<<"\n"; */
// 			uint32_t v = vert[i];
// 			// std::cerr<<"i2: "<<i<<", "<<deg[v]<<"\n";
// 			// Do nothing if node doesn't exist in the graph
// 			if (false && g.start_indices[v] == 0 && g.end_indices[v] == 0) {
// 				;
// 				std::cerr << "Test: " << v << "\n";
// 			} else {
// 				// std::cerr<<"i3: "<<i<<"\n";
// 				// std::cerr<<v<<": "<<deg[v]<<", "<<waves[v]<<"\n";
// 				if (deg[v] == 0) {
// 					waves[v] = wave;
// 					levels[v] = level;
// 					deg[v] = ENULL;
// 				}
// 			}
// 		}

// 		for (uint32_t i = 1; i <= till; i++) {
// 			/* std::cerr<<"i: "<<i<<"\n"; */
// 			uint32_t v = vert[i];
// 			// std::cerr<<"i2: "<<i<<", "<<deg[v]<<"\n";
// 			// Do nothing if node doesn't exist in the graph
// 			// if (false && g.start_indices[v] == 0 && g.end_indices[v] == 0) {
// 			//         ;
// 			//         std::cerr << "Test: " << v << "\n";
// 			if (deg[v] == ENULL) {
// 				;
// 			} else {
// 				// std::cerr<<"i3: "<<i<<"\n";
// 				// std::cerr<<v<<": "<<deg[v]<<", "<<waves[v]<<"\n";
// 				// if (deg[v] != 0) {
// 				waves[v] = wave;
// 				levels[v] = level;
// 				// } else {
// 				//         waves[v] = 0;
// 				//         levels[v] = 0;
// 				// }
// 				deg[v] = ENULL;
// 				// std::cerr<<v<<": "<<deg[v]<<", "<<waves[v]<<"\n";
// 				// std::cerr<<"i4: "<<i<<"\n";

// 				for (uint32_t j = g.start_indices[v]; j <= g.end_indices[v];
// 				     j++) {
// 					// std::cerr<<"i5j: "<<j<<"\n";
// 					uint32_t u = (g.edgeList + j)->tgt;
// 					// std::cerr<<v<<"->"<<u<<": "<<deg[u]<<", "<<waves[u]<<"\n";
// 					auto key = std::pair<uint32_t, uint32_t>(v, u);
// 					if (ews.find(key) == ews.end()) {
// 						assert(deg[u] != ENULL);
// 						// boost::add_edge(v, u, G[wave]);
// 						// boost::add_edge(u, v, G[wave]);
// 						ews[key].first = wave;
// 						ews[key].second = level;
// 						auto yek = std::pair<uint32_t, uint32_t>(u, v);
// 						ews[yek].first = wave;
// 						ews[yek].second = level;
// 						// deg[u]--;
// 						// waves[u] = wave;
// 						// levels[u] = level;
// 					}

// 					if (deg[u] != ENULL) {
// 						// assert(ews.find(key) == ews.end());
// 						// if((edgeList + j)->src != old_src || (edgeList + j)->tgt !=
// 						// old_tgt) {
// 						// if(deg[u] > deg[v]) {
// 						//         uint32_t du = deg[u];
// 						//         uint32_t pu = pos[u];
// 						//         uint32_t pw = bins[du];
// 						//         uint32_t w = vert[pw];
// 						//         if(u != w) {
// 						//                 pos[u] = pw;
// 						//                 pos[w] = pu;
// 						//                 vert[pu] = w;
// 						//                 vert[pw] = u;
// 						//         }
// 						//         bins[du]++;
// 						//         deg[u]--;
// 						// }
// 						//}
// 						deg[u]--;
// 					}
// 					// std::cerr<<v<<"->"<<u<<": "<<deg[u]<<", "<<waves[u]<<"\n";
// 					// old_src = (edgeList + j)->src;
// 					// old_tgt = (edgeList + j)->tgt;
// 				}
// 			}
// 			// std::cerr<<"i: "<<i<<"\n";
// 		}
// 		// std::cerr<<"HERE 0\n";

// 		// printArray(deg, g.NODENUM+1);
// 		if (*std::min_element(deg + 1, deg + g.NODENUM + 1) == ENULL)
// 			break;

// 		reSort();
// 	} while (true);

// 	delete[] vert;
// 	delete[] pos;
// 	delete[] bins;
// }

uint32_t findWaves(uint32_t *deg, uint32_t *waves, uint32_t *levels, uint32_t mindeg, std::queue<uint32_t> &waveSize, uint32_t *node2label,
				   uint32_t logSize)
{
	uint32_t *working_indices = new uint32_t[g.NODENUM + 1];
	memcpy(working_indices, g.start_indices, (g.NODENUM + 1) * sizeof(uint32_t));

	std::queue<uint32_t> boundary;
	std::queue<uint32_t> waveboundary;
	std::queue<uint32_t> seed;
	boost::dynamic_bitset<> visited = boost::dynamic_bitset<>(g.NODENUM + 1);
	boost::dynamic_bitset<> inBoundary = boost::dynamic_bitset<>(g.NODENUM + 1);

	uint32_t tempWave = 1;
	uint32_t tempFrag = 1;

	/* find init seed*/
	for (uint32_t v = 1; v < g.NODENUM + 1; v ++) { // index start from 1
		if (deg[v] == mindeg) {
			visited[v] = 1;
			seed.push(v);
			waves[v] = tempWave;
			levels[v] = tempFrag;
		}
	}

	/* wave */
	while (!seed.empty()) {
		/* fragment */
		while (!seed.empty()) {
			/* find boundary */
			while (!seed.empty()) {
				uint32_t v = seed.front();
				seed.pop();
				for (uint32_t i = working_indices[v]; i <= g.end_indices[v]; i ++) {
					uint32_t u = (g.edgeList + i) -> tgt;
					deg[v] --;
					working_indices[v] ++;
					if (visited[u] == 0) {
						deg[u] --;
						if (inBoundary[u] == 0) {
							inBoundary[u] = 1;
							boundary.push(u);
						}
					}
				}
			}

			tempFrag ++;
			/* find good boundary */
			while (!boundary.empty()) {
				uint32_t v = boundary.front();
				boundary.pop();
				inBoundary[v] = 0;

				/* swap adj list */
				uint32_t v_working = working_indices[v];
				uint32_t v_end = g.end_indices[v];
				for (uint32_t i = v_working; i <= v_end; i ++) {
					if (v_end - working_indices[v] + 1 == deg[v]) { // swap done
						break;
					}
					uint32_t u = (g.edgeList + i) -> tgt;

					// if (node2label[v] == 426) {
					// 	std::cout << node2label[v] << "," << node2label[u] << "," << tempFrag << "\n";
					// }

					if (visited[u] == 1 && levels[u] != tempFrag) { // edge eaten from u to v
						uint32_t w = (g.edgeList + working_indices[v]) -> tgt;
						(g.edgeList + working_indices[v]) -> tgt = u;
						(g.edgeList + i) -> tgt = w;
						working_indices[v] ++;
						// if (node2label[v] == 426) {
						// 	std::cout << "swap" << node2label[u] << "," << node2label[w] << "\n";
						// }
					}
				}
				/* check left over deg */
				if (deg[v] < mindeg) {
					if (visited[v] == 0) {
						visited[v] = 1;
						// if (node2label[v] == 191) {
						// 	std::cout << "v191: boundary" << tempWave << "," << tempFrag << "\n";
						// }
						seed.push(v);
						waves[v] = tempWave;
						levels[v] = tempFrag;
					}
				}
				if (deg[v] == mindeg) {
					waveboundary.push(v);
				}
			}
		}

		waveSize.push(tempFrag);
		tempFrag = 1;
		tempWave ++;
		/* new seed set */
		while (!waveboundary.empty()) {
			uint32_t v = waveboundary.front();
			waveboundary.pop();

			if (deg[v] == mindeg) {
				if (visited[v] == 0) {
					visited[v] = 1;
					// if (node2label[v] == 191) {
					// 	std::cout << "v191: seed" << tempWave << "," << tempFrag << "\n";
					// }
					seed.push(v);
					waves[v] = tempWave;
					levels[v] = tempFrag;
				}
			}
		}
	}

	for (uint32_t v = 1; v <= g.NODENUM; v ++) { // index start from 1
		assert(working_indices[v] == g.end_indices[v] + 1);
	}

	// for (uint32_t v = 1; v <= g.NODENUM; v ++) { // index start from 1
	// 	if (working_indices[v] != g.end_indices[v] + 1) {
	// 		std::cout << "error" << node2label[v] << "\n";
	// 		// break;
	// 		exit(1);
	// 	}
	// 	std::cout << node2label[v] << "," << waves[v] << "," << levels[v] << "\n";
	// }

	// for (uint64_t i = 0; i < g.EDGENUM; i ++) {
	// 	uint32_t src = (g.edgeList + i) -> src;
	// 	uint32_t tgt = (g.edgeList + i) -> tgt;
	// 	uint32_t tWave = 0;
	// 	uint32_t tFrag = 0;
	// 	if (waves[src] < waves[tgt]) {
	// 		tWave = waves[src];
	// 		tFrag = levels[src];
	// 	}
	// 	else if (waves[src] == waves[tgt]) {
	// 		tWave = waves[src];
	// 		if (levels[src] <= levels[tgt]) {
	// 			tFrag = levels[src];
	// 		}
	// 		else {
	// 			tFrag = levels[tgt];
	// 		}
	// 	} else {
	// 		tWave = waves[tgt];
	// 		tFrag = levels[tgt];
	// 	}
	// 	std::cout << node2label[src] << "," << node2label[tgt] << "," << tWave << "," << tFrag << "\n";
	// }

	delete working_indices;

	return tempWave;
}

// void buildWavesAndLabel(std::ofstream &outputFile, uint32_t *waves, uint32_t *levels,
//                         uint32_t *ccs, uint32_t *startwave, uint32_t *startlevel)
// { //, uint32_t *metanodes) {
// 	// uint32_t maxlevel = 0;
// 	for (uint32_t i = 0; i < g.EDGENUM; i++) {
// 		uint32_t src = (g.edgeList + i)->src;
// 		uint32_t tgt = (g.edgeList + i)->tgt;
// 		auto key = std::pair<uint32_t, uint32_t>(src, tgt);
// 		uint32_t wave = ews[key].first;
// 		boost::add_edge(src, tgt, G[wave]);
// 		waves[i] = wave;
// 		levels[i] = ews[key].second;
// 		// if (levels[i] > maxlevel) maxlevel = levels[i];
// 		ews[key].first = i;
// 	}
// 	// uint32_t mnode = 0;
// 	for (auto gr = G.begin(); gr != G.end(); gr++) {
// 		uint32_t wave = gr->first;
// 		uint32_t NODENUM = boost::num_vertices(gr->second);

// 		std::vector<uint32_t> components(NODENUM);
// 		uint32_t num = boost::connected_components(gr->second, &components[0]);
// 		uint32_t *compVerts = new uint32_t[num];
// 		uint32_t *compEdges = new uint32_t[num];
// 		uint32_t *compLevel = new uint32_t[num];
// 		std::fill_n(compVerts, num, 0);
// 		std::fill_n(compEdges, num, 0);
// 		std::fill_n(compLevel, num, 0);
// 		// for(uint32_t i = 0; i < g.EDGENUM; i++) {
// 		//     uint32_t src = (g.edgeList + i)->src;
// 		//     uint32_t tgt = (g.edgeList + i)->tgt;
// 		//     // auto cedge = boost::edge(src,tgt,gr->second);
// 		//     auto key = std::pair<uint32_t, uint32_t>(src,tgt);
// 		//     if (ews[key].first == wave) {
// 		//         num_edges++;
// 		//         waves[i] = wave;
// 		//         levels[i] = ews[key].second;
// 		//         assert(components[src] == components[tgt]);
// 		//         ccs[i] = components[src];
// 		//         compEdges[components[src]]++;
// 		//         if (src != prevSrc) {
// 		//             num_verts++;
// 		//             compVerts[components[src]]++;
// 		//             if (levels[i] > compLevel[components[src]])
// 		//                 compLevel[components[src]] = levels[i];
// 		//         }
// 		//         prevSrc = src;
// 		//     }
// 		// }

// 		auto level_efreq = new std::unordered_map<uint32_t, uint32_t>[num];
// 		auto level_vfreq = new std::unordered_map<uint32_t, uint32_t>[num];
// 		auto source_freq = new std::unordered_map<uint32_t, uint32_t>[num];
// 		auto vert_level = new std::unordered_map<uint32_t, uint32_t>[NODENUM];
// 		// for (uint32_t i = 0; i<num; i++) {
// 		//     level_efreq[i] = new uint32_t[maxlevel+1];
// 		//     level_vfreq[i] = new uint32_t[maxlevel+1];
// 		//     std::fill_n(level_efreq[i], maxlevel+1, 0);
// 		//     std::fill_n(level_vfreq[i], maxlevel+1, 0);
// 		// }
// 		uint32_t num_edges = 0;
// 		uint32_t num_verts = 0;
// 		uint32_t prevSrc = -1;
// 		// uint32_t maxLevel = 0;
// 		boost::graph_traits<graph_t>::edge_iterator ei, ei_end;
// 		for (boost::tie(ei, ei_end) = boost::edges(gr->second); ei != ei_end; ++ei) {
// 			uint32_t src = boost::source(*ei, gr->second);
// 			uint32_t tgt = boost::target(*ei, gr->second);
// 			auto key = std::pair<uint32_t, uint32_t>(src, tgt);
// 			assert(components[src] == components[tgt]);
// 			num_edges++;
// 			compEdges[components[src]]++;
// 			uint32_t i = ews[key].first;
// 			ccs[i] = components[src];
// 			level_efreq[components[src]][levels[i]]++;
// 			if (src != prevSrc) {
// 				num_verts++;
// 				compVerts[components[src]]++;
// 			}
// 			prevSrc = src;
// 			if (vert_level[src][levels[i]] == 0) {
// 				if (startwave[src] == wave && startlevel[src] == levels[i])
// 					source_freq[components[src]][levels[i]]++;
// 				// if (startwave[src] > wave && startlevel[src] == 1)
// 				//         source_freq[components[src]][num-1]++;
// 				level_vfreq[components[src]][levels[i]]++;
// 				if (levels[i] > compLevel[components[src]])
// 					compLevel[components[src]] = levels[i];
// 				vert_level[src][levels[i]] = 1;
// 			}
// 			// if (levels[i] > maxLevel)
// 			//         maxLevel = levels[i];
// 		}

// 		outputFile << '"' << wave << '"' << ": {\n";
// 		for (uint32_t i = 0; i < num; i++) {
// 			if (compEdges[i] < 1)
// 				continue;
// 			outputFile << "\t\"" << i << "\": {\n";
// 			outputFile << "\t\t\"vertices\":" << compVerts[i] << ",\n";
// 			outputFile << "\t\t\"edges\":" << compEdges[i] / 2 << ",\n";
// 			// outputFile<<"\t\t\"levels\":"<<compLevel[i]<<"\n\t},\n";
// 			outputFile << "\t\t\"fragments\": {\n";
// 			uint32_t last = compLevel[i];
// 			// if (wave != G.begin()->first && last == maxLevel)
// 			//         last++;
// 			// uint32_t ssum = compVerts[i];
// 			for (uint32_t j = 1; j <= last; j++) {
// 				// if (j < last)
// 				//         ssum -= source_freq[i][j];
// 				outputFile << "\t\t\t\"" << j - 1 << "\": {\n";
// 				outputFile << "\t\t\t\t\"sources\":"
// 				           << (j <= compLevel[i] ? source_freq[i][j]
// 				                                 : source_freq[i][num - 1])
// 				           << ",\n";
// 				outputFile << "\t\t\t\t\"vertices\":" << level_vfreq[i][j]
// 				           << ",\n";
// 				outputFile << "\t\t\t\t\"edges\":" << level_efreq[i][j] / 2
// 				           << "\n\t\t\t}";
// 				if (j < last)
// 					outputFile << ',';
// 				outputFile << '\n';
// 			}
// 			outputFile << "\t\t}\n\t},\n";
// 		}
// 		outputFile << "\t\"vertices\":" << num_verts << ",\n";
// 		outputFile << "\t\"edges\":" << num_edges / 2 << "\n},\n";
// 	}
// }

void buildWavesAndLabel(std::ofstream &outputFile, std::ostream &outputSizeFile, uint32_t *waves, uint32_t *levels,
                        uint32_t *ccs, uint32_t *startwave, uint32_t *startlevel,
						uint32_t waveNum, std::queue<uint32_t> &waveSize, long long &algorithmTime, long long &writeTime,
						uint32_t *node2label, uint32_t logSize)
{
	uint32_t *working_indices = new uint32_t[g.NODENUM + 1];
	memcpy(working_indices, g.start_indices, (g.NODENUM + 1) * sizeof(uint32_t));

	uint32_t *ccworking_indices = new uint32_t[g.NODENUM + 1];
	memcpy(ccworking_indices, g.start_indices, (g.NODENUM + 1) * sizeof(uint32_t));

	uint32_t NODENUM = 0;
	boost::dynamic_bitset<> verts(g.NODENUM + 1);
	std::vector<uint32_t> rank(g.NODENUM + 1);
	std::vector<uint32_t> parent(g.NODENUM + 1);
	boost::disjoint_sets<uint32_t *, uint32_t *> ds(&rank[0], &parent[0]);
	std::vector<uint32_t> ds2int(g.NODENUM + 1);
	std::vector<uint32_t> int2ds(g.NODENUM + 1);
	uint32_t dsNum = 1;

	// std::vector<uint32_t> srcCnt(waveNum + 1);
	// std::vector<uint32_t> sumSrcCnt(waveNum + 1);
	// std::vector<uint32_t> extEdgeCnt(waveNum + 1);
	// std::vector<uint32_t> nxtEdgeCnt(waveNum + 1);

	for (uint32_t tempWave = 1; tempWave < waveNum; tempWave ++) {
		// std::cout << "wave:" << tempWave <<"\n";
		uint32_t fragNum = waveSize.front();
		waveSize.pop();
		// graph_t G;

		NODENUM = 0;
		verts.reset();
		std::fill(rank.begin(), rank.end(), 0);
		std::fill(parent.begin(), parent.end(), 0);
		std::fill(ds2int.begin(), ds2int.end(), 0);
		std::fill(int2ds.begin(), int2ds.end(), 0);
		dsNum = 1;

		for (uint32_t v = 1; v <= g.NODENUM; v ++) {

			// if (startwave[v] == tempWave) {
			// 	if (verts[v] == 0) {
			// 		verts[v] = 1;
			// 		NODENUM ++;
			// 		ds.make_set(v);
			// 		// if (tempWave == 9) {
			// 		// 	std::cout << "makeset" << node2label[v] << "," << v << "," << ds.find_set(v) << "\n";
			// 		// }
			// 	}
			// }
			while (working_indices[v] <= g.end_indices[v]) {
				uint32_t u = (g.edgeList + working_indices[v]) -> tgt;
				if (startwave[v] > tempWave && startwave[u] > tempWave) {
					break; // edge is not in current wave, leave for next.
				}
				if (verts[v] == 0) {
					verts[v] = 1;
					NODENUM ++;
					ds.make_set(v);
					// if (tempWave == 9) {
					// 	std::cout << "makeset" << node2label[v] << "," << v << "," << ds.find_set(v) << "\n";
					// }
				}
				if (verts[u] == 0) {
					verts[u] = 1;
					NODENUM ++;
					ds.make_set(u);
					// if (tempWave == 9) {
					// 	std::cout << "makeset" << node2label[u] << "," << u << "," << ds.find_set(u) << "\n";
					// }
				}
				waves[working_indices[v]] = tempWave;
				if (startwave[v] > tempWave) {
					// v is not a src of tempWave
					levels[working_indices[v]] = startlevel[u];
					// ++ extEdgeCnt[tempWave];
					// if (startwave[v] == tempWave + 1) {
					// 	++ nxtEdgeCnt[tempWave];
					// }
				}
				else if (startwave[u] > tempWave) {
					// u is not a src of tempWave
					levels[working_indices[v]] = startlevel[v];
					// ++ extEdgeCnt[tempWave];
					// if (startwave[v] == tempWave + 1) {
					// 	++ nxtEdgeCnt[tempWave];
					// }
				}
				else {
					// u and v are src of tempWave, compare frag(u), frag(v)
					levels[working_indices[v]] = startlevel[v] <= startlevel[u] ? startlevel[v] : startlevel[u];
				}
				working_indices[v] ++;
				
				// boost::add_edge(v, u, G);
				uint32_t uSet = ds.find_set(u);
				uint32_t vSet = ds.find_set(v);
				if (uSet != vSet) {
					ds.link(uSet, vSet);
					// if (tempWave == 9) {
					// 	std::cout << "union" << node2label[v] << "," << node2label[u] << "," << ds.find_set(v) << "," << ds.find_set(u) << "\n";
					// }
				}
			}
		}

		uint32_t vSet;
		for (uint32_t v = 1; v <= g.NODENUM; v ++) {
			if (verts[v]) {
				vSet = ds.find_set(v);
				if (ds2int[vSet] == 0) {
					int2ds[dsNum] = vSet;
					ds2int[vSet] = dsNum ++;
				}
				// if (tempWave == 9){
				// 	std::cout << node2label[v] << "," << v << "," << vSet << "\n";
				// }
			}
		}

		// std::cout << "ds done:" << dsNum << "\n";

		// uint32_t NODENUM = boost::num_vertices(G);

		// std::vector<uint32_t> components(NODENUM);
		// uint32_t num = boost::connected_components(G, &components[0]);
		uint32_t *compVerts = new uint32_t[dsNum];
		uint32_t *compEdges = new uint32_t[dsNum];
		uint32_t *compLevel = new uint32_t[dsNum];
		std::fill_n(compVerts, dsNum, 0);
		std::fill_n(compEdges, dsNum, 0);
		std::fill_n(compLevel, dsNum, 0);

		uint32_t * compExtEdges = new uint32_t[dsNum];
		uint32_t * compNxtEdges = new uint32_t[dsNum];
		std::fill_n(compExtEdges, dsNum, 0);
		std::fill_n(compNxtEdges, dsNum, 0);

		// auto level_efreq = new std::unordered_map<uint32_t, uint32_t>[num];  // NOTE: remember to delete[]
		// auto level_vfreq = new std::unordered_map<uint32_t, uint32_t>[num];
		// auto source_freq = new std::unordered_map<uint32_t, uint32_t>[num];
		// auto vert_level = new std::unordered_map<uint32_t, uint32_t>[NODENUM];

		std::vector<std::vector<uint32_t>> level_efreq(dsNum, std::vector<uint32_t>(fragNum + 1, 0));
		std::vector<std::vector<uint32_t>> level_vfreq(dsNum, std::vector<uint32_t>(fragNum + 1, 0));
		std::vector<std::vector<uint32_t>> source_freq(dsNum, std::vector<uint32_t>(fragNum + 1, 0));
		// std::vector<std::vector<uint32_t>> vert_level(NODENUM, std::vector<uint32_t>(fragNum + 1, 0));
		
		uint32_t num_edges = 0;
		uint32_t num_verts = 0;

		for (uint32_t v = 1; v <= g.NODENUM; v ++) {
			// std::cout << node2label[v] << "\n";
			// std::cout << ccworking_indices[v] << "," << working_indices[v] << "\n";
			if (ccworking_indices[v] < working_indices[v]) {
				uint32_t cc = ds2int[ds.find_set(v)];
				num_verts ++;
				compVerts[cc] ++;
				uint32_t tempLevel = ENULL;
				while (ccworking_indices[v] < working_indices[v]) {
					uint32_t u = (g.edgeList + ccworking_indices[v]) -> tgt;

					assert(cc == ds2int[ds.find_set(u)]);
					num_edges ++;
					compEdges[cc] ++;
					ccs[ccworking_indices[v]] = node2label[int2ds[cc]];
					level_efreq[cc][levels[ccworking_indices[v]]] ++;

					if (startwave[u] > tempWave) {
						++ compExtEdges[cc];
						if (startwave[u] == tempWave + 1) {
							++ compNxtEdges[cc];
						}
					}
					if (startwave[v] > tempWave) {
						++ compExtEdges[cc];
						if (startwave[v] == tempWave + 1) {
							++ compNxtEdges[cc];
						}
					}

					if (tempLevel != levels[ccworking_indices[v]]) {
						tempLevel = levels[ccworking_indices[v]];
						if (startwave[v] == tempWave && startlevel[v] == levels[ccworking_indices[v]])
							source_freq[cc][levels[ccworking_indices[v]]]++;
						// if (startwave[src] > wave && startlevel[src] == 1)
						//         source_freq[components[src]][num-1]++;
						level_vfreq[cc][levels[ccworking_indices[v]]]++;
						// std::cout<< node2label[v] << "," << tempWave << "," << tempLevel - 1 << "\n";
						if (levels[ccworking_indices[v]] > compLevel[cc])
							compLevel[cc] = levels[ccworking_indices[v]];
					}

					// if (vert_level[v][levels[ccworking_indices[v]]] == 0) {
					// 	if (startwave[v] == tempWave && startlevel[v] == levels[ccworking_indices[v]])
					// 		source_freq[cc][levels[ccworking_indices[v]]]++;
					// 	// if (startwave[src] > wave && startlevel[src] == 1)
					// 	//         source_freq[components[src]][num-1]++;
					// 	level_vfreq[cc][levels[ccworking_indices[v]]]++;
					// 	if (levels[ccworking_indices[v]] > compLevel[cc])
					// 		compLevel[cc] = levels[ccworking_indices[v]];
					// 	vert_level[v][levels[ccworking_indices[v]]] = 1;
					// }
					ccworking_indices[v] ++;
				}
			}
		}

		algorithmTime += getTimeElapsed();
		reset();

		// std::cout << "label done\n";

		// outputFile << '"' << tempWave << '"' << ": {\n";
		for (uint32_t i = 1; i < dsNum; i++) {
			if (compEdges[i] < 1)
				continue;
			// outputFile << "\t\"" << i << "\": {\n";
			// outputFile << "\t\t\"vertices\":" << compVerts[i] << ",\n";
			// outputFile << "\t\t\"edges\":" << compEdges[i] / 2 << ",\n";
			// outputFile << "\t\t\"extEdges\":" << compExtEdges[i] / 2 << ",\n";
			// outputFile << "\t\t\"nxtEdges\":" << compNxtEdges[i] / 2 << ",\n";
			// // outputFile<<"\t\t\"levels\":"<<compLevel[i]<<"\n\t},\n";

			outputFile << tempWave <<"," << int2ds[i] << "," << node2label[int2ds[i]]
					   << "," << compVerts[i]
					   << "," << compEdges[i] / 2
					   << "," << compExtEdges[i] / 2
					   << "," << compNxtEdges[i] / 2
					   << ",";
			// // outputFile<<"\t\t\"levels\":"<<compLevel[i]<<"\n\t},\n";
			// outputFile << "\t\t\"fragments\": {\n";
			uint32_t last = compLevel[i];
			// // if (wave != G.begin()->first && last == maxLevel)
			// //         last++;
			// // uint32_t ssum = compVerts[i];
			for (uint32_t j = 1; j <= last; j++) {
				assert(j <= compLevel[i]);
				// // if (j < last)
				// //         ssum -= source_freq[i][j];
				// outputFile << "\t\t\t\"" << j - 1 << "\": {\n";
				// outputFile << "\t\t\t\t\"sources\":"
				//            << source_freq[i][j]
				//            << ",\n";
				// outputFile << "\t\t\t\t\"vertices\":" << level_vfreq[i][j]
				//            << ",\n";
				// outputFile << "\t\t\t\t\"edges\":" << level_efreq[i][j] / 2
				//            << "\n\t\t\t}";
				outputFile << source_freq[i][j]
				           << "_"
				           << level_vfreq[i][j]
				           << "_"
						   << level_efreq[i][j] / 2;
				if (j < last)
				{
					// outputFile << ',';
					outputFile << "_";
				}
				// outputFile << '\n';
			}
			// outputFile << "\t\t}\n\t},\n";
			outputFile << "\n";
		}
		outputSizeFile << tempWave << "," << num_verts << "," << num_edges / 2 << "\n";

		writeTime += getTimeElapsed();
		reset();

		delete[] compVerts;
		delete[] compEdges;
		delete[] compLevel;
		delete[] compExtEdges;
		delete[] compNxtEdges;

		// delete[] level_efreq;
		// delete[] level_vfreq;
		// delete[] source_freq;
		// delete[] vert_level;
	}

	delete[] working_indices;
	delete[] ccworking_indices;
}

void writeToFile(const std::string &prefix, uint32_t *node2label, uint32_t *waves,
                 uint32_t *levels, uint32_t *ccs, uint32_t *startwave, uint32_t *startlevel,
				 uint32_t logSize)
{ //, uint32_t *metanodes) {
	std::ofstream outputFile;
	// outputFile.open(prefix+"-metaedges.csv");
	// [> outputFile<<"# source_metanode,target_metanode\n"; <]
	// std::unordered_map<std::pair<uint32_t, uint32_t>, bool,
	// boost::hash<std::pair<uint32_t, uint32_t>>> map; for(uint32_t i = 0;
	// i < g.EDGENUM; i++) {
	//     uint32_t src = metanodes[(g.edgeList + edgeIndices[i])->src];
	//     uint32_t tgt = metanodes[(g.edgeList + edgeIndices[i])->tgt];
	//     if (src == tgt) {
	//         continue;
	//     }
	//     std::pair<uint32_t, uint32_t> key = std::make_pair(std::min(src,
	//     tgt),std::max(src, tgt)); auto m = map.find(key); if (m == map.end()) {
	//         outputFile << src << "," << tgt << "\n";
	//         map[key] = true;
	//     }
	// }
	// outputFile.close();
	outputFile.open(prefix + "-wave-sources.csv");
	for (uint32_t i = 1; i <= g.NODENUM; i++) {
		assert (startwave[i] != 0);
		if (startwave[i] != 0)
			outputFile << node2label[i] << "," << startwave[i] << ","
			           << startlevel[i] - 1 << "\n";
	}
	outputFile.close();
	outputFile.open(prefix + "-waves.csv");
	/* outputFile<<"# vertex,level,wave,wave_connected_component,meta_node\n"; */
	// for(uint32_t i = 1; i <= g.NODENUM; i++) {
	//     outputFile << node2label[i] << "," << levels[i] << "," << waves[i] << "," <<
	//     ccs[i] << "," << metanodes[i] <<"\n";
	// }
	for (uint32_t i = 0; i < g.EDGENUM; i++) {
		uint32_t src = (g.edgeList + i)->src;
		uint32_t tgt = (g.edgeList + i)->tgt;
		outputFile << node2label[src] << "," << node2label[tgt] << "," << waves[i]
		           << "," << ccs[i] << "," << levels[i] - 1 << "\n";
	}
	outputFile.close();
}

void writeMetaData(std::string prefix, uint32_t NODENUM, uint32_t EDGENUM, uint32_t maxdeg,
                   long long preprocessingTime, long long waveTime, long long labelTime, long long writeTime)
{
	std::ofstream outputFile;
	outputFile.open(prefix + "-wavedecomp-info.json");
	outputFile << "{\n";
	outputFile << "\"vertices\":" << NODENUM << ",\n";
	outputFile << "\"edges\":" << EDGENUM << ",\n";
	outputFile << "\"preprocessing-time\":" << preprocessingTime << ",\n";
	outputFile << "\"wave-time\":" << waveTime << ",\n";
	outputFile << "\"label-time\":" << labelTime << ",\n";
	outputFile << "\"write-time\":" << writeTime << ",\n";
	outputFile << "\"maxdeg\":" << maxdeg << "\n}";
	outputFile.close();
}

void initNodeMap(char *inputFile, uint32_t *node2label)
{ //, uint32_t *label2node) {
	std::ifstream is(inputFile, std::ios::in | std::ios::binary);
	uint32_t label, cc;
	for (uint32_t i = 1; i <= g.NODENUM; i++) {
		is.read((char *)(&label), sizeof(uint32_t));
		is.read((char *)(&cc), sizeof(uint32_t));
		node2label[i] = label;
		// label2node[label] = i;
	}
}

void writeWaveMetaData(std::ofstream &outputFile, uint32_t wave, uint32_t NODENUM,
                       uint32_t EDGENUM)
{
	outputFile << '"' << wave << '"' << ": {\n";
	outputFile << "\t\"vertices\":" << NODENUM << ",\n";
	outputFile << "\t\"edges\":" << EDGENUM / 2 << "\n},\n";
}

int main(int argc, char *argv[])
{
	if (argc < 6) {
		std::cerr
		        << argv[0]
		        << ": usage: ./wave <path to layers dir> <layer file> <layer> <# edges> <# "
		           "nodes> <largest node label>\n";
		exit(1);
	}
	std::string prefix = argv[1];
	std::string prefixx = prefix.substr(0, prefix.length() - 7) + "_waves/layer-" + argv[3];
	// std::ofstream outputFile(prefixx + "-waves-info.json");
	std::ofstream outputFile(prefixx + "-waves-info.csv");
	std::ofstream outputSizeFile(prefixx + "-waves-size-info.csv");
	// outputFile << "{\n";
	g.EDGENUM = atol(argv[4]);
	g.NODENUM = atol(argv[5]);
	uint32_t logSize = argc >= 7 ? atol(argv[7]) : 100000000;
	reset();
	uint32_t *node2label = new uint32_t[g.NODENUM + 1];
	uint32_t *label2node = new uint32_t[atol(argv[6]) + 1];
	std::fill_n(label2node, atol(argv[6]) + 1, ENULL);
	/* initNodeMap(argv[6], node2label, label2node, atol(argv[8])); */
	readLayer(argv[2], label2node, node2label, atol(argv[3]), logSize);
	if (DEBUG)
		std::cout << "LOADED GRAPH " << g.EDGENUM << ", " << g.NODENUM << "\n";
	// uint32_t *originalIndices = new uint32_t[g.EDGENUM];
	// formatGraph(originalIndices);
	long long preprocessingTime = getTimeElapsed();
	reset();
	// if(DEBUG)
	//     std::cout<<"FORMATTED GRAPH\n";
	findStartAndEndIndices();
	if (DEBUG)
		std::cout << "START AND END INDICES COMPUTED\n";
	uint32_t *degree = new uint32_t[g.NODENUM + 1];
	uint32_t *startwave = new uint32_t[g.NODENUM + 1];
	uint32_t *startlevel = new uint32_t[g.NODENUM + 1];
	std::fill_n(startwave, g.NODENUM + 1, 0);
	std::fill_n(startlevel, g.NODENUM + 1, 0);
	/* uint32_t *degree = waves; */

	uint32_t mindeg = ENULL;
	uint32_t maxdeg = findDegree(degree, mindeg);
	assert(mindeg == atol(argv[3]));
	std::queue<uint32_t> waveSize;
	uint32_t waveNum = findWaves(degree, startwave, startlevel, mindeg, waveSize, node2label, logSize);
	long long waveAlgTime = getTimeElapsed();
	reset();
	if (DEBUG)
		std::cout << "Wave Done: " << waveAlgTime << "," << g.EDGENUM << "\n";
	uint32_t *ccs = new uint32_t[g.EDGENUM];
	// uint32_t *metanodes = new uint32_t[g.NODENUM + 1];
	uint32_t *waves = new uint32_t[g.EDGENUM];
	uint32_t *levels = new uint32_t[g.EDGENUM];
	std::fill_n(waves, g.EDGENUM, 0);
	std::fill_n(levels, g.EDGENUM, 0);

	long long algorithmTime = 0;
	long long writeTime = 0;
	buildWavesAndLabel(outputFile, outputSizeFile, waves, levels, ccs, startwave, startlevel, waveNum, waveSize, algorithmTime, writeTime, node2label, logSize);
	// long long algorithmTime = getTimeElapsed();
	// std::cout << "alg time: " << algorithmTime << "," << g.EDGENUM << "\n";
	if (DEBUG)
		std::cout << "Label Done: " << algorithmTime << "," << writeTime << "," << g.EDGENUM << "\n";

	// outputFile << "\"0\":{}\n}";
	outputFile.close();
	outputSizeFile.close();
	writeToFile(prefixx, node2label, waves, levels, ccs, startwave,
	            startlevel, logSize); //, metanodes);
	
	writeTime += getTimeElapsed();

	writeMetaData(prefixx, g.NODENUM, g.EDGENUM / 2, maxdeg, preprocessingTime,
	              waveAlgTime, algorithmTime, writeTime);
	/* printArray(waves, g.NODENUM+1); */
	delete[] degree;
	delete[] waves;
	delete[] levels;
	delete[] ccs;
	// delete [] metanodes;
	delete[] g.start_indices;
	delete[] g.end_indices;
	return 0;
}
