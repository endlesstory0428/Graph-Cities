//slightly changed from the original
uniform sampler2D layoutData;
uniform float layoutDataSize;
uniform sampler2D nodeData;
uniform sampler2D layerColors;
uniform sampler2D colorList;
uniform float layerColorsSize;
uniform float colorListSize;
uniform float colorListCount;
uniform float layerColorRatio;

uniform float pointSize;
uniform float nodeSizeFactor;

uniform float timer;
uniform float activeLayer;
uniform float activeLayerEnabled;
uniform float ccSizeThreshold;

uniform float radiusFactor;

attribute float size;
attribute float colorValue;
attribute vec3 customColor;
attribute float usingCustomColor;
attribute float isExpanded;
attribute float isSelected;

varying vec2 vUv;
varying vec4 vPosition;
varying float id;
varying vec3 vColor;
varying float vIsExpanded;
varying float vIsSelected;

uniform vec2 mousePos;
uniform vec2 mouseScreenPos;
uniform vec2 mouseShaderPos;
uniform mat4 cameraProjectionMatrix;
uniform mat4 cameraMatrixWorld;
uniform mat4 cameraMatrixWorldInverse;
uniform mat4 nodeModelViewMatrix;

uniform float screenWidth;
uniform float screenHeight;


void main() {
	vec4 vertexPos=getArrayValue( layoutData, layoutDataSize, position.x);
	vec4 node=getArrayValue( nodeData, layoutDataSize, position.x);
	//vec4 node = texture2D(nodeData, vUv);//layer, layerset ID,original ID, ccSize
	float layer=node.x,layerSetID=node.y,original=node.z,ccSize=node.w;
	vec3 pos = vertexPos.xyz;
	pos.xy*=radiusFactor;
	
	id=original;
	
	//vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
	vec4 mvPosition = modelViewMatrix * vec4( pos, 1.0 );
	//vec4 mvPosition = modelViewMatrix * vec4( vUv*100.0,1.0,1.0 );
	
	//scale particles as objects in 3D space
	float activeLayerFactor=1.;
	if(activeLayerEnabled>0.){activeLayerFactor=isEqual(layer,activeLayer)*1.;}
	//1.98+0.02;
	float ccSizeFactor=step(ccSizeThreshold,ccSize);
	
	float distance=length( mvPosition.xyz );
	float sizeFactor=(1.+smoothstep(0.,10000.,distance)*3.)/(distance+0.01);
	float metanodeExpandedFactor=1.;//if(isExpanded>0.){metanodeExpandedFactor=4.;}
	float additiveMetanodeExpandedFactor=0.;if(isExpanded>0.){additiveMetanodeExpandedFactor=50.;}
	//gl_PointSize = ( 3.0 * sizeFactor  )*size*pointSize*activeLayerFactor*metanodeExpandedFactor;//*ccSizeFactor;
	float minSizeClamp=0.05,maxSizeClamp=100.;
	if(isExpanded>0.){minSizeClamp=0.001;maxSizeClamp=10000.;}
	gl_PointSize = clamp(10000.0 *sizeFactor*size,minSizeClamp,maxSizeClamp)*activeLayerFactor*metanodeExpandedFactor*nodeSizeFactor;;//*size//*ccSizeFactor;//*ccSizeFactor
	//gl_PointSize = pointSize;
	//gl_Position =vec4(position,1.0);
	
	//gl_Position=cameraProjectionMatrix*cameraMatrixWorldInverse* vec4( pos, 1.0 );
	gl_Position = projectionMatrix * mvPosition;
	
	vec2 spos=gl_Position.xy/gl_Position.w;
	spos.x*=screenWidth;
	spos.y*=screenHeight;
	spos/=2.;
	
	if(length(mouseShaderPos-spos)<20.)gl_PointSize*=2.;
	//if(dot(mousePos,gl_Position.xy*gl_Position.w)>0.)gl_PointSize*=2.;
	//if(((gl_Position.x+gl_Position.y)>0.))gl_PointSize*=2.;
	
	//gl_Position = projectionMatrix * mvPosition;
	
	//gl_Position = projectionMatrix * modelViewMatrix * vec4( color, 1.0 );
	//gl_Position = projectionMatrix * modelViewMatrix * vec4( position * 20.0, 1.0 );
	vec3 standardColor=getScaleValue(colorList,colorListSize,colorListCount,colorValue).rgb;
	
	vColor=mix(standardColor,customColor,min(usingCustomColor,layerColorRatio));//only use custom color if it's marked as available
	//vColor=getArrayValue( layerColors,layerColorsSize,0.).rgb;
	
	vIsExpanded=isExpanded;
	vIsSelected=isSelected;
}