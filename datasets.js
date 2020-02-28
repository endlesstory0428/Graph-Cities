'use strict';
//added precomputed hierachy-like datasets.
const Graph = require("./lib/graph.js"), Algs = require("./lib/graph-algorithms.js"), fs = require('node-fs'),
    zlib = require('zlib'), Buffer = require('buffer').Buffer, path = require('path'),
    readline = require('readline'), {exec, spawn} = require('child_process');
var datasetFiles = {};
var datasets = {};
var datasetList;
var datasetIDMaps = {};
var dataDir, cacheDir;
let summaryProperties = ["id", "name", "info"];//"hidden","dynamic","params","vertexCount","edgeCount","isHierarchy","layers"

let timeTolerance = 5000;//??
let summaryFunctions = {
    "V": (d) => d.data.vertices.length,
    "E": (d) => d.data.edges.length,
};

function getDatasetSummary(d) {
    let result = {};
    for (let p of summaryProperties) {
        if (p in d) result[p] = copyObj(d[p]);
    }
    for (let p in summaryFunctions) {
        let v = summaryFunctions[p](d);
        if (v !== undefined) result[p] = copyObj(v);
    }
    return result;
}

function getDatasetList() {
    return datasetList;
}

function makeDatasetList() {//could this be dynamic?
    //if(datasetList)return datasetList;
    let result = {};
    for (let id in datasets) {
        if (datasets[id].summary.hidden) continue;
        result[id] = datasets[id].summary;
    }
    datasetList = result;
    return result;
}


function loadAllDatasets(d, c, callback, failure, cachesToRefresh, noDerived) {
    dataDir = d, cacheDir = c;
    if (!fileExists("")) {
        mkdir("");
    }
    checkFilesInDataDir(dataDir);
    loadAllFiles(datasetFiles, cachesToRefresh, noDerived).then(async (v) => {
        makeDatasetList();
        if (callback) callback(datasetList);
        console.log("***loading all datasets finished*** " + (v || ""));
        loadExtraData();//await ?
    }).catch((e) => {
        console.log(e);
        console.log("***loading all datasets failed***");
        failure();
    });
}

function reloadAllDatasets(cachesToRefresh) {
    datasetFiles = {};
    if (fs.existsSync(dataDir) == false) {
        return;
    }
    checkFilesInDataDir(dataDir);
    loadAllFiles(datasetFiles, cachesToRefresh).then(async (v) => {
        makeDatasetList();
        console.log("***loading all datasets finished*** " + (v || ""));
        loadExtraData();//await ?
    }).catch((e) => {
        console.log(e);
        console.log("***loading all datasets failed***");
    });
}


function checkFilesInDataDir(dataDir) {
    if (fs.existsSync(dataDir) == false) {
        console.log("data directory not found: " + dataDir);
        return;
    }
    let stat = fs.statSync(dataDir);
    if (stat.isDirectory() == false) {
        throw Error("must have a data directory");
    }
    fs.readdirSync(dataDir).forEach((f) => checkDatasetTopLevel(dataDir + "/" + f, f));//path.sep
}

function checkDatasetTopLevel(filepath, topLevelFileName) {
    let stat = fs.statSync(filepath);
    if (stat.isDirectory() == false) {
        let segments = topLevelFileName.split(".");
        let id = segments.slice(0, segments.length - 1).join("."), type = segments[segments.length - 1];
        if (id == "") id = topLevelFileName;
        if (!datasetFiles[id]) datasetFiles[id] = [];
        datasetFiles[id].push({
            type: type,
            fileName: topLevelFileName,
            path: filepath,
            updateTime: stat.mtimeMs,
            size: stat.size
        });
    } else {
        let id = topLevelFileName;
        if (!datasetFiles[id]) datasetFiles[id] = [];
        fs.readdirSync(filepath).forEach((f) => checkAllFilesInDataset(filepath + "/" + f, f, id));//path.sep
    }
}

function checkAllFilesInDataset(filepath, fileName, datasetID) {
    let stat = fs.statSync(filepath);
    if (stat.isDirectory() == false) {
        let segments = fileName.split(".");
        let type = segments[segments.length - 1];
        datasetFiles[datasetID].push({
            type: type,
            path: filepath,
            fileName: fileName,
            updateTime: stat.mtimeMs,
            size: stat.size
        });
    } else {
        fs.readdirSync(filepath).forEach((f) => checkAllFilesInDataset(filepath + "/" + f, f, datasetID));//path.sep
    }
}


let extraData = {
    "cit-Patents": {
        //get a map from vertex IDs to some string description
        load: () => {
            return new Promise((resolve, reject) => {
                let catfile = "extradata/subcategories.txt";
                let cattxt = fs.readFileSync(catfile, "ascii");
                if (!cattxt) {
                    console.log("missing " + catfile);
                    reject();
                    return;
                }
                let catlines = cattxt.split("\n").slice(1);
                let subcats = {};
                catlines.forEach((line) => {
                    let columns = line.trim().split("\t");
                    subcats[columns[1]] = columns[2];//subcat->subcat name
                });

                let filename = "extradata/apat63_99.txt";
                //relevant columns:
                //0: "PATENT" 1:"GYEAR" 2:"GDATE" 3:"APPYEAR" 4:"COUNTRY" 5:"POSTATE" 6:"ASSIGNEE"
                //10:"CAT", 11: "SUBCAT"
                let map = {};
                var lineReader = readline.createInterface({
                    input: fs.createReadStream(filename)
                });
                var columns, currentID, realID;
                lineReader.on('line', function (line) {
                    columns = line.trim().split(",");
                    let patentID = Number(columns[0]);
                    if (isNaN(patentID)) return;
                    map[patentID] = {
                        id: patentID,
                        year: Number(columns[1]),
                        country: columns[4],
                        state: columns[5],
                        subcat: subcats[columns[11]]
                    };

                });
                lineReader.on('close', () => {
                    console.log("loaded data " + filename);
                    resolve({map: map, subcats: subcats});
                });
            });
        },
        get: function (ids) {
            if (!this.data) return null;
            return ids.map((id) => {
                if (this.data.map[id]) return this.data.map[id];
                else return null;//{id:id};
            });
        }
    }
};

function loadExtraData() {
    for (let datasetID in extraData) {
        if (!(datasetID in datasets)) continue;//ignore the ones not loaded ehre
        Promise.resolve(extraData[datasetID].load()).then((d) => extraData[datasetID].data = d);
    }
}


