
varying vec3 pixelCoord;
varying float opacity;
varying vec3 vColor1;
varying vec3 vColor2;
varying float vRealRadius;
varying float vThickness; 
void main() 
{
	float d2=pixelCoord.y*pixelCoord.y+pixelCoord.x*pixelCoord.x;
	//float b=opacity*d2;
	float width=vThickness//clamp(0.9*clamp(vThickness*4.+0.1,0.,1.)*vRadiusDelta/vRealRadius,0.,1.)
		,halfWidth=width/2.,centralR=1.-halfWidth;
	float r=sqrt(d2);
	float diff=abs(centralR-r);
	float radialRatio=clamp(1.+(r-1.)/width,0.,1.);//0-1 from inner to outer rim
	vec3 realColor=mix(vColor2,vColor1,r);
	float insideRatio=clamp((1.-diff/halfWidth),0.,1.);//0-1 from  rims to center of thickness
	if(width>0.999){insideRatio=clamp(1.-r,0.,1.);}//remove the central white spot - 0-1 from rim to origin 
	float bright= smoothstep(0.05,0.15,insideRatio)*opacity;
	
	gl_FragColor = vec4(normalize(realColor),bright);//clamp(bright,0.,1.)//vec4(realColor,0.15);
	
}