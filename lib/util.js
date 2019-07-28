window.addEventListener("load", function(){
	document.body.onselectstart = function(e) { if (e.target.nodeName != "INPUT" && e.target.nodeName != "TEXTAREA") { e.preventDefault(); return false; } return true; }
	document.ontouchmove = function(e){if(e.target.nodeName != "DIV" && e.target.nodeName != "P" && e.touches.length>1) { e.preventDefault(); return false; } return true;}
});
//deal with touch screens
function shortStr(num){
	let n=Number(num);
	return String(n).substring(0,5);
}

function mod(x,y){
	return x-y*Math.floor(x/y);
}

function getE(str){return document.getElementById(str);}
function selectE(str){return d3.select(document.getElementById(str));}


function copyObj(obj){return JSON.parse(JSON.stringify(obj));}


function randomIntBetween(a,b){return Math.floor(Math.random()*(b-a)+a);}//>=a, <b
function clamp(x,min,max){return Math.min(Math.max(x,min),max);}
function shuffle(array) {
	var currentIndex = array.length, temporaryValue, randomIndex;
	while (0 !== currentIndex) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}
	return array;
}
function pathToText(str){//un-Camel case
	str=String(str).replaceAll("/"," ");
	str=str.replaceAll("wave2","wave");
	str=str.replaceAll("wave","\nwave");
	//str=str.replaceAll("layer","fixed point");
	str= str.replace(/(?<=[a-z])([A-Z/]+)/g, ' $1').replace("_"," ").replace(/^./, function(str){ return str.toUpperCase(); });
	
	return str;
}
function toNormalText(str){//un-Camel case
	str=String(str);
	return str.replace(/(?<=[a-z])([A-Z/]+)/g, ' $1').replace("_"," ").replace(/^./, function(str){ return str.toUpperCase(); });
}
function toLowerCaseNormalText(str){//un-Camel case
	str=String(str);
	return str.replace(/(?<=[a-z])([A-Z]+)/g, ' $1').replace("_"," ").toLowerCase();
}
function toSingularName(str){
	if(str.length==0)return "";
	if(str[str.length-1]=="s")return str.substring(0,str.length-1);
	else return str;
}


var v1=new THREE.Vector3(),v2=new THREE.Vector3(),v3=new THREE.Vector3(),v4=new THREE.Vector3();
v1.x=1;v1.y=1; //s+sideways
v2.x=1;v2.y=-1;//s-sideways
v3.x=-1;v3.y=1;//t+sideways
v4.x=-1;v4.y=-1;//t+sideways
var quadCoordVectors=[v1,v2,v3,v2,v4,v3];
var quadCoordFunc=(d,i)=>quadCoordVectors;



function addHiddenProperty(obj,key,value){
	Object.defineProperty(obj, key, {
	  enumerable: false,
	  configurable: true,//need to be able to delete them!
	  writable: true,
	  value: value
	});
}
function assignHiddenProperties(obj,obj2){
	for(let key in obj2){
		Object.defineProperty(obj, key, {
		  enumerable: false,
		  configurable: true,
		  writable: true,
		  value: obj2[key]
		});
	}
	
}

	
	
function downloadObject(Obj,name)
{
	var data=[];var properties = {type: 'plain/text'}; // Specify the file's mime-type.
	data.push(JSON.stringify(Obj));
	var pom = document.createElement('a');
		pom.setAttribute('download', name+".json");//added prefix for sorting files by name; mist means custom generated property while oeis means original data, file means some kind of global data not belonging to any sequence
		var file = new File(data, "file.txt", properties);
		var url = URL.createObjectURL(file);
		pom.href = url;
		if (document.createEvent) {
			var event = document.createEvent('MouseEvents');
			event.initEvent('click', true, true);
			pom.dispatchEvent(event);
			}
			else {
				pom.click();
			}
}
function downloadString(str,name)
{
	var data=[];var properties = {type: 'plain/text'}; // Specify the file's mime-type.
	data.push(str);
	var pom = document.createElement('a');
		pom.setAttribute('download', name+".txt");//added prefix for sorting files by name; mist means custom generated property while oeis means original data, file means some kind of global data not belonging to any sequence
		var file = new File(data, "file.txt", properties);
		var url = URL.createObjectURL(file);
		pom.href = url;
		if (document.createEvent) {
			var event = document.createEvent('MouseEvents');
			event.initEvent('click', true, true);
			pom.dispatchEvent(event);
			}
			else {
				pom.click();
			}
}
function downloadCanvas(canvas,name="test"){
	var pom = document.createElement('a');
	pom.setAttribute('download', name+".png");
	pom.setAttribute("href", image);
	var image =canvas.toDataURL("image/png")
				//.replace("image/png", "image/octet-stream");
	pom.setAttribute("href", image);
	if (document.createEvent) {
		var event = document.createEvent('MouseEvents');
		event.initEvent('click', true, true);
		pom.dispatchEvent(event);
	}
	else {
		pom.click();
	}
}
function tocsv(data,fields){
	var result="";var line="";
	var f;
	for(var j in fields){
		f=fields[j];
		if(typeof f =="object"){
			result+=f.name+",";
		}
		else{result+=f+",";}
	}
	result=result.substr(0,result.length-1)+"\n";
	for(var i in data){
		var d=data[i];line="";
		for(var j in fields){
			var f=fields[j],func;
			if(typeof f =="object"){
				func=f.fun;f=f.name;
				line+=(func(d))+",";
			}
			else{
				line+=((f in d)?d[f]:"")+",";
			}
			
		}
		line=line.substr(0,line.length-1);
		result+=line+"\n";
	}
	return result;
}







