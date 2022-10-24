# Graph-Cities
This repository stores code for *Graph Cities*, which contians four parts: `wave-decomposition`, `Graph_City_Web`, `fpViewer` and `graph-strata`.

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
```

# Flowchart of Graph Cities Infrastructure
![Graph Cities Infrastructure](.\docs\figs\GraphCityFlow.png)

# Summary of Graph Cities Infrastructure
## File Structure
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
### Build Your Own Graph City
#### Input Graph
Input your graph at `wave-decomposition/${DATASET}/`, we accept two files: 
- An ASCII edge list file `${DATASET}.txt` where each line is a pair of integers separated by a tab, 
- (Optional) a header-free CSV (following `RFC 4180` standard) vertex label file `${DATASET}_label.csv` with two columns:  `vertex_index`, `vertex label`.

Your file structure should be following:
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
Under your work space `./`, type the following commands will process your input graph.
```bash
cd wave-decomposition/
make GRAPH=${DATASET} prepare
cd ../Graph_City_Web/
make GRAPH=${DATASET} retrive
```
A detailed explanation can be found in [wave-decomposition section](#wave-decomposition) and [Graph_City_Web section](#graph_city_web).

#### Set Up Server
Under your work space `./`, type the following commands will set up web application server.
```bash
cd ../Graph_City_Web/
export NODE_OPTIONS="--max-old-space-size=65536"
node app_addon.js
```

#### Browse Graph City
Using your web browser to access the following webpage will bring your Graph City.
```bash
http://${server_address}:18000/?city=${DATASET}
```

# wave-decomposition
## File Structure
```bash
wave-decomposition/ #backend computation algorithms and decomposition results
├── scripts/ #python source code
├── src/ #c++ source code
├── bindump.sh
├── Makefile
└── $DATASET/ #your own graph
    ├── ${DATASET}.txt #input edge list file
    ├── ${DATASET}_label.csv #input vertex label file
    ├── cityMesh/ #folder for Graph City main view geometry files
    ├── dag/ #folder for Graph City Meta-DAG files
    ├── ${DATASET}_layers/ #folder for iterative edge fixed point decomposition results
    ├── ${DATASET}_waves/ #folder for wave-fragment decomposition results
    ├── building2bucket-${DATASET}.json #mapping from spiral layout bucket to its representitive building
    ├── $cloneCnt.csv #mapping from vertex to its iterative edge fixed point decomposition vertex clone count
    ├── graph-*-*.json #spiral layout bucket information
    ├── ${DATASET}-bucket2peels.json #mapping from spiral layout bucket to its corresponding fixed point values
    ├── ${DATASET}-fpmeta.csv #iterative edge fixed point decomposition vertex intersection graph topology 
    ├── ${DATASET}-fpmeta.ids #iterative edge fixed point decomposition vertex intersection graph vertex labels
    ├── ${DATASET}-info.json #spiral layout information
    ├── ${DATASET}-layers-dists.json #iterative edge fixed point decomposition distribution
    ├── ${DATASET}-lccBuck.l-lcc-b.csv #mapping from connected fixed point to its bucket size indicator
    ├── ${DATASET}-lccWaves.vBuck.b.p.mm.json #grid map information
    ├── ${DATASET}-summary.json #summary infomation of decomposition
    ├── ${DATASET}.cc #mapping from vertex to its connected component
    ├── ${DATASET}.deg #mapping from vertex to its degree
    ├── ${DATASET}_entropy.json #average vertex diversity of each iterative edge fixed point
    ├── lcc-duplicates.json #infomation of connected fixed point with the same fixed point value and number of vertices and edges
    ├── localDeg.csv #mapping from vertex to its local degree on each iterative edge fixed point
    └── metagraph_normalized.txt #iterative edge fixed point decomposition vertex intersection graph summarized by spiral layout buckets
