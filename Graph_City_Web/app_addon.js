import path from 'path'
import { fileURLToPath } from 'url';
import fs from 'fs'
import { exec } from 'child_process'
import express from 'express'
import disjointSet from 'disjoint-set'
// import csv from 'csv-parse'
import { parse } from 'csv-parse';
import LRU from 'lru-cache'
import * as d3 from "d3";
import {XMLHttpRequest} from 'xmlhttprequest';

const localPort = 18000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const strataAddress = "http://addressSample:8888/";
const TH_DAG = 32768;
const TH_SUBDAG = 16384;
const TH_STRATA = 16384;
const TH_FPVIEWER = 262144;
const TH_RAWSPLIT = 4194304;

// const path = require('path');
// const fs = require('fs');
// const exec = require('child_process').exec;


// const express = require('express');
const app = express();

// const addon = require('./build/Release/preproc_server');

const options = {
  // for use with tracking overall items
  max: 1024,

  // for use with tracking overall storage size
  maxSize: 268435456,
  sizeCalculation: (value, key) => {
    if (value.hasOwnProperty('size')) {
      console.log(value.size, 'size')
      return value.size;
    } else {
      return 1;
    }
  },

  // // for use when you need to clean up something when objects
  // // are evicted from the cache
  // dispose: (value, key) => {
  //   freeFromMemoryOrWhatever(value)
  // },

  // how long to live in ms
  ttl: 1000 * 60 * 60 * 12,

  // return stale items before removing from cache?
  allowStale: false,

  updateAgeOnGet: false,
  updateAgeOnHas: false,

  // // async method to use for cache.fetch(), for
  // // stale-while-revalidate type of behavior
  // fetchMethod: async (key, staleValue, { options, signal }) => {}
}

const cache = new LRU(options)


function httpGet(theUrl) {
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.open("GET", theUrl, false); // false for synchronous request
  xmlHttp.send(null);
  return xmlHttp.responseText;
}

function httpGetAsync(theUrl, callback) {
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = function() {
    if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
      callback(xmlHttp.responseText);
  }
  xmlHttp.open("GET", theUrl, true); // true for asynchronous
  xmlHttp.send(null);
}

function httpPost(content, theUrl) {
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.open("POST", theUrl, false); // false for synchronous request
  xmlHttp.responseType = 'json';
  xmlHttp.setRequestHeader('Content-Type', 'application/json');
  xmlHttp.send(content);
  return xmlHttp.response;
}

function httpPostAsync(content, theUrl, callback) {
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = function() {
    if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
      // console.log(xmlHttp.status, xmlHttp.responseText);
      callback(JSON.parse(xmlHttp.responseText));
    }
  }
  xmlHttp.open("POST", theUrl, true); // true for asynchronous
  xmlHttp.responseType = 'json';
  xmlHttp.setRequestHeader('Content-Type', 'application/json');
  xmlHttp.send(content);
}


app.listen(localPort, () => {
  console.log(`Application started and Listening on port ${localPort}`);
});

// // serve your css as static
// app.use(express.static(__dirname));
app.use(express.static('public'));

app.use(
  express.urlencoded({
    extended: true,
    limit: '500mb'
  })
);
app.use(
  express.json({
    limit: '500mb'
  })
);

app.use(express.json());

// app.get("*", (req, res) => {
  
//   // Here user can also design an
//   // error page and render it 
//   res.send("PAGE NOT FOUND");
// });

app.get('/', (req, res) => {
  console.log('here')
  // console.log(req, res)
  // console.log(__dirname + '/index_server2.html');
  const city = req.query.city;
  console.log(city);
  // res.sendFile(__dirname + '/index.html');
  if (fs.existsSync(`${__dirname}/index-${city}.html`)) {
    res.sendFile(`${__dirname}/index-${city}.html`);
    cacheLabel(city);
    checkMallVicinity(city);
    cacheBestBuilding(city)
  } else {
    res.send('File does not exist');
  }
});

function cacheLabel(city) {
  const labelFileName = `${__dirname}/wave-decomposition/${city}/${city}_label.csv`;
  const labelCacheName = `${city}_label`;
  if (!fs.existsSync(labelFileName)) {
    cache.set(labelCacheName, {
      processingFlag: false, 
      type: 'label.null', 
      size: 1,
      data: {}
    });
    return false;
  } else {
    const processPromise = csvParseStreamAsSimpleObj(labelFileName, d => d[0], d => d[1], d => 2, false);
    cache.set(labelCacheName, {
      processingFlag: true, 
      processPromise: processPromise,
      type: 'label', 
      size: 1,
      data: {}
    });
    processPromise.then(data => {
      cache.set(labelCacheName, {
        processingFlag: false, 
        type: 'label', 
        size: data[1],
        data: data[0]
      });
    })
    return true;
  }
}

async function checkMallVicinity(dataset) {
  const mallVicinityFile = fs.readFileSync(`${__dirname}/wave-decomposition/${dataset}/mallVicinityList.json`);
  const mallVicinityList = JSON.parse(mallVicinityFile);
  console.log(mallVicinityList);
  const vicinityProcessState = {};
  mallVicinityList.forEach((nodeInfo, idx) => {
    const [layer, lcc, buck, wave, frag, level, nodeID] = nodeInfo;
    vicinityProcessState[`${layer}-${lcc}-${level}-${nodeID}`] = {
      layer: layer,
      lcc: lcc,
      buck: buck,
      level: level,
      nodeID: nodeID,
      wave: wave,
      frag: frag,
      processed: false,
    }
  })
  // update processed info
  if (fs.existsSync(`${__dirname}/wave-decomposition/${dataset}/mallVicinityProcessedList.json`)) {
    const mallVicinityProcessedFile = fs.readFileSync(`${__dirname}/wave-decomposition/${dataset}/mallVicinityProcessedList.json`);
    const mallVicinityProcessedList = JSON.parse(mallVicinityProcessedFile);
    for (const [key, val] of Object.entries(mallVicinityProcessedList)) {
      if (vicinityProcessState.hasOwnProperty(key)) {
        vicinityProcessState[key].processed = val.processed;
        vicinityProcessState[key].name = val.name;
      }
    }
  }

  await processMallVicinityList(dataset, vicinityProcessState);
  await checkChildrenMallVicnity(vicinityProcessState);
}

async function processMallVicinityList(dataset, vicinityProcessState) {
  for (const key of Object.keys(vicinityProcessState)) {
    if (vicinityProcessState[key].processed) {
      continue;
    }
    await processMallVicinity(dataset, vicinityProcessState, key);
  }
}

async function processMallVicinity(dataset, vicinityProcessState, key) {
  const nodeInfo = vicinityProcessState[key];
  const filename = 'data_dags/' + dataset + '/dagmeta_' + nodeInfo.layer + '_' + nodeInfo.lcc;
  const layer = nodeInfo.layer;
  const bucket = nodeInfo.buck;
  const metaNode = nodeInfo.nodeID;
  const lcc = nodeInfo.lcc;
  const wfInfo = [nodeInfo.wave, nodeInfo.frag];
  console.log(dataset, layer, lcc, bucket, metaNode, wfInfo)

  const strataFilename = Array.isArray(metaNode) ? `${dataset}-${layer}-${lcc}-${metaNode[0]}` : `${dataset}-${layer}-${lcc}-${metaNode}`;
  const vicinityFileName = `${__dirname}/index-${strataFilename}.html`;
  const mallVicinityProcessedFile = `${__dirname}/wave-decomposition/${dataset}/mallVicinityProcessedList.json`
  if (fs.existsSync(vicinityFileName)) {
    console.log(vicinityFileName, 'exists')
    // res.send(JSON.stringify({success: true, detail: 'vicinity exist', name: strataFilename}));
    // return {success: true, detail: 'vicinity exist', name: strataFilename};
    vicinityProcessState[key].processed = true;
    vicinityProcessState[key].name = strataFilename;
    fs.writeFileSync(mallVicinityProcessedFile, JSON.stringify(vicinityProcessState), {encoding:'utf8',flag:'w'});
  }

  console.log(wfInfo)

  const wavefile = `layer-${layer}-waves-buck${bucket}.csv`;
  const dir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;

  const waveDir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;
  const waveFileName = `layer-${layer}-waves-buck${bucket}.csv`;
  let node2edgeListCacheName = `${dataset}/${waveFileName}:node2edgeList`;

  const rawFragMapFileName = `${waveDir}/layer-${layer}-waves-buck${bucket}-fragMap.json`;
  let cacheWave, cacheFrag;
  if (fs.existsSync(rawFragMapFileName)) {
    if (!cache.has(rawFragMapFileName, {updateAgeOnHas: true})) {
      const processPromise =  processRawFragMap(rawFragMapFileName)
      processPromise.then(() => {
        const cachedMap = cache.get(rawFragMapFileName);
        if (cachedMap.type === 'dagNodeLink.wf.fragMap.null') {
          // read full
        } else {
          const wfName = cachedMap.data[1][wfInfo[0]][wfInfo[1]];
          node2edgeListCacheName += `-${wfName[0]}-${wfName[1]}`;
          cacheWave = wfName[0];
          cacheFrag = wfName[1];
        }
      })
    } else {
      const cachedMap = cache.get(rawFragMapFileName);
      if (cachedMap.type === 'dagNodeLink.wf.fragMap.null') {
        // read full
      } else {
        const wfName = cachedMap.data[1][wfInfo[0]][wfInfo[1]];
        node2edgeListCacheName += `-${wfName[0]}-${wfName[1]}`;
        cacheWave = wfName[0];
        cacheFrag = wfName[1];
      }
    }
  }

  
  // if (wfInfo.length === 2) {
  //   node2edgeListCacheName += `-${wfInfo[0]}-${wfInfo[1]}`;
  // }
  console.log(node2edgeListCacheName);

  // fs.writeFile(`${__dirname}/fpViewer/${strataFilename}-metaDag.json`, JSON.stringify(metaGraph), (err) => {
  //   if (err) {
  //     console.log(err);
  //   }
  // });

  // fs.writeFile(`${__dirname}/fpViewer/${strataFilename}-wfGlobal.json`, JSON.stringify(wfInfo), (err) => {
  //   if (err) {
  //     console.log(err);
  //   }
  // });
  
  let readyFlag = true;
  let vMap = undefined;
  let waveList = undefined;
  if (!cache.has(node2edgeListCacheName, {updateAgeOnHas: true})) {
    const processPromise = readWaveAndVMapStream(filename, waveFileName, waveDir, dataset, cacheWave, cacheFrag, true);
    console.log('no', filename);
    processPromise.then(async () => {
      const cachedData = cache.get(node2edgeListCacheName);
      if (Array.isArray(metaNode)) {
        console.log('metaNode', metaNode)
        const nodeEdges = metaNode.map(d => cachedData.data[0][d]).flat(1)
        const nodeVerts = metaNode.map(d => cachedData.data[1][d]).flat(1)
        // console.log(metaNode.map(d => cachedData.data[1][d]))
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        const res = send(strataFilename, nodeEdges, nodeLabels);
        return res;
      } else {
        const nodeEdges = cachedData.data[0][metaNode];
        const nodeVerts = cachedData.data[1][metaNode];
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        const res = send(strataFilename, nodeEdges, nodeLabels);
        return res;
      }
    })
  } else {
    const cachedData = cache.get(node2edgeListCacheName);
    if (cachedData.processingFlag) {
      // // still processing
      console.log('W: still processing data in /meta-dag-node-fp-viewer');
      cachedData.processPromise.then(async () => {
        const updatedCachedData = cache.get(node2edgeListCacheName);
        if (Array.isArray(metaNode)) {
          // console.log('metaNode', metaNode)
          const nodeEdges = metaNode.map(d => updatedCachedData.data[0][d]).flat(1)
          const nodeVerts = metaNode.map(d => updatedCachedData.data[1][d]).flat(1)
          // console.log(metaNode.map(d => updatedCachedData[1][d]))
          const nodeLabels = await getNodeLabels(nodeVerts, dataset)
          const res = send(strataFilename, nodeEdges, nodeLabels);
          return res;
        } else {
          const nodeEdges = updatedCachedData.data[0][metaNode];
          const nodeVerts = updatedCachedData.data[1][metaNode];
          const nodeLabels = await getNodeLabels(nodeVerts, dataset)
          const res = send(strataFilename, nodeEdges, nodeLabels);
          return res;
        }
      })
    } else {
      // // processed
      if (Array.isArray(metaNode)) {
        const nodeEdges = metaNode.map(d => cachedData.data[0][d]).flat(1)
        const nodeVerts = metaNode.map(d => cachedData.data[1][d]).flat(1)
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        const res = send(strataFilename, nodeEdges, nodeLabels);
        return res;
      } else {
        const nodeEdges = cachedData.data[0][metaNode];
        const nodeVerts = cachedData.data[1][metaNode];
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        const res = send(strataFilename, nodeEdges, nodeLabels);
        return res;
      }
    }
  }

  function send(filename, nodeEdges, nodeLabels) {
    const localDir = `${__dirname}/wave-decomposition/${filename}`
    // const vicinityName = `${dataset}-l${layer}-b${bucket}`
    const vicinityFileName = `${__dirname}/index-${filename}.html`
    if (!fs.existsSync(vicinityFileName)) {
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir)
      }
      fs.writeFile(`${localDir}/${filename}.txt`, nodeEdges.map(d => `${d[0]}\t${d[1]}`).join('\n'), function (err, data) {
        if (err) {
          // res.send(JSON.stringify({success: false, detail: 'edge', url: `na`}));
          console.log(err);
          return {success: false, detail: 'edge', url: `na`}
        }
        fs.writeFile(`${localDir}/${filename}_label.csv`, nodeLabels.map(d => `"${d[0]}","${d[1]}"`).join('\n'), function (err, data) {
          if (err) {
            // res.send(JSON.stringify({success: false, detail: 'label', url: `na`}));
            console.log(err);
            return {success: false, detail: 'label', url: `na`}
          }
        })
        exec(`cd wave-decomposition; make GRAPH=${filename} PARENT=${dataset} prepareCity`, {maxBuffer: 1024 * 1024 * 50}, (err, stdout, stderr) => {
          if (err) {
            // res.send(JSON.stringify({success: false, detail: 'prepareVicinity', name: `na`}));
            console.log(err);
            return {success: false, detail: 'prepareVicinity', name: `na`}
          }
          exec(`make GRAPH=${filename} retrive-mall`, {maxBuffer: 1024 * 1024 * 50}, (err, stdout, stderr) => {
            if (err) {
              // res.send(JSON.stringify({success: false, detail: 'retrive', name: `na`}));
              console.log(err);
              return {success: false, detail: 'retrive', name: `na`}
            }
            // res.send(JSON.stringify({success: true, name: filename}))
            // return {success: true, name: filename};
            vicinityProcessState[key].processed = true;
            vicinityProcessState[key].name = filename;
            fs.writeFileSync(mallVicinityProcessedFile, JSON.stringify(vicinityProcessState), {encoding:'utf8',flag:'w'});
          })
        })
      })
    } else {
      console.log(localDir, 'exists')
      // res.send(JSON.stringify({success: true, detail: 'vicinity exist', name: filename}));
      // return {success: true, detail: 'vicinity exist', name: filename};
      vicinityProcessState[key].processed = true;
      vicinityProcessState[key].name = filename;
      fs.writeFileSync(mallVicinityProcessedFile, JSON.stringify(vicinityProcessState), {encoding:'utf8',flag:'w'});
    }
  }
}

async function checkChildrenMallVicnity(vicinityProcessState) {
  for (const key of Object.keys(vicinityProcessState)) {
    if (vicinityProcessState[key].name == null) {
      continue;
    }
    await checkMallVicinity(vicinityProcessState[key].name)
  }
}

async function cacheBestBuilding(dataset) {
  const cacheName = `${dataset}-bestbuilding-cache`;
  if (!cache.has(cacheName, {updateAgeOnHas: true})) {
    cache.set(cacheName, {
      processingFlag: true, 
      type: 'bestbuilding-cache', 
      size: 1,
      data: []
    });
  }

  const bestBuildingFileName = `${__dirname}/${dataset}/${dataset}-bestBuilding.json`;
  const buildingCachePromises = []
  if (!fs.existsSync(bestBuildingFileName)) {
    cache.set(cacheName, {
      processingFlag: false, 
      type: 'bestbuilding-cache', 
      size: 1,
      data: []
    });
    return buildingCachePromises;
  }
  const bestBuildingFile = fs.readFileSync(bestBuildingFileName)
  const bestBuildingList = JSON.parse(bestBuildingFile);
  for (const bestBuilding of bestBuildingList) {
    const retValPromises = await cacheBuilding(dataset, bestBuilding);
    buildingCachePromises.push(... retValPromises);
  }
  console.log(buildingCachePromises);
  
  Promise.all(buildingCachePromises).then(() => {
    console.log('resolved all cahce')
    cache.set(cacheName, {
      processingFlag: false, 
      type: 'bestbuilding-cache', 
      size: 1,
      data: []
    });
  })

  return buildingCachePromises;
}

async function cacheBuilding(dataset, buildingInfo) {

  const layer = buildingInfo.layer;
  const lcc = buildingInfo.lcc;
  const bucket = buildingInfo.buck;
  const filename = `data_dags/${dataset}/dagmeta_${layer}_${lcc}`;
  console.log(filename, bucket)


  const dagFilePrefix = `${__dirname}/${filename}`;
  const dagInfoFileName = `${dagFilePrefix}-info.json`;
  const waveDir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;
  const waveFileName = `layer-${layer}-waves-buck${bucket}.csv`;
  const node2edgeListCacheName = `${dataset}/${waveFileName}:node2edgeList`;
  
  // return a promise that contains all promises for cache building.
  return Promise.all([
    fs.promises.readFile(dagInfoFileName, 'utf8')
  ]).then(async datas => {
    const retValPromises = []

    const dagInfoFile = datas[0];
    const dagInfo = JSON.parse(dagInfoFile);
    const rawEdgeCnt = dagInfo['edges'];
    if (dagInfo['linkNum'] < TH_DAG) {

      const wccLinkFile = `${dagFilePrefix}.wcc.link`;
      const wccNodeFile = `${dagFilePrefix}.wcc.node`;
      const retName = 'wcc'

      const wccCacheName = `${dataset}/${filename}.dag.wcc`;

      if (!cache.has(wccCacheName, {updateAgeOnHas: true})) {
        // // not in the cache
        const processPromise = readWccNodeLinkStream(wccCacheName, wccNodeFile, wccLinkFile);
        retValPromises.push(processPromise);
        // processPromise.then(() => {
        //   const cachedData = cache.get(wccCacheName);
        //   res.send(JSON.stringify([cachedData.data, retInfo, retName]));
        // })
      } else {
        // // // in the cache
        // const cachedData = cache.get(wccCacheName);
        // if (cachedData.processingFlag) {
        //   // // still processing
        //   console.log('W: still processing data in /meta-dag');
        //   cachedData.processPromise.then(() => {
        //     const updatedCachedData = cache.get(wccCacheName);
        //     res.send(JSON.stringify([updatedCachedData.data, retInfo, retName]));
        //   })
        // } else {
        //   // // processed
        //   res.send(JSON.stringify([cachedData.data, retInfo, retName]));
        // }
      }

      // // process dag: compressed => dag
      // const dagLinkFile = `${dagFilePrefix}.link`;
      const dagLinkFile = `${dagFilePrefix}.span.link`;
      const dagNodeFile = `${dagFilePrefix}.node`;
      const dagJumpLinkFile = `${dagFilePrefix}.span.link.jump`;
      const metaVMapFile = `${dagFilePrefix}.wcc.vmap`;
      const dagCacheName = `${dataset}/${filename}.dag`;
      if (!cache.has(dagCacheName, {updateAgeOnHas: true})) {
        // // not in the cache
        const processPromise = readDagNodeLinkByWccStream(dagCacheName, dagNodeFile, dagLinkFile, dagJumpLinkFile, metaVMapFile);
        retValPromises.push(processPromise);
      }

      // // process raw edge
      if (!cache.has(node2edgeListCacheName, {updateAgeOnHas: true})) {
        const processPromise = readWaveAndVMapStream(filename, waveFileName, waveDir, dataset);
        retValPromises.push(processPromise);
      }
    } else if (dagInfo['spanNum'] < TH_DAG) {

      const wccLinkFile = `${dagFilePrefix}.wcc.link`;
      const wccNodeFile = `${dagFilePrefix}.wcc.node`;
      const retName = 'wcc'

      const wccCacheName = `${dataset}/${filename}.dag.wcc`;
      if (!cache.has(wccCacheName, {updateAgeOnHas: true})) {
        // // not in the cache
        const processPromise = readWccNodeLinkStream(wccCacheName, wccNodeFile, wccLinkFile);
        retValPromises.push(processPromise);
        // processPromise.then(() => {
        //   const cachedData = cache.get(wccCacheName);
        //   res.send(JSON.stringify([cachedData.data, retInfo, retName]));
        // })
      } else {
        // // // in the cache
        // const cachedData = cache.get(wccCacheName);
        // if (cachedData.processingFlag) {
        //   // // still processing
        //   console.log('W: still processing data in /meta-dag');
        //   cachedData.processPromise.then(() => {
        //     const updatedCachedData = cache.get(wccCacheName);
        //     res.send(JSON.stringify([updatedCachedData.data, retInfo, retName]));
        //   })
        // } else {
        //   // // processed
        //   res.send(JSON.stringify([cachedData.data, retInfo, retName]));
        // }
      }

      // // process dag: compressed => dag
      // const dagLinkFile = `${dagFilePrefix}.link`;
      const dagLinkFile = `${dagFilePrefix}.span.link`;
      const dagNodeFile = `${dagFilePrefix}.node`;
      const dagJumpLinkFile = `${dagFilePrefix}.span.link.jump`;
      const metaVMapFile = `${dagFilePrefix}.wcc.vmap`;
      const dagCacheName = `${dataset}/${filename}.dag`;
      if (!cache.has(dagCacheName, {updateAgeOnHas: true})) {
        // // not in the cache
        const processPromise = readDagNodeLinkByWccStream(dagCacheName, dagNodeFile, dagLinkFile, dagJumpLinkFile, metaVMapFile);
        retValPromises.push(processPromise);
      }

      // // process raw edge
      if (!cache.has(node2edgeListCacheName, {updateAgeOnHas: true})) {
        const processPromise = readWaveAndVMapStream(filename, waveFileName, waveDir, dataset);
        retValPromises.push(processPromise);
      }
    } else {
      // // extra level
      // // check edgeCut compression size
      const cutCompressionInfoFileName = `${dagFilePrefix}.edgeCut-info.json`
      const processPromise = await Promise.all([
        fs.promises.readFile(cutCompressionInfoFileName, 'utf8')
      ]).then(datas => {
        const retValPromises = [];
        const cutCompressionInfoFile = datas[0];
        const cutCompressionInfo = JSON.parse(cutCompressionInfoFile);
        const retName = 'edgeCut'
        if (cutCompressionInfo['output-links'] < TH_DAG) {
          // // edgeCut is small, use edgeCut
          const compressedLinkFile = `${dagFilePrefix}.edgeCut.link`;
          const compressedNodeFile = `${dagFilePrefix}.edgeCut.node`;
          const cacheName = `${dataset}/${filename}.dag.edgeCut`;
          if (!cache.has(cacheName, {updateAgeOnHas: true})) {
            // // not in the cache
            const processPromise = readEdgeCutNodeLinkStream(cacheName, compressedNodeFile, compressedLinkFile);
            retValPromises.push(processPromise);
            // processPromise.then(() => {
            //   const cachedData = cache.get(cacheName);
            //   res.send(JSON.stringify([cachedData.data, retInfo, retName]));
            // })
          } else {
            // // // in the cache
            // const cachedData = cache.get(cacheName);
            // if (cachedData.processingFlag) {
            //   // // still processing
            //   console.log('W: still processing data in /meta-dag');
            //   cachedData.processPromise.then(() => {
            //     const updatedCachedData = cache.get(cacheName);
            //     res.send(JSON.stringify([updatedCachedData.data, retInfo, retName]));
            //   })
            // } else {
            //   // // processed
            //   res.send(JSON.stringify([cachedData.data, retInfo, retName]));
            // }
          }

          // // process dag: compressed => dag
          // const dagLinkFile = `${dagFilePrefix}.link`;
          const dagLinkFile = `${dagFilePrefix}.span.link`;
          const dagNodeFile = `${dagFilePrefix}.node`;
          const dagJumpLinkFile = `${dagFilePrefix}.span.link.jump`;
          const metaVMapFile = `${dagFilePrefix}.edgeCut.vmap`;
          const dagCacheName = `${dataset}/${filename}.dag`;
          if (!cache.has(dagCacheName, {updateAgeOnHas: true})) {
            // // not in the cache
            const processPromise = readDagNodeLinkByMetaStream(dagCacheName, dagNodeFile, dagLinkFile, dagJumpLinkFile, metaVMapFile);
            retValPromises.push(processPromise);
          }
          // // TODO!
          // // process raw edge
          if (!cache.has(node2edgeListCacheName, {updateAgeOnHas: true})) {
            const processPromise = readWaveAndVMapStream(filename, waveFileName, waveDir, dataset);
            retValPromises.push(processPromise);
          }
        } else {
          // // use wave-frag version
          // const waveFragInfoFileName = `${dagFilePrefix}.wf.json`;
          const waveLinkFile = `${dagFilePrefix}.wf.wave.link`;
          const waveNodeFile = `${dagFilePrefix}.wf.wave.node`;
          // // cache wave
          const cacheName = `${dataset}/${filename}.dag.wave`;
          const retName = 'wf.wave';
          if (!cache.has(cacheName, {updateAgeOnHas: true})) {
            // // not in the cache
            const processPromise = readWaveNodeLinkStream(cacheName, waveNodeFile, waveLinkFile);
            retValPromises.push(processPromise);
            // processPromise.then(() => {
            //   const cachedData = cache.get(cacheName);
            //   res.send(JSON.stringify([cachedData.data, retInfo, retName]));
            // })
          } else {
            // // // in the cache
            // const cachedData = cache.get(cacheName);
            // if (cachedData.processingFlag) {
            //   // // still processing
            //   console.log('W: still processing data in /meta-dag');
            //   cachedData.processPromise.then(() => {
            //     const updatedCachedData = cache.get(cacheName);
            //     res.send(JSON.stringify([updatedCachedData.data, retInfo, retName]));
            //   })
            // } else {
            //   // // processed
            //   res.send(JSON.stringify([cachedData.data, retInfo, retName]));
            // }
          }
          // // cache frag
          const fragLinkFile = `${dagFilePrefix}.wf.frag.link`;
          const fragNodeFile = `${dagFilePrefix}.wf.frag.node`;
          const wave2fragInfoFile = `${dagFilePrefix}-info.json`;
          const fragCacheName = `${dataset}/${filename}.dag.frag`;
          if (!cache.has(fragCacheName, {updateAgeOnHas: true})) {
            // // not in the cache
            const processPromise = readFragNodeLinkStream(fragCacheName, fragNodeFile, fragLinkFile, wave2fragInfoFile);
            retValPromises.push(processPromise);
          }
          // // cache raw dag
          // const dagLinkFile = `${dagFilePrefix}.link`;
          const dagLinkFile = `${dagFilePrefix}.span.link`;
          const dagNodeFile = `${dagFilePrefix}.node`;
          const dagCacheName = `${dataset}/${filename}.dag`;
          if (!cache.has(dagCacheName, {updateAgeOnHas: true})) {
            // // not in the cache
            const processPromise = readDagNodeLinkBySetStream(dagCacheName, dagNodeFile, dagLinkFile, null);
            retValPromises.push(processPromise);
          }


          // // process raw edge
          const rawFragMapFileName = `${waveDir}/layer-${layer}-waves-buck${bucket}-fragMap.json`;
          if (rawEdgeCnt > TH_RAWSPLIT) {
            const processPromise = processRawFragMap(rawFragMapFileName)
            retValPromises.push(processPromise);
          } else {
            cache.set(rawFragMapFileName, {
              processingFlag: false, 
              type: 'dagNodeLink.wf.fragMap.null', 
              size: 1,
              data: [{}, {}]
            });

            if (!cache.has(node2edgeListCacheName, {updateAgeOnHas: true})) {
              const processPromise = readWaveAndVMapStream(filename, waveFileName, waveDir, dataset, null, null, true);
              retValPromises.push(processPromise);
            }
          }

          // Promise.all([
          //   fs.promises.readFile(waveNodeFile),
          //   fs.promises.readFile(waveLinkFile),
          //   fs.promises.readFile(fragNodeFile),
          //   fs.promises.readFile(fragLinkFile),
          // ]).then(wfDatas => {
          //   // // process to wf version
          // })
        }
        return retValPromises;
      })
      retValPromises.push(... processPromise);
    }
    return retValPromises;
  })
}

