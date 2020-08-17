//let graphInfoElement;
class Markers {
    constructor() {
        this.containerSelection = d3.select(document.body).append("div").attr("class", "canvas-marker-container simple fixed").style("visibility", "hidden");
		this.visible = false;
		this.markerClass = "graph-label";
		this.viewportOnly = true;
	}

	show(input) {
		if (!G.graph) {
			//if(G.ui.needsResume){G.simulationRunning=true;G.ui.needsResume=false;}
			this.visible = false;
			this.containerSelection.style("visibility", "hidden")
			//this.containerSelection.selectAll("div").remove();
		} else {
			this.visible = !this.visible;
			if (typeof input != "undefined") this.visible = input;
			if (this.visible) {
				if (G.simulationRunning) {
					G.simulationRunning = false;
					G.ui.needsResume = true;
				}
				this.visible = true;
				this.containerSelection.style("visibility", "");
				this.containerSelection.selectAll("div").remove();


			} else {
				if (G.ui.needsResume) {
					G.simulationRunning = true;
					G.ui.needsResume = false;
                    G.view.graph.highlightPath = [];
				}
				this.visible = false;
				this.containerSelection.style("visibility", "hidden")
				this.containerSelection.selectAll("div").remove();
			}
			return this.visible;
		}
	}

	hide() {
		if (G.ui.needsResume) {
			G.simulationRunning = true;
			G.ui.needsResume = false;
		}
		this.visible = false;
		this.containerSelection.selectAll("div").remove();
	}
}

class VertexMarkers extends Markers {
	constructor() {
		super();
	}

	updatePosition(positions) {

		//let chosenOnes=this.cachedLabeledVertices;//let texts=this.cachedLabelTexts;
		let selection = this.selection;
		if (this.from == "left") {
			selection.style("right", (i) => (1 - positions[i].x) * 100 / 2 + "%");
		} else {
			selection.style("left", (i) => (positions[i].x + 1) * 100 / 2 + "%");
		}
		selection.style("top", (i) => (1 - positions[i].y) * 100 / 2 + "%");
	}

	updateSelection() {
		//updates the selection, ensuring that no matter how many objects are chosen, the markers don't gte too dense. randomly choosing markers within the viewport that are spaced apart with existing markers, and keep existing markers in the selection as long as they are not too dense or outside of the viewport.
		//for now, get one vertex in each of many rectangles on the screen?
		let positions = G.view.getVerticesScreenPos();
		let chosenOnes = [];
		let xGap = 0.3, yGap = 0.2;
		let maxItems = 20;
		if (G.ui.minimalUI) {
			xGap = 0.4;
			yGap = 0.4;
			maxItems = 10;
		}
		let tryAdding = (i) => {
			let pos = positions[i];
			if (this.viewportOnly && (pos.y < -1 || pos.x < -1 || pos.x > 1 || pos.y > 1)) {
				return;
			}
			let OK = true;
			for (let otherID of chosenOnes) {
				let otherPos = positions[otherID];
				if (Math.abs(otherPos.x - pos.x) < xGap && Math.abs(otherPos.y - pos.y) < yGap) {
					OK = false;
					break;
				}
			}
			if (OK) {
				chosenOnes.push(i);
			}
		}
		if (this.cachedMarkedVertices) {
			for (let i of Object.values(G.view.graph.vertexMap)) {
				if (chosenOnes.length >= maxItems) {
					break;
				}
				if ((typeof this.chosenVertices == "object") && ((i in this.chosenVertices) == false)) continue;
				tryAdding(i);
			}
		}
		this.cachedMarkedVertices = chosenOnes;
		if (typeof this.chosenVertices == "object") {
			for (let i in Object.values(G.view.graph.vertexMap)) {
				if (chosenOnes.length >= maxItems) {
					break;
				}
				tryAdding(i);
			}
		} else {//if (this.chosenVertices=="*")
			for (let i = 0; i < positions.length; i++) {
				if (chosenOnes.length >= maxItems) {
					break;
				}
				tryAdding(i);
			}
		}

	}

	show(bool, chosenOnes = undefined) {
		let result = super.show(bool);
		if (result) {

			let positions = G.view.getVerticesScreenPos();
			this.updateSelection();
			this.containerSelection.selectAll("div").remove();

			if(!chosenOnes && G.view.graph.snPaths) {
                chosenOnes = Object.keys(G.view.graph.snVertexPaths);
            } else if(!chosenOnes){
                chosenOnes = Object.values(G.view.graph.vertexMap);
            }



			Promise.resolve(this.getLabels(chosenOnes)).then((texts) => {
				let validOnes = [], validTexts = [];
				for (let i = 0; i < chosenOnes.length; i++) {
					if (texts[i]) {
						validOnes.push(chosenOnes[i]);
						validTexts.push(texts[i]);
					}
				}
				if (validOnes.length != chosenOnes.length) console.log("chosen " + chosenOnes.length + ", retrieved " + validOnes.length + " labels");
				this.selection = this.containerSelection.selectAll("div").data(validOnes).enter().append("div").text((x, i) => validTexts[i]);
				this.selection.attr("class", this.markerClass);
				this.updatePosition(positions);
			});
			//getLabels can return a promise or not
		}
	}
}

class RegionMarkers extends Markers {
	constructor() {
		super();
		this.markerClass = "region-marker";
	}

	updatePosition(positions) {
		//region markers are associated with array or map data, and the region should include each vertex in the array or map.
		let selection = this.selection;
		//default regions are rectangles

		selection.style("top", (data) => arrayMin(data.map((i) => (1 - positions[i].y) * 100 / 2)) - (500 / G.view.canvasHeight) + "%")
			.style("bottom", (data) => arrayMin(data.map((i) => (positions[i].y + 1) * 100 / 2)) - (500 / G.view.canvasHeight) + "%")
			.style("left", (data) => arrayMin(data.map((i) => (positions[i].x + 1) * 100 / 2)) - (500 / G.view.canvasWidth) + "%")
			.style("right", (data) => arrayMin(data.map((i) => (1 - positions[i].x) * 100 / 2)) - (500 / G.view.canvasWidth) + "%");
	}

	updateSelection() {
		//updates the selection, ensuring that no matter how many objects are chosen, the markers don't get too dense. randomly choosing markers within the viewport that are spaced apart with existing markers, and keep existing markers in the selection as long as they are not too dense or outside of the viewport.
		//if there's only one region to show, it doesn't matter. If there are many, maybe avoid showing too many of them?

		//for now, show all regions?
		//todo: arrows
		let positions = G.view.getVerticesScreenPos();
		let chosenOnes = [];
		let xGap = 0.3, yGap = 0.2;
		let maxItems = 20;
		if (G.ui.minimalUI) {
			xGap = 0.4;
			yGap = 0.4;
			maxItems = 10;
		}


		this.cachedMarkedVertexSets = chosenOnes;
		if (typeof this.chosenVertices == "object") {
			if (Array.isArray(this.chosenVertices)) {
				//just one set
				chosenOnes.push(this.chosenVertices);
			} else {
				let setMap = {};
				for (let i in this.chosenVertices) {
					let setID = this.chosenVertices[i];
					if (!setMap[setID]) {
						setMap[setID] = [];
						setMap[setID].id = setID;
					}
					setMap[setID].push(i);
				}
				for (let key in setMap) {
					chosenOnes.push(setMap[key]);
				}
			}

		} else {
			throw Error("regions need sets of vertices");
		}

	}

	show(bool) {
		let result = super.show(bool);
		if (result) {
			let positions = G.view.getVerticesScreenPos();
			this.updateSelection();
			this.containerSelection.selectAll("div").remove();
			let chosenOnes = this.cachedMarkedVertexSets;

			//for regions there's no promise of metadata to wait on
			this.selection = this.containerSelection.selectAll("div").data(chosenOnes).enter().append("div");
			this.selection.attr("class", this.markerClass);
			this.updatePosition(positions);

		}
	}
}

