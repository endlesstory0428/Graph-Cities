
window.addEventListener('load', function() {
    ForceLayout.initGlobal();
})


class ForceLayout{
	static initGlobal(){
		
		this.renderer = new THREE.WebGLRenderer( {
			antialias: false, //canvas: canvas, context: context,
			preserveDrawingBuffer: true,
		} );
		var canvas=this.renderer.domElement;
		var context=this.renderer.context;
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		//canvasContainer.appendChild( this.renderer.domElement );
		this.canvasElement=this.renderer.domElement;
		this.gl=this.renderer.getContext();
		if ( ! this.gl.getExtension( 'OES_texture_float' ) ) {alert( 'Your browser does not support this application:  OES_texture_float is not available' );}
		this.maxTextureSize=this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
		let maxVertexTextureImageUnits=this.gl.getParameter(this.gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
		if (maxVertexTextureImageUnits==0){alert("Your browser does not support this application:  vertex texture image units is 0"); return;}
		let statSelection=d3.select(document.body).append("div").style("position","absolute").style("left","0").style("bottom","0").style("display","none");
		let statArea=statSelection.node();
		this.statArea=statArea;
		let showingStats=false;
		document.body.addEventListener("keydown", ev=>{
			if(ev.key==='`'){ 
				ev.preventDefault();
				if(showingStats==false){showingStats=true;statSelection.style("display","block");}
			}
		});
		document.body.addEventListener("keyup", ev=>{
			if(ev.key==="`"){ 
				ev.preventDefault();
				showingStats=false;statSelection.style("display","none");
			}
		});
		this.initialized=true;
	}
	constructor(graph){
		if(graph){initGraph(graph);this.graph=graph;}
		else {this.graph={nodes:[],links:[]};}
		
		var stats = new Stats();this.stats=stats;
		stats.showPanel( 0 );
		stats.dom.style.position="absolute";
		stats.dom.style.top="";
		stats.dom.style.bottom="5px";
		stats.dom.style.left="5px";
		ForceLayout.statArea.appendChild( stats.dom );
		
		this.animateBound=this.animate.bind(this);
		setTimeout(this.animateBound,0);
		this.clock = new THREE.Clock();
		this.renderer=ForceLayout.renderer;
		
		var simulationUniforms={};
		this.uniforms=simulationUniforms;
		
		this.positionsChanged=false;
	}
	initSimulation(){
		let graph=this.graph;
		let edgelist=getEdgelist(graph);
		let nodeEdgeIndex=getNodeEdgeIndex(graph);
		this.initUniform("edgelist",edgelist);
		this.initUniform("nodeEdgeIndex",nodeEdgeIndex);
		this.initUniform("nodeCount",graph.nodes.length);
		this.initUniform("edgeCount",graph.links.length);
		
		
		var textureSize=Math.max(1,Math.ceil(Math.sqrt(graph.nodes.length)));this.simulationTextureSize=textureSize;
		let params={textureSize:textureSize};
		//the simulation shader uses this constant so we have to set it before creating the simulation.
		let vertexShader=replaceShaderParams(shaderLib+"\n"+simulationVS,params),fragmentShader=replaceShaderParams(shaderLib+"\n"+simulationFS,params);
		var sim = new THREE.Simulation(this.renderer,G.view.templates.nodes.object3d.geometry.attributes.initialPosition.array,simulationUniforms,vertexShader,fragmentShader);
		this.simulation=sim;
		this.simulationShader=sim.simulationShader;
		this.positionsChanged=false;
	}
	
	animateOnce() {
		this.stats.begin();
		
		if(this.V!=this.nodes.length||this.E!=this.links.length){
			this.initSimulation();this.V=this.nodes.length;this.E=this.links.length;
		}
		
		var delta = this.clock.getDelta();
		this.timer += delta;
		this.simulationShader.uniforms.timer.value = this.timer;
		if(this.simulationRunning){
			this.simulation.nextStep();
			this.positionsChanged=true;
			if(!this.simulationStarted){this.simulationStarted=true;console.log("started simulation");}
			if(this.syncing){this.syncPositions();}
		}
		
		
		this.stats.end();
	}

	syncPositions(){
		let buffer=this.getPositionBuffer();
		this.graph.nodes.forEach((node,i)=>{
			let i4=i*4;
			node.x=buffer[i4];
			node.y=buffer[i4+1];
		});
	}
	getPositionBuffer(){
		if(!(this.simulation&&this.simulation.dataBuffer))return null;//throw Error("no position buffer");
		if(this.positionsChanged){this.renderer.readRenderTargetPixels ( this.simulation.out, 0,0, this.simulation.textureSize, this.simulation.textureSize, this.simulation.dataBuffer);this.positionsChanged=false;}
		return this.simulation.dataBuffer;
	}
	
	
	initUniform(uniformName,value){//in this situation there's no need to reuse any of these uniforms, so this fuction creates and sets it
		if(typeof value=="function"){value=value(this.graph);}
		let realValue=value;
		let valueCache,sizeCache;
		if(value.isArray){
			let length=value.length;
			let size=Math.max(Math.ceil(Math.sqrt(length)),1);
			if(size>this.maxTextureSize/2){
				let result=confirm("Your browser is likely unable to support "+size+" objects because its max texture size is "+this.maxTextureSize+" which needs to be significantly bigger than the square root of the object count. Do you want to proceed anyway? (Please reopen the whole browser window, not just the tab, if it crashes this way.)");
				if(!result){throw Error();}
			}
			let data = new Float32Array( size*size*4);
			for(let i=0;i< length;i++){
				let point=value[i];
				if(typeof point=="number"){
					data[i*4]=point;data[i*4+1]=point;data[i*4+2]=point;data[i*4+3]=point;
				}
				else{
					data[i*4]=("r" in point)?point.r:(point.x?point.x:0);data[i*4+1]=("g" in point)?point.g:(point.y?point.y:0);
					data[i*4+2]=("b" in point)?point.b:(point.z?point.z:0);data[i*4+3]=("a" in point)?point.a:(point.w?point.w:0);
				}
			}
			var texture = new THREE.DataTexture( data, size, size, THREE.RGBAFormat, THREE.FloatType);
			texture.minFilter = THREE.NearestFilter;texture.magFilter = THREE.NearestFilter;
			texture.needsUpdate = true;
			realValue=texture;
			sizeCache=size;
		}
		valueCache=realValue;
		let uniformsObj=this.uniforms;
		let newobj={value:valueCache};
		uniformsObj[uniformName]=newobj;
		if(value.isArray){
			let uniformSizeName=uniformName+"Size";
			let newSizeObj={value:sizeCache};uniformsObj[uniformSizeName]=newSizeObj;
		}
	}
	updateUniform(uniformName,value){
		if(value!==undefined){this.initUniform(uniformName,value);}
		this.uniforms[uniformName].needsUpdate=true;
	}

}

function getEdgelist(graph){
	let links=graph.links;
	let result=[];
	graph.nodes.forEach((node,i)=>{
		for(let j in node.edges[i]){
			let linkID=node.edges[i][j],link=graph.links[linkID];
			result.push({x:Number(j),y:(link.strength?link.strength:1),z:(link.distance?link.distance:1)});
		}
	});
	return result;
}
function getNodeEdgeIndex(graph){
	let count=0;
	let result=graph.nodes.map((node,i)=>{
		let temp={x:count};
		for(let other in node.edges[i]){count++;}
		return temp;
	});
	return result;
}

function initGraph(graph){
	//assigns index and link source/target like d3. Assumes link.source references node index
	graph.nodes.forEach((node,i)=>{
		node.index=i;node.edges={};
	});
	graph.links.forEach((link,i)=>{
		link.index=i; 
		if(typeof link.source!="object")link.source=graph.nodes[link.source];
		if(typeof link.target!="object")link.target=graph.nodes[link.target];
		link.source.edges[link.target.index]=i;
		link.target.edges[link.source.index]=i;
	});
}




var shaderLib=`
	float rand(vec2 co){
			return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
	}

	float UVComponent2Index(float x){return (x*2.*textureSize-1.)/2.;}
	float UVComponent2Index(float x,float size){return (x*2.*size-1.)/2.;}
	float getEdgeUVComponent(vec2 v){//return co.y+(co.x/(textureSize+1.)) is incorrect! uv components are 1/2k, 3/2k ... 2k-1/2k
	//for adj matrix
		return ((UVComponent2Index(v.x)+UVComponent2Index(v.y)*textureSize)*2.+1.)/(textureSize*textureSize*2.);
	}
	float getIndexFromUV(vec2 v){
		return UVComponent2Index(v.x)+UVComponent2Index(v.y)*textureSize;
	}
	float getIndexFromUV(vec2 v,float size){
		return UVComponent2Index(v.x,size)+UVComponent2Index(v.y,size)*size;
	}
	//uv to index is safe from floating point/int errors because there's no need to take floor/fract (the input uv is always the center of a pixel so no wrapping issue); index to uv must be careful of that problem, because if you take floor/fract naively, the integer points near the edge of the texture are where the mapping is discontinuous, so always adjust by 0.5
	vec2 getUV(float x){
		return vec2( fract((x+0.5)/textureSize) , floor((x+0.5)/ textureSize)/textureSize+0.5/textureSize-0.5/(textureSize*textureSize) );
	}
	vec2 getUV(float x,float size){
		return vec2( fract((x+0.5)/size) , floor((x+0.5)/ size)/size+0.5/size-0.5/(size*size) );
	}

	float delta(float x,float y){return step(0.001,abs(x-y));}
	float isEqual(float x,float y){return step(0.999,1.-abs(x-y));}//only works for a difference >0.001
	float isLessThan(float x,float y){return step(0.001,x-y);}//only works for a difference >0.001


	vec4 getArrayValue(sampler2D texture,float size,float index){
		return texture2D( texture, getUV(index,size) );
	}
`;
var simulationVS=`
	varying vec2 vUv;

	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

	}
`;
var simulationFS=`
	varying vec2 vUv;
	uniform sampler2D tPositions;
	uniform sampler2D tPositionsPrev;
	
	//uniform float textureSize;//this is actually replaced by a literal value, because we need the loop index to be constant
	uniform float nodeCount;//max valid vertex ID
	uniform sampler2D edgeList;//try using an edge list instead of a matrix
	uniform float edgeListSize;
	uniform float edgeCount;
	uniform sampler2D nodeEdgeIndex;//a number for each node that is the beginning of the index into teh edge list that represent edges that belongs to it. an edge is a group of 4 numbers: the target node ID, the strength, the distance, and whatever ???
	//the thing with using an edge list on GPU: you can't very efficiently get a specific edge between two given IDs easily (you have to know a constant upper bound on the number of edges and loop in the edge list until you find it which can be much slower than for a matrix) but you can loop through all edges from a given ID?

	uniform float timer;

	uniform float radialLimit;
	uniform float radialLimitFactor;

	uniform float linkDistanceFactor;
	uniform float linkStrengthFactor;

	uniform sampler2D nodeSelectionData;
	uniform vec3 nodeMovement;
	//consider removing node selection and movement, because this library assumes you'd talk to the CPU every frame, so it may be easier to just update the coordinates on the CPU than setting selection and movement

	float getStartingEdgeIndex(vec2 uv){
		return texture2D(nodeEdgeIndex,uv).x;
	}
	float getStartingEdgeIndex(float index){
		if(index>=nodeCount-0.5)return edgeCount*2.;//index might be only almost equal to nodeCount because of floating point error; but normal indices should be <=nodeCount-1; funny bug: if it was index>nodeCount, then the last node ID is nodecount-1 and its endEID would be the next (invalid) entry (0) so it will retrieve no edges at all.
		return getStartingEdgeIndex(getUV(index));
	} 

	vec4 getEdgeData(float eid){
		return texture2D(edgeList,getUV(eid,edgeListSize));
	}

	const float d = 1./textureSize, e2 = 0.1,  dt2 = .001,G=-10000.,edgeStrength=1.0,clusteringStrength=2.0,alignmentStrength=20.0,radialLimitStrength=0.5, decay=0.05,factor=1.-decay;
	void main(void) {
		vec4 pos = texture2D( tPositionsPrev, vUv );
		vec2 r = pos.xy;
		vec2 r1  = texture2D(tPositions, vUv).xy;//r(t+1)
		vec2 f = vec2( 0. );//now forces only apply to x and y, the layoutDataSize is fixed by a formula
		
		if(getIndexFromUV(vUv)>=nodeCount)discard;//check for valid node
		
		for(float y = d/2.; y < 1.; y += d ){
			for(float x = d/2.; x < 1.; x += d ){
				totalVertices+=1.;
				//if(nodeCount<=x*textureSize+y)break;//this seems to actually hurt the performance...
				// vUv + vec2(x,y); we don't want to use looping behavior as the edge uv getter doesnt't consider it
				vec4 other=texture2D(tPositions,vec2(x, y));
				
				vec2 v = other.xy - r1;//distance
				float a = dot(v, v) + e2;
				
				vec2 force=(v/(a*sqrt(a)))*G*step(0.,nodeCount-totalVertices);//many-body, ignore unused node slots
				
				f+=force;
			}
		}
		float eid=getStartingEdgeIndex(vUv),endeid=getStartingEdgeIndex(getIndexFromUV(vUv)+1.);
		//float nodeDegree=endeid-eid,degreeFactor=1./max(log(nodeDegree+1.)/2.,1.);
		//edge list loop
		for(float i=0.;i<textureSize*textureSize;i++){//max edge number is < node count (or it can be a parameter too)
			if(eid+i>=endeid)break;
			vec4 eData=getEdgeData(eid+i);
			float otherID=eData.x,eStrength=eData.y,eDistance=eData.z;
			//I try to avoid if's inside loops, but if's outside of loops seem OK
			
			vec2 otherUV=getUV(otherID);
			vec4 otherPos=texture2D(tPositions,otherUV);
			vec2 v = otherPos.xy - r1;
			float a = dot(v, v) + e2;
			float targetDistance=1000.*linkDistanceFactor;//decrease link length if it's in a subgraph - todo better way
			
			f+=(v*max(-100.,a-targetDistance)/(a+e2))*(eStrength*edgeStrength*linkStrengthFactor);//-150 is the max pushing force an edge can exert?
			
		}
		
		
		float realRadialLimit=radialLimit*radialLimitFactor;
		float radius=sqrt(dot(r1,r1));
		//f+=	-r1*radialLimitStrength/(radius*max(pow(max((radialLimit-radius)/radialLimit,0.),0.1),0.02*dt2))*max(delta(activeLayerEnabled,1.),isEqual(layer,activeLayer));//actually I think the only right way to do radial limit is to scale all radii to within the limit; applying different forces will always look bad in some cases, but dt2 and the limit helps to prevent sharp jumping near the edge.
		//now I think the force should be always smooth, and increase smoothly from the center
		f+=(-r1*radialLimitStrength/radius)*max(radius/realRadialLimit,exp(max(radius/realRadialLimit-1.,0.)))//smoothstep(0.,radialLimit,radius)
			//(-r1*radialLimitStrength)/min(realRadialLimit,radius*pow(max((realRadialLimit-radius)/realRadialLimit,0.),0.3))//
		*max(delta(activeLayerEnabled,1.),isEqual(layer,activeLayer));
		
		float targetRadius=texture2D(nodeTargetRadiusData, vUv).x;float radialTargetStrength=500.;
		if(targetRadius>-0.5){
			float realTargetRadius=targetRadius*radialLimit*radialLimitFactor*3.;// *6 is the same formula as for rings quad width, so *3 is the correct radius
			f+=(-r1*radialTargetStrength/radius)*(radius-realTargetRadius);
		}
		
		//manual movement overrides forces
		vec4 nodeSelected = texture2D(nodeSelectionData, vUv);//x:isSelected
		if(length(nodeMovement)>0.&&nodeSelected.x>0.){
			f=nodeMovement.xy;
		}
		
		
		float maxSpeed=100./(timer*5.+5.)+10.;//11 -> 1? 7.5 -> 5?

		float componentMaxSpeed=200.;//speed may be too large to clamp as a whole in some cases (overflow when squared?), so must clamp components first

		vec2 oldVelocity=r1-r;
		
		vec2 velocity=(r1-r)*factor+ f*dt2;//2.*r1 - r;// + f*dt2;//dt2=.00001;
		if(dot(velocity,oldVelocity)<0.){velocity=velocity*0.5;}//if it's bouncing around, increase the decay
		 
		velocity=clamp(velocity,-componentMaxSpeed,componentMaxSpeed);
		float speed=length(velocity),clampRatio=max(1.,speed/maxSpeed);
		velocity=velocity/clampRatio;
		vec2 r2=r1+velocity;

		gl_FragColor = vec4(r2,0.,1.);//no height
	}
`;