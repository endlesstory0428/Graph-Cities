'use strict';
let sourceName="s",targetName="t",layerName="l",weightName="w";
class Graph{//assumed to be not synchronized with clients
	constructor(){
		//to save memory, now although vertices may have ids, they are indexed by an array(and if deleted, leave holes in teh array) and edges refer to the vertex index not id, and the graph will be exported so that edges refer to a continuous numeric vertex index. (or we don't have to make teh vertex index continuous?)
		this.vertices=[];this.edges=[];//now I assume vertices and edges cannot be deleted? Or they can but only before finalization
		this.vertexMap={};//id to index
		this.adjacencyList=[];//array of maps from vertex indices to edge indices
		this.vertexCount=0;
		this.edgeCount=0;
		this.maxVertexID=0;
		this.maxEdgeID=0;
		this.warningCount=0;
		this.warningReasons={};
		this.repeatedWarningLimit=3;
	}
	warn(str,reason){
		//if(this.warningCount>10){return;}
		
		//if(this.warningCount==10){console.log("too many similar warnings, will not show more");this.warningCount++;return;}
		
		if(!(reason in this.warningReasons)){
			this.warningReasons[reason]=0;
		}//do not repeatedly warn for predictable reasons such as creating edges with unknown vertices
		this.warningReasons[reason]++;this.warningCount++;
		if(this.warningReasons[reason]>this.repeatedWarningLimit){
			return;
		}
		else{
			console.log(this.name+": "+reason+" - "+str);
			if(this.warningReasons[reason]==this.repeatedWarningLimit){console.log("too many similar warnings, will not show more");}
		}
	}
	log(str){
		console.log(this.name+" - "+str);
	}
	setName(str){this.name=str;}
	adjacent(a,b){return this.vertexMap[b] in this.adjacencyList[this.vertexMap[a]];}
	
	hasVertex(id){return (id in this.vertexMap);}
	getVertex(id){
		if(this.hasVertex(id)){return this.vertices[this.vertexMap[id]];}
		else throw Error("Graph "+this.name+" error: no such vertex "+id);
	}
	getVertexIndex(id){
		if(this.hasVertex(id)){return this.vertexMap[id];}
		else throw Error("Graph "+this.name+" error: no such vertex "+id);
	}
	getEdge(source,target){
		return this.edges[this.adjacencyList[this.getVertexIndex(source)][this.getVertexIndex(target)]];
	}
	addVertex(id){//
		//console.log("add vertex",id,typeof(id));
		if(id===undefined){
			while(this.hasVertex(this.maxVertexID))this.maxVertexID++; id=this.maxVertexID;
			//console.log("assigned vertex id "+id);
		}
		if(typeof id=="number")id=id.toString();
		
		if(this.hasVertex(id)){
			this.warn(id,"repeated vertex");
			return this.getVertex(id);
		}
		let v={id:id};let index=this.vertices.length;this.vertices.push(v);this.vertexMap[id]=index;
		this.adjacencyList[index]={};this.vertexCount++;
		return v;
	}
	
	addEdge(source,target)
	{//for now edges are undirected; they may need to have properties, so we use edge index (>=0) in the adjacency maps, and have another edges array (but no edges map)
		//console.log("add edge",source,typeof source,target,typeof target);
		if(typeof source=="number")source=source.toString();
		if(typeof target=="number")target=target.toString();
		if(this.hasVertex(source)==false){this.warn(source,"created unknown vertex");this.addVertex(source);}
		if(this.hasVertex(target)==false){this.warn(target,"created unknown vertex");this.addVertex(target);}
		
		let si=this.getVertexIndex(source),ti=this.getVertexIndex(target);
		if(source==target){
			this.warn(source,"self loop");
			let e={};
			e[sourceName]=si;e[targetName]=ti;
			return e;//allow the user code to set edge properties but it will have no effect on the data except for creating this vertex if it wasn't there
		}
		if(this.adjacent(source,target)){
			this.warn(source+", "+target,"repeated edge");
			return this.getEdge(source,target);
		}
		
		//while(this.maxEdgeID in this.edges)this.maxEdgeID++;
		let index=this.edges.length;
		let e={};e[sourceName]=si;e[targetName]=ti;
		this.edges[index]=e;
		this.adjacencyList[si][ti]=index;
		this.adjacencyList[ti][si]=index;
		this.edgeCount++;
		//this.broadcast("add",e);
		//console.log("added edge "+source+", "+target);
		return e;
	}

	updateGraph(){
		//for when v/e are changed by otehr ways like loading
		if(!(this.edgesLoaded&&this.verticesLoaded))return;
		this.adjacencyList=[];this.vertexCount=this.vertices.length;this.edgeCount=this.edges.length;//??
		
		for(let i=0;i<this.vertices.length;i++){let v=this.vertices[i];this.adjacencyList.push({});this.vertexMap[v.id]=i;}
		for(let i=0;i<this.edges.length;i++){
			let e=this.edges[i];
			if(!this.adjacencyList[e[sourceName]])throw Error("invalid source vertex index "+JSON.stringify(e) +" "+JSON.stringify(this.adjacencyList));
			if(!this.adjacencyList[e[targetName]])throw Error("invalid target vertex index "+JSON.stringify(e));
			this.adjacencyList[e[sourceName]][e[targetName]]=i;this.adjacencyList[e[targetName]][e[sourceName]]=i;
		}
	}
	
	calculateLayers(){//backwards peeling gives every edge a layer. this code is almost the same as on the client.
		let degrees=[],remainingDegrees=[],tempDegrees=[],edgeLayers=[];
		let layerlist=[];this.layerlist=layerlist;
		let startTime=new Date().getTime();
		//console.log(this.name+": calculating layers");
		//if(this.edgeCount>100000){console.log(this.name+": calculating layers");}
		var vs = this.vertices;
		var es = this.edges;
		for (let i=0;i<vs.length;i++) {
			degrees[i]=Object.keys(this.adjacencyList[i]).length;
			remainingDegrees[i]=degrees[i];
		}
		for (let i=0;i<es.length;i++) {
			edgeLayers[i]=null;
		}
		var remainingEdges=this.edgeCount;var done,peeled,minDegree;var peelValues;var degreeDone;
		let percentage=0,lastPercentage=0,increment=(this.edgeCount>1000000)?5:20;
		while(remainingEdges>0){//each iteration removes one layer of edges
			if(this.edgeCount>100){//show progress for bigger graphs
				let edgesPeeled=this.edgeCount-remainingEdges;
				percentage=edgesPeeled/this.edgeCount*100;
				let incremented=false;
				while(percentage>lastPercentage+increment){lastPercentage+=increment;incremented=true;}
				if(incremented)console.log(this.name+" edges peeled "+Math.floor(percentage)+"%");
			}
			let degreeCounts=[],maxDegree=0;
			for (let i=0;i<vs.length;i++) {
				let d=remainingDegrees[i];
				tempDegrees[i]=d;//temp degree is changed during the core decomposition, remaining degree is set when a core is removed
				//bin sort
				if(d>maxDegree)maxDegree=d;
				if(d in degreeCounts==false)degreeCounts[d]=0;
				degreeCounts[d]++;
			}
			let binStarts=[0],sortedVertexIndex=[],positions=[];
			for(let i=1;i<=maxDegree;i++){
				binStarts[i]=binStarts[i-1]+(degreeCounts[i-1]?degreeCounts[i-1]:0);
			}
			for (let i=0;i<vs.length;i++) {
				let d=tempDegrees[i];
				positions[i]=binStarts[d];
				sortedVertexIndex[binStarts[d]]=i;//not the vertex itself because the vertex object doesn't have index information
				binStarts[d]++;
			}
			for(let i=maxDegree;i>0;i--){
				binStarts[i]=binStarts[i-1];
			}
			binStarts[0]=0;
			for (let i=0;i<this.vertexCount;i++) {
				let vID=sortedVertexIndex[i];
				let v=vs[vID];
				for(let uID in this.adjacencyList[vID]){
					if(edgeLayers[this.adjacencyList[vID][uID]]!==null)continue;
					if(tempDegrees[uID]>tempDegrees[vID]){
						let degreeU=tempDegrees[uID];
						let positionU=positions[uID];//sorted positions
						let firstPos=binStarts[degreeU];
						let firstID=sortedVertexIndex[firstPos];
						if(firstID!=uID){//swap to front
							let temp=positionU;
							positions[uID]=positions[firstID];
							positions[firstID]=temp;
							sortedVertexIndex[positionU]=firstID;
							sortedVertexIndex[firstPos]=uID;
						}
						binStarts[degreeU]++;
						tempDegrees[uID]--;
					}
				}
			}
			//now all vertices in the highest degree bin are the core vertices, which bin?
			let coreDegree;
			for(let i=maxDegree;i>=0;i--){
				if(binStarts[i]!=this.vertexCount){coreDegree=i;break;}
			}
			//update
			console.log("found layer "+coreDegree);
			layerlist.push(coreDegree);
			for(let i=binStarts[coreDegree];i<this.vertexCount;i++){//mark edges only
				let v=sortedVertexIndex[i];
				for(let u in this.adjacencyList[v]){
					if(tempDegrees[u]==coreDegree){
						let eID=this.adjacencyList[v][u],e=es[eID];if(edgeLayers[eID]!==null){continue;}
						edgeLayers[eID]=coreDegree;remainingEdges--;
						if(coreDegree==0){if(this.edgeCount<100)console.log(JSON.stringify(this));console.log("Error: peeling min degree 0 at edge "+v+","+u);throw Error(tempDegrees);}
						remainingDegrees[v]--;remainingDegrees[u]--;
					}
				}
			}
			if(this.edgeCount>100000)console.log("marked edges in layer "+coreDegree);
		}
		for (let i=0;i<es.length;i++) {
			es[i][layerName]=edgeLayers[i];
		}
		let endTime=new Date().getTime();
		console.log(this.name+": calculated layers in "+(endTime-startTime)+"ms");
		console.log("***"+this.name+" Summary*** "+this.getSummary());
		let warnings=Object.keys(this.warningReasons);
		if(warnings.length>0){
			console.log("Warnings recap: total warnings "+this.warningCount+"; "+warnings.map((name)=>(name+": "+this.warningReasons[name])).join(", "));
		}
		
	}
	
