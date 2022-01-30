import * as THREE from '../../node_modules/three/build/three.module.js';
// import * as mst from './TSP-MST/MST.js'
// import {AdjMatrixGraph} from './TSP-MST/adjMatrixGraph.js'

function updateDropdown(target, list){   
    let innerHTMLStr = "";
    for(var i=0; i<list.length; i++){
        var str = "<option value='" + list[i] + "'>" + list[i] + "</option>";
        innerHTMLStr += str;        
    }
    if (innerHTMLStr != "") target.domElement.children[0].innerHTML = innerHTMLStr;
}

function loadNeighbors(city_all, lines, filename='') {
    let neighbors = [];
    let weightedNeighbors = [];
    // console.log(lines)
    // console.log('loadNeighbors')
    for(let i=0; i<lines.length-1; i++){
        let elements = lines[i].trim().split(' ');
        // console.log(elements)
        let neighbor_pair = [elements[0],elements[1]];
        let weightedNeighbor_pair = [elements[0],elements[1],parseFloat(elements[2])];
        neighbors.push(neighbor_pair);
        weightedNeighbors.push(weightedNeighbor_pair);
    }
    city_all.graph = makeGraph(neighbors);
    city_all.weightedGraph = makeWeightedGraph(weightedNeighbors);
    return {all: city_all};
}

function matchLayerName(layers,a) {
    let layer_name;
    for(let i=0; i<layers.length; i++) {
        layer_name = layers[i];
        let sliced = layer_name.slice(layer_name.indexOf('_')+1,layer_name.lastIndexOf('_'));
        if(sliced == a) {
            return layer_name;
        }
    }
}

function loadMeta(city_all, lines, filename='') {
    let connections = {};
    let layers = Object.keys(city_all);
    // console.log(layers);
    for(let i=0; i<lines.length-1; i++) {
        let elements = lines[i].split(',');
        let layer_1 = elements[0]+'_'+elements[1], layer_2 = elements[2]+'_'+elements[3], value = elements[4];
        layer_1 = matchLayerName(layers,layer_1);
        layer_2 = matchLayerName(layers,layer_2);
        if(!(layer_1 in connections)) {
            connections[layer_1] = {};
        }
        connections[layer_1][layer_2] = value;
    }
    city_all.connections = connections;
    // console.log(connections);
    return {all: city_all};
}

function makeGraph(neighbors){
    let graph_dict = {};
    for (let i = 0; i < neighbors.length; i++) {
        let element = neighbors[i];
        if(!(element[0] in graph_dict)){
            graph_dict[element[0]] = [];
        }
        if(!(element[1] in graph_dict)){
            graph_dict[element[1]] = [];
        }
        if(! graph_dict[element[0]].includes(element[1])){
            graph_dict[element[0]].push(element[1]);
        }
        if(! graph_dict[element[1]].includes(element[0])){
            graph_dict[element[1]].push(element[0]);
        }        
    }
    return graph_dict;
}

function makeWeightedGraph(weighedNeighbors){
    let graph_dict = {};
    for (let i = 0; i < weighedNeighbors.length; i++) {
        let element = weighedNeighbors[i];
        if(!(element[0] in graph_dict)){
            graph_dict[element[0]] = [];
        }
        if(!(element[1] in graph_dict)){
            graph_dict[element[1]] = [];
        }
        if(! graph_dict[element[0]].includes(element[1])){
            graph_dict[element[0]].push([element[1], element[2]]);
        }
        if(! graph_dict[element[1]].includes(element[0])){
            graph_dict[element[1]].push([element[0], element[2]]);
        }        
    }
    return graph_dict;
}

function pathPlanning(root, scene, city_all, light_objects){
    // console.log("pathPlanning: root is "+root);
    let result = makeSpanningTree(scene, city_all, root);
    // light_objects.spotLight.position.set(city_all[root].coords[0],35,city_all[root].coords[1]);
    // light_objects.spotLight.target.position.set(city_all[root].coords[0],0,city_all[root].coords[1]);
    // spotLight.visible = true;
    scene = result.scene;
    let path_objects = result.path;
    return { scene: scene, path: path_objects, light_objects: light_objects };
}

