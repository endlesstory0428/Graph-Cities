uniform sampler2D texture;
uniform float time;
varying vec3 vColor; // colors associated to vertices; assigned by vertex shader
//varying float bright;
void main() 
{
	// calculates a color for the particle
	gl_FragColor = vec4( vColor,texture2D( texture, gl_PointCoord ).r);//bright);
	// sets particle texture to desired color
	//gl_FragColor = gl_FragColor * ;
}