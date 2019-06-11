let datasetMenu,layerMenu;


G.addModule("loading",{
	init:function(){
		datasetMenu=d3.select("#dataset-menu");
		layerMenu=d3.select("#layer-menu");
		let titleElement=getE("top-level-summary-area");//document.getElementById("top-middle-area");//the bar does something else
		titleElement.onclick=()=>d3.json("datasets").then((d)=>this.showDatasetList(d));;
		titleElement.ontouchend=()=>d3.json("datasets").then((d)=>this.showDatasetList(d));;
		
		G.showMetagraph=this.showMetagraph.bind(this);
		G.showNextSiblingGraph=this.showNextSiblingGraph.bind(this);
		G.showPreviousSiblingGraph=this.showPreviousSiblingGraph.bind(this);
		G.load=this.load.bind(this);
		G.display=this.display.bind(this);
		G.getGraph=this.getGraph.bind(this);
		let dataPath=getQueryVariable("dataPath");
		let heightProperty=getQueryVariable("heightProperty");
		let algorithm=getQueryVariable("algorithm");
		let representation=getQueryVariable("representation");
		let colorScaleBegin=getQueryVariable("colorScale[begin]");
		let colorScaleEnd=getQueryVariable("colorScale[end]");
		if(dataPath){
			dataPath=unescape(dataPath).trim();
			//window.history.pushState("", "", "/");//remove the datapath from the URL for debugging
			let options={};
			
			if(heightProperty)options.heightProperty=unescape(heightProperty).trim();
			if(algorithm){options.algorithm=unescape(algorithm).trim();representation="null";}
			if(representation)options.representation=unescape(representation).trim();if(options.representation=="null")options.representation=null;
			if(colorScaleBegin){
				options.colorScale={begin:unescape(colorScaleBegin).trim(),end:unescape(colorScaleEnd).trim()};
			}
			if(options.representation=="null")options.representation=null;
			this.display(dataPath,options).catch(()=>d3.json("datasets").then((d)=>this.showDatasetList(d)));
		}
		else{
			d3.json("datasets").then((d)=>this.showDatasetList(d));
		}
		
		
	},
	
	graphsCache:{},
	getGraph:function(path){
		if(this.graphsCache[path])return this.graphsCache[path];
		throw Error("missing "+path);
	},
	loadSummary:async function(g){///takes a path or a summary object. for UI purposes, also load all summaries of levels above this graph
		if(typeof g=="string"){
			if(this.graphsCache[g])return this.graphsCache[g];
			let path=g;g=new Graph();let loadedSummary=false;
			await d3.json("datasets/"+path+"/summary.json.gz").then((summary)=>{if(summary){g.loadSummary(summary);loadedSummary=true;}}).catch((error)=>{console.log("cannot load summary "+path);return;});;
			if(loadedSummary==false)return;
			this.graphsCache[path]=g;
			if(!g.name)g.name=pathToText(g.dataPath);//??
			//also load summary of the original (for metagraphs) or metagraph (for subgraphs)
			let parentPath=this.getParentPath(g,false);//false: does not consider skipped metagraphs and history
			if(parentPath)await this.loadSummary(parentPath);
			
		}
		if((g instanceof Graph)==false){throw Error();}//let summary=g;g=new Graph();g.loadSummary(summary);
		return g;
	},
	loadWhole:async function(g){//takes a path or a summary object, or a Graph with summary loaded
		g=await this.loadSummary(g);
		if(!g){return;}
		//first load the topology(ids, sources, targets)
		let ids,sources,targets;
		if(g.isAbstract()){
			await d3.json("datasets/"+g.dataPath+"/vertices.id.json.gz").then((data)=>ids=data.value);
			await d3.json("datasets/"+g.dataPath+"/edges.source.json.gz").then((data)=>sources=data.value);
			await d3.json("datasets/"+g.dataPath+"/edges.target.json.gz").then((data)=>targets=data.value);
			g.loadVerticesAndEdges(ids,sources,targets);
		}
			
		for(let objName in g.objects){
			let obj=g.objects[objName];
			for(let propName in obj.properties){
				if(!obj.properties[propName].isAbstract)continue;
				//if((objName=="vertices"&&propName=="id")||(objName=="edges"&&propName=="source")||(objName=="edges"&&propName=="target"))continue;
				await d3.json("datasets/"+g.dataPath+"/"+objName+"."+propName+".json.gz").then((data)=>{
					obj.setProperty(propName,data.value);
				});
			}
		}
		//hack: load the waveCC metagraph edges if this graph is a waveMap; 
		
		if(g.metagraphType=="waveMap"){
			g.waveCCMetagraph=await this.loadWhole(g.originalGraph+"/metagraphs/waveCC2");
			//hack: preprocess wave arcs
			let waveMap=g.waveMap;
			let maxWave=Math.max(...Object.keys(waveMap).map((x)=>Number(x)));
			let arcsByCCID=[];let arcs=[];
			//for all wave CCs, count how many levels it spans
			//currently size is e+ef (edge+forward edge)
			for(let waveID in waveMap){
				let waveObj=waveMap[waveID];
				let waveSize=0;
				let waveCCCount=0;
				for(let waveCCid in waveObj){
					waveCCCount++;
					for(let waveLevel in waveObj[waveCCid]){waveSize+=waveObj[waveCCid][waveLevel].e+waveObj[waveCCid][waveLevel].ef;}
				}
				for(let waveCCid in waveObj){
					let CCSize=0;let levelCount=Object.keys(waveObj[waveCCid]).length;
					for(let waveLevel in waveObj[waveCCid]){CCSize+=waveObj[waveCCid][waveLevel].e+waveObj[waveCCid][waveLevel].ef;}
					let arc={wave:Number(waveID),reverseWave:maxWave-Number(waveID),ccid:Number(waveCCid),ratio:CCSize/waveSize,CCSize:CCSize,waveSize:waveSize,waveCCCount:waveCCCount,levelCount:levelCount,levelMap:waveObj[waveCCid]};
					arcs.push(arc);
					arcsByCCID[Number(waveCCid)]=arc;
				}
			}
			let maxLevelCount=Math.max(...arcs.map((x)=>x.levelCount));
			let maxWaveSize=Math.max(...arcs.map((x)=>x.waveSize));
			for(let arc of arcs){arc.maxLevelCount=maxLevelCount;arc.maxWaveSize=maxWaveSize;}
			//get radius, thickness, centerAngle, angleWidth
			let waveCount=arcs[0].reverseWave+1;
			let maxRadius=150,centerRadius=20;
			let radiusDelta=Math.min(20,(maxRadius-centerRadius)/(arcs[0].reverseWave+1));
			let startDegree=-Math.PI/2;
			let currentWave=-1,degree=startDegree;
			//log scale of wave size (currently the size is the vertex count)
			
			//log scale of wave thickness
			
			for(let arc of arcs){
				if(arc.wave>currentWave){currentWave=arc.wave;degree=startDegree;}
				let logRadius=(Math.log(arc.waveSize+1)/Math.log(maxWaveSize+1))*maxRadius;
				let linearRadius=(arc.waveSize/maxWaveSize)*(maxRadius-centerRadius)+centerRadius; //linear scale
				//arc.reverseWave*radiusDelta+centerRadius; // evenly distributed
				let totalDegree=Math.PI*2,gapDegree=0;
				if(arc.reverseWave!=0||arc.ratio!=1){gapDegree=Math.min(3*arc.waveCCCount/logRadius,Math.PI/2);totalDegree-=gapDegree;}//using log radius to determine the gap??
				else{
					degree=0;//seems this is needed to make it draw a full circle
				}
				let degreeDelta=totalDegree*arc.ratio;
				let endDegree=degree+degreeDelta;
				if(degreeDelta==Math.PI*2){degreeDelta*=0.99;}//seems this is needed to make it draw a full circle
				//let x1=realRadius*Math.cos(degree),y1=realRadius*Math.sin(degree),x2=realRadius*Math.cos(endDegree),y2=realRadius*Math.sin(endDegree);
				arc.waveCount=waveCount;//need this to scale the height
				arc.height=arc.wave;//(arc.wave/maxWave-0.5)*500.0*Math.sqrt(Math.log(waveCount));//was arc.wave but need to have the same height of nodes
				arc.logRadius=logRadius;
				arc.linearRadius=linearRadius;
				arc.oldRadius=arc.reverseWave*radiusDelta+centerRadius;
				arc.startDegree=degree;arc.endDegree=endDegree;arc.degreeDelta=degreeDelta;
				arc.angleWidth=degreeDelta/2;
				arc.centerAngle=(degree+endDegree)/2;
				arc.colorValue=arc.wave/waveCount;//new THREE.Color();arc.color.setStyle(G.colorScales.blackRed(arc.wave/waveCount));
				arc.linearThickness=Math.max(1.5,Math.min(1+(arc.levelCount-1)*2,(arc.levelCount/arc.maxLevelCount)*radiusDelta*0.9));
				arc.logThickness=Math.max(1.5,Math.min(Math.log(arc.levelCount+1)*2,(Math.log(arc.levelCount+1)/Math.log(arc.maxLevelCount+1))*radiusDelta*0.9));
				degree+=degreeDelta+gapDegree/arc.waveCCCount;
			}
			g.arcs=arcsByCCID;
				
			//let original=await this.loadSummary(g.originalGraph);//need to check if we can display the original graph (all vertices) embedded into the circles
			//if(original.vertices.length<10000){
			//	g.embeddedOriginalGraph=await this.loadWhole(g.originalGraph);
			//}
		}
		
		if(g.metagraphType=="levelMap"){
			g.levelCCMetagraph=await this.loadWhole(g.originalGraph+"/metagraphs/levelCC");
			//hack: preprocess wave arcs
			let waveID=g.partitionInfo[g.partitionInfo.length-1].value;
			let levelMap=g.levelMap;
			let levels=Object.keys(levelMap).map((x)=>Number(x));
			let maxLevel=Math.max(...levels);
			let minLevel=Math.min(...levels);
			let arcsByCCID=[];let arcs=[];
			//currently size is e+ef (edge+forward edge)
			for(let levelID in levelMap){
				let levelObj=levelMap[levelID];
				let levelSize=0;
				let levelCCCount=0;
				for(let levelCCid in levelObj){
					levelCCCount++;
					levelSize+=levelObj[levelCCid].e+levelObj[levelCCid].ef;
				}
				for(let levelCCid in levelObj){
					let levelCount=1;
					let CCSize=levelObj[levelCCid].e+levelObj[levelCCid].ef;
					
					let arc={wave:Number(waveID),level:Number(levelID),reverseLevel:maxLevel-Number(levelID),ccid:Number(levelCCid),ratio:CCSize/levelSize,CCSize:CCSize,levelSize:levelSize,levelCCCount:levelCCCount,levelCount:levelCount};
					arcs.push(arc);
					arcsByCCID[Number(levelCCid)]=arc;
				}
			}
			let maxLevelCount=1;//Math.max(...arcs.map((x)=>x.levelCount));
			let maxLevelSize=Math.max(...arcs.map((x)=>x.levelSize));
			for(let arc of arcs){arc.maxLevelCount=maxLevelCount;arc.maxLevelSize=maxLevelSize;}
			//get radius, thickness, centerAngle, angleWidth
			let levelCount=maxLevel-minLevel+1;
			let maxRadius=150,centerRadius=20;
			let radiusDelta=Math.min(20,(maxRadius-centerRadius)/(arcs[0].reverseLevel+1));
			let startDegree=-Math.PI/2;
			let currentLevel=-1,degree=startDegree;
			//log scale of wave size (currently the size is the vertex count)
			
			//log scale of wave thickness
			
			for(let arc of arcs){
				if(arc.level>currentLevel){currentLevel=arc.level;degree=startDegree;}
				let logRadius=(Math.log(arc.levelSize+1)/Math.log(maxLevelSize+1))*maxRadius;
				let linearRadius=(arc.levelSize/maxLevelSize)*(maxRadius-centerRadius)+centerRadius; //linear scale
				//arc.reverseWave*radiusDelta+centerRadius; // evenly distributed
				let totalDegree=Math.PI*2,gapDegree=0;
				if(arc.reverseLevel!=0||arc.ratio!=1){gapDegree=Math.min(3*arc.levelCCCount/logRadius,Math.PI/2);totalDegree-=gapDegree;}//using log radius to determine the gap??
				else{
					degree=0;//seems this is needed to make it draw a full circle
				}
				let degreeDelta=totalDegree*arc.ratio;
				let endDegree=degree+degreeDelta;
				if(degreeDelta==Math.PI*2){degreeDelta*=0.99;}//seems this is needed to make it draw a full circle
				arc.levelCount=levelCount;//need this to scale the height
				arc.height=arc.level;//auto-scale?
				//(maxLevel-minLevel)?0:(((arc.level-minLevel)/(maxLevel-minLevel)-0.5)*500.0*Math.sqrt(Math.log(levelCount)));//was arc.wave but need to have the same height of nodes
				arc.logRadius=logRadius;
				arc.linearRadius=linearRadius;
				arc.oldRadius=arc.reverseLevel*radiusDelta+centerRadius;
				arc.startDegree=degree;arc.endDegree=endDegree;arc.degreeDelta=degreeDelta;
				arc.angleWidth=degreeDelta/2;
				arc.centerAngle=(degree+endDegree)/2;
				arc.colorValue=(arc.level-minLevel)/levelCount;
				arc.linearThickness=Math.max(2,radiusDelta*0.9);
				arc.logThickness=Math.max(2,radiusDelta*0.9);
				degree+=degreeDelta+gapDegree/arc.levelCCCount;
			}
			g.arcs=arcsByCCID;
				
			//let original=await this.loadSummary(g.originalGraph);//need to check if we can display the original graph (all vertices) embedded into the circles
			//if(original.vertices.length<10000){
			//	g.embeddedOriginalGraph=await this.loadWhole(g.originalGraph);
			//}
		}
		
		return g;
	},
	load:async function(graph,options){//only returns the graph, does not start displayng it
		//also loads the approppriate metagraph etc
		//{inPlace:inPlace,metagraph:parentGraph,metanodeID:vertexID}
		if(graph instanceof Promise)graph=await graph;
		
		//let maxV=1100,maxE=4000;//debug;
		//let maxV=G.view.maxTextureSize,maxE=Math.floor(maxV*Math.log(maxV)/2);
		let maxV=30000,maxE=1000000;//Math.floor(maxV*Math.log(maxV)/2);
		if(!options)options={};
		if(!graph){
			console.warn("no graph to load");return;
		}
		if(typeof graph=="string"){
			//allow loading a data path directly?
			let graphPath=graph;
			graph=await this.loadSummary(graphPath);
			if(!graph){console.log("failed to load "+graphPath);return null;}
		}
		Object.assign(graph,options);
		//now if a graph needs to be shown as a metagraph, we don't just display the metagraph, instead we mark the metagraph as a representation and "display" the abstract original graph.
		let representation=graph.representation;
		if((representation===undefined)&&graph.metagraphs&&(graph.vertices.length>maxV||graph.edges.length>maxE)){
			//choose a metagraph - by default, that's the largest metagraph that's displayable
			let bestMetagraph=null;
			for(let name in graph.metagraphs){
				let metagraph=graph.metagraphs[name];
				if(metagraph.V<=maxV&&metagraph.E<=maxE){
					if((bestMetagraph==null)||(metagraph.V>graph.metagraphs[bestMetagraph].V)){
						bestMetagraph=name;
					}
				}
			}
			if(bestMetagraph){
				graph.representation=bestMetagraph;representation=bestMetagraph;
			}
			else{G.addLog("no suitable metagraph for large graph "+graph.dataPath);}//leave it abstract
		}
		if(representation){
			let mg=await this.load(graph.dataPath+"/metagraphs/"+representation);
		}
		else{
			if((graph.vertices.length>maxV||graph.edges.length>maxE)){console.log("warning:loading large graph of V "+graph.vertices.length+", E "+graph.edges.length);}
			if(graph.vertices.length+graph.edges.length>10000000)throw error();
			await this.loadWhole(graph);
		}
		if(options)Object.assign(graph,options);
		
		if(graph.isMetagraph){
			//graph.metagraph=options.metagraph;graph.metanode=options.metanodeID;
			//attach the subgraph
			if(!graph.vertices.isExpanded)graph.vertices.addProperty("isExpanded","sparse");
			//options.metagraph.vertices.subgraph[options.metanodeID]=graph;
			//options.metagraph.vertices.isExpanded[options.metanodeID]=true;
		}
		graph.parent=graph.metagraph||graph.originalGraph||graph.wholeGraph;
		
		
		G.broadcast("loadGraph",graph);//now loading and displaying graphs are different messages. preprocessing & analytics etc apply to all loaded graphs in the hierarchy, but display only affects the view and is applied to the top level graph.
		return graph;
	},
	display:async function(graph,options){//if it's displayed in place, don't call this, just load and attach it
		if(graph instanceof Promise)graph=await graph;
		
		if(!options)options={};
		if(!graph){
			console.warn("no dataset loaded");return;
		}
		//if(typeof graph=="string"||graph.isAbstract()){
			//allow loading a data path directly?
		graph=await this.load(graph,options);//assuming it's either a path or a fully loaded graph, not an abstract graph
			//even if it's a loaded graph, we may want to reuse this to load its representation
		//}

		if(options)Object.assign(graph,options);
		
		console.log("loading graph of |V| "+graph.vertices.length+", |E| "+graph.edges.length);
	
		//if(graph.name===undefined){graph.name=toNormalText(graph.datasetID);}
		//else{graph.name=toNormalText(graph.name);}

		this.graph=graph;
		G.graph=graph;
		//window.history.pushState(graph.dataPath, "", "/?dataPath="+graph.dataPath);
		//I think this can be annoying when I want to refresh when debugging. have a separate "get link" button?
		
		/*
		if(dataset.vertices.length==1&&dataset.expandVertex){
			G.addLog("automatically expanding the only metanode");
			//setTimeout(()=>Promise.resolve(dataset.expandVertex(dataset.vertices[0])).then(G.load),0);
			Promise.resolve(dataset.expandVertex(dataset.vertices[0])).then(G.load)
			return;
		}
		*/
		//hack for incremental waves - load the selected wave sugraphs, and use them later to produce nodes/links
		if(graph.isAbstract()&&graph.modifiers&&graph.modifiers.filter){
			let type=graph.modifiers.filter.propertyType;
		}//todo
		
		if(options.algorithm){
			await G.controls.algorithms[options.algorithm](graph);
		}
		else {
			G.broadcast("displayGraph",graph);
		}
		
	},
		
	contractVertex:function(vertexID,parentGraph,inPlace){
		if(!parentGraph)parentGraph=G.graph;
		parentGraph.vertices[vertexID].isExpanded=false;
		G.view.displayGraph(G.graph);
	},
	expandVertex:function(vertexID,parentGraph,inPlace){
		//let tempDataset=G.graph;
		if(!parentGraph)parentGraph=G.graph;
		//now there are two different sources of subgraphs - saved ones on the server (need a path) or one created on the client (need a function).
		if(!(parentGraph.subgraphPrefix||parentGraph.expandVertex))return;
		parentGraph.lastExploredMetanodeIndex=vertexID;
		console.log("incrementing index to "+parentGraph.lastExploredMetanodeIndex);
		function onExpandFailed(){
			if(G.zoomToExpand)G.cameraControls.addZoom(1.1);
		}
		if(parentGraph.vertices.isMetanode&&(parentGraph.vertices.isMetanode[vertexID]===false)){onExpandFailed();return false;}
		
		let V=parentGraph.vertices.V?parentGraph.vertices.V[vertexID]:null;
		let E=parentGraph.vertices.E?parentGraph.vertices.E[vertexID]:null;
		if(inPlace===undefined){if(((V==null)||V<128)&&((E==null)||E<512))inPlace=true;else inPlace=false;}
		if(parentGraph.subgraphPrefix){
			let str=parentGraph.vertices.id[vertexID];if(parentGraph.vertices.subgraphPath)str=parentGraph.vertices.subgraphPath[vertexID];
			let path=parentGraph.subgraphPrefix+"/"+str;
			
			if(inPlace){this.load(path,{currentMetagraph:parentGraph.dataPath,metanodeID:vertexID}).then((g)=>{
				G.preprocessing.loadGraph(g);//todo: remove hack
				G.view.displayGraph(G.graph);
			});}//the automatic exploration should not zoom into it
			else{this.display(path,{currentMetagraph:parentGraph.dataPath,metanodeID:vertexID}).catch(()=>{onExpandFailed()});}
		}
		else{
			if(inPlace){Promise.resolve(parentGraph.expandVertex(vertexID)).then((g)=>{
				g.currentMetagraph=parentGraph;g.metanodeID=vertexID;
				G.preprocessing.loadGraph(g);//todo: remove hack
				G.view.displayGraph(G.graph);
			});}//the automatic exploration should not zoom into it
			else{this.display(Promise.resolve(parentGraph.expandVertex(vertexID)),{metagraph:parentGraph,metanodeID:vertexID}).catch(()=>{onExpandFailed()});}
		}
		
		//if the subgraph is large, we should use the normal loading method to choose a metagraph.
		
		
		
	},
	getParentPath:function(g,visual=true){//if visual, skip 1-vertex metagraphs and consider the display history
		let parentPath;
		if(typeof g.originalGraph=="string"){parentPath=g.originalGraph;}
		if(typeof g.metagraph=="string"){parentPath=g.metagraph;}
		return parentPath;
		//todo
		/*let target=g.parent;
		while(target&&(target.vertices.length==1)&&target.expandVertex){
			target=target.parent;
		}
		return target;*/
	},
	getParent:function(g,visual=true){
		let path=this.getParentPath(g,visual);
		if(path)return G.getGraph(path);
	},
	showMetagraph:function(){
		
		//keep backtracking until we get to a graph that's not auto-expanded; if all parents are auto-expanded, refuse to show metagraph.
		let target=this.getRealParent(G.dataset);
		if(target){
			//remove the contents of target in the directory tree
			G.load(target);
			console.log("showing metagraph "+target.name);
		}
		else{G.addLog("no available level above this graph");}
	},
	showNextSiblingGraph:function(){
		// use the next sibling function if the graph has one
		if(G.dataset.getNextSiblingGraph){
			G.load(G.dataset.getNextSiblingGraph());
		}
		else{
			//keep backtracking until we get to a graph that's not auto-expanded; if all parents are auto-expanded, refuse to show.
			let target=this.getRealParent(G.dataset);
			if(target){
				//expand the next metanode
				let nextSibling=null;
				for(let i=target.lastExploredMetanodeIndex+1;i<target.vertices.length;i++){
					let vertex=target.vertices[i];
					if((vertex.isMetanode!==false)){nextSibling=vertex;break;}
				}
				if(nextSibling){G.onExpandVertex(nextSibling,target);}//optional second argument specifies the parent graph
				else{G.addLog("no next sibling available");}
			}
			else{G.addLog("no available level above this graph");}
		}
		
	},
	showPreviousSiblingGraph:function(){
		// use the next sibling function if the graph has one
		if(G.dataset.getPreviousSiblingGraph){
			G.load(G.dataset.getPreviousSiblingGraph());
		}
		else{
			//keep backtracking until we get to a graph that's not auto-expanded; if all parents are auto-expanded, refuse to show.
			let target=this.getRealParent(G.dataset);
			if(target){
				//expand the next metanode
				let previousSibling=null;
				for(let i=target.lastExploredMetanodeIndex-1;i>=0;i--){
					let vertex=target.vertices[i];
					if((vertex.isMetanode!==false)){previousSibling=vertex;break;}
				}
				if(previousSibling){G.onExpandVertex(previousSibling,target);}
				else{G.addLog("no previous sibling available");}
			}
			else{G.addLog("no available level above this graph");}
		}
	},
	
	showDatasetList:function(datasets){
		if(datasets)this.datasets=datasets;
		if((!datasets)&&this.datasets){
			datasets=this.datasets;selectE('dataset-menu').style('display','block');return;
		}
		getE("dataset-menu").style.display="block";
		var ws=selectE("dataset-menu-content").selectAll("div").data(Object.values(datasets).sort(compareBy("name",true))).enter().append("div").attr("class","dataset").on("click",(data)=>{
			this.display(data.id);
			datasetMenu.style('display','none');
		});
		ws.append("p").text(function(data){return data.name||toNormalText(data.id)}).attr("class","graph-name");
		ws.append("p").attr("class","graph-list-info").text(function(data){return data.params?(data.info?data.info:""):("|V|:"+data.V+", |E|:"+data.E+" "+(data.info?data.info:""))});
		/*ws.append("button").attr("class","material small").text("Select layer").on("click",(data)=>{
				d3.event.stopPropagation();
				G.lastDatasetID=data.id;//need this later...
				if(data.isHierarchy){
					datasetMenu.style('display','none');
					this.showHierarchyLayerList(data.layers);
				}
				else{
					//d3.json("datasets/"+data.id+"/layers",(d)=>{
					d3.json("datasets/"+data.id+"/layerSummary").then((layerSummary)=>{
						if(!(layerSummary)){console.log("unable to get dataset "+data.id);return;}//d&&
						datasetMenu.style('display','none');
						let topLevelGraph={};
						topLevelGraph.vertices=[];topLevelGraph.edges=[];topLevelGraph.layers=layerSummary;topLevelGraph.ccCounted=true;
						topLevelGraph.vertexCount=data.vertexCount;
						topLevelGraph.edgeCount=data.edgeCount;
						topLevelGraph.id=data.id;
						//this.showLayerList(d,topLevelGraph);//doesn't change the scene, just a table panel now
						this.showLayerList(layerSummary,topLevelGraph);//doesn't change the scene, just a table panel now
					});
					//});
				}
				
				
		});*/
		
	},
});



	
function loadGraphFiles(files,options,successcb,failurecb){
	//common prefix and suffix attached to "vertices" and "edges"
	//let prefix=options.prefix?options.prefix:currentGraph.path;//??
	//let suffix=options.suffix?options.suffix:".txt";
	if(typeof files=="string"){files={edges:files};}
	if(files.prefix||files.suffix){
		let prefix=files.prefix?files.prefix:"";let suffix=files.suffix?files.suffix:"";
		delete files.prefix;delete files.suffix;
		for(let name in files){files[name]=prefix+files[name]+suffix;}
	}
	return new Promise(function(resolve,reject){
		d3.text(files.edges).then((edgestxt)=>{
			if((!edgestxt)||(edgestxt=="null")){console.log("cannot load file "+files.edges);reject();return;}
			let graph;
			if(files.vertices){
				d3.text(files.vertices).then((nodestxt)=>{
					if((!nodestxt)||(nodestxt=="null")){console.log("cannot load file "+files.vertices);reject();return;}
					graph=G.buildGraphFromText(nodestxt,edgestxt,options);
					if(graph)resolve(graph);
					else reject();
				});
			}
			else{
				graph=buildGraphFromText(null,edgestxt,options);
				if(graph)resolve(graph);
				else reject();
			}	
		});

	});
}
	