	getPeelValues(){
		let array=[];
		for(let e of this.edges){array.push(e[layerName]);}
		return array;
	}
	getVertexPeelValues(){//highest peel values per vertex
		let array=new Array(this.vertices.length).fill(0);
		for(let e of this.edges){let s=e[sourceName],t=e[targetName],l=e[layerName];
			if(array[s]<l)array[s]=l;
			if(array[t]<l)array[t]=l;
		}
		return array;
	}
	
	getLayerSummary(){
		if(this.layerSummary)return this.layerSummary;
		let _this=this;
		function layerDFS(vertexID,layer,ccID,ccIDs){//cc is an array of nodes in the component to build
			if(vertexID in ccIDs){throw Error();}
			
			let stack=[],cc=[];
			stack.push(vertexID);
			ccIDs[vertexID]=-1;//temp value means it's pushed to the stack but not popped yet 
			
			let edgeCount=0;
			let degreeDistribution={};
			while(stack.length>0){
				let newNode=stack.pop();
				ccIDs[newNode]=ccID;
				cc.push(newNode);
				//should edges be marked too?
				//also get in-layer degree distribution
				let degreeInLayer=0;
				for(let neighbor in _this.adjacencyList[newNode]){
					//let neighborNode=g.clonedVertices[neighbor];
					let eid=_this.adjacencyList[newNode][neighbor];
					if(_this.edges[eid][layerName]!=layer)continue;
					degreeInLayer++;
					if(neighbor in ccIDs){
					//if("ccID" in neighborNode){
						if(ccIDs[neighbor]==-1){
						//if(neighborNode.ccID==-1){
							edgeCount++;
						}
						continue;
					}
					edgeCount++;
					ccIDs[neighbor]=-1;
					//neighborNode.ccID=-1;
					stack.push(neighbor);
				}
				if(!(degreeInLayer in degreeDistribution)){degreeDistribution[degreeDistribution]=0;}
				degreeDistribution[degreeDistribution]++;
			}
			cc.edgeCount=edgeCount;
			cc.degreeDistribution=degreeDistribution;
			return cc;
		}
		let ls={};
		let maxLayer=0;
		for(let e of this.edges){
			let l=e[layerName];
			if(maxLayer<l){
				maxLayer=l;
			}
			if((l in ls)==false)ls[l]={v:0,e:0,nodesWithClones:0};
			ls[l].e++;
		}
		for(let vertexID=0;vertexID<this.vertices.length;vertexID++){
			let clones={};let isDegree0=true;
			for(let neighbor in this.adjacencyList[vertexID]){
				let eid=this.adjacencyList[vertexID][neighbor];
				clones[this.edges[eid][layerName]]=true;
				isDegree0=false;
			}
			if(isDegree0)clones[0]=true;
			let cloneCount=Object.keys(clones).length;
			for(let l in clones){
				if((l in ls)==false)ls[l]={v:0,e:0,nodesWithClones:0};
				ls[l].v++;
				if(cloneCount>1){ls[l].nodesWithClones++;}
			}
		}
		
		for(let layer=0;layer<=maxLayer;layer++){
			if((layer in ls)==false)continue;
			ls[layer].ccCount=0;
			ls[layer].ccBuckets=[];
			ls[layer].ccBucketsEdges=[];
			let maxBucket=Math.floor(Math.log(ls[layer].v,Math.max(2,Math.log(ls[layer].v))));
			for(let i=0;i<=maxBucket;i++){ls[layer].ccBuckets[i]=0;}
			ls[layer].ccVertexDetails={};
			ls[layer].ccEdgeDetails={};
			ls[layer].ccDegreeDistribution={};
			
			let ccIDs=[];
			for(let vertexID=0;vertexID<this.vertices.length;vertexID++){
				if(vertexID in ccIDs)continue;
				let inLayer=false;
				for(let neighbor in this.adjacencyList[vertexID]){
					let eid=this.adjacencyList[vertexID][neighbor];
					if(this.edges[eid][layerName]==layer){inLayer=true;break;}
				}
				if(!inLayer)continue;
				let ccID=ls[layer].ccCount;
				ls[layer].ccCount++;
				let cc=layerDFS(vertexID,layer,ccID,ccIDs);
				let size=cc.length,edgeCount=cc.edgeCount;
				let degreeDistribution=cc.degreeDistribution;
				//for(let vertexID of cc){node.ccSize=size;}//edges can just see their source and targets for this information
				let bucket=Math.floor(Math.log(size,Math.max(2,Math.log(ls[layer].v))));
				if(bucket>=ls[layer].ccBuckets.length)throw Error();
				ls[layer].ccBuckets[bucket]++;
				if((size in ls[layer].ccVertexDetails)==false)ls[layer].ccVertexDetails[size]=0;
				ls[layer].ccVertexDetails[size]++;
				if((edgeCount in ls[layer].ccEdgeDetails)==false)ls[layer].ccEdgeDetails[edgeCount]=0;
				ls[layer].ccEdgeDetails[edgeCount]++;
				for(let degree in degreeDistribution){
					if((degree in ls[layer].ccDegreeDistribution)==false)ls[layer].ccDegreeDistribution[degree]=0;
					ls[layer].ccDegreeDistribution[degree]+=degreeDistribution[degree];
				}
			}
		}
		this.layerSummary=ls;
		//todo: for non-edge-decomposition layers it should not be per-layer. Maybe we should stop abusing the layer property.
		return ls;
	}
	