function calculateDistribution(objs,prop){
	var counts = {};
	var cumulative = {};
	var max = -Infinity;
	for (var i in objs) {
		var d = objs[i][prop];
		if (!(d in counts))
			counts[d] = 0;
		counts[d] += 1;
		if (max < d)
			max = d;
	}
}


let zero=new THREE.Vector3();
function setLinkVectorAttr(array,offset,s,t,h)
{
	if(!h)h=zero;
	array[ offset + 0 ] = s.x+h.x;
	array[ offset + 1 ] = s.y+h.y;
	array[ offset + 2 ] = s.z+h.z;
	array[ offset + 3 ] = s.x-h.x;
	array[ offset + 4 ] = s.y-h.y;
	array[ offset + 5 ] = s.z-h.z;
	array[ offset + 6 ] = t.x+h.x;
	array[ offset + 7 ] = t.y+h.y;
	array[ offset + 8 ] = t.z+h.z;
	
	array[ offset + 9 ] = s.x-h.x;
	array[ offset + 10 ] = s.y-h.y;
	array[ offset + 11 ] = s.z-h.z;
	array[ offset + 12 ] = t.x-h.x;
	array[ offset + 13 ] = t.y-h.y;
	array[ offset + 14 ] = t.z-h.z;
	array[ offset + 15 ] = t.x+h.x;
	array[ offset + 16 ] = t.y+h.y;
	array[ offset + 17 ] = t.z+h.z;
}
function setLinkColorAttr(array,offset,s,t,m,ratio)
{
	let l=ratio,r =1-ratio;
	array[ offset + 0 ] = s.r*r+m.r*l;
	array[ offset + 1 ] = s.g*r+m.g*l;
	array[ offset + 2 ] = s.b*r+m.b*l;
	array[ offset + 3 ] = s.r*r+m.r*l;
	array[ offset + 4 ] = s.g*r+m.g*l;
	array[ offset + 5 ] = s.b*r+m.b*l;
	array[ offset + 6 ] = t.r*r+m.r*l;
	array[ offset + 7 ] = t.g*r+m.g*l;
	array[ offset + 8 ] = t.b*r+m.b*l;
	
	array[ offset + 9 ] = s.r*r+m.r*l;
	array[ offset + 10 ] = s.g*r+m.g*l;
	array[ offset + 11 ] = s.b*r+m.b*l;
	array[ offset + 12 ] = t.r*r+m.r*l;
	array[ offset + 13 ] = t.g*r+m.g*l;
	array[ offset + 14 ] = t.b*r+m.b*l;
	array[ offset + 15 ] = t.r*r+m.r*l;
	array[ offset + 16 ] = t.g*r+m.g*l;
	array[ offset + 17 ] = t.b*r+m.b*l;
}
function setLinkAttr(array,offset,v)
{
	array[ offset + 0 ] = v;
	array[ offset + 1 ] = v;
	array[ offset + 2 ] =v;
	array[ offset + 3 ] = v;
	array[ offset + 4 ] = v;
	array[ offset + 5 ] = v;
	
}




function checkNumber(num){if((num===undefined)||(isNaN(num)))throw Error("invalid number "+num);}

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
function distinctValues(array,comparator,smallFirst=false){
	if(!comparator)comparator=compareBy((x)=>x);
	let temp=Array.from(array);let result=temp.sort(comparator).filter((num,i,temp)=>(i==0)||(num!=temp[i-1]));
	if(!smallFirst)return result;
	else return result.reverse();
}

//get most frequent item - https://stackoverflow.com/questions/1053843/get-the-element-with-the-highest-occurrence-in-an-array
const mode = (myArray) =>
  myArray.reduce(
    (a,b,i,arr)=>
     (arr.filter(v=>v===a).length>=arr.filter(v=>v===b).length?a:b),
    null)
	
