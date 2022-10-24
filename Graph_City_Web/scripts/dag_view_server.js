// import * as THREE from '../node_modules/three/build/three.module.js';
// import {
//   gui
// } from '../node_modules/three/examples/jsm/libs/dat.gui.module.js';

const localHost = `http://addressSample:18000/`
const hostAddress = 'http://addressSample:18000'

var PREFIX = "http://addressSample:8888/";
const peelCCFolder = '../data_dags/peelCC/'
var nameSuffix = '';

const TH_DAG = 32768;
const TH_SUBDAG = 16384;
let TH_STRATA = 8192;
const TH_STRATA_FULL = 16384
const TH_FPVIEWER = 131072;
const TH_FPVIEWER_BUILDING = 65536;

const mallTexture = new THREE.TextureLoader().load( '../textures/mall.jpg' );
const mallMaterial = new THREE.MeshBasicMaterial( { map: mallTexture } );

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

function httpPostAsync(content, theUrl, callback, resType) {
  if (resType == null || resType == undefined) {
    resType = 'json';
  };
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = function() {
    if (xmlHttp.readyState === 4 && xmlHttp.status === 200)
      callback(xmlHttp.response);
  }
  xmlHttp.open("POST", theUrl, true); // true for asynchronous
  xmlHttp.responseType = resType;
  xmlHttp.setRequestHeader('Content-Type', 'application/json');
  xmlHttp.send(content);
}

function setStrataUrl(request) {
  document.getElementById('strata').src = PREFIX + request;
}

// var cityContainer = document.getElementById('graph');
var gui2 = new dat.GUI({
  autoPlace: true,
  width: 200
});
// gui2.domElement.style = "position: absolute; top: " + cityContainer.offsetHeight + "px; left: 10px;";
var gui2container = document.getElementById('bottom-gui-container');
gui2container.appendChild(gui2.domElement);
// console.log(cityContainer.offsetHeight);
gui2container.style = "visibility:hidden; position: absolute; top: " + 0 + "px; left: 10px; z-index: 5";

var data_info = {
  peel_value: '',
  vertices: '',
  edges: '',
  dag_edges: '',
  drawn_vertices: '',
  drawn_edges: ''
}
// gui2.add(data_info, 'peel_value').listen();
gui2.add(data_info, 'vertices').listen();
gui2.add(data_info, 'edges').listen();
gui2.add(data_info, 'dag_edges').listen();
gui2.add(data_info, 'drawn_vertices').listen();
gui2.add(data_info, 'drawn_edges').listen();

let inarr = document.getElementsByTagName('input');
for (let ind in Object.keys(inarr)) {
  let textfield = inarr[ind];
  textfield.setAttribute('readonly', '');
}

// Interactivity Parameter
var IP = {
  max_edges: 2 ** 13
}
gui2.add(IP, 'max_edges');

const MAX_MAXSIZE = 500
var MAX_VSIZE = {
  node_scale: MAX_MAXSIZE
}
var MAX_ESIZE = {
  link_scale: MAX_MAXSIZE
}
gui2.add(MAX_VSIZE, 'node_scale', 1, 1000)
  .onChange(size => {
    if (tempGraph) {
      tempGraph.nodeVal(node => nodeSize(node));
      tempGraph.nodeThreeObject(node => nodeGeom(node, tempGraphIdx));
    }
  });

let verticalStretch = {
  verticalFactor: 100
}
gui2.add(verticalStretch, 'verticalFactor', 1, 1000)
  .name('vertical stretch')
  .onChange(() => tempGraph && stretchGraph(tempGraph));

function stretchGraph(graph) {
  const nodes = graph.graphData().nodes;
  if (DATAList[tempGraphIdx] && DATAList[tempGraphIdx].hasOwnProperty('heightConstrain')) {
    if (!DATAList[tempGraphIdx].heightConstrain) {
      // no height constrain, skip
      return;
    }
  }
  for (const node of nodes) {
    if (node.fyBase == null || node.fyBase == undefined) {
      continue;
    }
    node.fy = node.fyBase * verticalStretch.verticalFactor / 100;
  }
  graph.d3ReheatSimulation()
}

document.getElementById('dag-node-size').oninput = function(e) {
  const value = parseInt(e.target.value);
  MAX_VSIZE.node_scale = value;
  if (tempGraph) {
    tempGraph.nodeVal(node => nodeSize(node));
    tempGraph.nodeThreeObject(node => nodeGeom(node, tempGraphIdx));
  }
  if (fullDagGraph) {
    fullDagGraph.nodeVal(node => nodeSize(node));
    fullDagGraph.nodeThreeObject(node => nodeGeom(node, tempGraphIdx));
  }
  
}

document.getElementById('dag-link-size').oninput = function(e) {
  const value = parseInt(e.target.value);
  MAX_ESIZE.link_scale = value;
  if (tempGraph) {
    tempGraph.linkWidth(link => (MAX_ESIZE.link_scale / MAX_MAXSIZE) * Math.log1p(link.size))
  }
  if (fullDagGraph) {
    fullDagGraph.linkWidth(link => (MAX_ESIZE.link_scale / MAX_MAXSIZE) * Math.log1p(link.size))
  }
}

document.getElementById('dag-vertical-stretch').oninput = function(e) {
  const value = parseInt(e.target.value);
  verticalStretch.verticalFactor = value;
  if (tempGraph) {
    stretchGraph(tempGraph)
  }
  if (fullDagGraph) {
    stretchGraph(fullDagGraph)
  }
  
}

// document.getElementById('dag-vertical-stretch').oninput = function(e) {
//   const value = parseInt(e.target.value);
//   verticalStretch.verticalFactor = value;
//   if (tempGraph) {
//     stretchGraph(tempGraph)
//   }
// }

var NODE_THRESH = {
  top: 1000,
  bottom: 0
}

let gui2f1 = gui2.addFolder('Node Size Threshold');
gui2ContThreshTop = gui2f1.add(NODE_THRESH, 'top', 0, 1000)
  .onChange(size => tempGraph && tempGraph.nodeVal(node => {
    if (tempGraph) {
      tempGraph.nodeVal(node => nodeSize(node));
      tempGraph.nodeThreeObject(node => nodeGeom(node, tempGraphIdx));
    }
  }));
gui2ContThreshBottom = gui2f1.add(NODE_THRESH, 'bottom', 0, 1000)
  .onChange(size => tempGraph && tempGraph.nodeVal(node => {
    if (tempGraph) {
      tempGraph.nodeVal(node => nodeSize(node));
      tempGraph.nodeThreeObject(node => nodeGeom(node, tempGraphIdx));
    }
  }));

document.getElementById('dag-node-threshold-min').oninput = function(e) {
  const value = parseInt(e.target.value);
  NODE_THRESH.bottom = value;
  document.getElementById('dag-node-min-value').innerText = `(${value})`;
  if (tempGraph) {
    tempGraph.nodeVal(node => nodeSize(node));
    tempGraph.nodeThreeObject(node => nodeGeom(node, tempGraphIdx));
  }
}
document.getElementById('dag-node-threshold-max').oninput = function(e) {
  const value = parseInt(e.target.value);
  NODE_THRESH.top = value;
  document.getElementById('dag-node-max-value').innerText = `(${value})`;
  if (tempGraph) {
    tempGraph.nodeVal(node => nodeSize(node));
    tempGraph.nodeThreeObject(node => nodeGeom(node, tempGraphIdx));
  }
}

//fixed point

// var fp_choices = [
//   "movies/2-15608",
//   "cit-Patents/3-3191982",
//   "movies/5-16664",
//   "cit-Patents/1-250725",
//   "cit-Patents/1-140109",
//   "cit-Patents/1-62999",
//   "cit-Patents/1-405063",
//   "cit-Patents/8-4342010",
//   "cit-Patents/11-2983724",
//   "cit-Patents/15-3515498",
//   "cit-Patents/13-3434164",
//   "movies/15-17754",
//   "movies/24-12180",
//   "movies/14-14781",
//   "cit-Patents/15-3718944",
//   "movies/9-12922",
//   "cit-Patents/23-1433320",
//   "cit-Patents/18-2914315",
//   "cit-Patents/19-2571623",
//   "movies/29-13695",
//   "cit-Patents/16-1362234",
//   "movies/40-13169",
//   "cit-Patents/21-3292172",
//   "cit-Patents/25-3804978",
//   "movies/37-23740",
//   "cit-Patents/17-1851996",
//   "cit-Patents/43-1965538",
//   "movies/46-11766",
//   "movies/8-11589",
//   "cit-Patents/22-919138",
//   "movies/37-12382",
//   "movies/38-15906",
//   "cit-Patents/19-239987",
//   "movies/41-13114",
//   "movies/56-16757",
//   "movies/18-13639",
//   "movies/57-15545",
//   "movies/76-12776",
//   "movies/35-13487",
//   "cit-Patents/17-389660",
//   "movies/48-13096",
//   "movies/36-12116",
//   "movies/16-11696",
//   "movies/60-12370",
//   "movies/31-12735",
//   "movies/50-12860",
//   "cit-Patents/14-1037462",
//   "movies/15-11645",
//   "movies/33-11491",
//   "movies/7-11427",
//   "movies/32-11773",
//   "movies/34-11472",
//   "movies/123-11670",
//   "movies/30-12673",
//   "movies/62-12456",
//   "movies/28-12051",
//   "movies/119-11833",
//   "cit-Patents/15-275340",
//   "movies/53-12597",
//   "movies/14-11452",
//   "movies/29-11432",
//   "movies/13-11413",
//   "cit-Patents/12-508033",
//   "movies/27-11403",
//   "cit-Patents/13-30471",
//   "movies/2-11398",
//   "cit-Patents/11-164183",
//   "movies/4-11398",
//   "movies/6-11398",
//   "cit-Patents/10-196384",
//   "cit-Patents/9-28722",
//   "movies/12-11399",
//   "cit-Patents/4-1243",
//   "cit-Patents/8-27645",
//   "movies/101-11400",
//   "cit-Patents/7-30601",
//   "movies/26-11399",
//   "cit-Patents/6-2182",
//   "cit-Patents/2-13",
//   "cit-Patents/5-2061",
//   "movies/84-11398",
//   "cit-Patents/3-42",
//   "movies/185-11398",
//   "movies/527-11398",
//   "movies/283-11398"
//   /**
//   'cit-Patents/8-4342010',
//   'cit-Patents/2-13',
//   'cit-Patents/6-2182',
//   'cit-Patents/1-250725',
//   'cit-Patents/5-2061',
//   'cit-Patents/11-164183',
//   'cit-Patents/19-239987',
//   'cit-Patents/18-2914315',
//   'cit-Patents/15-3718944',
//   'cit-Patents/11-2983724',
//   'cit-Patents/3-3191982',
//   'cit-Patents/15-275340',
//   'cit-Patents/43-1965538',
//   'cit-Patents/19-2571623',
//   'cit-Patents/14-1037462',
//   'cit-Patents/8-27645',
//   'cit-Patents/1-140109',
//   'cit-Patents/22-919138',
//   'cit-Patents/7-30601',
//   'cit-Patents/13-30471',
//   'cit-Patents/12-508033',
//   'cit-Patents/9-28722',
//   'cit-Patents/17-1851996',
//   'cit-Patents/3-42',
//   'cit-Patents/4-1243',
//   'cit-Patents/10-196384',
//   'cit-Patents/13-3434164',
//   'cit-Patents/1-405063',
//   'cit-Patents/25-3804978',
//   'cit-Patents/16-1362234',
//   'cit-Patents/1-62999',
//   'cit-Patents/15-3515498',
//   'cit-Patents/21-3292172',
//   'cit-Patents/17-389660',
//   'cit-Patents/23-1433320',
//   'movies/57-15545',
//   'movies/33-11491',
//   'movies/29-13695',
//   'movies/14-14781',
//   'movies/7-11427',
//   'movies/4-11398',
//   'movies/37-23740',
//   'movies/16-11696',
//   'movies/48-13096',
//   'movies/14-11452',
//   'movies/15-11645',
//   'movies/9-12922',
//   'movies/30-12673',
//   'movies/60-12370',
//   'movies/123-11670',
//   'movies/29-11432',
//   'movies/37-12382',
//   'movies/62-12456',
//   'movies/50-12860',
//   'movies/2-15608',
//   'movies/283-11398',
//   'movies/76-12776',
//   'movies/18-13639',
//   'movies/527-11398',
//   'movies/26-11399',
//   'movies/3114-11398',
//   'movies/28-12051',
//   'movies/31-12735',
//   'movies/27-11403',
//   'movies/1246-11398',
//   'movies/101-11400',
//   'movies/15-17754',
//   'movies/2070-11400',
//   'movies/36-12116',
//   'movies/53-12597',
//   'movies/40-13169',
//   'movies/185-11398',
//   'movies/2-11398',
//   'movies/41-13114',
//   'movies/32-11773',
//   'movies/13-11413',
//   'movies/38-15906',
//   'movies/24-12180',
//   'movies/119-11833',
//   'movies/757-11398',
//   'movies/46-11766',
//   'movies/6-11398',
//   'movies/56-16757',
//   'movies/414-11398',
//   'movies/12-11399',
//   'movies/35-13487',
//   'movies/34-11472',
//   'movies/5-16664',
//   'movies/8-11589',
//   'movies/47-11398',
//   'movies/84-11398'
//   /**'com-friendster/1-10126754',
//   'com-friendster/11-167',
//   'com-friendster/1-1443591',
//   'com-friendster/1-14609',
//   'com-friendster/1-15204409',
//   'com-friendster/1-1623531',
//   'com-friendster/1-17833995',
//   'com-friendster/120-11459',
//   'com-friendster/1-201283',
//   'com-friendster/12-131002',
//   'com-friendster/1-2878103',
//   'com-friendster/13-101',
//   'com-friendster/1-31820411',
//   'com-friendster/140-180407',
//   'com-friendster/14-14107',
//   'com-friendster/14-238083',
//   'com-friendster/1-5249714',
//   'com-friendster/15-690',
//   'com-friendster/1-58275384',
//   'com-friendster/1-60939141',
//   'com-friendster/16-1284',
//   'com-friendster/16-41201',
//   'com-friendster/169-11459',
//   'com-friendster/1-6980866',
//   'com-friendster/1-7241947',
//   'com-friendster/175-260453',
//   'com-friendster/1-754869',
//   'com-friendster/17-60024',
//   'com-friendster/18-13234024',
//   'com-friendster/1-8645756',
//   'com-friendster/19-19546040',
//   'com-friendster/20-123',
//   'com-friendster/20-9823427',
//   'com-friendster/2-101',
//   'com-friendster/21-1374',
//   'com-friendster/2-2407314',
//   'com-friendster/22-6161',
//   'com-friendster/234-262712',
//   'com-friendster/25-167',
//   'com-friendster/27-146',
//   'com-friendster/29-735',
//   'com-friendster/30-11086',
//   'com-friendster/304-1850520',
//   'com-friendster/3-101',
//   'com-friendster/31-4062912',
//   'com-friendster/32-248525',
//   'com-friendster/33-1467',
//   'com-friendster/34-87642',
//   'com-friendster/34-90152410',
//   'com-friendster/35-1750',
//   'com-friendster/38-1202',
//   'com-friendster/40-38645',
//   'com-friendster/4-101',
//   'com-friendster/41-1905',
//   'com-friendster/41-60187632',
//   'com-friendster/4-6552536',
//   'com-friendster/48-6608327',
//   'com-friendster/5-173',
//   'com-friendster/53-1266',
//   'com-friendster/54-1563',
//   'com-friendster/55-643725',
//   'com-friendster/58-2035500',
//   'com-friendster/6-284',
//   'com-friendster/65-4182',
//   'com-friendster/7-101',
//   'com-friendster/71-102807',
//   'com-friendster/7-19325784',
//   'com-friendster/75-49855703',
//   'com-friendster/77-49855703',
//   'com-friendster/80-49855703',
//   'com-friendster/8-176',
//   'com-friendster/82-49855703',
//   'com-friendster/86-49855703',
//   'com-friendster/89-1202',
//   'com-friendster/9-164816',
//   'com-friendster/9-201256',
//   'com-friendster/92-49855703'**/
// ]

//fp_choices.sort();
//sortAll();

const fixedpoint = {
  'Fixed Point': 'cit-Patents/15-275340'
}

// gui2.add(fixedpoint, 'Fixed Point', fp_choices)
//   .onChange(selection => {
//     let dsfp = selection.split('/');
//     let file = './data_dags/' + dsfp[0] + '/dagmeta_' + dsfp[1] + '.json'
//     console.log("Loading: ", file);
//     loadFile(file);
//     loadLayer();
//   });

// controls
const controls = {
  'DAG Orientation': 'bu'
};
// gui2.add(controls, 'DAG Orientation', ['td', 'bu', 'lr', 'rl', 'zout', 'zin', 'radialout', 'radialin', null])
//   .onChange(orientation => graph && graph.dagMode(orientation));

// local graph
const initData = {
  nodes: [{
    id: 0
  }],
  links: []
};
/*
const lelem = document.getElementById("local");
const Graph = ForceGraph()(lelem)
  //.linkDirectionalParticles(2)
  .graphData(initData);
*/

let clicked = null;
let selectedWave = null;
const NODE_REL_SIZE = (3 / (4 * Math.PI)) * 10;
const elem = document.getElementById('graph-container');

// graph config
function initGraph(elemName, waveMiniFlag = false) {
  const elem = document.getElementById(elemName);
  elem.style.outline = '2px solid #dddddd'

  const graph = ForceGraph3D()(elem)
    .width(elem.offsetWidth)
    .height(elem.offsetHeight)
    // .dagMode('bu')
    // .dagLevelDistance(50)
    .backgroundColor('#ffffff')
    .linkColor(() => 'rgba(0,0,0,1.0)')
    .nodeRelSize(NODE_REL_SIZE)
    .nodeId('id')
    .nodeVal(node => nodeSize(node))
    .nodeLabel(node => nodeLabel(node))
    //.nodeAutoColorBy('density')
    .nodeColor('color')
    .nodeOpacity(0.8)
    .linkLabel(link => '<p style="color:black">' + link['size'] + '</p>')
    .linkWidth(link => (MAX_ESIZE.link_scale / MAX_MAXSIZE) * Math.log1p(link.size))
    //.linkDirectionalParticles(2)
    //.linkDirectionalParticleWidth(0.8)
    //.linkDirectionalParticleWidth('logsize')
    //.linkDirectionalParticleSpeed(0.006)
    .d3Force('collision', d3.forceCollide(node => Math.cbrt(node.esize) * NODE_REL_SIZE))
    .d3VelocityDecay(0.3)

  if (waveMiniFlag) {
    graph.nodeThreeObject(function(node) {
      return nodeGeomWaveMini(node)
    })
  } else {
    graph.nodeThreeObject(function(node) {
      return nodeGeom(node, tempGraphIdx)
    })
  }
    

  graph.enableNodeDrag(false);

  // Decrease repel intensity
  graph.d3Force('charge').strength(-15);
  graph.d3Force('charge').distanceMax(1000);
  // graph.cooldownTicks(50);

  // graph.onEngineTick(() => graph.resumeAnimation())

  const graphLabel = document.createElement('div');
  graphLabel.id = `${elemName}-label`;
  graphLabel.style.textAlign = 'center';
  graphLabel.style.fontSize = 'smaller';
  elem.appendChild(graphLabel);

  return graph;
}

