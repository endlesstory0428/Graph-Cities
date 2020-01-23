'use strict';

//if(typeof DataSet=="undefined")DataSet=require("./dataset.js");

let DEBUG;
const graphSummaryProperties=["datasetID","dataPath","originalGraph","wholeGraph","metagraph","subgraphType","metagraphType","subgraphID","isMetagraph","subgraphPrefix","partitionInfo","globalPartitionInfo","bucketID","layerCCSummary","subgraphs","metagraphs","heightProperty","waveMap","levelMap"];

const ignoreSummaryProperties=["objects","warningCount","warningReasons","repeatedWarningLimit","nodes","links","averageDegree","collapsedRings",];//instead of adding all needed properties, why not skip all unneeded ones?


class DataProperty{
	constructor(owner,name,type,data,isAbstract){
		this.owner=owner;
		this.name=name;
		let length=owner.length?owner.length:0;
		this.length=length;
		this.type=type;
		if(data&&isAbstract)throw Error();
		if(type==undefined){this.isArray=true;}
		else if (type=="sparse"){this.isSparse=true;}
		else{let func=getTypedArrayType(type);this.typedArrayType=func;this.isTypedArray=true;}
		if(!isAbstract){this.allocateSpace();}
		else{this.isAbstract=true;}
		if(data){this.setData(data);}
	}
	allocateSpace(){
		if(this.type==undefined){this.value=new Array(this.length);}
		else if (this.type=="sparse"){this.value={};}
		else{
			let func=getTypedArrayType(this.type);
			this.internalValue=new func(nextPowerOf2(this.length)); //at the beginning
			this.value=this.internalValue.subarray(0,this.length);
		}
		this.owner[this.name]=this.value;
	}
	setData(data){
		if(this.isAbstract){
			delete this.isAbstract;
			this.allocateSpace();if(DEBUG)console.log(this.name+": no longer abstract, allocating space "+this.length);
		}
		if(typeof data=="function"){
			for(let i=0;i<this.length;i++){
				this.value[i]=data(i,this.value);
				if(DEBUG&&(i==0))console.log(this.name+": setting first item to "+this.value[i]);
			}
		}
		else if(typeof data=="object"){//todo:sparse-style
			if(data.length!=this.length)console.log("warning: data array length is different from the current length: "+data.length+", current is "+this.length);
			for(let i=0;i<this.length;i++){
				if(i in data){this.value[i]=data[i];}
			}
		}
		else console.log("unknown data array type");//constats can just use array.fill (no point filling sparse properties)
		if(DEBUG&&isArrayLike(this.value))console.log(this.name+": current length "+this.value.length+", length at parent "+this.owner[this.name].length);
	}
	setAbstract(value){
		if(value===false){delete this.isAbstract;this.allocateSpace();}
		else{
			this.isAbstract=true;delete this.value; delete this.internalValue;
		}
	}
	setLength(length){
		
		if(this.isAbstract){if(DEBUG)console.log(this.name+": setting abstract length "+length);this.length=length;return;}
		if(this.type==undefined){
			this.value.length=length;if(DEBUG)console.log(this.name+": setting array length "+length);
		}
		else if(this.type=="sparse"){
			//nothing
		}
		else{
			if(DEBUG)console.log(this.name+": setting typed array length "+length);
			
			let func=this.typedArrayType;let newLength=nextPowerOf2(length),internalLength=this.internalValue.length;
			let needsUpdate=false;let oldData=this.internalValue;
			if(length>this.length&&newLength>internalLength){needsUpdate=true;}
			else if(newLength<this.length/2&&internalLength-newLength>1048576){needsUpdate=true;}
			if(needsUpdate){
				this.internalValue=new func(newLength);
				for(let i=0;i<length&&i<this.length;i++){
					this.internalValue[i]=oldData[i];
				}
			}
			this.value=this.internalValue.subarray(0,length);
			this.owner[this.name]=this.value;
		}
		this.length=length;
	}
	toPlainText(){
		
	}
	toJSON(){
		if(!this.isTypedArray)return JSON.stringify({type:this.type,value:this.value});
		return "{\"type\":\""+this.type+"\",\"value\":["+this.value.join(",")+"]}";
	}
}

class DataObject{
	constructor(name,length){
		this.name=name;
		this.length=length?length:0;
		this.properties={};
		//this.customObjects=[];
	}
	addProperty(name,type,data,isAbstract){//type can be one of the typed array type names,or nothing,or "sparse"
		this.properties[name]=new DataProperty(this,name,type,data,isAbstract);
		this[name]=this.properties[name].value;//so that eg. graph.vertices.id[0] works
		return this[name];
	}
	removeProperty(name){
		let temp=this.properties[name];delete this.properties[name];delete this[name];return temp.value;
	}
	addObject(obj){
		this.length++;
		for(let p in this.properties){this.properties[p].setLength(this.length);}
		return this.length-1;
	}
	setAbstract(value){
		for(let propName in this.properties){this.properties[propName].setAbstract(value);}
	}
	setLength(length){
		this.length=length;
		for(let p in this.properties){this.properties[p].setLength(length);}
		return this.length-1;
	}
	setProperty(name,data){
		this.properties[name].setData(data);
	}
	map(f){//similar to the array map()
		let result=new Array(this.length);
		for(let i=0;i<this.length;i++){
			let value=null;if(this._value)value=this._value[i];//hack
			result[i]=f(value,i,this);
		}
		return result;
	}
	forEach(f){
		for(let i=0;i<this.length;i++){
			let value=null;if(this._value)value=this._value[i];//hack
			f(value,i,this);
		}
	}
	getArray(){
		//backward compatibility
		let arr=this._value;
		if(!arr){arr=new Array(this.length);arr.fill(undefined);}//for(let i=0;i<arr.length.i++)arr[i]=(undefined);}
		for(let propName in this.properties){
			addHiddenProperty(arr,propName,this[propName]);
		}
		return arr;
	}
	append(obj,templates,offsets){//extends itself with another data object, creating new properties as needed
		let oldLength=this.length;let addedLength=obj.length;
		this.setLength(this.length+obj.length);
		//results[name].array=results[name].array.concat(subData);
		//let objTemplate=G.subview.templates[name];
		for(let propName in obj.properties){
			if(templates){
				if(!templates[this.name].properties[propName])continue;//skip irrelevant properties that may come from somewhere else (eg graph vs view model)
			}
			let objProp=obj.properties[propName];
			if(propName in this.properties==false){this.addProperty(propName,objProp.type);}
			let thisProp=this.properties[propName];
			if(thisProp.type!=objProp.type){throw Error();}
			//properties cannot normally extend themselves, so do that here
			
			if(templates&&templates[this.name].properties[propName].reference){
				let offset=offsets[templates[this.name].properties[propName].reference];
				if(isNaN(offset))throw Error();
				if(!thisProp.isSparse){
					for(let i=0;i<addedLength;i++){
						let val=objProp.value[i];
						if((!isNaN(val))&&(val!=null))thisProp.value[i+oldLength]=val+offset;
						else thisProp.value[i+oldLength]=val;//don't offset null/NaN values
					}
				}
				else{
					for(let i in objProp.value){
						let val=objProp.value[i];
						if((!isNaN(val))&&(val!=null))thisProp.value[Number(i)+oldLength]=val+offset;
						else thisProp.value[Number(i)+oldLength]=val;//don't offset null/NaN values
					}
				}

			}
			else{//copy, don't add (the value might not be a number)
				if(!thisProp.isSparse){
					for(let i=0;i<addedLength;i++){thisProp.value[i+oldLength]=objProp.value[i];}
				}
				else{
					for(let i in objProp.value){thisProp.value[Number(i)+oldLength]=objProp.value[i];}
				}
			}
			
		}
	}
	getObj(i){
		let obj={};
		for(let prop in this.properties){obj[prop]=this.properties[prop].value[i];}
		return obj;
	}
	filter(func){//pretends it's an array of objects with properties(but only one object can be accessed at a time); returns another DataObject
		let obj={};let chosen=new Array(this.length);
		let arrays={};let indices=[],indexMap={};
		for(let prop in this.properties){arrays[prop]=[];}
		for(let i=0;i<this.length;i++){
			for(let prop in this.properties){obj[prop]=this.properties[prop].value[i];}
			let result=func(obj,i,this);
			if(result){
				for(let prop in this.properties){arrays[prop].push(this.properties[prop].value[i]);}
				indexMap[i]=indices.length;indices.push(i);
			}
		}
		let newObject=new DataObject(this.name,indices.length);
		for(let prop in this.properties){newObject.addProperty(prop,this.properties[prop].type,arrays[prop]);}
		newObject.originalIndices=indices;
		newObject.indexMap=indexMap;
		return newObject;
	}
}

