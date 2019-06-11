
varying vec3 pixelCoord;
varying float opacity;
varying vec2 vUv;
varying vec3 vColor1;
varying float vRealRadius;
varying float vThickness; //here it is the proportion of the whole radius
varying float vCenterAngle;
varying float vAngleWidth;
varying float vIsRectangle;//optimize short arcs into a rectangle

float pi=3.141592653589793;
void main() 
{
	if(vIsRectangle>0.5){
		gl_FragColor = vec4(vColor1,opacity);
		return;
	}
	
	float d2=pixelCoord.y*pixelCoord.y+pixelCoord.x*pixelCoord.x;
	//float b=opacity*d2;
	
	float width=vThickness//clamp(0.9*clamp(vThickness*4.+0.1,0.,1.)*vRadiusDelta/vRealRadius,0.,1.)
		,halfWidth=width/2.,centralR=1.-halfWidth;
	float r=sqrt(d2);
	float diff=abs(centralR-r);
	if(diff>halfWidth)discard;
	float radialRatio=clamp(1.+(r-1.)/width,0.,1.);//0-1 from inner to outer rim
	//vec3 realColor=mix(vColor2,vColor1,r);
	float insideRatio=clamp((1.-diff/halfWidth),0.,1.);//0-1 from  rims to center of thickness
	if(width>0.999){insideRatio=clamp(1.-r,0.,1.);}//remove the central white spot - 0-1 from rim to origin 
	
	//angle
	//float atan(float y, float x)  
	float thisAngle=atan(pixelCoord.x,pixelCoord.y);
	float angleDist1=mod(thisAngle-vCenterAngle,pi*2.);
	float angleDist2=mod(thisAngle-vCenterAngle,pi*2.)-pi*2.;
	float angleDist=min(abs(angleDist1),abs(angleDist2));//mod 2pi?
	if((vAngleWidth<pi*0.9)&&(angleDist>vAngleWidth))discard;
	float insideRatio2=clamp((1.-angleDist/vAngleWidth),0.,1.);
	if(vAngleWidth>pi*0.9){insideRatio2=1.;}//remove the gap for whole circles
	
	float bright= smoothstep(0.05,0.15,insideRatio)*smoothstep(0.05,0.15,insideRatio2)*opacity;
	//normalize(vColor1)
	gl_FragColor = vec4(vColor1,bright);//clamp(bright,0.,1.)//vec4(realColor,0.15);
	//gl_FragColor=vec4(1.,0.,1.,1.);
}