function splitArray(array,func,smallFirst=false,comparator){//sorts and splits an array, into possibly multiple arrays, by the distinct return value of func (called on the smaller array using map() ), using the comparator if given - the comparator can be used to both specify the sorting method, and to specify some values should be grouped together by returning 0.
	if(!comparator)comparator=compareBy((x)=>x);//compareBy is big ones first by default
	let values=array.map(func);
	let indices=array.map((d,i)=>i);
	let sortedIndices=indices.sort((a,b)=>comparator(values[a],values[b]));//.filter((num,i,temp)=>(i==0)||(num!=temp[i-1]));
	let results=[];let currentResult=[];
	for(let index=0;index<sortedIndices.length;index++){
		let realIndex=sortedIndices[index];
		if(index==0){
			currentResult.push(realIndex);
		}
		else{
			let realIndexPrev=sortedIndices[index-1];
			if(!!comparator(values[realIndex],values[realIndexPrev])){results.push(currentResult);currentResult=[];}//if they are different start a new array
			currentResult.push(realIndex);
		}
	}
	if(currentResult.length>0)results.push(currentResult);
	let finalResults=[];
	for(let list of results){
		finalResults.push(list.map((index)=>array[index]));
	}
	if(smallFirst)finalResults.reverse();
	return finalResults;
}
function splitArraysInPlace(arrays,func,smallFirst=false,comparator){
	if(!comparator)comparator=compareBy((x)=>x);
	let newlist=[];//don't disrupt the old array of arrays while we work on it
	for(let array of arrays){//don't change the relative order of existing arrays
		let result=splitArray(array,func,smallFirst,comparator);
		newlist=newlist.concat(result);
	}
	return newlist;
	
}
function bucketizeArray(array,func,bucketSize){
	//divide items in an array, in order, into groups of total size (as given by func per item) at most bucketSize; if an item is larger than that, it flushes previous items and a single bucket is created for it anyway.
	let results=[];let currentBucket=[];let total=0;
	for(let i=0;i<array.length;i++){
		let item=array[i],size=func(item,i,array);
		if(size>=bucketSize){if(currentBucket.length>0){addHiddenProperty(currentBucket,"totalSize",total);results.push(currentBucket);}let temp=[item];addHiddenProperty(temp,"totalSize",size);results.push(temp);currentBucket=[];total=0;continue;}
		else{
			if(total+size>=bucketSize){addHiddenProperty(currentBucket,"totalSize",total);results.push(currentBucket);currentBucket=[];total=0;}
			currentBucket.push(item);total+=size;
		}
	}
	if(currentBucket.length>0){addHiddenProperty(currentBucket,"totalSize",total);results.push(currentBucket);}
	return results;
}

function arrayToMap(arr){
	let result={};
	for(let item of arr){result[item]=true;}
	return result;
}

function propertyExists(list,name,checkAll){
	for(let i=0;i<list.length;i++){
		let o=list[i];
		if(o[name]!==undefined){if(!checkAll)return true;}
		else{if(checkAll)return false;}
	}
	return false;
}

function maxPropertyValue(list,name){
	let max=-Infinity;
	if(name in list){//new array style
		let arr=list[name];
		for(let i=0;i<arr.length;i++){
			let value=arr[i];
			if(!isNaN(value)){
				if(Number(value)>max){max=Number(value);}
			}
		}
	}
	else{//old style
		for(let i=0;i<list.length;i++){
			let o=list[i];if(!o)continue;
			if(!isNaN(o[name])){
				if(Number(o[name])>max){max=Number(o[name]);}
			}
		}

	}
	return max;
}

function arrayMax(array){
	let max=-Infinity;
	for(let v of array){if(v>max)max=v;}
	return max;
}
function arrayMin(array){
	let min=Infinity;
	for(let v of array){if(v<min)min=v;}
	return min;
}

function minPropertyValue(list,name){
	let min=Infinity;
	if(name in list){//new array style
		let arr=list[name];
		for(let i=0;i<arr.length;i++){
			let value=arr[i];
			if(!isNaN(value)){
				if(Number(value)<min){min=Number(value);}
			}
		}
	}
	else{//old style
		for(let i=0;i<list.length;i++){
			let o=list[i];if(!o)continue;
			if(!isNaN(o[name])){
				if(Number(o[name])<min){min=Number(o[name]);}
			}
		}

	}
	return min;
}

function renameProperty(list,oldName,newName,propertyStyle=false){
	if(propertyStyle){
		for(let i=0;i<list.length;i++){
			let o=list[i];
			if(o[oldName]!==undefined){o[newName]=o[oldName];delete o[oldName];}
		}
	}
	else{
		let newlist=new Array(list.length);addHiddenProperty(list,newName,newlist);
		for(let i=0;i<list.length;i++){
			let o=list[i];
			if(o[oldName]!==undefined){newlist[i]=o[oldName];delete o[oldName];}
		}

	}
	/**/
}

function convertProperty(list,name){//to array style
	let newlist=new Array(list.length);addHiddenProperty(list,name,newlist);
	for(let i=0;i<list.length;i++){
		let o=list[i];
		if(o[name]!==undefined){newlist[i]=o[name];delete o[name];}
	}
	/*for(let i=0;i<list.length;i++){
		let o=list[i];
		if(o[oldName]!==undefined){o[newName]=o[oldName];delete o[oldName];}
	}*/
}

