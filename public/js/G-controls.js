G.addModule("controls",{



	init:function(){

		//top

		//this.addButton(getE("graph-strata-buttons-area"),"Strata",()=>{});


		//bottom
        this.index=1;
		let viewButtomsElem=getE("view-buttons-area");
		let semanticsButtomsElem=getE("graph-semantics-buttons-area");
		this.styleControlsElem=getE("style-controls-area");
		let styleControlsElem = this.styleControlsElem;

		function saveLayout(){
			let path=G.controls.graph.dataPath;
			if(path){
			    if(G.drawOnHover){
			        let data = [];
                    data.push(G.view.getVerticesPos());
                    data.push(G.view.graph.nodes.size);
                    data.push(G.view.graph.links.brightness);
                    data.push(G.view.graph.explored);
                    if (!data) {
                        G.addLog("failed to get layout");
                        return;
                    }
                    G.messaging.sendCustomData("save", {type: "layout", path: path, data: data});
                    G.addLog("saved");
                } else {
                    let data = G.view.getVerticesPos();
                    if (!data) {
                        G.addLog("failed to get layout");
                        return;
                    }
                    G.messaging.sendCustomData("save", {type: "layout", path: path, data: data});
                    G.addLog("saved");
                }
			}
			else{
				G.addLog("error: the save path is unknown");
			}
		}
		G.saveLayout=saveLayout;
        function downloadImage(data, filename = 'untitled.png') {
            var a = document.createElement('a');
            a.href = data;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
        }
		function saveImage(){
            var img = new Image();
            G.renderer.render(G.scene, G.camera);
            img.src = G.renderer.domElement.toDataURL();
            downloadImage(img.src);
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



		this.addButton(semanticsButtomsElem,"Generate Story",()=>{G.ui.showSemanticsText();});
        this.addButton(semanticsButtomsElem,"Add Annotations",()=>{G.ui.showTextEditor();});

		//this.addSlider(styleControlsElem,"waves",(value)=>{G.controls.set("radialLimitFactor",value);},{min:1,max:60,default:1});
		this.addSlider(styleControlsElem,"vertical spread",(value)=>{G.controls.set("heightFactor",value);},{min:0,max:5,default:1,},"1","vertical");
		this.addSlider(styleControlsElem,"horizontal spread",(value)=>{G.controls.set("radiusFactor",value);},{min:1,max:60,default:1}, "2", "horizontal");
        this.addSlider(styleControlsElem,"node size",(value)=>{G.controls.set("nodeSizeFactor",value);},{long:true,min:0.1,max:10,default:1});
        this.addSlider(styleControlsElem, "link thickness", (value) => {
                G.controls.set("linkThicknessFactor",value);
        }, {long:true,min:0.1,max:10,default:1});
        let styleRotateElem=getE("rotate_speed");
        this.addSlider(styleRotateElem,"rotate speed",(value)=>{G.animation["rotate speed"]=value;},{long:true,min:-1,max:1,default:0});
        let styleAutoExploreElem=getE("auto_explore");
        this.addSlider(styleAutoExploreElem,"auto explore speed",(value)=>{G.animation["auto explore speed"]=value;},{long:true,min:1,max:2,default:0});
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
        let labelsElem=getE("labels-area");
        function addHotspotFiltering() {

            G.view.graph.hotspotsIds = [];
            Algs.getAvgNumOfConnectionsByLabel(G.view.graph, G.labelFilter);
            G.view.refreshStyles(true, true);
            G.view.graph.hotspotsPathsMapping = {};
            let downloadButtonsElem = getE("spots_color-mapping");
            if (G.view.graph && G.view.graph && G.view.graph.hotspotsIds) {
                for (let j = 0; j < G.view.graph.hotspotsIds.length; j++) {
                    let u = 0;
                    if (Object.keys(G.view.graph.hotspotsPathsMapping).indexOf(G.controls.getLabel(G.view.graph.hotspotsIds[j])) == -1) {

                        if (G.view.graph.snVertexPaths[G.view.graph.hotspotsIds[j]]) {
                            u = G.view.graph.snVertexPaths[G.view.graph.hotspotsIds[j]][0];
                        } else if (G.view.graph.fullpathAssignment[G.view.graph.hotspotsIds[j]]) {
                            u = G.view.graph.fullpathAssignment[G.view.graph.hotspotsIds[j]][0];
                        } else if (G.view.graph.snVertexPaths[G.view.graph.hotspotsIds[j]]) {
                            u = G.view.graph.snVertexPaths[G.view.graph.hotspotsIds[j]][0];
                        }
                        if(G.view.graph.thePathsToHighlight) {
                            G.view.graph.thePathsToHighlight.push(u);
                        } else {
                            G.view.graph.thePathsToHighlight = [];
                        }
                        G.view.graph.hotspotsPathsMapping[G.view.graph.hotspotsIds[j]] = u;
                    }
                }
                keysSorted = Object.keys(G.view.graph.hotspotsPathsMapping).sort(function (a, b) {
                    return G.view.graph.hotspotsPathsMapping[a] - G.view.graph.hotspotsPathsMapping[b]
                });
                sorted = [];
                for (let j = 0; j < keysSorted.length; j++) {
                    sorted.push(keysSorted[j]);
                }
                var x = document.getElementsByClassName("range-slider");
                if (x.length > 0) {
                    x[0].remove();
                }
                G.controls.addRangeSlider(downloadButtonsElem, "HotSpots", (begin, end) => {
                    let paths = [];
                    G.view.graph.hotspotsPathsHighlight = [];
                    G.view.graph.story={};

                    let count = 0;
                    let realPaths = Algs.getHotspotsPaths();
                    for (let i = begin; i <= end; i++) {
                            if (G.view.graph.snVertexPaths[sorted[i]] && G.view.graph.snVertexPaths[sorted[i]][0] != undefined) {
                                G.view.graph.hotspotsPathsHighlight.push(G.view.graph.snVertexPaths[sorted[i]][0]);
                                paths.push(G.view.graph.snVertexPaths[sorted[i]]);
                            } else if (G.view.graph.fullpathAssignment[sorted[i]] && G.view.graph.fullpathAssignment[sorted[i]][0] != undefined) {
                                G.view.graph.hotspotsPathsHighlight.push(G.view.graph.snVertexPaths[sorted[i]][0]);
                                paths.push(G.view.graph.fullpathAssignment[sorted[i]]);
                            } else if (G.view.graph.snVertexPaths[sorted[i]] && G.view.graph.snVertexPaths[sorted[i]][0] != undefined) {
                                G.view.graph.hotspotsPathsHighlight.push(G.view.graph.snVertexPaths[sorted[i]][0]);
                                paths.push(G.view.graph.snVertexPaths[sorted[i]]);
                            }

                        count = count + 1;
                    }
                    paths = (paths.flat(1)).filter(function (item) {
                        return realPaths.includes(item);
                    });
                    G.view.graph.hotspotsPathsHighlight = [...new Set(G.view.graph.hotspotsPathsHighlight)];
                    G.view.graph.thePaths = [...new Set(paths.sort(function (a, b) {
                        return a - b
                    }))];
                    G.view.refreshStyles(true, true);

                }, {long: true, min: 0, max: sorted.length - 1, default: 0});
                if(G.firstHotspots ==  undefined || G.firstHotspots ==false) {
                    G.firstHotspots = true;
                    G.controls.addCheckbox(downloadButtonsElem, toNormalText("Reset"), (value) => {
                        if (value) {
                            G.view.graph.thePaths = undefined;
                            G.view.refreshStyles(true, true);
                        }
                    });
                }


            }
        }
        this.addDropdownMenu(labelsElem,"explore",{
            "Story Id (ETK)": () => {
                G.labelFilter = "ETK";
                addHotspotFiltering()
            },
            "Story Topic (ATU)": () => {
                G.labelFilter = "ATU";
                addHotspotFiltering();

            },
            "Story Motif (TMI)": () => {
                G.labelFilter = "TMI";
                addHotspotFiltering();
            },
            "PLACES (one-word)": (value) => {
                G.labelFilter = "places";
                addHotspotFiltering();
            },
            "PEOPLE (at least two names)": () => {
                G.labelFilter = "people";
                addHotspotFiltering();
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
        let downloadButtonsElem=getE("spots_color-mapping");

        this.addButton(downloadButtonsElem,"Download HotSpots",()=>{


            function downloadInnerHtml(filename, mimeType) {
                let text = "";
                let arr  = {};
                let arr2 = [];
                for (let j = 0; j< G.view.graph.hotspotsIds.length; j++) {
                    if(Object.keys(arr).indexOf(G.controls.getLabel(G.view.graph.hotspotsIds[j]))==-1) {
                        arr[G.controls.getLabel(G.view.graph.hotspotsIds[j])] = G.view.graph.snwormsList[G.view.graph.hotspotsIds[j]].length;
                    }

                }

                keysSorted = Object.keys(arr).sort(function(a,b){return arr[b]- arr[a]})
                for(let j =0; j<keysSorted.length;j++){
                    text += keysSorted[j] + " " + arr[keysSorted[j]]  +"\n";
                }
                var link = document.createElement('a');
                mimeType = mimeType || 'text/plain';

                link.setAttribute('download', filename);
                link.setAttribute('href', 'data:' + mimeType + ';charset=utf-8,' + encodeURIComponent(text));
                link.click();
            }

            var fileName =  'Hotspots.txt'; // You can use the .txt extension if you want
            downloadInnerHtml(fileName,'text');


        });
		let selectionButtonsElem=getE("selection-buttons-area");
        let annotationSelectButtonsElem=getE("annotation-select");
        let annotationDeleteButtonsElem=getE("annotation-delete");
        this.addButton(selectionButtonsElem, "select by ID", () => {
            let value = getE('select-vertex-input').value;
            let values = [];
            if (value.indexOf(',') > -1) {
                values = value.split(',')
            } else {
                let result = this.graph.vertices.id.indexOf(value);
                if (result != -1) {
                    neigh = G.view.graph.getNeighborIDsByID(result);
                    if (G.view.graph.subgraphID) {
                        layers = Object.keys(this.graph.parentLayersMap[this.graph.vertices.id[result]]);
                        if (G.loading.graphsCache[value]) {
                            G.loading.graphsCache[value][1].push(G.view.graph.subgraphID);
                            if (G.loading.graphsCache[value][0] && G.loading.graphsCache[value][1] && layers.every(r => G.loading.graphsCache[value][1].includes(Number(r)))) {
                                if (!this.graph.fullyDiscovered) {
                                    this.graph.fullyDiscovered = [];
                                }
                                this.graph.fullyDiscovered[result] = 1;
                                this.graph.nodes.isFullyDiscovered[result] = 1;
                                G.view.refreshStyles(true, true);
                            }
                            G.loading.graphsCache[value][0].push(neigh);
                            G.loading.graphsCache[value][0] = G.loading.graphsCache[value][0].flat(1);
                        } else {
                            G.loading.graphsCache[value] = [[], []]
                            G.loading.graphsCache[value][0].push(neigh);
                            G.loading.graphsCache[value][0] = G.loading.graphsCache[value][0].flat(1);
                            G.loading.graphsCache[value][1].push(G.view.graph.subgraphID);
                        }

                    }
                    G.cameraControls.setTarget(null);
                    if (result != -1 && !this.graph.selectedVertices[result]) {
                        if (G.graph.nodes.size && G.graph.nodes.size[result] == 0) {
                            G.addLog("Vertex doesn't exist in this layout");
                            return;
                        }
                        let vec = G.view.getNodePos(result);
                        if (vec.x != undefined || vec.y != undefined || vec.z != undefined) {
                            G.cameraControls.setTarget(vec, true, true);
                        }
                    } else {
                        G.cameraControls.setTarget(null);
                    }
                    if (this.graph.heightProperty == "fixedPointLayer")
                        G.toggleSelectVertex(this.graph.vertexMap[value]);
                    else G.toggleSelectVertex(this.graph.vertexMap[value]);
                } else G.addLog("Vertex doesn't exist in this dataset");
            }
            if (values.length > 0) {
                for (let i = 0; i < values.length; i++) {
                    let result = this.graph.vertices.id.indexOf(values[i]);
                    G.cameraControls.setTarget(null);
                    if (result != -1) {
                        let vec = G.view.getNodePos(values[i]);
                        if (vec.x != undefined || vec.y != undefined || vec.z != undefined)
                            G.cameraControls.setTarget(vec, true);
                        if (this.graph.heightProperty == "fixedPointLayer")
                            G.toggleSelectVertex(this.graph.vertexMap[values[i]]);
                        else G.toggleSelectVertex(this.graph.vertexMap[values[i]]);
                    }
                }
            }

        });
        if(G.graph && G.graph.subgraphID){
            this.addButton(selectionButtonsElem,"show vertex neighbors",()=>{
                let value=getE('select-vertex-input').value;
                let values = [];
                if (value.indexOf(',') > -1) {
                    values = value.split(',')
                }
                else {
                    let result=this.graph.vertices.id.indexOf(value);
                    neigh = G.view.graph.getNeighborIDsByID(result);
                    if (G.view.graph.subgraphID) {
                        layers = Object.keys(this.graph.parentLayersMap[this.graph.vertices.id[result]]);
                        if (G.loading.graphsCache[value]) {
                            G.loading.graphsCache[value][1].push(G.view.graph.subgraphID);
                            if (G.loading.graphsCache[value][0] && G.loading.graphsCache[value][1] && layers.every(r => G.loading.graphsCache[value][1].includes(Number(r)))) {
                                if (!this.graph.fullyDiscovered) {
                                    this.graph.fullyDiscovered = [];
                                }
                                this.graph.fullyDiscovered[result] = 1;
                                this.graph.nodes.isFullyDiscovered[result] = 1;
                                G.view.refreshStyles(true, true);
                            }
                            G.loading.graphsCache[value][0].push(neigh);
                            G.loading.graphsCache[value][0] = G.loading.graphsCache[value][0].flat(1);
                        } else {
                            G.loading.graphsCache[value] = [[], []]
                            G.loading.graphsCache[value][0].push(neigh);
                            G.loading.graphsCache[value][0] = G.loading.graphsCache[value][0].flat(1);
                            G.loading.graphsCache[value][1].push(G.view.graph.subgraphID);
                        }

                    }


                    //Algs.getVertexShortestPathInAllFixedPoints(this.graph, result);
                    G.cameraControls.setTarget(null);
                    if(result!=-1 && !this.graph.selectedVertices[result]) {
                        let vec = G.view.getNodePos(result);
                        if (vec.x != undefined || vec.y != undefined || vec.z != undefined) {
                            G.cameraControls.setTarget(vec, true, true);
                        }
                    } else {
                        G.cameraControls.setTarget(null);
                    }
                    if(this.graph.heightProperty == "fixedPointLayer")
                        G.toggleSelectVertex(this.graph.vertexMap[value]);
                    else G.toggleSelectVertex(this.graph.vertexMap[value]);

                }
                if(values.length > 0) {
                    for(let i=0; i< values.length; i++) {
                        let result=this.graph.vertices.id.indexOf(values[i]);
                        G.cameraControls.setTarget(null);
                        if(result!=-1) {
                            let vec=G.view.getNodePos(values[i]);
                            if(vec.x != undefined || vec.y != undefined || vec.z != undefined )
                                G.cameraControls.setTarget(vec,true);
                            if(this.graph.heightProperty == "fixedPointLayer")
                                G.toggleSelectVertex(this.graph.vertexMap[values[i]]);
                            else G.toggleSelectVertex(this.graph.vertexMap[values[i]]);
                        }
                    }
                }

            });
        }
        this.addButton(annotationDeleteButtonsElem,"Archive by ID",()=>{
            let vertexId=getE('annotation-delete-vertex-input').value;
            divEl = document.getElementById(vertexId);
            copydivEl = divEl;
            text = divEl.textContent;
            if (text.match(/\(x(\d+)\)/) && text.match(/x(\d+)\)/).length > 0) {
                countertext = text.match(/\(x(\d+)\)/);
                counter = Number(countertext[1]);
                parent = divEl.parentNode;
                divEl.parentNode.removeChild(divEl);
                copydivEl.textContent = copydivEl.textContent.replace("(x"+counter+")", "(-" + counter + ")");
                copydivEl.setAttribute("isArchived", "1");
                delete this.graph.annotatedVertices[G.view.graph.vertexMap[vertexId]];
                this.graph.nodes.isAnnotated[G.view.graph.vertexMap[vertexId]] =0;
                G.view.refreshStyles(true, true);
                parent.appendChild(copydivEl);
            } else {
                countertext = 1;
                counter = 1;
                parent = divEl.parentNode;
                divEl.parentNode.removeChild(divEl);
                copydivEl.textContent = copydivEl.textContent + "(-" + counter + ")";
                copydivEl.setAttribute("isArchived", "1");
                delete this.graph.annotatedVertices[G.view.graph.vertexMap[vertexId]];
                this.graph.nodes.isAnnotated[G.view.graph.vertexMap[vertexId]] =0;
                G.view.refreshStyles(true, true);
                parent.appendChild(copydivEl);
            }


        });
        this.addButton(annotationSelectButtonsElem,"select by ID",()=>{
            let value=getE('annotation-select-vertex-input').value;
            let values = [];
            if (value.indexOf(',') > -1) {
                values = value.split(',')
            } else {
                let result=this.graph.vertices.id.indexOf(value);
                //Algs.getVertexShortestPathInAllFixedPoints(this.graph, result);
                G.cameraControls.setTarget(null);
                if(result!=-1) {
                    if (G.graph.nodes.size && G.graph.nodes.size[result] == 0) {
                        G.addLog("Vertex doesn't exist in this layout");
                        return;
                    }
                    let vec=G.view.getNodePos(this.graph.vertices.id.indexOf(value));
                    if(vec.x != undefined || vec.y != undefined || vec.z != undefined ) {
                        G.cameraControls.setTarget(vec, true, true);
                    }
                    if(this.graph.heightProperty == "fixedPointLayer")
                        G.toggleSelectVertex(this.graph.vertexMap[value]);
                    else G.toggleSelectVertex(this.graph.vertexMap[value]);
                } else G.addLog("Vertex doesn't exist in this dataset");
            }
            if(values.length > 0) {
                for(let i=0; i< values.length; i++) {
                    let result=this.graph.vertices.id.indexOf(values[i]);
                    G.cameraControls.setTarget(null);
                    if(result!=-1) {
                        let vec=G.view.getNodePos(values[i]);
                        if(vec.x != undefined || vec.y != undefined || vec.z != undefined )
                            G.cameraControls.setTarget(vec,true);
                        if(this.graph.heightProperty == "fixedPointLayer")
                            G.toggleSelectVertex(this.graph.vertexMap[values[i]]);
                        else G.toggleSelectVertex(this.graph.vertexMap[values[i]]);
                    }
                }
            }

        });

        // this.addButton(selectionButtonsElem,"Show Selected Vertex Paths",()=>{
        //     let value=getE('select-vertex-input').value;
        //     let values = [];
        //     if (value.indexOf(',') > -1) {
        //         values = value.split(',')
        //     } else {
        //         let result=this.graph.vertices.id.indexOf(value);
        //         Algs.getVertexShortestPathInAllFixedPoints(this.graph,value, result);
        //     }
        //
        //
        // });


            let drawingGraphText = getE("drawing-graph");
            // this.addButton(drawingButtonsElem, "Next Neighbors", () => {
            //     const distinct = (value, index, self) => {
            //         return self.indexOf(value) === index;
            //     };
            //     let arr = []
            //     for (let node = 0; node < G.graph.snPathsFlat.length; node++) {
            //         let neighbors = G.graph.getNeighbors(G.graph.snPathsFlat[node]);
            //         arr.push(neighbors);
            //     }
            //     G.graph.snPathsNeigbors = arr.flat(1);
            //     G.graph.snPathsNeigbors = G.graph.snPathsNeigbors.filter(distinct);
            //     G.graph.showingNeighbors = true;
            //     G.view.refreshStyles(true, true);
            //     //G.graph.showingNeighbors = false;
            //     G.graph.trackIndex++;
            //
            // });



            let autoButtonsElem = getE("auto-buttons-area");
            this.addButton(autoButtonsElem, "Pause", () => {
                G.view.bool = false;
                clearInterval(G.view.timerId);
            });
            this.addButton(autoButtonsElem, "Resume", () => {
                if (G.autoExplorePathsOption == 2) {
                    function showTime() {
                        G.view.bool = true;
                        if (G.view.interval_index == -1) {
                            G.view.bool = false;
                            clearInterval(G.view.timerId);
                        }
                        G.vertexLabels.show(G.view.bool, [G.view.graph.highlightPath[G.view.interval_index]]);
                        G.view.interval_index = G.view.interval_index - 1;
                    }

                    console.log(G.animation["auto explore speed"]);
                    G.view.timerId = setInterval(showTime, G.animation["auto explore speed"] * 1000, G.view.interval_index, G.view.bool, G.view.timerId);
                } else if (G.autoExplorePathsOption == 1) {
                    function showTime() {
                        G.view.bool = true;
                        if (G.view.interval_index1 == -1 &&  G.view.interval_index2 == G.view.graph.highlightPath.length) {
                            G.view.bool = false;
                            clearInterval(G.view.timerId);
                            if(G.view.graph.highlightPath.length%2 == 0) {
                                G.view.interval_index1 = G.view.graph.highlightPath.length / 2 - 1;
                                G.view.interval_index2 = G.view.graph.highlightPath.length / 2;
                            } else {
                                G.view.interval_index1 = Math.floor(G.view.graph.highlightPath.length / 2);
                                G.view.interval_index2 = Math.floor(G.view.graph.highlightPath.length / 2);
                            }
                        }
                        G.vertexLabels.show(G.view.bool, [G.view.graph.highlightPath[G.view.interval_index1],G.view.graph.highlightPath[G.view.interval_index2]]);
                        G.view.interval_index1 = G.view.interval_index1 - 1;
                        G.view.interval_index2 = G.view.interval_index2 + 1;
                    }

                    console.log(G.animation["auto explore speed"]);
                    G.view.timerId = setInterval(showTime, G.animation["auto explore speed"] * 1000);
                } else if (G.autoExplorePathsOption == 3) {
                    function showTime() {
                        let stop1 = 0;
                        let stop2 = 0;
                        if (G.view.graph.highlightPath.length % 2 == 0) {
                            stop1 = G.view.graph.highlightPath.length / 2 - 1;
                            stop2 = G.view.graph.highlightPath.length / 2;
                        } else {
                            stop1 = Math.floor(G.view.graph.highlightPath.length / 2) - 1;
                            stop2 = Math.floor(G.view.graph.highlightPath.length / 2) + 1;
                        }
                        G.view.bool = true;
                        if (G.view.interval_index1 == stop1 && G.view.interval_index2 == stop2) {
                            G.view.bool = false;
                            clearInterval(G.view.timerId);
                        }
                        G.vertexLabels.show(G.view.bool, [G.view.graph.highlightPath[G.view.interval_index1], G.view.graph.highlightPath[G.view.interval_index2]]);
                        G.view.interval_index1 = G.view.interval_index1 - 1;
                        G.view.interval_index2 = G.view.interval_index2 + 1;


                    }

                    console.log(G.animation["auto explore speed"]);
                    G.view.timerId = setInterval(showTime, G.animation["auto explore speed"] * 1000, G.view.interval_index, G.view.bool, G.view.timerId);
                }
            });

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


		let hideFunc=function(e){setTimeout(()=>this.style.display="none",5000);};
		//context menus with actions
		this.contextMenus={};
		this.contextMenus.vertices=document.createElement("div");
		document.body.appendChild(this.contextMenus.vertices);
		this.contextMenus.vertices.classList.add("tooltip");
		this.contextMenus.vertices.classList.add("context-menu");
		this.contextMenus.vertices.onmouseout=hideFunc;


        this.contextMenus={};
        this.contextMenus.hoveredVertex=document.createElement("div");
        document.body.appendChild(this.contextMenus.hoveredVertex);
        this.contextMenus.hoveredVertex.classList.add("hovered-tooltip");

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


		this.addButton(this.contextMenus.vertices,"add to SN",()=>G.analytics.addVertexToSparseNet(this.contextMenuTarget));
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
            G.graph.showingSparsenet = false;
			// let subgraph=Algs.getInducedSubgraph(this.graph,this.graph.selectedVertices);
			// subgraph.modifiers={};
			// if(this.graph.modifiers.nodeColor){}
			// if(this.graph.modifiers.nodeColor){subgraph.modifiers.nodeColor=copyObj(this.graph.modifiers.nodeColor);}
			// if(this.graph.colorScaleName){subgraph.colorScaleName=this.graph.colorScaleName;}
			// if(this.graph.cloneProperty){subgraph.cloneProperty=this.graph.cloneProperty;}
			// if(this.graph.heightProperty){subgraph.heightProperty=this.graph.heightProperty;}
			// if(this.graph.heightPropertyTypeHint){subgraph.heightPropertyTypeHint=this.graph.heightPropertyTypeHint;}
			// subgraph.dataPath=this.graph.dataPath+"/customSubgraph/0";
			// subgraph.wholeGraph=this.graph.dataPath;
			// subgraph.isCustom=true;
			// G.loading.saveGraph(subgraph);
			// G.display(subgraph);
            ccs = Algs.getSortedCCsAndCCIDs(this.graph);
           this.graph.snPaths = undefined;
           selected = Number(Object.keys(this.graph.selectedVertices)[0]);
            for (cc in ccs) {
                if (ccs[cc].vertexList.indexOf(selected) != -1) {
                    G.graph.selectedccId = cc;
                    ccg = Algs.getInducedSubgraph(this.graph, ccs[G.graph.selectedccId].vertexList);
                    v = ccg.vertices.length;
                    e = ccg.edges.length;
                    getE("num-edges-vertices").innerHTML = "|V|" + v + " |E|" + e;

                    break;
                }
            }
            document.getElementById("vertical").style.display = "none";
            //document.getElementById("horizontal").style.display="none";
            document.getElementById("path").style.display = "block"
            var img = new Image();
            G.renderer.render(G.scene, G.camera);
            img.src = G.renderer.domElement.toDataURL();
            G.setcolors = G.view.graph.nodes.colorValue;
            G.analytics.showSparseNet(G.graph);
            myDiv = document.getElementById("parent-image");
            myDiv.innerHTML = "";
            var elem = document.createElement("img");
            elem.setAttribute("src", img.src);
            elem.setAttribute("height", "250");
            elem.setAttribute("width", "500");
            elem.setAttribute("border", "5");
            elem.addEventListener("click", function() {
                myDiv = document.getElementById("parent-image");
                myDiv.innerHTML = "";
                G.setcolorsnow = G.setcolors;
                G.view.graph.snPaths = undefined;
                G.subview.disableModifier("sparsenet");
            });
            myDiv.appendChild(elem)
		}
        let addLabeltoNote=(selected = null)=> {
            if (!this.graph) return;
            if(selected == null)
                selected = Number(Object.keys(this.graph.selectedVertices)[0]);
            if(selected != undefined) {
                label = this.graph.labelsByID[selected][G.controls.getLabelIndex()];
                vertexId = Object.keys(G.view.graph.vertexMap).find((v) => {
                    if (this.graph.vertexMap[v] == selected)
                        return v;
                });
                if (!this.graph.annotatedVertices) {
                    this.graph.annotatedVertices = {};
                }
                if (document.getElementById(vertexId) == null) {
                    this.graph.annotatedVertices[selected] = {counter: 1};
                    label = "<div parent=\"" + this.graph.dataPath + "\" id=\"" + vertexId + "\">" + "Vertex Id:" + vertexId + ": " + label + "</div>";
                    document.getElementById('textBox').innerHTML = label+document.getElementById('textBox').innerHTML;
                } else {
                    divEl = document.getElementById(vertexId);
                    copydivEl = divEl;
                    parentn = divEl.parentNode;
                    parentn.removeChild(divEl);
                    text = copydivEl.textContent;
                    isArchived = copydivEl.getAttribute("isArchived");
                    if(isArchived){
                        copydivEl.setAttribute("parent",this.graph.dataPath);
                        regmatch = copydivEl.textContent.match(/\(-(\d+)\)/);
                        if(regmatch && regmatch.length>0){
                            copydivEl.textContent = copydivEl.textContent.replaceAll(regmatch[0], "x");
                            label = "<div parent=\"" + copydivEl.getAttribute("parent") + "\" id=\"" + vertexId + "\">" + copydivEl.textContent+ "</div>";
                            document.getElementById('textBox').innerHTML = label+document.getElementById('textBox').innerHTML;
                        }

                    }
                    parent = divEl.getAttribute("parent").split(",");
                    if (text.match(/\(x(\d+)\)/) && text.match(/x(\d+)\)/).length > 0 && parent.indexOf(this.graph.dataPath) == -1) {
                        countertext = text.match(/\(x(\d+)\)/);
                        counter = Number(countertext[1]);
                        counter += 1;
                        this.graph.annotatedVertices[selected] = {counter: counter};
                        copydivEl.textContent = divEl.textContent.replace(countertext[0], "(x" + counter + ")");
                        copydivEl.setAttribute("parent", parent + "," + this.graph.dataPath)
                        label = "<div parent=\"" + copydivEl.getAttribute("parent") + "\" id=\"" + vertexId + "\">" +  copydivEl.textContent+ "</div>";
                        document.getElementById('textBox').innerHTML = label+document.getElementById('textBox').innerHTML;

                    } else {
                        if (parent.indexOf(this.graph.dataPath) == -1) {
                            this.graph.annotatedVertices[selected] = {counter: 2};
                            copydivEl.textContent = divEl.textContent + "(x2)";
                            copydivEl.setAttribute("parent", parent + "," + this.graph.dataPath)
                            label = "<div parent=\"" + copydivEl.getAttribute("parent") + "\" id=\"" + vertexId + "\">" +  copydivEl.textContent+ "</div>";
                            document.getElementById('textBox').innerHTML = label+document.getElementById('textBox').innerHTML;

                        }
                    }
                }
                G.view.refreshStyles(true, true);
            } else {
                G.addLog("Please select a vertex to add it to annotations");
            }
        }
		this.addButton(this.contextMenus.empty,"draw selected sparsenet",drawSubgraph);
        this.addButton(this.contextMenus.empty,"add label to annotations",addLabeltoNote);
		this.addButton(this.contextMenus.empty,"go to parent",()=>G.showMetagraph());
		let exploreCConHover=()=>{
                if(!G.drawOnHover) {
                    G.addLog("Incompatible drawing option - Select draw vertices on hover");
                    return;
                }
                let cc = G.controls.getSelectedVertexCC();
                G.view.refreshStyles(true, true);

        }
        let shortestPathSelection=()=> {
            if (!this.graph) return;
            if(this.graph.snPaths) {
                if (!G.view.bool && Object.keys(this.graph.selectedVertices).length == 2) {
                    this.graph.highlightPath = [];
                    let source = parseInt(Object.keys(this.graph.selectedVertices)[0]);
                    let target = parseInt(Object.keys(this.graph.selectedVertices)[1]);
                    let shortestPath = Algs.shortestPath(this.graph.sparsenetSubgraph, source, target, true);
                    let shortestPathSparsenet = [];
                    for (let i in shortestPath) {
                        shortestPathSparsenet[i] =
                            (Object.keys(this.graph.sparsenetSubgraph.vertexMap)
                                [Object.values(this.graph.sparsenetSubgraph.vertexMap).indexOf(shortestPath[i])])
                    }
                    this.graph.highlightPath = shortestPathSparsenet;
                    G.view.refreshStyles(true, true);
                    if (G.snPathsAutoExplore) {
                        var x = document.getElementsByName("auto-explore");
                        let option_1 = false;
                        let option_2 = false;
                        let option_3 = false;
                        G.autoExplorePathsOption=0;
                        for(i = 0; i < x.length; i++) {
                            if(x[i].checked) {
                                if (x[i].value == "option_1") {
                                    option_1 = true;
                                    G.autoExplorePathsOption=1;
                                }
                                if (x[i].value == "option_2") {
                                    G.autoExplorePathsOption=2;
                                    option_2 = true;
                                }
                                if (x[i].value == "option_3") {
                                    option_3 = true;
                                    G.autoExplorePathsOption=3;
                                }
                            }

                        }
                        if(option_2) {
                            G.view.interval_index = G.view.graph.highlightPath.length - 1;

                            function showTime() {
                                G.view.bool = true;
                                if (G.view.interval_index == -1) {
                                    G.view.bool = false;
                                    clearInterval(G.view.timerId);
                                    G.view.interval_index = G.view.graph.highlightPath.length - 1;
                                }
                                G.vertexLabels.show(G.view.bool, [G.view.graph.highlightPath[G.view.interval_index]]);
                                G.view.interval_index = G.view.interval_index - 1;
                            }
                            G.view.timerId = setInterval(showTime, G.animation["auto explore speed"] * 1000);
                        } else if(option_3) {
                            G.view.interval_index1 = G.view.graph.highlightPath.length - 1;
                            G.view.interval_index2 = 0;
                            let stop1=0;
                            let stop2=0;
                            if(G.view.graph.highlightPath.length%2 == 0) {
                                stop1= G.view.graph.highlightPath.length/2-1;
                                stop2= G.view.graph.highlightPath.length/2;
                            } else {
                                stop1= Math.floor(G.view.graph.highlightPath.length / 2)-1;
                                stop2= Math.floor(G.view.graph.highlightPath.length / 2)+1;
                            }
                            function showTime() {
                                G.view.bool = true;
                                if (G.view.interval_index1 == stop1 &&  G.view.interval_index2 == stop2) {
                                    G.view.bool = false;
                                    G.view.interval_index1 = G.view.graph.highlightPath.length - 1;
                                    G.view.interval_index2 = 0;
                                    clearInterval(G.view.timerId);
                                }
                                G.vertexLabels.show(G.view.bool, [G.view.graph.highlightPath[G.view.interval_index1],G.view.graph.highlightPath[G.view.interval_index2]]);
                                G.view.interval_index1 = G.view.interval_index1 - 1;
                                G.view.interval_index2 = G.view.interval_index2 + 1;
                            }

                            G.view.timerId = setInterval(showTime, G.animation["auto explore speed"] * 1000);

                        } else if(option_1){
                            if(G.view.graph.highlightPath.length%2 == 0) {
                                G.view.interval_index1 = G.view.graph.highlightPath.length / 2 - 1;
                                G.view.interval_index2 = G.view.graph.highlightPath.length / 2;
                            } else {
                                G.view.interval_index1 = Math.floor(G.view.graph.highlightPath.length / 2);
                                G.view.interval_index2 = Math.floor(G.view.graph.highlightPath.length / 2);
                            }
                            function showTime() {
                                G.view.bool = true;
                                if (G.view.interval_index1 == -1 &&  G.view.interval_index2 == G.view.graph.highlightPath.length) {
                                    G.view.bool = false;
                                    clearInterval(G.view.timerId);
                                    if(G.view.graph.highlightPath.length%2 == 0) {
                                        G.view.interval_index1 = G.view.graph.highlightPath.length / 2 - 1;
                                        G.view.interval_index2 = G.view.graph.highlightPath.length / 2;
                                    } else {
                                        G.view.interval_index1 = Math.floor(G.view.graph.highlightPath.length / 2);
                                        G.view.interval_index2 = Math.floor(G.view.graph.highlightPath.length / 2);
                                    }
                                }
                                G.vertexLabels.show(G.view.bool, [G.view.graph.highlightPath[G.view.interval_index1],G.view.graph.highlightPath[G.view.interval_index2]]);
                                G.view.interval_index1 = G.view.interval_index1 - 1;
                                G.view.interval_index2 = G.view.interval_index2 + 1;
                            }

                            G.view.timerId = setInterval(showTime, G.animation["auto explore speed"] * 1000);
                        }
                    } else {
                        G.view.bool = true;
                        G.vertexLabels.show(G.view.bool, Object.keys(this.graph.selectedVertices))
                    }

                } else {
                    this.graph.highlightPath = [];
                    G.view.bool = false;
                    G.vertexLabels.show(G.view.bool);
                    G.view.refreshStyles(true, true);
                }
            } else {
                if (!G.view.bool && Object.keys(this.graph.selectedVertices).length == 2) {
                    this.graph.highlightPath = [];
                    let source = parseInt(Object.keys(this.graph.selectedVertices)[0]);
                    let target = parseInt(Object.keys(this.graph.selectedVertices)[1]);
                    let shortestPath = Algs.shortestPath(this.graph, source, target, false);
                    this.graph.highlightPath = shortestPath;

                    if (G.snPathsAutoExplore) {
                        var x = document.getElementsByName("auto-explore");
                        let option_1 = false;
                        let option_2 = false;
                        let option_3 = false;
                        G.autoExplorePathsOption=0;
                        for(i = 0; i < x.length; i++) {
                            if(x[i].checked) {
                                if (x[i].value == "option_1") {
                                    option_1 = true;
                                    G.autoExplorePathsOption=1;
                                }
                                if (x[i].value == "option_2") {
                                    G.autoExplorePathsOption=2;
                                    option_2 = true;
                                }
                                if (x[i].value == "option_3") {
                                    option_3 = true;
                                    G.autoExplorePathsOption=3;
                                }
                            }

                        }
                        if(option_2) {
                            G.view.interval_index = G.view.graph.highlightPath.length - 1;

                            function showTime() {
                                G.view.bool = true;
                                if (G.view.interval_index == -1) {
                                    G.view.bool = false;
                                    clearInterval(G.view.timerId);
                                    G.view.interval_index = G.view.graph.highlightPath.length - 1;
                                }
                                G.vertexLabels.show(G.view.bool, [G.view.graph.highlightPath[G.view.interval_index]]);
                                G.view.interval_index = G.view.interval_index - 1;
                            }
                            G.view.timerId = setInterval(showTime, G.animation["auto explore speed"] * 1000);
                        } else if(option_3) {
                            G.view.interval_index1 = G.view.graph.highlightPath.length - 1;
                            G.view.interval_index2 = 0;
                            let stop1=0;
                            let stop2=0;
                            if(G.view.graph.highlightPath.length%2 == 0) {
                                stop1= G.view.graph.highlightPath.length/2-1;
                                stop2= G.view.graph.highlightPath.length/2;
                            } else {
                                stop1= Math.floor(G.view.graph.highlightPath.length / 2)-1;
                                stop2= Math.floor(G.view.graph.highlightPath.length / 2)+1;
                            }
                            function showTime() {
                                G.view.bool = true;
                                if (G.view.interval_index1 == stop1 &&  G.view.interval_index2 == stop2) {
                                    G.view.bool = false;
                                    G.view.interval_index1 = G.view.graph.highlightPath.length - 1;
                                    G.view.interval_index2 = 0;
                                    clearInterval(G.view.timerId);
                                }
                                G.vertexLabels.show(G.view.bool, [G.view.graph.highlightPath[G.view.interval_index1],G.view.graph.highlightPath[G.view.interval_index2]]);
                                G.view.interval_index1 = G.view.interval_index1 - 1;
                                G.view.interval_index2 = G.view.interval_index2 + 1;
                            }

                            G.view.timerId = setInterval(showTime, G.animation["auto explore speed"] * 1000);

                        } else if(option_1){
                            if(G.view.graph.highlightPath.length%2 == 0) {
                                G.view.interval_index1 = G.view.graph.highlightPath.length / 2 - 1;
                                G.view.interval_index2 = G.view.graph.highlightPath.length / 2;
                            } else {
                                G.view.interval_index1 = Math.floor(G.view.graph.highlightPath.length / 2);
                                G.view.interval_index2 = Math.floor(G.view.graph.highlightPath.length / 2);
                            }
                            function showTime() {
                                G.view.bool = true;
                                if (G.view.interval_index1 == -1 &&  G.view.interval_index2 == G.view.graph.highlightPath.length) {
                                    G.view.bool = false;
                                    clearInterval(G.view.timerId);
                                    if(G.view.graph.highlightPath.length%2 == 0) {
                                        G.view.interval_index1 = G.view.graph.highlightPath.length / 2 - 1;
                                        G.view.interval_index2 = G.view.graph.highlightPath.length / 2;
                                    } else {
                                        G.view.interval_index1 = Math.floor(G.view.graph.highlightPath.length / 2);
                                        G.view.interval_index2 = Math.floor(G.view.graph.highlightPath.length / 2);
                                    }
                                }
                                G.vertexLabels.show(G.view.bool, [G.view.graph.highlightPath[G.view.interval_index1],G.view.graph.highlightPath[G.view.interval_index2]]);
                                G.view.interval_index1 = G.view.interval_index1 - 1;
                                G.view.interval_index2 = G.view.interval_index2 + 1;
                            }

                            G.view.timerId = setInterval(showTime, G.animation["auto explore speed"] * 1000);
                        }
                    } else {
                        G.view.bool = true;
                        G.vertexLabels.show(G.view.bool, Object.keys(this.graph.selectedVertices))
                    }
                } else {
                    this.graph.highlightPath = [];
                    G.view.bool = false;
                }
            }
            G.view.refreshStyles(true, true);




        }
        this.addButton(this.contextMenus.empty, "Explore on hover", exploreCConHover);

        this.addButton(this.contextMenus.empty,"Shortest Path",shortestPathSelection);
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
        this.addKeyListener(G.canvasContainer,"a",()=>{
            //G.vertexLabels.show(undefined, G.view.graph.snExtremePoints.slice(290,310));
            if(G.view.graph.modifiers.sparsenet){
                sum =0;
                m =[];
                for(i=0;i<Object.keys(G.view.graph.modifiers.sparsenet.vertexPaths).length;i++){
                    num = G.view.graph.modifiers.sparsenet.vertexPaths[Object.keys(G.view.graph.modifiers.sparsenet.vertexPaths)[i]].length;
                    if(num>Math.log2(G.visibleNodes)){
                        m.push(Object.keys(G.view.graph.modifiers.sparsenet.vertexPaths)[i]);
                    }
                }
                G.vertexLabels.show(undefined, m);

            }

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
			if(mat){mat.uniforms.t.value=G.view.textures[value];mat.needsUpdate=true;}
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
        window.addEventListener("keydown", ev => {
            if (ev.path[0].id != "textBox") {
                if (ev.keyCode === 32) {
                }
                if (ev.key === 'e') {
                    if (G.graph.showingEgonets) {
                        G.graph.showingEgonets = false;
                        G.cameraControls.setTarget(null);
                    } else G.graph.showingEgonets = true;
                }
                if (ev.key === 'n') {
                    if (G.graph.showingNeighbors) {
                        G.graph.showingNeighbors = false;
                        const distinct = (value, index, self) => {
                            return self.indexOf(value) === index;
                        };
                        // if(G.graph.snPathsFlat && G.graph.snPathsTemp)
                        //     G.graph.snPathsFlat = G.graph.snPathsFlat.concat(G.graph.snPathsTemp)
                        //     G.graph.snPathsFlat = G.graph.snPathsFlat.filter(distinct);
                    } else {
                        G.graph.showingNeighbors = true;

                    }

                }
                if (ev.key === 'm') {
                    if (G.graph.showingPaths) {
                        G.graph.showingPaths = false;
                    } else {
                        G.graph.snPathsTemp = (G.graph.snPathsTemp.concat(G.graph.snPaths.slice(this.index, this.index + 1))).flat(1);
                        this.index += 1;
                        getE("showing-paths").textContent = "" + this.index + " sparsenet paths out of " + G.graph.snPaths.length;

                        G.graph.showingPaths = true;
                        G.graph.showingNeighbors = false;
                        const distinct = (value, index, self) => {
                            return self.indexOf(value) === index;
                        };
                        if (G.graph.snPathsFlat && G.graph.snPathsTemp)
                            G.graph.snPathsFlat = G.graph.snPathsFlat.concat(G.graph.snPathsTemp)
                        G.graph.snPathsFlat = G.graph.snPathsFlat.filter(distinct);

                    }

                }
                if (ev.key === 's') {
                    if (G.graph.showingSparsenet) {
                        G.graph.firstShowSparsenet = true;
                        G.graph.showingSparsenet = false;
                    } else {
                        G.graph.showingSparsenet = true;
                        G.graph.showingSparsenet = true;
                        document.getElementById("vertical").style.display = "none";
                        //document.getElementById("horizontal").style.display="none";
                        document.getElementById("path").style.display = "block"

                        G.analytics.showSparseNet(G.graph);

                    }
                }
                if (ev.key === 'a') {
                    if(G.view.graph.modifiers.sparsenet){
                        sum =0;
                        m =[];
                        for(i=0;i<Object.keys(G.view.graph.modifiers.sparsenet.vertexPaths).length;i++){
                            num = G.view.graph.modifiers.sparsenet.vertexPaths[Object.keys(G.view.graph.modifiers.sparsenet.vertexPaths)[i]].length;
                            if(num>Math.log2(G.visibleNodes)){
                                m.push(Object.keys(G.view.graph.modifiers.sparsenet.vertexPaths)[i]);
                            }
                        }
                        G.vertexLabels.show(undefined, m);

                    }
                }
                if (ev.key === 'l') {
                    G.vertexLabels.show();
                }

            }
            //removed moving
        });
		window.addEventListener("keyup", ev=>{
            if (ev.path[0].id != "textBox") {
			if ( ev.keyCode === 32) { //toggles tooltip
			if(!G.showingTooltip){G.showingTooltip=true;G.toolTipElem.style.opacity="1";}
			if(G.showingTooltip){G.showingTooltip=false;G.toolTipElem.style.opacity="0.7";}
		}}
		});
		G.showingControls=false;
        G.showingControls1=false;
        G.showingControls2=false;
        G.showingControls3=false;
		window.addEventListener("keydown", ev=>{
			if ( ev.key==="`" ) { }
			//removed moving
		});
		window.addEventListener("keyup", ev=>{
            if (ev.path[0].id != "textBox") {
                if (ev.key === "`") {
                    if (G.showingControls) {
                        G.showingControls = false;
                        getE("graph-menu").style.display = "none";
                        getE("style-menu").style.display = "none";
                    } else {
                        G.showingControls = true;
                        getE("graph-menu").style.display = "block";
                        getE("style-menu").style.display = "block";
                    }
                }
            }
		});
        let b=getE("panel-show");
        document.getElementById("info-bar-show").addEventListener('click', function(){
            if(G.showingControls1){
                G.showingControls1=false;
                getE("graph-plot-bar").style.display="none";
                getE("graph-info-bar").style.display="none";
                getE("graph-plot-bar").style.display="none";
                getE("graph-dataset-bar").style.display="none";
                getE("graph-menu").style.display="none";

            }
            else{
                getE("graph-plot-bar").style.display="none";
                getE("graph-fork-bar").style.display="none";
                getE("graph-menu").style.display="none";
                getE("graph-dataset-bar").style.display="none";
                getE("graph-info-bar").style.display="block";

                G.showingControls1=true;
                G.showingControls2=false;
                G.showingControls3=false;
                G.showingControls4=false;
                G.showingControls5=false;
            }
        }, false);
        document.getElementById("plot-bar-show").addEventListener('click', function(){
            if(G.showingControls2){
                G.showingControls2=false;
                getE("graph-info-bar").style.display="none";
                getE("graph-info-bar").style.display="none";
                getE("graph-plot-bar").style.display="none";
                getE("graph-dataset-bar").style.display="none";
                getE("graph-menu").style.display="none";
            }
            else{
                getE("graph-info-bar").style.display="none";
                getE("graph-fork-bar").style.display="none";
                getE("graph-dataset-bar").style.display="none";
                getE("graph-menu").style.display="none";

                G.showingControls2=true;
                G.showingControls1=false;
                G.showingControls3=false;
                G.showingControls4=false;
                G.showingControls5=false;
                getE("graph-plot-bar").style.display="block";
            }
        }, false);
        document.getElementById("fork-bar-show").addEventListener('click', function(){
            if(G.showingControls3){
                G.showingControls3=false;
                getE("graph-fork-bar").style.display="none";
                getE("graph-info-bar").style.display="none";
                getE("graph-plot-bar").style.display="none";
                getE("graph-dataset-bar").style.display="none";
                getE("graph-menu").style.display="none";
            }
            else{
                getE("graph-info-bar").style.display="none";
                getE("graph-plot-bar").style.display="none";
                getE("graph-dataset-bar").style.display="none";
                getE("graph-menu").style.display="none";
                G.showingControls3=true;
                G.showingControls1=false;
                G.showingControls2=false;
                G.showingControls4=false;
                G.showingControls5=false;
                getE("graph-fork-bar").style.display="block";
            }
        }, false);
        document.getElementById("search-bar-show").addEventListener('click', function(){
            if(G.showingControls4){
                G.showingControls4=false;
                getE("graph-fork-bar").style.display="none";
                getE("graph-info-bar").style.display="none";
                getE("graph-plot-bar").style.display="none";
                getE("graph-dataset-bar").style.display="none";
                getE("graph-menu").style.display="none";

            }
            else{
                getE("graph-info-bar").style.display="none";
                getE("graph-plot-bar").style.display="none";
                getE("graph-fork-bar").style.display="none";
                getE("graph-dataset-bar").style.display="none";
                getE("graph-info-bar").style.display="none";
                getE("graph-menu").style.display="block";

                G.showingControls4=true;
                G.showingControls1=false;
                G.showingControls2=false;
                G.showingControls3=false;
                G.showingControls5=false;
            }
        }, false);
        G.showingControls5=true;
        document.getElementById("dataset-bar-show").addEventListener('click', function(){
            if(G.showingControls5){
                G.showingControls5=false;
                getE("graph-info-bar").style.display="none";
                getE("graph-info-bar").style.display="none";
                getE("graph-plot-bar").style.display="none";
                getE("graph-menu").style.display="none";
                getE("graph-dataset-bar").style.display="none";

            }
            else{
                getE("graph-plot-bar").style.display="none";
                getE("graph-fork-bar").style.display="none";
                getE("graph-menu").style.display="none";
                getE("graph-dataset-bar").style.display="block";
                getE("graph-info-bar").style.display="none";

                G.showingControls5=true;
                G.showingControls4=false;
                G.showingControls2=false;
                G.showingControls3=false;
                G.showingControls1=false;
            }
        }, false);
        G.drawsparsenet = false;
        G.drawFixedPoints = false;
        document.getElementById("drawing_option_2").addEventListener('click', function(){
            if(G.drawFixedPoints) G.drawFixedPoints = false;
            else G.drawFixedPoints = true;
        }, false);
        document.getElementById("drawing_option_3").addEventListener('click', function(){
            if(G.drawOnHover)
                G.drawOnHover = false;
            else G.drawOnHover = true;
        }, false);
        document.getElementById("rotate_option").addEventListener('click', function(){
            if(G.animation.rotate) {
                G.animation.rotate=false;
                G.animation["rotate speed"]=0;
            }else {
                G.animation.rotate=true;
                G.animation["rotate speed"]=0.3;
            }

        }, false);
        document.getElementById("auto_explore_option").addEventListener('click', function(){
            if(G.snPathsAutoExplore) {
                G.snPathsAutoExplore=false;
                G.animation["auto explore speed"] =1;
            }else {
                G.snPathsAutoExplore=true;
                G.animation["auto explore speed"]=1;
            }

        }, false);
        document.getElementById("color_code_nodes_option_1").addEventListener('click', function(){
            if(G.graph.dataPath != "fabula"){
                G.addLog("This option isn't customized for this dataset");
                return;
            }
            if(G.snNodesColorByLabel) {
                G.snNodesColorByLabel=false;
                document.getElementById("labels_color-mapping").style.display="none";
                G.view.refreshStyles(true,true);
            }else {
                document.getElementById("labels_color-mapping").style.display="block";
                G.snNodesColorByLabel=true;
                G.view.refreshStyles(true,true);
            }
        }, false);
        document.getElementById("color_code_nodes_option_2").addEventListener('click', function(){
            if(G.graph.dataPath != "fabula"){
                G.addLog("This option isn't customized for this dataset");
                return;
            }
            if(G.snNodesColorByHotSpot) {
                document.getElementById("spots_color-mapping").style.display="none";
                G.snNodesColorByHotSpot=false;
                G.view.refreshStyles(true,true);

            }else {
                G.snNodesColorByHotSpot=true;
                document.getElementById("spots_color-mapping").style.display="block";
            }
        }, false);
        document.getElementById("highlight_color_node_path").addEventListener('click', function(){
            if(G.snHighlightPathNodesColor) {
                G.snHighlightPathNodesColor=false;
                document.getElementById("highlight_color_node_path").style.display="none";
                G.view.refreshStyles(true,true);
            }else {
                document.getElementById("highlight_color_node_path").style.display="block";
                G.snHighlightPathNodesColor=true;
                G.view.refreshStyles(true,true);
            }
        }, false);

        this.initGestures();
		this.initInteractions();

	},

	displayGraph:function(graph){
		while(graph.representation)graph=G.getGraph(graph.dataPath+"/metagraphs/"+graph.representation);
		this.graph=graph;
	},
    getSelectedVertexCC:function(graph){

        selected = Number(Object.keys(this.graph.selectedVertices)[0]);
        if(!isNaN(selected) && selected != undefined) {
            ccs = Algs.getSortedCCsAndCCIDs(this.graph);
            this.graph.snPaths = undefined;
            for (cc in ccs) {
                if (ccs[cc].vertexList.indexOf(selected) != -1) {
                    G.graph.selectedccOnHover = ccs[cc];
                    break;
                }
            }
        }
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
                    let min = initialValue / 10, max = initialValue * 10;
                    if ("min" in options) min = options.min;
                    if ("max" in options) max = options.max;
                    Object.assign(options, {min: min, max: max, value: initialValue});
                    this.addSlider(menu, toNormalText(controlName), (value) => {
                        this.values[controlName] = value;
                        if (callback) callback(value);
                    }, options);
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
        if(text == "Next Neighbors" || text == "Pause") {
            s.attr("style", "margin-right: 20px;");
        }
        if(text == "Download HotSpots") {
            s.attr("style", "margin-top: 20px;");
        }
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
	addSlider(parentElem,text,func,options, num="", id=""){
		let min=0,max=1;let lazy=false;
		if(!options)options={};
		//allow changing the range later through this object
		if("min" in options==false)options.min=0;
		if("max" in options==false)options.max=1;

        let s=d3.select(parentElem).append("div").attr("class","material-slider");
		if(id != "") {
		    s.attr("id",id);
		    if(id=="path"){
                s.attr("style","display:none;");
            }
        }

		if(options.long){s.attr("class","material-slider long");}
		let elem=s.node();elem.__options=options;options.elem=elem;
        if(text == "vertical spread" || text == "horizontal spread" || text == "node size" || text == "link thickness" || id == "path") {
            s.append("p").attr("id", num).attr("class", "material-slider-label-2").text(text);
        } else {
            s.append("p").attr("id", num).attr("class", "material-slider-label").text(text);
        }
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
	    let obj = null;
	    if(text == "Path Sequence") {
            parentElem = this.styleControlsElem;
            obj=this.addSlider(parentElem,text,func,options,"",'path');
        } else {
            obj=this.addSlider(parentElem,text,func,options,"");
        }
		let elem=obj.elem,s=d3.select(elem);

		let stepButtonsAreaSelection=s.append("div").attr("class","step-buttons-area").style("width","30%");//.style("margin-top","3px");
		let barSelection=s.select(".material-slider-bar-container");
		barSelection.style("width","52%");
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
	addRangeSlider(parentElem,text,func,options, id =""){
		let min=0,max=1;let lazy=false;
		if(!options)options={};
		//allow changing the range later through this object
		if("min" in options==false)options.min=0;
		if("max" in options==false)options.max=1;
		if("begin" in options==false)options.begin=options.min;
		if("end" in options==false)options.end=options.max;

		let s=d3.select(parentElem).append("div").attr("class","range-slider");
		if(id != ""){
		    s.attr("id", id);
        }
		if(options.vertical)s.attr("class","range-slider-vertical");
		let elem=s.node();elem.__options=options;

		let label=s.append("p").attr("class","slider-label").text(text);
		let barContainer=s.append("div").attr("class","slider-bar-container");
		let pivot1=barContainer.append("div").attr("class","slider-pivot-begin");
		let pivot2=barContainer.append("div").attr("class","slider-pivot-end");
		let bar=barContainer.append("div").attr("class","slider-bar");
		let valDis = s.append("div").attr("class","custom-control-label");

		let cb=function(data,i,elem){
			let isBeginPivot;if(this==pivot1.node()){isBeginPivot=true;}else{isBeginPivot=false;}
			let rect=barContainer.node().getBoundingClientRect();
			let length,totalLength;
			if(options.vertical){totalLength=rect.height;length=clamp(d3.event.y,0,rect.height);}
			else{totalLength=rect.width;length=clamp(d3.event.x,0,rect.width);}
			let max=options.max,min=options.min;
                let value=Math.floor((max-min)*(length)/totalLength+min);
			let begin=options.begin,end=options.end;
			if(isBeginPivot){//ensure that end>=begin no matter how they are dragged
				begin=value;
				if(end<value)end=value;
			}
			else{
				end=value;
				if(begin>value)begin=value;
			}
                valDis.text("["+begin + " - "+end+"]");
            valDis.style("padding-top", "10px");

            let percent1=Math.floor(95*(begin-min)/(max-min));
			let percent2=Math.floor(90*(end-min)/(max-min));
			if(max==min){percent1="0";percent2="100";}
			if(options.vertical){
				bar.style("bottom",(100-percent1)+"%");
				bar.style("top",percent2+"%");
				pivot1.style("top",percent1+"%");
				pivot2.style("bottom",(100-percent2)+"%");
			}
			else{
				bar.style("left",percent1+"%");
				bar.style("right",(95-percent2)+"%");
				pivot1.style("right",(90-percent1)+"%");
				pivot2.style("left",percent2+"%");
			}
			options.begin=begin;
			options.end=end;
			func(begin,end);
		};
		let onUpdate=function(beginValue,endValue){
			let percent1=Math.floor(95*(beginValue-options.min)/(options.max-options.min));
			let percent2=Math.floor(90*(endValue-options.min)/(options.max-options.min));
			if(max==min){percent1="0";percent2="100";}
			if(options.vertical){
				bar.style("bottom",(100-percent1)+"%");
				bar.style("top",percent2+"%");
				pivot1.style("top",percent1+"%");
				pivot2.style("bottom",(100-percent2)+"%");
			}
			else{
				bar.style("left",percent1);
				bar.style("right",(95-percent2));
				pivot1.style("right",(90-percent1));
				pivot2.style("left",percent2);
			}
		};
		options.onUpdate=onUpdate;//call when the value is changed outside
		if(options.lazy){pivot1.call(d3.drag().on("end",cb));pivot2.call(d3.drag().on("end",cb));}
		else {pivot1.call(d3.drag().on("drag",cb).on("end",cb));pivot2.call(d3.drag().on("drag",cb).on("end",cb));}
		return options;
	},
    getLabelIndex(){
        var language = "en";
        var labelIndex ="";
        var x = document.getElementsByName("language");
        for (i = 0; i < x.length; i++) {
            if (x[i].checked) {
                language = x[i].value;
                break;
            }

        }
        isEnglish = language == "en";
        isDanish = language == "da";
        isDutch = language == "du";
        if (isEnglish)
            labelIndex = 0;
        else if (isDanish) labelIndex = 1;
        else if (isDutch) labelIndex = 2;
        return labelIndex;
    },
    getLabel(originalObjectID) {
	    var language = "en";
	    var label ="";
        var x = document.getElementsByName("language");
        for (i = 0; i < x.length; i++) {
            if (x[i].checked) {
                language = x[i].value;
                break;
            }

        }
        isEnglish = language == "en";
        isDanish = language == "da";
        isDutch = language == "du";
        if (G.view.graph.labelsByID[originalObjectID]) {
            let a = G.view.graph.labelsByID[originalObjectID];
            if (isEnglish)
                label = a[0];
            else if (isDanish) label = a[1];
            else if (isDutch) label = a[2];
        }
        if(label) return label
        else return ""
        return label;
    },
    addCheckbox(parentElem, text, func, options, id=null, val = false, image =null){
        let arr = [];
        if(text == "show warms"){
            text = "show neighbors";
        }

        if (!options) options = {};
        let s = d3.select(parentElem).append("div").attr("class", "material-checkbox");
        if(id){
            s.attr("id", id);
        }
        if(arr.indexOf(text)!=-1) {
            s.attr("style","display:none;");
        }
        if(text == "Reset" || val){
            s.attr("style","margin-top: 20px;margin-left: 15px;");

        }
        let checkbox = null;
        let label = null;
        if(val) {
            s.attr("style","padding-bottom: 20px;padding-top:20px;width: 100%;");
            checkbox = s.append("input").attr("type", "checkbox").attr("class", "material-checkbox");
            label = s.append("p").attr("class", "material-checkbox-label").text(text);
            label.attr("style","font-size: small;text-align: left;width: 100%;padding-left: 5px;");
            s.append("img").attr("src", image).attr("height", "50").attr("width", "50");
        } else {
            label = s.append("p").attr("class", "material-checkbox-label").text(text);
            checkbox = s.append("input").attr("type", "checkbox").attr("class", "material-checkbox");
        }
        let checkboxElem = checkbox.node();
        if(id) {
            checkbox.on("input", () => func(checkboxElem.checked, id));
        } else checkbox.on("input", () => func(checkboxElem.checked));
        let onUpdate = function (value) {
            checkboxElem.checked = value;
        };
        options.onUpdate = onUpdate;//call when the value is changed outside
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
		p.style.color = "red";
		if(lastlog) {
            G.logElem.replaceChild(p, lastlog);
        }else {
            G.logElem.appendChild(p);
        }
		p.createTime=new Date().getTime();
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
			if(result) {
                //the description comes in two parts, the original object (eg.vertices) description if available from the analytics, and the view object(eg node) description defined in the view or subview(if the view defines it it takes priority over the subview one).

                let objID = result.objectID;
                let type = result.type;
                let originalObjectID = result.originalObjectID, originalObjectType = result.originalObjectType,
                    originalObject = result.originalObject, originalObjects = result.originalObjects;
                let originalTypeSingular = null;
                if (originalObjectType && G.analytics.templates[originalObjectType]) {
                    originalTypeSingular = G.analytics.templates[originalObjectType].singularName;
                }
                let subgraphLevel = result.subview.subgraphLevel;
                let subgraph = result.subview.graph;
                let vertexId = G.view.graph.vertices.id[originalObjectID];

                // let originalDesc="";
                // if(originalObjectType){
                // 	originalDesc=((originalTypeSingular?toNormalText(originalTypeSingular):toSingularName(toNormalText(originalObjectType)))+" "+originalObjectID+(subgraphLevel?" (in subgraph "+subgraph.shortName+") ":""));
                // 	if(G.analytics.templates[originalObjectType]&&G.analytics.templates[originalObjectType].getDescription){
                // 		originalDesc+=G.analytics.templates[originalObjectType].getDescription(originalObject,originalObjectID,result.subview.graph[originalObjectType]);
                // 	}
                // 	originalDesc+="\n";
                // }
                // let viewTypeSingular=null;
                // if(G.view.templates[type].singularName){viewTypeSingular=G.view.templates[type].singularName;}
                // let viewDesc=(toNormalText((viewTypeSingular?viewTypeSingular:toSingularName(result.type)))+" "+objID);
                // if(G.view.templates[type]&&G.view.templates[type].getDescription){
                // 	viewDesc+=" "+G.view.templates[type].getDescription(obj,objID,G.view.model[result.type]);
                // }
                if (G.view.graph && G.view.graph.snWorms) {
                    if (G.view.graph.labelsByID != "null") {
                        let label = G.controls.getLabel(originalObjectID);
                        G.toolTipElem.textContent = "Vertex: " + originalObjectID + " " + label;

                        let menu = G.controls.contextMenus["hoveredVertex"];
                        menu.innerHTML = "";
                        let vertexLayers ="";
                        if(this.graph.parentLayersMap && this.graph.parentLayersMap[this.graph.vertices.id[originalObjectID]]){
                            layers = Object.keys(this.graph.parentLayersMap[this.graph.vertices.id[originalObjectID]]);
                            vertexLayers += "This vertex appears in Fixed Points " + layers.sort().reverse();
                        }
                        G.controls.contextMenus.hoveredVertex.textContent = "Vertex: " + vertexId + " " + label ;
                        G.controls.contextMenus.hoveredVertex.item = document.createElement('div');
                        let vertexLayersDiv = document.createElement('div');
                        vertexLayersDiv.setAttribute("class", "material-checkbox-label");
                        vertexLayersDiv.style.display = "none";
                        vertexLayersDiv.innerHTML += vertexLayers + "\n</br>";
                        var link = document.createElement('a');
                        link.setAttribute("id","downloadLink");
                        link.textContent = "Download";
                        link.classList.add("download-link");
                        link.style.color="blue";
                        link.style.display="none";
                        var copy = document.createElement('a');
                        copy.setAttribute("id","addToNotes");
                        copy.textContent = "Add to Annotations";
                        copy.classList.add("download-link");
                        copy.style.color="blue";
                        copy.style.display="none";
                        G.controls.addCheckbox(G.controls.contextMenus.hoveredVertex, toNormalText("Show Vertex Layers"), (value) => {
                            if (value) {
                                vertexLayersDiv.style.display = "block";
                            } else {
                                vertexLayersDiv.style.display = "none";
                            }
                        });
                        G.controls.contextMenus.hoveredVertex.append(vertexLayersDiv);

                        if (G.view.graph && G.view.graph.snWorms) {
                            if (G.view.graph.snwormsList[originalObjectID] && G.view.graph.snwormsList[originalObjectID].length > 0) {
                                G.controls.addCheckbox(G.controls.contextMenus.hoveredVertex, toNormalText("Show Neighbors"), (value) => {
                                    if (value) {
                                        G.controls.contextMenus.hoveredVertex.item.style.display = "block";
                                        link.style.display="block";
                                        copy.style.display="block";
                                    } else {
                                        G.controls.contextMenus.hoveredVertex.item.style.display = "none";
                                        link.style.display="none";
                                        copy.style.display="none";
                                    }
                                });
                                menu.appendChild(link);
                                menu.appendChild(copy);
                                let classify = [];
                                G.controls.contextMenus.hoveredVertex.item.classList.add("hovered-tooltip-text");
                                G.controls.contextMenus.hoveredVertex.item.innerHTML = "";
                                for (let i = 0; i < G.view.graph.snwormsList[originalObjectID].length; i++) {
                                    r = "";
                                    if (G.view.graph.snwormsList[originalObjectID][i]){
                                        if (G.view.graph.snwormsList[originalObjectID][i].includes("TMI")) {
                                            r = G.view.graph.snwormsList[originalObjectID][i].match(/[A-Z][0-9]{1,9}/);
                                        } else if (G.view.graph.snwormsList[originalObjectID][i].includes("ATU")) {
                                            r = G.view.graph.snwormsList[originalObjectID][i].match(/[A-Z] # [0-9]{1,9}/);
                                        }
                                    if (r && r.length > 0) {
                                        r = r[0];
                                        if (G.view.graph.snwormsList[originalObjectID][i].includes("TMI") || G.view.graph.snwormsList[originalObjectID][i].includes("ATU")) {
                                            if (G.view.graph.snwormsList[originalObjectID][i].includes("TMI")) {
                                                a = (G.view.graph.TMIclassification.filter(record => record.start.substring(0, 1) == r.substring(0, 1))).filter(
                                                    record => (Number(record.start.substring(1)) < Number(r.substring(1))
                                                        && Number(record.end.substring(1)) > Number(r.substring(1))));
                                            } else if (G.view.graph.snwormsList[originalObjectID][i].includes("ATU")) {
                                                a = (G.view.graph.ATUclassification.filter(record => (Number(record.start) < Number(r.substring(4)))
                                                    && (Number(record.end) > Number(r.substring(4)))));
                                            }
                                            if (a && a[0] && a[0].label) {
                                                classify.push({
                                                    label: G.view.graph.snwormsList[originalObjectID][i],
                                                    classif: a[0].label
                                                })
                                            }
                                        }
                                    } else {
                                        g = document.createElement('div');
                                        g.setAttribute("class", "material-checkbox-label");
                                        g.innerHTML += G.view.graph.snwormsList[originalObjectID][i] + "\n</br>";
                                        G.controls.contextMenus.hoveredVertex.item.append(g);
                                    }
                                }
                                }
                                if(classify.length > 0) {
                                    result = classify.reduce((h, {label, classif}) => {
                                        return Object.assign(h, {[classif]: (h[classif] || []).concat({label})})
                                    }, {})
                                    if (result) {
                                        for (k in Object.keys(result)) {
                                            //G.controls.contextMenus.hoveredVertex.item.innerHTML += Object.keys(result)[k] + "\n</br>";
                                            // for(i in result[Object.keys(result)[k]] )
                                            //     G.controls.contextMenus.hoveredVertex.item.innerHTML += result[Object.keys(result)[k]][i].label + "\n</br>";
                                            G.controls.addCheckbox(G.controls.contextMenus.hoveredVertex.item, toNormalText(Object.keys(result)[k]), (value, id) => {
                                                if (value) {
                                                    if(document.getElementById("label" + id)) {
                                                        document.getElementById("label" + id).style.display = "block";
                                                    }
                                                    link.style.display = "inline";
                                                } else {
                                                    if(document.getElementById("label" + id)) {
                                                        document.getElementById("label" + id).style.display = "none";
                                                    }
                                                    link.style.display = "none";
                                                }
                                            }, {}, k);
                                            g = document.createElement('div');
                                            g.setAttribute("id", "label" + k);
                                            g.setAttribute("class", "material-checkbox-label");
                                            g.style.display = "none";
                                            G.controls.contextMenus.hoveredVertex.item.append(g);
                                            for (i in result[Object.keys(result)[k]])
                                                g.innerHTML += result[Object.keys(result)[k]][i].label + "\n</br>";

                                        }
                                    }
                                }
                                G.controls.contextMenus.hoveredVertex.item.style.display = "none";
                                menu.appendChild(G.controls.contextMenus.hoveredVertex.item);
                                function downloadInnerHtml(filename, elId, mimeType) {
                                    if(result) {
                                        for (k in Object.keys(result)) {
                                            if(document.getElementById("label" + k)) {
                                                document.getElementById("label" + k).style.display = "block";
                                            }
                                        }
                                    }
                                    var elHtml = document.getElementsByClassName(elId)[0].innerText;
                                    var link = document.createElement('a');
                                    mimeType = mimeType || 'text/plain';

                                    link.setAttribute('download', filename);
                                    link.setAttribute('href', 'data:' + mimeType + ';charset=utf-8,' + encodeURIComponent(elHtml));
                                    link.click();
                                }
                                function addToNotes(elId) {
                                    var elHtml = document.getElementsByClassName(elId)[0].innerHTML;
                                    elHtml= elHtml.replaceAll("<input type=\"checkbox\" class=\"material-checkbox\">", "");
                                    elHtml +="</br>";
                                    document.getElementById('textBox').innerHTML +=elHtml;
                                }

                                var fileName =  'Vertex'+originalObjectID+'_'+label+'.txt'; // You can use the .txt extension if you want

                                $('#downloadLink').click(function(){
                                    downloadInnerHtml(fileName, 'hovered-tooltip-text','text/html');
                                });
                                $('#addToNotes').click(function(){
                                    addToNotes('hovered-tooltip-text');
                                });
                            }
                        }
                    } else
                        G.toolTipElem.textContent = "Vertex: " + vertexId;
                    this.graph.hoveredVertex = originalObjectID;
                    G.view.refreshStyles(true, true);
                    G.showContextMenu("hoveredVertex");

                    switch (result.type) {
                        case "nodes":
                            //$("#egonet").modal('show');
                            let nodes = G.view.model.nodes;

                            let vertices = originalObjects;
                            if (vertices.waveLayers && vertices.waveLayersExpanded) {
                                if (!vertices.waveLayersExpanded[originalObjectID]) {
                                    vertices.waveLayersExpanded[originalObjectID] = true;
                                } else {
                                    vertices.waveLayersExpanded[originalObjectID] = false;
                                }
                                //G.view.refreshStyles(true,true);
                                return;
                            }
                            //highlight edges and neighhbors

                            this.graph.hoveredVertex = originalObjectID;
                            G.view.refreshStyles(true, true);
                    }
                } else {

                    let objID=result.objectID;let type=result.type;
                    let originalObjectID=result.originalObjectID,originalObjectType=result.originalObjectType,originalObject=result.originalObject,originalObjects=result.originalObjects;
                    let originalTypeSingular=null;
                    if(originalObjectType&&G.analytics.templates[originalObjectType]){originalTypeSingular=G.analytics.templates[originalObjectType].singularName;}
                    let subgraphLevel=result.subview.subgraphLevel;let subgraph=result.subview.graph;
                    if(G.view.graph.labelsByID != "null") {
                        vertesLayers = "";
                        if(this.graph.parentLayersMap && this.graph.parentLayersMap[this.graph.vertices.id[originalObjectID]]) {
                            layers = Object.keys(this.graph.parentLayersMap[this.graph.vertices.id[originalObjectID]]);
                            vertesLayers += ", appears in Fixed Points: "+layers.sort().reverse()
                        }
                        let label = G.controls.getLabel(originalObjectID);
                        G.toolTipElem.textContent = "Vertex: " + vertexId + " " + label+ vertesLayers ;
                    }
                    else
                        G.toolTipElem.textContent = "Vertex: " +vertexId;
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

                            this.graph.hoveredVertex = originalObjectID;
                            G.view.refreshStyles(true, true);
                    }

                }
                if(this.graph.parentLayersMap && this.graph.parentLayersMap[this.graph.vertices.id[originalObjectID]]){
                    layers = Object.keys(this.graph.parentLayersMap[this.graph.vertices.id[originalObjectID]]);
                    G.addLog("This vertex appears in Fixed Points: " + layers.sort().reverse());
                }
            }
			else{


				if(G.view.graph && G.view.graph.snWorms) {
                    $(document).on('mouseover', 'div', function (e) {
                        if ($(e.target).attr('class') != "hovered-tooltip" &&
                            $(e.target).attr('class') != "material-checkbox" &&
                            $(e.target).attr('class') != "material-checkbox-label" &&
                            $(e.target).attr('class') != "hovered-tooltip-text" &&
                            $(e.target).attr('class') != "context-menu" &&
                            $(e.target).attr('class') != "material" &&
                            $(e.target).attr('class') != "download-link") {
                            let menu = G.controls.contextMenus["hoveredVertex"];
                            menu.innerHTML = "";
                            menu.style.display = "none";
                        }
                    });
                } else {
                    let menu = G.controls.contextMenus["hoveredVertex"];
                    menu.innerHTML = "";
                    menu.style.display = "none";
                    G.toolTipElem.textContent="";
                    G.toolTipElem.style.display="none";
                }
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
                let menu=G.controls.contextMenus["hoveredVertex"];
                menu.innerHTML = "";
                menu.style.display="none";
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
			else{
			    delete selected[vertex];
                G.cameraControls.setTarget(null);
			}
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
			G.mouseScreenPos.x=event.clientX;
            G.mouseScreenPos.y=event.clientY;
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



		G.hoverDelay=0;
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





