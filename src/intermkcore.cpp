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
#include <stdlib.h>
#include <stdio.h>
#include <limits.h>
#include <omp.h>
#include <thread>
#define DEBUG 1

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
void createInMemoryEdgeList(char *fileName) {
	g.edgeList = new edge[g.EDGENUM];
	std::ifstream is;
	is.open(fileName, std::ios::in | std::ios::binary);
	unsigned int src, tgt;
	unsigned int updatedEdgeNum = g.EDGENUM;
	for(unsigned int i = 0; i < g.EDGENUM; i++) {
		is.read((char *)(&src), sizeof(unsigned int));
		is.read((char *)(&tgt), sizeof(unsigned int));
		assert(src >= 0 && src <= g.NODENUM);
		assert(tgt >= 0 && tgt <= g.NODENUM);
		(g.edgeList + i)->src = src;
		(g.edgeList + i)->tgt = tgt;
	}
	is.close();
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

void doubleAndReverseGraph(char *inputFile, char *outputFile, unsigned int *label2node) {
	std::ifstream is;
	is.open(inputFile, std::ios::in | std::ios::binary);
	std::ofstream os;
	os.open(outputFile, std::ios::out | std::ios::binary | std::ios::app);
	unsigned int src, tgt;
	/* unsigned int updatedEdgeNum = g.EDGENUM; */
	for(unsigned int i = 0; i < g.EDGENUM; i++) {
		is.read((char *)(&src), sizeof(unsigned int));
		is.read((char *)(&tgt), sizeof(unsigned int));
		src = label2node[htonl(src)];
		tgt = label2node[htonl(tgt)];
		assert(src >= 0 && src <= g.NODENUM);
		assert(tgt >= 0 && tgt <= g.NODENUM);
		// Removes self loops
		if(src != tgt) {
			os.write((char *)&src, sizeof(unsigned int));
			os.write((char *)&tgt, sizeof(unsigned int));
		}
		/* else { */
		/* 	updatedEdgeNum--; */
		/* } */
	}
	/* is.seekg(0, std::ios::beg); */
	/* for(unsigned int i = 0; i < g.EDGENUM; i++) { */
	/* 	is.read((char *)(&src), sizeof(unsigned int)); */
	/* 	is.read((char *)(&tgt), sizeof(unsigned int)); */
	/* 	src = label2node[htonl(src)]; */
	/* 	tgt = label2node[htonl(tgt)]; */
	/* 	assert(src >= 0 && src <= g.NODENUM); */
	/* 	assert(tgt >= 0 && tgt <= g.NODENUM); */
	/* 	// Removes self loops */
	/* 	if(src != tgt) { */
	/* 		os.write((char *)(&tgt), sizeof(unsigned int)); */
	/* 		os.write((char *)(&src), sizeof(unsigned int)); */
	/* 	} */
	/* } */
	/* g.EDGENUM = updatedEdgeNum; */
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
		if(edgeLabels[i] == -1)
				return false;
	}
	return true;
}