class DataSet{//a collection of data obejcts that can be added to, but no graph topology checks
	constructor(){
		this.objects={};
	}
	addObject(name,obj){
		if(!obj){obj=new DataObject(name);}
		this.objects[name]=obj;
		this[name]=obj;
		return obj;
	}
	unloadAll(){//sets all existing data as abstract
		for(let objName in this.objects){
			let obj=this.objects[objName];
			for(let propName in obj.properties){
				obj.properties[propName].setAbstract(true);
			}
		}
	}
	loadSummary(summary){
		//sets the objects in the summary as abstract (not changing other objects' data?)
		let summaryObjects=summary.objects;
		for(let objName in summaryObjects){
			if(!this.objects[objName]){this.addObject(objName);};
			let obj=this.objects[objName];//even set existing properties as abstract?
			let objSummary=summaryObjects[objName];//length, properties:{...}
			for(let propName in obj.properties){
				obj.properties[propName].setAbstract(true);
			}
			obj.setLength(objSummary.length);
			for(let propName in objSummary.properties){
				if(propName in obj.properties==false){
					obj.addProperty(propName,objSummary.properties[propName].type,null,true);//is abstract
				}
				else obj.properties[propName].setAbstract(true);
			}
		}
	}
	loadAll(data){
		let objects=data.objects;
		for(let objName in objects){
			if(!this.objects[objName]){this.addObject(objName);};
			let obj=this.objects[objName];
			let objSummary=objects[objName];
			obj.setLength(objSummary.length);
			for(let propName in objSummary.properties){
				if(propName in obj.properties==false){
					obj.addProperty(propName,objSummary.properties[propName].type,objSummary.properties[propName].value);
				}
				else obj.properties[propName].setData(objSummary.properties[propName].value);
			}
		}
	}
	setAbstract(value){
		for(let objName in this.objects){this.objects[objName].setAbstract(value);}
	}
	getSummary(){
		let summary={objects:{}};
		let summaryObjects=summary.objects;//there may be other parts in the summary, eg, subgraphs
		for(let objName in this.objects){
			let obj=this.objects[objName];
			summaryObjects[objName]={length:obj.length,properties:{}};
			for(let propName in obj.properties){
				let propObj=obj.properties[propName];
				summaryObjects[objName].properties[propName]={type:propObj.type,isAbstract:propObj.isAbstract}
			}
		}
		return summary;
	}
	getShortSummary(){
		let summary={};//only get object lengths
		for(let objName in this.objects){
			let obj=this.objects[objName];
			summary[objName]=obj.length;
		}
		return summary;
	}
	static concatDataSets(subviews,templates){//used for making a view model ot of all subviews; templates specify the references
		let results=new DataSet();
		let offsets=[];//each subview has an offset map per object type
		for(let graphID=0;graphID<subviews.length;graphID++){
			offsets[graphID]={};
			let subview=subviews[graphID];//let g=subview.graph;graphMap.set(g,graphID);graphList.push(g);
			for(let name in subview){//not all properties of subview is a view object
				if((!templates[name])||(!templates[name].properties))continue;//not a template for a data object
				if(name in results==false){//new kind of object - now I don't require all datasets to contain teh same objects/properties?
					results.addObject(name);
				}
				offsets[graphID][name]=results[name].length;
				let subData=subview[name];//if(subData instanceof DataObject){subData=subData.getArray();}
				results[name].append(subData,templates,offsets[graphID]);//will create missing properties; uses offsets for references
			}
		}
		return {dataset:results,offsets:offsets};
	}
}


class CombinedDataProperty extends DataProperty{
	/*constructor(owner,name,type,data,isAbstract){
		this.owner=owner;
		this.name=name;
		let length=owner.length?owner.length:0;
		this.length=length;
		this.type=type;
		if(data&&isAbstract)throw Error();
		if(type==undefined){this.isArray=true;}
		else if (type=="sparse"){this.isSparse=true;}
		else{let func=getTypedArrayType(type);this.typedArrayType=func;this.isTypedArray=true;}
		if(!isAbstract){this.allocateSpace();}
		else{this.isAbstract=true;}
		if(data){this.setData(data);}
	}*/
	constructor(owner,name,type,subdatalist){
		this.subDataList=subdatalist;
		this.owner=owner;
		this.name=name;
		this.length=arraySum(subdatalist.map(o=>o.length));
		this.type=type;
		if(type==undefined){this.isArray=true;}
		else if (type=="sparse"){this.isSparse=true;}
		else{let func=getTypedArrayType(type);this.typedArrayType=func;this.isTypedArray=true;}
		
	}

}


