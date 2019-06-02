#include <assert.h>
#include <boost/graph/adjacency_list.hpp>
#include <boost/graph/connected_components.hpp>
#include <fstream>
#include <iostream>
#include <sys/time.h>
#define DEBUG (1)

#define BUFFER_NUM_EDGES ((unsigned int)1 << 25)
#define ENULL ((unsigned int)-1)

using namespace boost;

typedef adjacency_list<vecS, vecS, undirectedS, unsigned int> graph_t;
typedef graph_traits<graph_t>::vertex_descriptor Vertex;
typedef graph_traits<graph_t>::edge_descriptor Edge;

std::unordered_map<unsigned int, graph_t> G;
std::vector<unsigned int> ccs;

long long currentTimeMilliS = 0;

long long currentTimeStamp() {
	struct timeval te;
	gettimeofday(&te, NULL); // get current time
	long long milliseconds =
		te.tv_sec * 1000LL + te.tv_usec / 1000; // calculate milliseconds
	return milliseconds;
}

void reset() { currentTimeMilliS = currentTimeStamp(); }

long long getTimeElapsed() {
	long long newTime = currentTimeStamp();
	long long timeElapsed = newTime - currentTimeMilliS;
	currentTimeMilliS = newTime;
	return timeElapsed;
}

void readGraph(const std::string &inputFile, const std::string &ccfile) {
	std::ifstream is;
	is.open(inputFile);
	unsigned int src, tgt, layer;
	/* graph_t g; */
	std::string line;
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
		assert(add_edge(src, tgt, G[layer]).second);
	}
	is.close();
	is.open(ccfile);
	unsigned int vert, cc;
	ccs = std::vector<unsigned int>();
	while (std::getline(is, line)) {
		if (line[0] == '#')
			continue;
		std::replace(line.begin(), line.end(), ',', ' ');
		std::istringstream iss(line);
		assert(iss >> vert >> cc);
		if (vert > ccs.size())
			ccs.resize(vert);
		ccs[vert] = cc;
	}
	is.close();
}

void writeToFile(std::ofstream &outputFile, unsigned int layer,
				 std::vector<unsigned int> &components) {
	graph_t g = G[layer];
	for (unsigned int i = 0; i < num_vertices(g); i++) {
		if (degree(i, g) > 0)
			outputFile << i << "," << ccs[i] << "," << layer << "," << components[i]
					   << "\n";
	}
}

void writeMetaData(std::string prefix, long long preprocessingTime,
				   long long algorithmTime) {
	std::ofstream outputFile;
	outputFile.open(prefix + "-info.json");
	outputFile << "{\n";
	outputFile << "\"preprocessing-time\":" << preprocessingTime << ",\n";
	outputFile << "\"algorithm-time\":" << algorithmTime << "\n}";
	outputFile.close();
}

void writeCCInfo(std::string prefix, unsigned int num_components) {
	std::ofstream outputFile;
	outputFile.open(prefix + "-info.json");
	outputFile << "{\n";
	outputFile << "\"number_components\":" << num_components << "\n}";
	outputFile.close();
}

int main(int argc, char *argv[]) {
	if (argc < 3) {
		std::cerr << argv[0]
				  << ": usage: ./cc-layers-mat <path to graph> <path to connected "
					 "components>\n";
		exit(1);
	}
	std::string prefix = argv[1];
	std::string prefixx = prefix.substr(0, prefix.length() - 4) + ".cc-layers";
	std::string prefixcc = argv[2];

	G = std::unordered_map<unsigned int, graph_t>();
	reset();
	readGraph(prefix, prefixcc);
	if (DEBUG)
		std::cout << "LOADED GRAPH\n";
	long long preprocessingTime = getTimeElapsed();
	long long algorithmTime = 0;

	std::ofstream outputFile;
	outputFile.open(prefixx);
	/* outputFile<<"# vertex,connected_component,layer,connected_component_in_layer\n";
	 */
	/* outputFile<<"# #components: "<<num_components<<"\n"; */
	std::vector<unsigned int> components(10);
	for (auto g = G.begin(); g != G.end(); g++) {
		components.resize(num_vertices(g->second));
		components.clear();
		reset();
		connected_components(g->second, &components[0]);
		algorithmTime += getTimeElapsed();
		writeToFile(outputFile, g->first, components);
	}
	outputFile.close();
	writeMetaData(prefixx, preprocessingTime, algorithmTime);
	return 0;
}
