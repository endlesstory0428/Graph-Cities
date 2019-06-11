
//every graph, when loaded, can have a place in a hierarchy, and the schema describes what are possible ways to display graphs in that kind of place (such as you can display CC metagraphs for a layer, but not currently for anything else), and what ways f display can be further expanded, and when an object in a given display of a graph on a given place is expanded, what graph (as in what position in the hierarchy and with what parameters) is shown. Users can switch between possible displays of a graph.
let hierarchyPositions={
	main:{
		parameters:{
			datasetID:"string",
		},
		displays:{
			/*layerList:{
				
			},*/ 
			//the expansion currently doesn't apply to non-scene objects.
			
			
		}
	},
	
};

let hierarchyDisplays={//ways to load some part of the hierarchy as a graph. 
//func returns a graph, or a promise. 
//expandVertex refers to where in the hierarchy the expanded graph belongs, and what parameters determine this graph. The same parameters are automatically copied from the parent unless otherwise changed.
	main:{
		func:(data)=>{
			lastRequestTime=new Date().getTime();
			G.lastDatasetID=data.id;
			d3.json("datasets/"+data.id,(d)=>{
				if(!d){console.log("unable to get dataset "+data.id);return;}
				d3.json("datasets/"+data.id+"/layerSummary",(summary)=>{
					
					d3.json("datasets/"+data.id+"/layout",(layout)=>{
						if(layout){
							G.addLog("using precomputed layout");
							for(let i=0;i<layout.length;i++){
								//assume they are vertex positions
								let pos=layout[i];
								d.vertices[i].x=pos.x;
								d.vertices[i].y=pos.y;
								d.vertices[i].z=pos.z;
							}
						}
						else{
							
						}
						selectE('dataset-menu').style('display','none');
						d.id=data.id;
						if(summary){d.layers=summary;}
						this.load(d);
					});
				});
			});
		},
		expand:
	},
	layerList:{
		func:(data)=>{
			//if(data.vertexCount>50000||data.edgeCount>2000000){
			
			d3.json("datasets/"+data.id+"/layerSummary",(d)=>{
				if(!d){console.log("unable to get summary of dataset "+data.id);return;}
				G.addLog("loading summary only");
				let g={};
				g.vertices=[];g.edges=[];g.layers=d;g.ccCounted=true;
				g.vertexCount=data.vertexCount;
				g.edgeCount=data.edgeCount;
				g.id=data.id;
				selectE('dataset-menu').style('display','none');
				this.load(g);
			});
			return;
		}
	},
};