function initFullDagGraph(elemName) {
  const elem = document.getElementById(elemName);
  elem.style.outline = '2px solid #dddddd'

  const graph = ForceGraph3D()(elem)
    .width(elem.offsetWidth)
    .height(elem.offsetHeight)
    // .dagMode('bu')
    // .dagLevelDistance(50)
    .backgroundColor('#ffffff')
    .linkColor(() => 'rgba(0,0,0,1.0)')
    .nodeRelSize(NODE_REL_SIZE)
    .nodeId('id')
    .nodeVal(node => nodeSize(node))
    .nodeLabel(node => nodeLabel(node))
    //.nodeAutoColorBy('density')
    .nodeColor('color')
    .nodeOpacity(0.8)
    .linkLabel(link => '<p style="color:black">' + link['size'] + '</p>')
    .linkWidth(link => (MAX_ESIZE.link_scale / MAX_MAXSIZE) * Math.log1p(link.size))
    //.linkDirectionalParticles(2)
    //.linkDirectionalParticleWidth(0.8)
    //.linkDirectionalParticleWidth('logsize')
    //.linkDirectionalParticleSpeed(0.006)
    .d3Force('collision', d3.forceCollide(node => Math.cbrt(node.esize) * NODE_REL_SIZE))
    .d3VelocityDecay(0.3)
    
  graph.nodeThreeObject(function(node) {
    return nodeGeom(node, tempGraphIdx)
  })
    

  // graph.enableNodeDrag(false);
  graph.enablePointerInteraction(false)

  // Decrease repel intensity
  graph.d3Force('charge').strength(-15);
  graph.d3Force('charge').distanceMax(1000);
  // graph.cooldownTicks(50);

  // graph.onEngineTick(() => graph.resumeAnimation())

  // const graphLabel = document.createElement('div');
  // graphLabel.id = `${elemName}-label`;
  // graphLabel.style.textAlign = 'center';
  // graphLabel.style.fontSize = 'smaller';
  // elem.appendChild(graphLabel);

  const closeButton = document.createElement('div');
  closeButton.innerText = 'x';
  closeButton.style.fontSize = '100%';
  closeButton.style.zIndex = '5'
  closeButton.style.position = 'absolute';
  closeButton.style.top = '0%';
  closeButton.style.right = '0%';
  closeButton.onclick = () => {
    document.getElementById('full-dag-graph-container').style.display = 'none';
    document.getElementById('graph-container').style.width = '100%';
    graph.graphData({nodes: [], links: []});
    resizeDag()
  }
  document.getElementById('full-dag-graph-container').appendChild(closeButton);

  return graph;
}

function initBuildingGraph(elemName) {
  const elem = document.getElementById(elemName);
  elem.style.outline = '2px solid #dddddd'

  const heightFactor = 43.89896759832934; // y_scale in main.js

  const graph = ForceGraph3D()(elem)
    .width(elem.offsetWidth)
    .height(elem.offsetHeight)
    .backgroundColor('#ffffff')


  graph.nodeThreeObject(d => drawFloor(d));
    

  graph.enableNodeDrag(false);

  // Decrease repel intensity
  graph
    .cooldownTime(0)
    .d3Force('center', null)
    .d3Force('charge', null);
  // graph.cooldownTicks(50);

  // graph.onEngineTick(() => graph.resumeAnimation())

  const graphLabel = document.createElement('div');
  graphLabel.id = `${elemName}-label`;
  graphLabel.style.textAlign = 'center';
  graphLabel.style.fontSize = 'smaller';
  graphLabel.innerHTML = 'BLDG';
  graphLabel.style.transform = 'translateY(-100%)'
  graphLabel.style.pointerEvents = 'none'

  elem.appendChild(graphLabel);

  return graph;
}

const graph1 = initGraph('graph1');
const graph2 = initGraph('graph2');
const graph3 = initGraph('graph3');
const graph4 = initGraph('graph4');
let tempGraph = graph1;
let tempMiniGraph = undefined;
const graphList = [undefined, graph1, graph2, graph3, graph4];
let tempGraphIdx = 0;
// const miniWaveGraph = initGraph('mini-wave-graph', true)
// let showMiniWaveGraphFlag = false;
// switchWaveMiniGraph(false);
const miniBuildingGraph = initBuildingGraph('mini-building')
const fullDagGraph = initFullDagGraph('full-dag-graph')
switchFullDagGraph(false);


let DATA = null;
let DATAList = [];
let graphInfoList = [];
let nodeDS = null;
let layer_lcc = null;
let DATASET = null;
//let nodeMAP = null;


let peelCCFlag = false;
let forkFlag = false;

function click2edgeCutDag(node) {
  // if (node.esize < TH_DAG) {
  //   click2strata(node);
  //   return;
  // }

  clicked = node;
  tempGraph.nodeThreeObject(function(node) {
    return nodeGeom(node, tempGraphIdx)
  });

  console.log(TH_STRATA, TH_FPVIEWER);
  // if (node.esize < TH_STRATA) {
  if (false) {
    console.log('edgeCut2strata')
    httpPostAsync(JSON.stringify({
      filename: DATA.filename,
      graphName: DATA.dataset,
      layer: DATA.layer,
      bucket: DATA.bucket,
      metaNode: node.id,
      lcc: DATA.lcc,
      buildingName: DATA.buildingName
    }), localHost + 'edgeCut2strata', function(res) {
      if (!res.res) {
        console.log(res.detail);
      } else {
        const filename = `${DATA.dataset}_${DATA.layer}-${DATA.lcc}-EC${node.id}`;
        // let C = new THREE.Color(node.color);
        console.log("?dataPath=" + filename);
        console.log(document.getElementById('strata').src);
        httpGetAsync(PREFIX + "query?type=add&file=" + filename + ".csv", function(res) {
          console.log(res);
          setStrataUrl("?dataPath=" + filename + '&nodeColorProperty=waveLevel&heightProperty=waveLevel');
          console.log(document.getElementById('strata').src);
        });
      }
    }, 'json')
    document.getElementById('strata-container').style.display = 'block';
    document.getElementById('graph-container').style.width = '49.5%';
    resizeDag()

  // } else if (node.esize < TH_FPVIEWER) {
  //   console.log('edgeCut2fpviewer')
  //   httpPostAsync(JSON.stringify({
  //     filename: DATA.filename,
  //     graphName: DATA.dataset,
  //     layer: DATA.layer,
  //     bucket: DATA.bucket,
  //     metaNode: node.id,
  //     lcc: DATA.lcc,
  //     buildingName: DATA.buildingName
  //   }), localHost + 'edgeCut2fpviewer', function(res) {
  //     console.log(res);
  //     if (!res.res) {
  //       console.log(res.detail);
  //     } else {
  //       window.open(res.url);
  //     }
  //   }, 'json')

  } else {
    httpPostAsync(JSON.stringify({
      filename: DATA.filename,
      graphName: DATA.dataset,
      layer: DATA.layer,
      bucket: DATA.bucket,
      metaNode: node.id,
      lcc: DATA.lcc,
      buildingName: DATA.buildingName
    }), localHost + 'meta-dag-edgeCut', function(res) {
      console.log(res);
      // if (!res.res) {
      //   console.log(res.detail);
      // } else {
      //   // const filename = `${DATA.dataset}_${DATA.layer}-${DATA.lcc}_${node.id}`;
      //   // let C = new THREE.Color(node.color);
      //   // console.log("?dataPath=" + filename + '&nodeColor={"r":' + C.r + ',"g":' + C.g + ',"b":' + C.b + '}');
      //   // console.log(document.getElementById('strata').src);
      //   // httpGetAsync(PREFIX + "query?type=add&file=" + filename + ".csv", function(res) {
      //   //   console.log(res);
      //   //   setStrataUrl("?dataPath=" + filename + '&nodeColor={"r":' + C.r + ',"g":' + C.g + ',"b":' + C.b + '}&nodeColorProperty=waveLevel&heightProperty=waveLevel');
      //   //   console.log(document.getElementById('strata').src);
      //   // });
      //   loadMetaArray(res, 2);
      // }
      loadMetaArray(res, 2);
    }, 'json')
  }
}

function click2wccDag(node) {
  // if (node.esize < TH_DAG) {
  //   click2strata(node);
  //   return;
  // }

  clicked = node;
  tempGraph.nodeThreeObject(function(node) {
    return nodeGeom(node, tempGraphIdx)
  });

  console.log(TH_STRATA, TH_FPVIEWER);
  if (false) {
    console.log('wcc2strata')
    httpPostAsync(JSON.stringify({
      filename: DATA.filename,
      graphName: DATA.dataset,
      layer: DATA.layer,
      bucket: DATA.bucket,
      metaNode: node.id,
      lcc: DATA.lcc,
      buildingName: DATA.buildingName
    }), localHost + 'wcc2strata', function(res) {
      if (!res.res) {
        console.log(res.detail);
      } else {
        const filename = `${DATA.dataset}_${DATA.layer}-${DATA.lcc}-wcc${node.id}`;
        // let C = new THREE.Color(node.color);
        console.log("?dataPath=" + filename);
        console.log(document.getElementById('strata').src);
        httpGetAsync(PREFIX + "query?type=add&file=" + filename + ".csv", function(res) {
          console.log(res);
          setStrataUrl("?dataPath=" + filename + '&nodeColorProperty=waveLevel&heightProperty=waveLevel');
          console.log(document.getElementById('strata').src);
        });
      }
    }, 'json')
    document.getElementById('strata-container').style.display = 'block';
    document.getElementById('graph-container').style.width = '49.5%';
    resizeDag()

  } else if (false) {
    console.log('wcc2fpviewer')
    httpPostAsync(JSON.stringify({
      filename: DATA.filename,
      graphName: DATA.dataset,
      layer: DATA.layer,
      bucket: DATA.bucket,
      metaNode: node.id,
      lcc: DATA.lcc,
      buildingName: DATA.buildingName
    }), localHost + 'wcc2fpviewer', function(res) {
      console.log(res);
      if (!res.res) {
        console.log(res.detail);
      } else {
        window.open(res.url);
      }
    }, 'json')

  } else {
    httpPostAsync(JSON.stringify({
      filename: DATA.filename,
      graphName: DATA.dataset,
      layer: DATA.layer,
      bucket: DATA.bucket,
      metaNode: node.id,
      lcc: DATA.lcc,
      buildingName: DATA.buildingName,
    }), localHost + 'meta-dag-wcc', function(res) {
      console.log(res);
      // if (!res.res) {
      //   console.log(res.detail);
      // } else {
      //   // const filename = `${DATA.dataset}_${DATA.layer}-${DATA.lcc}_${node.id}`;
      //   // let C = new THREE.Color(node.color);
      //   // console.log("?dataPath=" + filename + '&nodeColor={"r":' + C.r + ',"g":' + C.g + ',"b":' + C.b + '}');
      //   // console.log(document.getElementById('strata').src);
      //   // httpGetAsync(PREFIX + "query?type=add&file=" + filename + ".csv", function(res) {
      //   //   console.log(res);
      //   //   setStrataUrl("?dataPath=" + filename + '&nodeColor={"r":' + C.r + ',"g":' + C.g + ',"b":' + C.b + '}&nodeColorProperty=waveLevel&heightProperty=waveLevel');
      //   //   console.log(document.getElementById('strata').src);
      //   // });
      //   loadMetaArray(res, 2);
      // }
      loadMetaArray(res, 2);
    }, 'json')
  }
}

function click2wfFrag(node) {
  // if (node.esize < TH_DAG) {
  //   click2strata(node);
  //   return;
  // }

  clicked = node;
  tempGraph.nodeThreeObject(function(node) {
    return nodeGeom(node, tempGraphIdx)
  });


  httpPostAsync(JSON.stringify({
    filename: DATA.filename,
    graphName: DATA.dataset,
    layer: DATA.layer,
    bucket: DATA.bucket,
    metaNode: node.id,
    lcc: DATA.lcc,
    buildingName: DATA.buildingName
  }), localHost + 'meta-dag-wf-frag', function(res) {
    console.log(res);
    // if (!res.res) {
    //   console.log(res.detail);
    // } else {
    //   // const filename = `${DATA.dataset}_${DATA.layer}-${DATA.lcc}_${node.id}`;
    //   // let C = new THREE.Color(node.color);
    //   // console.log("?dataPath=" + filename + '&nodeColor={"r":' + C.r + ',"g":' + C.g + ',"b":' + C.b + '}');
    //   // console.log(document.getElementById('strata').src);
    //   // httpGetAsync(PREFIX + "query?type=add&file=" + filename + ".csv", function(res) {
    //   //   console.log(res);
    //   //   setStrataUrl("?dataPath=" + filename + '&nodeColor={"r":' + C.r + ',"g":' + C.g + ',"b":' + C.b + '}&nodeColorProperty=waveLevel&heightProperty=waveLevel');
    //   //   console.log(document.getElementById('strata').src);
    //   // });
    //   loadMetaArray(res, 2);
    // }
    loadMetaArray(res, 2);
  }, 'json')
}

function click2wfDag(node) {
  // if (node.esize < TH_DAG) {
  //   click2strata(node);
  //   return;
  // }

  clicked = node;
  tempGraph.nodeThreeObject(function(node) {
    return nodeGeom(node, tempGraphIdx)
  });


  httpPostAsync(JSON.stringify({
    filename: DATA.filename,
    graphName: DATA.dataset,
    layer: DATA.layer,
    bucket: DATA.bucket,
    metaNode: node.id,
    lcc: DATA.lcc,
    buildingName: DATA.buildingName
  }), localHost + 'meta-dag-wf-dag', function(res) {
    console.log(res);
    // if (!res.res) {
    //   console.log(res.detail);
    // } else {
    //   // const filename = `${DATA.dataset}_${DATA.layer}-${DATA.lcc}_${node.id}`;
    //   // let C = new THREE.Color(node.color);
    //   // console.log("?dataPath=" + filename + '&nodeColor={"r":' + C.r + ',"g":' + C.g + ',"b":' + C.b + '}');
    //   // console.log(document.getElementById('strata').src);
    //   // httpGetAsync(PREFIX + "query?type=add&file=" + filename + ".csv", function(res) {
    //   //   console.log(res);
    //   //   setStrataUrl("?dataPath=" + filename + '&nodeColor={"r":' + C.r + ',"g":' + C.g + ',"b":' + C.b + '}&nodeColorProperty=waveLevel&heightProperty=waveLevel');
    //   //   console.log(document.getElementById('strata').src);
    //   // });
    //   loadMetaArray(res, 3);
    // }
    loadMetaArray(res, 3);
  }, 'json')
}

function click2wfDagDetail(node) {
  // if (node.esize < TH_DAG) {
  //   click2strata(node);
  //   return;
  // }

  clicked = node;
  console.log(NODE_THRESH.top, NODE_THRESH.bottom)
  tempGraph.nodeThreeObject(function(node) {
    return nodeGeom(node, tempGraphIdx)
  });

  setTimeout(() => {
    loadMetaArray([graphInfoList[3].bucket2nodes[node.id] , DATAList[3], 'wf.dag.detail'], 4)
  }, 200);

  // httpPostAsync(JSON.stringify({
  //   filename: DATA.filename,
  //   graphName: DATA.dataset,
  //   layer: DATA.layer,
  //   bucket: DATA.bucket,
  //   metaNode: node.id,
  //   lcc: DATA.lcc,
  //   buildingName: DATA.buildingName
  // }), localHost + 'meta-dag-wf-dag', function(res) {
  //   console.log(res);
  //   if (!res.res) {
  //     console.log(res.detail);
  //   } else {
  //     // const filename = `${DATA.dataset}_${DATA.layer}-${DATA.lcc}_${node.id}`;
  //     // let C = new THREE.Color(node.color);
  //     // console.log("?dataPath=" + filename + '&nodeColor={"r":' + C.r + ',"g":' + C.g + ',"b":' + C.b + '}');
  //     // console.log(document.getElementById('strata').src);
  //     // httpGetAsync(PREFIX + "query?type=add&file=" + filename + ".csv", function(res) {
  //     //   console.log(res);
  //     //   setStrataUrl("?dataPath=" + filename + '&nodeColor={"r":' + C.r + ',"g":' + C.g + ',"b":' + C.b + '}&nodeColorProperty=waveLevel&heightProperty=waveLevel');
  //     //   console.log(document.getElementById('strata').src);
  //     // });
  //     loadMetaArray(res, 3);
  //   }
  // }, 'json')
}

function click2Vicinity(node) {
  let wfInfo = [];
  if (node.hasOwnProperty('wave') && node.hasOwnProperty('frag')) {
    wfInfo = [node.wave, node.frag]
  }
  let nodeID;
  if (node.hasOwnProperty('idList')) {
    nodeID = node.idList;
  } else {
    nodeID = node.id;
  }
  
  const density = 2 * node.esize / (node.size * (node.size - 1))
  if (density > 0.95) {
    alert('large quasi-clique. Right click it to get its labels.')
    // console.log('post')
    // httpPostAsync(JSON.stringify({
    //   filename: DATA.filename,
    //   graphName: DATA.dataset,
    //   layer: DATA.layer,
    //   bucket: DATA.bucket,
    //   metaNode: nodeID,
    //   lcc: DATA.lcc,
    //   wfInfo: wfInfo,
    //   tempGraphIdx: tempGraphIdx,
    //   buildingName: DATA.buildingName
    // }), localHost + 'meta-dag-node-label', function(res) {
    //   console.log(res);
    //   const metaInfo = res.metaInfo;
    //   const resGraphIdx = metaInfo.tempGraphIdx;
    //   const localDATA = DATAList[resGraphIdx];

    //   var blob = new Blob([res.res.join('\n')], {type: "text/plain;charset=utf-8"});
    //   console.log(blob)
    //   let outputName = `${metaInfo.dataset}-L${metaInfo.layer}-lcc${metaInfo.lcc}`
    //   if (node.wave != null) {
    //     outputName += `w${node.wave}-`
    //   }
    //   if (node.frag != null) {
    //     outputName += `fr${node.frag}-`
    //   }
    //   if (Array.isArray(nodeID)) {
    //     outputName += `nodes${nodeID[0]}-`
    //   } else {
    //     outputName += `node${nodeID}-`
    //   }
    //   outputName += `-labels.txt`

    //   saveAs(blob, outputName);
    // }, 'json')

  } else {
    httpPostAsync(JSON.stringify({
      filename: DATA.filename,
      graphName: DATA.dataset,
      layer: DATA.layer,
      bucket: DATA.bucket,
      metaNode: nodeID,
      lcc: DATA.lcc,
      wfInfo: wfInfo,
      metaGraph: tempGraph.graphData(),
      buildingName: DATA.buildingName
      // metaType: graphInfoList[tempGraphIdx].metaType
    }), localHost + 'meta-dag-node-vicinity', function(res) {
      console.log(res);
      if (res.success) {
        window.open(`${hostAddress}/?city=${res.name}`);
      }
    }, 'json')
  }
}

function click2fpViewer(node) {

  if (node.esize + node.touchESize > TH_FPVIEWER) {
    click2Vicinity(node)
  } else {
    let wfInfo = [];
    if (node.hasOwnProperty('wave') && node.hasOwnProperty('frag')) {
      wfInfo = [node.wave, node.frag]
    }
    let nodeID;
    if (node.hasOwnProperty('idList')) {
      nodeID = node.idList;
    } else {
      nodeID = node.id;
    }
  
    httpPostAsync(JSON.stringify({
      filename: DATA.filename,
      graphName: DATA.dataset,
      layer: DATA.layer,
      bucket: DATA.bucket,
      metaNode: nodeID,
      lcc: DATA.lcc,
      wfInfo: wfInfo,
      // metaGraph: tempGraph.graphData(),
      metaGraph: [miniBuildingGraph.graphData(), graphList[1].graphData(), graphList[2].graphData()],
      buildingName: DATA.buildingName,
      prevMetaNode: DATA.parentNode.id,
      desc: ['BLDG', DATAList[1].dagType, DATAList[2].dagType === 'wf.frag' ? DATAList[2].dagType : 'frag.cc'],
      // metaType: graphInfoList[tempGraphIdx].metaType
    }), localHost + 'meta-dag-node-fp-viewer', function(res) {
      console.log(res);
      if (!res.res) {
        console.log(res.detail);
      } else {
        window.open(res.url);
      }
    }, 'json')
  }
}

