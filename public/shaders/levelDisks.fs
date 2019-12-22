uniform float time;
varying vec3 vColor; // colors associated to vertices; assigned by vertex shader
varying vec3 pixelCoord;
varying float opacity;
varying float fociX;
float pi=3.141592653;
void main() 
{
	float d2=1.-pixelCoord.y*pixelCoord.y-pixelCoord.x*pixelCoord.x;
	float b=opacity*d2;
	b+=clamp(1.-d2*d2*900.,0.,1.)*0.25;//show rim;
	/*if(fociX>0.)
	{
		b+=0.5*clamp((1.-100.*(pixelCoord.y*pixelCoord.y+(fociX-pixelCoord.x)*(fociX-pixelCoord.x))),0.,1.);
		b+=0.5*clamp((1.-100.*(pixelCoord.y*pixelCoord.y+(-fociX-pixelCoord.x)*(-fociX-pixelCoord.x))),0.,1.);
	}*/
	//pow(0.01,abs(pixelCoord.y))*max(pow(0.01,abs(pixelCoord.y))*1.0,pow(0.001,abs(pixelCoord.y))*0.5/max(pixelCoord.z,1.0))*sin( min((1.0-abs(pixelCoord.x))*20.0,pi/2.0));
	gl_FragColor = vec4(normalize(vColor),clamp(b,0.,1.));
	//gl_FragColor = vec4(normalize(vColor),1);
}