function setProperty(list,name,func,propertyStyle=false){
	if(propertyStyle){
		for(let i=0;i<list.length;i++){
			let o=list[i];let result=func(o,i);
			if(result===undefined)throw Error("undefined for "+name);
			if(typeof result=="number" && isNaN(result))throw Error("NaN for "+name);
			o[name]=result;
		}
	}
	else{
		let newlist=new Array(list.length);addHiddenProperty(list,name,newlist);
		for(let i=0;i<list.length;i++){
			let o=list[i];let result=func(o,i,list);
			if(result===undefined)throw Error("undefined for "+name);
			if(typeof result=="number" && isNaN(result))throw Error("NaN for "+name);
			newlist[i]=result;
		}

	}
}

function setPropertyValue(list,name,value,propertyStyle=false){
	if(propertyStyle){
		for(let i=0;i<list.length;i++){
			list[i][name]=value;
		}
	}
	else{
		let newlist=new Array(list.length);addHiddenProperty(list,name,newlist);
		for(let i=0;i<list.length;i++){
			newlist[i]=value;
		}
	}
}
function deleteProperty(list,name){
	for(let i=0;i<list.length;i++){
		delete list[i][name];
	}
}

function setProperties(list,defs){
	for(let name in defs){
		if(typeof defs[name]=="function"){setProperty(list,name,defs[name]);}
		else if (typeof defs[name]=="number"){setPropertyValue(list,name,defs[name]);}
		else if (typeof defs[name]=="string"){setPropertyValue(list,name,defs[name]);}
		//else if (typeof defs[name].func=="function"){setProperty(list,name,defs[name].func);}
		else throw Error("unknown definition for "+name);
	}
}

function applyRulesOnProperty(list,name,rules,ruleData,originalData){
	if(Array.isArray(list)){
		for(let i=0;i<list.length;i++){
			let obj=list[i];
			let value=obj[name],temp;
			if(list[name]){value=list[name][i];}
			for(let rule of rules){
				temp=rule(ruleData,value,obj,i,list,originalData);
				if(temp!==undefined)value=temp;//don't set if nothing is returned
			}
			if(list[name]){list[name][i]=value;}
			else{obj[name]=value;}
			
		}
	}
	else if(list instanceof DataObject){
		for(let i=0;i<list.length;i++){
			let obj=null;//list[i];
			let value=list[name][i],temp;
			for(let rule of rules){
				temp=rule(ruleData,value,obj,i,list,originalData);
				if(temp!==undefined)value=temp;//don't set if nothing is returned
			}
			list[name][i]=value;
		}
	}
	else throw Error();
}

//let scaleOptions=["minUnscaled","maxUnscaled","minScaled","maxScaled","minAvg","maxAvg","targetAvg","targetMax","targetMin"];
function scaleArray(list,options)
{
	let total=0,count=isArrayLike(list)?list.length:Object.keys(list).length;
	if(count==0)return;
	//options:
	let minUnscaled=-Infinity,maxUnscaled=Infinity,minScaled=-Infinity,maxScaled=Infinity,minAvg=-Infinity,maxAvg=Infinity,targetAvg=undefined;
	if(typeof options=="number"){targetAvg=options;checkNumber(targetAvg);}
	else if (typeof options=="object"){
		if("minUnscaled" in options){minUnscaled=options.minUnscaled;checkNumber(minUnscaled);}
		if("maxUnscaled" in options){maxUnscaled=options.maxUnscaled;checkNumber(maxUnscaled);}
		if("minScaled" in options){minScaled=options.minScaled;checkNumber(minScaled);}
		if("maxScaled" in options){maxScaled=options.maxScaled;checkNumber(maxScaled);}
		if("minAvg" in options){minAvg=options.minAvg;checkNumber(minAvg);}
		if("maxAvg" in options){maxAvg=options.maxAvg;checkNumber(maxAvg);}
		if("targetAvg" in options){targetAvg=options.targetAvg;checkNumber(targetAvg);}
		if("targetMax" in options){targetMax=options.targetMax;checkNumber(targetMax);}
		if("targetMin" in options){targetMin=options.targetMin;checkNumber(targetMin);}
	}
	if(isArrayLike(list)){
		for(let i=0;i<list.length;i++){
			let result=list[i];
			if(result<minUnscaled){result=minUnscaled;}
			if(result>maxUnscaled){result=maxUnscaled;}
			if(isNaN(result))throw Error("NaN in stats");
			if(result==0)count--;
			else total+=result;
		}
	}
	else for(let i in list){
		let result=list[i];
		if(result<minUnscaled){result=minUnscaled;}
		if(result>maxUnscaled){result=maxUnscaled;}
		if(isNaN(result))throw Error("NaN in stats");
		if(result==0)count--;
		else total+=result;
	}
	if(count==0)return;
	//tets: do not include 0 items in average calculations, or they will skew teh average too much (such as for styles, when we use 0 to hide some items but have a hard limit on maximum, too many 0s will scale everything else to teh maximum.)
	let avg=total/count;
	//console.log(name+": "+avg+(options?(", scaling: "+JSON.stringify(options)):""));
	if(isNaN(avg))throw Error("NaN in stats");
	if(avg==0){console.log("warning: avg is 0 for "+name);}
	//todo: should we consider the total, not just the average? How about variance? I suspect for link strength, controlling the total of some function (eg square or sqrt of strength) is more important
	if(targetAvg){
		let r=(avg==0)?1:(targetAvg/avg);//for avg 0, keep whatever values they have
		for(let i in list){
			if(list[i]==0)continue;//min/max don't apply to 0 items?
			let result=list[i]*r;
			if(result<minScaled){result=minScaled;}
			if(result>maxScaled){result=maxScaled;}
			list[i]=result;
			if(isNaN(result))throw Error("NaN in stats");
		}
	}
	else{
		if(avg>maxAvg){
			let r=(avg==0)?1:(maxAvg/avg);
			for(let i in list){
				if(list[i]==0)continue;//min/max don't apply to 0 items?
				let result=list[i]*r;
				if(result<minScaled){result=minScaled;}
				if(result>maxScaled){result=maxScaled;}
				list[i]=result;
				if(isNaN(result))throw Error("NaN in stats");
			}
		}
		if(avg<minAvg){
			let r=(avg==0)?1:(minAvg/avg);
			for(let i in list){
				if(list[i]==0)continue;//min/max don't apply to 0 items?
				let result=list[i]*r;
				if(minScaled!==undefined){if(result<minScaled){result=minScaled;}}
				if(maxScaled!==undefined){if(result>maxScaled){result=maxScaled;}}
				list[i]=result;
				if(isNaN(result))throw Error("NaN in stats");
			}
		}
	}
}
function computeProperty(list,name,func,options)
{
	let resultList=(Array.isArray(list)?(new Array(list.length)):{});
	for(let i in list){
		let obj=list[i];
		let result=func(obj);
		resultList[i]=result;
	}
	scaleArray(resultList,options);
	for(let i in list){
		list[i][name]=resultList[i];
	}
}


