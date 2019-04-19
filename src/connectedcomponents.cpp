#include <iostream>
#include <fstream>
#include <sys/time.h>
#include <assert.h>
#include <boost/graph/adjacency_list.hpp>
#include <boost/graph/connected_components.hpp>
// #include <boost/graph/filtered_graph.hpp>
#define DEBUG (1)

#define BUFFER_NUM_EDGES ((unsigned int) 1<<25)
#define ENULL ((unsigned int) -1)

using namespace boost;

typedef adjacency_list<vecS, vecS, undirectedS> graph_t;
// typedef filtered_graph<graph_t, std::function<bool(graph_t::edge_descriptor)>, std::function<bool(graph_t::vertex_descriptor)> > subgraph_t;
/* typedef graph_traits<graph_t>::vertex_descriptor Vertex; */
/* typedef graph_traits<graph_t>::edge_descriptor Edge; */

graph_t g;

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

unsigned int *initNodeMap(const std::string &inputFile) {//, unsigned int *label2node) {
	std::ifstream is(inputFile, std::ios::in | std::ios::binary);
	is.seekg (0, is.end);
	unsigned int length = is.tellg()/sizeof(unsigned int);
	is.seekg (0, is.beg);
	std::cerr<<length<<"\n";
	unsigned int label;
	unsigned int *node2label = new unsigned int[length];
	for(unsigned int i = 1; i <= length; i++) {
		is.read((char *)(&label), sizeof(unsigned int));
		node2label[i] = label;
		// label2node[label] = i;
	}
	return node2label;
}

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

void readGraphBin(const std::string &fileName) {
	unsigned int *node2label = initNodeMap(fileName.substr(0,fileName.length()-4)+".nodemap");
	std::ifstream is;
	is.open(fileName, std::ios::in | std::ios::binary);
	is.seekg (0, is.end);
	unsigned int length = is.tellg()/sizeof(unsigned int);
	is.seekg (0, is.beg);
	std::cerr<<length<<"\n";
	unsigned int src, tgt;
	for (unsigned int i = 0; i < length/2; i++) {
		is.read((char *)(&src), sizeof(unsigned int));
		is.read((char *)(&tgt), sizeof(unsigned int));
		assert(add_edge(node2label[src], node2label[tgt], g).second);
	}
	is.close();
}

 void writeToFile(const std::string &prefix, std::vector<unsigned int> components) {
	std::ofstream outputFile;
	outputFile.open(prefix);
	/* outputFile<<"# vertex,connected_component\n"; */
	for(unsigned int i = 0; i < num_vertices(g); i++) {
		if (degree(i, g) > 0)
			outputFile<<i<<","<<components[i]<<"\n";
	}
	outputFile.close();
}

void writeMetaData(const std::string &prefix, unsigned int num_components, long long preprocessingTime, long long algorithmTime) {
	std::ofstream outputFile;
	outputFile.open(prefix+"-decomposition-info.json");
	outputFile<<"{\n";
	outputFile<<"\"number-components\":"<<num_components<<",\n";
	outputFile<<"\"preprocessing-time\":"<<preprocessingTime<<",\n";
	outputFile<<"\"algorithm-time\":"<<algorithmTime<<"\n}";
	outputFile.close();
}

void writeCCMetaData(std::ofstream &outputFile, unsigned int cc, unsigned int NODENUM, unsigned int EDGENUM) {
	outputFile<<'"'<<cc<<'"'<<": {\n";
	outputFile<<"\t\"vertices\":"<<NODENUM<<",\n";
	outputFile<<"\t\"edges\":"<<EDGENUM<<"\n},\n";
}

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

	reset();
	if (layer <= 0)
		readGraphBin(prefix+".bin");
	else
		readGraph(prefix);
	if(DEBUG)
		std::cout<<"LOADED GRAPH "<<num_vertices(g)<<", "<<num_edges(g)<<"\n";
	long long preprocessingTime = getTimeElapsed();
	reset();

	std::vector<unsigned int> components(num_vertices(g));
	unsigned int num = connected_components(g, &components[0]);

	long long algorithmTime = getTimeElapsed();
	writeToFile(prefixx, components);

	unsigned int *freq = new unsigned int[num];
	std::fill_n(freq, num, 0);
	for (unsigned int i = 0; i < num_vertices(g); i++)
		freq[components[i]]++;
	unsigned int *efreq = new unsigned int[num];
	std::fill_n(efreq, num, 0);
	graph_traits < graph_t >::edge_iterator ei, ei_end;
	for (tie(ei, ei_end) = edges(g); ei != ei_end; ++ei)
		efreq[components[source(*ei, g)]]++;

	std::ofstream outputFile(prefixx+"-info.json");
	outputFile << "{\n";
	unsigned int num2 = num;
	for (size_t i = 0; i < num2; i++) {
		/* subgraph_t sg = subgraph_t(g, */
		/*	[components,i](graph_t::edge_descriptor e) { */
		/*		return components.at(source(e,g))==i */
		/*			|| components.at(target(e,g))==i; */
		/*	}, */
		/*	[components,i](graph_t::vertex_descriptor v) { */
		/*		return components.at(v)==i; */
		/*	}); */
		if (freq[i] > 1)
			writeCCMetaData(outputFile, i, freq[i], efreq[i]/2);
		else
			num--;
	}
	outputFile << "\"-1\":{}\n}";
	outputFile.close();

	writeMetaData(prefixx, num, preprocessingTime, algorithmTime);
	return 0;
}
