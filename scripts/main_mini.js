import * as THREE from '../node_modules/three/build/three.module.js';
import {
  TrackballControls
} from '../node_modules/three/examples/jsm/controls/TrackballControls.js';
import {
  OrbitControls
} from "../node_modules/three/examples/jsm/controls/OrbitControls.js";
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
import * as CM from './parts/cityMapMini.js';
import { DataTexture3D } from '../three.js/build/three.module.js';

const hostAddress = 'http://127.0.0.1:16134/'

let addBuildings = true, addDagViews = true, onDagViews = false;

THREE.Cache.enabled = true;
const scenes = [];
let controls, renderer, canvas;
let perspectiveCamera, orthographicCamera, perspectiveCameraL;
// let spiral = []; 
let frustumSize = 400;
let aspect = window.innerWidth / window.innerHeight;
let scene_city = new THREE.Scene();
let scene_lighthouse = new THREE.Scene();
let sliderPos = 365;
let mapPos = 75; // top building map

const raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let INTERSECTED, glyphINTERSECTED;
let city_tracking = {};
let city_all = {};
let city_list = [];
let objects = [];
let ground_object;
let path_objects = [];
let ceil_objects = [];
let middle_objects = [];
let truss_objects = [];
let window_objects = [];
let flag_objects = [];
let grass_objects = [];
let bush_objects = [];
let light_objects = {};
let key_to_buckets = {};
let arrow_objects = {};
let src_objects = {};
let tgt_objects = {};
let flag_objects_new = {};
let glyph_objects = [];
let glyphBack_objects = [];
let metaLoaded = false,
  voronoiLoaded = false,
  lighthouseLoaded = false,
  entropyLoaded = false,
  bucketLoaded = false,
  pathPlanningDone = false,
  lighthouseDone = false;
let city_to_load, city_to_load_old;
let color_display, light_intensity;
let time = new Date();
let printTime = true;
let start_time_string = time.getMinutes() + ':' + time.getSeconds() + '.' + time.getMilliseconds();
let root_dropdown, root_dropdown_highlighted, visited_inner_views;
let inner_view_history = [];
let gui, guiL, select_fixed_point;
let guiDataset;
let mapControlHighLight = false;
let mapControlHighLightBuilding = [];
let mapWaveSelection = false;
let mapWaveSelectedName;
let dagSizeDict;

let bucketNum = 0;

let global_building = {};
let allowed;
let shouldArrowBeVisible;
let visibleRadius = 50;

let showingGallery = false;
let buildingMapControls = {showingGallery: showingGallery}

let buildingCoordMax = 0;

let selectingBuildingTour = false;
let selectingPathNavigation = false;
let selectingTourNavigation = false;

let tempCityPathObjList = [];
let tempPathNewStartIdx = 0;
let clearTempPathFlag = true;

let glyphDoneFlag = false;
let glyphData = {};
let mouseOnGlyph = false;