	getInterlayers(){
		let degrees=[],tempDegrees=[];
		
		let startTime=new Date().getTime();
		var vs = this.vertices;
		var es = this.edges;
		for (let i=0;i<vs.length;i++) {
			degrees[i]=Object.keys(this.adjacencyList[i]).length;
			tempDegrees[i]=degrees[i];
		}
		var remainingEdges=this.edgeCount;
		

		let degreeCounts=[],maxDegree=0;
		for (let i=0;i<vs.length;i++) {
			let d=tempDegrees[i];
			//temp degree is changed during the core decomposition to become the layer value
			//bin sort
			if(d>maxDegree)maxDegree=d;
			if(d in degreeCounts==false)degreeCounts[d]=0;
			degreeCounts[d]++;
		}
		let binStarts=[0],sortedVertexIndex=[],positions=[];
		for(let i=1;i<=maxDegree;i++){
			binStarts[i]=binStarts[i-1]+(degreeCounts[i-1]?degreeCounts[i-1]:0);
		}
		for (let i=0;i<vs.length;i++) {
			let d=tempDegrees[i];
			positions[i]=binStarts[d];
			sortedVertexIndex[binStarts[d]]=i;//not the vertex itself because the vertex object doesn't have index information
			binStarts[d]++;
		}
		for(let i=maxDegree;i>0;i--){
			binStarts[i]=binStarts[i-1];
		}
		binStarts[0]=0;
		
		//set a marker every time you are about to process all original vertices of degree k (not the ones whose degree just became k) and make a layer for them later. Forward edges would be those that point to vertices after that position in the sorted list, and internal edges would be those to vertices of the same "degree" (or peel) but not after that point. 
		
		//get first marker - the last position of vertices with minimum degree
		let vertexLayers=[];
		let markers=[],minDegree=tempDegrees[sortedVertexIndex[0]],marker=this.vertexCount-1;
		for (let i=0;i<this.vertexCount;i++) {
			let vID=sortedVertexIndex[i];
			let d=tempDegrees[vID];
			if(d>minDegree){marker=i-1;break;}
		}
		markers.push(marker);//if it's the last position it's OK
		for (let i=0;i<this.vertexCount;i++) {
			let vID=sortedVertexIndex[i];
			let d=tempDegrees[vID];
			let v=vs[vID];
			if(i>marker){
				//test to see if minDegree should change(ie that degree's vertices are exhausted)
				if(d>minDegree){minDegree=d;}
				//get a new marker
				let j;
				for (j=i;j<this.vertexCount;j++) {
					let vID2=sortedVertexIndex[j];
					let d2=tempDegrees[vID2];
					if(d2>minDegree){break;}
				}
				marker=j-1;//if it's the last position it's OK
				markers.push(marker);
			}
			vertexLayers[vID]=markers.length-1;
			for(let uID in this.adjacencyList[vID]){
				if(tempDegrees[uID]>tempDegrees[vID]){
					let degreeU=tempDegrees[uID];
					let positionU=positions[uID];//sorted positions
					let firstPos=binStarts[degreeU];
					let firstID=sortedVertexIndex[firstPos];
					if(firstID!=uID){//swap to front
						let temp=positionU;
						positions[uID]=positions[firstID];
						positions[firstID]=temp;
						sortedVertexIndex[positionU]=firstID;
						sortedVertexIndex[firstPos]=uID;
					}
					binStarts[degreeU]++;
					tempDegrees[uID]--;
				}
			}
		}

		//don't need exactly which vertices are in which layer now, just need the count of each layer and the number f edges from one layer to the remaining parts
		let layerSummary=[];
		let currentDegree=tempDegrees[sortedVertexIndex[0]],layerVertexCount=0,edgeCount=0,forwardEdgeCount=0,forwardEdgeDetails={};
		let markerID=0,currentMarker=markers[0],prevMarker=-1;//for detecting edges within teh current ayer
		for (let i=0;i<vs.length;i++) {
			let vID=sortedVertexIndex[i];
			let v=vs[vID];let d=tempDegrees[vID];
			
			if(i>currentMarker){
				layerSummary.push({currentDegree:currentDegree,v:layerVertexCount,e:edgeCount,forwardEdges:forwardEdgeCount,forwardEdgeDetails:forwardEdgeDetails});
				currentDegree=d;layerVertexCount=0;edgeCount=0;forwardEdgeCount=0,forwardEdgeDetails={};
				prevMarker=currentMarker;markerID++;currentMarker=markers[markerID];//the last one is always the last position 
			}
			
			layerVertexCount++;
			for(let uID in this.adjacencyList[vID]){
				//count edges to vertices of higher interlayers
				let u=vs[uID];let du=tempDegrees[uID],posu=positions[uID];
				if(posu>currentMarker){
					forwardEdgeCount++;
					let otherLayer=vertexLayers[uID];
					if(otherLayer in forwardEdgeDetails==false){forwardEdgeDetails[otherLayer]=0;}
					forwardEdgeDetails[otherLayer]++;
				}//to vertices beyond the marker
				else if((posu>prevMarker)&&(uID>vID)){edgeCount++;}
			}
		}
		//last layer
		if(layerVertexCount>0){
			//prev layer is nt empty
			layerSummary.push({currentDegree:currentDegree,v:layerVertexCount,e:edgeCount,forwardEdges:forwardEdgeCount});
		}
		else{throw Error("Should not have an empty layer");}
		let endTime=new Date().getTime();
		console.log(this.name+": decomposed interlayers in "+(endTime-startTime)+"ms. There are "+layerSummary.length+" layers");
		return {layerSummary:layerSummary,vertexLayers:vertexLayers};
		
	}
	
	
	
	computeXRay(newXRayWaves=true){
		let degrees=[],tempDegrees=[],tempDegrees2=[];
		let firstSeen=[];
		
		let startTime=new Date().getTime();
		var vs = this.vertices;
		var es = this.edges;
		for (let i=0;i<vs.length;i++) {
			degrees[i]=Object.keys(this.adjacencyList[i]).length;
			tempDegrees[i]=degrees[i];
			tempDegrees2[i]=degrees[i];
			firstSeen[i]=-1;
		}
		

		let degreeCounts=[],maxDegree=0;
		for (let i=0;i<vs.length;i++) {
			let d=tempDegrees[i];
			if(d>maxDegree)maxDegree=d;
			if(d in degreeCounts==false)degreeCounts[d]=0;
			degreeCounts[d]++;
		}
		let binStarts=[0],sortedVertexIndex=[],positions=[];
		for(let i=1;i<=maxDegree;i++){
			binStarts[i]=binStarts[i-1]+(degreeCounts[i-1]?degreeCounts[i-1]:0);
		}
		for (let i=0;i<vs.length;i++) {
			let d=tempDegrees[i];
			positions[i]=binStarts[d];
			sortedVertexIndex[binStarts[d]]=i;//not the vertex itself because the vertex object doesn't have index information
			binStarts[d]++;
		}
		for(let i=maxDegree;i>0;i--){
			binStarts[i]=binStarts[i-1];
		}
		binStarts[0]=0;
		
		//set a marker every time you are about to process all original vertices of degree k (not the ones whose degree just became k) and make a layer for them later. Forward edges would be those that point to vertices after that position in the sorted list, and internal edges would be those to vertices of the same "degree" (or peel) but not after that point. 
		
		//get first marker - the last position of vertices with minimum degree
		let vertexLayers=[];
		let markers=[],minDegree=tempDegrees[sortedVertexIndex[0]],marker=this.vertexCount-1;
		let markerIsEndOfPhase={};
		let markerMinDegrees=[];
		for (let i=0;i<this.vertexCount;i++) {
			let vID=sortedVertexIndex[i];
			let d=tempDegrees[vID];
			if(d>minDegree){marker=i-1;break;}
		}
		markers.push(marker);//if it's the last position it's OK
		markerMinDegrees.push(minDegree);
		
		for (let i=0;i<this.vertexCount;i++){
			let vID=sortedVertexIndex[i];
			let d=tempDegrees[vID];
			let v=vs[vID];
			if(i>marker){
				let markerFound=false;
				if(newXRayWaves){
					//rearrange vertices that just became degree d or less (in tempDegrees2), so that the ones with degree<d come first and set the new marker at the end of them, if there are such vertices.
					//but after you move these vertices, the next vertex (v and vID) need to be refreshed.
					let start=marker+1,end=binStarts[minDegree+1]-1;//minDegree==maxDegree can't happen here
					let lesserDegreeCount=0;let lesserMinDegree=Infinity;
					for(let j=end;j>=i+lesserDegreeCount;j--){
						while(j>=i+lesserDegreeCount){
							let vIDtemp=sortedVertexIndex[i+lesserDegreeCount];
							let dtemp=tempDegrees2[vIDtemp];
							if(dtemp<minDegree){lesserDegreeCount++;if(lesserMinDegree>dtemp){lesserMinDegree=dtemp;}}
							else break;
						}
						if(j<i+lesserDegreeCount)break;
						let vID2=sortedVertexIndex[j];
						let d2=tempDegrees2[vID2];
						if(d2<minDegree){
							let vIDtemp=sortedVertexIndex[i+lesserDegreeCount];
							let dtemp=tempDegrees2[vIDtemp];
							sortedVertexIndex[i+lesserDegreeCount]=vID2;
							sortedVertexIndex[j]=vIDtemp;
							positions[vID2]=i+lesserDegreeCount;
							positions[vIDtemp]=j;
							lesserDegreeCount++;
							if(lesserMinDegree>dtemp){lesserMinDegree=dtemp;}
						}
					}
					if(lesserDegreeCount>0){
						marker=i+lesserDegreeCount-1;//if it's the last position it's OK
						markers.push(marker);
						markerMinDegrees.push(lesserMinDegree);
						markerFound=true;
					}
					else{
						markerIsEndOfPhase[markers.length-1]=true;
					}
					vID=sortedVertexIndex[i];
					d=tempDegrees[vID];
					v=vs[vID];
				}
				if(!markerFound){
					
					//test to see if minDegree should change(ie that degree's vertices are exhausted)
					if(d>minDegree){
						minDegree=d;
						markerIsEndOfPhase[markers.length-1]=true; //without the new waves, the next degree should count as end of phase?
					}
					//get a new marker
					let j;
					for (j=i;j<this.vertexCount;j++) {
						let vID2=sortedVertexIndex[j];
						let d2=tempDegrees[vID2];
						if(d2>minDegree){break;}
					}
					marker=j-1;//if it's the last position it's OK
					markers.push(marker);
					markerMinDegrees.push(minDegree);
				}
				
			}
			vertexLayers[vID]=markers.length-1;
			for(let uID in this.adjacencyList[vID]){
				let degreeU=tempDegrees[uID];
				let positionU=positions[uID];//sorted positions
				let firstPos=binStarts[degreeU];
				let firstID=sortedVertexIndex[firstPos];
				if(tempDegrees[uID]>tempDegrees[vID]){
					if(firstID!=uID){//swap to front
						let temp=positionU;
						positions[uID]=positions[firstID];
						positions[firstID]=temp;
						sortedVertexIndex[positionU]=firstID;
						sortedVertexIndex[firstPos]=uID;
					}
					binStarts[degreeU]++;
					tempDegrees[uID]--;
					tempDegrees2[uID]--;
					if(firstSeen[uID]==-1){firstSeen[uID]=markers.length;}//k+1
				}
				else{
					//also decrease tempdegree for neighbors in the same bin but beyond the current marker, but don't change its position.
					//tempDegrees correspond to the bin and I can't change it in any oeher way
					if((tempDegrees[uID]==tempDegrees[vID])&&(positionU>marker)){
						tempDegrees2[uID]--;
					}
				}
			}
		}

		let layerSummary=[];
		let currentDegree=tempDegrees[sortedVertexIndex[0]],layerVertexCount=0,edgeCount=0,forwardEdgeCount=0,forwardEdgeDetails={};
		let prevNeighbors={};//get percentage of previous layer's touched vertices that are in the next layer
		let forwardNeighbors={};
		let markerID=0,currentMarker=markers[0],prevMarker=-1,layerMinDegree=markerMinDegrees[0];//for detecting edges within teh current ayer
		for (let i=0;i<vs.length;i++) {
			let vID=sortedVertexIndex[i];
			let v=vs[vID];let d=tempDegrees[vID];
			
			if(i>currentMarker){
				layerSummary.push({layer:markerID,currentDegree:currentDegree,v:layerVertexCount,e:edgeCount,prevNeighborCount:Object.keys(prevNeighbors).length,forwardEdges:forwardEdgeCount,forwardEdgeDetails:forwardEdgeDetails,layerMinDegree:layerMinDegree,isEndOfPhase:markerIsEndOfPhase[markerID]});
				prevNeighbors=forwardNeighbors;forwardNeighbors={};
				currentDegree=d;layerVertexCount=0;edgeCount=0;forwardEdgeCount=0,forwardEdgeDetails={};
				prevMarker=currentMarker;markerID++;currentMarker=markers[markerID];layerMinDegree=markerMinDegrees[markerID];//the last one is always the last position 
			}
			
			layerVertexCount++;
			for(let uID in this.adjacencyList[vID]){
				//count edges to vertices of higher interlayers
				let u=vs[uID];let du=tempDegrees[uID],posu=positions[uID];
				if(posu>currentMarker){
					forwardNeighbors[uID]=true;
					forwardEdgeCount++;
					let otherLayer=vertexLayers[uID];
					if(otherLayer in forwardEdgeDetails==false){forwardEdgeDetails[otherLayer]=0;}
					forwardEdgeDetails[otherLayer]++;
				}//to vertices beyond the marker
				else if((posu>prevMarker)&&(uID>vID)){edgeCount++;}
			}
		}
		//last layer
		if(layerVertexCount>0){
			//prev layer is nt empty
			layerSummary.push({layer:markerID,currentDegree:currentDegree,v:layerVertexCount,e:edgeCount,prevNeighborCount:Object.keys(prevNeighbors).length,forwardEdges:forwardEdgeCount,forwardEdgeDetails:forwardEdgeDetails,layerMinDegree:layerMinDegree,isEndOfPhase:markerIsEndOfPhase[markerID]});
		}

		let endTime=new Date().getTime();
		console.log(this.name+": decomposed interlayers in "+(endTime-startTime)+"ms, layers are "+JSON.stringify(layerSummary)+", markers are "+JSON.stringify(markers));
		
		return {tempDegrees:tempDegrees,
		sortedVertexIndex:sortedVertexIndex,
		markers:markers,
		positions:positions,
		vertexLayers:vertexLayers,
		layerSummary:layerSummary,
		firstSeen:firstSeen,
		markerIsEndOfPhase:markerIsEndOfPhase,
		};
	}
	