let DataTemplates = {//these functions all take a graph(that has a dataPath etc) not a whole dataset.

    graph: { //no deps because it exists when the graph is created (top level graphs will have this generated if needed automatically)
        files: ["vertices.id.json.gz", "edges.source.json.gz", "edges.target.json.gz"],//"graph.txt.gz"
        condition: () => true,//all graphs should have this
        make: (g) => {
            saveAllProperties(g);
        },//if the raw data contains other properties like weight, also save them?
        //such properties have no make method if they are treated as templates
        load: (g) => {
            loadTopology(g);
        },
    },
    ccID: {//of the top level graph
        deps: "graph", files: ["vertices.cc.json.gz"], //now all names are lower case by default?
        condition: (g) => {//layers can have ccs and those subgraphs have its own subgraphs
            if (!g.partitionInfo) return true;
            for (let p of g.partitionInfo) {
                if (p.type == "wave" || p.type == "waveLevel" || p.type == "level") return false;
            }//?? //||p.type=="wave2" is allowed
            let lastType = g.partitionInfo[g.partitionInfo.length - 1].type;
            if (lastType == "CC" || lastType == "BCC") {
                //console.log("CC cannot have CCs: "+g.dataPath);
                return false;
            }
            return true;
        },
        make: (g) => {
            let ccids = Algs.getCCIDs(g);
            g.vertices.addProperty("cc", "int", ccids);
            saveProperty(g, "vertices", "cc");
        },
        load: (g) => {//only loads the peel values, but also checks the subgraph/metagraph files in case those files need updating
            loadProperty(g, "vertices", "cc");
        },
    },

    fixedPointLayer: {
        deps: "graph", condition: (g) => {
            if (g.dataPath == g.datasetID || (g.partitionInfo.length == 1 && g.partitionInfo[0].type == "CC")) return true;
            return false;
        },
        files: ["edges.fixedPointLayer.json.gz"],//save this first because it's slow to regenerate, in case the subgraphs part crashes
        make: (g) => {
            let peeling = Algs.getFixedPointLayers(g);
            g.edges.addProperty("fixedPointLayer", "int", peeling);
            saveProperty(g, "edges", "fixedPointLayer");
        },
        load: (g) => {//only loads the peel values, but also checks the subgraph/metagraph files in case those files need updating
            loadProperty(g, "edges", "fixedPointLayer");
        },
    },
    waveAndWaveLevel: {
        deps: "graph", condition: (g) => {
            if (g.dataPath == g.datasetID) {
                return true;
            }
            let isLayer = false;
            let isCC = false;
            for (let p of g.partitionInfo) {
                if (p.type == "wave" || p.type == "waveLevel" || p.type == "wave2" || p.type == "level") return false;
                if (p.type == "layer") {
                    isLayer = true;
                }
                if (p.type == "CC") {
                    isCC = true;
                }
            }
            let lastType = g.partitionInfo[g.partitionInfo.length - 1].type;
            if (lastType == "BCC") {//currently disable it
                return false;
            }
            if (g.vertices.length < 256) return false;//for subgraphs, skip small ones
            if (g.vertices.length > 1024 && (!isLayer)) return false;//skip large whole graphs
            return true;
        },
        files: ["vertices.wave.json.gz", "vertices.waveLevel.json.gz"],
        make: (g) => {
            let results = Algs.getVertexWavesAndLevels(g);
            g.vertices.addProperty("wave", "int", results.vertexWaves);
            saveProperty(g, "vertices", "wave");
            g.vertices.addProperty("waveLevel", "int", results.vertexLayers);
            saveProperty(g, "vertices", "waveLevel");

            saveObj(g.dataPath, "wavesSummary", results.waves);

        },
        load: (g) => {//only loads the peel values, but also checks the subgraph/metagraph files in case those files need updating
            loadProperty(g, "vertices", "wave");
            loadProperty(g, "vertices", "waveLevel");
        },
    },
    wavesSummary: {
        deps: "graph,waveAndWaveLevel", condition: (g) => {
            return true;
        },
        files: ["wavesSummary.json.gz"],
        make: (g) => {
            let results = Algs.getVertexWavesAndLevels(g);
            saveObj(g.dataPath, "wavesSummary", results.waves);
        },
    },
    waveSubgraphs: {//separated from wave calculation because saving many waves can be very annoying, and we want wave maps but not wave subgraphs for very large graphs
        deps: "graph,waveAndWaveLevel", condition: (g) => {
            return false;//currently unused?
            if (g.vertices.length > 100000) return false;
            if (g.partitionInfo) for (let p of g.partitionInfo) {
                if (p.type == "wave" || p.type == "wave2" || p.type == "waveLevel" || p.type == "level") return false;
            }
            return true;
        },
        files: ["wave", "metagraphs/wave"], subgraphs: "wave",
        make: (g) => {
            let result1 = Algs.getVertexPartition(g, g.vertices.wave);
            for (let waveID in  result1.subgraphs) {
                let wave = result1.subgraphs[waveID];
                let projectedWaveLevels = g.projectVertexProperty(wave, "waveLevel");
                wave.vertices.addProperty("originalWaveLevel", g.vertices.properties.waveLevel.type, projectedWaveLevels);
            }

            saveSubgraphs(g, "wave", result1.subgraphs);//for wave CCs
            result1.metagraph.subgraphPrefix = g.dataPath + "/wave";
            saveMetagraph(g, "wave", result1.metagraph);
        },
    },
    //pure data should go before subgraphs so they can be projected onto subgraphs when needed
    cc: {//separated from ccID because this crashing would mess up the summary
        deps: "graph,ccID", optionalDeps: "fixedPointLayer,originalWaveLevel", files: ["CC"], subgraphs: "CC",
        condition: (g) => {//layers can have ccs and those subgraphs have its own subgraphs
            //if it has the dependencies
            return true;
        },
        make: (g) => {
            let ccids = g.vertices.cc;
            if (!ccids) throw Error();
            //also save subgraphs
            let result = Algs.getVertexPartition(g, ccids);
            //console.log(result.subgraphs);
            let layerEnabled = false, levelEnabled = false;
            let projections = {};

            if ("fixedPointLayer" in g.edges.properties) {
                if (g.edges.properties.fixedPointLayer.isAbstract) loadProperty(g, "edges", "fixedPointLayer");
                projections.edges = {fixedPointLayer: "fixedPointLayer"};
                layerEnabled = true;
            }
            if ("originalWaveLevel" in g.vertices.properties) {
                if (g.vertices.properties.originalWaveLevel.isAbstract) loadProperty(g, "vertices", "originalWaveLevel");
                projections.vertices = {originalWaveLevel: "originalWaveLevel"};
                levelEnabled = true;
            }
            if (layerEnabled || levelEnabled) {
                saveSubgraphs(g, "CC", result.subgraphs, {projectProperties: projections});//projects the peel values to CCs to avoid unnecessary computation
            } else {//eg. layers should have ccs (actually they are already computed in layerCC so this is not used but just in case)
                saveSubgraphs(g, "CC", result.subgraphs);
            }
            result.metagraph.subgraphPrefix = g.dataPath + "/CC";//if metanodes have subgraphPath, prefix+subgraphPath is the subgraph's path; else prefix+metanode ID is the subgraph path
            saveMetagraph(g, "CC", result.metagraph);//saves both topology and all property files
        },
    },
    layer: {
        deps: "graph,fixedPointLayer", optionalDeps: "ccID", files: ["layer"], subgraphs: "layer",
        //when used on CC subgraphs, it doesn't use CC projection. This cannot depend on ccID, or this will be disabled for CCs
        condition: (g) => {
            //if(g.partitionInfo&&g.partitionInfo.length==1)console.log("testing "+g.dataPath,(g.partitionInfo[0].type=="CC"),Object.keys(g.edges.properties));
            if (g.dataPath == g.datasetID || (g.partitionInfo.length == 1 && g.partitionInfo[0].type == "CC")) return true;
            return false;
        },
        //cc subgraphs need this but their peel values are computed by another method (projection), and that means they have fixed point data at teh beginning (made while they are created, not afterwards in another cache) similarly, layer subgraphs can inherit the ccids as a property named originalCC
        //this is only used on the top level now (even though CCs also have layers
        make: (g) => {
            let peeling = g.edges.fixedPointLayer;
            let result = Algs.getEdgePartition(g, peeling);
            if ("cc" in g.vertices.properties) {
                saveSubgraphs(g, "layer", result.subgraphs, {projectProperties: {vertices: {cc: "originalcc"}}});
            } else {
                saveSubgraphs(g, "layer", result.subgraphs);
            }
            result.metagraph.subgraphPrefix = g.dataPath + "/layer";
            saveMetagraph(g, "layer", result.metagraph);//saves both topology and all property files
        },
    },

    layerCC: {//calculates and saves ccIDs and cc subgraphs for all layers, and use these objects in memory to produce the global layerCC metagraph (there are no global layerCC IDs, instead vertices in this metagraph refer to a relatve data path like layer/* /CC/ * so it can load the correct graph)
        deps: "graph,layer", files: ["metagraphs/layerCC"], condition: (g) => {
            if (g.dataPath == g.datasetID || (g.partitionInfo.length == 1 && g.partitionInfo[0].type == "CC")) return true;
            return false;
        },
        make: (g) => {
            //add the top level CC info of layer CCs, if g is the top level
            let originalCCIDs, originalCCs;
            if (g.dataPath == g.datasetID && g.vertices.properties.cc) {
                if (g.vertices.properties.cc.isAbstract) loadProperty(g, "vertices", "cc");
                originalCCIDs = g.vertices.cc;
                originalCCs = loadObj(g.dataPath, "CC", "fullSummary");
            }
            //here the top level g should have this property. This desn't depend on cc because CC subgraphs don't have that property.

            let list = loadSubgraphs(g, "layer", true);
            let vertexCCMap = new Array(g.vertices.length);
            for (let i = 0; i < vertexCCMap.length; i++) {
                vertexCCMap[i] = {};
            }
            let metagraph = new Graph();
            metagraph.originalGraph = g.dataPath;
            metagraph.vertices.addProperty("V");
            metagraph.vertices.addProperty("E");
            metagraph.vertices.addProperty("originalLayer");
            metagraph.edges.addProperty("E");
            metagraph.heightProperty = "originalLayer";
            //some graphs can have a natural or default height property, for example, layer CC metagraphs don't make a lot of sense without using original layer heights
            let layerCCSummary = {};
            for (let layer of list) {
                //so we must compute the vertex lists from subgraphs in memory before they are buckted and saved.
                loadTopology(layer);
                let ccids = Algs.getCCIDs(layer);
                layer.vertices.addProperty("cc", "int", ccids);
                saveProperty(layer, "vertices", "cc");
                //console.log("computed ccids");
                let result = Algs.getVertexPartition(layer, ccids);
                for (let ccID in result.subgraphs) {
                    let cc = result.subgraphs[ccID];
                    let vertexList = g.getSubgraphVertices(cc);//get vertex indices of the original graph
                    let ccPath = layer.subgraphID + "/CC/" + ccID;
                    let metanodeID = metagraph.addVertex(ccPath);//the ID can serve as the subgraph path
                    metagraph.vertices.V[metanodeID] = result.subgraphs[ccID].vertices.length;
                    metagraph.vertices.E[metanodeID] = result.subgraphs[ccID].edges.length;
                    metagraph.vertices.originalLayer[metanodeID] = layer.subgraphID;
                    for (let vID of vertexList) {
                        for (let otherLayer in vertexCCMap[vID]) {//add or update metaedges to existing clones' ccs
                            let otherccPath = otherLayer + "/CC/" + vertexCCMap[vID][otherLayer];
                            let metaedgeID = metagraph.getEdgeByID(otherccPath, ccPath);
                            if (metaedgeID == undefined) {
                                metaedgeID = metagraph.addEdge(otherccPath, ccPath);
                            }
                            let oldE = metagraph.edges.E[metaedgeID];
                            if (!oldE) oldE = 0;
                            metagraph.edges.E[metaedgeID] = oldE + 1;
                        }
                        vertexCCMap[vID][layer.subgraphID] = ccID;
                    }
                }
                if (originalCCIDs) {
                    let func = (subgraph) => {
                        let vID = subgraph.vertices.id[0], oldindex = g.getVertexByID(vID);
                        let ccID = originalCCIDs[oldindex];
                        let ccV, ccE;
                        if (originalCCs && originalCCs[ccID]) {
                            ccV = originalCCs[ccID].vertices;
                            ccE = originalCCs[ccID].edges;
                        }
                        return {value: ccID, V: ccV, E: ccE};
                    };
                    saveSubgraphs(layer, "CC", result.subgraphs, {globalPartitionInfo: {CC: func}});
                } else {
                    saveSubgraphs(layer, "CC", result.subgraphs);
                }
                result.metagraph.subgraphPrefix = layer.dataPath + "/CC";
                saveMetagraph(layer, "CC", result.metagraph);
                saveSummary(layer);//update its metagraph records
                layerCCSummary[layer.subgraphID] = layer.subgraphs.CC;//has distrbutions and large CC IDs
                layerCCSummary[layer.subgraphID].V = layer.vertices.length;//add layer V and E
                layerCCSummary[layer.subgraphID].E = layer.edges.length;
                //console.log(layer.subgraphs.cc);
            }
            metagraph.subgraphPrefix = g.dataPath + "/layer";
            saveMetagraph(g, "layerCC", metagraph);//saves both topology and all property files

            //save the top level layer cc summary for ribbons: the cc distributions per layer, and the IDs of large ccs in teh distribution (needed?)
            g.layerCCSummary = layerCCSummary;
            //saveObj(g.dataPath,"layerCCSummary",layerCCSummary);

        },
    },
    layerCCSummary: {
        deps: "layerCC", files: ["layerCCSummary.json.gz"],
        make: (g) => {
            let layerCCSummary = {};
            let list = loadSubgraphs(g, "layer", true);
            for (let layer of list) {
                if (!(layer.subgraphs && layer.subgraphs.CC)) {
                    layerCCSummary[layer.subgraphID] = {};
                    layerCCSummary[layer.subgraphID].V = layer.vertices.length;//add layer V and E
                    layerCCSummary[layer.subgraphID].E = layer.edges.length;
                } else {
                    layerCCSummary[layer.subgraphID] = layer.subgraphs.CC;//has distrbutions and large CC IDs
                    layerCCSummary[layer.subgraphID].V = layer.vertices.length;//add layer V and E
                    layerCCSummary[layer.subgraphID].E = layer.edges.length;
                }


            }
            g.layerCCSummary = layerCCSummary;
            saveSummary(g);
            saveObj(g.dataPath, "layerCCSummary", layerCCSummary);
        },
    },
    BCC: {//only CC subgraphs can have BCCs - In fact I think only CCs of a layer can have BCCs
        deps: "graph", files: ["BCC", "metagraphs/BCC"], subgraphs: "BCC",
        //only works for CC subgraphs that are not in layer 1
        condition: (g) => {
            return false;//unused now
            if (!g.partitionInfo) return false;
            if (g.partitionInfo.length == 0) return false;
            let isLayer = false;
            for (let p of g.partitionInfo) {
                if (p.type == "layer") isLayer = true;
                if ((p.type == "layer") && (p.value == 1 || p.value == 0)) {
                    //console.log("no BCC for "+g.dataPath);
                    return false;
                }
            }//if at any level it's in layer 1, reject
            if (isLayer == false) return false;

            if (g.partitionInfo[g.partitionInfo.length - 1].type == "CC") {
                //console.log("has BCC for "+g.dataPath);
                if (g.vertices.length < 256) return false;//for subgraphs, skip small ones
                return true;
            }
            //console.log("still no BCC for "+g.dataPath);
            return false;
        },
        //cc subgraphs need this but their peel values are computed by another method (projection), and that means they have fixed point data at teh beginning (made while they are created, not afterwards in another cache) similarly, layer subgraphs can inherit the ccids as a property named originalCC
        //this is only used on the top level now (even though CCs also have layers
        make: (g) => {
            let obj = Algs.getBCCsAndArticulationPoints(g);
            g.edges.addProperty("BCCid", "int", obj.BCCids);
            saveProperty(g, "edges", "BCCid");

            let bccids = g.edges.BCCid;
            let result = Algs.getBCCPartition(g, bccids);
            saveSubgraphs(g, "BCC", result.subgraphs);
            result.metagraph.subgraphPrefix = g.dataPath + "/BCC";
            saveMetagraph(g, "BCC", result.metagraph);//saves both topology and all property files
        },
        load: (g) => {//only loads the peel values, but also checks the subgraph/metagraph files in case those files need updating
            loadProperty(g, "edges", "BCCid");
        },
    },


    waveCC: {
        deps: "graph,waveAndWaveLevel,waveSubgraphs", files: ["metagraphs/waveCC", "vertices.waveCCid.json.gz"],
        condition: (g) => {//if it has waves
            return false;
            return true;
        },
        make: (g) => {
            let waveIDs = g.vertices.wave;
            console.log("here");
            console.log(waveIDs);
            let list = loadSubgraphs(g, "wave", true);//include bucketed
            let vertexCCIDs = new Array(g.vertices.length);
            for (let i = 0; i < vertexCCIDs.length; i++) {
                vertexCCIDs[i] = -1;
            }
            let metagraph = new Graph();
            metagraph.originalGraph = g.dataPath;
            metagraph.vertices.addProperty("V");
            metagraph.vertices.addProperty("E");
            metagraph.vertices.addProperty("originalWave");
            metagraph.vertices.addProperty("isMetanode");//wave ccs tend to contain isolated vertices, so don't save them as subgraphs
            metagraph.edges.addProperty("E");
            metagraph.heightProperty = "originalWave";
            let waveCCSummary = {};
            let waveCCids = new Int32Array(g.vertices.length);//save this for later use?
            let waveCCCount = 0;
            for (let wave of list) {
                //so we must compute the vertex lists from subgraphs in memory before they are buckted and saved.
                loadTopology(wave);
                let ccids = Algs.getCCIDs(wave);
                wave.vertices.addProperty("cc", "int", ccids);
                saveProperty(wave, "vertices", "cc");
                let waveID = wave.subgraphID;

                let result = Algs.getVertexPartition(wave, ccids);
                let globalCCCount = 0;
                for (let ccID in result.subgraphs) {
                    let cc = result.subgraphs[ccID];
                    let vertexList = g.getSubgraphVertices(cc);//get vertex indices of the original graph
                    let ccPath;
                    if (vertexList.length == 1) {
                        //isolated, use v_<old index>as the ID, and don't save the subgraph
                        ccPath = "v_" + vertexList[0];
                        let metanodeID = metagraph.addVertex(ccPath);//the ID can serve as the subgraph path
                        metagraph.vertices.V[metanodeID] = result.subgraphs[ccID].vertices.length;
                        metagraph.vertices.E[metanodeID] = result.subgraphs[ccID].edges.length;
                        metagraph.vertices.originalWave[metanodeID] = waveID;
                        metagraph.vertices.isMetanode[metanodeID] = false;
                        vertexCCIDs[vertexList[0]] = ccPath;
                    } else {
                        ccPath = waveID + "/CC/" + ccID;
                        let metanodeID = metagraph.addVertex(ccPath);//the ID can serve as the subgraph path
                        metagraph.vertices.V[metanodeID] = result.subgraphs[ccID].vertices.length;
                        metagraph.vertices.E[metanodeID] = result.subgraphs[ccID].edges.length;
                        metagraph.vertices.originalWave[metanodeID] = waveID;
                        for (let vID of vertexList) {
                            vertexCCIDs[vID] = Number(ccID);//not using global CC count because we need the local ccid
                        }
                    }

                    let thisCCID = ccID;//globalCCCount;
                    //mark edges to outside CCs that come before this one
                    for (let vID of vertexList) {
                        waveCCids[vID] = globalCCCount;
                        for (let otherID of g.getNeighbors(vID)) {
                            let otherCCID = vertexCCIDs[otherID];
                            let otherWaveID = waveIDs[otherID];
                            if (otherCCID == -1) continue;
                            if (otherCCID == thisCCID && otherWaveID == waveID) continue;
                            let otherccPath = otherWaveID + "/CC/" + otherCCID;
                            if (typeof otherCCID == "string") otherccPath = otherCCID;//the other CC is one vertex
                            let metaedgeID = metagraph.getEdgeByID(otherccPath, ccPath);
                            if (metaedgeID == undefined) {
                                metaedgeID = metagraph.addEdge(otherccPath, ccPath);
                            }
                            let oldE = metagraph.edges.E[metaedgeID];
                            if (!oldE) oldE = 0;
                            metagraph.edges.E[metaedgeID] = oldE + 1;
                        }
                    }
                    globalCCCount++;
                }


                saveSubgraphs(wave, "CC", result.subgraphs, {skipSingleVertexSubgraphs: true});
                result.metagraph.subgraphPrefix = wave.dataPath + "/CC";
                saveMetagraph(wave, "CC", result.metagraph);
                saveSummary(wave);//update its metagraph records
                waveCCSummary[waveID] = wave.subgraphs.CC;//has distrbutions and large CC IDs
                waveCCSummary[waveID].V = wave.vertices.length;//add layer V and E
                waveCCSummary[waveID].E = wave.edges.length;
                //console.log(layer.subgraphs.cc);
            }
            metagraph.subgraphPrefix = g.dataPath + "/wave";
            saveMetagraph(g, "waveCC", metagraph);//saves both topology and all property files

            g.vertices.addProperty("waveCCid", "int", waveCCids);
            saveProperty(g, "vertices", "waveCCid");

            //save the top level summary: the cc distributions per wave, and the IDs of large ccs in teh distribution (needed?)
            g.waveCCSummary = waveCCSummary;
            //saveObj(g.dataPath,"waveCCSummary",waveCCSummary);
        },
        load: (g) => {//only loads the peel values, but also checks the subgraph/metagraph files in case those files need updating
            loadProperty(g, "vertices", "waveCCid");
        },
    },

    //the new wave definition, where a wave includes the forward edges and the touched later vertices, and the wave CC is changed to reflect this
    waveSubgraphs2: {//the edge-partition based on the waves
        //this uses the old vertex wave IDs, does't save the waveID (because it's just taking the smaller value of endpoints for edges but saves subgraphs
        deps: "graph,waveAndWaveLevel", condition: (g) => {
            //if(g.vertices.length>1663386)return false;
            //if(g.edges.length>4097177)return false;
            if (g.dataPath == g.datasetID) {
                if (g.vertices.length > 100000) return false;
                return true;
            }
            for (let p of g.partitionInfo) {
                if (p.type == "wave" || p.type == "waveLevel" || p.type == "wave2" || p.type == "level") return false;
            }
            if (g.vertices.length > 1663386) return false;//happen to be the size of the argest layer of patents
            if (g.edges.length > 4097177) return false;
            return true;
        },
        files: ["wave2", "metagraphs/wave2"], subgraphs: "wave2",
        make: (g) => {
            let waveIDs = g.vertices.wave;
            let edgeWaveIDs = new Int32Array(g.edges.length);
            let sources = g.edges.source, targets = g.edges.target;
            for (let i = 0; i < g.edges.length; i++) {
                edgeWaveIDs[i] = Math.min(waveIDs[sources[i]], waveIDs[targets[i]]);
            }

            let result1 = Algs.getEdgePartition(g, edgeWaveIDs);
            //project the wavellevels
            for (let waveID in result1.subgraphs) {
                let wave = result1.subgraphs[waveID];
                let projectedWaveLevels = g.projectVertexProperty(wave, "waveLevel");
                wave.vertices.addProperty("originalWaveLevel", g.vertices.properties.waveLevel.type, projectedWaveLevels);
            }

            saveSubgraphs(g, "wave2", result1.subgraphs, {unbucketedVLimit: 1024, unbucketedELimit: 4096});//save for wave CCs; avoid many small wave files
            result1.metagraph.subgraphPrefix = g.dataPath + "/wave2";
            saveMetagraph(g, "wave2", result1.metagraph);

        },
    },


    waveCC2: {
        deps: "graph,waveAndWaveLevel,waveSubgraphs2", files: ["metagraphs/waveCC2", "vertices.waveCCid2.json.gz"],
        condition: (g) => {//if it has waves
            //return false;
            return true;
        },
        make: (g) => {
            let waveIDs = g.vertices.wave;
            let list = loadSubgraphs(g, "wave2", true);
            let vertexCCIDs = new Array(g.vertices.length);
            for (let i = 0; i < vertexCCIDs.length; i++) {
                vertexCCIDs[i] = -1;
            }
            //for this wave edge partition, we use its CCs but only assign the CCIDs for vertices really in that wave.
            let metagraph = new Graph();
            metagraph.originalGraph = g.dataPath;
            metagraph.vertices.addProperty("V");
            metagraph.vertices.addProperty("E");
            metagraph.vertices.addProperty("originalWave");
            metagraph.vertices.addProperty("isMetanode");//wave ccs tend to contain isolated vertices, so don't save them as subgraphs
            metagraph.edges.addProperty("E");
            metagraph.heightProperty = "originalWave";
            let waveCCSummary = {};
            let waveCCids = new Int32Array(g.vertices.length);//save this for later use?
            let waveCCCount = 0;
            for (let wave of list) {
                //so we must compute the vertex lists from subgraphs in memory before they are buckted and saved.
                loadTopology(wave);
                if ("bucketID" in wave == false) loadProperty(wave, "vertices", "originalWaveLevel");//if te wave was bucketed, it doesn't have this? no it still has this but it is already loaded here and doesn't need loading.
                let ccids = Algs.getCCIDs(wave);
                wave.vertices.addProperty("cc", "int", ccids);
                saveProperty(wave, "vertices", "cc");
                let waveID = wave.subgraphID;

                let result = Algs.getVertexPartition(wave, ccids);
                let metanodeID;

                for (let ccID in result.subgraphs) {

                    let cc = result.subgraphs[ccID];
                    let projectedWaveLevels2 = wave.projectVertexProperty(cc, "originalWaveLevel");
                    cc.vertices.addProperty("originalWaveLevel", g.vertices.properties.waveLevel.type, projectedWaveLevels2);

                    let vertexList = g.getSubgraphVertices(cc);//get vertex indices of the original graph
                    let ccPath;
                    if (vertexList.length == 1) { //in that case it must be in this wave.
                        //isolated, use v_<old index>as the ID, and don't save the subgraph
                        ccPath = "v_" + vertexList[0];
                        metanodeID = metagraph.addVertex(ccPath);//the ID can serve as the subgraph path
                        metagraph.vertices.V[metanodeID] = result.subgraphs[ccID].vertices.length;
                        metagraph.vertices.E[metanodeID] = result.subgraphs[ccID].edges.length;
                        metagraph.vertices.originalWave[metanodeID] = waveID;
                        metagraph.vertices.isMetanode[metanodeID] = false;
                        vertexCCIDs[vertexList[0]] = ccPath;
                    } else {
                        ccPath = waveID + "/CC/" + ccID;
                        metanodeID = metagraph.addVertex(ccPath);//the ID can serve as the subgraph path
                        metagraph.vertices.V[metanodeID] = result.subgraphs[ccID].vertices.length;
                        metagraph.vertices.E[metanodeID] = result.subgraphs[ccID].edges.length;
                        metagraph.vertices.originalWave[metanodeID] = waveID;
                        for (let vID of vertexList) {
                            //don't set for vertcies not in this wave
                            let realWave = waveIDs[vID];
                            if (realWave != waveID) continue;
                            vertexCCIDs[vID] = Number(ccID);//not using global CC count because we need the local ccid
                        }
                    }

                    let thisCCID = ccID;//globalCCCount;
                    //mark edges to outside CCs that come before this one
                    for (let vID of vertexList) {
                        let realWave = waveIDs[vID];
                        if (realWave != waveID) continue;
                        waveCCids[vID] = metanodeID;
                        for (let otherID of g.getNeighbors(vID)) {
                            let otherCCID = vertexCCIDs[otherID];
                            let otherWaveID = waveIDs[otherID];
                            if (otherCCID == -1) continue;//count inter-wave edges once (can't have edges between wave CCs of the same wave)
                            if (otherCCID == thisCCID && otherWaveID == waveID) continue; //skip edges to the same wave (not the same as edges in the subgraph here!)
                            let otherccPath = otherWaveID + "/CC/" + otherCCID;
                            if (typeof otherCCID == "string") otherccPath = otherCCID;//the other CC is one vertex - pretty unlikely here
                            let metaedgeID = metagraph.getEdgeByID(otherccPath, ccPath);
                            if (metaedgeID == undefined) {
                                metaedgeID = metagraph.addEdge(otherccPath, ccPath);
                            }
                            let oldE = metagraph.edges.E[metaedgeID];
                            if (!oldE) oldE = 0;
                            metagraph.edges.E[metaedgeID] = oldE + 1;
                        }
                    }
                }

                saveSubgraphs(wave, "CC", result.subgraphs, {unbucketedVLimit: 1024, unbucketedELimit: 4096});//{skipSingleVertexSubgraphs:true}
                result.metagraph.subgraphPrefix = wave.dataPath + "/CC";
                saveMetagraph(wave, "CC", result.metagraph);
                saveSummary(wave);//update its metagraph records
                waveCCSummary[waveID] = wave.subgraphs.CC;//has distrbutions and large CC IDs
                waveCCSummary[waveID].V = wave.vertices.length;//add layer V and E
                waveCCSummary[waveID].E = wave.edges.length;
                //console.log(layer.subgraphs.cc);
            }
            metagraph.subgraphPrefix = g.dataPath + "/wave2";
            saveMetagraph(g, "waveCC2", metagraph);//saves both topology and all property files

            g.vertices.addProperty("waveCCid2", "int", waveCCids);
            saveProperty(g, "vertices", "waveCCid2");

            //save the top level summary: the cc distributions per wave, and the IDs of large ccs in teh distribution (needed?)
            g.waveCC2Summary = waveCCSummary;
            //saveObj(g.dataPath,"waveCCSummary",waveCCSummary);
        },
        load: (g) => {//only loads the peel values, but also checks the subgraph/metagraph files in case those files need updating
            loadProperty(g, "vertices", "waveCCid2");
        },
    },
    waveMap: {//may work for very large graphs, doesn't require wave subgraphs
        deps: "graph,waveAndWaveLevel,waveCC2",//waveCCid2 - which considers parts of a wave that that have edges meeting in a same later-wave vertex as connected
        condition: (g) => {
            return false;
            return true;//if it has waves and levels
        },
        files: ["metagraphs/waveMap"],
        //adding connections between them, using the wavecc2 metagraph
        make: (graph) => {

            let waveLevels = graph.vertices.waveLevel;
            let waveIDs = graph.vertices.wave;
            //let waveCCids=graph.vertices.waveCCid;
            let waveCCids = graph.vertices.waveCCid2;
            /*let waveCCMetagraph=new Graph();//use its edges
			waveCCMetagraph.dataPath=graph.dataPath+"/metagraphs/waveCC2";
			loadSummary(waveCCMetagraph);
			loadTopology(waveCCMetagraph);*/

            let waveMap = [];
            let arcs = [];
            let arcLinks = [];
            for (let vID = 0; vID < graph.vertices.length; vID++) {
                let waveID = waveIDs[vID];
                let waveCCid = waveCCids[vID];
                let waveLevel = waveLevels[vID];
                if (!waveMap[waveID]) waveMap[waveID] = {};//indexed by waveCCID
                let waveObj = waveMap[waveID];
                if (!waveObj[waveCCid]) waveObj[waveCCid] = {};//indexed by wave level
                if (!waveObj[waveCCid][waveLevel]) waveObj[waveCCid][waveLevel] = {v: 0, e: 0, ef: 0};//e:internal edges,ef:forward edges
                waveObj[waveCCid][waveLevel].v++;//count vertices
                for (let neighbor of graph.getNeighbors(vID)) {
                    let otherWave = waveIDs[neighbor], otherLevel = waveLevels[neighbor];
                    if (otherLevel > waveLevel) {
                        waveObj[waveCCid][waveLevel].ef++;
                    }//count forward and internal edges
                    if (otherLevel == waveLevel && neighbor > vID) {
                        waveObj[waveCCid][waveLevel].e++;
                    }
                }
            }
            let metagraph = new Graph();
            metagraph.waveMap = waveMap;//metagraph.arcLinks=arcLinks;
            saveMetagraph(graph, "waveMap", metagraph);
        },
    },

    waveLevelSubgraphs: {//vertex-partition wave level subgraphs are very boring, so there are only the edge-partition ones
        //here they are for the whole graph, not each wave. (bucketed waves would not have their own level subgraphs, to ensure all levels can be retrieved, we may need to save the levels of teh original graph again?)
        deps: "graph,waveAndWaveLevel,waveSubgraphs2", files: ["metagraphs/waveLevel", "waveLevel"],//creates level subgraphs for wave subgraphs, and for the parent too?
        condition: (g) => {//if it has waves and wave edge subgraphs
            //return false;
            return true;
        },
        make: (g) => {
            let edgeWaveLevelIDs = g.edgePropertyFromVertexProperty("waveLevel");
            let results = Algs.getEdgePartition(g, edgeWaveLevelIDs);//now to ensure that bucketed waves's levels are still accessible I have to save them too
            saveSubgraphs(g, "waveLevel", results.subgraphs, {unbucketedVLimit: 1024, unbucketedELimit: 4096});
            results.metagraph.subgraphPrefix = g.dataPath + "/waveLevel";
            saveMetagraph(g, "waveLevel", results.metagraph);

        },
    },
    originalWaveLevel: {
        deps: "graph", files: ["vertices.originalWaveLevel.json.gz"],//created when the wave subgraphs are created
        condition: (g) => {//if it has waves and wave edge subgraphs
            if (g.partitionInfo && g.partitionInfo.length > 0 && (g.partitionInfo[g.partitionInfo.length - 1].type == "wave2")) return true;
            if (g.partitionInfo && g.partitionInfo.length > 1 && (g.partitionInfo[g.partitionInfo.length - 2].type == "wave2") && (g.partitionInfo[g.partitionInfo.length - 1].type == "CC")) return true;//wave CCs also have it
            return false;
        },

        make: (g) => {//found taht sometimes it's missing and annoying to remake? actually they may exist but are outdated due to a previous bug

            if (fileExists(g.dataPath, "vertices.originalWaveLevel.json.gz")) {
                touch(g.dataPath, "vertices.originalWaveLevel.json.gz");
            }
            //I think we should just try touching the file, and if it still doesn't work, recreate the subgraph instead of trying to hack it
            if (g.partitionInfo[g.partitionInfo.length - 1].type != "CC") return;

            let parentGraph = new Graph();
            parentGraph.dataPath = g.dataPath.substring(0, g.dataPath.lastIndexOf("CC") - 1);//this doesn't work for waves is they are missing the data!
            loadTopology(parentGraph);
            loadProperty(parentGraph, "vertices", "originalWaveLevel");
            let projectedWaveLevels = parentGraph.projectVertexProperty(g, "originalWaveLevel");
            //console.log("projectedWaveLevels was: ");
            //console.log(projectedWaveLevels);
            g.vertices.addProperty("originalWaveLevel", parentGraph.vertices.properties.originalWaveLevel.type, projectedWaveLevels);
            saveProperty(g, "vertices", "originalWaveLevel");


        },

        load: (g) => {//only loads the peel values, but also checks the subgraph/metagraph files in case those files need updating
            loadProperty(g, "vertices", "originalWaveLevel");
        },
    },
    levelSubgraphs: {
        deps: "graph,originalWaveLevel", files: ["metagraphs/level", "level"], subgraphs: "level",//creates level subgraphs for wave subgraphs, and for the parent too?
        condition: (g) => {//if it has original levels
            //if(g.partitionInfo&&(g.partitionInfo[g.partitionInfo.length-1].type=="wave2"))return true;
            //return false;
            //return false;
            return true;
        },
        make: (g) => {
            let originalWaveLevel = g.vertices.originalWaveLevel;
            if (!originalWaveLevel) {
                console.log("originalWaveLevel is ");
                console.log(originalWaveLevel);
                return;
            }
            let edgeWaveLevelIDs = g.edgePropertyFromVertexProperty("originalWaveLevel");
            let result = Algs.getEdgePartition(g, edgeWaveLevelIDs);
            saveSubgraphs(g, "level", result.subgraphs, {unbucketedVLimit: 1024, unbucketedELimit: 4096});
            result.metagraph.subgraphPrefix = g.dataPath + "/level";
            saveMetagraph(g, "level", result.metagraph);
        },
    },
    levelCC: {
        deps: "graph,originalWaveLevel,levelSubgraphs", files: ["vertices.levelCCid.json.gz", "metagraphs/levelCC"],//not saving subgraphs/ CC metagraphs now
        condition: (g) => {//for waves only
            return false;
            return true;
        },
        make: (g) => {
            let levelIDs = g.vertices.originalWaveLevel;
            let list = loadSubgraphs(g, "level", true);
            //console.log("loaded "+list.length+" subgraphs");
            let vertexCCIDs = new Array(g.vertices.length);
            for (let i = 0; i < vertexCCIDs.length; i++) {
                vertexCCIDs[i] = -1;
            }
            let vertexLevelMarks = new Array(g.vertices.length);
            for (let i = 0; i < vertexLevelMarks.length; i++) {
                vertexLevelMarks[i] = -1;
            }//need to keep track of which levels we assigned stuff to
            //for this level edge partition, we use its CCs but only assign the CCIDs for vertices really in that level, except for the vertices that are touched by the wave but not really in any level inside it, which get assigned to the last evel they are touched by.
            let metagraph = new Graph();
            metagraph.originalGraph = g.dataPath;
            metagraph.vertices.addProperty("V");
            metagraph.vertices.addProperty("E");
            metagraph.vertices.addProperty("originalWaveLevel");
            metagraph.edges.addProperty("E");
            metagraph.heightProperty = "originalWaveLevel";
            let levelCCSummary = {};
            let levelCCids = new Int32Array(g.vertices.length);//save this for later use?
            let levelCCCount = 0;
            let markedLevels = {};
            for (let level of list) {
                //so we must compute the vertex lists from subgraphs in memory before they are buckted and saved.
                loadTopology(level);
                let ccids = Algs.getCCIDs(level);
                level.vertices.addProperty("cc", "int", ccids);
                saveProperty(level, "vertices", "cc");
                let levelID = level.subgraphID;
                markedLevels[levelID] = true;
                let result = Algs.getVertexPartition(level, ccids);
                let metanodeID;
                for (let ccID in result.subgraphs) {
                    let cc = result.subgraphs[ccID];

                    let vertexList = g.getSubgraphVertices(cc);//get vertex indices of the original graph
                    let ccPath;
                    //no edge partition wave level CCs should have only 1 vertex.
                    ccPath = levelID + "/CC/" + ccID;
                    //console.log("adding metanode "+ccPath);
                    metanodeID = metagraph.addVertex(ccPath);//the ID can serve as the subgraph path
                    metagraph.vertices.V[metanodeID] = result.subgraphs[ccID].vertices.length;
                    metagraph.vertices.E[metanodeID] = result.subgraphs[ccID].edges.length;
                    metagraph.vertices.originalWaveLevel[metanodeID] = levelID;
                    for (let vID of vertexList) {
                        //since there can be vertices not really in this wave in teh edge partition waves, we need to set levelID if it's larger than teh existing levelID, and not simply skip all vertices not in this level.
                        let realLevel = levelIDs[vID];
                        //asign if it hasn't be assigned, and overwrite if the new level s higher than the old one
                        if (vertexLevelMarks[vID] == -1 || vertexLevelMarks[vID] < levelID) {
                            vertexCCIDs[vID] = Number(ccID);//not using global CC count because we need the local ccid
                            vertexLevelMarks[vID] = levelID;
                            //console.log("marking "+vID+" in level "+levelID);
                        }
                    }

                    let thisCCID = ccID;//globalCCCount;
                    //mark edges to outside CCs that come before this one (note: here we ignore edges to CCs outside of the wave)
                    for (let vID of vertexList) {
                        let realLevel = levelIDs[vID];
                        if (vertexLevelMarks[vID] == levelID) {
                            levelCCids[vID] = metanodeID;
                        }//need to mark even vertices not in this level, but prefer to assign vertices to higher levels
                        if (realLevel != levelID) continue;//don't count vertices not in the level, including vertices not in this wave
                        for (let otherID of g.getNeighbors(vID)) {
                            let otherCCID = vertexCCIDs[otherID];
                            let otherLevelID = levelIDs[otherID];
                            if (!markedLevels[otherLevelID]) continue;
                            if (otherCCID == -1) continue;//count inter-level edges once (can't have edges between level CCs of the same level)
                            if (otherCCID == thisCCID && otherLevelID == levelID) continue; //skip edges to the same level (not the same as edges in the subgraph here!)
                            let otherccPath = otherLevelID + "/CC/" + otherCCID;
                            let hasVertex = metagraph.hasVertex(otherccPath);
                            if (hasVertex == false) throw Error("missing metanode " + otherccPath);
                            let metaedgeID = metagraph.getEdgeByID(otherccPath, ccPath);
                            if (metaedgeID == undefined) {
                                metaedgeID = metagraph.addEdge(otherccPath, ccPath);
                            }
                            let oldE = metagraph.edges.E[metaedgeID];
                            if (!oldE) oldE = 0;
                            metagraph.edges.E[metaedgeID] = oldE + 1;
                        }
                    }
                }

                //saveSubgraphs(level,"CC",result.subgraphs);
                //result.metagraph.subgraphPrefix=level.dataPath+"/CC";
                //saveMetagraph(level,"CC",result.metagraph);
                //saveSummary(level);//update its metagraph records
                //levelCCSummary[levelID]=level.subgraphs.CC;//has distributions and large CC IDs
                //levelCCSummary[levelID].V=level.vertices.length;//add layer V and E
                //levelCCSummary[levelID].E=level.edges.length;
                //console.log(layer.subgraphs.cc);
            }
            metagraph.subgraphPrefix = g.dataPath + "/level";
            saveMetagraph(g, "levelCC", metagraph);//saves both topology and all property files

            g.vertices.addProperty("levelCCid", "int", levelCCids);
            saveProperty(g, "vertices", "levelCCid");

            //save the top level summary: the cc distributions per wave, and the IDs of large ccs in teh distribution (needed?)
            g.levelCCSummary = levelCCSummary;
        },
        load: (g) => {//only loads the peel values, but also checks the subgraph/metagraph files in case those files need updating
            loadProperty(g, "vertices", "levelCCid");
        },
    },
    levelMap: {//like waveMap, but for each wave subgraph's levels (skips bucketed waves)
        deps: "graph,originalWaveLevel,levelSubgraphs,levelCC",//waveCCid2 - which considers parts of a wave that that have edges meeting in a same later-wave vertex as connected
        condition: (g) => {
            return false;
            return true;//if it has levels
        },
        files: ["metagraphs/levelMap"],
        //adding connections between them, using the wavecc2 metagraph
        make: (graph) => {
            let waveLevels = graph.vertices.originalWaveLevel;
            let levelCCids = graph.vertices.levelCCid;

            let minRealLevel = Infinity, maxRealLevel = -Infinity;//hack to get the real leves in this wave; levelCCid may be correct but we can't use teh originalWaveLevel as it is, rather, we need the last level in this wave that touched the vertex (get its edges within this wave's levels, and choose the largest of them)

            let restrictedWaveLevel = new Int32Array(graph.vertices.length);
            restrictedWaveLevel.fill(-1);
            for (let vID = 0; vID < graph.vertices.length; vID++) {
                let levelID = waveLevels[vID];
                let levelCCid = levelCCids[vID];

                for (let neighbor of graph.getNeighbors(vID)) {
                    let eid = graph.getEdge(vID, neighbor);
                    let edgeLevel = Math.min(waveLevels[vID], waveLevels[neighbor]);
                    if (edgeLevel > maxRealLevel) maxRealLevel = edgeLevel;
                    if (edgeLevel < minRealLevel) minRealLevel = edgeLevel;
                    if (edgeLevel > restrictedWaveLevel[vID]) {
                        restrictedWaveLevel[vID] = edgeLevel;
                    }
                }
            }


            let levelMap = {};
            let arcs = [];
            let arcLinks = [];
            for (let vID = 0; vID < graph.vertices.length; vID++) {
                let levelID = restrictedWaveLevel[vID];
                let realLevelID = waveLevels[vID];
                if (levelID != realLevelID) continue;

                let levelCCid = levelCCids[vID];
                if (!levelMap[levelID]) levelMap[levelID] = {};//indexed by levelCCid - problem: levelCCid may refer to a CC in a higher wave! and currently I don't know how to get a vertex's highest available level's CCid within a wave.
                let levelObj = levelMap[levelID];
                if (!levelObj[levelCCid]) levelObj[levelCCid] = {v: 0, e: 0, ef: 0};//e:internal edges,ef:forward edges
                levelObj[levelCCid].v++;//count vertices
                for (let neighbor of graph.getNeighbors(vID)) {
                    let otherLevel = waveLevels[neighbor];//use the real level here to detect forward edges
                    if (otherLevel > levelID) {
                        levelObj[levelCCid].ef++;
                    }//count forward and internal edges
                    if (otherLevel == levelID && neighbor > vID) {
                        levelObj[levelCCid].e++;
                    }
                }
            }
            let metagraph = new Graph();
            metagraph.levelMap = levelMap;//metagraph.arcLinks=arcLinks;
            saveMetagraph(graph, "levelMap", metagraph);
        },
    },
};


