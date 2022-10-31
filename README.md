# Graph-Cities
This repository contains code for [*Graph Cities*](new2:20video). Graph Cities are 3D visual representations of partitions of a graph edge set into maximal connected subgraphs each of which is called a fixed point of degree peeling. Each such connected subgraph is visually represented as a Building. A poly-log bucketization of the size distribution of the subgraphs represented by the buildings generates a 2D position for each bucket. The Delaunay triangulation of the bucket building locations determines the street network. We illustrate Graph Cities for the Friendster social network(1.8 billion edges), a co-occurrence keywords network derived from the Internet Movie Database (115 million edges), and a patent citation network(16.5 million edges). Up to 2 billion edges, all the elements of their corresponding Graph Cities are rendered in few minutes (excluding I/O time). The actual Graph Cities computation takes about 2 hours on a 64 GB RAM commodity computer. Our ultimate goal is to provide tools to build humanly interpretable descriptions of any graph, without being constrained by the graph size. It consists of four sub-modules: `wave-decomposition`, `Graph_City_Web`, `fpViewer` and `graph-strata`.

A sample Graph City can be navigated at [imdb-movieMovieKeyword57](link). Web interactions are fully tested using Chrome. There are some issues with Safari. Therefore, we recommand for the current version to only use Chrome as a browser. A video illustrating our current interface can be accessed at [here](uidemo). 

The main 2022 publication is:
```bibtex
@article{Abello2022GigaGC,
  title={Giga Graph Cities: Their Buckets, Buildings, Waves, and Fragments},
  author={James Abello and H. Zhang and Daniel Nakhimovich and Chengguizi Han and Mridul Aanjaneya},
  journal={IEEE Computer Graphics and Applications},
  year={2022},
  volume={42},
  pages={53-64}
}
```

## Funding
This is an NSF-funded project (NSF IIS-1563816 and IIS-1563971), led by Prof. [James Abello](mailto:abello@dimacs.rutgers.edu). It is partially funded by Nokia Bell Labs and Simons Research. It constitutes a major part of the incoming Ph.D. thesis of [Haoyang Zhang](mailto:hz333@scarletmail.rutgers.edu).

## Credits
- Overall Project Design and Coordination: [James Abello](mailto:abello@dimacs.rutgers.edu)
- Algorithms: James Abello, Haoyang Zhang, and Daniel Nakhimovich
- Overall Integration and Platform Deployment: Haoyang Zhang
- Graph Cities Rendering: Chengguizi Han, Daniel Nakhimovich, and Mridul Aanjaneya
- Parallel computation for Meta-DAG: Ishaan Ivaturi
- Force Directed Layout Applications: 
    - fpViewer: James Abello and Haoyang Zhang
    - Graph Strata base code: James Abello and Qi Dong
- Interaction Tools and Documentation: Haoyang Zhang, James Abello, and Shaad Quazi
- Data Sets Exploration: Fatima AlSaadeh, Tim Tangerlini, and Peter Broadwell
- Mini-Cloud Deployment: Haoyang Zhang, and Charles Hedrick

## Preprocessed Data Sets
### Large
| name                   | V         | E          | cc  | FP  |
|------------------------|-----------|------------|-----|-----|
| com-friendster         | 65608366  | 1806067135 | 1   | 72  |
| ogbn-papers100M        | 111059956 | 1614062356 | 151 | 159 |
| movies-tag-cooccurence | 218052    | 115050370  | 38  | 78  |

### Medium
| name          | V       | E        | cc   | FP  |
|---------------|---------|----------|------|-----|
| ogbn-products | 2400608 | 61859012 | 4237 | 102 |
| ogbn-proteins | 132534  | 39561252 | 1    | 157 |
| ogbn-mag      | 1134649 | 21090258 | 1    | 64  |
| cit-Patents   | 3774768 | 16518947 | 3627 | 41  |

### Small
| name           | V       | E       | cc    | FP |
|----------------|---------|---------|-------|----|
| Pandora papers | 1968951 | 2832596 | 31347 | 31 |
| ogbn-arxiv     | 169343  | 1157799 | 1     | 22 |

### Tiny
| name            | V     | E     | cc  | FP |
|-----------------|-------|-------|-----|----|
| Danish Fabula   | 19738 | 28292 | 414 | 6  |
| Game of Thrones | 796   | 2823  | 1   | 9  |
| Starwars        | 111   | 444   | 1   | 7  |

## Sample Findings
[ ] TOADDGALLERY

