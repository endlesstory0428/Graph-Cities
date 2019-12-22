
uniform vec3 camera;
uniform float radialLimit;
uniform float radialLimitFactor;
uniform float radiusFactor;

uniform sampler2D colorList;
uniform float colorListSize;
uniform float colorListCount;

uniform float heightFactor;

uniform sampler2D layerHeights;
uniform float layerHeightsSize;

attribute float maxRadius;
attribute float thickness; 
attribute float centerAngle;
attribute float angleWidth;
attribute float height;
attribute float colorValue;
//attribute vec3 color1;
attribute vec3 coord; 


varying vec3 pixelCoord;
varying float opacity;
varying vec2 vUv;
varying vec3 vColor1;
varying float vRealRadius;//corresponds to outer rim
varying float vThickness; //0-1, determines inner rim by ratio of radius
varying float vCenterAngle;
varying float vAngleWidth;

varying float vIsRectangle;//optimize short arcs into a rectangle

vec3 worldUp=vec3(0.,0.,1.);

float pi=3.141592653589793;

void main() {
	float realHeight=getArrayValue(layerHeights,layerHeightsSize,height).x*heightFactor;
	
	vec4 vertexPos=vec4(0.,0.,realHeight,0.);
	float realRadius=maxRadius;
	
	float realRadialLimit=radialLimit*radialLimitFactor*radiusFactor;
	//realRadius=realRadius*realRadialLimit*3.;//note: cannot add a constant here because it interferes with proportional thickness...
		//radius*500.+realRadialLimit*5.+500.;
	realRadius=radiusFactor*realRadius*2.;
	vRealRadius=realRadius;
	vec3 nodePos = vertexPos.xyz;
	vec3 eye=camera-nodePos;
	vec3 horizontal=normalize(cross(worldUp,eye));//*10.;
	vec3 vertical=normalize(cross(worldUp,horizontal));//*10.;
	vec3 up=normalize(cross(horizontal,eye));
	//vec3 worldPos=mix(nodePos-horizontal*realRadius,nodePos+horizontal*realRadius,max(coord.x,0.))+coord.y*vertical*realRadius;
	//I think making it rotatable here is better
	vec3 horizontal1=vec3(1.,0.,0.);
	vec3 vertical1=vec3(0.,1.,0.);
	vec3 worldPos=mix(nodePos-horizontal1*realRadius,nodePos+horizontal1*realRadius,max(coord.x,0.))+coord.y*vertical1*realRadius;
	
	if(angleWidth<pi/100.){
		//draw as a rectangle instead! too many short arcs will slow down rendering if processed as a full disk
		float angle1=centerAngle-angleWidth;float angle2=centerAngle+angleWidth;
		//float innerRadius=maxRadius-thickness;
		//use the inner endpoints to determine the length
		vec2 p1=vec2(sin(angle1),cos(angle1))*maxRadius;
		vec2 p2=vec2(sin(angle2),cos(angle2))*maxRadius;
		vec3 normal=vec3(sin(centerAngle),cos(centerAngle),0.); //note: because of how pixelCoord is defined, we need to flip the axes to agree with atan(pixelcoord.x,pixelccord.y)
		vec3 pCenter=normal*(maxRadius*2.-thickness);//-thickness/2.
		vec3 horizontal2=vec3((p2-p1),0.);
		vec3 vertical2=normal*(thickness);//from origin to the center
		pCenter.z=realHeight;
		worldPos=mix(pCenter-horizontal2,pCenter+horizontal2,max(coord.x,0.))+coord.y*vertical2;
		vIsRectangle=1.;
	}
	
	opacity=clamp(1./(realRadius*realRadius/1000.),0.85,1.);
	vec4 mvPosition = modelViewMatrix * vec4( worldPos, 1.0 );
	
	gl_Position = projectionMatrix * mvPosition;
	pixelCoord = coord;
	vec3 standardColor=getScaleValue(colorList,colorListSize,colorListCount,colorValue).rgb;
	vColor1=standardColor;
	vThickness=thickness/maxRadius;
	vCenterAngle=centerAngle;
	vAngleWidth=angleWidth;
}