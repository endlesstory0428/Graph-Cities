import * as DS from './lib/union-find.js';

import {
  initUI, addTitle,
  enableExpand, disableExpand,
  GlobalLocal, LocalLocalsub, LocalOnly,
} from './localLib/ui.js';
import { strataAddress, httpGet, httpGetAsync, httpPost, httpPostAsync, setStrataUrl } from './localLib/strata.js';
import {
  getSTNodeFromLink, getSTIdxFromLink, getNodeLevel,
  markNode, markLink,
  aveDeg, density, curve,
  breakX, spiralLine,
} from './localLib/util.js';
import { interpolateLinearly, grey2red } from './localLib/colorMap.js';

import {
  readBucketFile, readIntersectionFile,
  readV2lccFile, readVertexLabelFile,
  getNodeLabel, getLinkLabel
} from './localLib/metaDag.js';
import { getSpiral, getArc } from './localLib/gridMap.js';


// // server config releted
const address = "http://127.0.0.1:15984";
// const strataAddress = 'http://euler.dimacs.rutgers.edu:8888/'

// // application config related
const forkTH = 8192;

// // dataset related
const datasetName = 'Fabula_sellbuy';
const ccName = '-cc0';

// // dataset Container
const dataSet = {};
const localDataSet = {};
const localSubDataSet = {};

const localDataSetCache = {
  fp: -1,
  files: {
    info: undefined,
    waves: undefined,
    sources: undefined,
  }
}

// // graph force-directed
let miniGraph;
let dagGraph;
let localGraph;
let localSubGraph;

// // fork colored rect
let forkSvg;
let forkWidth;
let forkHeight;

// // UI related
const UIInfo = {
  layout: {
    forkPos: 1,
    localInfo: {
      container: 0,
      cumulativeInfluencer: 0,
      noncumulativeInfluencer: 0,
      labelExpansion: 0,
    },
    leftVis: {
      dagGraph: 1,
      localSub: 0
    },
    map: 1,
    separaterPos: 2
  },
  top: {

  },
  fork: {
    forkSelectedOnly: false,
    forkMoveFlag: false,
    forkMoveInitX: 0,
    forkMoveInitElemPosSize: {}
  },
  separater: {
    separaterMoveFlag: false,
    separaterMoveInitX: 0,
    separaterMoveInitElemPosSize: {},
  },
  local: {
    distPara: 100,
    cloneFlag: false
  },
  localSub: {
    distPara: 100,
    cloneFlag: false
  },
  right: {
    filter: {
      induce: true,
      span: true,
      jump: false,
      back: false,
    },
    play: {
      stepPerFrag: 3
    }
  },
  neighbor: {
    clickShowNeighborFlag: true,
    step: 0,
    multiSelect: false,
  }
}


// // dag UI related
let dagGUI;
const dagInfo = {
  vertices: '',
  edges: '',
  drawn_vertices: '',
  drawn_edges: '',
  clicked: {
    node: {
      names: '',
      dates: '',
      aucHouses: '',
      objTypes: '',
      genres: ''
    }
  },
  threshold: {
    edges: {
      top: 1000,
      bottom: 0
    },
    vertices: {
      top: 1000,
      bottom: 0
    },
    layer: {
      top: 1000,
      bottom: 0
    },
    bucket: {
      top: 1000,
      bottom: 0
    }
  }
}

const dagControl = {
  bucket: true,
  grid: true,
  circle: false,
  spiral: false,
  spanRatio: 10,
  dagMaxSize: {
    V: 200,
    E: 200
  },
  dagScale: {
    V: 200,
    E: 200,
  },
  dagLevelDistance: 100,
  horizontal: 50,
  vertical: 50,
  horizontalDefault: 50,
  verticalDefault: 50,
  clicked: null,
  nodeRelSize: 6,
  cubeFilter: false,
  induceGraph: false,
}

const dagNODE_THRESH = {
  edges: {
    top: 1000,
    bottom: 0
  },
  vertices: {
    top: 1000,
    bottom: 0
  },
  layer: {
    top: 1000,
    bottom: 0
  },
  bucket: {
    top: 1000,
    bottom: 0
  },
  tag: {
    name: '',
    date: '',
    aucHouse: '',
    objType: '',
    genre: ''
  },
  cover: {
    fp: false,
    aucHouse: false
  }
}
const dagNODE_THRESH_GUI = {
  edges: {},
  vertices: {},
  layer: {},
  bucket: {}
}


let graphGUI;
let subGUI;

const GRAPH_THRESH = {
  focus: {
    top: 0,
    bottom: 0
  },
  span: {
    top: 0,
    bottom: 0
  },
  induce: {
    top: 0,
    bottom: 0
  },
  jump: {
    top: 0,
    bottom: 0
  },
  back: {
    top: 0,
    bottom: 0
  }
}

const GRAPH_CONTROL = {
  fragGrow: {
    play: growFragPlay,
    pause: growFragPauseResume,
    playFlag: true,
    step: 0,
    inc: growFragInc,
    dec: growFragDec,
    maxStep: 0,
    minStep: 0,
    timePerStep: 500,
    timePerRotation: 1000 / 60
  }
}

const GRAPH_VIS = {
  scale: {
    node: 10,
    link: 70,
    longPath: 50,
    layerInduce: 50,
    nodeDefault: 10,
    linkDefault: 70,
    longPathDefault: 50,
    layerInduceDefault: 50
  },
  opacity: {
    node: 60,
    link: 80
  },
  stretch: {
    vertical: 10,
    below: 50,
    current: 50,
    above: 50,
    horizontal: 50,
    verticalDefault: 50,
    belowDefault: 50,
    currentDefault: 50,
    aboveDefault: 50,
    horizontalDefault: 50
  },
  strata: openStrata,
  subGraph: drawLocalSubGraph,
  // spanOnly: false
}

const GRAPH_SEARCH = {
  search: {
    key: '',
    keyHistory: [],
    search: showSearch,
    cumulativeSearch: false,
    showHighDown: showHighDownNodes,
    showLongestPath: showLongestPath,
    showWideList: showWideList,
    extend: showSearchBoundary,
    mode: 0 //0 = exact, 1 = logic and, 2 = logic or
  },
  vis: {
    nodeSize: 100,
    nodeSizePara: 100,
    searchScale: 20,
    searchColor: '#FF00FF',
    searchedColor: '#CC99A2'
  },
  flag: {
    showRes: false
  },
  label: {
    history: [],
    historyMeta: [],
    tempStep: 0,
  }
}

const GRAPH_META = {
  showMeta: false,
}

const GRAPH_GUI = {
  focus: {},
  induce: {},
  span: {},
  jump: {},
  back: {},
  search: {},
  fragGrow: {},
  scale: {},
  opacity: {},
  stretch: {},
  strata: {},
  subGraph: {},
  meta: {}
}

const SUB_VIS = {
  // scale: {
  //   node: 20,
  //   link: 50,
  //   longPath: 50,
  //   layerInduce: 50,
  //   nodeDefault: 50,
  //   linkDefault: 50,
  //   longPathDefault: 50,
  //   layerInduceDefault: 50
  // },
  // opacity: {
  //   node: 60,
  //   link: 80
  // },
  stretch: {
    vertical: 50,
    below: 50,
    current: 50,
    above: 50,
    horizontal: 50,
    verticalDefault: 50,
    belowDefault: 50,
    currentDefault: 50,
    aboveDefault: 50,
    horizontalDefault: 50
  },
  // strata: openStrata,
  // subGraph: drawLocalSubGraph
  localPos: getLocalPos,
  forcePos: getForceDirectedPos,
  layerPos: getLayeredPos
}

const SUB_THRESH = {
  focus: {
    top: 0,
    bottom: 0
  },
  span: {
    top: 0,
    bottom: 0
  },
  induce: {
    top: 0,
    bottom: 0
  },
  jump: {
    top: 0,
    bottom: 0
  },
  back: {
    top: 0,
    bottom: 0
  }
}

const SUB_CONTROL = {
  fragGrow: {
    play: growSubFragPlay,
    pause: growSubFragPauseResume,
    playFlag: true,
    step: 0,
    inc: growSubFragInc,
    dec: growSubFragDec,
    maxStep: 0,
    minStep: 0,
    timePerStep: 1000,
    timePerRotation: 1000 / 60
  }
}

const SUB_GUI = {
  focus: {},
  induce: {},
  span: {},
  jump: {},
  back: {},
  search: {},
  fragGrow: {},
  scale: {},
  opacity: {},
  stretch: {},
  strata: {},
  subGraph: {},
  meta: {},
  pos: {}
}


// // mini map graph related
function nodeMiniGeom(node) {
  let rad = Math.cbrt(node.relVal * 20);

  const sphere = new THREE.Mesh(new THREE.SphereGeometry(rad), new THREE.MeshLambertMaterial({
    color: d3.rgb(node.color.r, node.color.g, node.color.b).toString(),
    transparent: true,
    opacity: 0.75
  }));

  if (!node.isOpened) {
    return sphere;
  } else {
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(rad + 20, 10, 4, 16), new THREE.MeshLambertMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.75
    }));
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(rad + 20, 10, 4, 16).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.75
    }));
    const ring3 = new THREE.Mesh(new THREE.TorusGeometry(rad + 20, 10, 4, 16).rotateY(Math.PI / 2), new THREE.MeshLambertMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.75
    }));

    const retval = new THREE.Group();
    retval.add(sphere)
    retval.add(ring1)
    retval.add(ring2)
    retval.add(ring3)
    return retval
  }
};

function drawMiniGraph(datas) {
  const miniGraphData = datas[0];
  console.log(miniGraphData)

  for (const node of miniGraphData.nodes) {
    if (node.buck === 4) {
      node.isOpened = true;
    } else {
      node.isOpened = false;
    }
  }

  console.log(document.getElementById('mini-map-container').offsetWidth)
  console.log(document.getElementById('mini-map-container').offsetHeight)

  miniGraph = ForceGraph3D()
    (document.getElementById(`mini-graph`))
    .width(document.getElementById('mini-map-container').offsetWidth)
    .height(document.getElementById('mini-map-container').offsetHeight)
    .showNavInfo(false)
    // .cameraPosition({ x: 50, y: 50, z: 1000 })
    .graphData(miniGraphData)
    .backgroundColor('#222222')
    .nodeRelSize(20)
    .nodeVal(node => node.relVal)
    .linkWidth(link => link.relVal)
    .linkDirectionalArrowLength(10)
    .nodeColor(node => d3.rgb(node.color.r, node.color.g, node.color.b).toString())
    .nodeThreeObject(node => nodeMiniGeom(node));

  setTimeout(() => miniGraph.zoomToFit(250, 10, node => true), 1000);
}


function processData(datas) {
  // const v2lccFile = datas[0];
  const bucketFile = datas[0];
  const buckIntersectionIdx2lccFile = datas[1];
  const buckIntersectionEdgeFile = datas[2];
  const buckIntersectionSpanningEdgeFile = datas[3];
  // const vertexLabelFile = datas[5];

  // const v2lccSetDict = readV2lccFile(v2lccFile);

  const [lcc2buckLccDict, buckNodes, buckLcc2buckNodeDict, idx2buckNodeDict, buckLcc2lccSetDict] = readBucketFile(bucketFile);
  const [buckLinks, stBuckLcc2buckLinkDict] = readIntersectionFile(buckIntersectionIdx2lccFile, buckIntersectionEdgeFile, buckIntersectionSpanningEdgeFile, buckLcc2buckNodeDict, ',');

  // const v2labelDict = readVertexLabelFile(vertexLabelFile, v2lccSetDict, lcc2buckLccDict, buckLcc2buckNodeDict, stBuckLcc2buckLinkDict);

  for (const node of buckNodes) {
    node.aveDeg = aveDeg(node);
    node.density = density(node);
  };
  for (const link of buckLinks) {
    link.density = link.vertices / (idx2buckNodeDict[link.source].vertices * idx2buckNodeDict[link.target].vertices);
  };

  const layerSet = new Set(buckNodes.map(node => node.layer));
  const layerList = [...layerSet].sort((a, b) => (parseInt(a) - parseInt(b)));
  const bucketSet = new Set(buckNodes.map(node => node.bucket));
  const bucketList = [...bucketSet].sort((a, b) => (parseInt(a) - parseInt(b))).map(x => x + 1);

  const sumLcc = d3.max(buckNodes, node => node.count)

  const [sumLayer, brokenLayer, revBrokenLayer] = breakX(layerList);
  const [sumBucket, brokenBucket, revBrokenBucket] = breakX(bucketList);

  const width = Math.max(window.innerWidth, brokenLayer[layerList[layerList.length - 1]] * 100);
  const height = Math.max(window.innerHeight, brokenBucket[bucketList[bucketList.length - 1]] * 50);
  const layerScale = d3.scaleLinear()
    .domain([0, sumLayer])
    .range([-width / 2, width / 2]);
  const bucketScale = d3.scaleLinear()
    .domain([0, sumBucket])
    .range([-height / 2, height / 2]);
  const lccScale = d3.scaleLinear()
    .domain([0, sumLcc])
    .range([0, -sumLcc * 50]);

  dataSet.buckNodes = buckNodes;
  dataSet.buckLinks = buckLinks;
  dataSet.idx2buckNodeDict = idx2buckNodeDict;
  dataSet.layerScale = layerScale;
  dataSet.brokenLayer = brokenLayer;
  dataSet.revBrokenLayer = revBrokenLayer;
  dataSet.bucketScale = bucketScale;
  dataSet.brokenBucket = brokenBucket;
  dataSet.revBrokenBucket = revBrokenBucket;
  dataSet.lccScale = lccScale;
  
  dataSet.highNaturalWeightLabels = {}

  dataSet.buckLcc2lccSetDict = buckLcc2lccSetDict;
  // dataSet.v2labelDict = v2labelDict;

  dataSet.buckLcc2buckNodeDict = buckLcc2buckNodeDict;
  dataSet.stBuckLcc2buckLinkDict = stBuckLcc2buckLinkDict;
  dataSet.lcc2buckLccDict = lcc2buckLccDict;

  dataSet.maxBuckEdge = d3.max(buckNodes.map(d => d.edges));
};

