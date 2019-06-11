
//allow multiple views (logical subcanvases) that may share WebGL stuff. a view should auto-follow the size and position as an HTML element. There is a separate class of subcanvases that control where to draw, so that different views can be assigned to the same subcanvas, and subcanvas can share views as needed. And because of the way that camera aspect ratios work, cameras need to be associated with subcanvases.


//problem with subcanvases: if they ever need to be small pictures in another element (like in the middle of text), we cannot have a hole in the text element to show the canvas under it (and we cannot have teh canvas over text either). One option might be to draw the text on top of the canvas. Or, another possibility is to allow one type of subcanvas to be indirectly rendered, like first rendering to the main canvas then copying to another canvas embedded inn the text.



let subcanvasList=[];
class Subcanvas{ //some controls are at the canvas level, like cameras switching and reset
	constructor(elem,options){
		subcanvasList.push(this);
		this.model=null;
		this.containerElement=elem;
	}
	activate(model){
		if(model)this.model=model;
		//G.view.animateOnce.call(G.view);//if the element's size and positions have changed, make sure to render to the correct region (for example when a subcanvas is added) - works only when there are two subcanvases
		G.view.subcanvas=this;
		G.view.resizeCanvas();
		if(G.view.dataset!=this.dataset){
			G.load(this.dataset);	
		}
	}
	
}