	getWavesMetagraph(){
		let layerSummary=this.computeXRay().layerSummary;
		let waves=[];let newWave={firstLayer:0,isMetanode:true,"|V|":0,vertexCount:0,edges:{},waveLayers:[]};
		let waveMap={};let waveEdges=[];
		for(let i=0;i<layerSummary.length;i++){
			let l=layerSummary[i];
			//{currentDegree:currentDegree,v:layerVertexCount,e:edgeCount,prevNeighborCount:Object.keys(prevNeighbors).length,forwardEdges:forwardEdgeCount,forwardEdgeDetails:forwardEdgeDetails,layerMinDegree:layerMinDegree,isEndOfPhase:markerIsEndOfPhase[markerID]}
			waveMap[i]=waves.length;
			newWave["|V|"]+=l.v;
			newWave.waveLayers.push(l);
			if(l.isEndOfPhase){
				newWave.lastLayer=i;waves.push(newWave);newWave={firstLayer:i+1,isMetanode:true,"|V|":0,vertexCount:0,edges:{},waveLayers:[]};
			}
		}
		newWave.lastLayer=markers.length-1;
		waves.push(newWave);
		
		for(let i=0;i<layerSummary.length;i++){
			let l=layerSummary[i];let thisWave=waveMap[i];
			for(let otherLayer in l.forwardEdgeDetails){
				let otherWave=waveMap[otherLayer];
				
				if(otherWave!=thisWave){
					if((thisWave in waves[otherWave].edges)==false){let e={s:thisWave,t:otherWave,edgeCount:0};waves[otherWave].edges[thisWave]=waveEdges.length;waves[thisWave].edges[otherWave]=waveEdges.length;waveEdges.push(e);}
					waveEdges[waves[otherWave].edges[thisWave]].edgeCount+=l.forwardEdgeDetails[otherLayer];
				}
			}
		}
		let metagraph={vertices:waves,edges:waveEdges,isMetagraph:true,fixLayer:true,layer:0,name:this.name+" waves metagraph"};
		return metagraph;
	}
	
	getWavesMetagraphAndWaveSubgraphs(){
		let result=this.computeXRay();
		let waves=[];let newWave={firstLayer:0,isMetanode:true,"|V|":0,vertexCount:0,edges:{},waveLayers:[]};
		let waveMap={};let waveEdges=[];
		
		let tempDegrees=result.tempDegrees;
		let sortedVertexIndex=result.sortedVertexIndex;
		let markers=result.markers;
		let positions=result.positions;
		let vertexLayers=result.vertexLayers;
		let layerSummary=result.layerSummary;
		let firstSeen=result.firstSeen;
		let markerIsEndOfPhase=result.markerIsEndOfPhase;
		let vs=this.vertices;
		
		for(let i=0;i<layerSummary.length;i++){
			let l=layerSummary[i];
			//{currentDegree:currentDegree,v:layerVertexCount,e:edgeCount,prevNeighborCount:Object.keys(prevNeighbors).length,forwardEdges:forwardEdgeCount,forwardEdgeDetails:forwardEdgeDetails,layerMinDegree:layerMinDegree,isEndOfPhase:markerIsEndOfPhase[markerID]}
			waveMap[i]=waves.length;
			newWave["|V|"]+=l.v;
			newWave.waveLayers.push(l);
			if(l.isEndOfPhase){
				newWave.lastLayer=i;waves.push(newWave);newWave={firstLayer:i+1,isMetanode:true,"|V|":0,vertexCount:0,edges:{},waveLayers:[]};
			}
		}
		newWave.lastLayer=markers.length-1;
		waves.push(newWave);
		
		for(let i=0;i<layerSummary.length;i++){
			let l=layerSummary[i];let thisWave=waveMap[i];
			for(let otherLayer in l.forwardEdgeDetails){
				let otherWave=waveMap[otherLayer];
				
				if(otherWave!=thisWave){
					if((thisWave in waves[otherWave].edges)==false){let e={s:thisWave,t:otherWave,edgeCount:0};waves[otherWave].edges[thisWave]=waveEdges.length;waves[thisWave].edges[otherWave]=waveEdges.length;waveEdges.push(e);}
					waveEdges[waves[otherWave].edges[thisWave]].edgeCount+=l.forwardEdgeDetails[otherLayer];
				}
			}
		}
		
		
		let waveEdgelists=[];let currentWaveEdges=[];
		let waveVertexlists=[];let currentWaveVertices=[];
		let waveVertexCounts=[];
		
		let markerID=0,currentMarker=markers[0],prevMarker=-1;//for detecting edges within teh current ayer
		
		let waveID=0,currentWave=waves[0],waveStartPos=0,waveEndPos=markers[currentWave.lastLayer],waveVertexCount=waveEndPos-waveStartPos+1;
		for (let i=0;i<vs.length;i++) {
			let vID=sortedVertexIndex[i];
			let v=vs[vID];let d=tempDegrees[vID];
			
			if(i>currentMarker){
				if(markerIsEndOfPhase[markerID]){
					waveEdgelists.push(currentWaveEdges);currentWaveEdges=[];
					waveID++;currentWave=waves[waveID];waveStartPos=waveEndPos+1;waveEndPos=markers[currentWave.lastLayer];
					waveVertexCounts.push(waveVertexCount);
					waveVertexCount=waveEndPos-waveStartPos+1;
					
				}
				
				prevMarker=currentMarker;markerID++;currentMarker=markers[markerID];//the last one is always the last position 
			}
			
			for(let uID in this.adjacencyList[vID]){
				//count edges to vertices of higher interlayers
				let u=vs[uID];let du=tempDegrees[uID],posu=positions[uID];
				if((posu>=waveStartPos)&&(posu<=waveEndPos)&&(uID>vID)){
					currentWaveEdges.push(this.edges[this.adjacencyList[vID][uID]]);
				}//to vertices in the same wave
			}
		}	
		//last wave
		waveVertexCounts.push(waveVertexCount);
		waveEdgelists.push(currentWaveEdges);

		//keep track of the size of teh wave subgraphs
		for(let waveID=0;waveID<waveEdgelists.length;waveID++){
			waves[waveID]["|E|"]=waveEdgelists[waveID].length;//already have |V|?
		}
		
		let metagraph={vertices:waves,edges:waveEdges,isMetagraph:true,fixLayer:true,layer:0,name:this.name+" waves metagraph"};
		return {metagraph:metagraph,waveEdgelists:waveEdgelists,waveVertexCounts:waveVertexCounts,waveLayerResults:result};
	}

