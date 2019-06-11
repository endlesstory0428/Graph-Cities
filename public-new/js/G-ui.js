let graphInfoElement;

G.addModule("ui",{
	
	init:function(){
		graphInfoElement=document.getElementById("graph-info");
		this.CCTooltipElement=this.makeTooltip("top-level-CC-tooltip");
		let minimalUI=getQueryVariable("minimalUI");
		if(minimalUI){
			this.minimalUI=true;
			getE("top-bar").style.display="none";
			getE("bottom-bar").style.display="none";
			getE("left-panel").style.display="none";
			//getE("right-panel").style.display="none";
			getE("right-panel").style.minWidth="100px";	
			getE("right-panel").classList.add("minimal");	
			//for now show the tools anyway
			getE("minimal-bar").style.display="block";
			
		}
		
	},
	makeTooltip:function(name,parent){
		let e=document.createElement("div");e.classList.add("tooltip");e.id=name;
		if(parent)parent.appendChild(e);
		else document.body.appendChild(e);
		return e;
	},
	showTooltip:function(elem, pos){
		//try to position it within the screen, and make the tooltip contain the mouse position
		if(!pos)pos=G.mouseScreenPos;
		let tipSelection=d3.select(elem);
		let rect=elem.getBoundingClientRect();let w=document.body.clientWidth,h=document.body.clientHeight;
		let offset=15,margin=50;
		let top=pos.y-offset,left=pos.x-offset;
		if(pos.y+rect.height-offset>h-margin){top=h-margin-rect.height;}
		if(pos.y-offset<margin){top=margin;}
		if(pos.x+rect.width-offset>w-margin){left=w-margin-rect.width;}
		if(pos.x-offset<margin){left=margin;}
		tipSelection.style("top",(top)+"px").style("left",(left)+"px");
		tipSelection.style("display","block");
	},
	hideTooltip:function(elem){elem.style.display="none";},
	initHierarchyPathElems:function(graph){
		//hierarchy path elements
		//now, the path is basically teh ame as teh data path, and the old "parent" isn't used - going back and forward is done through the graph history (in cases where the expanded subgraph's natural metagraph is not the last metagraph)
		let parentPath=null,nameText=null; 
		if(graph.metagraph){parentPath=graph.metagraph;nameText=toNormalText(graph.subgraphType)+" "+graph.subgraphID;}
		if(graph.originalGraph){parentPath=graph.originalGraph;nameText=toNormalText(graph.metagraphType)+" metagraph"}
			
		if(!graph.hierarchyPathElem){
			let hierarchyPathElem=getE("hierarchy-path");
			let topLevelSummaryElem=getE("top-level-summary");
			
			graph.hierarchyPathElem=document.createElement("ul");
			graph.hierarchyPathElem.classList.add("hierarchy-path");
			
			graph.hierarchyPathName=document.createElement("p");
			graph.hierarchyPathName.classList.add("hierarchy-path");
			graph.hierarchyPathElem.appendChild(graph.hierarchyPathName);
			
			graph.hierarchyPathContent=document.createElement("li");
			graph.hierarchyPathContent.classList.add("hierarchy-path");
			graph.hierarchyPathElem.appendChild(graph.hierarchyPathContent);
			
			graph.hierarchyPathElem.__obj=graph;
			graph.hierarchyPathName.__obj=graph;
			addHoverListener(graph.hierarchyPathName,()=>G.hoverDelay,()=>{document.getElementById("graph-desc").innerText=G.analytics.getGraphSummary(graph);},()=>{document.getElementById("graph-desc").innerText=G.analytics.getGraphSummary();});
			
			d3.select(graph.hierarchyPathName).on("click",()=>{G.display(graph);});
			
			//let parent=graph.metagraph||graph.originalGraph||graph.wholeGraph;//either the metagraph it's expanded from, or the riginal graph hose metagraph it is, or the containing graph of the subgraph in cases where there is no metagraph (like user-selection subgraphs)
			
			if(parentPath){
				let parent=G.getGraph(parentPath);
				if(!parent.hierarchyPathContent)this.initHierarchyPathElems(parent);
				graph.hierarchyPathName.textContent=nameText;
				while(parent.hierarchyPathContent.childElementCount>0){//remove all existing children of parent
					parent.hierarchyPathContent.removeChild(parent.hierarchyPathContent.firstElementChild);
				}
				parent.hierarchyPathContent.appendChild(graph.hierarchyPathElem);
			}
			else{
				graph.hierarchyPathName.textContent=pathToText(graph.dataPath);
				if(hierarchyPathElem.childElementCount>0){
					hierarchyPathElem.removeChild(hierarchyPathElem.lastChild);//for now only one
				}
				hierarchyPathElem.appendChild(graph.hierarchyPathElem);
			}
		}
		else{
			//since this is the current level in the tree, remove all its element's contents should be only one?
			//and if it's not already a child of its parent's element, add it(maybe it was created but removed before)
			while(graph.hierarchyPathContent.childElementCount>0){
				graph.hierarchyPathContent.removeChild(graph.hierarchyPathContent.firstElementChild);
			}
			if(parentPath){
				let parent=G.getGraph(parentPath);
				parent.hierarchyPathContent.appendChild(graph.hierarchyPathElem);
			}
		}
	},
	graphPathToText(str){//un-Camel case and a few custom names, and break down into global and local (after layer/cc)
		/*let parts=String(str).split("/");
		let global=[],local=[],isLocal=false,layerFound=false,CCFound=false;
		for(let i=0;i<parts.length;i++){
			let part=parts[i];
			let realName=part;
			if(part=="wave2"){realName="wave";}
			if(isLocal){local.push(realName);
			else{global.push(realName);}
			if(realName==
		}*/
		str=str.replaceAll("/"," ");
		str=str.replaceAll("wave2","wave");
		str=str.replace(/layer ([0-9]+) (CC|cc) ([0-9]+)/g,"connected fixed point $3");
		str=str.replace(/layer ([0-9]+)/g,"fixed point $1");
		str=str.replace(/wave ([0-9]+) (CC|cc) ([0-9]+)/g,"wave $1 subwave $3");
		str=str.replace(/waveLevel/g,"fragment");
		str=str.replace(/level/g,"fragment");
		str=str.replace("wave","\nwave");//just one instance
		//str=str.replaceAll("layer","fixed point");
		str= str.replace(/(?<=[a-z])([A-Z/]+)/g, ' $1').replace("_"," ").replace(/^./, function(str){ return str.toUpperCase(); });
		
		return str;
	},
	toCustomText(str){
		str=str.replaceAll("wave2","wave");
		str=str.replaceAll("originalWaveLevel","fragment");
		str=str.replaceAll("waveLevel","fragment");
		return toNormalText(str);
	},
	displayGraph:async function(graph){
		//hide existing labels
		if(G.showingLabels){
			this.showLabels(false);
		}
		
		let realGraph=graph;
		while(graph.representation)graph=G.getGraph(graph.dataPath+"/metagraphs/"+graph.representation);//only use the real displayed top level graph
		this.initHierarchyPathElems(graph);
		getE("graph-desc").innerText=G.analytics.getGraphSummary();
		
		let summaryText="";
		if(graph.heightProperty){
			if(graph.edges[graph.heightProperty]){
				let obj=graph.edges[graph.heightProperty];
				if(obj.max!=undefined&&obj.min!=undefined){
					summaryText=this.toCustomText(graph.heightProperty)+" "+obj.min+" to "+obj.max;
				}
			}
			else if(graph.vertices[graph.heightProperty]){
				let obj=graph.vertices[graph.heightProperty];
				if(obj.max!=undefined&&obj.min!=undefined){
					summaryText=this.toCustomText(graph.heightProperty)+" "+obj.min+" to "+obj.max;
				}
			}
		}
		let title=this.graphPathToText(graph.dataPath);
		if(summaryText)title=title+" ("+summaryText+")";
		getE("minimal-graph-title").innerText=title;
		//getE("minimal-graph-desc").innerText=summaryText;
		//update text descriptions and ribbon
		if(graph.datasetID!=this.topLevelGraphPath){
			this.showTopLevelGraphStats(G.getGraph(graph.datasetID));
			this.topLevelGraphPath=graph.datasetID;
		}
		
		//global partitions: CC and layer markers
		//layers: use the triangle?
		if(graph.globalPartitionInfo&&graph.globalPartitionInfo.layer){
			let l=graph.globalPartitionInfo.layer.value;
			this.ribbonSelection.filter((data)=>data.layer==l).select(".selector").style("visibility","visible");
			this.ribbonSelection.filter((data)=>data.layer!=l).select(".selector").style("visibility","hidden");
		}
		else{this.ribbonSelection.select(".selector").style("visibility","hidden");}
		//ccs: highlight the CC or CC bucket
		if(graph.globalPartitionInfo&&graph.globalPartitionInfo.CC){
			let V=graph.globalPartitionInfo.CC.V,E=graph.globalPartitionInfo.CC.E,str=V+","+E;
			this.ccRects.filter((data)=>data.key==str).select(".selector-bottom").style("visibility","visible");
			this.ccRects.filter((data)=>data.key!=str).select(".selector-bottom").style("visibility","hidden");
		}
		else{this.ccRects.select(".selector-bottom").style("visibility","hidden");}

		
		//list the available metagraphs
		let metagraphs=[];for(let name in realGraph.metagraphs){
			metagraphs.push({type:name,V:realGraph.metagraphs[name].V,E:realGraph.metagraphs[name].E});
		}
		if(metagraphs.length>0){//add option to show original!
			metagraphs.push({type:"(original)",V:realGraph.vertices.length,E:realGraph.edges.length});
		}
		let listElem=getE("graph-metagraph-list");
		d3.select(listElem).selectAll("span").remove();
		d3.select(listElem).selectAll("span").data(metagraphs).enter().append("span");
		d3.select(listElem).selectAll("span").attr("class","metagraph-item").text((d)=>" "+toNormalText(d.type)+" metagraph - |V|: "+d.V+", |E|: "+d.E+" ").on("click",(d)=>{
			if(d.type=="(original)"){realGraph.representation=null;}
			else {realGraph.representation=d.type;}
			G.display(realGraph);
		});
		
	},
	topLevelGraphPath:null,
	showWaveMap:function(){
		this.showWaveMapArcs(G.analytics.getWaveMapRings(G.graph));
	},
	showWaveMapArcs:function(arcs){
		let svg=d3.select("#wavemap");
		svg.selectAll("path").remove();
		svg.selectAll("g").remove();
		let g=svg.append("g").style("transform","translateX(50%) translateY(50%)");
		let waveCount=arcs[0].reverseWave+1;
		let maxRadius=150,centerRadius=20;
		let radiusDelta=Math.min(20,(maxRadius-centerRadius)/(arcs[0].reverseWave+1));
		let startDegree=-Math.PI/2;
		let currentWave=-1,degree=startDegree;
		for(let arc of arcs){
			let str="";
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
			arc.str="M "+x1+" "+y1+" "+"A "+realRadius+" "+realRadius+" "+"0 "+((degreeDelta>Math.PI)?"1":"0") +" 1 "+x2+" "+y2;
			//seems sweep needs to be 1 here
			degree+=degreeDelta+gapDegree/arc.waveCCCount;
		}
		let path=g.selectAll("path").data(arcs).enter().append("path").attr("d",(d)=>d.str).attr("stroke",(d)=>d.color).attr("fill","none").attr("stroke-width",(d)=>Math.max(1.5,Math.min(1+(d.levelCount-1)*2,(d.levelCount/d.maxLevelCount)*radiusDelta*0.9)));
		selectE("wavemap-menu").style("display","block");
		
		G.view.refreshStyles(true,true);
	},
	
	showTopLevelGraphStats:function(graph){
		let topLevelName=(graph.name);let topLevelSummary="";
		let V=graph.vertices.length,E=graph.edges.length;
		if(V){topLevelSummary+=" |V|:"+V;}
		if(E){topLevelSummary+=", |E|:"+E;}
		getE("top-level-graph-name").textContent=topLevelName;
		getE("top-level-summary").textContent=topLevelSummary;
		
		d3.json("datasets/"+graph.dataPath+"/image").then((data)=>{//actually a JSON encoded string that encodes the image
			if(data)getE("overview-image").src=data;
			else{getE("overview-image").src="images/blank.png"}
		});
		
		
		let container=d3.select("#top-level-summary-area");
		let ccSvg=d3.select("#top-level-cc-plot");
		let ccSvg2=d3.select("#top-level-cc-plot2");
		let ccRibbon=d3.select("#top-level-cc-ribbon-area");
		
			
		let vdist=graph.subgraphs.CC.Vdist;let edist=graph.subgraphs.CC.Edist;let vedist=graph.subgraphs.CC.VEdist;
		let vedistIDs=graph.subgraphs.CC.VEdistIDs;
		let VERecords=Object.keys(vedist).map((str)=>{let [v,e]=str.split(","),count=vedist[str];v=Number(v),e=Number(e);return {key:str,v:v,e:e,avgDeg:2*e/v,count:count,totalV:v*count,totalE:e*count};}).sort(compareBy("e")).sort(compareBy("v"));
		let maxAvgDeg=Math.max.apply(null,VERecords.map((x)=>x.avgDeg));
		ccRibbon.selectAll("p").remove();
		let ccRects=ccRibbon.selectAll("p").data(VERecords).enter().append("p");
		ccRects.attr("class","bar-segment").style("color","black").style("background-color",(x)=>G.colorScales.lightSpectral(x.e/E)).style("height",(x)=>Math.ceil(x.avgDeg*100/maxAvgDeg)+"%").style("width",(x)=>Math.ceil(x.e*100/E)+"%" )/*.style("flex",(x)=>x.e/E+" 0 0")*/.text((x)=>{if(x.count==1&&(x.v>50||x.v>Math.log(V)))return "CC with |V|:"+x.v+", |E|:"+x.e;return x.count;});
		//right now, only clicking a bucket with one unbucketed CC can display that CC; later we'll be able to open bucketed CCs
		ccRects.on("click",(d)=>{
			d3.event.stopPropagation();
			if(d.key in vedistIDs&&vedistIDs[d.key].length==1){
				let ccpath=graph.dataPath+"/cc/"+vedistIDs[d.key][0];
				if(G.graph.dataPath==ccpath){G.display(graph.dataPath);}
				else{G.display(ccpath);}
			}
			else{G.addLog("please select a single large CC");}
		});
		ccRects.append("span").attr("class","selector-bottom").text("\u25B2").style("color","white").style("visibility","hidden");
		this.ccRects=ccRects;
		let hoverOnCC=(obj)=>{
			let data=obj.__data__;
			let tip=this.CCTooltipElement;
			let tipSelection=d3.select(tip);
			let str=((data.count==1)?"CC ":(data.count+" CCs"))+", |V|: "+data.v+", |E|: "+data.e;
			tipSelection.text(str);
			this.showTooltip(tip);
			//v and e distributions
		}
		let hoverEndCC=()=>{
			this.hideTooltip(this.CCTooltipElement);
		}
		addHoverListener(ccRects.nodes(),()=>G.hoverDelay,hoverOnCC,hoverEndCC);
		//tipSelection.on("mouseout",hoverEnd);
		
		//ccSvg.style("display","");ccSvg2.style("display","");
		//drawPlot("CC |V|","count",Object.keys(vdist),Object.values(vdist),ccSvg,190,50);
		//drawPlot("CC |E|","count",Object.keys(edist),Object.values(edist),ccSvg2,190,50);
		
		/*
		let totalCCs=Object.values(vdist).reduce((a,b)=>a+b,0);
		topLevelSummary="";
		if(V){topLevelSummary+=" |V|:"+V;}
		if(E){topLevelSummary+=", |E|:"+E;}
		if(totalCCs){topLevelSummary+=", CCs:"+totalCCs;}
		getE("top-level-summary").textContent=topLevelSummary;
		
		let CCEdgeBuckets=[];
		let CCSizes=Object.keys(edist).map((x)=>Number(x)).sort(compareBy((x=>x)));
		let bucketSize=Math.pow(2,Math.ceil(Math.log(E)/(2*Math.log(2)))); //next power of 2 from sqrt(E)
		let buckets=bucketizeArray(CCSizes,(s)=>edist[s]*s,bucketSize);//Math.pow(2,Math.sqrt(V)) ??
		
		let bucketsArea=getE("top-level-cc-buckets-area");
		d3.select(bucketsArea).selectAll("div").remove();
		d3.select(bucketsArea).selectAll("div").data(buckets).enter().append("div").style("flex",(bucket)=>Math.floor(bucket.totalSize*100/E)+" 0 auto").style("text-align","center").style("border",(bucket)=>"1px solid "+colorScale(bucket.totalSize/E)).text((bucket)=>(bucket.length==1)?("CC with "+bucket.totalSize+" edges"):(bucket.length+" CCs, "+bucket.totalSize+" total edges")).on("click",(bucket)=>{
			if(bucket.length>1){G.addLog("please select a single CC instead");return;}
			else{G.loading.showCC(graph.id,0);}
		
		});
		*/
		
		//todo: get the correct CCID - the distribution doesn't abe individual CC identifers.
		//.style("background-color",(bucket)=>colorScale(bucket.totalSize/E))
		//style("display","inline-flex").
		//});
		
	
		//layer ribbons
		let layersArray=[];	
		let maxCount=0;
		for(let l in graph.layerCCSummary){
			let obj={layer:l,V:graph.layerCCSummary[l].V,E:graph.layerCCSummary[l].E};
			Object.assign(obj,graph.layerCCSummary[l]);
			layersArray.push(obj);
			if(graph.layerCCSummary[l].E>maxCount)maxCount=graph.layerCCSummary[l].E;
			if(graph.layerCCSummary[l].V>maxCount)maxCount=graph.layerCCSummary[l].V;
		}
		
		layersArray.sort(compareBy((x)=>Number(x.layer)));
		
		for(let i=1;i<layersArray.length;i++){
			layersArray[i].upperGap=Math.abs(layersArray[i].layer-layersArray[i-1].layer);
		}
		if(layersArray.length==0)return;
		
		
		let xLinear = d3.scaleLinear().domain([0, maxCount]).range([0, 1]);
		let xLog = d3.scaleLog().domain([0, maxCount]).range([0, 1])
		
		let ribbonMenuSelection=d3.select("#ribbon-menu-contents");
		ribbonMenuSelection.selectAll("div").remove();
		let ribbonSelection=ribbonMenuSelection.selectAll("div").data(layersArray).enter().append("div").attr("class","ribbon").style("margin-top",(d)=>Math.floor(Math.log(Math.max(d.upperGap,1))*20+2)+"px").on("click",(d)=>{
			
			if(G.graph.dataPath==graph.dataPath+"/layer/"+d.layer){
				//displaying this layer; show top level instead

				G.display(graph);return;
			}
			
			else{
				//show CCs if it's too large?
				G.display(graph.dataPath+"/layer/"+d.layer);
			}
		});
		this.ribbonSelection=ribbonSelection;
		/*.on("contextmenu",(d)=>{
			d3.event.stopPropagation();
			d3.event.preventDefault();
			G.toggleActiveLayer(d.layer);
			
		});*/
		function scaleDensityValue(density){return (density==0)?0:(0.8*density+0.15);}
		function getRGBFromDensity(density){let value=scaleDensityValue(density)*255;return "rgb("+value+","+value+","+value+")";}
		function getRGBAFromDensity(density){
			//let value=scaleDensityValue(density)*255;
			let value=128;
			return "rgba("+value+","+value+","+value+","+scaleDensityValue(density)+")";
		}
		ribbonSelection.append("span").attr("class","selector").text("\u25C0").style("visibility","hidden");//"\u25BA" //was rightward
		ribbonSelection.append("span").attr("class","layer-number").text((d)=>d.layer);
		let barContainerSelection=ribbonSelection.append("div").attr("class","layer-bar-container");
		barContainerSelection.append("span").attr("class","layer-edge-bar").text(" ").style("width",(d)=>Math.floor(xLinear(d.E)*100)+"%").style("background-image",(d)=>{
			let edgeDetails=d.Edist;
			let ccRegions=[];
			for(let e in edgeDetails){
				ccRegions.push({e:Number(e),totalE:Number(e)*edgeDetails[e],count:edgeDetails[e]});
			}
			ccRegions.sort(compareBy((x)=>Number(x.e)));
			let total=0,maxDensity=0;
			for(let r of ccRegions){
				total+=r.totalE;
				r.cumulativeE=total;
				r.density=r.count/r.totalE;
				if(r.density>maxDensity){maxDensity=r.density;}
			}
			let layerE=d.E;
			let str="linear-gradient(to right, #fff 0%, "+ccRegions.map((d)=>getRGBFromDensity(d.density/maxDensity)+" "+Math.floor(d.cumulativeE*100/layerE)+"% , "+"rgb(128,128,128) "+Math.floor(d.cumulativeE*100/layerE)+"%" ).join(",")+")";
			return str;
		});
		barContainerSelection.append("span").attr("class","layer-vertex-bar").text(" ").style("width",(d)=>Math.floor(xLinear(d.V)*100)+"%");
		//barContainerSelection.append("span").attr("class","layer-clones-bar").text(" ").style("left",(d)=>Math.floor(xLinear(d.nodesWithClones)*100)+"%");
		ribbonSelection.append("span").attr("class","layer-cc-count").text((d)=>d.count);

		
		ribbonHoverDelay=300;
		function hoverOnRibbon(obj){
			let data=obj.__data__;
			let tip=getE("ribbon-tooltip");
			let tipSelection=d3.select(tip);
			let str="Layer "+data.layer+", |V|: "+data.V+", |E|: "+data.E+", CC count:  "+data.count;
			/*let buckets=data.ccBuckets,maxBucketSize=Math.max.apply(this,buckets);
			let rect=obj.getBoundingClientRect();
			if(rect.y+rect.height>G.view.canvasHeight-350){
				tipSelection.style("bottom",(G.view.canvasHeight-(rect.y+rect.height))+"px").style("top","");
			}
			else{
				tipSelection.style("top",(rect.y+rect.height)+"px").style("bottom","");
			}
			tipSelection.style("display","block").style("left",(rect.x+rect.width)+"px");
			tipSelection.select("#ribbon-description").text(str);
			tipSelection.select("#ribbon-histogram").selectAll("p").remove();
			tipSelection.select("#ribbon-histogram").selectAll("p").data(buckets).enter().append("p").text((data)=>data).attr("class","histogram").style("height",(d)=>Math.floor(d*30/maxBucketSize)+"px");
			*/
			tipSelection.select("#ribbon-description").text(str);
			//v and e distributions
			let vDist=Object.keys(data.Vdist),vDistValues=vDist.map((x)=>data.Vdist[x]);
			let eDist=Object.keys(data.Edist),eDistValues=eDist.map((x)=>data.Edist[x]);
			let svg1=tipSelection.select("#ribbon-vertex-dist");
			let svg2=tipSelection.select("#ribbon-edge-dist");
			drawPlot("vertices","count",vDist,vDistValues,svg1,190,90);
			drawPlot("edges","count",eDist,eDistValues,svg2,190,90);
			
			G.ui.showTooltip(tip);
		}
		function hoverEnd(){
			let tip=getE("ribbon-tooltip");
			tip.style.display="none";
		}
		//function hoverEnd(){if ((G.graph) && (G.onhover))G.onhover(null);}
		addHoverListener(ribbonSelection.nodes(),()=>G.hoverDelay*2,hoverOnRibbon,hoverEnd);//it often shows up when I don't wnat it to
		let tip=getE("ribbon-tooltip");
		let tipSelection=d3.select(tip);
		tipSelection.on("mouseout",hoverEnd);
		
		//scale
		let firstRibbonRect=ribbonSelection.select(".layer-bar-container").node().getBoundingClientRect();
		svgWidth=firstRibbonRect.width;
		xLinear.range([0,svgWidth]);xLog.range([0,svgWidth]);
		let ribbonscaleSelection=d3.select("#ribbon-scale");
		ribbonscaleSelection.attr("width",svgWidth).attr("height",30);
		ribbonscaleSelection.selectAll("g").remove();
		let newScale=ribbonscaleSelection.append("g").attr("transform","translate ("+firstRibbonRect.left+",25)");
		newScale.call(d3.axisTop(xLinear).ticks(2,".0s"));//use SI units like M, avoid many zeroes
		
		//add grid?
		
	},
	
	animateFrame:function(){
		//logs
		var logElem=G.logElem;logs=logElem.children,time=new Date().getTime();
		for(var i =0;i<logs.length;i++){if((time-logs[i].createTime)>2000){logs[i].style.display="none";}}
		var lastlog=logElem.lastElementChild;
		if(lastlog&&(lastlog.style.display=="none")){logElem.removeChild(lastlog);}
		
		//labels
		
		if(G.graph&&(G.showingLabels)&&this.cachedLabelSelection){
			let positions=G.view.getVerticesScreenPos();
			//let chosenOnes=this.cachedLabeledVertices;//let texts=this.cachedLabelTexts;
			let selection=this.cachedLabelSelection;
			selection.style("left",(i)=>(positions[i].x+1)*100/2+"%").style("top",(i)=>(1-positions[i].y)*100/2+"%");
		}
	},
	
	switchStyle:function switchStyle(bright=true){
	 var el1 = getE('style-light'),el2 = getE('style-dark');
	  if(bright) {
		el1.disabled = false;
		el2.disabled = true;
	  } 
	  else {
		el1.disabled = true;
		el2.disabled = false;
	  }	
	},
	needsResume:false,
	showLabels:function(){
		if(G.graph&&(!G.showingLabels)){
			if(G.simulationRunning){G.simulationRunning=false;this.needsResume=true;}
			G.showingLabels=true;
			//for now, get one vertex in each of many rectangles on the screen?
			let positions=G.view.getVerticesScreenPos();
			let chosenOnes=[];let xGap=0.3,yGap=0.2;let maxItems=20;
			if(this.minimalUI){xGap=0.4;yGap=0.4;maxItems=10;}
			this.cachedLabeledVertices=chosenOnes;
			for(let i=0;i<positions.length;i++){
				let pos=positions[i];
				let OK=true;
				for(let otherID of chosenOnes){
					let otherPos=positions[otherID];
					if(Math.abs(otherPos.x-pos.x)<xGap&&Math.abs(otherPos.y-pos.y)<yGap){OK=false;break;}
				}
				if(OK){chosenOnes.push(i);if(chosenOnes.length>=maxItems){break;}}
			}
			let labelContainerSelection=d3.select("#label-container");
			labelContainerSelection.selectAll("div").remove();
			this.getSemantics(chosenOnes).then((texts)=>{
				let validOnes=[],validTexts=[];
				for(let i=0;i<chosenOnes.length;i++){if(texts[i]){validOnes.push(chosenOnes[i]);validTexts.push(texts[i]);}}
				if(validOnes.length!=chosenOnes.length)console.log("chosen "+chosenOnes.length+", retrieved "+validOnes.length+" labels");
				let labelSelection=labelContainerSelection.selectAll("div").data(validOnes).enter().append("div");
				this.cachedLabelSelection=labelSelection;
				labelSelection.attr("class","graph-label").style("left",(i)=>(positions[i].x+1)*100/2+"%").style("top",(i)=>(1-positions[i].y)*100/2+"%").text((i,index)=>validTexts[index]);
			});
			
		}
		else{
			if(this.needsResume){G.simulationRunning=true;this.needsResume=false;}
			G.showingLabels=false;
			let labelSelection=d3.select("#label-container");
			labelSelection.selectAll("div").remove();
		}
	},
	getSemantics:function(chosenOnes){
		let datasetID=G.graph.datasetID;
		return new Promise((resolve,reject)=>{
			let idString=G.analytics.getVertexIDsString(chosenOnes);
			if(G.analytics.datasetIDMaps[datasetID]){
				if(G.analytics.datasetIDMaps[datasetID].idMap){
					try{d3.json("datasetIDMaps/"+datasetID+"/"+idString).then((d)=>{
					if(d&&d.length>0){
						let ids=d.join(",");
						if(G.analytics.datasetIDMaps[datasetID].func){resolve(G.analytics.datasetIDMaps[datasetID].func(ids));}
						else resolve(d);
					}
					else{resolve(idString.split(","));}
					});
					}
					catch(e){resolve(idString.split(","));}
				}
				else{
					//no extra id map
					if(G.analytics.datasetIDMaps[datasetID].func){resolve(G.analytics.datasetIDMaps[datasetID].func(idString));}
					else{resolve(idString.split(","));}
				}
			}
			else{
				resolve(idString.split(","));
			}
		});
	},
	showSemanticsText:function(){
		let datasetID=G.graph.datasetID;
		if(G.graph&&(!G.showingSelectedIDs)){
			G.showingSelectedIDs=true;getE("selected-vertices-ids").style.display="block";
			
			if(G.analytics.datasetIDMaps[datasetID]){
				
				if(G.analytics.datasetIDMaps[datasetID].idMap){
					try{d3.json("datasetIDMaps/"+datasetID+"/"+G.analytics.getVertexIDsString()).then((d)=>{
					if(d&&d.length>0){
						let ids=d.join(",");
						getE("selected-vertices-ids-content").value=ids;
						if(G.analytics.datasetIDMaps[datasetID].func){G.analytics.datasetIDMaps[datasetID].func(ids);}
						
					}
					else{getE("selected-vertices-ids-content").value=G.analytics.getVertexIDsString();}
					});
					}
					catch(e){getE("selected-vertices-ids-content").value=G.analytics.getVertexIDsString();}
				}
				else{
					//no extra id map
					getE("selected-vertices-ids-content").value=G.analytics.getVertexIDsString();
					if(G.analytics.datasetIDMaps[datasetID].func){G.analytics.datasetIDMaps[datasetID].func(G.analytics.getVertexIDsString());}
				}
				
			}
			else{
				getE("selected-vertices-ids-content").value=G.analytics.getVertexIDsString();
			}
			
		}
		else{
			//hide on second press
			if(G.showingSelectedIDs){G.showingSelectedIDs=false;getE("selected-vertices-ids").style.display="none";}
		}
	},
	
	
	
	//this module should manage information on the UI, like tables and descriptions, not controls and gestures.
	showEdgeListMenu:function(str){
		getE("edge-list-menu").style.display="block";
	}
	
});
function drawPlot(xName,yName,xValues,yValues,svgSelection,totalWidth,totalHeight){

	var margin = {top: 3, right: 25, bottom: 20, left: 25},
	width = totalWidth - margin.left - margin.right,
	height = totalHeight - margin.top - margin.bottom;

	//var xValue = function(d) { return d.Calories;}, // data -> value
	let xScale = d3.scaleLinear().range([0, width]); // value -> display
	
	let xAxis = d3.axisBottom().scale(xScale).ticks(3,".0s");

	// setup y
	//var yValue = function(d) { return d["Protein (g)"];}, // data -> value
	yScale = d3.scaleLinear().range([height, 0]), // value -> display
	//yMap = function(d) { return yScale(yValue(d));}, // data -> display
	yAxis = d3.axisLeft().scale(yScale).ticks(2,".0s");


	svgSelection.selectAll("g").remove();
	let topSelection=svgSelection.append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");


	// don't want dots overlapping axis, so add in buffer to data domain
	//xScale.domain([Math.max(Math.min.apply(null,xValues),2)-1, Math.max(Math.max.apply(null,xValues),2)+1]);
	xScale.domain([Math.min.apply(null,xValues)-1, Math.max.apply(null,xValues)+1]);
	yScale.domain([Math.min.apply(null,yValues)-1, Math.max.apply(null,yValues)+1]);

	// x-axis
	topSelection.append("g")
	.attr("class", "x axis")
	.attr("transform", "translate(0," + height + ")")
	.call(xAxis)
	.append("text")
	.attr("class", "label")
	.attr("x", width)
	.attr("y", -6)
	.style("text-anchor", "end")
	.text(xName);

	// y-axis
	topSelection.append("g")
	.attr("class", "y axis")
	.call(yAxis)
	.append("text")
	.attr("class", "label")
	.attr("transform", "rotate(-90)")
	.attr("y", 6)
	.attr("dy", ".71em")
	.style("text-anchor", "end")
	.text(yName);

	// draw dots
	topSelection.selectAll(".dot")
	.data(xValues)
	.enter().append("circle")
	.attr("class", "dot")
	.attr("r", 3.5)
	.attr("cx", (d,i)=>xScale(d))
	.attr("cy", (d,i)=>yScale(yValues[i]))
	.style("fill","#000"); //function(d) { return color(cValue(d));}) 
	
}




