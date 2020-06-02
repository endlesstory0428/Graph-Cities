uniform sampler2D layoutData;
uniform float layoutDataSize;
uniform sampler2D nodeData;

uniform sampler2D colorList;
uniform float colorListSize;
uniform float colorListCount;

uniform sampler2D nodeColorData;
uniform float nodeColorDataSize;

uniform vec3 camera;
uniform sampler2D layerColors;
uniform float layerColorsSize;
uniform float lineLayerColorRatio;

uniform float brightnessFactor;
uniform float thicknessFactor;

uniform float radiusFactor;

uniform float activeLayer;
uniform float activeLayerEnabled;
uniform sampler2D layerHeights;
uniform float layerHeightsSize;


attribute vec3 customColor;
attribute vec3 coord;
attribute float brightness;
attribute float beginRatio;
attribute float endRatio;
varying vec3 vColor;
varying vec3 pixelCoord;
varying float bright;
//to signal that we should not dim the endpoints for segments that are supposed to connect to other segments
varying float beginExtend;
varying float endExtend;
uniform float heightFactor;

vec3 golden = vec3(1.,1.,0.5);//customColor; // set color associated to vertex; use later in fragment shader
//Math.pow(Math.abs(2*r-1),3)
float shrinkFunc(float ratio){return pow(abs(2.*ratio-1.),3.);}

void main()
{

	vec2 sourceUV=getUV(position.x,layoutDataSize);
	vec2 targetUV=getUV(position.y,layoutDataSize);
	vec4 sourceData=texture2D( nodeData, sourceUV );
	vec4 targetData=texture2D( nodeData, targetUV);
	vec3 sourcePos = texture2D( layoutData, sourceUV ).xyz;sourcePos.xy*=radiusFactor;
	vec3 targetPos = texture2D( layoutData, targetUV ).xyz;targetPos.xy*=radiusFactor;
	float layer1=sourceData.x,layerSetID=sourceData.y,original=sourceData.z,ccSize=sourceData.w;
	float layer2=targetData.x,layerSetID2=targetData.y,original2=targetData.z,ccSize2=targetData.w;
	//other's layer?


	float colorMixRatio=max(coord.x,0.);

	if(beginRatio>0.01){beginExtend=1.;}else{beginExtend=0.;}
	if(endRatio<0.99){endExtend=1.;}else{endExtend=0.;}
	if(beginRatio>0.01||endRatio<0.99){
		//reverse the colors?
		colorMixRatio=colorMixRatio*(endRatio-beginRatio)+beginRatio;
		float beginShrink=shrinkFunc(beginRatio);
		float endShrink=shrinkFunc(endRatio);
		vec2 sv=sourcePos.xy;// mix them horizontally before shrinking
		vec2 tv=targetPos.xy;
		sourcePos.xy=mix(sv,tv,beginRatio)*beginShrink;
		targetPos.xy=mix(sv,tv,endRatio)*endShrink;
		//sourcePos.x=sourcePos.x*beginShrink;sourcePos.y=sourcePos.y*beginShrink;

		//targetPos.x=targetPos.x*endShrink;targetPos.y=targetPos.y*endShrink;
		float sz=sourcePos.z,tz=targetPos.z;
		sourcePos.z=mix(sz,tz,beginRatio);
		targetPos.z=mix(sz,tz,endRatio);
	}

	vec3 eye=camera-sourcePos;
	vec3 eye2=camera-targetPos;


	vec3 link=sourcePos-targetPos;



	vec3 up=normalize(cross(targetPos-camera,eye))*sqrt(length((eye+eye2)/2.+1.));//make the links become narrow slower as the distance increase, so at a distance you can see the edges shape only
	vec3 worldPos=mix(sourcePos,targetPos,max(coord.x,0.))+coord.y*up*thicknessFactor;

	//what is the vector that's perpendicular to the eye ray and the link itself?
	vec4 mvPosition = modelViewMatrix * vec4( worldPos, 1.0 );//coord is the local coordinates on a link, source side has 0 and target side has 1

	float colorValue1=getArrayValue(nodeColorData, nodeColorDataSize, position.x).x;
	float colorValue2=getArrayValue(nodeColorData, nodeColorDataSize, position.y).x;
	vec3 standardColor1=getScaleValue( colorList,colorListSize,colorListCount,colorValue1).rgb;
	vec3 standardColor2=getScaleValue( colorList,colorListSize,colorListCount,colorValue2).rgb;
	vec3 standardColor=mix(standardColor1,standardColor2,colorMixRatio);
	vColor=mix(golden,standardColor,lineLayerColorRatio);


	// option (1): draw particles at constant size on screen
	// gl_PointSize = size;
	// option (2): scale particles as objects in 3D space
	//gl_PointSize = 1.0 * ( 300.0 / length( mvPosition.xyz ) );
	gl_Position = projectionMatrix * mvPosition;
	pixelCoord = coord;

	float activeLayerFactor=1.;
	if(activeLayerEnabled>0.){activeLayerFactor=0.01;}//no point showing those lines in only one layer
	bright=brightness*activeLayerFactor*brightnessFactor;//*ccSizeFactor
	//bright=0.;
}