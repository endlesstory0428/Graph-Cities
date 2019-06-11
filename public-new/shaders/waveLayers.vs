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

attribute float lineLength;
attribute vec2 shape;
attribute vec3 customColor;
attribute vec3 coord; 
attribute vec3 rangeHighlight; 
varying vec3 vColor;
varying vec3 pixelCoord;
varying float opacity;
const float thickness=5.;

vec3 silver=vec3(0.8,0.8,0.8);vec3 pink=vec3(1.,0.4,0.4);vec3 worldUp=vec3(0.,0.,1.);
void main() 
{
	//get the layout position of the one node that this layer beings to 
	vec3 nodePos = texture2D( layoutData, getUV(position.x,layoutDataSize) ).xyz;
	nodePos.z-=position.y*5.;//y is layerInVertex
	vec3 eye=camera-nodePos;
	vec3 horizontal=normalize(cross(worldUp,eye))/2.;//*10.;
	vec3 vertical=normalize(cross(worldUp,horizontal))/2.;//*10.;
	vec3 up=normalize(cross(horizontal,eye));//the original linear scaling looks better?
	//*sqrt(length((eye+eye2)/2.+1.));//make the links become narrow slower as the distance increase, so at a distance you can see the edges shape only
	//vec3 worldPos=mix(nodePos-horizontal*lineLength/2.,nodePos+horizontal*lineLength/2.,max(coord.x,0.))+coord.y*up*thickness;
	vec3 worldPos=mix(nodePos-horizontal*shape.x,nodePos+horizontal*shape.x,max(coord.x,0.))+coord.y*vertical*shape.y;
	opacity=clamp(1./(shape.x*shape.y/1000.),0.05,0.15);
	//what is the vector that's perpendicular to the eye ray and the link itself?
	vec4 mvPosition = modelViewMatrix * vec4( worldPos, 1.0 );//coord is the local coordinates on a link, source side has 0 and target side has 1
	// option (1): draw particles at constant size on screen
	// gl_PointSize = size;
	// option (2): scale particles as objects in 3D space
	//gl_PointSize = 1.0 * ( 300.0 / length( mvPosition.xyz ) );
	gl_Position = projectionMatrix * mvPosition;
	pixelCoord = coord;
	vColor=silver;
	if(rangeHighlight.x>0.){
		vColor=pink;
	}
	
}