uniform sampler2D layoutData;
uniform float layoutDataSize;
uniform sampler2D nodeData;
uniform vec3 camera;
uniform sampler2D layerColors;
uniform float layerColorsSize;
uniform sampler2D layerHeights;
uniform float layerHeightsSize;
uniform float heightFactor;

attribute float lineLength;
attribute vec3 customColor;
attribute vec3 extraData;
attribute vec4 foci;
attribute vec3 coord; 
varying vec3 vColor;
varying vec3 pixelCoord;
varying float opacity;
varying float fociX;

const float thickness=5.;

vec3 silver=vec3(0.8,0.8,0.8);
vec3 red=vec3(1.,0.,0.);
vec3 green=vec3(0.,1.,0.);
vec3 blue=vec3(0.,0.,1.);
vec3 worldUp=vec3(0.,0.,1.);
void main() 
{
	float layer=position.x;//float vCount=position.y;float isEndOfPhase=position.z;
	float length=position.y;
	float width=position.z;
	float height=getArrayValue(layerHeights,layerHeightsSize,layer).x*heightFactor;
	vec3 layerColor=getArrayValue( layerColors, layerColorsSize,layer).rgb;
	//float radius=sqrt(vCount)*100.;
	float isStart=extraData.x;float isEnd=extraData.y;
	vec2 f1=foci.xy;vec2 f2=foci.zw;float s=extraData.z;//only set if teh shape has been computed
	
	vec3 centerPos=vec3(0.,0.,height);
	vec3 horizontal=vec3(1.,0.,0.)*length;
	vec3 vertical=vec3(0.,1.,0.)*width;
	
	
	if(s>0.){//enable when the adaptive shape value are set
		float fd=distance(f1,f2);
		fociX=fd/s;
		
		centerPos.x=(f1.x+f2.x)/2.;centerPos.y=(f1.y+f2.y)/2.;
		length=s;
		horizontal=vec3(normalize(f1-f2)*s,0.);
		//horizontal=vec3(1.,0.,0.)*length;
		width=sqrt((s/2.)*(s/2.)-fd*fd/4.)*2.;
		//vertical=vec3(0.,1.,0.)*width;
		vertical=vec3(normalize(vec2(horizontal.y,-horizontal.x))*width,0.);
		
	}
	vec3 eye=camera-centerPos;
	vec3 eyeHorizontal=normalize(cross(worldUp,eye))*10.;
	vec3 up=normalize(cross(eyeHorizontal,eye));
	
	vertical+=up*1.;//make the disk face the eye to some degree?
	//*sqrt(length((eye+eye2)/2.+1.));//make the links become narrow slower as the distance increase, so at a distance you can see the edges shape only
	vec3 worldPos=mix(centerPos-horizontal/2.,centerPos+horizontal/2.,max(coord.x,0.))+coord.y*vertical/2.;
	
	opacity=clamp(1./(length*width/1000.),0.05,0.15);
	
	vec4 mvPosition = modelViewMatrix * vec4( worldPos, 1.0 );//coord is the local coordinates on a link, source side has 0 and target side has 1
	
	gl_Position = projectionMatrix * mvPosition;
	pixelCoord = coord;
	vColor=layerColor;
	if(isStart>0.){vColor+=green*0.1;}
	if(isEnd>0.){vColor+=red*0.1;}
	
}