for (let name in DataTemplates) {
    let obj = DataTemplates[name];
    if ((typeof obj.deps) == "string") {
        obj.deps = obj.deps.split(",");
    }
    if ((typeof obj.optionalDeps) == "string") {
        obj.optionalDeps = obj.optionalDeps.split(",");
    }
    if (!obj.deps) obj.deps = [];
    if (!obj.optionalDeps) obj.optionalDeps = [];
    if ((typeof obj.files) == "object") {
        let temp = obj.files;
        obj.files = () => temp;
    }
}


async function loadAllFiles(datasetFiles, cachesToRefresh, noDerived) {
    //use a stack not queue for graphs to be processed, because it makes accessing datasets more continuous and makes the log cleaner
    //removing support for batch processing - it complicates everything, and there's no significant benefit from it now
    console.log(cachesToRefresh);
    let startTime = new Date().getTime();
    for (let id in datasetFiles) {
        let originalFiles = datasetFiles[id];
        let loadingMethod = getLoadingMethod(id, originalFiles);//when called, loadingMethod returns a promise. loadingMethod is falsy if it can't be loaded
        if (!loadingMethod) {
            continue;
        }//this "dataset" has no valid data files and can't be loaded, so ignore it

        datasets[id] = {id: id, data: new Graph()};
        let dataset = datasets[id];
        let mainGraph = datasets[id].data;
        mainGraph.name = toNormalText(id);
        mainGraph.dataPath = id;//I think dataPath should not end in /
        mainGraph.datasetID = id;
        mainGraph.derivation = [];
        //check temp directory
        if (!fs.existsSync(cacheDir + "/" + mainGraph.dataPath)) {
            fs.mkdirSync(cacheDir + "/" + mainGraph.dataPath);
        }
        //check main data files
        //a file record has type,path,fileName,updateTime,size
        let dataNewestTime = Math.max.apply(null, originalFiles.map((record) => record.updateTime));

        let basicFiles = DataTemplates.graph.files(mainGraph);
        let basicFilesExist = allFilesExist(basicFiles, mainGraph.dataPath);
        let basicFilesUpdateTime = basicFilesExist ? newestTimeOfFiles(basicFiles, mainGraph.dataPath) : null;
        let summaryFileExists = fileExists(mainGraph.dataPath, "summary.json.gz");
        let summaryFileUpdateTime = summaryFileExists ? fileStat(mainGraph.dataPath, "summary.json.gz").mtimeMs : null;
        let needLoading = false;
        if (!basicFilesExist) {
            needLoading = true;
        } else if (basicFilesUpdateTime < dataNewestTime) {
            needLoading = true;
        }
        if (!summaryFileExists) {
            needLoading = true;
        } else if (summaryFileUpdateTime < dataNewestTime) {
            needLoading = true;
        }
        // we shouldn't delete te summary if new templates are added since old lengths etc are correct and may be used. if the summary file is missing, we may either load every property or reload teh raw data?

        if (needLoading == false) {//this should be based on the summary?
            loadSummary(mainGraph);//loadSummary sets the graph as abstract
        } else {
            //load the raw data and save the original graph
            console.log("loading raw data for " + id);
            await Promise.resolve(loadingMethod());//loading should use the original main graph object
            console.log("loaded raw data for " + id);
            saveAllProperties(mainGraph);
            saveSummary(mainGraph);//in case it crashes while making other data caches, we don't have to reload the raw data when debugging
            //todo: mark the correct caches as loaded if there are optional data caches
            mainGraph.savedData = {graph: {loaded: true, updateTime: dataNewestTime}};
            mainGraph.updateTime = dataNewestTime;
            mainGraph.updated = true;//keep the loaded data until it's out of the stack
        }
        if (noDerived) {//get top level summary only
            dataset.summary = getDatasetSummary(dataset);
            console.log("loaded dataset " + id + ", " + JSON.stringify(dataset.summary));
            continue;
        }
        let graphStack = [];//now process each dataset completely before loading others
        graphStack.unshift(mainGraph);//add dataset main graphs to the stack in reverse order, so the first dataset comes out first
        let stashedGraphs = [];
        while (graphStack.length > 0) {
            let savedDataChangedInStack = false;
            while (graphStack.length > 0) {
                let graph = graphStack.pop();
                if (!graph.savedData) {
                    graph.savedData = {};
                }//note: only non-bucketed graphs can enter the stack, and at this point thye should ave their initial data saved already
                //console.log("processing "+graph.dataPath);
                delete graph.stashed;

                //console.log("graph path: "+graph.dataPath);
                //console.log("saved data: "+JSON.stringify(graph.savedData));
                if (!graph.dataPath) throw Error();
                //if we need to allow some properties to depend on properties of other graphs, then we may still need to stash graphs
                //initial property existence should be known here
                //calculate all available data caches (now, all subgraphs/metagraphs are also part of the caches)
                let hasRemainingTemplate = true, nextTemplate = null, savedDataChanged = false;
                while (hasRemainingTemplate) {
                    nextTemplate = null;
                    hasRemainingTemplate = false;
                    templateLoop: for (let name in DataTemplates) {//every iteration should determine the existence of one property and make it if needed
                        //console.log(graph.savedData);
                        if (!graph.savedData[name]) {//means this property's existence is unknown; a property that's known to not exist is {exists:false}
                            //console.log("testing if graph has "+name);
                            let templateObj = DataTemplates[name];
                            //test exclusion - if the template doesn't apply to the current graph
                            let dataExists = true;
                            //for convenience, exclude derived graphs by default if it doesn't say which graphs it applies to
                            if ((!templateObj.condition) && (!templateObj.exclude) && (graph.datasetID != graph.dataPath)) {
                                dataExists = false;
                            }
                            if (templateObj.condition && (templateObj.condition(graph) == false)) {
                                dataExists = false;
                            }
                            if (templateObj.exclude && (templateObj.exclude(graph) == true)) {
                                dataExists = false;
                            }
                            //if a data cache cannot be made and the files are not already there then it cannot exist. however if it can be made, this test says nothing.
                            if ((!templateObj.make) && dataExists) {//it's an initial data that should exist
                                let files = templateObj.files(graph);
                                let tempfilesExist = allFilesExist(files, graph.dataPath);
                                if (tempfilesExist) {
                                    let updateTime = fileExists ? newestTimeOfFiles(files, graph.dataPath) : null;
                                    if (updateTime < mainGraph.updateTime) {
                                        dataExists = false;
                                        if (graph.partitionInfo && graph.partitionInfo.length == 1 && graph.partitionInfo[0].type == "CC") {
                                            console.log("doesn't have " + name + " because it's outdated and cannot make");
                                        }
                                        if (!templateObj.optional) {
                                            throw Error("outdated required initial data " + name + " at " + graph.dataPath);
                                        }
                                        //else{console.log("skipping nonexistent optional data "+name+" at "+graph.dataPath);}
                                    } else {//if it can't be made, dependencies don't affect it. mark it as existing and proceed with other templates.
                                        graph.savedData[name] = {exists: true, updateTime: updateTime};
                                        //console.log("graph has "+name+", update time is "+new Date(updateTime));
                                        continue;
                                    }
                                } else {
                                    dataExists = false;
                                    if (graph.partitionInfo && graph.partitionInfo.length == 1 && graph.partitionInfo[0].type == "CC") {
                                        console.log("doesn't have " + name + " because it's missing and cannot make");
                                    }
                                    if (!templateObj.optional) {
                                        throw Error("missing required initial data " + name + " at " + graph.dataPath);
                                    }
                                }

                                //this has a little issue where if one of the optional initial files is removed or replaced, it will not detect it and will mark it as not existing.

                            }
                            if (dataExists == false) {//these are all conditions that can be tested without loading dependencies. If something is only known to not exist when dependencies are loaded, just return failure or throw error in the make function. conditions are for filtering on basic info like derivation(can't do decomposition on a layer) and size.
                                graph.savedData[name] = {exists: false};
                                //console.log("graph doesn't have "+name+" because of the definition");
                                continue;//such a template does not count as a remaining template
                            }
                            //test dependencies: if some dependencies are known to not exist, then this data cannot exist
                            let depsReady = true;
                            if (templateObj.deps) {
                                for (let depName of templateObj.deps) {
                                    //todo: if the dependency references othe rgraphs, stash this graph
                                    //if(!graph.stashed){graph.stashed=true;stashList.push(graph);}
                                    if (!(depName in graph.savedData)) {
                                        //console.log("not sure if graph has "+name+" because "+depName+" isn't resolved yet");
                                        depsReady = false;
                                        continue;
                                    }
                                    if (graph.savedData[depName].exists == false) {
                                        graph.savedData[name] = {exists: false};
                                        //console.log("graph doesn't have "+name+" because "+depName+" doesn't exist");
                                        continue templateLoop;
                                    }
                                }
                            }
                            hasRemainingTemplate = true;
                            if (depsReady) {
                                nextTemplate = name;
                                break;
                            } else {
                            }
                        }
                    }
                    if (!hasRemainingTemplate) break;
                    if (nextTemplate == null) {//the remaining data's existence cannot be determined.
                        let missingData = Object.keys(DataTemplates).filter((d) => (d in graph.savedData == false));
                        console.log("graph " + graph.dataPath + ": some data's existence cannot be resolved: " + missingData.join(","));
                        throw Error("property dependency error");
                        break;
                    }
                    let templateObj = DataTemplates[nextTemplate];

                    //detect if it needs creating

                    let expectedFiles = templateObj.files(graph);
                    let needGenerating = false;
                    let currentDataUpdateTime, newestFileName;


                    //now, since forced refresh may take time into account, all caches need to have its update time tested.
                    if (!allFilesExist(expectedFiles, graph.dataPath)) {
                        needGenerating = true;//currentDataUpdateTime is undefined here
                        console.log("generating " + nextTemplate + " for " + graph.dataPath + " because files are missing");
                    } else {
                        currentDataUpdateTime = newestTimeOfFiles(expectedFiles, graph.dataPath);
                        newestFileName = newestFileOfFiles(expectedFiles, graph.dataPath);
                    }

                    if ((!needGenerating) && (nextTemplate in cachesToRefresh)) {//cachesToRefresh[nextTemplate] is the number of minutes of age allowed
                        if ((startTime - currentDataUpdateTime > cachesToRefresh[nextTemplate] * 60000 + timeTolerance)) {
                            console.log("forcing refresh " + nextTemplate + " for " + graph.dataPath + ((cachesToRefresh[nextTemplate] == 0) ? "" : (" because its age is " + (startTime - currentDataUpdateTime) + "ms")));
                            needGenerating = true;
                        } else {
                            console.log("not forcing refresh " + nextTemplate + " because its age is " + (startTime - currentDataUpdateTime) + "ms");
                        }

                    }//force refresh (often when a change needs to be made in some cache-producing code)

                    if ((!needGenerating) && templateObj.deps.length > 0) {//some may have no dependencies
                        for (let depID of templateObj.deps) {
                            if (graph.savedData[depID].updateTime > currentDataUpdateTime + timeTolerance) {
                                needGenerating = true;
                                console.log("generating " + nextTemplate + " for " + graph.dataPath + " because it's " + (graph.savedData[depID].updateTime - currentDataUpdateTime) + "ms older than " + depID);//: dependency "+depID+"'s time is "+new Date(graph.savedData[depID].updateTime)+", current newest file is "+newestFileName+", its time is: "+new Date(currentDataUpdateTime));
                                break;
                            }
                        }
                    }
                    if ((!needGenerating) && templateObj.alwaysMake) {
                        needGenerating = true;
                        //console.log("generating because it's set to always generate");
                    }

                    async function loadCache(name) {//loading something doesn't require loading its dependencies
                        let currentCache = graph.savedData[name], currentCacheTemplate = DataTemplates[name];
                        if (currentCache.loaded == true) return;
                        if (!currentCacheTemplate) throw Error("no such template");
                        if (currentCacheTemplate.load) {
                            await Promise.resolve(currentCacheTemplate.load(graph));
                        }//a cache file may have no separate loading method, and loading may or may not be async
                        currentCache.loaded = true;//even if it needs no loading method
                    }

                    if (needGenerating) {
                        //delete subgraphs(since new subgraphs might not overwrite old ones)
                        if (templateObj.subgraphs) {//put these subgraphs on the stack
                            deleteSubgraphs(graph, templateObj.subgraphs);//creates abstract graph objects for them
                        }
                        //load all dependencies
                        if (templateObj.deps) {
                            await Promise.all(templateObj.deps.map(loadCache));
                        }
                        if (templateObj.optionalDeps) {
                            await Promise.all(templateObj.optionalDeps.filter((name) => graph.savedData[name] && graph.savedData[name].exists !== false).map(loadCache));
                        }//these don't have to exist but if they do they will be loaded, eg. to add optional data only available at some places on the hierarchy
                        if (!templateObj.make) {
                            throw Error("no method to make required cache: " + nextTemplate);
                        }
                        let success = undefined;
                        try {
                            await Promise.resolve(templateObj.make(graph)).then(() => {
                                success = true;
                            }).catch((e) => {
                                success = false;
                            });
                        } catch (e) {
                            console.log(e.stack);
                            success = false;
                        }
                        //it could be a Promise or not
                        let obj = {};
                        graph.savedData[nextTemplate] = obj;
                        if (success && allFilesExist(expectedFiles, graph.dataPath)) {
                            //check the time of updated files to see if they are new
                            let isNew = true;
                            currentDataUpdateTime = newestTimeOfFiles(expectedFiles, graph.dataPath);
                            for (let depID of templateObj.deps) {
                                if (graph.savedData[depID].updateTime > currentDataUpdateTime + timeTolerance) {
                                    console.log("making cache " + nextTemplate + " failed for " + graph.dataPath + " because it's still " + (graph.savedData[depID].updateTime - currentDataUpdateTime) + "ms older than " + depID);
                                    isNew = false;
                                    throw Error("cache production sanity check failed");//this case should not be ignored
                                    break;
                                }
                            }
                            if (isNew) {
                                obj.loaded = true;// if it's recreated, assume it's as if it's loaded, so no need to load it again
                                if (!templateObj.alwaysMake) {
                                    savedDataChanged = true;
                                }//some data that is not temporary has changed, update the summary
                                //console.log("successsfully generated  "+nextTemplate+" at "+new Date(currentDataUpdateTime));
                                //don't update if the production fails
                            } else {
                                obj.exists = false;
                            }
                        } else {
                            if (success) console.warn("expected files not found: " + JSON.stringify(expectedFiles) + ", in " + graph.dataPath);
                            else console.warn("making cache " + nextTemplate + " failed in " + graph.dataPath + " (|V| " + graph.vertices.length + ", |E| " + graph.edges.length + ")");
                            obj.exists = false;
                        }

                    } else {
                        graph.savedData[nextTemplate] = {};
                        if (templateObj.alwaysLoad) {
                            await loadCache(nextTemplate);
                        }
                    }
                    if (templateObj.subgraphs) {//put these subgraphs on the stack
                        let list = loadSubgraphs(graph, templateObj.subgraphs, true);//creates abstract graph objects for them
                        //including bucketed ones to check for data integrity
                        for (let newGraph of list) {
                            if (newGraph.wholeGraph != graph.dataPath) throw Error("wholeGraph is not the parent's path: expected " + graph.dataPath + ", found " + graph.dataPath);
                            if ("bucketID" in newGraph) continue;//don't process bucketed graphs
                            graphStack.push(newGraph);
                        }
                    }
                    //it's either recreated or checked to be up to date
                    graph.savedData[nextTemplate].files = expectedFiles;
                    graph.savedData[nextTemplate].updateTime = currentDataUpdateTime;
                    let now = new Date().getTime();
                    if (currentDataUpdateTime > now + timeTolerance) {//sometimes it's a fraction of a ms later
                        throw Error("cache production time in the future: " + (currentDataUpdateTime - now) + "ms");
                    }
                }
                //check existing subgraph/metagraph files, in case they are missing

                let derivedGraphsChanged = false;//if the summary format changes, assign the sub-summaries to the current graph summaries.
                let subgraphTypes = getSubgraphFileTypes(graph);
                if (!graph.subgraphs) {
                    graph.subgraphs = {};
                }
                if (!graph.metagraphs) {
                    graph.metagraphs = {};
                }
                for (let type in subgraphTypes) {
                    if (type in graph.subgraphs == false) {
                        //console.log("detected subgraphs "+type);
                        derivedGraphsChanged = true;
                    }
                }
                for (let type in graph.subgraphs) {
                    if (type in subgraphTypes == false) {
                        //console.log("detected missing subgraphs "+type);
                        derivedGraphsChanged = true;
                    }
                }
                let metagraphTypes = getMetagraphFileTypes(graph);
                for (let type in metagraphTypes) {
                    if (type in graph.metagraphs == false) {
                        //console.log("detected metagraph "+type);
                        derivedGraphsChanged = true;
                    }
                }
                for (let type in graph.metagraphs) {
                    if (type in metagraphTypes == false) {
                        //console.log("detected missing metagraph "+type);
                        derivedGraphsChanged = true;
                    }
                }
                if (derivedGraphsChanged) {
                    graph.subgraphs = subgraphTypes;
                    graph.metagraphs = metagraphTypes;
                    //console.log("detected derived graph changed");
                    savedDataChanged = true;
                }//now if the settings are changed so that some metagraph is no longer present, we also need to update the summary or the client could try to load a non-existent metagraph.

                if (savedDataChanged) {
                    savedDataChangedInStack = true;//detect cyclic dependency involving the stashed graphs
                    saveSummary(graph);//save summary and unload graph if it's loaded to save memory
                    //console.log("saved summary for "+graph.dataPath);
                    graph.unloadAll();
                }
            }
            if (stashedGraphs.length > 0) {//if no progress is made in this run through the stack, stop
                if (!savedDataChangedInStack) {
                    throw Error("cyclic dependency detected in stashed graphs");
                } else {
                    console.log("moving on to " + stashedGraphs.length + "stashed graphs");
                }
                graphStack = stashedGraphs;
                stashedGraphs = [];
            }
            //really exit if nothing is being processed or stashed
        }
        //finished processing a dataset
        dataset.summary = getDatasetSummary(dataset);
        console.log("loaded dataset " + id + ", " + JSON.stringify(dataset.summary));
    }

    //postprocessing
    datasetList = getDatasetList();
    console.log("finished loading " + Object.keys(datasets).length + " datasets");
}