function splitLines(input){
	let firstLB=input.indexOf("\n");
	let line=input.substring(0,firstLB);
	let linesep="/n";
	if(line[line.length-1]=="\r"){linesep="/r/n";}
	return input.split(linesep);
}
function getColumnSep(text){
	let firstLB=text.indexOf("\n");
	let line=(firstLB==-1)?(text):(text.substring(0,firstLB));
	let sep="\t";
	if(line.indexOf(sep)==-1){sep=",";}
	if(line.indexOf(sep)==-1){sep=" ";}
	return sep;
}


function buildGraphFromText(vtext,etext,options){
	if(!etext)return null;
	let edata=d3.dsvFormat(getColumnSep(etext)).parseRows(etext);
	let vdata=null;
	if(vtext){vdata=d3.dsvFormat(getColumnSep(vtext)).parseRows(vtext);}
	let graph={};
	let vDefs={id:0};
	let eDefs={s:0,t:1};//should map from prop names to columns not vice versa, since the column nane can later be a function
	if(options){
		if(options.vDefs)Object.assign(vDefs,options.vDefs);
		if(options.eDefs)Object.assign(eDefs,options.eDefs);
		if(options.startEdgeIndex||options.endEdgeIndex||options.edgeCountLimit){
			let start=isNaN(options.startEdgeIndex)?0:Number(options.startEdgeIndex);
			let end=isNaN(options.endEdgeIndex)?( isNaN(options.edgeCountLimit)?edata.length:(Number(options.edgeCountLimit)+start)  ):Number(options.endEdgeIndex);//end is the index after the last edge
			edata=edata.slice(start,end);
		}
	}
	
	//by default, teh first column in the V file is metanode ID, others can have other meanings
	function mapObjs(data,defs){
		return data.map((d,index)=>{
			let obj={};
			for(let name in defs){
				if(typeof defs[name]=="function"){obj[name]=defs[name](d);}
				else{obj[name]=d[defs[name]];}
			}
			return obj;
		});
	}
	
	
	graph.edges=mapObjs(edata,eDefs);
	let duplicateWarned=false,oldEdgeCount=graph.edges.length,duplicateEdgeCount;
	if(vdata){
		graph.vertices=mapObjs(vdata,vDefs);
		let vMap={},adjList={},vCount=0;graph.vMap=vMap;
		graph.vertices.forEach((v)=>{
			if((v.id in adjList)==false){adjList[v.id]={};}
			if((v.id in vMap)==false){vMap[v.id]=vCount;vCount++;}
		});
		
		graph.edges.forEach((e)=>{//these IDs are original vertex indices
			if((e.s in vMap)==false||(e.t in vMap)==false){throw Error("invalid edge endpoints "+e.s+" "+e.t);}
			if(adjList[e.s]&&adjList[e.s][e.t]){
				e.duplicate=true;
				if(!duplicateWarned){duplicateWarned=true;console.log("duplicate edge" +e.s+","+e.t);} 
				return;
			}//duplicate edge
			adjList[e.s][e.t]=true;adjList[e.t][e.s]=true;
			e.s=vMap[e.s];e.t=vMap[e.t];
		});
		graph.edges=graph.edges.filter((e)=>!e.duplicate);
		
	}
	else{
		//create vertices
		graph.vertices=[];
		let vMap={},adjList={},vCount=0;graph.vMap=vMap;
		oldEdgeCount=graph.edges.length;
		graph.edges.forEach((e)=>{//these IDs are original vertex indices
			if(adjList[e.s]&&adjList[e.s][e.t]){e.duplicate=true;if(!duplicateWarned){duplicateWarned=true;console.log("duplicate edge" +e.s+","+e.t);} return;}//duplicate edge
			if((e.s in adjList)==false){adjList[e.s]={};}
			if((e.t in adjList)==false){adjList[e.t]={};}
			adjList[e.s][e.t]=true;adjList[e.t][e.s]=true;
			if((e.s in vMap)==false){vMap[e.s]=vCount;vCount++;graph.vertices.push({id:e.s});}
			if((e.t in vMap)==false){vMap[e.t]=vCount;vCount++;graph.vertices.push({id:e.t});}
			e.s=vMap[e.s];e.t=vMap[e.t];
		});
		graph.edges=graph.edges.filter((e)=>!e.duplicate);
	}
	duplicateEdgeCount=oldEdgeCount-graph.edges.length;
	if(duplicateEdgeCount>0){console.log("duplicate edge count "+duplicateEdgeCount);}
	if(options){
		Object.assign(graph,options);
		/*if(options.expansion){
			graph.expandVertex=function(vertex){
				G.showGraphFiles(graph,files,options.expansion);
			}
		}*/
	}
	
	return graph;
}