function drawMap() {
  let spiralHighLight;
  let spiralDot;
  let spiralCircle;
  let arcHighLight;
  let arcDot;
  let arcCircle;
  let spanningLine;

  document.getElementById('mapBoard').innerHTML = ''

  console.log(dataSet);
  const board = d3.select("#mapBoard");


  // console.log(JSON.stringify(dataSet.nodes.map(d => [d.vertices, d.edges])))

  // // set the dimensions and margins of the graph
  const padMargin = { top: 0, right: 0, bottom: 0, left: 0 };
  const margin = { top: 10, right: 30, bottom: 60, left: 90 },
    width = board.node().clientWidth - margin.left - margin.right,
    height = board.node().clientHeight - margin.top - margin.bottom;

  // console.log(board.node().clientWidth)

  // // append the svg object to the body of the page 
  const boardSvg = board.append("svg")
    .attr("class", "drawingBoard")
    .attr("width", width + margin.left + margin.right + padMargin.left + padMargin.right)
    .attr("height", height + margin.top + margin.bottom + padMargin.top + padMargin.bottom)
    .style("background-color", "#222222");

  // console.log(height + margin.top + margin.bottom + padMargin.top + padMargin.bottom)

  const group = boardSvg.append("g"); // // used for scrolling

  const svg = group.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`); // // real drawing place

  const layers = Object.keys(dataSet.brokenLayer).map(d => parseInt(d));
  const buckets = Object.keys(dataSet.brokenBucket).map(d => parseInt(d) - 1);
  console.log(layers, buckets);


  // // x, y labels
  svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", `translate(${width / 2}, ${height + margin.top + 30})`)
    .style("text-anchor", "middle")
    .style("font-size", "0.8em")
    .text("Fixpoint Value");

  svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", `rotate(-90)`)
    .attr("x", -height / 2)
    .attr("y", -30)
    .style("text-anchor", "middle")
    .style("font-size", "0.8em")
    .text("Bucket Size Indicator");


  // Add X axis
  // Add Y axis
  const x = d3.scaleLinear()
    .domain([0, dataSet.brokenLayer[d3.max(layers)] + 1])
    .range([0, width]);
  const y = d3.scaleLinear()
    .domain([dataSet.brokenBucket[d3.min(buckets) + 1], dataSet.brokenBucket[d3.max(buckets) + 1] + 1])
    .range([height, 0]);


  // // x, y grids
  svg.append("g")
    .attr("class", "grid")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x).tickValues(layers.map(d => dataSet.brokenLayer[d])).tickSize(-height).tickFormat(""));

  svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).tickValues(buckets.map(d => dataSet.brokenBucket[d + 1])).tickSize(-width).tickFormat(""));

  // // x, y axis
  svg.append("g")
    .attr("class", 'axis')
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x).tickValues(layers.map(d => dataSet.brokenLayer[d])).tickFormat(d => `p${dataSet.revBrokenLayer[d]}`))
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-45)");

  svg.append("g")
    .attr("class", 'axis')
    .call(d3.axisLeft(y).tickValues(buckets.map(d => dataSet.brokenBucket[d + 1])).tickFormat(d => `B${dataSet.revBrokenBucket[d] - 1}`));

  const multipleList = [];
  const singleList = [];
  const spanLinkList = [];

  for (const buckCCInfo of dataSet.buckNodes) {
    if (buckCCInfo.count === 1) {
      singleList.push(buckCCInfo);
    } else {
      multipleList.push(buckCCInfo);
    }
  }

  for (const [stKey, tempLink] of Object.entries(dataSet.stBuckLcc2buckLinkDict)) {
    if (!tempLink.isSpan) {
      continue;
    }
    const [srcKey, tgtKey] = stKey.split(':')
    const [srcBucket, srcLayer] = srcKey.split(',')
    const [tgtBucket, tgtLayer] = tgtKey.split(',')
    spanLinkList.push({ src: { bucket: parseInt(srcBucket), layer: parseInt(srcLayer) }, tgt: { bucket: parseInt(tgtBucket), layer: parseInt(tgtLayer) } })
  }

  getSpiral(multipleList);
  getArc(singleList);
  console.log(multipleList)
  console.log(singleList)

  spanningLine = svg.selectAll('.spanningLine')
    .data(spanLinkList)

  spanningLine.remove();

  console.log(spanLinkList)
  const spanningLineEnter = spanningLine.enter().append('g');
  spanningLineEnter.append("line")
    .attr("class", "spanningLine")
    .attr("stroke", "#FFFFFF")
    .attr("stroke-width", 2)
    .attr("x1", d => x(dataSet.brokenLayer[d.src.layer]))
    .attr("y1", d => y(dataSet.brokenBucket[d.src.bucket + 1]))
    .attr("x2", d => x(dataSet.brokenLayer[d.tgt.layer]))
    .attr("y2", d => y(dataSet.brokenBucket[d.tgt.bucket + 1]))
    .attr("visibility", UIInfo.layout.leftVis.dagGraph ? "hidden" : "visible")

  const colorFactor = dataSet.buckNodes.map(d => d['density']).reduce((prev, current) => prev + current) / dataSet.buckNodes.length;

  const maxSpiralSize = Math.max(...multipleList.map(d => d['radius']));
  const maxarcSize = Math.max(...singleList.map(d => d['radius']));

  const cellSize = Math.min(x(1) - x(0), y(0) - y(1));
  const spiralSizeFactor = cellSize / maxSpiralSize;
  const arcSizeFactor = cellSize / maxarcSize;

  const spiralDotSize = 0.5 * spiralSizeFactor;
  spiralHighLight = svg.selectAll(".spiralHighLight")
    .data(multipleList);
  spiralDot = svg.selectAll(".spiralDot")
    .data(multipleList);
  spiralCircle = svg.selectAll(".spiralCircle")
    .data(multipleList);

  spiralHighLight.remove();
  spiralDot.remove();
  spiralCircle.remove();

  // // multiple spirals
  const spiralHighLightEnter = spiralHighLight.enter().append('g');
  spiralHighLightEnter.append("circle")
    .attr("class", "spiralHighLight")
    .attr("cx", d => x(dataSet.brokenLayer[d['layer']]))
    .attr("cy", d => y(dataSet.brokenBucket[d['bucket'] + 1]))
    .attr("r", d => 1.5 * spiralDotSize * d['radius'] + 2)
    .attr("fill", "#CC99A2")
    .attr("fill-opacity", 1)
    .attr("stroke-width", 0)
    .attr("id", d => `mapHighLight_${d['layer']}_${d['bucket']}`)
    .attr("visibility", "hidden");

  const spiralEnter = spiralDot.enter().append('g');
  spiralEnter.append("path")
    .attr("class", "spiralDot")
    .attr("fill", "none")
    .attr("stroke-width", Math.min(2, x(1) / 8))
    .attr("stroke", d => d3.rgb(...interpolateLinearly(curve(d.density, colorFactor), grey2red).map(x => x * 255)))
    .attr("opacity", 1)
    .attr("d", d => spiralLine(d['pos'], x(dataSet.brokenLayer[d['layer']]), y(dataSet.brokenBucket[d['bucket'] + 1]), spiralDotSize));

  const spiralCircleEnter = spiralCircle.enter().append('g');
  spiralCircleEnter.append("circle")
    .attr("class", "spiralCircle")
    .attr("cx", d => x(dataSet.brokenLayer[d['layer']]))
    .attr("cy", d => y(dataSet.brokenBucket[d['bucket'] + 1]))
    .attr("r", d => spiralDotSize * d['radius'])
    .attr("fill", "#000000")
    .attr("fill-opacity", 0)
    .attr("stroke-width", 0)
    .on('click', (elem, d) => {
      // console.log(elem, d)
      if (dagGraph) {
        const node = dataSet.buckLcc2buckNodeDict[`${d.bucket},${d.layer}`];
        openBuckNode(node);
      }
    });

  const arcDotSize = 0.5 * arcSizeFactor;
  arcHighLight = svg.selectAll(".arcHighLight")
    .data(singleList);
  // arcDot = svg.selectAll(".arcDot")
  //   .data(singleArcList);
  arcCircle = svg.selectAll(".arcCircle")
    .data(singleList);

  arcHighLight.remove();
  // arcDot.remove();
  arcCircle.remove();

  // // single arcs
  const arcHighLightEnter = arcHighLight.enter().append('g');
  arcHighLightEnter.append("circle")
    .attr("class", "arcHighLight")
    .attr("cx", d => x(dataSet.brokenLayer[d['layer']]))
    .attr("cy", d => y(dataSet.brokenBucket[d['bucket'] + 1]))
    .attr("r", d => 1.5 * arcDotSize * d['radius'] + 2)
    .attr("fill", "#CC99A2")
    .attr("fill-opacity", 1)
    .attr("stroke-width", 0)
    .attr("id", d => `mapHighLight_${d['layer']}_${d['bucket']}`)
    .attr("visibility", "hidden");

  const arcCircleEnter = arcCircle.enter().append('g');
  arcCircleEnter.append("circle")
    .attr("class", "arcCircle")
    .attr("cx", d => x(dataSet.brokenLayer[d['layer']]))
    .attr("cy", d => y(dataSet.brokenBucket[d['bucket'] + 1]))
    .attr("r", d => arcDotSize * d['radius'])
    .attr("fill", d => d3.rgb(...interpolateLinearly(curve(d.density, colorFactor), grey2red).map(x => x * 255)))
    .attr("fill-opacity", 1)
    .attr("stroke-width", 0)
    .on('click', (elem, d) => {
      // console.log(elem, d)
      if (dagGraph) {
        const node = dataSet.buckLcc2buckNodeDict[`${d.bucket},${d.layer}`];
        openBuckNode(node);
      }
    });
}

function processDataLabel(datas) {
  const v2lccFile = datas[0];
  const vertexLabelFile = datas[1];

  const v2lccSetDict = readV2lccFile(v2lccFile);

  const v2labelDict = readVertexLabelFile(vertexLabelFile, v2lccSetDict, dataSet.lcc2buckLccDict, dataSet.buckLcc2buckNodeDict, dataSet.stBuckLcc2buckLinkDict);
  dataSet.v2labelDict = v2labelDict;
}

function nodeGeom(node) {
  // console.log(node)
  let rad = Math.cbrt(node.relVal * (dagControl.dagScale.V / dagControl.dagMaxSize.V)) * dagControl.nodeRelSize;

  let retval;
  let center;

  if (node.isFiltered && dagControl.cubeFilter) {
    center = new THREE.Mesh(new THREE.BoxGeometry(rad * 2, rad * 2, rad * 2), new THREE.MeshLambertMaterial({
      color: node.color.formatHex(),
      transparent: true,
      opacity: 0.75
    }));
  } else {
    center = new THREE.Mesh(new THREE.SphereGeometry(rad), new THREE.MeshLambertMaterial({
      color: node.color.formatHex(),
      transparent: true,
      opacity: 0.75
    }));
  }
  // return false

  if (dagControl.clicked !== node) {
    return center;
  } else {
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(rad + 20, 10, 4, 16), new THREE.MeshLambertMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.75
    }));
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(rad + 20, 10, 4, 16).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.75
    }));
    const ring3 = new THREE.Mesh(new THREE.TorusGeometry(rad + 20, 10, 4, 16).rotateY(Math.PI / 2), new THREE.MeshLambertMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.75
    }));

    const retval = new THREE.Group();
    retval.add(center)
    retval.add(ring1)
    retval.add(ring2)
    retval.add(ring3)
    return retval;
  }
};

function dagNodeFilter(nodes) {
  for (const node of nodes) {
    if (node.edges > dagNODE_THRESH.edges.top || node.edges < dagNODE_THRESH.edges.bottom) {
      node.isFiltered = false;
      continue;
    }
    if (node.vertices > dagNODE_THRESH.vertices.top || node.vertices < dagNODE_THRESH.vertices.bottom) {
      node.isFiltered = false;
      continue;
    }
    if (node.layer > dagNODE_THRESH.layer.top || node.layer < dagNODE_THRESH.layer.bottom) {
      node.isFiltered = false;
      continue;
    }
    if (node.bucket > dagNODE_THRESH.bucket.top || node.bucket < dagNODE_THRESH.bucket.bottom) {
      node.isFiltered = false;
      continue;
    }
    if (dagNODE_THRESH.tag.name.length !== 0 && !node.vLabelSet.has(dagNODE_THRESH.tag.name)) {
      node.isFiltered = false;
      continue;
    }
    // if (dagNODE_THRESH.tag.date.length !== 0 && !node.eDateSet.hasOwnProperty(dagNODE_THRESH.tag.date)) {
    //   node.isFiltered = false;
    //   continue;
    // }
    // if (dagNODE_THRESH.tag.aucHouse.length !== 0 && !node.eAucHouseSet.hasOwnProperty(dagNODE_THRESH.tag.aucHouse)) {
    //   node.isFiltered = false;
    //   continue;
    // }
    // if (dagNODE_THRESH.tag.objType.length !== 0 && !node.eObjTypeSet.hasOwnProperty(dagNODE_THRESH.tag.objType)) {
    //   node.isFiltered = false;
    //   continue;
    // }
    // if (dagNODE_THRESH.tag.genre.length !== 0 && !node.eGenreSet.hasOwnProperty(dagNODE_THRESH.tag.genre)) {
    //   node.isFiltered = false;
    //   continue;
    // }
    node.isFiltered = true;
    continue;
  }
}

function dagNodeSize(node) {
  if (dagControl.cubeFilter) {
    return node.relVal * (dagControl.dagScale.V / dagControl.dagMaxSize.V)
  } else {
    return node.isFiltered ? node.relVal * (dagControl.dagScale.V / dagControl.dagMaxSize.V) : 0.0001;
  }
}

function dagLinkSize(link) {
  const linkSize = link.relVal * (dagControl.dagScale.E / dagControl.dagMaxSize.E)
  if (!dagControl.induceGraph) {
    return link.isSpan ? linkSize : dagControl.spanRatio / 100 * linkSize;
  }
  if (link.source.isFiltered && link.target.isFiltered) {
    return link.isSpan ? linkSize : dagControl.spanRatio / 100 * linkSize;
  } else {
    return 0.001;
  }
}

function initGUI() {
  dagGUI = new dat.GUI({
    autoPlace: true,
    width: 250
  });
  dagGUI.close();
  // gui2.domElement.style = "position: absolute; top: " + cityContainer.offsetHeight + "px; left: 10px;";
  const dagGUIcontainer = document.getElementById('menu-container');
  dagGUIcontainer.appendChild(dagGUI.domElement);
  // console.log(cityContainer.offsetHeight);
  // dagGUIcontainer.style = "position: absolute; top: " + 0 + "px; right: 10px; z-index: 5";

  const dagGUIfInfo = dagGUI.addFolder('Graph Info');
  dagGUIfInfo.open();

  // dagGUIfInfo.add(dagInfo, 'vertices').listen();
  // dagGUIfInfo.add(dagInfo, 'edges').listen();
  dagGUIfInfo.add(dagInfo, 'drawn_vertices').listen();
  dagGUIfInfo.add(dagInfo, 'drawn_edges').listen();

  const dagGUIfRepr = dagGUI.addFolder('Graph Representation');
  dagGUIfRepr.open();

  dagGUIfRepr.add(dagControl.dagScale, 'V', 1, 1000)
    .name('node scale')
    .onChange(size => {
      if (level === 0) {
        dagNodeFilter(dagGraph.graphData().nodes)
        dagGraph && dagGraph.nodeVal(node => dagNodeSize(node));
        dagGraph && dagGraph.nodeThreeObject(node => nodeGeom(node));
      } else {
        subGraph && subGraph.nodeVal(node => dagNodeSize(node));
      }
    });

  dagGUIfRepr.add(dagControl.dagScale, 'E', 1, 1000)
    .name('link scale')
    .onChange(size => {
      if (level === 0) {
        dagGraph && dagGraph.linkWidth(link => dagLinkSize(link))
      } else {
        subGraph && subGraph.linkWidth(link => dagLinkSize(link))
      }
    });

  dagGUIfRepr.add(dagControl, 'spanRatio', 1, 100)
    .name('non-spanning ratio')
    .listen()
    .onChange(ratio => dagGraph && dagGraph.linkWidth(link => dagLinkSize(link)));

  // dagGUIfRepr.add(dagControl, 'bucket')
  //   .name('bucket')
  //   .listen()
  //   .onChange(function (value) { preDraw() });

  dagGUIfRepr.add(dagControl, 'grid')
    .name('layer')
    .listen()
    .onChange(function (value) {
      if (dagControl.grid) {
        dagControl.circle = false;
        dagControl.spiral = false;
      };
      switchDagLayout();
      updateDagForce();
      dagGraph && dagGraph.d3ReheatSimulation();
    });

  dagGUIfRepr.add(dagControl, 'spiral')
    .name('spiral')
    .listen()
    .onChange(function (value) {
      if (dagControl.grid) {
        dagControl.grid = false;
      };
      switchDagLayout();
      updateDagForce();
      dagGraph && dagGraph.d3ReheatSimulation();
    });

  // dagGUIfRepr.add(dagControl, 'circle')
  //   .name('concentric')
  //   .listen()
  //   .onChange(function (value) {
  //     if (dagControl.circle) {
  //       dagControl.grid = false;
  //     };
  //     preDraw();
  //   });

  dagGUIfRepr.add(dagControl, 'dagLevelDistance', 1, 500)
    .name('DAG level distance')
    .onChange(distance => dagGraph && dagGraph.dagLevelDistance(dagControl.dagLevelDistance));

  // dagGUIfRepr.add(dagControl, 'aucIntersectionFunc')
  //   .name('Auction Intersection Graph')

  const dagGUIfNodeInfo = dagGUI.addFolder('Node Info');
  dagGUIfNodeInfo.open();

  dagGUIfNodeInfo.add(dagInfo.clicked.node, 'names').listen();
  // dagGUIfNodeInfo.add(dagInfo.clicked.node, 'dates').listen();
  // dagGUIfNodeInfo.add(dagInfo.clicked.node, 'aucHouses').listen();
  // dagGUIfNodeInfo.add(dagInfo.clicked.node, 'objTypes').listen();
  // dagGUIfNodeInfo.add(dagInfo.clicked.node, 'genres').listen();
  // dagGUIfNodeInfo.add(dagControl, 'openSubGraphFunc')
  //   .name('Open subGraph')
  // dagGUIfNodeInfo.add(dagControl, 'goBackFunc')
  //   .name('Go Back')

  const dagGUIfNodeFilter = dagGUI.addFolder('Node Filter');
  dagGUIfNodeFilter.add(dagControl, 'cubeFilter')
    .name('result as cubes')
    .onChange(value => {
      // console.log(dagControl.cubeFilter)
      dagGraph && dagGraph.nodeVal(node => dagNodeSize(node));
      dagGraph && dagGraph.nodeThreeObject(node => nodeGeom(node));
    });

  dagGUIfNodeFilter.add(dagControl, 'induceGraph')
    .name('show induce')
    .onChange(value => {
      dagGraph && dagGraph.linkWidth(link => dagLinkSize(link))
    });

  const dagGUIfNodeFilterEdges = dagGUIfNodeFilter.addFolder('Node Edge Threshold');
  dagNODE_THRESH_GUI.edges.top = dagGUIfNodeFilterEdges.add(dagNODE_THRESH.edges, 'top', 0, 1000)
    .onChange(size => {
      dagNodeFilter(dagGraph.graphData().nodes)
      dagGraph && dagGraph.nodeVal(node => dagNodeSize(node));
      dagGraph && dagGraph.nodeThreeObject(node => nodeGeom(node));
      if (dagControl.induceGraph) {
        dagGraph && dagGraph.linkWidth(link => dagLinkSize(link));
      };
      dagGraph && dagGraph.linkDirectionalArrowLength(link => link.isSpan ? (!dagControl.induceGraph || (link.source.isFiltered && link.target.isFiltered) ? 15 : 0) : 0)
    });
  dagNODE_THRESH_GUI.edges.bottom = dagGUIfNodeFilterEdges.add(dagNODE_THRESH.edges, 'bottom', 0, 1000)
    .onChange(size => {
      dagNodeFilter(dagGraph.graphData().nodes)
      dagNodeFilter(dagGraph.graphData().nodes)
      dagGraph && dagGraph.nodeVal(node => dagNodeSize(node));
      dagGraph && dagGraph.nodeThreeObject(node => nodeGeom(node));
      if (dagControl.induceGraph) {
        dagGraph && dagGraph.linkWidth(link => dagLinkSize(link));
      };
      dagGraph && dagGraph.linkDirectionalArrowLength(link => link.isSpan ? (!dagControl.induceGraph || (link.source.isFiltered && link.target.isFiltered) ? 15 : 0) : 0)
    });

  const dagGUIfNodeFilterVertice = dagGUIfNodeFilter.addFolder('Node Vertex Threshold');
  dagNODE_THRESH_GUI.vertices.top = dagGUIfNodeFilterVertice.add(dagNODE_THRESH.vertices, 'top', 0, 1000)
    .onChange(size => {
      dagNodeFilter(dagGraph.graphData().nodes)
      dagGraph && dagGraph.nodeVal(node => dagNodeSize(node));
      dagGraph && dagGraph.nodeThreeObject(node => nodeGeom(node));
      if (dagControl.induceGraph) {
        dagGraph && dagGraph.linkWidth(link => dagLinkSize(link));
      };
      dagGraph && dagGraph.linkDirectionalArrowLength(link => link.isSpan ? (!dagControl.induceGraph || (link.source.isFiltered && link.target.isFiltered) ? 15 : 0) : 0)
    });
  dagNODE_THRESH_GUI.vertices.bottom = dagGUIfNodeFilterVertice.add(dagNODE_THRESH.vertices, 'bottom', 0, 1000)
    .onChange(size => {
      dagNodeFilter(dagGraph.graphData().nodes)
      dagGraph && dagGraph.nodeVal(node => dagNodeSize(node));
      dagGraph && dagGraph.nodeThreeObject(node => nodeGeom(node));
      if (dagControl.induceGraph) {
        dagGraph && dagGraph.linkWidth(link => dagLinkSize(link));
      };
      dagGraph && dagGraph.linkDirectionalArrowLength(link => link.isSpan ? (!dagControl.induceGraph || (link.source.isFiltered && link.target.isFiltered) ? 15 : 0) : 0)
    });

  const dagGUIfNodeFilterLayer = dagGUIfNodeFilter.addFolder('Node Layer Threshold');
  dagNODE_THRESH_GUI.layer.top = dagGUIfNodeFilterLayer.add(dagNODE_THRESH.layer, 'top', 0, 1000)
    .onChange(size => {
      dagNodeFilter(dagGraph.graphData().nodes)
      dagGraph && dagGraph.nodeVal(node => dagNodeSize(node));
      dagGraph && dagGraph.nodeThreeObject(node => nodeGeom(node));
      if (dagControl.induceGraph) {
        dagGraph && dagGraph.linkWidth(link => dagLinkSize(link));
      };
      dagGraph && dagGraph.linkDirectionalArrowLength(link => link.isSpan ? (!dagControl.induceGraph || (link.source.isFiltered && link.target.isFiltered) ? 15 : 0) : 0)
    });
  dagNODE_THRESH_GUI.layer.bottom = dagGUIfNodeFilterLayer.add(dagNODE_THRESH.layer, 'bottom', 0, 1000)
    .onChange(size => {
      dagNodeFilter(dagGraph.graphData().nodes)
      dagGraph && dagGraph.nodeVal(node => dagNodeSize(node));
      dagGraph && dagGraph.nodeThreeObject(node => nodeGeom(node));
      if (dagControl.induceGraph) {
        dagGraph && dagGraph.linkWidth(link => dagLinkSize(link));
      };
      dagGraph && dagGraph.linkDirectionalArrowLength(link => link.isSpan ? (!dagControl.induceGraph || (link.source.isFiltered && link.target.isFiltered) ? 15 : 0) : 0)
    });

  const dagGUIfNodeFilterBucket = dagGUIfNodeFilter.addFolder('Node Bucket Threshold');
  dagNODE_THRESH_GUI.bucket.top = dagGUIfNodeFilterBucket.add(dagNODE_THRESH.bucket, 'top', 0, 1000)
    .onChange(size => {
      dagNodeFilter(dagGraph.graphData().nodes)
      dagGraph && dagGraph.nodeVal(node => dagNodeSize(node));
      dagGraph && dagGraph.nodeThreeObject(node => nodeGeom(node));
      if (dagControl.induceGraph) {
        dagGraph && dagGraph.linkWidth(link => dagLinkSize(link));
      };
      dagGraph && dagGraph.linkDirectionalArrowLength(link => link.isSpan ? (!dagControl.induceGraph || (link.source.isFiltered && link.target.isFiltered) ? 15 : 0) : 0)
    });
  dagNODE_THRESH_GUI.bucket.bottom = dagGUIfNodeFilterBucket.add(dagNODE_THRESH.bucket, 'bottom', 0, 1000)
    .onChange(size => {
      dagNodeFilter(dagGraph.graphData().nodes)
      dagGraph && dagGraph.nodeVal(node => dagNodeSize(node));
      dagGraph && dagGraph.nodeThreeObject(node => nodeGeom(node));
      if (dagControl.induceGraph) {
        dagGraph && dagGraph.linkWidth(link => dagLinkSize(link));
      };
      dagGraph && dagGraph.linkDirectionalArrowLength(link => link.isSpan ? (!dagControl.induceGraph || (link.source.isFiltered && link.target.isFiltered) ? 15 : 0) : 0)
    });

  const dagGUIfNodeFilterTag = dagGUIfNodeFilter.addFolder('Node Tag');
  dagGUIfNodeFilterTag.add(dagNODE_THRESH.tag, 'name')
    .name('name')
    .onChange(size => {
      dagNodeFilter(dagGraph.graphData().nodes)
      dagGraph && dagGraph.nodeVal(node => dagNodeSize(node));
      dagGraph && dagGraph.nodeThreeObject(node => nodeGeom(node));
      if (dagControl.induceGraph) {
        dagGraph && dagGraph.linkWidth(link => dagLinkSize(link));
      };
      dagGraph && dagGraph.linkDirectionalArrowLength(link => link.isSpan ? (!dagControl.induceGraph || (link.source.isFiltered && link.target.isFiltered) ? 15 : 0) : 0)
    });
  // dagGUIfNodeFilterTag.add(dagNODE_THRESH.tag, 'date')
  //   .name('date')
  //   .onChange(size => {
  //     dagNodeFilter(dagGraph.graphData().nodes)
  //     dagGraph && dagGraph.nodeVal(node => dagNodeSize(node));
  //     dagGraph && dagGraph.nodeThreeObject(node => nodeGeom(node));
  //     if (dagControl.induceGraph) {
  //       dagGraph && dagGraph.linkWidth(link => dagLinkSize(link));
  //     };
  //     dagGraph && dagGraph.linkDirectionalArrowLength(link => link.isSpan ? (!dagControl.induceGraph || (link.source.isFiltered && link.target.isFiltered) ? 15 : 0) : 0)
  //   });
  // dagGUIfNodeFilterTag.add(dagNODE_THRESH.tag, 'aucHouse')
  //   .name('auction house')
  //   .onChange(size => {
  //     dagNodeFilter(dagGraph.graphData().nodes)
  //     dagGraph && dagGraph.nodeVal(node => dagNodeSize(node));
  //     dagGraph && dagGraph.nodeThreeObject(node => nodeGeom(node));
  //     if (dagControl.induceGraph) {
  //       dagGraph && dagGraph.linkWidth(link => dagLinkSize(link));
  //     };
  //     dagGraph && dagGraph.linkDirectionalArrowLength(link => link.isSpan ? (!dagControl.induceGraph || (link.source.isFiltered && link.target.isFiltered) ? 15 : 0) : 0)
  //   });
  // dagGUIfNodeFilterTag.add(dagNODE_THRESH.tag, 'objType')
  //   .name('object type')
  //   .onChange(size => {
  //     dagNodeFilter(dagGraph.graphData().nodes)
  //     dagGraph && dagGraph.nodeVal(node => dagNodeSize(node));
  //     dagGraph && dagGraph.nodeThreeObject(node => nodeGeom(node));
  //     if (dagControl.induceGraph) {
  //       dagGraph && dagGraph.linkWidth(link => dagLinkSize(link));
  //     };
  //     dagGraph && dagGraph.linkDirectionalArrowLength(link => link.isSpan ? (!dagControl.induceGraph || (link.source.isFiltered && link.target.isFiltered) ? 15 : 0) : 0)
  //   });
  // dagGUIfNodeFilterTag.add(dagNODE_THRESH.tag, 'genre')
  //   .name('genre')
  //   .onChange(size => {
  //     dagNodeFilter(dagGraph.graphData().nodes)
  //     dagGraph && dagGraph.nodeVal(node => dagNodeSize(node));
  //     dagGraph && dagGraph.nodeThreeObject(node => nodeGeom(node));
  //     if (dagControl.induceGraph) {
  //       dagGraph && dagGraph.linkWidth(link => dagLinkSize(link));
  //     };
  //     dagGraph && dagGraph.linkDirectionalArrowLength(link => link.isSpan ? (!dagControl.induceGraph || (link.source.isFiltered && link.target.isFiltered) ? 15 : 0) : 0)
  //   });
}

function switchDagLayout() {
  const nodes = dataSet.buckNodes;

  if (dagControl.grid) {
    for (const node of nodes) {
      // console.log(node.bucket)
      // console.log(parameter.brokenBucket)
      node.fx = dataSet.layerScale(dataSet.brokenLayer[node.layer]) * dagControl.horizontal / dagControl.horizontalDefault;
      node.fy = dataSet.bucketScale(dataSet.brokenBucket[node.bucket + 1]) * dagControl.vertical / dagControl.verticalDefault;
      node.fz = dataSet.lccScale(node.lcc);
      // console.log(node.fx, node.fy, node.fz);
    };
    // } else if (dagControl.circle) {
    //   for (const node of nodes) {
    //     node.fx = undefined;
    //     node.fy = undefined;
    //     node.fz = 0;
    //   };
  } else if (dagControl.spiral) {
    nodes.sort((a, b) => (a.bucket === b.bucket ? b.layer - a.layer : b.bucket - a.bucket));
    console.log(nodes);
    const spiralR = 100;
    const spiralAngle = Math.PI * 3 / 2 / nodes.length;
    for (const step in nodes) {
      nodes[step].fx = spiralR * step * Math.cos(spiralAngle * step);
      nodes[step].fy = -spiralR * step * Math.sin(spiralAngle * step);
      nodes[step].fz = 0;
      // console.log(nodes[step], spiralR * step * Math.cos(spiralAngle * step))
    };
  } else {
    for (const node of nodes) {
      node.fx = undefined;
      node.fy = undefined;
      node.fz = undefined;
    };
  }
}

function updateDagForce() {
  if (dagControl.grid) {
    dagGraph.d3Force('charge').strength(0);
    dagGraph.d3Force('link').strength(0);
  } else if (dagControl.spiral) {
    dagGraph.d3Force('charge').strength(0);
    dagGraph.d3Force('link').strength(0);
    // } else if (dagControl.circle) {
    //   dagGraph.dagMode('radialin')
    //     .dagLevelDistance(dagControl.dagLevelDistance)
    //     .d3Force('collide', d3.forceCollide(dagGraph.nodeRelSize()));
    //   dagGraph.d3Force('charge').strength(0);
    //   dagGraph.d3Force('link').strength(0);
  } else {
    dagGraph.dagMode('bu')
      .dagLevelDistance(dagControl.dagLevelDistance);
    dagGraph.d3Force('charge').strength(-2000);
  }
}

function preDraw() {
  const nodes = dataSet.buckNodes;
  const links = dataSet.buckLinks;
  const idx2nodeDict = dataSet.idx2buckNodeDict;

  switchDagLayout();
  drawGraph(nodes, links, idx2nodeDict);
}

function drawGraph(nodes, links, idx2nodeDict) {
  dagInfo.drawn_vertices = nodes.length.toString();
  dagInfo.drawn_edges = links.length.toString();
  dagInfo.clicked.node.names = '';
  dagInfo.clicked.node.dates = '';
  dagInfo.clicked.node.aucHouses = '';
  dagInfo.clicked.node.objTypes = '';
  dagInfo.clicked.node.genres = '';
  dagControl.clicked = null;

  const [minEdges, maxEdges] = d3.extent(nodes, node => node.edges);
  dagInfo.threshold.edges.top = maxEdges;
  dagInfo.threshold.edges.bottom = minEdges;
  dagNODE_THRESH.edges.top = maxEdges;
  dagNODE_THRESH.edges.bottom = minEdges;
  dagNODE_THRESH_GUI.edges.top.max(maxEdges);
  dagNODE_THRESH_GUI.edges.top.min(minEdges);
  dagNODE_THRESH_GUI.edges.bottom.max(maxEdges);
  dagNODE_THRESH_GUI.edges.bottom.min(minEdges);
  const [minVertices, maxVertices] = d3.extent(nodes, node => node.vertices);
  dagInfo.threshold.vertices.top = maxVertices;
  dagInfo.threshold.vertices.bottom = minVertices;
  dagNODE_THRESH.vertices.top = maxVertices;
  dagNODE_THRESH.vertices.bottom = minVertices;
  dagNODE_THRESH_GUI.vertices.top.max(maxVertices);
  dagNODE_THRESH_GUI.vertices.top.min(minVertices);
  dagNODE_THRESH_GUI.vertices.bottom.max(maxVertices);
  dagNODE_THRESH_GUI.vertices.bottom.min(minVertices);
  const [minLayer, maxLayer] = d3.extent(nodes, node => node.layer);
  dagInfo.threshold.layer.top = maxLayer;
  dagInfo.threshold.layer.bottom = minLayer;
  dagNODE_THRESH.layer.top = maxLayer;
  dagNODE_THRESH.layer.bottom = minLayer;
  dagNODE_THRESH_GUI.layer.top.max(maxLayer);
  dagNODE_THRESH_GUI.layer.top.min(minLayer);
  dagNODE_THRESH_GUI.layer.bottom.max(maxLayer);
  dagNODE_THRESH_GUI.layer.bottom.min(minLayer);
  const [minBucket, maxBucket] = d3.extent(nodes, node => node.bucket);
  dagInfo.threshold.bucket.top = maxBucket;
  dagInfo.threshold.bucket.bottom = minBucket;
  dagNODE_THRESH.bucket.top = maxBucket;
  dagNODE_THRESH.bucket.bottom = minBucket;
  dagNODE_THRESH_GUI.bucket.top.max(maxBucket);
  dagNODE_THRESH_GUI.bucket.top.min(minBucket);
  dagNODE_THRESH_GUI.bucket.bottom.max(maxBucket);
  dagNODE_THRESH_GUI.bucket.bottom.min(minBucket);
  dagGUI.updateDisplay();

  const nodeSizeMax = d3.max(nodes, d => d['edges'])
  const linkSizeMax = d3.max(links.filter(d => d.isSpan), d => d['vertices'])
  // console.log(nodeSizeMax);
  // console.log(linkSizeMax);

  const nodeColorFactor = nodes.map(d => d['density']).reduce((prev, current) => prev + current) / nodes.length;
  const linkColorFactor = links.length === 0 ? 1 : links.filter(d => d.isSpan).map(d => d['density']).reduce((prev, current) => prev + current) / links.length;
  const nodeSizeFactor = nodes.map(d => d['edges'] / nodeSizeMax).reduce((prev, current) => prev + current) / nodes.length;
  const linkSizeFactor = links.length === 0 ? 1 : links.filter(d => d.isSpan).map(d => d['vertices'] / linkSizeMax).reduce((prev, current) => prev + current) / links.length;
  // console.log(nodeColorFactor, linkColorFactor)

  // const nodeCountSum = nodes.map(d => d['count']).reduce((prev, current) => prev + current);
  // console.log('count:', nodeCountSum.toLocaleString());

  for (const node of nodes) {
    node.relVal = Math.cbrt(curve(node['edges'] / nodeSizeMax, nodeSizeFactor) * nodeSizeMax);
    node.color = d3.rgb(...interpolateLinearly(curve(node.density, nodeColorFactor), grey2red).map(x => x * 255));
  };
  for (const link of links) {
    link.relVal = 0.5 * Math.log(curve(link.vertices / linkSizeMax, linkSizeFactor) * nodeSizeMax + 1);
    link.color = d3.rgb(...interpolateLinearly(curve(link.density, linkColorFactor), grey2red).map(x => x * 255));
  };

  const graph = { nodes: nodes, links: links };
  // console.log(JSON.stringify(graph))

  dagGraph = ForceGraph3D()
    (document.getElementById(`global-graph`))
    .graphData(graph)
    .width(document.getElementById('global-graph-container').offsetWidth)
    .height(document.getElementById('global-graph-container').offsetHeight)
    .backgroundColor('#222222')
    .showNavInfo(false)
    .linkOpacity(0.6)
    .linkDirectionalArrowLength(link => link.isSpan ? (!dagControl.induceGraph || (link.source.isFiltered && link.target.isFiltered) ? 15 : 0) : 0)
    .nodeRelSize(dagControl.nodeRelSize)
    .linkVisibility(true)
    .nodeVal(node => dagNodeSize(node))
    .linkWidth(link => dagLinkSize(link))
    .nodeColor(node => node.color)
    .linkColor(link => link.color)
    // .linkDirectionalArrowColor(link => d3.rgb(...interpolateLinearly(curve(link.density, linkColorFactor), grey2red).map(x => x * 255)))
    .nodeLabel(node => `peel${node.layer}, bucket${node.bucket}<br>V${node.vertices.toLocaleString()}, E${(node.edges).toLocaleString()}<br>aveDeg${node.aveDeg.toFixed(2)}, density:${node.density.toExponential(2)}<br>count:${node.count.toLocaleString()}<br>${getNodeLabel(node)}`)
    .linkLabel(link => `src${idx2nodeDict[link.source.id].layer}, ${idx2nodeDict[link.source.id].bucket}<br>tgt${idx2nodeDict[link.target.id].layer}, ${idx2nodeDict[link.target.id].bucket}<br>weight:${link.vertices.toLocaleString()}, density:${link.density.toExponential(2)}, span:${link.isSpan}<br>${getLinkLabel(link)}`)
    .nodeThreeObject(node => nodeGeom(node));

  updateDagForce();

  setTimeout(() => dagGraph.zoomToFit(250, 10, node => true), 1000);

  // $('#global-graph .scene-nav-info').text('Left-click: rotate, Mouse-wheel/middle-click: zoom, Right-click: pan, Left-click Nodes: open')

  dagGraph.onNodeClick(node => openBuckNode(node));
}


function openBuckNode(node) {
  // console.log(node);
  dagControl.clicked = node;
  // node.isOpened = true;
  // console.log('here')
  dagGraph.nodeThreeObject(node => nodeGeom(node));
  // console.log('here')

  d3.selectAll(".spiralHighLight").attr("visibility", "hidden");
  d3.selectAll(".arcHighLight").attr("visibility", "hidden");
  d3.select(`#mapHighLight_${node.layer}_${node.bucket}`).attr("visibility", "visible");
  // console.log(`#mapHighLight_${node.layer}_${node.bucket}`)

  dagInfo.clicked.node.names = [...node.vLabelSet].filter(d => d.length !== 0).sort().join(', ')
  // dagInfo.clicked.node.dates = Object.keys(node.eDateSet).filter(d => d.length !== 0).sort().join(', ')
  // dagInfo.clicked.node.aucHouses = Object.keys(node.eAucHouseSet).filter(d => d.length !== 0).sort().join(', ')
  // dagInfo.clicked.node.objTypes = Object.keys(node.eObjTypeSet).filter(d => d.length !== 0).sort().join(', ')
  // dagInfo.clicked.node.genres = Object.keys(node.eGenreSet).filter(d => d.length !== 0).sort().join(', ')
  dagInfo.clicked.node.layer = node.layer;
  dagInfo.clicked.node.bucket = node.bucket;

  // console.log(dataSet.buckLcc2lccSetDict[`${node.bucket},${node.layer}`]);
  const lccList = [...dataSet.buckLcc2lccSetDict[`${node.bucket},${node.layer}`]].map(d => parseInt(d.split('@')[0]));
  // console.log(lccList);
  const lccSet = new Set(lccList)

  preDrawFork(node.layer, lccSet, node.bucket, node.edges);
  console.log(dataSet);

  if (localGraph) {
    localGraph.graphData({ nodes: [], links: [] })
    document.getElementById('local-info-container').style.visibility = 'hidden';
    document.getElementById('local-graph-navigation-info-container').style.visibility = 'hidden';
    document.getElementById('local-info').style.visibility = 'hidden';
    document.getElementById('local-menu-container').style.visibility = 'hidden';
    document.getElementById('down-degree-list-cumulative').style.visibility = 'hidden';
    document.getElementById('down-degree-list-noncumulative').style.visibility = 'hidden';
    document.getElementById('local-label-container').style.visibility = 'hidden';

    UIInfo.layout.localInfo.container = 0;
    UIInfo.layout.localInfo.cumulativeInfluencer = 0;
    UIInfo.layout.localInfo.noncumulativeInfluencer = 0;
    UIInfo.layout.localInfo.labelExpansion = 0;
  }

  disableExpand()

  $('#right-labels').html('')
  $('#right-labels-title').html('')

  if (localSubGraph) {
    closeLocalSubGraph();
  }
}

function preDrawFork(layer, lccSet, bucket, edges) {
  console.log(layer)
  Promise.all([
    d3.json(datasetName + ccName + '_waves/' + `layer-${layer}-waves-info.json`)
  ]).then(function (datas) {
    drawFork(datas, layer, lccSet, bucket, edges);
  })
}