```
## Commands
For an input graph `${${DATASET}}`, a simple one-shot command to process it is the following:
```bash
make GRAPH=${DATASET} prepare
```
It will automatically call the following commands:
### Graph Decomposition Phase
#### Preprocess Input Graph

- This line will preprocess the input graph as a bidirectional binary edge list, and also output vertex degrees `${DATASET}.deg` and connected components `${DATASET}.cc`.
```bash
make GRAPH=$(GRAPH) union
```
#### Iterative Fixed Points Edge Decomposition
- This line will apply iterative edge fixed point decomposition to the preprocessed graph, and output a folder containing results `${DATASET}_layers/`
```bash
make GRAPH=$(GRAPH) decomp
```
#### For each Fixed Point, generate its Wave/Fragment Vertex Decomposition
- This line will apply wave-fragment decomposition to fixed points, and output a folder containing results `${DATASET}_waves/`
```bash
make GRAPH=$(GRAPH) dwave-all_next
```
#### Map connected Waves to connected Fixed Points
- These lines will compute connected fixed points, and map each connected wave to its connected fixed point. Outputs are updated under `${DATASET}_layers/` and `${DATASET}_waves/`.
```bash
make GRAPH=$(GRAPH) cc-layers-uf
make GRAPH=$(GRAPH) wave-layer-cc_direct
```
### Information Collection Phase
#### Log Bucketization
- These line will collect connected fixed point information and generate a spiral layout as `graph-*-*.json`, `lcc-duplicates.json` and `${DATASET}-info.json`
```bash
make GRAPH=$(GRAPH) fp-info_int
$(PYTHON) scripts/test/lcc-json2csv.py $(GRAPH)
make GRAPH=$(GRAPH) bucket_int
```
#### For each Fixed Point generate its Buildings
- This line will collect wave-fragment decomposition information as building information under `${DATASET}_waves/` folder.
```bash
make GRAPH=$(GRAPH) wavemap_cpp
```
#### Generate City Summary Sculpture Geometry
- This line will collect iterative edge fixed point vertex local degree `localDeg.csv`, compute vertex diversity, and generate summary sculpture information as `${DATASET}-layers-dists.json`, and `${DATASET}_entropy.json`.
```bash
make GRAPH=$(GRAPH) sculpture_int_cpp
```
#### Generate Vertex Intersection Graph
- This line will compute iterative edge fixed point vertex intersection graph and generate road network information as `${DATASET}-fpmeta.csv`, `${DATASET}-fpmeta.ids`, and  `metagraph_normalized.txt`.
```bash
make GRAPH=$(GRAPH) intersection_int_cpp
```
#### Generate City Grid Map
- This line will collect connected fixed point information and generate grid map information as `building2bucket-${DATASET}.json`, `${DATASET}-bucket2peels.json`, `${DATASET}-lccBuck.l-lcc-b.csv`, and `${DATASET}-lccWaves.vBuck.b.p.mm.json`.
```bash
make GRAPH=$(GRAPH) gridmap_cpp
```
#### Generate Buildings/Bushes Geometry & Spiral City Layout
- This line will generate Graph City main view geometry files from building information under folder `cityMesh/`
```bash
make GRAPH=$(GRAPH) geom
```
#### Summarize City Information
- These line will generate summary information `${DATASET}-summary.json` and distribution plots `${DATASET}_*.png`.
```bash
$(PYTHON) scripts/freqUsed/getCityInfo.py $(GRAPH)
$(PYTHON) scripts/test/getBestPlot.py $(GRAPH)
$(PYTHON) scripts/test/getLccDist.py $(GRAPH)
```
#### For each Fixed Point Generate Meta-DAGs
- These lines will compute Meta-DAG as building interior from wave-fragment decomposition under folder `dag/`
```bash
make GRAPH=$(GRAPH) frag-dag-touch-all
make GRAPH=$(GRAPH) top-src-span-touch-all
make GRAPH=$(GRAPH) wcc-compress-touch-all
make GRAPH=$(GRAPH) wave-frag-compress-touch-all
make GRAPH=$(GRAPH) edge-cut-compress-touch-all
make GRAPH=$(GRAPH) dag-size
```
### Visualization Postprocessing Phase
#### Bucketize Edges by spiral layout buckets
- This line will split wave-fragment decomposition results according to spiral layout buckets under folder `${DATASET}_waves/`
```bash
make GRAPH=$(GRAPH) lccBuck;
```
#### Update Building Interior Information
- These lines will mark buildings according to its interior Meta-DAG information under folder `cityMesh/`
```bash
$(PYTHON) scripts/test/addDagInfo.py $(GRAPH)
$(PYTHON) scripts/test/checkLargeNode.py $(GRAPH)
$(PYTHON) scripts/test/addBuckESize.py $(GRAPH)
```
# graph_city_web
## File Structure
```bash
Graph_City_Web/ #main frontend visualization: Graph City web application 
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
├── index.html.template #template of Graph City Web Application html page
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
- This line will link `${DATASET}` as a new city.
```bash
make GRAPH=${DATASET} retrive
```
- This line will link `${DATASET}` as a minicity room.
```bash
make GRAPH=${DATASET} retrive-mall
```
- This line will link `${DATASET}` as a vicinity park.
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
## Limitation
This complementary aims to show wave-fragment decomposition of iterative edge fixed points and vertex intersection graph between iterative edge fixed points.
The size of each fragment should be no larger than 8192 edges, the number of fragments per wave should be no larger than 60, and the number of waves per connected fixed point should be no larger than 50.

# graph-strata
A full documentation for Graph Strata is avilible [here](https://fatimaalsaadeh.com/projects/Documentation.pdf).