function getLoadingMethod(id, files) {
    let JSfiles = files.filter((d) => d.type == "js");
    let JSONfiles = files.filter((d) => d.type == "json");
    let TSVfiles = files.filter((d) => d.type == "tsv");
    let CSVfiles = files.filter((d) => d.type == "csv");
    let TXTfiles = files.filter((d) => d.type == "txt");
    //temporarily disabling JS/JSON formats
    /*if(JSfiles.length>0){
		if(JSfiles.length==1)return ()=> {console.log("loading JS file "+JSfiles[0].path);Object.assign(datasets[id],require(JSfiles[0].path));};
		else{console.log("error: "+JSfiles.length+" JS files");return null;}
	}
	else if(JSONfiles.length){
		if(JSONfiles.length==1){return ()=> {
			console.log("loading JSON data file "+files.json.path);
			;datasets[id].data.loadObj(JSON.parse(fs.readFileSync(JSONfiles[0].path,"utf8")));
		};}
		else{console.log("error: "+JSONfiles.length+" JS files");return null;}
	}
	else {*/
    let tsv = (TSVfiles.length == 1) ? TSVfiles[0] : null;
    let csv = (CSVfiles.length == 1) ? CSVfiles[0] : null;
    let txt = (TXTfiles.length == 1) ? TXTfiles[0] : null;//txt files have lowest priority
    let file = (tsv || csv || txt);
    if (!file) return null;
    ;//other files we want to ignore
    if (file.size < 10000000) {
        return () => {
            console.log("loading text file " + file.path);
            let text = fs.readFileSync(file.path, "ascii");//utf8??
            datasets[id].data.loadEdges(text);
        };
    } else {
        return () => {
            return new Promise(function (resolve, reject) {
                console.log("loading big file " + file.path);
                let sizeRead = 0, percentage = 0, lastPercentage = 0,
                    increment = (file.size < 100000000) ? 20 : ((file.size < 5000000000) ? 5 : 1);
                var lineReader = readline.createInterface({
                    input: fs.createReadStream(file.path)
                });
                lineReader.on('line', function (line) {
                    if (line.length != 0 && line[0] != "#") datasets[id].data.loadEdgeLine(line);

                    sizeRead += line.length + 1;//note: it seems there's no way to know which line ending (\n or \r\n) we got from readline, so this size may be underestimated.
                    percentage = sizeRead / file.size * 100;//why they are not equal even if I add the byte for the newline?
                    while (percentage > lastPercentage + increment) {
                        lastPercentage += increment;
                        console.log(id + " loaded " + Math.floor(percentage) + "%");
                    }
                });
                lineReader.on('close', () => {
                    console.log("loaded " + id + ", file size:" + file.size + ", read size: " + sizeRead + ", lines: " + datasets[id].data.lineNumber);
                    resolve();
                });
            });

        }
    }
    //}
}

