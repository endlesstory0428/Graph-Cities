import * as THREE from '../../node_modules/three/build/three.module.js';
import {TrackballControls} from '../../node_modules/three/examples/jsm/controls/TrackballControls.js';
import {GUI} from '../../node_modules/three/examples/jsm/libs/dat.gui.module.js';
import {jet} from './jet_colormap.js';

let scene = new THREE.Scene(), scene2 = new THREE.Scene();
let renderer, renderer2;
let controls;
let perspectiveCamera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
// renderer.setSize( window.innerWidth/2, window.innerHeight/2 );
document.body.appendChild( renderer.domElement );

renderer2 = new THREE.WebGLRenderer();
renderer2.setPixelRatio( window.devicePixelRatio );
renderer2.setSize( window.innerWidth, window.innerHeight);
// renderer2.setSize( window.innerWidth/2, window.innerHeight/2);
document.body.appendChild( renderer2.domElement );

scene.background = new THREE.Color( 0xffffff );
window.addEventListener( 'resize', onWindowResize, false );

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const cube = new THREE.Mesh( geometry, material );
scene2.add( cube );

perspectiveCamera.position.z = 10;
// perspectiveCamera.position.y = 200;
createControls( perspectiveCamera );

const data_list = ['com-friendster','movies','cit-Patents'];
let first_key_list = [1];
let first_key_color_dict = {0:"#000000"};
let manager = new THREE.LoadingManager();
manager.onStart = function(url,itemsLoaded,itemsTotal) {
    console.log('Started loading file: '+url+'.\nLoaded '+itemsLoaded+' of '+itemsTotal+' files.');
};

let lighthouse_objects = [];
let entropy;

// GUI
let params = {
    dataSet:data_list[2],
    fixedPoint:first_key_list[0],
    color:first_key_color_dict[0],
    lightIntensity:0.1
}

let gui = new GUI({width:350, autoPlace: false});

let select_data = gui.add(params, 'dataSet', data_list).name('choose data set');
select_data.setValue(data_list[2]);
select_data.onChange(
    function (dataSet) {
        lighthouse_objects.every(object => scene.remove(object));
        createCitySummaryMesh(dataSet, scene);
    }
);
let select_fixed_point = gui.add(params, 'fixedPoint',first_key_list).name('choose fixed point');
let color_display = gui.addColor(params, 'color').name('display color');
let light_intensity = gui.add(params, 'lightIntensity').name('diversity');
let customContainer = document.getElementById('first-gui-container');
customContainer.appendChild(gui.domElement);

const animate = function () {
    requestAnimationFrame( animate );
    controls.update();
    renderer.render( scene, perspectiveCamera );
    renderer2.render(scene2,perspectiveCamera);
};

animate();

let result = createCitySummaryMesh(data_list[2], scene);
scene = result.scene;

// create "lighthouse" mesh that summarize whole city information
function createCitySummaryMesh(dataSet, scene) {
    const input_file = './'+dataSet+'-layers-dists.json';
    const entropy_file = './'+dataSet+'_entropy.json';
    $.getJSON(entropy_file, function(data){
        entropy = data;
    });
    $.getJSON(input_file, function(data) {
        let result = loadCitySummaryFile(data, scene);
        scene = result.scene;
    });
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

function colorToHex(c) {
    let hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

// RGB in [0,255]
function rgbToHex(r,g,b) {
    return parseInt("0x"+colorToHex(r)+colorToHex(g)+colorToHex(b));
}

//https://github.com/timothygebhard/js-colormaps/blob/master/overview.html
function enforceBounds(x) {
    if (x < 0) {
        return 0;
    } else if (x > 1){
        return 1;
    } else {
        return x;
    }
}

//https://github.com/timothygebhard/js-colormaps/blob/master/overview.html
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
        i = i+1;
    }
    i = i-1;

    var width = Math.abs(x_values[i] - x_values[i+1]);
    var scaling_factor = (x - x_values[i]) / width;

    // Get the new color values though interpolation
    var r = r_values[i] + scaling_factor * (r_values[i+1] - r_values[i])
    var g = g_values[i] + scaling_factor * (g_values[i+1] - g_values[i])
    var b = b_values[i] + scaling_factor * (b_values[i+1] - b_values[i])

    return [enforceBounds(r), enforceBounds(g), enforceBounds(b)];

}