function getter(obj,name){
	return ()=>obj[name];
}
function defaultSummary(args){
	
	let summary={};
	let array=args.filter((d)=>(d));//if an argument is not a data map it doesn't have a summary
	if(array.length==0) throw Error("no default summary without data input");//return null;
	return copyObj(array[0]);//often the first input is the only one being chained, and teh overriding functions can reuse this and modify it

	//summary.average=array[0].average;
	//summary.length=array[0].length;
	
}
function arraySummary(array,property)
{
	
	let min=Infinity,max=-Infinity,total=0;
	for (var i=0;i<array.length;i++)
	{
		let num=array[i];if(property!==undefined)num=num[property];if(typeof num!="number")return {length:array.length};
		if(num>max){max=num;}
		if(num<min){min=num;}
		total+=num;
	}
	if(min>max)return {min:NaN,max:NaN,total:NaN,avg:NaN,std:NaN};
	let avg=total/array.length;let variance=0;
	for (var i=0;i<array.length;i++)
	{
		let num=array[i];if(property!==undefined)num=num[property];
		variance+=(num-avg)*(num-avg);
	}
	variance/=array.length;
	let std=Math.sqrt(variance);
	return {min:min,max:max,average:avg,std:std,total:total,length:array.length};
}

//stat mapping usage: create a function like data(...).attr("propertyname")
//each step on teh chain returns a function (not evaluating the mapping itself) that can be chained. A map is immutable once initialized with a function and inputs, and the chaining methods actually returns another map
//they do not cache intermediate arrays, but cache the most recent index and value in case the computation graph is not a tree
//the end (output) always pulls data (requests the entries at indices that the output array needs - or if the output has no definite size, it keeps getting the next value until it can pull no more data), instead of the data being pushed from the sources.
//reusing computation nodes is possible, for example through forall(computea,computeb) where the two nodes inside share some computation
//there's no summary, not even data length - ??? we only have a recursive backward pass, not a forward pass (if necessary we can still add it, a summary is not too hard as long as user interaction with teh computation graph is not an issue)
//but I think using the stats like average, min/max as input is misguided; it can be better done through sensors and scaling variables in layout and style definitions.
//the nodes in teh data flow should not require global information, they should make each data entry work independently!
//but when is this not enough? Sensors are a kind of global information. But they happen after not during the main computations. If global information is necessary we can explicity compute them, or have a special component just for that, instead of messing up the internals of the data pipeline by adding a summary pass.
//the caching only works to ensure executing only once when the indices are requested in a way so that the same index is never requested in two noncnsecutive blocks. It can be out of order though.
//if you want to use filtering - such as selecting nodes satisfying a criteria and setting only those nodes' property, then indices must be ids in a map(or all indices should point to the original data's index which is harder and limits some operations where one flow may have multiple data sources). On the plus side this may help us eliminate the need for a separate array, and just set the araybuffer from the map-based data instead?