class CombinedDataObject extends DataObject{//a view of multiple data objects concatenated
	constructor(name,subObjects){
		this.subObjects=subObjects;
		this.name=name;
		this.length=arraySum(subObjects.map(o=>o.length));
		this.properties={};
	}
	addProperty(name,type,data,isAbstract){//type can be one of the typed array type names,or nothing,or "sparse"
		throw Error();
	}
	removeProperty(name){
		throw Error();
	}
	addObject(obj){
		throw Error();
	}
	setLength(length){
		throw Error();
	}
	setProperty(name,data){
		this.properties[name].setData(data);
	}
	map(f){//similar to the array map()
		let result=new Array(this.length);
		for(let i=0;i<this.length;i++){
			let value=null;if(this._value)value=this._value[i];//hack
			result[i]=f(value,i,this);
		}
		return result;
	}
	forEach(f){
		for(let i=0;i<this.length;i++){
			let value=null;if(this._value)value=this._value[i];//hack
			f(value,i,this);
		}
	}
	getArray(){
		//backward compatibility
		let arr=this._value;
		if(!arr){arr=new Array(this.length);arr.fill(undefined);}//for(let i=0;i<arr.length.i++)arr[i]=(undefined);}
		for(let propName in this.properties){
			addHiddenProperty(arr,propName,this[propName]);
		}
		return arr;
	}
}

class Graph extends DataSet{
	constructor(){
		super();
		let vs=this.addObject("vertices");vs.addProperty("id");vs.addProperty("edges");
		this.vertexMap={};
		let es=this.addObject("edges");es.addProperty("source","int");es.addProperty("target","int");
		addHiddenProperty(this,"warningCount",0);
		addHiddenProperty(this,"warningReasons",{});
		addHiddenProperty(this,"repeatedWarningLimit",3);
	}
	hasVertex(id){return (id in this.vertexMap);}
	getVertexByID(id){
		if(this.hasVertex(id)){return this.vertexMap[id];}
		else throw Error("Graph "+this.name+" error: no such vertex "+id);
	}
	getNeighborsByID(id){return Object.keys(this.vertices.edges[this.vertexMap[id]]);}
	getNeighborIDsByID(id){return Object.keys(this.vertices.edges[this.vertexMap[id]]).map((i)=>this.vertexMap[i]);}
	getNeighbors(index){return Object.keys(this.vertices.edges[index]);}
	getIncidentEdges(index){return Object.values(this.vertices.edges[index]);}
	getAdjacencyMap(index){return this.vertices.edges[index];}
	
	
	hasEdgeByID(source,target){
		return this.vertexMap[b] in this.vertices.edges[this.vertexMap[a]];
	}
	hasEdge(source,target){
		return b in this.vertices.edges[a];
	}
	adjacentByID(a,b){return this.vertexMap[b] in this.vertices.edges[this.vertexMap[a]];}
	adjacent(a,b){return b in this.vertices.edges[a];}
	
	getEdgeByID(source,target){
		return this.vertices.edges[this.vertexMap[source]][this.vertexMap[target]];
	}
	getEdge(source,target){
		return this.vertices.edges[source][target];
	}
	
	addVertex(id){//by ID - there's no not-by-ID version of the adding functions
		if(id===undefined){throw Error();}
		if(this.vertices.length==0&&(this.warnAboutUnknownVertex===undefined)){this.warnAboutUnknownVertex=true;}//if the first vertex is created explicitly, warn about implicit ones
		if(typeof id=="number")id=id.toString();
		if(this.hasVertex(id)){
			this.warn(id,"repeated vertex");return this.getVertexByID(id);
		}
		let index=this.vertices.addObject();this.vertices.id[index]=id;this.vertexMap[id]=index;
		this.vertices.edges[index]={};
		return index;
	}
	
	addEdge(source,target,options){
		if(typeof source=="number")source=source.toString();if(typeof target=="number")target=target.toString();
		if(this.vertices.length==0&&(this.warnAboutUnknownVertex===undefined))this.warnAboutUnknownVertex=false;//edges before vertices, probably normal
		if(this.hasVertex(source)==false){
			if(this.warnAboutUnknownVertex){this.warn(source,"created unknown vertex");}
			let index=this.addVertex(source);
			if(options&&options.vertices){
				options.vertices(index,this);
			}
		}//only need warning if this graph has created vertices in another way so it's likely that this is unintended
		if(this.hasVertex(target)==false){
			if(this.warnAboutUnknownVertex){this.warn(source,"created unknown vertex");}
			let index=this.addVertex(target);
			if(options&&options.vertices){
				options.vertices(index,this);
			}
		}
		let si=this.getVertexByID(source),ti=this.getVertexByID(target);//here getX means getting the index
		if(source==target){this.warn(source,"self loop");return;}
		if(this.adjacentByID(source,target)){this.warn(source+", "+target,"repeated edge");return this.getEdgeByID(source,target);}
		let index=this.edges.addObject();
		this.edges.source[index]=si;this.edges.target[index]=ti;
		this.vertices.edges[si][ti]=index;this.vertices.edges[ti][si]=index;
		if(options&&options.edges){
			options.edges(index,this);
		}
		return index;
	}
	//I think we should always load V and E together and not have to explicitlly update adjacency
	updateAdjacency(){//updates vertexMap and vertices.edges, for when edges are changed by other ways like loading
		this.vertices.setProperty("edges",()=>({}));this.vertexMap={};
		for(let i=0;i<this.vertices.length;i++){this.vertexMap[this.vertices.id[i]]=i;}
		for(let i=0;i<this.edges.length;i++){
			let s=this.edges.source[i],t=this.edges.target[i];
			if(!this.vertices.edges[s])throw Error("invalid source vertex index "+s);
			if(!this.vertices.edges[t])throw Error("invalid target vertex index "+t);
			this.vertices.edges[s][t]=i;this.vertices.edges[t][s]=i;
		}
	}
	
