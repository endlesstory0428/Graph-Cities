uniform sampler2D texture;
uniform float time;
varying vec3 vColor; // colors associated to vertices; assigned by vertex shader
varying vec3 pixelCoord;
varying float bright;
varying float vDirection;
float pi=3.141592653;
const float brightnessThreshold=0.001;//usually doesn't help fps very much, but helps in single-layer layouts because then edges are almost invsible
void main() 
{
	//gl_FragColor = vec4(normalize(vColor)*bright/max(1.0,pixelCoord.z/200.0),1);//normalize(vColor)?
	//gl_FragColor = vec4(normalize(vColor),bright);//normalize(vColor)?
	//gl_FragColor = gl_FragColor
	//*pow(0.01,abs(pixelCoord.y))
	//*max(pow(0.01,abs(pixelCoord.y))*1.0,pow(0.001,abs(pixelCoord.y))*0.5/max(pixelCoord.z,1))
	//*min(1.0-pow(abs(pixelCoord.y),(pixelCoord.z/100.0)+0.5),max(pow(0.01,abs(pixelCoord.y))*0.3,pow(0.001,abs(pixelCoord.y))*1.23*(pixelCoord.z/170.0+0.5)))//soft edge layoutDataSize, meant to look sharp when close and thicker when far away
	//*sin( min((1.0-abs(pixelCoord.x))*20.0,pi/2.0));//soft end points, to avoid additive blending messing up the node shapes
	if(bright<brightnessThreshold)discard;
	float b=bright*pow(0.01,abs(pixelCoord.y))*max(pow(0.01,abs(pixelCoord.y))*1.0,pow(0.001,abs(pixelCoord.y))*0.5/max(pixelCoord.z,1.0))*sin( min((1.0-abs(pixelCoord.x))*20.0,pi/2.0))
	*smoothstep(-0.1,0.1,((1.+vDirection*pixelCoord.x)/2.)-abs(pixelCoord.y));//direction:-1 is source to target, 1 is target to source? this makes the source part of the directed link thinner (invisible if it's more towards the rim)
				
	//float arrow=smoothstep(-0.05,0.05,clamp(9.-abs(pixelCoord.x)*10.,0.,1.)*smoothstep(0.79,0.81,abs(pixelCoord.x))*step(0.5,-pixelCoord.x*vDirection)-abs(pixelCoord.y))*bright;
	float arrow=smoothstep(-0.05,0.05,clamp(6.-abs(pixelCoord.x)*10.,0.,1.)*smoothstep(0.49,0.51,abs(pixelCoord.x))*step(0.5,-pixelCoord.x*vDirection)-abs(pixelCoord.y))*bright;
			
	b=clamp(b+arrow,0.,1.);
	gl_FragColor = vec4(vColor,b);//now if the color needs normalization (make it not too bright or too dark) it's done in the vertex shader
	//gl_FragColor = vec4(0.5,0.5,0.5,b);
}