// app.get('/city/:cityName', (req, res) => {
//   console.log(req.params.cityName);
//   const cityFile = `${__dirname}/index-${req.params.cityName}.html`
//   console.log(cityFile)
//   res.sendFile(cityFile)
// })

// app.post('/dag_view_layer', (req, res) => {
//   // console.log(req.body.suffix);
//   const dataset = req.body.dataset;
//   const suffix = req.body.suffix;
//   fs.readdir(`${__dirname}/${dataset}/${dataset}_layers`, function (err, files) {
//     if (err) {
//         return console.log('Unable to scan directory: ' + err);
//     } 

//     const nameTemplate = new RegExp(`layer-*[0-9]*-${suffix}.csv`)
//     console.log(nameTemplate)
//     const file = files.filter(fileName => nameTemplate.test(fileName))
//     if (file.length < 1) {
//       return console.log('no matched file');
//     }
//     // console.log(file[0]);
//     const layerfile = `${__dirname}/${dataset}/${dataset}_layers/${file[0]}`;
//     res.sendFile(layerfile);
//   });
// });

// app.post('/fp-viewer-set', (req, res) => {
//   const fileName = req.body.filename;
//   const edges = req.body.edges;
//   const labels = req.body.labels;
//   const dir = `${__dirname}/wave-decomposition/${fileName}`
//   console.log(dir);
//   const buffer = Buffer.from(edges);
//   addon.union(buffer, buffer.length);
//   if (!fs.existsSync(dir)) {
//     fs.mkdirSync(dir)
//     fs.writeFile(`${dir}/${fileName}.txt`, edges.map(d => `${d.source}\t${d.target}`).join('\n'), function (err, data) {
//       if (err) {
//         return console.log(err);
//       }
//       fs.writeFile(`${dir}/${fileName}_names.csv`, labels.slice(1).map(d => `"${d.source}","${d.target}"`).join('\n'), function (err, data) {
//         if (err) {
//           return console.log(err);
//         }
//       })
//       exec(`cd wave-decomposition; make GRAPH=${fileName} PARENT=${dataset} fpViewer`, (err, stdout, stderr) => {
//         if (err) {
//           return console.log(err);
//         }
//         // console.log(stdout);
//         exec(`cd fpViewer; make GRAPH=${fileName} retrive`, (err, stdout, stderr) => {
//           if (err) {
//             return console.log(err);
//           }
//           res.send(`fpViewer/index3_${fileName}.html`)
//         })
//       })
//     })
//   } else {
//     console.log(dir, 'exists')
//     res.send(`fpViewer/index3_${fileName}.html`)
//   }
// });

// app.post('/fp-viewer-set-lcc', (req, res) => {
//   const fileName = req.body.filename;
//   const graphName = req.body.graphName;
//   const layer = req.body.layer;
//   const lcc = req.body.lcc;
//   const dir = `${__dirname}/wave-decomposition/${fileName}`
//   console.log(dir);
//   console.log(graphName)
//   console.log(layer)
//   console.log(lcc)
//   console.log(dir)
//   // const buffer = Buffer.from(edges);
//   // addon.union(buffer, buffer.length);
//   if (!fs.existsSync(dir)) {
//     fs.mkdirSync(dir)
//     exec(`cd wave-decomposition; python3 scripts/fpViewer/extractLcc.py ${graphName} ${layer} ${lcc} ${fileName}`, (err, stdout, stderr) => {
//       if (err) {
//         return console.log(err);
//       }
//       exec(`cd wave-decomposition; make GRAPH=${fileName} PARENT=${dataset} fpViewer`, (err, stdout, stderr) => {
//         if (err) {
//           return console.log(err);
//         }
//         // console.log(stdout);
//         exec(`cd fpViewer; make GRAPH=${fileName} retrive`, (err, stdout, stderr) => {
//           if (err) {
//             return console.log(err);
//           }
//           res.send(`fpViewer/index3_${fileName}.html`)
//         })
//       })
//     })
//     // fs.writeFile(`${dir}/${fileName}.txt`, edges.map(d => `${d.source}\t${d.target}`).join('\n'), function (err, data) {
//     //   if (err) {
//     //     return console.log(err);
//     //   }
//     //   fs.writeFile(`${dir}/${fileName}_names.csv`, labels.slice(1).map(d => `"${d.source}","${d.target}"`).join('\n'), function (err, data) {
//     //     if (err) {
//     //       return console.log(err);
//     //     }
//     //   })
//     //   exec(`cd wave-decomposition; make GRAPH=${fileName} PARENT=${dataset} fpViewer`, (err, stdout, stderr) => {
//     //     if (err) {
//     //       return console.log(err);
//     //     }
//     //     // console.log(stdout);
//     //     exec(`cd fpViewer; make GRAPH=${fileName} retrive`, (err, stdout, stderr) => {
//     //       if (err) {
//     //         return console.log(err);
//     //       }
//     //       res.send(`fpViewer/index3_${fileName}.html`)
//     //     })
//     //   })
//     // })
//   } else {
//     console.log(dir, 'exists')
//     res.send(`fpViewer/index3_${fileName}.html`)
//   }
// });

app.post('/best-cache', (req, res) => {
  const dataset = req.body.graphName;
  const cacheName = `${dataset}-bestbuilding-cache`;
  if (!cache.has(cacheName, {updateAgeOnHas: true})) {
    cacheBestBuilding(dataset);
    res.send(JSON.stringify({res: false, detail: 'no cache'}));
  } else {
    const cachedData = cache.get(cacheName);
    if (cachedData.processingFlag) {
      res.send(JSON.stringify({res: false, detail: 'processing'}));
    } else {
      res.send(JSON.stringify({res: true, detail: 'processed'}));
    }
  }
})

app.post('/meta-dag-wave-mini', (req, res) => {

  // console.log(req.body.suffix);
  const filename = req.body.filename;
  const dataset = req.body.graphName;
  const layer = req.body.layer;
  const lcc = req.body.lcc;
  const bucket = req.body.bucket;
  const maxEdge = req.body.maxEdges;
  const buildingName = req.body.buildingName;
  console.log(filename, dataset, layer, bucket, maxEdge);

  const retInfo = {
    filename: filename, 
    dataset: dataset, 
    layer: layer, 
    lcc: lcc,
    bucket: bucket,
    buildingName: buildingName
  }

  const dagFilePrefix = `${__dirname}/${filename}`;
  // const dagInfoFileName = `${dagFilePrefix}-info.json`;
  // const waveDir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;
  // const waveFileName = `layer-${layer}-waves-buck${bucket}.csv`;
  // const node2edgeListCacheName = `${dataset}/${waveFileName}:node2edgeList`;

  // // prepare wave mini map
  const waveLinkFile = `${dagFilePrefix}.wf.wave.link`;
  const waveNodeFile = `${dagFilePrefix}.wf.wave.node`;
  // // cache wave
  const cacheName = `${dataset}/${filename}.dag.wave`;
  const retName = 'wf.wave.mini';
  if (!cache.has(cacheName, {updateAgeOnHas: true})) {
    // // not in the cache
    const processPromise = readWaveNodeLinkStream(cacheName, waveNodeFile, waveLinkFile);
    processPromise.then(() => {
      const cachedData = cache.get(cacheName);
      res.send(JSON.stringify([cachedData.data, retInfo, retName]));
    })
  } else {
    // // in the cache
    const cachedData = cache.get(cacheName);
    if (cachedData.processingFlag) {
      // // still processing
      console.log('W: still processing data in /meta-dag');
      cachedData.processPromise.then(() => {
        const updatedCachedData = cache.get(cacheName);
        res.send(JSON.stringify([updatedCachedData.data, retInfo, retName]));
      })
    } else {
      // // processed
      res.send(JSON.stringify([cachedData.data, retInfo, retName]));
    }
  }
})

app.post('/meta-dag', (req, res) => {
  // console.log(req.body.suffix);
  const filename = req.body.filename;
  const dataset = req.body.graphName;
  const layer = req.body.layer;
  const lcc = req.body.lcc;
  const bucket = req.body.bucket;
  const maxEdge = req.body.maxEdges;
  const buildingName = req.body.buildingName;
  const smallBuilding = req.body.smallBuilding;
  console.log(filename, dataset, layer, bucket, maxEdge);

  const retInfo = {
    filename: filename, 
    dataset: dataset, 
    layer: layer, 
    lcc: lcc,
    bucket: bucket,
    buildingName: buildingName,
    smallBuilding: smallBuilding,
  }

  const dagFilePrefix = `${__dirname}/${filename}`;
  const dagInfoFileName = `${dagFilePrefix}-info.json`;
  const dagSpanInfoFileName = `${dagFilePrefix}.span-info.json`;
  const waveDir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;
  const waveFileName = `layer-${layer}-waves-buck${bucket}.csv`;
  const node2edgeListCacheName = `${dataset}/${waveFileName}:node2edgeList`;
  Promise.all([
    fs.promises.readFile(dagInfoFileName, 'utf8'),
    fs.promises.readFile(dagSpanInfoFileName, 'utf8')
  ]).then(datas => {
    const dagInfoFile = datas[0];
    const dagSpanInfoFile = datas[1];
    const dagInfo = JSON.parse(dagInfoFile);
    const dagSpanInfo = JSON.parse(dagSpanInfoFile);
    const rawEdgeCnt = dagInfo['edges'];
    if (dagInfo['linkNum'] < TH_DAG) {

      const wccLinkFile = `${dagFilePrefix}.wcc.link`;
      const wccNodeFile = `${dagFilePrefix}.wcc.node`;
      const retName = 'wcc'

      const wccCacheName = `${dataset}/${filename}.dag.wcc`;
      if (!cache.has(wccCacheName, {updateAgeOnHas: true})) {
        // // not in the cache
        const processPromise = readWccNodeLinkStream(wccCacheName, wccNodeFile, wccLinkFile);
        processPromise.then(() => {
          const cachedData = cache.get(wccCacheName);
          res.send(JSON.stringify([cachedData.data, retInfo, retName]));
        })
      } else {
        // // in the cache
        const cachedData = cache.get(wccCacheName);
        if (cachedData.processingFlag) {
          // // still processing
          console.log('W: still processing data in /meta-dag');
          cachedData.processPromise.then(() => {
            const updatedCachedData = cache.get(wccCacheName);
            res.send(JSON.stringify([updatedCachedData.data, retInfo, retName]));
          })
        } else {
          // // processed
          res.send(JSON.stringify([cachedData.data, retInfo, retName]));
        }
      }

      // // process dag: compressed => dag
      // const dagLinkFile = `${dagFilePrefix}.link`;
      const dagLinkFile = `${dagFilePrefix}.span.link`;
      const dagNodeFile = `${dagFilePrefix}.node`;
      const dagJumpLinkFile = `${dagFilePrefix}.span.link.jump`;
      const metaVMapFile = `${dagFilePrefix}.wcc.vmap`;
      const dagCacheName = `${dataset}/${filename}.dag`;
      if (!cache.has(dagCacheName, {updateAgeOnHas: true})) {
        // // not in the cache
        readDagNodeLinkByWccStream(dagCacheName, dagNodeFile, dagLinkFile, dagJumpLinkFile, metaVMapFile);
      }

      // // // pass the whole dag
      // // const dagLinkFile = `${dagFilePrefix}.link`;
      // const dagLinkFile = `${dagFilePrefix}.span.link`;
      // const dagNodeFile = `${dagFilePrefix}.node`;
      // // const dagJumpLinkFile = `${dagFilePrefix}.link.jump`;
      // const dagJumpLinkFile = `${dagFilePrefix}.span.link.jump`;
      // const cacheName = `${dataset}/${filename}.dag`;
      // const retName = 'dag.full';
      // if (!cache.has(cacheName, {updateAgeOnHas: true})) {
      //   // // not in the cache
      //   const processPromise = readDagNodeLinkStream(cacheName, dagNodeFile, dagLinkFile, dagJumpLinkFile);
      //   processPromise.then(() => {
      //     const cachedData = cache.get(cacheName);
      //     res.send(JSON.stringify([cachedData.data, retInfo, retName]));
      //   })
      // } else {
      //   // // in the cache
      //   const cachedData = cache.get(cacheName);
      //   const processPromise = cachedData.processPromise;
      //   if (cachedData.processingFlag) {
      //     // // still processing
      //     console.log('W: still processing data in /meta-dag');
      //     processPromise.then(() => {
      //       const updatedCachedData = cache.get(cacheName);
      //       res.send(JSON.stringify([updatedCachedData.data, retInfo, retName]));
      //     })
      //   } else {
      //     // // processed
      //     res.send(JSON.stringify([cachedData.data, retInfo, retName]));
      //   }
      // }

      // // process raw edge
      if (!cache.has(node2edgeListCacheName, {updateAgeOnHas: true})) {
        readWaveAndVMapStream(filename, waveFileName, waveDir, dataset);
      }
    } else if (dagSpanInfo['spanNum'] < TH_DAG) {

      const wccLinkFile = `${dagFilePrefix}.wcc.link`;
      const wccNodeFile = `${dagFilePrefix}.wcc.node`;
      const retName = 'wcc'

      const wccCacheName = `${dataset}/${filename}.dag.wcc`;
      if (!cache.has(wccCacheName, {updateAgeOnHas: true})) {
        // // not in the cache
        const processPromise = readWccNodeLinkStream(wccCacheName, wccNodeFile, wccLinkFile);
        processPromise.then(() => {
          const cachedData = cache.get(wccCacheName);
          res.send(JSON.stringify([cachedData.data, retInfo, retName]));
        })
      } else {
        // // in the cache
        const cachedData = cache.get(wccCacheName);
        if (cachedData.processingFlag) {
          // // still processing
          console.log('W: still processing data in /meta-dag');
          cachedData.processPromise.then(() => {
            const updatedCachedData = cache.get(wccCacheName);
            res.send(JSON.stringify([updatedCachedData.data, retInfo, retName]));
          })
        } else {
          // // processed
          res.send(JSON.stringify([cachedData.data, retInfo, retName]));
        }
      }

      // // process dag: compressed => dag
      // const dagLinkFile = `${dagFilePrefix}.link`;
      const dagLinkFile = `${dagFilePrefix}.span.link`;
      const dagNodeFile = `${dagFilePrefix}.node`;
      const dagJumpLinkFile = `${dagFilePrefix}.span.link.jump`;
      const metaVMapFile = `${dagFilePrefix}.wcc.vmap`;
      const dagCacheName = `${dataset}/${filename}.dag`;
      if (!cache.has(dagCacheName, {updateAgeOnHas: true})) {
        // // not in the cache
        readDagNodeLinkByWccStream(dagCacheName, dagNodeFile, dagLinkFile, dagJumpLinkFile, metaVMapFile);
      }

      // // // pass the span dag
      // // const dagLinkFile = `${dagFilePrefix}.link`;
      // const dagLinkFile = `${dagFilePrefix}.span.link`;
      // const dagNodeFile = `${dagFilePrefix}.node`;
      // const cacheName = `${dataset}/${filename}.dag`;
      // const retName = 'dag.span'
      // if (!cache.has(cacheName, {updateAgeOnHas: true})) {
      //   // // not in the cache
      //   const processPromise = readDagNodeLinkStream(cacheName, dagNodeFile, dagLinkFile, null);
      //   processPromise.then(() => {
      //     const cachedData = cache.get(cacheName);
      //     res.send(JSON.stringify([cachedData.data, retInfo, retName]));
      //   })
      // } else {
      //   // // in the cache
      //   const cachedData = cache.get(cacheName);
      //   const processPromise = cachedData.processPromise;
      //   if (cachedData.processingFlag) {
      //     // // still processing
      //     console.log('W: still processing data in /meta-dag');
      //     processPromise.then(() => {
      //       const updatedCachedData = cache.get(cacheName);
      //       res.send(JSON.stringify([updatedCachedData.data, retInfo, retName]));
      //     })
      //   } else {
      //     // // processed
      //     res.send(JSON.stringify([cachedData.data, retInfo, retName]));
      //   }
      // }

      // // process raw edge
      if (!cache.has(node2edgeListCacheName, {updateAgeOnHas: true})) {
        readWaveAndVMapStream(filename, waveFileName, waveDir, dataset);
      }
    } else {
      // // extra level
      // // check edgeCut compression size
      const cutCompressionInfoFileName = `${dagFilePrefix}.edgeCut-info.json`
      Promise.all([
        fs.promises.readFile(cutCompressionInfoFileName, 'utf8')
      ]).then(datas => {
        const cutCompressionInfoFile = datas[0];
        const cutCompressionInfo = JSON.parse(cutCompressionInfoFile);
        const retName = 'edgeCut'
        if (cutCompressionInfo['output-links'] < TH_DAG) {
          // // edgeCut is small, use edgeCut
          const compressedLinkFile = `${dagFilePrefix}.edgeCut.link`;
          const compressedNodeFile = `${dagFilePrefix}.edgeCut.node`;
          const cacheName = `${dataset}/${filename}.dag.edgeCut`;
          if (!cache.has(cacheName, {updateAgeOnHas: true})) {
            // // not in the cache
            const processPromise = readEdgeCutNodeLinkStream(cacheName, compressedNodeFile, compressedLinkFile);
            processPromise.then(() => {
              const cachedData = cache.get(cacheName);
              res.send(JSON.stringify([cachedData.data, retInfo, retName]));
            })
          } else {
            // // in the cache
            const cachedData = cache.get(cacheName);
            if (cachedData.processingFlag) {
              // // still processing
              console.log('W: still processing data in /meta-dag');
              cachedData.processPromise.then(() => {
                const updatedCachedData = cache.get(cacheName);
                res.send(JSON.stringify([updatedCachedData.data, retInfo, retName]));
              })
            } else {
              // // processed
              res.send(JSON.stringify([cachedData.data, retInfo, retName]));
            }
          }

          // // process dag: compressed => dag
          // const dagLinkFile = `${dagFilePrefix}.link`;
          const dagLinkFile = `${dagFilePrefix}.span.link`;
          const dagNodeFile = `${dagFilePrefix}.node`;
          const dagJumpLinkFile = `${dagFilePrefix}.span.link.jump`;
          const metaVMapFile = `${dagFilePrefix}.edgeCut.vmap`;
          const dagCacheName = `${dataset}/${filename}.dag`;
          if (!cache.has(dagCacheName, {updateAgeOnHas: true})) {
            // // not in the cache
            readDagNodeLinkByMetaStream(dagCacheName, dagNodeFile, dagLinkFile, dagJumpLinkFile, metaVMapFile);
          }
          // // TODO!
          // // process raw edge
          if (!cache.has(node2edgeListCacheName, {updateAgeOnHas: true})) {
            readWaveAndVMapStream(filename, waveFileName, waveDir, dataset);
          }
        } else {
          // // use wave-frag version
          // const waveFragInfoFileName = `${dagFilePrefix}.wf.json`;
          const waveLinkFile = `${dagFilePrefix}.wf.wave.link`;
          const waveNodeFile = `${dagFilePrefix}.wf.wave.node`;
          // // cache wave
          const cacheName = `${dataset}/${filename}.dag.wave`;
          const retName = 'wf.wave';
          if (!cache.has(cacheName, {updateAgeOnHas: true})) {
            // // not in the cache
            const processPromise = readWaveNodeLinkStream(cacheName, waveNodeFile, waveLinkFile);
            processPromise.then(() => {
              const cachedData = cache.get(cacheName);
              res.send(JSON.stringify([cachedData.data, retInfo, retName]));
            })
          } else {
            // // in the cache
            const cachedData = cache.get(cacheName);
            if (cachedData.processingFlag) {
              // // still processing
              console.log('W: still processing data in /meta-dag');
              cachedData.processPromise.then(() => {
                const updatedCachedData = cache.get(cacheName);
                res.send(JSON.stringify([updatedCachedData.data, retInfo, retName]));
              })
            } else {
              // // processed
              res.send(JSON.stringify([cachedData.data, retInfo, retName]));
            }
          }
          // // cache frag
          const fragLinkFile = `${dagFilePrefix}.wf.frag.link`;
          const fragNodeFile = `${dagFilePrefix}.wf.frag.node`;
          const wave2fragInfoFile = `${dagFilePrefix}-info.json`;
          const fragCacheName = `${dataset}/${filename}.dag.frag`;
          if (!cache.has(fragCacheName, {updateAgeOnHas: true})) {
            // // not in the cache
            readFragNodeLinkStream(fragCacheName, fragNodeFile, fragLinkFile, wave2fragInfoFile);
          }
          // // cache raw dag
          // const dagLinkFile = `${dagFilePrefix}.link`;
          const dagLinkFile = `${dagFilePrefix}.span.link`;
          const dagNodeFile = `${dagFilePrefix}.node`;
          const dagCacheName = `${dataset}/${filename}.dag`;
          if (!cache.has(dagCacheName, {updateAgeOnHas: true})) {
            // // not in the cache
            readDagNodeLinkBySetStream(dagCacheName, dagNodeFile, dagLinkFile, null);
          }


          // // process raw edge
          const rawFragMapFileName = `${waveDir}/layer-${layer}-waves-buck${bucket}-fragMap.json`;
          if (rawEdgeCnt > TH_RAWSPLIT) {
            processRawFragMap(rawFragMapFileName)
          } else {
            cache.set(rawFragMapFileName, {
              processingFlag: false, 
              type: 'dagNodeLink.wf.fragMap.null', 
              size: 1,
              data: [{}, {}]
            });

            if (!cache.has(node2edgeListCacheName, {updateAgeOnHas: true})) {
              readWaveAndVMapStream(filename, waveFileName, waveDir, dataset, null, null, true);
            }
          }

          // Promise.all([
          //   fs.promises.readFile(waveNodeFile),
          //   fs.promises.readFile(waveLinkFile),
          //   fs.promises.readFile(fragNodeFile),
          //   fs.promises.readFile(fragLinkFile),
          // ]).then(wfDatas => {
          //   // // process to wf version
          // })
        }
      })
    }
  })

  // const dagFilePrefix = `${__dirname}/${filename}`;
  // const dagLinkFile = `${dagFilePrefix}.link`;
  // const dagNodeFile = `${dagFilePrefix}.node`;
  // // const dagVMapFile = `${dagFilePrefix}.vmap`;
  // exec(`wc -l ${dagLinkFile}`, (err, stdout, stderr) => {
  //   if (err) {
  //     return console.log(err);
  //   }
  //   console.log(stdout);
  //   const linkSize = parseInt(stdout.split(' ')[0]);
  //   Promise.all([
  //     fs.promises.readFile(dagNodeFile, 'utf8'),
  //     fs.promises.readFile(dagLinkFile, 'utf8'),
  //   ]).then(datas => {
  //     // console.log(datas);
  //     res.send(JSON.stringify({
  //       nodes: datas[0], 
  //       links: datas[1], 
  //       info: {
  //         filename: filename, 
  //         dataset: dataset, 
  //         layer: layer, 
  //         lcc: lcc,
  //         bucket: bucket
  //       }
  //     }));
  //   })
  //   if (!cache.has(filename, {updateAgeOnHas: true})) {
  //     cacheVMap(filename);
  //   }
  // })

  // const dir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;

  // fs.readdir(dir, function (err, files) {
  //   if (err) {
  //     return console.log('Unable to scan directory: ' + err);
  //   }
  //   const file = `layer-${layer}-waves-buck${bucket}.csv`

  //   if (!cache.has(file, {updateAgeOnHas: true})) {
  //     cacheWave(file, dir, dataset);
  //   }
  // })
  // // fs.readFile(dagFile, function (err, data) {
  // //   if (err) {
  // //     return console.log('Unable to read file: ' + err);
  // //   }
  // //   let metaNode = JSON.parse(data);
  // //   if (!metaNode.hasOwnProperty('links')) {
  // //     metaNode.links = {};
  // //   }
  // //   const [nodes, links, info] = dagVerticalCompress(metaNode, maxEdge);
  // //   // console.log(nodes.length, links.length)
  // //   res.send(JSON.stringify({nodes: nodes, links: links, info: info}));
  // // })
  

  // // const dir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;
  // // console.log(dir)
  // // fs.readdir(dir, function (err, files) {
  // //   if (err) {
  // //     return console.log('Unable to scan directory: ' + err);
  // //   }

  // //   const file = `layer-${layer}-waves-buck-${bucket}.csv`
  // //   console.log(file);
  // //   const layerfile = `${dir}/${file}`;

  // // });
});

function processRawFragMap(rawFragMapFileName) {
  if (!fs.existsSync(rawFragMapFileName)) {
    cache.set(rawFragMapFileName, {
      processingFlag: false, 
      type: 'dagNodeLink.wf.fragMap.null', 
      size: 1,
      data: [{}, {}]
    });
    return new Promise(resolve => resolve(0));
  }
  const readPromise = Promise.all([
    fs.promises.readFile(rawFragMapFileName, 'utf8')
  ])
  
  const processPromise = readPromise.then(datas => {
    const rawFragMapFile = datas[0];
    const rawFragMap = JSON.parse(rawFragMapFile);

    const waveSingleDict = {};
    const set2wf = [];
    let mapLength = 0;
    let set = 1;
    for (const [wave, fragMap] of Object.entries(rawFragMap)) {
      const fragMapList = Object.values(fragMap)
      waveSingleDict[wave] = fragMapList.every(d => d[1] === 0)
      mapLength += fragMapList.length;
      for (let frag = 0; frag < fragMapList.length; frag ++) {
        set2wf[set] = [parseInt(wave), frag];
        set ++;
      }
    }

    cache.set(rawFragMapFileName, {
      processingFlag: false, 
      type: 'dagNodeLink.wf.fragMap', 
      size: mapLength,
      data: [waveSingleDict, rawFragMap, set2wf]
    });
  })
  return processPromise
}

async function csvParseStream(filename) {
  const promise = new Promise((resolve, reject) => {
    const parser = parse({
      delimiter: ',',
      columns: false,
    });
  
    // console.log('csvParseStream', filename)
    const retval = [];
    let retvalSize = 0;
    parser.on('error', function(err) {
      console.error(err.message);
      reject(err);
    })
    parser.on('readable', function() {
      let record;
      // console.log('readArray', filename)
      while((record = parser.read()) !== null ) {
        retval.push(record.map(d => parseInt(d)));
        retvalSize += record.length;
      }
    })
    parser.on('end', function() {
      resolve([retval, retvalSize]);
    })
  
    fs.createReadStream(filename)
      .on('error', function(err){
        console.error(err.message);
        reject(err);
      })
      .pipe(parser)
  })
  return promise;
}

