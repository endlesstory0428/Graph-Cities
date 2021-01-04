import * as THREE from '../../node_modules/three/build/three.module.js';
import {TrackballControls} from '../../node_modules/three/examples/jsm/controls/TrackballControls.js';
let scene = new THREE.Scene();
let controls;
let perspectiveCamera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );
scene.background = new THREE.Color( 0xffffff );

// const geometry = new THREE.BoxGeometry();
// const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
// const cube = new THREE.Mesh( geometry, material );
// scene.add( cube );
perspectiveCamera.position.z = 10;
// perspectiveCamera.position.y = 200;
createControls( perspectiveCamera );

const data_list = ['com-friendster','movies','cit-Patents'];
let manager = new THREE.LoadingManager();
manager.onStart = function(url,itemsLoaded,itemsTotal) {
    console.log('Started loading file: '+url+'.\nLoaded '+itemsLoaded+' of '+itemsTotal+' files.');
};


const animate = function () {
    requestAnimationFrame( animate );
    controls.update();
    renderer.render( scene, perspectiveCamera );
};

animate();

let result = createCitySummaryMesh(data_list[2], scene);
scene = result.scene;

// create "lighthouse" mesh that summarize whole city information
function createCitySummaryMesh(dataSet, scene) {
    let input_file = './'+dataSet+'-layers-dists.json';
    $.getJSON(input_file, function(data) {
        let result = loadCitySummaryFile(data, scene);
        scene = result.scene;
    })
    return {scene: scene};
}

function cylinderRadius(vh_h) {
    return Math.sqrt(Math.log2(vh_h + 0.1) / Math.PI);
    // return Math.log2(Math.sqrt(vh_h / Math.PI));
    // return Math.sqrt(vh_h / Math.PI);
}

function sum_log(obj) {
    let sum = 0;
    for(let a in obj) {
        if(obj.hasOwnProperty(a)) {
            sum += Math.log2(parseInt(a)+1);
            // console.log("obj "+obj+" a "+a+" log_2(a) "+Math.log2(parseInt(a)+1));
        }
    }
    return sum;
}

function loadCitySummaryFile(info, scene) {
    let max_radius = 0;
    let scale_factor = 1;
    let original_height_sum = 0;
    let Y = 0;

    const peel_vals = Object.keys(info);
    const peel_value_range = Math.max(...peel_vals) - Math.min(...peel_vals);
    const peel_value_count = peel_vals.length;
    console.log("peel_value_range",peel_value_range);
    console.log("peel_value_count",peel_value_count);
    const peel_ratio = peel_value_range / peel_value_count;

    for(let key in info) {
        original_height_sum += sum_log(info[key]);
        console.log("sum_log "+sum_log(info[key]));
        // console.log("original_height_sum "+original_height_sum);
        const layer_vals = Object.values(info[key]);
        const layer_max_radius = Math.max(...layer_vals);
        // console.log(key+'/'+layer_max_radius);
        const rad = cylinderRadius(layer_max_radius);
        if(max_radius < rad){ max_radius = rad;}
    }

    scale_factor = peel_ratio * max_radius / original_height_sum;
    console.log("max_height",original_height_sum);
    console.log("max_radius",max_radius);
    console.log("peel_ratio",peel_ratio);
    console.log("scale_factor", scale_factor);

    for(let key in info) {
        if(info.hasOwnProperty(key)) {
            // console.log(key+' -> '+info[key]);
            for (let key2 in info[key]) {
                // console.log(key+'/'+key2+' -> '+info[key][key2]);
                const Y_dis = Math.log2(key2 + 1)*scale_factor;
                const R = cylinderRadius(info[key][key2]);
                const geometry = new THREE.CylinderGeometry(R,R,Y_dis,8,8);
                geometry.translate(0,Y,0);
                const material = new THREE.MeshBasicMaterial({color:0x00ffff}); //black color
                const cylinder = new THREE.Mesh(geometry,material);
                scene.add(cylinder);
                Y += Y_dis;
                // console.log("Y "+Y+" Y_dis "+Y_dis+" R "+R);
            }
        }
    }
    return {scene: scene};
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

    renderer.setSize( window.innerWidth, window.innerHeight );

    controls.handleResize();
}

export {createCitySummaryMesh};