function click2strata(node) {
  // peelCCBoardWarp.style.visibility = 'hidden';
  setStrataUrl('?data=nodata');
  clicked = node;
  // console.log(node['color']);
  // console.log(node)
  // const peelCCThreshold = 16384;
  // console.log('forkFlag', forkFlag);
  // if (forkFlag) {
  //   if (parseInt(node['esize']) > parseInt(peelCCThreshold)) {
  //     // alert('peelCC DAG');
  //     peelCCFlag = true;
  //   } else {
  //     peelCCFlag = false;
  //   };
  // } else {
  //   peelCCFlag = false;
  // }
  //graph.nodeColor(node => node === clicked ? 'rgba(0,0,0,1)' : node['color']);
  tempGraph.nodeThreeObject(function(node) {
    return nodeGeom(node, tempGraphIdx)
  });

  if (node.esize > TH_STRATA) {
    click2fpViewer(node)
  } else {
    document.getElementById('strata-container').style.display = 'block';
    document.getElementById('strata-container').style.width = '50%'
    document.getElementById('graph-container').style.width = '49.5%';
    document.getElementById('full-dag-graph-container').style.display = 'none';
    fullDagGraph.graphData({nodes: [], links: []})
    resizeDag()

    //console.log("Node: ", node);
    //console.log(DATA,nodeDS,nodeMAP);
    //const setid = nodeDS.find(nodeMAP[node.id]);

    // const setid = nodeDS._findById(node.id);
    // console.log("Setid: ", setid);
    // const nodefilter = new Set();
    // const nodefilter_label = [{source: "new_id", target: "name"}]; // column name for labels.csv
    // for (const sid in nodeDS._objects) {
    //   if (nodeDS._findById(sid) === setid) {
    //     //console.log(nodeDS._objects[sid], DATA.nodes[nodeDS._objects[sid].id]);
    //     const vertices = DATA.nodes[nodeDS._objects[sid].id].vertices
    //     const labels = DATA.nodes[nodeDS._objects[sid].id].vertices;
    //     for (const vert in vertices) {
    //       nodefilter.add(vertices[vert]);
    //     };
    //     // // push vertex labels for vertex in nodefilter
    //     for (let vIndex = 0; vIndex < vertices.length; vIndex++) {
    //       nodefilter_label.push({source: vertices[vIndex], target:labels[vIndex]});
    //     };
    //   }
    // }
    // loadEdges(node, nodefilter, nodefilter_label);
    // //Graph.zoomToFit();

    console.log(DATA);

    let wfInfo = [];
    if (node.hasOwnProperty('wave') && node.hasOwnProperty('frag')) {
      wfInfo = [node.wave, node.frag]
    }
    let nodeID;
    let nodeName;
    if (node.hasOwnProperty('idList')) {
      nodeID = node.idList;
      nodeName = node.idList[0]
    } else {
      nodeID = node.id;
      nodeName = node.id;
    }


    httpPostAsync(JSON.stringify({
      filename: DATA.filename,
      graphName: DATA.dataset,
      layer: DATA.layer,
      bucket: DATA.bucket,
      metaNode: nodeID,
      lcc: DATA.lcc,
      wfInfo: wfInfo,
      buildingName: DATA.buildingName
    }), localHost + 'meta-dag-node', function(res) {
      console.log(res);
      if (!res.res) {
        console.log(res.detail);
      } else {
        const filename = `${DATA.dataset}_${DATA.layer}-${DATA.lcc}_${nodeName}`;
        let C = new THREE.Color(node.color);
        console.log("?dataPath=" + filename + '&nodeColor={"r":' + C.r + ',"g":' + C.g + ',"b":' + C.b + '}');
        console.log(document.getElementById('strata').src);
        httpGetAsync(PREFIX + "query?type=add&file=" + filename + ".csv", function(res) {
          console.log(res);
          setStrataUrl("?dataPath=" + filename + '&nodeColor={"r":' + C.r + ',"g":' + C.g + ',"b":' + C.b + '}&nodeColorProperty=waveLevel&heightProperty=waveLevel');
          console.log(document.getElementById('strata').src);
        });
      }
    }, 'json')
  }
}

document.getElementById('full-dag-button').onmousedown = () => {
  // requestFullDag(DATA, tempGraphIdx)
  // alert('not implemented yet.')
  if (DATA.dagType === 'edgeCut.dag' || DATA.dagType === 'wcc.dag') {
    // safe, send request by onclick
  } else {
    document.getElementById('full-dag-button').innerText = 'not implemented yet';
  }
}
document.getElementById('full-dag-button').onmouseup = () => {
  // requestFullDag(DATA, tempGraphIdx)
  // alert('not implemented yet.')
  document.getElementById('full-dag-button').innerText = 'Request Full Dag';
}

document.getElementById('full-dag-button').onclick = () => {
  if (DATA.dagType === 'edgeCut.dag' || DATA.dagType === 'wcc.dag') {
    requestFullDag(DATA, tempGraphIdx)
  } else {
    // not implemented yet
  }
}

document.getElementById('height-constrain-button').onclick = () => {
  const elem = document.getElementById('height-constrain-button');
  if (DATA.dagType === 'wf.dag' || DATA.dagType === 'wf.dag.detail') {
    // nothing to do
    return
  }
  if (elem.innerText === 'Use Level as Height Constraint') {
    DATA.heightConstrain = false;
    elem.innerText = 'No Height Constraint'
    for (const node of tempGraph.graphData().nodes) {
      node.fy = undefined;
    }
    tempGraph.d3ReheatSimulation();
    for (const node of fullDagGraph.graphData().nodes) {
      node.fy = undefined;
    }
    fullDagGraph.d3ReheatSimulation();
  } else {
    DATA.heightConstrain = true;
    elem.innerText = 'Use Level as Height Constraint'
    for (const node of tempGraph.graphData().nodes) {
      node.fy = node.fyBase * verticalStretch.verticalFactor / 100;
    }
    tempGraph.d3ReheatSimulation();
    for (const node of fullDagGraph.graphData().nodes) {
      node.fy = node.fyBase * verticalStretch.verticalFactor / 100;
    }
    fullDagGraph.d3ReheatSimulation();
  }
}

document.getElementById('back-button-container').onclick = () => {
  console.log('click')
  window.scrollTo(0,0);
}

function requestFullDag(DATA, tempGraphIdx, wfInfo = []) {
  // if (node.hasOwnProperty('wave') && node.hasOwnProperty('frag')) {
  //   wfInfo = [node.wave, node.frag]
  // }
  // let nodeID;
  // if (node.hasOwnProperty('idList')) {
  //   nodeID = node.idList;
  // } else {
  //   nodeID = node.id;
  // }
  // const nodeIds = importantNodes.map(d => d.id);
  httpPostAsync(JSON.stringify({
    filename: DATA.filename,
    graphName: DATA.dataset,
    layer: DATA.layer,
    bucket: DATA.bucket,
    // metaNode: nodeIds,
    lcc: DATA.lcc,
    wfInfo: wfInfo,
    tempGraphIdx: tempGraphIdx,
    buildingName: DATA.buildingName,
    parentNode: DATA.parentNode.id,
    dagType: DATA.dagType
  }), localHost + 'meta-dag-full', function(res) {
    console.log(res);
    const metaInfo = res[1];
    const resGraphIdx = metaInfo.tempGraphIdx;
    const localDATA = DATAList[resGraphIdx];
    if (localDATA.dataset === metaInfo.dataset && localDATA.layer === metaInfo.layer && localDATA.lcc === metaInfo.lcc) {
      // the same graph, update
      // const resGraph = graphList[resGraphIdx];
      // const graphData = resGraph.graphData()
      // // const nodeLabels = res.res;
      // // for (const node of graphData.nodes) {
      // //   node.dataLabel = nodeLabels[node.id]
      // // }
      const [graphData, graphInfo] = prepareMetaArrayDag(res[0]);
      // graphInfo.metaType = metaType
      // updateDAGTitle(metaType, graphInfo)
      // graphInfoList[graphIndex] = graphInfo;
      fullDagGraph.graphData(graphData);
      setTimeout(() => fullDagGraph.zoomToFit(250, 10, node => true), 500);
      // resGraph.graphData(graphData)
      // resGraph.nodeLabel(node => nodeLabel(node))
      switchFullDagGraph(true);
    }
  }, 'json')
}

function requestNodeLabel(importantNodes, DATA, tempGraphIdx, wfInfo = []) {
  // if (node.hasOwnProperty('wave') && node.hasOwnProperty('frag')) {
  //   wfInfo = [node.wave, node.frag]
  // }
  // let nodeID;
  // if (node.hasOwnProperty('idList')) {
  //   nodeID = node.idList;
  // } else {
  //   nodeID = node.id;
  // }
  const nodeIds = importantNodes.map(d => d.id);
  httpPostAsync(JSON.stringify({
    filename: DATA.filename,
    graphName: DATA.dataset,
    layer: DATA.layer,
    bucket: DATA.bucket,
    metaNode: nodeIds,
    lcc: DATA.lcc,
    wfInfo: wfInfo,
    tempGraphIdx: tempGraphIdx,
    buildingName: DATA.buildingName
  }), localHost + 'meta-dag-label', function(res) {
    console.log(res);
    const metaInfo = res.metaInfo;
    const resGraphIdx = metaInfo.tempGraphIdx;
    const localDATA = DATAList[resGraphIdx];
    if (localDATA.dataset === metaInfo.dataset && localDATA.layer === metaInfo.layer && localDATA.lcc === metaInfo.lcc) {
      // the same graph, update
      const resGraph = graphList[resGraphIdx];
      const graphData = resGraph.graphData()
      const nodeLabels = res.res;
      for (const node of graphData.nodes) {
        node.dataLabel = nodeLabels[node.id]
      }
      resGraph.graphData(graphData)
      resGraph.nodeLabel(node => nodeLabel(node))

      const labelElem = document.getElementById('dag-label-text')
      resGraph.onNodeHover((node, prevNode) => {
        if (node == null) {
          labelElem.innerText = ''
        } else {
          if (node.dataLabel != null) {
            labelElem.innerText = node.dataLabel.join('\n')
          } else {
            labelElem.innerText = ''
          }
        }
      })
    }
  }, 'json')
}

function requestBucketedNodeLabel(importantNodes, DATA, tempGraphIdx, wfInfo = []) {
  // if (node.hasOwnProperty('wave') && node.hasOwnProperty('frag')) {
  //   wfInfo = [node.wave, node.frag]
  // }
  // let nodeID;
  // if (node.hasOwnProperty('idList')) {
  //   nodeID = node.idList;
  // } else {
  //   nodeID = node.id;
  // }
  const nodeIds = {}
  importantNodes.forEach(d => nodeIds[d.id] = d.idList)
  httpPostAsync(JSON.stringify({
    filename: DATA.filename,
    graphName: DATA.dataset,
    layer: DATA.layer,
    bucket: DATA.bucket,
    metaNode: nodeIds,
    lcc: DATA.lcc,
    wfInfo: wfInfo,
    tempGraphIdx: tempGraphIdx,
    buildingName: DATA.buildingName
  }), localHost + 'meta-dag-bucketed-label', function(res) {
    console.log(res);
    const metaInfo = res.metaInfo;
    const resGraphIdx = metaInfo.tempGraphIdx;
    const localDATA = DATAList[resGraphIdx];
    if (localDATA.dataset === metaInfo.dataset && localDATA.layer === metaInfo.layer && localDATA.lcc === metaInfo.lcc) {
      // the same graph, update
      const resGraph = graphList[resGraphIdx];
      const graphData = resGraph.graphData()
      const nodeLabels = res.res;
      for (const node of graphData.nodes) {
        node.dataLabel = nodeLabels[node.id]
      }
      resGraph.graphData(graphData)
      resGraph.nodeLabel(node => nodeLabel(node))
    }
  }, 'json')
}

function requestNodeFullLabel(node) {
  clicked = node;
  tempGraph.nodeThreeObject(function(node) {
    return nodeGeom(node, tempGraphIdx)
  });
  alert('requesting node lables in the right-clicked meta-node.')

  let wfInfo = [];
  if (node.hasOwnProperty('wave') && node.hasOwnProperty('frag')) {
    wfInfo = [node.wave, node.frag]
  }
  let nodeID;
  if (node.hasOwnProperty('idList')) {
    nodeID = node.idList;
  } else {
    nodeID = node.id;
  }

  httpPostAsync(JSON.stringify({
    filename: DATA.filename,
    graphName: DATA.dataset,
    layer: DATA.layer,
    bucket: DATA.bucket,
    metaNode: nodeID,
    lcc: DATA.lcc,
    wfInfo: wfInfo,
    tempGraphIdx: tempGraphIdx,
    buildingName: DATA.buildingName
  }), localHost + 'meta-dag-node-label', function(res) {
    console.log(res);
    const metaInfo = res.metaInfo;

    var blob = new Blob([res.res.join('\n')], {type: "text/plain;charset=utf-8"});
    console.log(blob)
    let outputName = `${metaInfo.dataset}-L${metaInfo.layer}-lcc${metaInfo.lcc}-`
    if (node.wave != null) {
      outputName += `w${node.wave}-`
    }
    if (node.frag != null) {
      outputName += `fr${node.frag}-`
    }
    if (Array.isArray(nodeID)) {
      outputName += `nodes${nodeID[0]}-`
    } else {
      outputName += `node${nodeID}-`
    }
    outputName += `labels.txt`

    saveAs(blob, outputName);
  }, 'json')
}


function nodeLabel(node) {
  let retval
  if (node.size == 1) {
    retval = '<p style="color:black">one node</p>'
  } else if (node.esize == 1) {
    retval = '<p style="color:black">one edge</p>'
  } else {
    var label = '<p style="color:black">';
    if (2 * node.esize == (node.size * (node.size - 1))) {
      label += ' (complete)';
    } else if (node.esize > TH_FPVIEWER) {
      const density = 2 * node.esize / (node.size * (node.size - 1))
      if (density > 0.95) {
        label += ` (${density.toFixed(4)}-clique)`
      }
    }
    label += node.idList == null ? '' : ` ${node.idList.length} cc`
    label += `</p>`
    retval = '<p style="color:black">V:' + node['size'] + ' E:' + node['esize'] + label + '</p>'
  }
  if (node.hasOwnProperty('touchESize')) {
    retval += `<p style="color:black">w. oDeg:${node.touchESize}</p>`
  }
  if (node.dataLabel != null) {
    retval += `<p style="color:black">` + node.dataLabel.join('<br>') + `</p>`
  }
  return retval
}

function nodeSize(node) {
  if (node.esize > NODE_THRESH.top || node.esize < NODE_THRESH.bottom) {
    return 0.0001;
  }
  if (node.esize == 0) {
    return 0.01;
  }
  return (node.esize + 1) * (MAX_VSIZE.node_scale / MAX_MAXSIZE);
}

function nodeGeomWaveMini(node) {
  if (node.id === selectedWave || (clicked && clicked.hasOwnProperty('wave') && node.id === clicked.wave)) {
    let rad = Math.cbrt((node.esize + 1) * (MAX_VSIZE.node_scale / MAX_MAXSIZE)) * NODE_REL_SIZE;
    let geo1 = new THREE.SphereGeometry(rad);
    //let geo2 = new THREE.SphereGeometry(rad * 1.2);
    //let geo3 = new THREE.SphereGeometry(rad * 1.4);
    //let geo4 = new THREE.SphereGeometry(rad * 1.6);
    let geo2 = new THREE.TorusGeometry(rad, 1, 8, 100);
    let geo3 = new THREE.TorusGeometry(rad, 1, 8, 100);
    let geo4 = new THREE.TorusGeometry(rad, 1, 8, 100);
    geo3.rotateX(Math.PI / 2);
    geo4.rotateY(Math.PI / 2);
    geo4.rotateX(Math.PI / 2);
    geo1.merge(geo2, new THREE.Matrix4(), 1);
    geo1.merge(geo3, new THREE.Matrix4(), 1);
    geo1.merge(geo4, new THREE.Matrix4(), 1);
    return new THREE.Mesh(geo1, [
      new THREE.MeshLambertMaterial({
        // color: node['color'],
        color: '#FF00FF',
        transparent: true,
        opacity: 0.8
      }),
      new THREE.MeshLambertMaterial({
        color: '#FF00FF',
        transparent: false
      })
    ]);
  } else {
    // if (node.esize > NODE_THRESH.top || node.esize < NODE_THRESH.bottom) {
    //   return false;
    // }
    // if (node.esize == 1) {
    //   return new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.5, 32), [
    //     new THREE.MeshLambertMaterial({
    //       color: node['color'],
    //       transparent: true,
    //       opacity: 0.8
    //     }),
    //     new THREE.MeshLambertMaterial({
    //       color: 'black',
    //       transparent: false
    //     })
    //   ]);
    // }
    let rad = Math.cbrt((node.esize + 1) * (MAX_VSIZE.node_scale / MAX_MAXSIZE)) * NODE_REL_SIZE;
    let geo1 = new THREE.SphereGeometry(rad);
    //let geo2 = new THREE.SphereGeometry(rad * 1.2);
    //let geo3 = new THREE.SphereGeometry(rad * 1.4);
    //let geo4 = new THREE.SphereGeometry(rad * 1.6);
    // let geo2 = new THREE.TorusGeometry(rad, 1, 8, 100);
    // let geo3 = new THREE.TorusGeometry(rad, 1, 8, 100);
    // let geo4 = new THREE.TorusGeometry(rad, 1, 8, 100);
    // geo3.rotateX(Math.PI / 2);
    // geo4.rotateY(Math.PI / 2);
    // geo4.rotateX(Math.PI / 2);
    // geo1.merge(geo2, new THREE.Matrix4(), 1);
    // geo1.merge(geo3, new THREE.Matrix4(), 1);
    // geo1.merge(geo4, new THREE.Matrix4(), 1);
    return new THREE.Mesh(geo1, [
      new THREE.MeshLambertMaterial({
        color: node['color'],
        transparent: true,
        opacity: 0.8
      }),
      new THREE.MeshLambertMaterial({
        color: 'black',
        transparent: false
      })
    ]);
    // return false;
  }
}

