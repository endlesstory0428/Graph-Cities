let datasetMenu,layerMenu;


G.addModule("loading",{
	init:function(){
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
		G.hasGraph=this.hasGraph.bind(this);
		G.saveGraph=this.saveGraph.bind(this);
		G.getQueryVariable=getQueryVariable;
		
		prepareQueryVariables();
		let modifiersMap={};
		for(let module of G.moduleList){
			if(module.modifiers){
				for(let modifier in module.modifiers){
					modifiersMap[modifier]=true;
				}
			}
		}
		let queryVariables=getQueryVariables();

		let variableDefs={
			dataPath:{type:"string"},
			dataURL:{type:"string"},
			verticesDataURL:{type:"string"},
			ignoreUnknownVertices:{type:"boolean"},
			dataURLFunc:{type:"function"},
			propertyColumns:{type:"object"},
			verticesPropertyColumns:{type:"object"},
			extraProperties:{type:"object"},
			extraGraphs:{type:"object"},
		};
		
		let variables={};
		for(let name in variableDefs){
			let type=variableDefs[name].type;
			let raw=getQueryVariable(name);
			if(!raw)continue;
			let str=unescape(raw).trim();
			switch(type){
				case "string":variables[name]=str;break;
				case "object":variables[name]=JSON.parse(str);break;
				case "function":variables[name]=eval(str);break;
				case "boolean":if(str=="True"||str=="true")variables[name]=true;if(str=="False"||str=="false")variables[name]=false;break;
				//new Function(str)();break;//need to send a function that takes arguments, so 
			}
		}
		let dataPath=variables.dataPath;
		let dataURL=variables.dataURL;
		let verticesDataURL=variables.verticesDataURL;
		let dataURLFunc=variables.dataURLFunc;
		let propertyColumns=variables.propertyColumns;
		let verticesPropertyColumns=variables.verticesPropertyColumns;
		let extraProperties=variables.extraProperties;
		let filters=variables.filters;
		let extraGraphs=variables.extraGraphs;
		
		
		let options={};let modifiers={};
		for(let name in queryVariables){
			let value=queryVariables[name];
			if(name =="dataPath")continue;
			//if(name in variableDefs)continue;//let the data itself decide what its standard path is (in a special case, a dataset's directory was wrong and the file had to be soft linked)
			if(name in modifiersMap){
				modifiers[name]=JSON.parse(unescape(value).trim());
				options.modifiers=modifiers;
			}
			else{
				if(name in variables){options[name]=variables[name];}
				else{options[name]=unescape(value).trim();}
			}
			//extra processing
			switch (name){
				case "algorithm":{options.representation=null;break;}//representation="null";
				case "representation":{if(options.representation=="null")options.representation=null;break;}
				case "filters":{
					if(options.filters){
						let old=JSON.parse(options.filters);
						options.filters=[];
						for(i=0;i<old.length;i++){
							try{
								options.filters.push(eval(old[i]));
							}
							catch(e){
								console.log(e.stack);
							}
							
						}
					}
					break;
				}
			}
		}
		
		if(variables.extraGraphs){//a way to pass in graph summaries for text-based graphs, when there's no easy way to get summaries of higher level graphs
			for(let i in extraGraphs){
				let obj=extraGraphs[i];
				if(obj.dataPath==undefined){obj.dataPath=i;}
				let g=new Graph();Object.assign(g,obj);
				this.saveGraph(g);
			}
		}
		if(dataURLFunc){//overrides normal loading paths
			this.dataURLFunc=dataURLFunc;
			//if(dataPath&&(!dataURL))dataURL=dataURLFunc(dataPath);//dataURL func should override dataPath in normal loading, for unions etc
		}
		if(dataURL){
			this.loadURL(dataURL,options).then((g)=>{ //note that filters is not in variableDefs
				if(dataPath){
					g.dataPath=dataPath;
				}else{g.dataPath="custom";}
				this.saveGraph(g);
				this.display(g,options);
			}).catch((err)=>{console.log(err);d3.json("datasets").then((d)=>this.showDatasetList(d))});;
			
		}
		else{
			if(dataPath){
				this.display(dataPath,options).catch(()=>d3.json("datasets").then((d)=>this.showDatasetList(d)));
			}
			else{
				d3.json("datasets").then((d)=>this.showDatasetList(d));
			}
		}
		
		
		//allow the including webpage to post messages to this if it's included as an iframe
		window.addEventListener("message", function( event ) {
			console.log(event.origin,event.data);
			G.loading.parentWindow=event.source;
			G.loading.parentOrigin=event.origin;
			if(event.data&&event.data.updateModifier){
				let obj=event.data.updateModifier;
				let moduleName=obj.module;
				let modifierName=obj.modifier;
				let target=G[moduleName].modifierTarget;
				let params=obj.params;
				if(!target.modifiers[modifierName]){
					//console.log("Error: this target has no modifier "+modifierName);return;
					if(!target.modifiers){target.modifiers={};}
					target.modifiers[modifierName]=params;
					G[moduleName].enableModifier(modifierName);
					return;
				}
				let oldParams=target.modifiers[modifierName];
				Object.assign(oldParams,params);
				let modObj=G[moduleName].modifiers[modifierName];
				for(let name in params){
					let paramObj=modObj.params[name];if(!name){console.log("Error: this modifier has no parameter "+name);}
					if(paramObj.func)paramObj.func(params[name],target,oldParams);
				}
				G[moduleName].modifiers[modifierName].needsUpdate=true;G[moduleName].onModifiersChanged(modifierName);
			}
		}, false );

	},
	modifierUpdated:function(obj){
		let target=obj.target,modifier=obj.modifier,params=obj.params;
		if(window!=window.top){
			window.top.postMessage({modifierUpdated:obj},"*");
		}
	},
	graphsCache:{},
	hasGraph:function(path){
		return path in this.graphsCache;
	},
	getGraph:function(path){
		if(this.graphsCache[path])return this.graphsCache[path];
		throw Error("missing "+path);
	},
	saveGraph:function(g,path){
		if(!path){path=g.dataPath;}
		if(this.graphsCache[path]){console.warn("repeated graph path "+path);}
		this.graphsCache[path]=g;console.log("saved "+path);
		G.broadcast("loadGraph",g);
	},
	loadSummary:async function(g){///takes a path or a summary object. for UI purposes, also load all summaries of levels above this graph
        if(typeof g=="string"){
			//if(this.graphsCache[g])return this.graphsCache[g];
			let path=g;g=new Graph();let loadedSummary=false;
			await d3.json("datasets/"+path+"/summary.json.gz").then((summary)=>{
				if(summary){
					g.loadSummary(summary);
					loadedSummary=true;
				}}).catch((error)=>{console.error("cannot load summary "+path);return;});;
			if(loadedSummary==false){
				throw Error();
				return;
			}
            this.graphsCache[g.dataPath]=g;console.log("saved "+g.dataPath);
			if(!g.name)g.name=pathToText(g.dataPath);//??
			//also load summary of the original (for metagraphs) or metagraph (for subgraphs)
			let parentPath=this.getParentPath(g,false);//false: does not consider skipped metagraphs and history
			if(parentPath)await this.loadSummary(parentPath);
            G.addLog("Loading Graph, Please Wait .....");

        }
		if((g instanceof Graph)==false){throw Error();}
		return g;
	},
	loadWhole:async function(g,options={}){//takes a path or a summary object, or a Graph with summary loaded
		if(typeof g=="string"&&this.dataURLFunc){
			if(this.hasGraph(g))return this.getGraph(g);
			let dataPath=g;
			let dataURL=this.dataURLFunc(dataPath);
			g=await this.loadURL(dataURL,options);
			g.dataPath=dataPath;
			return g;
		}
		g=await this.loadSummary(g);
		if(!g){return;}
		//first load the topology(ids, sources, targets)
		let ids,sources,targets;
		if(g.isAbstract()){
			await d3.json("datasets/"+g.dataPath+"/vertices.id.json.gz").then((data)=>{
				if(typeof data=="string")data=JSON.parse(data);
				ids=data.value;
				if(!ids){
					console.log("missing ids");
				}
			});
			if(g.wholeGraph == undefined || g.name == g.wholeGraph) {
                await d3.csv("datasets/"+g.dataPath+"_labels.csv").then((data)=>{
                    if(typeof data=="string")
                        data=JSON.parse(data);
                    labels = data;
                });
            }
            if(g.wholeGraph == undefined || g.name == g.wholeGraph) {
                await d3.csv("datasets/"+g.dataPath+"_dutch_labels.csv").then((data)=>{
                    if(typeof data=="string")
                        data=JSON.parse(data);
                    dutchLabels = data;
                });
            }

            if(g.wholeGraph == undefined || g.name == g.wholeGraph) {
                await d3.csv("datasets/AllTMI.csv").then((data)=>{
                    if(typeof data=="string")
                        data=JSON.parse(data);
                    TMIclassification = data;
                });
            }
            if(g.wholeGraph == undefined || g.name == g.wholeGraph) {
                await d3.csv("datasets/AllATU.csv").then((data)=>{
                    if(typeof data=="string")
                        data=JSON.parse(data);
                    ATUclassification = data;
                });
            }

			await d3.json("datasets/"+g.dataPath+"/edges.source.json.gz").then((data)=>{
				if(typeof data=="string")data=JSON.parse(data);
				sources=data.value;
			});
			await d3.json("datasets/"+g.dataPath+"/edges.target.json.gz").then((data)=>{
				if(typeof data=="string")data=JSON.parse(data);
				targets=data.value;
			});
			g.loadVerticesAndEdges(ids,sources,targets, labels, TMIclassification, ATUclassification, dutchLabels);
		}

		for(let objName in g.objects){
			let obj=g.objects[objName];
			for(let propName in obj.properties){
				if(!obj.properties[propName].isAbstract)continue;
				//if((objName=="vertices"&&propName=="id")||(objName=="edges"&&propName=="source")||(objName=="edges"&&propName=="target"))continue;
				await d3.json("datasets/"+g.dataPath+"/"+objName+"."+propName+".json.gz").then((data)=>{
					if(typeof data=="string")data=JSON.parse(data);
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
	loadURL:async function(dataURL,options){
		
		let propertyColumns=options.propertyColumns||{},extraProperties=options.extraProperties||[],filters=options.filters||[],verticesDataURL=options.verticesDataURL||null;
		
		if(!dataURL){
			console.warn("no URL to load");return;
		}
		
		let results=[];let index=1;
		let txt=await d3.text(dataURL);
		let g;
		if(verticesDataURL){
			let txt2=await d3.text(verticesDataURL);
			g=buildGraphFromText(txt2,txt,options);//{propertyColumns:propertyColumns,filters:filters});
		}
		else{
			g=buildGraphFromText(null,txt,options);//{propertyColumns:propertyColumns,filters:filters});
		}
		for(let def of extraProperties){//[{URL:...,owner:...,name:...}]
			let result=await d3.json(def.URL);
			if(def.owner=="vertices"){
				g.loadVertexPropertyFromSets(def.name,result);//need the vertex IDs to load it
			}
		}
		g.isCustom=true;
		return g;
	},
	load:async function(graph,options){//only returns the graph, does not start displayng it
		//also loads the approppriate metagraph etc
		//{inPlace:inPlace,metagraph:parentGraph,metanodeID:vertexID}
		if(graph instanceof Promise)graph=await graph;
		
		
		//let maxV=1100,maxE=4000;//debug;
		//let maxV=G.view.maxTextureSize,maxE=Math.floor(maxV*Math.log(maxV)/2);
		let maxV=1000000,maxE=1048576;//??//Math.floor(maxV*Math.log(maxV)/2);
		if(G.view.maxTextureSize>1000000){
			console.log("maxTextureSize is "+G.view.maxTextureSize);
			maxV=1000000,maxE=1500000;
		}//??//Math.floor(maxV*Math.log(maxV)/2);
		if(!options)options={};
		if(!graph){
			console.warn("no graph to load");return;
		}
		if(typeof graph=="string"){
			//if(this.graphsCache[graph])return this.graphsCache[graph];
			//allow loading a data path directly?
			let graphPath=graph;
			//manage union loading in the client
			let segments=graphPath.split("/");
			if(graphPath.indexOf("+")!=-1){
				//no LoadSummary
				let subgraphType=segments[segments.length-2];
				let subgraphIDs=segments[segments.length-1];
				let subgraphIDList=subgraphIDs.split("+").map(x=>Number(x)).sort(compareBy(x=>Number(x),true));//standardize, to make comparing equality easier
				let originalGraph=segments.slice(0,segments.length-2).join("/");
				graphPath=originalGraph+"/"+subgraphType+"/"+subgraphIDList.join("+");
				if(this.graphsCache[graphPath]) {
                    return this.graphsCache[graphPath];//as a special case, if this graph's dataset was renamed, the standardized path would use the renamed dataset name, not the intrinsic name in the data, cause here we don't know what is the intrinsic name
                }
				//if(unionCachePath==originalGraph+"/"+subgraphType+"/"+subgraphIDList.join("+"))return unionCache;
				let subgraphList=[];let isCustom=false;
				for(let ID of subgraphIDList){
					let dataPath=originalGraph+"/"+subgraphType+"/"+ID;
					let subgraph=await this.loadWhole(dataPath);
					if(!subgraph.subgraphID){subgraph.subgraphID=ID;}
					if(!subgraph.dataPath){subgraph.dataPath=dataPath;}
					if(!subgraph.wholeGraph){subgraph.wholeGraph=originalGraph;}
					subgraphList.push(subgraph);
					if(subgraph.isCustom)isCustom=true;
				}
				//todo: correct way to get the partition name
				let newPropertyName=subgraphType;
				if(subgraphType=="CC")newPropertyName="cc";
				if(subgraphType=="layer")newPropertyName="fixedPointLayer";
				if(subgraphType=="level")newPropertyName="originalWaveLevel";
				let result=Graph.unionGraphs(subgraphList,null,newPropertyName,"int").graph;
				//bug fix: if only some of the subgraphs have layouts, we must ensure all vertices in the union have a position.
				if(result.vertices.layout){
					result.vertices.removeProperty("layout");
				}
				result.dataPath=graphPath;
				//unionCache=result;unionCachePath=result.dataPath;
				if(isCustom){result.isCustom=true;}
				result.datasetID=segments[0];
				result.wholeGraph=originalGraph;
				result.subgraphType=subgraphType;
				result.subgraphID="union";
				result.metagraph=subgraphList[0].metagraph;
				result.subgraphIDMin=arrayMin(subgraphIDList);
				result.subgraphIDMax=arrayMax(subgraphIDList);
				graph=result;
			}
			else{
				if(this.dataURLFunc){
					let url=this.dataURLFunc(graphPath);
					graph=await this.loadURL(url,options);
					if(!graph){console.error("failed to load "+graphPath);return null;}
					graph.dataPath=graphPath;
				}
				else{
					graph=await this.loadSummary(graphPath);
					if(!graph){console.error("failed to load "+graphPath);return null;}
				}
				
			}
			this.checkNames(graph);
		}
		Object.assign(graph,options);
		
		//now if a graph needs to be shown as a metagraph, we don't just display the metagraph, instead we mark the metagraph as a representation and "display" the abstract original graph.
		//union graphs don't have "metagraphs"
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
			if(graph.colorScale){mg.colorScale=graph.colorScale;}
		}
		else{
			if((graph.vertices.length>maxV||graph.edges.length>maxE)){console.log("warning:loading large graph of V "+graph.vertices.length+", E "+graph.edges.length);}
			if(graph.vertices.length+graph.edges.length>10000000)throw error();
			graph.firstBool = true;
			await this.loadWhole(graph);
		}
		
		if(graph.isMetagraph){
			//graph.metagraph=options.metagraph;graph.metanode=options.metanodeID;
			//attach the subgraph
			if(!graph.vertices.isExpanded)graph.vertices.addProperty("isExpanded","sparse");
			//options.metagraph.vertices.subgraph[options.metanodeID]=graph;
			//options.metagraph.vertices.isExpanded[options.metanodeID]=true;
		}
		if(graph.dimBelowHeight){
			if(!graph.modifiers)graph.modifiers={};
			graph.modifiers.dimming={property:"height",propertyType:"vertices",threshold:graph.dimBelowHeight};
			if(graph.separateAtHeight){graph.modifiers.dimming.separate=true;}
		}
		if(graph.nodeColorProperty){
			if(!graph.modifiers)graph.modifiers={};
			graph.modifiers.nodeColor={property:graph.nodeColorProperty};//,colorScaleName:"custom"
			if(graph.colorScaleName){graph.modifiers.nodeColor.colorScaleName=graph.colorScaleName;}
		}
		graph.parent=graph.metagraph||graph.originalGraph||graph.wholeGraph;

        G.broadcast("loadGraph",graph);//now loading and displaying graphs are different messages. preprocessing & analytics etc apply to all loaded graphs in the hierarchy, but display only affects the view and is applied to the top level graph.
        return graph;
	},
	checkNames:(g)=>{
		if(!g.dataPath)throw Error();
		if(!g.subgraphType){
			let segments=g.dataPath.split("/");
			if(segments.length>2&&segments[segments.length-2]!="metagraphs"){
				g.subgraphType=segments[segments.length-2];
				g.subgraphID=parseInt(segments[segments.length-1]);
				g.wholeGraph=segments.slice(0,segments.length-2).join("/");
			}
		}
	},
	display:async function(graph,options){//if it's displayed in place, don't call this, just load and attach it
		if(typeof graph === 'string' || graph instanceof String) {
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
			this.checkNames(graph);
			if(graph.vertices.layout){
				let layoutOK=true;
				for(let i=0;i<graph.vertices.layout.length;i++){if(!graph.vertices.layout[i]){layoutOK=false;break;;}}
				if(!layoutOK)graph.vertices.removeProperty("layout");
			}
			if(options)Object.assign(graph,options);
			console.log("displaying graph of |V| "+graph.vertices.length+", |E| "+graph.edges.length);
			if(graph.vertices.properties && graph.vertices.properties.waveIDs)
				console.log("displaying graph of |V| "+graph.vertices.properties.waveIDs.value);


			//if(graph.name===undefined){graph.name=toNormalText(graph.datasetID);}
			//else{graph.name=toNormalText(graph.name);}
		}
		if(G.origCloneMaps) {
            arr = graph.vertices.id;
            let origCloneMaps = G.origCloneMaps;
            b ={};
            Object.keys(origCloneMaps).filter((v) => {
                if(arr.indexOf(v.toString())!=-1){ b[v]= origCloneMaps[v];}
            })
            graph.parentLayersMap = b;
        }
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
		
		if(options && options.algorithm){
			await G.controls.algorithms[options.algorithm](graph);
		}
		else {
		    G.broadcast("displayGraph",graph,options);

            //setTimeout(G.broadcast("displayGraph",graph,options), 1000);
            //setInterval(a, 1000,graph,options);
        }
		
	},
	contractVertex:function(vertexID,parentGraph,inPlace){
		if(!parentGraph)parentGraph=G.graph;
		delete parentGraph.vertices.isExpanded[vertexID];
		//parentGraph.vertices[vertexID].isExpanded=false;
		G.view.displayGraph(G.graph);
	},
	expandVertex:function(vertexID,parentGraph,inPlace){
		//let tempDataset=G.graph;
		if(!parentGraph)parentGraph=G.view.graph;
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
				if(!g)throw Error();
				G.preprocessing.loadGraph(g);//todo: remove hack
				parentGraph.vertices.isExpanded[vertexID]=true;
				G.view.displayGraph(G.graph);
			});}//the automatic exploration should not zoom into it
			else{this.load(path,{currentMetagraph:parentGraph.dataPath,metanodeID:vertexID}).then((g)=>{
				if(parentGraph.colorScale){g.colorScale=parentGraph.colorScale;}//todo: need more precise control?
				this.display(g,{currentMetagraph:parentGraph.dataPath,metanodeID:vertexID});
				}).catch(()=>{onExpandFailed()});}
		}
		else{
			if(inPlace){Promise.resolve(parentGraph.expandVertex(vertexID)).then((g)=>{
				g.currentMetagraph=parentGraph;g.metanodeID=vertexID;
				G.preprocessing.loadGraph(g);//todo: remove hack
				parentGraph.vertices.isExpanded[vertexID]=true;
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
		if(typeof g.wholeGraph=="string"){parentPath=g.wholeGraph;}
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
		let target=this.getParent(G.graph);
		if(target){
			//remove the contents of target in the directory tree
			G.display(target);
			console.log("showing metagraph "+target.name);
		}
		else{G.addLog("no available level above this graph");}
	},
	showNextSiblingGraph:function(){
		// use the next sibling function if the graph has one
		if(G.graph.getNextSiblingGraph){
			G.display(G.graph.getNextSiblingGraph());
		}
		else{
			//keep backtracking until we get to a graph that's not auto-expanded; if all parents are auto-expanded, refuse to show.
			let target=this.getParent(G.graph);
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
		if(G.graph.getPreviousSiblingGraph){
			G.display(G.graph.getPreviousSiblingGraph());
		}
		else{
			//keep backtracking until we get to a graph that's not auto-expanded; if all parents are auto-expanded, refuse to show.
			let target=this.getParent(G.graph);
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
		let minimalUI=getQueryVariable("minimalUI");
		let dataPath=getQueryVariable("dataPath");
		let dataURL=getQueryVariable("dataURL");
		//if(minimalUI){return;}//don't show it...
		if(dataPath||dataURL){return;}
		//should only avoid showing this when the URL supplied a dataPath or a dataurl and loading it failed (to not be intrusive when used as an embedded visualization)
		if(datasets)this.datasets=datasets;
        var a=selectE("dataset-menu-1").selectAll("div").data(Object.values(datasets).sort(compareBy("name",true))).enter().append("div").attr("class","a btn btn-secondary btn-sm btn-block").on("click",(data)=>{
            console.log(data.id);
            this.display(data.id);
            getE("graph-dataset-bar").style.display="none";
        });

		r =a.append("div").attr("class","wrap");
		r.append("div").text(function(data){return data.name||toNormalText(data.id)}).attr("class","first");
		r.append("div").attr("class","second").text(function(data){return data.params?(data.info?data.info:""):("|V|:"+data.V+", |E|:"+data.E+" "+(data.info?data.info:""))});
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
	//note: now not usig options like edge start 
	let graph=new Graph();
	
	
	if(typeof etext!="string"){
		graph.loadEdges(vtext,etext);//etext,options
	}
	else{
		if(options.ignoreUnknownVertices){
			graph.loadEdges(etext,options);
			if(vtext)graph.loadVertices(vtext,options);
		}
		else{
			if(vtext)graph.loadVertices(vtext,options);
			graph.loadEdges(etext,options);
		}
		
	}
	return graph;
}




function buildSubgraphsFromText(str){
	let obj;
	try{obj=JSON.parse(str);}catch(e){console.log(e.stack);return;}
	let subgraphs={};
	for(let name in obj){
		if(typeof obj[name]=='string'){
			subgraphs[name]={text:obj[name],name:name};
		}
		else{
			if(typeof obj[name]=='object'){
			let obj2=obj[name];
				for(let name2 in obj2){
					if(typeof obj2[name2]=='string'){
						subgraphs[name+'_'+name2]={text:obj2[name2],name:name+'_'+name2};
					}
				}
			}
		}
	}
	//have to make sure they are in the right order - assuming there's some kind of numeric order
	let pattern=/\d+/;let OK=true;
	for(let name in subgraphs){
		let match=name.match(pattern);
		if(match){subgraphs[name].id=parseInt(match[0]);}
		else{OK=false;}
	}
	let array=Object.values(subgraphs);
	if(OK){array.sort(compareBy((x)=>x.id,true));}
	else{array.forEach((x,index)=>{x.id=index;})}
	
	for(let item of array){
		let subgraph=new Graph();
		subgraph.dataPath='custom/subgraph/'+item.id;
		subgraph.wholeGraph='custom';
		subgraph.subgraphType='subgraph';
		subgraph.datasetID="custom";
		subgraph.name=item.name;
		subgraph.subgraphID=item.id;
		subgraph.loadEdges(item.text);
		subgraph.isCustom=true;
		item.subgraph=subgraph;
	}
	
	let parentGraph=new Graph();parentGraph.dataPath='custom';
	parentGraph.isCustom=true;
	parentGraph.subgraphs={};let ids=array.map(x=>x.id);
	parentGraph.subgraphs.subgraph={fullSummary:array.map(x=>({vertices:x.subgraph.vertices.length,edges:x.subgraph.edges.length,subgraphID:x.id})),min:arrayMin(ids),max:arrayMax(ids),count:array.length,buckets:[],unbucketed:ids};
	
	for(let item of array){
		let subgraph=item.subgraph;
		G.loading.saveGraph(subgraph);
	}
	G.loading.saveGraph(parentGraph);
	
	return {parentGraph:parentGraph,subgraphs:array.map(x=>x.subgraph)};
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
function a(graph,options) {
    G.broadcast("displayGraph",graph,options);
}

/*
let queryVariables={};

function prepareQueryVariables(){
	var query = window.location.search.substring(1);
	var vars = query.split("&");
	for (var i=0;i<vars.length;i++) {
		var pair = vars[i].split("=");
		queryVariables[pair[0]]=pair[1];
	}
}
function getQueryVariable(variable)
{
	if(variable in queryVariables)return queryVariables[variable];
	return undefined;
}
function getQueryVariables(){return queryVariables;}

*/