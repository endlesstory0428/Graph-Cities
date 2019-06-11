
	//experimental layout cache
		//experimental layout: try using a matrix to save some time?
		//list all combinations of layers that exist, and mark each vertex/clone with its layer set ID, and make a matrix of pairs of sets, not pairs of clones(much faster to create and less memory)
		let setList=dataset.layerSets;
		if(setList.length<1000){
			dataset.experimentalLayoutCache=[];
			let c=dataset.experimentalLayoutCache;
			let vs=dataset.vertices,dvs=dataset.clonedVertices;
			function distance(set1,set2){
				//Jaccard distance of the sets of layers their clones appear in
				let u={},i={};
				for(let l in set1){u[l]=true;if(l in set2)i[l]=true;}
				for(let l in set2){u[l]=true;}
				return (1-Object.keys(i).length/Object.keys(u).length);
			}
			for (let i =0;i<setList.length;i++)
			{
				c[i]=[];
				for(let j=0;j<setList.length;j++){
					c[i][j]=distance(setList[i],setList[j]);
				}
			}
		}
		else{dataset.experimentalLayoutCache=null;dataset.experimentalLayout=false;}
		
		
		
	
		G.linkStrengthFactor = 0.1;G.logLinkStrength=false;G.linkStrengthExponent=1;G.linkWeightAsStrength=true;
		
		G.activeLayer=null;
		
		var graphFolder = gui.addFolder('Graph');//a few parameters that control the p in different ways - the plain p value is too imprecise in a slider when we want very small values, so I think adding np(or 1/n) and logn/n scales are better.
		G.analytics.edgeProbability=0.1;G.analytics.np=5;G.analytics.npOverLogn=5;//just default values; will be updated when the data is shown
		graphFolder.add(G.analytics, 'edgeProbability', 0.00000001, 1).onFinishChange(function(value) {
			let n=G.dataset.vertices.length;
			G.analytics.np=G.analytics.edgeProbability*n;
			G.analytics.npOverLogn=G.analytics.np/Math.log(n);
			G.analytics.randomizeGraph(n,G.analytics.edgeProbability);
		}).listen();
		graphFolder.add(G.analytics, 'np', 0, 10).onFinishChange(function(value) {
			
			let n=G.dataset.vertices.length;
			G.analytics.edgeProbability=G.analytics.np/n;
			G.analytics.npOverLogn=G.analytics.np/Math.log(n);
			G.analytics.randomizeGraph(n,G.analytics.edgeProbability);
		}).listen();
		graphFolder.add(G.analytics, 'npOverLogn', 0, 10).onFinishChange(function(value) {
			
			let n=G.dataset.vertices.length;
			G.analytics.np=G.analytics.npOverLogn*Math.log(n);
			G.analytics.edgeProbability=G.analytics.np/n;
			G.analytics.randomizeGraph(n,G.analytics.edgeProbability);//
		}).listen();
		G.alwaysCalculateLayers=false;
		graphFolder.add(G.analytics, 'alwaysCalculateLayers');
		//buttons
		graphFolder.add(G.analytics, 'halfVertices');
		graphFolder.add(G.analytics, 'doubleVertices');
		graphFolder.add(G.analytics, 'randomizeGraph');
		graphFolder.add(G.ui, 'showEdgeListMenu');
		G.showWaveLevelTable=false;
		graphFolder.add(G, 'showWaveLevelTable');
		G.showSmallCCinWhole=true;
		graphFolder.add(G, 'showSmallCCinWhole');
		
		var sceneFolder = gui.addFolder('Scene');
		G["camera type"]="perspective";
		sceneFolder.add(G, 'camera type', {perspective:"perspective","orthographic":"orthographic"}).onChange(function(value){
			G.camera=G.cameras[value];
			G.renderPass.camera=G.camera;
			}
		);
		G.backgroundColor=0xfefeff;G.lightStyle=true;
		sceneFolder.addColor(G,"backgroundColor").onChange((value)=>{
			G.scene.background = new THREE.Color(value);
			//change between additive and normal blending
			if(G.scene.background.getHSL().l>0.35){G.lightStyle=true;G.ui.switchStyle(true);}else{G.lightStyle=false;G.ui.switchStyle(false);}
			let blending=(G.scene.background.getHSL().l>0.35)?1:2;//normal or additive
			for(let name in G.view.sceneObjects){
				let mat=G.view.sceneObjects[name].material;
				if(mat){mat.blending=blending;mat.needsUpdate=true;}
			}
			G.view.updateStyle();
		});
		G["blending type"]=1;
		sceneFolder.add(G, 'blending type', {"None":0,"Normal":1,"Additive":2,"Subtractive":3,"Multiply":4}).onChange(function(value){
			console.log(value);
			for(let name in G.view.sceneObjects){
				let mat=G.view.sceneObjects[name].material;
				if(mat){mat.blending=Number(value);mat.needsUpdate=true;}
			}
		});
		G.view["node texture"]="dot";
		sceneFolder.add(G.view, "node texture", {"glow":"glow","particle":"particle","dot":"dot"}).onChange(function(value){
			let mat=G.view.sceneObjects.nodes.material;
			if(mat){mat.uniforms.texture.value=G.view.textures[value];mat.needsUpdate=true;}
		});
		/*let starfieldFolder=sceneFolder.addFolder("Stars");
		starfieldFolder.add(G.view.sceneObjects.stars.object3d,"visible");*/
		
		sceneFolder.add(G, "colorScale",{"rainbow":"rainbow","cool":"cool","warm":"warm","plasma":"plasma","spring":"spring"}).onChange(function(value){
			G.view.sharedUniforms.layerColors.needsUpdate=true;
			G.view.refreshSceneObjectStyles(true);
		});
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
		G.showMetanodeSize=true;
		sceneFolder.add(G, "showMetanodeSize").onChange(function(value){
			//G.view.sharedUniforms.layerColors.needsUpdate=true;
			G.view.refreshSceneObjectStyles(true);
		});
		G.metanodeSizeFactor=1;
		sceneFolder.add(G, "metanodeSizeFactor",0,1).onChange(function(value){
			//G.view.sharedUniforms.layerColors.needsUpdate=true;
			G.view.refreshSceneObjectStyles(true);
		});
		G.linkWeightThicknessFactor=0.6;
		sceneFolder.add(G, "linkWeightThicknessFactor",0,1).onChange(function(value){
			//G.view.sharedUniforms.layerColors.needsUpdate=true;
			G.view.refreshSceneObjectStyles(true);
		});
		
		var layoutFolder=gui.addFolder('Layout');
		G.simulationRunning=true;
		layoutFolder.add(G, 'simulationRunning').listen();
		G.linkForceEnabled=true;
		layoutFolder.add(G, 'linkForceEnabled');
		G.radialLimitFactor=3;
		layoutFolder.add(G, 'radialLimitFactor',0.1,5);
		G.heightFactor=1;
		layoutFolder.add(G, 'heightFactor',0,5).listen();
		G.logLayerHeightRatio=1;
		layoutFolder.add(G, 'logLayerHeightRatio',0,1);
		G.logColorScale=false;
		layoutFolder.add(G, 'logColorScale').onChange(G.view.updateStyle);
		G.ccSizeThreshold=1;
		G.ccSizeThresholdLog2=0;
		layoutFolder.add(G, 'ccSizeThresholdLog2', 0, 10).onChange(()=>{
			G.view.modifiers.ccSizeThreshold.needsUpdate=true;
			G.ccSizeThreshold=Math.pow(2,G.ccSizeThresholdLog2);
			G.view.refreshSceneObjectStyles(true);
		});
		G.newXRayWaves=true;
		layoutFolder.add(G, 'newXRayWaves');
		G.showWavesMetagraphForLargeGraphs=true;
		layoutFolder.add(G, 'showWavesMetagraphForLargeGraphs');
		G.showWavesMetagraph=function(){G.load(G.analytics.getWavesMetagraph(G.dataset));};
		layoutFolder.add(G, 'showWavesMetagraph');
		
		var explorationFolder=gui.addFolder("Exploration");
		//explorationFolder.add(G,"expandSelection");
		G.zoomToExpand=false;
		explorationFolder.add(G, 'zoomToExpand').listen();
		G.exploringMetagraph=false;
		explorationFolder.add(G,"exploringMetagraph").onChange(()=>{G.stayedTime=0;/*G.zoomToExpand=true;*/}).listen();//it only looks good with zooming
		G.stayTimeFactor=0.7;
		explorationFolder.add(G,"stayTimeFactor",0.01,1);
		G.exploreLargeSubgraphsFirst=true;
		explorationFolder.add(G,"exploreLargeSubgraphsFirst");
		
		var analyticsFolder=gui.addFolder("Analytics");
		var snFolder=analyticsFolder.addFolder("Sparse Net");
		
		snFolder.add(G.analytics,"showSparseNet");
		snFolder.add(G.analytics,"hideSparseNet");
		G.sparseNetPinned=false;
		snFolder.add(G,"sparseNetPinned").onChange(()=>{G.view.modifiers.sparsenet.needsUpdate=true;G.view.sharedUniforms.nodePinData.needsUpdate=true;G.view.refreshSceneObjectStyles();});
		G.showSNColors=true;
		snFolder.add(G,"showSNColors");
		G.showSNRandomColors=false;
		snFolder.add(G,"showSNRandomColors");
		G.snPathSequenceRatio=1;
		snFolder.add(G,"snPathSequenceRatio",0,1);
		G.snPathThickness=0.5;
		snFolder.add(G,"snPathThickness",0,10).onChange(()=>{G.view.modifiers.sparsenet.needsUpdate=true;G.view.refreshSceneObjectStyles(true)});
		G.snPathBrightness=3;
		snFolder.add(G,"snPathBrightness",0,10).onChange(()=>{G.view.modifiers.sparsenet.needsUpdate=true;G.view.refreshSceneObjectStyles(true)});
		G.snStrengthFactor=4;
		snFolder.add(G,"snStrengthFactor",0,10);
		G.clusteringStrengthFactor=1;
		snFolder.add(G,"clusteringStrengthFactor",0,10);
		G.useSNIntersections=true;
		snFolder.add(G,"useSNIntersections");
		G.approximateSNThreshold=32;
		snFolder.add(G,"approximateSNThreshold",1,1024);
		
		//
		G.showInterlayersAsLines=true;
		G.showXRayConsumedPercentage=true;
		
		var nodeFolder = gui.addFolder('Nodes');
		
		G.nodeLayerColorRatio=0.5;
		nodeFolder.add(G, 'nodeLayerColorRatio', 0, 1).onChange(()=>G.view.refreshSceneObjectStyles(true));
		G.nodeSizeFactor=1;
		nodeFolder.add(G, 'nodeSizeFactor', 0.01, 10).onChange(()=>G.view.refreshSceneObjectStyles(true));
		G.multiLayerSizeBias=0;
		nodeFolder.add(G, 'multiLayerSizeBias', -1, 1).onChange(()=>G.view.refreshSceneObjectStyles(true));
		G.nodeDiversitySizeFactor=0.1;
		nodeFolder.add(G, 'nodeDiversitySizeFactor', -1, 1).onChange(()=>G.view.refreshSceneObjectStyles(true));
		G.nodeDegreeSizeFactor=0.1;
		nodeFolder.add(G, 'nodeDegreeSizeFactor', 0, 1).onChange(()=>G.view.refreshSceneObjectStyles(true));
		/*
		
		nodeFolder.add(G, 'selectionSizeFactor', 1, 5).onChange(G.view.updateStyle);
		nodeFolder.add(G, 'layerSelectionSizeFactor', 1, 3).onChange(G.view.updateStyle);*/
		
		
		var linkFolder = gui.addFolder('Links');
		//linkFolder.add(G.view.sceneObjects.links.object3d, 'visible');//must wait afetr view is initialized! however controls need to be  initialized first now
		G.linkDistanceFactor=1;
		linkFolder.add(G, 'linkDistanceFactor',0,10);
		G.linkStrengthFactor=1;
		linkFolder.add(G, 'linkStrengthFactor',0,10);
		G.linkBrightnessFactor=4;
		linkFolder.add(G, 'linkBrightnessFactor',0,5);//.onChange(()=>G.view.refreshSceneObjectStyles());
		G.linkThicknessFactor=1;
		linkFolder.add(G, 'linkThicknessFactor',0,10);//.onChange(()=>G.view.refreshSceneObjectStyles());
		G.linkLayerColorRatio=0.5;
		linkFolder.add(G, 'linkLayerColorRatio',0,1);//.onChange(()=>G.view.refreshSceneObjectStyles());
		
		var lineFolder = gui.addFolder('Alignment Lines');
		G.lineBrightnessFactor=0.3;
		lineFolder.add(G, 'lineBrightnessFactor',0,1);//.onChange(()=>G.view.refreshSceneObjectStyles());
		G.lineThicknessFactor=1;
		lineFolder.add(G, 'lineThicknessFactor',0,1);//.onChange(()=>G.view.refreshSceneObjectStyles());
		G.lineLayerColorRatio=0.4;
		lineFolder.add(G, 'lineLayerColorRatio',0,1);//.onChange(()=>G.view.refreshSceneObjectStyles());
		G.lineTintColor={r:100,g:100,b:255};
		lineFolder.addColor(G, "lineTintColor");//.onChange(()=>G.view.refreshSceneObjectStyles());
		
		/*
		var nodeFolder = gui.addFolder('Nodes');
		nodeFolder.add(G.view.nodes.object3d, 'visible');
		nodeFolder.add(G, 'nodeSizeFactor', 0.01, 10).onChange(G.view.updateStyle);
		G.layerColorRatio=0.5;
		nodeFolder.add(G, 'layerColorRatio', 0, 1).onChange(G.view.updateStyle);
		G.logColorScale=true;
		nodeFolder.add(G, 'logColorScale').onChange(G.view.updateStyle);
		nodeFolder.add(G, 'multiLayerSizeBias', -1, 1).onChange(G.view.updateStyle);
		G.nodeDiversitySizeFactor=0.1;
		nodeFolder.add(G, 'nodeDiversitySizeFactor', -1, 1).onChange(G.view.updateStyle);
		G.nodeDegreeSizeFactor=0.1;
		nodeFolder.add(G, 'nodeDegreeSizeFactor', 0, 1).onChange(G.view.updateStyle);
		nodeFolder.add(G, 'selectionSizeFactor', 1, 5).onChange(G.view.updateStyle);
		nodeFolder.add(G, 'layerSelectionSizeFactor', 1, 3).onChange(G.view.updateStyle);
		
		var lineFolder = gui.addFolder('Vertical Lines');
		lineFolder.add(G.view.lines.object3d, 'visible');
		G.lineBrightnessFactor=0.3;
		lineFolder.add(G, 'lineBrightnessFactor',0,7).onChange(G.view.updateStyle);
		G.lineThickness=3;
		lineFolder.add(G, 'lineThickness',0,20).onChange(G.view.updateStyle);
		G.lineLayerColorRatio=0.1;
		lineFolder.add(G, 'lineLayerColorRatio',0,1).onChange(G.view.updateStyle);
		G.lineTintColor={r:100,g:100,b:255};
		lineFolder.addColor(G, "lineTintColor").onChange(G.view.updateStyle);
		
		var linkFolder = gui.addFolder('Links');
		linkFolder.add(G.view.links.object3d, 'visible');
		G.linkBrightnessThreshold=0.01;
		linkFolder.add(G, 'linkBrightnessThreshold',0,0.05).onChange(G.view.updateStyle);
		G.linkBrightnessFactor=6;
		linkFolder.add(G, 'linkBrightnessFactor',0,15).onChange(G.view.updateStyle);
		G.linkThicknessFactor=1;
		linkFolder.add(G, 'linkThicknessFactor',0,20).onChange(G.view.updateStyle);
		G.linkLayerColorRatio=0.7;
		linkFolder.add(G, 'linkLayerColorRatio',0,1).onChange(G.view.updateStyle);
		*/
		/*
		
		
		var forceFolder = gui.addFolder('Layout');
		//G.d3ForceLayout.enabled=true;
		//forceFolder.add(G.d3ForceLayout, 'enabled');//allow freezig the layout for smoother navigation with better FPS
		//G.d3ForceLayout.keepRunning=false;
		//forceFolder.add(G.d3ForceLayout, 'keepRunning');//force alpha does not decay
		G.linkStrengthFactor = 0.1;
		forceFolder.add(G, 'linkStrengthFactor', 0.01, 0.2).onChange(G.forcesChanged);
		G.logLinkStrength=false;
		forceFolder.add(G, 'logLinkStrength').onChange(G.forcesChanged);
		G.linkStrengthExponent=1;
		forceFolder.add(G, 'linkStrengthExponent',-2,9).onChange(G.forcesChanged);
		
		
		G.animation={rotate:false,"rotate speed":0.1};
		sceneFolder.add(G.animation, 'rotate');
		sceneFolder.add(G.animation, 'rotate speed',-1,1);
		*/
		/*
		var forceFolder = gui.addFolder('Layout');
		G.d3ForceLayout.enabled=true;
		forceFolder.add(G.d3ForceLayout, 'enabled');//allow freezig the layout for smoother navigation with better FPS
		G.d3ForceLayout.keepRunning=false;
		forceFolder.add(G.d3ForceLayout, 'keepRunning');//force alpha does not decay
		forceFolder.add(G, 'linkStrengthFactor', 0.01, 0.2).onChange(G.forcesChanged);
		G.logLinkStrength=false;
		forceFolder.add(G, 'logLinkStrength').onChange(G.forcesChanged);
		G.linkStrengthExponent=1;
		forceFolder.add(G, 'linkStrengthExponent',-2,9).onChange(G.forcesChanged);
		G.selectionLinkStrengthFactor=15;
		//forceFolder.add(G, 'selectionLinkStrengthFactor', 1, 30).onChange(G.forcesChanged);
		forceFolder.add(G, 'linkDistanceFactor', 0.5, 3).onChange(G.forcesChanged);
		forceFolder.add(G, 'chargeStrengthFactor', 0, 5).onChange(G.forcesChanged);
		forceFolder.add(G, 'chargeStrength2DFactor', 0, 10).onChange(G.forcesChanged);
		//forceFolder.add(G, 'radialStrengthFactor', 0.1, 5).onChange(G.forcesChanged);
		forceFolder.add(G, 'zHeightFactor', 0.1, 20).onChange(G.forcesChanged);
		forceFolder.add(G, 'zLogarithmicHeightRatio', 0, 1).onChange(G.forcesChanged);
		forceFolder.add(G, 'zStrengthFactor', 0.1, 5).onChange(G.forcesChanged);
		G.radialLimitFactor=1;
		forceFolder.add(G, 'radialLimitFactor', 0.5, 5);
		G.alignmentFactor=1;
		forceFolder.add(G, 'alignmentFactor', 0.01, 1);
		G.alignGlobal=true;
		forceFolder.add(G, 'alignGlobal');
		G.layoutDiversity=true;
		forceFolder.add(G, 'layoutDiversity');
		G.experimentalLayoutFactor=35;G.experimentalLayout=false;G.experimentalLayerForceFactor=1;
		forceFolder.add(G, 'experimentalLayout').listen();
		forceFolder.add(G, 'experimentalLayoutFactor', 0, 100);
		forceFolder.add(G, 'experimentalLayerForceFactor', 0, 10);
		
		var layersFolder=gui.addFolder('Layers');
		G.ccSizeThreshold=1;
		G.ccSizeThresholdLog2=0;
		layersFolder.add(G, 'ccSizeThresholdLog2', 0, 10).onChange(()=>{G.ccSizeThreshold=Math.pow(2,G.ccSizeThresholdLog2);G.updateVisualStyle();});
		G.clusterDistance=40;
		layersFolder.add(G, 'clusterDistance', 1, 100);
		G.clusteringSpeed=20;
		layersFolder.add(G, 'clusteringSpeed', 0, 100);
		

		var nodeFolder = gui.addFolder('Nodes');
		nodeFolder.add(G.view.nodes.object3d, 'visible');
		nodeFolder.add(G, 'nodeSizeFactor', 0.01, 10).onChange(G.updateVisualStyle);
		G.layerColorRatio=0.5;
		nodeFolder.add(G, 'layerColorRatio', 0, 1).onChange(G.updateVisualStyle);
		G.logColorScale=true;
		nodeFolder.add(G, 'logColorScale').onChange(G.updateVisualStyle);
		nodeFolder.add(G, 'multiLayerSizeBias', -1, 1).onChange(G.updateVisualStyle);
		G.nodeDiversitySizeFactor=0.1;
		nodeFolder.add(G, 'nodeDiversitySizeFactor', -1, 1).onChange(G.updateVisualStyle);
		G.nodeDegreeSizeFactor=0.1;
		nodeFolder.add(G, 'nodeDegreeSizeFactor', 0, 1).onChange(G.updateVisualStyle);
		nodeFolder.add(G, 'selectionSizeFactor', 1, 5).onChange(G.updateVisualStyle);
		nodeFolder.add(G, 'layerSelectionSizeFactor', 1, 3).onChange(G.updateVisualStyle);
		
		var lineFolder = gui.addFolder('Vertical Lines');
		lineFolder.add(G.view.lines.object3d, 'visible');
		G.lineBrightnessFactor=0.3;
		lineFolder.add(G, 'lineBrightnessFactor',0,7).onChange(G.updateVisualStyle);
		G.lineThickness=3;
		lineFolder.add(G, 'lineThickness',0,20).onChange(G.updateVisualStyle);
		G.lineLayerColorRatio=0.1;
		lineFolder.add(G, 'lineLayerColorRatio',0,1).onChange(G.updateVisualStyle);
		G.lineTintColor={r:100,g:100,b:255};
		lineFolder.addColor(G, "lineTintColor").onChange(G.updateVisualStyle);
		
		var linkFolder = gui.addFolder('Links');
		linkFolder.add(G.view.links.object3d, 'visible');
		G.linkBrightnessThreshold=0.01;
		linkFolder.add(G, 'linkBrightnessThreshold',0,0.05).onChange(G.updateVisualStyle);
		G.linkBrightnessFactor=6;
		linkFolder.add(G, 'linkBrightnessFactor',0,15).onChange(G.updateVisualStyle);
		G.linkThicknessFactor=1;
		linkFolder.add(G, 'linkThicknessFactor',0,20).onChange(G.updateVisualStyle);
		G.linkLayerColorRatio=0.7;
		linkFolder.add(G, 'linkLayerColorRatio',0,1).onChange(G.updateVisualStyle);
		*/
		
	
	
	
	
	
	
	
	
	
	
	
	showSparseNet:function(){
		let vc=G.dataset.vertices.length;let options=null;if(vc>G.approximateSNThreshold){options={variant:"approximate"};G.addLog("using approximate sparse net");}
		if(!G.dataset.snPaths){G.messaging.requestCustomData("sparsenet",this.getGraphVerticesAndEdges(),options,(result)=>{if(result&&result.length>0)G.analytics.setSparseNet(result);else{G.addLog("invalid sparsenet result");}});}
		else{G.showingSparseNet=true;G.view.refreshSceneObject();}
	},
	hideSparseNet:function(){
		G.showingSparseNet=false;
		G.view.refreshSceneObject();
	},
	clearSparseNet:function(){
		delete G.dataset.sparsenetFirstVertex;
		delete G.dataset.snPaths;
		delete G.dataset.snPathMap;
		delete G.dataset.snPathEdgeMap;
		G.showingSparseNet=false;//if(G.showingClustering){G.showingClustering=false;}
	},
	addVertexToSparseNet:function(obj){
		if(obj.edges){
			if((!G.dataset.snPaths)||(G.dataset.snPaths.length==0)){
				if(G.dataset.sparsenetFirstVertex===undefined){
					G.dataset.sparsenetFirstVertex=Number(obj.original);//do't use normal selection for this!
					G.addLog("chosen starting vertex "+obj.original);
				}
				else{
					if(obj.original==G.dataset.sparsenetFirstVertex){G.addLog("already chosen" );return;}
					let path=this.shortestPath(Number(obj.original),G.dataset.sparsenetFirstVertex);
					if(path){
						console.log(path);
						this.setSparseNet([path]);
					}
					else{G.addLog("cannot find path to starting vertex");}
				}
			}
			else{
				let cache=G.dataset.snPaths;
				let set={};//G.snPathMap uses node ids!!
				for(let path of G.dataset.snPaths){
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
	setSparseNet:function(data){//always unmapped, references vertex indices, and the maps also references vertex indices
		//let data=dataset.snPaths;
		let dataset=G.dataset;
		if(G.snPathSequenceRatio!=1){
			let count=Math.ceil(data.length*G.snPathSequenceRatio)//hide those after this ratio
			data=data.slice(0,count);
		}
		let snPaths=data;
		let snPathMap={};//map from in-net vertices to their path IDs (one can belong to many paths) for clustering calculation
		let snPathEdgeMap={};//edge IDs to path ID map
		//let snMappedPaths=[];//references node index not vertex index
		
		for(let pathID=0;pathID<data.length;pathID++){
			let path=snPaths[pathID];
			for(let i=0;i<path.length;i++){
				let tempID=path[i];
				let vertex=dataset.vertices[tempID];
				if(tempID in snPathMap){snPathMap[tempID].push(pathID);}
				else{snPathMap[tempID]=[pathID];}
				if(i>0){
					snPathEdgeMap[vertex.edges[path[i-1]]]=pathID;
				}
			}
		}
		let snPathRandomNumbers=[];for(let i=0;i<snPaths.length;i++){snPathRandomNumbers[i]=Math.random();}
		dataset.snPaths=snPaths;
		dataset.snPathRandomNumbers=snPathRandomNumbers;
		dataset.snPathMap=snPathMap;
		dataset.snPathEdgeMap=snPathEdgeMap;
		//now also do clustering
		
		/*
		let clustering={},clusteringPath={};//map from node ID to the node it belongs to (can be nothing, in which case it's ignored or simply dimmed in the view). edge between it and teh center will darken when zoomed in. its other edges would be shown as truncated. Here it desn't matter which path the node belongs to. It concerns nodes not vertices because clustering is single layer 
		for(let vertex of dataset.vertices){
			if(vertex.index in snPathMap)continue;//index is something else set by d3?
			let pathCounters={};
			for(let other in vertex.edges){
				if(other in snPathMap){
					for(let pathID of snPathMap[other]){if(!pathCounters[pathID])pathCounters[pathID]=0;pathCounters[pathID]++;}
				}
			}
			let max=0,bestPathID=null;
			for(let pathID in pathCounters){if(pathCounters[pathID]>max){max=pathCounters[pathID];bestPathID=pathID;}}
			if(bestPathID!=null){
				let path=snPaths[bestPathID],candidates=[];//total=0,count=0;
				for(let i=0;i<path.length;i++){
					let target=path[i];
					if(target in vertex.edges){
						candidates.push(i);
					}
				}
				let avg=(candidates.length-1)/2,index;
				if(Math.random()>0.5){index=Math.floor(avg);}//get the midpoint of all connections on the path
				else{index=Math.ceil(avg);}
				clustering[vertex.index]=path[candidates[index]];//path[index]
				if(clustering[vertex.index]===undefined)throw Error();//funny bug: sometimes a node belongs to a path, but is connected to two centers on it with distance 2, and there's no edge to the center in the middle. If I assign the node to the mean of the connected centers on its path, it will look as if it's not clustered around anything because the middle edge doesn't exist. I need to cluster it around a center it does have an edge to.
				if((clustering[vertex.index] in vertex.edges)==false)throw Error();
				clusteringPath[vertex.index]=Number(bestPathID);
			}
			//else throw Error();
		}
		
		dataset.clustering=clustering;
		dataset.clusteringPath=clusteringPath;//save path ID too
		*/
		
		//new clustering around landmarks. get shortest path from one vertex to any landmark, choose the one it's closest to, and attract it t the landmark - even if there's no edge between them
		let clustering={};let landmarks={};
		for(let i=0;i<snPaths.length;i++){
			let path=snPaths[i];
			if((i==0)||(G.useSNIntersections))landmarks[path[0]]=true;
			landmarks[path[path.length-1]]=true;
		}
		console.log(landmarks);
		//now get teh shortest path network from the landamrks, do not recompute the shortest path from every vertex
		let pathFunc=this.shortestPath(landmarks).pathFunc;
		for(let vertex of dataset.vertices){
			if(vertex.index in snPathMap)continue;//don't cluster the SN
			//if(vertex.index in landmarks)continue;
			let path=pathFunc(vertex.index);
			if(path){
				let closestLandmark=path[0];//now last one is the target, first one is teh source
				if(closestLandmark!=vertex.index){clustering[vertex.index]=closestLandmark;}
			}
			
		}
		dataset.clustering=clustering;
		
		G.view.enableModifier("sparsenet");
	},
	shortestPathHelper(visited,prev,queue,t){
		let hasTarget=((t!==undefined)&&(t!=null));
		let multiTarget=(typeof t=="object");
		while(queue.length>0){
			let current=queue.shift();
			let currentVertex=G.dataset.vertices[current];
			for(let n in currentVertex.edges){
				
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

	
	shortestPath:function(s,t){//if there's no t, return the shortest path network from s
	
		let hasTarget=((t!==undefined)&&(t!=null));
		let multiTarget=(typeof t=="object");
		
		let visited=new Array(G.dataset.vertices.length);
		let prev=new Array(G.dataset.vertices.length);
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
		
		this.shortestPathHelper(visited,prev,queue,t);
		
		
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
		G.load(this.createGraph(Math.floor(this.dataset.vertexCount/2),this.dataset.edgeProbability));
	},
	doubleVertices:function() {
		if((!this.dataset)||(!("edgeProbability" in this.dataset))){console.log("cannot double");return;}
		G.load(this.createGraph(Math.floor(this.dataset.vertexCount*2),this.dataset.edgeProbability));
	},
	
		updateDescription:function(dataset){
		//update text descriptions
		let layersArray=[];	
		for(let l in dataset.layers){
			layersArray.push({layer:l,"|V|":dataset.layers[l].v,"|E|":dataset.layers[l].e});
		}
		layersArray.sort(compareBy((x)=>Number(x.layer)));
		console.log(layersArray);
		let columns=["layer","|V|","|E|"];
		var table=d3.select("#graph-layers");
		var thead = table.select('thead')
		
		var ttitle = thead.select('tr#title');
		var tcolumns = thead.select('tr#columns');
		tcolumns=tcolumns.selectAll('th')
			.data(columns);
		tcolumns.exit().remove();
		tcolumns.enter().append('th').text(function (column) { return column; });
		
		var	tbody = table.select('tbody');
		tbody.selectAll("tr").remove();//todo: fix the not-updating table
		tbody=tbody.selectAll("tr").data(layersArray);
		tbody.exit().remove();
		tbody=tbody.enter().append("tr").on("click",(d)=>G.toggleActiveLayer(d.layer));
		//on("click",(d)=>G.toggleSelectLayer(d.layer)).on("contextmenu",(d)=>{d3.event.stopPropagation();d3.event.preventDefault();G.alpha(1);G.showLayer(d.layer)});
		
		var grid=tbody.selectAll('td');
		grid=grid.data(function (row) {
				return columns.map(function (column) {
				  return {column: column, value: row[column]};
				});
			  });
		grid.exit().remove();
		grid.enter().append('td').text(function (d) { return d.value; });
		
		
		
	},
	
	
	
			//dataset.vertexCount=dataset.vertices.length;
			//dataset.edgeCount=dataset.edges.length;
			if(dataset.fixLayer&&("layer" in dataset)){
				setPropertyValue(dataset.vertices,"layer",dataset.layer);
				setPropertyValue(dataset.edges,"layer",dataset.layer);
				delete dataset.layers;
			}
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			

		//scene objects - should they be reused if existing?
		//(note: now scene objects are not filtered from layout vertices/edges, to avoid CPU/GPU transfers
		for(let name in this.sceneObjects){
			let obj=this.sceneObjects[name];let data=obj.dataCache,length=data.length;//should only be created once - todo: attach as a module to dataset objects?
			if(G.DEBUG)console.log("scene object "+name);
			//properties are computed before textures are created
			let geometry=obj.geometry;//new THREE.BufferGeometry();geometry.name=name;obj.geometry=geometry;obj.object3d.geometry=geometry;
			if(!geometry)continue;
			
			
			//uniforms
			let objUniforms={};
			//material
			for (let uniformName in obj.uniforms){
				obj.uniforms[uniformName].needsUpdate=true;
				this.updateUniform(obj.uniforms[uniformName],objUniforms,uniformName,dataset);
			}
			for (let uniformName in this.sharedUniforms){//they are defined for all objects now; needsUpdate already set for simulation
				this.updateUniform(this.sharedUniforms[uniformName],objUniforms,uniformName,dataset);
			}
			
			obj.material=new THREE.ShaderMaterial( {
				uniforms:objUniforms,
				vertexShader: this.getVertexShader(obj.shader),
				fragmentShader: this.getFragmentShader(obj.shader),
				transparent: true,depthTest:false,
				side: THREE.DoubleSide,blending:G["blending type"],
			} );
			obj.object3d.material=obj.material;
			
			let ppo=obj.pointsPerObject?obj.pointsPerObject:1;
			for(let attrName in obj.attr){
				let firstvalue=null;
				if(geometry.attributes[attrName])geometry.removeAttribute(attrName);
				let attr=obj.attr[attrName];let runLength=attr.runLength?attr.runLength:1;
				let bufferAttr=new THREE.BufferAttribute( new Float32Array( length*runLength*ppo), runLength);
				if(attr.dynamic)bufferAttr.setDynamic(true);
				
				let buffer=bufferAttr.array;
				if(attr.value){
					//if it's a function, the return value is for each data object, not for the whole buffer
					var warned=false;
					data.forEach((d,i,array)=>{
						let offset=i*runLength*ppo;
						let value=attr.value;
						if(typeof attr.value=="function"){value=value(d,i,array);}//same arguments as forEach; if ppo>1 return an array(or if it's not an array, we use the same value for all points in the object)
						for(let j=0;j<ppo;j++){
							//evaluating the init for each point inidividually may make per-object randomized values ugly to implement, so I can just return an array if ppo>1, and initialize all values for points in an object together
							if(firstvalue==null){firstvalue=value;}
							
							let pointValue=value;
							//distinguish between per-object and per-point initializations, and give a warning for unexpected values
							if(attr.perObject){//no point index
							}
							else{//probably per point?
								if(ppo!=1){//must use an array for points and objects for vectors??
									if (Array.isArray(pointValue)){pointValue=value[j];}
									else{if(!warned){console.log("Warning: per point attribute result is not an array: "+attrName);warned=true;}}
								}
							}
							setArrayDataItem(pointValue,buffer,offset,runLength);
							offset+=runLength;
						}
					});
				}
				if(G.DEBUG)console.log("    attr "+attrName+" first value: "+JSON.stringify(firstvalue));
				geometry.addAttribute(attrName,bufferAttr);
				geometry.getAttribute(attrName).needsUpdate=true;
			}
			
		}//uniforms and per-object attribute values are re-evaluated upon scene update. so they get the new simulation texture etc
		

		/*for(let name in this.globalData){
			let obj=this.globalData[name];let data=obj.value(dataset);obj.dataCache=data;dataset.view[name]=data;
			console.log("global "+name+": "+data);
		}*/
		
		
		//initialize some style uniforms for this dataset -  these are prioritized over the individual object's definition?
		for(let uniformName in this.sharedUniforms){
			let uniform=this.sharedUniforms[uniformName];
			if(uniform.dynamic)continue;//those are updated per-frame
			//uniform.needsUpdate=true;//already set for shader uniforms
			//this.initUniform(uniform,dataset);//make sure to init exactly once, even if it's unused
			//only init the non dynamic uniform values?
			for(let name in this.sceneObjects){
				if(!this.sceneObjects[name].object3d)continue;
				let us=this.sceneObjects[name].material.uniforms;
				this.updateUniform(uniform,us,uniformName,dataset);
			}
		}
		
		
		
		
		
		
		
		/*let r=G.multiLayerSizeBias;
						let max=G.dataset.maxLayersPerVertex;
						let original=G.dataset.vertices[node.original];
						let c=original.layerCount;
						let s=1;
						if(r>0){s=r*(c/max)*(c/max)+(1-r)*0.5;}
						else{s=-r*(1/c)*(1/c)+(1+r)*0.5;}
						let diversitySize=1,c2=original.diversity,r2=G.nodeDiversitySizeFactor,max2=G.dataset.maxVertexDiversity;
						if(max2==0){diversitySize=0.5;}
						else {if(r2>0){diversitySize=r2*(c2/max2)*(c2/max2)+(1-r2)*0.5;}
							else{diversitySize=-r2*(1/(c2+0.5))*(1/(c2+0.5))*0.25+(1+r2)*0.5;}}
						let degreeFactor=(node.degree?(Math.sqrt(Math.log2(node.degree))*G.nodeDegreeSizeFactor+1):1);
						*/
						/*let selection=(G.world.selectedVertexCount>0)?((G.world.selectedVertices[node.original])?G.selectionSizeFactor:(1/G.selectionSizeFactor)):1;
						let layerSelection=(Object.keys(G.world.selectedLayers).length>0)?((G.world.selectedLayers[node.layer])?G.layerSelectionSizeFactor:(1/G.layerSelectionSizeFactor)):1;
						let activeLayerFactor=1;if(G.activeLayer!==null){activeLayerFactor*=(node.layer==G.activeLayer)?1:0.02;}
						let activeSubgraphFactor=1;if(G.activeSubgraph){
							if(node.original in G.world.selectedVertices)activeSubgraphFactor=1;
							else{
								if(G.clustering&&(G.clustering[node.original] in G.world.selectedVertices))activeSubgraphFactor=0.5*G.selectionSizeFactor;//to undo its influence
								else activeSubgraphFactor=0.02;
								//if in clustering and target is in the subgraph: somewhat less bright
								//else: much less bright
							}
							//activeSubgraphFactor*=(node.original in G.world.selectedVertices)?1:0.02;
						}*/
						
						
						
	refreshData:function(objectNames){
		let graph=G.dataset;
		for(let name in this.templates){
			if(objectNames&&(objectNames.indexOf(name)==-1))continue;
			let obj=this.templates[name];let data=obj.data(graph),length=data.length;obj.dataCache=data;//for style updates
			if(G.DEBUG)console.log("scene object "+name+" count: "+length);
			//does not change properties here
			//refreshAttrs should detect if reallocating buffers is needed?
		}
	},
	refreshProperties:function(updateAll){
		let graph=G.dataset;
		for(let name in this.templates){
			let obj=this.templates[name];let data=obj.dataCache;//for style updates
			if(G.DEBUG)console.log("scene object "+name+" count: "+length);
			//initialize (scaled) properties of the objects - they are usually used in texture or attributes
			for(let name in obj.properties){//value should be a function, scaling should not be a function
				let property=obj.properties[name];
				if(property.dynamic){property.needsUpdate=true;}
				if(property.needsUpdate||updateAll){
					let value=property.value;if(typeof value!="function"){value=(()=>value);}
					let scaling=property.scaling;
					if(typeof scaling=="function"){
						scaling=scaling(graph);
						if(scaling===undefined){throw Error("scaling result is undefined");}
						if(Number.isNaN(scaling)){throw Error("scaling result is NaN");}
					}
					if(scaling)computeProperty(data,name,value,scaling);//only works for numeric values
					else setProperty(data,name,value);
					property.needsUpdate=false;
				}
			}
		}
		
		//modifiers
		for(let name in this.modifiers){
			let modifier=this.modifiers[name];
			if(modifier.dynamic){modifier.needsUpdate=true;}
			if(modifier.needsUpdate||updateAll){
				/*
				if(modifier.condition){
					if(typeof modifier.condition=="function"&&(!modifier.condition(graph)))continue;
				}
				*/
				if(graph.modifiers[name]){
					//even if it's not there, we may need to call onupdate
					let modData=graph.modifiers[name];//modifier.data(graph);
					//Object.assign(modData,graph.modifiers[name]);
					for(let dataName in modifier.data){
						modData[dataName]=modifier.data[dataName](graph,modData);
					}
					
					if(modifier.effects){
						for(objName in modifier.effects){
							let objectEffect=modifier.effects[objName];
							for(propName in objectEffect){
								let propertyEffect=objectEffect[propName];
								applyRulesOnProperty(this.templates[objName].dataCache,propName,propertyEffect,modData);
								//should mark the affected attributes as updated?
							}
						}
					}
				}
				
				if(modifier.onUpdate){
					modifier.onUpdate(graph,graph.modifiers[name]);
				}
				modifier.needsUpdate=false;
			}
		}
	},
	
	
	
	let layerDensityFactor=1/(G.dataset.layers[link.layer].e+10);
						//removed layer selection and active subgraph factors for now

						let activeLayerFactor=1;
						if((G.dataset.activeLayer!==undefined)&&(G.dataset.activeLayer!==null)){if(link.layer!=G.dataset.activeLayer){activeLayerFactor=0.01;layerDensityFactor=Math.min(layerDensityFactor,0.0002);selectionFactor=Math.min(selectionFactor,1);}}//this should supress the subgraph one
						
	let selectionFactor=1;
						if(G.dataset.selectedVertexCount){
							if(G.egonet){
								let s=((G.dataset.selectedVertices[link.source.original])||(G.dataset.selectedVertices[link.target.original]));
								let inEgonet=(G.egonet[link.source.original])&&(G.egonet[link.target.original]);
								selectionFactor=(s?10:(inEgonet?7.5:0.2));
							}
							else{
								let s=((G.dataset.selectedVertices[link.source.original])&&(G.dataset.selectedVertices[link.target.original]));
								selectionFactor=s?10:0.2;
							}
						}
/*if(dataset.showingInterlayers){
	for(let l in dataset.layers){
		//trying to differentiate waves:each wave starts out light but ends in a progreesivey darker color, and layer colors are at the end of each range, so if the wave only has one layer, the last layer gets the last color instead of teh first.
		let phase=dataset.phases[dataset.layers[l].phase];
		let phaseRatio=(dataset.maxPhase==0)?0:(dataset.layers[l].phase/dataset.maxPhase);
		let layerInPhaseRatio=(phase.maxLayer==phase.minLayer)?1:((l-phase.minLayer)/(phase.maxLayer-phase.minLayer));
		layerColors[l]=new THREE.Color();layerColors[l].setHSL(0.35+phaseRatio*0.50+(dataset.layers[l].isStartOfPhase?(-0.17):0)+(dataset.layers[l].isEndOfPhase?(0.10):0),1,(0.5-phaseRatio*0.4*(0.5+0.5*layerInPhaseRatio)+0.3*(1-layerInPhaseRatio)));
	}
}*/
//now: note that we have to build a node list that includes expanded subgraphs recursively! for convenience, all nodes are simulated. alignment is a problem because the layer sets of different subgraphs may not have anything in common , or may have original vertices in common and it's complicated to figure out when they should repel each other
//for now the whole graph hierarchy should be displayed with the same height property, and consider other options later. And now we can compute layer sets at the view node level, after we retrieve nodes from the data/analytics.







//get the nodes of this graph
		if(heightPropertyType=="edges"){
			let sources=graph.edges[heightPropertyName].edgeSources,targets=graph.edges[heightPropertyName].edgeTargets;
			let lines=[];
			let func=compareBy((x)=>x[heightPropertyName]);
			for(let cloneMap of graph.edges[heightProperty].cloneMaps){
				let lArray=Object.keys(cloneMap).sort(func);
				for(let i=0;i<lArray.length-1;i++)
				{
					lines.push({source:cloneMap[lArray[i]],target:cloneMap[lArray[i+1]]});
				}
			}
			return {nodes:graph.edges[heightProperty].clones,links:graph.edges,lines:lines,//todo: should line source/targets be an array or properties?
				source:(edge,eID)=>sources[eID],
				target:(edge,eID)=>targets[eID],
				original:(clone,cloneID)=>clone.original,
				height:(clone,cloneID)=>clone.value,
			};
		}
		else{
			let values;
			if(heightPropertyName)values=graph.vertices[heightPropertyName]?graph.vertices[heightPropertyName]:graph.vertices.map((v)=>Number([heightPropertyName]));
			return {nodes:graph.vertices,links:graph.edges,source:(edge,eID)=>edge.source,target:(edge,eID)=>edge.target,
				original:(v,vID)=>vID,
				height:(v,vID)=>{if(heightPropertyType){return values[vID];}},
			};
		}

	
	modifiers:{
		nodeFilter:{
			params:{
				property:{
					value:"ccSize",
					type:"select",
					options:["ccSize","layer"],//note these proeprties belong to nodes, not vertices
					func:()=>{
						G.addLog("value range updated");
						G.view.refreshModifierControls("nodeFilter");
					},
				},
				threshold:{
					value:0,
					type:"integer",
					min:(dataset,params)=>minPropertyValue(dataset.nodes,params.property),
					max:(dataset,params)=>maxPropertyValue(dataset.nodes,params.property),
				},
				reversed:{
					type:"boolean",
					value:false
				},
			},
			effects:{
				nodes:{
					size:[
						(data,oldValue,node,index,array)=>{
							if(data.reversed){if(getProperty(array,index,data.property)>data.threshold)return 0;}
							else{if(getProperty(array,index,data.property)<data.threshold)return 0;}
							
						},
					]
				},
				links:{
					brightness:[
						(data,oldValue,link,index,array)=>{
							if(data.reversed){if(link.source[data.property]>data.threshold)return 0;if(link.target[data.property]>data.threshold)return 0;}
							else{if(link.source[data.property]<data.threshold)return 0;if(link.target[data.property]<data.threshold)return 0;}
							
						}
					],
				},
				lines:{
					brightness:[
						(data,oldValue,line,index,array)=>{
							if(data.reversed){if(line.s[data.property]>data.threshold)return 0;if(line.t[data.property]>data.threshold)return 0;}
							else{if(line.s[data.property]<data.threshold)return 0;if(line.t[data.property]<data.threshold)return 0;}
							
						}
					],
				}
			}
		},
		ccSizeThreshold:{
			data:{
				threshold:(dataset,params)=>Math.pow(2,params.thresholdLog2),
			},
			params:{
				property:{
					value:"ccSize",
					type:"select",
					options:["ccSize",],
				},
				thresholdLog2:{
					value:0,
					type:"integer",
					min:0,
					max:(dataset,params)=>Math.ceil(Math.log(Math.max(G.dataset.vertices.length,1))),
				},
			},
			effects:{
				nodes:{
					size:[
						(data,oldValue,node,index,array)=>{if(node[data.property]<data.threshold)return 0;},
					]
				},
				links:{
					brightness:[
						(data,oldValue,link,index,array)=>{if(link.source[data.property]<data.threshold)return 0;if(link.target[data.property]<data.threshold)return 0;}
					],
				},
				lines:{
					brightness:[
						(data,oldValue,line,index,array)=>{if(line.s[data.property]<data.threshold)return 0;if(line.t[data.property]<data.threshold)return 0;}
					],
				}
			}
		},
		waveLayerFilter:{
			params:{
				maxLayer:{type:"integer",value:0,min:0,max:(dataset,params)=>maxPropertyValue(dataset.vertices,"waveLevel")},
				reversed:{type:"boolean",value:true,},
				showLastLayerEdges:{type:"boolean",value:false,},
				showLastLayerExtraEdges:{type:"boolean",value:false,},
				showNext:{type:"button",func:()=>{
					//todo
					},
				},
			},
			
			effects:{
				nodes:{
					size:[
						//(data,oldValue,node,index,array)=>{if(((!data.reversed)&&(node.layer>data.maxLayer))||(data.reversed&&node.layer<data.maxLayer))return 0;},
						(data,oldValue,node,index,array)=>{
							let l=G.dataset.vertices[node.original].waveLevel;
							if(((!data.reversed)&&(l>data.maxLayer))||(data.reversed&&l<data.maxLayer))return 0;},
					]
				},
				links:{
					brightness:[
						(data,oldValue,link,index,array)=>{
							//1) show out edges to any layer, or show out edges to the next layer?
							let sl=G.dataset.vertices[link.source.original].waveLevel,tl=G.dataset.vertices[link.target.original].waveLevel;
							if(data.reversed){
								if((sl<data.maxLayer)&&(tl<data.maxLayer))return 0;
								if((sl<data.maxLayer-1)||(tl<data.maxLayer-1))return 0;
								if((sl==data.maxLayer&&tl<=data.maxLayer)||(tl==data.maxLayer&&sl<=data.maxLayer)){
									if((sl==data.maxLayer)&&(tl==data.maxLayer)){
										if(!data.showLastLayerEdges)return 0;
									}
									else if(!data.showLastLayerExtraEdges)return 0;
								}
							}
							else{
								if((sl>data.maxLayer)&&(tl>data.maxLayer))return 0;
								if((sl>data.maxLayer+1)||(tl>data.maxLayer+1))return 0;
								if((sl==data.maxLayer&&tl>=data.maxLayer)||(tl==data.maxLayer&&sl>=data.maxLayer)){//only apply to edges going outside, not edges going down (which always get shown?)
									if((sl==data.maxLayer)&&(tl==data.maxLayer)){
										if(!data.showLastLayerEdges)return 0;
									}
									else if(!data.showLastLayerExtraEdges)return 0;
								}
							}
							
						}
					],
				},
				lines:{
					brightness:[
						(data,oldValue,line,index,array)=>{
							let sl=G.dataset.vertices[line.s.original].waveLevel,tl=G.dataset.vertices[line.t.original].waveLevel;
							if(data.reversed){
								if(sl<data.maxLayer)return 0;if(tl<data.maxLayer)return 0;
							}
							else{
								if(sl>data.maxLayer)return 0;if(tl>data.maxLayer)return 0;
							}
							
						}
					],
				}
			}
		},
		
		sparsenet:{
			//condition:()=>(G.showingSparseNet&&G.dataset.snPaths),//G.dataset.snPaths
			onEnable:(dataset,params)=>{
				if(!G.dataset.snPaths){G.analytics.showSparseNet();}
			},
			onUpdate:(dataset,params)=>{
				G.view.sharedUniforms.edgeList.needsUpdate=true;
				G.view.sharedUniforms.nodePinData.needsUpdate=true;
			},
			params:{
				pinned:{type:"boolean",value:false,},
				enableForce:{type:"boolean",value:false,},
				clear:{type:"button",func:()=>{
					G.analytics.clearSparseNet();
				},},
			},
			data:{
				vertexPaths:(d)=>d.snPathMap,
				edgePaths:(d)=>d.snPathEdgeMap,
				paths:(d)=>d.snPaths,
				randomNumbers:(d)=>d.snPathRandomNumbers,
			},
			deps:"snPathThickness",//??
			effects:{
				nodes:{
					pinned:[
						(data,oldValue,node,index,array)=>{
							if(!data.vertexPaths)return;
							if(data.pinned&&(node.original in data.vertexPaths)){return true;}
						}
					],
				},
				
				links:{
					color:[
						(data,oldValue,link,index,array)=>{
							if(!data.edgePaths)return;
							if(link.index in data.edgePaths)
							{
								if(G.showSNColors){
									let c=new THREE.Color();
									if(data.edgePaths[link.index]==0){return redColor;}//first path always red
									if(G.snRandomPathColors){c.setHSL(data.randomNumbers[data.edgePaths[link.index]]*0.7+0.15,1,0.5);}
									else{c.setHSL(((data.edgePaths[link.index]/(data.paths.length))*0.7+0.1),1,0.5);}//avoid red
									return c;
								}
								return redColor;
							}
						},
					],
					thickness:[
						(data,oldValue,link,index,array)=>{
							if(!data.edgePaths)return;
							if(link.index in data.edgePaths)return oldValue+G.snPathThickness;
						},
					],
					brightness:[
						(data,oldValue,link,index,array)=>{
							if(!data.edgePaths)return;
							if(link.index in data.edgePaths)return oldValue+G.snPathBrightness;
						},
					],
					strength:[
						(data,oldValue,link,index,array)=>{
							if(!data.enableForce)return;
							if(!data.edgePaths)return;
							if(link.index in data.edgePaths)return oldValue*G.snStrengthFactor;
							else return oldValue/Math.max(G.snStrengthFactor,1);
						},
					]
				}
			}
		},
		
		clustering:{
			condition:()=>(G.dataset.clustering),
			data:{
				clustering:(d)=>d.clustering,
			},
			onUpdate:()=>{
				G.view.sharedUniforms.clusteringData.needsUpdate=true;
			},
			//this kind of clustering is not edge-based, but vertex-based, and pushes every node towards the cluster center
			effects:{
				nodes:{
					clusterCenter:[
						(data,oldValue,node,index,array)=>{
							if(node.original in data.clustering){
								let otherVertex=G.dataset.vertices[data.clustering[node.original]];
								return otherVertex.clones[Object.keys(otherVertex.clones)[0]].id;
							}
						}
					],
				},
			}
		},
		
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
				layerObj:(dataset)=>{
					let layer=G.activeLayer,g=G.dataset,ls=g.layers;
					if(Object.keys(G.dataset.layers).length==1){layer=Object.keys(G.dataset.layers)[0];}
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
									let layerObj=data.layerObj;//G.dataset.layers[link.layer];
									let leafRatio=(layerObj.leaves[link.leafID].waveIndex/layerObj.leafWaveCount);
									result.setHSL(leafRatio,1,0.5);
								}
								else{
									if(G.leafRandomColors){result.setHSL(G.dataset.layers[link.layer].leafRandomNumbers[link.leafID],1,0.5);}
									else{result.setHSL(link.leafID*0.85/(G.dataset.layers[link.layer].leafCount+1),1,0.5);}
								}
								return result;
							}
							
						},
					],
					/*
					thickness:[
						(data,oldValue,link,index,array)=>{if(link.index in data.edgePaths)return oldValue+G.snPathThickness;},
					],
					brightness:[
						(data,oldValue,link,index,array)=>{if(link.index in data.edgePaths)return oldValue+G.snPathBrightness;},
					]
					*/
				}
			}
		},
		highlightWaveLayer:{
			condition:()=>{
				if(G.dataset.highlightedWaveLayer!==undefined)return true;
			},
			data:(dataset)=>{
				return G.dataset.highlightedWaveLayer;
			},
			effects:{
				nodes:{
					size:[
						(data,oldValue,node,index,array)=>{if(node.waveLayer==data)return oldValue*2;;},
					],
					color:[
						
						(data,oldValue,node,index,array)=>{
							//let result=new THREE.Color();
							if(node.waveLayer==data){return redColor;}
							else return null;
						},
					
					],
				},
				
				links:{
					color:[
						(data,oldValue,link,index,array)=>{
							//let result=new THREE.Color();
							if(link.source.waveLayer==data&&link.target.waveLayer==data){return redColor;}
							
						},
					],
					brightness:[
						(data,oldValue,link,index,array)=>{
							if(link.source.waveLayer==data&&link.target.waveLayer==data){return oldValue*1.5+0.1;}
							
						},
					],
					thickness:[
						(data,oldValue,link,index,array)=>{
							if(link.source.waveLayer==data&&link.target.waveLayer==data){return oldValue*1.5+0.1;}
							
						},
					],
				}
			}
		},
		waveColors:{
			params:{
				threshold:{type:"integer",value:0,min:0,max:(d)=>d.waves.length},
				reverse:{type:"boolean",value:true},
				rotateColors:{type:"boolean",value:true},
			},
			data:{
				waveCount:(d)=>d.waves.length,
				colorCycles:(d,params)=>((params.rotateColors)?Math.sqrt(params.waveCount):1),
			},
			effects:{
				nodes:{
					size:[
						(data,oldValue,node,index,array)=>{
							let w=G.dataset.vertices[node.original].wave;
							if(data.reverse&&(w<data.threshold))return 0;
							if((!(data.reverse))&&(w>data.threshold))return 0;
							else return oldValue*1.5;
						},
					],
					color:[
						(data,oldValue,node,index,array)=>{
							let w=G.dataset.vertices[node.original].wave;
							if(data.reverse){
								if(w<data.threshold)return;
								let c=new THREE.Color();
								let n=w/data.waveCount;
								if(data.rotateColors){
									n*=data.colorCycles;
									n=(n-Math.floor(n));
								}
								c.setStyle(colorScale(n));
								return c;
							}
							else{
								if(w>data.threshold)return;
								let c=new THREE.Color();
								let n=w/data.waveCount;
								if(data.rotateColors){
									n*=data.colorCycles;
									n=(n-Math.floor(n));
								}
								c.setStyle(colorScale(n));
								return c;
							}
						},
					
					],
				},
				links:{
					color:[
						(data,oldValue,link,index,array)=>{
							//let result=new THREE.Color();
							let sw=G.dataset.vertices[link.source.original].wave;
							let tw=G.dataset.vertices[link.target.original].wave;
							if(data.reverse){
								if(sw<data.threshold&&tw<data.threshold)return;
								let c=new THREE.Color();
								let n=Math.min(sw,tw)/data.waveCount;
								if(data.rotateColors){
									n*=data.colorCycles;
									n=(n-Math.floor(n));
								}
								c.setStyle(colorScale(n));
								return c;
							}
							else{
								if(sw>data.threshold&&tw>data.threshold)return;
								let c=new THREE.Color();
								let n=Math.min(sw,tw)/data.waveCount;
								if(data.rotateColors){
									n*=data.colorCycles;
									n=(n-Math.floor(n));
								}
								c.setStyle(colorScale(n));
								return c;
							}
						},
					],
					brightness:[
						(data,oldValue,link,index,array)=>{
							let sw=G.dataset.vertices[link.source.original].wave;
							let tw=G.dataset.vertices[link.target.original].wave;
							/*if(sw>=data.min&&sw<=data.max&&tw>=data.min&&tw<=data.max){
								return;
							}
							else return 0;*/
							if(data.reverse){
								if(sw<data.threshold&&tw<data.threshold)return 0;
							}
							else{
								if(sw>data.threshold&&tw>data.threshold)return 0;
							}
						},
					],
				}
			}
		},
		iterativeWaveColors:{
			condition:()=>{
				if(G.showIterativeWaveColors)return true;
			},
			data:(dataset)=>{
				return {min:G.showIterativeWaveColorsMinWave,max:G.showIterativeWaveColorsMaxWave};
			},
			effects:{
				nodes:{
					size:[
						(data,oldValue,node,index,array)=>{
							//the clone(node) may not correspond to teh iterative waves at all, so only show it if any of its edges are shown?
							for(let neighbor in node.edges){
								let eID=node.edges[neighbor];
								let e=G.dataset.edges[eID];
								let w=e.iterativeWave;
								if(w>=data.min&&w<=data.max)return oldValue*1.5;
							}
							return 0;
						},
					],
					color:[
						(data,oldValue,node,index,array)=>{
							//let result=new THREE.Color();
							//if(node.waveLayer==data){return redColor;}
							let topW=-1;
							for(let neighbor in node.edges){
								let eID=node.edges[neighbor];
								let e=G.dataset.edges[eID];
								let w=e.iterativeWave;
								if(w>=data.min&&w<=data.max){if(topW<w)topW=w;};
							}
							if(topW!=null){
								let c=new THREE.Color();
								c.setHSL((topW)*0.85/(11),0.5,0.5);
								return c;
							}
							else return null;
						},
					],
				},
				links:{
					color:[
						(data,oldValue,link,index,array)=>{
							//let result=new THREE.Color();
							let w=link.iterativeWave;
							if(w>=data.min&&w<=data.max){
								let c=new THREE.Color();
								c.setHSL(w*0.85/(11),0.5,0.5);
								return c;
							}
						},
					],
					brightness:[
						(data,oldValue,link,index,array)=>{
							let w=link.iterativeWave;
							if(w>=data.min&&w<=data.max){
								return;
							}
							else return 0;
							
						},
					],
				}
			}
		},
	},
	
/*
todos:
allow specifying property basis graphs - a graph can have multiple property arrays of the same type based on different basis graphs (but how to reference them with a nice syntax? also not all graphs make sense as a basis for all properties - the main graph has all properties, and any subgraph alos can share these properties, but a derived metagraph's metavertices may only ave one well-behaved kind of original property  that's what the metavertices are based on, because for other properties, a metavertex may contain vertices with multiple values, and creating clones for each value leads to weird behavior (edges may not be limited to one pair of clones so we may have to draw edges as a wide ribbon spanning many height levels?) 
I think the complexities in property basis is not necessary because the root problem is lack of a good metagraph implementation - not just as its own graph with a expanding routine, but actually representing which vertices/edges of the original graph (not always induced subgraphs, think edge partitions) a metavertex represents. If we can easily get the sub vertices/edges of each meta vertex/edge, without actually loading all subgraphs, then we can easily get the properties of original vertices in each metagraph. If we can enumerate sub objects cheaply, we might not need any extra storage or manaement of properties based on other graphs (which is a syntactical pain) but can just get those objects and their properties on the original graph. In the sense that each oject/edge has an intrinsic graph in whic it belongs ( for subgraphs that;s the original, for metagraphs it's usually the metagraph itself) and subgraphs/metagraph sub objects are only references to these same properties - this would presumably save memory in loading a hierarchy, but if the main graph is externa or at least only exists on the server, then the server has to support this method of getting sub objects of metaobjects, and gettng the properties of a set of objects together. This might be best done with a database? Or at least only for graphs that the server can keep in memory?
 
for now a workaround is to just create array properties for normal object-based graphs on the client and write all client side code to use the array properties. 
We can even maybe create vanilla graphs (object-based, like the one used on the server) and attach array properties to it.

*/




levelDisks:{
			value:(graph)=>{//layers in expanded wave metanodes
				let result=[];
				if(!graph.showingInterlayers)return result;
				for(let l in graph.layers){
					let layerObj=graph.layers[l];
					layerObj.layer=l;
					result.push(layerObj);
				}
				return result;
			},
			properties:{
				shape:{
					value:(d)=>{
						let points=[],buffer=G.view.getPositions();//todo
						if(!buffer)return null;
						for(let node of G.graph.clonedVertices){
							if(node.layer==d.layer){
								let i=node.id,i4=i*4,vec=new THREE.Vector2(buffer[i4],buffer[i4+1]);
								points.push(vec);
							}
						}
						let origin=new THREE.Vector2();
						let temp=new THREE.Vector2(),temp2=new THREE.Vector2();
						let center=new THREE.Vector2(),size=new THREE.Vector2(1,1),major=new THREE.Vector2(1,0);
						let f1=new THREE.Vector2(),f2=new THREE.Vector2(),s=0;
						let oldCenter=new THREE.Vector2(),oldSize=new THREE.Vector2(),oldMajor=new THREE.Vector2();
						let delta=100,minDelta=0.01,maxIterations=1,iterations=0,changeRate=0.05,decay=0.9;
						let desiredMargin=30;
						let sin45=Math.sqrt(2)/2;
						function getMargin(p){
							let fd=Math.sqrt(size.x*size.x-size.y*size.y);
							s=size.x*2;
							f1.copy(center).addScaledVector(major,fd);
							f2.copy(center).addScaledVector(major,-fd);
							let result=size.x*2-(f1.distanceTo(p)+f2.distanceTo(p));
							if(isNaN(result))throw Error();
							return result;
						}
						if(G.useAABBForEllipses){
							let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
							for(let p of points){
								if(p.x<minX)minX=p.x;
								if(p.y<minY)minY=p.y;
								if(p.x>maxX)maxX=p.x;
								if(p.y>maxY)maxY=p.y;
							}
							minX-=desiredMargin;
							minY-=desiredMargin;
							maxX+=desiredMargin;
							maxY+=desiredMargin;
							center.x=(minX+maxX)/2;
							center.y=(minY+maxY)/2;
							size.x=(maxX-minX)/2;
							size.y=(maxY-minY)/2;
							//check sanity
							if(size.x<size.y){
								let tempSize=size.y;size.y=size.x;size.x=tempSize;major.rotateAround(origin,Math.PI/2);
							}
							getMargin(oldCenter);
						}
						else{
							if(d.shape){
								f1.copy(d.shape.f1);f2.copy(d.shape.f2);s=d.shape.s;
								center.copy(f1).add(f2).multiplyScalar(0.5);
								major.copy(f2).addScaledVector(f1,-1).normalize();
								let fdBy2=f1.distanceTo(f2)/2;
								size.x=s/2;
								size.y=Math.sqrt(size.x*size.x-fdBy2*fdBy2);
								if(isNaN(center.x+center.y))throw Error();
								if(isNaN(size.x+size.y))throw Error();
								if(isNaN(major.x+major.y))throw Error();
							}
							while((delta>minDelta)&&(iterations<maxIterations)){
								oldCenter.copy(center);oldSize.copy(size);oldMajor=major;
								let contained=true,minMargin=Infinity;
								
								for(let p of points){
									let currentMargin=getMargin(p);
									if(minMargin>currentMargin)minMargin=currentMargin;
									if(currentMargin<desiredMargin)contained=false;
									let d1=f1.distanceTo(p),d2=f2.distanceTo(p);
									let diff=Math.abs(d1-d2)/(d1+d2);//if the difference is small, mainly increase s; otherwise move the focus
									let frac=d1/(d1+d2);
									temp.copy(p).addScaledVector(center,-1);
									let cos=temp.dot(major)/temp.length(),absCos=Math.abs(cos),sin=Math.sqrt(1-cos*cos);
									//stretch axes by cos and sin respectively, and rotate too
									if(currentMargin<desiredMargin){
										let dist=desiredMargin-currentMargin;
										temp2.copy(p).addScaledVector(center,-1).normalize();
										center.addScaledVector(temp2,dist*changeRate);
										size.x+=changeRate*dist*absCos;
										size.y+=changeRate*dist*sin;
										temp2.copy(major).rotateAround(origin,Math.PI/2);
										let cos2=temp.dot(temp2);
										
										if(cos2>0){major.rotateAround(origin,changeRate*Math.abs(sin-sin45));}//rotate more if it's close to diagonal, but don't rotate if it's close to teh short axis.
										else{major.rotateAround(origin,-changeRate*Math.abs(sin-sin45));}
										if(isNaN(major.x+major.y))throw Error();
									}
									
									//check sanity
									if(size.x<size.y){let tempSize=size.y;size.y=size.x;size.x=tempSize;major.rotateAround(origin,Math.PI/2);}
									if(isNaN(major.x+major.y))throw Error();
								}
								//
								if(contained){
									//shrink
									let dist=minMargin-desiredMargin;
									size.x-=changeRate*dist;
									size.y-=changeRate*dist;
								}
								delta=Math.max(size.distanceTo(oldSize),center.distanceTo(oldCenter),major.distanceTo(oldMajor));
								iterations++;
								changeRate*=decay;
							}
							if(iterations>100){console.log(""+iterations+" iterations for layer "+d.layer+" with "+points.length+" nodes");}
						}
						
						getMargin(oldCenter);
						return {f1:f1,f2:f2,s:s};
								

					}
				},
				position:{dimensions:3,value:(()=>{
					var v=new THREE.Vector3();
						return (d,i)=>{
							v.x=Number(d.layer);
							v.y=Math.sqrt(d.v)*300;//d.v;
							v.z=Math.max(0.01,(2*d.e/(d.v*d.v)))*v.y;
							//console.log(v.y,v.z);
							//y is the longer axis length, z is the shorter
							return v;
						}
					})(),
					perObject:true,
				},
				extraData:{
					dimensions:3,value:(()=>{
					var v=new THREE.Vector3();
						return (d,i)=>{
							v.x=d.isStartOfPhase?1:0;
							v.y=d.isEndOfPhase?1:0;
							v.z=d.shape?d.shape.s:0;
							return v;
						}
					})(),
					perObject:true,
					
				},
				foci:{
					dimensions:4,value:(()=>{
						var v=new THREE.Vector4();
						return (d,i)=>{
							if(!d.shape)return v;
							v.x=d.shape.f1.x;
							v.y=d.shape.f1.y;
							v.z=d.shape.f2.x;
							v.w=d.shape.f2.y;
							//y is the longer axis length, z is the shorter
							return v;
						}
					})(),
					perObject:true,
				},
				coord:{dimensions:3,value:quadCoordFunc,perPoint:true,
				},
			},
		},
		
		
		
		
		
		
		levelDisks:{
			priority:-1,
			object3dType:THREE.Mesh,
			properties:{
				position:{dimensions:3,value:(d,i)=>{
						var v=new THREE.Vector3();v.x=Number(d.layer);v.y=Math.sqrt(d.v)*300;v.z=Math.max(0.01,(2*d.e/(d.v*d.v)))*v.y;
						return v;//y is the longer axis length, z is the shorter
					},
				},
				coord:{dimensions:3,value:quadCoordFunc,
				},
			},
			pointsPerObject:6,
			uniforms: {
			},
			shader:"levelDisks",
		},
