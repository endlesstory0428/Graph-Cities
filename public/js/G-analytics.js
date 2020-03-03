G.newXRayWaves=true;
G.addModule("analytics",{
	init:function(){
		G.getDescription=this.getDescription.bind(this);
		/*d3.tsv("datasets/protein_hierarchy/microenvironments.tsv",(d)=>{
			let map={};this.datasetIDMaps.protein_hierarchy.extraLabelDataMap=map;
			for(let row of d){
				map[row["Microenvironment ID"]]=row;
			}
		});*/
	},

	
	loadGraph:function(graph){
		this.graph=graph;//todo: loaded data cache/list
		if(graph.isAbstract())return;
		//console.log("updating graph");
		let startTime=new Date().getTime();
		//now this only calculates graph-level analytics, not view-level stuff like clones
		this.applyTemplates(graph);
		//partitions and clones from vertex properties and edge properties
		/*
		for(let name in this.templates.vertices.properties){
			let templateObj=this.templates.vertices.properties[name];
			if((!templateObj.isPartition))continue;
			let array=graph.vertices[name];
			if(!array)continue;
			let result=this.getVertexPartition(graph,array);//{partitions:{1:{v:..,e:...}...},min:..,max:..,average:...,numValues:...}
			assignHiddenProperties(array,result);
		}
		for(let name in this.templates.edges.properties){
			let templateObj=this.templates.edges.properties[name];
			if((!templateObj.isPartition))continue;
			let array=graph.edges[name];
			if(!array)continue;
			let result=this.getEdgePartition(graph,array,templateObj.partitionDefaultValue);
			//{partitions:{1:{v:..,e:...}...},clones:[...],min:..,max:..,average:...,numValues:...}
			assignHiddenProperties(array,result);
		}
		*/
		let endTime=new Date().getTime();
		console.log("finished update in "+(endTime-startTime)+"ms");
	},
	
	templates:{ 
		vertices:{
			singularName:"vertex",
			properties:{
				metanodeSize:{
					value:(v,i,array)=>Math.max((array.V?(Math.log(array.V[i]+1)+0.3):1),(array.E?(Math.log(array.E[i]+1)+0.3):1)),
				},
				degree:{
					type:"int",value:(v,i,array)=>Object.keys(array.edges[i]).length,
				},
				wave:{
					type:"int",lazy:true,isPartition:true,isArray:true,
					value:(g)=>Algs.getVertexWavesAndLevels(g).vertexWaves,
				},
				waveLevel:{
					type:"int",lazy:true, //properties should auto create partition analytics like max, min, |V| and |E| inside each partition and between partitions
					isPartition:true,isArray:true,
					value:(g)=>Algs.getVertexWavesAndLevels(g).vertexLayers,
				},
				/*originalWaveLevel:{//todo:this is incorrect in some cases
					type:"int",lazy:true,isPartition:true,isArray:true,
					value:(g)=>{
						if(!g.edges.originalWaveLevel)return null;
						let levelIDs=g.edges.originalWaveLevel;
						let vertexLevelIDs=g.vertexPropertyFromEdgeProperty("originalWaveLevel");
						return vertexLevelIDs;
					},
				},*/
				fragment:{
					type:"int",lazy:true,isPartition:true,isArray:true,
				},
				cc:{
					type:"int",lazy:true, //properties should auto create partition analytics like max, min, |V| and |E| inside each partition and between partitions
					isPartition:true,isArray:true,
					value:(g)=>Algs.getCCIDs(g),
				},
				randomNumbers:{
					isArray:true,
					value:(g)=>g.vertices.map(Math.random),
				},
				userPinned:{lazy:true,value:function(){return false;}},

			},
			getDescription:(v,vertexID,vertices)=>{
				let t="";
				if ("V" in vertices){t+="|V|:"+vertices.V[vertexID]+", ";}
				if (vertices.E){t+="|E|:"+vertices.E[vertexID]+", ";}
				if (vertices.label){t+=vertices.label[vertexID];}
				t+="\n";
				t+=" Original ID "+vertices.id[vertexID];
				/*t+=" degree "+obj.degree+",";
				t+=" original degree "+v.degree+",";
				t+=" highest layer "+v.layer+",";
				t+=" belongs to "+v.layerCount+" layers,";
				t+=" diversity is "+v.diversity;
				if("ccID" in obj){t+=", CC ID "+obj.ccID;}
				if("ccSize" in obj){t+=", CC size "+obj.ccSize;}
				if("waveLayers" in obj){
					t+="wave layer vertex counts: "+obj.waveLayers.map((l)=>l.v).join(" ");
				}*/
				return t;
			},
		},
		edges:{
			properties:{
				fixedPointLayer:{
					type:"int",lazy:true,isPartition:true,partitionDefaultValue:0,isArray:true,
					value:(g)=>{
						//skip for single layer graphs
						if(g.partitionInfo&&g.partitionInfo[g.partitionInfo.length-1].type=="layer")return null;
						return Algs.getFixedPointLayers(g);
					},//return an array that maps edges to layers. edge partitions should automatically create clones?
				},
				wave:{
					type:"int",lazy:true,isPartition:true,partitionDefaultValue:0,isArray:true,
					value:(g)=>{
						if(!g.vertices.wave)return null;
						let waveIDs=g.vertices.wave;
						let edgeWaveIDs=g.edgePropertyFromVertexProperty("wave");
						return edgeWaveIDs;
					},//return an array that maps edges to waves
				},
				waveLevel:{
					type:"int",lazy:true,isPartition:true,partitionDefaultValue:0,isArray:true,
					value:(g)=>{
						if(!g.vertices.waveLevel)return null;
						let levelIDs=g.vertices.waveLevel;
						let edgeLevelIDs=g.edgePropertyFromVertexProperty("waveLevel");
						return edgeLevelIDs;
					},//return an array that maps edges to waves
				},
				originalWaveLevel:{
					type:"int",lazy:true,isPartition:true,partitionDefaultValue:0,isArray:true,
					value:(g)=>{
						if(!g.vertices.originalWaveLevel)return null;
						let levelIDs=g.vertices.originalWaveLevel;
						let edgeLevelIDs=g.edgePropertyFromVertexProperty("originalWaveLevel");
						return edgeLevelIDs;
					},//return an array that maps edges to waves
				},
				fragment:{
					type:"int",lazy:true,isPartition:true,partitionDefaultValue:0,isArray:true,
					/*value:(g)=>{
						if(!g.vertices.originalWaveLevel)return null;
						let levelIDs=g.vertices.originalWaveLevel;
						let edgeLevelIDs=g.edgePropertyFromVertexProperty("originalWaveLevel");
						return edgeLevelIDs;
					},//return an array that maps edges to waves
					*/
				},
			},
			getDescription:(e,eID,edges)=>{
				let t="",source=edges.source[eID],target=edges.target[eID]
				t+="Edge between "+source+" and "+target;
				if("weight" in e){t+=", weight: "+e.weight;}
				return t;
			},
			
		},
		waveSummary:{
			value:(graph)=>{
				//mainly for showing which levels are wave starts
				if(!graph.vertices.wave)return null;
				let levelWaves=[],levelStartsWave=[];
				for(let i=0;i<graph.vertices.length;i++){
					let wave=graph.vertices.wave[i],level=graph.vertices.waveLevel[i];
					levelWaves[level]=wave;
				}
				for(let l=0;l<levelWaves.length;l++){
					if(l==0){levelStartsWave[l]=true;continue;}
					if(levelWaves[l]>levelWaves[l-1])levelStartsWave[l]=true;
					else levelStartsWave[l]=false;
				}
				return {levelStartsWave:levelStartsWave};
			}
		},
		
//markers: extra data-like objects that can modify or add analytic properties, like sparsenet, highlights - like style modifiers
		selection:{
			value:(graph)=>{
				if(!graph.selectHistory){graph.selectHistory=[{}];graph.selectHistoryCurrentIndex=0;}
				if(!graph.selectedVertices){graph.selectedVertices={};graph.selectedVertexCount=0;graph.selectHistory=[{}];graph.selectHistoryCurrentIndex=0;}
			}
		},
		sparsenet:{},
		"|V|":{value:(g)=>{return (g.realVertexCount?g.realVertexCount:(g.vertexCount?g.vertexCount:(g.vertices?g.vertices.length:undefined)));}},
		"|E|":{value:(g)=>{return (g.realEdgeCount?g.realEdgeCount:(g.edgeCount?g.edgeCount:(g.edges?g.edges.length:undefined)));}},
		edgeProbability:{value:(g)=>{
			let n=g["|V|"],m=g["|E|"];
			return (n<2)?0:(m/(n*(n-1)/2));
		}},
		np:{value:(g)=>g["|V|"]*g.edgeProbability},
		npByLogn:{value:(g)=>g.np/Math.log(g["|V|"])},
		averageDegree:{value:(g)=>{
			let n=g["|V|"],m=g["|E|"];
			return (n<2)?0:(2*m/n);
		}},
		sparsity:{
			value:(g)=>{
				let v=g["|V|"],e=g["|E|"];
				return (v>2)?shortStr(Math.log(e/v,Math.log(v))):"N/A";
			}
		},

	},
	
	getGraphSummary:function(graph){
		if(!graph)graph=G.view.graph;//the one actually shown
		let desc="";
		if(graph.isMetagraph){
			desc="Metanodes: "+graph.vertices.length+", Metaedges: "+graph.edges.length;//+", Max layer:"+graph.maxLayer+", Layers: "+Object.keys(G.graph.layers).length;//??
		}
		else{
			let V=graph.vertices.length,E=graph.edges.length;
			let p=(E/(V*(V-1)/2)),k=Math.log(E/V)/Math.log(Math.log(V));
			desc="|V|: "+V+", |E|: "+E+", avg. degree: "+shortStr(2*E/V)+", density: "+shortStr(p)+", sparsity:"+shortStr(k);
			if(graph.heights){
				if(graph.heights.count>1){desc+=", heights: "+graph.heights.count;}
				if(graph.heights.max>0){desc+=", max height: "+graph.heights.max;}
			}
			//+(graph.showingInterlayers?"":(", peel value:"+graph.maxLayer));
			/*let layerCount=Object.keys(graph.layers).length;
			if(layerCount!=1){
				desc+=", Layers: "+layerCount+"\n";
			}*/
			/*if(graph.phases){
				let phaseCount=Object.keys(graph.phases).length;
				desc+=", Waves: "+phaseCount+"\n";
			}*/
			
			for(let name in G.analytics.templates.vertices.properties){
				if(!graph.vertices.properties[name])continue;
				if(graph.vertices.properties[name].isAbstract)continue;
				if(graph.vertices[name].max>1){desc+=", max "+toLowerCaseNormalText(name)+": "+graph.vertices[name].max;}
			}
			for(let name in G.analytics.templates.edges.properties){
				if(!graph.edges.properties[name])continue;
				if(graph.edges.properties[name].isAbstract)continue;
				if(graph.edges[name].max>1){desc+=", max "+toLowerCaseNormalText(name)+": "+graph.edges[name].max;}
			}
		}
		if(graph.partitionInfo){
			for(let item of graph.partitionInfo){
				desc+=", "+toNormalText(item.type)+" "+item.value+((item.graph==graph.datasetID)?"":(" of "+pathToText(item.graph)));
			}
		}
		return desc;
	},
	getDescription:function(result){
		//this description is based on an original data object in a subgraph?
		if(!result)return "";
		if(!result.originalObject)return "";
		if(this.templates[result.originalObjectType].getDescription)return this.templates[result.originalObjectType].getDescription(result.originalObject,result.originalObjectID);
		return toNormalText(result.originalObjectType)+" "+result.originalObjectID;
	},
	getVertexPartition:function(g,array){
		let partitions={};
		let max=-Infinity,min=Infinity,partitionCount=0;
		for(let vID=0;vID<g.vertices.length;vID++){
			let v=g.vertices[vID];
			let l=array[vID];
			if(l>max){max=l;}
			if(l<min){min=l;}
			if(!partitions[l]){partitionCount++;partitions[l]={v:0,e:0,metaedges:{}};};
			partitions[l].v++;
		}
		for(let eID=0;eID<g.edges.length;eID++){
			let e=g.edges[eID],sources=g.edges.source,targets=g.edges.target;
			let sID=sources[eID],tID=targets[eID];
			let sl=array[sID],tl=array[tID];
			if(sl==tl){
				partitions[sl].e++;
			}
			else{
				if((tl in partitions[sl].metaedges)==false){
					partitions[sl].metaedges[tl]=0;
					partitions[tl].metaedges[sl]=0;
				}
				partitions[sl].metaedges[tl]++;
				partitions[tl].metaedges[sl]++;
			}
		}
		return {partitions:partitions,partitionCount:partitionCount,max:max,min:min};
		
	},
	getEdgePartition:function(g,edgePartition,valueForIsolatedVertices){
		let sources=g.edges.source,targets=g.edges.target;
		let partitions={},partitionCount=0;//v,e counts
		let cloneMaps=new Array(g.vertices.length);
		let highestLayers=new Array(g.vertices.length);
		let edgeSources=new Array(g.edges.length);
		let edgeTargets=new Array(g.edges.length);
		let max=-Infinity,min=Infinity;
		for(let i=0;i<g.vertices.length;i++){cloneMaps[i]={};highestLayers[i]=null;}
		let clones=[];
		let cloneCount=0;
		for(let eID=0;eID<g.edges.length;eID++){
			let e=g.edges[eID],layer=edgePartition[eID];
			let sID=sources[eID],tID=targets[eID];
			if((sID in highestLayers==false)||(highestLayers[sID]<layer)){highestLayers[sID]=layer;}
			if((tID in highestLayers==false)||(highestLayers[tID]<layer)){highestLayers[tID]=layer;}
			let sCloneID,tCloneID;
			if((layer in partitions)==false){
				partitionCount++;
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
		let verticesWithClones=0;
		//if valueForIsolatedVertices is given, create clones for them too
		if(valueForIsolatedVertices!==undefined){
			for(let vID=0;vID<g.vertices.length;vID++){
				let count=Object.keys(cloneMaps[vID]).length;
				if(count==0){
					if((valueForIsolatedVertices in partitions)==false){
						partitionCount++;
						partitions[valueForIsolatedVertices]={v:0,e:0};
					}
					let cloneID=clones.length;
					cloneMaps[vID][valueForIsolatedVertices]=cloneID;
					cloneCount++;
					clones.push({original:vID,edges:{},value:valueForIsolatedVertices});
					partitions[valueForIsolatedVertices].v++;
				}
				if(count>1){verticesWithClones++;}
			}
		}
		return {cloneCount:cloneCount,cloneMaps:cloneMaps,clones:clones,verticesWithClones:verticesWithClones,edgeSources:edgeSources,edgeTargets:edgeTargets,partitions:partitions,partitionCount:partitionCount,max:max,min:min};
	},
	
	getVertexCCMetagraph(g,propertyName){
		if(!g)g=G.graph;
		let results=Algs.getVertexCCPartition(g,g.vertices[propertyName]);
		//metagraph,subgraphCCSummary,subgraphCCids,subgraphCCs,subgraphCCMetagraphs
		let metagraph=results.metagraph;
		if(g.colorScaleName){metagraph.colorScaleName=g.colorScaleName;}
		if(g.dataPath){
			metagraph.subgraphPrefix=g.dataPath+"/"+propertyName;
			metagraph.dataPath=g.dataPath+"/metagraphs/"+propertyName+"CC";
			metagraph.originalGraph=g.dataPath;
			metagraph.isMetagraph=true;
			metagraph.heightProperty="originalValue";
			G.saveGraph(metagraph);
			for(let subgraphID in results.subgraphCCs){
				let ccs=results.subgraphCCs[subgraphID];
				for(let ccID in ccs){
					let cc=ccs[ccID];
					if(cc.vertices.length==1)continue;//should skip these 1-vertex ccs because they are not expandable in the metagraph
					cc.dataPath=g.dataPath+"/"+propertyName+"/"+subgraphID+"/CC/"+ccID;
					G.saveGraph(cc);
				}
			}
		}
		Algs.getMetaedgeWeights(metagraph);
		return metagraph;
		
	},
	

	
	
	downloadVertexIDs:function(){
		downloadString(this.getVertexIDsString(),G.graph.name);
	},
	downloadImage:function(){
		downloadCanvas(G.renderer.domElement,G.graph.name);
	},
	getGraphVerticesAndEdges:function(g){
		if(!g)g=G.graph;
		if(!g){G.addLog("nothing to download");return;}
		return {vertices:this.getGraphVertices(g),edges:this.getGraphEdges(g)};
	},
	getGraphVertices:function(g){
		if(!g)g=G.graph;
		if(!g){G.addLog("nothing to download");return;}
		let text="";
		for(let i=0;i<g.vertices.length;i++){
			text+=i+"\n";
		}
		return text;
	},
	getGraphEdges:function(g,filter){
		if(!g)g=G.graph;
		if(!g){G.addLog("nothing to download");return;}
		var text="";let ss=g.edges.source,ts=g.edges.target;
		for(let i=0;i<g.edges.length;i++){
			if(filter){if(!filter(null,i,g.edges))continue;}
			text+=ss[i]+" "+ts[i]+"\n";
		}
		return text;
	},
	downloadGraphEdges: function(g,filter){
		if(!g)g=G.graph;
		downloadString(this.getGraphEdges(g,filter),g.name);
	},
	getVerticesByHeight:function(g){
		if(g.heightPropertyType!="edges"){G.addLog("error: there's no height information");return;}
		let heights={};
		let cloneMaps=g.edges[g.heightPropertyName].cloneMaps;
		let clones=g.edges[g.heightPropertyName].clones;
		for(let i=0;i<g.vertices.length;i++){
			for(let value in cloneMaps[i]){
				if(!heights[value]){heights[value]={v:[i],e:[]};}
				else{heights[value].v.push(i);}
				let cloneID=cloneMaps[i][value];
				for (let neighbor in clones[cloneID].edges){
					let originaNeighbor=clones[neighbor].original;
					if(originaNeighbor>i){
						//if(heights[value].e.length==0){heights[value].e="("+i+","+originaNeighbor+")";}
						//else{heights[value].e+=" ("+i+","+originaNeighbor+")";}
					}
				}
			}
		}
		let heightValues=Object.keys(heights).sort(compareBy((x)=>Number(x),true));
		let verticesByHeight=heightValues.map((value)=>heights[value].v);
		return verticesByHeight;
	},
	
	getRegionGraph:function(graph,options){
		let result=G.analytics.getVerticesByHeight(graph);
		let g2=Algs.getRegionGraph(result,options);
		g2.dataPath=graph.dataPath+"/metagraphs/regionGraph";
		g2.originalGraph=graph.dataPath;
		g2.datasetID=graph.datasetID;
		if(!G.loading.graphsCache[graph.dataPath])G.loading.saveGraph(graph);
		G.loading.saveGraph(g2);
		if(!graph.metagraphs){graph.metagraphs={};}
		graph.metagraphs.regionGraph={V:g2.vertices.length,E:g2.edges.length};
		return g2;
	},

	
	computeXRay:function (g){
		if(!g)g=G.graph;let vs = g.vertices, es = g.edges;
		let degrees=vs.degree,tempDegrees=[],tempDegrees2=[];//degree is created in preprocessing
		let firstSeen=[];
		
		let startTime=new Date().getTime();
		
		for (let i=0;i<vs.length;i++) {
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
		let markers=[],minDegree=tempDegrees[sortedVertexIndex[0]],marker=g.vertices.length-1;
		let markerIsEndOfPhase={};
		let markerMinDegrees=[];
		for (let i=0;i<g.vertexCount;i++) {
			let vID=sortedVertexIndex[i];
			let d=tempDegrees[vID];
			if(d>minDegree){marker=i-1;break;}
		}
		markers.push(marker);//if it's the last position it's OK
		markerMinDegrees.push(minDegree);
		
		for (let i=0;i<g.vertices.length;i++) {
			let vID=sortedVertexIndex[i];
			let d=tempDegrees[vID];
			let v=vs[vID];
			if(i>marker){
				let markerFound=false;
				if(G.newXRayWaves){
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
					for (j=i;j<g.vertices.length;j++) {
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
			for(let uID in g.vertices.edges[vID]){
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
		let phaseID=0;
		for (let i=0;i<vs.length;i++) {
			let vID=sortedVertexIndex[i];
			let v=vs[vID];let d=tempDegrees[vID];
			
			if(i>currentMarker){
				
				layerSummary.push({layer:markerID,currentDegree:currentDegree,v:layerVertexCount,e:edgeCount,prevNeighborCount:Object.keys(prevNeighbors).length,forwardEdges:forwardEdgeCount,forwardEdgeDetails:forwardEdgeDetails,layerMinDegree:layerMinDegree,isEndOfPhase:markerIsEndOfPhase[markerID],phase:phaseID});
				if(markerIsEndOfPhase[markerID])phaseID++;
				prevNeighbors=forwardNeighbors;forwardNeighbors={};
				currentDegree=d;layerVertexCount=0;edgeCount=0;forwardEdgeCount=0,forwardEdgeDetails={};
				prevMarker=currentMarker;markerID++;currentMarker=markers[markerID];layerMinDegree=markerMinDegrees[markerID];//the last one is always the last position 
			}
			
			layerVertexCount++;
			for(let uID in g.vertices.edges[vID]){
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
			layerSummary.push({layer:markerID,currentDegree:currentDegree,v:layerVertexCount,e:edgeCount,prevNeighborCount:Object.keys(prevNeighbors).length,forwardEdges:forwardEdgeCount,forwardEdgeDetails:forwardEdgeDetails,layerMinDegree:layerMinDegree,isEndOfPhase:markerIsEndOfPhase[markerID],phase:phaseID});
		}
		
		let waves=[];let newWave={originalWave:0,firstLayer:0,isMetanode:true,"|V|":0,vertexCount:0,edges:{},waveLayers:[]};
		let waveMap={};let waveEdges=[];
		for(let i=0;i<layerSummary.length;i++){
			let l=layerSummary[i];
			//{currentDegree:currentDegree,v:layerVertexCount,e:edgeCount,prevNeighborCount:Object.keys(prevNeighbors).length,forwardEdges:forwardEdgeCount,forwardEdgeDetails:forwardEdgeDetails,layerMinDegree:layerMinDegree,isEndOfPhase:markerIsEndOfPhase[markerID]}
			waveMap[i]=waves.length;
			newWave["|V|"]+=l.v;
			newWave.waveLayers.push(l);
			l.wave=waves.length;
			if(l.isEndOfPhase){
				newWave.lastLayer=i;waves.push(newWave);newWave={originalWave:waves.length,firstLayer:i+1,isMetanode:true,"|V|":0,vertexCount:0,edges:{},waveLayers:[]};
			}
		}
		waves.push(newWave);newWave.lastLayer=layerSummary.length-1;//last wave
		
		for(let i=0;i<layerSummary.length;i++){
			let l=layerSummary[i];let thisWave=waveMap[i];
			for(let otherLayer in l.forwardEdgeDetails){
				let otherWave=waveMap[otherLayer];
				if(otherWave!=thisWave){
					if((thisWave in waves[otherWave].edges)==false){let e={s:thisWave,t:otherWave,edgeCount:0};waves[otherWave].edges[thisWave]=waveEdges.length;waves[thisWave].edges[otherWave]=waveEdges.length;waveEdges.push(e);}
					waves[otherWave].edges[thisWave].edgeCount+=l.forwardEdgeDetails[otherLayer];
				}
			}
		}

		let endTime=new Date().getTime();
		//console.log(g.name+": decomposed interlayers in "+(endTime-startTime)+"ms, layers are "+JSON.stringify(layerSummary)+", markers are "+JSON.stringify(markers));
		
		return {tempDegrees:tempDegrees,
		sortedVertexIndex:sortedVertexIndex,
		markers:markers,
		positions:positions,
		vertexLayers:vertexLayers,
		layerSummary:layerSummary,
		firstSeen:firstSeen,
		waves:waves,
		waveMap:waveMap,
		waveEdges:waveEdges,
		
		};
	},
	computeIterativeWaveEdgeDecomposition:function(g){//I'd like to be able to reuse any vertex decomposition as a parameter, but how to signal that certain edges are removed?
		if(!g)return;
		let startTime=new Date().getTime();
		var vs = g.vertices;
		var es = g.edges;
		let degrees=[],remainingDegrees=[],tempDegrees=[],tempDegrees2=[];
		let remainingEdges=es.length,edgeLayers=new Array(es.length);
		
		
		let firstSeen=[];let waveCount=0;
		
		for (let i=0;i<vs.length;i++) {
			degrees[i]=Object.keys(g.vertices.edges[i]).length;
			remainingDegrees[i]=degrees[i];
			tempDegrees[i]=degrees[i];
			tempDegrees2[i]=degrees[i];
			firstSeen[i]=-1;
		}
		
		while(remainingEdges>0){
			let degreeCounts=[],maxDegree=0;
			for (let i=0;i<vs.length;i++) {
				tempDegrees[i]=remainingDegrees[i];
				tempDegrees2[i]=remainingDegrees[i];
			}
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
			let markers=[],minDegree=tempDegrees[sortedVertexIndex[0]],marker=g.vertices.length-1;
			let markerIsEndOfPhase={};
			let markerMinDegrees=[];
			for (let i=0;i<g.vertices.length;i++) {
				let vID=sortedVertexIndex[i];
				let d=tempDegrees[vID];
				if(d>minDegree){marker=i-1;break;}
			}
			markers.push(marker);//if it's the last position it's OK
			markerMinDegrees.push(minDegree);
			
			for (let i=0;i<g.vertices.length;i++) {
				let vID=sortedVertexIndex[i];
				let d=tempDegrees[vID];
				let v=vs[vID];
				if(i>marker){
					let markerFound=false;
					if(G.newXRayWaves){
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
						for (j=i;j<g.vertices.length;j++) {
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
				for(let uID in g.vertices.edges[vID]){
					let eID=g.vertices.edges[vID][uID];
					if(eID in edgeLayers)continue;
					
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
						tempDegrees[uID]--;if(tempDegrees[uID]<0)throw Error();
						tempDegrees2[uID]--;if(tempDegrees2[uID]<0)throw Error();
						if(firstSeen[uID]==-1){firstSeen[uID]=markers.length;}//k+1
					}
					else{
						//also decrease tempdegree for neighbors in the same bin but beyond the current marker, but don't change its position.
						//tempDegrees correspond to the bin and I can't change it in any oeher way
						if((tempDegrees[uID]==tempDegrees[vID])&&(positionU>marker)){
							tempDegrees2[uID]--;if(tempDegrees2[uID]<0)throw Error();
						}
					}
					
				}
			}
			//find last wave
			let prevMarkerID=-1;
			for(let i=0;i<markers.length;i++){
				if(markerIsEndOfPhase[i])prevMarkerID=i;
			}
			let lastWaveStartPos=(prevMarkerID==-1)?0:(markers[prevMarkerID]+1);//markers mark the end of layers
			
			//mark last wave edges (all edges between these vertices)
			for (let i=lastWaveStartPos;i<vs.length;i++) {
				let vID=sortedVertexIndex[i];
				let v=vs[vID];let d=tempDegrees[vID];
				
				for(let uID in g.vertices.edges[vID]){
					let u=vs[uID];let du=tempDegrees[uID],posu=positions[uID];
					let eID=g.vertices.edges[vID][uID];
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
	
	computeWaveEdgeDecomposition2:function (g){
		
		let edgeLayers=this.computeIterativeWaveEdgeDecomposition(g);
		let vs=g.vertices,es=g.edges;
		let newVs=[],newEs=[],result={vertices:newVs,edges:newEs};
		for (let i=0;i<vs.length;i++) {
			newVs.push({});
		}
		for (let i=0;i<es.length;i++) {
			let e=es[i];
			newEs.push({s:e.source.original,t:e.target.original,l:edgeLayers[i]});
		}
		result.parent=g;
		result.name="wave edge decomposition";
		result.shortName="wave edge decomposition";
		result.layerHeightOption="linear";
		return result;
	},
	
	getInterlayers:function(){
		//refresh teh filters
		G.ILFilterStart=0;
		G.ILFilterEnd=1;
		let g=G.graph,vs=g.vertices,es=g.edges;
		
		let resultObj=this.computeXRay(g);
		let tempDegrees=resultObj.tempDegrees;
		let sortedVertexIndex=resultObj.sortedVertexIndex;
		let markers=resultObj.markers;
		let positions=resultObj.positions;
		let vertexLayers=resultObj.vertexLayers;
		let firstSeen=resultObj.firstSeen;
		let layerSummary=resultObj.layerSummary;
		
		//need the correct layer(wave) for each vertex, to force their clones to that layer
		let currentDegree=tempDegrees[sortedVertexIndex[0]],layerVertexCount=0,edgeCount=0,forwardEdgeCount=0,forwardEdgeDetails={};
		let markerID=0,currentMarker=markers[0],prevMarker=-1;//for detecting edges within teh current layer
		let phaseStartMarkerID=markerID;let phaseID=0;
		let layers={};let newVs=[],newEs=[];
		for (let i=0;i<vs.length;i++) {
			let vID=sortedVertexIndex[i];
			let v=vs[vID];let d=tempDegrees[vID];
			
			if(i>currentMarker){
				prevMarker=currentMarker;markerID++;currentMarker=markers[markerID];//the last one is always the last position 
				if(layerSummary[markerID-1].isEndOfPhase){
					phaseStartMarkerID=markerID;phaseID++;
				}
			}
			if(!layers[markerID]){layers[markerID]={v:0,e:0,nodes:[],links:[]};};
			layers[markerID].v++;
			v.newID=newVs.length;
			v.newLayer=markerID;//debug
			let newV={id:v.id,oldIndex:vID,layer:markerID};
			if(firstSeen[vID]!=-1){newV.firstSeenLayer=firstSeen[vID];}
			newV.phaseLayer=phaseStartMarkerID;
			if(phaseStartMarkerID==markerID){newV.isStartOfPhase=true;}
			newV.phase=phaseID;
			newVs.push(newV);
		}
	
		for(let e of es){
			let vID=e.source.original,uID=e.target.original;
			let v=vs[vID];let d=tempDegrees[vID];
			let thisLayer=vertexLayers[vID];
			let u=vs[uID];let du=tempDegrees[uID],posu=positions[uID];
			let otherLayer=vertexLayers[uID];
			e.newID=newEs.length;
			newEs.push({s:v.newID,t:u.newID,l:Math.min(otherLayer,thisLayer)});
			if(Number.isNaN(Math.min(otherLayer,thisLayer)))throw Error();
			if(otherLayer==thisLayer){layers[otherLayer].e++;}
		}
		//find exit of phase vertices
		for(let v of vs){
			let newV=newVs[v.newID];
			for(let neighbor in v.edges){
				let newNeighbor=newVs[vs[neighbor].newID];
				if(newV.phase==newNeighbor.phase-1){newV.isExitOfPhase=true;}
			}
		}
		//debug
		let missing=[];
		for(let e of es){
			if("newID" in e ==false){missing.push(e);}
		}
		if(missing.length>0){console.log("missing edge");console.log(missing);}
		let extraEdges=[];
		for(let e of newEs){
			let oldVindex=newVs[e.s].oldIndex,oldUindex=newVs[e.t].oldIndex;
			if(oldUindex in vs.edges[oldVindex]==false){extraEdges.push(e);}
		}
		if(extraEdges.length>0){console.log("extra edges");console.log(extraEdges);}
		
		
		let interlayerGraph={};
		interlayerGraph.name=g.name+" wave levels";
		interlayerGraph.vertices=newVs,interlayerGraph.edges=newEs;
		//interlayerGraph.layers=layers;
		interlayerGraph.showingInterlayers=true;
		interlayerGraph.display="interlayers";
		interlayerGraph.maxPhase=phaseID;
		interlayerGraph.vertexCount=interlayerGraph.vertices.length;
		interlayerGraph.edgeCount=interlayerGraph.edges.length;
		interlayerGraph.parent=g;
		interlayerGraph.noCloneVertices=true;
		interlayerGraph.layerSummary=layerSummary;
		interlayerGraph.shortName="wave levels";
		G.load(interlayerGraph);
	},
	
	getWaveEdgeDecomposition:function(g){
		if(!g)g=G.view.graph;
		g.heightProperty="wave";
		g.heightPropertyTypeHint="edges";
		g.layerHeightOption="linear";
		G.load(g);
		return g;
	},
	getLevelEdgeDecomposition:function(g){
		if(!g)g=G.view.graph;
		g.heightProperty="originalWaveLevel";
		g.heightPropertyTypeHint="edges";
		g.layerHeightOption="linear";
		G.load(g);
		return g;
	},
	
	getWavesMetagraph:function(graph){
		if(!graph)graph=G.graph;
		let result=G.analytics.computeXRay(graph);
		let vertexLayers=result.vertexLayers;
		let layerSummary=result.layerSummary;
		let waves=result.waves;
		let waveEdges=result.waveEdges;
		for(let w of waves){
			w.layer=w.originalWave;
		}
		for(let me of waveEdges){
			let wave1=waves[me.s],wave2=waves[me.t];
			let density=me.edgeCount/(wave1["|V|"]*wave2["|V|"]);
			me.w=density;me.direction=(wave1.originalWave<wave2.originalWave)?(-1):(1);//-1 means the arrow points from the source to the target? //"wave" is already being used by the decomposition algorithm
		}
		
			
		let metagraph={vertices:waves,edges:waveEdges,heightProperty:"originalWave",isMetagraph:true,name:graph.name+" waves metagraph"};
		metagraph.parent=graph;metagraph.shortName="waves metagraph";
		metagraph.expandVertex=function(waveNode){
			let waveVertex=metagraph.vertices.filter((d)=>(d.firstLayer==waveNode.firstLayer))[0];
			let firstLayer=waveVertex.firstLayer,lastLayer=waveVertex.lastLayer;
			let newGraph={noCloneVertices:true,ccCounted:true,shortName:"wave "+waveNode.index,name:metagraph.name+" wave "+waveNode.index};
			let vMap={},vlist=[],vCount=0;
															
			newGraph.vertices=graph.vertices.filter((v,i)=>{if((vertexLayers[i]>=firstLayer)&&(vertexLayers[i]<=lastLayer)){vMap[i]=vCount;vCount++;return true;}}).map((v,i)=>{return {}});//layer:vertexLayers[vMap]
			if(newGraph.vertices.length>25000){G.addLog("Cannot show large level of "+newGraph.vertices.length+" vertices");return;}
			newGraph.edges=[];
			graph.edges.forEach((e,i,array)=>{	
			let sID=array.source[i],tID=array.target[i];
				let sl=vertexLayers[sID],tl=vertexLayers[tID];
				if((sl>=firstLayer)&&(sl<=lastLayer)&&(tl>=firstLayer)&&(tl<=lastLayer)){
					newGraph.edges.push({s:vMap[sID],t:vMap[tID],l:Math.min(sl,tl)});
				}
			});
			return newGraph;
		}
		return metagraph;
	},
	
	DFSHelper:function DFSHelper(graph,vID,ccID,ccIDs,partition){//partition is an array (mapping from vertices to some value), and it will only go to neighbors with the same value
		if(vID in ccIDs){throw Error();}
		let stack=[],cc=[];
		stack.push(vID);let partitionID;
		if(partition)partitionID=partition[vID];
		ccIDs[vID]=-1;//temp value means it's pushed to the stack but not popped yet 
		
		let edgeCount=0;
		while(stack.length>0){
			let newNodeID=stack.pop();
			ccIDs[newNodeID]=ccID;
			cc.push(newNodeID);
			let newNode=graph.vertices[newNodeID],nodeEdges=graph.vertices.edges[newNodeID];
			for(let neighborID in nodeEdges){
				
				if(neighborID in ccIDs){
					if(ccIDs[neighborID]==-1){
						edgeCount++;
					}
					continue;
				}
				if(partition&&(partition[neighborID]!=partitionID))continue;
				edgeCount++;
				ccIDs[neighborID]=-1;
				stack.push(Number(neighborID));
			}
		}
		cc.edgeCount=edgeCount;
		return cc;
	},
	DFSHelper2:function DFSHelper2(clones,cloneID,ccID,ccIDs,edgePartition){//edge partition version
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
			for(let neighborID in newNode.edges){
				if(edgePartition){
					let value=edgePartition[newNode.edges[neighborID]];
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
	},
	getWavesCCMetagraph:function(graph){
		if(!graph)graph=G.graph;
		let result=G.analytics.computeXRay(graph);
		let layerSummary=result.layerSummary;
		let vertexLevels=result.vertexLayers;
		let waveMap=result.waveMap;
		let vertexWaves=new Array(graph.vertices.length);
		for(let i=0;i<vertexLevels.length;i++){
			vertexWaves[i]=waveMap[vertexLevels[i]];
		}

		let ccIDs=new Array(graph.vertices.length);
		
		let waveCCs=[],waveCCEdges=[];
		
		for(let vID=0;vID<graph.vertices.length;vID++){
			let waveID=vertexWaves[vID];
			if(vID in ccIDs)continue;
			let ccID=waveCCs.length;
			let cc=this.DFSHelper(graph,vID,ccID,ccIDs,vertexWaves);
			let size=cc.length,edgeCount=cc.edgeCount;
			waveCCs.push({layer:waveID,originalWave:waveID,"|V|":size,"|E|":edgeCount,edges:{}});
		}
		
		for(let vID=0;vID<graph.vertices.length;vID++){
			let v=graph.vertices[vID],vEdges=graph.vertices.edges[vID];
			let vCC=ccIDs[vID];
			let waveCCObj=waveCCs[vCC];
			for(let neighborID in vEdges){
				let neighborCC=ccIDs[neighborID];
				let neighborCCObj=waveCCs[neighborCC];
				if(neighborCC==vCC){
					continue;
				}
				if(!waveCCObj.edges[neighborCC]){
					let eObj={s:vCC,t:neighborCC,edgeCount:0};
					waveCCObj.edges[neighborCC]=waveCCEdges.length;
					neighborCCObj.edges[vCC]=waveCCEdges.length;
					waveCCEdges.push(eObj);
				}
				waveCCEdges[waveCCObj.edges[neighborCC]].edgeCount++;
			}
		}
		for(let me of waveCCEdges){
			let cc1=waveCCs[me.s],cc2=waveCCs[me.t];
			let density=me.edgeCount/(cc1["|V|"]*cc2["|V|"]);
			me.w=density;me.direction=(cc1.originalWave<cc2.originalWave)?(-1):(1);//-1 means the arrow points from the source to the target?
		}
		
		let metagraph={vertices:waveCCs,edges:waveCCEdges,noCloneVertices:true,ccCounted:true,isMetagraph:true,heightProperty:"originalWave",layerHeightOption:"linear",name:graph.name+" waves CC metagraph",shortName:"waves CC metagraph"};
		metagraph.parent=graph;
		if(graph.dataPath)metagraph.dataPath=graph.dataPath+"/wavesCCmetagraph";
		metagraph.expandVertex=function(waveCCVertex){
			let waveCC=waveCCVertex.index;
			let newGraph={noCloneVertices:true,ccCounted:true,shortName:"wave "+waveCCVertex.originalWave+" CC "+waveCC,name:graph.name+" wave "+waveCCVertex.originalWave+" CC "+waveCC};
			let vMap={},vlist=[],vCount=0;
							
			newGraph.vertices=graph.vertices.filter((v,i)=>{if(ccIDs[i]==waveCC){vMap[i]=vCount;vCount++;return true;}}).map((v,i)=>{return {}});//must not reuse vertices from another graph because it messes with indices
			if(newGraph.vertices.length>25000){G.addLog("Cannot show large wave CC of "+newGraph.vertices.length+" vertices");return;}
			newGraph.edges=[];
			graph.edges.forEach((e,i,array)=>{	
				let sID=array.source[i],tID=array.target[i];
				let scc=ccIDs[sID],tcc=ccIDs[tID];
				if(scc==waveCC&&tcc==waveCC){
					newGraph.edges.push({source:vMap[sID],target:vMap[tID]});
				}
			});
			if(metagraph.dataPath){newGraph.dataPath=metagraph.dataPath+"/wave"+waveCCVertex.originalWave+"_CC"+waveCC;}
			return newGraph;
		}
		
		return metagraph;
		
	},
	getFixedPointLayers(graph){//backwards peeling gives every edge a layer. this code is almost the same as on the client.
		let vs = graph.vertices,es = graph.edges;
		let vertexCount=vs.length,edgeCount=es.length;
		let degrees=vs.degree,remainingDegrees=[],tempDegrees=[],edgeLayers=[];
		let layerlist=[];this.layerlist=layerlist;
		let startTime=new Date().getTime();
		//console.log(this.name+": calculating layers");
		//if(this.edgeCount>100000){console.log(this.name+": calculating layers");}
		
		for (let i=0;i<vs.length;i++) {
			remainingDegrees[i]=degrees[i];
		}
		for (let i=0;i<es.length;i++) {
			edgeLayers[i]=null;
		}
		var remainingEdges=graph.edges.length;var done,peeled,minDegree;var peelValues;var degreeDone;
		let percentage=0,lastPercentage=0,increment=(edgeCount>1000000)?5:20;
		while(remainingEdges>0){//each iteration removes one layer of edges
			if(edgeCount>100){//show progress for bigger graphs
				let edgesPeeled=edgeCount-remainingEdges;
				percentage=edgesPeeled/edgeCount*100;
				let incremented=false;
				while(percentage>lastPercentage+increment){lastPercentage+=increment;incremented=true;}
				if(incremented)console.log(graph.name+" edges peeled "+Math.floor(percentage)+"%");
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
			for (let i=0;i<vertexCount;i++) {
				let vID=sortedVertexIndex[i];
				let v=vs[vID];
				for(let uID in vs.edges[vID]){
					if(edgeLayers[vs.edges[vID][uID]]!==null)continue;
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
				if(binStarts[i]!=vertexCount){coreDegree=i;break;}
			}
			//update
			console.log("found layer "+coreDegree);
			layerlist.push(coreDegree);
			for(let i=binStarts[coreDegree];i<vertexCount;i++){//mark edges only
				let v=sortedVertexIndex[i];
				for(let u in vs.edges[v]){
					if(tempDegrees[u]==coreDegree){
						let eID=vs.edges[v][u],e=es[eID];if(edgeLayers[eID]!==null){continue;}
						edgeLayers[eID]=coreDegree;remainingEdges--;
						if(coreDegree==0){console.log("Error: peeling min degree 0 at edge "+v+","+u);throw Error(tempDegrees);}
						remainingDegrees[v]--;remainingDegrees[u]--;
					}
				}
			}
			if(edgeCount>100000)console.log("marked edges in layer "+coreDegree);
		}
		//for (let i=0;i<es.length;i++) {es[i][layerName]=edgeLayers[i];}
		let endTime=new Date().getTime();
		console.log(graph.name+": calculated layers in "+(endTime-startTime)+"ms");
		return edgeLayers;
		
	},
	
	getWaveMapRings:function(graph){
		if("waveLevel" in graph.vertices==false){console.log("missing wave data");return;}
		//graph=G.loading.load(graph);
		//let metagraph=G.loading.load(graph.dataPath+"/metagraphs/waveCC");
		let waveLevels=graph.vertices.waveLevel;
		let waveIDs=graph.vertices.wave;
		let waveCCids=graph.vertices.waveCCid;
		let waveMap=[];let arcs=[];
		for(let vID=0;vID<graph.vertices.length;vID++){
			let waveID=waveIDs[vID];let waveCCid=waveCCids[vID];let waveLevel=waveLevels[vID];
			if(!waveMap[waveID])waveMap[waveID]={};//indexed by waveCCID
			let waveObj=waveMap[waveID];
			if(!waveObj[waveCCid])waveObj[waveCCid]={};//indexed by wave level??
			if(!waveObj[waveCCid][waveLevel])waveObj[waveCCid][waveLevel]=0;
			//waveObj[waveCCid][waveLevel]++;//count vertices
			for(let neighbor of graph.getNeighbors(vID)){
				let otherWave=waveIDs[neighbor],otherLevel=waveLevels[neighbor];
				if(otherLevel>waveLevel){waveObj[waveCCid][waveLevel]++;}//count forward and internal edges
				if(otherLevel==waveLevel&&neighbor>vID){waveObj[waveCCid][waveLevel]++;}
			}
			
		}
		let maxWave=Math.max(...Object.keys(waveMap).map((x)=>Number(x)));
		
		//for all wave CCs, count how many levels it spans
		for(let waveID in waveMap){
			let waveObj=waveMap[waveID];
			let waveSize=0;
			let waveCCCount=0;
			for(let waveCCid in waveObj){
				waveCCCount++;
				for(let waveLevel in waveObj[waveCCid]){waveSize+=waveObj[waveCCid][waveLevel];}
			}
			for(let waveCCid in waveObj){
				let CCSize=0;let levelCount=Object.keys(waveObj[waveCCid]).length;
				for(let waveLevel in waveObj[waveCCid]){CCSize+=waveObj[waveCCid][waveLevel];}
				arcs.push({wave:Number(waveID),reverseWave:maxWave-Number(waveID),ccid:Number(waveCCid),ratio:CCSize/waveSize,CCSize:CCSize,waveSize:waveSize,waveCCCount:waveCCCount,levelCount:levelCount,levelMap:waveObj[waveCCid]});
			}
		}
		let maxLevelCount=Math.max(...arcs.map((x)=>x.levelCount));
		for(let arc of arcs)arc.maxLevelCount=maxLevelCount;
		
		
		//get radius, thickness, centerAngle, angleWidth
		
		let waveCount=arcs[0].reverseWave+1;
		let maxRadius=150,centerRadius=20;
		let radiusDelta=Math.min(20,(maxRadius-centerRadius)/(arcs[0].reverseWave+1));
		let startDegree=-Math.PI/2;
		let currentWave=-1,degree=startDegree;
		for(let arc of arcs){
			if(arc.wave>currentWave){currentWave=arc.wave;degree=startDegree;}
			let realRadius=arc.reverseWave*radiusDelta+centerRadius;
			let totalDegree=Math.PI*2,gapDegree=0;
			if(arc.reverseWave!=0||arc.ratio!=1){gapDegree=Math.min(3*arc.waveCCCount/realRadius,Math.PI/2);totalDegree-=gapDegree;}
			else{
				degree=0;//seems this is needed to make it draw a full circle
			}
			let degreeDelta=totalDegree*arc.ratio;
			let endDegree=degree+degreeDelta;
			if(degreeDelta==Math.PI*2){degreeDelta*=0.99;}//seems this is needed to make it draw a full circle
			let x1=realRadius*Math.cos(degree),y1=realRadius*Math.sin(degree),x2=realRadius*Math.cos(endDegree),y2=realRadius*Math.sin(endDegree);
			arc.height=arc.wave;///waveCount;
			arc.radius=realRadius;
			arc.startDegree=degree;arc.endDegree=endDegree;
			arc.angleWidth=degreeDelta/2;
			arc.centerAngle=(degree+endDegree)/2;
			arc.color=new THREE.Color();arc.color.setStyle(G.colorScales.blackRed(arc.wave/waveCount));
			arc.thickness=Math.max(1.5,Math.min(1+(arc.levelCount-1)*2,(arc.levelCount/arc.maxLevelCount)*radiusDelta*0.9));
			//arc.str="M "+x1+" "+y1+" "+"A "+realRadius+" "+realRadius+" "+"0 "+((degreeDelta>Math.PI)?"1":"0") +" 1 "+x2+" "+y2;
			//seems sweep needs to be 1 here
			degree+=degreeDelta+gapDegree/arc.waveCCCount;
		}
		//let path=g.selectAll("path").data(arcs).enter().append("path").attr("d",(d)=>d.str).attr("stroke",(d)=>colorScale(d.wave/waveCount)).attr("fill","none").attr("stroke-width",(d)=>Math.max(1.5,Math.min(1+(d.levelCount-1)*2,(d.levelCount/d.maxLevelCount)*radiusDelta*0.9)));
		//selectE("wavemap-menu").style("display","block");
		graph.arcs=arcs;
		return arcs;
		
	},
	
	getLayerCCMetagraph:function(graph){
		if(!graph)graph=G.graph;
		let edgeLayers=graph.edges.fixedPointLayer;//this.getFixedPointLayers(graph);
		let clones=edgeLayers.clones;
		let cloneCount=clones.length;
		let cloneMaps=edgeLayers.cloneMaps;
		let ccIDs=new Array(cloneCount);
		
		let layerCCs=[],layerCCEdges=[];
		
		for(let nodeID=0;nodeID<clones.length;nodeID++){
			//skip isolated vertices??
			let node=clones[nodeID];
			if(nodeID in ccIDs)continue;
			let layer=node.value;
			let ccID=layerCCs.length;
			let cc=this.DFSHelper2(clones,nodeID,ccID,ccIDs,edgeLayers);
			let size=cc.length,edgeCount=cc.edgeCount;
			layerCCs.push({layer:layer,originalFixedPointLayer:layer,"|V|":size,"|E|":edgeCount,edges:{}});
		}
		
		for(let vID=0;vID<graph.vertices.length;vID++){
			let v=graph.vertices[vID];
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
		
		let metagraph={vertices:layerCCs,edges:layerCCEdges,noCloneVertices:true,ccCounted:true,isMetagraph:true,layerHeightOption:"linear",name:graph.name+" layer CC metagraph",shortName:"layer CC metagraph"};
		metagraph.parent=graph;
		if(graph.dataPath)metagraph.dataPath=graph.dataPath+"/layerCCmetagraph";
		metagraph.heightProperty="originalFixedPointLayer";
		metagraph.expandVertex=function(layerCCVertex){
			let ccID=layerCCVertex.index;
			let layer=layerCCVertex.layer;
			let newGraph={noCloneVertices:true,ccCounted:true,shortName:"layer "+layerCCVertex.layer+" CC "+ccID,name:graph.name+" layer "+layerCCVertex.layer+" CC "+ccID};
			let vMap={},vlist=[],vCount=0;
							
			newGraph.vertices=graph.vertices.filter((v,i)=>{
				let cloneID=cloneMaps[i][layer];
				if(ccIDs[cloneID]==ccID){vMap[i]=vCount;vCount++;return true;}
			}).map((v,i)=>{return {}});//must not reuse vertices from another graph because it messes with indices
			if(newGraph.vertices.length>25000){G.addLog("Cannot show large wave CC of "+newGraph.vertices.length+" vertices");return;}
			newGraph.edges=[];
			graph.edges.forEach((e,i,array)=>{
				let sID=array.source[i],tID=array.target[i];
				let sCloneID=cloneMaps[sID][layer];
				let tCloneID=cloneMaps[tID][layer];
				let scc=ccIDs[sCloneID],tcc=ccIDs[tCloneID];
				if(scc==ccID&&tcc==ccID){
					newGraph.edges.push({s:vMap[sID],t:vMap[tID],l:layer});
				}
			});
			if(metagraph.dataPath){newGraph.dataPath=metagraph.dataPath+"/layer"+layer+"_CC"+ccID;}
			return newGraph;
		}
		
		return metagraph;
		
	},
	showXRay:function(){
		function scaleDensityValue(density){return (density==0)?0:(0.8*density+0.15);}
		function getRGBFromDensity(density){let value=scaleDensityValue(density)*255;return "rgb("+value+","+value+","+value+")";}
		function getRGBAFromDensity(density){
			//let value=scaleDensityValue(density)*255;
			let value=128;
			return "rgba("+value+","+value+","+value+","+scaleDensityValue(density)+")";
		}
		let g=G.graph;
		let layerSummary=g.layerSummary;
		if(!g.layerSummary){
			layerSummary=this.computeXRay(g).layerSummary;
			g.layerSummary=layerSummary;
		}
		
		let s=d3.select("#X-ray-menu"),menuElem=s.node();
		s.style("display","block");
		let width=getE("X-ray-menu-content").clientWidth;//menuElem.clientWidth;//use the contents, not the whole dialog's width
		let maxVCount=Math.max.apply(null,layerSummary.map((r)=>r.v));
		let maxExtraVCount=Math.max.apply(null,layerSummary.map((r)=>Math.max(r.prevNeighborCount,r.v)));
		if(G.showXRayConsumedPercentage){
			maxVCount=maxExtraVCount;
		}
		let logOffset=0.5;
		for(i=0;i<layerSummary.length;i++){
			let l=layerSummary[i];
			l.index=i;
			l.widthRatio=Math.log(l.v+logOffset)/Math.log(maxVCount+logOffset);
			l.extraWidthRatio=Math.log(l.prevNeighborCount+logOffset)/Math.log(maxVCount+logOffset);
			l.widthPercentage=l.widthRatio*100+"%";
			l.extraWidthPercentage=l.extraWidthRatio*100+"%";
			l.widthInPixels=l.widthRatio*width;
			l.extraWidthInPixels=l.extraWidthRatio*width;
			l.widthPx=Math.floor(l.widthInPixels)+"px";//trapezids an dlines hsould both use pxels because if lines use percentage there seem ti be discrepancies
			l.extraWidthPx=Math.floor(l.extraWidthInPixels)+"px";
			l.nextLayerWidthDiff=(i==layerSummary.length-1)?0:((l.widthRatio-Math.log(layerSummary[i+1].v+logOffset)/Math.log(maxVCount+logOffset))*width);
			l.density=(l.v>1)?(l.e/(l.v*(l.v-1)/2)):0;
			l.edgesToNextLayer=(l.forwardEdgeDetails&&l.forwardEdgeDetails[i+1])?l.forwardEdgeDetails[i+1]:0;
			l.nextInterlayerDensity=(i==layerSummary.length-1)?0:(l.edgesToNextLayer/(layerSummary[i+1].v*l.v));
			//l.isEndOfPhase=(i==layerSummary.length-1)?false:(l.layerMinDegree!=layerSummary[i+1].layerMinDegree);
		}
		
		
		let container=s.select("#X-ray-menu-content");
		container.selectAll("div").remove();
		let layersSelection=container.selectAll("div").data(layerSummary).enter().append("div").attr("class","x-ray-layer");
		
		let maxPhase=Math.max.apply(null,layerSummary.map((d)=>d.phase));
		let tempColor=new THREE.Color();
		let layerBorderFunc=(d)=>{
			let ratio=d.index/(layerSummary.length-1);
			//if((ratio<G.ILFilterStart)||(ratio>G.ILFilterEnd)){return "midnightblue";}
			//else{return "lightblue";}
			let h=(d.phase*0.85)/(maxPhase+1),s=0.7,l=0.75;
			
			
			if((ratio<G.ILFilterStart)||(ratio>G.ILFilterEnd)){l=0.35;}
			tempColor.setHSL(h,s,l);
			return "#"+tempColor.getHexString();
		};

		
		let showing=false;
		G.ILFilterStart=1.1;G.ILFilterEnd=1.1;//show nothing at the beginning
		let infoDivs=layersSelection.append("div").attr("class","interlayer-info").style("width",(d)=>d.widthPx)
		.style("background-color",(d)=>getRGBAFromDensity(d.density))
		.style("border-color",layerBorderFunc)
		.on("contextmenu",(d)=>{
			d3.event.preventDefault();
			let ratio=d.index/(layerSummary.length-1);
			if(!showing){showing=true;}
			G.ILFilterStart=ratio;G.ILFilterEnd=ratio;
			infoDivs.style("border-color",layerBorderFunc);
			G.layerTableRows.classed("xray-shown", (d)=>{let ratio=d.layer/(layerSummary.length-1);return (ratio>=G.ILFilterStart)&&(ratio<=G.ILFilterEnd);});
			//G.updateVisualStyle();
		})
		.on("click",(d)=>{
			
			let ratio=d.index/(layerSummary.length-1);
			if(!showing){G.ILFilterStart=ratio;G.ILFilterEnd=ratio;showing=true;}//start with one item
			else{
				if(ratio<G.ILFilterStart){
					G.ILFilterStart=ratio;
					//increase range: hide older phase if it crosses a phase boundary(only if it just exactly crosses the closest boundary?)
					
					if(d.isEndOfPhase){
						G.ILFilterEnd=ratio;
					}
				}
				else if(ratio>G.ILFilterEnd){
					G.ILFilterEnd=ratio;
					//increase range: hide older phase if it crosses a phase boundary(only if it just exactly crosses the closest boundary?)
					if((d.index>0)&&(layerSummary[d.index-1].isEndOfPhase)){
						G.ILFilterStart=ratio;
					}
				}
				else{
					if(ratio==G.ILFilterStart){
						if(ratio==G.ILFilterEnd){G.ILFilterStart=0;G.ILFilterEnd=1;}
						else {G.ILFilterEnd=ratio;}
					} //clicking twice within the range would only show that one layer
					else if(ratio==G.ILFilterEnd){G.ILFilterStart=ratio;}
					else{
						if(Math.abs(ratio-G.ILFilterStart)>Math.abs(ratio-G.ILFilterEnd)){
							G.ILFilterEnd=ratio;
						}
						else{
							G.ILFilterStart=ratio;infoDivs.style("border-color",layerBorderFunc);//G.updateVisualStyle();
						}
					}
					
				}
			}
			
			infoDivs.style("border-color",layerBorderFunc);
			G.layerTableRows.classed("xray-shown", (d)=>{let ratio=d.layer/(layerSummary.length-1);return (ratio>=G.ILFilterStart)&&(ratio<=G.ILFilterEnd);});
			//G.updateVisualStyle();
		});
		if(G.showInterlayersAsLines){
			infoDivs.style("height","0");
		}
		if(G.showXRayConsumedPercentage){
			G.extraDivs=layersSelection.append("p").attr("class","interlayer-info-extra").style("width",(d)=>d.extraWidthPx);
		}
		G.layerBorderFunc=layerBorderFunc;G.infoDivs=infoDivs;//change the borders later
		infoDivs.append("p").text((d)=>"L"+d.index+", v: "+d.v+", e: "+d.e+", d: "+d.density.toString().substring(0,5)+" , forward e: "+d.forwardEdges);
		
		infoBarHoverDelay=0;
		function hoverOnInfoBar(obj){
			let data=obj.__data__;
			G.graph.highlightedWaveLayer=data.layer;
			G.view.modifiers.highlightWaveLayer.needsUpdate=true;
			G.view.refreshStyles(true);
		}
		function hoverEnd(){
			G.graph.highlightedWaveLayer=undefined;
			G.view.modifiers.highlightWaveLayer.needsUpdate=true;
			G.view.refreshStyles(true);
			
		}
		//function hoverEnd(){if ((G.graph) && (G.onhover))G.onhover(null);}
		addHoverListener(infoDivs.nodes(),()=>G.hoverDelay,hoverOnInfoBar,hoverEnd);
			
			
			
		let trapezoids=layersSelection.append("div").attr("class","interlayer-trapezoid")
		.style("width",(d)=>(d.nextLayerWidthDiff>0)?(Math.floor(d.widthInPixels-Math.abs(d.nextLayerWidthDiff))+"px"):d.widthPercentage)
		.style("border-top-color",(d)=>getRGBAFromDensity(d.nextInterlayerDensity))
		.style("border-bottom-color",(d)=>getRGBAFromDensity(d.nextInterlayerDensity))
		.style("border-left-width",(d)=>Math.floor(Math.abs(d.nextLayerWidthDiff)/2)+"px")
		.style("border-right-width",(d)=>Math.floor(Math.abs(d.nextLayerWidthDiff)/2)+"px")
		.style("border-top-width",(d)=>(d.nextLayerWidthDiff<0)?0:"40px")//if diff is positive, bottom should have a value and top should be 0
		.style("border-bottom-width",(d)=>(d.nextLayerWidthDiff>=0)?0:"40px")
		.style("visibility",(d)=>(d.isEndOfPhase?"hidden":""))
		.on("contextmenu",(d)=>{
			d3.event.preventDefault();
			if(d.index==layerSummary.length-1)return;
			let ratio1=d.index/(layerSummary.length-1);
			let ratio2=(d.index+1)/(layerSummary.length-1);
			if(!showing){showing=true;}
			G.ILFilterStart=ratio1;G.ILFilterEnd=ratio2;
			infoDivs.style("border-color",layerBorderFunc);
			G.layerTableRows.classed("xray-shown", (d)=>{let ratio=d.layer/(layerSummary.length-1);return (ratio>=G.ILFilterStart)&&(ratio<=G.ILFilterEnd);});
			//G.updateVisualStyle();
		});
		trapezoids.append("p").style("position","absolute").style("top",(d)=>(d.nextLayerWidthDiff<0)?"":"-40px").style("bottom",(d)=>(d.nextLayerWidthDiff>=0)?"":"-40px").text(function(d){return "L "+d.index+" to "+(d.index+1)+", e: "+d.edgesToNextLayer+", d: "+d.nextInterlayerDensity.toString().substring(0,5);});
		//remove last redundant element
		let lastLayer=getE("X-ray-menu-content").lastElementChild;lastLayer.removeChild(lastLayer.lastElementChild);
		console.log(layerSummary);
	},
	
	
	showSparseNet:function(graph){
		if(!graph)graph=G.graph;
		let vc=graph.vertices.length;let options=null;if(vc>G.controls.get("approximateSNThreshold",1)){options={variant:"approximate"};G.addLog("using approximate sparse net");}//todo: the exact SN code has a problem
		let data={};
		if((!graph.dataPath)||graph.isCustom){data.data=this.getGraphVerticesAndEdges(graph);}
		if(graph.dataPath&&(graph.dataPath.indexOf("custom")==-1)){data.dataPath=graph.dataPath;}
		
		if(options)data.options=options;
		if(!graph.snPaths){G.messaging.requestCustomData("sparsenet",data,(result)=>{if(result&&result.length>0){graph.snPaths=result;G.enableModifier("sparsenet",graph);}else{G.addLog("invalid sparsenet result");}});}
		else{G.enableModifier("sparsenet",graph);}//this only sets snPaths, and other intermediate data are managed by the subview.
	},
	hideSparseNet:function(graph){
		if(!graph)graph=G.graph;
		G.disableModifier("sparsenet",graph);
	},
	clearSparseNet:function(graph){
		if(!graph)graph=G.graph;
		G.disableModifier("sparsenet",graph);
		delete G.graph.snPaths;
	},
	addVertexToSparseNet:function(obj){
		if(obj.edges){
			if((!G.graph.snPaths)||(G.graph.snPaths.length==0)){
				if(G.graph.sparsenetFirstVertex===undefined){
					G.graph.sparsenetFirstVertex=Number(obj.original);//do't use normal selection for this!
					G.addLog("chosen starting vertex "+obj.original);
				}
				else{
					if(obj.original==G.graph.sparsenetFirstVertex){G.addLog("already chosen" );return;}
					let path=this.shortestPath(Number(obj.original),G.graph.sparsenetFirstVertex);
					if(path){
						console.log(path);
						this.setSparseNet([path]);
					}
					else{G.addLog("cannot find path to starting vertex");}
				}
			}
			else{
				let cache=G.graph.snPaths;
				let set={};//G.snPathMap uses node ids!!
				for(let path of G.graph.snPaths){
					for(let v of path){
						set[v]=true;
					}
				}
				if(obj.original in set){G.addLog("already chosen" );return;}
				let path=this.shortestPath(Number(obj.original),set);
				if(path){
					console.log(path);
					cache.push(path);
					this.setSparseNet(cache,true);
				}
				else{G.addLog("cannot find path to existing sparse net");}
			}
		}
	},
	//the vertex-reducing metagraph with rings, for when there are too many vertices, mostly very low degree, especially when there are many tiny CCs. This operates on the original graph, considers metanode size if existing (don't want to remove something that may represent larger structures), but does not consider heights. First gets the CCs, and sort by size, and while the number of vertices is greater than the target, take all vertices of the lowest degree in the original graph (does not remove them from the original, no iterative interactions), preferring vertices from smallest CCs if it doesn't need so many, and skipping vertices whose metanode size is greater than a threshold (starting threshold may be simply 1, and increase the threshold if necessary), and mark these vertices as collapsed (the ring to which it belongs is identified later). Repeat until enough vertices are marked collapsed so that the remaining vertex count is small enough. Then, if all vertices in a CC are collapsed, all those vertices (And their edges) belong to a global ring centered around the origin, which represents the size bucket of the CC (where the size ranges are 1-logV, logV-logV^2... and a bucket may be subdivided if there are too many vertices in it to display), and if some vertices in a CC are not collapsed, all vertices in it that are collapsed belong to a local ring (or several local rings divided by degree if needed) that centers on a remaining vertex of highest degree. All edges on collapsed vertices are removed in the metagraph, but the edges between vertices in teh same ring are shown if the ring is expanded.
	getRingsMetagraph:function(graph,targetVertexCount,options={}){
		if(!graph)graph=G.graph;if(!targetVertexCount)targetVertexCount=G.controls.get("targetVertexCount",10000);
		let CCs=[];
		let ccIDs=new Array(graph.vertices.length);
		let usingMetagraphStats=false;
		for(let vID=0;vID<graph.vertices.length;vID++){
			let v=graph.vertices[vID];
			if(vID in ccIDs)continue;
			let ccID=CCs.length;
			let cc=this.DFSHelper(graph,vID,ccID,ccIDs);
			let size=cc.length,edgeCount=cc.edgeCount;
			let result={ccID:ccID,"|V|":size,"|E|":edgeCount,vertices:cc};
			//keep track of total |V| and |E| for bucketing properly later, if it's a metagraph
			let originalVertices=cc.map((i)=>graph.vertices[i]);
			if(propertyExists(originalVertices,"|V|")){usingMetagraphStats=true;result.totalV=0;for(let v of originalVertices){if(v["|V|"])result.totalV+=v["|V|"];}}
			else{result.totalV=result["|V|"];}
			if(propertyExists(originalVertices,"|E|")){
				result.totalE=0;for(let v of originalVertices){
					if(v["|E|"])result.totalE+=v["|E|"];let vEdges=graph.vertices.edges[v.index];
					for(let neighbor in vEdges){
						if(neighbor>v.index&&ccIDs[neighbor]==ccID){
							let e=graph.edges[vEdges[neighbor]];
							let insideEdgeCount=e["|E|"]||e.edgeCount||0;
							if(!isNaN(insideEdgeCount))result.totalE+=insideEdgeCount;
						}
					}
				}
			}
			else{result.totalE=result["|E|"];}
			CCs.push(result);
		}
		//CCs.sort(compareBy("|V|",true));
		let mnsizes=distinctValues(graph.vertices.metanodeSize,null,true);//different metanode sizes, smallest first
		let degreeValues=distinctValues(graph.vertices.degree,null,true);
		let ccSizes=distinctValues(CCs.map((obj)=>obj["|V|"]),null,true);
		let realCCVertexCounts=distinctValues(CCs.map((obj)=>obj.totalV),null,true);
		let realCCEdgeCounts=distinctValues(CCs.map((obj)=>obj.totalE),null,true);
		let vertexIndices=graph.vertices.map((v,i)=>i);
		let vertexCCSizes=graph.vertices.map((v,i)=>CCs[ccIDs[i]]["|V|"]);
		let vertexRealCCVertexCounts=graph.vertices.map((v,i)=>CCs[ccIDs[i]].totalV);
		let vertexRealCCEdgeCounts=graph.vertices.map((v,i)=>CCs[ccIDs[i]].totalE);
		let vertexDegrees=graph.vertices.degree;let logV=Math.log(graph.vertices.length?graph.vertices.length:1);
		let vertexCount=graph.vertices.length;
		//let realLogV=logV,realVertexCount=(graph.vertices.length?graph.vertices.length:1);if(graph.realVertexCount>0){realLogV=Math.log(graph.realVertexCount);realVertexCount=graph.realVertexCount;}else{if(usingMetagraphStats)throw Error("missing metagraph stats");}//detect potential problems with missing real vertex count
		
		
		let remainingVertexCount=graph.vertices.length;
		let collapsedVertices=new Array(graph.vertices.length);
		if(!options.complete){
			outerloop:for(let metanodeSizeThreshold of mnsizes){
				for(let ccSizeThreshold of ccSizes){
					//for(let realCCVertexThreshold of realCCVertexCounts){
					for(let degreeThreshold of degreeValues){
						if(degreeThreshold>(Math.log(ccSizeThreshold)+2))break;//help to avoid testing many many degrees without much progress
						//realCCVertexThreshold
						//if(degreeThreshold>1)console.log("warning: collapsing degree>1 vertices");
						if(remainingVertexCount<=targetVertexCount){
							if(options.eager===false){
								console.log("stopping because the target "+targetVertexCount+" is reached");break outerloop;
							}
							if(ccSizeThreshold>=logV){
								console.log("stopping because CCs of size > logV="+logV+" are affected");break outerloop;
							}
						}
						let remainingIndices=[],newCandidates=[];
						for(let i of vertexIndices){
							if((collapsedVertices[i]===undefined)&&(graph.vertices.metanodeSize[i]<=metanodeSizeThreshold)&&(vertexDegrees[i]<=degreeThreshold)&&(vertexCCSizes[i]<=ccSizeThreshold))newCandidates.push(i);//vertexCCSizes[i]<=ccSizeThreshold
							//vertexRealCCVertexCounts[i]<=realCCVertexThreshold
							else remainingIndices.push(i);
						}
						console.log("removed "+newCandidates.length+" from "+vertexIndices.length+" vertices, "+remainingIndices.length+" left");
						vertexIndices=remainingIndices;
						for(let index of newCandidates){
							
							//eager means take out small CCs of <logV vertices even if the target has been reached, until only some number of vertices are left?(I don't want to remove all vertices)
							collapsedVertices[index]=true;remainingVertexCount--;
						}
					}
				}
			}
		}
		else {
			collapsedVertices.fill(true);remainingVertexCount=0;
		}
		//note about collapsing: it can give misleading pictures if a vertex is chosen that disconnects its original CC. But choosing vertices that do not disconnect is a bit complicated - I don't want to do detection every time. One workaround may be to only choose vertices of degree 1, but that may not be able to remove enough vertices for some graphs. Another way is to prefer collapsing all smaller CCs before collapsing bigger ones, even if that means having to collapse larger metanodes. (or not giving it more priority than metanode size, but only more priority than degree, since i'd like to preserve large metanodes even if they show up as disconnected?) a problem is for some graphs we eventually have to collapse vertices of teh largest CC, and it would detroy the surrounding structure as well as potentially disconnecting teh graph. All considered, allowing disconnection may be the best choice.
		
		//then detect CCs which are completely collapsed, and choose best center vertices for others
		let collapsedCCs=[];
		for(let ccID=0;ccID<CCs.length;ccID++){
			let ccRecord=CCs[ccID];let collapsed=true,bestCenter=null,bestDegree=-1;
			for(let vID of ccRecord.vertices){
				if(!collapsedVertices[vID]){collapsed=false;}
				if(graph.vertices.degree[vID]>bestDegree){bestDegree=graph.vertices.degree[vID];bestCenter=vID;}
			}
			if(collapsed){ccRecord.collapsed=true;collapsedCCs.push(ccRecord);}
			else ccRecord.center=bestCenter;
		}
		//produce metagraph - keep uncollapsed vertices and edges between them
		let metagraph={shortName:"rings metagraph",name:graph.name+" rings metagraph",parent:graph};
		let vMap={},vlist=[],vCount=0;
		metagraph.vertices=graph.vertices.filter((v,i)=>{
			if(!collapsedVertices[i]){vMap[i]=vCount;vlist.push(i);vCount++;return true;}
		}).map((v,i)=>{
			let obj={id:v.id,oldIndex:vlist[i]};
			if(v["|V|"]){obj["|V|"]=v["|V|"];}if(v["|E|"]){obj["|E|"]=v["|E|"];}
			return obj;
		});//must not reuse vertices from another graph; keep |V|, |E| and other useful properties if exists
		metagraph.edges=[];
		graph.edges.forEach((e,i,array)=>{
			let sID=array.source[i],tID=array.target[i];
			if(!collapsedVertices[sID]&&!collapsedVertices[tID]){metagraph.edges.push({s:vMap[sID],t:vMap[tID]});}
		});
		if(graph.heightProperty&&graph.vertices[graph.heightProperty]){//this height must be defined on vertices to be inherited
			metagraph.heightProperty="originalHeight";
			for(let newID=0;newID<metagraph.vertices.length;newID++){
				let oldID=vlist[newID];let oldHeight=graph.vertices[graph.heightProperty][oldID];
				metagraph.vertices[newID].originalHeight=oldHeight;
			}
		}
		if(graph.dataPath){metagraph.dataPath=graph.dataPath+"/ringsmetagraph";}
		//then make rings
		let ccRings={};//mapping from ccID(or -1 for global) to list of vertices in its ring (will break down later if needed)
		for(let ccID=0;ccID<CCs.length;ccID++){
			let ccRecord=CCs[ccID];//if(collapsed)ccRecord.collapsed=true;
			//else ccRecord.center=bestCenter;
			let ringID=(ccRecord.collapsed)?-1:ccID;
			for(let vID of ccRecord.vertices){
				if(!collapsedVertices[vID]){continue;}
				if(!(ringID in ccRings)){ccRings[ringID]=[];}
				ccRings[ringID].push(vID);
			}
		}
		//break down large buckets? or break down all rings that have more than one degree value/cc size value(for global)?
		//I think breaking all rings may be more informative, but may also look more messy. I'll try breaking local rings by degree, and global rings by cc size, etc. (since logV can be larger than all these collapsed CCs, and the typical cc size can be very small, just breaking down by size value may be good enough)
		let globalRingCountLimit=G.controls.get("globalRingCountLimit",50);
		let globalRings=[];
		if(ccRings[-1]){
			//use real CC size for metagraphs
			//first try splitting by real cc vertex counts; 
			let buckets=[collapsedCCs];//each CC record has {ccID:ccID,"|V|":size,"|E|":edgeCount,vertices:cc} and totalV, totalE
			//should operate on the real CCs, instead of vertices, to prevent splitting CCs across buckets
			let powerBuckets=splitArray(collapsedCCs,(ccRecord)=>Math.floor(Math.log(ccRecord.totalV)/Math.log(logV)),true);//realLogV
			//first split by logV, ie the vertex count is between 1-logV, or logV-logV^2 (floor(log(|V|)/log(logV))))
			let vertexCountBuckets=splitArraysInPlace(powerBuckets,(ccRecord)=>ccRecord.totalV,true);//insert results in place
			
			if(G.controls.get("noSplitRingsByV",false)||vertexCountBuckets.length>globalRingCountLimit){
				buckets=powerBuckets;
				//if distinct sizes does not work, use original buckets? or collapse some size buckets??
				//or divide buckets into buckets of a fixed total edge count (which splitArray doesn' do)
			}
			else{
				buckets=vertexCountBuckets;console.log("splitting buckets by CC vertex count");
				//should we decompose more?
			}
			//each bucket creates a ring, no matter the type of bucket
			//now global rings have the format:{maxV,minV,totalV,totalE,prevV,CCs,vertices(vertex ID list)};
			let cumulativeVertexCount=0;
			for(let bucket of buckets){
				let minV=Infinity,maxV=-Infinity;let previousVertexCount=cumulativeVertexCount;let totalVertexCount=0,totalEdgeCount=0;
				for(let ccRecord of bucket){
					let vCount=ccRecord.totalV,eCount=ccRecord.totalE;totalVertexCount+=vCount;totalEdgeCount+=eCount;//for avg degree
					if(vCount>maxV)maxV=vCount;if(vCount<minV)minV=vCount;//note: these can be wrong if the graph is a metagraph of clones
				}
				let vertices=[].concat.apply([], bucket.map((record)=>record.vertices));
				globalRings.push({isGlobal:true,originalCC:undefined,center:undefined,maxV:maxV,minV:minV,totalV:totalVertexCount,totalE:totalEdgeCount,prevV:previousVertexCount,vertices:vertices,CCs:bucket,vertexRatio:totalVertexCount/vertexCount,prevVertexRatio:previousVertexCount/vertexCount});
				cumulativeVertexCount+=totalVertexCount;
				//globalRings.push({isGlobal:true,originalCC:undefined,center:undefined,maxOriginalCCSize:maxOriginalCCSize,originalCCSize:Number(originalCCSize),vertices:vertices,vertexRatio:vertices.length/graph.vertices.length});
			}
			//added log V stats to scale down very large buckets(CCs)
			let totalLogV=0,totalSquaredLogV=0;
			for(let i=0;i<globalRings.length;i++){
				let ring=globalRings[i];let currentLogV=Math.log(ring.totalV+0.1);//avoid 0
				ring.logVRatio=currentLogV;ring.prevLogVRatio=totalLogV;
				ring.sqLogVRatio=currentLogV*currentLogV;ring.prevSqLogVRatio=totalSquaredLogV;
				totalLogV+=currentLogV;totalSquaredLogV+=currentLogV*currentLogV;
			}
			if(graph.vertices.length!=cumulativeVertexCount){
				let temp=Math.log(graph.vertices.length-cumulativeVertexCount+0.1);;
				totalLogV+=temp;totalSquaredLogV+=temp*temp;
			}//count vertices that are not in any bucket too
			for(let i=0;i<globalRings.length;i++){let ring=globalRings[i];ring.logVRatio/=totalLogV;ring.prevLogVRatio/=totalLogV;
			ring.sqLogVRatio/=totalSquaredLogV;ring.prevSqLogVRatio/=totalSquaredLogV;}
			
		}
		let localRings=[];
		for(let ccID in ccRings){
			if(ccID==-1)continue;
			let localDegrees={};let ccRecord=CCs[ccID];let maxDegree=0,minDegree=Infinity;
			for(let vID of ccRings[ccID]){
				let d=vertexDegrees[vID];
				if((d in localDegrees)==false)localDegrees[d]=[];
				localDegrees[d].push(vID);
				if(d>maxDegree){maxDegree=d;}if(d<minDegree){minDegree=d;}
			}
			let prevV=0;let vertexCount=ccRecord["|V|"];
			for(let degree in localDegrees){
				let totalV=localDegrees[degree].length;
				localRings.push({isLocal:true,originalCC:ccID,center:vMap[ccRecord.center],maxDegree:maxDegree,degree:Number(degree),originalCCSize:ccRecord["|V|"],vertices:localDegrees[degree],totalV:totalV,prevV:prevV,vertexRatio:totalV/ccRecord["|V|"],prevVertexRatio:prevV/ccRecord["|V|"]});//ccRecord.center references the old graph!
				prevV+=totalV;
			}
		}
		metagraph.globalRings=globalRings;metagraph.localRings=localRings;//collapsedRings=globalRings.concat(localRings);
		
		
		if(graph.expandVertex){
			metagraph.expandVertex=function(vertex){
				let newIndex=vertex.index;
				let oldIndex=vlist[newIndex];//vertex.oldIndex;//vlist[newIndex];//useful after save/load?
				return graph.expandVertex(graph.vertices[oldIndex]);
			}
		}
		return metagraph;
		
	},
	
	getInducedSubgraph:function(){
		
	},
	getSubgraphAtHeight:function(){
		
	},
	
	getGraph:function(saveWholeGraph=false,keepLayers=true){
		let graph=G.graph;
		if(!graph.preprocessed)throw Error("can't save unprocessed graphs");
		if(saveWholeGraph){return graph;}
		var obj={vertices:[],edges:[],name:G.graph.name+" snapshot",info:G.graph.name+" snapshot",shortName:"snapshot",vertexCount:0,edgeCount:0};
		if(G.graph.showingInterlayers&&keepLayers){obj.showingInterlayers=true;obj.noCloneVertices=true;}

		let vMap={};//old index to new index
		let selectedVertexCount=(Object.keys(G.graph.selectedVertices)).length;
		//let selectedLayerCount=(Object.keys(G.graph.selectedLayers)).length;
		for(let index in graph.vertices){
			let originalVertex=graph.vertices[index];
			
			if(selectedVertexCount>0){
				if(!((index in G.graph.selectedVertices )||(G.egonet&&(index in G.egonet))))continue;
			}
			/*if(G.activeLayer!==null){
				if(!(G.activeLayer in originalVertex.clones)){continue;}
			}*/
					
			
			let v={};
			/*if(keepLayers){
				//e.layer=originalEdge.layer;
				Object.assign(v,originalVertex);
			}*/
			vMap[index]=obj.vertices.length;
			obj.vertices.push(v);obj.vertexCount++;
			for(let neighborIndex in originalVertex.edges){

				if(neighborIndex in vMap){
					let eid=originalVertex.edges[neighborIndex],originalEdge=graph.edges[eid],originalNeighbor=graph.vertices[neighborIndex],originalNeighborID=originalNeighbor.id;
				
					if(selectedVertexCount>0){
						if(!((neighborIndex in G.graph.selectedVertices )||(G.egonet&&(neighborIndex in G.egonet))))continue;
					}

					/*if(G.activeLayer!==null){
					//use the edge's layer itself, not the peel values of the endpoints; even if both points appear in a layer the edge may not
						if(!(originalEdge.layer==G.activeLayer)){continue;}
					}
					*/
					
					let e={};
					/*if(keepLayers){
						//e.layer=originalEdge.layer;
						Object.assign(e,originalEdge);
					}*/
					e.s=vMap[index];e.t=vMap[neighborIndex];if("weight" in originalEdge)e.w=originalEdge.weight;
					obj.edges.push(e);obj.edgeCount++;
				}
			}
		}
		obj.parent=G.graph;
		return obj;
		
	},
	getSubgraphFromFilter:function(func,keepLayers=true){//filter by a predicate on vertices
		let graph=G.graph;
		if(!graph.preprocessed)throw Error("can't save unprocessed graphs");
		var obj={vertices:[],edges:[],name:G.graph.name+" snapshot",info:G.graph.name+" snapshot",shortName:"snapshot"};
		if(G.graph.showingInterlayers&&keepLayers){obj.showingInterlayers=true;obj.noCloneVertices=true;}

		let vMap={};//old index to new index
		for(let index in graph.vertices){
			let originalVertex=graph.vertices[index];
			if(!func(originalVertex))continue;
			let v={};
			/*if(keepLayers){
				//e.layer=originalEdge.layer;
				Object.assign(v,originalVertex);
			}*/
			vMap[index]=obj.vertices.length;
			obj.vertices.push(v);
			for(let neighborIndex in originalVertex.edges){
				if(neighborIndex in vMap){
					let eid=originalVertex.edges[neighborIndex],originalEdge=graph.edges[eid],originalNeighbor=graph.vertices[neighborIndex],originalNeighborID=originalNeighbor.id;
					let e={};
					/*if(keepLayers){
						//e.layer=originalEdge.layer;
						Object.assign(e,originalEdge);
					}*/
					e.s=vMap[index];e.t=vMap[neighborIndex];delete e.source;delete e.target;
					if("weight" in originalEdge)e.w=originalEdge.weight;
					obj.edges.push(e);obj.edgeCount++;
				}
			}
		}
		obj.parent=G.graph;
		return obj;
	},
	getSubgraphFromEdgeFilter:function(func,keepLayers=true){//filter by a predicate on edges, keeping incident vertices
		let graph=G.graph;
		if(!graph.preprocessed)throw Error("can't save unprocessed graphs");
		var obj={vertices:[],edges:[],name:G.graph.name+" snapshot",info:G.graph.name+" snapshot",shortName:"snapshot"};
		if(G.graph.showingInterlayers&&keepLayers){obj.showingInterlayers=true;obj.noCloneVertices=true;}

		let vMap={};//old index to new index
		for(let index in graph.edges){
			let originalEdge=graph.edges[index];
			if(!func(originalEdge))continue;
			let e={};
			if(keepLayers){
				//e.layer=originalEdge.layer;
				Object.assign(e,originalEdge);
			}
			let si=graph.edges.source[index];
			let ti=graph.edges.target[index];
			if((si in vMap) ==false){
				let sv={};
				if(keepLayers){
					Object.assign(sv,graph.vertices[si]);
				}
				vMap[si]=obj.vertices.length;
				obj.vertices.push(sv);
			}
			if((ti in vMap) ==false){
				let tv={};
				if(keepLayers){
					Object.assign(tv,graph.vertices[ti]);
				}
				vMap[ti]=obj.vertices.length;
				obj.vertices.push(tv);
			}
			let newSi=vMap[si],newTi=vMap[ti];
			e.s=newSi;e.t=newTi;delete e.source;delete e.target;
			if("weight" in originalEdge)e.w=originalEdge.weight;
			obj.edges.push(e);
		}
		obj.parent=G.graph;
		return obj;
		
	},
	getVertexIDsString:function(chosenOnes){
		let arr,str;
		if(typeof chosenOnes=="object"){
			arr=Array.from(chosenOnes).map((d)=>G.graph.vertices.id[d]);
		}
		else{
			if(G.graph.selectedVertexCount==0){
				arr=G.graph.vertices.id;
			}
			else{
				arr=Object.keys(G.graph.selectedVertices).map((d)=>G.graph.vertices.id[d]);
			}
		}
		if(chosenOnes){
			if(typeof chosenOnes=="boolean")arr=arr.slice(0,100);
			if(typeof chosenOnes=="number")arr=arr.slice(0,chosenOnes);
		}
		str=arr.join(",");
		return str;
	},
	datasetIDMaps:{
		citeseer_hierarchy:
		{
			idMap:true,
			func:(d)=>{
				try{
					getE("selected-vertices-details-link").href="http://dev-cds.cs.rutgers.edu/webapp/citeseer_data/get_meta?id="+d;
					d3.json("http://dev-cds.cs.rutgers.edu/webapp/citeseer_data/get_meta?id="+d).then((result)=>{
						if(result.data.length)getE("selected-vertices-ids-content").value=result.data.map((x)=>"Title: "+x.title+", Abstract: "+x.abstract).join("\n");
						//Access to XMLHttpRequest at 'http://dev-cds.cs.rutgers.edu/webapp/citeseer_data/get_meta?id=11939246' from origin 'http://localhost:3005' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
					});
					
					
				}
				catch(e){}
			},
			onvertexclick:(d)=>{
				var a = getE("temp-link");
				a.href = "http://citeseer.ist.psu.edu/viewdoc/summary?cid="+d.extraID;
				if (document.createEvent) {
					var event = document.createEvent('MouseEvents');
					event.initEvent('click', true, true);
					a.dispatchEvent(event);
				}
					else {
					a.click();
				}
			}
		},
		protein_hierarchy:{
			/*extraInfoSummary:{
				"Cofactor":
				"Binding motif":,
				"Organism_scientific":
				"Molecule":
			},*/
			func:(d)=>{
				try{
					getE("selected-vertices-details-link").href="http://dev-cds.cs.rutgers.edu/webapp/protein_data/get_meta?id="+d;
					d3.json("http://dev-cds.cs.rutgers.edu/webapp/protein_data/get_meta?id="+d).then((result)=>{
						if(result.data.length){
							let newIDs=result.data.map((x)=>x[1]);
							getE("selected-vertices-ids-content").value=newIDs.join("\n");//format is a bit different.
							if(G.datasetIDMaps.protein_hierarchy.extraLabelDataMap){
								getE("selected-vertices-ids-content").value=newIDs.map((x)=>{
									let lastus=x.split("_").pop().length;
									let y=x.substring(0,x.length-lastus-1);
									let obj=G.datasetIDMaps.protein_hierarchy.extraLabelDataMap[y];
									if(!obj)return "missing ("+x+")";
									return "ID: "+obj["Microenvironment ID"]+", Cofactor: "+obj.Cofactor+", Organism: "+obj["Organism_scientific"]+", Molecule:"+obj.Molecule}).join("\n");//format is a bit different.
									//+", Name: "+obj.name
							}
						}
						
					});
				}
				catch(e){}
			},
			onvertexclick:(d)=>{
				var a = getE("temp-link");a.href = "about:blank";
				d3.json("http://dev-cds.cs.rutgers.edu/webapp/protein_data/get_meta?id="+d.id).then((result)=>{
					if(result.data.length){
						a.href = "https://www.rcsb.org/structure/"+result.data[0][1].split(".")[0];
						if (document.createEvent) {
							var event = document.createEvent('MouseEvents');
							event.initEvent('click', true, true);
							a.dispatchEvent(event);
						}
							else {
							a.click();
						}

					}
				});
			}
		},
		"cit-Patents":{
			//country, state,subcat, year
			func:async (d)=>{
				let simpleData=await d3.json("extradata/cit-Patents/"+d);
				if(!simpleData){console.log("patents data missing");throw Error();}
				//http://www.patentsview.org/api/patents/query?q={"patent_number":["4152461","5658603"]}
				let quotedIDs="\""+d.replaceAll(",","\",\"")+"\"";
				let titles=await d3.json("http://www.patentsview.org/api/patents/query?q={\"patent_number\":["+quotedIDs+"]}");
				let titleMap={};
				if(titles.patents)for(let patent of titles.patents){
					titleMap[patent.patent_id]=patent.patent_title;
				}
				let ids=d.split(",");
				let texts=simpleData.map((x,i)=>{
					let info="";
					if(!x)info="";
					else{info="category: "+x.subcat+", in "+x.country+", "+x.year;}
					let id=x?x.id:ids[i];
					
					if(titleMap[id]){info=titleMap[x.id]+" "+info;}
					return info;
				});
				getE("selected-vertices-ids-content").value=texts.join("\n");
				return (texts);
			},
		}
	},
	randomGraph:function(n,p){
		let g= new Graph();
		g.dataPath="randomGraph";
		for(let i=0;i<n;i++){
			g.addVertex(i);
			for(let j=0;j<i;j++){
				if(Math.random()<p){
					g.addEdge(i,j);
				}
			}
		}
		return g;
		
	}

	

});
//end of module

function arrayEntropy(a)
{
	let sum=0;for(let i=0;i<a.length;i++){sum+=a[i];}
	if(sum==0)return 0;
	let e=0;for(let i=0;i<a.length;i++){if(!a[i])continue;e-=Math.log2(a[i]/sum)*a[i]/sum;}
	return e;
}
function objectEntropy(o)
{
	
	let sum=0;for(let i in o){sum+=o[i];}
	if(sum==0)return 0;
	let e=0;for(let i in o){if(!o[i])continue;e-=Math.log2(o[i]/sum)*o[i]/sum;}
	return e;
}




