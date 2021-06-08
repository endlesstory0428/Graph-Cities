// import * as THREE from '../node_modules/three/build/three.module.js';
// import {
//   gui
// } from '../node_modules/three/examples/jsm/libs/dat.gui.module.js';

var PREFIX = "http://172.16.93.174:8080/";

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
    if (xmlHttp.readyState === 4 && xmlHttp.status === 200)
      callback(xmlHttp.response);
  }
  xmlHttp.open("POST", theUrl, true); // true for asynchronous
  xmlHttp.responseType = 'json';
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
gui2container.style = "position: absolute; top: " + 0 + "px; left: 10px; z-index: 1";

var data_info = {
  peel_value: '',
  vertices: '',
  edges: '',
  dag_edges: '',
  drawn_vertices: '',
  drawn_edges: ''
}
gui2.add(data_info, 'peel_value').listen();
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
gui2.add(MAX_VSIZE, 'node_scale', 1, 1000)
  .onChange(size => graph && graph.nodeVal(node => nodeSize(node)));

var NODE_THRESH = {
  top: 1000,
  bottom: 0
}

let gui2f1 = gui2.addFolder('Node Size Threshold');
gui2ContThreshTop = gui2f1.add(NODE_THRESH, 'top', 0, 1000)
  .onChange(size => graph && graph.nodeVal(node => nodeSize(node)));
gui2ContThreshBottom = gui2f1.add(NODE_THRESH, 'bottom', 0, 1000)
  .onChange(size => graph && graph.nodeVal(node => nodeSize(node)));

//fixed point

