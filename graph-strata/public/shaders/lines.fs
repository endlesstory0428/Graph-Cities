uniform sampler2D texture;
uniform float time;
varying vec3 vColor; // colors associated to vertices; assigned by vertex shader
varying vec3 pixelCoord;
varying float bright;
uniform float heightFactor;

varying float beginExtend;
varying float endExtend;
uniform sampler2D layerHeights;
uniform float layerHeightsSize;

float pi=3.141592653;
void main() 
{
	//gl_FragColor = vec4(normalize(vColor)*bright/max(1.0,pixelCoord.z/200.0),1);//normalize(vColor)?
	//gl_FragColor = vec4(normalize(vColor),bright);//normalize(vColor)?
	//gl_FragColor = gl_FragColor
	//*pow(0.01,abs(pixelCoord.y))
	//*max(pow(0.01,abs(pixelCoord.y))*1.0,pow(0.001,abs(pixelCoord.y))*0.5/max(pixelCoord.z,1))
	//*min(1.0-pow(abs(pixelCoord.y),(pixelCoord.z/100.0)+0.5),max(pow(0.01,abs(pixelCoord.y))*0.3,pow(0.001,abs(pixelCoord.y))*1.23*(pixelCoord.z/170.0+0.5)))//soft edge, meant to look sharp when close and thicker when far away
	//*sin( min((1.0-abs(pixelCoord.x))*20.0,pi/2.0));//soft end points, to avoid additive blending messing up the node shapes
	float b=bright*pow(0.01,abs(pixelCoord.y))*max(pow(0.01,abs(pixelCoord.y))*1.0,pow(0.001,abs(pixelCoord.y))*0.5/max(pixelCoord.z,1.0));
	if(beginExtend<0.5){b*=sin( min((1.0+pixelCoord.x)*20.0,pi/2.0));}
	if(endExtend<0.5){b*=sin( min((1.0-pixelCoord.x)*20.0,pi/2.0));}
	gl_FragColor = vec4(normalize(vColor),b);
	//gl_FragColor = vec4(normalize(vColor),1);

}