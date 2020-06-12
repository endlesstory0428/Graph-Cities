varying vec2 vUv;
uniform sampler2D tPositions;
uniform sampler2D tPositionsPrev;
uniform sampler2D nodeData;//layer, charge(was layerset ID),original ID, subgraph level
uniform sampler2D nodePinData;
uniform sampler2D nodePriorityData;
uniform sampler2D nodeTargetRadiusData;
uniform sampler2D nodeTargetAnglesData;
uniform sampler2D clusteringData;
uniform sampler2D metanodeData;
uniform float clusteringStrengthFactor;
//uniform float textureSize;//this is actually replaced by a literal value, because we need the loop index to be constant
uniform float nodeCount;//max valid vertex ID

//uniform sampler2D edges;

uniform sampler2D edgeList;//try using an edge list instead of a matrix
uniform float edgeListSize;
uniform float edgeCount;
uniform sampler2D nodeEdgeIndex;//a number for each node that is the beginning of the index into teh edge list that represent edges that belongs to it. an edge is a group of 4 numbers: the target node ID, the strength, the distance, and whatever ???
//the thing with using an edge list on GPU: you can't very efficiently get a specific edge between two given IDs easily (you have to know a constant upper bound on the number of edges and loop in teh edge list until you find it which can be much slower than for a matrix) but you can loop through all edges from a given ID?

uniform float timer;

uniform float activeLayer;
uniform float activeLayerEnabled;

uniform float linkForceEnabled;

uniform float maxLayer;//for heights
uniform float layerCount;
uniform float logLayerHeightRatio;
uniform float reverseHeight;



uniform float radialLimit;
uniform float radialLimitFactor;
uniform float heightFactor;
uniform float linkDistanceFactor;
uniform float linkStrengthFactor;


uniform float alignmentStrengthFactor;


uniform float angleTargetStrengthFactor;



uniform sampler2D layerHeights;
uniform float layerHeightsSize;

uniform sampler2D nodeSelectionData;

//uniform mat4 modelViewMatrix;
uniform mat4 cameraProjectionMatrix;
uniform mat4 cameraMatrixWorld;
uniform mat4 cameraMatrixWorldInverse;
uniform mat4 nodeModelViewMatrix;

uniform float screenWidth;
uniform float screenHeight;
uniform float radiusFactor;

uniform vec3 nodeMovement;
uniform vec3 nodeScreenTarget;
uniform vec3 leftVector;
uniform vec3 forwardVector;
uniform vec3 screenUpVector;
float pi=3.141592653589793;

float getStartingEdgeIndex(vec2 uv){
	return texture2D(nodeEdgeIndex,uv).x;
}
float getStartingEdgeIndex(float index){
	if(index>=nodeCount-0.5)return edgeCount*2.;//index might be only almost equal to nodeCount because of floating point error; but normal indices should be <=nodeCount-1; funny bug: if it was index>nodeCount, then the last node ID is nodecount-1 and its endEID would be the next (invalid) entry (0) so it will retrieve no edges at all.
	return getStartingEdgeIndex(getUV(index));
} 

vec4 getEdgeData(float eid){
	return texture2D(edgeList,getUV(eid,edgeListSize));
}