function notIn(arr, target){
    return arr.every(v => v !== target);
}

function makeSpanningTree(scene, city_all, root){
    let path_objects = [];
    let graph = city_all.graph;
    let queue = [[root]];
    let visited = [];
    let visited_neighbors = [root];
    // console.log(graph);
    let count = 0;

    while(queue.length > 0 && count < 500){
        count ++;
        // console.log("makeSpanningTree: count = "+count+" queue.length = "+queue.length);
        let path = queue.shift();
        let node = path[path.length-1];
        if(notIn(visited, node)){
            let neighbors = graph[node];
            for (let i = 0; i < neighbors.length; i++) {
                let neighbor = neighbors[i];
                let new_path = path.slice();
                if(notIn(new_path, neighbor)){
                    new_path.push(neighbor);
                }
                queue.push(new_path);
                let start_point = node;
                let end_point = neighbor;
                if(notIn(visited_neighbors, neighbor)){
                    let result = connectNeighbors(scene, city_all[start_point], city_all[end_point], start_point, end_point, path_objects, city_all.connections);
                    // console.log("makeSpanningTree: There's an connection between");
                    // console.log(start_point);
                    // console.log(end_point);
                    scene = result.scene;
                    path_objects = result.path;
                    visited_neighbors.push(neighbor);
                }
            }
            visited.push(node);
        }
    }
    return {scene: scene, path: path_objects};
}

function findSharedEdge(list_1, list_2){
    for(let i = 0; i < list_1.length; i ++){
        for(let j = 0; j < list_2.length; j++){
            let one = [], two = [];
            one.push(parseFloat(list_1[i][0]));
            one.push(parseFloat(list_1[i][1]));
            two.push(parseFloat(list_2[j][0]));
            two.push(parseFloat(list_2[j][1]));
            if((one[0]-two[0]<0.0001) && (one[1]-two[1]<0.0001)){
                return [one,two];
            }
        }
    }
    return 0;
}

function getDistance(A, B){
    return Math.sqrt(Math.pow(A[0]-B[0],2)+Math.pow(A[1]-B[1],2));
}

function getMiddlePoint(A, B){
    return [(B[0]+A[0])/2, (B[1]+A[1])/2];
}

function getRotation(A, B){
    return Math.atan((A[0]-B[0])/(A[1]-B[1]));
}

function connectNeighbors(scene, building_1, building_2, building_name_1, building_name_2, path_objects, connections){
    let start_coord = [building_1.coords[0], building_1.coords[1]];
    let end_coord = [building_2.coords[0], building_2.coords[1]];
    let start_vor = building_1.voronoi;
    let end_vor = building_2.voronoi;
    let shared_edge = findSharedEdge(start_vor, end_vor);
    if(shared_edge === 0){
        return scene;
    }
    let path = [start_coord, end_coord];
    let width;
    if((building_name_1 in connections) && (building_name_2 in connections[building_name_1])){
        width = parseFloat(connections[building_name_1][building_name_2]);
    } else if((building_name_2 in connections) && (building_name_1 in connections[building_name_2])){
        width = parseFloat(connections[building_name_2][building_name_1]);
    }
    width *= 100; // scale up 100 times
    // console.log("connectNeighbors: width between "+building_name_1+" and "+building_name_2+" = "+width);
    for (let i = 0; i < path.length-1; i++) {
        let height = getDistance(path[i],path[i+1]);
        if(width > 0){
            let geometry = new THREE.PlaneBufferGeometry(width+1, height);
            let material = new THREE.MeshStandardMaterial( {color: 0xffffff, side: THREE.DoubleSide} );
            let path_segment = new THREE.Mesh( geometry, material );
            let position = getMiddlePoint(path[i],path[i+1]);
            let rotation = getRotation(path[i],path[i+1]);
            path_segment.rotateX(90*Math.PI/180);
            let path_segment_tmp_1 = new THREE.Object3D(); 
            path_segment_tmp_1.add(path_segment);
            path_segment_tmp_1.rotateY(rotation); 
            let path_segment_tmp_2 = new THREE.Object3D();
            path_segment_tmp_2.add(path_segment_tmp_1);
            path_segment_tmp_2.position.set(position[0],0,position[1]);
            // console.log("connectNeighbors: "+height+" "+position+" "+rotation);
            path_objects.push(path_segment_tmp_2);
            scene.add(path_segment_tmp_2);
        }
    }
    return {scene: scene, path: path_objects};
}

