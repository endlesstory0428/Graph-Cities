import * as THREE from '../../node_modules/three/build/three.module.js';
import * as BUSH from '../bush.js';

function getLayerAllObj(layer_name) {
  let layer_all = {
    coords:[],
    colors:{},
    shapes:[],
    voronoi:[],
    V:0,
    E:0
  };
  return layer_all;
}

function getLayerTrackingObj(layer_name) {
  let layer_tracking = {
    ready_to_move: false,
    ready_to_color: false
  };
  return layer_tracking;
}

// add a new floor shape to a given building
function addNewFloor(city_all, layer_name, h, ground_r, inner_r, outer_r) {
  let floor = {
    height: h,
    ground_radius: ground_r,
    inner_radius: inner_r,
    outer_radius: outer_r
  }
  city_all[layer_name].shapes.push(floor);
  return {all: city_all};
}

// take layer name and lines from floor file, update the shape of building
function loadFloor(lines,layer_name, city_all, city_tracking) {
  // console.log("loadFloor: "+layer_name);
  if (!(layer_name in city_all)) {
    city_all[layer_name] = getLayerAllObj(layer_name);
  } else if (!(layer_name in city_all)) {
    city_all[layer_name] = getLayerTrackingObj(layer_name);
  }
  let i;
  let tmp_ground_radius = 0;
  let tmp_inner_radius = 0;
  
  for(i=0; i<lines.length; i++) {
      let elements = lines[i].split(' ');
      // console.log("loadFloor: floor "+i);
      // console.log(elements);
      if (elements.length === 4) {
        if (i % 3 == 0) {
          if (elements[0] === "0") {
            let result = addNewFloor(city_all, layer_name, 0.0, 0.0, 0.0, 0.0);
            city_all = result.all;
          };
          // console.log("loadFloor: add new floor "+city_all[layer_name].shapes.length);
          tmp_ground_radius = elements[2];
        } else if (i % 3 === 1){
          tmp_inner_radius = elements[2];
        } else if (i % 3 === 2) {
          // console.log("loadFloor: add new floor "+city_all[layer_name].shapes.length);
          // console.log("loadFloor: add new floor "+elements[0]+' '+elements[1]+' '+elements[2]+' '+tmp_outer_radius);
          let result = addNewFloor(city_all, layer_name, parseFloat(elements[1]), parseFloat(tmp_ground_radius), parseFloat(tmp_inner_radius), parseFloat(elements[2]));
          city_all = result.all;
        };
      }
  }
  city_all[layer_name].b_value = lines[lines.length-1];
  // shape of building is ready, check if coordinates is ready
  if(city_all[layer_name].coords.length > 0) {
    city_tracking[layer_name].ready_to_move = true;
  }
  // printGlobalDict("loadFloor");
  return {all: city_all, tracking: city_tracking};
}

// take color file of a layer and save information to global dictionary
function loadColor(color_list,layer_name, city_all, city_tracking) {
  // console.log("loadColor: " +layer_name);
  if (!(layer_name in city_all)) {
    city_all[layer_name] = getLayerAllObj(layer_name);
  }
  if (!(layer_name in city_tracking)) {
    city_tracking[layer_name] = getLayerTrackingObj(layer_name);
  }
  // inner structure of colors in layer_all dictionary
  let color_dict = {
    ground:[],
    inner:[],
    outer:[],
    next:[],
    ceil:[]
  };
  // read lines from a color file into "colors" dictionary
  let i;
  for(i=0; i<color_list.length; i++) {
    let elements = color_list[i].split(' ');
    let rgb = {
        r: parseFloat(elements[3]),
        g: parseFloat(elements[4]),
        b: parseFloat(elements[5])
    };
    if (color_list[i].search("ground")>0) {
      color_dict.ground.push(rgb);
    } else if (color_list[i].search("inner")>0) {
      color_dict.inner.push(rgb);
    } else if (color_list[i].search("outer")>0) {
      color_dict.outer.push(rgb);
    } else if (color_list[i].search("next")>0) {
      color_dict.next.push(rgb);
    }else if (color_list[i].search("ceil")>0) {
      color_dict.ceil.push(rgb);
    }
  }
  city_all[layer_name].colors = color_dict;
  city_tracking[layer_name].ready_to_color = true;
  // printGlobalDict("loadColor");
  return {all: city_all, tracking: city_tracking};
}