function initForkDrawing() {
  const board = d3.select("#fork-view-canvas");

  // console.log(JSON.stringify(dataSet.nodes.map(d => [d.vertices, d.edges])))

  // // set the dimensions and margins of the graph
  const padMargin = { top: 0, right: 0, bottom: 0, left: 0 };
  const margin = { top: 5, right: 5, bottom: 5, left: 5 },
    width = board.node().clientWidth - margin.left - margin.right,
    height = board.node().clientHeight - margin.top - margin.bottom;

  console.log(board.node().clientHeight)

  // // append the svg object to the body of the page 
  const boardSvg = board.append("svg")
    .attr("class", "drawingBoard")
    .attr("width", width + margin.left + margin.right + padMargin.left + padMargin.right)
    .attr("height", height + margin.top + margin.bottom + padMargin.top + padMargin.bottom)
    .style("background-color", "#222222");

  // console.log(height + margin.top + margin.bottom + padMargin.top + padMargin.bottom)

  const group = boardSvg.append("g"); // // used for scrolling

  const svg = group.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`); // // real drawing place

  forkSvg = svg;
  forkHeight = height;
  forkWidth = width;
}

function drawFork(datas, layer, lccSet, bucket, nodeEdges) {
  const waveInfoFile = datas[0];
  delete waveInfoFile[0];
  console.log(waveInfoFile)

  const wave2forkInfo = {}
  let forkWaveEdges = 0;

  for (const [wave, waveInfo] of Object.entries(waveInfoFile)) {
    delete waveInfo['edges']
    delete waveInfo['vertices']
    for (const [wcc, wccInfo] of Object.entries(waveInfo)) {
      const lcc = parseInt(wccInfo['layer-cc']);
      if (!lccSet.has(lcc)) {
        // console.log('skip');
        continue;
      }
      if (!wave2forkInfo.hasOwnProperty(wave)) {
        const forkWaveInfo = {
          wave: parseInt(wave),
          vertices: 0,
          edges: 0,
          frag: {},
          maxFragEdges: 0,
          wccSet: new Set()
        }
        wave2forkInfo[wave] = forkWaveInfo;
      }
      const forkWaveInfo = wave2forkInfo[wave];
      forkWaveInfo.vertices += wccInfo.vertices;
      forkWaveInfo.edges += wccInfo.edges;
      forkWaveEdges += wccInfo.edges;
      forkWaveInfo.wccSet.add(parseInt(wcc));

      for (const [frag, fragInfo] of Object.entries(wccInfo['fragments'])) {
        if (!forkWaveInfo['frag'].hasOwnProperty(frag)) {
          const forkFragInfo = {
            wave: parseInt(wave),
            frag: parseInt(frag),
            vertices: 0,
            edges: 0,
            sources: 0
          }
          forkWaveInfo['frag'][frag] = forkFragInfo;
        }
        const forkFragInfo = forkWaveInfo['frag'][frag];
        forkFragInfo.vertices += fragInfo.vertices;
        forkFragInfo.edges += fragInfo.edges;
        forkFragInfo.sources += fragInfo.sources;
        if (forkFragInfo.edges > forkWaveInfo.maxFragEdges) {
          forkWaveInfo.maxFragEdges = forkFragInfo.edges;
        }
      }
    }
  }

  console.log(forkWaveEdges)
  console.log(wave2forkInfo)

  if (forkSvg === null || forkSvg === undefined) {
    initForkDrawing();
    // console.log('here')
  }

  const svg = forkSvg;
  const height = forkHeight;
  const width = forkWidth;

  console.log(svg);

  let forkWaveHighLight;
  let forkWaveRect;
  let forkWaveText;
  let forkFragHighLight;
  let forkFragHighLightExtra;
  let forkFragArrowText;
  let forkFragRect;
  let forkFragText;
  let forkWave2FragLine;

  const colorFactor = dataSet.buckNodes.map(d => d['density']).reduce((prev, current) => prev + current) / dataSet.buckNodes.length;

  const forkWaveList = Object.values(wave2forkInfo);
  forkWaveList.sort((a, b) => b.wave - a.wave);

  let waveCumY = 0;
  const forkWaveWidth = width * 0.35 * Math.log1p(nodeEdges) / Math.log1p(dataSet.maxBuckEdge);

  let forkWaveEdgesLog = 0;
  for (const forkWaveInfo of forkWaveList) {
    forkWaveEdgesLog += Math.log1p(forkWaveInfo['edges']);
  }

  for (const forkWaveInfo of forkWaveList) {
    forkWaveInfo['x'] = 0;
    forkWaveInfo['y'] = waveCumY;
    forkWaveInfo['width'] = forkWaveWidth;
    const forkWaveHeight = Math.log1p(forkWaveInfo['edges']) / forkWaveEdgesLog * height;
    forkWaveInfo['height'] = forkWaveHeight;
    waveCumY += forkWaveHeight;
    forkWaveInfo['density'] = density(forkWaveInfo);
  }

  forkWaveHighLight = svg.selectAll(".forkWaveHighLight")
    .data([]);

  forkWaveHighLight.exit().remove();

  forkWave2FragLine = svg.selectAll(".forkWave2FragLine")
    .data([]);

  forkWave2FragLine.exit().remove();

  forkFragHighLight = svg.selectAll(".forkFragHighLight")
    .data([]);

  forkFragHighLight.exit().remove();

  forkFragHighLightExtra = svg.selectAll(".forkFragHighLightExtra")
    .data([]);

  forkFragHighLightExtra.exit().remove();

  forkFragArrowText = svg.selectAll(".forkFragArrowText")
    .data([]);

  forkFragArrowText.exit().remove();

  forkWaveRect = svg.selectAll(".forkWaveRect")
    .data([]);

  forkWaveRect.exit().remove();

  forkWaveText = svg.selectAll(".forkWaveText")
    .data([]);

  forkWaveText.exit().remove();

  forkFragRect = svg.selectAll(".forkFragRect")
    .data([]);

  forkFragRect.exit().remove();

  forkFragText = svg.selectAll(".forkFragText")
    .data([]);

  forkFragText.exit().remove();

  forkWaveRect = svg.selectAll(".forkWaveRect")
    .data(forkWaveList);

  forkWaveText = svg.selectAll(".forkWaveText")
    .data(forkWaveList);

  forkWaveHighLight = svg.selectAll(".forkWaveHighLight")
    .data(forkWaveList);

  // // wave forks
  const forkWaveHighLightEnter = forkWaveHighLight.enter().append('g');
  forkWaveHighLightEnter.append("rect")
    .attr("class", "forkWaveHighLight")
    // .attr("fill", "#FFFFFF")
    .attr("fill", '#CC99A2')
    // .attr("stroke-width", 2)
    // .attr("stroke", "#000000")
    .attr("x", d => d.x - 4)
    .attr("y", d => d.y - 4)
    .attr("width", d => d.width + 8)
    .attr("height", d => d.height + 8)
    .attr("id", d => `forkWaveHighLight_${d['wave']}`)
    .attr("visibility", "hidden");

  const forkWaveEnter = forkWaveRect.enter().append('g');
  forkWaveEnter.append("rect")
    .attr("class", "forkWaveRect")
    // .attr("fill", "#FFFFFF")
    .attr("fill", d => d3.rgb(...interpolateLinearly(curve(d.density, colorFactor), grey2red).map(x => x * 255)))
    .attr("stroke-width", 2)
    .attr("stroke", "#000000")
    .attr("x", d => d.x)
    .attr("y", d => d.y)
    .attr("width", d => d.width)
    .attr("height", d => d.height)
    .on('click', (elem, d) => {
      d3.selectAll(".forkWaveHighLight").attr("visibility", "hidden");
      d3.select(`#forkWaveHighLight_${d['wave']}`).attr("visibility", "visible");

      if (localSubGraph) {
        closeLocalSubGraph();
      }

      const w2wccDict = {};
      const w2fragInfo = {}
      let maxFragEdges = 0;

      w2wccDict[d['wave']] = d.wccSet;
      w2fragInfo[d['wave']] = d.frag;
      maxFragEdges = Math.max(maxFragEdges, d.maxFragEdges)


      if (d.edges >= forkTH) {
        drawForkFrag(w2fragInfo, maxFragEdges, layer, w2wccDict, d.y);
      } else {
        // drawForkFrag(d.frag, d.maxFragEdges, layer, d.wave, w2wccDict, d.y, d.height);
        let waveMax = d.wave + 1;
        let tempSize = d.edges;
        while (!UIInfo.fork.forkSelectedOnly && wave2forkInfo.hasOwnProperty(waveMax) && tempSize < forkTH) {
          tempSize += wave2forkInfo[waveMax].edges;
          if (tempSize >= forkTH) {
            break;
          }
          d3.select(`#forkWaveHighLight_${waveMax}`).attr("visibility", "visible");
          w2wccDict[waveMax] = wave2forkInfo[waveMax].wccSet;
          w2fragInfo[waveMax] = wave2forkInfo[waveMax].frag;
          maxFragEdges = Math.max(maxFragEdges, wave2forkInfo[waveMax].maxFragEdges)
          // const tempw2wccDict = {};
          // tempw2wccDict[waveMax] = wave2forkInfo[waveMax].wccSet;
          // drawForkFrag(wave2forkInfo[waveMax].frag, wave2forkInfo[waveMax].maxFragEdges, layer, wave2forkInfo[waveMax].wave, tempw2wccDict, wave2forkInfo[waveMax].y, wave2forkInfo[waveMax].height);
          waveMax++;
        }
        waveMax--;
        drawForkFrag(w2fragInfo, maxFragEdges, layer, w2wccDict, wave2forkInfo[waveMax].y);
        d3.selectAll(`.forkFragHighLight`).attr("visibility", "visible");
        d3.selectAll(`.forkFragHighLightExtra`).attr("visibility", "visible");
        preDrawLocalGraph(layer, d.wave, waveMax, -Infinity, Infinity, w2wccDict, bucket);
      }
    })

  const forkWaveTextEnter = forkWaveText.enter().append('g');
  forkWaveEnter.append("text")
    .attr("class", "forkWaveText")
    .attr("fill", "#FFFFFF")
    .attr("stroke-width", 4)
    .attr("stroke", "#000000")
    .attr("x", d => d.x + d.width - 2)
    .attr("y", d => d.y + d.height - 2)
    .attr("paint-order", "stroke")
    .attr("stroke-linecap", "butt")
    .attr("stroke-linejoin", "miter")
    .attr("text-anchor", "end")
    .attr("dominant-baseline", 'text-after-edge')
    .attr("font-size", "x-small")
    .text(d => `${Object.values(d.frag).length}`)

  forkWaveEnter.append("text")
    .attr("class", "forkWaveText")
    .attr("fill", "#FFFFFF")
    .attr("stroke-width", 4)
    .attr("stroke", "#000000")
    .attr("x", d => d.x + 2)
    .attr("y", d => d.y + 2)
    .attr("paint-order", "stroke")
    .attr("stroke-linecap", "butt")
    .attr("stroke-linejoin", "miter")
    .attr("text-anchor", "start")
    .attr("dominant-baseline", 'text-before-edge')
    .attr("font-size", "x-small")
    .text(d => `${d.wave}`)


  function drawForkFrag(fragInfo, maxFragEdges, layer, w2wccDict, waveY, clearFlag) {
    if (clearFlag == null || clearFlag == undefined) {
      clearFlag = true;
    }

    const forkFragList = [];
    const wave2fragForkInfo = {};
    for (const [wave, waveFragInfo] of Object.entries(fragInfo)) {
      wave2fragForkInfo[wave] = {};
      wave2fragForkInfo[wave].fragSize = Object.values(waveFragInfo).length;
      wave2fragForkInfo[wave].waveCenterY = wave2forkInfo[wave].y + wave2forkInfo[wave].height / 2;
      wave2fragForkInfo[wave].waveCenterX = wave2forkInfo[wave].x + wave2forkInfo[wave].width;
      forkFragList.push(...Object.values(waveFragInfo));
    }

    forkFragList.sort((a, b) => a.wave === b.wave ? b.frag - a.frag : b.wave - a.wave);
    console.log(forkFragList)

    let fragCumY = 0;
    const forkFragWidth = width - forkWaveWidth - 15;
    const forkFragX = forkWaveWidth + 15;
    let forkFragHeightUnit = 1;
    const forkFragHeightStep = (forkFragList.length * 10 + Object.keys(fragInfo).length * 10);
    const forkFragHeightSum = forkFragHeightStep * forkFragHeightUnit
    console.log(waveY)
    console.log(forkFragHeightSum)
    console.log(height)
    if (forkFragHeightSum + waveY > height) {
      if (forkFragHeightSum > height) {
        forkFragHeightUnit = height / forkFragHeightStep;
      } else {
        fragCumY = height - forkFragHeightSum;
      }
    } else {
      fragCumY = waveY;
    }

    console.log(fragCumY)

    fragCumY -= 10// compensite init += 10
    let tempWaveIdx = -1;

    for (const forkFragInfo of forkFragList) {
      let newWaveFlag = false;
      if (tempWaveIdx !== forkFragInfo.wave) {
        tempWaveIdx = forkFragInfo.wave;
        newWaveFlag = true;
        fragCumY += 10;
      }
      forkFragInfo['x'] = forkFragX;
      forkFragInfo['y'] = fragCumY;
      forkFragInfo['width'] = forkFragWidth / Math.log1p(maxFragEdges) * Math.log1p(forkFragInfo['edges']);
      // console.log(forkFragInfo['frag'], forkFragInfo['width'], 1 / maxFragEdges * forkFragInfo['edges'])
      forkFragInfo['height'] = 8 * forkFragHeightUnit;
      fragCumY += 10 * forkFragHeightUnit;
      forkFragInfo['density'] = density(forkFragInfo);
      if (newWaveFlag) {
        wave2fragForkInfo[tempWaveIdx].fragStart = forkFragInfo['y'];
      }
      wave2fragForkInfo[tempWaveIdx].fragEnd = forkFragInfo['y'] + forkFragInfo['height'];
    }

    const wave2fragList = Object.values(wave2fragForkInfo)

    // console.log(wave2fragList)

    if (clearFlag) {
      forkWave2FragLine = svg.selectAll(".forkWave2FragLine")
        .data([]);

      forkWave2FragLine.exit().remove();

      forkFragHighLight = svg.selectAll(".forkFragHighLight")
        .data([]);

      forkFragHighLight.exit().remove();

      forkFragHighLightExtra = svg.selectAll(".forkFragHighLightExtra")
        .data([]);

      forkFragHighLightExtra.exit().remove();

      forkFragArrowText = svg.selectAll(".forkFragArrowText")
      .data([]);
  
      forkFragArrowText.exit().remove();

      forkFragRect = svg.selectAll(".forkFragRect")
        .data([]);

      // forkFragRect.remove();
      forkFragRect.exit().remove();

      forkFragText = svg.selectAll(".forkFragText")
        .data([]);

      forkFragText.exit().remove();
    }

    forkWave2FragLine = svg.selectAll(".forkWave2FragLine")
      .data(wave2fragList);

    forkFragHighLight = svg.selectAll(".forkFragHighLight")
      .data(forkFragList);

    forkFragHighLightExtra = svg.selectAll(".forkFragHighLightExtra")
      .data(forkFragList);

    forkFragArrowText = svg.selectAll(".forkFragArrowText")
      .data(forkFragList);

    forkFragRect = svg.selectAll(".forkFragRect")
      .data(forkFragList);

    forkFragText = svg.selectAll(".forkFragText")
      .data(forkFragList);

    // console.log(forkFragList)

    const forkWave2FragLineEnter = forkWave2FragLine.enter().append('g');
    forkWave2FragLineEnter.append("line")
      .attr("class", "forkWave2FragLine")
      .attr("stroke", '#FFFFFF')
      .attr('stroke-width', 2)
      .attr("x1", d => d.waveCenterX)
      .attr("y1", d => d.waveCenterY)
      .attr("x2", d => forkFragX - 1)
      .attr("y2", d => (d.fragStart + d.fragEnd) / 2)

    forkWave2FragLineEnter.append("line")
      .attr("class", "forkWave2FragLine")
      .attr("stroke", '#FFFFFF')
      .attr('stroke-width', 2)
      .attr("x1", d => forkFragX - 1)
      .attr("y1", d => d.fragStart)
      .attr("x2", d => forkFragX - 1)
      .attr("y2", d => d.fragEnd)

    // // fork fragments
    const forkFragHighLightEnter = forkFragHighLight.enter().append('g');
    forkFragHighLightEnter.append("rect")
      .attr("class", "forkFragHighLight")
      // .attr("fill", "#FFFFFF")
      .attr("fill", '#CC99A2')
      // .attr("stroke-width", 1)
      // .attr("stroke", "#000000")
      .attr("x", d => d.x - 4)
      .attr("y", d => d.y - 4)
      .attr("width", d => d.width + 8)
      .attr("height", d => d.height + 8)
      .attr("id", d => `forkFragHighLight_${d['wave']}_${d['frag']}`)
      .attr("visibility", "hidden");

    const forkFragHighLightExtraEnter = forkFragHighLightExtra.enter().append('g');
    forkFragHighLightExtraEnter.append("rect")
      .attr("class", "forkFragHighLightExtra")
      // .attr("fill", "#FFFFFF")
      .attr("fill", '#FF00FF')
      // .attr("stroke-width", 1)
      // .attr("stroke", "#000000")
      .attr("x", d => d.x - 6)
      .attr("y", d => d.y - 6)
      .attr("width", d => d.width + 12)
      .attr("height", d => d.height + 12)
      .attr("id", d => `forkFragHighLightExtra_${d['wave']}_${d['frag']}`)
      .attr("visibility", "hidden");

    const forkFragEnter = forkFragRect.enter().append('g');
    forkFragEnter.append("rect")
      .attr("class", "forkFragRect")
      // .attr("fill", "#FFFFFF")
      .attr("fill", d => d3.rgb(...interpolateLinearly(curve(d.density, colorFactor), grey2red).map(x => x * 255)))
      .attr("stroke-width", 1)
      .attr("stroke", "#000000")
      .attr("x", d => d.x)
      .attr("y", d => d.y)
      .attr("width", d => d.width)
      .attr("height", d => d.height)
      .on('click', (elem, d) => {
        d3.selectAll(".forkFragHighLight").attr("visibility", "hidden");
        d3.select(`#forkFragHighLight_${d['wave']}_${d['frag']}`).attr("visibility", "visible");

        closeLocalSubGraph();

        if (d.edges >= forkTH) {
          console.log('W: need 2-level decomposition, frag edges > forkTH');
          preDrawLocalGraph(layer, d.wave, d.wave, d.frag, d.frag, w2wccDict, bucket)
        } else {
          let fragMax = d.frag + 1;
          let tempSize = d.edges;
          while (!UIInfo.fork.forkSelectedOnly && fragInfo[d.wave].hasOwnProperty(fragMax) && tempSize < forkTH) {
            tempSize += fragInfo[d.wave][fragMax].edges;
            if (tempSize >= forkTH) {
              break;
            }
            d3.select(`#forkFragHighLight_${d.wave}_${fragMax}`).attr("visibility", "visible");
            d3.select(`#forkFragHighLightExtra_${d.wave}_${fragMax}`).attr("visibility", "visible");
            fragMax++;
          }
          fragMax--;
          preDrawLocalGraph(layer, d.wave, d.wave, d.frag, fragMax, w2wccDict, bucket)
        }
      })

    const forkFragTextEnter = forkFragText.enter().append('g');
    forkFragTextEnter.append("text")
      .attr("class", "forkFragText")
      .attr("fill", "#FFFFFF")
      .attr("stroke-width", 4)
      .attr("stroke", "#000000")
      .attr("x", d => d.x + d.width + 4)
      .attr("y", d => d.y + d.height / 2)
      .attr("paint-order", "stroke")
      .attr("stroke-linecap", "butt")
      .attr("stroke-linejoin", "miter")
      .attr("text-anchor", "start")
      .attr("dominant-baseline", 'central')
      .attr("font-size", "xx-small")
      .text(d => d.frag % 5 === 0 && d.frag != 0 ? `${d.frag + 1}` : '')


    const forkFragArrowTextEnter = forkFragArrowText.enter().append('g');
    forkFragArrowTextEnter.append("text")
      .attr("class", "forkFragArrowText")
      .attr("id", d => `forkFragArrowText_${d['wave']}_${d['frag']}`)
      .attr("fill", "#FFFFFF")
      .attr("stroke-width", 4)
      .attr("stroke", "#000000")
      .attr("x", d => d.x + d.width + 4)
      .attr("y", d => d.y + d.height / 2)
      .attr("paint-order", "stroke")
      .attr("stroke-linecap", "butt")
      .attr("stroke-linejoin", "miter")
      .attr("text-anchor", "start")
      .attr("dominant-baseline", 'central')
      .attr("font-size", "small")
      .text(d => '<-')
      .attr("visibility", "hidden");

    localDataSet.forkFragInfo = fragInfo;
  }
}

function preDrawLocalGraph(layer, waveMin, waveMax, fragMin, fragMax, w2wccDict, bucket) {
  if (layer !== localDataSetCache.fp) {
    Promise.all([
      d3.text(datasetName + ccName + '_waves/' + `layer-${layer}-waves.csv`),
      d3.text(datasetName + ccName + '_waves/' + `layer-${layer}-wave-sources.csv`)
    ]).then(function (datas) {
      localDataSetCache.fp = layer;
      localDataSetCache.files.waves = datas[0];
      localDataSetCache.files.sources = datas[1];
      drawLocalGraph(datas, layer, waveMin, waveMax, fragMin, fragMax, w2wccDict, bucket);
    })
  } else {
    const datas = [localDataSetCache.files.waves, localDataSetCache.files.sources]
    drawLocalGraph(datas, layer, waveMin, waveMax, fragMin, fragMax, w2wccDict, bucket);
  }
  // Promise.all([
  //   d3.text(datasetName + ccName + '_waves/' + `layer-${layer}-waves.csv`),
  //   d3.text(datasetName + ccName + '_waves/' + `layer-${layer}-wave-sources.csv`)
  // ]).then(function (datas) {
  //   drawLocalGraph(datas, layer, waveMin, waveMax, fragMin, fragMax, w2wccDict, bucket);
  // })
  // document.getElementById('local-info-container').style.visibility = 'visible';
  // document.getElementById('local-menu-container').style.visibility = 'visible';

  // document.getElementById('down-degree-list-cumulative').style.visibility = 'hidden';
  // document.getElementById('down-degree-list-noncumulative').style.visibility = 'hidden';
  // document.getElementById('local-label-container').style.visibility = 'hidden';

  // UILayout.localInfo.container = 1;
  // UILayout.localInfo.cumulativeInfluencer = 0;
  // UILayout.localInfo.noncumulativeInfluencer = 0;
  // UILayout.localInfo.labelExpansion = 0;
}

function drawLocalGraph(datas, layer, waveMin, waveMax, fragMin, fragMax, w2wccDict, bucket) {
  const edgeFile = datas[0];
  const sourceFile = datas[1];

  const localIdx2nodes = {};
  const localST2links = {};
  const wfSet = {};
  const label2node = {}

  // for (const [v, w, f] of d3.csvParseRows(sourceFile)) {
  //   const vInt = parseInt(v);
  //   const wInt = parseInt(w);
  //   const fInt = parseInt(f);
  //   if (wInt > wave || (wInt == wave && fInt >= frag)) {
  //     const node = {id: srcInt, source: false};
  //     if (wInt === wave && )
  //     localIdx2nodes[srcInt] = node;
  //   }
  // }

  for (const [src, tgt, w, wcc, f] of d3.csvParseRows(edgeFile)) {
    const wInt = parseInt(w);
    const fInt = parseInt(f);
    // console.log(w2wccDict)
    if (!w2wccDict.hasOwnProperty(wInt)) {
      continue;
    }
    if (!w2wccDict[wInt].has(parseInt(wcc))) {
      continue;
    }
    if (wInt >= waveMin && wInt <= waveMax && fInt >= fragMin && fInt <= fragMax) {
      const srcInt = parseInt(src);
      const tgtInt = parseInt(tgt);
      if (!localIdx2nodes.hasOwnProperty(srcInt)) {
        const node = { id: srcInt, source: false, label: dataSet.v2labelDict[srcInt], degree: 0, keepVis: true, adjLinkList: [], neighborList: [], revNeighborList: [], horizontalNeighborList: [] };
        localIdx2nodes[srcInt] = node;
        label2node[dataSet.v2labelDict[srcInt]] = node;
      }
      if (!localIdx2nodes.hasOwnProperty(tgtInt)) {
        const node = { id: tgtInt, source: false, label: dataSet.v2labelDict[tgtInt], degree: 0, keepVis: true, adjLinkList: [], neighborList: [], revNeighborList: [], horizontalNeighborList: [] };
        localIdx2nodes[tgtInt] = node;
        label2node[dataSet.v2labelDict[tgtInt]] = node;
      }
      const link = { source: srcInt, target: tgtInt, reversed: true, keepVis: true };
      localIdx2nodes[srcInt].degree++;
      localIdx2nodes[tgtInt].degree++;
      localST2links[`${srcInt}-${tgtInt}`] = link;
    }
  }

  for (const [v, w, f] of d3.csvParseRows(sourceFile)) {
    const vInt = parseInt(v);
    if (!localIdx2nodes.hasOwnProperty(v)) {
      continue
    }
    const wInt = parseInt(w);
    const fInt = parseInt(f);
    if (wInt >= waveMin && wInt <= waveMax && fInt >= fragMin && fInt <= fragMax) {
      localIdx2nodes[vInt].source = true;
    }
    localIdx2nodes[vInt].wave = wInt;
    localIdx2nodes[vInt].frag = fInt;
    localIdx2nodes[vInt].degree /= 2;
    wfSet[`${wInt}-${fInt}`] = 1;
  }

  const wfList = Object.keys(wfSet).map(d => d.split('-').map(d => parseInt(d))).sort((a, b) => a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]);
  const wf2level = {};
  const level2wf = {};
  let maxLevel = 0;
  for (const level in wfList) {
    const [wInt, fInt] = wfList[level];
    if (wInt <= waveMax && fInt <= fragMax) {
      maxLevel = parseInt(level);
    }
    wf2level[`${wInt}-${fInt}`] = parseInt(level);
    level2wf[level] = [wInt, fInt];
  }

  for (const tempLink of Object.values(localST2links)) {
    const [sourceNode, targetNode] = getSTNodeFromLink(tempLink, localIdx2nodes);

    const sourceLevel = wf2level[`${sourceNode.wave}-${sourceNode.frag}`]
    const targetLevel = wf2level[`${targetNode.wave}-${targetNode.frag}`]

    if (sourceLevel > targetLevel) {

      continue
    } else if (sourceLevel === targetLevel && sourceNode.id > targetNode.id) {
      continue
    } else {
      tempLink.reversed = false;
      sourceNode.adjLinkList.push(tempLink)
      targetNode.adjLinkList.push(tempLink)
      if (sourceLevel === targetLevel) {
        sourceNode.horizontalNeighborList.push(targetNode);
        targetNode.horizontalNeighborList.push(sourceNode);
      } else {
        sourceNode.neighborList.push(targetNode)
        targetNode.revNeighborList.push(sourceNode);
      }
    }
  }
  // console.log(wfList)
  // console.log(maxLevel);

  localDataSet.idx2node = localIdx2nodes;
  localDataSet.st2link = localST2links;
  localDataSet.wf2level = wf2level;
  localDataSet.level2wf = level2wf
  localDataSet.label2node = label2node;
  localDataSet.maxLevel = maxLevel
  localDataSet.vertices = Object.keys(localIdx2nodes).length;
  localDataSet.edges = Object.keys(localST2links).length;
  localDataSet.waves = waveMax - waveMin + 1;
  localDataSet.fragments = maxLevel + 1

  localDataSet.strataName = `${datasetName + ccName}-F${layer}-b${bucket}-W${waveMin}_${waveMax}-f${fragMin}_${fragMax}`
  localDataSet.strataReady = false;
  localDataSet.metaReady = false;
  localDataSet.metaLongestReady = false;
  localDataSet.spanningConnectReady = false;

  // console.log(localDataSet.idx2node)

  GRAPH_META.showMeta = false;
  graphGUI.updateDisplay();

  // TODO: if not meta, underline V E
  document.getElementById('local-info').innerHTML = `<span id="local-info-raw-size">${localDataSet.vertices}|V|, ${localDataSet.edges / 2}|E|</span>, <span style="color:#FF00FF"><u>${localDataSet.waves}W, ${localDataSet.fragments}fr</u></span>`
  document.getElementById('local-graph-navigation-info-container').style.visibility = 'visible';
  document.getElementById('local-info').style.visibility = 'visible';

  updateGuiThreshold(maxLevel, waveMax);
  const [localNodes, localLinks] = filterGraph(maxLevel, 0, maxLevel, 0, maxLevel, 0, maxLevel, 0, maxLevel, 0, true);
  naturalFragmentWeight(localDataSet.idx2node, localDataSet.wf2level)
  // console.log(localNodes)
  // console.log(localLinks)

  console.log(document.getElementById('local-graph-container').offsetWidth)

  localGraph = ForceGraph3D()
    (document.getElementById(`local-graph`))
    .graphData({ nodes: [], links: [] })
    .backgroundColor('#222222')
    .width(document.getElementById('local-graph-container').offsetWidth)
    .height(document.getElementById('local-graph-container').offsetHeight)
    .showNavInfo(false)
    .nodeRelSize(4 / 16 * Math.pow(16, GRAPH_VIS.scale.node / GRAPH_VIS.scale.nodeDefault))
    .nodeVal(node => node.relVal)
    .nodeColor(node => { })
    .nodeOpacity(GRAPH_VIS.opacity.node / 100)
    .nodeLabel(node => `Wave${node.wave} Frag${node.frag + 1}<br>Deg${node.degree}<br>${node.label}`)
    .linkWidth(link => link.relVal)
    .linkColor(link => link.color)
    .linkOpacity(GRAPH_VIS.opacity.link / 100)
    // .linkMaterial(link => new THREE.MeshLambertMaterial({color: link.color, transparent: true, opacity: (GRAPH_VIS.opacity.link / 100) * linkOpacityQueryScale(link)}))
    // .linkDirectionalParticles(link => link.longPath ? 2 : 0)
    // .linkDirectionalParticleWidth(link => link.relVal / 2)
    .linkVisibility(d => d.keepVis)
    .nodeVisibility(d => d.keepVis)
    .nodeThreeObject(d => localNodeGeom(d));

  localGraph.d3Force('charge').distanceMax(1000 * Math.pow(32, GRAPH_VIS.stretch.horizontal / GRAPH_VIS.stretch.horizontalDefault) / 32)

  spanningMetaConnectJump();

  setTimeout(() => localGraph.zoomToFit(250, 10, node => true), 1000);

  localGraph.onNodeClick(node => {
    console.log(node)
    d3.selectAll(".forkFragArrowText").attr("visibility", "hidden");
    d3.select(`#forkFragArrowText_${node.wave}_${node.frag}`).attr("visibility", "visible");
    // showFragment(node.wave, node.frag)
  })

  localGraph.onNodeRightClick((node, event) => {
    if (!UIInfo.neighbor.clickShowNeighborFlag) {
      return
    }
    console.log('here')
    if (GRAPH_META.showMeta) {
      if (!event.ctrlKey) {
        clearSearch();
        showAllEdges();
        showNaturalWeight(localDataSet.idx2metaNode);
        // GRAPH_VIS.spanOnly = 0;
        for (const tempLink of Object.values(localDataSet.st2metaLink)) {
          tempLink.keepVis = false;
        }
      }
      UIInfo.neighbor.step++
      console.log(node.adjLinkList.length)
      for (const tempLink of node.adjLinkList) {
        tempLink.keepVis = true;
      }
    } else {
      if (!event.ctrlKey) {
        clearSearch();
        showAllEdges();
        showNaturalWeight(localDataSet.idx2node);
        // GRAPH_VIS.spanOnly = 0;
        for (const tempLink of Object.values(localDataSet.st2metaLink)) {
          tempLink.keepVis = false;
        }
      }
      UIInfo.neighbor.step++
      console.log(node.adjLinkList.length)
      for (const tempLink of node.adjLinkList) {
        tempLink.keepVis = true;
      }
    }
    localGraph.linkVisibility(d => d.keepVis);
  })

  // $('#local-graph .scene-nav-info').text('Spanning Meta-DAG with jumping edges connecting disconnected spanning components.\n Left-click: rotate, Mouse-wheel/middle-click: zoom, Right-click: pan')


  // showLocalNode('fabula_sellbuy-cc0_waves/layer-4-longPath.vertex.csv')
  // showLocalEdge('fabula_sellbuy-cc0_waves/layer-4-longPath.edge.csv')
}





// // local graph related. TODO: re-abstract

