#include <iostream>
#include <fstream>
#include <algorithm>
#include <fcntl.h>
#include <unistd.h>
#include <sys/stat.h>
#include <sys/mman.h>
#include <sys/time.h>
#include <netinet/in.h>
#include <assert.h>
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <limits.h>
#include <unordered_map>
#include <boost/container_hash/hash.hpp>
#define DEBUG 1

#define BUFFER_NUM_EDGES ((unsigned int) 1<<25)
#define ENULL ((unsigned int) -1)

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
}g;

// Utility function to print a given array
template <class T>
void printArray(T *arr, unsigned int n) {
	for(unsigned int i = 0; i < n; i++) {
		std::cout<<arr[i]<<" ";
	}
	std::cout<<"\n";
}

long long currentTimeMilliS = 0;

long long currentTimeStamp() {
	struct timeval te;
	gettimeofday(&te, NULL); // get current time
	long long milliseconds = te.tv_sec*1000LL + te.tv_usec/1000; // calculate milliseconds
	return milliseconds;
}

void reset() {
	currentTimeMilliS = currentTimeStamp();
}

long long getTimeElapsed() {
	long long newTime = currentTimeStamp();
	long long timeElapsed = newTime - currentTimeMilliS;
	currentTimeMilliS = newTime;
	return timeElapsed;
}

// Memory maps input file
void createMemoryMap(char *fileName) {
	unsigned int binFile = open(fileName, O_RDWR);
	long fileSizeInByte;
	struct stat sizeResults;
	assert(stat(fileName, &sizeResults) == 0);
	fileSizeInByte = sizeResults.st_size;
	g.edgeList = (edge *)mmap(NULL, fileSizeInByte, PROT_READ | PROT_WRITE, MAP_SHARED, binFile, 0);
	close(binFile);
}

// In-memory edge list instead of memory mapped file
void createInMemoryEdgeList(const char *fileName) {
		g.edgeList = new edge[g.EDGENUM];
		std::ifstream is;
		is.open(fileName, std::ios::in | std::ios::binary);
		unsigned int src, tgt;
		/* unsigned int updatedEdgeNum = g.EDGENUM; */
		for(unsigned int i = 0; i < g.EDGENUM; i++) {
			is.read((char *)(&src), sizeof(unsigned int));
			is.read((char *)(&tgt), sizeof(unsigned int));
			assert(src != ENULL && src <= g.NODENUM);
			assert(tgt != ENULL && tgt <= g.NODENUM);
			(g.edgeList + i)->src = src;
			(g.edgeList + i)->tgt = tgt;

		}
		is.close();
}