function nodeGeom(node, tempGraphIdx) {
  const retval = new THREE.Group();
  let rad = Math.cbrt((node.esize + 1) * (MAX_VSIZE.node_scale / MAX_MAXSIZE)) * NODE_REL_SIZE;
  if (node.esize === 1) {
    rad = 0.75;
  } else if (node.esize === 0) {
    rad = 0.01
  }
  
  if (node.isSrc) {
    const dir = new THREE.Vector3(0, 1, 0);
    const origin = new THREE.Vector3(0, rad, 0)
    const length = rad
    const hex = node['color']
    const stArrow = new THREE.ArrowHelper(dir, origin, length, hex, 0.5 * length, 0.1 * length)
    // stArrow.line.material.linewidth = Math.sqrt(Math.max(node.relVal, node.defaultRelVal))
    retval.add(stArrow);
  }

  if (node.highWeight) {
    function constructArrow(x, y, z) {
      const dir = new THREE.Vector3(x, y, z);
      const origin = new THREE.Vector3(-x * 2 * rad, -y * 2 * rad, -z * 2 * rad)
      const length = rad
      const hex = node['color']
      return new THREE.ArrowHelper(dir, origin, length, hex, 0.5 * length, 0.1 * length)
    }
    
    // stArrow.line.material.linewidth = Math.sqrt(Math.max(node.relVal, node.defaultRelVal))
    retval.add(constructArrow(0, 1, 0));
    retval.add(constructArrow(1, 0, 0));
    retval.add(constructArrow(-1, 0, 0));
    retval.add(constructArrow(0, 0, 1));
    retval.add(constructArrow(0, 0, -1));
  }

  if (node.mall) {
    const geo1Box = new THREE.BoxGeometry(rad / 2, rad / 2, rad / 2);
    const geo1Cone = new THREE.ConeGeometry(rad / 4 * Math.sqrt(2), rad / 2, 4, 1, true);
    // const geo2 = new THREE.SphereGeometry(rad / 4);
    geo1Box.translate(0, rad * 0.25, 0);
    geo1Cone.rotateX(Math.PI);
    geo1Cone.rotateY(Math.PI / 4);
    geo1Cone.translate(0, - rad * 0.25, 0);
    // geo2.translate(0, rad * 1.5, 0);
    // geo1.merge(geo2, new THREE.Matrix4(), 1);

    retval.add(new THREE.Mesh(geo1Box, mallMaterial));
    retval.add(new THREE.Mesh(geo1Cone, new THREE.MeshLambertMaterial({
      color: node['color'],
      transparent: true,
      opacity: 0.8
    })));

    // retval.add(new THREE.Mesh(geo2, new THREE.MeshLambertMaterial({
    //     color: node['color'],
    //     transparent: true,
    //     opacity: 0.8
    //   })));
  }

  if (node === clicked) {
    console.log(Math.sqrt(tempGraphIdx - 1) * 3)
    console.log(d3.color('#FF20FF').brighter(Math.sqrt(tempGraphIdx - 1) * 3).formatHex())
    // let rad = Math.cbrt((node.esize + 1) * (MAX_VSIZE.node_scale / MAX_MAXSIZE)) * NODE_REL_SIZE;
    let geo1 = new THREE.SphereGeometry(rad);
    //let geo2 = new THREE.SphereGeometry(rad * 1.2);
    //let geo3 = new THREE.SphereGeometry(rad * 1.4);
    //let geo4 = new THREE.SphereGeometry(rad * 1.6);
    let geo2 = new THREE.TorusGeometry(rad, rad / 16, 8, 100);
    let geo3 = new THREE.TorusGeometry(rad, rad / 16, 8, 100);
    let geo4 = new THREE.TorusGeometry(rad, rad / 16, 8, 100);
    geo3.rotateX(Math.PI / 2);
    geo4.rotateY(Math.PI / 2);
    geo4.rotateX(Math.PI / 2);
    geo1.merge(geo2, new THREE.Matrix4(), 1);
    geo1.merge(geo3, new THREE.Matrix4(), 1);
    geo1.merge(geo4, new THREE.Matrix4(), 1);
    retval.add(new THREE.Mesh(geo1, [
      new THREE.MeshLambertMaterial({
        // color: node['color'],
        color: d3.color('#FF20FF').brighter(Math.sqrt(tempGraphIdx - 1) * 3).formatHex(),
        transparent: true,
        opacity: node.mall ? 0.5 : 0.8 
      }),
      new THREE.MeshLambertMaterial({
        color: d3.color('#FF20FF').brighter(Math.sqrt(tempGraphIdx - 1) * 3).formatHex(),
        transparent: false
      })
    ]));
    return retval;
  } else {
    if (node.esize > NODE_THRESH.top || node.esize < NODE_THRESH.bottom) {
      // console.log(NODE_THRESH.top, NODE_THRESH.bottom, node.esize)
      // console.log('here')
      return false;
    } else if (node.esize == 1) {
      retval.add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, rad * 2, 32), [
        new THREE.MeshLambertMaterial({
          color: node['color'],
          transparent: true,
          opacity: node.mall ? 0.5 : 0.8 
        }),
        new THREE.MeshLambertMaterial({
          color: 'black',
          transparent: false
        })
      ]))
      return retval
    } else {
      let geo1 = new THREE.SphereGeometry(rad);
      retval.add(new THREE.Mesh(geo1, [
        new THREE.MeshLambertMaterial({
          color: node['color'],
          // color: '#FF00FF',
          transparent: true,
          opacity: node.mall ? 0.5 : 0.8 
        })
      ]))
      return retval;
    }
  }
}

//var layer_nodes = [];
var layer_links = [];
var layer_loaded = false;
var prev_suffix = null;

// function loadEdges(node, nodefilter, nodefilter_label) {
//   if (!layer_loaded) {
//     console.log("Not done loading edges!");
//     return
//   }
//   const [layer, lcc] = layer_lcc.split('/');
//   console.log(layer, lcc);
//   const nodes = [];
//   nodefilter.forEach(v => nodes.push({
//     id: v
//   }));
//   const links = [];
//   for (const i in layer_links) {
//     const edge = layer_links[i];
//     if (edge.layer == layer) {
//       if (nodefilter.has(edge.source) && nodefilter.has(edge.target)) {
//         links.push(edge);
//       }
//     }
//   }

//   const sendToFPViewer = true;
//   // console.log(nodes.map(d => parseInt(d.id)))
//   if (sendToFPViewer) {
//     httpPostAsync(JSON.stringify({
//       filename: DATASET + "_" + layer_lcc.replace("/", "-") + nameSuffix + '_' + node.id,
//       edges: links,
//       labels: nodefilter_label,
//       maxVId: d3.max(nodes, d => parseInt(d.id))
//     }), localHost + 'fp-viewer-set', function(res) {
//       // console.log(res);
//       window.open(res);
//     }, 'text')
//   }

//   // console.log(links);
//   let filename = DATASET + "_" + layer_lcc.replace("/", "-") + nameSuffix + node.id;
//   console.log(filename);
//   let content = JSON.stringify({
//     filename: filename + ".csv",
//     edges: links
//   });

//   // console.log(content);
//   httpGetAsync(PREFIX + "query?type=setdatadir&file=./temp", function(res) {
//     console.log(res);
//   });
//   httpPostAsync(content, PREFIX + "save", function(res) {
//     console.log(res)
//     console.log(res.errno)
//     if (res.errno == 0 || res.errno == -17) {
//       // // send labels to strata
//       content = JSON.stringify({
//         filename: filename + "_labels.csv",
//         edges: nodefilter_label
//       });
//       httpPostAsync(content, PREFIX + "save", function(res) {
//         console.log(res)
//         console.log(res.errno)
//         if (res.errno == 0 || res.errno == -17) {
//           if (peelCCFlag) {
//             // console.log(peelCCBoardWarp)
//             // peelCCBoardWarp.style.visibility = 'visible';
//             console.log(filename)
//             drawPeelCC(filename+'.mtx-m1')
//           } else {
//             let C = new THREE.Color(node.color);
//             console.log("?dataPath=" + filename + '&nodeColor={"r":' + C.r + ',"g":' + C.g + ',"b":' + C.b + '}');
//             console.log(document.getElementById('strata').src);
//             httpGetAsync(PREFIX + "query?type=add&file=" + filename + ".csv", function(res) {
//               console.log(res);
//               setStrataUrl("?dataPath=" + filename + '&nodeColor={"r":' + C.r + ',"g":' + C.g + ',"b":' + C.b + '}&nodeColorProperty=waveLevel&heightProperty=waveLevel');
//               console.log(document.getElementById('strata').src);
//             });
//           }
//         };
//       });
//     }
//   });
//   /*
//   Graph.graphData({
//     nodes,
//     links
//   });
//   */
// }

function loadLayer(dataset, layer, lcc) {
  data_info['peel_value'] = layer;
  layer_loaded = false;
  // const [dataset, fp] = fixedpoint["Fixed Point"].split('/');
  DATASET = dataset;
  layer_lcc = layer + '/' + lcc;
  // const [layer, lcc] = fp.split('-');
  console.log("Loading Layer: ", dataset, layer, lcc);
  //console.log(dataset,layer,lcc);
  const layerinfofile = "./" + dataset + "/" + dataset + "-layer-info.json";
  d3.json(layerinfofile).then(function(data) {
    //console.log(data[Number(layer)].file_suffix);
    const suffix = data[Number(layer)].file_suffix;
    if (suffix === prev_suffix) {
      layer_loaded = true;
      console.log("Layer Already Loaded: ", layer);
      return
    }
    // var loader = new THREE.FileLoader();
    httpPostAsync(JSON.stringify({dataset: dataset, suffix: suffix}), localHost+'dag_view_layer', (res) => {
      // console.log(res)
      var ldata = d3.csvParseRows(res, function(d, i) {
        return {
          source: Number(d[0]),
          target: Number(d[1]),
          layer: Number(d[2])
        };
      });
      layer_links = ldata;
      layer_loaded = true;
      prev_suffix = suffix;
      console.log("Layer Loaded: ", layer);
    }, 'text')
    // loader.load(
    //   // resource URL
    //   "./" + dataset + "/" + dataset + "_layers",
    //   // onLoad callback
    //   function(data) {
    //     //console.log('layer-*[0-9]*-'+suffix+'.csv')
    //     const layerfile = "./" + dataset + "/" + dataset + "_layers/" + data.match('layer-*[0-9]*-' + suffix + '.csv');
    //     console.log("Loading: ", layerfile);
    //     /*
    //     loader.load(layerfile, function(text){
    //       //console.log(text.split('\n'));
    //       const lines = text.split('\n');
    //       for (const i in lines) {
    //         const src_tgt_lay = lines[i].split(',');
    //         const src = Number(src_tgt_lay[0]);
    //         const tgt = Number(src_tgt_lay[1]);
    //         const lay = Number(src_tgt_lay[2]);
    //       }
    //     });
    //     */
    //     d3.text(layerfile).then(function(text) {
    //       // console.log(text.split('\n'));
    //       var ldata = d3.csvParseRows(text, function(d, i) {
    //         return {
    //           source: Number(d[0]),
    //           target: Number(d[1]),
    //           layer: Number(d[2])
    //         };
    //       });
    //       layer_links = ldata;
    //       layer_loaded = true;
    //       prev_suffix = suffix;
    //       console.log("Layer Loaded: ", layer);
    //     });
    //   });
  });
}

function resizeDag() {
  graph1
    .width(document.getElementById('graph1').offsetWidth)
    .height(document.getElementById('graph1').offsetHeight);
  graph2
    .width(document.getElementById('graph2').offsetWidth)
    .height(document.getElementById('graph2').offsetHeight);
  graph3
    .width(document.getElementById('graph3').offsetWidth)
    .height(document.getElementById('graph3').offsetHeight);
  graph4
    .width(document.getElementById('graph4').offsetWidth)
    .height(document.getElementById('graph4').offsetHeight);
  // miniWaveGraph
  //   .width(document.getElementById('mini-wave-graph').offsetWidth)
  //   .height(document.getElementById('mini-wave-graph').offsetHeight);
  miniBuildingGraph
    .width(document.getElementById('mini-building').offsetWidth)
    .height(document.getElementById('mini-building').offsetHeight);

  fullDagGraph
    .width(document.getElementById('full-dag-graph').offsetWidth)
    .height(document.getElementById('full-dag-graph').offsetHeight);
}

window.addEventListener('resize', resizeDag);

// // Decrease repel intensity
// graph.d3Force('charge').strength(-15);
// graph.d3Force('charge').distanceMax(1000);
// // graph.cooldownTicks(50);
// graph.onEngineTick(() => graph.resumeAnimation())

function startDAGAnimation() {
  // graph1.resumeAnimation();
  // graph2.resumeAnimation();
  // graph3.resumeAnimation();
  // graph4.resumeAnimation();
  tempGraph.resumeAnimation();
  if (tempMiniGraph == null || tempMiniGraph == undefined) {
    // nothing to do
  } else {
    tempMiniGraph.resumeAnimation();
  }
}

document.getElementById('graph-container').onmouseenter = startDAGAnimation;

function stopDAGAnimation() {
  graph1.pauseAnimation();
  graph2.pauseAnimation();
  graph3.pauseAnimation();
  graph4.pauseAnimation();
}

document.getElementById('strata').onmouseover = stopDAGAnimation;

function switchGraphVisibility(graphIndex = 1, iterFlag = false) {
  for (let i = 1; i <= 4; i ++) {
    if (i === graphIndex) {
      document.getElementById(`graph${i}`).style.visibility = 'visible';
    } else {
      document.getElementById(`graph${i}`).style.visibility = 'hidden';
    }
  }
  if (DATAList[graphIndex] && DATAList[graphIndex].hasOwnProperty('heightConstrain')) {
    console.log('height Constrain', DATAList[graphIndex].heightConstrain)
    document.getElementById('height-constrain-button').innerText = DATAList[graphIndex].heightConstrain ? 'Use Level as Height Constraint' : 'No Height Constraint';
  }
  DATA = DATAList[graphIndex]
  switchMiniGraph(graphIndex, graphInfoList[graphIndex] && (graphInfoList[graphIndex].metaType === 'edgeCut.dag' || graphInfoList[graphIndex].metaType === 'wcc.dag') ? 1 : 0, iterFlag);
}

switchGraphVisibility(1);

function switchMiniGraph(graphIndex = 1, shapeIdx = 0, iterFlag = false) {
  for (let i = 1; i <= 4; i ++) {
    const tempGraphElem = document.getElementById(`graph${i}`)
    tempGraphElem.style.width = '100%';
    tempGraphElem.style.height = '100%';
    tempGraphElem.style.left = '0%'
    tempGraphElem.style.top = '0%'
    tempGraphElem.style.zIndex = '1';
    graphList[i].width(tempGraphElem.offsetWidth);
    graphList[i].height(tempGraphElem.offsetHeight);
    graphList[i].onBackgroundRightClick(() => null);
    graphList[i].showNavInfo(true);
  }
  // // clean miniGraph
  if (graphIndex === 1) {
    // // nothing to do
  } else {
    if (iterFlag) {
      for (let miniGraphIndex = graphIndex - 1; miniGraphIndex > 0; miniGraphIndex --) {
        const tempMiniGraphElem = document.getElementById(`graph${miniGraphIndex}`)
        tempMiniGraphElem.style.top = '10%'
        tempMiniGraphElem.style.width = '10%';
        tempMiniGraphElem.style.height = '79%';
        tempMiniGraphElem.style.left = `${10 * (miniGraphIndex - 1)}%`;
        tempMiniGraphElem.style.zIndex = '2';
        tempMiniGraphElem.style.visibility = 'visible';
        graphList[miniGraphIndex].width(tempMiniGraphElem.offsetWidth);
        graphList[miniGraphIndex].height(tempMiniGraphElem.offsetHeight);
        graphList[miniGraphIndex].showNavInfo(false);
      }
      const miniGraphIndex = graphIndex - 1;
      // console.log('minigraph idx', miniGraphIndex)
      graphList[miniGraphIndex].onBackgroundRightClick(event => {
        // console.log(miniGraphIndex)
        tempGraph = graphList[miniGraphIndex];
        tempMiniGraph = graphList[miniGraphIndex - 1];
        tempGraphIdx = miniGraphIndex
        stopDAGAnimation();
        startDAGAnimation(); // NOTE: this function depends on global variable tempGraph
        switchGraphVisibility(miniGraphIndex, iterFlag);
        loadMetaArrayDagInfo(graphInfoList[miniGraphIndex])
        updateDAGTitle(graphInfoList[miniGraphIndex].metaType, graphInfoList[miniGraphIndex])
      });
    } else {
      const miniGraphIndex = graphIndex - 1;
      const tempMiniGraphElem = document.getElementById(`graph${miniGraphIndex}`)
      if (shapeIdx === 1) {
        tempMiniGraphElem.style.top = '10%'
        tempMiniGraphElem.style.width = '25%';
        tempMiniGraphElem.style.height = '25%';
      } else {
        tempMiniGraphElem.style.top = '10%'
        tempMiniGraphElem.style.width = '15%';
        tempMiniGraphElem.style.height = '79%';
      }
      tempMiniGraphElem.style.zIndex = '2';
      tempMiniGraphElem.style.visibility = 'visible';
      graphList[miniGraphIndex].width(tempMiniGraphElem.offsetWidth);
      graphList[miniGraphIndex].height(tempMiniGraphElem.offsetHeight);
      graphList[miniGraphIndex].onBackgroundRightClick(event => {
        tempGraph = graphList[miniGraphIndex];
        tempMiniGraph = graphList[miniGraphIndex - 1];
        tempGraphIdx = miniGraphIndex
        stopDAGAnimation();
        startDAGAnimation(); // NOTE: this function depends on global variable tempGraph
        switchGraphVisibility(miniGraphIndex, iterFlag);
        loadMetaArrayDagInfo(graphInfoList[miniGraphIndex])
        updateDAGTitle(graphInfoList[miniGraphIndex].metaType, graphInfoList[miniGraphIndex])
      });
      graphList[miniGraphIndex].showNavInfo(false);
    }
  }
}

// function switchWaveMiniGraph(showFlag = true) {
//   if(showFlag) {
//     showMiniWaveGraphFlag = true;
//     const tempMiniGraphElem = document.getElementById(`mini-wave-graph`)
//     tempMiniGraphElem.style.width = '25%';
//     tempMiniGraphElem.style.height = '25%';
//     tempMiniGraphElem.style.zIndex = '2';
//     tempMiniGraphElem.style.visibility = 'visible';
//     miniWaveGraph.width(tempMiniGraphElem.offsetWidth);
//     miniWaveGraph.height(tempMiniGraphElem.offsetHeight);
//     miniWaveGraph.showNavInfo(false);
//     miniWaveGraph.resumeAnimation();
//     miniWaveGraph.onNodeHover((node, prevNode) => {
//       if (node == null) {
//         tempGraph.nodeVisibility(true)
//         tempGraph.linkVisibility(true)
//       } else {
//         tempGraph.nodeVisibility(dagNode => dagNode.wave === node.id)
//         tempGraph.linkVisibility(dagLink => dagLink.source.wave === node.id && dagLink.target.wave === node.id)
//       }
//     })
//   } else {
//     showMiniWaveGraphFlag = false;
//     const tempMiniGraphElem = document.getElementById(`mini-wave-graph`)
//     tempMiniGraphElem.style.visibility = 'hidden';
//     miniWaveGraph.pauseAnimation();
//     miniWaveGraph.onNodeHover(() => null)
//   }
// }

function switchMiniBuilding(showFlag = true, posIdx = 0) {
  if(showFlag) {
    // showMiniWaveGraphFlag = true;
    const tempMiniGraphElem = document.getElementById(`mini-building`)
    if(posIdx === 0) {
      tempMiniGraphElem.style.top = '10%'
      tempMiniGraphElem.style.width = '25%';
      tempMiniGraphElem.style.height = '25%';
    } else if (posIdx === 1) {
      tempMiniGraphElem.style.top = '10%'
      tempMiniGraphElem.style.width = '9%';
      tempMiniGraphElem.style.height = '20%';
    }
    tempMiniGraphElem.style.zIndex = '2';
    tempMiniGraphElem.style.visibility = 'visible';
    miniBuildingGraph.width(tempMiniGraphElem.offsetWidth);
    miniBuildingGraph.height(tempMiniGraphElem.offsetHeight);
    miniBuildingGraph.showNavInfo(false);
    miniBuildingGraph.resumeAnimation();
    // miniBuildingGraph.onNodeHover((node, prevNode) => {
    //   if (node == null) {
    //     tempGraph.nodeVisibility(true)
    //     tempGraph.linkVisibility(true)
    //   } else {
    //     tempGraph.nodeVisibility(dagNode => dagNode.wave === node.id)
    //     tempGraph.linkVisibility(dagLink => dagLink.source.wave === node.id && dagLink.target.wave === node.id)
    //   }
    // })
  } else {
    // showMiniWaveGraphFlag = false;
    const tempMiniGraphElem = document.getElementById(`mini-building`)
    tempMiniGraphElem.style.visibility = 'hidden';
    miniBuildingGraph.pauseAnimation();
    // miniBuildingGraph.onNodeHover(() => null)
  }
}

function switchFullDagGraph(showFlag = true) {
  if (showFlag) {
    document.getElementById('full-dag-graph-container').style.display = 'block';
    document.getElementById('strata-container').style.display = 'hidden';
    document.getElementById('graph-container').style.width = '49.5%';
    resizeDag()
  } else {
    document.getElementById('full-dag-graph-container').style.display = 'hidden';
    document.getElementById('strata-container').style.display = 'block';
    document.getElementById('graph-container').style.width = '49.5%';
    resizeDag()
  }
}