function loadSpiral(scene, lines, city_all, grass_objects, bush_objects, city_tracking, x_scale) {
  // console.log("loading spiral");
  // console.log(filename);
  let city_to_load = (lines.length-1) / 2;
  console.log("city_to_load = "+city_to_load);
  let building_with_grass = [];
  for(let i=0; i<lines.length-1; i++) {
    let elements = lines[i].split(' ');
    let layer_name = elements[0];
    //update global dictionaries if new layer appears
    if (!(layer_name in city_tracking)) {
      city_tracking[layer_name] = getLayerTrackingObj(layer_name);
      // console.log("loadSpiral: update city_tracking of "+layer_name);
    }
    if (!(layer_name in city_all)) {
      city_all[layer_name] = getLayerAllObj(layer_name);
    }
    city_all[layer_name].coords = [elements[1]/x_scale, elements[2]/x_scale, elements[3]]; /* X, Z, rotation */
    //grass
    let F = parseInt(layer_name.split('_').pop()); /* # of fixed points represented by selected building */
    if(F > 1) {
      building_with_grass.push(layer_name.slice(layer_name.indexOf('_')+1,layer_name.length));
      let grassRadius = parseFloat(elements[4]);
      let grassFace = Math.log2(8 * (F - 1));
      let grassGeo = new THREE.CylinderBufferGeometry(grassRadius, grassRadius, 0.2, grassFace);
      grassGeo.translate(city_all[layer_name].coords[0], 0, city_all[layer_name].coords[1]);
      let grassMat = new THREE.MeshStandardMaterial( {color: 0x7cfc00} );
      let grassMesh = new THREE.Mesh(grassGeo, grassMat);
      scene.add(grassMesh);
      grass_objects.push(grassMesh);

      let x_z = [city_all[layer_name].coords[0],  city_all[layer_name].coords[1]];
      let layer_name_end = layer_name.lastIndexOf('_');
      let simplified_layer_name = layer_name.slice(8,layer_name_end);
      let result = BUSH.createBushMeshes(scene, bush_objects, simplified_layer_name, x_z, grassFace, grassRadius);
      bush_objects = result.bush;
    }
    
    // flag
    city_all[layer_name].V = parseInt(elements[5]);
    city_all[layer_name].E = parseInt(elements[6]);
    city_all[layer_name]['fragNum'] = parseInt(elements[7]);
    city_all[layer_name]['fragNeg'] = parseInt(elements[8]);
    city_all[layer_name]['fragPos'] = parseInt(elements[9]);

    i++;

    city_all[layer_name]['fragBucket'] = lines[i].split(' ').map(x => parseInt(x, 10));

    // coordinates is ready, check if shape of building is ready
    if(city_all[layer_name].shapes.length > 0) {
      city_tracking[layer_name].ready_to_move = true;
    }
  }
  // console.log(building_with_grass);
  return {all: city_all, tracking: city_tracking, grass: grass_objects, bush: bush_objects, city_count: city_to_load};
}

function loadVoronoi(city_all, lines, filename){
  for(let i=0; i<lines.length-1; i++){
    let elements = lines[i].split(' ');
    let layer_name = elements[0];
    let voronoi = [];
    for(let j=1; j<elements.length; j=j+2){
      let voronoi_vertex = [elements[j],elements[j+1]];
      voronoi.push(voronoi_vertex);
    }
    city_all[layer_name].voronoi = voronoi;
    // console.log("loadVoronoi: "+layer_name+".voronoi "+city_all[layer_name].voronoi);
  }
  return {all: city_all};
}