//a controller variable can be one value or a function that is evaluated when the mapping is recomputed. The function can be created by the utility function getter(obj,propname).
//the created map is evaluated when the styles and maybe layout parameters are being computed.(not per frame)
//for non-batch functions, the inputs are the datum or several pieces of data from the first few argument arrays(no stats?); for batch functions, they get the input arrays with statistics like mean and std, and are allowed to change the array entries and the stats, and return one of those arrays or a new one.

var endOfData={end:true};
var dataFunctions={
	//calculations
	identity:{func:function(datum){return datum}},
	combine:{
		func:function(d1,d2,ratio){return d1*ratio+d2*(1-ratio);},
		init:function(s1,s2,r){if(s1.length!=s2.length)throw Error("can't combine data of different dimensions");return {length:s1.length,average:s1.average*r+s2.average*(1-r)}},
	},

	
	//getting data
	getFunctionResult:{//evaluates a function once for getting some data; no summary
		func:function(f){return f();},//its output index should always be 1?
	},
	getEach:{
		func:function(array){if(property!==undefined)return array[this.tempIndex][property];else return array[this.tempIndex];}
	},
	//for unpacking an array(now since some values are not arrays, arrays have to be unpacked explicitly for consistency)
	getData:{func:function(array,property){if(property!==undefined)return array[this.tempIndex][property];else return array[this.tempIndex];},summary:function (array,property){if(typeof array=="function")array=array();this.argCache[0]=array;return arraySummary(array,property);}},//if some args are not data maps they are passed as is (functions are evaluated in this case, but not all data maps as a rule - we allow function inputs too) to the summary function. getData should by default evaluate input functions right? It doesn't really need the first argument to be a function if it doesn't just return the data.
	getProperty:{func:function(array,property){if(property!==undefined)return array[this.tempIndex][property];else return array[this.tempIndex];},summary:function (array,property){if(typeof array=="function")array=array();this.argCache[0]=array;return arraySummary(array,property);}},
	
	//output
	setData:{func:function(datum,array,property){if(property!==undefined)return array[this.tempIndex][property];else return array[this.tempIndex];},summary:function (array,property){if(typeof array=="function")array=array();this.argCache[0]=array;return arraySummary(array,property);}},
	test:{func:function(){}},
	
	
};
var dataFunctionMethods={};
class DataMap{
	constructor(type,args){
		this.type=type;
		this.args=args;
		for(let f in dataFunctionMethods){
			this[f]=dataFunctionMethods[f];
		}
	}
	run(){
		this.init();
		for(let i=0;i<this.summary.length;i++){
			result=calculate(i);
			if(result==endOfData)break;//??
		}
	}
	init(){
		this.clear();
		this.getSummary();//should not require all components to provide summaries, but should also allow requesting summaries as a preprocessing step
	}
	clear(){
		this.dataLength=undefined;this.dataMapArgs={};this.argCache={};this.argSummaries=[];
		this.summary=undefined;this.tempIndex=undefined;this.tempResult=undefined;
		for(let i in this.args){let arg=this.args[i];if(arg instanceof DataMap){arg.clear();}}
	}
	getSummary(){
		if(this.summary!==undefined)return this.summary;
		for(let i in this.args){
			let arg=this.args[i];
			if(arg instanceof DataMap){this.argSummaries[i]=arg.getSummary();this.dataMapArgs[i]=true;}
			else {
				let value=arg;
				//if((typeof arg =="function")){value=arg();this.argCache[i]=value;}
				//function argument evaluation shouldn't be the default behavior, there should be a specific kind of component for that?
				if(Array.isArray(value)){this.argSummaries[i]=arraySummary(value);}
				else{this.argSummaries[i]=value;}//sometimes needed
			}
		}
		if(this.dataFunction.calculateSummary){this.summary=this.dataFunction.summary(this.argSummaries);}
		else{this.summary=defaultSummary(this.argSummaries);}//????
		return this.summary;
	}
	calculate(index){
		if(this.tempIndex==index)return this.tempResult;//assuming they are side-effect-free or the side effects only need to happen once
		this.tempIndex=index;//it should not require its own value circularly!
		//this.tempargs.length=0;
		for (let i in this.args){
			if(arg instanceof DataMap){this.tempargs[i]=args[i].calculate(index);}
			else{if(this.argCache[i]!==undefined){this.tempargs[i]=this.argCache[i];}else{this.tempargs[i]=this.args[i];}}//argCache is set as desired by the individual data map definition; some expect data represented as functions, most don't
		}
		this.tempResult= this.dataFunction.func.apply(this,this.tempargs);//??
		return tempResult;
		//returns the result? it's not useful for teh end step which usually outputs to another array, but intermediate steps need it
	}
	next(){
		//returns teh next index being requested? Most components will not need the ability to explicitly check for end of source data and stopping when that happens, instead they can just throw when the next index is requested when tehre isn't any more. next is only usually used at teh end output component, while all others get requested specific indices. but maybe we don't need next(), only run() for outputs and calcuate(index) for all others? Others still need to know which index to request from ther arguments for any given index they are asked for. Normally this is the same index but could be different.
		//Non output components don't need to have run() and should throw when run directly?
		//the default calculate(index) will call arguments at the same index and prepare their results and then call func(), but it can be overridden to call arguments at different indices or do something else, such as returning a memoized result
		
	}
	
}
for(let f in dataFunctions){dataFunctionMethods[f]=function(){
		if(this.type===undefined){
			this.type=f;this.args=Array.from(arguments);Object.assign(dataFunctions[f],this);	
			return this;
		}
		else{
			return new DataMap(f,[this].concat(Array.from(arguments)));
			//multi-input maps like combine(data1, data2,ratio) can be used in three ways: new DataMap().combine(DataMap(x1...), DataMap(x2...)) or DataMap(x1...).combine(DataMap(x2...)), or DataMap("combine",DataMap(x1...), DataMap(x2...))
		}
	};
}