//streaming

function startStreaming(client, options) {
    let datasetID = options.datasetID, filetype = options.filetype, chunkSize = options.chunkSize || 256,
        interval = options.interval || 1000;
    if ((datasetID in datasets) == false) {
        client.emit("warning", "no such dataset " + datasetID + "/" + filetype);
        return;
    }
    let streams = client.streams;
    if (!streams[datasetID]) streams[datasetID] = {};
    if (streams[datasetID][filetype]) {
        client.emit("warning", "already streaming " + datasetID + "/" + filetype);
        return;
    }
    //now just load the array
    try {
        var array = loadObj(datasetID, filetype);
    } catch (e) {
        client.emit("warning", "cannot load streaming file " + datasetID + "/" + filetype);
        return;
    }
    //console.log(array);
    var objs = [], totalLength = 1, nextJSON = null, nextIndex = 0;//just calculate the would-be length of the JSON string. todo: a better way?
    //todo: pause and resume
    let obj = {};
    obj.streamNext = function () {
        while (1) {
            if (nextIndex >= array.length) {
                if (objs.length > 0) {
                    client.emit("stream", {datasetID: datasetID, type: filetype, data: objs});
                    setTimeout(() => client.emit("stream finish", {datasetID: datasetID, type: filetype}), 500);
                    console.log("streamed last chunk with " + objs.length + " records");
                }
                console.log("streaming finished: " + datasetID + "/" + filetype);
                clearInterval(streams[datasetID][filetype].interval);
                delete streams[datasetID][filetype];
                return;
            }
            ;
            nextJSON = JSON.stringify(array[nextIndex]);
            if (nextJSON.length + totalLength > chunkSize) {
                if (objs.length > 0) {
                    break;
                }//send the ones before
                else {
                    objs.push(array[nextIndex]);
                    nextIndex++;
                    client.emit("warning", "streamed data record larger than chunk size");
                    break;
                }//this single object is somehow too large, but probably should send it anyway
            } else {
                objs.push(array[nextIndex]);
                nextIndex++;
                totalLength += nextJSON.length + 1;
            }
        }
        client.emit("stream", {datasetID: datasetID, type: filetype, data: objs});
        console.log("streamed " + objs.length + " records");
        objs = [];
        totalLength = 1;
    };

    streams[datasetID][filetype] = obj;
    obj.interval = setInterval(obj.streamNext, interval);
    obj.pause = function () {
        if (obj.interval) {
            clearInterval(streams[datasetID][filetype].interval);
            delete streams[datasetID][filetype].interval;
        } else {
            console.log("cannot pause an inactive stream " + datasetID + "/" + filetype);
        }
    }
    obj.stop = function () {
        if (obj.interval) {
            clearInterval(streams[datasetID][filetype].interval);
            delete streams[datasetID][filetype].interval;
        } else {
            console.log("trying to stop an inactive stream " + datasetID + "/" + filetype);
        }
        if (this == streams[datasetID][filetype]) delete streams[datasetID][filetype];
    }
    obj.resume = function () {
        if (!obj.interval) {
            obj.interval = setInterval(obj.streamNext, interval);
        } else {
            console.log("cannot resume an active stream " + datasetID + "/" + filetype);
        }
    }
}