function colorToHex(c) {
  let hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

// RGB in [0,255]
function rgbToHex(r,g,b) {
  return parseInt("0x"+colorToHex(r)+colorToHex(g)+colorToHex(b));
}

//given a normalized vector, compute the Euler angles of rotation for bars in truss structure
function rotateTruss(b) {
  let i,j;
  let a = [0,1,0];
  b[0] = -b[0];
  b[2] = -b[2];
  let v = [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  let c = a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  let I = [[1,0,0],[0,1,0],[0,0,1]];
  let v_matrix = [[0,-v[2],v[1]],[v[2],0,-v[0]],[-v[1],v[0],0]];
  let v_matrix_2 = [[-v[2]*v[2]-v[1]*v[1],v[0]*v[1],v[0]*v[2]],[v[0]*v[1],-v[0]*v[0]-v[2]*v[2],v[1]*v[2]],[v[0]*v[2],v[1]*v[2],-v[0]*v[0]-v[1]*v[1]]];
  let R = [];
  if(c == -1) {
    for(j=0; j<3; j++) {
      let line = [];
      for(i=0; i<3; i++) {
        line.push(I[i][j] + v_matrix[i][j] + v_matrix_2[i][j]);
      }
      R.push(line);
    }
  } else {
    for(j=0; j<3; j++) {
      let line = [];
      for(i=0; i<3; i++) {
        line.push(I[i][j] + v_matrix[i][j] + v_matrix_2[i][j]/(1+c));
      }
      R.push(line);
    }
  }
  let sy = Math.sqrt(R[0][0]*R[0][0]+R[1][0]*R[1][0]);
  // https://www.learnopencv.com/rotation-matrix-to-euler-angles/
  let singular = sy<1e-8;
  let x,y,z;
  if(!singular) {
    x = Math.atan2(R[2][1],R[2][2]);
    y = Math.atan2(-R[2][0],sy);
    z = Math.atan2(R[1][0],R[0][0]);
  } else {
    x = Math.atan2(-R[1][2],R[1][1]);
    y = Math.atan2(-R[2][0],sy);
    z = 0;
  }
    let rotate_rad = [x,y,z];
  return rotate_rad;
}

function mag(v) {
  return Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]);
}

function normalize(v) {
  let length = mag(v);
  let i;
  let normalized = [];
  for(i=0; i<3; i++) {
    normalized.push(v[i]/length);
  }
  return normalized;
}

