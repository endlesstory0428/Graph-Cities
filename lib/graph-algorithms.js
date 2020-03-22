//let _Graph;
//if(typeof Graph=="undefined")_Graph=require("./graph.js");
//else _Graph=Graph;

if(typeof Graph=="undefined")Graph=require("./graph.js");
if(typeof UnionFind=="undefined")UnionFind=require("./union-find.js");
class GraphAlgorithms{
	
	static getDegrees(g){
		let vertexCount=g.vertices.length,adj=g.vertices.edges;
		let degrees=new Int32Array(vertexCount);
		for(let i=0;i<vertexCount;i++){
			degrees[i]=Object.keys(adj[i]).length;
		}
		return degrees;
	}
	
	static getFixedPointLayers(g){
		let vs = g.vertices,es = g.edges;
		let vertexCount=vs.length,edgeCount=es.length;
		let degrees=vs.degree,remainingDegrees=new Int32Array(vertexCount),tempDegrees=new Int32Array(vertexCount),edgeLayers=new Int32Array(edgeCount);
		if(!degrees)degrees=GraphAlgorithms.getDegrees(g);
		let sortedVertexIndex=new Int32Array(vertexCount),positions=new Int32Array(vertexCount);
		let layerlist=[];
		let startTime=new Date().getTime();
		if(edgeCount>100000){console.log(g.name+": calculating layers");}
		
		for (let i=0;i<vertexCount;i++) {
			remainingDegrees[i]=degrees[i];
		}
		for (let i=0;i<edgeCount;i++) {
			edgeLayers[i]=-1;
		}
		let remainingEdges=edgeCount;let done,peeled,minDegree;let peelValues;let degreeDone;
		let percentage=0,lastPercentage=0,increment=(edgeCount>1000000)?5:20;
		while(remainingEdges>0){//each iteration removes one layer of edges
			if(edgeCount>100000){//show progress for bigger graphs
				let edgesPeeled=edgeCount-remainingEdges;
				percentage=edgesPeeled/edgeCount*100;
				let incremented=false;
				while(percentage>lastPercentage+increment){lastPercentage+=increment;incremented=true;}
				if(incremented)console.log(g.name+" edges peeled "+Math.floor(percentage)+"%");
			}
			let degreeCounts=[],maxDegree=0;
			for (let i=0;i<vertexCount;i++) {
				let d=remainingDegrees[i];
				tempDegrees[i]=d;//temp degree is changed during the core decomposition, remaining degree is set when a core is removed
				//bin sort
				if(d>maxDegree)maxDegree=d;
				if(d in degreeCounts==false)degreeCounts[d]=0;
				degreeCounts[d]++;
			}
			let binStarts=[0];
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
				let vEdges=vs.edges[vID];
				for(let uID in vEdges){
					if(edgeLayers[vEdges[uID]]!==-1)continue;
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
			if(edgeCount>100000)console.log("found layer "+coreDegree);
			for(let i=binStarts[coreDegree];i<vertexCount;i++){//mark edges only
				let vID=sortedVertexIndex[i];let vEdges=vs.edges[vID];
				for(let uID in vEdges){
					if(tempDegrees[uID]==coreDegree){
						let eID=vEdges[uID],e=es[eID];if(edgeLayers[eID]!==-1){continue;}
						edgeLayers[eID]=coreDegree;remainingEdges--;
						if(coreDegree==0){console.log("Error: peeling min degree 0 at edge "+vID+","+uID);throw Error(tempDegrees);}
						remainingDegrees[vID]--;remainingDegrees[uID]--;
					}
				}
			}
		}
		let endTime=new Date().getTime();
		if(edgeCount>100000)console.log(g.name+": calculated layers in "+(endTime-startTime)+"ms");
		return edgeLayers;
	}
	
	static DFSHelper(vID,ccID,ccIDs,adjList,partition){//partition is an array (mapping from vertices to some value), and DFS will only go to neighbors with the same value. it assumes adjlist[vID] are the edges of that vertex, and does not work with clones unless clones.edges is passed(and then partition (on vertices) cannot be used, no edge partition is needed and only the caller knows the partition value)
		//ccIDs should be an int32 array, and entries should be initialized to -1.
		if(ccIDs[vID]!=-1){throw Error();}//if(vID in ccIDs){throw Error();}
		let stack=[],cc=[];
		stack.push(vID);let partitionID;
		if(partition){if(partition.length!=ccIDs.length)throw Error();partitionID=partition[vID];}//edge partition needs different arguments (clones and clone values) so not supported here
		ccIDs[vID]=-2;//temp value means it's pushed to the stack but not popped yet 
		
		let edgeCount=0;
		while(stack.length>0){
			let newNodeID=stack.pop();
			ccIDs[newNodeID]=ccID;
			cc.push(newNodeID);
			let vEdges=adjList[newNodeID];//usually graph.vertices.edges, could be clones.edges
			for(let neighborID in vEdges){
				if(ccIDs[neighborID]!=-1){
					if(ccIDs[neighborID]==-2){
						edgeCount++;
					}
					continue;
				}
				if(partition&&(partition[neighborID]!=partitionID))continue;
				edgeCount++;
				ccIDs[neighborID]=-2;
				stack.push(Number(neighborID));
			}
		}
		cc.edgeCount=edgeCount;
		return cc;
	}
	

	
	static getCCIDs(g){
		let vs=g.vertices,es=g.edges,sources=es.source,targets=es.target;
		let ccIDs=new Int32Array(vs.length);
		var forest = new UnionFind(vs.length);
		for(var i=0; i<es.length; ++i) {
		  forest.link(sources[i], targets[i])
		}

		for(var i=0; i<vs.length; ++i) {
		  ccIDs[i] = forest.find(i);
		}
		/*
		ccIDs.fill(-1);
		let CCCount=0;
		for(let vID=0;vID<vs.length;vID++){
			if(ccIDs[vID]!=-1)continue;
			let ccID=CCCount;
			GraphAlgorithms.DFSHelper(vID,ccID,ccIDs,vs.edges);
			CCCount++;
		}
		*/
		return ccIDs;
	}
	static getCCsAndCCIDs(g){
		let vs=g.vertices,es=g.edges,sources=es.source,targets=es.target;
		let ccIDs=new Int32Array(vs.length);
		/*ccIDs.fill(-1);
		let CCs=[];
		for(let vID=0;vID<vs.length;vID++){
			if(ccIDs[vID]!=-1)continue;
			let ccID=CCs.length;
			let cc=GraphAlgorithms.DFSHelper(vID,ccID,ccIDs,vs.edges);
			let V=cc.length,E=cc.edgeCount;
			CCs.push({vertexList:cc,index:ccID,"V":V,"E":E});//now we use V for |V| and E for |E| in all properties for easier typing
		}
		*/
		
		let count=0;
		var forest = new UnionFind(vs.length);
		for(var i=0; i<es.length; ++i) {
		  forest.link(sources[i], targets[i])
		}
		let ccs={};
		for(var i=0; i<vs.length; ++i) {
			let ccID = forest.find(i);
			ccIDs[i]=ccID;
			if(ccID in ccs==false){
				ccs[ccID]={vertexList:[],index:count,V:0,E:0};
				count++;
			}
			let cc=ccs[ccID];
			cc.vertexList.push(i);
			cc.V++;
			
		}
		for(var i=0; i<vs.length; ++i) {
			let ccID = ccIDs[i];
			let cc=ccs[ccID];
			for(let other of g.getNeighbors(i)){
				if(ccIDs[other]!=ccID){throw Error();}
				if(other>i){cc.E++;}
			}
		}
		return {CCs:Object.values(ccs),ccIDs:ccIDs};
	}
	static getInducedSubgraph(g,chosenVertices){//chosenVertices are indices

		let vs=g.vertices,vIDs=g.vertices.id,es=g.edges,sources=es.source,targets=es.target;
		let subgraph=new Graph();
		
		if(Array.isArray(chosenVertices)){
			let temp=chosenVertices;
			chosenVertices={};
			for(let index of temp){chosenVertices[index]=true;}
		}

		for(let index in chosenVertices){
			subgraph.addVertex(vIDs[index]);
			for(let other of g.getNeighbors(index)){
				if(other in chosenVertices){
					subgraph.addEdge(vIDs[index],vIDs[other]);
				}
			}
		}
		
		return subgraph;
	}
	static getFilteredSubgraph(g,propertyName,targetValue,propertyOwner){//or a property array can be given instead of propertyName
		let vs=g.vertices,vIDs=g.vertices.id,es=g.edges,sources=es.source,targets=es.target;
		let subgraph=new Graph();
		let values;
		let func=targetValue;if(typeof targetValue!="function"){func=(x)=>(x==targetValue);}
		if(typeof propertyName=="object"){
			values=propertyName;
			//detect type if possible
			if(!propertyOwner){
				if(values.length==g.vertices.length)propertyOwner="vertices";
				else if(values.length==g.edges.length)propertyOwner="edges";
				else throw Error("no valid property owner");
			}
		}
		else{
			
			if(!propertyOwner){
				if(propertyName in g.vertices)propertyOwner="vertices";
				else if(propertyName in g.edges)propertyOwner="edges";
				else throw Error("no valid property owner");
			}
			if(propertyOwner != "neighbors") {
                values = g[propertyOwner][propertyName];
            }
		}
		
		if(propertyOwner=="vertices"){
			for(let index=0;index<vs.length;index++){
				if(func(values[index])){
					subgraph.addVertex(vIDs[index]);
					for(let other of g.getNeighbors(index)){
						if(func(values[other])){
							subgraph.addEdge(vIDs[index],vIDs[other]);
						}
					}
				}
			}
		}
		else if(propertyOwner=="egonet") {
		            let initData = {
                            nodes: [],
                            links: []
		            };
                    subgraph.initData={}
                    for(let j in getProperty(g.vertices,propertyName,"edges")){
                        if(j!= propertyName) {
                            subgraph.addVertex(j)
                            initData.nodes.push({id: j, label:G.view.graph.labels?G.view.graph.labels.find(record => record.new_id ==j ).name:j})
                        }
                    }
                    for(let i=0;i<g.edges.length;i++){
                        let s=g.edges.source[i],t=g.edges.target[i];
                        if(Object.keys(subgraph.vertexMap).indexOf(s.toString())!=-1 && Object.keys(subgraph.vertexMap).indexOf(t.toString())!=-1  ){
                            subgraph.addEdge(s,t);

                            initData.links.push({
                                source: s.toString(),
                                target: t.toString()
                            })
                        }
                    }
			subgraph.initData = initData;
			g.egonet = subgraph;
            g.egonetMap[propertyName] = subgraph;
			subgraph.subgraphType="egonet";
			subgraph.subgraphID=propertyName;
		} else if(propertyOwner == "neighbors") {
            let initData = {
                nodes: [],
                links: []
            };
            subgraph.initData={}
            for(let j in g.getNeighbors(propertyName)){
                    subgraph.addVertex(j)
                    initData.nodes.push({id: j, label:G.view.graph.labels?G.view.graph.labels.find(record => record.new_id ==j ).name:j})
            }
            for(let i=0;i<g.edges.length;i++){
                let s=g.edges.source[i],t=g.edges.target[i];
                if(Object.keys(subgraph.vertexMap).indexOf(s.toString())!=-1 && Object.keys(subgraph.vertexMap).indexOf(t.toString())!=-1  ){
                    subgraph.addEdge(s,t);

                    initData.links.push({
                        source: s.toString(),
                        target: t.toString()
                    })
                }
            }
            subgraph.initData = initData;
            g.egonet = subgraph;
            g.egonetMap[propertyName] = subgraph;
            subgraph.subgraphType="neighbors";
            subgraph.subgraphID=propertyName;

        } else{
			for(let index=0;index<es.length;index++){
				if(func(values[index])){
					subgraph.addEdge(vIDs[sources[index]],vIDs[targets[index]]);
					
				}
			}
		}
		return subgraph;
	}
	static getVertexPartition(g,partition,options={}){//noTrivialSubgraphs:false to disable it
		//to avoid saving unnecessary subgraphs, isolated vertices are represented as v_<index> in the metagraph. for outside usage, subgraphs still include them, but they are not saved as subgraphs by default.
		//returns all subgraphs, and a metagraph, and the partition summary etc
		let vs=g.vertices,vIDs=g.vertices.id,es=g.edges,sources=es.source,targets=es.target;
		let subgraphs={};//OK if values are not continuous
		let metagraph=new Graph();//metagraph.name="metagraph"//the subgraph prefix of the metagraph is set by the caller
		metagraph.vertices.addProperty("V");metagraph.vertices.addProperty("isMetanode");metagraph.vertices.addProperty("E");metagraph.edges.addProperty("E");
		for(let vID=0;vID<vs.length;vID++){
			let value=partition[vID];
			if(!(value in subgraphs)){
				subgraphs[value]=new Graph();//subgraphs[value].name="subgraph"+value;
				subgraphs[value].subgraphID=value;
			}
			subgraphs[value].addVertex(vIDs[vID]);
		}
		let isolatedMap={};
		for(let value in subgraphs){
			if((options.noTrivialSubgraphs!==false)&&subgraphs[value].vertices.length==1){
				let vID=g.getSubgraphVertices(subgraphs[value])[0];
				let metanodeID=metagraph.addVertex("v_"+vID);
				metagraph.vertices.isMetanode[metanodeID]=false;
				isolatedMap[value]="v_"+vID;
			}
			else{let metanodeID=metagraph.addVertex(value);}
		}
		for(let eID=0;eID<es.length;eID++){
			let s=sources[eID],t=targets[eID],sID=vIDs[s],tID=vIDs[t];
			let svalue=partition[s],tvalue=partition[t];
			if(svalue in isolatedMap)svalue=isolatedMap[svalue];//use the v_id for 1-vertex subgraphs
			if(tvalue in isolatedMap)tvalue=isolatedMap[tvalue];
			if(svalue==tvalue){
				subgraphs[svalue].addEdge(sID,tID);
			}
			else{
				let metaedgeID=metagraph.getEdgeByID(svalue,tvalue);
				if(metaedgeID==undefined){
					metaedgeID=metagraph.addEdge(svalue,tvalue);
				}
				let oldE=metagraph.edges.E[metaedgeID];if(!oldE)oldE=0;
				metagraph.edges.E[metaedgeID]=oldE+1;
			}
		}
		for(let value in subgraphs){
			if((options.noTrivialSubgraphs!==false)&&subgraphs[value].vertices.length==1)continue;
			let metanodeID=metagraph.getVertexByID(value);
			metagraph.vertices.V[metanodeID]=subgraphs[value].vertices.length;
			metagraph.vertices.E[metanodeID]=subgraphs[value].edges.length;
		}
		//the subgraphs shoudl be treated as a map, not a 
		return {subgraphs:subgraphs,metagraph:metagraph}
	}
	/*static getVertexPartitionGenerator(g,partition){
		//returns all subgraphs, and a metagraph, and the partition summary etc
		let vs=g.vertices,vIDs=g.vertices.id,es=g.edges,sources=es.source,targets=es.target;
		let subgraphVertexLists={};//OK if values are not continuous
		let metagraph=new Graph();//metagraph.name="metagraph"//the subgraph prefix of the metagraph is set by the caller
		metagraph.vertices.addProperty("V");metagraph.vertices.addProperty("E");metagraph.edges.addProperty("E");
		for(let vID=0;vID<vs.length;vID++){
			let value=partition[vID];
			if(!(value in subgraphVertexLists)){subgraphVertexLists[value]=[];}
			subgraphVertexLists[value].push(vID);
		}
		for(let eID=0;eID<es.length;eID++){
			let s=sources[eID],t=targets[eID],sID=vIDs[s],tID=vIDs[t];
			let svalue=partition[s],tvalue=partition[t];
			if(svalue==tvalue){
				subgraphs[svalue].addEdge(sID,tID);
			}
			else{
				let metaedgeID=metagraph.getEdgeByID(svalue,tvalue);
				if(metaedgeID==undefined){
					metaedgeID=metagraph.addEdge(svalue,tvalue);
				}
				let oldE=metagraph.edges.E[metaedgeID];if(!oldE)oldE=0;
				metagraph.edges.E[metaedgeID]=oldE+1;
			}
		}
		for(let value in subgraphs){
			let metanodeID=metagraph.getVertexByID(value);
			metagraph.vertices.V[metanodeID]=subgraphs[value].vertices.length;
			metagraph.vertices.E[metanodeID]=subgraphs[value].edges.length;
		}
		//the subgraphs shoudl be treated as a map, not a 
		return {subgraphs:subgraphs,metagraph:metagraph}
	}*/
	static getEdgePartition(g,partition,options={}){//this does not have the option to skip single edges because it basically only makes sense for BCCs, and it would be confusing without the non-metanodes for shared vertices.
	
		//returns all subgraphs, and a metagraph, and the partition summary etc
		//subgraphs should follow the ids in the original graph (can be used to query semantics). there's no vList?
		//the subgraphs are produced in a map or array. 
		//the metagraph has all layers as metanodes and sharing of vertices as metaedges.
		
		let vs=g.vertices,vIDs=g.vertices.id,es=g.edges,sources=es.source,targets=es.target;
		let layers={};//OK if values are not continuous
		let metagraph=new Graph();metagraph.vertices.addProperty("V","int");metagraph.vertices.addProperty("E","int");metagraph.edges.addProperty("E","int");
		let vertexProfile=new Array(vs.length);for(let i=0;i<vertexProfile.length;i++){vertexProfile[i]={};}
		for(let eID=0;eID<es.length;eID++){
			if(!(eID in partition))throw Error("invalid edge partition value at "+eID);
			let value=partition[eID];
			if(!(value in layers)){
				layers[value]=new Graph();layers[value].subgraphID=value;
			}
			let layer=layers[value],s=sources[eID],t=targets[eID],sID=vIDs[s],tID=vIDs[t];
			layer.addEdge(sID,tID);
			if(!(value in vertexProfile[s])){vertexProfile[s][value]=0;}vertexProfile[s][value]++;
			if(!(value in vertexProfile[t])){vertexProfile[t][value]=0;}vertexProfile[t][value]++;
		}
		for(let l in layers){
			let subgraph=layers[l];
			let metanodeID=metagraph.addVertex(l);
			metagraph.vertices.V[metanodeID]=subgraph.vertices.length;
			metagraph.vertices.E[metanodeID]=subgraph.edges.length;
			//the expanded data path of meta vertices is saved when the subgraphs are saved, not here
			//some info need to be added outside by the caller, since this function doesn't know the name of the partition/subgraphs
			
		}
		for(let vID=0;vID<vs.length;vID++){
			let profile=vertexProfile[vID];
			for(let l in profile){
				for(let l2 in profile){
					if(Number(l2)>=Number(l))break;
					let metaedgeID=metagraph.getEdgeByID(l,l2);
					if(metaedgeID==undefined){
						metaedgeID=metagraph.addEdge(l,l2);
					}
					let oldE=metagraph.edges.E[metaedgeID];if(!oldE)oldE=0;
					metagraph.edges.E[metaedgeID]=oldE+1;
				}
			}
		}
		return {subgraphs:layers,metagraph:metagraph,vertexProfile:vertexProfile};
	}
	
	static getBCCPartition(g,partition,articulationPoints){//articulationPoints is a map; whenever a BCC contains one of these, the metagraph creates an edge from the BCC to the point
		//the subgraphs are produced in a map or array. 
		//the metagraph connects BCCs to the articulation points, not directly between BCCs
		//but I think if a BCC is one edge, it should just be represented as an edge.
		
		let vs=g.vertices,vIDs=g.vertices.id,es=g.edges,sources=es.source,targets=es.target;
		let BCCs={};//OK if values are not continuous
		let metagraph=new Graph();metagraph.vertices.addProperty("V","int");metagraph.vertices.addProperty("E","int");metagraph.vertices.addProperty("isMetanode");metagraph.edges.addProperty("E","int");
		let vertexProfile=new Array(vs.length);for(let i=0;i<vertexProfile.length;i++){vertexProfile[i]={};}
		for(let eID=0;eID<es.length;eID++){
			if(!(eID in partition))throw Error("invalid edge partition value at "+eID);
			let value=partition[eID];
			if(!(value in BCCs)){
				BCCs[value]=new Graph();BCCs[value].subgraphID=value;
			}
			let BCC=BCCs[value],s=sources[eID],t=targets[eID],sID=vIDs[s],tID=vIDs[t];
			BCC.addEdge(sID,tID);
			if(!(value in vertexProfile[s])){vertexProfile[s][value]=0;}vertexProfile[s][value]++;
			if(!(value in vertexProfile[t])){vertexProfile[t][value]=0;}vertexProfile[t][value]++;
		}
		for(let l in BCCs){
		
			let subgraph=BCCs[l];
			if(subgraph.edges.length==1){
				//add edge between articulation points only
				let vIDs=g.getSubgraphVertices(subgraph);//Indices in the original graph
				let sID=vIDs[0],tID=vIDs[1];
				let metaedgeID=metagraph.addEdge("AP_"+sID,"AP_"+tID);
				delete BCCs[l];
				continue;
			}
			let metanodeID=metagraph.addVertex(l);
			metagraph.vertices.V[metanodeID]=subgraph.vertices.length;
			metagraph.vertices.E[metanodeID]=subgraph.edges.length;
			//the expanded data path of meta vertices is saved when the subgraphs are saved, not here
			//some info need to be added outside by the caller, since this function doesn't know the name of the partition/subgraphs
			
		}
		for(let vID=0;vID<vs.length;vID++){
			let profile=vertexProfile[vID];
			if(Object.keys(profile).length>1){//is an articulation point
				let apid=metagraph.addVertex("AP_"+vID);
				metagraph.vertices.isMetanode[apid]=false;
				for(let l in profile){
					if(l in BCCs==false)continue;//skip 1-edge BCCs
					let metaedgeID=metagraph.addEdge(l,"AP_"+vID);
					metagraph.edges.E[metaedgeID]=profile[l];
				}
			}
		}
		return {subgraphs:BCCs,metagraph:metagraph,vertexProfile:vertexProfile};
	}
	
	static getVertexCCPartition(g,values){
		//a two-level metagraph and subgraphs where the first level is a vertex property and the second is CCs within the subgraphs
		let result=GraphAlgorithms.getVertexPartition(g,values);
		
		let vertexCCIDs=new Array(g.vertices.length);for(let i=0;i<vertexCCIDs.length;i++){vertexCCIDs[i]=-1;}
		let metagraph=new Graph();metagraph.vertices.addProperty("V","int");metagraph.vertices.addProperty("E","int");metagraph.vertices.addProperty("originalValue","int");metagraph.vertices.addProperty("isMetanode");//subgraph ccs tend to contain isolated vertices, so don't save them as subgraphs
		metagraph.edges.addProperty("E");
		let subgraphCCSummary={};
		let subgraphCCids=new Int32Array(g.vertices.length);//save this for later use?
		let subgraphCCs={};
		let subgraphCCMetagraphs={};
		let globalCCCount=0;
		let subgraphs=result.subgraphs;
		for(let ID in subgraphs){
			let subgraph=subgraphs[ID];
			
			let ccids=Algs.getCCIDs(subgraph);
			subgraph.vertices.addProperty("cc","int",ccids);
			let subgraphID=subgraph.subgraphID;
			let subgraphCCCount=0;
			let result=Algs.getVertexPartition(subgraph,ccids);
			
			for (let ccID in result.subgraphs){
				let cc=result.subgraphs[ccID];
				let vertexList=g.getSubgraphVertices(cc);//get vertex indices of the original graph
				let ccPath;
				if(vertexList.length==1){
					//isolated, use v_<old index>as the ID, and don't save the subgraph
					ccPath="v_"+vertexList[0];
					let metanodeID=metagraph.addVertex(ccPath);//the ID can serve as the subgraph path
					metagraph.vertices.V[metanodeID]=cc.vertices.length;
					metagraph.vertices.E[metanodeID]=cc.edges.length;
					metagraph.vertices.originalValue[metanodeID]=subgraphID;
					metagraph.vertices.isMetanode[metanodeID]=false;
					vertexCCIDs[vertexList[0]]=ccPath;
				}
				else{
					ccPath=subgraphID+"/CC/"+ccID;
					let metanodeID=metagraph.addVertex(ccPath);//the ID can serve as the subgraph path
					metagraph.vertices.V[metanodeID]=cc.vertices.length;
					metagraph.vertices.E[metanodeID]=cc.edges.length;
					metagraph.vertices.originalValue[metanodeID]=subgraphID;
					for(let vID of vertexList){
						vertexCCIDs[vID]=Number(ccID);//not using global CC count because we need the local ccid
					}
				}
				
				let thisCCID=ccID;//globalCCCount;
				//mark edges to outside CCs that come before this one
				for(let vID of vertexList){
					subgraphCCids[vID]=globalCCCount;
					for(let otherID of g.getNeighbors(vID)){
						let otherCCID=vertexCCIDs[otherID];
						let otherValue=values[otherID];
						if(otherCCID==-1)continue;
						if(otherCCID==thisCCID&&otherValue==subgraphID)continue;
						let otherccPath=otherValue+"/CC/"+otherCCID;
						if(typeof otherCCID=="string")otherccPath=otherCCID;//the other CC is one vertex
						let metaedgeID=metagraph.getEdgeByID(otherccPath,ccPath);
						if(metaedgeID==undefined){
							metaedgeID=metagraph.addEdge(otherccPath,ccPath);
						}
						let oldE=metagraph.edges.E[metaedgeID];if(!oldE)oldE=0;
						metagraph.edges.E[metaedgeID]=oldE+1;
					}
				}
				globalCCCount++;
				subgraphCCCount++;
			}
			subgraphCCs[subgraphID]=result.subgraphs;
			subgraphCCMetagraphs[subgraphID]=result.metagraph;
			//saveSubgraphs(subgraph,"CC",result.subgraphs,{skipSingleVertexSubgraphs:true});
			//if(subgraph.dataPath)result.metagraph.subgraphPrefix=subgraph.dataPath+"/CC";
			//saveMetagraph(subgraph,"CC",result.metagraph);
			//saveSummary(subgraph);//update its metagraph records
			subgraphCCSummary[subgraphID]={};//subgraph.subgraphs.CC;//distrbutions and large CC IDs, but only exist if the subgraphs are saved
			subgraphCCSummary[subgraphID].ccCount=subgraph.vertices.length;//add layer V and E
			subgraphCCSummary[subgraphID].V=subgraph.vertices.length;//add layer V and E
			subgraphCCSummary[subgraphID].E=subgraph.edges.length;
		}
		//if(g.dataPath)metagraph.subgraphPrefix=g.dataPath+"/wave";
		//saveMetagraph(g,"waveCC",metagraph);//saves both topology and all property files
		
		//g.vertices.addProperty("waveCCid","int",subgraphCCids);
		//saveProperty(g,"vertices","waveCCid");
		
		//save the top level summary: the cc distributions per wave, and the IDs of large ccs in teh distribution (needed?)
		return {metagraph:metagraph,subgraphCCSummary:subgraphCCSummary,subgraphCCids:subgraphCCids,subgraphCCs:subgraphCCs,subgraphCCMetagraphs:subgraphCCMetagraphs};
	}
	
	static getMetaedgeWeights(g){
		let Vs=g.vertices.V;
		let Es=g.edges.E;
		let ss=g.edges.source;
		let ts=g.edges.target;
		if(!(Vs&&Es))throw Error();
		g.edges.addProperty("weight","float");
		let weights=g.edges.weight;
		for(let eid=0;eid<g.edges.length;eid++){
			let sV=Vs[ss[eid]],tV=Vs[ts[eid]],E=Es[eid];
			weights[eid]=E/(sV*tV);
		}
		return weights;
		
	}
	static shortestPathHelper(g,visited,prev,queue,t){
		let hasTarget=((t!==undefined)&&(t!=null));
		let multiTarget=(typeof t=="object");
		while(queue.length>0){
			let current=queue.shift();
			let currentVertex=g.vertices[current];
			for(let n in g.vertices.edges[current]){
				
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
	}

	
	static shortestPath(g,s,t){//if there's no t, return the shortest path network from s
	
		let hasTarget=((t!==undefined)&&(t!=null));
		let multiTarget=(typeof t=="object");
		let visited=new Array(g.vertices.length);
		let prev=new Array(g.vertices.length);
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
		GraphAlgorithms.shortestPathHelper(g,visited,prev,queue,t);
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
			
	}
	
	
	static getVertexWavesAndLevels(g,newXRayWaves=true){
		let startTime=new Date().getTime();
		
		let vs = g.vertices, es = g.edges,vertexCount=vs.length;
		let degrees=vs.degree,tempDegrees=new Int32Array(vertexCount),tempDegrees2=new Int32Array(vertexCount);
		if(!degrees)degrees=GraphAlgorithms.getDegrees(g);
		let firstSeen=new Int32Array(vertexCount);
		
		for (let i=0;i<vertexCount;i++) {
			tempDegrees[i]=degrees[i];
			tempDegrees2[i]=degrees[i];
			firstSeen[i]=-1;
		}
		
		let degreeCounts=[],maxDegree=0;
		for (let i=0;i<vertexCount;i++) {
			let d=tempDegrees[i];
			if(d>maxDegree)maxDegree=d;
			if(d in degreeCounts==false)degreeCounts[d]=0;
			degreeCounts[d]++;
		}
		let binStarts=[0],sortedVertexIndex=[],positions=[];
		for(let i=1;i<=maxDegree;i++){
			binStarts[i]=binStarts[i-1]+(degreeCounts[i-1]?degreeCounts[i-1]:0);
		}
		for (let i=0;i<vertexCount;i++) {
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
		let markers=[],minDegree=tempDegrees[sortedVertexIndex[0]],marker=vertexCount-1;
		let markerIsEndOfPhase={};
		let markerMinDegrees=[];
		for (let i=0;i<vertexCount;i++) {
			let vID=sortedVertexIndex[i];
			let d=tempDegrees[vID];
			if(d>minDegree){marker=i-1;break;}
		}
		markers.push(marker);//if it's the last position it's OK
		markerMinDegrees.push(minDegree);
		
		for (let i=0;i<vertexCount;i++) {
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
					for (j=i;j<vertexCount;j++) {
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
			for(let uID of g.getNeighbors(vID)){
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
		for (let i=0;i<vertexCount;i++) {
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
			for(let uID of g.getNeighbors(vID)){
				//count edges to vertices of higher interlayers
				let du=tempDegrees[uID],posu=positions[uID];
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
		
		let waves=[];let newWave={originalWave:0,firstLayer:0,isMetanode:true,"|V|":0,vertexCount:0,edges:{},waveLayers:[],startingVertexCount:0,endingVertexCount:0,middleVertexCount:0,endingNextWaveVertexCount:0,startingToMiddleEdgeCount:0,middleToEndingEdgeCount:0,startingToEndingEdgeCount:0};
		let waveMap={};let waveEdges=[];
		for(let i=0;i<layerSummary.length;i++){
			let l=layerSummary[i];
			
			//{currentDegree:currentDegree,v:layerVertexCount,e:edgeCount,prevNeighborCount:Object.keys(prevNeighbors).length,forwardEdges:forwardEdgeCount,forwardEdgeDetails:forwardEdgeDetails,layerMinDegree:layerMinDegree,isEndOfPhase:markerIsEndOfPhase[markerID]}
			if(newWave.waveLayers.length==0){
				newWave.startingVertexCount=l.v;
			}
			else{newWave.middleVertexCount+=l.v;}//endingVertexCount uses layer edge details
			waveMap[i]=waves.length;
			newWave["|V|"]+=l.v;
			newWave.vertexCount+=l.v;
			newWave.waveLayers.push(l);
			l.wave=waves.length;
			if(l.isEndOfPhase){
				newWave.lastLayer=i;waves.push(newWave);newWave={originalWave:waves.length,firstLayer:i+1,isMetanode:true,"|V|":0,vertexCount:0,edges:{},waveLayers:[],startingVertexCount:0,endingVertexCount:0,middleVertexCount:0,endingNextWaveVertexCount:0,startingToMiddleEdgeCount:0,middleToEndingEdgeCount:0,startingToEndingEdgeCount:0};
			}
		}
		waves.push(newWave);newWave.lastLayer=layerSummary.length-1;//last wave
		
		for(let i=0;i<layerSummary.length;i++){
			let l=layerSummary[i];let thisWave=waveMap[i];
			for(let otherLayer in l.forwardEdgeDetails){
				let otherWave=waveMap[otherLayer];
				if(otherWave!=thisWave){
					if((thisWave in waves[otherWave].edges)==false){let e={s:thisWave,t:otherWave,edgeCount:0};waves[otherWave].edges[thisWave]=waveEdges.length;waves[thisWave].edges[otherWave]=waveEdges.length;waveEdges.push(e);}
					waveEdges[waves[otherWave].edges[thisWave]].edgeCount+=l.forwardEdgeDetails[otherLayer];
				}
				/* //do we need the edge counts between these vertices?
				if(i==waves[thiswave].firstLayer){
					if(otherWave!=thisWave){waves[thisWave].startingToEndingEdgeCount+=l.forwardEdgeDetails[otherLayer];}
					else{waves[thisWave].startingToMiddleEdgeCount+=l.forwardEdgeDetails[otherLayer];}
				}
				else{
					if(otherWave!=thisWave){waves[thisWave].startingToEndingEdgeCount+=l.forwardEdgeDetails[otherLayer];}
					else{waves[thisWave].startingToMiddleEdgeCount+=l.forwardEdgeDetails[otherLayer];}
				}
				*/
			}
		}
		
		
		
		let vertexWaves=new Array(vertexCount);
		let wavesIds = []
		for(let i=0;i<vertexCount;i++){vertexWaves[i]=waveMap[vertexLayers[i]];}
		//get ending vertex count of waves: test each vertex and add to the ending vertex count for all waves that touch it
		for (let vID=0;vID<vertexCount;vID++) {
			let thiswave=vertexWaves[vID];
			if(wavesIds.indexOf(thiswave) === -1 ) wavesIds.push(thiswave)
			let otherWavesMap={};
			for(let uID of g.getNeighbors(vID)){
				let otherwave=vertexWaves[uID];
				if(otherwave<thiswave&&(!otherWavesMap[otherwave])){
					waves[otherwave].endingVertexCount++;
					if(otherwave==thiswave-1){waves[otherwave].endingNextWaveVertexCount++;}
					otherWavesMap[otherwave]=true;
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
		vertexWaves:vertexWaves,
		layerSummary:layerSummary,
		firstSeen:firstSeen,
		waves:waves,
		waveMap:waveMap,
		waveEdges:waveEdges,
		wavesIds:wavesIds,
		numWaves:wavesIds.length,

		};
	}
	
	
	static getBCCsAndArticulationPoints(g){//I think it should assign edge BCC values and find articulation points at the same time
		
		let vs = g.vertices, es = g.edges,vertexCount=vs.length,edgeCount=es.length;
		let pre=new Int32Array(vertexCount),low=new Int32Array(vertexCount),visited2=new Int32Array(vertexCount);
		let BCCids=new Int32Array(edgeCount);
		let nextNeighbor=new Int32Array(vertexCount);
		for(let i=0;i<vertexCount;i++){pre[i]=-1;nextNeighbor[i]=-1;}
		for(let i=0;i<edgeCount;i++){BCCids[i]=-1;}
		
		
		let stack=[];
		stack.push(0);
		let counter=0;
		let rootChildrenCount=0;let rootChildren=[];
		let articulationPoints={};
		let BCCCount=0;
		
		
		function markBCC(parentID,childID,BCCid){//starting from the edge between these two nodes, but not going beyond the parent node
			let stack2=[];
			let firsteid=g.getAdjacencyMap(parentID)[childID];
			BCCids[firsteid]=BCCid;//mark the edge between them
			stack2.push(childID);//only push this child
			while(stack2.length>0){
				let nodeID=stack2.pop();//it's OK to pop here
				visited2[nodeID]=BCCid;let edgesObj=g.getAdjacencyMap(nodeID);
				for(let otherID in edgesObj){
					//mark edge
					let eid=edgesObj[otherID];
					if(BCCids[eid]==-1){
						if(visited2[otherID]==BCCid)continue;//skip the node visited in this BCC marking run; if it's visited, all its edges are marked already
						BCCids[eid]=BCCid;
						if(otherID==parentID)continue;//don't go beyond the parent node
						
						//we can just push all children that are not already on the stack
						if(visited2[otherID]!=-2){stack2.push(otherID);visited2[nodeID]=-2;}//-2 is a temp value for "on the stack"
						//BCCid is the final value, so that value<current bccid means it has not been visited for this BCC
						
					}
					else{
						continue;//don't cross into other BCCs
					}
					
				}
				
			}
		}
		
		while(stack.length>0){
			let nodeID=stack[stack.length-1];
			if(pre[nodeID]==-1){
				pre[nodeID]=counter;counter++;
				low[nodeID]=pre[nodeID];
				nextNeighbor[nodeID]=-2;
				for(let otherID in g.getAdjacencyMap(nodeID)){
					nextNeighbor[nodeID]=otherID;break;
				}
			}
			let neighbor=nextNeighbor[nodeID];
			//that's the next neighbor the last time we checked. skip until we get an unvisited neighbor
			//-2 means it has no neighbors, -1 means it has no neighbors left
			
			if(neighbor>=0){//get the next valid neighbor. if it was just set(first neigbor), it would be found and if it was unvisited, it's not skipped. if neighbor was -1, this node would not be on the stack.
				let found=false,newNeighbor=-1;
				for(let otherID in g.getAdjacencyMap(nodeID)){//first find the old neighbor 
					if(!found){if (neighbor!=otherID)continue;else found=true;}
					if(pre[otherID]==-1){newNeighbor=otherID;nextNeighbor[nodeID]=newNeighbor;break;}//if the old neighbor was unvisited, it's still valid
					else{//look for back edge
						if(pre[otherID]<low[nodeID]){low[nodeID]=pre[otherID];}
					}
					//for neighbors not later than this one, find the next that's unvisited
				} 
				if(found==false)throw Error();
				if(newNeighbor==-1)neighbor=-1;//no remaining neighbors
			}
			
			if(neighbor<0){//no next neighbor; pass the low value to the parent
				
				//set parent's low value if this subtree had a back edge
				if(stack.length>1){//has a parent
					let parentID=stack[stack.length-2];
					if(low[nodeID]<low[parentID]){low[parentID]=low[nodeID];}
					if(low[nodeID]>=pre[parentID]){
						articulationPoints[nodeID]=true;
						//all edges in this subtree (with unassigned bccID) is a BCC
						markBCC(parentID,nodeID,BCCCount);
						BCCCount++;
					}
				}
				else{//no parent, is the root
					if(rootChildren.lngth>1){//see if the root has multiple children
						articulationPoints[nodeID]=true;
						for(let childID of rootChildren){
							markBCC(nodeID,childID,BCCCount);
							BCCCount++;
						}

					}
				}
				
				stack.pop();
			}
			else{//another unvisited child - mark next child too
				
				stack.push(neighbor);
				if(stack.length==1){rootChildren.push(neighbor);}
			}
		}
		return {BCCids:BCCids,BCCCount:BCCCount,articulationPoints:articulationPoints};
	}
	
	
	
	
	static getIterativeWaveDecomposition(g){
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
	}
	
	
	
	static getRegionGraph(setLists,options){
		switch (typeof options){
			case "string":
				let neighborRule=options;
				options={};
				switch(neighborRule){
					case "distance1":options.maxDistance=1;break;
					case "all":options.minOverlap=1;break;
					case "default":options.supersetOnly=true;break;
				}
				break;
			
				
		}
		let g=new Graph();
		let regionMap={};
		let itemSetMap=[];
		let numSets=setLists.length;
		for(let [i,list] of setLists.entries()){
			for(let [j,item] of list.entries()){
				if(!itemSetMap[item])itemSetMap[item]={};
				
				itemSetMap[item][i]=true;
			}
		}
		for(let item in itemSetMap){
			let str=bitmapToStr(itemSetMap[item]);
			if(!regionMap[str])regionMap[str]=0;
			regionMap[str]++;
		}
		g.vertices.addProperty("V","int");
		//g.vertices.addProperty("itemCount","int");
		g.vertices.addProperty("setCount","int");
		//let setCounts={};
		for(let region in regionMap){
			let vID=g.addVertex(region);
			g.vertices.V[vID]=regionMap[region];
			g.vertices.setCount[vID]=strSetCount(region);
		}
		//add edges between regions
		for(let region in regionMap){
			let candidates=[];
			let neighbors=[];
			
			if(options.maxDistance){
				if(options.maxDistance==1){
					for(let i=0;i<region.length;i++){//try extending to only 1 set not in the bitmap
						if(region[i]=="-"){
							let region2=region.substring(0,i)+"+"+region.substring(i+1,region.length);
							if(region2 in regionMap){
								neighbors.push(region2);
							}
						}
					}
				}
				else{
					for(let region2 in regionMap){//find regions that are in more sets, or exactly 1 more set, or has any overlap
						let [overlap,region1Only,region2Only]=strSetCompare(region,region2);
						if(region1Only+region2Only<=options.maxDistance)neighbors.push(region2);
					}
				}
			}
			if(options.minOverlap){
				for(let region2 in regionMap){//find regions that are in more sets, or exactly 1 more set, or has any overlap
					let [overlap,region1Only,region2Only]=strSetCompare(region,region2);
					if(overlap>=options.minOverlap)neighbors.push(region2);
				}
			}
			
			
					/*let candidates=[];
					let candidateSetCounts=[];
					findCandidates:for(let region2 in regionMap){
						//find regions that are possible neighbors that have more sets than this one
						for(let i=0;i<region.length;i++){
							if(strIsSubset(region,region2)){
								if(!candidates[i]){//no other candidate neighbor in this direction yet
									candidates[i]=region2;
									candidateSetCounts[i]=strSetCount(region2);
								}
								else{
									//see if this one is a better region with less sets(todo: if there are multiple equally good candidates, some combinations may need fewer neighbors than others to cover all directions. should all combinations be considered?)
									let oldCount=candidateSetCounts[i],newCount=strSetCount(region2);
									if(newCount<oldCount){
										candidates[i]=region2;
										candidateSetCounts[i]=newCount;
									}
								}
							}
						}
						
					}
					for(let i in candidates){
						neighbors.push(candidates[i]);
						
					}
					*/
	
			
			neighbors.sort(compareBy(strSetCount,true));//connect to neighbors with less sets first
			let realNeighbors=[];//skip a neighbor if another neighbor has a subset of its sets, because that way the first neighbor would connect to it instead
			for(let neighbor of neighbors){
				let valid=true;
				for(let oldNeighbor of realNeighbors){
					if(strIsSubset(oldNeighbor,neighbor)){valid=false;break;}
				}
				if(!valid)continue;
				g.addEdge(region,neighbor);
				realNeighbors.push(neighbor);
			}
		}
		return g;
		function strSetCount(str){
			let count=0;
			for(let c of str){if(c=="+")count++;}
			return count;
		}
		function bitmapToStr(bitmap){
			let str="";
			for(let i=0;i<numSets;i++){
				if(bitmap[i]===true){str+="+"}
				else {
					str+="-";
					//if(bitmap[i]===false){str+="-"}
					//else{str+="_"};
				}
			}
			return str;
		}
		function strIsSubset(region,region2){//region has a subset of set sof region 2
			let isDifferent=false;
			for(let i=0;i<region.length;i++){
				if(region[i]=="+"){
					if(region2[i]=="+")continue;
					else return false;
				}
				else{
					if(region2[i]=="-")continue;
					else {
						isDifferent=true;
					}
				}
			}
			return isDifferent;
		}
		function strSetCompare(region,region2){//# of sets in comon and unique to each region
			let common=0,only1=0,only2=0;
			for(let i=0;i<region.length;i++){
				if(region[i]=="+"){
					if(region2[i]=="+")common++;
					else only1++;
				}
				else{
					if(region2[i]=="-")continue;
					else {
						only2++;
					}
				}
			}
			return [common,only1,only2];
		}
			
		function setsMatch(map,bitmap){
			for(let key in bitmap){
				if(bitmap[key]==true){}
			}
		}
		function getRegionSize(bitmap){
			let str=bitmapToStr(bitmap);
			if(str in regionMap){
				return regionMap[str];
			}
			let count=0;
			for(let item of itemSetMap){
				if(setsMatch(item,bitmap)){count++;}
			}
			regionMap[str]=count;
			return count;
		}
		function* getSubsets(map,numSets){
			let keys=Object.keys(map);
			if(keys.length>1){
				
			}
			else {
				let str="_".repeat(numSets);
				str[keys[0]]="+";
			}
		}
		
	}
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	static nextLeaf(g){
		/*if(G.activeLayer===null&&(Object.keys(G.dataset.layers).length>1)){
			G.addLog("please select a layer first");return;
		}
		
		let layer=G.activeLayer,g=G.dataset,ls=g.layers;
		if(Object.keys(G.dataset.layers).length==1){layer=Object.keys(G.dataset.layers)[0];}
		let layerObj=ls[layer],nodes=ls[layer].nodes,links=ls[layer].links;
		*/
		if(!("leaves" in g)){
			g.leaves=[];
			/*g.leafCount=0;g.leafEdgeIndex=0;g.leafRandomNumbers=[];
			g.leafWaveCount=0;g.leafWaveConnections=-1;//when a new leaf has conn. 0 it should be a new wave
			for(let node of nodes){
				node=g.clonedVertices[node.index];
				node.remainingDegree=node.degree;
			}*/
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
	}

	
	
	
	static createGraph(order,p){
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
	}
	
	
	static solarMerge(g){
		let maxSubgraphVertices=100;
		let currentGraph=g;let levels=[];
		while(currentGraph.vertices.length>maxSubgraphVertices){
			let V=currentGraph.vertices.length;
			let E=currentGraph.edges.length;
			let vertexAssignment=new Int32Array(currentGraph.vertices.length).fill(-1);
			let vertexType=new Int32Array(currentGraph.vertices.length).fill(-1);//sun:0, planet:1 or moon:2
			let verticesLeft=currentGraph.vertices.length;
			while(verticesLeft>0){
				let chosen=Math.floor(Math.random()*V);
				while(vertexAssignment[chosen]>=0){chosen++;if(chosen>=V)chosen=0;}
				let chosenVertices={};
				let subgraphVertexCount=0;
				function choose(index,type){
					vertexAssignment[index]=chosen;
					chosenVertices[index]=true;
					vertexType[index]=type;
					subgraphVertexCount++;
				}
				choose(chosen,0);
				for(let neighbor of currentGraph.getNeighbors(chosen)){
					if(vertexAssignment[neighbor]>=0)continue;
					if(subgraphVertexCount>maxSubgraphVertices)break;
					choose(neighbor,1);
					for(let neighbor2 of currentGraph.getNeighbors(neighbor)){
						if(vertexAssignment[neighbor2]>=0)continue;
						if(subgraphVertexCount>maxSubgraphVertices)break;
						choose(neighbor2,2);
					}
				}
				let subgraph=Algs.getInducedSubgraph(currentGraph,chosenVertices);
				verticesLeft-=subgraphVertexCount;
			}
			let result=Algs.getVertexPartition(currentGraph,vertexAssignment,{noTrivialSubgraphs:false});
			let subgraphs=result.subgraphs;
			let metagraph=result.metagraph;
			//the desired length of a metaedge is the average of all path edge lengths where each path is from one planet to a sun, another sun and then to its planet.
			//todo
			metagraph.edges.addProperty("distance");
			metagraph.edges.properties.distance.setData(()=>0);
			let sources=currentGraph.edges.source,targets=currentGraph.edges.target,distances=currentGraph.edges.distance;
			for(let i=0;i<E;i++){
				let distance=1;let source=sources[i],target=targets[i];
				if(distances){distance=distances[i];}
				if(vertexAssignment[source]!=vertexAssignment[target]){
					let metaedgeID=metagraph.getEdgeByID(vertexAssignment[source],vertexAssignment[target]);
					metagraph.edges.distance[metaedgeID]+=distance;
					//todo:add other edges
				}
			}
			for(let i=0;i<metagraph.edges.length;i++){
				metagraph.edges.distance[i]/=metagraph.edges.E[i];
			}
			levels.push({graph:currentGraph,vertexAssignment:vertexAssignment,vertexType:vertexType,subgraphs:subgraphs});
			currentGraph=metagraph;
		}
		levels.push({graph:currentGraph});
		return levels;
	}

};
let Algs=GraphAlgorithms;
if((typeof module !="undefined")&& (typeof module.exports=="object")){
	module.exports=GraphAlgorithms;
}