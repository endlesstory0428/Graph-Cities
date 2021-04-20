import * as THREE from '../node_modules/three/build/three.module.js';
import {
  TrackballControls
} from '../node_modules/three/examples/jsm/controls/TrackballControls.js';
import {
  GUI
} from '../node_modules/three/examples/jsm/libs/dat.gui.module.js';
import {
  OBJLoader
} from '../three.js/examples/jsm/loaders/OBJLoader.js';
import {
  loadBushData
} from './bush.js';
import * as LH from './parts/lighthouse.js'
import * as BUILD from './parts/building.js';
import * as PATH from './parts/path.js';

let addBuildings = true, addDagViews = false;

const scenes = [];
let controls, renderer, canvas;
let perspectiveCamera, orthographicCamera, perspectiveCameraL;
// let spiral = []; 
let frustumSize = 400;
let aspect = window.innerWidth / window.innerHeight;
let scene_city = new THREE.Scene();
let scene_lighthouse = new THREE.Scene();
let sliderPos = 362;

const raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let INTERSECTED;
let city_tracking = {};
let city_all = {};
let city_list = [];
let objects = [];
let ground_object;
let path_objects = [];
let truss_objects = [];
let window_objects = [];
let flag_objects = [];
let grass_objects = [];
let bush_objects = [];
let light_objects = {};
let key_to_buckets = {};
let metaLoaded = false,
  voronoiLoaded = false,
  lighthouseLoaded = false,
  entropyLoaded = false,
  bucketLoaded = false,
  pathPlanningDone = false,
  lighthouseDone = false;
let city_to_load;
let color_display, light_intensity;
let time = new Date();
let printTime = true;
let start_time_string = time.getMinutes() + ':' + time.getSeconds() + '.' + time.getMilliseconds();

// if(addBuildings){
//     city_to_load = 77;// hard-coded
// }
let root_dropdown, root_dropdown_highlighted;
let gui, guiL, select_fixed_point;

// let DATASET = 'com-friendster_old';
// let DATASET = 'com-friendster';
// let DATASET = 'movies';
// let DATASET = 'cit-Patents';
const data_list = ['com-friendster', 'movies', 'cit-Patents'];
const V = {'com-friendster':65608366, 'movies':218052, 'cit-Patents':3774768};
const E = {'com-friendster':1806067135, 'movies':115050370, 'cit-Patents':16518947};
const connected = {'com-friendster':true, 'movies':false, 'cit-Patents':false};
let land_obj = "../models/flat_island.obj";
let ground_texture_file = "../textures/ground_2.jpg";
let water_texture_file = "../textures/waternormals.jpg";
let manager = new THREE.LoadingManager();
// let y_scale = 50; // scale up the height of building
let last = [-187.86920742571192, -69.84011743155536]
let y_scale = Math.sqrt(last[0] ** 2 + last[1] ** 2) / 4.565727849181679;
// let x_scale = 800000.0; // scale down the coordinates span
let x_scale = 1;
// camera movements
let radius = 500,
  theta = 0,
  toPanCity = false,
  toPanBuilding = false,
  toZoomBuilding = false;
// GUI parameters
let params = {
  orthographicCamera: false,
  resetCamera: function() {
    toPanBuilding = false;
    toPanCity = false;
    toZoomBuilding = false;
    controls.reset();
    animate();
  },
  topView: function() {
    toPanBuilding = false;
    toPanCity = false;
    toZoomBuilding = false;
    perspectiveCamera.position.z = 200;
    perspectiveCamera.position.x = 0;
    perspectiveCamera.position.y = 400;
  },
  panCity: function() {
    panCity();
  },
  zoomBuilding: function() {
    zoomBuilding();
  },
  panBuilding: function() {
    panBuilding();
  },
  ground: "#CCA262",
  // colorMap: "jet",
  // hideBuilding: false
  // dataSet: data_list[0],
  all: 'building',
  highlighted: 'building',
  outer: true,
  isNight: false,
  goInnerView: function() {
    let bottom = document.getElementById("inner-view").offsetTop;
    window.scrollTo(0,bottom);
  },
  goOuterView: function() {
    let top = document.getElementById("city-view".offsetTop);
    window.scrollTo(0,top);
  }
};
// lighthouse
let first_key_list = [1];
let first_key_color_dict = {
  0: "#000000"
};
let paramsL = {
  dataSet: data_list[2],
  fixedPoint: first_key_list[0],
  color: first_key_color_dict[0],
  lightIntensity: 0.1
}
let lighthouse_objects = [];
let entropy, bucketData, lighthouseData, metaData, voronoiData, summaryData;
// let selected_buildings = ["1_405063", "1_62999", "8_4342010", "1_250725", "1_140109", "3_3191982", "11_2983724"];
let selected_buildings = [];
const data_dir = "../data/";
const python_dir = "../python/";
const lighthouse_dir = "../scripts/lighthouse/";
let source_dir = data_dir + paramsL.dataSet + "/";
let spiral_file = data_dir + paramsL.dataSet + "/SPIRAL.txt";
let voronoi_file = python_dir + paramsL.dataSet + "/voronoi.txt";
let neighbors_file = python_dir + paramsL.dataSet + "/neighbors.txt";
let meta_file = python_dir + paramsL.dataSet + "/metagraph_normalized.txt";
let lighthouse_file = lighthouse_dir+paramsL.dataSet+'-layers-dists.json';
let entropy_file = lighthouse_dir+paramsL.dataSet+'_entropy.json';
let bucket_file = lighthouse_dir+paramsL.dataSet+'-bucket2peels.json';
let summary_file = data_dir + paramsL.dataSet+'-summary.json';
let building_params = {
  floor: '',
  layer: ''
};
let water;
const scene_city_element = document.getElementById("city-element");
const scene_city_description = document.getElementById("city-description");
let views, lighthouse_view, city_view;