function addTruss(scene,truss_objects,window_objects,h,center,top_radius,btm_radius,top_in_radius,height,r,g,b,isNight) {
  let torus_thickness = 0.1, bar_thickness = 0.1;
  let number = 6;
  let color = rgbToHex(r,g,b);
  let bars_geo = new THREE.Geometry();
  let material = new THREE.MeshStandardMaterial({color:color});
  let i;
  for (i = 0; i<number; i++) {
    let theta = i*(360/number);
    let theta_sin = Math.sin(theta*Math.PI/180);
    let theta_cos = Math.cos(theta*Math.PI/180);
    let bar_top_radius = top_radius + torus_thickness;
    let bar_btm_radius = btm_radius + torus_thickness;
    let top = [theta_cos*bar_top_radius,height/2,theta_sin*bar_top_radius];
    let btm = [theta_cos*bar_btm_radius,-height/2,theta_sin*bar_btm_radius];
    let top_btm = [top[0]-btm[0], top[1]-btm[1], top[2]-btm[2]];
    let length = mag(top_btm);
    let normalized_top_btm = normalize(top_btm);
    let mid_radius = (top_radius+bar_btm_radius)/2;
    let bar_center = [center[0]+theta_cos*mid_radius,center[1],center[2]+theta_sin*mid_radius];
    let bar = new THREE.CylinderGeometry(bar_thickness,bar_thickness,length,8,8);
    // rotate the side bars
    let rotated = rotateTruss(normalized_top_btm);
    bar.rotateX(rotated[0]);
    bar.rotateY(rotated[1]);
    bar.rotateZ(rotated[2]);
    bar.translate(bar_center[0],bar_center[1],bar_center[2]);
    bars_geo.merge(bar);
  }
  // create torus geometry
  let torus_geo = new THREE.TorusGeometry(top_radius,torus_thickness,8,30);
  torus_geo.rotateX(90*Math.PI/180);
  let torus_flat = new THREE.Geometry();
  torus_flat.merge(torus_geo);
  torus_flat.translate(center[0],center[1]+height/2,center[2]);
  bars_geo.merge(torus_flat);
  // convert truss geo to buffer geometry and add to scene
  let truss_buffer_geo = new THREE.BufferGeometry().fromGeometry(bars_geo);
  let bar_mesh = new THREE.Mesh(truss_buffer_geo,material);
  bar_mesh.updateMatrix();
  scene.add(bar_mesh);
  truss_objects.push(bar_mesh);
  // night version windows
  let theta_start_1=[0.5,-1.5,2.6], theta_start_2=[1.6,-0.5,3.7];
  let j;
  let window;
  let windows_geo = new THREE.Geometry();
  if(h % 2===0){
    for(j=0; j<3; j++){
      window = new THREE.CylinderGeometry(top_in_radius+torus_thickness,btm_radius+torus_thickness,height,18,8,true,theta_start_1[j],2*Math.PI/6);
      windows_geo.merge(window);
    }
  }else if(h % 2 !== 0){
    for(j=0; j<3; j++){
      window = new THREE.CylinderGeometry(top_in_radius+torus_thickness,btm_radius+torus_thickness,height,18,8,true,theta_start_2[j],2*Math.PI/6);
      windows_geo.merge(window);
    }
  }
  windows_geo.translate(center[0],center[1],center[2]);
  let windows_buffer_geo = new THREE.BufferGeometry().fromGeometry(windows_geo);
  let emissive_material = new THREE.MeshStandardMaterial({color:color,emissive:color,emissiveIntensity:1});
  let window_mesh = new THREE.Mesh(windows_buffer_geo, emissive_material);
  window_objects.push(window_mesh);
  scene.add(window_mesh);
  if(!isNight){window_objects.forEach(object => object.visible=false);}
  return {scene:scene, truss: truss_objects, window: window_objects};
}