	loadVerticesAndEdges(vs,es,et){
		//style 1: vs and es can represent data objects with properties
		//style 2: vs,es,et are arrays representing vIDs, edge Sources,edge Targets
		if(Array.isArray(vs)){
			//use the array style. vIDs shouldn't be a typed array because IDs are usually strings
			if(isArrayLike(es)&&isArrayLike(et)){
				//console.log("array style");DEBUG=true;
				this.vertices.setLength(vs.length);
				
				//console.log(vs.length+", "+this.vertices.length+", "+this.vertices.edges.length);
				//console.log(Object.keys(this.vertices.properties));
				//console.log(this.vertices.properties.edges.type);
				this.vertices.setProperty("id",vs);
				this.edges.setLength(es.length);
				this.edges.setProperty("source",es);
				this.edges.setProperty("target",et);
			}
			else throw Error("invalid edge source/target arrays");
		}
		else{
			//they may come with other properties; maybe even other objects?
			console.log("object style");
			this.vertices.loadObj(vs);
			this.edges.loadObj(es);
		}
		//update others
		//if(this.vertices.length>0&&this.vertices.edges.length==0){throw Error("at "+this.dataPath);}
		//DEBUG=false;
		this.updateAdjacency();
	}
	
	
	getSubgraphVertices(subgraph){
		let array=new Int32Array(subgraph.vertices.length);
		for(let i=0;i<subgraph.vertices.length;i++){
			let id=subgraph.vertices.id[i];
			let v=this.vertexMap[id];
			if(isNaN(v)){console.log(v,id,subgraph.vertices.id);throw Error();}
			array[i]=v;
		}
		return array;
	}
	projectVertexProperty(subgraph,name){//doesn't add the property to the subgraph
		if((!this.vertices.properties[name])){console.log(Object.keys(this.vertices.properties));throw Error("missing property "+name);};
		if(this.vertices.properties[name].isAbstract)throw Error("property "+name+" is abstract");
		let data=this.vertices[name];
		let array=makeArray(this.vertices.properties[name].type,subgraph.vertices.length);
		for(let i=0;i<subgraph.vertices.length;i++){
			let id=subgraph.vertices.id[i];
			let v=this.vertexMap[id];
			if(isNaN(v)){console.log(v,id,subgraph.vertices.id);throw Error();}
			if((v in data)==false)continue;
			array[i]=data[v];
		}
		return array;
	}
	projectEdgeProperty(subgraph,name){
		if((!this.edges.properties[name])||this.edges.properties[name].isAbstract)throw Error();
		let data=this.edges[name];
		let array=makeArray(this.edges.properties[name].type,subgraph.edges.length);
		for(let i=0;i<subgraph.edges.length;i++){
			let s=subgraph.edges.source[i],t=subgraph.edges.target[i];
			let sid=subgraph.vertices.id[s],tid=subgraph.vertices.id[t];
			let oldeid=this.getEdgeByID(sid,tid);
			if(isNaN(oldeid)){console.log(oldeid,s,t);throw Error();}
			if((oldeid in data)==false)continue;
			array[i]=data[oldeid];
		}
		return array;
	}
	loadVertexPropertyFromSets(name,sets){
		if(sets.sets)sets=sets.sets;
		this.vertices.addProperty(name,"int");
		let array=this.vertices[name];
		for(let i in sets){
			let ids=sets[i];
			let value=parseInt(i);
			for(let id of ids){
				array[this.vertexMap[id]]=value;
			}
		}
	}
	edgePropertyFromVertexProperty(name,func,type="int"){
		if(!func)func=Math.min;
		if(!this.vertices[name]){
			console.log(this.vertices[name]);
			console.log(Object.keys(this.vertices.properties[name]));
			throw Error("no such property "+name+", it only has "+Object.keys(this.vertices.properties).join(","));
		}
		let data=this.vertices[name];
		let array=makeArray(type,this.edges.length);
		let sources=this.edges.source,targets=this.edges.target;
		for(let i=0;i<this.edges.length;i++){
			let s=sources[i],t=targets[i];
			let sData=data[s],tData=data[t];
			let eData=func(sData,tData);
			array[i]=eData;
		}
		return array;
	}
	vertexPropertyFromEdgeProperty(name,func,type="int",isolatedVertexValue=0){
		if(!func)func=Math.max;
		if(!this.edges[name]){
			console.log(this.edges[name]);
			console.log(Object.keys(this.edges.properties[name]));
			throw Error("no such property "+name+", it only has "+Object.keys(this.edges.properties).join(","));
		}
		let data=this.edges[name];
		let array=makeArray(type,this.vertices.length);
		let sources=this.edges.source,targets=this.edges.target;
		for(let i=0;i<this.vertices.length;i++){
			let value=isolatedVertexValue;
			for(let eID of this.getIncidentEdges(i)){
				let eData=data[eID];
				value=func(value,eData);
			}
			array[i]=value;
		}
		return array;
		
	}
	static unionGraphs(subgraphs,templates,subgraphIDPropertyName,subgraphIDPropertyType="int",subgraphIDFunc=((g)=>g.subgraphID)){//combine graphs and all their vertex/edge properties, and optionally create new properties on vertices/edges from subgraph IDs
		let graph=new Graph();
		let offsets=[];//each subview has an offset map per object type
		let vertexMap={};
		let IDMax=-Infinity,IDMin=Infinity;
		if(subgraphIDPropertyName){
			console.log("adding subgraphID property "+subgraphIDPropertyName+" of type "+subgraphIDPropertyType);
			graph.vertices.addProperty(subgraphIDPropertyName,subgraphIDPropertyType);
			graph.edges.addProperty(subgraphIDPropertyName,subgraphIDPropertyType);
		}
		for(let graphID=0;graphID<subgraphs.length;graphID++){
			offsets[graphID]={};
			let subgraph=subgraphs[graphID];//let g=subview.graph;graphMap.set(g,graphID);graphList.push(g);
			
			//first add vertcies
			
			let vertexOffset=graph.vertices.length;
			offsets[graphID].vertices=vertexOffset;
			let vertices=subgraph.vertices;//if(subData instanceof DataObject){subData=subData.getArray();}
			for(let propName in vertices.properties){
				
				if((propName in graph.vertices)==false){
					console.log("adding subgraph property "+propName+" of type"+vertices.properties[propName].type);
					graph.vertices.addProperty(propName,vertices.properties[propName].type);
					
				}
				else{
					console.log("already has subgraph property "+propName+" of type"+graph.vertices.properties[propName].type);
				}
			}
			let subgraphID=subgraphIDFunc(subgraph);
			if(subgraphID==undefined){
				console.log(subgraph.getSummary());
				throw Error("undefined subgraph ID at "+graphID+", "+subgraph.subgraphID);
			}
			IDMax=Math.max(IDMax,subgraphID);IDMin=Math.min(IDMin,subgraphID);
			for(let i=0;i<vertices.length;i++){
				let id=vertices.id[i];
				let index;
				if(id in vertexMap){
					index=vertexMap[id];
					if(subgraphIDPropertyName){//follow the maximum value
						if(subgraphID>graph.vertices[subgraphIDPropertyName][index])graph.vertices[subgraphIDPropertyName][index]=subgraphID;
					}
				}
				else{
					index=graph.addVertex(id);vertexMap[id]=index;
					for(let propName in vertices.properties){
						if(i in vertices[propName]){graph.vertices[propName][index]=vertices[propName][i];}
					}
					if(subgraphIDPropertyName){
						graph.vertices[subgraphIDPropertyName][index]=subgraphID;
					}
				}
			}
			
			//only vertices and edges for now
			offsets[graphID].edges=graph.edges.length;
			let edges=subgraph.edges;//if(subData instanceof DataObject){subData=subData.getArray();}
			graph.edges.append(edges,templates,offsets[graphID]);//will create missing properties; uses offsets for references
			
			//edge source/target must reference vertices
			for(let i=0;i<edges.length;i++){
				let sourceID=subgraph.vertices.id[edges.source[i]];
				let targetID=subgraph.vertices.id[edges.target[i]];
				graph.edges.source[i+offsets[graphID].edges]=vertexMap[sourceID];
				graph.edges.target[i+offsets[graphID].edges]=vertexMap[targetID];
				if(subgraphIDPropertyName){
					graph.edges[subgraphIDPropertyName][i+offsets[graphID].edges]=subgraphID;
				}
			}
			
			/*
			for(let name in subgraph.objects){//not all properties of subgraph is a relevant object
				if((templates)&&((!templates[name])||(!templates[name].properties)))continue;//not a template for a data object
				if(name=="vertices")continue;//not a template for a data object
				if(name in graph==false){//new kind of object - now I don't require all datasets to contain the same objects/properties?
					graph.addObject(name);
				}
				offsets[graphID][name]=graph[name].length;
				let subData=subgraph[name];//if(subData instanceof DataObject){subData=subData.getArray();}

				graph[name].append(subData,templates,offsets[graphID]);//will create missing properties; uses offsets for references
				if(name=="edges"){
					//edge source/target must reference vertices
					for(let i=0;i<subData.length;i++){
						let sourceID=subgraph.vertices.id[subData.source[i]];
						let targetID=subgraph.vertices.id[subData.target[i]];
						graph.edges.source[i+offsets[graphID].edges]=vertexMap[sourceID];
						graph.edges.target[i+offsets[graphID].edges]=vertexMap[targetID];
					}
				}
				
			}
			*/
		}
		graph.subgraphIDMax=IDMax;graph.subgraphIDMin=IDMin;
		graph.updateAdjacency();
		return {graph:graph,offsets:offsets};
	}
	
