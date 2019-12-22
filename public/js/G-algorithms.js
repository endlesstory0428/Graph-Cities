G.addModule("algorithms",{

	computeIterativeEdgeDecomposition:function(g,func,markerFunc){//func(g,markerArray) is a non-iterative vertex decomposition; it must skip edges that are marked, and may mark some edges in a marker array provided here; if it doesn't, markerFunc(g,markerArray) can be provided to mark these edges using the output from func.
	
		if(!g)return;
		let startTime=new Date().getTime();
		var vs = g.vertices;
		var es = g.edges;
		let degrees=[],remainingDegrees=[];
		let remainingEdges=es.length,edgeLayers=new Array(es.length);
		for (let i=0;i<vs.length;i++) {
			degrees[i]=Object.keys(g.vertices[i].edges).length;
			remainingDegrees[i]=degrees[i];
		}
		
		while(remainingEdges>0){
			let newEdgeLayers=Array.from(edgeLayers);
			let result=func(g,newEdgeLayers,remainingDegrees);//it may overwrite the edge layers for marking; if it doesn't return anything, 
			
			//mark last wave edges (all edges between these vertices)
			for (let i=lastWaveStartPos;i<vs.length;i++) {
				let vID=sortedVertexIndex[i];
				let v=vs[vID];let d=tempDegrees[vID];
				
				for(let uID in g.vertices[vID].edges){
					let u=vs[uID];let du=tempDegrees[uID],posu=positions[uID];
					let eID=g.vertices[vID].edges[uID];
					if(eID in edgeLayers)continue;
					//if(uID>vID){
						if(posu>=lastWaveStartPos){
							edgeLayers[eID]=waveCount;
							remainingDegrees[vID]--;if(remainingDegrees[vID]<0)throw Error();
							remainingDegrees[uID]--;if(remainingDegrees[uID]<0)throw Error();
							remainingEdges--;
						}
					//}
				}
			}
			waveCount++;
			
		}


		let endTime=new Date().getTime();
		console.log(g.name+": decomposed waves in "+(endTime-startTime)+"ms");
		return edgeLayers;
	},
	
	
	shortestPathHelper(g,visited,prev,queue,t){
		let hasTarget=((t!==undefined)&&(t!=null));
		let multiTarget=(typeof t=="object");
		while(queue.length>0){
			let current=queue.shift();
			let currentVertex=g.vertices[current];
			for(let n in g.vertices.edges[current]){
				
				if(!visited[n]){
					visited[n]=true;prev[n]=current;queue.push(Number(n));
				}
				if(hasTarget){
					if(multiTarget){
						if(n in t)return;
					}
					else{
						if(n==t)return;
					}
				}
				
			}
		}
	},

	
	shortestPath:function(g,s,t){//if there's no t, return the shortest path network from s
	
		let hasTarget=((t!==undefined)&&(t!=null));
		let multiTarget=(typeof t=="object");
		let visited=new Array(g.vertices.length);
		let prev=new Array(g.vertices.length);
		let queue=[];
		if(typeof s=="object"){
			for(let s1 in s){
				queue.push(s1);
				visited[s1]=true;
			}
		}
		else{
			queue.push(s);
			visited[s]=true;
		}
		this.shortestPathHelper(g,visited,prev,queue,t);
		let pathGetter=function(target){
			let result=[];
			if(typeof target=="object"){
				for(let test in target){
					if(!visited[test])continue;
					let temp=test;
					result.unshift(Number(temp));
					while(prev[temp]!==undefined){
						temp=prev[temp];result.unshift(Number(temp));
					}
					
					return result;
				}
			}
			else{
				if(visited[target]){
					let temp=target;
					result.unshift(Number(temp));
					while(prev[temp]!==undefined){
						temp=prev[temp];result.unshift(Number(temp));
					}
					return result;
				}
			}
		};
		if(hasTarget){
			return pathGetter(t);
		}
		else{
			return {pathFunc:pathGetter,prev:prev,visited:visited};
		}
			
	},
	
	
	nextLeaf:function(){
		if(G.activeLayer===null&&(Object.keys(G.dataset.layers).length>1)){
			G.addLog("please select a layer first");return;
		}
		
		let layer=G.activeLayer,g=G.dataset,ls=g.layers;
		if(Object.keys(G.dataset.layers).length==1){layer=Object.keys(G.dataset.layers)[0];}
		let layerObj=ls[layer],nodes=ls[layer].nodes,links=ls[layer].links;
		if(!("leafCount" in layerObj)){
			layerObj.leafCount=0;layerObj.leaves=[];layerObj.leafEdgeIndex=0;layerObj.leafRandomNumbers=[];
			layerObj.leafWaveCount=0;layerObj.leafWaveConnections=-1;//when a new leaf has conn. 0 it should be a new wave
			for(let node of nodes){
				node=g.clonedVertices[node.index];
				node.remainingDegree=node.degree;
			}
		}
		//an ordering of edges by decomposition sequence, for making sliders and animations
		//the leaves calculation should be done per layer
		
		let done=false;
		done=true;
		for(let node of nodes){
			if(!("leafID" in node)){done=false;break;}
		}
		if(done){G.addLog("all leaves have been found");return;}
		let bestStart=null,bestLeaf=null,bestLeafEdges=null,bestLeafEdgeSources=null,minStartDegree=Infinity,minConnections=Infinity,minExtraConnections=Infinity,minLeafEdges=Infinity,minConnectionDensity=Infinity;
		//try to use the start vertex degree as an priority condition, because otherwise in higher layers, a huge leaf often is chosen because its connection size would be zero, but it makes more sense to start from a vertex with smaller remaining degree. also I don't want too large leaves to be removed at once so smaller leaves win, so if the graph can be divided exactly into two leaves, the smaller one is removed
		//edges for the edge decomposition ordering
		let testLeafCount=0;
		for(let testStart of nodes){//test all vertices whose current degree is <= its layer
			if("leafID" in testStart)continue;
			if(testStart.remainingDegree>testStart.layer)continue;
			
			let start=g.clonedVertices[testStart.index];let queue=[];
			queue.push(start);
			let leafID=layerObj.leafCount;let tempLeaf=[],tempLeafEdges=[],tempLeafEdgeMap={},tempLeafEdgeSources=[];
			start.leafID=leafID;//set leafID before taking it out of the queue. the queue represents infection attempts. otherwise a vertex can be expanded twice.
			tempLeaf.start=start.id;tempLeaf.id=leafID;tempLeaf.startDegree=start.remainingDegree;
			tempLeaf.push(start);//the start needs to be already temporarily removed 
			start.tempRemainingDegree=start.remainingDegree;//this serves as the spreading strength marker
			
			while(queue.length>0){
				let node=queue.pop();
				
				for(let neighborID in node.edges){
					let neighbor=g.clonedVertices[neighborID];
					//if("leafID" in neighbor)continue;//temp or permanent
					//actually, if the expansion strength is the current remainingDegree not the value when it's inserted into teh queue (as is intuitive?) then we should decrement this for removed neighbors too; temp removed ones would need the decremented degree, and permanent ones wouldn't care
					if(("tempRemainingDegree" in neighbor) ==false)neighbor.tempRemainingDegree=neighbor.remainingDegree;
					//instead , use the edge's leafID(permanent) or tempLeafEdgeMap to decide if it should be ignored
					
					if(("leafID" in g.edges[node.edges[neighborID]])||(node.edges[neighborID] in tempLeafEdgeMap))continue;
					neighbor.tempRemainingDegree--;
					tempLeafEdges.push(g.edges[node.edges[neighborID]]);
					tempLeafEdgeSources.push(node);
					if(tempLeafEdgeMap[node.edges[neighborID]]){throw Error();}
					tempLeafEdgeMap[node.edges[neighborID]]=true;
					
					if(neighbor.tempRemainingDegree>node.tempRemainingDegree)continue;//not strong enough to remove it
					//when a node is removed, it  s temp remainingd degree will not be decreased anymore, so it serves as the spreading strength marker too
					if(!("leafID" in neighbor)){
						tempLeaf.push(neighbor);//used to remove the labels later
						neighbor.leafID=leafID;
						queue.push(neighbor);
					}
					
				}
			}
			let leafSize=tempLeaf.length;
			//get connection numbers
			let connections={},extraConnections={};
			for(let n of tempLeaf){
				for(let n2ID in n.edges){
					let n2=g.clonedVertices[n2ID];
					if(("leafID" in n2)==false){connections[n2ID]=true;extraConnections[n2ID]=true;}
					else if(n2.leafID!=leafID){extraConnections[n2ID]=true;}
				}
			}
			let connectionSize=Object.keys(connections).length,connectionExtraSize=Object.keys(extraConnections).length,startDegree=tempLeaf.startDegree;
			//the following counts connected edges, not connected vertices!
			let connectionEdgeSize=tempLeaf.filter((n)=>{let connected=false;for(let n2ID in n.edges){let n2=g.clonedVertices[n2ID];if(("leafID" in n2)==false){connected=true;break;}}return connected;}).length;//if any of its edges go to vertices that are not removed yet
			//let connectionExtraSize=tempLeaf.filter((n)=>{let connected=false;for(let n2ID in n.edges){let n2=g.clonedVertices[n2ID];if(n2.leafID!=leafID){connected=true;break;}}return connected;}).length;//if any of its edges go to a vertex in a different leaf or has not been removed
			tempLeaf.connectionSize=connectionSize;
			tempLeaf.connectionExtraSize=connectionExtraSize;
			tempLeaf.edgeCount=tempLeafEdges.length;//used elsewhere
			tempLeaf.edges=tempLeafEdges;//used elsewhere
			let connectionDensity=(connectionSize==0)?0:(connectionEdgeSize/connectionSize);
			tempLeaf.connectionDensity=connectionDensity;
			/*if((connectionSize==0)||((connectionSize==1)&&(connectionExtraSize<=1))){
				bestStart=start;bestLeaf=tempLeaf;bestLeafEdges=tempLeafEdges;bestLeafEdgeSources=tempLeafEdgeSources;
				minConnections=connectionSize;minExtraConnections=connectionExtraSize;
				for(let n of nodes){if("tempRemainingDegree" in n)delete n.tempRemainingDegree;}
				for(let n of tempLeaf){delete n.leafID;}
				break;//to stop when we find something hanging, no need to check further - but prioritize those that are hanging in the original layer
			}*/
			
			if(comparePairs(connectionDensity,minConnectionDensity,startDegree,minStartDegree,connectionSize,minConnections,tempLeafEdges.length,minLeafEdges,
					connectionExtraSize,minExtraConnections)){//made leaf edge # more important than "extra" connection count
				bestStart=start;bestLeaf=tempLeaf;bestLeafEdges=tempLeafEdges;bestLeafEdgeSources=tempLeafEdgeSources;
				minStartDegree=startDegree;minConnections=connectionSize;minExtraConnections=connectionExtraSize;
				minConnectionDensity=connectionDensity;
				minLeafEdges=tempLeafEdges.length;
			}
			//cleanup the temp leaf
			for(let n of nodes){if("tempRemainingDegree" in n)delete n.tempRemainingDegree;}
			for(let n of tempLeaf){delete n.leafID;}
			
			testLeafCount++;
			if(G.fasterLeavesFinding&&bestLeaf&&(testLeafCount>Math.log(nodes.length+1)+10))break;
		}
		if(!bestLeaf)throw Error();
		layerObj.leafCount++;layerObj.leaves.push(bestLeaf);layerObj.leafRandomNumbers.push(Math.random());
		if(bestLeaf.connectionSize>layerObj.leafWaveConnections){layerObj.leafWaveConnections=bestLeaf.connectionSize;layerObj.leafWaveCount++;}//is the wave defined by # of connections? maybe several numbers can be used to define a wave
		bestLeaf.waveIndex=layerObj.leafWaveCount;
		for(let node of bestLeaf){node.leafID=bestLeaf.id;}
		
		for(let i=0;i<bestLeafEdges.length;i++){
			
			let link=bestLeafEdges[i];if("leafID" in link)throw Error();
			link.leafID=bestLeaf.id;link.leafOrderingIndex=layerObj.leafEdgeIndex;layerObj.leafEdgeIndex++;link.leafSource=bestLeafEdgeSources[i];link.source.remainingDegree--;link.target.remainingDegree--;
		}
		if(layerObj.leafEdgeIndex>layerObj.links.length)throw Error();//repeated edge processing??
		setTimeout(()=>{console.log("leaf: "+bestLeaf.connectionSize+","+bestLeaf.connectionExtraSize+", v: "+bestLeaf.length+", e: "+bestLeafEdges.length)});
		if(G.leafAnimation){setTimeout(G.analytics.nextLeaf,G.leafAnimationInterval);}
		G.dataset.currentLeaf=bestLeaf;
		G.view.refreshSceneObject();
	},
	clearLeaves:function(){
		if(G.activeLayer===null&&(Object.keys(G.dataset.layers).length>1)){
			G.addLog("please select a layer first");return;
		}
		
		let layer=G.activeLayer,g=G.dataset,ls=g.layers;
		if(Object.keys(G.dataset.layers).length==1){layer=Object.keys(G.dataset.layers)[0];}
		
		let layerObj=ls[layer],nodes=ls[layer].nodes,links=ls[layer].links;
		if(!("leafCount" in layerObj)){G.addLog("no leaves to clear in this layer");return;}
		delete layerObj.leafCount;delete layerObj.leaves;delete layerObj.leafEdgeIndex; delete layerObj.leafRandomNumbers;delete layerObj.leafWaveCount;
		for(let node of nodes){
			delete node.remainingDegree;
			delete node.leafID;
			delete node.fx;delete node.fy;//clear pinning too
		}
		for(let link of links){
			delete link.leafID;
			delete link.leafOrderingIndex;
			delete link.leafSource;
		}
		G.view.refreshSceneObject();
		G.addLog("cleared all leaves in this layer");
	},
	createGraph:function createGraph(order,p){
		let dataset={vertices:[],edges:[],vertexCount:order,edgeProbability:p,name:"Random graph",info:"a random graph"},id;
		for(id=0;id<order;id++){
			dataset.vertices.push({id:id});
			for(let j=0;j<id;j++){
				if(Math.random()<dataset.edgeProbability){
					let e={s:id,t:j};
					dataset.edges.push(e);
				}
			}
		}
		dataset.edgeCount=dataset.edges.length;
		return dataset;
	},
	randomizeGraph:function(vCount,p) {
		if(typeof vCount =="undefined"){
			if((!this.dataset)||(!("edgeProbability" in this.dataset))){console.log("cannot get current vertex count");return;}
			vCount=this.dataset.order;p=this.dataset.edgeProbability;
		}
		G.load(this.createGraph(Math.floor(vCount),p));
	},
	halfVertices:function() {
		if((!this.dataset)||(!("edgeProbability" in this.dataset))){console.log("cannot half");return;}
		G.load(this.createGraph(Math.floor(this.dataset.vertices.length/2),this.dataset.edgeProbability));
	},
	doubleVertices:function() {
		if((!this.dataset)||(!("edgeProbability" in this.dataset))){console.log("cannot double");return;}
		G.load(this.createGraph(Math.floor(this.dataset.vertices.length*2),this.dataset.edgeProbability));
	},
	
	
});