function stopStreaming(client, options) {
    let datasetID = options.datasetID, filetype = options.filetype;
    if ((datasetID in datasets) == false) {
        client.emit("warning", "no such dataset " + datasetID + "/" + filetype);
        return;
    }
    let streams = client.streams;
    if (!streams[datasetID]) streams[datasetID] = {};
    if (streams[datasetID][filetype]) {
        clearInterval(streams[datasetID][filetype]);
        delete streams[datasetID][filetype];
    } else {
        client.emit("warning", "not currently streaming " + datasetID + "/" + filetype);
    }
}

function pauseStreaming(client, options) {
    let datasetID = options.datasetID, filetype = options.filetype;
    if ((datasetID in datasets) == false) {
        client.emit("warning", "no such dataset " + datasetID + "/" + filetype);
        return;
    }
    let streams = client.streams;
    if (!streams[datasetID]) streams[datasetID] = {};
    if (streams[datasetID][filetype]) {
        streams[datasetID][filetype].pause();
        client.emit("warning", "paused streaming " + datasetID + "/" + filetype);
    } else {
        client.emit("warning", "not currently streaming " + datasetID + "/" + filetype);
    }
}

function resumeStreaming(client, options) {
    let datasetID = options.datasetID, filetype = options.filetype;
    if ((datasetID in datasets) == false) {
        client.emit("warning", "no such dataset " + datasetID + "/" + filetype);
        return;
    }
    let streams = client.streams;
    if (!streams[datasetID]) streams[datasetID] = {};
    if (streams[datasetID][filetype]) {
        streams[datasetID][filetype].resume();
    } else {
        client.emit("warning", "not currently streaming " + datasetID + "/" + filetype);
    }
}

function stopAllStreaming(client) {
    let streams = client.streams;
    for (let datasetID in streams) {
        for (let filetype in streams[datasetID])
            if (streams[datasetID][filetype]) {
                clearInterval(streams[datasetID][filetype]);
                delete streams[datasetID][filetype];
            } else {
                client.emit("warning", "not currently streaming " + datasetID + "/" + filetype);
                delete streams[datasetID][filetype];
            }
    }
}

//
//on demand stuff
var tempCustomDir = "_custom_data_";

function doCustomComputation(data) {
    switch (data.type) {
        case "sparsenet":
            return new Promise((resolve, reject) => {
                let options = data.options;
                let graph = new Graph();
                if (typeof data.data == "string") {
                    graph.loadTextData(data.data);
                } else if (typeof data.data == "object") {
                    if (data.data.vertices) graph.loadVertices(data.data.vertices);
                    if (data.data.edges) {
                        graph.loadEdges(data.data.edges);
                    } else {
                        reject();
                        return;
                    }
                } else if (typeof data.dataPath == "string") {
                    graph.dataPath = data.dataPath;
                    console.log("loading graph " + data.dataPath);
                    if (graph.dataPath.indexOf("+") == -1) loadAllProperties(graph);
                    else {
                        let graphPath = graph.dataPath;
                        let segments = graphPath.split("/");
                        let subgraphType = segments[segments.length - 2];
                        let subgraphIDs = segments[segments.length - 1];
                        let subgraphIDList = subgraphIDs.split("+").map(x => Number(x)).sort(compareBy(x => Number(x), true));//standardize, to make comparing equality easier
                        let originalGraph = segments.slice(0, segments.length - 2).join("/");
                        //graphPath=originalGraph+"/"+subgraphType+"/"+subgraphIDList.join("+");

                        graph = loadSubgraphUnion(originalGraph, subgraphType, subgraphIDList);
                    }
                }

                console.log("loaded graph data");
                let str;
                if (data.data) {
                    str = graph.toEdgeList(true);
                }//use sent data without original IDs
                else {
                    str = graph.toEdgeList();
                }
                //now toEdgeList is using indices not ids by default, and true means use ids instead of indices, but the client is not sending ids if using text, so using ids here would give correct indices on the client
                if (!fileExists(tempCustomDir)) mkdir(tempCustomDir);
                saveStr(tempCustomDir, "mappededgelist", str);
                console.log("saved graph text");
                let list = graph.vertices.id;
                //if(graph.vertexCount<100){console.log(vertexMap);}
                let path = getPath(tempCustomDir, "mappededgelist.txt");
                if (options) console.log(options);
                let exePath = "bin/sparsenet";
                if (options && options.variant) {
                    exePath += "_" + options.variant;
                }
                try {
                    let sn = spawn(exePath, [path]);
                    let success = true;
                    console.log("sparse net for custom graph");
                    sn.on('error', (err) => {
                        console.log('Failed to start subprocess ' + exePath);
                        success = false;
                        reject();
                    });
                    sn.on('close', (code) => {
                        console.log("SN exit code " + code);
                        if (code != 0) {
                            reject();
                            return;
                        }
                        var result = fs.readFileSync(path + ".out", "ascii");
                        if (!result.trim()) {
                            console.log("invalid sn for custom graph: ", result);
                            reject();
                            return;
                        }//sometimes it may crash
                        var lines = result.trim().split("\n");
                        for (let i = 0; i < lines.length; i++) {
                            lines[i] = lines[i].trim().split(" ");

                            /*for(let j=0;j<lines[i].length;j++){
								if((lines[i][j] in list) ==false)throw Error("invalid mapped vertex");
								lines[i][j]=vertexMap[list[lines[i][j]]];
							}
							*/
                            //not mapping now
                        }
                        resolve(lines);
                    });
                } catch (e) {
                    console.log(e.stack);
                    reject();
                }
            });
        default:
            console.log("unknown computation type " + type);
    }
}


function saveCustomData(path, type, data) {
    let pathSegments = path.split("/");
    saveObj.apply(null, pathSegments.concat([type, data]));
    console.log("saved " + path + "/" + type);
}

function loadCustomData(path, type) {
    //if(!fileExists(path,type+".json.gz"))return null;
    return loadObj(path, type);
}


//utilities


//cacheDir should not end in / or "\"
function allFilesExist(files, dir) {
    for (let f of files) {
        let filePath = cacheDir + "/" + (dir || "") + "/" + f;//dir is usually passed without a "/" at the end
        //console.log("checking "+filePath);
        if (!fs.existsSync(filePath)) {
            return false;
        }
    }
    return true;
}

function newestTimeOfFiles(files, dir) {
    let newest = -Infinity;
    for (let f of files) {
        let filePath = cacheDir + "/" + (dir || "") + "/" + f, stat = fs.statSync(filePath);
        if (stat.mtimeMs > newest) {
            newest = stat.mtimeMs;
        }
    }
    return newest;
}

function newestFileOfFiles(files, dir) {
    let newest = -Infinity, newestFileName;
    for (let f of files) {
        let filePath = cacheDir + "/" + (dir || "") + "/" + f, stat = fs.statSync(filePath);
        if (stat.mtimeMs > newest) {
            newest = stat.mtimeMs;
            newestFileName = f;
        }
    }
    return newestFileName;
}

function fileExists(filename) {
    return fs.existsSync(cacheDir + "/" + Array.from(arguments).join("/"))
}

function fileStat(filename) {
    return fs.statSync(cacheDir + "/" + Array.from(arguments).join("/"))
}

function readdir(filename) {
    return fs.readdirSync(cacheDir + "/" + Array.from(arguments).join("/"))
}

function mkdir(filename) {
    fs.mkdirSync(cacheDir + "/" + Array.from(arguments).join("/"), 511, true);
}

function unlink(filename) {
    fs.unlinkSync(cacheDir + "/" + Array.from(arguments).join("/"))
}

function rmdir(filename) {
    fs.rmdirSync(cacheDir + "/" + Array.from(arguments).join("/"))
}

function touch(filename) {
    let path = cacheDir + "/" + Array.from(arguments).join("/");
    let stat = fs.statSync(path), date = new Date();
    fs.utimesSync(path, date, date);
}

function isTypedArray(a) {
    if ((a) && (typeof a == "object") && a.fill && a.buffer && a.copyWithin) return true;//??
}

function loadObj() {
    let path = cacheDir + "/" + Array.from(arguments).join("/");
    if (path.indexOf(".json.gz") == -1) path += ".json.gz";
    //console.log("loading "+path);
    var zip = fs.readFileSync(path);
    var str = zlib.gunzipSync(zip);
    return JSON.parse(str);
}

function loadArrayWithProperties() {//loads the same json file as loadObj, but interpret it as an array with hidden array properties, by treating obj.value as the original array, and attaching all things in obj.properties on it as hidden properties.
    let obj = loadObj.apply(null, arguments);
    let result = obj.value;
    if (!Array.isArray(value)) throw Error("not an array");
    let properties = obj.properties;
    for (let name in properties) {
    }
}

function saveObj() {
    let dirPath = cacheDir + "/" + Array.from(arguments).slice(0, arguments.length - 2).join("/") + "/";
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, 511, true);
    }
    let path = cacheDir + "/" + Array.from(arguments).slice(0, arguments.length - 1).join("/") + ".json.gz";
    let obj = arguments[arguments.length - 1];
    let str;
    if (isTypedArray(obj)) str = "[" + obj.join(",") + "]"; else str = JSON.stringify(obj);
    fs.writeFileSync(path, zlib.gzipSync(str));
    //console.log("saved "+path);
    return path;
}

function saveObjStr(id) {//saves json.gz but using a JSON string
    let dirPath = cacheDir + "/" + Array.from(arguments).slice(0, arguments.length - 2).join("/") + "/";
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, 511, true);
    }
    let path = cacheDir + "/" + Array.from(arguments).slice(0, arguments.length - 1).join("/") + ".json.gz";
    let str = arguments[arguments.length - 1];
    fs.writeFileSync(path, zlib.gzipSync(str));
    //console.log("saved "+path);
    return path;
}

//todo: all JSON save/load should be streaming, and all string save/load should allow stream or line-based options

