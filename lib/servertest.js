
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
	
	
	toMappedEdgeList(layer){//filters and ensures vertex indices are continuous
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
	
	
	
	
	
	loadEdges(text,options){//assuming it's an edge list with no title line or anything else; for any format more complicated, use a js file(you can call this from the js file before postprocesing)
	//this doesn't worry about types because ids are assumed to be strings and weights are numeric - actally we skip weight for now
		var g=this;
		let crlf=text.indexOf("\r\n"),lineSeparator="\n";
		if(crlf>-1){lineSeparator="\r\n";}
		let edgeList=text.split(lineSeparator);
		let firstLine=edgeList[0].trim();
		let columnSeparator=",";
		if(firstLine.indexOf(columnSeparator)==-1){columnSeparator="\t";}
		if(firstLine.indexOf(columnSeparator)==-1){columnSeparator=" ";}
		if(firstLine.indexOf(columnSeparator)==-1){throw Error("unknown column separator in: "+firstLine);}//assuming they cannot appear in normal column values
		//test for first line column titles like source/target
		let titles=firstLine.split(columnSeparator);let hasSource=false,hasTarget=false;
		let sourceColumn=0,targetColumn=1,weightColumn=2;
		for(let i in titles){
			if(titles[i].trim().toUpperCase()=="SOURCE"){hasSource=true;sourceColumn=i;}
			if(titles[i].trim().toUpperCase()=="TARGET"){hasTarget=true;targetColumn=i;}
			//if(titles[i].trim().toUpperCase()=="WEIGHT"){weightColumn=i;}//skip weights for now
		}
		
		let firstLineIndex=0;
		if(hasSource&&hasTarget)firstLineIndex=1;
		firstLine=edgeList[firstLineIndex].trim();//real first line
		
		let removeParentheses=false;
		if((firstLine[0]=="(")&&(firstLine[firstLine.length-1]==")")){removeParentheses=true;}
		for(let i=firstLineIndex;i<edgeList.length;i++){
			let temp=edgeList[i].trim();
			if(removeParentheses){temp=temp.substring(1,temp.length-1);}
			temp=temp.split(columnSeparator);
			if(temp.length<2){this.warn(temp.map(d=>d.substring(0,200)),"ill-formatted line with not enough columns");continue;}
			let s=temp[sourceColumn].trim();
			let t=temp[targetColumn].trim();
			
			let e;
			if(options.byIndices)e=g.addEdgeByIndices(Number(s),Number(t));
			else e=g.addEdges(s,t);
			//if((weightColumn!==null)&&(temp[weightColumn]!==undefined)){e[weightName]=Number(temp[weightColumn].trim());}
		}
		return g;
	}
	
	
	
	

	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	if(extraHierarchyDir!==undefined){
			let bccs=buildHierarchyDatasetList(extraHierarchyDir);
			
			async function processBCC(filename){
				console.log(filename);
				await new Promise(function(resolve,reject){
					let alg=spawn(extraExecPath,[filename],{stdout:"pipe",stderr:"pipe"});
					alg.stdout.pipe(process.stdout);
					alg.stderr.pipe(process.stderr);
					alg.on('close', (code) => {
						console.log(` exit code ${code}`);
						resolve();
					});
				});
			}
			if(extraExecPath){
				for(let f of bccs){await processBCC(f);}//cannot run them at the same time, they eat too much memory
			}
			if(callback)callback(datasetList);
			console.log("***loading all datasets finished*** "+(v||""));
			
		}
		
		
		

		
		
		
		

const cacheTemplates={
	
	vertices:{
		deps:"data",files:(d)=>["vertices.json.gz"],
		make:(d)=>{saveObj(d.id,"vertices",d.data.vertices);},//assuming it alway fits in memory easily
		load:(d)=>{//todo: if data is loaded, don't need to load this
			d.data.vertices=loadArrayWithProperties(d.id,"vertices");d.data.verticesLoaded=true;
			//v/e can be loaded from processed JSON instead of from original data again
			d.data.vertexCount=d.data.vertices.length;
			d.data.updateGraph();//????only update after both are loaded
		},
	},
	edges:{
		deps:"data",files:(d)=>["edges.json.gz"],
		make:(d)=>{saveObj(d.id,"edges",d.data.edges);},
		load:(d)=>{
			d.data.edges=loadObj(d.id,"edges");d.data.edgesLoaded=true;
			d.data.edgeCount=d.data.edges.length;
			d.data.updateGraph();//????
		}
	},
	/*
	
	*/
	size:{//what we really need is a record of v/e count here. layer count etc should not be depended on here.
		deps:"data",files:(d)=>(["sizes.json.gz"]),
		make:(d)=>{d.vertexCount=d.data.vertexCount;d.edgeCount=d.data.edgeCount;saveObj(d.id,"sizes",{name:d.name,vertexCount:d.vertexCount,edgeCount:d.edgeCount});},
		load:(d)=>{Object.assign(d,loadObj(d.id,"sizes"));},
		alwaysLoad:true,//unless needing creation, always load it when checking if it's up to date
	},//a summary of the number of objects and other info
	decomposition:{//an array of numbers, equals the peel values of edges
		deps:"vertices,edges",
		files:(d)=>["decomposition.json.gz"],
		make:(d)=>{
			d.data.calculateLayers();
			saveObj(d.id,"decomposition",d.data.getPeelValues());
		},
		load:(d)=>{let array=loadObj(d.id,"decomposition");for(let i=0;i<array.length;i++){d.data.edges[i][layerName]=array[i];}}
	},//todo: loading data in a graph should keep teh graph consistent (adj list, layers and everything)
	
	defaultSave:{//the old default file with vertices, edges and edge peel values
		deps:"vertices,edges,decomposition",
		files:(d)=>["main.json.gz"],
		make:(d)=>{saveObj(d.id,"main",d.data.getCleanObj());},//does not load by itself	
	},
	
	
	layers:{//a summary of the layers, |V| and |E| etc
		deps:"edges,decomposition",files:(d)=>["layers.json.gz"],
		make:(d)=>{
			let layers={},data=d.data;
			for(let e of data.edges){
				if(!e[layerName])throw Error("invalid edge layer "+JSON.stringify(e));
				if(!(e[layerName] in layers)){layers[e[layerName]]={vMap:{},edgeCount:0,vertexCount:0};}
				let layer=layers[e[layerName]];
				layer.edgeCount++;
				if(!layer.vMap[e[sourceName]]){layer.vMap[e[sourceName]]=true;layer.vertexCount++;}
				if(!layer.vMap[e[targetName]]){layer.vMap[e[targetName]]=true;layer.vertexCount++;}
			}
			data.layers=layers;
			//console.log(d.data.layerlist);
			saveObj(d.id,"layers",d.data.layers);
		},
		load:(d)=>{d.data.layers=loadObj(d.id,"layers");},
		alwaysLoad:true,
	},
	
	layerSummary:{//a summary of the layers, |V| and |E| etc
		deps:"vertices,edges,decomposition",files:(d)=>["layerSummary.json.gz"],
		make:(d)=>{
			let ls=d.data.getLayerSummary();
			saveObj(d.id,"layerSummary",ls);
		},
		load:(d)=>{d.data.layerSummary=loadObj(d.id,"layerSummary");},
		alwaysLoad:true,
	},
	
	layerEdgeList:{deps:"vertices,edges,decomposition,layers",
		files:(d)=>([].concat.apply([], Object.keys(d.data.layers).map((l)=>[
			//getShortPath("layer",l),//a folder 
			getShortPath("layer",l,"mappededgelist.txt"),
			getShortPath("layer",l,"edgelist.txt"),
			getShortPath("layer",l,"layerverticesmap.json.gz"),
			getShortPath("layer",l,"layerverticeslist.json.gz"),
			getShortPath("layer",l,"main.json.gz"),
		]))),
		make:(d)=>{
			if(!fileExists(d.id,"layer")){mkdir(d.id,"layer");}
			else{touch(d.id,"layer");}//if it needs updating, make sure the folder update time is new
			Object.keys(d.data.layers).map(doLayer);
			function doLayer(layer){
					let l =layer; //now there are too many stuff for each layer, so I would put them in a folder layer/<num>
					let obj=d.data.toMappedEdgeList(l);//map:{...},data:"...",list, main(mapped vertices and edges for json)
					if(!fileExists(d.id,"layer",l))mkdir(d.id,"layer",l);
					saveStr(d.id,"layer",l,"mappededgelist",obj.data);
					saveObj(d.id,"layer",l,"layerverticesmap",obj.map);
					saveObj(d.id,"layer",l,"layerverticeslist",obj.list);
					saveObj(d.id,"layer",l,"main",{name:d.id+" layer "+l,vertices:obj.vertices,edges:obj.edges,vMap:obj.map,vList:obj.list,vertexCount:obj.vertices.length,edgeCount:obj.edges.length});
					saveStr(d.id,"layer",l,"edgelist",d.data.toEdgeList(l));//networkx should use an unmapped edge list for convenience
			};
			
		},
		//note: the new C++ code loads fast enough to be called for each file, unlike the old python version.
	},
	

	sparsenet:{
		deps:"layerEdgeList",
		files:(d)=>(Object.keys(d.data.layers).map((l)=>getShortPath("layer",l,"sparsenetpaths.json.gz") )),
		make:async (d)=>{//never loads
			for(let l in d.data.layers){
				await doLayer(l);
			}
			//return Promise.all(Object.keys(d.data.layers).map(doLayer));//I don't want too many of them happening at once because some would fail somehow
			function doLayer(layer){
				return new Promise(function (resolve, reject){
					let l =layer;
					let list=loadObj(d.id,"layer",l,"layerverticeslist");
					let path=getPath(d.id,"layer",l,"mappededgelist.txt");
					let sn=spawn('bin/sparsenet',[path],{stdout:"pipe",stderr:"pipe"});//this actually works, even though the input path is based on the project root instead of the binary, and the path uses / not \, and the executable may either be sparsenet or sparsenet.exe
					console.log("sparse net for "+d.id+" layer "+l+": ");
					if(l<10){//too many event listeners bound on stdout/stderr?
						sn.stdout.pipe(process.stdout);
						sn.stderr.pipe(process.stderr);
					}
					sn.on('close', (code) => {
						console.log(` SN exit code ${code}`);
						var result=fs.readFileSync(path+".out","ascii");
						if(!result.trim()){console.log("invalid sn for "+l+" : ",result);saveObj(d.id,"layer",l,"sparsenetpaths",[]);resolve();return;}//sometimes it may crash
						var lines=result.trim().split("\n");
						for(let i=0;i<lines.length;i++){
							lines[i]=lines[i].trim().split(" ");
							for(let j=0;j<lines[i].length;j++){
								if((lines[i][j] in list) ==false)throw Error("invalid mapped vertex");
								lines[i][j]=list[lines[i][j]];
							}
							
						}
						saveObj(d.id,"layer",l,"sparsenetpaths",lines);
						resolve();
					});
				} );
			}
			
		},
		//note: the new C++ code loads fast enough to be called for each file, unlike the old python version.
	},
	
	CC_and_BCC:{//the python code will load the vertex map and output original vertex indices. As a rule, the user-available files should all use original indices
		deps:"layerEdgeList",
		files:(d)=>(Object.keys(d.data.layers).map((l)=>getShortPath("layer",l,"ccsummary.json.gz"))),//summary for each layer, and a number of other files
		make:(d)=>{//never loads
			return new Promise(function (resolve, reject){
				let cc=spawn('python',["./bin/cc_bcc.py",getPath(d.id)],{stdout:"pipe",stderr:"pipe"});//must take a path that ends in /
				console.log("cc and bcc for "+d.id);
				cc.stdout.pipe(process.stdout);
				cc.stderr.pipe(process.stderr);
				cc.on('close', (code) => {
					console.log("CC exit code "+code);
					resolve();
				});
			} );
		},
		//note: the new C++ code loads fast enough to be called for each file, unlike the old python version.
	},
	BCC_Waves:{
		deps:"CC_and_BCC",
		files:(d)=>["BCCwaves.json.gz"],//summary for each layer, and a number of other files
		make:(d)=>{//never loads
			var CCpattern=/^cc[0-9]*.json.gz$/;
			var topLevelResult={};
			for(let layer in d.data.layers){
				let layerPath=getPath(d.id,"layer",layer);
				let layerResult={};
				fs.readdirSync(layerPath).forEach((f)=>{
					if(CCpattern.test(f)){
						let ccID=Number(f.split(".json.gz")[0].substring(2));
						let ccObj=loadObj(d.id,"layer",layer,f.split(".json.gz")[0]);
						
						let result={};
						for(let i=0;i< ccObj.bcc.length;i++){
							let edgelist=ccObj.bcc[i];
							if(edgelist.length<1000)continue;
							console.log("calculating waves at layer "+layer+" CC "+ccID);
							//console.log(edgelist.slice(0,100));
							let g=new Graph();
							for(let e of edgelist){
								g.addEdge(e[0],e[1]);
							}
							//result[i]=g.getWavesMetagraph();
							let tempResult=g.getWavesMetagraphAndWaveSubgraphs();
							result[i]=tempResult.metagraph;
							//also save the wave edge lists
							let waves=tempResult.waveEdgelists;
							let vertexLayers=tempResult.waveLayerResults.vertexLayers;
							for(let j=0;j<waves.length;j++){
								let edges=waves[j];
								let str="",first=true;
								for(let k=0;k<edges.length;k++){
									if(!first)str+="\n";
									let s=edges[k][sourceName],t=edges[k][targetName];
									
									str+=s+" "+t+" "+vertexLayers[s]+" "+vertexLayers[t];
									//save the layers of the edge endpoints, for filtering based on layers too (and also to keep the layers when showing a wave, because decomposing a wave again does not yield the same layers)
									first=false;
								}
								saveStr(d.id,"layer",layer,f.split(".json.gz")[0]+"bcc"+i+"wave"+j,str);
							}
						}
						if(Object.keys(result).length>0){
							saveObj(d.id,"layer",layer,f.split(".json.gz")[0]+"BCCwaves",result);
							layerResult[ccID]=result;
						}
					}
					
				});
				if(Object.keys(layerResult).length>0){
					saveObj(d.id,"layer",layer,"BCCwaves",layerResult);
					topLevelResult[layer]=layerResult;
				}
			}
			saveObj(d.id,"BCCwaves",topLevelResult);
		},
		//note: the new C++ code loads fast enough to be called for each file, unlike the old python version.
	},
	
};

for(let name in cacheTemplates){
	let cacheObj=cacheTemplates[name];
	if((typeof cacheObj.deps)=="string"){cacheObj.deps=cacheObj.deps.split(",");}
}







async function loadAllFiles(datasetFiles){
	for(let id in datasetFiles){
		let files=datasetFiles[id];
		let loadingMethod=getLoadingMethod(id,files);//returns a promise. loadingMethod is falsy if it can't be loaded
		if(!loadingMethod){continue;}//this "dataset" has no valid data files and can't be loaded, so ignore it

		datasets[id]={id:id,data:new Graph()};//a dataset has metadata besides the graph; so the graph is .data()
		let dataset=datasets[id],data=datasets[id].data;
		
		//check cache
		let dir=id+"/",dirExists=fileExists(dir);//all these have cacheDir automatically prefixed
		if(!dirExists){mkdir(dir);}
		
		let hasRemainingCache=true,nextCache=null;dataset.caches={};//metadata for the cache checking process(file lists etc)
		
		//detect data file update times
		let dataNewestTime=Math.max.apply(null,Object.keys(files).map((t)=> files[t].updateTime));
		dataset.caches.data={updateTime:dataNewestTime};//a dummy cache that represents the original data, that may be loaded if needed
		dataset.updateTime=dataNewestTime;
		while(hasRemainingCache){
			hasRemainingCache=false;
			for(let cacheName in cacheTemplates){
				if(!dataset.caches[cacheName]){
					let cacheObj=dataset.caches[cacheName],cacheTemplate=cacheTemplates[cacheName];;
					hasRemainingCache=true;
					let ready=true;
					for(let depName of cacheTemplate.deps){
						if(!(depName in dataset.caches)){ready=false;break;}
						if(dataset.caches[depName].exists=false){ready=false;break;}
					}
					if(ready){nextCache=cacheName;break;}
				}
			}
			if(!hasRemainingCache)break;
			if(!nextCache){
				//throw Error("dataset "+id+": unresolved dependency, cannot continue processing");
				console.warn("dataset "+id+": unresolved dependency, cannot continue processing");
				break;
				//allow some data to be missing 
			}
			let cacheObj=dataset.caches[nextCache],cacheTemplate=cacheTemplates[nextCache];
			let expectedFiles=cacheTemplate.files(dataset);
			let needGenerating=false;let currentCacheUpdateTime;
			if((!cacheTemplate.deps)||(cacheTemplate.deps.length==0)){}//some may have no dependencies
			else{
				
				if(!allFilesExist(expectedFiles,dir)){needGenerating=true;console.log("generating "+nextCache+"for "+id+" because files are missing");}
				else{
					currentCacheUpdateTime=newestTimeOfFiles(expectedFiles,dir);
					let newestFileName=newestFileOfFiles(expectedFiles,dir);
					for(let depID of cacheTemplate.deps){
						if(dataset.caches[depID].updateTime>currentCacheUpdateTime){
							needGenerating=true;
							console.log("generating "+nextCache+"for "+id+" because files are too old: dependency "+depID+"'s time is "+new Date(dataset.caches[depID].updateTime)+", current newest file is "+newestFileName+", its time is: "+new Date(currentCacheUpdateTime));
							break;
						}
					}
				}
			}
			if(cacheTemplate.alwaysMake){needGenerating=true;console.log("generating because it's set to always generate");}
			
			async function loadCache(name){//loading something doesn't require loading its dependencies
				let currentCache=dataset.caches[name],currentCacheTemplate=cacheTemplates[name];
				if(currentCache.loaded==true)return;
				if(name=="data"){console.log("loading raw data for "+id);await Promise.resolve(loadingMethod());datasets[id].data.setName(id);console.log("loaded raw data for "+id);}
				else{
					if(!currentCacheTemplate)throw Error("no such template");
					if(currentCacheTemplate.load){await Promise.resolve(currentCacheTemplate.load(dataset));}//a cache file may have no separate loading method, and loading may or may not be async
				}
				currentCache.loaded=true;//even if it needs no loading method
			}
			if(needGenerating){
				//load all dependenciess
				
				if(cacheTemplate.deps){await Promise.all(cacheTemplate.deps.map(loadCache));}
				if(!cacheTemplate.make){throw Error("no method to make required cache: "+nextCache);}
				
				await Promise.resolve(cacheTemplate.make(dataset));//it could be a Promise or not
				
				let obj={};dataset.caches[nextCache]=obj;
				if(allFilesExist(expectedFiles,dir)){
					currentCacheUpdateTime=newestTimeOfFiles(expectedFiles,dir);
					
					obj.loaded=true;// if it's recreated, assume it's as if it's loaded, so no need to load it again
					
				}
				else{
					//throw Error("expected files not found: "+JSON.stringify(expectedFiles)+", in "+dir);
					console.warn("expected files not found: "+JSON.stringify(expectedFiles)+", in "+dir);
					obj.exists=false;
				}	
			}
			else{
				dataset.caches[nextCache]={};
				if(cacheTemplate.alwaysLoad){await loadCache(nextCache);}
			}
			//it's either recreated or checked to be up to date
			dataset.caches[nextCache].files=expectedFiles;
			dataset.caches[nextCache].updateTime=currentCacheUpdateTime;
		}
		dataset.summary=getDatasetSummary(dataset);
		console.log("loaded dataset "+id+", "+JSON.stringify(dataset.summary));
	}
	
}


//note: subgraphs do not necessarily have a single fixed derivation, because some derivation chains have teh same subgraphs like CC/layer/CC and layer/CC, or layer/CC/wave-CC and layer/Wave-CC. Instead it's important that one kind of subgraph has a single directory(I can assume with a single ID, but if it's partitioned by two different properties, then we should also have mappings from the IDs to the two property values. And multiple metagraphs may refer to essentially the same subgraph objects. Metagraphs still need to specify where their sub objects are. 
//All subgraphs should be generated based on partitions -edge or vertex partitions, sometimes two partitions at once.
//
//it's no longer true that one cache/template only generates one kind of file - instead, a partition may need to generate its subgraphs and metagraphs at once because doing this in steps would be inelegant.
//instead of definitions of file templates/properties, we have definitions of computations, and each may produce multiple kinds of output, and may be loaded into graph object's property (like vertex property or edge  property). (might as well call them properties); and derived graphs are different because they are no longer necessarily considered part of the output, and instead just exist as files in folders (including buckets which are considered derived graphs in their own right), and we don't ave to check all derived files, just check the existence and the modification time of the derived graph folders (like CC/ or CCmetagraph/), and when derived graphs are created, their own property generation are put in the stack, but when loading a graph with subgraphs, if the folder is up to date,we don't check te contents, to avoid long loading times. If refreshing derived graphs is needed, just delete one of these files.

//A graph should always know which partitions (and partitions on which graphs) it's derived from. Ordering of partitions on the same graph does not matter, so they can have a single canonical ordering and a single name (like layer-CC). subgraphs generated from more than one partition are organized by a new numeric ID that are not teh same as the partition value, but can map to prtition values in separate files. (Even one-partition subgraphs can have a different ID scheme ) Or if not, the directories can be organized by partition values. However, bucketing works for a kind of subgraph, not for 


const Subgraphs={
	
//now all props/ops have a single file naming scheme and no need to specify expected files
	layer:{
		deps:"vertices,edges,decomposition,layers",
		exclude:(g)=>((g.vertexCount<5)||(g.path.indexOf("layer")!=-1)||(g.layerCount==1)),
		make:function*(g){//this is a generator to save memory
			for(let l in g.layers){
				let obj=g.toMappedEdgeList(l);//map:{...},list:[...],data:"..."
				//create graph from edgelist
				let newGraph=new Graph();
				newGraph.loadTextData(obj.data);
				//newGraph.vertexMap=obj.map;
				newGraph.args=[l];
				yield newGraph;
			}
			
		},
	},

	CC:{
		deps:"vertices,edges,edgelist",
		condition:(g)=>g.path.indexOf("layer")>-1,
		defer:true,
		makeAll:(gs)=>{
			return new Promise(function (resolve, reject){
				let cc=spawn('python',["./bin/cc.py"].concat(gs.map((g)=>g.path)),{stdout:"pipe",stderr:"pipe"});//must take a path that ends in /
				console.log("cc and bcc for "+gs.map((g)=>g.path).join(","));
				cc.stdout.pipe(process.stdout);
				cc.stderr.pipe(process.stderr);
				cc.on('close', (code) => {
					console.log("CC exit code "+code);
					resolve(getSubgraphsFromEdgelists(gs,"CC"));
				});
			} );
		}
	},
	BCC:{
		deps:"vertices,edges,edgelist",
		defer:true,
		condition:(g)=>g.path.indexOf("CC")>-1,
		makeAll:(gs)=>{
			return new Promise(function (resolve, reject){
				let bcc=spawn('python',["./bin/bcc.py"].concat(gs.map((g)=>g.path)),{stdout:"pipe",stderr:"pipe"});//must take a path that ends in /
				console.log("cc and bcc for "+d.id);
				bcc.stdout.pipe(process.stdout);
				bcc.stderr.pipe(process.stderr);
				bcc.on('close', (code) => {
					console.log("BCC exit code "+code);
					resolve(getSubgraphsFromEdgelists(gs,"BCC"));
				});
			} );
		}
	}
};

for(let name in Subgraphs){
	let obj=Subgraphs[name];
	if((typeof obj.deps)=="string"){obj.deps=obj.deps.split(",");}
}





layers:{//a summary of the layers, |V| and |E| etc
		deps:"graph,edgePeeling",files:(d)=>["layers.json.gz"],
		make:(d)=>{
			let layers={},data=d.data;
			for(let e of data.edges){
				if(!e[layerName])throw Error("invalid edge layer "+JSON.stringify(e));
				if(!(e[layerName] in layers)){layers[e[layerName]]={vMap:{},edgeCount:0,vertexCount:0};}
				let layer=layers[e[layerName]];
				layer.edgeCount++;
				if(!layer.vMap[e[sourceName]]){layer.vMap[e[sourceName]]=true;layer.vertexCount++;}
				if(!layer.vMap[e[targetName]]){layer.vMap[e[targetName]]=true;layer.vertexCount++;}
			}
			data.layers=layers;
			//console.log(d.data.layerlist);
			saveObj(d.id,"layers",d.data.layers);
		},
		load:(d)=>{d.data.layers=loadObj(d.id,"layers");},
		alwaysLoad:true,
	},
	vertexPeelValues:{
		deps:"vertices,edges,decomposition",files:(d)=>["vertexPeelValues.json.gz"],
		make:(d)=>{
			let values=d.data.getVertexPeelValues();
			saveObj(d.id,"vertexPeelValues",values);
		},
	},
	
	
	
	layerEdgeList:{deps:"vertices,edges,decomposition,layers",
		files:(d)=>([].concat.apply([], Object.keys(d.data.layers).map((l)=>[
			//getShortPath("layer",l),//a folder 
			getShortPath("layer",l,"mappededgelist.txt"),
			getShortPath("layer",l,"edgelist.txt"),
			getShortPath("layer",l,"layerverticesmap.json.gz"),
			getShortPath("layer",l,"layerverticeslist.json.gz"),
			getShortPath("layer",l,"main.json.gz"),
		]))),
		make:(d)=>{
			if(!fileExists(d.id,"layer")){mkdir(d.id,"layer");}
			else{touch(d.id,"layer");}//if it needs updating, make sure the folder update time is new
			Object.keys(d.data.layers).map(doLayer);
			function doLayer(layer){
					let l =layer; //now there are too many stuff for each layer, so I would put them in a folder layer/<num>
					let obj=d.data.toMappedEdgeList(l);//map:{...},data:"...",list, main(mapped vertices and edges for json)
					if(!fileExists(d.id,"layer",l))mkdir(d.id,"layer",l);
					saveStr(d.id,"layer",l,"mappededgelist",obj.data);
					saveObj(d.id,"layer",l,"layerverticesmap",obj.map);
					saveObj(d.id,"layer",l,"layerverticeslist",obj.list);
					saveObj(d.id,"layer",l,"main",{name:d.id+" layer "+l,vertices:obj.vertices,edges:obj.edges,vMap:obj.map,vList:obj.list,vertexCount:obj.vertices.length,edgeCount:obj.edges.length});
					saveStr(d.id,"layer",l,"edgelist",d.data.toEdgeList(l));//networkx should use an unmapped edge list for convenience
			};
			
		},
	},
	CCs:{deps:"vertices,edges",
		files:(d)=>["CCs.json.gz","CCdistribution.json.gz"],//also save cc distribution?
		make:(d)=>{
			let result=d.data.getCCs();
			saveObj(d.id,"CCs",result);
			let distribution={},edgedistribution={};
			for(let ccRecord of result.CCs){
				let V=ccRecord["|V|"],E=ccRecord["|E|"];
				if(!distribution[V])distribution[V]=0;distribution[V]++;
				if(!edgedistribution[E])edgedistribution[E]=0;edgedistribution[E]++;
			}
			saveObj(d.id,"CCdistribution",{vertexCounts:distribution,edgeCounts:edgedistribution});
		},
		load:(d)=>{let result=loadObj(d.id,"CCs");d.data.CCs=result.CCs;d.data.ccIDs=result.ccIDs},
	},
	CCBuckets:{deps:"vertices,edges,CCs",files:(d)=>["CCBuckets.json.gz"],//includes a summary of rings; the actual contents are in CCBucket/type/ID or if not, then it should load from CC/ID or CC/ID/layerCCMetagraph directly
		make:(d)=>{
			let ccResults=d.data.getCCs();
			let result=d.data.getCCBuckets();
			let logV=Math.log(d.data.vertices.length);
			for(let type in result.buckets){//create subgraphs for all types of buckets that are small; create CC subgraphs or CC-layerCCMetagraph or even collapsed metagraphs for large CCs
				let typeBuckets=result.buckets[type];
				for(let bucketID=0;bucketID<typeBuckets.length;bucketID++){
					let bucket=typeBuckets[bucketID];
					if(bucket.totalV<16384){
						let vMap={};for(let vID of bucket.vertices)vMap[vID]=true;
						let edgelist=d.data.getFilteredEdgeList((e)=>((e[sourceName] in vMap)&&(e[targetName] in vMap)));
						saveObj(d.id,"CCBucket",type,bucketID,edgelist);
					}
					//whether or not the bucket is large, save all CCs in this bucket that are relatively large (>=64 vertices?) and may be better represented as metavertices
					for(let ccRecord of bucket.CCs){
						if(ccRecord["|V|"]<5||ccRecord["|V|"]<logV){continue;}
						//if(!Array.isArray(ccRecord.vertexList))console.log(ccRecord);//somehow it's not iterable? and not an array??
						if(ccRecord.vertexList==undefined||ccRecord.vertexList.length==0||ccRecord.index==null)console.log(ccRecord);
						let vMap={};for(let i=0;i< ccRecord.vertexList.length;i++){let vID=ccRecord.vertexList[i];vMap[vID]=true;}
						let edgelist=d.data.getFilteredEdgeList((e)=>((e[sourceName] in vMap)&&(e[targetName] in vMap)));
						saveObj(d.id,"CC",ccRecord.index,"edges",edgelist);
						//if it's large enough, save layer/cc metagraph for it? (in the metagraph saving code)
					}
				}
			}
			//then delete stuff the client doesn't need to save space and loading time, but don't change teh cC records thatmay be needed later?
			for(let type in result.buckets){//create subgraphs for all types of buckets that are small; create CC subgraphs or CC-layerCCMetagraph or even collapsed metagraphs for large CCs
				let typeBuckets=result.buckets[type];
				for(let bucketID=0;bucketID<typeBuckets.length;bucketID++){
					let bucket=typeBuckets[bucketID];
					delete bucket.vertices;
					for(let i=0;i<bucket.CCs.length;i++){let temp=Object.assign({},bucket.CCs[i]);delete temp.vertexList;bucket.CCs[i]=temp;}
				}
			}
			saveObj(d.id,"CCBuckets",result);
		},
	},
	layerCCMetagraph:{
		deps:"vertices,edges,decomposition,CCs",
		files:(d)=>["layerCCmetagraph.json.gz","layerCCmetagraphsummary.json.gz"],
		make:(d)=>{
			let metagraph=d.data.getLayerCCMetagraph();
			for(let metanode of metagraph.vertices){delete metanode.edges;}
			let logV=Math.log(d.data.vertices.length);
			for(let metanode of metagraph.vertices){
				let metanodeID=metanode.index;if(metanode["|V|"]<5||metanode["|V|"]<logV){continue;}//avoid saving tiny subgraphs?
				let subgraph=metagraph.expandVertex(metanode);
				if(subgraph){//it has no edges property for vertices
					saveObj(d.id,"layerCC",metanodeID,subgraph);
				}
				else{throw Error("missing subgraph for layerCC "+metanodeID);}
			}
			
			for(let metanode of metagraph.vertices){delete metanode.cloneList;}//temporary data to speed up subgraph creation
			
			//also save separate metagraphs and collapsed metagraphs if needed for large original CCs
			let ccResult=d.data.getCCs();let ccIDs=ccResult.ccIDs,CCs=ccResult.CCs;
			for(let ccRecord of CCs){
				if(ccRecord["|V|"]>64){
					//get CC of the metagraph corresponding to it
					let vMap={},vList=[],vertices=[],edges=[];
					for(let metanode of metagraph.vertices){
						let originalCCID=metanode.globalCCID;
						if(originalCCID==ccRecord.index){vMap[metanode.index]=vertices.length;vList.push(metanode.index);vertices.push(metanode);}
					}
					for(let metaedge of metagraph.edges){
						let originalCCID=metagraph.vertices[metaedge.s].globalCCID;
						if(originalCCID==ccRecord.index){edges.push(metaedge);}
					}
					let CCmetagraph={vertices:vertices,edges:edges,vMap:vMap,vList:vList};
					//should we save collpased metagraphs if it can be computed quickly? Or just because the graph may be too big?
					saveObj(d.id,"CC",ccRecord.index,"layerCCmetagraph",CCmetagraph);
					if(vertices.length>=16384){
						//do collapsed metagraph?
						//vMap={},edges=[];vertices.sort();//by |V|, |E| and degree in the metagraph, in that order
						
					}
				}
			}
			
			saveObj(d.id,"layerCCmetagraph",metagraph);
			saveObj(d.id,"layerCCmetagraphsummary",{vertexCount:metagraph.vertices.length,edgeCount:metagraph.edges.length});
		},
	},

	sparsenet:{
		deps:"layerEdgeList",
		files:(d)=>(Object.keys(d.data.layers).map((l)=>getShortPath("layer",l,"sparsenetpaths.json.gz") )),
		make:async (d)=>{//never loads
			for(let l in d.data.layers){
				await doLayer(l);
			}
			//return Promise.all(Object.keys(d.data.layers).map(doLayer));//I don't want too many of them happening at once because some would fail somehow
			function doLayer(layer){
				return new Promise(function (resolve, reject){
					let l =layer;
					let list=loadObj(d.id,"layer",l,"layerverticeslist");
					let path=getPath(d.id,"layer",l,"mappededgelist.txt");
					let sn=spawn('bin/sparsenet',[path],{stdout:"pipe",stderr:"pipe"});//this actually works, even though the input path is based on the project root instead of the binary, and the path uses / not \, and the executable may either be sparsenet or sparsenet.exe
					console.log("sparse net for "+d.id+" layer "+l+": ");
					if(l<10){//too many event listeners bound on stdout/stderr?
						sn.stdout.pipe(process.stdout);
						sn.stderr.pipe(process.stderr);
					}
					sn.on('close', (code) => {
						console.log(` SN exit code ${code}`);
						var result=fs.readFileSync(path+".out","ascii");
						if(!result.trim()){console.log("invalid sn for "+l+" : ",result);saveObj(d.id,"layer",l,"sparsenetpaths",[]);resolve();return;}//sometimes it may crash
						var lines=result.trim().split("\n");
						for(let i=0;i<lines.length;i++){
							lines[i]=lines[i].trim().split(" ");
							for(let j=0;j<lines[i].length;j++){
								if((lines[i][j] in list) ==false)throw Error("invalid mapped vertex");
								lines[i][j]=list[lines[i][j]];
							}
							
						}
						saveObj(d.id,"layer",l,"sparsenetpaths",lines);
						resolve();
					});
				} );
			}
			
		},
		//note: the new C++ code loads fast enough to be called for each file, unlike the old python version.
	},
	
	CC_and_BCC:{//the python code will load the vertex map and output original vertex indices. As a rule, the user-available files should all use original indices
		deps:"layerEdgeList",
		files:(d)=>(Object.keys(d.data.layers).map((l)=>getShortPath("layer",l,"ccsummary.json.gz"))),//summary for each layer, and a number of other files
		make:(d)=>{//never loads
			return new Promise(function (resolve, reject){
				let cc=spawn('python',["./bin/cc_bcc.py",getPath(d.id)],{stdout:"pipe",stderr:"pipe"});//must take a path that ends in /
				console.log("cc and bcc for "+d.id);
				cc.stdout.pipe(process.stdout);
				cc.stderr.pipe(process.stderr);
				cc.on('close', (code) => {
					console.log("CC exit code "+code);
					resolve();
				});
			} );
		},
		//note: the new C++ code loads fast enough to be called for each file, unlike the old python version.
	},
	BCC_Waves:{
		deps:"CC_and_BCC",
		files:(d)=>["BCCwaves.json.gz"],//summary for each layer, and a number of other files
		make:(d)=>{//never loads
			var CCpattern=/^cc[0-9]*.json.gz$/;
			var topLevelResult={};
			for(let layer in d.data.layers){
				let layerPath=getPath(d.id,"layer",layer);
				let layerResult={};
				fs.readdirSync(layerPath).forEach((f)=>{
					if(CCpattern.test(f)){
						let ccID=Number(f.split(".json.gz")[0].substring(2));
						let ccObj=loadObj(d.id,"layer",layer,f.split(".json.gz")[0]);
						
						let result={};
						for(let i=0;i< ccObj.bcc.length;i++){
							let edgelist=ccObj.bcc[i];
							if(edgelist.length<1000)continue;
							console.log("calculating waves at layer "+layer+" CC "+ccID);
							//console.log(edgelist.slice(0,100));
							let g=new Graph();
							for(let e of edgelist){
								g.addEdge(e[0],e[1]);
							}
							//result[i]=g.getWavesMetagraph();
							let tempResult=g.getWavesMetagraphAndWaveSubgraphs();
							result[i]=tempResult.metagraph;
							//also save the wave edge lists
							let waves=tempResult.waveEdgelists;
							let vertexLayers=tempResult.waveLayerResults.vertexLayers;
							for(let j=0;j<waves.length;j++){
								let edges=waves[j];
								let str="",first=true;
								for(let k=0;k<edges.length;k++){
									if(!first)str+="\n";
									let s=edges[k][sourceName],t=edges[k][targetName];
									
									str+=s+" "+t+" "+vertexLayers[s]+" "+vertexLayers[t];
									//save the layers of the edge endpoints, for filtering based on layers too (and also to keep the layers when showing a wave, because decomposing a wave again does not yield the same layers)
									first=false;
								}
								saveStr(d.id,"layer",layer,f.split(".json.gz")[0]+"bcc"+i+"wave"+j,str);
							}
						}
						if(Object.keys(result).length>0){
							saveObj(d.id,"layer",layer,f.split(".json.gz")[0]+"BCCwaves",result);
							layerResult[ccID]=result;
						}
					}
					
				});
				if(Object.keys(layerResult).length>0){
					saveObj(d.id,"layer",layer,"BCCwaves",layerResult);
					topLevelResult[layer]=layerResult;
				}
			}
			saveObj(d.id,"BCCwaves",topLevelResult);
		},
		//note: the new C++ code loads fast enough to be called for each file, unlike the old python version.
	},
	
	//get subgraph types and metagraph summaries(like sizes)
	/*let subgraphs=[];
	fs.readdirSync(cacheDir+"/"+g.dataPath).forEach((f)=>{
		if(f=="metagraphs")return;
		let stats=fs.statSync(cacheDir+"/"+g.dataPath+"/"+f);
		if(stats.isDirectory()==false)return;
		subgraphs.push(f);
	});
	summary.subgraphs=subgraphs;
	let metagraphs=[];
	fs.readdirSync(cacheDir+"/"+g.dataPath+"/"+"metagraphs").forEach((f)=>{
		let stats=fs.statSync(cacheDir+"/"+g.dataPath+"/"+"metagraphs"+"/"+f);
		if(stats.isDirectory()==false)return;
		metagraphs.push(f);
	});
	summary.metagraphs=metagraphs;
	*/
	
	
	//let dirPath=cacheDir+"/"+Array.from(arguments).slice(0,arguments.length-1).join("/")+"/";
	//let dirPath=cacheDir+"/"+g.dataPath;//now all graph save/load uses the data path
	//if(!fs.existsSync(dirPath)){fs.mkdirSync(dirPath,511,true);}
	//the path is the datapath, a folder. and there's no file name
	//saveGzStr(dirPath,"graph",g.getGraphText());