init();
animate();

export function getParams() {
  return params;
}

function init() {
  canvas = document.getElementById("c");

  renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true});
  renderer.setPixelRatio(window.devicePixelRatio);
  
  lighthouse_view = document.querySelector('#lighthouse-view');
  city_view = document.querySelector('#city-view');
  views = [lighthouse_view, city_view];

  const canvas2 = document.createElement('canvas');
  canvas2.width = 128;
  canvas2.height = 128;

  scene_city.userData.view = views[1];
  scene_city.background = new THREE.Color('skyblue');

  // city summary
//   scene_city_description.innerText = paramsL.dataSet+" V: "+V[paramsL.dataSet]+", E: "+E[paramsL.dataSet];
//   scene_city_description.innerText = scene_city_description.innerText.concat(", CC");
  let deg_img = document.createElement("img");
  deg_img.src = data_dir+paramsL.dataSet+"_deg.png";
  deg_img.style.width = '50%';
  city_view.appendChild(deg_img);
  
  perspectiveCamera = new THREE.PerspectiveCamera(60, (window.innerWidth-sliderPos)/window.innerHeight, 1, 4000);
  perspectiveCamera.position.z = 600;
  perspectiveCamera.position.y = 350;
  orthographicCamera = new THREE.OrthographicCamera(frustumSize * aspect / -2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / -2, 1, 1000);
  orthographicCamera.position.z = 20;
  scene_city.userData.camera = (params.orthographicCamera) ? orthographicCamera : perspectiveCamera;
  
  const city_controls = new TrackballControls(scene_city.userData.camera, city_view);
  city_controls.rotateSpeed = 1.0;
  city_controls.zoomSpeed = 1.2;
  city_controls.panSpeed = 0.8;
  city_controls.keys = [65, 83, 68];
  scene_city.userData.controls = city_controls;

  // environment lights
  light_objects = {
    ambientLight: new THREE.AmbientLight(0x404040),
    dayLights: [new THREE.DirectionalLight(0xffffff, 0.8), new THREE.DirectionalLight(0xffffff, 0.5)],
    nightLight: new THREE.DirectionalLight(0xffffff, 0.01),
    spotLight: new THREE.SpotLight(0xffffff, 0.6, 0, Math.PI / 2, 1, 1),
    selectionLights:[]
  };
  scene_city.add(light_objects['ambientLight']);
  light_objects.dayLights[0].position.set(1000, 1000, 1000);
  light_objects.dayLights[1].position.set(-500, 500, 0);
  light_objects.dayLights.forEach(object => scene_city.add(object));
  light_objects.spotLight.position.set(0, 30, 0);
  scene_city.add(light_objects.spotLight);
  scene_city.add(light_objects.spotLight.target);
  light_objects.spotLight.visible = false;
  let selectionLightsLength=30;
  for(let i=0;i<selectionLightsLength;i++){
    light_objects.selectionLights.push(new THREE.SpotLight(0xffffff, 0.4, 0, Math.PI / 3, 1, 1));
    light_objects.selectionLights[i].visible=false;
    light_objects.selectionLights[i].position.set(0,30,0);
    scene_city.add(light_objects.selectionLights[i]);
    scene_city.add(light_objects.selectionLights[i].target);
  }

  initSlider();
  // load files
  manager.onStart = function(url, itemsLoaded, itemsTotal) {
    console.log('Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');
  };

  loadBushData(source_dir);
  loadFile(spiral_file, manager);
  loadJSONFile(lighthouse_file, manager);
  loadJSONFile(entropy_file, manager);
  loadJSONFile(bucket_file, manager);
  loadJSONFile(summary_file, manager);

  // GUI folders
  gui = new GUI({
    width: 350
  });
  gui.domElement.style = "z-index: 3";

  let f0 = gui.addFolder('Data Set');
  let selectData = gui.add(paramsL, 'dataSet', data_list).name('choose data set');
  selectData.setValue(paramsL.dataSet);
  selectData.onChange(
    function(dataSet) {
      if(addDagViews) {
        setStrataUrl('?data=nodata');        
      }
      objects.every(object => scene_city.remove(object));
      path_objects.every(object => scene_city.remove(object));
      window_objects.every(object => scene_city.remove(object));
      flag_objects.every(object => scene_city.remove(object));
      grass_objects.every(object => scene_city.remove(object));
      truss_objects.every(object => scene_city.remove(object));
      bush_objects.every(object => scene_city.remove(object));
      light_objects.spotLight.visible = false;
      lighthouse_objects.every(object => scene_lighthouse.remove(object));
      
      if (dataSet === data_list[0]) {
        // friendster
        ground_object.scale.set(0.4, 0.1, 0.3);
        ground_object.position.set(-60, -10, 20);
        perspectiveCameraL.position.y = 10;
        perspectiveCameraL.position.z = 20;
      } else if (dataSet === data_list[1]) {
        // movies
        ground_object.scale.set(0.22, 0.08, 0.2);
        ground_object.position.set(-30, -9, 0);
        perspectiveCameraL.position.y = 60;
        perspectiveCameraL.position.z = 85;
      } else if (dataSet === data_list[2]) {
        // patents
        ground_object.scale.set(0.22, 0.08, 0.2);
        ground_object.position.set(-30, -9, 0);
        perspectiveCameraL.position.y = 2;
        perspectiveCameraL.position.z = 10;
      }

      animate();
    //   scene_city_description.innerText = "V: "+V[dataSet]+", E: "+E[dataSet];
      source_dir = data_dir + dataSet + "/";
      spiral_file = data_dir + dataSet + "/SPIRAL.txt";
      voronoi_file = python_dir + dataSet + "/voronoi.txt";
      neighbors_file = python_dir + dataSet + "/neighbors.txt";
      meta_file = python_dir + dataSet + "/metagraph_normalized.txt";
      
      time = new Date();
      start_time_string = time.getMinutes() + ':' + time.getSeconds() + '.' + time.getMilliseconds();
      city_tracking = {};
      city_all = {};
      city_list = [];
      objects = [], path_objects = [], truss_objects = [], window_objects = [], flag_objects = [];
      metaLoaded = false, voronoiLoaded = false, entropyLoaded = false, lighthouseLoaded = false, bucketLoaded = false;
      pathPlanningDone = false, lighthouseDone = false;
      light_objects.selectionLights.forEach(object => object.visible = false);
      loadBushData(source_dir);
      loadFile(spiral_file, manager);
      key_to_buckets = {};
      selected_buildings = [];
      lighthouseData = {}, entropy = {}, bucketData = {};
      lighthouse_file = '../scripts/lighthouse/'+dataSet+'-layers-dists.json';
      entropy_file = '../scripts/lighthouse/'+dataSet+'_entropy.json';
      bucket_file = '../scripts/lighthouse/'+dataSet+'-bucket2peels.json';
      summary_file =  data_dir + dataSet + "-summary.json";
      loadJSONFile(lighthouse_file, manager);
      loadJSONFile(entropy_file, manager);
      loadJSONFile(bucket_file, manager);
      loadJSONFile(summary_file, manager);
      animate();
    }
  );

  f0.open();

  let f1 = gui.addFolder('Building Info');
  f1.add(building_params, 'floor').name('floor number').listen();
  f1.add(building_params, 'layer').name('layer info').listen();
  f1.open();

  let f2 = gui.addFolder('Camera Control');
  f2.add(params, 'resetCamera').name('reset camera');
  f2.add(params, 'topView').name('top view');
  f2.add(params, 'orthographicCamera').name('use orthographic').onChange(
    function(value) {
      // controls.dispose();
      createControls(value ? orthographicCamera : perspectiveCamera);
      animate();
    });
  f2.add(params, 'panCity').name('Pan around a city');
  f2.add(params, 'zoomBuilding').name('Zoom in to "root"');
  f2.add(params, 'panBuilding').name('Zoom in and pan around');
  // f2.open();

  let f3 = gui.addFolder('Environment Control');
  f3.add(params, 'outer').name('outer frustums').onChange(function(value) {
    truss_objects.forEach(object => object.visible = value);
    animate();
  });
  f3.add(params, 'isNight').name('night view').onChange(function(value) {
    dayAndNight(value, light_objects, window_objects);
    animate();
  });
  // f3.addColor(params, 'ground').name('ground color').onChange( function( colorValue ) {
  //     colorValue = parseInt(colorValue.replace('#','0x'), 16);
  //     let colorObject = new THREE.Color( colorValue );
  //     groundMesh.material.color = colorObject;
  //     animate();
  // });
  // f3.open();

  let f4 = gui.addFolder('Select Root');
  root_dropdown = f4.add(params, 'all', ['default', 'example 1', 'example 2']);
  root_dropdown.setValue('default');
  root_dropdown.onChange(
    function(value) {
      if(addDagViews) {
        setStrataUrl('?data=nodata');
      }
      path_objects.every(object => scene_city.remove(object));
      animate();
      let result = PATH.pathPlanning(value, scene_city, city_all, light_objects, selected_buildings);
      scene_city = result.scene;
      path_objects = result.path;
      light_objects = result.light_objects;
      if(addDagViews){
        console.log("******** " + value + " *********");
        console.log("******** " + paramsL.dataSet + " *********");
  
        let wavemap_ID_ID_freq = value.split('_');
        let file = '../data_dags/' + paramsL.dataSet + '/dagmeta_' + wavemap_ID_ID_freq[1] + '-' + wavemap_ID_ID_freq[2] + '.json';
        console.log("Loading: ", file);
        loadFile2(file);
        loadLayer(paramsL.dataSet, wavemap_ID_ID_freq[1], wavemap_ID_ID_freq[2]);  
      }
    }
  );
  root_dropdown_highlighted = f4.add(params, 'highlighted',['default root']);
  root_dropdown_highlighted.setValue('default');
  root_dropdown_highlighted.onChange(
    function(value) {
      root_dropdown.setValue(value);
    }
  )
  f4.add(params, 'goInnerView').name("Go Inner View");
  f4.add(params, 'goOuterView').name("Go City View");
  f4.open();

  // groud
  let groundNormal = new THREE.TextureLoader().load(ground_texture_file);
  groundNormal.wrapS = THREE.RepeatWrapping;
  groundNormal.wrapT = THREE.RepeatWrapping;
  groundNormal.repeat.set(10, 10);
  groundNormal.rotation = 10;
  let groundMat = new THREE.MeshStandardMaterial({
    map: groundNormal
  });
  groundObjLoader(land_obj, groundMat);

  // water
  let waterGeo = new THREE.BoxBufferGeometry(5000, 50, 5000);
  let waterNormal = new THREE.TextureLoader().load(water_texture_file, function(texture) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
  });
  let waterMat = new THREE.MeshPhongMaterial({
    color: 0x006994,
    normalMap: waterNormal
  });
  waterMat.transparent = true;
  waterMat.opacity = 0.7;
  let waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.y = -50;
  scene_city.add(waterMesh);

  city_view.addEventListener('mousedown',onMouseDown);
  scenes.push(scene_city);

  // lighthouse scene
  const lighthouse_element = document.getElementById("lighthouse-element");
  const canvas3 = document.createElement( 'canvas' );
  canvas3.width = 128;
  canvas3.height = 128;

  scene_lighthouse.background = new THREE.Color('white');
  scene_lighthouse.userData.view = views[0];

  perspectiveCameraL = new THREE.PerspectiveCamera(75, sliderPos / window.innerHeight, 0.1, 1000);
  perspectiveCameraL.position.z = 10;
  perspectiveCameraL.position.y = 2;
  scene_lighthouse.userData.camera = perspectiveCameraL;

  let lighthouse_controls = new TrackballControls(scene_lighthouse.userData.camera, lighthouse_view);
  // lighthouse_controls.noRotate = false;
  lighthouse_controls.zoomSpeed = 1.0;
  lighthouse_controls.panSpeed = 0.8;
  lighthouse_controls.keys = [65, 83, 68];
  lighthouse_controls.object = perspectiveCameraL;
  scene_lighthouse.userData.controls = lighthouse_controls;
 
  lighthouse_view.addEventListener('mousedown',onMouseDownLH);
  
  // lighthouse_element.addEventListener('mousemove', onMouseMoveLH);
  scenes.push(scene_lighthouse);

  // guiL - GUI for lighthouse
  guiL = new GUI({
    width: 362,
    autoPlace: false
  });
  select_fixed_point = guiL.add(paramsL, 'fixedPoint', first_key_list).name('choose fixed point');
  color_display = guiL.addColor(paramsL, 'color').name('display color');
  light_intensity = guiL.add(paramsL, 'lightIntensity').name('diversity');
  let customContainer = document.getElementById('first-gui-container');
  customContainer.appendChild(guiL.domElement);

}

