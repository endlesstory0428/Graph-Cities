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
#include <omp.h>
#include <thread>
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
long long ioTime = 0;

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

void doubleAndReverseGraph(char *inputFile, const char *outputFile, unsigned int *label2node) {
	std::ifstream is;
	is.open(inputFile, std::ios::in | std::ios::binary);
	std::ofstream os;
	os.open(outputFile, std::ios::out | std::ios::binary | std::ios::app);
	unsigned int src, tgt;
	unsigned int updatedEdgeNum = g.EDGENUM;
	for(unsigned int i = 0; i < g.EDGENUM; i++) {
		is.read((char *)(&src), sizeof(unsigned int));
		is.read((char *)(&tgt), sizeof(unsigned int));
		src = label2node[htonl(src)];
		tgt = label2node[htonl(tgt)];
		assert(src != ENULL && src <= g.NODENUM);
		assert(tgt != ENULL && tgt <= g.NODENUM);
		// Removes self loops
		if(src != tgt) {
			os.write((char *)&src, sizeof(unsigned int));
			os.write((char *)&tgt, sizeof(unsigned int));
		}
		else {
			updatedEdgeNum--;
		}
	}
	/* is.seekg(0, std::ios::beg); */
	/* for(unsigned int i = 0; i < g.EDGENUM; i++) { */
	/*	   is.read((char *)(&src), sizeof(unsigned int)); */
	/*	   is.read((char *)(&tgt), sizeof(unsigned int)); */
	/*	   src = htonl(src); */
	/*	   tgt = htonl(tgt); */
	/*	   assert(src >= 0 && src <= g.NODENUM); */
	/*	   assert(tgt >= 0 && tgt <= g.NODENUM); */
	/*	   // Removes self loops */
	/*	   if(src != tgt) { */
	/*		   os.write((char *)(&tgt), sizeof(unsigned int)); */
	/*		   os.write((char *)(&src), sizeof(unsigned int)); */
	/*	   } */
	/* } */
	g.EDGENUM = updatedEdgeNum;
	/* g.EDGENUM *= 2; */
	is.close();
	os.close();
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

bool isGraphEmpty(unsigned int *edgeLabels) {
		for(unsigned int i = 0; i < g.EDGENUM; i++) {
				if(edgeLabels[i] == ENULL)
						return false;
		}
		return true;
}

// Computes the degree of each node in the graph
unsigned int findDegree(unsigned int *edgeLabels, unsigned int *degree) {
	std::fill_n(degree, g.NODENUM + 1, 0);
	unsigned int max = 0;
	for(unsigned int i = 0; i < g.EDGENUM; i++) {
		// If edge hasn't been deleted yet. An edge is considered deleted
		// when it has been labeled.
		if(edgeLabels[i] == ENULL) {
				degree[(g.edgeList + i)->src]++;
				degree[(g.edgeList + i)->tgt]++;
		}
	}
	for(unsigned int i = 0; i < g.NODENUM + 1; i++) {
		degree[i] /= 2;
		if (degree[i] > max)
			max = degree[i];
	}
	return max;
}

void scan(unsigned int *deg, unsigned int level, unsigned int* curr, long *currTailPtr) {

	// Size of cache line
	const long BUFFER_SIZE_BYTES = 2048;
	const long BUFFER_SIZE = BUFFER_SIZE_BYTES/sizeof(unsigned int);

	unsigned int buff[BUFFER_SIZE];
	long index = 0;

#pragma omp for schedule(static)
	for (unsigned int i = 0; i < g.NODENUM + 1; i++) {

		if (deg[i] == level) {

			buff[index] = i;
			index++;

			if (index >= BUFFER_SIZE) {
				long tempIdx = __sync_fetch_and_add(currTailPtr, BUFFER_SIZE);

				for (long j = 0; j < BUFFER_SIZE; j++) {
					curr[tempIdx+j] = buff[j];
				}
				index = 0;
			}
		}

	}

	if (index > 0) {
		long tempIdx = __sync_fetch_and_add(currTailPtr, index);

		for (long j = 0; j < index; j++)
			curr[tempIdx+j] = buff[j];
	}

#pragma omp barrier

}


void processSubLevel(unsigned int *curr, long currTail,
		unsigned int *deg, unsigned int *edgeLabels, unsigned int level, unsigned int *next, long *nextTailPtr) {

	// Size of cache line
	const long BUFFER_SIZE_BYTES = 2048;
	const long BUFFER_SIZE = BUFFER_SIZE_BYTES/sizeof(unsigned int);

	unsigned int buff[BUFFER_SIZE];
	long index = 0;

#pragma omp for schedule(static)
	for (long i = 0; i < currTail; i++) {
		unsigned int v = curr[i];
		// Do nothing if node doesn't exist in the graph
		if(g.start_indices[v] == 0 && g.end_indices[v] == 0) {
			;
		}
		else {
			//For all neighbors of vertex v
			for (unsigned int j = g.start_indices[v]; j <= g.end_indices[v]; j++) {
				if(edgeLabels[j] == ENULL) {
					unsigned int u = (g.edgeList + j)->tgt;
					if (deg[u] > level) {
						unsigned int du =  __sync_fetch_and_sub(&deg[u], 1);
						if (du == (level+1)) {
							buff[index] = u;
							index++;
							if (index >= BUFFER_SIZE) {
								long tempIdx = __sync_fetch_and_add(nextTailPtr, BUFFER_SIZE);
								for(long bufIdx = 0; bufIdx < BUFFER_SIZE; bufIdx++)
									next [tempIdx + bufIdx] = buff[bufIdx];
								index = 0;
							}
						}
					}
				}
			}
		}
	}

	if (index > 0) {
		long tempIdx =	__sync_fetch_and_add(nextTailPtr, index);;
		for (long bufIdx = 0; bufIdx < index; bufIdx++)
			next [tempIdx + bufIdx] = buff[bufIdx];
	}

#pragma omp barrier

#pragma omp for schedule(static)
	for (long i = 0; i < *nextTailPtr; i++) {
		unsigned int u = next[i];
		if (deg[u] != level)
			deg[u] = level;
	}


#pragma omp barrier

}

//ParK to compute k core decomposition in parallel
void parKCore(unsigned int *deg, unsigned int *edgeLabels) {
	unsigned int *curr = new unsigned int[g.NODENUM];
	unsigned int *next = new unsigned int[g.NODENUM];

	long currTail = 0;
	long nextTail = 0;

#pragma omp parallel
{
	unsigned int tid = omp_get_thread_num();
	long todo = g.NODENUM;
	unsigned int level = 0;

	while (todo > 0) {

		scan(deg, level, curr, &currTail);

		while (currTail > 0) {
			todo = todo - currTail;

			processSubLevel(curr, currTail, deg, edgeLabels, level, next, &nextTail);

			if (tid == 0) {
				unsigned int *tempCurr = curr;
				curr = next;
				next = tempCurr;

				currTail = nextTail;
				nextTail = 0;
			}

#pragma omp barrier

		}

		level = level + 1;
#pragma omp barrier

	}
}
	delete [] curr;
	delete [] next;

}

unsigned int labelEdgesAndUpdateDegree(unsigned int peel, bool *isFinalNode, unsigned int *degree, unsigned int *edgeLabels) {
	unsigned int numEdges = 0;
	for(unsigned int i = 0; i < g.EDGENUM; i++) {
		unsigned int src = (g.edgeList + i)->src;
		unsigned int tgt = (g.edgeList + i)->tgt;
		if(isFinalNode[src] && isFinalNode[tgt] && edgeLabels[i] == ENULL) {
			edgeLabels[i] = peel;
			degree[src] -= 1;
			numEdges++;
		}
	}
	return numEdges;
}

void labelAndDeletePeelOneEdges(float *degree, unsigned int *edgeLabels) {
	float *tmp = new float[g.NODENUM + 1];
	std::copy(degree, degree + g.NODENUM + 1, tmp);
	for(unsigned int i = 0; i < g.EDGENUM; i++) {
		unsigned int src = (g.edgeList + i)->src;
		unsigned int tgt = (g.edgeList + i)->tgt;
		if(edgeLabels[i] == ENULL) {
				if(tmp[src] == 1 || tmp[tgt] == 1) {
						edgeLabels[i] = 1;
						degree[src] -= 0.5;
						degree[tgt] -= 0.5;
				}
		}
	}
	delete [] tmp;
}

void writeToFile(unsigned int *edgeIndices, unsigned int *edgeLabels) {
		std::ofstream outputFile;
		outputFile.open("graph-decomposition.csv");
		for(unsigned int i = 0; i < g.EDGENUM; i++) {
				outputFile<<(g.edgeList + edgeIndices[i])->src<<","<<(g.edgeList + edgeIndices[i])->tgt<<","<<edgeLabels[i]<<"\n";
		}
		outputFile.close();
}

void writeMetaData(std::string prefix, unsigned int NODENUM, unsigned int EDGENUM, unsigned int maxdeg, long long preprocessingTime, long long algorithmTime) {
	std::ofstream outputFile;
	outputFile.open(prefix.substr(0,prefix.length()-4)+"-decomposition-info.json");
	outputFile<<"{\n";
	outputFile<<"\"vertices\":"<<NODENUM<<",\n";
	outputFile<<"\"edges\":"<<EDGENUM<<",\n";
	outputFile<<"\"maxdeg\":"<<maxdeg<<",\n";
	outputFile<<"\"preprocessing-time\":"<<preprocessingTime<<",\n";
	outputFile<<"\"algorithm-time\":"<<algorithmTime<<"\n";
	outputFile<<"\"io-time\":"<<ioTime<<"\n}";
	outputFile.close();
}

void initNodeMap(char *inputFile, unsigned int *node2label, unsigned int *label2node) {
	std::ifstream is(inputFile);
	unsigned int label;
	for(unsigned int i = 1; i <= g.NODENUM; i++) {
		is >> label;
		node2label[i] = label;
		label2node[label] = i;
	}
}

void writeLayerToFile(const std::string &prefix, unsigned int topLayer, unsigned int layer, unsigned int *edgeIndices, unsigned int *edgeLabels, unsigned int *node2label) {
	long long wtime = currentTimeStamp();
	std::ofstream outputFile;
	std::string prefixx;
	if (topLayer != layer) {
		prefixx = prefix.substr(0,prefix.length()-4)+"_layers/layer-"+std::to_string(layer)+"-"+std::to_string(topLayer);
	} else {
		prefixx = prefix.substr(0,prefix.length()-4)+"_layers/layer-"+std::to_string(layer);
	}
	outputFile.open(prefixx+".csv");
	outputFile<<"# source_vertex,target_vertex,layer\n";
	for(unsigned int i = 0; i < g.EDGENUM; i++) {
		unsigned int label = edgeLabels[edgeIndices[i]];
		if (label >= layer && label <= (topLayer))
			outputFile<<node2label[(g.edgeList + edgeIndices[i])->src]<<","<<node2label[(g.edgeList + edgeIndices[i])->tgt]<<","<<label<<"\n";
	}
	outputFile.close();
	ioTime += currentTimeStamp()-wtime;
	/* outputFile.open(prefixx+"-info.json"); */
	/* outputFile<<"{\n"; */
	/* outputFile<<"\"io-time\":"<<ioTime<<"\n}"; */
	/* outputFile.close(); */
}

void writeLayerMetaData(std::ofstream &outputFile, unsigned int layer, unsigned int prev, unsigned int NODENUM, unsigned int EDGENUM) {
	outputFile<<'"'<<layer<<'"'<<": {\n";
	outputFile<<"\t\"vertices\":"<<NODENUM<<",\n";
	outputFile<<"\t\"edges\":"<<EDGENUM/2<<",\n";
	outputFile<<"\t\"file_suffix\":"<<prev<<"\n},\n";
}

int main(int argc, char *argv[]) {
	if (argc < 6) {
		std::cerr<<argv[0]<<": usage: ./buffkcore <path to graph.bin> <# edges> <# nodes> <path to graph.nodemap> <largest node label>\n";
		exit(1);
	}
	std::string prefix = argv[1];
	std::ofstream outputFile(prefix.substr(0,prefix.length()-4)+"-layer-info.json");
	outputFile<<"{\n";
	int numthreads = omp_get_max_threads();
	omp_set_num_threads(numthreads-2);
	if (DEBUG) {
		std::cout<<numthreads<<"\n";
		std::cout<<BUFFER_NUM_EDGES<<"\n";
	}
	const char *tmpFile = "tmp.bin";
	remove(tmpFile);
	g.EDGENUM = atoi(argv[2]);
	g.NODENUM = atoi(argv[3]);
	reset();
	unsigned int *node2label = new unsigned int[g.NODENUM+1];
	unsigned int *label2node = new unsigned int[atoi(argv[5])+1];
	initNodeMap(argv[4], node2label, label2node);
	doubleAndReverseGraph(argv[1], tmpFile, label2node);
	if(DEBUG)
		std::cout<<"DOUBLED AND REVERSED GRAPH\n";
	unsigned int *originalIndices = new unsigned int[g.EDGENUM];
	unsigned int *edgeLabels = new unsigned int[g.EDGENUM];
	std::fill_n(edgeLabels, g.EDGENUM, ENULL);
	/* createMemoryMap(tmpFile); */
	createInMemoryEdgeList(tmpFile);
	if(DEBUG)
		std::cout<<"CREATED MEMORY MAP\n";
	formatGraph(originalIndices);
	long long preprocessingTime = getTimeElapsed();
	reset();
	if(DEBUG)
		std::cout<<"FORMATTED GRAPH\n";
	findStartAndEndIndices();
	if(DEBUG)
		std::cout<<"START AND END INDICES COMPUTED\n";
	unsigned int *degree = new unsigned int[g.NODENUM + 1];
	unsigned int maxdeg = findDegree(edgeLabels, degree);
	unsigned int *core = new unsigned int[g.NODENUM + 1];
	std::thread t = std::thread(std::printf, "TEST\n");
	unsigned int numEdges = 0;
	unsigned int numtaEdges = 0;
	unsigned int numVerts = 0;
	unsigned int topLayer = 0;
	unsigned int mc;
	while(!isGraphEmpty(edgeLabels)) {
		std::copy(degree, degree + g.NODENUM + 1, core);
		parKCore(core, edgeLabels);
		mc = *std::max_element(core, core + g.NODENUM + 1);
		if (topLayer == 0)
			topLayer = mc;
		if(DEBUG)
			std::cout<<"CURRENT MAXIMUM CORE : "<<mc<<"\n";
		bool *isFinalNode = new bool[g.NODENUM + 1];
		std::fill_n(isFinalNode, g.NODENUM + 1, false);
		numVerts = 0;
		for(unsigned int i = 0; i <= g.NODENUM; i++) {
			if(core[i] == mc) {
				isFinalNode[i] = true;
				numVerts++;
			}
		}
		numtaEdges = labelEdgesAndUpdateDegree(mc, isFinalNode, degree, edgeLabels);
		delete [] isFinalNode;
		writeLayerMetaData(outputFile, mc, topLayer, numVerts, numtaEdges);
		numEdges += numtaEdges;
		if (numEdges >= BUFFER_NUM_EDGES) {
			/* writeLayerToFile(writeOut, prefix, topLayer, mc, originalIndices, edgeLabels, node2label); */
			t.join();
			t = std::thread(writeLayerToFile, prefix, topLayer, mc, originalIndices, edgeLabels, node2label);
			topLayer = 0;
			numEdges = 0;
		}
	}
	/* g.EDGENUM /= 2; */
	/* unsigned int *originalLabels = new unsigned int[g.EDGENUM]; */
	/* if(DEBUG) */
	/* 	std::cout<<"RECONSTRUCTING ORIGINAL LABELS\n"; */
	/* for(unsigned int i = 0; i < g.EDGENUM; i++) { */
	/* 	originalLabels[i] = edgeLabels[originalIndices[i]]; */
	/* } */
	long long algorithmTime = getTimeElapsed();
	/* writeToFile(originalIndices, originalLabels); */
	t.join();
	outputFile<<"\"0\":{}\n}";
	outputFile.close();
	if (numEdges > 0)
		writeLayerToFile(prefix, topLayer, mc, originalIndices, edgeLabels, node2label);
	writeMetaData(prefix, atoi(argv[3]), atoi(argv[2])/2, maxdeg, preprocessingTime, algorithmTime);
	remove(tmpFile);
	delete [] core;
	delete [] degree;
	delete [] g.start_indices;
	delete [] g.end_indices;
	delete [] edgeLabels;
	/* delete [] originalLabels; */
	delete [] originalIndices;
	return 0;
}