	isAbstract(){
		return !!(this.vertices.properties.id.isAbstract||this.edges.properties.source.isAbstract||this.edges.properties.target.isAbstract);
	}
	toEdgeList(options){
		if(typeof options=="function")options={filterFunc:options};
		if(typeof options=="boolean")options={originalIDs:options};
		if(!options)options={};
		let str="",i=0,first=true;let func=options.filterFunc,originalIDs=options.originalIDs;
		for(let i=0;i<this.edges.length;i++){
			if(func&&(!func(this.edges[i],i,this.edges,this)))continue;
			if(!first)str+="\n";
			if(originalIDs){str+=this.vertices.id[this.edges.source[i]]+" "+this.vertices.id[this.edges.target[i]];}
			else{str+=this.edges.source[i]+" "+this.edges.target[i];}
			first=false;
		}
		return str;
	}
	
	loadVertices(text,options){//for strings only. if it's an array, just set this.vertices and this.vertices.id and use updateGraph when needed
		var g=this;
		let crlf=text.indexOf("\r\n"),lineSeparator="\n";
		if(crlf>-1){lineSeparator="\r\n";}
		let vertexList=text.split(lineSeparator);
		
		//vertices can also come with properties -- before we only loaded edge text 
		let verticesPropertyDefs={};
		function getPropertyFunc(type){if(type=="int")return (x)=>parseInt(x);if(type=="float")return (x)=>parseFloat(x);return x=>x;}
		if(options&&options.verticesPropertyColumns){//avoid conflict with edges
			for(let columnIndex in options.verticesPropertyColumns){
				let def=options.verticesPropertyColumns[columnIndex];
				if(typeof def=="object"){
					let propertyType=def.type||"int",propertyFunction=def.func||getPropertyFunc(propertyType);verticesPropertyDefs[columnIndex]={name:def.name,owner:def.owner,type:propertyType,func:propertyFunction};
				}
				else if(typeof def=="string"){
					let names=def.split(",");
					if(names.length>1){verticesPropertyDefs[columnIndex]={name:names[1],owner:names[0],type:"int",func:(x)=>parseInt(x)};}
					else{verticesPropertyDefs[columnIndex]={name:names[0],owner:"vertices",type:"int",func:(x)=>parseInt(x)};}
				}
				def=verticesPropertyDefs[columnIndex];
				if(!this[def.owner][def.name])this[def.owner].addProperty(def.name,'int');
			}
			options.verticesPropertyDefs=verticesPropertyDefs;
		}
		let firstLine=true;
		let columnSeparator=",";
		vertexloop:for(let i=0;i<vertexList.length;i++){
			let line=vertexList[i].trim();
			if(firstLine){
				columnSeparator=",";
				if(line.indexOf(columnSeparator)==-1){columnSeparator="\t";}
				if(line.indexOf(columnSeparator)==-1){columnSeparator=" ";}
				if(line.indexOf(columnSeparator)==-1){
					//allow if there are no other columns defined
					if(options&&options.verticesPropertyDefs&&Object.keys(options.verticesPropertyDefs).length>0){
						throw Error("unknown vertex column separator in: "+line);
					}
					
				}
				firstLine=false;
			}
			
			let columns=line.split(columnSeparator).map((x)=>x.trim());
			
			//assuming id is the first row
			let id=columns[0];
			if(id.length==0)continue;
			//help for filtering - get columns before adding the vertex
			let tempObj={id:id};
			if(options&&options.verticesPropertyDefs){
				for(let columnIndex in options.verticesPropertyDefs){ 
					let def=options.verticesPropertyDefs[columnIndex];
					if(def.owner!="vertices")continue;
					let value=def.func(columns[columnIndex]);
					//this[def.owner][def.name][e]=value;
					tempObj[def.name]=value;
				}
			}
			
			if(options&&options.vertexFilters){
				//for filtering
				for(let filter of options.vertexFilters){
					if(!filter(tempObj)){continue vertexloop;}
				}
			}
			if(options&&options.ignoreUnknownVertices&&(!this.hasVertex(id))){continue;}
			
			let vid=this.addVertex(id);
			
			if(options&&options.verticesPropertyDefs){
				for(let columnIndex in options.verticesPropertyDefs){ 
					let def=options.verticesPropertyDefs[columnIndex];
					if(def.owner!="vertices")continue;
					let value=def.func(columns[columnIndex]);
					this[def.owner][def.name][vid]=value;
				}
			}
			
		}
	}
	
