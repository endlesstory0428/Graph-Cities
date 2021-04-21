import * as THREE from '../../node_modules/three/build/three.module.js';
// import {TrackballControls} from '../../node_modules/three/examples/jsm/controls/TrackballControls.js';
// import {GUI} from '../../node_modules/three/examples/jsm/libs/dat.gui.module.js';
import {jet} from '../lighthouse/jet_colormap.js';

function loadCitySummaryFile(info, scene, lighthouse_objects, entropy, first_key_color_dict, first_key_list, select_fixed_point, color_display, light_intensity, bucketData, key_to_buckets) {
    let max_radius = 0;
    let scale_factor = 1;
    let original_height_sum = 0;
    let Y = 0;
    first_key_color_dict = {};

    const peel_vals = Object.keys(info);
    const peel_value_range = Math.max(...peel_vals) - Math.min(...peel_vals);
    const peel_value_count = peel_vals.length;
    // console.log("peel_value_min",Math.min(...peel_vals));
    // console.log("peel_value_max",Math.max(...peel_vals));
    // console.log("peel_value_range",peel_value_range);
    // console.log("peel_value_count",peel_value_count);
    const peel_ratio = peel_value_range / peel_value_count;

    first_key_list = Object.keys(info);
    select_fixed_point.setValue(first_key_list[0]);
    light_intensity.setValue(parseFloat(entropy[first_key_list[0]]));
    // console.log("light_intensity "+parseFloat(entropy[parseInt(first_key_list[0])]));
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
    // console.log("max_height",original_height_sum);
    // console.log("max_radius",max_radius);
    // console.log("peel_ratio",peel_ratio);
    // console.log("scale_factor", scale_factor);

    let max_R = 0;
    for(let key in info) {
        const peel_value_color = 1.0-(1.0/(Math.log2(parseInt(key)+1.0)));
        // console.log("key "+key+"peel_value_color "+peel_value_color);
        if(info.hasOwnProperty(key)) {
            // console.log(key+' -> '+info[key]);
            let color = interpolateLinearly(peel_value_color,jet); //jet colormap [0=blue, 1=red]
            const entropy_intensity = entropy[parseInt(key)];
            let color_hex = rgbToHex(Math.round(color[0]*255),Math.round(color[1]*255),Math.round(color[2]*255));
            // const material = new THREE.MeshBasicMaterial({color:color_string}); //black color
            
            let combined_geometry = new THREE.Geometry();
            const name = JSON.stringify(key).slice(1,-1);
            const emissive_material = new THREE.MeshStandardMaterial({color:color_hex,emissive:color_hex,emissiveIntensity:entropy_intensity});
            first_key_color_dict[parseInt(key)] = color_hex;
            let dY = 0, dR = 0, Y_min = Y;
            for (let key2 in info[key]) {
                // console.log(key+'/'+key2+' -> '+info[key][key2]);
                const Y_dis = Math.log2(key2 + 1)*scale_factor;
                let R = cylinderRadius(info[key][key2]);
                if(R > dR) {
                    dR = R;
                }
                const geometry = new THREE.CylinderGeometry(R,R,Y_dis,16,8);
                geometry.translate(0,Y,0);
                const cylinder = new THREE.Mesh(geometry);
                cylinder.updateMatrix();
                combined_geometry.merge(cylinder.geometry,cylinder.matrix);
                // cylinder.name = JSON.stringify(key).slice(1,-1);
                // console.log("cylinder name "+cylinder.name);
                // scene.add(cylinder);
                // lighthouse_objects.push(cylinder);
                Y += Y_dis;
                dY += Y_dis;
                // console.log("Y "+Y+" Y_dis "+Y_dis+" R "+R);
            }
            let Y_max = Y;
            let combined_mesh = new THREE.Mesh(combined_geometry, emissive_material);
            combined_mesh.name = name;
            combined_mesh.maxR = dR;
            combined_mesh.dY = dY;
            combined_mesh.Y_pos = (Y_max+Y_min)/2;
            // console.log("lighthouse - combined mesh name:", combined_mesh.name);
            lighthouse_objects.push(combined_mesh);
            scene.add(combined_mesh);
        }
    }
    // highlight the part of lighthouse when selected from dropdown
    const highlighter_material = new THREE.MeshStandardMaterial({color:0x000000,wireframe:true});
    const highlighter_geo = new THREE.CylinderGeometry(1,1,1,16,1);
    const highlighter = new THREE.Mesh(highlighter_geo,highlighter_material);
    highlighter.position.set(0, lighthouse_objects[0].Y_pos, 0);
    highlighter.scale.set(lighthouse_objects[0].maxR*1.1, lighthouse_objects[0].dY, lighthouse_objects[0].maxR*1.1);
    scene.add(highlighter);
    lighthouse_objects.push(highlighter);

    color_display.setValue(first_key_color_dict[first_key_list[0]]);
    // console.log(first_key_list);
    key_to_buckets = {};
    for(let key in bucketData) {
        if(bucketData.hasOwnProperty(key)){
            for(let i in bucketData[key]){
                let value = bucketData[key][i];
                if(key_to_buckets.hasOwnProperty(value)){
                    key_to_buckets[value].push(key);
                }else{
                    key_to_buckets[value]=[key];
                }
            }
        }
    }
    return {scene: scene, entropy: entropy, lighthouse_objects: lighthouse_objects, first_key_color_dict: first_key_color_dict, first_key_list: first_key_list,
        select_fixed_point: select_fixed_point, color_display: color_display, light_intensity: light_intensity, key_to_buckets: key_to_buckets};
}