//load ground OBJ file
function groundObjLoader(obj_url, obj_material) {
  var loader = new OBJLoader();
  loader.load(
    obj_url,
    function(object) {
      object.traverse(function(child) {
        console.log("child type: " + child.type);
        if (child.type == "Mesh") {
          child.material = obj_material;
        }
      });
      if (paramsL.dataSet === data_list[0]) {
        object.scale.set(0.4, 0.1, 0.3);
        object.position.set(-60, -10, 20);
      } else if (paramsL.dataSet === data_list[1]) {
        object.scale.set(0.22, 0.08, 0.2);
        object.position.set(-30, -9, 0);
      } else if (paramsL.dataSet === data_list[2]) {
        object.scale.set(0.22, 0.08, 0.2);
        object.position.set(-30, -9, 0);
      }
      ground_object = object;
      scene_city.add(object);
    },
    function(xhr) {
      console.log(obj_url + ' ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function(error) {
      console.log('An error happened when loading ' + obj_url);
    }
  );
}

function loadFile(file, manager) {
  let loader = new THREE.FileLoader(manager);
  let blob = null;
  loader.responseType = "blob";
  loader.load(file,
    function(data) {
      getAsText(data, file);
    },
    function(xhr) {

      // console.log((file + ' ' + xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function(err) {
      console.error('An error happened when loading ' + file);
    }
  );
}

function loadVoronoiFile(file, manager) {
  let loader = new THREE.FileLoader(manager);
  let blob = null;
  loader.responseType = "blob";
  loader.load(file,
    function(data) {
      getAsTextVoronoi(data, file);
    },
    function(xhr) {
      console.log((file + ' ' + xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function(err) {
      console.error('An error happened when loading ' + file);
    }
  );
}

function loadMetaFile(file, manager) {
  let loader = new THREE.FileLoader(manager);
  let blob = null;
  loader.responseType = "blob";
  loader.load(file,
    function(data) {
      getAsTextMeta(data, file);
    },
    function(xhr) {
      console.log((file + ' ' + xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function(err) {
      console.error('An error happened when loading ' + file);
    }
  );
}

function loadJSONFile(file, manager) {
  let loader = new THREE.FileLoader(manager);
  let blob = null;
  loader.responseType = "blob";
  loader.load(file,
    function(data) {
      getAsTextJSON(data, file);
    },
    function(xhr) {
      console.log((file + ' ' + xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function(err) {
      console.error('An error happened when loading ' + file);
    }
  );
}

function getAsText(file, url) {
  let reader = new FileReader();
  reader.readAsText(file);
  reader.onProgress = updateProgress;
  reader.onload = loaded;
  reader.onerror = errorHandler;
  reader.url = url;
  let text = reader.result;
}

function getAsTextVoronoi(file, url) {
  let reader = new FileReader();
  reader.readAsText(file);
  reader.onProgress = updateProgress;
  reader.onload = loadedVoronoi;
  reader.onerror = errorHandler;
  reader.url = url;
  let text = reader.result;
}

function getAsTextMeta(file, url) {
  let reader = new FileReader();
  reader.readAsText(file);
  reader.onProgress = updateProgress;
  reader.onload = loadedMeta;
  reader.onerror = errorHandler;
  reader.url = url;
  let text = reader.result;
}

function getAsTextJSON(file, url) {
  let reader = new FileReader();
  reader.readAsText(file);
  reader.onProgress = updateProgress;
  reader.onload = loadedJSON;
  reader.onerror = errorHandler;
  reader.url = url;
  let text = reader.result;
}

function updateProgress(evt) {
  if (evt.lengthComputable) {
    let loaded = (evt.loaded / evt.total);
  }
}

function errorHandler(evt) {
  if (evt.target.error.name == "NotReadableError") {
    console.log("The file could not be read");
  }
}

function loadedVoronoi(evt) {
  let fileString = evt.target.result;
  let lines = fileString.split('\n');
  let element_count = (lines[0].split(' ').length);
  let filename = evt.target.url;
  let result;
  if (element_count > 2) {
    result = BUILD.loadVoronoi(city_all, lines, filename);
  } else {
    result = PATH.loadNeighbors(city_all, lines, filename);
    city_all = result.all;
    voronoiLoaded = true;
  }
  city_all = result.all;
}

function loadedMeta(evt) {
  let fileString = evt.target.result;
  let lines = fileString.split('\n');
  let filename = evt.target.url;
  let result = PATH.loadMeta(city_all, lines, filename);
  city_all = result.all;
  metaLoaded = true;
}

function fileToLayer(filename) {
  let start = filename.lastIndexOf('/');
  let end = filename.lastIndexOf('_');
  return filename.substring(start + 1, end);
}

function loadedJSON(evt) {
  let fileString = evt.target.result;
  let lines = fileString.split('\n');
  let filename = evt.target.url;
  if(filename.includes("bucket2peel")) {
    bucketLoaded = true;
    bucketData = JSON.parse(fileString);
  }else if(filename.includes("entropy")) {
    entropyLoaded = true;
    entropy = JSON.parse(fileString);
  }else if(filename.includes("layers-dists")) {
    lighthouseLoaded = true;
    lighthouseData = JSON.parse(fileString);
    let sum = sum_obj(lighthouseData);
    // scene_city_description.innerText = scene_city_description.innerText.concat(", # fixed point values: "+Object.keys(lighthouseData).length);
    // scene_city_description.innerText = scene_city_description.innerText.concat(", # connected fixed point: "+sum);
  }else if(filename.includes("summary")){
    summaryData = JSON.parse(fileString);
    scene_city_description.innerText = objToString(summaryData);
  }
}

function objToString (obj) {
    var str = '| ';
    for (var p in obj) {
        if (obj.hasOwnProperty(p)) {
            str += p + ': ' + obj[p]+' | ';
        }
    }
    return str;
}

function sum_obj(obj){
  var sum = 0;
  for( var el in obj ) {
    if( obj.hasOwnProperty( el ) ) {
      for( let el2 in obj[el]){
        if( obj[el].hasOwnProperty( el2 ) ) {
          sum += obj[el][el2];
        }
      }
    }
  }
  return sum;
}

function loaded(evt) {
  let fileString = evt.target.result;
  let filename = evt.target.url;
  let layer_name;
  let lines = fileString.split('\n');
  let element_count = (lines[0].split(' ')).length;
  // need to update when SPIRAL.txt updates
  if (element_count == 7) {
    // console.log("loaded: SPIRAL file");
    let spiral = BUILD.loadSpiral(scene_city, lines, city_all, grass_objects, bush_objects, city_tracking, x_scale);
    city_all = spiral.all;
    city_tracking = spiral.tracking;
    grass_objects = spiral.grass;
    bush_objects = spiral.bush;
    city_to_load = spiral.city_count;
    for (const [key, value] of Object.entries(city_all)) {
      let layer_name = key;
      city_list.push(layer_name);
      if (addBuildings) {
        let color_file = source_dir + layer_name + "_color.txt";
        let floor_file = source_dir + layer_name + "_floor.txt";
        loadFile(color_file, manager);
        loadFile(floor_file, manager);
      }
    }
    // scene_city_description.innerText = scene_city_description.innerText.concat(", # buildings: "+city_to_load);
    loadVoronoiFile(voronoi_file, manager);
    loadVoronoiFile(neighbors_file, manager);
    loadMetaFile(meta_file, manager);

  } else if (element_count == 6) {
    // console.log("loaded: color file");
    layer_name = fileToLayer(filename);
    let result = BUILD.loadColor(lines, layer_name, city_all, city_tracking);
    city_all = result.all;
    city_tracking = result.tracking;
  } else if (element_count == 3) {
    // console.log("loaded: floor file");
    layer_name = fileToLayer(filename);
    let result = BUILD.loadFloor(lines, layer_name, city_all, city_tracking);
    city_all = result.all;
    city_tracking = result.tracking;
  }
}

function dayAndNight(isNight, light_objects, window_objects) {
  if (isNight) {
    scene_city.background = new THREE.Color('midnightblue');
    light_objects.dayLights.forEach(object => object.visible = false);
    light_objects.nightLight.visible = true;
    light_objects.spotLight.visible = false;
    light_objects.selectionLights.forEach(object => object.visible = false);
    window_objects.forEach(object => object.visible = true);
    animate();
  } else {
    scene_city.background = new THREE.Color('skyblue');
    light_objects.dayLights.forEach(object => object.visible = true);
    light_objects.selectionLights.forEach(object => object.visible = true);
    light_objects.nightLight.visible = false;
    light_objects.spotLight.visible = true;
    window_objects.forEach(object => object.visible = false);
    animate();
  }
}

function createControls(camera) {
  controls = new TrackballControls(camera, renderer.domElement);
  controls.rotateSpeed = 1.0;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 0.8;
  controls.keys = [65, 83, 68];
}

// previous onWindowResize
function updateSize() {
  let aspect = window.innerWidth / window.innerHeight;

  perspectiveCamera.aspect = aspect;
  perspectiveCamera.updateProjectionMatrix();

  orthographicCamera.left = -frustumSize * aspect / 2;
  orthographicCamera.right = frustumSize * aspect / 2;
  orthographicCamera.top = frustumSize / 2;
  orthographicCamera.bottom = -frustumSize / 2;
  orthographicCamera.updateProjectionMatrix();

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if ( canvas.width !== width || canvas.height !== height ) {
    renderer.setSize( width, height, false );
  }
  scenes.forEach(scene => scene.userData.controls.handleResize());
}

function animate() {
  updateSize();
  requestAnimationFrame(animate);
  scenes.forEach(scene => scene.userData.controls.update());
  // stats.update();
  if (city_to_load > 0 && addBuildings) {
    console.log("animate: run createCityMeshes()");
    let result = BUILD.createCityMeshes(scene_city, objects, city_all, city_tracking, truss_objects, window_objects, flag_objects, city_to_load, y_scale, paramsL.dataSet, params.isNight);
    scene_city = result.scene;
    city_all = result.all;
    city_tracking = result.tracking;
    objects = result.objects;
    city_to_load = result.remain;
    truss_objects = result.truss;
    window_objects = result.window;
  } else if (city_to_load == 0 && printTime) {
    let end_time = new Date();
    let end_time_string = end_time.getMinutes() + ':' + end_time.getSeconds() + '.' + end_time.getMilliseconds();
    console.log("start time is " + start_time_string);
    console.log("end time is " + end_time_string);
    printTime = false;
  }
  render();
}

function render() {
  renderer.setScissorTest( false );
  renderer.clear();
  renderer.setScissorTest( true );

  let camera = (params.orthographicCamera) ? orthographicCamera : perspectiveCamera;
  scenes.forEach(function (scene) {
    const rect = scene.userData.view.getBoundingClientRect();

    // check if it's offscreen. If so skip it
    if ( rect.bottom < 0 || rect.top > renderer.domElement.clientHeight ||
         rect.right < 0 || rect.left > renderer.domElement.clientWidth ) {
        return; // it's off screen
    }

    // set the viewport
    const width = rect.right - rect.left;
    const height = rect.bottom - rect.top;
    const left = rect.left;
    const bottom = renderer.domElement.clientHeight - rect.bottom;

    renderer.setViewport( left, bottom, width, height );
    renderer.setScissor( left, bottom, width, height );

    renderer.render( scene, scene.userData.camera );
  });
  if (toPanCity) {
    // console.log("pan city "+theta);
    theta += 0.1;
    camera.position.x = radius * Math.sin(THREE.MathUtils.degToRad(theta));
    // camera.position.y = radius/5+(radius/10) * Math.sin( THREE.MathUtils.degToRad( theta ) );
    camera.position.z = radius * Math.cos(THREE.MathUtils.degToRad(theta));
    camera.lookAt(scene.position);
    if (theta > 360) toPanCity = false;
  } else if (toPanBuilding) {
    // console.log("pan around building "+params.root);
    theta += 0.1;
    // let building_position = new THREE.Vector3(100,0,100);
    let root_building = root_dropdown.getValue();
    let building_position = city_all[root_building].coords;
    controls.target = new THREE.Vector3(building_position[0], 30, building_position[1]);
    camera.position.x = building_position[0] + radius * Math.sin(THREE.MathUtils.degToRad(theta));
    camera.position.y = 100;
    // camera.position.y = radius * Math.sin( THREE.MathUtils.degToRad( theta ) );
    camera.position.z = building_position[1] + radius * Math.cos(THREE.MathUtils.degToRad(theta));
    if (theta > 360) toPanBuilding = false;
  } else if (toZoomBuilding) {
    // console.log("zoom in to "+root_dropdown.getValue());
    // let building_position = new THREE.Vector3(100,0,100);
    let root_building = root_dropdown.getValue();
    let building_position = city_all[root_building].coords;
    controls.target = new THREE.Vector3(building_position[0], 10, building_position[1]);
    // console.log(building_position[0]);
    if (Math.abs(building_position[0] - camera.position.x) >= 20) {
      camera.position.x += theta * (building_position[0] - camera.position.x);
      // console.log("x");
    }
    if (Math.abs(camera.position.y) >= 100) {
      camera.position.y += theta * (0 - camera.position.y);
      // console.log("y");
    }
    if (Math.abs(building_position[1] - camera.position.z) >= 20) {
      camera.position.z += theta * (building_position[1] - camera.position.z);
      // console.log("z");  
    } else {
      toZoomBuilding = false;
    }
  }
  if(!lighthouseDone) {
    if(lighthouseLoaded && entropyLoaded && bucketLoaded) {
      let result = LH.loadCitySummaryFile(lighthouseData, scene_lighthouse, lighthouse_objects, entropy, first_key_color_dict, first_key_list, select_fixed_point, color_display, light_intensity, bucketData, key_to_buckets);
      scene_lighthouse = result.scene;
      lighthouse_objects = result.lighthouse_objects;
      first_key_color_dict = result.first_key_color_dict;
      first_key_list = result.first_key_list;
      select_fixed_point = result.select_fixed_point;
      color_display = result.color_display;
      light_intensity = result.light_intensity;
      key_to_buckets = result.key_to_buckets;
      selected_buildings = key_to_buckets[first_key_list[0]];
      // console.log("!lighthouseDone: selected_buildings "+selected_buildings);
      lighthouseDone = true;
    }
  }
  if(lighthouseDone && (!pathPlanningDone)) {
    if (metaLoaded && voronoiLoaded && lighthouseLoaded && bucketLoaded ) {
      pathPlanningDone = true;
      // console.log("pathPlanningDone "+pathPlanningDone+", metaLoaded && voronoiLoaded && lighthouseLoaded && bucketLoaded");
      let selected_buildings_list;
      select_fixed_point.onChange (
        function (key) {
          const intensity = entropy[parseInt(key)];
          color_display.setValue(first_key_color_dict[parseInt(key)]);
          light_intensity.setValue(intensity);
          // console.log("light_intensity2 "+entropy[parseInt(key)]);
          // console.log("key "+key);
          // console.log("first_key_list[key] "+first_key_list[parseInt(key)]);
          selected_buildings = key_to_buckets[key];
          light_objects.selectionLights.forEach(object => object.visible=false);
          let result = LH.updateSelectionLights(city_all, light_objects, selected_buildings);
          light_objects = result.light_objects;
          selected_buildings_list = result.selected_buildings;
          LH.updateDropdown(root_dropdown_highlighted, selected_buildings_list);
          let highlighter = lighthouse_objects[lighthouse_objects.length-1];
          let index = first_key_list.indexOf(String(key));
          let selected = lighthouse_objects[index];
          highlighter.position.set(0, selected.Y_pos, 0);
          highlighter.scale.set(selected.maxR*1.1, selected.dY, selected.maxR*1.1);
        }
      );
      let result_2 = PATH.pathPlanning(city_list[city_list.length-1], scene_city, city_all, light_objects, selected_buildings);
      scene_city = result_2.scene;
      path_objects = result_2.path;
      light_objects = result_2.light_objects;
      let result = LH.updateSelectionLights(city_all, light_objects, selected_buildings);
      light_objects = result.light_objects;
      selected_buildings_list = result.selected_buildings;
      PATH.updateDropdown(root_dropdown, city_list);
      root_dropdown.setValue(city_list[city_list.length-1]);
      // console.log("LH.updateDropdown: ",selected_buildings_list);
      LH.updateDropdown(root_dropdown_highlighted, selected_buildings_list);
    }
  }
}

function panCity() {
  theta = 0;
  radius = 400;
  toPanCity = true;
  toPanBuilding = false;
  toZoomBuilding = false;
  render();
}

function panBuilding() {
  theta = 0;
  radius = 50;
  toPanBuilding = true;
  toPanCity = false;
  toZoomBuilding = false;
  render();
}

function zoomBuilding() {
  theta = 0.003;
  toZoomBuilding = true;
  toPanBuilding = false;
  toPanCity = false;
  render();
}

function onMouseMove(event) {
  // mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
  // mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
  mouse.x = (event.clientX / (window.clientWidth-sliderPos)) * 2 - 1;
  mouse.y = -(event.clientY / (window.clientHeight-sliderPos)) * 2 + 1;
  let camera = (params.orthographicCamera) ? orthographicCamera : perspectiveCamera;
  raycaster.setFromCamera(mouse, camera);

  let intersects = raycaster.intersectObjects(objects);
  // Toggle rotation bool for meshes that we clicked
  if (intersects.length > 0) {
    // if the closest object intersected is not the currently stored intersection object
    if (intersects[0].object != INTERSECTED) {
      INTERSECTED = intersects[0].object;
      if (intersects[0].object.floor_name) {
        building_params.floor = intersects[0].object.floor_name;
      } else {
        building_params.floor = '';
      }
      if (intersects[0].object.layer_name) {
        building_params.layer = intersects[0].object.layer_name;
      } else {
        building_params.layer = '';
      }
    }
  } else // there are no intersections
  {
    INTERSECTED = null;
    building_params.floor = '';
    building_params.layer = '';
  }
}

function onMouseDownLH(event){
  event.preventDefault();
  const rect = scene_lighthouse.userData.view.getBoundingClientRect();
  const width = rect.right-rect.left;
  const height = rect.bottom-rect.top;
  mouse.x=(event.clientX/width)*2-1;
  mouse.y=-((event.clientY-84)/height)*2+1;
  // console.log("onMouseDownLH, event.clientX = ",event.clientX, " event.clientY = ",event.clientY);
  raycaster.setFromCamera(mouse, perspectiveCameraL);
  const intersects=raycaster.intersectObjects(scene_lighthouse.children);
  if(intersects.length>0){
    const intersected = intersects[0].object;
    if(intersected.name){
      // console.log("onMouseDownLH ",intersected.name);
      select_fixed_point.setValue(intersected.name);
      let highlighter = lighthouse_objects[lighthouse_objects.length-1];
      highlighter.position.set(0, intersected.Y_pos, 0);
      highlighter.scale.set(intersected.maxR*1.1, intersected.dY, intersected.maxR*1.1);
      // console.log("LH intersects: ",intersected.name,intersected.maxR,intersected.dY,intersected.Y_pos);  
    }
  }
}

function onMouseDown(event) {
  // mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
  // mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
  event.preventDefault();
  const rect = scene_city.userData.view.getBoundingClientRect();
  const width = rect.right-rect.left;
  const height = rect.bottom-rect.top;
  mouse.x = ((event.clientX-sliderPos)/width)*2-1;
  mouse.y = -((event.clientY)/height)*2+1;
  let camera = (params.orthographicCamera) ? orthographicCamera : perspectiveCamera;
  raycaster.setFromCamera(mouse, camera);

  let intersects = raycaster.intersectObjects(objects);
  if (intersects.length > 0) {
    console.log("clicked on " + intersects[0].object.name);
  }
}

function initSlider() {

  const slider = document.querySelector('#custom_slider');
  slider.style.left = "341px";

  function onPointerDown() {

    if (event.isPrimary === false) return;
    
    // controls.enabled = true;
    scenes.forEach(scene => scene.userData.controls.enabled = true);

    window.addEventListener('pointermove', onPointerMove, false);
    window.addEventListener('pointerup', onPointerUp, false);

  }

  function onPointerUp() {

    // controls.enabled = true;
    scenes.forEach(scene => scene.userData.controls.enabled = true);
    
    window.removeEventListener('pointermove', onPointerMove, false);
    window.removeEventListener('pointerup', onPointerUp, false);
    slider.style.left = "-40px";
    guiL.close();
    sliderPos = 0;
  }

  function onPointerMove(e) {
    if (event.isPrimary === false) return;
    sliderPos = Math.max(0, Math.min(window.innerWidth, e.pageX));
    slider.style.left = sliderPos - (slider.offsetWidth / 2) + "px";
    slider.style.left = "-40px";
    guiL.close();
    sliderPos = 0;
  }

  slider.style.touchAction = 'none'; // disable touch scroll
  slider.addEventListener('pointerdown', onPointerDown);
}