	loadEdges(text,options){//assuming it's an edge list with an optional title line with column names including source and target 
	//this doesn't worry about types because ids are assumed to be strings and weights are numeric
	//actally we skip weight for now
		let crlf=text.indexOf("\r\n"),lineSeparator="\n";
		if(crlf>-1){lineSeparator="\r\n";}
		let edgelistLines=text.split(lineSeparator);
		
		let propertyDefs={};
		function getPropertyFunc(type){if(type=="int")return (x)=>parseInt(x);if(type=="float")return (x)=>parseFloat(x);return x=>x;}
		if(options&&options.propertyColumns){
			for(let columnIndex in options.propertyColumns){
				let def=options.propertyColumns[columnIndex];
				if(typeof def=="object"){
					let propertyType=def.type||"int",propertyFunction=def.func||getPropertyFunc(propertyType);propertyDefs[columnIndex]={name:def.name,owner:def.owner,type:propertyType,func:propertyFunction};
				}
				else if(typeof def=="string"){
					let names=def.split(",");
					if(names.length>1){propertyDefs[columnIndex]={name:names[1],owner:names[0],type:"int",func:(x)=>parseInt(x)};}
					else{propertyDefs[columnIndex]={name:names[0],owner:"edges",type:"int",func:(x)=>parseInt(x)};}
				}
				def=propertyDefs[columnIndex];
				if(!this[def.owner][def.name])this[def.owner].addProperty(def.name,'int');
			}
			options.propertyDefs=propertyDefs;
		}
		
		for(let line of edgelistLines){this.loadEdgeLine(line,options);}//avoid repeating similar code
		return this;
	}
	
	loadEdgeLine(line,options){
		if(line[line.length-1]=="\r"){line=line.substring(0,line.length-1);this.warn("line "+this.lineNumber+": "+line,"\\r detected");}
		line=line.trim();
		if(!this.loadedLine){
			this.lineNumber=0;
			this.loadedLine=true;
			if((line[0]=="(")&&(line[line.length-1]==")")){this.removeParentheses=true;}
			
			let columnSeparator=",";
			if(line.indexOf(columnSeparator)==-1){columnSeparator="\t";}
			if(line.indexOf(columnSeparator)==-1){columnSeparator=" ";}
			if(line.indexOf(columnSeparator)==-1){throw Error("unknown column separator in: "+line);}//assuming they cannot appear in normal column values
			//test for first line column titles like source/target
			this.columnSeparator=columnSeparator;
			let temp=line;if(this.removeParentheses)temp=line.substring(1,line.length-1);//if there's no header, don't remove twice
			let titles=temp.split(columnSeparator);let hasSource=false,hasTarget=false,hasWeight=false;
			let sourceColumn=0,targetColumn=1,weightColumn=2;//default
			this.sourceColumn=0;this.targetColumn=1;this.weightColumn=undefined;//it's dangerous to assume the third column is weight if there are more than 3 unlabeled columns! or even when there are 3.
			//if(titles.length==3){this.weightColumn=2;this.warn(JSON.stringify(titles),"the 3rd column assumed to be weights");}
			for(let i in titles){
				if(titles[i].trim().toUpperCase()=="SOURCE"){hasSource=true;sourceColumn=i;}
				if(titles[i].trim().toUpperCase()=="TARGET"){hasTarget=true;targetColumn=i;}
				//if(titles[i].trim().toUpperCase()=="WEIGHT"){weightColumn=i;hasWeight=true;}
			}
			if(hasSource&&hasTarget){
				this.sourceColumn=sourceColumn;this.targetColumn=targetColumn;
				//if(hasWeight)this.weightColumn=weightColumn;else{this.weightColumn=undefined;}
				return;
			}//if the title has s/t but no weight then we shouldn't assume the third column is weight
		}
		//fall back on regular line processing if it's not a header line
		let temp=line;
		if(this.removeParentheses){temp=line.substring(1,line.length-1);}
		this.lineNumber++;
		
		let columns=temp.split(this.columnSeparator);
		if(columns.length<2){this.warn("line "+this.lineNumber+": "+columns.map(d=>d.substring(0,200))+" original line: "+line,"ill-formatted line with not enough columns");return;}
		if(columns[this.sourceColumn]==undefined){throw Error("Graph "+this.name+" line "+this.lineNumber+" error: ill-formatted line with no source: "+columns.map(d=>d.substring(0,200))+" original line: "+line+", source column:"+this.sourceColumn);return;}
		if(columns[this.targetColumn]==undefined){throw Error("Graph "+this.name+" line "+this.lineNumber+" error: ill-formatted line with no target: "+columns.map(d=>d.substring(0,200))+" original line: "+line+", target column:"+this.targetColumn);return;}
		let s=columns[this.sourceColumn].trim();
		let t=columns[this.targetColumn].trim();
		
		//let e=this.addEdge(s,t);
		let e;
		//if(options.byIndices)e=g.addEdgeByIndices(Number(s),Number(t));
		
		//help for filtering - get columns before adding the edge
		let tempObj={source:s,target:t};
		if(options&&options.propertyDefs){
			for(let columnIndex in options.propertyDefs){ 
				let def=options.propertyDefs[columnIndex];
				if(def.owner!="edges")continue;
				let value=def.func(columns[columnIndex]);
				//this[def.owner][def.name][e]=value;
				tempObj[def.name]=value;
			}
		}
		
		if(options&&options.filters){
			//for filtering
			for(let filter of options.filters){
				if(!filter(tempObj)){return;}
			}
		}
		
		
		
		e=this.addEdge(s,t,options);
		
		if(options&&options.propertyDefs){
			for(let columnIndex in options.propertyDefs){ 
				let def=options.propertyDefs[columnIndex];
				if(def.owner!="edges")continue;
				let value=def.func(columns[columnIndex]);
				this[def.owner][def.name][e]=value;
			}
		}
		
		return e;
		//if((this.weightColumn!==undefined)&&(columns[this.weightColumn]!==undefined)){e[weightName]=Number(columns[this.weightColumn].trim());}
	}
	