// Sort Data

// function initpickgui2(ranking) {
//   let choices = Object.keys(ranking).sort(function(a, b) {
//     return ranking[a] - ranking[b]
//   })
//   console.log(choices);
//   gui2.add(fixedpoint, 'Fixed Point', choices)
//     .onChange(selection => {
//       let dsfp = selection.split('/');
//       let file = './data_dags/' + dsfp[0] + '/dagmeta_' + dsfp[1] + '.json'
//       console.log("Loading: ", file);
//       loadFile(file);
//       loadLayer();
//     });
// }

// function sortAll() {
//   let ranking = {}
//   for (const i in fp_choices) {
//     let dsfp = fp_choices[i].split('/');
//     let filename = './data_dags/' + dsfp[0] + '/dagmeta_' + dsfp[1] + '.json'
//     d3.json(filename).then(function(data) {
//       if (data == undefined) {
//         ranking[fp_choices[i]] = Infinity;
//         console.log("Undefined!");
//         if (i == fp_choices.length - 1) {
//           initpickgui2(ranking);
//         }
//         return;
//       }
//       let verts = 0;
//       let edges = 0;
//       let fpedges = 0;

//       for (const vert in data["nodes"]) {
//         const vals = data["nodes"][vert]
//         verts += vals["num_vertices"];
//         fpedges += vals["num_edges"]/2;
//       }

//       for (const sedge in data["edges"]) {
//         edges += data["edges"][sedge];
//         fpedges += data["edges"][sedge];
//       }
//       ranking[fp_choices[i]] = fpedges;
//       if (i == fp_choices.length - 1) {
//         initpickgui2(ranking);
//       }
//     });
//   }
// }

// Load Data

// const FILE = "./wavemaps/cit-Patents/dagmeta_8-4342010.json"; // tiny
// const FILE = "./wavemaps/cit-Patents/dagmeta_1-405063.json"; // tree
// const FILE = "./wavemaps/cit-Patents/dagmeta_3-3191982.json"; // clique
// const FILE = "./wavemaps/cit-Patents/dagmeta_10-196384.json"; // barely runs
// const FILE = "./wavemaps/cit-Patents/dagmeta_11-164183.json"; // barely interactive
// const FILE = "./wavemaps/cit-Patents/dagmeta_13-3434164.json"; // small connected
// const FILE = "./wavemaps/cit-Patents/dagmeta_14-1037462.json"; // cool
// const FILE = "./wavemaps/cit-Patents/dagmeta_15-275340.json"; // cool2
// const FILE = "./wavemaps/cit-Patents/dagmeta_17-389660.json"; // tall
// const FILE = "./wavemaps/cit-Patents/dagmeta_16-1362234.json"; // first example
// const FILE = "./wavemaps/cit-Patents/dagmeta_43-1965538.json"; // dense top
// const FILE = "./wavemaps/f_dagmeta_1-10126754.json";
// const FILE = "./dagmeta_101-11400.json";
// const FILE = "./wavemaps/movies/dagmeta_31-12735.json";
const FILE = "./data_dags/cit-Patents/dagmeta_15-275340.json";
// loadLayer();
// loadFile(FILE);



function updateDAGTitle(metaType, graphInfo) {
  if (metaType === 'dag.full') {
    document.getElementById('meta-type').innerHTML = 'Raw Meta-DAG'
    document.getElementById('meta-node').setAttribute('title', 'level-connected component');
    document.getElementById('meta-link').setAttribute('title', 'edges between two nodes');
  } else if (metaType === 'dag.span') {
    document.getElementById('meta-type').innerHTML = 'Raw Spanning Meta-DAG'
    document.getElementById('meta-node').setAttribute('title', 'level-connected component');
    document.getElementById('meta-link').setAttribute('title', 'edges between nodes of consecutive levels');
  } else if (metaType === 'wcc') {
    if (graphInfo.topoSpan) {
      document.getElementById('meta-type').innerHTML = 'Topo-Span Wave Connected Component Meta-DAG'
      document.getElementById('meta-node').setAttribute('title', 'wave connected components');
      document.getElementById('meta-link').setAttribute('title', 'closest edges between two nodes');
    } else {
      document.getElementById('meta-type').innerHTML = 'Wave Connected Component Meta-DAG'
      document.getElementById('meta-node').setAttribute('title', 'wave connected components');
      document.getElementById('meta-link').setAttribute('title', 'edges between two nodes');
    }
  } else if (metaType === 'wcc.dag') {
    document.getElementById('meta-type').innerHTML = 'Local Spanning Meta-DAG'
    document.getElementById('meta-node').setAttribute('title', 'level-connected component in the selected meta-node');
    document.getElementById('meta-link').setAttribute('title', 'edges between nodes');
  } else if (metaType === 'edgeCut') {
    if (graphInfo.topoSpan) {
      document.getElementById('meta-type').innerHTML = 'Topo-Span Edge-Cut Compressed Meta-DAG'
      document.getElementById('meta-node').setAttribute('title', 'sequence of connected level-connected components');
      document.getElementById('meta-link').setAttribute('title', 'closest edges between two nodes');
    } else {
      document.getElementById('meta-type').innerHTML = 'Edge-Cut Compressed Meta-DAG'
      document.getElementById('meta-node').setAttribute('title', 'sequence of connected level-connected components');
      document.getElementById('meta-link').setAttribute('title', 'edges between two nodes');
    }
  } else if (metaType === 'edgeCut.dag') {
    document.getElementById('meta-type').innerHTML = 'Local Spanning Meta-DAG'
    document.getElementById('meta-node').setAttribute('title', 'level-connected component in the selected meta-node');
    document.getElementById('meta-link').setAttribute('title', 'edges between nodes');
  } else if (metaType === 'wf.wave') {
    if (graphInfo.topoSpan) {
      document.getElementById('meta-type').innerHTML = 'Spanning Wave Meta-DAG'
      document.getElementById('meta-node').setAttribute('title', 'all edges inside a wave');
      document.getElementById('meta-link').setAttribute('title', 'edges between two consecutive waves');
    } else {
      document.getElementById('meta-type').innerHTML = 'Wave Meta-DAG'
      document.getElementById('meta-node').setAttribute('title', 'all edges inside a wave');
      document.getElementById('meta-link').setAttribute('title', 'edges between two waves');
    }
  } else if (metaType === 'wf.frag') {
    if (graphInfo.topoSpan) {
      document.getElementById('meta-type').innerHTML = 'Spanning Frag Meta-DAG'
      document.getElementById('meta-node').setAttribute('title', 'all edges inside a fragment');
      document.getElementById('meta-link').setAttribute('title', 'edges between two consecutive fragments');
    } else {
      document.getElementById('meta-type').innerHTML = 'Frag Meta-DAG'
      document.getElementById('meta-node').setAttribute('title', 'all edges inside a fragment');
      document.getElementById('meta-link').setAttribute('title', 'edges between two fragments');
    }
  } else if (metaType === 'wf.dag') {
    document.getElementById('meta-type').innerHTML = 'Local Connected Components'
    document.getElementById('meta-node').setAttribute('title', 'level-connected component in the selected meta-node');
    document.getElementById('meta-link').setAttribute('title', 'edges between nodes of consecutive levels');
  } else if (metaType === 'wf.dag.detail') {
    document.getElementById('meta-type').innerHTML = 'Local Connected Components'
    document.getElementById('meta-node').setAttribute('title', 'level-connected component in the selected meta-node');
    document.getElementById('meta-link').setAttribute('title', 'edges between nodes of consecutive levels');
  }
}

// function requestWaveMetaMini(metaInfo) {
//   selectedWave = null;
//   httpPostAsync(JSON.stringify({
//     filename: metaInfo.filename,
//     graphName: metaInfo.dataset,
//     layer: metaInfo.layer,
//     lcc: metaInfo.lcc,
//     bucket: metaInfo.bucket,
//     maxEdges: IP.max_edges,
//     buildingName: DATA.buildingName
//   }), localHost + 'meta-dag-wave-mini', function(res) {
//     // console.log(res);
//     loadMetaMini(res);
//     // window.open(res);
//   }, 'json')
// }

// function loadMetaMini(data) {
//   const metaData = data[0]
//   const metaInfo = data[1]
//   const metaType = data[2]
//   console.log(metaType);

//   // DATAList[graphIndex] = metaInfo;
//   // DATA = metaInfo;

//   const [graphData, graphInfo] = prepareMetaArrayWave(metaData);
//   miniWaveGraph.graphData(graphData);
//   setTimeout(() => miniWaveGraph.zoomToFit(250, 10, node => true), 500);
//   // loadMetaArrayDagInfo(graphInfo);
// }

function loadMetaArray(data, graphIndex = 1) {
  const metaData = data[0]
  const metaInfo = data[1]
  const metaType = data[2]
  console.log(metaType);
  console.log(metaInfo);

  metaInfo.dagType = metaType
  metaInfo.heightConstrain = true;

  if (graphIndex !== 1) {
    metaInfo.parentNode = clicked;
  }

  DATAList[graphIndex] = metaInfo;
  DATA = metaInfo;

  tempGraphIdx = graphIndex
  tempGraph = graphList[graphIndex];
  tempMiniGraph = graphList[graphIndex - 1];
  stopDAGAnimation();
  startDAGAnimation(); // NOTE: this function depends on global variable tempGraph
  // switchWaveMiniGraph(false); // clear wave mini graph
  // drawMiniBuilding(metaInfo)
  console.log(metaInfo)
  
  let iterFlag = false // used for switch minigraph, only wf version will be true

  if (metaType === 'dag.full') {
    const buildingName = metaInfo.buildingName.slice(8);
    drawMiniBuilding(metaInfo.dataset, buildingName);
    switchMiniBuilding(true, 0);
    // requestWaveMetaMini(metaInfo);
    // switchWaveMiniGraph(true);

    const [graphData, graphInfo] = prepareMetaArrayDag(metaData);
    graphInfo.metaType = metaType
    updateDAGTitle(metaType, graphInfo)
    graphInfoList[graphIndex] = graphInfo;
    tempGraph.graphData(graphData);
    setTimeout(() => {
      tempGraph.cameraPosition();
      tempGraph.zoomToFit(250, 10, node => true)
    }, 500);
    loadMetaArrayDagInfo(graphInfo);
    const capitionElem = document.getElementById(`graph${graphIndex}-label`);
    capitionElem.innerText = 'frag cc DAG';
    capitionElem.style.transform = 'translateY(-100%)'
    capitionElem.style.pointerEvents = 'none'
    tempGraph
      .onNodeRightClick(node => {
        requestNodeFullLabel(node);
      });
    tempGraph
      .onNodeClick(node => {
        click2strata(node)
      });
    // tempGraph
    //   .onNodeHover((node, prevNode) => {
    //     if (node == null) {
    //       selectedWave = null;
    //     } else {
    //       selectedWave = node.wave;
    //     }
    //     miniWaveGraph.nodeThreeObject(function(node) {
    //       return nodeGeomWaveMini(node)
    //     });
    //   });
  } else if (metaType === 'dag.span') {
    const buildingName = metaInfo.buildingName.slice(8);
    drawMiniBuilding(metaInfo.dataset, buildingName);
    switchMiniBuilding(true, 0);
    // requestWaveMetaMini(metaInfo);
    // switchWaveMiniGraph(true);

    const [graphData, graphInfo] = prepareMetaArrayDag(metaData);
    graphInfo.metaType = metaType
    updateDAGTitle(metaType, graphInfo)
    graphInfoList[graphIndex] = graphInfo;
    tempGraph.graphData(graphData);
    setTimeout(() => {
      tempGraph.cameraPosition();
      tempGraph.zoomToFit(250, 10, node => true)
    }, 500);
    loadMetaArrayDagInfo(graphInfo);
    const capitionElem = document.getElementById(`graph${graphIndex}-label`);
    capitionElem.innerText = 'span frag cc DAG';
    capitionElem.style.transform = 'translateY(-100%)'
    capitionElem.style.pointerEvents = 'none'
    tempGraph
      .onNodeRightClick(node => {
        requestNodeFullLabel(node);
      });
    tempGraph
      .onNodeClick(node => {
        click2strata(node)
      });
    // tempGraph
    //   .onNodeHover((node, prevNode) => {
    //     if (node == null) {
    //       selectedWave = null;
    //     } else {
    //       selectedWave = node.wave;
    //     }
    //     miniWaveGraph.nodeThreeObject(function(node) {
    //       return nodeGeomWaveMini(node)
    //     });
    //   });
  } else if (metaType === 'wcc') {
    const buildingName = metaInfo.buildingName.slice(8);
    drawMiniBuilding(metaInfo.dataset, buildingName);
    switchMiniBuilding(true, 0);
    const [graphData, graphInfo] = prepareMetaArrayWcc(metaData);
    graphInfo.metaType = metaType
    updateDAGTitle(metaType, graphInfo)
    graphInfoList[graphIndex] = graphInfo;
    tempGraph.graphData(graphData);
    setTimeout(() => {
      tempGraph.cameraPosition();
      tempGraph.zoomToFit(250, 10, node => true)
    }, 500);
    loadMetaArrayDagInfo(graphInfo);
    const capitionElem = document.getElementById(`graph${graphIndex}-label`);
    capitionElem.innerText = 'wave cc Meta DAG';
    capitionElem.style.transform = 'translateY(-100%)'
    capitionElem.style.pointerEvents = 'none'
    tempGraph
      .onNodeClick(node => {
        click2wccDag(node)
        addBuildingHighlight(miniBuildingGraph, new Set([node.wave]))
      });
  } else if (metaType === 'wcc.dag') {
    switchMiniBuilding(true, 1);
    const [graphData, graphInfo] = prepareMetaArrayDag(metaData);
    graphInfo.metaType = metaType
    graphInfo.parentNode = clicked;
    updateDAGTitle(metaType, graphInfo)
    graphInfoList[graphIndex] = graphInfo;
    tempGraph.graphData(graphData);
    setTimeout(() => {
      tempGraph.cameraPosition();
      tempGraph.zoomToFit(250, 10, node => true)
    }, 500);
    loadMetaArrayDagInfo(graphInfo);
    const capitionElem = document.getElementById(`graph${graphIndex}-label`);
    capitionElem.innerText = 'span frag cc DAG';
    capitionElem.style.transform = 'translateY(-100%)'
    capitionElem.style.pointerEvents = 'none'
    tempGraph
      .onNodeRightClick(node => {
        requestNodeFullLabel(node);
      });
    tempGraph
      .onNodeClick(node => {
        click2strata(node)
      });
  } else if (metaType === 'edgeCut') {
    const buildingName = metaInfo.buildingName.slice(8);
    drawMiniBuilding(metaInfo.dataset, buildingName);
    switchMiniBuilding(true, 0);
    const [graphData, graphInfo] = prepareMetaArrayEdgeCut(metaData);
    graphInfo.metaType = metaType
    updateDAGTitle(metaType, graphInfo)
    graphInfoList[graphIndex] = graphInfo;
    tempGraph.graphData(graphData);
    setTimeout(() => {
      tempGraph.cameraPosition();
      tempGraph.zoomToFit(250, 10, node => true)
    }, 500);
    loadMetaArrayDagInfo(graphInfo);
    const capitionElem = document.getElementById(`graph${graphIndex}-label`);
    capitionElem.innerText = 'partial src2snk agg.';
    capitionElem.style.transform = 'translateY(-100%)'
    capitionElem.style.pointerEvents = 'none'
    tempGraph
      .onNodeClick(node => {
        click2edgeCutDag(node)
        addBuildingHighlight(miniBuildingGraph, new Set([...Array(node.waveMax - node.waveMin + 1).keys()].map(i => i + node.waveMin)))
      });
  } else if (metaType === 'edgeCut.dag') {
    switchMiniBuilding(true, 1);
    const [graphData, graphInfo] = prepareMetaArrayDag(metaData);
    graphInfo.metaType = metaType
    graphInfo.parentNode = clicked;
    updateDAGTitle(metaType, graphInfo)
    graphInfoList[graphIndex] = graphInfo;
    tempGraph.graphData(graphData);
    setTimeout(() => {
      tempGraph.cameraPosition();
      tempGraph.zoomToFit(250, 10, node => true)
    }, 500);
    loadMetaArrayDagInfo(graphInfo);
    const capitionElem = document.getElementById(`graph${graphIndex}-label`);
    capitionElem.innerText = 'span frag cc DAG';
    capitionElem.style.transform = 'translateY(-100%)'
    capitionElem.style.pointerEvents = 'none'
    tempGraph
      .onNodeRightClick(node => {
        requestNodeFullLabel(node);
      });
    tempGraph
      .onNodeClick(node => {
        click2strata(node)
      });
  } else if (metaType === 'wf.wave') {
    iterFlag = true
    const buildingName = metaInfo.buildingName.slice(8);
    drawMiniBuilding(metaInfo.dataset, buildingName);
    switchMiniBuilding(true, 0);
    const [graphData, graphInfo] = prepareMetaArrayWave(metaData);
    graphInfo.metaType = metaType
    updateDAGTitle(metaType, graphInfo)
    graphInfoList[graphIndex] = graphInfo;
    tempGraph.graphData(graphData);
    setTimeout(() => {
      tempGraph.cameraPosition();
      tempGraph.zoomToFit(250, 10, node => true)
    }, 500);
    loadMetaArrayDagInfo(graphInfo);
    const capitionElem = document.getElementById(`graph${graphIndex}-label`);
    capitionElem.innerText = 'wave DAG';
    capitionElem.style.transform = 'translateY(-100%)'
    capitionElem.style.pointerEvents = 'none'
    tempGraph
      .onNodeClick(node => {
        click2wfFrag(node)
        addBuildingHighlight(miniBuildingGraph, new Set([node.id])) // here id is the wave index
      });
  } else if (metaType === 'wf.frag') {
    iterFlag = true
    // const buildingName = metaInfo.buildingName.slice(8); // TODO
    // drawMiniBuilding(metaInfo.dataset, buildingName); // TODO
    switchMiniBuilding(true, 1);
    const [graphData, graphInfo] = prepareMetaArrayFrag(metaData);
    graphInfo.metaType = metaType
    graphInfo.parentNode = clicked;
    updateDAGTitle(metaType, graphInfo)
    graphInfoList[graphIndex] = graphInfo;
    tempGraph.graphData(graphData);
    setTimeout(() => {
      tempGraph.cameraPosition();
      tempGraph.zoomToFit(250, 10, node => true)
    }, 500);
    loadMetaArrayDagInfo(graphInfo);
    const capitionElem = document.getElementById(`graph${graphIndex}-label`);
    capitionElem.innerText = 'frag DAG';
    capitionElem.style.transform = 'translateY(-100%)'
    capitionElem.style.pointerEvents = 'none'
    tempGraph
      .onNodeClick(node => {
        click2wfDag(node)
      });
  } else if (metaType === 'wf.dag') {
    iterFlag = true
    // const buildingName = metaInfo.buildingName.slice(8); // TODO
    // drawMiniBuilding(metaInfo.dataset, buildingName); // TODO
    switchMiniBuilding(true, 1);
    const [graphData, graphInfo] = prepareMetaArrayWFDag(metaData);
    graphInfo.metaType = metaType
    graphInfo.parentNode = clicked;
    updateDAGTitle(metaType, graphInfo)
    graphInfoList[graphIndex] = graphInfo;
    tempGraph.graphData(graphData);
    setTimeout(() => {
      tempGraph.cameraPosition();
      tempGraph.zoomToFit(250, 10, node => true)
    }, 500);
    loadMetaArrayDagInfo(graphInfo);
    const capitionElem = document.getElementById(`graph${graphIndex}-label`);
    capitionElem.innerText = 'frag cc';
    capitionElem.style.transform = 'translateY(-100%)'
    capitionElem.style.pointerEvents = 'none'
    tempGraph
      .onNodeClick(node => {
        if (node.idList.length === 1) {
          click2strata(node)
        } else {
          click2wfDagDetail(node)
        }
      });
  } else if (metaType === 'wf.dag.detail') {
    iterFlag = true
    // const buildingName = metaInfo.buildingName.slice(8); // TODO
    // drawMiniBuilding(metaInfo.dataset, buildingName); // TODO
    switchMiniBuilding(true, 1);
    const [graphData, graphInfo] = prepareMetaArrayWFDagDetail(metaData);
    graphInfo.metaType = metaType
    graphInfo.parentNode = clicked;
    updateDAGTitle(metaType, graphInfo)
    graphInfoList[graphIndex] = graphInfo;
    tempGraph.graphData(graphData);
    setTimeout(() => {
      tempGraph.cameraPosition();
      tempGraph.zoomToFit(250, 10, node => true)
    }, 500);
    loadMetaArrayDagInfo(graphInfo);
    const capitionElem = document.getElementById(`graph${graphIndex}-label`);
    capitionElem.innerText = 'frag cc';
    capitionElem.style.transform = 'translateY(-100%)'
    capitionElem.style.pointerEvents = 'none'
    tempGraph
      .onNodeRightClick(node => {
        requestNodeFullLabel(node);
      });
    tempGraph
      .onNodeClick(node => {
        click2strata(node)
      });
  } else {
    console.log('E: wrong type in loadMetaArray')
  }

  switchGraphVisibility(graphIndex, iterFlag);
}