const float d = 1./textureSize, e2 = 0.1,  dt2 = .029,G=-10000.,edgeStrength=.5,clusteringStrength=2.0,alignmentStrength=20.0,radialLimitStrength=0.5, decay=0.05,factor=1.-decay;
void main(void) {
	vec4 pos = texture2D( tPositionsPrev, vUv );
	vec2 r = pos.xy;
	vec2 r1  = texture2D(tPositions, vUv).xy;//r(t+1)
	vec2 f = vec2( 0. );//now forces only apply to x and y, the layoutDataSize is fixed by a formula
	vec4 node = texture2D(nodeData, vUv);//layer,charge,original ID, subgraph level
	vec4 nodePin = texture2D(nodePinData, vUv);//x,y,z,pinned
	vec4 nodeSelected = texture2D(nodeSelectionData, vUv);//x:isSelected
	vec4 clustering = texture2D(clusteringData, vUv);
	vec4 metanode = texture2D(metanodeData, vUv);
	float layer=node.x,charge=node.y,original=node.z,subgraphLevel=node.w;//was ccsize but nt used now
	
	float thisPriority=texture2D(nodePriorityData, vUv).x;
	float thisPriorityAbsolute=texture2D(nodePriorityData, vUv).y;
	
	float totalEdges=0.,totalVertices=0.;//sanity check
	
	if(getIndexFromUV(vUv)>=nodeCount)discard;//check for valid node
	
	//it seems avoiding if's is faster here
	
	float realAlignmentFactor=alignmentStrengthFactor;
	if(heightFactor<0.01)realAlignmentFactor=5.;
	//actually an if outside of loops desn't seem to affect fps
	for(float y = d/2.; y < 1.; y += d ){
		for(float x = d/2.; x < 1.; x += d ){
			totalVertices+=1.;
			//if(nodeCount<=x*textureSize+y)break;//this seems to actually hurt the performance...
			// vUv + vec2(x,y); we don't want to use looping behavior as the edge uv getter doesnt't consider it
			vec4 other=texture2D(tPositions,vec2(x, y));
			vec4 otherData=texture2D(nodeData,vec2(x, y));
			vec4 otherMetanodeData=texture2D(metanodeData,vec2(x, y));
			float otherlayer=otherData.x,otherCharge=otherData.y,otheroriginal=otherData.z,otherccSize=otherData.w,otherMetanodeID=otherMetanodeData.x;
			float otherSubgraphLevel=otherMetanodeData.w;
			float otherPriority=texture2D(nodePriorityData,vec2(x, y)).x;
			float otherPriorityAbsolute=texture2D(nodePriorityData,vec2(x, y)).y;
			float minPriority=min(thisPriority,otherPriority);//relative priority - low priority nodes affect others and are affected less
			float absPriorityFactor=1.;if(thisPriorityAbsolute>otherPriorityAbsolute)absPriorityFactor=0.;//absolute priority - higher priority nodes are not affected by lower, but the reverse is not true.
			//if(otherlayer!=activeLayer)continue;
			vec2 v = other.xy - r1;
			//vec3 v=texture2D(tPositions, vUv + vec2(x, y)).xyz - r;//distance
			float a = dot(v, v) + e2;
			//float e = getEdgeValue(vUv,vec2(x, y));//vUv + 
			float isDifferent=step(0.01,abs(original-otheroriginal));
			float subgraphChargeFactor=pow(0.8, subgraphLevel);//now if they have forces between, the subgraph levels have to be the same
			vec2 force=(
					(v/(a*sqrt(a)))*G*isDifferent*charge*otherCharge//subgraphChargeFactor //many-body, skipping forces between aligned nodes;
					//+(v*max(-150.,a-1000.*linkDistanceFactor)/(a+e2))*(e*edgeStrength*linkStrengthFactor)//link force, the expanding force of edges should not be too strong
					+(v*max(0.,a-0.1)/(a+e2))*((1.-isDifferent)*alignmentStrength*realAlignmentFactor)//alignment force
				)
				*max(delta(activeLayerEnabled,1.),min(isEqual(otherlayer,activeLayer),isEqual(layer,activeLayer)))//ignore if either of them is not in the active layer
				*step(0.,nodeCount-totalVertices)//ignore unused node slots
				*isEqual(metanode.x,otherMetanodeID)//ignore if the two is not in the same subgraph
				*(1.-step(-0.5,metanode.x)*0.5)//decrease force if they are in a subgraph (because the distance would need to be smaller)
				*minPriority*absPriorityFactor
			;
			f+=force;
				
			
			//f += (v/(a*sqrt(a)))*G;
			//totalEdges+=e;
			
			//f += (v*max(0.,a-0.1)/(a+e2))*e*edgeStrength;
		}
	}
	float eid=getStartingEdgeIndex(vUv),endeid=getStartingEdgeIndex(getIndexFromUV(vUv)+1.);
	//float nodeDegree=endeid-eid,degreeFactor=1./max(log(nodeDegree+1.)/2.,1.);
	if(linkForceEnabled>0.){
		//edge list loop
		//getStartingEdgeIndex(getIndexFromUV(vUv)+1.);//the uv-taking version of this does not check the ID. if the input ID>=nodeCount, return a value that is edgeCount*2 because the last valid node needs to get all remaining egdes
		for(float i=0.;i<textureSize*textureSize;i++){//max edge number is < node count (or it can be a parameter too)
			if(eid+i>=endeid)break;
			vec4 eData=getEdgeData(eid+i);
			float otherID=eData.x,eStrength=eData.y,eDistance=eData.z;
			//I try to avoid ifs inside loops but outside of loops seems OK
			
			vec2 otherUV=getUV(otherID);
			vec4 otherPos=texture2D(tPositions,otherUV);
			vec4 otherData=texture2D(nodeData,otherUV);
			float otherlayer=otherData.x,otherlayerSetID=otherData.y,otheroriginal=otherData.z,otherccSize=otherData.w;
			float otherPriority=texture2D(nodePriorityData,otherUV).x;
			float otherPriorityAbsolute=texture2D(nodePriorityData,otherUV).y;
			float minPriority=min(thisPriority,otherPriority);//relative priority - low priority nodes affect others and are affected less
			float absPriorityFactor=1.;if(thisPriorityAbsolute>otherPriorityAbsolute)absPriorityFactor=0.;
			vec2 v = otherPos.xy - r1;
			float a = dot(v, v) + e2;
			float targetDistance=1000.*linkDistanceFactor*pow(0.1, subgraphLevel);//decrease link length if it's in a subgraph - todo better way
			float subgraphStrengthFactor=pow(0.3, subgraphLevel);//now if they have forces between, the subgraph levels have to be the same
			f+=(v*max(-100.,a-targetDistance)/(a+e2))*(eStrength*edgeStrength*subgraphStrengthFactor*linkStrengthFactor)//-150 is the max pushing force ab edge can exert?
				*max(delta(activeLayerEnabled,1.),min(isEqual(otherlayer,activeLayer),isEqual(layer,activeLayer)))
				*minPriority*absPriorityFactor
			;
		}
	}
	
	//clustering
	
	if(clustering.y>0.){
		vec2 centerUV=getUV(clustering.x);
		vec4 centerPos=texture2D(tPositions,centerUV);
		vec2 v = centerPos.xy - r1;
		float a = dot(v, v) + e2;
		f+=(v*max(-10.,a-500.*linkDistanceFactor)/(a+e2))*(clusteringStrength*clusteringStrengthFactor*linkStrengthFactor);
	}
	
	//add force towards the metanode center
	if(metanode.x>-0.5){
		vec2 centerUV=getUV(metanode.x);
		vec4 centerPos=texture2D(tPositions,centerUV);
		vec2 v = centerPos.xy - r1;
		float a = dot(v, v) + e2;
		f+=(v*max(-1.,a-20.*linkDistanceFactor)/(a+e2))*2.;//the push force should be very weak, but the target distance should be short
	}
	
	float realRadialLimit=radialLimit*radialLimitFactor;
	float radius=sqrt(dot(r1,r1));
	//f+=	-r1*radialLimitStrength/(radius*max(pow(max((radialLimit-radius)/radialLimit,0.),0.1),0.02*dt2))*max(delta(activeLayerEnabled,1.),isEqual(layer,activeLayer));//actually I think the only right way to do radial limit is to scale all radii to within the limit; applying different forces will always look bad in some cases, but dt2 and the limit helps to prevent sharp jumping near the edge.
	//now I think the force should be always smooth, and increase smoothly from the center
	f+=(-r1*radialLimitStrength/radius)*max(radius/realRadialLimit,exp(max(radius/realRadialLimit-1.,0.)))//smoothstep(0.,radialLimit,radius)
		//(-r1*radialLimitStrength)/min(realRadialLimit,radius*pow(max((realRadialLimit-radius)/realRadialLimit,0.),0.3))//
	*max(delta(activeLayerEnabled,1.),isEqual(layer,activeLayer));
	
	vec4 targetRadiusData=texture2D(nodeTargetRadiusData, vUv);
	vec3 targetRadii=targetRadiusData.xyz;
	float targetRadius=targetRadii.x;float targetRadius2=targetRadii.y;float targetRadius3=targetRadii.z;float radialTargetStrength=500.;float radialTargetStrength2=5.;float radialTargetStrength3=5.;
	if(targetRadius>-0.5){
		float realTargetRadius=targetRadius*radialLimit*radialLimitFactor*3.;// *6 is the same formula as for rings quad width, so *3 is the correct radius
		f+=(-r1*radialTargetStrength/radius)*(radius-realTargetRadius);
	}
	if(targetRadius3>-0.5){//this is the real radius; and also decrease the other forces if this is applied
		//remove the radial component of the previous force only if the radius is larger than the target
		vec2 n=normalize(r1);
		float d=dot(n,f);
		float realTargetRadius=targetRadius3;
		f-=d*n*step(0.,radius-realTargetRadius);
		f*=0.1;
		f+=(-r1*radialTargetStrength3/radius)*max(radius-realTargetRadius*0.95,0.);
	}
	if(targetRadius2>-0.5){//this is the real radius; and also decrease the other forces if tis is applied
		//remove the radial component of the previous force
		vec2 n=normalize(r1);
		float d=dot(n,f);
		f-=d*n;
		f*=0.1;
		float realTargetRadius=targetRadius2;
		f+=(-r1*radialTargetStrength2/radius)*(radius-realTargetRadius);
	}
	
	
	vec4 targetAngleData=texture2D(nodeTargetAnglesData, vUv);;
	float targetAngle=targetAngleData.x;//currectly only the first is used
	float angleTargetStrength=5.;
	if(targetAngle>-0.5){
		float thisAngle=atan(r1.x,r1.y);
		float angleDist1=mod(thisAngle-targetAngle,pi*2.);
		float angleDist2=mod(thisAngle-targetAngle,pi*2.)-pi*2.;
		float angleDist=min(abs(angleDist1),abs(angleDist2));//mod 2pi?
		float angleDelta=angleDist1;if(abs(angleDist1)>abs(angleDist2)){angleDelta=angleDist2;}
		vec2 tangent=normalize(vec2(-r1.y,r1.x))*angleDelta;
		f+=tangent*angleTargetStrength*angleTargetStrengthFactor;
	}
	

	if(nodePin.w>0.){
		f.x=0.;f.y=0.;//nodePin; allow layer height changes and manual movements
	}
	
	//manual movement
	if(length(nodeMovement)>0.&&nodeSelected.x>0.){
		f=nodeMovement.xy;
	}
	//nodeScreenMovement is a screen-space override (values are in pixels) so happens later
	

	
	
	float maxSpeed=600./(timer*5.+5.)+10.;//11 -> 1? 7.5 -> 5?
	//if(endeid==eid){maxSpeed*=0.01;}
	//float maxSpeed=0.1;
	float componentMaxSpeed=600.;//speed may be too large to clamp as a whole in some cases (overflow when squared?), so must clamp components first
	//r =r+f*dt2; 
	//vec3 r2=(r+r1)/2.;
	//vec3 r2=2.*r1 - r;// + f*dt2;//2.*r1 - r;// + f*dt2;//dt2=.00001;
	//vec2 r2=2.*r1 - r+ f*dt2;//2.*r1 - r;// + f*dt2;//dt2=.00001;
	
	//vec2 r2=r1 +(r1-r)*factor+ f*dt2;//2.*r1 - r;// + f*dt2;//dt2=.00001;
	//r2=r1+clamp(r2-r1,-maxSpeed,maxSpeed);//this will clamp componets separately, leading to a square shape at the beginning
	vec2 oldVelocity=r1-r;
	
	vec2 velocity=(r1-r)*factor+ f*dt2;//2.*r1 - r;// + f*dt2;//dt2=.00001;
	//if(dot(velocity,oldVelocity)<0.){velocity=velocity*0.5;}//if it's bouncing around, increase the decay
	//velocity=normalize(velocity);//funny - if you normalize and then clamp it, nodes will always wiggle around in a funny way; but this shows that the length of velocity is usually much less than 1
	
	//velocity=normalize(velocity)*clamp(speed,0.,maxSpeed);//maybe the normalization is not a good idea for small velocities?  It will cause everything to disappear if not clamped component-wise.
	//vec2 r2=r1+clamp(velocity,-maxSpeed,maxSpeed);//this will clamp componets separately, leading to a square shape at the beginning. 
	velocity=clamp(velocity,-componentMaxSpeed,componentMaxSpeed);
	float speed=length(velocity),clampRatio=max(1.,speed/maxSpeed);
	velocity=velocity/clampRatio;
	vec2 r2=r1+velocity;
	//vec2 r2=r1+clamp(velocity,-maxSpeed,maxSpeed);
	
	//vec2 velocity=(r1-r)*factor+ f*dt2;float speed=length(velocity);
	//vec2 r2=r1+normalize(velocity)*speed;//*clamp(speed,0.,maxSpeed);
	float layerHeight=getArrayValue(layerHeights,layerHeightsSize,layer).x*heightFactor;
	if(nodeScreenTarget.z>0.&&nodeSelected.x>0.){
		vec4 pos=cameraProjectionMatrix*(cameraMatrixWorldInverse*vec4(r2*radiusFactor, layerHeight,1.0));

		vec2 spos=pos.xy/pos.w;
		spos.x*=screenWidth;
		spos.y*=screenHeight;
		spos/=2.;

		vec3 movement=(leftVector*(spos.x-nodeScreenTarget.x)+screenUpVector*(nodeScreenTarget.y-spos.y));
		r2=r1+0.05*movement.xy;;//movement.xy;

		
		//vec3 pos = vertexPos.xyz;
		//pos.xy*=radiusFactor;
		//vec4 mvPosition = modelViewMatrix * vec4( pos, 1.0 );
		//gl_Position = projectionMatrix * mvPosition;
	}
	
	
	gl_FragColor = vec4(r2, layerHeight,pos.w);
	
	
	
	
	
	//debug
	//gl_FragColor = vec4(r2, speed*10.,pos.w);
	//gl_FragColor=vec4(totalEdges,pos.w,0.,pos.w);
	//gl_FragColor=vec4(vUv.x*100.,vUv.y*100.,0.,pos.w);//getEdgeUVComponent(vUv)
	//gl_FragColor=vec4(eid*10.,(endeid-eid)*10.,0.,pos.w);//getEdgeUVComponent(vUv)
	//gl_FragColor=vec4(getEdgeUVComponent(vUv)*100.,0.,0.,pos.w);//
	//gl_FragColor = pos;
}