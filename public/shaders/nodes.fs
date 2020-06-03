uniform sampler2D t;
uniform float timer;

varying vec2 vUv;
varying vec4 vPosition;
varying float id;
varying vec3 vColor;
varying float vIsExpanded;
varying float vIsSelected;


void main() {
	float b=texture2D( t, gl_PointCoord ).r;
	//gl_FragColor = vec4( vColor, texture2D( t, gl_PointCoord ).r);//sin(id+timer/10000.0)*0.5+0.5 );
	vec2 pixelCoord=(gl_PointCoord-0.5)*2.;
	float d2=1.-pixelCoord.y*pixelCoord.y-pixelCoord.x*pixelCoord.x;
	//float circle=clamp(1.-d2*d2*900.,0.,1.)*0.25;//show rim;
	float x=pixelCoord.x,y=pixelCoord.y;
	float circle=clamp(1.-d2*d2*1900.,0.,1.)*1.;//show rim;
	float marker=clamp(1.-min(abs(x),abs(y))*7.,0.,1.)*1.;
	//clamp(1.-(abs(abs(x)-abs(y)))*7.,0.,1.)*1.;//cross marker
	if(vIsExpanded>0.){
		b=circle;
	}
	if(vIsSelected>0.){
		b+=marker;//gl_FragColor.r=1.;
	}

	gl_FragColor=vec4(vColor,clamp(b,0.,1.));
	
	//gl_FragColor=gl_FragColor;;
	//gl_FragColor=vec4( 0.5,0.5,0.5,1);

}