function initLocalSubGUI() {
  subGUI = new dat.GUI({
    autoPlace: true,
    width: 250
  });
  subGUI.close()
  // gui2.domElement.style = "position: absolute; top: " + cityContainer.offsetHeight + "px; left: 10px;";
  let subGUIcontainer = document.getElementById('local-sub-menu-container');
  subGUIcontainer.appendChild(subGUI.domElement);
  // console.log(cityContainer.offsetHeight);
  // subGUIcontainer.style = "position: absolute; top: " + 0 + "px; right: 10px; z-index: 5";

  let subGUIfVis = subGUI.addFolder('Visualization');
  subGUIfVis.open();

  SUB_GUI.scale.node = subGUIfVis.add(GRAPH_VIS.scale, 'node', 0, 100)
    .name('node size')
    .onChange(() => scaleNode());
  SUB_GUI.scale.link = subGUIfVis.add(GRAPH_VIS.scale, 'link', 0, 100)
    .name('link size')
    .onChange(() => scaleLink());

  let subGUIfVisLink = subGUIfVis.addFolder('Link size detail');
  subGUIfVis.open();
  SUB_GUI.scale.longPath = subGUIfVisLink.add(GRAPH_VIS.scale, 'longPath', 0, 100)
    .name('longest DAG path')
    .onChange(() => {
      if (!localDataSet.metaLongestReady) {
        prepareLongestPath();
      }
      scaleLink();
    });
  SUB_GUI.scale.layerInduce = subGUIfVisLink.add(GRAPH_VIS.scale, 'layerInduce', 0, 100)
    .name('layer induced')
    .onChange(() => scaleLink());

  SUB_GUI.opacity.node = subGUIfVis.add(GRAPH_VIS.opacity, 'node', 0, 100)
    .name('node opacity')
    .onChange(() => opacityNode());
  SUB_GUI.opacity.link = subGUIfVis.add(GRAPH_VIS.opacity, 'link', 0, 100)
    .name('link opacity')
    .onChange(() => opacityLink());

  SUB_GUI.stretch.vertical = subGUIfVis.add(SUB_VIS.stretch, 'vertical', 0, 100)
    .name('vertical stretch')
    .onChange(() => verticalStretchSub());

  let subGUIfVisVertical = subGUIfVis.addFolder('Vertical stretch detail');
  SUB_GUI.stretch.current = subGUIfVisVertical.add(SUB_VIS.stretch, 'current', 0, 100)
    .name('current level')
    .onChange(() => verticalStretchSub());
  SUB_GUI.stretch.above = subGUIfVisVertical.add(SUB_VIS.stretch, 'above', 0, 100)
    .name('level above')
    .onChange(() => verticalStretchSub());
  SUB_GUI.stretch.below = subGUIfVisVertical.add(SUB_VIS.stretch, 'below', 0, 100)
    .name('level below')
    .onChange(() => verticalStretchSub());

  SUB_GUI.pos.local = subGUIfVis.add(SUB_VIS, 'localPos')
    .name('oringal layout')
  SUB_GUI.pos.local = subGUIfVis.add(SUB_VIS, 'forcePos')
    .name('force-directed layout')
  SUB_GUI.pos.local = subGUIfVis.add(SUB_VIS, 'layerPos')
    .name('layered layout')

  // SUB_GUI.subGraph.open = subGUIfVis.add(GRAPH_VIS, 'subGraph')
  //   .name('open locally')

  // SUB_GUI.strata.open = subGUIfVis.add(GRAPH_META, 'showMeta')
  //   .name('meta DAG')
  //   .onChange(() => switchLocalMeta());

  // SUB_GUI.stretch.vertical = subGUIfVis.add(GRAPH_VIS.stretch, 'horizontal', 0, 100)
  //     .name('horizontal stretch')
  //     .onChange(() => horizontalStretch());

  // let subGUIfSearch = subGUI.addFolder('Search');
  // subGUIfSearch.open();

  // SUB_GUI.search.highDown = subGUIfSearch.add(GRAPH_SEARCH.search, 'showHighDown')
  //   .name('cumulative influencers');
  // SUB_GUI.search.longestPath = subGUIfSearch.add(GRAPH_SEARCH.search, 'showLongestPath')
  //   .name('longest DAG path');


  // SUB_GUI.search.key = subGUIfSearch.add(GRAPH_SEARCH.search, 'key')
  //   .name('key');
  // SUB_GUI.search.search = subGUIfSearch.add(GRAPH_SEARCH.search, 'search')
  //   .name('search');
  // SUB_GUI.search.cumSearch = subGUIfSearch.add(GRAPH_SEARCH.search, 'cumulativeSearch')
  //   .name('cumulative search');
  // SUB_GUI.search.extend = subGUIfSearch.add(GRAPH_SEARCH.search, 'extend')
  //   .name('extend');

  let subGUIfGrow = subGUI.addFolder('Grow Fragment');
  subGUIfGrow.open();

  SUB_GUI.fragGrow.play = subGUIfGrow.add(SUB_CONTROL.fragGrow, 'play')
    // .title('abcde')
    .name('play')
  SUB_GUI.fragGrow.pasue = subGUIfGrow.add(SUB_CONTROL.fragGrow, 'pause')
    .name('pause/resume')
  SUB_GUI.fragGrow.step = subGUIfGrow.add(SUB_CONTROL.fragGrow, 'step', 0, 1000)
    .onChange(() => growSubFrag());
  SUB_GUI.fragGrow.inc = subGUIfGrow.add(SUB_CONTROL.fragGrow, 'inc')
    .name('forward one step')
  SUB_GUI.fragGrow.dec = subGUIfGrow.add(SUB_CONTROL.fragGrow, 'dec')
    .name('backward one step')

  let subGUIfFilter = subGUI.addFolder('Filter');
  // subGUIfFilter.open();

  let subGUIfFilterFocusLevel = subGUIfFilter.addFolder('Focus');
  SUB_GUI.focus.top = subGUIfFilterFocusLevel.add(SUB_THRESH.focus, 'top', 0, 1000)
    .onChange(() => updateSubGraphLevel());
  SUB_GUI.focus.bottom = subGUIfFilterFocusLevel.add(SUB_THRESH.focus, 'bottom', 0, 1000)
    .onChange(() => updateSubGraphLevel());

  let subGUIfFilterInduceLevel = subGUIfFilter.addFolder('Induce');
  SUB_GUI.induce.top = subGUIfFilterInduceLevel.add(SUB_THRESH.induce, 'top', 0, 1000)
    .onChange(() => updateSubGraphLevel());
  SUB_GUI.induce.bottom = subGUIfFilterInduceLevel.add(SUB_THRESH.induce, 'bottom', 0, 1000)
    .onChange(() => updateSubGraphLevel());

  let subGUIfFilterSpanLevel = subGUIfFilter.addFolder('Span');
  SUB_GUI.span.top = subGUIfFilterSpanLevel.add(SUB_THRESH.span, 'top', 0, 1000)
    .onChange(() => updateSubGraphLevel());
  SUB_GUI.span.bottom = subGUIfFilterSpanLevel.add(SUB_THRESH.span, 'bottom', 0, 1000)
    .onChange(() => updateSubGraphLevel());

  let subGUIfFilterJumpLevel = subGUIfFilter.addFolder('Jump');
  SUB_GUI.jump.top = subGUIfFilterJumpLevel.add(SUB_THRESH.jump, 'top', 0, 1000)
    .onChange(() => updateSubGraphLevel());
  SUB_GUI.jump.bottom = subGUIfFilterJumpLevel.add(SUB_THRESH.jump, 'bottom', 0, 1000)
    .onChange(() => updateSubGraphLevel());

  let subGUIfFilterBackLevel = subGUIfFilter.addFolder('Back');
  SUB_GUI.back.top = subGUIfFilterBackLevel.add(SUB_THRESH.back, 'top', 0, 1000)
    .onChange(() => updateSubGraphLevel());
  SUB_GUI.back.bottom = subGUIfFilterBackLevel.add(SUB_THRESH.back, 'bottom', 0, 1000)
    .onChange(() => updateSubGraphLevel());
}


function initLocalGUI() {
  graphGUI = new dat.GUI({
    autoPlace: true,
    width: 250
  });
  graphGUI.close()
  // gui2.domElement.style = "position: absolute; top: " + cityContainer.offsetHeight + "px; left: 10px;";
  let graphGUIcontainer = document.getElementById('local-menu-container');
  graphGUIcontainer.appendChild(graphGUI.domElement);
  // console.log(cityContainer.offsetHeight);
  // graphGUIcontainer.style = "position: absolute; top: " + 0 + "px; right: 10px; z-index: 5";

  let graphGUIfVis = graphGUI.addFolder('Visualization');
  graphGUIfVis.open();

  GRAPH_GUI.scale.node = graphGUIfVis.add(GRAPH_VIS.scale, 'node', 0, 100)
    .name('node size')
    .onChange(() => scaleNode());
  GRAPH_GUI.scale.link = graphGUIfVis.add(GRAPH_VIS.scale, 'link', 0, 100)
    .name('link size')
    .onChange(() => scaleLink());

  let graphGUIfVisLink = graphGUIfVis.addFolder('Link size detail');
  graphGUIfVis.open();
  GRAPH_GUI.scale.longPath = graphGUIfVisLink.add(GRAPH_VIS.scale, 'longPath', 0, 100)
    .name('longest DAG path')
    .onChange(() => {
      if (!localDataSet.metaLongestReady) {
        prepareLongestPath();
      }
      scaleLink();
    });
  GRAPH_GUI.scale.layerInduce = graphGUIfVisLink.add(GRAPH_VIS.scale, 'layerInduce', 0, 100)
    .name('layer induced')
    .onChange(() => scaleLink());

  GRAPH_GUI.opacity.node = graphGUIfVis.add(GRAPH_VIS.opacity, 'node', 0, 100)
    .name('node opacity')
    .onChange(() => opacityNode());
  GRAPH_GUI.opacity.link = graphGUIfVis.add(GRAPH_VIS.opacity, 'link', 0, 100)
    .name('link opacity')
    .onChange(() => opacityLink());

  GRAPH_GUI.stretch.vertical = graphGUIfVis.add(GRAPH_VIS.stretch, 'vertical', 0, 100)
    .name('vertical stretch')
    .onChange(() => verticalStretch());

  let graphGUIfVisVertical = graphGUIfVis.addFolder('Vertical stretch detail');
  GRAPH_GUI.stretch.current = graphGUIfVisVertical.add(GRAPH_VIS.stretch, 'current', 0, 100)
    .name('current level')
    .onChange(() => verticalStretch());
  GRAPH_GUI.stretch.above = graphGUIfVisVertical.add(GRAPH_VIS.stretch, 'above', 0, 100)
    .name('level above')
    .onChange(() => verticalStretch());
  GRAPH_GUI.stretch.below = graphGUIfVisVertical.add(GRAPH_VIS.stretch, 'below', 0, 100)
    .name('level below')
    .onChange(() => verticalStretch());

  GRAPH_GUI.strata.open = graphGUIfVis.add(GRAPH_VIS, 'strata')
    .name('open in Strata')

  GRAPH_GUI.subGraph.open = graphGUIfVis.add(GRAPH_VIS, 'subGraph')
    .name('open locally')

  // GRAPH_GUI.strata.open = graphGUIfVis.add(GRAPH_VIS, 'spanOnly')
  //   .name('Spanning Only')
  //   .onChange(() => showSpanOnly());

  GRAPH_GUI.strata.open = graphGUIfVis.add(GRAPH_META, 'showMeta')
    .name('meta DAG')
    .onChange(() => switchLocalMeta());

  // GRAPH_GUI.stretch.vertical = graphGUIfVis.add(GRAPH_VIS.stretch, 'horizontal', 0, 100)
  //     .name('horizontal stretch')
  //     .onChange(() => horizontalStretch());

  let graphGUIfSearch = graphGUI.addFolder('Search');
  graphGUIfSearch.open();

  GRAPH_GUI.search.highDown = graphGUIfSearch.add(GRAPH_SEARCH.search, 'showHighDown')
    .name('cumulative influencers');
  GRAPH_GUI.search.longestPath = graphGUIfSearch.add(GRAPH_SEARCH.search, 'showLongestPath')
    .name('longest DAG path');
  GRAPH_GUI.search.longestPath = graphGUIfSearch.add(GRAPH_SEARCH.search, 'showWideList')
    .name('widest level');


  GRAPH_GUI.search.key = graphGUIfSearch.add(GRAPH_SEARCH.search, 'key')
    .name('key');
  GRAPH_GUI.search.search = graphGUIfSearch.add(GRAPH_SEARCH.search, 'search')
    .name('search');
  GRAPH_GUI.search.cumSearch = graphGUIfSearch.add(GRAPH_SEARCH.search, 'cumulativeSearch')
    .name('cumulative');
  GRAPH_GUI.search.extend = graphGUIfSearch.add(GRAPH_SEARCH.search, 'extend')
    .name('expand');

  let graphGUIfGrow = graphGUI.addFolder('Grow Fragment');
  graphGUIfGrow.open();

  GRAPH_GUI.fragGrow.play = graphGUIfGrow.add(GRAPH_CONTROL.fragGrow, 'play')
    // .title('abcde')
    .name('play')
  GRAPH_GUI.fragGrow.pasue = graphGUIfGrow.add(GRAPH_CONTROL.fragGrow, 'pause')
    .name('pause/resume')
  GRAPH_GUI.fragGrow.step = graphGUIfGrow.add(GRAPH_CONTROL.fragGrow, 'step', 0, 1000)
    .onChange(() => growFrag());
  GRAPH_GUI.fragGrow.inc = graphGUIfGrow.add(GRAPH_CONTROL.fragGrow, 'inc')
    .name('forward one step')
  GRAPH_GUI.fragGrow.dec = graphGUIfGrow.add(GRAPH_CONTROL.fragGrow, 'dec')
    .name('backward one step')

  let graphGUIfFilter = graphGUI.addFolder('Filter');
  // graphGUIfFilter.open();

  let graphGUIfFilterFocusLevel = graphGUIfFilter.addFolder('Focus');
  GRAPH_GUI.focus.top = graphGUIfFilterFocusLevel.add(GRAPH_THRESH.focus, 'top', 0, 1000)
    .onChange(() => updateGraphLevel());
  GRAPH_GUI.focus.bottom = graphGUIfFilterFocusLevel.add(GRAPH_THRESH.focus, 'bottom', 0, 1000)
    .onChange(() => updateGraphLevel());

  let graphGUIfFilterInduceLevel = graphGUIfFilter.addFolder('Induce');
  GRAPH_GUI.induce.top = graphGUIfFilterInduceLevel.add(GRAPH_THRESH.induce, 'top', 0, 1000)
    .onChange(() => updateGraphLevel());
  GRAPH_GUI.induce.bottom = graphGUIfFilterInduceLevel.add(GRAPH_THRESH.induce, 'bottom', 0, 1000)
    .onChange(() => updateGraphLevel());

  let graphGUIfFilterSpanLevel = graphGUIfFilter.addFolder('Span');
  GRAPH_GUI.span.top = graphGUIfFilterSpanLevel.add(GRAPH_THRESH.span, 'top', 0, 1000)
    .onChange(() => updateGraphLevel());
  GRAPH_GUI.span.bottom = graphGUIfFilterSpanLevel.add(GRAPH_THRESH.span, 'bottom', 0, 1000)
    .onChange(() => updateGraphLevel());

  let graphGUIfFilterJumpLevel = graphGUIfFilter.addFolder('Jump');
  GRAPH_GUI.jump.top = graphGUIfFilterJumpLevel.add(GRAPH_THRESH.jump, 'top', 0, 1000)
    .onChange(() => updateGraphLevel());
  GRAPH_GUI.jump.bottom = graphGUIfFilterJumpLevel.add(GRAPH_THRESH.jump, 'bottom', 0, 1000)
    .onChange(() => updateGraphLevel());

  let graphGUIfFilterBackLevel = graphGUIfFilter.addFolder('Back');
  GRAPH_GUI.back.top = graphGUIfFilterBackLevel.add(GRAPH_THRESH.back, 'top', 0, 1000)
    .onChange(() => updateGraphLevel());
  GRAPH_GUI.back.bottom = graphGUIfFilterBackLevel.add(GRAPH_THRESH.back, 'bottom', 0, 1000)
    .onChange(() => updateGraphLevel());
}

function updateGuiThreshold(maxlevel, maxWave) {
  GRAPH_GUI.focus.top.max(maxlevel);
  GRAPH_GUI.focus.top.min(0);
  GRAPH_GUI.focus.bottom.max(maxlevel);
  GRAPH_GUI.focus.bottom.min(0);
  GRAPH_THRESH.focus.top = maxlevel;

  GRAPH_GUI.induce.top.max(maxlevel);
  GRAPH_GUI.induce.top.min(0);
  GRAPH_GUI.induce.bottom.max(maxlevel);
  GRAPH_GUI.induce.bottom.min(0);
  GRAPH_THRESH.induce.top = maxlevel;

  GRAPH_GUI.span.top.max(maxlevel);
  GRAPH_GUI.span.top.min(0);
  GRAPH_GUI.span.bottom.max(maxlevel);
  GRAPH_GUI.span.bottom.min(0);
  GRAPH_THRESH.span.top = maxlevel;

  GRAPH_GUI.jump.top.max(maxlevel);
  GRAPH_GUI.jump.top.min(0);
  GRAPH_GUI.jump.bottom.max(maxlevel);
  GRAPH_GUI.jump.bottom.min(0);
  GRAPH_THRESH.jump.top = maxlevel;

  GRAPH_GUI.back.top.max(maxlevel);
  GRAPH_GUI.back.top.min(0);
  GRAPH_GUI.back.bottom.max(maxlevel);
  GRAPH_GUI.back.bottom.min(0);
  GRAPH_THRESH.back.top = maxlevel;

  GRAPH_GUI.fragGrow.step.max(maxlevel * UIInfo.right.stepPerFrag);
  GRAPH_GUI.fragGrow.step.min(0);
  GRAPH_CONTROL.fragGrow.step = maxlevel * UIInfo.right.play.stepPerFrag;
  GRAPH_CONTROL.fragGrow.maxStep = maxlevel * UIInfo.right.play.stepPerFrag;
  GRAPH_CONTROL.fragGrow.minStep = 0;

  GRAPH_SEARCH.vis.nodeSizePara = d3.max(Object.values(localDataSet.idx2node), node => node.degree);
  // GRAPH_DIVERSITY.threshold.topDefault = d3.max(Object.values(localDataSet.idx2node), node => node.diversity);

  graphGUI.updateDisplay();

  updateLocalFilterSlider();
}

function updateSubGuiThreshold(maxlevel, maxWave) {
  SUB_GUI.focus.top.max(maxlevel);
  SUB_GUI.focus.top.min(0);
  SUB_GUI.focus.bottom.max(maxlevel);
  SUB_GUI.focus.bottom.min(0);
  SUB_THRESH.focus.top = maxlevel;

  SUB_GUI.induce.top.max(maxlevel);
  SUB_GUI.induce.top.min(0);
  SUB_GUI.induce.bottom.max(maxlevel);
  SUB_GUI.induce.bottom.min(0);
  SUB_THRESH.induce.top = maxlevel;

  SUB_GUI.span.top.max(maxlevel);
  SUB_GUI.span.top.min(0);
  SUB_GUI.span.bottom.max(maxlevel);
  SUB_GUI.span.bottom.min(0);
  SUB_THRESH.span.top = maxlevel;

  SUB_GUI.jump.top.max(maxlevel);
  SUB_GUI.jump.top.min(0);
  SUB_GUI.jump.bottom.max(maxlevel);
  SUB_GUI.jump.bottom.min(0);
  SUB_THRESH.jump.top = maxlevel;

  SUB_GUI.back.top.max(maxlevel);
  SUB_GUI.back.top.min(0);
  SUB_GUI.back.bottom.max(maxlevel);
  SUB_GUI.back.bottom.min(0);
  SUB_THRESH.back.top = maxlevel;

  SUB_GUI.fragGrow.step.max(maxlevel * UIInfo.right.stepPerFrag);
  SUB_GUI.fragGrow.step.min(0);
  SUB_CONTROL.fragGrow.step = maxlevel * UIInfo.right.stepPerFrag;
  SUB_CONTROL.fragGrow.maxStep = maxlevel * UIInfo.right.stepPerFrag;
  SUB_CONTROL.fragGrow.minStep = 0;

  // GRAPH_SEARCH.vis.nodeSizePara = d3.max(Object.values(localDataSet.idx2node), node => node.degree);
  // GRAPH_DIVERSITY.threshold.topDefault = d3.max(Object.values(localDataSet.idx2node), node => node.diversity);

  subGUI.updateDisplay();
}

function scaleNode() {
  const factor = 16;
  // const searchScale = (node) => node.searchRes ? GRAPH_SEARCH.vis.nodeSize : 1;
  // const searchScale = (node) => 1;
  // const searchScale = (node) => node.searchRes ? 1 + GRAPH_SEARCH.vis.nodeSize * (node.degree / GRAPH_SEARCH.vis.nodeSizePara) : 1;
  // localGraph.nodeVal(node => node.relVal * searchScale(node));
  // localGraph.nodeRelSize(4 / factor * Math.pow(factor, GRAPH_VIS.scale.node / GRAPH_VIS.scale.nodeDefault));
  localGraph.nodeThreeObject(d => localNodeGeom(d))

  graphGUI.updateDisplay()

  if (localSubGraph) {
    // localSubGraph.nodeVal(node => node.relVal * searchScale(node));
    // localSubGraph.nodeRelSize(4 / factor * Math.pow(factor, GRAPH_VIS.scale.node / GRAPH_VIS.scale.nodeDefault));
    localSubGraph.nodeThreeObject(d => localNodeGeom(d))
    subGUI.updateDisplay()
  }
}

function scaleLink() {
  const factor = 32;
  const layerInduceFactor = 32;
  const layerInduceScale = 1 / layerInduceFactor * Math.pow(layerInduceFactor, GRAPH_VIS.scale.layerInduce / GRAPH_VIS.scale.layerInduceDefault);
  const longPathFactor = 32;
  const longPathScale = 1 / longPathFactor * Math.pow(longPathFactor, GRAPH_VIS.scale.longPath / GRAPH_VIS.scale.longPathDefault);
  localGraph.linkWidth(link => link.relVal / factor * Math.pow(factor, GRAPH_VIS.scale.link / GRAPH_VIS.scale.linkDefault) * (link.layerInduce ? layerInduceScale : 1) * (link.longestRes ? longPathScale : 1));
  // localGraph.linkDirectionalParticleWidth(link => link.relVal / factor * Math.pow(factor, GRAPH_VIS.scale.link / GRAPH_VIS.scale.linkDefault) * (link.layerInduce ? layerInduceScale : 1) * (link.longestRes ? longPathScale : 1) / 2)

  graphGUI.updateDisplay()

  if (localSubGraph) {
    localSubGraph.linkWidth(link => link.relVal / factor * Math.pow(factor, GRAPH_VIS.scale.link / GRAPH_VIS.scale.linkDefault) * (link.layerInduce ? layerInduceScale : 1) * (link.longestRes ? longPathScale : 1));
    subGUI.updateDisplay()
  }
}

function opacityNode() {
  // localGraph.nodeOpacity(GRAPH_VIS.opacity.node / 100);
  localGraph.nodeThreeObject(d => localNodeGeom(d))
  graphGUI.updateDisplay()
  if (localSubGraph) {
    // localSubGraph.nodeOpacity(GRAPH_VIS.opacity.node / 100);
    localSubGraph.nodeThreeObject(d => localNodeGeom(d))
    subGUI.updateDisplay()
  }
}

function opacityLink() {
  localGraph.linkOpacity(GRAPH_VIS.opacity.link / 100);
  graphGUI.updateDisplay()
  // localGraph.linkMaterial(link => new THREE.MeshLambertMaterial({color: link.color, transparent: true, opacity: (GRAPH_VIS.opacity.link / 100 + (1 - GRAPH_VIS.opacity.link / 100) * linkOpacityScale(link, GRAPH_DIVERSITY.threshold.topDefault)) * linkOpacityQueryScale(link)}));
  if (localSubGraph) {
    // console.log('here')
    localSubGraph.linkOpacity(GRAPH_VIS.opacity.link / 100);
    subGUI.updateDisplay()
  }
}

function verticalStretch() {
  const nodeList = GRAPH_META.showMeta ? Object.values(localDataSet.idx2metaNode) : Object.values(localDataSet.idx2node);

  for (const tempNode of nodeList) {
    const level = localDataSet.wf2level[`${tempNode.wave}-${tempNode.frag}`];
    const filterLevel = GRAPH_THRESH.focus.top;
    const distParaScale = UIInfo.local.distPara * GRAPH_VIS.stretch.vertical / GRAPH_VIS.stretch.verticalDefault
    if (level <= filterLevel) {
      tempNode.fy = level * distParaScale * GRAPH_VIS.stretch.below / GRAPH_VIS.stretch.belowDefault;
    } else if (level === filterLevel + 1) {
      tempNode.fy = filterLevel * distParaScale * GRAPH_VIS.stretch.below / GRAPH_VIS.stretch.belowDefault + 2 * distParaScale * GRAPH_VIS.stretch.current / GRAPH_VIS.stretch.currentDefault;
    } else {
      tempNode.fy = filterLevel * distParaScale * GRAPH_VIS.stretch.below / GRAPH_VIS.stretch.belowDefault + 2 * distParaScale * GRAPH_VIS.stretch.current / GRAPH_VIS.stretch.currentDefault + 0.2 * (level - filterLevel - 1) * distParaScale * GRAPH_VIS.stretch.above / GRAPH_VIS.stretch.aboveDefault;
    }
  }
  localGraph.d3ReheatSimulation();
}

function verticalStretchSub() {
  for (const tempNode of Object.values(localSubDataSet.idx2node)) {
    const level = tempNode.searchStep;
    const filterLevel = SUB_THRESH.focus.top;
    const distParaScale = UIInfo.localSub.distPara * SUB_VIS.stretch.vertical / SUB_VIS.stretch.verticalDefault
    if (level <= filterLevel) {
      tempNode.fy = level * distParaScale * SUB_VIS.stretch.below / SUB_VIS.stretch.belowDefault;
    } else if (level === filterLevel + 1) {
      tempNode.fy = filterLevel * distParaScale * SUB_VIS.stretch.below / SUB_VIS.stretch.belowDefault + 2 * distParaScale * SUB_VIS.stretch.current / SUB_VIS.stretch.currentDefault;
    } else {
      tempNode.fy = filterLevel * distParaScale * SUB_VIS.stretch.below / SUB_VIS.stretch.belowDefault + 2 * distParaScale * SUB_VIS.stretch.current / SUB_VIS.stretch.currentDefault + 0.2 * (level - filterLevel - 1) * distParaScale * SUB_VIS.stretch.above / SUB_VIS.stretch.aboveDefault;
    }
  }
  localSubGraph.d3ReheatSimulation();
}

// function horizontalStretch() {
//     localGraph.d3Force('center').strength(1.75 / 2 * Math.pow(1.5, GRAPH_VIS.stretch.horizontal / GRAPH_VIS.stretch.horizontalDefault));
//     localGraph.d3ReheatSimulation();
// }

function showSpanOnly(showConnectJump) {
  if (showConnectJump == null || showConnectJump == undefined) {
    showConnectJump = false;
  }
  GRAPH_THRESH.jump.bottom = GRAPH_THRESH.jump.top + 1;
  GRAPH_THRESH.back.bottom = GRAPH_THRESH.back.top + 1;
  disableJumpSlider();
  graphGUI.updateDisplay();
  updateGraphLevel(showConnectJump);
}

function showAllEdges() {
  GRAPH_THRESH.jump.bottom = 0;
  GRAPH_THRESH.back.bottom = 0;
  enableJumpSlider();
  graphGUI.updateDisplay();
  updateGraphLevel();
}

function growFrag() {
  // console.log('here')
  if (localGraph) {
    const step = Math.round(GRAPH_CONTROL.fragGrow.step);
    const level = Math.floor(step / UIInfo.right.play.stepPerFrag);
    const subStep = step % UIInfo.right.play.stepPerFrag;

    $('#right-paly-step-slider').slider('option', 'value', step);

    console.log(step);
    if (subStep === 0) {
      GRAPH_THRESH.focus.top = level;
      GRAPH_THRESH.induce.top = level;
      GRAPH_THRESH.span.top = level;
      GRAPH_THRESH.jump.top = level;
      GRAPH_THRESH.back.top = level;
      GRAPH_THRESH.span.bottom = 0;
      GRAPH_THRESH.jump.bottom = level;
      GRAPH_THRESH.back.bottom = level + 1;
    } else if (subStep === 1) {
      GRAPH_THRESH.focus.top = level;
      GRAPH_THRESH.induce.top = level;
      GRAPH_THRESH.span.top = level;
      GRAPH_THRESH.jump.top = level;
      GRAPH_THRESH.back.top = level;
      GRAPH_THRESH.span.bottom = 0;
      GRAPH_THRESH.jump.bottom = level;
      GRAPH_THRESH.back.bottom = level;
    } else if (subStep === 2) {
      GRAPH_THRESH.focus.top = level;
      GRAPH_THRESH.induce.top = level;
      GRAPH_THRESH.span.top = level;
      GRAPH_THRESH.jump.top = level;
      GRAPH_THRESH.back.top = level;
      GRAPH_THRESH.span.bottom = 0;
      GRAPH_THRESH.jump.bottom = level + 1;
      GRAPH_THRESH.back.bottom = level + 1;
    }
    // console.log(level, subStep);
    graphGUI.updateDisplay();
    updateGraphLevel();
  }
}

function growFragInc() {
  GRAPH_CONTROL.fragGrow.playFlag = false;
  GRAPH_CONTROL.fragGrow.step++;
  if (GRAPH_CONTROL.fragGrow.step >= GRAPH_CONTROL.fragGrow.maxStep) {
    GRAPH_CONTROL.fragGrow.step = GRAPH_CONTROL.fragGrow.maxStep - 1;
  }
  graphGUI.updateDisplay();
  growFrag();
}

function growFragDec() {
  GRAPH_CONTROL.fragGrow.playFlag = false;
  GRAPH_CONTROL.fragGrow.step--;
  if (GRAPH_CONTROL.fragGrow.step < GRAPH_CONTROL.fragGrow.minStep) {
    GRAPH_CONTROL.fragGrow.step = GRAPH_CONTROL.fragGrow.minStep;
  }
  graphGUI.updateDisplay();
  growFrag();
}

function updateGrowFragPlay() {
  if (GRAPH_CONTROL.fragGrow.step > GRAPH_CONTROL.fragGrow.maxStep) {
    return;
  }
  if (!GRAPH_CONTROL.fragGrow.playFlag) {
    return;
  }
  GRAPH_CONTROL.fragGrow.step++;
  graphGUI.updateDisplay();
  growFrag();
  setTimeout(updateGrowFragPlay, GRAPH_CONTROL.fragGrow.timePerStep);
}

function rotateCamera() {
  if (GRAPH_CONTROL.fragGrow.step === GRAPH_CONTROL.fragGrow.maxStep) {
    return;
  }
  if (!GRAPH_CONTROL.fragGrow.playFlag) {
    return;
  }
  // console.log(localGraph)
  const cameraPos = localGraph.cameraPosition();
  const distance = Math.sqrt(Math.pow(cameraPos.x, 2) + Math.pow(cameraPos.z, 2))
  const angle = Math.atan2(cameraPos.x, cameraPos.z);
  // console.log(distance, angle);
  const dAngle = Math.PI / 900;
  localGraph.cameraPosition({ x: distance * Math.sin(angle + dAngle), y: cameraPos.y, z: distance * Math.cos(angle + dAngle) });
  // localGraph.zoomToFit();
  setTimeout(rotateCamera, GRAPH_CONTROL.fragGrow.timePerRotation);
  // console.log(localGraph.cameraPosition())
}

function growFragStop() {
  GRAPH_CONTROL.fragGrow.step = GRAPH_CONTROL.fragGrow.maxStep;
  graphGUI.updateDisplay();
  growFrag();

  GRAPH_CONTROL.fragGrow.playFlag = true;
  setTimeout(updateGrowFragPlay, GRAPH_CONTROL.fragGrow.timePerStep);
  rotateCamera()
}

function growFragPlay() {
  clearSearch(true);
  GRAPH_CONTROL.fragGrow.step = 0;

  graphGUI.updateDisplay();
  growFrag();

  GRAPH_CONTROL.fragGrow.playFlag = true;
  setTimeout(updateGrowFragPlay, GRAPH_CONTROL.fragGrow.timePerStep);
  rotateCamera()
}

function growFragPauseResume() {
  if (GRAPH_CONTROL.fragGrow.playFlag) {
    GRAPH_CONTROL.fragGrow.playFlag = false;
  } else {
    GRAPH_CONTROL.fragGrow.playFlag = true;
    graphGUI.updateDisplay();
    growFrag();

    setTimeout(updateGrowFragPlay, GRAPH_CONTROL.fragGrow.timePerStep);
    rotateCamera()
  }
}

function updateGraphLevel(showConnectJump) {
  if (showConnectJump == null || showConnectJump == undefined) {
    showConnectJump = false;
  }
  // console.log(Graph)
  if (localGraph) {
    // console.log(GRAPH_THRESH.span.top, GRAPH_THRESH.span.bottom, GRAPH_THRESH.jump.top, GRAPH_THRESH.jump.bottom)
    filterLocalGraph(showConnectJump)
  }
  // console.log('here')
  // console.log(GRAPH_GUI.jump.top)
}

