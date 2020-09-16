import * as THREE from '../node_modules/three/build/three.module.js';
import { TrackballControls } from '../node_modules/three/examples/jsm/controls/TrackballControls.js';
import { GUI } from '../node_modules/three/examples/jsm/libs/dat.gui.module.js';
import { BufferGeometryUtils } from '../three.js/examples/jsm/utils/BufferGeometryUtils.js';
import { OBJLoader } from '../three.js/examples/jsm/loaders/OBJLoader.js';
import { loadBushData } from './bush.js';
import {loadColor, loadSpiral, loadFloor, loadVoronoi, createCityMeshes} from './building.js';
import {updateDropdown, loadNeighbors, pathPlanning} from './path.js';

alert("It is working");