	getSummary(){
		let summary=super.getSummary();
		for(let name of graphSummaryProperties){//copy all others
			if((name in this)==false)continue;
			summary[name]=this[name];
		}
		return summary;
	}
	loadSummary(summary){
		super.loadSummary(summary);
		for(let name of graphSummaryProperties){//copy all others
			if((name in summary)==false)continue;
			if(name=="objects")continue;
			this[name]=summary[name];
		}
	}
	loadAll(data){
		super.loadAll(data);
		this.updateAdjacency();
		for(let name of graphSummaryProperties){//copy all others
			if((name in data)==false)continue;
			if(name=="objects")continue;
			this[name]=data[name];
		}
		
	}
	warn(str,reason){
		if(!(reason in this.warningReasons)){this.warningReasons[reason]=0;}//do not repeatedly warn for predictable reasons
		this.warningReasons[reason]++;this.warningCount++;
		if(this.warningReasons[reason]>this.repeatedWarningLimit){return;}
		else{
			console.log((this.name?(this.name+": "):"warning: ")+reason+" - "+str);
			if(this.warningReasons[reason]==this.repeatedWarningLimit){console.log("(will not show more similar warnings)");}
		}
	}
	log(str){
		console.log(this.name+" - "+str);
	}
	
}


class UnionGraph extends Graph{
	constructor(subgraphs){
		this.objects={};
		this.subgraphs=subgraphs;
	}
	//assumptions: vertices may be shared but edges are not shared.
	//in this graph, there's no global adjacency map, instead to get edges we need to iterate over all subgraphs?? Or is it too slow? 
	//if we have a global adjacency, adding/removing subgraphs can get slow. But it may be better than slowing down all accesses.
	//main problem: there could be a lot more subgraphs and most of them may have no relevant info about a vertex and its edges.
	//map of vertices to subgraphs that has it, instead of map of edges of a vertex globally?
	//add/remove subgraphs will sill modify this map for each vertex, but it should be less bad than modifying huge adjacency maps.
	
	hasVertex(id){return (id in this.vertexMap);}
	getVertexByID(id){
		if(this.hasVertex(id)){return this.vertexMap[id];}
		else throw Error("Graph "+this.name+" error: no such vertex "+id);
	}
	getNeighborsByID(id){return Object.keys(this.vertices.edges[this.vertexMap[id]]);}
	getNeighborIDsByID(id){return Object.keys(this.vertices.edges[this.vertexMap[id]]).map((i)=>this.vertexMap[i]);}
	getNeighbors(index){return Object.keys(this.vertices.edges[index]);}
	getIncidentEdges(index){return Object.values(this.vertices.edges[index]);}
	getAdjacencyMap(index){return this.vertices.edges[index];}
	
	
	hasEdgeByID(source,target){
		return this.vertexMap[b] in this.vertices.edges[this.vertexMap[a]];
	}
	hasEdge(source,target){
		return b in this.vertices.edges[a];
	}
	adjacentByID(a,b){return this.vertexMap[b] in this.vertices.edges[this.vertexMap[a]];}
	adjacent(a,b){return b in this.vertices.edges[a];}
	
	getEdgeByID(source,target){
		return this.vertices.edges[this.vertexMap[source]][this.vertexMap[target]];
	}
	getEdge(source,target){
		return this.vertices.edges[source][target];
	}
	
	addVertex(id){//by ID - there's no not-by-ID version of the adding functions
		if(id===undefined){throw Error();}
		if(this.vertices.length==0&&(this.warnAboutUnknownVertex===undefined)){this.warnAboutUnknownVertex=true;}//if the first vertex is created explicitly, warn about implicit ones
		if(typeof id=="number")id=id.toString();
		if(this.hasVertex(id)){
			this.warn(id,"repeated vertex");return this.getVertexByID(id);
		}
		let index=this.vertices.addObject();this.vertices.id[index]=id;this.vertexMap[id]=index;
		this.vertices.edges[index]={};
		return index;
	}
	
	addEdge(source,target,options){
		if(typeof source=="number")source=source.toString();if(typeof target=="number")target=target.toString();
		if(this.vertices.length==0&&(this.warnAboutUnknownVertex===undefined))this.warnAboutUnknownVertex=false;//edges before vertices, probably normal
		if(this.hasVertex(source)==false){
			if(this.warnAboutUnknownVertex){this.warn(source,"created unknown vertex");}
			let index=this.addVertex(source);
			if(options.vertices){
				options.vertices(index,this);
			}
		}//only need warning if this graph has created vertices in another way so it's likely that this is unintended
		if(this.hasVertex(target)==false){
			if(this.warnAboutUnknownVertex){this.warn(source,"created unknown vertex");}
			let index=this.addVertex(target);
			if(options.vertices){options.vertices(index,this);}
		}
		let si=this.getVertexByID(source),ti=this.getVertexByID(target);//here getX means getting the index
		if(source==target){this.warn(source,"self loop");return;}
		if(this.adjacentByID(source,target)){this.warn(source+", "+target,"repeated edge");return this.getEdgeByID(source,target);}
		let index=this.edges.addObject();
		this.edges.source[index]=si;this.edges.target[index]=ti;
		this.vertices.edges[si][ti]=index;this.vertices.edges[ti][si]=index;
		if(options.edges){
			options.edges(index,this);
		}
		return index;
	}
	//I think we should always load V and E together and not have to explicitlly update adjacency
	updateAdjacency(){//updates vertexMap and vertices.edges, for when edges are changed by other ways like loading
		this.vertices.setProperty("edges",()=>({}));this.vertexMap={};
		for(let i=0;i<this.vertices.length;i++){this.vertexMap[this.vertices.id[i]]=i;}
		for(let i=0;i<this.edges.length;i++){
			let s=this.edges.source[i],t=this.edges.target[i];
			if(!this.vertices.edges[s])throw Error("invalid source vertex index "+s);
			if(!this.vertices.edges[t])throw Error("invalid target vertex index "+t);
			this.vertices.edges[s][t]=i;this.vertices.edges[t][s]=i;
		}
	}
	
