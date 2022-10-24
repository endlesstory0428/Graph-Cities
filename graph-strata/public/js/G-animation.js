G.addModule("animation",{
	init:function(){
		
	},
	
	loadDataset:function(dataset){
		
	},
	animateFrame:function(dataset,delta){
		//animation
		if(G.animation){
			if(G.animation.rotate){
				let speed=G.animation["rotate speed"];
				G.cameraControls.addRotate(speed*Math.abs(speed)*delta*10,0);
			}
		}
		//automated exploration
		if(G.controls.get("exploringMetagraph",false)){
			let endIndex=G.dataset.vertices.length-1;//(G.exploreLargeSubgraphsFirst)?(G.world.vertexCount-1):0;
			if(G.dataset.expandVertex&&(G.dataset.lastExploredMetanodeIndex===undefined||G.dataset.lastExploredMetanodeIndex<endIndex))
			{
				let nextMetanode,nextVertexID,nextVertex;
				if(G.dataset.lastExploredMetanodeIndex===undefined||G.dataset.explorationOrder===undefined){
					G.dataset.lastExploredMetanodeIndex=-1;//(G.exploreLargeSubgraphsFirst)?(-1):G.world.vertexCount;//-1;
					G.dataset.explorationOrder=Object.keys(G.dataset.vertices).sort(compareBy((id)=>G.dataset.vertices.metanodeSize[id],(G.controls.get("exploreLargeSubgraphsFirst",true))?false:true));//metanodeSize is no longer a property on vertices
					nextVertexID=G.dataset.explorationOrder[0];
					nextVertex=G.dataset.vertices[nextVertexID];
					while(nextVertex&&(nextVertex.isMetanode===false)&&(G.dataset.lastExploredMetanodeIndex<=endIndex-1)){
						
						G.dataset.lastExploredMetanodeIndex++;
						console.log("skipping1 setting index to"+G.dataset.lastExploredMetanodeIndex);
						nextVertexID=G.dataset.explorationOrder[G.dataset.lastExploredMetanodeIndex+1];
						nextVertex=G.dataset.vertices[nextVertexID];
					}
					console.log(G.dataset.explorationOrder.map((d)=>G.dataset.vertices.metanodeSize[d]));
					//note: now all metanodes only have one layer.

				}
				else{
					G.dataset.lastExploredMetanodeIndex=Number(G.dataset.lastExploredMetanodeIndex);
					nextVertexID=G.dataset.explorationOrder[G.dataset.lastExploredMetanodeIndex+1];
					nextVertex=G.dataset.vertices[nextVertexID];
					while(nextVertex&&(nextVertex.isMetanode===false)&&(G.dataset.lastExploredMetanodeIndex<=endIndex-1)){
						
						G.dataset.lastExploredMetanodeIndex++;
						console.log("skipping2 setting index to"+G.dataset.lastExploredMetanodeIndex);
						nextVertexID=G.dataset.explorationOrder[G.dataset.lastExploredMetanodeIndex+1];
						nextVertex=G.dataset.vertices[nextVertexID];
					}
				}
				if(G.dataset.lastExploredMetanodeIndex<endIndex){
					//let l=Object.keys(nextVertex.clones)[0];
					//nextMetanode=nextVertex.clones[l];//.layer may be wrong
					if(nextVertex.isMetanode!==false){
						if((G.controls.get("exploreLargeSubgraphsFirst"))&&(G.dataset.vertices.metanodeSize[nextVertexID]<3)){
							//skip small components
							G.addLog("skipping the remaining small components");
							G.dataset.lastExploredMetanodeIndex=G.dataset.vertexCount-2;//next time it zooms back out it will stop exploring
							console.log("skipping remaining setting index to"+G.dataset.lastExploredMetanodeIndex);
						}
						//currently a metagraph's nodes are all metanodes. 
						if(G.controls.get("zoomToExpand",false)){
							let getViewObjectID=G.subview.templates.nodes.getViewObjectID;
							let nodeID=getViewObjectID(G.dataset,nextVertexID);//offset is 0 for top-level
							let nextMetanode=G.dataset.nodes[nodeID];
							if(G.cameraControls.getTarget()!=nextMetanode){
								//in GPU layout, nodes don't automatically update their position attributes. getting it for each frame is expensive, so for now just get it once.
								let vec=G.view.getNodePos(nodeID);
								nextMetanode.x=vec.x;
								nextMetanode.y=vec.y;
								nextMetanode.z=vec.z;
								G.cameraControls.setTarget(nextMetanode);
								G.setZoomIntoTarget(nextVertexID,G.dataset);
							}
							G.cameraControls.addZoom(0.97);
						}
						else{
							//show graph directly after some time
							if(!G.dataset.stayedTime){G.dataset.stayedTime=0;}
							G.dataset.stayedTime+=delta;
							if(G.dataset.stayedTime>G.controls.get("stayTimeFactor")*(Math.log(G.dataset.vertices.length+1))){
								console.log("expanding after staying for "+G.dataset.stayedTime);
								G.onExpandVertex(nextVertexID);//will increment index
							}
						}
						//note: on (re)entering a graph stayedTime is not set to 0 if
						if(!G.dataset.stayedTime){G.dataset.stayedTime=0;}				
					}
					//if it's not a metanode, it ends and the next tick will start zooming out
				}
				
			}
			else{
				//stay for some time and then go out
				if(!G.dataset.stayedTime){G.dataset.stayedTime=0;}
				G.dataset.stayedTime+=delta;
				let maxTime=G.controls.get("stayTimeFactor")*(Math.log(G.dataset.vertices.length+1));
				if(G.dataset.stayedTime>maxTime){
					if(!G.dataset.parent){G.addLog("exploration finished");G.exploringMetagraph=false;}
					else{
						if(G.controls.get("zoomToExpand",false)){G.cameraControls.addZoom(1.01+(10-Math.min(Math.log(G.dataset.vertices.length+1),10))*0.009);}//if we zoomed in, also zoom out. bigger ones exit slower: log of 10 - 1.01, log of 1 - around 1.1
						else{G.onZoomOut();}

					}
				}
				
			}
			//also when something is expanded it sets lastExploredMetanode
		}
	}
});