String.prototype.replaceAll = function(search, replacement) {
	var target = this;
	return target.replace(new RegExp(search, 'g'), replacement);
};
function replaceShaderParams(text,params){
	for(let p in params){//take care of int/float; now all values are float by default
		if(text.indexOf(p)==-1)continue;
		let str=String(params[p]);if(str.indexOf(".")==-1){str=str+".";}
		if(isNaN(params[p])){//only warn for cases when it's actually being replaced
				//throw Error("NaN in shader parameter replacement: "+p);
				//console.log("warning:setting unknown value "+p+" to default");params[p]=1;
				str="0.";
		}
		//text=text.replaceAll(p,str);
		text="const float "+p+"="+str+";\n"+text;
	}
	//console.log(text);
	return text;
}
function getShader(id){
	let text=getE(id).textContent;
	return text;
}
function getVertexShader(name){
	return getShader(name+"VertexShader");
}
function getFragmentShader(name){
	return getShader(name+"FragmentShader");
}
var undefinedDetected=false;
function setArrayDataItem(d,buffer,offset,dims){
	if(typeof d=="number"){
		for(let j=0;j<dims;j++){
			buffer[offset+j]=d;
		}
	}
	else if((d===undefined)||(d===null)){if(!undefinedDetected){undefinedDetected=true;console.log("warning: "+((d===undefined)?"undefined":"null")+" in array data at "+offset);}}
	//but still allow undefined?
	else if (typeof d=="object"){
		if(Array.isArray(d)){
			if(d.length!=dims)throw Error("unexpected array length at data entry "+i+" (expected "+dims+")",d);
			for(let j=0;j<dims;j++){
				buffer[offset+j]=d[j];
			}
		}
		else{
			switch(dims){
				case 1:throw Error();
					break;
				case 2:
					if(("x" in d)&&("y" in d)){buffer[offset+0]=d.x;buffer[offset+1]=d.y;break;}
					throw Error();
					break;
				case 3:
					if(("x" in d)&&("y" in d)&&("z" in d)){buffer[offset+0]=d.x;buffer[offset+1]=d.y;buffer[offset+2]=d.z;break;}
					if(("r" in d)&&("g" in d)&&("b" in d)){buffer[offset+0]=d.r;buffer[offset+1]=d.g;buffer[offset+2]=d.b;break;}
					throw Error();
					break;
				case 4: 
					if(("x" in d)&&("y" in d)&&("z" in d)&&("w" in d)){buffer[offset+0]=d.x;buffer[offset+1]=d.y;buffer[offset+2]=d.z;buffer[offset+3]=d.w;break;}
					if(("r" in d)&&("g" in d)&&("b" in d)&&("a" in d)){buffer[offset+0]=d.r;buffer[offset+1]=d.g;buffer[offset+2]=d.b;buffer[offset+3]=d.a;break;}
					throw Error();
					break;
				default:throw Error();
			
			}
			
		}
	}
}
function setArrayData(data,buffer,dims){
	if(data.length*dims>buffer.length)throw Error("array length is too small for data (expected "+(buffer.length/dims)+")",data);
	let undefinedDetected=false;
	for(let i=0;i<data.length;i++){
		let d=data[i];let offset=i*dims;
		if(typeof d=="number"){
			for(let j=0;j<dims;j++){
				buffer[offset+j]=d;
			}
		}
		else if((d===undefined)||(d===null)){if(!undefinedDetected){undefinedDetected=true;console.log("warning: "+((d===undefined)?"undefined":"null")+" in array data at "+i);}}
		//but still allow undefined?
		else if (typeof d=="object"){
			if(Array.isArray(d)){
				if(d.length!=dims)throw Error("unexpected array length at data entry "+i+" (expected "+dims+")",d);
				for(let j=0;j<dims;j++){
					buffer[offset+j]=d[j];
				}
			}
			else{
				switch(dims){
					case 1:throw Error();
						break;
					case 2:
						if(("x" in d)&&("y" in d)){buffer[offset+0]=d.x;buffer[offset+1]=d.y;break;}
						throw Error();
						break;
					case 3:
						if(("x" in d)&&("y" in d)&&("z" in d)){buffer[offset+0]=d.x;buffer[offset+1]=d.y;buffer[offset+2]=d.z;break;}
						if(("r" in d)&&("g" in d)&&("b" in d)){buffer[offset+0]=d.r;buffer[offset+1]=d.g;buffer[offset+2]=d.b;break;}
						throw Error();
						break;
					case 4: 
						if(("x" in d)&&("y" in d)&&("z" in d)&&("w" in d)){buffer[offset+0]=d.x;buffer[offset+1]=d.y;buffer[offset+2]=d.z;buffer[offset+3]=d.w;break;}
						if(("r" in d)&&("g" in d)&&("b" in d)&&("a" in d)){buffer[offset+0]=d.r;buffer[offset+1]=d.g;buffer[offset+2]=d.b;buffer[offset+3]=d.a;break;}
						throw Error();
						break;
					default:throw Error();
				
				}
				
			}
		}
	}
}