function filterGraph(focusTop, focusBottom, spanTop, spanBottom, induceTop, induceBottom, jumpTop, jumpBottom, backTop, backBottom, showall) {
  const nodes = [];
  const links = [];

  const colorFactor = dataSet.buckNodes.map(d => d['density']).reduce((prev, current) => prev + current) / dataSet.buckNodes.length;

  if (showall == null || showall == undefined) {
    showall = false;
  }

  if (UIInfo.local.cloneFlag) {
    // do sth
  } else {
    for (const tempNode of Object.values(localDataSet.idx2node)) {
      tempNode.downDeg = 0;
      tempNode.upDeg = 0;
      tempNode.horizontalDeg = 0;
      tempNode.downDegCum = 0;
      tempNode.upDegCum = 0;
    }

    const keepNodeDict = {};
    let downDegSum = 0;
    const downDegList = new Array(localDataSet.maxLevel + 1).fill(0);
    // console.log(localDataSet.maxLevel+1)
    const downCntList = {};
    let downDegCumSum = 0;
    const downDegCumList = new Array(localDataSet.maxLevel + 1).fill(0);
    const downCntCumList = {};

    for (const tempLink of Object.values(localDataSet.st2link)) {
      if (tempLink.reversed) {
        continue;
      }

      const [sourceNode, targetNode] = getSTNodeFromLink(tempLink, localDataSet.idx2node);

      const sourceLevel = getNodeLevel(sourceNode, localDataSet.wf2level);
      const targetLevel = getNodeLevel(targetNode, localDataSet.wf2level);

      if (sourceLevel > focusTop || sourceLevel < focusBottom) {
        continue;
      }

      if (sourceLevel < targetLevel) {
        sourceNode.upDegCum++;
        targetNode.downDegCum++;
        downDegCumSum++;
        downDegCumList[targetLevel] += 1;
        if (!downCntCumList.hasOwnProperty(targetLevel)) {
          downCntCumList[targetLevel] = {};
        }
        downCntCumList[targetLevel][targetNode.id] = 1;
      }

      const spanRangeCondition = (sourceLevel <= spanTop) && (sourceLevel >= spanBottom);
      const spanCondition = (targetLevel === sourceLevel + 1);
      const induceRangeCondition = (sourceLevel <= induceTop) && (sourceLevel >= induceBottom);
      const induceCondition = (targetLevel === sourceLevel);
      const jumpRangeCondition = (sourceLevel <= jumpTop) && (sourceLevel >= jumpBottom);
      const jumpCondition = (targetLevel > sourceLevel + 1);
      const backRangeCondition = (targetLevel <= backTop) && (targetLevel >= backBottom);
      const backCondition = (targetLevel > sourceLevel);

      if (!showall && !((spanRangeCondition && spanCondition) || (induceRangeCondition && induceCondition) || (jumpRangeCondition && jumpCondition) || (backRangeCondition && backCondition))) {
        tempLink.keepVis = false;
        tempLink.filterRes = false;
        continue;
      }

      tempLink.filterRes = true;

      if (sourceLevel < targetLevel) {
        sourceNode.upDeg++;
        targetNode.downDeg++;
        downDegSum++;
        downDegList[targetLevel] += 1;
        // console.log(downDegList)
        if (!downCntList.hasOwnProperty(targetLevel)) {
          downCntList[targetLevel] = {};
        }
        downCntList[targetLevel][targetNode.id] = 1;
      } else if (sourceLevel === targetLevel && sourceNode.id < targetNode.id) {
        sourceNode.horizontalDeg++;
        targetNode.horizontalDeg++;
      } else {
        console.log('E: still have reversed edges')
        continue;
      }

      tempLink.relVal = 2;
      tempLink.defaultRelVal = 2;
      tempLink.keepVis = true;
      if (sourceLevel === targetLevel) {
        tempLink.layerInduce = true;
      } else {
        tempLink.layerInduce = false;
      }
      keepNodeDict[sourceNode.id] = 1;
      keepNodeDict[targetNode.id] = 1;

      // if (spanCondition) {
      //   tempLink.color = '#FF00FF'
      //   tempLink.defaultColor = '#FF00FF'

      // } else {

      tempLink.color = d3.rgb(...interpolateLinearly(curve(localDataSet.forkFragInfo[sourceNode.wave][sourceNode.frag].density, colorFactor), grey2red).map(x => x * 255))
      tempLink.defaultColor = d3.rgb(...interpolateLinearly(curve(localDataSet.forkFragInfo[sourceNode.wave][sourceNode.frag].density, colorFactor), grey2red).map(x => x * 255))

      // }

      links.push(tempLink);
    }

    for (const tempNode of Object.values(localDataSet.idx2node)) {
      const level = getNodeLevel(tempNode, localDataSet.wf2level);
      if (!(keepNodeDict.hasOwnProperty(tempNode.id) || (level >= focusBottom && level <= focusTop) )) {
        continue;
      }
      const distParaScale = UIInfo.local.distPara * GRAPH_VIS.stretch.vertical / GRAPH_VIS.stretch.verticalDefault
      if (level <= focusBottom) {
        tempNode.fy = level * distParaScale * GRAPH_VIS.stretch.below / GRAPH_VIS.stretch.belowDefault;
      } else if (level <= focusTop + 1) {
        tempNode.fy = focusBottom * distParaScale * GRAPH_VIS.stretch.below / GRAPH_VIS.stretch.belowDefault + (level - focusBottom) * distParaScale * GRAPH_VIS.stretch.current / GRAPH_VIS.stretch.currentDefault;
      } else {
        tempNode.fy = focusBottom * distParaScale * GRAPH_VIS.stretch.below / GRAPH_VIS.stretch.belowDefault + (focusTop + 1 - focusBottom) * distParaScale * GRAPH_VIS.stretch.current / GRAPH_VIS.stretch.currentDefault + (level - focusTop - 1) * distParaScale * GRAPH_VIS.stretch.above / GRAPH_VIS.stretch.aboveDefault;
      }

      tempNode.relVal = 10 * tempNode.degree / GRAPH_SEARCH.vis.nodeSizePara;
      tempNode.defaultRelVal = 10 * tempNode.degree / GRAPH_SEARCH.vis.nodeSizePara;
      tempNode.color = '#FFFFFF';
      tempNode.defaultColor = '#FFFFFF';
      tempNode.keepVis = true;
      nodes.push(tempNode);
    };

    const highDownCumLevelNodeListSliceFlat = processDownDeg('downDegCum', downDegCumSum, downDegCumList, downCntCumList, 'down-degree-list-cumulative', 'Labels for Top Cumulative In-degree Vertices (Cumulative Local Influencers)')
    const highDownLevelNodeListSliceFlat = processDownDeg('downDeg', downDegSum, downDegList, downCntList, 'down-degree-list-noncumulative', 'Labels for Top Non-cumulative In-degree Vertices (Non-umulative Local Influencers)')

    localDataSet.highDownCumLevelNodeListSliceFlat = highDownCumLevelNodeListSliceFlat;
    localDataSet.highDownLevelNodeListSliceFlat = highDownLevelNodeListSliceFlat;

    // TODO: when filter, also pink all the fragments
    d3.selectAll(".forkFragHighLightExtra").attr("visibility", "hidden");
    // console.log(localDataSet.level2wf[filterLevel])
    // console.log(focusTop)
    // console.log(localDataSet.level2wf)
    for (let tempColorLevel = focusBottom; tempColorLevel <= focusTop; tempColorLevel ++) {
      d3.select(`#forkFragHighLightExtra_${localDataSet.level2wf[tempColorLevel][0]}_${localDataSet.level2wf[tempColorLevel][1]}`).attr("visibility", "visible");
    }
  }

  $('#local-graph-description-connect').css('display', 'none')

  return [nodes, links]
}

function processDownDeg(downProp, downDegSum, downDegList, downCntList, downListElemId, downListTitle) {
  const downDegLevelAveList = [];
  let downCntSum = 0;
  let emptyLevelCnt = 0;
  for (const idx in downDegList) {
    const downDegLevel = downDegList[idx];
    if (downDegLevel === 0) {
      emptyLevelCnt++;
      continue;
    }

    const downCntLevel = Object.keys(downCntList[idx]).length;
    downCntSum += downCntLevel;
    downDegLevelAveList.push([downDegLevel / downCntLevel, parseInt(idx)]);
  }

  const downDegAve = downDegSum / downCntSum;
  const highDownLevelList = downDegLevelAveList.filter(d => d[0] >= downDegAve).sort((a, b) => b[0] - a[0]);

  const highDownLevelNodeListFull = [];
  const highDownLevelNodeListSlice = [];
  const highDownLevelNodeListSliceFlat = [];
  let fragCnt = 0;
  for (const [downDegLevelAve, level] of highDownLevelList) {
    const levelNodeIdxList = Object.keys(downCntList[level]);
    // console.log(level)
    // console.log(levelNodeIdxList)
    const highDownNodeList = levelNodeIdxList.map(d => localDataSet.idx2node[d]).filter(d => d[downProp] >= downDegLevelAve).sort((a, b) => b[downProp] - a[downProp]);
    // console.log(highDownNodeList);
    highDownLevelNodeListFull.push(...highDownNodeList);
    highDownLevelNodeListSlice.push([highDownNodeList.slice(0, 1 + Math.floor(Math.log2(levelNodeIdxList.length))), level, downDegAve]);
    if (fragCnt >= 1 + Math.floor(Math.log2(localDataSet.maxLevel - emptyLevelCnt))) {
      continue;
    }
    highDownLevelNodeListSliceFlat.push(...highDownNodeList.slice(0, 1 + Math.floor(Math.log2(levelNodeIdxList.length))));
    fragCnt++;
  }
  // console.log(highDownLevelNodeListSlice)
  // console.log(highDownLevelNodeListSliceFlat)

  const downList = document.getElementById(downListElemId);
  downList.innerHTML = ''

  const downListTitleSpan = document.createElement('span');
  downList.appendChild(downListTitleSpan);

  downListTitleSpan.innerText = `${downListTitle} (${downDegAve.toExponential(2)}) in top-${1 + Math.floor(Math.log2(localDataSet.maxLevel - emptyLevelCnt))} fragments:\n`
  downListTitleSpan.onclick = function () {
    console.log(highDownLevelNodeListSliceFlat)
    const idSet = new Set(highDownLevelNodeListSliceFlat.map(d => d.id))
    markSearchNode(idSet);
    markSearchInduceLink();

    // const markCondition = node => idSet.has(node.id);
    // markNode(localDataSet.idx2node, markCondition, markDownDegNode, clearDownDegNode);
    // markLink(localDataSet.st2link, markLinkCondition, markDownDegLink, clearDownDegLink);
    // if (localDataSet.metaReady) {
    //   const markMetaCondition = node => Object.values(node.idx2node).some(d => d.highDownRes);
    //   markNode(localDataSet.idx2metaNode, markMetaCondition, markDownDegNode, clearDownDegNode);
    //   markLink(localDataSet.st2metaLink, markLinkCondition, markDownDegLink, clearDownDegLink);
    // }

    localGraph.nodeVal(node => node.relVal)
      // .nodeColor(node => node.color)
      .linkWidth(link => link.relVal)
      .linkColor(link => link.color)

    scaleNode();
    scaleLink();

    d3.selectAll(".forkFragHighLightExtra").attr("visibility", "hidden");
    for (const node of highDownLevelNodeListSliceFlat) {
      // console.log(`${node.wave}_${node.frag}`)
      d3.select(`#forkFragHighLightExtra_${node.wave}_${node.frag}`).attr("visibility", "visible");
    }
  }

  //TODO: add function to show all highdown search

  for (const dList of highDownLevelNodeListSlice.slice(0, 1 + Math.floor(Math.log2(localDataSet.maxLevel - emptyLevelCnt)))) {
    const fragPara = document.createElement('p');
    downList.appendChild(fragPara);

    const fragIdSpan = document.createElement('span');
    fragPara.appendChild(fragIdSpan);

    fragIdSpan.innerText = `W${localDataSet.level2wf[dList[1]][0]}fr${localDataSet.level2wf[dList[1]][1] + 1}: `
    fragIdSpan.onclick = function () {
      const idSet = new Set(dList[0].map(d => d.id))
      markSearchNode(idSet);
      markSearchInduceLink();

      localGraph.nodeVal(node => node.relVal)
        // .nodeColor(node => node.color)
        .linkWidth(link => link.relVal)
        .linkColor(link => link.color)

      scaleNode();
      scaleLink();

      d3.selectAll(".forkFragHighLightExtra").attr("visibility", "hidden");
      for (const node of dList[0]) {
        d3.select(`#forkFragHighLightExtra_${node.wave}_${node.frag}`).attr("visibility", "visible");
      }
    }

    let initFlag = true;
    for (const highDownNode of dList[0]) {
      // highDownNode.color = zoomScaleColor
      // highDownNode.defaultColor = zoomScaleColor

      if (initFlag) {
        initFlag = false
      } else {
        const separatorSpan = document.createElement('span');
        separatorSpan.innerText = ' | ';
        fragPara.appendChild(separatorSpan);
      }
      const nodeLabelSpan = document.createElement('span');
      nodeLabelSpan.innerText = `${highDownNode.label}`
      fragPara.appendChild(nodeLabelSpan);
      nodeLabelSpan.onclick = function () {
        const idSet = new Set([highDownNode.id])
        markSearchNode(idSet);
        markSearchInduceLink();

        localGraph.nodeVal(node => node.relVal)
          // .nodeColor(node => node.color)
          .linkWidth(link => link.relVal)
          .linkColor(link => link.color)
        // if (GRAPH_META.showMeta) {
        //   localGraph.cameraPosition({ x: highDownNode.metaNode.x, y: highDownNode.metaNode.y + 100, z: highDownNode.metaNode.z - 300 }, { x: highDownNode.metaNode.x, y: highDownNode.metaNode.y, z: highDownNode.metaNode.z })
        // }
        // localGraph.cameraPosition({ x: highDownNode.x, y: highDownNode.y + 100, z: highDownNode.z - 300 }, { x: highDownNode.x, y: highDownNode.y, z: highDownNode.z })
        // localGraph.zoomToFit(0, 10, node => node.id === highDownNode.id);

        scaleNode();
        scaleLink();

        d3.selectAll(".forkFragHighLightExtra").attr("visibility", "hidden");
        d3.select(`#forkFragHighLightExtra_${highDownNode.wave}_${highDownNode.frag}`).attr("visibility", "visible");
      }
    }
  }
  return highDownLevelNodeListSliceFlat
}

function filterMetaGraph(focusTop, focusBottom, spanTop, spanBottom, induceTop, induceBottom, jumpTop, jumpBottom, backTop, backBottom, showall, showConnectJump) {
  filterGraph(focusTop, focusBottom, spanTop, spanBottom, induceTop, induceBottom, jumpTop, jumpBottom, backTop, backBottom, showall);

  const nodes = [];
  const links = [];

  const colorFactor = dataSet.buckNodes.map(d => d['density']).reduce((prev, current) => prev + current) / dataSet.buckNodes.length;

  if (showall == null || showall == undefined) {
    showall = false;
  }
  if (showConnectJump == null || showall == undefined) {
    showConnectJump = false;
  }

  if (UIInfo.local.cloneFlag) {
    // do sth
  } else {
    for (const tempNode of Object.values(localDataSet.idx2metaNode)) {
      if (!tempNode.hasOwnProperty('vertices')) {
        tempNode.vertices = Object.values(tempNode.idx2node).length;
      }
      if (!tempNode.hasOwnProperty('edges')) {
        tempNode.edges = Object.values(tempNode.st2link).length;
        if (tempNode.edges === 0) {
          tempNode.edgeType = 0;
        } else if (tempNode.edges === 1) {
          tempNode.edgeType = 1;
        } else {
          tempNode.edgeType = -1;
        }
      }
      tempNode.highDownDegCnt = 0;
      tempNode.highDownDegCumCnt = 0;
    }

    const keepNodeDict = {};

    for (const tempLink of Object.values(localDataSet.st2metaLink)) {
      if (tempLink.reversed) {
        tempLink.keepVis = false
        continue;
      }

      const [sourceNode, targetNode] = getSTNodeFromLink(tempLink, localDataSet.idx2metaNode);

      const sourceLevel = getNodeLevel(sourceNode, localDataSet.wf2level);
      const targetLevel = getNodeLevel(targetNode, localDataSet.wf2level);

      if (sourceLevel > focusTop || sourceLevel < focusBottom) {
        tempLink.keepVis = false
        continue;
      }

      const spanRangeCondition = (sourceLevel <= spanTop) && (sourceLevel >= spanBottom);
      const spanCondition = (targetLevel === sourceLevel + 1);
      const induceRangeCondition = (sourceLevel <= induceTop) && (sourceLevel >= induceBottom);
      const induceCondition = (targetLevel === sourceLevel);
      const jumpRangeCondition = (sourceLevel <= jumpTop) && (sourceLevel >= jumpBottom);
      const jumpCondition = (targetLevel > sourceLevel + 1);
      const backRangeCondition = (targetLevel <= backTop) && (targetLevel >= backBottom);
      const backCondition = (targetLevel > sourceLevel);

      if (!showall && !((spanRangeCondition && spanCondition) || (induceRangeCondition && induceCondition) || (jumpRangeCondition && jumpCondition) || (backRangeCondition && backCondition))) {
        if (showConnectJump && tempLink.connectJumpRes) {
          // keep this edge
          // console.log('here')
        } else {
          tempLink.keepVis = false;
          tempLink.filterRes = false;
          continue;
        }
      }

      tempLink.filterRes = true;

      tempLink.keepVis = true;
      keepNodeDict[sourceNode.id] = 1;
      keepNodeDict[targetNode.id] = 1;

      if (tempLink.defaultReady) {
        // nothing todo
      } else {
        tempLink.relVal = Math.log1p(Object.values(tempLink.st2link).length);
        tempLink.defaultRelVal = Math.log1p(Object.values(tempLink.st2link).length);
        if (sourceLevel === targetLevel) {
          tempLink.layerInduce = true;
        } else {
          tempLink.layerInduce = false;
        }
        tempLink.color = d3.rgb(...interpolateLinearly(curve(localDataSet.forkFragInfo[sourceNode.wave][sourceNode.frag].density, colorFactor), grey2red).map(x => x * 255))
        tempLink.defaultColor = d3.rgb(...interpolateLinearly(curve(localDataSet.forkFragInfo[sourceNode.wave][sourceNode.frag].density, colorFactor), grey2red).map(x => x * 255))

        tempLink.defaultReady = true;
      }


      links.push(tempLink);
    }

    for (const tempNode of Object.values(localDataSet.idx2metaNode)) {
      const level = getNodeLevel(tempNode, localDataSet.wf2level);
      if (!(keepNodeDict.hasOwnProperty(tempNode.id) || (level >= focusBottom && level <= focusTop) )) {
        continue;
      }
      const distParaScale = UIInfo.local.distPara * GRAPH_VIS.stretch.vertical / GRAPH_VIS.stretch.verticalDefault
      if (level <= focusBottom) {
        tempNode.fy = level * distParaScale * GRAPH_VIS.stretch.below / GRAPH_VIS.stretch.belowDefault;
      } else if (level <= focusTop + 1) {
        tempNode.fy = focusBottom * distParaScale * GRAPH_VIS.stretch.below / GRAPH_VIS.stretch.belowDefault + (level - focusBottom) * distParaScale * GRAPH_VIS.stretch.current / GRAPH_VIS.stretch.currentDefault;
      } else {
        tempNode.fy = focusBottom * distParaScale * GRAPH_VIS.stretch.below / GRAPH_VIS.stretch.belowDefault + (focusTop + 1 - focusBottom) * distParaScale * GRAPH_VIS.stretch.current / GRAPH_VIS.stretch.currentDefault + (level - focusTop - 1) * distParaScale * GRAPH_VIS.stretch.above / GRAPH_VIS.stretch.aboveDefault;
      }

      tempNode.keepVis = true;
      if (tempNode.defaultReady) {
        // nothing to do
      } else {
        tempNode.relVal = tempNode.edgeType === 0 ? 10 * Math.log1p(1 / GRAPH_SEARCH.vis.nodeSizePara) : 10 * Math.log1p(tempNode.edges / GRAPH_SEARCH.vis.nodeSizePara);
        tempNode.defaultRelVal = tempNode.edgeType === 0 ? 10 * Math.log1p(1 / GRAPH_SEARCH.vis.nodeSizePara) : 10 * Math.log1p(tempNode.edges / GRAPH_SEARCH.vis.nodeSizePara);
        tempNode.color = '#FFFFFF';
        tempNode.defaultColor = '#FFFFFF';
        tempNode.defaultReady = true;
      }
      nodes.push(tempNode);
    };
  }

  for (const tempNode of localDataSet.highDownLevelNodeListSliceFlat) {
    tempNode.metaNode.highDownDegCnt++;
  }
  for (const tempNode of localDataSet.highDownCumLevelNodeListSliceFlat) {
    tempNode.metaNode.highDownDegCumCnt++;
  }

  if (showConnectJump) {
    $('#local-graph-description-connect').css('display', 'inline')
  } else {
    $('#local-graph-description-connect').css('display', 'none')
  }
  return [nodes, links];
}

function growSubFrag() {
  // console.log('here')
  if (localGraph) {
    const step = Math.round(SUB_CONTROL.fragGrow.step);
    const level = Math.floor(step / UIInfo.right.stepPerFrag);
    const subStep = step % UIInfo.right.stepPerFrag;
    if (subStep === 0) {
      SUB_THRESH.focus.top = level;
      SUB_THRESH.induce.top = level;
      SUB_THRESH.span.top = level;
      SUB_THRESH.jump.top = level;
      SUB_THRESH.back.top = level;
      SUB_THRESH.span.bottom = 0;
      SUB_THRESH.jump.bottom = level;
      SUB_THRESH.back.bottom = level + 1;
    } else if (subStep === 1) {
      SUB_THRESH.focus.top = level;
      SUB_THRESH.induce.top = level;
      SUB_THRESH.span.top = level;
      SUB_THRESH.jump.top = level;
      SUB_THRESH.back.top = level;
      SUB_THRESH.span.bottom = 0;
      SUB_THRESH.jump.bottom = level;
      SUB_THRESH.back.bottom = level;
    } else if (subStep === 2) {
      SUB_THRESH.focus.top = level;
      SUB_THRESH.induce.top = level;
      SUB_THRESH.span.top = level;
      SUB_THRESH.jump.top = level;
      SUB_THRESH.back.top = level;
      SUB_THRESH.span.bottom = 0;
      SUB_THRESH.jump.bottom = level + 1;
      SUB_THRESH.back.bottom = level + 1;
    }
    // console.log(level, subStep);
    subGUI.updateDisplay();
    updateSubGraphLevel();
  }
}

function growSubFragInc() {
  SUB_CONTROL.fragGrow.playFlag = false;
  SUB_CONTROL.fragGrow.step++;
  if (SUB_CONTROL.fragGrow.step > SUB_CONTROL.fragGrow.maxStep) {
    SUB_CONTROL.fragGrow.step = SUB_CONTROL.fragGrow.maxStep;
  }
  subGUI.updateDisplay();
  growSubFrag();
}

function growSubFragDec() {
  SUB_CONTROL.fragGrow.playFlag = false;
  SUB_CONTROL.fragGrow.step--;
  if (SUB_CONTROL.fragGrow.step < SUB_CONTROL.fragGrow.minStep) {
    SUB_CONTROL.fragGrow.step = SUB_CONTROL.fragGrow.minStep;
  }
  subGUI.updateDisplay();
  growSubFrag();
}

function updateGrowSubFragPlay() {
  if (SUB_CONTROL.fragGrow.step === SUB_CONTROL.fragGrow.maxStep) {
    return;
  }
  if (!SUB_CONTROL.fragGrow.playFlag) {
    return;
  }
  SUB_CONTROL.fragGrow.step++;
  subGUI.updateDisplay();
  growSubFrag();
  setTimeout(updateGrowSubFragPlay, SUB_CONTROL.fragGrow.timePerStep);
}

function growSubFragPlay() {
  SUB_CONTROL.fragGrow.step = 0;
  subGUI.updateDisplay();
  growSubFrag();

  SUB_CONTROL.fragGrow.playFlag = true;
  setTimeout(updateGrowSubFragPlay, SUB_CONTROL.fragGrow.timePerStep);
  rotateCamera()
}

function growSubFragPauseResume() {
  if (SUB_CONTROL.fragGrow.playFlag) {
    SUB_CONTROL.fragGrow.playFlag = false;
  } else {
    SUB_CONTROL.fragGrow.playFlag = true;
    subGUI.updateDisplay();
    growFrag();

    setTimeout(updateGrowSubFragPlay, SUB_CONTROL.fragGrow.timePerStep);
    rotateCamera()
  }
}

function updateSubGraphLevel() {
  // console.log(Graph)
  if (localSubGraph) {
    const [nodes, links] = filterSubGraph(SUB_THRESH.focus.top, SUB_THRESH.focus.bottom, SUB_THRESH.span.top, SUB_THRESH.span.bottom, SUB_THRESH.induce.top, SUB_THRESH.induce.bottom, SUB_THRESH.jump.top, SUB_THRESH.jump.bottom, SUB_THRESH.back.top, SUB_THRESH.back.bottom);
    // console.log(nodes, links)
    localSubGraph.graphData({ nodes: nodes, links: links });
  }
  // console.log('here')
  // console.log(GRAPH_GUI.jump.top)
}

function filterSubGraph(focusTop, focusBottom, spanTop, spanBottom, induceTop, induceBottom, jumpTop, jumpBottom, backTop, backBottom, showall) {
  const nodes = [];
  const links = [];

  // const colorFactor = dataSet.buckNodes.map(d => d['density']).reduce((prev, current) => prev + current) / dataSet.buckNodes.length;

  if (showall == null || showall == undefined) {
    showall = false;
  }

  if (UIInfo.localSub.cloneFlag) {
    // do sth
  } else {
    // for (const tempNode of Object.values(localDataSet.idx2node)) {
    //   tempNode.downDeg = 0;
    //   tempNode.upDeg = 0;
    //   tempNode.horizontalDeg = 0;
    //   tempNode.downDegCum = 0;
    //   tempNode.upDegCum = 0;
    // }

    const keepNodeDict = {};
    // let downDegSum = 0;
    // const downDegList = new Array(localDataSet.maxLevel + 1).fill(0);
    // // console.log(localDataSet.maxLevel+1)
    // const downCntList = {};
    // let downDegCumSum = 0;
    // const downDegCumList = new Array(localDataSet.maxLevel + 1).fill(0);
    // const downCntCumList = {};

    for (const tempLink of Object.values(localSubDataSet.st2link)) {
      if (tempLink.reversed) {
        continue;
      }

      let [sourceNode, targetNode] = getSTNodeFromLink(tempLink, localSubDataSet.idx2node);

      let sourceLevel = sourceNode.searchStep;
      let targetLevel = targetNode.searchStep;
      // console.log(sourceLevel, targetLevel)

      if (sourceLevel > targetLevel) {
        [sourceNode, targetNode] = [targetNode, sourceNode];
        [sourceLevel, targetLevel] = [targetLevel, sourceLevel];
      }

      if (sourceLevel > focusTop || sourceLevel < focusBottom) {
        continue;
      }

      // if (sourceLevel < targetLevel) {
      //   sourceNode.upDegCum++;
      //   targetNode.downDegCum++;
      //   downDegCumSum++;
      //   downDegCumList[targetLevel] += 1;
      //   if (!downCntCumList.hasOwnProperty(targetLevel)) {
      //     downCntCumList[targetLevel] = {};
      //   }
      //   downCntCumList[targetLevel][targetNode.id] = 1;
      // }

      const spanRangeCondition = (sourceLevel <= spanTop) && (sourceLevel >= spanBottom);
      const spanCondition = (targetLevel === sourceLevel + 1);
      const induceRangeCondition = (sourceLevel <= induceTop) && (sourceLevel >= induceBottom);
      const induceCondition = (targetLevel === sourceLevel);
      const jumpRangeCondition = (sourceLevel <= jumpTop) && (sourceLevel >= jumpBottom);
      const jumpCondition = (targetLevel > sourceLevel + 1);
      const backRangeCondition = (targetLevel <= backTop) && (targetLevel >= backBottom);
      const backCondition = (targetLevel > sourceLevel);

      if (!showall && !((spanRangeCondition && spanCondition) || (induceRangeCondition && induceCondition) || (jumpRangeCondition && jumpCondition) || (backRangeCondition && backCondition))) {
        continue;
      }

      // if (sourceLevel < targetLevel) {
      //   sourceNode.upDeg++;
      //   targetNode.downDeg++;
      //   downDegSum++;
      //   downDegList[targetLevel] += 1;
      //   // console.log(downDegList)
      //   if (!downCntList.hasOwnProperty(targetLevel)) {
      //     downCntList[targetLevel] = {};
      //   }
      //   downCntList[targetLevel][targetNode.id] = 1;
      // } else if (sourceLevel === targetLevel && sourceNode.id < targetNode.id) {
      //   sourceNode.horizontalDeg++;
      //   targetNode.horizontalDeg++;
      // } else {
      //   console.log('E: still have reversed edges')
      //   continue;
      // }

      // tempLink.relVal = 2;
      // tempLink.defaultRelVal = 2;
      tempLink.keepVis = true;
      // if (sourceLevel === targetLevel) {
      //   tempLink.layerInduce = true;
      // } else {
      //   tempLink.layerInduce = false;
      // }
      keepNodeDict[sourceNode.id] = 1;
      keepNodeDict[targetNode.id] = 1;

      // tempLink.color = d3.rgb(...interpolateLinearly(curve(localDataSet.forkFragInfo[sourceNode.wave][sourceNode.frag].density, colorFactor), grey2red).map(x => x * 255))
      // tempLink.defaultColor = d3.rgb(...interpolateLinearly(curve(localDataSet.forkFragInfo[sourceNode.wave][sourceNode.frag].density, colorFactor), grey2red).map(x => x * 255))

      links.push(tempLink);
    }

    for (const tempNode of Object.values(localSubDataSet.idx2node)) {
      if (!keepNodeDict.hasOwnProperty(tempNode.id)) {
        continue;
      }
      const level = tempNode.searchStep;
      const distParaScale = UIInfo.localSub.distPara * SUB_VIS.stretch.vertical / SUB_VIS.stretch.verticalDefault
      if (level <= focusBottom) {
        tempNode.fy = level * distParaScale * SUB_VIS.stretch.below / SUB_VIS.stretch.belowDefault;
      } else if (level <= focusTop + 1) {
        tempNode.fy = focusBottom * distParaScale * SUB_VIS.stretch.below / SUB_VIS.stretch.belowDefault + (level - focusBottom) * distParaScale * SUB_VIS.stretch.current / SUB_VIS.stretch.currentDefault;
      } else {
        tempNode.fy = focusBottom * distParaScale * SUB_VIS.stretch.below / SUB_VIS.stretch.belowDefault + (focusTop + 1 - focusBottom) * distParaScale * SUB_VIS.stretch.current / SUB_VIS.stretch.currentDefault + (level - focusTop - 1) * distParaScale * SUB_VIS.stretch.above / SUB_VIS.stretch.aboveDefault;
      }
      tempNode.fx = undefined;
      tempNode.fz = undefined;

      // tempNode.relVal = 10 * tempNode.degree / GRAPH_SEARCH.vis.nodeSizePara;
      // tempNode.defaultRelVal = 10 * tempNode.degree / GRAPH_SEARCH.vis.nodeSizePara;
      // tempNode.color = '#FFFFFF';
      // tempNode.defaultColor = '#FFFFFF';
      tempNode.keepVis = true;
      nodes.push(tempNode);
    };

    // const highDownCumLevelNodeListSliceFlat = processDownDeg('downDegCum', downDegCumSum, downDegCumList, downCntCumList, 'down-degree-list-cumulative', 'Labels for Top Cumulative In-degree Vertices (Cumulative Local Influencers)')
    // const highDownLevelNodeListSliceFlat = processDownDeg('downDeg', downDegSum, downDegList, downCntList, 'down-degree-list-noncumulative', 'Labels for Top Non-cumulative In-degree Vertices (Non-umulative Local Influencers)')

    // localDataSet.highDownCumLevelNodeListSliceFlat = highDownCumLevelNodeListSliceFlat;
    // localDataSet.highDownLevelNodeListSliceFlat = highDownLevelNodeListSliceFlat;

    // d3.selectAll(".forkFragHighLightExtra").attr("visibility", "hidden");
    // // console.log(localDataSet.level2wf[filterLevel])
    // d3.select(`#forkFragHighLightExtra_${localDataSet.level2wf[focusTop][0]}_${localDataSet.level2wf[focusTop][1]}`).attr("visibility", "visible");

  }
  return [nodes, links]
}

