import * as THREE from '../../node_modules/three/build/three.module.js';
import { TrackballControls } from '../../node_modules/three/examples/jsm/controls/TrackballControls.js';
import { GUI } from '../../node_modules/three/examples/jsm/libs/dat.gui.module.js';
import { OBJLoader } from '../../three.js/examples/jsm/loaders/OBJLoader.js';
import * as LH from './lighthouse.js'
import * as BUILD from './building.js';
import * as PATH from './path.js';

const scenes = [];
let container, controls, renderer;
let perspectiveCamera, orthographicCamera, perspectiveCameraL;
// let spiral = []; 
let frustumSize = 400;
let aspect = window.innerWidth/window.innerHeight;
let scene_city = new THREE.Scene();
scene_city.background = new THREE.Color('skyblue');
let scene_lighthouse = new THREE.Scene();
// scene_lighthouse.background = new THREE.Color(0xBCD48F);
scene_lighthouse.background = new THREE.Color('white');
let sliderPos = 352;
// let camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let INTERSECTED;
let city_tracking = {};
let city_all = {};
let city_list = [];
let objects = [];
let ground_object;
let city_info_object;
let path_objects = [];
let truss_objects = [];
let window_objects = [];
let flag_objects = [];
let grass_objects = [];
let bush_objects = [];
let light_objects;
let addBuildings = true;
let metaLoaded = false, voronoiLoaded = false;
let city_to_load; 
let time = new Date();
let printTime = true;
let start_time_string = time.getMinutes()+':'+time.getSeconds()+'.'+time.getMilliseconds();
// if(addBuildings){
//     city_to_load = 77;// hard-coded
// }
let dropdown;
let gui, guiL;

// let DATASET = 'com-friendster_old';
// let DATASET = 'com-friendster';
// let DATASET = 'movies';
// let DATASET = 'cit-Patents';
const data_list = ['com-friendster','movies','cit-Patents'];
let land_obj = "../../models/flat_island.obj";
let ground_texture_file = "../../textures/ground_2.jpg";
let water_texture_file = "../../textures/waternormals.jpg";
let manager = new THREE.LoadingManager();
// let y_scale = 50; // scale up the height of building
let last = [-187.86920742571192,-69.84011743155536]
let y_scale = Math.sqrt(last[0] ** 2 + last[1] ** 2) / 4.565727849181679;
// let x_scale = 800000.0; // scale down the coordinates span
let x_scale = 1;
// camera movements
let radius = 500, theta = 0, toPanCity = false, toPanBuilding = false, toZoomBuilding = false;
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
    zoomBuilding: function(){
        zoomBuilding();
    },
    panBuilding: function() {
        panBuilding();
    },
    ground: "#CCA262",
    // colorMap: "jet",
    // hideBuilding: false
    dataSet:data_list[1],
    root: 'any building',
    outer: true,
    isNight: false
};

let first_key_list = [1];
let first_key_color_dict = {0:"#000000"};
let paramsL = {
    dataSet:data_list[2],
    fixedPoint:first_key_list[0],
    color:first_key_color_dict[0],
    lightIntensity:0.1
}
let lighthouse_objects = [];
let entropy;

const data_dir = "../../data/";
const python_dir = "../../python/";
let source_dir = data_dir+paramsL.dataSet+"/";
let spiral_file = data_dir+paramsL.dataSet+"/SPIRAL.txt";
let voronoi_file = python_dir+paramsL.dataSet+"/voronoi.txt";
let neighbors_file = python_dir+paramsL.dataSet+"/neighbors.txt";
let meta_file = python_dir+paramsL.dataSet+"/metagraph_normalized.txt";
let building_params = {
    floor: '',
    layer: ''
};
let water;
init();
animate();