function updateHighlighter(lighthouse_objects, selected) {
    for(let lighthouse in lighthouse_objects){
        // console.log(lighthouse.name, selected);
        if(lighthouse.name === selected){
            console.log("updateHighlighter");
        }
    }
    return {lighthouse_objects: lighthouse_objects};
}

function updateSelectionLights(city_all, light_objects, selected_buildings) {
    // console.log("updateSelectionLights: selected buildings are "+selected_buildings);
    let city_name = Object.keys(city_all);
    let city_name_sliced = city_name.slice();
    city_name_sliced.forEach(function(name,index){
        city_name_sliced[index]=name.slice(name.indexOf('_')+1,name.lastIndexOf('_'));
    })
    let selected_buildings_full = [];
    if (typeof selected_buildings === 'object') {
      for(let i=0;i<selected_buildings.length;i++){
          // console.log(i);
          let city_index = city_name_sliced.indexOf(selected_buildings[i]);
          let city_name_full = city_name[city_index];
          light_objects.selectionLights[i].position.set(city_all[city_name_full].coords[0],35,city_all[city_name_full].coords[1]);
          light_objects.selectionLights[i].target.position.set(city_all[city_name_full].coords[0],0,city_all[city_name_full].coords[1]);
          light_objects.selectionLights[i].visible=true;
          selected_buildings_full.push(city_name_full);
      }
    }
    // console.log("updateSelectionLights: selected buildings full names are "+selected_buildings_full);
    return {light_objects: light_objects, selected_buildings: selected_buildings_full};
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

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
}

// RGB in [0,255]
function rgbToHex(r,g,b) {
    return parseInt("0x"+colorToHex(r)+colorToHex(g)+colorToHex(b),16);
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

function updateDropdown(target, list){   
    let innerHTMLStr = "";
    for(var i=0; i<list.length; i++){
        var str = "<option value='" + list[i] + "'>" + list[i] + "</option>";
        innerHTMLStr += str;        
    }
    if (innerHTMLStr != "") target.domElement.children[0].innerHTML = innerHTMLStr;
}

export { loadCitySummaryFile, updateHighlighter, updateSelectionLights, hexToRgb, rgbToHex, updateDropdown };