## Papers
If you use our code, please consider citing our paper.
```bibtex
@article{Abello2022GigaGC,
  title={Giga Graph Cities: Their Buckets, Buildings, Waves, and Fragments},
  author={James Abello and H. Zhang and Daniel Nakhimovich and Chengguizi Han and Mridul Aanjaneya},
  journal={IEEE Computer Graphics and Applications},
  year={2022},
  volume={42},
  pages={53-64}
}

@inproceedings{Abello2021GraphCT,
  title={Graph Cities: Their Buildings, Waves, and Fragments},
  author={James Abello and Daniel Nakhimovich and Chengguizi Han and Mridul Aanjaneya},
  booktitle={EDBT/ICDT Workshops},
  year={2021}
}

@article{Abello2020GraphW,
  title={Graph Waves},
  author={James Abello and Daniel Nakhimovich},
  journal={Big Data Res.},
  year={2020},
  volume={29},
  pages={100327}
}

@article{Abello2013FixedPO,
  title={Fixed points of graph peeling},
  author={James Abello and François Queyroi},
  journal={2013 IEEE/ACM International Conference on Advances in Social Networks Analysis and Mining (ASONAM 2013)},
  year={2013},
  pages={256-263}
}
```

# Flowchart of Graph Cities Infrastructure
![Graph Cities Infrastructure](./docs/figs/GraphCityFlow.png)

# Summary of Graph Cities Infrastructure
## Directory File Structure
Detailed subfolder structures and comments refer to corresponding sections.
```bash
./
├── wave-decomposition/ #backend computation algorithms and decomposition results
│   ├── scripts/
│   ├── src/
│   └── ${DATASET}/
├── Graph_City_Web/ #main frontend visualization: Graph City web application 
│   ├── data/
│   ├── data_dags/
│   ├── data_maps/
│   ├── label-history/
│   ├── lib/
│   ├── models/
│   ├── node_modules/
│   ├── patterns/
│   ├── python/
│   ├── scripts/
│   ├── textures/
│   ├── three.js/
│   ├── fpViewer/ #soft link to ../fpViewer/
│   ├── wave-decomposition/ #soft link to ../wave-decomposition/
│   └── ${DATASET}/ #soft link to ../wave-decomposition/${DATASET}/
├── fpViewer/ #complementary frontend visualization: fpViewer
│   ├── lib/
│   ├── localLib/
│   ├── style/
│   └── wave-decomposition/ #soft link to ../wave-decomposition/
└── graph-strata/ #complementary frontend visualization: Graph Strata
    ├── bin/
    ├── data2/
    ├── doc/
    ├── lib/
    ├── public/
    ├── src/
    └── temp2/
```
## Quick Start
### Clone Graph City Infrastructure
You may clone this repo just by typing the following line in your console:
```bash
git clone https://github.com/endlesstory0428/Graph-Cities.git
```
This will create a Graph City work space folder `Graph-Cities`. We refer to this folder as "Work Space" `./`.

### Compile Graph City Infrastructure
Before you start creating your own Graph City, you first need to compile "Graph Cities Infrastructure".
#### Compile `wave-decomposition`
Under your Work Space './', type the following commands in your console to compile `.cpp` files.
```bash
cd wave-decomposition
make
```
#### Link sub-modules
Under your Work Space './', type the following commands in your console to create soft links among the four sub-modules
```bash
ln -s $(pwd)/wave-decomposition $(pwd)/Graph_City_Web/
ln -s $(pwd)/wave-decomposition $(pwd)/fpViewer/
ln -s $(pwd)/fpViewer $(pwd)/Graph_City_Web/
```
#### Set Up Graph Cities Host Server
Under your Work Space `./`, type the following commands in your console to configure your server address and ports.
```bash
python3 config.py -a ${server_address} -c ${graph_city_port} -s ${graph_strata_port}
```

Under your Work Space `./`, type the following commands in your console to set up the "Graph Strata" server.
```bash
cd ./graph-strata/
mkdir data
npm ci
chmod +x run.sh
./run.sh
```

Under your Work Space `./`, type the following commands in your console to set up the "Graph Cities" web application server.
```bash
cd ./Graph_City_Web/
ln -s $(pwd) $(pwd)/public
npm ci
export NODE_OPTIONS="--max-old-space-size=65536"
node app_addon.js
```

### Build Your Own Graph City
#### Input Graph
Input your graph into the folder `./wave-decomposition/${DATASET}/`. The Graph Cities Infrastructure accepts two files as inputs: 
- **Graph Topology**: An ASCII edge list file `${DATASET}.txt` where each line is a pair of integers separated by a tab, 
- **Vertex Labels**: (Optional) a header-free CSV (following `RFC 4180` standard) vertex label file `${DATASET}_label.csv` with two columns:  `vertex_index`, `vertex label`.