function comparePairs(){//whether first pair (a,b) has a<b, or a==b and second pair (a',b') has a'<b', etc
	for(let i=0;i<arguments.length;i+=2){
		let temp=arguments[i]-arguments[i+1];
		if(isNaN(temp))throw Error();
		if(temp<0)return true;
		if(temp>0)return false;
	}
	return false;
}


function addHoverListener(domElements,delay,hoverFunc,hoverEndFunc){
	
	let hoverTimeout=null;
	let hoveredElem=null;
	let delayFunc=delay;
	if(typeof delay=="number")delayFunc=()=>delay;
	let listener=(ev)=>{
		if(hoveredElem){
			if(hoverEndFunc){
				hoverEndFunc(hoveredElem);
			}
			hoveredElem=null;
		}
		//hoverFunc(null);//when the mouse moves, clear any hover effects
		if(hoverTimeout){clearTimeout(hoverTimeout);}
		hoverTimeout=setTimeout(()=>{hoveredElem=ev.srcElement;hoverFunc(ev.srcElement);},delayFunc());
	};
	let outListener=(ev)=>{
		if(hoveredElem){
			if(hoverEndFunc){
				hoverEndFunc(hoveredElem);
			}
			hoveredElem=null;
		}
		if(hoverTimeout){clearTimeout(hoverTimeout);}
	};
	if(Array.isArray(domElements)){
		for(let elem of domElements){
			elem.addEventListener("mousemove",listener, false);
			elem.addEventListener("mouseout",outListener, false);
		}
	}
	else{
		domElements.addEventListener("mousemove",listener, false);
		domElements.addEventListener("mouseout",outListener, false);
	}
}

function lineIntersection(p1,p2,p3,p4){
	
	let v1=new THREE.Vector2().copy(p1).addScaledVector(p2,-1);
	let v2=new THREE.Vector2().copy(p3).addScaledVector(p4,-1);
	if((v1.x*v2.y==v1.y*v2.x))return null;
	let v3=new THREE.Vector2().copy(p1).addScaledVector(p3,-1);
	let y=(v3.x*v1.y-v1.x*v3.y)/(v2.x*v1.y-v1.x*v2.y);
	let result=new THREE.Vector2().copy(v2).multiplyScalar(y).addScaledVector(p3,1);
	return result;
	
	/*
	ax+by=c
	dx+ey=f
	bdy-aey=cd-af
	y=(cd-af)/(bd-ae)
	x=(c-by)/a
	y*v2+p3=intersection
	*/
	
}
function rayIntersectsSegment(origin,direction,p1,p2){
	let tempP=new THREE.Vector2().copy(origin).add(direction);
	let intersection=lineIntersection(origin,tempP,p1,p2);
	if(intersection==null)return false;
	tempP.copy(intersection).addScaledVector(origin,-1);
	if(tempP.dot(direction)<0)return false;//other side of the ray
	let v1=new THREE.Vector2().copy(intersection).addScaledVector(p2,-1),v2=new THREE.Vector2().copy(intersection).addScaledVector(p1,-1);
	
	return (v1.dot(v2)<0);
}
function pointInPolygon(point,points){
	let direction=new THREE.Vector2().copy(point).addScaledVector(points[0],-1).add(point).addScaledVector(points[1],-1);
	let intersectionCount=0;
	for(let i=1;i<points.length;i++){
		if(rayIntersectsSegment(point,direction,points[i-1],points[i]))intersectionCount++;
	}
	if(rayIntersectsSegment(point,direction,points[points.length-1],points[0]))intersectionCount++;
	return (intersectionCount%2==1);
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

function arraySum(arr){return arr.reduce((a,b)=>a+b,0);}