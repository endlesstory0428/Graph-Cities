import * as THREE from '../../node_modules/three/build/three.module.js';

let scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );
scene.background = new THREE.Color( 0xffffff );

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );
camera.position.z = 1000;
camera.position.y = 200;

const data_list = ['com-friendster','movies','cit-Patents'];
let manager = new THREE.LoadingManager();
manager.onStart = function(url,itemsLoaded,itemsTotal) {
    console.log('Started loading file: '+url+'.\nLoaded '+itemsLoaded+' of '+itemsTotal+' files.');
};


const animate = function () {
    requestAnimationFrame( animate );

    // cube.rotation.x += 0.01;
    // cube.rotation.y += 0.01;

    renderer.render( scene, camera );
};

animate();

let result = createCitySummaryMesh(data_list[0], scene);
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

function sum(obj) {
    let sum = 0;
    for(let a in obj) {
        if(obj.hasOwnProperty(a)) {
            sum += obj[a];
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
    const peel_ratio = peel_value_range / peel_value_count;

    for(let key in info) {
        original_height_sum = sum(info[key]);
        // console.log("original_height_sum "+original_height_sum);
        const layer_vals = Object.values(info[key]);
        const layer_max_radius = Math.max(...layer_vals);
        // console.log(key+'/'+layer_max_radius);
        const rad = cylinderRadius(layer_max_radius);
        if(max_radius < rad){ max_radius = rad;}
    }
    scale_factor = peel_ratio * max_radius / original_height_sum;
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
                const material = new THREE.MeshBasicMaterial({color:0x000000}); //black color
                const cylinder = new THREE.Mesh(geometry,material);
                scene.add(cylinder);
                Y += Y_dis;
            }
        }
    }
    return {scene: scene};
}

export {createCitySummaryMesh};