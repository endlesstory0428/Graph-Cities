/*
@author zz85, modified by skyblue
*/

THREE.Simulation = function( renderer,initialDataBuffer,initialUniforms,vertexShader,fragmentShader) {
	//initialDataBuffer always has runlength 4?
	var textureWidth=Math.max(1,Math.ceil(Math.sqrt(initialDataBuffer.length/4)));this.textureSize=textureWidth;
	var fullDataBuffer=new Float32Array(textureWidth*textureWidth*4);//must have a square sized buffer!!
	for(let i=0;i<initialDataBuffer.length;i++){fullDataBuffer[i]=initialDataBuffer[i];}
	var width = textureWidth, height = textureWidth;
	this.uniforms=initialUniforms;
	//this.shader=simulationShader;
	this.renderer=renderer;

	var data = fullDataBuffer;this.dataBuffer=data;//for reusing the space later

	var texture = new THREE.DataTexture( data, width, height, THREE.RGBAFormat, THREE.FloatType );
	texture.minFilter = THREE.NearestFilter;
	texture.magFilter = THREE.NearestFilter;
	texture.needsUpdate = true;
	//this.nodePositionTexture=texture;
	
	//---------------------------
		
	// Init RTT stuff
	var gl = renderer.getContext();
		
	if( !gl.getExtension( "OES_texture_float" )) {
		alert( "No OES_texture_float support for float textures!" );
		//return;
	}

	if( gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) == 0) {
		alert( "No support for vertex shader textures!" );
		//return;
	}


	var cameraRTT = new THREE.OrthographicCamera(-textureWidth/2, textureWidth/2, textureWidth/2, -textureWidth/2, -1000000, 1000000);
	cameraRTT.frustumCulled=false;
	cameraRTT.position.z = 100;


	// Shader Stuff

	
	
	var rtTexturePos = new THREE.WebGLRenderTarget(width, height, {
		wrapS:THREE.ClampToEdgeWrapping, //THREE.RepeatWrapping,
		wrapT:THREE.ClampToEdgeWrapping,
		minFilter: THREE.NearestFilter,
		magFilter: THREE.NearestFilter,
		format: THREE.RGBAFormat,
		type:THREE.FloatType,
		stencilBuffer: false
	});
	var rtTexturePos2 = rtTexturePos.clone();
	var rtTexturePos3 = rtTexturePos.clone();
		
	initialUniforms.tPositions={ type: "t", value: texture };
	initialUniforms.tPositionsPrev={ type: "t", value: texture };
	initialUniforms.textureSize={value:textureWidth};
	
	//the shader must be created after all uniforms are attached, including tPositions*
	var simulationShader = new THREE.ShaderMaterial({
		uniforms:initialUniforms,
		vertexShader: vertexShader,
		fragmentShader:  fragmentShader,
		side: THREE.DoubleSide
	});
	
	var sceneRTTPos = new THREE.Scene();

	sceneRTTPos.add(cameraRTT);

	var plane = new THREE.PlaneGeometry(textureWidth, textureWidth);

	quad = new THREE.Mesh(plane, simulationShader);
	quad.position.z = -5000;
	sceneRTTPos.add(quad);

	this.textureWidth = textureWidth;
	this.sceneRTTPos = sceneRTTPos;
	this.cameraRTT = cameraRTT;
	//this.cpu_gpu_material = cpu_gpu_material;
	this.simulationShader = simulationShader;
	this.initTexture = function initTexture(t) {
		this.renderer.render(this.sceneRTTPos, this.cameraRTT, t, false);
	}
	//this.cpu_gpu_material.uniforms.tPositions.value = texture;
	
	
	//fbo init - after creating cameras etc!
	this.initTexture(rtTexturePos);
	this.initTexture(rtTexturePos2);
	this.initTexture(rtTexturePos3);//todo: add automatic management and init of three textures, and support of multiple shaders
	//just draw initial data into them, does not assign any textures

	this.in = rtTexturePos;
	this.in_prev = rtTexturePos3;
	this.out = rtTexturePos2;

};


THREE.Simulation.createTextureFromData = function(width, height, data, options) {
	options || (options = {});

	var texture = new THREE.DataTexture(
		new Float32Array(data),
		width,
		height,
		THREE.RGBAFormat,
		THREE.FloatType,
		null,
		THREE.RepeatWrapping,
		THREE.RepeatWrapping,
		THREE.NearestFilter,
		THREE.NearestFilter
	);

	texture.needsUpdate = true;

	return texture;

};

THREE.Simulation.prototype.renderToTexture = function(texture, renderToTexture) {
	this.cpu_gpu_material.uniforms.tPositions.value = texture;
	this.renderer.render(this.sceneRTTPos, this.cameraRTT, renderToTexture, false);

};

THREE.Simulation.prototype.initTexture = function(t) {
	this.renderer.render(this.sceneRTTPos, this.cameraRTT, t, false);
	//this.cpu_gpu_material.uniforms.tPositions.value = texture;
	

};


THREE.Simulation.prototype.pushDataToTexture = function(data, renderToTexture) {

	var texture = THREE.FBOUtils.createTextureFromData( this.textureWidth, this.textureWidth, data );
	
	this.renderToTexture(texture, renderToTexture);

};

THREE.Simulation.prototype.simulate = function(target) {
	this.renderer.render(
		this.sceneRTTPos,
		this.cameraRTT,
		target, false);
}

THREE.Simulation.prototype.nextStep = function(target) {
	
	var tmp = this.in_prev;this.in_prev = this.in;this.in = this.out;this.out = tmp;
	/*if((G.DEBUG)&&(this.step<this.maxSteps)){
		console.log("step "+this.step);this.inspect(this.simulation.in);this.inspect(this.simulation.in_prev);
	}*/
	this.uniforms.tPositions.value = this.in.texture;//the simulation isn't using the shared uniforms for these because the simulation is done before the uniforms update(which the scene uses) and we don't want to update uniforms in two places; how about update for simulation, then simulate, then update for others? or update before simulation(as long as it's after switching in/out it's OK)
	this.uniforms.tPositionsPrev.value = this.in_prev.texture;
		
	this.simulate(this.out);
	//if(G.DEBUG){if(this.step<this.maxSteps){this.inspect(this.simulation.out);this.step++;}}
	
}