async function csvParseStreamAsSimpleObj(filename, keyFunc, valFunc, sizeFunc, parseIntFlag = true) {
  if (sizeFunc == null || sizeFunc == undefined) {
    sizeFunc = d => d.length;
  }
  const promise = new Promise((resolve, reject) => {
    const parser = parse({
      delimiter: ',',
      columns: false,
    });
  
    // console.log('csvParseStreamAsSimpleObj', filename)
    const retval = {};
    let retvalSize = 0;
    parser.on('error', function(err) {
      console.error(err.message);
      reject(err);
    })
    parser.on('readable', function() {
      let record;
      // console.log('readSimple', filename)
      while((record = parser.read()) !== null ) {
        let parsedRecord;
        if (parseIntFlag) {
          parsedRecord = record.map(d => parseInt(d));
        } else {
          parsedRecord = record;
        }
        retval[keyFunc(parsedRecord)] = valFunc(parsedRecord);
        retvalSize += sizeFunc(record);
      }
    })
    parser.on('end', function() {
      resolve([retval, retvalSize]);
    })
  
    fs.createReadStream(filename)
      .on('error', function(err){
        console.error(err.message);
        reject(err);
      })
      .pipe(parser)
  })
  return promise;
}

async function csvParseStreamAsArrayObj(filename, keyFunc, valFunc, filterFunc, sizeFunc) {
  console.log(filename)
  if (filterFunc == null || filterFunc == undefined) {
    filterFunc = () => true;
  }
  if (sizeFunc == null || sizeFunc == undefined) {
    sizeFunc = d => d.length;
  }
  // console.log(keyFunc, valFunc, filterFunc)
  // console.log(keyFunc([111057309,2,3,4,5]), valFunc([111057309,2,3,4,5]), filterFunc([111057309,2,3,4,5]))
  // console.log('csvParseStreamAsArrayObj', filename)
  const promise = new Promise((resolve, reject) => {
    const parser = parse({
      delimiter: ',',
      columns: false,
    });
  
    const retval = {};
    let retvalSize = 0;
    parser.on('error', function(err) {
      console.error(err.message);
      reject(err);
    })
    parser.on('readable', function() {
      let record;
      // console.log('readArrayObj', filename)
      while((record = parser.read()) !== null ) {
        const parsedRecord = record.map(d => parseInt(d));
        if (!filterFunc(record)) {
          continue;
        }
        const recordKey = keyFunc(parsedRecord);
        if (!retval.hasOwnProperty(recordKey)) {
          retval[recordKey] = [];
        }
        retval[recordKey].push(valFunc(parsedRecord));
        retvalSize += sizeFunc(record);
      }
    })
    parser.on('end', function() {
      console.log('resolve', filename)
      resolve([retval, retvalSize]);
    })
    // parser.on('pipe', function() {
    //   console.log('pipe', filename)
    // })
  
    fs.createReadStream(filename)
      .on('error', function(err){
        console.error(err.message);
        reject(err);
      })
      .pipe(parser)
  })
  return promise;
}

async function csvParseStreamAsArrayObjWithComplexKey(filename, keysFunc, valFunc, keyKeyFunc, filterFunc, sizeFunc) {
  console.log(filename)
  if (filterFunc == null || filterFunc == undefined) {
    filterFunc = () => true;
  }
  if (sizeFunc == null || sizeFunc == undefined) {
    sizeFunc = d => d.length;
  }
  // console.log(keyFunc, valFunc, filterFunc)
  // console.log(keyFunc([111057309,2,3,4,5]), valFunc([111057309,2,3,4,5]), filterFunc([111057309,2,3,4,5]))
  // console.log('csvParseStreamAsArrayObj', filename)
  const promise = new Promise((resolve, reject) => {
    const parser = parse({
      delimiter: ',',
      columns: false,
    });
  
    const retval = {};
    let retvalSize = 0;
    parser.on('error', function(err) {
      console.error(err.message);
      reject(err);
    })
    parser.on('readable', function() {
      let record;
      // console.log('readArrayObj', filename)
      while((record = parser.read()) !== null ) {
        const parsedRecord = record.map(d => parseInt(d));
        // if (!filterFunc(record)) {
        //   continue;
        // }
        // console.log(parsedRecord)
        const recordKeys = keysFunc(parsedRecord);
        if (recordKeys[0] == null || recordKeys[1] == null) {
          continue;
        }
        // console.log('rec', recordKeys);
        const filterRes = filterFunc(parsedRecord);
        // console.log('flt', filterRes);
        const keyCandi0 = keyKeyFunc(recordKeys[0]);
        // console.log('key0', keyCandi0)
        const keyCandi1 = keyKeyFunc(recordKeys[1]);
        // console.log('key1', keyCandi1)
        let recordKey;
        if (keyCandi0.every((elem, idx) => elem === filterRes[idx])) {
          recordKey = recordKeys[0];
        } else if (keyCandi1.every((elem, idx) => elem === filterRes[idx])) {
          recordKey = recordKeys[1];
        } else {
          continue;
        }
        if (!retval.hasOwnProperty(recordKey)) {
          retval[recordKey] = [];
        }
        retval[recordKey].push(valFunc(parsedRecord));
        retvalSize += sizeFunc(record);
      }
    })
    parser.on('end', function() {
      console.log('resolve', filename)
      resolve([retval, retvalSize]);
    })
    // parser.on('pipe', function() {
    //   console.log('pipe', filename)
    // })
  
    fs.createReadStream(filename)
      .on('error', function(err){
        console.error(err.message);
        reject(err);
      })
      .pipe(parser)
  })
  return promise;
}

async function csvParseStreamAsSimpleObjAndArrayObj(filename, simpleKeyFunc, simpleValFunc, arrayKeyFunc, arrayValFunc, sizeFunc) {
  if (sizeFunc == null || sizeFunc == undefined) {
    sizeFunc = d => d.length;
  }

  const promise = new Promise((resolve, reject) => {
    const parser = parse({
      delimiter: ',',
      columns: false,
    });
  
    const simpleRetval = {};
    const arrayRetval = {};
    let retvalSize = 0;
    parser.on('error', function(err) {
      console.error(err.message);
      reject(err);
    })
    parser.on('readable', function() {
      let record;
      while((record = parser.read()) !== null ) {
        const parsedRecord = record.map(d => parseInt(d));
        simpleRetval[simpleKeyFunc(parsedRecord)] = simpleValFunc(parsedRecord);
        const recordKey = arrayKeyFunc(parsedRecord);
        if (!arrayRetval.hasOwnProperty(recordKey)) {
          arrayRetval[recordKey] = [];
        }
        arrayRetval[recordKey].push(arrayValFunc(parsedRecord));
        retvalSize += sizeFunc(record);
      }
    })
    parser.on('end', function() {
      resolve([[simpleRetval, arrayRetval], retvalSize]);
    })
  
    fs.createReadStream(filename)
      .on('error', function(err){
        console.error(err.message);
        reject(err);
      })
      .pipe(parser)
  })
  return promise;
}

function readDagNodeLinkStream(filename, nodeFile, linkFile, jumpLinkFile) {
  const processPromise = cacheDagNodeLinkStream(filename, nodeFile, linkFile, jumpLinkFile);
  cache.set(filename, {processingFlag: true, processPromise: processPromise, type: 'dagNodeLink', size: 1, data: undefined});
  return processPromise;
}

function cacheDagNodeLinkStream(filename, nodeFile, linkFile, jumpLinkFile) {
  const nodePromise = csvParseStream(nodeFile);
  const linkPromise = csvParseStream(linkFile);
  let jumpLinkPromise;
  const allPromises = [nodePromise, linkPromise];
  if (jumpLinkFile == null || jumpLinkFile == undefined) {
    // // no jump edges, skip
  } else {
    jumpLinkPromise = csvParseStream(jumpLinkFile);
    allPromises.push(jumpLinkPromise)
  }
  const processPromise = Promise.all(allPromises);

  processPromise.then(datas => {
    const [nodeArray, nodeArrayLength] = datas[0];
    const [linkArray, linkArrayLength] = datas[1];
    let jumpLinkArray;
    let jumpLinkArrayLength;
    if (datas.length === 2) {
      // // no jump edge, skip
      jumpLinkArray = [];
      jumpLinkArrayLength = 0;
    } else {
      [jumpLinkArray, jumpLinkArrayLength] = datas[2];
    }

    cache.set(filename, {
      processingFlag: false, 
      type: 'dagNodeLink', 
      size: nodeArrayLength + linkArrayLength + jumpLinkArrayLength,
      data: [nodeArray, linkArray, jumpLinkArray]
    });
  })
  return processPromise;
}

// function readDagNodeLink(filename, nodeFile, linkFile, jumpLinkFile) {
//   let readPromise;
//   if (jumpLinkFile == null || jumpLinkFile == undefined) {
//     readPromise = Promise.all([
//       fs.promises.readFile(nodeFile, 'utf8'),
//       fs.promises.readFile(linkFile, 'utf8'),
//     ])
//   } else {
//     readPromise = Promise.all([
//       fs.promises.readFile(nodeFile, 'utf8'),
//       fs.promises.readFile(linkFile, 'utf8'),
//       fs.promises.readFile(jumpLinkFile, 'utf8'),
//     ])
//   }
//   const processPromise = readPromise.then(data => {
//     // console.log(data.length);
//     if (data.length == 2) {
//       cacheDagNodeLink(filename, data[0], data[1], null);
//     } else if (data.length == 3) {
//       cacheDagNodeLink(filename, data[0], data[1], data[2]);
//     } else {
//       console.log('E: wrong size in readDagNodeLink')
//     }
//   })
//   cache.set(filename, {processingFlag: true, processPromise: processPromise, type: 'dagNodeLink', size: 1, data: undefined});
//   return processPromise;
// }

// function cacheDagNodeLink(filename, nodeFile, linkFile, jumpLinkFile) {
//   const nodeArray = [];
//   const linkArray = [];
//   const jumpLinkArray = [];
//   // console.log(nodeFile)
//   for (const [v, wave, frag, set, vSize, eSize] of d3.csvParseRows(nodeFile, d3.autoType)) {
//     nodeArray.push([v, wave, frag, set, vSize, eSize]);
//     // console.log(v);
//   }
//   // console.log('node done')
//   for (const [src, tgt, eSize] of d3.csvParseRows(linkFile, d3.autoType)) {
//     linkArray.push([src, tgt, eSize]);
//     // console.log(src, tgt)
//   }
//   // console.log('link done')
//   if (jumpLinkFile == null || jumpLinkFile == undefined) {
//     // // no jump edges, skip
//   } else {
//     for (const [src, tgt, eSize] of d3.csvParseRows(jumpLinkFile, d3.autoType)) {
//       jumpLinkArray.push([src, tgt, eSize]);
//       // console.log(src, tgt)
//     }
//   }
//   // console.log('jump link done')
//   cache.set(filename, {
//     processingFlag: false, 
//     type: 'dagNodeLink', 
//     size: nodeArray.length * nodeArray[0].length + linkArray.length * linkArray[0].length + jumpLinkArray.length === 0 ? 0 : jumpLinkArray.length * jumpLinkArray[0].length,
//     data: [nodeArray, linkArray, jumpLinkArray]
//   });
// }

function readDagNodeLinkByMetaStream(filename, nodeFile, linkFile, jumpLinkFile, metaVMapFile) {
  const processPromise = cacheDagNodeLinkByMetaStream(filename, nodeFile, linkFile, jumpLinkFile, metaVMapFile);
  cache.set(filename, {processingFlag: true, processPromise: processPromise, type: 'dagNodeLink.edgeCut.dag', size: 1, data: undefined});
  return processPromise;
}

function cacheDagNodeLinkByMetaStream(filename, nodeFile, linkFile, jumpLinkFile, metaVMapFile) {
  const metaVMapPromise = csvParseStreamAsSimpleObj(metaVMapFile, d => d[1], d => d[0]);


  const nodePromise = metaVMapPromise.then(v2metaData => {
    const v2meta = v2metaData[0];
    // console.log(v2meta)
    return csvParseStreamAsArrayObj(nodeFile, d => v2meta[d[0]], d => d)
  });
  const linkPromise = metaVMapPromise.then(v2metaData => {
    const v2meta = v2metaData[0];
    return csvParseStreamAsArrayObj(linkFile, d => v2meta[d[0]], d => d, d => v2meta[d[0]] === v2meta[d[1]])
  });
  let jumpLinkPromise;
  const allPromises = [nodePromise, linkPromise];
  if (jumpLinkFile == null || jumpLinkFile == undefined) {
    // // no jump edges, skip
  } else {
    jumpLinkPromise = metaVMapPromise.then(v2metaData => {
      const v2meta = v2metaData[0];
      return csvParseStreamAsArrayObj(jumpLinkFile, d => v2meta[d[0]], d => d, d => v2meta[d[0]] === v2meta[d[1]])
    });
    allPromises.push(jumpLinkPromise)
  }
  const processPromise = Promise.all(allPromises);

  processPromise.then(datas => {
    const [nodeArray, nodeArrayLength] = datas[0];
    const [linkArray, linkArrayLength] = datas[1];
    let jumpLinkArray;
    let jumpLinkArrayLength;
    if (datas.length === 2) {
      // // no jump edge, skip
      jumpLinkArray = {};
      jumpLinkArrayLength = 0;
    } else {
      [jumpLinkArray, jumpLinkArrayLength] = datas[2];
    }

    // console.log(nodeArray)

    cache.set(filename, {
      processingFlag: false, 
      type: 'dagNodeLink.edgeCut.dag', 
      size: nodeArrayLength + linkArrayLength + jumpLinkArrayLength,
      data: [nodeArray, linkArray, jumpLinkArray]
    });
  })
  return processPromise;
}


function readDagNodeLinkByWccStream(filename, nodeFile, linkFile, jumpLinkFile, metaVMapFile) {
  const processPromise = cacheDagNodeLinkByWccStream(filename, nodeFile, linkFile, jumpLinkFile, metaVMapFile);
  cache.set(filename, {processingFlag: true, processPromise: processPromise, type: 'dagNodeLink.wcc.dag', size: 1, data: undefined});
  return processPromise;
}

function cacheDagNodeLinkByWccStream(filename, nodeFile, linkFile, jumpLinkFile, metaVMapFile) {
  const metaVMapPromise = csvParseStreamAsSimpleObj(metaVMapFile, d => d[1], d => d[0]);


  const nodePromise = metaVMapPromise.then(v2metaData => {
    const v2meta = v2metaData[0];
    // console.log(v2meta)
    return csvParseStreamAsArrayObj(nodeFile, d => v2meta[d[0]], d => d)
  });
  const linkPromise = metaVMapPromise.then(v2metaData => {
    const v2meta = v2metaData[0];
    return csvParseStreamAsArrayObj(linkFile, d => v2meta[d[0]], d => d, d => v2meta[d[0]] === v2meta[d[1]])
  });
  let jumpLinkPromise;
  const allPromises = [nodePromise, linkPromise];
  if (jumpLinkFile == null || jumpLinkFile == undefined) {
    // // no jump edges, skip
  } else {
    jumpLinkPromise = metaVMapPromise.then(v2metaData => {
      const v2meta = v2metaData[0];
      return csvParseStreamAsArrayObj(jumpLinkFile, d => v2meta[d[0]], d => d, d => v2meta[d[0]] === v2meta[d[1]])
    });
    allPromises.push(jumpLinkPromise)
  }
  const processPromise = Promise.all(allPromises);

  processPromise.then(datas => {
    const [nodeArray, nodeArrayLength] = datas[0];
    const [linkArray, linkArrayLength] = datas[1];
    let jumpLinkArray;
    let jumpLinkArrayLength;
    if (datas.length === 2) {
      // // no jump edge, skip
      jumpLinkArray = {};
      jumpLinkArrayLength = 0;
    } else {
      [jumpLinkArray, jumpLinkArrayLength] = datas[2];
    }

    // console.log(nodeArray)

    cache.set(filename, {
      processingFlag: false, 
      type: 'dagNodeLink.wcc.dag', 
      size: nodeArrayLength + linkArrayLength + jumpLinkArrayLength,
      data: [nodeArray, linkArray, jumpLinkArray]
    });
  })
  return processPromise;
}

// function readDagNodeLinkByMeta(filename, nodeFile, linkFile, jumpLinkFile, metaVMapFile) {
//   let readPromise;
//   if (jumpLinkFile == null || jumpLinkFile == undefined) {
//     readPromise = Promise.all([
//       fs.promises.readFile(nodeFile, 'utf8'),
//       fs.promises.readFile(linkFile, 'utf8'),
//       fs.promises.readFile(metaVMapFile, 'utf8'),
//     ])
//   } else {
//     readPromise = Promise.all([
//       fs.promises.readFile(nodeFile, 'utf8'),
//       fs.promises.readFile(linkFile, 'utf8'),
//       fs.promises.readFile(jumpLinkFile, 'utf8'),
//       fs.promises.readFile(metaVMapFile, 'utf8'),
//     ])
//   }
//   const processPromise = readPromise.then(data => {
//     if (data.length == 3) {
//       cacheDagNodeLinkByMeta(filename, data[0], data[1], null, data[2]);
//     } else if (data.length == 4) {
//       cacheDagNodeLinkByMeta(filename, data[0], data[1], data[2], data[3]);
//     } else {
//       console.log('E: wrong size in readDagNodeLink')
//     }
//   })
//   cache.set(filename, {processingFlag: true, processPromise: processPromise, type: 'dagNodeLink.edgeCut.dag', data: undefined});
//   return processPromise;
// }

// function cacheDagNodeLinkByMeta(filename, nodeFile, linkFile, jumpLinkFile, metaVMapFile) {
//   const v2meta = {};
//   for (const [meta, v] of d3.csvParseRows(metaVMapFile, d3.autoType)) {
//     v2meta[v] = meta;
//   }

//   const meta2nodeArray = {};
//   const meta2linkArray = {};
//   const meta2jumpLinkArray = {};
//   for (const [v, wave, frag, set, vSize, eSize] of d3.csvParseRows(nodeFile, d3.autoType)) {
//     const meta = v2meta[v];
//     if (!meta2nodeArray.hasOwnProperty(meta)) {
//       meta2nodeArray[meta] = [];
//     }
//     meta2nodeArray[meta].push([v, wave, frag, set, vSize, eSize]);
//   }
//   for (const [src, tgt, eSize] of d3.csvParseRows(linkFile, d3.autoType)) {
//     const srcMeta = v2meta[src];
//     const tgtMeta = v2meta[tgt];
//     if (srcMeta !== tgtMeta) {
//       continue;
//     }
//     if (!meta2linkArray.hasOwnProperty(srcMeta)) {
//       meta2linkArray[srcMeta] = []
//     }
//     meta2linkArray[srcMeta].push([src, tgt, eSize])
//   }
//   if (jumpLinkFile == null || jumpLinkFile == undefined) {
//     // // no jump edges, skip
//   } else {
//     for (const [src, tgt, eSize] of d3.csvParseRows(jumpLinkFile, d3.autoType)) {
//       const srcMeta = v2meta[src];
//       const tgtMeta = v2meta[tgt];
//       if (srcMeta !== tgtMeta) {
//         continue;
//       }
//       if (!meta2linkArray.hasOwnProperty(srcMeta)) {
//         meta2linkArray[srcMeta] = []
//       }
//       meta2linkArray[srcMeta].push([src, tgt, eSize])
//     }
//   }
//   cache.set(filename, {processingFlag: false, type: 'dagNodeLink.edgeCut.dag', data: [meta2nodeArray, meta2linkArray, meta2jumpLinkArray]});
// }

function readDagNodeLinkBySetStream(filename, nodeFile, linkFile, jumpLinkFile) {
  console.log('readDagNodeLinkBySetStream', filename, nodeFile, linkFile, jumpLinkFile)
  const processPromise = cacheDagNodeLinkBySetStream(filename, nodeFile, linkFile, jumpLinkFile);
  cache.set(filename, {processingFlag: true, processPromise: processPromise, type: 'dagNodeLink.wf.dag', size: 1, data: undefined});
  return processPromise;
}

function cacheDagNodeLinkBySetStream(filename, nodeFile, linkFile, jumpLinkFile) {
  const nodePromise = csvParseStreamAsSimpleObjAndArrayObj(nodeFile, d => d[0], d => [d[1], d[3]], d => d[3], d => d)
  const linkPromise = nodePromise.then(nodeData => {
    const v2wf = nodeData[0][0];
    return csvParseStreamAsArrayObj(linkFile, d => v2wf[d[0]][1], d => d, d => {
        const srcWF = v2wf[d[0]];
        const tgtWF = v2wf[d[1]];
        return srcWF[0] === tgtWF[0] && srcWF[1] !== tgtWF[1]
      })
  });
  let jumpLinkPromise;
  const allPromises = [nodePromise, linkPromise];
  if (jumpLinkFile == null || jumpLinkFile == undefined) {
    // // no jump edges, skip
  } else {
    jumpLinkPromise = metaVMapPromise.then(nodeData => {
      const v2wf = nodeData[0][0];
      return csvParseStreamAsArrayObj(jumpLinkFile, d => v2wf[d[0]][1], d => d, d => {
        const srcWF = v2wf[d[0]];
        const tgtWF = v2wf[d[1]];
        return srcWF[0] === tgtWF[0] && srcWF[1] !== tgtWF[1]
      })
    });
    allPromises.push(jumpLinkPromise)
  }
  const processPromise = Promise.all(allPromises);

  processPromise.then(datas => {
    const [[v2wf, nodeArray], nodeArrayLength] = datas[0];
    const [linkArray, linkArrayLength] = datas[1];
    let jumpLinkArray;
    let jumpLinkArrayLength;
    if (datas.length === 2) {
      // // no jump edge, skip
      jumpLinkArray = {};
      jumpLinkArrayLength = 0;
    } else {
      [jumpLinkArray, jumpLinkArrayLength] = datas[2];
    }

    cache.set(filename, {
      processingFlag: false, 
      type: 'dagNodeLink.wf.dag', 
      size: nodeArrayLength + linkArrayLength + jumpLinkArrayLength,
      data: [nodeArray, linkArray, jumpLinkArray]
    });
  })
  return processPromise;
}

// function readDagNodeLinkBySet(filename, nodeFile, linkFile, jumpLinkFile) {
//   console.log('start reading', filename)
//   let readPromise;
//   if (jumpLinkFile == null || jumpLinkFile == undefined) {
//     readPromise = Promise.all([
//       fs.promises.readFile(nodeFile, 'utf8'),
//       fs.promises.readFile(linkFile, 'utf8'),
//     ])
//   } else {
//     readPromise = Promise.all([
//       fs.promises.readFile(nodeFile, 'utf8'),
//       fs.promises.readFile(linkFile, 'utf8'),
//       fs.promises.readFile(jumpLinkFile, 'utf8'),
//     ])
//   }
//   const processPromise = readPromise.then(data => {
//     console.log('finish reading', filename, data.length)
//     if (data.length == 2) {
//       cacheDagNodeLinkBySet(filename, data[0], data[1], null);
//     } else if (data.length == 3) {
//       cacheDagNodeLinkBySet(filename, data[0], data[1], data[2]);
//     } else {
//       console.log('E: wrong size in readDagNodeLink')
//     }
//   })
//   cache.set(filename, {processingFlag: true, processPromise: processPromise, type: 'dagNodeLink.wf.dag', data: undefined});
//   return processPromise;
// }

// function cacheDagNodeLinkBySet(filename, nodeFile, linkFile, jumpLinkFile) {
//   console.log('start processing', filename)
//   const set2nodeArray = {};
//   // const set2linkArray = {};
//   const set2spanLinkArray = {};
//   const set2jumpLinkArray = {};
//   const v2wf = {};
//   for (const [v, wave, frag, set, vSize, eSize] of d3.csvParseRows(nodeFile, d3.autoType)) {
//     if (!set2nodeArray.hasOwnProperty(set)) {
//       set2nodeArray[set] = [];
//     }
//     v2wf[v] = [wave, set];
//     set2nodeArray[set].push([v, wave, frag, set, vSize, eSize]);
//   }
//   console.log('node finish', filename)
//   let processedLinkNum = 0;
//   for (const [src, tgt, eSize] of d3.csvParseRows(linkFile, d3.autoType)) {
//     const [srcWave, srcSet] = v2wf[src];
//     const [tgtWave, tgtSet] = v2wf[tgt];
//     // console.log(srcWave, srcSet, tgtWave, tgtSet);
//     if (processedLinkNum % 100000 === 0) {
//       console.log('processed link num', processedLinkNum, Object.keys(set2spanLinkArray).length)
//     }
//     processedLinkNum ++;
//     if (srcWave !== tgtWave) {
//       continue;
//     }
//     if (srcSet === tgtSet) {
//       // // it should be empty
//       // if (!set2linkArray.hasOwnProperty(srcSet)) {
//       //   set2linkArray[srcSet] = []
//       // }
//       // set2linkArray[srcSet].push([src, tgt, eSize])
//     } else {
//       if (!set2spanLinkArray.hasOwnProperty(srcSet)) {
//         set2spanLinkArray[srcSet] = []
//       }
//       set2spanLinkArray[srcSet].push([src, tgt, eSize])
//     }
//   }
//   console.log('span link finish', filename);
//   if (jumpLinkFile == null || jumpLinkFile == undefined) {
//     // // no jump edges, skip
//   } else {
//     for (const [src, tgt, eSize] of d3.csvParseRows(jumpLinkFile, d3.autoType)) {
//       const [srcWave, srcSet] = v2wf[src];
//       const [tgtWave, tgtSet] = v2wf[tgt];
//       if (srcWave !== tgtWave) {
//         continue;
//       }
//       if (srcSet === tgtSet) {
//         console.log('E: induce in jump in cacheDagNodeLinkBySet')
//       } else {
//         if (!set2jumpLinkArray.hasOwnProperty(srcSet)) {
//           set2jumpLinkArray[srcSet] = []
//         }
//         set2jumpLinkArray[srcSet].push([src, tgt, eSize])
//       }
//     }
//   }
//   console.log('jump link finish', filename);
//   cache.set(filename, {processingFlag: false, type: 'dagNodeLink.wf.dag', data: [set2nodeArray, set2spanLinkArray, set2jumpLinkArray]});
// }

function readEdgeCutNodeLinkStream(filename, nodeFile, linkFile) {
  const processPromise = cacheEdgeCutNodeLinkStream(filename, nodeFile, linkFile)
  cache.set(filename, {processingFlag: true, processPromise: processPromise, type: 'dagNodeLink.edgeCut', size: 1, data: undefined});
  return processPromise;
}

function cacheEdgeCutNodeLinkStream(filename, nodeFile, linkFile) {
  const nodePromise = csvParseStream(nodeFile);
  const linkPromise = csvParseStream(linkFile);
  const allPromises = [nodePromise, linkPromise];
  const processPromise = Promise.all(allPromises);

  processPromise.then(datas => {
    const [nodeArray, nodeArrayLength] = datas[0];
    const [linkArray, linkArrayLength] = datas[1];

    cache.set(filename, {
      processingFlag: false, 
      type: 'dagNodeLink.edgeCut', 
      size: nodeArrayLength + linkArrayLength,
      data: [nodeArray, linkArray]
    });
  })
  return processPromise;
}

function readWccNodeLinkStream(filename, nodeFile, linkFile) {
  const processPromise = cacheWccNodeLinkStream(filename, nodeFile, linkFile)
  cache.set(filename, {processingFlag: true, processPromise: processPromise, type: 'dagNodeLink.wcc', size: 1, data: undefined});
  return processPromise;
}

function cacheWccNodeLinkStream(filename, nodeFile, linkFile) {
  const nodePromise = csvParseStream(nodeFile);
  const linkPromise = csvParseStream(linkFile);
  const allPromises = [nodePromise, linkPromise];
  const processPromise = Promise.all(allPromises);

  processPromise.then(datas => {
    const [nodeArray, nodeArrayLength] = datas[0];
    const [linkArray, linkArrayLength] = datas[1];

    cache.set(filename, {
      processingFlag: false, 
      type: 'dagNodeLink.wcc', 
      size: nodeArrayLength + linkArrayLength,
      data: [nodeArray, linkArray]
    });
  })
  return processPromise;
}