function init() {
    container = document.querySelector('.container');
    
    perspectiveCamera = new THREE.PerspectiveCamera( 60, (window.innerWidth-sliderPos)/window.innerHeight, 1, 4000 );
    perspectiveCamera.position.z = 600;
    perspectiveCamera.position.y = 350;
    perspectiveCamera.position.x = 0;
    
    orthographicCamera = new THREE.OrthographicCamera( frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, 1, 1000 );
    orthographicCamera.position.z = 20;

    renderer = new THREE.WebGLRenderer({antialiasing:true});
    renderer.setPixelRatio( window.devicePixelRatio * 2.0 );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setScissorTest( true );
    container.appendChild(renderer.domElement);
    // document.body.appendChild( renderer.domElement );
    document.addEventListener( 'mousemove', onMouseMove, false );
    // document.addEventListener( 'mousedown', onMouseDown, false );
    window.addEventListener( 'resize', onWindowResize, false );
    // window.addEventListener( 'reset_camera', onResetCamera, false);
    createControls( perspectiveCamera );

    // environment lights
    light_objects = {
        ambientLight: new THREE.AmbientLight( 0x404040 ),
        dayLights: [new THREE.DirectionalLight( 0xffffff, 0.8), new THREE.DirectionalLight( 0xffffff, 0.5)],
        nightLight: new THREE.DirectionalLight( 0xffffff, 0.01),
        spotLight: new THREE.SpotLight( 0xffffff, 0.6, 0, Math.PI/2, 1, 1 )
    };
    scene_city.add(light_objects['ambientLight']);
    light_objects.dayLights[0].position.set(1000,1000,1000);
    light_objects.dayLights[1].position.set(-500,500,0);
    light_objects.dayLights.forEach(object => scene_city.add(object));
    light_objects.spotLight.position.set(0,30,0);
    scene_city.add(light_objects.spotLight);
    scene_city.add(light_objects.spotLight.target);
    light_objects.spotLight.visible = false;
    initSlider();
    // load files
    manager.onStart = function(url,itemsLoaded,itemsTotal) {
        console.log('Started loading file: '+url+'.\nLoaded '+itemsLoaded+' of '+itemsTotal+' files.');
    };

    // loadBushData(source_dir);
    loadFile(spiral_file,manager);

    // GUI folders
    gui = new GUI({width:350});
    guiL = new GUI({width:350, autoPlace: false});

    // let select_data = guiL.add(params, 'dataSet', data_list).name('choose data set');
    // select_data.setValue(paramsL.dataSet);

    // let f0 = gui.addFolder('Data Set');
    // let selectData = f0.add(params, 'dataSet', data_list).name('choose data set');
    // selectData.setValue(paramsL.dataSet);
    // selectData.onChange(
    //     function( dataSet ) {
    //         objects.every(object => scene_city.remove(object));
    //         path_objects.every(object => scene_city.remove(object));
    //         window_objects.every(object => scene_city.remove(object));
    //         flag_objects.every(object => scene_city.remove(object));
    //         grass_objects.every(object => scene_city.remove(object));
    //         truss_objects.every(object => scene_city.remove(object));
    //         bush_objects.every(object => scene_city.remove(object));
    //         light_objects.spotLight.visible = false;
    //         if(dataSet === data_list[0]){
    //             ground_object.scale.set(0.4,0.1,0.3);
    //             ground_object.position.set(-60,-10,20);
    //         }
    //         else if(dataSet === data_list[1]){
    //             ground_object.scale.set(0.22,0.08,0.2);
    //             ground_object.position.set(-30,-9,0);
    //         }
    //         else if(dataSet === data_list[2]){
    //             ground_object.scale.set(0.22,0.08,0.2);
    //             ground_object.position.set(-30,-9,0);
    //         }

    //         animate();
    //         source_dir = "../data/"+dataSet+"/";
    //         spiral_file = "../data/"+dataSet+"/SPIRAL.txt";
    //         voronoi_file = "../python/"+dataSet+"/voronoi.txt";
    //         neighbors_file = "../python/"+dataSet+"/neighbors.txt";
    //         meta_file = "../python/"+dataSet+"/metagraph_normalized.txt";
    //         time = new Date();
    //         start_time_string = time.getMinutes()+':'+time.getSeconds()+'.'+time.getMilliseconds();
    //         city_tracking = {};
    //         city_all = {};
    //         city_list = [];
    //         objects = [], path_objects = [], truss_objects = [], window_objects = [], flag_objects = [];
    //         metaLoaded = false, voronoiLoaded = false;
    //         loadBushData(source_dir);
    //         loadFile(spiral_file,manager);

    //         lighthouse_objects.every(object => scene_lighthouse.remove(object));
    //         LH.createCitySummaryMesh(scene_lighthouse, dataSet, lighthouse_objects, entropy, first_key_color_dict, 
    //             first_key_list, select_fixed_point, color_display, light_intensity);
    //         if(dataSet == data_list[0]){ // friendster
    //             perspectiveCameraL.position.y = 10;
    //             perspectiveCameraL.position.z = 20;
    //         }else if(dataSet == data_list[1]){ // movies
    //             perspectiveCameraL.position.y = 60;
    //             perspectiveCameraL.position.z = 80;
    //         }else if(dataSet == data_list[2]){
    //             perspectiveCameraL.position.y = 2;
    //             perspectiveCameraL.position.z = 10;
    //         }

    //         animate();
    //     }
    // );
    
    // f0.open();

    let f1 = gui.addFolder('Building Info');
    f1.add(building_params, 'floor').name('floor number').listen();
    f1.add(building_params, 'layer').name('layer info').listen();
    f1.open();

    let f2 = gui.addFolder('Camera Control');
    f2.add(params, 'resetCamera').name('reset camera');
    f2.add(params, 'topView').name('top view');
    f2.add(params, 'orthographicCamera').name('use orthographic').onChange(
        function( value ) {
            // controls.dispose();
        createControls( value ? orthographicCamera : perspectiveCamera );
        animate();
    });
    f2.add(params, 'panCity').name('Pan around a city');
    f2.add(params, 'zoomBuilding').name('Zoom in to "root"');
    f2.add(params, 'panBuilding').name('Zoom in and pan around');
    // f2.open();

    let f3 = gui.addFolder('Environment Control');
    f3.add(params, 'outer').name('outer frustums').onChange(function(value){
        truss_objects.forEach(object => object.visible=value);
        animate();
    });
    f3.add(params, 'isNight').name('night view').onChange(function(value){
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
    
    let f4 = gui.addFolder('Path Planning');
    dropdown = f4.add(params, 'root', ['default','example 1', 'example 2']);
    dropdown.setValue('default');
    dropdown.onChange(
        function(value){
            path_objects.every(object => scene_city.remove(object));
            animate();
            let result = PATH.pathPlanning(value, scene_city, city_all, light_objects.spotLight);
            scene_city = result.scene;
            path_objects = result.path;
            light_objects.spotLight = result.spotLight;
        }  
    );
    f4.open();

    // ground
    // let groundMat = new THREE.MeshBasicMaterial( {color:params.ground} );
    // groundMat.side = THREE.DoubleSide;

    // let groundUrl = "models/island.obj";
    // let groundMesh = objLoader(groundUrl, groundMat);

    // groud - 2
    let groundNormal = new THREE.TextureLoader().load(ground_texture_file);
    groundNormal.wrapS = THREE.RepeatWrapping;
    groundNormal.wrapT = THREE.RepeatWrapping;
    groundNormal.repeat.set( 10,10 );
    groundNormal.rotation = 10;
    let groundMat = new THREE.MeshStandardMaterial( {map:groundNormal} );
    // groundMat.normalMap = groundNormal;
    // groundMat.side = THREE.DoubleSide;
    let groundMesh = groundObjLoader(land_obj, groundMat);
    
    // let size = 1200;
    // let divisions = 24;
    // let gridHelper = new THREE.GridHelper( size, divisions );
    // scene_city.add( gridHelper );
    
    // water - 2
    let waterGeo = new THREE.BoxBufferGeometry( 5000, 50, 5000 );
    let waterNormal = new THREE.TextureLoader().load( water_texture_file, function ( texture ) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set( 4, 4 );
    });        
    let waterMat = new THREE.MeshPhongMaterial( {
        color: 0x006994,
        normalMap: waterNormal
    } );
    waterMat.transparent=true;
    waterMat.opacity=0.7;
    let waterMesh = new THREE.Mesh( waterGeo, waterMat );
    waterMesh.position.y=-50;
    scene_city.add( waterMesh );

    scenes.push( scene_city );


    // scene 2
    perspectiveCameraL = new THREE.PerspectiveCamera( 75, sliderPos / window.innerHeight, 0.1, 1000 );
    perspectiveCameraL.position.z = 10;
    perspectiveCameraL.position.y = 2;
    // perspectiveCameraL.setViewOffset(1920*2,1080*2,0,0,1920,1080);
    // createControls( perspectiveCameraL );

    // guiL - left GUI
    guiL = new GUI({width:350, autoPlace: false});
    let select_data = guiL.add(paramsL, 'dataSet', data_list).name('choose data set');
    select_data.setValue(data_list[2]);
    select_data.onChange(
        function( dataSet ) {
            objects.every(object => scene_city.remove(object));
            path_objects.every(object => scene_city.remove(object));
            window_objects.every(object => scene_city.remove(object));
            flag_objects.every(object => scene_city.remove(object));
            grass_objects.every(object => scene_city.remove(object));
            truss_objects.every(object => scene_city.remove(object));
            bush_objects.every(object => scene_city.remove(object));
            light_objects.spotLight.visible = false;
            lighthouse_objects.every(object => scene_lighthouse.remove(object));
            if(dataSet === data_list[0]){
                // friendster
                ground_object.scale.set(0.4,0.1,0.3);
                ground_object.position.set(-60,-10,20);
                perspectiveCameraL.position.y = 10;
                perspectiveCameraL.position.z = 20;
            }
            else if(dataSet === data_list[1]){
                // movies
                ground_object.scale.set(0.22,0.08,0.2);
                ground_object.position.set(-30,-9,0);
                perspectiveCameraL.position.y = 60;
                perspectiveCameraL.position.z = 85;
            }
            else if(dataSet === data_list[2]){
                // patents
                ground_object.scale.set(0.22,0.08,0.2);
                ground_object.position.set(-30,-9,0);
                perspectiveCameraL.position.y = 2;
                perspectiveCameraL.position.z = 10;
            }

            animate();
            source_dir = data_dir+dataSet+"/";
            spiral_file = data_dir+dataSet+"/SPIRAL.txt";
            voronoi_file = python_dir+dataSet+"/voronoi.txt";
            neighbors_file = python_dir+dataSet+"/neighbors.txt";
            meta_file = python_dir+dataSet+"/metagraph_normalized.txt";
            time = new Date();
            start_time_string = time.getMinutes()+':'+time.getSeconds()+'.'+time.getMilliseconds();
            city_tracking = {};
            city_all = {};
            city_list = [];
            objects = [], path_objects = [], truss_objects = [], window_objects = [], flag_objects = [];
            metaLoaded = false, voronoiLoaded = false;
            // loadBushData(source_dir);
            let result = LH.createCitySummaryMesh(scene_lighthouse, dataSet,lighthouse_objects, entropy, first_key_color_dict, 
                first_key_list, select_fixed_point, color_display, light_intensity);
            scene_lighthouse = result.scene;
            first_key_list = result.first_key_list;
            select_fixed_point = result.select_fixed_point;
            light_intensity = result.light_intensity;

            loadFile(spiral_file,manager);
            
        
            animate();
        }
    );

    // select_data.onChange(
        // function (dataSet) {
        //     lighthouse_objects.every(object => scene_lighthouse.remove(object));
        //     LH.createCitySummaryMesh(scene_lighthouse, dataSet, lighthouse_objects, entropy, first_key_color_dict, 
        //         first_key_list, select_fixed_point, color_display, light_intensity);
        //     if(dataSet == data_list[0]){ // friendster
        //         perspectiveCameraL.position.y = 10;
        //         perspectiveCameraL.position.z = 20;
        //     }else if(dataSet == data_list[1]){ // movies
        //         perspectiveCameraL.position.y = 60;
        //         perspectiveCameraL.position.z = 80;
        //     }else if(dataSet == data_list[2]){
        //         perspectiveCameraL.position.y = 2;
        //         perspectiveCameraL.position.z = 10;
        //     }
               
        // }
    //     function(dataSet) {
    //         selectData.setValue(dataSet);
    //     }
    // );
    let select_fixed_point = guiL.add(paramsL, 'fixedPoint',first_key_list).name('choose fixed point');
    let color_display = guiL.addColor(paramsL, 'color').name('display color');
    let light_intensity = guiL.add(paramsL, 'lightIntensity').name('diversity');
    let customContainer = document.getElementById('first-gui-container');
    customContainer.appendChild(guiL.domElement);
    let result = LH.createCitySummaryMesh(scene_lighthouse, data_list[2],lighthouse_objects, entropy, first_key_color_dict, 
        first_key_list, select_fixed_point, color_display, light_intensity);
    scene_lighthouse = result.scene;
    first_key_list = result.first_key_list;
    select_fixed_point = result.select_fixed_point;
    light_intensity = result.light_intensity;

    // scenes.push( scene_lighthouse );
}

//load ground OBJ file
function groundObjLoader(obj_url,obj_material) {
  var loader = new OBJLoader();
  loader.load(
      obj_url,
      function ( object ) {
            object.traverse(function(child){
                console.log("child type: "+child.type);
                if(child.type == "Mesh") {
                    child.material = obj_material;
                }
            }); 
            if(params.dataSet === data_list[0]){
                object.scale.set(0.4,0.1,0.3);
                object.position.set(-60,-10,20);
            }
            else if(params.dataSet === data_list[1]){
                object.scale.set(0.22,0.08,0.2);
                object.position.set(-30,-9,0);
            }
            else if(params.dataSet === data_list[2]){
                object.scale.set(0.22,0.08,0.2);
                object.position.set(-30,-9,0);
            }
            ground_object = object;
            scene_city.add( object );
      },
      function ( xhr ) {
          console.log( obj_url + ' ' + ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
      },
      function ( error ) {
          console.log( 'An error happened when loading ' + obj_url );
      }
  );
}


//load ground OBJ file
function buoyObjLoader(obj_url,obj_material) {
    var loader = new OBJLoader();
    loader.load(
        obj_url,
        function ( object ) {
              object.traverse(function(child){
                  console.log("child type: "+child.type);
                  if(child.type == "Mesh") {
                      child.material = obj_material;
                  }
              }); 
              object.scale.set(1,1,1);
              object.position.set(-500,-40,-500);
              object.name = 'buoy';
              scene_city.add( object );
        },
        function ( xhr ) {
            console.log( obj_url + ' ' + ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        },
        function ( error ) {
            console.log( 'An error happened when loading ' + obj_url );
        }
    );
}

function loadCityName(dataSet) {
    let text_geo;
    const loader = new THREE.FontLoader();
    // Name, V, E, \n# of Buildings, # of Buildings Shown(#_of_Buckets), \n\
    // Tallest building: < Location, Height, #Waves,#Fragments >,\n\
    // Max Fixpoint value, Max # of fragments, Max # of Waves.\n\
    // Size of Largest Wave(V,E), Size of Largest Fragment(V,E).\n
    let city_info_string = dataSet
    loader.load( '../textures/helvetiker_regular.typeface.json', function ( font ) {
        text_geo = new THREE.TextGeometry(city_info_string, {
            font: font,
            size: 200,
            height: 1,
        });
        text_geo.translate(-500,150,-1200);
        console.log("Load city info");
        // let texture_file = '../textures/noise.jpg';
        // let texture = new THREE.TextureLoader().load(texture_file);
        let text_mesh = new THREE.Mesh( text_geo, new THREE.MeshStandardMaterial( {
            // map: texture,
            color: 0xFFFFFF, transparent: true, opacity: 0.8
        }));
        scene_city.add(text_mesh);
    });   
    return scene;
}

function loadFile(file,manager) {
    let loader = new THREE.FileLoader(manager);
    let blob = null;
    loader.responseType = "blob";
    loader.load(file,
    function(data) {
        getAsText(data,file);
    },
    function(xhr) {
        console.log((file+' '+xhr.loaded/xhr.total*100)+'% loaded');
    },
    function(err) {
        console.error('An error happened when loading '+file);
    }
    );
}

function loadVoronoiFile(file,manager) {
    let loader = new THREE.FileLoader(manager);
    let blob = null;
    loader.responseType = "blob";
    loader.load(file,
    function(data) {
        getAsTextVoronoi(data,file);
    },
    function(xhr) {
        console.log((file+' '+xhr.loaded/xhr.total*100)+'% loaded');
    },
    function(err) {
        console.error('An error happened when loading '+file);
    }
    );
}

function loadMetaFile(file,manager) {
    let loader = new THREE.FileLoader(manager);
    let blob = null;
    loader.responseType = "blob";
    loader.load(file,
    function(data) {
        getAsTextMeta(data,file);
    },
    function(xhr) {
        console.log((file+' '+xhr.loaded/xhr.total*100)+'% loaded');
    },
    function(err) {
        console.error('An error happened when loading '+file);
    }
    );
}

function getAsText(file,url) {
    let reader = new FileReader();
    reader.readAsText(file);
    reader.onProgress = updateProgress;
    reader.onload = loaded;
    reader.onerror = errorHandler;
    reader.url = url;
    let text = reader.result;
}

function getAsTextVoronoi(file,url) {
    let reader = new FileReader();
    reader.readAsText(file);
    reader.onProgress = updateProgress;
    reader.onload = loadedVoronoi;
    reader.onerror = errorHandler;
    reader.url = url;
    let text = reader.result;
}

function getAsTextMeta(file,url) {
    let reader = new FileReader();
    reader.readAsText(file);
    reader.onProgress = updateProgress;
    reader.onload = loadedMeta;
    reader.onerror = errorHandler;
    reader.url = url;
    let text = reader.result;        
}

function updateProgress(evt) {
    if(evt.lengthComputable) {
        let loaded = (evt.loaded/evt.total);
    }
}

function errorHandler(evt) {
    if(evt.target.error.name == "NotReadableError") {
        console.log("The file could not be read");
    }
}

function loadedVoronoi(evt) {
    let fileString = evt.target.result;
    let lines = fileString.split('\n');
    let element_count = (lines[0].split(' ').length);
    let filename = evt.target.url;
    let result;
    if(element_count > 2){
        result = BUILD.loadVoronoi(city_all, lines, filename);
    }
    else{
        result = PATH.loadNeighbors(city_all, lines, filename);
        city_all = result.all;
        voronoiLoaded = true;
        if(metaLoaded && voronoiLoaded){
            let result_2 = PATH.pathPlanning(city_list[0],scene_city,city_all,light_objects.spotLight);
            scene_city = result_2.scene;
            path_objects = result_2.path;
            light_objects.spotLight = result_2.spotLight;
        }
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
    if(metaLoaded && voronoiLoaded){
        let result_2 = PATH.pathPlanning(city_list[0],scene_city,city_all,light_objects.spotLight);
        scene_city = result_2.scene;
        path_objects = result_2.path;
        light_objects.spotLight = result_2.spotLight;
    }
}

function fileToLayer(filename) {
    let start = filename.lastIndexOf('/');
    let end = filename.lastIndexOf('_');
    return filename.substring(start+1,end);
}

function loaded(evt) {
    let fileString = evt.target.result;
    let filename = evt.target.url;
    let layer_name;
    let lines = fileString.split('\n');
    let element_count = (lines[0].split(' ')).length;
    // need to update when SPIRAL.txt updates
    if(element_count == 7) {
        // console.log("loaded: SPIRAL file");
        let spiral = BUILD.loadSpiral(scene_city, lines, city_all, grass_objects, bush_objects, city_tracking, city_to_load, x_scale);
        city_all = spiral.all;
        city_tracking = spiral.tracking;
        grass_objects = spiral.grass;
        bush_objects = spiral.bush;
        city_to_load = spiral.city_count;
        printTime = true;
        for (const [key, value] of Object.entries(city_all)){
            let layer_name = key;
            city_list.push(layer_name);
            if(addBuildings){
                let color_file = source_dir + layer_name + "_color.txt";
                let floor_file = source_dir + layer_name + "_floor.txt";
                loadFile(color_file,manager);
                loadFile(floor_file,manager);
            }
        }
        loadVoronoiFile(voronoi_file,manager);
        loadVoronoiFile(neighbors_file,manager);
        loadMetaFile(meta_file,manager);
        PATH.updateDropdown(dropdown, city_list);
        dropdown.setValue(city_list[0]);
    } else if(element_count == 6) {
        // console.log("loaded: color file");
        layer_name = fileToLayer(filename);
        let result = BUILD.loadColor(lines, layer_name, city_all, city_tracking);
        city_all = result.all;
        city_tracking = result.tracking;
    } else if(element_count == 3) {
        // console.log("loaded: floor file");
        layer_name = fileToLayer(filename);
        let result = BUILD.loadFloor(lines, layer_name, city_all, city_tracking);
        city_all = result.all;
        city_tracking = result.tracking;
    }
}

function dayAndNight( isNight, light_objects, window_objects ){
    if(isNight){
        scene_city.background = new THREE.Color('midnightblue');
        light_objects.dayLights.forEach(object => object.visible = false);
        light_objects.nightLight.visible = true;
        light_objects.spotLight.visible = false;
        window_objects.forEach(object => object.visible=true);
        animate();
    }
    else{
        scene_city.background = new THREE.Color('skyblue');
        light_objects.dayLights.forEach(object => object.visible = true);
        light_objects.nightLight.visible = false;
        light_objects.spotLight.visible = true;
        window_objects.forEach(object => object.visible=false);
        animate();
    }
}

function createControls( camera ) {
    controls = new TrackballControls( camera, renderer.domElement );
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.keys = [ 65, 83, 68 ];
}

function onWindowResize() {
    let aspect = window.innerWidth / window.innerHeight;

    perspectiveCamera.aspect = aspect;
    perspectiveCamera.updateProjectionMatrix();

    orthographicCamera.left = - frustumSize * aspect / 2;
    orthographicCamera.right = frustumSize * aspect / 2;
    orthographicCamera.top = frustumSize / 2;
    orthographicCamera.bottom = - frustumSize / 2;
    orthographicCamera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
    controls.handleResize();
}

function animate() {
    requestAnimationFrame( animate );
    controls.update();
    // stats.update();
    if(city_to_load>0) {
        console.log("animate: run createCityMeshes()");
        let result = BUILD.createCityMeshes(scene_city, objects, city_all, city_tracking, truss_objects, window_objects, flag_objects, city_to_load, y_scale, paramsL.dataSet, params.isNight);
        scene_city = result.scene;
        city_all = result.all;
        city_tracking = result.tracking;
        objects = result.objects;
        city_to_load = result.remain;
        truss_objects = result.truss;
        window_objects = result.window;
    }else if(city_to_load==0 && printTime){
        let end_time = new Date();
        let end_time_string = end_time.getMinutes()+':'+end_time.getSeconds()+'.'+end_time.getMilliseconds();
        console.log("start time is "+start_time_string);
        console.log("end time is "+end_time_string);
        printTime = false;
    }
    render();
}

function render() {
    let camera = (params.orthographicCamera) ? orthographicCamera : perspectiveCamera;
    renderer.setScissor( 0, 0, sliderPos, window.innerHeight );
    renderer.setViewport(0, 0, sliderPos, window.innerHeight)
    renderer.render( scene_lighthouse, perspectiveCameraL );

    renderer.setScissor( sliderPos, 0, window.innerWidth, window.innerHeight );
    renderer.setViewport(sliderPos, 0, window.innerWidth, window.innerHeight);
    renderer.render( scene_city, camera );
    // let time = performance.now() * 0.001;
    // water.material.uniforms[ 'time' ].value += 1.0 / 60.0;
    if(toPanCity) {
        // console.log("pan city "+theta);
        theta += 0.1;
        camera.position.x = radius * Math.cos( THREE.MathUtils.degToRad( theta ) );
        // camera.position.y = radius/5+(radius/10) * Math.sin( THREE.MathUtils.degToRad( theta ) );
        camera.position.z = radius * Math.sin( THREE.MathUtils.degToRad( theta) );
        camera.lookAt( scene_city.position );
        if(theta>180) toPanCity = false;
    }
    else if(toPanBuilding) {
        // console.log("pan around building "+params.root);
        theta += 0.1;
        // let building_position = new THREE.Vector3(100,0,100);
        let root_building = dropdown.getValue();
        let building_position = city_all[root_building].coords;
        controls.target = new THREE.Vector3(building_position[0],30,building_position[1]);
        camera.position.x = building_position[0] + radius * Math.sin( THREE.MathUtils.degToRad( theta ) );
        camera.position.y = 100;
        // camera.position.y = radius * Math.sin( THREE.MathUtils.degToRad( theta ) );
        camera.position.z = building_position[1] + radius * Math.cos( THREE.MathUtils.degToRad( theta ) );
        if(theta>360) toPanBuilding = false;
    }
    else if(toZoomBuilding) {
        // console.log("zoom in to "+dropdown.getValue());
        // let building_position = new THREE.Vector3(100,0,100);
        let root_building = dropdown.getValue();
        let building_position = city_all[root_building].coords;
        controls.target = new THREE.Vector3(building_position[0],10,building_position[1]);
        // console.log(building_position[0]);
        if(Math.abs(building_position[0]-camera.position.x) >= 20) {
            camera.position.x += theta * (building_position[0]-camera.position.x);
            // console.log("x");
        }
        if(Math.abs(camera.position.y) >= 100) {
            camera.position.y += theta * (0-camera.position.y);
            // console.log("y");
        }
        if(Math.abs(building_position[1]-camera.position.z) >= 20) {
            camera.position.z += theta * (building_position[1]-camera.position.z);   
            // console.log("z");  
        } 
        else { toZoomBuilding = false; }
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

function onMouseMove( event ) {
    mouse.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;
    let camera = (params.orthographicCamera) ? orthographicCamera : perspectiveCamera;
    raycaster.setFromCamera( mouse, camera );

    let intersects = raycaster.intersectObjects( objects );
    if (intersects.length > 0) {
        // if the closest object intersected is not the currently stored intersection object
        if (intersects[0].object != INTERSECTED ) {
        INTERSECTED = intersects[0].object;
        if(intersects[0].object.floor_name) {
            building_params.floor = intersects[0].object.floor_name;
        } else {
            building_params.floor = '';
        }
        if(intersects[0].object.layer_name) {
            building_params.layer = intersects[0].object.layer_name;
        } else {
            building_params.layer = '';
        }
        }
    } else // there are no intersections
    {
        INTERSECTED = null;
        building_params.floor='';
        building_params.layer='';
    }
}

function onMouseDown(event)
{
    mouse.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;
    let camera = (params.orthographicCamera) ? orthographicCamera : perspectiveCamera;
    raycaster.setFromCamera( mouse, camera );

    let intersects = raycaster.intersectObjects( objects );
    let modal = document.getElementById("infoModal");
    let span = document.getElementsByClassName("close")[0];
    console.log(intersects);
    if (intersects.length > 0) {
        console.log("clicked on "+intersects[0].object.name);
        // if the closest object intersected is not the currently stored intersection object
        if (intersects[0].object.name == "buoy" ) {
            modal.style.display = "block";
        }
    }   
    span.onclick = function(){
        modal.style.display = "none";
    }
    window.onclick = function(event) {
        if(event.target == model){
            model.style.display = "none";
        }
    }
}

function initSlider() {

    const slider = document.querySelector( '.slider' );
    slider.style.left = "331px";
    function onPointerDown() {

        if ( event.isPrimary === false ) return;

        controls.enabled = true;

        window.addEventListener( 'pointermove', onPointerMove, false );
        window.addEventListener( 'pointerup', onPointerUp, false );

    }

    function onPointerUp() {

        controls.enabled = true;

        window.removeEventListener( 'pointermove', onPointerMove, false );
        window.removeEventListener( 'pointerup', onPointerUp, false );
        slider.style.left = "-40px";
        guiL.close();
        sliderPos = 0;
    }

    function onPointerMove( e ) {
        if ( event.isPrimary === false ) return;
        sliderPos = Math.max( 0, Math.min( window.innerWidth, e.pageX ) );
        slider.style.left = sliderPos - ( slider.offsetWidth / 2 ) + "px";
        slider.style.left = "-40px";
        guiL.close();
        sliderPos = 0;
    }

    slider.style.touchAction = 'none'; // disable touch scroll
    slider.addEventListener( 'pointerdown', onPointerDown );
}