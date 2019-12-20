uniform sampler2D layoutData;
uniform float layoutDataSize;
uniform sampler2D nodeData;
uniform vec3 camera;
uniform sampler2D layerColors;
uniform float layerColorsSize;
uniform sampler2D colorList;
uniform float colorListSize;
uniform float colorListCount;
uniform sampler2D nodeColorData;
uniform float nodeColorDataSize;


uniform float linkLayerColorRatio;
uniform float activeLayer;
uniform float activeLayerEnabled;
uniform float ccSizeThreshold;

uniform float radiusFactor;

uniform float brightnessFactor;
uniform float thicknessFactor;

attribute vec3 customColor;
attribute float colorValue;
attribute float usingCustomColor;
attribute vec3 coord;
attribute float brightness;
attribute float thickness;
attribute float direction;
attribute float subgraphLevel;
varying vec3 vColor;
varying vec3 pixelCoord;
varying float bright;
varying float vDirection;
const float brightnessThreshold=0.001;

vec3 white=vec3(1.,1.,1.);vec3 red=vec3(1.,0.,0.);
void main() 
{
	if(brightness<brightnessThreshold){gl_Position.x=0.;gl_Position.y=0.;gl_Position.z=0.;return;}
	//float layer=texture2D( layoutData, getUV(position.x) ).z;
	//float h=layer*30.;//now layoutDataSize is determined in teh simulation not here

	vec4 sourceData=getArrayValue( nodeData, layoutDataSize, position.x);
	vec4 targetData=getArrayValue( nodeData, layoutDataSize, position.y);
	vec3 sourcePos =getArrayValue( layoutData, layoutDataSize, position.x).xyz;sourcePos.xy*=radiusFactor;
	vec3 targetPos =getArrayValue( layoutData, layoutDataSize, position.y).xyz;targetPos.xy*=radiusFactor;
	//debug
	//if(sourcePos.z!=targetPos.z){sourcePos.z=0.;targetPos.z=0.;}//debug
	float layer=sourceData.x,layerSetID=sourceData.y,original=sourceData.z,ccSize=sourceData.w;
	float layer2=targetData.x,layerSetID2=targetData.y,original2=targetData.z,ccSize2=targetData.w;
	//other's layer?
	float colorValue1=getArrayValue(nodeColorData, nodeColorDataSize, position.x).x;
	float colorValue2=getArrayValue(nodeColorData, nodeColorDataSize, position.y).x;
	//vColor=mix(customColor,mix(getArrayValue( layerColors, layerColorsSize,layer).rgb,getArrayValue( layerColors, layerColorsSize,layer2).rgb,max(coord.x,0.)),linkLayerColorRatio);
	vec3 standardColor1=getScaleValue( colorList,colorListSize,colorListCount,colorValue1).rgb;//getArrayValue( layerColors, layerColorsSize,layer).rgb
	vec3 standardColor2=getScaleValue( colorList,colorListSize,colorListCount,colorValue2).rgb;//getArrayValue( layerColors, layerColorsSize,layer2).rgb
	vec3 standardColor=mix(standardColor1,standardColor2,max(coord.x,0.));
	if(colorValue>-0.5){//use a single standard color
		standardColor=getScaleValue(colorList,colorListSize,colorListCount,colorValue).rgb;
	}
	vColor=mix(customColor,standardColor,clamp(linkLayerColorRatio-usingCustomColor,0.,1.));
	//if(usingCustomColor+sign(colorValue+0.5)<0.5)vColor=mix(normalize(vColor),vColor,0.8); 
	//don't dampen layer colors when a custom or specific color is used.
	
	vec3 eye=camera-sourcePos;
	vec3 eye2=camera-targetPos;
	vec3 link=sourcePos-targetPos;
	vec3 up=normalize(cross(targetPos-camera,eye))*max(length(eye+eye2)/400.,5.);//the original linear scaling looks better?
	//*sqrt(length((eye+eye2)/2.+1.));//make the links become narrow slower as the distance increase, so at a distance you can see the edges shape only
	float subgraphThicknessFactor=pow(0.2, subgraphLevel);
	vec3 worldPos=mix(sourcePos,targetPos,max(coord.x,0.))+coord.y*up*thickness*subgraphThicknessFactor*thicknessFactor;
	
	//what is the vector that's perpendicular to the eye ray and the link itself?
	vec4 mvPosition = modelViewMatrix * vec4( worldPos, 1.0 );//coord is the local coordinates on a link, source side has 0 and target side has 1
	// option (1): draw particles at constant size on screen
	// gl_PointSize = size;
	// option (2): scale particles as objects in 3D space
	//gl_PointSize = 1.0 * ( 300.0 / length( mvPosition.xyz ) );
	gl_Position = projectionMatrix * mvPosition;
	pixelCoord = coord;
	/*
	float activeLayerFactor=1.;
	float additiveActiveLayerFactor=0.;
	if(activeLayerEnabled>0.){
		activeLayerFactor=isEqual(layer,activeLayer)*isEqual(layer2,activeLayer)*1.3;//*1.3+0.02;
		additiveActiveLayerFactor=isEqual(layer,activeLayer)*pow(brightness,0.5)*0.3;
	}//make very dim edges brighter but not overwhelming for large amounts of them
	float ccSizeFactor=step(ccSizeThreshold,ccSize);//only need to check one for edges as the nodes are in the same CC
	*/
	bright=brightness*brightnessFactor;//(brightness*activeLayerFactor+additiveActiveLayerFactor)*brightnessFactor;//*ccSizeFactor;
	//bright = min(brightness*10.,1.);//1.;
	//bright=0.;
	vDirection=direction;
	
}