function showSearch() {
  // console.log('here')
  const key = GRAPH_SEARCH.search.key;
  let resCnt = 0;
  // console.log(key)
  if (key === '') {
    // console.log('clear')
    clearSearch(true);
  } else {
    GRAPH_SEARCH.flag.showRes = true;
    // console.log('here')
    resCnt = findNode(key, GRAPH_SEARCH.search.cumulativeSearch);
    // localGraph.zoomToFit(0, 10, node => node.searchRes);
  }
  scaleNode();
  opacityLink();
  return resCnt;
}

// function showSearchCum() {
//   const key = GRAPH_SEARCH.search.key;
//   if (key === '') {
//     // clearSearch();
//   } else {
//     GRAPH_SEARCH.flag.showRes = true;
//     findNode(key, true);
//     // localGraph.zoomToFit(0, 10, node => node.searchRes);
//   }
//   scaleNode();
//   opacityLink();
// }

function clearSearch(reset) {
  if (reset == null || reset == undefined) {
    reset = false
  }
  // for (const [label, node] of Object.entries(localDataSet.label2node)) {
  //   // node.searchRes = false;
  // }
  GRAPH_SEARCH.flag.showRes = false;
  GRAPH_SEARCH.label.history = [];
  GRAPH_SEARCH.label.historyMeta = [];
  GRAPH_SEARCH.label.tempStep = 0;

  document.getElementById('local-label-container').innerHTML = ''
  $('#expand-step').text(GRAPH_SEARCH.label.tempStep);
  $('#right-extend-step-slider').slider('option', 'max', GRAPH_SEARCH.label.tempStep);
  $('#right-extend-step-slider').slider('option', 'value', GRAPH_SEARCH.label.tempStep);


  const clear = d => {
    // console.log('clear')
    d.color = d.defaultColor;
    d.relVal = d.defaultRelVal;
    d.keepVis = true;
    d.searchRes = false;
    d.searched = false;
    d.searchStep = undefined;
    d.searchWeight = 0;
  }
  showSearchNode(clear, clear);
  showSearchLink(clear, clear);

  localGraph
    // .nodeColor(d => d.color)
    .linkColor(d => d.color)
    .nodeVisibility(d => d.keepVis)
    .linkVisibility(d => d.keepVis)
    .nodeVal(d => d.relVal)
    .linkWidth(d => d.relVal)

  scaleNode();
  scaleLink();

  if (reset) {
    spanningMetaConnectJump()
  }
}

function findNodeList(keyList, keepRes, findByID) {
  if (keepRes === null || keepRes === undefined) {
    keepRes = false;
  }
  if (findByID === null || findByID === undefined) {
    findByID = false;
  }
  for (const key of keyList) {
    findNode(key, keepRes, findByID)
    if (!keepRes) {
      keepRes = true;
    }
  }
}

function findNode(key, keepRes, findByID) {
  // console.log('here')
  if (keepRes === null || keepRes === undefined) {
    keepRes = false;
  }
  if (findByID === null || findByID === undefined) {
    findByID = false;
  }

  if (keepRes === false) {
    clearSearch()
  }

  const splitKeys = key.split(' ');

  let resCnt = 0

  // const nodeList = [];
  // console.log(localDataSet.label2node)
  // console.log('here')
  // console.log(localDataSet.idx2metaNode[18834].searchRes)
  for (const [label, node] of Object.entries(localDataSet.label2node)) {
    let condition;
    if (GRAPH_SEARCH.search.mode === 0) {
      condition = x => x.includes(key)
    } else if (GRAPH_SEARCH.search.mode === 1) {
      condition = x => splitKeys.every(d => x.includes(d));
    } else if (GRAPH_SEARCH.search.mode === 2) {
      condition = x => splitKeys.some(d => x.includes(d));
    }
    if (findByID ? node.id === key : condition(label)) {
      node.searchRes = true;
      node.searchWeight = 1;
      if (localDataSet.metaReady) {
        // console.log(localDataSet.idx2metaNode[18834].searchRes)
        node.metaNode.searchRes = true;
        node.metaNode.searchWeight = 1;
        // console.log(node.searchRes, node.metaNode.searchRes, label)
        // console.log(node)
        // console.log(localDataSet.idx2metaNode[18834].searchRes)
      }
      resCnt++;
      // console.log('here')
      // nodeList.push(node);
      // node.keepVis = true;
    } else {
      if (keepRes) {

      } else {
        node.searchRes = false;
      }
      // node.keepVis = true
    }
  }
  // console.log(localDataSet.idx2metaNode[18834].searchRes)

  showSearchNode();
  markSearchTouchLink(false);
  showSearchLink(link => link.keepVis = true, link => link.keepVis = false);

  // console.log(localDataSet.idx2metaNode[18834].searchRes)

  localGraph
    // .nodeColor(d => d.color)
    .linkColor(d => d.color)
    .nodeVisibility(d => d.keepVis)
    .linkVisibility(d => d.keepVis)
    .nodeVal(d => d.relVal)
    .linkWidth(d => d.relVal)

  scaleNode();
  scaleLink();

  if (GRAPH_META.showMeta) {
    const nodeList = Object.values(localDataSet.idx2metaNode).filter(d => d.searchRes)
    addRightLabels('search results', nodeList, false);
  } else {
    const nodeList = Object.values(localDataSet.idx2node).filter(d => d.searchRes)
    addRightLabels('search results', nodeList, false);
  }


  // if (localGraph) {
  //   localGraph.linkVisibility(d => d.keepVis)
  //     .nodeVisibility(d => d.keepVis)
  // }
  return resCnt
}


function getCCMetaDAG(idx2node, st2link, wf2level) {
  // console.log(idx2node, st2link, wf2level)

  for (const tempNode of Object.values(idx2node)) {
    tempNode.dsInfo = DS.makeSet();
    tempNode.dsInfo.nodeInfo = tempNode;
  }

  for (const tempLink of Object.values(st2link)) {
    if (tempLink.reversed) {
      continue;
    }
    const [srcNode, tgtNode] = getSTNodeFromLink(tempLink, idx2node);
    const srcLevel = getNodeLevel(srcNode, wf2level);
    const tgtLevel = getNodeLevel(tgtNode, wf2level);

    if (srcLevel === tgtLevel) {
      DS.union(srcNode.dsInfo, tgtNode.dsInfo);
    };
  }

  const idx2metaNode = {};
  const st2metaLink = {};

  for (const [stKey, tempLink] of Object.entries(st2link)) {
    if (tempLink.reversed) {
      continue;
    }
    const [srcNode, tgtNode] = getSTNodeFromLink(tempLink, idx2node);
    // const srcLevel = getNodeLevel(srcNode, wf2level);
    // const tgtLevel = getNodeLevel(tgtNode, wf2level);

    const srcMetaRepr = DS.find(srcNode.dsInfo).nodeInfo;
    const tgtMetaRepr = DS.find(tgtNode.dsInfo).nodeInfo;

    const srcMetaIdx = srcMetaRepr.id;
    const tgtMetaIdx = tgtMetaRepr.id;

    if (!idx2metaNode.hasOwnProperty(srcMetaIdx)) {
      const metaNode = {
        id: srcMetaIdx,
        wave: srcMetaRepr.wave,
        frag: srcMetaRepr.frag,
        degree: 0,
        idx2node: {},
        st2link: {},
        keepVis: true,
        neighborList: [],
        revNeighborList: [],
        adjLinkList: []
      }
      idx2metaNode[srcMetaIdx] = metaNode;
    }
    if (!idx2metaNode.hasOwnProperty(tgtMetaIdx)) {
      const metaNode = {
        id: tgtMetaIdx,
        wave: tgtMetaRepr.wave,
        frag: tgtMetaRepr.frag,
        degree: 0,
        idx2node: {},
        st2link: {},
        keepVis: true,
        neighborList: [],
        revNeighborList: [],
        adjLinkList: []
      }
      idx2metaNode[tgtMetaIdx] = metaNode;
    }

    srcNode.metaNode = idx2metaNode[srcMetaIdx];
    tgtNode.metaNode = idx2metaNode[tgtMetaIdx];

    idx2metaNode[srcMetaIdx].idx2node[srcNode.id] = srcNode;
    idx2metaNode[tgtMetaIdx].idx2node[tgtNode.id] = tgtNode;

    if (srcMetaIdx === tgtMetaIdx) {
      idx2metaNode[srcMetaIdx].st2link[stKey] = tempLink;
    } else {
      const stMetaKey = `${srcMetaIdx}-${tgtMetaIdx}`;
      if (!st2metaLink.hasOwnProperty(stMetaKey)) {
        const metaLink = {
          source: srcMetaIdx,
          target: tgtMetaIdx,
          reversed: false,
          st2link: {},
          keepVis: true,
        }
        st2metaLink[stMetaKey] = metaLink;
        idx2metaNode[srcMetaIdx].adjLinkList.push(metaLink);
        idx2metaNode[tgtMetaIdx].adjLinkList.push(metaLink);
      }
      st2metaLink[stMetaKey].st2link[stKey] = tempLink;
      idx2metaNode[srcMetaIdx].neighborList.push(idx2metaNode[tgtMetaIdx]);
      idx2metaNode[tgtMetaIdx].revNeighborList.push(idx2metaNode[srcMetaIdx]);

      idx2metaNode[srcMetaIdx].degree++;
      idx2metaNode[tgtMetaIdx].degree++;
    }
  }

  return [idx2metaNode, st2metaLink];
}

function markSearchNode(idSet, showRes) {
  if (showRes === null || showRes === undefined) {
    showRes = true;
  }
  clearSearch();
  markNode(localDataSet.idx2node, node => idSet.has(node.id), node => node.searchRes = true, node => node.searchRes = false);
  if (localDataSet.metaReady) {
    markNode(localDataSet.idx2metaNode, node => Object.values(node.idx2node).some(d => d.searchRes), node => node.searchRes = true, node => node.searchRes = false);
  }
  if (showRes) {
    showSearchNode();
  }

}

function switchLocalMeta() {
  if (!localDataSet.metaReady) {
    const [idx2metaNode, st2metaLink] = getCCMetaDAG(localDataSet.idx2node, localDataSet.st2link, localDataSet.wf2level);
    localDataSet.idx2metaNode = idx2metaNode;
    localDataSet.st2metaLink = st2metaLink;
    localDataSet.metaReady = true;
    console.log(idx2metaNode)
    naturalFragmentWeight(localDataSet.idx2metaNode, localDataSet.wf2level)
    document.getElementById('local-info').innerHTML += `, <span id="local-info-meta-size">${Object.values(idx2metaNode).length}|MetaV|, ${Object.values(st2metaLink).length}|MetaE|</span>, ${Math.max(...Object.values(idx2metaNode).map(d => Object.values(d.idx2node).length))}maxVinMetaV, ${Math.max(...Object.values(idx2metaNode).map(d => Object.values(d.st2link).length))}maxEinMetaV, ${Math.max(...Object.values(st2metaLink).map(d => Object.values(d.st2link).length))}maxEinMetaE`
    console.log(document.getElementById('local-info').innerText)
    console.log(localDataSet.metaReady)
  }

  if (GRAPH_META.showMeta) {
    filterLocalGraph()
    localGraph.linkLabel(link => `w.Deg${Object.values(link.st2link).length}<br>${Object.values(link.st2link).map(d => getSTNodeFromLink(d, localDataSet.idx2node).map(v => v.label).join(' -- ')).join('<br>')}`)
      .nodeLabel(node => `Wave${node.wave} Frag${node.frag + 1}<br>${node.vertices}V ${node.edges}E<br>w.Deg${node.degree}<br>${Object.values(node.idx2node).map(d => d.label).join('<br>')}`)

    $('#local-graph-description-meta').css('display', 'inline')
    $('#local-graph-description-raw').css('display', 'none')
    $('#local-info-meta-size').css('text-decoration-line', 'underline').css('color', '#FF00FF')
    $('#local-info-raw-size').css('text-decoration-line', 'none').css('color', '#FFFFFF')
  } else {
    filterLocalGraph()
    localGraph.linkLabel(null)
      .nodeLabel(node => `Wave${node.wave} Frag${node.frag + 1}<br>Deg${node.degree}<br>${node.label}`)

    $('#local-graph-description-meta').css('display', 'none')
    $('#local-graph-description-raw').css('display', 'inline')
    $('#local-info-meta-size').css('text-decoration-line', 'none').css('color', '#FFFFFF')
    $('#local-info-raw-size').css('text-decoration-line', 'underline').css('color', '#FF00FF')
    showNaturalWeight(localDataSet.idx2node)
  }

  const gettempNodeLabel = (d) => `${d.label}, DWDeg ${d.downDegCum}`

  if (GRAPH_META.showMeta) {
    document.getElementById('local-label-container').innerText = GRAPH_SEARCH.label.historyMeta.map((d, idx) => `Expansion-${idx}\n${d.sort((a, b) => b.downDegCum - a.downDegCum).map(d => gettempNodeLabel(d)).join(' | ')}`).join('\n\n')
  } else {
    document.getElementById('local-label-container').innerText = GRAPH_SEARCH.label.history.map((d, idx) => `Expansion-${idx}\n${d.sort((a, b) => b.downDegCum - a.downDegCum).map(d => gettempNodeLabel(d)).join(' | ')}`).join('\n\n')
  }

  $('#meta-filter-checkbox').prop('checked', GRAPH_META.showMeta)
}

function prepareLongestPath() {
  GRAPH_META.showMeta = true;
  switchLocalMeta()
  graphGUI.updateDisplay();
  const [longestSrc, longestSize, tsLv2nodeList, stLv2nodeList] = dagLongestPath(localDataSet.idx2metaNode, localDataSet.st2metaLink);
  localDataSet.tsLv2nodeList = tsLv2nodeList;
  localDataSet.stLv2nodeList = stLv2nodeList;


  let expansionCnt = 0;

  clearSearch();
  markNode(localDataSet.idx2metaNode, node => node.longestRes, node => node.searchRes = true, node => node.searchRes = false);
  // markLink(localDataSet.st2metaLink, link => link.longestRes, link => link.searchRes = true, link => link.searchRes = false);
  markSearchTouchLink(false);

  // const [label, metaLabel] = getSearchResLabel();
  // console.log(metaLabel)
  while (true) {
    markSearchBoundary()
    const [label, metaLabel] = getSearchResLabel();
    // console.log(metaLabel)
    if (metaLabel.length === 0) {
      break;
    }
    expansionCnt++;
    markSearchTouchLink(false);
    if (expansionCnt > Object.values(localDataSet.idx2metaNode).length) {
      console.log('E: DAG expansionCnt too large')
      break
    }
  }
  clearSearch();

  let tgtWideList, srcWideList;
  let tgtWidth = -1;
  let srcWidth = -1;
  for (const [tsLv, tgtList] of Object.entries(tsLv2nodeList)) {
    if (tgtList.length > tgtWidth) {
      tgtWidth = tgtList.length;
      tgtWideList = tgtList;
      localDataSet.tsLvWidest = parseInt(tsLv);
    }
  }
  for (const [stLv, srcList] of Object.entries(stLv2nodeList)) {
    if (srcList.length > srcWidth) {
      srcWidth = srcList.length;
      srcWideList = srcList;
      localDataSet.stLvWidest = parseInt(stLv);
    }
  }

  markNode(localDataSet.idx2metaNode, node => node.longestInfo.revDist === localDataSet.stLvWidest, node => {
    node.stWidestRes = true;
  }, node => {
    node.stWidestRes = false;
  });

  markNode(localDataSet.idx2metaNode, node => node.longestInfo.dist === localDataSet.stLvWidest, node => {
    node.tsWidestRes = true;
  }, node => {
    node.tsWidestRes = false;
  });
  // console.log(tsLv2nodeList, stLv2nodeList)
  // console.log(tgtWideList, srcWideList)
  // console.log(tgtWideList.length, srcWideList.length)
  let srcWidthDesc = `↑${srcWidth}`;
  let tgtWidthDesc = `↓${tgtWidth}`;
  localDataSet.srcWidthLarger = srcWidth - tgtWidth;
  if (localDataSet.srcWidthLarger >= 0) {
    srcWidthDesc = `<b>${srcWidthDesc}</b>`
  }
  if (localDataSet.srcWidthLarger <= 0) {
    tgtWidthDesc = `<b>${tgtWidthDesc}</b>`
  }

  document.getElementById('local-info').innerHTML += `, ${longestSize}height, ${srcWidthDesc}width${tgtWidthDesc}width, ${expansionCnt}expansion`
  localDataSet.metaLongestReady = true;
}

function showWideList(keepRes) {
  if (!localDataSet.metaLongestReady) {
    prepareLongestPath();
  }

  if (keepRes === null || keepRes === undefined) {
    keepRes = false;
  }
  if (keepRes === false) {
    clearSearch()
  }

  if (localDataSet.srcWidthLarger >= 0) {
    markNode(localDataSet.idx2metaNode, node => node.longestInfo.revDist === localDataSet.stLvWidest, node => {
      node.searchRes = true;
      node.searchWeight = 1;
    }, () => { });
  }
  if (localDataSet.srcWidthLarger <= 0) {
    markNode(localDataSet.idx2metaNode, node => node.longestInfo.revDist === localDataSet.tsLvWidest, node => {
      node.searchRes = true;
      node.searchWeight = 1;
    }, () => { });
  }

  showSearchNode();
  markSearchInduceLink();
  markSearchTouchLink(false);
  showSearchLink(link => link.keepVis = true, link => link.keepVis = false);

  localGraph
    // .nodeColor(d => d.color)
    .linkColor(d => d.color)
    .nodeVisibility(d => d.keepVis)
    .linkVisibility(d => d.keepVis)
    .nodeVal(d => d.relVal)
    .linkWidth(d => d.relVal)

  scaleNode();
  scaleLink();

  if (GRAPH_META.showMeta) {
    const nodeList = Object.values(localDataSet.idx2metaNode).filter(d => d.searchRes)
    addRightLabels('search results', nodeList, false);
  } else {
    const nodeList = Object.values(localDataSet.idx2node).filter(d => d.searchRes)
    addRightLabels('search results', nodeList, false);
  }
}

function showLongestPath(keepRes) {
  if (!localDataSet.metaLongestReady) {
    prepareLongestPath();
  }

  if (keepRes === null || keepRes === undefined) {
    keepRes = false;
  }
  if (keepRes === false) {
    clearSearch()
  }

  markNode(localDataSet.idx2metaNode, node => node.longestRes, node => {
    node.searchRes = true;
    node.searchWeight = 1;
  }, () => { });
  markNode(localDataSet.idx2node, node => node.metaNode.searchRes, node => {
    node.searchRes = true;
    node.searchWeight = 1;
  }, () => { });
  showSearchNode();

  markLink(localDataSet.st2metaLink, link => link.longestRes, link => link.searchRes = true, link => link.searchRes = false);
  showSearchLink();
  markSearchTouchLink(false);
  showSearchLink(link => link.keepVis = true, link => link.keepVis = false);


  localGraph
    // .nodeColor(d => d.color)
    .linkColor(d => d.color)
    .nodeVisibility(d => d.keepVis)
    .linkVisibility(d => d.keepVis)
    .nodeVal(d => d.relVal)
    .linkWidth(d => d.relVal)

  scaleNode();
  scaleLink();

  if (GRAPH_META.showMeta) {
    const nodeList = Object.values(localDataSet.idx2metaNode).filter(d => d.searchRes)
    addRightLabels('search results', nodeList, false);
  } else {
    const nodeList = Object.values(localDataSet.idx2node).filter(d => d.searchRes)
    addRightLabels('search results', nodeList, false);
  }
}

function showHighDownNodes(keepRes) {
  if (keepRes === null || keepRes === undefined) {
    keepRes = false;
  }
  if (keepRes === false) {
    clearSearch()
  }
  // console.log('here')
  const idSet = new Set(localDataSet.highDownCumLevelNodeListSliceFlat.map(d => d.id));
  console.log(idSet)
  markNode(localDataSet.idx2node, node => idSet.has(node.id), node => {
    node.searchRes = true;
    node.searchWeight = 1;
  }, () => { });
  if (localDataSet.metaReady) {
    markNode(localDataSet.idx2metaNode, node => Object.values(node.idx2node).some(d => d.searchRes), node => {
      node.searchRes = true;
      node.searchWeight = 1;
    }, () => { });
  }
  showSearchNode();
  markSearchInduceLink();
  markSearchTouchLink(false);
  showSearchLink(link => link.keepVis = true, link => link.keepVis = false);

  localGraph
    // .nodeColor(d => d.color)
    .linkColor(d => d.color)
    .nodeVisibility(d => d.keepVis)
    .linkVisibility(d => d.keepVis)
    .nodeVal(d => d.relVal)
    .linkWidth(d => d.relVal)

  scaleNode();
  scaleLink();

  if (GRAPH_META.showMeta) {
    const nodeList = Object.values(localDataSet.idx2metaNode).filter(d => d.searchRes)
    addRightLabels('search results', nodeList, false);
  } else {
    const nodeList = Object.values(localDataSet.idx2node).filter(d => d.searchRes)
    addRightLabels('search results', nodeList, false);
  }
}

function showFragment(wave, frag) {
  clearSearch()

  markNode(localDataSet.idx2node, node => node.wave === wave && node.frag === frag, node => node.searchRes = true, () => { });
  markLink(localDataSet.st2link, link => {
    if (link.reversed) {
      return false;
    }
    const srcNode = getSTNodeFromLink(link, localDataSet.idx2node)[0];
    return srcNode.wave === wave && srcNode.frag === frag;
  }, link => link.searchRes = true, () => { })
  if (localDataSet.metaReady) {
    markNode(localDataSet.idx2metaNode, node => Object.values(node.idx2node).some(d => d.searchRes), node => node.searchRes = true, () => { });
    markLink(localDataSet.st2metaLink, link => {
      if (link.reversed) {
        return false;
      }
      const srcNode = getSTNodeFromLink(link, localDataSet.idx2metaNode)[0];
      return srcNode.wave === wave && srcNode.frag === frag;
    }, link => link.searchRes = true, () => { })
  }
  showSearchNode();
  showSearchLink();

  localGraph
    // .nodeColor(d => d.color)
    .linkColor(d => d.color)
    .nodeVisibility(d => d.keepVis)
    .linkVisibility(d => d.keepVis)
    .nodeVal(d => d.relVal)
    .linkWidth(d => d.relVal)

  scaleNode();
  scaleLink();
}

function markSearchTouchLink(showRes) {
  if (showRes === null || showRes === undefined) {
    showRes = true;
  }
  markLink(localDataSet.st2link, link => getSTNodeFromLink(link, localDataSet.idx2node).some(d => d.searchRes), link => link.searchRes = true, link => link.searchRes = false);
  if (localDataSet.metaReady) {
    markLink(localDataSet.st2metaLink, link => getSTNodeFromLink(link, localDataSet.idx2metaNode).some(d => d.searchRes), link => link.searchRes = true, link => link.searchRes = false);
  }
  if (showRes) {
    showSearchLink();
  }
}

function markSearchInduceLink(showRes) {
  if (showRes === null || showRes === undefined) {
    showRes = true;
  }
  markLink(localDataSet.st2link, link => getSTNodeFromLink(link, localDataSet.idx2node).every(d => d.searchRes), link => link.searchRes = true, link => link.searchRes = false);
  if (localDataSet.metaReady) {
    markLink(localDataSet.st2metaLink, link => getSTNodeFromLink(link, localDataSet.idx2metaNode).every(d => d.searchRes), link => link.searchRes = true, link => link.searchRes = false);
  }
  if (showRes) {
    showSearchLink();
  }
}

function showSearchNode(mark, clear) {
  if (mark === undefined) {
    mark = (d, maxWeight) => {
      const searchColor = GRAPH_SEARCH.vis.searchColor;
      const searchedColor = GRAPH_SEARCH.vis.searchedColor;
      const searchScale = GRAPH_SEARCH.vis.searchScale;
      // d.relVal = Math.max(10, d.defaultRelVal * searchScale) * d.searchWeight;
      if (d.searchRes) {
        // d.color = searchColor;
        d.color = maxWeight === 0 ? '#FFFFFF' : d3.rgb(...interpolateLinearly(d.searchWeight / maxWeight, grey2red).map(x => x * 255))
        d.relVal = d.defaultRelVal * d.searchWeight;
      } else if (d.searched) {
        d.color = searchedColor;
        d.relVal = d.defaultRelVal * d.searchWeight;
      } else {
        d.relVal = d.defaultRelVal * d.searchWeight;
        d.color = d.defaultColor;
      }
    }
  }
  if (clear === undefined) {
    clear = d => {
      d.relVal = d.defaultRelVal;
      d.color = d.defaultColor;
    }
  }
  const maxWeight = d3.max(Object.values(localDataSet.idx2node), d => d.searchWeight);
  const maxMetaWeight = d3.max(Object.values(localDataSet.idx2metaNode), d => d.searchWeight);

  markNode(localDataSet.idx2node, node => node.searchRes || node.searched, d => mark(d, maxWeight), clear);
  if (localDataSet.metaReady) {
    markNode(localDataSet.idx2metaNode, node => node.searchRes || node.searched, d => mark(d, maxMetaWeight), clear);
  }

  const [history, historyMeta] = getSearchResLabel();
  if (history.length !== 0) {
    GRAPH_SEARCH.label.history.push(history);
  }
  if (historyMeta.length !== 0) {
    GRAPH_SEARCH.label.historyMeta.push(historyMeta);
  }

  const gettempNodeLabel = (d) => `${d.label}, DWDeg ${d.downDegCum}`

  if (GRAPH_META.showMeta) {
    document.getElementById('local-label-container').innerText = GRAPH_SEARCH.label.historyMeta.map((d, idx) => `Expansion-${idx}\n${d.sort((a, b) => b.downDegCum - a.downDegCum).map(d => gettempNodeLabel(d)).join(' | ')}`).join('\n\n')
  } else {
    document.getElementById('local-label-container').innerText = GRAPH_SEARCH.label.history.map((d, idx) => `Expansion-${idx}\n${d.sort((a, b) => b.downDegCum - a.downDegCum).map(d => gettempNodeLabel(d)).join(' | ')}`).join('\n\n')
  }
}

function showSearchLink(mark, clear) {
  if (mark === undefined) {
    mark = d => {
      const searchColor = GRAPH_SEARCH.vis.searchColor;
      const searchedColor = GRAPH_SEARCH.vis.searchedColor;
      const searchScale = GRAPH_SEARCH.vis.searchScale;
      d.relVal = Math.max(10, d.defaultRelVal * searchScale);
      if (d.searchRes) {
        d.color = searchColor;
        d.relVal = Math.max(10, d.defaultRelVal * searchScale);
      } else if (d.searched) {
        d.color = searchedColor;
        d.relVal = d.defaultRelVal;
      } else {
        d.relVal = d.defaultRelVal;
        d.color = d.defaultColor;
      }
    }
  }
  if (clear === undefined) {
    clear = d => {
      d.relVal = d.defaultRelVal;
      d.color = d.defaultColor;
    }
  }
  markLink(localDataSet.st2link, link => link.searchRes || link.searched, mark, clear);
  if (localDataSet.metaReady) {
    markLink(localDataSet.st2metaLink, link => link.searchRes || link.searched, mark, clear);
  }
}

