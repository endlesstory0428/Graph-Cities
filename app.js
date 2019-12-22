'use strict';
const Graph=require("./lib/graph.js"),Datasets=require("./datasets.js"),http = require('http'),util = require("util"),express = require('express'),zlib = require('zlib'),Buffer = require('buffer').Buffer,fs = require('node-fs'),path = require('path'),readline=require('readline'),{exec, spawn} = require('child_process'),io = require("socket.io");

var dataDir= 
"./data";
var tempDir="./temp";

var servers={
	normal:{
		prefix:"public",
		port:3010,
	},
	/*
	test:{
		prefix:"public-test",
		port:3011,
	},
	*/
}

let cachesToRefresh={};//to deal with te situation where there's not enogh memory to refresh all of one kind of cache, we need to be able to specify only to refresh if teh cache is older than soem time, eg. 5 minutes (since the time when the whole processing started).  so instead of <cache>, <cache>:<number> means only refresh if it's older than <number> minutes.
let noDerived=false;
process.argv.forEach(function (val, index, array) {
console.log(index + ': ' + val);
	if(val.indexOf("noDerived")!=-1){noDerived=true;}
	if(val.indexOf("dataDir=")!=-1){dataDir=val.substring(val.indexOf("dataDir=")+8);}
	if(val.indexOf("tempDir=")!=-1){tempDir=val.substring(val.indexOf("tempDir=")+8);}
	if(val.indexOf("port=")!=-1){
		let port=Number(val.substring(val.indexOf("port=")+5));
		if(!(isNaN(port))){
			for (let name in servers){servers[name].port=port;port++;}
		}
	}
	if(val.indexOf("refreshCache=")!=-1){
		let values=val.substring(val.indexOf("refreshCache=")+13);
		let names=values.split(",");
		for(let name of names){
			let index=name.indexOf(":");
			if(index!=-1){
				let minutes=Number(name.substring(index+1).trim());
				name=name.substring(0,index).trim();
				cachesToRefresh[name.trim()]=minutes;
				
			}
			else{
				cachesToRefresh[name.trim()]=0;
			}
			
		}
	}
});

init();

