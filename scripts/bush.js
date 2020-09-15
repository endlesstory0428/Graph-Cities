import * as THREE from '../node_modules/three/build/three.module.js';

let bushes = {};
let source_dir = "data/";
let last = [-187.86920742571192,-69.84011743155536]
let y_scale = Math.sqrt(last[0] ** 2 + last[1] ** 2) / 4.565727849181679;

export function loadBushData() {
    var requestURL = source_dir+"bushes.json";
    var request = new XMLHttpRequest();
  
    request.open('GET', requestURL);
    request.responseType = 'json';
  
    request.send();
  
    request.onload = function() {
      bushes = request.response;
    }
}

// layer name and coordinate of it on the ground, i.e [X,Z]
export function createBushMeshes(scene, layer, coord, num_fp, grassRad) {
    //console.log(bushes);
    var stepSize = 0.1;
    var iterations = 2;
    var rotationAngle = 18;
  
    var rules =  {
      "A": "I+[A+w]--//[--L]I[++L]",
      "I": "FS[//&&L][//^^L]FS",
      "S": "SFS",
      "w": "[&&&p/W////W////W////W////W]",
      "p": "FF",
      "W": "[^F][&&&&P]"
    }
  
    var command = "A"
  
    var DATA = bushes[layer]
    // console.log(layer, DATA)
  
    var turters = new Turtle(stepSize, rotationAngle);
    var commandEx = processLSystem(iterations, command, rules);
    // console.log("Iters:",iterations);
    // console.log("Iters:",iterations+1);
    var commandEx2 = processLSystem(iterations+1, command, rules);
  
    drawData(turters, DATA, commandEx, commandEx2);
    var meshes = createBushMesh(turters.vertices, turters.leafVertices, turters.petalVertices);
  
    var r = grassRad/2.0;
    for (let i = 0; i < num_fp; i++) {
      var theta = 2.0*Math.PI*i/num_fp;
      var x = coord[0] + r * Math.cos(theta);
      var z = coord[1] + r * Math.sin(theta);
      // console.log(coord, x, z, r, theta);
      var rot = Math.random()*2*Math.PI;
      for (let j = 0; j < meshes.length; j++) {
        var geo = meshes[j][0].clone();
        geo.scale(y_scale/8,y_scale/8,y_scale/8);
        geo.rotateY(rot);
        if (j == 0) {
          var mesh = new THREE.LineSegments( geo, meshes[j][1] );
          mesh.position.set( x, 1, z );
          scene.add( mesh );
        } else {
          var mesh = new THREE.Mesh( geo, meshes[j][1] );
          mesh.position.set( x, 1, z );
          scene.add( mesh );
        }
        // mesh.position.set( x, 1, z );
      }
    }  
}