	getEdgePartition(edgePartition,valueForIsolatedVertices){
		let g=this;
		let partitions={};//v,e counts
		let cloneMaps=new Array(g.vertices.length);
		let highestLayers=new Array(g.vertices.length);
		let edgeSources=new Array(g.edges.length);
		let edgeTargets=new Array(g.edges.length);
		let max=-Infinity,min=Infinity;
		for(let i in g.vertices){cloneMaps[i]={};highestLayers[i]=null;}
		let clones=[];
		let cloneCount=0;
		for(let eID=0;eID<g.edges.length;eID++){
			let e=g.edges[eID],layer=edgePartition[eID];
			let sID=e[sourceName];
			let tID=e[targetName];
			if((sID in highestLayers==false)||(highestLayers[sID]<layer)){highestLayers[sID]=layer;}
			if((tID in highestLayers==false)||(highestLayers[tID]<layer)){highestLayers[tID]=layer;}
			let sCloneID,tCloneID;
			if((layer in partitions)==false){
				partitions[layer]={v:0,e:0};
			}
			if(layer>max){max=layer;}
			if(layer<min){min=layer;}
			if((layer in cloneMaps[sID])==false){
				sCloneID=clones.length;
				cloneMaps[sID][layer]=sCloneID;
				cloneCount++;
				let cloneObj={original:sID,edges:{},value:layer};
				clones.push(cloneObj);
				partitions[layer].v++;
			}
			else{sCloneID=cloneMaps[sID][layer];}
			if((layer in cloneMaps[tID])==false){
				tCloneID=clones.length;
				cloneMaps[tID][layer]=tCloneID;
				cloneCount++;
				let cloneObj={original:tID,edges:{},value:layer};
				clones.push(cloneObj);
				partitions[layer].v++;
				//partitions[layer].vertices.push(cloneObj);//??
			}
			else{tCloneID=cloneMaps[tID][layer];}
			let sClone=clones[sCloneID],tClone=clones[tCloneID];
			sClone.edges[tCloneID]=eID;
			tClone.edges[sCloneID]=eID;
			edgeSources[eID]=sCloneID;
			edgeTargets[eID]=tCloneID;
			partitions[layer].e++;
		}
		
		//if valueForIsolatedVertices is given, create clones for them too
		if(valueForIsolatedVertices!==undefined){
			for(let vID=0;vID<g.vertices.length;vID++){
				if(Object.keys(cloneMaps[vID]).length==0){
					if((valueForIsolatedVertices in partitions)==false){
						partitions[valueForIsolatedVertices]={v:0,e:0};
					}
					let cloneID=clones.length;
					cloneMaps[vID][valueForIsolatedVertices]=cloneID;
					cloneCount++;
					clones.push({original:vID,edges:{},value:valueForIsolatedVertices});
					partitions[valueForIsolatedVertices].v++;
				}
			}
		}
		return {cloneCount:cloneCount,cloneMaps:cloneMaps,clones:clones,edgeSources:edgeSources,edgeTargets:edgeTargets,partitions:partitions,max:max,min:min};
	}
	
	//need to save larger global CCs as their own graphs, and save the chunks of layer CC metagraphs for the larger ones of them
	getCCs(){
		if(this.CCs&&this.ccIDs)return {CCs:this.CCs,ccIDs:this.ccIDs};
		let dataset=this;
		let vs=this.vertices;
		let ccIDs=new Array(vs.length);
		let CCs=[];
		for(let vID=0;vID<vs.length;vID++){
			if(vID in ccIDs)continue;
			let ccID=CCs.length;
			let cc=DFSHelper2(vs,vID,ccID,ccIDs,null,this.adjacencyList);//vs doesn't have edges now
			let size=cc.length,edgeCount=cc.edgeCount;
			CCs.push({vertexList:cc,index:ccID,"|V|":size,"|E|":edgeCount});
		}
		this.CCs=CCs;this.ccIDs=ccIDs;
		return {CCs:CCs,ccIDs:ccIDs};
	}
	
	//also create a version with rings only - to create global rings properly, the algorithm must be aware of the correct  original CC sizes that CCs in the metagraph corresponds to, instead of guessing from the metanodes which does not have enough information. The rings should be a metagraph in its own right much like the CC metagraph, and not mixed with other metagraphs. And we expand things in the rings using either points (when tehre aren't too many of CCs in a ring) or buckets (if a ring is bucketed then it's broken into many rings, and each ring can be expanded) and when a large CC is expanded, we can load its (local) rings representation.
	
	getCCBuckets(){//returns both global rings(buckets) and for each bucket, either a bucket of small CCs as a subgraph or a list of large CCs by ID. has two kinds of buckets, logV only or by vertex count.
		let CCResult=this.getCCs(),CCs=CCResult.CCs,ccIDs=CCResult.ccIDs;let logV=Math.log(this.vertices.length);
		let tempCCs=Array.from(CCs).sort(compareBy((ccRecord)=>ccRecord["|V|"],true));//sort first before splitting
		//each CC record has {ccID:ccID,"|V|":size,"|E|":edgeCount,vertices:cc} and totalV, totalE
		//arraySplit(array,func,smallFirst=false,comparator)
		let powerBuckets=splitArray(tempCCs,(ccRecord)=>Math.floor(Math.log(ccRecord["|V|"])/Math.log(logV)),true);
		let splitPowerBuckets=[];
		for(let b of powerBuckets){
			let subBuckets=[];let currentBucket=[];let totalV=0;
			for(let ccRecord of b){
				if(ccRecord["|V|"]>=16384){if(currentBucket.length>0)subBuckets.push(currentBucket);subBuckets.push([ccRecord]);currentBucket=[];totalV=0;continue;}
				else{
					if(totalV+ccRecord["|V|"]>=16384){if(currentBucket.length>0)subBuckets.push(currentBucket);currentBucket=[];totalV=0;}
					currentBucket.push(ccRecord);totalV+=ccRecord["|V|"];
				}
			}
			if(currentBucket.length>0)subBuckets.push(currentBucket);
			splitPowerBuckets=splitPowerBuckets.concat(subBuckets);
		}
		let vertexCountBuckets=splitArraysInPlace(powerBuckets,(ccRecord)=>ccRecord["|V|"],true);//insert results in place
		
		//ring area should correspond to the proportion of vertices in it, and outer and inner radius are determined by the desired area with all rings next to each other(the rim will be applied in the shader so no need to add space?) and color to the min and max vertex counts (can be a gradient) and if its CC count is low enough, teh client creates vertices(special nodes that stay inside rings) for them that can be expanded.
		function summarizeBuckets(buckets){
			let cumulativeVertexCount=0;let rings=[];
			for(let bucket of buckets){
				let minV=Infinity,maxV=-Infinity;let previousVertexCount=cumulativeVertexCount;let totalVertexCount=0,totalEdgeCount=0;
				for(let ccRecord of bucket){
					let vCount=ccRecord["|V|"],eCount=ccRecord["|E|"];totalVertexCount+=vCount;totalEdgeCount+=eCount;//for avg degree
					if(vCount>maxV)maxV=vCount;if(vCount<minV)minV=vCount;
				}
				let vlist=[].concat.apply([],bucket.map((record)=>record.vertexList));
				let summary={maxV:maxV,minV:minV,totalE:totalEdgeCount,totalV:totalVertexCount,prevV:previousVertexCount,CCs:bucket,vertices:vlist};
				if(vlist.length>16384){}
				rings.push(summary);
			}
			return rings;
		}//ccIDs:ccIDs,CCs:CCs,
		return {buckets:{logPower:summarizeBuckets(splitPowerBuckets),vertexCount:summarizeBuckets(vertexCountBuckets)}};
	}
	
