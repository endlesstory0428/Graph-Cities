
uniform vec3 camera;
uniform float radialLimit;
uniform float radialLimitFactor;
uniform float radiusFactor;

uniform sampler2D colorList;
uniform float colorListSize;
uniform float colorListCount;

uniform float heightFactor;
uniform float brightnessFactor;
uniform float thicknessFactor;

uniform sampler2D layerColors;
uniform sampler2D layerHeights;
uniform float layerHeightsSize;

attribute float sourceRadius;
attribute float targetRadius;
attribute float sourceAngle; 
attribute float targetAngle;
attribute float sourceWidth;
attribute float targetWidth;
attribute float sourceHeight;
attribute float targetHeight;
attribute vec4 colors;
attribute vec3 coord; 


varying vec3 pixelCoord;
varying float opacity;
varying vec2 vUv;
varying vec3 vColor;

varying float bright;
vec3 worldUp=vec3(0.,0.,1.);

float pi=3.141592653589793;

void main() {
	float realHeight1=getArrayValue(layerHeights,layerHeightsSize,sourceHeight).x*heightFactor;
	float realHeight2=getArrayValue(layerHeights,layerHeightsSize,targetHeight).x*heightFactor;
	
	float realRadius1=radiusFactor*sourceRadius*2.;
	float realRadius2=radiusFactor*targetRadius*2.;
	
	
	//top ribbon 
	vec2 center1=vec2(sin(sourceAngle),cos(sourceAngle))*realRadius1;
	vec2 center2=vec2(sin(targetAngle),cos(targetAngle))*realRadius2;
	
	float realWidth1=sourceWidth*realRadius1;if(sourceWidth<0.)realWidth1=thicknessFactor*20.;
	float realWidth2=targetWidth*realRadius2;if(targetWidth<0.)realWidth2=thicknessFactor*20.;//simulate link width
	vec2 horizontal1=vec2(cos(sourceAngle),-sin(sourceAngle))*sourceWidth;
	vec2 horizontal2=vec2(cos(targetAngle),-sin(targetAngle))*targetWidth;
	if(dot(horizontal1,horizontal2)<0.)horizontal2*=-1.;
	
	
	vec3 yPos1=mix(vec3(center1-horizontal1,realHeight1),vec3(center1+horizontal1,realHeight1),max(coord.y,0.));
	vec3 yPos2=mix(vec3(center2-horizontal2,realHeight2),vec3(center2+horizontal2,realHeight2),max(coord.y,0.));
	vec3 worldPos=mix(yPos1,yPos2,max(coord.x,0.));
	
	float beginRatio=colors.z,endRatio=colors.w;
	float ratio=mix(beginRatio,endRatio,max(coord.x,0.));
	vec3 color1=getScaleValue(colorList,colorListSize,colorListCount,colors.x).rgb;
	vec3 color2=getScaleValue(colorList,colorListSize,colorListCount,colors.y).rgb;
	vColor=mix(color1,color2,ratio);
	opacity=clamp(20./(realWidth1*realRadius1+realWidth2*realRadius2),0.05,0.4);
	
	vec4 mvPosition = modelViewMatrix * vec4( worldPos, 1.0 );
	bright=brightnessFactor;
	gl_Position = projectionMatrix * mvPosition;
	pixelCoord = coord;
	
}