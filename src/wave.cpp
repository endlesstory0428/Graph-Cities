#include <iostream>
#include <fstream>
#include <algorithm>
#include <sys/time.h>
#include <assert.h>
#include <boost/graph/edge_list.hpp>
#include <boost/graph/adjacency_list.hpp>
#include <boost/graph/breadth_first_search.hpp>
#include <boost/pending/indirect_cmp.hpp>
#define DEBUG (1)

#define BUFFER_NUM_EDGES ((unsigned int) 1<<25)
#define ENULL ((unsigned int) -1)

using namespace boost;
struct VertProp {
	unsigned int degree;
	unsigned int wave;
};
typedef adjacency_list<vecS, vecS, undirectedS, VertProp, unsigned int> graph_t;
/* typedef std::pair <unsigned int,unsigned int >Edge; */
typedef graph_traits<graph_t>::vertex_descriptor Vertex;
typedef graph_traits<graph_t>::edge_descriptor Edge;

struct wave_visitor : boost::default_bfs_visitor{

	
	wave_visitor : (graph_t *graph, unsigned int wave, unsigned int mindeg) {
		G = graph;
		m_wave = wave;
		m_mindeg = mindeg;
	};

	void initialize_vertex(const Vertex &s, const graph_t &g) const {
		std::cout << "Initialize: "<< s << g[s].wave << std::endl;
		/* if (g[s].degree == mindeg) */
		/* 	G[s].wave = wave; */
	}
	/* void discover_vertex(const Vertex &s, const graph_t &g) const { */
	/* 	std::cout << "Discover: "<< s << g[s] << std::endl; */
	/* } */
	/* void examine_vertex(const Vertex &s, const graph_t &g) const { */
	/* 	std::cout << "Examine vertex: "<< s << g[s] << std::endl; */
	/* } */
	void examine_edge(const Edge &e, const graph_t &g) const {
		std::cout << "Examine edge: "<< e << g[e] << std::endl;
		/* if (g[e.m_source] == wave && degree(e.m_target, g) < mindeg) */
	}
	/* void tree_edge(const Edge &e, const graph_t &g) const { */
	/* 	std::cout << "Tree edge: "<< e << g[e] << std::endl; */
	/* } */
	/* void non_tree_edge(const Edge &e, const graph_t &g) const { */
	/* 	std::cout << "Non-Tree edge: "<< e << g[e] << std::endl; */
	/* } */
	/* void gray_target(const Edge &e, const graph_t &g) const { */
	/* 	std::cout << "Gray target: "<< e << g[e] << std::endl; */
	/* } */
	/* void black_target(const Edge &e, const graph_t &g) const { */
	/* 	std::cout << "Black target: "<< e << g[e] << std::endl; */
	/* } */
	/* void finish_vertex(const Vertex &s, const graph_t &g) const { */
	/* 	std::cout << "Finish vertex: "<< s << g[s] << std::endl; */
	/* } */
	private:
		graph_t *G;
		unsigned int m_wave;
		unsigned int m_mindeg;
};

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

void readLayer(const std::string &inputFile, unsigned int tlayer, unsigned int numedges) {
	std::ifstream is;
	is.open(inputFile);
	char comma;
	unsigned int src, tgt, layer;
	for(unsigned int i = 0; i < numedges; i++) {
		is>>src>>comma>>tgt>>comma>>layer;
		if (layer == tlayer) {
			assert(add_edge(src, tgt, g).second);
			g[src].degree++;
			g[tgt].wave++;
		}
	}
	is.close();
}