function showSearchStep(step) {
  const searchColor = GRAPH_SEARCH.vis.searchColor;
  const searchedColor = GRAPH_SEARCH.vis.searchedColor;
  const searchScale = GRAPH_SEARCH.vis.searchScale;

  const maxWeight = d3.max(Object.values(localDataSet.idx2node), d => d.searchWeight);
  const maxMetaWeight = d3.max(Object.values(localDataSet.idx2metaNode), d => d.searchWeight);

  const mark = (d, maxWeight) => {
    // d.color = searchColor;
    d.color = d3.rgb(...interpolateLinearly(d.searchWeight / maxWeight, grey2red).map(x => x * 255))
    d.relVal = d.defaultRelVal * d.searchWeight
    // console.log(d.searchWeight, maxWeight, d.color)
    d.keepVis = true;
  }
  const clear = d => {
    d.color = searchedColor;
    d.relVal = d.defaultRelVal * d.searchWeight;
    d.keepVis = false;
  }

  const markSearchedLink = d => {
    d.relVal = Math.sqrt(GRAPH_SEARCH.vis.searchScale) * d.defaultRelVal;
    // console.log(d.relVal, d.defaultRelVal)
    d.keepVis = true;
  }
  const clearLink = d => {
    d.relVal = d.defaultRelVal;
    d.keepVis = false;
  }

  markNode(localDataSet.idx2node, d => d.searchStep === step, d => mark(d, maxWeight), clear);
  if (localDataSet.metaReady) {
    markNode(localDataSet.idx2metaNode, d => d.searchStep === step, d => mark(d, maxMetaWeight), clear);
  }

  markLink(localDataSet.st2link, d => d.searchStep === step + 1, markSearchedLink, clearLink);
  if (localDataSet.metaReady) {
    markLink(localDataSet.st2metaLink, d => d.searchStep === step + 1, markSearchedLink, clearLink);
  }

  localGraph
    // .nodeColor(d => d.color)
    .linkColor(d => d.color)
    .nodeVisibility(d => d.keepVis)
    .linkVisibility(d => d.keepVis)
    .nodeVal(d => d.relVal)
    .linkWidth(d => d.relVal)

  scaleNode();
  scaleLink();
}

function markSearchBoundary() {
  console.log(GRAPH_SEARCH.label.tempStep)

  let cutSize = 0;

  const recordSearch = d => {
    d.searched = true;
    d.searchRes = false;
    d.searchStep = GRAPH_SEARCH.label.tempStep;
    if (d.hasOwnProperty('adjLinkList')) {
      d.unSearchedNeighborCnt = d.neighborList.filter(v => !(v.searched || v.searchRes)).length + d.revNeighborList.filter(v => !(v.searched || v.searchRes)).length
    }
  }
  const getNewBoundary = (link, idx2node) => {
    if (link.searched) {
      return false
    } else if (link.searchRes) {
      const [srcNode, tgtNode] = getSTNodeFromLink(link, idx2node);
      if (srcNode.searched && !tgtNode.searched) {
        // console.log('tgt')
        tgtNode.searchRes = true;
        tgtNode.searchStep = GRAPH_SEARCH.label.tempStep;
        tgtNode.searchWeight += srcNode.searchWeight / srcNode.unSearchedNeighborCnt;
        cutSize++;
      } else if (!srcNode.searched && tgtNode.searched) {
        // console.log('src')
        srcNode.searchRes = true;
        srcNode.searchStep = GRAPH_SEARCH.label.tempStep;
        srcNode.searchWeight += tgtNode.searchWeight / tgtNode.unSearchedNeighborCnt;
        cutSize++;
      }
      link.relVal = Math.sqrt(GRAPH_SEARCH.vis.searchScale) * link.defaultRelVal;
      return true;
    } else {
      return false;
    }
  }
  markNode(localDataSet.idx2node, d => d.searchRes, recordSearch, () => { });
  if (localDataSet.metaReady) {
    markNode(localDataSet.idx2metaNode, d => d.searchRes, recordSearch, () => { });
  }

  GRAPH_SEARCH.label.tempStep++;

  markLink(localDataSet.st2link, link => getNewBoundary(link, localDataSet.idx2node), recordSearch, () => { });
  if (localDataSet.metaReady) {
    markLink(localDataSet.st2metaLink, link => getNewBoundary(link, localDataSet.idx2metaNode), recordSearch, () => { });
  }
  return cutSize;
}

function showSearchBoundary() {
  console.log('here')

  const cutSize = markSearchBoundary();

  showSearchNode();
  markSearchTouchLink(false);
  showSearchLink(link => link.keepVis = true, () => { });

  localGraph
    .nodeColor(d => d.color)
    .linkColor(d => d.color)
    .nodeVisibility(d => d.keepVis)
    .linkVisibility(d => d.keepVis)
    .nodeVal(d => d.relVal)
    .linkWidth(d => d.relVal)

  scaleNode();
  scaleLink();

  if (GRAPH_META.showMeta) {
    const searchedNodeList = Object.values(localDataSet.idx2metaNode)
      .filter(d => d.searchStep <= GRAPH_SEARCH.label.tempStep)
    addRightLabels(false, searchedNodeList, false);
  } else {
    const searchedNodeList = Object.values(localDataSet.idx2node)
      .filter(d => d.searchStep <= GRAPH_SEARCH.label.tempStep)
    addRightLabels(false, searchedNodeList, false);
  }

  return cutSize
}

function getSearchResLabel() {
  const lableList = []
  const lableListMeta = []
  if (GRAPH_META.showMeta) {
    for (const tempNode of Object.values(localDataSet.idx2metaNode)) {
      if (tempNode.searchRes) {
        // lableListMeta.push(...Object.values(tempNode.idx2node).map(d => d.label));
        lableListMeta.push(...Object.values(tempNode.idx2node));
      }
    }
  } else {
    lableListMeta.push('Null')
  }
  for (const tempNode of Object.values(localDataSet.idx2node)) {
    if (tempNode.searchRes) {
      // lableList.push(tempNode.label);
      lableList.push(tempNode);
    }
  }
  return [lableList, lableListMeta];
}

function dagLongestPath(idx2node, st2link) {
  for (const tempNode of Object.values(idx2node)) {
    tempNode.longestInfo = {};
    tempNode.longestInfo.visited = false;
    tempNode.longestInfo.dist = 0;
    tempNode.longestInfo.next = null;
    tempNode.longestInfo.revVisited = false;
    tempNode.longestInfo.revDist = 0;
    tempNode.longestInfo.prev = null;
    tempNode.longestRes = false;
  }
  for (const tempLink of Object.values(st2link)) {
    tempLink.longestRes = false;
  }

  function update(node) {
    node.longestInfo.visited = true;
    for (const neighbor of node.neighborList) {
      if (!neighbor.longestInfo.visited) {
        update(neighbor);
      }
      if (node.longestInfo.dist < 1 + neighbor.longestInfo.dist) {
        node.longestInfo.next = neighbor;
        node.longestInfo.dist = 1 + neighbor.longestInfo.dist;
      }
    }
  }

  function revUpdate(node) {
    node.longestInfo.revVisited = true;
    for (const neighbor of node.revNeighborList) {
      if (!neighbor.longestInfo.revVisited) {
        revUpdate(neighbor);
      }
      if (node.longestInfo.revDist < 1 + neighbor.longestInfo.revDist) {
        node.longestInfo.prev = neighbor;
        node.longestInfo.revDist = 1 + neighbor.longestInfo.revDist;
      }
    }
  }

  for (const tempNode of Object.values(idx2node)) {
    if (!tempNode.longestInfo.visited) {
      update(tempNode);
    }
    if (!tempNode.longestInfo.revVisited) {
      revUpdate(tempNode);
    }
  }

  let tempMaxDist = -1;
  let tempSource;
  for (const tempNode of Object.values(idx2node)) {
    if (tempMaxDist < tempNode.longestInfo.dist) {
      tempSource = tempNode;
      tempMaxDist = tempNode.longestInfo.dist;
    }
  }

  console.log(tempMaxDist)

  const tsLv2nodeList = {};
  const stLv2nodeList = {};
  for (const tempNode of Object.values(idx2node)) {
    if (!tsLv2nodeList.hasOwnProperty(tempNode.longestInfo.dist)) {
      tsLv2nodeList[tempNode.longestInfo.dist] = [];
    }
    if (!stLv2nodeList.hasOwnProperty(tempNode.longestInfo.revDist)) {
      stLv2nodeList[tempNode.longestInfo.revDist] = [];
    }
    tsLv2nodeList[tempNode.longestInfo.dist].push(tempNode);
    stLv2nodeList[tempNode.longestInfo.revDist].push(tempNode);
  }

  let tempNode = tempSource;
  while (tempNode.longestInfo.next != null) {
    tempNode.longestRes = true;
    st2link[`${tempNode.id}-${tempNode.longestInfo.next.id}`].longestRes = true;
    // console.log(`${tempNode.id}-${tempNode.longestInfo.next.id}`)
    tempNode = tempNode.longestInfo.next;
  }
  tempNode.longestRes = true;

  localDataSet.longestSource = tempSource;
  return [tempSource, tempMaxDist, tsLv2nodeList, stLv2nodeList];
}

function getSearchEdges(idx2node, st2link) {
  console.log(GRAPH_SEARCH.label.tempStep)
  const idx2nodeSub = {};
  const st2linkSub = {};
  for (const [st, tempLink] of Object.entries(st2link)) {
    if (tempLink.reversed) {
      continue;
    }
    if (!(tempLink.searchRes || tempLink.searched)) {
      continue;
    }
    const link = { ...tempLink }
    st2linkSub[st] = link;
    const [srcIdx, tgtIdx] = getSTIdxFromLink(link, idx2node);
    link.source = srcIdx;
    link.target = tgtIdx;
    if (!idx2nodeSub.hasOwnProperty(srcIdx)) {
      const tempNode = idx2node[srcIdx];
      const node = { ...tempNode };
      delete node.fy;
      if (!(node.searchRes || node.searched)) {
        node.searchStep = GRAPH_SEARCH.label.tempStep + 1;
      } else if (node.searchRes) {
        node.searchStep = GRAPH_SEARCH.label.tempStep
      }
      idx2nodeSub[srcIdx] = node;
    }
    if (!idx2nodeSub.hasOwnProperty(tgtIdx)) {
      const tempNode = idx2node[tgtIdx];
      const node = { ...tempNode };
      delete node.fy;
      if (!(node.searchRes || node.searched)) {
        node.searchStep = GRAPH_SEARCH.label.tempStep + 1;
      } else if (node.searchRes) {
        node.searchStep = GRAPH_SEARCH.label.tempStep
      }
      idx2nodeSub[tgtIdx] = node;
    }
  }
  return [idx2nodeSub, st2linkSub]
}

function getLocalPos() {
  console.log('here')
  if (!localSubGraph) {
    return;
  }
  let idx2nodeLocal, st2linkLocal;
  if (GRAPH_META.showMeta) {
    idx2nodeLocal = localDataSet.idx2metaNode;
    st2linkLocal = localDataSet.st2metaLink;
  } else {
    idx2nodeLocal = localDataSet.idx2node;
    st2linkLocal = localDataSet.st2link;
  }

  for (const [idx, tempNode] of Object.entries(localSubDataSet.idx2node)) {
    tempNode.fx = idx2nodeLocal[idx].x;
    tempNode.fy = idx2nodeLocal[idx].y;
    tempNode.fz = idx2nodeLocal[idx].z;
    // console.log(tempNode.fx)
  }

  localSubGraph.d3ReheatSimulation();
}

function getForceDirectedPos() {
  for (const [idx, tempNode] of Object.entries(localSubDataSet.idx2node)) {
    tempNode.fx = undefined;
    tempNode.fy = undefined;
    tempNode.fz = undefined;
  }
  localSubGraph.d3ReheatSimulation();
}

function getLayeredPos() {
  console.log('here')
  updateSubGraphLevel();
}


function extract() {
  if (GRAPH_META.showMeta) {
    return extractVisibleEdges(localDataSet.idx2metaNode, localDataSet.st2metaLink)
  } else {
    return extractVisibleEdges(localDataSet.idx2node, localDataSet.st2link)
  }
}

function extractVisibleEdges(idx2node, st2link) {
  console.log(GRAPH_SEARCH.label.tempStep)
  const idx2nodeSub = {};
  const st2linkSub = {};
  for (const [st, tempLink] of Object.entries(st2link)) {
    if (tempLink.reversed) {
      continue;
    }
    if (!(tempLink.keepVis && tempLink.filterRes)) {
      continue;
    }
    const link = { ...tempLink }
    st2linkSub[st] = link;
    const [srcIdx, tgtIdx] = getSTIdxFromLink(link, idx2node);
    link.source = srcIdx;
    link.target = tgtIdx;
    if (!idx2nodeSub.hasOwnProperty(srcIdx)) {
      const tempNode = idx2node[srcIdx];
      const node = { ...tempNode };
      delete node.fy;
      if (!(node.searchRes || node.searched)) {
        node.searchStep = GRAPH_SEARCH.label.tempStep + 1;
      } else if (node.searchRes) {
        node.searchStep = GRAPH_SEARCH.label.tempStep
      }
      idx2nodeSub[srcIdx] = node;
    }
    if (!idx2nodeSub.hasOwnProperty(tgtIdx)) {
      const tempNode = idx2node[tgtIdx];
      const node = { ...tempNode };
      delete node.fy;
      if (!(node.searchRes || node.searched)) {
        node.searchStep = GRAPH_SEARCH.label.tempStep + 1;
      } else if (node.searchRes) {
        node.searchStep = GRAPH_SEARCH.label.tempStep
      }
      idx2nodeSub[tgtIdx] = node;
    }
  }
  return [idx2nodeSub, st2linkSub]
}


function drawLocalSubGraph() {
  showLocalLocalSub();
  const [idx2nodeSub, st2linkSub] = extract();
  // if (GRAPH_META.showMeta) {
  //   [idx2nodeSub, st2linkSub] = getSearchEdges(localDataSet.idx2metaNode, localDataSet.st2metaLink)
  // } else {
  //   [idx2nodeSub, st2linkSub] = getSearchEdges(localDataSet.idx2node, localDataSet.st2link)
  // }
  localSubDataSet.showMeta = GRAPH_META.showMeta;

  localSubDataSet.idx2node = idx2nodeSub;
  localSubDataSet.st2link = st2linkSub;
  localSubDataSet.maxLayer = Math.max(...Object.values(idx2nodeSub).map(d => d.searchStep));

  updateSubGuiThreshold(localSubDataSet.maxLayer)

  const [nodes, links] = filterSubGraph(localSubDataSet.maxLayer, 0, localSubDataSet.maxLayer, 0, localSubDataSet.maxLayer, 0, localSubDataSet.maxLayer, 0, localSubDataSet.maxLayer, 0, true);

  // const nodes = Object.values(idx2nodeSub);
  // const links = Object.values(st2linkSub);
  // console.log(document.getElementById('global-graph-container').offsetWidth)
  localSubGraph = ForceGraph3D()
    (document.getElementById(`local-subgraph`))
    .graphData({ nodes: nodes, links: links })
    .backgroundColor('#222222')
    .width(document.getElementById('local-subgraph-container').offsetWidth)
    .height(document.getElementById('local-subgraph-container').offsetHeight)
    .showNavInfo(false)
    .nodeRelSize(4 / 16 * Math.pow(16, GRAPH_VIS.scale.node / GRAPH_VIS.scale.nodeDefault))
    .nodeVal(node => node.relVal)
    .nodeColor(node => node.color)
    .nodeOpacity(GRAPH_VIS.opacity.node / 100)
    .linkLabel(link => localSubDataSet.showMeta ? `w.Deg${Object.values(link.st2link).length}<br>${Object.values(link.st2link).map(d => getSTNodeFromLink(d, localDataSet.idx2node).map(v => v.label).join(' -- ')).join('<br>')}` : null)
    .nodeLabel(node => localSubDataSet.showMeta ? `Wave${node.wave} Frag${node.frag + 1} Step${node.searchStep}<br>${node.vertices}V ${node.edges}E<br>w.Deg${node.degree}<br>${Object.values(node.idx2node).map(d => d.label).join('<br>')}` : `Wave${node.wave} Frag${node.frag + 1} Step${node.searchStep}<br>Deg${node.degree}<br>${node.label}`)
    .linkWidth(link => link.relVal)
    .linkColor(link => link.color)
    .linkOpacity(GRAPH_VIS.opacity.link / 100)
    // .linkMaterial(link => new THREE.MeshLambertMaterial({color: link.color, transparent: true, opacity: (GRAPH_VIS.opacity.link / 100) * linkOpacityQueryScale(link)}))
    // .linkDirectionalParticles(link => link.longPath ? 2 : 0)
    // .linkDirectionalParticleWidth(link => link.relVal / 2)
    .linkVisibility(d => d.keepVis)
    .nodeVisibility(d => d.keepVis)
    .nodeThreeObject(d => localNodeGeom(d));



  localSubGraph.onNodeClick(node => {
    console.log(node)
    d3.selectAll(".forkFragHighLightExtra").attr("visibility", "hidden");
    d3.select(`#forkFragHighLightExtra_${node.wave}_${node.frag}`).attr("visibility", "visible");
  })
  localSubGraph.onLinkClick(link => {
    console.log(link)
  })

  setTimeout(() => {
    getLocalPos()
    setTimeout(() => {
      localSubGraph.zoomToFit(250, 10, node => true)
    }, 500)
  }, 500);
  // console.log(localSubGraph);

  UIInfo.layout.leftVis.dagGraph = 0;
  UIInfo.layout.leftVis.localSub = 1;

  // document.getElementById('3d-graph-0-container').style.visibility = 'hidden';
  // document.getElementById('menu-container').style.visibility = 'hidden';
  // document.getElementById('local-subgraph').style.visibility = 'visible';
  // document.getElementById('local-sub-menu-container').style.visibility = 'visible';

  // moveSeparaterMiddle();
}

function closeLocalSubGraph() {
  if (UIInfo.layout.leftVis.dagGraph === 1) {
    showGlobalLocal();
  } else {
    showLocalOnly();
  }
  // UIInfo.layout.leftVis.dagGraph = 1;
  UIInfo.layout.leftVis.localSub = 0;

  if (localSubGraph) {
    localSubGraph.graphData({ nodes: [], links: [] })
  }


  // document.getElementById('3d-graph-0-container').style.visibility = 'visible';
  // document.getElementById('menu-container').style.visibility = 'visible';
  // document.getElementById('local-subgraph').style.visibility = 'hidden';
  // document.getElementById('local-sub-menu-container').style.visibility = 'hidden';
  // moveSeparaterRight();

  $('#right-test-button-container').css('display', 'none')
  
}




function openStrata() {
  const [idx2nodeSub, st2linkSub] = extract();

  const strataLink = []
  const strataLabel = [{ source: 'new_id', target: 'name' }];

  for (const link of Object.values(st2linkSub)) {
    const [srcIdx, tgtIdx] = getSTIdxFromLink(link, idx2nodeSub);
    strataLink.push({ source: srcIdx, target: tgtIdx });
  }
  for (const node of Object.values(idx2nodeSub)) {
    strataLabel.push({ source: node.id, target: node.label });

    localDataSet.strataLink = strataLink;
    localDataSet.strataLabel = strataLabel;

  }

  sendToStrata(localDataSet.strataName + '_' + new Date().getTime(), localDataSet.strataLink, localDataSet.strataLabel);
}

function sendToStrata(filename, links, labels) {
  if (filename == null || filename == undefined) {
    filename = localDataSet.strataName;
  }
  if (links == null || links == undefined) {
    links = localDataSet.strataLink;
  }
  if (labels == null || labels == undefined) {
    labels = localDataSet.strataLabel;
  }

  setStrataUrl('?data=nodata')

  httpGetAsync(strataAddress + "query?type=setdatadir&file=./temp", function (res) {
    console.log(res);
  });

  const linkContent = JSON.stringify({
    filename: filename + ".csv",
    edges: links
  });
  const labelContent = JSON.stringify({
    filename: filename + "_labels.csv",
    edges: labels
  });

  httpPostAsync(linkContent, strataAddress + "save", function (res) {
    // console.log(res)
    // console.log(res.errno)
    if (res.errno == 0 || res.errno == -17) {
      httpPostAsync(labelContent, strataAddress + "save", function (res) {
        // console.log(res)
        // console.log(res.errno)
        if (res.errno == 0 || res.errno == -17) {
          // console.log("?dataPath=" + filename);
          // console.log(document.getElementById('strata').src);
          httpGetAsync(strataAddress + "query?type=add&file=" + filename + ".csv", function (res) {
            // console.log(res);
            setStrataUrl("?dataPath=" + filename + '&nodeColorProperty=waveLevel&heightProperty=waveLevel');
            // console.log(document.getElementById('strata').src);
            const bottom = document.getElementById("strata-container").offsetTop;
            window.scrollTo(0, bottom);
          });
        };
      });
    };
  });
}







function checkSpanningConnect() {
  for (const tempLink of Object.values(localDataSet.st2metaLink)) {
    if (tempLink.reversed) {
      continue;
    }
    const [srcMeta, tgtMeta] = getSTNodeFromLink(tempLink, localDataSet.idx2metaNode)
    if (!srcMeta.hasOwnProperty('spanDSInfo')) {
      srcMeta.spanDSInfo = DS.makeSet();
      srcMeta.spanDSInfo.nodeInfo = srcMeta;
      srcMeta.fullDSInfo = DS.makeSet();
      srcMeta.fullDSInfo.nodeInfo = srcMeta;
    }
    if (!tgtMeta.hasOwnProperty('spanDSInfo')) {
      tgtMeta.spanDSInfo = DS.makeSet();
      tgtMeta.spanDSInfo.nodeInfo = tgtMeta;
      tgtMeta.fullDSInfo = DS.makeSet();
      tgtMeta.fullDSInfo.nodeInfo = tgtMeta;
    }

    const srcMetaFullRepr = DS.find(srcMeta.fullDSInfo).nodeInfo;
    const tgtMetaFullRepr = DS.find(tgtMeta.fullDSInfo).nodeInfo;

    const srcMetaFullIdx = srcMetaFullRepr.id;
    const tgtMetaFullIdx = tgtMetaFullRepr.id;

    if (srcMetaFullIdx !== tgtMetaFullIdx) {
      DS.union(srcMetaFullRepr.fullDSInfo, tgtMetaFullRepr.fullDSInfo);
    }

    const srcLevel = getNodeLevel(srcMeta, localDataSet.wf2level);
    const tgtLevel = getNodeLevel(tgtMeta, localDataSet.wf2level);

    if (tgtLevel === srcLevel + 1 || tempLink.longestRes) {
      // // all longest path edges should be in the final connected graph
      const srcMetaSpanRepr = DS.find(srcMeta.spanDSInfo).nodeInfo;
      const tgtMetaSpanRepr = DS.find(tgtMeta.spanDSInfo).nodeInfo;

      const srcMetaSpanIdx = srcMetaSpanRepr.id;
      const tgtMetaSpanIdx = tgtMetaSpanRepr.id;

      if (srcMetaSpanIdx !== tgtMetaSpanIdx) {
        DS.union(srcMetaSpanRepr.spanDSInfo, tgtMetaSpanRepr.spanDSInfo);
      }
    }
  }

  for (const tempLink of Object.values(localDataSet.st2metaLink)) {
    if (tempLink.reversed) {
      continue;
    }
    if (tempLink.longestRes) {
      tempLink.connectJumpRes = true;
    } else {
      tempLink.connectJumpRes = false;
    }
    const [srcMeta, tgtMeta] = getSTNodeFromLink(tempLink, localDataSet.idx2metaNode)

    const srcLevel = getNodeLevel(srcMeta, localDataSet.wf2level);
    const tgtLevel = getNodeLevel(tgtMeta, localDataSet.wf2level);

    if (tgtLevel > srcLevel + 1) {
      const srcMetaSpanRepr = DS.find(srcMeta.spanDSInfo).nodeInfo;
      const tgtMetaSpanRepr = DS.find(tgtMeta.spanDSInfo).nodeInfo;

      const srcMetaSpanIdx = srcMetaSpanRepr.id;
      const tgtMetaSpanIdx = tgtMetaSpanRepr.id;

      if (srcMetaSpanIdx !== tgtMetaSpanIdx) {
        tempLink.connectJumpRes = true;
        DS.union(srcMetaSpanRepr.spanDSInfo, tgtMetaSpanRepr.spanDSInfo);
      }
    }
  }
  localDataSet.spanningConnectReady = true;
}


function spanningMetaConnectJump() {
  GRAPH_THRESH.focus.bottom = 0;
  GRAPH_THRESH.focus.top = localDataSet.maxLevel;
  GRAPH_THRESH.induce.bottom = 0;
  GRAPH_THRESH.induce.top = localDataSet.maxLevel;
  GRAPH_THRESH.span.bottom = 0;
  GRAPH_THRESH.span.top = localDataSet.maxLevel;
  GRAPH_THRESH.jump.bottom = 0;
  GRAPH_THRESH.jump.top = localDataSet.maxLevel;
  GRAPH_THRESH.back.bottom = 0;
  GRAPH_THRESH.back.top = localDataSet.maxLevel;

  $('#right-filter-slider').slider('option', 'values', [GRAPH_THRESH.jump.bottom, GRAPH_THRESH.jump.top]);
  $('#right-filter-induce-slider').slider('option', 'values', [GRAPH_THRESH.jump.bottom, GRAPH_THRESH.jump.top]);
  $('#right-filter-span-slider').slider('option', 'values', [GRAPH_THRESH.back.bottom, GRAPH_THRESH.back.top]);
  $('#right-filter-jump-slider').slider('option', 'values', [GRAPH_THRESH.jump.bottom, GRAPH_THRESH.jump.top]);
  $('#right-filter-back-slider').slider('option', 'values', [GRAPH_THRESH.back.bottom, GRAPH_THRESH.back.top]);

  GRAPH_META.showMeta = 1;
  switchLocalMeta();
  if (!localDataSet.metaLongestReady) {
    prepareLongestPath();
  }
  // GRAPH_VIS.spanOnly = 1;
  if (!localDataSet.spanningConnectReady) {
    checkSpanningConnect();
  }
  showSpanOnly(true);

  // console.log(localDataSet.idx2metaNode)

  markNode(localDataSet.idx2metaNode, node => true, node => {
    node.color = '#FFFFFF'
    node.relVal = node.defaultRelVal;
  }, () => { });

  markNode(localDataSet.idx2metaNode, node => node.longestInfo.revDist === localDataSet.stLvWidest, node => {
    node.color = '#FF00FF'
    node.relVal = node.defaultRelVal * 1;
  }, () => { });

  markNode(localDataSet.idx2metaNode, node => node.longestInfo.dist === localDataSet.stLvWidest, node => {
    node.color = '#FF00FF'
    node.relVal = node.defaultRelVal * 1;
  }, () => { });

  markNode(localDataSet.idx2metaNode, node => node.longestRes, node => {
    node.color = '#FF00FF'
    node.relVal = node.defaultRelVal * 1;
  }, () => { });
  // markNode(localDataSet.idx2node, node => node.metaNode.searchRes, node => node.searchRes = true, () => {});

  const highWeightNodeList = Object.values(localDataSet.idx2metaNode)
    // .sort((a, b) => (b.defaultRelVal * b.naturalWeight - a.defaultRelVal * a.naturalWeight))
    .sort((a, b) => (b.naturalWeight - a.naturalWeight))
    .slice(0, Math.ceil(Math.log2(1 + Object.values(localDataSet.idx2metaNode).length)))

  const maxWeight = highWeightNodeList[0].naturalWeight;
  highWeightNodeList.forEach(node => {
    node.color = maxWeight === 0 ? '#FFFFFF' : d3.rgb(...interpolateLinearly(node.naturalWeight / maxWeight, grey2red).map(x => x * 255))
    node.relVal = node.defaultRelVal * Math.cbrt(node.naturalWeight);
  })


  addRightLabels('high fragment derived weight', highWeightNodeList, false, localDataSet.strataName);

  console.log(highWeightNodeList.map(d => Object.values(d.idx2node).map(x => x.label).join(' | ')).join('\n'))

  markLink(localDataSet.st2metaLink, link => link.longestRes, link => link.searchRes = true, link => link.searchRes = false);
  showSearchLink();

  

  // markLink(localDataSet.st2metaLink, link => link.connectJumpRes && ! link.longestRes, link => link.color = 'FFFF00', () => {});

  // showNaturalWeight(localDataSet.idx2metaNode)

  scaleNode();
  scaleLink();
}

function addRightLabels(title, nodeList, sorted, localName) {
  if (title == null || title == undefined) {
    title = false
  }
  if (sorted == null || sorted == undefined) {
    sorted = false;
  }
  if (localName == null || localName == undefined) {
    localName = false;
  }
  if (!sorted) {
    nodeList.sort((a, b) => (b.relVal - a.relVal))
  }
  let labelsList = []
  if (GRAPH_META.showMeta) {
    labelsList = nodeList.map(d => Object.values(d.idx2node).map(x => x.label).join(' | '));
  } else {
    labelsList = nodeList.map(d => d.label);
  }

  console.log(labelsList)

  if (title) {
    $('#right-labels-title').html(title);
  }
  $('#right-labels').html(labelsList.join('\n'));

  if (localName){
    dataSet.highNaturalWeightLabels[localName] = labelsList.join('\n');
  }
}

function showNaturalWeight(idx2node) {
  const maxWeight = d3.max(Object.values(idx2node), d => d.naturalWeight);
  markNode(idx2node, node => true, node => {
    node.relVal = node.defaultRelVal * Math.cbrt(node.naturalWeight);
    node.color = maxWeight === 0 ? '#FFFFFF' : d3.rgb(...interpolateLinearly(node.naturalWeight / maxWeight, grey2red).map(x => x * 255))
  })
}

function showSearchWeight(idx2node) {
  const maxWeight = d3.max(Object.values(idx2node), d => d.searchWeight);
  markNode(idx2node, node => true, node => {
    node.relVal = node.defaultRelVal * node.searchWeight;
    node.color = maxWeight === 0 ? '#FFFFFF' : d3.rgb(...interpolateLinearly(node.searchWeight / maxWeight, grey2red).map(x => x * 255))
  })
}


function updateLocalFilterSlider() {
  $('#right-filter-slider').slider('option', 'min', 0);
  $('#right-filter-slider').slider('option', 'max', localDataSet.maxLevel);
  $('#right-filter-slider').slider('option', 'values', [GRAPH_THRESH.focus.bottom, GRAPH_THRESH.focus.top]);

  $('#right-filter-induce-slider').slider('option', 'min', 0);
  $('#right-filter-induce-slider').slider('option', 'max', localDataSet.maxLevel);
  $('#right-filter-induce-slider').slider('option', 'values', [GRAPH_THRESH.induce.bottom, GRAPH_THRESH.induce.top]);

  $('#right-filter-span-slider').slider('option', 'min', 0);
  $('#right-filter-span-slider').slider('option', 'max', localDataSet.maxLevel);
  $('#right-filter-span-slider').slider('option', 'values', [GRAPH_THRESH.span.bottom, GRAPH_THRESH.span.top]);

  $('#right-filter-jump-slider').slider('option', 'min', 0);
  $('#right-filter-jump-slider').slider('option', 'max', localDataSet.maxLevel);
  $('#right-filter-jump-slider').slider('option', 'values', [GRAPH_THRESH.jump.bottom, GRAPH_THRESH.jump.top]);

  $('#right-filter-back-slider').slider('option', 'min', 0);
  $('#right-filter-back-slider').slider('option', 'max', localDataSet.maxLevel);
  $('#right-filter-back-slider').slider('option', 'values', [GRAPH_THRESH.back.bottom, GRAPH_THRESH.back.top]);


  $('#right-paly-step-slider').slider('option', 'min', 0);
  $('#right-paly-step-slider').slider('option', 'max', UIInfo.right.play.stepPerFrag * localDataSet.maxLevel);
}