// Computes the degree of each node in the graph
void findDegree(unsigned int *edgeLabels, float *degree) {
	std::fill_n(degree, g.NODENUM + 1, 0);
	for(unsigned int i = 0; i < g.EDGENUM; i++) {
		// If edge hasn't been deleted yet. An edge is considered deleted
		// when it has been labeled.
		if(edgeLabels[i] == -1) {
			degree[(g.edgeList + i)->src]++;
			degree[(g.edgeList + i)->tgt]++;
		}
	}
	for(unsigned int i = 0; i < g.NODENUM + 1; i++) {
		degree[i] /= 2;
	}
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
				if(edgeLabels[j] == -1) {
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

void findKCore(unsigned int *edgeLabels, unsigned int *deg) {
	unsigned int * vert = new unsigned int[g.NODENUM + 1];
	unsigned int * pos = new unsigned int[g.NODENUM + 1];
	std::fill_n(vert, g.NODENUM + 1, 0);
	std::fill_n(pos, g.NODENUM + 1, 0);
	unsigned int md = *std::max_element(deg, deg + g.NODENUM + 1);
	unsigned int * bins = new unsigned int[md + 1];
	std::fill_n(bins, md + 1, 0);
	for(unsigned int v = 1; v <= g.NODENUM; v++)
		bins[deg[v]]++;
	unsigned int start = 1;
	for(unsigned int d = 0; d <= md; d++) {
		unsigned int num = bins[d];
		bins[d] = start;
		start += num;
	}
	for(unsigned int v = 1; v <= g.NODENUM; v++) {
		pos[v] = bins[deg[v]];
		vert[pos[v]] = v;
		bins[deg[v]]++;
	}
	for(unsigned int d = md; d > 0; d--) {
		bins[d] = bins[d - 1];
	}
	bins[0] = 1;
	//unsigned int old_src = -1, old_tgt = -1;
	for(unsigned int i = 1; i <= g.NODENUM; i++) {
		unsigned int v = vert[i];
		// Do nothing if node doesn't exist in the graph
		if(g.start_indices[v] == 0 && g.end_indices[v] == 0) {
			;
		}
		else {
			for(unsigned int j = g.start_indices[v]; j <= g.end_indices[v]; j++) {
				if(edgeLabels[j] == -1) {
					//if((edgeList + j)->src != old_src || (edgeList + j)->tgt != old_tgt) {
						unsigned int u = (g.edgeList + j)->tgt;
						if(deg[u] > deg[v]) {
							unsigned int du = deg[u];
							unsigned int pu = pos[u];
							unsigned int pw = bins[du];
							unsigned int w = vert[pw];
							if(u != w) {
								pos[u] = pw;
								pos[w] = pu;
								vert[pu] = w;
								vert[pw] = u;
							}
							bins[du]++;
							deg[u]--;
						}
					//}
				}
				//old_src = (edgeList + j)->src;
				//old_tgt = (edgeList + j)->tgt;
			}
		}
	}
	delete [] vert;
	delete [] pos;
	delete [] bins;
}


void labelEdgesAndUpdateDegree(unsigned int peel, bool *isFinalNode, float *degree, unsigned int *edgeLabels) {
	for(unsigned int i = 0; i < g.EDGENUM; i++) {
		unsigned int src = (g.edgeList + i)->src;
		unsigned int tgt = (g.edgeList + i)->tgt;
		if(isFinalNode[src] && isFinalNode[tgt] && edgeLabels[i] == -1) {
			edgeLabels[i] = peel;
			degree[src] -= 0.5;
			degree[tgt] -= 0.5;
		}
	}
}

void labelAndDeletePeelOneEdges(float *degree, unsigned int *edgeLabels) {
	float *tmp = new float[g.NODENUM + 1];
	std::copy(degree, degree + g.NODENUM + 1, tmp);
	for(unsigned int i = 0; i < g.EDGENUM; i++) {
		unsigned int src = (g.edgeList + i)->src;
		unsigned int tgt = (g.edgeList + i)->tgt;
		if(edgeLabels[i] == -1) {
			if(tmp[src] == 1 || tmp[tgt] == 1) {
				edgeLabels[i] = 1;
				degree[src] -= 0.5;
				degree[tgt] -= 0.5;
			}
		}
	}
	delete [] tmp;
}

void writeToFile(unsigned int *edgeIndices, unsigned int *edgeLabels, unsigned int *node2label) {
	std::ofstream outputFile;
	outputFile.open("graph-decomposition.csv");
	for(unsigned int i = 0; i < g.EDGENUM; i++) {
		outputFile<<node2label[(g.edgeList + edgeIndices[i])->src]<<","<<node2label[(g.edgeList + edgeIndices[i])->tgt]<<","<<edgeLabels[i]<<"\n";
	}
	outputFile.close();
}

void writeLayerToFile(std::string prefix, unsigned int layer, unsigned int *edgeIndices, unsigned int *edgeLabels, unsigned int *node2label) {
	long long wtime = currentTimeStamp();
	std::ofstream outputFile;
	outputFile.open(prefix.substr(0,prefix.length()-4)+"_layers/layer"+std::to_string(layer)+".csv");
	for(unsigned int i = 0; i < g.EDGENUM; i++) {
		if (edgeLabels[edgeIndices[i]] == layer)
			outputFile<<node2label[(g.edgeList + edgeIndices[i])->src]<<","<<node2label[(g.edgeList + edgeIndices[i])->tgt]<<","<<layer<<"\n";
	}
	outputFile.close();

	outputFile.open(prefix.substr(0,prefix.length()-4)+"_layers/layer"+std::to_string(layer)+"-info.json");
	outputFile<<"{\n";
	outputFile<<"\"io-time\":"<<(ioTime += currentTimeStamp()-wtime)<<"\n}";
	outputFile.close();
}

void writeMetaData(std::string prefix, unsigned int NODENUM, unsigned int EDGENUM, long long preprocessingTime, long long algorithmTime) {
	std::ofstream outputFile;
	outputFile.open(prefix.substr(0,prefix.length()-4)+"-decomposition-info.json");
	outputFile<<"{\n";
	outputFile<<"\"vertices\":"<<NODENUM<<",\n";
	outputFile<<"\"edges\":"<<EDGENUM<<",\n";
	outputFile<<"\"preprocessing-time\":"<<preprocessingTime<<",\n";
	outputFile<<"\"algorithm-time\":"<<algorithmTime<<"\n";
	outputFile<<"\"io-time\":"<<ioTime<<"\n}";
	outputFile.close();
}

int main(int argc, char *argv[]) {
	if (argc < 6) {
		std::cerr<<argv[0]<<": usage: ./atlas-decomposition <path to graph.bin> <# edges> <# nodes> <path to graph.nodemap> <largest node label>\n";
		exit(1);
	}
	char tmpFile[] = "tmp.bin";
	remove(tmpFile);
	g.EDGENUM = atoi(argv[2]);
	g.NODENUM = atoi(argv[3]);
	reset();
	unsigned int *node2label = new unsigned int[g.NODENUM];
	unsigned int *label2node = new unsigned int[atoi(argv[5])];
	initNodeMap(argv[4], node2label, label2node);
	doubleAndReverseGraph(argv[1], tmpFile, label2node);
	if(DEBUG)
		std::cout<<"DOUBLED AND REVERSED GRAPH\n";
	unsigned int *originalIndices = new unsigned int[g.EDGENUM];
	unsigned int *edgeLabels = new unsigned int[g.EDGENUM];
	std::fill_n(edgeLabels, g.EDGENUM, -1);
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
	float *degree = new float[g.NODENUM + 1];
	findDegree(edgeLabels, degree);
	unsigned int *core = new unsigned int[g.NODENUM + 1];
	std::thread t = std::thread(std::printf, "TEST\n");
	while(!isGraphEmpty(edgeLabels)) {
		std::copy(degree, degree + g.NODENUM + 1, core);
		parKCore(core, edgeLabels);
		/* findKCore(edgeLabels, core); */
		unsigned int mc = *std::max_element(core, core + g.NODENUM + 1);
		if(DEBUG)
			std::cout<<"CURRENT MAXIMUM CORE : "<<mc<<"\n";
		bool *isFinalNode = new bool[g.NODENUM + 1];
		std::fill_n(isFinalNode, g.NODENUM + 1, false);
		for(unsigned int i = 0; i <= g.NODENUM; i++) {
			if(core[i] == mc) {
				isFinalNode[i] = true;
			}
		}
		labelEdgesAndUpdateDegree(mc, isFinalNode, degree, edgeLabels);
		delete [] isFinalNode;
		/* writeLayerToFile(argv[1], mc, originalIndices, edgeLabels, node2label); */
		t.join();
		t = std::thread(writeLayerToFile, argv[1], mc, originalIndices, edgeLabels, node2label);
	}
	/* g.EDGENUM /= 2; */
	unsigned int *originalLabels = new unsigned int[g.EDGENUM];
	if(DEBUG)
		std::cout<<"RECONSTRUCTING ORIGINAL LABELS\n";
	for(unsigned int i = 0; i < g.EDGENUM; i++) {
		originalLabels[i] = edgeLabels[originalIndices[i]];
	}
	long long algorithmTime = getTimeElapsed();
	t.join();
	writeToFile(originalIndices, originalLabels, node2label);
	writeMetaData(argv[1], atoi(argv[3]), atoi(argv[2]), preprocessingTime, algorithmTime);
	remove(tmpFile);
	delete [] core;
	delete [] degree;
	delete [] g.start_indices;
	delete [] g.end_indices;
	delete [] edgeLabels;
	delete [] originalLabels;
	delete [] originalIndices;
	return 0;
}
