#include <iostream>
#include <fstream>
#include <sys/time.h>
#include <assert.h>
#include <boost/graph/adjacency_list.hpp>
#include <boost/graph/connected_components.hpp>
#define DEBUG (1)

#define BUFFER_NUM_EDGES ((unsigned int) 1<<25)
#define ENULL ((unsigned int) -1)

using namespace boost;

typedef adjacency_list<vecS, vecS, undirectedS> graph_t;
typedef graph_traits<graph_t>::vertex_descriptor Vertex;
typedef graph_traits<graph_t>::edge_descriptor Edge;

graph_t g;

/* long long currentTimeMilliS = 0; */

/* long long currentTimeStamp() { */
/*	struct timeval te; */
/*	gettimeofday(&te, NULL); // get current time */
/*	long long milliseconds = te.tv_sec*1000LL + te.tv_usec/1000; // calculate milliseconds */
/*	return milliseconds; */
/* } */

/* void reset() { */
/*	currentTimeMilliS = currentTimeStamp(); */
/* } */

/* long long getTimeElapsed() { */
/*	long long newTime = currentTimeStamp(); */
/*	long long timeElapsed = newTime - currentTimeMilliS; */
/*	currentTimeMilliS = newTime; */
/*	return timeElapsed; */
/* } */

void readGraph(const std::string &inputFile) {
	std::ifstream is;
	is.open(inputFile);
	unsigned int src, tgt;
	std::string line;
	while (std::getline(is, line)) {
		if (line[0] == '#')
			continue;
		std::replace(line.begin(), line.end(), ',', ' ');
		/* std::cerr<<line; */
		std::istringstream iss(line);
		assert(iss >> src >> tgt);
		assert(add_edge(src, tgt, g).second);
	}
	is.close();
}

 void writeToFile(const std::string &prefix, std::vector<unsigned int> components, unsigned int num_components) {
	std::ofstream outputFile;
	outputFile.open(prefix);
	/* outputFile<<"# vertex,connected_component\n"; */
	/* outputFile<<"# #components: "<<num_components<<"\n"; */
	for(unsigned int i = 0; i < num_vertices(g); i++) {
		if (degree(i, g) > 0)
			outputFile<<i<<","<<components[i]<<"\n";
	}
	outputFile.close();
}

/* void writeMetaData(std::string prefix, unsigned int NODENUM, unsigned int EDGENUM, unsigned int maxdeg, long long preprocessingTime, long long algorithmTime) { */
/*	std::ofstream outputFile; */
/*	outputFile.open(prefix+"-decomp-info.json"); */
/*	outputFile<<"{\n"; */
/*	outputFile<<"\"vertices\":"<<NODENUM<<",\n"; */
/*	outputFile<<"\"edges\":"<<EDGENUM<<",\n"; */
/*	outputFile<<"\"maxdeg\":"<<maxdeg<<",\n"; */
/*	outputFile<<"\"preprocessing-time\":"<<preprocessingTime<<",\n"; */
/*	outputFile<<"\"algorithm-time\":"<<algorithmTime<<"\n}"; */
/*	outputFile.close(); */
/* } */

int main(int argc, char *argv[]) {
	if (argc < 4) {
		std::cerr<<argv[0]<<": usage: ./connectedcomponents <path to graph> <layer> <path to layers dir>\n";
		exit(1);
	}
	std::string prefix = argv[1];
	int layer = atol(argv[2]);
	std::string prefixx;
	if (layer <= 0) {
		prefixx = prefix+".cc";
	} else {
		prefixx = argv[3];
		prefixx += "/layer-"+std::to_string(layer)+".cc";
	}

	/* reset(); */
	readGraph(prefix);
	if(DEBUG)
		std::cout<<"LOADED GRAPH "<<num_vertices(g)<<", "<<num_edges(g)<<"\n";
	/* long long preprocessingTime = getTimeElapsed(); */
	/* reset(); */

	std::vector<unsigned int> components(num_vertices(g));
	unsigned int num = connected_components(g, &components[0]);

	/* long long algorithmTime = getTimeElapsed(); */
	writeToFile(prefixx, components, num);
	return 0;
}