G.addModule("ui", {

	init: function () {
		let graphInfoElement = document.getElementById("graph-info");
		this.CCTooltipElement = this.makeTooltip("top-level-CC-tooltip");
		let minimalUI = G.getQueryVariable("minimalUI");
		if (minimalUI) {
			this.minimalUI = true;
			getE("top-bar").style.display = "none";
			getE("bottom-bar").style.display = "none";
			getE("left-panel").style.display = "none";
			//getE("right-panel").style.display="none";
			getE("right-panel").style.minWidth = "100px";
			getE("right-panel").classList.add("minimal");
			//for now show the tools anyway
			getE("minimal-bar").style.display = "block";

		}

	},
	makeTooltip: function (name, parent) {
		let e = document.createElement("div");
		e.classList.add("tooltip");
		e.id = name;
		if (parent) parent.appendChild(e);
		else document.body.appendChild(e);
		return e;
	},
	showTooltip: function (elem, pos) {
		//try to position it within the screen, and make the tooltip contain the mouse position
		if (!pos) pos = G.mouseScreenPos;
		let tipSelection = d3.select(elem);
		let rect = elem.getBoundingClientRect();
		let w = document.body.clientWidth, h = document.body.clientHeight;
		let offset = 15, margin = 50;
		let top = pos.y - offset, left = pos.x - offset;
		if (pos.y + rect.height - offset > h - margin) {
			top = h - margin - rect.height;
		}
		if (pos.y - offset < margin) {
			top = margin;
		}
		if (pos.x + rect.width - offset > w - margin) {
			left = w - margin - rect.width;
		}
		if (pos.x - offset < margin) {
			left = margin;
		}
		tipSelection.style("top", (top) + "px").style("left", (left) + "px");
		tipSelection.style("display", "block");
	},
	hideTooltip: function (elem) {
		elem.style.display = "none";
	},
	initHierarchyPathElems: function (graph) {
		//hierarchy path elements
		//now, the path is basically teh ame as teh data path, and the old "parent" isn't used - going back and forward is done through the graph history (in cases where the expanded subgraph's natural metagraph is not the last metagraph)
		let parentPath = null, nameText = null;
		if (graph.metagraph) {
			parentPath = graph.metagraph;
			nameText = toNormalText(graph.subgraphType) + " " + graph.subgraphID;
		}
		if (graph.originalGraph) {
			parentPath = graph.originalGraph;
			nameText = toNormalText(graph.metagraphType) + " metagraph";
		}
		if (graph.wholeGraph) {
			parentPath = graph.wholeGraph;
			nameText = toNormalText(graph.subgraphType) + " " + graph.subgraphID;
		}

		if (!graph.hierarchyPathElem) {
			let hierarchyPathElem = getE("hierarchy-path");
			let topLevelSummaryElem = getE("top-level-summary");

			graph.hierarchyPathElem = document.createElement("ul");
			graph.hierarchyPathElem.classList.add("hierarchy-path");

			graph.hierarchyPathName = document.createElement("p");
			graph.hierarchyPathName.classList.add("hierarchy-path");
			graph.hierarchyPathElem.appendChild(graph.hierarchyPathName);

			graph.hierarchyPathContent = document.createElement("li");
			graph.hierarchyPathContent.classList.add("hierarchy-path");
			graph.hierarchyPathElem.appendChild(graph.hierarchyPathContent);

			graph.hierarchyPathElem.__obj = graph;
			graph.hierarchyPathName.__obj = graph;
			addHoverListener(graph.hierarchyPathName, () => G.hoverDelay, () => {
				document.getElementById("graph-desc").innerText = G.analytics.getGraphSummary(graph);

			}, () => {
				document.getElementById("graph-desc").innerText = G.analytics.getGraphSummary();
			});

			d3.select(graph.hierarchyPathName).on("click", () => {
				G.display(graph);
			});

			//let parent=graph.metagraph||graph.originalGraph||graph.wholeGraph;//either the metagraph it's expanded from, or the riginal graph hose metagraph it is, or the containing graph of the subgraph in cases where there is no metagraph (like user-selection subgraphs)

			if (parentPath && G.hasGraph(parentPath)) {
				//if(G.loading.hasGraph(graph.datasetID))
				let parent = G.getGraph(parentPath);
				if (!parent.hierarchyPathContent) this.initHierarchyPathElems(parent);
				graph.hierarchyPathName.textContent = nameText;
				if(parent.hierarchyPathContent) {
					while (parent.hierarchyPathContent.childElementCount > 0) {//remove all existing children of parent
						parent.hierarchyPathContent.removeChild(parent.hierarchyPathContent.firstElementChild);
					}
					parent.hierarchyPathContent.appendChild(graph.hierarchyPathElem);

				}

			} else {
				graph.hierarchyPathName.textContent = pathToText(graph.dataPath);
				if (hierarchyPathElem.childElementCount > 0) {
					hierarchyPathElem.removeChild(hierarchyPathElem.lastChild);//for now only one
				}
				hierarchyPathElem.appendChild(graph.hierarchyPathElem);
			}
		} else {
			//since this is the current level in the tree, remove all its element's contents should be only one?
			//and if it's not already a child of its parent's element, add it(maybe it was created but removed before)
			while (graph.hierarchyPathContent.childElementCount > 0) {
				graph.hierarchyPathContent.removeChild(graph.hierarchyPathContent.firstElementChild);
			}
			if (parentPath && G.hasGraph(parentPath)) {
				let parent = G.getGraph(parentPath);
				if(parent.hierarchyPathContent) {
					while (parent.hierarchyPathContent.childElementCount > 0) {//also remove current children in the parent's element - they may exist because of expansion via another path, like graph -> subgraph -> metagraph
						parent.hierarchyPathContent.removeChild(parent.hierarchyPathContent.firstElementChild);
					}
					parent.hierarchyPathContent.appendChild(graph.hierarchyPathElem);


				}
			}
		}
	},
	graphPathToText(str) {//un-Camel case and a few custom names, and break down into global and local (after layer/cc)
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
		str = str.replaceAll("/", " ");
		str = str.replaceAll("wave2", "wave");
		str = str.replace(/DAGCover ([0-9]+) metagraphs \w+(CC|cc)/g, "DAGCover metagraph");
		str = str.replace(/layer ([0-9]+) (CC|cc) ([0-9]+)/g, "conn. FP $1");
		str = str.replace(/layer ([0-9]+)/g, "fixed point $1");
		str = str.replace(/wave ([0-9]+) (CC|cc) ([0-9]+)/g, "wave $1 subwave $3");
		str = str.replace(/waveLevel/g, "fragment");
		str = str.replace(/level/g, "fragment");
		str = str.replace(/metagraphs/g, "metagraph of");
		//str=str.replace("wave","\nwave");//just one instance
		str = str.replace("subwave", "\nsubwave");//just one instance; line break before subwave to align with the trapezoids
		//str=str.replaceAll("layer","fixed point");
		str = str.replace(/([a-z])([A-Z/]+)/g, '$1 $2').replace("_", " ").replace(/^./, function (str) {
			return str.toUpperCase();
		});

		return str;
	},
	toCustomText(str) {
		str = str.replaceAll("wave2", "wave");
		str = str.replaceAll("originalWaveLevel", "fragment");
		str = str.replaceAll("waveLevel", "fragment");
		return toNormalText(str);
	},
	modifierUpdated: function (obj) {//update title texts
		//if(obj.target==this.graph){
		this.displayTitleText(this.graph);
		//}

	},
	displayTitleText: function (graph) {
		getE("graph-desc").innerText = G.analytics.getGraphSummary();

		let summaryText = "";
		if (graph.heightProperty) {
			if (graph.edges[graph.heightProperty]) {
				let obj = graph.edges[graph.heightProperty];
				if (obj.max != undefined && obj.min != undefined) {
					summaryText = this.toCustomText(graph.heightProperty) + " " + ((obj.min == obj.max) ? obj.min : (obj.min + " to " + obj.max));
				}
			} else if (graph.vertices[graph.heightProperty]) {
				let obj = graph.vertices[graph.heightProperty];
				if (obj.max != undefined && obj.min != undefined) {
					summaryText = this.toCustomText(graph.heightProperty) + " " + ((obj.min == obj.max) ? obj.min : (obj.min + " to " + obj.max));
				}
			}
		} else {
			if (graph.edges.originalWaveLevel) {
				summaryText = graph.edges.originalWaveLevel.partitionCount + " fragments";
			}
			if (graph.edges.fragment) {
				summaryText = graph.edges.fragment.partitionCount + " fragments";
			}
		}
		let title = graph.dataPath ? this.graphPathToText(graph.dataPath) : "Custom graph";
		if (summaryText) title = title + " (" + summaryText + ")";
		getE("minimal-graph-title").innerText = title;
		let V = graph.vertices.length, E = graph.edges.length;
		let ccSorted = Algs.getSortedCCsAndCCIDs(graph);
		let CC = [...new Set(Algs.getCCIDs(graph))].length;
		let p = (2*E / (V * (V - 1))), k = Math.log(E / V) / Math.log(Math.log(V));
		graph.numCC= CC;
		let VEText = "|V|: " + V + ", |E|: " + E + ", |CC|: "+CC;//+", avg. degree: "+shortStr(2*E/V)+", density: "+shortStr(p)+", sparsity:"+shortStr(k);
        if(ccSorted.length>1) {
            let maxCCV = ccSorted[0].V;
            let minCCV = ccSorted[ccSorted.length - 1].V;
            VEText += ", min CC |V|: " + minCCV + ", max CC |V|: " + maxCCV;
        }
        if (p == 1) {
			VEText += " (complete)";
		}

		if (graph.heightPropertyType == "edges" && (graph.nodes.length != V)) {
			VEText += ", clones: " + graph.edges[graph.heightPropertyName].verticesWithClones + ", total clone multiplicity: " + graph.nodes.length;
		}
		if (G.view.model) {
			let visibleNodes = 0, size = G.view.model.nodes.size;
			let visibleEdges = 0, brightness = G.view.model.links.brightness, thickness = G.view.model.links.thickness;
			for (let i = 0; i < G.view.model.nodes.length; i++) {
				if (size[i]) {
					visibleNodes++;
				}
			}
			for (let i = 0; i < G.view.model.links.length; i++) {
				if (brightness[i] && thickness[i]) {
					visibleEdges++;
				}
			}

			if (visibleNodes != G.view.model.nodes.length) {
				VEText += ", visible nodes: " + visibleNodes;
				G.visibleNodes = visibleNodes;
			}
			if (visibleEdges != E) {
				VEText += ", visible edges: " + visibleEdges;
			}
		}
		for (let modifierName in graph.modifiers) {
			if (graph.modifiers[modifierName].description) {
				VEText += ", " + graph.modifiers[modifierName].description;
			}
		}
		getE("minimal-graph-desc").innerText = VEText;
	},
	displayGraph: async function (graph) {
		//hide existing labels
		if (G.showingLabels) {
			this.showLabels(false);
		}

		let realGraph = graph;
		while (graph.representation) graph = G.getGraph(graph.dataPath + "/metagraphs/" + graph.representation);//only use the real displayed top level graph
		this.initHierarchyPathElems(graph);
		this.graph = graph;
		this.displayTitleText(graph);
		//update text descriptions and ribbon
		//this.showWaves(graph);
		if (graph.datasetID && G.hasGraph(graph.datasetID) && (graph.datasetID != this.topLevelGraphPath)) {
			this.showTopLevelGraphStats(G.getGraph(graph.datasetID));
			this.topLevelGraphPath = graph.datasetID;
		}

            let degrees = Algs.getDegrees(graph).reduce((json, val) => ({...json, [val]: (json[val] | 0) + 1}), {});
            let cc = Algs.getCCIDandNumVertices(graph).reduce((json, val) => ({...json, [val]: (json[val] | 0) + 1}), {});

            degreePlot(false, "num vertices", "number of connected components", cc, Object.keys(cc), Object.values(degrees), 300, 190, 0,"cc-plot");
            //degreePlot(false, "vertices", "count", degrees, Object.keys(degrees), Object.values(degrees), 300, 190, 0);
            degreePlot(true, "vertices", "count", degrees, Object.keys(degrees), Object.values(degrees), 300, 190, 0);


		//global partitions: CC and layer markers
		//layers: use the triangle?
		if (graph.globalPartitionInfo && graph.globalPartitionInfo.layer) {
			let l = graph.globalPartitionInfo.layer.value;
			if (this.ribbonSelection) {
				this.ribbonSelection.filter((data) => data.layer == l).select(".selector").style("visibility", "visible");
				this.ribbonSelection.filter((data) => data.layer != l).select(".selector").style("visibility", "hidden");
			}
		} else {
			if (this.ribbonSelection) {
				this.ribbonSelection.select(".selector").style("visibility", "hidden");
			}
		}
		//ccs: highlight the CC or CC bucket
		if (graph.globalPartitionInfo && graph.globalPartitionInfo.CC) {
			let V = graph.globalPartitionInfo.CC.V, E = graph.globalPartitionInfo.CC.E, str = V + "," + E;
			this.ccRects.filter((data) => data.key == str).select(".selector-bottom").style("visibility", "visible");
			this.ccRects.filter((data) => data.key != str).select(".selector-bottom").style("visibility", "hidden");
		} else {
			if (this.ccRects) this.ccRects.select(".selector-bottom").style("visibility", "hidden");
		}


		//list the available metagraphs
		let metagraphs = [];
		for (let name in realGraph.metagraphs) {
			metagraphs.push({type: name, V: realGraph.metagraphs[name].V, E: realGraph.metagraphs[name].E});
		}
		if (metagraphs.length > 0) {//add option to show original!
			metagraphs.push({type: "(original)", V: realGraph.vertices.length, E: realGraph.edges.length});
		}
		let listElem = getE("graph-metagraph-list");
		d3.select(listElem).selectAll("span").remove();
		d3.select(listElem).selectAll("span").data(metagraphs).enter().append("span");
		d3.select(listElem).selectAll("span").attr("class", "metagraph-item").text((d) => {
			if (d.type == "(original)") {
				return " (original graph) - |V|: " + d.V + ", |E|: " + d.E + " ";
			} else {
                let infoElem=getE("info-menu");
                let metagraphMenu = ["|V| : " + d.V , "|E| : " + d.E ]
                G.controls.addDropdownMenu(infoElem,toNormalText(d.type) + " Metagraph",metagraphMenu);
                return " " + toNormalText(d.type) + " metagraph - |V|: " + d.V + ", |E|: " + d.E + " ";
			}
		}).on("click", (d) => {
			if (d.type == "(original)") {
				realGraph.representation = null;
			} else {
				realGraph.representation = d.type;
			}
			G.display(realGraph);
		});

	},
	topLevelGraphPath: null,
	showWaveMap: function () {
		this.showWaveMapArcs(G.analytics.getWaveMapRings(G.graph));
	},
	showWaveMapArcs: function (arcs) {
		let svg = d3.select("#wavemap");
		svg.selectAll("path").remove();
		svg.selectAll("g").remove();
		let g = svg.append("g").style("transform", "translateX(50%) translateY(50%)");
		let waveCount = arcs[0].reverseWave + 1;
		let maxRadius = 150, centerRadius = 20;
		let radiusDelta = Math.min(20, (maxRadius - centerRadius) / (arcs[0].reverseWave + 1));
		let startDegree = -Math.PI / 2;
		let currentWave = -1, degree = startDegree;
		for (let arc of arcs) {
			let str = "";
			if (arc.wave > currentWave) {
				currentWave = arc.wave;
				degree = startDegree;
			}
			let realRadius = arc.reverseWave * radiusDelta + centerRadius;
			let totalDegree = Math.PI * 2, gapDegree = 0;
			if (arc.reverseWave != 0 || arc.ratio != 1) {
				gapDegree = Math.min(3 * arc.waveCCCount / realRadius, Math.PI / 2);
				totalDegree -= gapDegree;
			} else {
				degree = 0;//seems this is needed to make it draw a full circle
			}
			let degreeDelta = totalDegree * arc.ratio;
			let endDegree = degree + degreeDelta;
			if (degreeDelta == Math.PI * 2) {
				degreeDelta *= 0.99;
			}//seems this is needed to make it draw a full circle
			let x1 = realRadius * Math.cos(degree), y1 = realRadius * Math.sin(degree),
				x2 = realRadius * Math.cos(endDegree), y2 = realRadius * Math.sin(endDegree);
			arc.str = "M " + x1 + " " + y1 + " " + "A " + realRadius + " " + realRadius + " " + "0 " + ((degreeDelta > Math.PI) ? "1" : "0") + " 1 " + x2 + " " + y2;
			//seems sweep needs to be 1 here
			degree += degreeDelta + gapDegree / arc.waveCCCount;
		}
		let path = g.selectAll("path").data(arcs).enter().append("path").attr("d", (d) => d.str).attr("stroke", (d) => d.color).attr("fill", "none").attr("stroke-width", (d) => Math.max(1.5, Math.min(1 + (d.levelCount - 1) * 2, (d.levelCount / d.maxLevelCount) * radiusDelta * 0.9)));
		selectE("wavemap-menu").style("display", "block");

		G.view.refreshStyles(true, true);
	},
	showWaves: function (graph) {
		if(graph.vertices.properties && graph.vertices.properties.waveIDs) {
			let waveIDs = graph.vertices.properties.waveIDs.value.filter(function (val) {
				return val !== 0;
			});
			if(waveIDs.length>0) {
				wIDs = Array.from(graph.vertices.properties.waves.value).filter(function( element ) {
					return element !== undefined;
				}).sort((a, b) => (Math.log(Object.keys(a.edges).length/a.vertexCount) / Math.log(Math.log(a.vertexCount))
					> Math.log(Object.keys(b.edges).length/b.vertexCount) / Math.log(Math.log(b.vertexCount))) ? 1 : -1);
				let wavesRibbon = d3.select("#top-level-waves-ribbon-area");
				wavesRibbon.selectAll("p").remove();
				let wavesRects = wavesRibbon.selectAll("p").data(wIDs).enter().append("p");
				wavesRects.attr("class", "bar-segment").style("color", "black").style("background-color", (x) => G.colorScales.lightBlueRed(Math.log(Object.keys(x.edges).length/x.vertexCount) / Math.log(Math.log(x.vertexCount)))).style("width", "95%").style("height", "92%")/*.style("flex",(x)=>x.e/E+" 0 0")*/.text((x) => {
					return x.originalWave;
				});
				wavesRects.on("click", (d) => {
					d3.event.stopPropagation();
					G.view.modifiers["nodeFilter"].params.threshold=1;
					G.view.refreshStyles(true,true);
				});
			}
		} else {
			let wavesRibbon = d3.select("#top-level-waves-ribbon-area");
			wavesRibbon.selectAll("p").remove();
		}


	},
    addShowNeigborsButton: function () {
        let selectionButtonsElem = getE("selection-buttons-area");
        if (document.querySelectorAll('#selection-buttons-area button').length < 2) {
            G.controls.addButton(selectionButtonsElem, "show vertex neighbors", () => {
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
                        document.getElementById("graph-menu").style.display = "none";
                        document.getElementById("graph-fork-bar").style.display = "block";
                        this.showNeighbors(value);
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
        }
    },

	showTopLevelGraphStats: function (graph) {
		let topLevelName = (graph.name);
		let topLevelSummary = "";
		let V = graph.vertices.length, E = graph.edges.length;
		if (V) {
			topLevelSummary += " |V|:" + V;
		}
		if (E) {
			topLevelSummary += ", |E|:" + E;
		}
		getE("top-level-graph-name").textContent = topLevelName;
		getE("top-level-summary").textContent = topLevelSummary;

		d3.json("datasets/" + graph.dataPath + "/image").then((data) => {//actually a JSON encoded string that encodes the image
			if (data) getE("overview-image").src = data;
			else {
				getE("overview-image").src = "images/blank.png"
			}
		});


		let container = d3.select("#top-level-summary-area");
		let ccSvg = d3.select("#top-level-cc-plot");
		let ccSvg2 = d3.select("#top-level-cc-plot2");
		let ccRibbon = d3.select("#top-level-cc-ribbon-area");
		let wavesRibbon = d3.select("#top-level-waves-ribbon-area");


		//layer ribbons
		let layersArray = [];
		let maxCount = 0;
		for (let l in graph.layerCCSummary) {
			let obj = {layer: l, V: graph.layerCCSummary[l].V, E: graph.layerCCSummary[l].E};
			Object.assign(obj, graph.layerCCSummary[l]);
			layersArray.push(obj);
			if (graph.layerCCSummary[l].E > maxCount) maxCount = graph.layerCCSummary[l].E;
			if (graph.layerCCSummary[l].V > maxCount) maxCount = graph.layerCCSummary[l].V;
		}

		layersArray.sort(compareBy((x) => Number(x.layer)));

		for (let i = 1; i < layersArray.length; i++) {
			layersArray[i].upperGap = Math.abs(layersArray[i].layer - layersArray[i - 1].layer);
		}
		if (layersArray.length == 0) return;


		let xLinear = d3.scaleLinear().domain([0, maxCount]).range([0, 1]);
        let lin = d3.scaleLinear().domain([0, 56]).range([0, 1]);
		let xLog = d3.scaleLog().domain([0, maxCount]).range([0, 1])

		let ribbonMenuSelection = d3.select("#ribbon-menu-contents");
		ribbonMenuSelection.selectAll("div").remove();
        ribbonMenuSelection.selectAll("span").remove();
		let ribbonSelection = ribbonMenuSelection.selectAll("div").data(layersArray).enter().append("div").attr("class", "ribbon").on("click", (d) => {
            if(G.graph.dataPath && Object.keys(G.graph.annotatedVertices)) {
                if( !Object.keys(G.graph.annotatedVertices) ||  Object.keys(G.graph.annotatedVertices).length==0)
                    G.graph.annotatedVertices ={};
                G.analytics.cacheNotes(document.getElementById('textBox').innerHTML);
                G.messaging.sendCustomData("save", {type: "annotatedVertices", path: G.graph.dataPath, data: G.graph.annotatedVertices});
            }
			if (G.graph.dataPath == graph.dataPath + "/layer/" + d.layer) {
				//displaying this layer; show top level instead

				G.display(graph);
				return;
			} else {
				//show CCs if it's too large?
                // ccs = Algs.getSortedCCsAndCCIDs(graph);
                // //l = graph.dataPath;
                // g = Algs.getInducedSubgraph(graph, ccs[0].vertexList);
                // g.dataPath = l;
                // G.display(g);
                if(graph.edges.properties.fixedPointLayer && graph.edges.properties.fixedPointLayer.value && graph.edges.properties.fixedPointLayer.value.origCloneMaps) {
                    G.origCloneMaps = graph.edges.properties.fixedPointLayer.value.origCloneMaps;
                }
                if(G.view.graph.wholeGraph==undefined) {
                    G.origAdjlist = G.view.graph.vertices.edges;
                    G.origVertexMap = G.view.graph.vertices.id;
                    G.origLabelsById = G.view.graph.labelsByID;
                }
                G.display(graph.dataPath + "/layer/" + d.layer);
                this.addShowNeigborsButton();

            }
		});
		this.ribbonSelection = ribbonSelection;
        var fadeSpeed = 25; // a value between 1 and 1000 where 1000 will take 10
        var tipMessage = "The content of the tooltip...";
        if (graph.subgraphs.CC) {
            let vedist = graph.subgraphs.CC.VEdist;
            let VERecords = Object.keys(vedist).map((str) => {
                let [v, e] = str.split(","), count = vedist[str];
                v = Number(v), e = Number(e);
                return {key: str, v: v, e: e, avgDeg: 2 * e / v, count: count, totalV: v * count, totalE: e * count};
            }).sort(compareBy("e")).sort(compareBy("v"));
            ccCount =0; treesCount =0; singleEdgeCount =0; pathCount=0;
            ccCountV = 0; ccCountE = 0;
            for(i in VERecords){
                if(VERecords[i].v ==2 && VERecords[i].e ==1) singleEdgeCount= singleEdgeCount+VERecords[i].count;
                else if(VERecords[i].v ==3 && VERecords[i].e ==2) pathCount=pathCount+VERecords[i].count;
                else if(VERecords[i].v-1 == VERecords[i].e) treesCount= treesCount+VERecords[i].count;
                else if(VERecords[i].v != VERecords[i].e) {
                    ccCount = ccCount + VERecords[i].count;
                    ccCountV = VERecords[i].v;
                    ccCountE = VERecords[i].e;
                }
            }
            tipMessage = "Original Graph CCs Info:"
            tipMessage += "<br/>    CC with |V|: " + ccCountV + ", |E|"+ccCountE;
            tipMessage+="<br/>      |Trees| : "+treesCount;
            tipMessage+="<br/>      |Paths| : "+pathCount;
            tipMessage+="<br/>      |Single edges| : "+singleEdgeCount;
        }

        var showTip = function () {
            if(document.getElementById("tip")) {
                document.getElementById("tip").remove();
            }

                var tip = document.createElement("span");
                tip.className = "tooltip";
                tip.id = "tip";
                tip.innerHTML = tipMessage;
                document.getElementById("ribbon-menu-contents").appendChild(tip);
                tip.style.opacity = "0"; // to start with...
                tip.style.borderStyle = "double";
                var intId = setInterval(function () {
                    newOpacity = parseFloat(tip.style.opacity) + 0.1;
                    tip.style.opacity = newOpacity.toString();
                    if (tip.style.opacity == "1") {
                        clearInterval(intId);
                    }
                }, fadeSpeed);
        };
        var hideTip = function () {
            var tip = document.getElementById("tip");
            var intId = setInterval(function () {
                if(tip) {
                    newOpacity = parseFloat(tip.style.opacity) - 0.1;
                    tip.style.opacity = newOpacity.toString();
                    if (tip.style.opacity == "0") {
                        clearInterval(intId);
                        tip.remove();
                    }
                }
            }, fadeSpeed);
            if(tip) {
                tip.remove();
            }
        };
        document.getElementById("ribbon-menu-contents").addEventListener("mouseover", showTip, false);
        document.getElementById("ribbon-menu-contents").addEventListener("mouseout", hideTip, false);

		/*.on("contextmenu",(d)=>{
            d3.event.stopPropagation();
            d3.event.preventDefault();
            G.toggleActiveLayer(d.layer);

        });*/
		function scaleDensityValue(density) {
			return (density == 0) ? 0 : (0.8 * density + 0.15);
		}

		function getRGBFromDensity(density) {
			let value = scaleDensityValue(density) * 255;
			return "rgb(" + value + "," + value + "," + value + ")";
		}

		function getRGBAFromDensity(density) {
			//let value=scaleDensityValue(density)*255;
			let value = 128;
			return "rgba(" + value + "," + value + "," + value + "," + scaleDensityValue(density) + ")";
		}

		ribbonSelection.append("span").attr("class", "selector").text("\u25C0").style("visibility", "hidden");//"\u25BA" //was rightward
		ribbonSelection.append("span").attr("class", "layer-number").text((d) => d.layer);
		let barContainerSelection = ribbonSelection.append("div").attr("class", "layer-bar-container");
		let index =0;
        let heights=graph.nodes.height;
        const distinct = (value, index,self) => {
            return self.indexOf(value) === index;
        };
        let max=arrayMax(heights);
        let min=arrayMin(heights);
        arr = heights.map((x)=>(min==max)?(0.5):((x-min)/(max-min)));
        arr = (arr.filter(distinct)).sort(function(a, b){return b-a});
        barContainerSelection.append("span").attr("class", "layer-edge-bar").text(" ").style("width", (d) => Math.floor(xLinear(d.E) * 100 + 5) + "%")
            .style("background", (d) => {
                return G.colorScales.orange((1-(arr[index++])));
		});
		barContainerSelection.append("span").attr("class", "layer-vertex-bar").text(" ").style("width", (d) => Math.floor(xLinear(d.V) * 100) + "%");
		//barContainerSelection.append("span").attr("class","layer-clones-bar").text(" ").style("left",(d)=>Math.floor(xLinear(d.nodesWithClones)*100)+"%");
		ribbonSelection.append("span").attr("class", "layer-cc-count").text((d) => d.count);


		ribbonHoverDelay = 0;

		function hoverOnRibbon(obj) {
			let data = obj.__data__;
			let tip = getE("ribbon-tooltip");
			let tipSelection = d3.select(tip);
			let str = "Layer " + data.layer + ", |V|: " + data.V + ", |E|: " + data.E + ", CC count:  " + data.count;
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
			if (data.Vdist) {
				let vDist = Object.keys(data.Vdist), vDistValues = vDist.map((x) => data.Vdist[x]);
				let eDist = Object.keys(data.Edist), eDistValues = eDist.map((x) => data.Edist[x]);
				let svg1 = tipSelection.select("#ribbon-vertex-dist");
				let svg2 = tipSelection.select("#ribbon-edge-dist");
				drawPlot("vertices", "count", vDist, vDistValues, svg1, 190, 90);
				drawPlot("edges", "count", eDist, eDistValues, svg2, 190, 90);
			}

			G.ui.showTooltip(tip);
		}

		function hoverEnd() {
			let tip = getE("ribbon-tooltip");
			tip.style.display = "none";
		}

		//function hoverEnd(){if ((G.graph) && (G.onhover))G.onhover(null);}
		addHoverListener(ribbonSelection.nodes(), () => G.hoverDelay * 2, hoverOnRibbon, hoverEnd);//it often shows up when I don't wnat it to
		let tip = getE("ribbon-tooltip");
		let tipSelection = d3.select(tip);
		tipSelection.on("mouseout", hoverEnd);

		//scale
		let firstRibbonRect = ribbonSelection.select(".layer-bar-container").node().getBoundingClientRect();
		svgWidth = firstRibbonRect.width;
		xLinear.range([0, svgWidth]);
		xLog.range([0, svgWidth]);
		let ribbonscaleSelection = d3.select("#ribbon-scale");
		ribbonscaleSelection.attr("width", svgWidth).attr("height", 30);
		ribbonscaleSelection.selectAll("g").remove();
		let newScale = ribbonscaleSelection.append("g").attr("transform", "translate (" + firstRibbonRect.left + ",25)");
		newScale.call(d3.axisTop(xLinear).ticks(2, ".0s"));//use SI units like M, avoid many zeroes

		//add grid?

	},

	animateFrame: function () {
		//logs
		var logElem = G.logElem;
		logs = logElem.children, time = new Date().getTime();
		for (var i = 0; i < logs.length; i++) {
			if ((time - logs[i].createTime) > 2000) {
				logs[i].style.display = "none";
			}
		}
		var lastlog = logElem.lastElementChild;
		if (lastlog && (lastlog.style.display == "none")) {
			logElem.removeChild(lastlog);
		}

		//labels
		//all kinds of on-canvas HTML that depend on screen coordinates
		if (G.graph) {
			for (let marker of this.canvasMarkers) {
				if (marker.visible && marker.selection) {
					let positions = G.view.getVerticesScreenPos();
					marker.updatePosition(positions);

				}
			}
		}
	},

	switchStyle: function switchStyle(bright = true) {
		var el1 = getE('style-light'), el2 = getE('style-dark');
		if (bright) {
			el1.disabled = false;
			el2.disabled = true;
		} else {
			el1.disabled = true;
			el2.disabled = false;
		}
	},
	needsResume: false,
	canvasMarkers: [],
	addMarkers: function () {
		let markers = new VertexMarkers();
		this.canvasMarkers.push(markers);
		return markers;
	},
	addRegionMarkers: function () {
		let markers = new RegionMarkers();
		this.canvasMarkers.push(markers);
		return markers;
	},
	getSemantics: function (chosenOnes) {
		let datasetID = G.graph.datasetID;

		return new Promise((resolve, reject) => {
			let idString = G.analytics.getVertexIDsString(chosenOnes);
			if (G.analytics.datasetIDMaps[datasetID]) {
				if (G.analytics.datasetIDMaps[datasetID].idMap) {
					try {
						d3.json("datasetIDMaps/" + datasetID + "/" + idString).then((d) => {
							if (d && d.length > 0) {
								let ids = d.join(",");
								if (G.analytics.datasetIDMaps[datasetID].func) {
									resolve(G.analytics.datasetIDMaps[datasetID].func(ids));
								} else resolve(d);
							} else {
								resolve(idString.split(","));
							}
						});
					} catch (e) {
						resolve(idString.split(","));
					}
				} else {
					//no extra id map
					if (G.analytics.datasetIDMaps[datasetID].func) {
						resolve(G.analytics.datasetIDMaps[datasetID].func(idString));
					} else {
						resolve(idString.split(","));
					}
				}
			} else {
				resolve(idString);
			}
		});
	},
	showSemanticsText: function () {
        if(G.view.graph.dataPath && G.view.graph.dataPath.includes("fabula")){
            G.addLog("This option isn't customized for this dataset");
            return;
        } else if(!G.view.graph.dataPath){
            G.addLog("This option isn't customized for this dataset");
            return;
        }
	    if(G.snNodesColorByLabel || G.snNodesColorByHotSpot) {
            G.addLog("Please remove the color nodes by label or hotspot option");
            return;
        }
        getE("selected-vertices-ids-content").innerHTML = "";
		if (G.graph && (!G.showingSelectedIDs)) {
			G.showingSelectedIDs = true;
            let d = document.createElement("div");
            d.setAttribute("id", "storyTitle");
            d.innerHTML = "Suggested Story Title(s) : ";
            getE("selected-vertices-ids-content").appendChild(d);
            let story = Algs.getStories();
            let storytext = "";
            for(let i =0; i<Object.keys(story).length;i++) {
                storytext += story[Object.keys(story)[i]];
            }
            if(G.view.graph.storyTitle) {
                document.getElementById("storyTitle").innerHTML = "Suggested Story Title(s) : " + [...new Set(G.view.graph.storyTitle.flat(1))];
            }
            if(G.view.graph.storyLayers) {
                document.getElementById("storyTitle").innerHTML += "</br> Vertices used for title suggestion also appear in Fixed Points: " +
                    [...new Set(G.view.graph.storyLayers.flat(1))].sort().reverse() + "</br><hr>  ";
            }
			getE("selected-vertices-ids").style.display = "block";
            getE("selected-vertices-ids-content").innerHTML += storytext;
		} else {
			if (G.showingSelectedIDs) {
				G.showingSelectedIDs = false;
				getE("selected-vertices-ids").style.display = "none";
			}
		}
	},

    showTextEditor: function () {
        getE("textBox").contentEditable = "true";
        if (G.graph && (!G.showingTextEditor)) {
            if(G.view.graph.story){
                getE("switchBox-div").style.display="block";
            } else {
                getE("switchBox-div").style.display="none";
            }
            G.showingTextEditor = true;
            if(G.graph.annotation){
                getE("textBox").innerHTML=G.graph.annotation;
                if(G.graph.annotationEditTime){
                    getE("lastSaved").innerHTML= G.graph.annotationEditTime;
                }
            }
            getE("annotations-box").style.display = "block";
        } else {
            if (G.showingTextEditor) {
                G.showingTextEditor = false;
                getE("annotations-box").style.display = "none";
            }
        }
    },
    showNeighbors: function(vertexId){
        let edgesFilter = 4;
        vertexId = G.graph.vertices.id.indexOf(vertexId);
        if(vertexId!= undefined) {
            if(G.graph.egonetMap[vertexId] == undefined) {
                if(G.graph.subgraphID){
                    edgesFilter = 4;
                    let vertexAllNeighbors = Object.keys(G.origAdjlist[G.origVertexMap.indexOf(G.graph.vertices.id[vertexId])]);
                    Algs.getFilteredSubgraph(G.graph,vertexId,(x)=>(x!=0),"egonet", vertexAllNeighbors);
                }
            } else {
                if(G.graph.subgraphID) {
                    edgesFilter = 4;
                }
                G.graph.egonet = G.graph.egonetMap[vertexId];
            }
            if(G.graph.egonetMap[vertexId].edges.length>=edgesFilter) {
                let vec=G.view.getNodePos(vertexId);
                G.cameraControls.setTarget(vec,true);
                const nodeColorScale = d3.scaleOrdinal(d3.schemeRdYlGn[4]);
                const Graph = ForceGraph3D({ controlType: 'orbit' })
                (document.getElementById('subgraph_canvas'))
                    .graphData(G.graph.egonetMap[vertexId].initData)
                    .backgroundColor('#ffffff')
                    .nodeColor(node => node.color? node.color: 'gray')
                    .linkColor(link => link.color? link.color: 'maroon')
                    .nodeThreeObject(node => {
                        if(G.graph.egonet.hightlightVertex.indexOf(node.id) !=-1) {
                            // use a sphere as a drag handle
                            const obj = new THREE.Mesh(
                                new THREE.SphereGeometry(Graph.nodeRelSize()),
                                new THREE.MeshBasicMaterial({depthWrite: false, transparent: false, opacity: .1})
                            );

                            // add text sprite as child
                            const sprite = new SpriteText(Algs.clearText(node.label));
                            sprite.color = node.color;
                            sprite.textHeight = 2.5;
                            obj.add(sprite);

                            return obj;
                        } else {
                            return new THREE.Mesh(
                                new THREE.SphereGeometry(Graph.nodeRelSize()),
                                new THREE.MeshLambertMaterial({
                                    color: node.color,
                                    transparent: true,
                                    opacity: 0.75
                                })

                            );
                        }
                    })
                    .linkWidth(1.0)
                    .nodeRelSize(1)
                    .linkOpacity(1)
                    .nodeLabel(node => `<span style="color: black">${node.label}</span>`)
                    .enableNavigationControls(true)
                    .width(465)
                    .height(408)
                    .showNavInfo(false)
                    .onNodeClick(node => {
                        const distance = 40;
                        const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
                        G.graph.cameraPosition(
                            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
                            node,
                            300
                        );
                    });


                //Define GUI
                const Settings = function() {
                    this.linkWidth = .4;
                    this.nodeSize = .5;
                };

                const settings = new Settings();
                const linkForce = Graph.linkWidth(settings.linkWidth);
                const nodeSizeForce = Graph.nodeThreeObject(node => {
                    if(G.graph.egonet.hightlightVertex.indexOf(node.id) !=-1) {
                        // use a sphere as a drag handle
                        const obj = new THREE.Mesh(
                            new THREE.SphereGeometry(settings.nodeSize),
                            new THREE.MeshBasicMaterial({depthWrite: false, transparent: false, opacity: .1})
                        );

                        // add text sprite as child
                        const sprite = new SpriteText(Algs.clearText(node.label));
                        sprite.color = node.color;
                        sprite.textHeight = 2.5;
                        obj.add(sprite);

                        return obj;
                    } else {
                        return new THREE.Mesh(
                            new THREE.SphereGeometry(settings.nodeSize),
                            new THREE.MeshLambertMaterial({
                                color: node.color,
                                transparent: true,
                                opacity: 0.75
                            })

                        );
                    }
                });
                let verticesList=getE("vertices-list");
                $("#vertices-list").html("");
                verticesListMenu = G.graph.egonet.verticesList;
                G.controls.addDropdownMenu(verticesList,"Vertices List",verticesListMenu);
                G.controls.addButton(verticesList,"Add to Annotations",()=>{

                    text = G.graph.egonet.verticesList.join('</br>');
                    document.getElementById('textBox').innerHTML +="</br>";
                    document.getElementById('textBox').innerHTML +=text;
                });
                const gui = new dat.GUI({ autoPlace: false });
                $("#sett").html("");
                $('#sett').append($(gui.domElement));
                const controllerOne = gui.add(settings, 'linkWidth', 0, 3);
                const controllertwo = gui.add(settings, 'nodeSize', 0, 5);
                controllerOne.onChange(updateLinkDistance);
                controllertwo.onChange(updateNodeSize);
                function updateLinkDistance() {
                    linkForce.linkWidth(settings.linkWidth);
                    Graph.numDimensions(3); // Re-heat simulation
                }
                function updateNodeSize() {
                    Graph.nodeThreeObject(node => {
                        if(G.graph.egonet.hightlightVertex.indexOf(node.id) !=-1) {
                            // use a sphere as a drag handle
                            const obj = new THREE.Mesh(
                                new THREE.SphereGeometry(settings.nodeSize),
                                new THREE.MeshBasicMaterial({depthWrite: false, transparent: false, opacity: .1})
                            );

                            // add text sprite as child
                            const sprite = new SpriteText(Algs.clearText(node.label));
                            sprite.color = node.color;
                            sprite.textHeight = 2.5;
                            obj.add(sprite);

                            return obj;
                        } else {
                            return new THREE.Mesh(
                                new THREE.SphereGeometry(settings.nodeSize),
                                new THREE.MeshLambertMaterial({
                                    color: node.color,
                                    transparent: true,
                                    opacity: 0.75
                                })

                            );
                        }
                    });
                    Graph.numDimensions(3); // Re-heat simulation
                }

                $("#egonet_id").text(G.graph.labelsByID[vertexId][G.controls.getLabelIndex()] +" Neighbors");
                $("#egonet_layers").text("This vertex appears in fixed points: "+ Object.keys(G.origCloneMaps[G.graph.vertices.id[vertexId]]).sort().reverse());
                G.simulationRunning=false;
                G.resizeNodes = false;
                document.getElementById("egonet-close").addEventListener('click', function(){
                    G.simulationRunning=true;
                });
                let modalEgonet = document.getElementById("egonet");
                if(G.mouseScreenPos.x>700)
                    modalEgonet.style.left =-300 + "px";
                else modalEgonet.style.left =450 + "px";
                G.graph.nodes.size[vertexId]=10;
                jQuery.noConflict();
                $('#egonet').modal('show');
            }


        }
    },
    showEgonet: function(){
        G.graph.egonet={}
        let edgesFilter = 512;
        if(G.graph.hoveredVertex != undefined && G.graph.showingEgonets) {
            if(G.graph.egonetMap[G.graph.hoveredVertex] == undefined) {
                if(G.graph.subgraphID && G.loading.graphsCache[G.graph.vertices.id[G.graph.hoveredVertex]]&& G.loading.graphsCache[G.graph.vertices.id[G.graph.hoveredVertex]][0]){
                    edgesFilter = 4;
                    Algs.getFilteredSubgraph(G.graph,G.graph.hoveredVertex,(x)=>(x!=0),"egonet", G.loading.graphsCache[G.graph.vertices.id[G.graph.hoveredVertex]][0]);
                } else {
                    Algs.getFilteredSubgraph(G.graph, G.graph.hoveredVertex, (x) => (x != 0), "egonet");
                }
            } else {
                G.graph.egonet = G.graph.egonetMap[G.graph.hoveredVertex];
            }
            if(G.graph.egonetMap[G.graph.hoveredVertex].edges.length>=edgesFilter) {

                let vec=G.view.getNodePos(G.graph.hoveredVertex);
                G.cameraControls.setTarget(vec,true);
                const Graph = ForceGraph3D({ controlType: 'orbit' })
                (document.getElementById('subgraph_canvas'))
                    .graphData(G.graph.egonetMap[G.graph.hoveredVertex].initData)
                    .backgroundColor('#ffffff')
                    .nodeColor(node => 'gray')
                    .linkColor(link => 'maroon' )
                    .nodeLabel(node => `<span style="color: black">${node.label}</span>`)
                    .enableNavigationControls(true)
                    .width(465)
                    .height(408)
                    .showNavInfo(false)
                    .onNodeClick(node => {
                        const distance = 40;
                        const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
                        Graph.cameraPosition(
                            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
                            node,
                            300
                        );
                    });


                //Define GUI
                const Settings = function() {
                    this.edgeLength = 0;
                };

                const settings = new Settings();
                const linkForce = Graph
                    .d3Force('link')
                    .distance(settings.edgeLength);
                const gui = new dat.GUI({ autoPlace: false });
                $("#sett").html("");
                $('#sett').append($(gui.domElement));
                const controllerOne = gui.add(settings, 'edgeLength', 0, 300);

                controllerOne.onChange(updateLinkDistance);

                function updateLinkDistance() {
                    linkForce.distance(settings.edgeLength);
                    Graph.numDimensions(3); // Re-heat simulation
                }

                $("#egonet_id").text(G.view.graph.labelsByID[G.graph.hoveredVertex][G.controls.getLabelIndex()]);
                G.simulationRunning=false;
                G.resizeNodes = false;
                document.getElementById("egonet-close").addEventListener('click', function(){
                    G.simulationRunning=true;
                });
                let modalEgonet = document.getElementById("egonet");
                if(G.mouseScreenPos.x>700)
                    modalEgonet.style.left =-300 + "px";
                else modalEgonet.style.left =450 + "px";
                G.graph.nodes.size[G.graph.hoveredVertex]=10;
                jQuery.noConflict();
                $('#egonet').modal('show');
            }


        }
    },


	//this module should manage information on the UI, like tables and descriptions, not controls and gestures.
	showEdgeListMenu: function (str) {
		getE("edge-list-menu").style.display = "block";
	},

	showTrapezoidsInput: function (data) {
		getE("trapezoid-input-menu").style.display = "block";
		getE("trapezoid-menu").style.display = "none";
	},
	showTrapezoids: function (data, docked = false, callback) {
		getE("trapezoid-input-menu").style.display = "none";
		let trapezoidsMenu = getE("trapezoid-menu");
		trapezoidsMenu.style.display = "block";
		if (docked) {
			trapezoidsMenu.style.left = "0";
			trapezoidsMenu.style.width = "10%";
			trapezoidsMenu.style.bottom = "10%";
		} else {
			trapezoidsMenu.style.left = "";
			trapezoidsMenu.style.width = "";
			trapezoidsMenu.style.bottom = "";
		}
		let s = d3.select("#trapezoid-menu"), menuElem = s.node();
		let containerElem = getE("trapezoid-menu-content");
		let container = d3.select(containerElem);
		let width = containerElem.clientWidth, height = containerElem.clientHeight;
		container.selectAll("svg").remove();
		let svg = container.append("svg").style("width", "100%").style("height", "100%").attr("width", width).attr("height", height);

		if (data.sets) {
			let realData = {};
			for (let key in data.sets) {
				realData[key] = {v: data.sets[key].length};
			}
			for (let key in data.adj) {
				realData[key].adj = data.adj[key];
			}
			data = realData;
		}
		let keys = Object.keys(data), values = Object.values(data);
		let maxKey = Math.max.apply(null, keys.map((d) => parseInt(d)));
		let maxV = Math.max.apply(null, values.map((d) => d.v));
		let logOffset = 0.5;
		let i = 0;
		let cumulativeHeight = 0;
		console.log("trapezoid keys", keys);
		for ([i, id] of keys.entries()) {
			let d = data[id];
			d.index = i;
			d.id = parseInt(id);
			d.widthRatio = d.v / maxV;//Math.log(d.v+logOffset)/Math.log(maxVCount+logOffset);
			d.widthPercentage = d.widthRatio * 100 + "%";
			d.widthInPixels = d.widthRatio * width;
			d.widthPx = Math.floor(d.widthInPixels) + "px";
			d.edgesToNextLayer = ((i < keys.length - 1) && d.adj && d.adj[keys[i + 1]]) ? d.adj[keys[i + 1]] : 0;
			d.edgesToPreviousLayer = ((i > 0) && d.adj && d.adj[keys[i - 1]]) ? d.adj[keys[i - 1]] : 0;
			d.height = (i < keys.length - 1) ? (2 * d.edgesToNextLayer / (d.v + data[keys[i + 1]].v)) : 0;
			d.cumulativeHeight = cumulativeHeight;
			cumulativeHeight += d.height;
		}
		let tempColor = new THREE.Color();
		let barBorderFunc = (d) => {
			let ratio = d.id / maxKey;

			return G.colorScales.lightBlueRed(ratio);
			//let h=ratio*0.85,s=0.7,l=0.75;
			//tempColor.setHSL(h,s,l);
			//return "#"+tempColor.getHexString();
		};
		for ([i, id] of keys.entries()) {
			let d = data[id];
			d.nextBarWidthDiff = (i == keys.length - 1) ? 0 : ((d.widthRatio - data[keys[i + 1]].widthRatio) * width);
			d.heightRatio = (cumulativeHeight > 0) ? (d.height / cumulativeHeight) : 0;
			d.cumulativeHeightRatio = (cumulativeHeight > 0) ? (d.cumulativeHeight / cumulativeHeight) : 0;
			d.heightPercentage = d.heightRatio * 100 + "%";
			d.cumulativeHeightPercentage = d.cumulativeHeightRatio * 100 + "%";
			d.heightInPixels = d.heightRatio * height;
			d.cumulativeHeightInPixels = d.cumulativeHeightRatio * height;
			d.heightPx = Math.floor(d.heightInPixels) + "px";
			d.cumulativeHeightPx = Math.floor(d.cumulativeHeightInPixels) + "px";
			d.color = barBorderFunc(d);
			d.isEndOfWave = (i == keys.length - 1);
		}

		let barsSelection = svg.selectAll("g").data(Object.values(data)).enter().append("g");//.attr("class","x-ray-layer");

		let bars = barsSelection.append("rect").attr("class", "bar").style("x", (d) => width / 2 - d.widthInPixels / 2).style("y", (d) => height - d.cumulativeHeightInPixels - 2).style("width", (d) => d.widthInPixels).style("height", (d) => 4)
			.style("fill", (d) => d.color);//.style("fill","#eee");
		barsSelection.style("cursor", "pointer");

		let trapezoids = barsSelection.append("path").attr("class", "trapezoid")
			.attr("d", (d) => {
				let nextWidth = (d.index == keys.length - 1) ? 0 : (data[keys[d.index + 1]].widthInPixels);
				return "M " + (width / 2 - d.widthInPixels / 2) + " " + (height - d.cumulativeHeightInPixels) + " L " + (width / 2 + d.widthInPixels / 2) + " " + (height - d.cumulativeHeightInPixels) + " L " + (width / 2 + (nextWidth) / 2) + " " + (height - d.cumulativeHeightInPixels - d.heightInPixels) + " L " + (width / 2 - (nextWidth) / 2) + " " + (height - d.cumulativeHeightInPixels - d.heightInPixels) + " Z";
			})
			.style("stroke", (d) => d.color).style("fill", "#eee");


		//callback takes the object, that has the level and wave information (if the input has wave information).
		//.style("width",(d)=>(d.nextLayerWidthDiff>0)?(Math.floor(d.widthInPixels-Math.abs(d.nextLayerWidthDiff))+"px"):d.widthPercentage)
		//.style("border-top-color",(d)=>(d.index==keys.length-1)?("black"):(data[keys[d.index+1]].color))
		//.style("border-bottom-color",(d)=>d.color)
		//.style("border-left-width",(d)=>Math.floor(Math.abs(d.nextLayerWidthDiff)/2)+"px")
		//.style("border-right-width",(d)=>Math.floor(Math.abs(d.nextLayerWidthDiff)/2)+"px")
		//.style("border-top-width",(d)=>(d.nextLayerWidthDiff<0)?0:"40px")//if diff is positive, bottom should have a value and top should be 0
		//.style("border-bottom-width",(d)=>(d.nextLayerWidthDiff>=0)?0:"40px")
		//.style("height",(d)=>d.heightPx)
		//.style("bottom",(d)=>d.cumulativeHeightPx)
		//.style("visibility",(d)=>(d.isEndOfWave?"hidden":""));

		//trapezoids.append("p").style("position","absolute").style("top",(d)=>(d.nextLayerWidthDiff<0)?"":"-40px").style("bottom",(d)=>(d.nextLayerWidthDiff>=0)?"":"-40px").text(function(d){return "L "+d.index+" to "+(d.index+1)+", e: "+d.edgesToNextLayer+", d: "+d.nextInterlayerDensity.toString().substring(0,5);});
		//remove last redundant element
		//let lastLayer=containerElem.lastElementChild;lastLayer.removeChild(lastLayer.lastElementChild);
		if (!this.trapezoidArrow) {
			this.trapezoidArrow = container.append("div").attr("class", "chosen-arrow").style("position", "absolute").style("font-size", "small").text("\u2192").style("left", "0px").style("visibility", "hidden").style("transform", "translateY(-50%)");
			this.showTrapezoidArrow = (i) => {
				this.trapezoidArrow.style("visibility", "");
				if (i !== undefined) {
					let pos = height - values[i].cumulativeHeightInPixels;//-2;
					this.trapezoidArrow.style("top", pos + "px");
					this.trapezoidArrow.style("left", Math.max(0, Math.floor((width - values[i].widthInPixels) / 2 - 15)) + "px");
				}
			};
			this.hideTrapezoidArrow = () => {
				this.trapezoidArrow.style("visibility", "hidden");
			}
		}
		this.hideTrapezoidArrow();
		if (callback) {
			barsSelection.on("click", (d, i) => {
				callback(d);
				this.showTrapezoidArrow(i);
			});
		} else {
			barsSelection.on("click", (d, i) => {
				this.showTrapezoidArrow(i);
			});
		}

	},

});

function drawPlot(xName, yName, xValues, yValues, svgSelection, totalWidth, totalHeight) {

	var margin = {top: 3, right: 25, bottom: 20, left: 25},
		width = totalWidth - margin.left - margin.right,
		height = totalHeight - margin.top - margin.bottom;

	//var xValue = function(d) { return d.Calories;}, // data -> value
	let xScale = d3.scaleLinear().range([0, width]); // value -> display

	let xAxis = d3.axisBottom().scale(xScale).ticks(3, ".0s");

	// setup y
	//var yValue = function(d) { return d["Protein (g)"];}, // data -> value
	yScale = d3.scaleLinear().range([height, 0]), // value -> display
		//yMap = function(d) { return yScale(yValue(d));}, // data -> display
		yAxis = d3.axisLeft().scale(yScale).ticks(2, ".0s");


	svgSelection.selectAll("g").remove();
	let topSelection = svgSelection.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");


	// don't want dots overlapping axis, so add in buffer to data domain
	//xScale.domain([Math.max(Math.min.apply(null,xValues),2)-1, Math.max(Math.max.apply(null,xValues),2)+1]);
	xScale.domain([Math.min.apply(null, xValues) - 1, Math.max.apply(null, xValues) + 1]);
	yScale.domain([Math.min.apply(null, yValues) - 1, Math.max.apply(null, yValues) + 1]);

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
		.attr("cx", (d, i) => xScale(d))
		.attr("cy", (d, i) => yScale(yValues[i]))
		.style("fill", "#000"); //function(d) { return color(cValue(d));})

}

function degreePlot(isLog, xName, yName, input, xValues, yValues, svgSelection, totalWidth, totalHeight, id=null) {


    data = null;
    inp = null;
    out = null;
    title = "";
    if(isLog) {
        title = "Degree Distribution Log scale"
        $("#log-degree-plot").html("");
        inp = Object.keys(input).map(Math.log);
        out = Object.values(input).map(Math.log);
        data = d3.range(Object.keys(input).length).map((d, i) => ({
            x: Math.log(parseInt(Object.keys(input)[i])),
            y: Math.log(Object.values(input)[i]),
            id: parseInt(Object.keys(input)[i]),
            label: `Degree ${Object.keys(input)[i]}`,
        }));
    } else if(id){
        inp = Object.keys(input);
        title = "|V| to |CC|" + " ,|V| = [" + Math.min(...inp) +","+ Math.max(...inp)+"]"
        $("#cc-plot").html("");
        inp = Object.keys(input);
        out = Object.values(input);
        data = d3.range(Object.keys(input).length).map((d, i) => ({
            x: parseInt(Object.keys(input)[i]),
            y: Object.values(input)[i],
            id: parseInt(Object.keys(input)[i]),
            label: `test}`,
        }));
    } else {
        title = "Degree Distribution"
        $("#degree-plot").html("");
        inp = Object.keys(input);
        out = Object.values(input);
        data = d3.range(Object.keys(input).length).map((d, i) => ({
            x: parseInt(Object.keys(input)[i]),
            y: Object.values(input)[i],
            id: parseInt(Object.keys(input)[i]),
            label: `Degree ${Object.keys(input)[i]}`,
        }));
    }

    // outer svg dimensions
    const width = 250;
    const height = 150;

// padding around the chart where axes will go
    const padding = {
        top: 20,
        right: 20,
        bottom: 40,
        left: 30,
    };
    // inner chart dimensions, where the dots are plotted
    const plotAreaWidth = width - padding.left - padding.right;
    const plotAreaHeight = height - padding.top - padding.bottom;

// radius of points in the scatterplot
    const pointRadius = 3;
    const xScale = d3.scaleLinear().domain([Math.min(...inp), Math.max(...inp)]).range([0, plotAreaWidth]);
    const yScale = d3.scaleLinear().domain([Math.min(...out), Math.max(...out)]).range([plotAreaHeight, 0]);
    const colorScale = d3.scaleLinear().domain([Math.min(...inp), Math.max(...inp)]).range(['#f7b6ab','#8d0089']);
    // select the root container where the chart will be added
    container = null;
    if(isLog) {
        container = d3.select('#log-degree-plot');
    } else if(id){
        container = d3.select('#cc-plot');
    } else {
        container = d3.select('#degree-plot');
    }

// initialize main SVG
    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height);

// the main g where all the chart content goes inside
    const g = svg.append('g')
        .attr('transform', `translate(${padding.left} ${padding.top})`);
    // add in axis groups
    const xAxisG = g.append('g').classed('x-axis', true)
        .attr('transform', `translate(0 ${plotAreaHeight + pointRadius})`);

// x-axis label
    g.append('text')
        .attr('transform', `translate(${plotAreaWidth / 2} ${plotAreaHeight + (padding.bottom)})`)
        .attr('dy', -4) // adjust distance from the bottom edge
        .attr('class', 'axis-label')
        .attr('text-anchor', 'middle')
        .text(title);

    const yAxisG = g.append('g').classed('y-axis', true)
        .attr('transform', `translate(${-pointRadius} 0)`);


// set up axis generating functions
    const xTicks = Math.round(plotAreaWidth/50);
    const yTicks = Math.round(plotAreaHeight / 50);

    const xAxis = d3.axisBottom(xScale)
        .ticks(xTicks)
        .tickSizeOuter(0);
    const yAxis = d3
        .axisLeft(yScale)
        .ticks(yTicks)
        .tickSizeOuter(0);

// draw the axes
    yAxisG.call(yAxis);
    xAxisG.call(xAxis);
    // add in circles
    const circles = g.append('g').attr('class', 'circles');

    const binding = circles.selectAll('.data-point').data(data, d => d.id);

    binding.enter().append('circle')
        .classed('data-point', true)
        .attr('r', pointRadius)
        .attr('cx', d => xScale(d.x))
        .attr('cy', d => yScale(d.y))
        .attr('fill', d => colorScale(d.y));
    const voronoiDiagram = d3.voronoi()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
        .size([plotAreaWidth, plotAreaHeight])(data);
    // limit how far away the mouse can be from finding a Voronoi site
    const voronoiRadius = plotAreaWidth / 10;

// add a circle for indicating the highlighted point
    g.append('text')
        .attr('class', 'highlight-circle')
        .style('fill', 'none')
        .style('position','relative')
        .style('display', 'none');



// add the overlay on top of everything to take the mouse events
    g.append('rect')
        .attr('class', 'overlay')
        .attr('width', plotAreaWidth)
        .attr('height', plotAreaHeight)
        .style('fill', '#f00')
        .style('opacity', 0);

}