Your directory file structure should be as follows:
```bash
./
├── wave-decomposition/
│   ├── scripts/
│   ├── src/
│   └── ${DATASET}/ #your input graph
│       ├── ${DATASET}.txt #pairs of integers separated by a tab
│       └── ${DATASET}_label.csv #header-free CSV
├── Graph_City_Web/
├── fpViewer/ 
└── graph-strata/
```
#### Process Decomposition
Under your Work Space `./`, type the following commands in your console to process your input graph.
```bash
cd wave-decomposition/
make GRAPH=${DATASET} prepare

cd ../Graph_City_Web/
make GRAPH=${DATASET} retrive
```
A detailed explanation of the commands above can be found in the [wave-decomposition section](#wave-decomposition) and [Graph_City_Web section](#graph_city_web).

#### Browse a Graph City
Use your web browser to access the following webpage containing your Graph City ready for exploration.
```bash
http://${server_address}:${graph_city_port}/?city=${DATASET}
```

# wave-decomposition
## Directory File Structure
```bash
wave-decomposition/ #backend computation algorithms and decomposition results
├── scripts/ #python source code
├── src/ #c++ source code
├── bindump.sh
├── Makefile
└── ${DATASET}/ #your own graph
    ├── ${DATASET}.txt #input edge list file
    ├── ${DATASET}_label.csv #input vertex label file
    ├── cityMesh/ #folder for Graph City main view geometry files
    ├── dag/ #folder for Graph City Meta-DAG files
    ├── ${DATASET}_layers/ #folder for iterative edge fixed point decomposition results
    ├── ${DATASET}_waves/ #folder for wave-fragment decomposition results
    ├── building2bucket-${DATASET}.json #mapping from spiral layout bucket to its representative building
    ├── $cloneCnt.csv #mapping from vertex to its iterative edge fixed point decomposition vertex clone count
    ├── graph-*-*.json #spiral layout bucket information
    ├── ${DATASET}-bucket2peels.json #mapping from spiral layout bucket to its corresponding fixed point values
    ├── ${DATASET}-fpmeta.csv #iterative edge fixed point decomposition vertex intersection graph topology 
    ├── ${DATASET}-fpmeta.ids #iterative edge fixed point decomposition vertex intersection graph vertex labels
    ├── ${DATASET}-info.json #spiral layout information
    ├── ${DATASET}-layers-dists.json #iterative edge fixed point decomposition distribution
    ├── ${DATASET}-lccBuck.l-lcc-b.csv #mapping from connected fixed point to its bucket size indicator
    ├── ${DATASET}-lccWaves.vBuck.b.p.mm.json #grid map information
    ├── ${DATASET}-summary.json #summary information of decomposition
    ├── ${DATASET}.cc #mapping from vertex to its connected component
    ├── ${DATASET}.deg #mapping from vertex to its degree
    ├── ${DATASET}_entropy.json #average vertex diversity of each iterative edge fixed point
    ├── lcc-duplicates.json #information of connected fixed point with the same fixed point value and number of vertices and edges
    ├── localDeg.csv #mapping from vertex to its local degree on each iterative edge fixed point
    └── metagraph_normalized.txt #iterative edge fixed point decomposition vertex intersection graph summarized by spiral layout buckets
```
## Commands
For an input graph `${DATASET}` residing in `./wave-decomposition/${DATASET}`, a simple one-shot command to process it is the following:
```bash
make GRAPH=${DATASET} prepare
```
This make program automatically invokes the following commands:
### Graph Decomposition Phase
#### Preprocess Input Graph

- The following make program preprocesses the input graph as a bidirectional binary edge list, and outputs the vertex degrees `${DATASET}.deg` and connected components `${DATASET}.cc`.
```bash
make GRAPH=${GRAPH} union
```
#### Iterative Fixed Points Edge Decomposition
- The following make program applies the "iterative edge fixed point decomposition" to the preprocessed graph, and outputs a folder containing the "edge fixed point decomposition" results `${DATASET}_layers/`
```bash
make GRAPH=${GRAPH} decomp
```
#### For each Fixed Point, generate its Wave/Fragment Vertex Decomposition
- The following make program applies the "wave-fragment vertex decomposition" to fixed points, and outputs a folder containing results `${DATASET}_waves/`
```bash
make GRAPH=${GRAPH} dwave-all_next
```

The "wave-fragment vertex decomposition" of a **single** fixed point can be invoked as follows:
```bash
make GRAPH=${GRAPH} LAYER=$(FIXEDPOINT) dwave_next
```
#### Map connected Waves to connected Fixed Points
- The following make program computes connected fixed points, and obtains a mapping from each connected wave to its corresponding unique connected fixed point. The updated outputs are stored under `${DATASET}_layers/` and `${DATASET}_waves/`.
```bash
make GRAPH=${GRAPH} cc-layers-uf
make GRAPH=${GRAPH} wave-layer-cc_direct
```
### Information Collection Phase
#### Log Bucketization
- The following make programs and python scripts collect connected fixed point information and generate a mapping from connected fixed point ids to log bucket ids. The output consists of three collections of files:
    - `graph-*-*.json`: connected fixed point information in each bucket.
    - `lcc-duplicates.json`: a mapping from a representative connected fixed point to a list of connected fixed points with the same number of vertices, edges, and the fixed point value as the representative one.
    - `${DATASET}-info.json`: log bucket information.
```bash
make GRAPH=${GRAPH} fp-info_int
$(PYTHON) scripts/test/lcc-json2csv.py ${GRAPH}
make GRAPH=${GRAPH} bucket_int
```
#### For each Fixed Point generate its Buildings
- The following make program collects wave-fragment decomposition information as building information under the `${DATASET}_waves/` folder.
```bash
make GRAPH=${GRAPH} wavemap_cpp
```
#### Generate City Summary Sculpture Geometry
- The following make program collects iterative edge fixed point vertex local degree `localDeg.csv`, computes vertex diversity, and generates summary sculpture information as `${DATASET}-layers-dists.json`, and `${DATASET}_entropy.json`.
```bash
make GRAPH=${GRAPH} sculpture_int_cpp
```
#### Generate Vertex Intersection Graph
- The following make program computes "iterative edge fixed point vertex intersection graph" and generates "road network" information as `${DATASET}-fpmeta.csv`, `${DATASET}-fpmeta.ids`, and  `metagraph_normalized.txt`.
```bash
make GRAPH=${GRAPH} intersection_int_cpp
```
#### Generate City Grid Map
- The following make program collects connected fixed point information, and generates grid map information as `building2bucket-${DATASET}.json`, `${DATASET}-bucket2peels.json`, `${DATASET}-lccBuck.l-lcc-b.csv`, and `${DATASET}-lccWaves.vBuck.b.p.mm.json`.
```bash
make GRAPH=${GRAPH} gridmap_cpp
```
#### Generate Buildings/Bushes Geometry & Spiral City Layout
- The following make program generates the Graph City main view geometry files in the folder `cityMesh/`. This geometry is derived from the building information contained in the folder `${GRAPH}_waves/` 
```bash
make GRAPH=${GRAPH} geom
```
#### City Information Summary
- The following make program generates summary information in the file `${DATASET}-summary.json`, and distribution plots `${DATASET}_*.png`.
```bash
$(PYTHON) scripts/freqUsed/getCityInfo.py ${GRAPH}
$(PYTHON) scripts/test/getBestPlot.py ${GRAPH}
$(PYTHON) scripts/test/getLccDist.py ${GRAPH}
```
#### For each Fixed Point Generate Meta-DAGs
- The following make programs generate internal building structures represented as Meta-DAGs. Outputs are contained under the folder `dag/`.
```bash
make GRAPH=${GRAPH} frag-dag-touch-all
make GRAPH=${GRAPH} top-src-span-touch-all
make GRAPH=${GRAPH} wcc-compress-touch-all
make GRAPH=${GRAPH} wave-frag-compress-touch-all
make GRAPH=${GRAPH} edge-cut-compress-touch-all
make GRAPH=${GRAPH} dag-size
```
### Visualization Postprocessing Phase
#### Bucketize Connected Fixed Points according to Logarithmic Buckets
- The following make program splits wave-fragment decomposition results according to logarithmic buckets under folder `${DATASET}_waves/`
```bash
make GRAPH=${GRAPH} lccBuck;
```
#### Update Building Interior Information
- The following python scripts modify buildings' information according to their interior Meta-DAG structure. The result is stored under the folder `cityMesh/`
```bash
$(PYTHON) scripts/test/addDagInfo.py ${GRAPH}
$(PYTHON) scripts/test/checkLargeNode.py ${GRAPH}
$(PYTHON) scripts/test/addBuckESize.py ${GRAPH}
```
# graph_city_web
## Directory File Structure
```bash
graph_city_web/ #main frontend visualization: Graph City web application 
├── data/ #main view information and summaries
│   ├── ${DATASET}/ #soft link to ../../wave-decomposition/${DATASET}/cityMesh
│   ├── ${DATASET}-summary.json #copyed from #soft link to ../../wave-decomposition/${DATASET}/${DATASET}-summary.json
│   └── ${DATASET}_*.png #moved from #soft link to ../../wave-decomposition/${DATASET}/${DATASET}_*.png
├── data_dags/ #building interior Meta-DAG inforamtion
│   └── ${DATASET}/ #soft link to ../../wave-decomposition/${DATASET}/dag
├── data_maps/ #grid map information files
├── label-history/ #history of label request responses
├── lib/ #local library modules
├── models/ #3D objects for visualization
├── node_modules/ #node.js modules
├── patterns/ #Graph City pattern gallery
├── python/ #street network python scripts and results
│   └── ${DATASET}/ #street network files
├── scripts/ #js scripts and summary sculpture informations
├── textures/ #2D textures for visualization
├── three.js/ #THREE.js module
├── fpViewer/ #soft link to ../fpViewer/
├── wave-decomposition/ #soft link to ../wave-decomposition/
├── ${DATASET}/ #soft link to ../wave-decomposition/$DATASET/
├── index.html.template #template of Graph City Web Application HTML page
├── Makefile
└── package.json #node.js package dependencies
```
## Dependencies
```
node.js: v16.15.0
npm: 8.5.5
```
The other dependencies are listed in `package.json`.

## Commands
- The following make program creates soft links from the source input dataset `wave-decompostion/${DATASET}/` to the Graph City main frontend application `graph_city_web/`. The result of this is the creation of a new city.
```bash
make GRAPH=${DATASET} retrive
```
- The following make program creates soft links from the source input dataset `wave-decompostion/${DATASET}/` to the Graph City main frontend application `graph_city_web/`. The result of this is the creation of a minicity room.
```bash
make GRAPH=${DATASET} retrive-mall
```
- The following make program creates soft links from the source input dataset `wave-decompostion/${DATASET}/` to the Graph City main frontend application `graph_city_web/`. The result of this is the creation of a vicinity park.
```bash
make GRAPH=${DATASET} retrive-vicinity
```

# fpViewer
## File Structure
```bash
fpViewer/ #complementary frontend visualization: fpViewer
├── lib/ #online modules local version
├── localLib/ #local modules
├── style/ #css
├── wave-decomposition/ #soft link to ../wave-decomposition/
├── Makefile
├── ${SUBGRAPH}_waves/ #soft link to ../wave-decomposition/${SUBGRAPH}/${SUBGRAPH}_waves/
├── ${SUBGRAPH}-idx2LayerBucket.i-l-b.csv #iterative edge fixed point decomposition vertex intersection graph labels
├── ${SUBGRAPH}-layerBucketEdge.s-t-w.csv #iterative edge fixed point decomposition vertex intersection graph summarized by grid map
├── ${SUBGRAPH}-layerBucketEdge.s-t-w.span.csv #spanning iterative edge fixed point decomposition vertex intersection graph summarized by grid map
├── ${SUBGRAPH}-lccBuck.l-lcc-b-v-e.csv #grid map information
├── ${SUBGRAPH}.cc-layers #iterative edge fixed point decomposition vertex intersection graph
└── ${SUBGRAPH}_names.csv #vertex labels
```
## Limitation of fpViewer
The number of waves per connected fixed point should be no larger than 50, the number of fragments per wave should be no larger than 60, and the number of edges of each fragment should be no larger than 8192. This in effect allows the fpViewer to process fixed points with at most `50 * 60 * 8192 = 24,576,000` edges provided that a suitable parameterized hierarchy tree for the fixed point is pre-computed. In this release, the provided fpViewer is able to handle detailed visualizations of non-regular general graphs with at most 131,072 edges provided all of its fragments have no more than 8192 edges. The purpose of fpViewer is to locally explore medium-sized graphs that consist of fixed points with about 3,000 "small" fragments. This is feasible by using the intersection graph of the iterative edge fixed point vertex sets.

# graph-strata
A full documentation for Graph Strata is availiable [here](https://fatimaalsaadeh.com/projects/Documentation.pdf).

There are some issues with Safari. Therefore, we recommand for the current version to only use Chrome as a browser.

## Limitation of Graph Strata
The number of edges of the input graph should be no larger than 16,384. The purpose of Graph Strata is to locally explore small-sized graphs with variaty algorithms including iterative fixed point decomposition and wave-fragment vertices decomposition in a layered view.
