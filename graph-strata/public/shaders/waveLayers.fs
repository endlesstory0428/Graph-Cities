uniform float time;
varying vec3 vColor; // colors associated to vertices; assigned by vertex shader
varying vec3 pixelCoord;
varying float opacity;
float pi=3.141592653;
void main() 
{
	//float b=pow(0.01,abs(pixelCoord.y))*max(pow(0.01,abs(pixelCoord.y))*1.0,pow(0.001,abs(pixelCoord.y))*0.5/max(pixelCoord.z,1.0))*sin( min((1.0-abs(pixelCoord.x))*20.0,pi/2.0));
	float d2=1.-pixelCoord.y*pixelCoord.y-pixelCoord.x*pixelCoord.x;
	float b=opacity*d2;
	b+=clamp(1.-d2*d2*100.,0.,1.)*0.35;//show rim;
	gl_FragColor = vec4(normalize(vColor),clamp(b,0.,1.));
	
}