function prepareMetaArrayDag(data) {
  selectedWave = null;
  const [nodeArray, linkArray, jumpLinkArray] = data;

  let minSet = Infinity;
  let maxSet = 0;
  let verts = 0;
  let edges = 0;
  let fpedges = 0;
  let minNodeESize = Infinity;
  let maxNodeESize = 0;

  const nodes = [];
  const links = [];
  const idx2node = {};

  for (const [v, wave, frag, set, vSize, eSize, touchESize] of nodeArray) {
    // console.log(v, set, vSize, eSize, localVSize, localESize)
    const node = {
      id: v,
      wave: wave,
      frag: frag,
      set: set,
      size: vSize,
      esize: eSize,
      touchESize: touchESize,
      isSrc: true,
      highWeight: false,
      wDeg: 0,
      mall: false,
    }
    nodes.push(node)
    idx2node[v] = node;
    maxSet = Math.max(maxSet, set);
    minSet = Math.min(minSet, set);
    verts += vSize;
    fpedges += eSize;
    maxNodeESize = Math.max(maxNodeESize, eSize);
    minNodeESize = Math.min(minNodeESize, eSize);
  }
  console.log('nodes', nodes.length)
  // console.log(linkArray)
  if (linkArray == null || linkArray == undefined) {
    // // empty link, continue
  } else {
    for (const [src, tgt, eSize] of linkArray) {
      links.push({ source: src, target: tgt, size: eSize })
      fpedges += eSize;
      edges += eSize;
      idx2node[tgt].isSrc = false;
      idx2node[tgt].wDeg += eSize;
    }
  }
  if (jumpLinkArray == null || jumpLinkArray == undefined) {
    // // span only version, continue
  } else {
    for (const [src, tgt, eSize] of jumpLinkArray) {
      links.push({ source: src, target: tgt, size: eSize })
      fpedges += eSize;
      edges += eSize;
      idx2node[tgt].isSrc = false;
      idx2node[tgt].wDeg += eSize;
    }
  }
  console.log('links', links.length)

  const setRange = maxSet - minSet + 1;
  console.log(maxSet, minSet);
  const distFactor = Math.min(400, Math.max(2000 / setRange, 160));
  for (const node of nodes) {
    node.density = node.esize == 0 ? 0 : 2 * node.esize / node.size / (node.size - 1);
    if (node.density == null || isNaN(node.density)) {
      console.log("error")
    }
    if (node.esize + node.touchESize >= TH_FPVIEWER && node.density <= 0.95) {
      node.mall = true;
    }
    node.color = getColor(node.density);
    node.fyBase = (node.set - minSet - setRange / 2) * distFactor;
    node.fy = node.fyBase * verticalStretch.verticalFactor / 100;
  }

  let importantNodes;
  const maxWDeg = d3.max(nodes, d => d.wDeg)
  const aveWDeg = d3.mean(nodes, d => d.wDeg)
  if (maxWDeg === aveWDeg) {
    // the same deg, nothing todo with wDeg
    importantNodes = nodes.filter(d => d.isSrc);
  } else {
    const stdWDeg = d3.mean(nodes, d => d.wDeg)
    const maxDeviation = Math.floor((maxWDeg - aveWDeg) / stdWDeg);
    const TH = maxDeviation * stdWDeg + aveWDeg;
    nodes.filter(d => d.wDeg >= TH).forEach(d => d.highWeight = true);
    importantNodes = nodes.filter(d => d.isSrc || d.wDeg >= TH);
  }

  requestNodeLabel(importantNodes, DATA, tempGraphIdx)

  return [
    {
      nodes: nodes,
      links: links
    }, {
      verts: verts, 
      edges: edges, 
      fpedges: fpedges, 
      maxNodeESize: maxNodeESize, 
      minNodeESize: minNodeESize, 
      nodeNum: nodes.length, 
      linkNum: links.length
    }
  ]
}

function prepareMetaArrayEdgeCut(data) {
  const [nodeArray, linkArray] = data;

  let minSet = Infinity;
  let maxSet = 0;
  let verts = 0;
  let edges = 0;
  let fpedges = 0;
  let minNodeESize = Infinity;
  let maxNodeESize = 0;

  const nodes = [];
  const links = [];
  const idx2node = {};

  const set2hight = {};
  const v2set = {};
  const src2minTgtSet = {};
  const tgt2maxSrcSet = {};

  for (const [v, set, vSize, eSize, localVSize, localESize, waveMin, waveMax] of nodeArray) {
    // console.log(v, set, vSize, eSize, localVSize, localESize)
    const node = {
      id: v,
      set: set,
      size: vSize,
      esize: eSize,
      localESize: localESize,
      isSrc: true,
      highWeight: false,
      wDeg: 0, 
      waveMin: waveMin,
      waveMax: waveMax,
    }
    nodes.push(node)
    idx2node[v] = node;
    maxSet = Math.max(maxSet, set);
    minSet = Math.min(minSet, set);
    verts += vSize;
    fpedges += eSize;
    maxNodeESize = Math.max(maxNodeESize, eSize);
    minNodeESize = Math.min(minNodeESize, eSize);

    set2hight[set] = 0;
    v2set[v] = set;
  }
  console.log('nodes', nodes.length)
  for (const [src, tgt, eSize, localESize] of linkArray) {
    links.push({ source: src, target: tgt, size: eSize })
    fpedges += eSize;
    edges += eSize;
    idx2node[tgt].isSrc = false;
    idx2node[tgt].wDeg += eSize;

    if (!src2minTgtSet.hasOwnProperty(src)) {
      src2minTgtSet[src] = Infinity;
    }
    src2minTgtSet[src] = Math.min(src2minTgtSet[src], v2set[tgt]);
    if (!tgt2maxSrcSet.hasOwnProperty(tgt)) {
      tgt2maxSrcSet[tgt] = -Infinity;
    }
    tgt2maxSrcSet[tgt] = Math.max(tgt2maxSrcSet[tgt], v2set[src]);
  }
  console.log('links', links.length);


  let tempHeight = 0;
  for (const set of Object.keys(set2hight).sort((a, b) => parseInt(a) - parseInt(b))) {
    set2hight[set] = tempHeight ++;
  }

  const setRange = set2hight[maxSet] - set2hight[minSet] + 1;
  const distFactor = Math.min(100, Math.max(2000 / setRange, 10));
  for (const node of nodes) {
    node.density = node.esize == 0 ? 0 : 2 * node.esize / node.size / (node.size - 1);
    if (node.density == null || isNaN(node.density)) {
      console.log("error")
    }
    node.color = getColor(node.density);
    node.fyBase = (set2hight[node.set] - setRange / 2) * distFactor;
    node.fy = node.fyBase * verticalStretch.verticalFactor / 100;
  }

  const maxWDeg = d3.max(nodes, d => d.wDeg)
  const aveWDeg = d3.mean(nodes, d => d.wDeg)
  if (maxWDeg === aveWDeg) {
    // the same deg, nothing todo with wDeg
  } else {
    const stdWDeg = d3.mean(nodes, d => d.wDeg)
    const maxDeviation = Math.floor((maxWDeg - aveWDeg) / stdWDeg);
    const TH = maxDeviation * stdWDeg + aveWDeg;
    nodes.filter(d => d.wDeg >= TH).forEach(d => d.highWeight = true);
  }

  let finalLinks;
  let topoSpan = false;
  if (links.length > 1024) {
    topoSpan = true;
    // finalLinks = links.filter(link => v2set[link.target] === src2minTgtSet[link.source])
    finalLinks = links.filter(link => v2set[link.source] === tgt2maxSrcSet[link.target] || v2set[link.target] === src2minTgtSet[link.source])
  } else {
    finalLinks = links
  }
  console.log('finalLinks', finalLinks.length)

  return [
    {
      nodes: nodes,
      links: finalLinks
    }, {
      verts: verts, 
      edges: edges, 
      fpedges: fpedges, 
      maxNodeESize: maxNodeESize, 
      minNodeESize: minNodeESize, 
      nodeNum: nodes.length, 
      linkNum: finalLinks.length,
      topoSpan: topoSpan,
    }
  ]
}

function prepareMetaArrayWcc(data) {
  const [nodeArray, linkArray] = data;

  let minSet = Infinity;
  let maxSet = 0;
  let verts = 0;
  let edges = 0;
  let fpedges = 0;
  let minNodeESize = Infinity;
  let maxNodeESize = 0;

  const nodes = [];
  const links = [];
  const idx2node = {};

  const set2hight = {};
  const v2set = {};
  const src2minTgtSet = {};
  const tgt2maxSrcSet = {};

  for (const [v, set, vSize, eSize, localVSize, localESize, wave] of nodeArray) {
    // console.log(v, set, vSize, eSize, localVSize, localESize, wave)
    const node = {
      id: v,
      set: set,
      size: vSize,
      esize: eSize,
      localESize: localESize,
      isSrc: true,
      highWeight: false,
      wDeg: 0,
      wave: wave
    }
    nodes.push(node)
    idx2node[v] = node;
    maxSet = Math.max(maxSet, set);
    minSet = Math.min(minSet, set);
    verts += vSize;
    fpedges += eSize;
    maxNodeESize = Math.max(maxNodeESize, eSize);
    minNodeESize = Math.min(minNodeESize, eSize);

    set2hight[set] = 0;
    v2set[v] = set;
  }
  console.log('nodes', nodes.length)
  for (const [src, tgt, eSize] of linkArray) {
    links.push({ source: src, target: tgt, size: eSize })
    fpedges += eSize;
    edges += eSize;
    idx2node[tgt].isSrc = false;
    idx2node[tgt].wDeg += eSize;

    if (!src2minTgtSet.hasOwnProperty(src)) {
      src2minTgtSet[src] = Infinity;
    }
    src2minTgtSet[src] = Math.min(src2minTgtSet[src], v2set[tgt]);
    if (!tgt2maxSrcSet.hasOwnProperty(tgt)) {
      tgt2maxSrcSet[tgt] = -Infinity;
    }
    tgt2maxSrcSet[tgt] = Math.max(tgt2maxSrcSet[tgt], v2set[src]);
  }
  console.log('links', links.length);


  let tempHeight = 0;
  for (const set of Object.keys(set2hight).sort((a, b) => parseInt(a) - parseInt(b))) {
    set2hight[set] = tempHeight ++;
  }

  const setRange = set2hight[maxSet] - set2hight[minSet] + 1;
  const distFactor = Math.min(100, Math.max(2000 / setRange, 10));
  for (const node of nodes) {
    node.density = node.esize == 0 ? 0 : 2 * node.esize / node.size / (node.size - 1);
    if (node.density == null || isNaN(node.density)) {
      console.log("error")
    }
    node.color = getColor(node.density);
    node.fyBase = (set2hight[node.set] - setRange / 2) * distFactor;
    node.fy = node.fyBase * verticalStretch.verticalFactor / 100;
  }

  const maxWDeg = d3.max(nodes, d => d.wDeg)
  const aveWDeg = d3.mean(nodes, d => d.wDeg)
  if (maxWDeg === aveWDeg) {
    // the same deg, nothing todo with wDeg
  } else {
    const stdWDeg = d3.mean(nodes, d => d.wDeg)
    const maxDeviation = Math.floor((maxWDeg - aveWDeg) / stdWDeg);
    const TH = maxDeviation * stdWDeg + aveWDeg;
    nodes.filter(d => d.wDeg >= TH).forEach(d => d.highWeight = true);
  }


  let finalLinks;
  let topoSpan = false;
  if (links.length > TH_SUBDAG) {
    topoSpan = true;
    // finalLinks = links.filter(link => v2set[link.target] === src2minTgtSet[link.source])
    finalLinks = links.filter(link => v2set[link.source] === tgt2maxSrcSet[link.target] || v2set[link.target] === src2minTgtSet[link.source])
  } else {
    finalLinks = links
  }
  console.log('finalLinks', finalLinks.length)

  return [
    {
      nodes: nodes,
      links: finalLinks
    }, {
      verts: verts, 
      edges: edges, 
      fpedges: fpedges, 
      maxNodeESize: maxNodeESize, 
      minNodeESize: minNodeESize, 
      nodeNum: nodes.length, 
      linkNum: finalLinks.length,
      topoSpan: topoSpan,
    }
  ]
}

function prepareMetaArrayWave(data) {
  const [nodeArray, linkArray] = data;

  let minSet = Infinity;
  let maxSet = 0;
  let verts = 0;
  let edges = 0;
  let fpedges = 0;
  let minNodeESize = Infinity;
  let maxNodeESize = 0;

  const nodes = [];
  const links = [];
  const idx2node = {};

  const set2hight = {};
  const v2set = {};
  const src2minTgtSet = {};
  const tgt2maxSrcSet = {};

  for (const [v, vSize, eSize, localVSize, localESize] of nodeArray) {
    // console.log(v, set, vSize, eSize, localVSize, localESize)
    const node = {
      id: v,
      set: v,
      size: vSize,
      esize: eSize,
      localESize: localESize,
      isSrc: true,
      highWeight: false,
      wDeg: 0
    }
    nodes.push(node)
    idx2node[v] = node
    maxSet = Math.max(maxSet, v);
    minSet = Math.min(minSet, v);
    verts += vSize;
    fpedges += eSize;
    maxNodeESize = Math.max(maxNodeESize, eSize);
    minNodeESize = Math.min(minNodeESize, eSize);

    set2hight[v] = 0;
    v2set[v] = v;
  }
  console.log('nodes', nodes.length)
  for (const [src, tgt, eSize] of linkArray) {
    links.push({ source: src, target: tgt, size: eSize })
    fpedges += eSize;
    edges += eSize;
    idx2node[tgt].isSrc = false;
    idx2node[tgt].wDeg += eSize;

    if (!src2minTgtSet.hasOwnProperty(src)) {
      src2minTgtSet[src] = Infinity;
    }
    src2minTgtSet[src] = Math.min(src2minTgtSet[src], v2set[tgt]);
    if (!tgt2maxSrcSet.hasOwnProperty(tgt)) {
      tgt2maxSrcSet[tgt] = -Infinity;
    }
    tgt2maxSrcSet[tgt] = Math.max(tgt2maxSrcSet[tgt], v2set[src]);
  }
  console.log('links', links.length);


  let tempHeight = 0;
  for (const set of Object.keys(set2hight).sort((a, b) => parseInt(a) - parseInt(b))) {
    set2hight[set] = tempHeight ++;
  }

  const setRange = set2hight[maxSet] - set2hight[minSet] + 1;
  const distFactor = Math.min(100, Math.max(2000 / setRange, 10));
  for (const node of nodes) {
    node.density = node.esize == 0 ? 0 : 2 * node.esize / node.size / (node.size - 1);
    if (node.density == null || isNaN(node.density)) {
      console.log("error")
    }
    node.color = getColor(node.density);
    node.fyBase = (set2hight[node.set] - setRange / 2) * distFactor;
    node.fy = node.fyBase * verticalStretch.verticalFactor / 100;
  }

  const maxWDeg = d3.max(nodes, d => d.wDeg)
  const aveWDeg = d3.mean(nodes, d => d.wDeg)
  if (maxWDeg === aveWDeg) {
    // the same deg, nothing todo with wDeg
  } else {
    const stdWDeg = d3.mean(nodes, d => d.wDeg)
    const maxDeviation = Math.floor((maxWDeg - aveWDeg) / stdWDeg);
    const TH = maxDeviation * stdWDeg + aveWDeg;
    nodes.filter(d => d.wDeg >= TH).forEach(d => d.highWeight = true);
  }


  let finalLinks;
  let topoSpan = false;
  if (links.length > TH_SUBDAG) {
    topoSpan = true;
    // finalLinks = links.filter(link => v2set[link.target] === src2minTgtSet[link.source])
    finalLinks = links.filter(link => v2set[link.source] === tgt2maxSrcSet[link.target] || v2set[link.target] === src2minTgtSet[link.source])
  } else {
    finalLinks = links
  }
  console.log('finalLinks', finalLinks.length)

  return [
    {
      nodes: nodes,
      links: finalLinks
    }, {
      verts: verts, 
      edges: edges, 
      fpedges: fpedges, 
      maxNodeESize: maxNodeESize, 
      minNodeESize: minNodeESize, 
      nodeNum: nodes.length, 
      linkNum: finalLinks.length,
      topoSpan: topoSpan,
    }
  ]
}

function prepareMetaArrayFrag(data) {
  const [nodeArray, linkArray] = data;

  let minSet = Infinity;
  let maxSet = 0;
  let verts = 0;
  let edges = 0;
  let fpedges = 0;
  let minNodeESize = Infinity;
  let maxNodeESize = 0;

  const nodes = [];
  const links = [];
  const idx2node = [];

  const set2hight = {};
  const v2set = {};
  const src2minTgtSet = {};
  const tgt2maxSrcSet = {}

  for (const [v, vSize, eSize, localVSize, localESize] of nodeArray) {
    // console.log(v, set, vSize, eSize, localVSize, localESize)
    const node = {
      id: v,
      set: v,
      size: vSize,
      esize: eSize,
      localESize: localESize,
      isSrc: true,
      highWeight: false,
      wDeg: 0,
    }
    nodes.push(node)
    idx2node[v] = node;
    maxSet = Math.max(maxSet, v);
    minSet = Math.min(minSet, v);
    verts += vSize;
    fpedges += eSize;
    maxNodeESize = Math.max(maxNodeESize, eSize);
    minNodeESize = Math.min(minNodeESize, eSize);

    set2hight[v] = 0;
    v2set[v] = v;
  }
  console.log('nodes', nodes.length)
  for (const [src, tgt, eSize] of linkArray) {
    links.push({ source: src, target: tgt, size: eSize })
    fpedges += eSize;
    edges += eSize;
    idx2node[tgt].isSrc = false
    idx2node[tgt].wDeg += eSize;

    if (!src2minTgtSet.hasOwnProperty(src)) {
      src2minTgtSet[src] = Infinity;
    }
    src2minTgtSet[src] = Math.min(src2minTgtSet[src], v2set[tgt]);
    if (!tgt2maxSrcSet.hasOwnProperty(tgt)) {
      tgt2maxSrcSet[tgt] = -Infinity;
    }
    tgt2maxSrcSet[tgt] = Math.max(tgt2maxSrcSet[tgt], v2set[src]);
  }
  console.log('links', links.length);


  let tempHeight = 0;
  for (const set of Object.keys(set2hight).sort((a, b) => parseInt(a) - parseInt(b))) {
    set2hight[set] = tempHeight ++;
  }

  const setRange = set2hight[maxSet] - set2hight[minSet] + 1;
  const distFactor = Math.min(100, Math.max(2000 / setRange, 10));
  for (const node of nodes) {
    node.density = node.esize == 0 ? 0 : 2 * node.esize / node.size / (node.size - 1);
    if (node.density == null || isNaN(node.density)) {
      console.log("error")
    }
    node.color = getColor(node.density);
    node.fyBase = (set2hight[node.set] - setRange / 2) * distFactor;
    node.fy = node.fyBase * verticalStretch.verticalFactor / 100;
  }

  const maxWDeg = d3.max(nodes, d => d.wDeg)
  const aveWDeg = d3.mean(nodes, d => d.wDeg)
  if (maxWDeg === aveWDeg) {
    // the same deg, nothing todo with wDeg
  } else {
    const stdWDeg = d3.mean(nodes, d => d.wDeg)
    const maxDeviation = Math.floor((maxWDeg - aveWDeg) / stdWDeg);
    const TH = maxDeviation * stdWDeg + aveWDeg;
    nodes.filter(d => d.wDeg >= TH).forEach(d => d.highWeight = true);
  }


  let finalLinks;
  let topoSpan = false;
  if (links.length > TH_SUBDAG) {
    topoSpan = true;
    // finalLinks = links.filter(link => v2set[link.target] === src2minTgtSet[link.source])
    finalLinks = links.filter(link => v2set[link.source] === tgt2maxSrcSet[link.target] || v2set[link.target] === src2minTgtSet[link.source])
  } else {
    finalLinks = links
  }
  console.log('finalLinks', finalLinks.length)

  return [
    {
      nodes: nodes,
      links: finalLinks
    }, {
      verts: verts, 
      edges: edges, 
      fpedges: fpedges, 
      maxNodeESize: maxNodeESize, 
      minNodeESize: minNodeESize, 
      nodeNum: nodes.length, 
      linkNum: finalLinks.length,
      topoSpan: topoSpan,
    }
  ]
}