// function readEdgeCutNodeLink(filename, nodeFile, linkFile) {
//   const readPromise = Promise.all([
//     fs.promises.readFile(nodeFile, 'utf8'),
//     fs.promises.readFile(linkFile, 'utf8'),
//   ]);
//   const processPromise = readPromise.then(data => {
//     cacheEdgeCutNodeLink(filename, data[0], data[1]);
//   })
//   cache.set(filename, {processingFlag: true, processPromise: processPromise, type: 'dagNodeLink.edgeCut', data: undefined});
//   return processPromise;
// }

// function cacheEdgeCutNodeLink(filename, nodeFile, linkFile) {
//   const nodeArray = [];
//   const linkArray = [];
//   for (const [v, set, vSize, eSize, localVSize, localESize] of d3.csvParseRows(nodeFile, d3.autoType)) {
//     nodeArray.push([v, set, vSize, eSize, localVSize, localESize]);
//   }
//   for (const [src, tgt, eSize, localESize] of d3.csvParseRows(linkFile, d3.autoType)) {
//     linkArray.push([src, tgt, eSize, localESize]);
//   }
//   cache.set(filename, {processingFlag: false, type: 'dagNodeLink.edgeCut', data: [nodeArray, linkArray]});
// }

function readWaveNodeLinkStream(filename, nodeFile, linkFile) {
  const processPromise = cacheWaveNodeLinkStream(filename, nodeFile, linkFile)
  cache.set(filename, {processingFlag: true, processPromise: processPromise, type: 'dagNodeLink.wf.wave', size: 1, data: undefined});
  return processPromise;
}

function cacheWaveNodeLinkStream(filename, nodeFile, linkFile) {
  const nodePromise = csvParseStream(nodeFile);
  const linkPromise = csvParseStream(linkFile);
  const allPromises = [nodePromise, linkPromise];
  const processPromise = Promise.all(allPromises);

  processPromise.then(datas => {
    const [nodeArray, nodeArrayLength] = datas[0];
    const [linkArray, linkArrayLength] = datas[1];

    cache.set(filename, {
      processingFlag: false, 
      type: 'dagNodeLink.wf.wave', 
      size: nodeArrayLength + linkArrayLength,
      data: [nodeArray, linkArray]
    });
  })
  return processPromise;
}

// function readWaveNodeLink(filename, nodeFile, linkFile) {
//   const readPromise = Promise.all([
//     fs.promises.readFile(nodeFile, 'utf8'),
//     fs.promises.readFile(linkFile, 'utf8'),
//   ]);
//   const processPromise = readPromise.then(data => {
//     cacheWaveNodeLink(filename, data[0], data[1]);
//   })
//   cache.set(filename, {processingFlag: true, processPromise: processPromise, type: 'dagNodeLink.wf.wave', data: undefined});
//   return processPromise;
// }

// function cacheWaveNodeLink(filename, nodeFile, linkFile) {
//   const nodeArray = [];
//   const linkArray = [];
//   for (const [idx, vSize, eSize, localVSize, localESize] of d3.csvParseRows(nodeFile, d3.autoType)) {
//     nodeArray.push([idx, vSize, eSize, localVSize, localESize]);
//   }
//   for (const [src, tgt, eSize] of d3.csvParseRows(linkFile, d3.autoType)) {
//     linkArray.push([src, tgt, eSize]);
//   }
//   cache.set(filename, {processingFlag: false, type: 'dagNodeLink.wf.wave', data: [nodeArray, linkArray]});
// }

function readFragNodeLinkStream(filename, nodeFile, linkFile, wave2fragInfoFile) {
  const processPromise = cacheFragNodeLinkStream(filename, nodeFile, linkFile, wave2fragInfoFile);
  cache.set(filename, {processingFlag: true, processPromise: processPromise, type: 'dagNodeLink.wf.frag', size: 1, data: undefined});
  return processPromise;
}

function cacheFragNodeLinkStream(filename, nodeFile, linkFile, wave2fragInfoFile) {
  const set2wavePromise = fs.promises.readFile(wave2fragInfoFile, 'utf8').then(d => {
    const wave2frag = JSON.parse(d)['wave-frag-size']
    const set2wave = {}
    let tempSet = 1;
    for (let i = 0; i < wave2frag.length; i++) {
      const wave = i + 1;
      for (let j = 0; j < wave2frag[i]; j++) {
        set2wave[tempSet++] = wave;
      }
    }
    return set2wave;
  })


  const nodePromise = set2wavePromise.then(set2wave => {
    // console.log('set2wave', set2wave)
    return csvParseStreamAsArrayObj(nodeFile, d => set2wave[d[0]], d => d)
  });
  const linkPromise = set2wavePromise.then(set2wave => {
    return csvParseStreamAsArrayObj(linkFile, d => set2wave[d[0]], d => d, d => set2wave[d[0]] === set2wave[d[1]])
  });
  const allPromises = [nodePromise, linkPromise];
  const processPromise = Promise.all(allPromises);

  processPromise.then(datas => {
    // console.log('datas', datas)
    const [nodeArray, nodeArrayLength] = datas[0];
    const [linkArray, linkArrayLength] = datas[1];
    // let jumpLinkArray;
    // let jumpLinkArrayLength;
    // if (datas.length === 2) {
    //   // // no jump edge, skip
    //   jumpLinkArray = {};
    //   jumpLinkArrayLength = 0;
    // } else {
    //   [jumpLinkArray, jumpLinkArrayLength] = datas[2];
    // }

    cache.set(filename, {
      processingFlag: false, 
      type: 'dagNodeLink.wf.frag', 
      size: nodeArrayLength + linkArrayLength,
      data: [nodeArray, linkArray]
    });
  })
  return processPromise;
}

// function readFragNodeLink(filename, nodeFile, linkFile, wave2fragInfoFile) {
//   const readPromise = Promise.all([
//     fs.promises.readFile(nodeFile, 'utf8'),
//     fs.promises.readFile(linkFile, 'utf8'),
//     fs.promises.readFile(wave2fragInfoFile, 'utf8'),
//   ]);
//   const processPromise = readPromise.then(data => {
//     cacheFragNodeLink(filename, data[0], data[1], data[2]);
//   })
//   cache.set(filename, {processingFlag: true, processPromise: processPromise, type: 'dagNodeLink.wf.frag', data: undefined});
//   return processPromise;
// }

// function cacheFragNodeLink(filename, nodeFile, linkFile, wave2fragInfoFile) {
//   const wave2frag = JSON.parse(wave2fragInfoFile)['wave-frag-size'];
//   const set2wave = {};
//   let tempSet = 1;
//   for (let i = 0; i < wave2frag.length; i++) {
//     const wave = i + 1;
//     for (let j = 0; j < wave2frag[i]; j++) {
//       set2wave[tempSet++] = wave;
//     }
//   }

//   const wave2nodeArray = {};
//   const wave2linkArray = {};
//   for (const [idx, vSize, eSize, localVSize, localESize] of d3.csvParseRows(nodeFile, d3.autoType)) {
//     const wave = set2wave[idx];
//     if (!wave2nodeArray.hasOwnProperty(wave)) {
//       wave2nodeArray[wave] = [];
//     }
//     wave2nodeArray[wave].push([idx, vSize, eSize, localVSize, localESize]);
//   }
//   for (const [src, tgt, eSize] of d3.csvParseRows(linkFile, d3.autoType)) {
//     const srcWave = set2wave[src];
//     const tgtWave = set2wave[tgt];
//     if (srcWave !== tgtWave) {
//       continue;
//     }
//     if (!wave2linkArray.hasOwnProperty(srcWave)) {
//       wave2linkArray[srcWave] = [];
//     }
//     wave2linkArray[srcWave].push([src, tgt, eSize]);
//   }
//   cache.set(filename, {processingFlag: false, type: 'dagNodeLink.wf.frag', data: [wave2nodeArray, wave2linkArray]});
// }

/**
 * raw edges usage start here
 */

// function cacheVMap(filename) {
//   const readPromise = fs.promises.readFile(`${__dirname}/${filename}.vmap`, 'utf8');
//   const processPromise = readPromise.then(data => {
//     const vMap = {}
//     for (const [node, vert] of d3.csvParseRows(data, d3.autoType)) {
//       if (!vMap.hasOwnProperty(node)) {
//         vMap[node] = new Set();
//       }
//       vMap[node].add(vert);
//     }
//     // console.log(vMap);
//     cache.set(filename, {processingFlag: false, data: vMap});
//     return vMap;
//   })
//   cache.set(filename, {processingFlag: true, data: undefined});
// }

// function cacheWave(waveFileName, dir, dataset) {
//   const readPromise = fs.promises.readFile(`${dir}/${waveFileName}`, 'utf8');
//   const processPromise = readPromise.then(data => {
//     const edgeList = []
//     for (const [src, tgt, wave, wcc, frag] of d3.csvParseRows(data, d3.autoType)) {
//       edgeList.push([src, tgt]);
//     }
//     // console.log(edgeList);
//     cache.set(`${dataset}/${waveFileName}`, {processingFlag: false, data: edgeList});
//     return edgeList;
//   })
//   cache.set(`${dataset}/${waveFileName}`, {processingFlag: true, data: undefined});
// }


function readWaveAndVMapStream(filename, waveFileName, dir, dataset, wave, frag, addtouching = false) {
  console.log('wf', wave, frag)
  let cacheName = `${dataset}/${waveFileName}:node2edgeList`;
  if (wave == null || frag == null || wave == undefined || frag == undefined) {
    // nothing to do
  } else {
    cacheName += `-${wave}-${frag}`;
  } 
  const processPromise = cacheWaveAndVMapStream(filename, waveFileName, dir, dataset, wave, frag, addtouching);
  cache.set(cacheName, {processingFlag: true, processPromise: processPromise, type: 'node2edgeList', size: 1, data: undefined});
  return processPromise;
}

function cacheWaveAndVMapStream(filename, waveFileName, dir, dataset, wave, frag, addtouching = false) {
  let cacheName = `${dataset}/${waveFileName}:node2edgeList`;
  let suffix = ''
  let csvsuffix = '';
  if (wave == null || frag == null || wave == undefined || frag == undefined) {
    // nothing to do
  } else {
    suffix = `-${wave}-${frag}`;
    cacheName += suffix
    csvsuffix = `-wave-${wave}-frag-${frag}`
  }
  console.log(cacheName)
  if (addtouching) {
    const nodePromise = csvParseStreamAsSimpleObj(`${__dirname}/${filename}.node`, d => d[0], d => [d[1], d[2]], d => 1)
    const vmapPromise = csvParseStreamAsSimpleObjAndArrayObj(`${__dirname}/${filename}.vmap`, d => d[1], d => d[0], d => d[0], d => d[1], d => 1);
    const wavePromise = Promise.all([nodePromise, vmapPromise]).then(data => {
      const nodeData = data[0];
      const nodeWF = nodeData[0];
      const vmapData = data[1]
      const vmap = vmapData[0][0];
      // console.log(vmap)
      return csvParseStreamAsArrayObjWithComplexKey(`${dir}/${waveFileName.slice(0, -4)}${csvsuffix}.csv`, d => [vmap[d[0]], vmap[d[1]]], d => [d[0], d[1]], d => nodeWF[d], d => [d[2], d[4]], d => 2)
    })
    const allPromises = [vmapPromise, wavePromise]
    const processPromise = Promise.all(allPromises);

    processPromise.then(datas => {
      const [[v2nodeMap, node2vList], node2vListLength] = datas[0];
      const [node2edgeList, node2edgeListLength] = datas[1];

      cache.set(cacheName, {
        processingFlag: false,
        type: 'node2edgeList',
        size: node2edgeListLength + node2vListLength,
        data: [node2edgeList, node2vList]
      });
    })

    return processPromise
  } else {
    const vmapPromise = csvParseStreamAsSimpleObjAndArrayObj(`${__dirname}/${filename}.vmap`, d => d[1], d => d[0], d => d[0], d => d[1], d => 1);
    const wavePromise = vmapPromise.then(vmapData => {
      const vmap = vmapData[0][0];
      return csvParseStreamAsArrayObj(`${dir}/${waveFileName.slice(0, -4)}${csvsuffix}.csv`, d => vmap[d[0]], d => [d[0], d[1]], d => vmap[d[0]] === vmap[d[1]], d => 2)
    })
    const allPromises = [vmapPromise, wavePromise]
    const processPromise = Promise.all(allPromises);

    processPromise.then(datas => {
      const [[v2nodeMap, node2vList], node2vListLength] = datas[0];
      const [node2edgeList, node2edgeListLength] = datas[1];

      cache.set(cacheName, {
        processingFlag: false,
        type: 'node2edgeList',
        size: node2edgeListLength + node2vListLength,
        data: [node2edgeList, node2vList]
      });
    })

    return processPromise
  }
}

// function cacheWaveAndVMap(filename, waveFileName, dir, dataset) {
//   const readPromise = Promise.all([
//     fs.promises.readFile(`${__dirname}/${filename}.vmap`, 'utf8'),
//     fs.promises.readFile(`${dir}/${waveFileName}`, 'utf8')
//   ]);
//   const processPromise = readPromise.then(datas => {
//     const vmapFile = datas[0];
//     const waveFile = datas[1];
//     const node2edgeList = {};
//     const v2nodeMap = {};
//     const node2vList = {};
//     for (const [node, vert] of d3.csvParseRows(vmapFile, d3.autoType)) {
//       v2nodeMap[vert] = node;
//       if (!node2vList.hasOwnProperty(node)) {
//         node2vList[node] = []
//       }
//       node2vList[node].push(vert);
//     }
//     for (const [src, tgt, wave, wcc, frag] of d3.csvParseRows(waveFile, d3.autoType)) {
//       const srcNode = v2nodeMap[src];
//       const tgtNode = v2nodeMap[tgt];
//       if (srcNode !== tgtNode) {
//         continue;
//       }
//       if (!node2edgeList.hasOwnProperty(srcNode)) {
//         node2edgeList[srcNode] = [];
//       }
//       node2edgeList[srcNode].push([src, tgt]);
//     }
//     cache.set(`${dataset}/${waveFileName}:node2edgeList`, {processingFlag: false, type: 'node2edgeList', data: [node2edgeList, node2vList]});
//   })
//   cache.set(`${dataset}/${waveFileName}:node2edgeList`, {processingFlag: true, processPromise: processPromise, type: 'node2edgeList', data: undefined});
//   return processPromise
// }

app.post('/meta-dag-edgeCut', (req, res) => {
  // console.log(req.body.suffix);
  const filename = req.body.filename;
  const dataset = req.body.graphName;
  const layer = req.body.layer;
  const bucket = req.body.bucket;
  const metaNode = req.body.metaNode;
  const lcc = req.body.lcc;
  const buildingName = req.body.buildingName;
  console.log(filename, dataset, layer, bucket, metaNode);

  const retInfo = {
    filename: filename, 
    dataset: dataset, 
    layer: layer, 
    lcc: lcc,
    bucket: bucket,
    buildingName: buildingName
  }

  const dagFilePrefix = `${__dirname}/${filename}`;
  // const dagLinkFile = `${dagFilePrefix}.link`;
  const dagLinkFile = `${dagFilePrefix}.span.link`;
  const dagJumpLinkFile = `${dagFilePrefix}.span.link.jump`;
  const dagNodeFile = `${dagFilePrefix}.node`;
  const metaVMapFile = `${dagFilePrefix}.edgeCut.vmap`;
  const dagCacheName = `${dataset}/${filename}.dag`;
  const retName = 'edgeCut.dag'
  if (!cache.has(dagCacheName, {updateAgeOnHas: true})) {
    // // not in the cache
    const processPromise = readDagNodeLinkByMetaStream(dagCacheName, dagNodeFile, dagLinkFile, dagJumpLinkFile, metaVMapFile);
    processPromise.then(() => {
      const cachedData = cache.get(dagCacheName);
      const retData = [
        cachedData.data[0][metaNode], // node
        cachedData.data[1][metaNode], // link
        // cachedData.data[2][metaNode], // jumpLink
      ]
      res.send(JSON.stringify([retData, retInfo, retName]));
    })
  } else {
    // // in the cache
    const cachedData = cache.get(dagCacheName);
    if (cachedData.processingFlag) {
      // // still processing
      console.log('W: still processing data in /meta-dag-edgeCut');
      cachedData.processPromise.then(() => {
        const updatedCachedData = cache.get(dagCacheName);
        const retData = [
          updatedCachedData.data[0][metaNode], // node
          updatedCachedData.data[1][metaNode], // link
          // updatedCachedData.data[2][metaNode], // jumpLink
        ]
        res.send(JSON.stringify([retData, retInfo, retName]));
      })
    } else {
      // // processed
      const retData = [
        cachedData.data[0][metaNode], // node
        cachedData.data[1][metaNode], // link
        // cachedData.data[2][metaNode], // jumpLink
      ]
      res.send(JSON.stringify([retData, retInfo, retName]));
    }
  }
});


app.post('/meta-dag-wcc', (req, res) => {
  // console.log(req.body.suffix);
  const filename = req.body.filename;
  const dataset = req.body.graphName;
  const layer = req.body.layer;
  const bucket = req.body.bucket;
  const metaNode = req.body.metaNode;
  const lcc = req.body.lcc;
  const buildingName = req.body.buildingName;
  const requestFull = req.body.requestFull;
  console.log(filename, dataset, layer, bucket, metaNode, requestFull);

  const retInfo = {
    filename: filename, 
    dataset: dataset, 
    layer: layer, 
    lcc: lcc,
    bucket: bucket,
    buildingName: buildingName
  }

  const dagFilePrefix = `${__dirname}/${filename}`;
  // const dagLinkFile = `${dagFilePrefix}.link`;
  const dagLinkFile = `${dagFilePrefix}.span.link`;
  const dagJumpLinkFile = `${dagFilePrefix}.span.link.jump`;
  const dagNodeFile = `${dagFilePrefix}.node`;
  const metaVMapFile = `${dagFilePrefix}.wcc.vmap`;
  const dagCacheName = `${dataset}/${filename}.dag`;
  const retName = 'wcc.dag';
  if (!cache.has(dagCacheName, {updateAgeOnHas: true})) {
    // // not in the cache
    const processPromise = readDagNodeLinkByMetaStream(dagCacheName, dagNodeFile, dagLinkFile, dagJumpLinkFile, metaVMapFile);
    processPromise.then(() => {
      const cachedData = cache.get(dagCacheName);
      if (requestFull) {
        const retData = [
          cachedData.data[0][metaNode], // node
          cachedData.data[1][metaNode], // link
          cachedData.data[2][metaNode], // jumpLink
        ]
        res.send(JSON.stringify([retData, retInfo, retName + '.full']));
      } else {
        const retData = [
          cachedData.data[0][metaNode], // node
          cachedData.data[1][metaNode], // link
          // cachedData.data[2][metaNode], // jumpLink
        ]
        res.send(JSON.stringify([retData, retInfo, retName]));
      }
    })
  } else {
    // // in the cache
    const cachedData = cache.get(dagCacheName);
    if (cachedData.processingFlag) {
      // // still processing
      console.log('W: still processing data in /meta-dag-wcc');
      cachedData.processPromise.then(() => {
        const updatedCachedData = cache.get(dagCacheName);
        if (requestFull) {
          const retData = [
            updatedCachedData.data[0][metaNode], // node
            updatedCachedData.data[1][metaNode], // link
            updatedCachedData.data[2][metaNode], // jumpLink
          ]
          res.send(JSON.stringify([retData, retInfo, retName + '.full']));
        } else {
          const retData = [
            updatedCachedData.data[0][metaNode], // node
            updatedCachedData.data[1][metaNode], // link
            // updatedCachedData.data[2][metaNode], // jumpLink
          ]
          res.send(JSON.stringify([retData, retInfo, retName]));
        }
      })
    } else {
      // // processed
      if (requestFull) {
        const retData = [
          cachedData.data[0][metaNode], // node
          cachedData.data[1][metaNode], // link
          cachedData.data[2][metaNode], // jumpLink
        ]
        res.send(JSON.stringify([retData, retInfo, retName + '.full']));
      } else {
        const retData = [
          cachedData.data[0][metaNode], // node
          cachedData.data[1][metaNode], // link
          // cachedData.data[2][metaNode], // jumpLink
        ]
        res.send(JSON.stringify([retData, retInfo, retName]));
      }

    }
  }
});

app.post('/meta-dag-wf-frag', (req, res) => {
  // console.log(req.body.suffix);
  const filename = req.body.filename;
  const dataset = req.body.graphName;
  const layer = req.body.layer;
  const bucket = req.body.bucket;
  const metaNode = req.body.metaNode;
  const lcc = req.body.lcc;
  const buildingName = req.body.buildingName;
  console.log(filename, dataset, layer, bucket, metaNode);

  const retInfo = {
    filename: filename, 
    dataset: dataset, 
    layer: layer, 
    lcc: lcc,
    bucket: bucket,
    buildingName: buildingName
  }

  const dagFilePrefix = `${__dirname}/${filename}`;
  const fragLinkFile = `${dagFilePrefix}.wf.frag.link`;
  const fragNodeFile = `${dagFilePrefix}.wf.frag.node`;
  const wave2fragInfoFile = `${dagFilePrefix}-info.json`;
  const fragCacheName = `${dataset}/${filename}.dag.frag`;
  const retName = 'wf.frag';
  if (!cache.has(fragCacheName, {updateAgeOnHas: true})) {
    // // not in the cache
    console.log('not in the cache', fragCacheName)
    const processPromise = readFragNodeLinkStream(fragCacheName, fragNodeFile, fragLinkFile, wave2fragInfoFile);
    processPromise.then(() => {
      const cachedData = cache.get(fragCacheName);
      const retData = [
        cachedData.data[0][metaNode], // node
        cachedData.data[1][metaNode], // link
      ]
      res.send(JSON.stringify([retData, retInfo, retName]));
    })
  } else {
    // // in the cache
    console.log('in the cache', fragCacheName)
    const cachedData = cache.get(fragCacheName);
    if (cachedData.processingFlag) {
      // // still processing
      console.log('W: still processing data in /meta-dag-wf-frag');
      cachedData.processPromise.then(() => {
        const updatedCachedData = cache.get(fragCacheName);
        const retData = [
          updatedCachedData.data[0][metaNode], // node
          updatedCachedData.data[1][metaNode], // link
        ]
        res.send(JSON.stringify([retData, retInfo, retName]));
      })
    } else {
      console.log('processed', fragCacheName)
      // // processed
      const retData = [
        cachedData.data[0][metaNode], // node
        cachedData.data[1][metaNode], // link
      ]
      console.log('size length', cachedData.data[0][metaNode].length, cachedData.data[1][metaNode].length)
      res.send(JSON.stringify([retData, retInfo, retName]));
    }
  }

  console.log('cache raw dag')
  // // cache raw dag
  // const dagLinkFile = `${dagFilePrefix}.link`;
  const dagLinkFile = `${dagFilePrefix}.span.link`;
  const dagNodeFile = `${dagFilePrefix}.node`;
  const dagCacheName = `${dataset}/${filename}.dag`;
  if (!cache.has(dagCacheName, {updateAgeOnHas: true})) {
    // // not in the cache
    console.log('dag in cache', dagCacheName)
    readDagNodeLinkBySetStream(dagCacheName, dagNodeFile, dagLinkFile, null);
  }


  const dagInfoFileName = `${dagFilePrefix}-info.json`;
  const waveDir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;
  const waveFileName = `layer-${layer}-waves-buck${bucket}.csv`;
  const node2edgeListCacheName = `${dataset}/${waveFileName}:node2edgeList`;
  const rawFragMapFileName = `${waveDir}/layer-${layer}-waves-buck${bucket}-fragMap.json`;
  Promise.all([
    fs.promises.readFile(dagInfoFileName, 'utf8')
  ]).then(datas => {
    const dagInfoFile = datas[0];
    const dagInfo = JSON.parse(dagInfoFile);
    const rawEdgeCnt = dagInfo['edges'];

    if (rawEdgeCnt > TH_RAWSPLIT) {
      if (!cache.has(rawFragMapFileName, {updateAgeOnHas: true})) {
        const processPromise =  processRawFragMap(rawFragMapFileName)
        processPromise.then(() => {
          const cachedMap = cache.get(rawFragMapFileName);
          if (cachedMap.type === 'dagNodeLink.wf.fragMap.null') {
            if (!cache.has(node2edgeListCacheName, {updateAgeOnHas: true})) {
              readWaveAndVMapStream(filename, waveFileName, waveDir, dataset, null, null, true);
            }
          } else if (cachedMap.data[0][metaNode]) {
            const wfName = cachedMap.data[1][metaNode][0];
            const node2edgeListCacheNameFrag = `${node2edgeListCacheName}-${wfName[0]}-${wfName[1]}`;
            if (!cache.has(node2edgeListCacheNameFrag, {updateAgeOnHas: true})) {
              readWaveAndVMapStream(filename, waveFileName, waveDir, dataset, wfName[0], wfName[1], true);
            }
          }
        })
      } else {
        const cachedMap = cache.get(rawFragMapFileName);
        if (cachedMap.type === 'dagNodeLink.wf.fragMap.null') {
          if (!cache.has(node2edgeListCacheName, {updateAgeOnHas: true})) {
            readWaveAndVMapStream(filename, waveFileName, waveDir, dataset, null, null, true);
          }
        } else if (cachedMap.data[0][metaNode]) {
          const wfName = cachedMap.data[1][metaNode][0];
          const node2edgeListCacheNameFrag = `${node2edgeListCacheName}-${wfName[0]}-${wfName[1]}`;
          if (!cache.has(node2edgeListCacheNameFrag, {updateAgeOnHas: true})) {
            readWaveAndVMapStream(filename, waveFileName, waveDir, dataset, wfName[0], wfName[1], true);
          }
        }
      }
    } else {
      cache.set(rawFragMapFileName, {
        processingFlag: false, 
        type: 'dagNodeLink.wf.fragMap.null', 
        size: 1,
        data: [{}, {}]
      });

      if (!cache.has(node2edgeListCacheName, {updateAgeOnHas: true})) {
        readWaveAndVMapStream(filename, waveFileName, waveDir, dataset, null, null, true);
      }
    }
  });
});