function createFlags(scene, height, coord, base_Y, layer, V, E, fragNum, fragNeg, fragPos, fragBucket, flag_objects, lcc, peel, mast_scale, dataSet) {
  let loadFlagTexture = true;
  // console.log("coord of flag", fixed_point_number, "is", coord, "height of flag is", base_Y);
  let X = coord[0], Z = coord[1];
  let flag_width = Math.log(V), flag_height = Math.log(E), flag_thickness = 0.5;
  let mast_radius = Math.sqrt((1 + fragNeg + fragPos) / 4);
  let mast_length = mast_scale * Math.log(fragNum + 1) / Math.pow(mast_radius, 2) / 8;

  let flag_mesh;

  if(loadFlagTexture){
    // add text to flag
    if(lcc == 1) {
      flag_mesh = new THREE.Mesh( new THREE.BoxBufferGeometry(flag_width,flag_height,flag_thickness), new THREE.MeshStandardMaterial( {color: 0xffffff}));
      let loader = new THREE.FontLoader();
      loader.load( '../textures/helvetiker_regular.typeface.json', function ( font ) {
        // console.log("font loaded!");

          let text_geo = new THREE.Geometry(); 
          // let peel_geo = new THREE.TextGeometry( peel.toString(), {
          //   font: font,
          //   size: flag_width/peel.toString().length,
          //   height: flag_thickness/2+0.15
          // } );
          // if(peel.toString().length > 1){
          //   peel_geo.translate(X+flag_height/16,base_Y+mast_length+flag_height/2,Z);
          //   console.log(peel);
          // }else{
          //   peel_geo.translate(X+flag_height/16,base_Y+mast_length,Z);
          // }
          // console.log("text size: "+flag_width/peel.toString().length);
          // console.log("text height: "+flag_thickness/2+0.15);

          // console.log("building.js::createFlags - V = "+V.toString()+", E = "+E.toString()+", # of floors = "+height.toString());
          let text_size = flag_height/4;
          let text_height = flag_thickness/2+0.15;
          let height_offset = flag_height/32;
          let V_e = V.toExponential(2);
          let E_e = E.toExponential(2);
          let V_E_size = flag_width/(Math.max(V_e.length,E_e.toString().length));
          let peel_geo = new THREE.TextGeometry( "Peel: "+peel.toString(), { font: font, size: flag_width/(peel.toString().length+5), height: text_height } );
          peel_geo.translate(X+height_offset,base_Y+mast_length+height_offset,Z);
          let V_geo = new THREE.TextGeometry( "V: "+V_e, { font: font, size: V_E_size, height: text_height } );
          V_geo.translate(X,base_Y+mast_length+flag_height/4+2*height_offset,Z);
          let E_geo = new THREE.TextGeometry( "E: "+E_e, { font: font, size: V_E_size, height: text_height } );
          E_geo.translate(X,base_Y+mast_length+2*flag_height/4+height_offset,Z);
          let height_geo = new THREE.TextGeometry( height.toString()+" Floors", { font: font, size: flag_width/(height.toString().length+7), height: text_height } );
          height_geo.translate(X+height_offset,base_Y+mast_length+3*flag_height/4,Z);
          text_geo.merge(peel_geo);
          text_geo.merge(V_geo);
          text_geo.merge(E_geo);
          text_geo.merge(height_geo);
          let text_buffer_geo = new THREE.BufferGeometry().fromGeometry(text_geo);
          let text_mesh = new THREE.Mesh(text_buffer_geo,new THREE.MeshStandardMaterial( {color: 0x000000}));
        
          scene.add(text_mesh);
          flag_objects.push(text_mesh);
      });
    }
    else if(lcc > 1){
      let texture_url = "../../textures/plots/"+dataSet+'_'+layer.slice(layer.indexOf('_')+1,layer.lastIndexOf('_'))+'.png';
      // console.log(texture_url);
      let url_exists = ifUrlExists(texture_url);
      let flag_material;
      if(url_exists){
        let flag_texture = new THREE.TextureLoader().load(texture_url);
        flag_material = new THREE.MeshStandardMaterial( {map:flag_texture} );
      }else{
        flag_material = new THREE.MeshBasicMaterial({color:"white"});
      } 
      flag_mesh = new THREE.Mesh( new THREE.BoxBufferGeometry(flag_width,flag_height,flag_thickness), flag_material);
    }
  }

  flag_mesh.translateX(X+flag_width/2);
  flag_mesh.translateY(base_Y+mast_length+flag_height/2);
  flag_mesh.translateZ(Z);
  let rod = new THREE.Mesh( new THREE.CylinderBufferGeometry(mast_radius,mast_radius,mast_length,8), new THREE.MeshStandardMaterial( {color: 0xcccccc}));
  rod.translateX(X);
  rod.translateY(base_Y+mast_length/2);
  rod.translateZ(Z);
  
  scene.add(flag_mesh);
  scene.add(rod);
  flag_objects.push(flag_mesh);
  flag_objects.push(rod);

  for (let index = -1; index < fragBucket.length + 1; index++) {
    let fragdensity = 0;
    if (index === -1) {
      fragdensity = 0;
    } else {
      fragdensity = fragBucket[index] / fragNum;
    };
    const markerPos = mast_length * fragdensity;
    let markerSize = 0.05
    let marker_radius = mast_radius * (1 + 0.05 * (1 + Math.abs(index - fragNeg + 1)));
    let markerColor = 0x000000;
    if (index === fragNeg - 1) {
      markerSize = 0.025
      markerColor = 0xff0000;
    }
    let marker = new THREE.Mesh( new THREE.CylinderBufferGeometry(marker_radius,marker_radius,markerSize,8), new THREE.MeshStandardMaterial( {color: markerColor}));
    marker.translateX(X);
    marker.translateY(base_Y + markerPos + markerSize / 2);
    marker.translateZ(Z);

    scene.add(marker);
    flag_objects.push(marker);
  }
  return {scene: scene, flag_mast: flag_height+mast_length, flags: flag_objects};
}