var fp_choices = [
  "movies/2-15608",
  "cit-Patents/3-3191982",
  "movies/5-16664",
  "cit-Patents/1-250725",
  "cit-Patents/1-140109",
  "cit-Patents/1-62999",
  "cit-Patents/1-405063",
  "cit-Patents/8-4342010",
  "cit-Patents/11-2983724",
  "cit-Patents/15-3515498",
  "cit-Patents/13-3434164",
  "movies/15-17754",
  "movies/24-12180",
  "movies/14-14781",
  "cit-Patents/15-3718944",
  "movies/9-12922",
  "cit-Patents/23-1433320",
  "cit-Patents/18-2914315",
  "cit-Patents/19-2571623",
  "movies/29-13695",
  "cit-Patents/16-1362234",
  "movies/40-13169",
  "cit-Patents/21-3292172",
  "cit-Patents/25-3804978",
  "movies/37-23740",
  "cit-Patents/17-1851996",
  "cit-Patents/43-1965538",
  "movies/46-11766",
  "movies/8-11589",
  "cit-Patents/22-919138",
  "movies/37-12382",
  "movies/38-15906",
  "cit-Patents/19-239987",
  "movies/41-13114",
  "movies/56-16757",
  "movies/18-13639",
  "movies/57-15545",
  "movies/76-12776",
  "movies/35-13487",
  "cit-Patents/17-389660",
  "movies/48-13096",
  "movies/36-12116",
  "movies/16-11696",
  "movies/60-12370",
  "movies/31-12735",
  "movies/50-12860",
  "cit-Patents/14-1037462",
  "movies/15-11645",
  "movies/33-11491",
  "movies/7-11427",
  "movies/32-11773",
  "movies/34-11472",
  "movies/123-11670",
  "movies/30-12673",
  "movies/62-12456",
  "movies/28-12051",
  "movies/119-11833",
  "cit-Patents/15-275340",
  "movies/53-12597",
  "movies/14-11452",
  "movies/29-11432",
  "movies/13-11413",
  "cit-Patents/12-508033",
  "movies/27-11403",
  "cit-Patents/13-30471",
  "movies/2-11398",
  "cit-Patents/11-164183",
  "movies/4-11398",
  "movies/6-11398",
  "cit-Patents/10-196384",
  "cit-Patents/9-28722",
  "movies/12-11399",
  "cit-Patents/4-1243",
  "cit-Patents/8-27645",
  "movies/101-11400",
  "cit-Patents/7-30601",
  "movies/26-11399",
  "cit-Patents/6-2182",
  "cit-Patents/2-13",
  "cit-Patents/5-2061",
  "movies/84-11398",
  "cit-Patents/3-42",
  "movies/185-11398",
  "movies/527-11398",
  "movies/283-11398"
  /**
  'cit-Patents/8-4342010',
  'cit-Patents/2-13',
  'cit-Patents/6-2182',
  'cit-Patents/1-250725',
  'cit-Patents/5-2061',
  'cit-Patents/11-164183',
  'cit-Patents/19-239987',
  'cit-Patents/18-2914315',
  'cit-Patents/15-3718944',
  'cit-Patents/11-2983724',
  'cit-Patents/3-3191982',
  'cit-Patents/15-275340',
  'cit-Patents/43-1965538',
  'cit-Patents/19-2571623',
  'cit-Patents/14-1037462',
  'cit-Patents/8-27645',
  'cit-Patents/1-140109',
  'cit-Patents/22-919138',
  'cit-Patents/7-30601',
  'cit-Patents/13-30471',
  'cit-Patents/12-508033',
  'cit-Patents/9-28722',
  'cit-Patents/17-1851996',
  'cit-Patents/3-42',
  'cit-Patents/4-1243',
  'cit-Patents/10-196384',
  'cit-Patents/13-3434164',
  'cit-Patents/1-405063',
  'cit-Patents/25-3804978',
  'cit-Patents/16-1362234',
  'cit-Patents/1-62999',
  'cit-Patents/15-3515498',
  'cit-Patents/21-3292172',
  'cit-Patents/17-389660',
  'cit-Patents/23-1433320',
  'movies/57-15545',
  'movies/33-11491',
  'movies/29-13695',
  'movies/14-14781',
  'movies/7-11427',
  'movies/4-11398',
  'movies/37-23740',
  'movies/16-11696',
  'movies/48-13096',
  'movies/14-11452',
  'movies/15-11645',
  'movies/9-12922',
  'movies/30-12673',
  'movies/60-12370',
  'movies/123-11670',
  'movies/29-11432',
  'movies/37-12382',
  'movies/62-12456',
  'movies/50-12860',
  'movies/2-15608',
  'movies/283-11398',
  'movies/76-12776',
  'movies/18-13639',
  'movies/527-11398',
  'movies/26-11399',
  'movies/3114-11398',
  'movies/28-12051',
  'movies/31-12735',
  'movies/27-11403',
  'movies/1246-11398',
  'movies/101-11400',
  'movies/15-17754',
  'movies/2070-11400',
  'movies/36-12116',
  'movies/53-12597',
  'movies/40-13169',
  'movies/185-11398',
  'movies/2-11398',
  'movies/41-13114',
  'movies/32-11773',
  'movies/13-11413',
  'movies/38-15906',
  'movies/24-12180',
  'movies/119-11833',
  'movies/757-11398',
  'movies/46-11766',
  'movies/6-11398',
  'movies/56-16757',
  'movies/414-11398',
  'movies/12-11399',
  'movies/35-13487',
  'movies/34-11472',
  'movies/5-16664',
  'movies/8-11589',
  'movies/47-11398',
  'movies/84-11398'
  /**'com-friendster/1-10126754',
  'com-friendster/11-167',
  'com-friendster/1-1443591',
  'com-friendster/1-14609',
  'com-friendster/1-15204409',
  'com-friendster/1-1623531',
  'com-friendster/1-17833995',
  'com-friendster/120-11459',
  'com-friendster/1-201283',
  'com-friendster/12-131002',
  'com-friendster/1-2878103',
  'com-friendster/13-101',
  'com-friendster/1-31820411',
  'com-friendster/140-180407',
  'com-friendster/14-14107',
  'com-friendster/14-238083',
  'com-friendster/1-5249714',
  'com-friendster/15-690',
  'com-friendster/1-58275384',
  'com-friendster/1-60939141',
  'com-friendster/16-1284',
  'com-friendster/16-41201',
  'com-friendster/169-11459',
  'com-friendster/1-6980866',
  'com-friendster/1-7241947',
  'com-friendster/175-260453',
  'com-friendster/1-754869',
  'com-friendster/17-60024',
  'com-friendster/18-13234024',
  'com-friendster/1-8645756',
  'com-friendster/19-19546040',
  'com-friendster/20-123',
  'com-friendster/20-9823427',
  'com-friendster/2-101',
  'com-friendster/21-1374',
  'com-friendster/2-2407314',
  'com-friendster/22-6161',
  'com-friendster/234-262712',
  'com-friendster/25-167',
  'com-friendster/27-146',
  'com-friendster/29-735',
  'com-friendster/30-11086',
  'com-friendster/304-1850520',
  'com-friendster/3-101',
  'com-friendster/31-4062912',
  'com-friendster/32-248525',
  'com-friendster/33-1467',
  'com-friendster/34-87642',
  'com-friendster/34-90152410',
  'com-friendster/35-1750',
  'com-friendster/38-1202',
  'com-friendster/40-38645',
  'com-friendster/4-101',
  'com-friendster/41-1905',
  'com-friendster/41-60187632',
  'com-friendster/4-6552536',
  'com-friendster/48-6608327',
  'com-friendster/5-173',
  'com-friendster/53-1266',
  'com-friendster/54-1563',
  'com-friendster/55-643725',
  'com-friendster/58-2035500',
  'com-friendster/6-284',
  'com-friendster/65-4182',
  'com-friendster/7-101',
  'com-friendster/71-102807',
  'com-friendster/7-19325784',
  'com-friendster/75-49855703',
  'com-friendster/77-49855703',
  'com-friendster/80-49855703',
  'com-friendster/8-176',
  'com-friendster/82-49855703',
  'com-friendster/86-49855703',
  'com-friendster/89-1202',
  'com-friendster/9-164816',
  'com-friendster/9-201256',
  'com-friendster/92-49855703'**/
]

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
gui2.add(controls, 'DAG Orientation', ['td', 'bu', 'lr', 'rl', 'zout', 'zin', 'radialout', 'radialin', null])
  .onChange(orientation => graph && graph.dagMode(orientation));

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

