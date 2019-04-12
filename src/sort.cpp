#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <cstring>
#include <algorithm>
#include <assert.h>
#include <netinet/in.h>
#include <unordered_map>
#include <boost/dynamic_bitset.hpp>
#define DEBUG (1)

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

boost::dynamic_bitset<> verts;
unsigned int maxlabel = 0;

void readGraph(const std::string &inputFile, unsigned int numedges, bool dounion) {
	verts = boost::dynamic_bitset<>(2*numedges);
	if (dounion)
		numedges += numedges;
	g.edgeList = new edge[numedges];
	std::ifstream is;
	is.open(inputFile);
	unsigned int src, tgt;
	unsigned int edge = 0;
	std::string line;
	while (std::getline(is, line)) {
		if (line[0] == '#')
			continue;
		std::istringstream iss(line);
		assert(iss>>src>>tgt);
		(g.edgeList + edge)->src = src;
		(g.edgeList + edge)->tgt = tgt;
		edge++;
		verts[src] = 1;
		verts[tgt] = 1;
		if (dounion) {
			(g.edgeList + edge)->src = tgt;
			(g.edgeList + edge)->tgt = src;
			edge++;
		}
		if (src > maxlabel)
			maxlabel = src;
		if (tgt > maxlabel)
			maxlabel = tgt;
	}
	g.EDGENUM = edge;
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

void writeToFile(const std::string &prefix) {
	std::ofstream outputFile;
	outputFile.open(prefix+".nodemap", std::ios::out | std::ios::binary);
	unsigned int *label2node = new unsigned int[maxlabel + 1];
	unsigned int j = 1;
	for (boost::dynamic_bitset<>::size_type i = 0; i < verts.size(); i++) {
		if (verts[i]) {
			// unsigned int out = ntohl(i);
			outputFile.write((char *)(&i), sizeof(unsigned int));
			label2node[i] = j++;
		}
	}
	outputFile.close();
	outputFile.open(prefix+".bin", std::ios::out | std::ios::binary);
	unsigned int psrc = -1;
	unsigned int ptgt = -1;
	for(unsigned int i = 0; i < g.EDGENUM; i++) {
		unsigned int src = (g.edgeList + i)->src;
		unsigned int tgt = (g.edgeList + i)->tgt;
		if (src == tgt || (src == psrc && tgt == ptgt)) {
			continue;
		}
		// outputFile << label2node[src] << label2node[tgt];
		// unsigned int out = ntohl(label2node[src]);
		outputFile.write((char *)(&label2node[src]), sizeof(unsigned int));
		// out = ntohl(label2node[tgt]);
		outputFile.write((char *)(&label2node[tgt]), sizeof(unsigned int));
		psrc = src;
		ptgt = tgt;
	}
	outputFile.close();
}

int main(int argc, char *argv[]) {
	if (argc < 3) {
		std::cerr<<argv[0]<<": usage: ./sanitize <path to graph.txt> <# edges> <do union?>\n";
		exit(1);
	}
	bool dounion = argc > 3 && !strncmp(argv[3],"true",4);
	std::cerr << "Union: " << dounion << "\n";
	std::string prefix = argv[1];
	readGraph(prefix, atoi(argv[2]), dounion);
	if(DEBUG)
		std::cout<<"LOADED GRAPH "<<g.EDGENUM<<", "<<g.NODENUM<<"\n";
	std::sort(g.edgeList, g.edgeList + g.EDGENUM, compareEdges);
	if(DEBUG)
		std::cout<<"SORTED GRAPH\n";
	prefix = prefix.substr(0,prefix.length()-4);
	writeToFile(prefix);
	if(DEBUG)
		std::cout<<"DONE\n";
	return 0;
}