//check if url exists
function ifUrlExists(url) {
  var request;
  if(window.XMLHttpRequest)
      request = new XMLHttpRequest();
  else
      request = new ActiveXObject("Microsoft.XMLHTTP");
  request.open('GET', url, false);
  request.send(); // there will be a 'pause' here until the response to come.
  // the object request will be actually modified
  if (request.status === 404) {
      console.log("404 - Url Does Not Exist - "+url)
      return false;
  }
  return true;
}

// check city_tracking, create buildings that are ready to color & move
// delete colored and moved building from city_tracking
function createCityMeshes(scene, objects, city_all, city_tracking, ceil_objects, middle_objects, truss_objects, window_objects, flag_objects, arrow_objects, city_to_load, y_scale, dataSet, ceilVisible, isNight, oneBuilding=false) {
  for (let layer in city_tracking) {
    // console.log(city_tracking[layer].ready_to_move)
    // console.log(city_tracking[layer].ready_to_color)
    if(city_tracking[layer].ready_to_move && city_tracking[layer].ready_to_color) {
      let layer_shape = city_all[layer].shapes;
      let height = layer_shape.length;
      // translate in X,Z direction
      let X = city_all[layer].coords[0];
      let Z = city_all[layer].coords[1];
      if(oneBuilding){
        X = 0;
        Z = 0;
      }
      // loop from bottom floor to top floor
      for (let h=1; h<height; h++) {
        // translate in Y direction
        let Y = y_scale*(0.5*layer_shape[h].height + 0.5*layer_shape[h-1].height);
        // create inner frustum geometry
        let top_in_r = layer_shape[h].inner_radius;
        let btm_in_r = layer_shape[h].ground_radius;
        let tall = y_scale*(layer_shape[h].height - layer_shape[h-1].height);
        let floor = new THREE.CylinderBufferGeometry(top_in_r,btm_in_r,tall,16,16);
        floor.translate(X,Y,Z);
        // apply colors
        let r, g, b;
        try {
            r = parseInt(city_all[layer].colors.inner[h-1].r*255);
            g = parseInt(city_all[layer].colors.inner[h-1].g*255);
            b = parseInt(city_all[layer].colors.inner[h-1].b*255);    
        } catch(err) {
            console.log(err.message+" "+layer);
        }
        // let material = new THREE.MeshStandardMaterial({color:rgbToHex(r,g,b),transparent:true,opacity:0.3});
        let material = new THREE.MeshStandardMaterial({color:rgbToHex(r,g,b), opacity:1.0, transparent:true});
        let frustum_mesh = new THREE.Mesh(floor,material);
        frustum_mesh.floor_name = h;
        frustum_mesh.layer_name = layer.substring(8);
        // draw inner frustums
        scene.add(frustum_mesh);
        middle_objects.push(frustum_mesh);
        objects.push(frustum_mesh);


        // draw ceil
        const ceil_size = 0.05;
        const ceilY = y_scale * layer_shape[h].height - ceil_size / 2;
        let ceil = new THREE.CylinderBufferGeometry(top_in_r,top_in_r,ceil_size,16,16);
        ceil.translate(X,ceilY,Z);
        
        r = parseInt(city_all[layer].colors.ceil[h-1].r*255);
        g = parseInt(city_all[layer].colors.ceil[h-1].g*255);
        b = parseInt(city_all[layer].colors.ceil[h-1].b*255);
        
        material = new THREE.MeshStandardMaterial({color:rgbToHex(r,g,b)});
        frustum_mesh = new THREE.Mesh(ceil,material);
        frustum_mesh.visible = ceilVisible;

        scene.add(frustum_mesh);
        ceil_objects.push(frustum_mesh);

        // draw center frustums
        if (h < height - 1) {
          let top_nx_r = layer_shape[h+1].ground_radius;
          let btm_nx_r = btm_in_r;
          let center = new THREE.CylinderBufferGeometry(top_nx_r,btm_nx_r,tall,16,16);
          center.translate(X,Y,Z);

          r = parseInt(city_all[layer].colors.next[h-1].r*255);
          g = parseInt(city_all[layer].colors.next[h-1].g*255);
          b = parseInt(city_all[layer].colors.next[h-1].b*255);

          material = new THREE.MeshStandardMaterial({color:rgbToHex(r,g,b)});
          frustum_mesh = new THREE.Mesh(center,material);

          scene.add(frustum_mesh);
          objects.push(frustum_mesh);
        };

        // outer frustums
        //create outer frustum as truss structure
        let top_out_r = layer_shape[h].outer_radius;
        let btm_out_r = btm_in_r;
        r = parseInt(city_all[layer].colors.outer[h-1].r*255);
        g = parseInt(city_all[layer].colors.outer[h-1].g*255);
        b = parseInt(city_all[layer].colors.outer[h-1].b*255);
        let result = addTruss(scene,truss_objects,window_objects,h,[X,Y,Z],top_out_r,btm_out_r,top_in_r,tall,r,g,b,isNight);
        truss_objects = result.truss;
        window_objects = result.window;
        scene = result.scene;
      }
      let flag_base_Y = y_scale * layer_shape[height-1].height;
      city_all[layer].coords[3] = flag_base_Y; // 2021-10-18: I am not sure what coords[2] is, so I just append after it.
      let lcc =  parseInt(layer.slice(layer.lastIndexOf('_')+1)); // last
      let sliced = layer.slice(0,layer.lastIndexOf('_'));
      sliced = sliced.slice(0,sliced.lastIndexOf('_'));
      let fixed = parseInt(sliced.slice(sliced.lastIndexOf('_')+1)); // third to last
      let mast_scale = y_scale;
      // let mast_length = mast_scale * height;
      let result = createFlags(scene, height-1, [X,Z], flag_base_Y, layer, city_all[layer].V, city_all[layer].E, city_all[layer].fragNum, city_all[layer].fragNeg, city_all[layer].fragPos, city_all[layer].fragBucket, flag_objects, lcc, fixed, mast_scale, dataSet);
      scene = result.scene;
      flag_objects = result.flags;
      let flag_mast_height = result.flag_mast;
      let result_arrow = createArrows(scene, layer, [X, Z], flag_base_Y, arrow_objects, flag_mast_height)
      scene = result_arrow.scene;
      arrow_objects = result_arrow.arrow_objects;
      console.log("createCityMeshes: loaded "+layer+", city to load = "+city_to_load);
      delete city_tracking[layer];
      --city_to_load;
    }
  }
  return {scene: scene, objects: objects, remain: city_to_load, 
    all: city_all, tracking: city_tracking, ceil: ceil_objects, middle: middle_objects, truss: truss_objects, 
    window: window_objects, arrow: arrow_objects};
}

function createArrows(scene, name, coord, Y, arrow_objects, flag_mast_height) {
  const length = 30;
  const color = 0xffffff;
  const headLength = 10;
  const headWidth = 5;
  const X = coord[0];
  Y = Y + flag_mast_height + length + headLength/2;
  const Z = coord[1];
  let direction = new THREE.Vector3(0,-1,0);
  direction.normalize();
  let origin = new THREE.Vector3(X,Y,Z);

  let arrow = new THREE.ArrowHelper(direction, origin, length, color, headLength, headWidth);
  arrow.visible = false;
  arrow_objects[name] = arrow;
  scene.add(arrow);
  return {scene: scene, arrow_objects: arrow_objects};
}

export {loadColor, loadSpiral, loadFloor, loadVoronoi, createCityMeshes};
