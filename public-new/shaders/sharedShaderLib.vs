#if (__VERSION__ == 300)
#define texture2D texture
#endif
//put here for better syntax highlighting
float rand(vec2 co){
		return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

float UVComponent2Index(float x){return (x*2.*textureSize-1.)/2.;}
float UVComponent2Index(float x,float size){return (x*2.*size-1.)/2.;}
float getEdgeUVComponent(vec2 v){//return co.y+(co.x/(textureSize+1.)) is incorrect! uv components are 1/2k, 3/2k ... 2k-1/2k
//for adj matrix
	return ((UVComponent2Index(v.x)+UVComponent2Index(v.y)*textureSize)*2.+1.)/(textureSize*textureSize*2.);
}
float getIndexFromUV(vec2 v){
	return UVComponent2Index(v.x)+UVComponent2Index(v.y)*textureSize;
}
float getIndexFromUV(vec2 v,float size){
	return UVComponent2Index(v.x,size)+UVComponent2Index(v.y,size)*size;
}
//uv to index is safe from floating point/int errors because there's no need to take floor/fract (the input uv is always the center of a pixel so no wrapping issue); index to uv must be careful of that problem, because if you take floor/fract naively, the integer points near the edge of the texture are where the mapping is discontinuous, so always adjust by 0.5
vec2 getUV(float x){
	return vec2( fract((x+0.5)/textureSize) , floor((x+0.5)/ textureSize)/textureSize+0.5/textureSize-0.5/(textureSize*textureSize) );
}
vec2 getUV(float x,float size){
	return vec2( fract((x+0.5)/size) , floor((x+0.5)/ size)/size+0.5/size-0.5/(size*size) );
}

float delta(float x,float y){return step(0.001,abs(x-y));}
float isEqual(float x,float y){return step(0.999,1.-abs(x-y));}//only works for a difference >0.001
float isLessThan(float x,float y){return step(0.001,x-y);}//only works for a difference >0.001



vec4 getArrayValue(sampler2D t,float size,float index){
	return texture2D( t, getUV(index,size) );
}
vec4 getScaleValue(sampler2D t,float size,float count,float value){//value is scaled between [0,1); index=value*count
	if(value<-0.5)return vec4(0.5,0.5,0.5,1.);
	return texture2D( t, getUV(value*count,size) );
}