class View{//a logical view, scene objects and uniforms and shaders etc for a graph(manages its model), but not attached to the subcanvas
	constructor(canvasContainer){
		//actually creates a logical sub-canvas with its own view model, layout, scene and cameras, (and optionally controls later??)
		let view=this;
		view.graph=null;
		view.zoomOutDistance=()=>{
			let maxHeight=view.dataset?(500.0*Math.sqrt(Math.log(view.dataset.maxLayer+1.))*view.controls.get("heightFactor")+5000):0;
			let maxRadius=view.dataset?(this.sharedUniforms.radialLimit.value()*view.controls.get("radialLimitFactor")*3+5000):0;
			return Math.max(10000,maxHeight,maxRadius);
		};
		view.resetView=this.resetView;
		view.cameras={perspective:new THREE.PerspectiveCamera( ),orthographic:new THREE.OrthographicCamera(window.innerWidth/ - 2, window.innerWidth/ 2, window.innerHeight/ 2, window.innerHeight / - 2, 1, 20000) };//50, window.innerWidth / window.innerHeight, 0.1, 50000 
		view.cameras.perspective.far = 20000;
		view.cameras.perspective.near = 0.01;
		view["camera type"]="perspective";
		view.camera = view.cameras.perspective;//new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 1000 );
		//scene.add( camera );
		for(let name in view.cameras){
			view.cameras[name].position.x = 0;
			view.cameras[name].position.y = 0;
			view.cameras[name].position.z = 1000;//sqrt instead of cbrt because the layout is often quite flat
		}
		view.cameraControls = new MyControls(view.cameras,view.renderer.domElement,view);
		
		view.scene = new THREE.Scene();var scene=view.scene;
		scene.background = new THREE.Color(0xffffff);
		G.lightStyle=true;
		scene.fog = new THREE.FogExp2(0xaaaaaa,0.005);
		//debugging
		view.testBuffer=new Float32Array( 4 );
		
		let objectOrder=Object.keys(this.templates).sort(compareBy((x)=>(this.templates[x].priority?this.templates[x].priority:0),true));
		for(let name of objectOrder){
			let obj=this.templates[name];
			if(obj.object3dType){
				obj.geometry=new THREE.BufferGeometry(name);
				obj.object3d=new obj.object3dType(obj.geometry,obj.material);
				obj.object3d.frustumCulled=false;//get rid of annoying disappearing problem
				view.scene.add(obj.object3d);
			}
		}
		
		let objectsVisibilityObj={};
		for(let name of objectOrder){
			let obj=this.templates[name];
			if(obj.object3dType){
				objectsVisibilityObj[name]=()=>obj.object3d.visible=(!obj.object3d.visible);
			}
		}
		let viewButtomsElem=getE("view-buttons-area");
		G.controls.addDropdownMenu(viewButtomsElem,"show/hide",objectsVisibilityObj,{upward:true});
		
		
		view.renderer = new THREE.WebGLRenderer( {
			antialias: false, //canvas: canvas, context: context ,clearColor: 0x000000, clearAlpha: 0, 
			preserveDrawingBuffer: true,
		} );
		var canvas=view.renderer.domElement;
		var context = view.renderer.context;
		view.renderer.setSize( window.innerWidth, window.innerHeight );
		view.canvasContainer=canvasContainer;
		view.canvasContainer.appendChild( view.renderer.domElement );
		view.canvasElement=view.renderer.domElement;
		view.gl=view.renderer.getContext();
		if ( ! view.gl.getExtension( 'OES_texture_float' ) ) {alert( 'Your browser does not support this application:  OES_texture_float is not available' );}
		this.maxTextureSize=view.gl.getParameter(view.gl.MAX_TEXTURE_SIZE);if(G.DEBUG)console.log("max texture size is "+this.maxTextureSize);
		let maxVertexTextureImageUnits=view.gl.getParameter(view.gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
		if (maxVertexTextureImageUnits==0){alert("Your browser does not support this application:  vertex texture image units is 0"); return;}else{if(G.DEBUG)console.log("max vertex texture image size is "+maxVertexTextureImageUnits);}
	 
		
		var composer = new THREE.EffectComposer(view.renderer);view.composer=composer;//, renderTarget
		var renderPass = new THREE.RenderPass(scene,view.camera);
		view.renderPass=renderPass;
		//renderPass.renderToScreen = true;
		composer.addPass(renderPass);
		
		dpr = 1;
		if (window.devicePixelRatio !== undefined) {dpr = window.devicePixelRatio;}
		
		var effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);G.effectFXAA=effectFXAA;
		effectFXAA.uniforms['resolution'].value.set(1 / (G.canvasContainer.clientWidth * dpr), 1 / (G.canvasContainer.clientHeight * dpr));
		effectFXAA.renderToScreen = true;
		composer.addPass(effectFXAA);
		//this movement depends on the camera so needs to be per-view
		
		canvas.tabIndex=1;//to make it focusable and accept key events
		let moveLength=10;
		G.controls.addKeyListener(canvas,37,()=>{view.nodeMovement.copy(view.cameraControls.leftVector).multiplyScalar(moveLength);},()=>{view.nodeMovement.set(0,0,0)});
		G.controls.addKeyListener(canvas,38,()=>{view.nodeMovement.copy(view.cameraControls.forwardVector).multiplyScalar(moveLength);},()=>{view.nodeMovement.set(0,0,0)});
		G.controls.addKeyListener(canvas,39,()=>{view.nodeMovement.copy(view.cameraControls.leftVector).multiplyScalar(-moveLength);},()=>{view.nodeMovement.set(0,0,0)});
		G.controls.addKeyListener(canvas,40,()=>{view.nodeMovement.copy(view.cameraControls.forwardVector).multiplyScalar(-moveLength);},()=>{view.nodeMovement.set(0,0,0)});
	}
	zoomOutDistance(){
		let maxHeight=this.dataset?(500.0*Math.sqrt(Math.log(this.dataset.maxLayer+1.))*G.controls.get("heightFactor")+5000):0;
		let maxRadius=this.dataset?(G.view.sharedUniforms.radialLimit.value()*G.controls.get("radialLimitFactor")*3+5000):0;
		return Math.max(10000,maxHeight,maxRadius);
	}
	applyModel(model){
		
	}
	beforeLoadDataset(newDataset){
		//save positions for old graphs - based on vertices
		let dataset=this.dataset;//it has not been changed yet
		if(dataset&&dataset.nodes){
			let layouts=this.getVerticesPos(true);
			if(layouts){
				for (let i=0;i<this.subviews.length;i++){
					addHiddenProperty(this.subviews[i].graph.vertices,"layout",layouts[i]);
				}
			}
		}
		//save minimap before the child graph is shown
		if(dataset&&(!dataset.imageData)){
			dataset.imageData=G.renderer.domElement.toDataURL("image/png");
		}
		if(newDataset.parent&&newDataset.parent.imageData)getE("minimap").src=newDataset.parent.imageData;//works even if the parent is not the current dataset
		else{getE("minimap").src="images/blank.png"}
	}
	loadDataset(dataset){
		if(dataset.dataPath&&(dataset.vertices.layout===undefined)){
			d3.json("datasets/"+dataset.dataPath+"/layout",(layout)=>{
				if(!Array.isArray(layout)){console.log("error: precomputed layout invalid");console.log(layout);layout=null;}
				addHiddenProperty(dataset.vertices,"layout",layout);//even if it's null
				if(layout){G.addLog("using precomputed layout");}
				this.loadDataset(dataset);
			});
			return; //wait until the layout is loaded
		}
		this.beforeLoadDataset(dataset);
		this.step=0;this.timer=0;//reset the time since simulation started
		this.dataset=dataset;
		
		let heightPropertyName=dataset.heightProperty,heightPropertyType;
		if(heightPropertyName){
			if(heightPropertyName in G.analytics.templates.edges.properties)heightPropertyType="edges";
			else heightPropertyType="vertices";
		}
		dataset.heightPropertyType=heightPropertyType;dataset.heightPropertyName=heightPropertyName;
		Object.assign(this,this.getObjectsFromHierarchy(dataset));//model etc are now defined globally on the view module
		G.view.setModifiersTarget(this.model);//the global modifiers are different from local ones;
		G.view.applyTemplates(this.model,true);//subviews are applied on each graph and do not contain attrs and uniforms, but the global template is applied on the global model (and we use that for attrs and uniforms)
		G.subview.setModifiersTarget(this.subviews[0].graph);//target the top graph by default
		
		var simulationUniforms={
			timer: { type: "f", value: 0},
		};
		for(let uniformName in G.view.sharedUniforms){
			let uniform=this.sharedUniforms[uniformName];//every one must be created, even dynamic ones
			uniform.needsUpdate=true;
			if(uniform.noSimulate)continue;//must skip the ones that cannot be used in the simulation, ie its own output
			this.initUniform(uniform,this.model);
			this.updateUniform(uniform,simulationUniforms,uniformName,this.model);
		}
		this.refreshUniforms(true);
		this.refreshAttrs(true);//they do not use the textureSize constant
		
		var textureSize=Math.max(1,Math.ceil(Math.sqrt(this.model.nodes.length)));this.simulationTextureSize=textureSize;//stupid bug: using dataset.nodes.length like before we had a model, would break the simulation but only when subgraphs increase the texture size! 
		//but the simulation shader uses the constant so we have to set it before creating the simulation.
		let vertexShader=G.view.getVertexShader("simulation"),fragmentShader= this.getFragmentShader("simulation");
		var sim = new THREE.Simulation(G.renderer,G.view.templates.nodes.object3d.geometry.attributes.initialPosition.array,simulationUniforms,vertexShader,fragmentShader);
		this.simulation=sim;
		this.simulationShader=sim.simulationShader;
	
		this.clock.getDelta();
		this.animateOnce(); //it only animates one frame, and doesn't create an (extra) requestAnimationFrame loop for itself. without this, between load dataset and the next animate() frame, a mouse event may happen and get invalid positions. 
	}
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
}