// graph config
const elem = document.getElementById("graph");
const NODE_REL_SIZE = (3 / (4 * Math.PI)) * 10;
const graph = ForceGraph3D()(elem)
  .width(elem.offsetWidth)
  .height(elem.offsetHeight)
  .dagMode('bu')
  .dagLevelDistance(50)
  .backgroundColor('#ffffff')
  .linkColor(() => 'rgba(0,0,0,1.0)')
  .nodeRelSize(NODE_REL_SIZE)
  .nodeId('id')
  .nodeVal(node => nodeSize(node))
  .nodeLabel(function(node) {
    if (node.size == 1) {
      return '<p style="color:black">one node</p>'
    }
    if (node.esize == 1) {
      return '<p style="color:black">one edge</p>'
    }
    var label = '';
    if (2 * node.esize == (node.size * (node.size - 1))) {
      label = ' (complete)';
    }
    return '<p style="color:black">V:' + node['size'] + ' E:' + node['name'] + label + '</p>'
  })
  //.nodeAutoColorBy('density')
  .nodeColor('color')
  .nodeOpacity(0.8)
  .linkLabel(link => '<p style="color:black">' + link['size'] + '</p>')
  .linkWidth('logsize')
  //.linkDirectionalParticles(2)
  //.linkDirectionalParticleWidth(0.8)
  //.linkDirectionalParticleWidth('logsize')
  //.linkDirectionalParticleSpeed(0.006)
  .d3Force('collision', d3.forceCollide(node => Math.cbrt(node.esize) * NODE_REL_SIZE))
  .d3VelocityDecay(0.3)
  .nodeThreeObject(function(node) {
    return nodeGeom(node)
  })