	getLayerCCMetagraph(){
		let dataset=this;
		let edgeLayers=this.getPeelValues();//dataset.edges.fixedPointLayer;//this.getFixedPointLayers(dataset);
		let partitionResult=this.getEdgePartition(edgeLayers,0);
		let clones=partitionResult.clones;
		let cloneCount=clones.length;
		let cloneMaps=partitionResult.cloneMaps;
		let ccIDs=new Array(cloneCount);
		let results=this.getCCs();
		let originalCCIDs=results.ccIDs,originalCCs=results.CCs;//save the original CCID and original CC's V and E for layer CCs
		
		let layerCCs=[],layerCCEdges=[];
		
		for(let nodeID=0;nodeID<clones.length;nodeID++){
			//skip isolated vertices??
			let node=clones[nodeID];
			if(nodeID in ccIDs)continue;
			let layer=node.value;
			let ccID=layerCCs.length;
			let cc=DFSHelper2(clones,nodeID,ccID,ccIDs,edgeLayers);
			let size=cc.length,edgeCount=cc.edgeCount;
			let oldCCID=originalCCIDs[node.original],oldCCV=originalCCs[oldCCID]["|V|"],oldCCE=originalCCs[oldCCID]["|E|"];
			let layerCC={cloneList:cc,index:ccID,globalCCID:oldCCID,ccV:oldCCV,ccE:oldCCE,layer:layer,originalFixedPointLayer:layer,"|V|":size,"|E|":edgeCount,edges:{}};
			layerCCs.push(layerCC);
		}
		
		for(let vID=0;vID<dataset.vertices.length;vID++){
			let v=dataset.vertices[vID];
			let vClones=cloneMaps[vID];
			for(let i in vClones){
				for(let j in vClones){
					if(i>=j)continue;
					let cloneID1=vClones[i],cloneID2=vClones[j];
					let ccID1=ccIDs[cloneID1],ccID2=ccIDs[cloneID2];
					let cc1=layerCCs[ccID1],cc2=layerCCs[ccID2];
					if((ccID2 in cc1.edges)==false){
						let metaedgeId=layerCCEdges.length;
						cc1.edges[ccID2]=metaedgeId;
						cc2.edges[ccID1]=metaedgeId;
						layerCCEdges.push({s:ccID1,t:ccID2,edgeCount:0});
					}
					layerCCEdges[cc1.edges[ccID2]].edgeCount++;
				}
			}
		}
		for(let me of layerCCEdges){
			let cc1=layerCCs[me.s],cc2=layerCCs[me.t];
			let density=me.edgeCount/(cc1["|V|"]*cc2["|V|"]);
			me.w=density;me.direction=(cc1.layer<cc2.layer)?(-1):(1);//-1 means the arrow points from the source to the target?
		}
		
		let metagraph={vertices:layerCCs,edges:layerCCEdges,layerCCIDs:ccIDs,isMetagraph:true,layerHeightOption:"linear",name:dataset.name+" layer CC metagraph",shortName:"layer CC metagraph"};
		let cloneEdgeSources=partitionResult.edgeSources,cloneEdgeTargets=partitionResult.edgeTargets;
		//metagraph.parent=dataset;
		//if(dataset.dataPath)metagraph.dataPath=dataset.dataPath+"/layerCCmetagraph";
		metagraph.heightProperty="originalFixedPointLayer";
		metagraph.expandVertex=function(layerCCVertex){
			let ccID=layerCCVertex.index;
			let layer=layerCCVertex.layer;
			let cc=layerCCVertex.cloneList;//kept to avoid having to filter a whole large graph
			let newGraph={shortName:"layer "+layerCCVertex.layer+" CC "+ccID,name:dataset.name+" layer "+layerCCVertex.layer+" CC "+ccID};
			let vMap={},vlist=[],vCount=0;
							
			newGraph.vertices=[];
			cc.forEach((cloneID,i)=>{
				let original=clones[cloneID].original;
				//let cloneID=cloneMaps[i][layer];
				vMap[original]=vCount;vCount++;	
				newGraph.vertices.push({});
			});//must not reuse vertices from another graph because it messes with indices
			//if(newGraph.vertices.length>25000){console.log("Cannot show large layer CC of "+newGraph.vertices.length+" vertices");return;}
			newGraph.edges=[];
			cc.forEach((cloneID,i)=>{
				let clone=clones[cloneID];
				for(let otherCloneID in clone.edges){
					if(otherCloneID<cloneID)continue;
					let edge=dataset.edges[clone.edges[otherCloneID]];
					let sID=edge[sourceName];
					let tID=edge[targetName];
					newGraph.edges.push( {s:vMap[sID],t:vMap[tID],l:layer});
				}
			});
			if(metagraph.dataPath){newGraph.dataPath=metagraph.dataPath+"/layer"+layer+"_CC"+ccID;}
			return newGraph;
		}
		
		return metagraph;
		
	}
	
