const G={
	DEBUG:false,
	modules:{},moduleList:[],
	addModule:function(name,obj){
		let module=new Module();module.name=name;Object.assign(module,obj);
		this[name]=module;this.modules[name]=module;this.moduleList.push(module);
	},
	init:function init3d(canvasName) {
		this.canvasContainer=getE(canvasName);
		for(let module of this.moduleList){
			if(typeof module.init=="function")module.init(this, canvasName);
		}//follow the script loading order 
	},
	broadcast:async function(name){
		let args=Array.from(arguments).slice(1);
		for(let module of this.moduleList){
			if(typeof module[name]=="function")
			await Promise.resolve(module[name].apply(module,args));
		}
	},
	enableModifier:function(name,target){
		moduleLoop:for(let module of this.moduleList){
			if(module.modifiers&&(name in module.modifiers)){
				for(let templateName in module.templates){if(templateName in target==false){console.log("probably not a suitable target for "+module.name);continue moduleLoop;}}//sanity check - although modules may share modifiers of the same name, different modules may be meant for different kinds of objects and we probably shouldn't try applying a module's modifier on something that module was never applied on in the first place.
				if(module.modifierTarget!=target)module.setModifiersTarget(target);
				module.enableModifier(name);
			}//needs to enable it even if it's not the current target for the module's controls, and should probably target the controls - note that a module's modifiers can be applied to anything its templates are applied on(eg. all subviews), but has only one target for controls at a time
		}
	}
	
};

