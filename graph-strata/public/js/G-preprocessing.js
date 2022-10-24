//let sourceName="s",targetName="t",layerName="l",weightName="w";
G.addModule("preprocessing",{
	init:function(){
	},
	templates:{
		vertices:{
			properties:{
				index:{
					type:"integer",value:(v,i)=>i,
				},
				metanodeSize:{
					value:(v,i,array)=>Math.max((array.V?(Math.log(array.V[i]+1)+0.3):1),(array.E?(Math.log(array.E[i]+1)+0.3):1)),
				},
				degree:{
					condition:(graph)=>graph.vertices.properties.edges&&(!graph.vertices.properties.edges.isAbstract),
					type:"integer",value:(v,i,array)=>Object.keys(array.edges[i]).length,
				},

			},
		},
		edges:{
			properties:{
				//source:{value:(e)=>(e.source),},
				//target:{value:(e)=>(e.target),},
			},
		},
		/*globalRings:{
			properties:{
				
			},
		}*/
	},
	loadGraph:function(graph){
		/*if(!graph.preprocessed&&(!graph.vertices.properties.id.isAbstract)){//skip abstract graphs
			this.applyTemplates(graph);//after the preprocessing

			graph.preprocessed=true;
		}*/
		
		
		
	}
});