/* void writeToFile(const std::string &prefix, unsigned int *edgeIndices, unsigned int *edgeLabels, unsigned int*node2label) { */
/*	std::ofstream outputFile; */
/*	outputFile.open(prefix+"-waves.csv"); */
/*	for(unsigned int i = 0; i < g.EDGENUM; i++) { */
/*		outputFile<<node2label[(g.edgeList + edgeIndices[i])->src]<<","<<node2label[(g.edgeList + edgeIndices[i])->tgt]<<","<<edgeLabels[i]<<"\n"; */
/*	} */
/*	outputFile.close(); */
/* } */
unsigned int minDegreeVertices(Vertex *verts, std::vector<Vertex> &mindegs) {
	std::sort(verts, verts+num_vertices(g), [](unsigned int a, unsigned int b) {
		return g[a].degree > g[b].degree;
	});
	mindegs.clear();
	unsigned int mindeg = 0;
	for (unsigned int i = 0; i < num_vertices(g); i++) {
		unsigned int deg = g[verts[i]].degree;
		if (deg == 0) continue;
		if (mindeg == 0) mindeg = deg;
		if (deg != mindeg) break;
		std::cerr<<verts[i]<<"\n";
		mindegs.push_back(verts[i]);
		/* std::cerr << "Vertex descriptor #" << *v */
		/*	 << " degree:" << degree(*v, g) */
		/*	 << "\n"; */
	}
	return mindeg;
}

void initVertArray(Vertex *verts, unsigned int &maxdeg, unsigned int &numverts) {
	graph_t::vertex_iterator v, vend;
	for (tie(v, vend) = vertices(g); v != vend; ++v) {
		unsigned int deg = degree(*v, g);
		assert(deg/2 == g[*v].degree);
		/* std::cerr<<*v<<": "<<deg<<", "<<g[*v].degree<<"\n"; */
		verts[*v] = *v;
		if (deg == 0) continue;
		if (deg > maxdeg)
			maxdeg = deg;
		numverts++;
	}
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

void writeWaveMetaData(std::ofstream &outputFile, unsigned int wave, unsigned int NODENUM, unsigned int EDGENUM) {
	outputFile<<'"'<<wave<<'"'<<": {\n";
	outputFile<<"\t\"vertices\":"<<NODENUM<<",\n";
	outputFile<<"\t\"edges\":"<<EDGENUM/2<<"\n},\n";
}

int main(int argc, char *argv[]) {
	if (argc < 7) {
		std::cerr<<argv[0]<<": usage: ./wave <path to layers dir> <layer file> <layer> <# edges> <# nodes> <# edges in file>\n";
		exit(1);
	}
	std::string prefix = argv[1];
	std::string prefixx = prefix.substr(0,prefix.length()-7)+"_waves/layer"+argv[3];
	std::ofstream outputFile(prefixx+"-waves-info.json");
	outputFile<<"{\n";
	/* g.EDGENUM = atol(argv[4]); */
	/* g.NODENUM = atol(argv[5]); */
	reset();
	readLayer(argv[2], atol(argv[3]), atol(argv[6]));
	if(DEBUG)
		std::cout<<"LOADED GRAPH "<<num_vertices(g)<<", "<<num_edges(g)<<"\n";
	long long preprocessingTime = getTimeElapsed();
	reset();
	unsigned int maxdeg = 0;
	unsigned int numverts = 0;
	std::vector<Vertex> minDegVerts = std::vector<Vertex>(num_vertices(g));
	Vertex *verts = new Vertex[num_vertices(g)];
	initVertArray(verts,maxdeg,numverts);
	wave_visitor vis;
	vis.G = g;

	minDegreeVertices(verts, minDegVerts);
	for (auto v : minDegVerts) {
		breadth_first_search(g, v, visitor(vis));
	}

	long long algorithmTime = getTimeElapsed();
	/* for (unsigned int i = 1; i <= core[g.NODENUM]; i++) { */
	/*	if (edgefreq[i] > 0) */
	/*		writeWaveMetaData(outputFile, i, vertfreq[i], edgefreq[i]); */
	/* } */
	outputFile<<"}\n";
	outputFile.close();
	/* writeToFile(prefixx,originalIndices, originalLabels, node2label); */
	writeMetaData(prefixx, atol(argv[5]), atol(argv[4])/2, maxdeg, preprocessingTime, algorithmTime);
	return 0;
}