function disableJumpSlider() {
  $('#right-filter-jump-slider').slider('disable');
  $('#right-filter-jump-slider-checkbox').prop('checked', false)
  $('#right-filter-back-slider').slider('disable');
  $('#right-filter-back-slider-checkbox').prop('checked', false)
  $('#local-graph-description-spanning').css('display', 'inline')
}

function enableJumpSlider() {
  $('#right-filter-jump-slider').slider('enable');
  $('#right-filter-jump-slider-checkbox').prop('checked', true)
  $('#right-filter-back-slider').slider('enable');
  $('#right-filter-back-slider-checkbox').prop('checked', true)
  $('#right-filter-jump-slider').slider('option', 'values', [GRAPH_THRESH.jump.bottom, GRAPH_THRESH.jump.top]);
  $('#right-filter-back-slider').slider('option', 'values', [GRAPH_THRESH.back.bottom, GRAPH_THRESH.back.top]);
  $('#local-graph-description-spanning').css('display', 'none')
}

function filterLocalGraph(showConnectJump) {
  if (showConnectJump == null || showConnectJump == undefined) {
    showConnectJump = false;
  }
  let nodes, links;
  if (GRAPH_META.showMeta) {
    [nodes, links] = filterMetaGraph(GRAPH_THRESH.focus.top, GRAPH_THRESH.focus.bottom, GRAPH_THRESH.span.top, GRAPH_THRESH.span.bottom, GRAPH_THRESH.induce.top, GRAPH_THRESH.induce.bottom, GRAPH_THRESH.jump.top, GRAPH_THRESH.jump.bottom, GRAPH_THRESH.back.top, GRAPH_THRESH.back.bottom, false, showConnectJump);
    // console.log(nodes, links)
    // console.log(GRAPH_THRESH.focus.top, GRAPH_THRESH.focus.bottom, GRAPH_THRESH.span.top, GRAPH_THRESH.span.bottom, GRAPH_THRESH.induce.top, GRAPH_THRESH.induce.bottom, GRAPH_THRESH.jump.top, GRAPH_THRESH.jump.bottom, GRAPH_THRESH.back.top, GRAPH_THRESH.back.bottom, false, showConnectJump)
    localGraph.graphData({ nodes: nodes, links: links })
  } else {
    [nodes, links] = filterGraph(GRAPH_THRESH.focus.top, GRAPH_THRESH.focus.bottom, GRAPH_THRESH.span.top, GRAPH_THRESH.span.bottom, GRAPH_THRESH.induce.top, GRAPH_THRESH.induce.bottom, GRAPH_THRESH.jump.top, GRAPH_THRESH.jump.bottom, GRAPH_THRESH.back.top, GRAPH_THRESH.back.bottom);
    localGraph.graphData({ nodes: nodes, links: links })
  }

  let spanFlag;
  if (GRAPH_THRESH.jump.top >= GRAPH_THRESH.jump.bottom || GRAPH_THRESH.back.top >= GRAPH_THRESH.back.bottom) {
    $('#local-graph-description-spanning').css('display', 'none')
    spanFlag = false;
  } else {
    $('#local-graph-description-spanning').css('display', 'inline')
    spanFlag = true;
  }

  if ((GRAPH_THRESH.focus.top < localGraph.maxLevel || GRAPH_THRESH.focus.bottom > 0) || (GRAPH_THRESH.span.top < GRAPH_THRESH.focus.top || GRAPH_THRESH.span.bottom > GRAPH_THRESH.focus.bottom) || (GRAPH_THRESH.induce.top < GRAPH_THRESH.focus.top || GRAPH_THRESH.induce.bottom > GRAPH_THRESH.focus.bottom)) {
    $('#local-graph-description-filter').css('display', 'inline')
  } else {
    if (!spanFlag) {
      if ((GRAPH_THRESH.jump.top < GRAPH_THRESH.focus.top || GRAPH_THRESH.jump.bottom > GRAPH_THRESH.focus.bottom) && (GRAPH_THRESH.back.top < GRAPH_THRESH.focus.top || GRAPH_THRESH.back.bottom > GRAPH_THRESH.focus.bottom)) {
        // // NOTE: only jump AND back filtered, the graph is filtered
        $('#local-graph-description-filter').css('display', 'inline')
      } else {
        $('#local-graph-description-filter').css('display', 'none')
      }
    }
  }
  return [nodes, links]
}

function horizontalStretchStart() {
  // localGraph.d3AlphaDecay(0);
  // localGraph.d3VelocityDecay(0);
}

function horizontalStretch(scale) {
  localGraph.d3Force('charge').distanceMax(1000 * scale)
  localGraph.d3ReheatSimulation()
}

function horizontalStretchEnd() {
  // localGraph.d3AlphaDecay();
  // localGraph.d3VelocityDecay();
}

function horizontalStretchSub(scale) {
  localSubGraph.d3Force('charge').distanceMax(1000 * scale)
  localSubGraph.d3ReheatSimulation()
}

function resizeGraph() {
  if (dagGraph) {
    dagGraph.width(document.getElementById('global-graph-container').offsetWidth)
    dagGraph.zoomToFit()
  }
  if (localGraph) {
    localGraph.width(document.getElementById('local-graph-container').offsetWidth)
    localGraph.zoomToFit()
  }
  if (localSubGraph) {
    localSubGraph.width(document.getElementById('local-subgraph-container').offsetWidth)
    localSubGraph.zoomToFit()
  }
}


function localNodeGeom(node) {
  // console.log(node.color, new THREE.Color(node.color))
  // console.log(new THREE.MeshLambertMaterial({
  //   color: node.color,
  //   transparent: true,
  //   opacity: GRAPH_VIS.opacity.node / 100
  // }))
  const factor = 16
  const scaleFactor = 4 / factor * Math.pow(factor, GRAPH_VIS.scale.node / GRAPH_VIS.scale.nodeDefault)
  const sphereDefault = new THREE.Mesh(new THREE.SphereGeometry(node.defaultRelVal * scaleFactor), new THREE.MeshBasicMaterial({
    color: new THREE.Color(node.defaultColor),
    transparent: true,
    opacity: GRAPH_VIS.opacity.node / 100
  }));

  const sphere = new THREE.Mesh(new THREE.SphereGeometry(node.relVal * scaleFactor), new THREE.MeshLambertMaterial({
    color: new THREE.Color(d3.rgb(node.color).toString()),
    transparent: true,
    opacity: GRAPH_VIS.opacity.node / 100
  }));

  const retval = new THREE.Group();
  retval.add(sphereDefault);
  retval.add(sphere);

  if (node.stWidestRes) {
    const dir = new THREE.Vector3(0, 1, 0);
    const origin = new THREE.Vector3(0, Math.max(node.relVal, node.defaultRelVal) * scaleFactor, 0)
    const length = Math.max(node.relVal, node.defaultRelVal) * scaleFactor
    const hex = new THREE.Color(d3.rgb(node.color).toString()).getHex()
    const stArrow = new THREE.ArrowHelper(dir, origin, length, hex, 0.75 * length, 0.25 * length)
    // stArrow.line.material.linewidth = Math.sqrt(Math.max(node.relVal, node.defaultRelVal))
    retval.add(stArrow);
  }
  if (node.tsWidestRes) {
    const dir = new THREE.Vector3(0, -1, 0);
    const origin = new THREE.Vector3(0, -Math.max(node.relVal, node.defaultRelVal) * scaleFactor, 0)
    const length = Math.max(node.relVal, node.defaultRelVal) * scaleFactor
    const hex = new THREE.Color(d3.rgb(node.color).toString()).getHex()
    const tsArrow = new THREE.ArrowHelper(dir, origin, length, hex, 0.75 * length, 0.25 * length)
    // tsArrow.line.material.linewidth = Math.sqrt(Math.max(node.relVal, node.defaultRelVal))
    retval.add(tsArrow);
  }

  return retval;
}


function naturalFragmentWeight(idx2node, wf2level) {
  const wf2nodeList = {}
  for (const tempNode of Object.values(idx2node)) {
    const tempLevel = getNodeLevel(tempNode, wf2level)
    tempNode.naturalWeight = tempLevel === 0 ? 1 : 0;
    if (!wf2nodeList.hasOwnProperty(tempLevel)) {
      wf2nodeList[tempLevel] = []
    }
    wf2nodeList[tempLevel].push(tempNode);
  }
  for (const tempLevel of Object.keys(wf2nodeList).sort((a, b) => parseInt(a) - parseInt(b))) {
    for (const tempNode of wf2nodeList[tempLevel]) {
      for (const neighbor of tempNode.neighborList) {
        neighbor.naturalWeight += tempNode.naturalWeight / tempNode.neighborList.length;
      }
    }
  }
}


function showGlobalLocal() {
  GlobalLocal();
  $('#local-graph-container').css('width', '47%')
  resizeGraph()
  $('.bottom-separate-slider .global-graph-slider').css('width', '35%').css('left', '0%')
  $('.bottom-separate-slider .local-graph-slider').css('width', '35%').css('left', '60%')
  $('.bottom-separate-slider .bottom-slider-name').css('left', '1%')
  $('#bottom-slider-button-container').css('left', 'calc(50% - 100px)')

  UIInfo.layout.leftVis.dagGraph = 1;
  UIInfo.layout.leftVis.localSub = 0;
  $('#global-grpah-show-hide-button').html('hide meta-DAG')
  d3.selectAll(".spanningLine").attr("visibility", "hidden");
};

function showLocalLocalSub() {
  LocalLocalsub();
  $('#local-graph-container').css('width', '47%')
  resizeGraph()
  $('.bottom-separate-slider .local-graph-slider').css('width', '35%').css('left', '250px')
  $('.bottom-separate-slider .local-sub-graph-slider').css('width', '35%').css('left', '60%')
  $('.bottom-separate-slider .bottom-slider-name').css('left', '250px')
  $('#bottom-slider-button-container').css('left', '1%')

  UIInfo.layout.leftVis.dagGraph = 0;
  UIInfo.layout.leftVis.localSub = 1;
  $('#global-grpah-show-hide-button').html('show meta-DAG')
  d3.selectAll(".spanningLine").attr("visibility", "visible");

  $('#right-test-button-container').css('display', 'block')
};

function showLocalOnly() {
  LocalOnly();
  $('#local-graph-container').css('width', '90%')
  resizeGraph();
  $('.bottom-separate-slider .local-graph-slider').css('width', 'calc(100% - 250px)').css('left', '250px')
  $('.bottom-separate-slider .bottom-slider-name').css('left', '250px')
  $('#bottom-slider-button-container').css('left', '1%')

  UIInfo.layout.leftVis.dagGraph = 0;
  UIInfo.layout.leftVis.localSub = 1;
  $('#global-grpah-show-hide-button').html('show meta-DAG')
  d3.selectAll(".spanningLine").attr("visibility", "visible");
};


function resetAll() {

  dagControl.clicked = null;

  drawMap();
  preDraw();


  d3.selectAll(".spiralHighLight").attr("visibility", "hidden");
  d3.selectAll(".arcHighLight").attr("visibility", "hidden");


  if (forkSvg) {
    const forkWaveHighLight = forkSvg.selectAll(".forkWaveHighLight")
      .data([]);

    forkWaveHighLight.exit().remove();

    const forkWave2FragLine = forkSvg.selectAll(".forkWave2FragLine")
      .data([]);

    forkWave2FragLine.exit().remove();

    const forkFragHighLight = forkSvg.selectAll(".forkFragHighLight")
      .data([]);

    forkFragHighLight.exit().remove();

    const forkFragHighLightExtra = forkSvg.selectAll(".forkFragHighLightExtra")
      .data([]);

    forkFragHighLightExtra.exit().remove();

    const forkFragArrowText = forkSvg.selectAll(".forkFragArrowText")
    .data([]);
    
    forkFragArrowText.exit().remove();


    const forkWaveRect = forkSvg.selectAll(".forkWaveRect")
      .data([]);

    forkWaveRect.exit().remove();

    const forkWaveText = forkSvg.selectAll(".forkWaveText")
      .data([]);

    forkWaveText.exit().remove();

    const forkFragRect = forkSvg.selectAll(".forkFragRect")
      .data([]);

    forkFragRect.exit().remove();

    const forkFragText = forkSvg.selectAll(".forkFragText")
      .data([]);

    forkFragText.exit().remove();
  }


  if (localGraph) {
    localGraph.graphData({ nodes: [], links: [] })
    document.getElementById('local-info-container').style.visibility = 'hidden';
    document.getElementById('local-graph-navigation-info-container').style.visibility = 'hidden';
    document.getElementById('local-info').style.visibility = 'hidden';
    document.getElementById('local-menu-container').style.visibility = 'hidden';
    document.getElementById('down-degree-list-cumulative').style.visibility = 'hidden';
    document.getElementById('down-degree-list-noncumulative').style.visibility = 'hidden';
    document.getElementById('local-label-container').style.visibility = 'hidden';

    UIInfo.layout.localInfo.container = 0;
    UIInfo.layout.localInfo.cumulativeInfluencer = 0;
    UIInfo.layout.localInfo.noncumulativeInfluencer = 0;
    UIInfo.layout.localInfo.labelExpansion = 0;
  }

  $('#right-labels').html('')
  $('#right-labels-title').html('')

  if (localSubGraph) {
    closeLocalSubGraph();
  }

  showGlobalLocal();

  disableExpand()

}

// // main
$(function () {
  // // // init UI
  initUI();
  addTitle();

  // // init miniGraph
  Promise.all([
    d3.json(datasetName + '_miniGraph.json')
  ]).then(function (datas) {
    drawMiniGraph(datas)
  })

  Promise.all([
    d3.text(datasetName + ccName + '_info.txt')
  ]).then(function (datas) {
    const metaInfoData = datas[0];
    document.getElementById('top-info-container').innerHTML = metaInfoData;

    // let deg_img = document.createElement("img");
    // deg_img.src = datasetName + ccName + "_size_dist.png";
    // document.getElementById("info-plot-container").appendChild(deg_img);
  })

  // // init metaDag and grid map
  const dagTopoPromise = Promise.all([
    // d3.text(datasetName + ccName + '.cc-layers'),
    d3.text(datasetName + ccName + '-lccBuck.l-lcc-b-v-e.csv'),
    d3.text(datasetName + ccName + '-idx2LayerBucket.i-l-b.csv'),
    d3.text(datasetName + ccName + '-layerBucketEdge.s-t-w.csv'),
    d3.text(datasetName + ccName + '-layerBucketEdge.s-t-w.span.csv'),
    // d3.text(datasetName + '_names.csv'),
  ]).then(function (datas) {
    processData(datas);
    // initGUI(dataSet);
    // preDraw();
  }).then(function () {
    drawMap();
  });
  Promise.all([
    d3.text(datasetName + ccName + '.cc-layers'),
    d3.text(datasetName + '_names.csv'),
    dagTopoPromise
  ]).then(function (datas) {
    processDataLabel(datas);
    initGUI(dataSet);
    preDraw();
  })

  initLocalGUI();
  initLocalSubGUI();

  showGlobalLocal();

  $('#global-grpah-show-hide-button').click(function (e) {
    if (UIInfo.layout.leftVis.dagGraph) {
      showLocalOnly();
    } else {
      showGlobalLocal();
    }
  })

  $('#global-reset-button').click(function (e) {
    resetAll()
  })

  $('#cumulative-search-checkbox').change(function (e) {
    const val = $(this).prop('checked');
    // console.log(val)
    GRAPH_SEARCH.search.cumulativeSearch = val;
  })

  $('#search-type').change(function (e) {
    const val = $(this).val()
    // console.log(val)
    GRAPH_SEARCH.search.mode = parseInt(val)
  });

  $('#right-search-button-input').change(function (e) {
    const key = $(this).val()
    // console.log(key)
    GRAPH_SEARCH.search.key = key;
    const resCnt = showSearch();
    if (resCnt > 0) {
      enableExpand();
    } else {
      disableExpand();
    }
  });
  $('#right-search-button-input').keydown(function (e) {
    if (e.keyCode === 13) {
      const key = $(this).val()
      // console.log(key)
      GRAPH_SEARCH.search.key = key;
      const resCnt = showSearch();
      if (resCnt > 0) {
        enableExpand();
      } else {
        disableExpand();
      }
    }
  });

  $('#cumulative-influencers-button').click(function (e) {
    showHighDownNodes(GRAPH_SEARCH.search.cumulativeSearch);
    enableExpand();
  })

  $('#longest-dag-path-button').click(function (e) {
    showLongestPath(GRAPH_SEARCH.search.cumulativeSearch);
    enableExpand();
  })

  $('#widest-level').click(function (e) {
    showWideList(GRAPH_SEARCH.search.cumulativeSearch);
    enableExpand();
  })


  $('#meta-filter-checkbox').change(function (e) {
    const key = $(this).prop('checked');
    // console.log(key)
    GRAPH_META.showMeta = key;
    switchLocalMeta();
  })



  $('#right-filter-slider').on('slide', function (e, ui) {
    [GRAPH_THRESH.focus.bottom, GRAPH_THRESH.focus.top] = ui.values;
    filterLocalGraph();
  })

  $('#right-filter-induce-slider-checkbox').change(function (e) {
    const key = $(this).prop('checked');
    // console.log(key)
    UIInfo.right.filter.induce = key;
    if (key) {
      $('#right-filter-induce-slider').slider('enable');
      [GRAPH_THRESH.induce.bottom, GRAPH_THRESH.induce.top] = $('#right-filter-induce-slider').slider('option', 'values')
    } else {
      $('#right-filter-induce-slider').slider('disable');
      GRAPH_THRESH.induce.bottom = GRAPH_THRESH.induce.top + 1;
    }
    filterLocalGraph();
  })

  $('#right-filter-induce-slider').on('slide', function (e, ui) {
    [GRAPH_THRESH.induce.bottom, GRAPH_THRESH.induce.top] = ui.values;
    filterLocalGraph()
  })

  $('#right-filter-span-slider-checkbox').change(function (e) {
    const key = $(this).prop('checked');
    // console.log(key)
    UIInfo.right.filter.span = key;
    if (key) {
      $('#right-filter-span-slider').slider('enable');
      [GRAPH_THRESH.span.bottom, GRAPH_THRESH.span.top] = $('#right-filter-span-slider').slider('option', 'values')
    } else {
      $('#right-filter-span-slider').slider('disable');
      GRAPH_THRESH.span.bottom = GRAPH_THRESH.span.top + 1;
    }
    filterLocalGraph();
  })

  $('#right-filter-span-slider').on('slide', function (e, ui) {
    [GRAPH_THRESH.span.bottom, GRAPH_THRESH.span.top] = ui.values;
    filterLocalGraph()
  })

  $('#right-filter-jump-slider-checkbox').change(function (e) {
    const key = $(this).prop('checked');
    // console.log(key)
    UIInfo.right.filter.jump = key;
    if (key) {
      $('#right-filter-jump-slider').slider('enable');
      [GRAPH_THRESH.jump.bottom, GRAPH_THRESH.jump.top] = $('#right-filter-jump-slider').slider('option', 'values')
    } else {
      $('#right-filter-jump-slider').slider('disable');
      GRAPH_THRESH.jump.bottom = GRAPH_THRESH.jump.top + 1;
    }
    filterLocalGraph();
  })

  $('#right-filter-jump-slider').on('slide', function (e, ui) {
    [GRAPH_THRESH.jump.bottom, GRAPH_THRESH.jump.top] = ui.values;
    filterLocalGraph()
  })

  $('#right-filter-back-slider-checkbox').change(function (e) {
    const key = $(this).prop('checked');
    // console.log(key)
    UIInfo.right.filter.back = key;
    if (key) {
      $('#right-filter-back-slider').slider('enable');
      [GRAPH_THRESH.back.bottom, GRAPH_THRESH.back.top] = $('#right-filter-back-slider').slider('option', 'values')
    } else {
      $('#right-filter-back-slider').slider('disable');
      GRAPH_THRESH.back.bottom = GRAPH_THRESH.back.top + 1;
    }
    filterLocalGraph();
  })

  $('#right-filter-back-slider').on('slide', function (e, ui) {
    [GRAPH_THRESH.back.bottom, GRAPH_THRESH.back.top] = ui.values;
    filterLocalGraph()
  })



  $('#expand-new-neighbor').click(function (e) {
    const cutSize = showSearchBoundary();
    console.log(cutSize);
    if (cutSize !== 0) {
      $('#expand-step').text(GRAPH_SEARCH.label.tempStep);
      $('#right-extend-step-slider').slider('option', 'max', GRAPH_SEARCH.label.tempStep);
      $('#right-extend-step-slider').slider('option', 'value', GRAPH_SEARCH.label.tempStep);
    }
  });

  $('#right-extend-step-slider').on('slide', function (e, ui) {
    const step = ui.value;
    showSearchStep(step);
  })

  $('#extract-new-window').click(function (e) {
    drawLocalSubGraph();
  });

  $('#extract-strata').click(function (e) {
    openStrata();
  });

  $('#play-speed-selector').change(function (e) {
    const val = $(this).val()
    console.log(val)
    GRAPH_CONTROL.fragGrow.timePerStep = parseInt(val);
    console.log(GRAPH_CONTROL.fragGrow.timePerStep)
  });


  $('#right-paly-step-slider').on('slide', function (e, ui) {
    GRAPH_CONTROL.fragGrow.step = ui.value;
    growFrag();
  })


  $('#play-back-button').click(function (e) {
    growFragDec()
  });

  $('#play-play-button').click(function (e) {
    growFragPlay();
  });

  $('#play-pause-button').click(function (e) {
    growFragPauseResume();
  })

  // $('#play-stop-button').click(function (e) {
  //   growFragStop();
  // })

  $('#play-forward-button').click(function (e) {
    growFragInc();
  })




  $('#node-size-slider').on('slide', function (e, ui) {
    GRAPH_VIS.scale.node = ui.value;
    scaleNode();
  })

  $('#link-size-slider').on('slide', function (e, ui) {
    GRAPH_VIS.scale.link = ui.value;
    scaleLink();
  })

  $('#node-opacity-slider').on('slide', function (e, ui) {
    GRAPH_VIS.opacity.node = ui.value;
    opacityNode();
  })

  $('#link-opacity-slider').on('slide', function (e, ui) {
    GRAPH_VIS.opacity.link = ui.value;
    opacityLink();
  })


  $('#node-size-slider-button-up').click(function (e) {
    GRAPH_VIS.scale.node += 2
    GRAPH_VIS.scale.node = Math.max(0, Math.min(GRAPH_VIS.scale.node, 100));
    $('#node-size-slider').slider('value', GRAPH_VIS.scale.node)
    scaleNode()
  })

  $('#node-size-slider-button-down').click(function (e) {
    GRAPH_VIS.scale.node -= 2
    GRAPH_VIS.scale.node = Math.max(0, Math.min(GRAPH_VIS.scale.node, 100));
    $('#node-size-slider').slider('value', GRAPH_VIS.scale.node)
    scaleNode()
  })

  $('#link-size-slider-button-up').click(function (e) {
    GRAPH_VIS.scale.link += 2
    GRAPH_VIS.scale.link = Math.max(0, Math.min(GRAPH_VIS.scale.link, 100));
    $('#link-size-slider').slider('value', GRAPH_VIS.scale.link)
    scaleLink()
  })

  $('#link-size-slider-button-down').click(function (e) {
    GRAPH_VIS.scale.link -= 2
    GRAPH_VIS.scale.link = Math.max(0, Math.min(GRAPH_VIS.scale.link, 100));
    $('#link-size-slider').slider('value', GRAPH_VIS.scale.link)
    scaleLink()
  })

  $('#node-opacity-slider-button-up').click(function (e) {
    GRAPH_VIS.opacity.node += 5
    GRAPH_VIS.opacity.node = Math.max(0, Math.min(GRAPH_VIS.opacity.node, 100));
    $('#node-opacity-slider').slider('value', GRAPH_VIS.opacity.node)
    opacityNode()
  })

  $('#node-opacity-slider-button-down').click(function (e) {
    GRAPH_VIS.opacity.node -= 5
    GRAPH_VIS.opacity.node = Math.max(0, Math.min(GRAPH_VIS.opacity.node, 100));
    $('#node-opacity-slider').slider('value', GRAPH_VIS.opacity.node)
    opacityNode()
  })

  $('#link-opacity-slider-button-up').click(function (e) {
    GRAPH_VIS.opacity.link += 5
    GRAPH_VIS.opacity.link = Math.max(0, Math.min(GRAPH_VIS.opacity.link, 100));
    $('#link-opacity-slider').slider('value', GRAPH_VIS.opacity.link)
    opacityLink()
  })

  $('#link-opacity-slider-button-down').click(function (e) {
    GRAPH_VIS.opacity.link -= 5
    GRAPH_VIS.opacity.link = Math.max(0, Math.min(GRAPH_VIS.opacity.link, 100));
    $('#link-opacity-slider').slider('value', GRAPH_VIS.opacity.link)
    opacityLink()
  })


  $('#global-horizontal-stretch-slider').on('slide', function (e, ui) {
    dagControl.horizontal = ui.value;
    switchDagLayout();
    dagGraph.d3ReheatSimulation();
  })

  $('#local-horizontal-stretch-slider').on('slidestart', function (e, ui) {
    horizontalStretchStart();
  })

  $('#local-horizontal-stretch-slider').on('slide', function (e, ui) {
    GRAPH_VIS.stretch.horizontal = ui.value
    const scale = Math.pow(32, GRAPH_VIS.stretch.horizontal / GRAPH_VIS.stretch.horizontalDefault) / 32;
    console.log(scale)
    horizontalStretch(scale)
    // console.log(localGraph.scene().scale)
    // localGraph.scene().scale.x = scale;
    // localGraph.scene().scale.z = scale;
  })

  $('#local-horizontal-stretch-slider').on('slidestop', function (e, ui) {
    horizontalStretchEnd();
  })

  $('#local-sub-horizontal-stretch-slider').on('slide', function (e, ui) {
    GRAPH_VIS.stretch.horizontal = ui.value
    const scale = Math.pow(32, GRAPH_VIS.stretch.horizontal / GRAPH_VIS.stretch.horizontalDefault) / 32;
    console.log(scale)
    horizontalStretchSub(scale)
    // console.log(localGraph.scene().scale)
    // localGraph.scene().scale.x = scale;
    // localGraph.scene().scale.z = scale;
  })

  $('#global-vertical-stretch-slider').on('slide', function (e, ui) {
    dagControl.vertical = ui.value;
    switchDagLayout();
    dagGraph.d3ReheatSimulation();
  })

  $('#local-vertical-stretch-slider').on('slide', function (e, ui) {
    GRAPH_VIS.stretch.vertical = ui.value
    verticalStretch();
  })

  $('#local-sub-vertical-stretch-slider').on('slide', function (e, ui) {
    SUB_VIS.stretch.vertical = ui.value
    verticalStretchSub();
  })


  // $('#test1').click(function (e) {
  //   showGlobalLocal()
  // });

  // $('#test2').click(function (e) {
  //   showLocalLocalSub()
  // });

  // $('#test3').click(function (e) {
  //   showLocalOnly()
  // });

  // $('#test4').click(function (e) {
  //   const longestColor = '#FF00FF'
  //   const longestScale = 4;
  //   markLink(localDataSet.st2metaLink, d => d.longestRes, d => {
  //     d.color = longestColor
  //     d.relVal = d.defaultRelVal * longestScale;
  //   }, () => { })
  // });

  // $('#test5').click(function (e) {
  //   markLink(localDataSet.st2metaLink, d => d.longestRes, d => {
  //     d.color = d.defaultColor;
  //     d.relVal = d.defaultRelVal;
  //   }, () => { })
  // });

  // $('#test6').click(function (e) {
  //   if (UIInfo.neighbor.clickShowNeighborFlag) {
  //     UIInfo.neighbor.clickShowNeighborFlag = false;
  //     spanningMetaConnectJump()
  //     UIInfo.neighbor.step = 0;
  //   } else {
  //     UIInfo.neighbor.clickShowNeighborFlag = true;
  //   }
  // });

  // $('#test7').click(function (e) {
  //   spanningMetaConnectJump()
  // });

  // $('#test8').click(function (e) {
  //   if (GRAPH_META.showMeta) {
  //     showSearchWeight(localDataSet.idx2metaNode)
  //   } else {
  //     showSearchWeight(localDataSet.idx2node)
  //   }
  //   if (localSubGraph) {
  //     showSearchWeight(localSubDataSet.idx2node)
  //   }
  //   scaleNode();
  // });

  // $('#test9').click(function (e) {
  //   if (GRAPH_META.showMeta) {
  //     showNaturalWeight(localDataSet.idx2metaNode)
  //   } else {
  //     showNaturalWeight(localDataSet.idx2node)
  //   }
  //   if (localSubGraph) {
  //     showNaturalWeight(localSubDataSet.idx2node)
  //   }
  //   scaleNode();
  // });

  $('#test10').click(function (e) {
    getLocalPos()
  });

  $('#test11').click(function (e) {
    getForceDirectedPos()
  });

  $('#test12').click(function (e) {
    console.log('here')
    getLayeredPos()
  });

  $('#fork-selection-box').change(function (e) {
    const key = $(this).prop('checked');
    // console.log(key)
    UIInfo.fork.forkSelectedOnly = key;
  })

  $('#buttom-save-labels-button').click(function (e) {
    const labels = $('#right-labels').text()
    console.log(labels)
    if (labels) {
      navigator.clipboard.writeText(labels)
      alert('lables are copied')
    }
  })

  $('#buttom-label-summaries-button').click(function (e) {
    const summaries = Object.entries(dataSet.highNaturalWeightLabels).map(d => `${d[0]}\n${d[1]}`).join('\n\n')
    console.log(summaries)
    if (summaries) {
      navigator.clipboard.writeText(summaries)
      alert('summaries are copied')
    }
  })
})