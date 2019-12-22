varying vec3 pixelCoord;
varying float opacity;
varying vec2 vUv;
varying vec3 vColor;
varying float bright;

float pi=3.141592653589793;
void main() 
{
	float b=pow(0.01,abs(pixelCoord.y))*max(pow(0.01,abs(pixelCoord.y))*1.0,pow(0.001,abs(pixelCoord.y))*0.5/max(pixelCoord.z,1.0))*sin( min((1.0-abs(pixelCoord.x))*20.0,pi/2.0));//*bright
	//b=min(opacity,b);
	gl_FragColor = vec4(vColor,b);
}