	getLeaves(){
		function comparePairs(){//whether first pair (a,b) has a<b, or a==b and second pair (a',b') has a'<b', etc
			for(let i=0;i<arguments.length;i+=2){
				let temp=arguments[i]-arguments[i+1];
				if(isNaN(temp))throw Error();
				if(temp<0)return true;
				if(temp>0)return false;
			}
			return false;
		}
		let startTime=new Date().getTime();
		let result={};
		
		result.leafCount=0;result.leaves=[];result.leafEdgeIndex=0;result.leafRandomNumbers=[];
		result.leafWaveCount=0;result.leafWaveConnections=-1;//when a new leaf has conn. 0 it should be a new wave
		
		var vs = this.vertices;
		var es = this.edges;
		let nodes=vs;
		var remainingEdges=this.edgeCount;
		var remainingVertices=this.vertexCount;
		let degrees=new Array(this.vertexCount),tempDegrees=new Array(this.vertexCount),leafID=new Array(this.vertexCount);

		
		for (let i=0;i<vs.length;i++) {
			let degree=Object.keys(this.adjacencyList[i]).length;
			let v=vs[i];
			v.remainingDegree=degree;
			//v.tempRemainingDegree=degree;
		}
		
		
		
		
		while(remainingVertices>0){
			let minDegree=Infinity;//I'm not sure this will never be applied to graphs that are not fixed points, so need to ensure I always use the current min degree
			for (let i=0;i<vs.length;i++) {
				let v=vs[i];
				if(v.remainingDegree<minDegree)minDegree=v.remainingDegree;
			}
			let bestStart=null,bestLeaf=null,bestLeafEdges=null,bestLeafEdgeSources=null,minStartDegree=Infinity,minConnections=Infinity,minExtraConnections=Infinity,minLeafEdges=Infinity,minConnectionDensity=Infinity;
			//try to use the start vertex degree as an priority condition, because otherwise in higher layers, a huge leaf often is chosen because its connection size would be zero, but it makes more sense to start from a vertex with smaller remaining degree. also I don't want too large leaves to be removed at once so smaller leaves win, so if the graph can be divided exactly into two leaves, the smaller one is removed
			let testLeafCount=0;
			for(let index =0;index<nodes.length;index++){//test all vertices whose current degree is <= its layer
				let testStart=nodes[index];
				if("leafID" in testStart)continue;
				if(testStart.remainingDegree>minDegree)continue;
				//if(testStart.remainingDegree>testStart.layer)continue;
				
				let start=testStart;let queue=[];
				queue.push(index);
				let leafID=result.leafCount;let tempLeaf=[],tempLeafEdges=[],tempLeafEdgeMap={},tempLeafEdgeSources=[];
				start.leafID=leafID;//set leafID before taking it out of the queue. the queue represents infection attempts. otherwise a vertex can be expanded twice.
				tempLeaf.start=start.id;tempLeaf.id=leafID;tempLeaf.startDegree=start.remainingDegree;
				tempLeaf.push(index);//the start needs to be already temporarily removed 
				start.tempRemainingDegree=start.remainingDegree;//this serves as the spreading strength marker
				
				while(queue.length>0){
					let newIndex=queue.pop();
					let node=vs[newIndex];
					
					
					for(let neighborID in this.adjacencyList[newIndex]){
						let neighbor=vs[neighborID];
						//if("leafID" in neighbor)continue;//temp or permanent
						//actually, if the expansion strength is the current remainingDegree not the value when it's inserted into teh queue (as is intuitive?) then we should decrement this for removed neighbors too; temp removed ones would need the decremented degree, and permanent ones wouldn't care
						if(("tempRemainingDegree" in neighbor) ==false)neighbor.tempRemainingDegree=neighbor.remainingDegree;
						//instead , use the edge's leafID(permanent) or tempLeafEdgeMap to decide if it should be ignored
						let edgeID=this.adjacencyList[newIndex][neighborID];
						if(("leafID" in es[edgeID])||(edgeID in tempLeafEdgeMap))continue;
						neighbor.tempRemainingDegree--;
						tempLeafEdges.push(edgeID);
						tempLeafEdgeSources.push(newIndex);
						if(tempLeafEdgeMap[edgeID]){throw Error();}
						tempLeafEdgeMap[edgeID]=true;
						
						if(neighbor.tempRemainingDegree>node.tempRemainingDegree)continue;//not strong enough to remove it
						//when a node is removed, it  s temp remainingd degree will not be decreased anymore, so it serves as the spreading strength marker too
						if(!("leafID" in neighbor)){
							tempLeaf.push(neighborID);//used to remove the labels later
							neighbor.leafID=leafID;
							queue.push(neighborID);
						}
						
					}
				}
				let leafSize=tempLeaf.length;
				//get connection numbers
				let connections={},extraConnections={};
				for(let nID of tempLeaf){
					let n=vs[nID];
					for(let n2ID in this.adjacencyList[nID]){
						let n2=vs[n2ID];
						if(("leafID" in n2)==false){connections[n2ID]=true;extraConnections[n2ID]=true;}
						else if(n2.leafID!=leafID){extraConnections[n2ID]=true;}
					}
				}
				let connectionSize=Object.keys(connections).length,connectionExtraSize=Object.keys(extraConnections).length,startDegree=tempLeaf.startDegree;
				//the following counts connected edges, not connected vertices!
				let connectionEdgeSize=tempLeaf.filter((nID)=>{let connected=false;for(let n2ID in this.adjacencyList[nID]){let n2=vs[n2ID];if(("leafID" in n2)==false){connected=true;break;}}return connected;}).length;//if any of its edges go to vertices that are not removed yet
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
				for(let n of vs){if("tempRemainingDegree" in n)delete n.tempRemainingDegree;}
				for(let nID of tempLeaf){if(vs[nID]){delete vs[nID].leafID}else{console.log("missing "+JSON.stringify(nID));}}
				
				testLeafCount++;
				//if(G.fasterLeavesFinding&&bestLeaf&&(testLeafCount>Math.log(nodes.length+1)+10))break;
				
				if(bestLeaf&&(testLeafCount>Math.log(this.vertexCount+1)+10))break;
				
			}
			if(!bestLeaf){throw Error("no leaf found after testing "+testLeafCount+", mindegree "+minDegree);};
			result.leafCount++;result.leaves.push(bestLeaf);
			if(bestLeaf.connectionSize>result.leafWaveConnections){result.leafWaveConnections=bestLeaf.connectionSize;result.leafWaveCount++;}//is the wave defined by # of connections? maybe several numbers can be used to define a wave
			bestLeaf.waveIndex=result.leafWaveCount;
			for(let nodeID of bestLeaf){vs[nodeID].leafID=bestLeaf.id;}
			
			remainingVertices-=bestLeaf.length;
			remainingEdges-=bestLeafEdges.length;
			for(let i=0;i<bestLeafEdges.length;i++){
				let eID=bestLeafEdges[i]
				let link=es[eID];if("leafID" in link)throw Error();
				link.leafID=bestLeaf.id;link.leafOrderingIndex=result.leafEdgeIndex;result.leafEdgeIndex++;
				link.leafSource=bestLeafEdgeSources[i];
				let sourceNode=vs[link[sourceName]],targetNode=vs[link[targetName]];
				sourceNode.remainingDegree--;targetNode.remainingDegree--;
			}
			if(remainingEdges<0)throw Error();//repeated edge processing??

		}
		//now result's leaf lists are vertex lists.
		
		let metaedges=[];
		let metaedgesMap={};
		let metanodes=[];
		let metanodeContents=[];
		for(let leaf of result.leaves){
			let leafID=leaf.id;
			let leafEdgeCount=0;
			let leafMetaedgeMap={};
			let leafContents=[];
			for(let nID of leaf){
				for(let neighborID in this.adjacencyList[nID]){
					let neighbor=vs[neighborID];
					if(neighbor.leafID==leafID){
						if(neighborID>nID){
							leafEdgeCount++;
							leafContents.push(nID+" "+neighborID);
						}
					}
					else{
						
						if(!(neighbor.leafID in leafMetaedgeMap)){leafMetaedgeMap[neighbor.leafID]=0;}
						leafMetaedgeMap[neighbor.leafID]++;
					}
					
				}
			}
			metanodes.push(leafID+" "+leaf.length+" "+leafEdgeCount);
			for(target in leafMetaedgeMap){
				if(target > leafID){metaedges.push(leafID+" "+target+" "+leafMetaedgeMap[target]);}
			}
		}
		return {metanodes:metanodes,metaedges:metaedges,contents:metanodeContents};
	}

	getSummary(){
		if(this.summaryStr)return this.summaryStr;
		let ls={},maxLayer=0;
		for(let i in this.vertices){
			let v=this.vertices[i];
			for(let j in this.adjacencyList[i]){
				let v2=this.vertices[j];
				let e=this.edges[this.adjacencyList[i][j]],layer=e[layerName];
				if(!ls[layer]){ls[layer]=0;}
				ls[layer]++;//edge count only
				if(layer>maxLayer){maxLayer=layer;}
			}
		}
		for(let l in ls){ls[l]/=2;}
		let layerList=Object.keys(ls).sort(compareBy((x)=>Number(x),true)),layerStr=layerList.map((x)=>(x+": "+ls[x])).join(", ");
		this.summaryStr=this.name+" - |V|: "+this.vertexCount+",|E|: "+this.edgeCount+", p(if random): "+(this.edgeCount/(this.vertexCount*(this.vertexCount-1)/2))+", highest layer "+maxLayer+", edge count in layers: "+layerStr;
		return this.summaryStr;
	}
	
	toEdgeList(layer){
		let str="",i=0,first=true;
		for(let i=0;i<this.edges.length;i++){
			if(!this.edges[i])continue;
			if((layer!==undefined)&&(this.edges[i].l!=layer))continue;
			if(!first)str+="\n";
			str+=this.edges[i][sourceName]+" "+this.edges[i][targetName];
			first=false;
		}
		return str;
	}
	getFilteredEdgeList(func){
		let str="",i=0,first=true;
		for(let i=0;i<this.edges.length;i++){
			if(!func(this.edges[i],i,this.edges))continue;
			if(!first)str+="\n";
			str+=this.edges[i][sourceName]+" "+this.edges[i][targetName];
			first=false;
		}
		return str;
	}
	toMappedEdgeList(layer){
		let obj={data:"",map:{},list:[],vertices:[],edges:[]},map=obj.map,list=obj.list,vertices=obj.vertices,edges=obj.edges,first=true;
		for(let i=0;i<this.edges.length;i++){
			let e=this.edges[i];
			if(!e)continue;
			if((layer!==undefined)&&(e[layerName]!=layer))continue;
			if((e[sourceName] in map)==false){map[e[sourceName]]=list.length;list.push(e[sourceName]);vertices.push(this.vertices[e[sourceName]]);}
			if((e[targetName] in map)==false){map[e[targetName]]=list.length;list.push(e[targetName]);vertices.push(this.vertices[e[targetName]]);}
			if(!first)obj.data+="\n";
			obj.data+=map[e[sourceName]]+" "+map[e[targetName]];
			edges.push({s:map[e[sourceName]],t:map[e[targetName]]});
			first=false;
		}
		if(obj.data.length==0)throw Error("empty edge list for layer "+layer+",\n "+JSON.stringify(this));
		return obj;
	}
	/*
	loadGZip(path){
		if(!path)path="temp/"+this.name+".gz";
		var zip=fs.readFileSync(path);//??
		var str=zlib.gunzipSync(zip);this.loadObj(JSON.parse(str));
	}
	exportDecomposition(filepath){
		if(!filepath)filepath=this.name+"_decomposition.csv";
		var first=true,s="";
		for(let e of this.edges){if(!first)s+="\n";s+=e.s+","+e.t+","+e.l;first=false;count++;if(count>1000){fs.appendFileSync(filepath, s);count=0;s="";}}fs.appendFileSync(filepath, s);count=0;s="";
	}
	*/
	getCleanObj(){
		return {name:this.name,info:this.info,vertices:this.vertices,edges:this.edges,vertexCount:this.vertexCount,edgeCount:this.edgeCount};
	}
	