graph
  .enableNodeDrag(false)
  //.onNodeHover(node => { console.log(node) })
  .onNodeClick(node => {
    setStrataUrl('?data=nodata');
    clicked = node;
    console.log(node['color']);
    //graph.nodeColor(node => node === clicked ? 'rgba(0,0,0,1)' : node['color']);
    graph.nodeThreeObject(function(node) {
      return nodeGeom(node)
    });
    //console.log("Node: ", node);
    //console.log(DATA,nodeDS,nodeMAP);
    //const setid = nodeDS.find(nodeMAP[node.id]);
    const setid = nodeDS._findById(node.id);
    console.log("Setid: ", setid);
    const nodefilter = new Set();
    const nodefilter_label = [{source: "new_id", target: "name"}]; // column name for labels.csv
    for (const sid in nodeDS._objects) {
      if (nodeDS._findById(sid) === setid) {
        //console.log(nodeDS._objects[sid], DATA.nodes[nodeDS._objects[sid].id]);
        const vertices = DATA.nodes[nodeDS._objects[sid].id].vertices
        const labels = DATA.nodes[nodeDS._objects[sid].id].labels;
        for (const vert in vertices) {
          nodefilter.add(vertices[vert]);
        };
        // // push vertex labels for vertex in nodefilter
        for (let vIndex = 0; vIndex < vertices.length; vIndex++) {
          nodefilter_label.push({source: vertices[vIndex], target:labels[vIndex]});
        };
      }
    }
    loadEdges(node, nodefilter, nodefilter_label);
    //Graph.zoomToFit();
  });

function nodeSize(node) {
  if (node.esize > NODE_THRESH.top || node.esize < NODE_THRESH.bottom) {
    return 0.0001;
  }
  if (node.esize == 0) {
    return 0.01;
  }
  return (node.esize + 1) * (MAX_VSIZE.node_scale / MAX_MAXSIZE);
}

function nodeGeom(node) {
  if (node === clicked) {
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
        color: node['color'],
        transparent: true,
        opacity: 0.8
      }),
      new THREE.MeshLambertMaterial({
        color: 'black',
        transparent: false
      })
    ]);
  } else {
    if (node.esize > NODE_THRESH.top || node.esize < NODE_THRESH.bottom) {
      return false;
    }
    if (node.esize == 1) {
      return new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.5, 32), [
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
    }
    return false;
  }
}

//var layer_nodes = [];
var layer_links = [];
var layer_loaded = false;
var prev_suffix = null;

function loadEdges(node, nodefilter, nodefilter_label) {
  if (!layer_loaded) {
    console.log("Not done loading edges!");
    return
  }
  const [layer, lcc] = layer_lcc.split('/');
  console.log(layer, lcc);
  const nodes = [];
  nodefilter.forEach(v => nodes.push({
    id: v
  }));
  const links = [];
  for (const i in layer_links) {
    const edge = layer_links[i];
    if (edge.layer == layer) {
      if (nodefilter.has(edge.source) && nodefilter.has(edge.target)) {
        links.push(edge);
      }
    }
  }
  console.log(links);
  let filename = DATASET + "_" + layer_lcc.replace("/", "-") + node.id;
  console.log(filename);
  let content = JSON.stringify({
    filename: filename + ".csv",
    edges: links
  });
  httpGetAsync(PREFIX + "query?type=setdatadir&file=./dataTemp", function(res) {
    console.log(res);
  });
  httpPostAsync(content, PREFIX + "save", function(res) {
    console.log(res)
    console.log(res.errno)
    if (res.errno == 0 || res.errno == -17) {
      // // send labels to strata
      content = JSON.stringify({
        filename: filename + "_labels.csv",
        edges: nodefilter_label
      });
      httpPostAsync(content, PREFIX + "save", function(res) {
        console.log(res)
        console.log(res.errno)
        if (res.errno == 0 || res.errno == -17) {
          let C = new THREE.Color(node.color);
          console.log("?dataPath=" + filename + '&nodeColor={"r":' + C.r + ',"g":' + C.g + ',"b":' + C.b + '}');
          console.log(document.getElementById('strata').src);
          httpGetAsync(PREFIX + "query?type=add&file=" + filename + ".csv", function(res) {
            console.log(res);
            setStrataUrl("?dataPath=" + filename + '&nodeColor={"r":' + C.r + ',"g":' + C.g + ',"b":' + C.b + '}&nodeColorProperty=waveLevel&heightProperty=waveLevel');
            console.log(document.getElementById('strata').src);
          });
        };
      });
    }
  });
  /*
  Graph.graphData({
    nodes,
    links
  });
  */
}

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
    var loader = new THREE.FileLoader();
    loader.load(
      // resource URL
      "./" + dataset + "/" + dataset + "_layers",
      // onLoad callback
      function(data) {
        //console.log('layer-*[0-9]*-'+suffix+'.csv')
        const layerfile = "./" + dataset + "/" + dataset + "_layers/" + data.match('layer-*[0-9]*-' + suffix + '.csv');
        console.log("Loading: ", layerfile);
        /*
        loader.load(layerfile, function(text){
          //console.log(text.split('\n'));
          const lines = text.split('\n');
          for (const i in lines) {
            const src_tgt_lay = lines[i].split(',');
            const src = Number(src_tgt_lay[0]);
            const tgt = Number(src_tgt_lay[1]);
            const lay = Number(src_tgt_lay[2]);
          }
        });
        */
        d3.text(layerfile).then(function(text) {
          //console.log(text.split('\n'));
          var ldata = d3.csvParseRows(text, function(d, i) {
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
        });
      });
  });
}

