
var starMap = new THREE.ImageUtils.loadTexture('images/star.png');
var glowMap = new THREE.ImageUtils.loadTexture('images/glow.png');
var particleMap = new THREE.ImageUtils.loadTexture('images/particle.png');
var dotMap = new THREE.ImageUtils.loadTexture('images/dot.png');

var redColor=new THREE.Color(1,0,0);
var greenColor=new THREE.Color(0,1,0);
var whiteColor=new THREE.Color(1,1,1);

var CAMERA_DISTANCE2NODES_FACTOR=150;
G.colorScales={ //[0,1], use with THREE.Color.setStyle()
	rainbow:d3.scaleSequential(d3.interpolateRainbow),
	cool:d3.scaleSequential(d3.interpolateCool),
	warm:d3.scaleSequential(d3.interpolateWarm),
	plasma:d3.scaleSequential(d3.interpolatePlasma),
	spring:d3.scaleSequential(d3.interpolateCubehelixLong("#f80","#f8f")),
};
G.colorScale="spring";
G.brightColors=false;
function colorScale(value){
	return G.colorScales[G.colorScale](value);
}

G.addModule("view",{
	textures:{glow:glowMap,particle:particleMap,dot:dotMap},
	shaderSources:{
	},
	nodeMovement:new THREE.Vector3(),
	init:function(){
		window.addEventListener("resize", this.resizeCanvas, false);
		d3.text("shaders/sharedShaderLib.vs",(data)=>{if(data){this.shaderLib=data;}});
		d3.text("shaders/simulation.vs",(data)=>{if(data){this.shaderSources["simulation.vs"]=data;}});
		d3.text("shaders/simulation.fs",(data)=>{if(data){this.shaderSources["simulation.fs"]=data;}});
		for(let name in this.templates){
			if(!this.templates[name].object3dType)continue;
			d3.text("shaders/"+name+".vs",(data)=>{if(data){this.shaderSources[name+".vs"]=data;}});
			d3.text("shaders/"+name+".fs",(data)=>{if(data){this.shaderSources[name+".fs"]=data;}});
		}
		G.zoomOutDistance=()=>{
			let maxHeight=G.dataset?(500.0*Math.sqrt(Math.log(G.dataset.maxLayer+1.))*G.heightFactor+5000):0;
			let maxRadius=G.dataset?(this.sharedUniforms.radialLimit.value()*G.radialLimitFactor*3+5000):0;
			return Math.max(10000,maxHeight,maxRadius);
		};
		G.resetView=this.resetView;
		G.renderer = new THREE.WebGLRenderer( {
			antialias: false, //canvas: canvas, context: context ,
			//clearColor: 0x000000, 
			//clearAlpha: 0, 
			preserveDrawingBuffer: true,
		} );
		var canvas=G.renderer.domElement;
		var context = G.renderer.context;
		//G.renderer=new THREE.WebGLRenderer( { antialias: false } );
		G.renderer.setSize( window.innerWidth, window.innerHeight );
		G.canvasContainer.appendChild( G.renderer.domElement );
		G.canvasElement=G.renderer.domElement;
		G.gl=G.renderer.getContext();
		if ( ! G.gl.getExtension( 'OES_texture_float' ) ) {alert( 'Your browser does not support this application:  OES_texture_float is not available' );}
		this.maxTextureSize=G.gl.getParameter(G.gl.MAX_TEXTURE_SIZE);if(G.DEBUG)console.log("max texture size is "+this.maxTextureSize);
		let maxVertexTextureImageUnits=G.gl.getParameter(G.gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
		if (maxVertexTextureImageUnits==0){alert("Your browser does not support this application:  vertex texture image units is 0"); return;}else{if(G.DEBUG)console.log("max vertex texture image size is "+maxVertexTextureImageUnits);}
	 
		G.cameras={perspective:new THREE.PerspectiveCamera( ),orthographic:new THREE.OrthographicCamera(window.innerWidth/ - 2, window.innerWidth/ 2, window.innerHeight/ 2, window.innerHeight / - 2, 1, 20000) };//50, window.innerWidth / window.innerHeight, 0.1, 50000 
		G.cameras.perspective.far = 20000;
		G.cameras.perspective.near = 0.01;
		G["camera type"]="perspective";
		G.camera = G.cameras.perspective;//new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 1000 );
		//scene.add( camera );
		for(let name in G.cameras){
			G.cameras[name].position.x = 0;
			G.cameras[name].position.y = 0;
			G.cameras[name].position.z = 1000;//sqrt instead of cbrt because the layout is often quite flat
		}
		G.cameraControls = new MyControls(G.cameras,G.renderer.domElement,G);
		
		G.scene = new THREE.Scene();var scene=G.scene;
		scene.background = new THREE.Color(0xffffff);
		G.lightStyle=true;
		scene.fog = new THREE.FogExp2(0xaaaaaa,0.005);
		//debugging
		this.testBuffer=new Float32Array( 4 );
		
		let objectOrder=Object.keys(this.templates).sort(compareBy((x)=>(this.templates[x].priority?this.templates[x].priority:0),true));
		for(let name of objectOrder){
			let obj=this.templates[name];
			if(obj.object3dType){
				obj.geometry=new THREE.BufferGeometry(name);
				
				obj.object3d=new obj.object3dType(obj.geometry,obj.material);
				obj.object3d.frustumCulled=false;//get rid of annoying disappearing problem -- the camera doesn't know the GPU-based positions!
				G.scene.add(obj.object3d);
			}
		}
		var composer = new THREE.EffectComposer(G.renderer);G.composer=composer;//, renderTarget
		var renderPass = new THREE.RenderPass(scene,G.camera);
		G.renderPass=renderPass;
		//renderPass.renderToScreen = true;
		composer.addPass(renderPass);
		
		dpr = 1;
		if (window.devicePixelRatio !== undefined) {dpr = window.devicePixelRatio;}
		
		var effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);G.effectFXAA=effectFXAA;
		effectFXAA.uniforms['resolution'].value.set(1 / (G.canvasContainer.clientWidth * dpr), 1 / (G.canvasContainer.clientHeight * dpr));
		effectFXAA.renderToScreen = true;
		composer.addPass(effectFXAA);
		
		var stats = new Stats();G.stats=stats;
		stats.showPanel( 0 );
		stats.dom.style.position="absolute";
		stats.dom.style.top="";
		stats.dom.style.bottom="5px";
		stats.dom.style.left="5px";
		document.querySelector("#graph-menu").appendChild( stats.dom );
		this.animateBound=this.animate.bind(this);
		setTimeout(this.animateBound,0);//this may happen after a mouse event fires but it's OK because dataset is not set at the start
		
		this.clock = new THREE.Clock();
		this.resizeCanvas();
		
		//init some controls
		this.initModifierControls();
		
		let objectsVisibilityObj={};
		for(let name of objectOrder){
			let obj=this.templates[name];
			if(obj.object3dType){
				objectsVisibilityObj[name]=()=>obj.object3d.visible=(!obj.object3d.visible);
			}
		}
		let viewButtomsElem=getE("view-buttons-area");
		G.controls.addDropdownMenu(viewButtomsElem,"show/hide",objectsVisibilityObj,{upward:true});
		//the simulation shouldn't need to know the camera position, but the movement needs to happen in the simulation and 
		//we need to calculate the real movemnet for it
		
		canvas.tabIndex=1;//to make it focusable and accept key events
		let moveLength=10;
		G.controls.addKeyListener(canvas,37,()=>{G.view.nodeMovement.copy(G.cameraControls.leftVector).multiplyScalar(moveLength);},()=>{G.view.nodeMovement.set(0,0,0)});
		G.controls.addKeyListener(canvas,38,()=>{G.view.nodeMovement.copy(G.cameraControls.forwardVector).multiplyScalar(moveLength);},()=>{G.view.nodeMovement.set(0,0,0)});
		G.controls.addKeyListener(canvas,39,()=>{G.view.nodeMovement.copy(G.cameraControls.leftVector).multiplyScalar(-moveLength);},()=>{G.view.nodeMovement.set(0,0,0)});
		G.controls.addKeyListener(canvas,40,()=>{G.view.nodeMovement.copy(G.cameraControls.forwardVector).multiplyScalar(-moveLength);},()=>{G.view.nodeMovement.set(0,0,0)});
	},
	shaderConstants:{
		textureSize:()=>{
			return G.view.simulationTextureSize?G.view.simulationTextureSize:1;
		}
	},
	beforeLoadDataset(newDataset){
		//save positions for the old graph
		let dataset=G.dataset;
		if(dataset&&dataset.nodes){
			let buffer=this.getPositions();
			if(buffer){
				for(let i=0;i<dataset.nodes.length;i++){
					let node=dataset.nodes[i];
					let i4=i*4;
					node.x=buffer[i4];node.y=buffer[i4+1];node.z=buffer[i4+2];
				}
			}
		}
		//save minimap before the child graph is shown
		if(dataset&&(!dataset.imageData)){
			dataset.imageData=G.renderer.domElement.toDataURL("image/png");
		}
		if(newDataset.parent&&newDataset.parent.imageData)getE("minimap").src=newDataset.parent.imageData;//works even if the parent is not the current dataset
		else{getE("minimap").src="images/blank.png"}
	},
	loadDataset:function(dataset){
		if(dataset.dataPath&&(dataset.vertices.layout===undefined)){
			d3.json("datasets/"+dataset.dataPath+"/layout",(layout)=>{
				addHiddenProperty(dataset.vertices,"layout",layout);//even if it's null
				if(layout){G.addLog("using precomputed layout");}
				this.loadDataset(dataset);
			});
			return; //wait until the layout is loaded
		}
		
		if(!dataset.modifiers)dataset.modifiers={};
		for(let name in this.modifiers){
			let modObj=this.modifiers[name];
			if(!dataset.modifiers[name]){modObj.controlsElem.style.display="none";}
			else{//todo:set values of controls
				modObj.controlsElem.style.display="";
			}
		}
		this.step=0;
		this.timer=0;//reset the time since simulation started
		this.dataset=dataset;
		
		let heightPropertyName=dataset.heightProperty,heightPropertyType;
		if(heightPropertyName){
			if(heightPropertyName in G.analytics.templates.edges)heightPropertyType="edges";
			else heightPropertyType="vertices";
		}
		Object.assign(dataset,this.getObjectsFromHierarchy(dataset,heightPropertyName,heightPropertyType));
		
		this.applyTemplates(dataset);
		
		var simulationUniforms={
			timer: { type: "f", value: 0},
		};
		for(let uniformName in this.sharedUniforms){
			let uniform=this.sharedUniforms[uniformName];//every one must be created, even dynamic ones
			uniform.needsUpdate=true;
			if(uniform.noSimulate)continue;//must skip the ones that cannot be used in the simulation, ie its own output
			this.initUniform(uniform,dataset);
			this.updateUniform(uniform,simulationUniforms,uniformName,dataset);
		}
		this.refreshUniforms(true);
		this.refreshAttrs(true);//they do not use the textureSize constant
		
		var textureSize=Math.max(1,Math.ceil(Math.sqrt(dataset.nodes.length)));this.simulationTextureSize=textureSize;
		//but the simulation shader uses the constant so we have to set it before creating the simulation.
		let vertexShader=this.getVertexShader("simulation"),fragmentShader= this.getFragmentShader("simulation");
		var sim = new THREE.Simulation(G.renderer,G.view.templates.nodes.object3d.geometry.attributes.initialPosition.array,simulationUniforms,vertexShader,fragmentShader);
		this.simulation=sim;
		this.simulationShader=sim.simulationShader;
	
		this.clock.getDelta();
		this.animateOnce(); //it only animates one frame, and doesn't create an (extra) requestAnimationFrame loop for itself. without this, between load dataset and the next animate() frame, a mouse event may happen and get invalid positions. 
	},
	step:0,
	simulationStarted:false,
	animateOnce:function animateOnce() {
		G.stats.begin();
		
		if(!this.simulationShader){G.composer.render(delta);return;}
		if(!G.dataset||!G.dataset.nodes){return;}
		
		var delta = this.clock.getDelta();
		this.timer += delta;
		this.simulationShader.uniforms.timer.value = this.timer;
		if(G.simulationRunning){
			this.simulation.nextStep();this.positionsChanged=true;if(!this.simulationStarted){this.simulationStarted=true;console.log("started simulation");}
		}
		this.refreshStyles();
		
		G.cameraControls.update();
		G.composer.render(delta);//G.renderer.render( G.scene, G.camera );
		G.broadcast("animateFrame");
		G.stats.end();
	},
	animate:function animate(onlyOnce) {
		requestAnimationFrame(this.animateBound);
		this.animateOnce();
	},
	timer:0,
	//data inputs
	sharedUniforms:{
		timer:{value:()=>G.view.timer,dynamic:true},
		tPositions: { value:()=>G.view.simulation?G.view.simulation.in.texture:null,dynamic:true,noSimulate:true},//why this must not be set for the simulation?
		tPositionsPrev: { value:()=>G.view.simulation?G.view.simulation.in_prev.texture:null,dynamic:true,noSimulate:true},
		layoutData:{
			value:()=>{
				return G.view.simulation?G.view.simulation.out.texture:null;
			},
			dynamic:true,noSimulate:true
		},
		layoutDataSize:{value:()=>G.view.simulationTextureSize,dynamic:true,},
		nodeData:{
			isArray:true,
			value:(dataset)=>{
				let nodes=dataset.nodes,nodeHeights=dataset.nodeHeights;
				let result=nodes.map((node,i)=>({x:nodeHeights[i],
					y:0,//node.layerSetID,
					z:i,//node.original,
					w:1,//node.ccSize
				})); //todo: 1. better ways to pass in individual float values; 2. to get accurate "original" info for all graphs, we must know which larger graph each subgraph is part of. I think it's OK to pretend a metanode is different from all other real nodes - but can a metanode have meaningful layer set information? for now both original and layer set are disabled?
				return result;
			}
		},
		clusteringData:{
			isArray:true,
			value:(dataset)=>{
				//map of all nodes to the node it's clustered to (if available)
				let nodes=dataset.nodes,nodeHeights=dataset.nodeHeights;
				let result=nodes.map((node)=>{
					return {x:0,y:0};
					//return {x:node.clusterCenter,y:((node.clusterCenter!=null)?1:0)};
				});
				return result;
			}
		},
		metanodeData:{
			isArray:true,
			value:(dataset)=>{
				//map of all nodes to the node it's clustered to (if available)
				let nodes=dataset.nodes,metanodeIDs=nodes.metanodeID;
				let result=nodes.map((node,i)=>{
					return {x:metanodeIDs[i]};
					//return {x:node.clusterCenter,y:((node.clusterCenter!=null)?1:0)};
				});
				return result;
			}
		},
		nodePinData:{
			isArray:true,
			value:(dataset)=>{
				let nodes=dataset.nodes,nodeHeights=dataset.nodeHeights;
				let result=nodes.map((node)=>{
					return {x:0,y:0,z:0,w:0};
					//if(node.pinned){console.log("pinned "+node.id);}
					//return {x:node.x,y:node.y,z:node.z,w:(node.pinned?1:0)}
				});
				return result;
			}
		},
		nodeSelectionData:{
			isArray:true,
			value:(dataset)=>{
				let nodes=dataset.nodes,nodeHeights=dataset.nodeHeights;
				let result=nodes.map((node)=>{
					return {x:0,y:0,z:0,w:0};
					//return {x:(node.original in dataset.selectedVertices)};
				});
				return result;
			}
		},
		nodeMovement:{
			value:()=>G.view.nodeMovement,
			dynamic:true,
		},
		edgeList:{
			isArray:true,
			value:(dataset)=>{
				let links=dataset.links,linkSources=dataset.linkSources,linkTargets=dataset.linkTargets;
				let result=[];
				//edges may not be prepared for all nodes, especially subgraphs that were never loaded, just calculate the adjacency here
				let adjlist=dataset.adjlist;
				dataset.nodes.forEach((node,i)=>{
					for(let j in adjlist[i]){
						let link=dataset.links[adjlist[i][j]];
						result.push({x:Number(j),y:1,z:1});//,y:edge.strength,z:edge.distance
					}
				});
				return result;
			}
		},
		nodeCount:{value:(dataset)=>dataset.nodes.length},
		edgeCount:{value:(dataset)=>{
			let links=dataset.links;
			return links.length;
			}},
		nodeEdgeIndex:{//each node's starting index in the edge list
			isArray:true,
			value:(dataset)=>{
				let count=0;
				let adjlist=dataset.adjlist;
				let result=dataset.nodes.map((node,i)=>{
					let temp={x:count};
					for(let other in adjlist[i]){
						count++;
					}
					return temp;
				});
				return result;
			}
		},
		layerCount:{
			value:()=>G.dataset.heights.count,
		},
		logLayerHeightRatio:{
			value:()=>{
				if(G.dataset.layerHeightOption=="linear")return 0;
				return G.dataset.showingInterlayers?0:G.controls.get("logLayerHeightRatio");
			},
			dynamic:true
		},
		reverseHeight:{
			value:()=>{return G.dataset.showingInterlayers?1:0;},
			dynamic:true
		},
		linkForceEnabled:{value:()=>true,dynamic:true},//linkForceEnabled:{value:()=>G.linkForceEnabled,dynamic:true},
		activeLayerEnabled:{value:()=>G.activeLayer!=null,dynamic:true},
		activeLayer:{value:()=>G.activeLayer,dynamic:true,},
		maxLayer:{value:()=>Math.max.apply(null,G.dataset.nodeHeights)},
		
		ccSizeThreshold:{value:()=>G.controls.get("ccSizeThreshold"),dynamic:true,},
		radialLimit:{value:()=>(7*Math.pow(G.dataset.nodes.length,0.5)+5*Math.pow(G.dataset.nodes.length,0.33)),dynamic:true},//hack - the idea is it reflects both size and how flat the graph is, but the numbers are not really justified
		radialLimitFactor:{value:()=>G.controls.get("radialLimitFactor")*10,dynamic:true},
		heightFactor:{value:()=>G.controls.get("heightFactor"),dynamic:true},
		linkDistanceFactor:{value:()=>G.controls.get("linkDistanceFactor"),dynamic:true},
		linkStrengthFactor:{value:()=>G.controls.get("linkStrengthFactor"),dynamic:true},
		clusteringStrengthFactor:{value:()=>G.controls.get("clusteringStrengthFactor"),dynamic:true},
		
		camera:{value:()=>G.camera.position,dynamic:true},
		
		linkLayerColorRatio:{value:()=>G.linkLayerColorRatio,dynamic:true},
		lineLayerColorRatio:{value:()=>G.lineLayerColorRatio,dynamic:true},
		
		layerColors:{
			isArray:true,
			value:(dataset)=>{
				let logColorScale=G.logColorScale;
				let size=Math.ceil(Math.sqrt(dataset.maxLayer+1));//starts from 0
				let layerColors=[];
				
				let layerCount=dataset.heights.count;if(layerCount==0)layerCount=1;
				//let saturation=(G.showingSparseNet||G.dataset.showingInterlayers)?1:((layerCount>10)?1:(0.01+0.99*Math.sqrt(layerCount-1)/3));
				let saturation=(G.showingSparseNet||G.dataset.showingInterlayers)?1:((layerCount>1)?1:0.01);
				if(G.brightColors)saturation=1;
				let minl=saturation*0.48+0.01,maxl=1-minl;//0.1-0.9; range of luminosity where the saturation can be fully shown, plus some margin
				let nodeL=(1-G.scene.background.getHSL().l)*(maxl-minl)+minl;
				if(logColorScale){
					let logs={},logSum=0,lastl=0;
					for(let l in dataset.heights){
						let diff=l-lastl;lastl=l;
						let temp=(Math.log(Math.log(diff+1.01)+1.01));
						logSum+=temp;logs[l]=logSum;
					}
					for(let l in dataset.heights){
						layerColors[l]=new THREE.Color();
						//layerColors[l].setHSL((logs[l])*0.85/(logSum),saturation,nodeL);
						layerColors[l].setStyle(colorScale(logs[l]/(logSum)));
						let hsl=layerColors[l].getHSL();
						layerColors[l].setHSL(hsl.h,saturation,nodeL);
					}
				}
				else{
					for(let l in dataset.heights){
						layerColors[l]=new THREE.Color();
						//layerColors[l].setHSL((l)*0.85/(dataset.maxLayer+1),saturation,nodeL);
						layerColors[l].setStyle(colorScale(l/(dataset.maxLayer+1)));
						let hsl=layerColors[l].getHSL();
						layerColors[l].setHSL(hsl.h,saturation,nodeL);
					}
				}
				let realParent=G.loading.getRealParent(dataset);//skip single-metanode ancestors
				if(realParent&&realParent.heights&&G.inheritColors){
					let followParent=true;
					for(let l in dataset.heights){if(l in realParent.heights==false){followParent=false;break;}}
					if(dataset.showingInterlayers){followParent=false;}
					if(followParent){
						for(let l in dataset.heights){
							layerColors[l]=realParent.layerColors[l].clone();
						}
					}
				}
				for(let i=0;i<layerColors.length;i++){if(!layerColors[i])layerColors[i]=new THREE.Color();}
				dataset.layerColors=layerColors;//hack to follow parent layer colors
				return layerColors;
					
			},
		},
		layerHeights:{
			isArray:true,
			value:(dataset)=>{
				let max=dataset.heights.max,logLayerHeightRatio=((dataset.showingInterlayers||(dataset.layerHeightOption=="linear"))?0:G.controls.get("logLayerHeightRatio")),layerCount=Object.keys(dataset.heights).length;
				let result=new Array(max+1);
				for(let i=0;i<=max;i++){
					let  temp=(layerCount*max==0.)?0.5:((1-logLayerHeightRatio)*(i+0.1)/(max+0.1)+logLayerHeightRatio*Math.log(i+1.)/Math.log(max+1.));
					//if(dataset.showingInterlayers)temp=1-temp;
					result[i]=(temp-0.5)*500.0*Math.sqrt(Math.log(max+1.));
				}
				return result;	
			}
		}
	},
	"node texture":"dot",
	templates:{
		nodes:{
			priority:2,
			selectionPriority:1,
			object3dType:THREE.Points,
			value:(graph)=>{
				return graph.nodes;
			},
			properties:{
				metanodeID:{//global metanode ID in the list of nodes if applicable; if not, use -1
					isArray:true,
					value:(dataset)=>dataset.nodeGraphIDs.map((id)=>{let n=dataset.graphObjects[id].globalMetanodeID;if(n===undefined)n=-1;return n;}),
				},
				isExpanded:{
					value:(node)=>node.isExpanded?1:0,
				},
				charge:{value:(node)=>{if(node.weightedDegree){return (1/(node.weightedDegree + 1))}else{return 1;}}},
				size:{
					value:function(node,i,array){
						let metanodeFactor=1;
						if(G.showMetanodeSize){metanodeFactor=Math.pow(node.metanodeSize,1.5)*G.metanodeSizeFactor+(1-G.metanodeSizeFactor);}
						let subgraphFactor=(getProperty(array,i,"metanodeID")==-1)?1:0.3;
						let answer=metanodeFactor*subgraphFactor;//s*diversitySize*degreeFactor
						checkNumber(answer);
						return answer;
					},
					scaling:()=>({targetAvg:G.controls.get("nodeSizeFactor")})
				},
				color:{
					value:function(node){return null;}
				},
				pinned:{
					value:function(node){return false;}
				},
				clusterCenter:{
					value:function(node){return null;}
				},
				initialPosition:{
					isAttribute:true,dimensions:4,//now "type" means the data type (vector) not attribute items' type, and "attr type" is not needed because it's always float.
					value:(node,i,array)=>{
						var v=new THREE.Vector4();
						let layout=array.layout;
						if(layout&&(!isNaN(layout[i].x))){	
							v.x=layout[i].x;
							v.y=layout[i].y;
							v.z=layout[i].z;
						}
						else{
							do{
								v.x = THREE.Math.randFloatSpread(100);
								v.y = THREE.Math.randFloatSpread(100);
								v.z = THREE.Math.randFloatSpread(100);}
							while(v.length()>Math.random()*50+50);
							
						}
						v.w=1;//would be 0 for extra space that correspond to no nodes
						return v;
					},
				},
				position:{
					dimensions:3,//used to get the corresponding pixel in the simulation texture; instead of the old example using x and y, we use only x(index) and leave others for later
					perObject:true,
					value:((node,i)=>{let v=new THREE.Vector3();v.x=i;return v;}),//now the data items cannot be shared, must create all vectors.
				},
				//brightness:{value:(node)=>1},
				customColor:{dimensions:3,value:(node)=>(node.color?node.color:whiteColor)},
				usingCustomColor:{value:(node)=>((node.color!=null)?1:0)},
			},
			
			uniforms:{//shared ones are automatically added
				texture:   { type: "t", value: ()=>G.view.textures[G.view["node texture"]] },
				pointSize: { type: "f", value: function(){return (250/Math.log2(16+this.simulationTextureSize)) }},
				layerColorRatio:{ type: "f", value: function(){return G.nodeLayerColorRatio },dynamic:true},
			},
			shader:"nodes",
			getObjectAtPos:function(pos){
				let buffer=G.view.getPositions(),vec=new THREE.Vector3(),tolerance=0.03;//ratio of the screen size
				let bestDist=Infinity,bestObj=null,bestScreenPos=new THREE.Vector2();//todo: shouldn't the nodes at the front have priority, not just considering which one's center is closest?
				//let up=-Infinity,down=Infinity,right=-Infinity,left=Infinity;//debug bounding box
				//debug weird links between different layers:
				let map={};
				for(let i=0,i4=0;i<G.dataset.nodes.length;i++,i4+=4){
					let node=G.dataset.nodes[i];
					if(node.size==0)continue;//skip invisible nodes
					vec.x=buffer[i4];vec.y=buffer[i4+1];vec.z=buffer[i4+2];
					//if(!(node.layer in map)){map[node.layer]=vec.z;}else{if(vec.z!=map[node.layer])throw Error("inconsistent layer");}
					let screenPos = vec.applyMatrix4(G.view.templates.nodes.object3d.matrixWorld).project(G.camera);
					let dx=screenPos.x-pos.x,dy=screenPos.y-pos.y,dist=Math.sqrt(dx*dx+dy*dy);
					//if((distToCamera>G.camera.far)||(distToCamera<G.camera.near)){continue;}
					if(dist<tolerance){
						if(dist<bestDist){bestDist=dist;bestObj=node;bestScreenPos.copy(screenPos);}
					}
				}
				if(G.DEBUG)console.log(map);
				return bestObj;
			}
		},
		
		links:{
			object3dType:THREE.Mesh,
			//the array value is set elsewhere
			properties:{
				//distance:{value:(link)=>(("length" in link)?(link.length+0.1):1)/(("weight" in link)?(G.linkWeightAsStrength?(1/(link.weight+0.1)):(link.weight+0.1)):1)},//unused now
				source:{
					value:(dataset)=>dataset.linkSources,type:"int",isArray:true,
				},
				target:{
					value:(dataset)=>dataset.linkTargets,type:"int",isArray:true,
				},
				strength:{
					value:(link)=>{
						/*
						let result=Math.max(Math.min(link.source.weightedDegree, link.target.weightedDegree),0.1);
						if(G.linkStrengthExponent!=1){result=Math.pow(result,G.linkStrengthExponent);}
						if(G.logLinkStrength){result=Math.log(result+1)+1;}
						return (("weight" in link)?(G.linkWeightAsStrength?(link.weight+0.1):(1/(link.weight+0.1))):1)/result;
						*/
						return 1;
					},
				},
				distance:{
					value:(link)=>(("length" in link)?(link.length+0.1):1)/(("weight" in link)?(G.linkWeightAsStrength?(1/(link.weight+0.1)):(link.weight+0.1)):1),
					//scaling:()=>60 * G.linkDistanceFactor/(6/Math.sqrt(Math.min(Math.max(G.dataset.np,1),36))),
				},
				
				brightness:{
					value:function(link) {
						return 1;
					},
					scaling:(dataset)=>({targetAvg:(G.lightStyle?3:1)*100*G.controls.get("linkBrightnessFactor")/(dataset.links.length+1),maxScaled:10})
				},
				thickness:{
					dependency:"node.size",
					value:(link,i,array)=>{
						let result=1;//Math.max(Math.min(link.source.weightedDegree, link.target.weightedDegree),0.1);//this dims higher layer links too much 
						let factor=G.controls.get("linkWeightThicknessFactor");
						let w=1;if(link.weight)w=Math.sqrt(Math.log(G.controls.get("linkWeightAsStrength")?(link.weight+1):(1/(link.weight+1))));
						w=w*factor+(1-factor);
						let s=getProperty(array,i,"source"),t=getProperty(array,i,"target");
						let subgraphFactor=(getProperty(G.dataset.nodes,s,"metanodeID")==-1)?1:0.3;
						result*=w*subgraphFactor;//(link.source.size+link.target.size)*w;
						return result;
					},
					scaling:()=>({targetAvg:G.controls.get("linkThicknessFactor"),minScaled:0.01,maxScaled:G.controls.get("linkThicknessFactor")*1.5})
				},
				color:{
					dimensions:3,
					value:(link)=>{
						return whiteColor;
					},
				},
				position:{
					dimensions:3,deps:["source","target"],value:(d,i,array)=>{//props has source and target because they are declared as dependencies. it's not attached to d itself because we don't want to modify the original objects (and they don't have to be objects)
						var v=new THREE.Vector3();
						v.x=getProperty(array,i,"source");v.y=getProperty(array,i,"target");
						v.z=0;
						return v;
					},
				},
				coord:{dimensions:3,perPoint:true,
					value:(()=>{
					var v1=new THREE.Vector3(),v2=new THREE.Vector3(),v3=new THREE.Vector3(),v4=new THREE.Vector3();
					v1.x=1;v1.y=1; //s+sideways
					v2.x=1;v2.y=-1;//s-sideways
					v3.x=-1;v3.y=1;//t+sideways
					v4.x=-1;v4.y=-1;//t+sideways
					var array=[v1,v2,v3,v2,v4,v3];
					return ((d,i)=>array);
					})(),//this reuse is OK because it's the same value for all
				},
				direction:{
					value:(d)=>(d.direction)?d.direction:0,
				},
				customColor:{
					dimensions:3,
					value:(d)=>whiteColor,//d.color,
				}
			},
			
			pointsPerObject:6,
			
			uniforms: {
				brightnessFactor:{
					value:()=>G.controls.get("linkBrightnessFactor"),
					dynamic:true
				},
				thicknessFactor:{
					value:()=>G.controls.get("linkThicknessFactor"),
					dynamic:true
				}
			},
			shader:"links",
		},
		heights:{
			//a map of all heights that appear in the view? like the old "layers"
			value:(g)=>{
				let heights={};let nodeHeights=g.nodeHeights;
				nodeHeights.forEach((height,index)=>{
					//if(Number.isNaN(height))throw Error();
					if(height in heights==false){
						if(height===null) return;//throw Error();
						heights[height]={v:0,e:0,nodes:[],links:[]};
					}
					heights[height].v++;heights[height].nodes.push(g.nodes[index]);
				});
				let linkSources=g.linkSources,linkTargets=g.linkTargets;
				g.links.forEach((link,index)=>{	//when should we count edges taht only have one side in it?
					//if(Number.isNaN(edge.layer))throw Error();
					let sl=nodeHeights[linkSources[index]],tl=nodeHeights[linkTargets[index]],l;
					if(sl==tl){
						heights[sl].e++;
						heights[sl].links.push(link);
					}
				});
				let heightsList=Object.keys(heights);
				addHiddenProperty(heights,"max",Math.max.apply(null,heightsList));
				addHiddenProperty(heights,"min",Math.min.apply(null,heightsList));
				addHiddenProperty(heights,"count",heightsList.length);
				return heights;
			}
		},
		lines:{
			object3dType:THREE.Mesh,
			value:(dataset)=>dataset.lines,
			properties:{
				brightness:{
					value:function(line) {return 1;//todo: should scale with the nodes
					},
					scaling:()=>({targetAvg:50*G.controls.get("lineBrightnessFactor")/Math.sqrt(G.dataset.vertices.length+1)}),//,maxScaled:G.lineThicknessFactor
				},
				position:{dimensions:3,value:(()=>{
					var v=new THREE.Vector3();
						return (d,i)=>{v.x=d.s.id;v.y=d.t.id;return v;}
					})(),
					perObject:true,
				},
				coord:{dimensions:3,value:(()=>{
					var v1=new THREE.Vector3(),v2=new THREE.Vector3(),v3=new THREE.Vector3(),v4=new THREE.Vector3();
					v1.x=1;v1.y=1; //s+sideways
					v2.x=1;v2.y=-1;//s-sideways
					v3.x=-1;v3.y=1;//t+sideways
					v4.x=-1;v4.y=-1;//t+sideways
					var array=[v1,v2,v3,v2,v4,v3];
					return ((d,i)=>array);
					})(),
				
				},
				//customColor:{dimensions:3,}
			},
			pointsPerObject:6,
			uniforms: {
				brightnessFactor:{
					value:()=>G.lineBrightnessFactor,
					dynamic:true
				},
				thicknessFactor:{
					value:()=>G.lineThicknessFactor,
					dynamic:true
				}
			},
			shader:"lines",
			//shaderParams:{},
		},
		
		
		stars:{
			//object3dType:THREE.Points,
			value:function(){var array=[];for(let i=0;i<4096;i++){array[i]=i;}return array;},//?? maybe the relevant lists should just be called nodes etc?
			attr:{
				position:{
					dimensions:3,
					value:function(){var v=new THREE.Vector3();return (d)=>{
						do{
						v.x=THREE.Math.randFloatSpread(5000);v.y=THREE.Math.randFloatSpread(5000);v.z=THREE.Math.randFloatSpread(5000);}
						while(v.length()>500*Math.random()+2000);
						let axesProb=0.1;
						let r=Math.random();if(r<axesProb){if(r<axesProb/2){v.x=0;v.z=0}else{v.y=0;v.z=0;}}//a kind of axes effect
						return v;
						}}(),//this returns a closure that reuses a vector
				},
				size:{value:()=>(Math.random()*0.5+0.5)},
				customColor:{
					dimensions:3,
					value:function(){var color=new THREE.Color();return (d)=>{
						var saturation=Math.random()*0.3;
						color.setHSL(Math.random()*360,saturation,1 - (saturation / 2));
						return color;
					}}(),
				}
			},
			uniforms:{
				texture:   { type: "t", value: particleMap },
			},
			shader:"stars",
			
		},
		
		waveLayers:{
			priority:3,
			object3dType:THREE.Mesh,
			value:(dataset)=>{//layers in expanded wave metanodes
				let result=[];
				for(let i=0;i<dataset.vertices.length;i++){
					let v=dataset.vertices[i];
					if(v.isMetanode&&v.waveLayers&&v.isExpanded){
						let clone=v.clones[Object.keys(v.clones)[0]];
						for(let j=0;j<v.waveLayers.length;j++){
							let l=v.waveLayers[j];
							//let obj={vertexID:i,layerInVertex:j};
							let obj={vertexID:clone.id,layerInVertex:j};
							Object.assign(obj,l);
							result.push(obj);
						}
					}
				}
				return result;
			},
			properties:{
				lineLength:{
					value:(d)=>Math.sqrt(d.v)*10//Math.log(v.v+0.5)
				},
			},
			pointsPerObject:6,
			attr:{
				position:{dimensions:3,value:(()=>{
					var v=new THREE.Vector3();
						return (d,i)=>{v.x=d.vertexID;v.y=d.layerInVertex;v.z=d.length;return v;}
					})(),
					perObject:true,
				},
				coord:{dimensions:3,value:(()=>{
					var v1=new THREE.Vector3(),v2=new THREE.Vector3(),v3=new THREE.Vector3(),v4=new THREE.Vector3();
					v1.x=1;v1.y=1; //s+sideways
					v2.x=1;v2.y=-1;//s-sideways
					v3.x=-1;v3.y=1;//t+sideways
					v4.x=-1;v4.y=-1;//t+sideways
					var array=[v1,v2,v3,v2,v4,v3];
					return ((d,i)=>array);
					})(),
				
				},
				lineLength:{
					value:(v)=>v.lineLength,
					perObject:true,
				},
				shape:{dimensions:2,value:(()=>{
					var v=new THREE.Vector2();
						return (d,i)=>{
							v.x=Math.sqrt(d.v)*10;//d.v;
							v.y=Math.max(0.07,(2*d.e/(d.v*d.v)))*v.x;
							//longer and  shorter axes
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
				rangeHighlight:{
					dimensions:3,value:(()=>{
					var v=new THREE.Vector3();
						return (d,i)=>{
							v.x=(d.layer==G.dataset.startLayer||d.layer==G.dataset.endLayer)?1:0;
							return v;
						}
					})(),
					perObject:true,
				},
			},
			uniforms: {
			},
			shader:"waveLayers",
			getObjectAtPos:function(pos){
				//if(G.dataset.vertexCount>1)return null;//only allow clicking when in the one wave view
				let buffer=G.view.getPositions(),vec=new THREE.Vector3(),tolerance=0.03;//ratio of the screen size
				let p1=new THREE.Vector2(),p2=new THREE.Vector2(),p3=new THREE.Vector2(),p4=new THREE.Vector2(),point=new THREE.Vector2().copy(pos);
				let nodePos=new THREE.Vector3(),eye=new THREE.Vector3(),horizontal=new THREE.Vector3(),vertical=new THREE.Vector3();
				let worldUp=new THREE.Vector3(0,0,1),tempPos=new THREE.Vector3();
				let bestDist=Infinity,bestObj=null,bestScreenPos=new THREE.Vector2();
				let waveLayers=G.dataset.waveLayers;//G.view.templates.waveLayers.dataCache;
				let shape=new THREE.Vector2();
				for(let layerObj of waveLayers){
					//{vertexID:clone.id,layerInVertex:j};
					let node=G.dataset.vArray[layerObj.vertexID];
					let i4=layerObj.vertexID*4;
					vec.x=buffer[i4];vec.y=buffer[i4+1];vec.z=buffer[i4+2];
					//for now just pick the closest layer, without calculating which ellipse is clicked?
					//for now just pick the closest layer, without calculating which ellipse is clicked?
					//shape.x and shape.y are length of half axes
					nodePos.copy(vec);
					nodePos.z-=layerObj.layerInVertex*5;//nodePos.z-=position.y*5.;//y is layerInVertex
					eye.copy(G.camera.position).addScaledVector(nodePos,-1);//vec3 eye=camera-nodePos;
					shape.x=Math.sqrt(layerObj.v)*10;
					shape.y=Math.max(0.07,(2*layerObj.e/(layerObj.v*layerObj.v)))*shape.x;
					horizontal.copy(worldUp).cross(eye).normalize().multiplyScalar(0.5*shape.x);//vec3 horizontal=normalize(cross(worldUp,eye))/2.;//*10.;
					vertical.copy(horizontal).cross(worldUp).normalize().multiplyScalar(0.5*shape.y);;//vec3 vertical=normalize(cross(worldUp,horizontal))/2.;//*10.;
					//vec3 up=normalize(cross(horizontal,eye));
					tempPos.copy(nodePos).addScaledVector(horizontal,1).addScaledVector(vertical,1).applyMatrix4(G.view.templates.nodes.object3d.matrixWorld).project(G.camera);p1.copy(tempPos);
					tempPos.copy(nodePos).addScaledVector(horizontal,1).addScaledVector(vertical,-1).applyMatrix4(G.view.templates.nodes.object3d.matrixWorld).project(G.camera);p2.copy(tempPos);
					tempPos.copy(nodePos).addScaledVector(horizontal,-1).addScaledVector(vertical,-1).applyMatrix4(G.view.templates.nodes.object3d.matrixWorld).project(G.camera);p3.copy(tempPos);
					tempPos.copy(nodePos).addScaledVector(horizontal,-1).addScaledVector(vertical,1).applyMatrix4(G.view.templates.nodes.object3d.matrixWorld).project(G.camera);p4.copy(tempPos);
					
					let result=pointInPolygon(point,[p1,p2,p3,p4]);
					//let screenPos = vec.applyMatrix4(G.view.templates.nodes.object3d.matrixWorld).project(G.camera);
					//let dx=screenPos.x-pos.x,dy=screenPos.y-pos.y,dist=Math.sqrt(dx*dx+dy*dy);
					
					if(result){
						console.log("clicked "+pos.x+","+pos.y+" inside layer "+layerObj.layerInVertex+" polygon: ("+p1.x+","+p1.y+") "+"("+p2.x+","+p2.y+") "+"("+p3.x+","+p3.y+") "+"("+p4.x+","+p4.y+") ");
						bestObj=layerObj;
					}
				}
				return bestObj;
			},
			onrightclick:function(){
				
			},
		},
		waveInterlayers:{
			priority:2,
			object3dType:THREE.Mesh,
			value:(dataset)=>{//layers in expanded wave metanodes
				let result=[];
				for(let i=0;i<dataset.vertices.length;i++){
					let v=dataset.vertices[i];
					if(v.isMetanode&&v.waveLayers&&v.isExpanded){
						let clone=v.clones[Object.keys(v.clones)[0]];
						for(let j=1;j<v.waveLayers.length;j++){
							let prevLayer=v.waveLayers[j-1],nextLayer=v.waveLayers[j];
							let edgesToNextLayer=(prevLayer.forwardEdgeDetails&&prevLayer.forwardEdgeDetails[prevLayer.layer+1])?prevLayer.forwardEdgeDetails[prevLayer.layer+1]:0;
							//let obj={vertexID:i,sourceLayer:j-1,sourceLayerObj:prevLayer,targetLayer:j,targetLayerObj:nextLayer,density:edgesToNextLayer/(prevLayer.v*nextLayer.v)};
							let obj={vertexID:clone.id,sourceLayer:j-1,sourceLayerObj:prevLayer,targetLayer:j,targetLayerObj:nextLayer,density:edgesToNextLayer/(prevLayer.v*nextLayer.v)};
							result.push(obj);
						}
					}
				}
				return result;
			},
			properties:{
			},
			pointsPerObject:6,
			attr:{
				position:{dimensions:3,value:(()=>{
					var v=new THREE.Vector3();
						return (d,i)=>{
							v.x=d.vertexID;v.y=d.sourceLayer;v.z=d.targetLayer;return v;
						}
					})(),
				},
				coord:{dimensions:3,value:(()=>{
					var v1=new THREE.Vector3(),v2=new THREE.Vector3(),v3=new THREE.Vector3(),v4=new THREE.Vector3();
					v1.x=1;v1.y=1; //s+sideways
					v2.x=1;v2.y=-1;//s-sideways
					v3.x=-1;v3.y=1;//t+sideways
					v4.x=-1;v4.y=-1;//t-sideways
					var array=[v1,v2,v3,v2,v4,v3];
					return ((d,i)=>array);
					})(),
				
				},
				lineLengths:{dimensions:2,value:(()=>{
					var v=new THREE.Vector2();
						return (d,i)=>{
							//v.x=Math.log(d.sourceLayerObj.v+0.5);v.y=Math.log(d.targetLayerObj.v+0.5);return v;
							v.x=Math.sqrt(d.sourceLayerObj.v)*10;//Math.log(d.sourceLayerObj.v+0.5);
							v.y=Math.sqrt(d.targetLayerObj.v)*10;//Math.log(d.targetLayerObj.v+0.5);
							return v;
						}
					})(),
				},
				density:{
					value:(d)=>d.density,
					perObject:true,//causes it to be replicated for all points in an obejct
					//scaling isn't done here, instead it needs to be done beforehand, and stored for teh value getter's use 
				},
			},
			uniforms: {
			},
			shader:"waveInterlayers",
		},
		levelDisks:{
			priority:-1,
			object3dType:THREE.Mesh,
			value:(dataset)=>{//layers in expanded wave metanodes
				let result=[];
				if(!dataset.showingInterlayers)return result;
				for(let l in dataset.layers){
					let layerObj=dataset.layers[l];
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
						for(let node of G.dataset.clonedVertices){
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
				}
			},
			pointsPerObject:6,
			attr:{
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
				coord:{dimensions:3,value:(()=>{
					var v1=new THREE.Vector3(),v2=new THREE.Vector3(),v3=new THREE.Vector3(),v4=new THREE.Vector3();
					v1.x=1;v1.y=1; //s+sideways
					v2.x=1;v2.y=-1;//s-sideways
					v3.x=-1;v3.y=1;//t+sideways
					v4.x=-1;v4.y=-1;//t-sideways
					var array=[v1,v2,v3,v2,v4,v3];
					return ((d,i)=>array);
					})(),
				
				},
			},
			uniforms: {
			},
			shader:"levelDisks",
		},
	},
	getObjectsFromGraph:function(graph,heightPropertyType,heightPropertyName){
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
		
	},
	
	getObjectsFromHierarchy(graph,heightPropertyType,heightPropertyName){
		let graphObjects=[];
		let queue=[];
		queue.push(graph);
		while(queue.length>0){
			let newGraph=queue.shift();
			let result=this.getObjectsFromGraph(newGraph,heightPropertyType,heightPropertyName);
			result.graph=newGraph;
			graphObjects.push(result);
			if(newGraph.isMetagraph){
				for(let vID=0;vID<newGraph.vertices.length;vID++){
					let v=newGraph.vertices[vID];
					if(v.isMetanode!==false&&v.isExpanded&&v.subgraph){
						queue.push(v.subgraph);
					}
				}
			}
		}
		//now, put all the objects from different graphs into a consistent list
		//each node must know which graph it was from, and which metanode it exists in if applicable, and each edge should point to the correct node in its graph, using the global node ID.
		let nodes=[],links=[],nodeHeights=[],linkSources=[],linkTargets=[],lines=[],nodeGraphIDs=[];
		let graphMap=new Map();let graphList=[];
		
		for(let graphID=0;graphID<graphObjects.length;graphID++){
			let result=graphObjects[graphID];let g=result.graph;graphMap.set(g,graphID);graphList.push(g);
			let metanodeID=null,globalMetanodeID=null;
			let nodeOffset=nodes.length;result.nodeOffset=nodeOffset;
			if(g.parent&&(g!=graph)){//don't go to the parent of the crrent graph
				
				metanodeID=g.metanodeID;globalMetanodeID=metanodeID+graphObjects[graphMap.get(g.parent)].nodeOffset;result.globalMetanodeID=globalMetanodeID;result.metanodeID=metanodeID;
			}
			nodes=nodes.concat(result.nodes);
			nodeHeights=nodeHeights.concat(result.nodes.map(result.height).map((h)=>{if(h===undefined)return (nodeHeights[globalMetanodeID]?nodeHeights[globalMetanodeID]:0)}));//follow the metanode's height if the height is not defined for the subgraph
			links=links.concat(result.links);
			linkSources=linkSources.concat(result.links.map(result.source).map((i)=>i+nodeOffset));
			linkTargets=linkTargets.concat(result.links.map(result.target).map((i)=>i+nodeOffset));
			//results contain link endpoint getters, but the returned IDs need to be increased by the existing node offset.
			lines=lines.concat(result.lines?result.lines:[]);
			nodeGraphIDs=nodeGraphIDs.concat(result.nodes.map(()=>graphID));
			
		}
		let adjlist=nodes.map(()=>({}));
		links.forEach((link,i)=>{
			let s=linkSources[i],t=linkTargets[i];
			adjlist[s][t]=i;adjlist[t][s]=i;
		})
		return {graphObjects:graphObjects,nodes:nodes,links:links,adjlist:adjlist,lines:lines,nodeHeights:nodeHeights,nodeGraphIDs:nodeGraphIDs,graphList:graphList,graphMap:graphMap,linkSources:linkSources,linkTargets:linkTargets};
	},
	getNodeOriginalObject:function(nodeID){
		let dataset=G.dataset;
		let nodeGraphID=dataset.nodeGraphIDs[nodeID];
		let originalGraph=dataset.graphList[nodeGraphID];
		let originalVertexID;
		if("original" in dataset.nodes[nodeID])originalVertexID=dataset.nodes[nodeID].original;//clone object
		else originalVertexID=dataset.nodes[nodeID].index;//vertex object
		return {graph:originalGraph,vertexID:originalVertexID};
		
	},//todo
	
	
	initModifierControls:function(){
		let modMenuElem=getE("controls-menu");//getE("modifiers-menu");
		modMenuSelection=d3.select(modMenuElem);
		let modifierItemsObj=Object.keys(this.modifiers);
		G.controls.addDropdownMenu(modMenuElem,"style modifiers",modifierItemsObj,(name)=>{
			G.view.enableModifier(name);
		});
		for(let name in this.modifiers){
			let modObj=this.modifiers[name];
			modObj.controlsSelection=modMenuSelection.append("div").attr("class","modifier-controls").style("display","none");
			modObj.controlsElem=modObj.controlsSelection.node();
			modObj.modLabelSelection=modObj.controlsSelection.append("p").attr("class","modifier-controls-title").text(toNormalText(name)+" \u2716").on("click",()=>{modObj.controlsSelection.style("display","none");delete G.dataset.modifiers[name];modObj.needsUpdate=true;G.view.refreshStyles(true);});
			modMenuElem.appendChild(modObj.controlsElem);
			if(modObj.params){
				for(let paramName in modObj.params){
					let paramObj=modObj.params[paramName];
					switch(paramObj.type){
						case "integer":
							paramObj.cache={min:0,max:1};
							G.controls.addSlider(modObj.controlsElem,toNormalText(paramName),function(value){
								let dataset=G.dataset;
								dataset.modifiers[name][paramName]=value;
								modObj.needsUpdate=true;G.view.refreshStyles(true);
							},paramObj.cache);
							let stepButtonsAreaSelection=modObj.controlsSelection.append("div");
							let stepButtonsArea=stepButtonsAreaSelection.node();
							
							let getStepFunc=function(delta){
								return function(){
									let dataset=G.dataset;let end=false;
									dataset.modifiers[name][paramName]+=delta;
									if(dataset.modifiers[name][paramName]<paramObj.cache.min){dataset.modifiers[name][paramName]=paramObj.cache.min;end=true;}
									if(dataset.modifiers[name][paramName]>paramObj.cache.max){dataset.modifiers[name][paramName]=paramObj.cache.max;end=true;}
									paramObj.cache.onUpdate(dataset.modifiers[name][paramName]);
									modObj.needsUpdate=true;G.view.refreshStyles(true);
									return end;
								}
							};
							let backwardFunc=getStepFunc(-1),forwardFunc=getStepFunc(1);
							paramObj.timeoutFuncs={};
							let getAnimateFunc=function(delta){
								let stepFunc=getStepFunc(delta);
								paramObj.timeoutFuncs[delta]=()=>{
									let ended=stepFunc();
									if(ended){paramObj.cache.animating=false;}
									if(paramObj.cache.animating){paramObj.cache.animateTimeout=setTimeout(paramObj.timeoutFuncs[delta],paramObj.cache.animateInterval);}
								};
								return function(){
									if(paramObj.cache.animating){//stop
										paramObj.cache.animating=false;
									}
									else{//start a timeout that will set itself again if animating is true
										paramObj.cache.animating=true;
										paramObj.cache.animateDelta=delta;
										paramObj.cache.animateTimeout=setTimeout(paramObj.timeoutFuncs[delta],paramObj.cache.animateInterval);
									}
								}
								return paramObj.timeoutFuncs[delta];
							};
							
							if(!(paramObj.noAnimate==true)){//right click animates; now allow animation by default, unless it's disabled because the oepration is expensive or something
								paramObj.cache.animateInterval=paramObj.animateInterval?paramObj.animateInterval:1000;
								G.controls.addSmallButton(stepButtonsArea,"<",getStepFunc(-1),getAnimateFunc(-1));
								G.controls.addSmallButton(stepButtonsArea,">",getStepFunc(1),getAnimateFunc(1));
							}
							else{
								G.controls.addSmallButton(stepButtonsArea,"<",getStepFunc(-1));
								G.controls.addSmallButton(stepButtonsArea,">",getStepFunc(1));
							}
							break;
						case "float":
						case "number":
							break;
						case "boolean":
							let checkCallback=function(value){
								G.dataset.modifiers[name][paramName]=value;
								modObj.needsUpdate=true;G.view.refreshStyles(true);
							};
							G.controls.addCheckbox(modObj.controlsElem,toNormalText(paramName),checkCallback);
							//just need a checkbox?
							break;
						case "select":
							let selectCallback=(value)=>{
								G.dataset.modifiers[name][paramName]=value;
								if(paramObj.func)paramObj.func(value);
							}
							G.controls.addDropdownSelect(modObj.controlsElem,toNormalText(paramName),paramObj.options,selectCallback);
							//dropdown select shows the current selected value, whereas dropdown menu doesn't
							break;
						case "button":
							paramObj.cache={};
							let clickCallback=function(){
								if(paramObj.func){paramObj.func(G.dataset);}
								//G.dataset.modifiers[name][paramName]=true;
								modObj.needsUpdate=true;G.view.refreshStyles(true);
							};
							let getAnimateCallback=function(delta){
								paramObj.timeoutFunc=()=>{
									clickCallback();
									if(paramObj.cache.animating)paramObj.cache.animateTimeout=setTimeout(paramObj.timeoutFunc,paramObj.cache.animateInterval);
								};
								return function(){
									if(paramObj.cache.animating){//stop
										paramObj.cache.animating=false;
									}
									else{//start a timeout that will set itself again if animating is true
										paramObj.cache.animating=true;
										paramObj.cache.animateTimeout=setTimeout(paramObj.timeoutFunc,paramObj.cache.animateInterval)
									}
								}
								return paramObj.timeoutFuncs[delta];
							};
							let animateCallback=getAnimateCallback();
							if(!(paramObj.noAnimate==true)){//right click animates; now allow animation by default, unless it's disabled because the oepration is expensive or something
								paramObj.cache.animateInterval=paramObj.animateInterval?paramObj.animateInterval:1000;
								G.controls.addSmallButton(modObj.controlsElem,toNormalText(paramName),clickCallback,animateCallback);
							}
							else{
								G.controls.addSmallButton(modObj.controlsElem,toNormalText(paramName),clickCallback);
							}
							
							break;
					}
					
				}

			}
		}
		
	},
	refreshModifierControls:function(name){
		let dataset=G.dataset;
		if(!dataset){G.addLog("please load a dataset first");return;}
		let modObj=this.modifiers[name];
		let modParamsObj=dataset.modifiers[name];
		if(modObj.onEnable){
			modObj.onEnable(dataset,modParamsObj);
		}
		if(modObj.params){
			for(let paramName in modObj.params){
				let paramObj=modObj.params[paramName];
				
				switch(paramObj.type){ //does this only affect numbers? for now maybe, but later other things can change based on other parameters
					case "integer":
						//reset the value and recalculate min/max 
						let min=modObj.params[paramName].min;
						if(!min)min=0;
						let max=modObj.params[paramName].max;
						if(!max)max=1;
						if(typeof min=="function"){min=min(dataset,modParamsObj);}
						if(typeof max=="function"){max=max(dataset,modParamsObj);}
						checkNumber(min);
						checkNumber(max);
						paramObj.cache.min=min;
						paramObj.cache.max=max;
						if(modParamsObj[paramName]<max){//ensure it's in the range
							if(modParamsObj[paramName]>min){}
							else{modParamsObj[paramName]=min;}
						}
						else{modParamsObj[paramName]=max;}
						paramObj.cache.onUpdate(modParamsObj[paramName]);
							
						break;
					case "float":
					case "number":
						break;
					case "boolean":
						
						break;
					case "select":
						break;
					case "button":
						break;
				}
				
			}

		}
	},
	enableModifier:function(name){
		let dataset=G.dataset;if(!dataset){G.addLog("please load a dataset first");return;}
		if(dataset.modifiers[name]){
			this.refreshModifier(name);
			return;
		}
		//check conditions: now conditions determine if a dataset can have this style, not whetehr it is currently showing this style
		let modObj=G.view.modifiers[name];
		if(modObj.condition){
			let result=modObj.condition(dataset);
			if(!result){G.addLog("this dataset cannot have this style");return;}
		}
		//now it can have this style
		let modParamsObj={};
		dataset.modifiers[name]=modParamsObj;
		if(modObj.onEnable){
			modObj.onEnable(dataset,modParamsObj);//some styles (ie SN) needs to do computation when it's enabled
		}
		if(modObj.params){
			for(let paramName in modObj.params){
				let paramObj=modObj.params[paramName];
				let value=modObj.params[paramName].value;
				if(typeof value=="function"){value=value(dataset,modParamsObj);}//earlier parameters may be used t change later ones?
				modParamsObj[paramName]=value;
				//modifier template parameters (like filter property name) should not be mixed with control parameters (like threshold)
				switch(paramObj.type){//most types can be animated, with animate:true and animationInterval
					case "integer":
						//change other config like min/max
						let min=modObj.params[paramName].min;
						if(!min)min=0;
						let max=modObj.params[paramName].max;
						if(!max)max=1;
						if(typeof min=="function"){min=min(dataset,modParamsObj);}
						if(typeof max=="function"){max=max(dataset,modParamsObj);}
						checkNumber(min);
						checkNumber(max);
						paramObj.cache.min=min;
						paramObj.cache.max=max;
							
						break;
					case "float":
					case "number":
						break;
					case "select":
						break;
					case "button":
						break;
				}
				
			}

		}
		modObj.controlsElem.style.display="";
		modObj.needsUpdate=true;G.view.refreshStyles(true);
	},
	refreshModifier:function(name){
		G.view.modifiers[name].needsUpdate=true;
		G.view.refreshStyles(true);
		
	},
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
	
	
	//some helpers
	resizeCanvas:function resizeCanvas() {
		var w = G.canvasContainer.clientWidth;
		var h = G.canvasContainer.clientHeight;
		this.canvasWidth=w;this.canvasHeight=h;
		G.renderer.setSize(w, h);
		G.cameras.perspective.aspect = w / h;
		G.cameras.perspective.updateProjectionMatrix();
		let ortho=G.cameras.orthographic;
		ortho.left=window.innerWidth/-2;
		ortho.right=window.innerWidth/2;
		ortho.top=window.innerHeight/-2;
		ortho.bottom=window.innerWidth/2;
		ortho.updateProjectionMatrix();
		G.effectFXAA.uniforms['resolution'].value.set(1 / (G.canvasContainer.clientWidth * dpr), 1 / (G.canvasContainer.clientHeight * dpr));
		G.composer.setSize(G.canvasContainer.clientWidth * dpr, G.canvasContainer.clientHeight * dpr);
	},

	layoutInputs:{},
	getNodePos:function(node){
		if((typeof node)!="object")node=G.dataset.vArray[node];if(!node)return;
		let buffer=this.getPositions(),vec=new THREE.Vector3();
		let i=node.id,i4=i*4;
		vec.x=buffer[i4];vec.y=buffer[i4+1];vec.z=buffer[i4+2];
		return vec;
	},
	getVerticesPos:function(){
		let buffer=this.getPositions();
		if(!G.dataset)return null;
		let result=[];
		for(let v of G.dataset.vertices){
			
			let node=v.clones[Object.keys(v.clones)[0]];
			let i=node.id,i4=i*4;
			result.push({x:buffer[i4],y:buffer[i4+1],z:buffer[i4+2]});
		}
		return result;
	},
	getObjectAtPos:function(pos){
		let highestPriority=0;
		let bestResult=null;
		let bestType=null;
		for(let type in this.templates){
			let obj=this.templates[type];
			let priority=obj.selectionPriority?obj.selectionPriority:0;
			if((priority>=highestPriority)&&(obj.getObjectAtPos)){
				let result=obj.getObjectAtPos(pos);
				if(result){
					bestResult=result;
					highestPriority=priority;
					bestType=type;
				}
			}
		}
		if(bestResult==null)return null;
		else {
			//get the original vertex and belonging graph (some visual objects may not have any corresponding vertex, like wave layers; others have one even though they are not nodes, like lines)
			let obj=this.templates[bestType];
			let graph=this.getBelongingGraph(bestType,bestResult);
			if(obj.getOriginalVertex){//todo; a universal way to get the belonging graph of any object
				let originalVertex=obj.getOriginalVertex(bestResult);
			}
			return {type:bestType,object:bestResult,originalGraph:graph,originalVertex:originalVertex};
		}
	},
	getObjectsInBBox:function(region){//todo: now this only selects vertices
		let selected={},pos=new THREE.Vector3();let layer=G.activeLayer;
		let buffer=G.view.getPositions();
		for(let i in G.dataset.nodes){
			let n=G.dataset.nodes[i];
			let offset=n.id*4;
			pos.x=buffer[offset];pos.y=buffer[offset+1];pos.z=buffer[offset+2];
			let screenPos = pos.applyMatrix4(G.view.templates.nodes.object3d.matrixWorld).project(G.camera);
			if(((screenPos.x-region.left)*(screenPos.x-region.right)<0)&&((screenPos.y-region.top)*(screenPos.y-region.bottom)<0)){
				//console.log("selected coords :"+screenPos.x+", "+screenPos.y);
				//if(layer!==null && n.layer!=layer){continue;}//todo: what does the two have in common that should reuse teh same code?
				let original=this.getNodeOriginalObject(i);
				if(original.graph!=G.dataset){continue;}//todo: should we be able to select each (sub)graph 
				selected[original.vertexID]=true;
			}
		}
		return selected;
	},
	inspect:function inspect(t){//for layout debug
		G.renderer.readRenderTargetPixels ( t, 0,0, 1, 1, this.testBuffer );
		console.log(this.testBuffer.join(","));
	},
	positionsChanged:false,
	getPositions:function(){
		
		if(!(this.simulation&&this.simulation.dataBuffer))return null;//throw Error("no position buffer");
		if(this.positionsChanged){G.renderer.readRenderTargetPixels ( this.simulation.out, 0,0, this.simulation.textureSize, this.simulation.textureSize, this.simulation.dataBuffer );this.positionsChanged=false;}
		return this.simulation.dataBuffer;
	},

	refreshAttrs:function(updateAll){//now, it creates attrs directly from properties marked as such, turning arrays of vectors into typed arrays using the dimensions property.
		//geometry and attrs
		let dataset=G.dataset;
		for(let name in this.templates){
			let obj=this.templates[name];let data=dataset[name],length=data.length;//should only be created once - todo: attach as a module to graph objects?
			if(G.DEBUG)console.log("scene object "+name);
			//properties are computed before textures are created
			let geometry=obj.geometry;//new THREE.BufferGeometry();geometry.name=name;obj.geometry=geometry;obj.object3d.geometry=geometry;
			if(!geometry)continue;
			let ppo=obj.pointsPerObject?obj.pointsPerObject:1;
			for(let attrName in obj.properties){
				let attr=obj.properties[attrName];if(attr.isAttribute===false)continue;
				let dimensions=attr.dimensions?attr.dimensions:1;
				let propertyData=dataset[name][attrName];
				let bufferAttr=geometry.attributes[attrName];
				let oldLength=(bufferAttr?(bufferAttr.array.length):null),newLength=length*dimensions*ppo;
				if(oldLength!==newLength){
					if(geometry.attributes[attrName])geometry.removeAttribute(attrName);
					let dimensions=attr.dimensions?attr.dimensions:1;
					bufferAttr=new THREE.BufferAttribute(new Float32Array(newLength),dimensions);
					if(attr.dynamic)bufferAttr.setDynamic(true);
					geometry.addAttribute(attrName,bufferAttr);
					geometry.getAttribute(attrName).needsUpdate=true;
				}
				let buffer=bufferAttr.array;
				if(attr.needsUpdate||updateAll){
					var warned=false;
					propertyData.forEach((d,i,array)=>{
						let offset=i*dimensions*ppo;
						let value=attr.attrValue?attr.attrValue:d;//different from the property value, the attrValue function may return values per point.
						//if it's a function, the return value is for each data object, not for the whole buffer; if there's no such function, just use the property value(note: can we use the typed array if the property is already typed?)
						if(typeof value=="function"){value=value(d,i,array);}//same arguments as forEach; if ppo>1 return an array(or if it's not an array, we use the same value for all points in the object)
							//the attr value should depend on the property value, not the whole object data, otherwise we should make it another property?
						for(let j=0;j<ppo;j++){
							let pointValue=value;
							//distinguish between per-object and per-point initializations, and give a warning for unexpected values
							if(!attr.perPoint){//no point index
							}
							else{//now per point has to be flagged, and per object is the default (because only link coords and such afe per point)
								if(ppo!=1){//must use an array for points and objects for vectors??
									if (Array.isArray(pointValue)){pointValue=value[j];}
									else{if(!warned){console.log("Warning: per point attribute result is not an array: "+attrName);warned=true;}}
								}
							}
							setArrayDataItem(pointValue,buffer,offset,dimensions);
							offset+=dimensions;
						}
					});
					geometry.getAttribute(attrName).needsUpdate=true;

				}
			}
		}
	},
	"blending type":1,
	refreshUniforms:function(updateAll){
		let graph=G.dataset;
		for(let name in this.templates){
			let obj=this.templates[name];let data=graph[name],length=data.length;//should only be created once - todo: attach as a module to graph objects?
			if(!obj.object3d){continue;}
			let materialUniforms=obj.object3d.material.uniforms;
			if(!materialUniforms){//initialize material, because it must be done after module init after loading shaders
				materialUniforms={};//must init all uniforms in it before creating the material?
				for(let uniformName in obj.uniforms){
					materialUniforms[uniformName]={};
					if(obj.uniforms[uniformName].isArray){materialUniforms[uniformName+"Size"]={};}
				}
				for(let uniformName in this.sharedUniforms){
					materialUniforms[uniformName]={};
					if(this.sharedUniforms[uniformName].isArray){materialUniforms[uniformName+"Size"]={};}
				}
				obj.material=new THREE.ShaderMaterial( {
					uniforms:materialUniforms,
					vertexShader: this.getVertexShader(obj.shader),
					fragmentShader: this.getFragmentShader(obj.shader),
					transparent: true,depthTest:false,
					side: THREE.DoubleSide,blending:G.view["blending type"],
				} );
				obj.object3d.material=obj.material;
			}
			for (let uniformName in obj.uniforms){
				let uniform=obj.uniforms[uniformName];
				if(uniform.dynamic){uniform.needsUpdate=true;}
				if(uniform.needsUpdate||updateAll){
					this.updateUniform(uniform,materialUniforms,uniformName,graph);
					 
				}
			}
		}
		//dynamic ones or updated ones; needsUpdate can be set from outside
		//since this is reused to initialize all uniforms too, it must attach shared ones as well
		for(let uniformName in this.sharedUniforms){
			let uniform=this.sharedUniforms[uniformName];
			if(uniform.dynamic){uniform.needsUpdate=true;}
			if(uniform.needsUpdate||updateAll){//don't change the uniforms on the GPU if it doesn't need updating
				for(let name in this.templates){
					if(!this.templates[name].object3d)continue;
					let us=this.templates[name].material.uniforms;
					if(us[uniformName]){this.updateUniform(uniform,us,uniformName,G.dataset);}
				}
				//update for the simulation too
				if(this.simulationShader){
					let us=this.simulationShader.uniforms;
					//if(!us[uniformName]){}
					this.updateUniform(uniform,us,uniformName,G.dataset);
				}
			}
		}
	},

	refreshStyles:function(updateAll){
		//this.refreshProperties(updateAll);
		this.applyTemplates(G.dataset,updateAll?true:false);
		this.refreshAttrs(updateAll);
		this.refreshUniforms(updateAll);
	},
	updateStyle:function(objectType,propertyName){
		//the args are the reason for teh upate if any, and obejct type can be global -  global JS value, or a logical view object, and te property refers to a property of it (or a global data name), and this can only be used for properties/globals, and not update attrs/uniforms directly, since those are updated when properties are afected.
		//the update caller should specify which property/properties need updating if possible, otherwise everything is updated.
		//todo
	},
	
	resetView:function(){
		let cameraHeight=(G.dataset)?(Math.sqrt((G.dataset.vertexCount?G.dataset.vertexCount:(G.dataset.vertices?G.dataset.vertices.length:0))+1)):100;
		for(let name in G.cameras){
			G.cameras[name].position.x = 0;
			G.cameras[name].position.y = 0;
			G.cameras[name].position.z = Math.min(15000,cameraHeight * CAMERA_DISTANCE2NODES_FACTOR+1);//sqrt instead of cbrt because the layout is often quite flat
		}
		if(cameraHeight * CAMERA_DISTANCE2NODES_FACTOR+1==0)throw Error("view control error");
		G.cameraControls.target.x=0;
		G.cameraControls.target.y=0;
		G.cameraControls.target.z=0;
	},
	
	sideView:function(){
		G.cameraControls.reset();//necessary here
		
		let zCenter=0;//G.zHeight({layer:G.dataset.maxLayer})/2,
		let radialDistance=15000;//Math.min(G.radialLimit*3,15000);//camera far?
		for(let name in G.cameras){
			G.cameras[name].position.x = radialDistance;
			G.cameras[name].position.y = 0;
			G.cameras[name].position.z = zCenter;
		}
		
		G.cameraControls.target.x=0;
		G.cameraControls.target.y=0;
		G.cameraControls.target.z=zCenter;
	},
	randomizeLayout:function(){
		if(!G.dataset.vArray){console.log("layout not initialized");return;}
		let size=G.dataset.vArray.length;
		let radius=Math.cbrt(size);
		for(var i=0;i<size;i++){
			let v=G.dataset.vArray[i];
			v.x=(Math.random()-0.5)*radius;
			v.y=(Math.random()-0.5)*radius;
			v.z=(Math.random()-0.5)*radius;
		}
		this.loadDataset(G.dataset);
	},
	
	
	//helpers
	
	
	initUniform(template,args){//for one uniform template
		let value=template.value;if(typeof value=="function"){value=value(args);}
		let realValue=value;
		if(template.isArray){
			//let uniformSizeName=uniformName+"Size";
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
			template.sizeCache=size;
		}
		template.dataCache=value;
		template.valueCache=realValue;
	},
	updateUniform(template,uniformsObj,uniformName,args){
		//template.dynamic is not tested here, instead it sets needsUpdate every frame - no point updating more often than that
		if((template.needsUpdate)||(template.valueCache===undefined)){
			this.initUniform(template,args);
		}
		template.needsUpdate=false;
		
		let newobj={value:template.valueCache};
		
		if(template.type){newobj.type=template.type;}
		uniformsObj[uniformName]=newobj;
		if(template.isArray){
			let uniformSizeName=uniformName+"Size";
			let newSizeObj={value:template.sizeCache};uniformsObj[uniformSizeName]=newSizeObj;
		}
	},
	getVertexShader(text){
		if(!this.shaderSources[text+".vs"])throw Error();
		let params={};
		for(let name in this.shaderConstants){
			let value=this.shaderConstants[name];
			if(typeof value=="function")value=value.call(this,G.dataset);
			params[name]=value;
		}
		
		return replaceShaderParams(this.shaderLib+"\n"+this.shaderSources[text+".vs"],params);//params can take numbers
	},
	getFragmentShader(text){
		if(!this.shaderSources[text+".fs"])throw Error();
		let params={};
		for(let name in this.shaderConstants){
			let value=this.shaderConstants[name];
			if(typeof value=="function")value=value.call(this,G.dataset);
			params[name]=value;
		}
		return replaceShaderParams(this.shaderLib+"\n"+this.shaderSources[text+".fs"],params);
	},
});
