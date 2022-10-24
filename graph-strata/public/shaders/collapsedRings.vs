//slightly changed from the original
uniform sampler2D layoutData;
uniform float layoutDataSize;
uniform sampler2D nodeData;
uniform sampler2D layerColors;
uniform float layerColorsSize;
uniform float layerColorRatio;
uniform vec3 camera;
uniform float radialLimit;
uniform float radialLimitFactor;

attribute float maxRadius;
attribute float minRadius;
attribute float radiusMultiplier;
attribute float isGlobal;
attribute float center;
attribute vec3 color1;
attribute vec3 color2;
attribute vec3 coord; 
attribute float thickness; 

varying vec3 pixelCoord;
varying float opacity;
varying vec2 vUv;
varying vec3 vColor1;
varying vec3 vColor2;
varying float vRealRadius;//corresponds to outer rim
varying float vThickness; //0-1, determines inner rim by ratio of radius

vec3 worldUp=vec3(0.,0.,1.);

void main() {
	vec4 vertexPos=vec4(0.,0.,0.,0.);
	float realRadius=maxRadius;
	if(isGlobal<0.5){//local
		vertexPos=getArrayValue( layoutData, layoutDataSize, center);vertexPos.z=0.;
		realRadius*=radiusMultiplier*25.;
	}
	else{
		float realRadialLimit=radialLimit*radialLimitFactor;
		realRadius=realRadius*realRadialLimit*3.;//note: cannot add a constant here because it interferes with proportional thickness...
		//radius*500.+realRadialLimit*5.+500.;
	}
	vRealRadius=realRadius;
	vec3 nodePos = vertexPos.xyz;
	vec3 eye=camera-nodePos;
	vec3 horizontal=normalize(cross(worldUp,eye));//*10.;
	vec3 vertical=normalize(cross(worldUp,horizontal));//*10.;
	vec3 up=normalize(cross(horizontal,eye));
	vec3 worldPos=mix(nodePos-horizontal*realRadius,nodePos+horizontal*realRadius,max(coord.x,0.))+coord.y*vertical*realRadius;
	opacity=clamp(1./(realRadius*realRadius/1000.),0.25,0.75);
	vec4 mvPosition = modelViewMatrix * vec4( worldPos, 1.0 );
	
	gl_Position = projectionMatrix * mvPosition;
	pixelCoord = coord;
	vColor1=color1;
	vColor2=color2;
	vThickness=(maxRadius-minRadius)/maxRadius;
	//vThickness=thickness;
}