window.addEventListener('resize', function() {
  graph
    .width(elem.offsetWidth)
    .height(elem.offsetHeight)
});

// Decrease repel intensity
graph.d3Force('charge').strength(-15);

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

let DATA = null;
let nodeDS = null;
let layer_lcc = null;
let DATASET = null;
//let nodeMAP = null;

function loadFile2(filename) {
  d3.json(filename).then(function(data) {
    // console.log(data);
    let verts = 0;
    let edges = 0;
    let fpedges = 0;

    const nodeset = disjointSet();
    //const nodemap = {};
    const nodes = {};
    for (const vert in data["nodes"]) {
      const vals = data["nodes"][vert]
      // console.log(vert, vals);
      const density = 2.0 * vals["num_edges"] / (vals["num_vertices"] * (vals["num_vertices"] - 1));
      const node = {
        id: vert,
        set: vals["set"],
        name: vals["num_edges"],
        density: density,
        color: getColor(density),
        size: vals["num_vertices"],
        esize: vals["num_edges"] / 2,
        level: vals["set"]
      };

      nodes[vert] = node;
      nodeset.add(node);
      //nodemap[nodeset.find(node)] = node;

      verts += vals["num_vertices"];
      fpedges += vals["num_edges"] / 2;
    }

    let links = [];
    for (const sedge in data["edges"]) {
      const edge = sedge.split('-');
      const v0 = edge[0],
        v1 = edge[1]
      let parent = v0;
      let target = v1;
      if (nodes[v0].set > nodes[v1].set) {
        parent = v1;
        target = v0;
      }
      links.push({
        source: nodeset.find(nodes[parent]),
        target: nodeset.find(nodes[target]),
        //targetNode: nodes[target],
        logsize: Math.log2(data["edges"][sedge] + 1),
        size: data["edges"][sedge]
      });

      edges += data["edges"][sedge];
      fpedges += data["edges"][sedge];
    }

    let minset = 10;
    let preLength = 0;
    console.log(nodeset);
    while (links.length > 2 * IP.max_edges && minset > 0) { // 2x because undirected
      // /**
      let sources1 = new Set();
      let sources2 = new Set();
      for (const l in links) {
        let link = links[l];
        sources1.add(link.source);
        sources2.add(link.source);
      }
      for (const l in links) {
        let link = links[l];
        sources1.delete(link.target);
      }
      for (const l in links) {
        let link = links[l];
        if (!sources1.has(link.source)) {
          sources2.delete(link.target);
        }
      }
      console.log(sources1, sources2);
      for (const l in links) {
        let link = links[l];
        //console.log(link.source, link, links);
        if (sources1.has(link.source) && sources2.has(link.target)) {
          //nodeset.union(nodemap[link.source], nodemap[link.target]);
          nodeset.union(nodeset._objects[link.source], nodeset._objects[link.target]);
        }
      }
      //const filterLinks = {};
      const filterLinks = [];
      for (const l in links) {
        let link = links[l];
        //if (nodeset.connected(nodemap[link.source], nodemap[link.target])) {
        //  nodemap[nodeset.find(nodemap[link.source])].esize += link.size;
        if (nodeset.connected(nodeset._objects[link.source], nodeset._objects[link.target])) {
          nodeset._objects[nodeset._findById(link.source)].esize += link.size;
        } else {
          link.source = nodeset._findById(link.source);
          link.target = nodeset._findById(link.target);
          filterLinks.push(link);
          //console.log(filterLinks[filterLinks.length-1]);
        }
      }
      links = Object.values(filterLinks);
      console.log("Reduced to: ", links.length);
      if (preLength == links.length) {
        minset--;
      }
      preLength = links.length;
      // **/
      /**
      minset++;
      for (const l in links) {
        let link = links[l];
        //console.log(link.source, link, links);
        //if (nodemap[link.source].set < minset) {
        //  nodeset.union(nodemap[link.source], nodemap[link.target])
        //}
        if (nodeset._objects[link.source].set < minset) {
          nodeset.union(nodeset._objects[link.source], nodeset._objects[link.target])
        }
      }
      //const filterLinks = {};
      const filterLinks = [];
      for (const l in links) {
        let link = links[l];
        //if (nodeset.connected(nodemap[link.source], nodemap[link.target])) {
        //  nodemap[nodeset.find(nodemap[link.source])].esize += link.size;
        if (nodeset.connected(nodeset._objects[link.source], nodeset._objects[link.target])) {
          nodeset._objects[nodeset._findById(link.source)].esize += link.size;
        } else {
          link.source = nodeset._findById(link.source);
          link.target = nodeset._findById(link.target);
          //link.source = nodeset.find(nodemap[link.source]);
          //link.target = nodeset.find(nodemap[link.target]);
          /*
          let lkey = String([link.source,link.target]);
          //console.log(nodeset.find(nodemap[link.source]), nodeset.find(nodemap[link.target]));
          if (!(lkey in filterLinks)) {
            filterLinks[lkey] = {source:link.source, target:link.target, size:link.size};
          } else {
            //filterLinks[lkey].source = link.source;
            //filterLinks[lkey].target = link.source;
            filterLinks[lkey].size += link.size;
          }
          /
          filterLinks.push(link);
          //console.log(filterLinks[filterLinks.length-1]);
        }
      }
      //for (const l in filterLinks) {
      //  filterLinks[l].logsize = Math.log2(filterLinks[l].size+1);
      //}
      links = Object.values(filterLinks);
      console.log("Reduced to: ", links.length);
      **/
    }

    //let nodeArr = Object.values(nodes);
    const nodesExt = nodeset.extract();
    const nodeArr = []
    var maxNodeEdges = 0;
    var minNodeEdges = Infinity;
    for (let vert in nodesExt) {
      let maxset = 0;
      let num_vertices = 0;
      let num_edges = 0;
      for (let i in nodesExt[vert]) {
        //console.log(nodesExt[vert][i]);
        if (maxset < nodesExt[vert][i].set) {
          maxset = nodesExt[vert][i].set;
        }
        num_vertices += nodesExt[vert][i].size;
        num_edges += nodesExt[vert][i].esize;
      }

      const density = 2.0 * num_edges / (num_vertices * (num_vertices - 1));

      const node = {
        id: nodeset.find(nodesExt[vert][0]),
        set: maxset,
        name: num_edges,
        density: density,
        color: getColor(density),
        size: num_vertices,
        esize: num_edges, // double counted undirected
        level: maxset
      };
      if (maxNodeEdges < num_edges) maxNodeEdges = num_edges;
      if (minNodeEdges > num_edges) minNodeEdges = num_edges;
      nodeArr.push(node);
    }
    //console.log(nodeArr);
    graph.graphData({
      nodes: nodeArr,
      links: links
    });

    // update gui2
    console.log("Total:", verts, edges, fpedges);
    console.log("Shown:", nodeArr.length, links.length);
    graph.zoomToFit();
    data_info.vertices = verts;
    data_info.edges = fpedges;
    data_info.dag_edges = edges;
    data_info.drawn_vertices = nodeArr.length;
    data_info.drawn_edges = links.length;
    NODE_THRESH.top = maxNodeEdges;
    gui2ContThreshTop.min(minNodeEdges);
    gui2ContThreshTop.max(maxNodeEdges);
    NODE_THRESH.bottom = minNodeEdges;
    gui2ContThreshBottom.min(minNodeEdges);
    gui2ContThreshBottom.max(maxNodeEdges);
    gui2.updateDisplay();

    // update globals
    DATA = data;
    nodeDS = nodeset;
    //nodeMAP = nodemap;
  });
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