app.post('/meta-dag-wf-dag', (req, res) => {
  // console.log(req.body.suffix);
  const filename = req.body.filename;
  const dataset = req.body.graphName;
  const layer = req.body.layer;
  const bucket = req.body.bucket;
  const metaNode = req.body.metaNode;
  const lcc = req.body.lcc;
  const buildingName = req.body.buildingName;
  console.log(filename, dataset, layer, bucket, metaNode);

  const retInfo = {
    filename: filename, 
    dataset: dataset, 
    layer: layer, 
    lcc: lcc,
    bucket: bucket,
    buildingName: buildingName
  }

  const dagFilePrefix = `${__dirname}/${filename}`;
  // const dagLinkFile = `${dagFilePrefix}.link`;
  const dagLinkFile = `${dagFilePrefix}.span.link`;
  const dagNodeFile = `${dagFilePrefix}.node`;
  const dagCacheName = `${dataset}/${filename}.dag`;
  const retName = 'wf.dag';
  if (!cache.has(dagCacheName, {updateAgeOnHas: true})) {
    // // not in the cache
    const processPromise = readDagNodeLinkBySetStream(dagCacheName, dagNodeFile, dagLinkFile, null);
    processPromise.then(() => {
      const cachedData = cache.get(dagCacheName);
      const retData = [
        cachedData.data[0][metaNode], // node
        // cachedData.data[1][metaNode], // link
        // cachedData.data[2][metaNode], // jump link
      ]
      res.send(JSON.stringify([retData, retInfo, retName]));
    })
  } else {
    // // in the cache
    const cachedData = cache.get(dagCacheName);
    if (cachedData.processingFlag) {
      // // still processing
      console.log('W: still processing data in /meta-dag-wf-dag');
      cachedData.processPromise.then(() => {
        const updatedCachedData = cache.get(dagCacheName);
        const retData = [
          updatedCachedData.data[0][metaNode], // node
          // updatedCachedData.data[1][metaNode], // link
          // updatedCachedData.data[2][metaNode], // jump link
        ]
        res.send(JSON.stringify([retData, retInfo, retName]));
      })
    } else {
      // // processed
      const retData = [
        cachedData.data[0][metaNode], // node
        // cachedData.data[1][metaNode], // link
        // cachedData.data[1][metaNode], // jump link
      ]
      res.send(JSON.stringify([retData, retInfo, retName]));
    }
  }


  const dagInfoFileName = `${dagFilePrefix}-info.json`;
  const waveDir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;
  const waveFileName = `layer-${layer}-waves-buck${bucket}.csv`;
  const node2edgeListCacheName = `${dataset}/${waveFileName}:node2edgeList`;
  const rawFragMapFileName = `${waveDir}/layer-${layer}-waves-buck${bucket}-fragMap.json`;
  Promise.all([
    fs.promises.readFile(dagInfoFileName, 'utf8')
  ]).then(datas => {
    const dagInfoFile = datas[0];
    const dagInfo = JSON.parse(dagInfoFile);
    const rawEdgeCnt = dagInfo['edges'];

    if (rawEdgeCnt > TH_RAWSPLIT) {
      if (!cache.has(rawFragMapFileName, {updateAgeOnHas: true})) {
        const processPromise =  processRawFragMap(rawFragMapFileName)
        processPromise.then(() => {
          const cachedMap = cache.get(rawFragMapFileName);
          if (cachedMap.type === 'dagNodeLink.wf.fragMap.null') {
            if (!cache.has(node2edgeListCacheName, {updateAgeOnHas: true})) {
              readWaveAndVMapStream(filename, waveFileName, waveDir, dataset, null, null, true);
            }
          } else {
            const nodewf = cachedMap.data[2][parseInt(metaNode)];
            const wfName = cachedMap.data[1][nodewf[0]][nodewf[1]];
            const node2edgeListCacheNameFrag = `${node2edgeListCacheName}-${wfName[0]}-${wfName[1]}`;
            if (!cache.has(node2edgeListCacheNameFrag, {updateAgeOnHas: true})) {
              readWaveAndVMapStream(filename, waveFileName, waveDir, dataset, wfName[0], wfName[1], true);
            }
          }
        })
      } else {
        const cachedMap = cache.get(rawFragMapFileName);
        if (cachedMap.type === 'dagNodeLink.wf.fragMap.null') {
          if (!cache.has(node2edgeListCacheName, {updateAgeOnHas: true})) {
            readWaveAndVMapStream(filename, waveFileName, waveDir, dataset, null, null, true);
          }
        } else {
          const nodewf = cachedMap.data[2][parseInt(metaNode)];
          const wfName = cachedMap.data[1][nodewf[0]][nodewf[1]];
          // console.log(nodewf)
          // console.log(wfName)
          const node2edgeListCacheNameFrag = `${node2edgeListCacheName}-${wfName[0]}-${wfName[1]}`;
          if (!cache.has(node2edgeListCacheNameFrag, {updateAgeOnHas: true})) {
            readWaveAndVMapStream(filename, waveFileName, waveDir, dataset, wfName[0], wfName[1], true);
          }
        }
      }
    } else {
      cache.set(rawFragMapFileName, {
        processingFlag: false, 
        type: 'dagNodeLink.wf.fragMap.null', 
        size: 1,
        data: [{}, {}]
      });

      if (!cache.has(node2edgeListCacheName, {updateAgeOnHas: true})) {
        readWaveAndVMapStream(filename, waveFileName, waveDir, dataset, null, null, true);
      }
    }
  });
});

app.post('/meta-dag-full', (req, res) => {
  // filename: DATA.filename,
  // graphName: DATA.dataset,
  // layer: DATA.layer,
  // bucket: DATA.bucket,
  // // metaNode: nodeIds,
  // lcc: DATA.lcc,
  // wfInfo: wfInfo,
  // tempGraphIdx: tempGraphIdx,
  // buildingName: DATA.buildingName,
  // parentNode: DATA.parentNode.id,
  // dagType: DATA.dagType
  const filename = req.body.filename;
  const dataset = req.body.graphName;
  const layer = req.body.layer;
  const bucket = req.body.bucket;
  const metaNode = req.body.parentNode;
  const lcc = req.body.lcc;
  const wfInfo = req.body.wfInfo;
  const buildingName = req.body.buildingName;
  const dagType = req.body.dagType;
  const tempGraphIdx = req.body.tempGraphIdx;

  const retInfo = {
    filename: filename, 
    dataset: dataset, 
    layer: layer, 
    lcc: lcc,
    bucket: bucket,
    buildingName: buildingName,
    tempGraphIdx: tempGraphIdx,
  }

  if (dagType === 'dag.span') {
    // there should not be such case
    console.log('wrong type', dagType)

  } else if (dagType === 'wcc.dag') {
    const dagFilePrefix = `${__dirname}/${filename}`;
    // const dagLinkFile = `${dagFilePrefix}.link`;
    const dagLinkFile = `${dagFilePrefix}.span.link`;
    const dagJumpLinkFile = `${dagFilePrefix}.span.link.jump`;
    const dagNodeFile = `${dagFilePrefix}.node`;
    const metaVMapFile = `${dagFilePrefix}.wcc.vmap`;
    const dagCacheName = `${dataset}/${filename}.dag`;
    const retName = 'wcc.dag'
    if (!cache.has(dagCacheName, {updateAgeOnHas: true})) {
      // // not in the cache
      const processPromise = readDagNodeLinkByMetaStream(dagCacheName, dagNodeFile, dagLinkFile, dagJumpLinkFile, metaVMapFile);
      processPromise.then(() => {
        const cachedData = cache.get(dagCacheName);
        const retData = [
          cachedData.data[0][metaNode], // node
          cachedData.data[1][metaNode], // link
          cachedData.data[2][metaNode], // jumpLink
        ]
        // res.send(JSON.stringify([retData, retInfo, retName]));
        send(retData, retInfo, retName);
      })
    } else {
      // // in the cache
      const cachedData = cache.get(dagCacheName);
      if (cachedData.processingFlag) {
        // // still processing
        console.log('W: still processing data in /meta-dag-wcc');
        cachedData.processPromise.then(() => {
          const updatedCachedData = cache.get(dagCacheName);
          const retData = [
            updatedCachedData.data[0][metaNode], // node
            updatedCachedData.data[1][metaNode], // link
            updatedCachedData.data[2][metaNode], // jumpLink
          ]
          // res.send(JSON.stringify([retData, retInfo, retName]));
          send(retData, retInfo, retName);
        })
      } else {
        // // processed
        const retData = [
          cachedData.data[0][metaNode], // node
          cachedData.data[1][metaNode], // link
          cachedData.data[2][metaNode], // jumpLink
        ]
        // res.send(JSON.stringify([retData, retInfo, retName]));
        send(retData, retInfo, retName);
      }
    }

  } else if (dagType === 'edgeCut.dag') {
    const dagFilePrefix = `${__dirname}/${filename}`;
    // const dagLinkFile = `${dagFilePrefix}.link`;
    const dagLinkFile = `${dagFilePrefix}.span.link`;
    const dagJumpLinkFile = `${dagFilePrefix}.span.link.jump`;
    const dagNodeFile = `${dagFilePrefix}.node`;
    const metaVMapFile = `${dagFilePrefix}.edgeCut.vmap`;
    const dagCacheName = `${dataset}/${filename}.dag`;
    const retName = 'edgeCut.dag'
    if (!cache.has(dagCacheName, {updateAgeOnHas: true})) {
      // // not in the cache
      const processPromise = readDagNodeLinkByMetaStream(dagCacheName, dagNodeFile, dagLinkFile, dagJumpLinkFile, metaVMapFile);
      processPromise.then(() => {
        const cachedData = cache.get(dagCacheName);
        const retData = [
          cachedData.data[0][metaNode], // node
          cachedData.data[1][metaNode], // link
          cachedData.data[2][metaNode], // jumpLink
        ]
        // res.send(JSON.stringify([retData, retInfo, retName]));
        send(retData, retInfo, retName);
      })
    } else {
      // // in the cache
      const cachedData = cache.get(dagCacheName);
      if (cachedData.processingFlag) {
        // // still processing
        console.log('W: still processing data in /meta-dag-edgeCut');
        cachedData.processPromise.then(() => {
          const updatedCachedData = cache.get(dagCacheName);
          const retData = [
            updatedCachedData.data[0][metaNode], // node
            updatedCachedData.data[1][metaNode], // link
            updatedCachedData.data[2][metaNode], // jumpLink
          ]
          // res.send(JSON.stringify([retData, retInfo, retName]));
          send(retData, retInfo, retName);
        })
      } else {
        // // processed
        const retData = [
          cachedData.data[0][metaNode], // node
          cachedData.data[1][metaNode], // link
          cachedData.data[2][metaNode], // jumpLink
        ]
        // res.send(JSON.stringify([retData, retInfo, retName]));
        send(retData, retInfo, retName);
      }
    }

  } else {
    console.log('wrong type', dagType)
  }

  function send(retData, retInfo, retName) {
    console.log('full dag size', retData[1].length + retData[2].length)
    // if (retData[1].length + retData[2].length > TH_DAG) {
    if (false) {
      const fullDagName = `${__dirname}/fullDag/${dataset}-${buildingName}-${metaNode}`;
      if (fs.existsSync(`${fullDagName}.html`)) {
        // exist, return directly
      } else {
        fs.writeFile(`${fullDagName}.nodes.json`, JSON.stringify(retData[0]), (err) => {
          if (err) {
            console.log(err);
          }
          fs.writeFile(`${fullDagName}.links.json`, JSON.stringify(retData[1]), (err) => {
            if (err) {
              console.log(err);
            }
            fs.writeFile(`${fullDagName}.links.jump.json`, JSON.stringify(retData[2]), (err) => {
              if (err) {
                console.log(err);
              }
              fs.writeFile(`${fullDagName}.info.json`, JSON.stringify(retInfo), (err) => {
                if (err) {
                  console.log(err);
                }
                // update html
              })
            })
          })
        })
      }
    } else {
      res.send(JSON.stringify([retData, retInfo, retName]));
    }
  }
})

app.post('/meta-dag-node', async (req, res) => {
  const filename = req.body.filename;
  const dataset = req.body.graphName;
  const layer = req.body.layer;
  const bucket = req.body.bucket;
  const metaNode = req.body.metaNode;
  const lcc = req.body.lcc;
  const wfInfo = req.body.wfInfo;
  const buildingName = req.body.buildingName;

  const wavefile = `layer-${layer}-waves-buck${bucket}.csv`;
  const dir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;

  const waveDir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;
  const waveFileName = `layer-${layer}-waves-buck${bucket}.csv`;
  let node2edgeListCacheName = `${dataset}/${waveFileName}:node2edgeList`;



  const rawFragMapFileName = `${waveDir}/layer-${layer}-waves-buck${bucket}-fragMap.json`;
  let cacheWave, cacheFrag;
  if (fs.existsSync(rawFragMapFileName)) {
    if (!cache.has(rawFragMapFileName, {updateAgeOnHas: true})) {
      const processPromise =  processRawFragMap(rawFragMapFileName)
      processPromise.then(() => {
        const cachedMap = cache.get(rawFragMapFileName);
        if (cachedMap.type === 'dagNodeLink.wf.fragMap.null') {
          // read full
        } else {
          const wfName = cachedMap.data[1][wfInfo[0]][wfInfo[1]];
          node2edgeListCacheName += `-${wfName[0]}-${wfName[1]}`;
          cacheWave = wfName[0];
          cacheFrag = wfName[1];
        }
      })
    } else {
      const cachedMap = cache.get(rawFragMapFileName);
      if (cachedMap.type === 'dagNodeLink.wf.fragMap.null') {
        // read full
      } else {
        const wfName = cachedMap.data[1][wfInfo[0]][wfInfo[1]];
        node2edgeListCacheName += `-${wfName[0]}-${wfName[1]}`;
        cacheWave = wfName[0];
        cacheFrag = wfName[1];
      }
    }
  }
  

  const strataFilename = Array.isArray(metaNode) ? `${dataset}_${layer}-${lcc}_${metaNode[0]}` : `${dataset}_${layer}-${lcc}_${metaNode}`;
  
  let readyFlag = true;
  let vMap = undefined;
  let waveList = undefined;
  if (!cache.has(node2edgeListCacheName, {updateAgeOnHas: true})) {
    const processPromise = readWaveAndVMapStream(filename, waveFileName, waveDir, dataset, cacheWave, cacheFrag, true);
    console.log('no', filename);
    processPromise.then(async () => {
      const cachedData = cache.get(node2edgeListCacheName);
      if (Array.isArray(metaNode)) {
        const nodeEdges = metaNode.map(d => cachedData.data[0][d]).flat(1)
        const nodeVerts = metaNode.map(d => cachedData.data[1][d]).flat(1)
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        send(strataFilename, nodeEdges, nodeLabels);
      } else {
        const nodeEdges = cachedData.data[0][metaNode];
        const nodeVerts = cachedData.data[1][metaNode];
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        send(strataFilename, nodeEdges, nodeLabels);
      }
    })
  } else {
    const cachedData = cache.get(node2edgeListCacheName);
    if (cachedData.processingFlag) {
      // // still processing
      console.log('W: still processing data in /meta-dag-node');
      cachedData.processPromise.then(async () => {
        const updatedCachedData = cache.get(node2edgeListCacheName);
        if (Array.isArray(metaNode)) {
          const nodeEdges = metaNode.map(d => updatedCachedData.data[0][d]).flat(1)
          const nodeVerts = metaNode.map(d => updatedCachedData.data[1][d]).flat(1)
          const nodeLabels = await getNodeLabels(nodeVerts, dataset)
          send(strataFilename, nodeEdges, nodeLabels);
        } else {
          const nodeEdges = updatedCachedData.data[0][metaNode];
          const nodeVerts = updatedCachedData.data[1][metaNode];
          const nodeLabels = await getNodeLabels(nodeVerts, dataset)
          send(strataFilename, nodeEdges, nodeLabels);
        }
      })
    } else {
      // // processed
      if (Array.isArray(metaNode)) {
        const nodeEdges = metaNode.map(d => cachedData.data[0][d]).flat(1)
        const nodeVerts = metaNode.map(d => cachedData.data[1][d]).flat(1)
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        send(strataFilename, nodeEdges, nodeLabels);
      } else {
        const nodeEdges = cachedData.data[0][metaNode];
        const nodeVerts = cachedData.data[1][metaNode];
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        send(strataFilename, nodeEdges, nodeLabels);
      }
    }
  }
  // if (!cache.has(node2elcn, {updateAgeOnHas: true})) {
  //   cacheVMap(filename);
  //   readyFlag = false;
  //   console.log('no', filename);
  // } else {
  //   vMap = cache.get(filename);
  //   if (vMap.processingFlag) {
  //     readyFlag = false;
  //     console.log('processing', filename);
  //   }
  // }
  // if (!cache.has(`${dataset}/${wavefile}`, {updateAgeOnHas: true})) {
  //   cacheWave(wavefile, dir, dataset);
  //   readyFlag = false;
  //   console.log('no', `${dataset}/${wavefile}`);
  // } else {
  //   waveList = cache.get(`${dataset}/${wavefile}`);
  //   if (waveList.processingFlag) {
  //     readyFlag = false;
  //     console.log('processing', `${dataset}/${wavefile}`);
  //   }
  // }
  // if (!readyFlag) {
  //   console.log('not ready')
  //   res.send(JSON.stringify({res: false, detail: 'not ready'}));
  // } else {
  //   const nodeEdges = filterNodeEdges(vMap.data[metaNode], waveList.data);
  //   console.log(nodeEdges);
  //   const nodeLabels = getNodeLabels(vMap.data[metaNode]);
    
  //   const filename = `${dataset}_${layer}-${lcc}_${metaNode}`;

  //   const linkJsonList = [];
  //   const labelJsonList = [{source: "new_id", target: "name"}];
  //   for (const [src, tgt] of nodeEdges) {
  //     linkJsonList.push({source: src, target: tgt});
  //   }
  //   for (const [v, label] of nodeLabels) {
  //     labelJsonList.push({source: v, target: label});
  //   }
  //   console.log(filename);
  //   let content = JSON.stringify({
  //     filename: filename + ".csv",
  //     edges: linkJsonList
  //   });

  //   // console.log(content);
  //   httpGetAsync(strataAddress + "query?type=setdatadir&file=./temp", function(strataRes) {
  //     console.log(strataRes);
  //   });
  //   httpPostAsync(content, strataAddress + "save", function(strataRes) {
  //     console.log(strataRes)
  //     console.log(strataRes.errno)
  //     if (strataRes.errno == 0 || strataRes.errno == -17) {
  //       // // send labels to strata
  //       content = JSON.stringify({
  //         filename: filename + "_labels.csv",
  //         edges: labelJsonList
  //       });
  //       httpPostAsync(content, strataAddress + "save", function(strataRes) {
  //         console.log(strataRes)
  //         console.log(strataRes.errno)
  //         if (strataRes.errno == 0 || strataRes.errno == -17) {
  //           // console.log(true)
  //           res.send(JSON.stringify({res: true, detail: 'strata'}));
  //         } else {
  //           res.send(JSON.stringify({res: false, detail: 'strata'}));
  //         }
  //       });
  //     } else {
  //       res.send(JSON.stringify({res: false, detail: 'strata'}));
  //     }
  //   });
  // }

  function send(filename, nodeEdges, nodeLabels) {
    const linkJsonList = [];
    // console.log(nodeEdges, nodeLabels)
    const labelJsonList = [{source: "new_id", target: "name"}];
    for (const [src, tgt] of nodeEdges) {
      linkJsonList.push({source: src, target: tgt});
    }
    for (const [v, label] of nodeLabels) {
      labelJsonList.push({source: v, target: label});
    }
    console.log(filename);
    let content = JSON.stringify({
      filename: filename + ".csv",
      edges: linkJsonList
    });

    // console.log(content);
    httpGetAsync(strataAddress + "query?type=setdatadir&file=./temp", function(strataRes) {
      console.log(strataRes);
    });
    httpPostAsync(content, strataAddress + "save", function(strataRes) {
      console.log(strataRes)
      console.log(strataRes.errno)
      if (strataRes.errno == 0 || strataRes.errno == -17) {
        // // send labels to strata
        content = JSON.stringify({
          filename: filename + "_labels.csv",
          edges: labelJsonList
        });
        httpPostAsync(content, strataAddress + "save", function(strataRes) {
          console.log(strataRes)
          console.log(strataRes.errno)
          if (strataRes.errno == 0 || strataRes.errno == -17) {
            // console.log(true)
            res.send(JSON.stringify({res: true, detail: 'strata'}));
          } else {
            res.send(JSON.stringify({res: false, detail: 'strata'}));
          }
        });
      } else {
        res.send(JSON.stringify({res: false, detail: 'strata'}));
      }
    });
  }
});




app.post('/meta-dag-node-fp-viewer', async (req, res) => {
  const filename = req.body.filename;
  const dataset = req.body.graphName;
  const layer = req.body.layer;
  const bucket = req.body.bucket;
  const metaNode = req.body.metaNode;
  const lcc = req.body.lcc;
  const wfInfo = req.body.wfInfo;
  const metaGraph = req.body.metaGraph; // should contain {building, metaDAG, localMetaDAG}
  const buildingName = req.body.buildingName;
  const prevMetaNode = req.body.prevMetaNode; // need send from client
  const tempMetaNode = req.body.tempMetaNode; // need send from client
  const desc = req.body.desc;

  console.log(buildingName, prevMetaNode, metaNode)

  console.log(wfInfo)
  const metaNodeID = Array.isArray(metaNode) ? metaNode[0] : metaNode;

  const strataFilename = Array.isArray(metaNode) ? `${dataset}_${layer}-${lcc}_${metaNode[0]}` : `${dataset}_${layer}-${lcc}_${metaNode}`;
  const fpViewerFileName = `${__dirname}/fpViewer/index3_${strataFilename}.html`;
  if (fs.existsSync(fpViewerFileName)) {
    console.log(fpViewerFileName, 'exists')
    res.send(JSON.stringify({res: true, detail: 'fpViewer exist', url: `fpViewer/index3_${strataFilename}.html`}));
    return;
  }

  const wavefile = `layer-${layer}-waves-buck${bucket}.csv`;
  const dir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;

  const waveDir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;
  const waveFileName = `layer-${layer}-waves-buck${bucket}.csv`;
  let node2edgeListCacheName = `${dataset}/${waveFileName}:node2edgeList`;

  const rawFragMapFileName = `${waveDir}/layer-${layer}-waves-buck${bucket}-fragMap.json`;
  let cacheWave, cacheFrag;
  if (fs.existsSync(rawFragMapFileName)) {
    if (!cache.has(rawFragMapFileName, {updateAgeOnHas: true})) {
      const processPromise =  processRawFragMap(rawFragMapFileName)
      processPromise.then(() => {
        const cachedMap = cache.get(rawFragMapFileName);
        if (cachedMap.type === 'dagNodeLink.wf.fragMap.null') {
          // read full
        } else {
          const wfName = cachedMap.data[1][wfInfo[0]][wfInfo[1]];
          node2edgeListCacheName += `-${wfName[0]}-${wfName[1]}`;
          cacheWave = wfName[0];
          cacheFrag = wfName[1];
        }
      })
    } else {
      const cachedMap = cache.get(rawFragMapFileName);
      if (cachedMap.type === 'dagNodeLink.wf.fragMap.null') {
        // read full
      } else {
        const wfName = cachedMap.data[1][wfInfo[0]][wfInfo[1]];
        node2edgeListCacheName += `-${wfName[0]}-${wfName[1]}`;
        cacheWave = wfName[0];
        cacheFrag = wfName[1];
      }
    }
  }

  
  // if (wfInfo.length === 2) {
  //   node2edgeListCacheName += `-${wfInfo[0]}-${wfInfo[1]}`;
  // }
  console.log(node2edgeListCacheName);

  if (!fs.existsSync(`${__dirname}/fpViewer/${dataset}-${buildingName}-building.json`)) {
    fs.writeFile(`${__dirname}/fpViewer/${dataset}-${buildingName}-building.json`, JSON.stringify(metaGraph[0]), (err) => {
      if (err) {
        console.log(err);
      }
    })
  }

  if (!fs.existsSync(`${__dirname}/fpViewer/${dataset}-${buildingName}-metaDag.json`)) {
    fs.writeFile(`${__dirname}/fpViewer/${dataset}-${buildingName}-metaDag.json`, JSON.stringify(metaGraph[1]), (err) => {
      if (err) {
        console.log(err);
      }
    })
  }

  if (!fs.existsSync(`${__dirname}/fpViewer/${dataset}-${buildingName}-${prevMetaNode}-localMetaDag.json`)) {
    fs.writeFile(`${__dirname}/fpViewer/${dataset}-${buildingName}-${prevMetaNode}-localMetaDag.json`, JSON.stringify(metaGraph[2]), (err) => {
      if (err) {
        console.log(err);
      }
    })
  }

  // fs.writeFile(`${__dirname}/fpViewer/${strataFilename}-metaDag.json`, JSON.stringify(metaGraph), (err) => {
  //   if (err) {
  //     console.log(err);
  //   }
  // });

  // fs.writeFile(`${__dirname}/fpViewer/${strataFilename}-wfGlobal.json`, JSON.stringify(wfInfo), (err) => {
  //   if (err) {
  //     console.log(err);
  //   }
  // });
  
  let readyFlag = true;
  let vMap = undefined;
  let waveList = undefined;
  if (!cache.has(node2edgeListCacheName, {updateAgeOnHas: true})) {
    const processPromise = readWaveAndVMapStream(filename, waveFileName, waveDir, dataset, cacheWave, cacheFrag, true);
    console.log('no', filename);
    processPromise.then(async () => {
      const cachedData = cache.get(node2edgeListCacheName);
      if (Array.isArray(metaNode)) {
        console.log('metaNode', metaNode)
        const nodeEdges = metaNode.map(d => cachedData.data[0][d]).flat(1)
        const nodeVerts = metaNode.map(d => cachedData.data[1][d]).flat(1)
        // console.log(metaNode.map(d => cachedData.data[1][d]))
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        send(strataFilename, nodeEdges, nodeLabels);
      } else {
        const nodeEdges = cachedData.data[0][metaNode];
        const nodeVerts = cachedData.data[1][metaNode];
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        send(strataFilename, nodeEdges, nodeLabels);
      }
      // const nodeEdges = cachedData.data[0][metaNode];
      // const nodeVerts = cachedData.data[1][metaNode];
      // const nodeLabels = getNodeLabels(nodeVerts)
      // send(strataFilename, nodeEdges, nodeLabels);
    })
  } else {
    const cachedData = cache.get(node2edgeListCacheName);
    if (cachedData.processingFlag) {
      // // still processing
      console.log('W: still processing data in /meta-dag-node-fp-viewer');
      cachedData.processPromise.then(async () => {
        const updatedCachedData = cache.get(node2edgeListCacheName);
        if (Array.isArray(metaNode)) {
          // console.log('metaNode', metaNode)
          const nodeEdges = metaNode.map(d => updatedCachedData.data[0][d]).flat(1)
          const nodeVerts = metaNode.map(d => updatedCachedData.data[1][d]).flat(1)
          // console.log(metaNode.map(d => updatedCachedData[1][d]))
          const nodeLabels = await getNodeLabels(nodeVerts, dataset)
          send(strataFilename, nodeEdges, nodeLabels);
        } else {
          const nodeEdges = updatedCachedData.data[0][metaNode];
          const nodeVerts = updatedCachedData.data[1][metaNode];
          const nodeLabels = await getNodeLabels(nodeVerts, dataset)
          send(strataFilename, nodeEdges, nodeLabels);
        }
        // const nodeEdges = updatedCachedData.data[0][metaNode];
        // const nodeVerts = updatedCachedData.data[1][metaNode];
        // const nodeLabels = getNodeLabels(nodeVerts)
        // send(strataFilename, nodeEdges, nodeLabels);
      })
    } else {
      // // processed
      if (Array.isArray(metaNode)) {
        const nodeEdges = metaNode.map(d => cachedData.data[0][d]).flat(1)
        const nodeVerts = metaNode.map(d => cachedData.data[1][d]).flat(1)
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        send(strataFilename, nodeEdges, nodeLabels);
      } else {
        const nodeEdges = cachedData.data[0][metaNode];
        const nodeVerts = cachedData.data[1][metaNode];
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        send(strataFilename, nodeEdges, nodeLabels);
      }
      // const nodeEdges = cachedData.data[0][metaNode];
      // const nodeVerts = cachedData.data[1][metaNode];
      // const nodeLabels = getNodeLabels(nodeVerts)
      // send(strataFilename, nodeEdges, nodeLabels);
    }
  }

  function send(filename, nodeEdges, nodeLabels) {
    // const linkJsonList = [];
    // console.log(nodeEdges, nodeLabels)
    // const labelJsonList = [{source: "new_id", target: "name"}];
    // for (const [src, tgt] of nodeEdges) {
    //   linkJsonList.push({source: src, target: tgt});
    // }
    // for (const [v, label] of nodeLabels) {
    //   labelJsonList.push({source: v, target: label});
    // }
    // console.log(filename);
    // let content = JSON.stringify({
    //   filename: filename + ".csv",
    //   edges: linkJsonList
    // });
    const localDir = `${__dirname}/wave-decomposition/${filename}`
    const fpViewerFile = `${__dirname}/fpViewer/index3_${filename}.html`
    if (!fs.existsSync(fpViewerFile)) {
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir)
      }
      fs.writeFile(`${localDir}/${filename}.txt`, nodeEdges.map(d => `${d[0]}\t${d[1]}`).join('\n'), function (err, data) {
        if (err) {
          // res.send(JSON.stringify({res: false, detail: 'fpViewer', url: `na`}));
          return console.log(err);
        }
        fs.writeFile(`${localDir}/${filename}_names.csv`, nodeLabels.map(d => `"${d[0]}","${d[1]}"`).join('\n'), function (err, data) {
          if (err) {
            // res.send(JSON.stringify({res: false, detail: 'fpViewer', url: `na`}));
            return console.log(err);
          }
        })
        exec(`cd wave-decomposition; make GRAPH=${filename} PARENT=${dataset} fpViewer`, (err, stdout, stderr) => {
          if (err) {
            // res.send(JSON.stringify({res: false, detail: 'fpViewer', url: `na`}));
            return console.log(err);
          }
          exec(`cd fpViewer; make GRAPH=${filename} LOCALMININODE=${tempMetaNode} MININODE=${prevMetaNode} FLOORLIST=[${wfInfo[0]}] BLDGFILE=${dataset}-${buildingName} METAFILE=${dataset}-${buildingName} LOCALFILE=${dataset}-${buildingName}-${prevMetaNode} BLDGDESC=${desc[0]} METADESC=${desc[1]} LOCALDESC=${desc[2]} retrive`, (err, stdout, stderr) => {
            if (err) {
              // res.send(JSON.stringify({res: false, detail: 'fpViewer', url: `na`}));
              return console.log(err);
            }
          })
          res.send(JSON.stringify({res: true, detail: 'fpViewer', url: `fpViewer/index3_${filename}.html`}));
        })
      })
    } else {
      console.log(localDir, 'exists')
      res.send(JSON.stringify({res: true, detail: 'fpViewer exist', url: `fpViewer/index3_${filename}.html`}));
    }

    // console.log(content);
    // httpGetAsync(strataAddress + "query?type=setdatadir&file=./temp", function(strataRes) {
    //   console.log(strataRes);
    // });
    // httpPostAsync(content, strataAddress + "save", function(strataRes) {
    //   console.log(strataRes)
    //   console.log(strataRes.errno)
    //   if (strataRes.errno == 0 || strataRes.errno == -17) {
    //     // // send labels to strata
    //     content = JSON.stringify({
    //       filename: filename + "_labels.csv",
    //       edges: labelJsonList
    //     });
    //     httpPostAsync(content, strataAddress + "save", function(strataRes) {
    //       console.log(strataRes)
    //       console.log(strataRes.errno)
    //       if (strataRes.errno == 0 || strataRes.errno == -17) {
    //         // console.log(true)
    //         res.send(JSON.stringify({res: true, detail: 'strata'}));
    //       } else {
    //         res.send(JSON.stringify({res: false, detail: 'strata'}));
    //       }
    //     });
    //   } else {
    //     res.send(JSON.stringify({res: false, detail: 'strata'}));
    //   }
    // });
  }
});


