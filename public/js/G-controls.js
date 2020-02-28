G.addModule("controls",{

	
	
	init:function(){
	
		//top
		
		//this.addButton(getE("graph-strata-buttons-area"),"Strata",()=>{});
		
		
		//bottom
		let viewButtomsElem=getE("view-buttons-area");
		let semanticsButtomsElem=getE("graph-semantics-buttons-area");
		let styleControlsElem=getE("style-controls-area");
		
		function saveLayout(){
			let path=G.controls.graph.dataPath;
			if(path){
				let data=G.view.getVerticesPos();
				if(!data){G.addLog("failed to get layout");return;}
				G.messaging.sendCustomData("save",{type:"layout",path:path,data:data});
				G.addLog("saved");
			}
			else{
				G.addLog("error: the save path is unknown");
			}
		}
		G.saveLayout=saveLayout;
		
		function saveImage(){
			let path=this.graph.datasetID;//this.graph.dataPath;
			if(path){
				G.messaging.sendCustomData("save",{type:"image",path:path,data:G.renderer.domElement.toDataURL("image/png")});
				G.addLog("saved");
			}
			else{
				G.addLog("error: the save path is unknown");
			}
		}
		

		this.addDropdownMenu(viewButtomsElem,"view options",{
			reset:()=>G.view.resetView(),
			"2D/3D":()=>{if(G.heightFactor==0)G.heightFactor=1;else G.heightFactor=0;},
			"switch camera":()=>{
				if(G.camera==G.cameras.perspective){G.camera=G.cameras.orthographic;}
				else{G.camera=G.cameras.perspective;}
				G.renderPass.camera=G.camera;
			},
			"(un)pause":()=>{
					if(G.simulationRunning){G.simulationRunning=false;}//elem.textContent="resume";
					else {G.simulationRunning=true;}//elem.textContent="pause";
			},
			"save layout":saveLayout,
			"save image":saveImage,
			refresh:()=>{
				G.view.refreshStyles(true,true);
			},
		},{upward:true});
		
		
		
		this.addButton(semanticsButtomsElem,"vertex semantics",()=>{G.ui.showSemanticsText();});
		this.addButton(semanticsButtomsElem,"show labels",()=>{G.ui.showLabels()});
		
		//this.addSlider(styleControlsElem,"waves",(value)=>{G.controls.set("radialLimitFactor",value);},{min:1,max:60,default:1});
		this.addSlider(styleControlsElem,"vertical spread",(value)=>{G.controls.set("heightFactor",value);},{min:0,max:5,default:1,});
		this.addSlider(styleControlsElem,"horizontal spread",(value)=>{G.controls.set("radiusFactor",value);},{min:1,max:60,default:1});
		
		//minimal UI: height, width, node size, link brightness
		let minimalBar=getE("minimal-bar");
		let minimalBarSelection=d3.select(minimalBar);
		let minimalControlsElem=getE("minimal-style-controls-area");
		let minimalControlsSelection=d3.select(minimalControlsElem);
		minimalControlsSelection.on("mouseout",()=>{
			d3.event.stopPropagation();
			minimalBarSelection.transition().style("transform","translate(0%,40px)").style("opacity",0.3); 
		})
		minimalControlsSelection.on("mouseover",()=>{
			d3.event.stopPropagation();
			minimalBarSelection.transition().style("transform","translate(0%,0)").style("opacity",1);
		})
		//auto-minimize the sliders area
		
		this.addSlider(minimalControlsElem,"vertical spread",(value)=>{G.controls.set("heightFactor",value);},{long:true,min:0,max:5,default:1,});
		this.addSlider(minimalControlsElem,"horizontal spread",(value)=>{G.controls.set("radiusFactor",value);},{long:true,min:1,max:60,default:1});
		this.addSlider(minimalControlsElem,"node size",(value)=>{G.controls.set("nodeSizeFactor",value);},{long:true,min:0.1,max:10,default:1});
		this.addSlider(minimalControlsElem,"link brightness",(value)=>{G.controls.set("linkBrightnessFactor",value);},{long:true,min:0.1,max:5,default:1});
		this.addSlider(minimalControlsElem,"line brightness",(value)=>{G.controls.set("lineBrightnessFactor",value);},{long:true,min:0.1,max:20,default:1});
		this.addSlider(minimalControlsElem,"link strength",(value)=>{G.controls.set("linkStrengthFactor",value);},{long:true,min:1,max:500,default:10});
		
		
		//right side
		let controlsElem=getE("controls-menu");
		//make it auto-hide when not in use to save space
		let controlsElemSelection=d3.select(controlsElem);
		controlsElemSelection.on("mouseout",()=>{
			controlsElemSelection.transition().style("transform","translate(9%,0%)").style("opacity",0.3);
		})
		controlsElemSelection.on("mouseover",()=>{
			controlsElemSelection.transition().style("transform","translate(0%,0%)").style("opacity",1);
		})

		let explorationElem=getE("exploration-area");
		this.addDropdownMenu(controlsElem,"explore",{
			"prev":()=>G.showPreviousSiblingGraph(),
			"next":()=>G.showNextSiblingGraph(),
			"parent":()=>G.showMetagraph(),
			"auto explore":(value)=>{
				G.controls.set("exploringMetagraph",!G.controls.get("exploringMetagraph",false));
				G.controls.set("zoomToExpand",!G.controls.get("zoomToExpand",false));
			},
		});
		
		this.algorithms={
			"(original graph)":()=>{
				G.graph.heightProperty=null;
				delete G.graph.heightPropertyTypeHint;
				G.graph.embeddedWaveMap=null;
				G.graph.embeddedLevelMap=null;
				G.display(G.graph);
			},//todo
			"fixed point decoposition":()=>{
				G.graph.heightProperty="fixedPointLayer";G.display(G.graph);
			},
			//"waves metagraph":()=>{G.display(G.analytics.getWavesMetagraph());},
			//"waves CC metagraph":()=>{G.display(G.analytics.getWavesCCMetagraph());},
			//"layer CC metagraph":()=>{G.display(G.analytics.getLayerCCMetagraph());},
			//"rings metagraph":()=>{G.display(G.analytics.getRingsMetagraph());},
			//"complete rings metagraph":()=>{G.load(G.analytics.getRingsMetagraph(null,null,{complete:true}));},
			"wave levels":()=>{
				if(G.graph.vertices.originalWaveLevel){
					G.graph.heightProperty="originalWaveLevel";G.graph.heightPropertyTypeHint="vertices";
				}
				else{
					G.graph.heightProperty="waveLevel";G.graph.heightPropertyTypeHint="vertices";
				}
				G.display(G.graph);
			},
			"waves":()=>{
				G.graph.heightProperty="wave";G.graph.heightPropertyTypeHint="vertices";G.display(G.graph);
			},
			"wave map":()=>{
				G.display(G.graph.dataPath+"/metagraphs/waveMap");
			},
			
			"wave map 2":async ()=>{
				G.analytics.getWaveEdgeDecomposition(G.graph);
				G.graph.heightProperty="wave";
				G.graph.heightPropertyTypeHint="edges";
				let waveMapGraph=await G.loading.load(G.graph.dataPath+"/metagraphs/waveMap");
				if(!waveMapGraph){G.addLog("this graph is small, no wave map");return;}
				G.graph.embeddedWaveMap=waveMapGraph;
				//selects first wave that's displayable for larger graphs
				if(G.graph.vertices.length>8192){//16384 -1024 for testing
					let selectedWave=-1;
					let wavesMetagraph=await G.loading.load(G.graph.dataPath+"/metagraphs/wave2");
					for(let i=0;i<wavesMetagraph.vertices.length;i++){
						if(wavesMetagraph.vertices.V[i]<=8192){selectedWave=i;break;}
					}
					if(selectedWave>-1){
						let waveID=Number(wavesMetagraph.vertices.id[selectedWave]);
						if(!G.graph.modifiers){G.graph.modifiers={};}
						G.graph.modifiers.filter={property:"wave",propertyType:"edges",min:waveID,max:waveID};
					}
					else{
						G.addLog("warning: every wave is too large to be displayed, showing only the wave map");
						G.display(waveMapGraph);return;
					}
				}
				G.display(G.graph);
			},
			"level map metagraph":()=>{
				G.display(G.graph.dataPath+"/metagraphs/levelMap");
			},
			"levelMap":async ()=>{
				G.analytics.getLevelEdgeDecomposition(G.graph);
				G.graph.heightProperty="originalWaveLevel";
				G.graph.heightPropertyTypeHint="edges";
				let levelMapGraph=await G.loading.load(G.graph.dataPath+"/metagraphs/levelMap");
				if(!levelMapGraph){
					G.addLog("this graph is small, no level map");//return;
					G.display(G.graph);return;
				}
				G.graph.embeddedLevelMap=levelMapGraph;
				//selects first level that's displayable for larger graphs
				if(G.graph.vertices.length>8192){//16384 -1024 for testing
					let selectedLevel=-1;
					let levelsMetagraph=await G.loading.load(G.graph.dataPath+"/metagraphs/level");
					for(let i=0;i<levelsMetagraph.vertices.length;i++){
						if(levelsMetagraph.vertices.V[i]<=8192){selectedLevel=i;break;}
					}
					if(selectedLevel>-1){
						let levelID=Number(levelsMetagraph.vertices.id[selectedLevel]);
						if(!G.graph.modifiers){G.graph.modifiers={};}
						G.graph.modifiers.filter={property:"originalWaveLevel",propertyType:"edges",min:levelID,max:levelID};
					}
					else{
						G.addLog("warning: every level is too large to be displayed, showing only the level map");
						G.display(levelMapGraph);return;
					}
				}
				G.display(G.graph);
			},
			"X-ray":()=>{G.analytics.showXRay();},
			"wave edge decomposition":async ()=>{
				G.analytics.getWaveEdgeDecomposition(G.graph);
				G.graph.heightProperty="wave";
				G.graph.heightPropertyTypeHint="edges";
				
				//selects first wave that's displayable for larger graphs
				if(G.graph.vertices.length>1024){//16384 -1024 for testing
					let selectedWave=-1;
					let wavesMetagraph=await G.loading.load(G.graph.dataPath+"/metagraphs/wave2");
					for(let i=0;i<wavesMetagraph.vertices.length;i++){
						if(wavesMetagraph.vertices.V[i]<=1024){selectedWave=i;break;}
					}
					if(selectedWave>-1){
						let waveID=Number(wavesMetagraph.vertices.id[selectedWave]);
						if(!G.graph.modifiers){G.graph.modifiers={};}
						G.graph.modifiers.filter={property:"wave",propertyType:"edges",min:waveID,max:waveID};
					}
					else{
						G.addLog("warning: every wave is too large to be displayed");
						return;
					}
				}
				G.display(G.graph);
				
			},
			"level edge decomposition":()=>{
				if(G.graph.edges.originalWaveLevel){
					G.graph.heightProperty="originalWaveLevel";
					G.graph.heightPropertyTypeHint="edges";
					G.display(G.graph);
				}
				else{
					G.graph.heightProperty="waveLevel";
					G.graph.heightPropertyTypeHint="edges";
					G.display(G.graph);
					return;
				}
				
			},
			"iterative wave edge decomposition":()=>G.display(G.analytics.computeWaveEdgeDecomposition2(G.graph)),
			"region graph":()=>{
				if(G.graph.heightPropertyType!="edges"){G.addLog("error: there's no height information");return;}
				let result=G.analytics.getRegionGraph(G.graph);
				G.graph.representation="regionGraph";
				G.display(G.graph);
			},
			"region graph 1":()=>{
				if(G.graph.heightPropertyType!="edges"){G.addLog("error: there's no height information");return;}
				let result=G.analytics.getRegionGraph(G.graph,"distance1");
				G.graph.representation="regionGraph";
				G.display(G.graph);
				//G.display(G.graph);
			},
			"region graph all":()=>{
				if(G.graph.heightPropertyType!="edges"){G.addLog("error: there's no height information");return;}
				let result=G.analytics.getRegionGraph(G.graph,"all");
				G.graph.representation="regionGraph";
				G.display(G.graph);
			},
			"region graph custom":()=>{
				if(G.graph.heightPropertyType!="edges"){G.addLog("error: there's no height information");return;}
				let result=G.analytics.getRegionGraph(G.graph,{maxDistance:G.controls.get("regionMaxDistance")});
				G.graph.representation="regionGraph";
				G.display(G.graph);
			},
			"vertex partition CC metagraph":()=>{
				//if(!(G.graph.modifiers&&G.graph.modifiers.DAGCover)){G.addLog("please enable DAG Cover first");return;}
				//let name=G.graph.modifiers.DAGCover.property;
				if(!(G.graph.heightProperty&&(G.graph.heightProperty in G.graph.vertices))){G.addLog("please enable heights first");return;}
				let name=G.graph.heightProperty;
				let metagraph=G.analytics.getVertexCCMetagraph(G.graph,name);
				G.display(metagraph);
			},
			fragmentCCMetagraph:()=>{
				let prop="waveLevel";
				if("fragment" in G.graph.vertices){prop="fragment";}
				let metagraph=G.analytics.getVertexCCMetagraph(G.graph,prop); 
				G.display(metagraph);
			},
		};
		this.add("regionMaxDistance",1,{min:1,max:10,type:"integer",lazy:true},(value)=>{
			G.addLog("distance is "+value);
			if(G.graph.representation=="regionGraph"){
				if(G.graph.heightPropertyType!="edges"){G.addLog("error: there's no height information");return;}
				let result=G.analytics.getRegionGraph(G.graph,{maxDistance:value});
				if(G.view.graph&&G.view.graph.modifiers){//follow the old modifiers
					if(!result.modifiers)result.modifiers={};
					Object.assign(result.modifiers,G.view.graph.modifiers);
				}
				G.display(G.graph);
			}
		});
		let algsMenu=this.addDropdownMenu(controlsElem,"algorithms",this.algorithms);
		

		
									/*
									let layerNumbers=Object.keys(G.graph.layers).map((n)=>Number(n)).sort();
									let firstLayer=layerNumbers[0],lastLayer=layerNumbers[layerNumbers.length-1];
									let firstLayerNodes=arrayToMap(G.graph.layers[firstLayer].nodes.map((node)=>Number(node.original)));
									let lastLayerNodes=arrayToMap(G.graph.layers[lastLayer].nodes.map((node)=>Number(node.original)));
									let path=G.analytics.shortestPath(firstLayerNodes,lastLayerNodes);
									G.sparseNetPinned=true;
									G.view.sharedUniforms.nodePinData.needsUpdate=true;
									G.analytics.setSparseNet([path]);
									console.log(path,firstLayer+" to "+lastLayer);
									*/
									
		/*
		this.addButton(controlsElem,"levels animation",()=>{
			if(G.waveLayerFilter!==undefined){G.waveLayerFilter=undefined;G.view.modifiers.waveLayerFilter.needsUpdate=true;G.view.refreshSceneObjectStyles(true);}
			else{
				G.waveLayerFilter=0;G.waveLayerFilterReversed=false;G.showLastLayerEdges=false;G.showLastLayerExtraEdges=false;G.view.modifiers.waveLayerFilter.needsUpdate=true;G.view.refreshSceneObjectStyles(true);
				let interval=setInterval(cb,500);
				function cb(){
					if(G.waveLayerFilter!==undefined){
						if(!G.showLastLayerEdges)G.showLastLayerEdges=true;
						else{
							if(!G.showLastLayerExtraEdges)G.showLastLayerExtraEdges=true;
							else{
								G.waveLayerFilter++;G.showLastLayerEdges=false;G.showLastLayerExtraEdges=false;
								if(G.waveLayerFilter>G.graph.maxLayer){
									G.waveLayerFilter=undefined;
									//show shortest path between the first and last layers?
									
							
									let vc=G.graph.vertices.length;let options=null;if(vc>1024){options={variant:"approximate"};G.addLog("using approximate sparse net");}
									
									G.messaging.requestCustomData("sparsenet",G.analytics.getGraphVerticesAndEdges(),options,(result)=>{
										if(result&&result.length>0){
											G.sparseNetPinned=true;
											G.view.sharedUniforms.nodePinData.needsUpdate=true;
											G.analytics.setSparseNet(result.slice(0,1));
										}
										else{G.addLog("invalid sparsenet result");}
									});
								}
							}
						}
						console.log(G.waveLayerFilter+","+G.showLastLayerEdges+","+G.showLastLayerExtraEdges);
						G.view.modifiers.waveLayerFilter.needsUpdate=true;G.view.refreshSceneObjectStyles(true);
					}
					else clearInterval(interval);
				}
			}
		},()=>{
			if(G.waveLayerFilter!==undefined){G.waveLayerFilter=undefined;G.view.modifiers.waveLayerFilter.needsUpdate=true;G.view.refreshSceneObjectStyles(true);}
			else{
				G.waveLayerFilter=G.graph.maxLayer;G.waveLayerFilterReversed=true;G.showLastLayerEdges=false;G.showLastLayerExtraEdges=false;G.view.modifiers.waveLayerFilter.needsUpdate=true;G.view.refreshSceneObjectStyles(true);
				let interval=setInterval(cb,500);
				function cb(){
					if(G.waveLayerFilter!==undefined){
						if(!G.showLastLayerEdges)G.showLastLayerEdges=true;
						else{
							if(!G.showLastLayerExtraEdges)G.showLastLayerExtraEdges=true;
							else{
								G.waveLayerFilter--;G.showLastLayerEdges=false;G.showLastLayerExtraEdges=false;
								if(G.waveLayerFilter<0){
									G.waveLayerFilter=undefined;
									//show shortest path between the first and last layers?
									
								
									let vc=G.graph.vertices.length;let options=null;if(vc>1024){options={variant:"approximate"};G.addLog("using approximate sparse net");}
									G.messaging.requestCustomData("sparsenet",G.analytics.getGraphVerticesAndEdges(),options,(result)=>{
										if(result&&result.length>0){
											G.sparseNetPinned=true;
											G.view.sharedUniforms.nodePinData.needsUpdate=true;
											G.analytics.setSparseNet(result.slice(0,1));
										}
										else{G.addLog("invalid sparsenet result");}
									});
								}
							}
						}
						console.log(G.waveLayerFilter+","+G.showLastLayerEdges+","+G.showLastLayerExtraEdges);
						G.view.modifiers.waveLayerFilter.needsUpdate=true;G.view.refreshSceneObjectStyles(true);
					}
					else clearInterval(interval);
				}
			}
		});
		
		*/
		
		G.leafAnimation=true;
		//leafFolder.add(G, 'leafAnimation');
		G.leafAnimationInterval=50;
		//leafFolder.add(G, 'leafAnimationInterval', 50, 1000);
		G.leafColors=true;
		G.leafWaveColors=true;
		//this.addButton(controlsElem,"next leaf",()=>{G.analytics.nextLeaf();});
		//this.addButton(controlsElem,"clear leaves",()=>{G.analytics.clearLeaves();});
		
		
		G.useAABBForEllipses=true;
		
		//left side
		//let graphButtonsElem=getE("graph-buttons-area");
		getE("minimap").onclick=()=>G.showMetagraph();
		/*
		function showTools(){
			getE("graph-tools-area").style.display="block";
		}
		function hideTools(){
			getE("graph-tools-area").style.display="none";
		}
		this.addButton(getE("new-graph-menu"),"show tools",showTools);
		this.addButton(getE("graph-tools-area"),"hide tools",hideTools);
		*/
		
		//items bar
		let itemsTitleElem=getE("item-bar-title");
		let itemsElem=getE("item-bar");
		function saveGraph(obj,keepLayers=false){
			if(!this.graph)return;
			var item=document.createElement('div');
			itemsElem.appendChild(item);
			if(!obj)obj=G.analytics.getGraph(false,keepLayers);let v=Object.keys(obj.vertices).length,e=Object.keys(obj.edges).length,name=obj.name?(String(obj.name).substring(0,5)+"..."):"(unnamed)";
			item.textContent=name+" |V|:"+v+" p:"+String(e/(v*(v-1)/2)).substring(0,5);
			item.onclick=function(e){e.stopPropagation();G.load(this.__obj);}
			item.oncontextmenu=function(e){e.stopPropagation();e.preventDefault();itemsElem.removeChild(this);}
			item.__obj=obj;	
		};
		this.addButton(itemsTitleElem,"+",saveGraph,()=>saveGraph(false,true));
		
		let selectionButtonsElem=getE("selection-buttons-area");
		this.addButton(selectionButtonsElem,"select by ID",()=>{let value=getE('select-vertex-input').value;let result=this.graph.vertices.findIndex((v)=>(v.id==value));if(result!=-1)G.toggleSelectVertex(result);});
		
		let filteringElem=getE("subgraph-filtering-area");
		function getPredicate(){
			let value=getE('predicate-input').value;
			let result;
			try{result=eval(value);}
			catch(e){console.log(e.stack);}
			return result;
		}
		function getEdgeEndpointsPredicate(ignoreDirection=true){
			let value=getE('predicate-input').value;
			let value2=getE('predicate-input2').value;
			let result,result2;
			try{result=eval(value);result2=eval(value2);}
			catch(e){console.log(e.stack);}
			if(ignoreDirection)return (result&&result2)?((e)=>(result(e.source)&&result2(e.target))||(result(e.target)&&result2(e.source)) ):null;
			return (result&&result2)?((e)=>result(e.source)&&result2(e.target)):null;
		}
		function getEdgeEndpointsPropertyValuePredicate(name,value,value2,ignoreDirection=true){
			let result,result2;
			if(ignoreDirection)
				return ((e)=>(e.source[name]==value&&e.target[name]==value2)||(e.target[name]==value&&e.source[name]==value2));
			return (e)=>(e.source[name]==value&&e.target[name]==value2);
		}
		function getPropertyValuePredicate(name, value){
			//let name=getE('property-name-input').value;
			//let value=getE('property-value-input').value;
			let result=(obj)=>{return obj[name]==value;}
			return result;
		}
		function addSaveGraphButton(elem,name,func){
			G.controls.addButton(elem,name,()=>func(false),()=>func(true));
		}
		this.addButtonWithTextInputs(filteringElem,"vertex property",2,([prop,value],keepLayers)=>{
			let result=getPropertyValuePredicate(prop,value);
			if(typeof result=="function"){saveGraph(G.analytics.getSubgraphFromFilter(result,keepLayers));}
		},true);
		this.addButtonWithTextInputs(filteringElem,"edge property",2,([prop,value],keepLayers)=>{
			let result=getPropertyValuePredicate(prop,value);
			if(typeof result=="function"){saveGraph(G.analytics.getSubgraphFromEdgeFilter(result,keepLayers));}
		},true);	
		this.addButtonWithTextInputs(filteringElem,"edge endpoints property",3,([prop,value1,value2],keepLayers)=>{
			let result=getEdgeEndpointsPropertyValuePredicate(prop,value1,value2);
			if(typeof result=="function"){saveGraph(G.analytics.getSubgraphFromEdgeFilter(result,keepLayers));}
		});
		/*
		addSaveGraphButton(filteringElem,"vertex predicate",(keepLayers)=>{
			let result=getPredicate();
			if(typeof result=="function"){saveGraph(G.analytics.getSubgraphFromFilter(result,keepLayers));}
		});
		addSaveGraphButton(filteringElem,"edge predicate",(keepLayers)=>{
			let result=getPredicate();
			if(typeof result=="function"){saveGraph(G.analytics.getSubgraphFromEdgeFilter(result,keepLayers));}
		});
		addSaveGraphButton(filteringElem,"edge endpoints predicate",(keepLayers)=>{
			let result=getEdgeEndpointsPredicate();
			if(typeof result=="function"){saveGraph(G.analytics.getSubgraphFromEdgeFilter(result,keepLayers));}
		});
		*/
		
		
		let hideFunc=function(e){setTimeout(()=>this.style.display="none",2000);};
		//context menus with actions
		this.contextMenus={};
		this.contextMenus.vertices=document.createElement("div");
		document.body.appendChild(this.contextMenus.vertices);
		this.contextMenus.vertices.classList.add("tooltip");
		this.contextMenus.vertices.classList.add("context-menu");
		this.contextMenus.vertices.onmouseout=hideFunc;
		
		this.contextMenus.waveLayers=document.createElement("div");
		document.body.appendChild(this.contextMenus.waveLayers);
		this.contextMenus.waveLayers.classList.add("tooltip");
		this.contextMenus.waveLayers.classList.add("context-menu");
		this.contextMenus.waveLayers.onmouseout=hideFunc;
		
		this.contextMenus.empty=document.createElement("div");
		document.body.appendChild(this.contextMenus.empty);
		this.contextMenus.empty.classList.add("tooltip");
		this.contextMenus.empty.classList.add("context-menu");
		this.contextMenus.empty.onmouseout=hideFunc;

		
		this.addButton(this.contextMenus.vertices,"add to SN",()=>G.analytics.addVertexToSparseNet(this.contextMenuTarget.original));
		this.addButton(this.contextMenus.vertices,"draw subgraph by height",()=>{
			if(!this.graph||!this.graph.heightProperty){G.addLog("no heights detected");return;}
			let subgraph=Algs.getFilteredSubgraph(this.graph,this.graph.heightPropertyName,this.contextMenuTarget.height,this.graph.heightPropertyType);
			subgraph.dataPath=this.graph.dataPath+"/customSubgraph/0";
			subgraph.wholeGraph=this.graph.dataPath;
			subgraph.isCustom=true;
			G.loading.saveGraph(subgraph);
			G.display(subgraph);
			
		});
		this.addButton(this.contextMenus.vertices,"expand individually",()=>G.loading.expandVertex(this.contextMenuTarget.original,null,false));
		this.addButton(this.contextMenus.vertices,"expand in place",()=>G.loading.expandVertex(this.contextMenuTarget.original,null,true));
		
		this.addButton(this.contextMenus.waveLayers,"expand level",()=>{
			let level=this.contextMenuTarget.height;
			G.load(this.graph.expandLevel(level));
			/*let g=G.graph.expandedGraph;
			if(!g)return;
			let newGraph={};
			Object.assign(newGraph,g);
			let vMap={},vCount=0;
			
			newGraph.vertices=g.vertices.filter((v,i)=>{if(v.layer==layer){vMap[i]=vCount;vCount++;return true;}});
			if(newGraph.vertices.length>25000){G.addLog("Cannot show large level of "+newGraph.vertices.length+" vertices");return;}
			newGraph.edges=g.edges.filter((e)=>{
				if((Number(e.sl)==layer)&&(Number(e.tl)==layer)){
					return true;
				}
			}).map((e)=>{
				
				return {s:vMap[e.s],t:vMap[e.t],l:Math.min(Number(e.sl),Number(e.tl))};
			});
			
			newGraph.parent=G.graph;//g
			newGraph.name+=" level "+layer;
			newGraph.shortName+=" level "+layer;
			newGraph.noCalculateLayers=true;
			newGraph.getNextSiblingGraph=function(){
				
			}
			G.load(newGraph);*/
		});
		this.addButton(this.contextMenus.waveLayers,"set level range start",()=>{
			let layer=this.contextMenuTarget.layer;
			this.graph.startLayer=layer;G.view.refreshStyles(true,true);
		});
		this.addButton(this.contextMenus.waveLayers,"set level range end",()=>{
			let layer=this.contextMenuTarget.layer;
			this.graph.endLayer=layer;
			G.view.refreshStyles(true,true);
		});
		this.addButton(this.contextMenus.waveLayers,"expand level range",()=>{
			let startLayer=this.graph.startLayer,endLayer=this.graph.endLayer;
			if((startLayer==null)||(endLayer==null)){
				G.addLog("please select the range first");
				return;
			}
			if(startLayer>endLayer){G.addLog("Invalid range: the start layer is "+startLayer+" and the end layer is "+endLayer);return;}
			let g=this.graph.expandedGraph;
			if(!g)return;
			
			let newGraph={};
			Object.assign(newGraph,g);
			let vMap={},vCount=0;
			newGraph.vertices=g.vertices.filter((v,i)=>{if((v.layer>=startLayer)&&(v.layer<=endLayer)){vMap[i]=vCount;vCount++;return true;}});
			if(newGraph.vertices.length>25000){G.addLog("Cannot show large level range of "+newGraph.vertices.length+" vertices");return;}
			newGraph.edges=g.edges.filter((e)=>{
				let sl=Number(e.sl),tl=Number(e.tl);
				if(((sl>=startLayer)&&(sl<=endLayer))&&((tl>=startLayer)&&(tl<=endLayer))){
					return true;
				}
			}).map((e)=>{
				if(isNaN(Number(e.sl))||isNaN(Number(e.tl)))throw Error();
				return {s:vMap[e.s],t:vMap[e.t],l:Math.min(Number(e.sl),Number(e.tl))};
			});
			
			newGraph.parent=this.graph;
			newGraph.name+=" level "+startLayer+" to "+endLayer;
			newGraph.shortName+=" level "+startLayer+" to "+endLayer;
			newGraph.noCalculateLayers=true;
			G.load(newGraph);
		});
		let drawSubgraph=()=>{
			if(!this.graph)return;
			let subgraph=Algs.getInducedSubgraph(this.graph,this.graph.selectedVertices);
			subgraph.modifiers={};
			if(this.graph.modifiers.nodeColor){}
			if(this.graph.modifiers.nodeColor){subgraph.modifiers.nodeColor=copyObj(this.graph.modifiers.nodeColor);}
			if(this.graph.colorScaleName){subgraph.colorScaleName=this.graph.colorScaleName;}
			if(this.graph.cloneProperty){subgraph.cloneProperty=this.graph.cloneProperty;}
			if(this.graph.heightProperty){subgraph.heightProperty=this.graph.heightProperty;}
			if(this.graph.heightPropertyTypeHint){subgraph.heightPropertyTypeHint=this.graph.heightPropertyTypeHint;}
			subgraph.dataPath=this.graph.dataPath+"/customSubgraph/0";
			subgraph.wholeGraph=this.graph.dataPath;
			subgraph.isCustom=true;
			G.loading.saveGraph(subgraph);
			G.display(subgraph);
		}
		this.addButton(this.contextMenus.empty,"draw selected subgraph",drawSubgraph);
		this.addButton(this.contextMenus.empty,"go to parent",()=>G.showMetagraph());
		let togglePinSelection=()=>{
			if(!this.graph)return;
			for(let i in this.graph.selectedVertices){this.graph.vertices.userPinned[i]=!this.graph.vertices.userPinned[i];}
			G.view.refreshStyles(true,true);
		}
		this.addButton(this.contextMenus.empty,"(un)pin selected vertices",togglePinSelection);
		let unpinAllVertices=()=>{
			if(!this.graph)return;
			for(let i=0;i<this.graph.vertices.length;i++){this.graph.vertices.userPinned[i]=false;}
			G.view.refreshStyles(true,true);
		}
		this.addButton(this.contextMenus.empty,"unpin all vertices",unpinAllVertices);
		let drawVisibleSubgraph=(subgraphName="customSubgraph")=>{
			if(!this.graph||(!this.graph.links))return;
			let values=this.graph.links.brightness;
			if(this.graph.links.length!=this.graph.edges.length){return;}
			let subgraph=Algs.getFilteredSubgraph(this.graph,values,(x)=>(x!=0),"edges");
			//visible subgraph should be defined by visible edges; todo: handling if links do not correspond to all edges
			//add useful properties and height -- todo: should have a better way to distinguish between original data properties and other stuff we added like degree
			let str="";
			str+=", vertices: ";
			for(let name in this.graph.vertices.properties){
				if(G.analytics.templates.vertices.properties[name]&&G.analytics.templates.vertices.properties[name].isPartition){
					let values=this.graph.projectVertexProperty(subgraph,name);
					subgraph.vertices.addProperty(name,this.graph.vertices.properties[name].type,values);
					str+=name+", ";
				}
			}
			str+=", edges: ";
			for(let name in this.graph.edges.properties){
				if(G.analytics.templates.edges.properties[name]&&G.analytics.templates.edges.properties[name].isPartition){
					let values=this.graph.projectEdgeProperty(subgraph,name);
					subgraph.edges.addProperty(name,this.graph.edges.properties[name].type,values);
					str+=name+", ";
				}
			}
			console.log("added properties "+str);
			if(this.graph.heightProperty){
				subgraph.heightProperty=this.graph.heightProperty;
				if(this.graph.heightPropertyTypeHint){subgraph.heightPropertyTypeHint=this.graph.heightPropertyTypeHint;}
			}
			if(this.graph.modifiers&&this.graph.modifiers.nodeColor){
				if(!subgraph.modifiers)subgraph.modifiers={};
				subgraph.modifiers.nodeColor={};Object.assign(subgraph.modifiers.nodeColor,this.graph.modifiers.nodeColor);
			}
			subgraph.dataPath=this.graph.dataPath+"/"+subgraphName+"/0";
			subgraph.wholeGraph=this.graph.dataPath;
			subgraph.isCustom=true;
			G.loading.saveGraph(subgraph);
			G.display(subgraph);
			return subgraph;
		}
		this.drawVisibleSubgraph=drawVisibleSubgraph;
		this.addButton(this.contextMenus.empty,"draw visible subgraph",drawVisibleSubgraph);
		
		this.addKeyListener(G.canvasContainer,"!",drawSubgraph);
		this.addKeyListener(G.canvasContainer,"p",togglePinSelection);
		this.addKeyListener(G.canvasContainer," ",()=>{
			//unpause/pause, and also show labels if pausing, and hide labels if pausing (if it was paused for otehr reasons, G.ui.showLabels() wll not unpause)	
			if(G.simulationRunning){G.simulationRunning=false;}
			else {G.simulationRunning=true;}
					
		});
		this.addKeyListener(G.canvasContainer,"$",saveLayout);
		G.vertexLabels=G.ui.addMarkers();
		G.vertexLabels.getLabels=G.ui.getSemantics;
		this.addKeyListener(G.canvasContainer,"l",()=>{
			G.vertexLabels.show();
		});
		
		
		
		
		//old controls
		var gui = new dat.GUI({autoPlace:false});
		G.gui = gui;this.gui=gui;
		
		getE("style-menu").appendChild(gui.domElement);
		gui.domElement.style.zIndex=4;
		gui.domElement.style.width="100%";
				var graphFolder = gui.addFolder('Graph');//a few parameters that control the p in different ways - the plain p value is too imprecise in a slider when we want very small values, so I think adding np(or 1/n) and logn/n scales are better.
		G.analytics.edgeProbability=0.1;G.analytics.np=5;G.analytics.npOverLogn=5;G.analytics.vertexCount="100";//just default values; will be updated when the data is shown
		graphFolder.add(G.analytics, 'vertexCount', 0.00000001, 1).onFinishChange(function(value) {
			let n=parseInt(G.analytics.vertexCount);
			G.analytics.np=G.analytics.edgeProbability*n;
			G.analytics.npOverLogn=G.analytics.np/Math.log(n);
			G.display(G.analytics.randomGraph(n,G.analytics.edgeProbability));
		}).listen();
		graphFolder.add(G.analytics, 'edgeProbability', 0.00000001, 1).onFinishChange(function(value) {
			let n=G.graph.vertices.length;
			G.analytics.np=G.analytics.edgeProbability*n;
			G.analytics.npOverLogn=G.analytics.np/Math.log(n);
			G.display(G.analytics.randomGraph(n,G.analytics.edgeProbability));
		}).listen();
		graphFolder.add(G.analytics, 'np', 0, 10).onFinishChange(function(value) {
			
			let n=G.graph.vertices.length;
			G.analytics.edgeProbability=G.analytics.np/n;
			G.analytics.npOverLogn=G.analytics.np/Math.log(n);
			G.display(G.analytics.randomGraph(n,G.analytics.edgeProbability));
		}).listen();
		graphFolder.add(G.analytics, 'npOverLogn', 0, 10).onFinishChange(function(value) {
			
			let n=G.graph.vertices.length;
			G.analytics.np=G.analytics.npOverLogn*Math.log(n);
			G.analytics.edgeProbability=G.analytics.np/n;
			G.display(G.analytics.randomGraph(n,G.analytics.edgeProbability));
		}).listen();
		//buttons
		//graphFolder.add(G.analytics, 'halfVertices');
		//graphFolder.add(G.analytics, 'doubleVertices');
		//graphFolder.add(G.analytics, 'randomizeGraph');
		graphFolder.add(G.ui, 'showEdgeListMenu');
		graphFolder.add(G.ui, 'showTrapezoidsInput');
		G.showWaveLevelTable=false;
		graphFolder.add(G, 'showWaveLevelTable');
		G.showSmallCCinWhole=true;
		graphFolder.add(G, 'showSmallCCinWhole');
		G.downloadVerticesAndEdgesByHeight=function(){
			let g=G.view.graph;
			if(g.heightPropertyType!="edges"){G.addLog("error: there's no height information");return;}
			
			let heights={};
			let cloneMaps=g.edges[g.heightPropertyName].cloneMaps;
			let clones=g.edges[g.heightPropertyName].clones;
			for(let i=0;i<g.vertices.length;i++){
				for(let value in cloneMaps[i]){
					if(!heights[value]){heights[value]={v:i.toString(),e:""};}
					else{heights[value].v+=" "+i}
					let cloneID=cloneMaps[i][value];
					for (let neighbor in clones[cloneID].edges){
						let originaNeighbor=clones[neighbor].original;
						if(originaNeighbor>i){
							if(heights[value].e.length==0){heights[value].e="("+i+","+originaNeighbor+")";}
							else{heights[value].e+=" ("+i+","+originaNeighbor+")";}
						}
					}
				}
			}
			let heightValues=Object.keys(heights).sort(compareBy((x)=>Number(x),true));
			let vtext="";
			let etext="";
			let first=true;
			for(let value of heightValues){
				if(first){
					vtext+=heights[value].v;
					etext+=heights[value].e;
					first=false;
				}
				else{
					vtext+="\n"+heights[value].v;
					etext+="\n"+heights[value].e;
				}
				
			}
			downloadString(etext,g.name+".edges");
			downloadString(vtext,g.name+".vertices");
		};
		graphFolder.add(G, 'downloadVerticesAndEdgesByHeight');
		
		let sceneFolder = gui.addFolder('Scene');
	
		G.backgroundColor=0xfefeff;G.lightStyle=true;
		sceneFolder.addColor(G,"backgroundColor").onChange((value)=>{
			G.scene.background = new THREE.Color(value);
			//change between additive and normal blending
			if(G.scene.background.getHSL().l>0.35){G.lightStyle=true;G.ui.switchStyle(true);}else{G.lightStyle=false;G.ui.switchStyle(false);}
			let blending=(G.scene.background.getHSL().l>0.35)?1:2;//normal or additive
			for(let name in G.view.templates){
				let mat=G.view.templates[name].material;
				if(mat){mat.blending=blending;mat.needsUpdate=true;}
			}
			//G.view.updateStyle();
		});
		G["blending type"]=1;
		sceneFolder.add(G, 'blending type', {"None":0,"Normal":1,"Additive":2,"Subtractive":3,"Multiply":4}).onChange(function(value){
			console.log(value);
			for(let name in G.view.templates){
				let mat=G.view.templates[name].material;
				if(mat){mat.blending=Number(value);mat.needsUpdate=true;}
			}
		});
		G.view["node texture"]="dot";
		sceneFolder.add(G.view, "node texture", {"glow":"glow","particle":"particle","dot":"dot"}).onChange(function(value){
			let mat=G.view.templates.nodes.material;
			if(mat){mat.uniforms.texture.value=G.view.textures[value];mat.needsUpdate=true;}
		});
		G.animation.rotate=false;
		G.animation["rotate speed"]=0;
		sceneFolder.add(G.animation, "rotate");
		sceneFolder.add(G.animation, "rotate speed", -1,1);
		
		/*
		G.brightColors=false;
		sceneFolder.add(G, "brightColors").onChange(function(value){
			G.view.sharedUniforms.layerColors.needsUpdate=true;
			G.view.refreshSceneObjectStyles(true);
		});
		G.inheritColors=false;
		sceneFolder.add(G, "inheritColors").onChange(function(value){
			G.view.sharedUniforms.layerColors.needsUpdate=true;
			G.view.refreshSceneObjectStyles(true);
		});
*/
		
		gui.domElement.style.width="";
		
		
		G.canvasContainer.appendChild(G.logElem = document.createElement('div'));
		G.logElem.className = 'graph-logs';

		G.canvasContainer.appendChild(G.contextElem = document.createElement('div'));
		G.contextElem.className = 'context-menu';

		const toolTipElem = document.createElement('div');G.toolTipElem=toolTipElem;
		toolTipElem.classList.add('graph-tooltip');
		toolTipElem.style.display="none";
		toolTipElem.classList.add('graph-tooltip');
		G.canvasContainer.appendChild(toolTipElem);
	
		G.showingTooltip=false;
		window.addEventListener("keydown", ev=>{
			if ( ev.keyCode === 32) { }
			//removed moving
		});
		window.addEventListener("keyup", ev=>{
			if ( ev.keyCode === 32) { //toggles tooltip
			if(!G.showingTooltip){G.showingTooltip=true;G.toolTipElem.style.opacity="1";}
			if(G.showingTooltip){G.showingTooltip=false;G.toolTipElem.style.opacity="0.7";}
		} 
		});
		G.showingControls=false;
		window.addEventListener("keydown", ev=>{
			if ( ev.key==="`" ) { }
			//removed moving
		});
		window.addEventListener("keyup", ev=>{
			if ( ev.key==="`" ) { 
				if(G.showingControls){G.showingControls=false;getE("graph-menu").style.display="none";getE("style-menu").style.display="none";}
				else{G.showingControls=true;getE("graph-menu").style.display="block";getE("style-menu").style.display="block";}
			}
		});
		
		
		this.initGestures();
		this.initInteractions();
		
	},
	
	displayGraph:function(graph){
		while(graph.representation)graph=G.getGraph(graph.dataPath+"/metagraphs/"+graph.representation);
		this.graph=graph;
	},
	
	
	
	
	values:{},
	add:function(controlName,initialValue,options,callback){
		let menu=getE("style-menu");
		this.values[controlName]=initialValue;
		//let e=new Error();console.log(controlName +" set to "+initialValue+" at "+ e.stack);
		if(!options)options={};
		if(typeof initialValue=="string"){//is a selection; only use the keys
			this.addDropdownSelect(menu,toNormalText(controlName),Object.keys(options),(value)=>{this.values[controlName]=value;if(callback)callback(value);},{initialValue:initialValue});
			//parentElem,title,items,func,options
		}
		else{
			if(typeof initialValue =="boolean"){
				this.addCheckbox(menu,toNormalText(controlName),(value)=>{this.values[controlName]=value;if(callback)callback(value);});
			}
			else if(typeof initialValue =="number"){
				let min=initialValue/10,max=initialValue*10;
				if("min" in options)min=options.min;
				if("max" in options)max=options.max;
				Object.assign(options,{min:min,max:max,value:initialValue});
				this.addSlider(menu,toNormalText(controlName),(value)=>{this.values[controlName]=value;if(callback)callback(value);},options);
			}

		}
		return options;
	},
	get:function(controlName,initialValue,options,callback){
		//to support: 1)each view may create its own set of controls, bound to some HTML element 2) controls can be created and used in one single place, such as ***=controls.get(name,original,min,max) will create the control with the default value the first time it's called, and get its value later (maybe even update the range if needed); it can be bound to a property and listen o it as needed, because  
		if(!(controlName in this.values)){
			if(initialValue!==undefined){
				this.add(controlName,initialValue,options,callback);
			}
			else this.add(controlName,1);
		}
		return this.values[controlName];
	},
	set:function(controlName,value){
		if(!(controlName in this.values))this.add(controlName,value);
		else this.values[controlName]=value;
	},
	addButton(parentElem,text,func,rightclickfunc){
		let s=d3.select(parentElem).append("button").attr("class","material").text(text);
		let buttonElem=s.node();
		s.on("click",()=>func());
		if(rightclickfunc){
			if(typeof rightclickfunc=="function")s.on("contextmenu",(d)=>{d3.event.stopPropagation();d3.event.preventDefault();rightclickfunc(d);});
			else s.on("contextmenu",(d)=>{d3.event.stopPropagation();d3.event.preventDefault();func(true);});
		}
		return s;
	},
	addSmallButton(parentElem,text,func,rightclickfunc){
		this.addButton(parentElem,text,func,rightclickfunc).attr("class","small material");
	},
	addMediumButton(parentElem,text,func,rightclickfunc){
		this.addButton(parentElem,text,func,rightclickfunc).attr("class","medium material");
	},
	addButtonWithTextInput(parentElem,text,func,rightclickfunc){
		let parentSelection=d3.select(parentElem);
		let textSelection=parentSelection.append("input").style("width","60%");
		let button=parentSelection.append("button").attr("class","material").style("width","35%").text(text).on("click",()=>func(textSelection.node().value));
		if(rightclickfunc){
			if(typeof rightclickfunc=="function")button.on("contextmenu",()=>{d3.event.stopPropagation();d3.event.preventDefault();rightclickfunc(textSelection.node().value);});
			else button.on("contextmenu",(d)=>{d3.event.stopPropagation();d3.event.preventDefault();func(textSelection.node().value,true);});
		}
	},
	addButtonWithTextInputs(parentElem,text,count,func,rightclickfunc){
		let parentSelection=d3.select(parentElem);
		let texts=[];
		for(let i=0;i<count;i++){texts.push(parentSelection.append("input"));}
		let button=parentSelection.append("button").attr("class","material").style("width","35%").text(text).on("click",()=>func(texts.map((s)=>s.node().value)));
		if(rightclickfunc){
			if(typeof rightclickfunc=="function")button.on("contextmenu",()=>{d3.event.stopPropagation();d3.event.preventDefault();rightclickfunc(texts.map((s)=>s.node().value));});
			else button.on("contextmenu",(d)=>{d3.event.stopPropagation();d3.event.preventDefault();func(texts.map((s)=>s.node().value),true);});
		}
	},
	addCloseButton(parentElem,func,options){//usually at the top right, hides the parent element and calls callback
		let closeButton=document.createElement("button");
		closeButton.classList.add("close-button");
		closeButton.textContent="×";
		parentElem.appendChild(closeButton);
		closeButton.onclick=function(e){if(func)func.call(this,e);parentElem.style.display="none";}
	},
	addSlider(parentElem,text,func,options){
		let min=0,max=1;let lazy=false;
		if(!options)options={};
		//allow changing the range later through this object
		if("min" in options==false)options.min=0;
		if("max" in options==false)options.max=1;
		
		
		let s=d3.select(parentElem).append("div").attr("class","material-slider");
		if(options.long){s.attr("class","material-slider long");}
		let elem=s.node();elem.__options=options;options.elem=elem;
		
		let label=s.append("p").attr("class","material-slider-label").text(text);
		let barContainer=s.append("div").attr("class","material-slider-bar-container");
		let pivot=barContainer.append("div").attr("class","material-slider-pivot");
		let bar=barContainer.append("div").attr("class","material-slider-bar");
		options.value=0;
		let cb=function(data,i,elem){
			let rect=barContainer.node().getBoundingClientRect();
			
			let width=clamp(d3.event.x,0,rect.width);//-rect.left;
			let percent=Math.floor(100*(width)/rect.width)+"%";//-rect.left
			let value=(options.max-options.min)*(width)/rect.width+options.min;//-rect.left
			if(isNaN(value))return;//throw Error();
			if(options.type=="integer"){
				value=Math.round(value);
			}
			options.value=value;
			bar.style("width",percent);
			pivot.style("left",percent);
			func(value);
		};
		let getValue=()=>options.value;
		let onUpdate=function(value){
			let percent=((options.max==options.min)?"100%":(Math.floor(100*(value-options.min)/(options.max-options.min))+"%"));
			bar.style("width",percent);
			pivot.style("left",percent);
			options.value=value;
		};
		options.onUpdate=onUpdate;//call when the value is changed outside
		options.getValue=getValue;//used to add step buttons
		//I'm not sure why but it seems d3.drag is buggy with certain bigger graphs displayed??
		/*if(options.lazy){
			
		}
		else{
			
		}*/
		if(options.lazy)pivot.call(d3.drag().on("end",cb));
		else pivot.call(d3.drag().on("drag",cb).on("end",cb));
		return options;
	},
	addSliderWithStepButtons(parentElem,text,func,options){
		let obj=this.addSlider(parentElem,text,func,options);
		
		let elem=obj.elem,s=d3.select(elem);
		
		let stepButtonsAreaSelection=s.append("div").attr("class","step-buttons-area").style("width","30%");//.style("margin-top","3px");
		let barSelection=s.select(".material-slider-bar-container");
		barSelection.style("width","65%");
		let stepButtonsArea=stepButtonsAreaSelection.node();
		
		let getStepFunc=(delta)=>{
			return ()=>{
				let target=this.modifierTarget;let end=false;
				let value=obj.getValue();
				value+=delta;
				if(value<obj.min){value=obj.min;end=true;}
				if(value>obj.max){value=obj.max;end=true;}
				obj.onUpdate(value);//this updates the position of the slider
				func(value);
				return end;
			}
		};
		let backwardFunc=getStepFunc(-1),forwardFunc=getStepFunc(1);
		obj.timeoutFuncs={};
		let getAnimateFunc=(delta)=>{
			let stepFunc=getStepFunc(delta);
			obj.timeoutFuncs[delta]=()=>{
				let ended=stepFunc();
				if(ended){obj.animating=false;delete obj.currentAnimateInterval;}
				if(obj.animating){
					if(obj.animationAcceleration){//animated intervals decrease by (divided by) this factor each time
						if(!obj.currentAnimateInterval){obj.currentAnimateInterval=obj.animateInterval;}
						else{obj.currentAnimateInterval/=obj.animationAcceleration;if(obj.currentAnimateInterval<1)obj.currentAnimateInterval=1;}
						obj.animateTimeout=setTimeout(obj.timeoutFuncs[delta],obj.currentAnimateInterval);
					}
					else{obj.animateTimeout=setTimeout(obj.timeoutFuncs[delta],obj.animateInterval);}
				}
			};
			return ()=>{
				if(obj.animating){//stop
					obj.animating=false;delete obj.currentAnimateInterval;
				}
				else{//start a timeout that will set itself again if animating is true
					obj.animating=true;
					obj.animateDelta=delta;
					obj.animateTimeout=setTimeout(obj.timeoutFuncs[delta],obj.animateInterval);
				}
			}
			return obj.timeoutFuncs[delta];
		};
		
		if(obj.noAnimate!=true){//right click animates; now allow animation by default, unless it's disabled because the operation is expensive or something
			if(!obj.animateInterval)obj.animateInterval=1000;
			this.addSmallButton(stepButtonsArea,"<",getStepFunc(-1),getAnimateFunc(-1));
			this.addSmallButton(stepButtonsArea,">",getStepFunc(1),getAnimateFunc(1));
		}
		else{
			this.addSmallButton(stepButtonsArea,"<",getStepFunc(-1));
			this.addSmallButton(stepButtonsArea,">",getStepFunc(1));
		}
		
	},
	addRangeSlider(parentElem,text,func,options){
		let min=0,max=1;let lazy=false;
		if(!options)options={};
		//allow changing the range later through this object
		if("min" in options==false)options.min=0;
		if("max" in options==false)options.max=1;
		if("begin" in options==false)options.begin=options.min;
		if("end" in options==false)options.end=options.max;
		
		let s=d3.select(parentElem).append("div").attr("class","range-slider");
		if(options.vertical)s.attr("class","range-slider-vertical");
		let elem=s.node();elem.__options=options;
		
		let label=s.append("p").attr("class","slider-label").text(text);
		let barContainer=s.append("div").attr("class","slider-bar-container");
		let pivot1=barContainer.append("div").attr("class","slider-pivot-begin");
		let pivot2=barContainer.append("div").attr("class","slider-pivot-end");
		let bar=barContainer.append("div").attr("class","slider-bar");
		
		let cb=function(data,i,elem){
			let isBeginPivot;if(this==pivot1.node()){isBeginPivot=true;}else{isBeginPivot=false;}
			let rect=barContainer.node().getBoundingClientRect();
			let length,totalLength;
			if(options.vertical){totalLength=rect.height;length=clamp(d3.event.y,0,rect.height);}
			else{totalLength=rect.width;length=clamp(d3.event.x,0,rect.width);}
			let max=options.max,min=options.min;
			let value=(max-min)*(length)/totalLength+min;
			let begin=options.begin,end=options.end;
			if(isBeginPivot){//ensure that end>=begin no matter how they are dragged
				begin=value;
				if(end<value)end=value;
			}
			else{
				end=value;
				if(begin>value)begin=value;
			}
			let percent1=Math.floor(100*(begin-min)/(max-min));
			let percent2=Math.floor(100*(end-min)/(max-min));
			if(max==min){percent1="0";percent2="100";}
			if(options.vertical){
				bar.style("bottom",(100-percent1)+"%");
				bar.style("top",percent2+"%");
				pivot1.style("top",percent1+"%");
				pivot2.style("bottom",(100-percent2)+"%");
			}
			else{
				bar.style("left",percent1+"%");
				bar.style("right",(100-percent2)+"%");
				pivot1.style("right",(100-percent1)+"%");
				pivot2.style("left",percent2+"%");
			}
			options.begin=begin;
			options.end=end;
			func(begin,end);
		};
		let onUpdate=function(beginValue,endValue){
			let percent1=Math.floor(100*(beginValue-options.min)/(options.max-options.min));
			let percent2=Math.floor(100*(endValue-options.min)/(options.max-options.min));
			if(max==min){percent1="0";percent2="100";}
			if(options.vertical){
				bar.style("bottom",(100-percent1)+"%");
				bar.style("top",percent2+"%");
				pivot1.style("top",percent1+"%");
				pivot2.style("bottom",(100-percent2)+"%");
			}
			else{
				bar.style("left",percent1);
				bar.style("right",(100-percent2));
				pivot1.style("right",(100-percent1));
				pivot2.style("left",percent2);
			}
		};
		options.onUpdate=onUpdate;//call when the value is changed outside
		if(options.lazy){pivot1.call(d3.drag().on("end",cb));pivot2.call(d3.drag().on("end",cb));}
		else {pivot1.call(d3.drag().on("drag",cb).on("end",cb));pivot2.call(d3.drag().on("drag",cb).on("end",cb));}
		return options;
	},
	addCheckbox(parentElem,text,func,options){
		if(!options)options={};
		let s=d3.select(parentElem).append("div").attr("class","material-checkbox");
		let label=s.append("p").attr("class","material-checkbox-label").text(text);
		let checkbox=s.append("input").attr("type","checkbox").attr("class","material-checkbox");
		let checkboxElem=checkbox.node();
		checkbox.on("input",()=>func(checkboxElem.checked));
		let onUpdate=function(value){checkboxElem.checked=value;};
		options.onUpdate=onUpdate;//call when the value is changed outside
		return options;
	},
	addDropdownMenu(parentElem,title,items,func,options){
		if(typeof func!="function"){options=func;func=undefined;}//may skip the callback if the items contain callbacks
		if(!options)options={};
		let menu=d3.select(parentElem).append("div").attr("class","dropdown-container");
		let menuTitle=menu.append("div").attr("class","dropdown-title");
		let menuBody=menu.append("div").attr("class","dropdown-body").style("display","none");
		options.elemSelection=menu;
		options.titleSelection=menuTitle;
		if(options.upward){
			menuBody.style("top","").style("bottom","100%");
			menuTitle.text(title+" \u25b2");
		}
		else{
			menuBody.style("top","100%").style("bottom","");
			menuTitle.text(title+" \u25bc");
		}
		menuTitle.on("click",()=>{
			if(menuBody.style("display")=="none"){menuBody.style("display","flex");}
			else{menuBody.style("display","none");}
		});
		menuBody.on("mouseleave",()=>{
			menuBody.style("display","none");
		})
		options.value=null;
		options.index=-1;
		for(let i in items){
			let item=items[i];//for both list or object type input
			let value=(typeof item=="function")?i:item;
			menuBody.append("div").attr("class","dropdown-item").text(toNormalText(value)).on("click",()=>{
				options.value=value;
				options.index=i;
				if(func)func(item,i);
				if(typeof item=="function")item();
			});
		}
		return options;
	},
	addDropdownSelect(parentElem,title,items,func,options){
		if(typeof func!="function"){options=func;func=undefined;}//may skip the callback if the items contain callbacks
		if(!options)options={};
		let menu=d3.select(parentElem).append("div").attr("class","dropdown-container");
		let menuLabel=menu.append("div").attr("class","dropdown-select-label").text(toNormalText(title));
		let menuTitle=menu.append("div").attr("class","dropdown-select-title");
		let menuBody=menu.append("div").attr("class","dropdown-select-body").style("display","none");
		options.elemSelection=menu;
		options.titleSelection=menuTitle;
		
		if(options.upward){
			menuBody.style("top","").style("bottom","100%");
		}
		else{
			menuBody.style("top","100%").style("bottom","");
		}
		menuTitle.on("click",()=>{
			if(menuBody.style("display")=="none"){menuBody.style("display","flex");}
			else{menuBody.style("display","none");}
		});
		menuBody.on("mouseleave",()=>{
			menuBody.style("display","none");
		});
		options.index=-1;
		let initialValue=options.value;
		for(let i in items){
			let item=items[i];//for both list or object type input
			let value=(typeof item=="function")?i:item;
			if(!initialValue)initialValue=value;
			menuBody.append("div").attr("class","dropdown-select-item").text(toNormalText(value)).on("click",()=>{
				options.value=value;
				if(options.upward){menuTitle.text(toNormalText(value)+" \u25b2");}
				else{menuTitle.text(toNormalText(value)+" \u25bc");}
				options.index=i;
				if(func)func(item,i);
				if(typeof item=="function")item();
			});
		}
		if(options.upward){menuTitle.text(toNormalText(initialValue)+" \u25b2");}
		else{menuTitle.text(toNormalText(initialValue)+" \u25bc");}
		let onUpdate=function(value){
			options.value=value;
			if(options.upward){menuTitle.text(toNormalText(value)+" \u25b2");}
			else{menuTitle.text(toNormalText(value)+" \u25bc");}
			//options.index=i;
		};
		options.onUpdate=onUpdate;//call when the value is changed outside
		let updateItems=function(newItems,initialValue){
			menuBody.selectAll("div.dropdown-select-item").remove();
			for(let i in newItems){
				let item=newItems[i];//for both list or object type input
				let value=(typeof item=="function")?i:item;
				if(!initialValue)initialValue=value;
				menuBody.append("div").attr("class","dropdown-select-item").text(toNormalText(value)).on("click",()=>{
					options.value=value;
					if(options.upward){menuTitle.text(toNormalText(value)+" \u25b2");}
					else{menuTitle.text(toNormalText(value)+" \u25bc");}
					options.index=i;
					if(func)func(item,i);
					if(typeof item=="function")item();
				});
			}
			if(options.upward){menuTitle.text(toNormalText(initialValue)+" \u25b2");}
			else{menuTitle.text(toNormalText(initialValue)+" \u25bc");}
		};
		options.updateItems=updateItems;//call when the list ofites needs to be changed
		return options;
	},
	addKeyListener(elem,key,keydownfunc,keyupfunc,options){
		if(!options)options={};
		elem.addEventListener("keydown", ev=>{
			if((ev.keyCode===key)||(ev.key===key)){ 
				if(options.preventDefault)ev.preventDefault();
				if(keydownfunc)keydownfunc(ev);
			}
		});
		elem.addEventListener("keyup", ev=>{
			if((ev.keyCode===key)||(ev.key===key)){ 
				if(options.preventDefault)ev.preventDefault();
				if(keyupfunc)keyupfunc(ev);
			}
		});
	},
	addDragListener(elem,startdragfunc,dragfunc,stopdragfunc,options){
		if(!options)options={};
		options.isDragging=false;
		elem.addEventListener( 'mousedown', mousemove, false );
		elem.addEventListener( 'mousemove', mousemove, false );
		elem.addEventListener( 'mouseup', mouseup, false );
	},
	
	
	
	
	
	addControl:function(name,folder,value,callback){
		
		//need to set this?? gui.domElement.style.width="";
		
	},
	addLog:function(msg){
		//skip repeated messages
		var lastlog=G.logElem.lastElementChild;if((lastlog)&&(lastlog.textContent==msg)){return;}
		var p=document.createElement('p');p.textContent=msg;p.className = 'graph-log';
		G.logElem.appendChild(p);p.createTime=new Date().getTime();
	},
	resetView:function(){
		//G.cameraControls.reset();
		for(let name in G.cameras){
			G.cameras[name].position.x = 0;
			G.cameras[name].position.y = 0;
			G.cameras[name].position.z = Math.sqrt(this.graph.vertexCount + 1) * 150;//sqrt instead of cbrt because the layout is often quite flat
		}
		
		G.cameraControls.target.x=0;
		G.cameraControls.target.y=0;
		G.cameraControls.target.z=0;
	},
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	initInteractions:function(){
		//now all G.on... functions take a record like {type:type,object:bestResult}
		G.addLog=this.addLog;
		G.onclick=function(result){
			if(result)
			{
				let objID=result.objectID,obj=result.viewObject;
				let originalObjectID=result.originalObjectID,originalObjectType=result.originalObjectType,originalObject=result.originalObject,originalObjects=result.originalObjects;
				let subgraphLevel=result.subview.subgraphLevel;let subgraph=result.subview.graph;
				switch (result.type)
				{
					case "nodes":
						let label;if(originalObjects.label)label=originalObjects.label[originalObjectID];
						G.addLog("The "+" vertex "+originalObjectID+(label?(" ("+((label.length>35)?(label.substring(0,34)+"..."):label)+")"):"")); 
						if(subgraphLevel==0)G.toggleSelectVertex(originalObjectID);
					
					break;
					//G.addLog("The edge #"+obj.id+" between original vertices "+obj.source.original+" and "+obj.target.original+".");
				}
				G.broadcast("onUserEvent","click",result);
			}
			else
			{
				if(!G.view.graph)return;
				G.clearVertexSelection();
				//G.addLog("Clicked nothing");
			}
		},
		G.onshiftclick=function(result){
			if(result)
			{
				let objID=result.objectID,obj=G.view.model[result.type][objID];
				let originalObjectID=result.originalObjectID,originalObjectType=result.originalObjectType,originalObject=result.originalObjectType?result.subview.graph[originalObjectType][originalObjectID]:null;
				let subgraphLevel=result.subview.subgraphLevel;let subgraph=result.subview.graph;
				switch (result.type)
				{
					case "nodes":
						G.addLog("Selecting neighbors of the "+" vertex "+obj.original+" in layer "+obj.layer+"."); 
						G.selectNodeNeighbors(obj);
					break;
				}
				G.broadcast("onUserEvent","shiftclick",result);
			}
		}
		G.onctrlclick=function(result){//select CC?
			if(result)
			{
				let objID=result.objectID;
				let originalObjectID=result.originalObjectID,originalObjectType=result.originalObjectType,originalObject=result.originalObjectType?result.subview.graph[originalObjectType][originalObjectID]:null;
				let subgraphLevel=result.subview.subgraphLevel;let subgraph=result.subview.graph;
				switch (result.type)
				{
					case "nodes":
						G.addLog("Selecting the connected component of a clone of the "+" vertex "+originalObjectID+"."); 
						G.selectNodeCC(result);
					break;
				}
				G.broadcast("onUserEvent","ctrlclick",result);
			}
		}
		G.onrightclick=function (result){
			if(result)
			{
				let objID=result.objectID,obj=G.view.model[result.type].getObj(objID);
				let originalObjectID=result.originalObjectID,originalObjectType=result.originalObjectType,originalObject=result.originalObjectType?result.subview.graph[originalObjectType][originalObjectID]:null;
				let subgraphLevel=result.subview.subgraphLevel;let subgraph=result.subview.graph;
				G.showContextMenu("vertices");
				switch (result.type)
				{
					case "nodes":
						G.showContextMenu("vertices",obj);
						break;
					case "waveLayers":
						G.showContextMenu("waveLayers",obj);
						break;
				}
				G.broadcast("onUserEvent","rightclick",result);
			}
			else{
				if(!G.view.graph)return;
				//allow contex menu on empty area
				G.showContextMenu();
			}
			//G.toggleSelectLayer(obj.layer);
			//G.clearLayerSelection();
		}
		G.ondblclick=function(result){
			if(result)
			{
				let objID=result.objectID,obj=result.viewObject;
				let originalObjectID=result.originalObjectID,originalObjectType=result.originalObjectType,originalObject=result.originalObject,originalObjects=result.originalObjects;let subgraphLevel=result.subview.subgraphLevel;let subgraph=result.subview.graph;
				switch (result.type)
				{
					case "nodes":
						let vertices=originalObjects;if(subgraph.isMetagraph&&vertices.isExpanded&&vertices.isExpanded[originalObjectID]){G.loading.contractVertex(originalObjectID,subgraph);}
						else{G.loading.expandVertex(originalObjectID,subgraph);}
						break;
					case "collapsedRings":
						let ringID=obj.index;//this is the subview index, and global rings are before local ones
						if(obj.isGlobal){
							if(subgraph.expandGlobalRing){
								Promise.resolve(subgraph.expandGlobalRing(ringID)).then((g)=>{
									g.parent=subgraph;
									G.load(g);
								});
							}
							else{G.addLog("cannot expand rings in this graph");}
						}
						else{G.addLog("cannot expand local rings");}
						break;
				}
				G.broadcast("onUserEvent","dblclick",result);
			}
		}
		G.onhover=function(result){
/*objectID: 8
originalObjectID: 8
originalObjectType: "vertices"
subview: {nodes: Array(50), links: Array(52), lines: Array(0), waveLayers: Array(0), waveInterlayers: Array(0), …}
subviewObjectID: 8
type: "nodes"*/
			if(result)
			{
				//the description comes in two parts, the original object (eg.vertices) description if available from the analytics, and the view object(eg node) description defined in the view or subview(if the view defines it it takes priority over the subview one).
				
				let objID=result.objectID;let type=result.type;
				let originalObjectID=result.originalObjectID,originalObjectType=result.originalObjectType,originalObject=result.originalObject,originalObjects=result.originalObjects;
				let originalTypeSingular=null;
				if(originalObjectType&&G.analytics.templates[originalObjectType]){originalTypeSingular=G.analytics.templates[originalObjectType].singularName;}
				let subgraphLevel=result.subview.subgraphLevel;let subgraph=result.subview.graph;
				
				let originalDesc="";
				if(originalObjectType){
					originalDesc=((originalTypeSingular?toNormalText(originalTypeSingular):toSingularName(toNormalText(originalObjectType)))+" "+originalObjectID+(subgraphLevel?" (in subgraph "+subgraph.shortName+") ":""));
					if(G.analytics.templates[originalObjectType]&&G.analytics.templates[originalObjectType].getDescription){
						originalDesc+=G.analytics.templates[originalObjectType].getDescription(originalObject,originalObjectID,result.subview.graph[originalObjectType]);
					}
					originalDesc+="\n";
				}
				let viewTypeSingular=null;
				if(G.view.templates[type].singularName){viewTypeSingular=G.view.templates[type].singularName;}
				let viewDesc=(toNormalText((viewTypeSingular?viewTypeSingular:toSingularName(result.type)))+" "+objID);
				if(G.view.templates[type]&&G.view.templates[type].getDescription){
					viewDesc+=" "+G.view.templates[type].getDescription(obj,objID,G.view.model[result.type]);
				}
				
				G.toolTipElem.textContent = originalDesc+viewDesc;
				G.toolTipElem.style.display="";
				
				switch (result.type)
				{
					case "nodes":
						//$("#egonet").modal('show');
						let nodes=G.view.model.nodes;

						let vertices=originalObjects;
						if(vertices.waveLayers&&vertices.waveLayersExpanded){
							if(!vertices.waveLayersExpanded[originalObjectID]){
								vertices.waveLayersExpanded[originalObjectID]=true;
							}
							else{
								vertices.waveLayersExpanded[originalObjectID]=false;
							}
							//G.view.refreshStyles(true,true);
							return;
						}
						//highlight edges and neighhbors
						
						this.graph.hoveredVertex=originalObjectID;

						G.view.refreshStyles(true,true);
				}
			}
			else{
				G.toolTipElem.textContent="";
				G.toolTipElem.style.display="none";
			}
		}
		G.onhoverend=function(result){
			if(result)
			{
				let objID=result.objectID,obj=G.view.model[result.type][objID];
				let originalObjectID=result.originalObjectID,originalObjectType=result.originalObjectType,originalObject=result.originalObjectType?result.subview.graph[originalObjectType][originalObjectID]:null;
				let subgraphLevel=result.subview.subgraphLevel;let subgraph=result.subview.graph;
				G.toolTipElem.textContent="";
				G.toolTipElem.style.display="none";
				switch (result.type)
				{
					case "nodes":
						this.graph.hoveredVertex=undefined;
						G.view.refreshStyles(true,true);
						/*let vertex=originalObject;
						if(vertex.isMetanode&&vertex.waveLayers){
							if(vertex.isExpanded){
								vertex.isExpanded=false;
								G.view.refreshStyles(true);
							}
							return;
						}*/
						
				}
			}
		}
		
		
		
		G.zoomIntoVertexID=null;
		G.zoomIntoGraph=null;
		G.setZoomIntoTarget=function(vertexID,graph){
			G.zoomIntoVertexID=vertexID;G.zoomIntoGraph=graph;
		}
		G.onZoomInto=function(obj){
			G.loading.expandVertex(G.zoomIntoVertexID,G.zoomIntoGraph);//cannot use nodes now
		}
		G.onZoomOut=function(){G.showMetagraph();}
		G.canZoomOut=function(){return G.graph.parent;}
		
		function undoListener( event ) {
			if(event.ctrlKey==true){
			//console.log(event);
				if(event.key=="z")G.undoSelection();
				if(event.key=="y")G.redoSelection();
			}
		} 
		window.addEventListener( 'keyup', undoListener, false );
		
		//utils
		G.updateSelection=function() {//only show the egonet when one vertex is selected
			//for(let i in G.egonet){delete G.egonet[i];}
			let graph=G.view.graph;
			graph.selectedVertexCount=Object.keys(graph.selectedVertices).length;
			getE("selected-vertices").textContent="Selected "+graph.selectedVertexCount+" vertices";
			if(graph.selectedVertexCount>0){
				if(graph.selectedVertexCount==1){
					graph.egonet={};
					let selectedID=Object.keys(graph.selectedVertices)[0];
					let selectedVertex=graph.vertices[selectedID];//
					for(let j in getProperty(graph.vertices,selectedID,"edges")){graph.egonet[j]=true;}
					graph.selectedVertexCount=1;
					let selectedEdgeCount=0;
					let sources=graph.edges.source,targets=graph.edges.target;
					for(let i=0;i<graph.edges.length;i++){
						if((sources[i] in graph.egonet)&&(targets[i] in graph.egonet))
							selectedEdgeCount++;
					}
					graph.selectedEdgeCount=selectedEdgeCount;

				}
				else{graph.egonet=null;
					G.avgLength=0;let selectedEdgeCount=0;
					let sources=graph.edges.source,targets=graph.edges.target;
					for(let i=0;i<graph.edges.length;i++){if((sources[i] in graph.selectedVertices)&&(targets[i] in graph.selectedVertices))selectedEdgeCount++;}
					graph.selectedEdgeCount=selectedEdgeCount;
				}
			}
			else{graph.egonet=null;
				G.avgLength=0;
				graph.selectedEdgeCount=0;
			}
			G.view.sharedUniforms.nodeSelectionData.needsUpdate=true;

			G.view.refreshStyles(true,true);
		};
		
		G.showContextMenu=function(type="empty",obj){
			
			let menu=G.controls.contextMenus[type];
			if(menu){
				G.toolTipElem.textContent="";
				G.toolTipElem.style.display="none";
				menu.style.display="block";
				menu.style.top=(G.mouseScreenPos.y+1)+"px";
				menu.style.left=(G.mouseScreenPos.x+1)+"px";
				
				G.controls.contextMenuTarget=obj;
			}
		};
		
		
		
		//abstract user operations
		
		//undo history: this is a queue with the most recent item at 0, and the index is the position of the current active entry. the queue must always be non-empty(initial entry is {} which cannot be removed)
		function clearFutureHistory(){
			while(G.view.graph.selectHistoryCurrentIndex>0){G.view.graph.selectHistory.shift();G.view.graph.selectHistoryCurrentIndex--;}
		}
		G.undoSelection=function(){
			if(G.view.graph.selectHistoryCurrentIndex<G.view.graph.selectHistory.length-1){G.view.graph.selectHistoryCurrentIndex++;G.view.graph.selectedVertices=G.view.graph.selectHistory[G.view.graph.selectHistoryCurrentIndex];}
			else{G.addLog("cannot undo anymore");}
			G.updateSelection();
		}
		G.redoSelection=function(){
			if(G.view.graph.selectHistoryCurrentIndex>0){G.view.graph.selectHistoryCurrentIndex--;G.view.graph.selectedVertices=G.view.graph.selectHistory[G.view.graph.selectHistoryCurrentIndex];}
			else{G.addLog("cannot redo anymore");}
			G.updateSelection();
		}
		G.toggleSelectNode=function(node){//node is a clone index
			clearFutureHistory();
			if(!this.graph.selectedVertices) {
				this.graph.selectedVertices={};
			}
			let selected=copyObj(this.graph.selectedVertices);
			
			let record=G.view.getOriginalObject("nodes",node);
			
			if(!selected[record.originalObjectID]){selected[record.originalObjectID]={time:Date.now()};}
			else{delete selected[record.originalObjectID];}
			this.graph.selectedVertices=selected;this.graph.selectHistory.unshift(selected);//index is still 0
			G.updateSelection();
		}
		G.selectNodeNeighbors=function(node){
			clearFutureHistory();
			let selected=copyObj(this.graph.selectedVertices);
			
			let record=G.view.getOriginalObject("nodes",node);
			let vertexID=record.originalObjectID;
			if(!selected[vertexID]){selected[vertexID]={time:Date.now()};}
			
			for(let neighbor in this.graph.getNeighbors(vertexID)){if(!selected[neighbor])selected[neighbor]={time:Date.now()};}
			//else{delete selected[node.original];}
			this.graph.selectedVertices=selected;this.graph.selectHistory.unshift(selected);//index is still 0
			G.updateSelection();
		}
		G.selectNodeCC=function(record){//selects within a layer!
			if(!this.graph.vertices.cc)return;
			clearFutureHistory();
			let selected=copyObj(this.graph.selectedVertices);
			//if(typeof node!="object"){if(this.graph.clonedVertices[node]==undefined)throw Error("no such node "+node);node=this.graph.clonedVertices[node];}
			//let ccID=node.ccID;
			let vertexID=record.originalObjectID;
			let ccs=this.graph.vertices.cc;
			let ccID=this.graph.vertices.cc[vertexID];
			if(!selected[vertexID]){selected[vertexID]={time:Date.now()};}
			
			for (let i=0;i<this.graph.vertices.length;i++){if((ccs[i]==ccID)&&(!selected[i]))selected[i]={time:Date.now()};}

			//else{delete selected[node.original];}
			this.graph.selectedVertices=selected;
			if(this.graph.selectHistory) {
				this.graph.selectHistory.unshift(selected);//index is still 0
			}
			G.updateSelection();
		}
		G.toggleSelectVertex=function(vertex){//now use index not ID
			clearFutureHistory();
			let selected = {}
			if(this.graph.selectedVertices) {
				selected=copyObj(this.graph.selectedVertices);
			}

			//if(typeof vertex=="object"){let ID=G.view.graph.vertices.indexOf(vertex);if(ID==-1)throw Error("no such vertex "+vertex);vertex=ID;}
			if(!selected[vertex]){selected[vertex]={time:Date.now()};}
			else{delete selected[vertex];}
			this.graph.selectedVertices=selected;
			if(this.graph.selectHistory) {
				this.graph.selectHistory.unshift(selected);//index is still 0
			}
			G.updateSelection();
		}
		
		G.selectVertices=(set)=>{
			clearFutureHistory();
			let selected=copyObj(G.view.graph.selectedVertices);
			let now=Date.now();
			for(let i in set){
				selected[i]={time:now};
			}
			let l=Object.keys(set).length;
			if(l>0){G.addLog("selecting "+Object.keys(set).length+" vertices");
			G.view.graph.selectedVertices=selected;G.view.graph.selectHistory.unshift(selected);//index is still 0
			G.updateSelection();}
		}
		G.clearVertexSelection=()=>{
			if(Object.keys(G.view.graph.selectedVertices).length>0){
				let selected={};
				G.view.graph.selectedVertices=selected;G.view.graph.selectHistory.unshift(selected);//index is still 0
				G.updateSelection();
			}
		}
		G.expandSelection=()=>{
			let selected=G.view.graph.selectedVertices;
			let newSelect={};
			for(let i in selected){
				newSelect[i]=true;
				for(let j in G.view.graph.vertices.edges[i]){newSelect[j]=true;}
			}

			if(Object.keys(newSelect).length==Object.keys(selected).length){G.addLog("cannot expand anymore");return;}
			G.view.graph.selectedVertices=newSelect;G.view.graph.selectHistory.unshift(newSelect);//index is still 0
			G.updateSelection();
		}
		
	},
	
	initGestures:function(){
		
		let selectingRegion=document.getElementById("selecting-region");
		let isDraggingObjects=false;
		
		const mouseDownPos = {x: -1,y: -1};
		const mousePos = new THREE.Vector2();G.mousePos=mousePos;
		const mouseScreenPos = new THREE.Vector2();G.mouseScreenPos=mouseScreenPos;
		const mouseShaderPos = new THREE.Vector2();G.mouseShaderPos=mouseShaderPos;
		mousePos.x = -2;// Initialize off canvas
		mousePos.y = -2;
		G.lastTouchedObj=null;
		G.lastTouchedPos={x:-1,y:-1};
		G.regionStartPos={x:-1,y:-1};
		
		let domElement=G.canvasContainer;
		domElement.addEventListener("mousemove", ev=>{
			const offset = getOffset(domElement)
			  , relPos = {
				x: ev.pageX - offset.left,
				y: ev.pageY - offset.top
			};
			mousePos.x = ( event.clientX / domElement.clientWidth ) * 2 - 1;
			mousePos.y = - ( event.clientY / domElement.clientHeight ) * 2 + 1;
			mouseScreenPos.x=event.clientX;
			mouseScreenPos.y=event.clientY;
			mouseShaderPos.x=event.clientX-domElement.clientWidth/2;//seems this is what the vs outputs
			mouseShaderPos.y=domElement.clientHeight/2-event.clientY;
			if(relPos.x + 200>G.view.canvasWidth){
				G.toolTipElem.style.left="";
				G.toolTipElem.style.right = (G.view.canvasWidth-(relPos.x - 20)) + 'px';
			}
			else{
				G.toolTipElem.style.left = (relPos.x + 20) + 'px';
				G.toolTipElem.style.right="";
			}
			if(relPos.y + 200>G.view.canvasHeight){
				G.toolTipElem.style.bottom = (G.view.canvasHeight-(relPos.y - 20)) + 'px';
				G.toolTipElem.style.top="";
			}
			else{
				G.toolTipElem.style.top = (relPos.y + 20) + 'px';
				G.toolTipElem.style.bottom="";
			}
			
			

			//var alpha=G.alpha();
			//if(G.view.getObjectAtPos(mousePos)){G.alpha(alpha*0.97);}//slowly pause the moving stuff so players can click easily
			//else{G.alpha(alpha+0.005>1?1:alpha+0.005);}
			//there are two simulations so they must be adjusted together
			
			function getOffset(el) {
				const rect = el.getBoundingClientRect()
				  , scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
				  , scrollTop = window.pageYOffset || document.documentElement.scrollTop;
				return {
					top: rect.top + scrollTop,
					left: rect.left + scrollLeft
				};
			}
		}
		, false);
		
		domElement.addEventListener("mousedown", ev=>{
			mouseDownPos.x = mousePos.x;
			mouseDownPos.y = mousePos.y;
			if(ev.shiftKey&&(ev.button==0)){
				G.regionStartPos.x=ev.x;G.regionStartPos.y=ev.y;
				selectingRegion.style.left=ev.x+"px";
				selectingRegion.style.right=(domElement.clientWidth-ev.x)+"px";
				selectingRegion.style.top=ev.y+"px";
				selectingRegion.style.bottom=(domElement.clientHeight-ev.y)+"px";
				selectingRegion.style.display="block";
			}
			//if there are selected vertices, first test if it may be the start of dragging of selected vertices
			if(this.graph&&this.graph.selectedVertexCount>0){
				const target=G.view.getObjectAtPos(mouseDownPos);
				if(target&&(target.originalObjectType=="vertices")&&(target.originalObjectID in this.graph.selectedVertices)){isDraggingObjects=true;}
				else{isDraggingObjects=false;}
			
			}
			else{
				
			}
			
			if(ev.button>0){
				//ev.stopPropagation();
				ev.preventDefault();
			}
		});
		var tempVector3=new THREE.Vector3();
		domElement.addEventListener("mousemove", ev=>{
			//if(ev.ctrlKey&&(ev.button==0)){
			if((ev.button==0)&&(ev.buttons==1)&&G.controls.graph&&(G.controls.graph.selectedVertexCount>0)&&isDraggingObjects){
				/*let moveLength=10;
				if(Math.abs(ev.movementX)+Math.abs(ev.movementY)>0){
					//move selected vertices
					G.view.nodeMovement.set(0,0,0);
					tempVector3.copy(G.cameraControls.leftVector).multiplyScalar(-ev.movementX*moveLength);
					G.view.nodeMovement.add(tempVector3);
					tempVector3.copy(G.cameraControls.forwardVector).multiplyScalar(-ev.movementY*moveLength);
					G.view.nodeMovement.add(tempVector3);
					G.cameraControls.stopMoving();
				}
				*/
				G.view.nodeScreenTarget.x=mouseShaderPos.x;
				G.view.nodeScreenTarget.y=mouseShaderPos.y;
				G.view.nodeScreenTarget.z=1;
				G.cameraControls.stopMoving();

				
			}
			else{
				//G.view.nodeMovement.set(0,0,0);
				G.view.nodeScreenTarget.z=0;
			}
		});
		domElement.addEventListener("mousemove", ev=>{
			if(ev.shiftKey&&(ev.button==0)){
				if(ev.x>G.regionStartPos.x){
					selectingRegion.style.left=G.regionStartPos.x+"px";
					selectingRegion.style.right=(domElement.clientWidth-ev.x)+"px";
				}else{
					selectingRegion.style.right=(domElement.clientWidth-G.regionStartPos.x)+"px";
					selectingRegion.style.left=ev.x+"px";
				}
				if(ev.y>G.regionStartPos.y){
					selectingRegion.style.bottom=(domElement.clientHeight-ev.y)+"px";
					selectingRegion.style.top=G.regionStartPosy+"px";
				}else{
					selectingRegion.style.top=ev.y+"px";
					selectingRegion.style.bottom=(domElement.clientHeight-G.regionStartPos.y)+"px";
				}
				
			}
			else{
				selectingRegion.style.display="none";
			}
		});
		domElement.addEventListener("mouseup", ev=>{
			isDraggingObjects=false;
			if ((this.graph) && (G.onclick) && (mouseDownPos.y == mousePos.y) && (mouseDownPos.x == mousePos.x)) {
				const target=G.view.getObjectAtPos(mouseDownPos);
				if (target) {
					if (ev.button == 0) {
						if(ev.shiftKey) G.onshiftclick(target);
						else if(ev.ctrlKey) G.onctrlclick(target);
						else G.onclick(target);
					}
					if (ev.button > 0) {
						ev.preventDefault();
						G.onrightclick(target);
						//ev.stopPropagation();
					}
				} else {
					
					if (ev.button == 0)
						G.onclick();
					if (ev.button > 0){
						ev.preventDefault();
						G.onrightclick();
					}
						
						//ev.stopPropagation();
						
				}
			}
			
			else if(ev.shiftKey&&(ev.button==0)){
				let oldmouseX = ( G.regionStartPos.x / domElement.clientWidth ) * 2 - 1,
					oldmouseY = - ( G.regionStartPos.y / domElement.clientHeight ) * 2 + 1;
				//console.log("screen coords :"+oldmouseX+", "+oldmouseY+" to "+mousePos.x+", "+mousePos.y);
				let region={};
				if(oldmouseX<mousePos.x){region.left=oldmouseX;region.right=mousePos.x;}
				else{region.right=oldmouseX;region.left=mousePos.x;}
				if(oldmouseY<mousePos.y){region.top=oldmouseY;region.bottom=mousePos.y;}
				else{region.bottom=oldmouseY;region.top=mousePos.y;}
				let selected=G.view.getVerticesInBBox(region);//todo: select non-vertex objects; maybe we can select both vertices and view objects like nodes etc?
				
				selectingRegion.style.display="none";
				G.selectVertices(selected);
			}
			
			
		}
		, false);



		G.hoverDelay=1000;
		function hoverOnCurrentObject(obj){
			//if(obj){
				if ((G.graph) && (G.onhover)) {
				   let target=G.view.getObjectAtPos(mousePos);
					if (target) {
						G.onhover(target);
						return target;
					} else {
						G.onhover(null);
						return null;//tell the hover manager what object is logically being hovered on, so it can be used in hoverEnd
					}
				}
			//}
			//else{
			//	G.onhover(null);
			//	if(G.onhoverend)G.onhoverend();
			//}
			
		}
		function hoverEnd(){
			if ((G.graph) && (G.onhover))G.onhover(null);
			if(G.onhoverend)G.onhoverend();
		}
		//function hoverEnd(){if ((this.graph) && (G.onhover))G.onhover(null);}
		addHoverListener(domElement,()=>G.hoverDelay,hoverOnCurrentObject,hoverEnd);
		
	
	
	
		//do you really want the touch listeners?
		

		domElement.addEventListener("dblclick", ev=>{
			if ((this.graph) && (G.ondblclick)) {
			   const target=G.view.getObjectAtPos(mouseDownPos);
				if (target) {
					G.ondblclick(target);
				} else {
					G.ondblclick(null);
				}
			}
		}
		, false);
		
	}
});