function makeSpanningTreeDebug(graph, root){
    let queue = [[root]];
    let visited = [];
    let visited_neighbors = [root];
    console.log(graph);
    let count = 0;
    
    while(queue.length > 0 && count < 50){
        count ++;
        let path = queue.shift();
        // console.log("makeSpanningTree: queue.length = "+queue.length);
        let node = path[path.length-1];
        // console.log("makeSpanningTree: node = "+node);
        const notIn = arr => arr.every(v => v !== node);
        if(notIn(visited)){
            // console.log("makeSpanningTree: node not in visited");
            let neighbors = graph[node];
            // console.log("makeSpanningTree: node neighbors = "+neighbors);
            for (let i = 0; i < neighbors.length; i++) {
                let neighbor = neighbors[i];
                // console.log("makeSpanningTree: neighbor = "+neighbor);
                let new_path = path.slice();
                const canAdd = arr => arr.every(v => v !== neighbor);
                if(canAdd(new_path)){
                    new_path.push(neighbor);
                }
                // console.log("makeSpanningTree: new_path = ");
                // console.log(new_path);
                queue.push(new_path.slice());
                let start_point = node;
                let end_point = neighbor;
                const notIn_2 = arr => arr.every(v => v !== neighbor);
                if(notIn_2(visited_neighbors)){
                    console.log("makeSpanningTree: There's an connection between");
                    console.log(start_point);
                    console.log(end_point);
                    // scene = connectNeighbors(scene, city_all[start_point], city_all[end_point]);
                    visited_neighbors.push(neighbor);
                }
                // console.log("makeSpanningTree: queue = ");
                // console.log(queue);
            }
            visited.push(node);
            // console.log("makeSpanningTree: visited = "+visited);
        }
    }
}

// let graph = {
//     'A': ['B','C'],
//     'B': ['A','D','E'],
//     'C': ['A','E','F'],
//     'D': ['B','G'],
//     'E': ['B','C','H'],
//     'F': ['C'],
//     'G': ['D'],
//     'H': ['E','I'],
//     'I': ['H']
// }

// let root = 'A';
// makeSpanningTreeDebug(graph, root);

function getTourPath(triangulationGraph, src, tgt) {
    // TODO: check it is a valid triangulation
    const prevDict = {};
    const queue = new PriorityQueue({ comparator: function(a, b) { return -(b[1] - a[1]); }});
    queue.queue([src, 0, null]);
    // console.log(triangulationGraph)
    while(queue.length !== 0) {
        const [tempNode, tempDist, prevNode] = queue.dequeue();
        if (prevDict.hasOwnProperty(tempNode)) {
            continue;
        }
        prevDict[tempNode] = prevNode;
        if (tempNode.normalize() === tgt.normalize()) {
            break;
        }

        for (const [nextNode, dist] of triangulationGraph[tempNode]) {
            if (prevDict.hasOwnProperty(nextNode)) {
                continue;
            }
            queue.queue([nextNode, tempDist + dist, tempNode])
        };
    }

    let tempNode = tgt;
    const path = [];
    while (tempNode !== null) {
        path.unshift(tempNode);
        tempNode = prevDict[tempNode];
    };
    return path;
}

function getMST(graph, root) {
    const prevDict = {};
    const queue = new PriorityQueue({ comparator: function(a, b) { return -(b[1] - a[1]); }});
    const vertexList = Object.keys(graph)
    queue.queue([root, 0, null]);

    let leftVerticesNum = vertexList.length;
    while(leftVerticesNum > 0) {
        const [tempNode, tempDist, prevNode] = queue.dequeue();
        if (prevDict.hasOwnProperty(tempNode)) {
            continue;
        }
        prevDict[tempNode] = prevNode;
        leftVerticesNum --;

        for (const [nextNode, dist] of graph[tempNode]) {
            if (prevDict.hasOwnProperty(nextNode)) {
                continue;
            }
            queue.queue([nextNode, dist, tempNode])
        };
    };
    // console.log(prevDict, root);

    const childDict = {};
    for (const [child, parent] of Object.entries(prevDict)) {
        if (parent === null) {
            continue;
        }
        if (!childDict.hasOwnProperty(parent)) {
            childDict[parent] = []
        }
        childDict[parent].push(child)
    };

    // console.log(childDict, root)
    return [childDict, prevDict]
}