app.post('/meta-dag-node-vicinity', async (req, res) => {
  const filename = req.body.filename;
  const dataset = req.body.graphName;
  const layer = req.body.layer;
  const bucket = req.body.bucket;
  const metaNode = req.body.metaNode;
  const lcc = req.body.lcc;
  const wfInfo = req.body.wfInfo;
  const metaGraph = req.body.metaGraph;
  const buildingName = req.body.buildingName;

  const strataFilename = Array.isArray(metaNode) ? `${dataset}-${layer}-${lcc}-${metaNode[0]}` : `${dataset}-${layer}-${lcc}-${metaNode}`;
  const vicinityFileName = `${__dirname}/index-${strataFilename}.html`;
  if (fs.existsSync(vicinityFileName)) {
    console.log(vicinityFileName, 'exists')
    res.send(JSON.stringify({success: true, detail: 'vicinity exist', name: strataFilename}));
    return;
  }

  console.log(wfInfo)

  const wavefile = `layer-${layer}-waves-buck${bucket}.csv`;
  const dir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;

  const waveDir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;
  const waveFileName = `layer-${layer}-waves-buck${bucket}.csv`;
  let node2edgeListCacheName = `${dataset}/${waveFileName}:node2edgeList`;

  const rawFragMapFileName = `${waveDir}/layer-${layer}-waves-buck${bucket}-fragMap.json`;
  let cacheWave, cacheFrag;
  if (fs.existsSync(rawFragMapFileName)) {
    if (!cache.has(rawFragMapFileName, {updateAgeOnHas: true})) {
      const processPromise =  processRawFragMap(rawFragMapFileName)
      processPromise.then(() => {
        const cachedMap = cache.get(rawFragMapFileName);
        if (cachedMap.type === 'dagNodeLink.wf.fragMap.null') {
          // read full
        } else {
          const wfName = cachedMap.data[1][wfInfo[0]][wfInfo[1]];
          node2edgeListCacheName += `-${wfName[0]}-${wfName[1]}`;
          cacheWave = wfName[0];
          cacheFrag = wfName[1];
        }
      })
    } else {
      const cachedMap = cache.get(rawFragMapFileName);
      if (cachedMap.type === 'dagNodeLink.wf.fragMap.null') {
        // read full
      } else {
        const wfName = cachedMap.data[1][wfInfo[0]][wfInfo[1]];
        node2edgeListCacheName += `-${wfName[0]}-${wfName[1]}`;
        cacheWave = wfName[0];
        cacheFrag = wfName[1];
      }
    }
  }

  
  // if (wfInfo.length === 2) {
  //   node2edgeListCacheName += `-${wfInfo[0]}-${wfInfo[1]}`;
  // }
  console.log(node2edgeListCacheName);

  // fs.writeFile(`${__dirname}/fpViewer/${strataFilename}-metaDag.json`, JSON.stringify(metaGraph), (err) => {
  //   if (err) {
  //     console.log(err);
  //   }
  // });

  // fs.writeFile(`${__dirname}/fpViewer/${strataFilename}-wfGlobal.json`, JSON.stringify(wfInfo), (err) => {
  //   if (err) {
  //     console.log(err);
  //   }
  // });
  
  let readyFlag = true;
  let vMap = undefined;
  let waveList = undefined;
  if (!cache.has(node2edgeListCacheName, {updateAgeOnHas: true})) {
    const processPromise = readWaveAndVMapStream(filename, waveFileName, waveDir, dataset, cacheWave, cacheFrag, true);
    console.log('no', filename);
    processPromise.then(async () => {
      const cachedData = cache.get(node2edgeListCacheName);
      if (Array.isArray(metaNode)) {
        console.log('metaNode', metaNode)
        const nodeEdges = metaNode.map(d => cachedData.data[0][d]).flat(1)
        const nodeVerts = metaNode.map(d => cachedData.data[1][d]).flat(1)
        // console.log(metaNode.map(d => cachedData.data[1][d]))
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        send(strataFilename, nodeEdges, nodeLabels);
      } else {
        const nodeEdges = cachedData.data[0][metaNode];
        const nodeVerts = cachedData.data[1][metaNode];
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        send(strataFilename, nodeEdges, nodeLabels);
      }
      // const nodeEdges = cachedData.data[0][metaNode];
      // const nodeVerts = cachedData.data[1][metaNode];
      // const nodeLabels = getNodeLabels(nodeVerts)
      // send(strataFilename, nodeEdges, nodeLabels);
    })
  } else {
    const cachedData = cache.get(node2edgeListCacheName);
    if (cachedData.processingFlag) {
      // // still processing
      console.log('W: still processing data in /meta-dag-node-fp-viewer');
      cachedData.processPromise.then(async () => {
        const updatedCachedData = cache.get(node2edgeListCacheName);
        if (Array.isArray(metaNode)) {
          // console.log('metaNode', metaNode)
          const nodeEdges = metaNode.map(d => updatedCachedData.data[0][d]).flat(1)
          const nodeVerts = metaNode.map(d => updatedCachedData.data[1][d]).flat(1)
          // console.log(metaNode.map(d => updatedCachedData[1][d]))
          const nodeLabels = await getNodeLabels(nodeVerts, dataset)
          send(strataFilename, nodeEdges, nodeLabels);
        } else {
          const nodeEdges = updatedCachedData.data[0][metaNode];
          const nodeVerts = updatedCachedData.data[1][metaNode];
          const nodeLabels = await getNodeLabels(nodeVerts, dataset)
          send(strataFilename, nodeEdges, nodeLabels);
        }
        // const nodeEdges = updatedCachedData.data[0][metaNode];
        // const nodeVerts = updatedCachedData.data[1][metaNode];
        // const nodeLabels = getNodeLabels(nodeVerts)
        // send(strataFilename, nodeEdges, nodeLabels);
      })
    } else {
      // // processed
      if (Array.isArray(metaNode)) {
        const nodeEdges = metaNode.map(d => cachedData.data[0][d]).flat(1)
        const nodeVerts = metaNode.map(d => cachedData.data[1][d]).flat(1)
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        send(strataFilename, nodeEdges, nodeLabels);
      } else {
        const nodeEdges = cachedData.data[0][metaNode];
        const nodeVerts = cachedData.data[1][metaNode];
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        send(strataFilename, nodeEdges, nodeLabels);
      }
      // const nodeEdges = cachedData.data[0][metaNode];
      // const nodeVerts = cachedData.data[1][metaNode];
      // const nodeLabels = getNodeLabels(nodeVerts)
      // send(strataFilename, nodeEdges, nodeLabels);
    }
  }

  function send(filename, nodeEdges, nodeLabels) {
    // const linkJsonList = [];
    // console.log(nodeEdges, nodeLabels)
    // const labelJsonList = [{source: "new_id", target: "name"}];
    // for (const [src, tgt] of nodeEdges) {
    //   linkJsonList.push({source: src, target: tgt});
    // }
    // for (const [v, label] of nodeLabels) {
    //   labelJsonList.push({source: v, target: label});
    // }
    // console.log(filename);
    // let content = JSON.stringify({
    //   filename: filename + ".csv",
    //   edges: linkJsonList
    // });
    const localDir = `${__dirname}/wave-decomposition/${filename}`
    // const vicinityName = `${dataset}-l${layer}-b${bucket}`
    const vicinityFileName = `${__dirname}/index-${filename}.html`
    if (!fs.existsSync(vicinityFileName)) {
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir)
      }
      fs.writeFile(`${localDir}/${filename}.txt`, nodeEdges.map(d => `${d[0]}\t${d[1]}`).join('\n'), function (err, data) {
        if (err) {
          res.send(JSON.stringify({success: false, detail: 'edge', url: `na`}));
          return console.log(err);
        }
        fs.writeFile(`${localDir}/${filename}_label.csv`, nodeLabels.map(d => `"${d[0]}","${d[1]}"`).join('\n'), function (err, data) {
          if (err) {
            res.send(JSON.stringify({success: false, detail: 'label', url: `na`}));
            return console.log(err);
          }
        })
        exec(`cd wave-decomposition; make GRAPH=${filename} PARENT=${dataset} prepareCity`, {maxBuffer: 1024 * 1024 * 50}, (err, stdout, stderr) => {
          if (err) {
            res.send(JSON.stringify({success: false, detail: 'prepareVicinity', name: `na`}));
            return console.log(err);
          }
          exec(`make GRAPH=${filename} retrive-mall`, {maxBuffer: 1024 * 1024 * 50}, (err, stdout, stderr) => {
            if (err) {
              res.send(JSON.stringify({success: false, detail: 'retrive', name: `na`}));
              return console.log(err);
            }
            res.send(JSON.stringify({success: true, name: filename}))
          })
        })
      })
    } else {
      console.log(localDir, 'exists')
      res.send(JSON.stringify({success: true, detail: 'vicinity exist', name: filename}));
    }

    // console.log(content);
    // httpGetAsync(strataAddress + "query?type=setdatadir&file=./temp", function(strataRes) {
    //   console.log(strataRes);
    // });
    // httpPostAsync(content, strataAddress + "save", function(strataRes) {
    //   console.log(strataRes)
    //   console.log(strataRes.errno)
    //   if (strataRes.errno == 0 || strataRes.errno == -17) {
    //     // // send labels to strata
    //     content = JSON.stringify({
    //       filename: filename + "_labels.csv",
    //       edges: labelJsonList
    //     });
    //     httpPostAsync(content, strataAddress + "save", function(strataRes) {
    //       console.log(strataRes)
    //       console.log(strataRes.errno)
    //       if (strataRes.errno == 0 || strataRes.errno == -17) {
    //         // console.log(true)
    //         res.send(JSON.stringify({res: true, detail: 'strata'}));
    //       } else {
    //         res.send(JSON.stringify({res: false, detail: 'strata'}));
    //       }
    //     });
    //   } else {
    //     res.send(JSON.stringify({res: false, detail: 'strata'}));
    //   }
    // });
  }
});


// function filterNodeEdges(vSet, edgeList) {
//   return edgeList.filter(d => vSet.has(d[0]) && vSet.has(d[1]));
// }
// function getNodeLabels(vSet) {
//   return [...vSet].map(d => [d, d]);
// }
async function getNodeLabels(vList, dataset) {
  // const labelFileName = `${__dirname}/wave-decomposition/${dataset}/${dataset}_label.csv`;
  const labelCacheName = `${dataset}_label`;
  if (!cache.has(labelCacheName, { updateAgeOnHas: true })) {
    const res = cacheLabel(dataset)
    console.log('no', labelCacheName, res)
    if (res) {
      // there is a label.csv
      const cachedData = cache.get(labelCacheName);
      if (cachedData.processingFlag) {
        // // still processing
        console.log('W: still processing data in /getNodeLables');
        await cachedData.processPromise
        const updatedCachedData = cache.get(labelCacheName)
        return vList.map(d => [d, updatedCachedData.data[d]]);
      } else {
        // // processed
        if (cachedData.type === 'label.null') {
          return vList.map(d => [d, d]);
        } else {
          return vList.map(d => [d, cachedData.data[d]])
        }
      }
    } else {
      return vList.map(d => [d, d]);
    }
  } else {
    const cachedData = cache.get(labelCacheName)
    if (cachedData.processingFlag) {
      // // still processing
      console.log('W: still processing data in /getNodeLables');
      await cachedData.processPromise
      const updatedCachedData = cache.get(labelCacheName)
      return vList.map(d => [d, updatedCachedData.data[d]]);
    } else {
      // // processed
      if (cachedData.type === 'label.null') {
        return vList.map(d => [d, d]);
      } else {
        return vList.map(d => [d, cachedData.data[d]])
      }
    }
  }
}

async function getImportantNodeLabels(vObj, dataset) {
  // const labelFileName = `${__dirname}/wave-decomposition/${dataset}/${dataset}_label.csv`;
  const labelCacheName = `${dataset}_label`;
  if (!cache.has(labelCacheName, { updateAgeOnHas: true })) {
    const res = cacheLabel(dataset)
    console.log('no', labelCacheName, res)
    if (res) {
      // there is a label.csv
      const cachedData = cache.get(labelCacheName);
      if (cachedData.processingFlag) {
        // // still processing
        console.log('W: still processing data in /getNodeLables');
        await cachedData.processPromise
        const updatedCachedData = cache.get(labelCacheName)
        for (const key in vObj) {
          if (vObj.hasOwnProperty(key)) {
            const vList = vObj[key];
            const shorterVList = vList.slice(0, Math.ceil(Math.log2(1 + vList.length)));
            vObj[key] = shorterVList.map(d => updatedCachedData.data[d]);
          }
        }
        return vObj;
      } else {
        // // processed
        if (cachedData.type === 'label.null') {
          for (const key in vObj) {
            if (vObj.hasOwnProperty(key)) {
              const vList = vObj[key];
              const shorterVList = vList.slice(0, Math.ceil(Math.log2(1 + vList.length)));
              vObj[key] = shorterVList
            }
          }
          return vObj;
        } else {
          for (const key in vObj) {
            if (vObj.hasOwnProperty(key)) {
              const vList = vObj[key];
              const shorterVList = vList.slice(0, Math.ceil(Math.log2(1 + vList.length)));
              vObj[key] = shorterVList.map(d => cachedData.data[d]);
            }
          }
          return vObj;
        }
      }
    } else {
      return vObj;
    }
  } else {
    const cachedData = cache.get(labelCacheName)
    if (cachedData.processingFlag) {
      // // still processing
      console.log('W: still processing data in /getNodeLables');
      await cachedData.processPromise
      const updatedCachedData = cache.get(labelCacheName)
        for (const key in vObj) {
          if (vObj.hasOwnProperty(key)) {
            const vList = vObj[key];
            const shorterVList = vList.slice(0, Math.ceil(Math.log2(1 + vList.length)));
            vObj[key] = shorterVList.map(d => updatedCachedData.data[d]);
          }
        }
        return vObj;
    } else {
      // // processed
      if (cachedData.type === 'label.null') {
        for (const key in vObj) {
          if (vObj.hasOwnProperty(key)) {
            const vList = vObj[key];
            const shorterVList = vList.slice(0, Math.ceil(Math.log2(1 + vList.length)));
            vObj[key] = shorterVList
          }
        }
        return vObj;
      } else {
        for (const key in vObj) {
          if (vObj.hasOwnProperty(key)) {
            const vList = vObj[key];
            const shorterVList = vList.slice(0, Math.ceil(Math.log2(1 + vList.length)));
            vObj[key] = shorterVList.map(d => cachedData.data[d]);
          }
        }
        return vObj;
      }
    }
  }
}

async function getAllNodeLabels(vList, dataset) {
  // const labelFileName = `${__dirname}/wave-decomposition/${dataset}/${dataset}_label.csv`;
  const labelCacheName = `${dataset}_label`;
  if (!cache.has(labelCacheName, { updateAgeOnHas: true })) {
    const res = cacheLabel(dataset)
    console.log('no', labelCacheName, res)
    if (res) {
      // there is a label.csv
      const cachedData = cache.get(labelCacheName);
      if (cachedData.processingFlag) {
        // // still processing
        console.log('W: still processing data in /getNodeLables');
        await cachedData.processPromise
        const updatedCachedData = cache.get(labelCacheName)
        return vList.map(d => updatedCachedData.data[d]);
      } else {
        // // processed
        if (cachedData.type === 'label.null') {
          return vList
        } else {
          return vList.map(d => cachedData.data[d]);
        }
      }
    } else {
      return vList.map(d => [d, d]);
    }
  } else {
    const cachedData = cache.get(labelCacheName)
    if (cachedData.processingFlag) {
      // // still processing
      console.log('W: still processing data in /getNodeLables');
      await cachedData.processPromise
      const updatedCachedData = cache.get(labelCacheName)
      return vList.map(d => updatedCachedData.data[d]);
    } else {
      // // processed
      if (cachedData.type === 'label.null') {
        return vList;
      } else {
        return vList.map(d => cachedData.data[d]);
      }
    }
  }
}

// function sendToStrata(filename, links, labels, callback) {
//   let retval = false;
//   const linkJsonList = [];
//   const labelJsonList = [{source: "new_id", target: "name"}];
//   for (const [src, tgt] of links) {
//     linkJsonList.push({source: src, target: tgt});
//   }
//   for (const [v, label] of labels) {
//     linkJsonList.push({source: v, target: label});
//   }
//   console.log(filename);
//   let content = JSON.stringify({
//     filename: filename + ".csv",
//     edges: linkJsonList
//   });

//   // console.log(content);
//   httpGetAsync(strataAddress + "query?type=setdatadir&file=./temp", function(res) {
//     console.log(res);
//   });
//   httpPostAsync(content, strataAddress + "save", function(res) {
//     console.log(res)
//     console.log(res.errno)
//     if (res.errno == 0 || res.errno == -17) {
//       // // send labels to strata
//       content = JSON.stringify({
//         filename: filename + "_labels.csv",
//         edges: labelJsonList
//       });
//       httpPostAsync(content, strataAddress + "save", function(res) {
//         console.log(res)
//         console.log(res.errno)
//         if (res.errno == 0 || res.errno == -17) {
//           // console.log(true)
//           retval = true;
//         };
//       });
//     }
//   });
// }

// function dagVerticalCompress(metaDag, maxEdge) {
//   // console.log(metaDag, maxEdge);
//   let verts = 0;
//   let edges = 0;
//   let fpedges = 0;

//   const nodeset = disjointSet();
//   //const nodemap = {};
//   const nodes = {};
//   for (const vert in metaDag["nodes"]) {
//     const vals = metaDag["nodes"][vert]
//     // console.log(vert, vals);
//     // const density = 2.0 * vals["num_edges"] / (vals["num_vertices"] * (vals["num_vertices"] - 1));
//     const node = {
//       id: vert,
//       set: vals["set"],
//       name: vals["num_edges"],
//       // density: density,
//       // color: getColor(density),
//       size: vals["num_vertices"],
//       esize: vals["num_edges"] / 2,
//       level: vals["set"]
//     };

//     nodes[vert] = node;
//     nodeset.add(node);
//     //nodemap[nodeset.find(node)] = node;

//     verts += vals["num_vertices"];
//     fpedges += vals["num_edges"] / 2;
//   }

//   const links = [];
//   for (const sedge in metaDag["edges"]) {
//     const edge = sedge.split('-');
//     const v0 = edge[0],
//       v1 = edge[1]
//     let parent = v0;
//     let target = v1;
//     if (nodes[v0].set > nodes[v1].set) {
//       parent = v1;
//       target = v0;
//     }
//     links.push({
//       source: nodeset.find(nodes[parent]),
//       target: nodeset.find(nodes[target]),
//       //targetNode: nodes[target],
//       logsize: Math.log2(metaDag["edges"][sedge] + 1),
//       size: metaDag["edges"][sedge]
//     });

//     edges += metaDag["edges"][sedge];
//     fpedges += metaDag["edges"][sedge];
//   }

//   let minset = 10;
//   let preLength = 0;
//   // console.log(nodeset);
//   while (links.length > 2 * maxEdge && minset > 0) { // 2x because undirected
//     // /**
//     let sources1 = new Set();
//     let sources2 = new Set();
//     for (const l in links) {
//       let link = links[l];
//       sources1.add(link.source);
//       sources2.add(link.source);
//     }
//     for (const l in links) {
//       let link = links[l];
//       sources1.delete(link.target);
//     }
//     for (const l in links) {
//       let link = links[l];
//       if (!sources1.has(link.source)) {
//         sources2.delete(link.target);
//       }
//     }
//     console.log(sources1, sources2);
//     for (const l in links) {
//       let link = links[l];
//       //console.log(link.source, link, links);
//       if (sources1.has(link.source) && sources2.has(link.target)) {
//         //nodeset.union(nodemap[link.source], nodemap[link.target]);
//         nodeset.union(nodeset._objects[link.source], nodeset._objects[link.target]);
//       }
//     }
//     //const filterLinks = {};
//     const filterLinks = [];
//     for (const l in links) {
//       let link = links[l];
//       //if (nodeset.connected(nodemap[link.source], nodemap[link.target])) {
//       //  nodemap[nodeset.find(nodemap[link.source])].esize += link.size;
//       if (nodeset.connected(nodeset._objects[link.source], nodeset._objects[link.target])) {
//         nodeset._objects[nodeset._findById(link.source)].esize += link.size;
//       } else {
//         link.source = nodeset._findById(link.source);
//         link.target = nodeset._findById(link.target);
//         filterLinks.push(link);
//         //console.log(filterLinks[filterLinks.length-1]);
//       }
//     }
//     links = Object.values(filterLinks);
//     console.log("Reduced to: ", links.length);
//     if (preLength == links.length) {
//       minset--;
//     }
//     preLength = links.length;
//   }

//   //let nodeArr = Object.values(nodes);
//   const nodesExt = nodeset.extract();
//   const nodeArr = []
//   var maxNodeEdges = 0;
//   var minNodeEdges = Infinity;
//   for (let vert in nodesExt) {
//     let maxset = 0;
//     let num_vertices = 0;
//     let num_edges = 0;
//     for (let i in nodesExt[vert]) {
//       //console.log(nodesExt[vert][i]);
//       if (maxset < nodesExt[vert][i].set) {
//         maxset = nodesExt[vert][i].set;
//       }
//       num_vertices += nodesExt[vert][i].size;
//       num_edges += nodesExt[vert][i].esize;
//     }

//     // const density = 2.0 * num_edges / (num_vertices * (num_vertices - 1));

//     const node = {
//       id: nodeset.find(nodesExt[vert][0]),
//       set: maxset,
//       name: num_edges,
//       // density: density,
//       // color: getColor(density),
//       size: num_vertices,
//       esize: num_edges, // double counted undirected
//       level: maxset
//     };
//     if (maxNodeEdges < num_edges) maxNodeEdges = num_edges;
//     if (minNodeEdges > num_edges) minNodeEdges = num_edges;
//     nodeArr.push(node);
//   }
//   const metaInfo = {
//     verts: verts,
//     fpedges: fpedges,
//     edges: edges,
//     maxNodeEdges: maxNodeEdges,
//     minNodeEdges, minNodeEdges,
//     nodeset: nodeset
//   }
//   return [nodeArr, links, metaInfo];
// }

// function readLayerEdges(layerfile) {
//   if (cache.has(layerfile)) {
//     return cache.get(layerfile);
//   }
  
//   const data = [];
//   new Promise((resolve, reject) => {
//     fs.createReadStream(layerfile)
//     .pipe(csv.parse())
//     .on('data', row => {
//       data.push(row)
//     })
//     .on('end', () =>{

//     })
//   })
// }


app.post('/city-vicinity', (req, res) => {
  const dataset = req.body.graphName;
  const layer = req.body.layer;
  const bucket = req.body.bucket;
  const lcc = req.body.lcc;

  const vicinityName = `${dataset}-l${layer}-b${bucket}`
  const vicinityFileName = `${__dirname}/index-${vicinityName}.html`

  if (fs.existsSync(vicinityFileName)) {
    res.send(JSON.stringify({success: true, name: vicinityName}))
  } else {
    exec(`cd wave-decomposition; make GRAPH=${dataset} LAYER=${layer} BUCKET=${bucket} buck2vicinity`, (err, stdout, stderr) => {
      if (err) {
        res.send(JSON.stringify({success: false, detail: 'buck2vicinity', name: `na`}));
        return console.log(err);
      }
      exec(`cd wave-decomposition; ln -s ${__dirname}/wave-decomposition/${dataset}/${dataset}_label.csv ${__dirname}/wave-decomposition/${vicinityName}/${vicinityName}_label.csv; make GRAPH=${vicinityName} PARENT=${dataset} prepareVicinity`, {maxBuffer: 1024 * 1024 * 50}, (err, stdout, stderr) => {
        if (err) {
          res.send(JSON.stringify({success: false, detail: 'prepareVicinity', name: `na`}));
          return console.log(err);
        }
        exec(`make GRAPH=${vicinityName} retrive-vicinity`, {maxBuffer: 1024 * 1024 * 50}, (err, stdout, stderr) => {
          if (err) {
            res.send(JSON.stringify({success: false, detail: 'retrive', name: `na`}));
            return console.log(err);
          }
          res.send(JSON.stringify({success: true, name: vicinityName}))
        })
      })
    })
  }
})