function init(){
	process.on('warning', e => console.warn(e.stack));
	startServers();//if it fails, it's better to fail early
	if(noDerived){
		Datasets.loadAllDatasets(dataDir,tempDir,bindHandlers,stopServer,cachesToRefresh,noDerived);
	}
	else{
		Datasets.loadAllDatasets(dataDir,tempDir,bindHandlers,stopServer,cachesToRefresh);//data, cache, callback,failure callback
	}
}
function startServers(serverDef){
	for(let name in servers){
		let serverDef=servers[name];
		//todo: if port is specified externally (like on AWS ElasticBeanstalk), use only one server but different (client-side) prefixes; //currently we use different servers with different ports
		serverDef.app= express();serverDef.server = http.createServer(serverDef.app);
		
		serverDef.sio=io();serverDef.sio.serverDef=serverDef;serverDef.sio.sockets.serverDef=serverDef;
		serverDef.clients={};
		//sio=io();
		serverDef.server.listen(serverDef.port,serverDef.server.address(),{'transports':[ 'websocket', 'flashsocket', 'polling' ]} );
		console.log("\t server "+name+ ": Listening on "+(serverDef.server.address()&&serverDef.server.address().address)+' port ' + serverDef.port );
		
	}
	
}
function stopServer(){
	process.exit(1);
}
function bindHandlers(datasetsList){
	//note: express doesn't send files with relative paths, and it seems this means paths (eg tempDir) cannot include ../ if I want to use __dirName+"/"+tempDir to send files. Try resolve path?
	let realTempDir;
	if(tempDir[0]!="/")realTempDir=path.resolve(__dirname + "/"+tempDir);
	else realTempDir=tempDir;
	console.log(realTempDir);
	
	for(let name in servers){
		let serverDef=servers[name];
		let app=serverDef.app,server=serverDef.server,sio=serverDef.sio,prefix=serverDef.prefix;
		
		let realPrefixDir;
		if(prefix[0]!="/")realPrefixDir=path.resolve(__dirname + "/"+prefix);
		else realPrefixDir=prefix;
	
		app.get('/datasetIDMaps/*/*', function(req, res) {//this takes priority over the next
			console.log(req.params[0]);
			if(Datasets.datasetIDMaps[req.params[0]]){
				let idMap=Datasets.datasetIDMaps[req.params[0]];
				let ids=req.params[1].split(",").map((d)=>idMap[d]);
				res.header('Content-Type', 'application/json');res.send(JSON.stringify(ids));return;
			}
		});
		app.get('/query', function(req, res) {
			let type=req.query.type;
			console.log("query:",req.query);
			switch (type){
				case "subgraphID":{
					let prefix=req.query.dataPath.trim();
					let subgraphType=req.query.subgraphType;
					let V=req.query.V;
					let minV=req.query.minV;
					let maxV=req.query.maxV;
					let E=req.query.E;
					let minE=req.query.minE;
					let maxE=req.query.maxE;
					let listAll=req.query.listAll;
					let g=new Graph();
					g.dataPath=prefix;
					//let list=Datasets.loadSubgraphs(g,subgraphType,true);
					let subgraphID=null;
					/*for(let subgraph of list){
						if(V!=undefined&&subgraph.vertices.length!=V){continue;}
						if(E!=undefined&&subgraph.edges.length!=E){continue;}
						subgraphID=subgraph.subgraphID;
						break;
					}*/
					let summary=Datasets.loadSubgraphFullSummary(prefix,subgraphType);
					if(listAll){
						let list=[];
						for(let subgraph of summary){
							if(V!=undefined&&subgraph.vertices!=V){continue;}
							if(minV!=undefined&&subgraph.vertices<minV){continue;}
							if(maxV!=undefined&&subgraph.vertices>maxV){continue;}
							if(E!=undefined&&subgraph.edges!=E){continue;}
							if(minE!=undefined&&subgraph.edges<minE){continue;}
							if(maxE!=undefined&&subgraph.edges>maxE){continue;}
							subgraphID=subgraph.subgraphID;
							//console.log(subgraph);
							list.push(subgraphID);
						}
						console.log("query result:",list);
						res.header('Content-Type', 'application/json');
						res.header('Access-Control-Allow-Origin','*');
						res.send(JSON.stringify(list));
					}
					else{
						for(let subgraph of summary){
							if(V!=undefined&&subgraph.vertices!=V){continue;}
							if(minV!=undefined&&subgraph.vertices<minV){continue;}
							if(maxV!=undefined&&subgraph.vertices>maxV){continue;}
							if(E!=undefined&&subgraph.edges!=E){continue;}
							if(minE!=undefined&&subgraph.edges<minE){continue;}
							if(maxE!=undefined&&subgraph.edges>maxE){continue;}
							subgraphID=subgraph.subgraphID;
							console.log(subgraph);
							break;
						}
						console.log("query result:",subgraphID);
						res.header('Content-Type', 'application/json');
						res.header('Access-Control-Allow-Origin','*');
						res.send(JSON.stringify(subgraphID));

					}
					break;
				}
					
				case "subgraphSummary":{
					let prefix=req.query.dataPath.trim();
					let subgraphType=req.query.subgraphType.trim();
					
					let summary=Datasets.loadSubgraphSummary(prefix,subgraphType);
					
					if(summary==null)console.log("query result is null!");
					res.header('Content-Type', 'application/json');
					res.header('Access-Control-Allow-Origin','*');
					res.send(JSON.stringify(summary));
					break;
				}
				case "subgraphFullSummary":{
					let prefix=req.query.dataPath.trim();
					let subgraphType=req.query.subgraphType.trim();
					
					let summary=Datasets.loadSubgraphFullSummary(prefix,subgraphType);
					
					if(summary==null)console.log("query result is null!");
					res.header('Content-Type', 'application/json');
					res.header('Access-Control-Allow-Origin','*');
					res.send(JSON.stringify(summary));
					break;
				}
					
				default:
					console.log("unknown query type ",type);
					
			}
		});
		app.get('/extradata/*/*', function(req, res) {
			console.log(req.params[0]);
			if(Datasets.extraData[req.params[0]]){
				let results=Datasets.extraData[req.params[0]].get(req.params[1].split(","));
				res.header('Content-Type', 'application/json');res.send(JSON.stringify(results));return;
			}
		});
		
		app.get('/datasets/*', function(req, res) {
			let filename=realTempDir+"/"+req.params[0];//explicit file extensions
			function fail(){
				console.log("failed to get bucketed data "+req.params[0]);
				res.header('Content-Type', 'application/json');
				res.header('Access-Control-Allow-Origin','*');
				res.send(JSON.stringify(null));;
			}
			if(!fs.existsSync(filename)){
				console.log("no such file "+filename+", trying bucketed data");
				//try bucketed data
				let relativePath=req.params[0];
				
				let i1=relativePath.lastIndexOf("/"),subgraphPath=relativePath.substring(0,i1);
				let i2=subgraphPath.lastIndexOf("/");
				if(i2!=-1){
					let subgraphListPath=subgraphPath.substring(0,i2);
					
					let i3=subgraphListPath.lastIndexOf("/");
					let originalGraphPath=subgraphListPath.substring(0,i3);
					let subgraphType=subgraphListPath.substring(i3+1);
					if(subgraphType=="metagraphs"){fail();return;}//not a subgraph
					//console.log("getting bucketed data "+relativePath);
					let subgraphIDStr=subgraphPath.substring(i2+1);
					let subgraphID=Number(subgraphPath.substring(i2+1));
					if(isNaN(subgraphIDStr)){
						//try subgraph union
						let subgraphIDList=subgraphIDStr.split("+");
						let g=Datasets.loadSubgraphUnion(originalGraphPath,subgraphType,subgraphIDList);
						if(!g){fail();return;}
						else{
							let subfileName=relativePath.substring(i1+1);
							if(subfileName=="summary.json.gz"){
								console.log("sending subgraph union data "+g.dataPath);
								res.header('Content-Type', 'application/json');
								res.header('Access-Control-Allow-Origin','*');
								res.send(JSON.stringify(g));
								return;
							}
							else{
								
								let names=subfileName.split(".");
								if(names.length!=4){
									console.log("unexpected subfile name "+subfileName);
									fail();return;//there are other files like layout
									//throw Error();
								}
								let objName=names[0],propertyName=names[1];
								if(!g.objects[objName]){fail();return;}
								let value=g.objects[objName].properties[propertyName];
								if(!value){fail();return;}
								console.log("sending subgraph union data "+g.dataPath+" "+subfileName);
								res.header('Content-Type', 'application/json');
								res.header('Access-Control-Allow-Origin','*');
								res.send(JSON.stringify(value));
								return;
							}
						}
					}
					let g=Datasets.getBucketedSubgraph(originalGraphPath,subgraphType,subgraphID);
					if(!g){fail();return;}
					else{
						let subfileName=relativePath.substring(i1+1);
						if(subfileName=="summary.json.gz"){
							console.log("sending bucketed data "+relativePath);
							res.header('Content-Type', 'application/json');
							res.header('Access-Control-Allow-Origin','*');
							res.send(JSON.stringify(g));
							return;
						}
						else{
							let names=subfileName.split(".");
							if(names.length!=4){
								console.log("unexpected subfile name "+subfileName);
								fail();return;//there are other files like layout
								//throw Error();
							}
							let objName=names[0],propertyName=names[1];
							if(!g.objects[objName]){fail();return;}
							let value=g.objects[objName].properties[propertyName];
							if(!value){fail();return;}
							console.log("sending bucketed data "+subfileName);
							res.header('Content-Type', 'application/json');
							res.header('Access-Control-Allow-Origin','*');
							res.send(JSON.stringify(value));
							return;
						}
					}
				}
				else{fail();return;}
			}
			if(filename.indexOf(".json")!=-1)res.header('Content-Type', 'application/json');
			if(filename.indexOf(".gz")!=-1)res.header('Content-Encoding', 'gzip');
			res.header('Access-Control-Allow-Origin','*');
			res.sendFile(filename);
		});
		app.get('/datasets', function(req, res) {
			res.header('Content-Type', 'application/json');//res.header('Content-Encoding', 'gzip');
			res.header('Access-Control-Allow-Origin','*');
			res.send(JSON.stringify(Datasets.getDatasetList()));//fs.createReadStream(filename).pipe(res);
		});
		app.get( '/', function( req, res ){ //console.log('request is:'+JSON.stringify(req.body));
			res.sendFile( realPrefixDir+"/"+(serverDef.mainFile||"index.html") );
		});
		app.get( '/js/lib/*' , function( req, res, next ) {//shared JS files across branches
			let filename = req.params[0];
			//res.sendFile( __dirname + "/"+prefix+"/" + file );
			res.sendFile( __dirname + "/lib/" + filename );
		});
		app.get( '/lib/*' , function( req, res, next ) {//shared JS files across branches
			let filename = req.params[0];
			//res.sendFile( __dirname + "/"+prefix+"/" + file );
			res.sendFile( __dirname + "/lib/" + filename );
		});
		app.get('/datasetIDMaps/*/*', function(req, res) {//this takes priority over the next
			let filename;
			console.log(req.params[0]);
			if(Datasets.datasetIDMaps[req.params[0]]){
				let idMap=Datasets.datasetIDMaps[req.params[0]];
				let ids=req.params[1].split(",").map((d)=>idMap[d]);
				res.header('Content-Type', 'application/json');res.send(JSON.stringify(ids));return;
			}
		});
		app.get( '/*' , function( req, res, next ) {
			let filename = req.params[0];
			res.sendFile(realPrefixDir+"/" + filename );
		}); 
		sio.listen(server);
		sio.sockets.on("connection", onSocketConnection);
	}
}