function prepareMetaArrayWFDag(data, minSizeTH = 3) {
  const [nodeArray] = data;

  let minSet = Infinity;
  let maxSet = 0;
  let verts = 0;
  let edges = 0;
  let fpedges = 0;
  let minNodeESize = Infinity;
  let maxNodeESize = 0;

  const nodes = [];
  const links = [];

  // const set2hight = {};
  // const v2set = {};
  // const src2minTgtSet = {};
  const sizeDist = {};

  for (const [v, wave, frag, set, vSize, eSize, touchESize] of nodeArray) {
    if (!sizeDist.hasOwnProperty(eSize)) {
      sizeDist[eSize] = 0;
    }
    sizeDist[eSize] ++;

    // if (nodeArray.length > TH_DAG * 4 && eSize < minSizeTH) {
    //   continue;
    // }

    // console.log(v, set, vSize, eSize, localVSize, localESize)
    nodes.push({ id: v, set: v, size: vSize, esize: eSize, wave: wave, frag: frag, touchESize: touchESize })
    maxSet = Math.max(maxSet, v);
    minSet = Math.min(minSet, v);
    verts += vSize;
    fpedges += eSize;
    maxNodeESize = Math.max(maxNodeESize, eSize);
    minNodeESize = Math.min(minNodeESize, eSize);

    // set2hight[v] = 0;
    // v2set[v] = v;
  }
  console.log('nodes', nodes.length)
  // for (const [src, tgt, eSize] of linkArray) {
  //   links.push({ source: src, target: tgt, size: eSize })
  //   fpedges += eSize;
  //   edges += eSize;

  //   if (!src2minTgtSet.hasOwnProperty(src)) {
  //     src2minTgtSet[src] = Infinity;
  //   }
  //   src2minTgtSet[src] = Math.min(src2minTgtSet[src], v2set[tgt]);
  // }
  // console.log('links', links.length);


  // tempHeight = 0;
  // for (const set of Object.keys(set2hight).sort((a, b) => parseInt(a) - parseInt(b))) {
  //   set2hight[set] = tempHeight ++;
  // }

  // const setRange = set2hight[maxSet] - set2hight[minSet] + 1;
  // const distFactor = Math.max(2000 / setRange, 10);
  for (const node of nodes) {
    node.density = node.esize == 0 ? 0 : 2 * node.esize / node.size / (node.size - 1);
    if (node.density == null || isNaN(node.density)) {
      console.log("error")
    }
    node.color = getColor(node.density);
    node.fz = 0;
  }


  let finalNodes;
  let bucket2nodes;
  if (nodes.length > 1024) {
    const retval = bucketBySize(nodes)
    finalNodes = retval[0];
    bucket2nodes = retval[1];
    [minNodeESize, maxNodeESize] = d3.extent(finalNodes, d => d.esize);
    requestBucketedNodeLabel(finalNodes, DATA, tempGraphIdx, [nodes[0].wave, nodes[0].frag])
  } else {
    // finalNodes = nodes
    // bucket2nodes = null;
    const retval = bucketBySize(nodes)
    finalNodes = retval[0];
    bucket2nodes = retval[1];
    [minNodeESize, maxNodeESize] = d3.extent(finalNodes, d => d.esize);
    requestBucketedNodeLabel(finalNodes, DATA, tempGraphIdx, [nodes[0].wave, nodes[0].frag])
  }
  console.log('finalNodes', finalNodes.length)

  for (const nodes of finalNodes) {
    // console.log(nodes.touchESize)
    if (nodes.touchESize > 0) {
      nodes.isSrc = true;
    } else {
      nodes.isSrc = false;
    }
  }

  return [
    {
      nodes: finalNodes,
      links: links
    }, {
      verts: verts, 
      edges: edges, 
      fpedges: fpedges, 
      maxNodeESize: maxNodeESize, 
      minNodeESize: minNodeESize, 
      nodeNum: finalNodes.length, 
      linkNum: links.length,
      bucket2nodes: bucket2nodes
    }
  ]
}

function prepareMetaArrayWFDagDetail(nodes, minSizeTH = 3) {
  let minSet = Infinity;
  let maxSet = 0;
  let verts = 0;
  let edges = 0;
  let fpedges = 0;
  let minNodeESize = Infinity;
  let maxNodeESize = 0;

  // const nodes = [];
  const links = [];

  // const set2hight = {};
  // const v2set = {};
  // const src2minTgtSet = {};
  const sizeDist = {};

  for (const node of nodes) {
    if (!sizeDist.hasOwnProperty(node.esize)) {
      sizeDist[node.esize] = 0;
    }
    sizeDist[node.esize] ++;

    // if (nodes.length > TH_DAG * 4 && node.eSize < minSizeTH) {
    //   continue;
    // }

    // console.log(v, set, vSize, eSize, localVSize, localESize)
    // nodes.push({ id: v, set: v, size: vSize, esize: eSize })
    maxSet = Math.max(maxSet, node.set);
    minSet = Math.min(minSet, node.set);
    verts += node.size;
    fpedges += node.esize;
    maxNodeESize = Math.max(maxNodeESize, node.esize);
    minNodeESize = Math.min(minNodeESize, node.esize);

    // set2hight[v] = 0;
    // v2set[v] = v;
  }
  console.log('nodes', nodes.length)
  // for (const [src, tgt, eSize] of linkArray) {
  //   links.push({ source: src, target: tgt, size: eSize })
  //   fpedges += eSize;
  //   edges += eSize;

  //   if (!src2minTgtSet.hasOwnProperty(src)) {
  //     src2minTgtSet[src] = Infinity;
  //   }
  //   src2minTgtSet[src] = Math.min(src2minTgtSet[src], v2set[tgt]);
  // }
  // console.log('links', links.length);


  // tempHeight = 0;
  // for (const set of Object.keys(set2hight).sort((a, b) => parseInt(a) - parseInt(b))) {
  //   set2hight[set] = tempHeight ++;
  // }

  // const setRange = set2hight[maxSet] - set2hight[minSet] + 1;
  // const distFactor = Math.max(2000 / setRange, 10);
  for (const node of nodes) {
    node.density = node.esize == 0 ? 0 : 2 * node.esize / node.size / (node.size - 1);
    if (node.density == null || isNaN(node.density)) {
      console.log("error")
    }
    node.color = getColor(node.density);
    node.fz = 0;
  }


  let finalNodes;
  let bucket2nodes;
  if (nodes.length > 1024) {
    const retval = bucketBySize(nodes, true)
    finalNodes = retval[0];
    bucket2nodes = retval[1];
    [minNodeESize, maxNodeESize] = d3.extent(finalNodes, d => d.esize);
    requestBucketedNodeLabel(finalNodes, DATA, tempGraphIdx, [nodes[0].wave, nodes[0].frag])
  } else {
    finalNodes = nodes
    bucket2nodes = null;
    requestNodeLabel(finalNodes, DATA, tempGraphIdx, [nodes[0].wave, nodes[0].frag])
  }
  console.log('finalNodes', finalNodes.length)

  for (const nodes of finalNodes) {
    if (nodes.touchESize > 0) {
      nodes.isSrc = true;
    } else {
      nodes.isSrc = false;
    }
  }


  return [
    {
      nodes: finalNodes,
      links: links
    }, {
      verts: verts, 
      edges: edges, 
      fpedges: fpedges, 
      maxNodeESize: maxNodeESize, 
      minNodeESize: minNodeESize, 
      nodeNum: finalNodes.length, 
      linkNum: links.length,
      bucket2nodes: bucket2nodes
    }
  ]
}

function bucketBySize(nodes, forceBySize = false) {
  const getSizeStat = (node) => [1, node.esize, Math.pow(node.esize, 2)]
  const updateStat = (prev, temp) => [prev[0] + temp[0], prev[1] + temp[1], prev[2] + temp[2]]
  
  const [num, sum, sumsq] = nodes.reduce((prev, temp) => {
    return updateStat(prev, getSizeStat(temp))
  }, [0, 0, 0]);
  const ave = sum / num;
  const std = Math.sqrt(sumsq / num - Math.pow(ave, 2));
  console.log(ave, std);

  const bucket2buckNodes = {};
  const bucket = [];
  const bucket2nodes = {};

  const wave = nodes[0].wave;
  const frag = nodes[0].frag;
  // const [min, max] = d3.extent(nodes, node => node.esize);
  if (std < 1 || forceBySize) {
    // // bucket by esize
    for (const node of nodes) {
      const bucketId = node.esize;
      if (!bucket2buckNodes.hasOwnProperty(bucketId)) {
          const tempNode = { id: bucketId, set: node.set, size: 0, esize: 0, idList: [], wave: wave, frag: frag, touchESize: 0 };
          bucket2buckNodes[bucketId] = tempNode;
          bucket.push(tempNode);
          bucket2nodes[bucketId] = [];
        }
        bucket2buckNodes[bucketId].size += node.size;
        bucket2buckNodes[bucketId].esize += node.esize;
        bucket2buckNodes[bucketId].touchESize += node.touchESize;
        bucket2buckNodes[bucketId].idList.push(node.id);
        bucket2nodes[bucketId].push(node);
    }
  } else {
    // bucket by mean,std
    for (const node of nodes) {
      const bucketId = Math.floor((node.esize - ave) / std);
      if (!bucket2buckNodes.hasOwnProperty(bucketId)) {
          const tempNode = { id: bucketId, set: node.set, size: 0, esize: 0, idList: [], wave: wave, frag: frag, touchESize: 0 };
          bucket2buckNodes[bucketId] = tempNode;
          bucket.push(tempNode);
          bucket2nodes[bucketId] = [];
        }
        bucket2buckNodes[bucketId].size += node.size;
        bucket2buckNodes[bucketId].esize += node.esize;
        bucket2buckNodes[bucketId].touchESize += node.touchESize;
        bucket2buckNodes[bucketId].idList.push(node.id);
        bucket2nodes[bucketId].push(node);
    }
  }

  function spiralLayout(bucket) {
    const spiralR = 10;
    const [nodeBuckMin, nodeBuckMax] = d3.extent(bucket, d => d.id)
    
    const buckIdList = bucket.map(d => d.id).sort((a, b) => -(a - b));
    const buck2step = {}
    for (const step in buckIdList) {
      buck2step[buckIdList[step]] = step;
    }

    const spiralAngle = Math.PI * 3 / 2 * (nodeBuckMax - nodeBuckMin + 1) / bucket.length / bucket.length;
    for (const node of bucket) {
      const step = buck2step[node.id] * 2;
      node.fx = spiralR * step * Math.cos(spiralAngle * step);
      node.fy = -spiralR * step * Math.sin(spiralAngle * step);
      node.fz = 0;

      node.density = node.esize == 0 ? 0 : 2 * node.esize / node.size / (node.size - 1);
      if (node.density == null || isNaN(node.density)) {
        console.log("error")
      }
      node.color = getColor(node.density);
    };
  }

  spiralLayout(bucket);
  return [bucket, bucket2nodes];
}

function loadMetaArrayDagInfo(graphInfo) {
  // update gui2
  console.log("Total:", graphInfo.verts, graphInfo.edges, graphInfo.fpedges);
  console.log("Shown:", graphInfo.nodeNum, graphInfo.linkNum);
  // graph.zoomToFit();
  console.log(graphInfo)
  data_info.vertices = graphInfo.verts;
  data_info.edges = graphInfo.fpedges;
  data_info.dag_edges = graphInfo.edges;
  data_info.drawn_vertices = graphInfo.nodeNum;
  data_info.drawn_edges = graphInfo.linkNum;

  document.getElementById('meta-node').innerText = `|node|:${graphInfo.nodeNum}`
  document.getElementById('meta-link').innerText = `|link|:${graphInfo.linkNum}`
  if (graphInfo.parentNode != null) {
    document.getElementById('selected-node-info').innerText = `#edges represented by the pink selected meta-node: ${graphInfo.parentNode.esize}\n`;
  } else {
    document.getElementById('selected-node-info').innerText = '';
  }
  document.getElementById('meta-detail').innerText = `#raw invisible edges inside nodes: ${graphInfo.fpedges - graphInfo.edges}`


  NODE_THRESH.top = graphInfo.maxNodeESize;
  gui2ContThreshTop.min(graphInfo.minNodeESize);
  gui2ContThreshTop.max(graphInfo.maxNodeESize);
  NODE_THRESH.bottom = graphInfo.minNodeESize;
  gui2ContThreshBottom.min(graphInfo.minNodeESize);
  gui2ContThreshBottom.max(graphInfo.maxNodeESize);
  gui2.updateDisplay();

  const minSlider = document.getElementById('dag-node-threshold-min');
  const maxSlider = document.getElementById('dag-node-threshold-max');
  minSlider.max = graphInfo.maxNodeESize;
  minSlider.min = graphInfo.minNodeESize;
  maxSlider.max = graphInfo.maxNodeESize;
  maxSlider.min = graphInfo.minNodeESize;
  minSlider.value = graphInfo.minNodeESize;
  maxSlider.value = graphInfo.maxNodeESize;
  document.getElementById('dag-node-max-value').innerText = `(${graphInfo.maxNodeESize})`;
  document.getElementById('dag-node-min-value').innerText = `(${graphInfo.minNodeESize})`;
}

// function loadMetaDagUnCompress(data) {
//   const nodeFile = data.nodes;
//   const linkFile = data.links;

//   const nodes = [];
//   const links = [];

//   let maxSet = 0;
//   let verts = 0;
//   let edges = 0;
//   let maxNodeESize = 0;
//   let minNodeESize = Infinity;

//   for (const [v, wave, frag, set, vSize, eSize] of d3.csvParseRows(nodeFile, d3.autoType)) {
//     // console.log(v, set, vSize, eSize, localVSize, localESize)
//     nodes.push({ id: v, set: set, size: vSize, esize: eSize / 2})
//     maxSet = Math.max(maxSet, set);
//     verts += vSize;
//     edges += eSize / 2;
//     maxNodeESize = Math.max(maxNodeESize, eSize / 2);
//     minNodeESize = Math.min(minNodeESize, eSize / 2);
//   }
//   console.log('nodes', nodes.length)
//   for (const [src, tgt, eSize] of d3.csvParseRows(linkFile, d3.autoType)) {
//     links.push({ source: src, target: tgt, size: eSize})
//     edges += eSize;
//   }
//   console.log('links', links.length)

//   const distFactor = Math.min(2000 / maxSet, 50);
//   for (const node of nodes) {
//     node.density = node.esize == 0 ? 0 : 2 * node.esize / node.size / (node.size - 1);
//     node.color = getColor(node.density);
//     node.fy = (node.set - maxSet / 2) * distFactor;
//   }
//   // console.log(nodes, links);

//   graph.graphData({nodes: nodes, links: links});
//   setTimeout(() => graph.zoomToFit(250, 10, node => true), 500);

//   data_info.peel_value = data.info.layer;
//   data_info.vertices = verts;
//   data_info.edges = edges;
//   data_info.dag_edges = links.length;
//   data_info.drawn_vertices = nodes.length;
//   data_info.drawn_edges = links.length;

//   NODE_THRESH.top = maxNodeESize;
//   gui2ContThreshTop.min(minNodeESize);
//   gui2ContThreshTop.max(maxNodeESize);
//   NODE_THRESH.bottom = minNodeESize;
//   gui2ContThreshBottom.min(minNodeESize);
//   gui2ContThreshBottom.max(maxNodeESize);
//   gui2.updateDisplay();

//   DATA = data.info;
// }

// function loadMetaDag(metaDag) {
//   for (const node of metaDag["nodes"]) {
//     node.density = node.size == 0 ? 0 : 2 * node.esize / node.size / (node.size - 1);
//     node.color = getColor(node.density);  
//     // console.log(node, node.density, node.color)
//   }

//   graph.graphData({
//     nodes: metaDag["nodes"],
//     links: metaDag["links"]
//   });

//   // update gui2
//   console.log("Total:", metaDag.info.verts, metaDag.info.edges, metaDag.info.fpedges);
//   console.log("Shown:", metaDag["nodes"].length, metaDag["links"].length);
//   graph.zoomToFit();
//   data_info.vertices = metaDag.info.verts;
//   data_info.edges = metaDag.info.fpedges;
//   data_info.dag_edges = metaDag.info.edges;
//   data_info.drawn_vertices = metaDag["nodes"].length;
//   data_info.drawn_edges = metaDag["links"].length;
//   NODE_THRESH.top = metaDag.info.maxNodeEdges;
//   gui2ContThreshTop.min(metaDag.info.minNodeEdges);
//   gui2ContThreshTop.max(metaDag.info.maxNodeEdges);
//   NODE_THRESH.bottom = metaDag.info.minNodeEdges;
//   gui2ContThreshBottom.min(metaDag.info.minNodeEdges);
//   gui2ContThreshBottom.max(metaDag.info.maxNodeEdges);
//   gui2.updateDisplay();

//   // update globals
//   DATA = metaDag;
//   nodeDS = metaDag.info.nodeset;
//   //nodeMAP = nodemap;
// }

// function loadFile2(filename, forkView, tempSuffix) {
//   forkFlag = forkView;
//   nameSuffix = tempSuffix;
//   d3.json(filename).then(function(data) {
//     // console.log(data);
//     let verts = 0;
//     let edges = 0;
//     let fpedges = 0;

//     const nodeset = disjointSet();
//     //const nodemap = {};
//     const nodes = {};
//     for (const vert in data["nodes"]) {
//       const vals = data["nodes"][vert]
//       // console.log(vert, vals);
//       const density = 2.0 * vals["num_edges"] / (vals["num_vertices"] * (vals["num_vertices"] - 1));
//       const node = {
//         id: vert,
//         set: vals["set"],
//         name: vals["num_edges"],
//         density: density,
//         color: getColor(density),
//         size: vals["num_vertices"],
//         esize: vals["num_edges"] / 2,
//         level: vals["set"]
//       };

//       nodes[vert] = node;
//       nodeset.add(node);
//       //nodemap[nodeset.find(node)] = node;