function createBushMesh(lineVertices, leafVertices, petalVertices) {
    var canvasColor = '#f2f2f2';
    var lineColor = '#4c4c4c';
    var leafColor = '#1d8348';
    var petalColor = '#ff5733';
  
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( lineVertices, 3 ) );
    var material = new THREE.LineBasicMaterial( { color: lineColor, linewidth: 1} );
    //geometry.scale(33,1,33);
    // var lines = new THREE.LineSegments( geometry, material );
    // scene.add( lines );
  
    var leafGeometry = new THREE.BufferGeometry();
    leafGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( leafVertices, 3 ) );
    var leafMaterial = new THREE.MeshBasicMaterial( { color: leafColor, side: THREE.DoubleSide } );
    //leafGeometry.scale(33,1,33);
    // var leafMesh = new THREE.Mesh( leafGeometry, leafMaterial );
    // scene.add( leafMesh );
  
    var petalGeometry = new THREE.BufferGeometry();
    petalGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( petalVertices, 3 ) );
    var petalMaterial = new THREE.MeshBasicMaterial( { color: petalColor, side: THREE.DoubleSide } );
    //petalGeometry.scale(33,1,33);
    //var petalMesh = new THREE.Mesh( petalGeometry, petalMaterial );
    // scene.add( petalMesh );
  
    return [[geometry, material], [leafGeometry, leafMaterial], [petalGeometry, petalMaterial]]
  }
  
  function Turtle(stepSize, rotationAngle) {
    this.stepSize = stepSize;
    this.rotationAngle = rotationAngle * Math.PI / 180;
    this.stateStack = [];
    this.vertices = [];
    this.leafVertices = [];
    this.petalVertices = [];
    this.center = new THREE.Vector3(0, 0, 0);
    this.vertexSum = new THREE.Vector3(0, 0, 0);
    this.vertexCount = 1;
  
    // initialize at origin
    this.position = new THREE.Vector3( 0, 0, 0 );
  
    // initialize heading in the +y direction
    this.hlu = new THREE.Matrix3();
    this.hlu.set(
      0, 1, 0,
      1, 0, 0,
      0, 0, -1
    );
  
    this.moveForward = function(step=this.stepSize) {
      var h = new THREE.Vector3(
        this.hlu.elements[0],
        this.hlu.elements[1],
        this.hlu.elements[2]
      );
  
      this.vertices.push(
        this.position.x,
        this.position.y,
        this.position.z
      );
  
      this.position.addScaledVector(h, step);
  
      this.vertexSum.add(this.position);
      this.vertexCount++;
      this.center = this.vertexSum.clone().divideScalar(this.vertexCount);
  
      this.vertices.push(
        this.position.x,
        this.position.y,
        this.position.z
      );
    }
  
    this.moveForwardNoDraw = function(step=this.stepSize) {
      var h = new THREE.Vector3(
        this.hlu.elements[0],
        this.hlu.elements[1],
        this.hlu.elements[2]
      );
  
      this.position.addScaledVector(h, step);
    }
  
    this.turnLeft = function(d=-this.rotationAngle) {
      // var d = -this.rotationAngle;
      var rot = new THREE.Matrix3();
      rot.set(
        Math.cos(d), Math.sin(d), 0,
        -Math.sin(d), Math.cos(d), 0,
        0, 0, 1
      );
      this.hlu.multiply(rot);
    };
  
    this.turnRight = function(d=this.rotationAngle) {
      // var d =  this.rotationAngle;
      var rot = new THREE.Matrix3();
      rot.set(
        Math.cos(d), Math.sin(d), 0,
        -Math.sin(d), Math.cos(d), 0,
        0, 0, 1
      );
      this.hlu.multiply(rot);
    };
  
    this.pitchDown = function(d=-this.rotationAngle) {
      // var d = -this.rotationAngle;
      var rot = new THREE.Matrix3();
      rot.set(
        Math.cos(d), 0, -Math.sin(d),
        0, 1, 0,
        Math.sin(d), 0, Math.cos(d)
      );
      this.hlu.multiply(rot);
    };
  
    this.pitchUp = function(d=this.rotationAngle) {
      // var d = this.rotationAngle;
      var rot = new THREE.Matrix3();
      rot.set(
        Math.cos(d), 0, -Math.sin(d),
        0, 1, 0,
        Math.sin(d), 0, Math.cos(d)
      );
      this.hlu.multiply(rot);
    };
  
    this.rollLeft = function(d=-this.rotationAngle) {
      // var d = -this.rotationAngle;
      var rot = new THREE.Matrix3();
      rot.set(
        1, 0, 0,
        0, Math.cos(d), -Math.sin(d),
        0, Math.sin(d), Math.cos(d)
      );
      this.hlu.multiply(rot);
    };
  
    this.rollRight = function(d=this.rotationAngle) {
      // var d = this.rotationAngle;
      var rot = new THREE.Matrix3();
      rot.set(
        1, 0, 0,
        0, Math.cos(d), -Math.sin(d),
        0, Math.sin(d), Math.cos(d)
      );
      this.hlu.multiply(rot);
    };
  
    this.turnAround = function() {
      var rot = new THREE.Matrix3();
      rot.set(
        -1, 0, 0,
        0, -1, 0,
        0, 0, 1
      );
      this.hlu.multiply(rot);
    }
  
    this.pushState = function() {
      var turtleState = {
        position : this.position.clone(),
        hlu : this.hlu.clone()
      };
      this.stateStack.push(turtleState);
    };
  
    this.popState = function() {
      var turtleState = this.stateStack.pop();
      this.position = turtleState["position"];
      this.hlu = turtleState["hlu"];
    };
  
    this.drawLeaf = function() {
      var pos = new THREE.Vector3(this.position.x, this.position.y, this.position.z);
      var head = new THREE.Vector3(this.hlu.elements[0], this.hlu.elements[1], this.hlu.elements[2]);
      var left = new THREE.Vector3(this.hlu.elements[3], this.hlu.elements[4], this.hlu.elements[5]);
      var up = new THREE.Vector3(this.hlu.elements[6], this.hlu.elements[7], this.hlu.elements[8]);
  
      var edge1 = left.clone().multiplyScalar(0.5).add(head).normalize().multiplyScalar(this.stepSize);
      var edge2 = left.clone().multiplyScalar(0.5).negate().add(head).normalize().multiplyScalar(this.stepSize);
      var diag = edge1.clone().add(edge2);
  
      this.leafVertices.push(
        pos.x, pos.y, pos.z,
        (pos.clone().add(edge1)).x, (pos.clone().add(edge1)).y, (pos.clone().add(edge1)).z,
        (pos.clone().add(diag)).x, (pos.clone().add(diag)).y, (pos.clone().add(diag)).z,
        (pos.clone().add(diag)).x, (pos.clone().add(diag)).y, (pos.clone().add(diag)).z,
        (pos.clone().add(edge2)).x, (pos.clone().add(edge2)).y, (pos.clone().add(edge2)).z,
        pos.x, pos.y, pos.z,
      );
    }
  
    this.drawPetal = function() {
      var pos = new THREE.Vector3(this.position.x, this.position.y, this.position.z);
      var head = new THREE.Vector3(this.hlu.elements[0], this.hlu.elements[1], this.hlu.elements[2]);
      var left = new THREE.Vector3(this.hlu.elements[3], this.hlu.elements[4], this.hlu.elements[5]);
      var up = new THREE.Vector3(this.hlu.elements[6], this.hlu.elements[7], this.hlu.elements[8]);
  
      var edge1 = left.clone().multiplyScalar(0.5).add(head).normalize().multiplyScalar(this.stepSize);
      var edge2 = left.clone().multiplyScalar(0.5).negate().add(head).normalize().multiplyScalar(this.stepSize);
      var diag = edge1.clone().add(edge2);
  
      this.petalVertices.push(
        pos.x, pos.y, pos.z,
        (pos.clone().add(edge1)).x, (pos.clone().add(edge1)).y, (pos.clone().add(edge1)).z,
        (pos.clone().add(diag)).x, (pos.clone().add(diag)).y, (pos.clone().add(diag)).z,
        (pos.clone().add(diag)).x, (pos.clone().add(diag)).y, (pos.clone().add(diag)).z,
        (pos.clone().add(edge2)).x, (pos.clone().add(edge2)).y, (pos.clone().add(edge2)).z,
        pos.x, pos.y, pos.z,
      );
    }
  }
  
  function processLSystem(iterations, command, rules) {
    var re = /[\+\-\&\^\\\/\|\[\]]/g;
    for(var i = 0; i < iterations; i++) {
      var buffer = "";
      for(var j = 0; j < command.length; j++) {
        var symbol = command.charAt(j);
        if(!re.test(symbol) && rules[symbol] != null) {
          buffer += rules[symbol];
        } else {
          buffer += symbol;
        }
      }
      command = buffer;
    }
    return command;
  }
  
  function drawLSystem(turtle, command) {
    for(var i = 0; i < command.length; i++) {
      switch(command.charAt(i)) {
        case "F":
        case "G":
          turtle.moveForward();
          break;
        case "f":
          turtle.moveForwardNoDraw();
          break;
        case "+":
          turtle.turnLeft();
          break;
        case "-":
          turtle.turnRight();
          break;
        case "&":
          turtle.pitchDown();
          break;
        case "^":
          turtle.pitchUp();
          break;
        case "\\":
          turtle.rollLeft();
          break;
        case "/":
          turtle.rollRight();
          break;
        case "|":
          turtle.turnAround();
          break;
        case "[":
          turtle.pushState();
          break;
        case "]":
          turtle.popState();
          break;
        case "L":
          turtle.drawLeaf();
          break;
        case "P":
          turtle.drawPetal();
          break;
        default:
  
      }
    }
  }
  
  function drawLineHere(turtle, theta, phi, roll, length, lsys, lsys2, pp){
    turtle.pushState();
    turtle.rollLeft(theta);
    turtle.pitchDown(Math.PI/2-phi);
    for (var i = 1; i < 2*length+1; i++) {
      turtle.pushState();
      turtle.rollLeft(i*9.0+roll);
      if (i % pp == 0) {
        drawLSystem(turtle, lsys2);
      } else {
        drawLSystem(turtle, lsys);
      }
      turtle.popState();
      turtle.moveForward(0.5);
    }
    turtle.popState();
  }
  
  function drawEdgesHere(turtle, num, phi, roll, length, lsys, lsys2, pp) {
    var percent = phi*3.0/Math.PI
    var prop = Math.round(1/pp)
    // console.log("PP0: ", pp, prop);
    var i;
    for (i = 0; i < num*percent; i++) {
      drawLineHere(turtle, 7.0*i/num+roll, phi, roll, length, lsys, lsys2, prop);
    }
    // console.log("i?: ", i, num*percent, num*percent-i+1, (num*percent-i+1)*length);
    if (2*length*pp < 1) {
      prop = Math.floor(2*length-pp)
    }
    // console.log("PP1: ", pp, prop);
    drawLineHere(turtle,7.0*i/num+roll, phi, roll, (num*percent-i+1)*length, lsys, lsys2, prop);
  }
  
  function drawData(turtle, data, lsys, lsys2){
    // drawLineHere(turtle, 0, 0, 10, lsys);
    var max = 1;
    var maxP = 1;
    for (let i in data) {
      var floor = data[i]; // stem length, stem angle, inner num, inner length, inner angle, outer num, outer length, outer angle
      if (floor[3] > max){
        max = floor[3]
      }
      if (floor[6] > max){
        max = floor[6]
      }
      if (floor[8] > maxP) {
        maxP = floor[8]*1.0
      }
    }
    // console.log("Maxes: ", max, maxP);
    for (let i in data) {
      var floor = data[i]; // stem length, stem angle, inner num, inner length, inner angle, outer num, outer length, outer angle
      // console.log(floor[4], floor[7]);
      // drawEdgesHere(turtle, floor[2],floor[4] * Math.PI/180,floor[3], lsys);
      // drawEdgesHere(turtle, floor[5],floor[7] * Math.PI/180,floor[6], lsys);
      turtle.pitchDown(floor[1] * Math.PI/180);
      turtle.moveForward(floor[0]);
      turtle.hlu.set(
        0, 1, 0,
        1, 0, 0,
        0, 0, -1
      );
      drawEdgesHere(turtle, floor[2],floor[4] * Math.PI/180, 3.0*i/data.length, floor[3]/max, lsys, lsys2, floor[8]/maxP);
      turtle.rollLeft(2*i*Math.PI);
      drawEdgesHere(turtle, floor[5],floor[7] * Math.PI/180, 5.0*i/data.length, floor[6]/max, lsys, lsys2, floor[8]/maxP);
    }
}