function onSocketConnection(client) {
    console.log("Client has connected: "+client.id);
	
	let mysockets=this;
	this.serverDef.clients[client.id]={id:client.id,client:client};//sio.clients
	client.streams={};//??
	client.warn=function(str){this.emit("warning",str);console.log("warning player "+this.id+ ": "+str);}

	client.on("load dataset", function(data){//choosing a dataset, now used to make teh server stop streaming other datasets
		Datasets.stopAllStreaming(this);
	});
	client.on("start stream",function(data){
		console.log("streaming "+JSON.stringify(data));
		Datasets.startStreaming(this,data);
	});
	client.on("stop stream",function(data){
		console.log("stopping streaming "+JSON.stringify(data));
		Datasets.stopStreaming(this,data);
	});
	client.on("pause stream",function(data){
		console.log("stopping streaming "+JSON.stringify(data));
		Datasets.pauseStreaming(this,data);
	});
	client.on("resume stream",function(data){
		console.log("stopping streaming "+JSON.stringify(data));
		Datasets.resumeStreaming(this,data);
	});
	client.on("disconnect",function onDisconnect(){
		Datasets.stopAllStreaming(this);
		delete mysockets.serverDef.clients[this.id];
	});
	client.on("save",function(data){
		let datasetID=data.datasetID;
		let path=data.path;
		let type=data.type;
		Datasets.saveCustomData((path?path:datasetID),type,data.data);
	});
	client.on("compute",function(data){
		//first try if there's existing result if it's a known graph
		if(data.dataPath){
			let result;
			try{
				result=Datasets.loadCustomData(data.dataPath,data.type);
				this.emit("custom",{type:data.type,success:true,result:result});
				return;
			}
			catch(e){console.log("no saved custom data "+data.type+" found for "+data.dataPath);}
		}
		Promise.resolve(Datasets.doCustomComputation(data)).then((result)=>{
			if(data.dataPath)Datasets.saveCustomData(data.dataPath,data.type,result);
			this.emit("custom",{type:data.type,success:true,result:result});
			console.log("computed custom data "+data.type);
		}).catch((err)=>{
			console.log(err);
			this.emit("custom",{type:data.type,success:false,result:null});
			console.log("failed to computed custom data "+data.type);
		});
	});
	

	client.on("lolcat",function(data){
		let result=null;
		try{
			result=eval(data);
			this.emit("test",result);
		}
		catch(e){
			this.emit("test",e.stack);
		}
		
	});
};

