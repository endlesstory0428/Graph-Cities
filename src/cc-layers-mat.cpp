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

typedef adjacency_list<vecS, vecS, undirectedS, unsigned int> graph_t;
typedef graph_traits<graph_t>::vertex_descriptor Vertex;
typedef graph_traits<graph_t>::edge_descriptor Edge;

std::unordered_map<unsigned int, graph_t> G;
std::vector<unsigned int> ccs;

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

void readGraph(const std::string &inputFile, const std::string &ccfile) {
	std::ifstream is;
	is.open(inputFile);
	unsigned int src, tgt, layer;
	/* graph_t g; */
	std::string line;
	unsigned int maxlabel = 0;
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
		if (src > maxlabel) maxlabel = src;
		if (tgt > maxlabel) maxlabel = tgt;
	}
	is.close();
	is.open(ccfile, std::ios::in | std::ios::binary);
	is.seekg (0, is.end);
	unsigned int length = is.tellg()/sizeof(unsigned int);
	is.seekg (0, is.beg);
	unsigned int vert, cc;
	ccs = std::vector<unsigned int>(maxlabel);
	for (unsigned int i = 0; i < length/2; i++) {
		is.read((char *)(&vert), sizeof(unsigned int));
		is.read((char *)(&cc), sizeof(unsigned int));
		// if (vert > ccs.size())
		//     ccs.resize(vert+1);
		ccs[vert] = cc;
	}
	is.close();
}

void writeToFile(std::ofstream &outputFile, unsigned int layer, const graph_t &g, const std::vector<unsigned int> &components) {
	for(unsigned int i = 0; i < num_vertices(g); i++) {
		if (degree(i, g) > 0)
			outputFile<<i<<","<<ccs[i]<<","<<layer<<","<<components[i]<<"\n";
	}
}

void writeMetaData(const std::string &prefix, long long preprocessingTime, long long algorithmTime) {
	std::ofstream outputFile;
	outputFile.open(prefix+"-info.json");
	outputFile<<"{\n";
	outputFile<<"\"preprocessing-time\":"<<preprocessingTime<<",\n";
	outputFile<<"\"algorithm-time\":"<<algorithmTime<<"\n}";
	outputFile.close();
}

void writeCCInfo(const std::string &prefix, const std::vector<unsigned int> &components, unsigned int num, unsigned int num_verts, unsigned int layer, unsigned int *efreq) {
	std::string prefixx = prefix+"/layer-"+std::to_string(layer)+".cc";
	unsigned int *freq = new unsigned int[num];
	std::fill_n(freq, num, 0);
	for (unsigned int i = 0; i < num_verts; i++)
		freq[components[i]]++;
	std::ofstream outputFile(prefixx+"-info.json");
	outputFile << "{\n";
	unsigned int num2 = num;
	for (size_t i = 0; i < num2; i++) {
		/* subgraph_t sg = subgraph_t(g, */
		/* 	[components,i](graph_t::edge_descriptor e) { */
		/* 		return components.at(source(e,g))==i */
		/* 			|| components.at(target(e,g))==i; */
		/* 	}, */
		/* 	[components,i](graph_t::vertex_descriptor v) { */
		/* 		return components.at(v)==i; */
		/* 	}); */
		if (freq[i] > 1) {
			outputFile<<'"'<<i<<'"'<<": {\n";
			outputFile<<"\t\"vertices\":"<<freq[i]<<",\n";
			outputFile<<"\t\"edges\":"<<efreq[i]/2<<"\n},\n";

		}
		else
			num--;
	}
	outputFile << "\"-1\":{}\n}";
	outputFile.close();
}


int main(int argc, char *argv[]) {
	if (argc < 4) {
		std::cerr<<argv[0]<<": usage: ./cc-layers-mat <path to graph> <path to connected components> <path to layers dir>\n";
		exit(1);
	}
	std::string prefix = argv[1];
	std::string prefixx = prefix.substr(0,prefix.length()-4)+".cc-layers";
	std::string prefixcc = argv[2];
	
	G = std::unordered_map<unsigned int, graph_t>();
	reset();
	readGraph(prefix, prefixcc);
	if(DEBUG)
		std::cout<<"LOADED GRAPH\n";
	long long preprocessingTime = getTimeElapsed();
	long long algorithmTime = 0;
	
	std::ofstream outputFile;
	outputFile.open(prefixx);
	/* outputFile<<"# vertex,connected_component,layer,connected_component_in_layer\n"; */
	/* outputFile<<"# #components: "<<num_components<<"\n"; */
	for (auto g = G.begin(); g != G.end(); g++) {
		std::vector<unsigned int> components(num_vertices(g->second));
		reset();
		unsigned int num = connected_components(g->second, &components[0]);
		algorithmTime += getTimeElapsed();
		writeToFile(outputFile, g->first, g->second, components);
		unsigned int *efreq = new unsigned int[num];
		std::fill_n(efreq, num, 0);
		graph_traits < graph_t >::edge_iterator ei, ei_end;
		for (tie(ei, ei_end) = edges(g->second); ei != ei_end; ++ei)
			efreq[components[source(*ei, g->second)]]++;
		writeCCInfo(argv[3], components, num, num_vertices(g->second), g->first, efreq);

	}
	outputFile.close();
	writeMetaData(prefixx, preprocessingTime, algorithmTime);
	return 0;
}