const data_list = ['got', 'com-friendster-9-2', 'starwars'];
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
// Camera offset
let offset = 15;
// GUI parameters
let params = {
  orthographicCamera: false,
  resetCamera: function() {
    toPanBuilding = false;
    toPanCity = false;
    toZoomBuilding = false;
    console.log(controls)
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
  all: 'building',
  highlighted: 'building',
  outer: true,
  middle: true,
  ceilVisible: false,
  isNight: false,
  visitedInner: 'building',
  goInnerView: function() {
    let bottom = document.getElementById("inner-view").offsetTop;
    let selected_building = root_dropdown.getValue();

    let wavemap_ID_ID_freq = selected_building.split('_');
    let file;
    let validCheck = true;
    let forkView = false;
    let nameSuffix = '';
    const validSize = 262144;
    if (!mapWaveSelection) {
      // console.log(dagSizeDict)
      const key = 'dagmeta_' + wavemap_ID_ID_freq[1] + '_' + wavemap_ID_ID_freq[2]
      if (dagSizeDict.hasOwnProperty(key)) {
        console.log(dagSizeDict[key])
        if (parseInt(dagSizeDict[key]) > parseInt(validSize)) {
          validCheck = false;
          alert('Please select a wave');
        }
      }
      file = '../data_dags/' + paramsL.dataSet + '/dagmeta_' + wavemap_ID_ID_freq[1] + '_' + wavemap_ID_ID_freq[2] + '.json';
    } else {
      // console.log(dagSizeDict)
      console.log(dagSizeDict['dagmeta_' + mapWaveSelectedName])
      if (parseInt(dagSizeDict['dagmeta_' + mapWaveSelectedName]) > parseInt(validSize)) {
        console.log('frag fork')
        // validCheck = false;
        forkView = true;
        nameSuffix = 'f'+mapWaveSelectedName.split('w')[1];
        file = '../data_dags/' + paramsL.dataSet + '/dagmeta_' + mapWaveSelectedName.replace('w', 'f') + '.json'
      } else {
        nameSuffix = 'w'+mapWaveSelectedName.split('w')[1];
        file = '../data_dags/' + paramsL.dataSet + '/dagmeta_' + mapWaveSelectedName + '.json';
      }
    }
    mapWaveSelection = false;
    if (validCheck) {
      onDagViews = true;
      inner_view_history.push(selected_building);
      window.scrollTo(0,bottom);
      console.log(inner_view_history);
      LH.updateDropdown(visited_inner_views, inner_view_history);
      visited_inner_views.setValue(inner_view_history[inner_view_history.length-1]);
      arrow_objects[selected_building].visible = true;
      
      console.log("******** " + selected_building + " *********");
      console.log("******** " + paramsL.dataSet + " *********");

      console.log("Loading: ", file);
      loadFile2(file, forkView, nameSuffix);
      loadLayer(paramsL.dataSet, wavemap_ID_ID_freq[1], wavemap_ID_ID_freq[2]);
    }
    onDagViews = false;
  },
  goOuterView: function() {
    let top = document.getElementById("city-view".offsetTop);
    onDagViews = false;
    window.scrollTo(0,top);
  },
  clearVisitedInner: function() {
    inner_view_history = [];
    LH.updateDropdown(visited_inner_views, inner_view_history);
    visited_inner_views.setValue("");
    let keys = Object.keys(arrow_objects);
    keys.forEach(function(key){
      arrow_objects[key].visible = false;
    });
    console.log(inner_view_history);
  }
};
// lighthouse
let first_key_list = [1];
let first_key_color_dict = {
  0: "#000000"
};
let paramsL = {
  dataSet: data_list[1],
  fixedPoint: first_key_list[0],
  color: first_key_color_dict[0],
  lightIntensity: 0.1
}
let lighthouse_objects = [];
let entropy, bucketData = {}, lighthouseData = {}, summaryData = {};
// let selected_buildings = ["1_405063", "1_62999", "8_4342010", "1_250725", "1_140109", "3_3191982", "11_2983724"];
let selected_buildings = [];
const data_dir = "../data/";
const python_dir = "../python/";
const lighthouse_dir = "../scripts/lighthouse/";
const map_dir = "../data_maps/";
let source_dir = data_dir + paramsL.dataSet + "/";
let spiral_file = data_dir + paramsL.dataSet + "/SPIRAL.txt";
let voronoi_file = python_dir + paramsL.dataSet + "/voronoi.txt";
// let neighbors_file = python_dir + paramsL.dataSet + "/neighbors.txt";
let neighbors_file = python_dir + paramsL.dataSet + "/neighbors_weighted.txt";
let meta_file = python_dir + paramsL.dataSet + "/metagraph_normalized.txt";
let lighthouse_file = lighthouse_dir+paramsL.dataSet+'-layers-dists.json';
let entropy_file = lighthouse_dir+paramsL.dataSet+'_entropy.json';
let bucket_file = lighthouse_dir+paramsL.dataSet+'-bucket2peels.json';
let summary_file = data_dir + paramsL.dataSet+'-summary.json';
let buildingMap_file = map_dir + paramsL.dataSet+'-lccWaves.vBuck.b.p.mm.json';
let buildingMapBucket_file = map_dir + 'building2bucket-'+paramsL.dataSet+'.json';
let dagSize_file = map_dir + paramsL.dataSet+'-dagSize.json';
let patterns_file = map_dir + paramsL.dataSet+'-patterns.txt';
let building_params = {
  floor: '',
  layer: '',
  position: ''
};
let water;
const scene_city_element = document.getElementById("city-element");
const scene_city_description = document.getElementById("city-description");
let views, lighthouse_view, city_view;

let overlay_slider, overlay_circle_controller, overlay_reset_camera, overlay_zoom_in, overlay_zoom_out;
let controllerOnHold = {status: false, target: null};

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
  scene_city.background = new THREE.Color('#cdecc6');

  // city map
  console.log(buildingMap_file);
  // function handleMouseOver(selectedDot, data) {
  //   // console.log(data)
  //   // console.log(selectedDot);
  //   // console.log(buildingMapControls.ignoreHover)
  //   // console.log(buildingMapControls)
  //   if (!buildingMapControls.ignoreHover) {
  //     mapControlHighLight = true;
  //     mapControlHighLightBuilding = data['buildingName'];
  //     select_fixed_point.setValue(selectedDot['layer']);  // NOTE: 2022-1-22 temp disable
  //   }
  //   // console.log(select_fixed_point);
  // };

  // function handleMouseOut(selectedDot, data) {
  //   // console.log(selectedDot);
  //   // select_fixed_point.setValue(selectedDot['layer']);
  //   // console.log(select_fixed_point);
  //   // console.log('out')
  // };

  // function handleLeftClick(selectedDot, data) {
  //   mapControlHighLight = true;
  //   mapControlHighLightBuilding = data['buildingName'];
  //   select_fixed_point.setValue(selectedDot['layer']); // NOTE: 2022-1-22 temp disable
  //   // theta = 0.003;
  //   // toZoomBuilding = true;
  //   // toPanBuilding = false;
  //   // toPanCity = false;
  //   // render();
  //   // zoomBuilding();
  //   // console.log(select_fixed_point);
  //   // console.log('click')

  //   let selectedBuilding = '';
  //   const shortName = data.buildingName[0];
  //   for (const buildingName of Object.keys(city_all.graph)) {
  //     const splitedName = buildingName.split('_');
  //     if (`${splitedName[1]}_${splitedName[2]}` === shortName) {
  //       selectedBuilding = buildingName;
  //     }
  //   }
  //   CM.enableHighLight(city_all.building2BucketPeel, selectedBuilding);

  //   if (selectingBuildingTour) {
  //     document.getElementById('city-buidling-tour-buidling').value = selectedBuilding;
  //   } else if (selectingPathNavigation) {
  //     document.getElementById('city-path-navigation-src').value = selectedBuilding;
  //   } else if (selectingTourNavigation) {
  //     document.getElementById('city-tour-navigation-src').value = selectedBuilding;
  //   }
  // };

  // function addMapDropListHandle() {
  //   const spiralDropListCollection = document.getElementsByClassName("mapSpiralDropList");
  //   // console.log(spiralDropListCollection);
  //   for (const spiralDropList of spiralDropListCollection) {
  //     spiralDropList.addEventListener('change', function() {
  //       // console.log(this.value);
  //       // console.log(root_dropdown_highlighted.domElement.children[0].options)
  //       // console.log(Array.from(root_dropdown_highlighted.domElement.children[0].options).map(x => x.text))
  //       // console.log(Array.from(root_dropdown_highlighted.domElement.children[0].options).map(x => x.text)[this.value])
  //       const selectedBuilding = Array.from(root_dropdown_highlighted.domElement.children[0].options).map(x => x.text)[this.value]
  //       root_dropdown_highlighted.setValue(selectedBuilding);
  //       for (const [tempBuilding, tempArrow] of Object.entries(arrow_objects)) {
  //         tempArrow.visible = false;
  //       };
  //       // console.log(arrow_objects)
  //       arrow_objects[selectedBuilding].visible = true;
  //       if (selectingBuildingTour) {
  //         document.getElementById('city-buidling-tour-buidling').value = selectedBuilding;
  //       } else if (selectingPathNavigation) {
  //         document.getElementById('city-path-navigation-src').value = selectedBuilding;
  //       } else if (selectingTourNavigation) {
  //         document.getElementById('city-tour-navigation-src').value = selectedBuilding;
  //       }
  //     });
  //   };

  //   const buildingDropListCollection = document.getElementsByClassName("mapBuildingDropList");
  //   for (const buildingDropList of buildingDropListCollection) {
  //     buildingDropList.addEventListener('change', function() {
  //       const waveIdx = this.value;
  //       // console.log(waveIdx);
  //       if (parseInt(waveIdx) === 0) {
  //         mapWaveSelection = false;
  //       } else {
  //         mapWaveSelection = true;
  //         // console.log(mapControlHighLightBuilding)
  //         mapWaveSelectedName = mapControlHighLightBuilding+'w'+waveIdx;
  //         console.log(mapWaveSelectedName);
  //         // console.log(this.parentNode);
  //       };
  //     });
  //   };
  // };

  // function addZoomButtonHandle() {
  //   const spiralZoomButtonCollection = document.getElementsByClassName("mapSpiralZoomButton");
  //   for (const spiralZoomButton of spiralZoomButtonCollection) {
  //     spiralZoomButton.addEventListener('click', function() {
  //       // zoomBuilding();
  //       console.log(root_dropdown_highlighted.domElement.children[0].value)
  //       const buildingName = root_dropdown_highlighted.domElement.children[0].value;
  //       CM.enableHighLight(city_all.building2BucketPeel, buildingName, true);
  //       buildingTour(buildingName);
  //     });
  //   };
  //   const buildingZoomButtonCollection = document.getElementsByClassName("mapBuildingZoomButton");
  //   for (const buildingZoomButton of buildingZoomButtonCollection) {
  //     buildingZoomButton.addEventListener('click', function() {
  //       // zoomBuilding();
  //       console.log(root_dropdown_highlighted.domElement.children[0].value)
  //       const buildingName = root_dropdown_highlighted.domElement.children[0].value;
  //       CM.enableHighLight(city_all.building2BucketPeel, buildingName, true);
  //       buildingTour(buildingName);
  //     });
  //   };
  // };

  // Promise.all([
  //   d3.json(buildingMap_file),
  //   d3.json(buildingMapBucket_file),
  //   d3.json(bucket_file)
  // ]).then(function (datas) {
  //   city_all.building2BucketPeel = CM.drawMap(datas, buildingMapControls)
  // }).then(() => CM.addOnMouseOver(handleMouseOver, buildingMapControls))
  //   .then(() => CM.addOnMouseOut(handleMouseOut, buildingMapControls))
  //   .then(() => CM.addOnLeftClick(handleLeftClick, buildingMapControls))
  //   .then(() => addMapDropListHandle())
  //   .then(() => addZoomButtonHandle());
  drawMap('city-building-map')
  
  d3.json(dagSize_file).then(data => dagSizeDict = data);
  // city summary
//   scene_city_description.innerText = paramsL.dataSet+" V: "+V[paramsL.dataSet]+", E: "+E[paramsL.dataSet];
//   scene_city_description.innerText = scene_city_description.innerText.concat(", CC");
  let deg_img = document.createElement("img");
  deg_img.src = data_dir+paramsL.dataSet+"_deg.png";
  // deg_img.style.width = '50%';
  console.log(scene_city_description);
  console.log(city_view);
  console.log(deg_img);
  document.getElementById("city-description-wrap").appendChild(deg_img);

  let largest_dist_img = document.createElement("img");
  largest_dist_img.src = data_dir+paramsL.dataSet+"_largest_dist.png";
  document.getElementById("city-largest-building-button-span").appendChild(largest_dist_img);

  let tallest_dist_img = document.createElement("img");
  tallest_dist_img.src = data_dir+paramsL.dataSet+"_tallest_dist.png";
  document.getElementById("city-tallest-building-button-span").appendChild(tallest_dist_img);

  let densest_dist_img = document.createElement("img");
  densest_dist_img.src = data_dir+paramsL.dataSet+"_densest_dist.png";
  document.getElementById("city-densest-building-button-span").appendChild(densest_dist_img);

  let diverse_dist_img = document.createElement("img");
  diverse_dist_img.src = data_dir+paramsL.dataSet+"_diverse_dist.png";
  document.getElementById("city-diverse-building-button-span").appendChild(diverse_dist_img);
  
  perspectiveCamera = new THREE.PerspectiveCamera(60, (window.innerWidth-sliderPos)/window.innerHeight, 1, 4000);
  perspectiveCamera.position.z = 600;
  perspectiveCamera.position.y = 350;
  orthographicCamera = new THREE.OrthographicCamera(frustumSize * aspect / -2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / -2, 1, 1000);
  orthographicCamera.position.z = 20;
  scene_city.userData.camera = (params.orthographicCamera) ? orthographicCamera : perspectiveCamera;

  createControls(perspectiveCamera);
  
  // const city_controls = new TrackballControls(scene_city.userData.camera, city_view);
  const city_controls = new OrbitControls(scene_city.userData.camera, city_view);
  city_controls.minDistance = 20;
  city_controls.maxDistance = 800;
  city_controls.maxPolarAngle = Math.PI / 2 ;
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
    // spotLight: new THREE.SpotLight(0xffffff, 0.6, 0, Math.PI / 2, 1, 1),
    selectionLights:[]
  };
  scene_city.add(light_objects['ambientLight']);
  light_objects.dayLights[0].position.set(1000, 1000, 1000);
  light_objects.dayLights[1].position.set(-500, 500, 0);
  light_objects.dayLights.forEach(object => scene_city.add(object));
  // light_objects.spotLight.position.set(0, 30, 0);
  // scene_city.add(light_objects.spotLight);
  // scene_city.add(light_objects.spotLight.target);
  // light_objects.spotLight.visible = false;
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
    width: 362,
    height: 330
  });
  gui.domElement.style = "z-index: 3";
  gui.domElement.id = 'cityGUI';
  // console.log(document.getElementById("city-gui-container"))
  document.getElementById("city-gui-container").appendChild(gui.domElement);
  gui.close();

  guiDataset = new GUI({
    width: 362,
  });
  guiDataset.domElement.style = "z-index: 3";
  guiDataset.domElement.id = 'cityGUI';
  // console.log(document.getElementById("dataset-gui-container"))
  document.getElementById("dataset-gui-container").appendChild(guiDataset.domElement);

  // let f0 = guiDataset.addFolder('Data Set');
  let selectData = guiDataset.add(paramsL, 'dataSet', data_list).name('Choose Data Set');
  selectData.setValue(paramsL.dataSet);
  selectData.onChange(
    function(dataSet) {
      if(addDagViews) {
        setStrataUrl('?data=nodata');        
      }
      objects.every(object => scene_city.remove(object));
      if (clearTempPathFlag) {
        clearTempPath();
      } else {
        console.log('keep path')
      }
      path_objects.every(object => scene_city.remove(object));
      window_objects.every(object => scene_city.remove(object));
      flag_objects.every(object => scene_city.remove(object));
      grass_objects.every(object => scene_city.remove(object));
      ceil_objects.every(object => scene_city.remove(object));
      middle_objects.every(object => scene_city.remove(object));
      truss_objects.every(object => scene_city.remove(object));
      bush_objects.every(object => scene_city.remove(object));
      glyph_objects.every(object => scene_city.remove(object));
      glyphBack_objects.every(object => scene_city.remove(object));
      let arrow_keys = Object.keys(arrow_objects);
      arrow_keys.forEach(function(key){
        scene_city.remove(arrow_objects[key]);
      });
      arrow_objects = {};
      let src_keys = Object.keys(src_objects);
      src_keys.forEach(function(key){
        scene_city.remove(src_objects[key]);
      });
      src_objects = {};
      let tgt_keys = Object.keys(tgt_objects);
      tgt_keys.forEach(function(key){
        scene_city.remove(tgt_objects[key]);
      });
      tgt_objects = {};

      //
      let flag_objects_new_keys = Object.keys(flag_objects_new);
      flag_objects_new_keys.forEach(function(key){
        scene_city.remove(flag_objects_new[key]);
      });
      flag_objects_new = {};
      //

      glyphDoneFlag = false;
      glyphData = {};

      // light_objects.spotLight.visible = false;
      light_objects.selectionLights.every(light => light.visible = false);
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
      lighthouse_file = lighthouse_dir+dataSet+'-layers-dists.json';
      entropy_file = lighthouse_dir+dataSet+'_entropy.json';
      bucket_file = lighthouse_dir+dataSet+'-bucket2peels.json';
      summary_file =  data_dir + dataSet + "-summary.json";

      time = new Date();
      manager = new THREE.LoadingManager();
      manager.onStart = function(url, itemsLoaded, itemsTotal) {
        console.log('Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');
      };
      start_time_string = time.getMinutes() + ':' + time.getSeconds() + '.' + time.getMilliseconds();
      city_tracking = {};
      city_all = {};
      city_list = [];
      objects = [], path_objects = [], ceil_objects = [], middle_objects = [], truss_objects = [];
      window_objects = [], flag_objects = [], arrow_objects = [], src_objects = [], tgt_objects = [], glyph_objects = [], glyphBack_objects = [];
      key_to_buckets = {};
      selected_buildings = [];
      lighthouseData = {}, entropy = {}, bucketData = {}, summaryData = {};
      metaLoaded = false, voronoiLoaded = false, entropyLoaded = false, lighthouseLoaded = false, bucketLoaded = false;
      pathPlanningDone = false, lighthouseDone = false;
      light_objects.selectionLights.forEach(object => object.visible = false);
      scene_city_description.innerText = "";
      loadBushData(source_dir);
      loadFile(spiral_file, manager);
      loadJSONFile(lighthouse_file, manager);
      loadJSONFile(entropy_file, manager);
      loadJSONFile(bucket_file, manager);
      loadJSONFile(summary_file, manager);
      animate();
    }
  );

  // f0.open();

  let f1 = gui.addFolder('Positioning Info');
  f1.add(building_params, 'position').name('floor id').listen();
  // f1.add(building_params, 'layer').name('layer info').listen();
  // f1.open();

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
  f3.add(params, 'middle').name('middle frustums').onChange(function(value) {
    middle_objects.forEach(object => object.visible = value);
    animate();
  });
  f3.add(params, 'ceilVisible').name('frustum ceiling').onChange(function(value) {
    ceil_objects.forEach(object => object.visible = value);
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

  let f4 = gui.addFolder('Spanning Tree Root');
  root_dropdown = f4.add(params, 'all', ['default', 'example 1', 'example 2']);
  root_dropdown.setValue('default');
  root_dropdown.onChange(
    function(value) {
      if(addDagViews) {
        setStrataUrl('?data=nodata');
      }
      if (clearTempPathFlag) {
        clearTempPath();
        path_objects.every(object => scene_city.remove(object));
        // animate(); NOTE: 2022-1-23: seems this line makes the whole page lagging, temp disabled
        path_objects = [];
        // console.log("394:"+value);
        let result = PATH.pathPlanning(value, scene_city, city_all, light_objects);
        scene_city = result.scene;
        path_objects = result.path;
        light_objects = result.light_objects;
        // console.log('addDagViews')
        // console.log(addDagViews)
        // if(onDagViews){
        //   console.log("******** " + value + " *********");
        //   console.log("******** " + paramsL.dataSet + " *********");
    
        //   let wavemap_ID_ID_freq = value.split('_');
        //   let file = '../data_dags/' + paramsL.dataSet + '/dagmeta_' + wavemap_ID_ID_freq[1] + '_' + wavemap_ID_ID_freq[2] + '.json';
        //   console.log("Loading: ", file);
        //   loadFile2(file);
        //   loadLayer(paramsL.dataSet, wavemap_ID_ID_freq[1], wavemap_ID_ID_freq[2]);  
        // }
        
      } else if (selectingPathNavigation || selectingTourNavigation) {
        console.log('no show root path')
      } else {
        path_objects.every(object => scene_city.remove(object));
        // animate(); NOTE: 2022-1-23: seems this line makes the whole page lagging, temp disabled
        path_objects = [];
        // console.log("394:"+value);
        let result = PATH.pathPlanning(value, scene_city, city_all, light_objects);
        scene_city = result.scene;
        path_objects = result.path;
        light_objects = result.light_objects;
        // console.log('addDagViews')
        // console.log(addDagViews)
        // if(onDagViews){
        //   console.log("******** " + value + " *********");
        //   console.log("******** " + paramsL.dataSet + " *********");
    
        //   let wavemap_ID_ID_freq = value.split('_');
        //   let file = '../data_dags/' + paramsL.dataSet + '/dagmeta_' + wavemap_ID_ID_freq[1] + '_' + wavemap_ID_ID_freq[2] + '.json';
        //   console.log("Loading: ", file);
        //   loadFile2(file);
        //   loadLayer(paramsL.dataSet, wavemap_ID_ID_freq[1], wavemap_ID_ID_freq[2]);  
        // }
        
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
  f4.add(params, 'goOuterView').name("Go City View"); // TODO: move to DAG view
  f4.add(params, 'clearVisitedInner').name("Clear Visited History");
  visited_inner_views = f4.add(params, 'visitedInner',[]).name("Visited Inner Views");
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
  waterMesh.visible = false;
  scene_city.add(waterMesh);

  city_view.addEventListener('mousemove',onMouseMove);
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
  // guiL.addFolder('data summary sculpture');
  select_fixed_point = guiL.add(paramsL, 'fixedPoint', first_key_list).name('choose fixed point');
  color_display = guiL.addColor(paramsL, 'color').name('display color');
  light_intensity = guiL.add(paramsL, 'lightIntensity').name('diversity');

  const light_intensity_GUI_elem = light_intensity.domElement.parentElement // get first dat.gui element
  const par_light_intensity_GUI_elem = light_intensity_GUI_elem.parentElement // get the list item containing a
  const color_display_GUI_elem = color_display.domElement.parentElement // get second element
  const par_color_display_GUI_elem = color_display_GUI_elem.parentElement // get the list item containing b
  const tab = document.createElement("table") // create table element
  const tr = document.createElement("tr") // create row element
  const td_a = document.createElement("td") // create column for a
  const td_b = document.createElement("td") // create column for b

  // build the table:
  td_a.appendChild(light_intensity_GUI_elem)
  td_b.appendChild(color_display_GUI_elem)
  tr.appendChild(td_a)
  tr.appendChild(td_b)
  tab.appendChild(tr)

  // add table to the list and remove empty list element
  par_light_intensity_GUI_elem.appendChild(tab)
  par_color_display_GUI_elem.remove()

  let customContainer = document.getElementById('first-gui-container');
  customContainer.appendChild(guiL.domElement);
  guiL.close();
}

function zoomAtBuilding(selected_building){  
  let camera = scene_city.userData.camera;  
  let initialCameraPosition = camera.position;
  let initialTargetPosition = scene_city.userData.controls.target;

  let building = city_all[selected_building].coords;
  let building_position = new THREE.Vector3(building[0], building[3], building[1]);
  let arrow_position = arrow_objects[selected_building].position;

  let finalTargetPosition = new THREE.Vector3(building_position.x, arrow_position.y * 0.40, building_position.z);
  let move_away = arrow_position.y / (2 * Math.tan( THREE.MathUtils.degToRad( camera.fov ) / 2 ));
  let finalCameraPosition = new THREE.Vector3(building_position.x, arrow_position.y, building_position.z + move_away);
  
  return new Promise((resolve) => {
    setTimeout(resolve, transitionCamera(    
      {camera: initialCameraPosition, target: initialTargetPosition},
      {camera: finalCameraPosition, target: finalTargetPosition},
      300
    ) + 200)
  });
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
        object.scale.set(0.4, 0.1, 0.3);
        object.position.set(0, -9, 0);
      } else if (paramsL.dataSet === data_list[2]) {
        object.scale.set(0.4, 0.1, 0.3);
        object.position.set(-30, -9, 0);
      }
      ground_object = object;
      ground_object.visible = false;
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
      console.log((file + ' ' + xhr.loaded / xhr.total * 100) + '% loaded');
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
  if (element_count > 3) {
    result = BUILD.loadVoronoi(city_all, lines, filename);
  } else {
    result = PATH.loadNeighbors(city_all, lines, filename);
    city_all = result.all;
    voronoiLoaded = true;
  }
  city_all = result.all;
  // console.log(city_all)
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
  }else if(filename.includes("summary")){
    summaryData = JSON.parse(fileString);
    scene_city_description.innerText = objToString(summaryData);
    bucketNum = summaryData.buckets;
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
  if (element_count == 12) {
    console.log("loaded: SPIRAL file");
    let spiral = BUILD.loadSpiral(scene_city, lines, city_all, grass_objects, bush_objects, city_tracking, x_scale);
    city_all = spiral.all;
    city_tracking = spiral.tracking;
    grass_objects = spiral.grass;
    bush_objects = spiral.bush;
    city_to_load = spiral.city_count;
    console.log(city_to_load)
    for (const [key, value] of Object.entries(city_all)) {
      if (key.slice(0, 8) !== 'wavemap_') {
        continue;
      }
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
    console.log("loaded: color file, ",filename);
    layer_name = fileToLayer(filename);
    let result = BUILD.loadColor(lines, layer_name, city_all, city_tracking);
    city_all = result.all;
    city_tracking = result.tracking;
  } else if (element_count == 4) {
    console.log("loaded: floor file, ",filename);
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
  //controls = new TrackballControls(camera, renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);
  console.log('createControls', controls);
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
  // scenes.forEach(scene => scene.userData.controls.handleResize());
}

function animate() {
  updateSize();
  requestAnimationFrame(animate);
  scenes.forEach(scene => scene.userData.controls.update());
  // stats.update();
  // console.log(city_to_load)
  if (city_to_load > 0 && addBuildings && glyphDoneFlag) { // glyphDoneFlag for adding map glyphs to building flags
    console.log("animate: run createCityMeshes()");
    let result = BUILD.createCityMeshes(scene_city, objects, city_all, city_tracking, ceil_objects, middle_objects, truss_objects, window_objects, flag_objects, flag_objects_new, arrow_objects, src_objects, tgt_objects, glyph_objects, glyphBack_objects, city_to_load, y_scale, paramsL.dataSet, params.ceilVisible, params.isNight);
    scene_city = result.scene;
    city_all = result.all;
    city_tracking = result.tracking;
    objects = result.objects;
    city_to_load = result.remain;
    ceil_objects = result.ceil;
    middle_objects = result.middle;
    truss_objects = result.truss;
    window_objects = result.window;
    arrow_objects = result.arrow;
    src_objects = result.src_objects;
    tgt_objects = result.tgt_objects;
    flag_objects_new = result.flag;
    glyph_objects = glyph_objects;
    glyphBack_objects = glyphBack_objects;
  } else if (city_to_load == 0 && printTime) {

    // console.log(flag_objects_new['wavemap_3_42_1'])
    
    // // adjust ground size according to city size
    buildingCoordMax = 0;
    for (const buildingName in city_all.graph) {
      if (Math.abs(city_all[buildingName].coords[0]) > buildingCoordMax) {
        buildingCoordMax = Math.abs(city_all[buildingName].coords[0]);
      }
      if (Math.abs(city_all[buildingName].coords[1]) > buildingCoordMax) {
        buildingCoordMax = Math.abs(city_all[buildingName].coords[1])
      }
    }
    // console.log(buildingCoordMax)
    let groundScale = (buildingCoordMax + 100) / 1750 * 1.25;
    ground_object.scale.set(groundScale, 0.1, groundScale);
    
    let end_time = new Date();
    let end_time_string = end_time.getMinutes() + ':' + end_time.getSeconds() + '.' + end_time.getMilliseconds();
    console.log("start time is " + start_time_string);
    console.log("end time is " + end_time_string);
    printTime = false;

    initOverlay();
    
    // let allowToWalkOnPath_FeatureFlag = false;
    // if(allowToWalkOnPath_FeatureFlag){       
    //   //let pathList = PATH.getTourPath(city_all.weightedGraph, 'wavemap_3_3191982_27', 'wavemap_15_3718944_45');      
    //   // let path_to_try = ["wavemap_1_140109_1283","wavemap_1_62999_1884","wavemap_22_919138_1","wavemap_1_250725_1023","wavemap_11_164183_1","wavemap_10_196384_1","wavemap_5_2061_1","wavemap_13_30471_1","wavemap_19_2571623_35","wavemap_18_2914315_48","wavemap_23_1433320_64","wavemap_21_3292172_25","wavemap_4_1243_1","wavemap_15_3718944_45","wavemap_16_1362234_16","wavemap_17_1851996_8","wavemap_9_28722_1","wavemap_25_3804978_8","wavemap_3_42_1","wavemap_2_13_1","wavemap_3_3191982_27","wavemap_43_1965538_5","wavemap_19_239987_3","wavemap_1_405063_798","wavemap_14_1037462_1","wavemap_8_27645_1","wavemap_7_30601_1","wavemap_8_4342010_162","wavemap_11_2983724_385","wavemap_17_389660_1","wavemap_15_3515498_169","wavemap_15_275340_1","wavemap_6_2182_1","wavemap_12_508033_1","wavemap_13_3434164_105","wavemap_1_140109_1283"];

      
    //   let path_patents = ['wavemap_2_13_1', 'wavemap_3_42_1', 'wavemap_14_1037462_1', 'wavemap_1_140109_1283', 'wavemap_22_919138_1', 'wavemap_8_27645_1', 'wavemap_1_62999_1884', 'wavemap_19_239987_3', 'wavemap_3_3191982_27', 'wavemap_1_250725_1023', 'wavemap_1_405063_798', 'wavemap_8_4342010_162', 'wavemap_17_389660_1', 'wavemap_7_30601_1', 'wavemap_11_2983724_385', 'wavemap_15_275340_1', 'wavemap_15_3515498_169', 'wavemap_13_3434164_105', 'wavemap_12_508033_1', 'wavemap_6_2182_1', 'wavemap_15_3718944_45', 'wavemap_13_30471_1', 'wavemap_23_1433320_64', 'wavemap_18_2914315_48', 'wavemap_11_164183_1', 'wavemap_5_2061_1', 'wavemap_19_2571623_35', 'wavemap_10_196384_1', 'wavemap_21_3292172_25', 'wavemap_16_1362234_16', 'wavemap_4_1243_1', 'wavemap_17_1851996_8', 'wavemap_25_3804978_8', 'wavemap_9_28722_1', 'wavemap_43_1965538_5', 'wavemap_2_13_1'];
    //   let path_patents_in_to_out = ["wavemap_3_42_1","wavemap_5_2061_1","wavemap_6_2182_1","wavemap_7_30601_1","wavemap_8_27645_1","wavemap_2_13_1","wavemap_9_28722_1","wavemap_4_1243_1","wavemap_10_196384_1","wavemap_11_164183_1","wavemap_13_30471_1","wavemap_12_508033_1","wavemap_15_275340_1","wavemap_17_389660_1","wavemap_14_1037462_1","wavemap_22_919138_1","wavemap_19_239987_3","wavemap_43_1965538_5","wavemap_25_3804978_8","wavemap_17_1851996_8","wavemap_16_1362234_16","wavemap_21_3292172_25","wavemap_19_2571623_35","wavemap_18_2914315_48","wavemap_23_1433320_64","wavemap_15_3718944_45","wavemap_13_3434164_105","wavemap_15_3515498_169","wavemap_11_2983724_385","wavemap_8_4342010_162","wavemap_1_405063_798","wavemap_1_250725_1023","wavemap_1_140109_1283","wavemap_1_62999_1884","wavemap_3_3191982_27"]
    //   let path_patents_out_to_in = path_patents_in_to_out.slice().reverse();

    //   // let path_friend = ['wavemap_1_2878103_708', 'wavemap_1_17833995_771', 'wavemap_1_6980866_827', 'wavemap_58_2035500_1', 'wavemap_21_1374_1', 'wavemap_15_690_1', 'wavemap_40_38645_1', 'wavemap_34_87642_1', 'wavemap_1_60939141_881', 'wavemap_22_6161_1', 'wavemap_29_735_1', 'wavemap_1_15204409_930', 'wavemap_14_14107_1', 'wavemap_1_31820411_979', 'wavemap_1_201283_1031', 'wavemap_1_10126754_1079', 'wavemap_92_49855703_1', 'wavemap_4_101_1', 'wavemap_3_101_1', 'wavemap_53_1266_1', 'wavemap_86_49855703_1', 'wavemap_304_1850520_1', 'wavemap_5_173_1', 'wavemap_1_14609_1141', 'wavemap_32_248525_1', 'wavemap_54_1563_1', 'wavemap_1_7241947_1198', 'wavemap_20_9823427_1', 'wavemap_4_6552536_1280', 'wavemap_1_1443591_1372', 'wavemap_1_754869_1520', 'wavemap_82_49855703_2', 'wavemap_13_101_1', 'wavemap_175_260453_1', 'wavemap_25_167_1', 'wavemap_75_49855703_1', 'wavemap_7_101_1', 'wavemap_234_262712_1', 'wavemap_1_1623531_1994', 'wavemap_80_49855703_2', 'wavemap_12_131002_1', 'wavemap_2_2407314_44', 'wavemap_77_49855703_4', 'wavemap_1_8645756_634', 'wavemap_9_164816_1', 'wavemap_1_58275384_547', 'wavemap_55_643725_1', 'wavemap_71_102807_1', 'wavemap_140_180407_1', 'wavemap_9_201256_351', 'wavemap_30_11086_1', 'wavemap_65_4182_1', 'wavemap_120_11459_1', 'wavemap_89_1202_1', 'wavemap_7_19325784_356', 'wavemap_1_5249714_247', 'wavemap_41_1905_1', 'wavemap_14_238083_160', 'wavemap_35_1750_1', 'wavemap_17_60024_1', 'wavemap_19_19546040_102', 'wavemap_33_1467_1', 'wavemap_8_176_1', 'wavemap_38_1202_1', 'wavemap_16_1284_1', 'wavemap_34_90152410_52', 'wavemap_16_41201_32', 'wavemap_41_60187632_16', 'wavemap_20_123_1', 'wavemap_2_101_1', 'wavemap_31_4062912_8', 'wavemap_48_6608327_1', 'wavemap_169_11459_1', 'wavemap_11_167_1', 'wavemap_18_13234024_3', 'wavemap_27_146_1', 'wavemap_6_284_1', 'wavemap_1_2878103_708'];
    //   // let path_friend_in_to_out = ["wavemap_89_1202_1","wavemap_53_1266_1","wavemap_25_167_1","wavemap_11_167_1","wavemap_38_1202_1","wavemap_120_11459_1","wavemap_140_180407_1","wavemap_15_690_1","wavemap_5_173_1","wavemap_3_101_1","wavemap_234_262712_1","wavemap_175_260453_1","wavemap_6_284_1","wavemap_169_11459_1","wavemap_2_101_1","wavemap_8_176_1","wavemap_17_60024_1","wavemap_65_4182_1","wavemap_71_102807_1","wavemap_40_38645_1","wavemap_21_1374_1","wavemap_29_735_1","wavemap_304_1850520_1","wavemap_4_101_1","wavemap_54_1563_1","wavemap_7_101_1","wavemap_13_101_1","wavemap_12_131002_1","wavemap_27_146_1","wavemap_48_6608327_1","wavemap_20_123_1","wavemap_16_1284_1","wavemap_33_1467_1","wavemap_35_1750_1","wavemap_41_1905_1","wavemap_30_11086_1","wavemap_55_643725_1","wavemap_9_164816_1","wavemap_34_87642_1","wavemap_58_2035500_1","wavemap_22_6161_1","wavemap_14_14107_1","wavemap_86_49855703_1","wavemap_92_49855703_1","wavemap_32_248525_1","wavemap_20_9823427_1","wavemap_75_49855703_1","wavemap_82_49855703_2","wavemap_80_49855703_2","wavemap_77_49855703_4","wavemap_18_13234024_3","wavemap_31_4062912_8","wavemap_41_60187632_16","wavemap_16_41201_32","wavemap_34_90152410_52","wavemap_19_19546040_102","wavemap_14_238083_160","wavemap_1_5249714_247","wavemap_7_19325784_356","wavemap_9_201256_351","wavemap_1_58275384_547","wavemap_1_8645756_634","wavemap_1_2878103_708","wavemap_1_17833995_771","wavemap_1_6980866_827","wavemap_1_60939141_881","wavemap_1_15204409_930","wavemap_1_31820411_979","wavemap_1_201283_1031","wavemap_1_10126754_1079","wavemap_1_14609_1141","wavemap_1_7241947_1198","wavemap_4_6552536_1280","wavemap_1_1443591_1372","wavemap_1_754869_1520","wavemap_1_1623531_1994","wavemap_2_2407314_44"]
    //   // let path_friend_out_to_in = path_friend_in_to_out.slice().reverse();

    //   // let path_movies = ['wavemap_31_12735_1', 'wavemap_27_11403_1', 'wavemap_50_12860_1', 'wavemap_36_12116_1', 'wavemap_13_11413_1', 'wavemap_757_11398_1', 'wavemap_1246_11398_1', 'wavemap_60_12370_2', 'wavemap_29_11432_1', 'wavemap_185_11398_1', 'wavemap_48_13096_2', 'wavemap_76_12776_2', 'wavemap_41_13114_2', 'wavemap_34_11472_1', 'wavemap_527_11398_1', 'wavemap_14_11452_1', 'wavemap_57_15545_3', 'wavemap_119_11833_1', 'wavemap_38_15906_3', 'wavemap_18_13639_3', 'wavemap_28_12051_1', 'wavemap_84_11398_1', 'wavemap_8_11589_3', 'wavemap_32_11773_1', 'wavemap_47_11398_1', 'wavemap_2070_11400_1', 'wavemap_56_16757_5', 'wavemap_53_12597_1', 'wavemap_40_13169_6', 'wavemap_37_12382_9', 'wavemap_30_12673_1', 'wavemap_26_11399_1', 'wavemap_37_23740_12', 'wavemap_62_12456_1', 'wavemap_101_11400_1', 'wavemap_414_11398_1', 'wavemap_46_11766_17', 'wavemap_7_11427_1', 'wavemap_24_12180_23', 'wavemap_29_13695_43', 'wavemap_123_11670_1', 'wavemap_12_11399_1', 'wavemap_9_12922_89', 'wavemap_16_11696_1', 'wavemap_6_11398_1', 'wavemap_283_11398_1', 'wavemap_15_17754_35', 'wavemap_33_11491_1', 'wavemap_4_11398_1', 'wavemap_14_14781_337', 'wavemap_5_16664_287', 'wavemap_2_15608_15', 'wavemap_35_13487_1', 'wavemap_2_11398_1', 'wavemap_3114_11398_1', 'wavemap_15_11645_1', 'wavemap_31_12735_1'];
    //   // let path_movies_in_to_out = ["wavemap_1246_11398_1","wavemap_2070_11400_1","wavemap_414_11398_1","wavemap_283_11398_1","wavemap_3114_11398_1","wavemap_757_11398_1","wavemap_185_11398_1","wavemap_527_11398_1","wavemap_84_11398_1","wavemap_47_11398_1","wavemap_26_11399_1","wavemap_101_11400_1","wavemap_12_11399_1","wavemap_6_11398_1","wavemap_4_11398_1","wavemap_2_11398_1","wavemap_27_11403_1","wavemap_13_11413_1","wavemap_29_11432_1","wavemap_14_11452_1","wavemap_34_11472_1","wavemap_119_11833_1","wavemap_28_12051_1","wavemap_32_11773_1","wavemap_53_12597_1","wavemap_30_12673_1","wavemap_62_12456_1","wavemap_7_11427_1","wavemap_123_11670_1","wavemap_16_11696_1","wavemap_33_11491_1","wavemap_15_11645_1","wavemap_35_13487_1","wavemap_31_12735_1","wavemap_50_12860_1","wavemap_36_12116_1","wavemap_60_12370_2","wavemap_48_13096_2","wavemap_76_12776_2","wavemap_41_13114_2","wavemap_57_15545_3","wavemap_38_15906_3","wavemap_18_13639_3","wavemap_8_11589_3","wavemap_56_16757_5","wavemap_40_13169_6","wavemap_37_12382_9","wavemap_37_23740_12","wavemap_46_11766_17","wavemap_24_12180_23","wavemap_29_13695_43","wavemap_9_12922_89","wavemap_15_17754_35","wavemap_14_14781_337","wavemap_5_16664_287","wavemap_2_15608_15"];
    //   // let path_movies_out_to_in = path_movies_in_to_out.slice().reverse();

    //   walkOnPath(path_patents);

    // }

    // console.log(JSON.stringify(city_all.weightedGraph))
    // console.log(PATH.getTourPath(city_all.weightedGraph, 'wavemap_2_13_1', 'wavemap_18_2914315_48'))
    // console.log(PATH.getCityTour(city_all.weightedGraph))
    // console.log(city_all.building2BucketPeel)
    // CM.enableHighLight(city_all.building2BucketPeel, 'wavemap_2_13_1', true)
    // CM.enableHighLight(city_all.building2BucketPeel, 'wavemap_18_2914315_48', false)
  }
  render();
}

function render() {
  renderer.setScissorTest( false );
  renderer.clear();
  renderer.setScissorTest( true );

  let camera = (params.orthographicCamera) ? orthographicCamera : perspectiveCamera;

  //   // // Not working, need to check document
  //   // // make src/tgt text toward camera
  //   // for (const obj of Object.values(src_objects)) {
  //   //   if (obj.visible) {
  //   //     obj.setRotationFromQuaternion(camera.quaternion);
  //   //     obj.updateMatrix();
  //   //     // obj.lookAt(camera.position);
  //   //   }
  //   // }
  //   // for (const obj of Object.values(tgt_objects)) {
  //   //   if (obj.visible) {
  //   //     obj.rotation.y = Math.atan2( ( camera.position.x - obj.position.x ), ( camera.position.z - obj.position.z ) );
  //   //   }
  //   // }

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

  // if focused at a building, then global_building is assigned.
  if(global_building.name){

    let building_target = scene_city.userData.controls.target;
    
    if (building_target.distanceTo(camera.position) < visibleRadius){
      shouldArrowBeVisible = true;
    }else{
      shouldArrowBeVisible = false;
    }   
    
    if (shouldArrowBeVisible){
      // arrowHeight is the default height(y-axis) at which we will show thw arrow.
      let arrowHeight;
      let needToUpdateArrow = false;
      if(global_building.focusAtHeight !== undefined){
        arrowHeight = global_building.focusAtHeight;
        needToUpdateArrow = true;
      }else{
        arrowHeight = getFloorHeight(global_building.name);
      }
  
      if(!global_building.arrowHelper){
        showArrowFunction(global_building.name, arrowHeight);
      }else{
        if(needToUpdateArrow){
          scene_city.remove(global_building.arrowHelper);
          delete global_building.arrowHelper;
          showArrowFunction(global_building.name, arrowHeight);
        }  
      }
    }else{
      if(global_building.arrowHelper){
        scene_city.remove(global_building.arrowHelper);
        delete global_building.arrowHelper;
      }    
    }

  }

  // always update the slider position wrt to the camera 'y' position
  updateOverlaySlider(overlay_slider);

  if (controllerOnHold.status){
    
    let direction = controllerOnHold.target;

    let camera = scene_city.userData.camera;
    let target = scene_city.userData.controls.target;
    let direction_vector = new THREE.Vector3();

    var ground_object_coord = new THREE.Box3().setFromObject(ground_object);
    let min_coord = ground_object_coord.min;
    let max_coord = ground_object_coord.max;
    
    camera.getWorldDirection(direction_vector);    

    var axis = new THREE.Vector3( 0, 1, 0 );
    let speed = camera.position.y * 0.025;
    
    if(allowed || allowed === undefined){
      direction_vector.y = 0;
      moveCamera(direction, direction_vector, axis, camera, target, speed);

      if (camera.position.x > (1.5 * max_coord.x) || camera.position.x < (1.5 * min_coord.x) || camera.position.z > (1.5 * max_coord.z) || camera.position.z < (1.5 * min_coord.z)){
        allowed = false;
      }
    }else{
      var origin;
      direction_vector = getDirectionVector(direction, direction_vector, axis);

      if(camera.position.x > (1.5 * max_coord.x)){        
        origin = new THREE.Vector3( -1, 0, 0 );
      }else if(camera.position.x < (1.5 * min_coord.x)){
        origin = new THREE.Vector3( 1, 0, 0 );
      }else if(camera.position.z > (1.5 * max_coord.z)){
        origin = new THREE.Vector3( 0, 0, -1 );
      }else if(camera.position.z < (1.5 * min_coord.z)){
        origin = new THREE.Vector3( 0, 0, 1 );
      }
      if(origin.dot(direction_vector) > 0){
        allowed = true;
      }
    }

  }
  // if (toPanCity) {
  //   // console.log("pan city "+theta);
  //   theta += 0.1;
  //   camera.position.x = radius * Math.sin(THREE.MathUtils.degToRad(theta));
  //   // camera.position.y = radius/5+(radius/10) * Math.sin( THREE.MathUtils.degToRad( theta ) );
  //   camera.position.z = radius * Math.cos(THREE.MathUtils.degToRad(theta));
  //   camera.lookAt(scene.position);
  //   if (theta > 360) toPanCity = false;
  // } else if (toPanBuilding) {
  //   // console.log("pan around building "+params.root);
  //   theta += 0.1;
  //   // let building_position = new THREE.Vector3(100,0,100);
  //   let root_building = root_dropdown.getValue();
  //   let building_position = city_all[root_building].coords;
  //   controls.target = new THREE.Vector3(building_position[0], 30, building_position[1]);
  //   camera.position.x = building_position[0] + radius * Math.sin(THREE.MathUtils.degToRad(theta));
  //   camera.position.y = 100;
  //   // camera.position.y = radius * Math.sin( THREE.MathUtils.degToRad( theta ) );
  //   camera.position.z = building_position[1] + radius * Math.cos(THREE.MathUtils.degToRad(theta));
  //   if (theta > 360) toPanBuilding = false;
  // } else if (toZoomBuilding) {
  //   // // console.log("zoom in to "+root_dropdown.getValue());
  //   // // let building_position = new THREE.Vector3(100,0,100);
  //   // let root_building = root_dropdown.getValue();
  //   // let building_position = city_all[root_building].coords;
  //   // controls.target = new THREE.Vector3(building_position[0], 10, building_position[1]);
  //   // // console.log(building_position[0]);
  //   // if (Math.abs(building_position[0] - camera.position.x) >= 20) {
  //   //   camera.position.x += theta * (building_position[0] - camera.position.x);
  //   //   // console.log("x");
  //   // }
  //   // if (Math.abs(camera.position.y) >= 100) {
  //   //   camera.position.y += theta * (0 - camera.position.y);
  //   //   // console.log("y");
  //   // }
  //   // if (Math.abs(building_position[1] - camera.position.z) >= 20) {
  //   //   camera.position.z += theta * (building_position[1] - camera.position.z);
  //   //   // console.log("z");  
  //   // } else {
  //   //   toZoomBuilding = false;
  //   // }

  //   // console.log("zoom in to "+root_dropdown.getValue());
  //   // let building_position = new THREE.Vector3(100,0,100);
  //   let root_building = root_dropdown.getValue();
  //   let building_position = city_all[root_building].coords;
  //   let objectPos = new THREE.Vector3(building_position[0], building_position[3], building_position[1] + 50); // 2021-10-18: 0 is x, 1 is z, 3 is y, and I don't know what is 2
  //   controls.target.set(building_position[0], building_position[3] + 20, building_position[1]); // 2021-10-18: 0 is x, 1 is z, 3 is y, and I don't know what is 2
  //   // console.log(controls.target);
  //   // console.log(camera.position);
  //   // console.log(controls);
  //   // console.log(city_all[root_building]);
  //   // camera.lookAt(building_position[0], building_position[3], building_position[1]);
  //   // camera.matrix[8] = building_position[0];
  //   // camera.matrix[9] = building_position[3];
  //   // camera.matrix[10] = building_position[1];
  //   // let lookAtVector = new THREE.Vector3(camera.matrix[8], camera.matrix[9], camera.matrix[10]);
  //   // console.log(lookAtVector);
  //   // console.log(camera.matrix);
  //   // console.log(camera);
  //   // console.log(building_position[0]);
  //   if (Math.abs(objectPos.x - camera.position.x) >= 2) {
  //     camera.position.x += theta * (objectPos.x - camera.position.x);
  //     // console.log("x");
  //   }
  //   if (Math.abs(objectPos.y - camera.position.y) >= 5) {
  //     camera.position.y += theta * (objectPos.y - camera.position.y);
  //     // console.log("y");
  //   }
  //   if (Math.abs(objectPos.z - camera.position.z) >= 2) {
  //     camera.position.z += theta * (objectPos.z - camera.position.z);
  //     // console.log("z");  
  //   } else {
  //     toZoomBuilding = false;
  //   }
  // }
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
      select_fixed_point.onChange ( // NOTE: it seems this function creats lagging.
        function (key) {
          const intensity = entropy[parseInt(key)];
          color_display.setValue(first_key_color_dict[parseInt(key)]);
          light_intensity.setValue(intensity);
          // console.log("light_intensity2 "+entropy[parseInt(key)]);
          // console.log("key "+key);
          // console.log("first_key_list[key] "+first_key_list[parseInt(key)]);
          if (mapControlHighLight) {
            selected_buildings = mapControlHighLightBuilding;
          } else {
            selected_buildings = key_to_buckets[key];
          }
          mapControlHighLight = false;
          // console.log(key_to_buckets);
          // console.log(city_all)
          light_objects.selectionLights.forEach(object => object.visible=false);
          let result = LH.updateSelectionLights(city_all, light_objects, selected_buildings);
          light_objects = result.light_objects;
          selected_buildings_list = result.selected_buildings;
          LH.updateDropdown(root_dropdown_highlighted, selected_buildings_list);
          root_dropdown_highlighted.setValue(selected_buildings_list[0]);
          let highlighter = lighthouse_objects[lighthouse_objects.length-1];
          let index = first_key_list.indexOf(String(key));
          let selected = lighthouse_objects[index];
          highlighter.position.set(0, selected.Y_pos, 0);
          highlighter.scale.set(selected.maxR*1.1, selected.dY, selected.maxR*1.1);

          for (const [tempBuilding, tempArrow] of Object.entries(arrow_objects)) {
            tempArrow.visible = false;
          };
          arrow_objects[selected_buildings_list[0]].visible = true;
          // console.log(arrow_objects)
          // console.log(arrow_objects[selected_buildings_list[0]])
        }
      );
      let result = LH.updateSelectionLights(city_all, light_objects, selected_buildings);
      light_objects = result.light_objects;
      selected_buildings_list = result.selected_buildings;
      PATH.updateDropdown(root_dropdown, city_list);
      root_dropdown.setValue(city_list[city_list.length-1]);
      LH.updateDropdown(root_dropdown_highlighted, selected_buildings_list);
      root_dropdown_highlighted.setValue(selected_buildings_list[0]);
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
  theta = 0.03;
  toZoomBuilding = true;
  toPanBuilding = false;
  toPanCity = false;
  render();
}

function onMouseMove(event) {
  event.preventDefault();
  const rect = scene_city.userData.view.getBoundingClientRect();
  const width = rect.right-rect.left;
  const height = rect.bottom-rect.top;
  mouse.x = ((event.clientX-sliderPos)/width)*2-1;
  mouse.y = -((event.clientY-mapPos)/height)*2+1;
  // mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
  // mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
  // mouse.x = (event.clientX / (window.clientWidth-sliderPos)) * 2 - 1;
  // mouse.y = -(event.clientY / (window.clientHeight-sliderPos)) * 2 + 1;
  let camera = (params.orthographicCamera) ? orthographicCamera : perspectiveCamera;
  raycaster.setFromCamera(mouse, camera);

  let intersects = raycaster.intersectObjects(objects);
  // console.log(objects);
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
      building_params.position = building_params.layer + '_' + building_params.floor;
    }
    if(shouldArrowBeVisible && global_building.name){      
      global_building.focusAtHeight = getFloorHeight(global_building.name, building_params.floor);
    }
  } else // there are no intersections
  {
    INTERSECTED = null;
    building_params.floor = '';
    building_params.layer = '';
    building_params.position = '';
    delete global_building.focusAtHeight;
  }
}

function onMouseDownLH(event){
  event.preventDefault();
  const rect = scene_lighthouse.userData.view.getBoundingClientRect();
  const width = rect.right-rect.left;
  const height = rect.bottom-rect.top;
  mouse.x=(event.clientX/width)*2-1;
  mouse.y=-((event.clientY-300)/height)*2+1;
  // console.log("onMouseDownLH, event.clientX = ",event.clientX, " event.clientY = ",event.clientY);
  raycaster.setFromCamera(mouse, perspectiveCameraL);
  const intersects=raycaster.intersectObjects(scene_lighthouse.children);
  if(intersects.length>0){
    const intersected = intersects[0].object;
    if(intersected.name){
      console.log("onMouseDownLH ",intersected.name);
      select_fixed_point.setValue(intersected.name);
      let highlighter = lighthouse_objects[lighthouse_objects.length-1];
      highlighter.position.set(0, intersected.Y_pos, 0);
      highlighter.scale.set(intersected.maxR*1.1, intersected.dY, intersected.maxR*1.1);
      console.log("LH intersects: ",intersected.name,intersected.maxR,intersected.dY,intersected.Y_pos);  
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
  mouse.y = -((event.clientY-mapPos)/height)*2+1;
  let camera = (params.orthographicCamera) ? orthographicCamera : perspectiveCamera;
  raycaster.setFromCamera(mouse, camera);

  let intersects = raycaster.intersectObjects(objects);
  let selected_building = null;
  if (intersects.length > 0) {    
    selected_building = "wavemap_" + intersects[0].object.layer_name; 
    
    // if(global_building.name){
    //   let clickEvent = new Event('mousedown');
    //   overlay_reset_camera.dispatchEvent(clickEvent);
    // }

    global_building.name = selected_building;    

    if (selectingBuildingTour) {
      root_dropdown.setValue(selected_building);
      document.getElementById('city-buidling-tour-buidling').value = selected_building;
      addRoadNetwork(selected_building);
      CM.enableHighLight(city_all.building2BucketPeel, selected_building, true);
      changeLHHighLight(selected_building);
      showBuildingArrow(selected_building);
    } else if (selectingPathNavigation) {
      if (event.button === 0) {
        root_dropdown.setValue(selected_building);
        document.getElementById('city-path-navigation-src').value = selected_building;
        if (clearTempPathFlag) {
          addRoadNetwork(selected_building);
        } else {
          console.log('keep temp Path')
        }
        CM.enableHighLight(city_all.building2BucketPeel, selected_building, true);
        changeLHHighLight(selected_building);
        showBuildingArrow(selected_building);
        showBuildingSrc(selected_building);
      } else if (event.button === 2) {
        document.getElementById('city-path-navigation-tgt').value = selected_building;
        showBuildingTgt(selected_building);
      }
    } else if (selectingTourNavigation) {
      root_dropdown.setValue(selected_building);
      document.getElementById('city-tour-navigation-src').value = selected_building;
      if (clearTempPathFlag) {
        addRoadNetwork(selected_building);
      } else {
        console.log('clear temp Path');
      }
      CM.enableHighLight(city_all.building2BucketPeel, selected_building, true);
      changeLHHighLight(selected_building);
      showBuildingArrow(selected_building);
      showBuildingSrc(selected_building);
    } else {
      root_dropdown.setValue(selected_building);
      updateCityLight([selected_building])
      addRoadNetwork(selected_building);
      CM.enableHighLight(city_all.building2BucketPeel, selected_building, true);
      changeLHHighLight(selected_building);
      showBuildingArrow(selected_building);
      zoomAtBuilding(selected_building)
        .then(() => {            
          let showBuildingTour_FeatureFlag = false;
          if(showBuildingTour_FeatureFlag){            
            buildingTour(selected_building);            
          }
      });
    }
  }

  let glyphIntersects = raycaster.intersectObjects(glyph_objects);
  let selected_glyph = null;
  // console.log(glyph_objects);
  // console.log('glyph intersection', glyphIntersects)
  if (glyphIntersects.length > 0) {
    selected_glyph = glyphIntersects[0].object.layerName;
    // console.log(selected_glyph);
    goToInnerView(selected_glyph);
  }

  let glyphBackIntersects = raycaster.intersectObjects(glyphBack_objects);
  let selected_glyphBack = null;
  // console.log(glyph_objects);
  // console.log('glyph intersection', glyphIntersects)
  if (glyphBackIntersects.length > 0) {
    selected_glyphBack = glyphBackIntersects[0].object.layerName;
    // console.log(selected_glyphBack);
    window.open(`${hostAddress}/minicity.html`);
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

function initOverlay(){
  overlay_slider = document.querySelector('#overlay-slider');
  overlay_circle_controller = document.querySelector('#overlay-circle-controller');
  
  overlay_zoom_in = document.querySelector('#zoom-in');
  overlay_zoom_in.addEventListener('mousedown', onControllerZoom);
  overlay_zoom_in.scale = 4;

  overlay_zoom_out = document.querySelector('#zoom-out');
  overlay_zoom_out.addEventListener('mousedown', onControllerZoom);
  overlay_zoom_out.scale = 4;


  let camera = scene_city.userData.camera;
  overlay_slider.setAttribute("min", 10);
  overlay_slider.setAttribute("value", camera.position.y);
  overlay_slider.setAttribute("max", camera.position.y * 1.1);
  overlay_slider.addEventListener('input', onSliderInput);
  
  overlay_reset_camera = document.querySelector('#reset-camera');
  overlay_reset_camera.addEventListener('mousedown', onControllerReset);

  let left = document.querySelector('#left');
  left.addEventListener('mousedown', onControllerDown);
  left.addEventListener('mouseup', onControllerUp);
  
  let up = document.querySelector('#up');
  up.addEventListener('mousedown', onControllerDown);
  up.addEventListener('mouseup', onControllerUp);

  let right = document.querySelector('#right');
  right.addEventListener('mousedown', onControllerDown);
  right.addEventListener('mouseup', onControllerUp);

  let down = document.querySelector('#down');
  down.addEventListener('mousedown', onControllerDown);
  down.addEventListener('mouseup', onControllerUp);

  let north_west = document.querySelector('#north-west');
  north_west.addEventListener('mousedown', onControllerDown);
  north_west.addEventListener('mouseup', onControllerUp);
  
  let north_east = document.querySelector('#north-east');
  north_east.addEventListener('mousedown', onControllerDown);
  north_east.addEventListener('mouseup', onControllerUp);

  let south_east = document.querySelector('#south-east');
  south_east.addEventListener('mousedown', onControllerDown);
  south_east.addEventListener('mouseup', onControllerUp);

  let south_west = document.querySelector('#south-west');
  south_west.addEventListener('mousedown', onControllerDown);
  south_west.addEventListener('mouseup', onControllerUp);
}

async function onControllerReset(event){
  event.preventDefault();  
  let initialCameraPosition = scene_city.userData.camera.position;
  let initialTargetPosition = scene_city.userData.controls.target;

  let finalTargetPosition = new THREE.Vector3(0, 10, 0);
  let finalCameraPosition = new THREE.Vector3(0, 350, 600);  

  await new Promise((resolve) => setTimeout(resolve, transitionCamera(    
    {camera: initialCameraPosition, target: initialTargetPosition},
    {camera: finalCameraPosition, target: finalTargetPosition}    
  )));
  controls.reset();

  if(global_building.name){
    delete global_building.name;
    if(global_building.timmers){
      for(let i=0; i<global_building.timmers.length ; i++){    
        clearTimeout(global_building.timmers[i]);
      }  
      delete global_building.timmers;
    }
    if(global_building.arrowHelper){
      scene_city.remove(global_building.arrowHelper);
      delete global_building.arrowHelper;
    }
  }  
  global_building = {};
  console.log(`Exit: ${JSON.stringify(global_building)}`);
}

function onControllerZoom(event){
  event.preventDefault();
  let wheelEventInit = {
    'bubbles':    true,
    'cancelable': false    
  };
  if (event.target.id === 'zoom-in'){
    wheelEventInit.deltaY = -120;
  }else{
    wheelEventInit.deltaY = 120;
  }
  city_view.dispatchEvent(new WheelEvent('wheel', wheelEventInit));
}

function onControllerUp(event){
  event.preventDefault();
  controllerOnHold = {status: false, target: null};
}

function onControllerDown(event){
  event.preventDefault();
  controllerOnHold = {status: true, target: event.target.id};
}

function updateOverlaySlider(inputSlider){
  // console.log(scene_city)
  let camera = scene_city.userData.camera;
  if (inputSlider !== undefined){
    inputSlider.value = camera.position.y;
  }  
}

function moveCamera(direction, direction_vector, axis, camera, target, speed){
  
  direction_vector = getDirectionVector(direction, direction_vector, axis);
  camera.position.addScaledVector(direction_vector, speed);
  target.addScaledVector(direction_vector, speed);
}

function getDirectionVector(direction, direction_vector, axis){
  if(direction === 'down'){
    direction_vector.multiplyScalar(-1);
  }else if(direction === 'left'){    
    var angle = Math.PI / 2;
    direction_vector.applyAxisAngle(axis, angle);
  }else if(direction === 'right'){
    var angle = -1 * (Math.PI / 2);
    direction_vector.applyAxisAngle(axis, angle);
  }else if(direction === 'north-west'){
    var angle = (Math.PI / 2) - (Math.PI / 4);
    direction_vector.applyAxisAngle(axis, angle);
  }else if(direction === 'north-east'){
    var angle = Math.PI + (Math.PI / 2) + (Math.PI / 4);
    direction_vector.applyAxisAngle(axis, angle);
  }else if(direction === 'south-east'){
    var angle = Math.PI + (Math.PI / 4);
    direction_vector.applyAxisAngle(axis, angle);
  }else if(direction === 'south-west'){
    var angle = Math.PI - (Math.PI / 4);
    direction_vector.applyAxisAngle(axis, angle);
  }  
  return direction_vector
}

function onSliderInput(event){
  event.preventDefault();
  let inputSlider = document.querySelector('#overlay-slider');
  let camera = scene_city.userData.camera;
  let target = scene_city.userData.controls.target;
  
  let isIncreasing = false;
  let changeFactor = 0;
  if (camera.position.y < inputSlider.value){
    isIncreasing = true;
    changeFactor = inputSlider.value - camera.position.y;
  }else{
    changeFactor = camera.position.y - inputSlider.value;
  }
  
  camera.position.y = inputSlider.value;
  if (isIncreasing){
    target.y += changeFactor;
  }else{
    target.y -= changeFactor;
  }
}

function getFloorHeight(buildingName, floor = undefined){
  // Take building name and floor as input and return y-coord of floor. If floor is undefined then take building height.
  let building = city_all[buildingName];
  if(floor !== undefined && building.shapes.length >= floor){
    return y_scale * building.shapes[floor].height;
  }else{
    return building.coords[3];
  }
}

function showArrowFunction(building_name, floorCoords){
  const dir = new THREE.Vector3(0, 0, -1);
  // normalize the direction vector (convert to vector of length 1)
  dir.normalize();
  const hex = 0xffffff;
  const length = 50;
  let building = city_all[building_name];
  const origin = new THREE.Vector3(building.coords[0], floorCoords, building.coords[1] + (length * 1.1));

  global_building.arrowHelper = new THREE.ArrowHelper(dir, origin, length, hex, length/5);
  scene_city.add(global_building.arrowHelper);
  
}


function transitionCamera(initial, final, totalSteps=1000){
  let camera = scene_city.userData.camera;
  let cameraX = (final.camera.x - initial.camera.x) / totalSteps;
  let cameraY = (final.camera.y - initial.camera.y) / totalSteps;
  let cameraZ = (final.camera.z - initial.camera.z) / totalSteps;

  let targetX = (final.target.x - initial.target.x) / totalSteps;
  let targetY = (final.target.y - initial.target.y) / totalSteps;
  let targetZ = (final.target.z - initial.target.z) / totalSteps;

  let clock = 500;
  global_building.timmers = [];

  for(let i=0; i <= totalSteps; i++){
    global_building.timmers.push(setTimeout(function() {
      let currentCameraPosition = camera.position;
      let currentTargetPosition = scene_city.userData.controls.target;   
      scene_city.userData.controls.target.set(currentTargetPosition.x + targetX, currentTargetPosition.y + targetY, currentTargetPosition.z + targetZ);
      camera.position.set(currentCameraPosition.x + cameraX, currentCameraPosition.y + cameraY, currentCameraPosition.z + cameraZ);
      controls.update();
    }, clock));
    clock += 1;
  } 

  return clock;
}

async function iterateCameraOverBuilding(selected_building){  
  let camera = scene_city.userData.camera;
  let building = city_all[selected_building];
  let building_position = new THREE.Vector3(building.coords[0], building.coords[3], building.coords[1]);

  let initialCameraPosition = camera.position;
  let initialTargetPosition = scene_city.userData.controls.target;

  let theta = 30;
  let radius = 30;
  let seconds;
  if(building.shapes.length < 10){
    seconds = 0.5;
  } else if(building.shapes.length > 10 && building.shapes.length < 20){
    seconds = 1;
  } else {
    seconds = 2;
  }

  let a = radius * Math.cos(THREE.MathUtils.degToRad(theta));
  let o = radius * Math.sin(THREE.MathUtils.degToRad(theta));

  let intermediateTargetPosition = new THREE.Vector3(building_position.x, 0, building_position.z);
  let intermediateCameraPosition = new THREE.Vector3(building_position.x, 0 + o, building_position.z + a);

  let totalSteps = (seconds * 1000);
  let finalTargetPosition = new THREE.Vector3(building_position.x, building_position.y, building_position.z);
  let finalCameraPosition = new THREE.Vector3(building_position.x + o, building_position.y + o, building_position.z + a);  

  await new Promise((resolve) => setTimeout(resolve, transitionCamera(    
    {camera: initialCameraPosition, target: initialTargetPosition},
    {camera: intermediateCameraPosition, target: intermediateTargetPosition}    
  )));

  return new Promise((resolve) => {
    setTimeout(resolve, transitionCamera(
      {camera: intermediateCameraPosition, target: intermediateTargetPosition},
      {camera: finalCameraPosition, target: finalTargetPosition},
      totalSteps
    ) + 500);
  });
}

function zoomAtBuildingFlag(selected_building){
  let camera = scene_city.userData.camera;  
  let initialCameraPosition = camera.position;
  let initialTargetPosition = scene_city.userData.controls.target;

  let building = city_all[selected_building].coords;
  let building_position = new THREE.Vector3(building[0], building[3], building[1]);
  // console.log(flag_objects_new)
  // console.log(selected_building)
  let flag_details = flag_objects_new[selected_building];
  let flag_height = JSON.parse(JSON.stringify(flag_details.flag_rod)).geometries[0].height;

  let observeFlagFor = 0.5 * 1000;
  // should be more that observeFlagFor
  let totalTransitionTime = 1 * 1000;


  let totalSteps = totalTransitionTime - observeFlagFor;
  let finalTargetPosition = new THREE.Vector3(building_position.x, building_position.y + flag_height, building_position.z);
  let move_away = flag_height / (2 * Math.tan( THREE.MathUtils.degToRad( camera.fov ) / 2 ));  
  let finalCameraPosition = new THREE.Vector3(building_position.x, building_position.y, building_position.z + move_away);  

  return new Promise((resolve) => {
    setTimeout(resolve, transitionCamera(
      {camera: initialCameraPosition, target: initialTargetPosition},
      {camera: finalCameraPosition, target: finalTargetPosition},
      totalSteps
    ) + observeFlagFor);
  });
}

async function rotateAtBuilding(selected_building){     
  let camera = scene_city.userData.camera;
  let building = city_all[selected_building].coords;
  let building_position = new THREE.Vector3(building[0], building[3], building[1]);
  
  let theta = 45;
  let radius = 30;  
  let initialCameraPosition = camera.position;
  let initialTargetPosition = scene_city.userData.controls.target;
  let clock = 500;
  let a = radius * Math.cos(THREE.MathUtils.degToRad(theta));
  let o = radius * Math.sin(THREE.MathUtils.degToRad(theta));

  let intermediateTargetPosition = new THREE.Vector3(building_position.x, building_position.y, building_position.z);
  let intermediateCameraPosition = new THREE.Vector3(building_position.x, building_position.y + o, building_position.z + a);

  await new Promise((resolve) => setTimeout(resolve, transitionCamera(    
    {camera: initialCameraPosition, target: initialTargetPosition},
    {camera: intermediateCameraPosition, target: intermediateTargetPosition}    
  )));
  
  return new Promise((resolve) => {
    for(let thetaToRotate=0; thetaToRotate <= 360; thetaToRotate+=0.1){
      global_building.timmers.push(setTimeout(function() {  
        // camera.position.x = building_position.x + (radius * Math.sin(THREE.MathUtils.degToRad(thetaToRotate)));
        // camera.position.z = building_position.z + (radius * Math.cos(THREE.MathUtils.degToRad(thetaToRotate)));
        camera.position.x = building_position.x + (a * Math.sin(THREE.MathUtils.degToRad(thetaToRotate)));
        camera.position.z = building_position.z + (a * Math.cos(THREE.MathUtils.degToRad(thetaToRotate)));
        controls.update();      
      }, clock));  
      clock += 5;    
    }
    setTimeout(resolve, clock + 500);    
  });
}

async function rotateAtFlag(selected_building){     
  let camera = scene_city.userData.camera;
  let building = city_all[selected_building].coords;
  let building_position = new THREE.Vector3(building[0], building[3], building[1]);
  
  let theta = 45;
  // let radius = 30;  
  let initialCameraPosition = camera.position;
  let initialTargetPosition = scene_city.userData.controls.target;

  let flag_details = flag_objects_new[selected_building];
  let flag_height = JSON.parse(JSON.stringify(flag_details.flag_rod)).geometries[0].height + JSON.parse(JSON.stringify(flag_details.flag_mesh)).geometries[0].height;
  console.log(flag_height)

  let move_away = flag_height / (2 * Math.tan( THREE.MathUtils.degToRad( camera.fov ) / 2 ));  

  let clock = 500;
  let a = move_away * Math.cos(THREE.MathUtils.degToRad(theta));
  let o = move_away * Math.sin(THREE.MathUtils.degToRad(theta));

  let intermediateTargetPosition = new THREE.Vector3(building_position.x, building_position.y + flag_height, building_position.z);
  let intermediateCameraPosition = new THREE.Vector3(building_position.x, building_position.y + flag_height + o, building_position.z + a);

  await new Promise((resolve) => setTimeout(resolve, transitionCamera(    
    {camera: initialCameraPosition, target: initialTargetPosition},
    {camera: intermediateCameraPosition, target: intermediateTargetPosition}    
  )));
  
  return new Promise((resolve) => {
    for(let thetaToRotate=0; thetaToRotate <= 360; thetaToRotate+=0.2){
      global_building.timmers.push(setTimeout(function() {  
        camera.position.x = building_position.x + (a * Math.sin(THREE.MathUtils.degToRad(thetaToRotate)));
        camera.position.y = building_position.y + flag_height + o;
        camera.position.z = building_position.z + (a * Math.cos(THREE.MathUtils.degToRad(thetaToRotate)));
        controls.update();      
      }, clock));  
      clock += 2;    
    }
    setTimeout(resolve, clock + 500);    
  });
}

function buildingTour(selected_building){ 
  console.log(`buildingTour for ${selected_building} Starting.`);
  
  return new Promise(resolve => {  
    zoomAtBuilding(selected_building)
    .then(() => {      
      return iterateCameraOverBuilding(selected_building);
    })  
    .then(() => {      
      return zoomAtBuildingFlag(selected_building);
    })
    .then(() => {
      // return rotateAtBuilding(selected_building);
      return rotateAtFlag(selected_building);
    })
    .then(() => {
      resolve();      
    });
  });

}

function toCityResetView(){  
  let initialCameraPosition = scene_city.userData.camera.position;
  let initialTargetPosition = scene_city.userData.controls.target;

  let finalTargetPosition = new THREE.Vector3(0, 10, 0);
  let finalCameraPosition = new THREE.Vector3(0, 350, 600);

  return new Promise((resolve) => setTimeout(resolve, transitionCamera(    
    {camera: initialCameraPosition, target: initialTargetPosition},
    {camera: finalCameraPosition, target: finalTargetPosition},
    500
  )));
}

function toCityTopView(){  
  let initialCameraPosition = scene_city.userData.camera.position;
  let initialTargetPosition = scene_city.userData.controls.target;

  let finalTargetPosition = initialTargetPosition;
  // let finalTargetPosition = new THREE.Vector3(0, 10, 0);
  let finalCameraPosition = new THREE.Vector3(5, 1000, 5);    

  return new Promise((resolve) => setTimeout(resolve, transitionCamera(    
    {camera: initialCameraPosition, target: initialTargetPosition},
    {camera: finalCameraPosition, target: finalTargetPosition},
    1500
  )));
}

function walkOnPath(path, moveArrowBack){
  if (moveArrowBack === null || moveArrowBack === undefined) {
    moveArrowBack = false;
  };

  function takeStep(path, index){
    if(index == path.length){
      toCityTopView();
      showTempPathUntil(tempPathNewStartIdx);
      if (moveArrowBack) {
        changeLHHighLight(path[0]);
        showBuildingArrow(path[0]);
        CM.enableHighLight(city_all.building2BucketPeel, path[0], true);
      }
      return;
    }else if(index == 0 || index == path.length - 1){
      CM.enableHighLight(city_all.building2BucketPeel, path[index], true);
      // select_fixed_point.setValue(path[index].split('_')[1]);
      changeLHHighLight(path[index]);
      showBuildingArrow(path[index]);
      buildingTour(path[index])
        .then(() => {
          if (index < path.length - 1) {
            showTempPath(index);
          }
          takeStep(path, ++index);
          if (index < path.length) {
            console.log(path[index])
            // console.log(city_all.building2BucketPeel)
            CM.enableHighLight(city_all.building2BucketPeel, path[index], true);
            // select_fixed_point.setValue(path[index].split('_')[1]);
            changeLHHighLight(path[index]);
            showBuildingArrow(path[index]);
          }
        });
    }else{
      zoomAtBuilding(path[index])      
      .then(() => {
        showTempPath(index);
        takeStep(path, ++index);
        console.log(path[index])
        CM.enableHighLight(city_all.building2BucketPeel, path[index], true);
        // select_fixed_point.setValue(path[index].split('_')[1]);
        changeLHHighLight(path[index]);
        showBuildingArrow(path[index]);
      });
    }
  }

  console.log(`Walk Starting from ${path[0]} to ${path[path.length - 1]}`);
  let index = 0;
  takeStep(path, index);
}

function tourOnPath(path, moveArrowBack){
  if (moveArrowBack === null || moveArrowBack === undefined) {
    moveArrowBack = false;
  };

  function takeTourStep(path, index) {
    if (index == path.length) {
      toCityTopView();
      // showTempPathUntil(tempPathNewStartIdx);
      if (moveArrowBack) {
        changeLHHighLight(path[0]);
        showBuildingArrow(path[0]);
        CM.enableHighLight(city_all.building2BucketPeel, path[0], true);
      }
      return;
    } else {
      CM.enableHighLight(city_all.building2BucketPeel, path[index], true);
      changeLHHighLight(path[index]);
      showBuildingArrow(path[index]);
      buildingTour(path[index])
        .then(() => {
          if (index < path.length - 1) {
            showTempPath(index);
          }
          takeTourStep(path, ++index)
        });
    };
  };
  let index = 0;
  takeTourStep(path, index);
};

// function goInsideBuilding(buildingName){
//   console.log(`Inside goInsideBuilding: ${buildingName}`);
// }

function fakeTransition(selected_building){
  console.log(`Inside fakeTransition: ${selected_building}`);
  return new Promise((resolve) => setTimeout(resolve, 3000));
}

function goToInnerView(selected_building){
  return new Promise(resolve => {  
    zoomAtBuilding(selected_building)
    // .then(() => {      
    //   return iterateCameraOverBuilding(selected_building);
    // })  
    .then(() => {      
      return zoomAtBuildingFlag(selected_building);
    })
    // .then(() => {
    //   return fakeTransition(selected_building);
    // })
    .then(() => {     
      // End of fakeTransition
      goInsideBuilding(selected_building);  
      resolve();
    });
  });
}

function clearBuildingArrow(arrowName) {
  if (arrowName === null || arrowName === undefined) {
    arrowName = arrow_objects;
  };
  if (arrowName === arrow_objects || arrowName === src_objects || arrowName === tgt_objects) { // NOTE: this is intended to compare Objects s.t. only these objects are valid.
    for (const tempArrow of Object.values(arrowName)) {
      tempArrow.visible = false;
    };
  }
}

function showBuildingArrow(buildingName, disableOthers) {
  if (disableOthers === null || disableOthers === undefined) {
    disableOthers = true;
  };
  if (disableOthers === true) {
    // for (const tempArrow of Object.values(arrow_objects)) {
    //   tempArrow.visible = false;
    // };
    clearBuildingArrow(arrow_objects);
  }
  arrow_objects[buildingName].visible = true;
}

function showBuildingSrc(buildingName, disableOthers) {
  if (disableOthers === null || disableOthers === undefined) {
    disableOthers = true;
  };
  if (disableOthers === true) {
    clearBuildingArrow(src_objects);
  }
  src_objects[buildingName].visible = true;
}

function showBuildingTgt(buildingName, disableOthers) {
  if (disableOthers === null || disableOthers === undefined) {
    disableOthers = true;
  };
  if (disableOthers === true) {
    clearBuildingArrow(tgt_objects);
  }
  tgt_objects[buildingName].visible = true;
}

function clearBuildingSrcTgt() {
  clearBuildingArrow(src_objects);
  clearBuildingArrow(tgt_objects);
}

function changeLHHighLight(buildingName) {
  // console.log(first_key_list)
  let highlighter = lighthouse_objects[lighthouse_objects.length-1];
  const key = buildingName.split('_')[1]
  let index = first_key_list.indexOf(String(key));
  let selected = lighthouse_objects[index];
  highlighter.position.set(0, selected.Y_pos, 0);
  highlighter.scale.set(selected.maxR*1.1, selected.dY, selected.maxR*1.1);
}

function clearRoadNetwork() {
  if (clearTempPathFlag) {
    clearTempPath();
  } else {
    console.log('clearTempPath: no hide')
    // hideTempPath();
  }
  path_objects.every(object => scene_city.remove(object));
  path_objects = [];
}

function addRoadNetwork(buildingName, disableOthers) {
  if (disableOthers === null || disableOthers === undefined) {
    disableOthers = true;
  };
  if (disableOthers === true) {
    clearRoadNetwork();
  }
  let result = PATH.pathPlanning(buildingName, scene_city, city_all, light_objects);
  scene_city = result.scene;
  path_objects = result.path;
  light_objects = result.light_objects;
}

function getBuidlingShortName(buildingName) {
  const splitName = buildingName.split('_');
  return `${splitName[1]}_${splitName[2]}`;
}

function clearCityLight() {
  light_objects.selectionLights.forEach(object => object.visible=false);
}

function updateCityLight(buildingNameList, disableOthers) {
  if (disableOthers === null || disableOthers === undefined) {
    disableOthers = true;
  };
  if (disableOthers === true) {
    clearCityLight()
  };
  const result = LH.updateSelectionLights(city_all, light_objects, buildingNameList.map(d => getBuidlingShortName(d)));
  light_objects = result.light_objects;
}

function clearTempPath() {
  for (const pathObj of tempCityPathObjList) {
    scene_city.remove(pathObj);
  };
  tempCityPathObjList.length = 0;
  tempPathNewStartIdx = 0;
}

function drawTempPath(buildingList, hidden, disableOthers) {
  if (disableOthers === null || disableOthers === undefined) {
    disableOthers = true;
  };
  if (disableOthers === true) {
    clearTempPath();
  } else {
    tempPathNewStartIdx = tempCityPathObjList.length;
  }
  if (hidden === null || hidden === undefined) {
    hidden = true;
  };
  tempCityPathObjList.push(... PATH.drawPath(city_all, buildingList));
  console.log(tempCityPathObjList)
  for (const pathObj of tempCityPathObjList) {
    scene_city.add(pathObj);
  }

  if (hidden) {
    hideTempPath();
  };
}

function hideTempPath() {
  for (const pathObj of tempCityPathObjList) {
    pathObj.visible = false;
  };
}

function showTempPath(index, newStartIdx) {
  if (newStartIdx === null || newStartIdx === undefined) {
    newStartIdx = tempPathNewStartIdx;
  }
  tempCityPathObjList[index + newStartIdx].visible = true;
}

function showTempPathUntil(index) {
  for (let i = 0; i < index; i ++) {
    showTempPath(i, 0);
  };
};

function goCityTourPath(path) {
  clearCityLight();
  clearRoadNetwork();
  drawTempPath(path, true, clearTempPathFlag);
  walkOnPath(path);
}

document.getElementById('city-tour-button').onclick = function goCityTour() {
  if (city_to_load !== 0) {
    return;
  }
  const path = PATH.getCityTour(city_all, null);
  // goCityTourPath(path);
  clearCityLight();
  clearRoadNetwork();
  drawTempPath(path, false, true);
}

function goBestBuilding(statName) {
  const buildingList = Object.keys(city_all.graph);
  let buildingStatList = [];
  if (statName === 'largest') {
    buildingStatList = buildingList.map(d => [d, city_all[d].E]);
  } else if (statName === 'tallest') {
    buildingStatList = buildingList.map(d => [d, city_all[d].coords[3]])
  } else if (statName === 'densest') {
    // console.log(city_all.building2BucketPeel)
    // buildingStatList = buildingList.map(d => [d, 2 * city_all[d].E / city_all[d].V / (city_all[d].V - 1)])
    console.log(JSON.stringify(buildingList.map(d => [d, 2 * city_all[d].E / city_all[d].V / (city_all[d].V - 1)])))
    buildingStatList = buildingList.filter(d => city_all.building2BucketPeel[`${d.split('_')[1]}_${d.split('_')[2]}`][0][0] >= bucketNum/2).map(d => [d, 2 * city_all[d].E / city_all[d].V / (city_all[d].V - 1)])
  } else if (statName === 'most diverse') {
    const tempDiversityDict = {}
    console.log(city_all)
    console.log(buildingList);
    for (const [src, tgtDict] of Object.entries(city_all.connections)) {
      for (const [tgt, diversity] of Object.entries(tgtDict)) {
        const weight = parseFloat(diversity);
        if (!tempDiversityDict.hasOwnProperty(src)) {
          tempDiversityDict[src] = 0;
        }
        if (!tempDiversityDict.hasOwnProperty(tgt)) {
          tempDiversityDict[tgt] = 0;
        }
        tempDiversityDict[src] += weight;
        tempDiversityDict[tgt] += weight;
      }
    }
    console.log(tempDiversityDict)
    buildingStatList = buildingList.map(d => [d, tempDiversityDict[d]]);
  };
  console.log(JSON.stringify(buildingStatList))
  console.log(buildingStatList);
  buildingStatList.sort((a, b) => -(a[1] - b[1]))
  // console.log(buildingStatList);
  const bestList = buildingStatList.slice(0, Math.ceil(Math.log2(buildingList.length))).map(d => d[0]);
  console.log(bestList);
  updateCityLight(bestList);
  clearRoadNetwork();
  drawTempPath(bestList);

  tourOnPath(bestList, true);
}

document.getElementById('city-largest-building-button').onclick = function goLargestBuilding() {
  if (city_to_load !== 0) {
    return;
  }
  // console.log(flag_objects_new)
  goBestBuilding('largest')
}

document.getElementById('city-tallest-building-button').onclick = function goTallestBuilding() {
  if (city_to_load !== 0) {
    return;
  }
  // console.log(flag_objects_new)
  goBestBuilding('tallest')
}

document.getElementById('city-densest-building-button').onclick = function goDensestBuilding() {
  if (city_to_load !== 0) {
    return;
  }
  // console.log(flag_objects_new)
  goBestBuilding('densest')
}

document.getElementById('city-diverse-building-button').onclick = function goDiverseBuilding() {
  if (city_to_load !== 0) {
    return;
  }
  // console.log(flag_objects_new)
  goBestBuilding('most diverse')
}

function addDropListOption(element, valueList) {
  for (const value of valueList) {
    let option = document.createElement('option');
    option.value = value;
    option.innerHTML = value;
    element.appendChild(option);
  }
}

function clearDropListOption(element) {
  for (let i = element.options.length - 1; i >= 0; i --) {
    element.remove(i);
  };
}

function openPathNavigationMenu() {
  selectingPathNavigation = true;
  document.getElementById('city-path-navigation-menu').style.visibility = 'visible';
  addDropListOption(document.getElementById('city-path-navigation-src'), Object.keys(city_all.graph));
  addDropListOption(document.getElementById('city-path-navigation-tgt'), Object.keys(city_all.graph));
}

function closePathNavigationMenu() {
  selectingPathNavigation = false;
  document.getElementById('city-path-navigation-menu').style.visibility = 'hidden';
  clearDropListOption(document.getElementById('city-path-navigation-src'));
  clearDropListOption(document.getElementById('city-path-navigation-tgt'));
}

function openTourNavigationMenu() {
  selectingTourNavigation = true;
  document.getElementById('city-tour-navigation-menu').style.visibility = 'visible';
  addDropListOption(document.getElementById('city-tour-navigation-src'), Object.keys(city_all.graph));
}

function closeTourNavigationMenu() {
  selectingTourNavigation = false;
  document.getElementById('city-tour-navigation-menu').style.visibility = 'hidden';
  clearDropListOption(document.getElementById('city-tour-navigation-src'));
}

function openBuildingTourMenu() {
  selectingBuildingTour = true;
  document.getElementById('city-buidling-tour-menu').style.visibility = 'visible';
  addDropListOption(document.getElementById('city-buidling-tour-buidling'), Object.keys(city_all.graph));
}

function closeBuildingTourMenu() {
  selectingBuildingTour = false;
  document.getElementById('city-buidling-tour-menu').style.visibility = 'hidden';
  clearDropListOption(document.getElementById('city-buidling-tour-buidling'));
}

function pathNavigationPlan() {
  openPathNavigationMenu();
  closeTourNavigationMenu()
  closeBuildingTourMenu();
  if (! clearTempPathFlag) {
    showTempPathUntil(tempPathNewStartIdx);
  }
}

function tourNavigationPlan() {
  closePathNavigationMenu();
  openTourNavigationMenu();
  closeBuildingTourMenu();
  clearTempPath();
}

function buildingTourPlan() {
  closePathNavigationMenu();
  closeTourNavigationMenu();
  openBuildingTourMenu();
}

function pathNavigationGo() {
  const src = document.getElementById('city-path-navigation-src').value;
  const tgt = document.getElementById('city-path-navigation-tgt').value;
  const path = PATH.getTourPath(city_all.weightedGraph, src, tgt);
  closePathNavigationMenu();
  clearBuildingSrcTgt();
  updateCityLight(path);
  clearRoadNetwork();
  drawTempPath(path, true, clearTempPathFlag);
  walkOnPath(path);
}

function tourNavigationGo() {
  const src = document.getElementById('city-tour-navigation-src').value;
  const path = PATH.getCityTour(city_all, src);
  closeTourNavigationMenu();
  clearBuildingSrcTgt();
  goCityTourPath(path);
}

function buildingTourGo() {
  const building = document.getElementById('city-buidling-tour-buidling').value;
  closeBuildingTourMenu();
  updateCityLight([building]);
  CM.enableHighLight(city_all.building2BucketPeel, building, true);
  changeLHHighLight(building);
  showBuildingArrow(building);
  addRoadNetwork(building);
  buildingTour(building);
}

document.getElementById('city-path-navigation-button').onclick = function parsePathNavigationButton() {
  if (city_to_load !== 0) {
    return;
  }
  if (selectingPathNavigation) {
    pathNavigationGo();
  } else {
    pathNavigationPlan();
  }
}

document.getElementById('city-tour-navigation-button').onclick = function parseTourNavigationButton() {
  if (city_to_load !== 0) {
    return;
  }
  if (selectingTourNavigation) {
    tourNavigationGo();
  } else {
    tourNavigationPlan();
  }
}

document.getElementById('city-buidling-tour-button').onclick = function parseBuildingTourButton() {
  if (city_to_load !== 0) {
    return;
  }
  if (selectingBuildingTour) {
    buildingTourGo();
  } else {
    buildingTourPlan();
  }
}

function parseCumulatePathCheck(value) {
  if (value === true) {
    document.getElementById('city-path-navigation-cumulate-path-check').checked = true;
    // document.getElementById('city-tour-navigation-cumulate-path-check').checked = true;
    clearTempPathFlag = false;
  } else {
    document.getElementById('city-path-navigation-cumulate-path-check').checked = false;
    // document.getElementById('city-tour-navigation-cumulate-path-check').checked = false;
    clearTempPathFlag = true;
  }
}

document.getElementById('city-path-navigation-cumulate-path-check').onclick = function parsePathCumulatePathCheck() {
  const result = document.getElementById('city-path-navigation-cumulate-path-check').checked;
  parseCumulatePathCheck(result);
}

// document.getElementById('city-tour-navigation-cumulate-path-check').onclick = function parseTourCumulatePathCheck() {
//   const result = document.getElementById('city-tour-navigation-cumulate-path-check').checked;
//   parseCumulatePathCheck(result);
// }



console.log(buildingMap_file);
function handleMouseOver(selectedDot, data) {
  // console.log(data)
  // console.log(selectedDot);
  // console.log(buildingMapControls.ignoreHover)
  // console.log(buildingMapControls)
  if (!buildingMapControls.ignoreHover) {
    mapControlHighLight = true;
    mapControlHighLightBuilding = data['buildingName'];
    select_fixed_point.setValue(selectedDot['layer']);  // NOTE: 2022-1-22 temp disable
  }
  // console.log(select_fixed_point);
};

function handleMouseOut(selectedDot, data) {
  // console.log(selectedDot);
  // select_fixed_point.setValue(selectedDot['layer']);
  // console.log(select_fixed_point);
  // console.log('out')
};

function handleLeftClick(selectedDot, data) {
  mapControlHighLight = true;
  mapControlHighLightBuilding = data['buildingName'];
  select_fixed_point.setValue(selectedDot['layer']); // NOTE: 2022-1-22 temp disable
  // theta = 0.003;
  // toZoomBuilding = true;
  // toPanBuilding = false;
  // toPanCity = false;
  // render();
  // zoomBuilding();
  // console.log(select_fixed_point);
  // console.log('click')

  let selectedBuilding = '';
  const shortName = data.buildingName[0];
  for (const buildingName of Object.keys(city_all.graph)) {
    const splitedName = buildingName.split('_');
    if (`${splitedName[1]}_${splitedName[2]}` === shortName) {
      selectedBuilding = buildingName;
    }
  }
  CM.enableHighLight(city_all.building2BucketPeel, selectedBuilding);

  if (selectingBuildingTour) {
    document.getElementById('city-buidling-tour-buidling').value = selectedBuilding;
  } else if (selectingPathNavigation) {
    document.getElementById('city-path-navigation-src').value = selectedBuilding;
  } else if (selectingTourNavigation) {
    document.getElementById('city-tour-navigation-src').value = selectedBuilding;
  }
};

function addMapDropListHandle() {
  const spiralDropListCollection = document.getElementsByClassName("mapSpiralDropList");
  // console.log(spiralDropListCollection);
  for (const spiralDropList of spiralDropListCollection) {
    spiralDropList.addEventListener('change', function() {
      // console.log(this.value);
      // console.log(root_dropdown_highlighted.domElement.children[0].options)
      // console.log(Array.from(root_dropdown_highlighted.domElement.children[0].options).map(x => x.text))
      // console.log(Array.from(root_dropdown_highlighted.domElement.children[0].options).map(x => x.text)[this.value])
      const selectedBuilding = Array.from(root_dropdown_highlighted.domElement.children[0].options).map(x => x.text)[this.value]
      root_dropdown_highlighted.setValue(selectedBuilding);
      for (const [tempBuilding, tempArrow] of Object.entries(arrow_objects)) {
        tempArrow.visible = false;
      };
      // console.log(arrow_objects)
      arrow_objects[selectedBuilding].visible = true;
      if (selectingBuildingTour) {
        document.getElementById('city-buidling-tour-buidling').value = selectedBuilding;
      } else if (selectingPathNavigation) {
        document.getElementById('city-path-navigation-src').value = selectedBuilding;
      } else if (selectingTourNavigation) {
        document.getElementById('city-tour-navigation-src').value = selectedBuilding;
      }
    });
  };

  const buildingDropListCollection = document.getElementsByClassName("mapBuildingDropList");
  for (const buildingDropList of buildingDropListCollection) {
    buildingDropList.addEventListener('change', function() {
      const waveIdx = this.value;
      // console.log(waveIdx);
      if (parseInt(waveIdx) === 0) {
        mapWaveSelection = false;
      } else {
        mapWaveSelection = true;
        // console.log(mapControlHighLightBuilding)
        mapWaveSelectedName = mapControlHighLightBuilding+'w'+waveIdx;
        console.log(mapWaveSelectedName);
        // console.log(this.parentNode);
      };
    });
  };
};

function addZoomButtonHandle() {
  const spiralZoomButtonCollection = document.getElementsByClassName("mapSpiralZoomButton");
  for (const spiralZoomButton of spiralZoomButtonCollection) {
    spiralZoomButton.addEventListener('click', function() {
      // zoomBuilding();
      console.log(root_dropdown_highlighted.domElement.children[0].value)
      const buildingName = root_dropdown_highlighted.domElement.children[0].value;
      if (showingGallery) {
        window.open(`${hostAddress}/patterns/patterns.html#${buildingName}`);
      } else {
        CM.enableHighLight(city_all.building2BucketPeel, buildingName, true);
        buildingTour(buildingName);
      }
    });
  };
  const buildingZoomButtonCollection = document.getElementsByClassName("mapBuildingZoomButton");
  for (const buildingZoomButton of buildingZoomButtonCollection) {
    buildingZoomButton.addEventListener('click', function() {
      // zoomBuilding();
      console.log(root_dropdown_highlighted.domElement.children[0].value)
      const buildingName = root_dropdown_highlighted.domElement.children[0].value;
      if (showingGallery) {
        window.open(`${hostAddress}/patterns/patterns.html#${buildingName}`);
      } else {
        CM.enableHighLight(city_all.building2BucketPeel, buildingName, true);
        buildingTour(buildingName);
      }
    });
  };
};

function processGlyph(glyphData) {
  glyphDoneFlag = true;
  console.log(glyphData);
  // console.log(city_all.building2BucketPeel)

  const glyphInfo = {}
  glyphInfo['factors'] = glyphData.factors;

  // console.log(city_all);
  const bucketPeel2Building = {}
  for (const [buildingShort, bucketPeel] of Object.entries(city_all.building2BucketPeel)) {
    bucketPeel2Building[`${bucketPeel[0][0]}-${bucketPeel[0][1]}`] = buildingShort; // NOTE: if the bucket -> building is not one-on-one mapping, then it will fail;
  }
  // console.log(bucketPeel2Building);
  
  for (const spiralInfo of glyphData.spiral) {
    // console.log(spiralInfo);
    glyphInfo[bucketPeel2Building[`${spiralInfo.bucket}-${spiralInfo.layer}`]] = {spiral: spiralInfo};
  }
  for (const buildingInfo of glyphData.building.circle) {
    // console.log(buildingInfo);
    glyphInfo[bucketPeel2Building[`${buildingInfo.bucket}-${buildingInfo.layer}`]] = {circle: buildingInfo, dot: []}
  }
  for (const buildingWaveInfo of glyphData.building.dot) {
    // console.log(buildingWaveInfo)
    glyphInfo[bucketPeel2Building[`${buildingWaveInfo.bucket}-${buildingWaveInfo.layer}`]].dot.push(buildingWaveInfo);
  }
  console.log(glyphInfo)
  city_all.glyphInfo = glyphInfo;
}

function drawMap(divName) {
  Promise.all([
    d3.json(buildingMap_file),
    d3.json(buildingMapBucket_file),
    d3.json(bucket_file),
    d3.text(patterns_file)
  ]).then(function (datas) {
    const result = CM.drawMap(datas, buildingMapControls, divName)
    city_all.building2BucketPeel = result.building2BucketPeel;
    if (!glyphDoneFlag) {
      glyphData = result.glyphData;
      processGlyph(glyphData);
    }
  }).then(() => CM.addOnMouseOver(handleMouseOver, buildingMapControls))
    .then(() => CM.addOnMouseOut(handleMouseOut, buildingMapControls))
    .then(() => CM.addOnLeftClick(handleLeftClick, buildingMapControls))
    .then(() => addMapDropListHandle())
    .then(() => addZoomButtonHandle());
}

window.addEventListener('resize', function(event){
  drawMap('city-building-map');
});

function showCityGallery() {
  showingGallery = true;
  buildingMapControls.showingGallery = showingGallery;
  document.getElementById('city-building-map').style.height = `${window.innerHeight - 75}px`;
  drawMap('city-building-map');
}

function hideCityGallery() {
  showingGallery = false;
  buildingMapControls.showingGallery = showingGallery;
  document.getElementById('city-building-map').style.height = "195px";
  drawMap('city-building-map');
}

document.getElementById('city-gallery-button').onclick = function parseGalleryButton() {
  if (showingGallery) {
    hideCityGallery();
  } else {
    showCityGallery();
  }
}

function goInsideBuilding(buildingName) {
  let bottom = document.getElementById("inner-view").offsetTop;
  let selected_building = buildingName;

  let wavemap_ID_ID_freq = selected_building.split('_');
  let file;
  let validCheck = true;
  let forkView = false;
  let nameSuffix = '';
  const validSize = 262144;
  if (!mapWaveSelection) {
    // console.log(dagSizeDict)
    const key = 'dagmeta_' + wavemap_ID_ID_freq[1] + '_' + wavemap_ID_ID_freq[2]
    if (dagSizeDict.hasOwnProperty(key)) {
      console.log(dagSizeDict[key])
      if (parseInt(dagSizeDict[key]) > parseInt(validSize)) {
        validCheck = false;
        alert('Please select a wave');
      }
    }
    file = '../data_dags/' + paramsL.dataSet + '/dagmeta_' + wavemap_ID_ID_freq[1] + '_' + wavemap_ID_ID_freq[2] + '.json';
  } else {
    // console.log(dagSizeDict)
    console.log(dagSizeDict['dagmeta_' + mapWaveSelectedName])
    if (parseInt(dagSizeDict['dagmeta_' + mapWaveSelectedName]) > parseInt(validSize)) {
      console.log('frag fork')
      // validCheck = false;
      forkView = true;
      nameSuffix = 'f'+mapWaveSelectedName.split('w')[1];
      file = '../data_dags/' + paramsL.dataSet + '/dagmeta_' + mapWaveSelectedName.replace('w', 'f') + '.json'
    } else {
      nameSuffix = 'w'+mapWaveSelectedName.split('w')[1];
      file = '../data_dags/' + paramsL.dataSet + '/dagmeta_' + mapWaveSelectedName + '.json';
    }
  }
  mapWaveSelection = false;
  if (validCheck) {
    onDagViews = true;
    inner_view_history.push(selected_building);
    window.scrollTo(0,bottom);
    console.log(inner_view_history);
    LH.updateDropdown(visited_inner_views, inner_view_history);
    visited_inner_views.setValue(inner_view_history[inner_view_history.length-1]);
    arrow_objects[selected_building].visible = true;
    
    console.log("******** " + selected_building + " *********");
    console.log("******** " + paramsL.dataSet + " *********");

    console.log("Loading: ", file);
    loadFile2(file, forkView, nameSuffix);
    loadLayer(paramsL.dataSet, wavemap_ID_ID_freq[1], wavemap_ID_ID_freq[2]);
  }
  onDagViews = false;
}