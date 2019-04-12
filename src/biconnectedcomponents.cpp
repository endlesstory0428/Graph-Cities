#include <iostream>
#include <fstream>
#include <sys/time.h>
#include <assert.h>
#include <boost/graph/adjacency_list.hpp>
#include <boost/graph/biconnected_components.hpp>
#define DEBUG (1)

#define BUFFER_NUM_EDGES ((unsigned int) 1<<25)
#define ENULL ((unsigned int) -1)

using namespace boost;

struct edge_component_t {
	enum { num = 555 };
	typedef edge_property_tag kind;
} edge_component;

typedef adjacency_list<vecS, vecS, undirectedS, no_property, property<edge_component_t, std::size_t >> graph_t;
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

// Utility function to print a given array
template <class T>
void printArray(T *arr, unsigned int n) {
	for(unsigned int i = 0; i < n; i++) {
		std::cout<<arr[i]<<" ";
	}
	std::cout<<"\n";
}

void readGraph(const std::string &inputFile, bool *wavemask) {
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
		if(wavemask[src] && wavemask[tgt]) {
			assert(add_edge(src, tgt, g).second);
		}
	}
	is.close();
}

void readWave(const std::string &inputFile, bool *waves, unsigned int woi) {
	std::ifstream is;
	is.open(inputFile);
	unsigned int vert, wave;
	std::string line;
	while (std::getline(is, line)) {
		if (line[0] == '#')
			continue;
		std::replace(line.begin(), line.end(), ',', ' ');
		/* std::cerr<<line<<"\n"; */
		std::istringstream iss(line);
		assert(iss >> vert >> wave >> wave);
		/* std::cerr<<vert<<" "<<wave<<" "<<woi<<"\n"; */
		if (wave == woi)
			waves[vert] = true;
	}
	is.close();
}

 void writeToFile(const std::string &prefix, property_map <graph_t, edge_component_t>::type components) {
	std::ofstream outputFile;
	outputFile.open(prefix);
	/* outputFile<<"# source_vertex,target_vertex,biconnected_component\n"; */
	graph_traits < graph_t >::edge_iterator ei, ei_end;
	for (tie(ei, ei_end) = edges(g); ei != ei_end; ++ei)
		outputFile << source(*ei, g) << "," << target(*ei, g) << "," << components[*ei] << "\n";
	outputFile.close();
}

void writeMetaData(std::string prefix, unsigned int num_components, long long preprocessingTime, long long algorithmTime) {
	std::ofstream outputFile;
	outputFile.open(prefix+"-info.json");
	outputFile<<"{\n";
	outputFile<<"\"number-biconnected_components\":"<<num_components<<",\n";
	outputFile<<"\"preprocessing-time\":"<<preprocessingTime<<",\n";
	outputFile<<"\"algorithm-time\":"<<algorithmTime<<"\n}";
	outputFile.close();
}

int main(int argc, char *argv[]) {
	if (argc < 6) {
		std::cerr<<argv[0]<<": usage: ./biconnectedcomponents <path to graph> <layer> <path to layers dir> <wave> <max vertex label>\n";
		exit(1);
	}
	std::string prefix = argv[1];
	int layer = atol(argv[2]);
	std::string prefixx;
	if (layer <= 0) {
		prefixx = prefix+".bcc";
		std::cerr<<"Choose a layer or wave.\n";
		exit(1);
	} else {
		prefixx = argv[3];
		prefixx += "/layer-"+std::to_string(layer)+".bcc";
	}

	int wave = atol(argv[4]);
	/* std::cerr<<"wave: "<<wave<<"\n"; */
	bool *wavemask = new bool[atol(argv[5])];
	if (wave > 0) {
		prefixx = argv[3];
		prefixx = prefixx.substr(0, prefixx.length()-6) + "waves/layer-" + std::to_string(layer);
		std::string inFile = prefixx+"-waves.csv";
		std::fill_n(wavemask, atol(argv[5]), false);
		/* std::cerr<<inFile<<"\n"; */
		readWave(inFile, wavemask, wave);
		prefixx += "-wave-" + std::to_string(wave) + ".bcc";
	} else {
		std::fill_n(wavemask, atol(argv[5]), true);
	}
	/* printArray(wavemask, atol(argv[5])); */

	reset();
	readGraph(prefix, wavemask);
	if(DEBUG)
		std::cout<<"LOADED GRAPH "<<num_vertices(g)<<", "<<num_edges(g)<<"\n";
	long long preprocessingTime = getTimeElapsed();
	reset();

	property_map <graph_t, edge_component_t>::type components = get(edge_component, g);
	std::size_t num = biconnected_components(g, components);

	long long algorithmTime = getTimeElapsed();
	writeToFile(prefixx, components);
	writeMetaData(prefixx, num, preprocessingTime, algorithmTime);
	return 0;
}