class Module{
	applyTemplates(data,updateAll=true){//these objects and properties can be shared between modules, and so can modifiers, but then different objects and modifiers must have different names.
	//now the result of this process must be a DataSet instance. Even if the data itself was not?
	//unlike on the server where we basically have one dataset "shape" (graphs) with some optional extras, here we have several different templates with their own objects and properties, and different templates can apply to the same DataSet.  should we differentiate between modifying a dataset (usually setting properties) and creating a dataset from another (As in the case of 
		if(!this.templates)return;
		
		for(let name in this.templates){
			let templateObj=this.templates[name];
			if(templateObj.properties){//is a DataObject template, must apply to DataSet only
				if((data instanceof DataSet)==false)throw Error();
				if(data[name]===undefined||updateAll){
					let _value=null,length;
					if(templateObj.value){_value=templateObj.value(data);}
					if(templateObj.length){length=templateObj.length(data);}
					if(_value&&length){if(_value.length!=length)throw Error();}
					else{if(_value&&(!length))length=_value.length;}
					if(_value){
						if(data[name]!==undefined)console.log("warning: overwriting data object "+name);
						let obj=data.addObject(name);
						if(_value.indexMap){obj.indexMap=_value.indexMap;}
						if(_value.originalIndices){obj.originalIndices=_value.originalIndices;}
						data[name].setLength(length);
					}
					if(_value){data[name]._value=_value;}
					else{if(!data[name])throw Error();}
				}
				let objectData=data[name];
				let propertiesObj=templateObj.properties;
				for(let propertyName in propertiesObj){
					let propertyTemplateObj=propertiesObj[propertyName];
					if(propertyTemplateObj.condition&&(!propertyTemplateObj.condition(data)))continue;
					if(propertyTemplateObj.value){
						//allow overwriting by default by skipping properties marked "lazy" unless it's explicitly marked for update, for example graph analytics that don't change
						if(objectData[propertyName]==undefined||propertyTemplateObj.needsUpdate||(updateAll&&(!propertyTemplateObj.lazy))){
							//supports perObject; runlength (dimensions) is only for WebGL stuff so not supported here. However, it can  also support types as in a typed array, as long as the return value is actually a typed array or primitive values (it could save a lot of space).
							let dataResult;
							if(!propertyTemplateObj.isArray){//the default is per-object mapping
								if(propertyTemplateObj.type){//create typed array directly
									dataResult=getTypedArrayType(propertyTemplateObj.type).from(objectData.map(propertyTemplateObj.value));
								}
								else{//just an array
									dataResult=objectData.map(propertyTemplateObj.value);
								}
							}
							else{
								dataResult=propertyTemplateObj.value(data);//it can return a typed array
							}
							if(dataResult==null)continue;
							if(objectData instanceof DataObject){
								if(propertyName in objectData.properties){objectData.setProperty(propertyName,dataResult);}
								else{objectData.addProperty(propertyName,propertyTemplateObj.type,dataResult);}
							}
							else{
								if(dataResult.length!=objectData.length)throw Error();
								if((propertyTemplateObj.type)&&(dataResult instanceof getTypedArrayType(propertyTemplateObj.type)==false)){
									//throw Error();
									dataResult=getTypedArrayType(propertyTemplateObj.type).from(dataResult);
								}
								addHiddenProperty(objectData,propertyName,dataResult);
							}
							propertyTemplateObj.needsUpdate=false;
						}
					}
				}
			}
			else{//is not a dataobject definition?
				if(templateObj.value){
					//if(data[name]!==undefined) throw Error();
					if(data[name]===undefined||updateAll){
						let objResult=templateObj.value(data);
						data[name]=objResult;
					}
				}
			}
			
		}
		if(this.modifiers){//apply modifiers from the same module
			if(!data.modifiers){data.modifiers={};}
			for(let name in this.modifiers){
				let modifier=this.modifiers[name];
				if(modifier.dynamic){modifier.needsUpdate=true;}
				if(modifier.needsUpdate||updateAll){
					if(data.modifiers[name]){//but all modifiers from all modules can be put in the same place (and even shared)
						//even if it's not there, we may need to call onupdate
						let modData=data.modifiers[name];
						//add missing parameters(so that its easier to add modifiers programmatically)
						for(let dataName in modifier.params){
							if(dataName in modData){
								//shorthand: if the value of a button-type parameter is true, activate the function just once
								if(modifier.params[dataName].type=="button"&&(modData[dataName])){
									setTimeout(()=>{if(modifier.params[dataName].func)modifier.params[dataName].func(null,data,data.modifiers[name]);},0);
									delete data.modifiers[name][dataName];
								}
								continue;
							}
							let value=modifier.params[dataName].value;
							if(typeof value=="function"){value=modifier.params[dataName].value(data,modData);}
							modData[dataName]=value;
						}
						if(modifier.description){
							let desc=modifier.description;if(typeof desc=="function"){desc=desc(data,modData);}
							modData.description=desc;
						}
						for(let dataName in modifier.data){
							modData[dataName]=modifier.data[dataName](data,modData);
						}
						if(modifier.effects){
							for(let objName in modifier.effects){
								let objectEffect=modifier.effects[objName];
								for(let propName in objectEffect){
									let propertyEffect=objectEffect[propName];
									applyRulesOnProperty(data[objName],propName,propertyEffect,modData,data);//will apply the effect on the property array if it exists, or on object properties otherwise
									
								}
							}
						}
					}
					
					if(modifier.onUpdate){
						modifier.onUpdate(data,data.modifiers[name]);
					}
					modifier.needsUpdate=false;
				}
			}
		}
		//then apply scaling on properties
		for(let name in this.templates){
			let templateObj=this.templates[name];
			let objectData=data[name];
			if(templateObj.properties){
				let propertiesObj=templateObj.properties;
				for(let propertyName in propertiesObj){
					let propertyTemplateObj=propertiesObj[propertyName];
					if(propertyTemplateObj.scaling){
						let scaling=propertyTemplateObj.scaling;
						if(typeof scaling=="function"){
							scaling=scaling(data);
							if(scaling===undefined){throw Error("scaling result is undefined");}
							if(Number.isNaN(scaling)){throw Error("scaling result is NaN");}
						}
						if(scaling)scaleArray(objectData[propertyName],scaling);
						propertyTemplateObj.scalingCache=scaling;
						propertyTemplateObj.needsUpdate=false;
					}
				}
			}
		}
		//then, mark the properties that depend on this property as needing update
	}
	removeTemplates(data){
		if(!this.templates)return;
		for(let name in this.templates){
			let templateObj=this.templates[name];
			if(templateObj.value){
				if(data[name]!==undefined){delete data[name];continue;}
			}
			let objectData=data[name];
			if(templateObj.properties){
				let propertiesObj=templateObj.properties;
				for(let propertyName in propertiesObj){
					if(propertyName=="value")continue;
					let propertyTemplateObj=propertiesObj[propertyName];
					if(propertyTemplateObj.value){
						if(objectData[propertyName]!==undefined){delete objectData[propertyName];}
					}
				}
			}
			
		}
	}
	onModifiersChanged(name){
		G.broadcast("modifierUpdated",{target:this.modifierTarget&&this.modifierTarget.dataPath,modifier:name,params:(this.modifierTarget&&this.modifierTarget.modifiers&&this.modifierTarget.modifiers[name])});
	}//override if needed
	onUserEvent(type,result){
		if(!result.subview.graph.modifiers)return;
		if(result.subview.graph!=this.modifierTarget)return;
		for(let name in this.modifiers){
			if(!result.subview.graph.modifiers[name])continue;
			if(this.modifiers[name]["on"+type]){
				this.modifiers[name]["on"+type](result,this.modifierTarget,this.modifierTarget.modifiers[name]);
			}
		}
	}
	initModifierControls(modMenuElem){
		if(!modMenuElem)modMenuElem=getE("controls-menu");//getE("modifiers-menu");
		let modMenuSelection=d3.select(modMenuElem);
		let modifierItemsObj=Object.keys(this.modifiers);
		this.modifierTarget=null;
		G.controls.addDropdownMenu(modMenuElem,toNormalText(this.name)+" Tools",modifierItemsObj,(name)=>{
			this.enableModifier(name);
		});
		for(let name in this.modifiers){
			let modObj=this.modifiers[name];
			modObj.controlsSelection=modMenuSelection.append("div").attr("class","modifier-controls").style("display","none");
			modObj.advancedControlsSelection=modObj.controlsSelection.append("div").attr("class","modifier-controls-advanced").style("display","none");
			modObj.controlsElem=modObj.controlsSelection.node();
			modObj.advancedControlsElem=modObj.advancedControlsSelection.node();
			//only add a show more button if needed
			modObj.modLabelSelection=modObj.controlsSelection.append("p").attr("class","modifier-controls-title").text(toNormalText(name)+" \u2716").on("click",()=>{
				this.disableModifier(name);
			});
			let hasAdvancedControls=false;
			modMenuElem.appendChild(modObj.controlsElem);
			if(modObj.params){
				for(let paramName in modObj.params){
					let paramObj=modObj.params[paramName];
					let displayName=paramObj.displayName?paramObj.displayName:paramName;
					let container=paramObj.advanced?modObj.advancedControlsElem:modObj.controlsElem;
					switch(paramObj.type){
						case "integer":
							paramObj.cache={min:0,max:1,type:"integer"};
							if(paramObj.lazy==true){
								paramObj.cache.lazy=true;
							}
							if(paramObj.hidden){paramObj.cache.onUpdate=()=>{};continue;}
							if(paramObj.advanced){hasAdvancedControls=true;}
							G.controls.addSliderWithStepButtons(container,toNormalText(displayName),(value)=>{
								let target=this.modifierTarget;
                                if( G.view.graph.customPathNumbers>0) {
                                    value += (G.view.graph.customPathNumbers-1);
                                    //G.view.graph.customPathNumbers = false;
                                }
								target.modifiers[name][paramName]=value;
								if(paramObj.func)paramObj.func(value,target,target.modifiers[name]);
								modObj.needsUpdate=true;this.onModifiersChanged(name);
								if(name =="sparsenet") {
                                    G.addLog("showing " + G.view.graph.snPathSequence + " path out of " + G.view.graph.snPaths.length);
                                    let count =0;
                                    Object.keys(G.view.graph.modifiers.sparsenet.vertexPaths).filter((v) =>{
                                        if(G.view.graph.modifiers.sparsenet.vertexPaths[v].length > 1 ){
                                            return count +=1;
                                        }
                                    });
                                    let sparsenetMenu = [
                                        ""+G.view.graph.snPathSequence+" sparsenet paths out of " + G.view.graph.snPaths.length,
                                        "Number of subtrees: " + count,
                                        "|worms| : "+[...new Set(Object.keys(G.view.graph.snWorms))].length,
                                        "|sparsenet V| : "+Object.keys(G.view.graph.modifiers.sparsenet.vertexPaths).length,
                                        "|sparsenet E| : "+Object.keys(G.view.graph.snEdgePaths).length];
                                    let infoElem=getE("sparsenet-info-menu");
                                    $("#sparsenet-info-menu").html("");
                                    G.controls.addDropdownMenu(infoElem,"Sparsenet Info",sparsenetMenu);
                                }
							},paramObj.cache);
							
							break;
						case "float":
						case "number":
							paramObj.cache={min:0,max:1,type:"float"};
							if(paramObj.lazy==true){
								paramObj.cache.lazy=true;
							}
							if(paramObj.hidden){paramObj.cache.onUpdate=()=>{};continue;}
							if(paramObj.advanced){hasAdvancedControls=true;}
							G.controls.addSlider(container,toNormalText(displayName),(value)=>{
								let target=this.modifierTarget;
								target.modifiers[name][paramName]=value;
								if(paramObj.func)paramObj.func(value,target,target.modifiers[name]);
								modObj.needsUpdate=true;this.onModifiersChanged(name);
							},paramObj.cache);
							break;
						case "boolean":
							if(paramObj.hidden){paramObj.cache={onUpdate:()=>{}};continue;}
							if(paramObj.advanced){hasAdvancedControls=true;}
							let checkCallback=(value)=>{
								let target=this.modifierTarget;
								target.modifiers[name][paramName]=value;
								if(paramObj.func)paramObj.func(value,target,target.modifiers[name]);
								modObj.needsUpdate=true;this.onModifiersChanged(name);
							};
							paramObj.cache=G.controls.addCheckbox(container,toNormalText(displayName),checkCallback);
							//just need a checkbox?
							break;
						case "select":
							if(paramObj.hidden){paramObj.cache={onUpdate:()=>{}};continue;}
							if(paramObj.advanced){hasAdvancedControls=true;}
							let selectCallback=(value)=>{
								let target=this.modifierTarget;
								target.modifiers[name][paramName]=value;
								if(paramObj.func)paramObj.func(value,target,target.modifiers[name]);
								modObj.needsUpdate=true;this.onModifiersChanged(name);//if func is updating controls, it goes before onModifiersChanged
							}
							paramObj.cache=G.controls.addDropdownSelect(container,toNormalText(displayName),paramObj.options,selectCallback);
							//dropdown select shows the current selected value, whereas dropdown menu doesn't
							break;
						case "button":
							if(paramObj.hidden){paramObj.cache={onUpdate:()=>{}};continue;}
							if(paramObj.advanced){hasAdvancedControls=true;}
							paramObj.cache={};
							let clickCallback=()=>{
								let target=this.modifierTarget;
								if(paramObj.func)paramObj.func(null,target,target.modifiers[name]);
								modObj.needsUpdate=true;this.onModifiersChanged(name);
							};
							let getAnimateCallback=(delta)=>{
								paramObj.timeoutFunc=()=>{
									clickCallback();
									if(paramObj.cache.animating)paramObj.cache.animateTimeout=setTimeout(paramObj.timeoutFunc,paramObj.cache.animateInterval);
								};
								return ()=>{
									if(paramObj.cache.animating){//stop
										paramObj.cache.animating=false;
									}
									else{//start a timeout that will set itself again if animating is true
										paramObj.cache.animating=true;
										paramObj.cache.animateTimeout=setTimeout(paramObj.timeoutFunc,paramObj.cache.animateInterval)
									}
								}
								return paramObj.timeoutFuncs[delta];
							};
							let animateCallback=getAnimateCallback();
							if(!(paramObj.noAnimate==true)){//right click animates; now allow animation by default, unless it's disabled because the oepration is expensive or something
								paramObj.cache.animateInterval=paramObj.animateInterval?paramObj.animateInterval:1000;
								G.controls.addMediumButton(container,toNormalText(displayName),clickCallback,animateCallback);
							}
							else{
								G.controls.addMediumButton(container,toNormalText(displayName),clickCallback);
							}
							
							break;
					}
					
				}
				if(hasAdvancedControls){
					
				}

			}
		}
	}
	setModifiersTarget(target){
		this.modifierTarget=target;
		if(!target.modifiers)target.modifiers={};
		for(let name in this.modifiers){
			let modObj=this.modifiers[name];

			
			if(!target.modifiers[name]){modObj.controlsElem.style.display="none";}
			else{//set values of controls
				//if(modObj.onEnable){
				//	let result=modObj.onEnable(target,modParamsObj);//some styles (ie SN) needs to do computation when it's enabled
				//	if(result)return;//delayed enabling ?? todo: use promises
				//}
				modObj.controlsElem.style.display="";
				this.refreshModifierControls(name);
			}
		}
	}
	refreshModifierControls(name){
		let target=this.modifierTarget;if(!target){G.addLog("no modifier target");return;}
		let modObj=this.modifiers[name];
		let modParamsObj=target.modifiers[name];
		//if(modObj.onEnable){let result=modObj.onEnable(target,modParamsObj);if(result)return;}//is this needed?
		if(modObj.params){
			for(let paramName in modObj.params){
				let paramObj=modObj.params[paramName];
				switch(paramObj.type){ //does this only affect numbers? for now maybe, but later other things can change based on other parameters
					case "integer":
						//reset the value and recalculate min/max 
						let min=modObj.params[paramName].min;
						if(!min)min=0;
						let max=modObj.params[paramName].max;
						if(!max)max=1;
						if(typeof min=="function"){min=min(target,modParamsObj);}
						if(typeof max=="function"){max=max(target,modParamsObj);}
						checkNumber(min);
						checkNumber(max);
						paramObj.cache.min=min;
						paramObj.cache.max=max;
						if(modParamsObj[paramName]<max){//ensure it's in the range
							if(modParamsObj[paramName]>min){}
							else{modParamsObj[paramName]=min;}
						}
						else{modParamsObj[paramName]=max;}
						paramObj.cache.onUpdate(modParamsObj[paramName]);
							
						break;
					case "float":
					case "number":
						break;
					case "boolean":
						paramObj.cache.onUpdate(modParamsObj[paramName]);
						break;
					case "select":
						//allow changing the list of options if options is a function
						if(typeof modObj.params[paramName].options=="function"){
							let newItems=modObj.params[paramName].options(target,modParamsObj);
							let newValue=modParamsObj[paramName];
							if(newValue==undefined){
								newValue=modObj.params[paramName].value;
								if(typeof newValue=="function"){newValue=newValue(target,modParamsObj);}
							}
							//let newValue=modObj.params[paramName].value;
							//if(typeof newValue==function){newValue=newValue(target,modParamsObj);}
							paramObj.cache.updateItems(newItems,newValue);
							//dropdown select shows the current selected value, whereas dropdown menu doesn't
						}
						else{
							paramObj.cache.onUpdate(modParamsObj[paramName]);
						}
						break;
					case "button":
						break;
				}
				
			}
		}
	}
	enableModifier(name){
		let target=this.modifierTarget;if(!target){G.addLog("no modifier target");return;}
		/*if(target.modifiers[name]){ //if it needs refreshing, also update controls?
			this.refreshModifier(name);
			return;
		}*/
		//check conditions: now conditions determine if a target can have this style, not whetehr it is currently showing this style
		let modObj=this.modifiers[name];
		if(modObj.condition){
			let result=modObj.condition(target);
			if(!result){G.addLog("this target cannot have this style");return;}
		}
		//now it can have this style
		let initial=true;
		if(!target.modifiers[name]){target.modifiers[name]={};initial=false;}//allow pre-set modifiers
		let modParamsObj=target.modifiers[name];
		if(modObj.onEnable){
			let result=modObj.onEnable(target,modParamsObj);//some styles (ie SN) needs to do computation when it's enabled
			if(result)return;//delayed enabling ?? todo: use promises
		}
		
		if(modObj.params){
			for(let paramName in modObj.params){
				let paramObj=modObj.params[paramName];
				
				let value=modObj.params[paramName].value;
				if(typeof value=="function"){value=value(target,modParamsObj);}//earlier parameters may be used t change later ones?
				//modParamsObj[paramName]=value;//only set the value if teh old value is invalid
				let oldValue=modParamsObj[paramName];
				let oldValueValid=true;
				if(oldValue===undefined)oldValueValid=false;
				//if(paramName in modParamsObj)continue;//use the old value
				/*if(modParamsObj[paramName]===undefined){
					let value=modObj.params[paramName].value;
					if(typeof value=="function"){value=value(target,modParamsObj);}//earlier parameters may be used t change later ones?
					modParamsObj[paramName]=value;
				}//keep old value if existing?*/
				
				//modifier template parameters (like filter property name) should not be mixed with control parameters (like threshold)
				switch(paramObj.type){//most types can be animated, with animate:true and animationInterval
					case "integer":
						//change other config like min/max
						let min=modObj.params[paramName].min;if(!min)min=0;
						let max=modObj.params[paramName].max;if(!max)max=1;
						if(typeof min=="function"){min=min(target,modParamsObj);}
						if(typeof max=="function"){max=max(target,modParamsObj);}
						checkNumber(min);checkNumber(max);
						if(paramObj.cache){paramObj.cache.min=min;paramObj.cache.max=max;}
						if(((oldValue<=max)&&(oldValue>=min))==false)oldValueValid=false;;
						break;
					case "float":
					case "number":
						break;
					case "select":
						//??
						break;
					case "button":
						break;
				}
				if(oldValueValid==false)modParamsObj[paramName]=value;
			}
		}
		modObj.controlsElem.style.display="";
		this.refreshModifierControls(name);
		modObj.needsUpdate=true;this.onModifiersChanged(name);
	}
	disableModifier(name){
		let modObj=this.modifiers[name];
		if(modObj.onDisable){//cleanup if needed
			let result=modObj.onDisable(this.modifierTarget,this.modifierTarget.modifiers[name]);
		}
		modObj.controlsSelection.style("display","none");if(this.modifierTarget)delete this.modifierTarget.modifiers[name];
		modObj.needsUpdate=true;this.onModifiersChanged(name);
	}
	refreshModifier(name){
		this.modifiers[name].needsUpdate=true;
		this.refreshModifierControls(name);
		this.onModifiersChanged(name);
		
	}
};

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
		default:throw Error();
	}
}

function getProperty(array,i,name){
	if(array[name]){return array[name][i];}
	return array[i][name];
}

window.addEventListener('load', function() {
    G.init("canvas");
    //G.init("canvas2");
})