app.post('/city-vicinity-fpviewer', (req, res) => {
  const dataset = req.body.graphName;
  const layer = req.body.layer;
  const bucket = req.body.bucket;
  const lcc = req.body.lcc;

  const vicinityName = `${dataset}-l${layer}-b${bucket}`
  const vicinityFileName = `${__dirname}/fpViewer/index3_${vicinityName}.html`;

  if (fs.existsSync(vicinityFileName)) {
    res.send(JSON.stringify({success: true, name: vicinityName}))
  } else {
    exec(`cd wave-decomposition; make GRAPH=${dataset} LAYER=${layer} BUCKET=${bucket} buck2vicinity`, (err, stdout, stderr) => {
      if (err) {
        res.send(JSON.stringify({res: false, detail: 'fpViewer', url: `na`}));
        return console.log(err);
      }
      exec(`cd wave-decomposition; ln -s ${__dirname}/wave-decomposition/${dataset}/${dataset}_label.csv ${__dirname}/wave-decomposition/${vicinityName}/${vicinityName}_label.csv; make GRAPH=${vicinityName} PARENT=${dataset} fpViewer`, (err, stdout, stderr) => {
        if (err) {
          res.send(JSON.stringify({res: false, detail: 'fpViewer', url: `na`}));
          return console.log(err);
        }
        exec(`cd fpViewer; make GRAPH=${vicinityName} retrive`, (err, stdout, stderr) => {
          if (err) {
            res.send(JSON.stringify({res: false, detail: 'fpViewer', url: `na`}));
            return console.log(err);
          }
          res.send(JSON.stringify({res: true, detail: 'fpViewer', url: `fpViewer/index3_${vicinityName}.html`}));
        })
      })
    })
  }
})

// app.post('/city-vicinity-strata', (req, res) => {
//   const dataset = req.body.graphName;
//   const layer = req.body.layer;
//   const bucket = req.body.bucket;
//   const lcc = req.body.lcc;

//   const vicinityName = `${dataset}-l${layer}-b${bucket}`
//   const vicinityFileName = `${__dirname}/fpViewer/index3_${vicinityName}.html`;

//   if (fs.existsSync(vicinityFileName)) {
//     res.send(JSON.stringify({success: true, name: vicinityName}))
//   } else {
//     exec(`cd wave-decomposition; make GRAPH=${dataset} LAYER=${layer} BUCKET=${bucket} buck2vicinity`, (err, stdout, stderr) => {
//       if (err) {
//         res.send(JSON.stringify({res: false, detail: 'fpViewer', url: `na`}));
//         return console.log(err);
//       }
//       exec(`cd wave-decomposition; ln -s ${__dirname}/wave-decomposition/${dataset}/${dataset}_label.csv ${__dirname}/wave-decomposition/${vicinityName}/${vicinityName}_label.csv; make GRAPH=${vicinityName} PARENT=${dataset} fpViewer`, (err, stdout, stderr) => {
//         if (err) {
//           res.send(JSON.stringify({res: false, detail: 'fpViewer', url: `na`}));
//           return console.log(err);
//         }
//         exec(`cd fpViewer; make GRAPH=${vicinityName} retrive`, (err, stdout, stderr) => {
//           if (err) {
//             res.send(JSON.stringify({res: false, detail: 'fpViewer', url: `na`}));
//             return console.log(err);
//           }
//           res.send(JSON.stringify({res: true, detail: 'fpViewer', url: `fpViewer/index3_${vicinityName}.html`}));
//         })
//       })
//     })
//   }
// })

app.post('/building2strata', async (req, res) => {
  // console.log(req.body.suffix);
  const filename = req.body.filename;
  const dataset = req.body.graphName;
  const layer = req.body.layer;
  const lcc = req.body.lcc;
  const bucket = req.body.bucket;
  const maxEdge = req.body.maxEdges;
  const buildingName = req.body.buildingName;
  console.log(filename, dataset, layer, bucket, maxEdge);


  const waveDir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;
  const waveFileName = `layer-${layer}-waves-buck${bucket}.csv`;
  let node2edgeListCacheName = `${dataset}/${waveFileName}:node2edgeList`;

  const strataFilename = `${dataset}_${layer}-${lcc}`;

  if (!cache.has(node2edgeListCacheName, { updateAgeOnHas: true })) {
    const processPromise = readWaveAndVMapStream(filename, waveFileName, waveDir, dataset, null, null, true);
    console.log('no', filename);
    processPromise.then(async () => {
      const cachedData = cache.get(node2edgeListCacheName);
      const nodeEdges = Object.values(cachedData.data[0]).flat(1);
      const nodeVerts = Object.values(cachedData.data[1]).flat(1);
      const nodeLabels = await getNodeLabels(nodeVerts, dataset)
      send(strataFilename, nodeEdges, nodeLabels);
    })
  } else {
    const cachedData = cache.get(node2edgeListCacheName);
    if (cachedData.processingFlag) {
      // // still processing
      console.log('W: still processing data in /meta-dag-node');
      cachedData.processPromise.then(async () => {
        const updatedCachedData = cache.get(node2edgeListCacheName);
        const nodeEdges = Object.values(updatedCachedData.data[0]).flat(1);
        const nodeVerts = Object.values(updatedCachedData.data[1]).flat(1);
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        send(strataFilename, nodeEdges, nodeLabels);
      })
    } else {
      // // processed
      const nodeEdges = Object.values(cachedData.data[0]).flat(1);
      const nodeVerts = Object.values(cachedData.data[1]).flat(1);
      const nodeLabels = await getNodeLabels(nodeVerts, dataset)
      send(strataFilename, nodeEdges, nodeLabels);
    }
  }

  function send(filename, nodeEdges, nodeLabels) {
    const linkJsonList = [];
    console.log(nodeEdges, nodeLabels)
    const labelJsonList = [{source: "new_id", target: "name"}];
    for (const [src, tgt] of nodeEdges) {
      linkJsonList.push({source: src, target: tgt});
    }
    for (const [v, label] of nodeLabels) {
      labelJsonList.push({source: v, target: label});
    }
    console.log(filename);
    let content = JSON.stringify({
      filename: filename + ".csv",
      edges: linkJsonList
    });

    // console.log(content);
    httpGetAsync(strataAddress + "query?type=setdatadir&file=./temp", function(strataRes) {
      console.log(strataRes);
    });
    httpPostAsync(content, strataAddress + "save", function(strataRes) {
      console.log(strataRes)
      console.log(strataRes.errno)
      if (strataRes.errno == 0 || strataRes.errno == -17) {
        // // send labels to strata
        content = JSON.stringify({
          filename: filename + "_labels.csv",
          edges: labelJsonList
        });
        httpPostAsync(content, strataAddress + "save", function(strataRes) {
          console.log(strataRes)
          console.log(strataRes.errno)
          if (strataRes.errno == 0 || strataRes.errno == -17) {
            // console.log(true)
            res.send(JSON.stringify({res: true, detail: 'strata'}));
          } else {
            res.send(JSON.stringify({res: false, detail: 'strata'}));
          }
        });
      } else {
        res.send(JSON.stringify({res: false, detail: 'strata'}));
      }
    });
  }

})


app.post('/building2fpViewer', async (req, res) => {
  // console.log(req.body.suffix);
  const filename = req.body.filename;
  const dataset = req.body.graphName;
  const layer = req.body.layer;
  const lcc = req.body.lcc;
  const bucket = req.body.bucket;
  const maxEdge = req.body.maxEdges;
  const buildingName = req.body.buildingName;
  console.log(filename, dataset, layer, bucket, maxEdge);


  const waveDir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;
  const waveFileName = `layer-${layer}-waves-buck${bucket}.csv`;
  let node2edgeListCacheName = `${dataset}/${waveFileName}:node2edgeList`;

  const strataFilename = `${dataset}_${layer}-${lcc}`;
  const fpViewerFileName = `${__dirname}/fpViewer/index3_${strataFilename}.html`;
  // if (fs.existsSync(fpViewerFileName)) {
  //   console.log(fpViewerFileName, 'exists')
  //   res.send(JSON.stringify({res: true, detail: 'fpViewer exist', url: `fpViewer/index3_${strataFilename}.html`}));
  //   return;
  // }

  // fs.writeFile(`${__dirname}/fpViewer/${strataFilename}-metaDag.json`, JSON.stringify({nodes: [], links: []}), (err) => {
  //   if (err) {
  //     console.log(err);
  //   }
  // });

  // fs.writeFile(`${__dirname}/fpViewer/${strataFilename}-wfGlobal.json`, JSON.stringify([null, null]), (err) => {
  //   if (err) {
  //     console.log(err);
  //   }
  // });


  if (!cache.has(node2edgeListCacheName, { updateAgeOnHas: true })) {
    const processPromise = readWaveAndVMapStream(filename, waveFileName, waveDir, dataset, null, null, true);
    console.log('no', filename);
    processPromise.then(async () => {
      const cachedData = cache.get(node2edgeListCacheName);
      const nodeEdges = Object.values(cachedData.data[0]).flat(1);
      const nodeVerts = Object.values(cachedData.data[1]).flat(1);
      const nodeLabels = await getNodeLabels(nodeVerts, dataset)
      send(strataFilename, nodeEdges, nodeLabels);
    })
  } else {
    const cachedData = cache.get(node2edgeListCacheName);
    if (cachedData.processingFlag) {
      // // still processing
      console.log('W: still processing data in /meta-dag-node');
      cachedData.processPromise.then(async () => {
        const updatedCachedData = cache.get(node2edgeListCacheName);
        const nodeEdges = Object.values(updatedCachedData.data[0]).flat(1);
        const nodeVerts = Object.values(updatedCachedData.data[1]).flat(1);
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        send(strataFilename, nodeEdges, nodeLabels);
      })
    } else {
      // // processed
      const nodeEdges = Object.values(cachedData.data[0]).flat(1);
      const nodeVerts = Object.values(cachedData.data[1]).flat(1);
      const nodeLabels = await getNodeLabels(nodeVerts, dataset)
      send(strataFilename, nodeEdges, nodeLabels);
    }
  }

  function send(filename, nodeEdges, nodeLabels) {
    const localDir = `${__dirname}/wave-decomposition/${filename}`
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir)
    }
    fs.writeFile(`${localDir}/${filename}.txt`, nodeEdges.map(d => `${d[0]}\t${d[1]}`).join('\n'), function (err, data) {
      if (err) {
        // res.send(JSON.stringify({res: false, detail: 'fpViewer', url: `na`}));
        console.log(err);
      }
      fs.writeFile(`${localDir}/${filename}_names.csv`, nodeLabels.map(d => `"${d[0]}","${d[1]}"`).join('\n'), function (err, data) {
        if (err) {
          // res.send(JSON.stringify({res: false, detail: 'fpViewer', url: `na`}));
          console.log(err);
        }
      })
      exec(`cd wave-decomposition; make GRAPH=${filename} PARENT=${dataset} fpViewer`, (err, stdout, stderr) => {
        if (err) {
          // res.send(JSON.stringify({res: false, detail: 'fpViewer', url: `na`}));
          console.log(err);
        }
        exec(`cd fpViewer; make GRAPH=${filename} BLDGFILE=${filename} SINGLEBUILDING=true retrive`, (err, stdout, stderr) => {
          if (err) {
            // res.send(JSON.stringify({res: false, detail: 'fpViewer', url: `na`}));
            console.log(err);
          }
          exec(`ln -s ${__dirname}/wave-decomposition/${dataset}/cityMesh/wavemap_${buildingName.slice(8)}_color.txt ${__dirname}/fpViewer/${strataFilename}_color.txt`, (err, stdout, stderr) => {
            if (err) {
              // res.send(JSON.stringify({res: false, detail: 'fpViewer', url: `na`}));
              console.log(err);
            }
            exec(`ln -s ${__dirname}/wave-decomposition/${dataset}/cityMesh/wavemap_${buildingName.slice(8)}_floor.txt ${__dirname}/fpViewer/${strataFilename}_floor.txt`, (err, stdout, stderr) => {
              if (err) {
                // res.send(JSON.stringify({res: false, detail: 'fpViewer', url: `na`}));
                console.log(err);
              }
              res.send(JSON.stringify({res: true, detail: 'fpViewer', url: `fpViewer/index3_${filename}.html`}));
            })
          })
        })
      })
    })
  
  }

})


app.post('/edgeCut2strata', (req, res) => {

  // console.log(req.body.suffix);
  const filename = req.body.filename;
  const dataset = req.body.graphName;
  const layer = req.body.layer;
  const bucket = req.body.bucket;
  const metaNode = req.body.metaNode;
  const lcc = req.body.lcc;
  const buildingName = req.body.buildingName;
  console.log(filename, dataset, layer, bucket, metaNode);

  const retInfo = {
    filename: filename, 
    dataset: dataset, 
    layer: layer, 
    lcc: lcc,
    bucket: bucket,
    buildingName: buildingName
  }

  const dagFilePrefix = `${__dirname}/${filename}`;
  // const dagLinkFile = `${dagFilePrefix}.link`;
  const dagLinkFile = `${dagFilePrefix}.span.link`;
  const dagJumpLinkFile = `${dagFilePrefix}.span.link.jump`;
  const dagNodeFile = `${dagFilePrefix}.node`;
  const metaVMapFile = `${dagFilePrefix}.edgeCut.vmap`;
  const dagCacheName = `${dataset}/${filename}.dag`;
  // const retName = 'edgeCut.dag'

  let nodeIDList;
  if (!cache.has(dagCacheName, {updateAgeOnHas: true})) {
    // // not in the cache
    const processPromise = readDagNodeLinkByMetaStream(dagCacheName, dagNodeFile, dagLinkFile, dagJumpLinkFile, metaVMapFile);
    processPromise.then(() => {
      const cachedData = cache.get(dagCacheName);
      nodeIDList = cachedData.data[0][metaNode].map(d => d[0]);
      processNodeIDList(nodeIDList)
      // const retData = [
      //   cachedData.data[0][metaNode], // node
      //   cachedData.data[1][metaNode], // link
      //   // cachedData.data[2][metaNode], // jumpLink
      // ]
      // res.send(JSON.stringify([retData, retInfo, retName]));
    })
  } else {
    // // in the cache
    const cachedData = cache.get(dagCacheName);
    if (cachedData.processingFlag) {
      // // still processing
      console.log('W: still processing data in /meta-dag-edgeCut');
      cachedData.processPromise.then(() => {
        const updatedCachedData = cache.get(dagCacheName);
        nodeIDList = updatedCachedData.data[0][metaNode].map(d => d[0]);
        processNodeIDList(nodeIDList)
        // const retData = [
        //   updatedCachedData.data[0][metaNode], // node
        //   updatedCachedData.data[1][metaNode], // link
        //   // updatedCachedData.data[2][metaNode], // jumpLink
        // ]
        // res.send(JSON.stringify([retData, retInfo, retName]));
      })
    } else {
      // // processed
      nodeIDList = cachedData.data[0][metaNode].map(d => d[0]);
      processNodeIDList(nodeIDList)
      // const retData = [
      //   cachedData.data[0][metaNode], // node
      //   cachedData.data[1][metaNode], // link
      //   // cachedData.data[2][metaNode], // jumpLink
      // ]
      // res.send(JSON.stringify([retData, retInfo, retName]));
    }
  }

  // // console.log(req.body.suffix);
  // const filename = req.body.filename;
  // const dataset = req.body.graphName;
  // const layer = req.body.layer;
  // const lcc = req.body.lcc;
  // const bucket = req.body.bucket;
  // const maxEdge = req.body.maxEdges;
  // console.log(filename, dataset, layer, bucket, maxEdge);

  async function processNodeIDList(nodeIDList) {
    console.log(nodeIDList);
    console.log(nodeIDList.length);
    const waveDir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;
    const waveFileName = `layer-${layer}-waves-buck${bucket}.csv`;
    let node2edgeListCacheName = `${dataset}/${waveFileName}:node2edgeList`;
  
    const strataFilename = `${dataset}_${layer}-${lcc}-EC${metaNode}`;
  
    // fs.writeFile(`${__dirname}/fpViewer/${strataFilename}-metaDag.json`, JSON.stringify({nodes: [], links: []}), (err) => {
    //   if (err) {
    //     console.log(err);
    //   }
    // });
  
    // fs.writeFile(`${__dirname}/fpViewer/${strataFilename}-wfGlobal.json`, JSON.stringify([null, null]), (err) => {
    //   if (err) {
    //     console.log(err);
    //   }
    // });
  
    if (!cache.has(node2edgeListCacheName, { updateAgeOnHas: true })) {
      const processPromise = readWaveAndVMapStream(filename, waveFileName, waveDir, dataset, null, null, true);
      console.log('no', filename);
      processPromise.then(async () => {
        const cachedData = cache.get(node2edgeListCacheName);
        const nodeEdges = nodeIDList.map(d => cachedData.data[0][d]).flat(1).filter(d => d != null)
        const nodeVerts = nodeIDList.map(d => cachedData.data[1][d]).flat(1).filter(d => d != null)
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        send(strataFilename, nodeEdges, nodeLabels);
      })
    } else {
      const cachedData = cache.get(node2edgeListCacheName);
      if (cachedData.processingFlag) {
        // // still processing
        console.log('W: still processing data in /meta-dag-node');
        cachedData.processPromise.then(async () => {
          const updatedCachedData = cache.get(node2edgeListCacheName);
          const nodeEdges = nodeIDList.map(d => updatedCachedData.data[0][d]).flat(1).filter(d => d != null)
          const nodeVerts = nodeIDList.map(d => updatedCachedData.data[1][d]).flat(1).filter(d => d != null)
          const nodeLabels = await getNodeLabels(nodeVerts, dataset)
          send(strataFilename, nodeEdges, nodeLabels);
        })
      } else {
        // // processed
        const nodeEdges = nodeIDList.map(d => cachedData.data[0][d]).flat(1).filter(d => d != null)
        const nodeVerts = nodeIDList.map(d => cachedData.data[1][d]).flat(1).filter(d => d != null)
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        send(strataFilename, nodeEdges, nodeLabels);
      }
    }
  }

  function send(filename, nodeEdges, nodeLabels) {
    const linkJsonList = [];
    // console.log(nodeEdges, nodeLabels)
    const labelJsonList = [{source: "new_id", target: "name"}];
    for (const [src, tgt] of nodeEdges) {
      linkJsonList.push({source: src, target: tgt});
    }
    for (const [v, label] of nodeLabels) {
      labelJsonList.push({source: v, target: label});
    }
    console.log(filename);
    let content = JSON.stringify({
      filename: filename + ".csv",
      edges: linkJsonList
    });

    // console.log(content);
    httpGetAsync(strataAddress + "query?type=setdatadir&file=./temp", function(strataRes) {
      console.log(strataRes);
    });
    httpPostAsync(content, strataAddress + "save", function(strataRes) {
      console.log(strataRes)
      console.log(strataRes.errno)
      if (strataRes.errno == 0 || strataRes.errno == -17) {
        // // send labels to strata
        content = JSON.stringify({
          filename: filename + "_labels.csv",
          edges: labelJsonList
        });
        httpPostAsync(content, strataAddress + "save", function(strataRes) {
          console.log(strataRes)
          console.log(strataRes.errno)
          if (strataRes.errno == 0 || strataRes.errno == -17) {
            // console.log(true)
            res.send(JSON.stringify({res: true, detail: 'strata'}));
          } else {
            res.send(JSON.stringify({res: false, detail: 'strata'}));
          }
        });
      } else {
        res.send(JSON.stringify({res: false, detail: 'strata'}));
      }
    });
  }

})

app.post('/edgeCut2fpviewer', (req, res) => {

  // console.log(req.body.suffix);
  const filename = req.body.filename;
  const dataset = req.body.graphName;
  const layer = req.body.layer;
  const bucket = req.body.bucket;
  const metaNode = req.body.metaNode;
  const lcc = req.body.lcc;
  const buildingName = req.body.buildingName;
  console.log(filename, dataset, layer, bucket, metaNode);

  const retInfo = {
    filename: filename, 
    dataset: dataset, 
    layer: layer, 
    lcc: lcc,
    bucket: bucket,
    buildingName: buildingName
  }

  const dagFilePrefix = `${__dirname}/${filename}`;
  // const dagLinkFile = `${dagFilePrefix}.link`;
  const dagLinkFile = `${dagFilePrefix}.span.link`;
  const dagJumpLinkFile = `${dagFilePrefix}.span.link.jump`;
  const dagNodeFile = `${dagFilePrefix}.node`;
  const metaVMapFile = `${dagFilePrefix}.edgeCut.vmap`;
  const dagCacheName = `${dataset}/${filename}.dag`;
  // const retName = 'edgeCut.dag'

  const strataFilename = `${dataset}_${layer}-${lcc}-EC${metaNode}`;
  const fpViewerFileName = `${__dirname}/fpViewer/index3_${strataFilename}.html`;
  if (fs.existsSync(fpViewerFileName)) {
    console.log(fpViewerFileName, 'exists')
    res.send(JSON.stringify({res: true, detail: 'fpViewer exist', url: `fpViewer/index3_${strataFilename}.html`}));
    return;
  }

  let nodeIDList;
  if (!cache.has(dagCacheName, {updateAgeOnHas: true})) {
    // // not in the cache
    const processPromise = readDagNodeLinkByMetaStream(dagCacheName, dagNodeFile, dagLinkFile, dagJumpLinkFile, metaVMapFile);
    processPromise.then(() => {
      const cachedData = cache.get(dagCacheName);
      nodeIDList = cachedData.data[0][metaNode].map(d => d[0]);
      processNodeIDList(nodeIDList)
      // const retData = [
      //   cachedData.data[0][metaNode], // node
      //   cachedData.data[1][metaNode], // link
      //   // cachedData.data[2][metaNode], // jumpLink
      // ]
      // res.send(JSON.stringify([retData, retInfo, retName]));
    })
  } else {
    // // in the cache
    const cachedData = cache.get(dagCacheName);
    if (cachedData.processingFlag) {
      // // still processing
      console.log('W: still processing data in /meta-dag-edgeCut');
      cachedData.processPromise.then(() => {
        const updatedCachedData = cache.get(dagCacheName);
        nodeIDList = updatedCachedData.data[0][metaNode].map(d => d[0]);
        processNodeIDList(nodeIDList)
        // const retData = [
        //   updatedCachedData.data[0][metaNode], // node
        //   updatedCachedData.data[1][metaNode], // link
        //   // updatedCachedData.data[2][metaNode], // jumpLink
        // ]
        // res.send(JSON.stringify([retData, retInfo, retName]));
      })
    } else {
      // // processed
      nodeIDList = cachedData.data[0][metaNode].map(d => d[0]);
      processNodeIDList(nodeIDList)
      // const retData = [
      //   cachedData.data[0][metaNode], // node
      //   cachedData.data[1][metaNode], // link
      //   // cachedData.data[2][metaNode], // jumpLink
      // ]
      // res.send(JSON.stringify([retData, retInfo, retName]));
    }
  }

  // // console.log(req.body.suffix);
  // const filename = req.body.filename;
  // const dataset = req.body.graphName;
  // const layer = req.body.layer;
  // const lcc = req.body.lcc;
  // const bucket = req.body.bucket;
  // const maxEdge = req.body.maxEdges;
  // console.log(filename, dataset, layer, bucket, maxEdge);

  async function processNodeIDList(nodeIDList) {
    const waveDir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;
    const waveFileName = `layer-${layer}-waves-buck${bucket}.csv`;
    let node2edgeListCacheName = `${dataset}/${waveFileName}:node2edgeList`;
  
    const strataFilename = `${dataset}_${layer}-${lcc}-EC${metaNode}`;
  
    if (!cache.has(node2edgeListCacheName, { updateAgeOnHas: true })) {
      const processPromise = readWaveAndVMapStream(filename, waveFileName, waveDir, dataset, null, null, true);
      console.log('no', filename);
      processPromise.then(async () => {
        const cachedData = cache.get(node2edgeListCacheName);
        const nodeEdges = nodeIDList.map(d => cachedData.data[0][d]).flat(1).filter(d => d != null)
        const nodeVerts = nodeIDList.map(d => cachedData.data[1][d]).flat(1).filter(d => d != null)
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        send(strataFilename, nodeEdges, nodeLabels);
      })
    } else {
      const cachedData = cache.get(node2edgeListCacheName);
      if (cachedData.processingFlag) {
        // // still processing
        console.log('W: still processing data in /meta-dag-node');
        cachedData.processPromise.then(async () => {
          const updatedCachedData = cache.get(node2edgeListCacheName);
          const nodeEdges = nodeIDList.map(d => updatedCachedData.data[0][d]).flat(1).filter(d => d != null)
          const nodeVerts = nodeIDList.map(d => updatedCachedData.data[1][d]).flat(1).filter(d => d != null)
          const nodeLabels = await getNodeLabels(nodeVerts, dataset)
          send(strataFilename, nodeEdges, nodeLabels);
        })
      } else {
        // // processed
        const nodeEdges = nodeIDList.map(d => cachedData.data[0][d]).flat(1).filter(d => d != null)
        const nodeVerts = nodeIDList.map(d => cachedData.data[1][d]).flat(1).filter(d => d != null)
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        send(strataFilename, nodeEdges, nodeLabels);
      }
    }
  }


  function send(filename, nodeEdges, nodeLabels) {
    const localDir = `${__dirname}/wave-decomposition/${filename}`
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir)
      fs.writeFile(`${localDir}/${filename}.txt`, nodeEdges.map(d => `${d[0]}\t${d[1]}`).join('\n'), function (err, data) {
        if (err) {
          res.send(JSON.stringify({res: false, detail: 'fpViewer', url: `na`}));
          return console.log(err);
        }
        fs.writeFile(`${localDir}/${filename}_names.csv`, nodeLabels.map(d => `"${d[0]}","${d[1]}"`).join('\n'), function (err, data) {
          if (err) {
            res.send(JSON.stringify({res: false, detail: 'fpViewer', url: `na`}));
            return console.log(err);
          }
        })
        exec(`cd wave-decomposition; make GRAPH=${filename} PARENT=${dataset} fpViewer`, (err, stdout, stderr) => {
          if (err) {
            res.send(JSON.stringify({res: false, detail: 'fpViewer', url: `na`}));
            return console.log(err);
          }
          exec(`cd fpViewer; make GRAPH=${filename} MININODE=${metaNode} retrive`, (err, stdout, stderr) => {
            if (err) {
              res.send(JSON.stringify({res: false, detail: 'fpViewer', url: `na`}));
              return console.log(err);
            }
          })
          res.send(JSON.stringify({res: true, detail: 'fpViewer', url: `fpViewer/index3_${filename}.html`}));
        })
      })
    } else {
      console.log(localDir, 'exists')
      res.send(JSON.stringify({res: true, detail: 'fpViewer exist', url: `fpViewer/index3_${filename}.html`}));
    }
  }

})


