uniform float time;
varying vec3 vColor; // colors associated to vertices; assigned by vertex shader
varying vec3 pixelCoord;
varying float opacity;
float pi=3.141592653;
void main() 
{
	gl_FragColor = vec4(normalize(vColor),clamp(opacity,0.05,0.5));
	//gl_FragColor = vec4(normalize(vColor),1);
	//gl_FragColor = vec4(normalize(vColor),1);
}