G.addModule("subview",{
	map:new WeakMap(),
	init:function(){
		this.initModifierControls();
	},
	
	templates:{
		
		nodes:{
			value:(graph)=>{//this value is calculated for all subgraphs, then combined in another object(G.view.model?) and then used for attrs/uniforms
				let heightPropertyType=G.view.graph.heightPropertyType,heightPropertyName=G.view.graph.heightPropertyName;
				switch (heightPropertyType){
					case undefined:{
						//also allow filtering by edges?
						
						if(graph.modifiers&&graph.modifiers.filter&&graph.modifiers.filter.propertyType=="vertices"&&(graph.modifiers.filter.property in graph.vertices)){
							let propertyName=graph.modifiers.filter.property;
							let min=graph.modifiers.filter.min,max=graph.modifiers.filter.max;
							return graph.vertices.filter((v)=>(v[propertyName]<=max&&v[propertyName]>=min));
						}
						return graph.vertices;
					}
					case "edges":{
						//trying to do partition on demand as they can be expensive
						let array=graph.edges[heightPropertyName];
						if(!array.clones){
							let templateObj=G.analytics.templates.edges.properties[heightPropertyName];
							if((!templateObj.isPartition))throw Error();
							if(!array)throw Error();;
							let result=G.analytics.getEdgePartition(graph,array,templateObj.partitionDefaultValue);
							//{partitions:{1:{v:..,e:...}...},clones:[...],min:..,max:..,average:...,numValues:...}
							assignHiddenProperties(array,result);
						}
						
						if(graph.modifiers&&graph.modifiers.filter&&graph.modifiers.filter.property==heightPropertyName&&graph.modifiers.filter.propertyType=="edges"&&(graph.modifiers.filter.property in graph.edges)){//for consistency, only works for teh correct type of property?
							let min=graph.modifiers.filter.min,max=graph.modifiers.filter.max;
							let indices=[],indexMap={};
							let results=graph.edges[heightPropertyName].clones.filter((clone,i)=>
							{
								let truth=(clone.value<=max&&clone.value>=min);
								if(truth){indexMap[i]=indices.length;indices.push(i);}
								return truth;
							});
							//adding indexMap and indices for later use
							results.indexMap=indexMap;results.originalIndices=indices;
							return results;
						}
						else {
							if(!graph.edges[heightPropertyName].clones)throw Error();
							return graph.edges[heightPropertyName].clones;
						}
						break;
					}
					case "vertices":{
						
						//also allow filtering by edges?
						if(graph.modifiers&&graph.modifiers.filter&&graph.modifiers.filter.property==heightPropertyName&&graph.modifiers.filter.propertyType=="vertices"&&(graph.modifiers.filter.property in graph.vertices)){
							let min=graph.modifiers.filter.min,max=graph.modifiers.filter.max;
							return graph.vertices.filter((v)=>(v[heightPropertyName]<=max&&v[heightPropertyName]>=min));
						}
						return graph.vertices;
					}
				}
				throw Error();
			},
			originalObjectType:"vertices",
			getOriginalObjectID:(graph,nodeID)=>{
				if("original" in graph.nodes)return graph.nodes.original[nodeID];//clone object
				else return graph.nodes.index[nodeID];
			},
			getViewObjectID:(graph,vertexID,preferredHeightValue)=>{
				let heightPropertyType=G.view.graph.heightPropertyType,heightPropertyName=G.view.graph.heightPropertyName;
				if(heightPropertyType=="edges"){
					let cloneMap= graph.edges[heightPropertyName].cloneMaps[vertexID];
					if(preferredHeightValue!==undefined&&preferredHeightValue in cloneMap){return cloneMap[preferredHeightValue];}
					else return cloneMap[Object.keys(cloneMap)[0]];
				}
				else{return vertexID;}
			},
			properties:{
				//metanodeID:{},//some properties of the main global view are not calculated here
				original:{
					isArray:true,value:(graph)=>{
						let vertices=graph.vertices,nodes=graph.nodes;return nodes.map((node,i,array)=>{
							if(nodes.originalIndices){i=nodes.originalIndices[i];}
							let vertexID=(node&&("original" in node))?(node.original):i;
							return vertexID;
						});
						
					},
				},
				
				degree:{isArray:true,value:(graph)=>{//for forces
					let vertices=graph.vertices,nodes=graph.nodes;
					let heightPropertyType=G.view.graph.heightPropertyType,heightPropertyName=G.view.graph.heightPropertyName;
					if(heightPropertyType=="edges"){
						if(nodes.originalIndices){
							return nodes.originalIndices.map((index)=>Object.keys(graph.edges[heightPropertyName].clones[index].edges).length);
						}
						else return graph.edges[heightPropertyName].clones.map((n,i,nodes)=>Object.keys(n.edges).length);
					}
					else{
						if(nodes.originalIndices){
							return nodes.originalIndices.map((index)=>Object.keys(vertices.edges[index]).length);
						}
						return graph.vertices.map((v,i,vertices)=>Object.keys(vertices.edges[i]).length);
					}//cuurently I assume that only the top metagraph has heights, and subgraphs should follow the height of its metanode(by returning undefined)
				}},
				cloneCount:{//a value that shows how many clones a vertex has, or would have if cloning is not active but there's still an edge property to highlight for some reason.
					isArray:true,value:(graph)=>{
					let cloneProperty;
					let heightPropertyType=G.view.graph.heightPropertyType,heightPropertyName=G.view.graph.heightPropertyName;
					if(heightPropertyType=="edges"){cloneProperty=heightPropertyName;}
					else {if(G.view.graph.cloneProperty){cloneProperty=G.view.graph.cloneProperty;}}
					if(cloneProperty&&graph.edges[cloneProperty]&&graph.edges[cloneProperty].cloneMaps){
						let maps=graph.edges[cloneProperty].cloneMaps;
						return graph.nodes.map((node,i,array)=>{
							if(graph.nodes.originalIndices){i=graph.nodes.originalIndices[i];}
							let vertexID=(node&&("original" in node))?(node.original):i;
							return Object.keys(maps[vertexID]).length;
						});
						return graph.edges[cloneProperty].cloneMaps.map((obj)=>Object.keys(obj).length);
					}
					else {return graph.nodes.map(()=>1);}
				}},
				isExpanded:{
					isArray:true,value:(graph)=>{
						let vertices=graph.vertices,nodes=graph.nodes;return nodes.map((node,i,array)=>{
							let vertexID=array.original[i];
							if(vertices.isExpanded&&vertices.isExpanded[vertexID])return 1;
							else return 0;
						});
					},
				},
				isSelected:{
					isArray:true,value:(graph)=>{
						let vertices=graph.vertices,nodes=graph.nodes;return nodes.map((node,i,array)=>{
							let vertexID=array.original[i];
							if(graph.selectedVertices&&vertexID in graph.selectedVertices)return 1;
							else return 0;//note: an attribute has to be numeric not boolean
						});
					},
				},
				
				height:{isArray:true,value:(graph)=>{
					let heightPropertyType=G.view.graph.heightPropertyType,heightPropertyName=G.view.graph.heightPropertyName;
					let vertices=graph.vertices,nodes=graph.nodes;
					//follow the height rule of the top level visible display, not the top level logical display
					if(heightPropertyType=="edges"){
						if(nodes.originalIndices){
							if(!graph.edges[heightPropertyName])return nodes.originalIndices.map(()=>undefined);
							return nodes.originalIndices.map((index)=>graph.edges[heightPropertyName].clones[index].value);
						}
						else{
							if(!graph.edges[heightPropertyName])return graph.vertices.map(()=>undefined);
							return graph.edges[heightPropertyName].clones.map((n)=>n.value);
						}
					}
					else{
						if(nodes.originalIndices){
							if((graph==G.view.graph)&&(graph.vertices[heightPropertyName]))return nodes.originalIndices.map((index)=>graph.vertices[heightPropertyName][index]);
							return nodes.originalIndices.map(()=>undefined);
						}
						else{
							if((graph==G.view.graph)&&(graph.vertices[heightPropertyName]))return graph.vertices[heightPropertyName];
							return graph.vertices.map(()=>undefined);
						}
						
					}//cuurently I assume that only the top metagraph has heights, and subgraphs should follow the height of its metanode(by returning undefined)
				}},
				colorValue:{
					//the value [0-1] in the color scale, different from custom colors; return undefined to follow parent metanode color
					isArray:true,value:(graph)=>{
						//if is a subview, follow metagraph colors
						if(graph!=G.view.graph)return graph.nodes.map(()=>undefined);
						//else if it has height values (here we don't care what is the height rule, just the values), use the height/total height; for now heights are either all undefined or all numbers
						let heights=graph.nodes.height;
						if((heights.length>0)&&heights[0]!=undefined){
							//get the max value
							let max=arrayMax(heights);
							let min=arrayMin(heights);
							if(graph.embeddedLevelMap||graph.embeddedWaveMap){
								return heights.map((x)=>(min==max)?(0.5):((max-x)/(max-min)));
							}//reverse coloring?
							else return heights.map((x)=>(min==max)?(0.5):((x-min)/(max-min)));
						}
						else{//if there's no height, use subgraphID/parent subgraph count of that type if it's a subgraph
							if(graph.subgraphID!=undefined&&G.loading.hasGraph(graph.wholeGraph)){
								let parent=G.loading.getGraph(graph.wholeGraph);
								if(!parent.subgraphs||!parent.subgraphs[graph.subgraphType])return graph.nodes.map(()=>undefined);;
								let max=G.loading.getGraph(graph.wholeGraph).subgraphs[graph.subgraphType].max;
								let value;
								if(max==0)value=0;
								else{value=graph.subgraphID/max;}
								return heights.map((x)=>value);
							}
							else return graph.nodes.map(()=>undefined);
						}
						
						//todo: use the metagraph's metanode color if available
					},
				},
				charge:{value:(node)=>{if(node&&node.weightedDegree){return (1/(node.weightedDegree + 1))}else{return 1;}}},
				forcePriority:{value:(node)=>{return 1;}},
				forceEffectiveness:{value:(node)=>{return 1;}},
				metanodeSize:{
					isArray:true,value:(graph)=>{
						let vertices=graph.vertices,nodes=graph.nodes;return nodes.map((node,i,array)=>{
							let vertexID=nodes.original[i];
							return vertices.metanodeSize[vertexID];
						});
					},
				},
				size:{
					isArray:true,
					value:function(graph){
						let vertices=graph.vertices,nodes=graph.nodes;let levelStartsWave=graph.waveSummary?graph.waveSummary.levelStartsWave:null;
						let arr= nodes.map((node,i,array)=>{
							let vertexID=array.original[i],vertex=graph.vertices[vertexID];
							let metanodeFactor=1,metanodeSizeFactor=G.controls.get("metanodeSizeFactor",0.1);
							if(G.controls.get("showMetanodeSize",true)){metanodeFactor=Math.pow(array.metanodeSize[i],1.5)*metanodeSizeFactor+(1-metanodeSizeFactor);}
							//let subgraphFactor=(getProperty(array,i,"metanodeID")==-1)?1:0.3;
							
							let waveStartFactor=1;
							if(graph.embeddedWaveMap&&levelStartsWave){
								if(levelStartsWave[graph.vertices.waveLevel[vertexID]]&&(graph.vertices.wave[vertexID]==array.height[i])){//only highlight if the node is in its own wave height if using wave heights
									waveStartFactor=2;
								}
							}
							
							let selectionFactor=1;
							if(graph.selectedVertices[vertexID]){
								selectionFactor=1.5;
							}
							
							let answer=metanodeFactor*waveStartFactor*selectionFactor;//*subgraphFactor;//s*diversitySize*degreeFactor
							checkNumber(answer);
							return answer;
						});
						return arr;
					},
					scaling:(graph)=>{let obj={targetAvg:1};if(!graph.isMetagraph){obj.maxScaled=0.6;}return obj;}//shouldn't we scale at the global level???
				},
				color:{dimensions:3,value:function(node){return null;}},
				//userPinnded is in analytics
				pinned:{isArray:true,
					value:function(graph){
						let vertices=graph.vertices,nodes=graph.nodes;let userPinned=vertices.userPinned;
						let arr= nodes.map((node,i,array)=>{if(userPinned[i])return true;return false;});
						return arr;
					}
				},//pinned is calculated from user manual pinning and style-based pinning
				
				clusterCenter:{reference:"nodes",value:function(node){return null;}},
				
				//hack: global rings are always before other rings, so vertex.ringID is the subview ring ID, and currently there are no vertices on local rings, and no subview global rings, and the correct radius can be calculated by targetRadius*radialLimit*radialLimitFactor
				targetRadius:{dimensions:3,isArray:true,value:(graph)=>{
					let vertices=graph.vertices,nodes=graph.nodes;
					let levelStartsWave=graph.waveSummary?graph.waveSummary.levelStartsWave:null;
					return nodes.map((node,i,array)=>{
						let vertexID=array.original[i],vertex=graph.vertices[vertexID];
						let result={x:-1,y:-1,z:-1};
						if(graph.vertices.ringID&&graph.vertices.ringID[i]!==undefined){
							let ring=graph.globalRings[vertex.ringID];
							let max,min;
							if(G.controls.get("logRingThickness",false)){
								min=1-(ring.prevLogVRatio+ring.logVRatio),max=(1-ring.prevLogVRatio);
							}
							else if(G.controls.get("logSqRingThickness",true)){
								min=1-(ring.prevSqLogVRatio+ring.sqLogVRatio),max=1-ring.prevSqLogVRatio;
							}
							else{min=1-(ring.prevVertexRatio+ring.vertexRatio),max=1-(ring.prevVertexRatio);}
							result.x=(max+min)/2;
							if(min<=0.01)result.x=0;
						}
						
						if((graph.vertices.waveCCid2&&graph.embeddedWaveMap)||(graph.vertices.levelCCid&&graph.embeddedLevelMap)){//also use it to fix the nodes to the arcs
							let vPartitionName=graph.embeddedWaveMap?"wave":"waveLevel";
							let vCCIDName=graph.embeddedWaveMap?"waveCCid2":"levelCCid";
							let ePropName=graph.embeddedWaveMap?"wave":"originalWaveLevel";
							let arcs=graph.embeddedWaveMap?graph.embeddedWaveMap.arcs:graph.embeddedLevelMap.arcs;//listed by wave ccid. It should be calculated in preprocessing or analytics, or loading, before calculating nodes
							let nodeID=i;
							if(nodes.originalIndices){
								nodeID=nodes.originalIndices[i];
							}
							
							let clones=graph.edges[ePropName].clones;//edges
							if(nodes.degree[i]==0)return result;
							let firstEdge=null,firstNeighborNodeID=null;
							for(let other in clones[nodeID].edges){firstNeighborNodeID=other;firstEdge=clones[nodeID].edges[other];break;}
							let neighbor=clones[firstNeighborNodeID];let neighborID=neighbor.original;
							let thisPartition=graph.vertices[vPartitionName][vertexID],neighborPartition=graph.vertices[vPartitionName][neighborID];
							let ccid;
							if(thisPartition<=neighborPartition){ccid=graph.vertices[vCCIDName][vertexID];}
							else{ccid=graph.vertices[vCCIDName][neighborID];}//ensures the arc is the one the clone belongs to
							//if a node is in a wave but the vertex is not, then all its edges in the wave must connect to vertices really in the wave, so we can test one edge and use teh waceCC of teh vertex with smaller wave number.
							let arc=arcs[ccid];
							let radius; if(G.controls.get("logArcRadius",true))radius=arc.logRadius;else radius=arc.linearRadius;
							let thickness; if(G.controls.get("logArcThickness",true))thickness=arc.logThickness;else thickness=arc.linearThickness;
							let onCircle=false;
							if(levelStartsWave){//for waves, only vertices that start the wave are on the circle, others are restricted inside the circle; 
								if(levelStartsWave[graph.vertices.waveLevel[vertexID]]&&(graph.vertices.wave[vertexID]==array.height[i])){//only highlight if the node is in its own wave height if using wave heights
									onCircle=true;
								}
							}
							else{//for wave levels, since there's no starting vertex, all vertices that are actually in the level is on the circle,and future vertices clone are not on the circle
								if(thisPartition==arc.level)onCircle=true;
							}
							
							
							if(onCircle){result.y=(radius+thickness)*2;}
							else {result.z=(radius+thickness)*2;}
						}
						return result;
					});
				}},
				targetAngles:{dimensions:2,isArray:true,value:(graph)=>{
					let vertices=graph.vertices,nodes=graph.nodes;
					
					return nodes.map((node,i,array)=>{
						let vertexID=array.original[i],vertex=graph.vertices[vertexID];
						let result={x:-1,y:-1};
						
						if((graph.vertices.waveCCid2&&graph.embeddedWaveMap)||(graph.vertices.levelCCid&&graph.embeddedLevelMap)){//also use it to fix the nodes to the arcs
							let arcs=graph.embeddedWaveMap?graph.embeddedWaveMap.arcs:graph.embeddedLevelMap.arcs;
							let vPartitionName=graph.embeddedWaveMap?"wave":"waveLevel";
							let vCCIDName=graph.embeddedWaveMap?"waveCCid2":"levelCCid";
							let ePropName=graph.embeddedWaveMap?"wave":"originalWaveLevel";
							
							let ccid=graph.vertices[vCCIDName][vertexID];
							let arc=arcs[ccid];
							//centerAngle,angleWidth,
							result.x=arc.centerAngle;
						}
						return result;
					});
				}},
				//now initialPosition is in the view module.
				//position:{//also doesn't exist at the subview level},
				//brightness:{value:(node)=>1},
				customColor:{dimensions:3,value:(node,i,nodes)=>(nodes.color[i]?nodes.color[i]:whiteColor)},
				usingCustomColor:{value:(node,i,nodes)=>((nodes.color[i]!=null)?1:0)},
			},
			//other tings like getObjectAtPos are only at the global level, and separates attrs/uniforms from properties and modifiers
		},
		links:{
			value:(graph)=>{
				
				let heightPropertyType=G.view.graph.heightPropertyType,heightPropertyName=G.view.graph.heightPropertyName;
				switch (heightPropertyType){
					case undefined:{
						
						if(graph.modifiers&&graph.modifiers.filter&&graph.modifiers.filter.propertyType=="vertices"&&(graph.modifiers.filter.property in graph.vertices)){
							let propertyName=graph.modifiers.filter.property;
							let min=graph.modifiers.filter.min,max=graph.modifiers.filter.max;let values=graph.vertices[propertyName];
							return graph.edges.filter((e,i,es)=>((values[e.source]<=max&&values[e.source]>=min)&&(values[e.target]<=max&&values[e.target]>=min)));
						}
						else return Array.from(graph.edges);
					}
					break;
					case "vertices":
					{
						if(graph.modifiers&&graph.modifiers.filter&&graph.modifiers.filter.property==heightPropertyName&&graph.modifiers.filter.propertyType=="vertices"&&(graph.modifiers.filter.property in graph.vertices)){
							let min=graph.modifiers.filter.min,max=graph.modifiers.filter.max;let values=graph.vertices[heightPropertyName];
							return graph.edges.filter((e,i,es)=>((values[e.source]<=max&&values[e.source]>=min)&&(values[e.target]<=max&&values[e.target]>=min)));
						}
						else return Array.from(graph.edges);
					}
					break;
					case "edges":{
						if(graph.modifiers&&graph.modifiers.filter&&graph.modifiers.filter.property==heightPropertyName&&graph.modifiers.filter.propertyType=="edges"&&(graph.modifiers.filter.property in graph.edges)){//for consistency, only works for teh correct type of property?
							let min=graph.modifiers.filter.min,max=graph.modifiers.filter.max;
							return graph.edges.filter((e)=>(e[heightPropertyName]<=max&&e[heightPropertyName]>=min));
						}
						else return Array.from(graph.edges);
					}
					break;
					
				}
				if(heightPropertyType=="edges"){
					
				}//"original" of each clone is the vertex ID 
				else{
					
				}
			},//don't want to affect original properties
			properties:{
				source:{
					value:(graph)=>{
						let nodes=graph.nodes;
						let heightPropertyType=G.view.graph.heightPropertyType,heightPropertyName=G.view.graph.heightPropertyName;
						if(heightPropertyType=="edges"){
							if(graph.links.indexMap){
								let nMap=graph.nodes.indexMap,lMap=graph.links.indexMap;
								//filtered nodes
								let result=[];let ss=graph.edges[heightPropertyName].edgeSources;
								for(let index of graph.links.originalIndices){
									result.push(nMap[ss[index]]);
								}
								return result;
							}
							else return graph.edges[heightPropertyName].edgeSources;
						}
						else{
							if(graph.links.indexMap){//filtered nodes and links
								let result=[];let ss=graph.edges.source;
								let nMap=graph.nodes.indexMap,lMap=graph.links.indexMap;
								for(let index of graph.links.originalIndices){
									result.push(nMap[ss[index]]);
								}
								return result;
							}
							else return graph.edges.source;
						}
					},type:"int",isArray:true,reference:"nodes",
				},
				target:{
					value:(graph)=>{
						let heightPropertyType=G.view.graph.heightPropertyType,heightPropertyName=G.view.graph.heightPropertyName;
						if(heightPropertyType=="edges"){
							if(graph.links.indexMap){//filtered nodes and links
								let result=[];let ts=graph.edges[heightPropertyName].edgeTargets;
								let nMap=graph.nodes.indexMap,lMap=graph.links.indexMap;
								for(let index of graph.links.originalIndices){
									result.push(nMap[ts[index]]);
								}
								return result;
							}
							else return graph.edges[heightPropertyName].edgeTargets;
						}
						else{
							if(graph.links.indexMap){
								//filtered nodes
								let result=[];let ts=graph.edges.target;
								let nMap=graph.nodes.indexMap,lMap=graph.links.indexMap;
								for(let index of graph.links.originalIndices){
									result.push(nMap[ts[index]]);
								}
								return result;
							}
							else return graph.edges.target;
						}
					},type:"int",isArray:true,reference:"nodes",
				},
				strength:{
					value:(graph)=>{
						let ex=G.controls.get("linkStrengthExponent",1.5),log=G.controls.get("logLinkStrength",false);
						return graph.links.map((link,i,links)=>{
							let source=links.source[i],target=links.target[i];
							let sDegree=graph.nodes.degree[source],tDegree=graph.nodes.degree[target];
							let result=Math.max(Math.min(sDegree,tDegree),0.1);//todo: use weighted degree if available?
							if(ex!=1){result=Math.pow(result,ex);}
							if(log){result=Math.log(result+1)+1;}
							//return (("weight" in link)?(G.linkWeightAsStrength?(link.weight+0.1):(1/(link.weight+0.1))):1)/result;
							return 1/result;
						})
					},type:"float",isArray:true,
				},
				distance:{
					value:(link,i,array)=>{
						let a=1,b=1;
						if("edgeLength" in array){a=array.edgeLength[i]+0.1;}//don't use "length"!
						if("weight" in array){
							b=(array.weight[i]+0.1);
							if(G.controls.get("linkWeightAsStrength"),true){b=1/b;}
						}
						return a/b;
					},type:"float",
					//scaling:()=>60 * G.linkDistanceFactor/(6/Math.sqrt(Math.min(Math.max(G.graph.np,1),36))),
				},
				
				brightness:{
					isArray:true,
					value:(graph)=>{
						let sources=graph.edges.source,targets=graph.edges.target;
						let subgraph= null
						graph.egonet={}
						if(graph.hoveredVertex) {
							//subgraph=Algs.getFilteredSubgraph(graph,graph.hoveredVertex,(x)=>(x!=0),"egonet");
							n= graph.getNeighbors(graph.hoveredVertex).length
							console.log(n);
							if(n>25 && n<=57) {
								const Graph = ForceGraph3D()
								(document.getElementById('egonet_canvas'))
									.graphData(graph.egonetMap[graph.hoveredVertex].initData)
									.backgroundColor('#ffffff')
									.nodeColor(node => 'gray')
									.linkColor(link => 'maroon')
									.nodeLabel(node => `<span style="color: red">${node.id}</span>`)
									.width(400)
									.height(400)
								$("#egonet_id").text("Vertex " + graph.hoveredVertex + " Egonet" + "|V|" +graph.egonetMap[graph.hoveredVertex].vertices.length + "|E|" + graph.egonetMap[graph.hoveredVertex].edges.length);
								$('#egonet').modal('show');
							}


						}
						return graph.links.map((link,i,links)=>{
							let result=1;
							let edgeID=i;
							let source=sources[i],target=targets[i];//vertex indices
							let hoverFactor=1;
							if(graph.hoveredVertex){
                                let hoveredEgonet=graph.egonetMap[graph.hoveredVertex];
                                if(graph.hoveredVertex){
                                    if(source in hoveredEgonet.vertices[hoveredEgonet.edges.source] && target in hoveredEgonet.vertices[hoveredEgonet.edges.target] ) {
                                        hoverFactor=5;
                                    }
                                }
							}

							result*=hoverFactor;
							return result;
						});
					},
					type:"float",
					scaling:(graph)=>({targetAvg:(G.lightStyle?3:1)*100/Math.pow(graph.links.length+1,0.7),maxScaled:5})
					//G.controls.get("linkBrightnessFactor",1) is in the uniforms
				},
				thickness:{
					
					isArray:true,
					value:(graph)=>{
						let factor=G.controls.get("linkThicknessFactor",1);
						let factor2=G.controls.get("linkWeightThicknessFactor");
						let weightAsStrength=G.controls.get("linkWeightAsStrength")?true:false;
						let sources=graph.edges.source,targets=graph.edges.target;
						return graph.links.map((link,i,links)=>{
							let result=1;
							let w=1;if(links.weight)w=Math.sqrt(Math.log(weightAsStrength?(array.weight[i]+1):(1/(array.weight[i]+1))));
							w=w*factor+(1-factor);
							result*=w;
							
							let edgeID=i;//G.subview.templates.links.getOriginalObjectID(graph,index);
							let source=sources[i],target=targets[i];//vertex indices
							let hoverFactor=1;
							let hoveredEgonet=graph.egonetMap[graph.hoveredVertex];
                            if(graph.hoveredVertex){
                                if(source in hoveredEgonet.vertices[hoveredEgonet.edges.source] && target in hoveredEgonet.vertices[hoveredEgonet.edges.target] ) {
                                    hoverFactor=5;
                                }
                            }

							result*=hoverFactor;
							return result;
						});
						
						//Math.max(Math.min(link.source.weightedDegree, link.target.weightedDegree),0.1);//this dims higher layer links too much 
						
					},
					type:"float",
					scaling:()=>({targetAvg:G.controls.get("linkThicknessFactor",1),minScaled:0.05,maxScaled:G.controls.get("linkThicknessFactor",0.5)*1.5})
				},
				colorValue:{//default is -1, meaning use the interpolated node colors
					value:(link)=>-1,
				},
				color:{
					dimensions:3,
					value:(link)=>{
						return null;
					},
				},
				coord:{dimensions:3,perPoint:true,value:quadCoordFunc,},//this reuse is OK because it's the same value for all
				direction:{
					type:"int8",isArray:true,
					value:(graph)=>{
						return graph.links.map((link,i,links)=>{
							
							if(links.direction)return links.direction[i];
							return 0;
						});
					}
				},
			},
		},
		//height is global only?
		lines:{
			value:(graph)=>{
				let lines=[];
				let heightPropertyType=G.view.graph.heightPropertyType,heightPropertyName=G.view.graph.heightPropertyName;
				if(heightPropertyType=="edges"){
					//let func=compareBy((x)=>x[heightPropertyName]);
					
					if(graph.embeddedWaveMap||graph.embeddedLevelMap){
						for(let cloneMap of graph.edges[heightPropertyName].cloneMaps){
							let lArray;
							let func=compareBy((x)=>Number(x));
							if(graph.modifiers&&graph.modifiers.filter&&graph.modifiers.filter.property==heightPropertyName&&graph.modifiers.filter.propertyType=="edges"){//for consistency, only works for teh correct type of property?
								let min=graph.modifiers.filter.min,max=graph.modifiers.filter.max;
								lArray=Object.keys(cloneMap).map((x)=>Number(x)).sort(func).filter((l)=>(l<=max&&l>=min));
								if(lArray.length==0)continue;
								for(let i=0;i<lArray.length-1;i++){
									//if the connection is not between adjacent heights, push curved segments instead
									if(Math.abs(lArray[i]-lArray[i+1])==1){
										lines.push({source:cloneMap[lArray[i]],target:cloneMap[lArray[i+1]]});//the projection upwards should probably be done in the shader?
									}
									else{
										function mix(a,b,aRatio){return a*aRatio+b*(1-aRatio);}
										let slices=10;
										let shrinkFunc=(r)=>Math.pow(Math.abs(2*r-1),3);//shrink the radius for points in the middle
										for(let k=0;k<slices;k++){
											let beginRatio=k/slices,endRatio=(k+1)/slices;
											let closestRatio=(beginRatio+endRatio>=1)?1:0;
											let line={source:graph.nodes.indexMap[cloneMap[lArray[i]]],target:graph.nodes.indexMap[cloneMap[lArray[i+1]]],isSlice:true,beginRatio:beginRatio,endRatio:endRatio};
											lines.push(line);
										}
									}
									
								}
							}
							else{
								lArray=Object.keys(cloneMap).sort(func);
								for(let i=0;i<lArray.length-1;i++){
									//if the connection is not between adjacent heights, push curved segments instead
									if(Math.abs(lArray[i]-lArray[i+1])==1){
										lines.push({source:cloneMap[lArray[i]],target:cloneMap[lArray[i+1]]});//the projection upwards should probably be done in the shader?
									}
									else{
										function mix(a,b,aRatio){return a*aRatio+b*(1-aRatio);}
										let slices=10;
										let shrinkFunc=(r)=>Math.pow(Math.abs(2*r-1),3);//shrink the radius for points in the middle
										for(let k=0;k<slices;k++){
											let beginRatio=k/slices,endRatio=(k+1)/slices;
											let closestRatio=(beginRatio+endRatio>=1)?1:0;
											let line={source:cloneMap[lArray[i]],target:cloneMap[lArray[i+1]],isSlice:true,beginRatio:beginRatio,endRatio:endRatio};
											lines.push(line);
										}
									}
									
								}
							}
							
							
						}
					}
					else{
							
						for(let cloneMap of graph.edges[heightPropertyName].cloneMaps){
							let lArray;
							let func=compareBy((x)=>Number(x));
							if(graph.modifiers&&graph.modifiers.filter&&graph.modifiers.filter.property==heightPropertyName&&graph.modifiers.filter.propertyType=="edges"){//for consistency, only works for teh correct type of property?
								let min=graph.modifiers.filter.min,max=graph.modifiers.filter.max;
								lArray=Object.keys(cloneMap).map((x)=>Number(x)).sort(func).filter((l)=>(l<=max&&l>=min));
								if(lArray.length==0)continue;
								//let lArray=Object.keys(cloneMap).sort(func);
								for(let i=0;i<lArray.length-1;i++){lines.push({source:graph.nodes.indexMap[cloneMap[lArray[i]]],target:graph.nodes.indexMap[cloneMap[lArray[i+1]]]});}
							}
							else{
								lArray=Object.keys(cloneMap).sort(func);
								//let lArray=Object.keys(cloneMap).sort(func);
								for(let i=0;i<lArray.length-1;i++){lines.push({source:cloneMap[lArray[i]],target:cloneMap[lArray[i+1]]});}
							}
							
						}
					}
				}
				return lines;
			},
			properties:{
				source:{value:(line)=>line.source,type:"int",reference:"nodes",},
				target:{value:(line)=>line.target,type:"int",reference:"nodes",},
				brightness:{type:"float",
					value:function(line) {return 1;//todo: should scale with the nodes
					},
					//scaling:(model)=>({targetAvg:50*G.controls.get("lineBrightnessFactor",0.2)/Math.sqrt(model.lines.length+1),maxScaled:G.controls.get("lineThicknessFactor",0.4)}),
					scaling:(model)=>({targetAvg:50*G.controls.get("lineBrightnessFactor",0.5)/Math.pow(model.lines.length+1,0.66),maxScaled:G.controls.get("lineThicknessFactor",0.4)}),
					//note: unlike before we don't readily have the total number of vertices in the whole model.
				},
				beginRatio:{value:(line)=>(line.beginRatio?line.beginRatio:0),type:"float",},
				endRatio:{value:(line)=>(line.endRatio?line.endRatio:1),type:"float",},
				coord:{dimensions:3,perPoint:true,value:quadCoordFunc,},
			},
		},
		waveLayers:{
			value:(graph)=>{//layers in expanded wave metanodes
				let result=[];let getViewObjectID=G.subview.templates.nodes.getViewObjectID;
				if(graph.vertices.isMetanode&&graph.vertices.waveLayers&&graph.vertices.waveLayersExpanded)
				{
					for(let i=0;i<graph.vertices.length;i++){
						let v=graph.vertices[i];
						if(graph.vertices.isMetanode[i]&&graph.vertices.waveLayers[i]&&graph.vertices.waveLayersExpanded[i]){
							let nodeID=getViewObjectID(graph,i);// v.clones[Object.keys(v.clones)[0]];
							for(let j=0;j<graph.vertices.waveLayers[i].length;j++){
								let l=graph.vertices.waveLayers[i][j];
								//let obj={vertexID:i,layerInVertex:j};
								let obj={nodeID:nodeID,layerInVertex:j};
								Object.assign(obj,l);
								result.push(obj);
							}
						}
					}

				}
				return result;
			},
			properties:{
				nodeID:{reference:"nodes",value:(d,i,array)=>d.nodeID,},
				layerInVertex:{value:(d,i)=>d.layerInVertex,},
				lineLength:{
					value:(d)=>Math.sqrt(d.v)*10//Math.log(v.v+0.5)
				},
				//because it references nodes, positions has to be moved to the global view, or we can just use another attr like nodeID for that
				//now all coord properties are noved to the global view?
				coord:{dimensions:3,perPoint:true,value:quadCoordFunc,},
				lineLength:{
					value:(v)=>v.lineLength,
				},
				shape:{dimensions:2,value:(d,i)=>{
						var v=new THREE.Vector2();
						v.x=Math.sqrt(d.v)*10;//d.v;
						v.y=Math.max(0.07,(2*d.e/(d.v*d.v)))*v.x;
						//longer and  shorter axes
						return v;
					}
				},
				extraData:{
					dimensions:3,value:(d,i)=>{
						var v=new THREE.Vector3();
						v.x=d.isStartOfPhase?1:0;
						v.y=d.isEndOfPhase?1:0;
						v.z=d.shape?d.shape.s:0;
						return v;
					}
				},
				rangeHighlight:{
					dimensions:3,value:(d,i)=>{
						var v=new THREE.Vector3();
						v.x=(d.layer==G.view.graph.startLayer||d.layer==G.view.graph.endLayer)?1:0;
						return v;
					}
				},
			},
		},
		waveInterlayers:{
			value:(graph)=>{//layers in expanded wave metanodes
				let result=[];let getViewObjectID=G.subview.templates.nodes.getViewObjectID;
				if(!(graph.vertices.isMetanode&&graph.vertices.waveLayers&&graph.vertices.waveLayersExpanded))return result;
				for(let i=0;i<graph.vertices.length;i++){
					let v=graph.vertices[i];
					if(v.isMetanode&&v.waveLayers&&v.isExpanded){
						let nodeID=getViewObjectID(graph,i);
						for(let j=1;j<v.waveLayers.length;j++){
							let prevLayer=v.waveLayers[j-1],nextLayer=v.waveLayers[j];
							let edgesToNextLayer=(prevLayer.forwardEdgeDetails&&prevLayer.forwardEdgeDetails[prevLayer.layer+1])?prevLayer.forwardEdgeDetails[prevLayer.layer+1]:0;
							let obj={nodeID:nodeID,sourceLayer:j-1,sourceLayerObj:prevLayer,targetLayer:j,targetLayerObj:nextLayer,density:edgesToNextLayer/(prevLayer.v*nextLayer.v)};
							result.push(obj);
						}
					}
				}
				return result;
			},
			properties:{
				nodeID:{reference:"nodes",value:(d,i)=>d.nodeID,},
				coord:{dimensions:3,perPoint:true,value:quadCoordFunc,
				},
				lineLengths:{dimensions:2,value:(d,i)=>{
						var v=new THREE.Vector2();
						//v.x=Math.log(d.sourceLayerObj.v+0.5);v.y=Math.log(d.targetLayerObj.v+0.5);return v;
						v.x=Math.sqrt(d.sourceLayerObj.v)*10;//Math.log(d.sourceLayerObj.v+0.5);
						v.y=Math.sqrt(d.targetLayerObj.v)*10;//Math.log(d.targetLayerObj.v+0.5);
						return v;
					},
				},
				density:{
					value:(d)=>d.density,
					perObject:true,//causes it to be replicated for all points in an obejct
					//scaling isn't done here, instead it needs to be done beforehand, and stored for teh value getter's use 
				},
			},
		},
		
		collapsedRings:{
			value:(g)=>{
				if(g.globalRings||g.localRings)return [].concat(g.globalRings?g.globalRings:[],g.localRings?g.localRings:[]);
				else return [];
			},
			//this has more than one possible original object type...
			properties:{
				//global rings:{originalCC:undefined,center:undefined,originalCCSize:size,vertices:globalCCSizes[size]}
				//local rings:{originalCC:ccID,center:ccRecord.center,degree:degree,originalCCSize:ccRecord["|V|"],vertices:localDegrees[degree]})
				center:{isArray:true,reference:"nodes",
					value:(graph)=>{
						let getViewObjectID=G.subview.templates.nodes.getViewObjectID;
						return graph.collapsedRings.map((d)=>{
							if(d.center==undefined)return 0;
							return getViewObjectID(graph,d.center);
						});
					},
				},
				isGlobal:{
					value:(d)=>((d.center==undefined)?1:0),
				},
				minRadius:{
					value:(d)=>{//normalized between 0-1, based on vertex ratios (normalized between 0.5-1 for local ones instead to leave space for the nodes)
						if(d.degree)return 0.5*(1-(d.prevVertexRatio+d.vertexRatio))+0.5;//Math.log(d.originalCCSize+1);//local
						if(G.controls.get("logRingThickness",false))return 1-(d.prevLogVRatio+d.logVRatio);
						else if(G.controls.get("logSqRingThickness",true))return 1-(d.prevSqLogVRatio+d.sqLogVRatio);
						else return 1-(d.prevVertexRatio+d.vertexRatio);
					},
				},
				maxRadius:{
					value:(d)=>{
						if(d.degree)return 0.5*(1-d.prevVertexRatio)+0.5;//Math.log(d.originalCCSize+1);
						if(G.controls.get("logRingThickness",false))return 1-d.prevLogVRatio;//global - global rings can become a circle at the center  //.prevVertexRatio
						else if(G.controls.get("logSqRingThickness",true))return 1-d.prevSqLogVRatio;
						else return 1-(d.prevVertexRatio);
					},
				},
				radiusMultiplier:{
					value:(d)=>{
						if(d.degree)return Math.cbrt(d.originalCCSize+1);//log is too small for larger graphs, but sqrt is too large!
						return 0;//global ring sizes are multiplied based on radial limit which is global
					},
				},
				position:{dimensions:3,value:(d,i)=>{
						var v=new THREE.Vector3();
						v.x=Number(d.originalCCSize);//used for coloring
						return v;
					},
				},
				coord:{dimensions:3,value:quadCoordFunc,perPoint:true,//need to be a quad to keep itself horizontal
				},
				color1:{dimensions:3,value:(d,i)=>{//color1 at outer rim (minV or min degree), color2 at inner rim (maxV or max degree)
						var c=new THREE.Color();let value=(d.isGlobal?d.minV:d.degree),scaledValue=value/10-Math.floor(value/10);
						c.setStyle(colorScale(scaledValue));
						return c;
					},
				},
				color2:{dimensions:3,value:(d,i)=>{//local rings currenty have a single degree so has a single color.
						var c=new THREE.Color();let value=(d.isGlobal?d.maxV:d.degree),scaledValue=value/10-Math.floor(value/10);
						c.setStyle(colorScale(scaledValue));
						return c;
					},
				},
			},
		},
		
		waveArcs:{
			value:(g)=>{
				if(g.embeddedWaveMap)return g.embeddedWaveMap.arcs;
				if(g.embeddedLevelMap)return g.embeddedLevelMap.arcs;
				if(!(g.waveMap||g.levelMap))return [];
				return g.arcs;
			},
			properties:{
				center:{
					dimensions:2,value:(d)=>{
						return {x:0,y:0};
					},
				},
				maxRadius:{
					value:(d)=>{
						let radius; if(G.controls.get("logArcRadius",true))radius=d.logRadius;else radius=d.linearRadius;
						let thickness; if(G.controls.get("logArcThickness",true))thickness=d.logThickness;else thickness=d.linearThickness;
						return radius+thickness;
					},//max radius of the circle
				},
				thickness:{
					value:(d)=>{if(G.controls.get("logArcThickness",true))return d.logThickness;else return d.linearThickness;},
				},
				centerAngle:{
					value:(d)=>d.centerAngle,
				},
				angleWidth:{
					value:(d)=>d.angleWidth,
				},
				height:{
					value:(d)=>d.height,//already scaled?
				},
				position:{dimensions:3,value:(d,i)=>{//dummy
						var v=new THREE.Vector3();
						return v;
					},
				},
				coord:{dimensions:3,value:quadCoordFunc,perPoint:true,//need to be a quad to keep itself horizontal
				},
				colorValue:{value:(d,i)=>{
					return d.colorValue;
					//let color=new THREE.Color();color.setStyle(G.colorScales.blueRed(d.colorValue));d.colorObj=color;return color;
					},
				},
			},
		},
		
		waveArcLinks:{
			value:(g)=>{
				//if(g.embeddedOriginalGraph){//show real vertex alignments
				//	return [];//in this case we reuse the vertex lines for this purpose -- lines are dynamic while wave links are static
				//}
				let metagraph=(g.waveCCMetagraph||g.leveleCCMetagraph);
				if(!metagraph)return [];
				let arcs=g.arcs;//index is CCID
				let arcLinks=[];let sources=metagraph.edges.source;let targets=metagraph.edges.target;let edgeWeights=metagraph.edges.E;
				let useLogRadius=G.controls.get("logArcRadius",true);//)radius=d.logRadius;else radius=d.linearRadius;
				let useSmallerRadius=false,useSourceAngle=false;
				for(let i=0;i<metagraph.edges.length;i++){
					let source=sources[i],target=targets[i],E=edgeWeights[i];
					let sArc=arcs[source],tArc=arcs[target],sStart=sArc.centerAngle-sArc.angleWidth,sEnd=sArc.centerAngle+sArc.angleWidth,tStart=tArc.centerAngle-tArc.angleWidth,tEnd=tArc.centerAngle+tArc.angleWidth;
					
					useSmallerRadius=false,useSourceAngle=false;
					if(Math.abs(sArc.wave-tArc.wave)>1){
						useSmallerRadius=true;//scales radius by 1/3 for all heights
					}
					
					let sRadius,tRadius;
					if(useLogRadius){sRadius=sArc.logRadius;tRadius=tArc.logRadius;}
					else{sRadius=sArc.linearRadius;tRadius=tArc.linearRadius;}
					if(sArc.wave<tArc.wave){
						useSourceAngle=true;
					}
					let sH=sArc.height,tH=tArc.height;
					
					let maxSegments;
					if(useSourceAngle){maxSegments=Math.max(1,Math.floor(sArc.angleWidth*5));}
					else{maxSegments=Math.max(1,Math.floor(tArc.angleWidth*5));}
					let sWidth,tWidth,segments;
					if(E<maxSegments){
						segments=E;sWidth=-1;tWidth=-1;
					}
					else{
						segments=maxSegments;sWidth=sArc.angleWidth*2/segments;tWidth=tArc.angleWidth*2/segments;
					}//draw individual edges
					if(useSourceAngle){tWidth=sWidth;}else{sWidth=tWidth;}//force them to be rectangular (non-rectangles render incorrectly now)
					function mix(a,b,aRatio){return a*aRatio+b*(1-aRatio);}
					for(let j=0;j<segments;j++){
						let sAngle=sStart+(sArc.angleWidth*2/segments)*(j+0.5);//anglewidth is half the range!
						let tAngle=tStart+(tArc.angleWidth*2/segments)*(j+0.5);
						if(useSmallerRadius){
							let slices=10;
							let shrinkFunc=(r)=>Math.pow(Math.abs(2*r-1),3);//shrink the radius for points in the middle
							for(let k=0;k<slices;k++){
								//let color1=new THREE.Color(),color2=new THREE.Color();
								let beginRatio=k/slices,endRatio=(k+1)/slices;
								let closestRatio=(beginRatio+endRatio>=1)?1:0;
								//color1.copy(sArc.colorObj).lerp(tArc.colorObj,beginRatio);
								//color2.copy(sArc.colorObj).lerp(tArc.colorObj,endRatio);
								let obj1={source:{ratio:beginRatio,height:mix(sH,tH,beginRatio),angle:mix(sAngle,tAngle,closestRatio),radius:mix(sRadius,tRadius,beginRatio)*shrinkFunc(beginRatio),width:mix(sWidth,tWidth,beginRatio),colorValue:sArc.colorValue},target:{ratio:endRatio,height:mix(sH,tH,endRatio),angle:mix(sAngle,tAngle,closestRatio),radius:mix(sRadius,tRadius,endRatio)*shrinkFunc(endRatio),width:mix(sWidth,tWidth,endRatio),colorValue:tArc.colorValue}};// note: these lines interpolate between teh colros not color values (ie don't follow the color scale's path in color space)
								arcLinks.push(obj1);
							}
						}
						else{
							if(useSourceAngle){tAngle=sAngle;}else{sAngle=tAngle;}//only for direct connections
							let obj={source:{ratio:0,height:sArc.height,angle:sAngle,radius:sRadius,width:sWidth,colorValue:sArc.colorValue},target:{ratio:1,height:tArc.height,angle:tAngle,radius:tRadius,width:tWidth,colorValue:tArc.colorValue}};
							arcLinks.push(obj);
						}
						
					}
				}
				return arcLinks;
				
			},
			properties:{
				sourceHeight:{
					value:(d)=>d.source.height,
				},
				sourceWidth:{
					value:(d)=>d.source.width,//angle width
				},
				sourceAngle:{
					value:(d)=>d.source.angle,
				},
				sourceRadius:{
					value:(d)=>d.source.radius,
				},
				targetHeight:{
					value:(d)=>d.target.height,
				},
				targetWidth:{
					value:(d)=>d.target.width,//angle width
				},
				targetAngle:{
					value:(d)=>d.target.angle,
				},
				targetRadius:{
					value:(d)=>d.target.radius,
				},
				position:{dimensions:3,value:(d,i)=>{//dummy
						var v=new THREE.Vector3();
						return v;
					},
				},
				coord:{dimensions:3,value:quadCoordFunc,perPoint:true,//need to be a quad to keep itself horizontal
				},
				colors:{dimensions:4,value:(d,i)=>{let v=new THREE.Vector4();
					v.x=d.source.colorValue,v.y=d.target.colorValue;
					v.z=d.source.ratio,v.w=d.target.ratio;
					return v;},
				},
				//color2:{dimensions:3,value:(d,i)=>d.target.color,
				//},
			},
		},
		
	},
	onModifiersChanged:function(name){
		G.broadcast("modifierUpdated",{target:this.modifierTarget&&this.modifierTarget.dataPath,modifier:name,params:(this.modifierTarget&&this.modifierTarget.modifiers&&this.modifierTarget.modifiers[name])});
		if(this.modifiers[name].refreshAll!==false){G.view.refreshStyles(true,true);}
		else{G.view.refreshStyles();}
		
	},
	
	modifiers:{
		nodeColor:{
			//refreshAll:false,//todo: doesn't work, don't use yet
			onEnable:(graph,params)=>{
				if(!graph.colorScaleName){graph.colorScaleName=params.colorScaleName;G.display(G.graph);}
			},
			params:{
				property:{
					displayName:"input",
					value:"degree",
					type:"select",
					options:(graph,params)=>{
						let items=[];
						if(graph.heightProperty){items.push("height");}
						for(let name in graph.vertices.properties){
							if(graph.vertices.properties[name].type!="int")continue;
							items.push(name);
						}
						return items;
					},
					//["height","cloneCount","degree","originalWaveLevel","levelCCid"],//note these proeprties belong to nodes, not vertices. should all vertex-based modifiers be in subview?
				},
				colorScaleName:{
					value:(graph,params)=>{if(graph.colorScaleName)return graph.colorScaleName;return "lightBlueRed";},//"lightBlueRed",
					type:"select",
					options:Object.keys(G.colorScales),//["orange","orangeLight","cool","warm","spring","custom"],
					func:(value,graph,params)=>{//parameters are target.modifiers[name][paramName],target,target.modifiers[name]
						graph.colorScaleName=value;
					},
				},
				linkColoring:{
					value:"default",
					type:"select",
					options:["default","max","min"],//note these proeprties belong to nodes, not vertices. should all vertex-based modifiers be in subview?

				},
			},
			onUpdate:(graph,params)=>{
				if(params){graph.colorScaleName=params.colorScaleName;}
				G.view.sharedUniforms.colorList.needsUpdate=true;
				G.view.sharedUniforms.nodeColorData.needsUpdate=true;
			},
			onDisable:(graph,params)=>{
				delete graph.colorScaleName;
			},
			data:{
				max:(g,params)=>{if(params.property in g.nodes)return maxPropertyValue(g.nodes,params.property);else return maxPropertyValue(g.vertices,params.property);},
				min:(g,params)=>{if(params.property in g.nodes)return minPropertyValue(g.nodes,params.property);else return minPropertyValue(g.vertices,params.property);},
			},
			effects:{
				nodes:{
					colorValue:[
						(data,oldValue,node,index,array,graph)=>{
							let value;
							if(node&&(data.property in node))value=node[data.property];
							else if(data.property in array){value=array[data.property][index];}
							else {
								let vertexID=G.subview.templates.nodes.getOriginalObjectID(graph,index);if(data.property in graph.vertices){value=graph.vertices[data.property][vertexID];}
							}
							
							let scaled=(data.max==data.min)?3.5:((value-data.min)/(data.max-data.min));
							return scaled;
							
						},
					]
				},
				links:{
					colorValue:[
						(data,oldValue,link,index,array,subview)=>{
							if(data.linkColoring=="default")return;
							let sID=array.source[index],tID=array.target[index];
							let svalue=subview.nodes.colorValue[sID],tvalue=subview.nodes.colorValue[tID];
							if(data.linkColoring=="max")return Math.max(svalue,tvalue);
							if(data.linkColoring=="min")return Math.min(svalue,tvalue);
						},
					]
				},
			}
		},
		selectionColor:{
			params:{
				/*property:{
					displayName:"input",
					value:"degree",
					type:"select",
					options:(graph,params)=>{
						let items=[];
						if(graph.heightProperty){items.push("height");}
						for(let name in graph.vertices.properties){
							if(graph.vertices.properties[name].type!="int")continue;
							items.push(name);
						}
						return items;
					},
					//["height","cloneCount","degree","originalWaveLevel","levelCCid"],//note these proeprties belong to nodes, not vertices. should all vertex-based modifiers be in subview?
				},
				colorScaleName:{
					value:(graph,params)=>{if(graph.colorScaleName)return graph.colorScaleName;return "lightBlueRed";},//"lightBlueRed",
					type:"select",
					options:Object.keys(G.colorScales),//["orange","orangeLight","cool","warm","spring","custom"],
					func:(value,graph,params)=>{//parameters are target.modifiers[name][paramName],target,target.modifiers[name]
						graph.colorScaleName=value;
					},
				},
				*/
				linkColoring:{
					value:"default",
					type:"select",
					options:["default","max","min"],//note these proeprties belong to nodes, not vertices. should all vertex-based modifiers be in subview?

				},
			},
			onUpdate:(graph,params)=>{
				//if(params){graph.colorScaleName=params.colorScaleName;}
				//G.view.sharedUniforms.colorList.needsUpdate=true;
				G.view.sharedUniforms.nodeColorData.needsUpdate=true;
			},
			onEnable:(graph,params)=>{
				if(graph.modifiers&&graph.modifiers.nodeColor&&(graph.modifiers.nodeColor.property in graph.vertices))return;
				G.addLog("Selection color can only be enabled when the node color tool is active");
				return true;//cannot apply
			},
			data:{
				property:(g,params)=>{if(g.modifiers&&g.modifiers.nodeColor&&g.modifiers.nodeColor.property in g.vertices)return g.modifiers.nodeColor.property;},
				max:(g,params)=>{
					let values=g.vertices[params.property];let max=-Infinity;
					for(let v in g.selectedVertices){
						if(values[v]>max)max=values[v];
					}
					return max;
				},
				min:(g,params)=>{
					let values=g.vertices[params.property];let min=Infinity;
					for(let v in g.selectedVertices){
						if(values[v]<min)min=values[v];
					}
					return min;
				},
			},
			effects:{
				nodes:{
					colorValue:[
						(data,oldValue,node,index,array,graph)=>{
							
							
							let vertexID=G.subview.templates.nodes.getOriginalObjectID(graph,index);
							if(!graph.selectedVertices[vertexID])return;
							let value=graph.vertices[data.property][vertexID];
							
							let scaled=(data.max==data.min)?0.5:((value-data.min)/(data.max-data.min));
							return scaled;
							
						},
					]
				},
				links:{
					colorValue:[
						(data,oldValue,link,index,array,graph)=>{
							if(data.linkColoring=="default")return;
							
							let sID=array.source[index],tID=array.target[index];
							let svID=G.subview.templates.nodes.getOriginalObjectID(graph,sID);
							let tvID=G.subview.templates.nodes.getOriginalObjectID(graph,tID);
							if(!(graph.selectedVertices[svID]&&graph.selectedVertices[tvID]))return;
							let svalue=graph.nodes.colorValue[sID],tvalue=graph.nodes.colorValue[tID];
							if(data.linkColoring=="max")return Math.max(svalue,tvalue);
							if(data.linkColoring=="min")return Math.min(svalue,tvalue);
						},
					]
				},
			}
		},
		heights:{
			onEnable:(graph,params)=>{//only applicable when both the vertices and edges have a property of the same name
				let items=[],candidates={};
				//if(graph.heightProperty){items.push("height");}
				for(let name in graph.vertices.properties){
					if(graph.vertices.properties[name].type!="int")continue;
					candidates[name]=true;
				}
				for(let name in graph.edges.properties){
					if(graph.edges.properties[name].type!="int")continue;
					if(candidates[name])items.push(name);
				}
				if(items.length==0){G.addLog("no valid vertex/edge property");return true;};
				G.subview.refreshModifierControls('heights');
				//G.display(G.graph);
			},
			params:{
				property:{
					displayName:"input",
					value:(graph,params)=>{
						if(params.property)return params.property;
						if(graph.heightProperty){
							//params.property=graph.heightProperty;
							//G.subview.refreshModifierControls('heights');
							return graph.heightProperty;
						}
						let items=[],candidates={};
						for(let name in graph.vertices.properties){
							if(graph.vertices.properties[name].type!="int")continue;
							candidates[name]=true;
						}
						for(let name in graph.edges.properties){
							if(graph.edges.properties[name].type!="int")continue;
							if(!graph.edges.properties[name].clones)continue;
							candidates[name]=true;
						}
						for(let name in candidates){items.push(name);}
						if(items.length==0)return "";
						return items[0];
					},
					type:"select",
					options:(graph,params)=>{
						let items=[],candidates={};
						for(let name in graph.vertices.properties){
							if(graph.vertices.properties[name].type!="int")continue;
							candidates[name]=true;
						}
						for(let name in graph.edges.properties){
							if(graph.edges.properties[name].type!="int")continue;
							if(!graph.edges.properties[name].clones)continue;
							candidates[name]=true;
						}
						for(let name in candidates){items.push(name);}
						return items;
					},
				},
				propertyType:{
					displayName:"objects",
					value:(graph,params)=>{
						if(graph.heightPropertyTypeHint)return graph.heightPropertyTypeHint;
						return "vertices";
					},
					type:"select",
					options:["vertices","edges"],
				},
				
			},
			onUpdate:(graph,params)=>{
				if(!params)return;
				if(params.property in graph[params.propertyType]==false){return;}
				if(graph.heightProperty!=params.property||graph.heightPropertyTypeHint!=params.propertyType){
					graph.heightProperty=params.property;
					graph.heightPropertyTypeHint=params.propertyType;
					G.subview.refreshModifierControls('heights');
					setTimeout(()=>G.display(G.graph),0);
					G.subview.refreshModifierControls('heights');
				}
				
			}
		},
		highlight:{
			params:{
				property:{
					displayName:"input",
					value:"degree",
					type:"select",
					options:(graph,params)=>{
						let items=[];
						//if(graph.heightProperty){items.push("height");}
						for(let name in graph.vertices.properties){
							if(graph.vertices.properties[name].type!="int")continue;
							items.push(name);
						}
						for(let name in graph.edges.properties){
							if(graph.edges.properties[name].type!="int")continue;
							items.push(name);
						}
						return items;
					},
					//["height","cloneCount","degree","originalWaveLevel","levelCCid"],//note these proeprties belong to nodes, not vertices. should all vertex-based modifiers be in subview?
				},
				operator:{
					value:"==",
					type:"select",
					options:["==","<=",">="],
				},
				propertyValue:{
					value:0,//(graph,params)=>maxPropertyValue(graph.nodes,params.property),//0,
					type:"integer",
					min:(graph,params)=>{if(params.property in graph.vertices)return minPropertyValue(graph.vertices,params.property);else return minPropertyValue(graph.edges,params.property);},
					max:(graph,params)=>{if(params.property in graph.vertices)return maxPropertyValue(graph.vertices,params.property);else return maxPropertyValue(graph.edges,params.property);},
					func:(value,graph,params)=>{
						//graph.filterChanged=true;//hack
						//setTimeout(()=>G.display(G.graph),0);
					},
				},
				thicknessFactor:{
					value:0.5,type:"float",min:0,max:3,
				}
			},
			onUpdate:(graph,params)=>{
				//if(params){graph.colorScaleName=params.colorScaleName;}
				//G.view.sharedUniforms.colorList.needsUpdate=true;
				//G.view.sharedUniforms.nodeColorData.needsUpdate=true;
			},
			onDisable:(graph,params)=>{
				//delete graph.colorScaleName;
			},
			effects:{
				nodes:{
					color:[
						(data,oldValue,node,index,array,graph)=>{
							let value;
							let vertexID=G.subview.templates.nodes.getOriginalObjectID(graph,index);if(data.property in graph.vertices){value=graph.vertices[data.property][vertexID];}
							switch (data.operator){
								case "==":if(value==data.propertyValue){
									return greenColor;
								}break;
								case ">=":if(value>=data.propertyValue){return greenColor;}break;
								case "<=":if(value<=data.propertyValue){return greenColor;}break;
							}
						},
					]
				},
				links:{
					color:[
						(data,oldValue,link,index,array,graph)=>{
							let value;
							let edgeID=index;if(data.property in graph.edges){value=graph.edges[data.property][edgeID];}
							//let svalue=subview.nodes.colorValue[sID],tvalue=subview.nodes.colorValue[tID];
							switch (data.operator){
								case "==":if(value==data.propertyValue){return greenColor;}break;
								case ">=":if(value>=data.propertyValue){return greenColor;}break;
								case "<=":if(value<=data.propertyValue){return greenColor;}break;
							}
						},
					],
					thickness:[
						(data,oldValue,link,index,array,graph)=>{
							let value;
							let edgeID=index;if(data.property in graph.edges){value=graph.edges[data.property][edgeID];}
							//let svalue=subview.nodes.colorValue[sID],tvalue=subview.nodes.colorValue[tID];
							switch (data.operator){
								case "==":if(value==data.propertyValue){return oldValue*data.thicknessFactor;}break;
								case ">=":if(value>=data.propertyValue){return oldValue*data.thicknessFactor;}break;
								case "<=":if(value<=data.propertyValue){return oldValue*data.thicknessFactor;}break;
							}
						},
					],
				},
			},
		},
		DAGCover:{
			description:(graph,params)=>{
				let value;
				if(graph.heightProperty==params.property){value= "3D DAG Cover";}
				else{value= "DAG Cover";}
				if(params.showOther)value+=" with extra edges";
				return value;
			},
			onEnable:(graph,params)=>{//only applicable when both the vertices and edges have a property of the same name
				let items=[],candidates={};
				//if(graph.heightProperty){items.push("height");}
				for(let name in graph.vertices.properties){
					if(graph.vertices.properties[name].type!="int")continue;
					candidates[name]=true;
				}
				for(let name in graph.edges.properties){
					if(graph.edges.properties[name].type!="int")continue;
					if(candidates[name])items.push(name);
				}
				if(items.length==0){G.addLog("no valid vertex/edge property");return true;};
				graph.heightProperty=null;
				//prefer fragment/wave level
				let chosen=items[0];
				if(items.indexOf("waveLevel")>-1)chosen="waveLevel";
				if(items.indexOf("originalWaveLevel")>-1)chosen="originalWaveLevel";
				if(items.indexOf("fragment")>-1)chosen="fragment";
				graph.modifiers.nodeColor={property:chosen};
				if(graph.colorScaleName){graph.modifiers.nodeColor.colorScaleName=graph.colorScaleName;}
				G.subview.modifiers.nodeColor.needsUpdate=true;
				G.subview.onModifiersChanged('nodeColor');
				G.display(G.graph);
			},
			onDisable:(graph,params)=>{
				if(G.subview.vertexArrows){
					G.subview.vertexArrows.hide();
				}
			},
			onclick:(result,graph,params)=>{
				let objID=result.objectID,obj=result.viewObject;
				let originalObjectID=result.originalObjectID,originalObjectType=result.originalObjectType,originalObject=result.originalObject,originalObjects=result.originalObjects;
				if(result.originalObjectType=="vertices"&&graph.heightProperty==params.property){//
					let value=result.subview.nodes.height[result.objectID];
					//let value=graph.vertices[params.property][originalObjectID];
					if(params.focusVertex==originalObjectID){
						params.showOther=false;
						params.focusVertex=-1;
					}
					else{
						params.focusVertex=originalObjectID;
						params.otherMin=value;
						params.otherMax=value;
						params.showOther=true;
					}
					G.subview.onModifiersChanged('DAGCover');
				}
			},
			ondblclick:(result,graph,params)=>{
				let objID=result.objectID,obj=result.viewObject;
				let originalObjectID=result.originalObjectID,originalObjectType=result.originalObjectType,originalObject=result.originalObject,originalObjects=result.originalObjects;
				if(result.originalObjectType=="vertices"&&graph.heightProperty==params.property){//
					let value=result.subview.nodes.height[result.objectID];
					if(params.otherMin==originalObjectID&&params.otherMax==originalObjectID){
						params.showOther=false;
					}
					else{
						params.focusVertex=-1;
						params.otherMin=value;
						params.otherMax=value;
						params.showOther=true;
					}
					G.subview.onModifiersChanged('DAGCover');
				}
			},
			onUpdate:(graph,params)=>{
				//if(params)params.focusVertex=-1;
				G.view.sharedUniforms.nodeData.needsUpdate=true;
			},
			params:{
				property:{
					displayName:"input",
					value:(graph,params)=>{
						let items=[],candidates={};
						//if(graph.heightProperty){items.push("height");}
						for(let name in graph.vertices.properties){
							if(graph.vertices.properties[name].type!="int")continue;
							candidates[name]=true;
						}
						for(let name in graph.edges.properties){
							if(graph.edges.properties[name].type!="int")continue;
							if(candidates[name])items.push(name);
						}
						if(items.length==0)return "";
						if(items.indexOf("fragment")>-1)return "fragment";
						if(items.indexOf("originalWaveLevel")>-1)return "originalWaveLevel";
						if(items.indexOf("waveLevel")>-1)return "waveLevel";
						return items[0];
					},
					type:"select",
					options:(graph,params)=>{
						let items=[],candidates={};
						//if(graph.heightProperty){items.push("height");}
						for(let name in graph.vertices.properties){
							if(graph.vertices.properties[name].type!="int")continue;
							candidates[name]=true;
						}
						for(let name in graph.edges.properties){
							if(graph.edges.properties[name].type!="int")continue;
							if(candidates[name])items.push(name);
						}
						return items;
					},
				},
				DAGCover2D:{
					type:"button",
					func:(value,g,params)=>{
						if(!params.property)return;
						g.heightProperty=null;
						g.modifiers.nodeColor={property:params.property};
						G.subview.refreshModifierControls('nodeColor');
						//G.subview.onModifiersChanged('nodeColor');
						G.display(G.graph);
					}
				},
				DAGCover3D:{
					type:"button",
					func:(value,g,params)=>{
						if(!params.property)return;
						g.heightProperty=params.property;
						g.modifiers.nodeColor={property:params.property};
						G.subview.refreshModifierControls('nodeColor');
						G.display(G.graph);
					}
				},
				pumping:{
					type:"button",
					animationAcceleration:1.1,
					func:(value,g,params)=>{
						let max=maxPropertyValue(g.edges,params.property),min=minPropertyValue(g.edges,params.property);
						if(!params.showOther){
							params.showOther=true;params.dimLastOther=true;params.otherMin=max;params.otherMax=max;
						}
						else{
							if(params.otherMin==0)return;
							else{
								params.otherMax--;params.otherMin--;
								if(g.heightProperty==params.property)G.view.focusViewAtHeight(Math.floor((params.otherMax+params.otherMin)/2));
							}
							/*
							if(params.otherMin<params.otherMax){
								if(params.otherMax==0)return;
								else{
									params.otherMax--;
								}
							}
							else{
								params.otherMin--;
							}*/
						}
						G.subview.refreshModifierControls('DAGCover');
					}
				},
				pumpingCumulative:{
					type:"button",
					animationAcceleration:1.1,
					func:(value,g,params)=>{
						let max=maxPropertyValue(g.edges,params.property),min=minPropertyValue(g.edges,params.property);
						if(!params.showOther){
							params.showOther=true;params.otherMin=max;params.otherMax=max;
						}
						else{
							if(params.otherMin==0)return;
							else{
								params.otherMin--;
							}
						}
						G.subview.modifiers.nodeColor.needsUpdate=true;
						G.subview.onModifiersChanged('DAGCover');
					}
				},
				coverThreshold:{
					value:(graph,params)=>maxPropertyValue(graph.nodes,params.property),//0,
					type:"integer",
					min:(graph,params)=>{
						return minPropertyValue(graph.edges,params.property);
					},
					max:(graph,params)=>{
						return maxPropertyValue(graph.edges,params.property);
					},
				},
				showOther:{
					type:"boolean",value:false,
				},
				otherMin:{
					value:(graph,params)=>minPropertyValue(graph.nodes,params.property),//0,
					type:"integer",
					min:(graph,params)=>{
						return minPropertyValue(graph.edges,params.property);
					},
					max:(graph,params)=>{
						return maxPropertyValue(graph.edges,params.property);
					},
				},
				otherMax:{
					value:(graph,params)=>minPropertyValue(graph.nodes,params.property),//0,
					type:"integer",
					min:(graph,params)=>{
						return minPropertyValue(graph.edges,params.property);
					},
					max:(graph,params)=>{
						return maxPropertyValue(graph.edges,params.property);
					},
				},
				dimLastOther:{
					type:"boolean",value:false
				},
				focusVertex:{
					hidden:true,
					value:(graph,params)=>-1,//0,
					type:"integer",
					min:-1,
					max:(graph,params)=>{
						return graph.vertices.length;
					},
				},
				DAGCoverCCMetagraph:{
					type:"button",
					func:(value,g,params)=>{
						if(!params.property)return;
						params.showOther=false;
						//g.heightProperty=params.property;
						//g.modifiers.nodeColor={property:params.property};
						//G.subview.refreshModifierControls('nodeColor');
						G.display(G.graph);
						let subgraph=G.controls.drawVisibleSubgraph("DAGCover");
						let metagraph=G.analytics.getVertexCCMetagraph(subgraph,params.property);//from the new subgraph
						G.display(metagraph);
					}
				},
				showInternalEdges:{
					type:"select",value:true,options:[true,false,"last"],func:(value,g,params)=>{
						params.UFNeedsUpdate=true;
					}
				},
				
				connectingEdgeMap:{
					hidden:true,
					value:(graph,params)=>({}),
					type:"object",
				},
				connectingUF:{
					hidden:true,//used to temporarily store the CC information across parameter changes
					value:(graph,params)=>(new UnionFind(graph.vertices.length)),
					type:"object",
				},
				UFNeedsUpdate:{
					hidden:true,//used to temporarily store the CC information across parameter changes
					value:(graph,params)=>true,
					type:"boolean",
				},
				
				
				showConnectingEdges:{
					type:"boolean",value:true
				},
				
				showAllConnectingEdges:{
					type:"button",func:(value,g,params)=>{
						let eValues=g.edges[params.property],vValues=g.vertices[params.property];
						let ss=g.edges.source,ts=g.edges.target;
						let uf=params.connectingUF;let connectingEdgeMap=params.connectingEdgeMap;
						
						//try to connect every new CC touched to the best(local) neighbor
						let done=false;
						do{
							done=true;
							let candidates={};//ccID:{s:best source,t:best target,diff:lowest difference in value} - note that teh key is one CC's ID because a CC only neeeds to be merged to one best candidate CC, and if later the CC's target is already merged with it, just skip that connection - this can't happen if only the edges of one fragment is added at a time because all candidates go up from the same set; if more than one fragment is added at a time, a more global method is needed.
							for(let index=0;index<g.edges.length;index++){
								let value;
								let edgeID=index;if(params.property in g.edges){value=g.edges[params.property][edgeID];}
								let s=ss[index],t=ts[index];
								let sValue=vValues[s],tValue=vValues[t];
								if(((index in params.edgeMap)==false)){//&&params.otherMin<=value&&params.otherMax>=value
									let sCC=uf.find(s);//if(!candidates[sCC]){candidates[sCC]={s:null,t:null,diff:Infinity};}
									let tCC=uf.find(t);//if(!candidates[tCC]){candidates[tCC]={s:null,t:null,diff:Infinity};}
									if(sCC!=tCC){
										let diff=Math.abs(sValue-tValue);
										if((!candidates[sCC])||candidates[sCC].diff>diff){candidates[sCC]={s:s,t:t,index:index,diff:diff};done=false;}
										if((!candidates[tCC])||candidates[tCC].diff>diff){candidates[tCC]={s:s,t:t,index:index,diff:diff};done=false;}
									}
								}
							}
							for(let key in candidates){
								if(candidates[key].diff==Infinity){
									throw Error();//sanity check
								}
								let sCC=uf.find(candidates[key].s);
								let tCC=uf.find(candidates[key].t);
								if(sCC!=tCC){
									uf.link(candidates[key].s,candidates[key].t);
									connectingEdgeMap[candidates[key].index]=true;
								}
							}
						}
						while(!done);
						
					},
				},
				latentTopologyAllTargets:{
					value:(graph,params)=>true,
					type:"boolean",func:(value,g,params)=>{
						params.UFNeedsUpdate=true;
						params.connectingEdgeMap={};
					}
				},
				
				showLatentEdges:{
					type:"button",func:(value,g,params)=>{
						let eValues=g.edges[params.property],vValues=g.vertices[params.property];
						let ss=g.edges.source,ts=g.edges.target;
						let V=g.vertices.length;
						let uf=params.connectingUF;let connectingEdgeMap=params.connectingEdgeMap;
						
						//first start from the top set's CC, get each vertex's lowest clone/touched set, and for each touched set, connect one sample vertex from it and one sample vertex that touched it. after some ccs are connected, they are still eligible for connecting to their own lowest clones
						//first sort vertices by set ID; also get a list of vertices in each cc
						let sortedVertices=new Array(g.vertices.length);
						for(let i=0;i<V;i++){sortedVertices[i]=i;}
						sortedVertices.sort(compareBy((i)=>vValues[i],true));
						let ccs={};
						let ccids=[];
						for(let i=0;i<V;i++){let cc=uf.find(i);ccids[i]=cc;if(!ccs[cc])ccs[cc]=[];ccs[cc].push(i);}
						//then go from the highest set, check if the cc of the evrtex is handld, if not, go through all vertices in the cc and keep track of the different lowest sets and a sample vertex for each. can add these edges because ccs are already recorded.
						let processedCCs={};let extraEdges=[];
						for(let i of sortedVertices){
							let cc=uf.find(i);
							if(processedCCs[cc])continue;
							let lowestSets={};//each value is {sample:.., count:..}
							for(let v of ccs[cc]){
								let lowest=Infinity,lowestNeighbor=null,lowestNeighbors=[];
								for(let other of g.getNeighbors(v)){
									if(lowest>vValues[other]){lowest=vValues[other];lowestNeighbor=other;lowestNeighbors=[other];}
									if(lowest==vValues[other]){lowestNeighbors.push(other);}
								}
								if(!lowestSets[lowest]){lowestSets[lowest]={count:0,s:v,t:lowestNeighbor,ccs:{}};}
								lowestSets[lowest].count++;
								for(let other of lowestNeighbors){
									let lowestcc=ccids[other];
									if(!lowestSets[lowest].ccs[lowestcc]){lowestSets[lowest].ccs[lowestcc]={s:v,t:lowestNeighbor,count:1}}
									else{lowestSets[lowest].ccs[lowestcc].count++;}
								}
								
							}
							for(let key in lowestSets){
								let record=lowestSets[key];
								
								//
								if(params.latentTopologyAllTargets){
									for(let key in record.ccs){
										extraEdges.push(record.ccs[key]);
									}
								}
								else{extraEdges.push(record);}
								
								
							}
							processedCCs[cc]=true;
						}
						
						for(let record of extraEdges){
							let eid=g.getEdge(record.s,record.t);
							connectingEdgeMap[eid]=true;
							uf.link(record.s,record.t);
						}
						
					},
				},
				showLatentMetagraph:{
					type:"button",func:(value,g,params)=>{
						let eValues=g.edges[params.property],vValues=g.vertices[params.property];
						let ss=g.edges.source,ts=g.edges.target;
						let V=g.vertices.length;
						let uf=params.connectingUF;let connectingEdgeMap=params.connectingEdgeMap;
						
						//first start from the top set's CC, get each vertex's lowest clone/touched set, and for each touched set, connect one sample vertex from it and one sample vertex that touched it. after some ccs are connected, they are still eligible for connecting to their own lowest clones
						//first sort vertices by set ID; also get a list of vertices in each cc
						let sortedVertices=new Array(g.vertices.length);
						for(let i=0;i<V;i++){sortedVertices[i]=i;}
						sortedVertices.sort(compareBy((i)=>vValues[i],true));
						let ccs={};
						let ccids=[];
						for(let i=0;i<V;i++){let cc=uf.find(i);ccids[i]=cc;if(!ccs[cc])ccs[cc]=[];ccs[cc].push(i);}
						//then go from the highest set, check if the cc of the evrtex is handld, if not, go through all vertices in the cc and keep track of the different lowest sets and a sample vertex for each. can add these edges because ccs are already recorded.
						let processedCCs={};let extraEdges=[];
						for(let i of sortedVertices){
							let cc=uf.find(i);
							if(processedCCs[cc])continue;
							let lowestSets={};//each value is {sample:.., count:..}
							for(let v of ccs[cc]){
								let lowest=Infinity,lowestNeighbor=null,lowestNeighbors=[];
								for(let other of g.getNeighbors(v)){
									if(lowest>vValues[other]){lowest=vValues[other];lowestNeighbor=other;lowestNeighbors=[other];}
									if(lowest==vValues[other]){lowestNeighbors.push(other);}
								}
								if(!lowestSets[lowest]){lowestSets[lowest]={count:0,s:v,t:lowestNeighbor,ccs:{}};}
								lowestSets[lowest].count++;
								for(let other of lowestNeighbors){
									let lowestcc=ccids[other];
									if(!lowestSets[lowest].ccs[lowestcc]){lowestSets[lowest].ccs[lowestcc]={s:v,t:lowestNeighbor,count:1}}
									else{lowestSets[lowest].ccs[lowestcc].count++;}
								}
								
							}
							for(let key in lowestSets){
								let record=lowestSets[key];
								
								//
								if(params.latentTopologyAllTargets){
									for(let key in record.ccs){
										extraEdges.push(record.ccs[key]);
									}
								}
								else{extraEdges.push(record);}
								
								
							}
							processedCCs[cc]=true;
						}
						
						//metagraph
						let metagraph=new Graph();
						let newName=params.property+"Original";
						metagraph.vertices.addProperty("V");metagraph.vertices.addProperty(newName,"int");metagraph.vertices.addProperty("isMetanode");
						//metagraph.vertices.addProperty("E");
						metagraph.edges.addProperty("E");
						for(let cc in ccs){
							let v=metagraph.addVertex(cc);
							metagraph.vertices.V[v]=ccs[cc].length;
							let max=0;for(let oldv of ccs[cc]){if(max<vValues[oldv])max=vValues[oldv];}
							metagraph.vertices[newName][v]=max;
						}
						for(let record of extraEdges){
							let e=metagraph.addEdge(ccids[record.s],ccids[record.t]);
							metagraph.edges.E[e]=record.count;
						}
						metagraph.dataPath=g.dataPath+"/metagraphs/latentTopology";
						metagraph.originalGraph=g.dataPath;
						metagraph.nodeColorProperty=newName;
						G.display(metagraph);
					},
				},
				showTrapezoids:{
					type:"button",
					func:(value,g,params)=>{
						let data={};
						let eValues=g.edges[params.property],vValues=g.vertices[params.property];
						for(let vID=0;vID<g.vertices.length;vID++){
							let vValue=vValues[vID];
							if(vValue in data==false){data[vValue]={value:vValue,v:0,adj:{}};}
							data[vValue].v++;
							let adj=g.getAdjacencyMap(vID);
							for(let other in adj){
								let eID=adj[other];
								let v2=vValues[other];
								let eValue=eValues[eID];
								if(v2 in data[vValue].adj==false)data[vValue].adj[v2]=0;
								data[vValue].adj[v2]++;
							}
						}
						
						let cb=(d)=>{
							console.log(d);
							let set={};
							for(let vID=0;vID<g.vertices.length;vID++){
								let vValue=vValues[vID];
								if(params.vertexMap){//don't select invisible vertices
									if(vID in params.vertexMap){
										if(params.coverThreshold>params.vertexMap[vID])continue;
									}
									else if(params.showOther){
										if(params.otherMin>vValue||params.otherMax<vValue)continue;
									}
									else continue;
								}
								if(vValue==d.value){set[vID]=params.connectingUF.find(vID);}
							}
							G.selectVertices(set);
							/* //arrows
							if(!G.subview.vertexArrows){
								G.subview.vertexArrows=G.ui.addMarkers();
								G.subview.vertexArrows.viewportOnly=false;
								G.subview.vertexArrows.from="left";
								G.subview.vertexArrows.markerClass="graph-marker-left";
								G.subview.vertexArrows.getLabels=(arr)=>{
									return arr.map(()=>"\u2192");
								}
							}
							G.subview.vertexArrows.chosenVertices=set;
							G.subview.vertexArrows.show(true);
							*/
							//regions
							if(!G.subview.vertexRegions){
								G.subview.vertexRegions=G.ui.addRegionMarkers();
								//G.subview.vertexRegions.markerClass="graph-marker-left";
							}
							G.subview.vertexRegions.chosenVertices=set;
							G.subview.vertexRegions.show(true);
						};
						G.ui.showTrapezoids(data,true,cb);
					}
				},
				
			},
			data:{
				maxValue:(graph,params)=>maxPropertyValue(graph.vertices,params.property),
				vertexMap:(g,params)=>{//map from vertices in cover (which either have edges between vertices in two consecutive sets or in the same set) to its set ID
					let map={};
					//if a vertex is in cover, suppose its set is k, then it must have an edge (in set k) whose other endpoint is in set k+1, or it has an edge whose other endpoint is in set k-1(that means the edge must be in set k-1)
					//if an edge is in cover, its two endpoints values must differ by 1
					let eValues=g.edges[params.property],vValues=g.vertices[params.property];
					for(let vID=0;vID<g.vertices.length;vID++){
						let v=vValues[vID];
						let adj=g.getAdjacencyMap(vID);
						for(let other in adj){
							let eID=adj[other];
							let v2=vValues[other];
							let eValue=eValues[eID];
							if(v2==v-1){map[vID]=v;}//v2>0&&
							if(v2==v+1){map[vID]=v;}//v>0&&
							if(((params.showInternalEdges===true)&&(v2==v))||((params.showInternalEdges==="last")&&(v2==v)&&(v2==params.maxValue))){map[vID]=v;}//v>0&&
						}
					}
					return map;
				},
				edgeMap:(g,params)=>{//map from edges in cover (which have vertices in two consecutive sets, or both in the last set) to the lesser set ID
					let map={};
					//if an edge is in cover, its two endpoints values must differ by 1 or the same
					let eValues=g.edges[params.property],vValues=g.vertices[params.property];
					let ss=g.edges.source,ts=g.edges.target;
					for(let eID=0;eID<g.edges.length;eID++){
						let v=eValues[eID];let s=ss[eID],t=ts[eID];
						let v1=vValues[s];
						let v2=vValues[t];
						if(v1-v2==1){map[eID]=v2;}//v2>0&&
						if(v2-v1==1){map[eID]=v1;}//v1>0&&
						if(((params.showInternalEdges===true)&&(v2==v1))||((params.showInternalEdges==="last")&&(v2==v)&&(v2==params.maxValue))){//&&v2==params.maxValue
							map[eID]=v1;
						}
					}
					//should make sure to link the "normal" edges only once to save time
					if(params.UFNeedsUpdate){
						params.connectingUF=new UnionFind(g.vertices.length);
						let uf=params.connectingUF;
						for(let eID=0;eID<g.edges.length;eID++){
							let v=eValues[eID];let s=ss[eID],t=ts[eID];
							let v1=vValues[s];
							let v2=vValues[t];
							if(v1-v2==1){uf.link(s,t);}//v2>0&&
							if(v2-v1==1){uf.link(s,t);}//v1>0&&
							if(((params.showInternalEdges===true)&&(v2==v1))||((params.showInternalEdges==="last")&&(v2==v)&&(v2==params.maxValue))){//&&v2==params.maxValue
								uf.link(s,t);
							}
						}
						params.UFNeedsUpdate=false;
					}
					//need to compute the extra edges in one place, because adding extra edges as they are found may not look good because most small CCs may get attached to something dense instead of to the closest set it can attach to.
					if(params.showOther){
						let uf=params.connectingUF;let connectingEdgeMap=params.connectingEdgeMap;
						
						/*
						//naive method: connect whenever you see an edge between CCs
						for(let index=0;index<g.edges.length;index++){
							let value;
							let edgeID=index;if(params.property in g.edges){value=g.edges[params.property][edgeID];}
							let s=ss[index],t=ts[index];
							let sValue=vValues[s],tValue=vValues[t];
							if((index in map==false)&&params.otherMin<=value&&params.otherMax>=value){
								let sCC=uf.find(s);
								let tCC=uf.find(t);
								if(sCC!=tCC){
									uf.link(s,t);
									connectingEdgeMap[index]=true;
								}
								
							}
						}
						*/
						//try to connect every new CC touched to the best(local) neighbor
						
						let candidates={};//ccID:{s:best source,t:best target,diff:lowest difference in value} - note that teh key is one CC's ID because a CC only neeeds to be merged to one best candidate CC, and if later the CC's target is already merged with it, just skip that connection - this can't happen if only the edges of one fragment is added at a time because all candidates go up from the same set; if more than one fragment is added at a time, a more global method is needed.
						for(let index=0;index<g.edges.length;index++){
							let value;
							let edgeID=index;if(params.property in g.edges){value=g.edges[params.property][edgeID];}
							let s=ss[index],t=ts[index];
							let sValue=vValues[s],tValue=vValues[t];
							if((index in map==false)&&params.otherMin<=value&&params.otherMax>=value){
								let sCC=uf.find(s);
								let tCC=uf.find(t);
								if(sCC!=tCC){
									let diff=Math.abs(sValue-tValue);
									if((!candidates[sCC])||candidates[sCC].diff>diff){candidates[sCC]={s:s,t:t,index:index,diff:diff};}
									if((!candidates[tCC])||candidates[tCC].diff>diff){candidates[tCC]={s:s,t:t,index:index,diff:diff};}
								}
							}
						}
						for(let key in candidates){
							uf.link(candidates[key].s,candidates[key].t);
							connectingEdgeMap[candidates[key].index]=true;
						}
					}
					
					
					return map;
				},
			},
			effects:{
				nodes:{
					size:[
						(data,oldValue,node,index,array,graph)=>{
							return;
							//if(!data.vertexMap)return;
							let vertexID=G.subview.templates.nodes.getOriginalObjectID(graph,index);
							let value=graph.vertices[data.property][vertexID];
							if(vertexID in data.vertexMap){
								if(data.coverThreshold<=data.vertexMap[vertexID])return;
							}
							else if(data.showOther){
								if(data.otherMin<=value&&data.otherMax>=value)return;
							}
							return 0;
						}
					],
					charge:[
						(data,oldValue,node,index,array,graph)=>{
							return;
							let vertexID=G.subview.templates.nodes.getOriginalObjectID(graph,index);
							let value=graph.vertices[data.property][vertexID];
							if(vertexID in data.vertexMap){
								if(data.coverThreshold<=data.vertexMap[vertexID])return;
							}
							else if(data.showOther){
								if(data.otherMin<=value&&data.otherMax>=value)return;
							}
							return 0;
						}
					],
					color:[
						(data,oldValue,node,index,array,graph)=>{
							let vertexID=G.subview.templates.nodes.getOriginalObjectID(graph,index);
							let value=graph.vertices[data.property][vertexID];
							if(vertexID in data.vertexMap){
								return;
							}
							else if(data.showOther){
								return greyColor;
							}
							return;
						},
					]
				},
				links:{
					color:[
						(data,oldValue,link,index,array,graph)=>{
							let value;
							let edgeID=index;if(data.property in graph.edges){value=graph.edges[data.property][edgeID];}
							if(index in data.edgeMap){
								return;
							}
							else if(data.showOther){
								return greyColor;
							}
						},
					],
					brightness:[
						(data,oldValue,link,index,array,graph)=>{
							let value;
							let edgeID=index;if(data.property in graph.edges){value=graph.edges[data.property][edgeID];}
							let s=graph.edges.source[index],t=graph.edges.target[index];
							let sValue=graph.vertices[data.property][s];
							let tValue=graph.vertices[data.property][t];
							if(index in data.edgeMap){
								if(data.coverThreshold<=data.edgeMap[index])return;
							}
							else{
								if(data.connectingEdgeMap[index]&&data.showConnectingEdges)return;
								if(!data.showOther&&(data.focusVertex==-1))return 0;
								if(data.otherMin<=value&&data.otherMax>=value){
									
									if(data.focusVertex>-1){
										if((s!=data.focusVertex)&&(t!=data.focusVertex)){return 0;}
									}
									if(data.dimLastOther&&(data.otherMax!=data.otherMin)){
										if(value==data.otherMax)return oldValue*0.3;
									}
									return;
								}
								
								
							}
							return 0;
						},
					],
					strength:[
						(data,oldValue,link,index,array,graph)=>{
							let value;
							let s=graph.edges.source[index],t=graph.edges.target[index];
							let sValue=graph.vertices[data.property][s];
							let tValue=graph.vertices[data.property][t];
							let edgeID=index;if(data.property in graph.edges){value=graph.edges[data.property][edgeID];}
							if(index in data.edgeMap){
								if(data.coverThreshold<=data.edgeMap[index])return oldValue*2;
							}
							if(data.connectingEdgeMap[index]&&data.showConnectingEdges)return;
							if(!data.showOther&&(data.focusVertex==-1))return 0;
							else{
								if(data.otherMin<=value&&data.otherMax>=value){
									if(data.focusVertex>-1){
										if((s!=data.focusVertex)&&(t!=data.focusVertex)){return 0;}
									}
									return;
								}
							}
							
							return 0;
						},
					],
				},
			},
		},
		dimming:{
			params:{
				/*
				propertyType:{
					value:"vertices",
					type:"select",
					options:["vertices","edges"],
					func:(value,graph,params)=>{
						//setTimeout(()=>G.display(G.graph),0)
					},
				},
				*/
				property:{
					displayName:"input",
					value:(graph,params)=>{
						if(graph.nodes.height&&graph.nodes.height.length>0&&graph.nodes.height[0]!=undefined){return "height";}
						return "originalWaveLevel";
					},
					type:"select",
					options:(graph,params)=>{
						let items=[];
						if(graph.heightProperty){items.push("height");}
						for(let name in graph.edges.properties){
							if(name=="source"||name=="target")continue;
							items.push(name);
						}
						return items;
					},
					//["height","fixedPointLayer","wave","originalWaveLevel"],
					func:(value,graph,params)=>{
						G.addLog("value range updated");
						G.subview.refreshModifierControls("dimming");
					},
				},
				threshold:{
					value:(graph,params)=>maxPropertyValue(graph.nodes,params.property),//0,
					type:"integer",
					min:(graph,params)=>{
						if(params.property=="height") return minPropertyValue(graph.nodes,params.property);
						else return minPropertyValue(graph.edges,params.property);
					},
					//min:(graph,params)=>{return minPropertyValue(graph.nodes,"height");},
					max:(graph,params)=>{
						if(params.property=="height")return maxPropertyValue(graph.nodes,params.property);
						else return maxPropertyValue(graph.edges,params.property);
					},
					//max:(graph,params)=>{return maxPropertyValue(graph.nodes,"height");},
					func:(value,graph,params)=>{
						//graph.filterChanged=true;//hack
						//setTimeout(()=>G.display(G.graph),0);
					},
				},
				separate:{
					value:false,
					type:"boolean",
				},
				reverse:{
					value:false,
					type:"boolean",
				},
			},
			onUpdate:(graph,params)=>{
				G.view.sharedUniforms.layerHeights.needsUpdate=true;
			},
			onDisable:(graph,params)=>{
				G.view.sharedUniforms.layerHeights.needsUpdate=true;
			},
			data:{
				//max:(g,params)=>{if(params.property in g.nodes)return maxPropertyValue(g.nodes,params.property);else return maxPropertyValue(g.vertices,params.property);},
				//min:(g,params)=>{if(params.property in g.nodes)return minPropertyValue(g.nodes,params.property);else return minPropertyValue(g.vertices,params.property);},
			},
			effects:{
				nodes:{
					size:[
						(data,oldValue,node,index,array,graph)=>{
							let value;
							if(data.property=="height"){
								value=array.height[index];if(value===undefined)return;
								/*if(node&&(data.property in node))value=node[data.property];
								else if(data.property in array){value=array[data.property][index];}
								else {
									let vertexID=G.subview.templates.nodes.getOriginalObjectID(graph,index);if(data.property in graph.vertices){value=graph.vertices[data.property][vertexID];}
								}*/
								if(data.reverse){
									if(value>=data.threshold){return;}
									else{return oldValue*Math.max(Math.pow(2,Math.min(data.threshold-value,0)),0.1);}
								}
								else{
									if(value<=data.threshold){return;}
									else{return oldValue*Math.max(Math.pow(2,Math.min(value-data.threshold,0)),0.1);}
								}
							}
							else{
								
								if(data.property in graph.vertices){
									let vertexID=G.subview.templates.nodes.getOriginalObjectID(graph,index);
									value=graph.vertices[data.property][vertexID];
									if(value===undefined)return;
								}
								else {return;}//don't change node size for edge properties now
							}
							
							
							
						},
					]
				},
				links:{
					brightness:[
						(data,oldValue,link,index,array,subview)=>{
							//if(data.linkColoring=="default")return;
							
							let sID=array.source[index],tID=array.target[index];
							let value,svalue,tvalue;
							if(data.property=="height"){
								svalue=subview.nodes.height[sID],tvalue=subview.nodes.height[tID];//todo?
								if(svalue===undefined||tvalue===undefined)return;
							}
							else{//use edge property even if there's no height
								let realIndex=index;
								if(array.originalIndices){
									realIndex=array.originalIndices[index];
								}
								if(data.property in subview.edges){
									value=subview.edges[data.property][realIndex];
									if(value===undefined)return;
									svalue=value;
									tvalue=value;
								}
								else {
									//let sID=array.source[index],tID=array.target[index];
									//if(array.originalIndices){
									return;
								}//don't change link brightness for vertex properties now
							}
							if(data.reverse){
								if(svalue<=data.threshold&&tvalue<=data.threshold){return;}
								else{return oldValue*Math.max(Math.pow(2,data.threshold-svalue),Math.pow(2,data.threshold-tvalue),0.02);}
							}
							else{
								if(svalue>=data.threshold&&tvalue>=data.threshold){return;}
								else{return oldValue*Math.max(Math.pow(2,svalue-data.threshold),Math.pow(2,tvalue-data.threshold),0.02);}

							}
						},
					]
				},
			}
		},
		
		filter:{
			params:{
				property:{
					displayName:"input",
					value:"fixedPointLayer",
					type:"select",
					options:["wave","fixedPointLayer","waveLevel","originalWaveLevel"],//note these proeprties belong to nodes, not vertices. should all vertex-based modifiers be in subview?
					func:(value,graph,params)=>{
						G.addLog("value range updated");
						G.subview.refreshModifierControls("filter");
					},
				},
				propertyType:{
					displayName:"objects",
					value:"edges",
					type:"select",
					options:["vertices","edges"],//note these proeprties belong to nodes, not vertices. should all vertex-based modifiers be in subview?
					func:(value,graph,params)=>{
						//graph.filterChanged=true;//hack
						setTimeout(()=>G.display(G.graph),0)
					},
				},
				min:{
					value:0,
					type:"integer",
					min:(graph,params)=>{if(params.propertyType=="vertices")return minPropertyValue(graph.vertices,params.property);else return minPropertyValue(graph.edges,params.property);},
					max:(graph,params)=>{if(params.propertyType=="vertices")return maxPropertyValue(graph.vertices,params.property);else return maxPropertyValue(graph.edges,params.property);},
					func:(value,graph,params)=>{
						//graph.filterChanged=true;//hack
						setTimeout(()=>G.display(G.graph),0);
					},
				},
				max:{
					value:0,
					type:"integer",
					min:(graph,params)=>{if(params.propertyType=="vertices")return minPropertyValue(graph.vertices,params.property);else return minPropertyValue(graph.edges,params.property);},
					max:(graph,params)=>{if(params.propertyType=="vertices")return maxPropertyValue(graph.vertices,params.property);else return maxPropertyValue(graph.edges,params.property);},
					func:(value,graph,params)=>{
						//graph.filterChanged=true;//hack
						setTimeout(()=>G.display(G.graph),0)
					},
				},
			},
			onEnable:()=>{
				setTimeout(()=>G.display(G.graph),0)
			},
			onDisable:()=>{
				G.addLog("stopped filtering");
				setTimeout(()=>{G.display(G.graph)},0);
			},
			onUpdate:(graph,params)=>{
				if(!params)return;
				if(((!graph.heightProperty)&&(params.propertyType=="vertices"))||(graph.heightProperty&&(graph.heightProperty==params.property))){
					G.addLog("filtering by "+toNormalText(params.property)+": "+params.min+" to "+params.max);
				}
				else{
					G.addLog("please select a valid property to filter by ");
				}
				
				//if(graph.filterChanged){
				//	graph.filterChanged=false;
				//	G.display(G.graph);
				//}
				
				//for(let name in G.view.sharedUniforms)G.view.sharedUniforms[name].needsUpdate=true;
			},
			effects:{
				
			}
		},
		
		subgraphRange:{//actually this helps the user load different union graphs, instead of modifying the view of the current graph. I didin't remove the filter because this subgraph union would only work for edge partitioned subgraphs
			onEnable:(g,params)=>{//graphs without a subgraph type cannot have this modifier
				if(!g.subgraphType){return true;}
				if(!G.getGraph(g.wholeGraph).subgraphs[g.subgraphType].fullSummary){
					d3.json("datasets/"+G.getGraph(g.wholeGraph).dataPath+"/"+g.subgraphType+"/fullSummary.json.gz")
					.then((data)=>{G.getGraph(g.wholeGraph).subgraphs[g.subgraphType].fullSummary=data;});
				}
			},
			params:{
				//we always use the subgraph type of g, no choosing here?
				min:{
					value:(graph,params)=>{if(graph.subgraphID)return graph.subgraphID;return graph.subgraphIDMin},
					type:"integer",
					lazy:true,
					min:(graph,params)=>{return G.getGraph(graph.wholeGraph).subgraphs[graph.subgraphType].min;},
					max:(graph,params)=>{return G.getGraph(graph.wholeGraph).subgraphs[graph.subgraphType].max;},
					func:(value,graph,params)=>{
						if(params.max<params.min)return true;//todo: maybe disable the graph update in this case, but should allow the UI change because it's annoying to not let the user §§§§drag all the way to the start if he wanted to start over; or at least change min/max to be consistent
						if(params.IPWindow){
							let IP=params.IP,realMax;
							let fullSummary=G.getGraph(graph.wholeGraph).subgraphs[graph.subgraphType].fullSummary;
							if(!fullSummary){G.addLog("please wait for the subgraph summary to load");return true;}
							//cannot assume that index in fullsummary is the subgraph ID because of non-contiguous IDs like layer, but currently we can assume that fullsummary is sorted by subgraphID
							let start=fullSummary.findIndex(x=>x.subgraphID>=params.min);
							let total=0,index;
							for(index=start;total<=IP&&index<fullSummary.length;index++){
								total+=fullSummary[index].edges;
							}
							if(index==start){realMax=fullSummary[start].subgraphID;}//show a big subgraph anyway; note that max might not be a real subgraphID
							else{realMax=fullSummary[index-1].subgraphID;}
							params.max=realMax;
						}
					},
				},
				max:{
					value:(graph,params)=>{if(graph.subgraphID)return graph.subgraphID;return graph.subgraphIDMax},
					type:"integer",
					lazy:true,
					min:(graph,params)=>{return G.getGraph(graph.wholeGraph).subgraphs[graph.subgraphType].min;},
					max:(graph,params)=>{return G.getGraph(graph.wholeGraph).subgraphs[graph.subgraphType].max;},
					func:(value,graph,params)=>{
						if(params.max<params.min)return true;
						if(params.IPWindow){
							let IP=params.IP,realMin;
							let fullSummary=G.getGraph(graph.wholeGraph).subgraphs[graph.subgraphType].fullSummary;
							if(!fullSummary){G.addLog("please wait for the subgraph summary to load");return true;}
							//cannot assume that index in fullsummary is the subgraph ID because of non-contiguous IDs like layer, but currently we can assume that fullsummary is sorted by subgraphID
							let start=fullSummary.findIndex(x=>x.subgraphID>=params.max);
							if(fullSummary[start].subgraphID>params.max)start--;
							let total=0,index;
							for(index=start;total<=IP&&index>=0;index--){
								total+=fullSummary[index].edges;
							}
							if(index==start){realMin=fullSummary[start].subgraphID;}//show a big subgraph anyway; note that max might not be a real subgraphID
							else{realMin=fullSummary[index+1].subgraphID;}
							params.min=realMin;
						}
					},
				},
				IPWindow:{type:"boolean"},
				IP:{type:"select",options:[4096,8192,16384,32768],value:32768,},
				pinPrevious:{type:"boolean"},
				slowPrevious:{type:"boolean",func:()=>{G.view.sharedUniforms.nodePriorityData.needsUpdate=true;}},
				slowFactorExp:{type:"integer",value:2,min:0,max:10,func:()=>{G.view.sharedUniforms.nodePriorityData.needsUpdate=true;}},
			},
			data:{
				propertyName:(graph,params)=>{
					let newPropertyName=graph.subgraphType;
					if(graph.subgraphType=="CC")newPropertyName="cc";
					if(graph.subgraphType=="layer")newPropertyName="fixedPointLayer";
					if(graph.subgraphType=="level")newPropertyName="originalWaveLevel";
					return newPropertyName;
				},
				slowFactor:(graph,params)=>{
					return Math.pow(2,params.slowFactorExp);
				},
			},
			
			onUpdate:(graph,params)=>{
				if(!params)return;
				
				
				if(params.max<params.min){return true};
				if(("subgraphID" in graph)&&(params.max==graph.subgraphID)&&(params.min==graph.subgraphID))return;
				if(("subgraphIDMax" in graph)&&(params.max==graph.subgraphIDMax)&&(params.min==graph.subgraphIDMin))return;
				
				
				let subgraphIDs=[];
				let subgraphStats=G.getGraph(graph.wholeGraph).subgraphs[graph.subgraphType];
				if(subgraphStats.buckets&&subgraphStats.buckets.length==0){
					subgraphIDs=subgraphStats.unbucketed.filter((x)=>(x<=params.max&&x>=params.min)).sort(compareBy(x=>Number(x),true));
				}
				else{
					for(let i=params.min;i<=params.max;i++){subgraphIDs.push(i);}
				}
				let newPath=graph.wholeGraph+"/"+graph.subgraphType+"/"+subgraphIDs.join("+");
				if(newPath==graph.dataPath)return;//avoid updating if it's the same graph
				G.load(newPath).then((newGraph)=>{
					if(!newGraph)return;
					/*let newPropertyName=graph.subgraphType;
					if(graph.subgraphType=="CC")newPropertyName="cc";
					if(graph.subgraphType=="layer")newPropertyName="fixedPointLayer";
					if(graph.subgraphType=="level")newPropertyName="originalWaveLevel";
					*/
					let newPropertyName=params.propertyName;
					let oldMax=("subgraphIDMax" in graph)?graph.subgraphIDMax:graph.subgraphID;
					let oldMin=("subgraphIDMin" in graph)?graph.subgraphIDMin:graph.subgraphID;
					params.oldMax=oldMax;
					params.oldMin=oldMin;
					if(graph.heightProperty){
						newGraph.heightProperty=graph.heightProperty;
						if(graph.heightPropertyTypeHint){newGraph.heightPropertyTypeHint=graph.heightPropertyTypeHint;}
						//when heights are active, enable dimming automatically?
						//if the new subgraphs have higher ID, then they are at the top and we dim what;s below; otherwise dim what's at the top?
						
						if(graph.modifiers.dimming){//only if it was already using dimming
							if(!newGraph.modifiers)newGraph.modifiers={};newGraph.modifiers.dimming=copyObj(graph.modifiers.dimming);
							if(params.max>oldMax){
								newGraph.modifiers.dimming.threshold=oldMax+1;newGraph.modifiers.dimming.reverse=false;
							}
							else if(params.min<oldMin){
								newGraph.modifiers.dimming.threshold=oldMin-1;newGraph.modifiers.dimming.reverse=true;
							}
							else{
								//then the range decreased; don't dim anything but keep the modifier active
								newGraph.modifiers.dimming.threshold=params.min;newGraph.modifiers.dimming.reverse=false;
							}
						}
					}
					else if(("subgraphID" in graph)&&(newPropertyName in G.analytics.templates.edges.properties)){//add a natural height if the orignal is a single subgraph and if the property is a known one 
						newGraph.heightProperty=newPropertyName;
						newGraph.heightPropertyTypeHint="edges";
					}
					
					if(!newGraph.modifiers)newGraph.modifiers={};
					if(!newGraph.modifiers.subgraphRange)newGraph.modifiers.subgraphRange={};
					Object.assign(newGraph.modifiers.subgraphRange,params);
					//newGraph.modifiers.subgraphRange.max=params.max;
					//newGraph.modifiers.subgraphRange.min=params.min;
					if(graph.modifiers.nodeColor){newGraph.modifiers.nodeColor=copyObj(graph.modifiers.nodeColor);}
					if(graph.colorScaleName){newGraph.colorScaleName=graph.colorScaleName;}
					if(graph.cloneProperty){newGraph.cloneProperty=graph.cloneProperty;}
					else{newGraph.cloneProperty=newPropertyName;}
					setTimeout(()=>{G.display(newGraph,{noMoveCamera:true});G.addLog("showing subgraph "+params.min+" to "+params.max);},0);
				});
				
				
			},
			effects:{
				nodes:{
					pinned:[
						(data,oldValue,node,index,array,graph)=>{
							if(!data.pinPrevious)return;
							let newPropertyName=data.propertyName;
							if(!graph.vertices[newPropertyName])return;//only one subgraph
							let vertexID=G.subview.templates.nodes.getOriginalObjectID(graph,index);
							if("oldMin" in data){
								let value=graph.vertices[newPropertyName][vertexID];
								if(value<=data.oldMax&&value>=data.oldMin){
									return true;
								}

							}
						}
					],
					forceEffectiveness:[
						(data,oldValue,node,index,array,graph)=>{
							if(!data.slowPrevious)return;
							let newPropertyName=data.propertyName;
							if(!graph.vertices[newPropertyName])return;//only one subgraph
							let vertexID=G.subview.templates.nodes.getOriginalObjectID(graph,index);
							if("oldMin" in data){
								let value=graph.vertices[newPropertyName][vertexID];
								if(value<=data.oldMax&&value>=data.oldMin){
									return data.slowFactor;
								}

							}
						}
					],
				}
				
			}
		},
		
		sparsenet:{
			//condition:()=>(G.showingSparseNet&&G.graph.snPaths),//G.graph.snPaths
			onEnable:(g,params)=>{
				if(!g.snPaths){G.analytics.showSparseNet(g);return true;}
			},
			onUpdate:(graph,params)=>{
				G.view.sharedUniforms.edgeList.needsUpdate=true;
				G.view.sharedUniforms.nodePinData.needsUpdate=true;
				G.view.sharedUniforms.clusteringData.needsUpdate=true;
				G.view.sharedUniforms.nodePriorityData.needsUpdate=true;
			},
			params:{
				pathSequence:{
					value:(g,params)=>g.snPaths.length,
					type:"integer",
					min:(g,params)=>1,
					max:(g,params)=>g.snPaths.length,
					func:(value,graph,params)=>{
						//to avoid annoying need to adjust that again
						params.attachmentSequence=value;
						G.subview.refreshModifierControls("sparsenet");
						
					},//must update the attachmentSequence range
				},
				attachmentSequence:{//affects the display of worms, etc
					value:(g,params)=>params.pathSequence,
					type:"integer",
					min:(g,params)=>0,
					max:(g,params)=>params.pathSequence,
				},
				showPathColors:{type:"boolean",value:true,},
				randomPathColors:{type:"boolean",value:false,},
				
				pinned:{type:"boolean",value:false,},
				unpinLastPath:{type:"boolean",value:false,},
				enableForce:{type:"boolean",value:true,},
				prioritizeSNForce:{type:"boolean",value:true,},
				hideOtherLinks:{type:"boolean",value:true,},
				showWorms:{type:"boolean",value:false,},
				showPathAssignment:{type:"boolean",value:false,},//will show all edges between other vertices and the path it's asigned to, with teh color of that path. (unlike showing worms, which may show edges between a vertex and multiple paths
				
				showClustering:{type:"boolean",value:true,},
				clusteringType:{
					type:"select",value:"landmarks",
					options:["landmarks","endpoints","all points"],
				},
				clusteringLinks:{type:"boolean",value:false,},//highlight links to the center in green(?)no matter what type of clustering is used
				//clustering has three methods: using landmarks without intersections, using landmarks with intersections, and using all points on paths (assigning other vertices to the best neighboring path). This only affects forces, not colors
				
				clear:{type:"button",func:(g)=>{
					G.disableModifier("sparsenet",g);
					delete g.snPaths;
				},},
				
			},
			data:{
				paths:(g,params)=>{
					let snPaths=g.snPaths;
					//let ratio=G.controls.get("snPathSequenceRatio",1);//hide those after this ratio
					//let count=Math.ceil(snPaths.length*ratio);
					params.attachmentSequence=Math.floor(params.attachmentSequence);//hack
					return snPaths.slice(0,params.pathSequence);
				},
				randomNumbers:(g,params)=>{return params.paths.map(()=>Math.random());},
				pathColors:(g,params)=>{
					if(!params.showPathColors){return new Array(params.paths.length).fill(redColor);}//to avoid red?
					if(params.randomPathColors){return params.paths.map((path,i)=>{if(i==0)return redColor;let c=new THREE.Color();c.setHSL(params.randomNumbers[i]*0.7+0.15,1,0.5);return c;})}
					else{return params.paths.map((path,i)=>{if(i==0)return redColor;let c=new THREE.Color();c.setHSL(((i/(params.paths.length))*0.7+0.1),1,0.5);return c;})}
				},
				vertexPaths:(g,params)=>{
					let paths=params.paths;let snPathMap={};//map from in-net vertices to their path IDs
					for(let pathID=0;pathID<paths.length;pathID++){
						let path=paths[pathID];
						for(let i=0;i<path.length;i++){
							let tempID=path[i];
							let vertex=g.vertices[tempID];
							if(tempID in snPathMap){snPathMap[tempID].push(pathID);}
							else{snPathMap[tempID]=[pathID];}
						}
					}
					return snPathMap;
				},
				edgePaths:(g,params)=>{
					let paths=params.paths;let snPathEdgeMap={};
					for(let pathID=0;pathID<paths.length;pathID++){
						let path=paths[pathID];
						for(let i=0;i<path.length;i++){
							let tempID=path[i];
							let vertex=g.vertices[tempID];
							if(i>0){
								snPathEdgeMap[g.vertices.edges[tempID][path[i-1]]]=pathID;
							}
						}
					}
					return snPathEdgeMap;
				},
				centers:(g,params)=>{
					let centers={},paths=params.paths;
					//should it ignore later paths according to attachmentSequence?
					//for(let i=0;i<paths.length;i++){
					for(let i=0;i<params.attachmentSequence;i++){
						let path=paths[i];
						centers[path[path.length-1]]=true;
						if((i==0)||(params.clusteringType=="endpoints"))centers[path[0]]=true;
						if(params.clusteringType=="all points"){for(let id of path){centers[id]=true;}}
					}
					return centers;
				},
				pathAssignment:(g,params)=>{
					let pathAssignment={};
					for(let vID=0;vID<g.vertices.length;vID++){
						if(vID in params.vertexPaths)continue;
						let pathCounters={};
						for(let other in g.vertices.edges[vID]){
							if(other in params.vertexPaths){
								for(let pathID of params.vertexPaths[other]){
									if(pathID>=params.attachmentSequence)continue;
									if(!pathCounters[pathID])pathCounters[pathID]=0;pathCounters[pathID]++;
								}
							}
						}
						let max=0,bestPathID=null;
						for(let pathID in pathCounters){if(pathCounters[pathID]>max){max=pathCounters[pathID];bestPathID=pathID;}}
						if(bestPathID!=null)pathAssignment[vID]=Number(bestPathID);
					}
					return pathAssignment;
				},
				clustering:(g,params)=>{//get the shortest path network from the centers, do not recompute the shortest path from every vertex
					let clustering={};//params.cnters already ignores paths using params.attachmentSequence
					if(params.clusteringType!="all points"){
						let pathFunc=G.algorithms.shortestPath(g,params.centers).pathFunc;
						for(let i=0;i< g.vertices.length;i++){
							if(i in params.vertexPaths)continue;//don't cluster the SN
							let path=pathFunc(i);
							if(path){
								let closestLandmark=path[0];//now last one is the target, first one is the source
								if(closestLandmark!=i){clustering[i]=closestLandmark;}
							}
						}
					}
					else{
						let pathAssignment=params.pathAssignment;
						for(let vID=0;vID<g.vertices.length;vID++){
							let vertex=g.vertices[vID];
							if(pathAssignment[vID]!=undefined){
								let path=params.paths[pathAssignment[vID]],candidates=[];//total=0,count=0;
								for(let i=0;i<path.length;i++){
									let target=path[i];
									if(target in g.vertices.edges[vID]){
										candidates.push(i);
									}
								}
								let avg=(candidates.length-1)/2,index;
								if(Math.random()>0.5){index=Math.floor(avg);}//get the midpoint of all connections on the path
								else{index=Math.ceil(avg);}
								clustering[vID]=path[candidates[index]];//path[index]
								if(clustering[vID]===undefined)throw Error();//funny bug: sometimes a node belongs to a path, but is connected to two centers on it with distance 2, and there's no edge to the center in the middle. If I assign the node to the mean of the connected centers on its path, it will look as if it's not clustered around anything because the middle edge doesn't exist. I need to cluster it around a center it does have an edge to.
								if((clustering[vID] in g.vertices.edges[vID])==false)throw Error();
							}
						}
					}
					return clustering;
				},
				edgeClustering:(g,data)=>{//edge from a vertex to its cluster cenetr (value is 1 if the target is teh cluster cenetr, -1 otehrwise)
					return g.edges.map((edge,edgeID,edges)=>{
						let svID=g.edges.source[edgeID],tvID=g.edges.target[edgeID];
						if(data.clustering[svID]==tvID)return 1;
						if(data.clustering[tvID]==svID)return -1;
					});
				},
				edgePathAssignment:(g,data)=>{//edge from a vertex to a path it's assigned to
					return g.edges.map((edge,edgeID,edges)=>{
						let svID=g.edges.source[edgeID],tvID=g.edges.target[edgeID];
						let center,other,pathID;
						if(svID in data.vertexPaths){
							if(data.pathAssignment[tvID]!==undefined&&(data.vertexPaths[svID].indexOf(data.pathAssignment[tvID])!=-1)){
								center=svID;other=tvID;pathID=data.pathAssignment[tvID];
							}
						}
						else if(tvID in data.vertexPaths){
							if(data.pathAssignment[svID]!==undefined&&(data.vertexPaths[tvID].indexOf(data.pathAssignment[svID])!=-1)){
								center=tvID;other=svID;pathID=data.pathAssignment[svID];
							}
						}
						if(center!==undefined){
							return pathID;
						}
					});
				},
				edgeAdjacentToPath:(g,data)=>{
					return g.edges.map((edge,edgeID,edges)=>{
						let svID=g.edges.source[edgeID],tvID=g.edges.target[edgeID];
						if(svID in data.vertexPaths||tvID in data.vertexPaths){
							let pathIDs=[];let bothInPath=true;
							if(svID in data.vertexPaths){
								pathIDs=pathIDs.concat(data.vertexPaths[svID].filter((id)=>id<data.attachmentSequence));//vertexPaths[x] is an array!
							}
							else{bothInPath=false;}
							if(tvID in data.vertexPaths){pathIDs=pathIDs.concat(data.vertexPaths[tvID].filter((id)=>id<data.attachmentSequence));}
							else{bothInPath=false;}
							if(pathIDs.length==0){return;}//ignored due to attachmentSequence
							if(pathIDs.length==1){return pathIDs[0];}
							//edge touches multiple paths (could be betwen paths or has one vertex that's an intersection
							if(bothInPath)return -2;//between vertices on the path
							else return -1;//is an intersection
						}//if the edge is in a path it is still adjacent or not?
					});
				},
			},
			effects:{
				nodes:{
					size:[
						(data,oldValue,node,index,array,graph)=>{
							if(!data.vertexPaths)return;
							let vertexID=G.subview.templates.nodes.getOriginalObjectID(graph,index);
							if(data.hideOtherLinks){
								if(vertexID in data.vertexPaths)return;
								if(data.showClustering)return;
								if(data.showWorms||data.showPathAssignment){
									if(data.pathAssignment[vertexID]!==undefined&&(data.pathAssignment[vertexID]<=data.attachmentSequence))return;
								}
								return 0;
							}
						}
					//
					],
					pinned:[
						(data,oldValue,node,index,array,graph)=>{
							if(!data.vertexPaths)return;
							if(!data.pinned)return;
							let vertexID=G.subview.templates.nodes.getOriginalObjectID(graph,index);
							if(vertexID in data.vertexPaths){
								if(data.unpinLastPath){
									let lastPath=data.paths[data.paths.length-1];
									if(data.vertexPaths[vertexID].indexOf(data.paths.length-1)!=-1){
										if(data.paths.length==1||lastPath[lastPath.length-1]!=vertexID)return;//unpin if it's the first path or it's not the intersection point
									};
									//note: I don't want to unpin the intersection point if it's not the first path, since it should be pinned in another path, the last point is the intersection point
								}
								return true;
							}
						}
					],
					clusterCenter:[
						(data,oldValue,node,index,array,graph)=>{
							if(!data.showClustering)return;
							let vertexID=G.subview.templates.nodes.getOriginalObjectID(graph,index);
							let centerID=data.clustering[vertexID];
							if(data.clustering[vertexID]==undefined)return;
							return G.subview.templates.nodes.getViewObjectID(graph,centerID);
						}
					],
					forcePriority:[
						(data,oldValue,node,index,array,graph)=>{
							if(!data.vertexPaths)return;
							if(!data.enableForce)return;
							if(!data.prioritizeSNForce)return;
							let vertexID=G.subview.templates.nodes.getOriginalObjectID(graph,index);
							if(vertexID in data.vertexPaths){
								return 1;
							}
							return 0.5;
						}
					],
				},
				links:{
					color:[
						(data,oldValue,link,index,array,graph)=>{
							if(!data.edgePaths)return;
							if(index in data.edgePaths){return data.pathColors[data.edgePaths[index]];}
							else{
								let edgeID=index;//G.subview.templates.links.getOriginalObjectID(graph,index);
								let edge=graph.edges[edgeID],svID=graph.edges.source[edgeID],tvID=graph.edges.target[edgeID];
								//show clustering links as the highest priority
								if(data.clusteringLinks){
									if(data.edgeClustering[edgeID]!==undefined){return greenColor;}//is a link to the cluster center; can show even if clustering (forces) is not being used
								}
								if(data.showPathAssignment){//check if one of the endpoints is on teh path that the other is assigned to. This is not the same as path clustering, and can be shown even if the clustering is not using path assignment
									if(data.edgePathAssignment[edgeID]!==undefined)return data.pathColors[data.edgePathAssignment[edgeID]];
									//else it's not an assigned path link, see if it's on worms
								}
								if(data.showWorms){
									if(data.edgeAdjacentToPath[edgeID]!==undefined){
										let pathID=data.edgeAdjacentToPath[edgeID];
										if(pathID<0)return pinkColor;//edge touches multiple paths (could be betwen paths or has one vertex that's an intersection
										else return data.pathColors[pathID];
									}
								}
							}
						},
					],
					thickness:[
						(data,oldValue,link,index,array)=>{
							if(!data.edgePaths)return;
							if(index in data.edgePaths)return oldValue+G.controls.get("snPathThickness",3);
							else{//first see if it's shown for another reason, then return 0 if only paths are shown (it should be called hide other edges)
								if(data.clusteringLinks){if(data.edgeClustering[index]!==undefined){return;}}
								if(data.showPathAssignment){if(data.edgePathAssignment[index]!==undefined)return;}
								if(data.showWorms){if(data.edgeAdjacentToPath[index]!==undefined){return;}}
								if(data.hideOtherLinks)return 0;//showing other things overrides showing only paths?
							}
						},
					],
					brightness:[
						(data,oldValue,link,index,array)=>{
							if(!data.edgePaths)return;
							if(index in data.edgePaths)return oldValue+G.controls.get("snPathBrightness",3);
						},
					],
					strength:[
						(data,oldValue,link,index,array)=>{
							if(data.enableForce){
								let factor=G.controls.get("snStrengthFactor",3);
								if(index in data.edgePaths)return oldValue*factor;
								else {
									let v=oldValue/Math.max(factor,1);//the special edges should keep higher strength?
									if(data.clusteringLinks){if(data.edgeClustering[index]!==undefined){return ;}}
									if(data.showPathAssignment){if(data.edgePathAssignment[index]!==undefined)return ;}
									if(data.showWorms){if(data.edgeAdjacentToPath[index]!==undefined){
										if(data.edgeAdjacentToPath[index]!=-2)return;//is not a crossing edge
										else return v;//decrease crossing edge strength, because they tend to destroy the layout
									}}
									if(data.hideOtherLinks)return 0;//showing other things overrides showing only paths?
									return v;
								}
							}//this is the SN path strength
						},
					]
				}
			}
		},
		directions:{
			onEnable:(g,params)=>{
				
			},
			onUpdate:(graph,params)=>{
				G.view.sharedUniforms.edgeList.needsUpdate=true;
				G.view.sharedUniforms.nodePinData.needsUpdate=true;
				G.view.sharedUniforms.clusteringData.needsUpdate=true;
				G.view.sharedUniforms.nodePriorityData.needsUpdate=true;
			},
			params:{
				property:{
					displayName:"input",
					value:"waveLevel",
					type:"select",
					options:(graph,params)=>{
						let items=[];
						if(graph.heightProperty){items.push("height");}
						for(let name in graph.vertices.properties){
							if(graph.vertices.properties[name].type!="int")continue;
							items.push(name);
						}
						return items;
					},
					//["height","cloneCount","degree","originalWaveLevel","levelCCid"],//note these proeprties belong to nodes, not vertices. should all vertex-based modifiers be in subview?
				},
				ascending:{type:"boolean",value:false,},
				selectionOnly:{type:"boolean",value:true,},
				
				enabled:{type:"boolean",value:true,},
				
			},
			effects:{
				links:{
					direction:[
						(data,oldValue,link,index,array,graph)=>{
							if(!data.enabled)return;
							if(!graph.vertices[data.property])return;
							
							let values=graph.vertices[data.property];
							let edgeID=index;//G.subview.templates.links.getOriginalObjectID(graph,index);
							let edge=graph.edges[edgeID],svID=graph.edges.source[edgeID],tvID=graph.edges.target[edgeID];
							if(data.selectionOnly){
								if(svID in graph.selectedVertices==false)return;
								if(tvID in graph.selectedVertices==false)return;
							}
							let sValue=values[svID],tValue=values[tvID];
							if(data.ascending){
								if(sValue>tValue)return 1;if(sValue<tValue)return -1;return 0;
							}
							else{
								if(sValue>tValue)return -1;if(sValue<tValue)return 1;return 0;
							}
						},
					],
				},
			},
		},
		/*
		leaves:{
			params:{
				nextLeaf:{
					type:"button",
					func:()=>G.analytics.nextLeaf(),
					animationInterval:50,
				},
				clearLeaves:{
					type:"button",
					func:()=>G.analytics.clearLeaves(),
					animated:false
				},
				leafColors:{type:"boolean",value:true,},
				leafWaveColors:{type:"boolean",value:true,},
			},
			data:{
				layerObj:(graph)=>{
					let layer=G.activeLayer,g=G.graph,ls=g.layers;
					if(Object.keys(G.graph.layers).length==1){layer=Object.keys(G.graph.layers)[0];}
					let layerObj=ls[layer];//,nodes=ls[layer].nodes,links=ls[layer].links;
					return layerObj;
				}
			},
			effects:{
				
				links:{
					color:[
						(data,oldValue,link,index,array)=>{
							let result=new THREE.Color();
							if(G.leafColors&&("leafID" in link)){
								if(G.leafWaveColors){
									let layerObj=data.layerObj;//G.graph.layers[link.layer];
									let leafRatio=(layerObj.leaves[link.leafID].waveIndex/layerObj.leafWaveCount);
									result.setHSL(leafRatio,1,0.5);
								}
								else{
									if(G.leafRandomColors){result.setHSL(G.graph.layers[link.layer].leafRandomNumbers[link.leafID],1,0.5);}
									else{result.setHSL(link.leafID*0.85/(G.graph.layers[link.layer].leafCount+1),1,0.5);}
								}
								return result;
							}
							
						},
					],
					
					//thickness:[
					//	(data,oldValue,link,index,array)=>{if(link.index in data.edgePaths)return oldValue+G.snPathThickness;},
					//],
					//brightness:[
					//	(data,oldValue,link,index,array)=>{if(link.index in data.edgePaths)return oldValue+G.snPathBrightness;},
					//]
					
				}
			}
		},
		*/
	}
	
});

var pinkColor=new THREE.Color(255,127,127);