	loadVerticesAndEdges(vs,es,et){
		//style 1: vs and es can represent data objects with properties
		//style 2: vs,es,et are arrays representing vIDs, edge Sources,edge Targets
		if(Array.isArray(vs)){
			//use the array style. vIDs shouldn't be a typed array because IDs are usually strings
			if(isArrayLike(es)&&isArrayLike(et)){
				//console.log("array style");DEBUG=true;
				this.vertices.setLength(vs.length);
				
				//console.log(vs.length+", "+this.vertices.length+", "+this.vertices.edges.length);
				//console.log(Object.keys(this.vertices.properties));
				//console.log(this.vertices.properties.edges.type);
				this.vertices.setProperty("id",vs);
				this.edges.setLength(es.length);
				this.edges.setProperty("source",es);
				this.edges.setProperty("target",et);
			}
			else throw Error("invalid edge source/target arrays");
		}
		else{
			//they may come with other properties; maybe even other objects?
			console.log("object style");
			this.vertices.loadObj(vs);
			this.edges.loadObj(es);
		}
		//update others
		//if(this.vertices.length>0&&this.vertices.edges.length==0){throw Error("at "+this.dataPath);}
		//DEBUG=false;
		this.updateAdjacency();
	}
	
	
	getSubgraphVertices(subgraph){
		let array=new Int32Array(subgraph.vertices.length);
		for(let i=0;i<subgraph.vertices.length;i++){
			let id=subgraph.vertices.id[i];
			let v=this.vertexMap[id];
			if(isNaN(v)){console.log(v,id,subgraph.vertices.id);throw Error();}
			array[i]=v;
		}
		return array;
	}
	projectVertexProperty(subgraph,name){//doesn't add the property to the subgraph
		if((!this.vertices.properties[name])){console.log(Object.keys(this.vertices.properties));throw Error("missing property "+name);};
		if(this.vertices.properties[name].isAbstract)throw Error("property "+name+" is abstract");
		let data=this.vertices[name];
		let array=makeArray(this.vertices.properties[name].type,subgraph.vertices.length);
		for(let i=0;i<subgraph.vertices.length;i++){
			let id=subgraph.vertices.id[i];
			let v=this.vertexMap[id];
			if(isNaN(v)){console.log(v,id,subgraph.vertices.id);throw Error();}
			if((v in data)==false)continue;
			array[i]=data[v];
		}
		return array;
	}
	projectEdgeProperty(subgraph,name){
		if((!this.edges.properties[name])||this.edges.properties[name].isAbstract)throw Error();
		let data=this.edges[name];
		let array=makeArray(this.edges.properties[name].type,subgraph.edges.length);
		for(let i=0;i<subgraph.edges.length;i++){
			let s=subgraph.edges.source[i],t=subgraph.edges.target[i];
			let sid=subgraph.vertices.id[s],tid=subgraph.vertices.id[t];
			let oldeid=this.getEdgeByID(sid,tid);
			if(isNaN(oldeid)){console.log(oldeid,s,t);throw Error();}
			if((oldeid in data)==false)continue;
			array[i]=data[oldeid];
		}
		return array;
	}
	edgePropertyFromVertexProperty(name,func,type="int"){
		if(!func)func=Math.min;
		if(!this.vertices[name]){
			console.log(this.vertices[name]);
			console.log(Object.keys(this.vertices.properties[name]));
			throw Error("no such property "+name+", it only has "+Object.keys(this.vertices.properties).join(","));
		}
		let data=this.vertices[name];
		let array=makeArray(type,this.edges.length);
		let sources=this.edges.source,targets=this.edges.target;
		for(let i=0;i<this.edges.length;i++){
			let s=sources[i],t=targets[i];
			let sData=data[s],tData=data[t];
			let eData=func(sData,tData);
			array[i]=eData;
		}
		return array;
	}
}


function compareBy(f,bigFirst) {
	if(typeof f!="function"){
		let p=f;
		f=(x)=>x[p];
	}
	if(bigFirst){
		return function(a,b){
			let fa=f(a),fb=f(b);
			if (fa < fb)
				return -1;
			if (fa > fb)
				return 1;
			return 0;
		}
	}
	else{
		
		return function(a,b){
			let fa=f(a),fb=f(b);
			if (fa > fb)
				return -1;
			if (fa < fb)
				return 1;
			return 0;
		}
	
	}
	
}


function addHiddenProperty(obj,key,value){
	Object.defineProperty(obj, key, {
	  enumerable: false,
	  configurable: true,//need to be able to delete them!
	  writable: true,
	  value: value
	});
}
let typedArrayTypeList=[Float32Array,Float64Array,Int32Array,Int16Array,Int8Array,Uint32Array,Uint16Array,Uint8Array];
function getTypedArrayType(typeName){
	switch(typeName){
		case "float":
		case "float32": return Float32Array;
		case "float64": return Float64Array;
		case "int": 
		case "integer": 
		case "int32": return Int32Array;
		case "int16": return Int16Array;
		case "int8": return Int8Array;
		case "uint":
		case "uint32": return Uint32Array;
		case "uint16": return Uint16Array;
		case "uint8": return Uint8Array;
		default:throw Error("unknown typed array type "+typeName);
	}
}
function isArrayLike(obj){
	if(!obj)return false;
	if((typeof obj)!="object")return false;
	if(Array.isArray)return true;
	for(type of typedArrayTypeList){
		if(obj instanceof type)return true;
	}
	return false;
}
function nextPowerOf2(num){
	if(!num)return 2;
	return Math.pow(2,Math.ceil(Math.log(num)/Math.log(2)));
}
function addHiddenProperty(obj,key,value){
	Object.defineProperty(obj, key, {
	  enumerable: false,
	  configurable: true,//need to be able to delete them!
	  writable: true,
	  value: value
	});
}
function makeArray(type,length){
	if(type==undefined){return new Array(length);}
	else if (type=="sparse"){return {};}
	else{
		let func=getTypedArrayType(type);
		return new func(length); //does not use the next power of 2 because this is supposed to be temporary space
	}
}
let testGraph=new Graph();for(let i=0;i<80;i++){testGraph.addVertex(i);}for(let i=0;i<50;i++){testGraph.addEdge(i,i+1);}for(let i=0;i<20;i++){testGraph.addEdge(i,i+2);}for(let i=0;i<10;i++){testGraph.addEdge(i,i+3);} for(let i=60;i<70;i++){testGraph.addEdge(i,i+1);}
Graph.testGraph=testGraph;

Graph.DataProperty=DataProperty;
Graph.DataObject=DataObject;
Graph.DataSet=DataSet;

if((typeof module !="undefined")&& (typeof module.exports=="object")){
	module.exports=Graph;
}