function buildGraphFromText2(vtext,etext,options){
	if(!etext)return null;
	let edata=d3.dsvFormat(getColumnSep(etext)).parseRows(etext);
	let vdata=null;
	if(vtext){vdata=d3.dsvFormat(getColumnSep(vtext)).parseRows(vtext);}
	let graph={};
	let vDefs={id:0};
	let eDefs={s:0,t:1};//should map from prop names to columns not vice versa, since the column nane can later be a function
	if(options){
		if(options.vDefs)Object.assign(vDefs,options.vDefs);
		if(options.eDefs)Object.assign(eDefs,options.eDefs);
		if(options.startEdgeIndex||options.endEdgeIndex||options.edgeCountLimit){
			let start=isNaN(options.startEdgeIndex)?0:Number(options.startEdgeIndex);
			let end=isNaN(options.endEdgeIndex)?( isNaN(options.edgeCountLimit)?edata.length:(Number(options.edgeCountLimit)+start)  ):Number(options.endEdgeIndex);//end is the index after the last edge
			edata=edata.slice(start,end);
		}
	}
	
	//by default, teh first column in the V file is metanode ID, others can have other meanings
	function mapObjs(data,defs){
		return data.map((d,index)=>{
			let obj={};
			for(let name in defs){
				if(typeof defs[name]=="function"){obj[name]=defs[name](d);}
				else{obj[name]=d[defs[name]];}
			}
			return obj;
		});
	}
	
	
	graph.edges=mapObjs(edata,eDefs);
	let duplicateWarned=false,oldEdgeCount=graph.edges.length,duplicateEdgeCount;
	if(vdata){
		graph.vertices=mapObjs(vdata,vDefs);
		let vMap={},adjList={},vCount=0;graph.vMap=vMap;
		graph.vertices.forEach((v)=>{
			if((v.id in adjList)==false){adjList[v.id]={};}
			if((v.id in vMap)==false){vMap[v.id]=vCount;vCount++;}
		});
		
		graph.edges.forEach((e)=>{//these IDs are original vertex indices
			if((e.s in vMap)==false||(e.t in vMap)==false){throw Error("invalid edge endpoints "+e.s+" "+e.t);}
			if(adjList[e.s]&&adjList[e.s][e.t]){
				e.duplicate=true;
				if(!duplicateWarned){duplicateWarned=true;console.log("duplicate edge" +e.s+","+e.t);} 
				return;
			}//duplicate edge
			adjList[e.s][e.t]=true;adjList[e.t][e.s]=true;
			e.s=vMap[e.s];e.t=vMap[e.t];
		});
		graph.edges=graph.edges.filter((e)=>!e.duplicate);
		
	}
	else{
		//create vertices
		graph.vertices=[];
		let vMap={},adjList={},vCount=0;graph.vMap=vMap;
		oldEdgeCount=graph.edges.length;
		graph.edges.forEach((e)=>{//these IDs are original vertex indices
			if(adjList[e.s]&&adjList[e.s][e.t]){e.duplicate=true;if(!duplicateWarned){duplicateWarned=true;console.log("duplicate edge" +e.s+","+e.t);} return;}//duplicate edge
			if((e.s in adjList)==false){adjList[e.s]={};}
			if((e.t in adjList)==false){adjList[e.t]={};}
			adjList[e.s][e.t]=true;adjList[e.t][e.s]=true;
			if((e.s in vMap)==false){vMap[e.s]=vCount;vCount++;graph.vertices.push({id:e.s});}
			if((e.t in vMap)==false){vMap[e.t]=vCount;vCount++;graph.vertices.push({id:e.t});}
			e.s=vMap[e.s];e.t=vMap[e.t];
		});
		graph.edges=graph.edges.filter((e)=>!e.duplicate);
	}
	duplicateEdgeCount=oldEdgeCount-graph.edges.length;
	if(duplicateEdgeCount>0){console.log("duplicate edge count "+duplicateEdgeCount);}
	if(options){
		Object.assign(graph,options);
		/*if(options.expansion){
			graph.expandVertex=function(vertex){
				G.showGraphFiles(graph,files,options.expansion);
			}
		}*/
	}
	
	return graph;
}