function updateDropdown(target, list){   
    let innerHTMLStr = "";
    for(var i=0; i<list.length; i++){
        var str = "<option value='" + list[i] + "'>" + list[i] + "</option>";
        innerHTMLStr += str;        
    }
    if (innerHTMLStr != "") target.domElement.children[0].innerHTML = innerHTMLStr;
}

function loadCitySummaryFile(info, scene) {
    let max_radius = 0;
    let scale_factor = 1;
    let original_height_sum = 0;
    let Y = 0;
    first_key_color_dict = {};

    const peel_vals = Object.keys(info);
    const peel_value_range = Math.max(...peel_vals) - Math.min(...peel_vals);
    const peel_value_count = peel_vals.length;
    console.log("peel_value_min",Math.min(...peel_vals));
    console.log("peel_value_max",Math.max(...peel_vals));
    console.log("peel_value_range",peel_value_range);
    console.log("peel_value_count",peel_value_count);
    const peel_ratio = peel_value_range / peel_value_count;

    first_key_list = Object.keys(info);
    select_fixed_point.setValue(first_key_list[0]);
    light_intensity.setValue(parseFloat(entropy[first_key_list[0]]));
    console.log("light_intensity "+parseFloat(entropy[parseInt(first_key_list[0])]));
    updateDropdown(select_fixed_point, first_key_list);

    for(let key in info) {
        original_height_sum += sum_log(info[key]);
        // console.log("sum_log "+sum_log(info[key]));
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
        const peel_value_color = 1.0-(1.0/(Math.log2(parseInt(key)+1.0)));
        // console.log("key "+key+"peel_value_color "+peel_value_color);
        if(info.hasOwnProperty(key)) {
            // console.log(key+' -> '+info[key]);
            let color = interpolateLinearly(peel_value_color,jet); //jet colormap [0=blue, 1=red]
            let color_string = rgbToHex(Math.round(color[0]*255),Math.round(color[1]*255),Math.round(color[2]*255));
            first_key_color_dict[parseInt(key)] = color_string;    
            // const material = new THREE.MeshBasicMaterial({color:color_string}); //black color
            const entropy_intensity = entropy[parseInt(key)];
            const emissive_material = new THREE.MeshStandardMaterial({color:color_string,emissive:color_string,emissiveIntensity:entropy_intensity});
            for (let key2 in info[key]) {
                // console.log(key+'/'+key2+' -> '+info[key][key2]);
                const Y_dis = Math.log2(key2 + 1)*scale_factor;
                const R = cylinderRadius(info[key][key2]);
                const geometry = new THREE.CylinderGeometry(R,R,Y_dis,16,8);
                geometry.translate(0,Y,0);
                const cylinder = new THREE.Mesh(geometry,emissive_material);
                scene.add(cylinder);
                lighthouse_objects.push(cylinder);
                Y += Y_dis;
                console.log("Y "+Y+" Y_dis "+Y_dis+" R "+R);
            }
        }
    }
    color_display.setValue(first_key_color_dict[first_key_list[0]]);
    console.log(first_key_list);    
    select_fixed_point.onChange (
        function (key) {
            color_display.setValue(first_key_color_dict[parseInt(key)]);
            light_intensity.setValue(entropy[parseInt(key)]);
            console.log("light_intensity2 "+entropy[parseInt(key)]);
            // console.log("key "+key);
            // console.log("first_key_list[key] "+first_key_list[parseInt(key)]);
        }
    );
    
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
    // renderer.setSize( window.innerWidth/2, window.innerHeight/2 );
    renderer2.setSize( window.innerWidth, window.innerHeight );
    // renderer2.setSize( window.innerWidth/2, window.innerHeight/2 );
    controls.handleResize();
}

export {createCitySummaryMesh};