//       verts += vals["num_vertices"];
//       fpedges += vals["num_edges"] / 2;
//     }

//     let links = [];
//     for (const sedge in data["edges"]) {
//       const edge = sedge.split('-');
//       const v0 = edge[0],
//         v1 = edge[1]
//       let parent = v0;
//       let target = v1;
//       if (nodes[v0].set > nodes[v1].set) {
//         parent = v1;
//         target = v0;
//       }
//       links.push({
//         source: nodeset.find(nodes[parent]),
//         target: nodeset.find(nodes[target]),
//         //targetNode: nodes[target],
//         logsize: Math.log2(data["edges"][sedge] + 1),
//         size: data["edges"][sedge]
//       });

//       edges += data["edges"][sedge];
//       fpedges += data["edges"][sedge];
//     }

//     let minset = 10;
//     let preLength = 0;
//     console.log(nodeset);
//     while (links.length > 2 * IP.max_edges && minset > 0) { // 2x because undirected
//       // /**
//       let sources1 = new Set();
//       let sources2 = new Set();
//       for (const l in links) {
//         let link = links[l];
//         sources1.add(link.source);
//         sources2.add(link.source);
//       }
//       for (const l in links) {
//         let link = links[l];
//         sources1.delete(link.target);
//       }
//       for (const l in links) {
//         let link = links[l];
//         if (!sources1.has(link.source)) {
//           sources2.delete(link.target);
//         }
//       }
//       console.log(sources1, sources2);
//       for (const l in links) {
//         let link = links[l];
//         //console.log(link.source, link, links);
//         if (sources1.has(link.source) && sources2.has(link.target)) {
//           //nodeset.union(nodemap[link.source], nodemap[link.target]);
//           nodeset.union(nodeset._objects[link.source], nodeset._objects[link.target]);
//         }
//       }
//       //const filterLinks = {};
//       const filterLinks = [];
//       for (const l in links) {
//         let link = links[l];
//         //if (nodeset.connected(nodemap[link.source], nodemap[link.target])) {
//         //  nodemap[nodeset.find(nodemap[link.source])].esize += link.size;
//         if (nodeset.connected(nodeset._objects[link.source], nodeset._objects[link.target])) {
//           nodeset._objects[nodeset._findById(link.source)].esize += link.size;
//         } else {
//           link.source = nodeset._findById(link.source);
//           link.target = nodeset._findById(link.target);
//           filterLinks.push(link);
//           //console.log(filterLinks[filterLinks.length-1]);
//         }
//       }
//       links = Object.values(filterLinks);
//       console.log("Reduced to: ", links.length);
//       if (preLength == links.length) {
//         minset--;
//       }
//       preLength = links.length;
//       // **/
//       /**
//       minset++;
//       for (const l in links) {
//         let link = links[l];
//         //console.log(link.source, link, links);
//         //if (nodemap[link.source].set < minset) {
//         //  nodeset.union(nodemap[link.source], nodemap[link.target])
//         //}
//         if (nodeset._objects[link.source].set < minset) {
//           nodeset.union(nodeset._objects[link.source], nodeset._objects[link.target])
//         }
//       }
//       //const filterLinks = {};
//       const filterLinks = [];
//       for (const l in links) {
//         let link = links[l];
//         //if (nodeset.connected(nodemap[link.source], nodemap[link.target])) {
//         //  nodemap[nodeset.find(nodemap[link.source])].esize += link.size;
//         if (nodeset.connected(nodeset._objects[link.source], nodeset._objects[link.target])) {
//           nodeset._objects[nodeset._findById(link.source)].esize += link.size;
//         } else {
//           link.source = nodeset._findById(link.source);
//           link.target = nodeset._findById(link.target);
//           //link.source = nodeset.find(nodemap[link.source]);
//           //link.target = nodeset.find(nodemap[link.target]);
//           /*
//           let lkey = String([link.source,link.target]);
//           //console.log(nodeset.find(nodemap[link.source]), nodeset.find(nodemap[link.target]));
//           if (!(lkey in filterLinks)) {
//             filterLinks[lkey] = {source:link.source, target:link.target, size:link.size};
//           } else {
//             //filterLinks[lkey].source = link.source;
//             //filterLinks[lkey].target = link.source;
//             filterLinks[lkey].size += link.size;
//           }
//           /
//           filterLinks.push(link);
//           //console.log(filterLinks[filterLinks.length-1]);
//         }
//       }
//       //for (const l in filterLinks) {
//       //  filterLinks[l].logsize = Math.log2(filterLinks[l].size+1);
//       //}
//       links = Object.values(filterLinks);
//       console.log("Reduced to: ", links.length);
//       **/
//     }

//     //let nodeArr = Object.values(nodes);
//     const nodesExt = nodeset.extract();
//     const nodeArr = []
//     var maxNodeEdges = 0;
//     var minNodeEdges = Infinity;
//     for (let vert in nodesExt) {
//       let maxset = 0;
//       let num_vertices = 0;
//       let num_edges = 0;
//       for (let i in nodesExt[vert]) {
//         //console.log(nodesExt[vert][i]);
//         if (maxset < nodesExt[vert][i].set) {
//           maxset = nodesExt[vert][i].set;
//         }
//         num_vertices += nodesExt[vert][i].size;
//         num_edges += nodesExt[vert][i].esize;
//       }

//       const density = 2.0 * num_edges / (num_vertices * (num_vertices - 1));

//       const node = {
//         id: nodeset.find(nodesExt[vert][0]),
//         set: maxset,
//         name: num_edges,
//         density: density,
//         color: getColor(density),
//         size: num_vertices,
//         esize: num_edges, // double counted undirected
//         level: maxset
//       };
//       if (maxNodeEdges < num_edges) maxNodeEdges = num_edges;
//       if (minNodeEdges > num_edges) minNodeEdges = num_edges;
//       nodeArr.push(node);
//     }
//     //console.log(nodeArr);
//     graph.graphData({
//       nodes: nodeArr,
//       links: links
//     });

//     // update gui2
//     console.log("Total:", verts, edges, fpedges);
//     console.log("Shown:", nodeArr.length, links.length);
//     graph.zoomToFit();
//     data_info.vertices = verts;
//     data_info.edges = fpedges;
//     data_info.dag_edges = edges;
//     data_info.drawn_vertices = nodeArr.length;
//     data_info.drawn_edges = links.length;
//     NODE_THRESH.top = maxNodeEdges;
//     gui2ContThreshTop.min(minNodeEdges);
//     gui2ContThreshTop.max(maxNodeEdges);
//     NODE_THRESH.bottom = minNodeEdges;
//     gui2ContThreshBottom.min(minNodeEdges);
//     gui2ContThreshBottom.max(maxNodeEdges);
//     gui2.updateDisplay();

//     // update globals
//     DATA = data;
//     nodeDS = nodeset;
//     //nodeMAP = nodemap;
//   });
// }

function drawMiniBuilding(dataset, graphName) {
  const heightFactor = 43.89896759832934; // y_scale in main.js
  function readBuildingInfo(dataset, graphName) {
    const floorPromise = d3.text(`data/${dataset}/wavemap_${graphName}_floor.txt`)
      .then(d => parseFloor(d))
    const colorPromise = d3.text(`data/${dataset}/wavemap_${graphName}_color.txt`)
      .then(d => parseColor(d))
    return Promise.all([floorPromise, colorPromise]);
  }

  function parseFloor(data) {
    const floorInfo = {};
    const dsv = d3.dsvFormat(" ");
    let prevHeight = 0;
    for (const [floor, height, radius, type] of dsv.parseRows(data)) {
      // console.log(floor, type);
      const idx = parseInt(floor)
      if (type === 'ground') {
        prevHeight = parseFloat(height);
        floorInfo[idx] = {};
        floorInfo[idx].bottom = parseFloat(radius);
      } else if (type === 'inner') {
        floorInfo[idx - 1].pos = parseFloat(height);
        floorInfo[idx - 1].height = floorInfo[idx - 1].pos - prevHeight;
        floorInfo[idx - 1].up = parseFloat(radius);
      } else {
        continue;
      }
    }
    return floorInfo;
  }
  
  function parseColor(data) {
    const colorInfo = {};
    const dsv = d3.dsvFormat(" ");
    for (const [bottom, up, type, r, g, b] of dsv.parseRows(data)) {
      // console.log(bottom, type);
      if (type === 'inner') {
        colorInfo[bottom] = d3.rgb(255 * parseFloat(r), 255 * parseFloat(g), 255 * parseFloat(b));
      } else {
        continue;
      }
    }
    return colorInfo;
  }

  function prepareFloor(floorInfo, colorInfo) {
    // console.log(floorInfo, colorInfo)
    const nodes = []
    let maxHeight = 0;
    let maxWidth = 0;
    for (const [idx, color] of Object.entries(colorInfo)) {
      const floor = floorInfo[idx];
      const node = {
        id: parseInt(idx) + 1,
        color: color.darker(1.5).formatHex(),
        bottom: floor.bottom,
        up: floor.up,
        height: floor.height,
        pos: floor.pos,
        fy: (floor.pos - floor.height / 2) * heightFactor,
        fx: 0,
        fz: 0
      };
      nodes.push(node);
      maxHeight += floor.height;
      maxWidth = Math.max(maxWidth, floor.bottom, floor.up);
    }
    console.log(nodes)
    return [nodes, maxHeight, maxWidth];
  }

  function drawBuilding(nodes, maxHeight, maxWidth) {
    const Graph = miniBuildingGraph
    Graph
      .graphData({nodes: nodes, links: []})
      .nodeThreeObject(d => drawFloor(d));

    const maxSize = Math.max(maxHeight * heightFactor, maxWidth * 1.5);
  
    const camera = Graph.camera();
    const controls = Graph.controls()
    const cameraZ = Math.abs( Math.max(maxSize, 10) / 2 * Math.tan( camera.fov * 2 ) );
    camera.position.set(0, maxHeight * heightFactor / 2, cameraZ * 5);
    controls.target.set(0, maxHeight * heightFactor / 2, 0);
    camera.updateProjectionMatrix()
  
    return Graph
  }

  readBuildingInfo(dataset, graphName)
    .then(([floorInfo, colorInfo]) => prepareFloor(floorInfo, colorInfo))
    .then(([nodes, maxHeight, maxWidth]) => drawBuilding(nodes, maxHeight, maxWidth))
}

function drawFloor(floor, floorSet = new Set()) {
  const heightFactor = 43.89896759832934; // y_scale in main.js
  // console.log(floor.bottom, floor.up, floor.height, floor.color)
  const retval = new THREE.Group()
  const geo = new THREE.CylinderGeometry(floor.up, floor.bottom, floor.height * heightFactor, 32);
  const floorMesh = new THREE.Mesh(geo, [
    new THREE.MeshLambertMaterial({
      color: floor.color,
      transparent: true,
      opacity: 0.8
    }),
    new THREE.MeshLambertMaterial({
      color: floor.color,
      transparent: true,
      opacity: 0.8
    }),
    new THREE.MeshLambertMaterial({
      color: floor.color,
      transparent: true,
      opacity: 0.8
    }),
  ]);
  retval.add(floorMesh);
  if (floorSet.has(floor.id)) {
    const geo = new THREE.CylinderGeometry(floor.up + 2, floor.bottom + 2, floor.height * heightFactor, 32);
    const floorMesh = new THREE.Mesh(geo, [
      new THREE.MeshLambertMaterial({
        color: `#ff00ff`,
        transparent: true,
        opacity: 0.5
      }),
      new THREE.MeshLambertMaterial({
        color: `#ff00ff`,
        transparent: true,
        opacity: 0.5
      }),
      new THREE.MeshLambertMaterial({
        color: `#ff00ff`,
        transparent: true,
        opacity: 0.5
      }),
    ]);
    retval.add(floorMesh)
  }
  return retval
}

function addBuildingHighlight(graph, floorSet) {
  console.log(floorSet)
  graph.nodeThreeObject(d => drawFloor(d, floorSet))
}

function getColor(d) {
  //console.log(d);
  // let color = interpolateLinearly(enforceBounds(d), jet);
  let color = d3.interpolateHslLong("hsl(216,77%,70%)", "hsl(0,77%,70%)")(enforceBounds(d));
  let c = new THREE.Color(color);
  //console.log(color);
  //let c = new THREE.Color(color[0], color[1], color[2]);
  return c.getStyle();
}

function enforceBounds(x) {
  if (x < 0) {
    return 0.0;
  } else if (x > 1) {
    return 1.0;
  } else {
    return x;
  }
}

function interpolateLinearly(x, values) {
  // Split values into four lists
  var x_values = [];
  var r_values = [];
  var g_values = [];
  var b_values = [];
  for (i in values) {
    x_values.push(values[i][0]);
    r_values.push(values[i][1][0]);
    g_values.push(values[i][1][1]);
    b_values.push(values[i][1][2]);
  }

  var i = 1;
  while (x_values[i] < x) {
    i = i + 1;
  }
  i = i - 1;
  var width = Math.abs(x_values[i] - x_values[i + 1]);
  var scaling_factor = (x - x_values[i]) / width;
  // Get the new color values though interpolation
  var r = r_values[i] + scaling_factor * (r_values[i + 1] - r_values[i]);
  var g = g_values[i] + scaling_factor * (g_values[i + 1] - g_values[i]);
  var b = b_values[i] + scaling_factor * (b_values[i + 1] - b_values[i]);
  return [enforceBounds(r), enforceBounds(g), enforceBounds(b)];
}


const peelCCBoardWarp = document.getElementById('peelCC-warp');
const peelCCBoard = document.getElementById('peelCC');
const peelCCBoardClose = document.getElementById('peelCC-close');
peelCCBoardClose.onclick = function () {
  // console.log('here')
  peelCCBoardWarp.style.visibility = 'hidden';
}

let peelCCGraph;
let peelCCEdges;

function drawPeelCC(fileName) {
  function plotPeelCC(peelCCData) {
    peelCCBoardWarp.style.visibility = 'visible';
    peelCCGraph = ForceGraph3D()(peelCCBoard)
      .graphData(peelCCData)
      .width(peelCCBoard.offsetWidth)
      .height(peelCCBoard.offsetHeight)
      .backgroundColor('#888888')
      .linkOpacity(0.8)
      .nodeRelSize(10)
      .nodeAutoColorBy('density')
      .nodeVal(node => peelCCNodeSize(node))
      .linkVisibility(true)
      .nodeLabel(node => `peel${node.peel}<br>V${node.vSize}<br>E${node.eSize}`);

    peelCCGraph.d3Force('charge').strength(-200);
    peelCCInfo.drawn_vertices = peelCCData.nodes.length;
    peelCCInfo.drawn_edges = peelCCData.links.length;
    const [minESize, maxESize] = d3.extent(peelCCData.nodes, d => d['eSize']);
    peelCCNODE_THRESH.top = maxESize;
    peelCCGUIContThreshTop.min(minESize);
    peelCCGUIContThreshTop.max(maxESize);
    peelCCNODE_THRESH.bottom = minESize;
    peelCCGUIContThreshBottom.min(minESize);
    peelCCGUIContThreshBottom.max(maxESize);
    peelCCGUI.updateDisplay();
  };
  function processEdge(textData) {
    peelCCEdges = d3.csvParseRows(textData, d => {
      // d = d.map(parseInt);
      tempEdge = {s: parseInt(d[0]), t: parseInt(d[1]), sp: parseInt(d[2]), sc: parseInt(d[3]), tp: parseInt(d[4]), tc: parseInt(d[5])};
      return tempEdge;
    });
  }
  function addStrata() {
    console.log(peelCCEdges)
    peelCCGraph.enableNodeDrag(false)
    .onNodeClick(node => {
      console.log(node)
      const clickedPeel = parseInt(node['peel']);
      const clickedCC = parseInt(node['cc']);
      setStrataUrl('?data=nodata');
      // const nodefilter = new Set();
      const links = [];
      // const nodefilter_label = [{source: "new_id", target: "name"}]; // column name for labels.csv
      for (tempEdge of peelCCEdges) {
        if (tempEdge.sp <= tempEdge.tp && tempEdge.sp === clickedPeel && tempEdge.sc === clickedCC) {
          links.push({source: tempEdge.s, target: tempEdge.t});
        } else if (tempEdge.tp >= tempEdge.sp && tempEdge.tp === clickedPeel && tempEdge.tc === clickedCC) {
          links.push({source: tempEdge.s, target: tempEdge.t});
        };
      };
      // console.log(links)
      //   loadEdges(node, nodefilter, nodefilter_label);
      let filename = fileName + node.id;
      console.log(filename);
      let content = JSON.stringify({
        filename: filename + ".csv",
        edges: links
      });


      // console.log(content)
      httpGetAsync(PREFIX + "query?type=setdatadir&file=./temp", function(res) {
        console.log(res);
      });
      httpPostAsync(content, PREFIX + "save", function (res) {
        console.log(res)
        console.log(res.errno)
        if (res.errno == 0 || res.errno == -17) {
          let C = new THREE.Color(node.color);
          console.log("?dataPath=" + filename + '&nodeColor={"r":' + C.r + ',"g":' + C.g + ',"b":' + C.b + '}');
          console.log(document.getElementById('strata').src);
          httpGetAsync(PREFIX + "query?type=add&file=" + filename + ".csv", function (res) {
            console.log(res);
            setStrataUrl("?dataPath=" + filename + '&nodeColor={"r":' + C.r + ',"g":' + C.g + ',"b":' + C.b + '}&nodeColorProperty=waveLevel&heightProperty=waveLevel');
            console.log(document.getElementById('strata').src);
          });
        };
      });
    });
  };

  Promise.all([
    d3.json(peelCCFolder+fileName+'.json')
        .then(peelCCData => plotPeelCC(peelCCData)),
    d3.text(peelCCFolder+fileName+'.s-t-p-c-p-c.l.edge')
      .then(processEdge)
  ]).then(() => addStrata());
}

var peelCCGUI = new dat.GUI({
  autoPlace: true,
  width: 200
});
// gui2.domElement.style = "position: absolute; top: " + cityContainer.offsetHeight + "px; left: 10px;";
var peelCCGUIcontainer = document.getElementById('peelCC-menu');
peelCCGUIcontainer.appendChild(peelCCGUI.domElement);
// console.log(cityContainer.offsetHeight);
// peelCCGUIcontainer.style = "position: absolute; top: " + 0 + "px; left: 10px; z-index: 5";

var peelCCInfo = {
  drawn_vertices: '',
  drawn_edges: ''
}
peelCCGUI.add(peelCCInfo, 'drawn_vertices').listen();
peelCCGUI.add(peelCCInfo, 'drawn_edges').listen();

const peelCCMAX_MAXSIZE = 200;
var peelCCMAX_VSIZE = {
  node_scale: peelCCMAX_MAXSIZE
}
peelCCGUI.add(peelCCMAX_VSIZE, 'node_scale', 1, 1000)
  .onChange(size => peelCCGraph && peelCCGraph.nodeVal(node => peelCCNodeSize(node)));

var peelCCNODE_THRESH = {
  top: 1000,
  bottom: 0
}

let peelCCGUIf1 = peelCCGUI.addFolder('Node Size Threshold');
peelCCGUIContThreshTop = peelCCGUIf1.add(peelCCNODE_THRESH, 'top', 0, 1000)
  .onChange(size => peelCCGraph && peelCCGraph.nodeVal(node => peelCCNodeSize(node)));
peelCCGUIContThreshBottom = peelCCGUIf1.add(peelCCNODE_THRESH, 'bottom', 0, 1000)
  .onChange(size => peelCCGraph && peelCCGraph.nodeVal(node => peelCCNodeSize(node)));

function peelCCNodeSize(node) {
  if (node['eSize'] > peelCCNODE_THRESH.top || node['eSize'] < peelCCNODE_THRESH.bottom) {
    return 0.0001;
  }
  return 5 * node['relVal'] * (peelCCMAX_VSIZE.node_scale / peelCCMAX_MAXSIZE);
}