function showTable(tableDialogSelection,dataObj,rowMaps,rowOnclick,cellOnclick){
	tableDialogSelection.style("display","block");
	let array=[];	
	if(Array.isArray(dataObj)){//only get normal array entries
		for(let index=0;index<dataObj.length;index++){
			let res={index:index};
			for(let row in rowMaps){
				res[row]=rowMaps[row](dataObj[index],index);
			}
			array.push(res);
		}
	}
	else{
		for(let index in dataObj){
			let res={index:index};
			for(let row in rowMaps){
				res[row]=rowMaps[row](dataObj[index],index);
			}
			array.push(res);
		}
	}
	
	
	array.sort(compareBy((x)=>Number(x.index)));
	//console.log(array);
	let columns=Object.keys(rowMaps);//todo: add CC count etc
	let table=tableDialogSelection.select("table");
	let thead = table.select('thead')
	
	let ttitle = thead.select('tr#title');
	let tcolumns = thead.select('tr#columns');
	tcolumns.selectAll('th').remove();
	tcolumns=tcolumns.selectAll('th')
		.data(columns);
	tcolumns.exit().remove();
	tcolumns.enter().append('th').text(function (column) { return column; });
	
	let	tbody = table.select('tbody');
	tbody.selectAll("tr").remove();//todo: fix the not-updating table
	tbody=tbody.selectAll("tr").data(array);
	tbody.exit().remove();
	tbody=tbody.enter().append("tr");
	if(rowOnclick){tbody.on("click",rowOnclick);}
	
	let grid=tbody.selectAll('td');
	grid=grid.data(function (row) {
			return columns.map(function (column) {
			  return {column: column, value: row[column],rowIndex:row.index,rowObj:row};
			});
		  });
	grid.exit().remove();
	grid=grid.enter().append('td').text(function (d) { return (d.value!==undefined)?d.value:""; });
	if(cellOnclick){grid.on("click",cellOnclick);}
}


function getVLogVKString(v,e){return (v>2)?(String(Math.log(e/v,Math.log(v))).substring(0,5)):"N/A";}
function getNum(node,name){return Number(node.getAttribute(name));}

function getQueryVariable(variable)
{
       var query = window.location.search.substring(1);
       var vars = query.split("&");
       for (var i=0;i<vars.length;i++) {
               var pair = vars[i].split("=");
               if(pair[0] == variable){return pair[1];}
       }
       return(false);
}