function getPreOrder(tree, prevDict, root, city_all) {
    console.log(prevDict)
    console.log(root);
    console.log(tree[root]);

    function getSize(v) {
        const [x, y] = v;
        return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
    }
    function getUnit(v) {
        const [x, y] = v;
        const size = getSize(v);
        return [x/size, y/size];
    };
    function getAngleUnit(v1, v2) {
        function getAngleSizeUnit(v1, v2) {
            const [x1, y1] = v1;
            const [x2, y2] = v2;
            return Math.acos(x1 * x2 + y1 * y2);
        };
        function getAngleDirectionUnit(v1, v2) {
            const [x1, y1] = v1;
            const [x2, y2] = v2;
            return x1 * y2 - x2 * y1 >= 0 ? 1 : -1;
        }
        return getAngleDirectionUnit(v1, v2) * getAngleSizeUnit(v1, v2);
    };

    function getUnitDirection(building1, building2) {
        const p1 = [city_all[building1].coords[0], city_all[building1].coords[1]];
        const p2 = [city_all[building2].coords[0], city_all[building2].coords[1]];
        const v = [p2[0] - p1[0], p2[1] - p1[1]];
        return getUnit(v);
    };

    let initQueue = tree[root].map(d => [d, getAngleUnit([1, 0], getUnitDirection(root, d))])
    console.log(initQueue);
    initQueue.sort((a, b) => (a[1] - b[1]));
    

    const queue = initQueue.map(d => d[0]);
    const retval = [root];

    while (queue.length !== 0) {
        const tempNode = queue.shift();
        retval.push(tempNode);
        if (tree.hasOwnProperty(tempNode)) {
            // console.log(tree[tempNode])
            const prevNode = prevDict[tempNode];
            const tempChildren = tree[tempNode].map(d => [d, getAngleUnit(getUnitDirection(prevNode, tempNode), getUnitDirection(tempNode, d))]).sort((a, b) => (a[1] - b[1])).map(d => d[0]);
            queue.unshift(...tempChildren)
        }
    }
    return retval;
}
// // // TSP-MST by Rajath start
// function minDistance(dist,sptSet, V)
// {
//     let min = Number.MAX_VALUE;
//     let min_index = -1;
    
//     for(let v = 0; v < V; v++)
//     {
//         if (sptSet[v] == false && dist[v] <= min) 
//         {
//             min = dist[v];
//             min_index = v;
//         }
//     }
//     return min_index;
// }

// function dijkstra(graph, src, V)
// {
//     let dist = new Array(V);
//     let sptSet = new Array(V);

//     for(let i = 0; i < V; i++)
//     {
//         dist[i] = Number.MAX_VALUE;
//         sptSet[i] = false;
//     }
    
//     dist[src] = 0;

//     for(let count = 0; count < V - 1; count++)
//     {
//         let u = minDistance(dist, sptSet, V);    
//         sptSet[u] = true;

//         for(let v = 0; v < V; v++)
//         {
//             if (!sptSet[v] && graph[u][v] != 0 && dist[u] != Number.MAX_VALUE && dist[u] + graph[u][v] < dist[v]){
//                 dist[v] = dist[u] + graph[u][v];
//             }
//         }
//     }

//     return dist
// }

// function getCityTourArray(data) {
//     let dataDict = {};    
//     let it = 0

//     for (let loc in data){
//         dataDict[loc] = it;
//         it += 1;
//     }

//     let V = Object.keys(dataDict).length
//     let nodeList = Array(V).fill(' ')

//     for (let nodeVal in dataDict){
//         nodeList[dataDict[nodeVal]] = nodeVal
//     }

//     let graph = new AdjMatrixGraph(V)

