attribute vec3 customColor;
attribute float size;
//attribute float brightness;
//varying float bright;
varying vec3 vColor;
void main() 
{
	vColor = customColor; // set color associated to vertex; use later in fragment shader
	//bright=brightness;
	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
	// option (1): draw particles at constant size on screen
	// gl_PointSize = size;
	// option (2): scale particles as objects in 3D space
	gl_PointSize = 10.0 * ( 300.0 / length( mvPosition.xyz ) )*size;
	gl_Position = projectionMatrix * mvPosition;
}