void readLayer(const std::string &inputFile, unsigned int *label2node, unsigned int *node2label, unsigned int tlayer) {
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
		assert(iss>>src>>tgt>>layer);
		if (layer == tlayer) {
			/* std::cerr<<src<<", "<<tgt<<": "<<layer<<", "<<tlayer<<" | "<<label2node[src]<<", "<<label2node[tgt]<<"\n"; */
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

bool compareEdges(const edge& a, const edge& b) {
	if(a.src < b.src)
		return true;
	if(a.src == b.src) {
		if(a.tgt < b.tgt)
			return true;
	}
	return false;
}

// Compares indices according to their corresponding edges
int compareByEdges(const void * a, const void * b) {
	if ((g.edgeList + *(unsigned int *)a)->src < (g.edgeList + *(unsigned int *)b)->src)
		return -1;
	if ((g.edgeList + *(unsigned int *)a)->src == (g.edgeList + *(unsigned int *)b)->src){
		if ((g.edgeList + *(unsigned int *)a)->tgt < (g.edgeList + *(unsigned int *)b)->tgt)
			return -1;
		if ((g.edgeList + *(unsigned int *)a)->tgt == (g.edgeList + *(unsigned int *)b)->tgt)
			return 0;
		if ((g.edgeList + *(unsigned int *)a)->tgt > (g.edgeList + *(unsigned int *)b)->tgt)
			return 1;
	}
	if ((g.edgeList + *(unsigned int *)a)->src > (g.edgeList + *(unsigned int *)b)->src)
		return 1;
	return 0;
}

// Formats the graph by sorting it and tracing original indices in the graph
void formatGraph(unsigned int *originalIndices) {
	unsigned int *indices = new unsigned int[g.EDGENUM];
	for(unsigned int i = 0; i < g.EDGENUM; i++) {
		indices[i] = i;
	}
	qsort(indices, g.EDGENUM, sizeof(unsigned int), compareByEdges);
	for(unsigned int i = 0; i < g.EDGENUM; i++) {
		originalIndices[indices[i]] = i;
	}
	std::sort(g.edgeList, g.edgeList + g.EDGENUM, compareEdges);
	//qsort(g.edgeList, g.EDGENUM, sizeof(edge), compareByEdges);
	delete [] indices;
}

// Finds the start and end indices	of each node in the graph
void findStartAndEndIndices() {
	g.start_indices = new unsigned int[g.NODENUM + 1];
	g.end_indices = new unsigned int[g.NODENUM + 1];
	std::fill_n(g.start_indices, g.NODENUM + 1, 0);
	std::fill_n(g.end_indices, g.NODENUM + 1, 0);
	unsigned int i;
	unsigned int old = g.edgeList->src;
	g.start_indices[old] = 0;
	for(i = 0; i < g.EDGENUM; i++) {
			if((g.edgeList + i)->src != old) {
					g.end_indices[old] = i - 1;
					old = (g.edgeList + i)->src;
					g.start_indices[old] = i;
			}
	}
	g.end_indices[old] = i - 1;
}

// Computes the degree of each node in the graph
unsigned int findDegree(unsigned int *degree) {
	std::fill_n(degree, g.NODENUM + 1, 0);
	unsigned int max = 0;
	for(unsigned int i = 0; i < g.EDGENUM; i++) {
		degree[(g.edgeList + i)->src]++;
		degree[(g.edgeList + i)->tgt]++;
	}
	for(unsigned int i = 0; i < g.NODENUM + 1; i++) {
		degree[i] /= 2;
		if (degree[i] > max)
			max = degree[i];
	}
	return max;
}

void findWaves(unsigned int *deg, unsigned int *waves) {
	/* unsigned int * lodeg = new unsigned int[g.NODENUM + 1]; */
	/* lodeg[0] = 0; */

	unsigned int * vert = new unsigned int[g.NODENUM + 1];
	unsigned int * pos = new unsigned int[g.NODENUM + 1];
	unsigned int md = *std::max_element(deg, deg + g.NODENUM + 1);
	unsigned int * bins = new unsigned int[md + 1];
	/* for(unsigned int v = 1; v <= g.NODENUM; v++) { */
	/* 	freq[deg[v]]++; */
	/* 	lodeg[v] = deg[v]; */
	/* } */


	auto reSort = [vert, pos, bins, md, deg]() {
		std::fill_n(vert, g.NODENUM + 1, 0);
		std::fill_n(pos, g.NODENUM + 1, 0);
		std::fill_n(bins, md + 1, 0);
		for(unsigned int v = 1; v <= g.NODENUM; v++) {
			if (deg[v] != ENULL)
				bins[deg[v]]++;
		}
		unsigned int start = 1;
		for(unsigned int d = 0; d <= md; d++) {
			unsigned int num = bins[d];
			bins[d] = start;
			start += num;
		}
		for(unsigned int v = 1; v <= g.NODENUM; v++) {
			if (deg[v] != ENULL) {
				pos[v] = bins[deg[v]];
				vert[pos[v]] = v;
				bins[deg[v]]++;
			}
		}
		for(unsigned int d = md; d > 0; d--) {
			bins[d] = bins[d - 1];
		}
		bins[0] = 1;
	};
	reSort();
	//unsigned int old_src = -1, old_tgt = -1;
	
	unsigned int mindeg = deg[vert[1]];
	unsigned int wave = 0;
	unsigned int till;

	do {
		if (deg[vert[1]] == mindeg) {
			wave++;
			till = bins[mindeg+1]-1;
		} else {
			till = bins[mindeg]-1;
		}
		till = till == ENULL ? g.NODENUM + 1 : till;
		/* std::cerr<<"till: "<<till<<"\n"; */
		for(unsigned int i = 1; i <= till; i++) {
			/* std::cerr<<"i: "<<i<<"\n"; */
			unsigned int v = vert[i];
			/* std::cerr<<"i2: "<<i<<", "<<deg[v]<<"\n"; */
			// Do nothing if node doesn't exist in the graph
			if(g.start_indices[v] == 0 && g.end_indices[v] == 0) {
				;
			}
			else {
				/* std::cerr<<"i3: "<<i<<"\n"; */
				/* std::cerr<<v<<": "<<deg[v]<<", "<<waves[v]<<"\n"; */
				waves[v] = wave;
				deg[v] = ENULL;
				/* std::cerr<<v<<": "<<deg[v]<<", "<<waves[v]<<"\n"; */
				/* std::cerr<<"i4: "<<i<<"\n"; */

				for(unsigned int j = g.start_indices[v]; j <= g.end_indices[v]; j++) {
						
					/* std::cerr<<"i5j: "<<j<<"\n"; */
					unsigned int u = (g.edgeList + j)->tgt;
					/* std::cerr<<v<<"->"<<u<<": "<<deg[u]<<", "<<waves[u]<<"\n"; */

					if(deg[u] != ENULL) {
						//if((edgeList + j)->src != old_src || (edgeList + j)->tgt != old_tgt) {
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
					//old_src = (edgeList + j)->src;
					//old_tgt = (edgeList + j)->tgt;
				}
			}
			/* std::cerr<<"i: "<<i<<"\n"; */
		}
		/* std::cerr<<"HERE 0\n"; */

		/* printArray(deg, g.NODENUM+1); */
		if (*std::min_element(deg+1, deg + g.NODENUM + 1) == ENULL)
			break;

		reSort();
	} while (true);

	delete [] vert;
	delete [] pos;
	delete [] bins;
}


void labelEdgesAndCount(unsigned int *degree, unsigned int *edgefreq) {
	std::unordered_map<std::pair<unsigned int, unsigned int>,unsigned int,boost::hash<std::pair<unsigned int, unsigned int>>> map;
	/* unsigned int id = 0; */
	for(unsigned int i = 0; i < g.EDGENUM; i++) {
		unsigned int src = (g.edgeList + i)->src;
		unsigned int tgt = (g.edgeList + i)->tgt;
		unsigned int wave = degree[src];
		/* std::cerr<<src<<"-->"<<tgt<<" : "<<degree[src]<<"-->"<<degree[tgt]<<"\n"; */
		if (wave == degree[tgt]) {
			edgefreq[wave]++;
			continue;
		}
		/* std::pair<unsigned int, unsigned int> key = std::make_pair(degree[src],degree[tgt]); */
		/* std::pair<unsigned int, unsigned int> keyU = std::make_pair(degree[tgt],degree[src]); */
		/* std::unordered_map<std::pair<unsigned int, unsigned int>,unsigned int,boost::hash<std::pair<unsigned int, unsigned int>>>::iterator m = map.find(key); */
		/* std::unordered_map<std::pair<unsigned int, unsigned int>,unsigned int,boost::hash<std::pair<unsigned int, unsigned int>>>::iterator mU = map.find(keyU); */
		/* if (m != map.end() && mU != map.end()) { */
		/* 	edgeLabels[i] = m->second; */
		/* } else { */
		/* 	map[key] = id; */
		/* 	map[keyU] = id; */
		/* 	edgeLabels[i] = id; */
		/* 	id++; */
		/* } */
	}
}

void writeToFile(const std::string &prefix, unsigned int *edgeIndices, unsigned int*node2label, unsigned int *waves) {
	std::ofstream outputFile;
	/* outputFile.open(prefix+"-wave-metaedges.csv"); */
	outputFile.open(prefix+"-edgesToWaves.csv");
	outputFile<<"# source_vertex,target_vertex,source_wave,target_wave\n";
	for(unsigned int i = 0; i < g.EDGENUM; i++) {
		unsigned int src = (g.edgeList + edgeIndices[i])->src;
		unsigned int tgt = (g.edgeList + edgeIndices[i])->tgt;
		outputFile<<node2label[src]<<","<<node2label[tgt]<<","<<waves[src]<<","<<waves[tgt]<<"\n";
	}
	outputFile.close();
	/* outputFile.open(prefix+"-wave-nodes.csv"); */
	/* for(unsigned int i = 1; i <= g.NODENUM; i++) { */
	/* 	outputFile<<node2label[i]<<","<<waves[i]<<"\n"; */
	/* } */
	/* outputFile.close(); */
}

void writeMetaData(std::string prefix, unsigned int NODENUM, unsigned int EDGENUM, unsigned int maxdeg, long long preprocessingTime, long long algorithmTime) {
	std::ofstream outputFile;
	outputFile.open(prefix+"-decomp-info.json");
	outputFile<<"{\n";
	outputFile<<"\"vertices\":"<<NODENUM<<",\n";
	outputFile<<"\"edges\":"<<EDGENUM<<",\n";
	outputFile<<"\"maxdeg\":"<<maxdeg<<",\n";
	outputFile<<"\"preprocessing-time\":"<<preprocessingTime<<",\n";
	outputFile<<"\"algorithm-time\":"<<algorithmTime<<"\n}";
	outputFile.close();
}

void initNodeMap(char *inputFile, unsigned int *node2label, unsigned int *label2node, unsigned int numnodes) {
	std::ifstream is(inputFile);
	unsigned int label;
	for(unsigned int i = 1; i <= numnodes; i++) {
		is >> label;
		node2label[i] = label;
		label2node[label] = i;
	}
}

void writeWaveMetaData(std::ofstream &outputFile, unsigned int wave, unsigned int NODENUM, unsigned int EDGENUM) {
	outputFile<<'"'<<wave<<'"'<<": {\n";
	outputFile<<"\t\"vertices\":"<<NODENUM<<",\n";
	outputFile<<"\t\"edges\":"<<EDGENUM/2<<"\n},\n";
}

int main(int argc, char *argv[]) {
	if (argc < 9) {
		std::cerr<<argv[0]<<": usage: ./wave <path to layers dir> <layer file> <layer> <# edges> <# nodes> <path to graph.nodemap> <largest node label> <# nodes in nodemap>\n";
		exit(1);
	}
	std::string prefix = argv[1];
	std::string prefixx = prefix.substr(0,prefix.length()-7)+"_waves/layer"+argv[3];
	std::ofstream outputFile(prefixx+"-waves-info.json");
	outputFile<<"{\n";
	g.EDGENUM = atol(argv[4]);
	g.NODENUM = atol(argv[5]);
	reset();
	unsigned int *node2label = new unsigned int[g.NODENUM+1];
	unsigned int *label2node = new unsigned int[atol(argv[7])+1];
	std::fill_n(label2node, atol(argv[7])+1, ENULL);
	/* initNodeMap(argv[6], node2label, label2node, atol(argv[8])); */
	readLayer(argv[2], label2node, node2label, atol(argv[3]));
	if(DEBUG)
		std::cout<<"LOADED GRAPH "<<g.EDGENUM<<", "<<g.NODENUM<<"\n";
	unsigned int *originalIndices = new unsigned int[g.EDGENUM];
	formatGraph(originalIndices);
	long long preprocessingTime = getTimeElapsed();
	reset();
	if(DEBUG)
		std::cout<<"FORMATTED GRAPH\n";
	findStartAndEndIndices();
	if(DEBUG)
		std::cout<<"START AND END INDICES COMPUTED\n";
	unsigned int *degree = new unsigned int[g.NODENUM + 1];
	unsigned int *waves = new unsigned int[g.NODENUM + 1];
	std::fill_n(waves, g.NODENUM+1, 0);
	/* unsigned int *degree = waves; */
	unsigned int maxdeg = findDegree(degree);
	/* std::copy(degree, degree + g.NODENUM + 1, waves); */
	unsigned int *core = new unsigned int[g.NODENUM + 1];
	findWaves(degree, waves);
	std::copy(waves, waves + g.NODENUM + 1, core);
	std::sort(core,core+g.NODENUM+1);
	unsigned int *vertfreq = new unsigned int[core[g.NODENUM]+1];
	std::fill_n(vertfreq, core[g.NODENUM]+1, 0);
	unsigned int *edgefreq = new unsigned int[core[g.NODENUM]+1];
	std::fill_n(edgefreq, core[g.NODENUM]+1, 0);
	labelEdgesAndCount(waves, edgefreq);
	long long algorithmTime = getTimeElapsed();
	for (unsigned int i = 1; i <= g.NODENUM; i++) {
		vertfreq[waves[i]]++;
	}
	for (unsigned int i = 1; i <= core[g.NODENUM]; i++) {
		if (edgefreq[i] > 0 || vertfreq[i] > 0)
			writeWaveMetaData(outputFile, i, vertfreq[i], edgefreq[i]);
	}
	outputFile<<"\"0\":{}\n}";
	outputFile.close();
	writeToFile(prefixx, originalIndices, node2label, waves);
	writeMetaData(prefixx, atol(argv[5]), atol(argv[4])/2, maxdeg, preprocessingTime, algorithmTime);
	/* printArray(waves, g.NODENUM+1); */
	delete [] core;
	delete [] degree;
	delete [] waves;
	delete [] g.start_indices;
	delete [] g.end_indices;
	return 0;
}