app.post('/wcc2strata', (req, res) => {

  // console.log(req.body.suffix);
  const filename = req.body.filename;
  const dataset = req.body.graphName;
  const layer = req.body.layer;
  const bucket = req.body.bucket;
  const metaNode = req.body.metaNode;
  const lcc = req.body.lcc;
  const buildingName = req.body.buildingName;
  console.log(filename, dataset, layer, bucket, metaNode);

  const retInfo = {
    filename: filename, 
    dataset: dataset, 
    layer: layer, 
    lcc: lcc,
    bucket: bucket,
    buildingName: buildingName
  }

  const dagFilePrefix = `${__dirname}/${filename}`;
  // const dagLinkFile = `${dagFilePrefix}.link`;
  const dagLinkFile = `${dagFilePrefix}.span.link`;
  const dagJumpLinkFile = `${dagFilePrefix}.span.link.jump`;
  const dagNodeFile = `${dagFilePrefix}.node`;
  const metaVMapFile = `${dagFilePrefix}.wcc.vmap`;
  const dagCacheName = `${dataset}/${filename}.dag`;
  // const retName = 'wcc.dag'

  let nodeIDList;
  if (!cache.has(dagCacheName, {updateAgeOnHas: true})) {
    // // not in the cache
    const processPromise = readDagNodeLinkByWccStream(dagCacheName, dagNodeFile, dagLinkFile, dagJumpLinkFile, metaVMapFile);
    processPromise.then(() => {
      const cachedData = cache.get(dagCacheName);
      nodeIDList = cachedData.data[0][metaNode].map(d => d[0]);
      processNodeIDList(nodeIDList)
      // const retData = [
      //   cachedData.data[0][metaNode], // node
      //   cachedData.data[1][metaNode], // link
      //   // cachedData.data[2][metaNode], // jumpLink
      // ]
      // res.send(JSON.stringify([retData, retInfo, retName]));
    })
  } else {
    // // in the cache
    const cachedData = cache.get(dagCacheName);
    if (cachedData.processingFlag) {
      // // still processing
      console.log('W: still processing data in /meta-dag-wcc');
      cachedData.processPromise.then(() => {
        const updatedCachedData = cache.get(dagCacheName);
        nodeIDList = updatedCachedData.data[0][metaNode].map(d => d[0]);
        processNodeIDList(nodeIDList)
        // const retData = [
        //   updatedCachedData.data[0][metaNode], // node
        //   updatedCachedData.data[1][metaNode], // link
        //   // updatedCachedData.data[2][metaNode], // jumpLink
        // ]
        // res.send(JSON.stringify([retData, retInfo, retName]));
      })
    } else {
      // // processed
      nodeIDList = cachedData.data[0][metaNode].map(d => d[0]);
      processNodeIDList(nodeIDList)
      // const retData = [
      //   cachedData.data[0][metaNode], // node
      //   cachedData.data[1][metaNode], // link
      //   // cachedData.data[2][metaNode], // jumpLink
      // ]
      // res.send(JSON.stringify([retData, retInfo, retName]));
    }
  }

  // // console.log(req.body.suffix);
  // const filename = req.body.filename;
  // const dataset = req.body.graphName;
  // const layer = req.body.layer;
  // const lcc = req.body.lcc;
  // const bucket = req.body.bucket;
  // const maxEdge = req.body.maxEdges;
  // console.log(filename, dataset, layer, bucket, maxEdge);

  async function processNodeIDList(nodeIDList) {
    // console.log(nodeIDList);
    console.log(nodeIDList.length);
    const waveDir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;
    const waveFileName = `layer-${layer}-waves-buck${bucket}.csv`;
    let node2edgeListCacheName = `${dataset}/${waveFileName}:node2edgeList`;
  
    const strataFilename = `${dataset}_${layer}-${lcc}-wcc${metaNode}`;
  
    fs.writeFile(`${__dirname}/fpViewer/${strataFilename}-metaDag.json`, JSON.stringify({nodes: [], links: []}), (err) => {
      if (err) {
        console.log(err);
      }
    });
  
    fs.writeFile(`${__dirname}/fpViewer/${strataFilename}-wfGlobal.json`, JSON.stringify([null, null]), (err) => {
      if (err) {
        console.log(err);
      }
    });
  
    if (!cache.has(node2edgeListCacheName, { updateAgeOnHas: true })) {
      const processPromise = readWaveAndVMapStream(filename, waveFileName, waveDir, dataset, null, null, true);
      console.log('no', filename);
      processPromise.then(async () => {
        const cachedData = cache.get(node2edgeListCacheName);
        const nodeEdges = nodeIDList.map(d => cachedData.data[0][d]).flat(1).filter(d => d != null)
        const nodeVerts = nodeIDList.map(d => cachedData.data[1][d]).flat(1).filter(d => d != null)
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        send(strataFilename, nodeEdges, nodeLabels);
      })
    } else {
      const cachedData = cache.get(node2edgeListCacheName);
      if (cachedData.processingFlag) {
        // // still processing
        console.log('W: still processing data in /meta-dag-node');
        cachedData.processPromise.then(async () => {
          const updatedCachedData = cache.get(node2edgeListCacheName);
          const nodeEdges = nodeIDList.map(d => updatedCachedData.data[0][d]).flat(1).filter(d => d != null)
          const nodeVerts = nodeIDList.map(d => updatedCachedData.data[1][d]).flat(1).filter(d => d != null)
          const nodeLabels = await getNodeLabels(nodeVerts, dataset)
          send(strataFilename, nodeEdges, nodeLabels);
        })
      } else {
        // // processed
        const nodeEdges = nodeIDList.map(d => cachedData.data[0][d]).flat(1).filter(d => d != null)
        const nodeVerts = nodeIDList.map(d => cachedData.data[1][d]).flat(1).filter(d => d != null)
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        send(strataFilename, nodeEdges, nodeLabels);
      }
    }
  }

  function send(filename, nodeEdges, nodeLabels) {
    const linkJsonList = [];
    // console.log(nodeEdges, nodeLabels)
    const labelJsonList = [{source: "new_id", target: "name"}];
    for (const [src, tgt] of nodeEdges) {
      linkJsonList.push({source: src, target: tgt});
    }
    for (const [v, label] of nodeLabels) {
      labelJsonList.push({source: v, target: label});
    }
    console.log(filename);
    let content = JSON.stringify({
      filename: filename + ".csv",
      edges: linkJsonList
    });

    // console.log(content);
    httpGetAsync(strataAddress + "query?type=setdatadir&file=./temp", function(strataRes) {
      console.log(strataRes);
    });
    httpPostAsync(content, strataAddress + "save", function(strataRes) {
      console.log(strataRes)
      console.log(strataRes.errno)
      if (strataRes.errno == 0 || strataRes.errno == -17) {
        // // send labels to strata
        content = JSON.stringify({
          filename: filename + "_labels.csv",
          edges: labelJsonList
        });
        httpPostAsync(content, strataAddress + "save", function(strataRes) {
          console.log(strataRes)
          console.log(strataRes.errno)
          if (strataRes.errno == 0 || strataRes.errno == -17) {
            // console.log(true)
            res.send(JSON.stringify({res: true, detail: 'strata'}));
          } else {
            res.send(JSON.stringify({res: false, detail: 'strata'}));
          }
        });
      } else {
        res.send(JSON.stringify({res: false, detail: 'strata'}));
      }
    });
  }

})

app.post('/wcc2fpviewer', (req, res) => {

  // console.log(req.body.suffix);
  const filename = req.body.filename;
  const dataset = req.body.graphName;
  const layer = req.body.layer;
  const bucket = req.body.bucket;
  const metaNode = req.body.metaNode;
  const lcc = req.body.lcc;
  const buildingName = req.body.buildingName;
  console.log(filename, dataset, layer, bucket, metaNode);

  const retInfo = {
    filename: filename, 
    dataset: dataset, 
    layer: layer, 
    lcc: lcc,
    bucket: bucket,
    buildingName: buildingName
  }

  const dagFilePrefix = `${__dirname}/${filename}`;
  // const dagLinkFile = `${dagFilePrefix}.link`;
  const dagLinkFile = `${dagFilePrefix}.span.link`;
  const dagJumpLinkFile = `${dagFilePrefix}.span.link.jump`;
  const dagNodeFile = `${dagFilePrefix}.node`;
  const metaVMapFile = `${dagFilePrefix}.wcc.vmap`;
  const dagCacheName = `${dataset}/${filename}.dag`;
  // const retName = 'wcc.dag'

  const strataFilename = `${dataset}_${layer}-${lcc}-wcc${metaNode}`;
  const fpViewerFileName = `${__dirname}/fpViewer/index3_${strataFilename}.html`;
  if (fs.existsSync(fpViewerFileName)) {
    console.log(fpViewerFileName, 'exists')
    res.send(JSON.stringify({res: true, detail: 'fpViewer exist', url: `fpViewer/index3_${strataFilename}.html`}));
    return;
  }

  let nodeIDList;
  if (!cache.has(dagCacheName, {updateAgeOnHas: true})) {
    // // not in the cache
    const processPromise = readDagNodeLinkByWccStream(dagCacheName, dagNodeFile, dagLinkFile, dagJumpLinkFile, metaVMapFile);
    processPromise.then(() => {
      const cachedData = cache.get(dagCacheName);
      nodeIDList = cachedData.data[0][metaNode].map(d => d[0]);
      processNodeIDList(nodeIDList)
      // const retData = [
      //   cachedData.data[0][metaNode], // node
      //   cachedData.data[1][metaNode], // link
      //   // cachedData.data[2][metaNode], // jumpLink
      // ]
      // res.send(JSON.stringify([retData, retInfo, retName]));
    })
  } else {
    // // in the cache
    const cachedData = cache.get(dagCacheName);
    if (cachedData.processingFlag) {
      // // still processing
      console.log('W: still processing data in /meta-dag-wcc');
      cachedData.processPromise.then(() => {
        const updatedCachedData = cache.get(dagCacheName);
        nodeIDList = updatedCachedData.data[0][metaNode].map(d => d[0]);
        processNodeIDList(nodeIDList)
        // const retData = [
        //   updatedCachedData.data[0][metaNode], // node
        //   updatedCachedData.data[1][metaNode], // link
        //   // updatedCachedData.data[2][metaNode], // jumpLink
        // ]
        // res.send(JSON.stringify([retData, retInfo, retName]));
      })
    } else {
      // // processed
      nodeIDList = cachedData.data[0][metaNode].map(d => d[0]);
      processNodeIDList(nodeIDList)
      // const retData = [
      //   cachedData.data[0][metaNode], // node
      //   cachedData.data[1][metaNode], // link
      //   // cachedData.data[2][metaNode], // jumpLink
      // ]
      // res.send(JSON.stringify([retData, retInfo, retName]));
    }
  }

  // // console.log(req.body.suffix);
  // const filename = req.body.filename;
  // const dataset = req.body.graphName;
  // const layer = req.body.layer;
  // const lcc = req.body.lcc;
  // const bucket = req.body.bucket;
  // const maxEdge = req.body.maxEdges;
  // console.log(filename, dataset, layer, bucket, maxEdge);

  async function processNodeIDList(nodeIDList) {
    const waveDir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;
    const waveFileName = `layer-${layer}-waves-buck${bucket}.csv`;
    let node2edgeListCacheName = `${dataset}/${waveFileName}:node2edgeList`;
  
    const strataFilename = `${dataset}_${layer}-${lcc}-wcc${metaNode}`;
  
    if (!cache.has(node2edgeListCacheName, { updateAgeOnHas: true })) {
      const processPromise = readWaveAndVMapStream(filename, waveFileName, waveDir, dataset, null, null, true);
      console.log('no', filename);
      processPromise.then(async () => {
        const cachedData = cache.get(node2edgeListCacheName);
        const nodeEdges = nodeIDList.map(d => cachedData.data[0][d]).flat(1).filter(d => d != null)
        const nodeVerts = nodeIDList.map(d => cachedData.data[1][d]).flat(1).filter(d => d != null)
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        send(strataFilename, nodeEdges, nodeLabels);
      })
    } else {
      const cachedData = cache.get(node2edgeListCacheName);
      if (cachedData.processingFlag) {
        // // still processing
        console.log('W: still processing data in /meta-dag-node');
        cachedData.processPromise.then(async () => {
          const updatedCachedData = cache.get(node2edgeListCacheName);
          const nodeEdges = nodeIDList.map(d => updatedCachedData.data[0][d]).flat(1).filter(d => d != null)
          const nodeVerts = nodeIDList.map(d => updatedCachedData.data[1][d]).flat(1).filter(d => d != null)
          const nodeLabels = await getNodeLabels(nodeVerts, dataset)
          send(strataFilename, nodeEdges, nodeLabels);
        })
      } else {
        // // processed
        const nodeEdges = nodeIDList.map(d => cachedData.data[0][d]).flat(1).filter(d => d != null)
        const nodeVerts = nodeIDList.map(d => cachedData.data[1][d]).flat(1).filter(d => d != null)
        const nodeLabels = await getNodeLabels(nodeVerts, dataset)
        send(strataFilename, nodeEdges, nodeLabels);
      }
    }
  }


  function send(filename, nodeEdges, nodeLabels) {
    const localDir = `${__dirname}/wave-decomposition/${filename}`
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir)
      fs.writeFile(`${localDir}/${filename}.txt`, nodeEdges.map(d => `${d[0]}\t${d[1]}`).join('\n'), function (err, data) {
        if (err) {
          res.send(JSON.stringify({res: false, detail: 'fpViewer', url: `na`}));
          return console.log(err);
        }
        fs.writeFile(`${localDir}/${filename}_names.csv`, nodeLabels.map(d => `"${d[0]}","${d[1]}"`).join('\n'), function (err, data) {
          if (err) {
            res.send(JSON.stringify({res: false, detail: 'fpViewer', url: `na`}));
            return console.log(err);
          }
        })
        exec(`cd wave-decomposition; make GRAPH=${filename} PARENT=${dataset} fpViewer`, (err, stdout, stderr) => {
          if (err) {
            res.send(JSON.stringify({res: false, detail: 'fpViewer', url: `na`}));
            return console.log(err);
          }
          exec(`cd fpViewer; make GRAPH=${filename} MININODE=${metaNode} retrive`, (err, stdout, stderr) => {
            if (err) {
              res.send(JSON.stringify({res: false, detail: 'fpViewer', url: `na`}));
              return console.log(err);
            }
          })
          res.send(JSON.stringify({res: true, detail: 'fpViewer', url: `fpViewer/index3_${filename}.html`}));
        })
      })
    } else {
      console.log(localDir, 'exists')
      res.send(JSON.stringify({res: true, detail: 'fpViewer exist', url: `fpViewer/index3_${filename}.html`}));
    }
  }

})


app.post('/meta-dag-label', async (req, res) => {
  const filename = req.body.filename;
  const dataset = req.body.graphName;
  const layer = req.body.layer;
  const bucket = req.body.bucket;
  const metaNode = req.body.metaNode;
  const lcc = req.body.lcc;
  const wfInfo = req.body.wfInfo;
  const tempGraphIdx = req.body.tempGraphIdx;

  const retInfo = {
    filename: filename, 
    dataset: dataset, 
    layer: layer, 
    lcc: lcc,
    bucket: bucket,
    tempGraphIdx: tempGraphIdx
  }

  const wavefile = `layer-${layer}-waves-buck${bucket}.csv`;
  const dir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;

  const waveDir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;
  const waveFileName = `layer-${layer}-waves-buck${bucket}.csv`;
  let node2edgeListCacheName = `${dataset}/${waveFileName}:node2edgeList`;



  const rawFragMapFileName = `${waveDir}/layer-${layer}-waves-buck${bucket}-fragMap.json`;
  let cacheWave, cacheFrag;
  if (fs.existsSync(rawFragMapFileName)) {
    if (!cache.has(rawFragMapFileName, {updateAgeOnHas: true})) {
      const processPromise =  processRawFragMap(rawFragMapFileName)
      processPromise.then(() => {
        const cachedMap = cache.get(rawFragMapFileName);
        if (cachedMap.type === 'dagNodeLink.wf.fragMap.null') {
          // read full
        } else {
          const wfName = cachedMap.data[1][wfInfo[0]][wfInfo[1]];
          node2edgeListCacheName += `-${wfName[0]}-${wfName[1]}`;
          cacheWave = wfName[0];
          cacheFrag = wfName[1];
        }
      })
    } else {
      const cachedMap = cache.get(rawFragMapFileName);
      if (cachedMap.type === 'dagNodeLink.wf.fragMap.null') {
        // read full
      } else {
        const wfName = cachedMap.data[1][wfInfo[0]][wfInfo[1]];
        node2edgeListCacheName += `-${wfName[0]}-${wfName[1]}`;
        cacheWave = wfName[0];
        cacheFrag = wfName[1];
      }
    }
  }
  

  const strataFilename = Array.isArray(metaNode) ? `${dataset}_${layer}-${lcc}_${metaNode[0]}` : `${dataset}_${layer}-${lcc}_${metaNode}`;
  
  let readyFlag = true;
  let vMap = undefined;
  let waveList = undefined;
  if (!cache.has(node2edgeListCacheName, {updateAgeOnHas: true})) {
    const processPromise = readWaveAndVMapStream(filename, waveFileName, waveDir, dataset, cacheWave, cacheFrag, true);
    console.log('no', filename);
    processPromise.then(async () => {
      const cachedData = cache.get(node2edgeListCacheName);
        // const nodeEdges = metaNode.map(d => cachedData.data[0][d]).flat(1)
        const nodeVerts = {};
        metaNode.forEach(d => nodeVerts[d] = cachedData.data[1][d])
        const nodeLabels = await getImportantNodeLabels(nodeVerts, dataset)
        send(nodeLabels);
    })
  } else {
    const cachedData = cache.get(node2edgeListCacheName);
    if (cachedData.processingFlag) {
      // // still processing
      console.log('W: still processing data in /meta-dag-node');
      cachedData.processPromise.then(async () => {
        const updatedCachedData = cache.get(node2edgeListCacheName);
        // const nodeEdges = metaNode.map(d => updatedCachedData.data[0][d]).flat(1)
        const nodeVerts = {};
        metaNode.forEach(d => nodeVerts[d] = updatedCachedData.data[1][d])
        const nodeLabels = await getImportantNodeLabels(nodeVerts, dataset)
        send(nodeLabels);
      })
    } else {
      // // processed
      // const nodeEdges = metaNode.map(d => cachedData.data[0][d]).flat(1)
      const nodeVerts = {};
      metaNode.forEach(d => nodeVerts[d] = cachedData.data[1][d])
      const nodeLabels = await getImportantNodeLabels(nodeVerts, dataset)
      send(nodeLabels);
    }
  }


  function send(nodeLabels) {
    res.send(JSON.stringify({res: nodeLabels, detail: 'labels', metaInfo: retInfo}));
  }
});

app.post('/meta-dag-bucketed-label', async (req, res) => {
  const filename = req.body.filename;
  const dataset = req.body.graphName;
  const layer = req.body.layer;
  const bucket = req.body.bucket;
  const metaNode = req.body.metaNode;
  const lcc = req.body.lcc;
  const wfInfo = req.body.wfInfo;
  const tempGraphIdx = req.body.tempGraphIdx;

  const retInfo = {
    filename: filename, 
    dataset: dataset, 
    layer: layer, 
    lcc: lcc,
    bucket: bucket,
    tempGraphIdx: tempGraphIdx
  }

  const wavefile = `layer-${layer}-waves-buck${bucket}.csv`;
  const dir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;

  const waveDir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;
  const waveFileName = `layer-${layer}-waves-buck${bucket}.csv`;
  let node2edgeListCacheName = `${dataset}/${waveFileName}:node2edgeList`;



  const rawFragMapFileName = `${waveDir}/layer-${layer}-waves-buck${bucket}-fragMap.json`;
  let cacheWave, cacheFrag;
  if (fs.existsSync(rawFragMapFileName)) {
    if (!cache.has(rawFragMapFileName, {updateAgeOnHas: true})) {
      const processPromise =  processRawFragMap(rawFragMapFileName)
      processPromise.then(() => {
        const cachedMap = cache.get(rawFragMapFileName);
        if (cachedMap.type === 'dagNodeLink.wf.fragMap.null') {
          // read full
        } else {
          const wfName = cachedMap.data[1][wfInfo[0]][wfInfo[1]];
          node2edgeListCacheName += `-${wfName[0]}-${wfName[1]}`;
          cacheWave = wfName[0];
          cacheFrag = wfName[1];
        }
      })
    } else {
      const cachedMap = cache.get(rawFragMapFileName);
      if (cachedMap.type === 'dagNodeLink.wf.fragMap.null') {
        // read full
      } else {
        const wfName = cachedMap.data[1][wfInfo[0]][wfInfo[1]];
        node2edgeListCacheName += `-${wfName[0]}-${wfName[1]}`;
        cacheWave = wfName[0];
        cacheFrag = wfName[1];
      }
    }
  }
  
  
  let readyFlag = true;
  let vMap = undefined;
  let waveList = undefined;
  if (!cache.has(node2edgeListCacheName, {updateAgeOnHas: true})) {
    const processPromise = readWaveAndVMapStream(filename, waveFileName, waveDir, dataset, cacheWave, cacheFrag, true);
    console.log('no', filename);
    processPromise.then(async () => {
      const cachedData = cache.get(node2edgeListCacheName);
        // const nodeEdges = metaNode.map(d => cachedData.data[0][d]).flat(1)
        const nodeVerts = {};
        Object.keys(metaNode).forEach((key, idx) => nodeVerts[key] = metaNode[key].map(val => cachedData.data[1][val]).flat(1))
        const nodeLabels = await getImportantNodeLabels(nodeVerts, dataset)
        send(nodeLabels);
    })
  } else {
    const cachedData = cache.get(node2edgeListCacheName);
    if (cachedData.processingFlag) {
      // // still processing
      console.log('W: still processing data in /meta-dag-node');
      cachedData.processPromise.then(async () => {
        const updatedCachedData = cache.get(node2edgeListCacheName);
        // const nodeEdges = metaNode.map(d => updatedCachedData.data[0][d]).flat(1)
        const nodeVerts = {};
        Object.keys(metaNode).forEach((key, idx) => nodeVerts[key] = metaNode[key].map(val => updatedCachedData.data[1][val]).flat(1))
        const nodeLabels = await getImportantNodeLabels(nodeVerts, dataset)
        send(nodeLabels);
      })
    } else {
      // // processed
      // const nodeEdges = metaNode.map(d => cachedData.data[0][d]).flat(1)
      const nodeVerts = {};
      Object.keys(metaNode).forEach((key, idx) => nodeVerts[key] = metaNode[key].map(val => cachedData.data[1][val]).flat(1))
      const nodeLabels = await getImportantNodeLabels(nodeVerts, dataset)
      send(nodeLabels);
    }
  }


  function send(nodeLabels) {
    res.send(JSON.stringify({res: nodeLabels, detail: 'labels', metaInfo: retInfo}));
  }
});


app.post('/meta-dag-node-label', async (req, res) => {
  const filename = req.body.filename;
  const dataset = req.body.graphName;
  const layer = req.body.layer;
  const bucket = req.body.bucket;
  const metaNode = req.body.metaNode;
  const lcc = req.body.lcc;
  const wfInfo = req.body.wfInfo;
  const tempGraphIdx = req.body.tempGraphIdx;

  const retInfo = {
    filename: filename, 
    dataset: dataset, 
    layer: layer, 
    lcc: lcc,
    bucket: bucket,
    tempGraphIdx: tempGraphIdx
  }
  console.log(retInfo)

  const wavefile = `layer-${layer}-waves-buck${bucket}.csv`;
  const dir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;

  const waveDir = `${__dirname}/wave-decomposition/${dataset}/${dataset}_waves/lccBuck`;
  const waveFileName = `layer-${layer}-waves-buck${bucket}.csv`;
  let node2edgeListCacheName = `${dataset}/${waveFileName}:node2edgeList`;



  const rawFragMapFileName = `${waveDir}/layer-${layer}-waves-buck${bucket}-fragMap.json`;
  let cacheWave, cacheFrag;
  if (fs.existsSync(rawFragMapFileName)) {
    if (!cache.has(rawFragMapFileName, {updateAgeOnHas: true})) {
      const processPromise =  processRawFragMap(rawFragMapFileName)
      processPromise.then(() => {
        const cachedMap = cache.get(rawFragMapFileName);
        if (cachedMap.type === 'dagNodeLink.wf.fragMap.null') {
          // read full
        } else {
          const wfName = cachedMap.data[1][wfInfo[0]][wfInfo[1]];
          node2edgeListCacheName += `-${wfName[0]}-${wfName[1]}`;
          cacheWave = wfName[0];
          cacheFrag = wfName[1];
        }
      })
    } else {
      const cachedMap = cache.get(rawFragMapFileName);
      if (cachedMap.type === 'dagNodeLink.wf.fragMap.null') {
        // read full
      } else {
        const wfName = cachedMap.data[1][wfInfo[0]][wfInfo[1]];
        node2edgeListCacheName += `-${wfName[0]}-${wfName[1]}`;
        cacheWave = wfName[0];
        cacheFrag = wfName[1];
      }
    }
  }
  

  const strataFilename = Array.isArray(metaNode) ? `${dataset}_${layer}-${lcc}_${metaNode[0]}` : `${dataset}_${layer}-${lcc}_${metaNode}`;
  
  let readyFlag = true;
  let vMap = undefined;
  let waveList = undefined;
  if (!cache.has(node2edgeListCacheName, {updateAgeOnHas: true})) {
    const processPromise = readWaveAndVMapStream(filename, waveFileName, waveDir, dataset, cacheWave, cacheFrag, true);
    console.log('no', filename);
    processPromise.then(async () => {
      const cachedData = cache.get(node2edgeListCacheName);
      if (Array.isArray(metaNode)) {
        console.log('metaNode', metaNode)
        // const nodeEdges = metaNode.map(d => cachedData.data[0][d]).flat(1)
        const nodeVerts = metaNode.map(d => cachedData.data[1][d]).flat(1)
        // console.log(metaNode.map(d => cachedData.data[1][d]))
        const nodeLabels = await getAllNodeLabels(nodeVerts, dataset)
        send(nodeLabels);
      } else {
        // const nodeEdges = cachedData.data[0][metaNode];
        const nodeVerts = cachedData.data[1][metaNode];
        const nodeLabels = await getAllNodeLabels(nodeVerts, dataset)
        send(nodeLabels);
      }
      // const nodeEdges = metaNode.map(d => cachedData.data[0][d]).flat(1)
      // const nodeVerts = cachedData.data[1][metaNode]
      // const nodeLabels = await getAllNodeLabels(nodeVerts, dataset)
      // send(nodeLabels);
    })
  } else {
    const cachedData = cache.get(node2edgeListCacheName);
    if (cachedData.processingFlag) {
      // // still processing
      console.log('W: still processing data in /meta-dag-node');
      cachedData.processPromise.then(async () => {
        const updatedCachedData = cache.get(node2edgeListCacheName);
        if (Array.isArray(metaNode)) {
          console.log('metaNode', metaNode)
          // const nodeEdges = metaNode.map(d => cachedData.data[0][d]).flat(1)
          const nodeVerts = metaNode.map(d => updatedCachedData.data[1][d]).flat(1)
          // console.log(metaNode.map(d => updatedCachedData.data[1][d]))
          const nodeLabels = await getAllNodeLabels(nodeVerts, dataset)
          send(nodeLabels);
        } else {
          // const nodeEdges = updatedCachedData.data[0][metaNode];
          const nodeVerts = updatedCachedData.data[1][metaNode];
          const nodeLabels = await getAllNodeLabels(nodeVerts, dataset)
          send(nodeLabels);
        }
      })
    } else {
      // // processed
      if (Array.isArray(metaNode)) {
        console.log('metaNode', metaNode)
        // const nodeEdges = metaNode.map(d => cachedData.data[0][d]).flat(1)
        const nodeVerts = metaNode.map(d => cachedData.data[1][d]).flat(1)
        // console.log(metaNode.map(d => cachedData.data[1][d]))
        const nodeLabels = await getAllNodeLabels(nodeVerts, dataset)
        send(nodeLabels);
      } else {
        // const nodeEdges = cachedData.data[0][metaNode];
        const nodeVerts = cachedData.data[1][metaNode];
        const nodeLabels = await getAllNodeLabels(nodeVerts, dataset)
        send(nodeLabels);
      }
    }
  }
  function send(nodeLabels) {
    res.send(JSON.stringify({res: nodeLabels, detail: 'labels', metaInfo: retInfo}));

    const date = new Date();
    const [month, day, year] = [date.getMonth(), date.getDate(), date.getFullYear()];
    const histroyName = `${__dirname}/label-history/${month}-${day}-${year}.txt`;
    let outputName = `### ${retInfo.dataset}-L${retInfo.layer}-lcc${retInfo.lcc}-`
    if (wfInfo != null && wfInfo[0] != null) {
      outputName += `w${wfInfo[0]}-`
    }
    if (wfInfo != null && wfInfo[1] != null) {
      outputName += `fr${wfInfo[1]}-`
    }
    if (Array.isArray(metaNode)) {
      outputName += `nodes${metaNode[0]}-`
    } else {
      outputName += `node${metaNode}-`
    }
    outputName += `labels`

    const stream = fs.createWriteStream(histroyName, {flags:'a'});
    stream.write(outputName + '\n');
    stream.on('error', console.error);
    nodeLabels.forEach((str) => { 
      stream.write(str + '\n'); 
    });
    stream.end();
  }
});