function saveStr(id) {
    let dirPath = cacheDir + "/" + Array.from(arguments).slice(0, arguments.length - 2).join("/") + "/";
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, 511, true);
    }
    let path = cacheDir + "/" + Array.from(arguments).slice(0, arguments.length - 1).join("/") + ".txt";
    let str = arguments[arguments.length - 1];
    fs.writeFileSync(path, str);
    //console.log("saved "+path);
    return path;
}

function saveGzStr(id) {
    let dirPath = cacheDir + "/" + Array.from(arguments).slice(0, arguments.length - 2).join("/") + "/";
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, 511, true);
    }
    let path = cacheDir + "/" + Array.from(arguments).slice(0, arguments.length - 1).join("/") + ".txt.gz";
    let str = arguments[arguments.length - 1];
    fs.writeFileSync(path, zlib.gzipSync(str));
    //console.log("saved "+path);
    return path;
}

function toJSON(obj) {//custom conversion for eg. objects containing typed arrays
    let result;
    let first = true;
    switch (typeof obj) {
        case "object":
            if (typeof obj.toJSON == "function") {
                return obj.toJSON();
            }
            if (isTypedArray(obj)) {
                return "[" + obj.join(",") + "]";
            }
            if (Array.isArray(obj)) {
                result = "[";
                for (let i = 0; i < obj.length; i++) {
                    if (!first) result += ",";
                    result += toJSON(obj[i]);
                    first = false;
                }
                result += "]";
                return result;
            }
            //otherwise probably just an ordinary object
            result = "{";
            for (let name of Object.getOwnPropertyNames(obj)) {
                let t = typeof obj[name];
                if (t == "function" || t == "undefined") continue;
                if (!first) result += ",";
                first = false;
                result += "\"" + name + "\":" + toJSON(obj[name]);
            }
            result += "}";
            return result;
        case "function":
            return "null";
        case "undefined":
            return "null";
        default:
            return JSON.stringify(obj);
    }
}

function saveTopology(g) {
    //now all graph save/load uses the data path
    //save ObjStr saves a JSON string instead of an object as JSON, to deal with typed arrays whose normal JSON string is not what we want
    //let str=g.getObjectsText({vertices:["id"],edges:["source","target"]});//selectively gets a JSON string with these objects and properties
    //saveObjStr(g.dataPath,"graph",str);//todo: use streams to avoid having to convert into a single string?
    if ("bucketID" in g) return;

    saveProperty(g, "vertices", "id");
    saveProperty(g, "edges", "source");
    saveProperty(g, "edges", "target");
}

function loadTopology(g) {//the save/load tool functions will convert it to a path under cacheDir

    //g.loadObjects(loadObj(g.dataPath,"graph"));
    //use the default JSON parsing anyway, then convert it to typed arrays inside loadObjects for now?
    if ("bucketID" in g) return;
    let ids = loadObj(g.dataPath, "vertices.id");//{type:.,value:[...]} and type is not used here
    let sources = loadObj(g.dataPath, "edges.source");
    let targets = loadObj(g.dataPath, "edges.target");
    g.loadVerticesAndEdges(ids.value, sources.value, targets.value);
}

function saveProperty(g, objName, propName) {
    if ("bucketID" in g) return;
    let str = g[objName].properties[propName].toJSON();
    if (propName == "originalWaveLevel") {
        console.log("saved originalWaveLevel for " + g.dataPath);
    }
    saveObjStr(g.dataPath, objName + "." + propName, str);
}

function loadProperty(g, objName, propName) {
    let result = loadObj(g.dataPath, objName + "." + propName);
    let type = result.type;
    g[objName].addProperty(propName, type, result.value);
}

//properties saved in the graph-level summary

function loadSummary(g) {
    let summary = loadObj(g.dataPath, "summary");
    g.loadSummary(summary);
}

function saveSummary(g) {
    if ("bucketID" in g) return;
    let summary = g.getSummary();
    saveObj(g.dataPath, "summary", summary);
    touch(g.dataPath);
}

function saveAllProperties(g) { //saves the commonly loaded vertex IDs, edge sources and targets in one file(topology), and other properties in separate files
//note: must save main files (vertex IDs, edge sources and targets) before all other properties, because graphs may come with certain properties precalculated and if they are saved too early the system would think they are outdated compared to the graph topology. Luckily there are no dependencies between properties right now. Actually, parts of the data should be saved in the order of their dependencies, or in the order the are generated, but we don't have this info readily
    if ("bucketID" in g) return;
    saveTopology(g);
    for (let objName in g.objects) {
        let obj = g[objName];
        for (let propName in obj.properties) {
            if (objName == "vertices" && propName == "id") continue;
            if (objName == "vertices" && propName == "edges") continue;
            if (objName == "edges" && propName == "source") continue;
            if (objName == "edges" && propName == "target") continue;
            saveProperty(g, objName, propName);
        }
    }
    touch(g.dataPath);
    //console.log("saved "+g.dataPath);
    //todo: also save the summary?
}

function loadAllProperties(g) { //saves the commonly loaded vertex IDs, edge sources and targets in one file(topology), and other properties in separate files
//note: must save main files (vertex IDs, edge sources and targets) before all other properties, because graphs may come with certain properties precalculated and if they are saved too early the system would think they are outdated compared to the graph topology. Luckily there are no dependencies between properties right now. Actually, parts of the data should be saved in the order of their dependencies, or in the order the are generated, but we don't have this info readily
    if ("bucketID" in g) return;
    loadSummary(g);
    loadTopology(g);
    for (let objName in g.objects) {
        let obj = g[objName];
        for (let propName in obj.properties) {
            if (objName == "vertices" && propName == "id") continue;
            if (objName == "vertices" && propName == "edges") continue;
            if (objName == "edges" && propName == "source") continue;
            if (objName == "edges" && propName == "target") continue;
            loadProperty(g, objName, propName);
        }
    }
}


function saveSubgraphs(g, type, subgraphs, options) {//auto buckets, takes array or generator of graphs, adds subgraph-related data(including data path and what partitions were used to create them (which is added at create***Partition in graph-algorithms.js)
//returns a list of subgraphs (unloaded) that are not bucketed.
    //for bucketed graphs, currently we don't save subgraphs, but we still provide teh statistics for consistency

    if (!options) {
        options = {};
    }
    if ("bucketID" in g) {
        options.noBucketing = true;//don't do bucets for them
    }
    let bucketVLimit = 136701;
    let bucketELimit = 206202;
    let unbucketedVLimit = 256, unbucketedELimit = 1024;//subgraphs larger tahn this will not be bucketed
    if (options.unbucketedVLimit) unbucketedVLimit = options.unbucketedVLimit;
    if (options.unbucketedELimit) unbucketedELimit = options.unbucketedELimit;
    let partitionInfo = options.partitionInfo;
    if (!partitionInfo) {
        partitionInfo = {graph: g.dataPath};
    }//by default the base graph is the parent graph
    //also need the subgraph distribution (and maybe the property distributons) for global maps

    let fullSummaryList = [], unbucketedList = [];
    //buckets hold items in order, using the original subgraph ID ordering so we can retrieve subgraphs easily from buckets
    let bucketsSummary = [], bucketMap = {}, bucketItemCount = 0, bucketVertexCount = 0, bucketEdgeCount = 0,
        bucketIndex = 0;
    //keep track of what is the first and last subgraph ID in each bucket
    if (typeof subgraphs == "function") subgraphs = subgraphs();//for passing a generator function so we can iterate multiple times over them
    if (!subgraphs[Symbol.iterator]) {
        subgraphs = Object.keys(subgraphs).sort(compareBy((x) => Number(x), true)).map((key) => subgraphs[key]);
    }//if it's an object, sort the items by ascending values (to be the same order as arrays)
    let subgraphCount = 0, maxSubgraphID = -Infinity, minSubgraphID = Infinity;
    let Vdist = {}, Edist = {}, VEdist = {}, VdistIDs = {}, EdistIDs = {}, VEdistIDs = {};//VEdist lists ccs by both V and E, with keys like "v,e", and teh value is the count
    //IDs list the arrays of larger CCs' IDs by these criteria
    for (let newGraph of subgraphs) {//this works even if result is a generator function(to save memory)
        if (!newGraph) {
            console.log("missing subgraph");
            continue;
        }
        if (options.skipSingleVertexSubgraphs && (newGraph.vertices.length == 1)) {
            continue;
        }
        subgraphCount++;
        let subgraphSummary = newGraph.getShortSummary();
        let subgraphID = newGraph.subgraphID;
        subgraphSummary.subgraphID = subgraphID;
        if (maxSubgraphID < subgraphID) maxSubgraphID = subgraphID;
        if (minSubgraphID > subgraphID) minSubgraphID = subgraphID;
        fullSummaryList.push(subgraphSummary);
        //some subgraph info
        let info = g.partitionInfo ? Array.from(g.partitionInfo) : [];//copies the previous partitions
        let subgraphPartitionInfo = Object.assign({}, partitionInfo);
        subgraphPartitionInfo.type = type;
        subgraphPartitionInfo.value = subgraphID;
        info.push(subgraphPartitionInfo);//{graph:...(datapath of the graph it's based on),type:...,value:...}
        newGraph.baseGraph = g.baseGraph ? g.baseGraph : g.dataPath;//which graph it's a part of (ie shares vertex identities)
        if (g.subgraphPrefix) newGraph.subgraphPrefix = g.subgraphPrefix;//where the client can get subgraphs using vertex IDs
        newGraph.partitionInfo = info;
        if (!g.dataPath) throw Error();
        newGraph.dataPath = g.dataPath + "/" + type + "/" + subgraphID;
        newGraph.datasetID = g.datasetID;
        newGraph.metagraph = g.dataPath + "/metagraphs/" + type;
        newGraph.wholeGraph = g.dataPath;
        newGraph.subgraphType = type;
        //global partitions: if the current partition is based on the top level graph, then it is added to the global partition; if the whole graph has some global partition info, then it's inherited; (a subgraph might not have any global partition info because whatever generated it does not guarantee it belones to one CC/layer/whatever, even if it happens to belong to one of these patitions, eg a layer might only have a single original CC, or a CC might only have one layer, but this info is not readily available unless we always explicitly check them, and that shouldn't be done here because 1) the main graph may already be unloaded here if g is not the top level and 2) the partitions after layer/cc usually don't contribute anything to the global partition info, since the global layer/cc are already fixed at the layer/cc level. so here we inherit from teh parent only, and manually set it for layer/cc subgraphs. we can use the partitionInfo but don't have to?
        //globalPartitionInfo can be added like: globalPartitionInfo:{layer:{value:*,V:*,E:*},cc:...} where the values are numbers referring to the subgraph IDs, or functions that take a subgraph and returns a value. (note that the names correspond to subgraph type names, not property names? ) and can be added automatically if g is the top level graph.
        //note that given the subgraph ID in the global partition, there may be no easy way to know its V and E without loading another summary(to show its place in global CC buckets, say) and so we add that information here

        if (!newGraph.globalPartitionInfo) newGraph.globalPartitionInfo = {};
        if (g.globalPartitionInfo) {
            for (let name in g.globalPartitionInfo) {
                newGraph.globalPartitionInfo = g.globalPartitionInfo[name];
            }
        }
        if (g.dataPath == g.datasetID) {
            newGraph.globalPartitionInfo[type] = {
                value: subgraphID,
                V: newGraph.vertices.length,
                E: newGraph.edges.length
            };
        }
        if (options.globalPartitionInfo) {
            for (let name in options.globalPartitionInfo) {
                let value = options.globalPartitionInfo[name];
                if (typeof value == "function") value = value(newGraph);
                newGraph.globalPartitionInfo[name] = value;
            }
        }


        //project properties: projectProperties:{vertices:{cc:"originalcc"}}}
        if (options.projectProperties) {
            if (options.projectProperties.vertices) {
                for (let name in options.projectProperties.vertices) {
                    let newName = options.projectProperties.vertices[name];
                    let data = g.projectVertexProperty(newGraph, name);
                    newGraph.vertices.addProperty(newName, g.vertices.properties[name].type, data);
                }
            }
            if (options.projectProperties.edges) {
                for (let name in options.projectProperties.edges) {
                    let newName = options.projectProperties.edges[name];
                    let data = g.projectEdgeProperty(newGraph, name);
                    newGraph.edges.addProperty(newName, g.edges.properties[name].type, data);
                }
            }
        }

        let V = newGraph.vertices.length, E = newGraph.edges.length, VE = V + "," + E;
        //the distribution lists subgraphIDs if they are larger than the bucket size(a graph only needs to exceed one of V and E limits to be unbucketed, so if a graph is below the limit in one dimension, it may still be listed by ID in another, and it would still be unbucketed in this case)
        if (!Vdist[V]) Vdist[V] = 0;
        Vdist[V]++;
        if (V > unbucketedVLimit) {
            if (!VdistIDs[V]) VdistIDs[V] = [];
            VdistIDs[V].push(subgraphID);
        }
        if (!Edist[E]) Edist[E] = 0;
        Edist[E]++;
        if (E > unbucketedELimit) {
            if (!EdistIDs[E]) EdistIDs[E] = [];
            EdistIDs[E].push(subgraphID);
        }
        if (!VEdist[VE]) VEdist[VE] = 0;
        VEdist[VE]++;
        if (V > unbucketedVLimit || E > unbucketedELimit) {
            if (!VEdistIDs[VE]) VEdistIDs[VE] = [];
            VEdistIDs[VE].push(subgraphID);
        }

        //bucketing - there's only one way of default bucketing
        if ((!options.noBucketing) && ((options.bucketCondition && (options.bucketCondition(newGraph))) || ((newGraph.vertices.length <= unbucketedVLimit) && (newGraph.edges.length <= unbucketedELimit)))) {
            if (newGraph.vertices.length == 0) throw Error();
            if (newGraph.vertices.length + bucketVertexCount > bucketVLimit || newGraph.edges.length + bucketEdgeCount > bucketELimit) {
                //start new bucket
                //console.log("saving bucket of "+bucketItemCount+" items");
                let keys = Object.keys(bucketMap).map((x) => Number(x)), max = Math.max.apply(null, keys),
                    min = Math.min.apply(null, keys);
                bucketsSummary.push({index: bucketIndex, max: max, min: min});
                saveObjStr(g.dataPath, type, "buckets", bucketIndex, toJSON(bucketMap));
                bucketMap = {}, bucketItemCount = 0, bucketVertexCount = 0, bucketEdgeCount = 0;
                bucketIndex++;
            }
            subgraphSummary.bucketed = true;
            subgraphSummary.bucketID = bucketIndex;
            newGraph.bucketID = bucketIndex;
            bucketItemCount++;
            bucketVertexCount += newGraph.vertices.length;
            bucketEdgeCount += newGraph.edges.length;
            bucketMap[subgraphID] = newGraph;//will use custom toJSON(); now assuming subgraph ID is a simple number
            //bucketed graphs will not have derivative data and leave the pipeline
            //but they will be in the summary
            continue;
        }
        //note for metagraphs that are created along with subgraphs, its vertexIDs must be the subgraphIDs and we use subgraphPath + vertexID for expansion; for metagraphs that are not created with subgraphs, but instead refers to existing subgraphs, or has no clear single subgraphID for all subrgaphs, its vertices should have the subgraphPath property and we use that for expansion (eg. layer cc metagraphs). here we don't need to worry about the metagraph
        unbucketedList.push(newGraph);

        if ("bucketID" in g) continue;

        if (!fileExists(g.dataPath, type, subgraphID)) {
            mkdir(g.dataPath, type, subgraphID);
        }
        saveAllProperties(newGraph);
        saveSummary(newGraph);
        newGraph.unloadAll();
    }
    if (bucketItemCount > 0) {
        //console.log("saving bucket of "+bucketItemCount+" items");
        let max = 0, min = Infinity;
        for (let key in bucketMap) {
            let num = Number(key);
            if (num > max) max = num;
            if (num < min) min = num;
        }
        bucketsSummary.push({index: bucketIndex, max: max, min: min});
        let str = toJSON(bucketMap);
        if (typeof str != "string") {
            console.log(bucketMap);
            console.log(str);
            throw Error();
        }
        saveObjStr(g.dataPath, type, "buckets", bucketIndex, str);
    }

    if (!g.subgraphs) g.subgraphs = {};
    let simpleSummary = {
        count: subgraphCount,
        max: maxSubgraphID,
        min: minSubgraphID,
        buckets: bucketsSummary,
        Vdist: Vdist,
        Edist: Edist,
        VEdist: VEdist,
        VdistIDs: VdistIDs,
        EdistIDs: EdistIDs,
        VEdistIDs: VEdistIDs,
        unbucketed: unbucketedList.map((g) => g.subgraphID)
    }
    g.subgraphs[type] = simpleSummary;
    if ("bucketID" in g) return unbucketedList;
    saveSummary(g);//save the subgrap list in case it's missing??
    saveObj(g.dataPath, type, "fullSummary", fullSummaryList);//saves subgraph info (V, E, whether it's in a bucket)
    saveObj(g.dataPath, type, "summary", simpleSummary);//used to find which bucket a subgraph belongs, and for distrbution plots
    saveObj(g.dataPath, type, "buckets", "summary", bucketsSummary);//summary of buckets for finding specific items
    //update the modification time of teh subgraph directory to mark it as changed, to avoid annoying dependency time problems
    touch(g.dataPath, type);


    return unbucketedList;
}