	loadObj(obj){
		if("vertices" in obj && "edges" in obj){Object.assign(this,obj);return;}
		throw Error("unknown graph object format");
		/*else if (Array.isArray(obj)){
			//it ight be an edge list or not, should have some extra settings
			
		}
		else if ()*/
		
	}
	loadVerticesTextData(text){
		var g=this;
		let crlf=text.indexOf("\r\n"),lineSeparator="\n";
		if(crlf>-1){lineSeparator="\r\n";}
		let vertexList=text.split(lineSeparator);
		for(let i=0;i<vertexList.length;i++){
			let id=vertexList[i].trim();
			if(id.length>0)this.addVertex(id);
		}
	}
	loadTextData(text){//assuming it's an edge list with no title line or anything else; for any format more complicated, use a js file(you can call this from the js file before postprocesing)
	//this doesn't worry about types because ids are assumed to be strings and weights are numeric
		var g=this;
		let crlf=text.indexOf("\r\n"),lineSeparator="\n";
		if(crlf>-1){lineSeparator="\r\n";}
		let edgeList=text.split(lineSeparator);
		let firstLine=edgeList[0];
		let columnSeparator=",";
		if(firstLine.indexOf(columnSeparator)==-1){columnSeparator="\t";}
		if(firstLine.indexOf(columnSeparator)==-1){columnSeparator=" ";}
		if(firstLine.indexOf(columnSeparator)==-1){throw Error("unknown column separator in: "+firstLine);}//assuming they cannot appear in normal column values
		//test for first line column titles like source/target
		let titles=firstLine.split(columnSeparator);let hasSource=false,hasTarget=false;
		let sourceColumn=0,targetColumn=1,weightColumn=2;
		for(let i in titles){if(titles[i].trim().toUpperCase()=="SOURCE"){hasSource=true;sourceColumn=i;}if(titles[i].trim().toUpperCase()=="TARGET"){hasTarget=true;targetColumn=i;}if(titles[i].trim().toUpperCase()=="WEIGHT"){weightColumn=i;}}
		
		let firstLineIndex=0;
		if(hasSource&&hasTarget)firstLineIndex=1;
		firstLine=edgeList[firstLineIndex];
		
		let removeParentheses=false;
		if((firstLine[0]=="(")&&(firstLine[firstLine.length-1]==")")){removeParentheses=true;}
		for(let i=firstLineIndex;i<edgeList.length;i++){
			let temp=edgeList[i];
			if(removeParentheses){temp=temp.substring(1,temp.length-1);}
			temp=temp.split(columnSeparator);
			if(temp.length<2){this.warn(temp.map(d=>d.substring(0,200)),"ill-formatted line with not enough columns");continue;}
			let s=temp[sourceColumn].trim();
			let t=temp[targetColumn].trim();
			
			let e=g.addEdge(s,t);
			if((weightColumn!==null)&&(temp[weightColumn]!==undefined)){e[weightName]=Number(temp[weightColumn].trim());}
		}
		return g;
	}
	
	loadLine(line){
		if(line[line.length-1]=="\r"){line=line.substring(0,line.length-1);this.warn("line "+this.lineNumber+": "+line,"\\r detected");}
		if(!this.loadedLine){
			this.lineNumber=0;
			this.loadedLine=true;
			if((line[0]=="(")&&(line[line.length-1]==")")){this.removeParentheses=true;}
			
			let columnSeparator=",";
			if(line.indexOf(columnSeparator)==-1){columnSeparator="\t";}
			if(line.indexOf(columnSeparator)==-1){columnSeparator=" ";}
			if(line.indexOf(columnSeparator)==-1){throw Error("unknown column separator in: "+line);}//assuming they cannot appear in normal column values
			//test for first line column titles like source/target
			this.columnSeparator=columnSeparator;
			let temp=line;if(this.removeParentheses)temp=line.substring(1,line.length-1);//if there's no header, don't remove twice
			let titles=temp.split(columnSeparator);let hasSource=false,hasTarget=false,hasWeight=false;
			let sourceColumn=0,targetColumn=1,weightColumn=2;
			this.sourceColumn=0;this.targetColumn=1;this.weightColumn=undefined;//it's dangerous to assume the third column is weight if there are more than 3 columns! or even when there are 3.
			if(titles.length==3){this.weightColumn=2;this.warn(JSON.stringify(titles),"the 3rd column assumed to be weights");}
			for(let i in titles){if(titles[i].trim().toUpperCase()=="SOURCE"){hasSource=true;sourceColumn=i;}if(titles[i].trim().toUpperCase()=="TARGET"){hasTarget=true;targetColumn=i;}if(titles[i].trim().toUpperCase()=="WEIGHT"){weightColumn=i;hasWeight=true;}}
			if(hasSource&&hasTarget){this.sourceColumn=sourceColumn;this.targetColumn=targetColumn;if(hasWeight)this.weightColumn=weightColumn;else{this.weightColumn=undefined;}return;}//if teh title has s/t but no weight then we shouldn't assume the third column is weight. but if there's no title it's OK to assume it.
		}
		//fall back on regular line processing if it's not a header line
		if(this.removeParentheses){line=line.substring(1,line.length-1);}
		this.lineNumber++;
		
		let columns=line.split(this.columnSeparator);
		if(columns.length<2){this.warn("line "+this.lineNumber+": "+columns.map(d=>d.substring(0,200))+" original line: "+line,"ill-formatted line with not enough columns");return;}
		if(columns[this.sourceColumn]==undefined){throw Error("Graph "+this.name+" line "+this.lineNumber+" error: ill-formatted line with no source: "+columns.map(d=>d.substring(0,200))+" original line: "+line+", source column:"+this.sourceColumn);return;}
		if(columns[this.targetColumn]==undefined){throw Error("Graph "+this.name+" line "+this.lineNumber+" error: ill-formatted line with no target: "+columns.map(d=>d.substring(0,200))+" original line: "+line+", target column:"+this.targetColumn);return;}
		let s=columns[this.sourceColumn].trim();
		let t=columns[this.targetColumn].trim();
		
		let e=this.addEdge(s,t);
		if((this.weightColumn!==undefined)&&(columns[this.weightColumn]!==undefined)){e[weightName]=Number(columns[this.weightColumn].trim());}
	
		
		
		
		
	}
	
}
var test=false;

function compareBy(f,bigFirst) {
	if(typeof f!="function"){
		let p=f;
		f=(x)=>x[p];
	}
	if(bigFirst){
		return function(a,b){
			let fa=f(a),fb=f(b);
			if (fa < fb)
				return -1;
			if (fa > fb)
				return 1;
			return 0;
		}
	}
	else{
		
		return function(a,b){
			let fa=f(a),fb=f(b);
			if (fa > fb)
				return -1;
			if (fa < fb)
				return 1;
			return 0;
		}
	
	}
	
}


function splitArray(array,func,smallFirst=false,comparator){//sorts and splits an array, into possibly multiple arrays, by the distinct return value of func (called on the smaller array using map() ), using the comparator if given - the comparator can be used to both specify the sorting method, and to specify some values should be grouped together by returning 0.
	if(!comparator)comparator=compareBy((x)=>x);//compareBy is big ones first by default
	let values=array.map(func);
	let indices=array.map((d,i)=>i);
	let sortedIndices=indices.sort((a,b)=>comparator(values[a],values[b]));//.filter((num,i,temp)=>(i==0)||(num!=temp[i-1]));
	let results=[];let currentResult=[];
	for(let index=0;index<sortedIndices.length;index++){
		let realIndex=sortedIndices[index];
		if(index==0){
			currentResult.push(realIndex);
		}
		else{
			let realIndexPrev=sortedIndices[index-1];
			if(!!comparator(values[realIndex],values[realIndexPrev])){results.push(currentResult);currentResult=[];}//if they are different start a new array
			currentResult.push(realIndex);
		}
	}
	if(currentResult.length>0)results.push(currentResult);
	let finalResults=[];
	for(let list of results){
		finalResults.push(list.map((index)=>array[index]));
	}
	if(smallFirst)finalResults.reverse();
	return finalResults;
}
function splitArraysInPlace(arrays,func,smallFirst=false,comparator){
	if(!comparator)comparator=compareBy((x)=>x);
	let newlist=[];//don't disrupt the old array of arrays while we work on it
	for(let array of arrays){//don't change the relative order of existing arrays
		let result=splitArray(array,func,smallFirst,comparator);
		newlist=newlist.concat(result);
	}
	return newlist;
	
}

function DFSHelper2(clones,cloneID,ccID,ccIDs,edgePartition,adjacencyList){//edge partition version
	if(cloneID in ccIDs){throw Error();}
	let stack=[],cc=[];
	stack.push(cloneID);let partitionID;
	let clone=clones[cloneID];
	if(edgePartition)partitionID=clone.value;//every edge partition shold have its own set of clones, with clones assigned values
	ccIDs[cloneID]=-1;//temp value means it's pushed to the stack but not popped yet 
	
	let edgeCount=0;
	while(stack.length>0){
		let newNodeID=stack.pop();
		ccIDs[newNodeID]=ccID;
		cc.push(newNodeID);
		let newNode=clones[newNodeID];//has the properties original and edges
		let adj=(adjacencyList?adjacencyList[newNodeID]:newNode.edges);
		for(let neighborID in adj){
			if(edgePartition){
				let value=edgePartition[adj[neighborID]];
				if(value!=partitionID)continue;
			}
			if(neighborID in ccIDs){
				if(ccIDs[neighborID]==-1){
					edgeCount++;
				}
				continue;
			}
			edgeCount++;
			ccIDs[neighborID]=-1;
			stack.push(Number(neighborID));
		}
	}
	cc.edgeCount=edgeCount;
	return cc;
}
	
if((typeof module !="undefined")&& (typeof module.exports=="object")){
	module.exports=Graph;
}