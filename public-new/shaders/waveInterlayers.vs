uniform sampler2D layoutData;
uniform float layoutDataSize;
uniform sampler2D nodeData;
uniform vec3 camera;
uniform sampler2D layerColors;
uniform float layerColorSize;
uniform float linkLayerColorRatio;
uniform float activeLayer;
uniform float activeLayerEnabled;
uniform float ccSizeThreshold;

attribute vec2 lineLengths;
attribute vec3 customColor;
attribute vec3 coord; 
attribute float density; 
varying float opacity;
varying vec3 vColor;
varying vec3 pixelCoord;
const float thickness=5.;

vec3 silver=vec3(0.8,0.8,0.8);vec3 worldUp=vec3(0.,0.,1.);
void main() 
{
	//get the layout position of the one node that this layer beings to 
	vec3 nodePos = texture2D( layoutData, getUV(position.x,layoutDataSize) ).xyz;
	//y is source layer
	vec3 topPos=nodePos;topPos.z-=(position.y)*5.;
	vec3 bottomPos=topPos;bottomPos.z-=5.;
	vec3 eye=camera-nodePos;
	vec3 horizontal=normalize(cross(worldUp,eye));//*10.;
	vec3 up=normalize(cross(horizontal,eye));//the original linear scaling looks better?
	//*sqrt(length((eye+eye2)/2.+1.));//make the links become narrow slower as the distance increase, so at a distance you can see the edges shape only
	float topThickness=lineLengths.x;
	float bottomThickness=lineLengths.y;
	vec3 worldPos=mix(topPos,bottomPos,max(coord.x,0.))+coord.y*horizontal*mix(topThickness/2.,bottomThickness/2.,max(coord.x,0.));
	
	//what is the vector that's perpendicular to the eye ray and the link itself?
	vec4 mvPosition = modelViewMatrix * vec4( worldPos, 1.0 );//coord is the local coordinates on a link, source side has 0 and target side has 1
	// option (1): draw particles at constant size on screen
	// gl_PointSize = size;
	// option (2): scale particles as objects in 3D space
	//gl_PointSize = 1.0 * ( 300.0 / length( mvPosition.xyz ) );
	gl_Position = projectionMatrix * mvPosition;
	pixelCoord = coord;
	vColor=silver;//*density;
	opacity=density;
}