function getSubgraphFileTypes(g) {//summary of all types of subgraphs - in case this info is corrupted by crashes
    let subgraphSummaries = {};
    fs.readdirSync(cacheDir + "/" + g.dataPath).forEach((type) => {
        if (type == "metagraphs") return;
        //get the summary file which is the short summary of subgraphs
        let stats = fs.statSync(cacheDir + "/" + g.dataPath + "/" + type);
        if (stats.isDirectory() == false) return;
        let summary = loadObj(g.dataPath, type, "summary");
        subgraphSummaries[type] = summary;
    });
    return subgraphSummaries;
}

function getMetagraphFileTypes(g) {//summary of all types of subgraphs - note, metagraph summaries should only contain V and E
    let metagraphSummaries = {};
    if (fileExists(g.dataPath, "metagraphs") == false) return metagraphSummaries;
    fs.readdirSync(cacheDir + "/" + g.dataPath + "/metagraphs").forEach((type) => {
        //get the summary file
        let summary = loadObj(g.dataPath, "metagraphs", type, "summary");
        let shortSummary = {V: summary.objects.vertices.length, E: summary.objects.edges.length};
        metagraphSummaries[type] = shortSummary;
    });
    return metagraphSummaries;
}

function loadSubgraphSummary(g, type) {//summary.json.gz
    let dataPath = g;
    if (typeof g == "object") dataPath = g.dataPath;
    if (fileExists(dataPath, type, "summary.json.gz")) {
        return loadObj(dataPath, type, "summary.json.gz");
    } else return null;
}

function loadSubgraphFullSummary(g, type) {//summary.json.gz
    let dataPath = g;
    if (typeof g == "object") dataPath = g.dataPath;
    if (fileExists(dataPath, type, "fullSummary.json.gz")) {
        return loadObj(dataPath, type, "fullSummary.json.gz");
    } else return null;
}

function loadSubgraphs(g, type, includeBucketed = false) {
    //also may include bucketed subgraphs now. bucketed subgraphs cannot enter the stack so will not have other properties, and saveProperty doesn't work for them currently
    let subgraphs = [];
    let bucketsFound = false;
    fs.readdirSync(cacheDir + "/" + g.dataPath + "/" + type).forEach((f) => {
        if (f == "buckets") {
            bucketsFound = true;
            return;
        }
        let stats = fs.statSync(cacheDir + "/" + g.dataPath + "/" + type + "/" + f);
        if (stats.isDirectory() == false) return;
        if (fileExists(g.dataPath, type, f, "summary.json.gz") == false) {
            return;
        }//??
        let s = new Graph();
        s.dataPath = g.dataPath + "/" + type + "/" + f;
        s.subgraphID = Number(f);
        loadSummary(s);
        subgraphs.push(s);
    });
    if (bucketsFound && includeBucketed) {
        fs.readdirSync(cacheDir + "/" + g.dataPath + "/" + type + "/buckets").forEach((f) => {
            if (f == "summary.json.gz") return;
            let bucketObj = loadObj(g.dataPath + "/" + type + "/buckets" + "/" + f);
            for (let id in bucketObj) {
                let g = new Graph();
                g.loadAll(bucketObj[id]);
                subgraphs.push(g);
            }
        });
    }
    subgraphs.sort(compareBy("subgraphID", true));//sort by ID, smallest first
    return subgraphs;
}

let unionCache = null, unionCachePath = null;

function loadSubgraphUnion(originalGraph, type, subgraphIDList) {
    if (typeof originalGraph == "object") {
        originalGraph = originalGraph.dataPath;
    }
    if (unionCachePath == originalGraph + "/" + type + "/" + subgraphIDList.join("+")) return unionCache;
    let subgraphList = [];
    for (let ID of subgraphIDList) {
        let subgraph;
        if (fileExists(originalGraph, type, ID, "summary.json.gz")) {
            subgraph = new Graph();
            subgraph.dataPath = originalGraph + "/" + type + "/" + ID;
            loadAllProperties(subgraph);
        } else {
            subgraph = getBucketedSubgraph(originalGraph, type, ID);
        }
        subgraphList.push(subgraph);
    }
    //todo: correct way to get the  partition name
    let newPropertyName = type;
    if (type == "CC") newPropertyName = "cc";
    if (type == "layer") newPropertyName = "fixedPointLayer";
    if (type == "level") newPropertyName = "originalWaveLevel";
    let result = Graph.unionGraphs(subgraphList, null, newPropertyName, "int").graph;
    result.dataPath = originalGraph + "/" + type + "/" + subgraphIDList.join("+");
    unionCache = result;
    unionCachePath = result.dataPath;
    result.datasetID = originalGraph.split("/")[0];
    result.wholeGraph = originalGraph;
    result.metagraph = subgraphList[0].metagraph;
    return result;
}

function deleteSubgraphs(g, type) {
    let subgraphPath = cacheDir + "/" + g.dataPath + "/" + type;
    if (fs.existsSync(subgraphPath)) {
        deleteFolderRecursive(subgraphPath);
    }
}

function saveMetagraph(g, type, metagraph) {
    if ("bucketID" in g) return;
    if (!g.dataPath) throw Error();
    metagraph.dataPath = g.dataPath + "/metagraphs/" + type;
    metagraph.originalGraph = g.dataPath;
    metagraph.metagraphType = type;
    metagraph.datasetID = g.datasetID;
    metagraph.isMetagraph = true;
    if (g.partitionInfo) metagraph.partitionInfo = g.partitionInfo;
    if (g.globalPartitionInfo) metagraph.globalPartitionInfo = g.globalPartitionInfo;
    //metagraph.baseGraph=metagraph.dataPath;//usually is itself
    //if(!fileExists(g.dataPath,"metagraph"type,subgraphID)){mkdir(g.dataPath,type,subgraphID);}
    saveAllProperties(metagraph);
    saveSummary(metagraph);
    metagraph.unloadAll();
    if (!g.metagraphs) {
        g.metagraphs = {};
    }
    //I found it may be necessary to touch the directory to ensure it's mtime is new
    g.metagraphs[type] = {V: metagraph.vertices.length, E: metagraph.edges.length};
}

let bucketsCache = null, bucketsCachePath = null;
let bucketCache = null, bucketCachePath = null;


function getBuckets(originalGraph, subgraphType) {
    if (typeof originalGraph == "object") {
        originalGraph = originalGraph.dataPath;
    }
    if (bucketsCachePath == originalGraph + "/" + subgraphType) return bucketsCache;
    //console.log("getting buckets "+originalGraph+"/"+subgraphType);
    if (!fileExists(originalGraph, subgraphType, "summary.json.gz")) {
        //console.log("failed to get buckets "+originalGraph+"/"+subgraphType);
        return null;
    }
    let result = loadObj(originalGraph, subgraphType, "summary");
    let buckets = result.buckets;
    bucketsCache = buckets;
    bucketsCachePath = originalGraph + "/" + subgraphType;
    return buckets;
}

function getBucket(originalGraph, subgraphType, bucketID) {

    if (typeof originalGraph == "object") {
        originalGraph = originalGraph.dataPath;
    }
    if (bucketCachePath == originalGraph + "/" + subgraphType + "/buckets/" + bucketID) return bucketCache;
    //console.log("getting bucket "+originalGraph+"/"+subgraphType+"/buckets/"+bucketID);
    if (!fileExists(originalGraph, subgraphType, "buckets", bucketID + ".json.gz")) {
        //console.log("failed to get bucket "+originalGraph+"/"+subgraphType+":"+bucketID);
        return null;
    }
    let result = loadObj(originalGraph, subgraphType, "buckets", bucketID);
    let bucket = result;
    bucketCache = bucket;
    bucketCachePath = originalGraph + "/" + subgraphType + "/buckets/" + bucketID;
    return bucket;
}

function hasBucketedSubgraph(originalGraph, subgraphType, subgraphID) {
    if (typeof originalGraph == "object") {
        originalGraph = originalGraph.dataPath;
    }
    let buckets = getBuckets(originalGraph, subgraphType);
    let found = false;
    for (let bucket of buckets) {
        if (bucket.max >= subgraphID && bucket.min <= subgraphID) {
            let bucketObj = getBucket(originalGraph, subgraphType, bucket.index);
            if (subgraphID in bucketObj) return true;
        }
    }
    return false;
}

function getBucketedSubgraph(originalGraph, subgraphType, subgraphID) {
    if (typeof originalGraph == "object") {
        originalGraph = originalGraph.dataPath;
    }
    //console.log("getting bucketed subgraph "+originalGraph+"/"+subgraphType+"/"+subgraphID);
    let buckets = getBuckets(originalGraph, subgraphType);
    if (!buckets) {
        return null;
    }
    for (let bucket of buckets) {
        if (bucket.max >= subgraphID && bucket.min <= subgraphID) {
            //console.log("found bucket for"+subgraphID);
            let bucketObj = getBucket(originalGraph, subgraphType, bucket.index);
            if (subgraphID in bucketObj) {
                //console.log("loaded bucket for"+subgraphID);
                return bucketObj[subgraphID];
            } else {
                //console.log("didn't find subgraph" + subgraphID+" in the bucket");
            }
        }
    }
    //console.log("didn't find a bucket for" + subgraphID);
    return null;
}

function getPath(id) {
    let path = cacheDir + "/" + id + "/" + Array.from(arguments).slice(1).join("/");//no suffix here
    return path;
}

function getShortPath() {
    let path = Array.from(arguments).join("/");//based in the dataset's temp folder
    return path;
}

function copyObj(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function toNormalText(str) {//un-Camel case
    str = String(str);
    return str.replace(/(?<=[a-z])([A-Z]+)/g, ' $1').replace("_", " ").replace(/^./, function (str) {
        return str.toUpperCase();
    });
}

function compareBy(f, smallFirst) {
    if (typeof f != "function") {
        let p = f;
        f = (x) => x[p];
    }
    if (smallFirst) {
        return function (a, b) {
            let fa = f(a), fb = f(b);
            if (fa < fb)
                return -1;
            if (fa > fb)
                return 1;
            return 0;
        }
    } else {
        return function (a, b) {
            let fa = f(a), fb = f(b);
            if (fa > fb)
                return -1;
            if (fa < fb)
                return 1;
            return 0;
        }
    }
}

function fileAge(filename) {
    let stat = fs.statSync(filename), now = new Date().getTime();
    return now - stat.mtimeMs;
}

//from SO
function deleteFolderRecursive(path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file) {
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};


module.exports = {
    loadAllDatasets: loadAllDatasets,
    datasets: datasets,//debug only
    datasetIDMaps: datasetIDMaps,
    extraData: extraData,
    getDatasetList: getDatasetList,
    startStreaming: startStreaming,
    stopStreaming: stopStreaming,
    pauseStreaming: pauseStreaming,
    resumeStreaming: resumeStreaming,
    stopAllStreaming: stopAllStreaming,
    doCustomComputation: doCustomComputation,
    saveCustomData: saveCustomData,
    loadCustomData: loadCustomData,
    loadSummary: loadSummary,
    loadProperty: loadProperty,

    //reloadAllDatasets:reloadAllDatasets,//to be able to refresh stuff without restarting the server - but it only makes sense if we can reload the cache-producing code,but they are all hard-coded.
    loadSubgraphSummary: loadSubgraphSummary,
    loadSubgraphFullSummary: loadSubgraphFullSummary,
    loadSubgraphs: loadSubgraphs,
    getBucketedSubgraph: getBucketedSubgraph,
    getBuckets: getBuckets,
    getBucket: getBucket,
    loadSubgraphUnion: loadSubgraphUnion,

}