//     for (let loc in data){
//         let d = data[loc]
//         for(let j = 0; j < d.length; j++){
//             graph.addEdge(dataDict[loc], dataDict[d[j][0]], d[j][1])
//         }        
//     }

//     // let selectedGraph = new AdjMatrixGraph(V)

//     // for(let i = 0; i < V; i++){
//     //     let distances = dijkstra(graph.matrix, i, V)
//     //     for(let j = 0; j < V; j++){
//     //         selectedGraph.addEdge(i, j, distances[j])
//     //     }
//     // }
//     let selectedGraph = graph

//     // writeToFile('./graph.json', JSON.stringify(graph))
//     console.log(selectedGraph)

//     // writeToFile('./selectedGraph.json', JSON.stringify(selectedGraph))
//     let path = mst.primMST(selectedGraph.matrix, V) 

//     let output = []
//     for (let x in path){
//         output.push(nodeList[x])
//     }    
//     // output.push(output[0])

//     console.log(output)
//     return output;
// }
// // // TSP-MST by Rajath end

function getCityTour(city_all, startBuilding) {
    const triangulationGraph = city_all.weightedGraph;
    let root =  Object.keys(triangulationGraph).map(d => [d, city_all[d].spiralIdx]).sort((a, b) => (a[1] - b[1]))[0][0];
    const [MST, prevDict] = getMST(triangulationGraph, root);
    const tourArray = getPreOrder(MST, prevDict, root, city_all);
    // console.log(tourArray)
    if (startBuilding === null || startBuilding === undefined) {
        return [...tourArray, tourArray[0]];
    }
    const startIndex = tourArray.indexOf(startBuilding);
    if (startIndex === -1) {
        alert('wrong index');
        return [...tourArray, tourArray[0]];
    }
    return [...tourArray.slice(startIndex), ...tourArray.slice(0, startIndex), tourArray[startIndex]];
}

function drawPath(city_all, buildingList) {
    const path_objects = [];
    const width = 1;
    const path = buildingList.map(d => [city_all[d].coords[0], city_all[d].coords[1]])
    const connections = city_all.connections;
    for (let i = 0; i < path.length-1; i++) {
        const srcName = buildingList[i]
        const tgtName = buildingList[i+1]
        // console.log(city_all.connections)
        
        let height = getDistance(path[i],path[i+1]);

        let geometry = new THREE.PlaneBufferGeometry(width+1, height);
        let material;
        if ( (connections.hasOwnProperty(srcName) && connections[srcName].hasOwnProperty(tgtName)) || (connections.hasOwnProperty(tgtName) && connections[tgtName].hasOwnProperty(srcName)) ) {
            material = new THREE.MeshStandardMaterial( {color: 0xffffff, side: THREE.DoubleSide} );
        } else {
            material = new THREE.MeshStandardMaterial( {color: 0xffffff, side: THREE.DoubleSide, wireframe: true, opacity: 0.25, transparent: true} );
        }
        let path_segment = new THREE.Mesh( geometry, material );
        let position = getMiddlePoint(path[i],path[i+1]);
        let rotation = getRotation(path[i],path[i+1]);
        path_segment.rotateX(90*Math.PI/180);
        let path_segment_tmp_1 = new THREE.Object3D(); 
        path_segment_tmp_1.add(path_segment);
        path_segment_tmp_1.rotateY(rotation); 
        let path_segment_tmp_2 = new THREE.Object3D();
        path_segment_tmp_2.add(path_segment_tmp_1);
        path_segment_tmp_2.position.set(position[0],0,position[1]);
        // console.log("connectNeighbors: "+height+" "+position+" "+rotation);

        // let wireframe = new THREE.WireframeGeometry( path_segment_tmp_2.geometry );
        // let line = new THREE.LineSegments( wireframe, new THREE.LineDashedMaterial( {
        //     color: 0xffffff,
        //     linewidth: 10,
        //     scale: 1,
        //     dashSize: 10,
        //     gapSize: 1,
        // } ));

        // console.log(line)

        path_objects.push(path_segment_tmp_2);
        // path_objects.push(line);

    }
    return path_objects;
}


export {updateDropdown, loadNeighbors, loadMeta, pathPlanning, getTourPath, getCityTour, drawPath};