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

if((typeof module !="undefined")&& (typeof module.exports=="object")){
	module.exports=DataSet;
}